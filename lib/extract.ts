// 可复用的结构化提取逻辑：一段文本 → { title, summary, tags[], todos[] }。
// 从 week-02/extract 的实验沉淀进来（CLAUDE.md：可复用逻辑抽进 lib/，攒 starter kit）。
//
// DeepSeek 不支持原生 structured output，AI SDK 退化成「兼容模式」——把 schema 塞进
// system message 做软约束（见 failure-cases.md Bad Case 2）。软约束是随机的：同一输入
// 这次满足 schema、下次可能不满足，不满足时 generateText 会 throw。
// 第 3 步「处理失败面」：用有界重试把这种随机失败兜住——失败就重试（换一次采样往往就过了），
// 重试到上限仍失败再如实抛出。不做降级/造假数据（roadmap 只要求「校验+重试」）。

import { deepseek } from "@ai-sdk/deepseek";
import { generateText, Output } from "ai";
import { z } from "zod";
import { prompts } from "./prompts";

// schema 是「输出长什么样」的唯一事实来源。.describe() 会被 SDK 一起塞给模型。
export const ExtractSchema = z.object({
  title: z.string().describe("一句话标题，概括这段文本的主题"),
  summary: z.string().describe("一句话摘要"),
  tags: z.array(z.string()).describe("3~6 个相关标签"),
  todos: z.array(z.string()).describe("文本中提到的待办事项，没有则空数组"),
});

export type ExtractResult = z.infer<typeof ExtractSchema>;

type Usage = Awaited<ReturnType<typeof generateText>>["usage"];

export class ExtractError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly lastError: unknown,
  ) {
    super(message);
    this.name = "ExtractError";
  }
}

async function extractOnce(
  text: string,
): Promise<{ output: ExtractResult; usage: Usage }> {
  const { output, usage } = await generateText({
    model: deepseek("deepseek-chat"),
    output: Output.object({ schema: ExtractSchema }),
    prompt: prompts.extract(text),
  });
  return { output, usage };
}

/**
 * 有界重试的结构化提取。
 * @param maxRetries 失败后最多再重试几次（默认 2，即最多调 3 次模型）。
 * 全部失败抛 ExtractError，带上尝试次数与最后一次的原始错误，便于上层记 bad case。
 */
export async function extract(
  text: string,
  { maxRetries = 2 }: { maxRetries?: number } = {},
): Promise<{ output: ExtractResult; usage: Usage; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const { output, usage } = await extractOnce(text);
      return { output, usage, attempts: attempt };
    } catch (err) {
      lastError = err;
      console.warn(
        `[extract] 第 ${attempt}/${maxRetries + 1} 次失败：${(err as Error).message}`,
      );
    }
  }
  throw new ExtractError(
    `提取失败：重试 ${maxRetries + 1} 次仍无法得到合法结构（最后错误：${(lastError as Error)?.message ?? lastError}）`,
    maxRetries + 1,
    lastError,
  );
}
