import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/farcaster";
import { runOrchestrator } from "@/lib/orchestrator";
import { verifyAndSettlePayment } from "@/lib/x402";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payment = await verifyAndSettlePayment(request);
  if (!payment.success) {
    return NextResponse.json({ error: "Payment required", challenge: payment.challenge }, { status: 402 });
  }

  try {
    const body = (await request.json()) as { projectId: string; idempotencyKey?: string };

    if (!body.projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const result = await runOrchestrator({
      projectId: body.projectId,
      idempotencyKey: body.idempotencyKey,
      paymentTxHash: payment.txHash
    });

    return NextResponse.json({
      ...result,
      paymentTxHash: payment.txHash
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Orchestration failed"
      },
      { status: 500 }
    );
  }
}