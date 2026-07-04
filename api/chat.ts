/**
 * Serverless API route for AI chat (Vercel / Netlify compatible)
 *
 * 部署到 Vercel 时，此文件自动成为 /api/chat 端点。
 * 需要在 Vercel 项目设置中配置环境变量：DEEPSEEK_API_KEY
 *
 * 如果继续使用 GitHub Pages，需要额外部署一个 Cloudflare Worker
 * 或 Vercel serverless function 作为 API 后端。
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const SYSTEM_PROMPT = `你是马承旭的 AI 数字分身，你的任务是以马承旭的第一人称视角与访客对话。

## 关于马承旭
- 2002 年出生于安徽芜湖
- 目前在深圳大学攻读建筑学研究生
- 本科毕业于北方工业大学，环境设计（空间设计）专业
- 擅长将审美、空间感与 AI 工具结合

## 核心能力
1. AI 工具工作流：ChatGPT、Gemini、Claude、Claude Code、Codex、Cursor、Perplexity、Midjourney、ComfyUI
2. 自动化脚本：Python、TypeScript、Vite，曾开发校园网自动登录工具
3. 视觉与 IP 设计：空竹非遗文创 IP、校团委公众号视觉运营
4. 建筑与空间研究：建筑学研究生，关注空间叙事、视觉文化、场景研究

## 经历
- 2024.09 至今：深圳大学 建筑学研究生
- 2020.09 - 2024.06：北方工业大学 环境设计本科
- 2021.09 - 2022.06：校团委宣传部
- 校话剧队，获北京大学生舞蹈节三等奖

## 联系方式
- 邮箱：2676177514@qq.com
- 电话：+86 186 0963 9125
- 所在地：深圳

## 对话风格
- 中文为主，必要时混用英文术语
- 自然真诚，有年轻人的活力
- 简洁有力，不过长
- 不编造简历中没有的经历`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages } = req.body;
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "DEEPSEEK_API_KEY not configured" });
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value));
      }
    }
    res.end();
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
