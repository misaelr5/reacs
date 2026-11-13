import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandBug, C, EndCard, Glass, Stage, WordsIn, useIn } from "./brand";

// Reel 1 — "Tu web pierde consultas por 4 cosas". Service: desarrollo web.
// The audited site is fictional; no client or metric is implied.
const FLAGS = [
  { area: "url", title: "Sin candado HTTPS", body: "El navegador le avisa a tu cliente que tu web “no es segura”." },
  { area: "hero", title: "Tarda en cargar en el celular", body: "Si no carga rápido, se van antes de verte." },
  { area: "copy", title: "No dice qué vendés", body: "En 5 segundos tienen que entender qué hacés y para quién." },
  { area: "contact", title: "WhatsApp escondido", body: "Si cuesta escribirte, le escriben a otro." },
] as const;

const FLAG_START = 2.6;
const FLAG_LEN = 2;
const FIX_START = FLAG_START + FLAGS.length * FLAG_LEN;
const END_START = FIX_START + 3;
export const AUDITORIA_SECONDS = END_START + 3.6;

// Browser geometry (px inside the window) for each highlighted area.
const AREAS: Record<string, CSSProperties> = {
  url: { top: 8, left: 14, width: 872, height: 62 },
  hero: { top: 84, left: 14, width: 872, height: 300 },
  copy: { top: 396, left: 14, width: 872, height: 180 },
  contact: { top: 590, left: 520, width: 366, height: 96 },
};

export const AuditoriaWeb = () => {
  const { fps } = useVideoConfig();
  return (
    <Stage>
      <BrandBug />
      <Sequence durationInFrames={END_START * fps} name="Auditoría">
        <AbsoluteFill style={{ alignItems: "center" }}>
          <WordsIn
            text="Tu web pierde consultas por 4 cosas"
            start={0.15}
            size={92}
            accentWords={["4", "cosas"]}
            style={{ marginTop: 250, width: 900 }}
          />
          <Browser />
          {FLAGS.map((f, i) => (
            <Sequence
              key={f.area}
              from={(FLAG_START + i * FLAG_LEN) * fps}
              durationInFrames={FLAG_LEN * fps}
              name={`Error ${i + 1}`}
            >
              <FlagCard index={i} title={f.title} body={f.body} />
            </Sequence>
          ))}
          <Sequence from={FIX_START * fps} name="Resuelta">
            <FixCard />
          </Sequence>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={END_START * fps} name="CTA">
        <EndCard
          keyword="AUDITORÍA"
          promise="y te mandamos gratis el checklist para revisar tu web."
          footnote="Desarrollo web desde USD 200"
        />
      </Sequence>
    </Stage>
  );
};

const Browser = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = useIn(0.5, 0.8);
  const fixed = useIn(FIX_START, 0.7);
  const flagIdx = Math.floor((frame / fps - FLAG_START) / FLAG_LEN);
  const active = frame / fps >= FLAG_START && flagIdx < FLAGS.length ? FLAGS[flagIdx].area : null;
  return (
    <div
      style={{
        position: "absolute",
        top: 500,
        width: 900,
        height: 700,
        opacity: enter,
        translate: `0px ${(1 - enter) * 160}px`,
        scale: interpolate(enter, [0, 1], [0.92, 1]),
      }}
    >
      <Glass style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0B0D14" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - fixed }}>
          <BadSite />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: fixed }}>
          <GoodSite />
        </div>
      </Glass>
      {active ? <Highlight key={active} area={active} /> : null}
    </div>
  );
};

const UrlBar = ({ secure }: { secure: boolean }) => (
  <div
    style={{
      position: "absolute",
      top: 14,
      left: 20,
      right: 20,
      height: 50,
      borderRadius: 25,
      background: "rgba(255,255,255,.07)",
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "0 24px",
      fontSize: 26,
      color: C.silverHi,
    }}
  >
    <span style={{ color: secure ? C.green : C.red, fontWeight: 700 }}>
      {secure ? "🔒" : "⚠ No seguro"}
    </span>
    {secure ? "https://" : "http://"}tuempresa.com.ar
  </div>
);

const Bar = ({ w, h = 18, o = 0.18, style }: { w: number | string; h?: number; o?: number; style?: CSSProperties }) => (
  <div style={{ width: w, height: h, borderRadius: h / 2, background: `rgba(255,255,255,${o})`, ...style }} />
);

