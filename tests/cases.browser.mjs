import assert from 'node:assert/strict';
import { cases } from '../content/cases.mjs';
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
  await page.goto(base + '/proyectos');
  const grid = page.locator('.ppj-grid');
  const cards = grid.locator(':scope > article');
  const count = await cards.count();
  assert.equal(count, cases.length + 8);
  assert.equal(Number(await page.locator('[data-project-total]').textContent()), count);
  assert.equal(await page.locator('[data-case-deck], [data-project-browser]').count(), 0);
  assert.equal(await cards.filter({ visible: true }).count(), count);
  for (const width of [320, 390, 760, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
    assert.equal(await grid.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), width <= 700 ? 1 : 2);
  }
  report.checks.push('All 14 projects share one responsive grid; correct total; no carousel; four viewport widths');
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const project of cases) {
    const card = page.locator('.ppj-grid > #' + project.slug);
    await card.scrollIntoViewIfNeeded();
    const image = card.locator('img');
    if (await image.count()) {
      await image.evaluate(img => img.decode());
      assert.ok(await image.evaluate(img => img.naturalWidth > 0));
    }
    assert.ok(await card.locator(`a[href="/proyectos/${project.slug}"]`).count());
  }
  for (const image of await grid.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(img => img.decode());
  }
  report.checks.push('Every featured and archive image loads; featured case detail links remain available');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: `artifacts/projects-grid-${width}.png`, fullPage: true });
  }
  await page.goto(base + '/proyectos#mas-servicios');
  assert.ok(await page.locator('#mas-servicios').isVisible());
  assert.equal(await page.locator('.ppj-item[inert], .ppj-item[hidden]').count(), 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(base + '/proyectos');
  await page.waitForFunction(() => window.gsap && Number(gsap.getProperty(document.querySelector('.ppj-item'), 'y')) > 0);
  const first = page.locator('.ppj-item').first();
  await first.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.ppj-item')).opacity === '1' && document.querySelector('.ppj-item').style.transform === '');
  assert.equal(await first.evaluate(node => node.style.transform), '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => [...document.querySelectorAll('.ppj-item')].every(node => getComputedStyle(node).opacity === '1' && getComputedStyle(node).transform === 'none'));
  assert.equal(await cards.evaluateAll(nodes => nodes.every(node => getComputedStyle(node).opacity === '1' && getComputedStyle(node).transform === 'none')), true);
  assert.equal(Number(await page.locator('[data-project-total]').textContent()), count);
  report.checks.push('GSAP reveals upward on scroll; changing reduced motion restores every card and the final counter');
  await page.locator('.case-link[href^="/proyectos/"]').first().click();
  assert.match(await page.locator('figcaption').textContent(), /Mockup ilustrativo/);
  const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const fallback = await noJS.newPage();
  await fallback.goto(base + '/proyectos');
  assert.equal(await fallback.locator('.ppj-item:visible').count(), count);
  report.checks.push('Case detail navigation and complete catalog without JavaScript');
  assert.equal(report.errors.length, 0);
  console.log(JSON.stringify(report));
} finally {
  writeFileSync('artifacts/projects-grid-report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
