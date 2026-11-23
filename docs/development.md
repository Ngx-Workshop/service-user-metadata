# Development — service-user-metadata

Source baseline: `b403877`; maintenance checks recorded on 2026-11-22. Use `package-lock.json` and `npm ci`; inspect the
Dockerfile and CI for the supported Node runtime. Do not upgrade NestJS/Node as
an incidental maintenance change.

## Existing npm scripts

| Script                                    | Command                                                                                                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`                                   | `nest build`                                                                                                                                                                                  |
| `format`                                  | `prettier --write "src/**/*.ts" "test/**/*.ts"`                                                                                                                                               |
| `start`                                   | `nest start`                                                                                                                                                                                  |
| `start:dev`                               | `nest start --watch`                                                                                                                                                                          |
| `start:debug`                             | `nest start --debug --watch`                                                                                                                                                                  |
| `start:prod`                              | `node dist/main`                                                                                                                                                                              |
| `lint`                                    | `eslint "{src,apps,libs,test}/**/*.ts" --fix`                                                                                                                                                 |
| `test`                                    | `jest`                                                                                                                                                                                        |
| `test:watch`                              | `jest --watch`                                                                                                                                                                                |
| `test:cov`                                | `jest --coverage`                                                                                                                                                                             |
| `test:debug`                              | `node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand`                                                                                        |
| `test:e2e`                                | `jest --config ./test/jest-e2e.json`                                                                                                                                                          |
| `openapi`                                 | `node dist/swagger.js`                                                                                                                                                                        |
| `postbuild`                               | `node dist/swagger.js`                                                                                                                                                                        |
| `contracts:service-user-metadata:gen`     | `npm --prefix ./contracts/service-user-metadata run gen`                                                                                                                                      |
| `contracts:service-user-metadata:build`   | `npm --prefix ./contracts/service-user-metadata run build`                                                                                                                                    |
| `contracts:service-user-metadata:publish` | `npm --prefix ./contracts/service-user-metadata publish --access public`                                                                                                                      |
| `start:local`                             | `USER_METADATA_LOCAL_DEV=true NODE_ENV=development GENERATE_OPENAPI=false MONGODB_URI=mongodb://127.0.0.1:27017/user_metadata_local PORT=3004 nest start --watch`                             |
| `seed:local`                              | `USER_METADATA_LOCAL_DEV=true NODE_ENV=development MONGODB_URI=mongodb://127.0.0.1:27017/user_metadata_local node -r ts-node/register scripts/seed-local.cjs`                                 |
| `test:local:http`                         | `USER_METADATA_LOCAL_DEV=true NODE_ENV=development MONGODB_URI=mongodb://127.0.0.1:27017/user_metadata_local node -r ts-node/register scripts/verify-local.cjs`                               |
| `start:workshop-example`                  | `USER_METADATA_LOCAL_DEV=true NODE_ENV=development GENERATE_OPENAPI=false WORKSHOP_PROGRESS_DEMO=true MONGODB_URI=mongodb://127.0.0.1:27017/user_metadata_local PORT=3004 nest start --watch` |
| `test:workshop-example:http`              | `node scripts/verify-workshop-example.cjs`                                                                                                                                                    |
| `test:admin-users:http`                   | `USER_METADATA_LOCAL_DEV=true NODE_ENV=development MONGODB_URI=mongodb://127.0.0.1:27017/user_metadata_local node scripts/verify-admin-provisioning.cjs`                                      |

## Maintenance workflow

| Script             | Purpose                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `lint:check`       | Full source/test ESLint check without fixes, using the recorded legacy suppression baseline                |
| `format:check`     | Non-mutating source/test and maintained tooling/context/spec formatting gate                               |
| `test:maintenance` | Disposable developer/CI/package-only/omit-dev install and real hook/partial-staging/negative-gate fixtures |
| `prepare`          | Self-contained guarded Husky setup; preserves build/postbuild lifecycle                                    |

`npm ci` in a developer Git checkout installs Husky 9.1.7 hooks. Pre-commit runs
the local lint-staged 16.2.7 executable (no network fallback) and Prettier on staged
TS/JS/CJS/MJS/JSON/Markdown/YAML only. lint-staged's default stash/hide behavior
preserves partial staging and unstaged edits; do not disable that behavior.
Formatter errors block commits. Generated contracts, OpenAPI, lockfile,
node_modules, build/coverage and hook internals are excluded by `.prettierignore`.

The inline prepare guard skips CI, `HUSKY=0`, production, omitted devDependencies,
no-Git and package-only/no-hook-directory installs. Docker's package-only COPY
ordering therefore needs no additional script COPY or `--ignore-scripts`.
Production installation checks concern installation only: the existing
Dockerfile intentionally retains devDependencies, including the runtime-imported
auth client. Omit-dev application startup is not certified by this maintenance.

`lint` is still mutating; use `lint:check` for verification. Native
`eslint-suppressions.json` records only pre-existing typed-lint violations in
Swagger and existing persistence/workshop tests. Generated contract files are
ignored explicitly. New errors fail the gate; two existing unsafe-argument warnings
remain visible. Counted suppressions are not a per-line lint guarantee: do not
increase the baseline to accept new errors. Remove debt intentionally and run
`npm run lint:check -- --prune-suppressions` when its counts become stale.
For raw debt visibility, run ESLint with `--suppressions-location` pointing to a
temporary JSON file containing `{}`. The raw check still reports 30 existing
typed-lint errors; baseline-aware CI does not claim that this debt is fixed.

The initial Prettier failures were a generated contract and the workshop service
test. The contract is now excluded; the test was formatted only after its
correlation-header expectation needed updating. No legacy source is excluded from
the current source/test formatting gate. Historical docs/specs remain outside the
CI formatting scope, but staged supported files still format. When adding tooling
or maintained context, update the explicit `format:check` scope.

CI validates pull requests/main pushes before contract publication or deployment.
It runs read-only lint/format, unit/HTTP-double tests, disposable hook/install
fixtures and DB-disabled build.
`npm run test:e2e -- --runInBand` separately needs loopback MongoDB and creates
only a uniquely named disposable test database; upstream execution remains doubled.

## Runtime and verification

Inspect configuration reads in `src/`, Docker and workflow files for required
environment variables; never print or commit `.env` credentials. Use existing
local-development documentation and isolated data where available. Read
[observability.md](observability.md), existing security/deployment docs and previous
feature specs before touching runtime behavior.

See the [maintenance handoff](../specs/002-code-maintenance/handoff.md) for actual
local results. Docker daemon/image execution, hosted owner APIs, live Grafana
receipt and remote GitHub workflow execution are separate checks, not implied by
local installation/test success. Do not use paid provider calls or production
writes as tests. npm reports dependency advisories; this task does not apply
unrelated dependency upgrades or `npm audit fix`.

Deployment and npm publication now follow [deployment-workflows](deployment-workflows.md).
