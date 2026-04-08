"use client";

import type { IngestProgressEvent } from "@/types";
import { Database, FolderTree, FileCode, Layers, Sparkles, CheckCircle2 } from "lucide-react";

interface Props {
  event: IngestProgressEvent | null;
}

const STEP_ORDER = [
  "fetching_meta",
  "walking_tree",
  "reading_files",
  "chunking",
  "embedding",
  "done",
] as const;

const STEP_LABELS: Record<string, string> = {
  fetching_meta: "Fetching metadata",
  walking_tree: "Walking file tree",
  reading_files: "Reading files",
  chunking: "Chunking content",
  embedding: "Generating embeddings",
  done: "Complete",
};

const STEP_ICONS = [
  Database,
  FolderTree,
  FileCode,
  Layers,
  Sparkles,
  CheckCircle2,
];

export default function IngestionProgress({ event }: Props) {
  if (!event) {
    return (
      <div className="surface-card rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 ring-1 ring-cyan-400/30">
            <div className="h-5 w-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          </div>
          <div>
            <p className="font-medium text-foreground">Preparing ingestion</p>
            <p className="text-sm text-muted-foreground">Connecting to GitHub…</p>
          </div>
        </div>
      </div>
    );
  }

  const currentIdx = STEP_ORDER.indexOf(
    event.status as (typeof STEP_ORDER)[number]
  );

  return (
    <div className="surface-card rounded-2xl p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-foreground leading-snug">{event.message}</p>
          <p className="mt-1 text-sm text-muted-foreground">Indexing the repo for RAG</p>
        </div>
        <span className="shrink-0 rounded-full border border-border/80 bg-background/50 px-3 py-1 font-mono text-xs text-cyan-400/95">
          {event.progress}%
        </span>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-900/80 ring-1 ring-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-500 transition-all duration-500 ease-out"
          style={{ width: `${event.progress}%` }}
        />
        <div className="pointer-events-none absolute inset-0 animate-shimmer opacity-40" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STEP_ORDER.map((step, i) => {
          const Icon = STEP_ICONS[i] ?? Sparkles;
          const isDone = i < currentIdx || event.status === "done";
          const isCurrent = step === event.status && event.status !== "done";
          return (
            <div
              key={step}
              className={`flex flex-col gap-2 rounded-xl border p-3 transition-colors ${
                isDone
                  ? "border-cyan-500/25 bg-cyan-500/5"
                  : isCurrent
                    ? "border-violet-500/35 bg-violet-500/10 ring-1 ring-violet-500/20"
                    : "border-border/50 bg-background/25 opacity-70"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isDone ? "text-cyan-400" : isCurrent ? "text-violet-300" : "text-muted-foreground"
                  }`}
                  aria-hidden
                />
                {isCurrent && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                )}
              </div>
              <p
                className={`text-[11px] font-medium leading-tight ${
                  isDone || isCurrent ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {STEP_LABELS[step]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
