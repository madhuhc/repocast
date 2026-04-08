"use client";

import type { RepoMeta as RepoMetaType } from "@/types";
import { Star, GitFork, ExternalLink, CircleDot, FolderGit2 } from "lucide-react";

interface Props {
  meta: RepoMetaType;
}

export default function RepoMeta({ meta }: Props) {
  return (
    <div className="surface-card relative overflow-hidden rounded-2xl p-5 md:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-500/15 to-transparent blur-2xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 shadow-inner sm:flex">
            <FolderGit2 className="h-7 w-7 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="font-mono text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              <span className="text-cyan-400/95">{meta.owner}</span>
              <span className="text-muted-foreground/80">/</span>
              <span>{meta.repo}</span>
            </h1>
            {meta.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {meta.description}
              </p>
            )}
          </div>
        </div>
        <a
          href={`https://github.com/${meta.owner}/${meta.repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group shrink-0 rounded-xl border border-border/80 bg-background/40 p-2.5 transition-all hover:border-cyan-500/35 hover:bg-cyan-500/5"
          aria-label="View on GitHub"
        >
          <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-cyan-400" />
        </a>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2.5 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/35 px-3 py-1 text-muted-foreground">
          <Star className="h-3.5 w-3.5 text-amber-400/90" aria-hidden />
          {meta.stars.toLocaleString()} stars
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/35 px-3 py-1 text-muted-foreground">
          <GitFork className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          {meta.forks.toLocaleString()} forks
        </span>
        {meta.primaryLanguage && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/35 px-3 py-1 text-muted-foreground">
            <CircleDot className="h-3.5 w-3.5 text-emerald-400/90" aria-hidden />
            {meta.primaryLanguage}
          </span>
        )}
        {meta.license && (
          <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200/90">
            {meta.license}
          </span>
        )}
      </div>

      {meta.topics.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {meta.topics.slice(0, 8).map((topic) => (
            <span
              key={topic}
              className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 text-xs font-medium text-cyan-200/90"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
