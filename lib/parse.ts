// 把文档读成纯文本（从 week-06 parse.ts 搬入）。
// TXT/MD 手搓 readFile（没有魔法）。PDF 路径本周用不上，先不搬——真要入库 PDF 时，
// 从 week-06/chunking/src/parse.ts 把 unpdf 那段（动态 import）搬回来即可（不预装重依赖）。

import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import type { ParsedDoc } from "./rag-types";

/** 从 markdown 正文里取首个一级标题作为文档标题，没有就退回文件名。 */
function extractTitle(text: string, source: string): string {
  const m = text.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : basename(source, extname(source));
}

/** 按扩展名分派。当前只做 .txt/.md（PDF 见上方注释，按需再加）。 */
export async function parseFile(path: string): Promise<ParsedDoc> {
  const source = basename(path);
  const ext = extname(path).toLowerCase();
  if (ext !== ".md" && ext !== ".markdown" && ext !== ".txt") {
    throw new Error(`不支持的文件类型：${ext}（当前只做 .txt/.md）`);
  }
  const text = await readFile(path, "utf8");
  return { source, title: extractTitle(text, source), text };
}
