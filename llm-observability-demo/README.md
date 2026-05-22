# LLM Observability Demo

A lightweight chatbot plus inference logging and ingestion system built with Node.js, Express, and a SQLite database powered by `sql.js`.

## What it does

- Multi-turn chatbot UI with conversation list, resume, and cancel actions
- Lightweight SDK/wrapper that records model, provider, latency, token usage, timestamps, status, session ID, and message previews
- Ingestion API that validates log payloads and stores processed data in SQLite
- Database storage for chat messages, inference logs, and extracted metadata
- PII redaction for email, phone, and card-like patterns before storing previews
- Multi-provider support through environment variables: OpenAI, Anthropic, Gemini, DeepSeek, or a mock fallback for local demos

## Quick Start

1. Install dependencies.

```bash
cd llm-observability-demo
npm install
```

2. Copy `.env.example` to `.env` and adjust values if you want a real provider.

```bash
copy .env.example .env
```

3. Start the app.

```bash
npm run dev
```

4. Open the UI at `http://localhost:8787`.

5. Optional: seed demo data explicitly.

```bash
npm run seed
```

### Docker Compose

You can also run the demo in one command:

```bash
docker compose up --build
```

The app will be available at `http://localhost:8787` and will persist the SQLite database in the `data` volume.

## Architecture

### Ingestion flow

The browser UI sends chat requests to the Express API. The server forwards the message to the selected LLM provider, captures timing and token metadata, and sends a log record to the ingestion endpoint in near real time using a small SDK wrapper. If the ingestion request fails, the server stores the log locally so the record is not lost.

### Logging strategy

The SDK captures:

- model and provider
- latency
- prompt/completion/total token usage when available
- timestamps
- request status or error
- conversation/session ID
- redacted input/output previews

PII is stripped from the stored previews before logs are persisted or ingested.

### Schema design decisions

The database uses four tables:

- `conversations` for lifecycle, provider, model, status, and summary data
- `messages` for the raw chat transcript
- `inference_logs` for the operational telemetry record
- `extracted_metadata` for key/value metadata that can be queried independently

This keeps the conversation data normalized while still making telemetry easy to query.

### Tradeoffs

- The local demo defaults to a mock provider so it works without API keys.
- `sql.js` keeps the app lightweight and portable, but a production deployment would likely use Postgres or a managed SQL service.
- The ingestion API and chatbot live in one Node process for simplicity; splitting them later is straightforward.
- Streaming is intentionally not implemented in the first pass to keep the architecture small and easy to review.

### What I would improve with more time

- Add streaming responses
- Add provider-specific retries and backoff
- Add charts for latency, throughput, error rate, and token trends
- Add background queueing for ingestion durability
- Add a production deployment target
- Add role-based auth and PII controls by tenant

## Demo Notes

This repository is intended to be a complete submission starter. The UI is available locally, and the architecture notes are in `docs/architecture.md`.
