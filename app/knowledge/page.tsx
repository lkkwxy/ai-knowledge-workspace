"use client";

import { useState } from "react";
import Link from "next/link";

type Hit = {
  id: string;
  content: string;
  section: string | null;
  title: string | null;
  source: string;
  similarity: number;
};

type Status = "idle" | "loading" | "done" | "error";

export default function Knowledge() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [hits, setHits] = useState<Hit[]>([]);
  const [error, setError] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;
    setStatus("loading");
    setError("");
    setHits([]);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setHits(data.hits);
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }

  // 最高分偏低时给个提示（W5 实测：语料内 ~0.5–0.65，语料外骤降到 ~0.2）。
  // 正经的「拒答」是 W9，这里只做视觉提示。
  const topScore = hits[0]?.similarity ?? 0;
  const lowConfidence = status === "done" && hits.length > 0 && topScore < 0.35;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <header>
        <nav className="mb-4 flex gap-4 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900">
            ← 结构化提取
          </Link>
          <Link href="/workbench" className="hover:text-gray-900">
            内容工作台
          </Link>
          <Link href="/ai-learning" className="hover:text-gray-900">
            里程碑
          </Link>
        </nav>
        <h1 className="text-2xl font-semibold">知识库检索</h1>
        <p className="mt-1 text-sm text-gray-500">
          对入库的资料做语义检索：问题编码成向量，pgvector 按余弦相似度取最相关的片段。
          每条带所属小节与相似度——切法（heading）让来源可追溯。
        </p>
      </header>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="问点什么，比如：系统什么时候会拒答？"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
        />
        <button
          onClick={handleSearch}
          disabled={status === "loading" || !query.trim()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {status === "loading" ? "检索中…" : "检索"}
        </button>
      </div>

      {status === "error" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {lowConfidence && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          最高相似度仅 {topScore.toFixed(3)}，可能资料里没有相关内容（正经拒答见 W9）。
        </p>
      )}

      {status === "done" && hits.length === 0 && (
        <p className="text-sm text-gray-500">库里还没有数据，先跑 pnpm db:ingest。</p>
      )}

      <ul className="flex flex-col gap-3">
        {hits.map((h, i) => (
          <li key={h.id} className="rounded-md border border-gray-200 p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
              <span className="rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                {h.section ?? "（前言）"}
              </span>
              <span>
                #{i + 1} · 相似度 {h.similarity.toFixed(3)} · {h.source}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {h.content}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
