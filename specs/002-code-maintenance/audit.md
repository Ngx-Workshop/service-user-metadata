# Code Maintenance audit

2026-11-22; source baseline `b403877`. Initial worktree contained only untracked
workflow/context files listed in T001; those are retained. Parent `../AGENTS.md`
and `../specs/README.md` do not exist; the checkout's local entry points apply.

## T001: measured baseline

- Node `v24.9.0`, npm `11.6.0`; Docker/CI target Node 22.23.5. No runtime upgrade.
- `npm test -- --runInBand`: 8 suites, 62 tests passed.
- `npm run test:e2e -- --runInBand`: 5 HTTP persistence scenarios passed using a
  randomly named, disposable loopback Mongo database and upstream doubles.
- `npm run build`: build/postbuild passed; generated OpenAPI unchanged.
- `eslint "{src,apps,libs,test}/**/*.ts"`: 1,065 errors, 13 warnings. Most errors
  are formatting in the generated coding-labs contract. Remaining errors include
  unsafe mock access, untyped error/cookie access, unnecessary assertions and
  async factories without await. This is pre-existing, not a clean lint baseline.
- `prettier --check "src/**/*.ts" "test/**/*.ts"`: failed on generated
  `src/coding-lab-attempts/coding-labs.contract.ts` and the untouched workshop
  service test. No whole-tree formatting rewrite is authorized.
- Docker CLI exists but `docker info` fails (no usable server). Package-only
  installs will be verified locally; an actual image build remains unavailable.
- Live owner APIs/Grafana are not authorized test targets.

## T002: ownership and dependencies

Before: `AppModule` imports Observability, global Config, the Mongo connection and
UserMetadataModule. UserMetadataModule imports HttpModule/NgxAuthClientModule,
registers all three schemas/services/controllers, and installs both APP_GUARDs.
There are no service-to-service dependencies, cycles, forwardRef calls or exports.

| Domain                   | Persistence                            | External owner / behavior                                                                                    |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| User metadata            | UserMetadata model, UUID lookup/upsert | Auth HTTP account provisioning and role sync; retry-safe account/profile partial failure                     |
| Coding attempts          | coding_lab_attempts                    | Published lab/grade HTTP API; unique start keys, owner filters, optimistic revision and grading lease        |
| Workshop progression     | workshop_progress                      | Document navigation/page and assessment learner catalog APIs; pure sectionProgress policy derives completion |
| Observability            | None                                   | Native ConsoleLogger JSON, template-only access events, anonymous liveness, infrastructure-owned collector   |
| Access/local development | None                                   | AuthenticationGuard delegation plus RolesGuard; loopback-only synthetic admin and guarded local DB           |

### Selected findings (priority / paths)

1. P1: `user-metadata.module.ts` couples three independent domain registrations.
   Split coding attempts and workshop progression into modules; place existing
   global access providers in an explicit access module at the composition root.
   Keep models private to their owners, no service exports or speculative layers.
2. P1: `user-metadata.controller.ts` emits concrete user IDs and duplicates domain
   work with logging; `user-metadata.service.ts` emits an upstream stack that may
   contain credentials/content. Remove these logs and replace with bounded,
   contextual outcome events at use-case boundaries.
3. P1: HTTP request IDs are not available asynchronously to domain operations.
   Add AsyncLocalStorage in existing observability, generate local IDs (ignore all
   caller IDs), forward only generated correlation headers to owner APIs, and test
   concurrent isolation. Do not claim distributed tracing or log learner content.
4. P2: Husky/lint-staged, guarded package-only prepare, read-only gates and PR
   validation are absent. Use pinned dev tools, generated-path ignores and an
   explicit lint legacy baseline rather than reformat unrelated code.

### Preserved behavior / deferred findings

Controllers already delegate business decisions; coding-attempt ID validation is
transport validation and stays put. The cohesive progression policy/provider does
not need another abstraction. Existing DTO whitelisting, page/role validation,
Roles(Admin) metadata and global guard order remain unchanged. Existing local-mode
checks, demo safeguards, auth base URLs, timeouts, owner APIs, retry/status mapping,
upsert operators, query escaping, revisions, leases and finally cleanup stay intact.
No schema, contract, async-pattern or policy change is intended.

Existing services have mixed configuration styles and unvalidated upstream
payloads. Tightening them beyond existing checks would change failure semantics
and is deferred. Existing role-sync/profile partial failure cannot be made atomic
across owners by this task. No foreign collection access was found. Avoid per-item
catalog logs; observe top-level operations and preserve nested error propagation.

## Implementation / verification plan

