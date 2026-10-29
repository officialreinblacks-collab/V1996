/* tools-3.js — MarketPlusView tool code. index.html loads this file and runs it inside start() at the spot where this code used to be (same order, same scope).
   Keep the file name. Tools in this file: IND.afib, IND.smc, IND.srh, IND.wvadp, IND.ppa */
try{
// =====================================================================================
// UPGRADE PACK (isolated): [wlx] watchlist · [afx] Auto Fibonacci · [fbx] Fib drawing · [avx] Anchored VWAP
// Additive only: wraps/overrides by reassignment, nothing above this block was edited.
// =====================================================================================
{ const st=document.createElement('style'); st.textContent=`
#wlxList .wl-r{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:pan-y}
.wlx-spw{width:64px;height:26px;flex:none}.wlx-sp{display:block}
.wlx-bell{font-size:11px;margin-left:5px}
.wlx-hint{color:var(--mut);font-size:12.5px;line-height:1.45;margin:6px 2px 8px}
.wlx-al{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 2px;border-bottom:1px solid var(--line);font-size:14px}
`; document.head.appendChild(st); }

// ---------------- [wlx] watchlist: sparklines, sorting, long-press alert ----------------
const WLX_DEF=['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','PAXGUSDT'];
try{ const a=JSON.parse(localStorage.getItem('rcWatch')||'null'); window.wl=Array.isArray(a)?a:WLX_DEF.slice(); }catch(e){ window.wl=WLX_DEF.slice(); }
const wlxSave=()=>{ try{ localStorage.setItem('rcWatch',JSON.stringify(window.wl)); }catch(e){} try{ if(typeof wlxLists!=='undefined'){ wlxLists.l[wlxLists.a].s=window.wl.slice(); localStorage.setItem('mpWlLists',JSON.stringify(wlxLists)); } }catch(e){} };
let wlxSort='def'; try{ wlxSort=localStorage.getItem('mpWlSort')||'def'; }catch(e){}
const wlxSp={};
const wlxName=s=>(SYMS.find(x=>x[0]===s)||[s,s])[1].split(' / ')[0];
const wlxBase=s=>s.replace(/(USDT|BTC|ETH)$/,'')||s;
const wlxAlertsFor=s=>alerts.filter(a=>a.sym===s&&a.on);
function wlxSpark(v,up){ if(!v||v.length<2) return ''; const w=64,h=26,mn=Math.min(...v),mx=Math.max(...v),r=(mx-mn)||1;
  const pts=v.map((x,i)=>(i/(v.length-1)*w).toFixed(1)+','+(h-2-(x-mn)/r*(h-4)).toFixed(1)).join(' ');
  return `<svg class="wlx-sp" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none"><polyline fill="none" stroke="${up?'var(--up)':'var(--dn)'}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" points="${pts}"/></svg>`; }
function wlxAlertSheet(s,price){
  openSheet('Alert · '+wlxBase(s),()=>{
    const v={p:price?+(+price).toPrecision(7):''};
    const d=document.createElement('div'); d.className='wlx-hint'; d.textContent='Price alert for '+s+'. It watches the live price in the background, whichever chart you have open, while the app is open.'; groups.appendChild(d);
    const inp=document.createElement('input'); inp.className='cin'; inp.type='number'; inp.step='any'; inp.inputMode='decimal'; inp.value=v.p; inp.oninput=()=>{ v.p=inp.value; }; groups.appendChild(inp);
    const q=chips('Quick levels from the last price');
    [[-5],[-2],[-1],[1],[2],[5]].forEach(([p])=>chip(q,(p>0?'+':'')+p+'%',false,()=>{ if(!price) return; v.p=+(price*(1+p/100)).toPrecision(7); inp.value=v.p; }));
    const act=chips('');
    chip(act,'Set alert',false,()=>{ const L=parseFloat(v.p); if(!(L>0)){ toast('Enter a price first','#ff5d7a'); return; }
      const op=price&&L<price?'down':'up';
      alerts.push({id:++aid,name:wlxBase(s)+' '+fmt(L),sym:s,tf:'any',mode:'All conditions',trig:'Only once',on:true,sound:true,vib:true,conds:[{k:'px',op,v:L,n:14}],_was:null});
      try{ const AC=window.AudioContext||window.webkitAudioContext; actx=actx||new AC(); actx.resume(); }catch(e){}
      try{ if('Notification' in window&&Notification.permission==='default') Notification.requestPermission(); }catch(e){}
      updateAlertBtn(); save(); toast('Alert set: '+wlxBase(s)+' '+fmt(L),'#2a6df4'); wlxOpen(); },true);
    chip(act,'Back to watchlist',false,()=>wlxOpen(),true);
    const mine=alerts.filter(a=>a.sym===s&&a.conds.length===1&&a.conds[0].k==='px');
    if(mine.length){ const h=document.createElement('h4'); h.textContent='EXISTING ALERTS ON '+wlxBase(s); groups.appendChild(h);
      mine.forEach(a=>{ const r=document.createElement('div'); r.className='wlx-al'; const t=document.createElement('span'); t.textContent=condText(a.conds[0])+(a.on?'':' · off'); r.appendChild(t);
        const b=document.createElement('button'); b.textContent='Delete'; b.style.cssText='background:rgba(255,255,255,.07);color:#eee;border:0;border-radius:10px;padding:8px 14px;font-size:14px';
        b.onclick=()=>{ alerts=alerts.filter(x=>x!==a); updateAlertBtn(); save(); wlxAlertSheet(s,price); }; r.appendChild(b); groups.appendChild(r); }); } }); }
// ---------------- [wlh] watchlist top bar (menu / logo pill / search) + several lists ----------------
const WLH_COL=['#ff5d7a','#f5b942','#2dd4a7','#4dabf7','#a78bfa','#ffffff'];
let wlxLists=null; try{ wlxLists=JSON.parse(localStorage.getItem('mpWlLists')||'null'); }catch(e){}
if(!wlxLists||!Array.isArray(wlxLists.l)||!wlxLists.l.length) wlxLists={a:0,l:[{n:'Watchlist',s:window.wl.slice(),c:WLH_COL[0]}]};
if(!(wlxLists.a>=0&&wlxLists.a<wlxLists.l.length)) wlxLists.a=0;
wlxLists.l.forEach(L=>{ if(!Array.isArray(L.s)) L.s=[]; if(!L.c) L.c=WLH_COL[0]; if(!L.n) L.n='List'; });
wlxLists.l[wlxLists.a].s=window.wl.slice();      // the saved watchlist is the truth for the active list
const wlxListSave=()=>{ try{ localStorage.setItem('mpWlLists',JSON.stringify(wlxLists)); }catch(e){} };
function wlhSwitch(i){ wlxLists.l[wlxLists.a].s=window.wl.slice(); wlxLists.a=i; window.wl=wlxLists.l[i].s.slice(); wlxSave(); }
function wlhAdd(name){ wlxLists.l[wlxLists.a].s=window.wl.slice(); wlxLists.l.push({n:name,s:[],c:WLH_COL[wlxLists.l.length%WLH_COL.length]}); wlxLists.a=wlxLists.l.length-1; window.wl=[]; wlxSave(); }
function wlhDel(i){ if(wlxLists.l.length<2) return false; wlxLists.l[wlxLists.a].s=window.wl.slice(); wlxLists.l.splice(i,1);
  if(wlxLists.a>=wlxLists.l.length) wlxLists.a=wlxLists.l.length-1; else if(i<wlxLists.a) wlxLists.a--; window.wl=wlxLists.l[wlxLists.a].s.slice(); wlxSave(); return true; }
function wlhRename(i,name){ wlxLists.l[i].n=name; wlxListSave(); }
const WLH_I={dots:'<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>',
  menu:'<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  flag:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M4.5 3h2v18h-2z"/><path d="M7.5 4h12l-3.2 4.6L19.5 13h-12z"/></svg>'};
function wlxOpen(){ openSheet('',()=>{
  $('panel').classList.add('wlp');
  wlxLists.l[wlxLists.a].s=window.wl.slice();
  const mk=(tag,cls,html)=>{ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; };
  const hdr=mk('div','wlh'), bM=mk('button','wlh-i',WLH_I.dots), bU=mk('button','wlh-up','<img alt="" src="'+LOGO+'">'), bS=mk('button','wlh-i',WLH_I.search);
  bM.setAttribute('aria-label','Options'); bU.setAttribute('aria-label','Upgrade'); bS.setAttribute('aria-label','Search markets'); hdr.appendChild(bM); hdr.appendChild(bU); hdr.appendChild(bS); groups.appendChild(hdr);
  const tr=mk('div','wlt'), bL=mk('button','wlt-i',WLH_I.menu), sep=mk('i','wlt-sep'), bF=mk('button','wlt-fl',WLH_I.flag), tabs=mk('div','wlt-sc');
  bL.setAttribute('aria-label','Manage lists'); bF.setAttribute('aria-label','List colour'); [bL,sep,bF,tabs].forEach(x=>tr.appendChild(x)); groups.appendChild(tr);
  const opt=mk('div','wlo'), lm=mk('div','wlo'), edit=mk('div','wlo'); [opt,lm,edit].forEach(x=>{ x.style.display='none'; groups.appendChild(x); });
  const sortB=mk('div','chips'); opt.appendChild(sortB);
  const hint=mk('div','wlx-hint'); hint.textContent='Tap to open a market. Press and hold a row to set a price alert on it.'; opt.appendChild(hint);
  const list=document.createElement('div'); list.id='wlxList'; groups.appendChild(list);
  const panelsOff=except=>[opt,lm,edit].forEach(x=>{ if(x!==except) x.style.display='none'; });
  const toggle=x=>{ const on=x.style.display==='none'; panelsOff(x); x.style.display=on?'block':'none'; return on; };
  let data={}, timer=null, pressing=false;
  const refreshAll=()=>{ drawTabs(); drawLm(); rows(); drawEdit(); pull(); spPull(); };
  const drawTabs=()=>{ tabs.innerHTML=''; bF.style.color=wlxLists.l[wlxLists.a].c;
    wlxLists.l.forEach((L,i)=>{ const b=mk('button','wlt-t'+(i===wlxLists.a?' on':'')); b.textContent=L.n; let tm=null, fired=false;
      b.addEventListener('pointerdown',()=>{ fired=false; clearTimeout(tm); tm=setTimeout(()=>{ fired=true; if(wlxLists.l.length<2){ toast('You need at least one list','#ff5d7a'); return; }
        if(confirm('Delete the list "'+L.n+'"?')){ wlhDel(i); refreshAll(); } },650); });
      ['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>clearTimeout(tm)));
      b.onclick=()=>{ if(fired) return; if(i===wlxLists.a){ const n=prompt('Rename list',L.n); if(n&&n.trim()){ wlhRename(i,n.trim().slice(0,24)); drawTabs(); drawLm(); } } else { wlhSwitch(i); refreshAll(); } };
      tabs.appendChild(b); });
    const add=mk('button','wlt-t add'); add.textContent='+ Add list';
    add.onclick=()=>{ const n=prompt('Name for the new list','List '+(wlxLists.l.length+1)); if(!n||!n.trim()) return; wlhAdd(n.trim().slice(0,24)); refreshAll(); };
    tabs.appendChild(add); };
  const drawLm=()=>{ lm.innerHTML=''; const h=mk('h4'); h.textContent='MY LISTS'; lm.appendChild(h);
    wlxLists.l.forEach((L,i)=>{ const r=mk('div','wlh-lr'); const nm=mk('span'); nm.textContent=L.n+(i===wlxLists.a?'  (open)':'')+'  \u00b7  '+L.s.length+' markets'; r.appendChild(nm);
      const rn=mk('button',null,'Rename'); rn.onclick=()=>{ const n=prompt('Rename list',L.n); if(n&&n.trim()){ wlhRename(i,n.trim().slice(0,24)); drawTabs(); drawLm(); } };
      const dl=mk('button',null,'Delete'); dl.onclick=()=>{ if(wlxLists.l.length<2){ toast('You need at least one list','#ff5d7a'); return; } if(confirm('Delete the list "'+L.n+'"?')){ wlhDel(i); refreshAll(); } };
      r.appendChild(rn); r.appendChild(dl); lm.appendChild(r); }); };
  bM.onclick=()=>{ toggle(opt); };
  bL.onclick=()=>{ drawLm(); toggle(lm); };
  bS.onclick=()=>{ if(toggle(edit)) setTimeout(()=>{ try{ srch.focus(); }catch(e){} },60); };
  bF.onclick=()=>{ const L=wlxLists.l[wlxLists.a]; L.c=WLH_COL[(WLH_COL.indexOf(L.c)+1)%WLH_COL.length]; wlxListSave(); drawTabs(); };
  bU.onclick=()=>{ close(); setTimeout(()=>{ try{ $('bInd').click(); }catch(e){} },80); };
  const alive=()=>document.getElementById('wlxList')&&sheet.classList.contains('open');
  const drawSort=()=>{ sortB.innerHTML=''; [['def','My order'],['chg','Change ↓'],['chgup','Change ↑'],['vol','Volume'],['name','A–Z']].forEach(([k,l])=>chip(sortB,l,wlxSort===k,()=>{ wlxSort=k; try{ localStorage.setItem('mpWlSort',k); }catch(e){} drawSort(); rows(); })); };
  const order=()=>{ const a=window.wl.slice(), g=s=>data[s], pc=s=>g(s)?+g(s).priceChangePercent:null;
    if(wlxSort==='chg'||wlxSort==='chgup'){ const k=wlxSort==='chg'?-1:1; a.sort((x,y)=>{ const p=pc(x), q=pc(y); if(p==null&&q==null) return 0; if(p==null) return 1; if(q==null) return -1; return k*(p-q); }); }
    else if(wlxSort==='vol') a.sort((x,y)=>(g(y)?+g(y).quoteVolume:-1)-(g(x)?+g(x).quoteVolume:-1));
    else if(wlxSort==='name') a.sort((x,y)=>wlxBase(x).localeCompare(wlxBase(y)));
    return a; };
  function rows(){ if(pressing||!alive()) return; list.innerHTML='';
    if(!window.wl.length){ list.innerHTML='<div class="wl-e">Your watchlist is empty. Add markets below.</div>'; return; }
    order().forEach(s=>{ const d=data[s], pc=d?+d.priceChangePercent:null, r=document.createElement('div'); r.className='wl-r';
      const sp=wlxSp[s]&&wlxSp[s].v, up=sp&&sp.length>1?sp[sp.length-1]>=sp[0]:(pc==null||pc>=0), bell=wlxAlertsFor(s).length?'<span class="wlx-bell">🔔</span>':'';
      r.innerHTML=`<div class="wl-n"><b>${wlxBase(s)}${bell}</b><small>${wlxName(s)}</small></div><div class="wlx-spw">${wlxSpark(sp,up)}</div><div class="wl-p">${d?fmt(+d.lastPrice):'…'}</div><div class="wl-c ${pc==null?'':pc>=0?'up':'down'}">${pc==null?'':(pc>=0?'+':'')+pc.toFixed(2)+'%'}</div>`;
      let tm=null, moved=false, fired=false, sx=0, sy=0;
      r.addEventListener('pointerdown',e=>{ fired=false; moved=false; sx=e.clientX; sy=e.clientY; clearTimeout(tm); pressing=true;
        tm=setTimeout(()=>{ fired=true; pressing=false; if(navigator.vibrate) navigator.vibrate(25); wlxAlertSheet(s,data[s]?+data[s].lastPrice:0); },550); });
      r.addEventListener('pointermove',e=>{ if(Math.hypot(e.clientX-sx,e.clientY-sy)>10){ moved=true; clearTimeout(tm); pressing=false; } });
      ['pointerup','pointercancel','pointerleave'].forEach(ev=>r.addEventListener(ev,()=>{ clearTimeout(tm); pressing=false; }));
      r.addEventListener('contextmenu',e=>e.preventDefault());
      r.onclick=()=>{ if(fired||moved) return; const t=SYMS.find(x=>x[0]===s); if(t){ sym=t; close(); load(); } };
      list.appendChild(r); }); }
  const pull=async()=>{ if(!alive()){ clearInterval(timer); return; } if(!window.wl.length) return;
    try{ const j=await tick24(window.wl); if(j.length){ j.forEach(x=>{ data[x.symbol]=x; }); rows(); } }catch(e){} };
  const spPull=async()=>{ const need=window.wl.filter(s=>!wlxSp[s]||Date.now()-wlxSp[s].t>120000);
    await Promise.all(need.map(async s=>{ try{ const k=await (await fetch(`${RB(s)}/klines?symbol=${s}&interval=1h&limit=24`)).json(); if(Array.isArray(k)&&k.length>1) wlxSp[s]={t:Date.now(),v:k.map(x=>+x[4])}; }catch(e){} }));
    rows(); };
  const srch=document.createElement('input'); srch.className='cin'; srch.type='search'; srch.placeholder='Search markets to add or remove'; srch.oninput=()=>drawEdit(); edit.appendChild(srch); const box=document.createElement('div'); box.className='chips'; box.style.marginTop='10px'; edit.appendChild(box);
  const drawEdit=()=>{ box.innerHTML=''; SYMS.filter(s=>{ const q=(srch.value||'').trim().toLowerCase(); return !q||s[0].toLowerCase().includes(q)||s[1].toLowerCase().includes(q); }).forEach(s=>chip(box,(window.wl.includes(s[0])?'★ ':'☆ ')+s[1].split(' / ')[0],window.wl.includes(s[0]),()=>{ window.wl=window.wl.includes(s[0])?window.wl.filter(x=>x!==s[0]):window.wl.concat(s[0]); wlxSave(); drawEdit(); rows(); pull(); spPull(); })); };
  drawTabs(); drawLm(); drawSort(); rows(); drawEdit(); pull(); spPull(); timer=setInterval(()=>{ pull(); },4000); }); }
$('bWatch').onclick=wlxOpen; window.mpWatchlist=wlxOpen;
// background price alerts (alerts created by long-press use tf "any": they check the live price on any chart)
setInterval(async()=>{
  const list=alerts.filter(a=>a.on&&a.tf==='any'&&a.conds.length===1&&a.conds[0].k==='px'); if(!list.length) return;
  const syms=[...new Set(list.map(a=>a.sym))];
  try{ const j=await tickPx(syms); if(!j.length) return; const m={}; j.forEach(x=>{ m[x.symbol]=+x.price; });
    list.forEach(a=>{ const c=a.conds[0], p=m[a.sym]; if(!(p>0)||!a.on) return; const v={l:p,r:c.v}, pv=c._p; c._p=v;
      const ok=c.op==='above'?v.l>v.r:c.op==='below'?v.l<v.r:c.op==='up'?!!pv&&pv.l<=pv.r&&v.l>v.r:!!pv&&pv.l>=pv.r&&v.l<v.r;
      if(ok) fireAlert(a); }); }catch(e){} },5000);

// ---------------- [afx] Auto Fibonacci indicator (latest swing / range) ----------------
const AFX_LV=[[0,'#9aa3b5'],[.236,'#ff5d7a'],[.382,'#ff9800'],[.5,'#2dd4a7'],[.618,'#2dd4a7'],[.786,'#4dabf7'],[1,'#9aa3b5']];
const AFX_EX=[[1.272,'#b18cff'],[1.618,'#b18cff'],[2,'#b18cff']];
function afxCalc(c,p){
  const n=c.length; if(n<30) return null; let S,E,si,ei;
  if(p.mode==='Range high/low'){
    const from=Math.max(0,n-Math.round(p.range)); let hi=-Infinity,lo=Infinity,hiI=0,loI=0;
    for(let i=from;i<n;i++){ if(c[i].high>=hi){ hi=c[i].high; hiI=i; } if(c[i].low<=lo){ lo=c[i].low; loI=i; } }
    if(!(hi>lo)) return null; if(hiI>loI){ S=lo; si=loI; E=hi; ei=hiI; } else { S=hi; si=hiI; E=lo; ei=loI; }
  } else {
    const ps=Math.max(1,Math.round(p.ps)), at=atrW(c,14), piv=[], from=Math.max(ps,n-2500);
    for(let j=n-1-ps;j>=from;j--){ if(pivAt(c,j,ps,ps,'h')) piv.push({i:j,k:'h',p:c[j].high}); if(pivAt(c,j,ps,ps,'l')) piv.push({i:j,k:'l',p:c[j].low}); }
    if(piv.length<2) return null; const P0=piv[0]; let atv=0; for(let q=at.length-1;q>=0;q--) if(isFinite(at[q])){ atv=at[q]; break; }
    let Q=null; for(let k=1;k<piv.length;k++){ const q=piv[k]; if(q.k===P0.k) continue; if(Math.abs(q.p-P0.p)>=p.minAtr*atv){ Q=q; break; } }
    if(!Q) return null; E=P0.p; ei=P0.i; S=Q.p; si=Q.i;
    for(let i=P0.i+1;i<n;i++){ if(P0.k==='h'&&c[i].high>E){ E=c[i].high; ei=i; } else if(P0.k==='l'&&c[i].low<E){ E=c[i].low; ei=i; } }   // swing keeps tracking a new extreme that is not yet a confirmed pivot
  }
  if(S===E) return null; return {S,E,si,ei,up:E>S};
}
const afxPx=(r,l)=>r.E+(r.S-r.E)*l;   // 0 at the swing end, 1 at the swing start
function afxRun(c,p){
  const r=afxCalc(c,p), none={mk:[],boxes:[],labels:[],stat:''}; if(!r) return none;
  const fg=hex=>{ const h=hex.replace('#',''), l=(parseInt(h.slice(0,2),16)*299+parseInt(h.slice(2,4),16)*587+parseInt(h.slice(4,6),16)*114)/1000; return l>150?'#000':'#fff'; };
  const labels=[]; if(p.priceTags) [[0,'#9aa3b5'],[.382,'#ff9800'],[.5,'#2dd4a7'],[.618,'#2dd4a7'],[.786,'#4dabf7'],[1,'#9aa3b5']].forEach(([l,col])=>labels.push({p:afxPx(r,l),text:fmt(afxPx(r,l)),col,fg:fg(col)}));
  return {mk:[],boxes:[{type:'afibview',pts:[],r,o:p}],labels,stat:''};
}
function afxDraw(d,X,Y,W,H){
  const r=d.r,o=d.o; if(!r) return; const xs=X(r.si), xe=X(r.ei), ys=Y(r.S), ye=Y(r.E); if(xs==null||xe==null||ys==null||ye==null) return;
  const lv=AFX_LV.concat(o.ext?AFX_EX:[]), x0=Math.min(xs,xe), x1=o.extR!==false?W:Math.max(xs,xe), tx=Math.max(x0,0)+4, lw=o.w||1;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  if(o.fillOn!==false) for(let k=1;k<AFX_LV.length;k++){ const ya=Y(afxPx(r,AFX_LV[k-1][0])), yb=Y(afxPx(r,AFX_LV[k][0])); if(ya==null||yb==null) continue; cx.globalAlpha=.05; cx.fillStyle=AFX_LV[k][1]; cx.fillRect(x0,Math.min(ya,yb),x1-x0,Math.abs(yb-ya)); }
  if(o.gp!==false){ const ya=Y(afxPx(r,.618)), yb=Y(afxPx(r,.65)); if(ya!=null&&yb!=null){ cx.globalAlpha=.28; cx.fillStyle=o.gpCol||'#fbc02d'; cx.fillRect(x0,Math.min(ya,yb),x1-x0,Math.max(2,Math.abs(yb-ya))); } }
  cx.globalAlpha=1; cx.lineWidth=lw; cx.font='11px system-ui'; cx.textAlign='left'; cx.textBaseline='bottom';
  lv.forEach(([l,col])=>{ const y=Y(afxPx(r,l)); if(y==null) return; cx.strokeStyle=col; cx.globalAlpha=(l===0||l===1)?.9:.75; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.globalAlpha=1; cx.fillStyle=col; cx.fillText(l+'  ('+fmt(afxPx(r,l))+')',tx,y-2); });
  cx.strokeStyle=o.col||'#f5b942'; cx.lineWidth=lw+.5; cx.setLineDash([5,4]); cx.globalAlpha=.8; cx.beginPath(); cx.moveTo(xs,ys); cx.lineTo(xe,ye); cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1;
  cx.fillStyle=o.col||'#f5b942'; [[xs,ys],[xe,ye]].forEach(q=>{ cx.beginPath(); cx.arc(q[0],q[1],3.5,0,7); cx.fill(); });
  const mv=Math.abs(r.E-r.S), pc=mv/Math.min(r.E,r.S)*100; cx.textBaseline=r.up?'bottom':'top'; cx.textAlign='center'; cx.font='600 11px system-ui';
  cx.fillText((r.up?'▲ ':'▼ ')+fmt(mv)+' ('+pc.toFixed(1)+'%)',Math.max(20,Math.min(W-60,xe)),ye+(r.up?-8:8));
  cx.restore();
}
IND.afib={label:'Auto Fibonacci (latest swing)',title:'Auto Fibonacci',cat:'Trend',cols:[],calc:()=>[],live:true,
  nm:p=>'Auto Fib '+(p.mode==='Latest swing'?'swing '+p.ps:'range '+p.range),
  p:{mode:'Latest swing',ps:5,minAtr:2,range:200,ext:false,gp:true,fillOn:true,extR:true,priceTags:false,col:'#f5b942',gpCol:'#fbc02d',w:1},
  fields:[['mode','sel','Swing detection',{opts:['Latest swing','Range high/low']}],['ps','num','Swing strength (bars each side)',{min:1,max:30,step:1}],
    ['minAtr','num','Min swing size (x ATR)',{min:0,step:.5}],['range','num','Range length in bars (range mode)',{min:20,max:5000,step:10}],
    ['ext','chk','Show extensions (1.272 / 1.618 / 2)'],['gp','chk','Highlight golden pocket (0.618 – 0.65)'],['fillOn','chk','Fill between levels'],
    ['extR','chk','Extend lines to the right'],['priceTags','chk','Price tags on the scale']],
  styleTab:(b,d)=>{ fld(b,d.p,'col','col','Swing line colour'); fld(b,d.p,'gpCol','col','Golden pocket colour'); fld(b,d.p,'w','sel','Line width',{opts:[1,2,3],num:1}); },
  extras:(c,p)=>afxRun(c,p)};

// ---------------- [fbx] Fib retracement drawing: extend right, bands, golden pocket, extensions ----------------
// Fib retracement: levels, colours and options match the TradingView settings screenshots
const FBX_LV=[[0,1,'#808080'],[0.706,1,'#f23645'],[0.618,1,'#ff9700'],[1,1,'#4cb050'],[0.76,1,'#079a80'],[0.786,0,'#0d6b77'],[1,0,'#4d4d4d'],[1.618,0,'#233e8d'],[2.618,0,'#852830'],[3.618,0,'#5a2165'],[4.236,0,'#811c3e'],[1.272,0,'#8d590d'],[1.414,0,'#852830'],[2.272,0,'#8d590d'],[2.414,0,'#346635'],[2,0,'#115b4e'],[3,0,'#0d6b77'],[3.272,0,'#4d4d4d'],[3.414,0,'#233e8d'],[4,0,'#852830'],[4.272,0,'#5a2165'],[4.414,0,'#811c3e'],[4.618,0,'#8d590d'],[4.764,0,'#115b4e']];
const FBX_EXT=["Don't extend",'Extend lines left','Extend lines right','Extend lines both'];
const FBX_DEF=()=>({tOn:true,tCol:'#808080',tDash:true,lSty:'Solid',lw:1,extM:'Extend lines right',one:false,oneCol:'#2dd4a7',bgOn:true,bgA:.22,rev:false,pricesOn:true,lvOn:true,lvMode:'Values',lblH:'Left',lblV:'Middle',txtOn:true,txt:'',txtH:'Center',txtV:'Middle',fs:12,logSc:false,lv:FBX_LV.map(q=>q.slice())});
function fbxInit(d){ const o=d.o||(d.o={}); if(o.extM===undefined) o.extM=(o.extR===false?FBX_EXT[0]:FBX_EXT[2]);
  const df=FBX_DEF(); let added=false; Object.keys(df).forEach(k=>{ if(o[k]===undefined){ o[k]=df[k]; added=true; } }); if(added&&d===sel) dbarUpdate(); return o; }
function fbxPrice(o,A,B,l){ if(o.logSc&&A>0&&B>0) return Math.exp(Math.log(B)+(Math.log(A)-Math.log(B))*l); return B+(A-B)*l; }
function fbxDraw(d,X,Y,W,H){
  const P=d.pts.map(q=>[X(q.i),Y(q.p)]); if(P.some(q=>q[0]==null||q[1]==null)) return;
  const o=fbxInit(d), A=o.rev?d.pts[1].p:d.pts[0].p, B=o.rev?d.pts[0].p:d.pts[1].p, px=l=>fbxPrice(o,A,B,l);
  const xl=Math.min(P[0][0],P[1][0]), xr=Math.max(P[0][0],P[1][0]), eL=o.extM===FBX_EXT[1]||o.extM===FBX_EXT[3], eR=o.extM===FBX_EXT[2]||o.extM===FBX_EXT[3];
  const x0=eL?0:xl, x1=eR?W:Math.max(xr,xl+90), L=(o.lv||[]).filter(q=>q[1]&&isFinite(+q[0])), colOf=q=>o.one?o.oneCol:q[2];
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  if(o.bgOn){ const S=L.slice().sort((p,q)=>p[0]-q[0]); for(let k=1;k<S.length;k++){ if(S[k][0]===S[k-1][0]) continue; const ya=Y(px(S[k-1][0])), yb=Y(px(S[k][0])); if(ya==null||yb==null) continue; cx.globalAlpha=o.bgA; cx.fillStyle=colOf(S[k]); cx.fillRect(x0,Math.min(ya,yb),x1-x0,Math.abs(yb-ya)); } }
  cx.globalAlpha=1; cx.lineWidth=o.lw||1; cx.font=(o.fs||12)+'px system-ui'; cx.textBaseline='middle';
  const dash=o.lSty==='Dashed'?[6,4]:o.lSty==='Dotted'?[2,3]:[];
  L.forEach(q=>{ const l=+q[0], pr=px(l), y=Y(pr); if(y==null) return; const c=colOf(q); cx.strokeStyle=c; cx.fillStyle=c; cx.setLineDash(dash); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]);
    const parts=[]; if(o.lvOn) parts.push(o.lvMode==='Percents'?(Math.round(l*10000)/100)+'%':String(l)); if(o.pricesOn) parts.push(o.lvOn?'('+fmt(pr)+')':fmt(pr)); if(!parts.length) return; const t=parts.join(' '), tw=cx.measureText(t).width; let lx, al, ly=y, bl='middle';
    if(o.lblV==='Middle'&&o.lblH==='Left'){ lx=x0-4; al='right'; if(lx-tw<2){ lx=x0+4; al='left'; } }
    else if(o.lblV==='Middle'&&o.lblH==='Right'){ lx=x1+4; al='left'; if(lx+tw>W-2){ lx=x1-4; al='right'; } }
    else { al=o.lblH==='Right'?'right':o.lblH==='Center'?'center':'left'; lx=al==='right'?x1-4:al==='center'?(x0+x1)/2:x0+4; if(o.lblV==='Top'){ bl='bottom'; ly=y-2; } else if(o.lblV==='Bottom'){ bl='top'; ly=y+2; } }
    cx.textAlign=al; cx.textBaseline=bl; cx.fillText(t,lx,ly); });
  if(o.tOn){ cx.strokeStyle=o.tCol; cx.lineWidth=1; cx.setLineDash(o.tDash?[5,4]:[]); cx.beginPath(); cx.moveTo(P[0][0],P[0][1]); cx.lineTo(P[1][0],P[1][1]); cx.stroke(); cx.setLineDash([]); }
  if(o.txtOn&&o.txt){ const lp=P[0][0]<=P[1][0]?P[0]:P[1], rp=P[0][0]<=P[1][0]?P[1]:P[0], f=o.txtH==='Left'?0:o.txtH==='Right'?1:.5, tx=lp[0]+(rp[0]-lp[0])*f, ty=lp[1]+(rp[1]-lp[1])*f;
    cx.fillStyle=o.tCol; cx.font=(o.fs||12)+'px system-ui'; cx.textAlign=o.txtH==='Left'?'left':o.txtH==='Right'?'right':'center'; cx.textBaseline=o.txtV==='Top'?'bottom':o.txtV==='Bottom'?'top':'middle'; cx.fillText(o.txt,tx,ty+(o.txtV==='Top'?-4:o.txtV==='Bottom'?4:0)); }
  if(d===sel){ cx.fillStyle='#fff'; cx.strokeStyle='#2962ff'; cx.lineWidth=2; hlist(d,X,Y).forEach(h=>{ cx.beginPath(); cx.arc(h.x,h.y,7,0,7); cx.fill(); cx.stroke(); }); }
  cx.restore();
}
// settings dialog: Style / Coordinates / Visibility, same order and options as the screenshots
function fbxSettings(d){
  fbxInit(d);
  const E=(t,p)=>Object.assign(document.createElement(t),p||{});
  const row=(b,label,els)=>{ const r=E('label',{className:'fr'}); if(label!=null) r.appendChild(E('span',{textContent:label})); const w=E('span'); w.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end'; els.forEach(e=>w.appendChild(e)); r.appendChild(w); b.appendChild(r); return r; };
  const chk=(o,k)=>E('input',{type:'checkbox',checked:!!o[k],onchange(){ o[k]=this.checked; }});
  const col=(o,k)=>{ const e=E('input',{type:'color',value:o[k]||'#808080',oninput(){ o[k]=this.value; }}); e.style.cssText='width:44px;height:34px;padding:0;border:1px solid #333;border-radius:8px;background:none'; return e; };
  const sel=(o,k,opts,num)=>{ const e=E('select'); opts.forEach(x=>e.appendChild(E('option',{value:x,textContent:x}))); e.value=o[k]; e.onchange=()=>{ o[k]=num?+e.value:e.value; }; e.style.width='auto'; return e; };
  const numI=(o,k,step,min,max)=>{ const e=E('input',{type:'number',value:o[k],oninput(){ const v=parseFloat(this.value); if(!isNaN(v)) o[k]=v; }}); e.step=step||'any'; if(min!=null) e.min=min; if(max!=null) e.max=max; return e; };
  const pts=()=>d.pts.map(q=>({i:+q.i.toFixed(2),p:q.p}));
  openModal('Fib retracement',{
    Style:(b,dr)=>{ const o=dr.o;
      row(b,'Trend line',[chk(o,'tOn'),col(o,'tCol'),sel(o,'tDash',['Dashed','Solid'])]);
      const ts=b.lastChild.querySelector('select'); ts.value=o.tDash?'Dashed':'Solid'; ts.onchange=()=>{ o.tDash=ts.value==='Dashed'; };
      row(b,'Levels line',[sel(o,'lSty',['Solid','Dashed','Dotted']),sel(o,'lw',[1,2,3,4],true)]);
      row(b,'Extend',[sel(o,'extM',FBX_EXT)]);
      o.lv.forEach(q=>{ const r=E('div',{className:'fr'}); r.style.justifyContent='flex-start';
        const c=E('input',{type:'checkbox',checked:!!q[1],onchange(){ q[1]=this.checked?1:0; }}), n=E('input',{type:'number',value:q[0],oninput(){ const v=parseFloat(this.value); if(!isNaN(v)) q[0]=v; }}); n.step='any';
        const k=E('input',{type:'color',value:q[2],oninput(){ q[2]=this.value; }}); k.style.cssText='width:44px;height:34px;padding:0;border:1px solid #333;border-radius:8px;background:none';
        r.append(c,n,k); b.appendChild(r); });
      row(b,'Use one color',[chk(o,'one'),col(o,'oneCol')]);
      const bg=E('input',{type:'range',min:0,max:100,value:Math.round(o.bgA*100),oninput(){ o.bgA=this.value/100; }}); bg.style.width='140px';
      row(b,'Background',[chk(o,'bgOn'),bg]);
      row(b,'Reverse',[chk(o,'rev')]); row(b,'Prices',[chk(o,'pricesOn')]);
      row(b,'Levels',[chk(o,'lvOn'),sel(o,'lvMode',['Values','Percents'])]);
      row(b,'Labels',[sel(o,'lblH',['Left','Center','Right']),sel(o,'lblV',['Top','Middle','Bottom'])]);
      row(b,'Text',[chk(o,'txtOn'),sel(o,'txtH',['Left','Center','Right']),sel(o,'txtV',['Top','Middle','Bottom'])]);
      const ti=E('input',{type:'text',value:o.txt||'',placeholder:'Text on the trend line',oninput(){ o.txt=this.value; }}); ti.style.width='100%'; b.appendChild(ti);
      row(b,'Font size',[sel(o,'fs',[10,11,12,14,16,20,24,28,32,40],true)]);
      row(b,'Fib levels based on log scale',[chk(o,'logSc')]); },
    Coordinates:(b,dr)=>dr.pts.forEach((q,k)=>row(b,'#'+(k+1)+' (price, bar)',[numI(q,'p','any'),numI(q,'i','any')])),
    Visibility:(b,dr)=>visFlds(b,dr.vis)
  },{o:clone(d.o),vis:{...(d.vis||VIS0())},pts:pts()},
  dr=>{ d.o=Object.assign(d.o||{},dr.o); d.vis=dr.vis; d.pts=dr.pts; dbarUpdate(); recomputeExtras(); render(); },
  ()=>({o:FBX_DEF(),vis:VIS0(),pts:pts()}));
}

// ---------------- [avx] Anchored VWAP: bands, source, label, selectable along the line ----------------
const avxSrc=(c,s)=>s==='close'?c.close:s==='hl2'?(c.high+c.low)/2:s==='ohlc4'?(c.open+c.high+c.low+c.close)/4:(c.high+c.low+c.close)/3;
function avxInit(d){ const o=d.o||(d.o={}); const df={vcol:'#ec407a',w:2,src:'hlc3',bands:false,m1:1,m2:2,labelOn:true};
  Object.keys(df).forEach(k=>{ if(o[k]===undefined) o[k]=df[k]; }); return o; }
function avxDraw(d,X,Y,W,H){
  const o=avxInit(d), n=candles.length, i0=Math.max(0,Math.round(d.pts[0].i)); if(i0>=n) return;
  let pv=0,vv=0,pv2=0; const A=[];
  for(let k=i0;k<n;k++){ const c=candles[k], v=c.volume||0, p=avxSrc(c,o.src); pv+=p*v; pv2+=p*p*v; vv+=v; if(!vv) continue;
    const m=pv/vv, sd=Math.sqrt(Math.max(0,pv2/vv-m*m)), x=X(k); if(x==null) continue; A.push({x,m,sd}); }
  if(A.length<1){ d._ln=null; return; }
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  const path=f=>{ cx.beginPath(); let go=false; A.forEach(q=>{ const y=Y(f(q)); if(y==null||!isFinite(y)) return; go?cx.lineTo(q.x,y):cx.moveTo(q.x,y); go=true; }); };
  if(o.bands){ const band=(mu,al,dash)=>{ path(q=>q.m+mu*q.sd); cx.globalAlpha=al; cx.strokeStyle=o.vcol; cx.lineWidth=1; cx.setLineDash(dash); cx.stroke(); path(q=>q.m-mu*q.sd); cx.stroke(); cx.setLineDash([]); };
    const poly=(mu,al)=>{ cx.beginPath(); let go=false; A.forEach(q=>{ const y=Y(q.m+mu*q.sd); if(y==null) return; go?cx.lineTo(q.x,y):cx.moveTo(q.x,y); go=true; }); for(let k=A.length-1;k>=0;k--){ const q=A[k], y=Y(q.m-mu*q.sd); if(y==null) continue; cx.lineTo(q.x,y); } cx.closePath(); cx.globalAlpha=al; cx.fillStyle=o.vcol; cx.fill(); };
    poly(o.m2,.05); poly(o.m1,.08); band(o.m1,.55,[]); band(o.m2,.45,[4,4]); }
  cx.globalAlpha=1; path(q=>q.m); cx.strokeStyle=o.vcol; cx.lineWidth=o.w||2; cx.stroke();
  const L=A[A.length-1], y0=Y(A[0].m), yl=Y(L.m); cx.fillStyle=o.vcol;
  if(y0!=null){ cx.beginPath(); cx.arc(A[0].x,y0,4,0,7); cx.fill(); }
  if(o.labelOn&&yl!=null){ cx.font='600 11px system-ui'; cx.textAlign='right'; cx.textBaseline='bottom'; cx.fillText('AVWAP '+fmt(L.m),W-6,yl-4); }
  d._ln=A.map(q=>[q.x,Y(q.m)]).filter(q=>q[1]!=null&&isFinite(q[1]));
  if(d===sel){ cx.fillStyle='#fff'; cx.strokeStyle='#2962ff'; cx.lineWidth=2; hlist(d,X,Y).forEach(h=>{ cx.beginPath(); cx.arc(h.x,h.y,7,0,7); cx.fill(); cx.stroke(); }); }
  cx.restore();
}
const _avxPick=pick; pick=function(mx,my){ const r=_avxPick.apply(this,arguments); if(r) return r;
  for(let k=drawings.length-1;k>=0;k--){ const d=drawings[k]; if(d.type!=='avwap'||!d._ln) continue; if(d.hidden||d.vis&&!d.vis[tfGroup()]) continue;
    const L=d._ln; for(let i=1;i<L.length;i++) if(segDist(mx,my,L[i-1],L[i])<14) return d; }
  return null; };
function avxStart(){ pending={type:'avwap',n:1,label:'Anchored VWAP',pts:[],o:DEFO('avwap'),vis:VIS0()}; setStatus('Anchored VWAP: tap a candle to anchor'); }

// route the three drawing types to the upgraded renderers
const _fbxDraw=draw; draw=function(d,X,Y,W,H){
  if(d&&d.type==='afibview') return afxDraw(d,X,Y,W,H);
  if(d&&d.type==='fib'&&d.pts&&d.pts.length>1) return fbxDraw(d,X,Y,W,H);
  if(d&&d.type==='avwap'&&d.pts&&d.pts.length) return avxDraw(d,X,Y,W,H);
  return _fbxDraw.apply(this,arguments); };

// settings dialog for the two upgraded drawings
const _fbxSettings=drawSettings; drawSettings=function(d){
  if(d.type==='fib') return fbxSettings(d);
  if(d.type!=='avwap') return _fbxSettings.apply(this,arguments);
  const isFib=d.type==='fib'; if(isFib) fbxInit(d); else avxInit(d);
  const pts=()=>d.pts.map(q=>({i:+q.i.toFixed(2),p:q.p}));
  const dflt=()=>isFib?{color:DC,w:1,extR:true,fillOn:true,ext:false,gp:true,pricesOn:true,rev:false}:{vcol:'#ec407a',w:2,src:'hlc3',bands:false,m1:1,m2:2,labelOn:true};
  openModal(isFib?'Fib retracement':'Anchored VWAP',{
    Inputs:(b,dr)=>{ const o=dr.o;
      if(isFib){ fld(b,o,'extR','chk','Extend lines to the right'); fld(b,o,'fillOn','chk','Fill between levels'); fld(b,o,'gp','chk','Highlight golden pocket (0.618 – 0.65)'); fld(b,o,'ext','chk','Show extensions (1.272 / 1.618 / 2)'); fld(b,o,'pricesOn','chk','Show prices'); fld(b,o,'rev','chk','Reverse (0 at the first point)'); }
      else { fld(b,o,'src','sel','Source',{opts:['hlc3','close','hl2','ohlc4']}); fld(b,o,'bands','chk','Show standard-deviation bands'); fld(b,o,'m1','num','Band 1 multiplier',{min:.1,step:.1}); fld(b,o,'m2','num','Band 2 multiplier',{min:.1,step:.1}); fld(b,o,'labelOn','chk','Show value label'); } },
    Style:(b,dr)=>{ fld(b,dr.o,isFib?'color':'vcol','col','Color'); fld(b,dr.o,'w','sel','Line width',{opts:[1,2,3,4],num:1}); },
    Coordinates:(b,dr)=>dr.pts.forEach((q,k)=>{ fld(b,q,'p','num','Price '+(k+1),{step:'any'}); fld(b,q,'i','num','Bar '+(k+1),{step:'any'}); }),
    Visibility:(b,dr)=>visFlds(b,dr.vis)
  },{o:clone(d.o),vis:{...(d.vis||VIS0())},pts:pts()},
  dr=>{ d.o=Object.assign(d.o||{},dr.o); d.vis=dr.vis; d.pts=dr.pts; dbarUpdate(); recomputeExtras(); render(); },
  ()=>({o:dflt(),vis:VIS0(),pts:pts()}));
};

// quick access in the ⋯ menu
{ const _mo=$('bMore').onclick; $('bMore').onclick=function(){ if(_mo) _mo.apply(this,arguments);
  const before=groups.children.length, b=chips('Fib & VWAP');
  chip(b,'◬ Auto Fibonacci on the latest swing',false,()=>{ addInd('afib'); close(); },true);
  chip(b,'≈ Anchored VWAP: tap a candle',false,()=>{ close(); avxStart(); },true);
  [].slice.call(groups.children,before).reverse().forEach(el=>groups.insertBefore(el,groups.firstChild)); }; }
}catch(err){ console.error('upgrade pack failed',err); window.__upErr=err; }


