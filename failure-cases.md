# Failure Cases · 翻车 / Bad Case 库

> 四件套之一(见 `../roadmap.md` 第十节)。每周至少记 1 条。既是回归提醒,也是内容素材库(过程线/深度线)。
> 模板:`## Bad Case N` — 日期/功能、用户输入、AI 输出、期望输出、可能原因、解决方案/是否已修复。

---

## Bad Case 1 — chat 发消息后页面无 AI 回复

- **日期 / 功能**:2026-05-31 / W1 流式 Chat(`week-01/chat`,`app/api/chat/route.ts`)
- **用户输入**:在聊天框发送任意消息(如「你好」)
- **AI 输出**:页面空白,无任何回复。后端 SSE 流里返回 `data: {"type":"error","errorText":"messages.some is not a function"}`(浏览器不报红,极易误判成 key 失效或网络问题)
- **期望输出**:AI 逐字流式回复
- **可能原因**:[ ]Prompt [ ]检索 [ ]Chunking [ ]模型 [ ]Schema [ ]工具调用 [x]其他(**SDK 版本 breaking change**)
  - AI SDK v6 把 `convertToModelMessages` 从同步改成了 **async**(返回 Promise)。route 沿用 v5 写法没加 `await`,`streamText` 收到的是 Promise 而非数组,内部 `messages.some(...)` 抛错。
- **解决方案 / 是否已修复**:✅ 已修复。`route.ts` 加 `await`:
  ```ts
  messages: await convertToModelMessages(messages),
  ```
- **排查心得**:别在浏览器瞎猜——直接 `curl -X POST /api/chat` 看 SSE 原始流,一眼就看到 `type:"error"`;再去 `node_modules/ai` 反查 `.some` 调用点,确认 `convertToModelMessages` 定义是 `async function`。静默 breaking change(v5→v6)是升级大版本最容易踩的坑。

---

## Bad Case 2 — DeepSeek 的结构化输出是「软约束」,非模型原生(隐患 · 尚未触发)

> ⚠️ 这条不是已观测的翻车——W2 实验 `Output.object` + Zod 跑 3/3 全过。记它是因为这个「全过」有水分:可靠性来自 SDK 兜底而非模型保证,换输入随时会 throw。记下来当回归提醒 + 选模型的决策依据。

- **日期 / 功能**:2026-06-02 / W2 结构化提取(`week-02/extract/extract-object.ts`,`generateText` + `Output.object`)
- **用户输入**:一段 RAG 调研笔记 → 提取 `{ title, summary, tags[], todos[] }`,同输入跑 3 次
- **AI 输出**:3/3 都拿到合法对象。但 SDK 同时打了 warning:
  ```
  deepseek-chat: The feature "responseFormat JSON schema" is used in a compatibility mode.
  JSON response schema is injected into the system message.
  ```
- **期望输出**:模型原生保证输出满足 schema
- **可能原因**:[ ]Prompt [ ]检索 [ ]Chunking [x]模型(能力缺失) [x]Schema [ ]工具调用 [ ]其他
  - **DeepSeek 不支持原生 structured output**。AI SDK 退化成「兼容模式」:把 JSON schema 塞进 system message 当**软约束**,而非走模型层的强制结构化解码。
  - 后果:schema 是「提示模型尽量照做」,不是「解码器层面锁死」。复杂 schema / 不守规矩的输入下,模型仍可能产出不满足 schema 的结果 → SDK 校验失败 **throw**。这次 3/3 只是输入简单、模型恰好都守规矩。
- **解决方案 / 是否已修复**:🟡 部分处理(W2 第 3 步)。把「软约束仍会 throw」当常态设计:
  - ✅ **有界重试已做**:`lib/extract.ts` 的 `extract(text, { maxRetries=2 })`——失败就重试(换次采样常能过),到上限抛 `ExtractError`(带 attempts);`route.ts` catch 后返 502、前端显示错误条,不造假数据。已验证(缺 key 强制失败 → 重试 3 次后抛 ExtractError)。
  - ⬜ 选模型时把「是否原生支持 structured output」算进去(原生支持的可靠性更高);
  - 🟡 eval 已扩刁钻输入(008 信息稀疏 / 012 英文 / 013 输入含代码块 / 015 中英夹杂+emoji+残标点)。发现:**这些都没让 schema 崩**(格式层很稳),真正的失败转移到了**语义层**(015,见 Bad Case 3)。结论:光靠刁钻输入压不垮 Output.object 的格式;要测的重点应从「格式会不会崩」挪到「字段内容对不对」。
- **排查心得**:`Output.object` 跑通≠模型真支持结构化。**别被一次 3/3 骗了**,务必读 SDK 的 warning——「compatibility mode」就是在提醒你「我帮你兜着,但模型本身没这能力」。这层差别在换模型、上复杂 schema 时会直接变成线上失败。

---

## Bad Case 3 — 提取把「先放放(决定推迟)」误当待办 + tags 混入 meta 词

- **日期 / 功能**:2026-06-04 / W2 结构化提取(`lib/extract.ts`,eval Case 015 混乱输入)
- **用户输入**:一段散会随手记(中英夹杂 + emoji + 残标点),含「把数据重新拉一遍、下周一上午之前」和「retention 的事先放放」
- **AI 输出**:**同输入多跑会崩在不同点**(v1 不稳定):
  - 跑法 A:`todos: [..., "retention的事先放放"]`(把决定推迟当待办) + `tags` 含「待办事项」(meta 词)
  - 跑法 B:`todos: ["重新拉一遍数据", "下周一上午前完成数据整理"]`——把单个任务「下周一前拉数据」**拆成 2 条**、丢了截止时间、还把「拉」漂移成「整理」
- **期望输出**:todos 只收**要主动做**的事、**一件事一条**、**保留截止时间**;「先放放/先不做」是反动作不该进;tags 给内容主题词,不给「待办事项」这种 meta 标签
- **可能原因**:[ ]Prompt [ ]检索 [ ]Chunking [ ]模型 [ ]Schema [ ]工具调用 [x]其他(**语义边界 / prompt 任务定义不够细**)
  - schema 层是过的——`todos: string[]` 合法,输出结构没崩;**崩在语义层**:prompt 只说「提取待办事项」,没界定「明确推迟/放弃的不算」,模型就把出现的所有事项都收了。
  - tags 同理:没说「只给内容主题词」,模型把「待办事项」当成了一个标签。
- **解决方案 / 是否已修复**:✅ 已修(extract-v2,2026-06-04)。在 `lib/prompts.ts` 的 prompt 里收紧任务边界:「待办只收主动动作、一件事一条、保留时间/截止、推迟/放弃/已完成不算」+「tags 只给主题词、不要 meta 词」(schema 不动)。
  - 验证:Case 015 连跑 3 次**稳定转 pass**(从「不稳定地错」变「稳定地对」:todos 恒 1 条带截止时间、retention 排除、tags 无 meta 词)。
  - 回归:006/007/008/009/011 无误伤——「一事一条」没把 009 的 5 条不同待办误并、也没影响 011 的散文待办抽取。
  - 见 prompt-versions extract-v2 / eval-cases Case 015。
- **排查心得**:**结构化输出的失败分两层**——「格式层」(schema 崩不崩)和「语义层」(字段内容对不对)。Output.object 只兜住格式层;语义层(该不该进这个字段)还得靠 prompt 把任务边界讲清。eval 不能只看「能不能 parse」,得看「字段内容对不对」。这条是「lift eval 从格式到语义」的好素材。
