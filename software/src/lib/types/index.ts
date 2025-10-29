// Centralized type definitions for the fire detection system

export interface EmailSubscription {
  id: string;
  email: string;
  created_at: string;
  is_active: boolean;
  last_notified_at?: string;
  notification_count: number;
}

export interface FireAlertData {
  location?: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface FireLocation {
  lat: number;
  lng: number;
  name?: string;
  severity?: "non-fire" | "high";
}

export type FireStatus = "fire" | "non-fire";
export type SafetyStatus = "safe" | "alert";

export interface Location {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface SeverityChange {
  locationId: string;
  fromStatus: FireStatus;
  toStatus: FireStatus;
  coordinates: { lat: number; lng: number };
  location?: string;
}

export interface NotificationStats {
  totalSubscribers: number;
  activeSubscribers: number;
  lastNotificationSent?: string;
}

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface StatusChangeParams {
  fromStatus: FireStatus;
  toStatus: FireStatus;
  coordinates?: { lat: number; lng: number };
  location?: string;
}
