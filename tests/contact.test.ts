import test from 'node:test';
import assert from 'node:assert/strict';
import { handleContact, type ContactEnvironment } from '../lib/contact.ts';

// Every outbound call is mocked. These reserved example addresses and tokens
// cannot send real mail and are never included in the production build.
const env: ContactEnvironment = {
  SITE_URL: 'https://reacs-studio.vercel.app', VERCEL: '1', NODE_ENV: 'production',
  UPSTASH_REDIS_REST_URL: 'https://unit-test.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'mock-redis-token', CONTACT_RATE_LIMIT_SECRET: 'test-only-rate-key-never-use-in-production',
  RESEND_API_KEY: 'mock-resend-token', CONTACT_FROM: 'Reac Test <sender@example.test>', CONTACT_TO: 'recipient@example.test',
};
const valid = {
  form_type: 'contacto', nombre: 'Persona de prueba', email: 'person@example.test',
  empresa: 'Empresa de prueba', mensaje: 'Quiero consultar por una página web.', privacy_consent: true, _gotcha: '',
};
function request(data: unknown = valid, headers: Record<string, string> = {}): Request {
  return new Request(env.SITE_URL + '/api/contact', {
    method: 'POST', headers: { origin: env.SITE_URL!, 'x-vercel-forwarded-for': '203.0.113.5', 'content-type': 'application/json', accept: 'application/json', ...headers },
    body: typeof data === 'string' ? data : JSON.stringify(data),
  });
}
function provider(options: { redisStatus?: number; redisResult?: unknown; mailStatus?: number; mailBody?: unknown; throwAt?: 'redis' | 'mail'; timeoutAt?: 'redis' | 'mail' } = {}) {
  const calls: { url: string; body: Record<string, unknown> | unknown[]; init: RequestInit }[] = [];
  let count = 0;
  const mock: typeof fetch = async (input, init = {}) => {
    const url = String(input);
    const body = JSON.parse(String(init.body));
    calls.push({ url, body, init });
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal, 'upstream request must have a timeout signal');
    if (url === env.UPSTASH_REDIS_REST_URL) {
      if (options.timeoutAt === 'redis') throw new DOMException('The operation timed out', 'TimeoutError');
      if (options.throwAt === 'redis') throw new Error('private Redis failure');
      assert.equal(body[0], 'EVAL');
      assert.match(body[1], /redis\.call\('INCR'/);
      assert.match(body[1], /redis\.call\('EXPIRE'/);
      assert.equal(body[2], '1');
      assert.equal(body[4], '600');
      assert.match(body[3], /^reac:contact:v1:[a-f0-9]{64}$/);
      assert.ok(!body[3].includes('203.0.113.5'));
      count++;
      return Response.json({ result: options.redisResult ?? [count, 600] }, { status: options.redisStatus ?? 200 });
    }
    assert.equal(url, 'https://api.resend.com/emails');
    if (options.timeoutAt === 'mail') throw new DOMException('The operation timed out', 'TimeoutError');
    if (options.throwAt === 'mail') throw new Error('private email provider failure');
    return Response.json(options.mailBody ?? { id: 'mock-accepted-email' }, { status: options.mailStatus ?? 200 });
  };
  return { mock, calls, mails: () => calls.filter(call => call.url === 'https://api.resend.com/emails') };
}

test('accepts valid contact only after the provider accepts delivery', async () => {
  const stub = provider();
  const result = await handleContact(request(), env, stub.mock);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok: true });
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(stub.mails().length, 1);
  const mail = stub.mails()[0]!.body as Record<string, unknown>;
  assert.equal(mail.from, env.CONTACT_FROM);
  assert.deepEqual(mail.to, [env.CONTACT_TO]);
  assert.equal(mail.reply_to, valid.email);
  assert.equal(mail.html, undefined);
  assert.equal(mail.attachments, undefined);
});

