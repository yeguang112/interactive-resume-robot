import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface MusicButtonProps {
  playing: boolean;
  loading: boolean;
  error?: boolean;
  onToggle: () => void;
}

// 音符图标动画变体
const noteVariants: Variants = {
  animate: (i: number) => ({
    y: [0, -8, 0],
    opacity: [0.4, 1, 0.4],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      delay: i * 0.2,
      ease: "easeInOut",
    },
  }),
};

export default function MusicButton({ playing, loading, error, onToggle }: MusicButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onToggle}
      disabled={error}
      className={cn(
        "group relative flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all",
        error
          ? "cursor-not-allowed border-white/10 bg-black/40 text-white/20"
          : "border-white/15 bg-black/40 text-white/60 hover:border-[var(--neon)]/50 hover:text-[var(--neon)]"
      )}
      title={error ? "未添加音乐文件" : playing ? "暂停音乐" : "播放音乐"}
    >
      {/* 播放状态：跳动的音符动画 */}
      {playing && !error && (
        <div className="flex items-end gap-[2px] px-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              custom={i}
              animate="animate"
              variants={noteVariants}
              className="inline-block w-[3px] rounded-full bg-[var(--neon)]"
              style={{ height: `${6 + i * 3}px` }}
            />
          ))}
        </div>
      )}

      {/* 暂停状态：音符图标 */}
      {!playing && !loading && !error && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )}

      {/* 音乐文件不存在 */}
      {error && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}

      {/* 加载状态 */}
      {loading && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="animate-spin"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="32"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* 播放时的脉冲光晕 */}
      {playing && (
        <motion.span
          animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 rounded-full border border-[var(--neon)]/40"
        />
      )}
    </motion.button>
  );
}
