"use client";

export async function sendFireAlert() {
  await fetch("/api/line-noti", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "🔥 Fire Alert!!" }),
  });

  await fetch("/api/line-group", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "🔥 ไฟไหม้จ้า" }),
  });
}

export async function sendSafeAlert() {
  await fetch("/api/line-noti", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "✅ Fire extinguished" }),
  });

  await fetch("/api/line-group", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "🧯 ดับไฟแล้วจ้า" }),
  });
}