// 检索：query → 本地 embed → pgvector 按距离排序取 top-k。
// 这是 W5 内存版 `index.map(cosine).sort().slice(k)` 的 SQL 版——「排序」从 JS 挪进了数据库。
// W7 唯一的「看穿点」就在这个文件，所以你手搓（embed/chunk/db 是 W5/W6 的或纯 plumbing，已给）。

import { sql } from "./db";
import { embedQuery } from "./embed";

export type Retrieved = {
  id: string;
  content: string;
  section: string | null;
  title: string | null;
  source: string;
  similarity: number; // 越大越相关
};

// TODO(你手搓)：先想清楚再写，答案写进 weekly-log 的「对立面」：
//   1) pgvector 有三个距离运算符：`<->`(L2 欧氏) / `<#>`(负内积) / `<=>`(余弦)。
//      你该用哪个？为什么？
//      （线索：embed.ts 里 encode 用了 normalize:true，向量是 L2 归一化的；W5 你手算的是 cosine；
//       而且它得和 schema.sql 里索引的 opclass 配套，否则索引白建。）
//   2) 运算符返回的是「距离」（越小越近），但你要返回的 similarity 是「越大越相关」。怎么换算？
//      （余弦距离的范围是多少？similarity = ? - distance）
//   3) embedQuery 返回 number[]，但 SQL 里要传的是 pgvector 字面量。它长什么样？怎么把数组转过去？
//      （提示：形如 `[0.1,0.2,...]` 的字符串，再 `::vector` 强转。）
//
// 写完自检：pnpm db:retrieve 应能跑出 top-3，语料内相似度 ~0.5–0.65、语料外 ~0.2。
export async function retrieve(query: string, k = 3): Promise<Retrieved[]> {
  const vec = `[${(await embedQuery(query)).join(",")}]`;
  return sql<Retrieved[]>`
    select id, content, section, title, source,
           1 - (embedding <=> ${vec}::vector) as similarity
    from chunks
    order by embedding <=> ${vec}::vector
    limit ${k}
  `;
}
