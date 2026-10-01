import assert from 'node:assert/strict';
import { chromium, webkit, devices } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.TEST_URL || 'http://127.0.0.1:4174';
const engine = process.env.TEST_BROWSER || 'chromium';
const animatedForWidth = width => ['stats', 'services', 'process', 'projects', ...(width > 980 ? ['contact'] : [])];
const browser = engine === 'webkit'
  ? await webkit.launch({ headless: true, ...(process.env.WEBKIT_EXECUTABLE ? { executablePath: process.env.WEBKIT_EXECUTABLE } : {}) })
  : await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
try {
  await Promise.all([390, 1440].map(async width => {
    const context = await browser.newContext({ ...(width === 390 ? devices['iPhone 13'] : {}), viewport: { width, height: 844 }, reducedMotion: 'no-preference' });
    await context.addInitScript(() => localStorage.setItem('reac_analytics_consent', 'denied'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/');
    await page.waitForFunction(() => document.querySelector('#main-content').dataset.sectionMotionMode === 'active');
    const result = await page.evaluate(async () => {
      // Sample computed styles at normal speed, including staggered children.
      // A timer also samples Windows WebKit when its headless rAF is throttled.
      // A final-state assertion alone cannot detect visible -> hidden -> visible flashes.
      const targets = new Set();
      const audit = { samples: 0, drops: [], starts: {}, overflow: false, normalSpeed: gsap.globalTimeline.timeScale() };
      const timelines = ScrollTrigger.getAll().filter(trigger => trigger.vars.id?.startsWith('reac-section-'));
      for (const trigger of timelines) {
        gsap.getById(trigger.vars.id.replace('reac-section-', 'reac-scene-')).getChildren(true, true, false).forEach(tween => {
          tween.targets().forEach(node => { if (node instanceof Element) targets.add(node); });
        });
      }
      gsap.globalTimeline.getChildren(true, true, false).forEach(tween => {
        tween.targets().forEach(node => {
          if (node instanceof Element && node.closest('[data-section-motion="bento-existing"]')) targets.add(node);
        });
      });
      const states = new Map();
      const observer = new MutationObserver(records => records.forEach(record => {
        const section = record.target;
        const state = section.dataset.motionState;
        if (state === 'playing' && states.get(section) !== state) {
          const name = section.dataset.sectionMotion;
          audit.starts[name] = (audit.starts[name] || 0) + 1;
        }
        states.set(section, state);
      }));
      document.querySelectorAll('[data-section-motion]').forEach(section => {
        observer.observe(section, { attributes: true, attributeFilter: ['data-motion-state'] });
      });
      const previous = new Map();
      const previousInline = new Map();
      const startedAt = performance.now();
      let stage = 'initial';
      let frame;
      const essentialSelectors = '[data-section-motion="stats"] .rv-left, [data-section-motion="services"] > div > .reveal:first-child, [data-section-motion="process"] > .reveal, [data-section-motion="projects"] > div:last-child > .reveal:first-child, [data-section-motion="contact"] .ct-panel';
      const effectiveOpacity = node => {
        let opacity = 1;
        for (let current = node; current instanceof Element; current = current.parentElement) opacity *= Number(getComputedStyle(current).opacity);
        return opacity;
      };
      audit.essentialMinimumOpacity = Math.min(...[...document.querySelectorAll(essentialSelectors)].map(effectiveOpacity));
      function sample() {
        audit.samples++;
        audit.overflow ||= document.documentElement.scrollWidth > innerWidth;
        for (const node of targets) {
          if (!node.getClientRects().length) continue;
          const opacity = Number(getComputedStyle(node).opacity);
          const before = previous.get(node);
          if (before !== undefined && opacity < before - .06) audit.drops.push({
            section: node.closest('[data-section-motion]')?.dataset.sectionMotion,
            node: node.className, before, opacity, at: performance.now() - startedAt, stage,
            inlineBefore: previousInline.get(node), inlineAfter: node.style.opacity
          });
          previous.set(node, opacity);
          previousInline.set(node, node.style.opacity);
        }
        frame = setTimeout(sample, 16);
      }
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      // Exercise the same recalculation that load/resize performs before scroll.
      ScrollTrigger.refresh();
      sample();
      for (const section of document.querySelectorAll('[data-section-motion]')) {
        stage = section.dataset.sectionMotion;
        const top = section.offsetTop - innerHeight * .92;
        scrollTo({ top, behavior: 'instant' });
        await wait(60);
        for (let step = 1; step <= 8; step++) {
          scrollTo({ top: top + step * 24, behavior: 'instant' });
          await wait(30);
        }
        // Refresh during playback as well, without recreating or replaying it.
        ScrollTrigger.refresh();
        await wait(1400);
      }
      // Passing through the same sections again must not hide their content.
      scrollTo({ top: 0, behavior: 'instant' });
      await wait(100);
      scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      await wait(300);
      clearTimeout(frame);
      observer.disconnect();
      return audit;
    });
    report.push({ engine, width, errors, ...result });
    await context.close();
  }));
  for (const result of report) {
    assert.equal(result.normalSpeed, 1, 'Continuity must be checked at real playback speed');
    assert.ok(result.samples > 100, 'Insufficient frame samples');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.drops, [], `Visible content disappeared mid-entry at ${result.width}px`);
    assert.equal(result.overflow, false);
    assert.equal(Object.keys(result.starts).length, animatedForWidth(result.width).length);
    assert.ok(Object.values(result.starts).every(count => count === 1), 'A section replayed');
    if (result.width === 390) assert.ok(result.essentialMinimumOpacity > .99, 'Essential mobile content started hidden');
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  mkdirSync('artifacts', { recursive: true });
  writeFileSync(`artifacts/section-motion-continuity-${engine}-report.json`, JSON.stringify(report, null, 2));
}
