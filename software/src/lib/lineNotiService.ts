const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;


export async function sendFireAlert() {
  await fetch(`${baseUrl}/api/line-noti`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "🔥 Fire Alert!!" }),
  });

  await fetch(`${baseUrl}/api/line-group`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "🔥 ไฟไหม้จ้า" }),
  });
}

export async function sendSafeAlert() {
  await fetch(`${baseUrl}/api/line-noti`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "✅ Fire extinguished" }),
  });

  await fetch(`${baseUrl}/api/line-group`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "🧯 ดับไฟแล้วจ้า" }),
  });
}