# Agent entry point — service-user-metadata

This repository owns user metadata, roles and learner progression. Work from this checkout; sibling source is
not required.

Read [.specify/memory/constitution.md](.specify/memory/constitution.md),
[architecture](docs/architecture.md), [development](docs/development.md),
[workflow](.specify/README.md) and the [feature index](specs/README.md) before edits.

- Inspect source and git status; preserve unrelated work and historical specs.
- Keep feature spec, plan, tasks and handoff aligned; mark complete with evidence.
- Preserve public contracts and access policies. Generate contracts from source.
- Keep controllers thin, providers cohesive and module exports intentional.
- Use owner-service APIs; do not couple to another service's collections.
- Inspect boundaries between user metadata, workshop progress and coding-lab attempts. Preserve role/admin policies, user identity, progress calculations and external owner contracts; never log profile or learner content.
- Reuse existing structured logging; read [observability](docs/observability.md).
- Verify changed behavior and distinguish local tests from live integration.
- Resolve routine choices; ask only for consequential missing decisions.

This is a Spec Kit-inspired Markdown setup, not an installed Spec Kit CLI.

## Next task: Code Maintenance

The selected [Code Maintenance](specs/002-code-maintenance/spec.md) implementation
is verified locally; external owner checks remain pending.
Read its [plan](specs/002-code-maintenance/plan.md), [tasks](specs/002-code-maintenance/tasks.md) and
[handoff](specs/002-code-maintenance/handoff.md) and
[audit](specs/002-code-maintenance/audit.md). Do not restart T001; retain older unfinished
feature records without treating them as the next task. The requested work covers
NestJS module/domain boundaries, thin controllers, cohesive services, Prettier
with Husky/lint-staged, CI checks and safe domain logging through existing
observability. Local implementation/checks are recorded; Docker image execution,
remote Node 22 CI and live Grafana receipt are not verified. No next implementation
feature has been selected.

Current deployment policy: [deployment-workflows](docs/deployment-workflows.md). Automatic main delivery verifies/deploys; npm publication is manual only. This supersedes older automatic-publishing instructions.
