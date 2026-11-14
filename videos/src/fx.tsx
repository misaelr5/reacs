import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Motion primitives shared by the reels. All timing is in seconds relative to the
// enclosing <Sequence>, so scenes stay readable.

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.22, 1, 0.36, 1);

export const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/** 0→1 eased between seconds a and b. */
export const ramp = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { ...cl, easing: easeOut });

/** Spring starting at `at` seconds; low damping gives a lively overshoot. */
export const useSpringAt = (at: number, damping = 12, stiffness = 140) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - Math.round(at * fps), fps, config: { damping, stiffness, mass: 0.7 } });
};

/** Scene wrapper: zoom/blur in, slow camera push, zoom/blur out. */
export const SceneShell = ({ dur, children }: { dur: number; children: ReactNode }) => {
  const t = useT();
  const enter = ramp(t, 0, 0.45);
  const exit = ramp(t, dur - 0.28, dur);
  return (
    <AbsoluteFill
      style={{
        opacity: enter * (1 - exit),
        scale: 1.14 - 0.14 * enter + 0.035 * (t / dur) - 0.08 * exit,
        filter: `blur(${(1 - enter) * 18 + exit * 14}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Diagonal light streak that crosses the frame right after a cut. */
export const LightSweep = ({ at = 0, color = "rgba(255,255,255,.22)" }: { at?: number; color?: string }) => {
  const t = useT();
  const p = ramp(t, at, at + 0.5);
  if (p <= 0 || p >= 1) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: -400,
          left: `${-60 + p * 180}%`,
          width: 260,
          height: 2800,
          rotate: "18deg",
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          filter: "blur(8px)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Decaying camera shake while t ∈ [at, at+dur]. */
export const Shake = ({ at, dur = 0.5, amp = 16, children, style }: { at: number; dur?: number; amp?: number; children: ReactNode; style?: CSSProperties }) => {
  const frame = useCurrentFrame();
  const t = useT();
  const k = t >= at && t < at + dur ? 1 - (t - at) / dur : 0;
  const x = (random(`sx${frame}`) - 0.5) * 2 * amp * k;
  const y = (random(`sy${frame}`) - 0.5) * 2 * amp * k;
  return <div style={{ translate: `${x}px ${y}px`, ...style }}>{children}</div>;
};

/** RGB-split + sliced displacement glitch while t ∈ [at, at+dur]. */
export const Glitch = ({ at, dur = 0.6, children, style }: { at: number; dur?: number; children: ReactNode; style?: CSSProperties }) => {
  const frame = useCurrentFrame();
  const t = useT();
  const on = t >= at && t < at + dur && frame % 4 !== 3;
  if (!on) return <div style={{ position: "relative", ...style }}>{children}</div>;
  const off = 8 + random(`g${frame}`) * 14;
  const sliceTop = random(`gt${frame}`) * 80;
  const sliceH = 6 + random(`gh${frame}`) * 14;
  const sliceX = (random(`gx${frame}`) - 0.5) * 60;
  const layer = (extra: CSSProperties) => <div style={{ position: "absolute", inset: 0, ...extra }}>{children}</div>;
  return (
    <div style={{ position: "relative", ...style }}>
      <div style={{ visibility: "hidden" }}>{children}</div>
      {layer({ translate: `${-off}px 0px`, opacity: 0.7, mixBlendMode: "screen", filter: "hue-rotate(-60deg) saturate(3)" })}
      {layer({ translate: `${off}px 0px`, opacity: 0.7, mixBlendMode: "screen", filter: "hue-rotate(160deg) saturate(3)" })}
      {layer({})}
      {layer({ clipPath: `inset(${sliceTop}% 0 ${100 - sliceTop - sliceH}% 0)`, translate: `${sliceX}px 0px` })}
    </div>
  );
};

/** Particle explosion from the element's center at `at` seconds. */
export const Burst = ({ at, color, count = 18, dist = 280, size = 14, seed = "b" }: { at: number; color: string; count?: number; dist?: number; size?: number; seed?: string }) => {
  const t = useT();
  const p = ramp(t, at, at + 0.9);
  if (p <= 0 || p >= 1) return null;
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + random(`${seed}a${i}`) * 0.6;
        const d = dist * (0.55 + random(`${seed}d${i}`) * 0.6) * p;
        const s = size * (0.5 + random(`${seed}s${i}`));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: s,
              height: s,
              borderRadius: i % 3 === 0 ? "50%" : 3,
              background: color,
              boxShadow: `0 0 ${s * 1.5}px ${color}`,
              translate: `${Math.cos(a) * d - s / 2}px ${Math.sin(a) * d + p * p * 120 - s / 2}px`,
              rotate: `${p * 360 * (random(`${seed}r${i}`) - 0.5)}deg`,
              opacity: 1 - p,
            }}
          />
        );
      })}
    </div>
  );
};

/** Expanding rings (sonar / tap / call). */
export const Ripples = ({ at, color, count = 3, period = 0.8, max = 460, until = Infinity }: { at: number; color: string; count?: number; period?: number; max?: number; until?: number }) => {
  const t = useT();
  if (t < at || t > until) return null;
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const local = ((t - at) / period + i / count) % 1;
        const r = local * max;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: -r / 2,
              top: -r / 2,
              width: r,
              height: r,
              borderRadius: "50%",
              border: `4px solid ${color}`,
              opacity: (1 - local) * 0.8,
            }}
          />
        );
      })}
    </div>
  );
};

/** Touch indicator that glides to (x, y) and taps at `tapAt`. Coordinates are relative to the parent. */
export const Tap = ({ path, tapAt }: { path: { at: number; x: number; y: number }[]; tapAt: number[] }) => {
  const t = useT();
  if (t < path[0].at - 0.3) return null;
  const xs = path.map((p) => p.x);
  const ys = path.map((p) => p.y);
  const ts = path.map((p) => p.at);
  const x = ts.length > 1 ? interpolate(t, ts, xs, { ...cl, easing: easeOut }) : xs[0];
  const y = ts.length > 1 ? interpolate(t, ts, ys, { ...cl, easing: easeOut }) : ys[0];
  const press = Math.max(0, ...tapAt.map((a) => (t >= a && t < a + 0.25 ? 1 - Math.abs(t - a - 0.12) / 0.13 : 0)));
  const ring = Math.max(0, ...tapAt.map((a) => (t >= a && t < a + 0.5 ? (t - a) / 0.5 : 0)));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, zIndex: 50, opacity: ramp(t, path[0].at - 0.3, path[0].at) }}>
      {ring > 0 ? (
        <div style={{ position: "absolute", left: -ring * 70, top: -ring * 70, width: ring * 140, height: ring * 140, borderRadius: "50%", border: "4px solid #fff", opacity: 1 - ring }} />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: -36,
          top: -36,
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "rgba(255,255,255,.85)",
          boxShadow: "0 10px 40px rgba(0,0,0,.5), 0 0 0 10px rgba(255,255,255,.18)",
          scale: 1 - press * 0.25,
        }}
      />
    </div>
  );
};

/** SVG stroke that draws itself between `at` and `at+dur`. */
export const DrawPath = ({ d, at, dur = 0.8, color, width = 10, viewBox, style, glow = true }: { d: string; at: number; dur?: number; color: string; width?: number; viewBox: string; style?: CSSProperties; glow?: boolean }) => {
  const t = useT();
  const p = ramp(t, at, at + dur);
  return (
    <svg viewBox={viewBox} style={{ overflow: "visible", ...style }}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
        style={glow ? { filter: `drop-shadow(0 0 14px ${color})` } : undefined}
      />
    </svg>
  );
};

/** Floating 3D card: perspective tilt plus a gentle idle bob. */
export const Float3D = ({ children, rotY = -12, rotX = 6, enterAt = 0, style }: { children: ReactNode; rotY?: number; rotX?: number; enterAt?: number; style?: CSSProperties }) => {
  const t = useT();
  const s = useSpringAt(enterAt, 16, 90);
  return (
    <div style={{ perspective: 1800, ...style }}>
      <div
        style={{
          transform: `translateY(${(1 - s) * 500 + Math.sin(t * 1.6) * 10}px) rotateY(${rotY * (2 - s) + Math.sin(t * 0.9) * 3}deg) rotateX(${rotX + (1 - s) * 30}deg)`,
          opacity: Math.min(1, s * 1.5),
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Slowly drifting dust particles for depth. */
export const Particles = ({ color = "rgba(160,170,255,.5)", count = 34 }: { color?: string; count?: number }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }).map((_, i) => {
        const depth = 0.3 + random(`pd${i}`) * 0.7;
        const x = random(`px${i}`) * 1080 + Math.sin(frame / 50 + i) * 20 * depth;
        const y = (((random(`py${i}`) * 1920 - frame * 1.4 * depth) % 1920) + 1920) % 1920;
        const s = 2 + depth * 5;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: s, height: s, borderRadius: "50%", background: color, opacity: 0.25 + depth * 0.5, filter: `blur(${(1 - depth) * 2}px)` }} />;
      })}
    </AbsoluteFill>
  );
};

/** Animated film grain + vignette for a filmic finish. */
export const Grain = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="540" height="960" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.08, mixBlendMode: "overlay" }}>
        <filter id={`grain${frame % 6}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 6} />
        </filter>
        <rect width="100%" height="100%" filter={`url(#grain${frame % 6})`} />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.65) 100%)" }} />
    </AbsoluteFill>
  );
};

/** Number that rolls from a to b between seconds. */
export const Roll = ({ from, to, at, dur, style }: { from: number; to: number; at: number; dur: number; style?: CSSProperties }) => {
  const t = useT();
  return <span style={style}>{Math.round(interpolate(t, [at, at + dur], [from, to], { ...cl, easing: Easing.inOut(Easing.cubic) }))}</span>;
};
