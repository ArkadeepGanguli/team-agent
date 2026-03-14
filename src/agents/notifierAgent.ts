import { nanoid } from "nanoid";
import { callGroq } from "@/lib/groq";
import { sendEmail } from "@/lib/resend";
import { sendSlackMessage } from "@/lib/slack";
import type { Member, Notification, Task, TimelineEntry } from "@/types";

export async function runNotifierAgent(params: {
  projectId: string;
  members: Member[];
  tasks: Task[];
  timeline: TimelineEntry[];
  triggerType?: Notification["type"];
}): Promise<Notification[]> {
  const { projectId, members, tasks, timeline, triggerType } = params;

  const types: Notification["type"][] = triggerType
    ? [triggerType]
    : ["welcome", "handoff", "blocker", "deadline"];

  const notifications: Notification[] = [];
  const now = new Date().toISOString();

  for (const type of types) {
    const relevantMembers = members.filter((member) => {
      if (type === "welcome") return true;
      if (type === "handoff") return timeline.some((entry) => entry.memberId === member.id && entry.isHandoff);
      if (type === "blocker") return tasks.some((task) => task.memberId === member.id && task.status === "blocked");
      return tasks.some((task) => task.memberId === member.id && task.status !== "done");
    });

    for (const member of relevantMembers) {
      const context = {
        type,
        member,
        projectId,
        taskCount: tasks.filter((t) => t.memberId === member.id).length
      };

      const body = await callGroq(
        "You write concise software project team notifications. Return plain text under 120 words.",
        JSON.stringify(context)
      );

      const subject = `TeamAgent ${type.toUpperCase()} update`;
      let channel: Notification["channel"] = "email";
      let sent = false;

      const emailResult = await sendEmail(member.email, subject, body);
      sent = emailResult.success;

      if (member.slackUserId) {
        channel = "both";
        const slackResult = await sendSlackMessage(member.slackUserId, `${subject}\n\n${body}`);
        sent = sent && slackResult.success;
      }

      notifications.push({
        id: nanoid(),
        projectId,
        memberId: member.id,
        type,
        channel,
        subject,
        body,
        sentAt: now,
        status: sent ? "sent" : "failed"
      });
    }
  }

  return notifications;
}