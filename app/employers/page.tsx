"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Sparkles,
  Plus,
  Copy,
  Check,
  Link2,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { FIELDS } from "@/lib/fields";
import { MODELS } from "@/lib/models";
import type { Credential, CustomTest } from "@/lib/types";

const GRADE_COLOR: Record<string, string> = {
  "A+": "text-[var(--gold)]",
  A: "text-[var(--green)]",
  B: "text-accent",
  C: "text-muted",
  D: "text-[var(--red)]",
  F: "text-[var(--red)]",
};

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs text-muted transition hover:text-ink"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[var(--green)]" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export default function Employers() {
  const [org, setOrg] = useState<string | null>(null);
  const [orgInput, setOrgInput] = useState("");
  const [creds, setCreds] = useState<Credential[]>([]);
  const [tests, setTests] = useState<CustomTest[]>([]);
  const [origin, setOrigin] = useState("");

  // create-test form
  const [fieldId, setFieldId] = useState(FIELDS[0].id);
  const [lockedModel, setLockedModel] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    const saved = localStorage.getItem("jm_org");
    if (saved) setOrg(saved);
  }, []);

  const refresh = useCallback((o: string) => {
    fetch("/api/credential").then((r) => r.json()).then((d) => setCreds(d.credentials || []));
    fetch(`/api/test?org=${encodeURIComponent(o)}`).then((r) => r.json()).then((d) => setTests(d.tests || []));
  }, []);

  useEffect(() => {
    if (org) refresh(org);
  }, [org, refresh]);

  function signIn() {
    const o = orgInput.trim() || "Acme Inc.";
    localStorage.setItem("jm_org", o);
    setOrg(o);
  }
  function signOut() {
    localStorage.removeItem("jm_org");
    setOrg(null);
  }

  async function createTest() {
    if (!org) return;
    setCreating(true);
    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldId, lockedModel: lockedModel || null, title, org }),
      });
      const data = await res.json();
      if (data.test) {
        setTests((t) => [data.test, ...t]);
        setTitle("");
      }
    } finally {
      setCreating(false);
    }
  }

  // ---------- SIGN IN ----------
  if (!org) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6">
        <Link href="/" className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass w-full max-w-md rounded-3xl p-8 text-center"
        >
          <ShieldCheck className="mx-auto h-10 w-10 text-accent" />
          <h1 className="mt-4 text-2xl font-extrabold">Hiring console</h1>
          <p className="mt-2 text-sm text-muted">
            Issue assessments, share links with candidates, and rank talent by judgment.
          </p>
          <input
            value={orgInput}
            onChange={(e) => setOrgInput(e.target.value)}
            placeholder="Your company name"
            className="mt-6 w-full rounded-full border border-[var(--line)] bg-black/30 px-5 py-3 text-sm outline-none focus:border-accent"
            onKeyDown={(e) => e.key === "Enter" && signIn()}
          />
          <button onClick={signIn} className="btn-primary mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3">
            Continue with Google
          </button>
          <p className="mt-3 text-[11px] text-muted">
            OAuth is stubbed for the demo — wire Supabase Auth to go live.
          </p>
        </motion.div>
      </main>
    );
  }

  // ---------- CONSOLE ----------
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <Sparkles className="h-5 w-5 text-accent" /> Judge<span className="gradient-text">mynt</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted">{org}</span>
          <button onClick={signOut} className="inline-flex items-center gap-1.5 text-muted transition hover:text-ink">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </nav>

      <header className="mt-8">
        <h1 className="text-4xl font-extrabold tracking-tight">Hiring console</h1>
        <p className="mt-2 text-muted">Create assessments, share links, and read judgment instead of resumes.</p>
      </header>

      {/* create test */}
      <section className="glass mt-8 rounded-2xl p-6">
        <div className="flex items-center gap-2 font-bold"><Plus className="h-5 w-5 text-accent" /> New assessment</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs text-muted">Field</label>
            <select value={fieldId} onChange={(e) => setFieldId(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-accent">
              {FIELDS.filter((f) => f.live).map((f) => (
                <option key={f.id} value={f.id} className="bg-[#0c0e15]">{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted">Model lock</label>
            <select value={lockedModel} onChange={(e) => setLockedModel(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-accent">
              <option value="" className="bg-[#0c0e15]">Candidate chooses</option>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#0c0e15]">Lock to {m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted">Title (optional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior FE Screen" className="mt-1 w-full rounded-lg border border-[var(--line)] bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-accent" />
          </div>
        </div>
        <button onClick={createTest} disabled={creating} className="btn-primary mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm disabled:opacity-50">
          {creating ? "Creating…" : "Create & get share link"} <Link2 className="h-4 w-4" />
        </button>
      </section>

      {/* my tests */}
      {tests.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Your assessments</h2>
          <div className="space-y-2">
            {tests.map((t) => {
              const params = new URLSearchParams({ org: t.org });
              if (t.lockedModel) params.set("lock", t.lockedModel);
              if (t.title) params.set("title", t.title);
              const url = `${origin}/exam/${t.fieldId}?${params.toString()}`;
              return (
                <div key={t.id} className="glass flex items-center justify-between gap-4 rounded-xl p-4">
                  <div className="min-w-0">
                    <div className="font-semibold">{t.title}</div>
                    <div className="truncate text-xs text-muted">
                      {t.fieldName} · {t.lockedModel ? `locked: ${t.lockedModel}` : "any model"} · <span className="font-mono">{url}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={url} className="rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs text-muted transition hover:text-ink">Open</Link>
                    <CopyLink url={url} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* candidate results */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Candidate results</h2>
        <div className="space-y-3">
          {creds.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className="glass flex items-center gap-4 rounded-2xl p-4 transition hover:glow"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-[var(--accent2)]/30 text-sm font-bold">
                {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{c.name}</span>
                  <BadgeCheck className="h-4 w-4 text-[var(--green)]" />
                  {c.org && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">{c.org}</span>}
                </div>
                <div className="truncate text-sm text-muted">{c.field} · &ldquo;{c.verdict}&rdquo;</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted/70">{c.id}</div>
              </div>
              <div className="hidden gap-4 text-center sm:flex">
                {([["DET", c.dimensions.detection], ["DIR", c.dimensions.direction], ["EFF", c.dimensions.efficiency]] as const).map(([l, v]) => (
                  <div key={l}><div className="text-sm font-semibold">{v}</div><div className="text-[10px] uppercase text-muted">{l}</div></div>
                ))}
              </div>
              <div className="ml-2 text-right">
                <div className={`text-2xl font-extrabold ${GRADE_COLOR[c.grade] ?? "text-ink"}`}>{c.overall}</div>
                <div className={`text-xs font-bold ${GRADE_COLOR[c.grade] ?? "text-muted"}`}>{c.grade}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}
