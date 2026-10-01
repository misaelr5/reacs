import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { fileAgenda, updateAgenda } from '../lib/agenda-repository.ts';
const base = 'http://127.0.0.1:4174';
const report = { requests: [], console: [], results: [], outbound: [], environmentScripts: [] };
const owned = new Set();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem('reac_analytics_consent', 'denied'));
  await context.route('**/*', route => {
    // This workstation injects a Kaspersky script into Chrome. Keep its request local to the test.
    if (new URL(route.request().url()).hostname === 'gc.kis.v2.scr.kaspersky-labs.com') { report.environmentScripts.push('Kaspersky browser injection intercepted'); return route.fulfill({ contentType: 'application/javascript', body: '' }); }
    if (new URL(route.request().url()).origin !== base) { report.outbound.push(new URL(route.request().url()).origin); return route.abort(); }
    return route.continue();
  });
  const availability = async id => (await context.request.get(base + '/api/booking?professionalId=' + id)).json();
  const misael = await availability('misael'), tomas = await availability('tomas');
  assert.equal(misael.mode, 'mock', 'Only local mock data may be mutated');
  const target = misael.slots.find(s => s.label === '09:00' && tomas.slots.some(t => t.start === s.start));
  assert.ok(target, 'A shared free 09:00 slot must exist');
  const page = await context.newPage(); page.on('pageerror', e => report.console.push(e.message));
  page.on('console', message => { if (message.type() === 'error') report.console.push(message.text()); });
  async function choose(person) {
    const response = page.waitForResponse(r => r.request().method() === 'GET' && r.url().includes('professionalId=' + person));
    await page.locator(`[name=professionalId][value=${person}]`).check(); await response;
    await page.locator('#booking-picker').waitFor({ state: 'visible' });
  }
  async function chooseDay() {
    if (!(await page.locator(`[data-date="${target.date}"]`).count())) await page.locator('#booking-next').click();
    await page.locator(`[data-date="${target.date}"]`).click();
  }
  const bodies = [];
  for (const person of ['misael', 'tomas']) {
    await page.emulateMedia({ reducedMotion: person === 'tomas' ? 'reduce' : 'no-preference' });
    await page.goto(base + '/agendar');
    if (person === 'tomas') await page.evaluate(() => { document.startViewTransition = undefined; });
    await choose(person); await chooseDay(); await page.locator('#booking-times button', { hasText: /^09:00$/ }).click();
    await page.locator('[name=name]').fill('Prueba automatizada local');
    await page.locator('[name=email]').fill('test@example.test');
    await page.locator('[name=phone]').fill('(03544) 123456');
    await page.locator('[name=service]').selectOption(person === 'misael' ? 'Desarrollo web' : 'Marketing digital');
    await page.locator('[name=consent]').check();
    const responsePromise = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/api/booking'));
    await page.locator('#booking-submit').click(); const response = await responsePromise;
    const body = response.request().postDataJSON(); owned.add(body.requestId); bodies.push(body);
    const result = await response.json(); report.requests.push({ method: 'POST', url: response.url(), body, status: response.status(), response: result });
    assert.equal(response.status(), 200); assert.equal(result.professional.id, person); assert.equal(result.start, target.start);
    assert.equal(result.durationMinutes, 30); assert.equal(result.conferenceStatus, 'mock'); assert.equal(result.meetUrl, null);
    await page.locator('#booking-success').waitFor({ state: 'visible' });
    assert.match(await page.locator('#booking-confirm-professional').innerText(), person === 'misael' ? /Misael.*Desarrollador web/ : /Tomás.*Especialista en marketing/);
    report.results.push(person + ' same date at 09:00: confirmed');
  }
  const persisted = await fileAgenda('.local/booking-agenda-mock.json').read();
  assert.deepEqual(persisted.reservations.filter(r => owned.has(r.id)).map(r => [r.professionalId, r.status]).sort(), [['misael','confirmed'],['tomas','confirmed']]);
  for (const body of bodies) {
    const response = await context.request.post(base + '/api/booking', { headers: { origin: base }, data: { ...body, requestId: crypto.randomUUID() } });
    assert.equal(response.status(), 409); assert.equal((await response.json()).code, 'slot_taken');
    assert.ok(!(await availability(body.professionalId)).slots.some(s => s.start === target.start));
  }
  report.results.push('Both same-professional duplicates: 409; persisted owners verified');
  await page.goto(base + '/agendar'); await choose('misael'); await chooseDay();
  await page.locator('#booking-times button').first().click();
  await choose('tomas');
  assert.equal(await page.locator('#booking-form').isVisible(), false);
  assert.equal(await page.locator('#booking-times button').count(), 0);
  assert.equal(await page.locator('#booking-days [aria-pressed=true]').count(), 0);
  report.results.push('Provider change makes a new GET and clears date, slot and form');
  // An invalid phone must identify the field, keep consent/data, and allow correction.
  await chooseDay(); await page.locator('#booking-times button').first().click();
  await page.locator('[name=name]').fill('Prueba de validación'); await page.locator('[name=email]').fill('test@example.test');
  await page.locator('[name=service]').selectOption('Marketing digital'); await page.locator('[name=phone]').fill('abc'); await page.locator('[name=consent]').check();
  await page.locator('#booking-submit').click(); await page.waitForFunction(() => document.querySelector('[name=phone]').getAttribute('aria-invalid') === 'true');
  assert.match(await page.locator('#booking-error').innerText(), /teléfono/);
  assert.equal(await page.locator('[name=consent]').isChecked(), true); assert.equal(await page.locator('#booking-submit').isEnabled(), true);
  await page.locator('[name=phone]').fill('(03544) 123456'); assert.equal(await page.locator('[name=phone]').getAttribute('aria-invalid'), null);
  report.results.push('Field-specific phone validation; consent and form values preserved');
  // A slower response for Misael must not overwrite a later Tomas selection.
  let release; const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/booking?professionalId=misael', async route => { await gate; await route.fulfill({ json: { ...misael, slots: [] } }); });
  await page.locator('[name=professionalId][value=misael]').check();
  await choose('tomas');
  const staleResponse = page.waitForResponse(r => r.url().includes('professionalId=misael'));
  release(); await staleResponse;
  await page.waitForFunction(() => document.querySelector('[name=professionalId][value=tomas]').checked && !document.querySelector('#booking-picker').hidden);
  assert.equal(await page.locator('#booking-form').isVisible(), false);
  assert.ok(!(await page.locator('#booking-status').innerText()).includes('No hay horarios'));
  report.results.push('Late response from previous professional ignored');
  assert.deepEqual(report.console.filter(message => !message.includes('400 (Bad Request)')), []);
  assert.deepEqual(report.outbound, []);
  console.log(JSON.stringify(report.results, null, 2));
} finally {
  await browser.close();
  // Remove only this suite's UUIDs, never reset other records or rules.
  if (owned.size) await updateAgenda(fileAgenda('.local/booking-agenda-mock.json'), state => { state.reservations = state.reservations.filter(r => !owned.has(r.id)); });
  writeFileSync('artifacts/professionals-browser-report.json', JSON.stringify(report, null, 2));
}
