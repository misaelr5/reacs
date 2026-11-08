// Reac premium — sections interactions.
// Proceso: the rail fills step by step as the reader reaches each stage and stays filled
// above the fold (reac-ui.js toggles .is-lit only while a step is on screen).
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function setupProcessRail() {
    const steps = [...document.querySelectorAll('#proceso .prc-step')];
    if (!steps.length) return;
    const markAll = () => steps.forEach(step => step.classList.add('is-reached'));
    if (reduced.matches) { markAll(); return; }
    let frame = 0;
    const sync = () => {
      frame = 0;
      if (reduced.matches) { markAll(); return; }
      const line = innerHeight * 0.78;
      for (const step of steps) {
        const reached = step.getBoundingClientRect().top < line;
        step.classList.toggle('is-reached', reached);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    reduced.addEventListener('change', () => { if (reduced.matches) markAll(); });
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupProcessRail, { once: true });
  else setupProcessRail();
})();
