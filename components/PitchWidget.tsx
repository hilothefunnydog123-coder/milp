"use client";

/**
 * PitchWidget — a presenter-only floating overlay of the pitch deck, available on
 * every page. Renders /pitch.pdf with PDF.js (offline; worker served from
 * /public). Draggable, resizable, slide-navigable, and it remembers your slide,
 * size, and position across page changes via localStorage. Hidden in print.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Move, Minus, X, Presentation } from "lucide-react";

const LS_PAGE = "yn_deck_page";
const LS_POS = "yn_deck_pos";
const LS_SIZE = "yn_deck_size";
const LS_OPEN = "yn_deck_open";
const LS_MIN = "yn_deck_min";

export default function PitchWidget() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pos, setPos] = useState({ x: 24, y: 84 });
  const [size, setSize] = useState({ w: 320, h: 244 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskRef = useRef<any>(null);
  const pageRef = useRef(1);

  // load persisted state + the PDF
  useEffect(() => {
    try {
      const p = Number(localStorage.getItem(LS_PAGE)); if (p) { setPage(p); pageRef.current = p; }
      if (localStorage.getItem(LS_OPEN) === "0") setOpen(false);
      if (localStorage.getItem(LS_MIN) === "1") setMinimized(true);
      const sp = JSON.parse(localStorage.getItem(LS_POS) || "null"); if (sp) setPos(sp);
      else setPos({ x: Math.max(16, window.innerWidth - 360), y: 84 });
      const ss = JSON.parse(localStorage.getItem(LS_SIZE) || "null"); if (ss?.w) setSize(ss);
    } catch {}
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const pdf = await pdfjs.getDocument({ url: "/pitch.pdf" }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setReady(true);
      } catch {
        /* deck unavailable — widget just won't show */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const render = useCallback(async () => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;
    const wrap = canvas.parentElement;
    const targetW = wrap ? wrap.clientWidth : 300;
    if (targetW < 20) return;
    try {
      if (taskRef.current) { try { taskRef.current.cancel(); } catch {} }
      const pg = await pdf.getPage(pageRef.current);
      const base = pg.getViewport({ scale: 1 });
      const scale = (targetW * (window.devicePixelRatio || 1)) / base.width;
      const vp = pg.getViewport({ scale });
      canvas.width = vp.width;
      canvas.height = vp.height;
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const task = pg.render({ canvasContext: ctx, viewport: vp });
      taskRef.current = task;
      await task.promise;
    } catch { /* render cancelled/failed */ }
  }, []);

  // re-render when ready / page / size / opened
  useEffect(() => { if (ready && open && !minimized) render(); }, [ready, page, size.w, open, minimized, render]);

  function go(delta: number) {
    setPage((p) => {
      const next = Math.min(numPages || 1, Math.max(1, p + delta));
      pageRef.current = next;
      localStorage.setItem(LS_PAGE, String(next));
      return next;
    });
  }

  // drag by the header
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  function dDown(e: React.PointerEvent) { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }
  function dMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setPos({
      x: Math.min(window.innerWidth - 60, Math.max(0, e.clientX - drag.current.dx)),
      y: Math.min(window.innerHeight - 40, Math.max(0, e.clientY - drag.current.dy)),
    });
  }
  function dUp() { if (drag.current) { localStorage.setItem(LS_POS, JSON.stringify(pos)); drag.current = null; } }

  // resize by the corner handle
  const rs = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  function rDown(e: React.PointerEvent) { e.stopPropagation(); rs.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }
  function rMove(e: React.PointerEvent) {
    if (!rs.current) return;
    setSize({
      w: Math.min(window.innerWidth * 0.92, Math.max(220, rs.current.w + (e.clientX - rs.current.x))),
      h: Math.min(window.innerHeight * 0.92, Math.max(170, rs.current.h + (e.clientY - rs.current.y))),
    });
  }
  function rUp() { if (rs.current) { localStorage.setItem(LS_SIZE, JSON.stringify(size)); rs.current = null; } }

  function setOpenP(v: boolean) { setOpen(v); localStorage.setItem(LS_OPEN, v ? "1" : "0"); }
  function setMinP(v: boolean) { setMinimized(v); localStorage.setItem(LS_MIN, v ? "1" : "0"); }

  if (!ready) return null;

  if (!open) {
    return (
      <button onClick={() => setOpenP(true)} className="no-print fixed bottom-5 right-5 z-[70] inline-flex items-center gap-2 rounded-full btn-gold px-4 py-2.5 text-sm shadow-lg">
        <Presentation className="h-4 w-4" /> Deck
      </button>
    );
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowLeft") go(-1); if (e.key === "ArrowDown" || e.key === "ArrowRight") go(1); }}
      style={{ left: pos.x, top: pos.y, width: size.w, height: minimized ? undefined : size.h }}
      className="no-print fixed z-[70] flex select-none flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[#0c1322] shadow-2xl outline-none"
    >
      {/* header / drag handle */}
      <div onPointerDown={dDown} onPointerMove={dMove} onPointerUp={dUp} className="flex cursor-grab items-center gap-2 border-b border-[var(--line)] bg-white/5 px-3 py-2 active:cursor-grabbing">
        <Move className="h-3.5 w-3.5 text-muted" />
        <span className="text-xs font-semibold text-ink">Pitch deck</span>
        <span className="ml-1 text-xs text-muted">{page}/{numPages || "–"}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setMinP(!minimized)} aria-label="Minimize" className="rounded p-1 text-muted hover:text-ink"><Minus className="h-3.5 w-3.5" /></button>
          <button onClick={() => setOpenP(false)} aria-label="Close" className="rounded p-1 text-muted hover:text-ink"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
            <canvas ref={canvasRef} className="max-h-full max-w-full" />
            <button onClick={() => go(-1)} disabled={page <= 1} aria-label="Previous slide" className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition hover:bg-black/80 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
            <button onClick={() => go(1)} disabled={page >= numPages} aria-label="Next slide" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition hover:bg-black/80 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--line)] bg-white/5 px-2 py-1.5">
            <button onClick={() => go(-1)} disabled={page <= 1} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-ink hover:bg-white/10 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /> Prev</button>
            <span className="text-[10px] text-muted">{page} / {numPages || "–"}</span>
            <button onClick={() => go(1)} disabled={page >= numPages} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-ink hover:bg-white/10 disabled:opacity-30">Next <ChevronDown className="h-3.5 w-3.5" /></button>
          </div>
          {/* resize handle */}
          <div onPointerDown={rDown} onPointerMove={rMove} onPointerUp={rUp} className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize" style={{ background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.4) 50%)" }} aria-label="Resize" />
        </>
      )}
    </div>
  );
}
