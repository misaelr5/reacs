import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env.TEST_URL || 'http://127.0.0.1:4174';
const viewports = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 }
];
const coreAnimated = ['stats', 'services', 'process', 'projects'];
const inventory = ['stats', 'services', 'bento-existing', 'process', 'projects', 'contact'];
const animatedForWidth = width => [...coreAnimated, ...(width > 980 ? ['contact'] : [])];
const productionReveal = {
  team: '#sobre-reac',
  faq: '#faq',
  resources: '#recursos'
};
const report = { viewports: [], reduced: [], interactions: [], errors: [] };
mkdirSync('artifacts', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: 'no-preference', hasTouch: viewport.width <= 768 });
    await context.addInitScript(() => localStorage.setItem('reac_analytics_consent', 'denied'));
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(`${viewport.width}: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') report.errors.push(`${viewport.width}: ${message.text()}`); });
    await page.goto(base + '/');
    await page.waitForFunction(() => Boolean(window.gsap && window.ScrollTrigger));
    await page.evaluate(() => { window.gsap.globalTimeline.timeScale(14); });
    const animated = animatedForWidth(viewport.width);

    assert.equal(await page.locator('#hero-sec[data-section-motion]').count(), 0, 'Hero must stay outside the new motion scope');
    assert.equal(await page.locator('[data-screen-label="Footer"][data-section-motion]').count(), 0, 'Footer must stay outside the new motion scope');
    assert.deepEqual(await page.locator('[data-section-motion]').evaluateAll(nodes => nodes.map(node => node.dataset.sectionMotion)), inventory);
    for (const name of Object.keys(productionReveal)) assert.equal(await page.locator(`[data-section-motion="${name}"]`).count(), 0, `${name} must use the production reveal`);
    assert.equal(await page.locator('.reac-motion-word').count(), 0, 'Word-by-word heading reveal must be removed');
    const initialTriggers = await page.evaluate(() => window.ScrollTrigger.getAll().map(trigger => trigger.vars.id).filter(id => id?.startsWith('reac-section-')));
    assert.equal(initialTriggers.length, animated.length, `Expected one trigger per animated section at ${viewport.width}`);
    assert.equal(new Set(initialTriggers).size, initialTriggers.length, `Duplicate ScrollTriggers at ${viewport.width}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Initial overflow at ${viewport.width}`);

    if (viewport.width <= 768) {
      assert.equal(await page.locator('[data-section-motion="contact"]').getAttribute('data-motion-state'), 'static');
      const essentialVisible = await page.locator('[data-section-motion="stats"] .rv-left, [data-section-motion="services"] > div > .reveal:first-child, [data-section-motion="process"] > .reveal, [data-section-motion="projects"] > div:last-child > .reveal:first-child, [data-section-motion="contact"] .ct-panel').evaluateAll(nodes => nodes.every(node => {
        let opacity = 1;
        for (let current = node; current instanceof Element; current = current.parentElement) opacity *= Number(getComputedStyle(current).opacity);
        return opacity > .99 && node.getClientRects().length > 0;
      }));
      assert.equal(essentialVisible, true, `Essential mobile text hidden at ${viewport.width}`);
    }

    for (const name of animated) {
      const section = page.locator(`[data-section-motion="${name}"]`);
      await section.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForFunction(sectionName => document.querySelector(`[data-section-motion="${sectionName}"]`)?.dataset.motionState === 'complete', name);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} overflow at ${viewport.width}`);
      const visible = await section.locator('h2').first().evaluate(node => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return Number(style.opacity) > .99 && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      });
      assert.equal(visible, true, `${name} heading hidden after animation at ${viewport.width}`);
    }

    for (const [name, selector] of Object.entries(productionReveal)) {
      const reveal = page.locator(`${selector} .reveal`).first();
      await reveal.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForFunction(sectionSelector => {
        const node = document.querySelector(`${sectionSelector} .reveal`);
        return node && (!node.classList.contains('reveal-ready') || (node.classList.contains('is-in') && Number(getComputedStyle(node).opacity) > .99));
      }, selector);
      assert.ok(await reveal.evaluate(node => Number(getComputedStyle(node).opacity) > .99), `${name} production reveal remained hidden at ${viewport.width}`);
    }

    const bento = page.locator('[data-section-motion="bento-existing"]');
    await bento.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => [...document.querySelectorAll('.bento-showcase .ib-bento-card')].every(node => !node.style.opacity && !node.style.transform));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Final overflow at ${viewport.width}`);
    assert.equal(await page.locator('[data-section-motion] [style*="will-change"]').count(), 0, `will-change leaked at ${viewport.width}`);
    assert.equal(await page.evaluate(() => window.ScrollTrigger.getAll().filter(trigger => trigger.vars.id?.startsWith('reac-section-')).length), 0, `Completed triggers were not released at ${viewport.width}`);
    report.viewports.push({ ...viewport, scenes: animated.length, scopedSections: inventory.length, overflow: false, duplicateTriggers: false });

    if (viewport.width === 390 || viewport.width === 1440) {
      await page.screenshot({ path: `artifacts/section-motion-${viewport.width}.png`, fullPage: true });
    }
    await context.close();
  }

  const reducedContext = await browser.newContext({ viewport: viewports[0], reducedMotion: 'reduce' });
  await reducedContext.addInitScript(() => localStorage.setItem('reac_analytics_consent', 'denied'));
  const reducedPage = await reducedContext.newPage();
  reducedPage.on('pageerror', error => report.errors.push(`reduced: ${error.message}`));
  await reducedPage.goto(base + '/');
  await reducedPage.waitForFunction(() => document.querySelector('#main-content')?.dataset.sectionMotionMode === 'reduced');
  for (const viewport of viewports) {
    await reducedPage.setViewportSize(viewport);
    assert.equal(await reducedPage.evaluate(() => window.ScrollTrigger.getAll().filter(trigger => trigger.vars.id?.startsWith('reac-section-')).length), 0);
    assert.ok(await reducedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Reduced-motion overflow at ${viewport.width}`);
    assert.equal(await reducedPage.locator('[data-section-motion] h2').evaluateAll(nodes => nodes.every(node => Number(getComputedStyle(node).opacity) > .99 && node.getClientRects().length)), true);
    report.reduced.push({ ...viewport, triggers: 0, contentVisible: true });
  }
  await reducedContext.close();

  const interactionContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await interactionContext.addInitScript(() => localStorage.setItem('reac_analytics_consent', 'denied'));
  const page = await interactionContext.newPage();
  page.on('pageerror', error => report.errors.push(`interaction: ${error.message}`));
  await page.goto(base + '/');
  await page.waitForFunction(() => Boolean(window.ScrollTrigger));
  await page.evaluate(() => { window.gsap.globalTimeline.timeScale(14); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(80);
  let ids = await page.evaluate(() => window.ScrollTrigger.getAll().map(trigger => trigger.vars.id).filter(id => id?.startsWith('reac-section-')));
  assert.equal(ids.length, animatedForWidth(390).length);
  assert.equal(new Set(ids).size, ids.length, 'Resize duplicated ScrollTriggers');
  assert.equal(await page.locator('[data-section-motion="contact"]').getAttribute('data-motion-state'), 'static');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(80);
  ids = await page.evaluate(() => window.ScrollTrigger.getAll().map(trigger => trigger.vars.id).filter(id => id?.startsWith('reac-section-')));
  assert.equal(ids.length, animatedForWidth(768).length);
  assert.equal(new Set(ids).size, ids.length, 'Second resize duplicated ScrollTriggers');
  report.interactions.push('desktop-mobile-tablet resize without duplicate triggers');

  await page.locator('[data-section-motion="projects"]').evaluate(node => window.scrollTo({ top: node.offsetTop + 120, behavior: 'instant' }));
  await page.reload();
  await page.waitForFunction(() => Boolean(window.ScrollTrigger));
  await page.evaluate(() => { window.gsap.globalTimeline.timeScale(14); });
  await page.waitForFunction(() => document.querySelector('[data-section-motion="projects"]')?.dataset.motionState === 'complete');
  assert.equal(await page.locator('[data-section-motion="projects"] h2').first().isVisible(), true, 'Mid-page refresh hid projects');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(100);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(100);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  report.interactions.push('mid-page refresh', 'fast down/up scroll');

  await page.setViewportSize({ width: 390, height: 844 });
  for (let index = 0; index < 18; index++) await page.mouse.wheel(0, 260);
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.activeElement instanceof HTMLElement));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  report.interactions.push('mobile wheel/touch-sized scroll and keyboard focus');
  await interactionContext.close();

  const fallbackContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await fallbackContext.route('**/gsap.min.js', route => route.abort());
  await fallbackContext.route('**/ScrollTrigger.min.js', route => route.abort());
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.goto(base + '/');
  assert.equal(await fallbackPage.locator('[data-section-motion] h2').evaluateAll(nodes => nodes.every(node => node.getClientRects().length && Number(getComputedStyle(node).opacity) > .99)), true);
  assert.ok(await fallbackPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  report.interactions.push('missing GSAP/ScrollTrigger progressive fallback');
  await fallbackContext.close();

  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  writeFileSync('artifacts/section-motion-report.json', JSON.stringify(report, null, 2));
}
