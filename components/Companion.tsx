"use client";

/**
 * Companion — YNorth doesn't disappear after the plan. It schedules gentle
 * check-ins tied to the person's actual next steps, and nudges them forward.
 * (In production these arrive as SMS so no app/data is needed — shown in-app here.)
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HeartHandshake, Bell, Check } from "lucide-react";
import { read } from "@/lib/storage";
import type { CompassPath, CompassStep } from "@/lib/types";

export default function Companion({ path }: { path: CompassPath }) {
  const [active, setActive] = useState<CompassStep | undefined>(path.steps[0]);
  const [next, setNext] = useState<CompassStep | undefined>(path.steps[1]);
  const [reply, setReply] = useState<"" | "yes" | "no">("");

  useEffect(() => {
    const done = read("progress");
    const idx = path.steps.findIndex((s) => !done[s.id]);
    const i = idx < 0 ? 0 : idx;
    setActive(path.steps[i]);
    setNext(path.steps[i + 1]);
  }, [path]);

  if (!active) return null;

  const checkins = [
    { when: "Today", what: active.title },
    { when: "Tonight", what: "A gentle check-in to see how it went" },
    ...(next ? [{ when: "Tomorrow", what: next.title }] : []),
  ];

  return (
    <div className="glass mt-6 rounded-3xl p-7">
      <div className="flex items-center gap-2 text-sm font-semibold text-teal"><HeartHandshake className="h-4 w-4" /> YNorth stays with you</div>
      <p className="mt-2 text-muted">
        You won&apos;t face the next step alone. We&apos;ll check in and keep you moving —
        <span className="text-ink"> in the full version these come as friendly texts, so you don&apos;t even need the app open.</span>
      </p>

      <div className="mt-5 space-y-2.5">
        {checkins.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3.5 py-2.5 text-sm">
            <Bell className="h-4 w-4 shrink-0 text-gold" />
            <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-muted">{c.when}</span>
            <span>{c.what}</span>
          </motion.div>
        ))}
      </div>

      {/* a sample check-in */}
      <div className="mt-5 rounded-2xl bg-teal/5 p-4">
        <div className="text-sm">
          <span className="font-semibold text-teal">YNorth: </span>
          <span className="text-ink/90">Hey — were you able to {active.action.replace(/\.$/, "")}?</span>
        </div>
        {reply === "" ? (
          <div className="mt-3 flex gap-2">
            <button onClick={() => setReply("yes")} className="rounded-full bg-gold/15 px-4 py-1.5 text-sm font-semibold text-gold transition hover:bg-gold/25">Yes, done</button>
            <button onClick={() => setReply("no")} className="rounded-full border border-[var(--line)] px-4 py-1.5 text-sm text-ink transition hover:border-gold/50">Not yet</button>
          </div>
        ) : (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-sm text-ink/90">
            {reply === "yes" ? (
              <><Check className="mr-1 inline h-4 w-4 text-teal" />That&apos;s a real win.{next ? ` Next, when you're ready: ${next.title}.` : " You're doing this."}</>
            ) : (
              <>That&apos;s completely okay — this is hard, and there&apos;s no wrong pace. Want YNorth to call them again, or find another option for you? Just say the word.</>
            )}
          </motion.p>
        )}
      </div>
    </div>
  );
}
