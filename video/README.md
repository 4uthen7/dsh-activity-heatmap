# Video source

The 66-second intro is generated, not edited: a deterministic HTML timeline rendered frame by frame through Chrome, with an original synthesized soundtrack and macOS text-to-speech. No stock footage, music, or fonts are used.

There are three cuts:

| Cut | Page | On-screen | Subtitles | Audio | File |
| --- | --- | --- | --- | --- | --- |
| English | `video/index.html` | English | Japanese | English narration | `docs/dsh-activity-heatmap-intro.mp4` |
| Japanese, voice | `video/index-ja.html` | Japanese | English | Keita (Edge Neural TTS) | `docs/dsh-activity-heatmap-intro-ja.mp4` |
| Japanese, silent | `video/index-ja.html` | Japanese | English | music + sound effects | `docs/dsh-activity-heatmap-intro-ja-silent.mp4` |

```
video/index.html     English timeline
video/index-ja.html  Japanese timeline, English subtitle cues
video/audio.py       Music, sound design, voice-over mix
video/voice_edge.py  Edge Neural TTS lines (Keita, Japanese male)
video/render.mjs     Chrome DevTools Protocol frame renderer (PAGE selects the cut)
video/avatar.jpg     Author avatar used on the end card
video/grain.png      Generated film grain
```

The app mock is `docs/demo.html` for the English cut and `docs/demo-ja.html` for the Japanese cut.

## Audio

```bash
# English narration (Samantha, 175 wpm)
AUDIO_MODE=en AUDIO_OUT=mix.wav python3 video/audio.py

# Japanese male narration: Edge Neural TTS, Keita, generated locally
# pip install edge-tts
python3 video/voice_edge.py
AUDIO_MODE=ja-edge AUDIO_OUT=mix-ja-edge.wav python3 video/audio.py

# No narration, music and effects only
AUDIO_MODE=instrumental AUDIO_OUT=mix-instrumental.wav python3 video/audio.py

# Master each to -14 LUFS / -1.5 dBTP
for n in "" "-ja-edge" "-instrumental"; do
  ffmpeg -y -i "video/mix${n}.wav" \
    -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -ac 2 \
    "video/master${n}.wav"
done
```

Voice lines are cached in `video/vo/` (English), `video/vo-ja/` (optional Kyoko fallback), and `video/vo-edge/` (Keita); all are ignored by git.

## Frames

```bash
# English cut
node video/render.mjs

# Japanese cut
PAGE=video/index-ja.html FRAMES_DIR=/tmp/dsh-ja-frames node video/render.mjs
```

Each run writes 1980 PNGs at 1920x1080, 30 fps, 66 s. `render.mjs` starts its own static server on 8740, a headless Chrome on 9334, and an isolated profile. Set `CHROME_BIN`, `HTTP_PORT`, `RENDER_PORT`, `PAGE`, or `FRAMES_DIR` to override.

## Encode

```bash
COMMON='-c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -level 4.1
  -colorspace bt709 -color_primaries bt709 -color_trc bt709
  -c:a aac -b:a 192k -shortest -movflags +faststart
  -metadata artist=高本 -metadata comment=dsh-activity-heatmap-SphinxGG.com'

# English content, Japanese subtitles, English voice
ffmpeg -y -framerate 30 -i /tmp/dsh-activity-heatmap-frames/f%05d.png \
  -i video/master.wav $COMMON \
  -metadata title="dsh-activity-heatmap — intro" \
  docs/dsh-activity-heatmap-intro.mp4

# Japanese content, English subtitles, Keita voice
ffmpeg -y -framerate 30 -i /tmp/dsh-ja-frames/f%05d.png \
  -i video/master-ja-edge.wav $COMMON \
  -metadata title="dsh-activity-heatmap — 紹介" \
  docs/dsh-activity-heatmap-intro-ja.mp4

# Japanese content, English subtitles, no voice
ffmpeg -y -framerate 30 -i /tmp/dsh-ja-frames/f%05d.png \
  -i video/master-instrumental.wav $COMMON \
  -metadata title="dsh-activity-heatmap — 紹介（音声なし）" \
  docs/dsh-activity-heatmap-intro-ja-silent.mp4

# README previews
ffmpeg -y -ss 14.0 -t 6.0 -i docs/dsh-activity-heatmap-intro.mp4 \
  -vf "fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a" \
  docs/intro.gif
ffmpeg -y -ss 14.0 -t 6.0 -i docs/dsh-activity-heatmap-intro-ja-silent.mp4 \
  -vf "fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a" \
  docs/intro-ja.gif
```

## Structure

| Seconds | Scene |
| --- | --- |
| 0.0–6.4 | Intro: year grid, title, version |
| 6.4–13.0 | The idea: logs become a year of cells |
| 13.0–19.6 | Seven shapes |
| 19.6–25.8 | Palettes and intensity |
| 25.8–32.4 | Year → months → rolling morph |
| 32.4–38.6 | Six measures |
| 38.6–46.4 | Sidebar panel, footer widget, full page |
| 46.4–54.4 | Install prompt and Plugins path |
| 54.4–66.0 | Plugin end card, author card |

SRT files: `docs/dsh-activity-heatmap-intro.ja.srt` (English cut) and `docs/dsh-activity-heatmap-intro-ja.en.srt` (Japanese cut).
