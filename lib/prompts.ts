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
//   - extract（信息提取）= 已接入（lib/extract.ts → /api/extract → 卡片）。
//   - summarize / takeaways / wechatOutline / juejinOutline = 内容工作台 4 个输出，
//     已接入（lib/workbench.ts → /api/workbench → /workbench）。这些是自由 markdown
//     文本、不上 schema，所以没有 extract 那套有界重试（重试是为软约束 schema 兜底）。
//   - todos = 目录模板，当前由 extract 的 todos 字段覆盖；有独立 UI/接口再接入。

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

  /** 观点：一段文本 → 核心观点 / 关键判断的 markdown 列表。不替作者发挥。 */
  takeaways: (text: string) =>
    `从下面这段文本里提炼核心观点 / 关键判断，输出 markdown 无序列表（每条以 "- " 开头），每条一句、点到为止。只提炼文本里实际表达或可直接推出的观点，不要替作者发挥、不要编。只输出列表本身，不要标题、不要前言。\n\n文本：\n${text}`,

  /** 公众号大纲：一段文本 → 面向大众读者的公众号文章大纲（markdown）。 */
  wechatOutline: (text: string) =>
    `基于下面这段文本，写一篇公众号文章的大纲，markdown 格式。读者是对该主题感兴趣的大众，不必有技术背景。要求：
- 一个抓人的标题（以 "## " 开头）
- 紧接一句话开篇钩子
- 3~5 个小节，每节一个 "### " 小标题 + 一句话说明这节讲什么
只输出大纲本身，不要前言、不要解释。\n\n文本：\n${text}`,

  /** 掘金大纲：一段文本 → 面向开发者的掘金技术文章大纲（markdown）。 */
  juejinOutline: (text: string) =>
    `基于下面这段文本，写一篇掘金技术文章的大纲，markdown 格式。读者是开发者，偏好深度、原理和可落地的细节。要求：
- 一个技术向标题（以 "## " 开头）
- 3~6 个小节，每节一个 "### " 小标题 + 一句话要点；适合放代码 / 示意图 / 数据的小节可在要点里注明
只输出大纲本身，不要前言。\n\n文本：\n${text}`,
} as const;
