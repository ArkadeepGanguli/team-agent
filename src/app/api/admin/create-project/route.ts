import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/farcaster";
import { appendToJSON } from "@/lib/storage";
import type { Project } from "@/types";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name: string; brief: string };
  if (!body.name || !body.brief) {
    return NextResponse.json({ error: "name and brief are required" }, { status: 400 });
  }

  const project: Project = {
    id: nanoid(),
    name: body.name,
    brief: body.brief,
    adminFid: session.fid,
    createdAt: new Date().toISOString(),
    status: "pending"
  };

  await appendToJSON<Project>("projects.json", project);
  return NextResponse.json({ project });
}