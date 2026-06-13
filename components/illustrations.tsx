"use client";

import { motion } from "framer-motion";

// Animated, on-theme line-art cinematics: a person, a shelter, a community, a home.
// Drawn with light — dignified, hopeful, not stock photos.

const G = "#e8b873"; // gold
const T = "#74cdbd"; // teal
const I = "#eef1f6"; // ink

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  show: (d = 0) => ({
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { duration: 1.8, delay: d, ease: [0.22, 1, 0.36, 1] as const }, opacity: { duration: 0.4, delay: d } },
  }),
};

function figure(x: number, y: number, color = I, s = 1) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <motion.circle cx="0" cy="-22" r="7" fill="none" stroke={color} strokeWidth="2.5" variants={draw} />
      <motion.path d="M0 -15 L0 8 M0 -8 L-9 -2 M0 -8 L9 -2 M0 8 L-7 22 M0 8 L7 22" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" variants={draw} />
    </g>
  );
}

const wrap = {
  initial: "hidden",
  whileInView: "show",
  viewport: { once: true, margin: "-80px" },
} as const;

export function SceneStar({ className }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 200 220" className={className} {...wrap}>
      {/* guiding star */}
      <motion.path
        d="M100 8 L106 30 L128 36 L106 42 L100 64 L94 42 L72 36 L94 30 Z"
        fill={G}
        initial={{ opacity: 0, scale: 0.6 }}
        whileInView={{ opacity: [0, 1, 0.85], scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2 }}
        style={{ transformOrigin: "100px 36px", filter: "drop-shadow(0 0 10px rgba(232,184,115,0.8))" }}
      />
      {/* winding path toward the star */}
      <motion.path d="M100 200 C 64 168, 132 140, 100 108 S 70 78, 100 64" fill="none" stroke={G} strokeWidth="2.5" strokeDasharray="2 9" strokeLinecap="round" variants={draw} custom={0.3} />
      {figure(100, 196, I, 1)}
    </motion.svg>
  );
}

export function SceneShelter({ className }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 220 200" className={className} {...wrap}>
      <motion.circle cx="110" cy="120" r="60" fill="rgba(232,184,115,0.10)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} />
      {/* roof / shelter */}
      <motion.path d="M48 96 L110 52 L172 96" fill="none" stroke={G} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" variants={draw} />
      <motion.path d="M62 96 L62 150 L158 150 L158 96" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" variants={draw} custom={0.4} />
      {figure(110, 146, T, 1.05)}
    </motion.svg>
  );
}

export function SceneCommunity({ className }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 260 200" className={className} {...wrap}>
      {/* connecting network — the learning model */}
      <motion.path d="M70 120 Q 130 70 190 120" fill="none" stroke={T} strokeWidth="2" strokeDasharray="2 7" variants={draw} custom={0.5} />
      <motion.path d="M70 120 Q 130 170 190 120" fill="none" stroke={T} strokeWidth="2" strokeDasharray="2 7" variants={draw} custom={0.7} />
      {[70, 130, 190].map((x, i) => (
        <motion.circle key={x} cx={x} cy="120" r="5" fill={G} initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.2 }} />
      ))}
      {figure(70, 116, I)}
      {figure(130, 110, G, 1.1)}
      {figure(190, 116, I)}
    </motion.svg>
  );
}

export function SceneHome({ className }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 220 200" className={className} {...wrap}>
      <motion.path d="M44 100 L110 46 L176 100" fill="none" stroke={I} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" variants={draw} />
      <motion.path d="M60 100 L60 156 L160 156 L160 100" fill="none" stroke={I} strokeWidth="2.5" strokeLinecap="round" variants={draw} custom={0.3} />
      {/* warm glowing window */}
      <motion.rect x="92" y="112" width="36" height="44" rx="3" fill={G}
        initial={{ opacity: 0 }} whileInView={{ opacity: [0, 1, 0.85] }} viewport={{ once: true }} transition={{ duration: 1.4, delay: 0.9 }}
        style={{ filter: "drop-shadow(0 0 12px rgba(232,184,115,0.9))" }} />
      <motion.path d="M110 112 L110 156 M92 134 L128 134" stroke="#1c1306" strokeWidth="2" initial={{ opacity: 0 }} whileInView={{ opacity: 0.6 }} viewport={{ once: true }} transition={{ delay: 1.2 }} />
    </motion.svg>
  );
}