const BadSite = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <UrlBar secure={false} />
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 20,
          right: 20,
          height: 290,
          borderRadius: 18,
          background: "linear-gradient(135deg,#1B1E28,#2A2E3A)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: "50%",
            border: "8px solid rgba(255,255,255,.12)",
            borderTopColor: C.silverHi,
            rotate: `${frame * 9}deg`,
          }}
        />
      </div>
      <div style={{ position: "absolute", top: 410, left: 50, right: 50, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: C.silverHi }}>Bienvenidos a nuestra web</div>
        <Bar w="92%" />
        <Bar w="80%" />
        <Bar w="64%" />
      </div>
      <div style={{ position: "absolute", bottom: 40, right: 50, fontSize: 20, color: C.silver }}>contacto</div>
    </>
  );
};

const GoodSite = () => (
  <>
    <UrlBar secure />
    <div
      style={{
        position: "absolute",
        top: 90,
        left: 20,
        right: 20,
        height: 290,
        borderRadius: 18,
        background: `radial-gradient(circle at 75% 30%, ${C.blueGlow}, transparent 60%), linear-gradient(135deg,#10142E,#0B0D14)`,
        padding: "44px 44px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 22,
      }}
    >
      <div style={{ fontSize: 50, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.02em", maxWidth: 640 }}>
        Estudio contable para pymes de Córdoba
      </div>
      <div style={{ fontSize: 26, color: C.silverHi }}>Impuestos y sueldos al día, sin vueltas.</div>
    </div>
    <div style={{ position: "absolute", top: 420, left: 50, right: 50, display: "flex", gap: 22 }}>
      {["Monotributo", "Sueldos", "Sociedades"].map((s) => (
        <div key={s} style={{ flex: 1, padding: "22px 0", borderRadius: 18, background: "rgba(255,255,255,.06)", textAlign: "center", fontSize: 26, fontWeight: 700 }}>
          {s}
        </div>
      ))}
    </div>
    <div
      style={{
        position: "absolute",
        bottom: 34,
        left: 50,
        padding: "20px 34px",
        borderRadius: 16,
        background: C.blue,
        fontSize: 28,
        fontWeight: 700,
      }}
    >
      Pedí tu presupuesto →
    </div>
    <div
      style={{
        position: "absolute",
        bottom: 26,
        right: 40,
        width: 92,
        height: 92,
        borderRadius: "50%",
        background: "#25D366",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 26,
        fontWeight: 700,
        color: "#062b14",
      }}
    >
      WA
    </div>
  </>
);

const Highlight = ({ area }: { area: string }) => {
  const frame = useCurrentFrame();
  const p = useIn(0, 0.35);
  return (
    <div
      style={{
        position: "absolute",
        ...AREAS[area],
        borderRadius: 18,
        border: `5px solid ${C.red}`,
        background: "rgba(255,59,78,.10)",
        boxShadow: `0 0 ${30 + Math.sin(frame / 4) * 14}px rgba(255,59,78,.7)`,
        opacity: p,
        scale: interpolate(p, [0, 1], [1.12, 1]),
      }}
    />
  );
};

const FlagCard = ({ index, title, body }: { index: number; title: string; body: string }) => {
  const p = useIn(0, 0.45);
  return (
    <Card p={p}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div style={{ padding: "6px 18px", borderRadius: 14, background: C.red, fontSize: 34, fontWeight: 700 }}>
          {index + 1}/4
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</div>
      </div>
      <div style={{ fontSize: 40, lineHeight: 1.25, color: C.silverHi }}>{body}</div>
    </Card>
  );
};

const FixCard = () => {
  const p = useIn(0.2, 0.5);
  return (
    <Card p={p}>
      <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: "-0.02em", color: C.green }}>
        ✓ Así se ve resuelta
      </div>
      <div style={{ fontSize: 40, lineHeight: 1.25, color: C.silverHi }}>
        Segura, rápida, clara y con WhatsApp a un toque.
      </div>
    </Card>
  );
};

const Card = ({ p, children }: { p: number; children: ReactNode }) => (
  <div
    style={{
      position: "absolute",
      top: 1240,
      left: 90,
      right: 90,
      display: "flex",
      flexDirection: "column",
      gap: 18,
      opacity: p,
      translate: `0px ${(1 - p) * 50}px`,
    }}
  >
    {children}
  </div>
);
