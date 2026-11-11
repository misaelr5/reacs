// Reac premium — arrival motion on every page. Content-page heroes assemble once the intro veil opens,
// and lazy images develop like a progressive scan when they finish loading. It runs before the
// render-blocking reac-ui.js, so pre-states are set before the first paint; without GSAP or with
// reduced motion nothing is touched.
(() => {
  'use strict';
  const root = document.documentElement;
  const gsap = window.gsap;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!gsap || reduced.matches) return;
  const { CustomEase, SplitText, ScrambleTextPlugin } = window;
  if (CustomEase) gsap.registerPlugin(CustomEase);
  if (ScrambleTextPlugin) gsap.registerPlugin(ScrambleTextPlugin);
  const ease = CustomEase ? CustomEase.create('reacArrive', 'M0,0 C0.14,0.86 0.24,1 1,1') : 'expo.out';
  // Hidden states keep a sliver of opacity: the browser still paints the text, so Largest Contentful
  // Paint is recorded at first render instead of when the entrance finishes.
  const HIDDEN = .001;
  const running = new Set();
  const settles = [];
  const track = timeline => { running.add(timeline); timeline.then(() => running.delete(timeline)); return timeline; };

  // On a first visit the hero waits for the loader to open; otherwise it starts on the next frame.
  function whenOpen(start) {
    if (!root.hasAttribute('data-intro')) return requestAnimationFrame(start);
    let started = false;
    const go = () => { if (!started) { started = true; start(); } };
    document.addEventListener('reac:intro-done', go, { once: true });
    setTimeout(go, 2600);
  }

  function hero() {
    const hero = document.querySelector('.content-page main .page-hero');
    if (!hero) return;
    const crumbs = document.querySelector('.content-page .breadcrumbs');
    const eyebrow = hero.querySelector('.eyebrow');
    const title = hero.querySelector('h1');
    const rest = [...hero.children].filter(node => node !== eyebrow && node !== title);
    // Words, not lines: the split never depends on whether the web font has arrived yet.
    const split = title && SplitText ? SplitText.create(title, { type: 'words' }) : null;
    const scramble = eyebrow && ScrambleTextPlugin && !eyebrow.children.length;
    gsap.set([crumbs, eyebrow, ...rest].filter(Boolean), { opacity: HIDDEN });
    if (split) {
      gsap.set(title, { perspective: 700 });
      gsap.set(split.words, { opacity: HIDDEN, yPercent: 55, rotationX: -75, transformOrigin: '50% 100%' });
    } else if (title) gsap.set(title, { opacity: HIDDEN });
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      split?.revert();
      gsap.set([crumbs, eyebrow, title, ...rest].filter(Boolean), { clearProps: 'opacity,transform,filter,perspective' });
    };
    settles.push(settle);
    whenOpen(() => {
      if (settled) return;
      const timeline = gsap.timeline({ onComplete: settle });
      if (crumbs) timeline.fromTo(crumbs, { x: -14 }, { x: 0, opacity: 1, duration: .7, ease }, 0);
      if (eyebrow) timeline.to(eyebrow, scramble
        ? { opacity: 1, scrambleText: { text: eyebrow.textContent, chars: 'upperCase', revealDelay: .2, speed: .6 }, duration: .8, ease: 'none' }
        : { opacity: 1, duration: .5 }, .05);
      if (split) timeline.to(split.words, { opacity: 1, yPercent: 0, rotationX: 0, duration: 1.05, ease, stagger: .045 }, .12);
      else if (title) timeline.to(title, { opacity: 1, duration: .6 }, .12);
      if (rest.length) timeline.fromTo(rest, { y: 22, filter: 'blur(8px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: .9, ease, stagger: .09 }, .38);
      track(timeline);
    });
  }

  // A stepped clip reads like an interlaced image arriving line by line; the blur clears behind it.
  function develop() {
    for (const image of document.querySelectorAll('main img[loading="lazy"]')) {
      // Images already in view at load belong to the first paint (and LCP); only later ones develop.
      if (image.complete || image.getBoundingClientRect().top < innerHeight) continue;
      gsap.set(image, { opacity: 0 });
      image.addEventListener('load', () => {
        if (reduced.matches) { gsap.set(image, { clearProps: 'opacity' }); return; }
        track(gsap.timeline({ onComplete: () => gsap.set(image, { clearProps: 'opacity,clipPath,filter' }) })
          .set(image, { opacity: 1 })
          .fromTo(image, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .7, ease: 'steps(9)' }, 0)
          .fromTo(image, { filter: 'blur(14px) saturate(0) contrast(1.35)' }, { filter: 'blur(0px) saturate(1) contrast(1)', duration: 1.1, ease: 'power2.out' }, .12));
      }, { once: true });
      image.addEventListener('error', () => gsap.set(image, { clearProps: 'opacity' }), { once: true });
    }
  }

  hero();
  develop();
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    running.forEach(timeline => timeline.progress(1));
    settles.forEach(settle => settle());
    gsap.set('main img[loading="lazy"]', { clearProps: 'opacity,clipPath,filter' });
  }, { once: true });
})();
