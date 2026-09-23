import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync, rmSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { site } from '../site.config.mjs';
import { services } from '../content/services.mjs';
import { articles } from '../content/editorial.mjs';
import { parse, parseFragment, serialize, serializeOuter, attr, setAttr, find, all, hasClass, textContent, remove, append, escape as e } from './html.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
if (output !== resolve(root, 'dist') || relative(root, output) !== 'dist') throw new Error('Invalid output directory');
if (existsSync(output)) {
  if (lstatSync(output).isSymbolicLink() || realpathSync(output) !== output) throw new Error('Output cannot be a junction or symlink');
  rmSync(output, { recursive: true });
}
mkdirSync(output);
const save = (path, content) => { const dest = resolve(output, '.' + path); if (!dest.startsWith(output + '/'.replace('/', process.platform === 'win32' ? '\\' : '/'))) throw new Error('Unsafe path'); mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, content); };
const url = path => site.url + path;
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const strip = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const resources = ['sitio-web', 'meta-ads', 'google-ads', 'negocio-digital'];
const resourceNames = ['sitio web', 'Meta Ads', 'Google Ads', 'negocio digital'];
const resourceSeo = {
  'sitio-web': { title: 'Auditoría de sitio web: checklist gratuita | Reac Studio', description: 'Checklist gratuita de Reac Studio para detectar problemas de conversión, contacto, velocidad y confianza en tu sitio web antes de hacer cambios.' },
  'meta-ads': { title: 'Auditoría de Meta Ads: checklist gratuita | Reac Studio', description: 'Checklist gratuita para revisar campañas de Meta Ads, públicos, anuncios, medición y presupuesto antes de aumentar la inversión.' },
  'google-ads': { title: 'Auditoría de Google Ads: checklist gratuita | Reac Studio', description: 'Checklist gratuita de Reac Studio para revisar campañas de Google Ads, palabras clave, anuncios, conversiones y presupuesto antes de invertir.' },
  'negocio-digital': { title: 'Auditoría de negocio digital: checklist | Reac Studio', description: 'Checklist gratuita para revisar marketing, web, procesos, medición y captación de clientes en tu negocio digital antes de priorizar cambios.' }
};
const generated = [];
const orgId = url('/#organization');
const websiteId = url('/#website');
const servedAreas = [
  { '@type': 'Place', name: 'Villa Dolores' },
  { '@type': 'AdministrativeArea', name: 'Traslasierra' },
  { '@type': 'AdministrativeArea', name: 'Córdoba' },
  { '@type': 'Country', name: 'Argentina' },
  { '@type': 'Place', name: 'Latinoamérica' }
];
const organization = {
  '@type': 'Organization', '@id': orgId, name: site.name, alternateName: site.alternateNames, url: url('/'),
  logo: url(site.logo), description: site.description, email: site.email,
  areaServed: servedAreas,
  knowsAbout: services.map(service => service.name),
  ...(site.socialProfiles.length ? { sameAs: site.socialProfiles } : {})
};

