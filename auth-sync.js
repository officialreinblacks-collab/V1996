/* MarketPlusView cloud sync of chart drawings (per account). Used by auth-main.js. */
window.MPV_SYNC = function (ctx) {
  var S = ctx.S, root = ctx.root;
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
      var r = await ctx.sb().from('user_layouts').upsert(rows, { onConflict: 'user_id,k' });
      if (r.error) throw r.error;
      syNote('Analysis synced ✓');
    } catch (e) {
      var why = syWhy(e); if (why && !SY.warned) { SY.warned = 1; syNote(why, true); }
      ks.forEach(function (k) { SY.q[k] = 1; }); clearTimeout(SY.timer); SY.timer = setTimeout(syPush, 15000);
    }
    SY.busy = false;
  }
  async function syMerge() {
    var r = await ctx.sb().from('user_layouts').select('k,v,ts');
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
      var sess = (await ctx.sb().auth.getSession()).data.session;
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
  return { SY: SY, syPush: syPush, syncOn: syncOn };
};
