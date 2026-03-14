"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-8 px-6">
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">TeamAgent</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Multi-Agent Software Team Orchestrator</h1>
        <p className="text-slate-600">
          Every AI action is paid with x402, settled through Facinet on Avalanche Fuji, and intelligence runs on Groq.
        </p>
      </div>

      <Link href="/dashboard" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
        Enter dashboard
      </Link>
    </main>
  );
}
