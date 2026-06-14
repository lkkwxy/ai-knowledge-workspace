// 入库：文档 → heading 切块 → 本地 embed → 写进 pgvector。
// 跑法：node --env-file=.env.local --import tsx scripts/ingest.ts [docs/sample.md]
// 幂等：同 source 先删后插，可反复跑。

import { parseFile } from "../lib/parse";
import { chunkByHeading } from "../lib/chunk";
import { embedDocs } from "../lib/embed";
import { sql } from "../lib/db";

const path = process.argv[2] ?? "docs/sample.md";

const doc = await parseFile(path);
const chunks = chunkByHeading(doc);
console.log(`[ingest] ${doc.source} → ${chunks.length} 块（heading 切法）`);

const vectors = await embedDocs(chunks.map((c) => c.text));

await sql`delete from chunks where source = ${doc.source}`;
for (let i = 0; i < chunks.length; i++) {
  const c = chunks[i];
  const vec = `[${vectors[i].join(",")}]`;
  await sql`
    insert into chunks (id, content, embedding, source, title, section)
    values (${c.id}, ${c.text}, ${vec}::vector, ${c.meta.source}, ${c.meta.title}, ${c.meta.section ?? null})
  `;
}

const [{ count }] = await sql`select count(*) from chunks where source = ${doc.source}`;
console.log(`✓ 入库完成：source=${doc.source}，库中现有 ${count} 块`);
await sql.end();
