import { extract, ExtractError } from "@/lib/extract";

// 模型调用只在服务端（key 从 process.env.DEEPSEEK_API_KEY 读，绝不进前端）。
export const maxDuration = 30;

export async function POST(req: Request) {
  const { text }: { text?: string } = await req.json();

  if (!text || !text.trim()) {
    return Response.json({ error: "文本为空" }, { status: 400 });
  }

  try {
    // extract 内部已做有界重试（见 lib/extract.ts）。
    const { output, usage, attempts } = await extract(text);

    // 只在服务端终端打印 token（不返回前端、不含密钥），方便往 cost-log.md 填。
    // attempts>1 说明触发了重试——成本会按实际调用次数累计，记账时留意。
    console.log(
      `[cost] deepseek-chat in=${usage.inputTokens} out=${usage.outputTokens} total=${usage.totalTokens} attempts=${attempts}`,
    );

    return Response.json(output);
  } catch (err) {
    // 重试到上限仍失败（兼容模式软约束的尾部，见 failure-cases.md Bad Case 2）。
    // 如实返回，不造假数据。前端据此显示错误条。
    console.error("[extract] failed:", err);
    const message =
      err instanceof ExtractError ? err.message : "提取失败，请重试";
    return Response.json({ error: message }, { status: 502 });
  }
}
