# repocast

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Any GitHub repo. Explained. Aloud.**

Turn any public GitHub repository into a listenable AI-generated podcast briefing with voice Q&A — powered by real source code analysis, not just the README.

![demo.gif](demo.gif)

---

## Quick Start

```bash
# Option 1: Use npx (coming soon)
npx repocast https://github.com/facebook/react

# Option 2: Run locally
git clone https://github.com/repocast/repocast.git
cd repocast
pnpm install
cp .env.example apps/web/.env.local  # Add your API keys
pnpm dev
```

---

## How It's Different from NotebookLM

| Feature | NotebookLM | repocast |
|---|---|---|
| **Input** | Documents, PDFs, web pages | GitHub repositories via REST API |
| **Code understanding** | Rendered HTML/text | Actual source files, function boundaries, file trees |
| **Q&A after listening** | Limited follow-up | RAG-powered voice Q&A grounded in source code |
| **Runs locally** | No (Google Cloud) | Yes — Ollama + Kokoro TTS + SQLite |
| **Open source** | No | MIT License |

---

## Features

- **Two-voice AI podcast** — HOST (Alex) and GUEST (Sam) discuss the repository in a natural conversational format
- **Smart code analysis** — Reads actual source files via GitHub API, not just the README. Understands function boundaries, dependencies, and architecture
- **RAG-powered Q&A** — Ask follow-up questions by text or voice, answered from the repository's actual code
- **Fully local mode** — Run with Ollama (LLM) + Kokoro TTS (audio) + SQLite (storage) — no cloud required
- **Real-time progress** — SSE-streamed ingestion progress with step-by-step visibility
- **Custom audio player** — Waveform visualization, speed controls, transcript sync
- **Session caching** — Previously analyzed repos load instantly
- **CLI tool** — `npx repocast <url>` for quick access

---

## Self-Hosting

```bash
git clone https://github.com/repocast/repocast.git
cd repocast
pnpm install
cp .env.example apps/web/.env.local
# Edit .env.local with your API keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Supported AI Providers

| Provider | Purpose | Required? |
|---|---|---|
| **Claude** (Anthropic) | Script generation, Q&A answers | Recommended |
| **OpenAI** | Fallback for script/Q&A, Whisper for voice input | Optional |
| **Ollama** | Fully local LLM inference | Optional (local mode) |
| **Kokoro TTS** | Local text-to-speech (2 voices) | Default TTS |
| **ElevenLabs** | Cloud TTS fallback | Optional |

Set at least one AI provider key in your `.env.local`.

---

## GitHub Token

A `GITHUB_TOKEN` is optional but strongly recommended:

- **Without token:** 60 API requests/hour (may not complete for repos with many files)
- **With token:** 5,000 requests/hour

Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with read-only access to public repositories.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **AI SDK:** Vercel AI SDK v4
- **TTS:** Kokoro TTS (local) / ElevenLabs (cloud)
- **Embeddings:** @huggingface/transformers (all-MiniLM-L6-v2)
- **Storage:** SQLite (better-sqlite3)
- **Package Manager:** pnpm

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

[MIT](LICENSE)
