"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { fetchAudioUrl } from "@/lib/fetch-audio";

export default function useAudioPlayer(reciterId) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVerseKey, setCurrentVerseKey] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentVerseKey(null);
    };
    const onError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentVerseKey(null);
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentVerseKey(null);
  }, []);

  const playVerse = useCallback(
    async (verseKey) => {
      if (!reciterId) return;
      const audio = audioRef.current;
      if (!audio) return;

      // If same verse is playing, stop it
      if (isPlaying && currentVerseKey === verseKey) {
        stop();
        return;
      }

      // Stop any current playback
      audio.pause();
      audio.currentTime = 0;
      setIsLoading(true);
      setCurrentVerseKey(verseKey);

      try {
        const url = await fetchAudioUrl(reciterId, verseKey);
        audio.src = url;
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        setCurrentVerseKey(null);
      } finally {
        setIsLoading(false);
      }
    },
    [reciterId, isPlaying, currentVerseKey, stop],
  );

  return { playVerse, stop, isPlaying, isLoading, currentVerseKey };
}