function schema(meta, doc) {
  const hasBreadcrumb = Boolean(find(doc, n => hasClass(n, 'breadcrumbs')));
  const graph = [organization, { '@type': 'WebSite', '@id': websiteId, url: url('/'), name: site.name, alternateName: site.alternateNames, publisher: { '@id': orgId }, inLanguage: 'es-AR' }, {
    '@type': meta.pageType || 'WebPage', '@id': url(meta.path + '#webpage'), url: url(meta.path), name: meta.title, description: meta.description,
    isPartOf: { '@id': websiteId }, about: { '@id': orgId }, inLanguage: 'es-AR',
    ...(hasBreadcrumb ? { breadcrumb: { '@id': url(meta.path + '#breadcrumb') } } : {}),
    ...(meta.service ? { mainEntity: { '@id': url(meta.path + '#service') } } : meta.path === '/' || meta.path === '/nosotros' ? { mainEntity: { '@id': orgId } } : {})
  }];
  if (hasBreadcrumb) graph.push({ '@type': 'BreadcrumbList', '@id': url(meta.path + '#breadcrumb'), itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: url('/') }, ...(meta.parent ? [{ '@type': 'ListItem', position: 2, name: meta.parent.name, item: url(meta.parent.path) }] : []), { '@type': 'ListItem', position: meta.parent ? 3 : 2, name: meta.label || meta.title.split('|')[0].trim(), item: url(meta.path) }] });
  if (meta.service) graph.push({ '@type': 'Service', '@id': url(meta.path + '#service'), name: meta.service.name, serviceType: meta.service.name, description: meta.service.intro, url: url(meta.path), provider: { '@id': orgId }, mainEntityOfPage: { '@id': url(meta.path + '#webpage') }, areaServed: organization.areaServed });
  if (meta.people) graph.push(...[
    ['misael-ledesma', 'Misael Ledesma', 'Desarrollo Web & Tecnología'],
    ['tomas-ortiz', 'Tomás Ortiz', 'Marketing & Growth']
  ].map(([id, name, jobTitle]) => ({ '@type': 'Person', '@id': url('/nosotros#' + id), name, jobTitle, worksFor: { '@id': orgId }, url: url('/nosotros#' + id) })));
  if (meta.article) graph.push({ '@type': 'Article', '@id': url(meta.path + '#article'), headline: meta.title, description: meta.description, author: { '@id': orgId }, publisher: { '@id': orgId }, mainEntityOfPage: { '@id': url(meta.path + '#webpage') }, datePublished: meta.article.publishedAt, dateModified: meta.article.updatedAt || meta.article.publishedAt, inLanguage: 'es-AR' });
  return { '@context': 'https://schema.org', '@graph': graph };
}

