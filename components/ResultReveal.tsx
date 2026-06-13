"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";
import Certificate from "./Certificate";
import type { AssessResult, Credential } from "@/lib/types";

const DIMS: { key: keyof AssessResult["dimensions"]; label: string }[] = [
  { key: "detection", label: "Detection" },
  { key: "direction", label: "Direction" },
  { key: "efficiency", label: "Efficiency" },
];

export default function ResultReveal({
  result,
  fieldId,
  fieldName,
  modelId,
  org = null,
}: {
  result: AssessResult;
  fieldId: string;
  fieldName: string;
  modelId?: string;
  org?: string | null;
}) {
  const [name, setName] = useState("");
  const [cred, setCred] = useState<Credential | null>(null);
  const [minting, setMinting] = useState(false);

  async function mint() {
    if (!name.trim()) return;
    setMinting(true);
    try {
      const res = await fetch("/api/credential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId,
          name,
          overall: result.overall,
          grade: result.grade,
          dimensions: result.dimensions,
          verdict: result.verdict,
          modelId,
          org,
        }),
      });
      const data = await res.json();
      if (data.credential) setCred(data.credential);
    } finally {
      setMinting(false);
    }
  }

  if (cred) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 text-center text-sm uppercase tracking-[0.3em] text-[var(--gold)]"
        >
          🎓 Degree minted
        </motion.p>
        <Certificate cred={cred} />
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/employers"
            className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3"
          >
            <ShieldCheck className="h-4 w-4" /> See it on the employer board
          </Link>
          <Link
            href="/exam"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-6 py-3 text-ink transition hover:bg-white/5 glass"
          >
            <RotateCcw className="h-4 w-4" /> Try another field
          </Link>
        </div>
      </div>
    );
  }

  const passed = result.passed;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <div
          className={`mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
            result.caughtFlaw
              ? "bg-[var(--green)]/10 text-[var(--green)]"
              : "bg-[var(--red)]/10 text-[var(--red)]"
          }`}
        >
          {result.caughtFlaw ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> You caught the hidden flaw
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" /> You missed the hidden flaw
            </>
          )}
        </div>
        <h1 className="text-2xl font-bold text-muted">{fieldName} Assessment</h1>
      </motion.div>

      {/* big score */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 text-center"
      >
        <div className="text-8xl font-extrabold gradient-text">
          <AnimatedNumber value={result.overall} delay={0.3} />
        </div>
        <div className="mt-2 text-lg font-semibold">
          Grade <span className="text-[var(--gold)]">{result.grade}</span> ·{" "}
          {result.verdict}
        </div>
      </motion.div>

      {/* dimensions */}
      <div className="mt-10 space-y-4">
        {DIMS.map((d, i) => (
          <motion.div
            key={d.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.12 }}
          >
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-semibold">{d.label}</span>
              <span className="text-muted">{result.dimensions[d.key]}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${result.dimensions[d.key]}%` }}
                transition={{ delay: 0.6 + i * 0.12, duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* analysis */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="glass mt-10 rounded-2xl p-6"
      >
        <p className="text-sm leading-relaxed text-ink">{result.analysis}</p>
        {result.steps.length > 0 && (
          <div className="mt-5 space-y-2.5 border-t border-[var(--line)] pt-5">
            {result.steps.map((s, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-xs text-accent">{i + 1}</span>
                <div>
                  <span className="font-semibold text-ink">{s.move}</span>
                  <span className="text-muted"> — {s.take}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex items-start gap-2 border-t border-[var(--line)] pt-5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-sm">
            <span className="font-semibold">Hiring call: </span>
            <span className="text-muted">{result.hire}</span>
          </p>
        </div>
      </motion.div>

      {/* mint */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-10"
      >
        {passed ? (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="font-semibold">You passed. Mint your verifiable degree.</p>
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full max-w-xs rounded-full border border-[var(--line)] bg-black/30 px-5 py-3 text-sm outline-none focus:border-accent sm:w-auto"
                onKeyDown={(e) => e.key === "Enter" && mint()}
              />
              <button
                onClick={mint}
                disabled={!name.trim() || minting}
                className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 disabled:opacity-40"
              >
                {minting ? "Minting…" : "Mint my degree"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-muted">
              Score 60+ to earn the credential. The skill is verification — try again.
            </p>
            <Link
              href="/exam"
              className="btn-primary mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3"
            >
              <RotateCcw className="h-4 w-4" /> Retake
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
