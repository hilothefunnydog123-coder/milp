"use client";

import { useEffect, useState } from "react";
import { animate } from "framer-motion";

export default function AnimatedNumber({
  value,
  duration = 1.4,
  delay = 0,
}: {
  value: number;
  duration?: number;
  delay?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration, delay]);
  return <>{display}</>;
}
