// 切块：只保留 heading 切法。W6 三种切法对比的结论是 heading 胜出——纯度 1.00（零噪声）+
// 每块自带 section 标签（W9 引用直接可用）。paragraph/fixed 是 W6 实验对照物，不进成品仓。
// 见 ../../week-06/chunking 与 content/w07-chunking-affects-quality.md。

import type { Chunk, ParsedDoc } from "./rag-types";

const NOW = () => new Date().toISOString();

/** 把若干段文本统一打包成 Chunk[]（带 metadata），过滤空块。 */
function pack(doc: ParsedDoc, pieces: { text: string; section?: string }[]): Chunk[] {
  return pieces
    .map((p) => ({ text: p.text.trim(), section: p.section }))
    .filter((p) => p.text.length > 0)
    .map((p, i) => ({
      id: `${doc.source}#${i}`,
      text: p.text,
      meta: { source: doc.source, title: doc.title, section: p.section, created_at: NOW() },
    }));
}

/**
 * 按 markdown 标题（level ≤ 2）切，一节一块，标题文字进 meta.section。
 * 首个标题前的正文（preamble）section 留空、归到文档自身。
 */
export function chunkByHeading(doc: ParsedDoc): Chunk[] {
  const pieces: { text: string; section: string }[] = [];
  let curText = "";
  let curSection = "";

  doc.text.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^(#{1,6})\s+(.+)/);
    const level = m ? m[1].length : 0;

    if (level > 0 && level <= 2) {
      if (curText.trim().length > 0) {
        pieces.push({ text: curText, section: curSection });
        curText = "";
      }
      curSection = m![2].trim();
    } else {
      curText += line + "\n";
    }
  });

  if (curText.trim().length > 0) {
    pieces.push({ text: curText, section: curSection });
  }

  return pack(doc, pieces);
}
