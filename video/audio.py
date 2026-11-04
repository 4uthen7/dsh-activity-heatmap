"""Synthesize the intro soundtrack and English voice-over.

Everything is generated locally: numpy for the music and sound design, macOS
`say` for the narration, ffmpeg for format conversion and loudness mastering.
The result is an original 66-second stereo bed, so the repository ships no
third-party audio.
"""
from __future__ import annotations

import math
import os
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48_000
DUR = 66.0
N = int(SR * DUR)
T = np.arange(N) / SR
HERE = Path(__file__).resolve().parent
RNG = np.random.default_rng(20260615)


def fft_filter(x: np.ndarray, low: float | None = None, high: float | None = None) -> np.ndarray:
    """Fourth-order-ish brickwall with a smooth knee, via the frequency domain."""
    spectrum = np.fft.rfft(x)
    freq = np.fft.rfftfreq(len(x), 1 / SR)
    mask = np.ones_like(freq)
    if low is not None:
        mask *= 1.0 / (1.0 + (freq / low) ** 4)
    if high is not None:
        mask *= 1.0 / (1.0 + (high / np.maximum(freq, 1e-9)) ** 4)
    return np.fft.irfft(spectrum * mask, n=len(x))


def adsr(n: int, attack: float, decay: float, sustain: float, release: float) -> np.ndarray:
    a = max(1, int(attack * SR))
    d = max(1, int(decay * SR))
    r = max(1, int(release * SR))
    env = np.ones(n)
    if a < n:
        env[:a] = np.linspace(0, 1, a)
    if a + d < n:
        env[a:a + d] = np.linspace(1, sustain, d)
    if r < n:
        env[-r:] *= np.linspace(1, 0, r)
    return env


def saw(freq: float, n: int, phase: float = 0.0) -> np.ndarray:
    t = np.arange(n) / SR
    return 2.0 * ((freq * t + phase) % 1.0) - 1.0


def sine(freq: float, n: int, phase: float = 0.0) -> np.ndarray:
    return np.sin(2 * np.pi * freq * np.arange(n) / SR + phase)


def write_wav(path: Path, stereo: np.ndarray) -> None:
    data = np.clip(stereo, -1, 1)
    pcm = (data * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as fh:
        fh.setnchannels(2)
        fh.setsampwidth(2)
        fh.setframerate(SR)
        fh.writeframes(pcm.tobytes())


def pan(x: np.ndarray, value: float) -> tuple[np.ndarray, np.ndarray]:
    """Constant-power pan, value in [-1, 1]."""
    angle = (value + 1) * math.pi / 4
    return x * math.cos(angle), x * math.sin(angle)


def add(buf: np.ndarray, x: np.ndarray, start: float, gain: float = 1.0) -> None:
    i = int(start * SR)
    if i >= len(buf) or i < 0:
        return
    j = min(len(buf), i + len(x))
    buf[i:j] += x[: j - i] * gain


def impulse(seconds: float = 2.0, decay: float = 3.2) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = RNG.normal(0, 1, (n, 2)) * np.exp(-t * decay)[:, None]
    ir[: int(0.018 * SR)] *= np.linspace(0, 1, int(0.018 * SR))[:, None]
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True))
    return ir


REVERB = impulse()


def reverb(x: np.ndarray, amount: float = 0.2) -> np.ndarray:
    if x.ndim == 1:
        x = np.column_stack([x, x])
    out = np.zeros_like(x)
    for ch in range(2):
        ir = REVERB[:, ch]
        n = len(x) + len(ir) - 1
        size = 1 << (n - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(x[:, ch], size) * np.fft.rfft(ir, size), size)[: len(x)]
        out[:, ch] = y
    return x * (1 - amount) + out * amount * np.max(np.abs(x) + 1e-9)


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(x ** 2) + 1e-12))


def normalize(x: np.ndarray, peak: float = 0.9) -> np.ndarray:
    m = np.max(np.abs(x)) + 1e-9
    return x / m * peak


# --------------------------------------------------------------------------
# Music
# --------------------------------------------------------------------------

CHORDS = {
    "Am": [110.00, 130.81, 164.81, 246.94],
    "F": [87.31, 110.00, 130.81, 174.61],
    "C": [130.81, 164.81, 196.00, 246.94],
    "G": [98.00, 123.47, 146.83, 196.00],
}
PROGRESSION = ["Am", "F", "C", "G"]
CHORD_LEN = 4.8  # one chord per two bars at 100 BPM

