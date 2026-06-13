"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Compass, RotateCcw } from "lucide-react";
import CompassView from "@/components/CompassView";
import type { CompassPath } from "@/lib/types";

export default function PathPage() {
  const router = useRouter();
  const [path, setPath] = useState<CompassPath | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("yn_path");
      if (raw) setPath(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && !path) router.replace("/start");
  }, [ready, path, router]);

  if (!path) return null;

  return (
    <main className="min-h-screen">
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Compass className="h-5 w-5 text-gold" /> Y<span className="warm-text">North</span>
        </Link>
        <Link href="/start" className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
          <RotateCcw className="h-4 w-4" /> Start over
        </Link>
      </nav>
      <CompassView path={path} />
    </main>
  );
}
