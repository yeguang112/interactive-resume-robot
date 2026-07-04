import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

function generateDemoResponse(messages: Array<{ role: string; content: string }>) {
  const lastMessage = messages[messages.length - 1]?.content || "";
  const lowerMsg = lastMessage.toLowerCase();

  let reply = "";
  if (lowerMsg.includes("你好") || lowerMsg.includes("hi") || lowerMsg.includes("hello") || lowerMsg.includes("嗨")) {
    reply = "你好！我是马承旭的 AI 数字分身。你可以问我关于 AI 工具、建筑设计、视觉 IP 或者自动化脚本方面的事情。不过目前我还在初始化中——需要在 .env 文件配置 DeepSeek API Key 才能真正对话哦。";
  } else if (lowerMsg.includes("联系方式") || lowerMsg.includes("联系") || lowerMsg.includes("email") || lowerMsg.includes("邮箱")) {
    reply = "你可以通过以下方式联系马承旭本人：\n📧 邮箱：2676177514@qq.com\n📱 电话：+86 186 0963 9125\n📍 所在地：深圳";
  } else if (lowerMsg.includes("项目") || lowerMsg.includes("作品") || lowerMsg.includes("work")) {
    reply = "马承旭做过几个有意思的项目：\n1. 校园网自动登录工具（Python）\n2. 空竹非遗文创 IP 设计\n3. 校团委公众号视觉运营\n4. 建筑学与空间表达研究\n\n想深入了解哪个可以继续问我～不过要真正对话需要在 .env 配置 DeepSeek API Key。";
  } else if (lowerMsg.includes("技能") || lowerMsg.includes("工具") || lowerMsg.includes("skill") || lowerMsg.includes("ai")) {
    reply = "马承旭的 AI 工具箱很丰富：ChatGPT、Claude、Codex、Cursor 用于编码和写作；Midjourney、ComfyUI 做视觉探索；Perplexity 做调研。还有 Python/TypeScript 脚本能力。\n\n⚠️ 当前是演示模式，配置 DeepSeek API Key 后可以自由对话。";
  } else {
    reply = `我收到了你的消息："${lastMessage.slice(0, 50)}"\n\n⚠️ 当前是演示模式，我只能给出预设回复。请在项目根目录的 .env 文件中设置 DEEPSEEK_API_KEY，然后重启开发服务器，就能和真正的 AI 数字分身对话了。\n\n获取 API Key：https://platform.deepseek.com/`;
  }

  return {
    choices: [
      {
        delta: { content: reply },
        finish_reason: "stop",
      },
    ],
    demo: true,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: process.env.GITHUB_PAGES === "true" ? "/interactive-resume-robot/" : "/",
    plugins: [
      react(),
      {
        name: "deepseek-proxy",
        configureServer(server) {
          // ===== TTS 端点 — Edge 神经网络语音 =====
          server.middlewares.use("/api/tts", async (req, res) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            let body = "";
            for await (const chunk of req) {
              body += chunk;
            }

            try {
              const { text } = JSON.parse(body);
              if (!text || typeof text !== "string") {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing text" }));
                return;
              }

              // 限制文本长度，防止超长输入
              const truncated = text.slice(0, 3000);

              const tts = new MsEdgeTTS();
              await tts.setMetadata(
                "zh-CN-YunyangNeural", // 青年男声，自然对话风格
                OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
              );

              // toStream 返回 { audioStream, metadataStream }，audioStream 是 Node Readable
              const { audioStream } = tts.toStream(truncated);
              const chunks: Buffer[] = [];

              await new Promise<void>((resolve, reject) => {
                audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
                audioStream.on("end", () => resolve());
                audioStream.on("error", (err: Error) => reject(err));
              });
              tts.close();

              const audioBuffer = Buffer.concat(chunks);
              if (audioBuffer.length === 0) {
                throw new Error("TTS produced empty audio");
              }

              res.setHeader("Content-Type", "audio/mpeg");
              res.setHeader("Cache-Control", "no-cache");
              res.end(audioBuffer);
            } catch (error) {
              console.error("TTS API error:", error);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: error instanceof Error ? error.message : "TTS error",
                })
              );
            }
          });

          // ===== Chat 端点 — DeepSeek API =====
          server.middlewares.use("/api/chat", async (req, res) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            let body = "";
            for await (const chunk of req) {
              body += chunk;
            }

            try {
              const { messages } = JSON.parse(body);
              const apiKey = env.DEEPSEEK_API_KEY;

              if (!apiKey || apiKey === "your_deepseek_api_key_here") {
                // Demo mode - no API key configured
                const demoResponse = generateDemoResponse(messages);
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(demoResponse));
                return;
              }

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

              // Stream the response back to the client
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
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: error instanceof Error ? error.message : "Unknown error",
                })
              );
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  };
});
