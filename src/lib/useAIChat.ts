import { useState, useCallback, useRef, type FormEvent } from "react";
import { SYSTEM_PROMPT } from "@/lib/ai-prompt";
import { API_ENDPOINT, DEEPSEEK_API_KEY, IS_DIRECT_API, KB_ADMIN_PASSWORD } from "@/lib/api-config";
import { logConversation, fetchActiveKnowledge, addKnowledge } from "@/lib/supabase";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface UseAIChatOptions {
  onStreamComplete?: (fullText: string) => void;
}

// 缓存动态知识库，避免每次对话都请求
let cachedKnowledge: string | null = null;
let knowledgeFetchTime = 0;
const KNOWLEDGE_CACHE_MS = 5 * 60 * 1000; // 5 分钟缓存

/** 获取动态知识库文本（有缓存） */
async function getDynamicKnowledge(): Promise<string> {
  const now = Date.now();
  if (cachedKnowledge && now - knowledgeFetchTime < KNOWLEDGE_CACHE_MS) {
    return cachedKnowledge;
  }

  const entries = await fetchActiveKnowledge();
  if (entries.length === 0) {
    cachedKnowledge = "";
    knowledgeFetchTime = now;
    return "";
  }

  const text = entries
    .map((e) => `[${e.category}] ${e.content}`)
    .join("\n");

  cachedKnowledge = text;
  knowledgeFetchTime = now;
  return text;
}

export function useAIChat(options?: UseAIChatOptions) {
  const onStreamCompleteRef = useRef(options?.onStreamComplete);
  onStreamCompleteRef.current = options?.onStreamComplete;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isAdminMode, setIsAdminMode] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const newMessages: Message[] = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      // 1. 检测密码：解锁/关闭管理员模式
      if (trimmed === KB_ADMIN_PASSWORD) {
        setIsAdminMode(true);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "🔓 管理员模式已开启。你现在发的消息会直接写入知识库。输入「退出」或「exit」关闭。" },
        ]);
        setLoading(false);
        return;
      }

      // 2. 关闭管理员模式
      if (isAdminMode && (trimmed === "退出" || trimmed.toLowerCase() === "exit")) {
        setIsAdminMode(false);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "🔒 管理员模式已关闭。" },
        ]);
        setLoading(false);
        return;
      }

      // 3. 管理员模式下：直接写入知识库
      if (isAdminMode) {
        try {
          await addKnowledge({ category: "聊天补充", content: trimmed, source: "前端管理员", active: true });
          // 写入成功后刷新缓存，让 AI 能立即读取新知识
          cachedKnowledge = null;
          knowledgeFetchTime = 0;
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "✅ 已记录到知识库。我会记住这条信息。" },
          ]);
        } catch (e) {
          console.error("[KB] 写入知识库失败:", e);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "❌ 写入知识库失败，请检查 Supabase 配置。" },
          ]);
        } finally {
          setLoading(false);
        }
        return;
      }

      // 4. 普通对话模式
      // 获取动态知识库（非阻塞，失败用空字符串）
      const dynamicKnowledge = await getDynamicKnowledge();
      const systemPrompt = dynamicKnowledge
        ? `${SYSTEM_PROMPT}\n\n## 动态知识库（管理员补充）\n${dynamicKnowledge}`
        : SYSTEM_PROMPT;

      const apiMessages: Message[] = [
        { role: "system", content: systemPrompt },
        ...newMessages,
      ];

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const body: Record<string, unknown> = { messages: apiMessages };

      if (IS_DIRECT_API) {
        // 生产环境直接调用 DeepSeek API（如 GitHub Pages）
        if (!DEEPSEEK_API_KEY) {
          throw new Error("DeepSeek API Key 未配置");
        }
        headers["Authorization"] = `Bearer ${DEEPSEEK_API_KEY}`;
        body.model = "deepseek-chat";
        body.stream = true;
        body.max_tokens = 1024;
        body.temperature = 0.8;
      }

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("text/event-stream") || response.headers.get("Transfer-Encoding") === "chunked") {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

            for (const line of lines) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  setStreamingContent(fullContent);
                }
              } catch {
                // skip non-JSON lines
              }
            }
          }
        }

        setMessages((prev) => [...prev, { role: "assistant", content: fullContent }]);
        onStreamCompleteRef.current?.(fullContent);
        // 非阻塞记录对话（失败不影响聊天）
        logConversation(trimmed, fullContent);
      } else {
        const data = await response.json();
        const content =
          data.choices?.[0]?.delta?.content ||
          data.choices?.[0]?.message?.content ||
          "抱歉，我没有理解你的问题。";
        setMessages((prev) => [...prev, { role: "assistant", content }]);
        onStreamCompleteRef.current?.(content);
        // 非阻塞记录对话
        logConversation(trimmed, content);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "连接出了点问题，请稍后重试。" },
      ]);
    } finally {
      setLoading(false);
      setStreamingContent("");
    }
  }, [messages, loading, isAdminMode]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  return {
    messages,
    input,
    setInput,
    loading,
    streamingContent,
    isAdminMode,
    sendMessage,
    handleSubmit,
  };
}
