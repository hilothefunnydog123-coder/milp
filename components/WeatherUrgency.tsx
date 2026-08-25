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
import { coordsFor } from "@/lib/locate";
import { fetchWeather, isUrgentWeather, readWeather, type WeatherReading } from "@/lib/external";

export default function WeatherUrgency({ location }: { location: string }) {
  const [w, setW] = useState<WeatherReading | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // prefer the exact coordinates of the place the user picked
      const coords = await coordsFor(location);
      if (!coords || cancelled) return;
      const forecast = await fetchWeather(coords.lat, coords.lng);
      if (!forecast.ok || cancelled) return;
      const reading = readWeather(forecast.value);
      // only alert when it genuinely matters
      if (isUrgentWeather(reading)) setW(reading);
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