try{
// =====================================================================================
// [smc] SMART MONEY CONCEPT (SMC) - isolated block (every name starts with smc / SMC_).
// Indicator. Market structure (BOS / CHoCH), order blocks, equal highs/lows,
// fair value gaps, previous day/week/month levels and premium/discount zones.
// Everything is drawn on the chart canvas; nothing outside this block is changed except
// that it registers IND.smc and one extra branch in draw().
// =====================================================================================

// ---------- [smc] defaults (same inputs and starting values as the LuxAlgo panel) ----------
const SMC_DEF={
  mode:'Historical', style:'Colored',
  intOn:true, intBull:'All', intBear:'All', conf:false, intSize:'tiny',
  swOn:true, swBull:'All', swBear:'All', swSize:'small', swPts:false, swLen:50, strong:true,
  intOb:true, intObN:5, swOb:false, swObN:5, obFilter:'Atr', obMit:'High/Low',
  eqOn:true, eqLen:3, eqThr:0.1, eqSize:'tiny',
  fvgOn:false, fvgAuto:true, fvgExt:1,
  dOn:false, wOn:false, mOn:false, hlStyle:'Solid',
  pdOn:false,
  bull:'#089981', bear:'#F23645',
  ibCol:'#3179f5', ibeCol:'#f77c80', sbCol:'#1848cc', sbeCol:'#b22833',
  fvgBull:'#00ff68', fvgBear:'#ff0008', hlCol:'#2962ff',
  prem:'#F23645', eqz:'#b2b5be', disc:'#089981'
};

// ---------- [smc] calculation (a port of the LuxAlgo Pine logic) ----------
function smcCompute(c0,p){
  const CAP=6000, off=Math.max(0,c0.length-CAP), c=off?c0.slice(off):c0, n=c.length;
  const R={off,n,ev:[],eq:[],pts:[],hl:[],obI:[],obS:[],fvg:[],tr:null,bias:{sw:0,int:0},zone:null};
  if(n<12) return R;

  // volatility measures used by the order block filter and the EQH/EQL threshold
  const atr=new Array(n), cm=new Array(n); let sTr=0, rma=0;
  for(let i=0;i<n;i++){ const b=c[i], tr=i?Math.max(b.high-b.low,Math.abs(b.high-c[i-1].close),Math.abs(b.low-c[i-1].close)):b.high-b.low;
    sTr+=tr; cm[i]=sTr/(i+1); rma=i<200?sTr/(i+1):(rma*199+tr)/200; atr[i]=rma; }
  const vol=p.obFilter==='Atr'?atr:cm, pH=new Array(n), pL=new Array(n);
  for(let i=0;i<n;i++){ const b=c[i], hv=(b.high-b.low)>=2*vol[i]; pH[i]=hv?b.low:b.high; pL[i]=hv?b.high:b.low; }

  const mkPv=()=>({cur:NaN,last:NaN,crossed:false,idx:-1});
  const sH=mkPv(), sL=mkPv(), iH=mkPv(), iL=mkPv(), eH=mkPv(), eL=mkPv();
  const trail={top:NaN,bot:NaN,topI:-1,botI:-1}, bias=R.bias, leg={sw:0,int:0,eq:0};
  const sizes={sw:Math.max(2,Math.round(p.swLen)),int:5,eq:Math.max(1,Math.round(p.eqLen))};
  const obI=[], obS=[], fvgs=[]; let cumD=0;

  for(let i=0;i<n;i++){
    const b=c[i], pc=i?c[i-1].close:b.close;
    const old={sH:sH.cur,sL:sL.cur,iH:iH.cur,iL:iL.cur};   // levels as they stood at the end of the previous bar (for crossover / crossunder)

    // 1) confirm pivots
    const pivot=kind=>{
      const size=sizes[kind]; if(i<size) return;
      const prev=leg[kind]; let nl=prev; const j=i-size; let hi=-Infinity, lo=Infinity;
      for(let k=j+1;k<=i;k++){ if(c[k].high>hi) hi=c[k].high; if(c[k].low<lo) lo=c[k].low; }
      if(c[j].high>hi) nl=0; else if(c[j].low<lo) nl=1;
      leg[kind]=nl; if(nl===prev) return;
      if(nl===1){   // a swing low is confirmed at bar j
        const pv=kind==='sw'?sL:kind==='int'?iL:eL;
        if(kind==='eq'&&!isNaN(pv.cur)&&Math.abs(pv.cur-c[j].low)<p.eqThr*atr[i]) R.eq.push({x0:pv.idx,y0:pv.cur,x1:j,y1:c[j].low,hi:false});
        pv.last=pv.cur; pv.cur=c[j].low; pv.crossed=false; pv.idx=j;
        if(kind==='sw'){ trail.bot=pv.cur; trail.botI=j; R.pts.push({i:j,y:pv.cur,t:pv.cur<pv.last?'LL':'HL',hi:false}); }
      } else {      // a swing high is confirmed at bar j
        const pv=kind==='sw'?sH:kind==='int'?iH:eH;
        if(kind==='eq'&&!isNaN(pv.cur)&&Math.abs(pv.cur-c[j].high)<p.eqThr*atr[i]) R.eq.push({x0:pv.idx,y0:pv.cur,x1:j,y1:c[j].high,hi:true});
        pv.last=pv.cur; pv.cur=c[j].high; pv.crossed=false; pv.idx=j;
        if(kind==='sw'){ trail.top=pv.cur; trail.topI=j; R.pts.push({i:j,y:pv.cur,t:pv.cur>pv.last?'HH':'LH',hi:true}); }
      }
    };
    pivot('sw'); pivot('int'); if(p.eqOn) pivot('eq');

    // 2) order block taken from the candles between the broken pivot and now
    const storeOb=(pv,internal,dir)=>{
      let k=-1, best=dir===1?Infinity:-Infinity;
      for(let q=pv.idx;q<i;q++){ if(dir===1){ if(pL[q]<best){ best=pL[q]; k=q; } } else if(pH[q]>best){ best=pH[q]; k=q; } }
      if(k<0) return; const L=internal?obI:obS;
      L.unshift({i:k,hi:Math.max(pH[k],pL[k]),lo:Math.min(pH[k],pL[k]),bull:dir===1}); if(L.length>100) L.pop();
    };

    // 3) structure breaks: BOS continues the trend, CHoCH flips it
    const disp=internal=>{
      const hi=internal?iH:sH, lo=internal?iL:sL, h0=internal?old.iH:old.sH, l0=internal?old.iL:old.sL, key=internal?'int':'sw';
      let bullBar=true, bearBar=true;
      if(internal&&p.conf){ const up=b.high-Math.max(b.close,b.open), dn=Math.min(b.close,b.open-b.low); bullBar=up>dn; bearBar=up<dn; }
      if(b.close>hi.cur&&pc<=h0&&!hi.crossed&&(!internal||(iH.cur!==sH.cur&&bullBar))){
        const tag=bias[key]===-1?'CHoCH':'BOS'; bias[key]=1; hi.crossed=true;
        R.ev.push({int:internal,bull:true,tag,x0:hi.idx,x1:i,y:hi.cur});
        if(internal?p.intOb:p.swOb) storeOb(hi,internal,1);
      }
      if(b.close<lo.cur&&pc>=l0&&!lo.crossed&&(!internal||(iL.cur!==sL.cur&&bearBar))){
        const tag=bias[key]===1?'CHoCH':'BOS'; bias[key]=-1; lo.crossed=true;
        R.ev.push({int:internal,bull:false,tag,x0:lo.idx,x1:i,y:lo.cur});
        if(internal?p.intOb:p.swOb) storeOb(lo,internal,-1);
      }
    };
    disp(true); disp(false);

    // 4) mitigated order blocks disappear
    const sBear=p.obMit==='Close'?b.close:b.high, sBull=p.obMit==='Close'?b.close:b.low;
    [obI,obS].forEach(L=>{ for(let q=L.length-1;q>=0;q--){ const o=L[q]; if(o.bull?sBull<o.lo:sBear>o.hi) L.splice(q,1); } });

    // 5) fair value gaps (three-candle gaps bigger than the average body), removed once filled
    if(p.fvgOn&&i>=2){
      const l1=c[i-1], d=(l1.close-l1.open)/(l1.open*100); cumD+=Math.abs(d);
      const thr=p.fvgAuto?cumD/i*2:0;
      for(let q=fvgs.length-1;q>=0;q--){ const f=fvgs[q]; if(f.bull?b.low<f.lo:b.high>f.hi) fvgs.splice(q,1); }
      if(b.low>c[i-2].high&&l1.close>c[i-2].high&&d>thr) fvgs.push({i:i-1,hi:b.low,lo:c[i-2].high,bull:true});
      else if(b.high<c[i-2].low&&l1.close<c[i-2].low&&-d>thr) fvgs.push({i:i-1,hi:c[i-2].low,lo:b.high,bull:false});
    }

    // 6) the swing range keeps stretching until a new swing pivot resets it
    if(!isNaN(trail.top)&&b.high>=trail.top){ trail.top=b.high; trail.topI=i; }
    if(!isNaN(trail.bot)&&b.low<=trail.bot){ trail.bot=b.low; trail.botI=i; }
  }

  R.obI=obI.slice(0,Math.max(0,Math.round(p.intObN))); R.obS=obS.slice(0,Math.max(0,Math.round(p.swObN)));
  R.fvg=fvgs.slice(-300); R.tr=trail;
  if(p.pdOn&&!isNaN(trail.top)&&!isNaN(trail.bot)&&trail.top>trail.bot) R.zone={i0:Math.min(trail.topI,trail.botI),top:trail.top,bot:trail.bot};

  // previous day / week / month high and low (UTC periods, from the candles that are loaded)
  const bucket=(t,k)=>{ const dd=Math.floor(t/86400); if(k==='d') return dd; if(k==='w') return Math.floor((dd+3)/7); const D=new Date(t*1000); return D.getUTCFullYear()*12+D.getUTCMonth(); };
  [['d',p.dOn,'PD'],['w',p.wOn,'PW'],['m',p.mOn,'PM']].forEach(([k,on,L])=>{ if(!on) return;
    let curB=null, cur=null, prev=null;
    for(let i=0;i<n;i++){ const bk=bucket(c[i].time,k);
      if(bk!==curB){ if(cur) prev=cur; cur={i0:i,hi:c[i].high,lo:c[i].low}; curB=bk; }
      else { if(c[i].high>cur.hi) cur.hi=c[i].high; if(c[i].low<cur.lo) cur.lo=c[i].low; } }
    if(prev) R.hl.push({i0:prev.i0,hi:prev.hi,lo:prev.lo,L}); });
  return R;
}

// ---------- [smc] drawing ----------
function smcDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r||!r.n) return;
  const mono=o.style==='Monochrome', bull=mono?'#b2b5be':o.bull, bear=mono?'#5d606b':o.bear, FS={tiny:9,small:11,normal:13};
  const XI=i=>X(i+r.off), pres=o.mode==='Present', last=r.n-1;
  const font=s=>{ cx.font=(FS[s]||11)+'px system-ui'; };
  const line=(x0,y0,x1,y1,col,dash,w,a)=>{ cx.globalAlpha=a==null?1:a; cx.strokeStyle=col; cx.lineWidth=w||1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y1); cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1; };
  const box=(i0,iR,top,bot,col,a)=>{ const x0=XI(i0), x1=iR==null?W:XI(iR), y0=Y(top), y1=Y(bot); if(x0==null||x1==null||y0==null||y1==null||x1<0||x0>W) return;
    const t=Math.min(y0,y1), h=Math.max(1,Math.abs(y1-y0)); cx.globalAlpha=a; cx.fillStyle=col; cx.fillRect(x0,t,x1-x0,h); cx.globalAlpha=Math.min(1,a*2.4); cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(x0,t,x1-x0,h); cx.globalAlpha=1; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';

  // premium / equilibrium / discount zones
  if(o.pdOn&&r.zone){ const z=r.zone, T=z.top, B=z.bot, bands=[[T,.95*T+.05*B,o.prem,'Premium'],[.525*T+.475*B,.525*B+.475*T,o.eqz,'Equilibrium'],[.95*B+.05*T,B,o.disc,'Discount']];
    cx.textAlign='right'; font('small');
    bands.forEach(([a,b2,col,txt])=>{ box(z.i0,null,a,b2,col,.12); const ya=Y(a), yb=Y(b2); if(ya==null||yb==null) return; cx.fillStyle=col; cx.fillText(txt,W-6,(ya+yb)/2); }); }

  // fair value gaps
  if(o.fvgOn) r.fvg.forEach(f=>box(f.i,last+Math.max(0,Math.round(o.fvgExt)),f.hi,f.lo,f.bull?(mono?'#b2b5be':o.fvgBull):(mono?'#5d606b':o.fvgBear),.2));

  // order blocks (reach to the right edge until price mitigates them)
  if(o.intOb) r.obI.forEach(b=>box(b.i,null,b.hi,b.lo,mono?(b.bull?'#b2b5be':'#5d606b'):(b.bull?o.ibCol:o.ibeCol),.22));
  if(o.swOb) r.obS.forEach(b=>box(b.i,null,b.hi,b.lo,mono?(b.bull?'#b2b5be':'#5d606b'):(b.bull?o.sbCol:o.sbeCol),.28));

  // previous day / week / month levels
  const ds=o.hlStyle==='Dashed'?[6,4]:o.hlStyle==='Dotted'?[2,3]:[]; cx.textAlign='right'; font('small');
  r.hl.forEach(h=>{ const x0=XI(h.i0); if(x0==null) return; [[h.hi,'H'],[h.lo,'L']].forEach(([v,s])=>{ const y=Y(v); if(y==null) return;
      line(Math.max(x0,0),y,W,y,o.hlCol,ds,1); cx.fillStyle=o.hlCol; cx.fillText(h.L+s,W-6,y-7); }); });

  // market structure lines with BOS / CHoCH labels
  const pass=(f,t)=>f==='All'||f===t;
  let ev=r.ev.filter(e=>e.int?(o.intOn&&pass(e.bull?o.intBull:o.intBear,e.tag)):(o.swOn&&pass(e.bull?o.swBull:o.swBear,e.tag)));
  if(pres){ const li=ev.filter(e=>e.int).pop(), ls=ev.filter(e=>!e.int).pop(); ev=[li,ls].filter(Boolean); }
  cx.textAlign='center';
  ev.forEach(e=>{ const xa=XI(e.x0), xb=XI(e.x1), y=Y(e.y); if(xa==null||xb==null||y==null||xb<0||xa>W) return;
    const col=e.bull?bull:bear; line(xa,y,xb,y,col,e.int?[4,3]:[],1);
    font(e.int?o.intSize:o.swSize); cx.fillStyle=col; cx.textBaseline=e.bull?'bottom':'top'; cx.fillText(e.tag,(xa+xb)/2,e.bull?y-2:y+2); });
  cx.textBaseline='middle';

  // equal highs / equal lows
  if(o.eqOn){ let q=r.eq; if(pres) q=[q.filter(z=>z.hi).pop(),q.filter(z=>!z.hi).pop()].filter(Boolean);
    q.forEach(z=>{ const xa=XI(z.x0), xb=XI(z.x1), ya=Y(z.y0), yb=Y(z.y1); if(xa==null||xb==null||ya==null||yb==null||xb<0||xa>W) return;
      const col=z.hi?bear:bull; line(xa,ya,xb,yb,col,[2,3],1); font(o.eqSize); cx.fillStyle=col; cx.textAlign='center'; cx.textBaseline=z.hi?'bottom':'top'; cx.fillText(z.hi?'EQH':'EQL',(xa+xb)/2,(ya+yb)/2+(z.hi?-2:2)); });
    cx.textBaseline='middle'; }

  // swing points (HH / LH / HL / LL)
  if(o.swPts){ font('small'); cx.textAlign='center';
    r.pts.forEach(q=>{ const x=XI(q.i), y=Y(q.y); if(x==null||y==null||x<0||x>W) return;
      cx.fillStyle=(q.t==='HH'||q.t==='HL')?bull:bear; cx.textBaseline=q.hi?'bottom':'top'; cx.fillText(q.t,x,q.hi?y-4:y+4); });
    cx.textBaseline='middle'; }

  // strong / weak high and low (the swing range edges)
  if(o.strong&&r.tr&&!isNaN(r.tr.top)&&!isNaN(r.tr.bot)){ const t=r.tr; font('small'); cx.textAlign='right';
    const yt=Y(t.top), yb=Y(t.bot), xt=XI(t.topI), xb=XI(t.botI);
    if(yt!=null&&xt!=null){ line(Math.max(xt,0),yt,W,yt,bear,[],1); cx.fillStyle=bear; cx.textBaseline='bottom'; cx.fillText(r.bias.sw===-1?'Strong High':'Weak High',W-6,yt-2); }
    if(yb!=null&&xb!=null){ line(Math.max(xb,0),yb,W,yb,bull,[],1); cx.fillStyle=bull; cx.textBaseline='top'; cx.fillText(r.bias.sw===1?'Strong Low':'Weak Low',W-6,yb+2); } }
  cx.restore();
}
// route the overlay to smcDraw (everything else goes to the previous draw())
const _smcPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='smcview') return smcDraw(d,X,Y,W,H); return _smcPrevDraw.apply(this,arguments); };

