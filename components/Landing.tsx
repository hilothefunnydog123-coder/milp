"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Compass, ArrowRight, Phone } from "lucide-react";
import { SceneStar, SceneShelter, SceneCommunity, SceneHome } from "./illustrations";
import ImpactCounter from "./ImpactCounter";

const EASE = [0.22, 1, 0.36, 1] as const;
const rise: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};

function float(delay = 0) {
  return {
    animate: { y: [0, -12, 0] },
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const, delay },
  };
}

const SCENES = [
  {
    Scene: SceneShelter,
    tag: "The problem",
    title: "Getting housed shouldn't feel impossible.",
    body: "Waitlists, forms, and offices that don't talk to each other. People don't fall through the cracks — they fall through the confusion. YNorth gives you one clear path.",
  },
  {
    Scene: SceneCommunity,
    tag: "The intelligence",
    title: "It learns from every journey.",
    body: "A model that gets smarter each time someone is helped — surfacing what actually worked for people in situations like yours, so no one starts from zero.",
  },
  {
    Scene: SceneHome,
    tag: "The destination",
    title: "A place to call your own.",
    body: "Real, local help researched on the spot and the exact next step — in your words, in your language, with your dignity intact.",
  },
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
          <Link href="/start" className="btn-gold rounded-full px-5 py-2.5 text-sm">Find your path</Link>
        </div>
      </nav>

      {/* hero — the hook */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div {...float(0)} className="w-[280px] sm:w-[340px]">
          <SceneStar className="h-auto w-full" />
        </motion.div>
        <motion.div variants={rise} initial="hidden" animate="show" className="-mt-4">
          <p className="mb-4 text-sm uppercase tracking-[0.4em] text-gold/80">A compass home</p>
          <h1 className="text-6xl leading-[1.0] sm:text-8xl">
            Find your way <span className="warm-text">home</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            The path out of homelessness — made clear, local, and dignified. One step at a time.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/start" className="btn-gold inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg">
              Find your path <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/start?demo=1" className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-7 py-4 text-base text-ink transition hover:bg-white/5 glass">
              ▶ See it work in 30 seconds
            </Link>
          </div>
        </motion.div>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2.5 }} className="absolute bottom-8 text-xs uppercase tracking-[0.3em] text-muted">
          scroll
        </motion.div>
      </section>

      {/* the journey */}
      {SCENES.map(({ Scene, tag, title, body }, i) => (
        <section key={i} className="relative flex min-h-screen items-center px-6 py-20">
          <div className={`mx-auto grid w-full max-w-5xl items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[direction:rtl]" : ""}`}>
            <motion.div {...float(i * 0.6)} className="mx-auto w-[260px] sm:w-[320px] [direction:ltr]">
              <Scene className="h-auto w-full" />
            </motion.div>
            <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="glass rounded-3xl p-8 [direction:ltr] sm:p-10" style={{ backdropFilter: "blur(16px)" }}>
              <p className="text-xs uppercase tracking-[0.3em] text-gold/80">{tag}</p>
              <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">{title}</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">{body}</p>
            </motion.div>
          </div>
        </section>
      ))}

      {/* live impact counter — the pitch finale */}
      <ImpactCounter />

      {/* final CTA */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div variants={rise} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <h2 className="text-4xl leading-tight sm:text-6xl">
            You don&apos;t have to figure it out <span className="warm-text">alone</span>.
          </h2>
          <Link href="/start" className="btn-gold mt-10 inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg">
            Find your path <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted">
            <Phone className="h-4 w-4 text-gold" /> In crisis? Call or text 988 · Local help: 211
          </p>
        </motion.div>
      </section>
    </main>
  );
}
