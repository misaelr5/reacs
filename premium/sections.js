// FAQ: GSAP owns geometry; View Transitions only crossfade the question surface.
(() => {
  function setupFaq() {
    const items = [...document.querySelectorAll('#faq .faq-item')];
    const gsap = window.gsap;
    if (!items.length || !gsap) return; // Preserve the native details fallback.
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let activeView;
    const controllers = [];
    function surface(question, value) {
      if (activeView) {
        activeView.transition.skipTransition();
        activeView.question.dataset.expanded = String(activeView.value);
        activeView.question.style.removeProperty('view-transition-name');
      }
      const update = () => { question.dataset.expanded = String(value); };
      if (reduced.matches || !document.startViewTransition) {
        activeView = null;
        document.documentElement.classList.remove('reac-faq-vt');
        update();
        return;
      }
      const record = { question, value };
      activeView = record;
      question.style.viewTransitionName = 'reac-faq-question';
      document.documentElement.classList.add('reac-faq-vt');
      try {
        record.transition = document.startViewTransition(() => {
          if (activeView === record) update();
        });
        record.transition.ready.catch(() => {}); // Rapid interaction may skip a snapshot.
        record.transition.finished.catch(() => {}).finally(() => {
          if (activeView !== record) return;
          activeView = null;
          question.style.removeProperty('view-transition-name');
          document.documentElement.classList.remove('reac-faq-vt');
        });
      } catch {
        activeView = null;
        question.style.removeProperty('view-transition-name');
        document.documentElement.classList.remove('reac-faq-vt');
        update();
      }
    }
    for (const item of items) {
      const question = item.querySelector('summary');
      const answer = item.querySelector('.faq-a');
      if (!question || !answer) continue;
      let expanded = item.open;
      let animating = false;
      item.dataset.faqAnimated = '';
      question.setAttribute('aria-controls', answer.id);
      question.setAttribute('aria-expanded', String(expanded));
      question.dataset.expanded = String(expanded);
      answer.inert = !expanded;
      const settle = () => {
        item.open = expanded;
        item.style.removeProperty('height');
        gsap.set(answer, { clearProps: 'opacity,transform' });
        animating = false;
      };
      const setOpen = (value, immediate = false) => {
        const height = item.getBoundingClientRect().height;
        gsap.killTweensOf([item, answer]);
        expanded = value;
        question.setAttribute('aria-expanded', String(value));
        answer.inert = !value;
        if (!value && answer.contains(document.activeElement)) question.focus({ preventScroll: true });
        if (immediate || reduced.matches) {
          question.dataset.expanded = String(value);
          settle();
          return;
        }
        surface(question, value);
        animating = true;
        const wasOpen = item.open;
        // Keep details open while its height shrinks so the browser cannot hide the answer early.
        item.open = true;
        item.style.height = height + 'px';
        if (value && !wasOpen) gsap.set(answer, { opacity: 0, y: 8 });
        const closedHeight = question.getBoundingClientRect().height +
          parseFloat(getComputedStyle(item).borderTopWidth) + parseFloat(getComputedStyle(item).borderBottomWidth);
        gsap.to(item, {
          height: value ? 'auto' : closedHeight, duration: value ? .42 : .3,
          ease: 'power3.inOut', overwrite: true, onComplete: settle
        });
        gsap.to(answer, { opacity: value ? 1 : 0, y: value ? 0 : -4,
          duration: value ? .32 : .18, ease: 'power2.out', overwrite: true });
      };
      question.addEventListener('click', event => {
        event.preventDefault();
        setOpen(!expanded);
      });
      item.addEventListener('toggle', () => {
        if (!animating && item.open !== expanded) setOpen(item.open, true);
      });
      controllers.push(() => setOpen(expanded, true));
    }
    reduced.addEventListener('change', () => {
      if (!reduced.matches) return;
      activeView?.transition.skipTransition();
      controllers.forEach(finish => finish());
    });
    addEventListener('resize', () => controllers.forEach(finish => finish()), { passive: true });
  }
  if (document.readyState === 'complete') setupFaq();
  else document.addEventListener('DOMContentLoaded', setupFaq, { once: true });
})();

// Testimonials reuse the logo marquee in work.js. Keyboard focus switches
// the original reviews to native scrolling; arrow keys advance by one card.
(() => {
  const track = document.querySelector('.tst-grid');
  const viewport = track?.closest('[data-marquee-viewport]');
  const marquee = track?.closest('[data-marquee]');
  if (!track || !viewport || !marquee) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  track.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (marquee.hasAttribute('data-running')) return;
    event.preventDefault();
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = track.firstElementChild.getBoundingClientRect().width + gap;
    viewport.scrollBy({ left: (event.key === 'ArrowRight' ? 1 : -1) * step, behavior: reduced.matches ? 'instant' : 'smooth' });
  });
})();
