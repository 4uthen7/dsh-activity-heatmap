# Video source

The 66-second intro is generated, not edited: a deterministic HTML timeline rendered frame by frame through Chrome, with an original synthesized soundtrack and macOS text-to-speech narration. No stock footage, music, or fonts are used.

```
video/index.html   Timeline, heatmaps, type, and app mock (renderAt(t))
video/audio.py     Synthesized music, sound design, and English voice-over
video/render.mjs   Chrome DevTools Protocol frame renderer
video/avatar.jpg   Author avatar used on the end card
video/grain.png    Generated film grain
```

## Render

```bash
# 1. frames: 1980 PNGs at 1920x1080, 30 fps, 66 s
node video/render.mjs

# 2. soundtrack and narration
python3 video/audio.py
ffmpeg -y -i video/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -ac 2 video/master.wav

# 3. encode
ffmpeg -y -framerate 30 -i /tmp/dsh-activity-heatmap-frames/f%05d.png \
  -i video/master.wav \
  -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high -level 4.1 \
  -c:a aac -b:a 192k -shortest -movflags +faststart \
  -metadata title="dsh-activity-heatmap — intro" \
  -metadata artist="高本" \
  -metadata comment="dsh-activity-heatmap · SphinxGG.com" \
  docs/dsh-activity-heatmap-intro.mp4

# 4. README preview
ffmpeg -y -ss 13.0 -t 7.0 -i docs/dsh-activity-heatmap-intro.mp4 \
  -vf "fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" \
  docs/intro.gif
```

`render.mjs` starts its own static server on port 8740 and a headless Chrome on 9334. Set `CHROME_BIN`, `HTTP_PORT`, `RENDER_PORT`, or `FRAMES_DIR` to override.

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

Narration is English (Samantha, 175 wpm); subtitles are Japanese and burned in, with a matching SRT in `docs/`.
