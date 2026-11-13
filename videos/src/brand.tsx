import { loadFont } from "@remotion/fonts";
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Same tokens as premium/tokens.css on reacstudio.com.
export const C = {
  black: "#000000",
  ink: "#F2F4F8",
  silverHi: "#C9CED9",
  silver: "#8A90A2",
  steel: "#3A3F4C",
  line: "rgba(242,244,248,.12)",
  blue: "#2E37FF",
  blueSoft: "#6E74FF",
  blueGlow: "rgba(46,55,255,.38)",
  orange: "#FA3601",
  orangeGlow: "rgba(250,54,1,.32)",
  red: "#FF3B4E",
  green: "#2FE08A",
  glass: "rgba(255,255,255,.05)",
  glassBorder: "rgba(255,255,255,.10)",
};

export const FONT = "Satoshi";
loadFont({ family: FONT, url: staticFile("satoshi-400.woff2"), weight: "400" });
loadFont({ family: FONT, url: staticFile("satoshi-700.woff2"), weight: "700" });

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0→1 progress over [start, start+dur] seconds, eased. */
export const useIn = (start: number, dur = 0.5) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return interpolate(frame, [start * fps, (start + dur) * fps], [0, 1], {
    ...clamp,
    easing: ease,
  });
};

export const chromeText: CSSProperties = {
  backgroundImage: "linear-gradient(180deg,#FFFFFF 0%,#DDE1EA 45%,#8A90A2 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

/** Black stage with a slow blue (or orange) glow and a faint grid. */
export const Stage = ({
  accent = C.blueGlow,
  children,
}: {
  accent?: string;
  children: ReactNode;
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.black, fontFamily: FONT, color: C.ink }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
          backgroundSize: "120px 120px",
          backgroundPosition: `0px ${frame * 0.6}px`,
          opacity: 0.35,
          maskImage: "radial-gradient(ellipse at 50% 40%, #000 20%, transparent 75%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 1400,
          left: -160,
          top: interpolate(frame, [0, 600], [-500, -260]),
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent} 0%, transparent 62%)`,
          filter: "blur(40px)",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

/** Logo + domain pinned under the top safe area for the whole reel. */
export const BrandBug = () => (
  <div
    style={{
      position: "absolute",
      top: 130,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 14,
      fontSize: 34,
      fontWeight: 700,
      letterSpacing: "-0.01em",
      color: C.silverHi,
    }}
  >
    <Img src={staticFile("reac-symbol.svg")} style={{ width: 52, height: 52 }} />
    Reac Studio
  </div>
);

/** Headline whose words rise in one after another. */
export const WordsIn = ({
  text,
  start,
  size = 104,
  stagger = 0.08,
  accentWords = [],
  accent = C.blueSoft,
  style,
}: {
  text: string;
  start: number;
  size?: number;
  stagger?: number;
  accentWords?: string[];
  accent?: string;
  style?: CSSProperties;
}) => (
  <div
    style={{
      fontSize: size,
      fontWeight: 700,
      lineHeight: 1.02,
      letterSpacing: "-0.035em",
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      columnGap: size * 0.24,
      textAlign: "center",
      ...style,
    }}
  >
    {text.split(" ").map((w, i) => (
      <Word
        key={i}
        word={w}
        start={start + i * stagger}
        color={accentWords.includes(w) ? accent : undefined}
      />
    ))}
  </div>
);

const Word = ({ word, start, color }: { word: string; start: number; color?: string }) => {
  const p = useIn(start, 0.55);
  return (
    <span
      style={{
        display: "inline-block",
        opacity: p,
        translate: `0px ${(1 - p) * 60}px`,
        filter: `blur(${(1 - p) * 10}px)`,
        ...(color ? { color } : chromeText),
      }}
    >
      {word}
    </span>
  );
};

/** Rounded glass panel used for cards. */
export const Glass = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      background: C.glass,
      border: `1.5px solid ${C.glassBorder}`,
      borderRadius: 36,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 40px 120px rgba(0,0,0,.6)",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Closing card: keyword to comment + promise + domain. */
export const EndCard = ({
  keyword,
  promise,
  footnote,
  accent = C.blue,
}: {
  keyword: string;
  promise: string;
  footnote?: string;
  accent?: string;
}) => {
  const a = useIn(0.1, 0.6);
  const b = useIn(0.45, 0.6);
  const c = useIn(0.8, 0.6);
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", padding: "0 90px", gap: 46 }}
    >
      <div style={{ fontSize: 56, fontWeight: 700, color: C.silverHi, opacity: a }}>
        Comentá
      </div>
      <div
        style={{
          fontSize: 132,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          padding: "18px 58px 26px",
          borderRadius: 40,
          background: accent,
          boxShadow: `0 0 ${80 + Math.sin(frame / 6) * 30}px ${accent}`,
          scale: interpolate(a, [0, 1], [0.7, 1]),
          opacity: a,
        }}
      >
        {keyword}
      </div>
      <div
        style={{
          fontSize: 50,
          lineHeight: 1.25,
          textAlign: "center",
          color: C.ink,
          opacity: b,
          translate: `0px ${(1 - b) * 30}px`,
        }}
      >
        {promise}
      </div>
      <div
        style={{
          marginTop: 30,
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontSize: 44,
          fontWeight: 700,
          opacity: c,
        }}
      >
        <Img src={staticFile("reac-symbol.svg")} style={{ width: 70, height: 70 }} />
        reacstudio.com
      </div>
      {footnote ? (
        <div style={{ fontSize: 30, color: C.silver, opacity: c, textAlign: "center" }}>
          {footnote}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
