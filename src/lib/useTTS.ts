import { useState, useCallback, useRef, useEffect } from "react";

/**
 * 语音合成 Hook — 基于 Edge TTS 神经网络语音
 * 通过 /api/tts 端点调用微软 Edge 在线 TTS，音质远超浏览器内置语音
 */

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [autoRead, setAutoRead] = useState(true); // 默认开启自动朗读
  const [supported] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioRef.current?.pause();
    };
  }, []);

  /** 清理文本中的 Markdown 符号，避免 TTS 读出 ** 等符号 */
  const cleanTextForTTS = (text: string): string => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")   // **粗体** → 粗体
      .replace(/\*(.*?)\*/g, "$1")       // *斜体* → 斜体
      .replace(/`(.*?)`/g, "$1")         // `代码` → 代码
      .replace(/#{1,6}\s?/g, "")         // ### 标题 → 标题
      .replace(/\[(.*?)\]\(.*?\)/g, "$1") // [文字](链接) → 文字
      .replace(/(\n\d+\.\s)/g, "。")      // 数字列表换行 → 用句号分隔
      .replace(/\n/g, "。")              // 换行 → 句号
      .replace(/\s+/g, " ")              // 多个空格 → 一个空格
      .trim();
  };

  /** 朗读文本 — 调用 Edge TTS 获取音频并播放 */
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // 清理 Markdown 符号，避免 TTS 读出 ** 等
    const cleanedText = cleanTextForTTS(text);
    if (!cleanedText) return;

    // 停止当前播放
    abortRef.current?.abort();
    audioRef.current?.pause();
    setSpeaking(true);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanedText }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS error: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // 清理旧的 audio 对象
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch (error) {
      // AbortError 是正常的停止行为，不报错
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("TTS playback error:", error);
      }
      setSpeaking(false);
    }
  }, []);

  /** 停止朗读 */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  /** 切换自动朗读 */
  const toggleAutoRead = useCallback(() => {
    setAutoRead((prev) => {
      const next = !prev;
      if (!next) {
        // 关闭时停止当前朗读
        abortRef.current?.abort();
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setSpeaking(false);
      }
      return next;
    });
  }, []);

  return {
    speaking,
    autoRead,
    supported,
    speak,
    stop,
    toggleAutoRead,
  };
}
