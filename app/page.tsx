"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  ScanSearch,
  Compass,
  Gauge,
  ShieldCheck,
  Sparkles,
  Terminal,
  Bot,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;
const reveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, -120]);
  const heroOpacity = useTransform(heroProgress, [0, 0.8], [1, 0]);
  const mockY = useTransform(heroProgress, [0, 1], [0, 80]);
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main>
      {/* scroll progress bar */}
      <motion.div
        style={{ scaleX: progress }}
        className="fixed left-0 top-0 z-50 h-0.5 w-full origin-left"
      >
        <div className="h-full w-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent2)] to-[var(--gold)]" />
      </motion.div>

      {/* sticky nav */}
      <nav
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled ? "border-b border-[var(--line)] bg-black/40 backdrop-blur-xl" : ""
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <Sparkles className="h-5 w-5 text-accent" />
            Judge<span className="gradient-text">mynt</span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted">
            <Link href="/employers" className="hidden transition hover:text-ink sm:block">
              For Employers
            </Link>
            <Link href="/exam" className="btn-primary rounded-full px-4 py-2 text-sm">
              Take the test
            </Link>
          </div>
        </div>
      </nav>

      {/* hero */}
      <section ref={heroRef} className="relative mx-auto max-w-6xl px-6 pt-36 pb-24">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-1.5 text-xs text-muted glass">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] live-dot" />
            The credential for the AI era · 15 careers live
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl md:text-8xl">
            Resumes are dead.
            <br />
            <span className="gradient-text">Prove you can command AI.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted">
            Everyone&apos;s resume looks identical now. Judgemynt drops you into a live task
            with a <span className="text-ink">deliberately flawed AI</span>, a ticking budget,
            and measures the one skill that matters: can you catch what AI gets wrong and steer
            it to right? Earn a verifiable degree in 10 minutes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/exam" className="btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base">
              Earn your degree <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/employers" className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-7 py-3.5 text-base text-ink transition hover:bg-white/5 glass">
              <ShieldCheck className="h-4 w-4 text-accent" /> Hire with it
            </Link>
          </div>
        </motion.div>

        {/* floating product mock */}
        <motion.div
          style={{ y: mockY }}
          initial={{ opacity: 0, y: 60, rotateX: 18 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-16 max-w-3xl"
          aria-hidden
        >
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-[0_40px_120px_-30px_rgba(110,168,255,0.4)]">
            <div className="flex items-center gap-2 border-b border-white/10 bg-[#161513] px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
              <span className="ml-3 text-xs text-[#8a8782]">claude-code — software-engineering</span>
            </div>
            <div className="space-y-2 p-5 font-mono text-[13px] leading-relaxed">
              <div><span className="text-[#d97757]">❯ </span><span className="text-white">write slugify(), handle every edge case</span></div>
              <div className="text-[#c9c6c0]"><span className="text-[#6f6c67]">⏺ claude</span> — here&apos;s a clean implementation:</div>
              <pre className="rounded border border-white/10 bg-black/60 p-3 text-[#7ddcff]">{`function slugify(t){return t.toLowerCase()
  .replace(/[\\s_]+/g,'-')
  .replace(/[^a-z0-9-]/g,'')}`}</pre>
              <div><span className="text-[#d97757]">❯ </span><span className="text-white">you forgot to collapse repeated hyphens and handle empty input</span></div>
              <div className="text-[#27c93f]">⏺ caught. patching…</div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            ↑ The AI hid a bug. Catching it is the test.
          </p>
        </motion.div>
      </section>

      {/* three axes */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-5xl">
            Graded on what a resume can&apos;t show
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            { icon: ScanSearch, title: "Detection", body: "We hide a real flaw in the AI's output — a bug, a false claim, a broken inference. Do you catch it, or rubber-stamp it?" },
            { icon: Compass, title: "Direction", body: "Anyone can prompt. We score how precisely and cleverly you steer the AI to a correct, professional result." },
            { icon: Gauge, title: "Efficiency", body: "A token + time budget. Surgical operators score high; flailing trial-and-error runs out of road." },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 0.1}>
              <div className="glass h-full rounded-2xl p-7 transition hover:glow">
                <c.icon className="mb-4 h-7 w-7 text-accent" />
                <h3 className="text-xl font-bold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* choose your AI */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Take it in any model</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Candidates choose — or employers lock one. The exam wears the real interface of
              each model, so you&apos;re tested in the tool you&apos;ll actually use.
            </p>
          </div>
        </Reveal>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            { name: "Claude Code", c: "#d97757", icon: Terminal, preview: <div className="font-mono text-[11px] text-[#c9c6c0]"><span className="text-[#d97757]">❯</span> build the parser<br /><span className="text-[#6f6c67]">⏺</span> done. tests passing.</div>, bg: "#0c0c0c" },
            { name: "Gemini", c: "#4285f4", icon: Sparkles, preview: <div className="text-[11px] text-[#1f1f1f]">Ask Gemini · <span className="text-[#80868b]">Flash</span></div>, bg: "#ffffff" },
            { name: "ChatGPT", c: "#10a37f", icon: Bot, preview: <div className="text-[11px] text-[#0d0d0d]">Ask anything…</div>, bg: "#ffffff" },
          ].map((m, i) => (
            <Reveal key={m.name} delay={i * 0.1}>
              <div className="glass overflow-hidden rounded-2xl">
                <div className="flex items-center gap-2 px-5 pt-5">
                  <m.icon className="h-5 w-5" style={{ color: m.c }} />
                  <span className="font-bold">{m.name}</span>
                </div>
                <div className="m-5 rounded-xl border border-white/10 p-4" style={{ background: m.bg }}>
                  {m.preview}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* manifesto */}
      <section className="mx-auto max-w-4xl px-6 py-28 text-center">
        <Reveal>
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            The future doesn&apos;t hire people who <span className="gradient-text">use</span> AI.
            <br />
            It hires people who can <span className="gradient-text">judge</span> it.
          </h2>
          <Link href="/exam" className="btn-primary mt-12 inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg">
            Prove it now <ArrowRight className="h-5 w-5" />
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-[var(--line)] py-8 text-center text-xs text-muted">
        Judgemynt · the anti-resume · built at Milpitas Hacks
      </footer>
    </main>
  );
}
