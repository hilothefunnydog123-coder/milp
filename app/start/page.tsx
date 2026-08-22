"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, ArrowLeft, ArrowRight, Mic, MicOff, Play, Users, Languages } from "lucide-react";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { store } from "@/lib/library";

const CHIPS = [
  "I lost my job", "I'm staying in my car", "I'm couch-surfing", "I'm behind on rent",
  "I'm facing eviction", "I'm fleeing an unsafe home", "I lost my ID", "I'm a veteran", "I have kids with me",
];

export default function Start() {
  const router = useRouter();
  const [situation, setSituation] = useState("");
  const [location, setLocation] = useState("");
  const [locationPicked, setLocationPicked] = useState(false);
  const [household, setHousehold] = useState("");
  const [language, setLanguage] = useState("English");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [advocate, setAdvocate] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const [tick, setTick] = useState(0);
  const [autoRun, setAutoRun] = useState(false);
  const ran = useRef(false);

  function pickLocation(label: string, lat?: number, lng?: number) {
    setLocation(label);
    setLocationPicked(true);
    if (typeof lat === "number" && typeof lng === "number" && isFinite(lat) && isFinite(lng)) {
      store.set("yn_coords", JSON.stringify({ lat, lng }));
    } else {
      store.remove("yn_coords"); // map/weather will geocode the label instead
    }
  }

  function loadSample() {
    setSituation("I lost my job two months ago, I've been sleeping in my car, and I don't have my ID anymore. My daughter is with me.");
    pickLocation("San Jose, California, United States", 37.3382, -121.8863);
    setLanguage("English");
    setAutoRun(true);
  }

  useEffect(() => {
    if (!loading) return;
    setTick(0);
    const t = setInterval(() => setTick((n) => n + 1), 3200);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    if (autoRun && situation.trim() && locationPicked && !ran.current) {
      ran.current = true;
      setAutoRun(false);
      findPath();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, situation, locationPicked]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setAdvocate(sp.get("for") === "advocate");
    if (sp.get("demo") === "1") loadSample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addChip(c: string) {
    setSituation((s) => (s ? `${s}. ${c}` : c));
  }

  function toggleMic() {
    type SR = { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start: () => void; stop: () => void };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) { alert("Voice input isn't supported in this browser — you can type instead."); return; }
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SpeechRec();
    rec.lang = "en-US"; rec.continuous = true; rec.interimResults = false;
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript + " ";
      setSituation((prev) => (prev ? prev + " " : "") + t.trim());
    };
    rec.onend = () => setListening(false);
    rec.start(); recRef.current = rec; setListening(true);
  }

  async function findPath() {
    if (!situation.trim() || !locationPicked) return;
    setLoading(true);
    try {
      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", situation, location, household, language }),
      });
      const data = await res.json();
      if (data.path) {
        store.set("yn_path", JSON.stringify(data.path));
        store.set("yn_lang", language);
        store.set("yn_situation", situation);
        store.set("yn_progress", JSON.stringify({}));
        router.push("/path");
      }
    } finally {
      setLoading(false);
    }
  }

  // ---------- loading ----------
  if (loading) {
    const where = location.split(",")[0] || "you";
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
        <motion.p key={msg} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="h-5 text-muted">{msg}</motion.p>
        <div className="h-2 w-72 max-w-[80vw] overflow-hidden rounded-full bg-white/10">
          <motion.div initial={{ width: "0%" }} animate={{ width: "94%" }} transition={{ duration: 22, ease: "easeOut" }} className="h-full rounded-full trail" />
        </div>
        <p className="max-w-sm text-sm text-muted">
          This usually takes about <span className="text-ink">15–20 seconds</span> — we&apos;re searching live for real, local resources. Hang tight, it&apos;s worth it.
        </p>
      </main>
    );
  }

  const canSubmit = situation.trim().length > 0 && locationPicked;

  // ---------- intake ----------
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-8">
      <Link href="/" className="inline-flex items-center gap-2 self-start text-sm text-muted transition hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="my-auto py-10">
        {/* header */}
        <div className="text-center">
          <div className="mx-auto mb-5 h-2.5 w-2.5 rounded-full bg-gold" style={{ boxShadow: "0 0 16px 5px rgba(232,184,115,0.7)" }} />
          <h1 className="text-4xl leading-tight sm:text-5xl">
            {advocate ? "Tell us about the person you're helping." : "Let's start where you are."}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted">
            {advocate
              ? "Describe their situation in a few words. There are no wrong answers."
              : (
                <>
                  <span className="yn-personal-only">In your own words — type or talk. There are no wrong answers, and your words stay on your device.</span>
                  <span className="yn-library-only">In your own words — type or talk. There are no wrong answers, and nothing you write is saved to this computer.</span>
                </>
              )}
          </p>
          <button onClick={loadSample} className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm text-muted transition hover:border-gold/50 hover:text-ink">
            <Play className="h-3.5 w-3.5 text-gold" /> See a live example
          </button>
        </div>

        {/* form card */}
        <div className="glass mt-8 space-y-6 rounded-3xl p-6 sm:p-8">
          {/* situation */}
          <div>
            <div className="relative rounded-2xl border border-[var(--line)] bg-white/[0.03] p-4 transition focus-within:border-gold/50">
              <textarea
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                rows={5}
                aria-label="Describe your situation in your own words"
                placeholder={advocate ? "e.g. They lost their job, are staying in their car, and lost their ID…" : "e.g. I lost my job a month ago, I've been staying in my car, and I don't have my ID anymore…"}
                className="w-full resize-none bg-transparent text-lg leading-relaxed outline-none placeholder:text-muted/60"
              />
              <button
                onClick={toggleMic}
                aria-label={listening ? "Stop voice input" : "Start voice input"}
                className={`absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full transition ${listening ? "bg-rose-500/30 text-rose-200" : "bg-white/10 text-ink hover:bg-white/20"}`}
              >
                {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            </div>
            {listening && <p className="mt-2 text-sm text-gold">Listening… speak naturally, then tap the mic to stop.</p>}
          </div>

          {/* chips */}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Or tap what fits</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <button key={c} onClick={() => addChip(c)} className="rounded-full border border-[var(--line)] px-3.5 py-1.5 text-sm text-ink transition hover:border-gold/50 hover:bg-gold/5">
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-[var(--line)]" />

          {/* location (specific, required) */}
          <div>
            <label className="flex items-center gap-1.5 text-sm text-muted">Where are you? <span className="text-gold/80">(pick your exact city)</span></label>
            <div className="mt-1.5">
              <LocationAutocomplete value={location} picked={locationPicked} onPick={pickLocation} onType={(t) => { setLocation(t); setLocationPicked(false); }} />
            </div>
          </div>

          {/* household + language */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-1.5 text-sm text-muted"><Users className="h-3.5 w-3.5" /> Who&apos;s with you? <span className="text-muted/60">(optional)</span></label>
              <input value={household} onChange={(e) => setHousehold(e.target.value)} placeholder="just me / 2 kids" className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/5 px-4 py-3 outline-none focus:border-gold/60" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm text-muted"><Languages className="h-3.5 w-3.5" /> Show my plan in</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-white/5 px-4 py-3 outline-none focus:border-gold/60">
                {["English", "Español", "中文 (Chinese)", "Tiếng Việt (Vietnamese)", "Tagalog", "العربية (Arabic)", "Русский (Russian)", "Français", "Português", "한국어 (Korean)"].map((l) => (
                  <option key={l} value={l} className="bg-[#0c1322]">{l}</option>
                ))}
              </select>
            </div>
          </div>

          <motion.button
            onClick={findPath}
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.01 } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
            className="btn-gold inline-flex w-full items-center justify-center gap-2 rounded-full py-4 text-lg disabled:opacity-40"
          >
            Show me my path <ArrowRight className="h-5 w-5" />
          </motion.button>
          {!locationPicked && situation.trim() && (
            <p className="text-center text-xs text-gold/80">Almost there — pick your exact city above so we find the right place.</p>
          )}
          <p className="text-center text-xs text-muted">
            <span className="yn-personal-only">Private by design — your words stay on your device.</span>
            <span className="yn-library-only">Private by design — nothing is saved to this computer, and you can erase everything at any time.</span>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