// ---------- [smc] indicator ----------
const smcHead=(b,t)=>{ const h=document.createElement('div'); h.style.cssText='color:#9aa3b5;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin:16px 0 2px;padding-top:8px;border-top:1px solid #232a3a'; h.textContent=t; b.appendChild(h); };
const smcSz={opts:['tiny','small','normal']}, smcStr={opts:['All','BOS','CHoCH']};
IND.smc={label:'Smart Money Concept (SMC) – structure, order blocks, FVG, zones',title:'Smart Money Concept (SMC)',cat:'Trend',cols:[],calc:()=>[],live:true,
  nm:p=>'Smart Money Concept (SMC)',
  p:Object.assign({},SMC_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o);
    smcHead(b,'Smart Money Concepts'); F('mode','sel','Mode',{opts:['Historical','Present']}); F('style','sel','Style',{opts:['Colored','Monochrome']});
    smcHead(b,'Real time internal structure'); F('intOn','chk','Show internal structure'); F('intBull','sel','Bullish structure',smcStr); F('intBear','sel','Bearish structure',smcStr); F('conf','chk','Confluence filter'); F('intSize','sel','Internal label size',smcSz);
    smcHead(b,'Real time swing structure'); F('swOn','chk','Show swing structure'); F('swBull','sel','Bullish structure',smcStr); F('swBear','sel','Bearish structure',smcStr);
    F('swLen','num','Swing length (bars each side)',{min:2,max:200,step:1}); F('swSize','sel','Swing label size',smcSz); F('swPts','chk','Show swing points (HH, LH, HL, LL)'); F('strong','chk','Show strong / weak high and low');
    smcHead(b,'Order blocks'); F('intOb','chk','Internal order blocks'); F('intObN','num','Internal order blocks to show',{min:0,max:100,step:1}); F('swOb','chk','Swing order blocks'); F('swObN','num','Swing order blocks to show',{min:0,max:100,step:1});
    F('obFilter','sel','Order block filter',{opts:['Atr','Cumulative Mean Range']}); F('obMit','sel','Order block mitigation',{opts:['High/Low','Close']});
    smcHead(b,'EQH / EQL'); F('eqOn','chk','Equal high / low'); F('eqLen','num','Bars confirmation',{min:1,max:100,step:1}); F('eqThr','num','Threshold',{min:0,max:0.5,step:0.01}); F('eqSize','sel','Label size',smcSz);
    smcHead(b,'Fair value gaps'); F('fvgOn','chk','Fair value gaps'); F('fvgAuto','chk','Auto threshold'); F('fvgExt','num','Extend FVG (bars)',{min:0,max:100,step:1});
    smcHead(b,'Highs & lows (previous period)'); F('dOn','chk','Daily'); F('wOn','chk','Weekly'); F('mOn','chk','Monthly'); F('hlStyle','sel','Line style',{opts:['Solid','Dashed','Dotted']});
    smcHead(b,'Premium & discount zones'); F('pdOn','chk','Premium / discount zones'); },
  styleTab:(b,d)=>{ const p=d.p, F=(k,l)=>fld(b,p,k,'col',l);
    smcHead(b,'Structure'); F('bull','Bullish structure'); F('bear','Bearish structure');
    smcHead(b,'Order blocks'); F('ibCol','Internal bullish OB'); F('ibeCol','Internal bearish OB'); F('sbCol','Bullish OB'); F('sbeCol','Bearish OB');
    smcHead(b,'Fair value gaps'); F('fvgBull','Bullish FVG'); F('fvgBear','Bearish FVG');
    smcHead(b,'Levels and zones'); F('hlCol','Previous high / low lines'); F('prem','Premium zone'); F('eqz','Equilibrium zone'); F('disc','Discount zone');
    const n=document.createElement('div'); n.style.cssText='color:#9a9a9a;padding:12px 0;font-size:12px'; n.textContent='The Monochrome style (Inputs tab) overrides the structure, order block and FVG colours.'; b.appendChild(n); },
  extras:(c,p)=>({mk:[],boxes:[{type:'smcview',pts:[],r:smcCompute(c,p),o:p}],labels:[]})};
}catch(err){ console.error('smc failed',err); window.__smcErr=err; }

