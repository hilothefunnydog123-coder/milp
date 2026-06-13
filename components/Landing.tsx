"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight, Phone, Compass, MessageCircleHeart, Search, PhoneCall,
  Radar, ShieldCheck, Languages, Accessibility, Lock,
} from "lucide-react";
import { SceneShelter, SceneCommunity, SceneHome } from "./illustrations";
import ImpactCounter from "./ImpactCounter";
import AnimatedNumber from "./AnimatedNumber";

const EASE = [0.16, 1, 0.3, 1] as const;
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.18, delayChildren: 0.2 } } };
const inView = { initial: { opacity: 0, y: 36 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-90px" }, transition: { duration: 0.9, ease: EASE } } as const;

/* soft drifting motes of light */
const MOTES = [
  { l: "12%", d: 0, dur: 11, s: 3 }, { l: "26%", d: 2.5, dur: 14, s: 2 },
  { l: "44%", d: 1.2, dur: 12, s: 4 }, { l: "61%", d: 3.5, dur: 15, s: 2 },
  { l: "73%", d: 0.6, dur: 13, s: 3 }, { l: "86%", d: 2, dur: 16, s: 2 },
  { l: "34%", d: 4, dur: 17, s: 2 }, { l: "54%", d: 5, dur: 13, s: 3 },
];
function Motes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {MOTES.map((m, i) => (
        <motion.span key={i} className="absolute rounded-full"
          style={{ left: m.l, bottom: "-6%", width: m.s, height: m.s, background: "rgba(245,210,150,0.9)", boxShadow: "0 0 8px 2px rgba(232,184,115,0.5)" }}
          animate={{ y: ["0%", "-115vh"], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: m.dur, repeat: Infinity, ease: "easeInOut", delay: m.d }} />
      ))}
    </div>
  );
}

function NorthStarHero() {
  return (
    <div className="relative mb-2 flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
      <motion.div className="absolute rounded-full"
        style={{ width: "100%", height: "100%", background: "radial-gradient(circle, rgba(255,224,170,0.55), rgba(232,184,115,0.18) 40%, transparent 70%)" }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute h-full w-full"
        style={{ background: "conic-gradient(from 0deg, transparent 0 10deg, rgba(255,220,160,0.10) 12deg 13deg, transparent 15deg 100deg, rgba(255,220,160,0.08) 102deg 103deg, transparent 105deg)", borderRadius: "50%", filter: "blur(1px)" }}
        animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} />
      <motion.svg viewBox="0 0 100 100" className="relative h-24 w-24 sm:h-28 sm:w-28" style={{ filter: "drop-shadow(0 0 14px rgba(255,210,140,0.9))" }}
        animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
        <defs><linearGradient id="starg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fff6e6" /><stop offset="100%" stopColor="#f3b85f" /></linearGradient></defs>
        <path d="M50 6 L58 42 L94 50 L58 58 L50 94 L42 58 L6 50 L42 42 Z" fill="url(#starg)" />
      </motion.svg>
    </div>
  );
}

const SCENES = [
  { Scene: SceneShelter, tag: "you are not alone", title: "The way home is hard to see alone.", body: "Waitlists, forms, and offices that don't speak to each other. YNorth gathers the scattered pieces into one gentle path you can actually follow." },
  { Scene: SceneCommunity, tag: "carried by many", title: "Every step lights the way for the next.", body: "YNorth quietly learns what truly helped people walking a road like yours — so no one ever has to start in the dark." },
  { Scene: SceneHome, tag: "almost there", title: "A door of your own, a light left on.", body: "Real, local help found on the spot — in your words, in your language, with your dignity held close the whole way." },
];

const HOW = [
  { icon: MessageCircleHeart, t: "You speak — in any language", d: "Type or talk, in your own words.", tag: "Gemini 2.5 Flash" },
  { icon: Search, t: "We find real, local help", d: "Live web + map research, never made up.", tag: "Search grounding · OpenStreetMap" },
  { icon: PhoneCall, t: "We make the call & book it", d: "An AI voice agent calls on your behalf.", tag: "Vapi" },
  { icon: Radar, t: "We keep watch & learn", d: "The Guardian watches for openings; the model improves.", tag: "Supabase" },
];

const DIGNITY = [
  { icon: Lock, t: "Consent-first" },
  { icon: ShieldCheck, t: "Your story stays on your device" },
  { icon: MessageCircleHeart, t: "Plain language" },
  { icon: Languages, t: "10 languages" },
  { icon: Accessibility, t: "Built for accessibility" },
];

