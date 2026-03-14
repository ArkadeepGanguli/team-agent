import { NextResponse } from "next/server";
import { signSessionToken, verifyFarcasterMessage } from "@/lib/farcaster";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message: string; signature: string; nonce?: string };
    const result = await verifyFarcasterMessage(body);

    if (!(result as { success?: boolean }).success) {
      return NextResponse.json({ error: "Invalid Farcaster auth" }, { status: 401 });
    }

    const fid = Number((result as { fid?: number | string }).fid ?? 0);
    const username = String((result as { username?: string }).username ?? "unknown");

    const token = signSessionToken({ fid, username });

    const response = NextResponse.json({ ok: true, fid, username });
    response.cookies.set("fc_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auth failed" },
      { status: 500 }
    );
  }
}