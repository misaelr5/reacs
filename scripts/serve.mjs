// Loopback-only preview of built HTML, redirects, security headers and Function.
// This checks local behavior; it does not certify Vercel's deployed configuration.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { handleContact } from '../lib/contact.ts';
const config = JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const root = resolve('dist');
const port = Number(process.env.PORT || 4174);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.pdf':'application/pdf','.woff2':'font/woff2'};
createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + port);
    for(const {source,headers} of config.headers)if(source==='/(.*)')for(const header of headers)res.setHeader(header.key,header.value.replace('; upgrade-insecure-requests',''));
    const pathname=decodeURIComponent(url.pathname);
    if(pathname.startsWith('/api/')) {
      if(pathname!=='/api/contact') {res.writeHead(404);res.end();return;}
      const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
      // Do not rewrite Origin or invent proxy/IP headers; real origin controls apply.
      const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:req,duplex:'half'}:{})});
      const result=await handleContact(request,process.env);
      result.headers.forEach((v,k)=>res.setHeader(k,v));res.statusCode=result.status;res.end(Buffer.from(await result.arrayBuffer()));return;
    }
    const redirect=config.redirects.find(item=>item.source===pathname);
    if(redirect){res.writeHead(308,{Location:redirect.destination+url.search});res.end();return;}
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
    const rewrite=config.rewrites.find(item=>item.source===pathname);
    const editorial=/^\/recursos\/([a-z0-9-]+)$/.test(pathname)?pathname+'.html':null;
    let file=resolve(root,'.'+(rewrite?.destination || editorial || (pathname==='/'?'/index.html':pathname)));
    const inside=file.startsWith(root+ (process.platform==='win32'?'\\':'/'));
    if(!inside||!existsSync(file)||!statSync(file).isFile()){res.statusCode=404;file=resolve(root,'404.html');}
    res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-store');res.end(req.method==='HEAD'?undefined:readFileSync(file));
  } catch {res.statusCode=400;res.end('Solicitud no válida.');}
}).listen(port,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:'+port));
