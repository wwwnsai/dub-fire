import { supabase } from "./supabaseClient";
import { Resend } from "resend";
import sgMail from "@sendgrid/mail";
import {
  EmailSubscription,
  FireAlertData,
  EmailParams,
  StatusChangeParams,
  NotificationStats,
} from "./types";
import { EMAIL_CONFIG, ERROR_MESSAGES } from "./constants";
import { sanitizeHtml } from "./utils";

//cant find updateNotificationTracking
//so we will create a new function to update the notification tracking
async function updateNotificationTracking(subscriberIds: string[]): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ last_notified_at: new Date().toISOString() })
      .in("id", subscriberIds);
  } catch (error) {
    console.error("Error in updateNotificationTracking:", error);
  }
}



// Initialize email providers
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Core email delivery function with provider fallback
 */
async function deliverEmail(params: EmailParams): Promise<void> {
  const { to, subject, html } = params;
  const sanitizedHtml = sanitizeHtml(html);

  if (resend) {
    await resend.emails.send({
      from: EMAIL_CONFIG.DEFAULT_FROM,
      to: [to],
      subject,
      html: sanitizedHtml,
    });
    return;
  }

  throw new Error(ERROR_MESSAGES.EMAIL_PROVIDER_NOT_CONFIGURED);
}

/**
 * Email template 
 */
const emailTemplates = {
  fireAlert: (alertData: FireAlertData): string => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #ff4444; color: white; padding: 20px; text-align: center;">
        <h1>🚨 FIRE ALERT DETECTED 🚨</h1>
      </div>
      <div style="padding: 20px; background: #f9f9f9;">
        <h2>Emergency Details:</h2>
        <p><strong>Location:</strong> ${alertData.location || "Unknown"}</p>
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

  statusChange: (params: StatusChangeParams): string => {
    const isDetection = params.toStatus === "fire";
    const headline = isDetection ? "🔥 Fire detected" : "✅ Fire cleared";

    return `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h1 style="margin:0 0 12px;">${headline}</h1>
        ${
          params.location
            ? `<p style="margin:4px 0;"><strong>Location:</strong> ${params.location}</p>`
            : ""
        }
        ${
          params.coordinates
            ? `<p style="margin:4px 0;"><strong>Coordinates:</strong> ${params.coordinates.lat}, ${params.coordinates.lng}</p>`
            : ""
        }
        <p style="margin:12px 0 0; color:#666; font-size:12px;">Automated alert from the Fire Detection System.</p>
      </div>
    `;
  },
};

/**
 * Get all active email subscriptions from profiles table
 */
export async function getActiveSubscriptions(): Promise<EmailSubscription[]> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email_noti", true)
      .not("email", "is", null) // Only get profiles with email
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching email subscriptions from profiles:", error);
      return [];
    }

    // Map profiles data to EmailSubscription format
    return (data || []).map((profile) => ({
      id: profile.id,
      email: profile.email,
      created_at: profile.created_at,
      email_noti: profile.email_noti ?? false,
      username: profile.username,
      avatar_url: profile.avatar_url,
    }));
  } catch (error) {
    console.error("Error in getActiveSubscriptions:", error);
    return [];
  }
}

/**
 * Send fire alert notification to all subscribers
 */
export async function sendFireAlertNotification(
  alertData: FireAlertData
): Promise<boolean> {
  try {
    console.log("🔥 Fire Alert Detected!", alertData);

    const subscribers = await getActiveSubscriptions();
    if (subscribers.length === 0) {
      console.log("No active subscribers found");
      return true;
    }

    console.log(`Sending notifications to ${subscribers.length} subscribers`);

    const emailPromises = subscribers.map(async (subscriber) => {
      try {
        await deliverEmail({
          to: subscriber.email,
          subject: `🔥 FIRE ALERT - ${
            alertData.location || "Emergency Location"
          }`,
          html: emailTemplates.fireAlert(alertData),
        });
        console.log(`✅ Email sent to: ${subscriber.email}`);
      } catch (error) {
        console.error(`❌ Failed to send email to ${subscriber.email}:`, error);
      }
    });

    await Promise.all(emailPromises);
    await updateNotificationTracking(subscribers.map((sub) => sub.id));

    return true;
  } catch (error) {
    console.error("Error sending fire alert notifications:", error);
    return false;
  }
}

/**
 * Send status change notification (non-fire -> fire OR fire -> non-fire)
 */
export async function sendStatusChangeNotification(
  params: StatusChangeParams
): Promise<boolean> {
  try {
    const { fromStatus, toStatus } = params;

    // Only alert on transitions between fire and non-fire
    const isTransitionBetweenStates =
      (fromStatus === "non-fire" && toStatus === "fire") ||
      (fromStatus === "fire" && toStatus === "non-fire");

    if (!isTransitionBetweenStates) return true;

    const isDetection = toStatus === "fire";
    const subject = isDetection ? "🔥 Fire detected" : "✅ Fire cleared";

    const subscribers = await getActiveSubscriptions();
    if (subscribers.length === 0) {
      console.log("No active subscribers found");
      return true;
    }

    const html = emailTemplates.statusChange(params);

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
 * Get notification statistics from profiles table
 */
export async function getNotificationStats(): Promise<NotificationStats> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("email_noti, email")
      .not("email", "is", null); // Only count profiles with email

    if (error) {
      console.error("Error fetching notification stats:", error);
      return { totalSubscribers: 0, activeSubscribers: 0 };
    }

    const totalSubscribers = data?.length || 0;
    const activeSubscribers =
      data?.filter((profile) => profile.email_noti === true).length || 0;

    return {
      totalSubscribers,
      activeSubscribers,
    };
  } catch (error) {
    console.error("Error in getNotificationStats:", error);
    return { totalSubscribers: 0, activeSubscribers: 0 };
  }
}
