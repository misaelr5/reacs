// Reac premium — scroll entrances for everything that has no motion of its own. Each kind of block gets
// one recipe (cards unfold, media open like a shutter, text pulls into focus, lists are written in...).
// Only blocks still below the fold at start are held back, so the first paint and LCP are untouched;
// transforms, clip-path and opacity only, so nothing shifts layout. Clip-path also clips hit testing, so
// it is kept off anything clickable: links stay tappable while they animate. Without GSAP or with reduced motion
// the page stays exactly as authored.
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');

  // Components with their own entrance or continuous motion.
  const OWNED = [
    '.p-hero', '.page-hero', '.breadcrumbs', '[data-title-fx]', '.rpl', '.rpl-card', '[data-plans]', '.rab-fig',
    '.bento-showcase', '.reveal', '.p-marquee', '.p-clients', '.tst-grid', '[class*="ppj-"]', '.rl', '.skip-link'
  ].join(', ');
  const CARD = '.page-card, .team-card, .case-card, .proj-case, .proj-fact, .ct-panel, .panel, .stat, .step, .block, .golden';
  const MEDIA = 'figure, picture, video, img, .case-detail-visual';
  const ACTION = '.page-actions, .case-actions, .case-tags, .related-links, .social-links, .p-btn, .page-cta, .page-secondary, button, a';
  const TEXT = 'p, blockquote, figcaption, dl, dt, dd, nav';

  // Home: bespoke sections, mapped by hand.
  const HOME = [
    ['fan', '#process-steps'],
    ['focus', '.pj-intro p, .pj-footer p, #servicios .p-svc__head .p-lead, .rfx-intro p, .rab-statement, .faq-head .p-lead, .rsc-copy .p-kicker, .rsc-text, .imp-foot-bottom'],
    ['pop', '.pj-cta, .rfx-intro a, .rab-team-link, .rsc-copy .p-btn'],
    ['unfold', '.rfx-item, .rab-team .team-card, .rab-facts .rab-col'],
    ['tick', '#faq .faq-item, .rsc-list > li, .imp-foot-cols > *'],
    ['drift', '.p-reach__row, .tst-window'],
    ['letters', '.home-footer-wordmark']
  ];

  function setup() {
    const gsap = window.gsap;
    if (!gsap || reduced.matches || !('IntersectionObserver' in window)) return;
    // /proyectos choreographs its whole page (projects-page.js).
    if (document.querySelector('.ppj-grid')) return;
    const { SplitText, CustomEase } = window;
    if (CustomEase) gsap.registerPlugin(CustomEase);
    const ease = CustomEase ? CustomEase.create('reacReveal', 'M0,0 C0.12,0.8 0.22,1 1,1') : 'expo.out';
    const home = document.body.dataset.page === 'home';
    const owned = home ? OWNED + ', [data-glow-card]' : OWNED;
    const splits = new Map();

    // Every recipe: hide() sets the pre-state, show() returns the entrance.
    const recipes = {
      focus: {
        hide: el => gsap.set(el, coarse.matches ? { opacity: 0, y: 18 } : { opacity: 0, y: 18, filter: 'blur(10px)' }),
        show: el => gsap.to(el, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .9, ease })
      },
      // Cards swing down on a hinge along their top edge.
      unfold: {
        hide: el => gsap.set(el, { opacity: 0, y: 28, rotationX: -58, transformPerspective: 1100, transformOrigin: '50% 0%' }),
        show: el => gsap.to(el, { opacity: 1, y: 0, rotationX: 0, duration: 1.15, ease: 'expo.out' })
      },
      // A horizontal shutter opens while the picture settles from a slight zoom.
      aperture: {
        hide: el => {
          if (el.querySelector('a, button')) return recipes.unfold.hide(el);
          gsap.set(el, { clipPath: 'inset(50% 0% 50% 0%)' });
          const image = el.matches('img, video') ? null : el.querySelector('img, video');
          if (image) gsap.set(image, { scale: 1.16 });
        },
        show: el => {
          if (el.querySelector('a, button')) return recipes.unfold.show(el);
          const image = el.matches('img, video') ? null : el.querySelector('img, video');
          const timeline = gsap.timeline().to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut' });
          if (image) timeline.to(image, { scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform' }, .15);
          return timeline;
        }
      },
      // Words climb out of their own masks, tilted, and straighten on the line.
      rise: {
        hide: el => {
          if (!SplitText) return recipes.focus.hide(el);
          const split = SplitText.create(el, { type: 'words', mask: 'words' });
          splits.set(el, split);
          gsap.set(split.words, { yPercent: 110, rotation: 6, transformOrigin: '0% 100%' });
        },
        show: el => {
          const split = splits.get(el);
          if (!split) return recipes.focus.show(el);
          return gsap.to(split.words, { yPercent: 0, rotation: 0, duration: 1, ease, stagger: .04 });
        }
      },
      // List items are written in from the left, leaning forward like a pen stroke.
      tick: {
        hide: el => gsap.set(el, { opacity: 0, x: -28, skewX: -14, transformOrigin: '0% 100%' }),
        show: el => gsap.to(el, { opacity: 1, x: 0, skewX: 0, duration: .85, ease })
      },
      pop: {
        hide: el => gsap.set(el, { opacity: 0, y: 14, scale: .84 }),
        show: el => gsap.to(el, { opacity: 1, y: 0, scale: 1, duration: .75, ease: 'back.out(2.2)' })
      },
      // Moving rows slide in at different depths. Always from the left: overflow past the right edge
      // would make phones scroll sideways mid-animation.
      drift: {
        hide: (el, i) => gsap.set(el, { opacity: 0, x: i % 2 ? -60 : -160 }),
        show: el => gsap.to(el, { opacity: 1, x: 0, duration: 1.3, ease: 'expo.out' })
      },
      letters: {
        hide: el => {
          if (!SplitText) return recipes.focus.hide(el);
          const split = SplitText.create(el, { type: 'chars', mask: 'chars' });
          splits.set(el, split);
          gsap.set(split.chars, { yPercent: 105 });
        },
        show: el => {
          const split = splits.get(el);
          if (!split) return recipes.focus.show(el);
          return gsap.to(split.chars, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .035 });
        }
      },
      // Proceso: the beams light up from their shared source (230, 800 in each ray's viewBox), then the
      // services settle on their tips. Only the decorative rays are clipped.
      fan: {
        hide: el => {
          gsap.set(el.querySelectorAll('.pjl-ray'), { clipPath: 'circle(0% at 19% 143%)' });
          gsap.set(el.querySelectorAll('.pjl-label'), { opacity: 0, y: 14 });
        },
        show: el => gsap.timeline({ onComplete: () => gsap.set(el.querySelectorAll('.pjl-ray'), { clearProps: 'clipPath' }) })
          .to(el.querySelectorAll('.pjl-ray'), { clipPath: 'circle(170% at 19% 143%)', duration: 1.7, ease: 'power2.inOut', stagger: .05 })
          .to(el.querySelectorAll('.pjl-label'), { opacity: 1, y: 0, duration: .7, ease, stagger: .08, clearProps: 'opacity,transform' }, .55)
      }
    };

    // Content pages: walk the blocks after the hero and give each its recipe.
    const targets = new Map();
    const add = (el, recipe) => { if (!targets.has(el) && !el.closest(owned)) targets.set(el, recipe); };
    function walk(node, depth) {
      for (const el of node.children) {
        if (el.matches(owned) || el.matches('script, style, template, [hidden]')) continue;
        if (el.matches(CARD)) add(el, 'unfold');
        else if (el.matches(MEDIA)) add(el, 'aperture');
        else if (el.matches('h2, h3, h4')) add(el, 'rise');
        else if (el.matches('ul, ol')) [...el.children].forEach(item => item.matches(CARD) ? add(item, 'unfold') : add(item, 'tick'));
        else if (el.matches(ACTION)) add(el, 'pop');
        else if (el.matches(TEXT)) add(el, 'focus');
        else if (depth < 4 && el.children.length) walk(el, depth + 1);
        else add(el, 'focus');
      }
    }
    if (home) {
      for (const [recipe, selector] of HOME) document.querySelectorAll(selector).forEach(el => add(el, recipe));
    } else {
      const main = document.querySelector('main');
      if (main) walk(main, 0);
      const footer = document.querySelector('.page-footer');
      if (footer) walk(footer, 2);
    }

    // Only what starts below the fold is held back.
    const pending = new Set([...targets.keys()].filter(el => el.getBoundingClientRect().top >= innerHeight));
    if (!pending.size) return;
    let index = 0;
    for (const el of pending) recipes[targets.get(el)].hide(el, index++);

    const running = new Set();
    const settle = el => {
      splits.get(el)?.revert();
      splits.delete(el);
      gsap.set(el, { clearProps: 'opacity,transform,filter,clipPath' });
    };
    const reveal = elements => {
      // One stagger per batch, in reading order; long batches never wait more than half a second.
      elements.sort((a, b) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return Math.abs(ra.top - rb.top) > 8 ? ra.top - rb.top : ra.left - rb.left;
      });
      const step = Math.min(.08, .5 / elements.length);
      elements.forEach((el, i) => {
        pending.delete(el);
        observer.unobserve(el);
        const animation = recipes[targets.get(el)].show(el);
        animation.delay(i * step);
        running.add(animation);
        // then(), not onComplete: a recipe may own its timeline's onComplete.
        animation.then(() => { running.delete(animation); settle(el); });
      });
    };
    // Blocks entering in the same frame share one stagger.
    let batch = [];
    const observer = new IntersectionObserver(entries => {
      const scheduled = batch.length > 0;
      for (const entry of entries) if (entry.isIntersecting && pending.has(entry.target) && !batch.includes(entry.target)) batch.push(entry.target);
      if (batch.length && !scheduled) requestAnimationFrame(() => { const now = batch.filter(el => pending.has(el)); batch = []; if (now.length) reveal(now); });
    }, { rootMargin: '0px 0px -8% 0px' });
    pending.forEach(el => observer.observe(el));
    // The trigger line sits 8% above the bottom edge; at the end of the page the last blocks can never
    // cross it, so once the page bottoms out, whatever is on screen enters.
    const atEnd = () => {
      if (!pending.size) return removeEventListener('scroll', atEnd);
      if (innerHeight + scrollY < document.documentElement.scrollHeight - 2) return;
      const visible = [...pending].filter(el => el.getBoundingClientRect().top < innerHeight);
      if (visible.length) reveal(visible);
    };
    addEventListener('scroll', atEnd, { passive: true });

    // Keyboard, find-in-page and fragment links must never land on hidden content.
    const showNow = target => {
      const el = target instanceof Element && [...pending].find(item => item === target || item.contains(target));
      if (el) reveal([el]);
    };
    document.addEventListener('focusin', event => showNow(event.target));
    addEventListener('hashchange', () => showNow(document.getElementById(decodeURIComponent(location.hash.slice(1)))));
    if (location.hash) showNow(document.getElementById(decodeURIComponent(location.hash.slice(1))));
    reduced.addEventListener('change', () => {
      if (!reduced.matches) return;
      observer.disconnect();
      running.forEach(animation => animation.progress(1));
      pending.forEach(settle);
      pending.clear();
    }, { once: true });
  }

  if (document.readyState === 'complete') setup();
  else document.addEventListener('DOMContentLoaded', setup, { once: true });
})();
