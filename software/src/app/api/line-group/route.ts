// app/api/line-send-all-groups/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient"; 

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get all group IDs
    const { data: groups, error } = await supabase
      .from("line_groups")
      .select("groupId");

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    if (!groups || groups.length === 0) {
      return NextResponse.json({ message: "No groups found" });
    }

    // Send to all groups 
    const results = await Promise.all(
      groups.map(async (g) => {
        try {
          const res = await fetch(
            "https://api.line.me/v2/bot/message/push",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
              },
              body: JSON.stringify({
                to: g.groupId,
                messages: [
                  {
                    type: "text",
                    text: message,
                  },
                ],
              }),
            }
          );

          const text = await res.text();

          if (!res.ok) {
            console.error(`❌ Failed for ${g.groupId}:`, text);
            return { groupId: g.groupId, success: false };
          }

          return { groupId: g.groupId, success: true };
        } catch (err) {
          console.error(`🔥 Exception for ${g.groupId}:`, err);
          return { groupId: g.groupId, success: false };
        }
      })
    );

    // Return 
    return NextResponse.json({
      total: groups.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success),
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}