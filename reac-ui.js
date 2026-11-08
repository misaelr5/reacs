(function () {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(min-width: 981px) and (hover: hover) and (pointer: fine)');
  const query = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];

  function init() {
    root.classList.add('js');
    setupHeroTitle();
    setupHomeNav();
    setupReveal();
    setupBento();
    setupComparison();
    setupSimulator();
    setupCaseDecks();
  }

  function setupCaseDecks() {
    for (const deck of all('[data-case-deck]')) {
      const cards = [...deck.querySelectorAll('.case-card')];
      if (cards.length < 2) continue;
      const controls = deck.querySelector('.case-deck-controls');
      const picker = deck.querySelector('.case-deck-picker');
      const choices = [...picker.querySelectorAll('[data-case-go]')];
      let current = 0;
      let animations = [];
      let revision = 0;
      function settle() {
        revision++;
        for (const animation of animations) animation.cancel();
        animations = [];
        cards.forEach(card => card.classList.remove('is-leaving'));
      }
      function select(index, direction = 1, animate = true) {
        const next = (index + cards.length) % cards.length;
        const previous = cards[current];
        settle();
        const changed = next !== current;
        current = next;
        cards.forEach((card, i) => {
          const active = i === current;
          card.classList.toggle('is-active', active);
          card.inert = !active;
          card.setAttribute('aria-hidden', String(!active));
        });
        choices.forEach((button, i) => button.setAttribute('aria-pressed', String(i === current)));
        deck.querySelector('[data-case-count]').textContent = `${current + 1} / ${cards.length}`;
        deck.querySelector('[data-case-name]').textContent = cards[current].querySelector('h2,h3').textContent;
        // A hash or gesture can hide a focused link. Keep focus in the controls.
        if (previous.contains(document.activeElement) && changed) deck.querySelector('[data-case-next]').focus({ preventScroll: true });
        if (!changed || !animate || reduced.matches || !previous.animate) return;
        const incoming = cards[current];
        previous.classList.add('is-leaving');
        const timing = { duration: 540, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' };
        animations = [
          previous.animate([{ transform: 'translateX(0) scale(1)', opacity: 1 }, { transform: `translateX(${-direction * 32}%) scale(.96)`, opacity: 0 }], timing),
          incoming.animate([{ transform: `translateX(${direction * 100}%) scale(.98)`, opacity: .55 }, { transform: 'translateX(0) scale(1)', opacity: 1 }], timing)
        ];
        const token = revision;
        Promise.allSettled(animations.map(animation => animation.finished)).then(() => { if (token === revision) settle(); });
      }
      deck.querySelector('[data-case-prev]').addEventListener('click', () => select(current - 1, -1));
      deck.querySelector('[data-case-next]').addEventListener('click', () => select(current + 1));
      choices.forEach((button, index) => button.addEventListener('click', () => select(index, index >= current ? 1 : -1)));
      deck.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Home') select(0, -1);
        else if (event.key === 'End') select(cards.length - 1);
        else select(current + (event.key === 'ArrowRight' ? 1 : -1), event.key === 'ArrowRight' ? 1 : -1);
      });
      let touchStart;
      deck.addEventListener('touchstart', event => {
        const touch = event.touches.length === 1 ? event.touches[0] : null;
        touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }, { passive: true });
      deck.addEventListener('touchend', event => {
        if (!touchStart || !event.changedTouches[0]) return;
        const dx = event.changedTouches[0].clientX - touchStart.x;
        const dy = event.changedTouches[0].clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) select(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }, { passive: true });
      deck.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
      reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
      function selectHash() {
        const index = cards.findIndex(card => '#' + card.id === location.hash);
        if (index !== -1) select(index, 1, false);
      }
      controls.hidden = false;
      picker.hidden = false;
      select(0, 1, false);
      selectHash();
      deck.dataset.enhanced = 'true';
      addEventListener('hashchange', selectHash);
    }
  }

  function setupHeroTitle() {
    const title = query('.hero-t1');
    if (!title || reduced.matches || title.dataset.animated) return;
    const text = title.textContent;
    const fragment = document.createDocumentFragment();
    let index = 0;
    for (const token of text.split(/(\s+)/)) {
      if (/^\s+$/.test(token)) {
        fragment.append(document.createTextNode(token));
        continue;
      }
      const word = document.createElement('span');
      word.className = 'hero-word';
      word.setAttribute('aria-hidden', 'true');
      for (const letter of Array.from(token)) {
        const character = document.createElement('span');
        character.className = 'hero-char';
        character.textContent = letter;
        character.style.setProperty('--char-delay', (80 + index++ * 22) + 'ms');
        word.append(character);
      }
      fragment.append(word);
    }
    title.setAttribute('aria-label', text);
    title.dataset.animated = 'true';
    title.replaceChildren(fragment);
  }

  function setupHomeNav() {
    const nav = query('.site-nav');
    const hero = query('#hero-sec');
    if (!nav || !hero) return;
    let frame = 0;
    const sync = () => {
      frame = 0;
      nav.classList.toggle('nav-hidden', hero.getBoundingClientRect().bottom > 0);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    sync();
  }

  function setupReveal() {
    if (!('IntersectionObserver' in window) || reduced.matches) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    for (const element of all('.reveal, .tj-head, .tj-sub, .tj-card')) {
      // Only enhance content below the viewport; loading failures leave HTML visible.
      if (element.getBoundingClientRect().top >= innerHeight && fine.matches) {
        element.classList.add('reveal-ready');
        element.style.transitionDelay = Math.min(400, Number(element.dataset.rvDelay) || 0) + 'ms';
        observer.observe(element);
      }
    }
    const steps = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.classList.toggle('is-lit', entry.isIntersecting);
    }, { rootMargin: '0px 0px -20% 0px' });
    all('.ib-step').forEach(element => steps.observe(element));
    reduced.addEventListener('change', () => {
      if (reduced.matches) all('.reveal-ready').forEach(element => element.classList.add('is-in'));
    });
  }

  function setupComparison() {
    const panels = all('[data-prob-panel]');
    const buttons = all('[data-action="setProbSin"], [data-action="setProbCon"]');
    if (!panels.length) return;
    function select(value) {
      for (const panel of panels) panel.hidden = panel.dataset.probPanel !== value;
      for (const button of buttons) {
        const selected = button.dataset.action === (value === 'sin' ? 'setProbSin' : 'setProbCon');
        button.setAttribute('aria-pressed', String(selected));
      }
    }
    for (const button of buttons) button.addEventListener('click', () => select(button.dataset.action === 'setProbSin' ? 'sin' : 'con'));
    select('sin');
  }

  function setupBento() {
    const section = query('.bento-showcase');
    const gsap = window.gsap;
    if (!section || !gsap || reduced.matches) return;
    const intro = [...section.querySelectorAll('.bento-intro')];
    const cards = [...section.querySelectorAll('.ib-bento-card')];
    const rows = [...section.querySelectorAll('.sim-toggle')];
    // Build the sequence only after GSAP loads; the HTML stays visible without JS.
    gsap.set([...intro, ...cards], { opacity: 0 });
    const sequence = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
      .fromTo(intro, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: .76, stagger: .11 }, 0)
      .fromTo(cards, { y: 48, scale: .96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: .85, stagger: .12, clearProps: 'transform,opacity' }, .28)
      .fromTo(rows, { x: -12, opacity: .4 }, { x: 0, opacity: 1, duration: .48, stagger: .065, clearProps: 'transform,opacity' }, .67);
    let observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) { sequence.play(); observer.disconnect(); }
      }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
      observer.observe(section);
    } else sequence.play();
    reduced.addEventListener('change', () => {
      if (!reduced.matches) return;
      observer?.disconnect();
      sequence.kill();
      gsap.killTweensOf([...intro, ...cards, ...rows]);
      gsap.set([...intro, ...cards, ...rows], { clearProps: 'transform,opacity,visibility' });
    }, { once: true });
    const lift = (card, active) => {
      if (!reduced.matches) gsap.to(card, { y: active ? -7 : 0, scale: active ? 1.018 : 1, duration: active ? .42 : .5, ease: 'power3.out', overwrite: 'auto' });
    };
    cards.forEach(card => {
      if (fine.matches) {
        card.addEventListener('pointerenter', () => lift(card, true));
        card.addEventListener('pointerleave', () => lift(card, card.matches(':focus-within')));
      }
      card.addEventListener('focusin', event => { if (event.target.matches(':focus-visible')) lift(card, true); });
      card.addEventListener('focusout', event => {
        if (!card.contains(event.relatedTarget)) lift(card, fine.matches && card.matches(':hover'));
      });
    });
  }

  function setupSimulator() {
    const gsap = window.gsap;
    const toggles = all('.sim-toggle');
    for (const button of toggles) button.addEventListener('click', () => {
      const pressed = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(pressed));
      const track = button.lastElementChild;
      track.style.background = pressed ? 'linear-gradient(135deg,#1F27EB,#7C3AED)' : '#15182B';
      const knob = track.firstElementChild;
      if (gsap && !reduced.matches) {
        gsap.to(knob, { left: pressed ? 23 : 3, duration: .42, ease: 'back.out(1.7)', overwrite: 'auto' });
        gsap.fromTo(track, { scale: .88 }, { scale: 1, duration: .5, ease: 'back.out(2)', overwrite: 'auto' });
        gsap.fromTo(button, { scale: .97 }, { scale: 1, duration: .42, ease: 'power3.out', overwrite: 'auto' });
      } else knob.style.left = pressed ? '23px' : '3px';
    });
    const rangeUpdates = [];
    for (const input of all('.sim-range')) {
      const control = input.closest('.sim-control');
      const card = input.closest('.ib-bento-card');
      const readout = input.dataset.action === 'changeBudget' ? control?.querySelector('[data-budget-output]') : input.previousElementSibling?.lastElementChild;
      const state = { hover: false, pressed: false };
      const updateMotion = () => {
        const engaged = state.pressed || input.matches(':focus-visible');
        const level = engaged ? 2 : state.hover ? 1 : 0;
        input.classList.toggle('is-engaged', engaged);
        control?.classList.toggle('is-engaged', engaged);
        card?.classList.toggle('is-control-active', !!card.querySelector('.sim-range.is-engaged'));
        if (!gsap || reduced.matches) {
          if (gsap) gsap.killTweensOf([input, readout]);
          for (const name of ['--sim-track-height', '--sim-thumb-size', '--sim-thumb-ring']) input.style.removeProperty(name);
          if (readout) readout.style.removeProperty('transform');
          return;
        }
        gsap.to(input, {
          '--sim-track-height': [8, 11, 14][level] + 'px',
          '--sim-thumb-size': [18, 23, 28][level] + 'px',
          '--sim-thumb-ring': [4, 6, 9][level] + 'px',
          duration: .3, ease: 'power3.out', overwrite: 'auto'
        });
        if (readout) gsap.to(readout, { scale: [1, 1.025, 1.07][level], duration: .3, ease: 'power3.out', overwrite: 'auto' });
      };
      input.addEventListener('pointerenter', () => { state.hover = true; updateMotion(); });
      input.addEventListener('pointerleave', () => { state.hover = false; updateMotion(); });
      input.addEventListener('pointerdown', () => { state.pressed = true; updateMotion(); });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) input.addEventListener(event, () => { state.pressed = false; updateMotion(); });
      input.addEventListener('focus', updateMotion);
      input.addEventListener('blur', updateMotion);
      rangeUpdates.push(updateMotion);
      input.addEventListener('input', () => {
        const value = Number(input.value);
        input.style.setProperty('--sim-fill', value + '%');
        const action = input.dataset.action;
        let output;
        let target;
        if (action === 'changeBudget') {
          output = input.parentElement.querySelector('[data-budget-output]');
          target = Math.round((150 + value / 100 * 2850) / 50) * 50;
        } else {
          output = input.previousElementSibling?.lastElementChild?.firstElementChild;
          target = Math.round(value / 100 * (action === 'changeCamp' ? 10 : 1000));
        }
        if (!output) return;
        const render = number => { output.textContent = action === 'changeBudget' ? 'USD ' + number.toLocaleString('es-AR') : String(number); };
        input.setAttribute('aria-valuetext', action === 'changeBudget' ? 'USD ' + target.toLocaleString('es-AR') : action === 'changeCamp' ? target + ' de 10 campañas' : target + ' de 1000 leads');
        if (!gsap || reduced.matches) { render(target); return; }
        gsap.killTweensOf(output._simCounter);
        const counter = { value: Number(output.textContent.replace(/\D/g, '')) };
        output._simCounter = counter;
        gsap.to(counter, { value: target, duration: .36, ease: 'power2.out', onUpdate: () => render(Math.round(counter.value)), onComplete: () => render(target) });
      });
    }
    reduced.addEventListener('change', () => {
      rangeUpdates.forEach(update => update());
      if (!reduced.matches || !gsap) return;
      for (const button of toggles) {
        const track = button.lastElementChild;
        const knob = track.firstElementChild;
        gsap.killTweensOf([button, track, knob]);
        button.style.removeProperty('transform');
        track.style.removeProperty('transform');
        knob.style.left = button.getAttribute('aria-pressed') === 'true' ? '23px' : '3px';
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
