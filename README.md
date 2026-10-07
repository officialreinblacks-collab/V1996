# MarketPlusView push server

Sends BUY / SELL / TP3 / SL notifications to your phone even when the app is closed.
It runs the same Market Scanner engine as the chart (engine.js) on Binance candles.

## Run
    npm install
    npm start          # needs Node 18+

Needs a public HTTPS address (Render, Railway, Fly.io, or any VPS behind Caddy/nginx).
Keep the data folder persistent (subs.json, vapid.json) or set env VAPID_PUBLIC / VAPID_PRIVATE.
Optional env: PORT, SCAN_SECONDS (default 30), VAPID_SUBJECT (mailto:you@example.com), DATA_DIR.

## Connect the app
1. Replace your site's sw.js with the updated sw.js (it now handles push messages).
2. App → Settings → Notifications and screen → BACKGROUND PUSH: paste your server URL, tap Connect.
3. Tap "Send test push". On iPhone, add the app to the Home Screen first.

Server scans every Market Scanner on your chart (symbol, timeframe and settings) plus any extra symbols you list.
Other indicators and strategies are not scanned by the server; they still notify while the app is open.

## Forex (optional)
1. Get a Twelve Data API key (twelvedata.com).
2. Set it on the server: environment variable TWELVE_KEY=your_key, then restart.
3. In the app, paste the same server URL in Settings → BACKGROUND PUSH (Connect is not required for charts).
4. Open the symbol list, then the Forex tab (17 pairs plus gold and silver).

The scanner, push alerts and charts all use the same forex candles. The server caches them so one key serves everything.
Supported timeframes: 1m, 5m, 15m, 30m, 1h, 2h, 4h, 8h, 1d, 1w, 1M. Check your Twelve Data plan limits: free plans allow only a few requests per minute and per day.
