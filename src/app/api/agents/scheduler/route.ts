import { NextResponse } from "next/server";
import { runSchedulerAgent } from "@/agents/schedulerAgent";
import { getSessionFromCookie } from "@/lib/farcaster";
import { appendToJSON, readJSON, updateInJSON, writeJSON } from "@/lib/storage";
import { verifyAndSettlePayment } from "@/lib/x402";
import type { AgentLog, Member, Project, Task, TimelineEntry } from "@/types";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payment = await verifyAndSettlePayment(request);
  if (!payment.success) {
    return NextResponse.json({ error: "Payment required", challenge: payment.challenge }, { status: 402 });
  }

  const body = (await request.json()) as { projectId: string };
  const tasks = (await readJSON<Task[]>("tasks.json")).filter((t) => t.projectId === body.projectId);
  const members = (await readJSON<Member[]>("members.json")).filter((m) => m.projectId === body.projectId);

  const timeline = await runSchedulerAgent({
    projectId: body.projectId,
    tasks,
    members
  });

  const existing = await readJSON<TimelineEntry[]>("timeline.json");
  const withoutProject = existing.filter((t) => t.projectId !== body.projectId);
  await writeJSON("timeline.json", [...withoutProject, ...timeline]);

  await updateInJSON<Project>("projects.json", body.projectId, (project) => ({ ...project, status: "active" }));

  await appendToJSON<AgentLog>("logs.json", {
    id: crypto.randomUUID(),
    agentName: "scheduler",
    projectId: body.projectId,
    input: JSON.stringify(body),
    output: JSON.stringify({ count: timeline.length }),
    paymentTxHash: payment.txHash,
    timestamp: new Date().toISOString()
  });

  return NextResponse.json({ timeline, paymentTxHash: payment.txHash });
}