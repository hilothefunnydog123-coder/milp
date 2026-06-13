"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, HeartHandshake } from "lucide-react";
import CompassView from "@/components/CompassView";
import type { CompassPath } from "@/lib/types";

export default function SharePage() {
  const [path, setPath] = useState<CompassPath | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) return setError(true);
      const json = decodeURIComponent(atob(hash));
      setPath(JSON.parse(json));
    } catch {
      setError(true);
    }
  }, []);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Compass className="h-10 w-10 text-gold" />
        <p className="text-xl">This shared link looks incomplete.</p>
        <Link href="/" className="btn-gold rounded-full px-6 py-3">Go to YNorth</Link>
      </main>
    );
  }
  if (!path) return null;

  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Compass className="h-5 w-5 text-gold" /> Y<span className="warm-text">North</span>
        </Link>
      </nav>
      <div className="mx-auto max-w-2xl px-6">
        <div className="glass flex items-start gap-3 rounded-2xl p-4">
          <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
          <p className="text-sm text-muted">
            Someone shared their path with you so you can help them move forward. Here&apos;s
            exactly where they are and what they&apos;re working toward.
          </p>
        </div>
      </div>
      <CompassView path={path} readOnly />
    </main>
  );
}
