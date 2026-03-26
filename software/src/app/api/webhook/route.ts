import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("OK", { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json();

  console.log("LINE webhook FULL:");
  console.log(JSON.stringify(body, null, 2));

  const events = body.events || [];

  for (const event of events) {
    const source = event.source;

    if (source?.type === "group") {
      const groupId = source.groupId;

      console.log("👥 GROUP ID:", groupId);

      const { error } = await supabase
        .from("line_groups")
        .upsert(
          { groupId: groupId },
          { onConflict: "groupId" }
        );

      if (error) {
        console.error("❌ Supabase insert error:", error);
      }
    }
  }

  return new Response("OK", { status: 200 });
}