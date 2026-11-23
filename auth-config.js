/* MarketPlusView settings: prices, plans, links, contacts, business details, pictures. Edit values here; the code is in auth-main.js. */
window.MPV_CONFIG = (function () {
  var SB_URL = 'https://ssukfrvtknfsccqxqkjh.supabase.co';
  var SB_KEY = 'sb_publishable_qjmaCvag0XhnMlipWFHCeA_fwt3CqST';
  var WA_NUM = '254711691608', WA_SHOW = '+254 711 691608';   // support WhatsApp (digits only for the link)
  var SUPPORT = 'marketplusview@gmail.com';            // support email shown to clients
  // Payments: crypto (NOWPayments) or Finoq, both as buttons in the unlock form in index.html (the links are never shown as text). Renewal is manual: a new invite code each month.
  var NOWPAY = {};
  // Sponsored banner for Free plan and guests (Pro Plus Metal, trial and admin never see it). Paste your Binance invite link in url; leave it empty for no ad.
  var AD = { url: 'https://www.binance.com/referral/mystery-box/r3africnovmb/claim?ref=GRO_100037462_JQC6Q', img: 'https://res.cloudinary.com/datfuxotx/image/upload/v1781977413/binance-logo_r61uo2.jpg', until: '2026-12-11', text: 'Binance: rewards up to 100 USDT', sub: 'Sign up and complete the tasks. Terms apply.', ms: 5000, delay: 1200, gap: 10 * 60000, every: 30 * 60000 };   // ms = seconds on screen (in ms), delay = wait after the charts open, gap = minimum time between two ads, until = last day the ad shows (the Binance campaign ends), img = optional small picture link (https), empty = none
  // Pro Plus Metal invite ad (Free plan and guests only). first = wait after the charts open, every = repeat time (30 min suits a normal chart session; use 10 * 60000 for more, 60 * 60000 for less),
  // ms = time on screen, slide = time each picture shows (1000 = 1 second). The pictures are the login-page gallery (SHOTS below).
  var PROMO = { first: 60000, every: 30 * 60000, ms: 8000, slide: 1000 };
  // AUTO_TRIAL: true = every new sign-in starts the 7-day Pro Plus Metal trial at once (as before). false = new sign-ins stay on the Free plan (guest mode, nothing to pay) and start the trial themselves from Account > Start 7 days free.
  var AUTO_TRIAL = true;
  // Plans. There is ONE paid plan, Pro Plus Metal, at the old Silver price. Its stored key stays 'silver'. Old gold / metal / pro / platinum / starter members and the trial are all treated as Pro Plus Metal, so nobody loses access.
  var PRICE = { silver: [19, 190] };   // ONE paid plan: Pro Plus Metal (stored key stays 'silver'). [per month, per year] in USD
  var PLANS = {
    free: { n: 'Free', p: '$0', t: 'Chart anything, forever. No card, no trial timer.', d: ['Live charts, all timeframes and the classic chart types', '25+ built-in indicators and the full drawing toolkit', 'Alerts, watchlist, saved layouts, bar replay and compare', 'Order book, position size calculator, market mood and economic calendar'] },
    silver: { n: 'Pro Plus Metal', p: '$19 per month', t: 'The full desk. Every tool, every chart type, every strategy.', d: ['Everything in Free', 'Every premium indicator, strategy and chart type', 'Smart money tools, order-flow profiles, harmonic and Wyckoff patterns', 'Buy / sell push signals to your phone', 'All premium chart skins', 'The Pro plus Metal suite'] }
  };
  // Plan names stored in Supabase -> tier. Every paid plan name (old and new) maps to the single paid tier. The free trial is full Pro Plus Metal access.
  var ALIAS = { free: 'free', trial: 'silver', starter: 'silver', silver: 'silver', gold: 'silver', pro: 'silver', metal: 'silver', platinum: 'silver' };
  var RANK = { free: 0, silver: 1 };
  // One paid plan: the built-in indicators below are Free, everything else (other indicators, all strategies) needs Pro Plus Metal.
  var T_FREE = ['ema', 'sma', 'rib', 'rsi', 'bb', 'sup', 'vwap', 'vol', 'obv', 'mfi', 'sto', 'adx', 'macd', 'atr', 'wma', 'sar', 'ichi', 'kdj', 'srsi', 'wr', 'cci', 'roc', 'mtm', 'trix', 'avl', 'don', 'kel'];
  var SILVER_CHARTS = [3, 11, 12, 13, 14, 15, 16, 19, 20, 21];   // chart types that need Pro Plus Metal: Footprint, Session Volume Profile, TPO, Range Bars, Line Break, Kagi, Point & Figure, Delta Candles, CVD, Relative Performance
  var CHART_NAMES = { 3: 'Footprint', 11: 'Session Volume Profile', 12: 'TPO Market Profile', 13: 'Range Bars', 14: 'Line Break', 15: 'Kagi', 16: 'Point & Figure', 19: 'Delta Candles', 20: 'Cumulative Volume Delta', 21: 'Relative Performance' };
  // MASTER SWITCH: true = every indicator and strategy is open to everyone and the plan label is hidden. Set to false to bring the plan locks and labels back.
  var UNLOCK_ALL_TOOLS = true;
  var BIZ = { name: 'Reinblacks Digital', no: 'BN-6ASRZD7Z', owner: 'Reinhard Mugambi', nature: 'Software provider and distributor', date: '28 October 2026',
    loc: 'Diamond Heights 445, Room 05, Lumumba Drive, Roysambu, Kasarani, Nairobi, Kenya' };
  var SHOTS = [
    ['https://res.cloudinary.com/datfuxotx/image/upload/v1794555519/Screenshot_20261113_102253_s1xorl.jpg', 'Swing Failure Pattern [LuxAlgo]', 'Spots candles that poke through a swing high or low but close back inside it, a sign the break failed.'],
    ['https://res.cloudinary.com/datfuxotx/image/upload/v1794555519/Screenshot_20261113_103053_bpw0zr.jpg', 'Adjustable Pro Plus Ranging Channel', 'A channel around price with BUY / SELL buttons at its edges and a breakout marker.'],
    ['https://res.cloudinary.com/datfuxotx/image/upload/v1794555518/Screenshot_20261113_103213_nwdcvz.jpg', 'Cardwell Range Analyze', 'RSI regime BUY / SELL with entry, stop loss and three targets drawn for you, plus a live dashboard.'],
    ['https://res.cloudinary.com/datfuxotx/image/upload/v1794555518/Screenshot_20261113_103545_zsfkek.jpg', 'Reinblacks Liq & Inducement', 'Liquidity sweeps, fair value gaps, demand zones and inducement mapped on your chart.']
  ];
  var THEME_IMGS = [
    'https://res.cloudinary.com/ugwrkfyh/image/upload/v1794907819/file_00000000708c82109fc11c7e68601a5c.png',
    'https://res.cloudinary.com/ugwrkfyh/image/upload/v1794909261/file_00000000942482128dd2087f08c9b230.png',
    'https://res.cloudinary.com/ugwrkfyh/image/upload/v1794914114/file_00000000cf70820b952899dbc9d8c322.png',
    'https://res.cloudinary.com/ugwrkfyh/image/upload/v1794914114/file_00000000d82481fdbd297eca43a208da.png',
    'https://res.cloudinary.com/ugwrkfyh/image/upload/v1794907816/file_0000000010b08211adfb97874d4f3689.png'
  ];
  // ---- NEW ARRIVALS / TRENDING NOW: a still grid of new tools (no sliders), shown right after CHART THEMES ----
  // Pictures live in the new-tools folder next to index.html. If you host them elsewhere (e.g. Cloudinary), change NT_BASE
  // to that address, or put full links in the file names below.
  var NT_BASE = 'new-tools/';
  var NT = [
    ['https://res.cloudinary.com/ugwrkfyh/image/upload/v1795452782/ict-playbook.jpg', 'ICT Playbook', 'n', 'Draws the full ICT story for you: liquidity grab, market structure shift, then a trade box with stop and target.', '60%'],
    ['https://res.cloudinary.com/ugwrkfyh/image/upload/v1795452781/buy-sell-signals-xl-oc.jpg', 'Buy/Sell Signals XL OC', 't', 'Clear BUY / SELL signals with entry, take profit and stop loss boxes drawn on your chart, plus a live stats readout.', '70%'],
    ['https://res.cloudinary.com/ugwrkfyh/image/upload/v1795452781/po3-fractal-matrix.jpg', 'PO3 Fractal Matrix+', 'n', 'Maps the Power of 3 candle phases (C1 to C4) with previous day high and low and a countdown on the higher timeframe candle.', '82%'],
    ['https://res.cloudinary.com/ugwrkfyh/image/upload/v1795452780/trend-following-200.jpg', 'Trend Following 200', 't', 'Trade with the trend: a 200 trend line, BUY / SELL candle signals, pullback zones and 2R targets with a live stats panel.', '60%'],
    ['https://res.cloudinary.com/ugwrkfyh/image/upload/v1795452781/breakout-40-20.jpg', 'Breakout 40 20 TP / 35 SL', 'n', 'Marks the breakout line and prints BUY / SELL the moment price breaks through, with take profit and stop loss levels.', '72%'],
    ['https://res.cloudinary.com/ugwrkfyh/image/upload/v1795452781/ocb.jpg', 'OCB', 't', 'LONG / SHORT entries with a stop loss and three targets at 2R, 5R and 10R, plus a stats dashboard.', '70%']
  ];
  var SOCIAL = [
    ['ig', 'Follow us on Instagram', 'Marketplus View', 'Follow', 'https://www.instagram.com/marketplusview?exln=OXZkazEyNG1tM2F2',
      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1" fill="#fff" stroke="none"/></svg>'],
    ['fb', 'Follow us on Facebook', 'Marketplus View', 'Follow', 'https://www.facebook.com/profile.php?id=61595916974697',
      '<svg viewBox="0 0 24 24"><path fill="#fff" d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.600-1.500h1.600V4.300c-.3 0-1.200-.1-2.300-.1-2.300 0-3.900 1.400-3.900 4v2.200H8v3h2.500V21z"/></svg>'],
    ['yt', 'Subscribe on YouTube', 'Marketplus View', 'Subscribe', 'https://youtube.com/@marketplusview?si=G-eUBSCF8bp6bvVI',
      '<svg viewBox="0 0 24 24"><path fill="#fff" d="M9.6 8.2v7.6l6.6-3.8z"/></svg>'],
    ['tt', 'Follow us on TikTok', 'Marketplus View', 'Follow', 'https://www.tiktok.com/@marketplus.view?_r=1&_t=ZS-9BN1u68UljY',
      '<svg viewBox="0 0 24 24"><path fill="#fff" d="M16.6 3c.3 2.3 1.6 3.7 3.9 3.9v3c-1.4.1-2.7-.3-3.9-1.1v6.1c0 3.9-3.3 6.1-6.4 5.4-2.6-.6-4.4-3.1-3.9-5.9.5-3 3.2-4.7 6-4.2v3.1c-1.4-.4-2.9.3-3.3 1.6-.4 1.3.4 2.7 1.8 3 1.5.3 2.8-.8 2.8-2.4V3z"/></svg>']
  ];
  var CONTACT = [
    ['em', 'Email us', SUPPORT, 'Write', 'mailto:' + SUPPORT,
      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 8l8 5.5L20 8"/></svg>'],
    ['wa', 'WhatsApp', WA_SHOW, 'Chat', 'https://wa.me/' + WA_NUM,
      '<svg viewBox="0 0 24 24"><path fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3.6 20.4l1.3-4.4A8.4 8.4 0 1 1 8.100 19.100z"/><path fill="#fff" d="M9.100 8.500c.3 2.900 2.800 5.400 5.800 6l1.100-1.300-2-1-.9.700c-.8-.3-1.800-1.300-2.200-2.200l.7-.9-1-2z"/></svg>']
  ];
  var APP_VER = '1.0';
  // Locked tools show an upgrade prompt instead of opening. Each entry needs the tier 'silver' (= Pro Plus Metal, the one paid plan).
  // (Strategies are locked inside index.html through mpvAuth.lockStrat; the buttons below are matched by id or by their text.)
  var LOCK_IDS = {};   // buttons locked by id, e.g. bBook: ['The order book', 'silver']. Empty: order book and position calculator are free for every plan
  var LOCK_TXT = [];   // Bar replay, Compare, Long / Short, Second chart and Backup are Free on the new plans. To lock one again add [text on the button, name shown, tier], e.g. ['Bar replay', 'Bar replay', 'silver']
  var SRC = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js', 'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'];
  return { SB_URL: SB_URL, SB_KEY: SB_KEY, WA_NUM: WA_NUM, WA_SHOW: WA_SHOW, SUPPORT: SUPPORT, NOWPAY: NOWPAY, AD: AD, PROMO: PROMO, AUTO_TRIAL: AUTO_TRIAL, PRICE: PRICE, PLANS: PLANS, ALIAS: ALIAS, RANK: RANK, T_FREE: T_FREE, SILVER_CHARTS: SILVER_CHARTS, CHART_NAMES: CHART_NAMES, UNLOCK_ALL_TOOLS: UNLOCK_ALL_TOOLS, BIZ: BIZ, SHOTS: SHOTS, THEME_IMGS: THEME_IMGS, NT_BASE: NT_BASE, NT: NT, SOCIAL: SOCIAL, CONTACT: CONTACT, APP_VER: APP_VER, LOCK_IDS: LOCK_IDS, LOCK_TXT: LOCK_TXT, SRC: SRC };
})();
