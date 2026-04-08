import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

type AnyModel = ReturnType<typeof anthropic> | ReturnType<typeof openai> | ReturnType<typeof google>;

export interface ProviderEntry {
  name: string;
  model: AnyModel;
}

let cachedModels: ProviderEntry[] | null = null;

export function getAvailableModels(): ProviderEntry[] {
  if (cachedModels) return cachedModels;

  const models: ProviderEntry[] = [];

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const modelId = process.env.GOOGLE_MODEL ?? "gemini-2.0-flash";
    models.push({ name: `google (${modelId})`, model: google(modelId) });
  }

  if (process.env.AI_GATEWAY_URL && process.env.AI_GATEWAY_KEY) {
    const gateway = createOpenAICompatible({
      name: "ai-gateway",
      baseURL: process.env.AI_GATEWAY_URL.replace(/\/+$/, ""),
      headers: { Authorization: `Bearer ${process.env.AI_GATEWAY_KEY}` },
    });
    const modelId = process.env.AI_GATEWAY_MODEL ?? "anthropic.claude-sonnet-4-20250514";
    models.push({ name: `ai-gateway (${modelId})`, model: gateway(modelId) });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    models.push({ name: "anthropic", model: anthropic("claude-sonnet-4-20250514") });
  }

  if (process.env.OPENAI_API_KEY) {
    models.push({ name: "openai", model: openai("gpt-4o") });
  }

  if (process.env.OLLAMA_BASE_URL) {
    const ollama = createOpenAICompatible({
      name: "ollama",
      baseURL: `${process.env.OLLAMA_BASE_URL}/v1`,
    });
    models.push({ name: "ollama", model: ollama("llama3.1") });
  }

  if (models.length === 0) {
    throw new Error(
      "No AI provider configured. Set GOOGLE_GENERATIVE_AI_API_KEY, AI_GATEWAY_URL, ANTHROPIC_API_KEY, OPENAI_API_KEY, or OLLAMA_BASE_URL in .env."
    );
  }

  cachedModels = models;
  return models;
}

export function getFirstModel(): AnyModel {
  return getAvailableModels()[0].model;
}
