"use client";

import Layout from "@/component/Layout";
import React, { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, AlertCircle, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useFireStatus } from "@/lib/fireStatusContext";

const MapWithNoSSR = dynamic(() => import("@/component/LocationMap"), {
  ssr: false,
});

interface Location {
  lat: number;
  lng: number;
  timestamp: string;
}

interface FireLocation {
  lat: number;
  lng: number;
  name?: string;
  severity?: "non-fire" | "high";
}

interface SeverityChange {
  locationId: string;
  fromStatus: "fire" | "non-fire";
  toStatus: "fire" | "non-fire";
  coordinates: { lat: number; lng: number };
  location?: string;
}

export default function MapPage() {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState("");

  // Use shared fire status context
  const { fireLocations, setFireLocations } = useFireStatus();

  // Track previous severity states for change detection
  const previousSeveritiesRef = useRef<Record<string, "fire" | "non-fire">>({});

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Function to convert severity to fire status
  const severityToFireStatus = (
    severity?: "non-fire" | "high"
  ): "fire" | "non-fire" => {
    return severity === "high" ? "fire" : "non-fire";
  };

  // Function to generate location ID
  const generateLocationId = (lat: number, lng: number): string => {
    return `${lat.toFixed(6)}_${lng.toFixed(6)}`;
  };

  // Function to send email alert for severity changes
  const sendSeverityChangeAlert = async (change: SeverityChange) => {
    try {
      const response = await fetch("/api/fire-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromStatus: change.fromStatus,
          toStatus: change.toStatus,
          location: change.location,
          coordinates: change.coordinates,
        }),
      });

      if (response.ok) {
        console.log(
          `✅ Email alert sent for ${change.fromStatus} → ${change.toStatus}`
        );
      } else {
        console.error("❌ Failed to send email alert:", await response.text());
      }
    } catch (error) {
      console.error("❌ Error sending email alert:", error);
    }
  };

  // Effect to monitor severity changes
  useEffect(() => {
    if (fireLocations.length === 0) return;

    const changes: SeverityChange[] = [];

    fireLocations.forEach((location) => {
      const locationId = generateLocationId(location.lat, location.lng);
      const currentStatus = severityToFireStatus(location.severity);
      const previousStatus = previousSeveritiesRef.current[locationId];

      // If this is a new location or status has changed
      if (previousStatus !== undefined && previousStatus !== currentStatus) {
        changes.push({
          locationId,
          fromStatus: previousStatus,
          toStatus: currentStatus,
          coordinates: { lat: location.lat, lng: location.lng },
          location: location.name,
        });
      }
    });

    // Send email alerts for all changes
    changes.forEach((change) => {
      sendSeverityChangeAlert(change);
    });

    // Update previous severities after processing changes
    if (changes.length > 0) {
      console.log(`🔥 Detected ${changes.length} severity changes:`, changes);
    }

    // Always update the ref with current severities
    fireLocations.forEach((location) => {
      const locationId = generateLocationId(location.lat, location.lng);
      const currentStatus = severityToFireStatus(location.severity);
      previousSeveritiesRef.current[locationId] = currentStatus;
    });
  }, [fireLocations]);

  const getCurrentLocation = () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("GPS is not supported by your browser");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };
        setUserLocation(location);

        // Generate Google Maps URL
        const googleMapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}&z=15`;
        setMapUrl(googleMapsUrl);

        setIsLoading(false);
      },
      (err) => {
        let errorMsg = "Failed to get your location.";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg =
              "Location access denied. Please enable location permissions in your browser.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = "Location information is unavailable.";
            break;
          case err.TIMEOUT:
            errorMsg = "Location request timed out.";
            break;
        }
        setError(errorMsg);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const refreshLocation = () => {
    getCurrentLocation();
  };

  // Function to simulate severity changes (for testing)
  const simulateSeverityChange = () => {
    setFireLocations((prev: FireLocation[]) =>
      prev.map((location: FireLocation) => ({
        ...location,
        severity: location.severity === "high" ? "non-fire" : "high",
        name: location.severity === "high" ? "Fire Cleared" : "Fire Detected",
      }))
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Your Location</h1>
          <div className="flex space-x-2">
            <button
              onClick={simulateSeverityChange}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              🔥 Test Fire Alert
            </button>
            <button
              onClick={refreshLocation}
              className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              disabled={isLoading}
            >
              <Navigation className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-600">Getting your location...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Location Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Location Display */}
        {userLocation && (
          <div className="space-y-4">
            {/* Location Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <MapPin className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Current Position
                  </h2>
                  <p className="text-sm text-gray-500">
                    Updated:{" "}
                    {new Date(userLocation.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Latitude</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {userLocation.lat.toFixed(6)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Longitude</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {userLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>

            {/* Map Preview */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="aspect-video bg-gray-200 relative">
                {userLocation && (
                  <MapWithNoSSR
                    latitude={userLocation.lat}
                    longitude={userLocation.lng}
                    fireLocations={fireLocations}
                  />
                )}
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-600 mb-2">
                  📍 You are here -{" "}
                  {new Date(userLocation.timestamp).toLocaleString()}
                </p>
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-orange-500 hover:text-orange-600 font-medium"
                  >
                    <span>Open in Google Maps</span>
                    <Navigation className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Fire Alert Status */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle
                  className={`w-5 h-5 ${
                    fireLocations[0]?.severity === "high"
                      ? "text-red-500"
                      : "text-green-500"
                  }`}
                />
                <h3 className="font-semibold text-gray-900">Safety Status</h3>
              </div>
              <p
                className={`text-sm ${
                  fireLocations[0]?.severity === "high"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {fireLocations[0]?.severity === "high"
                  ? "🔥 Fire detected in your area"
                  : "✅ No fire detected in your current area"}
              </p>
              {fireLocations[0]?.severity === "high" && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-xs text-red-700">
                    <strong>Location:</strong>{" "}
                    {fireLocations[0]?.name || "Unknown"}
                    <br />
                    <strong>Coordinates:</strong>{" "}
                    {fireLocations[0]?.lat.toFixed(6)},{" "}
                    {fireLocations[0]?.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">
            📍 About Location Tracking
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Location is fetched when you open this page</li>
            <li>• Click the refresh button to update your position</li>
            <li>• Location is used to show nearby fire alerts</li>
            <li>• You can view your location on Google Maps</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
