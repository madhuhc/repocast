"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseGitHubUrl } from "@/lib/utils";
import { Sparkles, ArrowRight } from "lucide-react";

const EXAMPLES = [
  { owner: "facebook", repo: "react", label: "facebook/react" },
  { owner: "langchain-ai", repo: "langgraph", label: "langchain-ai/langgraph" },
  { owner: "anthropics", repo: "anthropic-sdk-typescript", label: "anthropics/anthropic-sdk-typescript" },
];

const STORAGE_KEY = "repocast:recent";

export default function RepoInput() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as string[];
      queueMicrotask(() => setRecent(parsed));
    } catch {
      // ignore
    }
  }, []);

  function addToRecent(owner: string, repo: string) {
    const entry = `${owner}/${repo}`;
    const updated = [entry, ...recent.filter((r) => r !== entry)].slice(0, 5);
    setRecent(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      setError("That doesn't look like a GitHub URL. Try: https://github.com/owner/repo");
      return;
    }

    setLoading(true);
    addToRecent(parsed.owner, parsed.repo);
    router.push(`/${parsed.owner}/${parsed.repo}`);
  }

  function goToRepo(owner: string, repo: string) {
    addToRecent(owner, repo);
    router.push(`/${owner}/${repo}`);
  }

  const chipClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/50 px-3 py-1.5 text-sm font-mono text-muted-foreground transition-all duration-200 hover:border-cyan-500/40 hover:bg-cyan-500/5 hover:text-foreground";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <form onSubmit={handleSubmit} className="relative">
        <div className="rounded-2xl border border-border/70 bg-card/40 p-1.5 shadow-xl shadow-black/30 backdrop-blur-md sm:flex sm:items-stretch sm:gap-2">
          <div className="relative flex-1 min-w-0">
            <label htmlFor="repo-url" className="sr-only">
              GitHub repository URL
            </label>
            <input
              id="repo-url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              placeholder="https://github.com/owner/repo"
              className="w-full rounded-xl border border-transparent bg-background/60 px-4 py-3.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/80 focus:border-cyan-500/40 focus:bg-background/80 focus:outline-none focus:ring-0 sm:py-3"
              aria-label="GitHub repository URL"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:mt-0 sm:w-auto sm:shrink-0 sm:px-6"
          >
            {loading ? (
              "Opening…"
            ) : (
              <>
                <Sparkles className="h-4 w-4 opacity-90" aria-hidden />
                Generate
                <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <p
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}

      {recent.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/90">
            Recently explored
          </p>
          <div className="flex flex-wrap gap-2">
            {recent.map((entry) => {
              const [o, r] = entry.split("/");
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => goToRepo(o, r)}
                  className={chipClass}
                >
                  {entry}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/90">
          Try an example
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => goToRepo(ex.owner, ex.repo)}
              className={chipClass}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
