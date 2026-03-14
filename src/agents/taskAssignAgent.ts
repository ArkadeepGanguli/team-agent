import { nanoid } from "nanoid";
import { callGroq } from "@/lib/groq";
import type { Member, Project, Task } from "@/types";

function extractJSONArray(input: string): unknown[] {
  const start = input.indexOf("[");
  const end = input.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Task agent did not return a JSON array");
  }

  return JSON.parse(input.slice(start, end + 1)) as unknown[];
}

export async function runTaskAssignAgent(params: {
  project: Project;
  members: Member[];
}): Promise<Task[]> {
  const { project, members } = params;

  const system = [
    "You are Task Assignment Agent for software teams.",
    "Create 1-3 tasks per member.",
    "Tasks must match each member role.",
    "Include blockers and handoffs when relevant.",
    "Return only valid JSON array with keys: memberId,title,description,role,blockedBy,handoffTo,priority."
  ].join(" ");

  const user = JSON.stringify({
    project,
    members
  });

  const raw = await callGroq(system, user);
  const parsed = extractJSONArray(raw);

  const byMember = new Map<string, number>();
  const now = new Date().toISOString();

  const tasks: Task[] = [];

  for (const row of parsed
    .map((value) => value as Partial<Task> & { memberId?: string })
    .filter((value) => typeof value.memberId === "string" && members.some((m) => m.id === value.memberId))) {
      const member = members.find((m) => m.id === row.memberId)!;
      const currentCount = byMember.get(member.id) ?? 0;
      if (currentCount >= 3) {
        continue;
      }
      byMember.set(member.id, currentCount + 1);

      const priority = ["low", "medium", "high"].includes(String(row.priority))
        ? (row.priority as Task["priority"])
        : "medium";

      tasks.push({
        id: nanoid(),
        projectId: project.id,
        memberId: member.id,
        title: row.title?.trim() || `${member.role} task`,
        description: row.description?.trim() || `Work item for ${member.role}`,
        role: member.role,
        status: row.blockedBy ? "blocked" : "todo",
        blockedBy: row.blockedBy?.trim() || undefined,
        handoffTo: row.handoffTo?.trim() || undefined,
        priority,
        createdAt: now
      });
  }

  for (const member of members) {
    const count = byMember.get(member.id) ?? 0;
    if (count === 0) {
      tasks.push({
        id: nanoid(),
        projectId: project.id,
        memberId: member.id,
        title: `${member.role} kickoff`,
        description: `Initial ${member.role} contribution for project ${project.name}`,
        role: member.role,
        status: "todo",
        blockedBy: undefined,
        handoffTo: undefined,
        priority: "medium",
        createdAt: now
      });
    }
  }

  return tasks;
}
