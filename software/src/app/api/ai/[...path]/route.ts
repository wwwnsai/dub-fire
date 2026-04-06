import { NextRequest, NextResponse } from "next/server";

const AI_ORIGIN = process.env.AI_BASE_URL || "http://127.0.0.1:5001";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const upstreamUrl = `${AI_ORIGIN}/${path.join("/")}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      // @ts-expect-error -- Node fetch supports duplex
      duplex: "half",
    });

    const contentType = upstream.headers.get("content-type") ?? "";

    // Stream MJPEG directly without buffering
    if (contentType.includes("multipart/x-mixed-replace")) {
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-cache, private",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType || "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "AI server unreachable" }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const upstreamUrl = `${AI_ORIGIN}/${path.join("/")}`;

  try {
    const body = await request.text();
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "AI server unreachable" }, { status: 502 });
  }
}
