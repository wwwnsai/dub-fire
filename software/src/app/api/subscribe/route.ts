import { subscriptions } from "@/lib/subscriptions";

export async function POST(req: Request) {
  const sub = await req.json();

  console.log("Subscription:", sub);

  subscriptions.push(sub);

  console.log("Subscriptions count:", subscriptions.length);

  return Response.json({ success: true });
}