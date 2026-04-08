"use client";

import { useVoiceInput } from "@/hooks/useVoiceInput";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface Props {
  onTranscript: (text: string) => void;
}

export default function VoiceButton({ onTranscript }: Props) {
  const { isRecording, isTranscribing, startRecording, stopRecording, error } = useVoiceInput();

  async function handleClick() {
    if (isRecording) {
      const text = await stopRecording();
      if (text.trim()) {
        onTranscript(text.trim());
      }
    } else {
      startRecording();
    }
  }

  if (isTranscribing) {
    return (
      <button
        type="button"
        disabled
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground"
        aria-label="Transcribing..."
      >
        <Loader2 className="h-5 w-5 animate-spin" />
      </button>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={handleClick}
        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
          isRecording
            ? "border-red-500/45 bg-red-500/15 text-red-200 shadow-[0_0_0_1px_rgba(248,113,113,0.25)]"
            : "border-border/70 bg-card/50 text-muted-foreground hover:border-cyan-500/35 hover:bg-cyan-500/5 hover:text-cyan-200"
        }`}
        aria-label={isRecording ? "Stop recording" : "Start voice input"}
        title={error ?? (isRecording ? "Click to stop" : "Click to speak")}
      >
        {isRecording ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>
      {isRecording && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 ring-2 ring-background" />
        </span>
      )}
    </div>
  );
}
