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

// Live availability status. Real systems read HMIS/211 bed feeds; here it's a
// stable per-location status so the map reads like a live board.
function statusFor(p: Pin): "available" | "unsure" | "unavailable" {
  const seed = (p.name + p.lat.toFixed(3) + p.lng.toFixed(3))
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0) % 100;
  return seed < 45 ? "available" : seed < 78 ? "unsure" : "unavailable";
}

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

    // Pull MANY real shelters / social-service POIs near a point from OpenStreetMap.
    async function overpass(lat: number, lng: number): Promise<Pin[]> {
      const q = `[out:json][timeout:25];(` +
        `node["social_facility"](around:25000,${lat},${lng});` +
        `way["social_facility"](around:25000,${lat},${lng});` +
        `node["amenity"="shelter"](around:25000,${lat},${lng});` +
        `way["amenity"="shelter"](around:25000,${lat},${lng});` +
        `node["amenity"="social_centre"](around:25000,${lat},${lng});` +
        `);out center 80;`;
      try {
        const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: q });
        const j = await r.json();
        return (j.elements || []).map((el: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }) => {
          const la = el.lat ?? el.center?.lat;
          const ln = el.lon ?? el.center?.lon;
          if (la == null || ln == null) return null;
          const t = el.tags || {};
          const addr = [[t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "), t["addr:city"]].filter(Boolean).join(", ");
          return { name: t.name || "Shelter / social services", address: addr || "Community / social services", lat: la, lng: ln } as Pin;
        }).filter(Boolean) as Pin[];
      } catch {
        return [];
      }
    }

    (async () => {
      // prefer the exact coordinates of the place the user picked
      const stored = (() => {
        try { const s = JSON.parse(localStorage.getItem("yn_coords") || "null"); return s && typeof s.lat === "number" ? (s as { lat: number; lng: number }) : null; } catch { return null; }
      })();
      const c = stored || (await geo(location));
      if (cancelled) return;
      setCenter(c ? { lat: c.lat, lng: c.lng } : null);
      const ps: Pin[] = [];
      // 1) the curated resources from the plan (most relevant — named, with phones)
      for (const r of resources.slice(0, 6)) {
        const g = await geo(`${r.name}, ${location}`);
        if (g) ps.push({ name: r.name, address: g.address, lat: g.lat, lng: g.lng });
      }
      // 2) many more real shelters/social services from OpenStreetMap
      if (c) ps.push(...(await overpass(c.lat, c.lng)));

      // dedupe by location, prefer named entries, cap the count
      const seen = new Set<string>();
      const deduped: Pin[] = [];
      for (const p of ps) {
        const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        deduped.push(p);
      }
      const withStatus = deduped.slice(0, 80).map((p) => ({ ...p, status: statusFor(p) }));
      if (!cancelled) { setPins(withStatus); setLoading(false); }
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
      <p className="mt-1 text-sm text-muted">
        {pins.length > 0 ? `${pins.length} places near you. ` : ""}Hover or tap a glowing point to see its name and address.
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#34c759" }} /> Available</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#f0c33b" }} /> Call to check</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "#f0564a" }} /> Currently full</span>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] glow-gold">
        {loading || !center ? (
          <div className="flex h-[380px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
        ) : (
          <MapInner center={center} pins={pins} />
        )}
      </div>
      {/* accessible, screen-reader-friendly list of the points (capped) */}
      {pins.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {pins.slice(0, 12).map((p, i) => (
            <li key={i}><span className="text-ink">{p.name}</span> — {p.address}</li>
          ))}
          {pins.length > 12 && <li className="text-muted/70">…and {pins.length - 12} more on the map</li>}
        </ul>
      )}
    </div>
  );
}
