// Reac premium — brand intro. Runs before first paint, once per session, never when motion is reduced.
// It only marks <html>; premium/intro.css paints a black veil that ends by itself and never takes
// pointer events or focus. premium/loader.js takes the veil over when it arrives in time.
// Nothing waits for load, fonts or network.
(() => {
  'use strict';
  const root = document.documentElement;
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
  root.addEventListener('animationend', event => { if (event.pseudoElement === '::before') done(); });
  setTimeout(done, 15000);
})();
