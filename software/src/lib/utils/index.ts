// Utility functions for common operations

import { FireLocation, Location, SeverityChange } from "./types";

/**
 * Generate a unique location ID based on coordinates
 */
export const generateLocationId = (lat: number, lng: number): string => {
  return `${lat.toFixed(6)}_${lng.toFixed(6)}`;
};

/**
 * Convert severity to fire status
 */
export const severityToFireStatus = (
  severity?: "non-fire" | "high"
): "fire" | "non-fire" => {
  return severity === "high" ? "fire" : "non-fire";
};

/**
 * Check if any fire locations have high severity
 */
export const hasActiveFire = (fireLocations: FireLocation[]): boolean => {
  return fireLocations.some((location) => location.severity === "high");
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (lat: number, lng: number): string => {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

/**
 * Generate Google Maps URL from coordinates
 */
export const generateGoogleMapsUrl = (
  lat: number,
  lng: number,
  zoom: number = 15
): string => {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}`;
};

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString();
};

/**
 * Get error message for geolocation errors
 */
export const getGeolocationErrorMessage = (
  error: GeolocationPositionError
): string => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location access denied. Please enable location permissions in your browser.";
    case error.POSITION_UNAVAILABLE:
      return "Location information is unavailable.";
    case error.TIMEOUT:
      return "Location request timed out.";
    default:
      return "Failed to get your location.";
  }
};

/**
 * Detect severity changes between fire locations
 */
export const detectSeverityChanges = (
  currentLocations: FireLocation[],
  previousSeverities: Record<string, "fire" | "non-fire">
): SeverityChange[] => {
  const changes: SeverityChange[] = [];

  currentLocations.forEach((location) => {
    const locationId = generateLocationId(location.lat, location.lng);
    const currentStatus = severityToFireStatus(location.severity);
    const previousStatus = previousSeverities[locationId];

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

  return changes;
};

/**
 * Validate email address format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize HTML content for email
 */
export const sanitizeHtml = (html: string): string => {
  return html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
};
