import type { ReactNode } from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandBug, C, EndCard, Glass, Music, Sfx, Stage, WordsIn, useIn } from "./brand";

// Reel 2 — "5 señales de que hackearon tu web". Service: ciberseguridad (WordPress remediation).
const SIGNS = [
  { title: "Te redirige a sitios raros", body: "Casinos, farmacias o descargas que vos nunca pusiste.", visual: "redirect" },
  { title: "Google avisa que fue hackeado", body: "Y tus clientes lo ven antes de entrar.", visual: "google" },
  { title: "Hay usuarios admin que nadie creó", body: "Alguien se dejó una puerta abierta.", visual: "users" },
  { title: "Tus emails caen en spam", body: "De un día para el otro, sin cambiar nada.", visual: "spam" },
  { title: "Se volvió lenta sin motivo", body: "Puede estar trabajando para otro.", visual: "slow" },
] as const;

const HOOK = 2.6;
const SIGN_LEN = 2.2;
const ASK_START = HOOK + SIGNS.length * SIGN_LEN;
const FIX_START = ASK_START + 1.6;
const END_START = FIX_START + 3.2;
export const SENALES_SECONDS = END_START + 3.8;

export const SenalesHackeo = () => {
  const { fps } = useVideoConfig();
  return (
    <Stage accent={C.orangeGlow}>
      <BrandBug />
      <Music track="tension" volume={0.55} />
      <Sfx name="whoosh" at={0.1} />
      <Sfx name="whoosh" at={0.6} />
      {SIGNS.map((s, i) => (
        <Sfx key={s.visual} name="switch" at={HOOK + i * SIGN_LEN} volume={0.7} />
      ))}
      <Sfx name="whoosh" at={ASK_START} />
      {STEPS.map((s, i) => (
        <Sfx key={s} name="mouse-click" at={FIX_START + 0.45 + i * 0.4} volume={0.8} />
      ))}
      <Sfx name="ding" at={FIX_START + 1.4} volume={0.45} />
      <Sfx name="whoosh" at={END_START} />
      <Sequence durationInFrames={HOOK * fps} name="Gancho">
        <Hook />
      </Sequence>
      {SIGNS.map((s, i) => (
        <Sequence key={s.visual} from={(HOOK + i * SIGN_LEN) * fps} durationInFrames={SIGN_LEN * fps} name={`Señal ${i + 1}`}>
          <Sign index={i} title={s.title} body={s.body} visual={s.visual} />
        </Sequence>
      ))}
      <Sequence from={ASK_START * fps} durationInFrames={1.6 * fps} name="Pregunta">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <WordsIn text="¿Te pasó alguna?" start={0} size={112} accentWords={["alguna?"]} accent={C.orange} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={FIX_START * fps} durationInFrames={3.2 * fps} name="Solución">
        <Fix />
      </Sequence>
      <Sequence from={END_START * fps} name="CTA">
        <EndCard
          keyword="REVISIÓN"
          promise="y vemos tu caso por WhatsApp, sin compromiso."
          footnote="Trabajamos solo con autorización del responsable del sitio."
          accent={C.orange}
        />
      </Sequence>
    </Stage>
  );
};

const Hook = () => {
  const frame = useCurrentFrame();
  // Short RGB-split jitter on a few frames sells the "glitch" without hurting legibility.
  const glitch = frame % 17 < 3 && frame > 20 ? 1 : 0;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 80px" }}>
      <div
        style={{
          textShadow: glitch ? `-6px 0 ${C.red}, 6px 0 ${C.blueSoft}` : "none",
          translate: glitch ? "4px 0px" : "0px 0px",
        }}
      >
        <WordsIn text="Si tu web hace esto," start={0.1} size={104} />
        <WordsIn text="ya la hackearon." start={0.6} size={118} accentWords={["hackearon."]} accent={C.orange} style={{ marginTop: 16 }} />
      </div>
    </AbsoluteFill>
  );
};

const Sign = ({ index, title, body, visual }: { index: number; title: string; body: string; visual: string }) => {
  const p = useIn(0, 0.45);
  const q = useIn(0.25, 0.5);
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
      <div
        style={{
          fontSize: 200,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.05em",
          color: C.orange,
          opacity: p,
          scale: interpolate(p, [0, 1], [1.3, 1]),
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <div style={{ width: 900, height: 470, marginTop: 40, opacity: q, translate: `0px ${(1 - q) * 60}px` }}>
        <Glass style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
          <Visual kind={visual} />
        </Glass>
      </div>
      <div style={{ width: 900, marginTop: 50, opacity: q, textAlign: "center" }}>
        <div style={{ fontSize: 62, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.08 }}>{title}</div>
        <div style={{ fontSize: 42, color: C.silverHi, marginTop: 16, lineHeight: 1.25 }}>{body}</div>
      </div>
    </AbsoluteFill>
  );
};

const Center = ({ children, gap = 26 }: { children: ReactNode; gap?: number }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap, padding: 50 }}>
    {children}
  </AbsoluteFill>
);

