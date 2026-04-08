import { NextRequest } from "next/server";
import { parseGitHubUrl } from "@/lib/utils";
import { ingestRepo, fetchIssuesForContext } from "@/lib/ingest";
import { chunkFiles, embedChunks } from "@/lib/embeddings";
import {
  getSession,
  createSession,
  updateSessionStatus,
  saveChunks,
  cleanExpiredSessions,
} from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json();
  let owner: string;
  let repo: string;

  if (body.url) {
    const parsed = parseGitHubUrl(body.url);
    if (!parsed) {
      return Response.json(
        { error: "That doesn't look like a GitHub URL. Try: https://github.com/owner/repo" },
        { status: 400 }
      );
    }
    owner = parsed.owner;
    repo = parsed.repo;
  } else if (body.owner && body.repo) {
    owner = body.owner;
    repo = body.repo;
  } else {
    return Response.json({ error: "Missing owner/repo or url" }, { status: 400 });
  }

  const sessionId = `${owner}/${repo}`;

  const existing = getSession(sessionId);
  if (existing && existing.ingestStatus === "done") {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ status: "done", message: "Already ingested. Using cached data.", progress: 100 })}\n\n`
          )
        );
        controller.close();
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

  cleanExpiredSessions();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (status: string, message: string, progress: number) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ status, message, progress })}\n\n`)
          );
        } catch {
          // stream closed
        }
      };

      try {
        const { meta, files } = await ingestRepo(owner, repo, send);
        createSession(sessionId, meta);

        send("chunking", `Chunking content into segments...`, 65);
        const rawChunks = chunkFiles(files);
        for (const chunk of rawChunks) {
          chunk.repoId = sessionId;
        }

        send("chunking", `Chunking content into ${rawChunks.length} segments...`, 70);

        send("embedding", "Generating embeddings...", 75);
        const chunks = await embedChunks(rawChunks, (done, total) => {
          const progress = 75 + Math.round((done / total) * 20);
          send("embedding", `Generating embeddings (${done}/${total})...`, progress);
        });

        send("embedding", `Saving ${chunks.length} chunks...`, 95);
        saveChunks(sessionId, chunks);
        updateSessionStatus(sessionId, "done");

        send("done", `Ready! ${chunks.length} chunks indexed.`, 100);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Ingestion failed";
        send("error", message, 0);
        try {
          updateSessionStatus(sessionId, "error");
        } catch {
          // session may not exist yet
        }
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
