/* MarketPlusView AI Assistant (Jotform agent), login screen only.
   A separate file: index.html is NOT touched. Load it from the auth side (auth.js), one line:
     var s=document.createElement('script'); s.src='mpv-agent.js?v=1'; document.head.appendChild(s);
   It waits for the login overlay (#mpv-auth) and loads the agent only while that screen is open.
   After sign-in the agent bubble is hidden at once. Tidio and the rest of the page are never touched.
   Safety rules: it only ever hides nodes it can prove belong to Jotform AND were added after it loaded,
   direct children of <body> only. It never hides <body>, <html>, <head> or anything already on the page.
   To keep the agent on the chart screen too, set SHOW_AFTER_LOGIN to true. To switch it off, set ENABLED to false. */
(function () {
  if (window.__mpvAgent) return; window.__mpvAgent = 1;
  var ENABLED = true;
  var SHOW_AFTER_LOGIN = false;
  var SRC = 'https://cdn.jotfor.ms/agent/embedjs/01a20d4daca0700089ced90eb53f3dda752c/embed.js';
  var OVERLAY_ID = 'mpv-auth';
  if (!ENABLED) return;

  var loaded = false, before = [], mine = [], watched = null;

  function authOpen() {
    try {
      var o = document.getElementById(OVERLAY_ID); if (!o) return false;
      var cs = getComputedStyle(o);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && o.offsetHeight > 0;
    } catch (e) { return false; }
  }
  function isJf(n) {
    try {
      if (!n || n.nodeType !== 1) return false;
      if (n === document.body || n === document.documentElement || n === document.head) return false;
      if (before.indexOf(n) >= 0) return false;
      var t = (n.id || '') + ' ' + (typeof n.className === 'string' ? n.className : '');
      if (/jotform|jotfor\.ms/i.test(t)) return true;
      if (n.tagName === 'IFRAME' && /jotform|jotfor\.ms/i.test(n.src || '')) return true;
      return !!(n.querySelector && n.querySelector('iframe[src*="jotform"],iframe[src*="jotfor.ms"]'));
    } catch (e) { return false; }
  }
  function collect() {
    Array.prototype.forEach.call(document.body.children, function (n) {
      if (n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE' && mine.indexOf(n) < 0 && isJf(n)) mine.push(n);
    });
  }
  function apply(show) {
    mine.forEach(function (n) {
      if (show) { n.style.removeProperty('display'); n.style.setProperty('z-index', '2147483647', 'important'); }
      else n.style.setProperty('display', 'none', 'important');
    });
  }
  function load() {
    before = Array.prototype.slice.call(document.body.children);
    loaded = true;
    var s = document.createElement('script'); s.src = SRC; s.async = true; document.body.appendChild(s);
  }
  function tick() {
    try {
      if (!document.body) return;
      var on = authOpen() || SHOW_AFTER_LOGIN;
      if (on && !loaded) load();
      if (loaded) { collect(); apply(on); }
    } catch (e) {}
  }
  function watch() {
    try {
      var o = document.getElementById(OVERLAY_ID);
      if (o && o !== watched && window.MutationObserver) {
        watched = o; new MutationObserver(tick).observe(o, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
      }
    } catch (e) {}
  }
  function start() {
    try { if (window.MutationObserver) new MutationObserver(function () { watch(); tick(); }).observe(document.body, { childList: true }); } catch (e) {}
    setInterval(function () { watch(); tick(); }, 150);
    watch(); tick();
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
