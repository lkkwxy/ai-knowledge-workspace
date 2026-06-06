// 第 1 步靶子：用「裸」generateText 求 JSON，亲手翻车。
//
// 这一步故意不做任何格式保障：不上 Zod、不上 generateObject、prompt 里只是
// 嘴上要求「用 JSON 返回」。目的就是亲眼看到自由文本输出有多不可靠——
// 代码块包裹、开头废话、字段名漂移、偶尔直接 parse 失败。
//
// 跑法：pnpm naive（见 package.json，会跑 RUNS 次）
// 该观察：每次原始输出长啥样？RUNS 次里几次能被 JSON.parse 直接吃下？
//         失败的原因分别是什么（裹了 ```json？加了解释？还是 JSON 本身不合法）？

import { deepseek } from "@ai-sdk/deepseek";
import { generateText } from "ai";

// 同一段输入跑多次，对比「同样的输入、同样的 prompt，输出稳不稳」——这才是重点
const RUNS = 3;

// 一段有点乱的真实文本：有可当标题的主题、有要点、也藏着两条待办
const INPUT = `
今天调研了一下 RAG 的文档切分策略。chunk size 太大检索不准，太小又丢上下文，
社区里普遍从 500~1000 token 起步配 10~20% overlap，但更靠谱的是按标题/语义切。
另外还得给每个 chunk 带上 metadata（来源、章节、时间），不然后面没法做引用和过滤。
回头要做两件事：一是把现在的固定长度切分换成按 Markdown 标题切；二是补一版 chunk 可视化页面，
方便人眼看切得对不对。
`.trim();

// 一个「新手会写」的朴素 prompt：只用自然语言要求 JSON，不给 schema、不给示例
const PROMPT = `你是一个信息提取助手。请从下面这段文本里提取出：
- 标题（title）
- 一句话摘要（summary）
- 相关标签（tags）
- 待办事项（todos）

用 JSON 格式返回。

文本：
${INPUT}`;

async function runOnce(i: number) {
  const { text } = await generateText({
    model: deepseek("deepseek-chat"),
    prompt: PROMPT,
  });

  console.log(`\n========== 第 ${i + 1}/${RUNS} 次 · 原始输出 ==========`);
  console.log(text);

  // 关键动作：直接拿原始输出 JSON.parse，不做任何「剥代码块 / 抠花括号」的清洗。
  // 框架（generateObject）替你做的，正是这层清洗 + 校验。这里先体会没有它的样子。
  try {
    const parsed = JSON.parse(text);
    const keys = Object.keys(parsed).join(", ");
    console.log(`✅ JSON.parse 成功 · 顶层字段: ${keys}`);
    return { ok: true, keys };
  } catch (err) {
    console.log(`❌ JSON.parse 失败: ${(err as Error).message}`);
    return { ok: false, keys: "" };
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

  // 小结：把「不稳定」量化出来——这就是你写过程线短文要用的数据
  const okCount = results.filter((r) => r.ok).length;
  const keySets = new Set(results.filter((r) => r.ok).map((r) => r.keys));
  console.log(`\n========== 小结 ==========`);
  console.log(`${RUNS} 次里 ${okCount} 次能被 JSON.parse 直接吃下。`);
  if (keySets.size > 1) {
    console.log(
      `⚠️ 成功的几次里字段名还不一致（出现了 ${keySets.size} 种顶层结构）——这正是「没有 schema 约束」的代价。`,
    );
  }
  console.log(
    `\n下一步（第 2 步）：把这段换成 generateObject + Zod schema，对比框架替你兜掉了哪些麻烦。`,
  );
}

main();
