// Reac premium — hero load sequence + chrome parallax, and the servicios switcher.
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
    const lines = [...hero.querySelectorAll('[data-hero-line]')];
    const fades = [...hero.querySelectorAll('[data-hero-in]')];

    // No GSAP or reduced motion: drop the CSS pre-state and show the final composition.
    if (!gsap || reduced.matches) { hero.classList.add('is-live'); return; }

    gsap.set(slabs, { '--fan': 0, '--show': 0 });
    gsap.set(arc, { '--spin': '-26deg' });
    gsap.set(lines, { yPercent: 108 });
    gsap.set(fades, { opacity: 0, y: 16 });
    hero.classList.add('is-live');

    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(arc, { '--spin': '0deg', duration: 2.4, ease: 'power3.out' }, 0)
      .to(slabs, { '--fan': 1, duration: 2, stagger: { each: .06, from: 'start' } }, 0.05)
      .to(slabs, { '--show': 1, duration: 1.1, ease: 'power2.out', stagger: .06 }, 0.05)
      .to(lines, { yPercent: 0, duration: 1.25, stagger: .1 }, 0.35)
      .to(fades, { opacity: 1, y: 0, duration: 1, stagger: .09, ease: 'power3.out', clearProps: 'transform' }, 0.85);

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
      gsap.killTweensOf([arc, ...slabs, ...lines, ...fades]);
      gsap.set(slabs, { '--fan': 1, '--show': 1 });
      gsap.set(arc, { '--spin': '0deg', '--drift': '0deg', '--tilt-x': '12deg', '--tilt-y': '-18deg' });
      gsap.set(lines, { yPercent: 0 });
      gsap.set(fades, { opacity: 1, y: 0 });
    });
  }

  function setupHeroWords() {
    const root = document.querySelector('[data-hero-words]');
    if (!root) return;
    const words = [...root.children];
    const stars = document.querySelector('[data-hero-stars]');
    let index = 0, timer = 0, visible = true;
    let animations = [];
    const fitWord = () => {
      const range = document.createRange();
      range.selectNodeContents(words[index]);
      root.style.width = Math.ceil(range.getBoundingClientRect().width) + 2 + 'px';
    };
    const settle = () => {
      animations.forEach(animation => animation.cancel());
      animations = [];
      words.forEach((word, i) => word.classList.toggle('is-current', i === index));
    };
    const schedule = () => {
      clearTimeout(timer);
      if (reduced.matches || !visible || document.hidden) return;
      timer = setTimeout(() => {
        const previous = words[index];
        index = (index + 1) % words.length;
        const next = words[index];
        next.classList.add('is-current');
        fitWord();
        const options = { duration: 750, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' };
        animations = [
          previous.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(115%)' }], options),
          next.animate([{ transform: 'translateY(-115%)' }, { transform: 'translateY(0)' }], options)
        ];
        Promise.all(animations.map(animation => animation.finished)).then(() => {
          settle(); schedule();
        }).catch(() => { /* Motion preferences or leaving the viewport cancel the transition. */ });
      }, 3200);
    };
    const update = () => {
      clearTimeout(timer); settle(); fitWord();
      schedule();
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(root);
      if (stars) {
        const observer = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          if (!reduced.matches) stars.classList.add('is-lighting');
          observer.disconnect();
        });
        observer.observe(stars);
      }
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

  const init = () => { setupHero(); setupHeroWords(); setupServices(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
