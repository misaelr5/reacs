// Reac premium — the loader's WebGL field (OGL). Bundled by the build into its own chunk, which
// premium/loader.js imports only on a first visit.
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const vertex = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 0., 1.); }
`;

// A 1-bit ordered-dither field of flowing contour lines. The veil opens from the centre along the
// noise, so its rim is ragged, dithered and burns from ice blue to ember before it disappears.
const fragment = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uReveal;
  uniform float uPixel;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= .5; } return v; }
  float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
  float bayer4(vec2 a) { return bayer2(.5 * a) * .25 + bayer2(a); }
  void main() {
    vec2 cell = floor(gl_FragCoord.xy / uPixel);
    vec2 p = (cell * uPixel - .5 * uRes) / uRes.y;
    float warp = fbm(p * 2.2 + vec2(0., -uTime * .25));
    float n = fbm(p * 3.4 + warp * 1.6 + vec2(uTime * .08, 0.));
    float contour = 1. - smoothstep(0., .045, abs(fract(n * 6. - uTime * .35) - .5));
    float r = length(p);
    float glow = exp(-r * r * 5.);
    float d = bayer4(cell);
    vec3 blue = vec3(.18, .216, 1.);
    vec3 ice = vec3(.557, .635, 1.);
    vec3 ember = vec3(.98, .21, .004);
    float lum = contour * (.07 + glow * .5) + glow * .07;
    vec3 col = mix(blue, ice, glow) * step(d, lum * 1.6) * (.22 + .6 * glow);
    float edge = r * 1.15 + n * .55 - uReveal * 2.;
    float alpha = step(0., edge + (d - .5) * .14);
    float rim = smoothstep(.18, 0., edge) * alpha;
    col = mix(col, mix(ice, ember, smoothstep(.07, 0., edge)), rim * step(d, rim + .2));
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createField(canvas) {
  try {
    // Only on real GPUs: a software-rendered context compiles the shader on the main thread for over a
    // second and would stall the intro. OGL reuses the context created here.
    if (navigator.connection?.saveData) return null;
    const context = canvas.getContext('webgl2', { alpha: true, depth: false, antialias: false, premultipliedAlpha: false, failIfMajorPerformanceCaveat: true });
    if (!context) return null;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const renderer = new Renderer({ canvas, dpr, alpha: true, premultipliedAlpha: false, antialias: false, depth: false });
    const gl = renderer.gl;
    if (!gl) return null;
    gl.clearColor(0, 0, 0, 0);
    const uniforms = { uRes: { value: [1, 1] }, uTime: { value: 0 }, uReveal: { value: 0 }, uPixel: { value: 3 * dpr } };
    const program = new Program(gl, { vertex, fragment, uniforms, transparent: true });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const resize = () => {
      renderer.setSize(innerWidth, innerHeight);
      uniforms.uRes.value = [gl.canvas.width, gl.canvas.height];
    };
    resize();
    addEventListener('resize', resize);
    return {
      uniforms,
      render: () => renderer.render({ scene: mesh }),
      destroy() {
        removeEventListener('resize', resize);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  } catch {
    return null;
  }
}
