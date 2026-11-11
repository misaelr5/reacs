// Reac premium — hero chrome entrance + parallax, rotating service words, and the servicios switcher.
// Runs on DOMContentLoaded so the deferred GSAP bundle (loaded after this file) is available.
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

  function setupHero() {
    const hero = document.querySelector('#hero-sec.p-hero');
    if (!hero) return;
    const gsap = window.gsap;
    const arc = hero.querySelector('[data-chrome-arc]');
    const slabs = [...hero.querySelectorAll('.p-chrome__slab')];

    // No GSAP or reduced motion: drop the CSS pre-state and show the final composition.
    if (!gsap || reduced.matches) { hero.classList.add('is-live'); return; }

    // Title, lead and CTAs are readable from the first render; the entrance belongs to the
    // decorative chrome only, so a slow script never hides content.
    gsap.set(slabs, { '--fan': 0, '--show': 0 });
    gsap.set(arc, { '--spin': '-26deg' });
    hero.classList.add('is-live');
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(arc, { '--spin': '0deg', duration: 2.4, ease: 'power3.out' }, 0)
      .to(slabs, { '--fan': 1, duration: 2, stagger: { each: .06, from: 'start' } }, 0.05)
      .to(slabs, { '--show': 1, duration: 1.1, ease: 'power2.out', stagger: .06 }, 0.05);

    // Slow idle drift, paused while the hero is off screen.
    const drift = gsap.to(arc, { '--drift': '3deg', duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { entry.isIntersecting ? drift.play() : drift.pause(); }).observe(hero);
    } else drift.play();

    // Pointer parallax on desktop only.
    let raf = 0, px = 0, py = 0;
    const apply = () => {
      raf = 0;
      gsap.to(arc, { '--tilt-x': (12 - py * 6) + 'deg', '--tilt-y': (-18 + px * 8) + 'deg', duration: 1.4, ease: 'power3.out', overwrite: 'auto' });
    };
    hero.addEventListener('pointermove', event => {
      if (!finePointer.matches || event.pointerType !== 'mouse') return;
      const rect = hero.getBoundingClientRect();
      px = (event.clientX - rect.left) / rect.width - .5;
      py = (event.clientY - rect.top) / rect.height - .5;
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { px = 0; py = 0; if (!raf) raf = requestAnimationFrame(apply); });
    reduced.addEventListener('change', () => {
      if (!reduced.matches) return;
      drift.kill();
      gsap.killTweensOf([arc, ...slabs]);
      gsap.set(slabs, { '--fan': 1, '--show': 1 });
      gsap.set(arc, { '--spin': '0deg', '--drift': '0deg', '--tilt-x': '12deg', '--tilt-y': '-18deg' });
    });
  }

  // Scroll writes one progress value; the glow, streak and grain read it in CSS.
  function setupAtmosphere() {
    const hero = document.querySelector('#hero-sec.p-hero');
    const atmos = hero?.querySelector('[data-hero-atmosphere]');
    if (!atmos) return;
    let frame = 0;
    const apply = () => {
      frame = 0;
      const progress = reduced.matches ? 0 : Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight));
      atmos.style.setProperty('--hero-p', progress.toFixed(3));
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(apply); };
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request, { passive: true });
    reduced.addEventListener('change', request);
    apply();
  }

  // SplitText once per element; the h1's aria-label keeps the full sentence accessible.
  const splits = new WeakMap();
  function splitChars(element) {
    if (!splits.has(element)) {
      splits.set(element, window.SplitText.create(element, { type: 'words,chars', aria: 'none', wordsClass: 'p-hero__cword', charsClass: 'p-hero__char' }).chars);
    }
    return splits.get(element);
  }

  function setupHeroWords() {
    const root = document.querySelector('[data-hero-words]');
    if (!root) return;
    const gsap = window.gsap;
    const words = [...root.children];
    const animated = () => gsap && window.SplitText && !reduced.matches;
    let index = 0, visible = true, timer = null, swapping = null;

    const wordWidth = word => {
      const range = document.createRange();
      range.selectNodeContents(word);
      return Math.ceil(range.getBoundingClientRect().width) + 2;
    };
    const fitWord = () => {
      if (swapping) return;
      const line = root.parentElement;
      const titleSize = parseFloat(getComputedStyle(line.parentElement).fontSize);
      line.style.fontSize = titleSize + 'px';
      const style = getComputedStyle(root);
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const required = Math.max(...words.map(wordWidth)) + line.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(line).columnGap) + padding;
      line.style.fontSize = Math.min(titleSize, titleSize * (line.clientWidth - 4) / required) + 'px';
      root.style.width = wordWidth(words[index]) + 'px';
    };
    const settle = () => {
      if (swapping) swapping.progress(1);
      words.forEach((word, i) => word.classList.toggle('is-current', i === index));
    };
    const schedule = () => {
      timer?.kill();
      timer = null;
      if (!animated() || !visible || document.hidden) return;
      timer = gsap.delayedCall(3.2, change);
    };
    // The old phrase falls out of its mask while the new one lands from above, letter by letter.
    const change = () => {
      const previous = words[index];
      index = (index + 1) % words.length;
      const next = words[index];
      const out = splitChars(previous), incoming = splitChars(next);
      next.classList.add('is-current');
      const width = wordWidth(next);
      gsap.set(incoming, { yPercent: -112, opacity: 0 });
      swapping = gsap.timeline({
        onComplete() {
          swapping = null;
          previous.classList.remove('is-current');
          gsap.set([...out, ...incoming], { clearProps: 'transform,opacity' });
          schedule();
        }
      })
        .to(out, { yPercent: 112, opacity: 0, duration: .42, ease: 'power3.in', stagger: .009 }, 0)
        .to(root, { width, duration: .9, ease: 'expo.inOut' }, .05)
        .to(incoming, { yPercent: 0, duration: .8, ease: 'expo.out', stagger: .017 }, .3)
        .to(incoming, { opacity: 1, duration: .32, ease: 'power1.out', stagger: .017 }, .3);
    };
    const update = () => {
      timer?.kill();
      settle();
      fitWord();
      schedule();
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(root);

    }
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', update);
    window.addEventListener('resize', fitWord, { passive: true });
    document.fonts?.ready.then(fitWord);
    update();
  }

  function setupServices() {
    const root = document.querySelector('[data-plans]');
    if (!root) return;
    const plans = [...root.querySelectorAll('.p-plan')];

    // Sheen follows the pointer on desktop; CSS falls back to a fixed top glow.
    plans.forEach(plan => {
      plan.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse' || !finePointer.matches || reduced.matches) return;
        const box = plan.getBoundingClientRect();
        plan.style.setProperty('--mx', `${event.clientX - box.left}px`);
        plan.style.setProperty('--my', `${event.clientY - box.top}px`);
      });
      plan.addEventListener('pointerleave', () => {
        plan.style.removeProperty('--mx');
        plan.style.removeProperty('--my');
      });
    });

    if (reduced.matches || !('IntersectionObserver' in window)) return;
    root.dataset.reveal = 'ready';
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        root.dataset.reveal = 'on';
        observer.disconnect();
      }
    }, { threshold: .2 });
    observer.observe(root);
  }

  const init = () => { setupHero(); setupAtmosphere(); setupHeroWords(); setupServices(); };
  // Deferred scripts run while readyState is already 'interactive', before gsap.min.js; wait for DOMContentLoaded.
  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
