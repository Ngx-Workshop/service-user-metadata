# Handoff: Code Maintenance

Status: Implemented and verified locally; external checks pending · Updated: 2026-11-22
[Spec](spec.md) · [Plan](plan.md) · [Tasks](tasks.md)

## Delivered

Source baseline `b403877`; unrelated pre-existing untracked workflow files and
historical specs were retained. See [audit.md](audit.md) for the measured baseline,
ownership map, priorities, compatibility review and command evidence.

- Composition root now imports independent metadata, coding-attempt and workshop
  modules plus the existing global access policy in an explicit access module.
  Domain models/providers remain private; no new service dependency cycles.
- Controllers remain transport adapters. Concrete identity logs and raw upstream
  error stacks were removed. Bounded native contextual outcome logs use generated
  async request/operation correlation and safe owner headers without learner,
  profile, credential, query, result or raw error content.
- Pinned Husky/lint-staged, root staged Prettier configuration, generated ignores,
  guarded package-only prepare lifecycle and read-only lint/format gates are
  installed. PR/main validation gates publication/deployment; disposable
  hook/install regression fixtures are included in CI.
- Routes, DTOs, schemas, access guards, progression policy, auth protocol,
  retry/upsert/revision/lease behavior and OpenAPI are preserved. No migration or
  contract publication is required.

## Verified locally

| Check                                               | Result                                                                                                                                 |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source-backed audit / pre-refactor characterization | 3 suites / 19 cases passed before module movement                                                                                      |
| Final Jest runner                                   | 10 suites / 79 cases passed                                                                                                            |
| Mongo HTTP persistence e2e                          | 5 cases passed; disposable loopback DB, upstream doubles                                                                               |
| Native logging / HTTP correlation                   | Real JSON levels/context, safe failure/success fields, canaries, concurrent isolation, nested suppression, quiet heartbeat             |
| Build/postbuild and OpenAPI comparison              | Passed; generated contract structurally unchanged                                                                                      |
| `lint:check`                                        | Passed with 2 existing warnings; 30 legacy errors explicitly baselined                                                                 |
| `format:check`, `tsc --noEmit`, whitespace          | Passed; no source/test formatting exemptions beyond generated output                                                                   |
| `test:maintenance`                                  | Clean developer/CI/package-only/omit-dev installs, HUSKY=0, real staged/partial commits, negative gates and generated exclusion passed |

All checks ran locally with Node 24.9.0 / npm 11.6.0. One npm test process
segfaulted on the shared host; the final direct Jest runner passed all 79 cases.
The raw lint command remains failing on 30 inherited typed-lint errors; native
counted suppressions are not a claim of full debt remediation. npm reported 56
dependency advisories, not analyzed/remediated in this scoped maintenance.

Fixtures were cleaned. No repository commit, push, publication or deployment was
performed; commits occurred only in disposable regression fixtures.

## Pending external verification / owner handoffs

1. **Repository CI owner:** after review/push is authorized, run the new validation
   job on its pinned Node 22.23.5 runner. Local CI-environment installs do not prove
   remote workflow execution or target-runtime compatibility.
2. **Runtime/infrastructure owner:** provide a usable Docker daemon and run
   `docker build -t service-user-metadata-maintenance .`; verify JSON output,
   anonymous GET/HEAD heartbeat and protected business routes on isolated data.
   Docker CLI was present but no usable server was available. Package-only
   installation ordering was tested without Docker. Omit-dev installation success
   does not certify app startup: the existing runtime-imported auth client remains
   a devDependency and the Dockerfile retains devDependencies.
3. **Auth/document/assessment/coding-lab owners:** confirm optional generated
   X-Request-ID handling and existing success/failure contracts in an authorized
   isolated integration environment. No upstream protocol change is required;
   receiving services may ignore/regenerate IDs. No foreign collections accessed.
4. **Alloy/Grafana infrastructure owner:** authorize the host-owned collector,
   confirm the service stream label, and verify receipt of a safe successful and
   failed operation plus private heartbeat metrics using the documented JSON
   queries. Local JSON compatibility is not live Grafana evidence. Never place
   ingestion credentials in this application or trigger production learner writes
   merely to test logging.

These checks are pending, not checked off as verified acceptance. Existing lint
debt/advisories should be handled in separately scoped follow-up work.

## Next action

Review the source/tooling changes and [audit evidence](audit.md). Then authorize
the repository/runtime owners' isolated checks above. No further implementation
feature has been selected; do not restart T001 or treat historical work as next.
