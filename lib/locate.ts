// ============================================================================
// "Where is this person, exactly?" — asked in one place instead of two.
//
// The map and the weather alert both need coordinates, and both used to inline
// the same fallback chain: read the picked place out of localStorage, else
// geocode the label. Written twice, it drifted twice; written here, it returns
// `Coords | null` — a checked pair, or nothing — and both callers get the same
// answer to the same question.
// ============================================================================

import { geocodeViaPhoton, nominatimResponseSchema, nominatimUrl } from "./external";
import { fetchJson } from "./fetch";
import { toCoords, type Coords } from "./brand";
import { read } from "./storage";

/** Exact coordinates for the place the person picked, if we stored them. */
function pickedCoords(): Coords | null {
  return read("coords");
}

/** The picked place if we have it, otherwise whatever the label geocodes to. */
export async function coordsFor(location: string): Promise<Coords | null> {
  const stored = pickedCoords();
  if (stored) return stored;
  if (!location.trim()) return null;

  const photon = await geocodeViaPhoton(location);
  if (photon.ok) {
    const feature = photon.value.features[0];
    const pair = feature?.geometry?.coordinates;
    const lng = pair?.[0];
    const lat = pair?.[1];
    if (lat !== undefined && lng !== undefined) {
      const coords = toCoords(lat, lng);
      if (coords) return coords;
    }
  }

  const nominatim = await fetchJson(nominatimUrl(location), nominatimResponseSchema);
  const hit = nominatim.ok ? nominatim.value[0] : undefined;
  return hit ? toCoords(hit.lat, hit.lon) : null;
}
