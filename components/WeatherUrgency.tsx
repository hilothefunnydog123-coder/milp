"use client";

/**
 * Weather-aware urgency. Geocodes the user's location and checks live conditions
 * via Open-Meteo (free, no key). If it's cold or wet tonight, it surfaces an
 * urgent "get inside" alert — situational intelligence that can matter a lot for
 * someone sleeping outside. Renders nothing when conditions are mild.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CloudRain, Snowflake, ThermometerSnowflake, PhoneCall } from "lucide-react";
import { store } from "@/lib/library";

interface W { temp: number; wet: boolean; snow: boolean }

export default function WeatherUrgency({ location }: { location: string }) {
  const [w, setW] = useState<W | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // prefer the exact coordinates of the place the user picked
        let lat: number, lng: number;
        const stored = (() => {
          try { const s = JSON.parse(store.get("yn_coords") || "null"); return s && typeof s.lat === "number" ? (s as { lat: number; lng: number }) : null; } catch { return null; }
        })();
        if (stored) {
          lat = stored.lat; lng = stored.lng;
        } else {
          const g = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(location)}&limit=1`).then((r) => r.json());
          const c = g?.features?.[0]?.geometry?.coordinates;
          if (!c) return;
          lng = c[0]; lat = c[1];
        }
        const wx = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,weather_code&temperature_unit=fahrenheit`
        ).then((r) => r.json());
        const cur = wx?.current;
        if (!cur || cancelled) return;
        const code = cur.weather_code ?? 0;
        const temp = Math.round(cur.temperature_2m);
        const snow = [71, 73, 75, 77, 85, 86].includes(code);
        const wet = cur.precipitation > 0 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || snow;
        // only alert when it genuinely matters
        if (temp <= 42 || wet) setW({ temp, wet, snow });
      } catch { /* hide on failure */ }
    })();
    return () => { cancelled = true; };
  }, [location]);

  if (!w) return null;

  const Icon = w.snow ? Snowflake : w.wet ? CloudRain : ThermometerSnowflake;
  const cond = w.snow ? "snowing" : w.wet ? "raining" : "cold";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-2xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 p-4"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--rose)]" />
        <div>
          <div className="font-semibold">It&apos;s {w.temp}°F and {cond} near {location} right now.</div>
          <p className="mt-1 text-sm text-muted">
            Getting inside tonight matters. Call{" "}
            <a href="tel:211" className="font-semibold text-ink underline-offset-2 hover:underline">211</a>{" "}
            and ask for the nearest <span className="text-ink">open or warming shelter</span> — or have YNorth call for you below.
          </p>
        </div>
        <a href="tel:211" className="ml-auto hidden shrink-0 items-center gap-1.5 rounded-full bg-[var(--rose)]/20 px-3 py-1.5 text-sm font-semibold text-[var(--rose)] sm:inline-flex">
          <PhoneCall className="h-3.5 w-3.5" /> 211
        </a>
      </div>
    </motion.div>
  );
}
