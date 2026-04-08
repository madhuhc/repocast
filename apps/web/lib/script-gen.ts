import { generateText } from "ai";
import { getAvailableModels } from "@/lib/ai-provider";
import type { RepoMeta, RepoFile, PodcastScript, ScriptSegment } from "@/types";

function buildPrompt(
  meta: RepoMeta,
  files: RepoFile[],
  issueTitles: string[]
): string {
  const readmeFile = files.find((f) =>
    /^readme\.(md|rst|txt)$/i.test(f.path.split("/").pop() ?? "")
  );
  const readmeSummary = readmeFile
    ? readmeFile.content.slice(0, 2000)
    : "No README found.";

  const manifestFile = files.find((f) =>
    ["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "composer.json"].includes(
      f.path.split("/").pop() ?? ""
    )
  );
  const manifestContent = manifestFile
    ? manifestFile.content.slice(0, 1500)
    : "No package manifest found.";

  const topFiles = files
    .filter((f) => f !== readmeFile && f !== manifestFile)
    .slice(0, 5)
    .map((f) => `### ${f.path}\n${f.content.slice(0, 500)}`)
    .join("\n\n");

  const issuesSection =
    issueTitles.length > 0
      ? issueTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")
      : "No open issues.";

  return `You are writing a podcast script for "repocast", which explains GitHub repositories to developers and non-developers alike.

REPOSITORY: ${meta.owner}/${meta.repo}
DESCRIPTION: ${meta.description ?? "No description provided."}
STARS: ${meta.stars} | LANGUAGE: ${meta.primaryLanguage ?? "Unknown"} | LICENSE: ${meta.license ?? "Unknown"}
TOPICS: ${meta.topics.join(", ") || "None"}

README SUMMARY:
${readmeSummary}

PACKAGE MANIFEST:
${manifestContent}

KEY FILES (top 5 by priority score):
${topFiles || "No additional key files."}

OPEN ISSUES SAMPLE:
${issuesSection}

---

Write a podcast script for this repository. Follow EXACTLY this JSON format:

{
  "title": "...",
  "duration": "4 minutes",
  "segments": [
    {"speaker": "HOST", "text": "..."},
    {"speaker": "GUEST", "text": "..."},
    ...
  ]
}

Rules:
- HOST is named Alex, GUEST is named Sam
- Never say "GitHub repository" — just say "project" or "library"
- Use plain English. Non-developers should understand everything.
- Each segment text should be 1–4 sentences maximum
- Do not use bullet points or lists — only natural spoken language
- Total word count: 300–400 words
- Be enthusiastic and conversational, not corporate
- Return only valid JSON, no markdown code blocks
- The script must have exactly 6 segments
- Alternate between HOST and GUEST naturally`;
}

function validateScript(script: PodcastScript): string | null {
  if (!script.segments || !Array.isArray(script.segments)) {
    return "Missing segments array";
  }
  if (script.segments.length < 4) {
    return `Too few segments: ${script.segments.length} (need at least 4)`;
  }
  const totalWords = script.segments.reduce(
    (sum, s) => sum + s.text.split(/\s+/).length,
    0
  );
  if (totalWords < 100 || totalWords > 1000) {
    return `Word count out of range: ${totalWords} (need 100-1000)`;
  }
  for (const seg of script.segments) {
    if (seg.speaker !== "HOST" && seg.speaker !== "GUEST") {
      return `Invalid speaker: ${seg.speaker}`;
    }
    if (!seg.text || seg.text.trim().length === 0) {
      return "Empty segment text";
    }
  }
  return null;
}

function parseScriptJson(text: string): PodcastScript | null {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(cleaned) as PodcastScript;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as PodcastScript;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function getFallbackScript(meta: RepoMeta): PodcastScript {
  return {
    title: `Understanding ${meta.repo}`,
    duration: "2 minutes",
    segments: [
      { speaker: "HOST", text: `Welcome to repocast! Today we're looking at ${meta.repo}, a really interesting project with ${meta.stars} stars.` },
      { speaker: "GUEST", text: `Thanks Alex! ${meta.repo} is ${meta.description || "a noteworthy project"} built primarily in ${meta.primaryLanguage || "multiple languages"}. It's been actively maintained and has a solid community.` },
      { speaker: "HOST", text: "Tell us about the architecture and what makes it technically impressive." },
      { speaker: "GUEST", text: `The codebase follows clean ${meta.primaryLanguage || "modern"} conventions with clear separation of concerns. The design decisions show real thoughtfulness about developer experience.` },
      { speaker: "HOST", text: "How would someone get started with this?" },
      { speaker: "GUEST", text: `It's straightforward — clone the repo, install dependencies, and follow the README. Anyone working with ${meta.primaryLanguage || "this stack"} should definitely check it out.` },
    ],
  };
}

export async function generatePodcastScript(
  meta: RepoMeta,
  files: RepoFile[],
  issueTitles: string[]
): Promise<PodcastScript> {
  const models = getAvailableModels();
  const prompt = buildPrompt(meta, files, issueTitles);

  for (const { name, model } of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[script-gen] Trying ${name}, attempt ${attempt + 1}`);
        const { text } = await generateText({
          model,
          prompt: attempt === 0
            ? prompt
            : `${prompt}\n\nIMPORTANT: Your previous response was invalid. Make sure to return ONLY valid JSON with at least 12 segments and 500-800 total words.`,
          maxOutputTokens: 4000,
          temperature: 0.7,
        });

        const script = parseScriptJson(text);
        if (!script) {
          console.warn(`[script-gen] ${name} attempt ${attempt + 1}: Failed to parse JSON`);
          continue;
        }

        const error = validateScript(script);
        if (error) {
          console.warn(`[script-gen] ${name} attempt ${attempt + 1}: Validation failed: ${error}`);
          continue;
        }

        console.log(`[script-gen] Success with ${name}`);
        return script;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[script-gen] ${name} attempt ${attempt + 1} failed: ${msg}`);
        const isAuthOrBilling = /credit balance|unauthorized|forbidden|invalid.*key|quota/i.test(msg);
        if (isAuthOrBilling) {
          console.warn(`[script-gen] ${name} has auth/billing issue, trying next provider...`);
          break;
        }
      }
    }
  }

  console.warn("[script-gen] All providers failed, using fallback script");
  return getFallbackScript(meta);
}
