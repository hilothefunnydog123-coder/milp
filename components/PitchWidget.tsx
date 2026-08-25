"use client";

/**
 * PitchWidget — a presenter-only floating overlay of the pitch deck, available on
 * every page. Renders /pitch.pdf with PDF.js (offline; worker served from
 * /public). Draggable, resizable, slide-navigable, and it remembers your slide,
 * size, and position across page changes via localStorage. Hidden in print.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronUp, ChevronDown, Move, Minus, X, Presentation } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { read, write } from "@/lib/storage";

export default function PitchWidget() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pos, setPos] = useState({ x: 24, y: 84 });
  const [size, setSize] = useState({ w: 320, h: 244 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // PDF.js ships its own types — `PDFDocumentProxy` and `RenderTask` say
  // exactly what `getPage`, `getViewport` and `render` accept and return, so
  // the two `any` refs that used to live here are gone.
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const taskRef = useRef<RenderTask | null>(null);
  const pageRef = useRef(1);

  // load persisted state + the PDF
  useEffect(() => {
    const storedPage = read("deckPage");
    setPage(storedPage);
    pageRef.current = storedPage;
    setOpen(read("deckOpen"));
    setMinimized(read("deckMinimized"));
    const storedPos = read("deckPosition");
    setPos(storedPos ?? { x: Math.max(16, window.innerWidth - 360), y: 84 });
    const storedSize = read("deckSize");
    if (storedSize) setSize(storedSize);

    let cancelled = false;
    void (async () => {
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
      taskRef.current?.cancel();
      const pg = await pdf.getPage(pageRef.current);
      const base = pg.getViewport({ scale: 1 });
      const scale = (targetW * (window.devicePixelRatio || 1)) / base.width;
      const vp = pg.getViewport({ scale });
      canvas.width = vp.width;
      canvas.height = vp.height;
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      // PDF.js v6 renders into the canvas itself; passing only a 2D context is
      // the deprecated path (and, per its types, no longer a complete request).
      const task = pg.render({ canvas, viewport: vp });
      taskRef.current = task;
      await task.promise;
    } catch { /* render cancelled/failed */ }
  }, []);

  // re-render when ready / page / size / opened
  useEffect(() => { if (ready && open && !minimized) void render(); }, [ready, page, size.w, open, minimized, render]);

  function go(delta: number) {
    setPage((p) => {
      const next = Math.min(numPages || 1, Math.max(1, p + delta));
      pageRef.current = next;
      write("deckPage", next);
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
  function dUp() { if (drag.current) { write("deckPosition", pos); drag.current = null; } }

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
  function rUp() { if (rs.current) { write("deckSize", size); rs.current = null; } }

  function setOpenP(v: boolean) { setOpen(v); write("deckOpen", v); }
  function setMinP(v: boolean) { setMinimized(v); write("deckMinimized", v); }

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
