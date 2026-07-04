/**
 * 背景轻音乐 Hook（多曲目版）
 * 管理多首 BGM 的播放/暂停/切换，处理浏览器自动播放限制
 */
import { useState, useRef, useCallback, useEffect } from "react";

export interface Track {
  src: string;
  title: string;
}

// 默认曲目列表
export const defaultTracks: Track[] = [
  { src: "/audio/bgm-1.mp3", title: "Ambient Flow" },
  { src: "/audio/bgm-2.mp3", title: "Midnight Echo" },
  { src: "/audio/bgm-3.mp3", title: "Soft Horizon" },
  { src: "/audio/bgm-4.mp3", title: "Quiet Drift" },
  { src: "/audio/bgm-5.mp3", title: "Lunar Tide" },
];

export function useBGM(tracks: Track[] = defaultTracks) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentTrack = tracks[currentIndex];

  // 当曲目切换时更新 audio src
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const wasPlaying = !audio.paused;
    audio.src = currentTrack.src;
    audio.load();

    // 如果之前在播放，切换后继续播放
    if (wasPlaying) {
      audio.play()
        .then(() => {
          setPlaying(true);
          setLoading(false);
        })
        .catch(() => {
          setPlaying(false);
          setLoading(false);
        });
    }
  }, [currentIndex, currentTrack.src]);

  // 初始化 Audio 对象
  useEffect(() => {
    const audio = new Audio();
    audio.loop = false; // 不循环单首，播放完自动下一首
    audio.volume = 0.3;
    audio.preload = "auto";
    audio.src = tracks[0]?.src ?? "";
    audioRef.current = audio;

    const handleCanPlay = () => setError(false);
    const handleError = () => {
      setError(true);
      setLoading(false);
    };
    const handleEnded = () => {
      // 播放完自动下一首
      nextTrack();
    };

    audio.addEventListener("canplaythrough", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("canplaythrough", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextTrack = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
  }, [tracks.length]);

  const prevTrack = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);

  const selectTrack = useCallback((index: number) => {
    if (index >= 0 && index < tracks.length) {
      setCurrentIndex(index);
    }
  }, [tracks.length]);

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
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [playing, error]);

  return {
    playing,
    loading,
    error,
    currentIndex,
    tracks,
    currentTrack,
    toggle,
    nextTrack,
    prevTrack,
    selectTrack,
  };
}