try{
// =====================================================================================
// [srh] SUPPORT AND RESISTANCE (HIGH VOLUME BOXES) - isolated block (names start with srh / SRH_).
// Indicator. A JavaScript port of the Pine Script indicator "Support and Resistance
// (High Volume Boxes) [ChartPrime]" (c) ChartPrime, Mozilla Public License 2.0
// (https://mozilla.org/MPL/2.0/). Keep this credit with the code.
// Drawn on the chart canvas; registers IND.srh and one extra branch in draw().
// =====================================================================================
const SRH_DEF={ lookback:20, volLen:2, boxW:1, showMarks:true, showLabels:true, showVol:true,
  supCol:'#4caf50', resCol:'#ff5252' };

function srhCompute(c0,p){
  const CAP=6000, off=Math.max(0,c0.length-CAP), c=off?c0.slice(off):c0, n=c.length;
  const R={off,n,boxes:[],marks:[],labels:[]};
  const L=Math.max(1,Math.round(p.lookback)), VL=Math.max(1,Math.round(p.volLen)), BW=p.boxW;
  if(n<2*L+3) return R;
  // delta volume: sign follows the last candle that was not a doji
  const V=new Array(n); let buy=true;
  for(let i=0;i<n;i++){ if(c[i].close>c[i].open) buy=true; else if(c[i].close<c[i].open) buy=false; V[i]=buy?(c[i].volume||0):-(c[i].volume||0); }
  // ATR(200), Wilder smoothing
  const atr=new Array(n); let sTr=0, rma=0;
  for(let i=0;i<n;i++){ const q=c[i], tr=i?Math.max(q.high-q.low,Math.abs(q.high-c[i-1].close),Math.abs(q.low-c[i-1].close)):q.high-q.low;
    sTr+=tr; rma=i<200?sTr/(i+1):(rma*199+tr)/200; atr[i]=rma; }
  const nz=v=>v!=null&&!isNaN(v);
  const supL=new Array(n).fill(NaN), supL1=new Array(n).fill(NaN), resL=new Array(n).fill(NaN), resL1=new Array(n).fill(NaN);
  let sL=NaN,sL1=NaN,rL=NaN,rL1=NaN, sup=null, res=null, resIsSup=false, supIsRes=false;
  const resIsSupA=new Array(n).fill(false), supIsResA=new Array(n).fill(false);
  const all=[];
  const hiV=(i,len)=>{ let m=-Infinity; for(let k=Math.max(0,i-len+1);k<=i;k++) if(V[k]>m) m=V[k]; return m; };
  const loV=(i,len)=>{ let m=Infinity; for(let k=Math.max(0,i-len+1);k<=i;k++) if(V[k]<m) m=V[k]; return m; };
  const newBox=(o)=>{ all.push(o); if(all.length>50){ const d=all.shift(); d.dead=true; } return o; };
  for(let i=0;i<n;i++){
    const Vol=V[i], vHi=hiV(i,VL)/2.5, vLo=loV(i,VL)/2.5, withd=atr[i]*BW;
    // pivots on the close, confirmed L bars later
    let pH=NaN,pL=NaN;
    if(i>=2*L){ const j=i-L, v=c[j].close; let isH=true,isL=true;
      for(let k=1;k<=L;k++){ const a=c[j-k].close, b=c[j+k].close; if(!(v>=a&&v>b)) isH=false; if(!(v<=a&&v<b)) isL=false; if(!isH&&!isL) break; }
      if(isH) pH=v; if(isL) pL=v; }
    if(nz(pL)&&Vol>vHi){ sL=pL; sL1=sL-withd; const mx=hiV(i,25);
      sup=newBox({sup:true,i0:i-L,iR:i+1,top:sL,bot:sL1,vol:Vol,a:Math.max(0,Math.min(1,mx>0?Vol/mx:0))*0.7,broken:false}); }
    if(nz(pH)&&Vol<vLo){ rL=pH; rL1=rL+withd; const mn=loV(i,25);
      res=newBox({sup:false,i0:i-L,iR:i+1,top:rL1,bot:rL,vol:Vol,a:Math.max(0,Math.min(1,mn<0?Vol/mn:0))*0.7,broken:false}); }
    if(sup&&!sup.dead) sup.iR=i+1; if(res&&!res.dead) res.iR=i+1;
    supL[i]=sL; supL1[i]=sL1; resL[i]=rL; resL1[i]=rL1;
    const p1=i?i-1:0;
    const brRes=i>0&&nz(rL1)&&nz(resL1[p1])&&c[i].low>rL1&&c[p1].low<=resL1[p1];
    const resHolds=i>0&&nz(rL)&&nz(resL[p1])&&c[i].high<rL&&c[p1].high>=resL[p1];
    const supHolds=i>0&&nz(sL)&&nz(supL[p1])&&c[i].low>sL&&c[p1].low<=supL[p1];
    const brSup=i>0&&nz(sL1)&&nz(supL1[p1])&&c[i].high<sL1&&c[p1].high>=supL1[p1];
    if(brSup&&sup) sup.broken=true;
    if(supHolds&&sup) sup.broken=false;
    if(brRes&&res) res.broken=true;
    if(resHolds&&res) res.broken=false;
    // state: resistance turned support / support turned resistance
    if(brRes) resIsSup=true; else if(resHolds) resIsSup=false;
    if(brSup) supIsRes=true; else if(supHolds) supIsRes=false;
    resIsSupA[i]=resIsSup; supIsResA[i]=supIsRes;
    const prevRS=i?resIsSupA[i-1]:false, prevSR=i?supIsResA[i-1]:false;
    // markers sit one bar back (offset -1)
    if(i>0){
      if(resHolds) R.marks.push({i:i-1,up:true,col:'#e92929',y:c[i-1].high});
      if(supHolds) R.marks.push({i:i-1,up:false,col:'#20ca26',y:c[i-1].low});
      if(brRes&&prevRS) R.marks.push({i:i-1,up:false,col:'#20ca26',y:c[i-1].low});
      if(brSup&&prevSR) R.marks.push({i:i-1,up:true,col:'#e92929',y:c[i-1].high});
      if(brSup&&!prevSR&&nz(supL[p1])) R.labels.push({i:i-1,y:supL[p1],txt:'Break Sup',down:true,bg:'#7e1e1e'});
      if(brRes&&!prevRS&&nz(resL[p1])) R.labels.push({i:i-1,y:resL[p1],txt:'Break Res',down:false,bg:'#2b6d2d'});
    }
  }
  R.boxes=all.filter(b=>!b.dead);
  return R;
}

function srhDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r||!r.n) return;
  const XI=i=>X(i+r.off), fg=document.documentElement.getAttribute('data-theme')==='light'?'#131722':'#d1d4dc';
  const fmt=v=>{ const a=Math.abs(v), s=v<0?'-':''; return a>=1e9?s+(a/1e9).toFixed(2)+'B':a>=1e6?s+(a/1e6).toFixed(2)+'M':a>=1e3?s+(a/1e3).toFixed(2)+'K':v.toFixed(2); };
  const hex=(h,a)=>{ const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(h||''); return m?`rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${a})`:h; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  r.boxes.forEach(b=>{ const x0=XI(b.i0), x1=XI(b.iR), y0=Y(b.top), y1=Y(b.bot); if(x0==null||x1==null||y0==null||y1==null||x1<0||x0>W) return;
    const t=Math.min(y0,y1), h=Math.max(1,Math.abs(y1-y0)), base=b.sup?o.supCol:o.resCol;
    cx.fillStyle=b.broken?hex(b.sup?'#ff5252':'#4caf50',.2):hex(base,b.a); cx.fillRect(x0,t,x1-x0,h);
    cx.strokeStyle=b.broken?(b.sup?'#ff5252':'#4caf50'):base; cx.lineWidth=1; cx.setLineDash(b.broken?[5,4]:[]); cx.strokeRect(x0,t,x1-x0,h); cx.setLineDash([]);
    if(o.showVol&&x1-x0>40){ cx.font='11px system-ui'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillStyle=fg; cx.fillText('Vol: '+fmt(b.vol),(Math.max(x0,0)+Math.min(x1,W))/2,t+h/2); } });
  if(o.showMarks){ cx.font='10px system-ui'; cx.textAlign='center'; cx.textBaseline='middle';
    r.marks.forEach(m=>{ const x=XI(m.i), y=Y(m.y); if(x==null||y==null||x<0||x>W) return;
      cx.fillStyle=m.col; cx.fillText('\u25C6',x,m.up?y-9:y+9); }); }
  if(o.showLabels){ cx.font='11px system-ui'; cx.textAlign='center'; cx.textBaseline='middle';
    r.labels.forEach(l=>{ const x=XI(l.i), y=Y(l.y); if(x==null||y==null||x<-40||x>W+40) return; const w=cx.measureText(l.txt).width+12, h=18, ty=l.down?y-6-h:y+6;
      cx.fillStyle=l.bg; cx.beginPath(); cx.moveTo(x,l.down?y-1:y+1); cx.lineTo(x-4,l.down?y-6:y+6); cx.lineTo(x+4,l.down?y-6:y+6); cx.closePath(); cx.fill();
      cx.fillRect(x-w/2,ty,w,h); cx.fillStyle=fg; cx.fillText(l.txt,x,ty+h/2+.5); }); }
  cx.restore();
}
const srhPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='srhview') return srhDraw(d,X,Y,W,H); return srhPrevDraw.apply(this,arguments); };

