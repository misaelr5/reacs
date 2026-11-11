import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.TEST_URL || 'http://127.0.0.1:4174';
const browser = await chromium.launch({channel:'chrome', headless:true});
mkdirSync('artifacts', {recursive:true});
try {
  const context = await browser.newContext({viewport:{width:1440,height:1100}});
  await context.addInitScript(() => localStorage.setItem('reac_analytics_consent','denied'));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  const words = page.locator('.p-hero__word');
  const initial = await page.locator('.p-hero__word.is-current').textContent();
  await page.waitForFunction(() => document.querySelector('.p-hero__word.is-current')?.textContent === 'Software a medida', null, {timeout:10000});
  assert.equal(await page.locator('[data-hero-motion]').count(), 0);
  await page.waitForTimeout(1500);
  assert.equal(await words.count(), 6);
  assert.equal(await page.locator('#hero-sec [data-dock]').count(), 0);
  assert.equal(await page.locator('.home-footer [data-dock] .p-dock__item').count(), 3);
  assert.equal(await page.locator('.p-hero__avatars').count(), 0);
  assert.equal(await page.locator('.p-hero__proof-stars').getAttribute('aria-hidden'), 'true');
  assert.equal(await page.locator('.p-hero__proof').getAttribute('href'), '#testimonios');
  for (const button of await page.locator('.p-hero__btn').all()) {
    assert.equal(await button.evaluate(node => getComputedStyle(node).textDecorationLine), 'none');
  }
  assert.equal(await words.first().evaluate(node => getComputedStyle(node).textTransform), 'none');
  const atmosphere = page.locator('#hero-sec [data-hero-atmosphere]');
  assert.equal(await atmosphere.getAttribute('aria-hidden'), 'true');
  assert.equal(await atmosphere.evaluate(node => node.style.getPropertyValue('--hero-p')), '0.000');
  await page.evaluate(() => scrollTo({top:innerHeight / 2,behavior:'instant'}));
  await page.waitForTimeout(100);
  assert.ok(Number(await atmosphere.evaluate(node => node.style.getPropertyValue('--hero-p'))) > 0, 'Atmosphere follows scroll');
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    await page.waitForTimeout(300);
  }
  const icon = page.locator('.p-dock__item').first();
  await icon.hover();
  await page.waitForTimeout(250);
  assert.ok(await icon.evaluate(node => node.getBoundingClientRect().width) > 46, 'Footer dock magnifies');
  await page.mouse.move(0,0);
  await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(200);
  const staticWord = await page.locator('.p-hero__word.is-current').textContent();
  await page.waitForTimeout(4200);
  assert.equal(await page.locator('.p-hero__word.is-current').textContent(), staticWord);
  for (const width of [320,375,390,620,768,980,1024,1440]) {
    await page.setViewportSize({width,height:1100});
    await page.waitForTimeout(850);
    const bounds = await page.evaluate(() => {
      const root = document.querySelector('[data-hero-words]');
      const title = document.querySelector('.p-hero__title');
      const first = title.querySelector('.p-hero__line');
      const second = title.querySelector('.p-hero__service-line');
      const range = document.createRange(); range.selectNodeContents(first);
      return {viewport:innerWidth, page:document.documentElement.scrollWidth,
        available:second.clientWidth - second.firstElementChild.getBoundingClientRect().width - parseFloat(getComputedStyle(second).columnGap) - parseFloat(getComputedStyle(root).paddingRight) - parseFloat(getComputedStyle(root).paddingLeft),
        firstWidth:range.getBoundingClientRect().width, titleWidth:title.clientWidth,
        firstBottom:first.getBoundingClientRect().bottom, secondTop:second.getBoundingClientRect().top,
        center:title.getBoundingClientRect().x + title.clientWidth / 2,
        words:[...root.children].map(word => {
          const range = document.createRange(); range.selectNodeContents(word);
          return {text:word.textContent, width:range.getBoundingClientRect().width};
        })};
    });
    assert.ok(bounds.page <= width, `Page overflow at ${width}`);
    assert.ok(bounds.firstWidth <= bounds.titleWidth, `First line clipped at ${width}`);
    assert.ok(bounds.secondTop >= bounds.firstBottom - 2, `Title lines overlap at ${width}`);
    assert.ok(Math.abs(bounds.center - width / 2) < 2, `Title not centered at ${width}`);
    for (const word of bounds.words) assert.ok(word.width <= bounds.available, `${word.text} clipped at ${width}: ${word.width}/${bounds.available}`);
    if ([390,1440].includes(width)) await page.screenshot({path:`artifacts/hero-${width}.png`});
  }
  const axe = await new AxeBuilder({page}).include('#hero-sec').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  assert.deepEqual(axe.violations.map(v => ({id:v.id,nodes:v.nodes.map(n => n.target)})), []);
  const noJS = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const staticPage = await noJS.newPage(); await staticPage.goto(base);
  assert.equal(await staticPage.locator('.p-hero__word.is-current').textContent(), initial);
  assert.equal(await staticPage.locator('[data-hero-motion]').count(), 0);
  assert.equal(await staticPage.locator('.p-hero__avatars').count(), 0);
  assert.equal(await staticPage.locator('.p-hero__proof').getAttribute('href'), '#testimonios');
  await noJS.close();
  assert.deepEqual(errors, []);
  console.log('Hero passed: two centered lines, sentence-case neon rotation, footer dock, scroll-linked atmosphere, reduced motion, 8 widths, Axe and no JavaScript.');
} finally {
  await browser.close();
}
