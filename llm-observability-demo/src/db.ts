import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import initSqlJs, { type SqlJsDatabase, type SqlJsStatement, type SqlJsStatic } from "sql.js";
import { redactPii } from "./utils/pii.js";

export interface ConversationSummary {
  id: string;
  title: string;
  provider: string;
  model: string;
  status: "active" | "cancelled";
  summary: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationRecord extends ConversationSummary {
  messages: ChatRecord[];
}

export interface ChatRecord {
  id: string;
  conversationId: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface InferenceLogRecord {
  id: string;
  requestId: string;
  conversationId: string;
  sessionId: string;
  provider: string;
  model: string;
  latencyMs: number;
  status: "ok" | "error";
  error: string | null;
  requestStartedAt: string;
  requestFinishedAt: string;
  inputPreview: string;
  outputPreview: string;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  metadataJson: string;
  createdAt: string;
}

const rootDir = process.cwd();
const dataDir = path.join(rootDir, "data");
const dbFile = path.join(dataDir, "observability.sqlite");
const require = createRequire(import.meta.url);
const wasmFile = require.resolve("sql.js/dist/sql-wasm.wasm");

let sqlPromise: ReturnType<typeof initSqlJs> | null = null;
let dbInstance: SqlJsDatabase | null = null;

const schemaSql = `
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_message_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inference_logs (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error')),
  error TEXT,
  request_started_at TEXT NOT NULL,
  request_finished_at TEXT NOT NULL,
  input_preview TEXT NOT NULL,
  output_preview TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS extracted_metadata (
  id TEXT PRIMARY KEY,
  log_id TEXT NOT NULL REFERENCES inference_logs(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

function nowIso() {
  return new Date().toISOString();
}

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function saveDb() {
  if (!dbInstance) {
    return;
  }

  ensureDataDir();
  const bytes = dbInstance.export();
  fs.writeFileSync(dbFile, Buffer.from(bytes));
}

async function getSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => wasmFile,
    }) as Promise<SqlJsStatic>;
  }

  return sqlPromise;
}

async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  ensureDataDir();
  const SQL = await getSql();
  if (fs.existsSync(dbFile)) {
    const fileBytes = fs.readFileSync(dbFile);
    dbInstance = new SQL.Database(fileBytes);
  } else {
    dbInstance = new SQL.Database();
  }

  dbInstance.exec(schemaSql);
  saveDb();
  return dbInstance;
}

function rowsFromStatement(stmt: SqlJsStatement) {
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

async function queryAll<T>(sql: string, params: unknown[] = []) {
  const db = await getDb();
  const stmt = db.prepare(sql);
  if (params.length) {
    stmt.bind(params);
  }
  return rowsFromStatement(stmt) as T[];
}

async function queryOne<T>(sql: string, params: unknown[] = []) {
  const rows = await queryAll<T>(sql, params);
  return rows[0] ?? null;
}

async function execute(sql: string, params: unknown[] = []) {
  const db = await getDb();
  const stmt = db.prepare(sql);
  if (params.length) {
    stmt.bind(params);
  }
  stmt.step();
  stmt.free();
  saveDb();
}

function titleFromMessage(message: string) {
  const safe = redactPii(message, 50);
  const words = safe.split(/\s+/).slice(0, 6).join(" ");
  return words ? words.replace(/[^\w\s-]/g, "").trim() : "New conversation";
}

export async function bootstrapDatabase() {
  await getDb();
}

export async function listConversations(): Promise<ConversationSummary[]> {
  return queryAll<ConversationSummary>(`
    SELECT
      c.id,
      c.title,
      c.provider,
      c.model,
      c.status,
      c.summary,
      c.created_at AS createdAt,
      c.updated_at AS updatedAt,
      c.last_message_at AS lastMessageAt,
      COUNT(m.id) AS messageCount
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id
    GROUP BY c.id
    ORDER BY datetime(c.last_message_at) DESC
  `);
}

export async function getConversation(id: string): Promise<ConversationRecord | null> {
  const conversation = await queryOne<ConversationSummary>(
    `
      SELECT
        id,
        title,
        provider,
        model,
        status,
        summary,
        created_at AS createdAt,
        updated_at AS updatedAt,
        last_message_at AS lastMessageAt,
        0 AS messageCount
      FROM conversations
      WHERE id = ?
    `,
    [id]
  );

  if (!conversation) {
    return null;
  }

  const messages = await queryAll<ChatRecord>(
    `
      SELECT
        id,
        conversation_id AS conversationId,
        role,
        content,
        created_at AS createdAt
      FROM messages
      WHERE conversation_id = ?
      ORDER BY datetime(created_at) ASC
    `,
    [id]
  );

  const messageCount = messages.length;

  return {
    ...conversation,
    messageCount,
    messages,
  };
}

export async function createConversation(input: {
  title?: string;
  provider: string;
  model: string;
  initialMessage?: string;
}) {
  const id = randomUUID();
  const createdAt = nowIso();
  const title = input.title?.trim() || titleFromMessage(input.initialMessage ?? "New conversation");

  await execute(
    `
      INSERT INTO conversations (id, title, provider, model, status, summary, created_at, updated_at, last_message_at)
      VALUES (?, ?, ?, ?, 'active', '', ?, ?, ?)
    `,
    [id, title, input.provider, input.model, createdAt, createdAt, createdAt]
  );

  return getConversation(id);
}

export async function appendMessage(input: {
  conversationId: string;
  role: "system" | "user" | "assistant";
  content: string;
}) {
  const id = randomUUID();
  const createdAt = nowIso();

  await execute(
    `
      INSERT INTO messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [id, input.conversationId, input.role, input.content, createdAt]
  );

