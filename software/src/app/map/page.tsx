"use client";

import Layout from "@/components/Layout";
import React, { useEffect, useState } from "react";
import { Navigation, AlertCircle, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useFireStatus } from "@/lib/fireStatusContext";
import { Location } from "@/lib/types";
import {
  getGeolocationErrorMessage,
  generateGoogleMapsUrl,
  formatTimestamp,
} from "@/lib/utils";
import Card from "@/components/cards/Card";
import { requestLocationPermission } from "@/lib/locationService";

const MapWithNoSSR = dynamic(() => import("@/components/LocationMap"), {
  ssr: false,
});

export default function MapPage() {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState("");

  const { fireLocations } = useFireStatus();

  // Request permission + get location
  useEffect(() => {
    if (!navigator.geolocation) return;

    setIsLoading(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };

        setUserLocation(location);
        setMapUrl(generateGoogleMapsUrl(location.lat, location.lng));
        setIsLoading(false);
      },
      (err) => {
        setError(getGeolocationErrorMessage(err));
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 300000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return (
    <Layout>
      <div className="mt-2 space-y-4">

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="animate-spin w-10 h-10" />
            <p>Getting location...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-100 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle />
            <span>{error}</span>
          </div>
        )}

        {/* Map */}
        {userLocation && (
          <>
            <div className="bg-white rounded-xl overflow-hidden shadow">
              <div className="aspect-video">
                <MapWithNoSSR
                  latitude={userLocation.lat}
                  longitude={userLocation.lng}
                  fireLocations={fireLocations}
                />
              </div>

              <div className="p-4">
                <a
                  href={mapUrl}
                  target="_blank"
                  className="flex items-center gap-2 text-primary-light"
                >
                  Open in Maps <Navigation size={16} />
                </a>
              </div>
            </div>

            <Card
              infoData={[
                {
                  title: "Latitude",
                  description: userLocation.lat.toFixed(6),
                  editable: false,
                },
                {
                  title: "Longitude",
                  description: userLocation.lng.toFixed(6),
                  editable: false,
                },
              ]}
            />

            <Card
              infoData={[
                {
                  title: "Last Updated",
                  description: formatTimestamp(userLocation.timestamp),
                  editable: false,
                },
              ]}
            />
          </>
        )}
      </div>
    </Layout>
  );
}