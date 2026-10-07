/* MarketPlusView access gate v2. Add <script src="auth.js"></script> inside <head> of index.html. */
(function () {
  var SB_URL = 'https://ssukfrvtknfsccqxqkjh.supabase.co';
  var SB_KEY = 'sb_publishable_qjmaCvag0XhnMlipWFHCeA_fwt3CqST';
  var SUPPORT = 'marketplusview@gmail.com';            // support email shown to clients
  var PAY = { starter: '', pro: '' };                   // paste your card payment link (e.g. Stripe Payment Link) for each plan
  var LS = 'mpvAccess', root = document.documentElement, sb, pill, timer;
  var S = { email: '', plan: '', exp: null, admin: false, trialUsed: false };
  var PLANS = {
    trial: { n: 'Free trial', p: '7 days free', d: ['Full access for 7 days', 'One time per person', 'Required before any paid plan'] },
    starter: { n: 'Starter', p: '$50 / month', d: ['Live charts and core indicators', 'Price alerts and watchlist', 'Limited tools'] },
    pro: { n: 'Pro', p: '$100 / month', d: ['Everything in Starter', 'Buy / sell signals and Market Scanner', 'AI market analysis', 'All indicators, strategies and drawings', 'Order book and position calculator', 'Priority support'] }
  };

  var st = document.createElement('style');
  st.textContent =
    'html:root{--acc:#3b82f6;--acc2:#ef4444}' +
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
    '.mpv-plans{display:grid;gap:12px}.mpv-pay{text-align:center;color:#aebbd8;font-size:13px}' +
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
  var enc = encodeURIComponent, back = function () { return location.origin + location.pathname; };
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

  function loginView(mode, m, ok) {
    var up = mode === 'up', label = up ? 'Create account' : 'Sign in';
    card('<h1>' + label + '</h1><p class="mpv-sub">' + (up ? 'Create your account, then start your free 7-day trial.' : 'Sign in with your email to open the charts.') + '</p>' +
      '<input id="mpvE" type="email" inputmode="email" autocomplete="email" placeholder="Email">' +
      '<input id="mpvP" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" placeholder="Password' + (up ? ' (8+ characters)' : '') + '">' +
      '<div class="mpv-msg" id="mpvM"></div><button class="mpv-btn" id="mpvGo">' + label + '</button>' +
      '<div class="mpv-links"><a id="mpvSw">' + (up ? 'I already have an account' : 'Create an account') + '</a>' + (up ? '' : '<a id="mpvFg">Forgot password</a>') + '</div>', true, false);
    msg(m, ok);
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
    card('<h1>Pay by card</h1><p class="mpv-sub">' + p.n + ' plan · ' + p.p + '<br>Visa · Mastercard</p><p class="mpv-sub">We will email you a secure card payment link. After payment is confirmed, we send your access code.</p>' +
      '<button class="mpv-btn" id="mpvMail">Request payment link</button><div class="mpv-links"><a id="mpvBk">Back</a></div>');
    $('mpvBk').onclick = function () { check(); };
    $('mpvMail').onclick = function () { location.href = 'mailto:' + SUPPORT + '?subject=' + enc('MarketPlusView ' + p.n + ' plan') + '&body=' + enc('Hello, I would like the ' + p.n + ' plan (' + p.p + '). My account email: ' + S.email); };
  }

  function accountView(m, ok) {
    var days = S.exp ? Math.max(0, Math.ceil((S.exp - Date.now()) / 864e5)) : 0;
    card('<h1>Account</h1><p class="mpv-sub">' + esc(S.email) + '<br>' + (S.admin ? 'Admin' : (PLANS[S.plan] ? PLANS[S.plan].n : '') + ' · ' + days + ' days left') + '</p><div class="mpv-msg" id="mpvM"></div>' +
      '<button class="mpv-btn blue" id="mpvCp">Change password</button><button class="mpv-btn ghost" id="mpvNc">Enter a new code</button>' + (S.admin ? '<button class="mpv-btn ghost" id="mpvAd">Admin page</button>' : '') +
      '<button class="mpv-btn ghost" id="mpvHp">Need help? Email us</button><button class="mpv-btn ghost" id="mpvSo">Sign out</button><div class="mpv-links"><a id="mpvCl">Close</a></div>');
    msg(m, ok);
    $('mpvCp').onclick = changePwView; $('mpvSo').onclick = signOut; $('mpvCl').onclick = close;
    $('mpvNc').onclick = function () { codeView(S.email, '', true); };
    $('mpvHp').onclick = function () { location.href = 'mailto:' + SUPPORT; };
    if (S.admin) $('mpvAd').onclick = function () { location.href = 'admin.html'; };
  }

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

  async function signOut() { try { await sb.auth.signOut(); } catch (e) {} try { localStorage.removeItem(LS); } catch (e) {} location.reload(); }

  function unlock(exp, admin) {
    S.exp = exp; S.admin = !!admin;
    ov.style.display = 'none';
    if (!pill) { pill = document.createElement('div'); pill.id = 'mpv-pill'; pill.onclick = function () { accountView(); }; root.appendChild(pill); }
    pill.style.display = 'block';
    pill.textContent = admin ? 'Admin' : Math.max(0, Math.ceil((exp - Date.now()) / 864e5)) + 'd left';
    clearInterval(timer);
    timer = setInterval(function () { if (ov.style.display === 'none') check(); }, 60000);
  }

  async function check() {
    var sess = (await sb.auth.getSession()).data.session;
    if (!sess) return loginView('in');
    S.email = sess.user.email;
    try {
      var a = await sb.rpc('is_admin');
      if (a.error) throw a.error;
      if (a.data === true) return unlock(null, true);
      var r = await sb.from('memberships').select('expires_at,plan,trial_used').eq('user_id', sess.user.id).maybeSingle();
      if (r.error) throw r.error;
      S.trialUsed = !!(r.data && r.data.trial_used); S.plan = r.data ? r.data.plan : '';
      if (r.data && new Date(r.data.expires_at) > new Date()) {
        try { localStorage.setItem(LS, JSON.stringify({ uid: sess.user.id, exp: new Date(r.data.expires_at).getTime() })); } catch (e) {}
        return unlock(new Date(r.data.expires_at));
      }
      try { localStorage.removeItem(LS); } catch (e) {}
      clearInterval(timer);
      codeView(S.email, r.data ? 'Your access ended on ' + new Date(r.data.expires_at).toLocaleDateString() + '. Enter a new code to continue.' : 'Start with your free 7-day trial code.');
    } catch (e) {
      var c = null; try { c = JSON.parse(localStorage.getItem(LS)); } catch (x) {}
      if (c && c.uid === sess.user.id && c.exp > Date.now()) return unlock(new Date(c.exp)); // offline: use last known access
      card('<h1>Can\'t connect</h1><p class="mpv-sub">Check your internet connection and try again.</p><button class="mpv-btn" id="mpvGo">Try again</button>');
      $('mpvGo').onclick = check;
    }
  }

  function start() {
    sb = window.supabase.createClient(SB_URL, SB_KEY);
    window.mpvAuth = { signOut: signOut, recheck: check, state: S };   // S.plan is 'trial', 'starter' or 'pro'
    sb.auth.onAuthStateChange(function (ev) {
      if (ev === 'PASSWORD_RECOVERY') recoveryView();
      else if (ev === 'SIGNED_OUT') loginView('in');
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
