"use client";

// The actual Leaflet map (client-only; imported via dynamic(ssr:false)).
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface Pin { name: string; address: string; lat: number; lng: number }

const shelterIcon = L.divIcon({ className: "", html: '<div class="yn-pin"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });
const youIcon = L.divIcon({ className: "", html: '<div class="yn-pin yn-pin-you"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });

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

      <Marker position={[center.lat, center.lng]} icon={youIcon}>
        <Tooltip direction="top" offset={[0, -8]} className="yn-tip">
          <strong>You are here</strong>
          <br />Your area
        </Tooltip>
      </Marker>

      {pins.map((p, i) => (
        <Marker key={i} position={[p.lat, p.lng]} icon={shelterIcon}>
          <Tooltip direction="top" offset={[0, -8]} className="yn-tip">
            <strong>{p.name}</strong>
            <br />{p.address}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
