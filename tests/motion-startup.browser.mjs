import assert from 'node:assert/strict';
import {chromium,firefox} from 'playwright-core';

const base=process.env.TEST_URL||'http://127.0.0.1:4174';
const engines=(process.env.TEST_BROWSERS||'chromium').split(',');
for(const engine of engines){
  const browser=await (engine==='firefox'?firefox:chromium).launch({headless:true,
    ...(engine==='chromium'?{channel:'chrome'}:process.env.FIREFOX_EXECUTABLE?{executablePath:process.env.FIREFOX_EXECUTABLE}:{})});
  try {
    const context=await browser.newContext({viewport:{width:1885,height:1000},reducedMotion:'no-preference'});
    await context.addInitScript(()=>{
      sessionStorage.setItem('reac_intro_seen','1');localStorage.setItem('reac_analytics_consent','denied');
      window.titleEntrances=[];
      new MutationObserver(records=>{
        for(const {target} of records)if(target.matches?.('[data-title-playing]'))window.titleEntrances.push(target.dataset.titleFx);
      }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-title-playing']});
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base);await page.waitForLoadState('networkidle');
    assert.ok(await page.locator('.tfx-pending').count()>=6,engine+': headings never armed their entrances');
    const initial=await page.locator('.p-hero__word.is-current').textContent();
    await page.waitForFunction(text=>document.querySelector('.p-hero__word.is-current')?.textContent!==text,initial,{timeout:10000});
    await page.waitForFunction(()=>document.querySelectorAll('.p-hero__word.is-current').length===1);
    for(const title of await page.locator('[data-title-fx]').all()){
      const effect=await title.getAttribute('data-title-fx');
      await title.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
      await page.waitForFunction(fx=>window.titleEntrances.includes(fx),effect,{timeout:5000});
    }
    assert.deepEqual(errors,[],engine);
    await context.close();
    // CSS must center the visible phrase even if scripts are disabled or fail to load.
    const fallback=await browser.newContext({javaScriptEnabled:false});
    const staticPage=await fallback.newPage();
    for(const width of [390,1440,1885]){
      await staticPage.setViewportSize({width,height:1000});await staticPage.goto(base);
      await staticPage.waitForLoadState('networkidle');
      const offset=await staticPage.evaluate(()=>{
        const root=document.querySelector('[data-hero-words]'),range=document.createRange();
        range.selectNodeContents(root.querySelector('.is-current'));
        return (root.previousElementSibling.getBoundingClientRect().left+range.getBoundingClientRect().right)/2-innerWidth/2;
      });
      assert.ok(Math.abs(offset)<8,`${engine}: fallback off center by ${offset}px at ${width}`);
    }
    await fallback.close();
    console.log(`${engine}: hero rotates; all 8 section-title entrances execute; no-JS phrase centered at 3 widths.`);
  } finally {await browser.close();}
}
