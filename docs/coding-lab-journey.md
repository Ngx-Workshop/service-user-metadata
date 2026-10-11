# Coding lab attempt persistence

User metadata owns the authenticated /user-metadata/coding-lab-attempts API. The active platform subject is always the owner; request bodies cannot provide another owner or result. service-coding-labs owns publication and scoring; metadata never accesses its database.

Set CODING_LABS_BASE_URL to the coding service's base URL, e.g. a configured internal http://coding-labs:3009. Only incoming platform cookies and Authorization are forwarded. Content reads and grading use bounded HTTP timeouts. Service failures preserve code and release the submission lease.

POST collection accepts labId and UUID requestId; it replays duplicate requests, resumes one active attempt per user/lab, or creates a new attempt pinned to current publication. Completed records remain immutable. PATCH accepts code/revision and advances revision; stale writes and active grading return 409. POST :id/submit locks the attempt for up to two minutes, persists code (advancing revision if changed), grades saved server tests, stores sample feedback and totals, and marks completion. Retrying a completed submission returns the saved result. Expired leases can be replaced after a service crash. GET list/detail returns only owned, allowlisted attempts and remains available if a lab is archived.

The new coding_lab_attempts collection has unique (uuid,requestId), partial unique (uuid,labId) for in-progress records, and a history index. Ensure indexes exist before concurrent starts. No existing collections are migrated. DTOs reject unknown properties globally, including forged result/status/owner fields. Temporary coding-labs.contract.ts is generated from producer OpenAPI pending an additive package release.

Verification: npm test -- --runInBand, npm run test:e2e -- --runInBand (disposable local Mongo and HTTP grading doubles), npm run build, npm run contracts:service-user-metadata:gen, npm run contracts:service-user-metadata:build. The inherited Hello World e2e test targeted a nonexistent route and lacked teardown; it is replaced by coding attempt persistence HTTP tests.

A cross-service local run also used real Docker grading and disposable Mongo, with test authentication only. Production auth/gateway/service configuration remain separate release checks. Deploy coding service first, then metadata configured with its base URL, then the learner remote. Generated contracts are not automatically published.
