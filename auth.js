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
    '#mpvC{text-transform:uppercase;letter-spacing:.08em;text-align:center}' +
    '.mpv-btn{display:block;width:100%;border:0;border-radius:12px;padding:14px;font-size:16px;font-weight:600;color:#fff;background:linear-gradient(135deg,#ef4444,#b91c1c);box-shadow:0 6px 18px rgba(239,68,68,.35);margin-top:8px}' +
    '.mpv-btn.blue{background:linear-gradient(135deg,#3b82f6,#1d4ed8);box-shadow:0 6px 18px rgba(59,130,246,.35)}' +
    '.mpv-btn.ghost{background:rgba(255,255,255,.1);box-shadow:none}.mpv-btn:disabled{opacity:.5}' +
    '.mpv-msg{min-height:20px;font-size:14px;color:#ff7b8f;margin:2px 0 6px;line-height:1.4}.mpv-msg.ok{color:#4ade80}' +
    '.mpv-links{display:flex;justify-content:space-between;gap:12px;margin-top:16px;font-size:14px}' +
    '.mpv-links a,.mpv-legal a{color:#93b4ff;cursor:pointer;text-decoration:none}' +
    '.mpv-or{text-align:center;color:#7f8fb3;font-size:13px;margin:12px 0 2px}.mpv-plans{display:grid;gap:12px}.mpv-pay{text-align:center;color:#aebbd8;font-size:13px}' +
    '.mpv-about{font-size:15px;line-height:1.55;color:#dbe4f7;text-align:center;margin:4px 4px 0}' +
    '.mpv-legal{font-size:12.5px;line-height:1.5;color:#8d9bbd;text-align:center;margin:0 6px}' +
    '#mpv-pill{position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);right:8px;z-index:9998;background:rgba(10,20,50,.75);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#dbe4f7;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:4px 10px;font:600 12px Inter,system-ui,sans-serif}';
  (document.head || root).appendChild(st);

  var ov = document.createElement('div');
  ov.id = 'mpv-auth';
  ov.innerHTML = '<div class="mpv-wrap"><div class="mpv-card"><p class="mpv-sub">Loading…</p></div></div>';
  root.appendChild(ov);

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
    ['trial', 'starter', 'pro'].forEach(function (k) {
      var p = PLANS[k];
      h += '<div class="mpv-plan ' + k + '"><div class="top"><b>' + p.n + '</b><span>' + p.p + '</span></div>' + p.d.map(function (x) { return '<div class="li">✓ ' + x + '</div>'; }).join('');
      if (buy && k === 'trial' && !S.trialUsed) h += '<button class="mpv-btn" id="mpvTr">Get your free trial code</button>';
      if (buy && k !== 'trial') h += '<button class="mpv-btn blue pay" data-plan="' + k + '"' + (S.trialUsed ? '' : ' disabled') + '>' + (S.trialUsed ? 'Pay by card' : 'Available after your free trial') + '</button>';
      h += '</div>';
    });
    return h + '</div><div class="mpv-pay">Everyone starts with the free 7-day trial.<br>Pay by card: <b>Visa</b> · <b>Mastercard</b></div>';
  }
  function extra(buy) {
    return '<p class="mpv-about">A fast trading view tool that helps traders and investors analyse the market with live crypto charts, indicators, buy / sell signals, alerts and more.</p>' + plansHtml(buy) +
      '<p class="mpv-legal">MarketPlusView provides trading analysis tools only. We are not a broker, we do not hold, manage or send money, and nothing here is financial advice. Our aim is to help you experience different markets.</p>' +
      '<p class="mpv-legal">Need help? <a href="mailto:' + SUPPORT + '">' + SUPPORT + '</a></p>';
  }
  function card(inner, more, buy) {
    ov.style.display = 'block'; if (pill) pill.style.display = 'none';
    ov.innerHTML = '<div class="mpv-wrap"><div class="mpv-card">' + BRAND + inner + '</div>' + (more ? extra(buy) : '') + '</div>';
    ov.scrollTop = 0;
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
