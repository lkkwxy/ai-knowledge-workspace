import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "从 0 学 AI 应用开发 · 6 个月里程碑",
  description:
    "一个开发者公开记录自己从 0 系统掌握 AI 应用开发的全过程——真实、有数据、敢写失败。",
};

type Status = "done" | "active" | "upcoming";

type Milestone = {
  id: string; // M1…M6
  month: string; // 第 N 月
  title: string;
  summary: string;
  status: Status;
};

// 数据源：../../roadmap.md 第六节②（里程碑视图）。状态随进度手动更新（每月缓冲周）。
const MILESTONES: Milestone[] = [
  {
    id: "M1",
    month: "第 1 月",
    title: "内容工作流 v1",
    summary:
      "AI 应用基础 + 结构化输出：流式 Chat、Zod 校验、内容工作台雏形。证明「AI 应用不是聊天框，是工作流」。",
    status: "active",
  },
  {
    id: "M2",
    month: "第 2 月",
    title: "本地 RAG 原型",
    summary:
      "手搓 embedding → 检索 → 注入 prompt；文档解析与 chunking 实验；Supabase + pgvector 入库。",
    status: "upcoming",
  },
  {
    id: "M3",
    month: "第 3 月",
    title: "RAG 知识库 v1（带引用 / 拒答）",
    summary:
      "回答带引用来源、查不到就拒答；query rewrite / rerank / hybrid 检索优化，用 eval 数据验证质量。",
    status: "upcoming",
  },
  {
    id: "M4",
    month: "第 4 月",
    title: "可执行 workflow + MCP",
    summary:
      "Tool Calling 从「回答」到「执行」；三条知识库 workflow；接入一个真实 MCP 工具。",
    status: "upcoming",
  },
  {
    id: "M5",
    month: "第 5 月",
    title: "轻量 Agent + Eval 体系",
    summary:
      "workflow vs Agent 真实对比；Langfuse tracing；系统化 eval 与成本看板。",
    status: "upcoming",
  },
  {
    id: "M6",
    month: "第 6 月",
    title: "代表作打磨 + 作品集 + 系列复盘",
    summary:
      "把 6 个月攒下的东西收敛成有记忆点的品牌资产：代表作、12 篇长文系列、最终复盘。",
    status: "upcoming",
  },
];

const STATUS_LABEL: Record<Status, string> = {
  done: "已完成",
  active: "进行中",
  upcoming: "待开始",
};

const STATUS_STYLE: Record<Status, string> = {
  done: "border-green-300 bg-green-50 text-green-700",
  active: "border-blue-300 bg-blue-50 text-blue-700",
  upcoming: "border-gray-200 bg-gray-50 text-gray-500",
};

export default function AiLearningPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">从 0 学 AI 应用开发</h1>
        <p className="mt-2 text-sm text-gray-500">
          一个开发者公开记录自己 6 个月系统掌握 AI 应用开发的全过程——真实、有数据、敢写失败。
          下面是 6 个里程碑，做完一个点亮一个。
        </p>
      </header>

      <ol className="flex flex-col gap-4">
        {MILESTONES.map((m) => (
          <li
            key={m.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">
                <span className="text-gray-400">{m.id}</span> · {m.title}
              </h2>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${STATUS_STYLE[m.status]}`}
              >
                {STATUS_LABEL[m.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">{m.month}</p>
            <p className="mt-2 text-sm text-gray-600">{m.summary}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
