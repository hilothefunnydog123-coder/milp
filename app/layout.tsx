import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Judgemynt — The Credential for the AI Era",
  description:
    "Resumes are dead. Prove you can detect what AI gets wrong, direct it to fix it, and earn a credential employers can trust. A degree in 10 minutes.",
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain">
        <div className="aurora" />
        <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
      </body>
    </html>
  );
}
