const BAR_COUNT = 36;

export default function LandingMockup() {
  return (
    <div className="relative w-full max-w-[520px] lg:max-w-none">
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 via-violet-500/15 to-transparent blur-2xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl shadow-black/50 ring-1 ring-white/[0.07] backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-white/5 bg-slate-900/90 px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="ml-2 flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/5 bg-black/40 px-3 py-1.5 font-mono text-[11px] text-slate-400">
            <span className="shrink-0 text-emerald-400/90">●</span>
            <span className="truncate">repocast.app / vercel / next.js</span>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
                Now playing
              </span>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-200">
                Alex
              </span>
            </div>
            <div className="flex h-20 items-end justify-center gap-0.5 sm:gap-px">
              {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <span
                  key={i}
                  className="landing-wave-bar w-[3px] rounded-full bg-gradient-to-t from-cyan-600 to-cyan-300 sm:w-1"
                  style={{
                    height: `${18 + ((i * 17) % 55)}%`,
                    animationDelay: `${(i % 12) * 0.08}s`,
                    animationDuration: `${0.75 + (i % 5) * 0.06}s`,
                  }}
                />
              ))}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-sky-500/15 bg-sky-500/[0.06] p-3 text-[11px] leading-snug text-slate-300">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-sky-400">
                Alex
              </span>
              “So the App Router co-locates server and client components…”
            </div>
            <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.06] p-3 text-[11px] leading-snug text-slate-300 sm:text-right">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-violet-300 sm:text-right">
                Sam
              </span>
              “And streaming keeps time-to-first-byte tiny.”
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-medium text-slate-500">
              <span className="rounded bg-violet-500/15 px-1.5 py-0.5 font-mono text-violet-300">
                RAG
              </span>
              Ask the codebase
            </div>
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-[11px] text-cyan-100/90">
              Where is middleware executed in this repo?
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
              Answers cite real paths — not vibes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
