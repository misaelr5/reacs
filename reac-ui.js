(function () {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(min-width: 981px) and (hover: hover) and (pointer: fine)');
  const query = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];

  function init() {
    root.classList.add('js');
    setupReveal();
    setupParallax();
    setupComparison();
    setupSimulator();
    setupProjects();
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

  function setupParallax() {
    const nav = query('.site-nav');
    const hero = query('#top');
    const stats = query('[data-ref="statsRef"]');
    const layers = ['p1Ref', 'p2Ref', 'pTitleRef', 'p4Ref'].map(name => query('[data-ref="' + name + '"]'));
    if (!layers.some(Boolean)) return;
    let frame = 0;
    let height = innerHeight;
    const getNavThreshold = () => {
      if (hero) return hero.getBoundingClientRect().bottom + scrollY - Math.min(72, Math.max(40, height * 0.08));
      return stats ? stats.getBoundingClientRect().top + scrollY - 64 : 0;
    };
    let navThreshold = getNavThreshold();
    function update() {
      frame = 0;
      const progress = reduced.matches ? 0 : Math.max(0, Math.min(1, scrollY / Math.max(1, height)));
      layers.forEach((layer, i) => {
        if (!layer) return;
        layer.style.transform = i === 2
          ? 'translate(-50%, calc(-50% + ' + 40 * progress + '%))'
          : 'translate(-50%, ' + [70, 55, 0, 10][i] * progress + '%)';
      });
      if (nav) {
        const visible = scrollY >= navThreshold || nav.contains(document.activeElement);
        nav.classList.toggle('nav-hidden', !visible);
      }
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', () => {
      height = innerHeight;
      navThreshold = getNavThreshold();
      schedule();
    });
    nav?.addEventListener('focusin', schedule);
    nav?.addEventListener('focusout', schedule);
    reduced.addEventListener('change', schedule);
    schedule();
  }

  function setupComparison() {
    const panels = all('[data-prob-panel]');
    const buttons = all('.prob-pill');
    if (!panels.length) return;
    function select(value) {
      for (const panel of panels) {
        panel.hidden = panel.dataset.probPanel !== value;
        panel.style.setProperty('--prob-enter-x', value === 'sin' ? '-18px' : '18px');
      }
      for (const button of buttons) {
        const selected = button.dataset.action === (value === 'sin' ? 'setProbSin' : 'setProbCon');
        button.setAttribute('aria-pressed', String(selected));
        button.style.background = selected ? value === 'sin' ? 'rgba(250,54,1,.14)' : 'linear-gradient(135deg,#1F27EB,#7C3AED)' : 'transparent';
        button.style.color = selected ? value === 'sin' ? '#FF7A4D' : '#FDFCFE' : '#A6ABC2';
        button.style.boxShadow = selected ? 'inset 0 0 0 1px rgba(255,255,255,.3)' : 'none';
      }
    }
    for (const button of buttons) button.addEventListener('click', () => select(button.dataset.action === 'setProbSin' ? 'sin' : 'con'));
    select('sin');
  }

  function setupSimulator() {
    for (const button of all('.sim-toggle')) button.addEventListener('click', () => {
      const pressed = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(pressed));
      const track = button.lastElementChild;
      track.style.background = pressed ? 'linear-gradient(135deg,#1F27EB,#7C3AED)' : '#15182B';
      track.firstElementChild.style.left = pressed ? '23px' : '3px';
    });
    for (const input of all('.sim-range')) input.addEventListener('input', () => {
      const value = Number(input.value);
      const action = input.dataset.action;
      let output;
      if (action === 'changeBudget') {
        output = input.parentElement.querySelector('[data-budget-output]');
        if (output) output.textContent = 'USD ' + (Math.round((150 + value / 100 * 2850) / 50) * 50).toLocaleString('es-AR');
      } else {
        output = input.previousElementSibling?.lastElementChild?.firstElementChild;
        if (output) output.textContent = String(Math.round(value / 100 * (action === 'changeCamp' ? 10 : 1000)));
      }
    });
  }

  function setupProjects() {
    const region = query('#proyectos [role="region"]');
    const track = region?.querySelector('.proj-track');
    if (!track) return;
    const slides = [...track.querySelectorAll('.proj-slide')];
    const dots = [...region.querySelectorAll('.proj-dot')];
    let current = 0;
    let visible = false;
    let manualPause = false;
    let timer;
    const pause = document.createElement('button');
    pause.type = 'button';
    pause.className = 'project-pause';
    pause.textContent = 'Pausar carrusel';
    pause.setAttribute('aria-pressed', 'false');
    region.appendChild(pause);
    function update(index, announce = false) {
      current = (index + slides.length) % slides.length;
      track.style.transform = 'translateX(' + -current * 100 + '%)';
      slides.forEach((slide, i) => {
        slide.setAttribute('aria-hidden', String(i !== current));
        slide.inert = i !== current;
      });
      dots.forEach((dot, i) => {
        dot.setAttribute('aria-current', String(i === current));
        dot.style.width = i === current ? '30px' : '9px';
        dot.style.background = i === current ? 'linear-gradient(135deg,#1F27EB,#7C3AED)' : 'rgba(255,255,255,.18)';
      });
      for (const counter of region.querySelectorAll('.proj-counter,.proj-case-index')) counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      if (announce && visible) document.dispatchEvent(new CustomEvent('reac:project-view', { detail: { project_index: current + 1 } }));
    }
    function schedule() {
      clearInterval(timer);
      pause.hidden = !fine.matches || reduced.matches;
      if (!fine.matches || reduced.matches || manualPause) return;
      timer = setInterval(() => {
        if (visible && !document.hidden && !region.matches(':hover') && !region.contains(document.activeElement)) update(current + 1, true);
      }, 5000);
    }
    for (const button of region.querySelectorAll('[data-action="projNext"],[data-action="projPrev"]')) button.addEventListener('click', () => {
      update(current + (button.dataset.action === 'projNext' ? 1 : -1), true); schedule();
    });
    dots.forEach((dot, i) => dot.addEventListener('click', () => { update(i, true); schedule(); }));
    region.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); update(current + (event.key === 'ArrowRight' ? 1 : -1), true); schedule();
      }
    });
    pause.addEventListener('click', () => {
      manualPause = !manualPause;
      pause.setAttribute('aria-pressed', String(manualPause));
      pause.textContent = manualPause ? 'Reanudar carrusel' : 'Pausar carrusel';
      schedule();
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.15 }).observe(region);
    reduced.addEventListener('change', schedule);
    fine.addEventListener('change', schedule);
    update(0); schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
