"use client";

/**
 * LibraryMode — the on-screen half of the shared-computer guarantee.
 *
 * Mounted globally, it does three things and only when library mode is active:
 *   1. Shows a standing "Private session" badge, so the person (and the
 *      librarian who handed them the machine) can see the promise is on.
 *   2. Offers a one-tap "Erase & finish" that wipes everything immediately.
 *   3. Wipes automatically after a stretch of no interaction — because the real
 *      failure mode isn't someone forgetting to press a button, it's someone
 *      walking away from a screen that still has their story on it.
 *
 * The auto-wipe warns first and counts down. A plan is often read slowly, and
 * silently deleting someone's way out of homelessness because they sat still
 * would be worse than the leak it prevents.
 *
 * Rendered on every page but hidden by CSS outside library mode (see the
 * `yn-library-only` rules in globals.css), which keeps the server and client
 * markup identical and avoids a hydration mismatch.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, Trash2, TimerReset } from "lucide-react";
import {
  WARN_MS,
  clearPatronData,
  hasPatronData,
  idleTimings,
  isLibraryMode,
  syncLibraryAttr,
} from "@/lib/library";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

export default function LibraryMode() {
  const router = useRouter();
  const pathname = usePathname();
  const [confirming, setConfirming] = useState(false);
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(WARN_MS / 1000));
  const lastActivity = useRef(0);

  /**
   * Client-side navigation drops the ?mode=library query string, so re-assert
   * the <html> attribute on every route change. The sticky session flag is
   * what actually carries the mode; this only keeps the DOM honest.
   */
  useEffect(() => {
    syncLibraryAttr();
  }, [pathname]);

  const erase = useCallback(
    (destination: string | null) => {
      clearPatronData();
      setConfirming(false);
      setWarning(false);
      lastActivity.current = Date.now();
      if (destination) router.replace(destination);
    },
    [router],
  );

  // Track interaction. Passive listeners so scrolling stays smooth on the
  // low-powered machines these terminals usually are.
  useEffect(() => {
    if (!isLibraryMode()) return;
    lastActivity.current = Date.now();
    const bump = () => {
      lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, bump));
  }, []);

  // The idle watchdog. Polls rather than juggling timeouts so that a burst of
  // scroll events can't pile up work, and so the countdown stays accurate if
  // the machine sleeps or the tab is backgrounded.
  useEffect(() => {
    if (!isLibraryMode()) return;
    // Resolved once per mount: ?idle=<seconds> can shorten this for a demo.
    const { idleMs, warnMs } = idleTimings();
    const tick = setInterval(() => {
      // Nothing stored means nothing to protect — don't yank a page out from
      // under someone who is only reading the landing page.
      if (!hasPatronData()) {
        setWarning(false);
        return;
      }
      const idle = Date.now() - lastActivity.current;
      if (idle >= idleMs + warnMs) {
        erase("/");
      } else if (idle >= idleMs) {
        setWarning(true);
        setSecondsLeft(Math.max(0, Math.ceil((idleMs + warnMs - idle) / 1000)));
      } else {
        setWarning(false);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [erase]);

  return (
    <div className="yn-library-only no-print">
      {/* standing badge + erase control */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-teal" />
          Private session — nothing is saved to this computer
        </span>
        {confirming ? (
          <div className="glass flex items-center gap-2 rounded-full p-1.5 pl-3">
            <span className="text-sm">Erase everything?</span>
            <button
              onClick={() => erase("/")}
              className="rounded-full bg-rose-500/90 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              Yes, erase
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-full px-3 py-1.5 text-sm text-muted transition hover:text-ink"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-rose-400/50 hover:text-rose-200"
          >
            <Trash2 className="h-4 w-4 text-rose-300" /> Erase &amp; finish
          </button>
        )}
      </div>

      {/* idle warning — announced, focusable, and dismissed by any interaction */}
      {warning && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="yn-idle-title"
          aria-describedby="yn-idle-desc"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
        >
          <div className="glass w-full max-w-md rounded-3xl p-6 text-center">
            <TimerReset className="mx-auto h-8 w-8 text-gold" />
            <h2 id="yn-idle-title" className="mt-3 font-display text-2xl">
              Are you still there?
            </h2>
            <p id="yn-idle-desc" className="mt-2 text-muted">
              To keep your information private on this shared computer, your plan will be erased in{" "}
              <span aria-live="polite" className="font-semibold text-ink">
                {secondsLeft} second{secondsLeft === 1 ? "" : "s"}
              </span>
              . Print it or take a photo if you want to keep it.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <button
                autoFocus
                onClick={() => {
                  lastActivity.current = Date.now();
                  setWarning(false);
                }}
                className="btn-gold rounded-full px-6 py-3 text-base font-semibold"
              >
                I&apos;m still here
              </button>
              <button
                onClick={() => erase("/")}
                className="rounded-full border border-[var(--line)] px-6 py-3 text-base text-muted transition hover:text-ink"
              >
                Erase now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
