"use client";

// Makes all Framer Motion animations honor the user's "reduce motion" OS setting.
import { MotionConfig } from "framer-motion";

export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
