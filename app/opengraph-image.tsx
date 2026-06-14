import { ImageResponse } from "next/og";

export const alt = "YNorth — Find your way home";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 18%, #18223a 0%, #0a0e17 60%)",
          color: "#eef1f6",
          fontFamily: "serif",
        }}
      >
        <div style={{ fontSize: 130, color: "#f3b85f", lineHeight: 1 }}>★</div>
        <div style={{ fontSize: 88, fontWeight: 700, marginTop: 18 }}>YNorth</div>
        <div style={{ fontSize: 44, color: "#e8b873", marginTop: 6 }}>Find your way home.</div>
        <div style={{ fontSize: 26, color: "#9aa6bf", marginTop: 30, maxWidth: 820, textAlign: "center" }}>
          A compass out of homelessness — researched, called, and walked with you.
        </div>
      </div>
    ),
    { ...size }
  );
}
