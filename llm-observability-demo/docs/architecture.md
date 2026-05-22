# Architecture Notes

## Ingestion flow

1. User sends a chat message through the browser UI.
2. The server calls the selected model provider through the lightweight SDK wrapper.
3. The SDK captures inference metadata and sends it to `/ingest/inference` in near real time.
4. The ingestion endpoint validates the payload with Zod, writes the normalized record to SQLite, and also stores extracted key/value metadata.
5. If ingestion fails, the server keeps working and stores the log locally as a fallback.

## Logging strategy

- Capture provider, model, latency, timestamps, status, and token usage.
- Keep short input/output previews only.
- Apply PII redaction before previews are persisted.
- Track both the conversation ID and session ID so chat logs can be correlated with inference telemetry.

## Scaling considerations

- Split the ingestion API into a separate service if throughput grows.
- Replace local SQLite with Postgres or another managed database for multi-instance writes.
- Move ingestion to a queue if the application needs stronger delivery guarantees.
- Add read replicas or a materialized analytics store for dashboard queries.

## Failure handling assumptions

- If the model call fails, the mock fallback keeps the demo responsive.
- If the ingestion endpoint is down, the request is still completed and the server stores the log directly.
- If the database is unavailable, the request will fail fast so the issue is visible during testing.