pad = np.zeros((N, 2))
bass = np.zeros(N)
arp = np.zeros((N, 2))
drums_l = np.zeros(N)
drums_r = np.zeros(N)
fx = np.zeros((N, 2))

# Pads and bass.
for index, start in enumerate(np.arange(0, DUR, CHORD_LEN)):
    name = PROGRESSION[index % len(PROGRESSION)]
    notes = CHORDS[name]
    duration = min(CHORD_LEN + 1.6, DUR - start)
    for n_i, freq in enumerate(notes):
        n = int(duration * SR)
        voice = (saw(freq * 0.997, n, 0.1 * n_i) + saw(freq * 1.003, n, 0.23)) * 0.5
        voice = fft_filter(voice, low=1500 if start > 6 else 1100, high=110)
        voice *= adsr(n, 0.7, 0.0, 1.0, 1.4) * 0.10
        left, right = pan(voice, [-0.45, 0.35, -0.15, 0.5][n_i % 4])
        add(pad[:, 0], left, start, 1.0)
        add(pad[:, 1], right, start, 1.0)
    # Bass root, one octave below the chord.
    n = int(duration * SR)
    b = fft_filter(sine(notes[0] / 2, n) + 0.25 * saw(notes[0] / 2, n), low=220)
    b *= adsr(n, 0.02, 0.25, 0.7, 0.5) * 0.16
    add(bass, b, start, 1.0)

# Final resolving chord under the author card.
for n_i, freq in enumerate([130.81, 164.81, 196.00, 246.94, 293.66]):
    duration = 7.4
    n = int(duration * SR)
    voice = (saw(freq * 0.997, n, 0.12 * n_i) + saw(freq * 1.002, n, 0.31)) * 0.5
    voice = fft_filter(voice, low=1900, high=100)
    voice *= adsr(n, 1.1, 0.0, 1.0, 2.2) * 0.13
    left, right = pan(voice, [-0.5, 0.4, -0.2, 0.55, 0.05][n_i])
    add(pad[:, 0], left, 58.9, 1.0)
    add(pad[:, 1], right, 58.9, 1.0)

# Author-card sub, fading with the picture.
n = int(7.2 * SR)
tt = np.arange(n) / SR
sub = np.sin(2 * np.pi * 55 * tt) * adsr(n, 0.8, 0.0, 0.8, 2.4) * 0.10
add(bass, sub, 58.9, 1.0)

# Arpeggio: 16ths from the chord tones, one octave up.
for index, start in enumerate(np.arange(0, DUR, CHORD_LEN)):
    notes = CHORDS[PROGRESSION[index % len(PROGRESSION)]]
    step = 0.15
    pattern = [0, 1, 2, 3, 2, 1, 2, 3, 1, 2, 3, 2, 1, 0, 1, 2]
    for k in range(int(CHORD_LEN / step)):
        freq = notes[pattern[k % len(pattern)]] * 2
        n = int(step * 2.2 * SR)
        pluck = (sine(freq, n) + 0.35 * sine(freq * 2, n) + 0.12 * sine(freq * 3, n))
        pluck *= np.exp(-np.arange(n) / SR * 17.0)
        pluck *= 0.055
        left, right = pan(pluck, 0.35 if k % 2 else -0.35)
        add(arp[:, 0], left, start + k * step, 1.0)
        add(arp[:, 1], right, start + k * step, 1.0)

# Drums.
FULL = [(6.4, 38.6), (46.4, 54.4)]
BREAK = (38.6, 46.4)


def in_ranges(t: float, ranges: list[tuple[float, float]]) -> bool:
    return any(a <= t < b for a, b in ranges)


