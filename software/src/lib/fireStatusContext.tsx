"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface FireLocation {
  lat: number;
  lng: number;
  name?: string;
  severity?: "non-fire" | "high";
}

interface FireStatusContextType {
  fireLocations: FireLocation[];
  setFireLocations: React.Dispatch<React.SetStateAction<FireLocation[]>>;
  getCurrentFireStatus: () => "safe" | "alert";
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

  const getCurrentFireStatus = (): "safe" | "alert" => {
    // Check if any location has high severity (fire detected)
    const hasFire = fireLocations.some(
      (location) => location.severity === "high"
    );
    return hasFire ? "alert" : "safe";
  };

  return (
    <FireStatusContext.Provider
      value={{
        fireLocations,
        setFireLocations,
        getCurrentFireStatus,
      }}
    >
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
