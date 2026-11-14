import { Audio } from "@remotion/media";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandBug, C, Glass, Music, Sfx, Stage, WordsIn, chromeText } from "./brand";
import { Burst, DrawPath, Float3D, Glitch, LightSweep, Ripples, Roll, SceneShell, Shake, Tap, ramp, useSpringAt, useT } from "./fx";
import vo from "./story-vo.json";

// Story reel — "Martín perdió 3 clientes". Dramatized, illustrative case that ties
// ciberseguridad (WordPress hackeado) and desarrollo web (web lenta, sin WhatsApp).
// Voice and word timings come from scripts/voiceover.py → src/story-vo.json.

type Word = { text: string; start: number; end: number };
type SceneId = "hook" | "setup" | "hacked" | "slow" | "turn" | "fix" | "result" | "cta";

const PAD = 0.55;
// Extra hold so the chat can be read and the CTA stays on screen.
const HOLD: Partial<Record<SceneId, number>> = { turn: 1.4, cta: 2.6 };
const SCENES = (() => {
  let t = 0;
  return vo.map((s) => {
    const words = s.words as Word[];
    const dur = words[words.length - 1].end + PAD + (HOLD[s.id as SceneId] ?? 0);
    const scene = { id: s.id as SceneId, words, start: t, dur };
    t += dur;
    return scene;
  });
})();
const scene = (id: SceneId) => SCENES.find((s) => s.id === id)!;
export const HISTORIA_SECONDS = SCENES.reduce((acc, s) => acc + s.dur, 0);

/** Seconds (relative to the scene) when `word` is first spoken. */
const cue = (id: SceneId, word: string) => {
  const w = scene(id).words.find((x) => x.text.toLowerCase().startsWith(word.toLowerCase()));
  return w ? w.start : 0;
};

const TURN = scene("turn").start;
const WA = "#25D366";

export const HistoriaMartin = () => {
  const { fps } = useVideoConfig();
  return (
    <Stage accent={C.blueGlow}>
      <TensionGlow />
      <BrandBug />
      <IllustrativeChip />
      <Music track="tension" volume={0.2} duration={TURN + 0.4} />
      <Music track="uplift" volume={0.22} from={TURN} />
      {SCENES.map((s) => (
        <Sequence key={s.id} from={Math.round(s.start * fps)} durationInFrames={Math.round(s.dur * fps)} name={s.id}>
          <Audio name={`Voz ${s.id}`} src={staticFile(`vo/${s.id}.mp3`)} />
          <SceneShell dur={s.dur}>
            <SceneVisual id={s.id} />
          </SceneShell>
          <LightSweep />
          <Captions words={s.words} accent={s.start < TURN ? C.orange : C.blue} />
        </Sequence>
      ))}
      {SCENES.slice(1).map((s) => (
        <Sfx key={s.id} name="whoosh" at={s.start} volume={0.35} />
      ))}
      <Sfx name="shutter-modern" at={0.05} volume={0.6} />
      <Sfx name="switch" at={scene("hacked").start + cue("hacked", "esto")} volume={0.8} />
      <Sfx name="mouse-click" at={scene("hacked").start + 0.5} volume={0.6} />
      <Sfx name="mouse-click" at={scene("hacked").start + cue("hacked", "Cerró")} volume={0.9} />
      <Sfx name="ding" at={TURN + 0.3} volume={0.4} />
      <Sfx name="switch" at={scene("fix").start + cue("fix", "blindamos")} volume={0.6} />
      <Sfx name="ding" at={scene("result").start + cue("result", "consultas")} volume={0.35} />
      <Sfx name="mouse-click" at={scene("cta").start + cue("cta", "Comentá") + 0.6} volume={0.9} />
    </Stage>
  );
};

