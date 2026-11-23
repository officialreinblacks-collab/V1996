/* MarketPlusView access gate v2 - loader.
   Keep <script src="auth.js"></script> inside <head> of index.html (nothing else to add).
   It loads, in order: auth-config.js (settings), auth-style.js (styles), auth-content.js (page texts),
   auth-sync.js (drawing sync), auth-ads.js (ads) and auth-main.js (login and access code).
   Upload ALL of these files next to index.html. */
(function () {
  var FILES = ['auth-config.js', 'auth-style.js', 'auth-content.js', 'auth-sync.js', 'auth-ads.js', 'auth-main.js'];
  var cs = document.currentScript, src = cs && cs.src ? cs.src : '';
  var base = src.replace(/[^\/?#]*([?#].*)?$/, ''), qi = src.indexOf('?'), q = qi > -1 ? src.slice(qi).split('#')[0] : '';   // a ?v=123 on auth.js is passed on to the other files
  if (document.readyState === 'loading') {
    // inside <head>: write the tags so they load in order and the page waits for them, as before
    for (var i = 0; i < FILES.length; i++) document.write('<script src="' + base + FILES[i] + q + '"><\/script>');
  } else {
    FILES.forEach(function (f) { var s = document.createElement('script'); s.src = base + f + q; s.async = false; (document.head || document.documentElement).appendChild(s); });
  }
})();
