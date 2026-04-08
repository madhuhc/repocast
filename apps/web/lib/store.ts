import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { RepoMeta, PodcastScript, Chunk, IngestStatus, AudioStatus } from "@/types";

const DB_PATH = path.join(process.cwd(), "data", "sessions.db");

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(DB_PATH);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("foreign_keys = ON");

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      meta_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle',
      audio_status TEXT NOT NULL DEFAULT 'idle',
      script_json TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      content TEXT NOT NULL,
      start_line INTEGER,
      end_line INTEGER,
      embedding BLOB NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_session ON chunks(session_id);
  `);

  return dbInstance;
}

export function getSession(sessionId: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as
    | {
        id: string;
        meta_json: string;
        status: string;
        audio_status: string;
        script_json: string | null;
        created_at: number;
        expires_at: number;
      }
    | undefined;

  if (!row) return null;

  if (row.expires_at < Date.now()) {
    deleteSession(sessionId);
    return null;
  }

  return {
    id: row.id,
    repoMeta: JSON.parse(row.meta_json) as RepoMeta,
    ingestStatus: row.status as IngestStatus,
    audioStatus: row.audio_status as AudioStatus,
    script: row.script_json ? (JSON.parse(row.script_json) as PodcastScript) : undefined,
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
  };
}

export function createSession(sessionId: string, meta: RepoMeta): void {
  const db = getDb();
  const ttlHours = parseInt(process.env.SESSION_TTL_HOURS ?? "24", 10);
  const now = Date.now();
  const expiresAt = now + ttlHours * 60 * 60 * 1000;

  db.prepare(
    `INSERT OR REPLACE INTO sessions (id, meta_json, status, audio_status, created_at, expires_at)
     VALUES (?, ?, 'fetching_meta', 'idle', ?, ?)`
  ).run(sessionId, JSON.stringify(meta), now, expiresAt);
}

export function updateSessionStatus(sessionId: string, status: IngestStatus): void {
  const db = getDb();
  db.prepare("UPDATE sessions SET status = ? WHERE id = ?").run(status, sessionId);
}

export function updateAudioStatus(sessionId: string, status: AudioStatus): void {
  const db = getDb();
  db.prepare("UPDATE sessions SET audio_status = ? WHERE id = ?").run(status, sessionId);
}

export function saveScript(sessionId: string, script: PodcastScript): void {
  const db = getDb();
  db.prepare("UPDATE sessions SET script_json = ? WHERE id = ?").run(
    JSON.stringify(script),
    sessionId
  );
}

export function saveChunks(sessionId: string, chunks: Chunk[]): void {
  const db = getDb();
  const insert = db.prepare(
    `INSERT OR REPLACE INTO chunks (id, session_id, file_path, content, start_line, end_line, embedding)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction((items: Chunk[]) => {
    for (const chunk of items) {
      const embeddingBuf = Buffer.from(new Float32Array(chunk.embedding).buffer);
      insert.run(
        chunk.id,
        sessionId,
        chunk.filePath,
        chunk.content,
        chunk.startLine,
        chunk.endLine,
        embeddingBuf
      );
    }
  });

  insertMany(chunks);
}

export function getChunksForSession(sessionId: string): Chunk[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM chunks WHERE session_id = ?")
    .all(sessionId) as Array<{
    id: string;
    session_id: string;
    file_path: string;
    content: string;
    start_line: number;
    end_line: number;
    embedding: Buffer;
  }>;

  return rows.map((row) => {
    const float32 = new Float32Array(
      row.embedding.buffer,
      row.embedding.byteOffset,
      row.embedding.byteLength / 4
    );
    return {
      id: row.id,
      repoId: row.session_id,
      filePath: row.file_path,
      content: row.content,
      startLine: row.start_line,
      endLine: row.end_line,
      embedding: Array.from(float32),
    };
  });
}

export function deleteSession(sessionId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM chunks WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function cleanExpiredSessions(): number {
  const db = getDb();
  const now = Date.now();
  const expired = db
    .prepare("SELECT id FROM sessions WHERE expires_at < ?")
    .all(now) as Array<{ id: string }>;

  for (const { id } of expired) {
    deleteSession(id);
  }

  return expired.length;
}

export function getAllSessions() {
  const db = getDb();
  return db
    .prepare("SELECT id, meta_json, status, audio_status, created_at FROM sessions ORDER BY created_at DESC")
    .all() as Array<{
    id: string;
    meta_json: string;
    status: string;
    audio_status: string;
    created_at: number;
  }>;
}
