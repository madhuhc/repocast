import { NextRequest } from "next/server";
import { getAudioFilePath, getManifest } from "@/lib/tts";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");
  const filename = searchParams.get("file");

  if (!sessionId || !filename) {
    return Response.json({ error: "Missing session or file parameter" }, { status: 400 });
  }

  if (filename === "manifest.json") {
    const manifest = getManifest(sessionId);
    if (!manifest) {
      return Response.json({ error: "Manifest not found" }, { status: 404 });
    }
    return Response.json(manifest);
  }

  const filepath = getAudioFilePath(sessionId, filename);
  if (!filepath) {
    return Response.json({ error: "Audio file not found" }, { status: 404 });
  }

  const stat = fs.statSync(filepath);
  const buffer = fs.readFileSync(filepath);
  const isWav = filename.endsWith(".wav");

  return new Response(buffer, {
    headers: {
      "Content-Type": isWav ? "audio/wav" : "audio/mpeg",
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
