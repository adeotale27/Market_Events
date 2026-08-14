# Market Events (Chrome)

Standalone **Manifest V3** extension. **No Kite. No OI Pulse poller. No Mongo. No FastAPI.**

Canonical repo: **https://github.com/adeotale27/Market_Events**

## How to run

There is no server to start. You load the folder into Chrome.

```bash
git clone https://github.com/adeotale27/Market_Events.git
cd Market_Events
git pull origin main
```

1. Open Chrome and go to `chrome://extensions`
2. Turn **Developer mode** on (top right)
3. Click **Load unpacked**
4. Select **this folder** — the one that contains `manifest.json` (not a subfolder)
5. Pin **Market Events**. Click the icon. Click **Refresh**.

If FII/DII errors, open [nseindia.com](https://www.nseindia.com/) once in the same Chrome profile, then Refresh again.

After you `git pull` code changes: on `chrome://extensions` click **Reload** on this extension card, then open the popup again.

Toolbar badge = NIFTY day’s % (green / red) during quotes.

## What you see

Same four header tiles as OI Pulse, plus live index prints:

| Tile | Source | Who updates |
|------|--------|-------------|
| **Holiday** | `data/holidays.json` | Admin JSON (Options upload **or** commit on GitHub) |
| **FII / DII** | NSE `fiidiiTradeReact` from this Chrome profile | Automatic (~3h + Refresh). **Never uploaded.** Last good print is kept if NSE fails. |
| **Next Event** | `data/econ-events.json` (RBI, FOMC, CPI, GDP, Budget, NFP) | Commit / Options upload |
| **Index Impact** | `data/index-impact/NIFTY.json` · `SENSEX.json` · `BANKNIFTY.json` | Admin per-index JSON |

**Index chips** (NIFTY / SENSEX / BANKNIFTY) switch Index Impact to that index only — same idea as Pulse `GET /events/{activeIndex}`.

**Spots:** Yahoo `^NSEI` / `^BSESN` / `^NSEBANK` last + %. During 09:15–15:30 IST the worker refreshes about every minute. Opening the popup also refreshes if data is stale.

Color rules (Pulse-like): Holiday / Next Event go red for today–tomorrow; Index Impact red if a result/board meeting is within 7 days, blue for 8–14 days. FII tile goes red when FII cash is net selling.

## Data precedence

1. Files the admin picked on **chrome://extensions → Details → Extension options** (this browser)
2. GitHub raw (`data/config.json` `remoteBase`, default `Market_Events` `main`) — this is the shared “server”
3. JSON bundled in the zip / Load unpacked folder

## Version

`VERSION` and `manifest.json` `"version"` must be the same semver (now **1.0.1**). See [PUBLISH.md](PUBLISH.md).

## Admin

[ADMIN.md](ADMIN.md) — holiday JSON, per-index impact JSON, Options page, GitHub as the file server.

## Publish to the Web Store

[PUBLISH.md](PUBLISH.md)

Clone this repo only. See [PULL.md](PULL.md). Do not copy this tree into OI Pulse `main`.
