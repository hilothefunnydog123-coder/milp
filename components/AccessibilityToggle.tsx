"use client";

/**
 * Accessibility Mode — a always-available control to make YNorth usable for
 * more people: larger text and high-contrast colors. Choices persist. Mounted
 * globally so it's on every page. (Read-aloud lives on the plan itself.)
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Accessibility, Type, Contrast, X } from "lucide-react";
import { store } from "@/lib/library";

export default function AccessibilityToggle() {
  const [open, setOpen] = useState(false);
  const [large, setLarge] = useState(false);
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    setLarge(store.get("yn_a11y_large") === "1");
    setContrast(store.get("yn_a11y_contrast") === "1");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("txt-large", large);
    store.set("yn_a11y_large", large ? "1" : "0");
  }, [large]);
  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", contrast);
    store.set("yn_a11y_contrast", contrast ? "1" : "0");
  }, [contrast]);

  return (
    <div className="no-print fixed bottom-5 left-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="glass mb-3 w-64 rounded-2xl p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Accessibility</span>
              <button onClick={() => setOpen(false)} aria-label="Close accessibility menu"><X className="h-4 w-4 text-muted" /></button>
            </div>
            <button onClick={() => setLarge((v) => !v)} aria-pressed={large} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${large ? "border-gold/60 bg-gold/10" : "border-[var(--line)]"}`}>
              <span className="flex items-center gap-2"><Type className="h-4 w-4 text-gold" /> Larger text</span>
              <span className={`h-4 w-4 rounded ${large ? "bg-gold" : "border border-[var(--line)]"}`} />
            </button>
            <button onClick={() => setContrast((v) => !v)} aria-pressed={contrast} className={`mt-2 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${contrast ? "border-gold/60 bg-gold/10" : "border-[var(--line)]"}`}>
              <span className="flex items-center gap-2"><Contrast className="h-4 w-4 text-gold" /> High contrast</span>
              <span className={`h-4 w-4 rounded ${contrast ? "bg-gold" : "border border-[var(--line)]"}`} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Accessibility options"
        className="flex h-12 w-12 items-center justify-center rounded-full btn-gold shadow-lg"
      >
        <Accessibility className="h-6 w-6" />
      </button>
    </div>
  );
}
