# Market Pulse (Chrome)

Compact **Manifest V3** terminal for Indian index traders. **No Kite. No FastAPI. No Mongo.**

Repo: **https://github.com/adeotale27/Market_Events**

## How to run

```bash
git clone https://github.com/adeotale27/Market_Events.git
cd Market_Events
git pull origin main
```

1. Chrome → `chrome://extensions`
2. Developer mode on
3. **Load unpacked** → this folder (`manifest.json` at the root)
4. Click the **Market Pulse** icon

If you already loaded an older build: **Reload** the extension card after `git pull`.

Toolbar next to Refresh:

- **◨ Dock** — Chrome’s right **side panel**
- Right-edge **logo chip** on web pages — tap to expand Pulse (same look as a floating desk widget)
- **▣ Mini** — small rotating NIFTY / SENSEX / BNF window

First open: **Stay ahead of the market** — Enable alerts or Not now. Alerts never auto-open the popup.

## Live quotes (market hours)

There is **no broker backend in this repo**. Quotes are HTTPS from **Yahoo Finance** in your Chrome profile (same idea as a public chart, no API key):

| Index | Yahoo symbol | Hours |
|--------|----------------|--------|
| NIFTY | `^NSEI` | 09:15–15:40 IST, ~1 min |
| SENSEX | `^BSESN` | same |
| BANKNIFTY | `^NSEBANK` | same |
| India VIX | `^INDIAVIX` | same |
| Heavyweights | `*.NS` (HDFC Bank, Reliance, …) | for “what’s moving” |

FII/DII is NSE `fiidiiTradeReact` in this browser (open [nseindia.com](https://www.nseindia.com/) once if it fails). Calendars are JSON on GitHub / Options.

Kite stays in OI Pulse. Do not paste tokens here.

## What you see

Priority: **slim NIFTY / SENSEX / BNF ticker → FII/DII → VIX → holiday → next event → index risk**. One Board. No Calendar tab. No “what’s moving” strip.

- **What’s moving:** not shown on the Board (kept out so the popup stays compact).
- **Next holiday:** next NSE holiday from `data/holidays.json`.
- **Index risk:** event in the next **7 days**, else a clear “no event this week / this month’s file / file expired (updated+30d)” line.

09:00 IST pre-market and **15:40 IST** close notifications on trading days if you enabled alerts.

## Admin JSON

[ADMIN.md](ADMIN.md). Shared server = GitHub raw `data/` on `main`.

## Chrome Web Store

[PUBLISH.md](PUBLISH.md) · [PRIVACY.md](PRIVACY.md)

Version **1.5.0** lockstep `VERSION` ↔ `manifest.json`. Admin password and JSON shapes: [ADMIN.md](ADMIN.md). Go live: [LIVE.md](LIVE.md). Ads / money: [MONETIZE.md](MONETIZE.md).