IND.srh={label:'Support & Resistance (High Volume Boxes) [ChartPrime]',title:'S/R High Volume Boxes',cat:'Volume',cols:[],calc:()=>[],live:true,
  nm:p=>`S/R Volume Boxes ${p.lookback}`,
  p:Object.assign({},SRH_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o);
    F('lookback','num','Lookback period',{min:1,max:200,step:1});
    F('volLen','num','Delta volume filter length',{min:1,max:50,step:1});
    F('boxW','num','Adjust box width',{min:0,max:1000,step:.1});
    F('showVol','chk','Show volume text in boxes'); F('showMarks','chk','Show hold / retest markers'); F('showLabels','chk','Show Break Sup / Break Res labels'); },
  styleTab:(b,d)=>{ const p=d.p, F=(k,l)=>fld(b,p,k,'col',l); F('supCol','Support boxes'); F('resCol','Resistance boxes'); },
  extras:(c,p)=>({mk:[],boxes:[{type:'srhview',pts:[],r:srhCompute(c,p),o:p}],labels:[]})};
}catch(err){ console.error('srh failed',err); window.__srhErr=err; }

try{
// =====================================================================================
// [wvp] WILLIAMS VARIABLE A/D PRESSURE (WVADP) - isolated block (names start with wvp / WVP_).
// Indicator. WVAD line + signal + histogram in its own pane; BULL / BEAR labels, SL / Entry /
// TP1-3 levels, heatmap candles and a dashboard drawn on the price chart.
// Based on "Williams Variable A/D Pressure" by MarkitTick (CC BY-NC-SA 4.0). Keep this credit.
// =====================================================================================
const WVP_DEF={ n:20, g:9, useHtf:false, htf:'1h', useAdx:false, adxThr:20, adxLen:14, adapt:'SMA', adaptLen:9,
  lock:false, levels:true, slM:1.5, tp1:1, tp2:2, tp3:3, atrLen:14,
  showHist:true, showLines:true, showMarks:true, showCandles:true, dash:true, dashPos:'Top Right',
  histUp:'#26a69a', histDn:'#ef5350', longCol:'#26a69a', shortCol:'#ef5350', slCol:'#ef5350', entCol:'#2196f3', tpCol:'#26a69a',
  cBull:'#26a69a', cBear:'#ef5350', cNeut:'#787b86' };
const WVP_ADAPT=['None','SMA','EMA','RMA','Double WMA','Triple VWMA','HMA','LLAMA','Kalman Filter'];
const WVP_HTF={'1m':60,'5m':300,'15m':900,'30m':1800,'1h':3600,'2h':7200,'4h':14400,'1D':86400,'1W':604800};

const wvpHex=(h,a)=>{ const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(h||''); return m?`rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${a})`:h; };
const wvpFirst=v=>{ for(let i=0;i<v.length;i++) if(v[i]!=null&&isFinite(v[i])) return i; return -1; };
function wvpSma(v,len){ const n=v.length,o=new Array(n).fill(null),f=wvpFirst(v); if(f<0) return o; let s=0;
  for(let i=f;i<n;i++){ s+=v[i]||0; if(i-f>=len) s-=v[i-len]||0; if(i-f>=len-1) o[i]=s/len; } return o; }
function wvpEma(v,len,a){ const n=v.length,o=new Array(n).fill(null),f=wvpFirst(v); if(f<0||n-f<len) return o;
  let s=0; for(let i=f;i<f+len;i++) s+=v[i]; let prev=s/len; o[f+len-1]=prev;
  for(let i=f+len;i<n;i++){ prev=a*v[i]+(1-a)*prev; o[i]=prev; } return o; }
const wvpRma=(v,len)=>wvpEma(v,len,1/len), wvpEmaP=(v,len)=>wvpEma(v,len,2/(len+1));
function wvpWma(v,len){ const n=v.length,o=new Array(n).fill(null),f=wvpFirst(v); if(f<0) return o; const d=len*(len+1)/2;
  for(let i=f+len-1;i<n;i++){ let s=0; for(let k=0;k<len;k++) s+=(v[i-len+1+k]||0)*(k+1); o[i]=s/d; } return o; }
function wvpVwma(v,vol,len){ const pr=v.map((x,i)=>x==null?null:x*vol[i]), vv=vol.map((x,i)=>v[i]==null?null:x), a=wvpSma(pr,len), b=wvpSma(vv,len);
  return a.map((x,i)=>x!=null&&b[i]?x/b[i]:null); }
function wvpHma(v,len){ const a=wvpWma(v,Math.max(1,Math.floor(len/2))), b=wvpWma(v,len);
  return wvpWma(v.map((_,i)=>a[i]!=null&&b[i]!=null?2*a[i]-b[i]:null),Math.max(1,Math.round(Math.sqrt(len)))); }
function wvpKal(v,len){ const o=new Array(v.length).fill(null); let est=null,err=1; const q=1/len;
  for(let i=0;i<v.length;i++){ const x=v[i]; if(x==null) continue; if(est==null) est=x; const pe=err+q, g=pe/(pe+1); est=est+g*(x-est); err=(1-g)*pe; o[i]=est; } return o; }
function wvpLlama(v,len){ const m=wvpSma(v,len); return m.map((x,i)=>x!=null&&i>=len&&v[i-len]!=null?x+(v[i]-v[i-len])/len*(len/2):null); }

const wvpCache={k:'',r:null};
function wvpRun(c,p){
  const n=c.length, key=n+'|'+(n?c[0].time+'|'+c[n-1].time+'|'+c[n-1].close+'|'+c[n-1].high+'|'+c[n-1].low+'|'+c[n-1].volume:'')+'|'+JSON.stringify(p);
  if(wvpCache.k===key) return wvpCache.r;
  const R={n,bars:c,f:[],s:[],h:[],sigs:[],tr:null,ev:[],last:null}; wvpCache.k=key; wvpCache.r=R;
  if(n<40) return R;
  const N=Math.max(1,Math.round(p.n)), G=Math.max(1,Math.round(p.g)), AL=Math.max(1,Math.round(p.adaptLen)), vol=c.map(x=>x.volume||0);
  const raw=c.map(x=>x.high!==x.low?(x.close-x.open)/(x.high-x.low)*(x.volume||0):0);
  const sum=new Array(n).fill(null); let run=0; for(let i=0;i<n;i++){ run+=raw[i]; if(i>=N) run-=raw[i-N]; if(i>=N-1) sum[i]=run; }
  let f;
  switch(p.adapt){ case 'SMA': f=wvpSma(sum,AL); break; case 'EMA': f=wvpEmaP(sum,AL); break; case 'RMA': f=wvpRma(sum,AL); break;
    case 'Double WMA': f=wvpWma(wvpWma(sum,AL),AL); break; case 'Triple VWMA': f=wvpVwma(wvpVwma(wvpVwma(sum,vol,AL),vol,AL),vol,AL); break;
    case 'HMA': f=wvpHma(sum,AL); break; case 'LLAMA': f=wvpLlama(sum,AL); break; case 'Kalman Filter': f=wvpKal(sum,AL); break; default: f=sum; }
  const s=wvpSma(f,G), h=f.map((x,i)=>x!=null&&s[i]!=null?x-s[i]:null);
  R.f=f; R.s=s; R.h=h;
  // true range, ATR (Wilder) and ADX (Wilder)
  const tr=c.map((x,i)=>i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low);
  const atr=wvpRma(tr,Math.max(1,Math.round(p.atrLen)));
  let adx=new Array(n).fill(null);
  { const L=Math.max(1,Math.round(p.adxLen)), pd=new Array(n).fill(null), md=new Array(n).fill(null), trA=tr.map((x,i)=>i?x:null);
    for(let i=1;i<n;i++){ const up=c[i].high-c[i-1].high, dn=c[i-1].low-c[i].low; pd[i]=up>dn&&up>0?up:0; md[i]=dn>up&&dn>0?dn:0; }
    const sT=wvpRma(trA,L), sP=wvpRma(pd,L), sM=wvpRma(md,L);
    const dx=sT.map((t,i)=>{ if(t==null||sP[i]==null||sM[i]==null||!t) return null; const a=100*sP[i]/t, b=100*sM[i]/t, q=a+b; return 100*Math.abs(a-b)/(q===0?1:q); });
    adx=wvpRma(dx,L); }
  // higher timeframe candle direction (previous completed candle)
  const sec=WVP_HTF[p.htf]||3600, hb=new Array(n).fill(false), hr=new Array(n).fill(false);
  if(p.useHtf){ const bk=[]; let cur=null; const bi=new Array(n);
    for(let i=0;i<n;i++){ const id=Math.floor(c[i].time/sec); if(!cur||cur.id!==id){ cur={id,o:c[i].open,c:c[i].close}; bk.push(cur); } else cur.c=c[i].close; bi[i]=bk.length-1; }
    for(let i=0;i<n;i++){ const pv=bk[bi[i]-1]; if(pv){ hb[i]=pv.c>pv.o; hr[i]=pv.c<pv.o; } } }
  // signals and trade levels
  let tr1=null; const ev=[];
  for(let i=2;i<n;i++){
    const cu=f[i-1]!=null&&s[i-1]!=null&&f[i-2]!=null&&s[i-2]!=null&&f[i-1]>s[i-1]&&f[i-2]<=s[i-2];
    const cd=f[i-1]!=null&&s[i-1]!=null&&f[i-2]!=null&&s[i-2]!=null&&f[i-1]<s[i-1]&&f[i-2]>=s[i-2];
    const aok=!p.useAdx||(adx[i-1]!=null&&adx[i-1]>=p.adxThr);
    const lg=cu&&aok&&(!p.useHtf||hb[i]), sh=cd&&aok&&(!p.useHtf||hr[i]);
    if(lg||sh){ R.sigs.push({i,long:lg}); ev.push({k:'wvp-s',time:c[i].time,msg:lg?'WVADP BUY':'WVADP SELL',col:lg?p.longCol:p.shortCol});
      if(!(p.lock&&i===n-1)&&atr[i-1]!=null){ const e=c[i-1].close, r=atr[i-1]*p.slM, d=lg?1:-1;
        tr1={i0:i,long:lg,entry:e,sl:e-d*r,tp1:e+d*r*p.tp1,tp2:e+d*r*p.tp2,tp3:e+d*r*p.tp3,h1:-1,h2:-1,h3:-1,hs:-1,closeI:-1}; } }
    if(tr1){ const hi=c[i].high, lo=c[i].low, lgT=tr1.long, X=(lv)=>lgT?hi>=lv:lo<=lv;
      const f1=X(tr1.tp1)&&tr1.h1<0&&tr1.hs<0, f2=X(tr1.tp2)&&tr1.h2<0&&tr1.hs<0, f3=X(tr1.tp3)&&tr1.h3<0&&tr1.hs<0, fs=(lgT?lo<=tr1.sl:hi>=tr1.sl)&&tr1.hs<0;
      if(f1){ tr1.h1=i; ev.push({k:'wvp-t1',time:c[i].time,msg:'WVADP TP1 hit',col:p.tpCol}); } if(f2){ tr1.h2=i; ev.push({k:'wvp-t2',time:c[i].time,msg:'WVADP TP2 hit',col:p.tpCol}); }
      if(f3){ tr1.h3=i; ev.push({k:'wvp-t3',time:c[i].time,msg:'WVADP TP3 hit',col:p.tpCol}); } if(fs){ tr1.hs=i; ev.push({k:'wvp-sl',time:c[i].time,msg:'WVADP SL hit',col:p.slCol}); }
      if((tr1.hs>=0||tr1.h3>=0)&&tr1.closeI<0) tr1.closeI=i; } }
  R.tr=tr1; R.ev=ev.slice(-30).map((e,q)=>({...e,k:e.k+'|'+e.time}));
  // dashboard values (last bar)
  const L=n-1; let mx=0; for(let i=Math.max(0,L-99);i<=L;i++) if(f[i]!=null) mx=Math.max(mx,Math.abs(f[i]));
  const av=wvpSma(vol,20)[L];
  R.last={f:f[L],s:s[L],h:h[L],str:mx>0&&f[L]!=null?Math.abs(f[L])/mx:0,vol:vol[L],ratio:av>0?vol[L]/av:0,adx:adx[L],aok:!p.useAdx||(adx[L-1]!=null&&adx[L-1]>=p.adxThr),hb:hb[L],hr:hr[L]};
  return R;
}

function wvpDraw(d,X,Y,W,H){
  const R=d.r, p=d.o; if(!R||!R.n||R.n<40) return;
  const c=R.bars, n=R.n, f=R.f, s=R.s;
  let pd=4; try{ const q=candle.options().priceFormat.precision; if(q!=null) pd=q; }catch(e){}
  const fp=v=>v.toFixed(pd);
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  const rr=(x,y,w,h,r)=>{ cx.beginPath(); cx.moveTo(x+r,y); cx.arcTo(x+w,y,x+w,y+h,r); cx.arcTo(x+w,y+h,x,y+h,r); cx.arcTo(x,y+h,x,y,r); cx.arcTo(x,y,x+w,y,r); cx.closePath(); };
  // heatmap candles
  if(p.showCandles){ const a=X(n-1), b=X(n-2); let sp=(a!=null&&b!=null)?Math.abs(a-b):0; if(sp>0){ const bw=Math.max(1,Math.round(sp*.82)); 
    for(let i=0;i<n;i++){ if(f[i]==null||s[i]==null) continue; const x=X(i); if(x==null||x<-bw||x>W+bw) continue;
      const col=f[i]>s[i]?p.cBull:f[i]<s[i]?p.cBear:p.cNeut, yh=Y(c[i].high), yl=Y(c[i].low), yo=Y(c[i].open), yc=Y(c[i].close); if(yh==null||yl==null||yo==null||yc==null) continue;
      cx.fillStyle=col; cx.fillRect(Math.round(x)-.5,yh,1,Math.max(1,yl-yh)); const t=Math.min(yo,yc), hh=Math.max(1,Math.abs(yc-yo)); cx.fillRect(Math.round(x-bw/2),t,bw,hh); } } }
  // trade levels (latest trade only)
  const tr=R.tr;
  if(p.levels&&tr){ const x0=X(tr.i0), x1=X(tr.closeI>=0?tr.closeI+10:n-1+10);
    if(x0!=null&&x1!=null&&x1>0){ const xa=Math.max(x0,0), ys=Y(tr.sl), ye=Y(tr.entry), y1=Y(tr.tp1), y2=Y(tr.tp2), y3=Y(tr.tp3);
      if(ys!=null&&ye!=null&&y1!=null&&y2!=null&&y3!=null){
        cx.fillStyle=wvpHex(p.slCol,.2); cx.fillRect(xa,Math.min(ys,ye),x1-xa,Math.abs(ye-ys));
        cx.fillStyle=wvpHex(p.tpCol,.15); cx.fillRect(xa,Math.min(ye,y3),x1-xa,Math.abs(y3-ye));
        const ln=(y,col,dash,w)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash); cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]); };
        const pct=lv=>{ const q=(tr.long?lv-tr.entry:tr.entry-lv)/tr.entry*100, t=Math.abs(q).toFixed(2).replace(/^0\./,'.'); return (q>=0?'+':'-')+t+'%'; };
        ln(ys,p.slCol,[],2); ln(ye,p.entCol,[5,4],1); ln(y1,wvpHex(p.tpCol,.6),[5,4],1); ln(y2,wvpHex(p.tpCol,.8),[5,4],1); ln(y3,p.tpCol,[5,4],1);
        const lab=(y,txt,col)=>{ cx.font='bold 10px system-ui'; const w=cx.measureText(txt).width+10, h=16; let bx=x1+6; if(bx+w>W-2) bx=W-2-w; cx.fillStyle=col;
          cx.beginPath(); cx.moveTo(x1+1,y); cx.lineTo(x1+6,y-4); cx.lineTo(x1+6,y+4); cx.closePath(); cx.fill(); rr(bx,y-h/2,w,h,3); cx.fill();
          cx.fillStyle='#fff'; cx.textAlign='left'; cx.textBaseline='middle'; cx.fillText(txt,bx+5,y+.5); };
        lab(ys,tr.hs>=0?'SL \u2713 HIT '+pct(tr.sl):'\u2715 SL '+fp(tr.sl),p.slCol);
        lab(ye,'\u25B6 Entry '+fp(tr.entry),p.entCol);
        lab(y1,tr.h1>=0?'TP1 \u2713 HIT '+pct(tr.tp1):'\u25C6 TP1 '+fp(tr.tp1),wvpHex(p.tpCol,.6));
        lab(y2,tr.h2>=0?'TP2 \u2713 HIT '+pct(tr.tp2):'\u2726 TP2 '+fp(tr.tp2),wvpHex(p.tpCol,.8));
        lab(y3,tr.h3>=0?'TP3 \u2713 HIT '+pct(tr.tp3):'\u25C6 TP3 '+fp(tr.tp3),p.tpCol); } } }
  // BULL / BEAR labels
  if(p.showMarks){ cx.font='bold 10px system-ui'; cx.textAlign='center'; cx.textBaseline='middle';
    R.sigs.forEach(g=>{ const x=X(g.i); if(x==null||x<-30||x>W+30) return; const y=Y(g.long?c[g.i].low:c[g.i].high); if(y==null) return;
      const txt=g.long?'BULL':'BEAR', w=cx.measureText(txt).width+12, h=16, col=g.long?p.longCol:p.shortCol, ty=g.long?y+10:y-10-h;
      cx.fillStyle=col; cx.beginPath(); if(g.long){ cx.moveTo(x,y+4); cx.lineTo(x-4,y+10); cx.lineTo(x+4,y+10); } else { cx.moveTo(x,y-4); cx.lineTo(x-4,y-10); cx.lineTo(x+4,y-10); } cx.closePath(); cx.fill();
      rr(x-w/2,ty,w,h,3); cx.fill(); cx.fillStyle='#fff'; cx.fillText(txt,x,ty+h/2+.5); }); }
  // dashboard
  if(p.dash&&R.last){ const Lv=R.last, bull=p.longCol, bear=p.shortCol, fm=v=>v==null?'\u2014':v.toFixed(2);
    const fn=v=>{ const a=Math.abs(v), q=v<0?'-':''; return a>=1e9?q+(a/1e9).toFixed(1)+'B':a>=1e6?q+(a/1e6).toFixed(1)+'M':a>=1e3?q+(a/1e3).toFixed(1)+'K':q+a.toFixed(0); };
    const bar=(v,mx)=>{ const q=Math.min(v/mx,1), fl=Math.round(q*10); return '\u2588'.repeat(fl)+'\u2591'.repeat(10-fl)+'  '+Math.round(q*100)+'%'; };
    const bc=q=>q>=.66?'#26a69a':q>=.33?'#f9a825':'#ef5350';
    const bias=Lv.f!=null&&Lv.s!=null?(Lv.f>Lv.s?'BULLISH':Lv.f<Lv.s?'BEARISH':'NEUTRAL'):'\u2014', biasC=bias==='BULLISH'?bull:bias==='BEARISH'?bear:'#fff';
    const rows=[['Lock',p.lock?'ACTIVE':'OFF',p.lock?bear:'#fff'],['Bias',bias,biasC],['WVAD',fm(Lv.f),Lv.f>=0?bull:bear],['Signal',fm(Lv.s),'#fff'],['Histogram',fm(Lv.h),Lv.h>=0?bull:bear],
      ['Strength',bar(Lv.str,1),bc(Lv.str)],['Volume',fn(Lv.vol),'#fff'],['Vol Ratio',bar(Lv.ratio,2),bc(Math.min(Lv.ratio/2,1))]];
    if(p.useHtf) rows.push(['HTF Bias',Lv.hb?'BULL':Lv.hr?'BEAR':'FLAT',Lv.hb?bull:Lv.hr?bear:'#fff']);
    if(p.useAdx) rows.push(['ADX',fm(Lv.adx),Lv.aok?bull:bear]);
    if(p.adapt!=='None') rows.push(['Adapt Filter',p.adapt,'#fff']);
    rows.push(['Trade',tr?(tr.long?'LONG':'SHORT'):'\u2014',tr?(tr.long?bull:bear):'#fff'],['Entry',tr?fp(tr.entry):'\u2014','#fff'],['SL',tr?fp(tr.sl):'\u2014',tr&&tr.hs>=0?bear:'#fff'],
      ['TP1',tr?fp(tr.tp1):'\u2014',tr&&tr.h1>=0?bull:'#fff'],['TP2',tr?fp(tr.tp2):'\u2014',tr&&tr.h2>=0?bull:'#fff'],['TP3',tr?fp(tr.tp3):'\u2014',tr&&tr.h3>=0?bull:'#fff']);
    const RH=15, DW=196, DH=(rows.length+1)*RH; let dx=p.dashPos.indexOf('Right')>=0?W-DW-4:4, dy=p.dashPos.indexOf('Bottom')>=0?H-DH-4:4; if(dx<0) dx=0; if(dy<0) dy=0;
    cx.font='10px system-ui'; cx.textBaseline='middle';
    cx.fillStyle='rgba(58,42,109,.8)'; cx.fillRect(dx,dy,DW,RH); cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText('WVADP',dx+6,dy+RH/2+.5);
    let tk=''; try{ tk=sym[0]+' \u00B7 '+tf[0]; }catch(e){} cx.textAlign='right'; cx.fillText(tk,dx+DW-6,dy+RH/2+.5);
    rows.forEach((r,q)=>{ const y=dy+(q+1)*RH; cx.fillStyle=q%2?'rgba(10,15,26,.82)':'rgba(10,15,26,.92)'; cx.fillRect(dx,y,DW,RH);
      cx.fillStyle='rgba(255,255,255,.72)'; cx.textAlign='left'; cx.fillText(r[0],dx+6,y+RH/2+.5); cx.fillStyle=r[2]; cx.textAlign='right'; cx.fillText(r[1],dx+DW-6,y+RH/2+.5); });
    cx.strokeStyle='rgba(58,42,109,.6)'; cx.lineWidth=1; cx.strokeRect(dx+.5,dy+.5,DW-1,DH-1); }
  cx.restore();
}
const wvpPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='wvpview') return wvpDraw(d,X,Y,W,H); return wvpPrevDraw.apply(this,arguments); };

