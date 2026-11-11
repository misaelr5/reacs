// Reac premium — work interactions.
// Logos and testimonials share the same continuous left-to-right GSAP loop.
// Readable strips pause on hover and offer a static keyboard reading mode.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const SPEED = 36; // px per second

  function setup(marquee) {
    const track = marquee.querySelector('[data-marquee-track]');
    if (!track || marquee.hasAttribute('data-marquee-ready')) return;
    marquee.dataset.marqueeReady = '';
    const viewport = marquee.querySelector('[data-marquee-viewport]') || marquee;
    const readable = marquee.hasAttribute('data-marquee-readable');
    const originals = [...track.children];
    let clones = [];
    let tween = null;
    let visible = true;
    let hovered = false;
    let focused = false;
    let reading = false;
    let lastWidth = 0;

    const holding = () => hovered || focused;
    const sync = () => {
      if (!tween) return;
      const target = holding() || !visible ? 0 : 1;
      window.gsap.to(tween, { timeScale: target, duration: target ? .9 : .45, ease: 'power2.out', overwrite: true });
    };

    function teardown() {
      if (tween) window.gsap.killTweensOf(tween);
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
      lastWidth = innerWidth;
      if (!gsap || reduced.matches || reading) return;
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
          // A review card's tabindex belongs only to the original, readable copy.
          if (clone.matches('a, button')) clone.setAttribute('tabindex', '-1');
          else clone.removeAttribute('tabindex');
          clone.removeAttribute('id');
          clone.querySelectorAll('a, button, [tabindex]').forEach(el => el.setAttribute('tabindex', '-1'));
          clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
          track.append(clone);
          clones.push(clone);
        }
      }
      marquee.dataset.running = '';
      viewport.scrollLeft = 0;
      // Content travels toward the right by default: x runs from -setWidth up to 0, then wraps.
      const toLeft = marquee.dataset.marqueeDir === 'left';
      const duration = setWidth / (Number(marquee.dataset.marqueeSpeed) || SPEED);
      tween = gsap.fromTo(track, { x: toLeft ? 0 : -setWidth }, { x: toLeft ? -setWidth : 0, duration, ease: 'none', repeat: -1 });
      if (holding() || !visible) tween.timeScale(0);
    }

    track.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; sync(); } });
    track.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; sync(); } });
    track.addEventListener('focusin', event => {
      const alreadyFocused = focused;
      focused = true;
      // A pressed link must not move under the pointer, so link rows only stop for the keyboard.
      if (readable && (!marquee.hasAttribute('data-marquee-links') || event.target.matches(':focus-visible'))) {
        // Show the original items in native scroll order for keyboard reading.
        if (!reading) { reading = true; build(); }
        if (event.target !== track) event.target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      } else if (!alreadyFocused) sync();
    });
    track.addEventListener('focusout', event => {
      if (track.contains(event.relatedTarget)) return;
      focused = false;
      if (reading) { reading = false; build(); }
      else sync();
    });

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
    // Both strips have fixed item widths at each viewport size.
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
