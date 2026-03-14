export type Project = {
  id: string;
  name: string;
  brief: string;
  adminFid: number;
  createdAt: string;
  status: "pending" | "active" | "complete";
};

export type Member = {
  id: string;
  projectId: string;
  fid: number;
  username: string;
  role: string;
  email: string;
  slackUserId?: string;
};

export type Task = {
  id: string;
  projectId: string;
  memberId: string;
  title: string;
  description: string;
  role: string;
  status: "todo" | "in-progress" | "blocked" | "done";
  blockedBy?: string;
  handoffTo?: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
};

export type TimelineEntry = {
  id: string;
  projectId: string;
  taskId: string;
  memberId: string;
  scheduledDate: string;
  dayNumber: number;
  isHandoff: boolean;
  isBlocker: boolean;
  note: string;
};

export type Notification = {
  id: string;
  projectId: string;
  memberId: string;
  type: "handoff" | "blocker" | "deadline" | "welcome";
  channel: "email" | "slack" | "both";
  subject: string;
  body: string;
  sentAt: string;
  status: "sent" | "failed";
};

export type AgentLog = {
  id: string;
  agentName: "task-assign" | "scheduler" | "notifier" | "helper" | "orchestrate";
  projectId: string;
  input: string;
  output: string;
  paymentTxHash?: string;
  tokensUsed?: number;
  timestamp: string;
  stage?: "task-assign" | "scheduler" | "notifier";
  stageStatus?: "pending" | "running" | "success" | "failed";
  idempotencyKey?: string;
};

export type OrchestrationStageName = "task-assign" | "scheduler" | "notifier";

export type OrchestrationStageStatus = "pending" | "running" | "success" | "failed";

export type OrchestrationStage = {
  stage: OrchestrationStageName;
  status: OrchestrationStageStatus;
  error?: string;
};

export type SessionClaims = {
  fid: number;
  username: string;
  iat?: number;
  exp?: number;
};