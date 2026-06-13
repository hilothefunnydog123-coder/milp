// ============================================================================
// Geocoding for the shelter map. Uses OpenStreetMap Nominatim (free, no key).
// Runs server-side to avoid browser CORS + to send a proper User-Agent.
// Center (the user's city) almost always resolves, so the map is never broken;
// resource pins + a generic shelter fallback are best-effort bonuses.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

interface Geo { lat: number; lng: number; address: string }
const cache = new Map<string, Geo | null>();

// Try Photon (free, no key, lenient) first, then Nominatim as a fallback.
async function viaPhoton(q: string): Promise<Geo | null> {
  const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`);
  if (!r.ok) return null;
  const j = await r.json();
  const f = j?.features?.[0];
  if (!f?.geometry?.coordinates) return null;
  const [lng, lat] = f.geometry.coordinates;
  const p = f.properties || {};
  const address = [p.name, [p.housenumber, p.street].filter(Boolean).join(" "), p.city, p.state]
    .filter(Boolean).join(", ") || q;
  return { lat, lng, address };
}

async function viaNominatim(q: string): Promise<Geo | null> {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
    headers: { "User-Agent": "YNorth/1.0 (housing-resource map; hackathon project)" },
  });
  if (!r.ok) return null;
  const hit = (await r.json())?.[0];
  return hit ? { lat: +hit.lat, lng: +hit.lon, address: String(hit.display_name || q) } : null;
}

async function geocode(q: string): Promise<Geo | null> {
  const key = q.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  let geo: Geo | null = null;
  try { geo = await viaPhoton(q); } catch { /* try fallback */ }
  if (!geo) { try { geo = await viaNominatim(q); } catch { /* give up */ } }
  cache.set(key, geo);
  return geo;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const location = String(body.location || "").slice(0, 80);
  const resources: { name: string }[] = Array.isArray(body.resources) ? body.resources.slice(0, 6) : [];
  if (!location) return NextResponse.json({ center: null, pins: [] });

  const center = await geocode(location);

  // Best-effort: geocode each named resource within the city.
  const pins: { name: string; address: string; lat: number; lng: number }[] = [];
  for (const r of resources) {
    if (!r?.name) continue;
    const g = await geocode(`${r.name}, ${location}`);
    if (g) pins.push({ name: r.name, address: g.address, lat: g.lat, lng: g.lng });
  }

  // Fallback so the map shows real shelters even without grounded resources.
  if (pins.length === 0) {
    for (const q of [`homeless shelter, ${location}`, `emergency shelter near ${location}`]) {
      const g = await geocode(q);
      if (g) pins.push({ name: "Nearby shelter", address: g.address, lat: g.lat, lng: g.lng });
    }
  }

  return NextResponse.json({ center, pins });
}
