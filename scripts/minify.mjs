import { transformSync } from 'esbuild';

// One CSS minifier for the build and the cascade test. No target: modern syntax is kept as written.
export const minifyCss = css => transformSync(css, { loader: 'css', minify: true, logLevel: 'silent' }).code;
