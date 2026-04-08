# CLAUDE.md — repocast

This is the reference document for AI agents working on the repocast codebase.

## What is repocast

repocast turns any public GitHub repository into a two-voice AI podcast briefing with RAG-powered voice Q&A. It reads actual source files via the GitHub REST API, chunks them semantically, generates a conversational script with an LLM, synthesizes audio with TTS, and lets users ask follow-up questions grounded in the real code.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode, no `any`) |
| Styling | Tailwind CSS v4 (no shadcn/ui base components installed yet) |
| AI SDK | Vercel AI SDK v6 (`ai@6.x`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/openai-compatible`) |
| TTS | Kokoro TTS via `kokoro-js` (local, primary) / ElevenLabs API (cloud fallback) |
| Embeddings | `@huggingface/transformers` with `Xenova/all-MiniLM-L6-v2` (384-dim, in-process) |
| Storage | SQLite via `better-sqlite3` (WAL mode, stored at `data/sessions.db`) |
| Package Manager | pnpm (monorepo with `pnpm-workspace.yaml`) |
| Runtime | Node.js 20+ |

## Repository Structure

```
repocast/
├── apps/web/                         # Next.js web application
│   ├── app/
│   │   ├── layout.tsx                # Root layout (Inter + JetBrains Mono, dark mode)
│   │   ├── page.tsx                  # Landing page
│   │   ├── globals.css               # Design system CSS variables
│   │   ├── (player)/[owner]/[repo]/
│   │   │   └── page.tsx              # Player page (state machine orchestrator)
│   │   └── api/
│   │       ├── ingest/route.ts       # POST: SSE-streamed repo ingestion
│   │       ├── briefing/route.ts     # POST: SSE-streamed script gen + TTS
│   │       ├── chat/route.ts         # POST: RAG Q&A (text stream)
│   │       └── audio/route.ts        # GET: serve audio segments + manifest
│   ├── components/
│   │   ├── AudioPlayer.tsx           # Waveform canvas, playback controls, download
│   │   ├── ChatPanel.tsx             # Text + voice Q&A with streaming responses
│   │   ├── IngestionProgress.tsx     # Step-by-step progress bar
│   │   ├── RepoInput.tsx             # URL input, validation, examples, recents
│   │   ├── RepoMeta.tsx              # Stars, language, description, GitHub link
│   │   ├── TranscriptPanel.tsx       # Synced chat-bubble transcript
│   │   └── VoiceButton.tsx           # Web Speech API voice input
│   ├── hooks/
│   │   ├── useAudioSync.ts           # Audio element + Web Audio API analyser
│   │   └── useVoiceInput.ts          # SpeechRecognition abstraction
│   ├── lib/
│   │   ├── github.ts                 # GitHub REST API client (auth, rate limits, backoff)
│   │   ├── ingest.ts                 # File selection, priority scoring, parallel fetch
│   │   ├── embeddings.ts             # Semantic chunking + HuggingFace embeddings
│   │   ├── rag.ts                    # Cosine similarity search, context assembly
│   │   ├── script-gen.ts             # LLM podcast script generation + validation
│   │   ├── tts.ts                    # TTSProvider interface (Kokoro + ElevenLabs)
│   │   ├── store.ts                  # SQLite sessions + chunks CRUD, TTL cleanup
│   │   └── utils.ts                  # URL parsing, token estimation, helpers
│   └── types/index.ts                # All shared TypeScript interfaces
├── packages/cli/                     # npx repocast CLI wrapper (stub)
│   └── src/index.ts
├── .env.example                      # All environment variables documented
├── .github/
│   ├── workflows/ci.yml              # Build + lint on PR
│   └── ISSUE_TEMPLATE/               # Bug report + feature request templates
├── CONTRIBUTING.md
├── LICENSE                           # MIT
└── README.md
```

## Environment Variables

Set in `apps/web/.env.local` (copy from `.env.example`).

**Required (at least one AI provider):**
- `ANTHROPIC_API_KEY` — Claude (preferred for script generation)
- `OPENAI_API_KEY` — OpenAI (fallback)
- `OLLAMA_BASE_URL` — e.g. `http://localhost:11434` (fully local mode)

**Strongly recommended:**
- `GITHUB_TOKEN` — Fine-grained PAT, read-only. Without it: 60 req/hr (will fail for repos with >60 files). With it: 5,000 req/hr.

**Optional:**
- `ELEVENLABS_API_KEY` — Cloud TTS fallback if Kokoro fails
- `ELEVENLABS_VOICE_HOST` / `ELEVENLABS_VOICE_GUEST` — Voice IDs
- `MAX_FILES_PER_REPO` — Default 50
- `MAX_FILE_SIZE_KB` — Default 100
- `SESSION_TTL_HOURS` — Default 24

## Commands

```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Start Next.js dev server (apps/web)
pnpm build            # Production build
pnpm lint             # ESLint
```

## Architecture

### Data Flow

1. **Ingest** (`POST /api/ingest`): User submits a GitHub URL. The server fetches repo metadata, walks the file tree, applies priority scoring to select the top N files, reads their content in parallel batches, chunks them semantically (function/class boundaries for code, heading boundaries for markdown), generates 384-dim embeddings via `all-MiniLM-L6-v2`, and stores everything in SQLite. Progress is streamed via SSE.

2. **Briefing** (`POST /api/briefing`): Uses the ingested data to build a dynamic prompt for the LLM. The LLM generates a two-speaker podcast script (HOST=Alex, GUEST=Sam, 12+ segments, 600-700 words). The script is validated (JSON parse, segment count, word count, speaker validity). TTS synthesizes each segment in parallel batches of 3, saving numbered WAV files + a manifest JSON. Progress is streamed via SSE.

3. **Audio** (`GET /api/audio`): Serves individual audio segments or the manifest JSON by session ID.

4. **Chat** (`POST /api/chat`): User question is embedded, cosine similarity search finds the top-5 relevant code chunks (min threshold 0.3), a context window is assembled, and the LLM generates a grounded answer streamed as text.

### State Machine (Player Page)

```
INGESTING → SCRIPT_GENERATING → SYNTHESIZING → READY → PLAYING / PAUSED
```

Each state shows the appropriate UI component. Errors are handled at every transition.

### Session Caching

Sessions are keyed by `{owner}/{repo}`. If a session exists and is not expired, ingestion is skipped and the cached data is used. TTL is controlled by `SESSION_TTL_HOURS`. Expired sessions are cleaned up on app startup.

## Key Types

All types live in `apps/web/types/index.ts`. Never inline type objects.

- `IngestStatus` — 8-state union for ingestion progress
- `AudioStatus` — 7-state union for audio pipeline
- `RepoMeta` — Repository metadata from GitHub API
- `RepoFile` — A single ingested file with content
- `Chunk` — A code/content chunk with embedding vector
- `PodcastScript` / `ScriptSegment` — The generated podcast script
- `Session` — Full session state combining meta + status + script
- `AudioManifest` / `AudioSegmentMeta` — Audio file manifest for playback
- `TreeEntry`, `IssueEntry`, `PREntry` — GitHub API response types

## Design System

Dark mode by default (`<html class="dark">`). CSS variables defined in `globals.css`:

- Host (Alex): `--color-host: #3b82f6` (blue-500)
- Guest (Sam): `--color-guest: #8b5cf6` (violet-500)
- Accent (CTAs): `--color-accent: #06b6d4` (cyan-500)
- Card bg: `--color-card: #1e293b` (slate-800)
- Border: `--color-border: #334155` (slate-700)
- Fonts: Inter (sans), JetBrains Mono (code/file paths)

## AI SDK v6 Notes

This project uses Vercel AI SDK v6 which has breaking changes from earlier versions:

- Use `maxOutputTokens` (not `maxTokens`)
- Use `toTextStreamResponse()` (not `toDataStreamResponse()`)
- `useChat` lives in `@ai-sdk/react` (not `ai/react`)
- The ChatPanel uses a manual fetch + ReadableStream approach instead of `useChat` due to API instability across v6 minor versions

## File Selection Priority (Ingestion)

Files are scored and the top `MAX_FILES_PER_REPO` are selected:

1. **Score 200**: Always-include files (README, CHANGELOG, package.json, pyproject.toml, Cargo.toml, go.mod, docs/ contents)
2. **Score 100**: Entry points (index.ts, main.py, app.py, server.ts)
3. **Score 80**: Files in `/src/` root
4. **Score 50 minus depth penalty**: All other included files (penalty: -5 per directory level)

Skipped: node_modules, .git, dist, build, binaries, lock files, test fixtures, generated files, `.d.ts`.

## Chunking Strategy

- **Source code**: Split at function/class/method boundaries. Fallback to blank-line splitting.
- **Markdown**: Split at heading boundaries (`#`, `##`, `###`).
- **JSON**: Whole file as one chunk (never split).
- **Max chunk**: ~400 tokens (1,600 chars). Oversized chunks split at blank lines.
- **Overlap**: 2 lines between adjacent chunks from the same file.
- Each chunk is prepended with `"file: {path}\n"` before embedding for retrieval accuracy.

## Error Handling

All API routes catch errors and return user-facing messages. The GitHub client has specific error classes (`GitHubError`) with status codes. Common errors:

- Invalid URL format → 400 with helpful message
- Repo not found → 404
- Rate limit hit → 429 with token recommendation
- No AI key → clear setup instructions
- TTS failure → skip segment and continue
- No RAG results → "I couldn't find relevant code"

## Known Gaps (v1.0)

- `components/ui/` is empty — no shadcn/ui base components installed. All UI is hand-built with Tailwind.
- No unit/integration tests yet. Add `vitest` when ready.
- RAG does not re-rank by file recency (cosine similarity only).
- CLI (`packages/cli`) works but is not yet published to npm.
- Podcast duration is fixed at ~4-5 minutes. Adaptive duration based on repo size is a v1.1 feature.

## Deferred to v1.1

- Private repo support (OAuth flow)
- Shareable/permalink audio briefings
- Multi-language TTS
- Batch processing multiple repos
- Embedded player widget
- Multi-episode playlists for large repos
- Architecture diagram generation
- Diff-aware incremental re-generation
