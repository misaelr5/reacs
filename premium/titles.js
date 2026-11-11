// Reac premium — section title entrances. Each module gets its own motion, tied to what its title says.
// Titles opt in with data-title-fx. The HTML stays readable without JS, GSAP or with reduced motion,
// and every split is reverted once its entrance finishes.
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const GLYPHS = '?¿#%&*+=<>/01';
  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const flapGlyph = final => final === final.toLowerCase() ? pick(UPPER).toLowerCase() : pick(UPPER);
  const BLUE = '#6E74FF';
  const BEAM = '#8EA2FF';

  // Swapping glyphs must not reflow the title: freeze each char at its real width first.
  function freezeWidths(chars) {
    const widths = chars.map(char => char.getBoundingClientRect().width);
    chars.forEach((char, i) => { char.style.width = widths[i] + 'px'; char.style.textAlign = 'center'; });
  }

  function center(element) {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  const effects = {
    // Proceso: letters travel down the fan's beams from its origin, bottom left, and cool from beam blue to ink.
    converge(title, gsap, split) {
      const box = title.getBoundingClientRect();
      const origin = { x: box.left - box.width * .15, y: box.bottom + box.height * 1.6 };
      const chars = split.chars.map(char => {
        const point = center(char);
        return { char, dx: point.x - origin.x, dy: point.y - origin.y };
      }).sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy));
      const timeline = gsap.timeline();
      chars.forEach(({ char, dx, dy }, i) => {
        timeline.from(char, { x: -dx * .42, y: -dy * .42, opacity: 0, color: BEAM, filter: 'blur(6px)', duration: 1, ease: 'expo.out' }, i * .016);
      });
      return timeline;
    },

    // Servicios: a split-flap board, like a price list settling letter by letter.
    flap(title, gsap, split) {
      freezeWidths(split.chars);
      gsap.set(split.words, { perspective: 520 });
      const timeline = gsap.timeline();
      split.chars.forEach((char, i) => {
        const final = char.textContent;
        const flips = 2 + i % 3;
        let count = 0;
        timeline.fromTo(char, { rotationX: -88, opacity: .2 }, {
          rotationX: 0, opacity: 1, duration: .11, ease: 'power1.in', repeat: flips, transformOrigin: '50% 55%',
          onStart() { char.textContent = flapGlyph(final); },
          onRepeat() { count++; char.textContent = count === flips ? final : flapGlyph(final); }
        }, i * .05);
      });
      return timeline;
    },

    // Proyectos: a scanner passes "behind the work"; each letter lights up as the beam crosses it.
    scan(title, gsap, split) {
      const line = document.createElement('span');
      line.className = 'tfx-scanline';
      line.setAttribute('aria-hidden', 'true');
      title.append(line);
      const box = title.getBoundingClientRect();
      const sweep = 1.25;
      const timeline = gsap.timeline()
        .fromTo(line, { left: '0%', opacity: 0 }, { left: '100%', opacity: 1, duration: sweep, ease: 'none' }, 0)
        .to(line, { opacity: 0, duration: .3 }, sweep - .1);
      split.chars.forEach(char => {
        const at = (center(char).x - box.left) / box.width;
        timeline.fromTo(char, { opacity: 0, y: 8, color: BLUE, textShadow: '0 0 18px rgba(110,116,255,.95)' },
          { opacity: 1, y: 0, color: getComputedStyle(char).color, textShadow: '0 0 0px rgba(110,116,255,0)', duration: .7, ease: 'power3.out' }, at * sweep);
      });
      return timeline;
    },

    // Testimonios: the plain line pops in like chat bubbles; the italic answer is inked by hand under a pen stroke.
    voices(title, gsap, split) {
      const accent = title.querySelector('em');
      const plain = split.words.filter(word => !accent?.contains(word));
      const ink = split.chars.filter(char => accent?.contains(char));
      const timeline = gsap.timeline()
        .from(plain, { yPercent: 55, scale: .6, opacity: 0, transformOrigin: '0% 100%', duration: .7, ease: 'back.out(2.4)', stagger: .07 });
      if (!accent) return timeline;
      const stroke = document.createElement('span');
      stroke.className = 'tfx-stroke';
      stroke.setAttribute('aria-hidden', 'true');
      accent.append(stroke);
      const writing = ink.length * .03 + .5;
      return timeline
        .from(ink, { opacity: 0, x: -6, skewX: -28, filter: 'blur(5px)', duration: .5, ease: 'power2.out', stagger: .03 }, '-=.3')
        .fromTo(stroke, { scaleX: 0 }, { scaleX: 1, duration: writing, ease: 'power1.inOut' }, '<')
        .to(stroke, { scaleX: 0, transformOrigin: '100% 50%', duration: .5, ease: 'power3.inOut' }, '+=.25');
    },

    // Sobre Reac: two teams close like a zipper; odd letters drop in, even letters rise, and they meet on the line.
    zipper(title, gsap, split) {
      const timeline = gsap.timeline();
      split.chars.forEach((char, i) => {
        timeline.from(char, { yPercent: i % 2 ? 120 : -120, duration: .75, ease: 'expo.out' }, i * .02);
      });
      return timeline;
    },

    // FAQ: every letter starts as a question and decodes, out of order, into the answer.
    decode(title, gsap, split) {
      freezeWidths(split.chars);
      const finals = new Map(split.chars.map(char => [char, char.textContent]));
      const ink = getComputedStyle(title).color;
      split.chars.forEach(char => { char.textContent = '?'; char.style.color = 'var(--p-silver)'; });
      const timeline = gsap.timeline();
      gsap.utils.shuffle(split.chars.slice()).forEach((char, i) => {
        const ticks = 4 + i % 5;
        const state = { step: 0 };
        let last = -1;
        const start = i * .035;
        timeline.to(state, {
          step: ticks, duration: ticks * .055, ease: 'none',
          onUpdate() {
            const step = Math.floor(state.step);
            if (step === last) return;
            last = step;
            char.textContent = step >= ticks ? finals.get(char) : pick(GLYPHS);
          }
        }, start)
          .fromTo(char, { color: BLUE }, { color: ink, duration: .55, ease: 'power2.out' }, start + ticks * .055);
      });
      return timeline;
    },

    // Recursos: a highlighter ticks off the checklist, word by word.
    check(title, gsap, split) {
      const timeline = gsap.timeline();
      split.words.forEach((word, i) => {
        const bar = document.createElement('span');
        bar.className = 'tfx-bar';
        bar.setAttribute('aria-hidden', 'true');
        word.append(bar);
        gsap.set(word, { color: 'transparent' });
        const start = i * .085;
        timeline.fromTo(bar, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: .3, ease: 'power3.in' }, start)
          .set(word, { clearProps: 'color' }, start + .3)
          .to(bar, { scaleX: 0, transformOrigin: '100% 50%', duration: .42, ease: 'power3.out' }, start + .3);
      });
      return timeline;
    },

    // Contacto: the question is tossed onto the table and its ¿ ? marks swing until they settle.
    ask(title, gsap, split) {
      const marks = split.chars.filter(char => /[¿?]/.test(char.textContent));
      return gsap.timeline()
        .from(split.words, { y: -56, rotation: () => gsap.utils.random(-10, 10), opacity: 0, duration: .85, ease: 'back.out(1.7)', stagger: .065 })
        .from(marks, { rotation: i => i ? 64 : -64, transformOrigin: '50% 8%', duration: 1.6, ease: 'elastic.out(1, .3)' }, .25);
    }
  };

  const splitTypes = { check: 'words', zipper: 'words,chars' };

  function play(title) {
    const gsap = window.gsap;
    const effect = effects[title.dataset.titleFx];
    let split;
    try {
      split = window.SplitText.create(title, {
        type: splitTypes[title.dataset.titleFx] || 'words,chars',
        mask: title.dataset.titleFx === 'zipper' ? 'words' : undefined,
        wordsClass: 'tfx-word', charsClass: 'tfx-char'
      });
      title.classList.remove('tfx-pending');
      const timeline = effect(title, gsap, split);
      const finish = () => {
        title.querySelectorAll('.tfx-scanline, .tfx-stroke').forEach(node => node.remove());
        split.revert();
        title.removeAttribute('data-title-playing');
      };
      title.dataset.titlePlaying = '';
      timeline.eventCallback('onComplete', finish);
      return timeline;
    } catch (error) {
      split?.revert();
      title.classList.remove('tfx-pending');
      throw error;
    }
  }

  function setup() {
    const gsap = window.gsap;
    const titles = [...document.querySelectorAll('[data-title-fx]')].filter(title => effects[title.dataset.titleFx]);
    if (!titles.length || !gsap || !window.SplitText || reduced.matches || !('IntersectionObserver' in window)) return;
    gsap.registerPlugin(window.SplitText);
    const running = new Set();
    // Only titles still below the fold are held back; anything already on screen stays as authored.
    const pending = titles.filter(title => title.getBoundingClientRect().top >= innerHeight);
    pending.forEach(title => title.classList.add('tfx-pending'));
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const title = entry.target;
        observer.unobserve(title);
        document.fonts.ready.then(() => {
          if (reduced.matches) { title.classList.remove('tfx-pending'); return; }
          const timeline = play(title);
          running.add(timeline);
          timeline.then(() => running.delete(timeline));
        });
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    pending.forEach(title => observer.observe(title));
    reduced.addEventListener('change', () => {
      if (!reduced.matches) return;
      observer.disconnect();
      running.forEach(timeline => timeline.progress(1));
      pending.forEach(title => title.classList.remove('tfx-pending'));
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
