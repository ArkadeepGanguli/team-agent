import { nanoid } from "nanoid";
import type { Member, Task, TimelineEntry } from "@/types";

function plusDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function runSchedulerAgent(params: {
  projectId: string;
  tasks: Task[];
  members: Member[];
}): Promise<TimelineEntry[]> {
  const { projectId, tasks, members } = params;

  const baseDate = new Date();
  const memberDayCounts = new Map<string, Map<number, number>>();
  const taskDay = new Map<string, number>();

  for (const member of members) {
    memberDayCounts.set(member.id, new Map<number, number>());
  }

  const sorted = [...tasks].sort((a, b) => {
    const priorityRank: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2 };
    return priorityRank[a.priority] - priorityRank[b.priority];
  });

  const timeline: TimelineEntry[] = [];

  for (const task of sorted) {
    let day = 1;

    if (task.blockedBy) {
      const blockerTask = tasks.find((t) => t.title === task.blockedBy || t.id === task.blockedBy);
      if (blockerTask) {
        day = Math.max(day, (taskDay.get(blockerTask.id) ?? 1) + 1);
      }
    }

    const memberLoad = memberDayCounts.get(task.memberId) ?? new Map<number, number>();
    while ((memberLoad.get(day) ?? 0) >= 2) {
      day += 1;
    }

    memberLoad.set(day, (memberLoad.get(day) ?? 0) + 1);
    memberDayCounts.set(task.memberId, memberLoad);
    taskDay.set(task.id, day);

    timeline.push({
      id: nanoid(),
      projectId,
      taskId: task.id,
      memberId: task.memberId,
      scheduledDate: plusDays(baseDate, day - 1),
      dayNumber: day,
      isHandoff: false,
      isBlocker: Boolean(task.blockedBy),
      note: task.blockedBy ? `Blocked by ${task.blockedBy}` : "Scheduled"
    });

    if (task.handoffTo) {
      const handoffMember = members.find((m) => m.id === task.handoffTo || m.role === task.handoffTo || m.username === task.handoffTo);
      if (handoffMember) {
        const handoffDay = day + 1;
        timeline.push({
          id: nanoid(),
          projectId,
          taskId: task.id,
          memberId: handoffMember.id,
          scheduledDate: plusDays(baseDate, handoffDay - 1),
          dayNumber: handoffDay,
          isHandoff: true,
          isBlocker: false,
          note: `Handoff from task ${task.title}`
        });
      }
    }
  }

  return timeline.sort((a, b) => a.dayNumber - b.dayNumber);
}