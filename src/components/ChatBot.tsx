import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIChat, type Message } from "@/lib/useAIChat";

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

function MessageBubble({ msg, isStreaming }: { msg: Message; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="mr-2.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--neon)]/30 bg-[rgba(125,249,255,0.06)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--neon)]" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[78%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-[13px] leading-relaxed",
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
    </motion.div>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const { messages, input, setInput, loading, streamingContent, sendMessage, handleSubmit } =
    useAIChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        data-hover
        className="pointer-events-auto fixed bottom-5 right-5 z-[75] flex h-14 w-14 items-center justify-center rounded-full border border-[var(--neon)]/40 bg-[rgba(5,5,8,0.85)] backdrop-blur-xl transition-colors hover:border-[var(--neon)]/70 md:bottom-8 md:right-8"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 2.5, type: "spring", stiffness: 260, damping: 18 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-5 w-5 text-[var(--magenta)]" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles className="h-5 w-5 text-[var(--neon)]" />
            </motion.div>
          )}
        </AnimatePresence>
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--neon)] opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--neon)]" />
          </span>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto fixed bottom-24 right-3 z-[75] flex h-[min(560px,72vh)] w-[min(390px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[rgba(5,5,8,0.92)] shadow-2xl shadow-black/60 backdrop-blur-2xl md:right-8"
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 border-b border-white/8 px-4 py-3.5">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--neon)]/30 bg-gradient-to-br from-[rgba(125,249,255,0.1)] to-[rgba(139,92,246,0.1)]">
                <Sparkles className="h-4 w-4 text-[var(--neon)]" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#050505] bg-[var(--acid)]" />
              </div>
              <div className="flex-1">
                <div className="font-display text-sm font-bold text-white/90">AI 数字分身</div>
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40">
                  <span className="h-1 w-1 rounded-full bg-[var(--acid)]" />
                  马承旭 · online
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                data-hover
                className="text-white/40 transition-colors hover:text-white/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
              {!hasMessages && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center justify-center gap-1 py-8 text-center"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--neon)]/20 bg-[rgba(125,249,255,0.04)]">
                    <Sparkles className="h-5 w-5 text-[var(--neon)]" />
                  </div>
                  <p className="font-display text-sm font-bold text-white/80">和我的数字分身聊聊</p>
                  <p className="mt-1 max-w-[260px] text-[11px] leading-relaxed text-white/40">
                    我是马承旭的 AI 分身，可以聊 AI 工具、设计、建筑或者任何想法
                  </p>
                  <div className="mt-5 flex flex-col gap-2">
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <motion.button
                        key={q}
                        data-hover
                        onClick={() => sendMessage(q)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                        whileHover={{ x: 3 }}
                        className="pointer-events-auto rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3.5 py-2 text-left text-[12px] text-white/60 transition-colors hover:border-[var(--neon)]/30 hover:text-[var(--neon)]"
                      >
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}

              {loading && streamingContent && (
                <MessageBubble msg={{ role: "assistant", content: streamingContent }} isStreaming />
              )}

              {loading && !streamingContent && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="mr-2.5 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--neon)]/30 bg-[rgba(125,249,255,0.06)]">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--neon)]" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md border border-white/10 bg-[rgba(255,255,255,0.04)] px-3.5 py-2.5">
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-white/8 p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入消息..."
                  disabled={loading}
                  className="flex-1 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-3.5 py-2.5 text-[13px] text-white/85 placeholder-white/25 outline-none transition-colors focus:border-[var(--neon)]/40 disabled:opacity-50"
                />
                <motion.button
                  type="submit"
                  disabled={!input.trim() || loading}
                  data-hover
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--neon)]/30 bg-[rgba(125,249,255,0.06)] text-[var(--neon)] transition-colors hover:bg-[rgba(125,249,255,0.12)] disabled:opacity-30"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </motion.button>
              </div>
              <p className="mt-1.5 text-center text-[9px] uppercase tracking-wider text-white/20">
                Powered by DeepSeek · AI 数字分身
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
