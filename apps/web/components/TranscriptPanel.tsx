"use client";

import { useRef, useEffect } from "react";
import type { PodcastScript } from "@/types";
import { MessageSquareQuote } from "lucide-react";

interface Props {
  script: PodcastScript;
  currentSegment: number;
  onSeekToSegment?: (index: number) => void;
}

export default function TranscriptPanel({ script, currentSegment, onSeekToSegment }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const el = segmentRefs.current[currentSegment];
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentSegment]);

  return (
    <div
      ref={containerRef}
      className="surface-card max-h-[min(28rem,50vh)] overflow-y-auto rounded-2xl p-4 sm:p-5"
      role="region"
      aria-label="Podcast transcript"
    >
      <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/20">
          <MessageSquareQuote className="h-4 w-4 text-cyan-400" aria-hidden />
        </div>
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Transcript</h3>
          <p className="text-xs text-muted-foreground">Tap a line to jump in the audio</p>
        </div>
      </div>

      <div className="space-y-3">
        {script.segments.map((segment, i) => {
          const isHost = segment.speaker === "HOST";
          const isCurrent = i === currentSegment;
          const isPast = i < currentSegment;
          const opacity = isCurrent ? "opacity-100" : isPast ? "opacity-80" : "opacity-45";

          return (
            <div
              key={i}
              ref={(el) => { segmentRefs.current[i] = el; }}
              className={`flex ${isHost ? "justify-start" : "justify-end"} ${opacity} transition-opacity duration-300`}
            >
              <button
                type="button"
                onClick={() => onSeekToSegment?.(i)}
                className={`group max-w-[min(92%,28rem)] rounded-2xl px-4 py-3 text-left text-sm transition-all duration-300
                  ${isHost
                    ? "border border-sky-500/20 bg-sky-500/[0.07] rounded-bl-md hover:border-sky-500/35"
                    : "border border-violet-500/20 bg-violet-500/[0.07] rounded-br-md hover:border-violet-500/35"
                  }
                  ${isCurrent
                    ? isHost ? "glow-host scale-[1.01]" : "glow-guest scale-[1.01]"
                    : "hover:opacity-100"
                  }
                `}
                aria-label={`${isHost ? "Alex" : "Sam"}: ${segment.text.slice(0, 50)}...`}
              >
                <span
                  className={`mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    isHost ? "text-sky-300/95" : "text-violet-300/95"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isHost ? "bg-sky-400" : "bg-violet-400"
                    } ${isCurrent ? "animate-pulse" : ""}`}
                  />
                  {isHost ? "Alex" : "Sam"}
                </span>
                <span className="block leading-relaxed text-foreground/95">{segment.text}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
