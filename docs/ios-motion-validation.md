# Mobile / WebKit motion validation

Local-only work, 2026-09-30. No production deployment or new runtime dependency.

## Changes

- ScrollTrigger now only starts each central-section GSAP timeline. It does not own its playback, so a geometry refresh cannot revert its initial styles. Removed the redundant load refresh.
- Once a section has entered, a breakpoint change settles it to static content instead of replaying its entrance. Cleanup stays outside the independent Bento animation.
- Central-section and Bento entrance start styles are committed synchronously (`lazy: false`) instead of waiting for the first GSAP ticker frame. This addresses a separate intermittent startup flash observed in Chrome; no global GSAP defaults changed.
- Compact/touch layouts use transform/opacity entrances instead of animated clip paths, 3D word reveals and nested team text staggers. Desktop choreography remains.
- Removed mobile backdrop blur from opaque FAQ panels and persistent Bento `will-change`. Contact inputs/selects retain 16px text on touch devices in landscape too, without disabling browser zoom.
- Hero and Footer code/content unchanged. Existing responsive safe-area rules retained.

## Evidence and limits

- WebKit 26.6 (Playwright build 2359) on Windows, iPhone 13 profile: 21 pages at 320, 375, 390, 430, 768 and 844px; 126 overflow/viewport checks passed. The same matrix passed in Chrome.
- Touch taps: navigation, comparison, simulator, carousel and FAQ; native range input events, form focus and landscape sizing passed. No contact/booking submission made.
- Height-only resize, orientation change during a paused entrance, live reduced-motion preference and no-JavaScript fallback passed.
- Real-speed computed-style continuity checks run in both engines at 390 and 1440px. Checks sample transient opacity drops, repeated entry and overflow, not only final state. Sampling is timer-based because Windows headless WebKit throttles requestAnimationFrame. This is not a device FPS benchmark.
- After the synchronous-start adjustment, three consecutive Chrome continuity runs passed; WebKit continuity passed as well. The earlier intermittent Chrome failure is retained in this explanation rather than treated as a clean initial baseline.
- Existing six-viewport motion suite passed. Build, lint, TypeScript and 84 unit tests passed.
- Separate Chrome lab sample: home LCP 1876ms, CLS 0.0062 with 390px viewport, cold cache, 4x CPU slowdown and simulated 1.6Mbps/150ms network. Not iOS performance or field Core Web Vitals; no measured before/after speedup claimed.

Artifacts: `artifacts/ios-webkit-report.json`, `artifacts/ios-chromium-report.json`, `artifacts/section-motion-continuity-{webkit,chromium}-report.json`, screenshots `artifacts/ios-webkit-*.png` and `artifacts/performance-report.json`.

## Repeat

With the local preview on port 4174 and the matching Playwright WebKit browser installed:

```powershell
node node_modules/playwright-core/cli.js install webkit
node tests/ios.browser.mjs
$env:TEST_BROWSER='webkit'
node tests/section-motion-continuity.browser.mjs
$env:TEST_BROWSER='chromium'
node tests/ios.browser.mjs
node tests/section-motion-continuity.browser.mjs
Remove-Item Env:TEST_BROWSER
```

`WEBKIT_EXECUTABLE` optionally points to an extracted matching `Playwright.exe`. In this run the installer timed out; the exact official archive was downloaded with curl and extracted to a temporary directory. No npm dependency or lockfile change was needed.

## Still pending on hardware

WebKit emulation is not shipping Safari on a physical iPhone. Validate real toolbar collapse, keyboard, notch/home-indicator safe areas, pinch zoom, touch drag of sliders, back navigation and scroll smoothness on an iPhone. No Apple device, real iOS version certification or hardware frame-rate/battery measurement was available.

References: [Playwright browser support and WebKit differences](https://playwright.dev/docs/browsers), [GSAP fromTo initial and lazy rendering](https://gsap.com/docs/v3/GSAP/gsap.fromTo%28%29/).
