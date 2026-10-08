const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const {
  assertLocalDatabase,
  localMode,
  localDatabaseUri,
} = require('../src/local-development/local-development');
const {
  UserMetadata,
  UserMetadataSchema,
} = require('../src/user-metadata/schemas/user-metadata.schema');
const base = 'http://127.0.0.1:3004/user-metadata';
const origin = 'https://admin.ngx-workshop.io';
const uuid = `local-verification-${randomUUID()}`;
let users;
async function call(path, options = {}) {
  return fetch(base + path, {
    ...options,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
async function verify() {
  assertLocalDatabase();
  if (!localMode()) throw new Error('Use npm run test:local:http');
  await mongoose.connect(localDatabaseUri);
  users = mongoose.model(UserMetadata.name, UserMetadataSchema);
  await users.create({
    uuid,
    role: 'regular',
    firstName: 'Synthetic',
    lastName: 'Verification',
    email: `${uuid}@example.invalid`,
    avatarUrl: 'https://example.invalid/avatar.svg',
  });
  const preflight = await call('/all', {
    method: 'OPTIONS',
    headers: { 'Access-Control-Request-Method': 'PATCH' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  assert.equal(
    preflight.headers.get('access-control-allow-credentials'),
    'true'
  );
  const forbidden = await call('/all', {
    headers: { Origin: 'https://example.com' },
  });
  assert.equal(forbidden.status, 403);
  const invalid = await call('/all?page=0');
  assert.equal(invalid.status, 400);
  const list = await call(
    `/all?query=${encodeURIComponent(uuid)}&role=regular&limit=5`
  );
  assert.equal(list.status, 200);
  const result = await list.json();
  assert.equal(result.total, 1);
  assert.equal(result.data[0].uuid, uuid);
  const patch = await call(`/${uuid}/admin-override`, {
    method: 'PATCH',
    body: JSON.stringify({ firstName: 'Updated', description: '' }),
  });
  assert.equal(patch.status, 200);
  assert.equal((await patch.json()).description, '');
  const detail = await call(`/${uuid}/find-one`);
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).firstName, 'Updated');
  const role = await call(`/${uuid}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'publisher' }),
  });
  assert.equal(role.status, 200);
  assert.equal((await role.json()).role, 'publisher');
  const invalidRole = await call(`/${uuid}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'invalid' }),
  });
  assert.equal(invalidRole.status, 400);
  const removed = await call(`/${uuid}`, { method: 'DELETE' });
  assert.equal(removed.status, 204);
  const missing = await call(`/${uuid}/find-one`);
  assert.equal(missing.status, 404);
  console.log(
    'PASS: real local MongoDB/HTTP CORS, origin rejection, validation, search, profile clearing, role update and deletion.'
  );
}
verify()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (users) await users.deleteOne({ uuid });
    await mongoose.disconnect();
  });
