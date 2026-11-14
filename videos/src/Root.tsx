import { Composition, Folder } from "remotion";
import { AUDITORIA_SECONDS, AuditoriaWeb } from "./AuditoriaWeb";
import { HISTORIA_SECONDS, HistoriaMartin } from "./HistoriaMartin";
import { OJOS_SECONDS, OjosHacker } from "./OjosHacker";
import { SENALES_SECONDS, SenalesHackeo } from "./SenalesHackeo";

// Instagram/TikTok Reels: 1080×1920, 30 fps.
export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Reels">
      <Composition
        id="AuditoriaWeb"
        component={AuditoriaWeb}
        durationInFrames={Math.round(AUDITORIA_SECONDS * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SenalesHackeo"
        component={SenalesHackeo}
        durationInFrames={Math.round(SENALES_SECONDS * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="OjosHacker"
        component={OjosHacker}
        durationInFrames={Math.round(OJOS_SECONDS * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="HistoriaMartin"
        component={HistoriaMartin}
        durationInFrames={Math.round(HISTORIA_SECONDS * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
    </Folder>
  );
};
