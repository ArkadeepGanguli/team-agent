import { nanoid } from "nanoid";
import { runNotifierAgent } from "@/agents/notifierAgent";
import { runSchedulerAgent } from "@/agents/schedulerAgent";
import { runTaskAssignAgent } from "@/agents/taskAssignAgent";
import { appendToJSON, readJSON, updateInJSON, writeJSON } from "@/lib/storage";
import type {
  AgentLog,
  Member,
  Notification,
  OrchestrationStage,
  OrchestrationStageName,
  Project,
  Task,
  TimelineEntry
} from "@/types";

type OrchestratorResult = {
  project: Project;
  tasks: Task[];
  timeline: TimelineEntry[];
  notifications: Notification[];
  stages: OrchestrationStage[];
  readiness: {
    hasSchedule: boolean;
    unresolvedBlockers: number;
    hasHandoffs: boolean;
  };
};

const STAGES: OrchestrationStageName[] = ["task-assign", "scheduler", "notifier"];

function stringifySafe(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

async function logStage(params: {
  projectId: string;
  stage: OrchestrationStageName;
  stageStatus: OrchestrationStage["status"];
  input: unknown;
  output: unknown;
  idempotencyKey?: string;
  paymentTxHash?: string;
}) {
  const entry: AgentLog = {
    id: nanoid(),
    agentName: "orchestrate",
    projectId: params.projectId,
    stage: params.stage,
    stageStatus: params.stageStatus,
    input: stringifySafe(params.input),
    output: stringifySafe(params.output),
    timestamp: new Date().toISOString(),
    idempotencyKey: params.idempotencyKey,
    paymentTxHash: params.paymentTxHash
  };

  await appendToJSON<AgentLog>("logs.json", entry);
}

function validateTasks(tasks: Task[], members: Member[]): string | null {
  if (!tasks.length) return "No tasks were generated";
  const invalidMember = tasks.some((task) => !members.some((m) => m.id === task.memberId));
  if (invalidMember) return "Generated tasks contain unknown memberId";
  return null;
}

function validateTimeline(timeline: TimelineEntry[]): string | null {
  if (!timeline.length) return "No timeline entries were generated";
  return null;
}

async function loadContext(projectId: string): Promise<{ project: Project; members: Member[]; tasks: Task[]; timeline: TimelineEntry[] }> {
  const projects = await readJSON<Project[]>("projects.json");
  const members = (await readJSON<Member[]>("members.json")).filter((m) => m.projectId === projectId);
  const tasks = (await readJSON<Task[]>("tasks.json")).filter((t) => t.projectId === projectId);
  const timeline = (await readJSON<TimelineEntry[]>("timeline.json")).filter((t) => t.projectId === projectId);
  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  return { project, members, tasks, timeline };
}

export async function runOrchestrator(params: {
  projectId: string;
  idempotencyKey?: string;
  paymentTxHash?: string;
}): Promise<OrchestratorResult> {
  const { projectId, idempotencyKey, paymentTxHash } = params;

  if (idempotencyKey) {
    const logs = await readJSON<AgentLog[]>("logs.json");
    const prior = logs.find(
      (log) =>
        log.agentName === "orchestrate" &&
        log.projectId === projectId &&
        log.idempotencyKey === idempotencyKey &&
        log.stage === "notifier" &&
        log.stageStatus === "success"
    );

    if (prior) {
      const { project, tasks, timeline } = await loadContext(projectId);
      const notifications = (await readJSON<Notification[]>("notifications.json")).filter((n) => n.projectId === projectId);
      return {
        project,
        tasks,
        timeline,
        notifications,
        stages: STAGES.map((stage) => ({ stage, status: "success" })),
        readiness: {
          hasSchedule: timeline.length > 0,
          unresolvedBlockers: tasks.filter((t) => t.status === "blocked").length,
          hasHandoffs: tasks.some((t) => Boolean(t.handoffTo))
        }
      };
    }
  }

  const stages: OrchestrationStage[] = STAGES.map((stage) => ({ stage, status: "pending" }));
  const context = await loadContext(projectId);

  let generatedTasks: Task[] = context.tasks;
  let generatedTimeline: TimelineEntry[] = context.timeline;
  let generatedNotifications: Notification[] = [];

  for (const stageEntry of stages) {
    stageEntry.status = "running";

    await logStage({
      projectId,
      stage: stageEntry.stage,
      stageStatus: "running",
      input: { projectId },
      output: { message: "Stage started" },
      idempotencyKey,
      paymentTxHash
    });

    try {
      if (stageEntry.stage === "task-assign") {
        generatedTasks = await runTaskAssignAgent({
          project: context.project,
          members: context.members
        });
        const error = validateTasks(generatedTasks, context.members);
        if (error) throw new Error(error);

        const existingTasks = await readJSON<Task[]>("tasks.json");
        const withoutProject = existingTasks.filter((task) => task.projectId !== projectId);
        await writeJSON("tasks.json", [...withoutProject, ...generatedTasks]);
      }

      if (stageEntry.stage === "scheduler") {
        generatedTimeline = await runSchedulerAgent({
          projectId,
          tasks: generatedTasks,
          members: context.members
        });
        const error = validateTimeline(generatedTimeline);
        if (error) throw new Error(error);

        const existingTimeline = await readJSON<TimelineEntry[]>("timeline.json");
        const withoutProject = existingTimeline.filter((entry) => entry.projectId !== projectId);
        await writeJSON("timeline.json", [...withoutProject, ...generatedTimeline]);

        await updateInJSON<Project>("projects.json", projectId, (project) => ({ ...project, status: "active" }));
      }

      if (stageEntry.stage === "notifier") {
        generatedNotifications = await runNotifierAgent({
          projectId,
          members: context.members,
          tasks: generatedTasks,
          timeline: generatedTimeline
        });

        const existingNotifications = await readJSON<Notification[]>("notifications.json");
        await writeJSON("notifications.json", [...existingNotifications, ...generatedNotifications]);
      }

      stageEntry.status = "success";
      await logStage({
        projectId,
        stage: stageEntry.stage,
        stageStatus: "success",
        input: { projectId },
        output:
          stageEntry.stage === "task-assign"
            ? { generated: generatedTasks.length }
            : stageEntry.stage === "scheduler"
              ? { generated: generatedTimeline.length }
              : { generated: generatedNotifications.length },
        idempotencyKey,
        paymentTxHash
      });
    } catch (error) {
      stageEntry.status = "failed";
      stageEntry.error = error instanceof Error ? error.message : "Unknown error";

      await logStage({
        projectId,
        stage: stageEntry.stage,
        stageStatus: "failed",
        input: { projectId },
        output: { error: stageEntry.error },
        idempotencyKey,
        paymentTxHash
      });

      throw new Error(`Orchestration failed at ${stageEntry.stage}: ${stageEntry.error}`);
    }
  }

  const tasks = (await readJSON<Task[]>("tasks.json")).filter((task) => task.projectId === projectId);
  const timeline = (await readJSON<TimelineEntry[]>("timeline.json")).filter((entry) => entry.projectId === projectId);
  const notifications = (await readJSON<Notification[]>("notifications.json")).filter((entry) => entry.projectId === projectId);

  const allDone = tasks.length > 0 && tasks.every((task) => task.status === "done");
  if (allDone) {
    await updateInJSON<Project>("projects.json", projectId, (project) => ({ ...project, status: "complete" }));
  }

  const projects = await readJSON<Project[]>("projects.json");
  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    throw new Error("Project not found after orchestration");
  }

  return {
    project,
    tasks,
    timeline,
    notifications,
    stages,
    readiness: {
      hasSchedule: timeline.length > 0,
      unresolvedBlockers: tasks.filter((task) => task.status === "blocked").length,
      hasHandoffs: tasks.some((task) => Boolean(task.handoffTo))
    }
  };
}