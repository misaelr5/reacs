(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Map();
  let active;
  function reveal(target) {
    if (preference.matches || !window.gsap) return;
    const nodes = gsap.utils.toArray(target).filter(node => node.getClientRects().length);
    if (!nodes.length) return;
    for (const [tween, elements] of animations) {
      if (elements.some(element => nodes.includes(element))) { tween.kill(); gsap.set(elements, { clearProps: 'opacity,transform' }); animations.delete(tween); }
    }
    const tween = gsap.fromTo(nodes, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .36, stagger: .035, ease: 'power3.out', clearProps: 'opacity,transform', onComplete: () => animations.delete(tween) });
    animations.set(tween, nodes);
  }
  // Flush a pending DOM update exactly once before a rapid subsequent action.
  // Animation cancellation must never cancel the user's action.
  function change(update) {
    if (active) { active.flush(); active.transition.skipTransition(); active = null; }
    if (preference.matches || !document.startViewTransition) { update(); return Promise.resolve(); }
    let done = false;
    const flush = () => { if (!done) { done = true; update(); } };
    let transition;
    try { transition = document.startViewTransition(flush); } catch { flush(); return Promise.resolve(); }
    const current = { transition, flush }; active = current;
    transition.ready.catch(() => {});
    transition.finished.catch(() => {}).finally(() => { if (active === current) active = null; });
    return transition.updateCallbackDone;
  }
  preference.addEventListener('change', () => {
    if (!preference.matches) return;
    active?.flush(); active?.transition.skipTransition();
    for (const [tween, nodes] of animations) { tween.kill(); gsap.set(nodes, { clearProps: 'opacity,transform' }); }
    animations.clear();
  });
  window.ReacMotion = { reveal, change };
})();
