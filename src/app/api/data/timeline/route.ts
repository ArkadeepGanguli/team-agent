import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/farcaster";
import { readJSON } from "@/lib/storage";
import type { TimelineEntry } from "@/types";

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId query param required" }, { status: 400 });
  }

  const timeline = (await readJSON<TimelineEntry[]>("timeline.json")).filter((t) => t.projectId === projectId);

  return NextResponse.json({ timeline });
}