Before module movement, extend account/role characterization and retain existing
owner/concurrency/progression tests. After movement, compile the full module graph
in DB-disabled mode, verify protected routes through the real global guards with
only AuthenticationGuard doubled, rerun persistence e2e and compare generated
OpenAPI structurally (module discovery ordering may change).

Use ESLint's native counted suppression baseline for legacy violations;
no new-file suppressions or blanket rule disablement. Full raw lint remains
available for debt visibility. The workshop service test needed a related
correlation-header expectation update, so it was formatted as a touched file;
no test-format exclusion was needed. Format only maintained files. Verify
positive/negative gates and real partial-staging commits in disposable fixtures,
never the user's index. Verify developer/CI/no-Git/omit-dev installs.

Constitution: domain ownership, explicit acyclic DI, contract/access preservation,
predictable persistence/failure behavior, safe native observability, measured local
checks and repository-local evidence all apply; no deviation is planned.

## Implementation and final evidence

- T003: before module movement, the focused account/role/composition-root
  characterization command passed 3 suites / 19 cases. Existing attempt ownership,
  concurrency, conflict and progression policy cases were retained.
- T004: after module separation, 9 suites / 70 cases and the 5 Mongo HTTP cases
  passed. Build passed; generated OpenAPI was structurally identical to HEAD.
  No DTO, schema, guard implementation, policy or persisted-data change was found
  in the compatibility diff review.
- T005/T006: `npm install --package-lock-only`, `npm ci` and
  `npm run test:maintenance` passed. The persisted fixture runner performs real
  clean npm installs in developer Git, CI Git, package-only/no-Git and
  production/omit-dev Git directories, plus HUSKY=0 preparation. Real disposable
  commits verify formatting, partial staging, unrelated unstaged content, generated
  contract exclusion and formatter failures blocking commits. The exact
  `format:check` command rejects a deliberately bad file without mutation.
  The fixture directories are cleaned; the user's index is not used.
- Hook fixture discovery initially encountered an incompatible dependency's
  lint-staged config when node_modules was unignored. The final fixture copies
  `.gitignore`, and the hook explicitly selects the root package config. All
  strengthened hook/install checks passed on the final implementation.
- The lockfile adds pinned Husky/lint-staged and their dependency tree; npm also
  re-resolved shared development terminal utilities ansi-regex 6.1.0 to 6.6.0
  and strip-ansi 7.1.0 to 7.2.0. No other existing locked version changed.
  npm reported 56 advisories; no audit fix, framework/runtime upgrade or advisory
  remediation was performed.
- T007/T008: safe use-case outcomes replace controller identity logs and role-sync
  raw-stack logs. Async request/operation IDs and owner headers are covered by
  concurrent HTTP tests and a real guarded account use case with owner/persistence
  doubles. Native JSON output tests cover success, upstream/storage/role failures,
  levels/context, canary exclusion and operation IDs outside HTTP. Nested domain
  events are suppressed; heartbeat and HTTP-template behavior remain covered.
- Typed error guards preserve normal status/conflict mapping. A narrow inline
  no-base-to-string exception retains the existing cookie coercion and owner
  validation/error semantics rather than changing access behavior during logging
  cleanup. A regression checks owner rejection of a coerced cookie.
- T009: final direct local Jest invocation
  `node node_modules/jest/bin/jest.js --runInBand` passed 10 suites / 79 cases.
  `npm test -- --runInBand` previously passed the 78-case version; one later npm
  invocation exited with a transient host segmentation fault. The direct runner
  passed the final 79 cases; no test assertion was skipped to address the crash.
- `npm run test:e2e -- --runInBand`: 5 HTTP persistence cases passed against
  disposable loopback Mongo with owner API doubles, including concurrent starts,
  stale saves, ownership, retry results and failed-runner lease cleanup.
- `npm run build`: build/postbuild passed. Parsed `openapi.json` equals
  `git show HEAD:openapi.json`; no contract generation/build/publication is needed.
- `npm run lint:check`: passed with 0 unsuppressed errors / 2 existing warnings.
  Native counted baseline records 30 existing typed-lint errors in Swagger and
  legacy tests; an empty-baseline raw check still fails with those 30 errors.
  Generated contract formatting is explicitly ignored, not repaired or suppressed.
- `npm run format:check`: passed over all non-generated source/tests and maintained
  tooling/context/spec files. `tsc --noEmit` and `git diff --check` passed.

These are local Node 24.9.0 results. Docker-order installation fixtures are not
image-build evidence. Remote Node 22.23.5 CI, an actual Docker image, owner-service
integration and live Grafana receipt remain unverified, as detailed in the handoff.
The final constitution check has no domain/API/access/persistence/collector
deviation; the explicit legacy lint baseline is a documented verification limit.
