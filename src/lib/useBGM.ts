/**
 * 背景轻音乐 Hook
 * 管理 BGM 的播放/暂停，处理浏览器自动播放限制
 */
import { useState, useRef, useCallback, useEffect } from "react";

export function useBGM(musicSrc = "/audio/bgm.mp3") {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [canPlay, setCanPlay] = useState(false); // 是否已用户交互过（绕过自动播放限制）
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false); // 音乐文件是否加载失败

  // 初始化 Audio 对象
  useEffect(() => {
    const audio = new Audio(musicSrc);
    audio.loop = true;
    audio.volume = 0.3; // 轻音乐，音量较低
    audio.preload = "auto";
    audioRef.current = audio;

    const handleCanPlay = () => setCanPlay(true);
    const handleError = () => setError(true);

    audio.addEventListener("canplaythrough", handleCanPlay, { once: true });
    audio.addEventListener("error", handleError, { once: true });

    return () => {
      audio.removeEventListener("canplaythrough", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audioRef.current = null;
    };
  }, [musicSrc]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || error) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      setLoading(true);
      audio.play()
        .then(() => {
          setPlaying(true);
          setLoading(false);
          setCanPlay(true);
        })
        .catch(() => {
          // 自动播放被阻止，需要用户交互
          setLoading(false);
          setCanPlay(false);
        });
    }
  }, [playing, error]);

  return { playing, loading, canPlay, error, toggle };
}