const wvpHead=(b,t)=>{ const h=document.createElement('div'); h.style.cssText='color:#9aa3b5;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin:16px 0 2px;padding-top:8px;border-top:1px solid #232a3a'; h.textContent=t; b.appendChild(h); };
IND.wvadp={label:'Williams Variable A/D Pressure (WVADP)',title:'Williams Variable A/D Pressure',cat:'Volume',cols:['#2196f3','#ff9800','#26a69a'],kinds:['line','line','hist'],pane:2,live:true,
  lines:[[0,'rgba(120,123,134,.6)']],
  nm:p=>`WVADP ${p.n} ${p.g}`,
  p:Object.assign({},WVP_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o);
    wvpHead(b,'Core settings'); F('n','num','WVAD period',{min:1,max:200,step:1}); F('g','num','Signal length',{min:1,max:100,step:1});
    wvpHead(b,'Filters'); F('useHtf','chk','Use HTF confirmation'); F('htf','sel','HTF timeframe',{opts:Object.keys(WVP_HTF)}); F('useAdx','chk','Use ADX filter'); F('adxThr','num','ADX threshold',{min:0,max:100,step:.5}); F('adxLen','num','ADX length',{min:1,max:100,step:1});
    F('adapt','sel','Adaptive filter',{opts:WVP_ADAPT}); F('adaptLen','num','Adaptive filter length',{min:1,max:500,step:1});
    wvpHead(b,'Trade tools'); F('lock','chk','Lock signal'); F('levels','chk','Show trade levels'); F('slM','num','SL x ATR',{min:.1,max:20,step:.1}); F('tp1','num','TP1 x R',{min:.1,max:50,step:.1}); F('tp2','num','TP2 x R',{min:.1,max:50,step:.1}); F('tp3','num','TP3 x R',{min:.1,max:50,step:.1}); F('atrLen','num','ATR length',{min:1,max:200,step:1});
    wvpHead(b,'Visuals'); F('showHist','chk','Show histogram'); F('showLines','chk','Show WVAD / signal lines'); F('showMarks','chk','Show BULL / BEAR labels'); F('showCandles','chk','Color candles');
    wvpHead(b,'Dashboard'); F('dash','chk','Show dashboard'); F('dashPos','sel','Position',{opts:['Top Right','Top Left','Bottom Right','Bottom Left']}); },
  styleTab:(b,d)=>{ const p=d.p, F=(k,l)=>fld(b,p,k,'col',l);
    wvpHead(b,'Pane'); fld(b,d.cols,0,'col','WVAD line'); fld(b,d.cols,1,'col','Signal line'); F('histUp','Histogram positive'); F('histDn','Histogram negative');
    wvpHead(b,'Signals'); F('longCol','Long / bullish'); F('shortCol','Short / bearish');
    wvpHead(b,'Trade levels'); F('slCol','Stop loss'); F('entCol','Entry'); F('tpCol','Take profits');
    wvpHead(b,'Candles'); F('cBull','Bull candle'); F('cBear','Bear candle'); F('cNeut','Neutral candle'); },
  calc:(c,p)=>{ const R=wvpRun(c,p); if(!R.n||R.n<40) return [[],[],[]];
    const hist=[]; R.h.forEach((x,i)=>{ if(x==null) return; const pv=i&&R.h[i-1]!=null?R.h[i-1]:x, up=x>=pv;
      hist.push({time:c[i].time,value:x,color:x>=0?wvpHex(p.histUp,up?1:.4):wvpHex(p.histDn,up?.4:1)}); });
    return [p.showLines?toS(c,R.f):[],p.showLines?toS(c,R.s):[],p.showHist?hist:[]]; },
  extras:(c,p)=>{ const R=wvpRun(c,p); return {mk:[],ev:R.ev||[],boxes:[{type:'wvpview',pts:[],r:R,o:p}],labels:[]}; }};
