# Feature: Isolated local user metadata development

2026-10-07 · Complete (local service acceptance verified; host browser integration separate)

The admin user management MFE already targets localhost:3004 in development.
This service currently lacks local CORS/auth/database setup and role edits trigger
hosted auth sync. The user authorized adding the backend setup after the MFE refactor.

- FR-001: explicit start:local uses only loopback and user_metadata_local MongoDB;
  an unsafe database or production environment with the local flag fails startup.
- FR-002: approved shell/local browser origins can call the local service using
  synthetic local-admin identity; RolesGuard remains active. Other origins and
  non-loopback peers cannot use local identity.
- FR-003: local role changes never call the hosted identity service. Ordinary
  startup keeps platform authentication and existing role-sync behavior.
- FR-004: provide repeatable synthetic local fixtures and an HTTP/Mongo regression
  check for browse/filter/profile/role/delete, plus origin and validation failures.
- FR-005: preserve routes, DTOs and production CORS behavior; update MFE handoff.

Acceptance: unit tests, service build, real isolated MongoDB/HTTP journey and MFE
build/test checks. Host browser integration is separate evidence; no production
records or credentials are needed. No dependency/contract publication or deployment.
