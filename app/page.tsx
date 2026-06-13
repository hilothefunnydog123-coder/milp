"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ScanSearch,
  Compass,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <Sparkles className="h-5 w-5 text-accent" />
          Judge<span className="gradient-text">mynt</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted">
          <Link href="/employers" className="transition hover:text-ink">
            For Employers
          </Link>
          <Link href="/exam" className="btn-primary rounded-full px-4 py-2 text-sm">
            Take the test
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <motion.div
          custom={0}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-1.5 text-xs text-muted glass"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] live-dot" />
          The credential for the AI era
        </motion.div>

        <motion.h1
          custom={1}
          variants={fade}
          initial="hidden"
          animate="show"
          className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl"
        >
          Resumes are dead.
          <br />
          <span className="gradient-text">Prove you can command AI.</span>
        </motion.h1>

        <motion.p
          custom={2}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted"
        >
          Everyone&apos;s resume looks identical now — same ChatGPT polish, same
          buzzwords. Companies are hiring blind. Judgemynt drops you in a room
          with a flawed AI, a ticking budget, and a real task, and measures the
          one skill that actually matters:{" "}
          <span className="text-ink">
            can you catch what AI gets wrong and steer it to right?
          </span>{" "}
          Earn a verifiable degree in 10 minutes.
        </motion.p>

        <motion.div
          custom={3}
          variants={fade}
          initial="hidden"
          animate="show"
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href="/exam"
            className="btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base"
          >
            Earn your degree <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/employers"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-7 py-3.5 text-base text-ink transition hover:bg-white/5 glass"
          >
            <ShieldCheck className="h-4 w-4 text-accent" /> See what employers see
          </Link>
        </motion.div>
      </section>

      {/* the three axes */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-5 md:grid-cols-3"
        >
          {[
            {
              icon: ScanSearch,
              title: "Detect",
              body: "We hide a real flaw in the AI's output — a subtle bug, a false claim, a broken inference. Do you catch it, or rubber-stamp it?",
            },
            {
              icon: Compass,
              title: "Direct",
              body: "Anyone can prompt. We score how precisely and cleverly you steer the AI to a correct, professional result.",
            },
            {
              icon: Gauge,
              title: "Efficiency",
              body: "You get a token + time budget. Surgical operators score high; flailing trial-and-error runs out of road.",
            },
          ].map((c, i) => (
            <motion.div key={c.title} custom={i} variants={fade} className="glass rounded-2xl p-7">
              <c.icon className="mb-4 h-7 w-7 text-accent" />
              <h3 className="text-xl font-bold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* manifesto strip */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-3xl font-extrabold leading-tight sm:text-5xl"
        >
          The future doesn&apos;t hire people who <span className="gradient-text">use</span> AI.
          <br />
          It hires people who can <span className="gradient-text">judge</span> it.
        </motion.h2>
        <Link
          href="/exam"
          className="btn-primary mt-10 inline-flex items-center gap-2 rounded-full px-7 py-3.5"
        >
          Prove it now <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-[var(--line)] py-8 text-center text-xs text-muted">
        Judgemynt · built at Milpitas Hacks · the anti-resume
      </footer>
    </main>
  );
}
