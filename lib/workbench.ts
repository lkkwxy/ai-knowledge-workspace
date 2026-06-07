// 内容工作台：一段文本 → 摘要 / 观点 / 公众号大纲 / 掘金大纲 四份 markdown 成品。
// roadmap W3「把 AI 做成产品流程，不是聊天框」——同一段输入经 4 条确定性变换并行产出 4 种成品。
//
// 与 lib/extract.ts 的区别：这 4 个输出是自由 markdown 文本、不是结构化对象，
// 所以不上 Zod schema、也不需要 extract 那套有界重试（重试是为 DeepSeek 软约束 schema 兜底）。
// 用 Promise.allSettled 做局部容错：某一块失败不拖垮其余三块，调用方按块展示。

import { deepseek } from "@ai-sdk/deepseek";
import { generateText } from "ai";
import { prompts } from "./prompts";

// 数据驱动的输出配置：要加一种成品（如「小红书文案」），在这里加一项即可——
// UI 不用动：app/workbench/page.tsx 按返回的 sections 数组渲染，自动多出一块。
const SECTIONS = [
  { key: "summary", label: "摘要", prompt: prompts.summarize },
  { key: "takeaways", label: "观点", prompt: prompts.takeaways },
  { key: "wechat", label: "公众号大纲", prompt: prompts.wechatOutline },
  { key: "juejin", label: "掘金大纲", prompt: prompts.juejinOutline },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export type SectionResult =
  | { key: SectionKey; label: string; status: "ok"; markdown: string }
  | { key: SectionKey; label: string; status: "error"; error: string };

export type WorkbenchUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  okCount: number;
};

export type WorkbenchResult = {
  sections: SectionResult[];
  usage: WorkbenchUsage;
};

async function generateSection(text: string, prompt: (t: string) => string) {
  const { text: markdown, usage } = await generateText({
    model: deepseek("deepseek-chat"),
    prompt: prompt(text),
  });
  return { markdown: markdown.trim(), usage };
}

/**
 * 并行跑 4 条内容变换。任何一块失败只影响该块（status: "error"），其余照常返回。
 * usage 只累计成功的调用——成本按实际产生 token 的调用算。
 */
export async function runWorkbench(text: string): Promise<WorkbenchResult> {
  const settled = await Promise.allSettled(
    SECTIONS.map((s) => generateSection(text, s.prompt)),
  );

  const usage: WorkbenchUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    okCount: 0,
  };

  const sections: SectionResult[] = settled.map((res, i) => {
    const { key, label } = SECTIONS[i];
    if (res.status === "fulfilled") {
      const u = res.value.usage;
      usage.inputTokens += u.inputTokens ?? 0;
      usage.outputTokens += u.outputTokens ?? 0;
      usage.totalTokens += u.totalTokens ?? 0;
      usage.okCount += 1;
      return { key, label, status: "ok", markdown: res.value.markdown };
    }
    const err = res.reason;
    console.warn(`[workbench] ${label} 生成失败：${(err as Error)?.message ?? err}`);
    return {
      key,
      label,
      status: "error",
      error: (err as Error)?.message ?? "生成失败",
    };
  });

  return { sections, usage };
}
