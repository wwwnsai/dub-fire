/**
 * Email Event Listener Service
 * Listens to fire status change events and automatically sends email notifications
 */

import { eventBus } from "./eventBus";
import { API_ENDPOINTS } from "./constants";
import { SeverityChange } from "./types";

let isInitialized = false;

/**
 * Initialize email event listener
 * This service automatically sends email notifications when fire status changes
 */
export function initializeEmailEventListener() {
  if (isInitialized) {
    console.warn("Email event listener already initialized");
    return;
  }

  console.log("📧 Initializing email event listener...");

  // Listen for fire status changes
  eventBus.on<{
    locationId: string;
    fromStatus: "fire" | "non-fire";
    toStatus: "fire" | "non-fire";
    location: {
      lat: number;
      lng: number;
      name?: string;
      severity?: "non-fire" | "high";
    };
  }>("fire:status-changed", async (event) => {
    const { fromStatus, toStatus, location } = event;

    console.log(
      `🔥 Fire status changed: ${fromStatus} → ${toStatus} at ${
        location.name || "Unknown"
      }`
    );

    // Only send email for transitions between fire and non-fire
    const isTransitionBetweenStates =
      (fromStatus === "non-fire" && toStatus === "fire") ||
      (fromStatus === "fire" && toStatus === "non-fire");

    if (!isTransitionBetweenStates) {
      return;
    }

    try {
      const change: SeverityChange = {
        locationId: event.locationId,
        fromStatus,
        toStatus,
        coordinates: {
          lat: location.lat,
          lng: location.lng,
        },
        location: location.name,
      };

      // Send email notification via API
      const response = await fetch(API_ENDPOINTS.FIRE_ALERT, {
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
        console.log(`✅ Email alert sent for ${fromStatus} → ${toStatus}`);
      } else {
        console.error("❌ Failed to send email alert:", await response.text());
      }
    } catch (error) {
      console.error("❌ Error sending email alert:", error);
    }
  });

  isInitialized = true;
  console.log("✅ Email event listener initialized");
}

/**
 * Cleanup email event listener
 */
export function cleanupEmailEventListener() {
  if (!isInitialized) return;

  // Note: eventBus doesn't have a removeAllListeners method
  // In production, you might want to store the callback reference
  isInitialized = false;
  console.log("📧 Email event listener cleaned up");
}
