// 本地 embedding（从 week-05/06 搬入，逻辑一字不改）——embedding 在 W5 已「看穿」，
// 不是 W7 的变量。本地模型把文本编码成归一化向量，没有 key、不走网络（首次下 ~100MB 模型到本地缓存）。

import { pipeline, env } from "@huggingface/transformers";
import { join } from "node:path";

// 模型缓存指向项目内 .models/（复用自 week-06，避免再走代理下 ~100MB）。
// 从 repo 根目录跑（next / 脚本 cwd 都在根），所以用 cwd 拼绝对路径。
env.cacheDir = join(process.cwd(), ".models");

// bge-small-zh-v1.5：中文友好的小模型（512 维）。入库的 vector(512) 维度对齐它。
const MODEL = "Xenova/bge-small-zh-v1.5";

// bge 的查询指令前缀：只加在「查询」上、文档不加（非对称检索）。CLS pooling + 这个前缀是
// bge「query 模式」配套的两个零件，缺一个都会悄悄掉分（W5 实测）。
const QUERY_PREFIX = "为这个句子生成表示以用于检索相关文章：";

type Extractor = (
  texts: string[],
  opts: { pooling: "mean" | "cls"; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;
const createPipeline = pipeline as unknown as (
  task: string,
  model: string,
  opts?: { dtype?: string },
) => Promise<Extractor>;

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    console.log(`[embed] 加载本地模型 ${MODEL}（cacheDir=.models）…`);
    // dtype:"fp32" 对应缓存里的 onnx/model.onnx；不指定时 v4 可能去找量化版 → 触发下载。
    extractorPromise = createPipeline("feature-extraction", MODEL, {
      dtype: "fp32",
    });
  }
  return extractorPromise;
}

// CLS pooling + L2 归一化（归一化后 cosine 退化成点积，pgvector 里也对应 vector_cosine_ops）。
async function encode(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "cls", normalize: true });
  return output.tolist() as number[][];
}

/** 文档编码：不加前缀。 */
export async function embedDocs(texts: string[]): Promise<number[][]> {
  return encode(texts);
}

/** 查询编码：加 bge 查询指令前缀。 */
export async function embedQuery(query: string): Promise<number[]> {
  const [vec] = await encode([QUERY_PREFIX + query]);
  return vec;
}
