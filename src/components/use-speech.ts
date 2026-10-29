"use client";

import { useCallback, useEffect, useState } from "react";

/** Read-aloud with the browser's built-in voices. Available only when a voice speaks the language. */
export function useSpeech(languageCode: string) {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const base = languageCode.toLowerCase().split("-")[0];
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const exact = voices.find((v) => v.lang.toLowerCase() === languageCode.toLowerCase());
      const sameBase = voices.filter((v) => v.lang.toLowerCase().split(/[-_]/)[0] === base);
      setVoice(exact ?? sameBase.find((v) => v.localService) ?? sameBase[0] ?? null);
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pick);
      window.speechSynthesis.cancel();
    };
  }, [languageCode]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voice) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.92;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [voice],
  );

  return { available: voice !== null, speaking, speak, stop };
}
