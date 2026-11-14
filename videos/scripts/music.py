"""Synthesize original, royalty-free background tracks for the reels.

Usage: python scripts/music.py   (from the videos/ folder)
Writes public/music/{tech,tension,uplift}.wav — long enough that no looping is needed.
"""
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
ROOT = Path(__file__).resolve().parent.parent
rng = np.random.default_rng(7)

NOTE = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}


def hz(name: str, octave: int) -> float:
    midi = 12 * (octave + 1) + NOTE[name]
    return 440.0 * 2 ** ((midi - 69) / 12)


def filt(x, kind, cutoff, order=2):
    return sosfilt(butter(order, cutoff, btype=kind, fs=SR, output="sos"), x)


def env(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    return 2 * ((t * f) % 1.0) - 1


def place(buf, sig, start):
    i = int(start * SR)
    if i >= len(buf):
        return
    end = min(len(buf), i + len(sig))
    buf[i:end] += sig[: end - i]


def kick(n=int(0.35 * SR)):
    t = np.arange(n) / SR
    f = 45 + 75 * np.exp(-t / 0.045)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t / 0.16)


def noise_hit(n, lo, hi, decay):
    x = rng.standard_normal(n)
    x = filt(x, "band", [lo, hi])
    return x * env(n, 0.001, decay)


def pluck(freq, dur=0.22):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t)
    return x * env(n, 0.003, dur / 3.5)


def pad_chord(freqs, dur):
    n = int(dur * SR)
    left = np.zeros(n)
    right = np.zeros(n)
    for f in freqs:
        left += saw(f, n, -0.004) + saw(f, n, 0.002)
        right += saw(f, n, 0.004) + saw(f, n, -0.002)
    shape = np.minimum(np.clip(np.arange(n) / (0.35 * SR), 0, 1), np.clip((n - np.arange(n)) / (0.25 * SR), 0, 1))
    left = filt(left, "low", 1100) * shape
    right = filt(right, "low", 1100) * shape
    return left / len(freqs), right / len(freqs)


def echo(x, delay, fb=0.35, mix=0.4):
    d = int(delay * SR)
    y = x.copy()
    for k in range(1, 5):
        if d * k < len(x):
            y[d * k:] += x[: len(x) - d * k] * (fb ** k) * mix / fb
    return y


CHORDS = {
    "Am": [("A", 3), ("C", 4), ("E", 4)],
    "Am7": [("A", 3), ("C", 4), ("E", 4), ("G", 4)],
    "F": [("F", 3), ("A", 3), ("C", 4)],
    "Fmaj7": [("F", 3), ("A", 3), ("C", 4), ("E", 4)],
    "C": [("C", 4), ("E", 4), ("G", 4)],
    "G": [("G", 3), ("B", 3), ("D", 4)],
    "E": [("E", 3), ("G#", 3), ("B", 3)],
    "Dm": [("D", 4), ("F", 4), ("A", 4)],
}


def track(name, bpm, prog, seconds, *, four_floor, clap, arp, hats16, bass_eighths, pad_gain):
    beat = 60 / bpm
    bar = 4 * beat
    n = int(seconds * SR)
    drums = np.zeros(n)
    bass = np.zeros(n)
    lead = np.zeros(n)
    pad_l = np.zeros(n)
    pad_r = np.zeros(n)
    k = kick()
    bars = int(seconds / bar) + 1
    for b in range(bars):
        t0 = b * bar
        chord = CHORDS[prog[b % len(prog)]]
        pl, pr = pad_chord([hz(nm, o) for nm, o in chord], bar)
        place(pad_l, pl, t0)
        place(pad_r, pr, t0)
        root = hz(chord[0][0], 1 if chord[0][1] >= 3 else 1)
        intro = b < 2  # first two bars: pad + arp only, drums enter after
        for s in range(16):
            ts = t0 + s * beat / 4
            if not intro:
                if four_floor and s % 4 == 0:
                    place(drums, k, ts)
                if not four_floor and s in (0, 10):
                    place(drums, k * 0.9, ts)
                if clap and s in (4, 12):
                    place(drums, noise_hit(int(0.2 * SR), 900, 4000, 0.06) * 0.45, ts)
                if (hats16 or s % 2 == 0) and s % 4 != 0:
                    place(drums, noise_hit(int(0.05 * SR), 7000, 15000, 0.012) * (0.18 if s % 2 else 0.26), ts)
                if bass_eighths and s % 2 == 0:
                    bn = int(beat / 2 * SR * 0.9)
                    bsig = filt(saw(root, bn), "low", 260) * env(bn, 0.004, 0.12)
                    place(bass, bsig * (0.5 if s % 4 else 0.7), ts)
                if not bass_eighths and s in (0, 8):
                    bn = int(2 * beat * SR)
                    place(bass, filt(saw(root, bn), "low", 200) * env(bn, 0.01, 0.9) * 0.7, ts)
            if arp and s % 2 == 0:
                tones = [hz(nm, o + 1) for nm, o in chord]
                place(lead, pluck(tones[(s // 2) % len(tones)]) * 0.22, ts)
    lead = echo(lead, beat * 0.75)
    left = drums * 0.9 + bass * 0.8 + pad_l * pad_gain + lead * 0.9
    right = drums * 0.9 + bass * 0.8 + pad_r * pad_gain + np.roll(lead, int(0.012 * SR)) * 0.9
    stereo = np.stack([left, right], axis=1)
    stereo = np.tanh(stereo * 1.3)
    stereo *= 0.85 / np.max(np.abs(stereo))
    fade = int(1.5 * SR)
    stereo[-fade:] *= np.linspace(1, 0, fade)[:, None]
    out = ROOT / "public" / "music" / f"{name}.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(out, SR, (stereo * 32767).astype(np.int16))
    print("wrote", out)


track("tech", 118, ["Am7", "Fmaj7", "C", "G"], 40, four_floor=True, clap=True, arp=True, hats16=True, bass_eighths=True, pad_gain=0.35)
track("tension", 100, ["Am", "Am", "F", "E"], 40, four_floor=False, clap=False, arp=True, hats16=True, bass_eighths=False, pad_gain=0.45)
track("uplift", 110, ["C", "G", "Am", "F"], 45, four_floor=True, clap=True, arp=True, hats16=False, bass_eighths=True, pad_gain=0.4)
