const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:3004/user-metadata/workshop-progress';
async function request(path = '', body, expected = 200, headers = {}) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, expected);
  return response.json();
}
(async () => {
  // Refuse to mutate anything unless the server explicitly identifies itself as the example.
  assert.equal((await request()).demo, true);
  await request('/example-reset', {}, 200);
  let data = await request();
  assert.equal(data.sections[0].workshops.length, 0);
  await request('/workshops/example-components/start', {}, 403);
  await request('/workshops/example-signals/start', {}, 403);
  await request('/example-assessments/example-angular', { answer: 'not-a-choice' }, 400);
  await request('/example-assessments/example-angular', { answer: 'component', uuid: 'another-user' }, 400);
  await request('/example-assessments/example-angular', { answer: 'database' }, 200);
  data = await request();
  assert.equal(data.sections[0].unlockedLevel, 1); // Failed initial assessment still permits foundation study.
  assert.equal(data.sections[0].workshops.length, 2);
  await request('/workshops/example-components/complete', {}, 403);
  await request('/workshops/example-components/start', {}, 200);
  assert.equal((await request()).sections[0].workshops[0].status, 'in-progress');
  const page = await request('/workshops/example-components/pages/example-components-page');
  assert.match(page.html, /Your first component/);
  await request('/workshops/example-components/pages/example-signals-page', undefined, 404);
  await request('/workshops/example-components/complete', {}, 200);
  await request('/workshops/example-components/complete', {}, 200);
  assert.equal((await request()).sections[0].completedCount, 1);
  assert.equal((await request()).sections[0].unlockedLevel, 1);
  await request('/workshops/example-templates/start', {}, 200);
  await request('/workshops/example-templates/complete', {}, 200);
  data = await request();
  assert.equal(data.sections[0].unlockedLevel, 2);
  assert.equal(data.sections[0].completedCount, 2);
  assert.equal(data.sections[1].unlockedLevel, 0);
  await request('/workshops/example-streams/start', {}, 403);
  await request('', undefined, 403, { Origin: 'https://untrusted.invalid' });
  const profile = await fetch('http://127.0.0.1:3004/user-metadata', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completedWorkshopIds: ['example-signals'] }),
  });
  assert.equal(profile.status, 400);
  console.log('PASS: real local HTTP/Mongo assessment gate, resume persistence, page ownership, idempotent completion, level unlock, section isolation, identity validation and profile isolation.');
  // Leave level 2 unlocked for inspection; Reset local example lets the user replay the flow.
})().catch(error => { console.error(error); process.exitCode = 1; });