beat = 0.6
for k in range(int(DUR / beat)):
    t0 = k * beat
    full = in_ranges(t0, FULL) or (46.4 <= t0 < 54.4)
    brk = BREAK[0] <= t0 < BREAK[1]
    if not (full or brk):
        continue
    if full or (brk and k % 4 in (0, 2)):
        n = int(0.55 * SR)
        tt = np.arange(n) / SR
        f = 92 * np.exp(-tt * 16) + 42
        phase = 2 * np.pi * np.cumsum(f) / SR
        kick = np.sin(phase) * np.exp(-tt * 8.5)
        click = RNG.normal(0, 1, n) * np.exp(-tt * 260) * 0.35
        kick = fft_filter(kick + click, low=140)
        add(drums_l, kick * 0.9, t0, 0.9)
        add(drums_r, kick * 0.9, t0, 0.9)
    if full:
        # Closed hats on offbeats.
        n = int(0.09 * SR)
        tt = np.arange(n) / SR
        hat = fft_filter(RNG.normal(0, 1, n), high=7200) * np.exp(-tt * 55) * 0.3
        add(drums_l, hat, t0 + beat / 2, 0.55)
        add(drums_r, hat, t0 + beat / 2, 0.45)
        # Open hat at the end of a bar.
        if k % 4 == 3:
            n = int(0.4 * SR)
            tt = np.arange(n) / SR
            open_hat = fft_filter(RNG.normal(0, 1, n), high=6200) * np.exp(-tt * 11) * 0.22
            add(drums_l, open_hat, t0 + beat / 2, 0.5)
            add(drums_r, open_hat, t0 + beat / 2, 0.6)
        # Snare on 2 and 4.
        if k % 4 in (1, 3):
            n = int(0.22 * SR)
            tt = np.arange(n) / SR
            snare = fft_filter(RNG.normal(0, 1, n), low=5200, high=900) * np.exp(-tt * 24)
            snare += sine(190, n) * np.exp(-tt * 30) * 0.25
            add(drums_l, snare, t0, 0.5)
            add(drums_r, snare, t0, 0.5)

# Sidechain the tonal layers against the kick.
duck = np.ones(N)
for k in range(int(DUR / beat)):
    t0 = k * beat
    if in_ranges(t0, FULL) or (46.4 <= t0 < 54.4):
        i = int(t0 * SR)
        n = int(0.45 * SR)
        if i < N:
            j = min(N, i + n)
            env = 1 - 0.42 * np.exp(-np.arange(j - i) / SR * 18)
            duck[i:j] = np.minimum(duck[i:j], env)

# Section gains.
def automation(points: list[tuple[float, float]]) -> np.ndarray:
    xs = np.array([p[0] for p in points])
    ys = np.array([p[1] for p in points])
    return np.interp(T, xs, ys)

pad_gain = automation([(0, 0.7), (6.4, 0.9), (13, 1.0), (38.6, 0.9), (46.4, 1.0), (54.4, 1.05), (58.9, 1.5), (64.5, 1.15), (66, 0.0)])
arp_gain = automation([(0, 0.0), (6.4, 0.0), (8, 1.0), (38.6, 0.55), (46.4, 0.9), (54.4, 0.7), (58.9, 0.45), (64.5, 0.2), (66, 0.0)])
bass_gain = automation([(0, 0.0), (6.4, 0.8), (13, 1.0), (38.6, 0.55), (46.4, 1.0), (54.4, 0.45), (58.9, 0.55), (64.5, 0.2), (66, 0.0)])

music = (
    pad * pad_gain[:, None] * duck[:, None] * 0.8
    + np.column_stack([bass, bass]) * bass_gain[:, None] * duck[:, None] * 0.75
    + arp * arp_gain[:, None] * 0.9
    + np.column_stack([drums_l, drums_r]) * 0.7
)

# Sound design: impacts, risers, whooshes, chimes.
def impact(start: float, strength: float = 1.0) -> None:
    n = int(1.6 * SR)
    tt = np.arange(n) / SR
    f = 70 * np.exp(-tt * 5) + 32
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 4.2)
    noise = fft_filter(RNG.normal(0, 1, n), low=600) * np.exp(-tt * 12) * 0.4
    hit = (boom + noise) * strength
    add(fx[:, 0], hit, start, 0.9)
    add(fx[:, 1], hit, start, 0.9)


def whoosh(start: float, length: float = 0.7, strength: float = 1.0) -> None:
    n = int(length * SR)
    tt = np.arange(n) / SR
    noise = fft_filter(RNG.normal(0, 1, n), high=1200, low=6500)
    env = np.sin(np.linspace(0, np.pi, n)) ** 1.6
    sweep = fft_filter(RNG.normal(0, 1, n), high=800) * 0.4
    hit = (noise * 0.5 + sweep) * env * strength
    add(fx[:, 0], hit, start, 0.35)
    add(fx[:, 1], hit, start + 0.03, 0.4)


