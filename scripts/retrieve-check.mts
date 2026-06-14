// 检索冒烟测试：给几个问题看 top-3。跑法：
//   node --env-file=.env.local --import tsx scripts/retrieve-check.ts "你的问题"
// 不传参跑一组预设题。

import { retrieve } from "../lib/retrieve";
import { sql } from "../lib/db";

const queries = process.argv[2]
  ? [process.argv[2]]
  : ["知识库支持哪些文件类型？", "系统什么时候会拒答？", "明朝有几个皇帝？"];

for (const q of queries) {
  console.log(`\n■ ${q}`);
  const hits = await retrieve(q, 3);
  hits.forEach((h, i) => {
    console.log(
      `  ${i + 1}. [${h.similarity.toFixed(3)}] 〈${h.section ?? "—"}〉 ${h.content.slice(0, 40).replace(/\n/g, " ")}…`,
    );
  });
}
await sql.end();
