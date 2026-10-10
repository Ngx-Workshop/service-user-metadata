# Workshop progression
Updated: 2026-10-10

## Storage decision
Use a separate `workshop_progress` collection in this service rather than fields in the editable profile schema. One unique UUID record stores started/completed workshop ID sets and timestamps. Live assessment placement is derived from assessment service results; unlockedLevel is never accepted from the browser. Old profiles need no migration. Sample assessment completion IDs are used only by isolated example mode.

## API and behavior
All routes inherit existing authentication and identify the actor through ActiveUser.sub. No user ID, placement or completion array is accepted as a request body.

| Method | Service route | Behavior |
| --- | --- | --- |
| GET | /user-metadata/workshop-progress | Aggregate sections, eligible workshops, progress and locked counts |
| POST | …/workshops/:id/start | Recheck eligibility, atomically add started ID, return catalog (200) |
| POST | …/workshops/:id/complete | Require eligibility/start, atomically add completion ID, return catalog (200) |
| GET | …/workshops/:id/pages/:pageId | Check eligibility and page membership, return lesson content |
| POST | …/example-assessments/:sectionId | Local example only; validate answer, grade feedback, record initial completion |
| POST | …/example-reset | Local example only; remove just the actor's synthetic progress |

A completed initial assessment, including a failed result, unlocks foundation study. Placement is max(1, highestPassedLevel), capped at 20. Complete every workshop at a configured level to unlock the next configured level. Missing workshop level defaults to 1. Each section has an independent gate and IDs match exactly. Completion is explicitly self-attested in the first version; lab/assessment exercise grading is not enforced. Existing public document service routes remain public under their original policy.

## Local example
Run Mongo on loopback, then `npm run start:workshop-example`. This forces existing local auth mode, NODE_ENV=development, GENERATE_OPENAPI=false, WORKSHOP_PROGRESS_DEMO=true and the exact `mongodb://127.0.0.1:27017/user_metadata_local` URI. Port 3004 is bound to 127.0.0.1. Beta is added to the existing allowed-origin list so the hosted shell can call the local example. Other origins and non-loopback requests are rejected.

The sample never contacts live document/assessment/auth services. It uses the existing local synthetic identity and server-side example definitions. Both initial assessment outcomes allow level 1. Reset affects only workshop_progress, leaving profile metadata untouched.

The remote uses its explicit local example selector or `?workshopExample=local`. With the workshop remote override and port 4201 serving its rebuilt bundle:
https://beta.ngx-workshop.io/workshops/hello-world?workshopExample=local

`npm run test:workshop-example:http` checks real HTTP/Mongo gates, validation, persistence, idempotent completion, page ownership, level advancement, section isolation, disallowed origin and profile PATCH isolation. It resets sample learning progress and leaves level 2 available for inspection.

## Live configuration and delivery
Unset WORKSHOP_PROGRESS_DEMO and USER_METADATA_LOCAL_DEV. Configure trusted server API prefixes (include /api if using a gateway):
- WORKSHOP_DOCUMENT_API_URL: base for navigation/sections, navigation/workshops?section=ID, workshop/:pageId.
- WORKSHOP_ASSESSMENT_API_URL: base for assessment-test/learner/catalog.

Only incoming Cookie and Authorization are forwarded. Missing configuration or upstream failure returns 503; eligibility fails closed. Existing gateway must forward the user-metadata prefix with cookies/auth intact. Deploy this service before relying on the live remote catalog. Initial live tests are taken in the existing assessment journey; returning to workshops and refreshing consumes the authoritative results.

Generate with `GENERATE_OPENAPI=true npm run build`, then contracts:service-user-metadata:gen/build. OpenAPI exports and model exports are preserved by finalize-exports.cjs. Contract version 0.0.2 has been packed locally into the remote vendor directory; it has not been published. Publishing and live deployment remain external work. Rollback the remote/service together if the gateway does not support the new prefix routes.

## Verification evidence
Service tests: 35 passed across four suites. Remote tests: 22 ChromeHeadless tests passed. Backend build, generated contract build and real local HTTP/Mongo verifier passed. Hosted beta shell loaded the rebuilt local remote; sample assessment → level 1 → two completions → level 2 was observed. Live account integration remains pending service deployment/upstream configuration.

Standalone example (no hosted sign-in needed): http://localhost:4201/?workshopExample=local
