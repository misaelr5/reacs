// /proyectos: progressive GSAP entrances, with every project available without JS.
(() => {
  'use strict';
  function init() {
    const gsap = window.gsap;
    if (!gsap || !document.querySelector('.ppj-grid')) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', context => {
      const hero = document.querySelector('.ppj-hero');
      const slabs = [...document.querySelectorAll('.p-chrome__slab')];
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(slabs, { '--fan': 0, '--show': 0 }, { '--fan': 1, '--show': 1, duration: 1.6, stagger: .04 }, 0)
        .from(hero.querySelector('h1'), { y: 56, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, .12)
        .from(hero.querySelector('.ppj-hero__foot'), { y: 30, opacity: 0, duration: .85, clearProps: 'transform,opacity' }, .35);

      const targets = [...document.querySelectorAll('.ppj-about > *, .ppj-portfolio__head, .ppj-item, .page-actions, .page-footer')];
      const pending = new Set(targets);
      const counter = document.querySelector('[data-project-total]');
      const total = Number(counter.textContent);
      // Only transform and opacity animate; layout and native scrolling stay untouched.
      gsap.set(targets, { y: 48, opacity: 0 });
      const reveal = elements => {
        elements.forEach(el => pending.delete(el));
        gsap.to(elements, { y: 0, opacity: 1, duration: .85, stagger: .1, ease: 'power3.out', clearProps: 'transform,opacity', overwrite: 'auto' });
        if (elements.some(el => el.contains(counter))) {
          const value = { count: 0 };
          gsap.to(value, { count: total, duration: 1.1, ease: 'power2.out', onUpdate: () => { counter.textContent = Math.round(value.count); }, onComplete: () => { counter.textContent = total; } });
        }
      };
      const observer = new IntersectionObserver(entries => {
        const entering = entries.filter(entry => entry.isIntersecting && pending.has(entry.target)).map(entry => entry.target);
        entering.forEach(el => observer.unobserve(el));
        // Observer callbacks run outside matchMedia's initial context.
        if (entering.length) context.add(() => reveal(entering));
      }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
      targets.forEach(el => observer.observe(el));
      // Keyboard and fragment navigation must never land on transparent content.
      const showTarget = target => {
        const element = target instanceof Element ? target : null;
        const item = element && targets.find(el => el === element || el.contains(element));
        if (item && pending.has(item)) { observer.unobserve(item); context.add(() => reveal([item])); }
      };
      const onFocus = event => showTarget(event.target);
      const onHash = () => showTarget(document.getElementById(location.hash.slice(1)));
      document.addEventListener('focusin', onFocus);
      window.addEventListener('hashchange', onHash);
      onHash();
      return () => {
        observer.disconnect();
        document.removeEventListener('focusin', onFocus);
        window.removeEventListener('hashchange', onHash);
        counter.textContent = total;
      };
    });
  }
  // Wait for the GSAP deferred script, which follows this file in the page.
  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
