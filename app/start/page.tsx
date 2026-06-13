"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, ArrowLeft, ArrowRight, Mic, MicOff, Loader2 } from "lucide-react";

const CHIPS = [
  "I lost my job",
  "I'm staying in my car",
  "I'm couch-surfing",
  "I'm behind on rent",
  "I'm facing eviction",
  "I'm fleeing an unsafe home",
  "I lost my ID",
  "I'm a veteran",
  "I have kids with me",
];

export default function Start() {
  const router = useRouter();
  const [situation, setSituation] = useState("");
  const [location, setLocation] = useState("");
  const [household, setHousehold] = useState("");
  const [language, setLanguage] = useState("English");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [advocate, setAdvocate] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!loading) return;
    setTick(0);
    const t = setInterval(() => setTick((n) => n + 1), 3200);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    setAdvocate(new URLSearchParams(window.location.search).get("for") === "advocate");
  }, []);

  function addChip(c: string) {
    setSituation((s) => (s ? `${s}. ${c}` : c));
  }

  function toggleMic() {
    type SR = { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start: () => void; stop: () => void };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice input isn't supported in this browser — you can type instead.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + " ";
      setSituation((prev) => (prev ? prev + " " : "") + t.trim());
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }

  async function findPath() {
    if (!situation.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", situation, location, household, language }),
      });
      const data = await res.json();
      if (data.path) {
        localStorage.setItem("yn_path", JSON.stringify(data.path));
        localStorage.setItem("yn_lang", language);
        localStorage.setItem("yn_situation", situation);
        localStorage.setItem("yn_progress", JSON.stringify({}));
        router.push("/path");
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    const where = location.trim() || "you";
    const steps = [
      "Reading what you shared…",
      `Searching for real help near ${where}…`,
      "Finding shelters, rent help, and food…",
      "Checking how to replace lost documents…",
      "Building your step-by-step path…",
    ];
    const msg = steps[Math.min(tick, steps.length - 1)];
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}>
          <Compass className="h-10 w-10 text-gold" />
        </motion.div>
        <p className="font-display text-2xl">Looking up real help near you</p>
        <motion.p key={msg} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="h-5 text-muted">
          {msg}
        </motion.p>
        <div className="h-2 w-72 max-w-[80vw] overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "94%" }}
            transition={{ duration: 22, ease: "easeOut" }}
            className="h-full rounded-full trail"
          />
        </div>
        <p className="max-w-sm text-sm text-muted">
          This usually takes about <span className="text-ink">15–20 seconds</span> — we&apos;re
          searching live for real, local resources, not generic advice. Hang tight, it&apos;s worth it.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mt-8">
        <h1 className="text-4xl leading-tight">
          {advocate ? "Tell us about the person you're helping." : "Let's start where you are."}
        </h1>
        <p className="mt-3 text-muted">
          {advocate
            ? "Describe their situation in a few words. There are no wrong answers."
            : "Tell us what's going on, in your own words. There are no wrong answers — and you can talk instead of type."}
        </p>

        <div className="glass mt-7 rounded-2xl p-5">
          <div className="relative">
            <textarea
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              rows={5}
              placeholder={advocate ? "e.g. They lost their job, are staying in their car, and lost their ID…" : "e.g. I lost my job a month ago, I've been staying in my car, and I don't have my ID anymore…"}
              className="w-full resize-none bg-transparent text-lg leading-relaxed outline-none placeholder:text-muted/70"
            />
            <button
              onClick={toggleMic}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              className={`absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-full transition ${
                listening ? "bg-rose-500/30 text-rose-200" : "bg-white/8 text-ink hover:bg-white/15"
              }`}
            >
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {listening && <p className="mt-2 text-sm text-gold">Listening… speak naturally, then tap the mic to stop.</p>}

        {/* quick chips */}
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wider text-muted">Or tap what fits</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => addChip(c)} className="rounded-full border border-[var(--line)] px-3.5 py-1.5 text-sm text-ink transition hover:border-gold/50 hover:bg-gold/5">
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm text-muted">Where are you? (city or ZIP)</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Milpitas, CA" className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/5 px-4 py-3 outline-none focus:border-gold/60" />
          </div>
          <div>
            <label className="text-sm text-muted">Who&apos;s with you? (optional)</label>
            <input value={household} onChange={(e) => setHousehold(e.target.value)} placeholder="e.g. just me / 2 kids" className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/5 px-4 py-3 outline-none focus:border-gold/60" />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm text-muted">Show my plan in</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/5 px-4 py-3 outline-none focus:border-gold/60">
            {["English", "Español", "中文 (Chinese)", "Tiếng Việt (Vietnamese)", "Tagalog", "العربية (Arabic)", "Русский (Russian)", "Français", "Português", "한국어 (Korean)"].map((l) => (
              <option key={l} value={l} className="bg-[#0a0e17]">{l}</option>
            ))}
          </select>
        </div>

        <button onClick={findPath} disabled={!situation.trim()} className="btn-gold mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full py-4 text-lg disabled:opacity-40">
          Show me my path <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          Private by design — your words stay on your device.
        </p>
      </motion.div>
    </main>
  );
}
