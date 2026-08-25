"use client";

/**
 * /preview — a phone-framed, auto-playing walkthrough of the REAL site.
 * It loads YNorth in an iframe (same-origin) and gently drives it: scroll the
 * landing, run the live demo, scroll the generated plan, then loop. A true,
 * working preview — perfect to hand a judge or drop in a pitch.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Compass, ExternalLink, Pause, Play, RotateCcw } from "lucide-react";
import { routes } from "@/lib/routes";

export default function Preview() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const playing = useRef(true);
  const stopped = useRef(false);
  const [paused, setPaused] = useState(false);
  const [tourKey, setTourKey] = useState(0);

  useEffect(() => {
    stopped.current = false;
    const frame = frameRef.current;
    if (!frame) return;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const win = () => frame.contentWindow as Window | null;
    const docEl = () => frame.contentDocument?.documentElement;

    async function untilResumed() { while (!playing.current && !stopped.current) await sleep(150); }

    async function smoothScroll(toY: number, dur: number) {
      const w = win(); if (!w) return;
      const startY = w.scrollY; const startT = performance.now();
      await new Promise<void>((res) => {
        const tick = (t: number) => {
          if (stopped.current) return res();
          if (!playing.current) { requestAnimationFrame(tick); return; }
          const p = Math.min(1, (t - startT) / dur);
          const eased = 0.5 - 0.5 * Math.cos(p * Math.PI);
          w.scrollTo(0, startY + (toY - startY) * eased);
          if (p < 1) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
    }
    const maxScroll = () => { const d = docEl(); const w = win(); return d && w ? d.scrollHeight - w.innerHeight : 0; };
    const waitLoad = () => new Promise<void>((res) => { const h = () => { frame.removeEventListener("load", h); res(); }; frame.addEventListener("load", h); });
    // Route strings come from lib/routes so the tour can't drive to a page or
    // a query flag that no longer exists.
    const nav = (url: string) => { frame.src = url; return waitLoad(); };
    async function waitPath(path: string, timeout = 38000) {
      const t0 = Date.now();
      while (!stopped.current && Date.now() - t0 < timeout) {
        try { if (win()?.location.pathname === path) return true; } catch {}
        await sleep(400);
      }
      return false;
    }

    (async function tour() {
      while (!stopped.current) {
        await nav(routes.home()); if (stopped.current) break;
        await sleep(1400); await untilResumed();
        await smoothScroll(maxScroll(), 12000); if (stopped.current) break;
        await sleep(900); await untilResumed();
        await nav(routes.start({ demo: true })); if (stopped.current) break;
        await waitPath(routes.path()); if (stopped.current) break;
        await sleep(1800); await untilResumed();
        await smoothScroll(maxScroll(), 17000); if (stopped.current) break;
        await sleep(1500);
      }
    })();

    return () => { stopped.current = true; };
  }, [tourKey]);

  function togglePause() { playing.current = !playing.current; setPaused(!playing.current); }
  function restart() { stopped.current = true; playing.current = true; setPaused(false); setTimeout(() => setTourKey((k) => k + 1), 60); }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="mb-7 text-center">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold">
          <Compass className="h-5 w-5 text-gold" /> Y<span className="warm-text">North</span>
        </div>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl">A live walkthrough</h1>
        <p className="mt-2 text-sm text-muted">The real site, touring itself — no edits, no mockups.</p>
      </div>

      {/* phone frame */}
      <div className="relative" style={{ filter: "drop-shadow(0 30px 60px rgba(232,184,115,0.25))" }}>
        <div className="rounded-[44px] border border-white/15 bg-[#05070c] p-3 shadow-2xl">
          <div className="relative h-[720px] w-[348px] overflow-hidden rounded-[34px] bg-black">
            {/* notch */}
            <div className="absolute left-1/2 top-2 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-[#05070c]" />
            <iframe
              ref={frameRef}
              title="YNorth live preview"
              src="/"
              className="h-full w-full border-0"
            />
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="mt-7 flex items-center gap-3">
        <button onClick={togglePause} className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-ink transition hover:border-gold/50">
          {paused ? <Play className="h-4 w-4 text-gold" /> : <Pause className="h-4 w-4 text-gold" />} {paused ? "Play" : "Pause"}
        </button>
        <button onClick={restart} className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-ink transition hover:border-gold/50">
          <RotateCcw className="h-4 w-4 text-gold" /> Restart
        </button>
        <Link href="/" className="btn-gold inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm">
          Open full site <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted">Tip: you can also tap and scroll inside the phone yourself.</p>
    </main>
  );
}
