# CLAUDE.md · AI Knowledge Workspace（代码仓）

面向个人学习 / 写作 / 资料管理的 AI 知识工作台。
**定位**：内容弹药 + 能力证明，不强求商业化产品（见 `../roadmap.md` 第四节）。
**节奏与该做什么**：以 `../roadmap.md` 为唯一事实来源，本文件只定**这个代码仓怎么写、东西放哪、怎么验证**。

## 锁定的技术栈（W1 定，别中途换）

| 层 | 选择 |
|---|---|
| 框架 | Next.js（App Router）+ TypeScript + Tailwind |
| AI 底座 | Vercel AI SDK（`ai` + `@ai-sdk/*`）：`streamText` / `generateText` / `generateObject` / `useChat` |
| 模型 | **前期固定一个主模型**（Claude 或 GPT）把链路跑通，先不做分层 / fallback / gateway |
| 部署 | Vercel |

> 原则（roadmap 第一节）：**先手搓裸 API，再按需上框架**；**workflow 优先，不为炫技上 Agent**。RAG / Supabase / MCP / Mastra / Langfuse 都是后面几个月的事，**现在不预装、不预搭**。

## 红线 · 密钥安全（auto-accept 也要守）

- key 一律放 `.env.local`，**绝不进 code / commit / 日志**。已在 `.gitignore` 屏蔽 `.env*`。
- 新增需要的环境变量时，同步更新 `.env.example`（只放变量名占位，不放真值）。
- 模型调用**只在服务端**（API route / server）发生，**前端代码里绝不出现 key**。
- 改动 `.env*` / key / CI 配置前**先问我**。

## 目录约定（什么放哪）

```
app/                 # Next.js App Router：页面 + api route
  api/chat/route.ts  # 流式 Chat 后端（streamText）
  ai-learning/       # 作品集主页（M1–M6 里程碑视图）
lib/                 # 可复用封装：AI 调用 / prompt / cost logger（→ 攒成 starter kit）
eval-cases.json      # 四件套①：测试样例，改完 prompt 跑回归
cost-log.md          # 四件套②：每次调用的成本 / 延迟
failure-cases.md     # 四件套③：bad case 库（也是内容素材）
prompt-versions.md   # 四件套④：prompt 版本变化
```

- **四件套住在本仓**（跟代码一起演进，改 prompt 就在旁边跑回归）。模板见 `../roadmap.md` 第十节。
- 内容 / 文章 / 周复盘 / 点子 **不放这里**，放 `../`（ai-learning 目录）。
- 每沉淀一块可复用逻辑就抽进 `lib/`，第 24 周收成 AI app starter kit。

## 验证命令

> 工程尚未 `create-next-app`，scaffold 后这些即生效；eval 脚本待建。

```bash
npm run dev      # 本地开发，localhost:3000
npm run build    # 构建必须过
npm run lint     # 提交前 lint 必须过
# npm run eval   # 待补：把 eval-cases.json 喂给链路看回归
```

## 工作纪律

- **改完主动验证**：流式 Chat 改动 → 浏览器实测逐字输出；prompt 改动 → 跑 eval 看回归，别只改不验。
- **四件套每周更新**：≥1 个 bad case、记本周 token/成本、跑一次 eval（roadmap 第五节每周检查）。
- **调外部 API/SDK 卡住**：先对 ai-sdk.dev / docs.claude.com 官方示例逐字段比对，不靠加 log 猜（streaming 的 API 最容易因版本变动踩坑）。
- **精准修改**：只碰要碰的，不顺手重构 / 美化无关代码。
- **公开发布**（部署生产、发文章）前停下来问我。
