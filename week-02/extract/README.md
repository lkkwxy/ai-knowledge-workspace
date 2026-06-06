# W2 · 结构化输出实验：extract

Week 2 靶子任务——**信息提取**：一段文本 → `{ title, summary, tags[], todos[] }`。
按 roadmap「先手搓、再上框架」的顺序，分步推进，每步对比上一步看穿框架做了什么。

## 第 1 步：裸 generateText 求 JSON（亲手翻车）

"同输入同 prompt,3 次 2 成功,唯一失败因模型自作主张裹了代码块,内容其实都对"
`src/extract-naive.ts`。不上 schema、不做清洗，prompt 里只是嘴上要求「用 JSON 返回」，
反复跑同一输入，亲眼看自由文本输出有多不稳。

```bash
pnpm install
cp .env.example .env.local   # 填入你的 DEEPSEEK_API_KEY
pnpm naive                   # 跑 3 次，打印原始输出 + JSON.parse 结果 + 小结
```

**该观察 / 记录（过程线素材）**：

- 每次原始输出长啥样？是否裹了 ` ```json ` 代码块、开头是否有「好的，以下是…」之类废话？
- 3 次里几次能被 `JSON.parse` **直接**吃下？失败是因为代码块、废话，还是 JSON 本身不合法？
- 成功的几次，顶层字段名一致吗（`title` vs `标题`、有没有漏字段）？

把这些观察记一笔——它就是「为什么需要 generateObject + Zod」这篇短文的开头。

## 第 2 步：Zod schema 约束（generateText + Output.object）

> API 提示：roadmap 写的 `generateObject` 在 AI SDK v6 已 `@deprecated`，结构化输出统一进
> `generateText({ output: Output.object({ schema }) })`。概念没变——还是「用 Zod schema 锁死输出」。

把第 1 步换成 schema 约束，prompt 不再求 JSON，SDK 自动解析 + 校验。`src/extract-object.ts`。

```bash
pnpm object                  # 同输入、同跑 3 次，对照第 1 步
```

### A/B 对比结果（同输入、同跑 3 次，DeepSeek deepseek-chat）

| | 第 1 步 裸 `generateText` 求 JSON | 第 2 步 `Output.object` + Zod |
|---|---|---|
| 直接拿到合法对象 | **2/3** | **3/3** |
| 失败原因 | 第 3 次模型裹了 ` ```json ` 代码块 → `JSON.parse` 抛错（内容其实全对） | 无 |
| prompt | 要嘴上求「用 JSON 返回」 | 干净，只描述任务 |
| 拿到的东西 | `string`，要自己 parse + 兜异常 | 已解析+校验的对象，带类型推断 |
| 字段名 | 靠模型自觉（这次凑巧一致） | schema 锁死 |

**框架替你做的就是这层**：schema 注入 + 强制结构化 + 自动解析校验。第 1 步的「包装彩票」
（偶尔裹代码块、字段名可能漂移、parse 可能失败）被收敛成「要么是合法对象、要么 throw 一个明确异常」。

### 一个诚实的坑（过程线素材）

跑第 2 步时 SDK 报了 warning：

```
deepseek-chat: The feature "responseFormat JSON schema" is used in a compatibility mode.
JSON response schema is injected into the system message.
```

即 **DeepSeek 不支持原生 structured output**，AI SDK 是把 schema 塞进 system message 来「软约束」的。
所以这次 3/3 **不是模型层硬保证**，而是「schema 注入 + SDK 解析校验」兜出来的——换个不守规矩的输入仍可能 throw。
这正解释了为什么还需要第 3 步处理失败面，也是「框架替你兜了什么、又没兜什么」最值得写的一层。

## 第 3 步：处理失败面（已做，迁进主应用）

> 到这一步主应用已 scaffold 完，所以失败面没在本实验脚本里做，而是直接做进了可复用的
> **主应用 `lib/extract.ts`**（根目录）+ `app/api/extract/route.ts`。本实验脚本到第 2 步收尾。

软约束的本质是「随机失败」：同一输入这次满足 schema、下次可能不满足，不满足时 `generateText` 抛错。
处理办法=**有界重试**（roadmap 第 2 周「Zod 校验+重试」）：失败就重试，换一次采样往往就过；
重试到上限仍失败再抛 `ExtractError`（带 `attempts` 和最后一次原始错误，便于上层记 bad case）。
**不做降级/造假数据**——宁可如实报错。

验证（两条路径都确定性跑通）：
- 成功路径：真实调用 `attempts=1` 直接返回合法对象。
- 失败路径：故意不给 key 让每次调用都失败 → 观察到重试 3 次（1 原始 + 2 重试）后抛 `ExtractError(attempts=3)`。

代码：根目录 `lib/extract.ts`（`extract(text, { maxRetries })` + `ExtractError`）、`app/api/extract/route.ts`。

## 还没做（留给后续）
- prompt 模板目录（总结/信息提取/待办）、eval 扩到 15 条（roadmap 第 2 周「做」清单剩余项）。
- 选模型时把「是否原生支持 structured output」算进去；eval 里放几条专门难为 schema 的刁钻输入（见 `../../failure-cases.md` Bad Case 2）。