function prepare(html, meta) {
  const doc = parse(html);
  const head = find(doc, n => n.tagName === 'head');
  setAttr(find(doc, n => n.tagName === 'html'), 'lang', 'es-AR');
  for (const n of all(head, n => n.tagName === 'link' && (
    attr(n,'rel') === 'preconnect' && /(?:fontshare|fonts\.gstatic)/.test(attr(n,'href') || '') ||
    attr(n,'rel') === 'preload' && /\/uploads\/satoshi-(?:400|700)\.woff2$/.test(attr(n,'href') || '')
  ))) remove(n);
  for (const n of all(head, n => n.tagName === 'title' || n.tagName === 'meta' && ['description','robots','author','application-name','publisher','theme-color','twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt','google-site-verification','msvalidate.01'].includes(attr(n,'name')) || n.tagName === 'meta' && (attr(n,'property') || '').startsWith('og:') || n.tagName === 'link' && ['canonical','icon','shortcut icon','apple-touch-icon'].includes(attr(n,'rel')) || n.tagName === 'script' && attr(n,'type') === 'application/ld+json')) remove(n);
  const robots = meta.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large';
  append(head, `<title>${e(meta.title)}</title><meta name="description" content="${e(meta.description)}"><meta name="author" content="Reac Studio"><meta name="robots" content="${robots}"><meta name="theme-color" content="#070712"><link rel="canonical" href="${e(url(meta.path))}"><link rel="icon" type="image/png" sizes="512x512" href="/icon.png"><link rel="shortcut icon" href="/favicon.ico"><link rel="apple-touch-icon" type="image/png" sizes="512x512" href="/apple-touch-icon.png"><meta property="og:type" content="${meta.article ? 'article' : 'website'}"><meta property="og:locale" content="es_AR"><meta property="og:site_name" content="Reac Studio"><meta property="og:title" content="${e(meta.title)}"><meta property="og:description" content="${e(meta.description)}"><meta property="og:url" content="${e(url(meta.path))}"><meta property="og:image" content="${e(url('/og-image.png'))}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Reac Studio: web, marketing y automatización"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(meta.title)}"><meta name="twitter:description" content="${e(meta.description)}"><meta name="twitter:image" content="${e(url('/og-image.png'))}"><meta name="twitter:image:alt" content="Reac Studio: web, marketing y automatización">`);
  if (site.verification.google) append(head, `<meta name="google-site-verification" content="${e(site.verification.google)}">`);
  if (site.verification.bing) append(head, `<meta name="msvalidate.01" content="${e(site.verification.bing)}">`);
  append(head, `<meta name="application-name" content="${e(site.name)}"><meta name="publisher" content="${e(site.name)}">`);
  append(head, `<script type="application/ld+json">${json(schema(meta, doc))}</script>`);
  if (meta.path === '/') append(head, '<link rel="preload" href="/uploads/satoshi-400.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/uploads/satoshi-700.woff2" as="font" type="font/woff2" crossorigin>');
  for (const style of all(doc, n => n.tagName === 'style')) {
    const css = textContent(style);
    const hash = createHash('sha256').update(css).digest('hex').slice(0,12);
    save('/styles/' + hash + '.css', css);
    append(head, `<link rel="stylesheet" href="/styles/${hash}.css">`); remove(style);
  }
  for (const script of all(doc, n => n.tagName === 'script' && attr(n,'type') !== 'application/ld+json')) if (!attr(script,'src')) throw new Error('Inline script is not allowed: ' + meta.path);
  if (!find(head,n=>n.tagName==='script'&&attr(n,'src')==='/site-config.js')) {
    const existing = find(head,n=>n.tagName==='script'&&attr(n,'src')==='/reac-site.js');
    if(existing)remove(existing);
    append(head,'<script defer src="/site-config.js"></script><script defer src="/reac-site.js"></script>');
  }
  for(const n of all(doc,n=>n.tagName==='a')) {
    const href=attr(n,'href') || '';
    if(hasClass(n,'social-link') && !site.socialProfiles.includes(href)) { remove(n); continue; }
    if(href.startsWith('https://wa.me/')) {
      const query=href.indexOf('?');
      setAttr(n,'href',`https://wa.me/${site.whatsapp}${query===-1?'':href.slice(query)}`);
    }
    if(href.startsWith('mailto:')) {
      setAttr(n,'href','mailto:'+site.email);
      const value=find(n,child=>hasClass(child,'ct-mval'));
      if(value){value.childNodes=parseFragment(e(site.email)).childNodes;for(const child of value.childNodes)child.parentNode=value;}
      else if(/^[^\s@]+@[^\s@]+$/.test(textContent(n).trim())){n.childNodes=parseFragment(e(site.email)).childNodes;for(const child of n.childNodes)child.parentNode=n;}
    }
    if(href==='/politica-de-privacidad.html')setAttr(n,'href','/politica-de-privacidad');
    if(href==='/#recursos')setAttr(n,'href','/recursos');
    if(attr(n,'target')==='_blank')setAttr(n,'rel','noopener noreferrer');
  }
  for(const n of all(doc,n=>n.tagName==='img')) {
    if(!attr(n,'src')?.startsWith('http') && attr(n,'src') && !attr(n,'src').startsWith('/'))setAttr(n,'src','/'+attr(n,'src'));
    setAttr(n,'decoding','async');
  }
  const result = serialize(doc).replace(/[ \t]+\n/g, '\n');
  if (/\{\{|<\/?(?:sc-|x-dc|helmet)|on(?:click|load|error|change)=/i.test(result)) throw new Error('Uncompiled/unsafe HTML: ' + meta.path);
  if (all(doc,n=>n.tagName==='h1').length!==1)throw new Error('Expected one H1: '+meta.path);
  const file = meta.file || (meta.path==='/'?'/index.html':meta.path+'.html');
  save(file,result);
  generated.push({ path: meta.path, file, title: meta.title, indexable: !meta.noindex });
  return result;
}

const home = parse(readFileSync(resolve(root,'Reac.dc.html'),'utf8'));
const projectCatalogFile = resolve(root,'content/projects.html');
const projectName = slide => textContent(find(slide,n=>n.tagName==='h3')).trim();
function loadProjectSlides() {
  const fragment=parseFragment(readFileSync(projectCatalogFile,'utf8'));
  return all(fragment,n=>hasClass(n,'proj-slide'));
}
const featuredNames=['Más Servicios','Calculadora de Divisas','Panel Administrativo Modular'];
const featuredProjects=loadProjectSlides().filter(slide=>featuredNames.includes(projectName(slide))).sort((a,b)=>featuredNames.indexOf(projectName(a))-featuredNames.indexOf(projectName(b)));
if(featuredProjects.length!==featuredNames.length)throw new Error('Featured project catalog is incomplete');
const homeTrack=find(home,n=>hasClass(n,'proj-track'));
const featuredFragment=parseFragment(featuredProjects.map(serializeOuter).join(''));
homeTrack.childNodes=featuredFragment.childNodes;for(const child of homeTrack.childNodes)child.parentNode=homeTrack;
const homeSlides=all(homeTrack,n=>hasClass(n,'proj-slide'));
for(const [index,slide] of homeSlides.entries()){
  const counter=find(slide,n=>hasClass(n,'proj-case-index'));
  counter.childNodes=parseFragment(String(index+1).padStart(2,'0')+' / '+homeSlides.length).childNodes;for(const child of counter.childNodes)child.parentNode=counter;
}
const dots=find(home,n=>hasClass(n,'proj-dots'));
dots.childNodes=parseFragment(homeSlides.map((slide,index)=>`<button type="button" class="proj-dot" aria-label="Ver proyecto ${String(index+1).padStart(2,'0')}: ${e(projectName(slide))}" aria-current="${index===0?'true':'false'}" style="width:${index===0?'30':'9'}px; background:${index===0?'linear-gradient(135deg,#1F27EB,#7C3AED)':'rgba(255,255,255,.18)'};" data-action="d.go" data-project-index="${index}"></button>`).join('')).childNodes;for(const child of dots.childNodes)child.parentNode=dots;
const homeProjectCounter=find(home,n=>hasClass(n,'proj-counter'));
homeProjectCounter.childNodes=parseFragment('01 / '+homeSlides.length).childNodes;for(const child of homeProjectCounter.childNodes)child.parentNode=homeProjectCounter;
const nav = serializeOuter(find(home,n=>hasClass(n,'site-nav'))).replace('site-nav nav-hidden','site-nav').replaceAll('href="#hero-sec"','href="/"').replaceAll('href="#contacto"','href="/contacto"').replaceAll('href="#proceso"','href="/#proceso"');
const socialNode = find(home, n => hasClass(n, 'social-links'));
const socialLinks = serializeOuter(socialNode).replace('class="social-links"', 'class="social-links page-footer-social"');
const footer = `<footer class="page-footer"><a class="page-footer-brand" href="/" aria-label="Reac Studio, ir al inicio"><img src="/uploads/reac-symbol.svg" alt="" width="58" height="58" decoding="async"></a><nav aria-label="Enlaces del sitio"><a href="/servicios">Servicios</a><a href="/proyectos">Proyectos</a><a href="/nosotros">Nosotros</a><a href="/recursos">Recursos</a><a href="/contacto">Contacto</a><a href="/politica-de-privacidad">Privacidad</a></nav><p>Un solo equipo para conectar los canales y procesos de tu negocio. Trabajo remoto para Argentina y LATAM.</p>${socialLinks}</footer>`;
const cta = (service = '') => `<div class="page-actions"><a class="page-cta" ${service ? `data-service="${e(service)}" data-cta="project"` : 'data-cta="diagnostic"'} href="/contacto">${service?'Hablar sobre mi proyecto':'Solicitar diagnóstico'} <span aria-hidden="true">→</span></a><a class="page-secondary" data-placement="service_${e(service||'general')}" href="https://wa.me/${site.whatsapp}" target="_blank" rel="noopener noreferrer" aria-label="Hablar con Reac Studio por WhatsApp">Hablar por WhatsApp</a></div>`;
const faq = pairs => `<section class="page-section"><h2>Preguntas frecuentes</h2>${pairs.map(([q,a])=>`<details class="imp-faq"><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join('')}</section>`;
const cards = selected => `<div class="page-grid">${selected.map(s=>`<article class="page-card"><h2><a href="/${s.slug}">${e(s.name)}</a></h2><p>${e(s.intro)}</p><a class="text-link" href="/${s.slug}">Explorar ${e(s.name.toLowerCase())} <span aria-hidden="true">→</span></a></article>`).join('')}</div>`;
function page(meta, content) {
  return prepare(`<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/reac-site.css"><link rel="stylesheet" href="/reac-home.css"><link rel="stylesheet" href="/reac-pages.css"><script defer src="/site-config.js"></script><script defer src="/reac-site.js"></script></head><body class="content-page" data-page="${e(meta.path.slice(1))}"><a class="skip-link" href="#main-content">Saltar al contenido</a>${nav}<main id="main-content" class="page-shell"><nav class="breadcrumbs" aria-label="Ruta de navegación"><a href="/">Inicio</a><span aria-hidden="true">/</span>${meta.parent ? `<a href="${meta.parent.path}">${meta.parent.name}</a><span aria-hidden="true">/</span>` : ''}<span aria-current="page">${e(meta.label)}</span></nav>${content}</main>${footer}</body></html>`,meta);
}
const mainMeta = {path:'/',title:site.title,description:site.description};
const homepage = prepare(serialize(home),mainMeta);
// Source/output pairing is deterministic. The build owns metadata in both files.
writeFileSync(resolve(root,'Reac.dc.html'),homepage); writeFileSync(resolve(root,'index.html'),homepage);