try{ if(typeof DESC!=='undefined') DESC.wvadp='WVAD line, BULL/BEAR signals, SL/TP levels, heatmap candles, dashboard'; }catch(e){}
}catch(err){ console.error('wvp failed',err); window.__wvpErr=err; }


try{
// =====================================================================================
// [ppa] PURE PRICE ACTION - isolated block (every name starts with ppa / PPA_).
// Indicator. Swing highs/lows, market structure (MSS / BOS), order and breaker blocks,
// buyside / sellside liquidity and liquidity voids, drawn on the chart canvas.
// Nothing outside this block is changed except that it registers IND.ppa and one extra
// branch in draw().
// =====================================================================================

// ---------- [ppa] defaults (same inputs and starting values as the LuxAlgo panel) ----------
const PPA_DEF={
  swOn:true, swDet:'Long Term', swSize:'tiny', swStyle:'Dots', swBull:'#089981', swBear:'#f23645',
  msOn:true, msDet:'Intermediate', msLabels:true, msStyle:'Solid', msBull:'#089981', msBear:'#f23645',
  obOn:true, obDet:'Long Term', obBullN:3, obBearN:3, obBody:true, obLabels:false,
  obBullCol:'#089981', obBullBrk:'#f23645', obBearCol:'#f23645', obBearBrk:'#089981',
  liqOn:true, liqDet:'Intermediate', liqMargin:6.9, liqBuy:'#089981', liqSell:'#f23645', liqN:3,
  vdOn:true, vdMult:0.75, vdMode:'Present', vdLook:360, vdLabels:false, vdBull:'#B2B5BE', vdBear:'#5D606B',
  bars:2000
};
const ppaTI=k=>/^Short/.test(k||'')?0:/^Long/.test(k||'')?2:1;   // 0 short, 1 intermediate, 2 long

// ---------- [ppa] ta.atr (RMA, seeded with the SMA of the first len true ranges) ----------
function ppaAtr(c,len){
  const n=c.length, out=new Array(n).fill(NaN); let s=0, r=NaN;
  for(let i=0;i<n;i++){ const b=c[i], tr=i?Math.max(b.high-b.low,Math.abs(b.high-c[i-1].close),Math.abs(b.low-c[i-1].close)):b.high-b.low;
    if(i<len){ s+=tr; if(i===len-1){ r=s/len; out[i]=r; } } else { r=(r*(len-1)+tr)/len; out[i]=r; } }
  return out;
}

// ---------- [ppa] swings: short term (3 bar pivots) -> intermediate (pivots of short) -> long (pivots of intermediate) ----------
// Bar by bar port of the ICTMS state machine. Each term returns, per bar, the last confirmed swing high / low
// (price + bar index) and a flag for the bars where that swing was replaced.
function ppaSim(c){
  const n=c.length, mk=()=>({hy:new Array(n).fill(NaN),hx:new Array(n).fill(-1),ly:new Array(n).fill(NaN),lx:new Array(n).fill(-1),he:new Uint8Array(n),le:new Uint8Array(n)});
  const ST=mk(), IT=mk(), LT=mk(), S=()=>({l:NaN,m:NaN,p:NaN,li:-1,mi:-1});
  const sL=S(), sH=S(), iL=S(), iH=S();
  const upd=(s,price,idx)=>{ s.p=s.m; s.m=s.l; s.l=price; s.mi=s.li; s.li=idx; };
  const qL=s=>s.p>s.m&&s.m<=s.l, qH=s=>s.p<s.m&&s.m>=s.l;
  let a=false, b=false, e=false, f=false, lHy=NaN, lHx=-1, lLy=NaN, lLx=-1;
  for(let t=0;t<n;t++){
    if(t>=2){ const b0=c[t], b1=c[t-1], b2=c[t-2];
      if(b2.low>b1.low&&b1.low<=b0.low){ upd(sL,b1.low,t-1); ST.le[t]=1; }
      if(b2.high<b1.high&&b1.high>=b0.high){ upd(sH,b1.high,t-1); ST.he[t]=1; } }
    const q1=qL(sL); if(q1&&!a){ upd(iL,sL.m,sL.mi); IT.le[t]=1; } a=q1;
    const q2=qH(sH); if(q2&&!b){ upd(iH,sH.m,sH.mi); IT.he[t]=1; } b=q2;
    const q3=qL(iL); if(q3&&!e){ lLy=iL.m; lLx=iL.mi; LT.le[t]=1; } e=q3;
    const q4=qH(iH); if(q4&&!f){ lHy=iH.m; lHx=iH.mi; LT.he[t]=1; } f=q4;
    ST.hy[t]=sH.l; ST.hx[t]=sH.li; ST.ly[t]=sL.l; ST.lx[t]=sL.li;
    IT.hy[t]=iH.l; IT.hx[t]=iH.li; IT.ly[t]=iL.l; IT.lx[t]=iL.li;
    LT.hy[t]=lHy;  LT.hx[t]=lHx;   LT.ly[t]=lLy;  LT.lx[t]=lLx;
  }
  return [ST,IT,LT];
}

// ---------- [ppa] market structure: close beyond the last swing of the term = BOS, or MSS when it flips the trend ----------
function ppaMS(c,T){
  const n=c.length, ev=[]; let ty=0, hc=false, lc=false;
  for(let t=0;t<n;t++){
    if(T.le[t]) lc=false; if(T.he[t]) hc=false; const cl=c[t].close;
    if(cl<T.ly[t]&&!lc){ lc=true; ev.push({bull:false,tag:ty===1?'MSS':'BOS',x0:T.lx[t],x1:t,y:T.ly[t]}); ty=-1; }
    if(cl>T.hy[t]&&!hc){ hc=true; ev.push({bull:true,tag:ty===-1?'MSS':'BOS',x0:T.hx[t],x1:t,y:T.hy[t]}); ty=1; }
  }
  return ev;
}

// ---------- [ppa] order blocks + breaker blocks (fractal swings of depth 1/2/3, newest block first) ----------
function ppaOB(c,depth,body,nB,nS){
  const n=c.length, fH=[], fL=[]; for(let i=0;i<depth;i++){ fH.push([]); fL.push([]); }
  let top={y:NaN,x:-1,cr:false}, btm={y:NaN,x:-1,cr:false}; const bu=[], be=[];
  const mx=q=>body?Math.max(c[q].close,c[q].open):c[q].high, mn=q=>body?Math.min(c[q].close,c[q].open):c[q].low;
  const det=(f,bull)=>{ let sw=null;
    for(let i=0;i<depth;i++){ const g=f[i]; if(g.length!==3) continue;
      const pv=bull?Math.max(g[0].y,g[1].y,g[2].y):Math.min(g[0].y,g[1].y,g[2].y);
      if(pv===g[1].y){ if(i<depth-1){ f[i+1].unshift(g[1]); if(f[i+1].length>3) f[i+1].pop(); } else sw={y:g[1].y,x:g[1].x,cr:false}; g.pop(); g.pop(); } }
    return sw; };
  for(let t=0;t<n;t++){ const b=c[t];
    fH[0].unshift({y:b.high,x:t}); if(fH[0].length>3) fH[0].pop();
    fL[0].unshift({y:b.low,x:t});  if(fL[0].length>3) fL[0].pop();
    const th=det(fH,true), tl=det(fL,false); if(th) top=th; if(tl) btm=tl;
    if(b.close>top.y&&!top.cr){ top.cr=true;
      let minima=mx(t-1), maxima=mn(t-1), loc=t-1;
      for(let q=t-1;q>=top.x+1;q--){ const lo=mn(q); minima=Math.min(lo,minima); if(minima===lo){ maxima=mx(q); loc=q; } }
      bu.unshift({top:maxima,btm:minima,i:loc,bull:true,brk:false,brkI:-1}); }
    if(bu.length>100) bu.pop();
    for(let i=bu.length-1;i>=0;i--){ const e=bu[i];
      if(!e.brk){ if(Math.min(b.close,b.open)<e.btm){ e.brk=true; e.brkI=t; } } else if(b.close>e.top) bu.splice(i,1); }
    if(b.close<btm.y&&!btm.cr){ btm.cr=true;
      let minima=mn(t-1), maxima=mx(t-1), loc=t-1;
      for(let q=t-1;q>=btm.x+1;q--){ const hi=mx(q); maxima=Math.max(hi,maxima); if(maxima===hi){ minima=mn(q); loc=q; } }
      be.unshift({top:maxima,btm:minima,i:loc,bull:false,brk:false,brkI:-1}); }
    if(be.length>100) be.pop();
    for(let i=be.length-1;i>=0;i--){ const e=be[i];
      if(!e.brk){ if(Math.max(b.close,b.open)>e.top){ e.brk=true; e.brkI=t; } } else if(b.close<e.btm) be.splice(i,1); }
  }
  return bu.slice(0,Math.max(0,nB)).concat(be.slice(0,Math.max(0,nS)));
}

// ---------- [ppa] buyside / sellside liquidity (zigzag of the term's swings, 3+ swings inside atr(10) margin) ----------
function ppaLiq(c,a10,T,p){
  const n=c.length, N=Math.max(1,Math.round(p.liqN)), k=Math.max(0.1,p.liqMargin)/10;
  const zd=new Array(50).fill(0), zx=new Array(50).fill(0), zy=new Array(50).fill(NaN);
  const inout=(d,x,y)=>{ zd.unshift(d); zx.unshift(x); zy.unshift(y); zd.pop(); zx.pop(); zy.pop(); };
  const B=[], S=[]; let pH=NaN, pL=NaN;
  const scan=(dir,v,bd)=>{ let cnt=0, stP=0, stB=0, mnP=0, mxP=1e7;
    for(let i=0;i<50;i++){ if(zd[i]!==dir) continue;
      if(dir===1?zy[i]>v+bd:zy[i]<v-bd) break;
      if(zy[i]>v-bd&&zy[i]<v+bd){ cnt++; stB=zx[i]; stP=zy[i]; if(zy[i]>mnP) mnP=zy[i]; if(zy[i]<mxP) mxP=zy[i]; } }
    return {cnt,stP,stB,mid:(mnP+mxP)/2}; };
  const put=(L,r,t,bd)=>{ if(r.cnt<=2) return; const g=L[0];
    if(g&&r.stB===g.x0){ g.top=r.mid+bd; g.bot=r.mid-bd; }
    else L.unshift({x0:r.stB,y:r.stP,xc:t-1,xe:t,top:r.mid+bd,bot:r.mid-bd,brk:false});
    if(L.length>N) L.pop(); };
  for(let t=0;t<n;t++){ const bd=a10[t]*k, sh=T.hy[t], sl=T.ly[t];
    if(sh>0&&sh!==pH){ const dir=zd[0];
      if(dir<1) inout(1,T.hx[t],sh); else if(dir===1&&sh>zy[0]){ zx[0]=T.hx[t]; zy[0]=sh; }
      put(B,scan(1,sh,bd),t,bd); }
    if(sl>0&&sl!==pL){ const dir=zd[0];
      if(dir>-1) inout(-1,T.lx[t],sl); else if(dir===-1&&sl<zy[0]){ zx[0]=T.lx[t]; zy[0]=sl; }
      put(S,scan(-1,sl,bd),t,bd); }
    pH=sh; pL=sl;
    B.forEach(g=>{ if(!g.brk){ g.xe=t; if(c[t].high>g.top) g.brk=true; } });
    S.forEach(g=>{ if(!g.brk){ g.xe=t; if(c[t].low<g.bot) g.brk=true; } });
  }
  return {buy:B,sell:S};
}

// ---------- [ppa] liquidity voids (13 strips per void, a strip disappears once price crosses its middle) ----------
function ppaVoids(c,a200,p){
  const n=c.length, L=13, per=Math.max(1,Math.round(p.vdLook)); let st=[], pBull=false, pBear=false;
  for(let t=0;t<n;t++){ const b=c[t], present=p.vdMode!=='Present'||(n-1-t)<=per;
    let bull=false, bear=false;
    if(present&&t>=2){ const th=a200[t]*p.vdMult, h2=c[t-2].high, l2=c[t-2].low;
      bull=b.low-h2>th&&b.low>h2&&c[t-1].close>h2;
      bear=l2-b.high>th&&b.high<l2&&c[t-1].close<l2; }
    if(bull){ if(pBull){ const s=Math.abs(b.low-c[t-1].low)/L; for(let i=0;i<L;i++) st.push({i0:t-2,lo:c[t-1].low+i*s,hi:c[t-1].low+(i+1)*s,bull:true,lab:false}); }
      else { const h2=c[t-2].high, s=Math.abs(b.low-h2)/L; for(let i=0;i<L;i++) st.push({i0:t-2,lo:h2+i*s,hi:h2+(i+1)*s,bull:true,lab:i===0}); } }
    if(bear){ if(pBear){ const s=Math.abs(c[t-1].high-b.high)/L; for(let i=0;i<L;i++) st.push({i0:t-2,lo:b.high+i*s,hi:b.high+(i+1)*s,bull:false,lab:false}); }
      else { const s=Math.abs(c[t-2].low-b.high)/L; for(let i=0;i<L;i++) st.push({i0:t-2,lo:b.high+i*s,hi:b.high+(i+1)*s,bull:false,lab:i===L-1}); } }
    pBull=bull; pBear=bear;
    if(t>=1&&st.length){ const pc=c[t-1].close;
      st=st.filter(s=>{ const m=(s.lo+s.hi)/2, g=Math.sign(pc-m); return !(g!==Math.sign(b.close-m)||g!==Math.sign(b.low-m)||g!==Math.sign(b.high-m)); }); }
  }
  return st;
}

// ---------- [ppa] calculation ----------
function ppaCompute(c0,p){
  const CAP=Math.max(50,Math.min(6000,Math.round(p.bars)||2000)), off=Math.max(0,c0.length-CAP), c=off?c0.slice(off):c0, n=c.length;
  const R={off,n,sw:[],ms:[],ob:[],buy:[],sell:[],vd:[]};
  if(n<30) return R;
  const sim=ppaSim(c);
  if(p.swOn){ const T=sim[ppaTI(p.swDet)];
    for(let t=0;t<n;t++){ if(T.he[t]) R.sw.push({i:T.hx[t],y:T.hy[t],hi:true}); if(T.le[t]) R.sw.push({i:T.lx[t],y:T.ly[t],hi:false}); } }
  if(p.msOn) R.ms=ppaMS(c,sim[ppaTI(p.msDet)]).slice(-400);
  if(p.obOn) R.ob=ppaOB(c,ppaTI(p.obDet)+1,!!p.obBody,Math.round(p.obBullN),Math.round(p.obBearN));
  if(p.liqOn){ const a10=ppaAtr(c0,10).slice(off), q=ppaLiq(c,a10,sim[ppaTI(p.liqDet)],p); R.buy=q.buy; R.sell=q.sell; }
  if(p.vdOn){ R.vd=ppaVoids(c,ppaAtr(c0,200).slice(off),p); }
  return R;
}

// ---------- [ppa] drawing ----------
function ppaDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r||!r.n) return;
  const XI=i=>X(i+r.off), last=r.n-1;
  const line=(x0,y0,x1,y1,col,dash,w,a)=>{ cx.globalAlpha=a==null?1:a; cx.strokeStyle=col; cx.lineWidth=w||1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y1); cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1; };
  const hl=(i0,i1,y,col,a,dash)=>{ const x0=XI(i0), x1=XI(i1), yy=Y(y); if(x0==null||x1==null||yy==null) return; line(x0,yy,x1,yy,col,dash,1,a); };
  const fill=(i0,i1,top,bot,col,a,edge)=>{ const x0=XI(i0), x1=XI(i1), y0=Y(top), y1=Y(bot); if(x0==null||x1==null||y0==null||y1==null||x1<0||x0>W) return;
    const t=Math.min(y0,y1), h=Math.max(1,Math.abs(y1-y0)); cx.globalAlpha=a; cx.fillStyle=col; cx.fillRect(x0,t,x1-x0,h);
    if(edge){ cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(x0,t,x1-x0,h); } cx.globalAlpha=1; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';

  // liquidity voids
  if(o.vdOn){ r.vd.forEach(v=>fill(v.i0,r.n,v.hi,v.lo,v.bull?o.vdBull:o.vdBear,.26));
    if(o.vdLabels){ cx.font='10px system-ui'; cx.textAlign='right'; r.vd.forEach(v=>{ if(!v.lab||last-v.i0<=21) return; const x=XI(r.n), y=Y(v.bull?v.lo:v.hi); if(x==null||y==null) return;
      cx.fillStyle='#d1d4dc'; cx.globalAlpha=.75; cx.textBaseline=v.bull?'bottom':'top'; cx.fillText('Liquidity Void',x-4,y); cx.globalAlpha=1; }); cx.textBaseline='middle'; } }

  // order blocks and breaker blocks
  if(o.obOn) r.ob.forEach(b=>{ const base=b.bull?o.obBullCol:o.obBearCol, brkC=b.bull?o.obBullBrk:o.obBearBrk, avg=(b.top+b.btm)/2;
    if(b.brk){ fill(b.i,b.brkI,b.top,b.btm,base,.27,true);
      hl(b.brkI,r.n,b.top,brkC,.59); hl(b.brkI,r.n,b.btm,brkC,.59); hl(b.i,r.n,avg,brkC,.59,[2,3]); }
    else { fill(b.i,r.n,b.top,b.btm,base,.27,false);
      hl(b.i,r.n,b.top,base,.27); hl(b.i,r.n,b.btm,base,.27); hl(b.i,r.n,avg,brkC,.59,[2,3]); }
    if(o.obLabels){ const x=XI(b.i), y=Y(avg); if(x!=null&&y!=null&&x<W){ cx.font='9px system-ui'; cx.textAlign='left'; cx.fillStyle='#e6e8ee'; cx.fillText(b.brk?'Breaker':'OB',Math.max(x,0)+3,y); } } });

  // buyside / sellside liquidity
  if(o.liqOn){ cx.font='10px system-ui'; cx.textAlign='left';
    [[r.buy,o.liqBuy,'Buyside liquidity',-1],[r.sell,o.liqSell,'Sellside liquidity',1]].forEach(([L,col,txt,s])=>L.forEach(g=>{
      const xa=XI(g.x0), xc=XI(g.xc), xe=XI(g.xe), y=Y(g.y); if(xa==null||xc==null||xe==null||y==null) return;
      line(xa,y,xc,y,col,[],1); line(xc,y,xe,y,col,[],1,.9);
      cx.globalAlpha=.75; cx.fillStyle=col; cx.textBaseline=s<0?'bottom':'top'; cx.fillText(txt,Math.max(xa,2)+2,y+s*2); cx.globalAlpha=1; }));
    cx.textBaseline='middle'; }

  // market structure (MSS / BOS)
  if(o.msOn){ const ds=o.msStyle==='Dashed'?[6,4]:o.msStyle==='Dotted'?[2,3]:[]; cx.textAlign='center'; cx.font='10px system-ui';
    r.ms.forEach(e=>{ const xa=XI(e.x0), xb=XI(e.x1), y=Y(e.y); if(xa==null||xb==null||y==null||xb<0||xa>W) return;
      const col=e.bull?o.msBull:o.msBear; line(xa,y,xb,y,col,ds,1);
      if(o.msLabels){ cx.fillStyle=col; cx.globalAlpha=.85; cx.textBaseline=e.bull?'bottom':'top'; cx.fillText(e.tag,(xa+xb)/2,e.bull?y-2:y+2); cx.globalAlpha=1; } });
    cx.textBaseline='middle'; }

  // swing highs / lows: dots (as in the LuxAlgo panel) or HH / LH / HL / LL text
  if(o.swOn){
    if(o.swStyle!=='HH / LL'){ const rad=({tiny:2,small:3,normal:4})[o.swSize]||2;
      r.sw.forEach(q=>{ const x=XI(q.i), y=Y(q.y); if(x==null||y==null||x<-6||x>W+6) return;
        cx.fillStyle=q.hi?o.swBull:o.swBear; cx.beginPath(); cx.arc(x,y+(q.hi?-(rad+4):(rad+4)),rad,0,6.2832); cx.fill(); }); }
    else { const fs=({tiny:9,small:11,normal:13})[o.swSize]||9; cx.font='bold '+fs+'px system-ui'; cx.textAlign='center';
      let ph=NaN, pl=NaN;
      r.sw.forEach(q=>{ let tag, bull, first;
        if(q.hi){ first=isNaN(ph); bull=q.y>ph; tag=bull?'HH':'LH'; ph=q.y; } else { first=isNaN(pl); bull=q.y>pl; tag=bull?'HL':'LL'; pl=q.y; }
        if(first) return;
        const x=XI(q.i), y=Y(q.y); if(x==null||y==null||x<0||x>W) return;
        cx.fillStyle=bull?o.swBull:o.swBear; cx.textBaseline=q.hi?'bottom':'top'; cx.fillText(tag,x,y+(q.hi?-3:3)); });
      cx.textBaseline='middle'; } }
  cx.restore();
}
const _ppaPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='ppaview') return ppaDraw(d,X,Y,W,H); return _ppaPrevDraw.apply(this,arguments); };

