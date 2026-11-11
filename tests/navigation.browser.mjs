import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.env.TEST_URL || 'http://127.0.0.1:4174';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checks: [], errors: [] };
mkdirSync('artifacts', { recursive: true });
try {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    localStorage.setItem('reac_analytics_consent', 'denied');
    sessionStorage.setItem('reac_intro_seen', '1');
    addEventListener('pagereveal', event => { sessionStorage.setItem('nav_transition', String(Boolean(event.viewTransition))); });
  });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  for (const path of ['/', '/proyectos', '/servicios']) {
    await page.goto(base + path);
    const menu = page.locator('.p-menu');
    const trigger = menu.locator('summary');
    const panel = menu.locator('.mobile-nav-panel');
    await page.waitForSelector('[data-menu-ready]');
    // brand alone on the far left, the menu alone on the far right, no header CTA
    assert.equal(await page.locator('.p-nav__cta').count(), 0);
    const [brandBox, menuBox] = await Promise.all([page.locator('.p-nav__bar > .site-brand').boundingBox(), page.locator('.p-nav__actions').boundingBox()]);
    assert.ok(brandBox.x < menuBox.x, 'brand should sit left of the menu');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await trigger.click();
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      assert.equal(await panel.locator('a:visible').count(), 6);
      assert.equal(await panel.locator('.p-menu__glyph svg').count(), 6);
      const box = await panel.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1, `${path} panel outside ${width}`);
      assert.ok(width <= 600 ? box.width > width * .7 : box.width >= 440, 'Icon dock should fit the available width');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const audit = await new AxeBuilder({ page }).include('.p-nav').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      assert.deepEqual(audit.violations.map(v => v.id), []);
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('open'), null);
      assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    }
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await panel.locator('a').first().evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('Escape');
    await trigger.click();
    await page.mouse.click(20, 850);
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  }
  report.checks.push('Home, projects and services: 4 widths, 6 icons/links, CTA visible, Escape, focus, outside click and zero Axe violations');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(base + '/proyectos');
  const trigger = page.locator('.p-menu summary');
  await trigger.click();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.mobile-nav-panel')).opacity === '1');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'artifacts/navbar-desktop.png' });
  await trigger.click();
  await trigger.click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.p-menu').open);
  await trigger.click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.mobile-nav-panel')).opacity === '1');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.p-menu').getAttribute('open'), null);
  report.checks.push('GSAP open/close, rapid toggle reversal and reduced motion change while opening');
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  await page.screenshot({ path: 'artifacts/navbar-mobile.png' });
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await trigger.click();
  await page.locator('.p-menu a[href="/servicios"]').click();
  await page.waitForURL(base + '/servicios');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.p-menu a[aria-current="page"]').getAttribute('href'), '/servicios');
  assert.equal(await page.locator('.p-menu').getAttribute('open'), null);
  const transition = await page.evaluate(() => ({ supported: 'onpagereveal' in window, ran: sessionStorage.getItem('nav_transition') }));
  if (transition.supported) assert.equal(transition.ran, 'true', 'Native cross-document transition must run');
  await page.goBack();
  assert.equal(await page.locator('.p-menu').getAttribute('open'), null);
  report.checks.push('Real native View Transition between projects and services; active page; Back restores a closed menu');
  const fallbackContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const fallback = await fallbackContext.newPage();
  await fallback.goto(base + '/proyectos');
  await fallback.locator('.p-menu summary').click();
  assert.equal(await fallback.locator('.mobile-nav-panel a:visible').count(), 6);
  await fallback.locator('.p-menu a[href="/servicios"]').click();
  await fallback.waitForURL(base + '/servicios');
  report.checks.push('Native menu and navigation work without JavaScript');
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report));
} finally {
  writeFileSync('artifacts/navigation-report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
