-- W7：建 pgvector 向量表。你手搓——这是 W7 的另一半看穿点（向量怎么存、索引怎么配）。
--
-- TODO(你手搓)：先想清楚再写，关键决策写进 weekly-log：
--   1) 向量列声明成 vector(N)——N 填几？为什么不能填错？
--      （线索：用的是 bge-small-zh，维度看 embed.ts 的注释 / lib/embed.ts；入库的向量多长，列就得多长。）
--   2) 除了向量，还要存哪些列？
--      （线索：看 lib/rag-types.ts 的 ChunkMeta + lib/retrieve.ts 的 Retrieved——检索结果要展示什么，就得存什么。
--       id 怎么定？content 存正文，source/section/title 存 metadata。）
--   3) 索引：hnsw 还是 ivfflat？opclass 选 vector_cosine_ops / vector_l2_ops / vector_ip_ops 哪个？
--      —— 决定性约束：opclass 必须和你 retrieve.ts 里用的距离运算符配套（用 `<=>` 就配 vector_cosine_ops），
--         否则查询根本不会走这个索引。
--   4) 当前语料才十几块、暴力扫更快，这条索引「用不上」。那为什么还建它？
--      （这是 W7 要看穿的工程层——生产上百万级靠它做什么？写进 weekly-log。）
--
-- 参考：pgvector README（github.com/pgvector/pgvector）的 "Querying" 与 "Indexing" 两节。
-- 自检：写完 pnpm db:migrate 应无报错；pnpm db:ingest 能灌进 7 块；pnpm db:eval 能跑出 top-3 20/20。

-- 你来写（删掉这几行注释，换成真正的 SQL）：
-- create extension if not exists vector;
-- create table if not exists chunks ( ... );
-- create index if not exists chunks_embedding_... on chunks using ... ( ... );
create extension if not exists vector;
create table if not exists chunks (
    id  text primary key,           -- `${source}#${序号}`
    content text not null,
    embedding vector(512) not null,
    source text not null,
    title text,
    section text,
    created_at  timestamptz not null default now()
);

create index if not exists chunks_embedding_hnsw 
    on chunks using hnsw  (embedding vector_cosine_ops );