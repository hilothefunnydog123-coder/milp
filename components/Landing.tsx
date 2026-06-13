"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Phone, Compass } from "lucide-react";
import { SceneShelter, SceneCommunity, SceneHome } from "./illustrations";
import ImpactCounter from "./ImpactCounter";

const EASE = [0.16, 1, 0.3, 1] as const;
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.18, delayChildren: 0.2 } } };

/* soft drifting motes of light — gentle, sentimental, never busy */
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
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ left: m.l, bottom: "-6%", width: m.s, height: m.s, background: "rgba(245,210,150,0.9)", boxShadow: "0 0 8px 2px rgba(232,184,115,0.5)" }}
          animate={{ y: ["0%", "-115vh"], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: m.dur, repeat: Infinity, ease: "easeInOut", delay: m.d }}
        />
      ))}
    </div>
  );
}

/* the guiding north star */
function NorthStarHero() {
  return (
    <div className="relative mb-2 flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
      {/* breathing halo */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: "100%", height: "100%", background: "radial-gradient(circle, rgba(255,224,170,0.55), rgba(232,184,115,0.18) 40%, transparent 70%)" }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* slow faint rays */}
      <motion.div
        className="absolute h-full w-full"
        style={{ background: "conic-gradient(from 0deg, transparent 0 10deg, rgba(255,220,160,0.10) 12deg 13deg, transparent 15deg 100deg, rgba(255,220,160,0.08) 102deg 103deg, transparent 105deg)" , borderRadius: "50%", filter: "blur(1px)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
      {/* the star */}
      <motion.svg viewBox="0 0 100 100" className="relative h-24 w-24 sm:h-28 sm:w-28" style={{ filter: "drop-shadow(0 0 14px rgba(255,210,140,0.9))" }}
        animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
        <defs>
          <linearGradient id="starg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff6e6" />
            <stop offset="100%" stopColor="#f3b85f" />
          </linearGradient>
        </defs>
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

export default function Landing() {
  return (
    <main className="relative">
      {/* nav */}
      <nav className="fixed inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Compass className="h-5 w-5 text-gold" /> Y<span className="warm-text">North</span>
          </div>
          <Link href="/start">
            <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="btn-gold inline-flex rounded-full px-5 py-2.5 text-sm">
              Find your path
            </motion.span>
          </Link>
        </div>
      </nav>

      {/* hero — the guiding star above the words */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <Motes />
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative flex flex-col items-center">
          <motion.div variants={item}><NorthStarHero /></motion.div>
          <motion.p variants={item} className="mb-4 text-xs uppercase tracking-[0.45em] text-gold/80">
            your north star home
          </motion.p>
          <motion.h1 variants={item} className="text-6xl leading-[1.02] tracking-tight sm:text-8xl">
            Find your way <span className="warm-text">home</span>.
          </motion.h1>
          <motion.p variants={item} className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-muted">
            However far you&apos;ve wandered, there is a way back. YNorth is the steady light
            that points you home — and walks the whole way beside you, one gentle step at a time.
          </motion.p>
          <motion.div variants={item} className="mt-10 flex flex-col items-center gap-4">
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
        <motion.div animate={{ opacity: [0.25, 0.9, 0.25] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute bottom-8 text-xs uppercase tracking-[0.3em] text-muted">
          follow it down
        </motion.div>
      </section>

      {/* the journey home */}
      {SCENES.map(({ Scene, tag, title, body }, i) => (
        <section key={i} className="relative flex min-h-[85vh] items-center px-6 py-16">
          <div className={`mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-2 ${i % 2 ? "md:[direction:rtl]" : ""}`}>
            <motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 7 + i, repeat: Infinity, ease: "easeInOut" }} className="mx-auto w-[250px] sm:w-[320px] [direction:ltr]">
              <Scene className="h-auto w-full" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1, ease: EASE }} className="[direction:ltr]">
              <p className="text-xs uppercase tracking-[0.35em] text-gold/80">{tag}</p>
              <h2 className="mt-4 text-4xl leading-[1.1] sm:text-5xl">{title}</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{body}</p>
            </motion.div>
          </div>
        </section>
      ))}

      <ImpactCounter />

      {/* final CTA */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <Motes />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE }} className="relative">
          <div className="mx-auto mb-6"><NorthStarHero /></div>
          <h2 className="text-4xl leading-[1.08] sm:text-6xl">
            Wherever you are tonight,
            <br />
            <span className="warm-text">there is a way home.</span>
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
