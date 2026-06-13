"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  type Variants,
} from "framer-motion";
import {
  Compass, ArrowRight, Phone, Sparkles, MapPin, Brain, PhoneCall,
  MessageCircleHeart, Map as MapIcon, Footprints, ShieldCheck,
} from "lucide-react";
import { SceneShelter, SceneCommunity, SceneHome } from "./illustrations";
import ImpactCounter from "./ImpactCounter";

const EASE = [0.16, 1, 0.3, 1] as const;
const item: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
};
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.11, delayChildren: 0.08 } } };

/* ---------- magnetic wrapper: element drifts toward the cursor ---------- */
function Magnetic({ children, className }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 14 });
  const sy = useSpring(y, { stiffness: 180, damping: 14 });
  const ref = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ---------- spotlight feature card: a glow tracks the cursor inside it ---------- */
function SpotlightCard({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);
  const bg = useMotionTemplate`radial-gradient(240px circle at ${mx}px ${my}px, rgba(232,184,115,0.16), transparent 60%)`;
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3, ease: EASE }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      onMouseLeave={() => { mx.set(-200); my.set(-200); }}
      className="glass group relative h-full overflow-hidden rounded-2xl p-7"
    >
      <motion.div style={{ background: bg }} className="pointer-events-none absolute inset-0" />
      <div className="relative">
        <div className="mb-4 inline-flex rounded-xl border border-[var(--line)] p-2.5 transition group-hover:border-gold/50">
          <Icon className="h-6 w-6 text-gold" />
        </div>
        <h3 className="text-xl">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </motion.div>
  );
}

/* ---------- the interactive preview window (tilts toward the cursor) ---------- */
function PreviewWindow() {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 120, damping: 12 });
  const sry = useSpring(ry, { stiffness: 120, damping: 12 });
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, ease: EASE, delay: 0.3 }}
      style={{ perspective: 1000 }}
      className="w-full"
    >
      <motion.div
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          ry.set(((e.clientX - (r.left + r.width / 2)) / r.width) * 12);
          rx.set((-(e.clientY - (r.top + r.height / 2)) / r.height) * 12);
        }}
        onMouseLeave={() => { rx.set(0); ry.set(0); }}
        style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }}
        animate={{ y: [0, -10, 0] }}
        transition={{ y: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
        className="glass glow-gold rounded-3xl p-5"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--rose)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-gold" />
          <span className="h-2.5 w-2.5 rounded-full bg-teal" />
          <span className="ml-2 text-xs text-muted">your path · San Jose</span>
        </div>
        {/* mini steps */}
        <div className="space-y-2.5">
          {[
            ["Reach your local help line", "now"],
            ["Get on the housing list", "now"],
            ["Move toward your own place", "later"],
          ].map(([t, s], i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.18, ease: EASE }}
              className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white/[0.03] px-3 py-2.5"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gold text-xs font-semibold text-gold">{i + 1}</span>
              <span className="text-sm">{t}</span>
              <span className="ml-auto rounded-full bg-gold/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">{s}</span>
            </motion.div>
          ))}
        </div>
        {/* mini availability + call */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2.5">
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#34c759]" /> open</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f0c33b]" /> check</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f0564a]" /> full</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full btn-gold px-3 py-1.5 text-xs"><PhoneCall className="h-3 w-3" /> Call for me</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- CTA: magnetic + poppy ---------- */
function CTA({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "ghost" }) {
  return (
    <Magnetic className="inline-block">
      <Link href={href}>
        <motion.span
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2, ease: EASE }}
          className={
            variant === "primary"
              ? "btn-gold inline-flex items-center gap-2 rounded-full px-8 py-4 text-lg"
              : "glass inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-7 py-4 text-base text-ink"
          }
        >
          {children}
        </motion.span>
      </Link>
    </Magnetic>
  );
}

const SCENES = [
  { Scene: SceneShelter, tag: "The problem", title: "Getting housed shouldn't feel impossible.", body: "Waitlists, forms, and offices that don't talk to each other. People fall through the confusion. YNorth gives you one clear path." },
  { Scene: SceneCommunity, tag: "The intelligence", title: "It learns from every journey.", body: "A model that gets smarter each time someone is helped — surfacing what actually worked for people in situations like yours." },
  { Scene: SceneHome, tag: "The destination", title: "A place to call your own.", body: "Real, local help researched on the spot, the next exact step — in your words, in your language, with your dignity intact." },
];

