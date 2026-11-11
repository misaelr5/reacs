import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const base = process.env.TEST_URL || 'http://127.0.0.1:4174';
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  for (const reducedMotion of ['reduce','no-preference']) {
    const context = await browser.newContext({reducedMotion});
    await context.addInitScript(() => localStorage.setItem('reac_analytics_consent','denied'));
    const page = await context.newPage();
    await page.goto(base);
    for (const width of [320,390,768,1024,1440]) {
      await page.setViewportSize({width,height:900});
      for (const selector of ['.pjl-beam--lead .pjl-label','.pj-cta','.team-name','.ct-direct__channel--primary']) {
        const target = page.locator(selector).first();
        await target.evaluate(node => node.scrollIntoView({block:'center',behavior:'instant'}));
        const state = await target.evaluate(node => {
          const r = node.getBoundingClientRect();
          const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return {inMain:document.querySelector('main').contains(node),unobstructed:node.contains(top),
            obscuredByFooter:!!top?.closest('.home-footer'),viewport:innerWidth,page:document.documentElement.scrollWidth};
        });
        assert.equal(state.inMain,true,`${selector} outside main`);
        assert.equal(state.obscuredByFooter,false,`${selector} covered by footer at ${width}`);
        assert.equal(state.unobstructed,true,`${selector} obstructed at ${width}`);
        assert.ok(state.page <= state.viewport,`Page overflow at ${width}`);
      }
      assert.equal(await page.locator('[data-rwf-panel]').count(),0);

    }
    await context.close();
  }
  console.log('Lower layout passed: process, team and contact unobstructed; removed dashboard absent; 5 widths and both motion preferences.');
} finally { await browser.close(); }
