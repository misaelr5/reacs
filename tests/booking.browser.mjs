import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileAgenda, updateAgenda } from '../lib/agenda-repository.ts';
const base = process.env.TEST_URL || 'http://127.0.0.1:4174';
if (base !== 'http://127.0.0.1:4174') throw new Error('This mutating suite requires the local mock server.');
let ownedRequestId;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { widths: [], errors: [], scenarios: [] };
mkdirSync('artifacts', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  assert.equal((await (await context.request.get(base + '/api/booking')).json()).mode, 'mock');
  await context.addInitScript(() => localStorage.setItem('reac_analytics_consent', 'denied'));
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(base + '/');
  assert.equal(await page.locator('a[data-placement=header][href="/agendar"]').count(), 1);
  await page.locator('.booking-contact-option a').click();
  await page.waitForURL('**/agendar');
  assert.equal(await page.locator('#booking-picker').isVisible(), false); await page.locator('[name=professionalId][value=tomas]').check(); await page.locator('#booking-picker').waitFor({ state: 'visible' });
  assert.match(await page.locator('#booking-mode').innerText(), /TEST/);
  for (const width of [320,360,375,390,430,768,1024,1440,1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(dimensions.scroll <= width, 'overflow at ' + width); report.widths.push(dimensions);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'artifacts/booking-desktop.png', fullPage: true });
  await page.locator('#booking-days button:enabled').first().focus();
  await page.keyboard.press('Enter');
  await page.locator('#booking-times button').first().focus(); await page.keyboard.press('Enter');
  assert.match(await page.locator('#booking-selected').innerText(), /Tomás.*Especialista en marketing/);
  await page.locator('[name=professionalId][value=misael]').check();
  assert.equal(await page.locator('#booking-form').isVisible(), false);
  assert.equal(await page.locator('#booking-times button').count(), 0);
  await page.locator('[name=professionalId][value=tomas]').check();
  await page.locator('#booking-days button:enabled').first().click(); await page.locator('#booking-times button').first().click();
  await page.locator('[name=name]').fill('Prueba local');
  await page.locator('[name=email]').fill('person@example.test');
  await page.locator('[name=service]').selectOption('Desarrollo web');
  await page.locator('[name=consent]').check();
  for (const width of [320,375,390,430,768,1440,1920]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'form overflow at ' + width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/booking-mobile.png', fullPage: true });
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  assert.deepEqual(axe.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })), []);
  const realSubmission = page.waitForRequest(req => req.method() === 'POST' && req.url().endsWith('/api/booking'));
  await page.locator('#booking-submit').click(); ownedRequestId = (await realSubmission).postDataJSON().requestId; await page.locator('#booking-success').waitFor({ state: 'visible' });
  assert.match(await page.locator('#booking-confirm-note').innerText(), /no se creó un evento/);
  assert.match(await page.locator('#booking-confirm-professional').innerText(), /Tomás.*Especialista en marketing/);
  assert.equal(await page.locator('#booking-meet').isVisible(), false);
  report.scenarios.push('home CTA, keyboard, fields, consent, mock success, no fake Meet button, axe');

  // Controlled error fixtures: all POSTs below are intercepted, never sent to Google.
  const availability = await (await context.request.get(base + '/api/booking')).json();
  let phase = 'unavailable';
  await page.route('**/api/booking*', route => {
    const post = route.request().method() === 'POST';
    if (phase === 'unavailable') return route.fulfill({ status: 503, json: { ok: false, code: 'unavailable', message: 'No pudimos consultar Google.' } });
    if (!post) return route.fulfill({ json: { ...availability, slots: phase === 'empty' ? [] : availability.slots } });
    if (phase === 'conflict') return route.fulfill({ status: 409, json: { ok: false, code: 'slot_taken', message: 'Ese horario acaba de ocuparse. Elegí otro.' } });
    if (phase === 'timeout') return route.fulfill({ status: 502, json: { ok: false, code: 'google_error', message: 'Reintentá con los mismos datos.' } });
    return route.fulfill({ json: { ok: true, mode: 'google_test', start: availability.slots[0].start, meetUrl: phase === 'ready' ? 'https://meet.google.com/abc-defg-hij' : null, conferenceStatus: 'pending' } });
  });
  await page.reload(); await page.locator('#booking-retry').waitFor({ state: 'visible' });
  assert.match(await page.locator('#booking-status').innerText(), /Google/);
  phase = 'empty'; await page.locator('#booking-retry').click(); await page.waitForFunction(() => document.querySelector('#booking-status').textContent.includes('No hay horarios'));
  phase = 'conflict'; await page.locator('#booking-retry').click(); await page.locator('[name=professionalId][value=misael]').check(); await page.locator('#booking-picker').waitFor({ state: 'visible' });
  async function choose() { await page.locator('#booking-days button:enabled').first().click(); await page.locator('#booking-times button').first().click(); }
  async function fill() { await page.locator('[name=name]').fill('Local test'); await page.locator('[name=email]').fill('person@example.test'); await page.locator('[name=service]').selectOption('Desarrollo web'); await page.locator('[name=consent]').check(); }
  await choose(); await fill(); await page.locator('#booking-submit').click();
  await page.waitForFunction(() => document.querySelector('#booking-status').textContent.includes('acaba de ocuparse'));
  await choose(); assert.equal(await page.locator('[name=email]').isEnabled(), true); await fill();
  phase = 'timeout'; let sent;
  page.on('request', req => { if (req.method() === 'POST' && req.url().endsWith('/api/booking')) sent = req.postData(); });
  await page.locator('#booking-submit').click(); await page.waitForFunction(() => document.querySelector('#booking-error').textContent.includes('Reintentá'));
  const original = sent; assert.equal(JSON.parse(original).professionalId, 'misael'); assert.equal(await page.locator('[name=professionalId][value=misael]').isDisabled(), true); assert.equal(await page.locator('[name=email]').isEnabled(), false);
  phase = 'pending'; await page.locator('#booking-submit').click(); await page.locator('#booking-success').waitFor({ state: 'visible' }); assert.equal(sent, original);
  assert.match(await page.locator('#booking-confirm-note').innerText(), /preparando/);
  phase = 'ready'; await page.locator('#booking-refresh-meet').click(); await page.locator('#booking-meet').waitFor({ state: 'visible' }); assert.equal(sent, original);
  assert.equal(await page.locator('#booking-meet').getAttribute('href'), 'https://meet.google.com/abc-defg-hij');
  report.scenarios.push('availability error/retry, empty, slot conflict recovery, uncertain retry same payload, pending/ready Meet');
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally { writeFileSync('artifacts/booking-browser-report.json', JSON.stringify(report, null, 2)); await browser.close(); if (ownedRequestId) await updateAgenda(fileAgenda('.local/booking-agenda-mock.json'), state => { state.reservations = state.reservations.filter(item => item.id !== ownedRequestId); }); }
