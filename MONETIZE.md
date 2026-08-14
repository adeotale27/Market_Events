# How ads / money work with Market Pulse

You can earn from this product. **Google AdSense cannot go inside the Chrome plugin.** That is Google’s rule, not ours.

## Why AdSense is blocked here

[AdSense placement policy](https://support.google.com/adsense/answer/1346295): publishers may **not** put AdSense (or AdSense for Search) in software, including **browser extensions** and toolbars. Code is only for normal web pages (and a few approved in-app WebViews).

[Chrome Web Store ads policy](https://developer.chrome.com/docs/webstore/program-policies/ads): **“Currently, AdSense may not be used to serve ads in Products.”**

If we pasted AdSense into `popup.html` or into the page dock:

- Google can **ban the AdSense account**
- Chrome can **reject / take down** the extension
- `chrome-extension://` pages are not AdSense sites anyway, so ads would not fill

So this repo does **not** load `adsbygoogle.js`, `googlesyndication`, or any ad network script.

## Ways you *can* earn

### 1. Partner tile in the popup (built in, off by default)

One labeled **Partner** card at the bottom of the Board. You sell that slot (broker, data vendor, course, your own site). It is **not** AdSense.

1. Copy `data/partner.json`
2. Set `"enabled": true`, `title`, `https` `url`, optional `blurb`
3. Commit to `main` **or** Admin desk → upload `partner.json`
4. Users who hate it: **More → Hide partner tile** (required by Chrome: ads must be removable)

Do not inject banners onto nseindia.com or other sites. The dock chip must stay a Pulse shortcut only.

### 2. AdSense on a **website** (this is the real AdSense path)

1. Put AdSense on a site you own (blog, landing page, “Market Pulse notes”).
2. Get the site approved by AdSense first.
3. Point the Partner tile `url` at that page, or put the URL in the Chrome Web Store listing.

You get paid when people browse **the site**, not the popup.

### 3. Chrome Web Store listing

The Store does **not** pay you per install. Money is from (1) or (2), affiliates, or a future paid “Pro” SKU — not from embedding AdSense.

### 4. What not to do

- No AdSense / AdMob / adsbygoogle in the extension
- No ads on third-party pages via `dock.js`
- No fake system notifications
- No forcing a click to use the Board
