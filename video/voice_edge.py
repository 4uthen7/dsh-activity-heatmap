"""Generate the Japanese narration with Microsoft Edge Neural TTS.

Keita (ja-JP-KeitaNeural) is a free, neural male Japanese voice. The Edge TTS
endpoint is rate-limited, so each line is retried a few times. The generated
WAVs are consumed by `AUDIO_MODE=ja-edge` in audio.py.

    pip install edge-tts
    python3 video/voice_edge.py
"""
from __future__ import annotations

import subprocess
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "vo-edge"
OUT.mkdir(exist_ok=True)

LINES = [
    "毎日の開発を、ひとマスずつ。",
    "セッションログには、もう答えがあります。一日一マスで、活動量が見える。",
    "四角、丸、六角形、星。SVGパスで、好きな形に。",
    "五つのパレットと、自由な色。濃さは四段階。",
    "一年、月別、直近の週。見たい形で。",
    "メッセージ、ツール、ターン、トークン、時間、セッション。",
    "サイドバーのパネル。フッターのウィジェット。メインの全画面。好きな場所に。",
    "導入は、リンクを貼ってお願いするだけ。Pluginsページからも入れられます。",
    "dsh-activity-heatmap。あなたの毎日を、ひとマスずつ。",
]

for index, text in enumerate(LINES):
    mp3 = OUT / f"line{index}.mp3"
    wav = OUT / f"line{index}.wav"
    for attempt in range(4):
        result = subprocess.run(
            [
                "edge-tts", "--voice", "ja-JP-KeitaNeural",
                "--rate=+12%", "--pitch=-2Hz",
                "--text", text, "--write-media", str(mp3),
            ],
            capture_output=True,
        )
        if result.returncode == 0:
            break
        time.sleep(4 + attempt * 4)
    else:
        raise RuntimeError(f"edge-tts failed for line {index}: {result.stderr.decode(errors='replace')}")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ar", "48000", "-ac", "1", str(wav)],
        check=True,
    )
    print(f"line {index} ok")
