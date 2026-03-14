"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task, TimelineEntry } from "@/types";

export default function ProjectPage({ params }: { params: { id: string } }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [status, setStatus] = useState("");
  const [paymentHeader, setPaymentHeader] = useState("");

  async function loadData() {
    const [tasksRes, timelineRes] = await Promise.all([
      fetch(`/api/data/tasks?projectId=${params.id}`, { cache: "no-store" }),
      fetch(`/api/data/timeline?projectId=${params.id}`, { cache: "no-store" })
    ]);

    const tasksData = await tasksRes.json();
    const timelineData = await timelineRes.json();

    if (tasksRes.ok) setTasks(tasksData.tasks ?? []);
    if (timelineRes.ok) setTimeline(timelineData.timeline ?? []);
  }

  useEffect(() => {
    void loadData();
  }, [params.id]);

  const readiness = useMemo(() => {
    const unresolvedBlockers = tasks.filter((task) => task.status === "blocked").length;
    return {
      hasSchedule: timeline.length > 0,
      unresolvedBlockers,
      hasHandoffs: tasks.some((task) => Boolean(task.handoffTo))
    };
  }, [tasks, timeline]);

  async function runOrchestrator() {
    setStatus("Running orchestrator...");
    const res = await fetch("/api/agents/orchestrate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(paymentHeader ? { "x-payment": paymentHeader } : {})
      },
      body: JSON.stringify({
        projectId: params.id,
        idempotencyKey: crypto.randomUUID()
      })
    });

    const data = await res.json();
    if (res.status === 402) {
      setStatus(`402 Payment required: ${data?.challenge?.amount ?? "0.01"} ${data?.challenge?.currency ?? "USDC"}`);
      return;
    }

    if (!res.ok) {
      setStatus(data.error ?? "Orchestration failed");
      return;
    }

    setStatus(`Orchestration complete. Settlement tx: ${data.paymentTxHash ?? "n/a"}`);
    await loadData();
  }

  async function triggerNotifier() {
    setStatus("Sending notifications...");
    const res = await fetch("/api/agents/notifier", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(paymentHeader ? { "x-payment": paymentHeader } : {})
      },
      body: JSON.stringify({ projectId: params.id })
    });

    const data = await res.json();
    if (res.status === 402) {
      setStatus("Notifier blocked by payment challenge");
      return;
    }

    setStatus(res.ok ? `Notifications sent. Settlement tx: ${data.paymentTxHash ?? "n/a"}` : (data.error ?? "Notifier failed"));
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Project {params.id}</h1>
          <p className="text-sm text-slate-600">Run TeamAgent pipeline and review delivery status.</p>
        </div>
        <div className="flex flex-col gap-2">
          <input
            className="rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="x-payment header"
            value={paymentHeader}
            onChange={(e) => setPaymentHeader(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={runOrchestrator} className="bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              Run TeamAgent
            </button>
            <button onClick={triggerNotifier} className="bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Trigger notifications
            </button>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Delivery readiness</h2>
        <p className="mt-2 text-sm text-slate-700">Schedule ready: {String(readiness.hasSchedule)}</p>
        <p className="text-sm text-slate-700">Unresolved blockers: {readiness.unresolvedBlockers}</p>
        <p className="text-sm text-slate-700">Handoffs configured: {String(readiness.hasHandoffs)}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-2 text-left">Title</th>
                <th className="px-2 py-2 text-left">Role</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-left">Blocker</th>
                <th className="px-2 py-2 text-left">Handoff</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b last:border-0">
                  <td className="px-2 py-2">{task.title}</td>
                  <td className="px-2 py-2">{task.role}</td>
                  <td className="px-2 py-2">{task.status}</td>
                  <td className="px-2 py-2">{task.blockedBy ?? "-"}</td>
                  <td className="px-2 py-2">{task.handoffTo ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Timeline</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-2 text-left">Day</th>
                <th className="px-2 py-2 text-left">Date</th>
                <th className="px-2 py-2 text-left">Task ID</th>
                <th className="px-2 py-2 text-left">Member ID</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-2 py-2">{item.dayNumber}</td>
                  <td className="px-2 py-2">{item.scheduledDate}</td>
                  <td className="px-2 py-2">{item.taskId}</td>
                  <td className="px-2 py-2">{item.memberId}</td>
                  <td className="px-2 py-2">{item.isHandoff ? "handoff" : item.isBlocker ? "blocker" : "task"}</td>
                  <td className="px-2 py-2">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {status ? <p className="text-sm text-slate-700">{status}</p> : null}
      <p className="text-xs text-slate-500">
        Every AI action in this system is a paid HTTP call. Identity comes from Farcaster, payments flow through the
        Facinet-powered x402 network and settle on Avalanche Fuji, and intelligence runs on Groq.
      </p>
    </main>
  );
}
