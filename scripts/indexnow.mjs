import { readFileSync } from 'node:fs';
import { site } from '../site.config.mjs';
const key=process.env.INDEXNOW_KEY||site.indexNowKey;
if(!key||!/^[a-fA-F0-9]{8,128}$/.test(key))throw new Error('Set a stable INDEXNOW_KEY (8-128 hex characters), build and publish its file first.');
const args=process.argv.slice(2);
const deleted=args.filter(arg=>arg.startsWith('--deleted=')).map(arg=>arg.slice('--deleted='.length));
const changed=args.filter(arg=>arg!=='--submit' && !arg.startsWith('--deleted='));
changed.push(...deleted);
if(!changed.length)throw new Error('Pass only created, changed or deleted paths, e.g. npm run indexnow -- /desarrollo-web');
const manifest=JSON.parse(readFileSync(new URL('../artifacts/build-manifest.json',import.meta.url),'utf8'));
if(manifest.siteUrl!==site.url)throw new Error('Build manifest origin differs from SITE_URL. Build again first.');
const publicPaths=new Set(manifest.pages.filter(page=>page.indexable).map(page=>page.path));
const urls=changed.map(path=>{
  const url=new URL(path,site.url);
  if(!/^\/(?:[a-z0-9]+(?:[./-][a-z0-9]+)*)?$/.test(path)||url.origin!==site.url||url.pathname!==path||url.search||url.hash||/^\/(?:api|admin|dashboard|internal|preview|staging)(?:[/.\-]|$)/.test(path))throw new Error('Only clean public canonical paths are allowed.');
  if(deleted.includes(path)) {
    if(manifest.pages.some(page=>page.path===path))throw new Error('Deleted URL still exists in the build.');
  } else if(!publicPaths.has(path))throw new Error('URL is not indexable in the build. Use --deleted=/path only for a removed public page.');
  return url.href;
});
const payload={host:new URL(site.url).host,key,keyLocation:site.url+'/'+key+'.txt',urlList:[...new Set(urls)]};
if(payload.urlList.length>10000)throw new Error('Maximum 10,000 URLs per request');
if(!process.argv.includes('--submit')){console.log(JSON.stringify(payload,null,2));console.log('Dry run. Add --submit after reviewing and publishing the ownership file.');process.exit(0);}
const proof=await fetch(payload.keyLocation,{signal:AbortSignal.timeout(10000),redirect:'error'});
if(!proof.ok||(await proof.text()).trim()!==key)throw new Error('Published ownership file does not match; no submission made.');
for(const address of payload.urlList) {
  const response=await fetch(address,{method:'HEAD',signal:AbortSignal.timeout(10000),redirect:'manual'});
  const removed=deleted.includes(new URL(address).pathname);
  if(removed ? ![404,410].includes(response.status) : response.status!==200 || /noindex/i.test(response.headers.get('x-robots-tag')||''))throw new Error('Published URL status does not match its change: '+address);
}
const result=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
if(![200,202].includes(result.status))throw new Error('IndexNow rejected the submission: HTTP '+result.status);
console.log('IndexNow accepted '+payload.urlList.length+' URLs (HTTP '+result.status+'). Acceptance is not an indexing guarantee.');
