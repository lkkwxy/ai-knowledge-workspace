# AI Knowledge Workspace

面向个人学习 / 写作 / 资料管理的 AI 知识工作台。

这是一个 **learn-in-public** 项目：一个开发者公开记录自己 6 个月从 0 系统掌握 AI 应用开发的全过程——真实、有数据、敢写失败。本仓是这趟旅程的「成品」主项目，按功能演进，不强求商业化产品。

> 📍 6 个月里程碑视图：本地运行后访问 [`/ai-learning`](http://localhost:3000/ai-learning)

## 当前能做什么

- **结构化提取**（`/`）：粘贴一段文本 → 提取成 `标题 / 摘要 / 标签 / 待办` 的卡片。背后是 Zod schema 约束 + 有界重试，把「模型吐脏 JSON」收敛成「合法对象 or 明确异常」。
- **作品集主页**（`/ai-learning`）：M1–M6 里程碑视图，记录 6 个月路线进度。

（RAG、Tool Calling、MCP、轻量 Agent、Eval 体系是后面几个月的里程碑，见 `/ai-learning`。）

## 四件套（这个项目的「透明度」资产）

每个功能都跟着这四份文件演进——它们既是工程纪律，也是 learn-in-public 的内容素材：

| 文件 | 作用 |
|---|---|
| `eval-cases.json` | 测试样例，改完 prompt 跑回归 |
| `cost-log.md` | 每次调用的 token / 成本 |
| `failure-cases.md` | 翻车样例库（也是写文章的弹药） |
| `prompt-versions.md` | prompt 版本变化 |

## 技术栈

- **框架**：Next.js 16（App Router）+ TypeScript
- **AI 底座**：Vercel AI SDK（`ai` + `@ai-sdk/deepseek`）
- **结构化输出**：Zod
- **样式**：Tailwind CSS v4
- **主模型**：DeepSeek（前期固定一个把链路跑通）

## 本地运行

```bash
pnpm install

# 配置密钥：复制模板并填入真实 key
cp .env.example .env.local
# 编辑 .env.local，填入 DEEPSEEK_API_KEY=...（.env.local 已被 gitignore，绝不提交）

pnpm dev      # http://localhost:3000
```

其他命令：

```bash
pnpm build    # 生产构建
pnpm lint     # eslint .
```

## 目录结构

```
app/
  page.tsx            结构化提取（卡片 UI）
  api/extract/        提取 API
  ai-learning/        作品集主页（M1–M6 里程碑）
lib/                  可复用封装：prompt 模板 / extract（→ 攒成 starter kit）
eval-cases.json       ┐
cost-log.md           ├ 四件套
failure-cases.md      │
prompt-versions.md    ┘
```

## License

[MIT](./LICENSE) © 2026 李坤坤
