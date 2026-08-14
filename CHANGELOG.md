# Changelog

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