  await execute(
    `
      UPDATE conversations
      SET updated_at = ?, last_message_at = ?
      WHERE id = ?
    `,
    [createdAt, createdAt, input.conversationId]
  );

  return id;
}

export async function updateConversationStatus(conversationId: string, status: "active" | "cancelled") {
  const updatedAt = nowIso();
  await execute(
    `
      UPDATE conversations
      SET status = ?, updated_at = ?
      WHERE id = ?
    `,
    [status, updatedAt, conversationId]
  );
}

export async function storeInferenceLog(input: {
  requestId: string;
  conversationId: string;
  sessionId: string;
  provider: string;
  model: string;
  latencyMs: number;
  status: "ok" | "error";
  error?: string;
  requestStartedAt: string;
  requestFinishedAt: string;
  inputPreview: string;
  outputPreview: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  metadata?: Record<string, unknown>;
}) {
  const id = randomUUID();
  const createdAt = nowIso();
  const metadataJson = JSON.stringify(input.metadata ?? {});

  await execute(
    `
      INSERT INTO inference_logs (
        id,
        request_id,
        conversation_id,
        session_id,
        provider,
        model,
        latency_ms,
        status,
        error,
        request_started_at,
        request_finished_at,
        input_preview,
        output_preview,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.requestId,
      input.conversationId,
      input.sessionId,
      input.provider,
      input.model,
      input.latencyMs,
      input.status,
      input.error ?? null,
      input.requestStartedAt,
      input.requestFinishedAt,
      input.inputPreview,
      input.outputPreview,
      input.promptTokens ?? null,
      input.completionTokens ?? null,
      input.totalTokens ?? null,
      metadataJson,
      createdAt,
    ]
  );

  const metadataEntries = Object.entries({
    provider: input.provider,
    model: input.model,
    status: input.status,
    latency_ms: String(input.latencyMs),
    conversation_id: input.conversationId,
    session_id: input.sessionId,
    ...(input.metadata ?? {}),
  });

  for (const [key, value] of metadataEntries) {
    await execute(
      `
        INSERT INTO extracted_metadata (id, log_id, key, value, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      [randomUUID(), id, key, String(value), createdAt]
    );
  }

  return id;
}

export async function listInferenceLogs() {
  return queryAll<InferenceLogRecord>(`
    SELECT
      id,
      request_id AS requestId,
      conversation_id AS conversationId,
      session_id AS sessionId,
      provider,
      model,
      latency_ms AS latencyMs,
      status,
      error,
      request_started_at AS requestStartedAt,
      request_finished_at AS requestFinishedAt,
      input_preview AS inputPreview,
      output_preview AS outputPreview,
      prompt_tokens AS promptTokens,
      completion_tokens AS completionTokens,
      total_tokens AS totalTokens,
      metadata_json AS metadataJson,
      created_at AS createdAt
    FROM inference_logs
    ORDER BY datetime(created_at) DESC
  `);
}

export async function seedDemoConversation() {
  const existing = await listConversations();
  if (existing.length > 0) {
    return existing[0];
  }

  const demoConversation = await createConversation({
    title: "Demo telemetry session",
    provider: "mock",
    model: "demo-telemetry-model",
    initialMessage: "How do you log inference metadata?",
  });

  if (!demoConversation) {
    return null;
  }

  await appendMessage({
    conversationId: demoConversation.id,
    role: "user",
    content: "How do you log inference metadata?"
  });

  await appendMessage({
    conversationId: demoConversation.id,
    role: "assistant",
    content: "A lightweight SDK captures model, provider, latency, usage, and outcome, then posts to an ingestion API in near real time."
  });

  await storeInferenceLog({
    requestId: randomUUID(),
    conversationId: demoConversation.id,
    sessionId: demoConversation.id,
    provider: "mock",
    model: "demo-telemetry-model",
    latencyMs: 23,
    status: "ok",
    requestStartedAt: nowIso(),
    requestFinishedAt: nowIso(),
    inputPreview: "How do you log inference metadata?",
    outputPreview: "A lightweight SDK captures model, provider, latency, usage, and outcome.",
    promptTokens: 18,
    completionTokens: 20,
    totalTokens: 38,
    metadata: {
      demo: true,
      note: "seeded record",
    }
  });

  return demoConversation;
}

export async function getDashboardSummary() {
  const conversations = await listConversations();
  const logs = await listInferenceLogs();

  const totalLatency = logs.reduce((sum, log) => sum + log.latencyMs, 0);
  const errorCount = logs.filter((log) => log.status === "error").length;
  const totalTokens = logs.reduce((sum, log) => sum + (log.totalTokens ?? 0), 0);
  const throughput = conversations.length === 0 ? 0 : Math.round(logs.length / Math.max(1, conversations.length));

  return {
    conversations: conversations.length,
    logs: logs.length,
    errors: errorCount,
    avgLatencyMs: logs.length ? Math.round(totalLatency / logs.length) : 0,
    totalTokens,
    throughput,
  };
}
