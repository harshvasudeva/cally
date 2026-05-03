// AI provider registry + factory.
// Each user supplies their own API key; we instantiate the right provider via the Vercel AI SDK.
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { decrypt } from "@/lib/crypto";

export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "mistral"
  | "openrouter"
  | "ollama";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  description: string;
  /** Free-text vs preset */
  modelInputType: "preset" | "freeform";
  models: string[];
  capabilities: ("chat" | "tools" | "vision" | "json")[];
  requiresBaseUrl: boolean;
  signupUrl: string;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT-5.x, GPT-4.x family",
    modelInputType: "preset",
    models: ["gpt-5.2", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini"],
    capabilities: ["chat", "tools", "vision", "json"],
    requiresBaseUrl: false,
    signupUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    description: "Claude Sonnet, Opus, Haiku 4.x",
    modelInputType: "preset",
    models: [
      "claude-sonnet-4-6",
      "claude-opus-4-6",
      "claude-sonnet-4-5-20250929",
      "claude-haiku-4-5-20251001",
      "claude-opus-4-5-20251101",
    ],
    capabilities: ["chat", "tools", "vision", "json"],
    requiresBaseUrl: false,
    signupUrl: "https://console.anthropic.com/settings/keys",
  },
  google: {
    id: "google",
    name: "Google Gemini",
    description: "Gemini 3.x and 2.5 family",
    modelInputType: "preset",
    models: ["gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash"],
    capabilities: ["chat", "tools", "vision", "json"],
    requiresBaseUrl: false,
    signupUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference for Llama, Mixtral",
    modelInputType: "preset",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
    capabilities: ["chat", "tools"],
    requiresBaseUrl: false,
    signupUrl: "https://console.groq.com/keys",
  },
  mistral: {
    id: "mistral",
    name: "Mistral",
    description: "Mistral Large, Small, Codestral",
    modelInputType: "preset",
    models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest", "ministral-8b-latest"],
    capabilities: ["chat", "tools", "json"],
    requiresBaseUrl: false,
    signupUrl: "https://console.mistral.ai/api-keys",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    description: "Unified gateway to 200+ models",
    modelInputType: "freeform",
    models: ["anthropic/claude-sonnet-4.5", "openai/gpt-5.1", "google/gemini-2.5-pro", "meta-llama/llama-3.3-70b-instruct"],
    capabilities: ["chat", "tools"],
    requiresBaseUrl: false,
    signupUrl: "https://openrouter.ai/keys",
  },
  ollama: {
    id: "ollama",
    name: "Ollama (self-hosted)",
    description: "Your local LLM runtime — provide base URL",
    modelInputType: "freeform",
    models: ["llama3.3", "qwen2.5:32b", "deepseek-r1", "phi4"],
    capabilities: ["chat"],
    requiresBaseUrl: true,
    signupUrl: "https://ollama.com/download",
  },
};

export interface CredentialRow {
  providerId: string;
  apiKeyEnc: string;
  baseUrl: string | null;
  defaultModel: string;
}

/** Build a Vercel AI SDK provider client from a stored UserAICredential. */
export function buildModel(cred: CredentialRow, modelId?: string) {
  const apiKey = decrypt(cred.apiKeyEnc);
  const model = modelId ?? cred.defaultModel;
  switch (cred.providerId as ProviderId) {
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);
    case "groq":
      return createGroq({ apiKey })(model);
    case "mistral":
      return createMistral({ apiKey })(model);
    case "openrouter":
      return createOpenAICompatible({ name: "openrouter", baseURL: "https://openrouter.ai/api/v1", apiKey })(model);
    case "ollama":
      if (!cred.baseUrl) throw new Error("Ollama requires baseUrl");
      return createOpenAICompatible({ name: "ollama", baseURL: cred.baseUrl, apiKey: "ollama" })(model);
    default:
      throw new Error(`Unknown provider: ${cred.providerId}`);
  }
}

/** Quick health check: try a 1-token completion. */
export async function testCredential(cred: CredentialRow): Promise<{ ok: boolean; error?: string }> {
  try {
    const { generateText } = await import("ai");
    const result = await generateText({
      model: buildModel(cred),
      prompt: "Reply with exactly: OK",
    });
    return { ok: true && (result.text?.length ?? 0) > 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
