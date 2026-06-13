"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Compass,
  ArrowRight,
  MessageCircleHeart,
  Map,
  Footprints,
  ShieldCheck,
  Phone,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;
const reveal: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} transition={{ delay }}>
      {children}
    </motion.div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Compass className="h-5 w-5 text-gold" />
          Y<span className="warm-text">North</span>
        </div>
        <Link href="/start" className="btn-gold rounded-full px-5 py-2.5 text-sm">
          Find your path
        </Link>
      </nav>

      {/* hero */}
      <section className="relative mx-auto max-w-4xl overflow-hidden px-6 pt-20 pb-16 text-center">
        {/* the path home, drawing itself toward the star */}
        <svg className="pointer-events-none absolute inset-0 -z-0 h-full w-full opacity-50" viewBox="0 0 400 600" preserveAspectRatio="xMidYMin slice" aria-hidden>
          <motion.path
            d="M200 600 C 120 480, 280 420, 200 320 S 120 180, 200 70"
            fill="none"
            stroke="url(#trailgrad)"
            strokeWidth="2"
            strokeDasharray="2 9"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2.6, ease: EASE, delay: 0.3 }}
          />
          <defs>
            <linearGradient id="trailgrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#e08a72" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#e8b873" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <motion.circle cx="200" cy="70" r="4" fill="#fff"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.6] }} transition={{ delay: 2.6, duration: 1.2 }}
            style={{ filter: "drop-shadow(0 0 8px #e8b873)" }} />
        </svg>

        <motion.div className="relative" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}>
          <p className="mb-5 text-sm uppercase tracking-[0.3em] text-gold/80">A compass home</p>
          <h1 className="text-5xl leading-[1.05] sm:text-7xl">
            Find your way <span className="warm-text">home</span>.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted">
            The path out of homelessness is an invisible maze — waitlists, forms, and
            offices that don&apos;t talk to each other. YNorth turns it into a clear,
            plain-language path that&apos;s <span className="text-ink">yours</span>: what to do
            now, what you&apos;ll need, and the next single step toward a stable home.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/start" className="btn-gold inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base">
              Find your path <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/start?for=advocate" className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-7 py-3.5 text-base text-ink transition hover:bg-white/5 glass">
              <MessageCircleHeart className="h-4 w-4 text-teal" /> I&apos;m helping someone
            </Link>
          </div>
        </motion.div>

        {/* path preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1, ease: EASE }}
          className="mx-auto mt-16 max-w-md text-left"
        >
          <div className="glass rounded-3xl p-6">
            {[
              { t: "Reach 211", s: "now", d: "Free local help, today." },
              { t: "Get on the housing list", s: "now", d: "Coordinated Entry — your front door." },
              { t: "Move toward your own place", s: "later", d: "A voucher pays part of your rent." },
            ].map((step, i, arr) => (
              <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
                {i < arr.length - 1 && <div className="trail absolute left-[11px] top-7 h-full w-0.5" />}
                <div className="relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-2 border-gold bg-[var(--bg)]" style={{ boxShadow: "0 0 12px rgba(243,184,95,0.6)" }} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{step.t}</span>
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">{step.s}</span>
                  </div>
                  <p className="text-sm text-muted">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted">A real path, built for your situation in seconds.</p>
        </motion.div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: MessageCircleHeart, t: "Tell us where you are", d: "In your own words — by voice or text, in your language. No forms, no judgment." },
            { icon: Map, t: "See your path", d: "A clear, ordered map: what to do now, the documents you'll need, and real local systems." },
            { icon: Footprints, t: "Take one step", d: "Just the next step, with a plain-language guide and gentle reminders. You set the pace." },
          ].map((c, i) => (
            <Reveal key={c.t} delay={i * 0.1}>
              <div className="glass h-full rounded-2xl p-7">
                <c.icon className="mb-4 h-7 w-7 text-gold" />
                <h3 className="text-xl">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* dignity / privacy */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <Reveal>
          <ShieldCheck className="mx-auto h-8 w-8 text-teal" />
          <h2 className="mt-4 text-3xl sm:text-4xl">Your story stays yours.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            YNorth doesn&apos;t store your information on a server or sell anything. Your path
            lives on your device, and you choose if and when to share it — with a caseworker or
            someone you trust. Dignity means you stay in control.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <Reveal>
          <h2 className="text-3xl leading-tight sm:text-5xl">
            You don&apos;t have to figure it out <span className="warm-text">all at once</span>.
          </h2>
          <Link href="/start" className="btn-gold mt-9 inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg">
            Find your path <ArrowRight className="h-5 w-5" />
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-[var(--line)] py-7 text-center text-sm text-muted">
        <p className="flex items-center justify-center gap-2">
          <Phone className="h-4 w-4 text-gold" />
          In crisis? Call or text <span className="font-semibold text-ink">988</span> · For local help, dial{" "}
          <span className="font-semibold text-ink">211</span>
        </p>
        <p className="mt-3 text-xs">YNorth · find your way home · built at Milpitas Hacks</p>
      </footer>
    </main>
  );
}
