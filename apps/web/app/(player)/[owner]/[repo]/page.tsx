"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import RepoMeta from "@/components/RepoMeta";
import IngestionProgress from "@/components/IngestionProgress";
import AudioPlayer from "@/components/AudioPlayer";
import TranscriptPanel from "@/components/TranscriptPanel";
import ChatPanel from "@/components/ChatPanel";
import { Radio, Loader2, AlertCircle } from "lucide-react";
import type {
  RepoMeta as RepoMetaType,
  PodcastScript,
  AudioManifest,
  IngestProgressEvent,
} from "@/types";

type PageState = "ingesting" | "generating_script" | "synthesizing" | "ready" | "error";

export default function PlayerPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = use(params);
  const sessionId = `${owner}/${repo}`;

  const [pageState, setPageState] = useState<PageState>("ingesting");
  const [meta, setMeta] = useState<RepoMetaType | null>(null);
  const [ingestEvent, setIngestEvent] = useState<IngestProgressEvent | null>(null);
  const [script, setScript] = useState<PodcastScript | null>(null);
  const [manifest, setManifest] = useState<AudioManifest | null>(null);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startBriefing = useCallback(async () => {
    setPageState("generating_script");

    try {
      const response = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data.script) setScript(data.script);
        if (data.manifest) {
          setManifest(data.manifest);
          setPageState("ready");
        }
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.event === "script") {
              setScript(data.script);
            } else if (data.event === "manifest") {
              setManifest(data.manifest);
              setPageState("ready");
            } else if (data.event === "status") {
              if (data.status === "synthesizing") setPageState("synthesizing");
              if (data.status === "generating_script") setPageState("generating_script");
            } else if (data.event === "error") {
              setError(data.message);
              setPageState("error");
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Briefing generation failed");
      setPageState("error");
    }
  }, [owner, repo]);

  useEffect(() => {
    let cancelled = false;

    async function startIngestion() {
      try {
        const response = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo }),
        });

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (cancelled) return;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as IngestProgressEvent;
              setIngestEvent(event);

              if (event.status === "done") {
                startBriefing();
              } else if (event.status === "error") {
                setError(event.message);
                setPageState("error");
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ingestion failed");
          setPageState("error");
        }
      }
    }

    fetch(`/api/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo }),
    }).then(async (resp) => {
      const reader = resp.body?.getReader();
      if (!reader) return;
      const { value } = await reader.read();
      reader.cancel();
      if (value) {
        const text = new TextDecoder().decode(value);
        if (text.includes('"done"') && text.includes("cached")) {
          setIngestEvent({ status: "done", message: "Using cached data.", progress: 100 });
          startBriefing();
          return;
        }
      }
      startIngestion();
    }).catch(() => startIngestion());

    return () => { cancelled = true; };
  }, [owner, repo, startBriefing]);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${owner}/${repo}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.full_name) {
          setMeta({
            owner,
            repo,
            description: data.description ?? null,
            stars: data.stargazers_count ?? 0,
            forks: data.forks_count ?? 0,
            primaryLanguage: data.language ?? null,
            topics: data.topics ?? [],
            defaultBranch: data.default_branch ?? "main",
            license: data.license?.spdx_id ?? null,
            lastPushed: data.pushed_at ?? "",
            openIssuesCount: data.open_issues_count ?? 0,
          });
        }
      })
      .catch(() => {
        setMeta({
          owner, repo,
          description: null, stars: 0, forks: 0,
          primaryLanguage: null, topics: [], defaultBranch: "main",
          license: null, lastPushed: "", openIssuesCount: 0,
        });
      });
  }, [owner, repo]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3.5">
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-xl border border-transparent px-2 py-1.5 text-sm font-semibold text-foreground transition-colors hover:border-border/80 hover:bg-card/50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 ring-1 ring-white/10">
              <Radio className="h-4 w-4 text-cyan-400" aria-hidden />
            </span>
            <span className="hidden sm:inline bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              repocast
            </span>
          </Link>
          <div className="min-w-0 flex-1 text-right sm:text-center">
            <p className="truncate font-mono text-sm text-muted-foreground">
              <span className="text-cyan-400/90">{owner}</span>
              <span className="text-border mx-1">/</span>
              <span className="text-foreground">{repo}</span>
            </p>
          </div>
          <div className="hidden w-[120px] sm:block" aria-hidden />
        </div>
      </header>

      <main className="flex flex-1 flex-col lg:flex-row lg:min-h-0">
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 pb-10 lg:w-3/5 lg:p-8 lg:pb-12">
          {meta && <RepoMeta meta={meta} />}

          {pageState === "ingesting" && (
            <IngestionProgress event={ingestEvent} />
          )}

          {pageState === "generating_script" && (
            <div className="surface-card rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-400/25">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400" aria-hidden />
                </div>
                <div>
                  <p className="font-medium text-foreground">Writing the script</p>
                  <p className="text-sm text-muted-foreground">
                    Turning code context into a two-host conversation…
                  </p>
                </div>
              </div>
            </div>
          )}

          {pageState === "synthesizing" && (
            <div className="surface-card rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-400/25">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-300" aria-hidden />
                </div>
                <div>
                  <p className="font-medium text-foreground">Synthesizing audio</p>
                  <p className="text-sm text-muted-foreground">
                    This can take a minute — we render each segment with TTS…
                  </p>
                </div>
              </div>
            </div>
          )}

          {pageState === "error" && error && (
            <div
              className="flex gap-3 rounded-2xl border border-red-500/35 bg-red-500/10 p-4 text-red-100"
              role="alert"
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-red-300" aria-hidden />
              <p className="text-sm leading-relaxed">{error}</p>
            </div>
          )}

          {pageState === "ready" && manifest && script && (
            <>
              <AudioPlayer
                sessionId={sessionId}
                manifest={manifest}
                onSegmentChange={setCurrentSegment}
              />
              <TranscriptPanel
                script={script}
                currentSegment={currentSegment}
                onSeekToSegment={setCurrentSegment}
              />
            </>
          )}
        </div>

        <aside className="flex min-h-[min(520px,85vh)] flex-col border-t border-border/70 bg-gradient-to-b from-card/30 to-background lg:min-h-0 lg:w-2/5 lg:border-l lg:border-t-0">
          <ChatPanel owner={owner} repo={repo} />
        </aside>
      </main>
    </div>
  );
}
