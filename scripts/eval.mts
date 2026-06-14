// RAG 检索 eval（roadmap W7：扩到 20 条）。对入库数据跑批，判 top-1 / top-3 命中。
// 跑法：pnpm db:eval   （需先 pnpm db:ingest）
// 判定按「内容」不按「section 标签」：expectText = 只在正确小节出现的短语，召回片段含它 = 真召回。
// expectText 为 null = 语料外问题，期望「检索不到」——top-1 相似度低于 REJECT_THRESHOLD 即算对（拒答依据）。

import { retrieve } from "../lib/retrieve";
import { sql } from "../lib/db";

const REJECT_THRESHOLD = 0.35; // W5 实测：语料内 ~0.5–0.65，语料外 ~0.2–0.29，0.35 是断崖中线

type Case = { q: string; expectSection: string; expectText: string | null; note?: string };

const cases: Case[] = [
  // ── 直球 ──
  { q: "知识库支持哪些文件类型？", expectSection: "支持的文件类型", expectText: "三类文件" },
  { q: "系统什么时候会拒答？", expectSection: "引用与拒答", expectText: "直接拒答" },
  { q: "我的资料会上传到第三方吗？", expectSection: "隐私", expectText: "第三方" },
  { q: "知识库和普通文件夹有什么区别？", expectSection: "什么是知识库", expectText: "语义检索" },
  { q: "回答会标注来源吗？", expectSection: "引用与拒答", expectText: "依据了哪些片段" },
  { q: "embedding 是在本地算还是云端算？", expectSection: "隐私", expectText: "本地模型计算" },
  { q: "这份文档是用来做什么的？", expectSection: "（前言）", expectText: "chunking 实验", note: "前言归到文档标题" },
  // ── 长段内（最考验切法）──
  { q: "为什么切块的大小会影响回答质量？", expectSection: "资料是怎么被检索到的", expectText: "丢失上下文", note: "答案在长段" },
  { q: "块切得太大会有什么问题？", expectSection: "资料是怎么被检索到的", expectText: "检索会不精确", note: "需和『太小』区分" },
  { q: "块切得太小会有什么问题？", expectSection: "资料是怎么被检索到的", expectText: "单块信息不足", note: "需和『太大』区分" },
  // ── 数字 / 否定 / 段末 ──
  { q: "单个文件大小上限是多少？", expectSection: "支持的文件类型", expectText: "20 MB", note: "数字在段末" },
  { q: "支持 Word 文档吗？", expectSection: "支持的文件类型", expectText: "暂不支持", note: "否定句" },
  { q: "PDF 导入需要特殊处理吗？", expectSection: "支持的文件类型", expectText: "文本抽取" },
  { q: "可以完全离线、不联网使用吗？", expectSection: "隐私", expectText: "本地大模型", note: "答案在段末" },
  // ── 列表项 ──
  { q: "删除文档后它的向量还在吗？", expectSection: "常见问题", expectText: "彻底", note: "列表项" },
  { q: "能同时跨多份文档提问吗？", expectSection: "常见问题", expectText: "全部资料范围内", note: "列表项" },
  // ── 横跨 / 易混 ──
  { q: "知识库和通用聊天机器人有什么不同？", expectSection: "引用与拒答", expectText: "只对你的资料负责", note: "易和『隐私』混" },
  // ── W7 新增 3 条（凑到 20）──
  { q: "导入文档后多久能检索到？", expectSection: "常见问题", expectText: "几秒内", note: "新增·列表项" },
  { q: "知识库对写作者最大的价值是什么？", expectSection: "什么是知识库", expectText: "重新调出来用", note: "新增·长段内" },
  { q: "明朝有几个皇帝？", expectSection: "（语料外）", expectText: null, note: "新增·拒答测试：期望检索不到" },
];

let top1 = 0;
let top3 = 0;
const fails: string[] = [];

for (const c of cases) {
  const hits = await retrieve(c.q, 3);
  const score = hits[0]?.similarity ?? 0;

  if (c.expectText === null) {
    // 语料外：top-1 低于阈值 = 正确拒答
    const ok = score < REJECT_THRESHOLD;
    if (ok) {
      top1++;
      top3++;
    } else {
      fails.push(`[拒答未触发] ${c.q} — top-1=${score.toFixed(3)} ≥ ${REJECT_THRESHOLD}`);
    }
    console.log(`${ok ? "✓" : "✗"} 〔拒答〕${c.q}  top-1=${score.toFixed(3)}`);
    continue;
  }

  const hit1 = hits[0]?.content.includes(c.expectText) ?? false;
  const hit3 = hits.some((h) => h.content.includes(c.expectText!));
  if (hit1) top1++;
  if (hit3) top3++;
  else fails.push(`[漏召回] ${c.q} — 期望含「${c.expectText}」，top-3 命中小节：${hits.map((h) => h.section ?? "—").join(" / ")}`);

  console.log(`${hit3 ? (hit1 ? "✓" : "◐") : "✗"} ${c.q}  〈${hits[0]?.section ?? "—"}〉 ${score.toFixed(3)}`);
}

console.log(`\n── 汇总（${cases.length} 题）──`);
console.log(`top-1 命中：${top1}/${cases.length}`);
console.log(`top-3 命中：${top3}/${cases.length}（◐=召回到但 top-1 偏）`);
if (fails.length) {
  console.log(`\n未过 ${fails.length} 条：`);
  fails.forEach((f) => console.log("  " + f));
}
await sql.end();
