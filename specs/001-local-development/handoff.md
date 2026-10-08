# Handoff: Isolated local user metadata development

2026-10-07 · Complete for local service scope
[Spec](spec.md) · [Plan](plan.md) · [Tasks](tasks.md)

## Delivered

Explicit start:local fixes the MongoDB URI to user_metadata_local, sets development
mode and binds only to 127.0.0.1:3004. Local CORS permits the hosted shell and port
4201 origins. A wrapper guard supplies a synthetic admin only for loopback/approved
requests, delegates to platform authentication otherwise, and retains RolesGuard.
Unsafe local database/environment configuration fails before opening the listener.
HTTP startup refuses the DB-disabled OpenAPI generation mode.

Local role changes skip hosted auth synchronization, including direct sync calls.
Ordinary-mode auth/role sync remains unchanged. No routes, DTOs or schema changes.
Added @types/cookie-parser; fixed the touched bootstrap's error handling and replaced
unnecessary async OpenAPI stub methods to pass focused lint.

seed:local inserts missing synthetic admin/regular/publisher records, preserving
local edits. test:local:http creates and removes only its own unique disposable
record in the fixed local DB. Neither command drops a database or copies production.

## Verification

- PASS: 20 Jest tests, including local origin/peer/database restrictions, production
  flag rejection, normal-auth delegation and local-only role mutations.
- PASS: service build and postbuild OpenAPI generation; openapi.json unchanged.
- PASS: focused ESLint on src/local-development/*.ts, src/main.ts and the modified
  module. Full inherited service lint was not claimed or used as an acceptance gate.
- PASS: real MongoDB/HTTP journey: preflight/credentials, forbidden origin, invalid
  page/role, search/filter, profile edit/blank clearing, role mutation, delete/404.
- PASS: seed command run twice; existing synthetic fixtures retained.
- PASS: MFE development build now serves localhost:3004 API configuration.
- PASS: whitespace checks in both repositories.

The service is left running through npm run start:local on 127.0.0.1:3004;
MongoDB was already running on loopback. The existing port 4201 bundle server remains.
The served MFE dist was rebuilt using development rather than hosted-api.

## Remaining browser integration

The hosted shell still requires its browser-local user management remote selection
on http://localhost:4201/remoteEntry.js. This work did not change that setting or
perform production role/profile/deletion mutations. Activate the local remote, then
verify the three synthetic users and local edit/role/delete journeys. Assessment
history remains hosted and may be empty for synthetic UUIDs.

Updated service README/local development guide and the MFE development/readiness,
tasks/handoff docs. MFE X001 is complete; X002 browser verification remains explicit.
No deployment, contract publication or hosted identity changes were performed.
