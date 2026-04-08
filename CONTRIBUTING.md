# Contributing to repocast

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/repocast/repocast.git
cd repocast
pnpm install
cp .env.example apps/web/.env.local
# Add your API keys to .env.local
pnpm dev
```

## Project Structure

- `apps/web/` — Next.js 15 web application
- `apps/web/lib/` — Core libraries (GitHub client, ingestion, embeddings, TTS, RAG)
- `apps/web/components/` — React components
- `apps/web/app/api/` — API routes
- `packages/cli/` — CLI wrapper package

## Code Style

- TypeScript strict mode — no `any` types
- Use types from `types/index.ts` — never inline type objects
- Prefer `const` over `let`
- Use early returns for error handling
- Keep functions focused and under 50 lines where possible

## Pull Request Guidelines

1. Create a feature branch from `main`
2. Write clear commit messages
3. Ensure `pnpm build` passes
4. Add tests for new functionality where applicable
5. Keep PRs focused — one feature or fix per PR

## Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) when filing issues.

## Feature Requests

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) for new ideas.
