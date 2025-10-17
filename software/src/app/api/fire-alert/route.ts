import { NextRequest, NextResponse } from "next/server";
import {
  sendFireAlertNotification,
  getNotificationStats,
} from "@/lib/emailService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const { status, location, severity = "high", coordinates } = body;

    if (status !== "fire") {
      return NextResponse.json(
        { error: "Only fire status triggers notifications" },
        { status: 400 }
      );
    }

    // Create alert data
    const alertData = {
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