test('supports a regular HTML form and redirects only after acceptance', async () => {
  const data = new URLSearchParams({ ...valid, privacy_consent: 'on' });
  const stub = provider();
  const result = await handleContact(request(data.toString(), { 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html' }), env, stub.mock);
  assert.equal(result.status, 303);
  assert.equal(result.headers.get('location'), '/gracias');
  assert.equal(stub.mails().length, 1);
});

test('rejects methods, foreign/missing origins and unsupported content before calling providers', async () => {
  const cases: [Request, number][] = [
    [new Request(env.SITE_URL + '/api/contact'), 405],
    [request(valid, { origin: 'https://reacs-studio.vercel.app.attacker.test' }), 403],
    [request(valid, { origin: 'null' }), 403],
    [request(valid, { origin: '' }), 403],
    [request(valid, { 'content-type': 'multipart/form-data' }), 415],
  ];
  for (const [input, status] of cases) {
    const stub = provider();
    const result = await handleContact(input, env, stub.mock);
    assert.equal(result.status, status);
    assert.equal(stub.calls.length, 0);
    assert.equal(result.headers.get('access-control-allow-origin'), null);
    if (status === 405) assert.equal(result.headers.get('allow'), 'POST');
  }
});

test('fails closed when configuration is absent, unsafe or malformed', async () => {
  for (const missing of ['RESEND_API_KEY', 'CONTACT_FROM', 'CONTACT_TO', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'CONTACT_RATE_LIMIT_SECRET']) {
    const stub = provider();
    const result = await handleContact(request(), { ...env, [missing]: '' }, stub.mock);
    assert.equal(result.status, 503, missing);
    assert.equal(stub.calls.length, 0);
  }
  for (const overrides of [
    { UPSTASH_REDIS_REST_URL: 'http://127.0.0.1' },
    { UPSTASH_REDIS_REST_URL: 'https://valid.upstash.io.attacker.test' },
    { UPSTASH_REDIS_REST_URL: 'https://user:pass@valid.upstash.io' },
    { UPSTASH_REDIS_REST_URL: 'https://valid.upstash.io/other' },
    { CONTACT_FROM: 'sender@example.test\r\nBcc: attacker@example.test' },
    { CONTACT_TO: 'recipient@example.test,attacker@example.test' },
    { CONTACT_RATE_LIMIT_SECRET: 'short' },
    { SITE_URL: 'https://reacs-studio.vercel.app/path' },
  ]) {
    const stub = provider();
    assert.equal((await handleContact(request(), { ...env, ...overrides }, stub.mock)).status, 503);
    assert.equal(stub.calls.length, 0);
  }
});

test('does not trust arbitrary forwarded headers outside Vercel', async () => {
  const stub = provider();
  assert.equal((await handleContact(request(), { ...env, VERCEL: undefined }, stub.mock)).status, 503);
  assert.equal((await handleContact(request(valid, { 'x-vercel-forwarded-for': '', 'x-forwarded-for': '203.0.113.5' }), env, stub.mock)).status, 503);
  assert.equal((await handleContact(request(valid, { 'x-vercel-forwarded-for': '203.0.113.5, 10.0.0.1' }), env, stub.mock)).status, 503);
  assert.equal(stub.calls.length, 0);
});

test('rejects malformed, duplicate, oversized and invalid submissions without sending email', async () => {
  const cases: Request[] = [
    request('{invalid'), request('null'), request('[]'), request({ ...valid, nombre: [] }),
    request({ ...valid, email: 'wrong-address' }), request({ ...valid, mensaje: 'corto' }),
    request({ ...valid, email: 'person..name@example.test' }), request({ ...valid, email: '.person@example.test' }),
    request({ ...valid, email: 'person@' + 'a'.repeat(64) + '.test' }),
    request({ ...valid, mensaje: 'a'.repeat(3001) }), request({ ...valid, nombre: 'a'.repeat(121) }),
    request({ ...valid, empresa: 'a'.repeat(161) }), request({ ...valid, privacy_consent: false }),
    request({ ...valid, privacy_consent: 'false' }), request({ ...valid, _gotcha: 'bot' }),
    request({ ...valid, form_type: 'unknown' }), request({ ...valid, to: 'attacker@example.test' }),
    request({ ...valid, mensaje: 'https://a.test '.repeat(5) }),
    request({ ...valid, email: 'person@example.test\r\nBcc: attacker@example.test' }),
    request({ ...valid, mensaje: 'El mensaje\u0000 contiene un control' }),
    request({ ...valid, mensaje: 'El mensaje\u0085 contiene un control' }),
    request('email=a%40example.test&email=b%40example.test', { 'content-type': 'application/x-www-form-urlencoded' }),
  ];
  for (const input of cases) {
    const stub = provider();
    const result = await handleContact(input, env, stub.mock);
    assert.equal(result.status, 400);
    assert.equal(stub.mails().length, 0);
  }
  for (const input of [request('x'.repeat(12 * 1024 + 1)), request('€'.repeat(5000), { 'content-length': '10' }), request(valid, { 'content-length': String(12 * 1024 + 1) })]) {
    const stub = provider();
    assert.equal((await handleContact(input, env, stub.mock)).status, 413);
    assert.equal(stub.mails().length, 0);
  }
});

test('untrusted code is sent as plain text and never changes recipients or headers', async () => {
  const text = '<script>alert(1)</script>\n$(touch /tmp/test)\nSELECT * FROM users;';
  const stub = provider();
  assert.equal((await handleContact(request({ ...valid, mensaje: text }), env, stub.mock)).status, 200);
  const mail = stub.mails()[0]!.body as Record<string, unknown>;
  assert.ok(String(mail.text).includes(text));
  assert.equal(mail.html, undefined);
  assert.equal(mail.headers, undefined);
  assert.deepEqual(mail.to, [env.CONTACT_TO]);
});

test('distributed rate results cap concurrent accepted attempts at five', async () => {
  const stub = provider();
  const results = await Promise.all(Array.from({ length: 12 }, () => handleContact(request(), env, stub.mock)));
  assert.equal(results.filter(result => result.status === 200).length, 5);
  assert.equal(results.filter(result => result.status === 429).length, 7);
  assert.equal(stub.mails().length, 5);
  for (const result of results.filter(item => item.status === 429)) assert.equal(result.headers.get('retry-after'), '600');
  // Simulated Redis atomically returns consecutive counts. The real deployment
  // must still verify connectivity and script execution with its own database.
});

test('fails closed on Redis outages and malformed counters', async () => {
  for (const options of [{ redisStatus: 500 }, { throwAt: 'redis' as const }, { timeoutAt: 'redis' as const }, { redisResult: ['1', 600] }, { redisResult: [1, -1] }, { redisResult: [1, 601] }, { redisResult: null }]) {
    const stub = provider(options.redisResult === null ? { redisResult: {} } : options);
    const result = await handleContact(request(), env, stub.mock);
    assert.equal(result.status, 503);
    assert.equal(stub.mails().length, 0);
    assert.ok(!(await result.text()).includes('private'));
  }
});

test('provider errors, timeouts and missing acceptance IDs never report success', async () => {
  for (const options of [{ mailStatus: 500 }, { throwAt: 'mail' as const }, { timeoutAt: 'mail' as const }, { mailBody: {} }, { mailBody: { id: '' } }]) {
    const stub = provider(options);
    const result = await handleContact(request(), env, stub.mock);
    assert.equal(result.status, 502);
    assert.deepEqual((await result.json()).code, 'delivery_failed');
    const htmlResult = await handleContact(request(valid, { accept: 'text/html' }), env, stub.mock);
    assert.equal(htmlResult.status, 502);
    assert.equal(htmlResult.headers.get('location'), null);
    assert.ok(!(await htmlResult.text()).includes('private'));
  }
});

test('newsletter does not masquerade as a contact or a registered subscription', async () => {
  const stub = provider();
  const result = await handleContact(request({ form_type: 'newsletter', email: valid.email }), env, stub.mock);
  assert.equal(result.status, 503);
  assert.equal((await result.json()).code, 'newsletter_unavailable');
  assert.equal(stub.mails().length, 0);
});
