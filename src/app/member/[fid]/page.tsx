import { readJSON } from "@/lib/storage";
import type { Member, Task } from "@/types";
import { HelperChat } from "./helper-chat";

export default async function MemberPage({ params }: { params: { fid: string } }) {
  const memberFid = Number(params.fid);

  const members = await readJSON<Member[]>("members.json");
  const member = members.find((item) => item.fid === memberFid);

  if (!member) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p>Member not found.</p>
      </main>
    );
  }

  const tasks = (await readJSON<Task[]>("tasks.json")).filter((task) => task.memberId === member.id);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <section className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
          {member.username.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{member.username}</h1>
          <p className="text-sm text-slate-600">Role: {member.role}</p>
          <p className="text-xs text-slate-500">FID: {member.fid}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Assigned Tasks</h2>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded border border-slate-200 p-3">
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-slate-700">{task.description}</p>
              <p className="mt-1 text-xs text-slate-500">
                status: {task.status} | priority: {task.priority} | handoff: {task.handoffTo ?? "-"}
              </p>
            </div>
          ))}
          {tasks.length === 0 ? <p className="text-sm text-slate-500">No tasks assigned.</p> : null}
        </div>
      </section>

      <HelperChat projectId={member.projectId} memberFid={member.fid} />
    </main>
  );
}
