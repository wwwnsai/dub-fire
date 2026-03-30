import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { SensorSnapshot } from "@/lib/types";

const STATUS_FILE_PATH = path.join(process.cwd(), "public", "sensor-status.json");

const DEFAULT_STATUS: SensorSnapshot = {
  temperatureC: null,
  humidity: null,
  imuPitch: null,
  imuRoll: null,
  updatedAt: null,
  source: "uninitialized",
};

async function readStatusFromFile(): Promise<SensorSnapshot> {
  try {
    const fileContent = await fs.readFile(STATUS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(fileContent);
    return { ...DEFAULT_STATUS, ...parsed };
  } catch {
    return DEFAULT_STATUS;
  }
}

async function writeStatusToFile(status: SensorSnapshot): Promise<void> {
  const publicDir = path.dirname(STATUS_FILE_PATH);
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(STATUS_FILE_PATH, JSON.stringify(status, null, 2), "utf-8");
}

export async function GET() {
  try {
    const sensorStatus = await readStatusFromFile();
    return NextResponse.json(sensorStatus);
  } catch (error) {
    console.error("Error reading sensor status:", error);
    return NextResponse.json(
      { error: "Failed to read sensor status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.SENSOR_STATUS_API_KEY;
  if (apiKey) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const rawBody = await request.text();
    if (!rawBody.trim()) {
      return NextResponse.json(
        { error: "Request body is empty" },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Request body is not valid JSON" },
        { status: 400 }
      );
    }

    const rawUpdatedAt = body.updatedAt;
    const parsedTime =
      typeof rawUpdatedAt === "string" ? Date.parse(rawUpdatedAt) : NaN;
    const updatedAt = !isNaN(parsedTime)
      ? rawUpdatedAt
      : new Date().toISOString();

    const nextStatus: SensorSnapshot = {
      temperatureC: typeof body.temperatureC === "number" ? body.temperatureC : null,
      humidity: typeof body.humidity === "number" ? body.humidity : null,
      imuPitch: typeof body.imuPitch === "number" ? body.imuPitch : null,
      imuRoll: typeof body.imuRoll === "number" ? body.imuRoll : null,
      updatedAt,
      source: typeof body.source === "string" ? body.source : "esp32",
    };

    await writeStatusToFile(nextStatus);

    return NextResponse.json({
      message: "Sensor status updated successfully",
      sensorStatus: nextStatus,
    });
  } catch (error) {
    console.error("Error updating sensor status:", error);
    return NextResponse.json(
      { error: "Failed to update sensor status" },
      { status: 500 }
    );
  }
}
