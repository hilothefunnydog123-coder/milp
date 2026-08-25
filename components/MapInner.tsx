"use client";

// The actual Leaflet map (client-only; imported via dynamic(ssr:false)).
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AVAILABILITY_LABEL, type Availability, type MapPin } from "@/lib/types";
import type { Coords } from "@/lib/brand";

const icon = (cls: string, size = 20) =>
  L.divIcon({ className: "", html: `<div class="yn-pin ${cls}"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

const ICONS: Record<Availability, L.DivIcon> = {
  available: icon("yn-pin-green"),
  unsure: icon("yn-pin-yellow"),
  unavailable: icon("yn-pin-red"),
};
const youIcon = icon("yn-pin-you", 22);

export default function MapInner({ center, pins }: { center: Coords; pins: MapPin[] }) {
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
              <br /><span style={{ opacity: 0.85 }}>{AVAILABILITY_LABEL[status]}</span>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