for(const service of services)page({path:'/'+service.slug,title:service.title,description:service.description,label:service.name,parent:{name:'Servicios',path:'/servicios'},service},
  `<header class="page-hero"><p class="eyebrow">${e(service.name)} · Argentina y LATAM</p><h1>${e(service.h1)}</h1><p class="page-intro">${e(service.intro)}</p>${cta(service.slug)}</header><section class="page-section prose"><h2>Cuándo tiene sentido</h2><p>${e(service.fit)}</p></section><section class="page-section"><h2>Qué trabajamos con vos</h2><div class="page-grid">${service.deliverables.map(([title,body])=>`<article class="page-card"><h3>${e(title)}</h3><p>${e(body)}</p></article>`).join('')}</div></section><section class="page-section prose"><h2>Qué conviene definir antes de empezar</h2><p>${e(service.decision)}</p></section><section class="page-section"><h2>Cómo trabajamos</h2><ol class="page-process">${service.process.map(step=>`<li>${e(step)}</li>`).join('')}</ol></section><section class="page-section page-proof"><h2>Información para evaluar la propuesta</h2><p>${e(service.evidence)}</p><a class="text-link" href="${service.evidenceLink}">${e(service.evidenceLabel)} →</a></section>${faq(service.faqs)}<section class="page-section"><h2>Hablemos de tu negocio</h2><p>Contanos tu objetivo, qué herramientas usás y cuál es el principal problema que querés resolver. A partir de eso definimos prioridades y alcance.</p>${cta(service.slug)}</section><nav class="related-links" aria-label="Servicios relacionados">${service.related.map(slug=>`<a href="/${slug}">${e(services.find(s=>s.slug===slug).name)}</a>`).join('')}</nav>`);

