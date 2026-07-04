/**
 * Cloudflare Worker - AI 数字分身 API
 *
 * 部署步骤：
 * 1. 注册 Cloudflare 账号
 * 2. 安装 wrangler: npm install -g wrangler
 * 3. 登录: wrangler login
 * 4. 设置密钥: wrangler secret put DEEPSEEK_API_KEY
 * 5. 部署: wrangler deploy
 *
 * 部署后获取 Worker URL，在前端配置 API_ENDPOINT 即可使用
 */

export interface Env {
  DEEPSEEK_API_KEY: string;
}

const SYSTEM_PROMPT = `你是马承旭的 AI 数字分身，以第一人称视角与访客对话。

关于马承旭：2002年生于芜湖，深圳大学建筑学研究生，北方工业大学环境设计本科。
擅长 AI 工具工作流（ChatGPT/Claude/Codex/Cursor/Midjourney）、自动化脚本（Python/TS）、视觉IP设计、建筑空间研究。
联系方式：2676177514@qq.com / +86 186 0963 9125 / 深圳

对话风格：中文为主，自然真诚，简洁有力，不编造经历。`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    try {
      const { messages } = await request.json();
      const apiKey = env.DEEPSEEK_API_KEY;

      if (!apiKey) {
        return new Response(JSON.stringify({ error: "API key not configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          stream: true,
          max_tokens: 1024,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      // Pass through the streaming response with CORS headers
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          ...corsHeaders,
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  },
};
