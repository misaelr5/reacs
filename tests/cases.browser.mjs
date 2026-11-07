import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.env.TEST_URL || 'http://127.0.0.1:4174';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checks: [], errors: [] };
mkdirSync('artifacts', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('reac_analytics_consent', 'denied'));
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  for (const path of ['/', '/proyectos']) {
    await page.goto(base + path);
    const deck = page.locator('[data-case-deck]');
    await page.waitForSelector('[data-case-deck][data-enhanced]');
    assert.equal(await deck.locator('.case-card:visible').count(), 1);
    assert.equal(await deck.locator('.case-card[inert]').count(), 4);
    const before = await deck.boundingBox();
    await deck.getByRole('button', { name: 'Caso siguiente', exact: true }).click();
    assert.equal(await deck.locator('.is-active').getAttribute('id'), 'travel-days');
    assert.equal(await deck.locator('[data-case-count]').textContent(), '2 / 5');
    const after = await deck.boundingBox();
    assert.ok(Math.abs(before.height - after.height) <= 1, 'Changing case must preserve deck height');
    assert.equal(await deck.evaluate(node => node.getAnimations({ subtree: true }).length), 0, 'Reduced motion must skip animation');
    await deck.getByRole('button', { name: 'Caso anterior', exact: true }).click();
    await deck.getByRole('button', { name: 'Caso anterior', exact: true }).click();
    assert.equal(await deck.locator('[data-case-count]').textContent(), '5 / 5');
    await deck.locator('[data-case-next]').press('Home');
    assert.equal(await deck.locator('[data-case-count]').textContent(), '1 / 5');
    await deck.locator('[data-case-next]').press('End');
    assert.equal(await deck.locator('[data-case-count]').textContent(), '5 / 5');
    await deck.locator('[data-case-go="2"]').click();
    assert.equal(await deck.locator('.is-active').getAttribute('id'), 'comunidad-cristiana-villa-sarmiento');
    assert.equal(await deck.locator('[data-case-go="2"]').getAttribute('aria-pressed'), 'true');
    for (const width of [320, 390, 760, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.ok((await deck.boundingBox()).height < (width < 761 ? 1250 : 800), 'Deck should occupy one case, not five');
    }
    report.checks.push(path + ': next/previous/wrap, keyboard, direct selection, stable height, reduced motion and four widths');
  }
  await page.goto(base + '/proyectos#mas-servicios');
  assert.equal(await page.locator('.case-card.is-active').getAttribute('id'), 'mas-servicios');
  await page.goto(base + '/');
  const deck = page.locator('[data-case-deck]');
  await deck.evaluate(node => {
    const touch = new Touch({ identifier: 1, target: node, clientX: 280, clientY: 100 });
    node.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], bubbles: true }));
    const end = new Touch({ identifier: 1, target: node, clientX: 100, clientY: 105 });
    node.dispatchEvent(new TouchEvent('touchend', { changedTouches: [end], bubbles: true }));
  });
  assert.equal(await deck.locator('.is-active').getAttribute('id'), 'travel-days');
  report.checks.push('Existing fragment links select their case; horizontal touch gestures advance a case');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await deck.locator('[data-case-go="0"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.case-card.is-leaving').length === 0);
  await deck.evaluate(node => {
    node.querySelector('[data-case-next]').click();
    const animations = node.getAnimations({ subtree: true });
    window.__caseAnimation = animations.map(a => ({ duration: a.effect.getTiming().duration, frames: a.effect.getKeyframes() }));
  });
  const animation = await page.evaluate(() => window.__caseAnimation);
  assert.equal(animation.length, 2);
  assert.ok(animation.every(a => a.duration === 540 && a.frames.some(frame => frame.transform.includes('translateX'))));
  await deck.evaluate(node => { for (let i = 0; i < 8; i++) node.querySelector('[data-case-next]').click(); });
  await page.waitForFunction(() => document.querySelectorAll('.case-card.is-leaving').length === 0);
  assert.equal(await deck.locator('.case-card.is-active').count(), 1);
  assert.equal(await deck.locator('.case-card[inert]').count(), 4);
  await deck.locator('[data-case-next]').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => document.querySelectorAll('.case-card.is-leaving').length === 0);
  assert.equal(await deck.evaluate(node => node.getAnimations({ subtree: true }).length), 0);
  report.checks.push('Native lateral animation, rapid clicks and switching to reduced motion during a transition');
  await deck.locator('[data-case-go="0"]').click();
  const image = deck.locator('.is-active img');
  await image.evaluate(img => img.decode());
  assert.match(await image.getAttribute('alt'), /Ilustración/);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await deck.screenshot({ path: `artifacts/case-deck-${width}.png` });
  }
  await deck.locator('.is-active .case-link').click();
  assert.match(await page.locator('figcaption').textContent(), /generada con IA/);
  assert.equal(report.errors.length, 0);
  console.log(JSON.stringify(report));
} finally {
  writeFileSync('artifacts/case-deck-report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
