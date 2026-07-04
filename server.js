import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const SYSTEM_PROMPT = `你是马承旭的 AI 数字分身，你的任务是以马承旭的第一人称视角与访客对话。

## 关于马承旭
- 2002 年出生于安徽芜湖
- 目前在深圳大学攻读建筑学研究生
- 本科毕业于北方工业大学，环境设计（空间设计）专业
- 擅长将审美、空间感与 AI 工具结合

## 核心能力
1. **AI 工具工作流**：熟练使用 ChatGPT、Gemini、Claude、Claude Code、Codex、Cursor、Perplexity、Midjourney、ComfyUI 等工具，擅长 Prompt 设计、需求拆解和方案推演
2. **自动化脚本**：用 Python、TypeScript 编写自动化工具，曾开发校园网自动登录工具（分析 GET 请求参数实现自动认证），熟悉 RDP/SSH 远程操作
3. **视觉与 IP 设计**：做过空竹非遗文创 IP 设计（包括 IP 形象、Logo、海报、周边物料），负责过校团委公众号视觉运营
4. **建筑与空间研究**：建筑学研究生背景，关注空间叙事、视觉文化、场景研究和用户体验

## 经历时间线
- 2024.09 至今：深圳大学 建筑学研究生
- 2020.09 - 2024.06：北方工业大学 环境设计本科
- 2021.09 - 2022.06：校团委宣传部 视觉运营
- 2020.09 - 2024.06：校话剧队，获北京大学生舞蹈节三等奖

## 联系方式
- 邮箱：2676177514@qq.com
- 电话：+86 186 0963 9125
- 所在地：深圳

## 对话风格
- 用中文回复为主，必要时混用英文术语
- 语气自然、真诚、有年轻人的活力
- 回答简洁有力，不要过长
- 体现建筑学和 AI 工具的双重背景
- 当被问到不了解的具体细节时，诚实说明
- 如果有人想联系马承旭本人，提供上面的联系方式
- 不要编造简历中没有的经历或项目`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));

const DIST_DIR = join(__dirname, "dist");
const API_KEY = process.env.DEEPSEEK_API_KEY || "";

// ===== TTS 端点 — Edge 神经网络语音 =====
app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text" });
    }

    const truncated = text.slice(0, 3000);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      "zh-CN-YunyangNeural",
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );

    const { audioStream } = tts.toStream(truncated);
    const chunks = [];

    await new Promise((resolve, reject) => {
      audioStream.on("data", (chunk) => chunks.push(chunk));
      audioStream.on("end", resolve);
      audioStream.on("error", reject);
    });
    tts.close();

    const audioBuffer = Buffer.concat(chunks);
    if (audioBuffer.length === 0) {
      throw new Error("TTS produced empty audio");
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    res.send(audioBuffer);
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "TTS error",
    });
  }
});

// ===== Chat 端点 — DeepSeek API 流式代理 =====
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!API_KEY) {
      return res.status(500).json({ error: "DEEPSEEK_API_KEY not configured" });
    }

    // 确保 system prompt 在消息列表首位
    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.filter((m) => m.role !== "system"),
    ];

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: fullMessages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${errText}`);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } else {
      res.end();
    }
  }
});

// ===== 静态文件 =====
app.use(express.static(DIST_DIR));

// ===== SPA fallback — 所有非 API 路由返回 index.html =====
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(join(DIST_DIR, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Key configured: ${API_KEY ? "yes" : "no"}`);
});
