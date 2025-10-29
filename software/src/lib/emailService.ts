import { supabase } from "./supabaseClient";
// import resend library
import { Resend } from "resend";
import sgMail from "@sendgrid/mail";

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const DEFAULT_FROM =
  process.env.EMAIL_FROM || "Fire Alert System <alerts@yourdomain.com>";

async function deliverEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const { to, subject, html } = params;
  // Prefer SendGrid if configured, fallback to Resend
  if (process.env.SENDGRID_API_KEY) {
    await sgMail.send({
      to,
      from: DEFAULT_FROM,
      subject,
      html,
    });
    return;
  }

  // Resend
  if (resend) {
    await resend.emails.send({
      from: DEFAULT_FROM,
      to: [to],
      subject,
      html,
    });
    return;
  }

  throw new Error(
    "No email provider configured. Set SENDGRID_API_KEY or RESEND_API_KEY."
  );
}

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

export type FireStatus = "fire" | "non-fire";

/**
 * Get all active email subscriptions from Supabase
 */
export async function getActiveSubscriptions(): Promise<EmailSubscription[]> {
  try {
    const { data, error } = await supabase
      .from("email_subscriptions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching email subscriptions:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getActiveSubscriptions:", error);
    return [];
  }
}

/**
 * Send fire alert notification to all subscribers
 * This is a placeholder implementation - you'll need to integrate with an actual email service
 */
export async function sendFireAlertNotification(
  alertData: FireAlertData
): Promise<boolean> {
  try {
    console.log("🔥 Fire Alert Detected!", alertData);

    // Get all active subscribers
    const subscribers = await getActiveSubscriptions();

    if (subscribers.length === 0) {
      console.log("No active subscribers found");
      return true;
    }

    console.log(`Sending notifications to ${subscribers.length} subscribers`);

    // Send emails using Resend
    const emailPromises = subscribers.map(async (subscriber) => {
      try {
        await deliverEmail({
          to: subscriber.email,
          subject: `🔥 FIRE ALERT - ${
            alertData.location || "Emergency Location"
          }`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #ff4444; color: white; padding: 20px; text-align: center;">
                <h1>🚨 FIRE ALERT DETECTED 🚨</h1>
              </div>
              <div style="padding: 20px; background: #f9f9f9;">
                <h2>Emergency Details:</h2>
                <p><strong>Location:</strong> ${
                  alertData.location || "Unknown"
                }</p>
                <p><strong>Severity:</strong> ${alertData.severity.toUpperCase()}</p>
                <p><strong>Time:</strong> ${new Date(
                  alertData.timestamp
                ).toLocaleString()}</p>
                ${
                  alertData.coordinates
                    ? `
                  <p><strong>Coordinates:</strong> ${alertData.coordinates.lat}, ${alertData.coordinates.lng}</p>
                `
                    : ""
                }
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <p><strong>⚠️ IMPORTANT:</strong> Please evacuate the area immediately and call emergency services.</p>
                </div>
                <p style="color: #666; font-size: 12px;">
                  This is an automated alert from the Fire Detection System.
                </p>
              </div>
            </div>
          `,
        });
        console.log(`✅ Email sent to: ${subscriber.email}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${subscriber.email}:`, error);
      }
    });

    // Send all emails in parallel
    await Promise.all(emailPromises);

    // Update notification tracking in Supabase
    await updateNotificationTracking(subscribers.map((sub) => sub.id));

    // In a real implementation, you would:
    // 1. Use an email service API to send emails
    // 2. Handle email delivery status
    // 3. Implement retry logic for failed deliveries
    // 4. Add unsubscribe links to emails

    return true;
  } catch (error) {
    console.error("Error sending fire alert notifications:", error);
    return false;
  }
}

/**
 * Send status change notification (non-fire -> fire OR fire -> non-fire)
 */
export async function sendStatusChangeNotification(params: {
  fromStatus: FireStatus;
  toStatus: FireStatus;
  coordinates?: { lat: number; lng: number };
  location?: string;
}): Promise<boolean> {
  try {
    const { fromStatus, toStatus, coordinates, location } = params;

    // Only alert on transitions between fire and non-fire
    const isTransitionBetweenStates =
      (fromStatus === "non-fire" && toStatus === "fire") ||
      (fromStatus === "fire" && toStatus === "non-fire");

    if (!isTransitionBetweenStates) return true;

    const isDetection = toStatus === "fire";
    const subject = isDetection ? "🔥 Fire detected" : "✅ Fire cleared";
    const headline = isDetection ? "🔥 Fire detected" : "✅ Fire cleared";

    const subscribers = await getActiveSubscriptions();
    if (subscribers.length === 0) {
      console.log("No active subscribers found");
      return true;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h1 style="margin:0 0 12px;">${headline}</h1>
        ${
          location
            ? `<p style="margin:4px 0;"><strong>Location:</strong> ${location}</p>`
            : ""
        }
        ${
          coordinates
            ? `<p style=\"margin:4px 0;\"><strong>Coordinates:</strong> ${coordinates.lat}, ${coordinates.lng}</p>`
            : ""
        }
        <p style="margin:12px 0 0; color:#666; font-size:12px;">Automated alert from the Fire Detection System.</p>
      </div>
    `;

    await Promise.all(
      subscribers.map(async (subscriber) => {
        try {
          await deliverEmail({ to: subscriber.email, subject, html });
        } catch (err) {
          console.error(
            `Failed to send status email to ${subscriber.email}:`,
            err
          );
        }
      })
    );

    await updateNotificationTracking(subscribers.map((s) => s.id));
    return true;
  } catch (error) {
    console.error("Error sending status change notifications:", error);
    return false;
  }
}

/**
 * Update notification tracking for subscribers
 */
async function updateNotificationTracking(
  subscriberIds: string[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from("email_subscriptions")
      .update({
        last_notified_at: new Date().toISOString(),
      })
      .in("id", subscriberIds);

    if (error) {
      console.error("Error updating notification tracking:", error);
    }
  } catch (error) {
    console.error("Error in updateNotificationTracking:", error);
  }
}

/**
 * Simulate fire detection and trigger notifications
 * This would typically be called by your fire detection system
 */
export async function simulateFireDetection(): Promise<void> {
  const alertData: FireAlertData = {
    location: "Dubai Fire Station",
    timestamp: new Date().toISOString(),
    severity: "high",
    coordinates: {
      lat: 25.2048,
      lng: 55.2708,
    },
  };

  await sendFireAlertNotification(alertData);
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(): Promise<{
  totalSubscribers: number;
  activeSubscribers: number;
  lastNotificationSent?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("email_subscriptions")
      .select("is_active, last_notified_at");

    if (error) {
      console.error("Error fetching notification stats:", error);
      return { totalSubscribers: 0, activeSubscribers: 0 };
    }

    const totalSubscribers = data?.length || 0;
    const activeSubscribers = data?.filter((sub) => sub.is_active).length || 0;
    const lastNotificationSent = data
      ?.filter((sub) => sub.last_notified_at)
      ?.sort(
        (a, b) =>
          new Date(b.last_notified_at!).getTime() -
          new Date(a.last_notified_at!).getTime()
      )[0]?.last_notified_at;

    return {
      totalSubscribers,
      activeSubscribers,
      lastNotificationSent,
    };
  } catch (error) {
    console.error("Error in getNotificationStats:", error);
    return { totalSubscribers: 0, activeSubscribers: 0 };
  }
}
