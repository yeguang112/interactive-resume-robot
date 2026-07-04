import { useState, useCallback, useRef, type FormEvent } from "react";
import { SYSTEM_PROMPT } from "@/lib/ai-prompt";
import { API_ENDPOINT } from "@/lib/api-config";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface UseAIChatOptions {
  onStreamComplete?: (fullText: string) => void;
}

export function useAIChat(options?: UseAIChatOptions) {
  const onStreamCompleteRef = useRef(options?.onStreamComplete);
  onStreamCompleteRef.current = options?.onStreamComplete;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

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
      const apiMessages: Message[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...newMessages,
      ];

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const contentType = response.headers.get("Content-Type") || "";

      if (contentType.includes("text/event-stream")) {
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
      } else {
        const data = await response.json();
        const content =
          data.choices?.[0]?.delta?.content ||
          data.choices?.[0]?.message?.content ||
          "抱歉，我没有理解你的问题。";
        setMessages((prev) => [...prev, { role: "assistant", content }]);
        onStreamCompleteRef.current?.(content);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "连接出了点问题，请稍后重试。" },
      ]);
    } finally {
      setLoading(false);
      setStreamingContent("");
    }
  }, [messages, loading]);

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
    sendMessage,
    handleSubmit,
  };
}
