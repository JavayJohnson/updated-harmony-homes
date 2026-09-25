import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

const env = { PUBLIC_ORIGIN: 'https://example.com', RESEND_API_KEY: 'test-secret', CONTACT_FROM: 'Website <contact@example.com>', CONTACT_TO: 'owner@example.com' };
const fields = { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', phone: '', message: 'Housing question', website: '' };
async function setup(t, options = {}) {
  const calls = [];
  const server = createApp({ env, send: async (...args) => { calls.push(args); return Response.json({ id: 'test-message' }); }, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (data = fields, headers = {}) => fetch(base + '/api/contact', {
    method: 'POST', headers: { Origin: env.PUBLIC_ORIGIN, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(data)
  });
  return { calls, base, post };
}

test('serves site; sends only to configured recipient and uses visitor reply-to', async t => {
  const { base, post, calls } = await setup(t);
  assert.match(await (await fetch(base + '/contact.html')).text(), /action="\/api\/contact"/);
  assert.equal((await fetch(base + '/.env')).status, 404);
  assert.equal((await fetch(base + '/server.js')).status, 404);
  assert.equal((await post({ ...fields, to: 'attacker@example.com' })).status, 200);
  const payload = JSON.parse(calls[0][1].body);
  assert.deepEqual(payload.to, [env.CONTACT_TO]);
  assert.equal(payload.reply_to, fields.email);
  assert.equal(payload.from, env.CONTACT_FROM);
  assert.match(payload.text, /Housing question/);
  assert.equal(calls[0][0], 'https://api.resend.com/emails');
});

test('rejects invalid input, foreign origins, bots, oversized requests and wrong methods', async t => {
  const { base, post, calls } = await setup(t);
  for (const change of [{ email: 'invalid' }, { first_name: '' }, { message: '' }, { message: 'x'.repeat(5001) }, { website: 'spam' }, { phone: {} }, { last_name: 'Doe\r\nBcc: x' }]) {
    assert.equal((await post({ ...fields, ...change })).status, 400);
  }
  assert.equal((await post(null)).status, 400);
  assert.equal((await post(fields, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(fields, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post({ ...fields, message: 'x'.repeat(17000) })).status, 413);
  assert.equal((await fetch(base + '/api/contact')).status, 405);
  assert.equal(calls.length, 0);
});

test('does not report success when config or provider fails', async t => {
  const missing = await setup(t, { env: {} });
  assert.equal((await missing.post(fields, { Origin: 'http://localhost:3000' })).status, 503);
  assert.equal(missing.calls.length, 0);
  for (const send of [async () => Response.json({ error: 'secret provider error' }, { status: 429 }), async () => { throw new Error('timeout'); }, async () => Response.json({})]) {
    const { post } = await setup(t, { send });
    const response = await post();
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /secret|timeout/);
  }
});

test('limits repeated sends before calling provider', async t => {
  const { post, calls } = await setup(t);
  for (let i = 0; i < 5; i++) assert.equal((await post()).status, 200);
  const limited = await post();
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  assert.equal(calls.length, 5);
});
