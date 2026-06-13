"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  MapPin,
  Check,
  Circle,
  HelpCircle,
  Share2,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Brain,
  ThumbsUp,
  LifeBuoy,
  Volume2,
  Square,
  MessageSquareQuote,
} from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";
import CallForMe from "./CallForMe";
import Guardian from "./Guardian";
import type { CompassPath } from "@/lib/types";

const STAGE_LABEL: Record<string, string> = { now: "Now", soon: "Soon", later: "The path home" };

export default function CompassView({ path, readOnly = false }: { path: CompassPath; readOnly?: boolean }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [docs, setDocs] = useState<Record<string, boolean>>({});
  const [explain, setExplain] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [helped, setHelped] = useState<Record<string, boolean>>({});
  const [runs, setRuns] = useState(path.community?.runs ?? 0);
  const [copied, setCopied] = useState(false);
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [scriptBusy, setScriptBusy] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  async function getScript(id: string, title: string, actionText: string) {
    if (scripts[id]) return setScripts((s) => ({ ...s, [id]: "" }));
    setScriptBusy(id);
    try {
      const lang = typeof window !== "undefined" ? localStorage.getItem("yn_lang") || "English" : "English";
      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "script", title, stepAction: actionText, language: lang }),
      });
      const data = await res.json();
      setScripts((s) => ({ ...s, [id]: data.script || "" }));
    } finally {
      setScriptBusy(null);
    }
  }

  function speak() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text =
      path.summary +
      ". Your steps: " +
      path.steps.map((s, i) => `Step ${i + 1}. ${s.title}. ${s.plain} ${s.action}`).join(" ");
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }

  function persist(key: string, val: Record<string, boolean>) {
    if (!readOnly) localStorage.setItem(key, JSON.stringify(val));
  }
  function toggleStep(id: string) {
    if (readOnly) return;
    setDone((d) => { const n = { ...d, [id]: !d[id] }; persist("yn_progress", n); return n; });
  }
  function toggleDoc(label: string) {
    if (readOnly) return;
    setDocs((d) => { const n = { ...d, [label]: !d[label] }; persist("yn_docs", n); return n; });
  }

  async function markHelped(stepId: string, category?: string) {
    if (readOnly || helped[stepId]) return;
    setHelped((h) => ({ ...h, [stepId]: true }));
    setRuns((r) => r + 1);
    if (!category) return;
    try {
      await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: path.tags, category, helped: true }),
      });
    } catch {}
  }

  async function explainStep(id: string, title: string, ctx: string) {
    if (explain[id]) return setExplain((e) => ({ ...e, [id]: "" }));
    setBusy(id);
    try {
      const res = await fetch("/api/compass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "explain", term: title, context: ctx }),
      });
      const data = await res.json();
      setExplain((e) => ({ ...e, [id]: data.explanation || "" }));
    } finally {
      setBusy(null);
    }
  }

  function share() {
    const url = `${window.location.origin}/share#${btoa(encodeURIComponent(JSON.stringify(path)))}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const completed = path.steps.filter((s) => done[s.id]).length;
  const total = path.steps.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const activeId = path.steps.find((s) => !done[s.id])?.id;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* crisis disclaimer — the only place 211/988 live now */}
      <div className="glass flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-4 py-2.5 text-sm">
        <span className="flex items-center gap-1.5 text-muted"><LifeBuoy className="h-4 w-4 text-gold" /> Need help right now?</span>
        <span>Crisis: <a href="tel:988" className="font-semibold text-ink underline-offset-2 hover:underline">988</a></span>
        <span>Local help 24/7: <a href="tel:211" className="font-semibold text-ink underline-offset-2 hover:underline">211</a></span>
      </div>

      {/* summary */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mt-6">
        <div className="flex items-center gap-2 text-sm text-gold"><Sparkles className="h-4 w-4" /> Your path · {path.location}</div>
        <p className="mt-3 font-display text-2xl leading-snug">{path.summary}</p>
      </motion.div>

      {/* THE hero action — let YNorth make the call for you */}
      {!readOnly && <CallForMe resources={path.localResources} />}

      {/* learning model — community wisdom */}
      {(path.community?.top?.length ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="glow-gold mt-6 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-gold">
            <Brain className="h-4 w-4" /> YNorth has learned from{" "}
            <span className="text-ink"><AnimatedNumber value={runs} /></span> journeys
          </div>
          <p className="mt-2 text-sm text-muted">
            People in situations like yours most often found{" "}
            <span className="text-ink">{path.community.top.slice(0, 3).join(", ")}</span> made the
            biggest difference — so we put them first. Your feedback teaches it for the next person.
          </p>
        </motion.div>
      )}

      {/* progress + share */}
      <div className="glass mt-6 rounded-2xl p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{completed} of {total} steps {completed === total ? "— you made it" : "done"}</span>
          <span className="text-muted">{pct}%</span>
        </div>
        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/10">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full trail" />
        </div>
        {!readOnly && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={share} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm text-ink transition hover:border-gold/50">
              {copied ? <Check className="h-4 w-4 text-teal" /> : <Share2 className="h-4 w-4 text-gold" />}
              {copied ? "Link copied" : "Share with a helper"}
            </button>
            <button onClick={speak} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm text-ink transition hover:border-gold/50">
              {speaking ? <Square className="h-4 w-4 text-teal" /> : <Volume2 className="h-4 w-4 text-gold" />}
              {speaking ? "Stop" : "Listen to my plan"}
            </button>
          </div>
        )}
      </div>

      {/* steps — the actual advice */}
      <div className="mt-8">
        {path.steps.map((step, i) => {
          const isDone = !!done[step.id];
          const isActive = step.id === activeId;
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {i < path.steps.length - 1 && (
                <motion.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  style={{ originY: 0, background: isDone ? "var(--gold)" : "var(--line)" }}
                  className="absolute left-[15px] top-9 h-full w-0.5"
                />
              )}
              <button
                onClick={() => toggleStep(step.id)}
                disabled={readOnly}
                aria-label={isDone ? "Mark not done" : "Mark done"}
                className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition"
                style={{
                  borderColor: isDone || isActive ? "var(--gold)" : "var(--line)",
                  background: isDone ? "var(--gold)" : "var(--bg)",
                  boxShadow: isActive && !isDone ? "0 0 14px rgba(232,184,115,0.6)" : "none",
                }}
              >
                {isDone ? <Check className="h-4 w-4 text-[#1c1306]" /> : <span className="text-sm font-semibold text-gold">{i + 1}</span>}
              </button>

              <div className={`flex-1 rounded-2xl p-5 transition ${isActive && !isDone ? "glow-gold" : "glass"} ${isDone ? "opacity-55" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">{STAGE_LABEL[step.stage]}</span>
                  {isActive && !isDone && <span className="text-xs font-semibold text-gold">← start here</span>}
                </div>
                <h3 className={`mt-2 text-xl ${isDone ? "line-through" : ""}`}>{step.title}</h3>
                <p className="mt-1.5 leading-relaxed text-muted">{step.plain}</p>

                <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--line)] bg-white/[0.03] p-3 text-sm">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  <span><span className="font-semibold">Do this: </span>{step.action}</span>
                </div>

                {step.docs.length > 0 && <p className="mt-2 text-xs text-muted">You&apos;ll need: {step.docs.join(", ")}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {!readOnly && (
                    <button onClick={() => explainStep(step.id, step.title, step.plain)} className="inline-flex items-center gap-1.5 text-sm text-gold transition hover:opacity-80">
                      <HelpCircle className="h-4 w-4" />
                      {busy === step.id ? "Explaining…" : explain[step.id] ? "Hide" : "Explain simply"}
                    </button>
                  )}
                  {!readOnly && (
                    <button onClick={() => getScript(step.id, step.title, step.action)} className="inline-flex items-center gap-1.5 text-sm text-gold transition hover:opacity-80">
                      <MessageSquareQuote className="h-4 w-4" />
                      {scriptBusy === step.id ? "Writing…" : scripts[step.id] ? "Hide script" : "What do I say?"}
                    </button>
                  )}
                  {!readOnly && (
                    <button
                      onClick={() => markHelped(step.id, step.category)}
                      className={`inline-flex items-center gap-1.5 text-sm transition ${helped[step.id] ? "text-teal" : "text-muted hover:text-ink"}`}
                    >
                      <ThumbsUp className="h-4 w-4" /> {helped[step.id] ? "Thanks — it learned from this" : "This helped"}
                    </button>
                  )}
                </div>
                {explain[step.id] && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 rounded-xl bg-teal/5 p-3 text-sm leading-relaxed text-ink/90">
                    {explain[step.id]}
                  </motion.p>
                )}
                {scripts[step.id] && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 rounded-xl border border-gold/20 bg-gold/5 p-3 text-sm leading-relaxed">
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gold">
                      <MessageSquareQuote className="h-3.5 w-3.5" /> Read this when you call — you&apos;ve got this
                    </div>
                    <p className="whitespace-pre-wrap text-ink/90">{scripts[step.id]}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* autonomous agent: keeps watching, books, guides transport */}
      {!readOnly && <Guardian resources={path.localResources} location={path.location} />}

      {/* documents */}
      {path.documents.length > 0 && (
        <div className="glass mt-6 rounded-2xl p-5">
          <h3 className="text-lg">Documents to gather</h3>
          <p className="text-sm text-muted">These open most doors. Check them off as you find them.</p>
          <div className="mt-3 space-y-2">
            {path.documents.map((d) => (
              <button key={d} onClick={() => toggleDoc(d)} disabled={readOnly} className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5 text-left text-sm transition hover:border-gold/40">
                <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${docs[d] ? "border-gold bg-gold" : "border-[var(--line)]"}`}>
                  {docs[d] && <Check className="h-3.5 w-3.5 text-[#1c1306]" />}
                </span>
                <span className={docs[d] ? "text-muted line-through" : ""}>{d}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* real local resources */}
      {path.localResources?.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-gold" /><h3 className="text-lg">Real help near {path.location}</h3></div>
          <p className="mt-1 text-sm text-muted">Found with live search for your situation. Please confirm details when you reach out.</p>
          <div className="mt-4 space-y-3">
            {path.localResources.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i * 0.05, 0.3) }} className="glass rounded-2xl p-4">
                <div className="font-semibold">{r.name}</div>
                <p className="mt-1 text-sm text-muted">{r.helpsWith}</p>
                {r.contact && <p className="mt-1.5 text-sm text-teal">{r.contact}</p>}
              </motion.div>
            ))}
          </div>
          {path.sources?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-muted">Sources:</span>
              {path.sources.map((s, i) => (
                <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gold/90 underline-offset-2 hover:underline">
                  <ExternalLink className="h-3 w-3" />{s.title || new URL(s.uri).hostname}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* transparency: what AI is doing the work */}
      <div className="mt-10 rounded-2xl border border-[var(--line)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted"><Sparkles className="h-4 w-4 text-gold" /> How YNorth&apos;s AI works</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            { I: Sparkles, t: "Gemini 2.5 Flash", d: "Plans your path, writes your call scripts, translates, and explains everything in plain language." },
            { I: MapPin, t: "Google Search grounding", d: "Finds real, local, cited resources live — it can never invent a fake shelter or number." },
            { I: Phone, t: "Vapi voice agent", d: "Places real two-way phone calls on your behalf, in your language, and books beds." },
            { I: Brain, t: "YNorth Brain", d: "A self-improving model that learns from every journey what truly helps, for the next person." },
          ].map((x) => (
            <div key={x.t} className="flex gap-3">
              <x.I className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div><div className="text-sm font-semibold">{x.t}</div><div className="text-xs leading-relaxed text-muted">{x.d}</div></div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        <Phone className="mr-1 inline h-4 w-4 text-gold" /> You are not alone. Crisis support is always one call or text away at{" "}
        <span className="font-semibold text-ink">988</span>.
      </p>
    </div>
  );
}
