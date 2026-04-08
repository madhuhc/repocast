import RepoInput from "@/components/RepoInput";
import LandingMockup from "@/components/landing/LandingMockup";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Headphones,
  Mic,
  Radio,
  Sparkles,
  Zap,
  FolderGit2,
  ChevronRight,
} from "lucide-react";

const FEATURES = [
  {
    title: "Reads real files",
    body: "Not a README summary. We ingest priority paths, chunk semantically, and embed for retrieval.",
    icon: Brain,
    className: "md:col-span-2",
    gradient: "from-violet-500/15 via-transparent to-cyan-500/10",
  },
  {
    title: "Two-voice audio",
    body: "Host & guest script with TTS — waveform player + synced transcript.",
    icon: Headphones,
    className: "",
    gradient: "from-cyan-500/12 to-transparent",
  },
  {
    title: "Voice or type",
    body: "Follow-up Q&A grounded in chunks from the repo.",
    icon: Mic,
    className: "",
    gradient: "from-fuchsia-500/10 to-transparent",
  },
  {
    title: "Fast to try",
    body: "Paste a URL. No install. Public repos only in v1.",
    icon: Zap,
    className: "md:col-span-2",
    gradient: "from-amber-500/10 via-transparent to-violet-500/10",
  },
];

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div
        className="pointer-events-none fixed inset-0 -z-20 landing-grid-bg opacity-40"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -left-1/4 top-0 -z-10 h-[min(80vh,720px)] w-[min(90vw,720px)] rounded-full bg-gradient-to-br from-cyan-500/25 via-blue-600/10 to-transparent blur-3xl landing-aurora-blob"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-1/4 bottom-0 -z-10 h-[min(70vh,640px)] w-[min(85vw,640px)] rounded-full bg-gradient-to-tl from-violet-600/20 via-fuchsia-500/5 to-transparent blur-3xl landing-aurora-blob-delayed"
        aria-hidden
      />

      <header className="relative z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/25 to-violet-500/20 ring-1 ring-white/10 transition-transform group-hover:scale-[1.02]">
              <Radio className="h-4 w-4 text-cyan-300" aria-hidden />
            </span>
            <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
              repocast
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <a
              href="#how"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              How it works
            </a>
            <a
              href="#try"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-cyan-500/35 hover:bg-cyan-500/10"
            >
              Try free
              <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
            </a>
            <Link
              href="https://github.com/repocast/repocast"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground sm:inline-flex"
              aria-label="View on GitHub"
            >
              <FolderGit2 className="h-5 w-5" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col">
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-10 sm:gap-16 sm:px-6 sm:pb-24 sm:pt-14 lg:grid-cols-2 lg:items-center lg:gap-10 lg:pt-10">
          <div className="animate-fade-up space-y-8">
            <div className="inline-flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200/95 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
                Code-grounded · Not a generic podcast
              </span>
            </div>

            <div className="space-y-5">
              <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-[2.75rem] lg:leading-[1.08] xl:text-6xl">
                <span className="block bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Ship understanding.
                </span>
                <span className="mt-1 block bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
                  Hear any repo in minutes.
                </span>
              </h1>
              <p className="max-w-xl text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
                Drop a public GitHub link. We ingest source, generate a two-host briefing, synthesize
                audio, and let you ask questions anchored to{" "}
                <span className="font-medium text-slate-200">actual files</span> — so you onboard
                faster without reading 4,000 lines blind.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Zap className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-foreground">Seconds to start</p>
                  <p className="text-xs text-muted-foreground">No CLI. No signup wall in dev.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                  <Brain className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-foreground">RAG that cites code</p>
                  <p className="text-xs text-muted-foreground">Chunks + embeddings, not vibes.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="rounded-full border border-white/5 bg-black/20 px-3 py-1 font-mono">
                Next.js · AI SDK · SQLite sessions
              </span>
            </div>
          </div>

          <div className="animate-fade-up-delay-1 flex justify-center lg:justify-end">
            <LandingMockup />
          </div>
        </section>

        <div
          id="try"
          className="scroll-mt-24 border-y border-white/[0.06] bg-gradient-to-b from-cyan-500/[0.04] via-transparent to-violet-500/[0.03] py-14 sm:py-20"
        >
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <p className="animate-fade-up-delay-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
              Try it now
            </p>
            <h2 className="animate-fade-up-delay-2 mt-3 text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Paste a repo. Get the briefing.
            </h2>
            <p className="animate-fade-up-delay-2 mt-2 text-sm text-muted-foreground sm:text-base">
              Works with any public <span className="font-mono text-slate-300">owner/repo</span> URL.
            </p>
            <div className="animate-fade-up-delay-3 mt-10">
              <RepoInput />
            </div>
          </div>
        </div>

        <section id="how" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300/90">
                Under the hood
              </h2>
              <p className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Built like a product team would ship it
              </p>
              <p className="mt-3 text-muted-foreground sm:text-lg">
                Ingestion, generation, audio, and chat — wired for clarity, not demo fluff.
              </p>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/40 p-6 shadow-xl shadow-black/20 backdrop-blur-sm transition-all duration-300 hover:border-cyan-500/20 hover:shadow-cyan-500/5 ${f.className}`}
                >
                  <div
                    className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60 transition-opacity group-hover:opacity-100 ${f.gradient}`}
                    aria-hidden
                  />
                  <div className="relative flex flex-col gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-300">
                      <f.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.06] px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900/80 to-violet-600/10 px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Stop guessing what the code does. Listen once, then interrogate it.
            </h2>
            <p className="max-w-lg text-sm text-slate-400 sm:text-base">
              Whether you are reviewing an OSS dependency or ramping on an internal fork — start with
              a structured audio pass and a chat that knows the tree.
            </p>
            <a
              href="#try"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 px-8 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all hover:brightness-110"
            >
              Generate a podcast
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </section>

        <footer className="border-t border-white/[0.06] px-4 py-10 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">repocast</span>
              <span aria-hidden>·</span>
              <span>MIT License</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <Link
                href="https://github.com/repocast/repocast"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-cyan-400"
              >
                Star on GitHub
              </Link>
              <span className="hidden sm:inline" aria-hidden>
                |
              </span>
              <span>Open source · Built for developers</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
