# Isolated local user metadata development

MongoDB must listen on 127.0.0.1:27017. Install locked dependencies with `npm ci`.
In separate terminals:

```bash
# service-user-metadata
npm run seed:local
npm run start:local
```

```bash
# mfe-user-journey-admin-user-management
npm run dev:bundle
```

The local API is http://localhost:3004/user-metadata. The MFE development environment
uses this URL; its production environment retains /api/user-metadata. The hosted
shell still owns frontend authentication/routing. Use the existing browser-local
remote override for http://localhost:4201/remoteEntry.js, then open
https://admin.ngx-workshop.io/user-management/user-metadata. Assessment history
continues to use the hosted assessment service; synthetic users may have no history.

## Isolation and fixtures

`start:local` explicitly sets USER_METADATA_LOCAL_DEV=true, NODE_ENV=development,
GENERATE_OPENAPI=false, PORT=3004 and the exact MongoDB URI
`mongodb://127.0.0.1:27017/user_metadata_local`. It overrides ordinary .env values.
Only this URI is accepted while local mode is requested; a production/other NODE_ENV
with the local flag also fails startup. The HTTP listener binds only to 127.0.0.1.

The local guard permits only loopback socket peers and these browser origins:
https://admin.ngx-workshop.io, http://localhost:4201, http://127.0.0.1:4201.
Requests without Origin are allowed for local command-line checks. The guard sets
synthetic identity `local-user-metadata-admin` with admin role. RolesGuard remains
active. CORS permits credentials only for the listed origins. No production cookie
or user records are required. Do not tunnel or reverse-proxy this local-admin mode.

`seed:local` creates three clearly synthetic fixtures (admin, regular and publisher)
using example.invalid email/avatar values. It only inserts missing fixtures, retaining
existing local edits. Running it again restores a deleted fixture. It never copies
production data. Local role changes update MongoDB only and skip hosted auth sync,
including direct calls to the sync helper. They do not create identity provider users.

Ordinary start/start:dev/start:prod without the local flag keep platform authentication,
role authorization and hosted role-sync behavior. Production CORS is unchanged.

## Checks

```bash
npm test -- --runInBand
npm run build
# Requires the local API and MongoDB running:
npm run test:local:http
```

The real HTTP check creates one uniquely named synthetic record in the fixed local
database, checks CORS/preflight, forbidden origins, validation, pagination/search,
profile editing/clearing, role changes and deletion. Cleanup targets only that record;
it never drops or clears a database. Unit tests cover remote peers, unsafe database
URIs, production-flag rejection, normal-auth delegation and role-sync isolation.

Build includes OpenAPI generation, with no schema/endpoint changes. Generated
contracts need no publication. Keep local processes running for MFE development.
Use `npm run watch:hosted-api` in the MFE to return to hosted metadata APIs if needed.