export default function Landing() {
  return (
    <main className="relative">
      <nav className="fixed inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Compass className="h-5 w-5 text-gold" /> Y<span className="warm-text">North</span>
          </div>
          <Link href="/start">
            <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="btn-gold inline-flex rounded-full px-5 py-2.5 text-sm">Find your path</motion.span>
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <Motes />
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative flex flex-col items-center">
          <motion.div variants={item}><NorthStarHero /></motion.div>
          <motion.p variants={item} className="mb-4 text-xs uppercase tracking-[0.45em] text-gold/80">your north star home</motion.p>
          <motion.h1 variants={item} className="text-6xl leading-[1.02] tracking-tight sm:text-8xl">
            Find your way <span className="warm-text">home</span>.
          </motion.h1>
          <motion.p variants={item} className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            However far you&apos;ve wandered, there is a way back. YNorth is the steady light that points you home — and walks the whole way beside you.
          </motion.p>
          <motion.p variants={item} className="mx-auto mt-4 max-w-xl text-base text-ink/90">
            Most tools just tell you what to do. <span className="warm-text font-semibold">YNorth does it for you</span> — it calls, it books, it keeps watch.
          </motion.p>
          <motion.div variants={item} className="mt-9 flex flex-col items-center gap-4">
            <Link href="/start">
              <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={{ ease: EASE }} className="btn-gold inline-flex items-center gap-2 rounded-full px-9 py-4 text-lg">
                Find your path home <ArrowRight className="h-5 w-5" />
              </motion.span>
            </Link>
            <Link href="/start?demo=1" className="text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline">
              or watch it light the way — 30 seconds
            </Link>
          </motion.div>
        </motion.div>
        <motion.div animate={{ opacity: [0.25, 0.9, 0.25] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute bottom-8 text-xs uppercase tracking-[0.3em] text-muted">follow it down</motion.div>
      </section>

      {/* the need is real (cited) */}
      <section className="relative mx-auto max-w-5xl px-6 py-24 text-center">
        <motion.h2 {...inView} className="text-3xl leading-tight sm:text-4xl">The need is staggering. The maze is the reason.</motion.h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          <motion.div {...inView}>
            <div className="font-display text-5xl warm-text sm:text-6xl"><AnimatedNumber value={653000} />+</div>
            <p className="mt-2 text-sm text-muted">people experiencing homelessness on a single night in the U.S.</p>
          </motion.div>
          <motion.div {...inView} transition={{ ...inView.transition, delay: 0.1 }}>
            <div className="font-display text-5xl warm-text sm:text-6xl">20M+</div>
            <p className="mt-2 text-sm text-muted">times a year people reach 211 searching for help</p>
          </motion.div>
          <motion.div {...inView} transition={{ ...inView.transition, delay: 0.2 }}>
            <div className="font-display text-5xl warm-text sm:text-6xl">1</div>
            <p className="mt-2 text-sm text-muted">clear path — because the programs exist; navigating them is what defeats people</p>
          </motion.div>
        </div>
        <motion.p {...inView} className="mt-8 text-xs text-muted/70">Sources: HUD 2023 Annual Homeless Assessment Report · United Way 211</motion.p>
      </section>

      {/* the journey */}
      {SCENES.map(({ Scene, tag, title, body }, i) => (
        <section key={i} className="relative flex min-h-[85vh] items-center px-6 py-16">
          <div className={`mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-2 ${i % 2 ? "md:[direction:rtl]" : ""}`}>
            <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 7 + i, repeat: Infinity, ease: "easeInOut" }} className="mx-auto w-[250px] sm:w-[320px] [direction:ltr]">
              <Scene className="h-auto w-full" />
            </motion.div>
            <motion.div {...inView} className="[direction:ltr]">
              <p className="text-xs uppercase tracking-[0.35em] text-gold/80">{tag}</p>
              <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">{title}</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{body}</p>
            </motion.div>
          </div>
        </section>
      ))}

      {/* how it works (technical) */}
      <section className="relative mx-auto max-w-6xl px-6 py-24">
        <motion.div {...inView} className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-gold/80">how it works</p>
          <h2 className="mt-4 text-3xl leading-tight sm:text-5xl">Real AI, doing real work.</h2>
        </motion.div>
        <div className="mt-12 grid gap-5 md:grid-cols-4">
          {HOW.map((h, i) => (
            <motion.div key={h.t} {...inView} transition={{ ...inView.transition, delay: i * 0.08 }} className="glass rounded-2xl p-6">
              <div className="mb-4 inline-flex rounded-xl border border-[var(--line)] p-2.5"><h.icon className="h-6 w-6 text-gold" /></div>
              <h3 className="text-lg">{h.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{h.d}</p>
              <p className="mt-3 text-[11px] uppercase tracking-wide text-gold/70">{h.tag}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* dignity strip (relevance) */}
      <section className="relative mx-auto max-w-5xl px-6 py-16">
        <motion.div {...inView} className="glass rounded-3xl p-8 text-center sm:p-10">
          <h2 className="text-2xl sm:text-3xl">Built with dignity at the center.</h2>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {DIGNITY.map((d) => (
              <span key={d.t} className="flex items-center gap-2 text-sm text-muted"><d.icon className="h-4 w-4 text-teal" /> {d.t}</span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* scale / outreach (impact) */}
      <section className="relative mx-auto max-w-4xl px-6 py-20 text-center">
        <motion.h2 {...inView} className="text-3xl leading-tight sm:text-4xl">
          Built to <span className="warm-text">scale dignity</span>.
        </motion.h2>
        <motion.p {...inView} className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          One outreach worker can guide many. YNorth is free, multilingual, and ready on any phone,
          library computer, or shelter kiosk — meeting people exactly where they are.
        </motion.p>
      </section>

      <ImpactCounter />

      {/* final CTA */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <Motes />
        <motion.div {...inView} className="relative">
          <div className="mx-auto mb-6"><NorthStarHero /></div>
          <h2 className="text-4xl leading-[1.08] sm:text-6xl">
            Wherever you are tonight,
            <br /><span className="warm-text">there is a way home.</span>
          </h2>
          <Link href="/start">
            <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={{ ease: EASE }} className="btn-gold mt-10 inline-flex items-center gap-2 rounded-full px-9 py-4 text-lg">
              Find your path home <ArrowRight className="h-5 w-5" />
            </motion.span>
          </Link>
          <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted">
            <Phone className="h-4 w-4 text-gold" /> In crisis? Call or text 988 · Local help: 211
          </p>
        </motion.div>
      </section>
    </main>
  );
}
