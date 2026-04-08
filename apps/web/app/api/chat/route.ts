import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getFirstModel } from "@/lib/ai-provider";
import { getSession } from "@/lib/store";
import { embedQuery, retrieveContext, assembleContextWindow, getSourceFiles } from "@/lib/rag";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { owner, repo, messages } = body;

  if (!owner || !repo || !messages?.length) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const sessionId = `${owner}/${repo}`;
  const session = getSession(sessionId);

  if (!session) {
    return Response.json(
      { error: "Repository not ingested. Please ingest first." },
      { status: 404 }
    );
  }

  const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  if (!lastUserMessage) {
    return Response.json({ error: "No user message found" }, { status: 400 });
  }

  let contextWindow = "";
  let sourceFiles: string[] = [];

  try {
    const queryEmbed = await embedQuery(lastUserMessage.content);
    const retrieved = await retrieveContext(sessionId, queryEmbed);

    if (retrieved.length === 0) {
      contextWindow = "No relevant code chunks found for this query.";
    } else {
      contextWindow = assembleContextWindow(retrieved);
      sourceFiles = getSourceFiles(retrieved);
    }
  } catch (err) {
    console.error("[chat] RAG retrieval failed:", err);
    contextWindow = "Code retrieval temporarily unavailable.";
  }

  const meta = session.repoMeta;
  const systemPrompt = `You are an expert on the ${meta.owner}/${meta.repo} GitHub repository. You answer questions based strictly on the repository's actual source code and documentation.

Repository overview:
${meta.description ?? "No description available."}
Primary language: ${meta.primaryLanguage ?? "Unknown"}
Stars: ${meta.stars}

Rules:
- Answer only from the provided source excerpts
- If the answer is not in the provided context, say "I couldn't find that in the repository's code"
- Always mention which file your answer comes from
- Be concise — 2–4 sentences unless a longer answer is clearly needed
- Use code examples from the actual repo when relevant

Source excerpts:
${contextWindow}`;

  const model = getFirstModel();

  const result = streamText({
    model,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    maxOutputTokens: 1000,
    temperature: 0.3,
  });

  const response = result.toTextStreamResponse();

  response.headers.set("X-Sources", JSON.stringify(sourceFiles));

  return response;
}
