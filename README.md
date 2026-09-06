# Reac Studio — Digital Studio Website

Official website for **Reac Studio**, a digital studio focused on web development, digital marketing and business automation.

The project was built as a production-facing business website with an emphasis on performance, responsive design, accessibility, conversion and visual storytelling.

## Live website

[reacs-studio.vercel.app](https://reacs-studio.vercel.app/)

## Project goals

The website is designed to communicate one central value proposition:

> One team for the complete digital ecosystem of a business.

It presents Reac Studio's services, projects, team and contact flows while keeping the experience lightweight and visually distinctive.

## Main features

- Responsive desktop and mobile layouts
- Custom visual storytelling and parallax sections
- Accessible navigation and keyboard support
- `prefers-reduced-motion` support
- Conversion-oriented contact flows
- Analytics integration prepared for production
- Consent-aware GA4 loading
- SEO metadata and indexing support
- Performance-focused scroll rendering
- Vercel deployment configuration

## Stack

- **HTML5**
- **CSS3**
- **JavaScript**
- **Python** utility scripts
- **Vercel**
- **Google Analytics 4** integration
- **Formspree** integration prepared for forms

The website intentionally avoids a heavy frontend framework and runs as a static production site.

## Architecture

```text
index.html
├── reac-site.css
├── reac-site.js
├── support.js
├── assets/
├── scripts/
│   └── fix-parallax.py
└── vercel.json
```

`reac-site.js` handles interaction, analytics consent, form behavior and conversion events.

The parallax system uses `requestAnimationFrame` scheduling and avoids unnecessary layout calculations during scrolling.

## Local development

From the repository root:

```bash
python -m http.server 4173
```

Then open:

```text
http://localhost:4173/
```

No Node.js build step is required to preview the website locally.

## Validation

```bash
node --check reac-site.js
python -m py_compile scripts/fix-parallax.py
python scripts/fix-parallax.py
git diff --check
```

The layout should also be manually tested across mobile and desktop viewports, keyboard navigation and reduced-motion preferences.

## Deployment

Deployment is configured for Vercel.

```json
{
  "buildCommand": "python scripts/fix-parallax.py",
  "outputDirectory": "."
}
```

## About Reac Studio

Reac Studio works across three main areas:

- Web Development
- Digital Marketing
- Business Automation & AI

---

**Developed by:** [Misael Ledesma](https://github.com/misaelr5)
