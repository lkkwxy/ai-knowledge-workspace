// 建表 / 索引。跑法：node --env-file=.env.local scripts/migrate.mjs
import postgres from "postgres";
import { readFile } from "node:fs/promises";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
try {
  const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  await sql.unsafe(schema);
  console.log("✓ schema 已应用（chunks 表 + pgvector + HNSW 索引）");
} catch (err) {
  console.error("✗ 出错：", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
