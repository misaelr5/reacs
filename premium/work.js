// Reac premium — work interactions.
// Client logo marquee (#clientes): continuous left-to-right loop with GSAP,
// eases to a stop while the logo row is hovered or focused.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const SPEED = 36; // px per second

  function setup(marquee) {
    const track = marquee.querySelector('[data-marquee-track]');
    if (!track || marquee.dataset.marqueeReady) return;
    marquee.dataset.marqueeReady = '';
    const originals = [...track.children];
    let clones = [];
    let tween = null;
    let visible = true;
    let hovered = false;
    let focused = false;
    let lastWidth = 0;

    const holding = () => hovered || focused;
    const sync = () => {
      if (!tween) return;
      const target = holding() || !visible ? 0 : 1;
      window.gsap.to(tween, { timeScale: target, duration: target ? .9 : .45, ease: 'power2.out', overwrite: true });
    };

    function teardown() {
      tween?.kill();
      tween = null;
      clones.forEach(node => node.remove());
      clones = [];
      track.style.transform = '';
      delete marquee.dataset.running;
    }

    function build() {
      teardown();
      const gsap = window.gsap;
      if (!gsap || reduced.matches) return;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const setWidth = originals.reduce((sum, node) => sum + node.getBoundingClientRect().width + gap, 0);
      if (!setWidth) return;
      // One extra set plus enough copies to cover the viewport at x = -setWidth.
      const copies = Math.ceil(marquee.clientWidth / setWidth) + 1;
      for (let i = 0; i < copies; i++) {
        for (const node of originals) {
          const clone = node.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          clone.classList.add('is-clone');
          clone.querySelectorAll('a, button, [tabindex]').forEach(el => el.setAttribute('tabindex', '-1'));
          clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
          track.append(clone);
          clones.push(clone);
        }
      }
      marquee.dataset.running = '';
      // Content travels toward the right: x runs from -setWidth up to 0, then wraps.
      tween = gsap.fromTo(track, { x: -setWidth }, { x: 0, duration: setWidth / SPEED, ease: 'none', repeat: -1 });
      if (holding() || !visible) tween.timeScale(0);
      lastWidth = innerWidth;
    }

    track.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; sync(); } });
    track.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; sync(); } });
    track.addEventListener('focusin', () => { focused = true; sync(); });
    track.addEventListener('focusout', event => { if (!track.contains(event.relatedTarget)) { focused = false; sync(); } });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (tween) tween.timeScale(holding() || !visible ? 0 : 1); }).observe(marquee);
    }

    let resizeTimer;
    addEventListener('resize', () => {
      if (innerWidth === lastWidth) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 200);
    });
    reduced.addEventListener('change', build);
    // Logo slots have fixed widths; rebuild when the viewport width changes.
    build();
  }

  function init() {
    if (!window.gsap) { addEventListener('load', init, { once: true }); return; }
    document.querySelectorAll('[data-marquee]').forEach(setup);
  }
  // Deferred before gsap.min.js, so wait until every deferred script has run.
  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
