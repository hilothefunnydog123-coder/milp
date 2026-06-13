"use client";

/**
 * Location autocomplete — forces a SPECIFIC place so ambiguous city names
 * (San Jose, CA vs San José, Costa Rica) can't slip through. Suggestions come
 * from Photon (OpenStreetMap, free/no-key) and carry exact coordinates, which we
 * hand downstream so the map / weather / research all use the right place.
 */

import { useEffect, useRef, useState } from "react";
import { MapPin, Check, Loader2 } from "lucide-react";

interface Place { label: string; lat: number; lng: number }

export default function LocationAutocomplete({
  value,
  picked,
  onPick,
  onType,
}: {
  value: string;
  picked: boolean;
  onPick: (label: string, lat: number, lng: number) => void;
  onType: (text: string) => void;
}) {
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // debounced search
  useEffect(() => {
    if (picked || value.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&lang=en&limit=6&osm_tag=place`);
        const j = await r.json();
        const seen = new Set<string>();
        const places: Place[] = [];
        for (const f of j.features || []) {
          const p = f.properties || {};
          const c = f.geometry?.coordinates;
          if (!p.name || !c) continue;
          const label = [p.name, p.state, p.country].filter(Boolean).join(", ");
          if (seen.has(label)) continue;
          seen.add(label);
          places.push({ label, lat: c[1], lng: c[0] });
        }
        setResults(places);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [value, picked]);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={value}
          onChange={(e) => { onType(e.target.value); setOpen(true); }}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Start typing a city…"
          className="mt-0 w-full rounded-xl border border-[var(--line)] bg-white/5 px-4 py-3 pl-10 pr-9 outline-none focus:border-gold/60"
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />}
        {picked && !loading && <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-teal" />}
      </div>

      {open && !picked && (results.length > 0 || value.trim().length >= 2) && (
        <ul className="glass absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl p-1.5 text-sm">
          {results.map((p, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => { onPick(p.label, p.lat, p.lng); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition hover:bg-gold/10"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" /> {p.label}
              </button>
            </li>
          ))}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2.5 text-muted">No matches — keep typing the city and country.</li>
          )}
        </ul>
      )}
      {!picked && value.trim().length >= 2 && (
        <p className="mt-1.5 text-xs text-gold/80">Pick your exact city from the list so we find the right place.</p>
      )}
    </div>
  );
}
