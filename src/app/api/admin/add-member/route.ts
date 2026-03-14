import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/farcaster";
import { appendToJSON, readJSON } from "@/lib/storage";
import type { Member, Project } from "@/types";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Omit<Member, "id">;
  if (!body.projectId || !body.fid || !body.username || !body.role || !body.email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const projects = await readJSON<Project[]>("projects.json");
  const project = projects.find((p) => p.id === body.projectId);
  if (!project || project.adminFid !== session.fid) {
    return NextResponse.json({ error: "Project not found or forbidden" }, { status: 403 });
  }

  const member: Member = {
    id: nanoid(),
    ...body
  };

  await appendToJSON<Member>("members.json", member);
  return NextResponse.json({ member });
}