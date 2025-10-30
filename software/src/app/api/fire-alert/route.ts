import { NextRequest, NextResponse } from "next/server";
import {
  sendFireAlertNotification,
  getNotificationStats,
  sendStatusChangeNotification,
} from "@/lib/emailService";
import { FireAlertData, StatusChangeParams } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Two modes supported:
    // 1) Legacy mode: { status: "fire", severity?, location?, coordinates? }
    // 2) Transition mode: { fromStatus: "non-fire"|"fire", toStatus: "non-fire"|"fire", location?, coordinates? }

    // Transition mode takes precedence if provided
    if (
      typeof body.fromStatus === "string" &&
      typeof body.toStatus === "string"
    ) {
      const { fromStatus, toStatus, location, coordinates } =
        body as StatusChangeParams;

      const success = await sendStatusChangeNotification({
        fromStatus,
        toStatus,
        location: location || "Unknown Location",
        coordinates,
      });

      return success
        ? NextResponse.json({ message: "Status change notifications sent" })
        : NextResponse.json(
            { error: "Failed to send notifications" },
            { status: 500 }
          );
    }

    // Legacy: only send when status === "fire"
    const { status, location, severity = "high", coordinates } = body;
    if (status !== "fire") {
      return NextResponse.json(
        { error: "Only fire status triggers notifications" },
        { status: 400 }
      );
    }

    // Create alert data
    const alertData: FireAlertData = {
      location: location || "Unknown Location",
      timestamp: new Date().toISOString(),
      severity: severity as "low" | "medium" | "high" | "critical",
      coordinates: coordinates || undefined,
    };

    // Send notifications to all subscribers
    const success = await sendFireAlertNotification(alertData);

    if (success) {
      return NextResponse.json({
        message: "Fire alert notifications sent successfully",
        timestamp: alertData.timestamp,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send notifications" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in fire alert API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const stats = await getNotificationStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching notification stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
