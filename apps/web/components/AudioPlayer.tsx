"use client";

import { useRef, useEffect, useCallback } from "react";
import { useAudioSync } from "@/hooks/useAudioSync";
import { SkipBack, Play, Pause, SkipForward, Volume2, Download } from "lucide-react";
import type { AudioManifest, AudioStatus } from "@/types";

interface Props {
  sessionId: string;
  manifest: AudioManifest;
  onSegmentChange?: (index: number) => void;
  onStatusChange?: (status: AudioStatus) => void;
}

const SPEEDS = [1, 1.5, 2];
const BAR_COUNT = 60;

export default function AudioPlayer({ sessionId, manifest, onSegmentChange, onStatusChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const {
    state,
    analyserRef,
    togglePlayPause,
    seekForward,
    seekBackward,
    setPlaybackRate,
    setVolume,
  } = useAudioSync(sessionId, manifest, onSegmentChange, onStatusChange);

  const currentSpeaker = manifest.segments[state.currentSegment]?.speaker ?? "HOST";
  const totalDuration = manifest.totalDurationMs / 1000;

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) {
      animRef.current = requestAnimationFrame(drawWaveform);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "rgba(15, 23, 42, 0.95)");
    grad.addColorStop(1, "rgba(8, 47, 73, 0.6)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / BAR_COUNT - 2;
    const step = Math.floor(dataArray.length / BAR_COUNT);

    const color = currentSpeaker === "HOST"
      ? "rgba(56, 189, 248,"
      : "rgba(167, 139, 250,";

    for (let i = 0; i < BAR_COUNT; i++) {
      const value = dataArray[i * step] / 255;
      const barHeight = Math.max(2, value * height * 0.78);
      const x = i * (barWidth + 2);
      const y = (height - barHeight) / 2;

      ctx.fillStyle = `${color} ${0.25 + value * 0.75})`;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 3);
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(drawWaveform);
  }, [analyserRef, currentSpeaker]);

  useEffect(() => {
    if (state.status === "playing") {
      animRef.current = requestAnimationFrame(drawWaveform);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [state.status, drawWaveform]);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function nextSpeed() {
    const idx = SPEEDS.indexOf(state.playbackRate);
    setPlaybackRate(SPEEDS[(idx + 1) % SPEEDS.length]);
  }

  async function handleDownload() {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const seg of manifest.segments) {
      const url = `/api/audio?session=${encodeURIComponent(sessionId)}&file=${encodeURIComponent(seg.filename)}`;
      const resp = await fetch(url);
      const blob = await resp.blob();
      zip.file(seg.filename, blob);
    }
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = `${sessionId.replace("/", "-")}-podcast.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const progressPct = totalDuration ? (state.currentTime / totalDuration) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-slate-900/90 to-slate-950 shadow-2xl shadow-black/40 ring-1 ring-white/[0.06]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(34,211,238,0.12),transparent)]" />

      <div className="relative h-28 sm:h-32">
        <canvas
          ref={canvasRef}
          width={800}
          height={128}
          className="h-full w-full"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/90 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-black/35 px-1 py-1 backdrop-blur-md">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors duration-300 ${
                currentSpeaker === "HOST"
                  ? "bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/25"
                  : "bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/25"
              }`}
            >
              {currentSpeaker === "HOST" ? "Alex" : "Sam"}
            </span>
          </span>
          {state.status === "playing" && (
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300/90 sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live
            </span>
          )}
        </div>
      </div>

      <div className="relative border-t border-white/5 px-4 pb-4 pt-1">
        <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="w-10 font-mono tabular-nums text-foreground/90">{formatTime(state.currentTime)}</span>
          <div className="group relative h-2 flex-1 cursor-pointer rounded-full bg-slate-800/90 ring-1 ring-white/5">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-[width] duration-150"
              style={{ width: `${progressPct}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-white/30 bg-white shadow-md transition-[left] duration-150 group-hover:scale-110"
              style={{ left: `calc(${progressPct}% - 6px)` }}
            />
          </div>
          <span className="w-10 text-right font-mono tabular-nums">{formatTime(totalDuration)}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => seekBackward(10)}
              className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              aria-label="Skip back 10 seconds"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={togglePlayPause}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 text-slate-950 shadow-lg shadow-cyan-500/25 transition-transform hover:brightness-110 active:scale-95"
              aria-label={state.status === "playing" ? "Pause" : "Play"}
            >
              {state.status === "playing" ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="ml-0.5 h-6 w-6" />
              )}
            </button>
            <button
              type="button"
              onClick={() => seekForward(10)}
              className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              aria-label="Skip forward 10 seconds"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={nextSpeed}
              className="rounded-lg border border-border/80 bg-background/50 px-2.5 py-1.5 font-mono text-xs font-medium text-muted-foreground transition-colors hover:border-cyan-500/35 hover:text-foreground"
              aria-label={`Playback speed: ${state.playbackRate}x`}
            >
              {state.playbackRate}x
            </button>

            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="h-1.5 w-24 cursor-pointer accent-cyan-400"
                aria-label="Volume"
              />
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-cyan-300"
              aria-label="Download podcast"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
