// Reac premium — first-visit loader. intro.js has already painted a black veil before first paint;
// this module takes it over with an OGL dither field, traces the Reac symbol with DrawSVG, decodes the
// name with ScrambleText, then burns the veil open and lands the symbol on the navigation mark.
// It never takes pointer events, and when it arrives late it leaves intro.css to finish on its own.
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const LATE = 1100;

const SYMBOL = [
  'M207 394 306 291c17-17 34-25 61-25h339c55 0 99 45 99 100v46c0 31-12 59-35 82L668 583l166 179h-84L601 601l66-68 52-51c12-12 18-27 18-45v-50c0-28-23-50-51-50H418c-11 0-20 4-28 12l-34 38-149 7Z',
  'M649 383H495c-18 0-31 6-45 20L319 535c-29 29-45 59-45 91v137l89-94v-51l162-175c31-34 70-54 124-60Z',
  'M516 527v52c0 20 7 36 21 50l135 133h-104l-90-94c-16-17-24-35-24-57v-20l62-64Z'
];

function navMark() {
  for (const mark of document.querySelectorAll('.site-brand-mark')) {
    const rect = mark.getBoundingClientRect();
    if (rect.width && rect.bottom > 0 && rect.top < innerHeight && getComputedStyle(mark).visibility === 'visible') return rect;
  }
  return null;
}

// OGL and the shaders are a separate chunk, fetched only when the loader actually runs.
async function field(canvas) {
  try {
    const { createField } = await import('./loader-field.js');
    return createField(canvas);
  } catch {
    return null;
  }
}

// The symbol and veil take over at once; the shader field joins when OGL is ready. A slow device
// (shader compile, busy main thread) simply exits with a fade instead of the burn.
function run() {
  const { gsap, ScrambleTextPlugin, CustomEase } = window;
  if (root.getAttribute('data-intro') !== '' || reduced.matches) return;
  if (!gsap || !ScrambleTextPlugin || !CustomEase || performance.now() > LATE) return;
  gsap.registerPlugin(DrawSVGPlugin, ScrambleTextPlugin, CustomEase);

  const veil = document.createElement('div');
  veil.className = 'rl rl--flat';
  veil.setAttribute('aria-hidden', 'true');
  veil.innerHTML = `<canvas class="rl-field"></canvas><div class="rl-core"><svg class="rl-mark" viewBox="0 0 1024 1024">
    <defs><linearGradient id="rl-stroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2F4F8"/><stop offset=".55" stop-color="#6E74FF"/><stop offset="1" stop-color="#FA3601"/></linearGradient></defs>
    ${SYMBOL.map(d => `<path d="${d}"/>`).join('')}</svg><p class="rl-name"></p></div>`;
  document.body.append(veil);
  root.setAttribute('data-intro', 'live');

  const canvas = veil.querySelector('canvas');
  const mark = veil.querySelector('.rl-mark');
  const paths = [...mark.querySelectorAll('path')];
  const name = veil.querySelector('.rl-name');
  let gl = null;
  let exiting = false;
  let finished = false;
  const start = gsap.ticker.time;
  const tick = () => { if (gl) { gl.uniforms.uTime.value = gsap.ticker.time - start; gl.render(); } };
  gsap.ticker.add(tick);
  field(canvas).then(ready => {
    if (!ready) return;
    if (exiting || finished) { ready.destroy(); return; }
    gl = ready;
    gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: .35, ease: 'power1.out' });
  });

  const opened = () => document.dispatchEvent(new Event('reac:intro-done'));
  const finish = () => {
    if (finished) return;
    finished = true;
    gsap.ticker.remove(tick);
    gl?.destroy();
    veil.remove();
    root.removeAttribute('data-intro');
  };
  const exit = () => {
    exiting = true;
    opened();
    // Burn the veil open when the field is on screen; otherwise fade it.
    if (gl && Number(gsap.getProperty(canvas, 'opacity')) > .9) {
      veil.classList.remove('rl--flat');
      gsap.to(gl.uniforms.uReveal, { value: 1, duration: .85, ease: 'power2.inOut' });
    } else gsap.to(veil, { opacity: 0, duration: .6, ease: 'power2.inOut' });
    // Land the symbol on the navigation mark when one is on screen; otherwise let it fade in place.
    const from = mark.getBoundingClientRect();
    const to = navMark();
    if (to) gsap.to(mark, {
      x: to.left + to.width / 2 - (from.left + from.width / 2), y: to.top + to.height / 2 - (from.top + from.height / 2),
      scale: to.width / from.width, duration: .8, ease: 'expo.inOut'
    });
    gsap.to(mark, { opacity: 0, duration: .25, delay: to ? .62 : .1, ease: 'power1.in' });
  };

  CustomEase.create('reacDraw', 'M0,0 C0.2,0 0.12,0.62 0.42,0.86 0.62,1 0.8,1 1,1');
  const timeline = gsap.timeline({ onComplete: finish })
    .fromTo(paths, { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: .8, ease: 'reacDraw', stagger: .1 }, 0)
    .to(paths, { fillOpacity: 1, strokeOpacity: 0, duration: .4, ease: 'power2.out', stagger: .06 }, .62)
    .to(name, { scrambleText: { text: 'REAC STUDIO', chars: '01/<>#', revealDelay: .25, speed: .7 }, duration: .85, ease: 'none' }, .12)
    .to(name, { opacity: 0, y: -6, duration: .3, ease: 'power2.in' }, 1.08)
    .add(exit, 1.12)
    .to({}, { duration: .9 }, 1.12);

  reduced.addEventListener('change', () => {
    if (!reduced.matches || finished) return;
    if (!exiting) opened();
    timeline.progress(1);
  }, { once: true });
}

run();
