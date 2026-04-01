"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FireLocation } from "@/lib/types";
import { MAP_CONFIG } from "@/lib/constants";

interface LocationMapProps {
  latitude: number;
  longitude: number;
  fireLocations?: FireLocation[];
}

export default function LocationMap({
  latitude,
  longitude,
  fireLocations = [],
}: LocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    console.log("🔥 fireLocations changed:", fireLocations);
  }, [fireLocations]);
  
  
  // ✅ INIT MAP ONLY ONCE
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map("map").setView(
      [latitude, longitude],
      MAP_CONFIG.DEFAULT_ZOOM
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersRef.current = layer;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);


  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    const map = mapRef.current;
    const layer = markersRef.current;

    // 🧹 clear old markers
    layer.clearLayers();

    // 👤 user icon
    const userIcon = L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
      iconSize: [30, 30],
      iconAnchor: [15, 30],
    });

    // 🔥 fire icon
    const fireIcon = L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/785/785116.png",
      iconSize: [35, 41],
      iconAnchor: [17, 41],
    });

    // ✅ ALWAYS show user
    L.marker([latitude, longitude], { icon: userIcon })
      .addTo(layer)
      .bindPopup("📍 Your Location");

    // 🔥 fire markers
    fireLocations.forEach((fire) => {
      if (fire.severity === "high") {
        L.marker([fire.lat, fire.lng], { icon: fireIcon })
          .addTo(layer)
          .bindPopup("🔥 Fire Detected");
      }
    });

    // ✅ smart map movement (NO CRASH)
    if (fireLocations.length > 0) {
      const bounds = L.latLngBounds([
        [latitude, longitude] as [number, number],
        ...fireLocations.map((f) => [f.lat, f.lng] as [number, number]),
      ]);

      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([latitude, longitude], MAP_CONFIG.DETAILED_ZOOM);
    }
  }, [latitude, longitude, fireLocations]);

  return <div id="map" style={{ height: "100%", width: "100%" }} />;
}