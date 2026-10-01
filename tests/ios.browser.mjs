import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { webkit, chromium, devices } from 'playwright-core';

const base = process.env.TEST_URL || 'http://127.0.0.1:4174';
const engine = process.env.TEST_BROWSER || 'webkit';
const browser = engine === 'webkit'
  ? await webkit.launch({ headless: true, ...(process.env.WEBKIT_EXECUTABLE ? { executablePath: process.env.WEBKIT_EXECUTABLE } : {}) })
  : await chromium.launch({ channel: 'chrome', headless: true });
const report = { engine, limitation: 'Desktop engine with iPhone emulation, not physical iOS/Safari; no hardware FPS claim.', responsive: [], interactions: [], errors: [] };
mkdirSync('artifacts', { recursive: true });
async function bounded(task, label) {
  let timer;
  try {
    return await Promise.race([task, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), 20000);
    })]);
  } finally { clearTimeout(timer); }
}
try {
  const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('reac_analytics_consent', 'denied'));
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.message));
  const manifest = JSON.parse(readFileSync('artifacts/build-manifest.json', 'utf8'));
  for (const entry of manifest.pages) {
    console.log(`Responsive: ${entry.path}`);
    const response = await page.goto(base + (entry.path === '/404' ? '/ios-test-missing' : entry.path));
    assert.equal(response.status(), entry.path === '/404' ? 404 : 200, entry.path);
    for (const width of [320, 375, 390, 430, 768, 844]) {
      await bounded(page.setViewportSize({ width, height: width === 844 ? 390 : 844 }), `${entry.path} resize ${width}`);
      const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.equal(layout.width, width, 'Emulation viewport mismatch');
      assert.ok(layout.scroll <= width, `${entry.path}: overflow at ${width}`);
      report.responsive.push({ path: entry.path, ...layout });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/');
  console.log('Touch interactions');
  await page.locator('#proceso').scrollIntoViewIfNeeded();
  await page.locator('.mobile-nav summary').tap();
  assert.equal(await page.locator('.mobile-nav').getAttribute('open'), '');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.mobile-nav').getAttribute('open'), null);
  await page.locator('[data-action="setProbCon"]').tap();
  assert.equal(await page.locator('[data-prob-panel="con"]').isVisible(), true);
  const toggle = page.locator('.sim-toggle').first();
  const pressed = await toggle.getAttribute('aria-pressed');
  await toggle.tap();
  assert.notEqual(await toggle.getAttribute('aria-pressed'), pressed);
  const budget = page.locator('[data-action="changeBudget"]');
  await budget.fill('100');
  await budget.dispatchEvent('input');
  assert.match(await page.locator('[data-budget-output]').textContent(), /3\.000/);
  await page.locator('.proj-controls [data-action="projNext"]').tap();
  assert.match(await page.locator('.proj-counter').textContent(), /02 \/ 03/);
  await page.locator('.imp-faq summary').first().tap();
  assert.equal(await page.locator('.imp-faq').first().getAttribute('open'), '');
  await page.locator('#ct-nombre').fill('Prueba local sin envío');
  assert.equal(await page.locator('.mobile-sticky-cta').isVisible(), false);
  await page.locator('#ct-nombre').blur();
  assert.equal(await page.locator('.mobile-sticky-cta').isVisible(), true);
  for (const width of [390, 844]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 390 });
    assert.ok(await page.locator('.ct-field,.ct-select').evaluateAll(nodes => nodes.every(node => parseFloat(getComputedStyle(node).fontSize) >= 16)), 'Form font below 16px');
  }
  report.interactions.push('Touch navigation, comparison, simulator toggle, native range input, carousel, FAQ, focus and landscape form sizing');
  await context.close();

  const motionContext = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'no-preference' });
  console.log('Motion and orientation');
  await motionContext.addInitScript(() => localStorage.setItem('reac_analytics_consent', 'denied'));
  const motion = await motionContext.newPage();
  motion.setDefaultTimeout(15000);
  motion.on('pageerror', error => report.errors.push(error.message));
  await motion.goto(base + '/');
  await motion.waitForFunction(() => document.querySelector('#main-content').dataset.sectionMotionMode === 'active');
  const cost = await motion.evaluate(() => {
    const tweens = gsap.globalTimeline.getChildren(true, true, false).filter(t => t.targets().some(n => n instanceof Element && n.closest('[data-section-motion]:not([data-section-motion="bento-existing"])')));
    return { words: document.querySelectorAll('.reac-motion-word').length, masks: tweens.filter(t => t.vars.clipPath).length, rotations3d: tweens.filter(t => 'rotateX' in t.vars).length };
  });
  assert.deepEqual(cost, { words: 0, masks: 0, rotations3d: 0 });
  report.mobileAnimationCost = cost;
  await motion.locator('#servicios').evaluate(node => scrollTo(0, node.offsetTop - innerHeight / 2));
  await motion.waitForFunction(() => document.querySelector('#servicios').dataset.motionState === 'playing');
  // GSAP timelines are thenable: returning a paused timeline would never resolve.
  await motion.evaluate(() => { gsap.getById('reac-scene-services').pause(); });
  // Toolbar-height change must not rewind the paused timeline.
  const progress = await motion.evaluate(() => gsap.getById('reac-scene-services').progress());
  await motion.setViewportSize({ width: 390, height: 760 });
  await motion.waitForTimeout(300);
  assert.equal(await motion.evaluate(() => gsap.getById('reac-scene-services').progress()), progress);
  // Crossing a breakpoint mid-entry settles already-entered content, not replaying it.
  await motion.setViewportSize({ width: 1024, height: 576 });
  await motion.waitForFunction(() => document.querySelector('#servicios').dataset.motionState === 'complete');
  assert.equal(await motion.evaluate(() => ScrollTrigger.getAll().some(t => t.vars.id === 'reac-section-services')), false);
  assert.ok(await motion.locator('#servicios h2').evaluate(node => Number(getComputedStyle(node).opacity) === 1));
  await motion.setViewportSize({ width: 390, height: 844 });
  await motion.locator('#proyectos').evaluate(node => scrollTo(0, node.offsetTop - innerHeight / 2));
  await motion.emulateMedia({ reducedMotion: 'reduce' });
  await motion.waitForFunction(() => document.querySelector('#main-content').dataset.sectionMotionMode === 'reduced');
  assert.equal(await motion.locator('.reac-motion-pending').count(), 0);
  assert.ok(await motion.locator('[data-section-motion] h2').evaluateAll(nodes => nodes.every(n => Number(getComputedStyle(n).opacity) === 1)));
  report.interactions.push('Toolbar-height resize without rewind, orientation during entry, live reduced-motion cleanup');
  await motion.locator('#servicios').scrollIntoViewIfNeeded();
  await motion.screenshot({ path: `artifacts/ios-${engine}-services.png` });
  await motion.locator('#contacto').scrollIntoViewIfNeeded();
  await motion.screenshot({ path: `artifacts/ios-${engine}-contact.png` });
  await motionContext.close();

  const noJS = await browser.newContext({ ...devices['iPhone 13'], javaScriptEnabled: false });
  const staticPage = await noJS.newPage();
  await staticPage.goto(base + '/');
  assert.ok(await staticPage.locator('[data-section-motion] h2').evaluateAll(nodes => nodes.every(n => Number(getComputedStyle(n).opacity) === 1)));
  await staticPage.locator('.imp-faq summary').first().tap();
  assert.equal(await staticPage.locator('.imp-faq').first().getAttribute('open'), '');
  await noJS.close();
  report.interactions.push('No JavaScript: visible content and native FAQ');
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify({ engine, responsiveChecks: report.responsive.length, interactions: report.interactions, mobileAnimationCost: report.mobileAnimationCost, errors: report.errors }, null, 2));
} catch (error) {
  report.errors.push(error.stack || error.message);
  throw error;
} finally {
  await browser.close();
  writeFileSync(`artifacts/ios-${engine}-report.json`, JSON.stringify(report, null, 2));
}
