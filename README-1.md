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
