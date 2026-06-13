"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  MapPin,
  Building2,
  Banknote,
  Home,
  Utensils,
  Heart,
  FileText,
  Files,
  CreditCard,
  Scale,
  Shield,
  ShieldCheck,
  Check,
  Circle,
  HelpCircle,
  Share2,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { RESOURCES } from "@/lib/resources";
import type { CompassPath } from "@/lib/types";

const RES_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "211": Phone,
  coordinated_entry: MapPin,
  shelter: Building2,
  rental_assistance: Banknote,
  vouchers: Home,
  snap: Utensils,
  medicaid: Heart,
  vital_records: FileText,
  ssa: Files,
  dmv: CreditCard,
  legal_aid: Scale,
  va: Shield,
  dv: ShieldCheck,
  crisis: Phone,
};

const STAGE_LABEL: Record<string, string> = { now: "Now", soon: "Soon", later: "The path home" };

export default function CompassView({
  path,
  readOnly = false,
}: {
  path: CompassPath;
  readOnly?: boolean;
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [docs, setDocs] = useState<Record<string, boolean>>({});
  const [explain, setExplain] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (readOnly) return;
    try {
      setDone(JSON.parse(localStorage.getItem("yn_progress") || "{}"));
      setDocs(JSON.parse(localStorage.getItem("yn_docs") || "{}"));
    } catch {}
  }, [readOnly]);

  function toggleStep(id: string) {
    if (readOnly) return;
    setDone((d) => {
      const next = { ...d, [id]: !d[id] };
      localStorage.setItem("yn_progress", JSON.stringify(next));
      return next;
    });
  }
  function toggleDoc(label: string) {
    if (readOnly) return;
    setDocs((d) => {
      const next = { ...d, [label]: !d[label] };
      localStorage.setItem("yn_docs", JSON.stringify(next));
      return next;
    });
  }

  async function explainStep(id: string, title: string, ctx: string) {
    if (explain[id]) {
      setExplain((e) => ({ ...e, [id]: "" }));
      return;
    }
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
    const encoded = btoa(encodeURIComponent(JSON.stringify(path)));
    const url = `${window.location.origin}/share#${encoded}`;
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
      {/* summary */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="flex items-center gap-2 text-sm text-gold">
          <Sparkles className="h-4 w-4" /> Your path · {path.location}
        </div>
        <p className="mt-3 font-display text-2xl leading-snug">{path.summary}</p>
      </motion.div>

      {/* progress */}
      <div className="glass mt-6 rounded-2xl p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">
            {completed} of {total} steps {completed === total ? "— you made it" : "done"}
          </span>
          <span className="text-muted">{pct}%</span>
        </div>
        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full trail"
          />
        </div>
        {!readOnly && (
          <button onClick={share} className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm text-ink transition hover:border-gold/50">
            {copied ? <Check className="h-4 w-4 text-teal" /> : <Share2 className="h-4 w-4 text-gold" />}
            {copied ? "Link copied — share it with someone you trust" : "Share my path with a helper"}
          </button>
        )}
      </div>

      {/* steps */}
      <div className="mt-8">
        {path.steps.map((step, i) => {
          const Icon = step.resourceKey ? RES_ICON[step.resourceKey] ?? Circle : Circle;
          const isDone = !!done[step.id];
          const isActive = step.id === activeId;
          const res = step.resourceKey ? RESOURCES[step.resourceKey] : null;
          return (
            <div key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < path.steps.length - 1 && (
                <div className="absolute left-[15px] top-9 h-full w-0.5" style={{ background: isDone ? "var(--gold)" : "var(--line)" }} />
              )}
              <button
                onClick={() => toggleStep(step.id)}
                disabled={readOnly}
                aria-label={isDone ? "Mark not done" : "Mark done"}
                className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition"
                style={{
                  borderColor: isDone ? "var(--gold)" : isActive ? "var(--gold)" : "var(--line)",
                  background: isDone ? "var(--gold)" : "var(--bg)",
                  boxShadow: isActive && !isDone ? "0 0 14px rgba(243,184,95,0.6)" : "none",
                }}
              >
                {isDone ? <Check className="h-4 w-4 text-[#1a1205]" /> : <Icon className="h-4 w-4 text-gold" />}
              </button>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.06, 0.5) }}
                className={`flex-1 rounded-2xl p-5 transition ${isActive && !isDone ? "glass glow-gold" : "glass"} ${isDone ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                    {STAGE_LABEL[step.stage]}
                  </span>
                  {isActive && !isDone && <span className="text-xs font-semibold text-gold">← start here</span>}
                </div>
                <h3 className={`mt-2 text-xl ${isDone ? "line-through" : ""}`}>{step.title}</h3>
                <p className="mt-1.5 leading-relaxed text-muted">{step.plain}</p>

                <div className="mt-3 rounded-xl border border-[var(--line)] bg-white/[0.03] p-3">
                  <div className="flex items-start gap-2 text-sm">
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                    <span><span className="font-semibold">Do this: </span>{step.action}</span>
                  </div>
                  {res && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                      <Icon className="h-4 w-4 text-gold" />
                      <span>{res.name}{res.phone ? ` · ${res.phone}` : ""}</span>
                    </div>
                  )}
                </div>

                {step.docs.length > 0 && (
                  <p className="mt-2 text-xs text-muted">You&apos;ll need: {step.docs.join(", ")}</p>
                )}

                {!readOnly && (
                  <button
                    onClick={() => explainStep(step.id, step.title, step.plain)}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-gold transition hover:opacity-80"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {busy === step.id ? "Explaining…" : explain[step.id] ? "Hide" : "Explain this simply"}
                  </button>
                )}
                {explain[step.id] && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 rounded-xl bg-teal/5 p-3 text-sm leading-relaxed text-ink/90">
                    {explain[step.id]}
                  </motion.p>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* documents */}
      {path.documents.length > 0 && (
        <div className="glass mt-6 rounded-2xl p-5">
          <h3 className="text-lg">Documents to gather</h3>
          <p className="text-sm text-muted">These open most doors. Check them off as you find them.</p>
          <div className="mt-3 space-y-2">
            {path.documents.map((d) => (
              <button key={d} onClick={() => toggleDoc(d)} disabled={readOnly} className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5 text-left text-sm transition hover:border-gold/40">
                <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${docs[d] ? "border-gold bg-gold" : "border-[var(--line)]"}`}>
                  {docs[d] && <Check className="h-3.5 w-3.5 text-[#1a1205]" />}
                </span>
                <span className={docs[d] ? "text-muted line-through" : ""}>{d}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* REAL local resources (grounded search) */}
      {path.localResources && path.localResources.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gold" />
            <h3 className="text-lg">Real help near {path.location}</h3>
          </div>
          <p className="mt-1 text-sm text-muted">
            Found with live search and tailored to your situation. Please confirm details when you reach out.
          </p>
          <div className="mt-4 space-y-3">
            {path.localResources.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.06, 0.4) }}
                className="glass rounded-2xl p-4"
              >
                <div className="font-semibold">{r.name}</div>
                <p className="mt-1 text-sm text-muted">{r.helpsWith}</p>
                {r.contact && <p className="mt-1.5 text-sm text-teal">{r.contact}</p>}
              </motion.div>
            ))}
          </div>
          {path.sources && path.sources.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-muted">Sources:</span>
              {path.sources.map((s, i) => (
                <a
                  key={i}
                  href={s.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-gold/90 underline-offset-2 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {s.title || new URL(s.uri).hostname}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* universal resources */}
      {path.resources.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-lg">Help you can reach from anywhere</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {path.resources.map((k) => {
              const r = RESOURCES[k];
              if (!r) return null;
              const Icon = RES_ICON[k] ?? Circle;
              return (
                <div key={k} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-gold" />
                    <span className="font-semibold">{r.name}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted">{r.what}</p>
                  <p className="mt-1.5 text-sm text-teal">{r.how}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-10 text-center text-sm text-muted">
        <Phone className="mr-1 inline h-4 w-4 text-gold" /> In crisis? Call or text{" "}
        <span className="font-semibold text-ink">988</span>. You matter.
      </p>
    </div>
  );
}
