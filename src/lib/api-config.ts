/**
 * API 配置
 *
 * 开发环境：使用 Vite 代理 (/api/chat)，API Key 存在 .env 中
 * 生产环境（Vercel）：使用 /api/chat serverless function
 * 生产环境（GitHub Pages + Cloudflare Worker）：设置 VITE_API_ENDPOINT 为 Worker URL
 */

export const API_ENDPOINT =
  import.meta.env.VITE_API_ENDPOINT || "/api/chat";

export const IS_DEMO_MODE =
  import.meta.env.DEV &&
  (!import.meta.env.DEEPSEEK_API_KEY ||
    import.meta.env.DEEPSEEK_API_KEY === "your_deepseek_api_key_here");
