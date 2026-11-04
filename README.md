# dsh-activity-heatmap

A GitHub-style activity heatmap for DeepSeek Harness.

It counts how much you actually use the app — messages, tool calls, turns, tokens, active minutes, and sessions — straight from your own local session logs, then draws one cell per day. Square, rounded, round, hexagon, diamond, star, and your own SVG path. Five palettes plus per-level colors. Year, month, and rolling calendar layouts. Everything is configurable in the app.

No outbound network requests. No session content leaves your machine. The plugin's Host half only returns counts.

```
      Jan        Feb        Mar        Apr
Mon  ▪ ▪ ▪ ▫ ▪ ▪ ▪ ▪ ▫ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪
Wed  ▪ ▫ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▫ ▪ ▪ ▪ ▪ ▪ ▪
Fri  ▪ ▪ ▪ ▪ ▫ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪
                                     Less ▪▪▪▪ More
```

## Install

Agent shortcut: call the `plugin_manager` tool with `action: "install_bundle"` and
`target: "https://github.com/4uthen7/dsh-activity-heatmap"`, then verify that the
`activity` settings section is active. Details in [AGENTS.md](AGENTS.md).

### Ask the agent (easiest)

Open DeepSeek Harness, paste this into a session, and send:

```text
https://github.com/4uthen7/dsh-activity-heatmap を DeepSeek Harness に導入して。
インストール後に Settings → アクティビティ が開くことまで確認して。
```

English equivalent:

```text
Install the plugin at https://github.com/4uthen7/dsh-activity-heatmap into DeepSeek Harness.
Verify that Settings → Activity opens, then tell me what you changed.
```

The agent installs the bundle with the `plugin_manager` tool. Agent instructions live in [AGENTS.md](AGENTS.md); the human-readable version is in [INSTALL.md](INSTALL.md).

### From the Plugins page

1. Open **Plugins** in the sidebar.
2. Choose **Add plugin** (or the arrow → **Install a third-party plugin**).
3. Paste `https://github.com/4uthen7/dsh-activity-heatmap` and confirm.
4. Enable the bundle if it is installed switched off.

### Requirements

- DeepSeek Harness with the Web UI (Desktop or the `web` profile).
- Any DSH version that ships the `sessionPersistence`, `sessionQuery`, and `webServer` services. The plugin degrades gracefully: if persistence is absent it counts Session creation days only.

## Where to find it

- **Settings → Activity** — the full heatmap, summary, and every option.
- **Under the composer** — a compact rolling strip so you can see the last weeks at a glance. Turn it off in Settings → Activity → Appearance.

The page is named by the active UI language: `Activity`, `アクティビティ`, or `活动`.

## What is counted

One cell per local day, in the browser's IANA time zone:

| Measure | Source |
| --- | --- |
| Messages | `user/message` and `assistant/message` events |
| Tool calls | `tool/call` events |
| Turns | `turn/start` events |
| Tokens | input + output tokens reported on assistant messages |
| Active time | distinct minutes in which any session event was recorded |
| Sessions | sessions created that day (by header `createdAt`) |

A session log is read once per revision and cached in Host memory; unchanged sessions are skipped on later refreshes. Forked or seeded sessions contain inherited history, so their earlier days can be counted again. Counts are approximate by design — this is a usage glance, not billing.

## Options

All options are per browser (`localStorage`, key `dsh-activity-heatmap/settings/v1`) and apply immediately.

| Option | Values | Default |
| --- | --- | --- |
| Measure | Messages, Active time, Tool calls, Turns, Sessions, Tokens | Messages |
| Calendar | Year (53 weeks), Months (12 mini calendars), Rolling (13/26/52 weeks) | Year |
| Shape | Square, Rounded, Circle, Hexagon, Diamond, Star, Custom SVG path | Square |
| Cell size | 5–20 px | 8 px |
| Spacing | 1–8 px | 2 px |
| Palette | GitHub, Ocean, Violet, Sunset, Mono, Custom | GitHub |
| Colors | 4 intensity colors + theme-colored empty days | GitHub greens |
| Week starts on | Sunday, Monday | Monday |
| Intensity | Linear, Log, Rank (quantile) | Linear |
| Labels | Month labels, weekday labels, legend | On |
| Composer strip | Show/hide, 7–52 weeks | On, 18 weeks |

A custom shape is an SVG path written for a `0 0 100 100` view box, for example `M50 4 L96 92 L4 92 Z`. Invalid path data is ignored and the square is used.

## Privacy

- The Host half registers one exact loopback route, `/plugin-api/activity-heatmap/stats`, and it answers with counts only: date, sessions, turns, messages, tool calls, tokens, events, active minutes.
- No prompt, response, file path, title, or tool argument is returned.
- The plugin makes no outbound network request.
- Counts are computed from the local Session corpus through the read-only `sessionPersistence` / `sessionQuery` services.

## Compatibility and removal

The bundle inserts one Host row (`activity-heatmap`) and one Client module. It declares `webServer` as its only hard Host dependency; without it the plugin stays inactive.

Remove it from **Plugins** → the bundle's page → **Remove**. Browser settings remain until you clear site data.

## Development

No build step: the package ships plain ESM for the Host and a plain-JavaScript Client module.

```
index.js            Host half: Session scan, per-day counters, stats route
client.js           Browser half: settings store, heatmap, settings page, composer strip
cordis.patch.yml    Bundle row
locale/{en,ja,zh}.json   Plugin Manager title/description
icon.svg            Plugin artwork
```

Install a working checkout:

```text
plugin_manager { action: "install_bundle", target: "/absolute/path/to/dsh-activity-heatmap" }
```

After editing `client.js`, reload the page. After editing `index.js`, toggle the row off and on (or restart) so the Host module is imported again.

## License

MIT. See [LICENSE](LICENSE).
