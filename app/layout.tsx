import type { Metadata } from "next";
import "./globals.css";
import AccessibilityToggle from "@/components/AccessibilityToggle";
import MotionProvider from "@/components/MotionProvider";

export const metadata: Metadata = {
  title: "YNorth — Find your way home",
  description:
    "The path out of homelessness is an invisible maze. YNorth turns it into a clear, dignified, step-by-step path you own — pointing you toward stable housing, one step at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="stars">
        <div className="sky" />
        <div className="northstar" />
        <MotionProvider>
          <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
          <AccessibilityToggle />
        </MotionProvider>
      </body>
    </html>
  );
}
