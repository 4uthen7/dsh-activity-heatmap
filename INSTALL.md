# Install

Two paths: let the agent do it, or do it from the Plugins page. Both install the same bundle.

## A. Ask the agent

Send this to a DeepSeek Harness session:

```text
https://github.com/4uthen7/dsh-activity-heatmap を DeepSeek Harness に導入して。
インストール後に Settings → アクティビティ が開くことまで確認して。
```

```text
Install https://github.com/4uthen7/dsh-activity-heatmap into DeepSeek Harness.
Verify Settings → Activity opens, then report what you installed.
```

The agent uses `plugin_manager` with `action: "install_bundle"` and the repository URL as `target`. It needs Full file access (the same mode that allows plugin management).

## B. From the Plugins page

1. Sidebar → **Plugins**.
2. **Add plugin**, or the arrow → **Install a third-party plugin**.
3. Paste `https://github.com/4uthen7/dsh-activity-heatmap`, choose the registry if asked, and install.
4. If the bundle installs switched off, switch it on.
5. Open **Settings → Activity**.

## C. Local checkout

```text
git clone https://github.com/4uthen7/dsh-activity-heatmap
```

Then, with an agent:

```text
plugin_manager { action: "install_bundle", target: "/absolute/path/to/dsh-activity-heatmap", enabled: true }
```

## Verify

- Settings shows an **Activity** entry between **Built-in plugins** and **Agent presets**.
- The sidebar shows an **Activity** row above **Workspaces**, and a full-width Activity strip above **Settings**. Click either to open the full heatmap.
- The page draws a calendar and a summary.
- The optional composer strip is off by default; turn it on in Settings → Activity → Appearance.
- The Host route answers counts:

```bash
curl "http://127.0.0.1:52783/plugin-api/activity-heatmap/stats?tz=Asia/Tokyo&days=30&wait=3000"
```

The port is whatever the running Web UI uses; Desktop's is shown in the app settings/runtime context.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| **Activity** is missing from Settings or the sidebar | The Client module did not load. Check **Plugins** → the bundle page for row status and diagnostics; reload the page; toggle the row off and on. |
| The page says it could not read activity | The Host route is absent. Confirm the bundle row is active. A profile without `webServer` cannot serve the page. |
| Every cell is empty | The Session corpus is empty or lives under another profile. The plugin counts only the current profile's sessions. |
| `application: restart-required` after installing | Restart DeepSeek Harness, then open Settings → Activity. |
| Counts look high | Forked/seeded sessions include inherited history. Switch the measure or accept the approximation. |

## Uninstall

**Plugins** → `dsh-activity-heatmap` → **Remove**. Remove the dependency if the page offers it; otherwise the uninstall removes both the dependency and the selection.

Browser settings stay in `localStorage` under `dsh-activity-heatmap/settings/v1`. Clear site data to reset them.
