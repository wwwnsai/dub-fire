import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { FireLocation } from "@/lib/types";

const STATUS_FILE_PATH = path.join(process.cwd(), "public", "fire-status.json");

// Default fire location (ECC)
const DEFAULT_STATUS: FireLocation[] = [
  {
    lat: 13.7292,
    lng: 100.7756,
    name: "Fire Detected",
    severity: "non-fire",
  },
];

// Helper function to read status from file
async function readStatusFromFile(): Promise<FireLocation[]> {
  try {
    const fileContent = await fs.readFile(STATUS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(fileContent);
    return Array.isArray(parsed) ? parsed : DEFAULT_STATUS;
  } catch (error) {
    // File doesn't exist or is invalid, return default
    console.log("Status file not found, using default status", error);
    return DEFAULT_STATUS;
  }
}

// Helper function to write status to file
async function writeStatusToFile(status: FireLocation[]): Promise<void> {
  try {
    // Ensure public directory exists
    const publicDir = path.dirname(STATUS_FILE_PATH);
    await fs.mkdir(publicDir, { recursive: true });

    await fs.writeFile(
      STATUS_FILE_PATH,
      JSON.stringify(status, null, 2),
      "utf-8"
    );
  } catch (error) {
    console.error("Error writing status file:", error);
    throw error;
  }
}

// GET: Read current fire status
export async function GET() {
  try {
    const status = await readStatusFromFile();
    return NextResponse.json({ fireLocations: status });
  } catch (error) {
    console.error("Error reading fire status:", error);
    return NextResponse.json(
      { error: "Failed to read fire status" },
      { status: 500 }
    );
  }
}

// POST: Update fire status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fireLocations } = body;

    if (!Array.isArray(fireLocations)) {
      return NextResponse.json(
        { error: "fireLocations must be an array" },
        { status: 400 }
      );
    }

    await writeStatusToFile(fireLocations);

    return NextResponse.json({
      message: "Fire status updated successfully",
      fireLocations,
    });
  } catch (error) {
    console.error("Error updating fire status:", error);
    return NextResponse.json(
      { error: "Failed to update fire status" },
      { status: 500 }
    );
  }
}
