# <img src="https://github.com/Ngx-Workshop/.github/blob/main/readme-assets/devicon-nestjs-line.svg?raw=true" height="84" alt="Nest Logo" /> <img src="https://github.com/Ngx-Workshop/.github/blob/main/readme-assets/mongodb-logo.svg?raw=true" height="20" alt="MongoDB Logo" /> User Metadata API

NestJS service for storing and managing user profile metadata (name, avatar, role, description, etc.) backed by MongoDB.

## What this service does

- Upserts metadata for the currently authenticated user.
- Returns and updates metadata for the current user.
- Provides admin-only endpoints to fetch users, paginate/search users, update roles, and delete users.
- Generates `openapi.json` during build and can publish generated TypeScript contracts.

## Tech stack

- NestJS 11
- Mongoose (MongoDB)
- Class Validator / Class Transformer
- Swagger (OpenAPI generation)
- `@tmdjr/ngx-auth-client` guards + role decorators

## Prerequisites

- Node.js 22+
- npm 10+
- MongoDB instance

## Environment variables

Create a `.env` file in the project root.

| Variable           |      Required | Default                        | Description                                                   |
| ------------------ | ------------: | ------------------------------ | ------------------------------------------------------------- |
| `MONGODB_URI`      | Yes (runtime) | -                              | MongoDB connection string                                     |
| `PORT`             |            No | `3004`                         | HTTP port                                                     |
| `AUTH_BASE_URL`    |            No | `https://auth.ngx-workshop.io` | Auth service base URL used when propagating role changes      |
| `GENERATE_OPENAPI` |            No | `false`                        | Internal flag used by OpenAPI generation to disable DB wiring |

## Run locally

```bash
npm ci
npm run start:dev
```

Service listens on `http://localhost:3004` by default.

## Build and production run

```bash
npm run build
npm run start:prod
```

`postbuild` also regenerates `openapi.json`.

## Docker

```bash
docker build -t service-user-metadata .
docker run --rm -p 3004:3004 --env-file .env service-user-metadata
```

## API overview

Base route: `/user-metadata`

### User endpoints (authenticated)

- `PUT /user-metadata`
  Upsert current user metadata by auth `sub` (uuid).

- `GET /user-metadata`
  Get current user metadata. If missing, record is created via upsert.

- `PATCH /user-metadata`
  Update current user metadata fields.

### Admin endpoints (requires admin role)

- `GET /user-metadata/:userId/find-one`
  Get metadata by `uuid`.

- `GET /user-metadata/all?page=1&limit=25&query=&role=`
  Paginated listing with optional search (`firstName`, `lastName`, `email`, `uuid`) and optional role filter.

- `PATCH /user-metadata/:userId/role`
  Update local role and trigger remote role sync against auth service.

- `PATCH /user-metadata/:userId/admin-override`
  Admin update of user metadata fields.

- `DELETE /user-metadata/:userId`
  Delete user metadata by `uuid`.

## Validation and request handling

- Global validation pipe is enabled with:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
- Query DTOs for pagination enforce:
  - `page >= 1`
  - `1 <= limit <= 100`
- Cookies are parsed globally (`cookie-parser`).

## Auth and authorization

- `AuthenticationGuard` is applied globally in the module.
- `RolesGuard` is applied globally in the module.
- Admin routes use `@Roles(Role.Admin)`.
- Role propagation (`PATCH /:userId/role`) expects `accessToken` cookie and calls:
  - `PUT {AUTH_BASE_URL}/role`

## Data model

Main fields in `UserMetadata`:

- `uuid` (unique)
- `role` (enum from auth client, default regular)
- `firstName`
- `lastName`
- `email`
- `avatarUrl`
- `description`
- `lastUpdated`

## OpenAPI and contracts

### Generate OpenAPI

```bash
npm run openapi
```

This writes `openapi.json` at repo root.

### Generate and build contracts package

```bash
npm run contracts:service-user-metadata:gen
npm run contracts:service-user-metadata:build
```

### Publish contracts package

```bash
npm run contracts:service-user-metadata:publish
```

Contracts are generated under `contracts/service-user-metadata` and published as `@tmdjr/user-metadata-contracts`.

## Testing and linting

```bash
npm run lint
npm run test
npm run test:e2e
```

## Notes and caveats

- OpenAPI output in `openapi.json` depends on current compiled output and generation timing; regenerate after endpoint changes.
- Existing e2e scaffold may not reflect the current route structure and may require updating before using as a regression suite.
