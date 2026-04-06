import { sendFireAlert, sendSafeAlert } from "@/lib/lineNotiService";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try{
    const { status, fireId } = await req.json();
    console.log("🔥 fire-status API:", status);

    // insert log
    const { error } = await supabase.from("fire_logs").insert({
      status,
      lat: 13.729418,
      lng: 100.775325,
    });

    if (error) {
      console.error("❌ insert error:", error);
    }

    // resolve fireId — if not provided (e.g. called from Pi), use first row
    let resolvedId = fireId;
    if (!resolvedId) {
      const { data } = await supabase
        .from("fire_status")
        .select("id")
        .limit(1)
        .single();
      resolvedId = data?.id;
    }

    // update current
    await supabase
      .from("fire_status")
      .update({
        status,
        updated_at: new Date(),
      })
      .eq("id", resolvedId);

    // SEND PUSH
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const title = status === "fire" ? "🔥 Fire Alert" : "🧯 Safe";
    const body =
      status === "fire"
        ? "Fire detected!"
        : "Fire has been extinguished";

    if (status === "fire") {
      await sendFireAlert();
    } else {
      await sendSafeAlert();
    }

    try {
      await fetch(`${baseUrl}/api/push-noti`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, body }),
      });
    } catch (err) {
      console.error("❌ push failed:", err);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("🔥 API ERROR:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}