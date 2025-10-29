"use client";

import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface FireLocation {
  lat: number;
  lng: number;
  name?: string;
  severity?: "non-fire" | "high";
}

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
  useEffect(() => {
    // Initialize map
    const map = L.map("map").setView([latitude, longitude], 10);

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Create custom icon for user location (pin icon)
    const userIcon = L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png", // Pin icon
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30],
    });

    // Create fire icon (flame icon)
    const fireIcon = L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/785/785116.png",
      iconSize: [35, 41],
      iconAnchor: [17, 41],
      popupAnchor: [0, -41],
    });

    // Add marker for user location
    L.marker([latitude, longitude], { icon: userIcon })
      .addTo(map)
      .bindPopup("📍 Your Current Location");

    // Add fire detection markers (only for high severity)
    fireLocations.forEach((fire) => {
      // Email context details when fire detected shown
      if (fire.severity === "high") {
        const severityText = fire.severity?.toUpperCase() || "UNKNOWN";
        L.marker([fire.lat, fire.lng], { icon: fireIcon }).addTo(map)
          .bindPopup(`
            <div style="text-align: center;">
              <h3 style="color: #ff4444; font-weight: bold; margin: 0 0 5px 0;">🔥 Fire Detected!</h3>
              <p style="margin: 5px 0;"><strong>Severity:</strong> ${severityText}</p>
              ${
                fire.name
                  ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${fire.name}</p>`
                  : ""
              }
              <p style="margin: 5px 0;"><strong>Coordinates:</strong><br/>${
                fire.lat
              }, ${fire.lng}</p>
            </div>
          `);
      }
    });

    // Adjust map bounds to show all markers (only high severity locations)
    const highSeverityLocations = fireLocations.filter(
      (fire) => fire.severity === "high"
    );
    if (highSeverityLocations.length > 0) {
      const bounds = L.latLngBounds([
        L.latLng(latitude, longitude),
        ...highSeverityLocations.map((fire) => L.latLng(fire.lat, fire.lng)),
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // If no fire locations, use a zoom level similar to fire detection
      // This keeps the map at a good detail level
      map.setView([latitude, longitude], 16);
    }

    // Cleanup
    return () => {
      map.remove();
    };
  }, [latitude, longitude, fireLocations]);

  return <div id="map" style={{ height: "100%", width: "100%" }} />;
}
