"use client";

import { useState } from "react";
import Link from "next/link";
import type { SectionResult } from "@/lib/workbench";

type Status = "idle" | "loading" | "done" | "error";

export default function Workbench() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [sections, setSections] = useState<SectionResult[]>([]);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!text.trim()) return;
    setStatus("loading");
    setError("");
    setSections([]);
    try {
      const res = await fetch("/api/workbench", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSections(data.sections);
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
          <Link href="/" className="hover:text-gray-900">
            ← 结构化提取
          </Link>
          <Link href="/ai-learning" className="hover:text-gray-900">
            里程碑
          </Link>
        </nav>
        <h1 className="text-2xl font-semibold">内容工作台</h1>
        <p className="mt-1 text-sm text-gray-500">
          粘贴一段文本，一键产出 摘要 / 观点 / 公众号大纲 / 掘金大纲，各自复制
          Markdown。AI 应用不是聊天框，是工作流。
        </p>
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="粘贴一篇文章、一段笔记、一份资料……"
        rows={8}
        className="w-full resize-y rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-gray-500"
      />

      <button
        onClick={handleGenerate}
        disabled={status === "loading" || !text.trim()}
        className="self-start rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {status === "loading" ? "生成中…（4 路并行）" : "生成"}
      </button>

      {status === "error" && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          生成失败：{error}
        </div>
      )}

      {status === "done" &&
        sections.map((s) => <SectionCard key={s.key} section={s} />)}
    </main>
  );
}

function SectionCard({ section }: { section: SectionResult }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (section.status !== "ok") return;
    await navigator.clipboard.writeText(section.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">
          {section.label}
        </h2>
        {section.status === "ok" && (
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:border-gray-500"
          >
            {copied ? "已复制" : "复制 Markdown"}
          </button>
        )}
      </div>

      {section.status === "ok" ? (
        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm text-gray-700">
          {section.markdown}
        </pre>
      ) : (
        <p className="mt-3 text-sm text-red-600">
          这一块没生成出来：{section.error}（其余几块不受影响，可单独重试）
        </p>
      )}
    </article>
  );
}
