/* more.js: Time-of-Day Stats tile under More + split-screen panel that opens more.html. Load from index.html with <script src="more.js"></script> */

/* [tod] Time-of-Day / Session Stats: tile under More, opens more.html as a split screen (landscape = side panel, portrait = bottom panel, middle handle drags) */
(function(){
  try{
    var gid=function(i){ return document.getElementById(i); }, clamp=function(v,a,b){ return Math.min(b,Math.max(a,v)); };
    var SK='rcTodSize', SZ={w:.5,h:.62}; try{ var o=JSON.parse(localStorage.getItem(SK)||'{}'); if(o.w) SZ.w=o.w; if(o.h) SZ.h=o.h; }catch(e){}
    var st=document.createElement('style'); st.textContent=
'#todp{position:fixed;z-index:7;display:none;flex-direction:column;background:#0b0e14;color:var(--txt);font-family:Inter,system-ui,sans-serif;box-shadow:0 0 30px rgba(0,0,0,.6)}'
+'#todp.on{display:flex}'
+'#todp.land{top:0;bottom:0;right:0;border-left:1px solid var(--line)}'
+'#todp.port{left:0;right:0;bottom:0;border-top:1px solid var(--line)}'
+'#toddiv{position:absolute;z-index:3;display:flex;align-items:center;justify-content:center;touch-action:none;background:rgba(124,140,255,.08)}'
+'#todp.land #toddiv{left:0;top:0;bottom:0;width:20px;cursor:col-resize}'
+'#todp.port #toddiv{left:0;right:0;top:0;height:20px;cursor:row-resize}'
+'#toddiv i{display:block;border-radius:3px;background:#8a93ad}'
+'#todp.land #toddiv i{width:4px;height:44px}#todp.port #toddiv i{height:4px;width:44px}'
+'#todp.land #todhd,#todp.land #todfr{margin-left:20px}#todp.port #todhd{margin-top:20px}'
+'#todhd{flex:none;display:flex;align-items:center;gap:8px;padding:4px 10px 4px 6px;border-bottom:1px solid var(--line)}'
+'#todx{flex:none;width:30px;height:30px;border:0;border-radius:50%;background:rgba(255,255,255,.1);color:var(--txt);font-size:14px;padding:0}'
+'#todtt{min-width:0;display:flex;flex-direction:column;flex:1}#todtt b{font-size:15px;line-height:1.1}#todtt small{color:var(--mut);font-size:10.5px}'
+'#todfr{flex:1;min-height:0;border:0;width:auto;background:#0b0e14}'
+'html[data-theme=light] #todp{background:#fff}';
    document.head.appendChild(st);
    var el=document.createElement('div'); el.id='todp';
    el.innerHTML='<div id="toddiv"><i></i></div><div id="todhd"><button id="todx" type="button" aria-label="Close">\u2715</button><div id="todtt"><b>Time-of-Day Stats</b><small>Best hours and sessions</small></div></div><iframe id="todfr" title="Time-of-Day and Session Performance Stats"></iframe>';
    document.body.appendChild(el);
    var fr=gid('todfr'), dv=gid('toddiv'), open=false, drag=false, rafK=0, timer=null, lastSym='', mine=false;
    var land=function(){ return innerWidth>=innerHeight; };
    var kick=function(){ cancelAnimationFrame(rafK); rafK=requestAnimationFrame(function(){ try{ window.dispatchEvent(new Event('resize')); }catch(e){} }); };
    function layout(){
      var L=land(), b=document.body.style; el.classList.toggle('land',L); el.classList.toggle('port',!L);
      if(!open){ if(mine){ mine=false; b.paddingRight=b.paddingBottom=''; kick(); } return; }
      mine=true;
      if(L){ var w=Math.round(innerWidth*SZ.w); el.style.width=w+'px'; el.style.height=''; b.paddingRight=w+'px'; b.paddingBottom=''; }
      else { var h=Math.round(innerHeight*SZ.h); el.style.height=h+'px'; el.style.width=''; b.paddingBottom=h+'px'; b.paddingRight=''; }
      kick();
    }
    dv.addEventListener('pointerdown',function(e){ drag=true; try{ dv.setPointerCapture(e.pointerId); }catch(x){} e.preventDefault(); });
    dv.addEventListener('pointermove',function(e){ if(!drag) return; if(land()) SZ.w=clamp((innerWidth-e.clientX)/innerWidth,.28,.78); else SZ.h=clamp((innerHeight-e.clientY)/innerHeight,.3,.8); layout(); });
    var endDrag=function(){ if(!drag) return; drag=false; try{ localStorage.setItem(SK,JSON.stringify(SZ)); }catch(e){} };
    dv.addEventListener('pointerup',endDrag); dv.addEventListener('pointercancel',endDrag);
    window.addEventListener('resize',function(){ if(open) layout(); }); window.addEventListener('orientationchange',function(){ setTimeout(layout,250); });

    function curSym(){ try{ return String((typeof sym!=='undefined'&&sym&&sym[0])||'BTCUSDT').toUpperCase(); }catch(e){ return 'BTCUSDT'; } }
    function curTf(){ try{ return String((typeof tf!=='undefined'&&tf&&tf[1])||''); }catch(e){ return ''; } }
    function send(){ try{ fr.contentWindow.postMessage({type:'tod-sym',sym:curSym(),tf:curTf()},'*'); lastSym=curSym(); }catch(e){} }
    window.addEventListener('message',function(e){ if(e.source===fr.contentWindow&&e.data&&e.data.type==='tod-ready') send(); });

    function closeOthers(){
      var on=function(i){ var n=gid(i); return !!(n&&n.classList.contains('on')); }, click=function(s){ var n=document.querySelector(s); if(n) n.click(); };
      if(on('sgp')) click('#sgx'); if(on('sinfo')) click('#six');
      var stg=gid('stage'); if(stg){ if(stg.classList.contains('obs')) click('#obsp .obx'); if(stg.classList.contains('cps')) click('#calcsp .obx'); }
    }
    function othersOpen(){
      var on=function(i){ var n=gid(i); return !!(n&&n.classList.contains('on')); }, stg=gid('stage');
      return on('sgp')||on('sinfo')||!!(stg&&(stg.classList.contains('obs')||stg.classList.contains('cps')));
    }
    function todOpen(){
      closeOthers(); var sh=gid('sheet'); if(sh) sh.classList.remove('open');
      if(!fr.getAttribute('src')) fr.setAttribute('src','more.html');
      open=true; el.classList.add('on'); layout(); send();
      clearInterval(timer); timer=setInterval(function(){ if(!open) return; if(othersOpen()){ todClose(); return; } if(curSym()!==lastSym) send(); },1500);
    }
    function todClose(){ open=false; clearInterval(timer); el.classList.remove('on'); layout(); }
    gid('todx').onclick=todClose;
    document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&open) todClose(); });
    window.mpTimeStats=function(){ open?todClose():todOpen(); };

    var ICON='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#7c8cff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/><path d="M4 20h3M17 20h3" stroke-width="2.4"/></svg>';
    function addTile(){
      var g=gid('groups'), pt=gid('pt'); if(!g||!pt||pt.textContent.trim()!=='More') return;
      if(g.querySelector('[data-tod]')) return;
      var b=document.createElement('button'); b.type='button'; b.setAttribute('data-tod','1'); b.setAttribute('aria-label','Time-of-Day Stats');
      b.innerHTML='<b style="display:flex;height:24px;align-items:center">'+ICON+'</b>Time-of-Day Stats';
      b.onclick=function(){ var sh=gid('sheet'); if(sh) sh.classList.remove('open'); setTimeout(todOpen,60); };
      var row=null, gauge=null;
      [].slice.call(g.querySelectorAll('.si-tiles')).forEach(function(r){ var h=r.previousElementSibling; if(h&&h.textContent==='NEWS') row=r; });
      if(row){ [].slice.call(row.querySelectorAll('button')).forEach(function(x){ if(/Market Gauge/.test(x.textContent)) gauge=x; }); if(gauge) gauge.parentNode.insertBefore(b,gauge.nextSibling); else row.appendChild(b); return; }
      var hd=document.createElement('h4'); hd.textContent='NEWS'; row=document.createElement('div'); row.className='si-tiles'; row.appendChild(b);
      g.insertBefore(row,g.firstChild); g.insertBefore(hd,row);
    }
    /* does not touch the More button's own handler, so existing More items are never affected */
    var gg=gid('groups'); if(gg&&window.MutationObserver) new MutationObserver(addTile).observe(gg,{childList:true});
    var bm=gid('bMore'); if(bm) bm.addEventListener('click',function(){ setTimeout(addTile,0); setTimeout(addTile,250); });
  }catch(err){ console.error('time-of-day panel failed',err); }
})();
