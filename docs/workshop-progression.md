# Workshop progression
Updated: 2026-10-10

## Storage decision
Use a separate `workshop_progress` collection in this service rather than fields in the editable profile schema. One unique UUID record stores started workshop IDs, distinct viewed workshop/page pairs and timestamps. Completion is derived from those persisted visits and authoritative assessment results. Legacy completedWorkshopIds are retained but do not grant completion. Live assessment placement is derived from assessment service results; unlockedLevel is never accepted from the browser. Profiles need no migration. Existing self-attested workshop completions are re-evaluated against the new requirements and may return to in-progress until their pages and assessments are complete. Sample assessment completion IDs are used only by isolated example mode.

## API and behavior
All routes inherit existing authentication and identify the actor through ActiveUser.sub. No user ID, placement or completion array is accepted as a request body.

| Method | Service route | Behavior |
| --- | --- | --- |
| GET | /user-metadata/workshop-progress | Aggregate sections, eligible workshops, progress and locked counts |
| POST | …/workshops/:id/start | Recheck eligibility, atomically add started ID, return catalog (200) |
| POST | …/workshops/:id/complete | Compatibility endpoint: require derived completion; cannot mark missing requirements complete (200/403) |
| GET | …/workshops/:id/pages/:pageId | Check eligibility and page membership, return lesson content |
| POST | …/workshops/:id/pages/:pageId/seen | Require authenticated start/access/page ownership and available content; atomically add viewed pair and return reconciled catalog |
| POST | …/example-workshop-assessments/:testId | Local example only; complete the referenced sample workshop assessment |
| POST | …/example-assessments/:sectionId | Local example only; validate answer, grade feedback, record initial completion |
| POST | …/example-reset | Local example only; remove just the actor's synthetic progress |

A completed initial assessment, including a failed result, unlocks foundation study. Placement is max(1, highestPassedLevel), capped at 20. Complete every workshop at a configured level to unlock the next configured level. Missing workshop level defaults to 1. Each section has an independent gate and IDs match exactly. A started workshop completes automatically when every current PAGE has a recorded visit and every referenced ASSESSMENT_TEST resourceId has completed status. Completed does not require passing. Without assessment references, the initial section assessment suffices. Empty workshops without pages or assessment references remain incomplete. Coding lab completion is not a criterion in this iteration. GET page requests do not mark visits; the remote records a seen event after decoding and rendering. This measures visits, not reading time or comprehension. Refresh after returning from a live assessment re-evaluates completion and level access. Existing public document service routes remain public under their original policy.

## Local example
Run Mongo on loopback, then `npm run start:workshop-example`. This forces existing local auth mode, NODE_ENV=development, GENERATE_OPENAPI=false, WORKSHOP_PROGRESS_DEMO=true and the exact `mongodb://127.0.0.1:27017/user_metadata_local` URI. Port 3004 is bound to 127.0.0.1. Beta is added to the existing allowed-origin list so the hosted shell can call the local example. Other origins and non-loopback requests are rejected.

The sample never contacts live document/assessment/auth services. It uses the existing local synthetic identity and server-side example definitions. Both initial assessment outcomes allow level 1. Reset affects only workshop_progress, leaving profile metadata untouched.

The remote uses its explicit local example selector or `?workshopExample=local`. With the workshop remote override and port 4201 serving its rebuilt bundle:
https://beta.ngx-workshop.io/workshops/hello-world?workshopExample=local

`npm run test:workshop-example:http` checks real HTTP/Mongo gates, validation, persistence, idempotent completion, page ownership, level advancement, section isolation, disallowed origin and profile PATCH isolation. It resets sample learning progress and leaves level 2 available for inspection.

## Live configuration and delivery
Unset WORKSHOP_PROGRESS_DEMO and USER_METADATA_LOCAL_DEV. Configure trusted server API prefixes (include /api if using a gateway):
- DOCKER_NET_NAME_DOCUMENT: base for navigation/sections, navigation/workshops?section=ID, workshop/:pageId.
- DOCKER_NET_NAME_ASSESSMENT: base for assessment-test/learner/catalog.

Only incoming Cookie and Authorization are forwarded. Missing configuration or upstream failure returns 503; eligibility fails closed. Existing gateway must forward the user-metadata prefix with cookies/auth intact. Deploy this service before relying on the live remote catalog. Initial live tests are taken in the existing assessment journey; returning to workshops and refreshing consumes the authoritative results.

Generate with `GENERATE_OPENAPI=true npm run build`, then contracts:service-user-metadata:gen/build. OpenAPI exports and model exports are preserved by finalize-exports.cjs. Contract version 0.0.53 has been generated and packed locally into the remote vendor directory; it has not been published. Publishing and live deployment remain external work. Rollback the remote/service together if the gateway does not support the new prefix routes.

## Verification evidence
Automatic completion follow-up: 41 service tests passed across four suites, and 11 active remote tests passed. Obsolete example-document tests are excluded because their production source has been removed. Backend build, generated contract build and real local HTTP/Mongo verifier passed. Hosted beta shell loaded the rebuilt local remote; sample assessment → level 1 → two completions → level 2 was observed. Live account integration remains pending service deployment/upstream configuration.

Standalone example (no hosted sign-in needed): http://localhost:4201/?workshopExample=local


## Deployment settings and Docker network check
The token names are DOCKER_NET_NAME_DOCUMENT and DOCKER_NET_NAME_ASSESSMENT; values remain complete HTTP base URLs, including the container port:

```env
DOCKER_NET_NAME_DOCUMENT=http://document:3007
DOCKER_NET_NAME_ASSESSMENT=http://service-nestjs-assessment-test:3005
```

Set both as GitHub Actions secrets for service-user-metadata. The deployment workflow validates them, writes them into the protected runtime .env and recreates the container using that file. Former WORKSHOP_DOCUMENT_API_URL/WORKSHOP_ASSESSMENT_API_URL names are no longer read. Direct container connections do not use an /api prefix.

On the Docker host, list members of the shared user-defined network:

```sh
docker network inspect ngx-net --format '{{range .Containers}}{{println .Name}}{{end}}'
```

The output must include service-user-metadata, document and service-nestjs-assessment-test. If either dependency is missing, attach it with the applicable command:

```sh
docker network connect ngx-net document
docker network connect ngx-net service-nestjs-assessment-test
```

The deployment already creates the metadata container with --network ngx-net. This change updates local deployment configuration; no remote deployment or Docker network mutation was performed from the workspace.

## Automatic completion rollout
Deploy the updated service and remote together. Catalog workshop DTOs add viewedPageIds, pageCount, completedAssessmentIds, assessmentCount and assessmentsCompleted. The gateway must forward the new POST pages/:pageId/seen route under the existing prefix. The remote no longer sends a complete command. Generated contracts 0.0.53 are installed from a checked-in local tarball for this example; publication and live deployment were not performed.
