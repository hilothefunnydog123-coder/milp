"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPinned, Loader2 } from "lucide-react";
import type { LocalResource } from "@/lib/types";
import type { Pin } from "./MapInner";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => <div className="flex h-[380px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>,
});

export default function ShelterMap({ location, resources = [] }: { location: string; resources?: LocalResource[] }) {
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Geocode in the browser (Photon -> Nominatim) so it works on any network.
    async function geo(q: string): Promise<Pin | null> {
      try {
        const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`);
        const j = await r.json();
        const f = j?.features?.[0];
        if (f?.geometry?.coordinates) {
          const [lng, lat] = f.geometry.coordinates;
          const p = f.properties || {};
          const address = [p.name, [p.housenumber, p.street].filter(Boolean).join(" "), p.city, p.state].filter(Boolean).join(", ") || q;
          return { name: p.name || q, address, lat, lng };
        }
      } catch { /* fall through */ }
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`);
        const hit = (await r.json())?.[0];
        if (hit) return { name: q, address: hit.display_name, lat: +hit.lat, lng: +hit.lon };
      } catch { /* give up */ }
      return null;
    }

    (async () => {
      const c = await geo(location);
      if (cancelled) return;
      setCenter(c ? { lat: c.lat, lng: c.lng } : null);
      const ps: Pin[] = [];
      for (const r of resources.slice(0, 6)) {
        const g = await geo(`${r.name}, ${location}`);
        if (g) ps.push({ name: r.name, address: g.address, lat: g.lat, lng: g.lng });
      }
      if (ps.length === 0) {
        const g = await geo(`homeless shelter, ${location}`);
        if (g) ps.push({ name: "Nearby shelter", address: g.address, lat: g.lat, lng: g.lng });
      }
      if (!cancelled) { setPins(ps); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [location, resources]);

  if (!loading && !center) return null; // couldn't place the map — hide gracefully

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2">
        <MapPinned className="h-5 w-5 text-gold" />
        <h3 className="text-lg">Help on the map, near {location}</h3>
      </div>
      <p className="mt-1 text-sm text-muted">Hover or tap a glowing point to see the shelter&apos;s name and address.</p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] glow-gold">
        {loading || !center ? (
          <div className="flex h-[380px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
        ) : (
          <MapInner center={center} pins={pins} />
        )}
      </div>
      {/* accessible, screen-reader-friendly list of the same points */}
      {pins.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {pins.map((p, i) => (
            <li key={i}><span className="text-ink">{p.name}</span> — {p.address}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
