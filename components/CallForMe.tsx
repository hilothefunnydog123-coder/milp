"use client";

/**
 * CallForMe — the consent-first "Have YNorth call for me" feature.
 * With the user's explicit permission, an AI voice agent (Vapi) phones a real
 * help line on their behalf, introduces them, explains their situation, and
 * returns plain-language next steps. Falls back to a deterministic demo
 * simulation if Vapi is unavailable, so it never shows an error on stage.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneCall,
  PhoneOff,
  Bot,
  Loader2,
  ShieldCheck,
  ListChecks,
  Volume2,
  Square,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import type { LocalResource } from "@/lib/types";
import { get, post, signal } from "@/lib/client";
import { describeFailure } from "@/lib/fetch";
import { GET_ENDPOINTS, type CallProvider, type TranscriptTurn } from "@/lib/api";
import { read } from "@/lib/storage";
import { dialable, type CallId } from "@/lib/brand";
import { canSpeak, speak as speakAloud, stopSpeaking } from "@/lib/speech";

type Phase = "idle" | "consent" | "calling" | "done" | "error";

export default function CallForMe({ resources = [] }: { resources?: LocalResource[] }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [label, setLabel] = useState("the help line");
  const [consent, setConsent] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [instructions, setInstructions] = useState("");
  const [provider, setProvider] = useState<CallProvider | "">("");
  const [controlUrl, setControlUrl] = useState("");
  const [canceled, setCanceled] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const clock = useRef<ReturnType<typeof setInterval> | null>(null);

  const callable = resources.filter((r) => dialable(r.contact));

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    if (poll.current) clearInterval(poll.current);
    if (clock.current) clearInterval(clock.current);
    stopSpeaking();
  }, []);

  function situation() {
    return read("situation") || "is facing a housing emergency";
  }

  function openConsent(num = "", lbl = "the help line") {
    setNumber(num);
    setLabel(lbl);
    setPhase("consent");
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  }

  function hangUp() {
    timers.current.forEach(clearTimeout);
    if (poll.current) clearInterval(poll.current);
    stopClock();
    stopSpeaking();
    if (provider === "vapi" && controlUrl) signal("/api/call", { action: "end", controlUrl });
    setCanceled(true);
    setPhase("done");
  }

  async function start() {
    setError(""); setTranscript([]); setInstructions(""); setSeconds(0); setCanceled(false);
    setPhase("calling");
    clock.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    const started = await post("/api/call", {
      action: "start",
      name,
      number,
      situation: situation(),
      language: read("language"),
      objective: "",
      firstMessage: "",
    });
    if (!started.ok) {
      setError(describeFailure(started.error));
      setPhase("error");
      stopClock();
      return;
    }
    setProvider(started.value.provider);
    setControlUrl(started.value.controlUrl ?? "");
    if (started.value.provider === "mock") simulate();
    else pollVapi(started.value.callId);
  }

  function stopClock() { if (clock.current) clearInterval(clock.current); }

  function finish(instr: string) { setInstructions(instr); setPhase("done"); stopClock(); }

  function simulate() {
    const N = name || "them";
    const S = situation();
    const who = label === "the help line" ? "the help line" : label;
    const script: TranscriptTurn[] = [
      { speaker: "assistant", text: `Hi, my name is YNorth and I'm calling on behalf of ${N}. They're facing a housing emergency and asked me to find out how they can get help — do you have a moment?` },
      { speaker: "caller", text: "Of course, I'd be glad to help. Can you tell me a bit about what's going on?" },
      { speaker: "assistant", text: `Thank you. ${N} ${S.slice(0, 160)}. What are the immediate next steps they should take?` },
      { speaker: "caller", text: "Okay. First, let's get them connected to Coordinated Entry — that's the front door for housing and shelter here. I can start a phone assessment, or they can visit our access center." },
      { speaker: "assistant", text: "That's really helpful. What should they bring, and where do they go?" },
      { speaker: "caller", text: "A photo ID and proof of income if they have it — but it's okay if they don't. We're open weekdays 9 to 5, and if they need a bed tonight, call back and we'll find an open shelter." },
      { speaker: "assistant", text: `Perfect — I'll pass all of that along to ${N}. Thank you so much for your time and kindness. Have a wonderful day.` },
    ];
    void who;
    script.forEach((t, i) => timers.current.push(setTimeout(() => setTranscript((p) => [...p, t]), 1400 + i * 2400)));
    timers.current.push(setTimeout(() => finish(
      `Here's what to do next, ${N}:\n\n1. Get connected to Coordinated Entry — call back to start a phone assessment, or visit the access center (open weekdays, 9–5).\n2. Bring a photo ID and proof of income if you have them — it's okay if you don't.\n3. If you need a place to sleep tonight, call the line back and ask for an open shelter bed.\n\nYou did the hard part by reaching out. You've got this.`
    ), 1400 + script.length * 2400 + 900));
  }

  function pollVapi(callId: CallId) {
    const startedAt = Date.now();
    poll.current = setInterval(async () => {
      const status = await get(GET_ENDPOINTS.callStatus(callId));
      if (!status.ok) return; // a dropped poll is fine; the next one will land
      const live = status.value.transcript;
      if (live.length) setTranscript(live);
      if (status.value.status === "completed" || Date.now() - startedAt > 180_000) {
        if (poll.current) clearInterval(poll.current);
        const written = await post("/api/call", {
          action: "instructions",
          name,
          transcript: live.length ? live : transcript,
        });
        finish(written.ok ? written.value.instructions : "");
      }
    }, 2800);
  }

  function speak() {
    if (!canSpeak()) return;
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    setSpeaking(speakAloud(instructions, { onEnd: () => setSpeaking(false) }));
  }

  const status = canceled ? "Call ended" : phase === "calling" ? (transcript.length === 0 ? "Connecting…" : "On the call") : "Call complete";

  // ---------- HERO PROMPT ----------
  if (phase === "idle") {
    return (
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glow-gold mt-6 overflow-hidden rounded-3xl p-7">
        <div className="flex items-center gap-2 text-sm font-semibold text-gold"><Sparkles className="h-4 w-4" /> YNorth can do this part for you</div>
        <h2 className="mt-3 font-display text-3xl leading-tight">The hardest part is picking up the phone.</h2>
        <p className="mt-3 text-muted">
          So let YNorth make the call. With your permission, our AI rings a real help line,
          introduces you, explains your situation <span className="text-ink">in your language</span>,
          and comes back with exactly what to do — no minutes, no hold music, no fear.
        </p>
        {callable.length > 0 && (
          <>
            <p className="mt-5 text-xs uppercase tracking-wider text-muted">Call one of these for me</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {callable.slice(0, 4).map((r, i) => (
                <button key={i} onClick={() => openConsent(dialable(r.contact), r.name)} className="rounded-full border border-gold/30 bg-gold/5 px-4 py-2 text-sm text-ink transition hover:border-gold/60">
                  <PhoneCall className="mr-1.5 inline h-3.5 w-3.5 text-gold" />{r.name}
                </button>
              ))}
            </div>
          </>
        )}
        <button onClick={() => openConsent()} className="btn-gold mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3">
          <PhoneCall className="h-4 w-4" /> Have YNorth call for me
        </button>
      </motion.div>
    );
  }

  // ---------- CONSENT ----------
  if (phase === "consent") {
    return (
      <div className="glass mt-6 rounded-3xl p-7">
        <div className="flex items-center justify-between">
          <button onClick={() => setPhase("idle")} className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"><ArrowLeft className="h-4 w-4" /> Back</button>
          <div className="flex items-center gap-2 text-sm font-semibold text-teal"><ShieldCheck className="h-4 w-4" /> Your call, your consent</div>
        </div>
        <div className="mt-5 space-y-3">
          <div>
            <label className="text-sm text-muted">Your first name <span className="text-muted/60">(so we can introduce you)</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria" className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white/5 px-4 py-3 text-lg outline-none focus:border-gold/60" />
          </div>
          <div>
            <label className="text-sm text-muted">Number to call {label !== "the help line" && <span className="text-gold">· {label}</span>}</label>
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="A help line, a resource above, or your own phone to test" className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white/5 px-4 py-3 text-lg outline-none focus:border-gold/60" inputMode="tel" />
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] p-3.5 text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--gold)]" />
            <span className="text-muted">I agree to let YNorth&apos;s AI assistant call this number on my behalf and explain my situation to get help. I understand I can stop anytime.</span>
          </label>
        </div>
        <button onClick={start} disabled={!name.trim() || !number.trim() || !consent} className="btn-gold mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-lg disabled:opacity-40">
          <PhoneCall className="h-5 w-5" /> Place the call
        </button>
      </div>
    );
  }

  // ---------- CALLING / DONE ----------
  return (
    <div className="glass mt-6 rounded-3xl p-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            {phase === "calling" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-70" />}
            <span className={`relative inline-flex h-3 w-3 rounded-full ${phase === "calling" ? "bg-gold" : "bg-teal"}`} />
          </span>
          <span className="font-semibold">{status}</span>
          {provider === "mock" && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-muted">demo</span>}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="flex items-center gap-1.5"><Loader2 className={`h-4 w-4 ${phase === "calling" ? "animate-spin" : "hidden"}`} /><span className="font-mono tabular-nums">{fmt(seconds)}</span></span>
          {phase === "calling" && (
            <button onClick={hangUp} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--rose)]/15 px-3 py-1.5 font-semibold text-[var(--rose)] transition hover:bg-[var(--rose)]/25">
              <PhoneOff className="h-3.5 w-3.5" /> Hang up
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">Calling {label}{number ? ` · ${number}` : ""}</p>
      {canceled && <p className="mt-3 text-sm text-muted">You ended the call. You can start again whenever you&apos;re ready — no pressure.</p>}

      {error && <p className="mt-3 text-sm text-[var(--rose)]">{error}</p>}

      <div className="mt-5 space-y-3">
        <AnimatePresence initial={false}>
          {transcript.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 ${t.speaker === "assistant" ? "" : "flex-row-reverse"}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${t.speaker === "assistant" ? "bg-gold/20 text-gold" : "bg-white/10 text-ink"}`}>
                {t.speaker === "assistant" ? <Bot className="h-4 w-4" /> : <PhoneCall className="h-4 w-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${t.speaker === "assistant" ? "bg-gold/10" : "glass"}`}>{t.text}</div>
            </motion.div>
          ))}
        </AnimatePresence>
        {phase === "calling" && transcript.length === 0 && <p className="text-sm text-muted">Dialing and connecting you…</p>}
      </div>

      {instructions && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glow-gold mt-6 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-gold"><ListChecks className="h-5 w-5" /> What to do next</div>
            <button onClick={speak} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-ink transition hover:border-gold/50">
              {speaking ? <Square className="h-3.5 w-3.5 text-teal" /> : <Volume2 className="h-3.5 w-3.5 text-gold" />}{speaking ? "Stop" : "Listen"}
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{instructions}</p>
          <button onClick={() => { setPhase("idle"); setConsent(false); }} className="mt-4 text-sm text-muted underline-offset-2 hover:text-ink hover:underline">Make another call</button>
        </motion.div>
      )}
      {canceled && (
        <button onClick={() => { setPhase("idle"); setConsent(false); setTranscript([]); }} className="btn-gold mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm">
          <PhoneCall className="h-4 w-4" /> Make another call
        </button>
      )}
    </div>
  );
}
