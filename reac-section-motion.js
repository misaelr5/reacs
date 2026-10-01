(() => {
  'use strict';

  const main = document.querySelector('body[data-page="home"] #main-content');
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!main) return;

  // Replace the legacy reveal only in the sections owned by this module.
  // Static HTML remains visible if GSAP or ScrollTrigger is unavailable.
  main.querySelectorAll('[data-section-motion] .reveal').forEach(element => {
    element.classList.add('reveal-ready', 'is-in', 'reac-section-reveal');
    element.style.removeProperty('transition-delay');
  });
  if (!gsap || !ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  const entered = new Set();
  let lightMotion = false;
  const media = gsap.matchMedia();
  const asArray = value => gsap.utils.toArray(value).filter(Boolean);
  const one = (section, selector) => section.querySelector(selector);
  const many = (section, selector) => [...section.querySelectorAll(selector)];

  function scene(name, section, build, start = 'top 88%') {
    if (!section || entered.has(name)) return null;
    const controlled = new Set();
    const remember = value => {
      const nodes = asArray(value);
      nodes.forEach(node => {
        controlled.add(node);
        node.classList.add('reac-motion-pending');
      });
      return nodes;
    };
    const release = () => controlled.forEach(node => {
      node.style.removeProperty('will-change');
      node.classList.remove('reac-motion-pending');
    });
    let trigger;
    const timeline = gsap.timeline({
      id: `reac-scene-${name}`,
      paused: true,
      defaults: { ease: 'power2.out', lazy: false },
      onStart: () => {
        entered.add(name);
        section.dataset.motionState = 'playing';
        controlled.forEach(node => {
          node.style.willChange = lightMotion ? 'transform, opacity' : 'transform, opacity, clip-path';
        });
      },
      onComplete: () => {
        section.dataset.motionState = 'complete';
        release();
        trigger?.kill();
      },
      onInterrupt: release
    });
    build(timeline, remember);
    trigger = ScrollTrigger.create({
      id: `reac-section-${name}`,
      trigger: section,
      start,
      once: true,
      onEnter: () => timeline.play()
    });
    return timeline;
  }

  function sideReveal(timeline, remember, targets, position = 0, options = {}) {
    const nodes = remember(targets);
    if (!nodes.length) return;
    timeline.fromTo(nodes,
      {
        x: options.x ?? 0,
        y: options.y ?? 0,
        rotate: options.rotate ?? 0,
        scale: options.scale ?? 1,
        opacity: options.opacity ?? 0
      },
      {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        opacity: 1,
        duration: options.duration ?? .6,
        stagger: options.stagger ?? 0,
        clearProps: 'transform,opacity'
      },
      position);
  }

  function clipReveal(timeline, remember, targets, position = 0, options = {}) {
    const nodes = remember(targets);
    if (!nodes.length) return;
    timeline.fromTo(nodes,
      {
        y: options.y ?? 18,
        scale: options.scale ?? .98,
        opacity: options.opacity ?? .35,
        clipPath: options.clipPath ?? 'inset(6% 4% 6% 4% round 24px)'
      },
      {
        y: 0,
        scale: 1,
        opacity: 1,
        clipPath: 'inset(0% 0% 0% 0% round 0px)',
        duration: options.duration ?? .68,
        clearProps: 'transform,opacity,clipPath'
      },
      position);
  }

  media.add({
    desktop: '(min-width: 981px)',
    compact: '(max-width: 980px)',
    touch: '(hover: none), (pointer: coarse)',
    reduceMotion: '(prefers-reduced-motion: reduce)'
  }, context => {
    const { desktop, compact, touch, reduceMotion } = context.conditions;
    lightMotion = !desktop || touch;
    main.dataset.sectionMotionMode = reduceMotion ? 'reduced' : 'active';
    if (reduceMotion) return;

    const stats = one(main, '[data-section-motion="stats"]');
    scene('stats', stats, (timeline, remember) => {
      const intro = one(stats, '.rv-left');
      const switcher = one(stats, '.prob-switch');
      const cards = many(stats, '[data-prob-panel="sin"] .prob-card');
      if (desktop) sideReveal(timeline, remember, intro, 0, { y: 16, duration: .55 });
      sideReveal(timeline, remember, switcher, desktop ? .08 : 0, {
        y: compact ? 12 : 18,
        scale: desktop ? .985 : .995,
        opacity: compact ? .82 : 0,
        duration: compact ? .38 : .55
      });
      if (cards.length !== 3) return;
      if (desktop) {
        sideReveal(timeline, remember, cards[1], .16, { y: 20, scale: .965, duration: .62 });
        sideReveal(timeline, remember, cards[0], .2, { x: -28, rotate: -.35, duration: .62 });
        sideReveal(timeline, remember, cards[2], .2, { x: 28, rotate: .35, duration: .62 });
      } else {
        sideReveal(timeline, remember, cards, .08, { y: 14, opacity: .82, duration: .42, stagger: .045 });
      }
    });

    const services = one(main, '[data-section-motion="services"]');
    scene('services', services, (timeline, remember) => {
      const cards = many(services, '.imp-bento > .imp-card');
      if (cards.length !== 3) return;
      if (desktop) {
        sideReveal(timeline, remember, cards[1], 0, { y: 22, scale: .965, duration: .64 });
        sideReveal(timeline, remember, cards[0], .05, { x: -28, rotate: -.35, duration: .64 });
        sideReveal(timeline, remember, cards[2], .05, { x: 28, rotate: .35, duration: .64 });
      } else {
        sideReveal(timeline, remember, cards, 0, { y: 14, opacity: .82, duration: .42, stagger: .045 });
      }
    });

    const process = one(main, '[data-section-motion="process"]');
    scene('process', process, (timeline, remember) => {
      many(process, '.ib-step').forEach((step, index) => {
        const at = index * (compact ? .09 : .12);
        const number = one(step, '.process-step-number');
        const body = step.children[1];
        timeline.fromTo(remember(number),
          { scale: compact ? .88 : .82, opacity: compact ? .82 : .3 },
          {
            scale: 1.04,
            opacity: 1,
            ...(desktop ? { boxShadow: '0 0 0 1px rgba(255,122,77,.2),0 0 24px rgba(250,54,1,.42)' } : {}),
            duration: compact ? .32 : .42,
            clearProps: 'opacity'
          }, at)
          .to(number, { scale: 1, duration: compact ? .18 : .22, clearProps: 'transform,boxShadow' }, at + (compact ? .28 : .36));
        sideReveal(timeline, remember, body, at + .03, {
          x: compact ? 12 : 18,
          opacity: compact ? .82 : 0,
          duration: compact ? .4 : .55
        });
        if (index < 3) timeline.fromTo(remember(step),
          { '--reac-process-line': 0 },
          { '--reac-process-line': 1, duration: compact ? .34 : .42, ease: 'power2.inOut', clearProps: '--reac-process-line' },
          at + .18);
      });
    });

    const projects = one(main, '[data-section-motion="projects"]');
    scene('projects', projects, (timeline, remember) => {
      const region = one(projects, '[role="region"]');
      sideReveal(timeline, remember, region, 0, {
        y: compact ? 14 : 20,
        scale: compact ? .99 : .975,
        rotate: desktop ? -.35 : 0,
        opacity: compact ? .85 : 0,
        duration: compact ? .45 : .65
      });
      const arrows = many(projects, '.proj-side-arrow');
      sideReveal(timeline, remember, arrows[0], compact ? .08 : .16, {
        x: compact ? 0 : -14,
        y: compact ? 8 : 0,
        scale: .92,
        opacity: compact ? .78 : 0,
        duration: compact ? .34 : .42
      });
      sideReveal(timeline, remember, arrows[1], compact ? .08 : .16, {
        x: compact ? 0 : 14,
        y: compact ? 8 : 0,
        scale: .92,
        opacity: compact ? .78 : 0,
        duration: compact ? .34 : .42
      });
    });

    const contact = one(main, '[data-section-motion="contact"]');
    if (desktop) {
      scene('contact', contact, (timeline, remember) => {
        const panel = one(contact, '.ct-panel');
        clipReveal(timeline, remember, panel, 0, { duration: .68 });
        sideReveal(timeline, remember, one(contact, '.ct-aside'), .12, { x: -18, duration: .58 });
        sideReveal(timeline, remember, one(contact, '.ct-form'), .16, { x: 18, duration: .58 });
      }, 'top 90%');
    } else if (contact) {
      contact.dataset.motionState = 'static';
    }

    return () => {
      main.querySelectorAll('[data-section-motion]:not([data-section-motion="bento-existing"]) .reac-motion-pending').forEach(node => {
        node.classList.remove('reac-motion-pending');
        node.style.removeProperty('will-change');
      });
      main.querySelectorAll('[data-section-motion]').forEach(section => {
        if (entered.has(section.dataset.sectionMotion)) section.dataset.motionState = 'complete';
        else section.removeAttribute('data-motion-state');
      });
    };
  }, main);
})();
