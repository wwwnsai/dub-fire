"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { FireLocation, SafetyStatus } from "./types";
import { hasActiveFire } from "./utils";

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

  const getCurrentFireStatus = useCallback((): SafetyStatus => {
    return hasActiveFire(fireLocations) ? "alert" : "safe";
  }, [fireLocations]);

  const addFireLocation = useCallback((location: FireLocation) => {
    setFireLocations((prev) => [...prev, location]);
  }, []);

  const updateFireLocation = useCallback(
    (id: string, updates: Partial<FireLocation>) => {
      setFireLocations((prev) =>
        prev.map((location) =>
          `${location.lat.toFixed(6)}_${location.lng.toFixed(6)}` === id
            ? { ...location, ...updates }
            : location
        )
      );
    },
    []
  );

  const removeFireLocation = useCallback((id: string) => {
    setFireLocations((prev) =>
      prev.filter(
        (location) =>
          `${location.lat.toFixed(6)}_${location.lng.toFixed(6)}` !== id
      )
    );
  }, []);

  const clearAllFireLocations = useCallback(() => {
    setFireLocations([]);
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