// ---------- [ppa] indicator ----------
const ppaHead=(b,t)=>{ const h=document.createElement('div'); h.style.cssText='color:#9aa3b5;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin:16px 0 2px;padding-top:8px;border-top:1px solid #232a3a'; h.textContent=t; b.appendChild(h); };
const ppaTerm={opts:['Short Term','Intermediate','Long Term']}, ppaSz={opts:['tiny','small','normal']};
IND.ppa={label:'Price Action 2 – swings, structure, order & breaker blocks, liquidity, voids',title:'Price Action 2',cat:'Trend',cols:[],calc:()=>[],live:true,
  nm:p=>'Price Action 2',
  p:Object.assign({},PPA_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o);
    ppaHead(b,'Swing highs & lows'); F('swOn','chk','Show swing highs/lows'); F('swDet','sel','Detection',ppaTerm); F('swSize','sel','Size',ppaSz); F('swStyle','sel','Swing style',{opts:['Dots','HH / LL']});
    ppaHead(b,'Market structures'); F('msOn','chk','Show market structures'); F('msDet','sel','Detection',ppaTerm); F('msLabels','chk','Labels'); F('msStyle','sel','Line style',{opts:['Solid','Dashed','Dotted']});
    ppaHead(b,'Order & breaker blocks'); F('obOn','chk','Show order & breaker blocks'); F('obDet','sel','Detection',ppaTerm); F('obBullN','num','Last bullish blocks',{min:0,max:50,step:1}); F('obBearN','num','Last bearish blocks',{min:0,max:50,step:1}); F('obBody','chk','Use candle body'); F('obLabels','chk','Labels');
    ppaHead(b,'Buyside & sellside liquidity'); F('liqOn','chk','Show liquidity'); F('liqDet','sel','Detection',ppaTerm); F('liqMargin','num','Margin',{min:1,max:30,step:0.1}); F('liqN','num','Visible levels',{min:0,max:50,step:1});
    ppaHead(b,'Liquidity voids'); F('vdOn','chk','Show liquidity voids'); F('vdMult','num','Threshold multiplier',{min:0.1,max:5,step:0.05}); F('vdMode','sel','Mode',{opts:['Present','Historical']}); F('vdLook','num','Lookback (bars)',{min:10,max:2000,step:10}); F('vdLabels','chk','Labels');
    ppaHead(b,'Calculation'); F('bars','num','Calculated bars',{min:100,max:6000,step:100}); },
  styleTab:(b,d)=>{ const p=d.p, F=(k,l)=>fld(b,p,k,'col',l);
    ppaHead(b,'Swing highs & lows'); F('swBull','Label colour, bullish (HH, HL)'); F('swBear','Label colour, bearish (LH, LL)');
    ppaHead(b,'Market structures'); F('msBull','Bullish structure'); F('msBear','Bearish structure');
    ppaHead(b,'Order & breaker blocks'); F('obBullCol','Bullish OB'); F('obBullBrk','Bullish break'); F('obBearCol','Bearish OB'); F('obBearBrk','Bearish break');
    ppaHead(b,'Liquidity'); F('liqBuy','Buyside liquidity'); F('liqSell','Sellside liquidity');
    ppaHead(b,'Liquidity voids'); F('vdBull','Bullish void'); F('vdBear','Bearish void'); },
  extras:(c,p)=>({mk:[],boxes:[{type:'ppaview',pts:[],r:ppaCompute(c,p),o:p}],labels:[]})};
}catch(err){ console.error('ppa failed',err); window.__ppaErr=err; }
//# sourceURL=tools-3.js
