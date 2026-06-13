"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneCall, Bot, Loader2, ShieldCheck, ListChecks, X } from "lucide-react";

interface Turn { speaker: string; text: string }
type Phase = "idle" | "consent" | "calling" | "done" | "error";

export default function CallForMe() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [instructions, setInstructions] = useState("");
  const [provider, setProvider] = useState("");
  const [error, setError] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    if (poll.current) clearInterval(poll.current);
  }, []);

  function situation() {
    return typeof window !== "undefined" ? localStorage.getItem("yn_situation") || "is facing a housing emergency" : "";
  }

  async function start() {
    setError("");
    setTranscript([]);
    setInstructions("");
    setPhase("calling");
    const lang = localStorage.getItem("yn_lang") || "English";
    try {
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, number, situation: situation(), language: lang }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setPhase("error"); return; }
      setProvider(data.provider);
      if (data.provider === "mock") simulate();
      else pollVapi(data.callId);
    } catch {
      setError("Couldn't start the call. Try again.");
      setPhase("error");
    }
  }

  function simulate() {
    const N = name || "them";
    const S = situation();
    const script: Turn[] = [
      { speaker: "assistant", text: `Hi, my name is YNorth and I'm calling on behalf of ${N}. They're facing a housing emergency and asked me to find out how they can get help — do you have a moment?` },
      { speaker: "caller", text: "Of course, I'd be glad to help. Can you tell me a bit about what's going on?" },
      { speaker: "assistant", text: `Thank you. ${N} ${S.slice(0, 160)}. What are the immediate next steps they should take?` },
      { speaker: "caller", text: "Okay. First, let's get them connected to Coordinated Entry — that's the front door for housing and shelter here. I can start a phone assessment, or they can visit our access center." },
      { speaker: "assistant", text: "That's really helpful. What should they bring, and where do they go?" },
      { speaker: "caller", text: "A photo ID and proof of income if they have it — but it's okay if they don't, we can still help. The access center is open weekdays, 9 to 5. And if they need a bed tonight, call back and we'll find an open shelter." },
      { speaker: "assistant", text: `Perfect — I'll pass all of that along to ${N}. Thank you so much for your time and kindness. Have a wonderful day.` },
    ];
    script.forEach((t, i) => {
      timers.current.push(setTimeout(() => setTranscript((p) => [...p, t]), 1200 + i * 2300));
    });
    timers.current.push(
      setTimeout(() => {
        setInstructions(
          `Here's what to do next, ${N}:\n\n1. Get connected to Coordinated Entry — call back to start a phone assessment, or visit the access center (open weekdays, 9–5).\n2. Bring a photo ID and proof of income if you have them — it's okay if you don't.\n3. If you need a place to sleep tonight, call the line back and ask for an open shelter bed.\n\nYou did the hard part by reaching out. You've got this.`
        );
        setPhase("done");
      }, 1200 + script.length * 2300 + 800)
    );
  }

  function pollVapi(callId: string) {
    const started = Date.now();
    poll.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/call/${callId}`);
        const d = await r.json();
        if (Array.isArray(d.transcript) && d.transcript.length) setTranscript(d.transcript);
        if (d.status === "completed" || Date.now() - started > 180000) {
          if (poll.current) clearInterval(poll.current);
          const ir = await fetch("/api/call", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "instructions", name, transcript: d.transcript || transcript }),
          });
          setInstructions((await ir.json()).instructions || "");
          setPhase("done");
        }
      } catch { /* keep polling */ }
    }, 2800);
  }

  // ---- collapsed prompt ----
  if (phase === "idle") {
    return (
      <div className="glow-gold mt-8 rounded-2xl p-6">
        <div className="flex items-center gap-2 font-semibold"><PhoneCall className="h-5 w-5 text-gold" /> Don&apos;t want to make the call alone?</div>
        <p className="mt-2 text-sm text-muted">
          With your permission, YNorth can call a help line <span className="text-ink">for you</span>,
          explain your situation in your words, and come back with exactly what to do next.
        </p>
        <button onClick={() => setPhase("consent")} className="btn-gold mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm">
          <PhoneCall className="h-4 w-4" /> Have YNorth call for me
        </button>
      </div>
    );
  }

  // ---- consent form ----
  if (phase === "consent") {
    return (
      <div className="glass mt-8 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-teal" /> Your call, your consent</div>
          <button onClick={() => setPhase("idle")} aria-label="Close"><X className="h-5 w-5 text-muted" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-muted">Your first name (so we can introduce you)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria" className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white/5 px-4 py-3 outline-none focus:border-gold/60" />
          </div>
          <div>
            <label className="text-sm text-muted">Number to call</label>
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="A help line, a resource from your plan, or your own phone to test" className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white/5 px-4 py-3 outline-none focus:border-gold/60" inputMode="tel" />
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] p-3 text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-[var(--gold)]" />
            <span className="text-muted">I agree to let YNorth&apos;s AI assistant call this number on my behalf and explain my situation to get help. I can stop anytime.</span>
          </label>
        </div>
        <button onClick={start} disabled={!name.trim() || !number.trim() || !consent} className="btn-gold mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3 disabled:opacity-40">
          <PhoneCall className="h-4 w-4" /> Place the call
        </button>
      </div>
    );
  }

  // ---- calling / done ----
  return (
    <div className="glass mt-8 rounded-2xl p-6">
      <div className="flex items-center gap-2 font-semibold">
        {phase === "calling" ? <Loader2 className="h-5 w-5 animate-spin text-gold" /> : <PhoneCall className="h-5 w-5 text-teal" />}
        {phase === "calling" ? "YNorth is on the call…" : "Call complete"}
        {provider === "mock" && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-muted">demo</span>}
      </div>

      {error && <p className="mt-3 text-sm text-[var(--rose)]">{error}</p>}

      <div className="mt-4 space-y-3">
        <AnimatePresence initial={false}>
          {transcript.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 ${t.speaker === "assistant" ? "" : "flex-row-reverse"}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${t.speaker === "assistant" ? "bg-gold/20 text-gold" : "bg-white/10 text-ink"}`}>
                {t.speaker === "assistant" ? <Bot className="h-4 w-4" /> : <PhoneCall className="h-4 w-4" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${t.speaker === "assistant" ? "bg-gold/10" : "glass"}`}>{t.text}</div>
            </motion.div>
          ))}
        </AnimatePresence>
        {phase === "calling" && transcript.length === 0 && <p className="text-sm text-muted">Connecting…</p>}
      </div>

      {instructions && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glow-gold mt-5 rounded-2xl p-5">
          <div className="flex items-center gap-2 font-semibold text-gold"><ListChecks className="h-5 w-5" /> What to do next</div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{instructions}</p>
        </motion.div>
      )}
    </div>
  );
}
