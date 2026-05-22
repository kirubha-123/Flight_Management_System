import express, { type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  appendMessage,
  bootstrapDatabase,
  createConversation,
  getConversation,
  getDashboardSummary,
  listConversations,
  seedDemoConversation,
  storeInferenceLog,
  updateConversationStatus,
} from "./db.js";
import { generateReply, type ProviderName } from "./llm/providers.js";
import { InferenceLogger } from "./llm/sdk.js";
import { redactPii } from "./utils/pii.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const port = Number(process.env.PORT ?? 8787);
const baseUrl = process.env.APP_BASE_URL ?? `http://localhost:${port}`;
const ingestKey = process.env.INGESTION_API_KEY ?? "demo-ingest-key";
const provider = (process.env.LLM_PROVIDER ?? "mock") as ProviderName;
const modelByProvider: Record<string, string> = {
  mock: "demo-telemetry-model",
  openai: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  anthropic: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
  gemini: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
  deepseek: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
};

const apiKeyByProvider: Record<string, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  mock: undefined,
};

const app = express();
const ingestionLogger = new InferenceLogger(`${baseUrl}/ingest/inference`, ingestKey);

const chatSchema = z.object({
  content: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
});

const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

const ingestionSchema = z.object({
  requestId: z.string().min(6),
  conversationId: z.string().uuid(),
  sessionId: z.string().uuid(),
  provider: z.string().min(1),
  model: z.string().min(1),
  latencyMs: z.number().int().nonnegative(),
  status: z.enum(["ok", "error"]),
  error: z.string().optional(),
  requestStartedAt: z.string().datetime(),
  requestFinishedAt: z.string().datetime(),
  inputPreview: z.string(),
  outputPreview: z.string(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "llm-observability-demo" });
});

app.get("/api/summary", async (_req: Request, res: Response) => {
  res.json(await getDashboardSummary());
});

app.get("/api/conversations", async (_req: Request, res: Response) => {
  res.json(await listConversations());
});

app.post("/api/conversations", async (req: Request, res: Response) => {
  const parsed = createConversationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const conversation = await createConversation({
    title: parsed.data.title,
    provider,
    model: modelByProvider[provider] ?? modelByProvider.mock,
    initialMessage: parsed.data.title,
  });

  res.status(201).json(conversation);
});

app.get("/api/conversations/:id", async (req: Request<{ id: string }>, res: Response) => {
  const conversation = await getConversation(req.params.id);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.json(conversation);
});

app.post("/api/conversations/:id/cancel", async (req: Request<{ id: string }>, res: Response) => {
  const conversation = await getConversation(req.params.id);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await updateConversationStatus(req.params.id, "cancelled");
  res.json({ ok: true });
});

app.post("/api/conversations/:id/resume", async (req: Request<{ id: string }>, res: Response) => {
  const conversation = await getConversation(req.params.id);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await updateConversationStatus(req.params.id, "active");
  res.json({ ok: true });
});

app.post("/api/conversations/:id/messages", async (req: Request<{ id: string }>, res: Response) => {
  const parsed = chatSchema.safeParse({ ...req.body, conversationId: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const conversation = await getConversation(parsed.data.conversationId!);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  if (conversation.status === "cancelled") {
    res.status(409).json({ error: "Conversation is cancelled. Resume it before sending messages." });
    return;
  }

  const sessionId = conversation.id;
  const userMessage = redactPii(parsed.data.content);
  const startedAt = new Date();
  const requestId = randomUUID();

  await appendMessage({
    conversationId: conversation.id,
    role: "user",
    content: userMessage,
  });

  const shortContext = conversation.messages
    .slice(-8)
    .map((message) => ({ role: message.role, content: message.content }));

  const generation = await generateReply({
    provider,
    model: modelByProvider[provider] ?? modelByProvider.mock,
    apiKey: apiKeyByProvider[provider],
    messages: [
      {
        role: "system",
        content:
          "You are a concise assistant inside a telemetry demo. Keep replies short, helpful, and context-aware."
      },
      ...shortContext,
      {
        role: "user",
        content: userMessage,
      },
    ],
    conversationId: conversation.id,
  });

  await appendMessage({
    conversationId: conversation.id,
    role: "assistant",
    content: generation.content,
  });

  const finishedAt = new Date();
  const logPayload = {
    requestId,
    conversationId: conversation.id,
    sessionId,
    provider,
    model: modelByProvider[provider] ?? modelByProvider.mock,
    latencyMs: generation.latencyMs,
    status: generation.status,
    error: generation.error,
    requestStartedAt: startedAt.toISOString(),
    requestFinishedAt: finishedAt.toISOString(),
    inputPreview: redactPii(userMessage),
    outputPreview: redactPii(generation.content),
    promptTokens: generation.usage.promptTokens,
    completionTokens: generation.usage.completionTokens,
    totalTokens: generation.usage.totalTokens,
    metadata: {
      provider,
      model: modelByProvider[provider] ?? modelByProvider.mock,
      conversation_turns: conversation.messages.length + 1,
      redacted: true,
    },
  };

  try {
    await ingestionLogger.log(logPayload);
  } catch {
    await storeInferenceLog(logPayload);
  }

  res.json({
    response: generation.content,
    status: generation.status,
    latencyMs: generation.latencyMs,
    usage: generation.usage,
    error: generation.error ?? null,
  });
});

app.post("/ingest/inference", async (req: Request, res: Response) => {
  const parsed = ingestionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const providedKey = req.header("x-ingest-key");
  if (providedKey !== ingestKey) {
    res.status(401).json({ error: "Invalid ingestion key" });
    return;
  }

  const logId = await storeInferenceLog(parsed.data);
  res.status(201).json({ ok: true, logId });
});

app.get("/api/logs", async (_req: Request, res: Response) => {
  const { listInferenceLogs } = await import("./db.js");
  res.json(await listInferenceLogs());
});

async function main() {
  await bootstrapDatabase();
  await seedDemoConversation();

  app.listen(port, () => {
    console.log(`LLM observability demo running at ${baseUrl}`);
  });
}

void main();
