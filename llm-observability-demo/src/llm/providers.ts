import { randomUUID } from "node:crypto";
import { redactPii } from "../utils/pii.js";

export type ProviderName = "mock" | "openai" | "anthropic" | "gemini" | "deepseek";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerationInput {
  provider: ProviderName;
  model: string;
  apiKey?: string;
  messages: ChatMessage[];
  conversationId: string;
}

export interface GenerationResult {
  content: string;
  latencyMs: number;
  status: "ok" | "error";
  error?: string;
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  raw?: unknown;
}

function countApproxTokens(text: string) {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

function estimateUsage(messages: ChatMessage[], reply: string) {
  const promptTokens = countApproxTokens(messages.map((message) => message.content).join("\n"));
  const completionTokens = countApproxTokens(reply);
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

function buildMockReply(messages: ChatMessage[], conversationId: string) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const previousTurns = messages.filter((message) => message.role !== "system").length;
  const safeMessage = redactPii(lastUserMessage, 120);

  return [
    `Conversation ${conversationId.slice(0, 8)}: I saw "${safeMessage}".`,
    `I kept ${Math.max(0, previousTurns - 1)} earlier turn(s) in short context.`,
    "This demo can swap providers without changing the SDK wrapper."
  ].join(" ");
}

async function callOpenAI(messages: ChatMessage[], apiKey: string, model: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3
    })
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message ?? `OpenAI request failed with ${response.status}`);
  }

  return {
    content: json.choices?.[0]?.message?.content ?? "",
    usage: json.usage
  };
}

async function callAnthropic(messages: ChatMessage[], apiKey: string, model: string) {
  const systemPrompt = messages.find((message) => message.role === "system")?.content ?? "";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      system: systemPrompt,
      messages: messages.filter((message) => message.role !== "system")
    })
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message ?? `Anthropic request failed with ${response.status}`);
  }

  return {
    content: (json.content ?? [])
      .map((part: { type?: string; text?: string }) => (part.type === "text" ? part.text : ""))
      .join(""),
    usage: {
      promptTokens: json.usage?.input_tokens,
      completionTokens: json.usage?.output_tokens,
      totalTokens: (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0)
    }
  };
}

async function callGemini(messages: ChatMessage[], apiKey: string, model: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: messages.filter((message) => message.role !== "system").map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }]
        }))
      })
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message ?? `Gemini request failed with ${response.status}`);
  }

  const candidate = json.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  return {
    content: parts.map((part: { text?: string }) => part.text ?? "").join(""),
    usage: {
      promptTokens: json.usageMetadata?.promptTokenCount,
      completionTokens: json.usageMetadata?.candidatesTokenCount,
      totalTokens:
        (json.usageMetadata?.promptTokenCount ?? 0) + (json.usageMetadata?.candidatesTokenCount ?? 0)
    }
  };
}

async function callDeepSeek(messages: ChatMessage[], apiKey: string, model: string) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3
    })
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message ?? `DeepSeek request failed with ${response.status}`);
  }

  return {
    content: json.choices?.[0]?.message?.content ?? "",
    usage: json.usage
  };
}

export async function generateReply(input: GenerationInput): Promise<GenerationResult> {
  const startedAt = performance.now();
  const requestId = randomUUID();

  try {
    let content = "";
    let usage: GenerationResult["usage"] = estimateUsage(input.messages, "");
    let raw: unknown;

    switch (input.provider) {
      case "openai": {
        const result = await callOpenAI(input.messages, input.apiKey ?? "", input.model);
        content = result.content;
        usage = result.usage ?? usage;
        raw = result;
        break;
      }
      case "anthropic": {
        const result = await callAnthropic(input.messages, input.apiKey ?? "", input.model);
        content = result.content;
        usage = result.usage ?? usage;
        raw = result;
        break;
      }
      case "gemini": {
        const result = await callGemini(input.messages, input.apiKey ?? "", input.model);
        content = result.content;
        usage = result.usage ?? usage;
        raw = result;
        break;
      }
      case "deepseek": {
        const result = await callDeepSeek(input.messages, input.apiKey ?? "", input.model);
        content = result.content;
        usage = result.usage ?? usage;
        raw = result;
        break;
      }
      default: {
        content = buildMockReply(input.messages, input.conversationId);
        usage = estimateUsage(input.messages, content);
        raw = { mode: "mock", requestId };
      }
    }

    return {
      content,
      latencyMs: Math.round(performance.now() - startedAt),
      status: "ok",
      usage,
      raw
    };
  } catch (error) {
    const fallback = buildMockReply(input.messages, input.conversationId);
    return {
      content: fallback,
      latencyMs: Math.round(performance.now() - startedAt),
      status: "error",
      error: error instanceof Error ? error.message : "Unknown model error",
      usage: estimateUsage(input.messages, fallback),
      raw: { requestId, fallback: true }
    };
  }
}
