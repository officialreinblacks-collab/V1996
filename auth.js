/* MarketPlusView access gate v2. Add <script src="auth.js"></script> inside <head> of index.html. */
(function () {
  var SB_URL = 'https://ssukfrvtknfsccqxqkjh.supabase.co';
  var SB_KEY = 'sb_publishable_qjmaCvag0XhnMlipWFHCeA_fwt3CqST';
  var SUPPORT = 'marketplusview@gmail.com';            // support email shown to clients
  // NOWPayments (crypto) pay links, one per plan. Leave a plan empty until its own NOWPayments invoice exists.
  var NOWPAY = { silver: 'https://nowpayments.io/payment/?iid=4645727622&source=button', gold: 'https://nowpayments.io/payment/?iid=4317860823&source=button', metal: 'https://nowpayments.io/payment/?iid=5561351398&source=button' };
  window.mpvPayLinks = NOWPAY;   // the activation form in index.html reads the same links
  var NOW_IMG = 'https://nowpayments.io/images/embeds/payments-button-white.svg';
  var PAY = { silver: '', gold: '', metal: '' };                   // paste your card payment link (e.g. Stripe Payment Link) for each plan
  var LS = 'mpvAccess', root = document.documentElement, sb, pill, timer;
  var S = { email: '', plan: '', exp: null, admin: false, trialUsed: false, guest: false }, triedTrial = false;
  var getMode = function () { try { return localStorage.getItem('mpvMode'); } catch (e) { return null; } };
  var setMode = function (m) { try { localStorage.setItem('mpvMode', m); } catch (e) {} };
  var PLANS = {
    silver: { n: 'Silver', p: '$20 per month', t: 'For beginners and budget-conscious traders', d: ['Live charts and standard indicators', 'Drawing tools, price alerts and watchlist', 'Limited premium tools: Supply Demand Legs & Entry Zones', 'Limited strategies: selected buy / sell strategies', 'Order book, position size calculator and market mood', '7-day free trial (one per person)'] },
    gold: { n: 'Gold', p: '$40 per month', t: 'For active traders who need more analysis tools', d: ['Everything in Silver', 'Selected premium tools: Reversal Probability Profile', 'More buy / sell signal strategies', 'Bar replay', 'Compare markets'] },
    metal: { n: 'Metal', p: '$80 per month', t: 'For serious traders who want the full toolkit', d: ['Everything in Gold', 'All premium tools and strategies', 'Second chart', 'Backups', 'Exclusive Metal-only tools and future premium releases', 'Priority support', 'AI market analysis when launched'] }
  };
  // Plan names stored in Supabase -> tier. The free trial is Silver access. Old plans: starter = Silver, pro = Metal (so nobody loses access).
  var ALIAS = { trial: 'silver', starter: 'silver', silver: 'silver', gold: 'gold', pro: 'metal', metal: 'metal' };
  var RANK = { silver: 1, gold: 2, metal: 3 };
  var tierOf = function (plan) { return ALIAS[plan] || ''; };
  var planName = function (plan) { return plan === 'trial' ? 'Free trial (Silver)' : (PLANS[tierOf(plan)] ? PLANS[tierOf(plan)].n : ''); };
  var can = function (need) { return !!(S.admin || (S.exp && +S.exp > Date.now() && RANK[tierOf(S.plan)] >= RANK[need])); };
  // EDIT THESE: which strategies / premium tools belong to which tier. Anything not listed here is Metal-only.
  var SILVER_STRATS = ['sdx', 'ccz', 'tts', 'sbk'];
  var GOLD_STRATS = ['rvp', 'pgs', 'bbs', 'hrm', 'lpo', 'ssm', 'po3', 'fpc'];   // Gold also gets all of Silver's
  var stratTier = function (k) { return SILVER_STRATS.indexOf(k) > -1 ? 'silver' : GOLD_STRATS.indexOf(k) > -1 ? 'gold' : 'metal'; };

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
    '.mpv-logo{font-weight:800;font-size:17px;margin-bottom:16px;letter-spacing:-.01em}' +
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
    '#mpvChat{position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);z-index:5;display:flex;align-items:center;gap:6px;border:0;border-radius:999px;padding:11px 16px;font-size:14px;font-weight:700;color:#fff;background:linear-gradient(135deg,#ef4444,#b91c1c);box-shadow:0 6px 18px rgba(239,68,68,.45);cursor:pointer}' +
    '.mpv-or{text-align:center;color:#7f8fb3;font-size:13px;margin:12px 0 2px}.mpv-plans{display:grid;gap:12px}.mpv-pay{text-align:center;color:#aebbd8;font-size:13px}' +
    '.mpv-about{font-size:15px;line-height:1.55;color:#dbe4f7;text-align:center;margin:4px 4px 0}' +
    '.mpv-legal{font-size:12.5px;line-height:1.5;color:#8d9bbd;text-align:center;margin:0 6px}' +
    '#mpv-pill{position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);right:8px;z-index:9998;background:rgba(10,20,50,.75);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#dbe4f7;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:4px 10px;font:600 12px Inter,system-ui,sans-serif}';
  st.textContent +=
    '.mpv-now{display:block;margin-top:8px;text-align:center}.mpv-now img{display:inline-block;max-width:100%;height:auto;border-radius:12px}' +
    '.mpv-top{display:flex;align-items:center;justify-content:space-between}' +
    '.mpv-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px;letter-spacing:-.01em}' +
    '.mpv-lg{width:34px;height:34px;border-radius:9px;object-fit:contain;background:#0b1224;border:1px solid rgba(255,255,255,.18)}' +
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
    '.mpv-info .k{color:#93b4ff;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin:14px 0 2px}' +
    '#bar #mpvMenuBtn{flex:none;order:200;position:sticky;right:0;z-index:5;box-sizing:border-box;width:40px;min-width:40px;height:36px;display:flex;align-items:center;justify-content:center;background:var(--bg,#0b0e14);color:#c9d0e0;box-shadow:-10px 0 8px var(--bg,#0b0e14);cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '#bar #mpvMenuBtn:active{color:#fff}#bar #bFull{right:40px!important}';
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
    '@media (min-width:1180px){.mpv-wide .mpv-colb .mpv-plans{grid-template-columns:repeat(3,minmax(0,1fr))}.mpv-wide .mpv-plan{display:flex;flex-direction:column}.mpv-wide .mpv-plan .li{flex:none}}' +
    '@media (min-width:900px) and (max-height:700px){.mpv-wide .mpv-cola{position:static}.mpv-acct .mpv-c2{position:static}}';
  (document.head || root).appendChild(st);
  try { var pl = document.createElement('link'); pl.rel = 'preload'; pl.as = 'image'; pl.href = 'https://res.cloudinary.com/wfypjzyt/image/upload/v1791143890/file_00000000b0e882118146e28bda6201fd.png?v=2'; (document.head || root).appendChild(pl); } catch (e) {}

  var ov = document.createElement('div');
  ov.id = 'mpv-auth';
  ov.innerHTML = '<div class="mpv-wrap"><div class="mpv-card mpv-ld"><div class="mpv-ldlogo"><img src="https://res.cloudinary.com/wfypjzyt/image/upload/v1791143890/file_00000000b0e882118146e28bda6201fd.png?v=2" alt="" onerror="this.parentNode.innerHTML=\'Market<span style=&quot;color:#ef4444&quot;>Plus</span><span style=&quot;color:#60a5fa&quot;>View</span>\'"></div><div class="mpv-ring"><i></i><i></i></div><p class="mpv-ldtxt">Loading your charts<span class="mpv-dots"><b>.</b><b>.</b><b>.</b></span></p><div class="mpv-bar"><i></i></div></div></div>';
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
  var BRAND = '<div class="mpv-logo">Market<span style="color:#ef4444">Plus</span><span style="color:#60a5fa">View</span></div>';

  function plansHtml(buy) {
    var h = '<div class="mpv-plans">';
    ['silver', 'gold', 'metal'].forEach(function (k) {
      var p = PLANS[k];
      h += '<div class="mpv-plan ' + k + '"><div class="top"><b>' + p.n + '</b><span>' + p.p + '</span></div><div class="mpv-sub" style="margin:0 0 6px;font-size:13px">' + p.t + '</div>' + p.d.map(function (x) { return '<div class="li">✓ ' + x + '</div>'; }).join('');
      if (buy && k === 'silver' && !S.trialUsed) h += '<button class="mpv-btn" id="mpvTr">Get your free trial code</button>';
      if (buy && NOWPAY[k]) h += '<a class="mpv-now" href="' + NOWPAY[k] + '" target="_blank" rel="noreferrer noopener"><img src="' + NOW_IMG + '" alt="Cryptocurrency &amp; Bitcoin payment button by NOWPayments"></a><button class="mpv-btn ghost pay" data-plan="' + k + '">Already paid? Get your code</button>';
      else if (buy) h += '<button class="mpv-btn blue pay" data-plan="' + k + '">Get ' + p.n + '</button>';
      h += '</div>';
    });
    return h + '</div><div class="mpv-pay">One free 7-day Silver trial per person.<br>Gold and Metal require a paid subscription.<br>Payments are currently accepted in cryptocurrency only, processed securely by NOWPayments.</div>';
  }
  function extraParts(buy) {
    return {
      about: '<p class="mpv-about">A fast trading view tool that helps traders and investors analyse the market with live crypto charts, indicators, buy / sell signals, alerts and more.</p>',
      plans: plansHtml(buy),
      legal: '<p class="mpv-legal">MarketPlusView provides trading analysis tools only. We are not a broker, we do not hold, manage or send money, and nothing here is financial advice. Trading involves risk; no tool guarantees profits. Our aim is to help you experience different markets.</p>' +
        '<p class="mpv-legal">Need help? <a href="mailto:' + SUPPORT + '">' + SUPPORT + '</a></p>'
    };
  }
  function card(inner, more, buy) {
    ov.style.display = 'block'; if (pill) pill.style.display = 'none';
    if (more) {
      var x = extraParts(buy);
      ov.innerHTML = '<div class="mpv-wrap mpv-wide"><div class="mpv-cola"><div class="mpv-card">' + BRAND + inner + '</div>' + x.about + '</div><div class="mpv-colb">' + x.plans + '</div><div class="mpv-foot">' + x.legal + '</div></div>';
    } else {
      ov.innerHTML = '<div class="mpv-wrap"><div class="mpv-card">' + BRAND + inner + '</div></div>';
    }
    ov.scrollTop = 0;
    if (more) {
      var hb = document.createElement('button'); hb.type = 'button'; hb.id = 'mpvChat';
      hb.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="13" width="4" height="6" rx="1.5"/><rect x="17.5" y="13" width="4" height="6" rx="1.5"/><path d="M19.5 19c0 1.7-1.6 2.5-4.5 2.5h-1.5"/></svg>Need help?';
      hb.onclick = function () {
        function go() { try { tidioChatApi.show(); tidioChatApi.open(); } catch (e) {} }
        if (window.tidioChatApi) go(); else location.href = 'mailto:' + SUPPORT;
      };
      ov.appendChild(hb);
    }
    document.querySelectorAll('.pay').forEach(function (b) { b.onclick = function () { payView(b.dataset.plan); }; });
    if ($('mpvTr')) $('mpvTr').onclick = function () { location.href = 'mailto:' + SUPPORT + '?subject=' + enc('Free 7-day trial code') + '&body=' + enc('Hello, please send me my free 7-day trial code. My account email: ' + S.email); };
  }
  function msg(t, ok) { var m = $('mpvM'); if (m) { m.textContent = t || ''; m.className = 'mpv-msg' + (ok ? ' ok' : ''); } }
  function busy(b, on, label) { b.disabled = on; b.textContent = on ? 'Please wait…' : label; }
  function close() { ov.style.display = 'none'; if (pill) pill.style.display = 'block'; }

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
    card('<h1>' + label + '</h1><p class="mpv-sub">' + (up ? 'Create your account, then start your free 7-day trial.' : 'Sign in with your email to open the charts.') + '</p>' +
      '<input id="mpvE" type="email" inputmode="email" autocomplete="email" placeholder="Email">' +
      '<input id="mpvP" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" placeholder="Password' + (up ? ' (8+ characters)' : '') + '">' +
      '<div class="mpv-msg" id="mpvM"></div><button class="mpv-btn" id="mpvGo">' + label + '</button>' + GOOGLE_BTN +
      '<div class="mpv-links"><a id="mpvSw">' + (up ? 'I already have an account' : 'Create an account') + '</a>' + (up ? '' : '<a id="mpvFg">Forgot password</a>') + '</div>', true, false);
    if (!m && URLERR) { m = URLERR; ok = false; URLERR = ''; }
    msg(m, ok);
    $('mpvGg').onclick = googleGo;
    $('mpvSw').onclick = function () { loginView(up ? 'in' : 'up'); };
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

  function payView(k) {
    var p = PLANS[k], url = PAY[k];
    if (url) { location.href = url + (url.indexOf('?') < 0 ? '?' : '&') + 'prefilled_email=' + enc(S.email); return; }
    if (typeof window.mpvOpenUnlock === 'function') { try { window.mpvOpenUnlock(p.n); return; } catch (e) {} }   // activation form, opens with this plan selected
    card('<h1>Get ' + p.n + '</h1><p class="mpv-sub">' + p.n + ' plan · ' + p.p + '</p><p class="mpv-sub">We will email you the payment details. After payment is confirmed, we send your access code.</p>' +
      '<button class="mpv-btn" id="mpvMail">Request payment details</button><div class="mpv-links"><a id="mpvBk">Back</a></div>');
    $('mpvBk').onclick = function () { check(); };
    $('mpvMail').onclick = function () { location.href = 'mailto:' + SUPPORT + '?subject=' + enc('MarketPlusView ' + p.n + ' plan') + '&body=' + enc('Hello, I would like the ' + p.n + ' plan (' + p.p + '). My account email: ' + S.email); };
  }

  var LOGO_URL = 'https://res.cloudinary.com/wfypjzyt/image/upload/v1791143890/file_00000000b0e882118146e28bda6201fd.png?v=2';
  function openOv(html, cls) { ov.style.display = 'block'; if (pill) pill.style.display = 'none'; ov.innerHTML = '<div class="mpv-wrap' + (cls ? ' ' + cls : '') + '">' + html + '</div>'; ov.scrollTop = 0; }
  function infoView(title, body) {
    openOv('<div class="mpv-card mpv-info"><h1>' + title + '</h1>' + body + '<button class="mpv-btn ghost" id="mpvBk">Back</button></div>');
    $('mpvBk').onclick = function () { accountView(); };
  }
  function aboutView() {
    infoView('About us',
      '<p>MarketPlusView is a fast trading view tool that helps traders and investors analyse the market with live crypto charts, indicators, buy / sell signals, alerts and more. Our aim is to help you experience different markets.</p>' +
      '<div class="k">Chief Executive Officer</div><p>Reinhard Mugambi</p>' +
      '<div class="k">Registered under</div><p>Reinblacks Limited Dev</p>' +
      '<div class="k">Please note</div><p>MarketPlusView provides trading analysis tools only. We are not a broker, we do not hold, manage or send money, and nothing here is financial advice. Trading involves risk; no tool guarantees profits.</p>' +
      '<div class="k">Contact</div><p><a href="mailto:' + SUPPORT + '" style="color:#93b4ff">' + SUPPORT + '</a></p>');
  }
  function termsView() { infoView('Terms and conditions', '<p>We will update.</p>'); }
  function licenceView() { infoView('Licence', '<p>Our licence details will be added here once they are ready.</p>'); }
  function plansView() {
    var days = S.exp ? Math.max(0, Math.ceil((S.exp - Date.now()) / 864e5)) : 0;
    card('<h1>Subscription</h1><p class="mpv-sub">' + (S.admin ? 'You have full admin access.' : 'Your plan: ' + esc(planName(S.plan)) + ' · ' + days + (days === 1 ? ' day' : ' days') + ' left') + '</p><div class="mpv-links"><a id="mpvBk">Back</a></div>', true, true);
    $('mpvBk').onclick = function () { accountView(); };
  }
  function shownName(email) {
    var n = String(email || '').split('@')[0].replace(/[._\-]+/g, ' ').replace(/\d+$/, '').trim();
    n = n.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
    return n || 'Member';
  }

  function accountView(m, ok) {
    var days = S.exp ? Math.max(0, Math.ceil((S.exp - Date.now()) / 864e5)) : 0;
    if (S.guest) {
      card('<h1>Account</h1><p class="mpv-sub">Guest · ' + days + ' days left</p><button class="mpv-btn ghost" id="mpvHp">Need help? Email us</button><div class="mpv-links"><a id="mpvCl">Close</a></div>');
      $('mpvHp').onclick = function () { location.href = 'mailto:' + SUPPORT; }; $('mpvCl').onclick = close; return;
    }
    var T = PLANS[tierOf(S.plan)], nm = shownName(S.email);
    var badge = S.admin ? 'ADMIN' : S.plan === 'trial' ? 'FREE TRIAL' : (T ? T.n.toUpperCase() : '');
    var stat = S.admin ? 'Full access' : (T ? T.n + ' access · ' : '') + days + (days === 1 ? ' day' : ' days') + ' left' + (S.exp ? ' · until ' + new Date(S.exp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
    var rows = [['pw', 'Change password'], ['help', 'Help Center'], ['about', 'About'], ['terms', 'Terms and conditions'], ['lic', 'Licence']];
    if (S.admin) rows.push(['admin', 'Admin page']);
    openOv(
      '<div class="mpv-top"><div class="mpv-brand"><img class="mpv-lg" src="' + LOGO_URL + '" alt=""><span>Market<span style="color:#ef4444">Plus</span><span style="color:#60a5fa">View</span></span></div><button class="mpv-x" id="mpvCl" aria-label="Close">✕</button></div>' +
      '<div class="mpv-cols"><div class="mpv-c1">' +
      '<div class="mpv-card mpv-prof"><div class="mpv-av">' + esc(nm.charAt(0).toUpperCase()) + '</div><div class="mpv-who"><b>' + esc(nm) + '</b><span>' + esc(S.email) + '</span><i class="mpv-badge' + (S.admin ? ' red' : '') + '">' + badge + '</i></div></div>' +
      '<div class="mpv-stat">' + stat + '</div><div class="mpv-msg" id="mpvM"></div>' +
      '<div class="mpv-tiles"><button class="mpv-tile" data-go="plans"><span class="ic">★</span><b>Subscription</b><small>See plans and upgrade</small></button><button class="mpv-tile" data-go="code"><span class="ic">#</span><b>Enter a code</b><small>Activate or renew</small></button></div>' +
      '</div><div class="mpv-c2">' +
      '<div class="mpv-card mpv-list">' + rows.map(function (r) { return '<button class="mpv-item" data-go="' + r[0] + '">' + r[1] + '<span>›</span></button>'; }).join('') + '</div>' +
      '<div class="mpv-card mpv-list"><button class="mpv-item out" data-go="out">Sign out</button></div></div></div>', 'mpv-acct');
    var go = { plans: plansView, code: function () { codeView(S.email, '', true); }, pw: changePwView, help: function () { location.href = 'mailto:' + SUPPORT; }, about: aboutView, terms: termsView, lic: licenceView, admin: function () { location.href = 'admin.html'; }, out: signOut };
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

  function unlock(exp, admin) {
    S.exp = exp; S.admin = !!admin;
    ov.style.display = 'none';
    if (!pill) { pill = document.createElement('div'); pill.id = 'mpv-pill'; pill.onclick = function () { accountView(); }; root.appendChild(pill); }
    pill.style.display = 'block';
    try { addMenuBtn(); } catch (e) {}
    pill.textContent = admin ? 'Admin' : Math.max(0, Math.ceil((exp - Date.now()) / 864e5)) + 'd left';
    clearInterval(timer);
    timer = setInterval(function () { if (ov.style.display === 'none') check(); }, 60000);
    try { if (!admin && tierOf(S.plan) !== 'metal' && window.mpvRecheckStrats) window.mpvRecheckStrats(); } catch (e) {}
    try { syncOn(false); } catch (e) {}   // drop any strategy the plan does not include
  }

    async function check() {
    var sess = (await sb.auth.getSession()).data.session;
    if (!sess) return getMode() === 'email' ? loginView('in') : loginView('up');
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
        if (t.error) { triedTrial = false; card('<h1>Trial not started</h1><p class="mpv-sub">' + esc(t.error.message) + '</p><button class="mpv-btn" id="mpvGo">Try again</button>'); $('mpvGo').onclick = check; return; }
        return check();
      }
      if (r.data && new Date(r.data.expires_at) > new Date()) {
        try { localStorage.setItem(LS, JSON.stringify({ uid: sess.user.id, exp: new Date(r.data.expires_at).getTime() })); } catch (e) {}
        return unlock(new Date(r.data.expires_at));
      }
      try { localStorage.removeItem(LS); } catch (e) {}
      clearInterval(timer);
      if (S.guest) return guestLockView(r.data ? 'Your access ended on ' + new Date(r.data.expires_at).toLocaleDateString() + '.' : '');
      codeView(S.email, r.data ? 'Your access ended on ' + new Date(r.data.expires_at).toLocaleDateString() + '. Enter a new code to continue.' : 'Start with your free 7-day trial code.');
    } catch (e) {
      var c = null; try { c = JSON.parse(localStorage.getItem(LS)); } catch (x) {}
      if (c && c.uid === sess.user.id && c.exp > Date.now()) return unlock(new Date(c.exp)); // offline: use last known access
      card('<h1>Can\'t connect</h1><p class="mpv-sub">Check your internet connection and try again.</p><button class="mpv-btn" id="mpvGo">Try again</button>');
      $('mpvGo').onclick = check;
    }
  }

  // Locked tools show an upgrade prompt instead of opening. Each entry needs a tier: gold or metal.
  // (Strategies are locked inside index.html through mpvAuth.lockStrat; the buttons below are matched by id or by their text.)
  var LOCK_IDS = {};   // buttons locked by id, e.g. bBook: ['The order book', 'gold']. Empty: order book and position calculator are free for every plan
  var LOCK_TXT = [['Bar replay', 'Bar replay', 'gold'], ['Compare with', 'Compare markets', 'gold'], ['Long / Short', 'The long / short position tool', 'gold'], ['econd chart', 'The second chart', 'metal'], ['Backup & restore', 'Backup and restore', 'metal']];
  function upsell(name, need) {
    var T = PLANS[need] || PLANS.gold, d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;background:rgba(5,10,24,.7);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);font-family:Inter,system-ui,sans-serif;color:#fff';
    d.innerHTML = '<div class="mpv-card" style="width:min(100%,360px);text-align:center"><h1 style="margin:0 0 8px;font-size:22px">' + T.n + ' feature</h1><p class="mpv-sub">' + esc(name) + ' is included in the ' + T.n + ' plan (' + T.p + ').</p><button class="mpv-btn" id="mpvUp">Upgrade to ' + T.n + '</button><button class="mpv-btn ghost" id="mpvNo">Not now</button></div>';
    root.appendChild(d);
    d.querySelector('#mpvNo').onclick = function () { d.remove(); };
    d.querySelector('#mpvUp').onclick = function () { d.remove(); payView(PLANS[need] ? need : 'gold'); };
  }
  // true when this user's plan does not include strategy k (shows the upgrade prompt unless silent)
  function lockStrat(k, silent, label) {
    if (S.admin || !S.exp) return false;
    var need = stratTier(k);
    if (can(need)) return false;
    if (!silent) upsell(label || 'This strategy', need);
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
    window.mpvAuth = { signOut: signOut, recheck: check, state: S, can: can, lockStrat: lockStrat, token: async function () { var r = (await sb.auth.getSession()).data.session; return r ? r.access_token : ''; } };   // S.plan is 'trial' (Silver access), 'silver', 'gold' or 'metal' (old: 'starter', 'pro')
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

  
