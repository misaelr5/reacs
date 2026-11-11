// Reac premium — pricing motion: one-shot entrance with a light along each card frame.
// Prices are fixed text from the first render; nothing animates the amounts.
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function setupPricing() {
    const root = document.querySelector('[data-pricing]');
    if (!root) return;
    // the closing contact panel shares the card recipe (premium/contact.css) and opts in with data-glow-card
    const cards = [...document.querySelectorAll('#servicios .rpl-card, [data-glow-card]')];

    if (reduced.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.dataset.anim = 'on';
        observer.unobserve(entry.target);
      }
    }, { threshold: .08, rootMargin: '0px 0px -8% 0px' });
    cards.forEach(card => {
      card.dataset.anim = 'ready';
      card.querySelectorAll('.rpl-list li').forEach((item, index) => item.style.setProperty('--j', index));
      observer.observe(card);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupPricing, { once: true });
  else setupPricing();
})();
