import { getRepoMeta, getFileTree, getFileContent, getRepoIssues } from "./github";
import { getExtension, detectLanguageFromExtension } from "./utils";
import type { RepoMeta, RepoFile, TreeEntry } from "@/types";

const ALWAYS_INCLUDE_FILES = [
  /^readme\.(md|rst|txt)$/i,
  /^changelog\.md$/i,
  /^contributing\.md$/i,
  /^architecture\.md$/i,
  /^design\.md$/i,
  /^package\.json$/,
  /^pyproject\.toml$/,
  /^cargo\.toml$/,
  /^go\.mod$/,
  /^composer\.json$/,
];

const ALWAYS_INCLUDE_DIRS = [/^docs\//i, /^documentation\//i, /^wiki\//i];

const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".rb",
  ".java", ".kt", ".swift", ".c", ".cpp", ".h",
]);

const CONFIG_EXTENSIONS = new Set([".yaml", ".yml", ".json"]);
const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
  "vendor", ".turbo", ".vercel", "coverage", ".nyc_output",
]);

const SKIP_PATTERNS = [
  /\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|pdf|zip|tar|gz|svg|mp3|mp4|wav)$/i,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
  /Cargo\.lock$/,
  /poetry\.lock$/,
  /\.generated\.ts$/,
  /\.min\.js$/,
  /\.d\.ts$/,
  /__fixtures__\//,
  /__snapshots__\//,
  /testdata\//,
];

const ENTRY_POINTS = new Set([
  "index.ts", "index.js", "index.tsx", "index.jsx",
  "main.py", "app.py", "server.ts", "server.js",
  "main.ts", "main.js", "main.go", "main.rs", "lib.rs",
]);

function isInSkipDir(path: string): boolean {
  const parts = path.split("/");
  return parts.some((part) => SKIP_DIRS.has(part));
}

function shouldSkip(path: string): boolean {
  if (isInSkipDir(path)) return true;
  return SKIP_PATTERNS.some((pattern) => pattern.test(path));
}

function isAlwaysInclude(path: string): boolean {
  const filename = path.split("/").pop() ?? "";
  if (ALWAYS_INCLUDE_FILES.some((p) => p.test(filename))) return true;
  if (ALWAYS_INCLUDE_DIRS.some((p) => p.test(path))) return true;
  return false;
}

function isIncludableExtension(path: string): boolean {
  const ext = getExtension(path);
  return SOURCE_EXTENSIONS.has(ext) || CONFIG_EXTENSIONS.has(ext) || MARKDOWN_EXTENSIONS.has(ext);
}

function getFilePriorityScore(path: string): number {
  const filename = path.split("/").pop() ?? "";
  const depth = path.split("/").length - 1;

  if (isAlwaysInclude(path)) return 200;
  if (ENTRY_POINTS.has(filename)) return 100;

  const parentDir = path.split("/")[0];
  if (parentDir === "src") return 80;

  return Math.max(10, 50 - depth * 5);
}

export interface FileSelectionResult {
  files: TreeEntry[];
  totalFound: number;
  selected: number;
}

export function selectFiles(
  tree: TreeEntry[],
  maxFiles: number
): FileSelectionResult {
  const blobs = tree.filter((e) => e.type === "blob");
  const totalFound = blobs.length;

  const candidates = blobs
    .filter((entry) => !shouldSkip(entry.path))
    .filter((entry) => isAlwaysInclude(entry.path) || isIncludableExtension(entry.path));

  const scored = candidates.map((entry) => ({
    entry,
    score: getFilePriorityScore(entry.path),
  }));

  scored.sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, maxFiles).map((s) => s.entry);

  return { files: selected, totalFound, selected: selected.length };
}

export interface IngestResult {
  meta: RepoMeta;
  files: RepoFile[];
}

export type ProgressCallback = (status: string, message: string, progress: number) => void;

export async function ingestRepo(
  owner: string,
  repo: string,
  onProgress?: ProgressCallback
): Promise<IngestResult> {
  const maxFiles = parseInt(process.env.MAX_FILES_PER_REPO ?? "50", 10);
  const maxFileSizeKb = parseInt(process.env.MAX_FILE_SIZE_KB ?? "100", 10);

  onProgress?.("fetching_meta", "Fetching repository metadata...", 5);
  const meta = await getRepoMeta(owner, repo);

  onProgress?.("walking_tree", "Walking file tree...", 15);
  const tree = await getFileTree(owner, repo, meta.defaultBranch);

  const { files: selectedEntries, totalFound, selected } = selectFiles(tree, maxFiles);
  onProgress?.(
    "walking_tree",
    `Walking file tree (${totalFound} files found, ${selected} selected)...`,
    20
  );

  onProgress?.("reading_files", `Reading files (0/${selected})...`, 25);
  const files: RepoFile[] = [];
  const batchSize = 5;

  for (let i = 0; i < selectedEntries.length; i += batchSize) {
    const batch = selectedEntries.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (entry) => {
        if (entry.size && entry.size > maxFileSizeKb * 1024) {
          return null;
        }
        try {
          const content = await getFileContent(owner, repo, entry.path);
          if (content.length > maxFileSizeKb * 1024) return null;
          const ext = getExtension(entry.path);
          return {
            path: entry.path,
            content,
            sizeBytes: content.length,
            language: detectLanguageFromExtension(ext),
          } satisfies RepoFile;
        } catch {
          console.warn(`[ingest] Failed to read ${entry.path}, skipping`);
          return null;
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        files.push(result.value);
      }
    }

    const progress = 25 + Math.round((i / selectedEntries.length) * 35);
    onProgress?.("reading_files", `Reading files (${files.length}/${selected})...`, progress);
  }

  return { meta, files };
}

export async function fetchIssuesForContext(
  owner: string,
  repo: string
): Promise<string[]> {
  try {
    const issues = await getRepoIssues(owner, repo, 10);
    return issues.map((i) => i.title);
  } catch {
    return [];
  }
}
