"use client";

// Landing "lives in motion" counter. Pulls REAL, earned usage from /api/impact
// (paths charted, calls made, beds booked, languages served) and stays hidden
// until there is genuine usage — no fabricated numbers.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";
import { get } from "@/lib/client";
import { GET_ENDPOINTS, type ImpactSnapshot } from "@/lib/api";

export default function ImpactCounter() {
  const [d, setD] = useState<ImpactSnapshot | null>(null);
  // The counter's shape is the endpoint's shape — one declaration, in lib/api.ts.
  useEffect(() => {
    let live = true;
    void get(GET_ENDPOINTS.impact()).then((result) => {
      if (live && result.ok) setD(result.value);
    });
    return () => { live = false; };
  }, []);
  // Honest by design: only show the counter once there's real, earned usage.
  if (!d || d.paths + d.calls + d.beds === 0) return null;

  const stats = [
    { n: d.paths, l: "paths charted home" },
    { n: d.calls, l: "calls made for people" },
    { n: d.beds, l: "beds booked" },
    { n: d.languages, l: "languages served" },
  ];

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-sm uppercase tracking-[0.35em] text-gold/80">
        Lives in motion
      </motion.p>
      <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="mt-4 max-w-2xl text-4xl leading-tight sm:text-5xl">
        Every number is a person who didn&apos;t have to do it alone.
      </motion.h2>
      <div className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.l} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.08 }}>
            <div className="font-display text-5xl warm-text sm:text-6xl"><AnimatedNumber value={s.n} /></div>
            <div className="mt-2 text-sm text-muted">{s.l}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
