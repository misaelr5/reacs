import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';
const pages=JSON.parse(readFileSync('artifacts/build-manifest.json','utf8')).pages.map(p=>p.path||p.file);
const extra=['/recursos/auditoria-sitio-web.html','/recursos/auditoria-google-ads.html','/gracias','/politica-de-privacidad','/404.html'];
const b=await chromium.launch({channel:'chrome',headless:true});
const c=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
for(const path of [...new Set([...pages,...extra])]){const p=await c.newPage();try{await p.goto('http://127.0.0.1:4174'+path);await p.waitForTimeout(500);
const r=await p.evaluate(()=>{const hits={};let links=0;for(const n of document.querySelectorAll('body *')){if(n.tagName==='A')links++;const s=getComputedStyle(n);const own=s.textDecorationLine.includes('underline');const bb=n.tagName==='A'&&parseFloat(s.borderBottomWidth)>0&&s.display.startsWith('inline')&&!n.className;if(!own&&!bb)continue;if(!n.textContent.trim())continue;const key=(n.closest('a')?'a ':'')+n.tagName.toLowerCase()+(n.className&&typeof n.className==='string'?'.'+n.className.split(' ')[0]:'')+(bb?' [border]':'');hits[key]=(hits[key]||0)+1;}
const tok=[...document.styleSheets].some(s=>(s.href||'').includes('tokens.css'));return {links,tok,hits}});
console.log(path,'links='+r.links,'tokens='+r.tok,JSON.stringify(r.hits));}catch(e){console.log(path,'ERR',e.message.slice(0,80))}await p.close();}
await b.close();
