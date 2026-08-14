# Make Market Pulse live

There is no server to deploy. Production = a Chrome extension people can install.

Money: AdSense cannot live in the extension. Use a website + optional Partner tile. See [MONETIZE.md](MONETIZE.md).

## 1. Ship the GitHub source (shared calendars)

Everyone already pulling from `main` gets JSON from:

`https://raw.githubusercontent.com/adeotale27/Market_Events/main`

1. Merge this version to **main**.
2. Keep `data/holidays.json`, `data/econ-events.json`, `data/index-impact/*.json` current.
3. Users: `git pull origin main` then **Reload** the unpacked extension.

Admin password is **not** a cloud login. It only unlocks Options on a machine that has the extension. Change `adminPin` in `data/config.json` before you share the zip if you do not want the repo default.

## 2. Sideload (you + testers)

```bash
git clone https://github.com/adeotale27/Market_Events.git
cd Market_Events
git pull origin main
```

Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → this folder.

## 3. Chrome Web Store (public)

One-time: Google [developer registration](https://chrome.google.com/webstore/devconsole) (paid fee).

```bash
git archive -o market-events.zip HEAD
```

Then:

1. Open the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole).
2. **New item** → upload `market-events.zip`.
3. Name: **Market Pulse**. Short description from `manifest.json`.
4. Screenshots: 1280×800 of the Board (indexes on top, FII, VIX, holiday, event, risk).
5. Privacy policy URL: host `PRIVACY.md` (GitHub raw or a site) and paste that URL.
6. Justify permissions (see `PUBLISH.md`). Single purpose: Indian index pulse + calendars. No account, no Kite.
7. Submit for review. After approval, the listing is the public install link.

Each store update **must** bump `VERSION` and `manifest.json` `"version"` (Chrome rejects reuse).

## What “production-proof” already means here

- Manifest V3, optional notifications until the user opts in
- Quotes and FII stay in the user’s Chrome (Yahoo + NSE); no broker backend
- Admin JSON validated before `chrome.storage` write
- Shared calendars are GitHub files, not a private API
- Content script is a dock chip only — it does not scrape pages
