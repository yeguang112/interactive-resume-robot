/**
 * API 配置
 *
 * 开发环境：使用 Vite 代理 (/api/chat)，API Key 存在 .env 中
 * 生产环境（GitHub Pages）：直接调用 DeepSeek API，Key 通过 VITE_DEEPSEEK_API_KEY 注入
 * 生产环境（Vercel）：使用 /api/chat serverless function
 * 生产环境（GitHub Pages + Cloudflare Worker）：设置 VITE_API_ENDPOINT 为 Worker URL
 */

export const API_ENDPOINT =
  import.meta.env.VITE_API_ENDPOINT ||
  (import.meta.env.PROD ? "https://api.deepseek.com/chat/completions" : "/api/chat");

export const DEEPSEEK_API_KEY =
  import.meta.env.VITE_DEEPSEEK_API_KEY || import.meta.env.DEEPSEEK_API_KEY;

export const IS_DIRECT_API =
  import.meta.env.PROD ||
  import.meta.env.VITE_API_ENDPOINT?.includes("deepseek.com") ||
  false;

export const IS_DEMO_MODE =
  import.meta.env.DEV &&
  (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === "your_deepseek_api_key_here");
