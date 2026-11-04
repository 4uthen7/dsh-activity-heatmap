# Agent install contract

This repository is a DeepSeek Harness bundle. When a user asks you to install it, follow these steps exactly. Do not hand-edit the profile's `package.json` or `cordis.patch.yml`; use the plugin manager.

## Install

1. Call `plugin_manager` with:

```json
{
  "action": "install_bundle",
  "target": "https://github.com/4uthen7/dsh-activity-heatmap",
  "enabled": true
}
```

2. Read the result fields:
   - `application: "applied"` — live now.
   - `application: "restart-required"` — tell the user to restart the app, then continue.
   - `application: "failed"` — keep the diagnostic and use the fallback below.

3. If the Git target fails (network, Git unavailable, or the repository cannot be fetched), clone it into the current workspace and install the local directory instead:

```bash
git clone https://github.com/4uthen7/dsh-activity-heatmap ./dsh-activity-heatmap
```

```json
{
  "action": "install_bundle",
  "target": "/absolute/path/to/dsh-activity-heatmap",
  "enabled": true
}
```

## Verify

Confirm the settings section exists:

```json
{
  "platform": "client",
  "provider": "Slots",
  "method": "listSubTree",
  "input": { "root": "settings.section" }
}
```

Expect an occupant with `"id": "activity"` and `"active": true`.

Optionally confirm the Host route answers counts (no session content):

```bash
curl "<web-ui-origin>/plugin-api/activity-heatmap/stats?tz=Asia/Tokyo&days=30&wait=3000"
```

## Report

Tell the user:

- the bundle name and version that installed,
- whether a restart is required,
- that the page is **Settings → Activity**,
- that a compact strip appears under the composer and can be turned off in the same page.

Do not describe the plugin as "installed" before `application` is `applied` and the `activity` slot is active. If verification fails, report the exact failure and stop.

## Constraints

- `plugin_manager` requires Full file access or approval for that call.
- The plugin has no install scripts and no build step.
- It reads Session logs through read-only services and never sends their content anywhere.
