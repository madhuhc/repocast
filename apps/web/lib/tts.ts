import fs from "fs";
import path from "path";
import type { ScriptSegment, AudioManifest, AudioSegmentMeta } from "@/types";

const AUDIO_DIR = path.join(process.cwd(), "data", "audio");

export interface TTSProvider {
  synthesize(text: string, speaker: "HOST" | "GUEST"): Promise<Buffer>;
}

function wrapPcmInWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

class GeminiTTSProvider implements TTSProvider {
  private apiKey: string;
  private voiceHost: string;
  private voiceGuest: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.voiceHost = process.env.GEMINI_TTS_VOICE_HOST?.trim() || "Kore";
    this.voiceGuest = process.env.GEMINI_TTS_VOICE_GUEST?.trim() || "Charon";
  }

  async synthesize(text: string, speaker: "HOST" | "GUEST"): Promise<Buffer> {
    const voiceName = speaker === "HOST" ? this.voiceHost : this.voiceGuest;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Gemini TTS API error: ${response.status} ${body.slice(0, 200)}`);
    }

    type GeminiTTSResponse = {
      candidates?: Array<{
        content?: {
          parts?: Array<{ inlineData?: { data: string; mimeType: string } }>;
        };
      }>;
    };

    const data = (await response.json()) as GeminiTTSResponse;
    const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) {
      throw new Error("Gemini TTS returned no audio data");
    }

    const pcm = Buffer.from(b64, "base64");
    return wrapPcmInWav(pcm);
  }
}

class OpenAICompatibleTTSProvider implements TTSProvider {
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    this.baseURL = baseURL.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  async synthesize(text: string, speaker: "HOST" | "GUEST"): Promise<Buffer> {
    const voice = speaker === "HOST" ? "alloy" : "nova";
    const response = await fetch(`${this.baseURL}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice,
        response_format: "wav",
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenAI TTS API error: ${response.status} ${response.statusText} ${body.slice(0, 200)}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}

class ElevenLabsProvider implements TTSProvider {
  private apiKey: string;
  private hostVoice: string;
  private guestVoice: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY ?? "";
    this.hostVoice = process.env.ELEVENLABS_VOICE_HOST ?? "21m00Tcm4TlvDq8ikWAM";
    this.guestVoice = process.env.ELEVENLABS_VOICE_GUEST ?? "AZnzlk1XvdvUeBnXmlld";
  }

  async synthesize(text: string, speaker: "HOST" | "GUEST"): Promise<Buffer> {
    const voiceId = speaker === "HOST" ? this.hostVoice : this.guestVoice;
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}

class FallbackTTSProvider implements TTSProvider {
  private workingProvider: TTSProvider | null = null;
  private providers: Array<{ name: string; provider: TTSProvider }> = [];

  constructor() {
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      this.providers.push({
        name: "Gemini TTS",
        provider: new GeminiTTSProvider(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
      });
    }

    if (process.env.OPENAI_API_KEY) {
      this.providers.push({
        name: "OpenAI TTS",
        provider: new OpenAICompatibleTTSProvider(
          "https://api.openai.com/v1",
          process.env.OPENAI_API_KEY,
        ),
      });
    }

    if (process.env.ELEVENLABS_API_KEY) {
      this.providers.push({ name: "ElevenLabs", provider: new ElevenLabsProvider() });
    }
  }

  async synthesize(text: string, speaker: "HOST" | "GUEST"): Promise<Buffer> {
    if (this.workingProvider) {
      try {
        return await this.workingProvider.synthesize(text, speaker);
      } catch {
        console.warn("[tts] Cached provider failed, re-trying all providers...");
        this.workingProvider = null;
      }
    }

    if (this.providers.length === 0) {
      throw new Error(
        "No TTS provider configured. Set GOOGLE_GENERATIVE_AI_API_KEY, OPENAI_API_KEY, or ELEVENLABS_API_KEY in .env."
      );
    }

    for (const { name, provider } of this.providers) {
      try {
        const result = await provider.synthesize(text, speaker);
        console.log(`[tts] Using ${name} as TTS provider`);
        this.workingProvider = provider;
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[tts] ${name} failed: ${msg.slice(0, 200)}, trying next...`);
      }
    }

    throw new Error(
      "All TTS providers failed. Check that at least one of GOOGLE_GENERATIVE_AI_API_KEY, OPENAI_API_KEY, or ELEVENLABS_API_KEY is set and valid."
    );
  }
}

let providerInstance: TTSProvider | null = null;

export function getTTSProvider(): TTSProvider {
  if (providerInstance) return providerInstance;
  providerInstance = new FallbackTTSProvider();
  return providerInstance;
}

export function resetTTSProvider(): void {
  providerInstance = null;
}

function getSessionAudioDir(sessionId: string): string {
  const sanitized = sessionId.replace(/\//g, "__");
  const dir = path.join(AUDIO_DIR, sanitized);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function synthesizeSegment(
  sessionId: string,
  segment: ScriptSegment,
  index: number
): Promise<AudioSegmentMeta> {
  const provider = getTTSProvider();
  const audioDir = getSessionAudioDir(sessionId);
  const filename = `segment-${String(index).padStart(3, "0")}.wav`;
  const filepath = path.join(audioDir, filename);

  const buffer = await provider.synthesize(segment.text, segment.speaker);
  fs.writeFileSync(filepath, buffer);

  const wordsPerSecond = 2.5;
  const wordCount = segment.text.split(/\s+/).length;
  const estimatedDurationMs = Math.round((wordCount / wordsPerSecond) * 1000);

  return {
    index,
    speaker: segment.speaker,
    text: segment.text,
    filename,
    startMs: 0,
    endMs: estimatedDurationMs,
    durationMs: estimatedDurationMs,
  };
}

export async function synthesizeAllSegments(
  sessionId: string,
  segments: ScriptSegment[],
  onSegmentDone?: (index: number, total: number) => void
): Promise<AudioManifest> {
  const results: AudioSegmentMeta[] = [];
  let cumulativeMs = 0;
  const delayBetweenCalls = 1500;

  for (let i = 0; i < segments.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, delayBetweenCalls));
    }

    try {
      const meta = await synthesizeSegment(sessionId, segments[i], i);
      meta.startMs = cumulativeMs;
      meta.endMs = cumulativeMs + meta.durationMs;
      cumulativeMs += meta.durationMs;
      results.push(meta);
    } catch (err) {
      console.error("[tts] Segment synthesis failed:", err);
    }

    onSegmentDone?.(i + 1, segments.length);
  }

  const manifest: AudioManifest = {
    sessionId,
    segments: results,
    totalDurationMs: cumulativeMs,
  };

  const audioDir = getSessionAudioDir(sessionId);
  fs.writeFileSync(
    path.join(audioDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  return manifest;
}

export function getAudioFilePath(sessionId: string, filename: string): string | null {
  const sanitized = sessionId.replace(/\//g, "__");
  const filepath = path.join(AUDIO_DIR, sanitized, filename);
  return fs.existsSync(filepath) ? filepath : null;
}

export function getManifest(sessionId: string): AudioManifest | null {
  const sanitized = sessionId.replace(/\//g, "__");
  const manifestPath = path.join(AUDIO_DIR, sanitized, "manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as AudioManifest;
}
