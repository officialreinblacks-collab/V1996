/* MarketPlusView access gate v2. Add <script src="auth.js"></script> inside <head> of index.html. */
(function () {
  var SB_URL = 'https://ssukfrvtknfsccqxqkjh.supabase.co';
  var SB_KEY = 'sb_publishable_qjmaCvag0XhnMlipWFHCeA_fwt3CqST';
  var SUPPORT = 'marketplusview@gmail.com';            // support email shown to clients
  var PAY = { starter: '', pro: '' };                   // paste your card payment link (e.g. Stripe Payment Link) for each plan
  var LS = 'mpvAccess', root = document.documentElement, sb, pill, timer;
  var S = { email: '', plan: '', exp: null, admin: false, trialUsed: false, guest: false }, triedTrial = false;
  var getMode = function () { try { return localStorage.getItem('mpvMode'); } catch (e) { return null; } };
  var setMode = function (m) { try { localStorage.setItem('mpvMode', m); } catch (e) {} };
  var PLANS = {
    trial: { n: 'Free trial', p: '7 days free', d: ['Full access for 7 days', 'One time per person', 'Required before any paid plan'] },
    starter: { n: 'Starter', p: '$50 / month', d: ['Live charts and 25+ indicators', 'Drawing tools and price alerts', 'Watchlist and chart types', 'Pro tools are not included'] },
    pro: { n: 'Pro', p: '$100 / month', d: ['Everything in Starter', 'Buy / sell signal strategies', 'Order book and position size calculator', 'Bar replay, compare markets, market mood', 'Second chart and backups', 'AI market analysis (coming soon)', 'Priority support'] }
  };

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
    '.mpv-plan.pro{border-color:rgba(239,68,68,.6)}.mpv-plan.starter{border-color:rgba(96,165,250,.5)}' +
    '.mpv-plan .top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;font-size:17px}.mpv-plan .top span{color:#93b4ff;font-weight:600;font-size:15px}' +
    '.mpv-plan .li{font-size:14px;color:#cdd7ee;padding:3px 0}' +
    '.mpv-logo{font-weight:800;font-size:17px;margin-bottom:16px;letter-spacing:-.01em}' +
    '.mpv-card h1{margin:0 0 6px;font-size:26px;letter-spacing:-.02em}' +
    '.mpv-sub{margin:0 0 16px;color:#aebbd8;font-size:14px;line-height:1.5}' +
    '.mpv-card input{width:100%;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:14px;font-size:16px;margin-bottom:10px;outline:none}' +
    '.mpv-card input::placeholder{color:#7f8fb3}.mpv-card input:focus{border-color:#60a5fa}' +
