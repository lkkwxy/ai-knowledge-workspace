import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // transformers.js 依赖 onnxruntime-node（含原生二进制），不能被打包进 bundle，标为 server 外部包。
  serverExternalPackages: ["@huggingface/transformers"],
};

export default nextConfig;
