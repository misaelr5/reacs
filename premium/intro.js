// Reac premium — brand intro. Loaded defer + blocking=render, so it runs before the first paint without
// stalling the parser. The veil shows once per session, never when motion is reduced.
// It only marks <html>; premium/intro.css paints a black veil that ends by itself and never takes
// pointer events or focus. On that visit it fetches premium/loader.js, which takes the veil over when
// it arrives in time.
// Nothing waits for load, fonts or network.
(() => {
  'use strict';
  const root = document.documentElement;
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Every page: intro.css holds the content-page hero at its entrance pre-state until arrival.js
    // (deferred, outside the render-blocking chain) takes it over.
    root.classList.add('reac-arrive');
    if (sessionStorage.getItem('reac_intro_seen')) return;
    sessionStorage.setItem('reac_intro_seen', '1');
  } catch { return; }
  // The CSS veil ends itself; these only clean up and announce that the page is open. The timeout
  // stays well clear of the animation so a slow first paint never cuts it into a flash.
  const done = () => {
    if (!root.hasAttribute('data-intro') || root.getAttribute('data-intro') === 'live') return;
    root.removeAttribute('data-intro');
    document.dispatchEvent(new Event('reac:intro-done'));
  };
  root.setAttribute('data-intro', '');
  // The full loader (and its WebGL chunk) is fetched only now, on the visit that shows the veil.
  const loader = document.currentScript?.dataset.loader;
  if (loader) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = loader;
    document.head.append(script);
  }
  root.addEventListener('animationend', event => { if (event.pseudoElement === '::before') done(); });
  setTimeout(done, 15000);
})();
