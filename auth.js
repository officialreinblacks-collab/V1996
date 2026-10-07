/* MarketPlusView login gate. Add <script src="auth.js"></script> inside <head> of index.html. */
(function () {
  var SB_URL = 'https://ssukfrvtknfsccqxqkjh.supabase.co';
  var SB_KEY = 'sb_publishable_qjmaCvag0XhnMlipWFHCeA_fwt3CqST';
  var LS = 'mpvAccess', root = document.documentElement, sb, pill, timer;

  var st = document.createElement('style');
  st.textContent =
    '#mpv-auth{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;overflow:auto;background:radial-gradient(1200px 600px at 20% -10%,#161c2e 0%,#0b0e14 60%);color:#e9edf5;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '#mpv-auth *{box-sizing:border-box}' +
    '.mpv-card{width:min(100%,380px);background:linear-gradient(180deg,#171c29,#10141d);border:1px solid rgba(255,255,255,.07);border-radius:22px;padding:26px 22px;box-shadow:0 30px 80px rgba(0,0,0,.6)}' +
    '.mpv-logo{font-weight:700;font-size:15px;color:#7f8aa3;margin-bottom:18px}' +
    '.mpv-card h1{margin:0 0 6px;font-size:26px;letter-spacing:-.02em}' +
    '.mpv-sub{margin:0 0 18px;color:#7f8aa3;font-size:14px;line-height:1.45}' +
    '.mpv-card input{width:100%;background:#151a24;color:#e9edf5;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;font-size:16px;margin-bottom:10px;outline:none}' +
    '.mpv-card input:focus{border-color:#7c8cff}' +
    '#mpvC{text-transform:uppercase;letter-spacing:.08em;text-align:center}' +
    '.mpv-btn{width:100%;border:0;border-radius:12px;padding:14px;font-size:16px;font-weight:600;color:#fff;background:linear-gradient(135deg,#7c8cff,#a78bfa);box-shadow:0 6px 18px rgba(124,140,255,.35);margin-top:4px}' +
    '.mpv-btn:disabled{opacity:.6}' +
    '.mpv-msg{min-height:20px;font-size:14px;color:#ff5d7a;margin:2px 0 8px;line-height:1.4}' +
    '.mpv-msg.ok{color:#2dd4a7}' +
    '.mpv-links{display:flex;justify-content:space-between;gap:12px;margin-top:16px;font-size:14px}' +
    '.mpv-links a{color:#9aa7ff;cursor:pointer;text-decoration:none}' +
    '#mpv-pill{position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);right:8px;z-index:9998;background:rgba(22,27,38,.8);color:#9aa3b5;border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:4px 10px;font:600 12px Inter,system-ui,sans-serif;opacity:.8}';
  (document.head || root).appendChild(st);

  var ov = document.createElement('div');
  ov.id = 'mpv-auth';
  ov.innerHTML = '<div class="mpv-card"><div class="mpv-logo">MarketPlusView</div><p class="mpv-sub">Loading…</p></div>';
  root.appendChild(ov);

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function card(inner) { ov.style.display = 'flex'; if (pill) pill.style.display = 'none'; ov.innerHTML = '<div class="mpv-card"><div class="mpv-logo">MarketPlusView</div>' + inner + '</div>'; }
  function msg(t, ok) { var m = $('mpvM'); if (m) { m.textContent = t || ''; m.className = 'mpv-msg' + (ok ? ' ok' : ''); } }
  function busy(b, on, label) { b.disabled = on; b.textContent = on ? 'Please wait…' : label; }
  var back = function () { return location.origin + location.pathname; };

  function loginView(mode, m, ok) {
    var up = mode === 'up';
    card('<h1>' + (up ? 'Create account' : 'Sign in') + '</h1>' +
      '<p class="mpv-sub">' + (up ? 'Use your email and a password. You will enter your access code next.' : 'Sign in with your email to open the charts.') + '</p>' +
      '<input id="mpvE" type="email" inputmode="email" autocomplete="email" placeholder="Email">' +
      '<input id="mpvP" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" placeholder="Password' + (up ? ' (8+ characters)' : '') + '">' +
      '<div class="mpv-msg" id="mpvM"></div>' +
      '<button class="mpv-btn" id="mpvGo">' + (up ? 'Create account' : 'Sign in') + '</button>' +
      '<div class="mpv-links"><a id="mpvSw">' + (up ? 'I already have an account' : 'Create an account') + '</a>' + (up ? '' : '<a id="mpvFg">Forgot password</a>') + '</div>');
    msg(m, ok);
    var label = up ? 'Create account' : 'Sign in';
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

  function codeView(email, m) {
    card('<h1>Enter access code</h1><p class="mpv-sub">Signed in as ' + esc(email) + '. Enter the code you were given to unlock MarketPlusView.</p>' +
      '<input id="mpvC" type="text" autocapitalize="characters" autocomplete="off" placeholder="MPV-XXXX-XXXX">' +
      '<div class="mpv-msg" id="mpvM"></div><button class="mpv-btn" id="mpvGo">Unlock</button>' +
      '<div class="mpv-links"><a id="mpvOut">Sign out</a></div>');
    msg(m);
    $('mpvOut').onclick = signOut;
    $('mpvGo').onclick = async function () {
      var c = $('mpvC').value.trim(), b = $('mpvGo');
      if (!c) return msg('Enter your code.');
      busy(b, true); msg('');
      var r = await sb.rpc('redeem_code', { p_code: c });
      if (r.error) { msg(r.error.message); busy(b, false, 'Unlock'); return; }
      check();
    };
  }

  function recoveryView() {
    card('<h1>New password</h1><p class="mpv-sub">Choose a new password for your account.</p>' +
      '<input id="mpvP" type="password" autocomplete="new-password" placeholder="New password (8+ characters)">' +
      '<div class="mpv-msg" id="mpvM"></div><button class="mpv-btn" id="mpvGo">Save password</button>');
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
    ov.style.display = 'none';
    if (!pill) {
      pill = document.createElement('div'); pill.id = 'mpv-pill';
      pill.onclick = function () { if (confirm('Sign out of MarketPlusView?')) signOut(); };
      root.appendChild(pill);
    }
    pill.style.display = 'block';
    pill.textContent = admin ? 'Admin' : Math.max(0, Math.ceil((exp - Date.now()) / 864e5)) + 'd left';
    clearInterval(timer);
    timer = setInterval(check, 60000);
  }

  async function check() {
    var sess = (await sb.auth.getSession()).data.session;
    if (!sess) return loginView('in');
    try {
      var a = await sb.rpc('is_admin');
      if (a.error) throw a.error;
      if (a.data === true) return unlock(null, true);
      var r = await sb.from('memberships').select('expires_at').eq('user_id', sess.user.id).maybeSingle();
      if (r.error) throw r.error;
      if (r.data && new Date(r.data.expires_at) > new Date()) {
        try { localStorage.setItem(LS, JSON.stringify({ uid: sess.user.id, exp: new Date(r.data.expires_at).getTime() })); } catch (e) {}
        return unlock(new Date(r.data.expires_at));
      }
      try { localStorage.removeItem(LS); } catch (e) {}
      clearInterval(timer);
      codeView(sess.user.email, r.data ? 'Your access ended on ' + new Date(r.data.expires_at).toLocaleDateString() + '. Enter a new code to continue.' : '');
    } catch (e) {
      var c = null; try { c = JSON.parse(localStorage.getItem(LS)); } catch (x) {}
      if (c && c.uid === sess.user.id && c.exp > Date.now()) return unlock(new Date(c.exp)); // offline: use last known access
      card('<h1>Can\'t connect</h1><p class="mpv-sub">Check your internet connection and try again.</p><button class="mpv-btn" id="mpvGo">Try again</button>');
      $('mpvGo').onclick = check;
    }
  }

  function start() {
    sb = window.supabase.createClient(SB_URL, SB_KEY);
    window.mpvAuth = { signOut: signOut, recheck: check };
    sb.auth.onAuthStateChange(function (ev) {
      if (ev === 'PASSWORD_RECOVERY') recoveryView();
      else if (ev === 'SIGNED_OUT') loginView('in');
    });
    check();
  }

  var SRC = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js', 'https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'];
  (function load(i) {
    if (i >= SRC.length) { ov.innerHTML = '<div class="mpv-card"><h1>Can\'t load</h1><p class="mpv-sub">Turn off data saver or your ad blocker, then reload.</p></div>'; return; }
    var s = document.createElement('script'); s.src = SRC[i]; s.onload = start; s.onerror = function () { load(i + 1); };
    (document.head || root).appendChild(s);
  })(0);
})();