def riser(start: float, length: float, strength: float = 1.0) -> None:
    n = int(length * SR)
    tt = np.arange(n) / SR
    f = 180 + 900 * (tt / length) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    noise = fft_filter(RNG.normal(0, 1, n), high=1000, low=9000) * 0.45
    env = np.linspace(0, 1, n) ** 1.7
    hit = (tone + noise) * env * strength
    add(fx[:, 0], hit, start, 0.35)
    add(fx[:, 1], hit, start, 0.35)


def bell(start: float, freq: float = 880, strength: float = 1.0) -> None:
    n = int(2.4 * SR)
    tt = np.arange(n) / SR
    tone = (
        np.sin(2 * np.pi * freq * tt) * 1.0
        + np.sin(2 * np.pi * freq * 2.01 * tt) * 0.35
        + np.sin(2 * np.pi * freq * 3.98 * tt) * 0.12
    ) * np.exp(-tt * 2.8)
    add(fx[:, 0], tone, start, 0.12 * strength)
    add(fx[:, 1], tone, start, 0.12 * strength)


for start in (0.15, 6.4, 13.0, 19.6, 25.8, 32.4, 38.6, 46.4, 54.4):
    impact(start, 1.0 if start not in (38.6, 54.4) else 0.75)
for start in (4.7, 11.6, 18.0, 24.5, 31.0, 37.0, 44.6, 52.5):
    riser(start, 1.4, 0.8)
for start in (5.9, 12.4, 18.9, 25.1, 31.7, 37.9, 45.7, 53.6):
    whoosh(start, 0.7, 0.9)
bell(49.55, 1046.5, 0.9)
bell(58.9, 880, 0.7)

# Soft key clicks under the install prompt typing.
for i in range(80):
    t0 = 47.3 + i / 42.0
    if t0 > 49.6:
        break
    n = int(0.018 * SR)
    tt = np.arange(n) / SR
    click = (RNG.normal(0, 1, n) * np.exp(-tt * 320) * 0.5
             + np.sin(2 * np.pi * 1900 * tt) * np.exp(-tt * 220) * 0.25)
    add(fx[:, 0], click, t0, 0.28)
    add(fx[:, 1], click, t0 + 0.003, 0.24)

# --------------------------------------------------------------------------
# Voice-over / variants
# --------------------------------------------------------------------------

MODE = os.environ.get("AUDIO_MODE", "en")

EN_LINES = [
    (0.6, "Every day you build leaves a trace."),
    (6.6, "Your session logs already know. One cell per day, counted locally."),
    (13.2, "Seven shapes. Square, round, hexagon, star, or your own SVG path."),
    (19.8, "Five palettes, or your own colors. Four levels of intensity."),
    (25.9, "A year, twelve months, or the last few weeks. The calendar you think in."),
    (32.5, "Messages, tools, turns, tokens, active time, sessions. Pick your measure."),
    (38.8, "A sidebar panel, a footer widget, or the full page. It lives where you work."),
    (46.6, "Install it in one sentence. Paste the repo and ask your agent. Or add it from the Plugins page."),
    (54.8, "dsh-activity-heatmap. See how much you actually build."),
]

JA_LINES = [
    (0.6, "毎日の開発を、ひとマスずつ。"),
    (6.6, "セッションログには、もう答えがあります。一日一マスで、活動量が見える。"),
    (13.2, "四角、丸、六角形、星。SVGパスで、好きな形に。"),
    (19.8, "五つのパレットと、自由な色。濃さは四段階。"),
    (25.9, "一年、月別、直近の週。見たい形で。"),
    (32.5, "メッセージ、ツール、ターン、トークン、時間、セッション。指標を選べます。"),
    (38.8, "サイドバーのパネル。フッターのウィジェット。メインの全画面。好きな場所に。"),
    (46.6, "導入は、リンクを貼ってお願いするだけ。Pluginsページからも入れられます。"),
    (54.8, "dsh-activity-heatmap。あなたの毎日を、ひとマスずつ。"),
]

