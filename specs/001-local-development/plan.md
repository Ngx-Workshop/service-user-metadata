# Plan: Isolated local development

1. Add explicit mode/database validation and a wrapper AuthenticationGuard.
   Root guard grants synthetic admin only for approved loopback requests in local
   mode; RolesGuard still enforces route metadata. Delegate normally otherwise.
2. Fail startup for unsafe local config and GENERATE_OPENAPI HTTP serving. Bind
   local mode to 127.0.0.1 and enable exact-origin credentialed CORS only locally.
3. Skip external role synchronization in local mode, including direct sync calls;
   preserve existing behavior without the flag.
4. Add idempotent seed command using only the fixed isolated MongoDB URI, preserving
   local edits. Add smoke check using a unique disposable record and clean up only it.
5. Test isolation and normal-mode delegation; repair inherited test injection if
   needed. Build (including OpenAPI generation), check real local HTTP/database,
   and update service/MFE context. No schema/route/package version changes.

Local operations require MongoDB on 127.0.0.1:27017. The service uses port 3004;
MFE uses 4201. Do not tunnel or reverse-proxy the synthetic local-admin mode.