/** Orange danger glow that pulses during the problem and dissolves at the turn. */
const TensionGlow = () => {
  const t = useT();
  const k = 1 - ramp(t, TURN, TURN + 0.8);
  if (k <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, rgba(250,54,1,${0.22 + Math.sin(t * 3) * 0.06}), transparent 65%)`,
        opacity: k,
      }}
    />
  );
};

const SceneVisual = ({ id }: { id: SceneId }) => {
  switch (id) {
    case "hook":
      return <Hook />;
    case "setup":
      return <Setup />;
    case "hacked":
      return <Hacked />;
    case "slow":
      return <Slow />;
    case "turn":
      return <Turn />;
    case "fix":
      return <Fix />;
    case "result":
      return <Result />;
    case "cta":
      return <Cta />;
  }
};

const IllustrativeChip = () => (
  <div style={{ position: "absolute", top: 196, left: 0, right: 0, textAlign: "center", fontSize: 26, color: C.silver }}>
    Historia ilustrativa
  </div>
);

/* ---------- captions ---------- */

/** Karaoke captions: short chunks, the spoken word sits on an accent pill. */
const Captions = ({ words, accent }: { words: Word[]; accent: string }) => {
  const t = useT();
  const chunks: Word[][] = [];
  for (const w of words) {
    const last = chunks[chunks.length - 1];
    const len = last ? last.reduce((a, x) => a + x.text.length + 1, 0) : 99;
    if (!last || last.length >= 3 || len + w.text.length > 18) chunks.push([w]);
    else last.push(w);
  }
  const idx = chunks.findIndex((c, i) => t < (chunks[i + 1]?.[0].start ?? Infinity));
  const current = chunks[idx === -1 ? chunks.length - 1 : idx];
  if (t > words[words.length - 1].end + 0.4) return null;
  return (
    <div
      key={current[0].start}
      style={{
        position: "absolute",
        top: 1340,
        left: 70,
        right: 70,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "8px 10px",
        fontSize: 68,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
      }}
    >
      {current.map((w, i) => {
        // A word stays lit until the next one starts, so only one pill shows at a time.
        const next = words[words.indexOf(w) + 1];
        return <CapWord key={i} w={w} until={next ? next.start : w.end + 0.3} accent={accent} />;
      })}
    </div>
  );
};

const CapWord = ({ w, until, accent }: { w: Word; until: number; accent: string }) => {
  const t = useT();
  const s = useSpringAt(w.start - 0.05, 12, 200);
  const active = t >= w.start && t < until;
  return (
    <span
      style={{
        padding: "4px 18px 10px",
        borderRadius: 18,
        background: active ? accent : "transparent",
        boxShadow: active ? `0 10px 40px ${accent}88` : "none",
        color: t >= w.start ? C.ink : "rgba(242,244,248,.4)",
        scale: active ? 1.06 : Math.min(1, 0.9 + s * 0.1),
        textShadow: active ? "none" : "0 6px 30px rgba(0,0,0,.9)",
      }}
    >
      {w.text}
    </span>
  );
};

/* ---------- shared pieces ---------- */

const Abs = ({ top, children, style }: { top: number; children: ReactNode; style?: CSSProperties }) => (
  <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", ...style }}>{children}</div>
);

const SpringIn = ({ at, children, from = 80, style, damping = 12 }: { at: number; children: ReactNode; from?: number; style?: CSSProperties; damping?: number }) => {
  const s = useSpringAt(at, damping, 150);
  return <div style={{ opacity: Math.min(1, s * 2), translate: `0px ${(1 - s) * from}px`, scale: 0.6 + 0.4 * s, ...style }}>{children}</div>;
};

const Person = ({ color = C.silverHi, size = 1 }: { color?: string; size?: number }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * size }}>
    <div style={{ width: 70 * size, height: 70 * size, borderRadius: "50%", background: color, boxShadow: `0 0 30px ${color}55` }} />
    <div style={{ width: 130 * size, height: 80 * size, borderRadius: `${60 * size}px ${60 * size}px ${16 * size}px ${16 * size}px`, background: color, boxShadow: `0 0 30px ${color}55` }} />
  </div>
);

const Phone = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      position: "relative",
      width: 500,
      height: 900,
      borderRadius: 64,
      padding: 14,
      background: "linear-gradient(155deg,#F4F6FA 0%,#9BA2B4 22%,#2A2E3A 46%,#C9CED9 58%,#6E74FF 74%,#1A1C26 86%,#FA3601 100%)",
      boxShadow: "0 60px 160px rgba(0,0,0,.8), 0 0 80px rgba(46,55,255,.25)",
      ...style,
    }}
  >
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 52, background: "#0B0D14", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 18, left: "50%", width: 130, height: 34, marginLeft: -65, borderRadius: 20, background: "#000", zIndex: 5 }} />
      {children}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(125deg, rgba(255,255,255,.10) 0%, transparent 35%)", pointerEvents: "none" }} />
    </div>
  </div>
);

const Row = ({ w, o = 0.14, h = 16 }: { w: string; o?: number; h?: number }) => (
  <div style={{ width: w, height: h, borderRadius: h / 2, background: `rgba(255,255,255,${o})` }} />
);

/* ---------- 1. hook ---------- */

const Hook = () => {
  const t = useT();
  const slam = useSpringAt(0.05, 9, 180);
  const lose = [cue("hook", "tres"), cue("hook", "clientes"), cue("hook", "semana")].map((a) => a + 0.25);
  const why = cue("hook", "idea");
  return (
    <Shake at={0.25} dur={0.45} amp={22} style={{ position: "absolute", inset: 0 }}>
      <Abs top={250}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              fontSize: 420,
              fontWeight: 700,
              lineHeight: 0.9,
              letterSpacing: "-0.06em",
              color: C.orange,
              textShadow: `0 0 120px ${C.orangeGlow}, 0 0 40px ${C.orange}`,
              scale: 3.2 - 2.2 * slam,
              opacity: Math.min(1, slam * 3),
            }}
          >
            3
          </div>
          <Burst at={0.25} color={C.orange} count={26} dist={420} size={18} seed="h3" />
          <Ripples at={0.25} color={C.orange} count={2} period={0.9} max={900} until={1.4} />
        </div>
      </Abs>
      <Abs top={660}>
        <WordsIn text="clientes perdidos" start={0.45} size={96} />
        <WordsIn text="en una semana" start={0.8} size={70} style={{ marginTop: 10 }} />
      </Abs>
      <Abs top={940} style={{ flexDirection: "row", justifyContent: "center", gap: 70 }}>
        {lose.map((at, i) => {
          const gone = ramp(t, at, at + 0.5);
          return (
            <SpringIn key={i} at={0.6 + i * 0.12}>
              <div style={{ position: "relative" }}>
                <div style={{ opacity: 1 - gone, scale: 1 - gone * 0.4, translate: `${gone * 40}px ${-gone * 40}px`, filter: `blur(${gone * 8}px)` }}>
                  <Person color={t > at ? C.orange : C.silverHi} />
                </div>
                <Burst at={at} color={C.orange} count={14} dist={160} size={12} seed={`p${i}`} />
              </div>
            </SpringIn>
          );
        })}
      </Abs>
      {t > why ? (
        <Abs top={1150}>
          <Glitch at={why} dur={0.45}>
            <SpringIn at={why} from={40}>
              <div style={{ fontSize: 76, fontWeight: 700, color: C.ink }}>¿Por qué?</div>
            </SpringIn>
          </Glitch>
        </Abs>
      ) : null}
    </Shake>
  );
};

/* ---------- 2. setup ---------- */

const Setup = () => {
  const t = useT();
  const card = useSpringAt(0.05, 14, 120);
  const siteAt = cue("setup", "Su");
  const yearsAt = cue("setup", "años");
  const nobody = cue("setup", "nadie");
  const decay = ramp(t, yearsAt, nobody + 0.6);
  return (
    <>
      <Abs top={300} style={{ perspective: 1400 }}>
        <div style={{ transform: `rotateY(${(1 - card) * -80}deg) translateX(${(1 - card) * -200}px)`, opacity: Math.min(1, card * 2) }}>
          <Glass style={{ display: "flex", alignItems: "center", gap: 30, padding: "30px 46px" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 120, height: 120, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blueSoft}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, fontWeight: 700, boxShadow: `0 0 50px ${C.blueGlow}` }}>
                M
              </div>
            </div>
            <div>
              <div style={{ fontSize: 60, fontWeight: 700 }}>Martín</div>
              <div style={{ fontSize: 38, color: C.silverHi }}>Estudio contable · Córdoba</div>
            </div>
          </Glass>
        </div>
      </Abs>
      <Abs top={560}>
        <Float3D enterAt={siteAt} rotY={10} rotX={14}>
          <div style={{ position: "relative", filter: `grayscale(${decay}) brightness(${1 - decay * 0.35})` }}>
            <OldSite decay={decay} />
            <div style={{ position: "absolute", top: -40, right: -30, padding: "12px 26px", borderRadius: 18, background: C.steel, fontSize: 44, fontWeight: 700, rotate: "6deg", boxShadow: "0 20px 50px rgba(0,0,0,.6)" }}>
              <Roll from={2019} to={2026} at={yearsAt} dur={nobody - yearsAt + 0.4} />
            </div>
          </div>
        </Float3D>
      </Abs>
      {t > nobody ? (
        <Abs top={1130}>
          <SpringIn at={nobody}>
            <div style={{ padding: "14px 30px", borderRadius: 20, background: "rgba(250,54,1,.16)", border: `2px solid ${C.orange}`, color: C.orange, fontSize: 40, fontWeight: 700 }}>
              ⚠ 7 años sin actualizar
            </div>
          </SpringIn>
        </Abs>
      ) : null}
    </>
  );
};

const OldSite = ({ decay }: { decay: number }) => (
  <Glass style={{ width: 860, height: 470, position: "relative", overflow: "hidden", background: "#15161B" }}>
    <div style={{ position: "absolute", top: 18, left: 20, right: 20, height: 46, borderRadius: 23, background: "rgba(255,255,255,.06)", fontSize: 24, color: C.silver, display: "flex", alignItems: "center", padding: "0 22px" }}>
      http://estudiomartin.com.ar
    </div>
    <div style={{ position: "absolute", top: 90, left: 30, right: 30, height: 190, borderRadius: 14, background: "linear-gradient(135deg,#2E3A66,#1C1D22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, opacity: 1 - decay * 0.5 }}>
      🖼️
    </div>
    <div style={{ position: "absolute", top: 305, left: 40, right: 40, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 38, fontWeight: 700, color: C.silverHi }}>Bienvenidos</div>
      <Row w="90%" />
      <Row w="70%" />
    </div>
    {/* Cracks spread as the site ages. */}
    <svg viewBox="0 0 860 470" style={{ position: "absolute", inset: 0 }}>
      <path
        d="M620 0 L590 80 L640 140 L600 230 L660 320 M640 140 L720 170 M600 230 L520 260"
        stroke="rgba(255,255,255,.5)"
        strokeWidth={3}
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - decay}
      />
    </svg>
  </Glass>
);

/* ---------- 3. hacked ---------- */

const Typing = ({ text, at, cps = 20 }: { text: string; at: number; cps?: number }) => {
  const frame = useCurrentFrame();
  const t = useT();
  const n = Math.max(0, Math.floor((t - at) * cps));
  return (
    <>
      {text.slice(0, n)}
      <span style={{ opacity: Math.floor(frame / 8) % 2 ? 1 : 0, color: C.blueSoft }}>|</span>
    </>
  );
};

const Hacked = () => {
  const t = useT();
  const resultsAt = cue("hacked", "Google");
  const warnAt = cue("hacked", "esto");
  const closeAt = cue("hacked", "Cerró");
  const closed = t >= closeAt + 0.3;
  const pop = useSpringAt(warnAt, 9, 160);
  const fall = ramp(t, closeAt, closeAt + 0.6);
  const alarm = t > warnAt && t < closeAt ? 0.35 + Math.sin(t * 14) * 0.15 : 0;
  return (
    <>
      <AbsoluteFill style={{ boxShadow: `inset 0 0 300px rgba(255,59,78,${alarm})` }} />
      <Shake at={warnAt} dur={0.5} amp={20} style={{ position: "absolute", inset: 0 }}>
        <Abs top={320}>
          <Float3D rotY={-14} rotX={4}>
            <Glitch at={warnAt} dur={0.5}>
              <Phone>
                {!closed ? (
                  <div style={{ position: "absolute", inset: 0, padding: "90px 30px 30px", display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ fontSize: 46, fontWeight: 700, textAlign: "center", color: "#8AB4F8" }}>Google</div>
                    <div style={{ height: 70, borderRadius: 35, background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", padding: "0 26px", fontSize: 28 }}>
                      <Typing text="contador en córdoba" at={0.6} />
                    </div>
                    {t > resultsAt ? (
                      <SpringIn at={resultsAt} from={30} style={{ transformOrigin: "50% 0%" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 20, borderRadius: 20, background: t >= warnAt ? "rgba(255,59,78,.14)" : "rgba(255,255,255,.04)", border: `3px solid ${t >= warnAt ? C.red : "transparent"}` }}>
                          <div style={{ fontSize: 22, color: C.silver }}>estudiomartin.com.ar</div>
                          <div style={{ fontSize: 32, fontWeight: 700, color: "#8AB4F8" }}>Estudio Martín | Contador</div>
                          <Row w="80%" o={0.12} h={12} />
                        </div>
                      </SpringIn>
                    ) : null}
                    {[0, 1, 2].map((i) =>
                      t > resultsAt + 0.15 * (i + 1) ? (
                        <SpringIn key={i} at={resultsAt + 0.15 * (i + 1)} from={30}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 20px" }}>
                            <Row w="40%" o={0.1} h={12} />
                            <Row w="75%" o={0.22} h={18} />
                          </div>
                        </SpringIn>
                      ) : null,
                    )}
                  </div>
                ) : (
                  <CallScreen at={closeAt + 0.3} />
                )}
              </Phone>
            </Glitch>
          </Float3D>
          <Tap
            path={[
              { at: 0.3, x: 760, y: 900 },
              { at: 0.5, x: 560, y: 260 },
              { at: closeAt - 0.4, x: 560, y: 260 },
              { at: closeAt, x: 380, y: 120 },
              { at: closeAt + 0.6, x: 900, y: 1200 },
            ]}
            tapAt={[0.5, closeAt]}
          />
        </Abs>
      </Shake>
      {t > warnAt && fall < 1 ? (
        <Abs top={780} style={{ perspective: 1200 }}>
          <div style={{ scale: 0.4 + 0.75 * pop, rotate: `${-4 + fall * 25}deg`, translate: `${fall * 200}px ${fall * 900}px`, opacity: 1 - fall }}>
            <div style={{ position: "relative", width: 860, padding: "34px 40px", borderRadius: 32, background: "#1A0B10", border: `4px solid ${C.red}`, boxShadow: `0 40px 120px rgba(0,0,0,.8), 0 0 80px rgba(255,59,78,.5)` }}>
              <div style={{ fontSize: 28, color: C.silver }}>estudiomartin.com.ar</div>
              <div style={{ fontSize: 44, fontWeight: 700, color: "#8AB4F8", marginTop: 6 }}>Estudio Martín | Contador</div>
              <div style={{ fontSize: 46, fontWeight: 700, color: C.red, marginTop: 14, lineHeight: 1.15 }}>⚠ Este sitio puede haber sido hackeado.</div>
              <Burst at={warnAt} color={C.red} count={20} dist={520} size={16} seed="warn" />
            </div>
          </div>
        </Abs>
      ) : null}
    </>
  );
};

const CallScreen = ({ at }: { at: number }) => {
  const t = useT();
  const s = useSpringAt(at, 12, 150);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 34, translate: `${(1 - s) * 470}px 0px` }}>
      <div style={{ position: "relative", width: 170, height: 170 }}>
        <Ripples at={at} color={WA} count={3} period={1.1} max={420} />
        <div style={{ width: 170, height: 170, borderRadius: "50%", background: WA, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 84, rotate: `${Math.sin(t * 30) * 8}deg` }}>📞</div>
      </div>
      <div style={{ fontSize: 34, color: C.silverHi }}>Llamando a</div>
      <div style={{ fontSize: 50, fontWeight: 700, color: C.orange, textAlign: "center", lineHeight: 1.1 }}>otro<br />contador…</div>
    </AbsoluteFill>
  );
};

/* ---------- 4. slow ---------- */

const Slow = () => {
  const frame = useCurrentFrame();
  const t = useT();
  const lostAt = cue("slow", "no");
  const ring = Math.min(0.75, t * 0.16);
  const bubbles = [
    { text: "¿WhatsApp?", x: -330, y: 120, r: -8 },
    { text: "¿Teléfono?", x: 330, y: 330, r: 7 },
    { text: "¿Precios?", x: -320, y: 560, r: -5 },
  ];
  return (
    <>
      <Abs top={300}>
        <div style={{ position: "relative" }}>
          <svg width={760} height={760} viewBox="0 0 760 760" style={{ position: "absolute", left: -130, top: 70, rotate: "-90deg" }}>
            <circle cx={380} cy={380} r={360} stroke="rgba(255,255,255,.07)" strokeWidth={14} fill="none" />
            <circle cx={380} cy={380} r={360} stroke={C.orange} strokeWidth={14} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ring} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 16px ${C.orange})` }} />
          </svg>
          <Float3D rotY={12} rotX={4}>
            <Phone>
              <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 40, padding: 40 }}>
                <div style={{ width: 130, height: 130, borderRadius: "50%", border: "12px solid rgba(255,255,255,.1)", borderTopColor: C.orange, rotate: `${frame * 7}deg` }} />
                <div style={{ width: "100%", height: 20, borderRadius: 10, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(28, t * 7)}%`, height: "100%", background: C.orange }} />
                </div>
                <div style={{ fontSize: 96, fontWeight: 700, ...chromeText }}>
                  {Math.min(12, t * 2.4).toFixed(1).replace(".", ",")} s
                </div>
              </AbsoluteFill>
            </Phone>
          </Float3D>
          {bubbles.map((b, i) =>
            t > lostAt + i * 0.22 ? (
              <div key={b.text} style={{ position: "absolute", left: 250 + b.x - 130, top: b.y }}>
                <SpringIn at={lostAt + i * 0.22} damping={9}>
                  <div style={{ padding: "18px 30px", borderRadius: 26, background: i === 0 ? C.orange : C.steel, fontSize: 42, fontWeight: 700, rotate: `${b.r + Math.sin(t * 4 + i) * 3}deg`, boxShadow: "0 20px 60px rgba(0,0,0,.6)", whiteSpace: "nowrap" }}>
                    {b.text}
                  </div>
                </SpringIn>
              </div>
            ) : null,
          )}
        </div>
      </Abs>
    </>
  );
};

/* ---------- 5. turn ---------- */

const Bubble = ({ at, me, children }: { at: number; me?: boolean; children: ReactNode }) => {
  const t = useT();
  if (t < at) return null;
  return (
    <SpringIn at={at} from={40} damping={11} style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "84%", transformOrigin: me ? "100% 100%" : "0% 100%" }}>
      <div style={{ padding: "22px 28px", borderRadius: 28, background: me ? "#005C4B" : "#1F2C34", fontSize: 32, lineHeight: 1.3 }}>{children}</div>
    </SpringIn>
  );
};

const TypingDots = ({ from, to }: { from: number; to: number }) => {
  const frame = useCurrentFrame();
  const t = useT();
  if (t < from || t >= to) return null;
  return (
    <div style={{ alignSelf: "flex-start", display: "flex", gap: 10, padding: "24px 28px", borderRadius: 28, background: "#1F2C34" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: C.silverHi, translate: `0px ${Math.sin(frame / 3 - i) * 6}px` }} />
      ))}
    </div>
  );
};

const Turn = () => {
  const t = useT();
  const wipe = ramp(t, 0, 0.7);
  return (
    <>
      <AbsoluteFill style={{ clipPath: `circle(${wipe * 120}% at 50% 45%)`, background: `radial-gradient(circle at 50% 40%, rgba(46,55,255,.45), transparent 60%)`, opacity: 1 - ramp(t, 1.2, 2.2) * 0.6 }} />
      <Abs top={320}>
        <Float3D rotY={-8} rotX={4}>
          <Phone>
            <div style={{ position: "absolute", top: 70, left: 0, right: 0, padding: "18px 28px", display: "flex", alignItems: "center", gap: 18, borderBottom: `1px solid ${C.line}` }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Img src={staticFile("reac-symbol.svg")} style={{ width: 44, height: 44 }} />
              </div>
              <div>
                <div style={{ fontSize: 30, fontWeight: 700 }}>Reac Studio</div>
                <div style={{ fontSize: 22, color: C.green }}>en línea</div>
              </div>
            </div>
            <div style={{ position: "absolute", top: 200, left: 24, right: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <Bubble at={0.3} me>
                Hola, creo que me hackearon la web 😩 ¿Me ayudan?
              </Bubble>
              <TypingDots from={0.9} to={1.7} />
              <Bubble at={1.7}>¡Hola Martín! Sí, lo vemos hoy mismo 💪</Bubble>
            </div>
          </Phone>
        </Float3D>
        <div style={{ position: "absolute", top: 450, left: "50%" }}>
          <Burst at={1.7} color={C.blueSoft} count={22} dist={420} size={14} seed="turn" />
        </div>
      </Abs>
    </>
  );
};

/* ---------- 6. fix ---------- */

const SHIELD = "M100 12 L178 42 V102 C178 152 144 186 100 204 C56 186 22 152 22 102 V42 Z";

const Fix = () => {
  const t = useT();
  const cleanAt = cue("fix", "limpiamos");
  const shieldAt = cue("fix", "blindamos");
  const redesignAt = cue("fix", "Después");
  const feats = [
    { at: cue("fix", "rápida"), text: "⚡ Rápida" },
    { at: cue("fix", "clara"), text: "✓ Clara" },
    { at: cue("fix", "WhatsApp"), text: "💬 WhatsApp" },
  ];
  const beam = ramp(t, cleanAt + 0.2, cleanAt + 1.4);
  const reveal = ramp(t, redesignAt, redesignAt + 0.9);
  const toCorner = ramp(t, redesignAt - 0.3, redesignAt + 0.4);
  const malware = [
    { x: 120, y: 120, text: "código malicioso" },
    { x: 420, y: 250, text: "usuario extraño" },
    { x: 160, y: 360, text: "redirección" },
  ];
  return (
    <>
      <Abs top={300}>
        <Float3D rotY={-6} rotX={8}>
          <div style={{ position: "relative", width: 900, height: 560 }}>
            <Glass style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0B0D14" }}>
              <div style={{ position: "absolute", inset: 0, filter: "grayscale(.8) brightness(.7)" }}>
                <OldSite decay={0.6} />
              </div>
              <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - reveal * 100}% 0 0)` }}>
                <NewSite />
              </div>
              {reveal > 0 && reveal < 1 ? (
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${reveal * 100}%`, width: 8, background: C.blueSoft, boxShadow: `0 0 40px 14px ${C.blueGlow}` }} />
              ) : null}
              {beam > 0 && beam < 1 ? (
                <div style={{ position: "absolute", left: 0, right: 0, top: `${beam * 100}%`, height: 8, background: C.green, boxShadow: `0 0 40px 12px rgba(47,224,138,.5)` }} />
              ) : null}
            </Glass>
            {malware.map((m, i) => {
              const hitAt = cleanAt + 0.2 + (m.y / 560) * 1.2;
              const zapped = t > hitAt;
              return (
                <div key={m.text} style={{ position: "absolute", left: m.x, top: m.y }}>
                  {!zapped && t > i * 0.15 ? (
                    <SpringIn at={i * 0.15} from={20}>
                      <div style={{ padding: "12px 22px", borderRadius: 16, background: "rgba(255,59,78,.9)", fontSize: 30, fontWeight: 700, whiteSpace: "nowrap", rotate: `${Math.sin(t * 9 + i) * 2}deg` }}>
                        🐛 {m.text}
                      </div>
                    </SpringIn>
                  ) : null}
                  <div style={{ position: "absolute", left: 120, top: 26 }}>
                    <Burst at={hitAt} color={C.red} count={16} dist={180} size={12} seed={`m${i}`} />
                  </div>
                </div>
              );
            })}
            {t > shieldAt ? (
              <div
                style={{
                  position: "absolute",
                  left: interpolate(toCorner, [0, 1], [330, 760]),
                  top: interpolate(toCorner, [0, 1], [560, -70]),
                  width: 240,
                  scale: interpolate(toCorner, [0, 1], [1, 0.55]),
                  transformOrigin: "0 0",
                }}
              >
                <SpringIn at={shieldAt} from={60}>
                  <div style={{ position: "relative", width: 240, height: 250 }}>
                    <svg viewBox="0 0 200 216" style={{ position: "absolute", inset: 0 }}>
                      <path d={SHIELD} fill="rgba(46,55,255,.35)" />
                    </svg>
                    <DrawPath d={SHIELD} at={shieldAt} dur={0.7} color={C.blueSoft} width={9} viewBox="0 0 200 216" style={{ position: "absolute", inset: 0 }} />
                    <DrawPath d="M62 108 L92 138 L142 82" at={shieldAt + 0.5} dur={0.4} color={C.green} width={14} viewBox="0 0 200 216" style={{ position: "absolute", inset: 0 }} />
                  </div>
                </SpringIn>
              </div>
            ) : null}
          </div>
        </Float3D>
      </Abs>
      <Abs top={1010} style={{ flexDirection: "row", justifyContent: "center", gap: 20 }}>
        {feats.map((f) =>
          t > f.at ? (
            <SpringIn key={f.text} at={f.at} damping={9}>
              <div style={{ padding: "16px 28px", borderRadius: 20, background: f.text.includes("WhatsApp") ? WA : C.blue, color: f.text.includes("WhatsApp") ? "#062b14" : C.ink, fontSize: 40, fontWeight: 700, boxShadow: "0 20px 50px rgba(0,0,0,.5)" }}>
                {f.text}
              </div>
            </SpringIn>
          ) : null,
        )}
      </Abs>
    </>
  );
};

const NewSite = () => (
  <>
    <div style={{ position: "absolute", top: 18, left: 20, right: 20, height: 46, borderRadius: 23, background: "rgba(255,255,255,.07)", fontSize: 24, color: C.silverHi, display: "flex", alignItems: "center", gap: 10, padding: "0 22px" }}>
      <span style={{ color: C.green }}>🔒</span> estudiomartin.com.ar
    </div>
    <div style={{ position: "absolute", top: 82, left: 20, right: 20, bottom: 20, borderRadius: 20, padding: 40, background: `radial-gradient(circle at 80% 20%, ${C.blueGlow}, transparent 60%), linear-gradient(135deg,#10142E,#0B0D14)`, display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.04, maxWidth: 620, letterSpacing: "-0.02em" }}>Tu contador en Córdoba, sin vueltas</div>
      <div style={{ fontSize: 26, color: C.silverHi }}>Monotributo · Sueldos · Sociedades</div>
      <div style={{ display: "flex", gap: 16, marginTop: "auto" }}>
        <div style={{ padding: "16px 28px", borderRadius: 14, background: C.blue, fontSize: 26, fontWeight: 700 }}>Pedí tu presupuesto</div>
        <div style={{ padding: "16px 28px", borderRadius: 14, background: WA, color: "#062b14", fontSize: 26, fontWeight: 700 }}>WhatsApp</div>
      </div>
    </div>
  </>
);

/* ---------- 7. result ---------- */

const Notif = ({ at, text, i }: { at: number; text: string; i: number }) => {
  const t = useT();
  if (t < at) return null;
  return (
    <SpringIn at={at} from={-120} damping={11} style={{ marginTop: i === 0 ? 0 : 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 26px", borderRadius: 30, background: "rgba(30,34,48,.92)", border: `1px solid ${C.glassBorder}`, width: 840, boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>
        <div style={{ minWidth: 76, height: 76, borderRadius: 20, background: WA, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>💬</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, fontWeight: 700 }}>
            <span>Nueva consulta</span>
            <span style={{ color: C.silver, fontWeight: 400, fontSize: 24 }}>ahora</span>
          </div>
          <div style={{ fontSize: 28, color: C.silverHi }}>{text}</div>
        </div>
      </div>
    </SpringIn>
  );
};

const Result = () => {
  const t = useT();
  const q = cue("result", "consultas");
  const g = useSpringAt(0.1, 13, 130);
  return (
    <>
      <Abs top={300}>
        <div style={{ perspective: 1400 }}>
          <div style={{ transform: `rotateX(${(1 - g) * 70}deg)`, opacity: Math.min(1, g * 2), transformOrigin: "50% 0%" }}>
            <Glass style={{ width: 900, padding: "34px 40px", display: "flex", flexDirection: "column", gap: 10, border: `2px solid rgba(47,224,138,.4)` }}>
              <div style={{ fontSize: 26, color: C.silver }}>
                <span style={{ color: C.green }}>🔒</span> estudiomartin.com.ar
              </div>
              <div style={{ fontSize: 46, fontWeight: 700, color: "#8AB4F8" }}>Estudio Martín | Contador en Córdoba</div>
              <div style={{ fontSize: 30, color: C.silverHi }}>Monotributo, sueldos y sociedades. Escribinos por WhatsApp.</div>
            </Glass>
          </div>
        </div>
      </Abs>
      <Abs top={640}>
        <Float3D enterAt={0.5} rotY={-8} rotX={10} style={{ opacity: 1 - ramp(t, q - 0.2, q + 0.4) * 0.85 }}>
          <div style={{ position: "relative", width: 820, height: 500 }}>
            <Glass style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0B0D14" }}>
              <NewSite />
            </Glass>
          </div>
        </Float3D>
      </Abs>
      <Abs top={640}>
        <Shake at={q} dur={0.35} amp={8}>
          <Notif at={q} i={0} text="Hola, necesito un contador para mi pyme" />
          <Notif at={q + 0.45} i={1} text="¿Me pasás presupuesto de monotributo?" />
          <Notif at={q + 0.9} i={2} text="Vi tu web, ¿tenés turno esta semana?" />
        </Shake>
        <div style={{ position: "relative", width: 0, height: 0, top: -200 }}>
          <Burst at={q} color={C.green} count={24} dist={500} size={12} seed="res" />
        </div>
      </Abs>
    </>
  );
};

/* ---------- 8. cta ---------- */

const Cta = () => {
  const frame = useCurrentFrame();
  const t = useT();
  const comment = cue("cta", "Comentá");
  const wa = cue("cta", "WhatsApp");
  const free = cue("cta", "sin");
  const k = useSpringAt(comment, 9, 170);
  const press = [comment + 0.6, comment + 2.4, comment + 4.2, comment + 6];
  const pressed = Math.max(0, ...press.map((a) => (t >= a && t < a + 0.25 ? 1 - Math.abs(t - a - 0.12) / 0.13 : 0)));
  const shine = ((t - comment) % 2.2) / 2.2;
  return (
    <>
      <Abs top={290}>
        <WordsIn text="¿Tu web trabaja para vos" start={0.05} size={82} />
        <WordsIn text="o en tu contra?" start={0.55} size={100} accentWords={["contra?"]} accent={C.orange} />
      </Abs>
      {t > comment - 0.1 ? (
        <Abs top={600}>
          <div style={{ fontSize: 50, fontWeight: 700, color: C.silverHi, opacity: Math.min(1, k * 2), marginBottom: 22 }}>Comentá 👇</div>
          <div style={{ position: "relative" }}>
            <Ripples at={comment + 0.3} color={C.blueSoft} count={3} period={1.4} max={900} />
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                fontSize: 136,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                padding: "18px 64px 26px",
                borderRadius: 44,
                background: `linear-gradient(180deg, ${C.blueSoft}, ${C.blue})`,
                boxShadow: `0 ${24 - pressed * 18}px 0 #1A20A8, 0 0 ${90 + Math.sin(frame / 6) * 30}px ${C.blue}`,
                translate: `0px ${pressed * 18}px`,
                scale: 2 - k,
                opacity: Math.min(1, k * 2),
              }}
            >
              REVISIÓN
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${-30 + shine * 160}%`, width: 120, rotate: "20deg", background: "linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)" }} />
            </div>
            <Burst at={comment} color={C.blueSoft} count={28} dist={560} size={16} seed="cta" />
            <Tap
              path={[
                { at: comment + 0.2, x: 760, y: 420 },
                { at: comment + 0.55, x: 520, y: 120 },
              ]}
              tapAt={press}
            />
          </div>
        </Abs>
      ) : null}
      {t > wa - 0.1 ? (
        <Abs top={1000}>
          <SpringIn at={wa} damping={10}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 42px", borderRadius: 999, background: WA, color: "#062b14", fontSize: 46, fontWeight: 700, boxShadow: "0 20px 60px rgba(37,211,102,.4)" }}>
              💬 WhatsApp +54 9 3544 65-7866
            </div>
          </SpringIn>
        </Abs>
      ) : null}
      {t > free - 0.1 ? (
        <Abs top={1140}>
          <SpringIn at={free} from={40}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 50, fontWeight: 700 }}>
              <Img src={staticFile("reac-symbol.svg")} style={{ width: 62, height: 62 }} />
              <span style={chromeText}>reacstudio.com</span>
              <span style={{ fontSize: 34, color: C.silverHi, fontWeight: 400 }}>· sin compromiso</span>
            </div>
          </SpringIn>
        </Abs>
      ) : null}
    </>
  );
};
