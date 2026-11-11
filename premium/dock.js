// Reac premium — hero dock magnification. Runs for a mouse only; without it the icons keep their base size.
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const BASE = 46, MAX = 74, REACH = 130;

  function setupDock() {
    for (const dock of document.querySelectorAll('[data-dock]')) {
    const isMenu = dock.classList.contains('p-menu__grid');
    const items = [...dock.querySelectorAll(isMenu ? ':scope > a' : '.p-dock__item')];
    const caption = dock.parentElement.querySelector('.p-menu__caption');
    let activeView;
    const cancelView = () => {
      if (!activeView) return;
      activeView.skipTransition();
      activeView = null;
      caption.style.removeProperty('view-transition-name');
      document.documentElement.classList.remove('reac-dock-vt');
    };
    const showLabel = label => {
      if (!caption || caption.textContent === label) return;
      cancelView();
      const update = () => { caption.textContent = label; };
      if (reduced.matches || !document.startViewTransition) { update(); return; }
      caption.style.viewTransitionName = 'reac-dock-label';
      document.documentElement.classList.add('reac-dock-vt');
      const transition = document.startViewTransition(() => { if (activeView === transition) update(); });
      activeView = transition;
      transition.ready.catch(() => {});
      transition.finished.catch(() => {}).finally(() => {
        if (activeView !== transition) return;
        activeView = null;
        caption.style.removeProperty('view-transition-name');
        document.documentElement.classList.remove('reac-dock-vt');
      });
    };
    items.forEach(item => {
      item.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') showLabel(item.getAttribute('aria-label') || ''); });
      item.addEventListener('focus', () => showLabel(item.getAttribute('aria-label') || ''));
      item.addEventListener('click', cancelView);
    });
    dock.addEventListener('focusout', event => { if (!dock.contains(event.relatedTarget)) showLabel('\u00a0'); });
    dock.closest('details')?.addEventListener('toggle', event => { if (!event.target.open) { cancelView(); caption.textContent = '\u00a0'; } });
    let frame = 0, pointerX = 0;
    const apply = () => {
      frame = 0;
      for (const item of items) {
        const box = item.getBoundingClientRect();
        const distance = Math.min(1, Math.abs(pointerX - (box.left + box.width / 2)) / REACH);
        const curve = Math.cos(distance * Math.PI / 2) ** 2;
        if (isMenu) item.style.setProperty('--dock-scale', (1 + .3 * curve).toFixed(3));
        else item.style.setProperty('--item', `${(BASE + (MAX - BASE) * curve).toFixed(1)}px`);
      }
    };
    dock.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !finePointer.matches || reduced.matches) return;
      pointerX = event.clientX;
      if (!frame) frame = requestAnimationFrame(apply);
    }, { passive: true });
    dock.addEventListener('pointerleave', () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      items.forEach(item => { item.style.removeProperty('--item'); item.style.removeProperty('--dock-scale'); });
      if (!dock.contains(document.activeElement)) showLabel('\u00a0');
    });
    reduced.addEventListener('change', () => {
      if (reduced.matches) { cancelView(); items.forEach(item => { item.style.removeProperty('--item'); item.style.removeProperty('--dock-scale'); }); }
    });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupDock, { once: true });
  else setupDock();
})();
