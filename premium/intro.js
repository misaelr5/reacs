// Reac premium — brand intro. Runs before first paint, once per session, never when motion is reduced.
// It only marks <html>; premium/intro.css draws a veil that fades by itself within 650 ms and never
// takes pointer events or focus. Nothing waits for load, fonts or network.
(() => {
  'use strict';
  const root = document.documentElement;
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (sessionStorage.getItem('reac_intro_seen')) return;
    sessionStorage.setItem('reac_intro_seen', '1');
  } catch { return; }
  // The CSS animation ends the veil 640 ms after it first renders, and its last keyframe already
  // hides it. These only clean up the attribute: the timeout stays well clear of the animation so a
  // slow first paint never cuts it into a flash.
  const done = () => root.removeAttribute('data-intro');
  root.setAttribute('data-intro', '');
  root.addEventListener('animationend', event => { if (event.pseudoElement === '::before') done(); });
  setTimeout(done, 15000);
})();
