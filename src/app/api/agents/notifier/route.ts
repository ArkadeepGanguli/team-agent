import { NextResponse } from "next/server";
import { runNotifierAgent } from "@/agents/notifierAgent";
import { getSessionFromCookie } from "@/lib/farcaster";
import { appendToJSON, readJSON, writeJSON } from "@/lib/storage";
import { verifyAndSettlePayment } from "@/lib/x402";
import type { AgentLog, Member, Notification, Task, TimelineEntry } from "@/types";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payment = await verifyAndSettlePayment(request);
  if (!payment.success) {
    return NextResponse.json({ error: "Payment required", challenge: payment.challenge }, { status: 402 });
  }

  const body = (await request.json()) as { projectId: string; triggerType?: Notification["type"] };
  const members = (await readJSON<Member[]>("members.json")).filter((m) => m.projectId === body.projectId);
  const tasks = (await readJSON<Task[]>("tasks.json")).filter((t) => t.projectId === body.projectId);
  const timeline = (await readJSON<TimelineEntry[]>("timeline.json")).filter((t) => t.projectId === body.projectId);

  const notifications = await runNotifierAgent({
    projectId: body.projectId,
    members,
    tasks,
    timeline,
    triggerType: body.triggerType
  });

  const existing = await readJSON<Notification[]>("notifications.json");
  await writeJSON("notifications.json", [...existing, ...notifications]);

  await appendToJSON<AgentLog>("logs.json", {
    id: crypto.randomUUID(),
    agentName: "notifier",
    projectId: body.projectId,
    input: JSON.stringify(body),
    output: JSON.stringify({ count: notifications.length }),
    paymentTxHash: payment.txHash,
    timestamp: new Date().toISOString()
  });

  return NextResponse.json({ notifications, paymentTxHash: payment.txHash });
}