import { readFileSync } from 'node:fs';
import { site } from '../site.config.mjs';
const key=process.env.INDEXNOW_KEY||site.indexNowKey;
if(!key||!/^[a-fA-F0-9]{8,128}$/.test(key))throw new Error('Set a stable INDEXNOW_KEY (8-128 hex characters), build and publish its file first.');
const changed=process.argv.slice(2).filter(arg=>arg!=='--submit');
if(!changed.length)throw new Error('Pass only created, changed or deleted paths, e.g. npm run indexnow -- /desarrollo-web');
const urls=changed.map(path=>{const url=new URL(path,site.url);if(url.origin!==site.url||!path.startsWith('/')||url.hash)throw new Error('Paths must belong to SITE_URL and have no fragment');return url.href;});
const payload={host:new URL(site.url).host,key,keyLocation:site.url+'/'+key+'.txt',urlList:[...new Set(urls)]};
if(payload.urlList.length>10000)throw new Error('Maximum 10,000 URLs per request');
if(!process.argv.includes('--submit')){console.log(JSON.stringify(payload,null,2));console.log('Dry run. Add --submit after reviewing and publishing the ownership file.');process.exit(0);}
const proof=await fetch(payload.keyLocation,{signal:AbortSignal.timeout(10000),redirect:'error'});
if(!proof.ok||(await proof.text()).trim()!==key)throw new Error('Published ownership file does not match; no submission made.');
const result=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
if(![200,202].includes(result.status))throw new Error('IndexNow rejected the submission: HTTP '+result.status);
console.log('IndexNow accepted '+payload.urlList.length+' URLs (HTTP '+result.status+'). Acceptance is not an indexing guarantee.');
