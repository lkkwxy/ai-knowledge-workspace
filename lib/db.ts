// Supabase Postgres 连接（Session pooler / IPv4，SSL 必开）。
// 单例：Next dev 热重载会反复 import 这个模块，挂到 globalThis 防止连接句柄泄漏。
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL 未配置——见 .env.local（脚本需 node --env-file=.env.local）");
}

const g = globalThis as unknown as { _sql?: ReturnType<typeof postgres> };

export const sql = g._sql ?? postgres(url, { ssl: "require" });

if (process.env.NODE_ENV !== "production") g._sql = sql;
