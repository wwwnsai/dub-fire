// Configuration constants for the fire detection system

export const EMAIL_CONFIG = {
  DEFAULT_FROM:
    process.env.EMAIL_FROM || "Fire Alert System <alerts@yourdomain.com>",
  PROVIDERS: {
    SENDGRID: "sendgrid",
    RESEND: "resend",
  },
} as const;

export const FIRE_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export const FIRE_STATUS = {
  FIRE: "fire",
  NON_FIRE: "non-fire",
} as const;

export const SAFETY_STATUS = {
  SAFE: "safe",
  ALERT: "alert",
} as const;

export const MAP_CONFIG = {
  DEFAULT_ZOOM: 10,
  DETAILED_ZOOM: 16,
  ICON_SIZE: {
    USER: [30, 30],
    FIRE: [35, 41],
  },
  ICON_ANCHOR: {
    USER: [15, 30],
    FIRE: [17, 41],
  },
  POPUP_ANCHOR: {
    USER: [0, -30],
    FIRE: [0, -41],
  },
} as const;

export const GEOLOCATION_CONFIG = {
  ENABLE_HIGH_ACCURACY: true,
  TIMEOUT: 10000,
  MAXIMUM_AGE: 0,
} as const;

export const API_ENDPOINTS = {
  FIRE_ALERT: "/api/fire-alert",
} as const;

export const ERROR_MESSAGES = {
  EMAIL_PROVIDER_NOT_CONFIGURED:
    "No email provider configured. Set SENDGRID_API_KEY or RESEND_API_KEY.",
  GPS_NOT_SUPPORTED: "GPS is not supported by your browser",
  LOCATION_DENIED:
    "Location access denied. Please enable location permissions in your browser.",
  LOCATION_UNAVAILABLE: "Location information is unavailable.",
  LOCATION_TIMEOUT: "Location request timed out.",
  FAILED_TO_GET_LOCATION: "Failed to get your location.",
} as const;
