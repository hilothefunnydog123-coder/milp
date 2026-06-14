"use client";

// A brief, tasteful celebration: a gold/teal burst + a soft toast. Overlay only
// (pointer-events: none), auto-dismissed by the parent — never blocks anything.
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function Celebrate({ message = "Your path home is ready" }: { message?: string }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        a: (i / 18) * Math.PI * 2 + Math.random() * 0.3,
        dist: 120 + Math.random() * 160,
        delay: Math.random() * 0.15,
        size: 5 + Math.random() * 7,
        dur: 1.1 + Math.random() * 0.7,
        teal: i % 3 === 0,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center overflow-hidden">
      <div className="relative" style={{ marginTop: "24vh" }}>
        {bits.map((b, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ width: b.size, height: b.size, left: 0, top: 0, background: b.teal ? "#74cdbd" : "#f3b85f", boxShadow: "0 0 10px 2px rgba(243,184,95,0.55)" }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{ x: Math.cos(b.a) * b.dist, y: Math.sin(b.a) * b.dist - 30, opacity: [0, 1, 0], scale: [0, 1, 0.6] }}
            transition={{ duration: b.dur, delay: b.delay, ease: "easeOut" }}
          />
        ))}
        <motion.div
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 3.2, opacity: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="absolute -left-6 -top-6 h-12 w-12 rounded-full"
          style={{ border: "2px solid rgba(243,184,95,0.6)" }}
        />
      </div>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: [0, 1, 1, 0], y: [-16, 0, 0, -10] }}
        transition={{ duration: 2.6, times: [0, 0.15, 0.8, 1] }}
        className="glass absolute top-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
      >
        <Sparkles className="h-4 w-4 text-gold" /> {message}
      </motion.div>
    </div>
  );
}
