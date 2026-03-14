import { NextResponse } from "next/server";
import { runTaskAssignAgent } from "@/agents/taskAssignAgent";
import { getSessionFromCookie } from "@/lib/farcaster";
import { appendToJSON, readJSON, writeJSON } from "@/lib/storage";
import { verifyAndSettlePayment } from "@/lib/x402";
import type { AgentLog, Member, Project, Task } from "@/types";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payment = await verifyAndSettlePayment(request);
  if (!payment.success) {
    return NextResponse.json({ error: "Payment required", challenge: payment.challenge }, { status: 402 });
  }

  const body = (await request.json()) as { projectId: string };
  const projects = await readJSON<Project[]>("projects.json");
  const members = (await readJSON<Member[]>("members.json")).filter((m) => m.projectId === body.projectId);
  const project = projects.find((p) => p.id === body.projectId);

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const tasks = await runTaskAssignAgent({ project, members });
  const existing = await readJSON<Task[]>("tasks.json");
  const withoutProject = existing.filter((t) => t.projectId !== body.projectId);
  await writeJSON("tasks.json", [...withoutProject, ...tasks]);

  await appendToJSON<AgentLog>("logs.json", {
    id: crypto.randomUUID(),
    agentName: "task-assign",
    projectId: body.projectId,
    input: JSON.stringify(body),
    output: JSON.stringify({ count: tasks.length }),
    paymentTxHash: payment.txHash,
    timestamp: new Date().toISOString()
  });

  return NextResponse.json({ tasks, paymentTxHash: payment.txHash });
}