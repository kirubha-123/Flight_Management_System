export interface InferenceLogPayload {
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
}

export class InferenceLogger {
  constructor(
    private readonly ingestionUrl: string,
    private readonly ingestionKey: string,
  ) {}

  async log(payload: InferenceLogPayload) {
    const response = await fetch(this.ingestionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-key": this.ingestionKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Ingestion failed with ${response.status}`);
    }

    return response.json();
  }
}
