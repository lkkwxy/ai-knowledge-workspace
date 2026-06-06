// 第 2 步：用 Zod schema 约束输出重做同一个提取，对比第 1 步。
//
// 注意 API：roadmap 写的是 generateObject，但 AI SDK v6 已把结构化输出统一进
// generateText 的 output 设置，generateObject 被标 @deprecated（IDE 会划删除线）。
// 概念没变——还是「用 Zod schema 锁死输出」，只是包装函数换成 generateText + Output.object。
//
// 和 extract-naive.ts 比，三处变了，其余刻意保持一致（同输入、同跑 3 次）：
//   1. prompt 里不再求「用 JSON 返回」——格式约束交给 schema，prompt 只描述任务
//   2. 用 Zod 定义 schema，SDK 会把它转成约束塞给模型
//   3. 不用自己 JSON.parse——result.output 已经是解析 + 校验过的对象
//
// 跑法：pnpm object
// 该对比：还会出现裹代码块 / parse 失败吗？字段名还会飘吗？拿到的直接是对象还是字符串？

import { deepseek } from "@ai-sdk/deepseek";
import { generateText, Output, generateObject } from "ai";
import { z } from "zod";

const RUNS = 3;

// 和第 1 步同一段输入，才有可比性
const INPUT = `
今天调研了一下 RAG 的文档切分策略。chunk size 太大检索不准，太小又丢上下文，
社区里普遍从 500~1000 token 起步配 10~20% overlap，但更靠谱的是按标题/语义切。
另外还得给每个 chunk 带上 metadata（来源、章节、时间），不然后面没法做引用和过滤。
回头要做两件事：一是把现在的固定长度切分换成按 Markdown 标题切；二是补一版 chunk 可视化页面，
方便人眼看切得对不对。
`.trim();

// schema 就是「输出长什么样」的唯一事实来源。
// .describe() 里的说明会被 SDK 一起塞给模型，相当于把字段含义写进了约束——
// 这比在 prompt 里啰嗦「请返回一个包含 title 的 JSON」可靠得多。
const ExtractSchema = z.object({
  title: z.string().describe("一句话标题，概括这段文本的主题"),
  summary: z.string().describe("一句话摘要"),
  tags: z.array(z.string()).describe("3~6 个相关标签"),
  todos: z.array(z.string()).describe("文本中提到的待办事项，没有则空数组"),
});

// prompt 干净了：只说做什么，不再操心输出格式
const PROMPT = `从下面这段文本里提取标题、摘要、标签和待办事项。\n\n文本：\n${INPUT}`;

async function runOnce(i: number) {
  console.log(`\n========== 第 ${i + 1}/${RUNS} 次 ==========`);
  try {
    const { output } = await generateText({
      model: deepseek("deepseek-chat"),
      output: Output.object({ schema: ExtractSchema }),
      prompt: PROMPT,
    });

    // output 已经是通过 Zod 校验的对象，类型也被 schema 推断出来了（output.title 有提示）
    console.log(JSON.stringify(output, null, 2));
    console.log(
      `✅ 直接拿到合法对象 · 顶层字段: ${Object.keys(output).join(", ")}`,
    );
    return { ok: true };
  } catch (err) {
    // 模型输出满足不了 schema 时会 throw（而不是给你一坨脏字符串）。
    // 这就是第 3 步要处理的失败面——但失败被收敛成了一个明确的异常，而非「包装彩票」。
    console.log(`❌ 抛错: ${(err as Error).name} — ${(err as Error).message}`);
    return { ok: false };
  }
}

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error(
      "缺少 DEEPSEEK_API_KEY。复制 .env.example 为 .env.local 并填入你的 key（key 不进 git）。",
    );
    process.exit(1);
  }

  const results = [];
  for (let i = 0; i < RUNS; i++) {
    results.push(await runOnce(i));
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n========== 小结 ==========`);
  console.log(
    `${RUNS} 次里 ${okCount} 次直接拿到合法对象（无需自己剥代码块 / parse）。`,
  );
  console.log(
    "\n对照第 1 步（pnpm naive）：prompt 没再求 JSON、没出现 Markdown 代码块包裹、不用 JSON.parse、字段名由 schema 锁死。\n" +
      "框架替你做的就是这层：schema 注入 + 强制结构化 + 自动解析校验。",
  );
}

main();
