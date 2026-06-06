"use client";

import { useState } from "react";
import Link from "next/link";
import type { ExtractResult } from "@/lib/extract";

type Status = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState("");

  async function handleExtract() {
    if (!text.trim()) return;
    setStatus("loading");
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? `HTTP ${res.status}`);
      }
      setResult(await res.json());
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <header>
        <nav className="mb-4 flex gap-4 text-sm text-gray-500">
          <Link href="/workbench" className="hover:text-gray-900">
            内容工作台 →
          </Link>
          <Link href="/ai-learning" className="hover:text-gray-900">
            里程碑
          </Link>
        </nav>
        <h1 className="text-2xl font-semibold">结构化提取</h1>
        <p className="mt-1 text-sm text-gray-500">
          粘贴一段文本，提取成 标题 / 摘要 / 标签 / 待办 的卡片。
        </p>
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="粘贴一段笔记、文章、会议记录……"
        rows={8}
        className="w-full resize-y rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-gray-500"
      />

      <button
        onClick={handleExtract}
        disabled={status === "loading" || !text.trim()}
        className="self-start rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {status === "loading" ? "提取中…" : "提取"}
      </button>

      {status === "error" && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          提取失败：{error}
        </div>
      )}

      {status === "done" && result && <ResultCard data={result} />}
    </main>
  );
}

function ResultCard({ data }: { data: ExtractResult }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{data.title}</h2>
      <p className="mt-1 text-sm text-gray-600">{data.summary}</p>

      {data.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {data.todos.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 text-sm text-gray-800">
          {data.todos.map((todo, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gray-400">☐</span>
              <span>{todo}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
