// Reac premium — one quiet entrance for section titles.
// Whole headings keep their original markup, wrapping and accessible text.
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function setup() {
    const gsap = window.gsap;
    const titles = [...document.querySelectorAll('[data-title-fx]')];
    if (!titles.length || !gsap || reduced.matches || !('IntersectionObserver' in window)) return;

    // First-screen content is never held back. No font measurement or splitting needed.
    const pending = new Set(titles.filter(title => title.getBoundingClientRect().top >= innerHeight));
    const running = new Map();
    const settle = title => {
      title.classList.remove('tfx-pending');
      title.removeAttribute('data-title-playing');
      gsap.set(title, { clearProps: 'opacity,transform' });
      running.delete(title);
    };
    const reveal = title => {
      if (!pending.delete(title)) return;
      observer.unobserve(title);
      title.classList.remove('tfx-pending');
      if (reduced.matches) return;
      title.dataset.titlePlaying = '';
      const animation = gsap.fromTo(title, { opacity: 0, y: 14 }, {
        opacity: 1, y: 0, duration: .65, ease: 'power2.out',
        onComplete: () => settle(title)
      });
      running.set(title, animation);
    };
    // No inset trigger: even headings near the page bottom can enter.
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
    });
    pending.forEach(title => {
      title.classList.add('tfx-pending');
      observer.observe(title);
    });

    // Fragment links and keyboard navigation must reveal their destination.
    const showTarget = target => {
      if (!(target instanceof Element)) return;
      for (const title of pending) {
        if (target === title || target.contains(title) || title.contains(target)) reveal(title);
      }
    };
    const showHash = () => {
      try { showTarget(document.getElementById(decodeURIComponent(location.hash.slice(1)))); }
      catch { /* Invalid fragments leave normal scrolling available. */ }
    };
    addEventListener('hashchange', showHash);
    document.addEventListener('focusin', event => showTarget(event.target));
    showHash();
    reduced.addEventListener('change', () => {
      if (!reduced.matches) return;
      observer.disconnect();
      for (const [title, animation] of running) {
        animation.kill();
        settle(title);
      }
      pending.forEach(title => title.classList.remove('tfx-pending'));
      pending.clear();
    });
  }

  // Deferred GSAP must be available before arming any hidden state.
  if (document.readyState === 'complete') setup();
  else document.addEventListener('DOMContentLoaded', setup, { once: true });
})();
