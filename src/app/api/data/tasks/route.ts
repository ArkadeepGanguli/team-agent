import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/farcaster";
import { readJSON } from "@/lib/storage";
import type { Member, Task } from "@/types";

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId query param required" }, { status: 400 });
  }

  const members = await readJSON<Member[]>("members.json");
  const tasks = (await readJSON<Task[]>("tasks.json")).filter((task) => task.projectId === projectId);

  const viewerMember = members.find((member) => member.projectId === projectId && member.fid === session.fid);
  if (!viewerMember) {
    return NextResponse.json({ tasks });
  }

  return NextResponse.json({
    tasks: tasks.filter((task) => task.memberId === viewerMember.id)
  });
}