"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { AudioManifest, AudioStatus } from "@/types";

export interface AudioSyncState {
  status: AudioStatus;
  currentSegment: number;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
}

export function useAudioSync(
  sessionId: string,
  manifest: AudioManifest | null,
  onSegmentChange?: (index: number) => void,
  onStatusChange?: (status: AudioStatus) => void
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [state, setState] = useState<AudioSyncState>({
    status: "idle",
    currentSegment: 0,
    currentTime: 0,
    duration: manifest ? manifest.totalDurationMs / 1000 : 0,
    playbackRate: 1,
    volume: 1,
  });

  const segmentIndexRef = useRef(0);

  const getAudioUrl = useCallback(
    (filename: string) =>
      `/api/audio?session=${encodeURIComponent(sessionId)}&file=${encodeURIComponent(filename)}`,
    [sessionId]
  );

  const loadSegment = useCallback(
    (index: number) => {
      if (!manifest || !audioRef.current || index >= manifest.segments.length) return;
      const seg = manifest.segments[index];
      audioRef.current.src = getAudioUrl(seg.filename);
      audioRef.current.playbackRate = state.playbackRate;
      segmentIndexRef.current = index;
      setState((s) => ({ ...s, currentSegment: index }));
      onSegmentChange?.(index);
    },
    [manifest, getAudioUrl, state.playbackRate, onSegmentChange]
  );

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, []);

  const play = useCallback(() => {
    if (!audioRef.current || !manifest) return;
    initAudioContext();
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
    if (!audioRef.current.src) {
      loadSegment(0);
    }
    audioRef.current.play();
    setState((s) => ({ ...s, status: "playing" }));
    onStatusChange?.("playing");
  }, [manifest, initAudioContext, loadSegment, onStatusChange]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((s) => ({ ...s, status: "paused" }));
    onStatusChange?.("paused");
  }, [onStatusChange]);

  const togglePlayPause = useCallback(() => {
    if (state.status === "playing") pause();
    else play();
  }, [state.status, play, pause]);

  const seekForward = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.currentTime + seconds,
        audioRef.current.duration || 0
      );
    }
  }, []);

  const seekBackward = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        audioRef.current.currentTime - seconds,
        0
      );
    }
  }, []);

  const seekToSegment = useCallback(
    (index: number) => {
      loadSegment(index);
      if (state.status === "playing") {
        audioRef.current?.play();
      }
    },
    [loadSegment, state.status]
  );

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    setState((s) => ({ ...s, playbackRate: rate }));
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol;
    setState((s) => ({ ...s, volume: vol }));
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const onEnded = () => {
      if (!manifest) return;
      const next = segmentIndexRef.current + 1;
      if (next < manifest.segments.length) {
        loadSegment(next);
        audio.play();
      } else {
        setState((s) => ({ ...s, status: "ready" }));
        onStatusChange?.("ready");
      }
    };

    const onTimeUpdate = () => {
      if (!manifest) return;
      const seg = manifest.segments[segmentIndexRef.current];
      if (!seg) return;
      const segElapsed = audio.currentTime * 1000;
      const globalTime = (seg.startMs + segElapsed) / 1000;
      setState((s) => ({ ...s, currentTime: globalTime }));
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.pause();
      audio.src = "";
      audioContextRef.current?.close();
    };
  }, [manifest, loadSegment, onStatusChange]);

  return {
    state,
    analyserRef,
    play,
    pause,
    togglePlayPause,
    seekForward,
    seekBackward,
    seekToSegment,
    setPlaybackRate,
    setVolume,
  };
}
