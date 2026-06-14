// RAG 入库的数据结构（从 week-06 types.ts 搬入）。
// metadata 字段照 roadmap W6：title · section · source · created_at。
// 为什么 chunk 要带 metadata：W9「带引用回答」时，要能说清「这句来自哪份文档的哪一节」。

/** 解析后的整篇文档（chunk 之前的形态）。 */
export type ParsedDoc = {
  source: string; // 来源文件名，如 "sample.md"
  title: string; // 文档标题（首个一级标题，没有就用文件名）
  text: string; // 解析出的纯文本全文
};

export type ChunkMeta = {
  source: string; // 来自哪份文档
  title: string; // 文档标题
  section?: string; // 所属小节标题（只有「按标题切」策略填得出）
  created_at: string; // chunk 生成时间 ISO
};

/** 一个切好的块。id 用 `${source}#${序号}` 方便定位。 */
export type Chunk = {
  id: string;
  text: string;
  meta: ChunkMeta;
};
