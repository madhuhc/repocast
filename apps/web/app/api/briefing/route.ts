import { NextRequest } from "next/server";
import { getSession, saveScript, updateAudioStatus } from "@/lib/store";
import { getChunksForSession } from "@/lib/store";
import { generatePodcastScript } from "@/lib/script-gen";
import { synthesizeAllSegments, getManifest } from "@/lib/tts";
import { fetchIssuesForContext } from "@/lib/ingest";
import type { RepoFile } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { owner, repo } = body;

  if (!owner || !repo) {
    return Response.json({ error: "Missing owner or repo" }, { status: 400 });
  }

  const sessionId = `${owner}/${repo}`;
  const session = getSession(sessionId);

  if (!session) {
    return Response.json(
      { error: "Repository not ingested yet. Run /api/ingest first." },
      { status: 404 }
    );
  }

  const existingManifest = getManifest(sessionId);
  if (session.script && existingManifest) {
    return Response.json({
      script: session.script,
      manifest: existingManifest,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, ...data })}\n\n`));
        } catch {
          // stream closed
        }
      };

      try {
        send("status", { status: "generating_script", message: "Generating podcast script..." });
        updateAudioStatus(sessionId, "generating_script");

        const chunks = getChunksForSession(sessionId);
        const files: RepoFile[] = [];
        const seenPaths = new Set<string>();
        for (const chunk of chunks) {
          if (!seenPaths.has(chunk.filePath)) {
            seenPaths.add(chunk.filePath);
            files.push({
              path: chunk.filePath,
              content: chunk.content,
              sizeBytes: chunk.content.length,
              language: null,
            });
          }
        }

        const issueTitles = await fetchIssuesForContext(owner, repo);
        const script = await generatePodcastScript(session.repoMeta, files, issueTitles);
        saveScript(sessionId, script);

        send("script", { script });
        send("status", { status: "synthesizing", message: "Synthesizing audio..." });
        updateAudioStatus(sessionId, "synthesizing");

        const manifest = await synthesizeAllSegments(
          sessionId,
          script.segments,
          (done, total) => {
            send("tts_progress", {
              done,
              total,
              message: `Synthesizing audio (${done}/${total})...`,
            });
          }
        );

        if (manifest.segments.length === 0) {
          throw new Error(
            "Audio synthesis failed — no segments were produced. " +
            "Check your TTS configuration: ensure ELEVENLABS_API_KEY is valid, " +
            "or that Kokoro TTS can initialize (try deleting node_modules/.pnpm/@huggingface+transformers*/node_modules/@huggingface/transformers/.cache and re-running)."
          );
        }

        updateAudioStatus(sessionId, "ready");
        send("manifest", { manifest });
        send("status", { status: "ready", message: "Audio ready!" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Briefing generation failed";
        send("error", { message });
        updateAudioStatus(sessionId, "error");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
