import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/farcaster";
import { readJSON } from "@/lib/storage";
import type { Project } from "@/types";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await readJSON<Project[]>("projects.json");
  const own = projects.filter((project) => project.adminFid === session.fid);
  return NextResponse.json({ projects: own });
}