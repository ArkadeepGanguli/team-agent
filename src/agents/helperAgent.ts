import { callGroq } from "@/lib/groq";
import type { Member, Task } from "@/types";

export async function runHelperAgent(params: {
  member: Member;
  tasks: Task[];
  question: string;
}): Promise<string> {
  const { member, tasks, question } = params;

  const scopedTasks = tasks.filter((task) => task.memberId === member.id && task.status !== "done");

  const response = await callGroq(
    [
      "You are a private role-scoped helper for a software team member.",
      "Only use the provided member context.",
      "Do not discuss other members.",
      "Keep answer actionable and <= 150 words."
    ].join(" "),
    JSON.stringify({
      member: {
        role: member.role,
        username: member.username
      },
      activeTasks: scopedTasks,
      question
    })
  );

  const words = response.trim().split(/\s+/);
  if (words.length <= 150) {
    return response.trim();
  }

  return `${words.slice(0, 150).join(" ")}`;
}