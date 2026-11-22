# Architecture — service-user-metadata

Source baseline: `b403877`; maintenance verified locally on 2026-11-22.

## Ownership

User metadata, roles and learner progression. Inspect boundaries between user metadata, workshop progress and coding-lab attempts. Preserve role/admin policies, user identity, progress calculations and external owner contracts; never log profile or learner content.

## Source map

- `src/app.module.ts`
- `src/coding-lab-attempts`
- `src/local-development`
- `src/main.ts`
- `src/observability`
- `src/swagger.ts`
- `src/user-metadata`
- `src/workshop-progress`

`src/app.module.ts` is the composition root: ObservabilityModule, global Config,
the Mongo connection, UserMetadataAccessModule and the three domain modules.

| Module                   | Private providers / dependencies                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| UserMetadataModule       | UserMetadataController/Service, UserMetadata model, HttpModule for owner auth API                                            |
| CodingLabAttemptModule   | CodingLabAttemptController/Service, CodingLabAttempt model, HttpModule for published-lab/runner API                          |
| WorkshopProgressModule   | WorkshopProgressController/Service, WorkshopProgress model, HttpModule for document/assessment APIs, pure progression policy |
| UserMetadataAccessModule | NgxAuthClientModule; global UserMetadataAuthGuard followed by RolesGuard                                                     |
| ObservabilityModule      | Terminus health controller; HTTP/domain logging helpers in observability.ts                                                  |

Feature modules export no providers and do not import each other. There are no
service cycles, duplicate domain registrations or forwardRef calls. Each feature
owns its own Mongoose registration; DB-disabled contract generation uses local
model stubs and does not execute persistence. Global access remains explicit at
the composition root, including the existing exact anonymous heartbeat exception
and the isolated local-development authentication wrapper.

Controllers retain transport validation, decorators and delegation. The metadata
PUT controller intentionally awaits its upsert without returning its document:
the existing 200/empty response is preserved. Progress calculations remain pure
policy functions; lab start uniqueness, ownership, optimistic revisions, grading
leases and finally cleanup are unchanged. Existing metadata provisioning remains
an auth-owned account request followed by retry-safe profile upsert, not a
cross-service transaction.

`src/observability/` keeps native structured HTTP logging and heartbeat support;
it now also scopes generated IDs with AsyncLocalStorage and logs bounded
top-level use-case outcomes. See [observability.md](observability.md) for the
collector contract, safe fields and correlation limits.

## External boundaries

Use installed dependencies in `package.json` and actual source imports as the
baseline for HTTP clients, auth and persistence. Inspect source, DTOs and existing
specs for current access/error policy. `test/`, when present, contains integration
configuration; generated artifacts are outputs, not the contract source.

The source-backed [maintenance audit](../specs/002-code-maintenance/audit.md)
records selected findings, preserved policies and deferred issues. This is not a
full security audit or live integration certification. External ownership remains
HTTP-only; no other service's collections are accessed.
