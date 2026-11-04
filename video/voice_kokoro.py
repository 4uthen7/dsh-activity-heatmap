"""Generate the English narration with Kokoro, a free local neural TTS.

The voice is `am_michael`: a warm American male. Kokoro runs locally through
onnxruntime, so no API key or network is needed after the model download.

    pip install kokoro-onnx
    curl -L -o /tmp/kokoro/kokoro-v1.0.onnx \
      https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
    curl -L -o /tmp/kokoro/voices-v1.0.bin \
      https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
    KOKORO_MODEL=/tmp/kokoro/kokoro-v1.0.onnx \
    KOKORO_VOICES=/tmp/kokoro/voices-v1.0.bin \
      python3 video/voice_kokoro.py
"""
from __future__ import annotations

import os
import subprocess
import wave
from pathlib import Path

import numpy as np
from kokoro_onnx import Kokoro

HERE = Path(__file__).resolve().parent
OUT = HERE / "vo-kokoro"
OUT.mkdir(exist_ok=True)

MODEL = os.environ.get("KOKORO_MODEL", "/tmp/kokoro/kokoro-v1.0.onnx")
VOICES = os.environ.get("KOKORO_VOICES", "/tmp/kokoro/voices-v1.0.bin")

LINES = [
    "Every day you build leaves a trace.",
    "Your session logs already know. One cell per day, counted locally.",
    "Seven shapes. Square, round, hexagon, star, or your own SVG path.",
    "Five palettes, or your own colors. Four levels of intensity.",
    "A year, twelve months, or the last few weeks. The calendar you think in.",
    "Messages, tools, turns, tokens, active time, sessions. Pick your measure.",
    "A sidebar panel, a footer widget, or the full page. It lives where you work.",
    "Install it in one sentence. Paste the repo and ask your agent. Or add it from the Plugins page.",
    "dsh-activity-heatmap. See how much you actually build.",
]

kokoro = Kokoro(MODEL, VOICES)

for index, text in enumerate(LINES):
    samples, rate = kokoro.create(text, voice="am_michael", speed=0.95, lang="en-us")
    raw = OUT / f"line{index}-24.wav"
    with wave.open(str(raw), "wb") as fh:
        fh.setnchannels(1)
        fh.setsampwidth(2)
        fh.setframerate(rate)
        fh.writeframes((np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes())
    wav = OUT / f"line{index}.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-ar", "48000", "-ac", "1", str(wav)],
        check=True,
    )
    print(f"line {index}: {len(samples) / rate:.2f}s")
