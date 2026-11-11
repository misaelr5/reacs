import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';

const base=process.env.TEST_URL||'http://127.0.0.1:4174';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  for(const mode of ['normal','reduced','blocked-loader']) {
    const context=await browser.newContext({reducedMotion:mode==='reduced'?'reduce':'no-preference'});
    await context.addInitScript(()=>localStorage.setItem('reac_analytics_consent','denied'));
    if(mode==='blocked-loader')await context.route(/\/js\/loader\.[^/]+\.js$/,route=>route.abort());
    const page=await context.newPage();
    const errors=[];
    const fields=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(/\/loader-field[.-]/.test(request.url()))fields.push(request.url());});
    await page.goto(base+'/servicios');
    await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-intro'),null,{timeout:18000});
    await page.waitForFunction(()=>{
      const title=document.querySelector('h1');
      return title&&Number(getComputedStyle(title).opacity)===1&&[...title.children].every(node=>Number(getComputedStyle(node).opacity)===1);
    });
    assert.equal(await page.locator('.rl').count(),0,mode+': loader remains');
    assert.equal(await page.locator('h1').textContent(),'Servicios para conectar tu ecosistema digital');
    const firstFields=fields.length;
    await page.reload();
    assert.equal(await page.locator('html[data-intro]').count(),0,mode+': intro repeats');
    assert.equal(fields.length,firstFields,mode+': WebGL requested again');
    if(mode!=='normal')assert.equal(fields.length,0,mode+': unnecessary WebGL request');
    assert.deepEqual(errors,[],mode);
    await context.close();
  }
  console.log('Loading passed: first visit, repeat visit, reduced motion and blocked loader leave readable content without overlays.');
} finally {await browser.close();}
