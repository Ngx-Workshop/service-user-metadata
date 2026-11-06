# Account and profile provisioning

POST /user-metadata/admin/users is admin-only and accepts email, password, role,
UUID-v4 requestId and optional firstName/lastName/avatarUrl/description. HTTP 201
returns the profile. Unknown fields/invalid credentials are rejected. Auth creates
the sign-in identity with normal password hashing; this service then upserts metadata
under the returned UUID. Passwords are never stored in metadata or returned/logged.
Optional name/avatar schema requirements now match the existing optional DTOs and
blank-field clearing behavior. Email remains required for a new account.

The same request key is forwarded on retry, so profile failure does not cause a
second account or reset its password. Unrelated duplicate emails return 409.
Authentication, upstream availability and profile-persistence failures have explicit
errors. A created account with a failed profile returns a retry instruction; this
is not an atomic cross-service transaction. Retrying requires the same operation
key, email and role. The frontend does not persist credentials or an unfinished
creation draft across reloads.

Role updates await identity synchronization before reporting metadata success.
Failure leaves metadata unchanged and is surfaced for retry. A metadata failure
after successful auth synchronization can be retried with the same role. Profile
email edits change contact metadata; they do not change sign-in credentials.
Metadata deletion deliberately leaves the sign-in identity intact.

## Local integration

Keep existing npm run start:local and the MFE watcher running. In service-auth run
npm run start:admin-local (port 3005, isolated auth_users_local). No local operation
contacts hosted auth. Seed IDs retain metadata-only roles; new auth account IDs
synchronize roles to the local auth service. Both developer modes are loopback-only
and fail startup for unsafe database/profile flags.

Run npm run test:admin-users:http to create one uniquely named synthetic account,
retry it, reject duplicate/invalid requests, prove hashed storage and actual sign-in,
edit the profile, synchronize role and verify metadata-only deletion. Cleanup only
touches the script's own UUID/email/requestId in the two fixed local databases.
Existing synthetic fixtures and user-created accounts are preserved.

Deploy auth/indexes first (see service-auth/docs/admin-user-provisioning.md), then
metadata and the MFE. /api/user-metadata already maps to /user-metadata; verify the
new path and auth ingress in the real environment. OpenAPI is regenerated but no
NPM contracts or deployed services were published by this task. The frontend uses
an explicit additive local request interface until generated contracts are adopted.

Avoid concurrent normal nest build and nest start --watch writing the same dist;
restart/touch the watcher after a build if checking an already running local service.
