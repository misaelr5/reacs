import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandBug, C, EndCard, Glass, Stage, WordsIn, useIn } from "./brand";

// Reel 3 — "Así ve tu web un hacker". Service: evaluación de seguridad autorizada.
// Purely illustrative: the "x-ray" layer shows risk labels, never runnable commands.
const SCAN_START = 2.4;
const SCAN_LEN = 1.8;
const TAGS = [
  { text: "WordPress desactualizado", top: 140, left: 40 },
  { text: "Plugin sin parches", top: 300, left: 300 },
  { text: "Panel de admin expuesto", top: 470, left: 60 },
  { text: "Sin doble factor", top: 600, left: 380 },
];
const TAG_START = SCAN_START + SCAN_LEN;
const TAG_LEN = 1.3;
const LINE_START = TAG_START + TAGS.length * TAG_LEN + 0.4;
const END_START = LINE_START + 2.4;
export const OJOS_SECONDS = END_START + 3.8;

export const OjosHacker = () => {
  const { fps } = useVideoConfig();
  return (
    <Stage>
      <BrandBug />
      <Sequence durationInFrames={LINE_START * fps} name="Rayos X">
        <AbsoluteFill style={{ alignItems: "center" }}>
          <WordsIn
            text="Así ve tu web un hacker"
            start={0.1}
            size={100}
            accentWords={["hacker"]}
            accent={C.orange}
            style={{ marginTop: 250, width: 900 }}
          />
          <XRay />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={LINE_START * fps} durationInFrames={2.4 * fps} name="Remate">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 80px", gap: 20 }}>
          <WordsIn text="Lo que vos no ves," start={0} size={100} />
          <WordsIn text="otro sí." start={0.5} size={124} accentWords={["sí."]} accent={C.orange} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={END_START * fps} name="CTA">
        <EndCard
          keyword="SEGURIDAD"
          promise="y te contamos cómo revisamos tu web antes que otro."
          footnote="Evaluación autorizada · resultados confidenciales"
        />
      </Sequence>
    </Stage>
  );
};

const XRay = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = useIn(0.4, 0.8);
  const scan = interpolate(frame, [SCAN_START * fps, (SCAN_START + SCAN_LEN) * fps], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 520,
        width: 900,
        height: 760,
        opacity: enter,
        translate: `0px ${(1 - enter) * 160}px`,
      }}
    >
      <Glass style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0B0D14" }}>
        <NiceSite />
        {/* Revealed from the left as the scan line passes. */}
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - scan}% 0 0)` }}>
          <CodeLayer />
        </div>
      </Glass>
      {scan > 0 && scan < 100 ? (
        <div
          style={{
            position: "absolute",
            top: -20,
            bottom: -20,
            left: `${scan}%`,
            width: 6,
            background: C.orange,
            boxShadow: `0 0 40px 10px ${C.orangeGlow}`,
          }}
        />
      ) : null}
      {TAGS.map((t, i) => (
        <Sequence key={t.text} from={(TAG_START + i * TAG_LEN) * fps} layout="none" name={t.text}>
          <Tag text={t.text} top={t.top} left={t.left} />
        </Sequence>
      ))}
    </div>
  );
};

const NiceSite = () => (
  <>
    <div style={{ position: "absolute", top: 26, left: 40, right: 40, display: "flex", justifyContent: "space-between", fontSize: 26, color: C.silverHi }}>
      <b style={{ color: C.ink }}>Tu Empresa</b>
      <span>Servicios · Nosotros · Contacto</span>
    </div>
    <div
      style={{
        position: "absolute",
        top: 100,
        left: 30,
        right: 30,
        height: 380,
        borderRadius: 22,
        background: `radial-gradient(circle at 70% 30%, ${C.blueGlow}, transparent 60%), linear-gradient(135deg,#141833,#0B0D14)`,
        padding: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.02em" }}>Una web linda y prolija</div>
      <div style={{ padding: "18px 30px", borderRadius: 14, background: C.blue, fontSize: 28, fontWeight: 700, alignSelf: "flex-start" }}>
        Contactanos →
      </div>
    </div>
    <div style={{ position: "absolute", top: 510, left: 30, right: 30, display: "flex", gap: 20 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ flex: 1, height: 210, borderRadius: 20, background: "rgba(255,255,255,.06)" }} />
      ))}
    </div>
  </>
);

const CODE = [
  "<html>",
  "  <!-- generador: WordPress 5.x -->",
  "  <script src=\"/plugins/formulario/v1.2\">",
  "  <link href=\"/plugins/slider/v3.0\">",
  "  <body class=\"home\">",
  "    <a href=\"/wp-admin\">",
  "    <form action=\"/login\">",
  "      usuario: ******",
  "      2FA: no configurado",
  "    </form>",
  "  </body>",
  "</html>",
];

const CodeLayer = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "linear-gradient(180deg,#05060A,#0A0F22)",
      padding: "50px 46px",
      fontFamily: "Consolas, 'Courier New', monospace",
      fontSize: 30,
      lineHeight: 1.75,
      color: C.blueSoft,
      whiteSpace: "pre",
    }}
  >
    {CODE.map((l, i) => (
      <div key={i} style={{ opacity: 0.85 }}>
        {l}
      </div>
    ))}
  </div>
);

const Tag = ({ text, top, left }: { text: string; top: number; left: number }) => {
  const p = useIn(0, 0.4);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        padding: "16px 28px",
        borderRadius: 18,
        background: C.orange,
        fontSize: 38,
        fontWeight: 700,
        boxShadow: `0 20px 60px ${C.orangeGlow}`,
        opacity: p,
        scale: interpolate(p, [0, 1], [0.6, 1]),
        whiteSpace: "nowrap",
      }}
    >
      ⚠ {text}
    </div>
  );
};
