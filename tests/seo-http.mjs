import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { parse, find, attr } from '../scripts/html.mjs';
import { services } from '../content/services.mjs';

const base = process.env.TEST_URL || 'http://127.0.0.1:4174';
const manifest = JSON.parse(readFileSync('artifacts/build-manifest.json', 'utf8'));
const checks = [];
const get = (path, options = {}) => fetch(base + path, { signal: AbortSignal.timeout(15000), redirect: 'manual', ...options });
for (const page of manifest.pages.filter(page => page.indexable)) {
  const response = await get(page.path);
  assert.equal(response.status, 200, page.path);
  assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag') || ''));
  const doc = parse(await response.text());
  assert.equal(attr(find(doc, n => n.tagName === 'link' && attr(n, 'rel') === 'canonical'), 'href'), manifest.siteUrl + page.path);
  checks.push({ path: page.path, status: response.status });
}
for (const [path, target] of [
  ['/index.html', '/'], ['/Reac.dc.html', '/'],
  ...services.flatMap(service => [[`/${service.slug}.html`, `/${service.slug}`], [`/${service.slug}/`, `/${service.slug}`]]),
  ...['sitio-web', 'meta-ads', 'google-ads', 'negocio-digital'].map(name => [`/recursos/auditoria-${name}`, `/recursos/auditoria-${name}.html`])
]) {
  const response = await get(path + '?utm_source=seo-test');
  assert.equal(response.status, 308, path);
  assert.equal(new URL(response.headers.get('location'), base).pathname, target);
  assert.equal(new URL(response.headers.get('location'), base).search, '?utm_source=seo-test');
  assert.equal((await get(target)).status, 200);
  checks.push({ path, status: response.status, target });
}
for (const path of ['/missing-seo-test', '/.env', '/.git/config', '/site.config.mjs', '/admin', '/dashboard', '/internal', '/api/source.ts']) {
  const response = await get(path); assert.equal(response.status, 404, path); checks.push({ path, status: response.status });
}
assert.equal((await get('/api/contact')).status, 405);
for (const path of ['/%2fexample.test/', '/%5cexample.test/']) assert.equal((await get(path)).status, 400);
for (const file of ['robots.txt', 'sitemap.xml']) {
  const response = await get('/' + file); assert.equal(response.status, 200);
  assert.equal(await response.text(), readFileSync('dist/' + file, 'utf8'));
}
const baseline = await (await get('/')).text();
for (const agent of ['Googlebot', 'bingbot', 'OAI-SearchBot']) {
  const response = await get('/', { headers: { 'User-Agent': agent } }); assert.equal(response.status, 200);
  assert.equal(await response.text(), baseline, agent + ': content differs');
}
const query = parse(await (await get('/landing-pages?utm_source=seo-test')).text());
assert.equal(attr(find(query, n => n.tagName === 'link' && attr(n, 'rel') === 'canonical'), 'href'), manifest.siteUrl + '/landing-pages');
const report = { base, checkedAt: new Date().toISOString(), passed: true, checks, bots: ['Googlebot', 'bingbot', 'OAI-SearchBot'], limitation: 'User-Agent simulation from this machine, not crawler IP or indexing verification. Local preview is not Vercel infrastructure.' };
writeFileSync('artifacts/seo-http-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: checks.length, publicPages: manifest.pages.filter(page => page.indexable).length }));
