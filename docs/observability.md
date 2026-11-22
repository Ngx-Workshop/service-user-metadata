# Service logging and heartbeat

This service uses native NestJS 11 `ConsoleLogger` JSON output to stdout/stderr, with `Logger` context for application events. No Angular logger or application-held Grafana credential is used. HTTP logs contain generated request ID, method, route template, status and duration; bodies, cookies, authorization headers, concrete identifiers and query strings are not logged by the middleware. Health polling is excluded from access logs. Avoid embedding secrets or personal search text in domain log messages.

## Domain outcomes and correlation

Top-level metadata account provisioning/upsert/update/remove/role update,
coding-attempt start/save/submit, and workshop catalog/start/complete/page/seen
operations emit one contextual outcome each. Stable event names are a compile-time
allowlist in `src/observability/observability.ts`. Nested use cases contribute to
the outer operation, not repeated per-section/page events. Read-only metadata
lookups and demo assessment/reset paths have no dedicated domain events; demo
catalog refreshes can emit `workshop_catalog`. HTTP logs remain.

Each outcome has an opaque generated `operationId`, duration in milliseconds and
`outcome: success|failure`. HTTP-driven outcomes also have the middleware's generated
`requestId`. Failures include only the final safe numeric `statusCode`: client/access
errors use warn, server/storage/upstream failures use error; success uses log.
Exception messages/stacks, profiles, identities, role values, learner code/results,
answers, query text, credentials and caller idempotency IDs are never passed to
the outcome logger. HTTP and domain events are distinct scopes, not two domain
errors. Duration covers the whole use case, including upstream/storage work and
lease cleanup; there is no per-upstream timing/span instrumentation.

AsyncLocalStorage isolates concurrent request/operation context. Incoming
`X-Request-ID` values (including valid-looking IDs) are deliberately ignored;
only locally generated UUIDs are returned and forwarded in owner HTTP requests.
No arbitrary headers are forwarded. Existing credential forwarding remains
unchanged. Outside an HTTP context, an operation generates only an operation ID,
used as its outbound correlation ID. Code outside an observed operation has no
correlation header. This is local correlation, not distributed tracing: downstream
owners may ignore/regenerate the header. Work spawned within an operation inherits
its async context; there is no job scheduler or detached-work lifecycle added here.

Native JSON field placement, verified by intercepting real logger output:

```json
{
  "level": "error",
  "context": "UserMetadataService",
  "message": {
    "event": "account_provision",
    "operationId": "8f866662-278c-4a54-a81e-37a05d302f6b",
    "requestId": "098d89cb-0e30-41dc-b1f5-178d19124a99",
    "durationMs": 12,
    "outcome": "failure",
    "statusCode": 503
  }
}
```

The native logger also adds its usual timestamp/pid fields. Structured payloads
remain nested under `message`; the collector/stdout JSON envelope is unchanged.
Useful Loki queries, after selecting the existing service stream in Grafana:

```logql
{service_name="service-user-metadata"} | json event="message.event", outcome="message.outcome" | outcome="failure"
{service_name="service-user-metadata"} | json requestId="message.requestId" | requestId="098d89cb-0e30-41dc-b1f5-178d19124a99"
```

Confirm the actual stream selector with the infrastructure owner; no local test
proves that `service_name` is the deployed label. Keep operation/request IDs as
parsed fields, never high-cardinality Loki labels.

Maintenance validation on 2026-11-22: native domain JSON scenarios (5), HTTP
observability scenarios (7), composition-root access/validation/correlation
scenarios (4), and the existing guarded heartbeat regression passed. The full
local Jest suite passed 79 cases; 5 disposable Mongo HTTP cases and build passed.
Live Grafana/Alloy receipt and target-container behavior remain pending in the
[maintenance handoff](../specs/002-code-maintenance/handoff.md).

`GET /health` and HEAD return the anonymous operational Terminus heartbeat with `status: ok` and `heartbeat: up`, plus `Cache-Control: no-store`. This is liveness only; it does not claim MongoDB or upstream readiness. Existing business-route authentication remains enforced. The gateway's exact read-only heartbeat is the only exception to its normalized proxy-envelope requirement. The operational endpoint is excluded from business Swagger/contracts where that service generates them.

Docker probes `/health` every 30 seconds. Deployments bound each container's local JSON log files to 10 MiB × 3. Host Alloy discovers active service names and ships logs and private HTTP heartbeat probe metrics to Grafana Cloud stack `ivorytoffee195`. Collector configuration/dashboard lives in infrastructure owner `nginx-ngx-workshop.io/ops/grafana`; its ingestion token remains host-owned, scoped to logs/metrics write, and requires account authorization before activation. No production credential belongs in this repository.

Validation on 2026-11-21: the isolated observability HTTP suite passed (5 scenarios), build passed, Linux-targeted lockfile dry run passed. Guarded services additionally passed the anonymous-heartbeat/protected-business-route HTTP test. Gateway production ingress e2e passed (51 scenarios), including exact-path/method heartbeat boundaries. Gateway and publisher lint passed. Full existing unit suites passed except Backstage's unchanged Octokit ESM test-loader failure, reproduced on its pre-change HEAD. Uploader tests pass under its documented `npm test` command; its 10 optional cases remain skipped. Publisher persistence e2e cases require the isolated Mongo URI and remain skipped when unavailable. These are local checks, not evidence of Grafana ingestion or live deployment.
