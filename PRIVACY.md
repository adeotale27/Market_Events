# Privacy

Market Pulse does **not** create accounts and does **not** collect personal information.

## Data the extension reads

| Data | Where it goes |
|------|----------------|
| Index / VIX / heavyweight quotes | Fetched in **your browser** from Yahoo Finance (`query1` / `query2.finance.yahoo.com`). Not sent to us. |
| FII / DII cash | Fetched in **your browser** from NSE (`nseindia.com`) after a cookie warmup. Not sent to us. |
| Holidays, macro calendar, index-risk JSON | Bundled in the extension, or GitHub raw for `adeotale27/Market_Events`, or a file you pick in Options (stored in `chrome.storage` on this device only). |
| Alert preference | Stored in `chrome.storage.local` on this device. |

No Kite / broker token is stored or requested.

## Notifications

Optional. If you tap **Enable alerts**, Chrome asks for the notifications permission. You then get at most two trading-day pings (09:00 IST pre-market, 15:40 IST close). Weekends and NSE holidays are skipped. You can turn this off in Settings.

## Remote code

The extension does not load executable code from the network. JSON calendars from GitHub are data only.
