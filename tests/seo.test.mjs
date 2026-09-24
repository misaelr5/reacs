import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parse, all, attr, find, hasClass, textContent } from '../scripts/html.mjs';
import { site } from '../site.config.mjs';
import { services } from '../content/services.mjs';

const manifest = JSON.parse(readFileSync('artifacts/build-manifest.json', 'utf8'));
const docs = new Map(manifest.pages.map(page => [page.path, parse(readFileSync('dist' + page.file, 'utf8'))]));
const one = (doc, predicate) => { const nodes = all(doc, predicate); assert.equal(nodes.length, 1); return nodes[0]; };
const meta = (doc, key) => attr(one(doc, n => n.tagName === 'meta' && (attr(n, 'name') === key || attr(n, 'property') === key)), 'content');
const orgId = site.url + '/#organization';
const websiteId = site.url + '/#website';

test('Every page has unique, consistent metadata and a connected identity graph', () => {
  const titles = new Set(); const descriptions = new Set();
  for (const [path, doc] of docs) {
    const title = textContent(one(doc, n => n.tagName === 'title'));
    const description = meta(doc, 'description');
    assert.ok(!titles.has(title), 'Duplicate title: ' + path); titles.add(title);
    assert.ok(!descriptions.has(description), 'Duplicate description: ' + path); descriptions.add(description);
    const socialTitle=path==='/'?'Reac Studio | Desarrollo Web y Marketing Digital':title;
    const socialDescription=path==='/'?'Creamos sitios web modernos, rápidos y estrategias digitales que impulsan tu negocio.':description;
    assert.equal(meta(doc, 'og:title'), socialTitle);
    assert.equal(meta(doc, 'twitter:title'), socialTitle);
    assert.equal(meta(doc, 'og:description'), socialDescription);
    assert.equal(meta(doc, 'twitter:description'), socialDescription);
    assert.equal(meta(doc, 'og:site_name'), site.name);
    assert.equal(meta(doc, 'og:url'), site.url + path);
    assert.equal(meta(doc, 'twitter:card'), 'summary_large_image');
    if(path==='/'){
      assert.equal(meta(doc,'og:image'),site.url+'/og-image.png');
      assert.equal(meta(doc,'twitter:image'),meta(doc,'og:image'));
      assert.equal(meta(doc,'og:image:width'),'1200');
      assert.equal(meta(doc,'og:image:height'),'630');
      const image=readFileSync('dist/og-image.png');
      assert.equal(image.toString('hex',0,8),'89504e470d0a1a0a');
      assert.equal(image.readUInt32BE(16),1200);
      assert.equal(image.readUInt32BE(20),630);
    }
    const graph = JSON.parse(textContent(one(doc, n => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json')))['@graph'];
    assert.equal(new Set(graph.map(item => item['@id'])).size, graph.length);
    const organization = graph.filter(item => item['@type'] === 'Organization');
    assert.equal(organization.length, 1); assert.equal(organization[0]['@id'], orgId);
    assert.deepEqual(organization[0].sameAs, site.socialProfiles);
    assert.deepEqual(organization[0].alternateName, site.alternateNames);
    assert.ok(!JSON.stringify(graph).match(/LocalBusiness|ProfessionalService|aggregateRating|reviewRating/));
    const website = graph.filter(item => item['@type'] === 'WebSite');
    assert.equal(website.length, 1); assert.equal(website[0]['@id'], websiteId);
    assert.equal(website[0].name, site.name); assert.equal(website[0].publisher['@id'], orgId);
    assert.deepEqual(website[0].alternateName, site.alternateNames);
    const webpage = graph.find(item => item['@id'] === site.url + path + '#webpage');
    assert.equal(webpage.isPartOf['@id'], websiteId); assert.equal(webpage.about['@id'], orgId);
    const breadcrumb = graph.find(item => item['@type'] === 'BreadcrumbList');
    const visibleBreadcrumb = find(doc, n => hasClass(n, 'breadcrumbs'));
    assert.equal(Boolean(breadcrumb), Boolean(visibleBreadcrumb), path + ': breadcrumb visibility');
    if (breadcrumb) {
      assert.equal(webpage.breadcrumb['@id'], breadcrumb['@id']);
      assert.equal(breadcrumb.itemListElement.at(-1).item, site.url + path);
      for (const [i, item] of breadcrumb.itemListElement.entries()) {
        assert.equal(item.position, i + 1); assert.ok(textContent(visibleBreadcrumb).includes(item.name));
      }
    }
    const service = graph.find(item => item['@type'] === 'Service');
    if (service) {
      assert.equal(service.provider['@id'], orgId);
      assert.equal(webpage.mainEntity['@id'], service['@id']);
      assert.equal(service.mainEntityOfPage['@id'], webpage['@id']);
    }
  }
});

test('All public pages can be crawled from HTML anchors in at most three clicks', () => {
  const depth = new Map([['/', 0]]); const queue = ['/'];
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i];
    for (const anchor of all(docs.get(path), n => n.tagName === 'a' && attr(n, 'href'))) {
      const url = new URL(attr(anchor, 'href'), site.url + path);
      if (url.origin !== site.url || !docs.has(url.pathname) || depth.has(url.pathname)) continue;
      depth.set(url.pathname, depth.get(path) + 1); queue.push(url.pathname);
    }
  }
  for (const page of manifest.pages.filter(page => page.indexable)) assert.ok(depth.get(page.path) <= 3, 'Orphan/deep page: ' + page.path);
  for (const service of services) assert.equal(depth.get('/' + service.slug), 1, service.slug);
});

test('Brand aliases are visible, and images have reserved dimensions and valid responsive sources', () => {
  const home = docs.get('/');
  const body = textContent(find(home, n => n.tagName === 'body'));
  for (const name of ['Reac Studio', 'ReacStudio', 'reacstudio.com']) assert.ok(body.includes(name));
  assert.match(textContent(find(home, n => hasClass(n, 'hero-sub'))), /Reac Studio.*desarrollo web.*marketing digital.*automatización/);
  for (const [path, doc] of docs) for (const img of all(doc, n => n.tagName === 'img')) {
    assert.notEqual(attr(img, 'alt'), undefined, path);
    assert.ok(Number(attr(img, 'width')) > 0 && Number(attr(img, 'height')) > 0, path);
    for (const candidate of (attr(img, 'srcset') || '').split(',').filter(Boolean)) {
      const source = candidate.trim().split(/\s+/)[0];
      if (source.startsWith('/')) assert.ok(existsSync('dist' + source), path + ': missing responsive image ' + source);
    }
  }
});

test('Search bots retain public access and matching private exclusions', () => {
  const robots = readFileSync('dist/robots.txt', 'utf8');
  for (const agent of ['*', 'OAI-SearchBot']) {
    const group = robots.split('User-agent: ' + agent + '\n')[1].split('\n\n')[0];
    assert.ok(group.includes('Allow: /\n'));
    for (const path of ['/api/', '/admin', '/dashboard', '/internal', '/preview', '/staging']) assert.ok(group.includes('Disallow: ' + path));
  }
  assert.equal(robots.includes('User-agent: GPTBot'), !site.allowTraining);
  assert.ok(!readFileSync('dist/sitemap.xml', 'utf8').includes('<lastmod>'));
});

test('IndexNow previews only selected canonical public URLs and explicit removals', () => {
  const run = args => spawnSync(process.execPath, ['scripts/indexnow.mjs', ...args], { encoding: 'utf8' });
  const valid = run(['/landing-pages', '/desarrollo-web', '/landing-pages']);
  assert.equal(valid.status, 0, valid.stderr); assert.match(valid.stdout, /Dry run/);
  assert.equal((valid.stdout.match(/https:\/\/reacstudio.com\/landing-pages/g) || []).length, 1);
  for (const path of ['/api/contact', '/admin', '/gracias', '/404', '/desarrollo-web.html', '/desarrollo-web/', '/?utm_source=test', '/unknown', 'https://example.com/']) assert.notEqual(run([path]).status, 0, path);
  assert.equal(run(['--deleted=/servicio-retirado']).status, 0);
  assert.notEqual(run(['--deleted=/desarrollo-web']).status, 0);
});
