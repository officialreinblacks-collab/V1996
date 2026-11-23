/* MarketPlusView sign-in / account screen styles (CSS text). Used by auth-main.js. */
window.MPV_CSS = {
  main:
'html:root{--acc:#3b82f6;--acc2:#ef4444}' +
    'html #tour{background-color:#050914;background:radial-gradient(700px 400px at 20% 0%,rgba(37,99,235,.45),transparent 60%),radial-gradient(600px 400px at 100% 100%,rgba(239,68,68,.3),transparent 60%),#050914}' +
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
    '.mpv-soc .si.fb{background:#1877f2}.mpv-soc .si.ig{background:linear-gradient(45deg,#f9ce34 0%,#ee2a7b 50%,#6228d7 100%)}.mpv-soc .si.yt{background:#ff0000}.mpv-soc .si.tt{background:#000;border:1px solid rgba(255,255,255,.28)}' +
    '.mpv-soc .st{flex:1;min-width:0;text-align:left}.mpv-soc .st b{display:block;font-size:14.5px;line-height:1.2;color:#fff}.mpv-soc .st span{display:block;margin-top:2px;font-size:12.5px;color:#aebbd8}' +
    '.mpv-soc .sg{flex:none;font-size:11.5px;font-weight:800;letter-spacing:.03em;color:#fff;padding:6px 12px;border-radius:999px;background:linear-gradient(135deg,#1c4fd8,#0e7bb8)}' +
    '.mpv-soc.bare{margin:6px 0 0;padding:0;border:0;background:none}.mpv-soc .si.wa{background:#25d366}.mpv-soc .si.em{background:linear-gradient(135deg,#1c4fd8,#0e7bb8)}.mpv-soc .st span{word-break:break-word}' +
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
    '#mpv-pill{position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);right:8px;z-index:9998;background:rgba(10,20,50,.75);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#dbe4f7;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:4px 10px;font:600 12px Inter,system-ui,sans-serif}',
  tour:
'html[data-theme=light] #tour .tcard{background:#fff;border-color:#d9e2f2;box-shadow:0 30px 70px rgba(20,30,60,.2);-webkit-backdrop-filter:none;backdrop-filter:none}' +
    'html[data-theme=light] #tour .tcard h2{color:#0b1f4d}' +
    'html[data-theme=light] #tour .tcard p{color:#4b5b7c}' +
    'html[data-theme=light] #tour .tic{background:linear-gradient(135deg,#1d4ed8,#dc2626);border-color:transparent;box-shadow:0 10px 26px rgba(29,78,216,.3)}' +
    'html[data-theme=light] #tour .tk span{background:#f6f9ff;border-color:#d9e2f2;color:#4b5b7c}' +
    'html[data-theme=light] #tour .tk b{color:#0b1f4d}' +
    'html[data-theme=light] #tour .tbtn button{background:#e8effd;border-color:#c7d3ea;color:#1d4ed8}' +
    'html[data-theme=light] #tour .tbtn button.pri{background:linear-gradient(135deg,#ef4444,#b91c1c);border-color:transparent;color:#fff}',
  eye:
'.mpv-pw{position:relative;display:block}.mpv-card .mpv-pw input{padding-right:52px}' +
      '.mpv-eye{position:absolute;right:6px;top:0;height:calc(100% - 10px);width:40px;border:0;background:transparent;color:rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;border-radius:10px;-webkit-tap-highlight-color:transparent}' +
      '.mpv-eye.on{color:#2dd4a7}.mpv-eye svg{width:20px;height:20px;display:block;pointer-events:none}'
};
