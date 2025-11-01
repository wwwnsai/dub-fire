"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { FireLocation, SafetyStatus } from "./types";
import {
  hasActiveFire,
  generateLocationId,
  severityToFireStatus,
} from "./utils";
import { eventBus } from "./eventBus";

interface FireStatusContextType {
  fireLocations: FireLocation[];
  setFireLocations: React.Dispatch<React.SetStateAction<FireLocation[]>>;
  getCurrentFireStatus: () => SafetyStatus;
  addFireLocation: (location: FireLocation) => void;
  updateFireLocation: (id: string, updates: Partial<FireLocation>) => void;
  removeFireLocation: (id: string) => void;
  clearAllFireLocations: () => void;
}

const FireStatusContext = createContext<FireStatusContextType | undefined>(
  undefined
);

export function FireStatusProvider({ children }: { children: ReactNode }) {
  const [fireLocations, setFireLocations] = useState<FireLocation[]>([
    {
      lat: 13.726849,
      lng: 100.767144,
      name: "Fire Detected",
      severity: "non-fire",
    },
  ]);

  // Track previous severities to detect changes
  const previousSeveritiesRef = useRef<Record<string, "fire" | "non-fire">>({});

  const getCurrentFireStatus = useCallback((): SafetyStatus => {
    return hasActiveFire(fireLocations) ? "alert" : "safe";
  }, [fireLocations]);

  // Emit events when fire locations change
  useEffect(() => {
    if (fireLocations.length === 0) return;

    fireLocations.forEach((location) => {
      const locationId = generateLocationId(location.lat, location.lng);
      const currentStatus = severityToFireStatus(location.severity);
      const previousStatus = previousSeveritiesRef.current[locationId];

      // Only emit if status changed
      if (previousStatus !== undefined && previousStatus !== currentStatus) {
        // Emit fire status change event
        eventBus.emit("fire:status-changed", {
          locationId,
          fromStatus: previousStatus,
          toStatus: currentStatus,
          location: {
            lat: location.lat,
            lng: location.lng,
            name: location.name,
            severity: location.severity,
          },
        });
      }

      // Update previous status
      previousSeveritiesRef.current[locationId] = currentStatus;
    });
  }, [fireLocations]);

  const addFireLocation = useCallback((location: FireLocation) => {
    setFireLocations((prev) => {
      const newLocations = [...prev, location];
      // Emit event for new location
      eventBus.emit("fire:location-added", {
        location,
      });
      return newLocations;
    });
  }, []);

  const updateFireLocation = useCallback(
    (id: string, updates: Partial<FireLocation>) => {
      setFireLocations((prev) => {
        const updated = prev.map((location) => {
          const locationId = generateLocationId(location.lat, location.lng);
          if (locationId === id) {
            return { ...location, ...updates };
          }
          return location;
        });
        // Emit event for location update
        eventBus.emit("fire:location-updated", {
          locationId: id,
          updates,
        });
        return updated;
      });
    },
    []
  );

  const removeFireLocation = useCallback((id: string) => {
    setFireLocations((prev) => {
      const removed = prev.filter(
        (location) => generateLocationId(location.lat, location.lng) !== id
      );
      // Emit event for location removal
      eventBus.emit("fire:location-removed", {
        locationId: id,
      });
      return removed;
    });
  }, []);

  const clearAllFireLocations = useCallback(() => {
    setFireLocations([]);
    previousSeveritiesRef.current = {};
    eventBus.emit("fire:all-cleared", {});
  }, []);

  const value: FireStatusContextType = {
    fireLocations,
    setFireLocations,
    getCurrentFireStatus,
    addFireLocation,
    updateFireLocation,
    removeFireLocation,
    clearAllFireLocations,
  };

  return (
    <FireStatusContext.Provider value={value}>
      {children}
    </FireStatusContext.Provider>
  );
}

export function useFireStatus() {
  const context = useContext(FireStatusContext);
  if (context === undefined) {
    throw new Error("useFireStatus must be used within a FireStatusProvider");
  }
  return context;
}
