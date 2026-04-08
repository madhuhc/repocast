import { getChunksForSession } from "./store";
import type { Chunk } from "@/types";

const MIN_SIMILARITY_THRESHOLD = 0.3;
const TOP_K = 5;
const MAX_CONTEXT_CHARS = 8000;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
}

export async function retrieveContext(
  sessionId: string,
  queryEmbedding: number[]
): Promise<RetrievedChunk[]> {
  const chunks = getChunksForSession(sessionId);

  if (chunks.length === 0) {
    return [];
  }

  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  const topChunks = scored
    .filter((s) => s.score >= MIN_SIMILARITY_THRESHOLD)
    .slice(0, TOP_K);

  return topChunks;
}

export function assembleContextWindow(retrieved: RetrievedChunk[]): string {
  const parts: string[] = [];
  let totalChars = 0;

  for (const { chunk, score } of retrieved) {
    const section = `--- ${chunk.filePath} (lines ${chunk.startLine}-${chunk.endLine}, relevance: ${score.toFixed(2)}) ---\n${chunk.content}`;

    if (totalChars + section.length > MAX_CONTEXT_CHARS) break;

    parts.push(section);
    totalChars += section.length;
  }

  return parts.join("\n\n");
}

export function getSourceFiles(retrieved: RetrievedChunk[]): string[] {
  const seen = new Set<string>();
  return retrieved
    .map((r) => r.chunk.filePath)
    .filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
}

export async function embedQuery(text: string): Promise<number[]> {
  const { pipeline } = await import("@huggingface/transformers");
  const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    dtype: "fp32",
  });
  const output = await extractor([text], { pooling: "mean", normalize: true });
  const embeddings = output.tolist();
  return embeddings[0];
}
