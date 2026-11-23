/* MarketPlusView ads for the Free plan and guests (Binance banner and Pro Plus Metal invite). Used by auth-main.js. */
window.MPV_ADS = function (ctx) {
  var AD = ctx.AD, PLANS = ctx.PLANS, PRICE = ctx.PRICE, PROMO = ctx.PROMO, SHOTS = ctx.SHOTS, S = ctx.S, root = ctx.root, ov = ctx.ov, can = ctx.can, esc = ctx.esc;
  function payView() { return ctx.payView.apply(null, arguments); }
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
  return { showAd: showAd };
};