page({path:'/servicios',title:'Servicios digitales para empresas | Reac Studio',description:'Desarrollo web, marketing digital, Google Ads, Meta Ads, automatización con IA y CRM. Un equipo remoto para conectar los canales y procesos de tu negocio.',label:'Servicios'},`<header class="page-hero"><p class="eyebrow">Un solo equipo</p><h1>Servicios para conectar tu ecosistema digital</h1><p class="page-intro">Reac Studio combina desarrollo, marketing y tecnología para que los canales de tu negocio trabajen juntos. Podés empezar por un servicio concreto o definir un plan integral según tus prioridades.</p>${cta()}</header>${cards(services)}<section class="page-section prose"><h2>Por dónde empezar</h2><p>Si cuesta entender tu oferta, revisemos el mensaje y la web. Si necesitás atraer consultas, evaluemos canales y campañas. Si ya llegan oportunidades pero se pierde el seguimiento, miremos los procesos, las integraciones y el CRM.</p><p>Trabajamos de forma remota con empresas de Argentina y LATAM. El diagnóstico define qué conviene resolver primero, qué información falta y qué alcance tiene sentido para tu negocio.</p></section>`);

const team = find(home,n=>hasClass(n,'team-grid'));
all(team,n=>hasClass(n,'team-card')).forEach((n,i)=>setAttr(n,'id',i?'tomas-ortiz':'misael-ledesma'));
page({path:'/nosotros',title:'Sobre Reac Studio | Desarrollo, marketing y tecnología',description:'Conocé a Reac Studio: Misael Ledesma en Desarrollo Web & Tecnología y Tomás Ortiz en Marketing & Growth. Un equipo remoto para Argentina y LATAM.',label:'Nosotros',people:true,pageType:'AboutPage'},`<header class="page-hero"><p class="eyebrow">Sobre Reac Studio</p><h1>Reac Studio: desarrollo, marketing y tecnología</h1><p class="page-intro">Reac Studio es una agencia de desarrollo web, marketing digital y automatización para empresas, negocios y profesionales. Trabajamos desde Córdoba, Argentina, de forma remota con Argentina y Latinoamérica.</p><p>También nos encontrás como ReacStudio. Nuestro sitio oficial es <a href="/">reacstudio.com</a>.</p></header><section class="page-section"><h2>Quiénes integran Reac Studio</h2>${serializeOuter(team)}</section><section class="page-section prose"><h2>Cómo nos organizamos</h2><p>Conectamos la estrategia y la comunicación con el desarrollo de la web, los sistemas y las integraciones. Primero entendemos el negocio y acordamos un alcance. Después construimos, medimos y revisamos lo que necesita mejorar.</p><p>Podés conocer los <a href="/servicios">servicios</a> y revisar <a href="/proyectos">proyectos comerciales, personales y académicos</a>. Cada ficha identifica qué información está documentada.</p></section>${cta()}`);

