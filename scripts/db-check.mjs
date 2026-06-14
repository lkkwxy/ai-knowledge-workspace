// 一次性连接体检：连通 → 开 pgvector → 确认装上。跑法：node --env-file=.env.local scripts/db-check.mjs
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL 没读到（确认 --env-file=.env.local 且 .env.local 里有这行）");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });

try {
  const [{ version }] = await sql`select version()`;
  console.log("✓ 连接成功：", version.split(",")[0]);

  await sql`create extension if not exists vector`;
  const ext = await sql`select extname, extversion from pg_extension where extname = 'vector'`;
  if (ext.length) {
    console.log(`✓ pgvector 已启用：vector ${ext[0].extversion}`);
  } else {
    console.log("✗ pgvector 没启用成功");
  }
} catch (err) {
  console.error("✗ 出错：", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
