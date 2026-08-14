# Changelog

## 1.4.1

- Compact teal Board (OI Pulse–style): slim NIFTY / SENSEX / BNF ticker, light borders
- Dropped What’s moving and the extra session card — Board keeps FII, VIX, holiday, next event, index risk
- Active tab and selected index use mint green

## 1.4.0

- Light purple card board: slim NIFTY / SENSEX / BNF strips on top (tap to select)
- Holiday, next macro event, and selected-index risk live on the same Board — no Calendar tab
- New chart-arrow toolbar icons; India VIX meter + sparklines
- Admin desk is password-gated (`data/config.json` `adminPin`); Options page documents exact JSON shapes
- Mini ticker handler restored; uploads rejected unless the desk is unlocked
- How to ship live: `LIVE.md` + Chrome Web Store steps in `PUBLISH.md`

## 1.3.0

- Professional logo; stronger 3D cards (22px radius) and India VIX meter
- Right-edge page dock (logo chip → expand panel) plus Chrome side panel
- User settings vs admin PIN (`pulse`) for JSON desk
- 09:15 today’s board and 15:40 close; holiday-tomorrow / high-impact → red, chime, window
- Board / Calendar / More tabs

## 1.2.0

- Light Pulse-style theme, 14px rounded cards
- FII/DII above VIX; next holiday restored
- Index risk: no event in the next 7 days, or empty/expired ~1-month admin file (uses `updated`)
- Dock to Chrome’s right side panel; mini rotating ticker window (buttons next to Refresh)
- Version in the header; footer no longer says Yahoo
- What’s moving: heaviest unusual print for the selected index (VIX / index % / heavyweight)

## 1.1.0

- Compact dark Market Pulse popup (~372px): indexes, 1–2 intel lines, one next event, one index-risk row
- Live NIFTY / SENSEX / BANKNIFTY / VIX / heavyweights via Yahoo in cash hours (09:15–15:40 IST)
- Optional 09:00 pre-market and 15:40 close notifications (consent first; skip weekends/holidays)
- Settings: suggest / report data / report a problem
- Removed placeholder constituent events; empty index-risk until admin JSON is committed
- No Kite

## 1.0.1

- Toolbar icon + NIFTY % badge
- FII/DII shown as three nets (FII, DII, combined) with buy/sell colour; last good print kept if NSE fails
- Popup auto-refreshes stale data on open; impact rows coloured ≤7d / 8–14d
- Footer shows JSON source (admin-upload / github / bundled)

## 1.0.0

- Four Pulse-style tiles: Holiday (JSON), FII/DII (NSE), Next Event (econ JSON), Index Impact (per-index JSON)
- Live NIFTY / SENSEX / BANKNIFTY via Yahoo; 1-minute refresh in cash hours
- Index chips switch impact file (Pulse `GET /events/{activeIndex}`)
- Admin Options page + GitHub raw as the shared file server
- Seeded onto Market_Events `main` from Pulse orphan `cursor/market-events-1bf9` (extension files only)
- No Kite