const projects = loadProjectSlides();
const projectCards = projects.map(slide=> {
  const card=find(slide,n=>hasClass(n,'proj-case'));
  const name=textContent(find(card,n=>n.tagName==='h3')).trim();
  setAttr(card,'id',strip(name));
  for(const counter of all(card,n=>hasClass(n,'proj-case-index')))remove(counter);
  for(const a of all(card,n=>n.tagName==='a')) { setAttr(a,'tabindex',null); if(attr(a,'href')==='#contacto')setAttr(a,'href','/contacto'); }
  const heading=find(card,n=>n.tagName==='h3'); heading.tagName=heading.nodeName='h2';
  const relatedSlug = name === 'Landing para Profesional' ? 'landing-pages' : ['CRM Comercial', 'Panel Administrativo Modular', 'Detección de Fraude Fiscal', 'App de Enfoque Pomodoro', 'Calculadora de Divisas'].includes(name) ? 'sistemas-crm' : 'desarrollo-web';
  const relatedService = services.find(service => service.slug === relatedSlug);
  return `<article class="project-entry">${serializeOuter(card)}<p class="project-service">Servicio relacionado: <a href="/${relatedSlug}">${e(relatedService.name)}</a></p></article>`;
}).join('');
page({path:'/proyectos',title:'Proyectos web y sistemas | Reac Studio',description:'Conocé proyectos comerciales, personales y académicos de Reac Studio. Desafío, solución y alcance documentado, con capturas de trabajos existentes.',label:'Proyectos'},`<header class="page-hero"><p class="eyebrow">Trabajo documentado</p><h1>Proyectos de desarrollo web, sistemas y tecnología</h1><p class="page-intro">Estas fichas reúnen el problema, la solución y el alcance disponible de cada proyecto. Identificamos los trabajos comerciales, personales y académicos sin atribuir tecnologías o resultados que no estén documentados.</p><nav class="project-index" aria-label="Índice de proyectos">${projects.map(slide=>{const name=textContent(find(slide,n=>n.tagName==='h2'||n.tagName==='h3')).trim();return `<a href="#${strip(name)}">${e(name)}</a>`;}).join('')}</nav></header><div class="project-list">${projectCards}</div>${cta()}`);

const contact = find(home,n=>hasClass(n,'ct-panel'));
const contactHeading=find(contact,n=>n.tagName==='h2');
if(contactHeading) { contactHeading.childNodes=parseFragment('Contanos qué querés resolver.').childNodes; }
page({path:'/contacto',title:'Contactá a Reac Studio | Diagnóstico digital',description:'Contanos sobre tu negocio y qué querés mejorar: web, campañas, automatización o sistemas. Contacto por WhatsApp, email y formulario de Reac Studio.',label:'Contacto',pageType:'ContactPage'},`<header class="page-hero"><p class="eyebrow">Hablemos</p><h1>Contactá a Reac Studio</h1><p class="page-intro">Compartí tu objetivo, qué herramientas usás y dónde encontrás dificultades. Trabajamos de forma remota con negocios de Argentina y LATAM y definimos el alcance según cada necesidad.</p></header><section id="contacto">${serializeOuter(contact)}</section>`);

