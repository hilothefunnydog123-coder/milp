"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Code2,
  Megaphone,
  LineChart,
  Scale,
  Headset,
  Banknote,
  Boxes,
  Handshake,
  Stethoscope,
  Users,
  PenLine,
  ShieldAlert,
  PenTool,
  Truck,
  FlaskConical,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { FIELDS } from "@/lib/fields";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2,
  Megaphone,
  LineChart,
  Scale,
  Headset,
  Banknote,
  Boxes,
  Handshake,
  Stethoscope,
  Users,
  PenLine,
  ShieldAlert,
  PenTool,
  Truck,
  FlaskConical,
};

export default function ExamPicker() {
  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted transition hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <Sparkles className="h-5 w-5 text-accent" />
          Judge<span className="gradient-text">mynt</span>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Pick the field you want to be <span className="gradient-text">hired</span> in.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            One real task. A flawed AI. Ten minutes. Earn the degree.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((f, i) => {
            const Icon = ICONS[f.icon] ?? Code2;
            const card = (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * i, duration: 0.5 }}
                whileHover={f.live ? { y: -6 } : {}}
                className={`group relative overflow-hidden rounded-2xl border border-[var(--line)] p-6 ${
                  f.live ? "glass cursor-pointer hover:glow" : "opacity-55"
                }`}
              >
                <div
                  className={`absolute inset-0 -z-10 bg-gradient-to-br ${f.accent} opacity-0 transition group-hover:opacity-100`}
                />
                <div className="flex items-start justify-between">
                  <Icon className="h-8 w-8 text-accent" />
                  {f.live ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-[var(--green)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--green)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] live-dot" /> LIVE
                    </span>
                  ) : (
                    <Lock className="h-4 w-4 text-muted" />
                  )}
                </div>
                <h3 className="mt-5 text-xl font-bold">{f.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.tagline}</p>
                {f.live && (
                  <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-accent">
                    Start exam <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                )}
              </motion.div>
            );
            return f.live ? (
              <Link key={f.id} href={`/exam/${f.id}`}>
                {card}
              </Link>
            ) : (
              <div key={f.id}>{card}</div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
