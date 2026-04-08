import { v4 as uuidv4 } from "uuid";
import { estimateTokens, getExtension } from "./utils";
import type { RepoFile, Chunk } from "@/types";

const MAX_CHUNK_TOKENS = 400;
const MAX_CHUNK_CHARS = MAX_CHUNK_TOKENS * 4;
const OVERLAP_LINES = 2;

let pipelineInstance: EmbeddingPipeline | null = null;

type EmbeddingPipeline = {
  (texts: string[], options?: { pooling: string; normalize: boolean }): Promise<{
    tolist: () => number[][];
  }>;
};

async function getEmbeddingPipeline(): Promise<EmbeddingPipeline> {
  if (pipelineInstance) return pipelineInstance;

  const { pipeline } = await import("@huggingface/transformers");
  const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    dtype: "fp32",
  });

  pipelineInstance = async (texts: string[]) => {
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    return output;
  };

  return pipelineInstance;
}

function splitCodeByBoundaries(content: string): string[][] {
  const lines = content.split("\n");
  const chunks: string[][] = [];
  let current: string[] = [];

  const boundaryPatterns = [
    /^(export\s+)?(async\s+)?function\s+/,
    /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
    /^(export\s+)?class\s+/,
    /^(export\s+)?interface\s+/,
    /^(export\s+)?type\s+/,
    /^(export\s+)?enum\s+/,
    /^def\s+/,
    /^class\s+/,
    /^(pub\s+)?fn\s+/,
    /^(pub\s+)?struct\s+/,
    /^func\s+/,
    /^(public|private|protected)\s+(static\s+)?(void|int|String|boolean|async)/,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    const isBoundary = boundaryPatterns.some((p) => p.test(trimmed));

    if (isBoundary && current.length > 0) {
      chunks.push(current);
      const overlap = current.slice(-OVERLAP_LINES);
      current = [...overlap];
    }
    current.push(line);
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function splitByBlankLines(content: string): string[][] {
  const lines = content.split("\n");
  const chunks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    current.push(line);
    if (line.trim() === "" && current.length > 3) {
      if (estimateTokens(current.join("\n")) > MAX_CHUNK_TOKENS / 2) {
        chunks.push(current);
        const overlap = current.slice(-OVERLAP_LINES);
        current = [...overlap];
      }
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function splitMarkdownByHeadings(content: string): string[][] {
  const lines = content.split("\n");
  const chunks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,4}\s+/.test(line) && current.length > 0) {
      chunks.push(current);
      current = [];
    }
    current.push(line);
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function enforceMaxChunkSize(lineChunks: string[][]): string[][] {
  const result: string[][] = [];

  for (const chunk of lineChunks) {
    const text = chunk.join("\n");
    if (text.length <= MAX_CHUNK_CHARS) {
      result.push(chunk);
      continue;
    }

    let current: string[] = [];
    for (const line of chunk) {
      current.push(line);
      if (current.join("\n").length >= MAX_CHUNK_CHARS) {
        result.push(current);
        const overlap = current.slice(-OVERLAP_LINES);
        current = [...overlap];
      }
    }
    if (current.length > 0) {
      result.push(current);
    }
  }

  return result;
}

export function chunkFile(file: RepoFile): Array<{ content: string; startLine: number; endLine: number }> {
  const ext = getExtension(file.path);
  const isJson = ext === ".json";
  const isMarkdown = ext === ".md" || ext === ".mdx";

  if (isJson || file.content.length <= MAX_CHUNK_CHARS) {
    return [
      {
        content: file.content,
        startLine: 1,
        endLine: file.content.split("\n").length,
      },
    ];
  }

  let lineChunks: string[][];

  if (isMarkdown) {
    lineChunks = splitMarkdownByHeadings(file.content);
  } else {
    lineChunks = splitCodeByBoundaries(file.content);
    if (lineChunks.length <= 1) {
      lineChunks = splitByBlankLines(file.content);
    }
  }

  lineChunks = enforceMaxChunkSize(lineChunks);

  let lineOffset = 1;
  return lineChunks.map((lines) => {
    const content = lines.join("\n");
    const startLine = lineOffset;
    const endLine = lineOffset + lines.length - 1;
    lineOffset += lines.length - OVERLAP_LINES;
    return { content, startLine, endLine };
  });
}

export function chunkFiles(files: RepoFile[]): Array<Omit<Chunk, "embedding">> {
  const chunks: Array<Omit<Chunk, "embedding">> = [];

  for (const file of files) {
    const fileChunks = chunkFile(file);
    for (const chunk of fileChunks) {
      chunks.push({
        id: uuidv4(),
        repoId: "",
        filePath: file.path,
        content: chunk.content,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
      });
    }
  }

  return chunks;
}

export async function embedChunks(
  chunks: Array<Omit<Chunk, "embedding">>,
  onProgress?: (done: number, total: number) => void
): Promise<Chunk[]> {
  const pipe = await getEmbeddingPipeline();
  const batchSize = 32;
  const result: Chunk[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => `file: ${c.filePath}\n${c.content}`);

    const output = await pipe(texts, { pooling: "mean", normalize: true });
    const embeddings = output.tolist();

    for (let j = 0; j < batch.length; j++) {
      result.push({
        ...batch[j],
        embedding: embeddings[j],
      });
    }

    onProgress?.(Math.min(i + batchSize, chunks.length), chunks.length);
  }

  return result;
}