export default function Landing() {
  // cursor-following ambient glow
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);
  const sgx = useSpring(gx, { stiffness: 50, damping: 20 });
  const sgy = useSpring(gy, { stiffness: 50, damping: 20 });
  const glow = useMotionTemplate`radial-gradient(560px circle at ${sgx}px ${sgy}px, rgba(232,184,115,0.09), transparent 70%)`;

  return (
    <main className="relative" onMouseMove={(e) => { gx.set(e.clientX); gy.set(e.clientY); }}>
      <motion.div style={{ background: glow }} className="pointer-events-none fixed inset-0 z-0" />

      {/* nav */}
      <nav className="fixed inset-x-0 top-0 z-30 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Compass className="h-5 w-5 text-gold" /> Y<span className="warm-text">North</span>
          </div>
          <CTA href="/start" variant="primary"><span className="text-sm">Find your path</span></CTA>
        </div>
      </nav>

      {/* hero */}
      <section className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 pt-28 pb-16 lg:grid-cols-2">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.p variants={item} className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-gold/90 glass">
            <Sparkles className="h-3.5 w-3.5" /> A compass home
          </motion.p>
          <motion.h1 variants={item} className="text-6xl leading-[0.98] tracking-tight sm:text-7xl">
            Find your way <span className="warm-text">home</span>.
          </motion.h1>
          <motion.p variants={item} className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            The path out of homelessness — researched live, spoken in your language, and walked with you. YNorth even makes the call for you.
          </motion.p>
          <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-4">
            <CTA href="/start" variant="primary">Find your path <ArrowRight className="h-5 w-5" /></CTA>
            <CTA href="/start?demo=1" variant="ghost">▶ See it work in 30s</CTA>
          </motion.div>
          {/* credibility row */}
          <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-teal" /> Private by design</span>
            <span className="flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-gold" /> Learns from every journey</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gold" /> Real local resources</span>
            <span className="flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5 text-gold" /> Calls for you</span>
          </motion.div>
        </motion.div>

        <PreviewWindow />
      </section>

      {/* how it works — spotlight cards */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid gap-5 md:grid-cols-3">
          <SpotlightCard icon={MessageCircleHeart} title="Tell us where you are" body="In your own words — by voice or text, in your language. No forms, no judgment." />
          <SpotlightCard icon={MapIcon} title="See your path" body="A clear, ordered map: what to do now, the documents you'll need, and real local help on a live map." />
          <SpotlightCard icon={Footprints} title="Take one step" body="Just the next step — with a call script, a ride plan, and YNorth ready to make the call for you." />
        </motion.div>
      </section>

      {/* the journey */}
      {SCENES.map(({ Scene, tag, title, body }, i) => (
        <section key={i} className="relative z-10 flex min-h-[80vh] items-center px-6 py-16">
          <div className={`mx-auto grid w-full max-w-5xl items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[direction:rtl]" : ""}`}>
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }} className="mx-auto w-[240px] sm:w-[300px] [direction:ltr]">
              <Scene className="h-auto w-full" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.85, ease: EASE }} className="glass rounded-3xl p-8 [direction:ltr] sm:p-10">
              <p className="text-xs uppercase tracking-[0.3em] text-gold/80">{tag}</p>
              <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">{title}</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">{body}</p>
            </motion.div>
          </div>
        </section>
      ))}

      <div className="relative z-10"><ImpactCounter /></div>

      {/* final CTA */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE }}>
          <h2 className="text-4xl leading-tight sm:text-6xl">
            You don&apos;t have to figure it out <span className="warm-text">alone</span>.
          </h2>
          <div className="mt-10"><CTA href="/start" variant="primary">Find your path <ArrowRight className="h-5 w-5" /></CTA></div>
          <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted">
            <Phone className="h-4 w-4 text-gold" /> In crisis? Call or text 988 · Local help: 211
          </p>
        </motion.div>
      </section>
    </main>
  );
}
