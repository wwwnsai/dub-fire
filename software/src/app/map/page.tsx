"use client";

import Layout from "@/component/Layout";
import React, { useState, useEffect } from "react";
import { MapPin, Navigation, AlertCircle, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useFireStatus } from "@/lib/fireStatusContext";
import { Location, FireLocation } from "@/lib/types";
import { ERROR_MESSAGES } from "@/lib/constants";
import {
  getGeolocationErrorMessage,
  generateGoogleMapsUrl,
  formatTimestamp,
} from "@/lib/utils";
import { eventBus } from "@/lib/eventBus";

const MapWithNoSSR = dynamic(() => import("@/component/LocationMap"), {
  ssr: false,
});

export default function MapPage() {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

  // Use shared fire status context
  const { fireLocations, setFireLocations } = useFireStatus();

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Listen to fire status change events (event-driven architecture)
  useEffect(() => {
    const handleFireStatusChange = (event: {
      locationId: string;
      fromStatus: "fire" | "non-fire";
      toStatus: "fire" | "non-fire";
      location: {
        lat: number;
        lng: number;
        name?: string;
        severity?: "non-fire" | "high";
      };
    }) => {
      console.log(
        `🗺️ Map received fire status change event: ${event.fromStatus} → ${event.toStatus}`
      );
    };

    // Subscribe to fire status change events
    eventBus.on("fire:status-changed", handleFireStatusChange);

    // Cleanup
    return () => {
      eventBus.off("fire:status-changed", handleFireStatusChange);
    };
  }, []);

  const getCurrentLocation = () => {
    setIsLoading(true);
    setError(null);

    console.log("🌍 Attempting to get current location...");

    if (!navigator.geolocation) {
      console.error("❌ Geolocation not supported");
      setError(ERROR_MESSAGES.GPS_NOT_SUPPORTED);
      setIsLoading(false);
      return;
    }

    // Check if we're on HTTPS or localhost
    const isSecureContext =
      window.isSecureContext || window.location.hostname === "localhost";
    if (!isSecureContext) {
      console.warn("⚠️ Geolocation requires HTTPS or localhost");
      setError(
        "Geolocation requires a secure connection (HTTPS) or localhost. Please use HTTPS or run locally."
      );
      setIsLoading(false);
      return;
    }

    console.log("✅ Geolocation supported, requesting position...");

    //get current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("✅ Location obtained:", position.coords);
        const location: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };
        setUserLocation(location);

        // Generate Google Maps URL
        const googleMapsUrl = generateGoogleMapsUrl(location.lat, location.lng);
        setMapUrl(googleMapsUrl);

        setIsLoading(false);
      },
      (err) => {
        console.error("❌ Geolocation error:", err);
        const errorMsg = getGeolocationErrorMessage(err);
        setError(errorMsg);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 300000, // Allow cached location up to 5 minutes
      }
    );
  };

  const refreshLocation = () => {
    getCurrentLocation();
  };

  // Function to handle manual location input
  const handleManualLocationSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      setError("Please enter valid latitude and longitude values");
      return;
    }

    if (lat < -90 || lat > 90) {
      setError("Latitude must be between -90 and 90");
      return;
    }

    if (lng < -180 || lng > 180) {
      setError("Longitude must be between -180 and 180");
      return;
    }

    const location: Location = {
      lat,
      lng,
      timestamp: new Date().toISOString(),
    };

    setUserLocation(location);
    const googleMapsUrl = generateGoogleMapsUrl(lat, lng);
    setMapUrl(googleMapsUrl);
    setShowManualInput(false);
    setError(null);
    setIsLoading(false);
  };

  // Function to simulate severity changes (for testing)
  // This will trigger the event-driven architecture
  const simulateSeverityChange = () => {
    setFireLocations((prev: FireLocation[]) =>
      prev.map((location: FireLocation) => ({
        ...location,
        severity: location.severity === "high" ? "non-fire" : "high",
        name:
          location.severity === "high"
            ? "Fire Cleared"
            : "Fire Detected - Test Alert",
      }))
    );
  };

  return (
    <Layout>
      <div className="mt-2">
        {/* Header */}
        <div className="flex justify-between mb-2">
          <h1 className="sen-regular text-xl text-text-secondary">
            Your Location
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={simulateSeverityChange}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              🔥 Test Fire Alert
            </button>
            <button
              onClick={refreshLocation}
              className="p-2 bg-primary-light text-white rounded-full hover:bg-orange-600 transition-colors"
              disabled={isLoading}
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <p className="sen-regular text-text-secondary">
              Getting your location...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 sen-medium">Location Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>

              {/* Manual Location Input */}
              <div className="mt-4">
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {showManualInput ? "Hide" : "Enter location manually"}
                </button>

                {showManualInput && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          placeholder="e.g., 25.2048"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          placeholder="e.g., 55.2708"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleManualLocationSubmit}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                      >
                        Use This Location
                      </button>
                      <button
                        onClick={() => {
                          setShowManualInput(false);
                          setManualLat("");
                          setManualLng("");
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setManualLat("25.2048");
                          setManualLng("55.2708");
                        }}
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                      >
                        Use Dubai
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Location Display */}
        {userLocation && (
          <div className="space-y-4">
            {/* Location Card */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <MapPin className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h2 className="sen-semibold text-text-secondary text-md">
                    Current Position
                  </h2>
                  <p className="sen-regualr text-text-secondary text-sm">
                    Updated: {formatTimestamp(userLocation.timestamp)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="sen-regular text-text-secondary text-xs mb-1">
                    Latitude
                  </p>
                  <p className="sen-semibold text-text-secondary text-lg">
                    {userLocation.lat.toFixed(6)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="sen-regular text-text-secondary text-xs mb-1">
                    Longitude
                  </p>
                  <p className="sen-semibold text-text-secondary text-lg">
                    {userLocation.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>

            {/* Map Preview */}
            <div className="bg-white rounded-lg overflow-hidden">
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
                <p className="sen-regular text-text-secondary text-sm mb-2">
                  📍 You are here - {formatTimestamp(userLocation.timestamp)}
                </p>
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-primary-light hover:text-orange-600 sen-medium"
                  >
                    <span>Open in Google Maps</span>
                    <Navigation className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Fire Alert Status */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle
                  className={`w-5 h-5 ${
                    fireLocations[0]?.severity === "high"
                      ? "text-red-500"
                      : "text-green-500"
                  }`}
                />
                <h3 className="sen-semibold text-text-secondary">
                  Safety Status
                </h3>
              </div>
              <p
                className={`sen-regular text-sm ${
                  fireLocations[0]?.severity === "high"
                    ? "text-secondary-light"
                    : "text-text-secondary"
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
      </div>
    </Layout>
  );
}
