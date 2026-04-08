"use client";

import { useState, useRef, useCallback } from "react";

interface UseVoiceInputReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => void;
  stopRecording: () => Promise<string>;
  error: string | null;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const resolveRef = useRef<((value: string) => void) | null>(null);

  const startRecording = useCallback(() => {
    setError(null);
    transcriptRef.current = "";

    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SR) {
      setError("Voice input not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new (SR as new () => SpeechRecognitionLike)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      transcriptRef.current = transcript;
    };

    recognition.onerror = (event) => {
      console.error("[voice] Recognition error:", event.error);
      if (event.error !== "aborted") {
        setError(`Voice recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (resolveRef.current) {
        resolveRef.current(transcriptRef.current);
        resolveRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      setIsTranscribing(true);
      resolveRef.current = (text: string) => {
        setIsTranscribing(false);
        resolve(text);
      };

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      } else {
        setIsTranscribing(false);
        resolve("");
      }
    });
  }, []);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error,
  };
}
