"""Generate the story voiceover (one mp3 per scene) plus word timings.

Usage (from the videos/ folder):
  python scripts/voiceover.py                      # free Microsoft voice (edge-tts)
  VOICE=en-US-BrianMultilingualNeural python scripts/voiceover.py
  ELEVENLABS_API_KEY=... [ELEVENLABS_VOICE_ID=...] python scripts/voiceover.py   # human-like voice
Writes public/vo/<scene>.mp3 and src/story-vo.json; the video re-times itself from that file.
"""
import asyncio
import base64
import json
import os
import re
import urllib.request
from pathlib import Path

import edge_tts

VOICE = os.environ.get("VOICE", "es-AR-TomasNeural")
RATE = os.environ.get("RATE", "+0%")
ELEVEN_KEY = os.environ.get("ELEVENLABS_API_KEY")
# Default: "Adam" premade voice; pick a Spanish/Argentine one from the ElevenLabs library.
ELEVEN_VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")

SCENES = [
    ("hook", "Martín perdió tres clientes en una semana. Y no tenía idea por qué."),
    ("setup", "Tiene un estudio contable en Córdoba. Su web la armó un conocido hace años, y nadie la volvió a tocar."),
    ("hacked", "Un día, un cliente nuevo lo buscó en Google. Y lo primero que vio fue esto: este sitio puede haber sido hackeado. Cerró la pestaña y llamó a otro contador."),
    ("slow", "Los que sí entraban desde el celular esperaban, esperaban... y no encontraban cómo escribirle."),
    ("turn", "Ahí Martín nos escribió."),
    ("fix", "Primero limpiamos el código malicioso y blindamos su WordPress. Después rediseñamos la web: rápida, clara, y con WhatsApp a un toque."),
    ("result", "Hoy, cuando lo buscan, encuentran un estudio en el que da gusto confiar. Y las consultas le llegan directo al celular."),
    ("cta", "¿Tu web trabaja para vos, o en tu contra? Comentá REVISIÓN, o escribinos por WhatsApp. Lo vemos juntos, sin compromiso."),
]

ROOT = Path(__file__).resolve().parent.parent


def render_elevenlabs(scene_id: str, text: str) -> dict:
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE}/with-timestamps",
        data=json.dumps({"text": text, "model_id": "eleven_multilingual_v2"}).encode(),
        headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        body = json.load(res)
    (ROOT / "public" / "vo" / f"{scene_id}.mp3").write_bytes(base64.b64decode(body["audio_base64"]))
    al = body["alignment"]
    words, cur, start, end = [], "", None, 0.0
    for ch, s0, s1 in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                words.append({"text": cur, "start": start, "end": end})
            cur, start = "", None
            continue
        if start is None:
            start = s0
        cur, end = cur + ch, s1
    if cur:
        words.append({"text": cur, "start": start, "end": end})
    for w in words:
        w["text"] = re.sub(r"^[¿¡\"']+|[.,;:!?\"']+$", "", w["text"])
    return {"id": scene_id, "text": text, "words": [w for w in words if w["text"]]}


async def render(scene_id: str, text: str) -> dict:
    if ELEVEN_KEY:
        return render_elevenlabs(scene_id, text)
    words = []
    out = ROOT / "public" / "vo" / f"{scene_id}.mp3"
    com = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    with out.open("wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # Offsets come in 100-ns ticks.
                words.append({
                    "text": chunk["text"],
                    "start": chunk["offset"] / 1e7,
                    "end": (chunk["offset"] + chunk["duration"]) / 1e7,
                })
    return {"id": scene_id, "text": text, "words": words}


async def main() -> None:
    scenes = [await render(sid, text) for sid, text in SCENES]
    (ROOT / "src" / "story-vo.json").write_text(json.dumps(scenes, ensure_ascii=False, indent=1), encoding="utf-8")


asyncio.run(main())