const Pill = ({ children, color = "rgba(255,255,255,.08)", fg = C.silverHi }: { children: ReactNode; color?: string; fg?: string }) => (
  <div style={{ padding: "20px 34px", borderRadius: 30, background: color, color: fg, fontSize: 36, fontWeight: 700, width: "100%", boxSizing: "border-box" }}>
    {children}
  </div>
);

const Visual = ({ kind }: { kind: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (kind === "redirect") {
    const swapped = t > 0.9;
    return (
      <Center>
        <Pill fg={swapped ? C.silver : C.ink}>🌐 tuempresa.com.ar</Pill>
        <div style={{ fontSize: 60, color: C.orange }}>↓</div>
        <Pill color={swapped ? "rgba(255,59,78,.18)" : "rgba(255,255,255,.04)"} fg={swapped ? C.red : "transparent"}>
          ⚠ c4sino-bonus.xyz
        </Pill>
      </Center>
    );
  }
  if (kind === "google") {
    return (
      <Center gap={14}>
        <div style={{ width: "100%", fontSize: 28, color: C.silver }}>tuempresa.com.ar</div>
        <div style={{ width: "100%", fontSize: 44, color: "#8AB4F8", fontWeight: 700 }}>Tu Empresa | Servicios</div>
        <div style={{ width: "100%", fontSize: 34, color: C.red, fontWeight: 700, opacity: interpolate(t, [0.7, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          Este sitio puede haber sido hackeado.
        </div>
        <div style={{ width: "100%", height: 16, borderRadius: 8, background: "rgba(255,255,255,.12)", marginTop: 10 }} />
        <div style={{ width: "70%", alignSelf: "flex-start", height: 16, borderRadius: 8, background: "rgba(255,255,255,.12)" }} />
      </Center>
    );
  }
  if (kind === "users") {
    const show = t > 0.8;
    return (
      <Center gap={18}>
        <Pill>👤 admin · vos</Pill>
        <Pill>👤 editor · tu equipo</Pill>
        <Pill color={show ? "rgba(255,59,78,.18)" : "rgba(255,255,255,.08)"} fg={show ? C.red : C.silverHi}>
          👤 wp_support_2 · {show ? "¿¿quién??" : "administrador"}
        </Pill>
      </Center>
    );
  }
  if (kind === "spam") {
    const moved = interpolate(t, [0.6, 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <Center gap={18}>
        <div style={{ width: "100%", fontSize: 30, color: C.silver }}>Bandeja de tu cliente</div>
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 20, translate: `${moved * 40}px 0px` }}>
          <Pill>✉ Tu presupuesto está listo</Pill>
        </div>
        <div
          style={{
            alignSelf: "flex-end",
            padding: "10px 26px",
            borderRadius: 14,
            background: C.red,
            fontSize: 34,
            fontWeight: 700,
            opacity: moved,
            scale: interpolate(moved, [0, 1], [1.4, 1]),
          }}
        >
          SPAM
        </div>
      </Center>
    );
  }
  // slow
  const prog = Math.min(0.32, t * 0.12);
  return (
    <Center>
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: "50%",
          border: "10px solid rgba(255,255,255,.12)",
          borderTopColor: C.orange,
          rotate: `${frame * 7}deg`,
        }}
      />
      <div style={{ width: "100%", height: 22, borderRadius: 11, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ width: `${prog * 100}%`, height: "100%", background: C.orange }} />
      </div>
      <div style={{ fontSize: 34, color: C.silver }}>Cargando…</div>
    </Center>
  );
};

const STEPS = ["Limpiamos el código malicioso", "Blindamos tu WordPress", "Volvemos a probar que quedó cerrado"];

const Fix = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 90px", gap: 40 }}>
    <WordsIn text="Lo resolvemos así:" start={0} size={88} />
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
      {STEPS.map((s, i) => (
        <Step key={s} n={i + 1} text={s} start={0.45 + i * 0.4} />
      ))}
    </div>
  </AbsoluteFill>
);

const Step = ({ n, text, start }: { n: number; text: string; start: number }) => {
  const p = useIn(start, 0.45);
  return (
    <div style={{ opacity: p, translate: `${(1 - p) * -60}px 0px` }}>
      <Glass style={{ display: "flex", alignItems: "center", gap: 28, padding: "30px 36px", borderRadius: 28 }}>
        <div
          style={{
            minWidth: 72,
            height: 72,
            borderRadius: 20,
            background: C.blue,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 38,
            fontWeight: 700,
          }}
        >
          {n}
        </div>
        <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1.15 }}>{text}</div>
      </Glass>
    </div>
  );
};
