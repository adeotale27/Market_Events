# Admin data

There is no FastAPI in this repo. “Upload into the server” means GitHub `data/` or the password-gated Options desk.

Popup **More** is user-only (alerts, suggest, report). JSON uploads stay behind a password.

**Password (this repo):** `PulseAdmin@2026`

Set in `data/config.json` → `adminPin`. Change it before you publish a public zip if you do not want this default.

Open the desk: popup **More → Admin desk**, or Chrome → Extensions → Details → **Extension options**. Sign in, then pick UTF-8 `.json` files. Wrong shape is rejected with a line-level error.

1. **Shared (everyone):** commit the same JSON on **https://github.com/adeotale27/Market_Events** under `data/` (GitHub raw is the server).
2. **This browser only:** Options uploads win until you **Clear this browser’s uploads**.

## 1. Holidays — `data/holidays.json`

Type: **UTF-8 JSON**. NSE **trading** holidays only.

```json
{ "holidays": [ { "date": "2026-09-14", "name": "Ganesh Chaturthi" } ] }
```

| Field | Type | Required |
|-------|------|----------|
| `holidays` | array | yes |
| `date` | `YYYY-MM-DD` | yes |
| `name` | string | yes |

## 2. Next Event (macro) — `data/econ-events.json`

RBI, FOMC, CPI, GDP, Budget, NFP, etc.

```json
{
  "events": [
    { "date": "2026-08-31", "name": "India GDP Q1 FY27", "type": "gdp", "country": "IN", "impact": "high" }
  ]
}
```

| Field | Type | Required |
|-------|------|----------|
| `events` | array | yes |
| `date` | `YYYY-MM-DD` | yes |
| `name` | string | yes |
| `impact` | `critical` \| `high` \| `medium` \| `low` | recommended |
| `type`, `country` | string | optional |

Popup labels: TODAY / TOMORROW / in Nd.

## 3. Index risk — one file per index

- `data/index-impact/NIFTY.json`
- `data/index-impact/SENSEX.json`
- `data/index-impact/BANKNIFTY.json`

Only **Quarterly Results** and **Board Meeting** rows are ranked. Join constituents yourself (name + weightage).

```json
{
  "index": "NIFTY",
  "updated": "2026-08-14",
  "events": [
    {
      "name": "Reliance Industries",
      "symbol": "RELIANCE",
      "date": "2026-08-20",
      "event_type": "Quarterly Results",
      "weightage": 8.7
    }
  ]
}
```

| Field | Type | Required |
|-------|------|----------|
| `index` | `NIFTY` \| `SENSEX` \| `BANKNIFTY` | must match the file |
| `updated` | `YYYY-MM-DD` | yes (~30 days of coverage from this stamp) |
| `events` | array | yes (empty `[]` is valid) |
| `name` | string | yes |
| `date` | `YYYY-MM-DD` | yes |
| `event_type` | `Quarterly Results` \| `Board Meeting` | for the board to show it |
| `weightage` | number | recommended |
| `symbol` | string | optional |

Selecting NIFTY / SENSEX / BNF on the Board switches which file is shown. Empty `events: []` is valid until you have real rows.

## FII / DII and live prints

Do **not** upload. Service worker warms NSE cookies then `GET /api/fiidiiTradeReact`. Quotes are Yahoo in this browser. If FII fails, the popup keeps the last good nets.

## 4. Partner tile — `data/partner.json`

Not AdSense. Optional labeled link on the Board. Default is off (`enabled: false`). Full money notes: [MONETIZE.md](MONETIZE.md).

```json
{
  "enabled": true,
  "label": "Partner",
  "title": "Your product name",
  "url": "https://example.com/offer",
  "blurb": "One line"
}
```

## Remote base

Options → GitHub remote, or `data/config.json`:

```json
{ "remoteBase": "https://raw.githubusercontent.com/adeotale27/Market_Events/main" }
```
