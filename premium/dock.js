// Reac premium — footer dock magnification. Runs for a mouse only; without it the icons keep their base size.
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const BASE = 46, MAX = 74, REACH = 130;

  function setupDock() {
    for (const dock of document.querySelectorAll('[data-dock]')) {
    const items = [...dock.querySelectorAll('.p-dock__item')];
    let frame = 0, pointerX = 0;
    const apply = () => {
      frame = 0;
      for (const item of items) {
        const box = item.getBoundingClientRect();
        const distance = Math.min(1, Math.abs(pointerX - (box.left + box.width / 2)) / REACH);
        const curve = Math.cos(distance * Math.PI / 2) ** 2;
        item.style.setProperty('--item', `${(BASE + (MAX - BASE) * curve).toFixed(1)}px`);
      }
    };
    dock.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !finePointer.matches || reduced.matches) return;
      pointerX = event.clientX;
      if (!frame) frame = requestAnimationFrame(apply);
    }, { passive: true });
    const reset = () => items.forEach(item => item.style.removeProperty('--item'));
    dock.addEventListener('pointerleave', () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      reset();
    });
    reduced.addEventListener('change', () => { if (reduced.matches) reset(); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupDock, { once: true });
  else setupDock();
})();