const published = articles.filter(article=>article.published===true);
for(const article of published) {
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)||!/^\d{4}-\d{2}-\d{2}$/.test(article.publishedAt)||article.author!=='organization'||!article.sections?.length)throw new Error('Invalid reviewed article');
  page({path:'/recursos/'+article.slug,title:article.title,description:article.description,label:article.title,parent:{name:'Recursos',path:'/recursos'},article},`<article><header class="page-hero"><h1>${e(article.title)}</h1><p class="page-intro">${e(article.description)}</p><p>Por <a href="/nosotros">Reac Studio</a> · <time datetime="${article.publishedAt}">${article.publishedAt}</time></p></header>${article.sections.map(section=>`<section class="page-section prose"><h2>${e(section.heading)}</h2>${section.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}</section>`).join('')}${cta()}</article>`);
}
page({path:'/recursos',title:'Recursos para revisar tu negocio digital | Reac Studio',description:'Checklists de desarrollo web, Google Ads, Meta Ads y negocio digital. Recursos gratuitos de Reac Studio para revisar tu presencia y tus procesos.',label:'Recursos'},`<header class="page-hero"><p class="eyebrow">Recursos de Reac Studio</p><h1>Revisá tu web, tus campañas y tu negocio digital</h1><p class="page-intro">Estas checklists te ayudan a ordenar preguntas antes de invertir en cambios. Podés leerlas en la web o descargarlas en PDF, sin dejar tus datos. Son un punto de partida; las decisiones requieren revisar el contexto y los datos de tu negocio.</p></header><div class="page-grid">${resources.map((resource,i)=>`<article class="page-card"><h2><a href="/recursos/auditoria-${resource}.html">Auditoría de ${resourceNames[i]}</a></h2><p>Preguntas para revisar ${resourceNames[i]} y detectar qué información necesitás antes de decidir.</p><a class="text-link" href="/recursos/auditoria-${resource}.html">Leer checklist →</a><a class="text-link" href="/recursos/auditoria-${resource}.pdf" download>Descargar PDF</a></article>`).join('')}${published.map(article=>`<article class="page-card"><h2><a href="/recursos/${article.slug}">${e(article.title)}</a></h2><p>${e(article.description)}</p></article>`).join('')}</div><section class="page-section prose"><h2>Cómo aprovechar una checklist</h2><ol><li>Respondé con ejemplos de tu web, cuenta publicitaria o proceso actual.</li><li>Separá lo que sabés de lo que necesitás medir.</li><li>Priorizá un problema que afecte al contacto o al seguimiento.</li><li>Revisá el resultado del cambio antes de sumar otro.</li></ol><p>Si necesitás ayuda para interpretar lo que encontraste, podemos revisar el contexto en un diagnóstico.</p>${cta()}</section>`);

for(const [i,resource] of resources.entries()) {
  const path='/recursos/auditoria-'+resource+'.html';
  const source=readFileSync(resolve(root,'.'+path),'utf8');
  const doc=parse(source);
  let main=find(doc,n=>n.tagName==='main');
  if(!main){
    const body=find(doc,n=>n.tagName==='body');
    main=parseFragment('<main id="main-content"></main>').childNodes[0];
    main.childNodes=body.childNodes;for(const child of main.childNodes)child.parentNode=main;
    main.parentNode=body;body.childNodes=[main];
  }
  if(main&&!attr(main,'id'))setAttr(main,'id','main-content');
  const breadcrumb = parseFragment(`<nav class="breadcrumbs resource-web-links" aria-label="Ruta de navegación"><a href="/">Inicio</a><span aria-hidden="true">/</span><a href="/recursos">Recursos</a><span aria-hidden="true">/</span><span aria-current="page">Auditoría de ${resourceNames[i]}</span></nav>`).childNodes[0];
  breadcrumb.parentNode=main;main.childNodes.unshift(breadcrumb);
  const body=find(doc,n=>n.tagName==='body');
  const relatedService = services.find(service => service.slug === ['desarrollo-web','meta-ads','google-ads','automatizacion-ia'][i]);
  append(body,`<nav class="resource-web-links" aria-label="Más recursos"><a href="/recursos">Todos los recursos</a><a href="/${relatedService.slug}">${e(relatedService.name)}</a><a href="/recursos/auditoria-${resource}.pdf" download>Descargar PDF</a><a href="/contacto">Consultar a Reac Studio</a></nav>`);
  prepare(serialize(doc),{path,file:path,title:resourceSeo[resource].title,description:resourceSeo[resource].description,label:'Auditoría de '+resourceNames[i],parent:{name:'Recursos',path:'/recursos'}});
}
for(const [file,path,title] of [['404.html','/404','Página no encontrada | Reac Studio'],['gracias.html','/gracias','Gracias por tu consulta | Reac Studio'],['politica-de-privacidad.html','/politica-de-privacidad','Política de privacidad | Reac Studio']]) prepare(readFileSync(resolve(root,file),'utf8'),{path,file:'/'+file,title,description:title.split('|')[0].trim()+'. Información de Reac Studio.',label:title.split('|')[0].trim(),noindex:true});

