/* MarketPlusView access gate v2. Add <script src="auth.js"></script> inside <head> of index.html. */
(function () {
  var SB_URL = 'https://ssukfrvtknfsccqxqkjh.supabase.co';
  var SB_KEY = 'sb_publishable_qjmaCvag0XhnMlipWFHCeA_fwt3CqST';
  var WA_NUM = '254711691608', WA_SHOW = '+254 711 691608';   // support WhatsApp (digits only for the link)
  var SUPPORT = 'marketplusview@gmail.com';            // support email shown to clients
  // Payments are crypto only, through the NOWPayments button (opens their payment page), also used in the unlock form in index.html. Renewal is manual: a new invite code each month.
  var NOWPAY = {};
  window.mpvPayLinks = NOWPAY;
  // Sponsored banner for Free plan and guests (Pro Plus Metal, trial and admin never see it). Paste your Binance invite link in url; leave it empty for no ad.
  var AD = { url: 'https://www.binance.com/referral/mystery-box/r3africnovmb/claim?ref=GRO_100037462_JQC6Q', img: 'https://res.cloudinary.com/datfuxotx/image/upload/v1781977413/binance-logo_r61uo2.jpg', until: '2026-12-11', text: 'Binance: rewards up to 100 USDT', sub: 'Sign up and complete the tasks. Terms apply.', ms: 5000, delay: 1200, gap: 10 * 60000, every: 30 * 60000 };   // ms = seconds on screen (in ms), delay = wait after the charts open, gap = minimum time between two ads, until = last day the ad shows (the Binance campaign ends), img = optional small picture link (https), empty = none
  // Pro Plus Metal invite ad (Free plan and guests only). first = wait after the charts open, every = repeat time (30 min suits a normal chart session; use 10 * 60000 for more, 60 * 60000 for less),
  // ms = time on screen, slide = time each picture shows (1000 = 1 second). The pictures are the login-page gallery (SHOTS below).
  var PROMO = { first: 60000, every: 30 * 60000, ms: 8000, slide: 1000 };
  var LS = 'mpvAccess', root = document.documentElement, sb, pill, timer;
  var S = { email: '', plan: '', exp: null, admin: false, trialUsed: false, guest: false, free: false }, triedTrial = false;
  var getMode = function () { try { return localStorage.getItem('mpvMode'); } catch (e) { return null; } };
  var setMode = function (m) { try { localStorage.setItem('mpvMode', m); } catch (e) {} };
  // Plans. There is ONE paid plan, Pro Plus Metal, at the old Silver price. Its stored key stays 'silver'. Old gold / metal / pro / platinum / starter members and the trial are all treated as Pro Plus Metal, so nobody loses access.
  var PRICE = { silver: [19, 190] };   // ONE paid plan: Pro Plus Metal (stored key stays 'silver'). [per month, per year] in USD
  var PLANS = {
    free: { n: 'Free', p: '$0', t: 'Chart anything, forever. No card, no trial timer.', d: ['Live charts, all timeframes and the classic chart types', '25+ built-in indicators and the full drawing toolkit', 'Alerts, watchlist, saved layouts, bar replay and compare', 'Order book, position size calculator, market mood and economic calendar'] },
    silver: { n: 'Pro Plus Metal', p: '$19 per month', t: 'The full desk. Every tool, every chart type, every strategy.', d: ['Everything in Free', 'Every premium indicator, strategy and chart type', 'Smart money tools, order-flow profiles, harmonic and Wyckoff patterns', 'Buy / sell push signals to your phone', 'All premium chart skins', 'The Pro plus Metal suite'] }
  };
  // Plan names stored in Supabase -> tier. Every paid plan name (old and new) maps to the single paid tier. The free trial is full Pro Plus Metal access.
  var ALIAS = { free: 'free', trial: 'silver', starter: 'silver', silver: 'silver', gold: 'silver', pro: 'silver', metal: 'silver', platinum: 'silver' };
  var RANK = { free: 0, silver: 1 };
  var tierOf = function (plan) { return ALIAS[plan] || ''; };
  var planName = function (plan) { return plan === 'trial' ? 'Free trial (Pro Plus Metal)' : (PLANS[tierOf(plan)] ? PLANS[tierOf(plan)].n : ''); };
  var normTier = function (t) { t = String(t || '').toLowerCase(); return (!t || t === 'free') ? t : 'silver'; };   // gold / metal / platinum all mean the single paid plan
  var tierName = function (t) { t = normTier(t); return PLANS[t] ? PLANS[t].n : String(t); };
  var can = function (need) { need = normTier(need); if (!need || need === 'free') return true; return !!(S.admin || (S.exp && +S.exp > Date.now() && (RANK[tierOf(S.plan)] || 0) >= (RANK[need] || 9))); };
  // One paid plan: the built-in indicators below are Free, everything else (other indicators, all strategies) needs Pro Plus Metal.
  var T_FREE = ['ema', 'sma', 'rib', 'rsi', 'bb', 'sup', 'vwap', 'vol', 'obv', 'mfi', 'sto', 'adx', 'macd', 'atr', 'wma', 'sar', 'ichi', 'kdj', 'srsi', 'wr', 'cci', 'roc', 'mtm', 'trix', 'avl', 'don', 'kel'];
  var SILVER_CHARTS = [3, 11, 12, 13, 14, 15, 16, 19, 20, 21];   // chart types that need Pro Plus Metal: Footprint, Session Volume Profile, TPO, Range Bars, Line Break, Kagi, Point & Figure, Delta Candles, CVD, Relative Performance
  var CHART_NAMES = { 3: 'Footprint', 11: 'Session Volume Profile', 12: 'TPO Market Profile', 13: 'Range Bars', 14: 'Line Break', 15: 'Kagi', 16: 'Point & Figure', 19: 'Delta Candles', 20: 'Cumulative Volume Delta', 21: 'Relative Performance' };
  var stratTier = function (k) { return 'silver'; };
  var indTier = function (k) { return T_FREE.indexOf(k) > -1 ? 'free' : 'silver'; };
  // MASTER SWITCH: true = every indicator and strategy is open to everyone and the plan label is hidden. Set to false to bring the plan locks and labels back.
  var UNLOCK_ALL_TOOLS = true;
  var badgeOf = function (kind, k) { if (UNLOCK_ALL_TOOLS && !S.guest) return ''; if (kind !== 'ind' && kind !== 'strat') return ''; var t = kind === 'strat' ? stratTier(k) : indTier(k); return t === 'silver' ? 'P' : ''; };

  var st = document.createElement('style');
  st.textContent =
    'html:root{--acc:#3b82f6;--acc2:#ef4444}' +
    'html #tour{background:radial-gradient(700px 400px at 20% 0%,rgba(37,99,235,.45),transparent 60%),radial-gradient(600px 400px at 100% 100%,rgba(239,68,68,.3),transparent 60%),rgba(4,8,20,.78);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}' +
    'html #tour .tcard{background:linear-gradient(160deg,rgba(96,165,250,.22),rgba(255,255,255,.06) 45%,rgba(239,68,68,.12));border:1px solid rgba(147,180,255,.35);-webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);box-shadow:0 30px 80px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.35),0 0 60px rgba(59,130,246,.25)}' +
    'html #tour .tcard h2{color:#fff}html #tour .tcard p{color:#cdd8f2}' +
    'html #tour .tic{background:linear-gradient(135deg,rgba(96,165,250,.35),rgba(239,68,68,.25));border:1px solid rgba(255,255,255,.3);box-shadow:0 0 30px rgba(96,165,250,.45)}' +
    'html #tour .tk span{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#e6edff;border-radius:12px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}' +
    'html #tour .tdots i.on{background:linear-gradient(90deg,#3b82f6,#ef4444)}' +
    'html #tour .tbtn button{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);color:#fff;border-radius:999px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}' +
    'html #tour .tbtn button.pri{background:linear-gradient(135deg,#ef4444,#b91c1c);border-color:transparent;box-shadow:0 8px 24px rgba(239,68,68,.4)}' +
    'html #tour .tbtn button:empty{visibility:hidden}' +
    '#mpv-auth{position:fixed;inset:0;z-index:2147483000;overflow:auto;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top,0px) + 20px) 16px calc(env(safe-area-inset-bottom,0px) + 24px);color:#fff;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;background:radial-gradient(900px 520px at 10% -10%,rgba(37,99,235,.55),transparent 60%),radial-gradient(700px 480px at 100% 105%,rgba(239,68,68,.35),transparent 60%),#050a18}' +
    '#mpv-auth *{box-sizing:border-box}' +
    '.mpv-wrap{width:min(100%,420px);margin:0 auto;min-height:100%;display:flex;flex-direction:column;justify-content:center;gap:16px}' +
    '.mpv-card,.mpv-plan{background:rgba(255,255,255,.07);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.16);border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12)}' +
    '.mpv-card{padding:24px 20px}.mpv-plan{padding:16px;border-radius:18px}' +
    '.mpv-plan.metal{border-color:rgba(239,68,68,.6)}.mpv-plan.gold{border-color:rgba(250,204,21,.55)}.mpv-plan.silver{border-color:rgba(96,165,250,.5)}' +
    '.mpv-plan .top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;font-size:17px}.mpv-plan .top span{color:#93b4ff;font-weight:600;font-size:15px}' +
    '.mpv-plan .li{font-size:14px;color:#cdd7ee;padding:3px 0}' +
    '.mpv-logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:17px;margin-bottom:16px;letter-spacing:-.01em}.mpv-mark{width:64px;height:42px;border-radius:8px;object-fit:contain;flex:none}' +
    '.mpv-sign{text-align:center;margin:6px 0 4px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1);color:#8d9bbd}.mpv-sign img{display:block;width:130px;height:68px;border-radius:11px;object-fit:contain;margin:0 auto 8px;opacity:.95}.mpv-sign b{display:block;font-size:16px;color:#fff;letter-spacing:-.01em}.mpv-sign small{display:block;margin-top:2px;font-size:12px;letter-spacing:.04em}' +
    '.mpv-card h1{margin:0 0 6px;font-size:26px;letter-spacing:-.02em}' +
    '.mpv-sub{margin:0 0 16px;color:#aebbd8;font-size:14px;line-height:1.5}' +
    '.mpv-card input{width:100%;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:14px;font-size:16px;margin-bottom:10px;outline:none}' +
    '.mpv-card input::placeholder{color:#7f8fb3}.mpv-card input:focus{border-color:#60a5fa}' +
    '#mpvC{text-transform:uppercase;letter-spacing:.08em;text-align:center}' +
    '.mpv-btn{display:block;width:100%;border:0;border-radius:12px;padding:14px;font-size:16px;font-weight:600;color:#fff;background:linear-gradient(135deg,#ef4444,#b91c1c);box-shadow:0 6px 18px rgba(239,68,68,.35);margin-top:8px}' +
    '.mpv-btn.blue{background:linear-gradient(135deg,#3b82f6,#1d4ed8);box-shadow:0 6px 18px rgba(59,130,246,.35)}' +
    '.mpv-btn.ghost{background:rgba(255,255,255,.1);box-shadow:none}.mpv-btn:disabled{opacity:.5}' +
    '.mpv-msg{min-height:20px;font-size:14px;color:#ff7b8f;margin:2px 0 6px;line-height:1.4}.mpv-msg.ok{color:#4ade80}' +
    '.mpv-links{display:flex;justify-content:space-between;gap:12px;margin-top:16px;font-size:14px}' +
    '.mpv-links a,.mpv-legal a{color:#93b4ff;cursor:pointer;text-decoration:none}' +
    '.mpv-ct{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:4px 0 10px}.mpv-ct b{font-size:14px;color:#fff;word-break:break-all}' +
    '.mpv-cb{display:flex;gap:8px}.mpv-cb a,.mpv-cb button{border:0;border-radius:10px;padding:8px 14px;font-size:13px;font-weight:700;color:#fff;background:rgba(255,255,255,.12);text-decoration:none;cursor:pointer;font-family:inherit}.mpv-cb .go{background:linear-gradient(135deg,#ef4444,#b91c1c)}' +
    '.mpv-help{margin-top:14px;padding:14px 16px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.04);font-size:13px;line-height:1.6;color:#dbe4f7}.mpv-help h2{margin:0 0 6px;font-size:15px;color:#fff}.mpv-help p{margin:0 0 6px}.mpv-help a{color:#93b4ff;text-decoration:none;font-weight:600}' +
    '.mpv-or{text-align:center;color:#7f8fb3;font-size:13px;margin:12px 0 2px}.mpv-plans{display:grid;gap:12px}.mpv-pay{text-align:center;color:#aebbd8;font-size:13px}' +
    '.mpv-pick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}' +
    '.mpv-pk{font:inherit;color:#fff;text-align:center;cursor:pointer;padding:10px 4px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);min-width:0;-webkit-tap-highlight-color:transparent}' +
    '.mpv-pk b{display:block;font-size:15px}.mpv-pk .pr{display:block;margin-top:2px;font-size:15px;font-weight:700;color:#93b4ff}.mpv-pk .pr small{font-size:11px;font-weight:600;color:#7f8fb3}.mpv-pk .sh{display:block;margin-top:3px;font-size:11px;line-height:1.25;color:#aebbd8}' +
    '.mpv-pk.silver{border-color:rgba(96,165,250,.5)}.mpv-pk.gold{border-color:rgba(255,255,255,.7)}.mpv-pk.metal{border-color:rgba(239,68,68,.6)}' +
    '.mpv-pk.sel{background:rgba(255,255,255,.17);box-shadow:0 0 0 2px rgba(255,255,255,.5)}' +
    '.mpv-hint{text-align:center;color:#7f8fb3;font-size:12px;margin:-4px 0 0}' +
    '.mpv-plans .mpv-plan{display:none}.mpv-plans .mpv-plan.sel{display:block}' +
    '.mpv-tbl{--ac:#60a5fa;background:linear-gradient(165deg,rgba(37,99,235,.28),rgba(255,255,255,.05) 55%,rgba(239,68,68,.22));-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.16);border-radius:22px;padding:0 14px 6px;box-shadow:0 20px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12)}' +
    '.mpv-tbl[data-sel=silver]{--ac:#60a5fa}.mpv-tbl[data-sel=gold]{--ac:#fff}.mpv-tbl[data-sel=metal]{--ac:#ef4444}' +
    '.mpv-tbl .tr{display:flex;align-items:center;gap:4px;min-height:52px}' +
    '.mpv-tbl .th{min-height:48px;font-size:13px;font-weight:700;border-bottom:1px solid rgba(96,165,250,.4)}' +
    '.mpv-tbl .tl{flex:1;min-width:0;font-size:15px;font-weight:700;color:#fff;padding:10px 6px 10px 0;line-height:1.25}' +
    '.mpv-tbl .th .tl{font-size:12px;color:#60a5fa;letter-spacing:.04em}' +
    '.mpv-tbl .tc{width:64px;flex:none;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;text-align:center}' +
    '.mpv-tbl .tc.free{color:#8d9bbd}.mpv-tbl .th .tc{font-size:13px}.mpv-tbl .th .tc.pl{color:var(--ac)}' +
    '.mpv-tbl .tc.pl{display:none}.mpv-tbl[data-sel=silver] .pl-silver,.mpv-tbl[data-sel=gold] .pl-gold,.mpv-tbl[data-sel=metal] .pl-metal{display:flex}' +
    '.mpv-tbl .tch{width:18px;flex:none;color:#60a5fa;font-size:20px;text-align:center;transition:transform .15s}' +
    '.mpv-tbl .trw{border-top:1px solid rgba(147,180,255,.18);cursor:pointer}.mpv-tbl .trw.open .tch{transform:rotate(90deg)}' +
    '.mpv-tbl .td{display:none;padding:0 6px 12px 0;font-size:13px;color:#aebbd8;line-height:1.45}.mpv-tbl .trw.open .td{display:block}' +
    '.mpv-tprice{text-align:center;color:#dbe4f7;font-size:14px;margin:2px 0}.mpv-tprice b{color:#93b4ff}' +
    '.mpv-about{font-size:15px;line-height:1.55;color:#dbe4f7;text-align:center;margin:4px 4px 0}' +
    '.mpv-soc{margin-top:14px;padding:14px 14px 12px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.04)}' +
    '.mpv-soc h2{margin:0 0 10px;font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#93b4ff;text-align:center}' +
    '.mpv-soc a{display:flex;align-items:center;gap:12px;margin:0 0 8px;padding:10px 12px;border-radius:13px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);text-decoration:none;color:#fff;transition:background .15s,transform .1s,border-color .15s}' +
    '.mpv-soc a:last-child{margin-bottom:0}.mpv-soc a:hover{background:rgba(255,255,255,.1);border-color:rgba(147,180,255,.45)}.mpv-soc a:active{transform:scale(.98)}' +
    '.mpv-soc .si{flex:none;display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px}.mpv-soc .si svg{width:22px;height:22px;display:block}' +
    '.mpv-soc .si.ig{background:linear-gradient(45deg,#f9ce34 0%,#ee2a7b 50%,#6228d7 100%)}.mpv-soc .si.yt{background:#ff0000}.mpv-soc .si.tt{background:#000;border:1px solid rgba(255,255,255,.28)}' +
    '.mpv-soc .st{flex:1;min-width:0;text-align:left}.mpv-soc .st b{display:block;font-size:14.5px;line-height:1.2;color:#fff}.mpv-soc .st span{display:block;margin-top:2px;font-size:12.5px;color:#aebbd8}' +
    '.mpv-soc .sg{flex:none;font-size:11.5px;font-weight:800;letter-spacing:.03em;color:#fff;padding:6px 12px;border-radius:999px;background:linear-gradient(135deg,#1c4fd8,#0e7bb8)}' +
    '.mpv-pic{display:block;width:100%;height:auto;border-radius:18px;margin:14px 0 0;border:1px solid rgba(255,255,255,.16);box-shadow:0 14px 40px rgba(0,0,0,.45)}' +
    '@keyframes mpvAdBar{from{width:100%}to{width:0}}' +
    '.mpv-feat{display:grid;gap:8px;margin:14px 4px 0;text-align:left}.mpv-feat>div{padding:11px 13px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12)}.mpv-feat b{display:block;font-size:14.5px;color:#fff}.mpv-feat b svg{color:#ef4444;vertical-align:-1px}.mpv-feat span{display:block;margin-top:2px;font-size:13.5px;line-height:1.45;color:#b7c4e2}' +
    '.mpv-gh{margin:20px 4px 0;font-size:18px;color:#fff;text-align:center}' +
    '.mpv-gal{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:12px 4px 8px;margin:0 -4px}.mpv-gal::-webkit-scrollbar{display:none}' +
    '.mpv-gi{flex:0 0 88%;margin:0;scroll-snap-align:center;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);box-shadow:0 12px 32px rgba(0,0,0,.4)}.mpv-gi img{display:block;width:100%;aspect-ratio:1570/720;object-fit:cover;background:#0a0e1a}' +
    '.mpv-gi figcaption{padding:10px 12px 12px;text-align:left}.mpv-gi b{display:block;font-size:14.5px;color:#fff}.mpv-gi span{display:block;margin-top:3px;font-size:13px;line-height:1.45;color:#b7c4e2}.mpv-gi i{display:inline-block;margin-top:7px;font-style:normal;font-size:11.5px;font-weight:700;color:#ef4444}.mpv-gi i svg{vertical-align:-1px}' +
    '.mpv-swipe{text-align:center;font-size:12.5px;color:#7f8fb3}' +
    '.mpv-more summary{cursor:pointer;color:#93b4ff;font-weight:600;list-style:none;margin:0 0 12px}.mpv-more summary::-webkit-details-marker{display:none}.mpv-more[open] summary{display:none}' +
    '.mpv-note{margin:16px 4px 0;text-align:center;color:#dbe4f7;font-size:15px;line-height:1.6}.mpv-note h2{margin:0 0 10px;font-size:19px;line-height:1.3;color:#fff}.mpv-note h2 b{color:#ef4444}.mpv-note p{margin:0 0 12px}.mpv-note .mpv-site{font-weight:700;color:#fff;margin:14px 0 2px}.mpv-note .mpv-tag{color:#60a5fa;font-weight:600;margin:0}' +
    '.mpv-biz{border:1px solid rgba(147,180,255,.25);border-radius:18px;padding:16px 18px;background:rgba(255,255,255,.03);color:#dbe4f7;font-size:14px;line-height:1.6;text-align:left}.mpv-biz h2{margin:0 0 6px;font-size:17px;color:#fff}.mpv-biz p{margin:0}.mpv-biz .k{color:#93b4ff;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:12px 0 1px}.mpv-biz a{color:#93b4ff;text-decoration:none}' +
    '.mpv-legal{font-size:12.5px;line-height:1.5;color:#8d9bbd;text-align:center;margin:0 6px}' +
    '#mpv-pill{position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);right:8px;z-index:9998;background:rgba(10,20,50,.75);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#dbe4f7;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:4px 10px;font:600 12px Inter,system-ui,sans-serif}';
  st.textContent +=
    '.mpv-now{display:block;margin-top:8px;text-align:center}.mpv-now img{display:inline-block;max-width:100%;height:auto;border-radius:12px}' +
    '.mpv-top{display:flex;align-items:center;justify-content:space-between}' +
    '.mpv-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px;letter-spacing:-.01em}' +
    '.mpv-lg{width:60px;height:42px;border-radius:9px;object-fit:contain;background:#0b1224;border:1px solid rgba(255,255,255,.18)}' +
    '.mpv-x{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;font-size:18px}' +
    '.mpv-card.mpv-prof{display:flex;gap:14px;align-items:center;padding:18px 16px}' +
    '.mpv-av{flex:none;width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#fff;background:linear-gradient(135deg,#3b82f6,#1d4ed8);box-shadow:0 0 0 3px rgba(255,255,255,.15)}' +
    '.mpv-who{min-width:0}.mpv-who b{display:block;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.mpv-who span{display:block;font-size:13px;color:#aebbd8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}' +
    '.mpv-badge{display:inline-block;margin-top:8px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.06em;color:#fff;background:rgba(59,130,246,.35);border:1px solid rgba(147,180,255,.5);font-style:normal}' +
    '.mpv-badge.red{background:rgba(239,68,68,.3);border-color:rgba(239,68,68,.6)}' +
    '.mpv-stat{font-size:13px;color:#cdd7ee;margin:-4px 4px 0}' +
    '.mpv-tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '.mpv-tile{text-align:left;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#fff;font:inherit;display:block;width:100%}' +
    '.mpv-tile .ic{font-size:20px;color:#93b4ff}.mpv-tile b{display:block;font-size:15px;margin:8px 0 2px}.mpv-tile small{display:block;font-size:12px;color:#aebbd8;line-height:1.35}' +
    '.mpv-card.mpv-list{padding:4px 6px}' +
    '.mpv-item{display:flex;align-items:center;justify-content:space-between;width:100%;background:none;border:0;border-bottom:1px solid rgba(255,255,255,.1);color:#fff;font:inherit;font-size:16px;padding:15px 10px;text-align:left}' +
    '.mpv-item:last-child{border-bottom:0}.mpv-item span{color:#7f8fb3}.mpv-item.out{color:#ff5d6c;font-weight:700}' +
    '.mpv-info p{font-size:14px;line-height:1.6;color:#dbe4f7;margin:0 0 12px}' +
    '.mpv-info details{border:1px solid rgba(147,180,255,.2);border-radius:12px;padding:10px 12px;margin:0 0 8px;background:rgba(255,255,255,.03)}.mpv-info summary{cursor:pointer;font-weight:700;font-size:14px;color:#fff;list-style:none}.mpv-info summary::-webkit-details-marker{display:none}.mpv-info details p{margin:8px 0 0}.mpv-info ul{margin:0 0 12px;padding-left:20px;font-size:14px;line-height:1.6;color:#dbe4f7}' +
    '.mpv-ceo{margin:6px 0 4px}.mpv-ceo .ph{display:block;width:132px;height:132px;border-radius:50%;object-fit:cover;margin:6px auto 12px;border:3px solid rgba(147,180,255,.55);box-shadow:0 0 0 4px rgba(147,180,255,.12),0 8px 24px rgba(0,0,0,.45)}.mpv-ceo h2{font-size:18px;line-height:1.3;color:#fff;text-align:center;margin:0 0 12px}.mpv-ceo h3{font-size:15px;color:#93b4ff;margin:18px 0 6px}.mpv-ceo .sig{margin-top:16px;padding-top:12px;border-top:1px solid rgba(147,180,255,.2);font-weight:700;color:#fff}.mpv-ceo .sig span{display:block;font-weight:400;color:#dbe4f7}.mpv-ceo a{color:#93b4ff}' +
    '.mpv-info .k{color:#93b4ff;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:14px 0 2px}' +
    '#bar #mpvMenuBtn{flex:none;order:200;position:sticky;right:0;z-index:5;box-sizing:border-box;width:40px;min-width:40px;height:36px;display:flex;align-items:center;justify-content:center;background:var(--bg,#0b0e14);color:#c9d0e0;box-shadow:-10px 0 8px var(--bg,#0b0e14);cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '#bar #mpvMenuBtn:active{color:#fff}#bar #bFull{right:130px!important}';
  st.textContent +=
    '.mpv-ld{text-align:center;padding:36px 20px 30px;animation:mpvIn .5s ease both}' +
    '.mpv-ldlogo{font-weight:800;font-size:24px;letter-spacing:-.02em;margin-bottom:22px;animation:mpvPulse 2.2s ease-in-out infinite}.mpv-ldlogo img{display:block;margin:0 auto;max-width:70%;max-height:110px;width:auto;height:auto;object-fit:contain}' +
    '.mpv-ring{position:relative;width:64px;height:64px;margin:0 auto 22px}' +
    '.mpv-ring i{position:absolute;inset:0;border-radius:50%;border:3px solid transparent}' +
    '.mpv-ring i:nth-child(1){border-top-color:#3b82f6;border-right-color:rgba(59,130,246,.35);animation:mpvSpin 1s linear infinite;filter:drop-shadow(0 0 6px rgba(59,130,246,.7))}' +
    '.mpv-ring i:nth-child(2){inset:10px;border-bottom-color:#ef4444;border-left-color:rgba(239,68,68,.35);animation:mpvSpin 1.4s linear infinite reverse;filter:drop-shadow(0 0 6px rgba(239,68,68,.6))}' +
    '.mpv-ldtxt{margin:0 0 20px;color:#aebbd8;font-size:15px;font-weight:500}' +
    '.mpv-dots b{display:inline-block;animation:mpvDot 1.2s ease-in-out infinite}.mpv-dots b:nth-child(2){animation-delay:.2s}.mpv-dots b:nth-child(3){animation-delay:.4s}' +
    '.mpv-bar{height:4px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden;width:70%;margin:0 auto}' +
    '.mpv-bar i{display:block;height:100%;width:40%;border-radius:4px;background:linear-gradient(90deg,#3b82f6,#ef4444);animation:mpvBar 1.5s ease-in-out infinite}' +
    '@keyframes mpvSpin{to{transform:rotate(360deg)}}' +
    '@keyframes mpvDot{0%,80%,100%{opacity:.2;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}' +
    '@keyframes mpvBar{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}' +
    '@keyframes mpvPulse{0%,100%{opacity:.85}50%{opacity:1;text-shadow:0 0 18px rgba(96,165,250,.55)}}' +
    '@keyframes mpvIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '@media (prefers-reduced-motion:reduce){.mpv-ld *,.mpv-ld{animation-duration:3s!important}}';
  st.textContent +=
    '.mpv-cola,.mpv-colb,.mpv-c1,.mpv-c2,.mpv-cols,.mpv-foot{display:flex;flex-direction:column;gap:16px;min-width:0}' +
    '.mpv-colb .mpv-plans{display:grid;gap:12px}' +
    '@media (min-width:900px){' +
      '#mpv-auth{padding:calc(env(safe-area-inset-top,0px) + 32px) 32px 40px}' +
      '.mpv-wrap.mpv-wide{width:min(100%,1120px);display:grid;grid-template-columns:minmax(340px,430px) minmax(0,1fr);column-gap:32px;row-gap:20px;align-content:center;align-items:start}' +
      '.mpv-wide .mpv-cola{grid-column:1;grid-row:1;position:sticky;top:0}' +
      '.mpv-wide .mpv-colb{grid-column:2;grid-row:1}' +
      '.mpv-wide .mpv-foot{grid-column:1 / -1;grid-row:2;max-width:760px;margin:0 auto}' +
      '.mpv-wrap.mpv-acct{width:min(100%,980px)}' +
      '.mpv-acct .mpv-top{margin-bottom:4px}' +
      '.mpv-acct .mpv-cols{display:grid;grid-template-columns:minmax(300px,400px) minmax(0,1fr);gap:24px;align-items:start}' +
      '.mpv-acct .mpv-c2{position:sticky;top:0}' +
      '.mpv-acct .mpv-item{cursor:pointer}.mpv-acct .mpv-item:hover,.mpv-tile:hover{background:rgba(255,255,255,.07)}' +
      '.mpv-btn,.mpv-tile,.mpv-x{cursor:pointer}' +
    '}' +
    '@media (min-width:900px){.mpv-pick,.mpv-hint{display:none}.mpv-plans .mpv-plan{display:block}.mpv-tbl .tc.pl{display:flex}.mpv-tbl .tc{width:84px}.mpv-tbl .th .tc.pl{color:#aebbd8}}' +
    '@media (min-width:1180px){.mpv-wide .mpv-colb .mpv-plans{grid-template-columns:repeat(3,minmax(0,1fr))}.mpv-wide .mpv-plan{display:flex;flex-direction:column}.mpv-wide .mpv-plan .li{flex:none}}' +
    '@media (min-width:900px) and (max-height:700px){.mpv-wide .mpv-cola{position:static}.mpv-acct .mpv-c2{position:static}}';
  st.textContent +=
    '.mpv-trialbox{margin-top:18px;padding-top:16px;border-top:1px solid rgba(147,180,255,.2)}' +
    '.mpv-btn.mpv-trial{background:linear-gradient(90deg,#2563eb,#ef4444);box-shadow:0 8px 24px rgba(37,99,235,.35)}' +
    '.mpv-trnote{margin-top:8px;text-align:center;font-size:13.5px;font-weight:600;color:#93b4ff}' +
    '@media (max-width:899px){.mpv-tbl{max-height:min(60vh,500px);overflow-y:auto;-webkit-overflow-scrolling:touch}.mpv-tbl .th{position:sticky;top:0;z-index:2;background:#0e1c45}}';
  // Subscription screen (TradingView-style plan comparison)
  st.textContent +=
    '#mpv-auth.sp{background:#000;overflow:hidden;padding:calc(env(safe-area-inset-top,0px) + 10px) 14px calc(env(safe-area-inset-bottom,0px) + 12px)}' +
    '.mpv-wrap.mpv-spw{width:min(100%,780px);height:100%;min-height:0;justify-content:flex-start;gap:12px}' +
    '.sp-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex:none}' +
    '.sp-bk{width:40px;height:40px;border:0;background:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:50%}' +
    '.sp-top .mpv-lg{width:52px;height:36px}' +
    '.sp-un{font-weight:700;font-size:15px;max-width:42%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}' +
    '.sp-tabs{display:flex;gap:6px;flex:none}' +
    '.sp-tabs button{flex:1;border:0;border-radius:16px;padding:12px 8px;font:700 17px Inter,system-ui,sans-serif;color:#7f9bd6;background:transparent;cursor:pointer;white-space:nowrap}' +
    '.sp-tabs button.on{background:#fff;color:#0b1d4d;box-shadow:0 0 0 2px #2563eb,0 0 18px rgba(37,99,235,.45)}' +
    '.sp-st{flex:none;font-size:12.5px;color:#93b4ff;text-align:center}' +
    '.sp-card{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;background:linear-gradient(165deg,#0c1a3d 0%,#0e1424 55%,#2a0e18 100%);border:1.5px solid rgba(96,165,250,.45);border-radius:26px;padding:0 16px 8px}' +
    '.sp-r{display:flex;align-items:center;gap:4px;min-height:56px}' +
    '.sp-h{position:sticky;top:0;z-index:2;background:#0c1a3d;min-height:52px;font-size:14px;font-weight:700}' +
    '.sp-l{flex:1;font-size:16.5px;font-weight:700;color:#fff;padding:12px 6px 12px 0;line-height:1.25}' +
    '.sp-h .sp-l{font-size:13.5px;color:#60a5fa;letter-spacing:.03em}' +
    '.sp-c{width:74px;flex:none;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;text-align:center}' +
    '.sp-h .sp-c{font-size:14px;color:#fff}.sp-c.sp-now,.sp-h .sp-c.sp-now{color:#7f8fb3}' +
    '.sp-ch{width:22px;flex:none;color:#60a5fa;font-size:22px;text-align:center;transition:transform .15s}' +
    '.sp-row{border-top:1px solid rgba(147,180,255,.2);cursor:pointer}.sp-row.open .sp-ch{transform:rotate(90deg)}' +
    '.sp-det{display:none;padding:0 6px 14px 0;font-size:13.5px;color:#aebbd8;line-height:1.45}.sp-row.open .sp-det{display:block}' +
    '.sp-c.pl{display:none}' +
    '.sp-card[data-sel=silver] .pl-silver,.sp-card[data-sel=gold] .pl-gold,.sp-card[data-sel=metal] .pl-metal{display:flex}' +
    '.sp-note{flex:none;font-size:11.5px;color:#7f8fb3;text-align:center;line-height:1.4}' +
    '.sp-foot{flex:none;display:grid;gap:10px}' +
    '.sp-pr{display:flex;justify-content:space-between;align-items:center;width:100%;padding:16px 18px;border-radius:22px;background:rgba(255,255,255,.06);border:2px solid rgba(96,165,250,.45);color:#fff;cursor:pointer;font:600 15px Inter,system-ui,sans-serif}' +
    '.sp-pr b{font-size:23px;font-weight:800;letter-spacing:-.01em}.sp-pr b small{font-size:19px;color:#93b4ff;font-weight:600}.sp-pr.on{border-color:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.45)}' +
    '.sp-yw{position:relative;margin-top:8px}' +
    '.sp-save{position:absolute;right:-2px;top:-15px;background:#ef4444;color:#fff;font:700 14px Inter,system-ui,sans-serif;font-style:normal;padding:5px 14px;border-radius:999px;pointer-events:none}' +
    '.sp-up{width:100%;padding:19px;border-radius:24px;border:0;background:linear-gradient(90deg,#2563eb,#ef4444);color:#fff;font:700 16px Inter,system-ui,sans-serif;cursor:pointer}' +
    '.sp-up:disabled{background:#1a2238;color:#7f8fb3;cursor:default}' +
    '@media (min-width:700px){.sp-c{width:96px}.sp-c.pl{display:flex}.sp-h .pl{color:#6a6a6a}' +
      '.sp-card[data-sel=silver] .sp-h .pl-silver,.sp-card[data-sel=gold] .sp-h .pl-gold,.sp-card[data-sel=metal] .sp-h .pl-metal{color:#fff}}' +
    '@media (max-height:520px){.mpv-wrap.mpv-spw{gap:8px}.sp-st,.sp-note{display:none}.sp-tabs button{padding:8px;font-size:15px}.sp-r{min-height:44px}.sp-l{font-size:15px;padding:8px 6px 8px 0}' +
      '.sp-foot{grid-template-columns:1fr 1fr;gap:8px 12px}.sp-yw{margin-top:0}.sp-pr{padding:10px 14px}.sp-pr b{font-size:18px}.sp-pr b small{font-size:15px}.sp-up{grid-column:1/-1;padding:12px}}';
  st.textContent +=
    '@media (min-width:900px){' +
      '.mpv-wrap.mpv-infow{width:min(100%,880px)}' +
      '.mpv-wrap.mpv-infow.mpv-narrow{width:min(100%,560px)}' +
      '.mpv-infow .mpv-card{padding:36px 44px}' +
      '.mpv-infow .mpv-card h1{font-size:34px;margin-bottom:14px}' +
      '.mpv-infow .mpv-info p,.mpv-infow .mpv-info ul{font-size:16px;line-height:1.7}' +
      '.mpv-infow .mpv-info summary{font-size:16px}' +
      '.mpv-infow .mpv-info .k{font-size:13px;break-after:avoid}' +
      '.mpv-infow .mpv-btn{width:auto;min-width:160px;margin:22px auto 0;padding:13px 30px;cursor:pointer}' +
      '.mpv-ceo{display:grid;grid-template-columns:260px minmax(0,1fr);gap:40px;align-items:start;margin:10px 0 0}' +
      '.mpv-ceoh{position:sticky;top:0}' +
      '.mpv-ceo .ph{width:220px;height:220px;margin:4px auto 16px}' +
      '.mpv-ceo h2{font-size:20px}' +
      '.mpv-ceob>p:first-child{margin-top:0}' +
      '.mpv-ceo h3{font-size:17px;margin-top:24px}' +
    '}' +
    '@media (min-width:1200px){' +
      '.mpv-wrap.mpv-infow{width:min(100%,1100px)}' +
      '.mpv-infow .mpv-ib{column-count:2;column-gap:56px}' +
      '.mpv-infow .mpv-ib details{break-inside:avoid}' +
      '.mpv-infow .mpv-ib .mpv-ceo{column-span:all}' +
      '.mpv-ceo{grid-template-columns:300px minmax(0,1fr)}.mpv-ceo .ph{width:240px;height:240px}' +
    '}' +
    '@media (min-width:900px) and (max-height:700px){.mpv-ceoh{position:static}}';
  // FIX 1 (desktop overlap on the login screen): a sticky grid item can slide over the row below it, so the left column
  // (logo, about, picture, note) was drawn on top of the About box and legal text. On desktop the column now scrolls normally.
  // FIX 2 (desktop Subscription screen): was a narrow phone-style stack. From 900px it becomes two columns:
  // the full plan table on the left, the plan tabs, prices and Upgrade button on the right. Phones and tablets are untouched.
  st.textContent +=
    '@media (min-width:900px){' +
      '.mpv-wrap.mpv-wide .mpv-cola{position:static}' +
      '#mpv-auth.sp{padding:calc(env(safe-area-inset-top,0px) + 20px) 32px calc(env(safe-area-inset-bottom,0px) + 24px)}' +
      '.mpv-wrap.mpv-spw{width:min(100%,1120px);display:grid;grid-template-columns:minmax(0,1fr) 360px;grid-template-rows:auto auto auto auto auto minmax(0,1fr);column-gap:32px;row-gap:14px;align-content:stretch}' +
      '.mpv-spw .sp-top{grid-column:1 / -1;grid-row:1}' +
      '.mpv-spw .sp-card{grid-column:1;grid-row:2 / 7;min-height:0}' +
      '.mpv-spw .sp-tabs{grid-column:2;grid-row:2}' +
      '.mpv-spw .sp-tabs button{font-size:15px;padding:12px 4px}' +
      '.mpv-spw .sp-st{grid-column:2;grid-row:3;text-align:left}' +
      '.mpv-spw .sp-foot{grid-column:2;grid-row:4}' +
      '.mpv-spw .sp-note{grid-column:2;grid-row:5;text-align:left}' +
      '.mpv-spw .sp-pr,.mpv-spw .sp-up,.mpv-spw .sp-tabs button,.mpv-spw .sp-bk,.mpv-spw .sp-row{cursor:pointer}' +
      '.mpv-spw .sp-up:disabled{cursor:default}' +
      '.mpv-spw .sp-row:hover{background:rgba(255,255,255,.04)}' +
    '}';
  (document.head || root).appendChild(st);
  try { var pl = document.createElement('link'); pl.rel = 'preload'; pl.as = 'image'; pl.href = 'https://res.cloudinary.com/wfypjzyt/image/upload/v1791143890/file_00000000b0e882118146e28bda6201fd.png?v=2'; (document.head || root).appendChild(pl); } catch (e) {}

  var ov = document.createElement('div');
  ov.id = 'mpv-auth';
  ov.innerHTML = '<div class="mpv-wrap"><div class="mpv-card mpv-ld"><div class="mpv-ldlogo"><img src="https://res.cloudinary.com/wfypjzyt/image/upload/v1791143890/file_00000000b0e882118146e28bda6201fd.png?v=2" alt="" onerror="this.parentNode.innerHTML=\'<span style=&quot;color:#ef4444&quot;>Market</span><span style=&quot;color:#3b82f6&quot;>Plus</span><span style=&quot;color:#fff&quot;>View</span>\'"></div><div class="mpv-ring"><i></i><i></i></div><p class="mpv-ldtxt">Loading your charts<span class="mpv-dots"><b>.</b><b>.</b><b>.</b></span></p><div class="mpv-bar"><i></i></div></div></div>';
  root.appendChild(ov);

  // Show / hide password: an eye button inside every password box on the sign-in screens.
  (function () {
    var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    var OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a19.7 19.7 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a19.8 19.8 0 0 1-3.17 4.19M14.12 14.12A3 3 0 1 1 9.88 9.88"/><path d="M1 1l22 22"/></svg>';
    var s2 = document.createElement('style');
    s2.textContent = '.mpv-pw{position:relative;display:block}.mpv-card .mpv-pw input{padding-right:52px}' +
      '.mpv-eye{position:absolute;right:6px;top:0;height:calc(100% - 10px);width:40px;border:0;background:transparent;color:rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;border-radius:10px;-webkit-tap-highlight-color:transparent}' +
      '.mpv-eye.on{color:#2dd4a7}.mpv-eye svg{width:20px;height:20px;display:block;pointer-events:none}';
    (document.head || root).appendChild(s2);
    function wrap() {
      var n = ov.querySelectorAll('input[type="password"]');
      for (var k = 0; k < n.length; k++) {
        var i = n[k], p = i.parentNode;
        if (!p || (p.classList && p.classList.contains('mpv-pw'))) continue;
        var had = document.activeElement === i, w = document.createElement('span'); w.className = 'mpv-pw';
        p.insertBefore(w, i); w.appendChild(i);
        var b = document.createElement('button'); b.type = 'button'; b.className = 'mpv-eye'; b.tabIndex = -1; b.setAttribute('aria-label', 'Show password'); b.innerHTML = EYE; w.appendChild(b);
        (function (i, b) {
          b.onmousedown = function (e) { e.preventDefault(); };
          b.onclick = function (e) {
            e.preventDefault(); e.stopPropagation();
            var sh = i.type === 'password'; i.type = sh ? 'text' : 'password';
            b.innerHTML = sh ? OFF : EYE; b.className = 'mpv-eye' + (sh ? ' on' : ''); b.setAttribute('aria-label', sh ? 'Hide password' : 'Show password');
            try { i.focus(); } catch (x) {}
          };
        })(i, b);
        if (had) { try { i.focus(); } catch (x) {} }
      }
    }
    new MutationObserver(wrap).observe(ov, { childList: true, subtree: true });
  })();

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var SITE = '';   // optional: paste your live site address here, e.g. 'https://yourname.github.io/repo/' or your domain. It must also be added in Supabase > Authentication > URL Configuration.
  var back = function () { return SITE || location.origin + location.pathname; }, enc = encodeURIComponent;
  var URLERR = (function () { var m = /error_description=([^&]+)/.exec(location.hash + '&' + location.search); try { return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; } catch (e) { return ''; } })();
  var GOOGLE_BTN = '<div class="mpv-or">or</div><button class="mpv-btn ghost" id="mpvGg"><svg width="18" height="18" viewBox="0 0 48 48" style="vertical-align:-3px;margin-right:8px"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>Continue with Google</button>';
  function googleGo() { var b = $('mpvGg'); if (b) { b.disabled = true; b.textContent = 'Opening Google…'; } sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back() } }).then(function (r) { if (r && r.error) { msg(r.error.message); if (b) { b.disabled = false; b.textContent = 'Continue with Google'; } } }); }
  var GUEST_BTN = '<button class="mpv-btn ghost" id="mpvGst">Continue as guest</button><div class="mpv-trnote" style="text-align:center;margin-top:6px">Free tools only \u00b7 no account needed</div>';
  // Brand wordmark, matches the logo: Market red, Plus blue, View white (explicit colours so it never depends on the surrounding text colour)
  var WM = '<span style="color:#ef4444">Market</span><span style="color:#3b82f6">Plus</span><span style="color:#fff">View</span>';
  var LOGO_IMG = 'https://res.cloudinary.com/wfypjzyt/image/upload/v1791143890/file_00000000b0e882118146e28bda6201fd.png?v=2';
  var BRAND = '<div class="mpv-logo"><img class="mpv-mark" src="' + LOGO_IMG + '" alt="" onerror="this.style.display=\'none\'"><span>' + WM + '</span></div>';
  // closing signature at the bottom of the login page
  var SIGN = '<div class="mpv-sign"><img src="' + LOGO_IMG + '" alt="MarketPlusView" onerror="this.style.display=\'none\'"><b>' + WM + '</b><small>Research. Understand. Decide.</small></div>';

  var WIDGET = '<a href="https://nowpayments.io/payment/?iid=4584036588&source=button" target="_blank" rel="noreferrer noopener">\n    <img src="https://nowpayments.io/images/embeds/payments-button-black.svg" alt="Crypto payment button by NOWPayments" style="max-width:100%">\n</a>';

  var BIZ = { name: 'Reinblacks Digital', no: 'BN-6ASRZD7Z', owner: 'Reinhard Mugambi', nature: 'Software provider and distributor', date: '28 October 2026',
    loc: 'Diamond Heights 445, Room 05, Lumumba Drive, Roysambu, Kasarani, Nairobi, Kenya' };
  function contactsHtml() {
    return '<a href="mailto:' + SUPPORT + '">' + SUPPORT + '</a><br><a href="https://wa.me/' + WA_NUM + '" target="_blank" rel="noopener">WhatsApp ' + WA_SHOW + '</a>';
  }
  function bizHtml() {
    return '<div class="mpv-biz"><h2>About</h2><p><b>' + WM + '</b><br>Registered under ' + BIZ.name + '</p>' +
      '<div class="k">Business No.</div><p>' + BIZ.no + '</p>' +
      '<div class="k">Location</div><p>' + BIZ.loc + '</p>' +
      '<div class="k">Contacts</div><p>' + contactsHtml() + '</p></div>';
  }

  // Plan table (login area and Subscription screen share it): Free vs Pro Plus Metal. [label, [Free, Pro Plus Metal], detail]
  function tblRows() {
    return [
      ['Live charts and timeframes', [true, true], 'Live charts, all timeframes and the classic chart types.'],
      ['Built-in indicators', ['25+', '25+'], 'More than 25 built-in indicators such as EMA, RSI, MACD, Bollinger Bands, VWAP and Ichimoku.'],
      ['Drawing toolkit', [true, true], 'The full drawing toolkit.'],
      ['Alerts, watchlist, layouts, replay', [true, true], 'Alerts, watchlist, saved layouts, bar replay and compare.'],
      ['Order book, calculator, calendar', [true, true], 'Order book, position size calculator, market mood and economic calendar.'],
      ['Premium tools and strategies', ['0', 'All'], 'Every premium indicator and strategy is unlocked.'],
      ['Advanced chart types', [false, true], 'Footprint, Session Volume Profile, TPO, Range Bars, Line Break, Kagi, Point & Figure, Delta Candles, CVD and Relative Performance.'],
      ['Trend and breakout strategies', [false, true], 'Breakout, Trend Following, Mean Reversion and Cardwell Range strategies.'],
      ['Candle-pattern strategies', [false, true], 'Candle-pattern strategies, ready to trade.'],
      ['Sessions, Fib Golden Zone, DVDIQQE', [false, true], 'Sessions, Fib Golden Zone and DVDIQQE.'],
      ['Premium chart skins', [false, 'All'], 'All premium chart skins are unlocked.'],
      ['Smart money tools', [false, true], 'Market structure, order blocks, liquidity maps and FVG.'],
      ['Volume and order-flow profiles', [false, true], 'Volume and order-flow profiles.'],
      ['Harmonic and Wyckoff patterns', [false, true], 'Advanced strategies, harmonic and Wyckoff patterns.'],
      ['Buy / sell push signals', [false, true], 'Buy / sell push signals sent to your phone.'],
      ['Pro plus Metal suite', [false, true], 'Every tool and strategy unlocked, including the Pro plus Metal suite.']
    ];
  }
  function tblPriceLine(k) { return '<b>$' + PRICE[k][0] + ' / month</b> \u00b7 or $' + PRICE[k][1] + ' a year (2 months free)'; }
  function plansHtml(buy) {
    var ks = ['silver'], first = 'silver';
    var chk = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-label="Included"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    var no = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.6" stroke-linecap="round" aria-label="Not included"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var cell = function (v) { return v === true ? chk : v === false ? no : String(v); };
    var h = '';   // one paid plan: no plan picker
    var head = '<div class="tr th"><div class="tl">FEATURES</div><div class="tc free">Free</div>' + ks.map(function (k) { return '<div class="tc pl pl-' + k + '">' + PLANS[k].n + '</div>'; }).join('') + '<div class="tch"></div></div>';
    var rows = tblRows().map(function (r) {
      var v = r[1];
      return '<div class="trw"><div class="tr"><div class="tl">' + r[0] + '</div><div class="tc free">' + cell(v[0]) + '</div>' +
        ks.map(function (k, j) { return '<div class="tc pl pl-' + k + '">' + cell(v[j + 1]) + '</div>'; }).join('') +
        '<div class="tch">\u203a</div></div><div class="td">' + r[2] + '</div></div>';
    }).join('');
    h += '<div class="mpv-tbl" data-sel="' + first + '">' + head + rows + '</div>';
    h += '<div class="mpv-tprice" id="mpvTp">' + tblPriceLine(first) + '</div>';
    if (buy) h += '<button class="mpv-btn blue pay" id="mpvTbuy" data-plan="' + first + '">Get ' + PLANS[first].n + '</button>';
    return h + '<div class="mpv-pay">The Free plan stays free. Pro Plus Metal is paid in crypto and renewed manually, with a new invite code each period. Codes are confirmed in about 5 to 10 minutes.</div>';
  }
  var LOCK_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  // Login-page gallery: [image, tool name (as shown on the chart), what it does]
  var SHOTS = [
    ['https://res.cloudinary.com/datfuxotx/image/upload/v1794555519/Screenshot_20261113_102253_s1xorl.jpg', 'Swing Failure Pattern [LuxAlgo]', 'Spots candles that poke through a swing high or low but close back inside it, a sign the break failed.'],
    ['https://res.cloudinary.com/datfuxotx/image/upload/v1794555519/Screenshot_20261113_103053_bpw0zr.jpg', 'Adjustable Pro Plus Ranging Channel', 'A channel around price with BUY / SELL buttons at its edges and a breakout marker.'],
    ['https://res.cloudinary.com/datfuxotx/image/upload/v1794555518/Screenshot_20261113_103213_nwdcvz.jpg', 'Cardwell Range Analyze', 'RSI regime BUY / SELL with entry, stop loss and three targets drawn for you, plus a live dashboard.'],
    ['https://res.cloudinary.com/datfuxotx/image/upload/v1794555518/Screenshot_20261113_103545_zsfkek.jpg', 'Reinblacks Liq & Inducement', 'Liquidity sweeps, fair value gaps, demand zones and inducement mapped on your chart.']
  ];
  function galleryHtml() {
    return '<h3 class="mpv-gh">See it in action</h3><div class="mpv-gal">' + SHOTS.map(function (s) {
      return '<figure class="mpv-gi"><img src="' + s[0] + '" alt="' + esc(s[1]) + '" loading="lazy"><figcaption><b>' + esc(s[1]) + '</b><span>' + esc(s[2]) + '</span><i>' + LOCK_SVG + ' Pro plus Metal</i></figcaption></figure>';
    }).join('') + '</div><div class="mpv-swipe">Swipe for more \u203a</div>';
  }
  var SOCIAL = [
    ['ig', 'Follow us on Instagram', 'Marketplus View', 'Follow', 'https://www.instagram.com/marketplusview?exln=OXZkazEyNG1tM2F2',
      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1" fill="#fff" stroke="none"/></svg>'],
    ['yt', 'Subscribe on YouTube', 'Marketplus View', 'Subscribe', 'https://youtube.com/@marketplusview?si=G-eUBSCF8bp6bvVI',
      '<svg viewBox="0 0 24 24"><path fill="#fff" d="M9.6 8.2v7.6l6.6-3.8z"/></svg>'],
    ['tt', 'Follow us on TikTok', 'Marketplus View', 'Follow', 'https://www.tiktok.com/@marketplus.view?_r=1&_t=ZS-9BN1u68UljY',
      '<svg viewBox="0 0 24 24"><path fill="#fff" d="M16.6 3c.3 2.3 1.6 3.7 3.9 3.9v3c-1.4.1-2.7-.3-3.9-1.1v6.1c0 3.9-3.3 6.1-6.4 5.4-2.6-.6-4.4-3.1-3.9-5.9.5-3 3.2-4.7 6-4.2v3.1c-1.4-.4-2.9.3-3.3 1.6-.4 1.3.4 2.7 1.8 3 1.5.3 2.8-.8 2.8-2.4V3z"/></svg>']
  ];
  function socialHtml() {
    return '<div class="mpv-soc"><h2>Follow us</h2>' + SOCIAL.map(function (x) {
      return '<a href="' + x[4].replace(/&/g, '&amp;') + '" target="_blank" rel="noopener noreferrer" aria-label="' + x[1] + ': ' + x[2] + '">' +
        '<span class="si ' + x[0] + '">' + x[5] + '</span>' +
        '<span class="st"><b>' + x[1] + '</b><span>' + x[2] + '</span></span>' +
        '<span class="sg">' + x[3] + '</span></a>';
    }).join('') + '</div>';
  }
  function extraParts(buy) {
    return {
      about: '<p class="mpv-about">A fast trading view tool that helps traders and investors analyse the market with live crypto charts, indicators, buy / sell signals, alerts and more.</p>' +
        '<div class="mpv-feat">' +
        '<div><b>Free, no card needed</b><span>Live charts, 25+ indicators, alerts, watchlist and bar replay.</span></div>' +
        '<div><b>' + LOCK_SVG + ' Pro Plus Metal \u00b7 $' + PRICE.silver[0] + ' / month</b><span>Smart money tools, order flow, premium strategies and buy / sell push signals.</span></div>' +
        '<div><b>Try it first</b><span>Continue as a guest, or start 7 days free.</span></div></div>' +
        galleryHtml() +
        '<div class="mpv-note"><h2>' + WM + ' — <b>Research. Understand. Decide.</b></h2>' +
        '<p>We believe information comes first before every trade or investment. The right information opens your eyes, helps you see further, and guides you toward smarter decisions.</p>' +
        '<details class="mpv-more"><summary>Read more \u203a</summary>' +
        '<p>As a trader or investor, always question what you hear: Where, when, and who? Research, verify, and understand the risks before you decide.</p>' +
        '<p>Winning isn\u2019t always easy, but with the right information, experience, and risk management, you increase your chances of growing and breaking through.</p></details>' +
        '<p class="mpv-site">MarketPlusView.com</p><p class="mpv-tag">Research. Understand. Decide.</p></div>',
      plans: plansHtml(buy),
      help: '<div class="mpv-help"><h2>Having login problems or inquiries?</h2><p>Our support team will be glad to assist you. Please contact us through either channel below.</p><p>WhatsApp: <a href="https://wa.me/' + WA_NUM + '" target="_blank" rel="noopener">' + WA_SHOW + '</a><br>Email: <a href="mailto:' + SUPPORT + '">' + SUPPORT + '</a></p></div>',
      biz: bizHtml(),
      legal: '<p class="mpv-legal">MarketPlusView provides trading analysis tools only. We are not a broker, we do not hold, manage or send money, and nothing here is financial advice. Trading involves risk; no tool guarantees profits. Our aim is to help you experience different markets.</p>'
    };
  }
  var galT = 0;
  function galStart() {
    clearInterval(galT);
    var g = ov.querySelector('.mpv-gal'); if (!g) return;
    try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    var items = g.querySelectorAll('.mpv-gi'), hold = 0;
    var stop = function () { hold = Date.now() + 8000; };   // the person is swiping: pause 8 seconds
    g.addEventListener('touchstart', stop, { passive: true }); g.addEventListener('mousedown', stop); g.addEventListener('wheel', stop, { passive: true });
    galT = setInterval(function () {
      if (!root.contains(g)) { clearInterval(galT); return; }
      if (!items.length || Date.now() < hold || ov.style.display === 'none') return;
      var base = items[0].offsetLeft, cur = 0, best = 1e9;
      for (var k = 0; k < items.length; k++) { var d = Math.abs(items[k].offsetLeft - base - g.scrollLeft); if (d < best) { best = d; cur = k; } }
      var nx = (cur + 1) % items.length;
      g.scrollTo({ left: items[nx].offsetLeft - base, behavior: 'smooth' });
    }, 4000);
  }
  function card(inner, more, buy) {
    ov.classList.remove('sp'); ov.style.display = 'block'; if (pill) pill.style.display = 'none';
    if (more) {
      var x = extraParts(buy);
      ov.innerHTML = '<div class="mpv-wrap mpv-wide"><div class="mpv-cola"><div class="mpv-card">' + BRAND + inner + '</div>' + socialHtml() + x.about + x.help + '</div><div class="mpv-colb">' + x.plans + '</div><div class="mpv-foot">' + x.biz + x.legal + SIGN + '</div></div>';
    } else {
      ov.innerHTML = '<div class="mpv-wrap"><div class="mpv-card">' + BRAND + inner + '</div></div>';
    }
    ov.scrollTop = 0;
    galStart();
    document.querySelectorAll('.mpv-pk').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-k');
        document.querySelectorAll('.mpv-pk,.mpv-plans .mpv-plan').forEach(function (e) { e.classList.toggle('sel', e.getAttribute('data-k') === k); });
        document.querySelectorAll('.mpv-tbl').forEach(function (t) { t.setAttribute('data-sel', k); });
        var tp = $('mpvTp'); if (tp) tp.innerHTML = tblPriceLine(k);
        var tb = $('mpvTbuy'); if (tb) { tb.setAttribute('data-plan', k); tb.textContent = 'Get ' + PLANS[k].n; }
      };
    });
    document.querySelectorAll('.mpv-tbl .trw').forEach(function (r) { r.onclick = function () { r.classList.toggle('open'); }; });
    document.querySelectorAll('.pay').forEach(function (b) { b.onclick = function () { payView(b.dataset.plan); }; });
    if ($('mpvPayNow')) $('mpvPayNow').onclick = function () { var w = $('mpvWid'); if (w && w.scrollIntoView) w.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    if ($('mpvTr')) $('mpvTr').onclick = function () { location.href = 'mailto:' + SUPPORT + '?subject=' + enc('Free 7-day trial code') + '&body=' + enc('Hello, please send me my free 7-day trial code. My account email: ' + S.email); };
  }
  function msg(t, ok) { var m = $('mpvM'); if (m) { m.textContent = t || ''; m.className = 'mpv-msg' + (ok ? ' ok' : ''); } }
  function busy(b, on, label) { b.disabled = on; b.textContent = on ? 'Please wait…' : label; }
  function close() { clearInterval(galT); ov.classList.remove('sp'); ov.style.display = 'none'; if (pill) pill.style.display = 'block'; }

  function guestLockView(m) {
    card('<h1>Guest trial ended</h1><p class="mpv-sub">' + esc(m || '') + ' Create your account with your email, then enter your access code to continue.</p>' +
      '<input id="mpvE" type="email" inputmode="email" autocomplete="email" placeholder="Email"><input id="mpvP" type="password" autocomplete="new-password" placeholder="Password (8+ characters)">' +
      '<div class="mpv-msg" id="mpvM"></div><button class="mpv-btn" id="mpvGo">Create account</button>' + GOOGLE_BTN + '<div class="mpv-links"><a id="mpvSw">I already have an account</a></div>', true, false);
    $('mpvGg').onclick = googleGo;
    $('mpvSw').onclick = function () { loginView('in'); };
    $('mpvGo').onclick = async function () {
      var e = $('mpvE').value.trim(), p = $('mpvP').value, b = $('mpvGo');
      if (!e || !p) return msg('Enter your email and password.');
      if (p.length < 8) return msg('Use a password with at least 8 characters.');
      busy(b, true); msg('');
      var r = await sb.auth.updateUser({ email: e, password: p }, { emailRedirectTo: back() });
      if (r.error) { msg(r.error.message); busy(b, false, 'Create account'); return; }
      setMode('email'); loginView('in', 'Check your email to confirm it, then sign in and enter your code.', true);
    };
  }

  function loginView(mode, m, ok) {
    var up = mode === 'up', label = up ? 'Create account' : 'Sign in';
    card('<h1>' + label + '</h1><p class="mpv-sub">' + (up ? 'Create your account, then start your free 7-day Pro Plus Metal trial.' : 'Sign in with your email to open the charts.') + '</p>' +
      '<input id="mpvE" type="email" inputmode="email" autocomplete="email" placeholder="Email">' +
      '<input id="mpvP" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" placeholder="Password' + (up ? ' (8+ characters)' : '') + '">' +
      '<div class="mpv-msg" id="mpvM"></div><button class="mpv-btn" id="mpvGo">' + label + '</button>' + GOOGLE_BTN + GUEST_BTN +
      '<div class="mpv-links"><a id="mpvSw">' + (up ? 'I already have an account' : 'Create an account') + '</a>' + (up ? '' : '<a id="mpvFg">Forgot password</a>') + '</div>' +
      '<div class="mpv-trialbox"><button class="mpv-btn mpv-trial" id="mpvTs">Start 7 days free</button><div class="mpv-trnote">No card needed \u00b7 Try free</div></div>', true, false);
    if (!m && URLERR) { m = URLERR; ok = false; URLERR = ''; }
    msg(m, ok);
    $('mpvGg').onclick = googleGo;
    $('mpvSw').onclick = function () { loginView(up ? 'in' : 'up'); };
    $('mpvGst').onclick = guestGo;
    $('mpvTs').onclick = function () {
      var e0 = $('mpvE').value, p0 = $('mpvP').value;
      if (!up) { loginView('up'); if ($('mpvE')) $('mpvE').value = e0; if ($('mpvP')) $('mpvP').value = p0; }
      var f = $('mpvE'); if (f) { try { f.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {} try { f.focus(); } catch (x) {} }
      msg('Enter your email and a password to start your free 7 days.', true);
    };
    if (!up) $('mpvFg').onclick = async function () {
      var e = $('mpvE').value.trim();
      if (!e) return msg('Enter your email first, then tap Forgot password.');
      var r = await sb.auth.resetPasswordForEmail(e, { redirectTo: back() });
      msg(r.error ? r.error.message : 'Reset link sent. Check your email.', !r.error);
    };
    $('mpvGo').onclick = async function () {
      var e = $('mpvE').value.trim(), p = $('mpvP').value, b = $('mpvGo');
      if (!e || !p) return msg('Enter your email and password.');
      if (up && p.length < 8) return msg('Use a password with at least 8 characters.');
      busy(b, true); msg('');
      try {
        if (up) {
          var r = await sb.auth.signUp({ email: e, password: p, options: { emailRedirectTo: back() } });
          if (r.error) throw r.error;
          if (r.data.session) return check();
          return loginView('in', 'Account created. Check your email to confirm it, then sign in.', true);
        }
        var s = await sb.auth.signInWithPassword({ email: e, password: p });
        if (s.error) throw s.error;
        check();
      } catch (err) { msg(err.message || 'Something went wrong. Try again.'); busy(b, false, label); }
    };
  }

    function codeView(email, m, closable) {
    card('<h1>Enter access code</h1><p class="mpv-sub">Signed in as ' + esc(email) + '. Enter your code to unlock MarketPlusView.</p>' +
      '<input id="mpvC" type="text" autocapitalize="characters" autocomplete="off" placeholder="MPV-XXXX-XXXX">' +
      '<div class="mpv-msg" id="mpvM"></div><button class="mpv-btn" id="mpvGo">Unlock</button>' +
      '<div class="mpv-links"><a id="mpvOut">Sign out</a>' + (closable ? '<a id="mpvBk">Back</a>' : '') + '</div>', true, true);
    msg(m);
    $('mpvOut').onclick = signOut;
    if (closable) $('mpvBk').onclick = function () { accountView(); };
    $('mpvGo').onclick = async function () {
      var c = $('mpvC').value.trim(), b = $('mpvGo');
      if (!c) return msg('Enter your code.');
      busy(b, true); msg('');
      var r = await sb.rpc('redeem_code', { p_code: c });
      if (r.error) { msg(r.error.message); busy(b, false, 'Unlock'); return; }
      check();
    };
  }

  function payView(k, bill) {
    var p = PLANS.silver;   // the one paid plan
    if (S.guest) return guestUpsell('');
    if (typeof window.mpvOpenUnlock === 'function') { try { window.mpvOpenUnlock(p.n, bill); return; } catch (e) {} }   // activation form, opens with this plan selected
    card('<h1>Get ' + p.n + '</h1><p class="mpv-sub">' + p.n + ' plan · ' + p.p + '</p><p class="mpv-sub">Pay ' + p.p.replace(' per month', '') + ' per month in crypto, then send us your confirmation. After payment is confirmed, we send your invite code.</p>' +
      '<button class="mpv-btn" id="mpvMail">Request payment details</button><div class="mpv-links"><a id="mpvBk">Back</a></div>');
    $('mpvBk').onclick = function () { check(); };
    $('mpvMail').onclick = function () { location.href = 'mailto:' + SUPPORT + '?subject=' + enc('MarketPlusView ' + p.n + ' plan') + '&body=' + enc('Hello, I would like the ' + p.n + ' plan (' + p.p + '). My account email: ' + S.email); };
  }

  var LOGO_URL = 'https://res.cloudinary.com/wfypjzyt/image/upload/v1791143890/file_00000000b0e882118146e28bda6201fd.png?v=2';
  function openOv(html, cls) { ov.classList.remove('sp'); ov.style.display = 'block'; if (pill) pill.style.display = 'none'; ov.innerHTML = '<div class="mpv-wrap' + (cls ? ' ' + cls : '') + '">' + html + '</div>'; ov.scrollTop = 0; }
  function infoView(title, body) {
    openOv('<div class="mpv-card mpv-info"><h1>' + title + '</h1><div class="mpv-ib">' + body + '</div><button class="mpv-btn ghost" id="mpvBk">Back</button></div>', 'mpv-infow');
    $('mpvBk').onclick = function () { accountView(); };
  }
  function copyText(t, btn) {
    function done() { var o = btn.textContent; btn.textContent = 'Copied \u2713'; setTimeout(function () { btn.textContent = o; }, 1600); }
    function fb() { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} document.body.removeChild(ta); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fb); else fb();
  }
  function helpView() {
    openOv('<div class="mpv-card mpv-info"><h1>Help Center</h1>' +
      '<p>Our support team is happy to assist with sign-in problems, payments, activation codes and any other inquiries.</p>' +
      '<div class="k">Email</div><div class="mpv-ct"><b>' + SUPPORT + '</b><div class="mpv-cb"><a class="go" href="mailto:' + SUPPORT + '">Open</a><button type="button" id="mpvEc">Copy</button></div></div>' +
      '<div class="k">WhatsApp</div><div class="mpv-ct"><b>' + WA_SHOW + '</b><div class="mpv-cb"><a class="go" href="https://wa.me/' + WA_NUM + '" target="_blank" rel="noopener">Open</a><button type="button" id="mpvWc">Copy</button></div></div>' +
      '<button class="mpv-btn ghost" id="mpvBk">Back</button></div>', 'mpv-infow mpv-narrow');
    $('mpvEc').onclick = function () { copyText(SUPPORT, this); };
    $('mpvWc').onclick = function () { copyText(WA_SHOW, this); };
    $('mpvBk').onclick = function () { accountView(); };
  }
  var APP_VER = '1.0';
  function aboutView() {
    infoView('About us',
      '<p>MarketPlusView is a fast trading view tool that helps traders and investors analyse the market with live crypto charts, indicators, buy / sell signals, alerts and more. Our aim is to help you experience different markets.</p>' +
      '<div class="k">Version</div><p>' + APP_VER + '</p>' +
      '<div class="k">What you get</div><ul><li>Live crypto charts with many chart types and time frames</li><li>Indicators, strategies and drawing tools</li><li>BUY / SELL signals with stop loss and take-profit levels</li><li>Price alerts and push alerts</li><li>Watchlists, replay, scanner and trade calculator</li></ul>' +
      '<div class="k">Chief Executive Officer</div><p>' + BIZ.owner + '</p>' +
      '<div class="k">Registered under</div><p>' + BIZ.name + '</p>' +
      '<div class="k">Business No.</div><p>' + BIZ.no + '</p>' +
      '<div class="k">Location</div><p>' + BIZ.loc + '</p>' +
      '<div class="k">Please note</div><p>MarketPlusView provides trading analysis tools only. We are not a broker, we do not hold, manage or send money, and nothing here is financial advice. Trading involves risk; no tool guarantees profits. Signals are based on past prices and can be wrong.</p>' +
      '<div class="k">Data and credits</div><p>Market data comes from public exchange feeds and may be delayed or incorrect. Charts are drawn with TradingView Lightweight Charts (Apache 2.0, \u00a9 TradingView, Inc., tradingview.com). Some indicators are our own ports of open scripts by their authors, who keep their credit: for example MarkitTick, LuxAlgo and others named inside each tool\u2019s guide.</p>' +
      '<div class="k">Legal</div><p><a href="#" id="mpvAbT" style="color:#93b4ff">Terms and conditions</a> \u00b7 <a href="#" id="mpvAbP" style="color:#93b4ff">Privacy policy</a> \u00b7 <a href="#" id="mpvAbF" style="color:#93b4ff">Questions and answers</a></p>' +
      '<div class="k">Contact</div><p><a href="mailto:' + SUPPORT + '" style="color:#93b4ff">' + SUPPORT + '</a><br><a href="https://wa.me/' + WA_NUM + '" target="_blank" rel="noopener" style="color:#93b4ff">WhatsApp ' + WA_SHOW + '</a></p>');
    var t = $('mpvAbT'), p = $('mpvAbP'), f = $('mpvAbF');
    if (t) t.onclick = function (e) { e.preventDefault(); termsView(); };
    if (p) p.onclick = function (e) { e.preventDefault(); privacyView(); };
    if (f) f.onclick = function (e) { e.preventDefault(); faqView(); };
  }
  function ceoView() {
    infoView('Meet The C.E.O',
      '<div class="mpv-ceo"><div class="mpv-ceoh"><img class="ph" src="https://res.cloudinary.com/datfuxotx/image/upload/v1793259581/file_00000000712c8243b7da213b8c35d2fc_gauco9.png" alt="Reinhard Mugambi (Reinblacks)" loading="lazy"><h2>Meet the Founder \u2014 Reinhard Mugambi (Reinblacks)</h2></div><div class="mpv-ceob">' +
      '<p>Hello, my name is Reinhard Mugambi, popularly known as Reinblacks. I was born on 8 September 1996 in Nairobi, Kenya.</p>' +
      '<p>I am an AI Coding Engineer and Crypto Investor, the founder of \u201cMarketPlusView.com\u201d (<a href="https://marketplusview.com" target="_blank" rel="noopener">https://marketplusview.com</a>) and \u201cReinblacksCreativz.com\u201d (<a href="https://reinblackscreativz.com" target="_blank" rel="noopener">https://reinblackscreativz.com</a>), and the CEO of Reinblacks Digital.</p>' +
      '<p>I don\u2019t claim to know everything, and I don\u2019t believe perfection is a requirement for growth. I believe in learning through experience, exploring new possibilities, and continuously expanding my knowledge. One principle has always guided me: the more information you have, the more you can understand.</p>' +
      '<h3>My Vision for MarketPlusView</h3>' +
      '<p>The vision behind MarketPlusView.com is to help traders and investors see the financial markets from different perspectives, explore different analytical approaches, and develop a deeper understanding of market movements.</p>' +
      '<p>Think about it: a trader using Fibonacci retracement may interpret the market differently from someone relying on the 200 EMA. Another trader may focus on candlestick patterns, while someone else may study different timeframes. Their conclusions may differ because they are looking at the same market through different analytical lenses.</p>' +
      '<p>Beyond technical tools, information, experience, and mentality also influence how we interpret what we see.</p>' +
      '<p>The market may be the same, but the way we see it can make all the difference.</p>' +
      '<p>That is the idea behind MarketPlusView: to encourage broader perspectives, deeper analysis, and more informed decision-making.</p>' +
      '<h3>My Philosophy</h3>' +
      '<p>My goal is not to promise you profits or tell you that there is only one way to make money in the markets. Instead, my aim is to help you explore different approaches, understand how they work, and discover which methods may best suit your own trading or investment strategy.</p>' +
      '<p>I believe that knowledge should expand your perspective, not limit it. The more angles you explore, the better equipped you may become to evaluate opportunities, recognize risks, and make decisions for yourself.</p>' +
      '<p>Ultimately, the responsibility for every trading or investment decision remains yours. My mission is to help you see more, question more, and understand more.</p>' +
      '<h3>A Message to You</h3>' +
      '<p>Whether you are a beginner or an experienced trader or investor, I wish you success in your journey.</p>' +
      '<p>Keep learning. Keep exploring. Keep improving your understanding.</p>' +
      '<p>Never assume that what you see is everything there is to see. Sometimes, a different perspective can change the way you understand the entire market.</p>' +
      '<p>Your journey. Your strategy. Your perspective.</p>' +
      '<p>Wishing you all the best in your trading and investment journey.</p>' +
      '<p class="sig">Reinhard Mugambi (Reinblacks)<span>Founder of MarketPlusView.com</span><span>Founder of Reinblacks Creativz</span><span>CEO of Reinblacks Digital</span></p></div></div>');
  }
  function faqView() {
    var Q = [
      ['What is MarketPlusView?', 'A trading analysis app with live crypto charts, indicators, strategies, BUY / SELL signals, alerts and drawing tools. It is not a broker and you cannot trade or deposit money in it.'],
      ['Is it free?', 'Yes. The Free plan stays free, with no trial timer. New accounts also get one free 7-day Pro Plus Metal trial, no card needed. The paid plan, Pro Plus Metal, is USD 19 per month, paid in cryptocurrency. Yearly is USD 190 (2 months free).'],
      ['How do I pay and activate?', 'Open Subscription, tap Get Pro Plus Metal and pay in crypto. After the payment is confirmed we send you an invite code. Open Account, tap Enter a code and activate it. Payment is renewed manually each month with a new code.'],
      ['My payment is not confirmed yet', 'Crypto payments can take a few minutes. If it takes longer, send us the payment proof by email or WhatsApp from the Help Center.'],
      ['Are the signals advice? Do they repaint?', 'No, they are not financial advice. Strategy signals appear after the candle has closed and do not repaint, but they can still be wrong. Always use a stop loss and your own judgement.'],
      ['How do alerts work?', 'In-app alerts work while the app is open. Push alerts can reach you when the app is closed after you connect them in the alert settings. Some phones need battery saving turned off for the app.'],
      ['Which markets and time frames are supported?', 'Live crypto markets from public exchange feeds, from 1 minute up to weekly candles. Data can be delayed or incorrect at times.'],
      ['Is my data saved?', 'Your watchlists, drawings and settings are saved on your device. Your account email and plan are kept on our server so you can sign in. See the Privacy policy for details.'],
      ['I forgot my password', 'On the sign-in screen use the forgot password link, or contact support from the Help Center.'],
      ['I changed phone. How do I get my plan back?', 'Sign in with the same email and your plan comes back. Settings and drawings stored only on the old phone do not move automatically.'],
      ['Can I share my account or code?', 'No. A code and an account are for one person. Sharing or reselling can lead to access being removed.'],
      ['How do I delete my account?', 'Open Account, then Delete account, and send the request. We delete your account and data after checking it is you.'],
      ['How do I contact support?', 'Use the Help Center in Account: email ' + SUPPORT + ' or WhatsApp ' + WA_SHOW + '.']
    ];
    infoView('Questions and answers', Q.map(function (q) { return '<details><summary>' + q[0] + '</summary><p>' + q[1] + '</p></details>'; }).join(''));
  }
  function privacyView() {
    infoView('Privacy policy',
      '<p>This policy is a draft and will be updated. It explains what MarketPlusView collects and why.</p>' +
      '<div class="k">What we collect</div><ul><li>Your email address and password (the password is handled by our sign-in provider and is not readable by us)</li><li>Your plan, expiry date, trial status and the invite codes you use</li><li>If you turn on push alerts: a push subscription from your browser or phone, and the alert rules you set</li><li>Messages you send to support</li></ul>' +
      '<div class="k">Stored on your device</div><p>Watchlists, drawings, layouts, indicator settings and preferences are stored in your device storage. Clearing app data removes them.</p>' +
      '<div class="k">What we do not do</div><p>We do not sell your data, and we do not collect or store your exchange keys, wallet keys or card numbers. MarketPlusView cannot trade for you.</p>' +
      '<div class="k">Ads</div><p>Free plan and guest accounts may see sponsored banners and Pro Plus Metal invites while the charts are open. Pro Plus Metal members see no ads. A sponsored banner only takes you to the partner\u2019s site (for example Binance) when you tap it. We do not send that site your email or plan, and its own privacy policy applies once you leave.</p>' +
      '<div class="k">Third parties</div><p>Sign-in and account data are stored with our backend provider (Supabase). Crypto payments are made on the payment provider\u2019s own page. Market data is requested from public exchange feeds, which can see your device\u2019s IP address like any website. The chart library and some files load from public content networks.</p>' +
      '<div class="k">Keeping and deleting data</div><p>We keep your account data while your account exists. You can ask for it to be deleted at any time from Account, Delete account.</p>' +
      '<div class="k">Children</div><p>MarketPlusView is for adults. It is not meant for anyone under 18.</p>' +
      '<div class="k">Contact</div><p>' + contactsHtml() + '</p>');
  }
  function deleteView() {
    openOv('<div class="mpv-card mpv-info"><h1>Delete account</h1>' +
      '<p>This sends us a request to delete your account <b>' + esc(S.email) + '</b> and the data we hold for it (email, plan and codes). Any paid time left is lost and it cannot be undone.</p>' +
      '<p>We reply and complete the deletion after checking the request comes from you. Settings stored only on your device stay until you clear the app data.</p>' +
      '<button class="mpv-btn" id="mpvDel">Send deletion request</button><button class="mpv-btn ghost" id="mpvBk">Back</button></div>');
    $('mpvDel').onclick = function () { location.href = 'mailto:' + SUPPORT + '?subject=' + enc('MarketPlusView account deletion request') + '&body=' + enc('Please delete my MarketPlusView account and its data.\nAccount email: ' + S.email); };
    $('mpvBk').onclick = function () { accountView(); };
  }
  function termsView() {
    infoView('Terms and conditions',
      '<p>These terms are a draft and will be updated. By using MarketPlusView you agree to them.</p>' +
      '<div class="k">1. The service</div><p>MarketPlusView provides charting and trading analysis tools. We are not a broker, we do not hold, manage or send your money, and nothing in the app is financial advice. Trading involves risk and no tool guarantees profit. You are responsible for your own trading decisions.</p>' +
      '<div class="k">2. Accounts and invite codes</div><p>Access needs an account and an invite code. Your code is for you only. Sharing or reselling codes or accounts may lead to access being removed.</p>' +
      '<div class="k">3. Free trial</div><p>One free 7-day trial with full Pro Plus Metal access is allowed per person. No card is needed.</p>' +
      '<div class="k">4. Payments</div><p>The paid plan, Pro Plus Metal, costs USD 19 per month (USD 190 per year), paid in cryptocurrency only. Renewal is manual: you pay again and receive a new code each month. Crypto payments cannot normally be reversed, so contact support if something goes wrong with a payment.</p>' +
      '<div class="k">5. Availability</div><p>We work to keep the app available and the data accurate, but we cannot promise it is always uninterrupted or error free. Market data may be delayed or incorrect.</p>' +
      '<div class="k">6. Changes</div><p>We may change features, prices or these terms. Continued use means you accept the updated terms.</p>' +
      '<div class="k">7. Contact</div><p>' + contactsHtml() + '</p>');
  }
  function licenceView() {
    infoView('Licence',
      '<div class="k">Product</div><p>' + WM + '</p>' +
      '<div class="k">Business name</div><p>' + BIZ.name + '</p>' +
      '<div class="k">Business registration No.</div><p>' + BIZ.no + '</p>' +
      '<div class="k">Registered under</div><p>' + BIZ.owner + '</p>' +
      '<div class="k">Nature of business</div><p>' + BIZ.nature + '</p>' +
      '<div class="k">Registration date</div><p>' + BIZ.date + '</p>' +
      '<div class="k">Registered with</div><p>Business Registration Service (BRS), Republic of Kenya</p>' +
      '<div class="k">Location</div><p>' + BIZ.loc + '</p>' +
      '<div class="k">Please note</div><p>This is a business registration. MarketPlusView provides trading analysis software only. We are not a broker or a licensed financial adviser.</p>');
  }
  // Subscription: arranged like the TradingView plan screen - plan tabs, "Now" vs plan table, monthly / yearly price, Upgrade.
  // Plans: Free and Pro Plus Metal. Rows are [label, [Free, Pro Plus Metal], detail]; true = tick, false = cross, text = shown as is.
  var SP_ORDER = ['free', 'silver'];
  var SP_CHK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-label="Included"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var SP_NO = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.6" stroke-linecap="round" aria-label="Not included"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function spRows() { return tblRows(); }
  function plansView(selK, billK) {
    var days = S.exp ? Math.max(0, Math.ceil((S.exp - Date.now()) / 864e5)) : 0;
    var cur = S.admin ? 'silver' : (S.free ? 'free' : (tierOf(S.plan) || 'free')), curR = RANK[cur] || 0;
    var sel = 'silver', bill = billK || 'y', TK = ['silver'];
    var cell = function (v) { return v === true ? SP_CHK : v === false ? SP_NO : esc(String(v)); };
    var money = function (n) { return '$' + Number(n).toFixed(2); };
    var rowsH = spRows().map(function (r) {
      var v = r[1];
      return '<div class="sp-row"><div class="sp-r"><div class="sp-l">' + esc(r[0]) + '</div><div class="sp-c sp-now">' + cell(v[curR]) + '</div>' +
        TK.map(function (k, j) { return '<div class="sp-c pl pl-' + k + '">' + cell(v[j + 1]) + '</div>'; }).join('') +
        '<div class="sp-ch">\u203a</div></div><div class="sp-det">' + esc(r[2]) + '</div></div>';
    }).join('');
    var head = '<div class="sp-r sp-h"><div class="sp-l">FEATURES</div><div class="sp-c sp-now">Now</div>' +
      TK.map(function (k) { return '<div class="sp-c pl pl-' + k + '">' + PLANS[k].n + '</div>'; }).join('') + '<div class="sp-ch"></div></div>';
    var status = S.admin ? 'Full admin access' : (S.free ? 'Your plan: Free' : 'Your plan: ' + esc(planName(S.plan)) + ' \u00b7 ' + days + (days === 1 ? ' day' : ' days') + ' left');
    openOv(
      '<div class="sp-top"><button class="sp-bk" id="spBk" aria-label="Back"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button>' +
      '<img class="mpv-lg" src="' + LOGO_URL + '" alt=""><span class="sp-un">' + esc(shownName(S.email)) + '</span></div>' +
      '<div class="sp-st">' + status + '</div>' +
      '<div class="sp-card" id="spCard">' + head + rowsH + '</div>' +
      '<div class="sp-note">Pro Plus Metal is paid in crypto and renewed manually with a new invite code. The Free plan stays free.</div>' +
      '<div class="sp-foot"><button type="button" class="sp-pr" data-b="m"><span>Monthly</span><b id="spM"></b></button>' +
      '<div class="sp-yw"><button type="button" class="sp-pr" data-b="y"><span>Annually</span><b id="spY"></b></button><i class="sp-save" id="spS"></i></div>' +
      '<button type="button" class="sp-up" id="spUp"></button></div>', 'mpv-spw');
    ov.classList.add('sp');
    var im = ov.querySelector('.mpv-lg'); if (im) im.onerror = function () { this.style.display = 'none'; };
    function paint() {
      var pr = PRICE[sel], p = PLANS[sel], sr = RANK[sel], up = $('spUp');
      $('spCard').setAttribute('data-sel', sel);
      [].forEach.call(ov.querySelectorAll('#spTabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-k') === sel); });
      [].forEach.call(ov.querySelectorAll('.sp-pr'), function (b) { b.classList.toggle('on', b.getAttribute('data-b') === bill); });
      $('spM').innerHTML = money(pr[0]) + ' <small>/mo</small>';
      $('spY').innerHTML = money(pr[1]) + ' <small>/year</small>';
      $('spS').textContent = 'Save ' + money(pr[0] * 12 - pr[1]);
      up.disabled = false;
      if (S.admin) { up.textContent = 'Full admin access'; up.disabled = true; }
      else if (S.plan === 'trial') up.textContent = 'Get ' + p.n;
      else if (sr < curR) { up.textContent = 'Included in your plan'; up.disabled = true; }
      else if (sr === curR) up.textContent = S.plan === 'trial' ? 'Get ' + p.n : 'Renew ' + p.n;
      else up.textContent = 'Upgrade to ' + p.n;
    }
    [].forEach.call(ov.querySelectorAll('#spTabs button'), function (b) { b.onclick = function () { sel = b.getAttribute('data-k'); paint(); }; });
    [].forEach.call(ov.querySelectorAll('.sp-pr'), function (b) { b.onclick = function () { bill = b.getAttribute('data-b'); paint(); }; });
    [].forEach.call(ov.querySelectorAll('.sp-row'), function (r) { r.onclick = function () { r.classList.toggle('open'); }; });
    $('spUp').onclick = function () { if (!this.disabled) payView(sel, bill); };
    $('spBk').onclick = function () { accountView(); };
    paint();
  }
  function shownName(email) {
    var n = String(email || '').split('@')[0].replace(/[._\-]+/g, ' ').replace(/\d+$/, '').trim();
    n = n.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
    return n || 'Member';
  }

  function accountView(m, ok) {
    var days = S.exp ? Math.max(0, Math.ceil((S.exp - Date.now()) / 864e5)) : 0;
    if (S.guest) {
      card('<h1>Account</h1><p class="mpv-sub">Guest · ' + (S.free ? 'Free plan' : days + ' days left') + '</p><button class="mpv-btn" id="mpvGs">Sign in or create account</button><button class="mpv-btn ghost" id="mpvHp">Help Center</button><button class="mpv-btn ghost" id="mpvFq">Questions and answers</button><button class="mpv-btn ghost" id="mpvPv">Privacy policy</button><div class="mpv-links"><a id="mpvCl">Close</a></div>');
      $('mpvGs').onclick = function () { loginView('in'); }; $('mpvFq').onclick = faqView; $('mpvPv').onclick = privacyView; $('mpvHp').onclick = helpView; $('mpvCl').onclick = close; return;
    }
    var T = PLANS[tierOf(S.plan)], nm = shownName(S.email);
    var badge = S.admin ? 'ADMIN' : S.plan === 'trial' ? 'FREE TRIAL' : (T ? T.n.toUpperCase() : '');
    var stat = S.admin ? 'Full access' : S.free ? 'Free plan · open Subscription to upgrade' : (T ? T.n + ' access · ' : '') + days + (days === 1 ? ' day' : ' days') + ' left' + (S.exp ? ' · until ' + new Date(S.exp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
    var rows = [['pw', 'Change password'], ['help', 'Help Center'], ['faq', 'Questions and answers'], ['about', 'About'], ['ceo', 'Meet The C.E.O'], ['terms', 'Terms and conditions'], ['privacy', 'Privacy policy'], ['lic', 'Licence'], ['del', 'Delete account']];
    if (S.admin) rows.push(['admin', 'Admin page']);
    openOv(
      '<div class="mpv-top"><div class="mpv-brand"><img class="mpv-lg" src="' + LOGO_URL + '" alt=""><span>' + WM + '</span></div><button class="mpv-x" id="mpvCl" aria-label="Close">✕</button></div>' +
      '<div class="mpv-cols"><div class="mpv-c1">' +
      '<div class="mpv-card mpv-prof"><div class="mpv-av">' + esc(nm.charAt(0).toUpperCase()) + '</div><div class="mpv-who"><b>' + esc(nm) + '</b><span>' + esc(S.email) + '</span><i class="mpv-badge' + (S.admin ? ' red' : '') + '">' + badge + '</i></div></div>' +
      '<div class="mpv-stat">' + stat + '</div><div class="mpv-msg" id="mpvM"></div>' +
      '<div class="mpv-tiles"><button class="mpv-tile" data-go="plans"><span class="ic">★</span><b>Subscription</b><small>See plans and upgrade</small></button><button class="mpv-tile" data-go="code"><span class="ic">#</span><b>Enter a code</b><small>Activate or renew</small></button></div>' +
      '</div><div class="mpv-c2">' +
      '<div class="mpv-card mpv-list">' + rows.map(function (r) { return '<button class="mpv-item" data-go="' + r[0] + '">' + r[1] + '<span>›</span></button>'; }).join('') + '</div>' +
      '<div class="mpv-card mpv-list"><button class="mpv-item out" data-go="out">Sign out</button></div></div></div>', 'mpv-acct');
    var go = { plans: plansView, code: function () { codeView(S.email, '', true); }, pw: changePwView, help: helpView, faq: faqView, about: aboutView, ceo: ceoView, terms: termsView, privacy: privacyView, del: deleteView, lic: licenceView, admin: function () { location.href = 'admin.html'; }, out: signOut };
    [].forEach.call(ov.querySelectorAll('[data-go]'), function (b) { b.onclick = function () { go[b.getAttribute('data-go')](); }; });
    $('mpvCl').onclick = close; msg(m, ok);
    var im = ov.querySelector('.mpv-lg'); if (im) im.onerror = function () { this.style.display = 'none'; };
  }

  // three-lines menu button in the corner of the bottom toolbar, right after the fullscreen button
  function addMenuBtn() {
    if ($('mpvMenuBtn')) return;
    var f = $('bFull'); if (!f || !f.parentNode) return;
    var b = document.createElement('div');
    b.id = 'mpvMenuBtn'; b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0'); b.setAttribute('aria-label', 'Menu'); b.title = 'Menu';
    b.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
    b.onclick = function () { if (S.exp || S.admin) accountView(); };
    f.parentNode.insertBefore(b, f.nextSibling);
  }
  window.addEventListener('load', function () { try { addMenuBtn(); } catch (e) {} });

  function changePwView() {
    card('<h1>Change password</h1><p class="mpv-sub">Choose a new password (8+ characters).</p>' +
      '<input id="mpvP" type="password" autocomplete="new-password" placeholder="New password"><input id="mpvP2" type="password" autocomplete="new-password" placeholder="Repeat new password">' +
      '<div class="mpv-msg" id="mpvM"></div><button class="mpv-btn" id="mpvGo">Save password</button><div class="mpv-links"><a id="mpvBk">Back</a></div>');
    $('mpvBk').onclick = function () { accountView(); };
    $('mpvGo').onclick = async function () {
      var p = $('mpvP').value, b = $('mpvGo');
      if (p.length < 8) return msg('Use a password with at least 8 characters.');
      if (p !== $('mpvP2').value) return msg('The two passwords do not match.');
      busy(b, true); msg('');
      var r = await sb.auth.updateUser({ password: p });
      if (r.error) { msg(r.error.message); busy(b, false, 'Save password'); return; }
      accountView('Password changed.', true);
    };
  }

  function recoveryView() {
    card('<h1>New password</h1><p class="mpv-sub">Choose a new password for your account.</p><input id="mpvP" type="password" autocomplete="new-password" placeholder="New password (8+ characters)"><div class="mpv-msg" id="mpvM"></div><button class="mpv-btn" id="mpvGo">Save password</button>');
    $('mpvGo').onclick = async function () {
      var p = $('mpvP').value;
      if (p.length < 8) return msg('Use a password with at least 8 characters.');
      var r = await sb.auth.updateUser({ password: p });
      if (r.error) return msg(r.error.message);
      check();
    };
  }

  async function signOut() { try { SY.busy = false; await syPush(); } catch (e) {} SY.on = false; SY.uid = ''; try { await sb.auth.signOut(); } catch (e) {} try { localStorage.removeItem(LS); } catch (e) {} location.reload(); }


  // ================= cloud sync of chart drawings (per account) =================
  // Drawings live in localStorage as "mpDraw:<MARKET>". This keeps a copy of each one in the Supabase table
  // public.user_layouts (one row per user + market) so they follow the account to any device.
  var SY = { uid: '', on: false, q: {}, timer: 0, mute: false, lastPull: 0, busy: false };
  var SY_P = 'mpDraw:', SY_TS = 'mpDrawTs', SY_UID = 'mpDrawUid', SY_CH = 'rc_chart_v1';
  // synced keys: drawings per market + the chart analysis state (indicators, strategies, alerts). Symbol / timeframe / chart type stay per device.
  function syWatch(k) { return typeof k === 'string' && (k.indexOf(SY_P) === 0 || k === SY_CH); }
  function syShared(k, js) {
    if (k !== SY_CH) return js;
    try { var o = JSON.parse(js || 'null') || {}; return JSON.stringify({ inds: o.inds || [], strats: o.strats || [], alerts: (o.alerts || []).map(function (a) { var c = {}; for (var q in a) if (q !== 'fired' && q !== 'trig') c[q] = a[q]; return c; }) }); } catch (e) { return js; }
  }
  function syWhy(e) {
    var m = String((e && (e.message || e.code)) || e || ''), c = e && e.code;
    if (c === '42P01' || /user_layouts|schema cache|does not exist/i.test(m)) return 'Cloud sync not set up (table user_layouts missing)';
    if (c === '42501' || /row-level security|permission denied/i.test(m)) return 'Cloud sync blocked by permissions (RLS policy)';
    return '';
  }
  var _lsSet = Storage.prototype.setItem, _lsRem = Storage.prototype.removeItem, _lsGet = Storage.prototype.getItem;
  function syTsGet() { try { return JSON.parse(_lsGet.call(localStorage, SY_TS) || '{}') || {}; } catch (e) { return {}; } }
  function syTsSet(m) { try { _lsSet.call(localStorage, SY_TS, JSON.stringify(m)); } catch (e) {} }
  function syTouch(k) {
    var ts = syTsGet(); ts[k] = Date.now(); syTsSet(ts);
    if (!SY.on) return;                       // before the first merge only the timestamp is recorded
    SY.q[k] = 1; clearTimeout(SY.timer); SY.timer = setTimeout(syPush, 2500);
  }
  Storage.prototype.setItem = function (k, v) {
    _lsSet.apply(this, arguments);
    try { if (this === localStorage && !SY.mute && syWatch(k)) syTouch(k); } catch (e) {}
  };
  Storage.prototype.removeItem = function (k) {
    var had = false; try { had = this === localStorage && _lsGet.call(this, k) !== null; } catch (e) {}
    _lsRem.apply(this, arguments);
    try { if (had && !SY.mute && syWatch(k)) syTouch(k); } catch (e) {}
  };
  function syNote(t, bad) {
    try {
      var n = document.getElementById('mpv-sync');
      if (!n) { n = document.createElement('div'); n.id = 'mpv-sync'; n.style.cssText = 'position:fixed;left:10px;bottom:74px;z-index:2147483000;padding:4px 10px;border-radius:12px;font:600 11px system-ui,sans-serif;color:#fff;pointer-events:none;opacity:0;transition:opacity .3s'; root.appendChild(n); }
      n.textContent = t; n.style.background = bad ? 'rgba(200,60,60,.9)' : 'rgba(30,120,70,.9)'; n.style.opacity = '1';
      clearTimeout(n._t); n._t = setTimeout(function () { n.style.opacity = '0'; }, 2200);
    } catch (e) {}
  }
  function syLocalKeys() { var a = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (syWatch(k)) a.push(k); } return a; }
  async function syPush() {
    if (!SY.on || !SY.uid || SY.busy) return; var ks = Object.keys(SY.q); if (!ks.length) return;
    SY.busy = true; SY.q = {};
    try {
      var ts = syTsGet();
      var rows = ks.map(function (k) { return { user_id: SY.uid, k: k, v: _lsGet.call(localStorage, k), ts: ts[k] || Date.now() }; });
      var r = await sb.from('user_layouts').upsert(rows, { onConflict: 'user_id,k' });
      if (r.error) throw r.error;
      syNote('Analysis synced ✓');
    } catch (e) {
      var why = syWhy(e); if (why && !SY.warned) { SY.warned = 1; syNote(why, true); }
      ks.forEach(function (k) { SY.q[k] = 1; }); clearTimeout(SY.timer); SY.timer = setTimeout(syPush, 15000);
    }
    SY.busy = false;
  }
  async function syMerge() {
    var r = await sb.from('user_layouts').select('k,v,ts');
    if (r.error) throw r.error;
    r.data = (r.data || []).filter(function (x) { return syWatch(x.k); });
    var ts = syTsGet(), rem = {}, changed = false;
    (r.data || []).forEach(function (x) {
      rem[x.k] = 1; var cur = _lsGet.call(localStorage, x.k), lt = ts[x.k], rts = Number(x.ts) || 0;
      if (lt == null) {
        if (cur === null || x.k === SY_CH) { if (cur === null || syShared(x.k, cur) !== syShared(x.k, x.v)) { syApply(x, ts, rts); changed = true; } else ts[x.k] = rts; }   // new device: take the account copy
        else if (cur === x.v) { ts[x.k] = rts; }                                          // already identical
        else { ts[x.k] = Date.now(); SY.q[x.k] = 1; }                                     // local drawings never synced: keep them, upload
      } else if (rts > lt) { if (syShared(x.k, cur) !== syShared(x.k, x.v)) { syApply(x, ts, rts); changed = true; } else ts[x.k] = rts; }
      else if (lt > rts) { SY.q[x.k] = 1; }
    });
    syLocalKeys().forEach(function (k) { if (!rem[k]) { if (ts[k] == null) ts[k] = Date.now(); SY.q[k] = 1; } });
    syTsSet(ts);
    return changed;
  }
  function syApply(x, ts, rts) {
    var val = x.v;
    if (x.k === SY_CH && val != null) { try { var rv = JSON.parse(val), lv = JSON.parse(_lsGet.call(localStorage, SY_CH) || 'null'); if (lv) { ['sym', 'tf', 'lineMode', 'ctype', 'colOpen'].forEach(function (f) { if (f in lv) rv[f] = lv[f]; }); val = JSON.stringify(rv); } } catch (e) {} }
    SY.mute = true; try { if (val == null) _lsRem.call(localStorage, x.k); else _lsSet.call(localStorage, x.k, val); } catch (e) {} SY.mute = false;
    ts[x.k] = rts;
  }
  async function syncOn(force) {
    if (S.guest) return;
    if (SY.busy2) return; SY.busy2 = true;
    try {
      var sess = (await sb.auth.getSession()).data.session;
      if (!sess || sess.user.is_anonymous) return;
      var uid = sess.user.id;
      if (SY.uid && SY.uid !== uid) { SY.on = false; }
      if (!SY.uid || SY.uid !== uid) {
        var prev = _lsGet.call(localStorage, SY_UID);
        if (prev && prev !== uid) {                      // a different account signed in on this device: do not mix drawings
          SY.mute = true; syLocalKeys().forEach(function (k) { try { _lsRem.call(localStorage, k); } catch (e) {} }); try { _lsRem.call(localStorage, SY_TS); } catch (e) {} SY.mute = false;
          try { indexedDB.deleteDatabase('mpDraw'); } catch (e) {}
          SY.uid = uid; try { _lsSet.call(localStorage, SY_UID, uid); } catch (e) {}
          SY.on = true; location.reload(); return;
        }
        try { _lsSet.call(localStorage, SY_UID, uid); } catch (e) {}
        SY.uid = uid;
      }
      if (!force && SY.on && Date.now() - SY.lastPull < 20000) return;
      SY.lastPull = Date.now();
      var changed = await syMerge();
      SY.on = true;
      if (changed) { syNote('Your analysis was loaded from your account'); setTimeout(function () { location.reload(); }, 500); return; }
      SY.busy = false; await syPush();
    } catch (e) { var why = syWhy(e); if (why && !SY.warned) { SY.warned = 1; syNote(why, true); } /* offline or table not created yet: the app keeps working with local drawings */ }
    finally { SY.busy2 = false; }
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && SY.uid) syncOn(false); });
  window.addEventListener('pagehide', function () { try { if (SY.on && Object.keys(SY.q).length) syPush(); } catch (e) {} });

  // ---- Ads: Free plan and guests only (Pro Plus Metal, trial and admin never see them). Both ads repeat while the site stays open. ----
  var adStarted = false;
  function adBlocked() { return !!(S.admin || can('silver')); }
  function adBusy() { return !!(document.hidden || ov.style.display !== 'none' || document.getElementById('mpvAd') || document.getElementById('mpvPromo')); }
  // Calls show() after `first` ms, then every `every` ms. If another ad, the login screen or a hidden tab is in the way, it tries again in 15 s. show() returns false to stop the loop.
  function adLoop(first, every, show) {
    var tick = function () {
      if (adBlocked()) return setTimeout(tick, every);
      if (adBusy()) return setTimeout(tick, 15000);
      var r; try { r = show(); } catch (e) {}
      if (r !== false) setTimeout(tick, every);
    };
    setTimeout(tick, first);
  }
  function showAd() {
    if (adStarted) return;
    adStarted = true;
    try { SHOTS.forEach(function (x) { var im = new Image(); im.src = x[0]; }); } catch (e) {}   // preload so the 1-second slides never flash blank
    adLoop(AD.delay, AD.every, showBinance);
    adLoop(PROMO.first, PROMO.every, showPromo);
  }
  function showBinance() {
    if (!AD.url || !/^https:\/\//i.test(AD.url) || (AD.until && Date.now() > Date.parse(AD.until + 'T23:59:59'))) return false;   // campaign over: stop this loop
    try { if (Date.now() - (+localStorage.getItem('mpvAdAt') || 0) < AD.gap) return; } catch (e) {}
    try { localStorage.setItem('mpvAdAt', String(Date.now())); } catch (e) {}
    var d = document.createElement('div'), gone = 0;
    d.id = 'mpvAd';
    d.style.cssText = 'position:fixed;left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 76px);width:min(268px,calc(100vw - 20px));z-index:2147481000;overflow:hidden;border-radius:12px;background:rgba(12,18,34,.95);border:1px solid rgba(240,185,11,.5);box-shadow:0 10px 30px rgba(0,0,0,.5);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-family:Inter,system-ui,sans-serif;opacity:0;transition:opacity .3s';
    d.innerHTML = '<a href="' + esc(AD.url) + '" target="_blank" rel="noopener sponsored" style="display:flex;align-items:center;gap:8px;padding:8px 28px 6px 9px;color:#fff;text-decoration:none">' +
      (AD.img && /^https:\/\//i.test(AD.img) ? '<img src="' + esc(AD.img) + '" alt="" style="width:32px;height:32px;border-radius:8px;object-fit:contain;background:#0b0e11;flex:none">' : '') +
      '<span style="font-size:9px;font-weight:800;letter-spacing:.06em;padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.14);color:#cdd8f2">AD</span>' +
      '<span style="flex:1;min-width:0"><b style="display:block;font-size:12.5px;line-height:1.25">' + esc(AD.text) + '</b><small style="display:block;font-size:11px;line-height:1.3;color:#aebbd8">' + esc(AD.sub) + '</small></span>' +
      '</a>' +
      '<button id="mpvAdUp" style="display:block;width:100%;border:0;border-top:1px solid rgba(255,255,255,.1);background:transparent;color:#93b4ff;font:600 11px Inter,system-ui,sans-serif;padding:6px 9px 9px;cursor:pointer;text-align:left">Go ad-free \u00b7 Upgrade to ' + PLANS.silver.n + ' \u203a</button>' +
      '<button id="mpvAdX" aria-label="Close ad" style="position:absolute;top:2px;right:2px;width:26px;height:26px;border:0;border-radius:13px;background:transparent;color:#aebbd8;font-size:13px;cursor:pointer">\u2715</button>' +
      '<i style="position:absolute;left:0;bottom:0;height:3px;background:#f0b90b;width:100%;animation:mpvAdBar ' + (AD.ms / 1000) + 's linear forwards"></i>';
    root.appendChild(d);
    var off = function () { if (gone) return; gone = 1; d.style.opacity = '0'; setTimeout(function () { d.remove(); }, 350); };
    d.querySelector('#mpvAdX').onclick = off;
    d.querySelector('#mpvAdUp').onclick = function () { off(); payView('silver'); };
    setTimeout(function () { d.style.opacity = '1'; }, 20);
    setTimeout(off, AD.ms);
  }
  // Pro Plus Metal invite: the gallery pictures slide every PROMO.slide ms, an Upgrade button opens the payment screen.
  function showPromo() {
    var T = PLANS.silver, d = document.createElement('div'), gone = 0, i = 0, tm = 0;
    d.id = 'mpvPromo';
    d.style.cssText = 'position:fixed;left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 76px);width:min(236px,calc(100vw - 20px));z-index:2147481000;overflow:hidden;border-radius:12px;background:rgba(12,18,34,.96);border:1px solid rgba(96,165,250,.55);box-shadow:0 14px 40px rgba(0,0,0,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-family:Inter,system-ui,sans-serif;color:#fff;opacity:0;transition:opacity .3s';
    var imgs = SHOTS.map(function (x, k) { return '<img src="' + x[0] + '" alt="' + esc(x[1]) + '" onerror="this.remove()" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:' + (k ? 0 : 1) + ';transition:opacity .35s">'; }).join('');
    d.innerHTML = '<div id="mpvPromoGo" style="position:relative;width:100%;aspect-ratio:1570/720;background:#0a0e1a;cursor:pointer;overflow:hidden">' + imgs +
      '<span id="mpvPromoCap" style="position:absolute;left:0;right:0;bottom:0;padding:14px 8px 5px;font-size:11px;font-weight:700;line-height:1.2;background:linear-gradient(transparent,rgba(0,0,0,.75))">' + esc(SHOTS[0][1]) + '</span></div>' +
      '<button id="mpvPromoX" aria-label="Close" style="position:absolute;top:4px;right:4px;width:24px;height:24px;border:0;border-radius:12px;background:rgba(0,0,0,.55);color:#fff;font-size:12px;cursor:pointer">\u2715</button>' +
      '<div style="padding:8px 10px 12px"><span style="font-size:9px;font-weight:800;letter-spacing:.06em;padding:1px 6px;border-radius:5px;background:rgba(96,165,250,.18);color:#93b4ff">' + esc(T.n.toUpperCase()) + '</span>' +
      '<b style="display:block;font-size:13px;margin-top:5px">Join ' + esc(T.n) + '</b>' +
      '<small style="display:block;font-size:11px;line-height:1.4;color:#b7c4e2;margin-top:2px">Every tool, strategy and chart type, buy / sell push signals, no ads. $' + PRICE.silver[0] + ' per month.</small>' +
      '<button id="mpvPromoUp" style="display:block;width:100%;margin-top:8px;padding:8px;border:0;border-radius:9px;background:#2563eb;color:#fff;font:700 12px Inter,system-ui,sans-serif;cursor:pointer">Upgrade to ' + esc(T.n) + '</button></div>' +
      '<i style="position:absolute;left:0;bottom:0;height:3px;background:#60a5fa;width:100%;animation:mpvAdBar ' + (PROMO.ms / 1000) + 's linear forwards"></i>';
    root.appendChild(d);
    var off = function () { if (gone) return; gone = 1; clearInterval(tm); d.style.opacity = '0'; setTimeout(function () { d.remove(); }, 350); };
    var up = function () { off(); payView('silver'); };
    d.querySelector('#mpvPromoX').onclick = off;
    d.querySelector('#mpvPromoUp').onclick = up;
    d.querySelector('#mpvPromoGo').onclick = up;
    tm = setInterval(function () {
      var els = d.querySelectorAll('#mpvPromoGo img'); if (els.length < 2) return;
      els[i % els.length].style.opacity = '0'; i = (i + 1) % els.length;
      els[i].style.opacity = '1'; d.querySelector('#mpvPromoCap').textContent = els[i].alt;
    }, PROMO.slide);
    setTimeout(function () { d.style.opacity = '1'; }, 20);
    setTimeout(off, PROMO.ms);
  }
  function unlock(exp, admin, free) {
    S.exp = exp; S.admin = !!admin; S.free = !!free;
    ov.style.display = 'none';
    if (!pill) { pill = document.createElement('div'); pill.id = 'mpv-pill'; pill.onclick = function () { accountView(); }; root.appendChild(pill); }
    pill.style.display = 'block';
    try { addMenuBtn(); } catch (e) {}
    pill.textContent = admin ? 'Admin' : free ? (S.guest ? 'Guest' : 'Free') : Math.max(0, Math.ceil((exp - Date.now()) / 864e5)) + 'd left';
    clearInterval(timer);
    timer = S.guest ? 0 : setInterval(function () { if (ov.style.display === 'none') check(); }, 60000);
    try { if (!admin && tierOf(S.plan) !== 'silver' && window.mpvRecheckStrats) window.mpvRecheckStrats(); } catch (e) {}
    try { if (!admin && window.mpvRecheckInds) window.mpvRecheckInds(); } catch (e) {}   // hide indicators and chart types the plan does not include
    try { syncOn(false); } catch (e) {}   // drop any strategy the plan does not include
    try { if (!S.guest && !admin && localStorage.getItem(PAYFLAG)) { localStorage.removeItem(PAYFLAG); if (!can('silver')) setTimeout(function () { payView('silver'); }, 500); } } catch (e) {}   // a guest who logged in to pay lands on the payment form
    try { showAd(); } catch (e) {}
  }

    async function check() {
    var sess = (await sb.auth.getSession()).data.session;
    if (!sess) { if (getMode() === 'guest') return (S.guest && S.exp) ? undefined : startGuest(); return getMode() === 'email' ? loginView('in') : loginView('up'); }
    if (/access_token|[?&]code=|error_description/.test(location.hash + location.search)) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
    S.guest = !!sess.user.is_anonymous; S.email = sess.user.email || ''; setMode(S.guest ? 'guest' : 'email');
    try {
      var a = await sb.rpc('is_admin');
      if (a.error) throw a.error;
      if (a.data === true) return unlock(null, true);
      var r = await sb.from('memberships').select('expires_at,plan,trial_used').eq('user_id', sess.user.id).maybeSingle();
      if (r.error) throw r.error;
      S.trialUsed = !!(r.data && r.data.trial_used); S.plan = r.data ? r.data.plan : '';
      if (!r.data && !triedTrial) {
        triedTrial = true;
        var t = await sb.rpc('start_trial');
        if (t.error) { S.plan = 'free'; return unlock(new Date(Date.now() + 3650 * 864e5), false, true); }
        return check();
      }
      if (r.data && new Date(r.data.expires_at) > new Date()) {
        try { localStorage.setItem(LS, JSON.stringify({ uid: sess.user.id, exp: new Date(r.data.expires_at).getTime() })); } catch (e) {}
        return unlock(new Date(r.data.expires_at));
      }
      try { localStorage.removeItem(LS); } catch (e) {}
      // No active plan (new account, trial over or plan ended): keep the app open on the Free plan instead of locking it.
      S.plan = 'free';
      return unlock(new Date(Date.now() + 3650 * 864e5), false, true);
    } catch (e) {
      var c = null; try { c = JSON.parse(localStorage.getItem(LS)); } catch (x) {}
      if (c && c.uid === sess.user.id && c.exp > Date.now()) return unlock(new Date(c.exp)); // offline: use last known access
      card('<h1>Can\'t connect</h1><p class="mpv-sub">Check your internet connection and try again.</p><button class="mpv-btn" id="mpvGo">Try again</button>');
      $('mpvGo').onclick = check;
    }
  }

  // Locked tools show an upgrade prompt instead of opening. Each entry needs the tier 'silver' (= Pro Plus Metal, the one paid plan).
  // (Strategies are locked inside index.html through mpvAuth.lockStrat; the buttons below are matched by id or by their text.)
  var LOCK_IDS = {};   // buttons locked by id, e.g. bBook: ['The order book', 'silver']. Empty: order book and position calculator are free for every plan
  var LOCK_TXT = [];   // Bar replay, Compare, Long / Short, Second chart and Backup are Free on the new plans. To lock one again add [text on the button, name shown, tier], e.g. ['Bar replay', 'Bar replay', 'silver']
  // ---- Guest mode: no account, Free tools only. Pro tools ask the guest to log in (then pay). ----
  var PAYFLAG = 'mpvPayAfter';
  function startGuest() { S.guest = true; S.email = ''; S.plan = 'free'; S.admin = false; unlock(new Date(Date.now() + 3650 * 864e5), false, true); }
  function guestGo() { setMode('guest'); try { localStorage.removeItem(PAYFLAG); } catch (e) {} startGuest(); }
  function guestUpsell(name) {
    if (document.getElementById('mpvGuestUp')) return;
    var T = PLANS.silver, d = document.createElement('div'), what = name ? esc(name) + ' is a ' + T.n + ' tool' : T.n + ' tools are paid';
    d.id = 'mpvGuestUp';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(5,10,24,.7);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);font-family:Inter,system-ui,sans-serif;color:#fff';
    d.innerHTML = '<div class="mpv-card" style="width:min(100%,360px);text-align:center"><h1 style="margin:0 0 8px;font-size:22px">Log in to continue</h1><p class="mpv-sub">' + what + ' (' + T.p + '). Create a free account or sign in, then complete your payment to unlock it.</p><button class="mpv-btn" id="mpvGUp">Create account</button><button class="mpv-btn ghost" id="mpvGIn">I already have an account</button><button class="mpv-btn ghost" id="mpvGNo">Keep using free tools</button></div>';
    root.appendChild(d);
    var go = function (m) { d.remove(); try { localStorage.setItem(PAYFLAG, '1'); } catch (e) {} loginView(m); };
    d.querySelector('#mpvGNo').onclick = function () { d.remove(); };
    d.querySelector('#mpvGUp').onclick = function () { go('up'); };
    d.querySelector('#mpvGIn').onclick = function () { go('in'); };
  }
  function upsell(name, need) {
    if (S.guest) return guestUpsell(name);
    var T = PLANS.silver, d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(5,10,24,.7);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);font-family:Inter,system-ui,sans-serif;color:#fff';
    d.innerHTML = '<div class="mpv-card" style="width:min(100%,360px);text-align:center"><h1 style="margin:0 0 8px;font-size:22px">' + T.n + ' feature</h1><p class="mpv-sub">' + esc(name) + ' is included in the ' + T.n + ' plan (' + T.p + ').</p><button class="mpv-btn" id="mpvUp">Upgrade to ' + T.n + '</button><button class="mpv-btn ghost" id="mpvNo">Not now</button></div>';
    root.appendChild(d);
    d.querySelector('#mpvNo').onclick = function () { d.remove(); };
    d.querySelector('#mpvUp').onclick = function () { d.remove(); payView('silver'); };
  }
  // true when this user's plan does not include strategy k (shows the upgrade prompt unless silent)
  function lockStrat(k, silent, label) {
    if ((UNLOCK_ALL_TOOLS && !S.guest) || S.admin || !S.exp) return false;
    var need = stratTier(k);
    if (can(need)) return false;
    if (!silent) upsell(label || 'This strategy', need);
    return true;
  }
  // true when this user's plan does not include indicator k (shows the upgrade prompt unless silent)
  function lockInd(k, silent, label) {
    if ((UNLOCK_ALL_TOOLS && !S.guest) || S.admin || !S.exp) return false;
    var need = indTier(k);
    if (can(need)) return false;
    if (!silent) upsell(label || 'This indicator', need);
    return true;
  }
  // true when this user's plan does not include chart type t
  function lockChart(t, silent) {
    if (S.admin || !S.exp || SILVER_CHARTS.indexOf(t) < 0 || can('silver')) return false;
    if (!silent) upsell(CHART_NAMES[t] || 'This chart type', 'silver');
    return true;
  }
  document.addEventListener('click', function (e) {
    if (S.admin || !S.exp || ov.style.display !== 'none') return;
    var t = e.target, el = t && t.closest ? (t.closest('button') || t) : null, name = null, need = null;
    if (!el) return;
    if (LOCK_IDS[el.id]) { name = LOCK_IDS[el.id][0]; need = LOCK_IDS[el.id][1]; }
    else { var tx = (el.textContent || '').trim(); if (tx.length < 90) LOCK_TXT.forEach(function (x) { if (tx.indexOf(x[0]) > -1) { name = x[1]; need = x[2]; } }); }
    if (name && !can(need)) { e.stopPropagation(); e.preventDefault(); upsell(name, need); }
  }, true);

  function start() {
    sb = window.supabase.createClient(SB_URL, SB_KEY);
    window.mpvAuth = { signOut: signOut, recheck: check, state: S, can: can, lockStrat: lockStrat, lockInd: lockInd, lockChart: lockChart, needLogin: guestUpsell, badge: badgeOf, tierName: tierName, prices: PRICE, token: async function () { var r = (await sb.auth.getSession()).data.session; return r ? r.access_token : ''; } };   // S.plan is 'free', 'trial', or a paid key ('silver' = Pro Plus Metal; old 'gold', 'metal', 'starter', 'pro' all count as Pro Plus Metal)
    sb.auth.onAuthStateChange(function (ev) {
      if (ev === 'PASSWORD_RECOVERY') recoveryView();
      else if (ev === 'SIGNED_OUT') (getMode() === 'email' ? loginView('in') : loginView('up'));
    });
    check();
  }

  var SRC = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js', 'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'];
  (function load(i) {
    if (i >= SRC.length) { ov.innerHTML = '<div class="mpv-wrap"><div class="mpv-card"><h1>Can\'t load</h1><p class="mpv-sub">Turn off data saver or your ad blocker, then reload.</p></div></div>'; return; }
    var s = document.createElement('script'); s.src = SRC[i]; s.onload = start; s.onerror = function () { load(i + 1); };
    (document.head || root).appendChild(s);
  })(0);
})();

  
