import { NextResponse } from "next/server";
import { runHelperAgent } from "@/agents/helperAgent";
import { getSessionFromCookie } from "@/lib/farcaster";
import { appendToJSON, readJSON } from "@/lib/storage";
import { verifyAndSettlePayment } from "@/lib/x402";
import type { AgentLog, Member, Task } from "@/types";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payment = await verifyAndSettlePayment(request);
  if (!payment.success) {
    return NextResponse.json({ error: "Payment required", challenge: payment.challenge }, { status: 402 });
  }

  const body = (await request.json()) as { projectId: string; memberFid: number; question: string };
  const members = (await readJSON<Member[]>("members.json")).filter((m) => m.projectId === body.projectId);
  const member = members.find((m) => m.fid === body.memberFid);

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const tasks = (await readJSON<Task[]>("tasks.json")).filter((task) => task.projectId === body.projectId);
  const answer = await runHelperAgent({ member, tasks, question: body.question });

  await appendToJSON<AgentLog>("logs.json", {
    id: crypto.randomUUID(),
    agentName: "helper",
    projectId: body.projectId,
    input: JSON.stringify({ memberFid: body.memberFid, question: body.question }),
    output: JSON.stringify({ answer }),
    paymentTxHash: payment.txHash,
    timestamp: new Date().toISOString()
  });

  return NextResponse.json({ answer, paymentTxHash: payment.txHash });
}
