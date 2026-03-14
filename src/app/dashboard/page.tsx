"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { Project } from "@/types";

type MemberForm = {
  projectId: string;
  fid: string;
  username: string;
  role: string;
  email: string;
  slackUserId: string;
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectBrief, setProjectBrief] = useState("");
  const [memberForm, setMemberForm] = useState<MemberForm>({
    projectId: "",
    fid: "",
    username: "",
    role: "",
    email: "",
    slackUserId: ""
  });
  const [status, setStatus] = useState("");

  async function loadProjects() {
    const response = await fetch("/api/data/projects", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setProjects(data.projects ?? []);
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setStatus("Creating project...");

    const response = await fetch("/api/admin/create-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName, brief: projectBrief })
    });

    if (!response.ok) {
      setStatus("Failed to create project");
      return;
    }

    setProjectName("");
    setProjectBrief("");
    setStatus("Project created");
    await loadProjects();
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    setStatus("Adding member...");

    const payload = {
      projectId: memberForm.projectId,
      fid: Number(memberForm.fid),
      username: memberForm.username,
      role: memberForm.role,
      email: memberForm.email,
      slackUserId: memberForm.slackUserId || undefined
    };

    const response = await fetch("/api/admin/add-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setStatus(response.ok ? "Member added" : "Failed to add member");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-600">Create projects, add members, and run TeamAgent orchestration.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <form onSubmit={createProject} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Create project</h2>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="Project name"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            required
          />
          <textarea
            className="h-28 w-full rounded border border-slate-300 px-3 py-2"
            placeholder="Project brief"
            value={projectBrief}
            onChange={(event) => setProjectBrief(event.target.value)}
            required
          />
          <button className="bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Create</button>
        </form>

        <form onSubmit={addMember} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Add member</h2>
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="Project ID"
            value={memberForm.projectId}
            onChange={(event) => setMemberForm({ ...memberForm, projectId: event.target.value })}
            required
          />
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="FID"
            value={memberForm.fid}
            onChange={(event) => setMemberForm({ ...memberForm, fid: event.target.value })}
            required
          />
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="Username"
            value={memberForm.username}
            onChange={(event) => setMemberForm({ ...memberForm, username: event.target.value })}
            required
          />
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="Role"
            value={memberForm.role}
            onChange={(event) => setMemberForm({ ...memberForm, role: event.target.value })}
            required
          />
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="Email"
            type="email"
            value={memberForm.email}
            onChange={(event) => setMemberForm({ ...memberForm, email: event.target.value })}
            required
          />
          <input
            className="w-full rounded border border-slate-300 px-3 py-2"
            placeholder="Slack user ID (optional)"
            value={memberForm.slackUserId}
            onChange={(event) => setMemberForm({ ...memberForm, slackUserId: event.target.value })}
          />
          <button className="bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Add member</button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Projects</h2>
        <div className="space-y-3">
          {projects.map((project) => (
            <div key={project.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
              <div>
                <p className="font-medium">{project.name}</p>
                <p className="text-xs text-slate-500">{project.status} | {project.id}</p>
              </div>
              <Link href={`/project/${project.id}`} className="text-sm font-semibold text-indigo-600">
                Open
              </Link>
            </div>
          ))}
          {projects.length === 0 ? <p className="text-sm text-slate-500">No projects yet.</p> : null}
        </div>
      </section>

      {status ? <p className="text-sm text-slate-700">{status}</p> : null}
    </main>
  );
}