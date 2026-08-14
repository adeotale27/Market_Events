# Market Events

Unpacked **Chrome Manifest V3** extension for NSE **holidays**, cash **FII/DII**, **India VIX**, and index **results**. Independent of OI Pulse and **Zerodha Kite**.

## Load unpacked

1. Clone this repository.
2. Chrome → `chrome://extensions` → enable **Developer mode**.
3. **Load unpacked** → select this folder (the one that contains `manifest.json`).
4. Pin the icon. Open the popup and click **Refresh**.

## What it shows

| Tile | Source |
|------|--------|
| **Holiday** | Bundled [`data/holidays.json`](data/holidays.json) (NSE 2026 calendar) |
| **FII / DII** | NSE `fiidiiTradeReact` from **this Chrome profile** (cookie warmup in the service worker) |
| **India VIX** | Yahoo chart API (`^INDIAVIX`) |
| **Index results** | Bundled [`data/results.json`](data/results.json) — edit and reload the extension |

No Kite token, no OI poller, no extra backend.

## Refresh results

Replace `data/results.json` with your calendar. Each event:

```json
{
  "date": "2026-08-17",
  "index": "NIFTY",
  "symbol": "HDFCBANK",
  "name": "HDFC Bank",
  "purpose": "Financial Results",
  "weightage": 13.1
}
```

`date` is ISO (`YYYY-MM-DD`). Then on `chrome://extensions` click **Reload** for this extension.

The sample rows in the repo are placeholders so the popup has something to render; swap them for your real board-meeting list.

## Validate JSON

```bash
node scripts/validate.js
```
