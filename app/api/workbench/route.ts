import { runWorkbench } from "@/lib/workbench";

// 模型调用只在服务端（key 从 process.env.DEEPSEEK_API_KEY 读，绝不进前端）。
export const maxDuration = 30;

export async function POST(req: Request) {
  const { text }: { text?: string } = await req.json();

  if (!text || !text.trim()) {
    return Response.json({ error: "文本为空" }, { status: 400 });
  }

  const { sections, usage } = await runWorkbench(text);

  // 只在服务端终端打印 token（不返回前端、不含密钥），方便往 cost-log.md 填。
  // 4 次并行调用的合计；ok=N/4 看有几块成功（成本只算成功的）。
  console.log(
    `[cost] workbench in=${usage.inputTokens} out=${usage.outputTokens} total=${usage.totalTokens} ok=${usage.okCount}/${sections.length}`,
  );

  // 4 块全失败才算整体失败；部分失败仍 200，前端按块显示。
  if (usage.okCount === 0) {
    return Response.json(
      { error: "全部生成失败，请重试", sections },
      { status: 502 },
    );
  }

  return Response.json({ sections });
}
