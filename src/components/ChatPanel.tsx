import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Loader2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIChat, type Message } from "@/lib/useAIChat";
import { useTTS } from "@/lib/useTTS";

const SUGGESTED_QUESTIONS = [
  "你是谁？",
  "做过什么项目？",
  "擅长哪些 AI 工具？",
  "怎么联系你？",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--neon)]"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg, isStreaming, onPlayVoice }: { msg: Message; isStreaming?: boolean; onPlayVoice?: (text: string) => void }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex w-full gap-2", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="mr-0 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--neon)]/30 bg-[rgba(125,249,255,0.06)]">
          <Sparkles className="h-3 w-3 text-[var(--neon)]" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-[13px] leading-relaxed",
          isUser
            ? "rounded-2xl rounded-br-md border border-[var(--magenta)]/25 bg-[rgba(255,45,146,0.08)] text-white/90"
            : "rounded-2xl rounded-bl-md border border-white/10 bg-[rgba(255,255,255,0.04)] text-white/80"
        )}
      >
        {msg.content}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-[var(--neon)] align-middle" />
        )}
      </div>
      {/* 只有 AI 消息且非流式中才显示语音播放按钮 */}
      {!isUser && !isStreaming && msg.content && onPlayVoice && (
        <button
          onClick={() => onPlayVoice(msg.content)}
          data-hover
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[rgba(255,255,255,0.03)] text-white/35 transition-all hover:border-[var(--neon)]/40 hover:text-[var(--neon)] hover:bg-[rgba(125,249,255,0.06)]"
          title="播放语音"
        >
          <Volume2 className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}

interface ChatPanelProps {
  onClose: () => void;
}

export default function ChatPanel({ onClose }: ChatPanelProps) {
  const { speaking, autoRead, supported: ttsSupported, speak, stop: stopSpeaking, toggleAutoRead } = useTTS();

  const onStreamComplete = useCallback(
    (fullText: string) => {
      // autoRead 默认开启，主动触发语音播报
      if (autoRead) {
        speak(fullText);
      }
    },
    [autoRead, speak]
  );

  const { messages, input, setInput, loading, streamingContent, sendMessage, handleSubmit } =
    useAIChat({ onStreamComplete });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className="flex h-full flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--neon)]/30 bg-gradient-to-br from-[rgba(125,249,255,0.1)] to-[rgba(139,92,246,0.1)]">
            <Sparkles className="h-4 w-4 text-[var(--neon)]" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#050505] bg-[var(--acid)]" />
          </div>
          <div>
            <div className="font-display text-base font-bold text-white/90">AI 数字分身</div>
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40">
              <span className="h-1 w-1 rounded-full bg-[var(--acid)]" />
              马承旭 · online
            </div>
          </div>
        </div>
        {/* TTS controls */}
        {ttsSupported && (
          <div className="flex items-center gap-1.5">
            {speaking && (
              <button
                onClick={stopSpeaking}
                data-hover
                className="rounded-lg border border-[var(--magenta)]/30 bg-[rgba(255,45,146,0.06)] px-2.5 py-1.5 text-[11px] text-[var(--magenta)] transition-colors hover:bg-[rgba(255,45,146,0.12)]"
              >
                停止
              </button>
            )}
            <button
              onClick={toggleAutoRead}
              data-hover
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-all",
                autoRead
                  ? "border-[var(--neon)]/40 bg-[rgba(125,249,255,0.08)] text-[var(--neon)]"
                  : "border-white/10 bg-[rgba(255,255,255,0.03)] text-white/35 hover:border-[var(--neon)]/30"
              )}
              title={autoRead ? "关闭自动朗读" : "开启自动朗读"}
            >
              {autoRead ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              <span className="hidden sm:inline">自动朗读</span>
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
        {!hasMessages && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-1 py-12 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--neon)]/20 bg-[rgba(125,249,255,0.04)]">
              <Sparkles className="h-7 w-7 text-[var(--neon)]" />
            </div>
            <p className="font-display text-lg font-bold text-white/80">和我聊聊吧</p>
            <p className="mt-2 max-w-[300px] text-[12px] leading-relaxed text-white/40">
              我是马承旭的 AI 数字分身，可以聊 AI 工具、建筑设计、视觉 IP 或者任何想法
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <motion.button
                  key={q}
                  data-hover
                  onClick={() => sendMessage(q)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3.5 py-2 text-[12px] text-white/55 transition-colors hover:border-[var(--neon)]/30 hover:text-[var(--neon)]"
                >
                  {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} onPlayVoice={speak} />
        ))}

        {loading && streamingContent && (
          <MessageBubble msg={{ role: "assistant", content: streamingContent }} isStreaming />
        )}

        {loading && !streamingContent && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
            <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--neon)]/30 bg-[rgba(125,249,255,0.06)]">
              <Sparkles className="h-3 w-3 text-[var(--neon)]" />
            </div>
            <div className="rounded-2xl rounded-bl-md border border-white/10 bg-[rgba(255,255,255,0.04)] px-3.5 py-2.5">
              <TypingDots />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-white/8 p-4">
        <div className="flex items-center gap-2.5">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            disabled={loading}
            className="flex-1 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-[14px] text-white/85 placeholder-white/25 outline-none transition-colors focus:border-[var(--neon)]/40 disabled:opacity-50"
          />
          <motion.button
            type="submit"
            disabled={!input.trim() || loading}
            data-hover
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--neon)]/30 bg-[rgba(125,249,255,0.06)] text-[var(--neon)] transition-colors hover:bg-[rgba(125,249,255,0.12)] disabled:opacity-30"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </motion.button>
        </div>
        <p className="mt-2 text-center text-[9px] uppercase tracking-wider text-white/20">
          Powered by DeepSeek · AI 数字分身
        </p>
      </form>
    </motion.div>
  );
}