# Edge Neural (ja-JP-KeitaNeural), pre-generated into video/vo-edge/.
# Shorter metrics line; shapes line starts on the cut.
JA_EDGE_LINES = [
    (0.6, "毎日の開発を、ひとマスずつ。"),
    (6.6, "セッションログには、もう答えがあります。一日一マスで、活動量が見える。"),
    (13.0, "四角、丸、六角形、星。SVGパスで、好きな形に。"),
    (19.8, "五つのパレットと、自由な色。濃さは四段階。"),
    (25.9, "一年、月別、直近の週。見たい形で。"),
    (32.5, "メッセージ、ツール、ターン、トークン、時間、セッション。"),
    (38.8, "サイドバーのパネル。フッターのウィジェット。メインの全画面。好きな場所に。"),
    (46.6, "導入は、リンクを貼ってお願いするだけ。Pluginsページからも入れられます。"),
    (54.8, "dsh-activity-heatmap。あなたの毎日を、ひとマスずつ。"),
]

if MODE == "instrumental":
    LINES = []
    VOICE = None
    RATE = None
    VO_DIR = None
elif MODE == "en-kokoro":
    LINES = EN_LINES
    VOICE = None
    RATE = None
    VO_DIR = HERE / "vo-kokoro"
elif MODE == "ja-edge":
    LINES = JA_EDGE_LINES
    VOICE = None
    RATE = None
    VO_DIR = HERE / "vo-edge"
elif MODE == "ja":
    LINES = JA_LINES
    VOICE = "Kyoko"
    RATE = "170"
    VO_DIR = HERE / "vo-ja"
else:
    LINES = EN_LINES
    VOICE = "Samantha"
    RATE = "175"
    VO_DIR = HERE / "vo"

vo = np.zeros(N)
vo_wet = np.zeros((N, 2))
duck_env = np.zeros(N)

if LINES:
    VO_DIR.mkdir(exist_ok=True)
    for index, (start, text) in enumerate(LINES):
        wav = VO_DIR / f"line{index}.wav"
        if VOICE is not None:
            aiff = VO_DIR / f"line{index}.aiff"
            if not aiff.exists():
                subprocess.run(["say", "-v", VOICE, "-r", RATE, "-o", str(aiff), text], check=True)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(aiff), "-ar", str(SR), "-ac", "1", str(wav)], check=True)
        with wave.open(str(wav), "rb") as fh:
            samples = np.frombuffer(fh.readframes(fh.getnframes()), dtype=np.int16).astype(np.float64) / 32768
        threshold = 0.004
        active = np.where(np.abs(samples) > threshold)[0]
        if len(active):
            samples = samples[max(0, active[0] - int(0.02 * SR)): min(len(samples), active[-1] + int(0.03 * SR))]
        window = int(0.02 * SR)
        if len(samples) > window:
            energy = np.sqrt(np.convolve(samples ** 2, np.ones(window) / window, mode="same"))
            gain = np.where(energy > 0.08, (0.08 / np.maximum(energy, 1e-6)) ** 0.55, 1.0)
            samples = samples * np.clip(gain, 0.4, 1.6)
        samples = normalize(samples, 0.72)
        samples = fft_filter(samples, high=80, low=12000)
        fade = int(0.012 * SR)
        if len(samples) > fade * 2:
            samples[:fade] *= np.linspace(0, 1, fade)
            samples[-fade:] *= np.linspace(1, 0, fade)
        i = int(start * SR)
        j = min(N, i + len(samples))
        vo[i:j] += samples[: j - i]

    vo_stereo = np.column_stack([vo, vo])
    vo_wet = reverb(vo_stereo, 0.08)
    vo_env = np.abs(vo_stereo[:, 0])
    window = int(0.05 * SR)
    vo_env = np.convolve(vo_env, np.ones(window) / window, mode="same")
    vo_env = np.clip(vo_env / (np.max(vo_env) + 1e-9), 0, 1)
    duck_env = np.empty_like(vo_env)
    value = 0.0
    for i in range(len(vo_env)):
        target = vo_env[i]
        value = target if target > value else value * 0.9993 + target * 0.0007
        duck_env[i] = value
    music *= (1 - 0.55 * duck_env)[:, None] * 0.85

mix = music * 0.9 + fx * 0.85 + vo_wet * 0.9
mix = np.column_stack([
    fft_filter(mix[:, 0], high=28),
    fft_filter(mix[:, 1], high=28),
])
mix = np.tanh(mix * 1.18) / 1.18
mix = normalize(mix, 0.94)
out_name = os.environ.get("AUDIO_OUT", "mix.wav")
write_wav(HERE / out_name, mix)
print(f"wrote {out_name}", mix.shape, "peak", float(np.max(np.abs(mix))), "rms", rms(mix))
