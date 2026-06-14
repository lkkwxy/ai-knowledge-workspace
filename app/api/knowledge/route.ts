import type { NextRequest } from "next/server";
import { retrieve } from "@/lib/retrieve";

// 检索 API：POST {query, k?} → top-k 片段（带 section + 相似度）。
// embedding 在服务端本地算（首次请求会加载模型，约几秒）；不返回向量本身，只返回展示需要的字段。
export async function POST(req: NextRequest) {
  let query: unknown;
  let k: unknown;
  try {
    ({ query, k } = await req.json());
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  if (typeof query !== "string" || !query.trim()) {
    return Response.json({ error: "query 必填且为非空字符串" }, { status: 400 });
  }

  try {
    const topK = typeof k === "number" && k > 0 && k <= 10 ? k : 3;
    const hits = await retrieve(query.trim(), topK);
    return Response.json({ hits });
  } catch (err) {
    console.error("[knowledge] 检索失败：", err);
    return Response.json({ error: "检索失败，见服务端日志" }, { status: 500 });
  }
}
