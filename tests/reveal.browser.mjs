import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const base=process.env.TEST_URL||'http://127.0.0.1:4174';
const browser=await chromium.launch({channel:'chrome',headless:true});
// Inline styles a pending or unfinished entrance leaves behind. The closed mobile menu is GSAP-owned, and
// marquee tracks keep a running transform, so transforms are not checked.
const leftovers=()=>[...document.querySelectorAll('main *, footer *')].filter(node=>!node.closest('.mobile-nav-panel')&&
  ((node.style.opacity&&Number(node.style.opacity)<1)||node.style.clipPath||node.style.filter)).map(node=>node.tagName+'.'+String(node.className.baseVal??node.className).split(' ')[0]);
try {
  for(const reducedMotion of ['no-preference','reduce']) for(const width of [320,1440]) {
    const context=await browser.newContext({reducedMotion,viewport:{width,height:800}});
    await context.addInitScript(()=>{sessionStorage.setItem('reac_intro_seen','1');localStorage.setItem('reac_analytics_consent','denied');});
    for(const path of ['/','/servicios','/proyectos/travel-days','/recursos/auditoria-sitio-web']) {
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(base+path);
      await page.waitForLoadState('networkidle');
      if(reducedMotion==='reduce')assert.deepEqual(await page.evaluate(leftovers),[],`${path}: content held back with reduced motion`);
      const height=await page.evaluate(()=>document.documentElement.scrollHeight);
      for(let y=0;y<height;y+=500) {
        await page.evaluate(top=>scrollTo({top,behavior:'instant'}),y);
        await page.waitForTimeout(120);
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
        assert.ok(overflow<=0,`${path}: sideways overflow at ${width}px, scroll ${y}`);
      }
      await page.waitForTimeout(1800);
      assert.deepEqual(await page.evaluate(leftovers),[],`${path}: entrance left content hidden at ${width}px`);
      // Marquee clones must never inherit a hidden pre-state.
      assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.p-marquee img')].filter(img=>img.style.opacity==='0').length),0,`${path}: hidden marquee logos`);
      assert.deepEqual(errors,[],path);
      await page.close();
    }
    await context.close();
  }
  // A fragment link straight into held-back content shows it at once.
  const context=await browser.newContext({viewport:{width:1440,height:800}});
  await context.addInitScript(()=>sessionStorage.setItem('reac_intro_seen','1'));
  const page=await context.newPage();
  await page.goto(base+'/#faq');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1600);
  assert.equal(await page.locator('#faq .faq-item').first().evaluate(node=>getComputedStyle(node).opacity),'1');
  await context.close();
  console.log('Reveal passed: scroll entrances on 4 page types, 2 widths, no sideways overflow, nothing left hidden, reduced motion untouched, fragment links.');
} finally {await browser.close();}
