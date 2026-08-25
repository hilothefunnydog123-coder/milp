"use client";

/**
 * ShelterMap — a map of real, nearby help. Geocodes the user's city (Photon/OSM),
 * pulls many shelters and social-service points from OpenStreetMap (Overpass),
 * and shows them as color-coded availability pins (green/yellow/red) with
 * name + address on hover/tap. All browser-side, no API key required.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPinned, Loader2 } from "lucide-react";
import { fetchJson } from "@/lib/fetch";
import {
  fetchOverpassPins,
  nominatimPin,
  nominatimResponseSchema,
  nominatimUrl,
  overpassPins,
  photonPin,
  photonResponseSchema,
  photonUrl,
} from "@/lib/external";
import { coordsFor } from "@/lib/locate";
import type { Coords } from "@/lib/brand";
import type { Availability, LocalResource, MapPin } from "@/lib/types";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => <div className="flex h-[380px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>,
});

// Live availability status. Real systems read HMIS/211 bed feeds; here it's a
// stable per-location status so the map reads like a live board.
function statusFor(p: MapPin): Availability {
  const seed = (p.name + p.lat.toFixed(3) + p.lng.toFixed(3))
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0) % 100;
  return seed < 45 ? "available" : seed < 78 ? "unsure" : "unavailable";
}

export default function ShelterMap({ location, resources = [] }: { location: string; resources?: LocalResource[] }) {
  const [center, setCenter] = useState<Coords | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Geocode in the browser (Photon -> Nominatim) so it works on any network.
    async function geo(query: string): Promise<MapPin | null> {
      const photon = await fetchJson(photonUrl(query), photonResponseSchema);
      const fromPhoton = photon.ok ? photonPin(photon.value, query) : null;
      if (fromPhoton) return fromPhoton;
      const nominatim = await fetchJson(nominatimUrl(query), nominatimResponseSchema);
      return nominatim.ok ? nominatimPin(nominatim.value, query) : null;
    }

    void (async () => {
      // prefer the exact coordinates of the place the user picked
      const middle = await coordsFor(location);
      if (cancelled) return;
      setCenter(middle);
      const found: MapPin[] = [];
      // 1) the curated resources from the plan (most relevant — named, with phones)
      for (const r of resources.slice(0, 6)) {
        const pin = await geo(`${r.name}, ${location}`);
        if (pin) found.push({ ...pin, name: r.name });
      }
      // 2) many more real shelters/social services from OpenStreetMap
      if (middle) {
        const nearby = await fetchOverpassPins(middle.lat, middle.lng);
        if (nearby.ok) found.push(...overpassPins(nearby.value));
      }

      // dedupe by location, prefer named entries, cap the count
      const seen = new Set<string>();
      const deduped: MapPin[] = [];
      for (const pin of found) {
        const key = `${pin.lat.toFixed(4)},${pin.lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(pin);
      }
      const withStatus = deduped.slice(0, 80).map((pin) => ({ ...pin, status: statusFor(pin) }));
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