for(const file of ['reac-site.css','reac-home.css','reac-pages.css','reac-site.js','reac-ui.js','og-image.png','favicon.ico','favicon.svg','icon.png','apple-touch-icon.png'])copyFileSync(resolve(root,file),resolve(output,file));
// A small experimental directory, generated from the same public facts and routes.
const llms = `# ${site.name}\n\n> ${site.description}\n\n## Sitio oficial\n\n${[['Inicio','/'],['Servicios','/servicios'],['Proyectos','/proyectos'],['Nosotros','/nosotros'],['Contacto','/contacto'],['Recursos','/recursos']].map(([name,path])=>`- ${name}: ${url(path)}`).join('\n')}\n\n## Servicios\n\n${services.map(service=>`- ${service.name}: ${url('/'+service.slug)}`).join('\n')}\n\n## Identidad\n\n- Nombre principal: ${site.name}\n- Variantes: ${site.alternateNames.join(', ')}\n- Trabajo remoto desde Córdoba, Argentina, para empresas, negocios y profesionales de Argentina y Latinoamérica.\n\n## Perfiles oficiales\n\n${site.socialProfiles.map(profile=>'- '+profile).join('\n')}\n\nEste directorio es un complemento experimental. No reemplaza el contenido HTML, robots.txt ni sitemap.xml.\n`;
save('/llms.txt',llms);writeFileSync(resolve(root,'llms.txt'),llms);
const publicMarkup=generated.map(page=>readFileSync(resolve(output,'.'+page.file),'utf8')).join('\n')+['reac-site.css','reac-home.css','reac-pages.css'].map(file=>readFileSync(resolve(root,file),'utf8')).join('\n');
const referencedAssets=new Set([...publicMarkup.matchAll(/\/uploads\/([a-zA-Z0-9._-]+\.(?:webp|png|jpe?g|svg|avif|woff2))/gi)].map(match=>match[1]));
for(const file of referencedAssets)save('/uploads/'+file,readFileSync(resolve(root,'uploads',file)));
for(const resource of resources)save('/recursos/auditoria-'+resource+'.pdf',readFileSync(resolve(root,'recursos/auditoria-'+resource+'.pdf')));
save('/site-config.js','window.REAC_CONFIG = Object.freeze('+json({siteUrl:site.url,analyticsId:site.analyticsId})+');\n');
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+generated.filter(page=>page.indexable).map(page=>'  <url><loc>'+e(url(page.path))+'</loc></url>').join('\n')+'\n</urlset>\n';
// robots.txt guides crawlers; source isolation and authorization protect data.
const privatePaths = ['/api/', '/admin', '/dashboard', '/internal', '/preview', '/staging'];
const crawlerRules = ['*', 'OAI-SearchBot'].flatMap(agent => ['User-agent: '+agent,'Allow: /',...privatePaths.map(path=>'Disallow: '+path),'']);
crawlerRules.push('# Search access is independent of model-training permission.');
if(!site.allowTraining)crawlerRules.push('User-agent: GPTBot','Disallow: /','');
crawlerRules.push('Sitemap: '+url('/sitemap.xml'),'');
save('/sitemap.xml',sitemap); save('/robots.txt',crawlerRules.join('\n'));
writeFileSync(resolve(root,'sitemap.xml'),sitemap);writeFileSync(resolve(root,'robots.txt'),crawlerRules.join('\n'));
const indexNowKey=process.env.INDEXNOW_KEY||site.indexNowKey;
if(indexNowKey) {
  if(!/^[a-fA-F0-9]{8,128}$/.test(indexNowKey))throw new Error('Invalid IndexNow ownership key');
  save('/'+indexNowKey+'.txt',indexNowKey);
}
mkdirSync(resolve(root,'artifacts'),{recursive:true});
writeFileSync(resolve(root,'artifacts/build-manifest.json'),JSON.stringify({siteUrl:site.url,pages:generated},null,2));
console.log(`Built ${generated.length} HTML pages (${generated.filter(page=>page.indexable).length} indexable). Public output: dist/`);
