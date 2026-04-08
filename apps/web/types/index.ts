export type IngestStatus =
  | "idle"
  | "fetching_meta"
  | "walking_tree"
  | "reading_files"
  | "chunking"
  | "embedding"
  | "done"
  | "error";

export type AudioStatus =
  | "idle"
  | "generating_script"
  | "synthesizing"
  | "ready"
  | "playing"
  | "paused"
  | "error";

export interface RepoMeta {
  owner: string;
  repo: string;
  description: string | null;
  stars: number;
  forks: number;
  primaryLanguage: string | null;
  topics: string[];
  defaultBranch: string;
  license: string | null;
  lastPushed: string;
  openIssuesCount: number;
}

export interface RepoFile {
  path: string;
  content: string;
  sizeBytes: number;
  language: string | null;
}

export interface Chunk {
  id: string;
  repoId: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  embedding: number[];
}

export interface PodcastScript {
  title: string;
  duration: string;
  segments: ScriptSegment[];
}

export interface ScriptSegment {
  speaker: "HOST" | "GUEST";
  text: string;
  audioUrl?: string;
}

export interface Session {
  id: string;
  repoMeta: RepoMeta;
  ingestStatus: IngestStatus;
  ingestProgress: number;
  ingestError?: string;
  script?: PodcastScript;
  audioStatus: AudioStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: Date;
}

export interface TreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export interface IssueEntry {
  number: number;
  title: string;
  state: string;
  createdAt: string;
  labels: string[];
}

export interface PREntry {
  number: number;
  title: string;
  state: string;
  createdAt: string;
  mergedAt: string | null;
}

export interface AudioManifest {
  sessionId: string;
  segments: AudioSegmentMeta[];
  totalDurationMs: number;
}

export interface AudioSegmentMeta {
  index: number;
  speaker: "HOST" | "GUEST";
  text: string;
  filename: string;
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface IngestProgressEvent {
  status: IngestStatus;
  message: string;
  progress: number;
}
