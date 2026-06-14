"use client";

// The actual Leaflet map (client-only; imported via dynamic(ssr:false)).
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type Availability = "available" | "unsure" | "unavailable";
export interface Pin { name: string; address: string; lat: number; lng: number; status?: Availability }

const icon = (cls: string, size = 20) =>
  L.divIcon({ className: "", html: `<div class="yn-pin ${cls}"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

const ICONS: Record<Availability, L.DivIcon> = {
  available: icon("yn-pin-green"),
  unsure: icon("yn-pin-yellow"),
  unavailable: icon("yn-pin-red"),
};
const youIcon = icon("yn-pin-you", 22);

const STATUS_LABEL: Record<Availability, string> = {
  available: "Available now",
  unsure: "Availability unknown — call to check",
  unavailable: "Currently full",
};

export default function MapInner({ center, pins }: { center: { lat: number; lng: number }; pins: Pin[] }) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      scrollWheelZoom={false}
      style={{ height: "380px", width: "100%", background: "#0a0e17" }}
      attributionControl={false}
    >
      {/* dark "HUD" basemap — free, no API key (CARTO dark) */}
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

      <Marker position={[center.lat, center.lng]} icon={youIcon} eventHandlers={{ click: (e) => e.target.openTooltip() }}>
        <Tooltip direction="top" offset={[0, -8]} className="yn-tip">
          <strong>You are here</strong>
          <br />Your area
        </Tooltip>
      </Marker>

      {pins.map((p, i) => {
        const status = p.status ?? "unsure";
        return (
          <Marker key={i} position={[p.lat, p.lng]} icon={ICONS[status]} eventHandlers={{ click: (e) => e.target.openTooltip() }}>
            <Tooltip direction="top" offset={[0, -8]} className="yn-tip">
              <strong>{p.name}</strong>
              <br />{p.address}
              <br /><span style={{ opacity: 0.85 }}>{STATUS_LABEL[status]}</span>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
