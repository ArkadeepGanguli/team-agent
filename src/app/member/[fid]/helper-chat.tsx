"use client";

import { FormEvent, useState } from "react";

export function HelperChat({ projectId, memberFid }: { projectId: string; memberFid: number }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("");
  const [paymentHeader, setPaymentHeader] = useState("");

  async function ask(event: FormEvent) {
    event.preventDefault();
    setStatus("Asking helper...");

    const response = await fetch("/api/agents/helper", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(paymentHeader ? { "x-payment": paymentHeader } : {})
      },
      body: JSON.stringify({
        projectId,
        memberFid,
        question
      })
    });

    const data = await response.json();

    if (response.status === 402) {
      setStatus("Payment required for helper call");
      return;
    }

    if (!response.ok) {
      setStatus(data.error ?? "Helper failed");
      return;
    }

    setAnswer(data.answer ?? "");
    setStatus(`Settled: ${data.paymentTxHash ?? "n/a"}`);
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-semibold">Private Helper Agent</h3>
      <form onSubmit={ask} className="space-y-2">
        <input
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="x-payment header"
          value={paymentHeader}
          onChange={(event) => setPaymentHeader(event.target.value)}
        />
        <textarea
          className="h-24 w-full rounded border border-slate-300 px-3 py-2"
          placeholder="Ask about your current tasks"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          required
        />
        <button className="bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Ask Helper</button>
      </form>
      {status ? <p className="text-xs text-slate-600">{status}</p> : null}
      {answer ? <p className="rounded border border-indigo-100 bg-indigo-50 p-3 text-sm text-slate-800">{answer}</p> : null}
    </div>
  );
}
