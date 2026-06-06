// Prompt 模板目录（roadmap W2「Prompt 模板目录：总结 / 信息提取 / 待办」）。
// 集中放结构化任务的 prompt，不散落在各处硬编码：改 prompt 在此一处改，并去 prompt-versions.md 记一版。
//
// 设计要点（roadmap 第一月「提示工程重点」）：
//   - 任务边界：只说做什么，不让模型替你发挥；
//   - I/O 契约：输出结构交给 Zod schema（Output.object）锁，prompt 不再啰嗦求 JSON；
//   - 只输出结果：不要前言、不要解释；
//   - 错误兜底：可靠性靠 schema 校验 + 调用方有界重试（见 lib/extract.ts），不靠 prompt 求情。
//
// 接入状态：
//   - extract（信息提取）= 已接入 app（lib/extract.ts → /api/extract → 卡片）。
//   - summarize / todos = 目录模板，当前由 extract 的 summary / todos 字段覆盖；
//     等它们有了独立 UI/接口再单独接入，不预先搭空壳功能（简洁优先）。

export const prompts = {
  /** 信息提取：一段文本 → 结构化对象（配 lib/extract.ts 的 ExtractSchema）。规则见 extract-v2（prompt-versions.md）。 */
  extract: (text: string) =>
    `从下面这段文本里提取 标题、摘要、标签、待办。规则：
- 待办(todos)：只收需要主动去做的具体动作。一件事只写一条、不要拆成多条，并保留其中的时间/截止信息(如「下周一上午前」)。明确表示推迟、暂缓、放弃、或已完成的，都不算待办、不要收。没有要做的事就返回空数组。
- 标签(tags)：只给内容主题词，不要「待办/总结/笔记」这类描述文档本身的元词。
- 标题、摘要：各一句，概括主旨。

文本：
${text}`,

  /** 总结：一段文本 → 一两句核心概括。 */
  summarize: (text: string) =>
    `用一两句话概括下面这段文本的核心。只输出概括本身，不要前言、不要展开。\n\n文本：\n${text}`,

  /** 待办：一段文本 → 待办清单。原文没提到的不许编。 */
  todos: (text: string) =>
    `从下面这段文本里抽出所有「要做的事 / 待办」，每条一行、动词开头。原文没明确提到的不要编；没有任何待办就输出「（无）」。\n\n文本：\n${text}`,
} as const;
