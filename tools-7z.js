/* tools-7.js — MarketPlusView tool code. index.html loads this file and runs it inside start() at the spot where this code used to be (same order, same scope).
   Keep the file name. Tools in this file: IND.brk, IND.rtr, IND.fpd, IND.oht, IND.tlt, IND.fvs, IND.svt, IND.dvq, STRATS.ecr, STRATS.mru, STRATS.mmo, STRATS.beg, STRATS.ihm, STRATS.pcl, STRATS.tws, STRATS.mst, STRATS.ber, STRATS.rtm, STRATS.ccp, STRATS.pcr, chart type 21 Relative Performance (window.mpRP)
   + chart type 23 Liquidity Heatmap — Order Book Liquidity (window.mpLH; part 15, own file section, independent of everything above) */
/*@@part 7*/
try{
const BRK_DEF={
  // --- what is visible (clean by default) ---
  all:false, showRange:true, showTrades:true, tradesN:3,
  showTraps:false, showTrend:false, showMA:false, showMALines:false, showSwing:false,
  showBB:false, showSqueeze:false, showVol:false, showTags:false, showPrice:false, showDetail:false,
  // --- range breakout ---
  dir:'Both', look:40, tight:true, rangeATR:10, touches:2, buf:0.1, closeOnly:true,
  // --- confirmation ---
  cVol:true, cBB:true, cRSI:true, minConf:1, volMult:1.5, bbN:20, bbM:2, rsiN:14, rsiBull:55, rsiBear:45,
  // --- stop-loss and exit ---
  slATR:0.5, tpMode:'Risk:Reward', rr:2, maxHold:60,
  // --- false breakouts / trendline / moving averages / swings ---
  trap:3, tlLen:6, tlMin:6, tlBuf:0.1, maType:'SMA', maF:50, maS:200, swLen:5, swN:4,
  // --- style ---
  cBuy:'#2dd4a7', cSell:'#ff5d7a', cLvl:'#f5b942', cSL:'#ff5d7a', cTP:'#2dd4a7', cTrend:'#b0b8c8', cMAf:'#ff9800', cMAs:'#4dabf7', cSw:'#c9d1e0', size:'Normal'
};
const BRK_FS={Tiny:8,Small:9.5,Normal:11,Large:13};
function brkRsi(c,n){ const o=new Array(c.length).fill(NaN); let g=0,l=0;
  for(let i=1;i<c.length;i++){ const d=c[i].close-c[i-1].close, u=d>0?d:0, w=d<0?-d:0;
    if(i<=n){ g+=u; l+=w; if(i===n){ g/=n; l/=n; o[i]=l===0?100:100-100/(1+g/l); } }
    else { g=(g*(n-1)+u)/n; l=(l*(n-1)+w)/n; o[i]=l===0?100:100-100/(1+g/l); } }
  return o; }
function brkCompute(c0,p){
  const c=(p.closeOnly&&c0.length>1)?c0.slice(0,-1):c0, n=c.length, on=k=>!!(p.all||p[k]);
  const R={ok:false,n,trades:[],traps:[],tl:[],tlAct:[],cross:[],swings:[],range:null,bb:null,ma:null,vol:null,sq:null,ev:[],stat:''};
  const L=Math.max(5,Math.round(p.look)||40); if(n<L+20) return R;
  const a=atrW(c,14), cl=c.map(x=>x.close);
  let vs=0; for(let i=Math.max(0,n-60);i<n;i++) vs+=c[i].volume||0; const hasVol=vs>0;
  const va=new Array(n).fill(NaN); { let s=0; for(let i=0;i<n;i++){ if(i>=20){ va[i]=s/20; s-=(c[i-20].volume||0); } s+=(c[i].volume||0); } }
  const bbN=Math.max(5,Math.round(p.bbN)||20), bbM=+p.bbM||2, bu=new Array(n).fill(NaN), bl=new Array(n).fill(NaN), bw=new Array(n).fill(NaN);
  for(let i=bbN-1;i<n;i++){ let m=0; for(let k=i-bbN+1;k<=i;k++) m+=cl[k]; m/=bbN; let q=0; for(let k=i-bbN+1;k<=i;k++) q+=(cl[k]-m)*(cl[k]-m);
    const sd=Math.sqrt(q/bbN); bu[i]=m+bbM*sd; bl[i]=m-bbM*sd; bw[i]=m?(2*bbM*sd)/m:NaN; }
  const rs=brkRsi(c,Math.max(2,Math.round(p.rsiN)||14));
  const dirOK=s=>p.dir==='Both'||(p.dir==='Buy only'&&s===1)||(p.dir==='Sell only'&&s===-1);
  const need=Math.max(1,Math.round(p.touches)||2), maxHold=Math.max(5,Math.round(p.maxHold)||60), start=Math.max(L,15,n-8000), raws=[], lastRaw={'1':-99,'-1':-99};
  let open=null;
  // ---------- 1. range breakout (core) ----------
  const rangeAt=(i,ai)=>{ let hi=-Infinity, lo=Infinity; for(let k=i-L;k<i;k++){ if(c[k].high>hi) hi=c[k].high; if(c[k].low<lo) lo=c[k].low; }
    const h=hi-lo; if(!(h>0)) return null; const tl=0.25*ai; let th=0,tw=0; for(let k=i-L;k<i;k++){ if(c[k].high>=hi-tl) th++; if(c[k].low<=lo+tl) tw++; }
    return {hi,lo,h,th,tw,valid:(!p.tight||h<=p.rangeATR*ai)&&th>=need&&tw>=need}; };
  for(let i=start;i<n;i++){
    const x=c[i], ai=a[i]; if(!(ai>0)) continue;
    if(open){ const t=open, long=t.s===1; let res=null, xp=0;
      if(long?x.low<=t.sl:x.high>=t.sl){ res='sl'; xp=t.sl; }
      else if(long?x.high>=t.tp:x.low<=t.tp){ res='tp'; xp=t.tp; }
      else if(i-t.i>=maxHold){ res='time'; xp=x.close; }
      if(res){ t.res=res; t.j=i; t.xp=xp; open=null; }
      continue; }
    const g=rangeAt(i,ai); if(!g||!g.valid) continue;
    const bf=p.buf*ai, up=x.close>g.hi+bf, dn=x.close<g.lo-bf, s=up?1:dn?-1:0; if(!s||(up&&dn)) continue;
    if(i-lastRaw[s]>Math.max(1,Math.round(p.trap)||3)){ raws.push({i,s,lvl:s===1?g.hi:g.lo}); }
    lastRaw[s]=i;
    const cf=[], ok=[];
    if(p.cVol&&hasVol&&va[i]>0){ cf.push('Vol'); if(x.volume>=p.volMult*va[i]) ok.push('Vol'); }
    if(p.cBB&&isFinite(bu[i])){ cf.push('BB'); if(s===1?x.close>bu[i]:x.close<bl[i]) ok.push('BB'); }
    if(p.cRSI&&isFinite(rs[i])){ cf.push('RSI'); if(s===1?rs[i]>=p.rsiBull:rs[i]<=p.rsiBear) ok.push('RSI'); }
    if(ok.length<Math.min(Math.max(0,Math.round(p.minConf)||0),cf.length)) continue;
    if(!dirOK(s)) continue;
    const lvl=s===1?g.hi:g.lo, sl=lvl-s*p.slATR*ai, risk=Math.abs(x.close-sl); if(!(risk>0)) continue;
    let tp=x.close+s*p.rr*risk; if(p.tpMode==='Range height'){ const m=lvl+s*g.h; if(s*(m-x.close)>=0.5*risk) tp=m; }
    const t={s,i,rs:Math.max(0,i-L),lvl,en:x.close,sl,tp,cf:ok.slice(),res:null,j:null,xp:null}; R.trades.push(t); open=t;
  }
  { const i=n-1, ai=a[i]; if(ai>0&&i>=L){ const g=rangeAt(i,ai); if(g) R.range={i0:i-L,R:g.hi,S:g.lo,valid:g.valid}; } }
  // ---------- 2. false breakouts (bull / bear traps) ----------
  { const tb=Math.max(1,Math.round(p.trap)||3);
    raws.forEach(q=>{ for(let k=q.i+1;k<=Math.min(n-1,q.i+tb);k++){ if(q.s===1?c[k].close<=q.lvl:c[k].close>=q.lvl){ R.traps.push({i:k,from:q.i,s:q.s,lvl:q.lvl}); break; } } }); }
  // ---------- 3. trendline breakout ----------
  if(on('showTrend')){ const TL=Math.max(2,Math.round(p.tlLen)||6), gap=Math.max(2,Math.round(p.tlMin)||6); let up=null, dn=null, lL=null, lH=null;
    for(let t=2*TL;t<n;t++){ const j=t-TL;
      if(pivAt(c,j,TL,TL,'l')){ const v=c[j].low; if(lL){ if(v>lL.p){ if(j-lL.i>=gap) up={i1:lL.i,p1:lL.p,i2:j,p2:v,m:(v-lL.p)/(j-lL.i)}; } else up=null; } lL={i:j,p:v}; }
      if(pivAt(c,j,TL,TL,'h')){ const v=c[j].high; if(lH){ if(v<lH.p){ if(j-lH.i>=gap) dn={i1:lH.i,p1:lH.p,i2:j,p2:v,m:(v-lH.p)/(j-lH.i)}; } else dn=null; } lH={i:j,p:v}; }
      const ai=a[t];
      if(up&&t>up.i2){ const v=up.p2+up.m*(t-up.i2); if(c[t].close<v-p.tlBuf*ai){ R.tl.push(Object.assign({kind:'up',t,v},up)); up=null; } else if(t-up.i2>150) up=null; }
      if(dn&&t>dn.i2){ const v=dn.p2+dn.m*(t-dn.i2); if(c[t].close>v+p.tlBuf*ai){ R.tl.push(Object.assign({kind:'down',t,v},dn)); dn=null; } else if(t-dn.i2>150) dn=null; } }
    if(up) R.tlAct.push(Object.assign({kind:'up'},up)); if(dn) R.tlAct.push(Object.assign({kind:'down'},dn)); }
  // ---------- 4. moving average cross ----------
  if(on('showMA')||on('showMALines')){ const F=Math.max(2,Math.round(p.maF)||50), S=Math.max(3,Math.round(p.maS)||200), fn=p.maType==='EMA'?emaV:smaV, f=fn(cl,F), s2=fn(cl,S);
    for(let i=1;i<n;i++){ if(f[i]==null||s2[i]==null||f[i-1]==null||s2[i-1]==null) continue;
      if(f[i-1]<=s2[i-1]&&f[i]>s2[i]) R.cross.push({i,gold:true,p:f[i]}); else if(f[i-1]>=s2[i-1]&&f[i]<s2[i]) R.cross.push({i,gold:false,p:f[i]}); }
    R.ma={f,s:s2,F,S}; }
  // ---------- 5. swing highs / lows ----------
  if(on('showSwing')){ const SW=Math.max(2,Math.round(p.swLen)||5), pv=[];
    for(let t=2*SW;t<n;t++){ const j=t-SW, push=(top,price)=>{ const l=pv[pv.length-1]; if(l&&l.top===top){ if(top?price>l.p:price<l.p){ l.i=j; l.p=price; } } else pv.push({i:j,p:price,top}); };
      if(pivAt(c,j,SW,SW,'h')) push(true,c[j].high); if(pivAt(c,j,SW,SW,'l')) push(false,c[j].low); }
    R.swings=pv; }
  // ---------- 6. confirmation helpers drawn only when ticked ----------
  if(on('showBB')) R.bb={u:bu,l:bl};
  if(on('showVol')&&hasVol){ R.vol=[]; for(let i=Math.max(0,n-500);i<n;i++){ if(va[i]>0&&c[i].volume>=p.volMult*va[i]) R.vol.push({i,up:c[i].close>=c[i].open}); } }
  if(on('showSqueeze')){ R.sq=[]; for(let i=Math.max(bbN+99,n-500);i<n;i++){ let mn=Infinity; for(let k=i-99;k<=i;k++) if(bw[k]<mn) mn=bw[k]; if(isFinite(bw[i])&&bw[i]<=mn*1.1) R.sq.push(i); } }
  // ---------- alerts + status ----------
  R.trades.slice(-4).forEach(t=>{ R.ev.push({k:'brk',time:c[t.i].time,msg:'BREAKOUT '+(t.s===1?'BUY':'SELL'),col:t.s===1?'#2e7d32':'#c62828'});
    if(t.res==='tp'||t.res==='sl') R.ev.push({k:'brkx',time:c[t.j].time,msg:'Breakout '+(t.res==='tp'?'target hit':'stop-loss hit'),col:t.res==='tp'?'#2e7d32':'#c62828'}); });
  { let w=0,l=0; R.trades.forEach(t=>{ if(t.res==='tp') w++; else if(t.res==='sl') l++; }); R.stat=R.trades.length?w+' TP / '+l+' SL':'no breakout yet'; }
  R.ok=true; return R;
}
function brkDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r||!r.ok) return;
  const c=candles, n=r.n, on=k=>!!(o.all||o[k]), fs=BRK_FS[o.size]||11, det=on('showDetail'), pr=on('showPrice'), from=Math.max(0,n-900);
  const x0=X(0), x1=X(1), xs=i=>{ const v=X(i); if(v!=null) return v; return (x0!=null&&x1!=null)?x0+(x1-x0)*i:null; };
  const fmt=v=>String(+(+v).toPrecision(6));
  const seg=(i0,p0,i1,p1,col,w,dash)=>{ const xa=xs(i0), xb=xs(i1), ya=Y(p0), yb=Y(p1); if(xa==null||xb==null||ya==null||yb==null) return null;
    cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(xa,ya); cx.lineTo(xb,yb); cx.stroke(); cx.setLineDash([]); return {xa,xb,ya,yb}; };
  const tx=(t,x,y,col,al)=>{ cx.font=fs+'px system-ui'; cx.textAlign=al||'left'; cx.textBaseline='middle'; cx.lineWidth=3; cx.strokeStyle='rgba(8,12,22,.85)'; cx.strokeText(t,x,y); cx.fillStyle=col; cx.fillText(t,x,y); };
  const tri=(x,y,up,col,sz)=>{ cx.fillStyle=col; cx.beginPath(); if(up){ cx.moveTo(x,y); cx.lineTo(x-sz,y+sz*1.6); cx.lineTo(x+sz,y+sz*1.6); } else { cx.moveTo(x,y); cx.lineTo(x-sz,y-sz*1.6); cx.lineTo(x+sz,y-sz*1.6); } cx.closePath(); cx.fill(); };
  const dot=(x,y,rad,col)=>{ cx.fillStyle=col; cx.beginPath(); cx.arc(x,y,rad,0,6.2832); cx.fill(); };
  const ring=(x,y,rad,col,w)=>{ cx.strokeStyle=col; cx.lineWidth=w||1.5; cx.beginPath(); cx.arc(x,y,rad,0,6.2832); cx.stroke(); };
  const poly=(arr,col,w)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.beginPath(); let st=false;
    for(let i=from;i<n;i++){ const v=arr[i]; if(v==null||!isFinite(v)){ st=false; continue; } const x=xs(i), y=Y(v); if(x==null||y==null){ st=false; continue; } if(!st){ cx.moveTo(x,y); st=true; } else cx.lineTo(x,y); } cx.stroke(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  // Bollinger Bands (ticked)
  if(r.bb){ poly(r.bb.u,'rgba(77,171,247,.75)',1); poly(r.bb.l,'rgba(77,171,247,.75)',1); }
  // moving average lines (ticked)
  if(r.ma&&on('showMALines')){ poly(r.ma.f,o.cMAf,1.4); poly(r.ma.s,o.cMAs,1.6); }
  // active range: key resistance / support (clean default)
  const lastT=r.trades[r.trades.length-1];
  if(on('showRange')&&r.range&&r.range.valid&&!(lastT&&lastT.res==null)){ const g=r.range;
    [[g.R,'Resistance'],[g.S,'Support']].forEach(([pv,nm])=>{ const sg=seg(g.i0,pv,n-1+4,pv,o.cLvl,1.3,[2,3]); if(sg&&(det||pr)) tx((det?nm+' ':'')+(pr?fmt(pv):''),sg.xa+4,sg.ya+(nm==='Resistance'?-fs*.9:fs*.9),'#e6e8ee','left'); }); }
  // breakout trades (clean default)
  if(on('showTrades')){ const N=Math.max(1,Math.round(o.tradesN)||3);
    r.trades.slice(-N).forEach(t=>{ const long=t.s===1, endI=t.j!=null?t.j:n-1+3, xb=xs(endI), xe=xs(t.i); if(xe==null) return;
      const cb=long?o.cBuy:o.cSell, side=long?'long (buy)':'short (sell)';
      seg(t.rs,t.lvl,endI,t.lvl,o.cLvl,1.6);
      const bar=c[t.i]; if(!bar) return; const yb=Y(long?bar.low:bar.high); if(yb==null) return;
      const label=det?(long?'Enter long (buy) position':'Enter short (sell) position'):(long?'BUY':'SELL');
      if(long){ tri(xe,yb+4,true,cb,5); tx(label,xe,yb+4+8+fs*.9,cb,'center'); if(on('showTags')&&t.cf.length) tx('\u2713 '+t.cf.join(' \u00b7 '),xe,yb+4+8+fs*2.1,'#c9d1e0','center'); }
      else { tri(xe,yb-4,false,cb,5); tx(label,xe,yb-4-8-fs*.9,cb,'center'); if(on('showTags')&&t.cf.length) tx('\u2713 '+t.cf.join(' \u00b7 '),xe,yb-4-8-fs*2.1,'#c9d1e0','center'); } }); }
  // false breakouts (ticked)
  if(on('showTraps')){ r.traps.slice(-6).forEach(q=>{ const x=xs(q.i), bar=c[q.i]; if(x==null||!bar) return; seg(q.from,q.lvl,q.i,q.lvl,'#c9a0ff',1,[3,3]);
      const bull=q.s===1, y=Y(bull?bar.high:bar.low); if(y==null) return; const col=bull?o.cSell:o.cBuy; dot(x,y+(bull?-6:6),3.5,col);
      tx(det?(bull?'Bull trap (false breakout)':'Bear trap (false breakout)'):(bull?'Bull trap':'Bear trap'),x,y+(bull?-6-fs*1.1:6+fs*1.1),col,'center'); }); }
  // trendline breakouts (ticked)
  if(on('showTrend')){ r.tlAct.forEach(q=>seg(q.i1,q.p1,n-1+3,q.p2+q.m*(n-1+3-q.i2),o.cTrend,1.2,[5,4]));
    r.tl.slice(-4).forEach(q=>{ const e=q.t+6, sg=seg(q.i1,q.p1,e,q.p2+q.m*(e-q.i2),o.cTrend,1.5); const xb=xs(q.t), yb=Y(q.v); if(xb==null||yb==null) return; ring(xb,yb,6,o.cTrend,1.5);
      const up=q.kind==='up'; tx(det?(up?'Breakout of an uptrend':'Breakout of a downtrend'):(up?'Uptrend break':'Downtrend break'),xb+9,yb+(up?fs*1.2:-fs*1.2),up?o.cSell:o.cBuy,'left'); }); }
  // golden / death cross (ticked)
  if(r.ma&&on('showMA')){ r.cross.slice(-6).forEach(q=>{ const x=xs(q.i), y=Y(q.p); if(x==null||y==null) return; ring(x,y,9,'#e6e8ee',1.6);
      tx(q.gold?(det?'Golden cross \u00b7 '+r.ma.F+' above '+r.ma.S:'Golden cross'):(det?'Death cross \u00b7 '+r.ma.F+' below '+r.ma.S:'Death cross'),x,y+(q.gold?fs*1.8:-fs*1.8),q.gold?o.cBuy:o.cSell,'center'); }); }
  // swing highs / lows (ticked)
  if(on('showSwing')&&r.swings.length){ const N=Math.max(2,Math.round(o.swN)||4), sw=r.swings, st=Math.max(0,sw.length-N);
    for(let k=st;k<sw.length;k++){ const q=sw[k], x=xs(q.i), y=Y(q.p); if(x==null||y==null) continue; ring(x,y,7,o.cSw,1.4);
      tx(q.top?'Swing high':'Swing low',x,y+(q.top?-fs*1.5:fs*1.5),o.cSw,'center');
      if(det){ const nx=sw[k+1]?sw[k+1].i:n-1+4, sg=seg(q.i,q.p,nx,q.p,o.cSw,1,[4,3]); if(sg) tx(q.top?'Enter short (sell) position at swing high':'Close short (sell) / enter long (buy) at swing low',sg.xa+10,sg.ya+(q.top?-fs*.9:fs*.9),'#e6e8ee','left'); } } }
  // volume spikes + Bollinger squeeze (ticked)
  if(r.vol) r.vol.forEach(q=>{ const x=xs(q.i), y=Y(c[q.i].high); if(x!=null&&y!=null) dot(x,y-6,2.6,q.up?o.cBuy:o.cSell); });
  if(r.sq) r.sq.forEach(i=>{ const x=xs(i), y=Y(c[i].low); if(x!=null&&y!=null) dot(x,y+6,2.2,'#ff9800'); });
  cx.setLineDash([]); cx.restore();
}
{ const _brkD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='brkview') return brkDraw(d,X,Y,W,H); return _brkD.apply(this,arguments); }; }
IND.brk={label:'Breakout Trading Strategy \u2013 range, trendline and moving average breakouts with stop-loss and exit',title:'Breakout Trading Strategy',cat:'Trend',cols:[],calc:()=>[],live:true,
  nm:p=>'Breakout '+p.look,
  status:i=>i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:Object.assign({},BRK_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o), hd=t=>{ const e=document.createElement('div'); e.textContent=t; e.style.cssText='margin:14px 0 6px;color:#8a90a5;font-size:12px;letter-spacing:.5px'; b.appendChild(e); };
    hd('SHOW ON CHART  (clean by default: tick to see more)');
    F('all','chk','Show everything (ticks all items below)');
    F('showRange','chk','Range support / resistance lines'); F('showTrades','chk','Breakout trades: BUY / SELL and key level'); F('tradesN','num','   Trades shown',{min:1,max:30,step:1});
    F('showTraps','chk','False breakouts (bull / bear traps)'); F('showTrend','chk','Trendline breakouts'); F('showMA','chk','Golden / death cross marks'); F('showMALines','chk','Moving average lines');
    F('showSwing','chk','Swing highs / lows (swing trading)'); F('swN','num','   Swings shown',{min:2,max:30,step:1});
    F('showBB','chk','Bollinger Bands'); F('showSqueeze','chk','Bollinger squeeze marks (pressure building)'); F('showVol','chk','Volume spike marks');
    F('showTags','chk','Confirmation tags on signals (Vol / BB / RSI)'); F('showPrice','chk','Price tags on levels'); F('showDetail','chk','Detailed labels (full wording)');
    hd('RANGE BREAKOUT');
    F('dir','sel','Trade direction',{opts:['Both','Buy only','Sell only']}); F('look','num','Range lookback (bars)',{min:10,max:300,step:5});
    F('tight','chk','Only trade tight consolidation ranges'); F('rangeATR','num','   Max range height (x ATR)',{min:2,max:60,step:1}); F('touches','num','Touches needed at each level',{min:1,max:6,step:1});
    F('buf','num','Breakout buffer (x ATR, close beyond level)',{min:0,max:2,step:0.05}); F('closeOnly','chk','Signal only after the candle closes (no repaint)');
    hd('CONFIRMATION  (helps filter false breakouts)');
    F('cVol','chk','Volume spike'); F('volMult','num','   Spike = volume above (x average)',{min:1,max:6,step:0.1});
    F('cBB','chk','Bollinger Band close outside the band'); F('bbN','num','   Bollinger length',{min:5,max:100,step:1}); F('bbM','num','   Bollinger multiplier',{min:0.5,max:4,step:0.1});
    F('cRSI','chk','RSI momentum'); F('rsiN','num','   RSI length',{min:2,max:50,step:1}); F('rsiBull','num','   RSI at least (BUY)',{min:30,max:90,step:1}); F('rsiBear','num','   RSI at most (SELL)',{min:10,max:70,step:1});
    F('minConf','num','Confirmations needed (0 = none)',{min:0,max:3,step:1});
    hd('STOP-LOSS AND EXIT');
    F('slATR','num','Stop-loss distance beyond the level (x ATR)',{min:0.1,max:5,step:0.1}); F('tpMode','sel','Exit target',{opts:['Risk:Reward','Range height']}); F('rr','num','   Risk : Reward',{min:0.5,max:10,step:0.5}); F('maxHold','num','Close after (bars) if nothing hit',{min:5,max:500,step:5});
    hd('FALSE BREAKOUTS');
    F('trap','num','Back inside the range within (bars)',{min:1,max:10,step:1});
    hd('TRENDLINE BREAKOUT');
    F('tlLen','num','Swing point length',{min:2,max:20,step:1}); F('tlMin','num','Min bars between the two points',{min:2,max:100,step:1}); F('tlBuf','num','Break buffer (x ATR)',{min:0,max:2,step:0.05});
    hd('MOVING AVERAGE CROSS');
    F('maType','sel','Type',{opts:['SMA','EMA']}); F('maF','num','Fast length',{min:2,max:200,step:1}); F('maS','num','Slow length',{min:3,max:500,step:1});
    hd('SWING TRADING');
    F('swLen','num','Swing length (bars each side)',{min:2,max:30,step:1}); },
  styleTab:(b,d)=>{ const p=d.p; fld(b,p,'cBuy','col','BUY colour'); fld(b,p,'cSell','col','SELL colour'); fld(b,p,'cLvl','col','Key level colour'); fld(b,p,'cSL','col','Stop-loss colour'); fld(b,p,'cTP','col','Exit / target colour');
    fld(b,p,'cTrend','col','Trendline colour'); fld(b,p,'cMAf','col','Fast MA colour'); fld(b,p,'cMAs','col','Slow MA colour'); fld(b,p,'cSw','col','Swing colour'); fld(b,p,'size','sel','Label size',{opts:['Tiny','Small','Normal','Large']}); },
  extras:(c,p)=>{ const r=brkCompute(c,p); return {mk:[],boxes:[{type:'brkview',pts:[],r,o:p}],labels:[],ev:r.ev,stat:r.stat}; }};
try{ DESC.brk='Range, trendline and moving average breakouts: BUY / SELL, stop-loss, exit. Clean by default, tick more in settings'; }catch(e){}
window.__brkCompute=brkCompute;
}catch(err){ console.error('brk indicator failed',err); window.__brkErr=err; }


// =====================================================================================
// [rtr] INDICATOR · "Retracement Trading Strategy"   (self-contained: every name starts with rtr / RTR)
// Picker category: Trend (shows under the Indicators filter).
// Idea: trade the short pullback inside a broader trend. After a clear swing leg (low -> high or high -> low) price
// retraces into the Fibonacci golden ratio zone (38.2% - 78.6%), then a bounce candle in the trend direction = entry.
// CLEAN BY DEFAULT: only the golden ratio zone of the active leg and the BUY / SELL entry arrows are drawn.
// Everything else is calculated but hidden until ticked in Settings -> "SHOW ON CHART" (or "Show everything"):
//   all Fibonacci levels, full 0-100% fill, the swing leg line, the pullback box, extension targets,
//   trendline retests (price dips back to test the trendline), trend EMA, stop-loss / take-profit lines,
//   price tags, detailed labels.
// Hooks: IND.rtr + draw (same pattern as the Breakout Trading Strategy). Nothing existing is edited.
// =====================================================================================
try{
const RTR_DEF={
  // --- what is visible (clean by default) ---
  all:false, showZone:true, showTrades:true, tradesN:3, legsN:1,
  showFibLines:false, showFill:false, showLeg:false, showPullback:false, showExt:false,
  showTL:false, showEMA:false, showSLTP:false, showPrice:false, showDetail:false,
  // --- swing leg (the dominant move) ---
  swLen:6, legATR:3, maxBars:60, closeOnly:true,
  // --- golden ratio zone (percent of the leg) ---
  zoneFrom:38.2, zoneTo:78.6,
  // --- entry ---
  dir:'Both', bounce:true, trendOn:true, emaLen:50,
  // --- stop-loss and take-profit (managed always, drawn only when ticked) ---
  slMode:'Below zone end', slATR:0.25, tpMode:'Swing extreme (0%)', rr:2, maxHold:80,
  // --- trendline retest ---
  tlLen:6, tlTol:0.3,
  // --- style ---
  cBuy:'#2dd4a7', cSell:'#ff5d7a', cZone:'#4da3ff', cFib:'#9aa3b5', cLeg:'#c9d1e0', cTL:'#b0b8c8', cEMA:'#ff9800', cSL:'#ff5d7a', cTP:'#2dd4a7', size:'Normal'
};
const RTR_FS={Tiny:8,Small:9.5,Normal:11,Large:13};
function rtrRgba(h,a){ const m=/^#?([0-9a-f]{6})$/i.exec(h||''); if(!m) return 'rgba(77,163,255,'+a+')'; const v=parseInt(m[1],16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; }
function rtrPrice(g,r){ return g.B.p+(g.A.p-g.B.p)*r; }
function rtrCompute(c0,p){
  const c=(p.closeOnly&&c0.length>1)?c0.slice(0,-1):c0, n=c.length, on=k=>!!(p.all||p[k]);
  const R={ok:false,n,trades:[],active:null,tl:[],tlAct:[],ema:null,ev:[],stat:''};
  const SW=Math.max(2,Math.round(p.swLen)||6); if(n<4*SW+20) return R;
  const a=atrW(c,14), cl=c.map(x=>x.close), zlo=Math.min(p.zoneFrom,p.zoneTo)/100, zhi=Math.max(p.zoneFrom,p.zoneTo)/100;
  const ema=(p.trendOn||on('showEMA'))?emaV(cl,Math.max(5,Math.round(p.emaLen)||50)):null; if(on('showEMA')) R.ema=ema;
  const dirOK=s=>p.dir==='Both'||(p.dir==='Buy only'&&s===1)||(p.dir==='Sell only'&&s===-1), maxBars=Math.max(5,Math.round(p.maxBars)||60), maxHold=Math.max(5,Math.round(p.maxHold)||80);
  const pv=[]; let st=null, open=null;
  for(let t=2*SW;t<n;t++){
    const j=t-SW, push=(top,price)=>{ const l=pv[pv.length-1]; if(l&&l.top===top){ if(top?price>l.p:price<l.p){ l.i=j; l.p=price; l.ct=t; } } else pv.push({i:j,p:price,top,ct:t}); };
    if(pivAt(c,j,SW,SW,'h')) push(true,c[j].high); if(pivAt(c,j,SW,SW,'l')) push(false,c[j].low);
    const x=c[t], ai=a[t];
    if(open){ const o=open, long=o.s===1; let res=null, xp=0;
      if(long?x.low<=o.sl:x.high>=o.sl){ res='sl'; xp=o.sl; }
      else if(long?x.high>=o.tp:x.low<=o.tp){ res='tp'; xp=o.tp; }
      else if(t-o.i>=maxHold){ res='time'; xp=x.close; }
      if(res){ o.res=res; o.j=t; o.xp=xp; open=null; }
      continue; }
    if(pv.length<2||!(ai>0)) continue;
    const B=pv[pv.length-1], A=pv[pv.length-2], key=B.i+'_'+B.top; if(!st||st.key!==key) st={key,done:false,inv:false};
    if(st.done||st.inv||t<=B.i) continue;
    if(Math.abs(B.p-A.p)<p.legATR*ai) continue;
    if(t-B.i>maxBars){ st.inv=true; continue; }
    const long=B.top, s=long?1:-1, g={A,B}, zN=rtrPrice(g,zlo), zF=rtrPrice(g,zhi);
    let ext=long?Infinity:-Infinity, t0=-1, hx=long?-Infinity:Infinity;
    for(let k=B.i+1;k<=t;k++){ if(long){ if(c[k].low<ext) ext=c[k].low; if(t0<0&&c[k].low<=zN) t0=k; } else { if(c[k].high>ext) ext=c[k].high; if(t0<0&&c[k].high>=zN) t0=k; } }
    if(long?ext<A.p:ext>A.p){ st.inv=true; continue; }
    if(t0<0) continue;
    if(ema&&p.trendOn&&ema[t]!=null&&(long?x.close<=ema[t]:x.close>=ema[t])) continue;
    const pr=c[t-1]; if(p.bounce&&!(long?(x.close>x.open&&x.close>pr.high):(x.close<x.open&&x.close<pr.low))) continue;
    if(!dirOK(s)) continue;
    let base=p.slMode==='Below swing start (100%)'?A.p:p.slMode==='Below pullback low'?ext:(long?Math.min(zF,ext):Math.max(zF,ext));
    let sl=base-s*p.slATR*ai; if(!(s*(x.close-sl)>0)){ sl=A.p-s*p.slATR*ai; if(!(s*(x.close-sl)>0)) continue; }
    const risk=Math.abs(x.close-sl); let tp=p.tpMode==='Extension 127.2%'?rtrPrice(g,-0.272):p.tpMode==='Extension 161.8%'?rtrPrice(g,-0.618):p.tpMode==='Risk:Reward'?x.close+s*p.rr*risk:B.p;
    if(!(s*(tp-x.close)>=0.5*risk)) tp=x.close+s*p.rr*risk;
    const tr={s,i:t,en:x.close,sl,tp,g:{A:{i:A.i,p:A.p},B:{i:B.i,p:B.p}},t0,ext,res:null,j:null,xp:null}; R.trades.push(tr); st.done=true; open=tr;
  }
  // active leg (latest two swing points) for drawing
  if(pv.length>=2){ const B=pv[pv.length-1], A=pv[pv.length-2], ai=a[n-1]; if(ai>0&&Math.abs(B.p-A.p)>=p.legATR*ai&&n-1-B.i<=maxBars*2) R.active={A:{i:A.i,p:A.p},B:{i:B.i,p:B.p}}; }
  // trendline retests
  if(on('showTL')){ const TL=Math.max(2,Math.round(p.tlLen)||6); let up=null, dn=null, lL=null, lH=null, lu=-99, ld=-99;
    for(let t=2*TL;t<n;t++){ const j=t-TL;
      if(pivAt(c,j,TL,TL,'l')){ const v=c[j].low; if(lL){ if(v>lL.p){ if(j-lL.i>=TL) up={i1:lL.i,p1:lL.p,i2:j,p2:v,m:(v-lL.p)/(j-lL.i)}; } else up=null; } lL={i:j,p:v}; }
      if(pivAt(c,j,TL,TL,'h')){ const v=c[j].high; if(lH){ if(v<lH.p){ if(j-lH.i>=TL) dn={i1:lH.i,p1:lH.p,i2:j,p2:v,m:(v-lH.p)/(j-lH.i)}; } else dn=null; } lH={i:j,p:v}; }
      const x=c[t], ai=a[t]; if(!(ai>0)) continue; const tol=p.tlTol*ai;
      if(up&&t>up.i2){ const v=up.p2+up.m*(t-up.i2); if(x.close<v-tol) up=null; else { if(x.low<=v+tol&&x.close>v&&x.close>x.open&&t-lu>3){ R.tl.push({i:t,kind:'up',v}); lu=t; } if(t-up.i2>200) up=null; } }
      if(dn&&t>dn.i2){ const v=dn.p2+dn.m*(t-dn.i2); if(x.close>v+tol) dn=null; else { if(x.high>=v-tol&&x.close<v&&x.close<x.open&&t-ld>3){ R.tl.push({i:t,kind:'down',v}); ld=t; } if(t-dn.i2>200) dn=null; } } }
    if(up) R.tlAct.push(Object.assign({kind:'up'},up)); if(dn) R.tlAct.push(Object.assign({kind:'down'},dn)); }
  // alerts + status
  R.trades.slice(-4).forEach(t=>{ R.ev.push({k:'rtr',time:c[t.i].time,msg:'RETRACEMENT '+(t.s===1?'BUY':'SELL'),col:t.s===1?'#2e7d32':'#c62828'});
    if(t.res==='tp'||t.res==='sl') R.ev.push({k:'rtrx',time:c[t.j].time,msg:'Retracement '+(t.res==='tp'?'target hit':'stop-loss hit'),col:t.res==='tp'?'#2e7d32':'#c62828'}); });
  { let w=0,l=0; R.trades.forEach(t=>{ if(t.res==='tp') w++; else if(t.res==='sl') l++; }); R.stat=R.trades.length?w+' TP / '+l+' SL':'no pullback entry yet'; }
  R.ok=true; return R;
}
function rtrDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r||!r.ok) return;
  const c=candles, n=r.n, on=k=>!!(o.all||o[k]), fs=RTR_FS[o.size]||11, det=on('showDetail'), pr=on('showPrice'), from=Math.max(0,n-900);
  const x0=X(0), x1=X(1), xs=i=>{ const v=X(i); if(v!=null) return v; return (x0!=null&&x1!=null)?x0+(x1-x0)*i:null; };
  const fmt=v=>String(+(+v).toPrecision(6));
  const seg=(i0,p0,i1,p1,col,w,dash)=>{ const xa=xs(i0), xb=xs(i1), ya=Y(p0), yb=Y(p1); if(xa==null||xb==null||ya==null||yb==null) return null;
    cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(xa,ya); cx.lineTo(xb,yb); cx.stroke(); cx.setLineDash([]); return {xa,xb,ya,yb}; };
  const tx=(t,x,y,col,al)=>{ cx.font=fs+'px system-ui'; cx.textAlign=al||'left'; cx.textBaseline='middle'; cx.lineWidth=3; cx.strokeStyle='rgba(8,12,22,.85)'; cx.strokeText(t,x,y); cx.fillStyle=col; cx.fillText(t,x,y); };
  const tri=(x,y,up,col,sz)=>{ cx.fillStyle=col; cx.beginPath(); if(up){ cx.moveTo(x,y); cx.lineTo(x-sz,y+sz*1.6); cx.lineTo(x+sz,y+sz*1.6); } else { cx.moveTo(x,y); cx.lineTo(x-sz,y-sz*1.6); cx.lineTo(x+sz,y-sz*1.6); } cx.closePath(); cx.fill(); };
  const dot=(x,y,rad,col)=>{ cx.fillStyle=col; cx.beginPath(); cx.arc(x,y,rad,0,6.2832); cx.fill(); };
  const ring=(x,y,rad,col,w)=>{ cx.strokeStyle=col; cx.lineWidth=w||1.5; cx.beginPath(); cx.arc(x,y,rad,0,6.2832); cx.stroke(); };
  const poly=(arr,col,w)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.beginPath(); let st=false;
    for(let i=from;i<n;i++){ const v=arr[i]; if(v==null||!isFinite(v)){ st=false; continue; } const x=xs(i), y=Y(v); if(x==null||y==null){ st=false; continue; } if(!st){ cx.moveTo(x,y); st=true; } else cx.lineTo(x,y); } cx.stroke(); };
  const zlo=Math.min(o.zoneFrom,o.zoneTo)/100, zhi=Math.max(o.zoneFrom,o.zoneTo)/100;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  if(r.ema&&on('showEMA')) poly(r.ema,o.cEMA,1.4);
  // ---- Fibonacci legs ----
  const legs=[]; r.trades.forEach(t=>{ if(!legs.some(g=>g.B.i===t.g.B.i)) legs.push(t.g); });
  if(r.active&&!legs.some(g=>g.B.i===r.active.B.i)) legs.push(r.active);
  legs.sort((a,b)=>a.B.i-b.B.i);
  legs.slice(-Math.max(1,Math.round(o.legsN)||1)).forEach(g=>{
    const isAct=r.active&&g.B.i===r.active.B.i, nx=legs[legs.indexOf(g)+1], endI=isAct?n-1+4:(nx?nx.A.i:n-1+4), xa=xs(g.A.i), xe=xs(endI), xB=xs(g.B.i);
    if(xa==null||xe==null||xB==null) return;
    const zN=rtrPrice(g,zlo), zF=rtrPrice(g,zhi), yN=Y(zN), yF=Y(zF);
    if(on('showFill')){ const y0=Y(g.B.p), y1=Y(g.A.p); if(y0!=null&&y1!=null){ cx.fillStyle=rtrRgba(o.cZone,.07); cx.fillRect(xa,Math.min(y0,y1),xe-xa,Math.abs(y1-y0)); } }
    if(on('showZone')&&yN!=null&&yF!=null){ cx.fillStyle=rtrRgba(o.cZone,.20); cx.fillRect(xB,Math.min(yN,yF),xe-xB,Math.abs(yF-yN));
      seg(g.B.i,zN,endI,zN,rtrRgba(o.cZone,.8),1); seg(g.B.i,zF,endI,zF,rtrRgba(o.cZone,.8),1);
      if(det) tx('Golden ratio zone'+(pr?' '+fmt(zN)+' - '+fmt(zF):''),xB+6,Math.min(yN,yF)+fs*.9,'#cfe5ff','left'); }
    if(on('showFibLines')){ [0,0.382,0.5,0.618,0.786,1].forEach(q=>{ const pv=rtrPrice(g,q), sg=seg(g.A.i,pv,endI,pv,o.cFib,1,[2,3]); if(sg) tx((q*100).toFixed(q===0||q===1?0:1)+'%'+(pr?' '+fmt(pv):''),sg.xb-4,sg.ya-fs*.8,'#cfd5e3','right'); }); }
    if(on('showExt')){ [[-0.272,'127.2%'],[-0.618,'161.8%']].forEach(([q,l])=>{ const pv=rtrPrice(g,q), sg=seg(g.B.i,pv,endI,pv,o.cTP,1,[2,4]); if(sg) tx('Ext '+l+(pr?' '+fmt(pv):''),sg.xb-4,sg.ya-fs*.8,o.cTP,'right'); }); }
    if(on('showLeg')) seg(g.A.i,g.A.p,g.B.i,g.B.p,o.cLeg,1.4,[4,3]);
  });
  // ---- entries ----
  if(on('showTrades')){ const N=Math.max(1,Math.round(o.tradesN)||3);
    r.trades.slice(-N).forEach(t=>{ const long=t.s===1, endI=t.j!=null?t.j:n-1+3, xe=xs(t.i), xb=xs(endI); if(xe==null) return; const cb=long?o.cBuy:o.cSell, side=long?'long (buy)':'short (sell)';
      if(on('showPullback')){ let hi=-Infinity, lo=Infinity; for(let k=t.t0;k<=t.i;k++){ if(c[k].high>hi) hi=c[k].high; if(c[k].low<lo) lo=c[k].low; }
        const xa=xs(t.t0), ya=Y(hi), yb=Y(lo); if(xa!=null&&ya!=null&&yb!=null){ cx.fillStyle='rgba(200,210,230,.10)'; cx.strokeStyle='rgba(200,210,230,.55)'; cx.lineWidth=1; cx.fillRect(xa-3,ya-2,xe-xa+6,yb-ya+4); cx.strokeRect(xa-3,ya-2,xe-xa+6,yb-ya+4);
          if(det) tx('Retraced back into the golden ratio zone',xe+8,(ya+yb)/2,'#e6e8ee','left'); } }
      if(on('showSLTP')){ const sl=seg(t.i,t.sl,endI,t.sl,o.cSL,1.2,[5,4]); if(sl) tx((det?'Stop-loss order':'SL')+(pr?' '+fmt(t.sl):''),sl.xb-4,sl.ya+(long?1:-1)*fs*.95,o.cSL,'right');
        const tp=seg(t.i,t.tp,endI,t.tp,o.cTP,1.2,[5,4]); if(tp) tx((det?'Close '+side+' position':'TP')+(pr?' '+fmt(t.tp):''),tp.xb-4,tp.ya+(long?-1:1)*fs*.95,o.cTP,'right');
        if(t.j!=null&&xb!=null){ const yx=Y(t.xp); if(yx!=null){ if(t.res==='tp'){ dot(xb,yx,4,o.cTP); ring(xb,yx,7,o.cTP,1.5); } else if(t.res==='sl'){ cx.strokeStyle=o.cSL; cx.lineWidth=2.2; cx.beginPath(); cx.moveTo(xb-4,yx-4); cx.lineTo(xb+4,yx+4); cx.moveTo(xb+4,yx-4); cx.lineTo(xb-4,yx+4); cx.stroke(); } else dot(xb,yx,3.5,'#9aa3b5'); } } }
      const bar=c[t.i]; if(!bar) return; const yb2=Y(long?bar.low:bar.high); if(yb2==null) return; const label=det?(long?'Enter long (buy) position':'Enter short (sell) position'):(long?'BUY':'SELL');
      if(long){ tri(xe,yb2+4,true,cb,5); tx(label,xe,yb2+4+8+fs*.9,cb,'center'); } else { tri(xe,yb2-4,false,cb,5); tx(label,xe,yb2-4-8-fs*.9,cb,'center'); } }); }
  // ---- trendline retests (ticked) ----
  if(on('showTL')){ r.tlAct.forEach(q=>seg(q.i1,q.p1,n-1+3,q.p2+q.m*(n-1+3-q.i2),o.cTL,1.2,[5,4]));
    r.tl.slice(-6).forEach(q=>{ const x=xs(q.i), y=Y(q.v), up=q.kind==='up'; if(x==null||y==null) return; ring(x,y,6,o.cTL,1.5);
      tx(det?(up?'Dip back to test the uptrend line':'Rally back to test the downtrend line'):(up?'Trendline test':'Trendline test'),x,y+(up?fs*1.6:-fs*1.6),up?o.cBuy:o.cSell,'center'); }); }
  cx.setLineDash([]); cx.restore();
}
{ const _rtrD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='rtrview') return rtrDraw(d,X,Y,W,H); return _rtrD.apply(this,arguments); }; }
IND.rtr={label:'Retracement Trading Strategy \u2013 Fibonacci golden ratio zone and trendline pullbacks',title:'Retracement Trading Strategy',cat:'Trend',cols:[],calc:()=>[],live:true,
  nm:p=>'Retracement '+p.swLen,
  status:i=>i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:Object.assign({},RTR_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o), hd=t=>{ const e=document.createElement('div'); e.textContent=t; e.style.cssText='margin:14px 0 6px;color:#8a90a5;font-size:12px;letter-spacing:.5px'; b.appendChild(e); };
    hd('SHOW ON CHART  (clean by default: tick to see more)');
    F('all','chk','Show everything (ticks all items below)');
    F('showZone','chk','Golden ratio zone (38.2% - 78.6%)'); F('showTrades','chk','BUY / SELL entries'); F('tradesN','num','   Entries shown',{min:1,max:30,step:1}); F('legsN','num','Fibonacci legs shown',{min:1,max:10,step:1});
    F('showFibLines','chk','All Fibonacci levels (0 / 38.2 / 50 / 61.8 / 78.6 / 100%)'); F('showFill','chk','Full 0-100% shading'); F('showLeg','chk','Swing leg line'); F('showPullback','chk','Pullback box');
    F('showExt','chk','Extension targets (127.2% / 161.8%)'); F('showTL','chk','Trendline retests (dip back to the trendline)'); F('showEMA','chk','Trend EMA line');
    F('showSLTP','chk','Stop-loss / take-profit lines'); F('showPrice','chk','Price tags on levels'); F('showDetail','chk','Detailed labels (full wording)');
    hd('SWING LEG  (the dominant move that gets retraced)');
    F('swLen','num','Swing length (bars each side)',{min:2,max:30,step:1}); F('legATR','num','Min leg size (x ATR)',{min:1,max:30,step:0.5}); F('maxBars','num','Pullback must come within (bars)',{min:5,max:300,step:5}); F('closeOnly','chk','Signal only after the candle closes (no repaint)');
    hd('GOLDEN RATIO ZONE  (percent of the leg)');
    F('zoneFrom','num','Zone starts at %',{min:10,max:90,step:0.1}); F('zoneTo','num','Zone ends at %',{min:20,max:100,step:0.1});
    hd('ENTRY');
    F('dir','sel','Trade direction',{opts:['Both','Buy only','Sell only']}); F('bounce','chk','Wait for a bounce candle in the trend direction');
    F('trendOn','chk','Only trade with the trend (price vs EMA)'); F('emaLen','num','   Trend EMA length',{min:5,max:400,step:1});
    hd('STOP-LOSS AND TAKE-PROFIT');
    F('slMode','sel','Stop-loss placement',{opts:['Below zone end','Below pullback low','Below swing start (100%)']}); F('slATR','num','   Extra distance (x ATR)',{min:0,max:5,step:0.05});
    F('tpMode','sel','Take-profit',{opts:['Swing extreme (0%)','Extension 127.2%','Extension 161.8%','Risk:Reward']}); F('rr','num','   Risk : Reward',{min:0.5,max:10,step:0.5}); F('maxHold','num','Close after (bars) if nothing hit',{min:5,max:500,step:5});
    hd('TRENDLINE RETEST');
    F('tlLen','num','Swing point length',{min:2,max:20,step:1}); F('tlTol','num','Touch tolerance (x ATR)',{min:0,max:2,step:0.05}); },
  styleTab:(b,d)=>{ const p=d.p; fld(b,p,'cBuy','col','BUY colour'); fld(b,p,'cSell','col','SELL colour'); fld(b,p,'cZone','col','Golden zone colour'); fld(b,p,'cFib','col','Fibonacci line colour'); fld(b,p,'cLeg','col','Swing leg colour');
    fld(b,p,'cTL','col','Trendline colour'); fld(b,p,'cEMA','col','EMA colour'); fld(b,p,'cSL','col','Stop-loss colour'); fld(b,p,'cTP','col','Take-profit colour'); fld(b,p,'size','sel','Label size',{opts:['Tiny','Small','Normal','Large']}); },
  extras:(c,p)=>{ const r=rtrCompute(c,p); return {mk:[],boxes:[{type:'rtrview',pts:[],r,o:p}],labels:[],ev:r.ev,stat:r.stat}; }};
try{ DESC.rtr='Pullback entries in the Fibonacci golden ratio zone and trendline retests. Clean by default, tick more in settings'; }catch(e){}
window.__rtrCompute=rtrCompute;
}catch(err){ console.error('rtr indicator failed',err); window.__rtrErr=err; }

// =====================================================================================
// [fpd] INDICATOR · "50 Pips a Day"   (self-contained: every name starts with fpd / FPD)
// Picker category: Trend (shows under the Indicators filter).
// Idea (early-session breakout): when the chosen candle closes (default the 07:00 GMT hourly candle),
// two pending orders are set from that close:  BUY-STOP = close + 50 pips,  SELL-STOP = close - 50 pips.
// Whichever level is hit first becomes the trade, the other order is cancelled.  Stop-loss sits a few pips
// beyond the entry (default 10), take-profit default 50 pips.  Orders expire at the session end time.
// It only works inside the set time / session - the rest of the chart stays empty.
// Clean by default: last few days only, thin time column + thin session strip, two dashed order levels,
// one BUY / SELL arrow and short SL / TP lines.  Hooks: IND.fpd + draw (same pattern as Retracement Strategy).
// =====================================================================================
try{
const FPD_TZ=['UTC','Europe/London','America/New_York','Europe/Berlin','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Africa/Nairobi','Australia/Sydney'];
const FPD_DEF={
  // --- time and session ---
  tz:'UTC', start:'07:00', dur:60, end:'17:00', skipWE:true,
  // --- orders ---
  pips:50, slPips:10, tpOn:true, tpPips:50, pipSize:0,
  // --- what is visible (clean by default) ---
  daysN:5, showTime:true, showBand:true, showLevels:true, showTrades:true, showSLTP:true, showResult:true, showPrice:false,
  // --- style ---
  cBuy:'#2dd4a7', cSell:'#ff5d7a', cTime:'#4da3ff', size:'Small'
};
const FPD_FS={Tiny:8,Small:9.5,Normal:11,Large:13};
const fpdTzName=z=>z==='UTC'?'GMT':String(z).split('/').pop().replace(/_/g,' ');
const fpdHM=s=>{ const m=/^\s*(\d{1,2})\s*:?\s*(\d{2})\s*$/.exec(String(s==null?'':s)); if(!m) return null; const h=+m[1], q=+m[2]; return (h>24||q>59)?null:h*60+q; };
const fpdRgba=(h,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(h||''); const v=m?parseInt(m[1],16):0x4da3ff; return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; };
const fpdDF={}, fpdOC={};
function fpdOff(zone,t){ if(zone==='UTC') return 0; const b=Math.floor(t/3600), hk=zone+'|'+b; let v=fpdOC[hk]; if(v!==undefined) return v;
  let f=fpdDF[zone]; if(!f) f=fpdDF[zone]=new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
  const q={}; f.formatToParts(new Date(b*3600000)).forEach(x=>{ q[x.type]=+x.value; });
  v=Date.UTC(q.year,q.month-1,q.day,q.hour%24,q.minute,q.second)/1000-b*3600;
  if(Object.keys(fpdOC).length>30000) Object.keys(fpdOC).forEach(k=>delete fpdOC[k]); fpdOC[hk]=v; return v; }
// pip size: own value if set, else a sensible guess from the price (EURUSD 0.0001, JPY pairs 0.01, gold 0.1, big indices / crypto 1)
function fpdPip(ref,p){ const v=+p.pipSize; if(v>0) return v; return ref<20?0.0001:ref<1000?0.01:ref<20000?0.1:1; }
const fpdFmt=v=>{ const a=Math.abs(v); return a>=1000?v.toFixed(2):a>=100?v.toFixed(3):a>=1?v.toFixed(5):v.toPrecision(5); };
function fpdCompute(c,p){
  const n=c.length, R={ok:false,n,days:[],trades:[],msg:'',stat:'',ev:[]};
  if(n<5) return R;
  const tfS=tf[3]?tf[3]*30*86400:tf[2], s0=fpdHM(p.start), dur=Math.max(5,Math.round(+p.dur)||60);
  if(s0==null){ R.msg='50 Pips a Day: set the start time like 07:00'; R.stat='check start time'; return R; }
  if(!(tfS<86400)){ R.msg='50 Pips a Day works on intraday charts (1h or lower)'; R.stat='intraday only'; return R; }
  if(tfS>dur*60){ R.msg='50 Pips a Day: use a '+dur+' minute or lower timeframe'; R.stat='use '+dur+'m or lower'; return R; }
  const zone=p.tz||'UTC', sE=Math.min(1440,s0+dur), stepM=tfS/60;
  let eM=fpdHM(p.end); if(eM==null||eM<=sE) eM=1440;
  const pips=Math.max(0.1,+p.pips||50), slP=Math.max(0.1,+p.slPips||10), tpP=Math.max(0.1,+p.tpPips||50);
  const dy=new Int32Array(n), md=new Float64Array(n);
  for(let i=0;i<n;i++){ const L=c[i].time+fpdOff(zone,c[i].time), d=Math.floor(L/86400); dy[i]=d; md[i]=(L-d*86400)/60; }
  let i=0;
  while(i<n){
    const d=dy[i]; let j=i; while(j<n&&dy[j]===d) j++;
    const a=i; i=j;
    if(p.skipWE){ const wd=new Date(d*86400000).getUTCDay(); if(wd===0||wd===6) continue; }
    let first=-1, last=-1;
    for(let k=a;k<j;k++){ if(md[k]>=s0&&md[k]<sE){ if(first<0) first=k; last=k; } }
    if(first<0) continue;
    if(md[first]>=s0+stepM-0.001) continue;            // chart starts after the setup candle began
    if(md[last]+stepM<sE-0.001) continue;              // setup candle not finished / data missing
    if(last>=n-1) continue;                            // still forming: no signal until it has closed (no repaint)
    const ref=c[last].close, pip=fpdPip(ref,p), buyL=ref+pips*pip, sellL=ref-pips*pip;
    let tr=null, lastIdx=last;
    for(let k=last+1;k<j&&md[k]<eM;k++){
      lastIdx=k; const x=c[k];
      if(!tr){
        const hb=x.high>=buyL, hs=x.low<=sellL; if(!hb&&!hs) continue;
        const s=(hb&&hs)?(Math.abs(x.open-buyL)<=Math.abs(x.open-sellL)?1:-1):(hb?1:-1);
        const en=s===1?Math.max(x.open,buyL):Math.min(x.open,sellL), sl=en-s*slP*pip, tp=p.tpOn?en+s*tpP*pip:null;
        tr={s,i:k,en,sl,tp,res:null,j:null,xp:null};
        if(s*(x.close-sl)<=0){ tr.res='sl'; tr.j=k; tr.xp=sl; break; }          // entry candle judged on its close
        if(tp!=null&&s*(x.close-tp)>=0){ tr.res='tp'; tr.j=k; tr.xp=tp; break; }
        continue; }
      if(tr.s===1?x.low<=tr.sl:x.high>=tr.sl){ tr.res='sl'; tr.j=k; tr.xp=tr.sl; break; }   // stop-loss first when both are inside one candle
      if(tr.tp!=null&&(tr.s===1?x.high>=tr.tp:x.low<=tr.tp)){ tr.res='tp'; tr.j=k; tr.xp=tr.tp; break; }
    }
    const live=(j>=n)&&(md[lastIdx]+stepM<eM-0.001);
    if(tr&&tr.res==null&&!live){ tr.res='time'; tr.j=lastIdx; tr.xp=c[lastIdx].close; }
    const day={d,firstI:first,setI:last,ref,buyL,sellL,pip,endI:lastIdx,live,tr};
    R.days.push(day); if(tr) R.trades.push(tr);
  }
  { let w=0,l=0,t=0; R.trades.forEach(x=>{ if(x.res==='tp') w++; else if(x.res==='sl') l++; else if(x.res==='time') t++; });
    R.stat=R.days.length?(w+' TP / '+l+' SL'+(t?' / '+t+' timed':'')+'  ('+R.trades.length+' of '+R.days.length+' days)'):'waiting for '+p.start+' '+fpdTzName(zone)+' candle'; }
  R.trades.slice(-4).forEach(t=>{ R.ev.push({k:'fpd',time:c[t.i].time,msg:'50 PIPS A DAY '+(t.s===1?'BUY':'SELL'),col:t.s===1?'#2e7d32':'#c62828'}); });
  R.ok=true; return R;
}
function fpdDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r) return;
  const c=candles, n=r.n, fs=FPD_FS[o.size]||9.5;
  const x0=X(0), x1=X(1), xs=i=>{ const v=X(i); if(v!=null) return v; return (x0!=null&&x1!=null)?x0+(x1-x0)*i:null; };
  const step=(x0!=null&&x1!=null)?Math.abs(x1-x0):6;
  const tx=(t,x,y,col,al)=>{ cx.font=fs+'px system-ui'; cx.textAlign=al||'left'; cx.textBaseline='middle'; cx.lineWidth=3; cx.strokeStyle='rgba(8,12,22,.85)'; cx.strokeText(t,x,y); cx.fillStyle=col; cx.fillText(t,x,y); };
  const seg=(i0,p0,i1,p1,col,w,dash)=>{ const xa=xs(i0), xb=xs(i1), ya=Y(p0), yb=Y(p1); if(xa==null||xb==null||ya==null||yb==null) return null;
    cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(xa,ya); cx.lineTo(xb,yb); cx.stroke(); cx.setLineDash([]); return {xa,xb,ya,yb}; };
  const tri=(x,y,up,col,sz)=>{ cx.fillStyle=col; cx.beginPath(); if(up){ cx.moveTo(x,y); cx.lineTo(x-sz,y+sz*1.6); cx.lineTo(x+sz,y+sz*1.6); } else { cx.moveTo(x,y); cx.lineTo(x-sz,y-sz*1.6); cx.lineTo(x+sz,y-sz*1.6); } cx.closePath(); cx.fill(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  if(!r.ok){ if(r.msg) tx(r.msg,8,H-14,'#9aa3b5','left'); cx.restore(); return; }
  const N=Math.max(1,Math.round(+o.daysN)||5), days=r.days.slice(-N), tzn=fpdTzName(o.tz||'UTC'), pr=!!o.showPrice;
  let lastLab=-1e9;
  days.forEach((g,di)=>{
    const latest=di===days.length-1, xa=xs(g.firstI), xb=xs(g.setI), xl=g.live?xs(n-1+3):xs(g.endI);
    if(xa==null||xb==null) return;
    const colL=xa-step/2, colR=xb+step/2;
    // ---- the set time: thin column on the setup candle + small label ----
    if(o.showTime){ cx.fillStyle=fpdRgba(o.cTime,.12); cx.fillRect(colL,0,Math.max(2,colR-colL),H);
      const mid=(colL+colR)/2; if(mid-lastLab>64){ tx(o.start+' '+tzn,mid,16,fpdRgba(o.cTime,.95),'center'); lastLab=mid; } }
    // ---- the session: thin strip along the top edge from the setup close to the session end ----
    if(o.showBand&&xl!=null&&xl>colR){ cx.fillStyle=fpdRgba(o.cTime,.5); cx.fillRect(colR,0,xl-colR,3);
      if(latest&&!g.live) tx(o.end,xl,16,fpdRgba(o.cTime,.8),'center'); }
    const t=g.tr, trI=t?t.i:null;
    // ---- pending order levels: stop at the trigger candle (the other side is then cancelled) ----
    if(o.showLevels&&xl!=null){ const endI=t?t.i:(g.live?n-1+3:g.endI);
      [[g.buyL,1],[g.sellL,-1]].forEach(([lv,s])=>{ const won=t&&t.s===s, col=t?(won?(s===1?o.cBuy:o.cSell):'rgba(154,163,181,.55)'):(s===1?o.cBuy:o.cSell);
        const sg=seg(g.setI,lv,endI,lv,col,1,[5,4]);
        if(sg&&(latest||pr)) tx((s===1?'Buy stop':'Sell stop')+(pr||latest?' '+fpdFmt(lv):''),sg.xa+4,sg.ya+(s===1?-fs*.9:fs*.9),col,'left'); }); }
    if(!t) return;
    // ---- the trade ----
    const long=t.s===1, cb=long?o.cBuy:o.cSell, xe=xs(t.i); if(xe==null) return;
    if(o.showTrades){ const b=c[t.i]; if(b){ const yb=Y(long?b.low:b.high); if(yb!=null){
      if(long){ tri(xe,yb+4,true,cb,4.5); tx('BUY',xe,yb+4+7+fs*.9,cb,'center'); } else { tri(xe,yb-4,false,cb,4.5); tx('SELL',xe,yb-4-7-fs*.9,cb,'center'); } } } }
    if(o.showSLTP){ const endT=t.j!=null?t.j:n-1+3;
      const sl=seg(t.i,t.sl,endT,t.sl,o.cSell,1,[2,3]); if(sl&&(latest||pr)) tx('SL'+(pr?' '+fpdFmt(t.sl):''),sl.xb+3,sl.ya,o.cSell,'left');
      if(t.tp!=null){ const tp=seg(t.i,t.tp,endT,t.tp,o.cBuy,1,[2,3]); if(tp&&(latest||pr)) tx('TP'+(pr?' '+fpdFmt(t.tp):''),tp.xb+3,tp.ya,o.cBuy,'left'); } }
    if(o.showResult&&t.j!=null){ const xj=xs(t.j), yj=Y(t.xp); if(xj!=null&&yj!=null){
      if(t.res==='tp'){ cx.fillStyle=o.cBuy; cx.beginPath(); cx.arc(xj,yj,3.5,0,6.2832); cx.fill(); cx.strokeStyle=o.cBuy; cx.lineWidth=1.5; cx.beginPath(); cx.arc(xj,yj,6.5,0,6.2832); cx.stroke(); }
      else if(t.res==='sl'){ cx.strokeStyle=o.cSell; cx.lineWidth=2; cx.beginPath(); cx.moveTo(xj-4,yj-4); cx.lineTo(xj+4,yj+4); cx.moveTo(xj+4,yj-4); cx.lineTo(xj-4,yj+4); cx.stroke(); }
      else { cx.fillStyle='#9aa3b5'; cx.beginPath(); cx.arc(xj,yj,3,0,6.2832); cx.fill(); } } }
  });
  cx.setLineDash([]); cx.restore();
}
{ const _fpdD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='fpdview') return fpdDraw(d,X,Y,W,H); return _fpdD.apply(this,arguments); }; }
IND.fpd={label:'50 Pips a Day \u2013 early-session breakout (buy-stop / sell-stop \u00b1 50 pips)',title:'50 Pips a Day',cat:'Trend',cols:[],calc:()=>[],live:true,
  nm:p=>'50 Pips a Day '+p.start,
  status:i=>i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:Object.assign({},FPD_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o), hd=t=>{ const e=document.createElement('div'); e.textContent=t; e.style.cssText='margin:14px 0 6px;color:#8a90a5;font-size:12px;letter-spacing:.5px'; b.appendChild(e); };
    hd('TIME AND SESSION  (the tool only works inside this window)');
    F('tz','sel','Time zone  (UTC = GMT)',{opts:FPD_TZ}); F('start','txt','Setup candle starts at (HH:MM)'); F('dur','num','Setup candle length (minutes)',{min:5,max:240,step:5});
    F('end','txt','Orders cancelled / trade closed at (HH:MM)'); F('skipWE','chk','Skip Saturday and Sunday');
    hd('ORDERS  (set from the close of the setup candle)');
    F('pips','num','Buy-stop / sell-stop distance (pips)',{min:1,max:500,step:1}); F('slPips','num','Stop-loss beyond entry (pips, 5-10 classic)',{min:1,max:200,step:1});
    F('tpOn','chk','Take-profit'); F('tpPips','num','   Take-profit from entry (pips)',{min:1,max:1000,step:1});
    F('pipSize','num','Pip size in price (0 = automatic)',{min:0,max:100,step:0.0001});
    hd('SHOW ON CHART  (clean by default)');
    F('daysN','num','Days shown',{min:1,max:60,step:1}); F('showTime','chk','Time marker (setup candle column + label)'); F('showBand','chk','Session strip (top edge)'); F('showLevels','chk','Buy-stop / sell-stop levels');
    F('showTrades','chk','BUY / SELL arrows'); F('showSLTP','chk','Stop-loss / take-profit lines'); F('showResult','chk','Result marks (target / stop hit)'); F('showPrice','chk','Price tags on every day (otherwise latest day only)'); },
  styleTab:(b,d)=>{ const p=d.p; fld(b,p,'cBuy','col','BUY / take-profit colour'); fld(b,p,'cSell','col','SELL / stop-loss colour'); fld(b,p,'cTime','col','Time and session colour'); fld(b,p,'size','sel','Label size',{opts:['Tiny','Small','Normal','Large']}); },
  extras:(c,p)=>{ const r=fpdCompute(c,p); return {mk:[],boxes:[{type:'fpdview',pts:[],r,o:p}],labels:[],ev:r.ev,stat:r.stat}; }};
try{ DESC.fpd='Early-session breakout: pending buy-stop / sell-stop 50 pips from the 07:00 candle close. Shows only in the set time window'; }catch(e){}
window.__fpdCompute=fpdCompute;
}catch(err){ console.error('fpd indicator failed',err); window.__fpdErr=err; }

// =====================================================================================
// [oht] INDICATOR · "One-Hour Breakout Strategy"   (self-contained: every name starts with oht / OHT)
// Picker category: Trend (shows under the Indicators filter).
// Idea: after every completed hour, set a BUY-STOP 2 pips above that hour's high and a SELL-STOP 2 pips below its low.
// First order hit = the trade, the other is cancelled.  Take-profit 20 pips from entry, stop-loss = that hour's range + 2 pips.
// Optional trailing stop.  Works on the 1h chart or lower (lower charts are grouped into hours).
// Only works inside the trading hours you set - everywhere else the chart stays empty.
// Clean by default: thin trading-hours strip, the latest live setup (range box + two levels), and the last few trades.
// Hooks: IND.oht + draw (same pattern as 50 Pips a Day). Nothing existing is edited.
// =====================================================================================
try{
const OHT_TZ=['UTC','Europe/London','America/New_York','Europe/Berlin','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Africa/Nairobi','Australia/Sydney'];
const OHT_DEF={
  // --- time and trading hours ---
  tz:'UTC', useWin:true, start:'07:00', end:'17:00', skipWE:true,
  // --- orders ---
  buf:2, tpOn:true, tpPips:20, slMode:'Prior hour range + buffer', slPips:20, trailOn:false, trailPips:10,
  validH:1, holdH:4, oneAtATime:true, pipSize:0,
  // --- what is visible (clean by default) ---
  tradesN:6, daysN:3, showTime:true, showRange:true, showLevels:true, showTrades:true, showSLTP:true, showResult:true, showPrice:false,
  // --- style ---
  cBuy:'#2dd4a7', cSell:'#ff5d7a', cTime:'#4da3ff', cRange:'#c9d1e0', size:'Small'
};
const OHT_FS={Tiny:8,Small:9.5,Normal:11,Large:13};
const ohtTzName=z=>z==='UTC'?'GMT':String(z).split('/').pop().replace(/_/g,' ');
const ohtHM=s=>{ const m=/^\s*(\d{1,2})\s*:?\s*(\d{2})\s*$/.exec(String(s==null?'':s)); if(!m) return null; const h=+m[1], q=+m[2]; return (h>24||q>59)?null:h*60+q; };
const ohtRgba=(h,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(h||''); const v=m?parseInt(m[1],16):0x4da3ff; return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; };
const ohtDF={}, ohtOC={};
function ohtOff(zone,t){ if(zone==='UTC') return 0; const b=Math.floor(t/3600), hk=zone+'|'+b; let v=ohtOC[hk]; if(v!==undefined) return v;
  let f=ohtDF[zone]; if(!f) f=ohtDF[zone]=new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
  const q={}; f.formatToParts(new Date(b*3600000)).forEach(x=>{ q[x.type]=+x.value; });
  v=Date.UTC(q.year,q.month-1,q.day,q.hour%24,q.minute,q.second)/1000-b*3600;
  if(Object.keys(ohtOC).length>30000) Object.keys(ohtOC).forEach(k=>delete ohtOC[k]); ohtOC[hk]=v; return v; }
function ohtPip(ref,p){ const v=+p.pipSize; if(v>0) return v; return ref<20?0.0001:ref<1000?0.01:ref<20000?0.1:1; }
const ohtFmt=v=>{ const a=Math.abs(v); return a>=1000?v.toFixed(2):a>=100?v.toFixed(3):a>=1?v.toFixed(5):v.toPrecision(5); };
function ohtCompute(c,p){
  const n=c.length, R={ok:false,n,setups:[],trades:[],sess:[],msg:'',stat:'',ev:[]};
  if(n<10) return R;
  const tfS=tf[3]?tf[3]*30*86400:tf[2];
  if(!(tfS<=3600)){ R.msg='One-Hour Breakout: use the 1 hour chart or lower'; R.stat='use 1h or lower'; return R; }
  const zone=p.tz||'UTC', s0=ohtHM(p.start), e0=ohtHM(p.end), winOn=!!p.useWin&&s0!=null&&e0!=null;
  const buf=Math.max(0,+p.buf||0), tpP=Math.max(0.1,+p.tpPips||20), slFix=Math.max(0.1,+p.slPips||20), trP=Math.max(0.1,+p.trailPips||10);
  const validS=Math.max(1,Math.round(+p.validH)||1)*3600, holdS=Math.max(1,+p.holdH||4)*3600;
  const inWin=m=>!winOn||(e0>s0?(m>=s0&&m<e0):(m>=s0||m<e0));
  // ---- trading-hours strips per local day (for the time marker) ----
  { let cur=null; for(let i=0;i<n;i++){ const L=c[i].time+ohtOff(zone,c[i].time), d=Math.floor(L/86400), m=(L-d*86400)/60;
      if(p.skipWE){ const wd=new Date(d*86400000).getUTCDay(); if(wd===0||wd===6) continue; }
      if(winOn&&inWin(m)){ if(cur&&cur.d===d&&i-cur.i1<=2*Math.ceil(3600/tfS)+2) cur.i1=i; else { cur={d,i0:i,i1:i}; R.sess.push(cur); } } } }
  // ---- group candles into hours ----
  const H=[]; for(let i=0;i<n;i++){ const hb=Math.floor(c[i].time/3600), x=c[i], L=H[H.length-1];
    if(L&&L.hb===hb){ L.last=i; if(x.high>L.hi) L.hi=x.high; if(x.low<L.lo) L.lo=x.low; } else H.push({hb,first:i,last:i,hi:x.high,lo:x.low}); }
  let busy=-1;
  for(let k=0;k<H.length-1;k++){
    const A=H[k], B=H[k+1];
    if(B.hb!==A.hb+1) continue;                                          // gap (weekend / missing data)
    if(c[A.first].time-A.hb*3600>=tfS||c[A.last].time+tfS<(A.hb+1)*3600) continue;   // prior hour must be a full hour
    const T0=B.hb*3600, Lc=T0+ohtOff(zone,T0), dd=Math.floor(Lc/86400), mm=(Lc-dd*86400)/60;
    if(p.skipWE){ const wd=new Date(dd*86400000).getUTCDay(); if(wd===0||wd===6) continue; }
    if(!inWin(mm)) continue;
    if(p.oneAtATime&&B.first<=busy) continue;
    const ref=c[A.last].close, pip=ohtPip(ref,p), buyL=A.hi+buf*pip, sellL=A.lo-buf*pip, rng=A.hi-A.lo;
    let tr=null, m=B.first, lastIdx=B.first;
    for(;m<n&&c[m].time<T0+validS;m++){ lastIdx=m; const x=c[m];
      const hb=x.high>=buyL, hs=x.low<=sellL; if(!hb&&!hs) continue;
      const s=(hb&&hs)?(Math.abs(x.open-buyL)<=Math.abs(x.open-sellL)?1:-1):(hb?1:-1);
      tr={s,i:m,en:s===1?Math.max(x.open,buyL):Math.min(x.open,sellL),sl:0,sl0:0,tp:null,res:null,j:null,xp:null}; break; }
    if(tr){
      const sd=(p.slMode==='Fixed pips')?slFix*pip:(rng+buf*pip);
      tr.sl=tr.sl0=tr.en-tr.s*sd; tr.tp=p.tpOn?tr.en+tr.s*tpP*pip:null;
      const endT=c[tr.i].time+holdS; let best=tr.en, q=tr.i, ex=false;
      const fin=(res,idx,xp)=>{ tr.res=res; tr.j=idx; tr.xp=xp; ex=true; };
      const e1=c[q]; if(tr.s*(e1.close-tr.sl)<=0) fin('sl',q,tr.sl); else if(tr.tp!=null&&tr.s*(e1.close-tr.tp)>=0) fin('tp',q,tr.tp); else best=e1.close;
      let lastQ=q;
      for(q=q+1;!ex&&q<n&&c[q].time<endT;q++){ lastQ=q; const x=c[q];
        if(tr.s===1?x.low<=tr.sl:x.high>=tr.sl){ fin((tr.s*(tr.sl-tr.en)>0)?'trail':'sl',q,tr.sl); break; }       // stop-loss first when both are inside one candle
        if(tr.tp!=null&&(tr.s===1?x.high>=tr.tp:x.low<=tr.tp)){ fin('tp',q,tr.tp); break; }
        if(p.trailOn){ const ext=tr.s===1?x.high:x.low; if(tr.s*(ext-best)>0) best=ext; const ns=best-tr.s*trP*pip; if(tr.s*(best-tr.en)>=trP*pip&&tr.s*(ns-tr.sl)>0) tr.sl=ns; } }
      if(!ex){ const live=(lastQ>=n-1)&&(c[n-1].time+tfS<endT); if(!live){ tr.res='time'; tr.j=lastQ; tr.xp=c[lastQ].close; } }
      busy=tr.j!=null?tr.j:n+10; lastIdx=Math.max(lastIdx,tr.i);
      R.trades.push(tr); }
    const live=!tr&&(lastIdx>=n-1)&&(c[n-1].time+tfS<T0+validS);
    R.setups.push({A,startI:B.first,endI:lastIdx,hi:A.hi,lo:A.lo,rng,buyL,sellL,pip,live,tr});
  }
  { let w=0,l=0,t=0; R.trades.forEach(x=>{ if(x.res==='tp'||x.res==='trail') w++; else if(x.res==='sl') l++; else if(x.res==='time') t++; });
    R.stat=R.trades.length?(w+' win / '+l+' SL'+(t?' / '+t+' timed':'')+'  ('+R.trades.length+' trades)'):'no breakout trade yet'; }
  R.trades.slice(-4).forEach(t=>{ R.ev.push({k:'oht',time:c[t.i].time,msg:'ONE-HOUR BREAKOUT '+(t.s===1?'BUY':'SELL'),col:t.s===1?'#2e7d32':'#c62828'}); });
  R.ok=true; return R;
}
function ohtDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r) return;
  const c=candles, n=r.n, fs=OHT_FS[o.size]||9.5;
  const x0=X(0), x1=X(1), xs=i=>{ const v=X(i); if(v!=null) return v; return (x0!=null&&x1!=null)?x0+(x1-x0)*i:null; };
  const step=(x0!=null&&x1!=null)?Math.abs(x1-x0):6;
  const tx=(t,x,y,col,al)=>{ cx.font=fs+'px system-ui'; cx.textAlign=al||'left'; cx.textBaseline='middle'; cx.lineWidth=3; cx.strokeStyle='rgba(8,12,22,.85)'; cx.strokeText(t,x,y); cx.fillStyle=col; cx.fillText(t,x,y); };
  const seg=(i0,p0,i1,p1,col,w,dash)=>{ const xa=xs(i0), xb=xs(i1), ya=Y(p0), yb=Y(p1); if(xa==null||xb==null||ya==null||yb==null) return null;
    cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(xa,ya); cx.lineTo(xb,yb); cx.stroke(); cx.setLineDash([]); return {xa,xb,ya,yb}; };
  const tri=(x,y,up,col,sz)=>{ cx.fillStyle=col; cx.beginPath(); if(up){ cx.moveTo(x,y); cx.lineTo(x-sz,y+sz*1.6); cx.lineTo(x+sz,y+sz*1.6); } else { cx.moveTo(x,y); cx.lineTo(x-sz,y-sz*1.6); cx.lineTo(x+sz,y-sz*1.6); } cx.closePath(); cx.fill(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  if(!r.ok){ if(r.msg) tx(r.msg,8,H-14,'#9aa3b5','left'); cx.restore(); return; }
  const tzn=ohtTzName(o.tz||'UTC'), pr=!!o.showPrice, dayN=Math.max(1,Math.round(+o.daysN)||3);
  // ---- trading hours: thin strip along the top edge + small time label ----
  if(o.showTime&&o.useWin){ let lastLab=-1e9; r.sess.slice(-dayN).forEach((g,di,arr)=>{ const xa=xs(g.i0), xb=xs(g.i1); if(xa==null||xb==null) return;
      cx.fillStyle=ohtRgba(o.cTime,.5); cx.fillRect(xa-step/2,0,Math.max(2,xb-xa+step),3);
      if(xa-lastLab>90){ tx(o.start+'-'+o.end+' '+tzn,xa,16,ohtRgba(o.cTime,.9),'left'); lastLab=xa; } }); }
  // ---- live setup: previous hour range + the two pending levels (older unfilled setups show nothing) ----
  const ls=r.setups[r.setups.length-1];
  if(ls&&ls.live){
    const xr0=xs(ls.A.first), xr1=xs(ls.A.last), xl=xs(n-1+3), yh=Y(ls.hi), yl=Y(ls.lo);
    if(o.showRange&&xr0!=null&&xr1!=null&&yh!=null&&yl!=null){ cx.fillStyle=ohtRgba(o.cRange,.08); cx.fillRect(xr0-step/2,yh,xr1-xr0+step,yl-yh); cx.strokeStyle=ohtRgba(o.cRange,.5); cx.lineWidth=1; cx.strokeRect(xr0-step/2,yh,xr1-xr0+step,yl-yh);
      tx('prev hour '+(ls.rng/ls.pip).toFixed(1)+' pips',xr0-step/2,yh-fs*.9,'#cfd5e3','left'); }
    if(o.showLevels&&xl!=null) [[ls.buyL,1],[ls.sellL,-1]].forEach(([lv,s])=>{ const col=s===1?o.cBuy:o.cSell, sg=seg(ls.startI,lv,n-1+3,lv,col,1,[5,4]);
      if(sg) tx((s===1?'Buy stop ':'Sell stop ')+ohtFmt(lv),sg.xb-4,sg.ya+(s===1?-fs*.9:fs*.9),col,'right'); });
  }
  // ---- last trades (cancelled side is not drawn) ----
  const N=Math.max(1,Math.round(+o.tradesN)||6), tl=r.trades.slice(-N);
  tl.forEach((t,ti)=>{ const latest=ti===tl.length-1, long=t.s===1, cb=long?o.cBuy:o.cSell, xe=xs(t.i); if(xe==null) return;
    if(o.showTrades){ const b=c[t.i]; if(b){ const yb=Y(long?b.low:b.high); if(yb!=null){
      if(long){ tri(xe,yb+4,true,cb,4.5); tx('BUY',xe,yb+4+7+fs*.9,cb,'center'); } else { tri(xe,yb-4,false,cb,4.5); tx('SELL',xe,yb-4-7-fs*.9,cb,'center'); } } } }
    if(o.showSLTP){ const endT=t.j!=null?t.j:n-1+3;
      const sl=seg(t.i,t.sl0,endT,t.sl0,o.cSell,1,[2,3]); if(sl&&(latest||pr)) tx('SL'+(pr?' '+ohtFmt(t.sl0):''),sl.xb+3,sl.ya,o.cSell,'left');
      if(t.tp!=null){ const tp=seg(t.i,t.tp,endT,t.tp,o.cBuy,1,[2,3]); if(tp&&(latest||pr)) tx('TP'+(pr?' '+ohtFmt(t.tp):''),tp.xb+3,tp.ya,o.cBuy,'left'); } }
    if(o.showResult&&t.j!=null){ const xj=xs(t.j), yj=Y(t.xp); if(xj!=null&&yj!=null){
      if(t.res==='tp'||t.res==='trail'){ cx.fillStyle=o.cBuy; cx.beginPath(); cx.arc(xj,yj,3.5,0,6.2832); cx.fill(); cx.strokeStyle=o.cBuy; cx.lineWidth=1.5; cx.beginPath(); cx.arc(xj,yj,6.5,0,6.2832); cx.stroke(); }
      else if(t.res==='sl'){ cx.strokeStyle=o.cSell; cx.lineWidth=2; cx.beginPath(); cx.moveTo(xj-4,yj-4); cx.lineTo(xj+4,yj+4); cx.moveTo(xj+4,yj-4); cx.lineTo(xj-4,yj+4); cx.stroke(); }
      else { cx.fillStyle='#9aa3b5'; cx.beginPath(); cx.arc(xj,yj,3,0,6.2832); cx.fill(); } } }
  });
  cx.setLineDash([]); cx.restore();
}
{ const _ohtD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='ohtview') return ohtDraw(d,X,Y,W,H); return _ohtD.apply(this,arguments); }; }
IND.oht={label:'One-Hour Breakout Strategy \u2013 buy-stop / sell-stop around the previous hour',title:'One-Hour Breakout Strategy',cat:'Trend',cols:[],calc:()=>[],live:true,
  nm:p=>'1H Breakout '+p.buf+'p',
  status:i=>i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:Object.assign({},OHT_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o), hd=t=>{ const e=document.createElement('div'); e.textContent=t; e.style.cssText='margin:14px 0 6px;color:#8a90a5;font-size:12px;letter-spacing:.5px'; b.appendChild(e); };
    hd('TRADING HOURS  (new orders are only set inside this window)');
    F('useWin','chk','Only trade inside these hours'); F('tz','sel','Time zone  (UTC = GMT)',{opts:OHT_TZ}); F('start','txt','From (HH:MM)'); F('end','txt','To (HH:MM)'); F('skipWE','chk','Skip Saturday and Sunday');
    hd('ORDERS  (set after every completed hour)');
    F('buf','num','Buffer beyond the hour high / low (pips)',{min:0,max:50,step:0.5}); F('validH','num','Orders stay active for (hours)',{min:1,max:6,step:1}); F('oneAtATime','chk','No new orders while a trade is open');
    hd('TAKE-PROFIT AND STOP-LOSS');
    F('tpOn','chk','Take-profit'); F('tpPips','num','   Take-profit from entry (pips)',{min:1,max:500,step:1});
    F('slMode','sel','Stop-loss distance',{opts:['Prior hour range + buffer','Fixed pips']}); F('slPips','num','   Fixed stop-loss (pips)',{min:1,max:300,step:1});
    F('trailOn','chk','Trailing stop (lets profits run)'); F('trailPips','num','   Trail distance (pips)',{min:1,max:200,step:1}); F('holdH','num','Close a trade after (hours) if nothing hit',{min:1,max:48,step:1});
    F('pipSize','num','Pip size in price (0 = automatic)',{min:0,max:100,step:0.0001});
    hd('SHOW ON CHART  (clean by default)');
    F('tradesN','num','Trades shown',{min:1,max:60,step:1}); F('daysN','num','Days with trading-hours strip',{min:1,max:30,step:1}); F('showTime','chk','Trading hours strip + time label'); F('showRange','chk','Live setup: previous hour range box'); F('showLevels','chk','Live setup: buy-stop / sell-stop levels');
    F('showTrades','chk','BUY / SELL arrows'); F('showSLTP','chk','Stop-loss / take-profit lines'); F('showResult','chk','Result marks (target / stop hit)'); F('showPrice','chk','Price tags on every trade (otherwise latest only)'); },
  styleTab:(b,d)=>{ const p=d.p; fld(b,p,'cBuy','col','BUY / take-profit colour'); fld(b,p,'cSell','col','SELL / stop-loss colour'); fld(b,p,'cTime','col','Trading hours colour'); fld(b,p,'cRange','col','Previous hour range colour'); fld(b,p,'size','sel','Label size',{opts:['Tiny','Small','Normal','Large']}); },
  extras:(c,p)=>{ const r=ohtCompute(c,p); return {mk:[],boxes:[{type:'ohtview',pts:[],r,o:p}],labels:[],ev:r.ev,stat:r.stat}; }};
try{ DESC.oht='Breakout of the previous hour: buy-stop 2 pips above its high, sell-stop 2 pips below its low, 20 pip target. Only inside your trading hours'; }catch(e){}
window.__ohtCompute=ohtCompute;
}catch(err){ console.error('oht indicator failed',err); window.__ohtErr=err; }

// =====================================================================================
// [tlt] INDICATOR · "Trendline Trading (beginner friendly)"   (self-contained: every name starts with tlt / TLT)
// Picker category: Trend (shows under the Indicators filter).
// Idea (from the two reference charts): draw the rising line under swing lows (support) and the falling line over
// swing highs (resistance).  When price comes back, touches the line and is pushed away again = BUY on the rising line,
// SELL on the falling line (numbered #1, #2, #3 ...; a poke through that closes back is labelled "false break").
// A flat support / resistance level that meets the line makes the setup "strong" (marked with a star).
// Beginner friendly: plain words everywhere, one short tip line on the chart, few settings, clean by default
// (only 3 lines, nearest support + resistance, last 6 signals).  Signals are confirmed on closed candles (no repaint),
// one trade at a time.  Hooks: IND.tlt + draw (same pattern as the other strategy tools). Nothing existing is edited.
// =====================================================================================
try{
const TLT_DEF={
  // --- basic ---
  dir:'Both', swing:'Medium', strongOnly:false,
  // --- what is visible (clean by default) ---
  showLines:true, linesN:3, showRings:true, showSignals:true, tradesN:6, showLevels:true, levelsN:1, showSLTP:true, showResult:true, tips:true, showPrice:false,
  // --- fine tuning ---
  touchTol:0.3, breakTol:0.5, slATR:0.25, rr:2, maxHold:60, closeOnly:true,
  // --- style ---
  cUp:'#3d9bff', cDn:'#ff5d5d', cBuy:'#2dd4a7', cSell:'#ff5d7a', cRes:'#b565d9', cSup:'#9aa3b5', size:'Small'
};
const TLT_SW={Small:4,Medium:7,Large:12};
const TLT_FS={Tiny:8,Small:9.5,Normal:11,Large:13};
const tltFmt=v=>{ const a=Math.abs(v); return a>=1000?v.toFixed(2):a>=100?v.toFixed(3):a>=1?v.toFixed(5):v.toPrecision(5); };
function tltCompute(c0,p){
  const c=(p.closeOnly&&c0.length>1)?c0.slice(0,-1):c0, n=c.length;
  const R={ok:false,n,lines:[],trades:[],levels:[],tip:'',stat:'',ev:[]};
  const SW=TLT_SW[p.swing]||7; if(n<4*SW+20) return R;
  const a=atrW(c,14), tolK=Math.max(0.05,+p.touchTol||0.3), brkK=Math.max(0.1,+p.breakTol||0.5);
  const dirOK=s=>p.dir==='Both'||(p.dir==='Buy only'&&s===1)||(p.dir==='Sell only'&&s===-1);
  const rr=Math.max(0.5,+p.rr||2), slK=Math.max(0,+p.slATR||0), hold=Math.max(5,Math.round(+p.maxHold)||60);
  const pvs=[]; let lL=null, lH=null, up=null, dn=null, open=null, id=0;
  const at=(L,i)=>L.p2+L.m*(i-L.i2);
  const strongAt=(t,lv,ai,L)=>{ const tolL=tolK*1.5*ai; for(let k=pvs.length-1;k>=0;k--){ const q=pvs[k]; if(t-q.i>400) break; if(q.i===L.i1||q.i===L.i2) continue; if(Math.abs(q.p-lv)<=tolL) return true; } return false; };
  for(let t=2*SW;t<n;t++){
    const j=t-SW, x=c[t], ai=a[t], okA=ai>0;
    // ---- new swing points -> lines ----
    if(pivAt(c,j,SW,SW,'l')){ const v=c[j].low; pvs.push({i:j,p:v});
      if(lL&&v>lL.p&&j-lL.i>=SW&&j-lL.i<=200){ const onOld=up&&okA&&Math.abs(v-at(up,j))<=1.5*tolK*ai;
        if(!onOld){ if(up) up.end=t; up={id:++id,kind:'up',s:1,i1:lL.i,p1:lL.p,i2:j,p2:v,m:(v-lL.p)/(j-lL.i),born:t,end:null,nSig:0,last:-99}; R.lines.push(up); } }
      lL={i:j,p:v}; }
    if(pivAt(c,j,SW,SW,'h')){ const v=c[j].high; pvs.push({i:j,p:v});
      if(lH&&v<lH.p&&j-lH.i>=SW&&j-lH.i<=200){ const onOld=dn&&okA&&Math.abs(v-at(dn,j))<=1.5*tolK*ai;
        if(!onOld){ if(dn) dn.end=t; dn={id:++id,kind:'dn',s:-1,i1:lH.i,p1:lH.p,i2:j,p2:v,m:(v-lH.p)/(j-lH.i),born:t,end:null,nSig:0,last:-99}; R.lines.push(dn); } }
      lH={i:j,p:v}; }
    if(!okA) continue;
    // ---- a line is dropped once price closes clearly through it, or it gets too old ----
    if(up&&(x.close<at(up,t)-brkK*ai||t-up.i2>400)){ up.end=t; up=null; }
    if(dn&&(x.close>at(dn,t)+brkK*ai||t-dn.i2>400)){ dn.end=t; dn=null; }
    // ---- manage the open trade ----
    if(open){ const o=open, long=o.s===1; let res=null, xp=0;
      if(t>o.i){ if(long?x.low<=o.sl:x.high>=o.sl){ res='sl'; xp=o.sl; } else if(long?x.high>=o.tp:x.low<=o.tp){ res='tp'; xp=o.tp; } else if(t-o.i>=hold){ res='time'; xp=x.close; } }
      if(res){ o.res=res; o.j=t; o.xp=xp; open=null; } }
    if(open) continue;
    // ---- bounce off the rising line = BUY ----
    if(up&&t>up.born&&t-up.last>=SW&&dirOK(1)){ const lv=at(up,t), tol=tolK*ai, pr=c[t-1];
      if(x.low<=lv+tol&&x.close>lv&&x.close>x.open&&pr.close>at(up,t-1)-tol){
        const strong=strongAt(t,lv,ai,up), fb=x.low<lv-0.15*ai;
        if(!(p.strongOnly&&!strong)){ const sl=x.low-slK*ai, risk=x.close-sl;
          if(risk>0){ up.nSig++; up.last=t; open={s:1,i:t,en:x.close,sl,tp:x.close+rr*risk,n:up.nSig,strong,fb,lid:up.id,lv,res:null,j:null,xp:null}; R.trades.push(open); continue; } } } }
    // ---- rejection from the falling line = SELL ----
    if(dn&&t>dn.born&&t-dn.last>=SW&&dirOK(-1)){ const lv=at(dn,t), tol=tolK*ai, pr=c[t-1];
      if(x.high>=lv-tol&&x.close<lv&&x.close<x.open&&pr.close<at(dn,t-1)+tol){
        const strong=strongAt(t,lv,ai,dn), fb=x.high>lv+0.15*ai;
        if(!(p.strongOnly&&!strong)){ const sl=x.high+slK*ai, risk=sl-x.close;
          if(risk>0){ dn.nSig++; dn.last=t; open={s:-1,i:t,en:x.close,sl,tp:x.close-rr*risk,n:dn.nSig,strong,fb,lid:dn.id,lv,res:null,j:null,xp:null}; R.trades.push(open); } } } }
  }
  // ---- flat support / resistance levels nearest to the current price ----
  { const lastC=c[n-1].close, aL=a[n-1], NL=Math.max(0,Math.round(+p.levelsN)||0);
    if(aL>0&&NL>0&&pvs.length){ const cand=pvs.filter(q=>n-1-q.i<=500).slice().sort((u,v)=>u.p-v.p), cl=[];
      cand.forEach(q=>{ const g=cl[cl.length-1]; if(g&&q.p-g.hi<=0.6*aL){ g.hi=q.p; g.sum+=q.p; g.cnt++; g.i=Math.min(g.i,q.i); } else cl.push({hi:q.p,sum:q.p,cnt:1,i:q.i}); });
      const lv=cl.map(g=>({p:g.sum/g.cnt,i:g.i,cnt:g.cnt}));
      R.levels=lv.filter(q=>q.p>lastC+0.3*aL).sort((u,v)=>u.p-v.p).slice(0,NL).map(q=>Object.assign({res:true},q))
        .concat(lv.filter(q=>q.p<lastC-0.3*aL).sort((u,v)=>v.p-u.p).slice(0,NL).map(q=>Object.assign({res:false},q))); } }
  // ---- one plain-words tip line + stats + alerts ----
  { const lt=R.trades[R.trades.length-1];
    if(lt&&n-1-lt.i<=40) R.tip='Latest: '+(lt.s===1?'BUY - price bounced up off the rising line (support)':'SELL - price was pushed down by the falling line (resistance)')+(lt.strong?'  \u2605 strong':'');
    else if(up&&dn) R.tip='Watching: a bounce off the rising line = BUY, a rejection at the falling line = SELL';
    else if(up) R.tip='Watching the rising line: a bounce off it gives a BUY';
    else if(dn) R.tip='Watching the falling line: a rejection from it gives a SELL';
    else R.tip='No clear trendline yet - waiting for two swing points'; }
  { let w=0,l=0,t=0; R.trades.forEach(x=>{ if(x.res==='tp') w++; else if(x.res==='sl') l++; else if(x.res==='time') t++; });
    R.stat=R.trades.length?(w+' TP / '+l+' SL'+(t?' / '+t+' timed':'')+'  ('+R.trades.length+' signals)'):'no signal yet'; }
  R.trades.slice(-4).forEach(t=>{ R.ev.push({k:'tlt',time:c[t.i].time,msg:'TRENDLINE '+(t.s===1?'BUY':'SELL')+(t.strong?' (strong)':''),col:t.s===1?'#2e7d32':'#c62828'}); });
  R.ok=true; return R;
}
function tltDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r||!r.ok) return;
  const c=candles, n=r.n, fs=TLT_FS[o.size]||9.5, pr=!!o.showPrice;
  const x0=X(0), x1=X(1), xs=i=>{ const v=X(i); if(v!=null) return v; return (x0!=null&&x1!=null)?x0+(x1-x0)*i:null; };
  const tx=(t,x,y,col,al)=>{ cx.font=fs+'px system-ui'; cx.textAlign=al||'left'; cx.textBaseline='middle'; cx.lineWidth=3; cx.strokeStyle='rgba(8,12,22,.85)'; cx.strokeText(t,x,y); cx.fillStyle=col; cx.fillText(t,x,y); };
  const seg=(i0,p0,i1,p1,col,w,dash)=>{ const xa=xs(i0), xb=xs(i1), ya=Y(p0), yb=Y(p1); if(xa==null||xb==null||ya==null||yb==null) return null;
    cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(xa,ya); cx.lineTo(xb,yb); cx.stroke(); cx.setLineDash([]); return {xa,xb,ya,yb}; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  const at=(L,i)=>L.p2+L.m*(i-L.i2), edge=n-1+4;
  // ---- flat support / resistance (nearest to price) ----
  if(o.showLevels) r.levels.forEach(q=>{ const col=q.res?o.cRes:o.cSup, sg=seg(q.i,q.p,edge,q.p,col,1.2);
    if(sg) tx((q.res?'Resistance':'Support')+(q.cnt>1?' ('+q.cnt+' touches)':'')+(pr?' '+tltFmt(q.p):''),sg.xb-4,sg.ya+(q.res?-fs*.9:fs*.9),col,'right'); });
  // ---- trendlines: the active ones plus lines that produced signals ----
  const shownAll=r.lines.filter(l=>l.end==null||l.nSig>0), shown=shownAll.slice(-Math.max(1,Math.round(+o.linesN)||3)), ids={};
  shown.forEach(l=>{ ids[l.id]=1; if(!o.showLines) return; const endI=l.end!=null?l.end:edge, col=l.kind==='up'?o.cUp:o.cDn, sg=seg(l.i1,l.p1,endI,at(l,endI),col,1.7);
    if(sg&&l.end==null&&o.tips) tx(l.kind==='up'?'Rising line (support)':'Falling line (resistance)',sg.xb-4,sg.yb+(l.kind==='up'?fs*1.6:-fs*1.6),col,'right'); });
  // ---- signals ----
  const N=Math.max(1,Math.round(+o.tradesN)||6), tl=r.trades.filter(t=>ids[t.lid]).slice(-N);
  tl.forEach((t,ti)=>{ const latest=t===r.trades[r.trades.length-1], long=t.s===1, cb=long?o.cBuy:o.cSell, lc=long?o.cUp:o.cDn, xe=xs(t.i), yl=Y(t.lv); if(xe==null||yl==null) return;
    if(o.showRings){ cx.strokeStyle=lc; cx.lineWidth=1.5; cx.beginPath(); cx.arc(xe,yl,9,0,6.2832); cx.stroke(); }
    if(o.showSignals){ const lab=(long?'BUY':'SELL')+' #'+t.n+(t.fb?' (false break)':'')+(t.strong?' \u2605':''); tx(lab,xe,yl+(long?1:-1)*(9+fs*1.1),cb,'center'); }
    if(o.showSLTP&&latest){ const endT=t.j!=null?t.j:edge;
      const sl=seg(t.i,t.sl,endT,t.sl,o.cSell,1,[2,3]); if(sl) tx('Stop-loss'+(pr?' '+tltFmt(t.sl):''),sl.xb+3,sl.ya,o.cSell,'left');
      const tp=seg(t.i,t.tp,endT,t.tp,o.cBuy,1,[2,3]); if(tp) tx('Target'+(pr?' '+tltFmt(t.tp):''),tp.xb+3,tp.ya,o.cBuy,'left'); }
    if(o.showResult&&t.j!=null){ const xj=xs(t.j), yj=Y(t.xp); if(xj!=null&&yj!=null){
      if(t.res==='tp'){ cx.fillStyle=o.cBuy; cx.beginPath(); cx.arc(xj,yj,3.5,0,6.2832); cx.fill(); cx.strokeStyle=o.cBuy; cx.lineWidth=1.5; cx.beginPath(); cx.arc(xj,yj,6.5,0,6.2832); cx.stroke(); }
      else if(t.res==='sl'){ cx.strokeStyle=o.cSell; cx.lineWidth=2; cx.beginPath(); cx.moveTo(xj-4,yj-4); cx.lineTo(xj+4,yj+4); cx.moveTo(xj+4,yj-4); cx.lineTo(xj-4,yj+4); cx.stroke(); }
      else { cx.fillStyle='#9aa3b5'; cx.beginPath(); cx.arc(xj,yj,3,0,6.2832); cx.fill(); } } }
  });
  // ---- one plain-words tip at the bottom-left ----
  if(o.tips&&r.tip) tx(r.tip,8,H-12,'#cfd5e3','left');
  cx.setLineDash([]); cx.restore();
}
{ const _tltD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='tltview') return tltDraw(d,X,Y,W,H); return _tltD.apply(this,arguments); }; }
IND.tlt={label:'Trendline Trading 4hrs + (beginner friendly) \u2013 rising / falling lines, bounces and support / resistance',title:'Trendline Trading 4hrs +',cat:'Trend',cols:[],calc:()=>[],live:true,
  nm:p=>'Trendline 4hrs + '+(p.swing||'Medium'),
  status:i=>i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:Object.assign({},TLT_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o),
      hd=t=>{ const e=document.createElement('div'); e.textContent=t; e.style.cssText='margin:14px 0 6px;color:#8a90a5;font-size:12px;letter-spacing:.5px'; b.appendChild(e); },
      note=t=>{ const e=document.createElement('div'); e.textContent=t; e.style.cssText='margin:4px 0 6px;color:#aab1c5;font-size:12px;line-height:1.5'; b.appendChild(e); };
    hd('HOW IT WORKS  (in plain words)');
    note('1. The tool draws a RISING line under the swing lows (support) and a FALLING line over the swing highs (resistance).');
    note('2. When price comes back, touches a line and is pushed away again, it marks BUY (rising line) or SELL (falling line). The number counts the touches: #1, #2, #3.');
    note('3. "False break" = price poked through the line but closed back on the right side. The star means a flat support / resistance level meets the line too, so the setup is stronger.');
    note('4. A line is dropped when price closes clearly through it. Signals use closed candles only, so they never change afterwards. One trade at a time.');
    hd('BASIC');
    F('dir','sel','What to look for',{opts:['Both','Buy only','Sell only']}); F('swing','sel','Swing size  (Small = more lines, Large = fewer and stronger)',{opts:['Small','Medium','Large']});
    F('strongOnly','chk','Only strong setups (star: line meets a support / resistance level)');
    hd('SHOW ON CHART  (clean by default)');
    F('showLines','chk','Trendlines'); F('linesN','num','   How many lines',{min:1,max:10,step:1}); F('showRings','chk','Circles where price touched the line'); F('showSignals','chk','BUY / SELL labels'); F('tradesN','num','   How many signals',{min:1,max:40,step:1});
    F('showLevels','chk','Flat support / resistance near price'); F('levelsN','num','   How many each side',{min:0,max:4,step:1});
    F('showSLTP','chk','Stop-loss and target of the latest signal'); F('showResult','chk','Result marks (target / stop hit)'); F('tips','chk','Tip line in plain words (bottom-left)'); F('showPrice','chk','Show prices on levels');
    hd('RISK PLAN  (stop-loss and target)');
    F('slATR','num','Stop-loss room beyond the candle (x ATR)',{min:0,max:3,step:0.05}); F('rr','num','Target = risk x',{min:0.5,max:10,step:0.5}); F('maxHold','num','Close the trade after (candles) if nothing is hit',{min:5,max:300,step:5});
    hd('FINE TUNING  (optional)');
    F('touchTol','num','How close counts as a touch (x ATR)',{min:0.05,max:2,step:0.05}); F('breakTol','num','Close beyond the line to drop it (x ATR)',{min:0.1,max:3,step:0.1}); F('closeOnly','chk','Signal only after the candle closes (no repaint)'); },
  styleTab:(b,d)=>{ const p=d.p; fld(b,p,'cUp','col','Rising line colour'); fld(b,p,'cDn','col','Falling line colour'); fld(b,p,'cBuy','col','BUY / target colour'); fld(b,p,'cSell','col','SELL / stop-loss colour'); fld(b,p,'cRes','col','Resistance colour'); fld(b,p,'cSup','col','Support colour'); fld(b,p,'size','sel','Label size',{opts:['Tiny','Small','Normal','Large']}); },
  extras:(c,p)=>{ const r=tltCompute(c,p); return {mk:[],boxes:[{type:'tltview',pts:[],r,o:p}],labels:[],ev:r.ev,stat:r.stat}; }};
try{ DESC.tlt='4hrs +  \u00b7 Beginner friendly: rising and falling trendlines, BUY / SELL when price bounces off them, with support and resistance. Plain-words tips'; }catch(e){}
window.__tltCompute=tltCompute;
}catch(err){ console.error('tlt indicator failed',err); window.__tltErr=err; }

// =====================================================================================
// [fvs] INDICATOR · "FVG Sessions"  (port of the TradingView Pine script "FVG Sessions [LuxAlgo]")   (self-contained: every name starts with fvs / FVS)
// Picker category: Trend (shows under the Indicators filter).
// Idea: every new day (session) the tool waits for the FIRST fair value gap (3-candle gap) of that session:
//   bullish gap  = candle low > high of 2 candles ago and the middle candle closed above that high
//   bearish gap  = candle high < low of 2 candles ago and the middle candle closed below that low
// The gap is drawn as a shaded box with a dashed middle (average) level that extends to the right until the session ends.
// Mitigated = price closes through the far side of the gap (bull: close below the gap bottom, bear: close above the gap top):
// the box turns faint.  Each session also gets a high / low range (two lines) coloured like the latest gap (teal bull, red bear)
// and a dashed vertical divider where the session starts.  Only ONE gap per session, like the original.
// Alerts (in-app): new bullish / bearish session gap, gap mitigated.
// Hooks: IND.fvs + draw (same pattern as the other tools). Nothing existing is edited.
// =====================================================================================
try{
const FVS_TZ=['UTC','Europe/London','America/New_York','Europe/Berlin','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Africa/Nairobi','Australia/Sydney'];
const FVS_DEF={
  // --- session (a session = one day) ---
  tz:'UTC', start:'00:00',
  // --- what is visible ---
  sessN:5, showDelim:true, showRange:true, showFVG:true, showAvg:true, showMit:true, showTags:false, showPrice:false,
  // --- style ---
  cBull:'#089981', cBear:'#f23645', areaA:0.5, mitA:0.2, size:'Small'
};
const FVS_FS={Tiny:8,Small:9.5,Normal:11,Large:13};
const fvsHM=s=>{ const m=/^\s*(\d{1,2})\s*:?\s*(\d{2})\s*$/.exec(String(s==null?'':s)); if(!m) return null; const h=+m[1], q=+m[2]; return (h>24||q>59)?null:h*60+q; };
const fvsRgba=(h,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(h||''); const v=m?parseInt(m[1],16):0x089981; return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; };
const fvsDF={}, fvsOC={};
function fvsOff(zone,t){ if(zone==='UTC') return 0; const b=Math.floor(t/3600), hk=zone+'|'+b; let v=fvsOC[hk]; if(v!==undefined) return v;
  let f=fvsDF[zone]; if(!f) f=fvsDF[zone]=new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
  const q={}; f.formatToParts(new Date(b*3600000)).forEach(x=>{ q[x.type]=+x.value; });
  v=Date.UTC(q.year,q.month-1,q.day,q.hour%24,q.minute,q.second)/1000-b*3600;
  if(Object.keys(fvsOC).length>30000) Object.keys(fvsOC).forEach(k=>delete fvsOC[k]); fvsOC[hk]=v; return v; }
function fvsCompute(c,p){
  const n=c.length, R={ok:false,n,sess:[],fvgs:[],ev:[],stat:'',msg:''};
  if(n<5){ R.stat='not enough candles'; return R; }
  const tfS=c[1].time-c[0].time;
  if(!(tfS<86400)){ R.msg='FVG Sessions works on intraday charts (below 1 day)'; R.stat='intraday only'; return R; }
  const zone=p.tz||'UTC', sM=fvsHM(p.start), s0=(sM==null?0:sM)*60;
  let prev=null, S=null, sf=null, isNew=true;
  for(let i=0;i<n;i++){
    const x=c[i], L=x.time+fvsOff(zone,x.time)-s0, d=Math.floor(L/86400);
    const dtf=prev!==null&&d!==prev; prev=d;
    if(dtf){                                           // ---- new session ----
      if(sf) sf.endI=Math.max(sf.startI,i-2);          // prior session gap stops 2 bars before the new session (as in the original)
      S={i0:i,i1:i,hi:x.high,lo:x.low,bull:null}; R.sess.push(S); isNew=true;
    } else if(S){                                      // ---- running session range ----
      if(x.high>S.hi) S.hi=x.high; if(x.low<S.lo) S.lo=x.low; S.i1=i; S.bull=sf?sf.bull:false;
    }
    if(i>=2){                                          // ---- first gap of the session ----
      const bullG=x.low>c[i-2].high&&c[i-1].close>c[i-2].high, bearG=x.high<c[i-2].low&&c[i-1].close<c[i-2].low;
      if(isNew&&bullG){ sf={startI:i-2,formI:i,top:x.low,btm:c[i-2].high,bull:true,mit:false,mitI:null,endI:null}; R.fvgs.push(sf); isNew=false;
        R.ev.push({k:'fvs',time:x.time,msg:'FVG Sessions: new bullish session gap',col:'#089981'}); }
      else if(isNew&&bearG){ sf={startI:i-2,formI:i,top:c[i-2].low,btm:x.high,bull:false,mit:false,mitI:null,endI:null}; R.fvgs.push(sf); isNew=false;
        R.ev.push({k:'fvs',time:x.time,msg:'FVG Sessions: new bearish session gap',col:'#f23645'}); }
    }
    if(sf&&!isNew&&!sf.mit){                           // ---- mitigation ----
      if(sf.bull&&x.close<sf.btm){ sf.mit=true; sf.mitI=i; R.ev.push({k:'fvsm',time:x.time,msg:'FVG Sessions: bullish gap mitigated',col:'#f23645'}); }
      else if(!sf.bull&&x.close>sf.top){ sf.mit=true; sf.mitI=i; R.ev.push({k:'fvsm',time:x.time,msg:'FVG Sessions: bearish gap mitigated',col:'#089981'}); }
    }
  }
  R.ev=R.ev.slice(-8);
  const ls=R.sess[R.sess.length-1], lf=R.fvgs[R.fvgs.length-1];
  if(lf&&ls&&lf.formI>=ls.i0) R.stat=(lf.bull?'Bull':'Bear')+' FVG'+(lf.mit?' mitigated':'');
  else R.stat=ls?'waiting for session FVG':'waiting for first session';
  R.ok=true; return R;
}
function fvsDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r||!r.ok) return;
  const c=candles, n=r.n, fs=FVS_FS[o.size]||9.5;
  const x0=X(0), x1=X(1), xs=i=>{ const v=X(i); if(v!=null) return v; return (x0!=null&&x1!=null)?x0+(x1-x0)*i:null; };
  const fmt=v=>String(+(+v).toPrecision(6));
  const tx=(t,x,y,col,al)=>{ cx.font=fs+'px system-ui'; cx.textAlign=al||'left'; cx.textBaseline='middle'; cx.lineWidth=3; cx.strokeStyle='rgba(8,12,22,.85)'; cx.strokeText(t,x,y); cx.fillStyle=col; cx.fillText(t,x,y); };
  const hline=(i0,i1,p,col,w,dash)=>{ const xa=xs(i0), xb=xs(i1), y=Y(p); if(xa==null||xb==null||y==null) return null; cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(xb,y); cx.stroke(); cx.setLineDash([]); return {xa,xb,y}; };
  const box=(i0,i1,top,btm,col)=>{ const xa=xs(i0), xb=xs(i1), ya=Y(top), yb=Y(btm); if(xa==null||xb==null||ya==null||yb==null||xb<=xa) return; cx.fillStyle=col; cx.fillRect(xa,Math.min(ya,yb),xb-xa,Math.max(1,Math.abs(yb-ya))); };
  const chartCol='rgba(190,200,220,.5)', last=n-1+1;
  const N=Math.max(1,Math.round(o.sessN)||5), shown=r.sess.slice(-N), first=shown.length?shown[0].i0:0;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  // ---- session dividers + range ----
  shown.forEach((S,k)=>{ const isLast=S===r.sess[r.sess.length-1], endI=isLast?last:S.i1;
    if(o.showDelim){ const xv=xs(S.i0); if(xv!=null){ cx.strokeStyle=chartCol; cx.lineWidth=1; cx.setLineDash([4,4]); cx.beginPath(); cx.moveTo(xv,0); cx.lineTo(xv,H); cx.stroke(); cx.setLineDash([]); } }
    if(o.showRange){ const col=S.bull==null?chartCol:(S.bull?o.cBull:o.cBear); hline(S.i0,endI,S.hi,col,1); hline(S.i0,endI,S.lo,col,1); } });
  // ---- session fair value gaps ----
  if(o.showFVG) r.fvgs.forEach(f=>{ if(f.formI<first) return; const col=f.bull?o.cBull:o.cBear, endI=f.endI!=null?f.endI:last, avg=(f.top+f.btm)/2;
    if(f.mit){ box(f.startI,f.mitI-1,f.top,f.btm,fvsRgba(col,o.areaA)); if(o.showMit) box(f.mitI-1,endI,f.top,f.btm,fvsRgba(col,o.mitA)); }
    else box(f.startI,endI,f.top,f.btm,fvsRgba(col,o.areaA));
    if(o.showAvg) hline(f.startI,endI,avg,col,1,[5,4]);
    if(o.showTags){ const xa=xs(f.startI), ya=Y(f.top); if(xa!=null&&ya!=null) tx((f.bull?'Bull FVG':'Bear FVG')+(f.mit?' (mitigated)':'')+(o.showPrice?'  '+fmt(f.btm)+' - '+fmt(f.top):''),xa+2,ya-fs*.9,col,'left'); } });
  cx.setLineDash([]); cx.restore();
}
{ const _fvsD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='fvsview') return fvsDraw(d,X,Y,W,H); return _fvsD.apply(this,arguments); }; }
IND.fvs={label:'FVG Sessions [LuxAlgo] \u2013 first fair value gap of each day, session high / low and mitigation',title:'FVG Sessions',cat:'Trend',cols:[],calc:()=>[],live:true,
  nm:p=>'FVG Sessions',
  status:i=>i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:Object.assign({},FVS_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o),
      hd=t=>{ const e=document.createElement('div'); e.textContent=t; e.style.cssText='margin:14px 0 6px;color:#8a90a5;font-size:12px;letter-spacing:.5px'; b.appendChild(e); },
      note=t=>{ const e=document.createElement('div'); e.textContent=t; e.style.cssText='margin:4px 0 6px;color:#aab1c5;font-size:12px;line-height:1.5'; b.appendChild(e); };
    hd('HOW IT WORKS');
    note('Each day is one session. The tool marks the FIRST fair value gap (3-candle gap) of the session as a shaded box with a dashed middle level, extended to the right until the session ends.');
    note('Mitigated = price closes through the far side of the gap. The box then turns faint. The session high / low lines take the colour of the latest gap (teal = bullish, red = bearish). Works on intraday charts.');
    hd('SESSION');
    F('tz','sel','Time zone',{opts:FVS_TZ}); F('start','txt','Session starts at (HH:MM, e.g. 00:00 or 17:00 for forex)'); F('sessN','num','Sessions shown',{min:1,max:60,step:1});
    hd('SHOW ON CHART');
    F('showFVG','chk','Fair value gap boxes'); F('showAvg','chk','Dashed middle (average) level'); F('showMit','chk','Keep faint box after the gap is mitigated'); F('showRange','chk','Session high / low lines'); F('showDelim','chk','Session start dividers'); F('showTags','chk','Gap labels'); F('showPrice','chk','   Show gap prices in labels'); },
  styleTab:(b,d)=>{ const p=d.p; fld(b,p,'cBull','col','Bullish FVG colour'); fld(b,p,'cBear','col','Bearish FVG colour'); fld(b,p,'areaA','num','Gap box opacity (0 - 1)',{min:0,max:1,step:0.05}); fld(b,p,'mitA','num','Mitigated box opacity (0 - 1)',{min:0,max:1,step:0.05}); fld(b,p,'size','sel','Label size',{opts:['Tiny','Small','Normal','Large']}); },
  extras:(c,p)=>{ const r=fvsCompute(c,p); return {mk:[],boxes:[{type:'fvsview',pts:[],r,o:p}],labels:[],ev:r.ev,stat:r.stat}; }};
try{ DESC.fvs='First fair value gap of each daily session with its average level, mitigation and the session high / low (LuxAlgo)'; }catch(e){}
window.__fvsCompute=fvsCompute;
}catch(err){ console.error('fvs indicator failed',err); window.__fvsErr=err; }

// =====================================================================================
// [svt] INDICATOR · "Strength & Volatility"   (self-contained: every name starts with svt / SVT)
// Picker category: Volatility. A tiny table on the chart (top) for the market you are trading, e.g. BTC/USDT:
//   strength of the BASE (BTC) and the QUOTE (USD)  +  volatility level with a plain warning.
// Strength = relative-currency-strength idea (as in FX Blue): each currency's % move over the last N bars,
// minus the average move of the whole basket (USD = 0 against itself). Prices come from free exchange pairs.
// Volatility = ATR % of price now, compared with its own recent average (x1.0 = normal).
// Never trades (no BUY / SELL). Hooks: IND.svt + draw (same pattern as fvs).
// =====================================================================================
try{
const SVT_DEF={lb:20,mode:'All (majors + gold + crypto)',atrN:14,hist:100,pos:'Top right',top:4,showBar:true,showRel:true,showMsg:true,showSes:true,cPos:'#2dd4a7',cNeg:'#ff5d7a',cWarn:'#f5c542'};
const SVT_STABLE=['USDT','USDC','FDUSD','TUSD','BUSD','USD1','DAI','USDE','USDP','USD'];
const SVT_FIAT={EUR:['EURUSDT',0],GBP:['GBPUSDT',0],AUD:['AUDUSDT',0],JPY:['USDTJPY',1],TRY:['USDTTRY',1],BRL:['USDTBRL',1],ZAR:['USDTZAR',1],MXN:['USDTMXN',1],PLN:['USDTPLN',1],CZK:['USDTCZK',1],ARS:['USDTARS',1],COP:['USDTCOP',1],UAH:['USDTUAH',1],GOLD:['PAXGUSDT',0]};
const SVT_QUOTES=['FDUSD','USDT','USDC','TUSD','BUSD','USD1','BTC','ETH','BNB','EUR','GBP','AUD','JPY','TRY','BRL','ZAR','MXN','PLN','CZK','ARS','COP','UAH'];
const SVT_SETS={'All (majors + gold + crypto)':['USD','EUR','GBP','AUD','JPY','GOLD','BTC','ETH','BNB','SOL','XRP'],'Crypto only':['USD','BTC','ETH','BNB','SOL','XRP','DOGE','ADA'],'Forex + gold only':['USD','EUR','GBP','AUD','JPY','GOLD']};
const svtName=c=>c==='GOLD'?'XAU':c;
const svtCur=c=>SVT_STABLE.indexOf(c)>=0?'USD':(c==='PAXG'||c==='XAUT')?'GOLD':c;
function svtPair(s){ s=String(s||'').toUpperCase();
  if(s.startsWith('USDT')&&SVT_FIAT[s.slice(4)]) return {base:'USD',quote:s.slice(4)};
  for(const q of SVT_QUOTES){ if(s.length>q.length&&s.endsWith(q)) return {base:svtCur(s.slice(0,-q.length)),quote:svtCur(q)}; }
  return {base:svtCur(s),quote:'USD'}; }
function svtUni(o,pr){ const u=(SVT_SETS[o.mode]||SVT_SETS['All (majors + gold + crypto)']).slice(); [pr.base,pr.quote].forEach(c=>{ if(u.indexOf(c)<0) u.push(c); }); return u; }
const svtSt={key:'',ret:{},ts:0,loading:false};
async function svtFetch(st,u,lb){
  st.loading=true; st.ts=Date.now(); const iv=tf[1], ret={}, k0=st.key; 
  try{ await Promise.all(u.map(async c=>{ if(c==='USD'){ ret.USD=0; return; }
      const sp=SVT_FIAT[c]||[c+'USDT',0];
      try{ const r=await fetch(`${API}/api/v3/klines?symbol=${sp[0]}&interval=${iv}&limit=${lb+1}`); if(!r.ok) throw 0; const k=await r.json(); if(!Array.isArray(k)||k.length<3) throw 0;
        const a=+k[0][4], b=+k[k.length-1][4]; if(!(a>0&&b>0)) throw 0; ret[c]=(sp[1]?(a/b-1):(b/a-1))*100; }catch(e){} })); }catch(e){}
  if(st.key===k0){ st.ret=ret; st.loading=false; } st.ts=Object.keys(ret).length>1?Date.now():Date.now()-45000; try{ render(); }catch(e){} }
function svtGet(o){ const pr=svtPair(sym[0]), u=svtUni(o,pr), lb=Math.max(3,Math.round(o.lb)||20), key=[sym[0],tf,lb,o.mode].join('|');
  if(svtSt.key!==key){ svtSt.key=key; svtSt._k=key; svtSt.ret={}; svtSt.ts=0; svtSt.loading=false; }
  if(!svtSt.loading&&Date.now()-svtSt.ts>60000) svtFetch(svtSt,u,lb);
  return {pr,u,key}; }
function svtStrength(o){ const g=svtGet(o), st=svtSt, ok=st.key===g.key; const have=g.u.filter(c=>ok&&st.ret[c]!=null);
  const out={pr:g.pr,loading:st.loading&&!have.length,S:{},n:0,max:0.01}; if(have.length<3) return out;
  const m=have.reduce((a,c)=>a+st.ret[c],0)/have.length; have.forEach(c=>{ out.S[c]=st.ret[c]-m; out.max=Math.max(out.max,Math.abs(out.S[c])); }); out.n=have.length;
  const vals=have.map(c=>out.S[c]).sort((a,b)=>b-a); out.vals=vals; return out; }
function svtLabel(v,out){ if(v==null) return ['n/a',0]; const r=out.vals.indexOf(v), t=Math.max(1,Math.ceil(out.n/3));
  if(v>0&&r<t) return ['Strong',1]; if(v<0&&r>=out.n-t) return ['Weak',-1]; return ['Neutral',0]; }
function svtVol(c,o){ const n=Math.max(2,Math.round(o.atrN)||14), H=Math.max(10,Math.round(o.hist)||100); if(!c||c.length<n+12) return null;
  const tr=c.map((x,i)=>i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low), p=[]; let s=0;
  for(let i=0;i<c.length;i++){ s+=tr[i]; if(i>=n) s-=tr[i-n]; if(i>=n-1&&c[i].close>0) p.push(s/n/c[i].close*100); }
  const cur=p[p.length-1], h=p.slice(-H), avg=h.reduce((a,x)=>a+x,0)/h.length; if(!(avg>0)) return null; const r=cur/avg;
  return {atr:cur,ratio:r}; }
function svtLvl(r){ return r<0.6?{lab:'Very quiet',col:'#4aa3ff',msg:'Very quiet \u00b7 small moves, little momentum'}:r<0.85?{lab:'Calm \u00b7 safe',col:'#2dd4a7',msg:'Calm \u00b7 safer, tighter stops are fine'}:r<1.25?{lab:'Normal',col:'#d1d4dc',msg:'Normal movement'}:r<1.8?{lab:'High \u26a0',col:'#f5c542',msg:'\u26a0 More volatile \u00b7 widen stops, smaller size'}:{lab:'Extreme \u26d4',col:'#ff5d7a',msg:'\u26d4 Extreme swings \u00b7 danger, cut size or wait'}; }

let svtLast=null;
function svtSession(){ const d=new Date(), h=d.getUTCHours()+d.getUTCMinutes()/60;
  if(h<7) return {tag:'ASIA',col:'#4aa3ff',tip:'Asia session: usually calmer, slow moves and ranges.'};
  if(h<12) return {tag:'LONDON',col:'#f5c542',tip:'London session: volume and volatility pick up.'};
  if(h<16) return {tag:'LDN+NY',col:'#ff9f43',tip:'London + New York overlap: the busiest hours, the biggest moves.'};
  if(h<21) return {tag:'NEW YORK',col:'#2dd4a7',tip:'New York session: strong moves, often around US news.'};
  return {tag:'LATE',col:'#8a91a5',tip:'Late session: thin and quiet, fake moves are more likely.'}; }
function svtSheet(){ const L=svtLast; if(!L) return; const o=L.o;
  openSheet('Strength & Volatility',()=>{
    const S=svtStrength(o), pr=S.pr, se=svtSession(), cp=o.cPos, cn=o.cNeg, mu='#8a91a5', lb=Math.max(3,Math.round(o.lb)||20);
    const wrap=document.createElement('div'), mk=(t,css)=>{ const e=document.createElement('div'); e.style.cssText=css||''; if(t!=null) e.textContent=t; return e; };
    wrap.appendChild(mk('Move of each currency over the last '+lb+' candles ('+tf[0]+') compared with the basket average. Your pair: '+svtName(pr.base)+' / '+svtName(pr.quote)+'.','font-size:12px;color:'+mu+';line-height:1.45;margin:0 0 8px'));
    const cur=Object.keys(S.S).sort((a,b)=>S.S[b]-S.S[a]);
    if(!cur.length) wrap.appendChild(mk(S.loading?'Reading the market\u2026':'No strength data yet. Tap Refresh below.','padding:14px 4px;color:'+mu+';font-size:13px'));
    cur.forEach(c=>{ const v=S.S[c], mine=(c===pr.base||c===pr.quote), lab=svtLabel(v,S), col=v>=0?cp:cn;
      const row=mk(null,'display:flex;align-items:center;gap:8px;padding:7px 8px;margin:3px 0;border-radius:10px;'+(mine?'background:rgba(124,140,255,.16);border:1px solid rgba(124,140,255,.45)':'background:rgba(255,255,255,.04);border:1px solid transparent'));
      row.appendChild(mk(svtName(c),'width:46px;font-weight:700;font-size:14px'));
      const bar=mk(null,'position:relative;flex:1;height:10px;border-radius:5px;background:rgba(255,255,255,.08)'), ln=Math.min(50,Math.abs(v)/S.max*50);
      const fill=mk(null,'position:absolute;top:0;bottom:0;border-radius:5px;background:'+col+';'+(v>=0?'left:50%;width:'+ln+'%':'right:50%;width:'+ln+'%')); bar.appendChild(fill); bar.appendChild(mk(null,'position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:rgba(255,255,255,.4)')); row.appendChild(bar);
      row.appendChild(mk((v>=0?'+':'')+v.toFixed(2)+'%','width:62px;text-align:right;font-weight:700;font-size:13px;color:'+col));
      row.appendChild(mk((lab[1]>0?'\u25b2 ':lab[1]<0?'\u25bc ':'\u2015 ')+lab[0],'width:74px;font-size:12px;font-weight:700;color:'+(lab[1]>0?cp:lab[1]<0?cn:mu)));
      wrap.appendChild(row); });
    const vol=L.vol, VL=vol?svtLvl(vol.ratio):null;
    const card=mk(null,'margin:12px 0 4px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05)');
    card.appendChild(mk('VOLATILITY','font-size:11px;letter-spacing:.06em;color:'+mu+';margin-bottom:4px'));
    card.appendChild(mk(vol?VL.lab+' \u00b7 ATR '+vol.atr.toFixed(2)+'% \u00b7 '+vol.ratio.toFixed(2)+'\u00d7 its normal':'Not enough candles yet','font-weight:700;font-size:14px;color:'+(VL?VL.col:mu)));
    if(VL) card.appendChild(mk(VL.msg,'font-size:12px;color:'+VL.col+';margin-top:3px'));
    wrap.appendChild(card);
    const sc=mk(null,'margin:8px 0 4px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05)');
    sc.appendChild(mk('SESSION (UTC clock)','font-size:11px;letter-spacing:.06em;color:'+mu+';margin-bottom:4px'));
    sc.appendChild(mk(se.tag,'font-weight:700;font-size:14px;color:'+se.col)); sc.appendChild(mk(se.tip,'font-size:12px;color:'+mu+';margin-top:3px')); wrap.appendChild(sc);
    groups.appendChild(wrap);
    const b=chips(''); chip(b,'\u21bb Refresh now',false,()=>{ svtSt.ts=0; try{ svtGet(o); }catch(e){} toast('Refreshing\u2026','#2962ff'); setTimeout(()=>{ if(sheet.classList.contains('open')) svtSheet(); },1600); },true); }); }
if(!window.__svtTap){ window.__svtTap=1; const mw=document.getElementById('mw'); let dn=null;
  if(mw){ mw.addEventListener('pointerdown',e=>{ dn={x:e.clientX,y:e.clientY,t:Date.now()}; },true);
    mw.addEventListener('pointerup',e=>{ const q=dn; dn=null; if(!q||!svtLast) return; if(Math.hypot(e.clientX-q.x,e.clientY-q.y)>8||Date.now()-q.t>500) return;
      if(!inds.some(i=>i.t==='svt'&&show(i))) return; const r=cv.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top, L=svtLast;
      if(x>=L.x&&x<=L.x+L.w&&y>=L.y&&y<=L.y+L.h) svtSheet(); },true); } }
function svtDraw(d,X,Y,W,H){
  const o=d.o, v=d.r&&d.r.vol, S=svtStrength(o), pr=S.pr, pos=o.cPos, neg=o.cNeg, mu='#8a91a5', tx='#d1d4dc';
  const sg=x=>x>=0?pos:neg, fm=x=>(x>=0?'+':'')+(Math.abs(x)<10?x.toFixed(2):x.toFixed(1))+'%';
  const rows=[];
  [pr.base,pr.quote].forEach(c=>{ const val=S.S[c]; rows.push({t:'s',name:svtName(c),val}); });
  rows.push({t:'v'}); if(o.showMsg) rows.push({t:'m'}); if(o.showRel) rows.push({t:'r'});
  const tw=192, th=15+rows.reduce((a,r)=>a+(r.t==='m'||r.t==='r'?15:19),0)+3, s=Math.min(1,(W-8)/tw);
  const x0=o.pos==='Top left'?4:o.pos==='Top center'?(W-tw*s)/2:Math.max(4,W-tw*s-6), y0=Math.max(2,o.top==null?4:+o.top||0);
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.translate(x0,y0); cx.scale(s,s); cx.setLineDash([]); cx.textBaseline='middle';
  cx.fillStyle='rgba(16,20,29,.92)'; cx.fillRect(0,0,tw,th); cx.strokeStyle='rgba(255,255,255,.16)'; cx.strokeRect(0.5,0.5,tw-1,th-1);
  cx.font='bold 9px system-ui'; cx.textAlign='left'; cx.fillStyle=mu; cx.fillText('STRENGTH & VOL \u00b7 '+String(tf[0]).toUpperCase()+(S.loading?'\u2026':''),6,8);
  if(o.showSes!==false){ const se=svtSession(); cx.font='bold 9px system-ui'; cx.textAlign='right'; cx.fillStyle=se.col; cx.fillText(se.tag+' \u203a',tw-6,8); cx.textAlign='left'; }
  let y=15; const colN=6, colV=40, colB=96, colL=142;
  rows.forEach(r=>{ if(r.t==='s'){ const cy=y+9.5; cx.font='bold 11px system-ui'; cx.textAlign='left'; cx.fillStyle=tx; cx.fillText(r.name,colN,cy);
      if(r.val==null){ cx.font='10.5px system-ui'; cx.fillStyle=mu; cx.fillText(S.loading?'\u2026':'n/a',colV,cy); }
      else{ const lb=svtLabel(r.val,S); cx.font='bold 10.5px system-ui'; cx.fillStyle=sg(r.val); cx.fillText(fm(r.val),colV,cy);
        if(o.showBar){ const bw=40, mid=colB+bw/2, ln=Math.min(bw/2,Math.abs(r.val)/S.max*bw/2); cx.fillStyle='rgba(255,255,255,.1)'; cx.fillRect(colB,cy-3,bw,6); cx.fillStyle=sg(r.val); if(r.val>=0) cx.fillRect(mid,cy-3,ln,6); else cx.fillRect(mid-ln,cy-3,ln,6); cx.fillStyle='rgba(255,255,255,.4)'; cx.fillRect(mid-0.5,cy-5,1,10); }
        cx.font='bold 10px system-ui'; cx.fillStyle=lb[1]>0?pos:lb[1]<0?neg:mu; cx.fillText((lb[1]>0?'\u25b2 ':lb[1]<0?'\u25bc ':'\u2015 ')+lb[0],colL,cy); }
      y+=19; }
    else if(r.t==='v'){ const cy=y+9.5; cx.font='bold 11px system-ui'; cx.textAlign='left'; cx.fillStyle=tx; cx.fillText('VOL',colN,cy);
      if(!v){ cx.font='10.5px system-ui'; cx.fillStyle=mu; cx.fillText('n/a',colV,cy); }
      else{ const L=svtLvl(v.ratio); cx.font='bold 10.5px system-ui'; cx.fillStyle=L.col; cx.fillText(v.atr.toFixed(2)+'%',colV,cy);
        if(o.showBar){ const bw=40, ln=Math.min(bw,v.ratio/2.5*bw); cx.fillStyle='rgba(255,255,255,.1)'; cx.fillRect(colB,cy-3,bw,6); cx.fillStyle=L.col; cx.fillRect(colB,cy-3,ln,6); cx.fillStyle='rgba(255,255,255,.4)'; cx.fillRect(colB+bw/2.5-0.5,cy-5,1,10); }
        cx.font='bold 10px system-ui'; cx.fillStyle=L.col; cx.fillText(L.lab,colL,cy); }
      y+=19; }
    else if(r.t==='m'){ cx.font='9.5px system-ui'; cx.textAlign='left'; cx.fillStyle=v?svtLvl(v.ratio).col:mu; cx.fillText(v?svtLvl(v.ratio).msg:'Not enough candles yet',colN,y+7.5); y+=15; }
    else if(r.t==='r'){ const a=S.S[pr.base], b=S.S[pr.quote]; cx.font='9.5px system-ui'; cx.textAlign='left';
      if(a==null||b==null){ cx.fillStyle=mu; cx.fillText(S.loading?'Reading the market\u2026':'Strength n/a for this pair',colN,y+7.5); }
      else{ const df=a-b, bn=svtName(pr.base), qn=svtName(pr.quote); if(Math.abs(df)<0.05){ cx.fillStyle=mu; cx.fillText(bn+' = '+qn+' \u00b7 balanced',colN,y+7.5); }
        else{ cx.fillStyle=df>0?pos:neg; cx.fillText((df>0?bn+' leads '+qn:qn+' leads '+bn)+' by '+Math.abs(df).toFixed(2)+'% \u00b7 '+(df>0?'bullish':'bearish')+' bias',colN,y+7.5); } }
      y+=15; } });
  cx.restore(); svtLast={o,vol:v,x:x0,y:y0,w:tw*s,h:th*s}; }
{ const _svtD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='svtview') return svtDraw(d,X,Y,W,H); return _svtD.apply(this,arguments); }; }
IND.svt={label:'Strength & Volatility \u2013 tiny table: base and quote strength, volatility level with a warning',title:'Strength & Volatility',cat:'Volatility',cols:[],calc:()=>[],live:true,
  nm:p=>'Strength & Volatility',
  status:i=>'',
  p:Object.assign({},SVT_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o),
      hd=t=>{ const e=document.createElement('div'); e.textContent=t; e.style.cssText='margin:14px 0 6px;color:#8a90a5;font-size:12px;letter-spacing:.5px'; b.appendChild(e); },
      note=t=>{ const e=document.createElement('div'); e.textContent=t; e.style.cssText='margin:4px 0 6px;color:#aab1c5;font-size:12px;line-height:1.5'; b.appendChild(e); };
    hd('HOW IT WORKS');
    note('Shows the market you are trading (for example BTC / USDT gives BTC and USD). Strength = how much each currency moved over the last N candles compared with the average of the basket. Volatility = current ATR % compared with its own recent average.');
    note('Volatility levels: Very quiet, Calm / safe, Normal, High (warning) and Extreme (danger). The last line says which side of the pair is leading.');
    hd('STRENGTH');
    F('lb','num','Strength look-back (candles of this timeframe)',{min:3,max:500,step:1}); F('mode','sel','Compare against',{opts:Object.keys(SVT_SETS)});
    hd('VOLATILITY');
    F('atrN','num','ATR length',{min:2,max:100,step:1}); F('hist','num','Compare with the last N candles',{min:10,max:1000,step:10});
    hd('SHOW');
    F('showBar','chk','Mini bars'); F('showMsg','chk','Volatility message line'); F('showRel','chk','Leader line (which side is stronger)'); F('showSes','chk','Session tag (Asia / London / New York) \u00b7 tap the table for the full list'); },
  styleTab:(b,d)=>{ const p=d.p; fld(b,p,'pos','sel','Table position',{opts:['Top right','Top center','Top left']}); fld(b,p,'top','num','Distance from the top (px)',{min:0,max:600,step:2});
    fld(b,p,'cPos','col','Strong / bullish colour'); fld(b,p,'cNeg','col','Weak / bearish colour'); },
  extras:(c,p)=>{ try{ svtGet(p); }catch(e){} const vol=svtVol(c,p); return {mk:[],boxes:[{type:'svtview',pts:[],r:{vol},o:p}],labels:[],ev:[],stat:''}; }};
try{ DESC.svt='Tiny table at the top: strength of the base and quote currency, plus a volatility level with a warning (calm, normal, high, extreme)'; }catch(e){}
}catch(err){ console.error('svt indicator failed',err); window.__svtErr=err; }

// =====================================================================================
// [ecr] STRATEGY · "Engulfing Candle + RSI" (port of the TradingView Pine script "EngulfingCandle" by ahmedirshad419)   (self-contained: every name starts with ecr / ECR)
// Bullish candle = close >= previous open and previous candle bearish. Bearish candle = close <= previous open and previous candle bullish.
// Engulfing signal = that candle while RSI was oversold (buy MIT) / overbought (sell MIT) on this bar or one of the bars before.
// Optional chain: engulfing -> support / resistance zone -> price moves away -> RETEST of the zone -> BOS (close beyond the previous
// swing low for a sell / swing high for a buy) -> small BUY / SELL button. The zone dies if price closes beyond it or the wait runs out.
// Hooks: STRATS.ecr + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const ECR_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const ECR_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
function ecrSrc(x,s){ return s==='Open'?x.open:s==='High'?x.high:s==='Low'?x.low:s==='HL2'?(x.high+x.low)/2:s==='HLC3'?(x.high+x.low+x.close)/3:s==='OHLC4'?(x.open+x.high+x.low+x.close)/4:x.close; }
// Wilder RSI (same as Pine rsi())
function ecrRsi(c,n,s){ const o=new Array(c.length).fill(null); if(c.length<=n) return o; let g=0,l=0;
  for(let i=1;i<=n;i++){ const d=ecrSrc(c[i],s)-ecrSrc(c[i-1],s); if(d>=0) g+=d; else l-=d; } g/=n; l/=n; o[n]=l===0?100:100-100/(1+g/l);
  for(let i=n+1;i<c.length;i++){ const d=ecrSrc(c[i],s)-ecrSrc(c[i-1],s); g=(g*(n-1)+Math.max(d,0))/n; l=(l*(n-1)+Math.max(-d,0))/n; o[i]=l===0?100:100-100/(1+g/l); }
  return o; }
// zone + retest + break-of-structure scan for one engulfing signal (s=-1 sell / resistance, s=1 buy / support).
// Everything is worked out in a "sell frame" (buy = mirrored prices) so one piece of logic serves both sides.
function ecrSetup(c,i,s,Z){
  const m=c.length, f=s===-1?1:-1, wait=Math.max(5,Math.round(Z.ecrWait==null?50:Z.ecrWait)), L=Math.max(1,Math.round(Z.ecrSw==null?3:Z.ecrSw)), end0=Math.min(m-1,i+wait);
  const hi=j=>f===1?c[j].high:-c[j].low, lo=j=>f===1?c[j].low:-c[j].high, cl=j=>f*c[j].close, op=j=>f*c[j].open;
  if(i<1) return null; const top=Math.max(hi(i),hi(i-1)), bot=op(i-1); if(!(bot<top)) return null;
  let away=false, r=-1, lvl=null, lvlI=-1, st='pending', t=-1, endI=end0, done=false;
  for(let j=i+1;j<=end0;j++){
    if(cl(j)>top){ st='invalid'; endI=j; done=true; break; }
    if(r<0){
      if(away&&hi(j)>=bot){ r=j;
        for(let q=r-1-L;q>i;q--){ let ok=true; for(let w=1;w<=L;w++){ if(q-w<i||q+w>r-1||lo(q)>lo(q-w)||lo(q)>=lo(q+w)){ ok=false; break; } } if(ok){ lvl=lo(q); lvlI=q; break; } }
        if(lvl==null){ for(let q=i+1;q<r;q++){ if(lvl==null||lo(q)<lvl){ lvl=lo(q); lvlI=q; } } }
        if(lvl==null){ st='invalid'; endI=j; done=true; break; } }
      else if(hi(j)<bot) away=true; }
    else if(cl(j)<lvl){ st='confirmed'; t=j; endI=j; done=true; break; } }
  if(!done&&end0<m-1) st='expired';
  if(!done&&end0>=m-1) endI=m-1;
  return {i,s,st,r,t,endI,lvlI,lvl:lvl==null?null:f*lvl,top:f===1?top:-bot,bot:f===1?bot:-top}; }
const ecrCache={};
function ecrRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.ecrLen,Z.ecrOB,Z.ecrOS,Z.ecrSrc,Z.ecrDir,Z.ecrStrict,Z.ecrLook,Z.ecrZone,Z.ecrBos,Z.ecrWait,Z.ecrSw].join('|');
  const h=ecrCache[Z.sid]; if(h&&h.k===key) return h.r;
  const n=Math.max(2,Math.round(Z.ecrLen)||14), ob=Z.ecrOB==null?70:+Z.ecrOB, os=Z.ecrOS==null?30:+Z.ecrOS, lk=Math.max(0,Math.round(Z.ecrLook==null?2:Z.ecrLook)), st=Z.ecrStrict===true;
  const rs=ecrRsi(c,n,Z.ecrSrc||'Close'), sig=new Map(), ev=[], eng=new Map();
  const OS=i=>rs[i]!=null&&rs[i]<=os, OB=i=>rs[i]!=null&&rs[i]>=ob, chain=Z.ecrBos!==false;
  for(let i=1;i<m;i++){ const x=c[i], p=c[i-1];
    let bull=x.close>=p.open&&p.close<p.open, bear=x.close<=p.open&&p.close>p.open;
    if(st){ bull=bull&&x.high>=p.high&&x.low<=p.low; bear=bear&&x.high>p.high&&x.low<p.low; }
    let wOS=false,wOB=false; for(let k=0;k<=lk;k++){ if(i-k<0) break; if(OS(i-k)) wOS=true; if(OB(i-k)) wOB=true; }
    let s=0; if(bull&&wOS&&Z.ecrDir!=='Sell only') s=1; else if(bear&&wOB&&Z.ecrDir!=='Buy only') s=-1;
    if(s){ const e={i,s,rsi:rs[i],su:chain?ecrSetup(c,i,s,Z):null}; ev.push(e); eng.set(i,s); } }
  if(Z.ecrBos!==false) ev.forEach(e=>{ if(e.su&&e.su.st==='confirmed') sig.set(e.su.t,e.s); }); else eng.forEach((s,i)=>sig.set(i,s));
  const r={ev,sig}; ecrCache[Z.sid]={k:key,r}; return r; }
function ecrDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=ecrRun(c,Z); if(!r) return;
  const fs=ECR_FS[Z.ecrSize]||7.5, lbl=Z.ecrLbl!==false, chain=Z.ecrBos!==false, mk=Z.ecrMk===true, bt=ECR_BT[Z.ecrBtnSz]||ECR_BT.Small, ext=Math.max(0,Math.round(Z.ecrExt==null?15:Z.ecrExt)),
    zR=Z.ecrRes||'#e53935', zS=Z.ecrSup||'#26a65b', btB=Z.ecrBtnBuy||'#2dd4a7', btS=Z.ecrBtnSell||'#ff5d7a';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  // the one and only BUY / SELL marker: a small rounded button on the signal candle
  const dist=Math.max(8,Math.round(Z.ecrDist==null?40:Z.ecrDist));
  const button=(idx,buy,away)=>{ const bb=c[idx], xt=X(idx); if(!bb||xt==null||xt<-30||xt>W+30) return; const up=away?buy:!buy, k=up?-1:1, y=Y(up?bb.high:bb.low); if(y==null) return;
    const w=bt[0],h=bt[1],fz=bt[2], ty=y+k*dist, by=k===1?ty+h:ty-h, top=Math.min(ty,by), col=buy?btB:btS;
    // dotted leader line from the candle out to the button, a dot on the candle end
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y+k*3); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y+k*3,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText(buy?'BUY':'SELL',xt,top+h/2+.5);
    // small note beyond the button
    if(lbl){ cx.font=(fs-1)+'px system-ui'; cx.fillStyle='rgba(209,212,220,0.9)'; cx.fillText(away?'retest + BOS':'engulfing + RSI',xt,k===1?top+h+fs:top-fs+2); } };
  r.ev.slice(-Math.max(1,Math.round(Z.ecrN)||300)).forEach(e=>{
    const buy=e.s===1, su=e.su;
    if(!chain){ button(e.i,buy); return; }                       // chain OFF: the engulfing + RSI signal itself is the button
    if(!su||su.st==='invalid'||su.st==='expired') return;          // chain ON: dead setups disappear, nothing is left to confuse
    // zone from the engulfing candle (support = green, resistance = red)
    const xa=X(e.i-1), xb=X(su.endI+(su.st==='pending'?ext:0)), y1=Y(su.top), y2=Y(su.bot);
    if(xb!=null&&y1!=null&&y2!=null&&xb>-50){ const x0=xa==null?0:xa, col=buy?zS:zR, zt=Math.min(y1,y2), zh=Math.max(2,Math.abs(y2-y1)), zw=Math.max(2,xb-x0);
      cx.fillStyle=rgba(col,0.16); cx.fillRect(x0,zt,zw,zh); cx.strokeStyle=rgba(col,0.65); cx.lineWidth=1; cx.strokeRect(x0,zt,zw,zh);
      if(lbl&&xa!=null){ cx.font='bold '+fs+'px system-ui'; cx.fillStyle=rgba(col,0.95); const tx=buy?'Support':'Resistance', fit=zw>fs*7&&zh>fs+4;
        if(fit){ cx.textAlign='left'; cx.fillText(tx,x0+3,zt+zh/2); } else { cx.textAlign='right'; cx.fillText(tx,x0-3,zt+zh/2); } cx.textAlign='center'; } }
    if(mk&&su.r>=0){ const xr=X(su.r), yr=Y(buy?c[su.r].low:c[su.r].high); if(xr!=null&&yr!=null){ cx.fillStyle='#ffffff'; cx.strokeStyle=buy?zS:zR; cx.lineWidth=1.5; cx.beginPath(); cx.arc(xr,yr,3,0,6.2832); cx.fill(); cx.stroke(); }
      if(su.st==='confirmed'&&su.lvl!=null){ const xl=X(su.lvlI), xt=X(su.t), yl=Y(su.lvl); if(xl!=null&&xt!=null&&yl!=null){ cx.strokeStyle='rgba(209,212,220,0.8)'; cx.lineWidth=1; cx.setLineDash([3,3]); cx.beginPath(); cx.moveTo(xl,yl); cx.lineTo(xt,yl); cx.stroke(); cx.setLineDash([]);
        if(lbl){ cx.font=fs+'px system-ui'; cx.fillStyle='#d1d4dc'; cx.fillText('BOS',(xl+xt)/2,yl+(buy?-1:1)*(fs-1)); } } } }
    if(su.st==='confirmed') button(su.t,buy,true); });
  cx.globalAlpha=1; cx.restore(); }
STRATS.ecr={label:'Engulfing Candle + RSI \u00b7 engulfing after RSI oversold / overbought, optional zone, retest and break of swing for a BUY / SELL button',short:'Engulfing Candle + RSI',own:true,
  defs:{limit:false,useSl:false,ecrDir:'Both',ecrLen:14,ecrOB:70,ecrOS:30,ecrSrc:'Close',ecrLook:2,ecrStrict:false,ecrBos:true,ecrWait:50,ecrSw:3,ecrExt:15,ecrMk:false,ecrDist:40,ecrBtnSz:'Small',
    ecrSup:'#26a65b',ecrRes:'#e53935',ecrBtnBuy:'#2dd4a7',ecrBtnSell:'#ff5d7a',ecrLbl:true,ecrN:300,ecrSize:'Small',ecrSig:true},
  inputs:(b,d)=>{
    fld(b,d,'ecrDir','sel','Trade direction',{opts:['Both','Buy only','Sell only']});
    fld(b,d,'ecrSrc','sel','RSI source',{opts:['Close','Open','High','Low','HL2','HLC3','OHLC4']});
    fld(b,d,'ecrLen','num','RSI length',{min:2,max:100,step:1}); fld(b,d,'ecrOB','num','RSI overbought level',{min:50,max:99,step:1}); fld(b,d,'ecrOS','num','RSI oversold level',{min:1,max:50,step:1});
    fld(b,d,'ecrLook','num','RSI look-back (bars before the engulfing candle; Pine default 2)',{min:0,max:10,step:1});
    fld(b,d,'ecrStrict','chk','Strict engulfing (candle must also take the previous high and low)');
    fld(b,d,'ecrBos','chk','Extra setup: zone, retest and break of previous swing = BUY / SELL (off = BUY / SELL right on the engulfing candle)');
    fld(b,d,'ecrSw','num','Swing length for the previous swing low / high (bars each side)',{min:1,max:10,step:1});
    fld(b,d,'ecrWait','num','Max bars to wait for retest + break (then the zone expires)',{min:5,max:300,step:5});
    fld(b,d,'ecrMk','chk','Show retest dot and BOS line (extra detail)'); fld(b,d,'ecrExt','num','Extend a waiting zone to the right (bars)',{min:0,max:100,step:5});
    fld(b,d,'ecrBtnSz','sel','BUY / SELL button size',{opts:['Tiny','Small','Normal']}); fld(b,d,'ecrDist','num','Button distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'ecrBtnBuy','col','BUY button colour'); fld(b,d,'ecrBtnSell','col','SELL button colour');
    fld(b,d,'ecrSup','col','Support zone colour'); fld(b,d,'ecrRes','col','Resistance zone colour');
    fld(b,d,'ecrLbl','chk','Show zone labels and small notes');
    fld(b,d,'ecrN','num','Signals shown on chart',{min:1,max:2000,step:10}); fld(b,d,'ecrSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'ecrSig','chk','BUY / SELL signals'); },
  sig:(c,i,n,Z)=>{ if(Z.ecrSig===false||c.length<20) return 0; const r=ecrRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.ecr='Strategy \u00b7 engulfing after RSI extreme, support / resistance zone, retest, break of swing high / low, small BUY / SELL button'; }catch(e){}
{ const _ecD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='ecrview') return ecrDraw(d,X,Y,W,H); return _ecD.apply(this,arguments); };
  const _ecR=recomputeExtras; recomputeExtras=function(){ _ecR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='ecr'&&stVis(Z)) scriptBoxes.push({type:'ecrview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('ecr strategy failed',err); window.__ecrErr=err; }

// =====================================================================================
// [mru] STRATEGY · "Fast Future Sniper" (full-body candle: marubozu)   (self-contained: every name starts with mru / MRU)
// Marubozu = a candle that is (almost) all body: no or tiny wicks, so one side controlled the whole candle.
// SELL straight after a BEARISH marubozu closes, BUY straight after a BULLISH marubozu closes.
// The candle that is still forming is never used (signal only once it has closed). Same small button as the Engulfing tool:
// rounded BUY / SELL button away from the price, joined to the candle by a dotted line. Hooks: STRATS.mru + draw + recomputeExtras.
// =====================================================================================
try{
const MRU_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const MRU_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
function mruAtr(c,n){ const o=new Array(c.length).fill(0); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*(n-1)+tr)/n; o[i]=p; } return o; }
function mruEmaN(Z){ const v=Z.mruEma; if(!v||v==='Off') return 0; const n=v==='Custom'?Math.round(+Z.mruEmaLen)||50:Math.round(+v); return Math.max(2,Math.min(1000,n)); }
function mruEma(c,n){ const o=new Array(c.length).fill(null); let p=null; for(let i=0;i<c.length;i++){ const k=2/(Math.min(i+1,n)+1); p=p==null?c[i].close:c[i].close*k+p*(1-k); o[i]=p; } return o; }   // starts on the very first candle (short averaging window while history is short), so the line covers the whole chart
function mruTfOk(Z){ if(Z.mruHtf===false) return true; try{ const t=tf, sec=t[3]?t[3]*30*86400:t[2]; return !(sec<3600); }catch(e){ return true; } }
const mruCache={};
function mruRun(c,Z){ if(!mruTfOk(Z)) return {ev:[],sig:new Map()}; const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.mruDir,Z.mruPct,Z.mruWick,Z.mruAtr,Z.mruWait,Z.mruEma,Z.mruEmaLen,Z.mruVolOn,Z.mruVolX,Z.mruVolLen,Z.mruDirOn,Z.mruDirLen,Z.mruDirMin,Z.mruDistP,Z.mruDistA,Z.mruGapB,Z.mruGapS,Z.mruSrOn,Z.mruSrLen,Z.mruSrK,Z.mruSrPct,Z.mruSrAtr,Z.mruSwOn,Z.mruSwN,Z.mruSwW,Z.mruFtOn,Z.mruFtPct,Z.mruMtfOn,Z.mruMtfMul,Z.mruMtfLen,Z.mruExtOn,Z.mruExtLen,Z.mruExtP,Z.mruExtA,Z.mruFlatOn,Z.mruFlatLen,Z.mruFlatBars,Z.mruFlatPct].join('|');
  const h=mruCache[Z.sid]; if(h&&h.k===key) return h.r;
  const pct=Math.min(1,Math.max(0.5,(Z.mruPct==null?90:+Z.mruPct)/100)), wk=Math.min(0.5,Math.max(0,(Z.mruWick==null?5:+Z.mruWick)/100)), ma=Z.mruAtr==null?0.8:+Z.mruAtr,
    last=Z.mruWait===false?m:m-1, atr=mruAtr(c,14), ev=[], sig=new Map(), eN=mruEmaN(Z), ema=eN?mruEma(c,eN):null,
    gapB=Math.max(0,Math.round(+Z.mruGapB)||0), gapS=Math.max(0,Math.round(+Z.mruGapS)||0),
    dirOn=Z.mruDirOn===true, dirL=Math.max(1,Math.min(200,Math.round(+Z.mruDirLen)||5)), dirMin=Math.max(0,+Z.mruDirMin||0), distP=Math.max(0,+Z.mruDistP||0), distA=Math.max(0,+Z.mruDistA||0),
    vOn=Z.mruVolOn===true, vx=+Z.mruVolX>0?+Z.mruVolX:1.2, vl=Math.max(3,Math.min(500,Math.round(+Z.mruVolLen)||20)), lowV=new Array(m).fill(false);
  if(vOn){ let sv=0; for(let i=0;i<m;i++){ const v=+c[i].volume||0, n=Math.min(i,vl), av=n>0?sv/n:0; lowV[i]=i>=3&&av>0&&v<vx*av; sv+=v; if(i>=vl) sv-=(+c[i-vl].volume||0); } }   // VOLUME filter: the signal candle needs volume >= X times the recent average (skipped when the data has no volume)
  let lastB=-1e9, lastS=-1e9;
  // SUPPORT / RESISTANCE filter: skip a BUY right under a recent swing high and a SELL right above a recent swing low (a swing = highest / lowest of K candles each side, confirmed after K candles)
  const srOn=Z.mruSrOn===true, srLen=Math.max(10,Math.min(2000,Math.round(+Z.mruSrLen)||100)), srK=Math.max(1,Math.min(30,Math.round(+Z.mruSrK)||5)), srPct=Math.max(0,+Z.mruSrPct||0), srAtr=Math.max(0,+Z.mruSrAtr||0);
  const srBlock=(i,s_,cl)=>{ const tol=Math.max(cl*srPct/100,srAtr*(atr[i-1]||atr[i]||0)); if(!(tol>0)) return false;
    for(let j=i-srK;j>=Math.max(srK,i-srLen);j--){ let ok=true; const h=c[j].high, l=c[j].low;
      if(s_===1){ if(h<=cl||h-cl>tol) continue; for(let q=j-srK;q<=j+srK&&ok;q++){ if(q!==j&&c[q]&&c[q].high>h) ok=false; } if(ok) return true; }
      else { if(l>=cl||cl-l>tol) continue; for(let q=j-srK;q<=j+srK&&ok;q++){ if(q!==j&&c[q]&&c[q].low<l) ok=false; } if(ok) return true; } }
    return false; };
  // LIQUIDITY-SWEEP filter: a candle that spiked above the recent high and closed back under it blocks BUY signals for a few candles; one that spiked below the recent low and closed back above it blocks SELL signals
  const swOn=Z.mruSwOn===true, swN=Math.max(3,Math.min(500,Math.round(+Z.mruSwN)||20)), swW=Math.max(1,Math.min(50,Math.round(+Z.mruSwW)||3)), swUp=new Array(m).fill(false), swDn=new Array(m).fill(false);
  if(swOn){ for(let i=swN;i<m;i++){ let hh=-1e18, ll=1e18; for(let j=i-swN;j<i;j++){ if(c[j].high>hh) hh=c[j].high; if(c[j].low<ll) ll=c[j].low; } if(c[i].high>hh&&c[i].close<hh) swUp[i]=true; if(c[i].low<ll&&c[i].close>ll) swDn[i]=true; } }
  // FOLLOW-THROUGH, HIGHER-TIMEFRAME, OVEREXTENSION and FLAT-EMA filters (each optional; the last three use their own EMA, independent of the main EMA filter)
  const ftOn=Z.mruFtOn===true, ftPct=Math.max(0,Math.min(100,+Z.mruFtPct||0));
  const ec={}, getE=n=>ec[n]||(ec[n]=mruEma(c,n));
  const mtfOn=Z.mruMtfOn===true, mtfMul=Math.max(2,Math.min(500,Math.round(+Z.mruMtfMul)||4)), mtfLen=Math.max(2,Math.min(500,Math.round(+Z.mruMtfLen)||50)); let mtfE=null;
  if(mtfOn&&m>6){ const dt=Math.max(1,c[m-1].time-c[m-2].time), gl=[], gi=new Array(m); let pg=null; for(let i=0;i<m;i++){ const g=Math.floor(c[i].time/(dt*mtfMul)); if(g!==pg){ gl.push({close:c[i].close}); pg=g; } else gl[gl.length-1].close=c[i].close; gi[i]=gl.length-1; }
    const ge=[]; let p=null; for(let k=0;k<gl.length;k++){ const a=2/(Math.min(k+1,mtfLen)+1); p=p==null?gl[k].close:gl[k].close*a+p*(1-a); ge.push(p); }
    mtfE=new Array(m).fill(null); for(let i=0;i<m;i++){ if(gi[i]>=1) mtfE[i]=ge[gi[i]-1]; } }   // value of the higher-timeframe EMA as of the last COMPLETED higher-timeframe bar (no repaint)
  const extOn=Z.mruExtOn===true, extLen=Math.max(2,Math.min(1000,Math.round(+Z.mruExtLen)||50)), extP=Math.max(0,+Z.mruExtP||0), extA=Math.max(0,+Z.mruExtA||0);
  const flOn=Z.mruFlatOn===true, flLen=Math.max(2,Math.min(1000,Math.round(+Z.mruFlatLen)||50)), flBars=Math.max(1,Math.min(500,Math.round(+Z.mruFlatBars)||10)), flPct=Math.max(0,+Z.mruFlatPct||0);
  const swHit=(i,s_)=>{ for(let j=Math.max(0,i-swW);j<i;j++){ if(s_===1?swUp[j]:swDn[j]) return true; } return false; };
  for(let i=1;i<last;i++){ const x=c[i], rg=x.high-x.low; if(!(rg>0)) continue; const bo=Math.abs(x.close-x.open); if(bo<pct*rg) continue;
    const uw=x.high-Math.max(x.open,x.close), lw=Math.min(x.open,x.close)-x.low; if(uw>wk*rg||lw>wk*rg) continue;
    if(ma>0&&bo<ma*(atr[i-1]||atr[i])) continue;
    const s=x.close>x.open?1:-1; if(s===1&&Z.mruDir==='Sell only') continue; if(s===-1&&Z.mruDir==='Buy only') continue;
    if(ema&&ema[i]!=null){ if(s===-1&&x.close>ema[i]) continue; if(s===1&&x.close<ema[i]) continue;
      if(dirOn&&i-dirL>=0&&ema[i-dirL]!=null){ const sl=(ema[i]-ema[i-dirL])/ema[i-dirL]*100; if(s===-1&&!(sl<-dirMin)) continue; if(s===1&&!(sl>dirMin)) continue; }   // EMA DIRECTION: SELL only while the EMA is falling, BUY only while it is rising
      const dd=Math.abs(x.close-ema[i]); if(distP>0&&dd<ema[i]*distP/100) continue; if(distA>0&&dd<distA*(atr[i-1]||atr[i]||0)) continue; }   // MINIMUM DISTANCE: the close must be clearly beyond the EMA, not just touching it   // EMA filter: SELL only below the EMA, BUY only above it; the other side is invalid
    if(lowV[i]) continue;
    if(mtfOn&&mtfE&&mtfE[i]!=null){ if(s===1&&x.close<mtfE[i]) continue; if(s===-1&&x.close>mtfE[i]) continue; }   // HIGHER-TIMEFRAME agreement: BUY only above the higher-timeframe EMA, SELL only below it
    if(extOn){ const e=getE(extLen)[i]; if(e!=null){ const dd=Math.abs(x.close-e); if((extP>0&&dd>e*extP/100)||(extA>0&&dd>extA*(atr[i-1]||atr[i]||0))) continue; } }   // OVEREXTENDED: price already too far from the EMA
    if(flOn&&i-flBars>=0){ const E=getE(flLen), e0=E[i-flBars], e1=E[i]; if(e0!=null&&e1!=null&&Math.abs(e1-e0)/e0*100<flPct) continue; }   // FLAT EMA: choppy market, no signal
    if(ftOn){ if(i+1>=last) continue; const nx=c[i+1], bd=Math.abs(x.close-x.open); if(s===1?(nx.close<x.close-ftPct/100*bd):(nx.close>x.close+ftPct/100*bd)) continue; }   // FOLLOW-THROUGH: the next candle must not take back most of the signal candle (the signal then shows one candle later)
    if(srOn&&srBlock(i,s,x.close)) continue;
    if(swOn&&swHit(i,s)) continue;
    if(s===1){ if(i-lastB<gapB) continue; lastB=i; } else { if(i-lastS<gapS) continue; lastS=i; }   // SPACING: minimum candles between signals of the same side (0 = off)
    ev.push({i,s}); sig.set(i,s); }
  const r={ev,sig}; mruCache[Z.sid]={k:key,r}; return r; }
function mruDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return;
  if(!mruTfOk(Z)){ cx.save(); cx.font='9px system-ui'; cx.textAlign='left'; cx.textBaseline='middle'; cx.fillStyle='rgba(209,212,220,0.75)'; cx.fillText('Fast Future Sniper: works on 1h and above',12,H-12); cx.restore(); return; }
  const r=mruRun(c,Z); if(!r) return;
  const fs=MRU_FS[Z.mruSize]||7.5, lbl=Z.mruLbl!==false, bt=MRU_BT[Z.mruBtnSz]||MRU_BT.Small, dist=Math.max(8,Math.round(Z.mruDist==null?40:Z.mruDist)), box=Z.mruBox===true,
    btB=Z.mruBtnBuy||'#2dd4a7', btS=Z.mruBtnSell||'#ff5d7a';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  { const en=mruEmaN(Z); if(en&&Z.mruEmaShow!==false){ const ea=mruEma(c,en); cx.strokeStyle=Z.mruEmaCol||'#f5b942'; cx.lineWidth=1.5; cx.beginPath(); let st=false;
      for(let i=Math.max(0,c.length-2000);i<c.length;i++){ if(ea[i]==null){ continue; } const xx=X(i), yy=Y(ea[i]); if(xx==null||yy==null){ st=false; continue; } if(!st){ cx.moveTo(xx,yy); st=true; } else cx.lineTo(xx,yy); } cx.stroke(); } }
  const glass=Z.mruStyle==='Glass lines';
  let glw=3; if(glass){ const a=X(c.length-1), b2=X(c.length-2), sp=(a!=null&&b2!=null)?Math.abs(a-b2):6; glw=Z.mruGlW==='Thin'?3:Z.mruGlW==='Wide'?Math.max(8,sp*3):Math.max(3,sp*0.9); }
  r.ev.slice(-Math.max(1,Math.round(Z.mruN)||300)).forEach(e=>{
    const bb=c[e.i], xt=X(e.i); if(!bb||xt==null||xt<-30||xt>W+30) return; const buy=e.s===1, k=buy?1:-1, y=Y(buy?bb.low:bb.high); if(y==null) return;
    if(glass){ const col=buy?btB:btS, L=xt-glw/2;   // GLASS LINE: a transparent vertical band over the signal candle, full height of the chart (top to bottom) like the session shading
      const g=cx.createLinearGradient(L,0,L+glw,0); g.addColorStop(0,rgba(col,0.42)); g.addColorStop(0.5,rgba(col,0.14)); g.addColorStop(1,rgba(col,0.42));
      cx.fillStyle=g; cx.fillRect(L,0,glw,H);
      const v=cx.createLinearGradient(0,0,0,H); v.addColorStop(0,'rgba(255,255,255,0.10)'); v.addColorStop(0.5,'rgba(255,255,255,0)'); v.addColorStop(1,'rgba(255,255,255,0.10)'); cx.fillStyle=v; cx.fillRect(L,0,glw,H);
      cx.fillStyle='rgba(255,255,255,0.30)'; cx.fillRect(L,0,1,H); cx.fillStyle=rgba(col,0.6); cx.fillRect(L+glw-1,0,1,H);
      if(box){ const y1=Y(bb.high), y2=Y(bb.low); if(y1!=null&&y2!=null){ cx.strokeStyle=rgba(col,0.8); cx.lineWidth=1.2; cx.strokeRect(xt-5,Math.min(y1,y2)-2,10,Math.abs(y2-y1)+4); } }
      return; }
    const w=bt[0],h=bt[1],fz=bt[2], ty=y+k*dist, by=k===1?ty+h:ty-h, top=Math.min(ty,by), col=buy?btB:btS;
    if(box){ const y1=Y(bb.high), y2=Y(bb.low); if(y1!=null&&y2!=null){ cx.strokeStyle=rgba(col,0.8); cx.lineWidth=1.2; cx.strokeRect(xt-5,Math.min(y1,y2)-2,10,Math.abs(y2-y1)+4); } }
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y+k*3); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y+k*3,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.fillText(buy?'BUY':'SELL',xt,top+h/2+.5);
  });
  cx.globalAlpha=1; cx.restore(); }
STRATS.mru={label:'Fast Future Sniper Pro Plus \u00b7 SELL right after a strong bearish candle closes, BUY right after a strong bullish candle closes',short:'Fast Future Sniper Pro Plus',own:true,
  defs:{limit:false,useSl:false,mruDir:'Both',mruPct:90,mruWick:5,mruAtr:0.8,mruWait:true,mruEma:'Off',mruEmaLen:50,mruGapB:0,mruGapS:0,mruFtOn:false,mruFtPct:50,mruMtfOn:false,mruMtfMul:4,mruMtfLen:50,mruExtOn:false,mruExtLen:50,mruExtP:5,mruExtA:0,mruFlatOn:false,mruFlatLen:50,mruFlatBars:10,mruFlatPct:0.3,mruSrOn:false,mruSrLen:100,mruSrK:5,mruSrPct:0.5,mruSrAtr:0,mruSwOn:false,mruSwN:20,mruSwW:3,mruDirOn:false,mruDirLen:5,mruDirMin:0,mruDistP:0,mruDistA:0,mruVolOn:false,mruVolX:1.2,mruVolLen:20,mruEmaShow:true,mruEmaCol:'#f5b942',mruHtf:true,mruBox:false,mruStyle:'Buttons',mruGlW:'Candle',mruDist:40,mruBtnSz:'Small',mruBtnBuy:'#2dd4a7',mruBtnSell:'#ff5d7a',mruN:300,mruSig:true},
  inputs:(b,d)=>{
    fld(b,d,'mruDir','sel','Trade direction',{opts:['Both','Buy only','Sell only']});
    fld(b,d,'mruPct','num','Body must be at least this % of the candle range',{min:60,max:100,step:1});
    fld(b,d,'mruWick','num','Max wick on each side (% of range, 0 = no wick at all)',{min:0,max:30,step:1});
    fld(b,d,'mruAtr','num','Ignore small candles (body below x ATR, 0 = off)',{min:0,max:5,step:0.1});
    fld(b,d,'mruEma','sel','EMA filter: SELL only below the EMA, BUY only above it (the other side is not shown)',{opts:['Off','50','100','200','Custom']});
    fld(b,d,'mruEmaLen','num','Custom EMA period (used when the filter is set to Custom)',{min:2,max:1000,step:1});
    fld(b,d,'mruEmaShow','chk','Draw the EMA line on the chart'); fld(b,d,'mruEmaCol','col','EMA line colour');
    fld(b,d,'mruFtOn','chk','FOLLOW-THROUGH filter: the next candle must not take back most of the signal candle (the signal then shows one candle later)');
    fld(b,d,'mruFtPct','num','Drop the signal if the next candle gives back more than this % of the signal candle (50 = half)',{min:0,max:100,step:5});
    fld(b,d,'mruMtfOn','chk','HIGHER-TIMEFRAME filter: BUY only above, SELL only below the EMA of a bigger timeframe');
    fld(b,d,'mruMtfMul','num','Bigger timeframe = this many times the chart timeframe (4 on 1h = 4h, 24 on 1h = 1D)',{min:2,max:500,step:1});
    fld(b,d,'mruMtfLen','num','EMA period on the bigger timeframe',{min:2,max:500,step:1});
    fld(b,d,'mruExtOn','chk','OVEREXTENSION filter: skip signals when price is already far from the EMA (chasing)');
    fld(b,d,'mruExtLen','num','EMA period used for the overextension check',{min:2,max:1000,step:1});
    fld(b,d,'mruExtP','num','Too far = more than this % of price away from that EMA (0 = off)',{min:0,max:100,step:0.5});
    fld(b,d,'mruExtA','num','Or more than this many ATR away (0 = off)',{min:0,max:50,step:0.5});
    fld(b,d,'mruFlatOn','chk','FLAT-EMA filter: no signals while the EMA is flat (choppy market)');
    fld(b,d,'mruFlatLen','num','EMA period used for the flat check',{min:2,max:1000,step:1});
    fld(b,d,'mruFlatBars','num','Measure the EMA movement over the last N candles',{min:1,max:500,step:1});
    fld(b,d,'mruFlatPct','num','Flat = the EMA moved less than this % over those candles',{min:0,max:20,step:0.05});
    fld(b,d,'mruSrOn','chk','SUPPORT / RESISTANCE filter: skip a BUY right under a recent swing high, a SELL right above a recent swing low');
    fld(b,d,'mruSrLen','num','Look for swing highs / lows in the last N candles',{min:10,max:2000,step:10});
    fld(b,d,'mruSrK','num','A swing = highest / lowest of this many candles each side',{min:1,max:30,step:1});
    fld(b,d,'mruSrPct','num','"Right under / above" = within this % of price (0.5 = half a percent)',{min:0,max:20,step:0.05});
    fld(b,d,'mruSrAtr','num','Or within this many ATR (0 = off, the larger of the two is used)',{min:0,max:20,step:0.1});
    fld(b,d,'mruSwOn','chk','LIQUIDITY-SWEEP filter: after a spike through a recent high that fell back, BUYs are blocked; after a spike through a recent low that bounced, SELLs are blocked');
    fld(b,d,'mruSwN','num','Recent high / low = the last N candles',{min:3,max:500,step:1});
    fld(b,d,'mruSwW','num','A sweep blocks the opposite signal for this many candles',{min:1,max:50,step:1});
    fld(b,d,'mruGapB','num','SPACING: minimum candles between BUY signals (0 = off, e.g. 10, 20, 50)',{min:0,max:5000,step:1});
    fld(b,d,'mruGapS','num','SPACING: minimum candles between SELL signals (0 = off, e.g. 10, 20, 50)',{min:0,max:5000,step:1});
    fld(b,d,'mruDirOn','chk','EMA DIRECTION filter (needs an EMA above): SELL only while the EMA is falling, BUY only while it is rising');
    fld(b,d,'mruDirLen','num','Direction is measured over the last N candles',{min:1,max:200,step:1});
    fld(b,d,'mruDirMin','num','EMA must move at least this % over those candles (0 = any direction, 0.2 = clearly sloping, flat EMA ignored)',{min:0,max:20,step:0.05});
    fld(b,d,'mruDistP','num','MINIMUM DISTANCE from the EMA, % of price (0 = off, e.g. 0.3)',{min:0,max:50,step:0.05});
    fld(b,d,'mruDistA','num','MINIMUM DISTANCE from the EMA, in ATR (0 = off, e.g. 0.5)',{min:0,max:20,step:0.1});
    fld(b,d,'mruVolOn','chk','VOLUME filter: the signal candle needs enough volume (a full-body candle on thin volume is often a push, not a real move)');
    fld(b,d,'mruVolX','num','Signal candle volume must be at least this many times the average (1.2 = 20% above average)',{min:0.1,max:20,step:0.1});
    fld(b,d,'mruVolLen','num','Average volume measured over the previous N candles',{min:3,max:500,step:1});
    fld(b,d,'mruWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'mruHtf','chk','Only on 1h and higher timeframes (no signals below 1h)');
    fld(b,d,'mruBox','chk','Outline the signal candle');
    fld(b,d,'mruStyle','sel','Signal style: BUY / SELL buttons, or glass lines from top to bottom of the screen (like the sessions)',{opts:['Buttons','Glass lines']});
    fld(b,d,'mruGlW','sel','Glass line width (used when the style is Glass lines)',{opts:['Thin','Candle','Wide']});
    fld(b,d,'mruBtnSz','sel','BUY / SELL button size',{opts:['Tiny','Small','Normal']}); fld(b,d,'mruDist','num','Button distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'mruBtnBuy','col','BUY colour (button / glass line)'); fld(b,d,'mruBtnSell','col','SELL colour (button / glass line)');
    fld(b,d,'mruN','num','Signals shown on chart',{min:1,max:2000,step:10});
    fld(b,d,'mruSig','chk','BUY / SELL signals'); },
  sig:(c,i,n,Z)=>{ if(Z.mruSig===false||c.length<20) return 0; const r=mruRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.mru='Strategy \u00b7 instant SELL / BUY after a full-body candle closes (1h and above)'; }catch(e){}
{ const _muD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='mruview') return mruDraw(d,X,Y,W,H); return _muD.apply(this,arguments); };
  const _muR=recomputeExtras; recomputeExtras=function(){ _muR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='mru'&&stVis(Z)) scriptBoxes.push({type:'mruview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('mru strategy failed',err); window.__mruErr=err; }


// =====================================================================================
// [mmo] STRATEGY · "Market Momentum 02"   (self-contained: every name starts with mmo / MMO)
// Marubozu = a candle that is (almost) all body, with no or tiny wicks. When a marubozu has FINISHED forming
// (closed candle only, never the live one) a tiny dot is put on top of it: GREEN = bullish, RED = bearish.
// A tiny table at the top right counts the dots over the last N candles (Bullish +20, Bearish +70) and shows
// the status: SELL when bearish dots are more, BUY when bullish dots are more, NEUTRAL when equal.
// No BUY / SELL arrows on the chart. Hooks: STRATS.mmo + draw + recomputeExtras (same pattern as lpo / mru).
// =====================================================================================
try{
function mmoAtr(c,n){ const o=new Array(c.length).fill(0); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*(n-1)+tr)/n; o[i]=p; } return o; }
const mmoCache={};
function mmoRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.mmoPct,Z.mmoWick,Z.mmoAtr,Z.mmoN].join('|');
  const h=mmoCache[Z.sid]; if(h&&h.k===key) return h.r;
  const pct=Math.min(1,Math.max(0.5,(Z.mmoPct==null?90:+Z.mmoPct)/100)), wk=Math.min(0.5,Math.max(0,(Z.mmoWick==null?5:+Z.mmoWick)/100)), ma=Z.mmoAtr==null?0.5:+Z.mmoAtr,
    atr=mmoAtr(c,14), ev=[], last=m-1;   // last candle is still forming: never counted
  for(let i=1;i<last;i++){ const x=c[i], rg=x.high-x.low; if(!(rg>0)) continue; const bo=Math.abs(x.close-x.open); if(bo<pct*rg) continue;
    const uw=x.high-Math.max(x.open,x.close), lw=Math.min(x.open,x.close)-x.low; if(uw>wk*rg||lw>wk*rg) continue;
    if(ma>0&&bo<ma*(atr[i-1]||atr[i])) continue;
    ev.push({i,s:x.close>x.open?1:-1}); }
  const N=Math.max(5,Math.round(Z.mmoN)||100), from=last-N; let bu=0,be=0; ev.forEach(e=>{ if(e.i>=from){ if(e.s===1) bu++; else be++; } });
  const r={ev,bu,be,N}; mmoCache[Z.sid]={k:key,r}; return r; }
function mmoDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=mmoRun(c,Z); if(!r) return;
  const cb=Z.mmoBull||'#2dd4a7', cr=Z.mmoBear||'#ff5d7a', ds=Math.max(1,+Z.mmoDot||2), gap=Math.max(2,Math.round(Z.mmoGap==null?5:Z.mmoGap));
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  // glass stripes: a light transparent full-height band on every finished marubozu candle (green = bullish, red = bearish), top to bottom of the screen
  if(Z.mmoDots!==false){ const op=Math.min(60,Math.max(3,Z.mmoOp==null?16:+Z.mmoOp))/100, rgb=h=>{ const m=/^#?([0-9a-f]{6})$/i.exec(h||''); const n=m?parseInt(m[1],16):0xffffff; return (n>>16&255)+','+(n>>8&255)+','+(n&255); }, gr={};
    const mk=col=>{ const k=rgb(col), g=cx.createLinearGradient(0,0,0,H); g.addColorStop(0,'rgba('+k+','+(op*0.55)+')'); g.addColorStop(0.5,'rgba('+k+','+op+')'); g.addColorStop(1,'rgba('+k+','+(op*0.55)+')'); return {g,k}; }; gr[1]=mk(cb); gr[-1]=mk(cr);
    r.ev.slice(-Math.max(1,Math.round(Z.mmoShow)||500)).forEach(e=>{ const x=X(e.i); if(x==null||x<-20||x>W+20) return; const xn=X(e.i+1), xq=X(e.i-1), sp=Math.abs((xn!=null?xn:x+(x-(xq!=null?xq:x-6)))-x)||6, w=Math.max(2,sp*Math.max(0.3,Math.min(1,Z.mmoW==null?1:+Z.mmoW))), G=gr[e.s];
      cx.fillStyle=G.g; cx.fillRect(x-w/2,0,w,H); cx.fillStyle='rgba('+G.k+','+Math.min(0.5,op*1.6)+')'; cx.fillRect(x-w/2,0,1,H); cx.fillRect(x+w/2-1,0,1,H); }); }
  // tiny table, top right
  if(Z.mmoTab!==false){
    let bu=r.bu, be=r.be, lab=String(tf[0]).toUpperCase()+' \u00b7 '+r.N;
    if(Z.mmoScope!=='Last N candles'){ bu=0; be=0; r.ev.forEach(e=>{ const x=X(e.i); if(x==null||x<0||x>W) return; if(e.s===1) bu++; else be++; }); lab=String(tf[0]).toUpperCase()+' \u00b7 on screen'; }
    const st=bu>be?'BUY':be>bu?'SELL':'NEUTRAL', sc=st==='BUY'?cb:st==='SELL'?cr:'#8a91a5', mu='#8a91a5', tx='#d1d4dc';
    const tw=112, th=15+3*13+3, s=Math.min(1,(W-8)/tw), x0=Z.mmoPos==='Top left'?4:Z.mmoPos==='Top center'?(W-tw*s)/2:Math.max(4,W-tw*s-6), y0=Math.max(2,Z.mmoY==null?34:+Z.mmoY||0);
    cx.translate(x0,y0); cx.scale(s,s); cx.textBaseline='middle';
    cx.fillStyle='rgba(16,20,29,.92)'; cx.fillRect(0,0,tw,th); cx.strokeStyle='rgba(255,255,255,.16)'; cx.strokeRect(0.5,0.5,tw-1,th-1);
    cx.font='bold 9px system-ui'; cx.textAlign='left'; cx.fillStyle=mu; cx.fillText('MOMENTUM',6,8);
    cx.textAlign='right'; cx.fillText(lab,tw-6,8);
    const tot=bu+be, pb=tot?Math.round(bu/tot*100):0, rows=[['Bullish','\u25b2 '+pb+'%',cb],['Bearish','\u25bc '+(tot?100-pb:0)+'%',cr],['Status',st,sc]];
    rows.forEach((q,k)=>{ const cy=15+k*13+6.5; cx.font='bold 10px system-ui'; cx.textAlign='left'; cx.fillStyle=tx; cx.fillText(q[0],6,cy); cx.textAlign='right'; cx.fillStyle=q[2]; cx.fillText(q[1],tw-6,cy); });
  }
  cx.restore(); }
STRATS.mmo={label:'Market Momentum 02 \u00b7 glass stripes on finished marubozu candles + bullish / bearish count table',short:'Market Momentum 02',own:true,
  defs:{limit:false,useSl:false,mmoPct:90,mmoWick:5,mmoAtr:0.5,mmoN:100,mmoDots:true,mmoTab:true,mmoOp:16,mmoW:1,mmoDot:2,mmoGap:5,mmoShow:500,mmoPos:'Top right',mmoY:34,mmoScope:'On screen',mmoBull:'#2dd4a7',mmoBear:'#ff5d7a'},
  inputs:(b,d)=>{
    fld(b,d,'mmoPct','num','Body must be at least this % of the candle range',{min:60,max:100,step:1});
    fld(b,d,'mmoWick','num','Max wick on each side (% of range, 0 = no wick at all)',{min:0,max:30,step:1});
    fld(b,d,'mmoAtr','num','Ignore small candles (body below x ATR, 0 = off)',{min:0,max:5,step:0.1});
    fld(b,d,'mmoScope','sel','Table counts',{opts:['On screen','Last N candles']}); fld(b,d,'mmoN','num','N candles (when counting last N)',{min:5,max:2000,step:5});
    fld(b,d,'mmoTab','chk','Show the table (on / off)'); fld(b,d,'mmoDots','chk','Show glass stripes on marubozu candles');
    fld(b,d,'mmoOp','num','Stripe strength (% opacity, lower = more transparent)',{min:3,max:60,step:1}); fld(b,d,'mmoW','num','Stripe width (1 = full candle, 0.3 = thin)',{min:0.3,max:1,step:0.1});
    fld(b,d,'mmoShow','num','Stripes shown on chart',{min:1,max:3000,step:10});
    fld(b,d,'mmoPos','sel','Table position',{opts:['Top right','Top center','Top left']}); fld(b,d,'mmoY','num','Table distance from the top (px)',{min:0,max:600,step:2});
    fld(b,d,'mmoBull','col','Bullish colour'); fld(b,d,'mmoBear','col','Bearish colour'); },
  sig:()=>0};
try{ DESC.mmo='Strategy \u00b7 tiny green / red dots on finished marubozu candles with a Bullish / Bearish count table and status'; }catch(e){}
{ const _moD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='mmoview') return mmoDraw(d,X,Y,W,H); return _moD.apply(this,arguments); };
  const _moR=recomputeExtras; recomputeExtras=function(){ _moR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='mmo'&&stVis(Z)) scriptBoxes.push({type:'mmoview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('mmo strategy failed',err); window.__mmoErr=err; }

// =====================================================================================
// [beg] STRATEGY · "Bullish Engulfing"   (self-contained: every name starts with beg / BEG)
// Two candles: (1) a red / bearish candle that is part of a downtrend, immediately followed by
// (2) a green / bullish candle that completely engulfs it: it starts at (or below) the previous close and
// closes ABOVE the previous high. The bull candle should have minimal to no upper / lower wick (it closes at or near its top).
// BUY right after the engulfing candle closes (the candle that is still forming is never used).
// Same small BUY button as Fast Future Sniper / Engulfing Candle + RSI. Hooks: STRATS.beg + draw + recomputeExtras.
// =====================================================================================
try{
const BEG_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const BEG_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
function begAtr(c,n){ const o=new Array(c.length).fill(0); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*(n-1)+tr)/n; o[i]=p; } return o; }
const begCache={};
function begRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.begMode,Z.begWick,Z.begTol,Z.begTrend,Z.begLook,Z.begAtr,Z.begWait].join('|');
  const h=begCache[Z.sid]; if(h&&h.k===key) return h.r;
  const wk=Math.min(0.5,Math.max(0,(Z.begWick==null?10:+Z.begWick)/100)), tol=Math.max(0,(Z.begTol==null?10:+Z.begTol)/100), lb=Math.max(1,Math.round(Z.begLook==null?5:Z.begLook)),
    ma=Z.begAtr==null?0:+Z.begAtr, md=Z.begMode||'Close above previous high', last=Z.begWait===false?m:m-1, atr=ma>0?begAtr(c,14):null, ev=[], sig=new Map();
  for(let i=1;i<last;i++){ const p=c[i-1], x=c[i], rg=x.high-x.low, pr=p.high-p.low;
    if(!(rg>0)||!(p.close<p.open)||!(x.close>x.open)) continue;                                      // red candle, then green candle
    if(Z.begTrend!==false){ if(i-1-lb<0||!(p.close<c[i-1-lb].close)) continue; }                    // red candle belongs to a downtrend
    if(x.open>p.close+tol*pr) continue;                                                              // buyers start at the previous close (or lower)
    if(md==='Close above previous high'){ if(!(x.close>p.high)) continue; }
    else if(md==='Body engulfs body'){ if(!(x.close>=p.open)) continue; }
    else { if(!(x.close>=p.open&&x.high>=p.high&&x.low<=p.low)) continue; }                          // full range engulfs
    const uw=x.high-x.close, lw=x.open-x.low; if(uw>wk*rg||lw>wk*rg) continue;                       // minimal to no wick
    if(atr&&Math.abs(x.close-x.open)<ma*(atr[i-1]||atr[i])) continue;
    ev.push({i,s:1}); sig.set(i,1); }
  const r={ev,sig}; begCache[Z.sid]={k:key,r}; return r; }
function begDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=begRun(c,Z); if(!r) return;
  const fs=BEG_FS[Z.begSize]||7.5, lbl=Z.begLbl!==false, box=Z.begBox!==false, bt=BEG_BT[Z.begBtnSz]||BEG_BT.Small, dist=Math.max(8,Math.round(Z.begDist==null?40:Z.begDist)),
    btB=Z.begBtnBuy||'#2dd4a7', bxc=Z.begBoxCol||'#2dd4a7';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  r.ev.slice(-Math.max(1,Math.round(Z.begN)||300)).forEach(e=>{
    const p=c[e.i-1], bb=c[e.i], xt=X(e.i), xp=X(e.i-1); if(!bb||!p||xt==null||xt<-30||xt>W+30) return;
    const lo=Math.min(p.low,bb.low), hi=Math.max(p.high,bb.high), yLo=Y(lo), yHi=Y(hi); if(yLo==null||yHi==null) return;
    // outline around the two candles: red candle + the green candle that engulfs it
    if(box&&xp!=null){ const hw=Math.max(3,Math.abs(xt-xp)*0.5+2); cx.fillStyle=rgba(bxc,0.10); cx.strokeStyle=rgba(bxc,0.75); cx.lineWidth=1; rr(xp-hw+1,Math.min(yHi,yLo)-3,xt-xp+2*hw-2,Math.abs(yLo-yHi)+6,3); cx.fill(); cx.stroke(); }
    const y=Math.max(yLo,yHi)+(box?3:0), ty=y+dist, w=bt[0],h=bt[1],fz=bt[2], top=ty, col=btB;
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y+3); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y+3,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText('BUY',xt,top+h/2+.5);
    if(lbl){ cx.font=(fs-1)+'px system-ui'; cx.fillStyle='rgba(209,212,220,0.9)'; cx.fillText('bullish engulfing',xt,top+h+fs); }
  });
  cx.globalAlpha=1; cx.restore(); }
STRATS.beg={label:'Bullish Engulfing \u00b7 red candle in a downtrend, then a green candle that engulfs it (closes above its high) with no wick = BUY',short:'Bullish Engulfing',own:true,
  defs:{limit:false,useSl:false,short:false,begMode:'Close above previous high',begTrend:true,begLook:5,begTol:10,begWick:10,begAtr:0,begWait:true,begBox:true,begLbl:true,begDist:40,begBtnSz:'Small',begBtnBuy:'#2dd4a7',begBoxCol:'#2dd4a7',begN:300,begSize:'Small',begSig:true},
  inputs:(b,d)=>{
    fld(b,d,'begMode','sel','Engulfing rule',{opts:['Close above previous high','Body engulfs body','Full range engulfs']});
    fld(b,d,'begTrend','chk','Red candle must be part of a downtrend'); fld(b,d,'begLook','num','Downtrend look-back (price must be lower than this many bars ago)',{min:1,max:50,step:1});
    fld(b,d,'begTol','num','Green candle opens at / below previous close (tolerance, % of previous range)',{min:0,max:100,step:1});
    fld(b,d,'begWick','num','Max upper / lower wick on the green candle (% of its range, 0 = no wick at all)',{min:0,max:50,step:1});
    fld(b,d,'begAtr','num','Ignore small green candles (body below x ATR, 0 = off)',{min:0,max:5,step:0.1});
    fld(b,d,'begWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'begBox','chk','Outline the two candles'); fld(b,d,'begBoxCol','col','Outline colour');
    fld(b,d,'begBtnSz','sel','BUY button size',{opts:['Tiny','Small','Normal']}); fld(b,d,'begDist','num','Button distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'begBtnBuy','col','BUY button colour'); fld(b,d,'begLbl','chk','Show small note under the button');
    fld(b,d,'begN','num','Signals shown on chart',{min:1,max:2000,step:10}); fld(b,d,'begSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'begSig','chk','BUY signals'); },
  sig:(c,i,n,Z)=>{ if(Z.begSig===false||c.length<20) return 0; const r=begRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.beg='Strategy \u00b7 red candle in a downtrend followed by a green candle that engulfs it, closes above its high, no wick = BUY'; }catch(e){}
{ const _beD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='begview') return begDraw(d,X,Y,W,H); return _beD.apply(this,arguments); };
  const _beR=recomputeExtras; recomputeExtras=function(){ _beR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='beg'&&stVis(Z)) scriptBoxes.push({type:'begview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('beg strategy failed',err); window.__begErr=err; }

// =====================================================================================
// [ihm] STRATEGY · "Inverse Hammer"   (self-contained: every name starts with ihm / IHM)
// Inverse hammer = the hammer flipped: SMALL body at the bottom of the candle, LONG upper wick, little or no lower wick.
// After a downtrend buyers pushed price up but could not hold it; sellers came back but lost momentum = possible upside shift.
// BUY right after the candle closes (optional: wait for the next candle to close above its high). The live candle is never used.
// Same small BUY button as the other candlestick tools. Hooks: STRATS.ihm + draw + recomputeExtras.
// =====================================================================================
try{
const IHM_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const IHM_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
function ihmAtr(c,n){ const o=new Array(c.length).fill(0); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*(n-1)+tr)/n; o[i]=p; } return o; }
const ihmCache={};
function ihmRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.ihmRatio,Z.ihmBody,Z.ihmLow,Z.ihmTrend,Z.ihmLook,Z.ihmAtr,Z.ihmConf,Z.ihmBull,Z.ihmWait].join('|');
  const h=ihmCache[Z.sid]; if(h&&h.k===key) return h.r;
  const ra=Math.max(1,Z.ihmRatio==null?2:+Z.ihmRatio), bp=Math.min(0.9,Math.max(0.01,(Z.ihmBody==null?30:+Z.ihmBody)/100)), lw=Math.min(0.5,Math.max(0,(Z.ihmLow==null?10:+Z.ihmLow)/100)),
    lb=Math.max(1,Math.round(Z.ihmLook==null?5:Z.ihmLook)), ma=Z.ihmAtr==null?0:+Z.ihmAtr, last=Z.ihmWait===false?m:m-1, atr=ma>0?ihmAtr(c,14):null, ev=[], sig=new Map();
  for(let i=1;i<last;i++){ const x=c[i], rg=x.high-x.low; if(!(rg>0)) continue;
    const bo=Math.abs(x.close-x.open), top=Math.max(x.open,x.close), bot=Math.min(x.open,x.close), uw=x.high-top, lo=bot-x.low;
    if(Z.ihmTrend!==false){ if(i-lb<0||!(x.close<c[i-lb].close)) continue; }                       // comes after a downtrend
    if(bo>bp*rg) continue;                                                                           // small body
    if(uw<ra*bo||uw<0.5*rg) continue;                                                                // long upper wick
    if(lo>lw*rg) continue;                                                                           // little or no lower wick
    if(Z.ihmBull===true&&!(x.close>=x.open)) continue;
    if(atr&&rg<ma*(atr[i-1]||atr[i])) continue;
    let j=i; if(Z.ihmConf===true){ j=i+1; if(j>=last||!(c[j].close>x.high)) continue; }              // confirmation candle closes above the high
    ev.push({i,j,s:1}); sig.set(j,1); }
  const r={ev,sig}; ihmCache[Z.sid]={k:key,r}; return r; }
function ihmDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=ihmRun(c,Z); if(!r) return;
  const fs=IHM_FS[Z.ihmSize]||7.5, lbl=Z.ihmLbl!==false, box=Z.ihmBox!==false, bt=IHM_BT[Z.ihmBtnSz]||IHM_BT.Small, dist=Math.max(8,Math.round(Z.ihmDist==null?40:Z.ihmDist)),
    btB=Z.ihmBtnBuy||'#2dd4a7', bxc=Z.ihmBoxCol||'#2dd4a7';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  r.ev.slice(-Math.max(1,Math.round(Z.ihmN)||300)).forEach(e=>{
    const a=c[e.i], b=c[e.j], xa=X(e.i), xb=X(e.j); if(!a||!b||xa==null||xb==null||xb<-30||xb>W+30) return;
    const lo=Math.min(a.low,b.low), hi=Math.max(a.high,b.high), yLo=Y(lo), yHi=Y(hi); if(yLo==null||yHi==null) return;
    if(box){ const hw=Math.max(3,(e.j>e.i?Math.abs(xb-xa)*0.5:0)+4); cx.fillStyle=rgba(bxc,0.10); cx.strokeStyle=rgba(bxc,0.75); cx.lineWidth=1; rr(xa-hw+(e.j>e.i?1:0),Math.min(yHi,yLo)-3,xb-xa+2*hw-(e.j>e.i?2:0),Math.abs(yLo-yHi)+6,3); cx.fill(); cx.stroke(); }
    const y=Math.max(yLo,yHi)+(box?3:0), ty=y+dist, w=bt[0],h=bt[1],fz=bt[2], top=ty, col=btB;
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xb,y+3); cx.lineTo(xb,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xb,y+3,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xb-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xb-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText('BUY',xb,top+h/2+.5);
    if(lbl){ cx.font=(fs-1)+'px system-ui'; cx.fillStyle='rgba(209,212,220,0.9)'; cx.fillText(e.j>e.i?'inverse hammer + confirm':'inverse hammer',xb,top+h+fs); }
  });
  cx.globalAlpha=1; cx.restore(); }
STRATS.ihm={label:'Inverse Hammer \u00b7 small body, long upper wick, little or no lower wick after a downtrend = BUY',short:'Inverse Hammer',own:true,
  defs:{limit:false,useSl:false,short:false,ihmRatio:2,ihmBody:30,ihmLow:10,ihmTrend:true,ihmLook:5,ihmAtr:0,ihmConf:false,ihmBull:false,ihmWait:true,ihmBox:true,ihmLbl:true,ihmDist:40,ihmBtnSz:'Small',ihmBtnBuy:'#2dd4a7',ihmBoxCol:'#2dd4a7',ihmN:300,ihmSize:'Small',ihmSig:true},
  inputs:(b,d)=>{
    fld(b,d,'ihmTrend','chk','Must come after a downtrend'); fld(b,d,'ihmLook','num','Downtrend look-back (close must be lower than this many bars ago)',{min:1,max:50,step:1});
    fld(b,d,'ihmRatio','num','Upper wick at least this many times the body',{min:1,max:10,step:0.5});
    fld(b,d,'ihmBody','num','Max body size (% of candle range)',{min:1,max:90,step:1});
    fld(b,d,'ihmLow','num','Max lower wick (% of candle range, 0 = no lower wick at all)',{min:0,max:50,step:1});
    fld(b,d,'ihmBull','chk','Body must be green (bullish close only)');
    fld(b,d,'ihmConf','chk','Wait for confirmation: next candle closes above the inverse hammer high');
    fld(b,d,'ihmAtr','num','Ignore small candles (range below x ATR, 0 = off)',{min:0,max:5,step:0.1});
    fld(b,d,'ihmWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'ihmBox','chk','Outline the candle(s)'); fld(b,d,'ihmBoxCol','col','Outline colour');
    fld(b,d,'ihmBtnSz','sel','BUY button size',{opts:['Tiny','Small','Normal']}); fld(b,d,'ihmDist','num','Button distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'ihmBtnBuy','col','BUY button colour'); fld(b,d,'ihmLbl','chk','Show small note under the button');
    fld(b,d,'ihmN','num','Signals shown on chart',{min:1,max:2000,step:10}); fld(b,d,'ihmSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'ihmSig','chk','BUY signals'); },
  sig:(c,i,n,Z)=>{ if(Z.ihmSig===false||c.length<20) return 0; const r=ihmRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.ihm='Strategy \u00b7 small body, long upper wick, little or no lower wick after a downtrend = BUY (optional confirmation candle)'; }catch(e){}
{ const _ihD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='ihmview') return ihmDraw(d,X,Y,W,H); return _ihD.apply(this,arguments); };
  const _ihR=recomputeExtras; recomputeExtras=function(){ _ihR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='ihm'&&stVis(Z)) scriptBoxes.push({type:'ihmview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('ihm strategy failed',err); window.__ihmErr=err; }

// =====================================================================================
// [pcl] STRATEGY · "Piercing Line"   (self-contained: every name starts with pcl / PCL)
// Like the bullish engulfing, but the green candle does NOT fully engulf the red one. Two candles:
// (1) a red / bearish candle in a downtrend (sellers controlled the session), then (2) a green candle that opens at / below
// the red candle's close (often with a gap) and closes ABOVE the midpoint of the red candle's body (buyers regained the upper hand).
// BUY right after the second candle closes (the candle that is still forming is never used).
// Same small BUY button as the other candlestick tools. Hooks: STRATS.pcl + draw + recomputeExtras.
// =====================================================================================
try{
const PCL_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const PCL_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
function pclAtr(c,n){ const o=new Array(c.length).fill(0); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*(n-1)+tr)/n; o[i]=p; } return o; }
const pclCache={};
function pclRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.pclPen,Z.pclBear,Z.pclTol,Z.pclGap,Z.pclNoEng,Z.pclTrend,Z.pclLook,Z.pclAtr,Z.pclWait].join('|');
  const h=pclCache[Z.sid]; if(h&&h.k===key) return h.r;
  const pen=Math.min(1,Math.max(0.3,(Z.pclPen==null?50:+Z.pclPen)/100)), bb=Math.min(0.95,Math.max(0,(Z.pclBear==null?50:+Z.pclBear)/100)), tol=Math.max(0,(Z.pclTol==null?10:+Z.pclTol)/100), lb=Math.max(1,Math.round(Z.pclLook==null?5:Z.pclLook)),
    ma=Z.pclAtr==null?0:+Z.pclAtr, last=Z.pclWait===false?m:m-1, atr=ma>0?pclAtr(c,14):null, ev=[], sig=new Map();
  for(let i=1;i<last;i++){ const p=c[i-1], x=c[i], pr=p.high-p.low, rg=x.high-x.low, pb=p.open-p.close;
    if(!(rg>0)||!(pr>0)||!(pb>0)||!(x.close>x.open)) continue;                                      // red candle, then green candle
    if(pb<bb*pr) continue;                                                                           // the red candle is a real bearish candle (decent body)
    if(Z.pclTrend!==false){ if(i-1-lb<0||!(p.close<c[i-1-lb].close)) continue; }                    // red candle belongs to a downtrend
    if(x.open>p.close+tol*pr) continue;                                                              // opens at / below the previous close
    if(Z.pclGap===true&&!(x.open<p.low)) continue;                                                   // optional: true gap below the previous low
    if(!(x.close>p.close+pen*pb)) continue;                                                          // closes above the midpoint (50%) of the red body
    if(Z.pclNoEng!==false&&!(x.close<p.open)) continue;                                              // does not fully engulf (that would be a bullish engulfing)
    if(atr&&Math.abs(x.close-x.open)<ma*(atr[i-1]||atr[i])) continue;
    ev.push({i,s:1}); sig.set(i,1); }
  const r={ev,sig}; pclCache[Z.sid]={k:key,r}; return r; }
function pclDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=pclRun(c,Z); if(!r) return;
  const fs=PCL_FS[Z.pclSize]||7.5, lbl=Z.pclLbl!==false, box=Z.pclBox!==false, bt=PCL_BT[Z.pclBtnSz]||PCL_BT.Small, dist=Math.max(8,Math.round(Z.pclDist==null?40:Z.pclDist)),
    btB=Z.pclBtnBuy||'#2dd4a7', bxc=Z.pclBoxCol||'#2dd4a7';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  r.ev.slice(-Math.max(1,Math.round(Z.pclN)||300)).forEach(e=>{
    const p=c[e.i-1], bb=c[e.i], xt=X(e.i), xp=X(e.i-1); if(!bb||!p||xt==null||xt<-30||xt>W+30) return;
    const lo=Math.min(p.low,bb.low), hi=Math.max(p.high,bb.high), yLo=Y(lo), yHi=Y(hi); if(yLo==null||yHi==null) return;
    // outline around the two candles: red candle + the green candle that engulfs it
    if(box&&xp!=null){ const hw=Math.max(3,Math.abs(xt-xp)*0.5+2); cx.fillStyle=rgba(bxc,0.10); cx.strokeStyle=rgba(bxc,0.75); cx.lineWidth=1; rr(xp-hw+1,Math.min(yHi,yLo)-3,xt-xp+2*hw-2,Math.abs(yLo-yHi)+6,3); cx.fill(); cx.stroke(); }
    const y=Math.max(yLo,yHi)+(box?3:0), ty=y+dist, w=bt[0],h=bt[1],fz=bt[2], top=ty, col=btB;
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y+3); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y+3,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText('BUY',xt,top+h/2+.5);
    if(lbl){ cx.font=(fs-1)+'px system-ui'; cx.fillStyle='rgba(209,212,220,0.9)'; cx.fillText('piercing line',xt,top+h+fs); }
  });
  cx.globalAlpha=1; cx.restore(); }
STRATS.pcl={label:'Piercing Line \u00b7 red candle in a downtrend, then a green candle that opens below its close and closes above its midpoint = BUY',short:'Piercing Line',own:true,
  defs:{limit:false,useSl:false,short:false,pclPen:50,pclBear:50,pclTol:10,pclGap:false,pclNoEng:true,pclTrend:true,pclLook:5,pclAtr:0,pclWait:true,pclBox:true,pclLbl:true,pclDist:40,pclBtnSz:'Small',pclBtnBuy:'#2dd4a7',pclBoxCol:'#2dd4a7',pclN:300,pclSize:'Small',pclSig:true},
  inputs:(b,d)=>{
    fld(b,d,'pclPen','num','Green candle must close above this % of the red body (50 = midpoint)',{min:30,max:100,step:1});
    fld(b,d,'pclBear','num','Red candle body at least this % of its range (a real bearish candle)',{min:0,max:95,step:1});
    fld(b,d,'pclTol','num','Green candle opens at / below previous close (tolerance, % of previous range)',{min:0,max:100,step:1});
    fld(b,d,'pclGap','chk','Require a true gap: green candle opens below the previous low');
    fld(b,d,'pclNoEng','chk','Do not fully engulf (green close must stay below the red open)');
    fld(b,d,'pclTrend','chk','Red candle must be part of a downtrend'); fld(b,d,'pclLook','num','Downtrend look-back (price must be lower than this many bars ago)',{min:1,max:50,step:1});
    fld(b,d,'pclAtr','num','Ignore small green candles (body below x ATR, 0 = off)',{min:0,max:5,step:0.1});
    fld(b,d,'pclWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'pclBox','chk','Outline the two candles'); fld(b,d,'pclBoxCol','col','Outline colour');
    fld(b,d,'pclBtnSz','sel','BUY button size',{opts:['Tiny','Small','Normal']}); fld(b,d,'pclDist','num','Button distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'pclBtnBuy','col','BUY button colour'); fld(b,d,'pclLbl','chk','Show small note under the button');
    fld(b,d,'pclN','num','Signals shown on chart',{min:1,max:2000,step:10}); fld(b,d,'pclSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'pclSig','chk','BUY signals'); },
  sig:(c,i,n,Z)=>{ if(Z.pclSig===false||c.length<20) return 0; const r=pclRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.pcl='Strategy \u00b7 red candle in a downtrend, then a green candle that opens below its close and closes above its midpoint = BUY'; }catch(e){}
{ const _beD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='pclview') return pclDraw(d,X,Y,W,H); return _beD.apply(this,arguments); };
  const _beR=recomputeExtras; recomputeExtras=function(){ _beR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='pcl'&&stVis(Z)) scriptBoxes.push({type:'pclview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('pcl strategy failed',err); window.__pclErr=err; }

// =====================================================================================
// [tws] STRATEGY · "Three White Soldiers"   (self-contained: every name starts with tws / TWS)
// Three consecutive green candles, each closing higher than the last. The first closes within the previous red candle's range,
// the second closes above its open, the third closes above the second. Each candle has a longer body than the one before it
// (growing buying momentum). BUY right after the third candle closes (the candle that is still forming is never used).
// Same small BUY button as the other candlestick tools. Hooks: STRATS.tws + draw + recomputeExtras.
// =====================================================================================
try{
const TWS_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const TWS_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
function twsAtr(c,n){ const o=new Array(c.length).fill(0); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*(n-1)+tr)/n; o[i]=p; } return o; }
const twsCache={};
function twsRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.twsBear,Z.twsGrow,Z.twsOpen,Z.twsTol,Z.twsOne,Z.twsTrend,Z.twsLook,Z.twsAtr,Z.twsWait].join('|');
  const h=twsCache[Z.sid]; if(h&&h.k===key) return h.r;
  const tol=Math.max(0,(Z.twsTol==null?10:+Z.twsTol)/100), lb=Math.max(1,Math.round(Z.twsLook==null?5:Z.twsLook)), ma=Z.twsAtr==null?0:+Z.twsAtr, last=Z.twsWait===false?m:m-1, atr=ma>0?twsAtr(c,14):null, ev=[], sig=new Map();
  let ls=-99;
  for(let i=3;i<last;i++){ const a=c[i-3], x=c[i-2], y=c[i-1], z=c[i];
    if(!(x.close>x.open&&y.close>y.open&&z.close>z.open)) continue;                                  // three green candles
    if(!(y.close>x.close&&z.close>y.close)) continue;                                                // each closes higher than the last
    if(Z.twsBear!==false){ if(!(a.close<a.open)) continue; if(!(x.close>=a.low&&x.close<=a.high)) continue; }   // first closes within the previous red candle's range
    const bx=x.close-x.open, by=y.close-y.open, bz=z.close-z.open;
    if(Z.twsGrow!==false&&!(by>bx&&bz>by)) continue;                                                 // each body longer than the one before
    if(Z.twsOpen!==false){ if(!(y.open>=x.open&&y.open<=x.close+tol*(x.high-x.low))) continue; if(!(z.open>=y.open&&z.open<=y.close+tol*(y.high-y.low))) continue; }   // each opens inside the previous body
    if(Z.twsTrend===true){ if(i-3-lb<0||!(a.close<c[i-3-lb].close)) continue; }
    if(atr&&bz<ma*(atr[i-1]||atr[i])) continue;
    if(Z.twsOne!==false&&i-ls<3) continue;                                                           // one signal per run of soldiers
    ls=i; ev.push({i,s:1}); sig.set(i,1); }
  const r={ev,sig}; twsCache[Z.sid]={k:key,r}; return r; }
function twsDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=twsRun(c,Z); if(!r) return;
  const fs=TWS_FS[Z.twsSize]||7.5, lbl=Z.twsLbl!==false, box=Z.twsBox!==false, bt=TWS_BT[Z.twsBtnSz]||TWS_BT.Small, dist=Math.max(8,Math.round(Z.twsDist==null?40:Z.twsDist)),
    btB=Z.twsBtnBuy||'#2dd4a7', bxc=Z.twsBoxCol||'#2dd4a7';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  r.ev.slice(-Math.max(1,Math.round(Z.twsN)||300)).forEach(e=>{
    const p=c[e.i-2], q=c[e.i-1], bb=c[e.i], xt=X(e.i), xp=X(e.i-2); if(!bb||!p||xt==null||xt<-30||xt>W+30) return;
    const lo=Math.min(p.low,q.low,bb.low), hi=Math.max(p.high,q.high,bb.high), yLo=Y(lo), yHi=Y(hi); if(yLo==null||yHi==null) return;
    // outline around the three green candles
    if(box&&xp!=null){ const hw=Math.max(3,Math.abs(xt-xp)*0.25+2); cx.fillStyle=rgba(bxc,0.10); cx.strokeStyle=rgba(bxc,0.75); cx.lineWidth=1; rr(xp-hw+1,Math.min(yHi,yLo)-3,xt-xp+2*hw-2,Math.abs(yLo-yHi)+6,3); cx.fill(); cx.stroke(); }
    const y=Math.max(yLo,yHi)+(box?3:0), ty=y+dist, w=bt[0],h=bt[1],fz=bt[2], top=ty, col=btB;
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y+3); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y+3,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText('BUY',xt,top+h/2+.5);
    if(lbl){ cx.font=(fs-1)+'px system-ui'; cx.fillStyle='rgba(209,212,220,0.9)'; cx.fillText('three white soldiers',xt,top+h+fs); }
  });
  cx.globalAlpha=1; cx.restore(); }
STRATS.tws={label:'Three White Soldiers (rare) \u00b7 three green candles, each closing higher with a longer body than the one before = BUY',short:'Three White Soldiers (rare)',own:true,
  defs:{limit:false,useSl:false,short:false,twsBear:true,twsGrow:false,twsOpen:true,twsTol:10,twsOne:true,twsTrend:false,twsLook:5,twsAtr:0,twsWait:true,twsBox:true,twsLbl:true,twsDist:40,twsBtnSz:'Small',twsBtnBuy:'#2dd4a7',twsBoxCol:'#2dd4a7',twsN:300,twsSize:'Small',twsSig:true},
  inputs:(b,d)=>{
    fld(b,d,'twsBear','chk','Candle before must be red, and the first green candle closes within its range');
    fld(b,d,'twsGrow','chk','Each body longer than the one before');
    fld(b,d,'twsOpen','chk','Each green candle opens inside the previous green body'); fld(b,d,'twsTol','num','Open tolerance above the previous close (% of previous range)',{min:0,max:100,step:1});
    fld(b,d,'twsOne','chk','One signal per run (no repeat while the soldiers keep marching)');
    fld(b,d,'twsTrend','chk','Also require a downtrend before the pattern'); fld(b,d,'twsLook','num','Downtrend look-back (price must be lower than this many bars ago)',{min:1,max:50,step:1});
    fld(b,d,'twsAtr','num','Ignore small candles (third body below x ATR, 0 = off)',{min:0,max:5,step:0.1});
    fld(b,d,'twsWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'twsBox','chk','Outline the three candles'); fld(b,d,'twsBoxCol','col','Outline colour');
    fld(b,d,'twsBtnSz','sel','BUY button size',{opts:['Tiny','Small','Normal']}); fld(b,d,'twsDist','num','Button distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'twsBtnBuy','col','BUY button colour'); fld(b,d,'twsLbl','chk','Show small note under the button');
    fld(b,d,'twsN','num','Signals shown on chart',{min:1,max:2000,step:10}); fld(b,d,'twsSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'twsSig','chk','BUY signals'); },
  sig:(c,i,n,Z)=>{ if(Z.twsSig===false||c.length<20) return 0; const r=twsRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.tws='Strategy \u00b7 three green candles, each closing higher with a longer body than the one before = BUY'; }catch(e){}
{ const _beD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='twsview') return twsDraw(d,X,Y,W,H); return _beD.apply(this,arguments); };
  const _beR=recomputeExtras; recomputeExtras=function(){ _beR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='tws'&&stVis(Z)) scriptBoxes.push({type:'twsview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('tws strategy failed',err); window.__twsErr=err; }

// =====================================================================================
// [mst] STRATEGY · "Morning Star"   (self-contained: every name starts with mst / MST)
// Three-candle reversal: (1) a LONG red candle, (2) a small doji / spinning top that gaps away from both neighbours
// (indecision), (3) a LONG green candle that closes well into the first candle's body (buyers took control).
// BUY right after the third candle closes (the candle that is still forming is never used).
// Same small BUY button as the other candlestick tools. Hooks: STRATS.mst + draw + recomputeExtras.
// =====================================================================================
try{
const MST_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const MST_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
function mstAtr(c,n){ const o=new Array(c.length).fill(0); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*(n-1)+tr)/n; o[i]=p; } return o; }
const mstCache={};
function mstRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.mstBody,Z.mstAtr,Z.mstSmall,Z.mstGap,Z.mstTol,Z.mstPen,Z.mstTrend,Z.mstLook,Z.mstWait].join('|');
  const h=mstCache[Z.sid]; if(h&&h.k===key) return h.r;
  const bp=Math.min(0.95,Math.max(0,(Z.mstBody==null?60:+Z.mstBody)/100)), bm=Z.mstAtr==null?1:+Z.mstAtr, sm=Math.min(1,Math.max(0.02,(Z.mstSmall==null?35:+Z.mstSmall)/100)), tol=Math.max(0,(Z.mstTol==null?10:+Z.mstTol)/100),
    pen=Math.min(1,Math.max(0.1,(Z.mstPen==null?50:+Z.mstPen)/100)), lb=Math.max(1,Math.round(Z.mstLook==null?5:Z.mstLook)), gp=Z.mstGap||'Body gap (tolerance)', last=Z.mstWait===false?m:m-1, atr=bm>0?mstAtr(c,14):null, ev=[], sig=new Map();
  for(let i=2;i<last;i++){ const a=c[i-2], b=c[i-1], x=c[i], ar=a.high-a.low, xr=x.high-x.low, ab=a.open-a.close, xb=x.close-x.open;
    if(!(ar>0)||!(xr>0)||!(ab>0)||!(xb>0)) continue;                                                 // red candle first, green candle last
    if(ab<bp*ar||xb<bp*xr) continue;                                                                 // both are long (strong body)
    if(atr&&(ab<bm*(atr[i-3]||atr[i-2])||xb<bm*(atr[i-1]||atr[i]))) continue;                       // long compared with the average candle
    const bb=Math.abs(b.close-b.open), bt=Math.max(b.open,b.close);
    if(bb>sm*ab) continue;                                                                           // middle candle: small doji / spinning top
    if(gp==='True gap'){ if(!(b.high<a.low)||!(x.low>b.high)) continue; }                            // real gap on both sides
    else if(gp!=='No gap required'){ if(bt>a.close+tol*ar) continue; if(x.open<bt-tol*ar) continue; }   // middle body sits at / below the first close, third opens at / above the middle body
    if(!(x.close>a.close+pen*ab)) continue;                                                          // third closes well into the first body (50% = midpoint)
    if(Z.mstTrend!==false){ if(i-2-lb<0||!(a.close<c[i-2-lb].close)) continue; }                    // after a downtrend
    ev.push({i,s:1}); sig.set(i,1); }
  const r={ev,sig}; mstCache[Z.sid]={k:key,r}; return r; }
function mstDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=mstRun(c,Z); if(!r) return;
  const fs=MST_FS[Z.mstSize]||7.5, lbl=Z.mstLbl!==false, box=Z.mstBox!==false, bt=MST_BT[Z.mstBtnSz]||MST_BT.Small, dist=Math.max(8,Math.round(Z.mstDist==null?40:Z.mstDist)),
    btB=Z.mstBtnBuy||'#2dd4a7', bxc=Z.mstBoxCol||'#2dd4a7';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  r.ev.slice(-Math.max(1,Math.round(Z.mstN)||300)).forEach(e=>{
    const p=c[e.i-2], q=c[e.i-1], bb=c[e.i], xt=X(e.i), xp=X(e.i-2); if(!bb||!p||xt==null||xt<-30||xt>W+30) return;
    const lo=Math.min(p.low,q.low,bb.low), hi=Math.max(p.high,q.high,bb.high), yLo=Y(lo), yHi=Y(hi); if(yLo==null||yHi==null) return;
    // outline around the three candles
    if(box&&xp!=null){ const hw=Math.max(3,Math.abs(xt-xp)*0.25+2); cx.fillStyle=rgba(bxc,0.10); cx.strokeStyle=rgba(bxc,0.75); cx.lineWidth=1; rr(xp-hw+1,Math.min(yHi,yLo)-3,xt-xp+2*hw-2,Math.abs(yLo-yHi)+6,3); cx.fill(); cx.stroke(); }
    const y=Math.max(yLo,yHi)+(box?3:0), ty=y+dist, w=bt[0],h=bt[1],fz=bt[2], top=ty, col=btB;
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y+3); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y+3,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText('BUY',xt,top+h/2+.5);
    if(lbl){ cx.font=(fs-1)+'px system-ui'; cx.fillStyle='rgba(209,212,220,0.9)'; cx.fillText('morning star',xt,top+h+fs); }
  });
  cx.globalAlpha=1; cx.restore(); }
STRATS.mst={label:'Morning Star \u00b7 long red candle, small doji / spinning top that gaps away, long green candle = BUY',short:'Morning Star',own:true,
  defs:{limit:false,useSl:false,short:false,mstBody:60,mstAtr:1,mstSmall:35,mstGap:'Body gap (tolerance)',mstTol:10,mstPen:50,mstTrend:true,mstLook:5,mstWait:true,mstBox:true,mstLbl:true,mstDist:40,mstBtnSz:'Small',mstBtnBuy:'#2dd4a7',mstBoxCol:'#2dd4a7',mstN:300,mstSize:'Small',mstSig:true},
  inputs:(b,d)=>{
    fld(b,d,'mstBody','num','First and third candle body at least this % of their range (long candles)',{min:0,max:95,step:1});
    fld(b,d,'mstAtr','num','First and third body at least x ATR (long vs normal candles, 0 = off)',{min:0,max:5,step:0.1});
    fld(b,d,'mstSmall','num','Middle candle body at most this % of the first body (doji / spinning top)',{min:2,max:100,step:1});
    fld(b,d,'mstGap','sel','Gap rule for the middle candle',{opts:['Body gap (tolerance)','True gap','No gap required']});
    fld(b,d,'mstTol','num','Body gap tolerance (% of first candle range)',{min:0,max:100,step:1});
    fld(b,d,'mstPen','num','Third candle must close above this % of the first body (50 = midpoint)',{min:10,max:100,step:1});
    fld(b,d,'mstTrend','chk','Must come after a downtrend'); fld(b,d,'mstLook','num','Downtrend look-back (price must be lower than this many bars ago)',{min:1,max:50,step:1});
    fld(b,d,'mstWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'mstBox','chk','Outline the three candles'); fld(b,d,'mstBoxCol','col','Outline colour');
    fld(b,d,'mstBtnSz','sel','BUY button size',{opts:['Tiny','Small','Normal']}); fld(b,d,'mstDist','num','Button distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'mstBtnBuy','col','BUY button colour'); fld(b,d,'mstLbl','chk','Show small note under the button');
    fld(b,d,'mstN','num','Signals shown on chart',{min:1,max:2000,step:10}); fld(b,d,'mstSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'mstSig','chk','BUY signals'); },
  sig:(c,i,n,Z)=>{ if(Z.mstSig===false||c.length<20) return 0; const r=mstRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.mst='Strategy \u00b7 long red candle, small doji / spinning top that gaps away, long green candle = BUY'; }catch(e){}
{ const _beD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='mstview') return mstDraw(d,X,Y,W,H); return _beD.apply(this,arguments); };
  const _beR=recomputeExtras; recomputeExtras=function(){ _beR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='mst'&&stVis(Z)) scriptBoxes.push({type:'mstview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('mst strategy failed',err); window.__mstErr=err; }

// =====================================================================================
// [ber] STRATEGY · "Bearish Engulfing"   (self-contained: every name starts with ber / BER)
// Bearish mirror of the Bullish Engulfing. Two candles: (1) a green candle (part of an uptrend), immediately followed by
// (2) a larger red candle that fully engulfs it: sellers take control from the open (it opens at / above the previous close)
// and it closes below the green candle's body. Minimal upper / lower wick on the red candle strengthens the signal.
// SELL right after the engulfing candle closes (the candle that is still forming is never used).
// Small SELL button ABOVE the candles. Hooks: STRATS.ber + draw + recomputeExtras.
// =====================================================================================
try{
const BER_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const BER_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
function berAtr(c,n){ const o=new Array(c.length).fill(0); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*(n-1)+tr)/n; o[i]=p; } return o; }
const berCache={};
function berRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.berMode,Z.berWick,Z.berTol,Z.berTrend,Z.berLook,Z.berAtr,Z.berWait].join('|');
  const h=berCache[Z.sid]; if(h&&h.k===key) return h.r;
  const wk=Math.min(0.5,Math.max(0,(Z.berWick==null?10:+Z.berWick)/100)), tol=Math.max(0,(Z.berTol==null?10:+Z.berTol)/100), lb=Math.max(1,Math.round(Z.berLook==null?5:Z.berLook)),
    ma=Z.berAtr==null?0:+Z.berAtr, md=Z.berMode||'Body engulfs body', last=Z.berWait===false?m:m-1, atr=ma>0?berAtr(c,14):null, ev=[], sig=new Map();
  for(let i=1;i<last;i++){ const p=c[i-1], x=c[i], rg=x.high-x.low, pr=p.high-p.low;
    if(!(rg>0)||!(p.close>p.open)||!(x.close<x.open)) continue;                                      // green candle, then red candle
    if(Z.berTrend!==false){ if(i-1-lb<0||!(p.close>c[i-1-lb].close)) continue; }                    // green candle belongs to an uptrend
    if(x.open<p.close-tol*pr) continue;                                                              // sellers start at the previous close (or higher)
    if(md==='Close below previous low'){ if(!(x.close<p.low)) continue; }
    else if(md==='Body engulfs body'){ if(!(x.close<=p.open)) continue; }
    else { if(!(x.close<=p.open&&x.high>=p.high&&x.low<=p.low)) continue; }                          // full range engulfs
    const uw=x.high-x.open, lw=x.close-x.low; if(uw>wk*rg||lw>wk*rg) continue;                       // minimal upper / lower wick
    if(atr&&Math.abs(x.close-x.open)<ma*(atr[i-1]||atr[i])) continue;
    ev.push({i,s:-1}); sig.set(i,-1); }
  const r={ev,sig}; berCache[Z.sid]={k:key,r}; return r; }
function berDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=berRun(c,Z); if(!r) return;
  const fs=BER_FS[Z.berSize]||7.5, lbl=Z.berLbl!==false, box=Z.berBox!==false, bt=BER_BT[Z.berBtnSz]||BER_BT.Small, dist=Math.max(8,Math.round(Z.berDist==null?40:Z.berDist)),
    btS=Z.berBtnSell||'#ff5d7a', bxc=Z.berBoxCol||'#ff5d7a';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  r.ev.slice(-Math.max(1,Math.round(Z.berN)||300)).forEach(e=>{
    const p=c[e.i-1], bb=c[e.i], xt=X(e.i), xp=X(e.i-1); if(!bb||!p||xt==null||xt<-30||xt>W+30) return;
    const lo=Math.min(p.low,bb.low), hi=Math.max(p.high,bb.high), yLo=Y(lo), yHi=Y(hi); if(yLo==null||yHi==null) return;
    // outline around the two candles: green candle + the red candle that engulfs it
    if(box&&xp!=null){ const hw=Math.max(3,Math.abs(xt-xp)*0.5+2); cx.fillStyle=rgba(bxc,0.10); cx.strokeStyle=rgba(bxc,0.75); cx.lineWidth=1; rr(xp-hw+1,Math.min(yHi,yLo)-3,xt-xp+2*hw-2,Math.abs(yLo-yHi)+6,3); cx.fill(); cx.stroke(); }
    // SELL button above the candles, joined by a dotted line
    const y=Math.min(yLo,yHi)-(box?3:0), w=bt[0],h=bt[1],fz=bt[2], ty=y-dist, top=ty-h, col=btS;
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y-3); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y-3,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText('SELL',xt,top+h/2+.5);
    if(lbl){ cx.font=(fs-1)+'px system-ui'; cx.fillStyle='rgba(209,212,220,0.9)'; cx.fillText('bearish engulfing',xt,top-fs+1); }
  });
  cx.globalAlpha=1; cx.restore(); }
STRATS.ber={label:'Bearish Engulfing \u00b7 green candle in an uptrend, then a larger red candle that engulfs it with no wick = SELL',short:'Bearish Engulfing',own:true,
  defs:{limit:false,useSl:false,long:true,short:true,berMode:'Body engulfs body',berTrend:true,berLook:5,berTol:10,berWick:10,berAtr:0,berWait:true,berBox:true,berLbl:true,berDist:40,berBtnSz:'Small',berBtnSell:'#ff5d7a',berBoxCol:'#ff5d7a',berN:300,berSize:'Small',berSig:true},
  inputs:(b,d)=>{
    fld(b,d,'berMode','sel','Engulfing rule',{opts:['Body engulfs body','Close below previous low','Full range engulfs']});
    fld(b,d,'berTrend','chk','Green candle must be part of an uptrend'); fld(b,d,'berLook','num','Uptrend look-back (price must be higher than this many bars ago)',{min:1,max:50,step:1});
    fld(b,d,'berTol','num','Red candle opens at / above previous close (tolerance, % of previous range)',{min:0,max:100,step:1});
    fld(b,d,'berWick','num','Max upper / lower wick on the red candle (% of its range, 0 = no wick at all)',{min:0,max:50,step:1});
    fld(b,d,'berAtr','num','Ignore small red candles (body below x ATR, 0 = off)',{min:0,max:5,step:0.1});
    fld(b,d,'berWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'berBox','chk','Outline the two candles'); fld(b,d,'berBoxCol','col','Outline colour');
    fld(b,d,'berBtnSz','sel','SELL button size',{opts:['Tiny','Small','Normal']}); fld(b,d,'berDist','num','Button distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'berBtnSell','col','SELL button colour'); fld(b,d,'berLbl','chk','Show small note above the button');
    fld(b,d,'berN','num','Signals shown on chart',{min:1,max:2000,step:10}); fld(b,d,'berSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'berSig','chk','SELL signals'); },
  sig:(c,i,n,Z)=>{ if(Z.berSig===false||c.length<20) return 0; const r=berRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.ber='Strategy \u00b7 green candle in an uptrend, then a larger red candle that engulfs it, minimal wick = SELL'; }catch(e){}
{ const _beD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='berview') return berDraw(d,X,Y,W,H); return _beD.apply(this,arguments); };
  const _beR=recomputeExtras; recomputeExtras=function(){ _beR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='ber'&&stVis(Z)) scriptBoxes.push({type:'berview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('ber strategy failed',err); window.__berErr=err; }

// =====================================================================================
// [rtm] STRATEGY · "Rising Three Methods"   (self-contained: every name starts with rtm / RTM)
// Bullish continuation, five candles: (1) a LONG green candle, (2-4) three smaller RED candles that stay inside the first
// candle's range (sellers try a retracement but lack the strength to follow through), (5) another LONG green candle
// that closes above the first candle's close (buyers push the uptrend on). BUY right after the fifth candle closes
// (the candle that is still forming is never used). Same small BUY button as the other candlestick tools.
// Hooks: STRATS.rtm + draw + recomputeExtras.
// =====================================================================================
try{
const RTM_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const RTM_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
function rtmAtr(c,n){ const o=new Array(c.length).fill(0); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*(n-1)+tr)/n; o[i]=p; } return o; }
const rtmCache={};
function rtmRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.rtmBody,Z.rtmAtr,Z.rtmSmall,Z.rtmBreak,Z.rtmTrend,Z.rtmLook,Z.rtmWait].join('|');
  const h=rtmCache[Z.sid]; if(h&&h.k===key) return h.r;
  const bp=Math.min(0.95,Math.max(0,(Z.rtmBody==null?60:+Z.rtmBody)/100)), bm=Z.rtmAtr==null?0.8:+Z.rtmAtr, sm=Math.min(1.5,Math.max(0.05,(Z.rtmSmall==null?60:+Z.rtmSmall)/100)),
    lb=Math.max(1,Math.round(Z.rtmLook==null?5:Z.rtmLook)), last=Z.rtmWait===false?m:m-1, atr=bm>0?rtmAtr(c,14):null, ev=[], sig=new Map();
  for(let i=4;i<last;i++){ const a=c[i-4], x=c[i], ar=a.high-a.low, xr=x.high-x.low, ab=a.close-a.open, xb=x.close-x.open;
    if(!(ar>0)||!(xr>0)||!(ab>0)||!(xb>0)) continue;                                                 // green candle first, green candle last
    if(ab<bp*ar||xb<bp*xr) continue;                                                                 // both are long (strong body)
    if(atr&&(ab<bm*(atr[i-5]||atr[i-4])||xb<bm*(atr[i-1]||atr[i]))) continue;                       // long compared with the average candle
    let ok=true; for(let k=i-3;k<=i-1;k++){ const q=c[k]; if(!(q.close<q.open)||q.high>a.high||q.low<a.low||(q.open-q.close)>sm*ab){ ok=false; break; } }   // three smaller red candles inside the first candle's range
    if(!ok) continue;
    if(Z.rtmBreak!==false&&!(x.close>a.close)) continue;                                             // the last candle closes above the first close
    if(Z.rtmTrend===true){ if(i-4-lb<0||!(a.close>c[i-4-lb].close)) continue; }                     // optional: uptrend before the pattern
    ev.push({i,s:1}); sig.set(i,1); }
  const r={ev,sig}; rtmCache[Z.sid]={k:key,r}; return r; }
function rtmDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=rtmRun(c,Z); if(!r) return;
  const fs=RTM_FS[Z.rtmSize]||7.5, lbl=Z.rtmLbl!==false, box=Z.rtmBox!==false, bt=RTM_BT[Z.rtmBtnSz]||RTM_BT.Small, dist=Math.max(8,Math.round(Z.rtmDist==null?40:Z.rtmDist)),
    btB=Z.rtmBtnBuy||'#2dd4a7', bxc=Z.rtmBoxCol||'#2dd4a7';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  r.ev.slice(-Math.max(1,Math.round(Z.rtmN)||300)).forEach(e=>{
    const p=c[e.i-4], bb=c[e.i], xt=X(e.i), xp=X(e.i-4); if(!bb||!p||xt==null||xt<-30||xt>W+30) return;
    let lo=1e18, hi=-1e18; for(let k=e.i-4;k<=e.i;k++){ lo=Math.min(lo,c[k].low); hi=Math.max(hi,c[k].high); } const yLo=Y(lo), yHi=Y(hi); if(yLo==null||yHi==null) return;
    // outline around the five candles
    if(box&&xp!=null){ const hw=Math.max(3,Math.abs(xt-xp)*0.125+2); cx.fillStyle=rgba(bxc,0.10); cx.strokeStyle=rgba(bxc,0.75); cx.lineWidth=1; rr(xp-hw+1,Math.min(yHi,yLo)-3,xt-xp+2*hw-2,Math.abs(yLo-yHi)+6,3); cx.fill(); cx.stroke(); }
    const y=Math.max(yLo,yHi)+(box?3:0), ty=y+dist, w=bt[0],h=bt[1],fz=bt[2], top=ty, col=btB;
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y+3); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y+3,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText('BUY',xt,top+h/2+.5);
    if(lbl){ cx.font=(fs-1)+'px system-ui'; cx.fillStyle='rgba(209,212,220,0.9)'; cx.fillText('rising three methods',xt,top+h+fs); }
  });
  cx.globalAlpha=1; cx.restore(); }
STRATS.rtm={label:'Rising Three Methods \u00b7 long green candle, three smaller red candles inside its range, then another long green candle = BUY',short:'Rising Three Methods',own:true,
  defs:{limit:false,useSl:false,short:false,rtmBody:60,rtmAtr:0.8,rtmSmall:60,rtmBreak:true,rtmTrend:false,rtmLook:5,rtmWait:true,rtmBox:true,rtmLbl:true,rtmDist:40,rtmBtnSz:'Small',rtmBtnBuy:'#2dd4a7',rtmBoxCol:'#2dd4a7',rtmN:300,rtmSize:'Small',rtmSig:true},
  inputs:(b,d)=>{
    fld(b,d,'rtmBody','num','First and last candle body at least this % of their range (long candles)',{min:0,max:95,step:1});
    fld(b,d,'rtmAtr','num','First and last body at least x ATR (long vs normal candles, 0 = off)',{min:0,max:5,step:0.1});
    fld(b,d,'rtmSmall','num','Each red candle body at most this % of the first body (smaller candles)',{min:5,max:150,step:5});
    fld(b,d,'rtmBreak','chk','Last green candle must close above the first candle close');
    fld(b,d,'rtmTrend','chk','Also require an uptrend before the pattern'); fld(b,d,'rtmLook','num','Uptrend look-back (price must be higher than this many bars ago)',{min:1,max:50,step:1});
    fld(b,d,'rtmWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'rtmBox','chk','Outline the five candles'); fld(b,d,'rtmBoxCol','col','Outline colour');
    fld(b,d,'rtmBtnSz','sel','BUY button size',{opts:['Tiny','Small','Normal']}); fld(b,d,'rtmDist','num','Button distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'rtmBtnBuy','col','BUY button colour'); fld(b,d,'rtmLbl','chk','Show small note under the button');
    fld(b,d,'rtmN','num','Signals shown on chart',{min:1,max:2000,step:10}); fld(b,d,'rtmSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'rtmSig','chk','BUY signals'); },
  sig:(c,i,n,Z)=>{ if(Z.rtmSig===false||c.length<20) return 0; const r=rtmRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.rtm='Strategy \u00b7 long green candle, three smaller red candles inside its range, then another long green candle = BUY'; }catch(e){}
{ const _beD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='rtmview') return rtmDraw(d,X,Y,W,H); return _beD.apply(this,arguments); };
  const _beR=recomputeExtras; recomputeExtras=function(){ _beR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='rtm'&&stVis(Z)) scriptBoxes.push({type:'rtmview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('rtm strategy failed',err); window.__rtmErr=err; }

// =====================================================================================
// [ccp] STRATEGY · "Candlestick Counter Premium"   (self-contained: every name starts with ccp / CCP)
// Counts consecutive bearish / bullish candles. A run that reaches the minimum QUALIFIES the setup; the setup then waits
// (indefinitely by default) until the first OPPOSITE candle CLOSES -> one BUY (after bearish run) / one SELL (after bullish run)
// on that confirming candle. The maximum is only the initial range: a run longer than the maximum stays qualified.
// A doji (close = open) is neither colour: it resets an unqualified count but never cancels a qualified setup and never signals.
// Only closed candles are used (the forming candle is ignored), so signals never move or repaint.
// Hooks: STRATS.ccp + draw + recomputeExtras.
// =====================================================================================
try{
try{ const A=window.mpvAuth; if(A&&typeof A.lockStrat==='function'&&!A.__ccpMetal){ A.__ccpMetal=true; const _ls=A.lockStrat.bind(A);   // Candlestick Pro Plus Counter Premium is a METAL-plan strategy
  const METAL={ccp:'Candlestick Pro Plus Counter Premium',mru:'Fast Future Sniper Pro Plus'}; A.lockStrat=function(k,quiet,name){ if(METAL[k]&&typeof A.can==='function'&&!A.can('metal')){ if(!quiet){ try{ toast(METAL[k]+' needs the Metal plan','#ff5d7a'); }catch(e){} try{ if(window.mpvOpenUnlock) window.mpvOpenUnlock('Metal'); }catch(e){} } return true; } return _ls(k,quiet,name); }; } }catch(e){ console.error('ccp metal gate',e); }
const CCP_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const CCP_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
const ccpCache={};
function ccpRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.ccpBMin,Z.ccpBMax,Z.ccpSMin,Z.ccpSMax,Z.ccpBuy,Z.ccpSell,Z.ccpDoji,Z.ccpExp,Z.ccpWait,Z.ccpBConf,Z.ccpSConf,Z.ccpBGap,Z.ccpSGap,Z.ccpBigOn,Z.ccpBigX,Z.ccpBigLen,Z.ccpBigPct,Z.ccpSmallRst,Z.ccpVolOn,Z.ccpVolX,Z.ccpVolLen,Z.ccpWkOn,Z.ccpWkMin,Z.ccpScOn,Z.ccpScMin,Z.ccpRecOn,Z.ccpRecMin,Z.ccpRpOn,Z.ccpRpPct,Z.ccpSpOn,Z.ccpSpX,Z.ccpSpLen,Z.ccpLocOn,Z.ccpLocLen,Z.ccpLocPct,Z.ccpSesOn,Z.ccpSesFrom,Z.ccpSesTo].join('|');
  const h=ccpCache[Z.sid]; if(h&&h.k===key) return h.r;
  const iv=(v,d)=>{ v=Math.round(+v); return isFinite(v)&&v>=2?Math.min(50,v):d; };            // validate: whole number 2..50
  const bMin=iv(Z.ccpBMin,4), bMax=Math.max(bMin,iv(Z.ccpBMax,8)), sMin=iv(Z.ccpSMin,4), sMax=Math.max(sMin,iv(Z.ccpSMax,8));   // max can never be below min
  const keep=Z.ccpDoji!==false, exp=Math.max(0,Math.round(Z.ccpExp==null?0:Z.ccpExp)), wantB=Z.ccpBuy!==false, wantS=Z.ccpSell!==false;
  const cf=v=>{ v=Math.round(+v); return isFinite(v)&&v>=1?Math.min(1000,v):1; }, bConf=cf(Z.ccpBConf), sConf=cf(Z.ccpSConf);   // 1 = classic (signal on the first opposite candle); 2 or more (any number) = signal on the Nth opposite candle, yellow PREPARE dot before it
  const last=Z.ccpWait===false?m:m-1, cnt=new Array(m).fill(0), dir=new Array(m).fill(0), ev=[], prep=[], sig=new Map();
  const gp=v=>{ v=Math.round(+v); return isFinite(v)&&v>0?Math.min(5000,v):0; }, bGap=gp(Z.ccpBGap), sGap=gp(Z.ccpSGap);   // optional cooldown: minimum candles since the previous SHOWN signal of the same side (0 = off)
  // optional BIG-candle filter: a candle is BIG when its body >= X times the average body of the previous N candles (and, optionally, >= a minimum body % of price). Small candles = noise / manipulation.
  const bm=Z.ccpBigOn||'Off', fRun=bm==='Run + confirm'||bm==='Run only', fConf=bm==='Run + confirm'||bm==='Confirm only', rstSmall=Z.ccpSmallRst===true;
  const bx=+Z.ccpBigX>0?+Z.ccpBigX:1, bl=Math.max(3,Math.min(500,Math.round(+Z.ccpBigLen)||20)), bp=Math.max(0,+Z.ccpBigPct||0), big=new Array(m).fill(true);
  if(fRun||fConf){ let sm=0; for(let i=0;i<m;i++){ const bd=Math.abs(c[i].close-c[i].open), n=Math.min(i,bl), av=n>0?sm/n:bd; big[i]=i<3||(bd>=bx*av&&(!bp||bd/(c[i].close||1)*100>=bp)); sm+=bd; if(i>=bl) sm-=Math.abs(c[i-bl].close-c[i-bl].open); } }
  // optional VOLUME confirmation: the confirming candle needs volume >= X times the average of the previous N candles (thin-volume moves are often manipulation); skipped when the data has no volume
  const vOn=Z.ccpVolOn===true, vx=+Z.ccpVolX>0?+Z.ccpVolX:1.2, vl=Math.max(3,Math.min(500,Math.round(+Z.ccpVolLen)||20)), lowV=new Array(m).fill(false);
  if(vOn){ let sv=0; for(let i=0;i<m;i++){ const v=+c[i].volume||0, n=Math.min(i,vl), av=n>0?sv/n:0; lowV[i]=i>=3&&av>0&&v<vx*av; sv+=v; if(i>=vl) sv-=(+c[i-vl].volume||0); } }
  // optional WICK filter (body must be >= X% of the candle's full high-low height) and STRONG-CLOSE filter (BUY candle closes in its top X%, SELL candle in its bottom X%): a confirming candle that fails is ignored
  const wkOn=Z.ccpWkOn===true, wkMin=Math.max(1,Math.min(100,+Z.ccpWkMin||60)), scOn=Z.ccpScOn===true, scMin=Math.max(1,Math.min(100,+Z.ccpScMin||70)), weakC=new Array(m).fill(false);
  if(wkOn||scOn){ for(let i=0;i<m;i++){ const x=c[i], rg=x.high-x.low; if(!(rg>0)) continue; const bd=Math.abs(x.close-x.open), up=x.close>x.open;
    if(wkOn&&bd/rg*100<wkMin) weakC[i]=true; if(scOn&&((up&&(x.close-x.low)/rg*100<scMin)||(!up&&x.close<x.open&&(x.high-x.close)/rg*100<scMin))) weakC[i]=true; } }
  // optional SPIKE filter (a candle whose high-low range is more than X times the average range = news spike / stop hunt: ignored completely), RUN-SIZE filter (the run must move at least X% of price to qualify)
  // and RECOVERY filter (a confirming candle must win back at least X% of the run's move)
  const spOn=Z.ccpSpOn===true, spx=+Z.ccpSpX>0?+Z.ccpSpX:3, spl=Math.max(3,Math.min(500,Math.round(+Z.ccpSpLen)||20)), spk=new Array(m).fill(false);
  if(spOn){ let sr=0; for(let i=0;i<m;i++){ const rg=c[i].high-c[i].low, n=Math.min(i,spl), av=n>0?sr/n:0; spk[i]=i>=3&&av>0&&rg>spx*av; sr+=rg; if(i>=spl) sr-=(c[i-spl].high-c[i-spl].low); } }
  const rpOn=Z.ccpRpOn===true, rpPct=Math.max(0,+Z.ccpRpPct||0), recOn=Z.ccpRecOn===true, recMin=Math.max(0,Math.min(200,+Z.ccpRecMin||0));
  // optional LOCATION filter (BUY only in the lower part of the recent range, SELL only in the upper part) and SESSION filter (confirming candles are ignored during the hours you block, device local time)
  const locOn=Z.ccpLocOn===true, locLen=Math.max(5,Math.min(2000,Math.round(+Z.ccpLocLen)||100)), locPct=Math.max(1,Math.min(99,+Z.ccpLocPct||40)), pos=new Array(m).fill(50);
  if(locOn){ for(let i=0;i<m;i++){ let hi=-1e18, lo=1e18; for(let j=Math.max(0,i-locLen+1);j<=i;j++){ if(c[j].high>hi) hi=c[j].high; if(c[j].low<lo) lo=c[j].low; } pos[i]=hi>lo?(c[i].close-lo)/(hi-lo)*100:50; } }
  const sesOn=Z.ccpSesOn===true, sF=Math.max(0,Math.min(23,Math.round(+Z.ccpSesFrom||0))), sT=Math.max(0,Math.min(24,Math.round(Z.ccpSesTo==null?6:+Z.ccpSesTo))), sesBad=new Array(m).fill(false);
  if(sesOn&&sF!==sT){ for(let i=0;i<m;i++){ const h=new Date(c[i].time*1000).getHours(); sesBad[i]=sF<sT?(h>=sF&&h<sT):(h>=sF||h<sT); } }
  let bRS=0,bRL=0,sRS=0,sRH=0,bSS=0,bSL=0,sSS=0,sSH=0;   // run start / extreme (unfinished run) and setup start / extreme (qualified setup)
  let bear=0, bull=0, bQ=false, sQ=false, bQi=-1, sQi=-1, bG=0, sG=0, lastB=-1e9, lastS=-1e9;
  for(let i=0;i<last;i++){ const x=c[i], up=x.close>x.open, dn=x.close<x.open, runSm=(fRun&&!big[i])||spk[i], confSm=(fConf&&!big[i])||lowV[i]||weakC[i]||spk[i]||sesBad[i];
    if(exp>0){ if(bQ&&i-bQi>exp){ bQ=false; bear=0; } if(sQ&&i-sQi>exp){ sQ=false; bull=0; } }   // optional expiry (off by default)
    if(dn){                                                       // bearish candle closed
      const recS=(recOn&&sQ&&(sSH-sSS)>0&&((sSH-x.close)/(sSH-sSS)*100<recMin))||(locOn&&pos[i]<100-locPct);
      if(sQ&&!confSm&&!recS){ sG++; if(sG>=sConf){ if(wantS&&i-lastS>=sGap){ ev.push({i,s:-1}); sig.set(i,-1); lastS=i; } sQ=false; sG=0; } else if(wantS&&sG===1) prep.push({i,s:-1}); }   // Nth bearish candle closed -> one SELL (earlier ones = yellow prepare dot; candles of the other colour in between are allowed)
      if(runSm){ if(rstSmall&&!spk[i]){ if(!bQ||!keep){ bQ=false; bear=0; } if(!sQ||!keep){ sQ=false; bull=0; } } }   // small candle: ignored (or resets an unfinished run)
      else { if(bear===0){ bRS=x.open; bRL=x.low; } else bRL=Math.min(bRL,x.low); bull=0; bear++; if(!bQ&&bear>=bMin&&(!rpOn||(bRS-bRL)/(bRS||1)*100>=rpPct)){ bQ=true; bQi=i; bG=0; bSS=bRS; bSL=bRL; } if(bQ) bSL=Math.min(bSL,x.low);
      cnt[i]=bear; dir[i]=-1; }
    } else if(up){                                                // bullish candle closed
      const recB=(recOn&&bQ&&(bSS-bSL)>0&&((x.close-bSL)/(bSS-bSL)*100<recMin))||(locOn&&pos[i]>locPct);
      if(bQ&&!confSm&&!recB){ bG++; if(bG>=bConf){ if(wantB&&i-lastB>=bGap){ ev.push({i,s:1}); sig.set(i,1); lastB=i; } bQ=false; bG=0; } else if(wantB&&bG===1) prep.push({i,s:1}); }     // Nth bullish candle closed -> one BUY (earlier ones = yellow prepare dot; reds in between are allowed)
      if(runSm){ if(rstSmall&&!spk[i]){ if(!bQ||!keep){ bQ=false; bear=0; } if(!sQ||!keep){ sQ=false; bull=0; } } }
      else { if(bull===0){ sRS=x.open; sRH=x.high; } else sRH=Math.max(sRH,x.high); bear=0; bull++; if(!sQ&&bull>=sMin&&(!rpOn||(sRH-sRS)/(sRS||1)*100>=rpPct)){ sQ=true; sQi=i; sG=0; sSS=sRS; sSH=sRH; } if(sQ) sSH=Math.max(sSH,x.high);
      cnt[i]=bull; dir[i]=1; }
    } else {                                                      // doji: never counts, never signals
      if(!bQ||!keep){ bQ=false; bear=0; } if(!sQ||!keep){ sQ=false; bull=0; }   // unqualified counts reset; qualified setups survive
    }
  }
  const r={ev,prep,sig,cnt,dir,bMin,sMin}; ccpCache[Z.sid]={k:key,r}; return r; }
function ccpDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<5) return; const r=ccpRun(c,Z); if(!r) return;
  const fs=CCP_FS[Z.ccpSize]||7.5, lbl=Z.ccpLbl!==false, bt=CCP_BT[Z.ccpBtnSz]||CCP_BT.Small, dist=Math.max(8,Math.round(Z.ccpDist==null?30:Z.ccpDist)),
    cB=Z.ccpBtnBuy||'#2dd4a7', cS=Z.ccpBtnSell||'#ff5d7a', showB=Z.ccpBuyOn!==false, showS=Z.ccpSellOn!==false, showC=Z.ccpCount===true;
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  if(showC){ cx.font=(fs)+'px system-ui';                                          // small count numbers: bullish above, bearish below
    for(let i=Math.max(0,c.length-1500);i<c.length;i++){ if(!r.dir[i]) continue; const xt=X(i); if(xt==null||xt<-10||xt>W+10) continue;
      const y=r.dir[i]===1?Y(c[i].high):Y(c[i].low); if(y==null) continue; const q=r.dir[i]===1?(r.cnt[i]>=r.sMin):(r.cnt[i]>=r.bMin);
      cx.fillStyle=r.dir[i]===1?rgba(cS,q?0.95:0.55):rgba(cB,q?0.95:0.55); cx.fillText(String(r.cnt[i]),xt,r.dir[i]===1?y-fs:y+fs); } }
  if(Z.ccpPrep!==false&&r.prep&&r.prep.length){ r.prep.slice(-Math.max(1,Math.round(Z.ccpN)||300)).forEach(e=>{   // PREPARE: glass column on the FIRST confirming candle only, full chart height, one candle wide
    if(e.s===1?!showB:!showS) return; const xt=X(e.i); if(xt==null||xt<-30||xt>W+30) return;
    const xn=X(e.i+1), xp=X(e.i-1); let bs=(xn!=null&&xn-xt>1)?xn-xt:(xp!=null&&xt-xp>1)?xt-xp:8; bs=Math.max(4,bs); const x0=xt-bs/2;
    const pc=e.s===1?cB:cS;   // glass takes the candle's colour: green column on a green (BUY side) candle, red column on a red (SELL side) candle
    const gr=cx.createLinearGradient(x0,0,x0+bs,0); gr.addColorStop(0,rgba(pc,.05)); gr.addColorStop(.5,rgba(pc,.16)); gr.addColorStop(1,rgba(pc,.05));
    cx.fillStyle=gr; cx.fillRect(x0,0,bs,H);
    cx.strokeStyle=rgba(pc,.28); cx.lineWidth=1; cx.beginPath(); cx.moveTo(x0+.5,0); cx.lineTo(x0+.5,H); cx.moveTo(x0+bs-.5,0); cx.lineTo(x0+bs-.5,H); cx.stroke(); }); }
  r.ev.slice(-Math.max(1,Math.round(Z.ccpN)||300)).forEach(e=>{
    if(e.s===1?!showB:!showS) return; const bb=c[e.i], xt=X(e.i); if(!bb||xt==null||xt<-30||xt>W+30) return;
    const buy=e.s===1, col=buy?cB:cS, yLo=Y(bb.low), yHi=Y(bb.high); if(yLo==null||yHi==null) return;
    if(Z.ccpStyle==='Glass lines'){   // optional style: transparent glass band from the top of the chart to the bottom edge (like session shading), green = BUY, red = SELL
      const xn=X(e.i+1), xp=X(e.i-1); let bs=(xn!=null&&xn-xt>1)?xn-xt:(xp!=null&&xt-xp>1)?xt-xp:8; bs=Math.max(4,bs);
      const gw=Math.max(0,+Z.ccpGlassW||0), gwid=gw>0?gw:bs, gx=xt-gwid/2;
      const gg=cx.createLinearGradient(gx,0,gx+gwid,0); gg.addColorStop(0,rgba(col,.10)); gg.addColorStop(.5,rgba(col,.34)); gg.addColorStop(1,rgba(col,.10));
      cx.fillStyle=gg; cx.fillRect(gx,0,gwid,H);
      const vg=cx.createLinearGradient(0,0,0,H); vg.addColorStop(0,'rgba(255,255,255,0.10)'); vg.addColorStop(.5,'rgba(255,255,255,0)'); vg.addColorStop(1,'rgba(255,255,255,0.06)');
      cx.fillStyle=vg; cx.fillRect(gx,0,gwid,H);
      cx.strokeStyle=rgba(col,.55); cx.lineWidth=1; cx.beginPath(); cx.moveTo(gx+.5,0); cx.lineTo(gx+.5,H); cx.moveTo(gx+gwid-.5,0); cx.lineTo(gx+gwid-.5,H); cx.stroke();
      return; }
    const w=bt[0], h=bt[1], fz=bt[2], y=buy?Math.max(yLo,yHi)+3:Math.min(yLo,yHi)-3, ty=buy?y+dist:y-dist, top=buy?ty:ty-h;
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y+(buy?0:0)); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText(buy?'BUY':'SELL',xt,top+h/2+.5);
    if(lbl){ cx.font=(fs-1)+'px system-ui'; cx.fillStyle='rgba(209,212,220,0.9)'; cx.fillText(buy?'bearish run ended':'bullish run ended',xt,buy?top+h+fs:top-fs+1); }
  });
  cx.globalAlpha=1; cx.restore(); }
STRATS.ccp={label:'Candlestick Pro Plus Counter Premium \u00b7 count consecutive bearish / bullish candles, qualify at the minimum, then BUY / SELL when the first opposite candle closes',short:'Candlestick Pro Plus Counter Premium',own:true,
  defs:{limit:false,useSl:false,long:true,short:true,ccpBMin:4,ccpBMax:8,ccpSMin:4,ccpSMax:8,ccpBConf:1,ccpSConf:1,ccpBGap:0,ccpSGap:0,ccpLocOn:false,ccpLocLen:100,ccpLocPct:40,ccpSesOn:false,ccpSesFrom:0,ccpSesTo:6,ccpRecOn:false,ccpRecMin:30,ccpRpOn:false,ccpRpPct:2,ccpSpOn:false,ccpSpX:3,ccpSpLen:20,ccpWkOn:false,ccpWkMin:60,ccpScOn:false,ccpScMin:70,ccpVolOn:false,ccpVolX:1.2,ccpVolLen:20,ccpBigOn:'Off',ccpBigX:1,ccpBigLen:20,ccpBigPct:0,ccpSmallRst:false,ccpPrep:true,ccpDoji:true,ccpExp:0,ccpWait:true,ccpBuy:true,ccpSell:true,ccpBuyOn:true,ccpSellOn:true,ccpCount:false,ccpLbl:false,ccpDist:30,ccpStyle:'Buttons',ccpGlassW:0,ccpBtnSz:'Small',ccpBtnBuy:'#2dd4a7',ccpBtnSell:'#ff5d7a',ccpN:300,ccpSize:'Small'},
  inputs:(b,d)=>{
    fld(b,d,'ccpBMin','num','BUY: minimum consecutive BEARISH candles to qualify',{min:2,max:50,step:1});
    fld(b,d,'ccpBMax','num','BUY: maximum bearish range (a longer run stays qualified)',{min:2,max:50,step:1});
    fld(b,d,'ccpSMin','num','SELL: minimum consecutive BULLISH candles to qualify',{min:2,max:50,step:1});
    fld(b,d,'ccpSMax','num','SELL: maximum bullish range (a longer run stays qualified)',{min:2,max:50,step:1});
    fld(b,d,'ccpBConf','num','BUY: signal on which GREEN candle after the reds (1 = classic: first green. Any number, e.g. 2, 5, 10 = yellow prepare dot on each green before it, BUY on that green; reds in between allowed)',{min:1,max:1000,step:1});
    fld(b,d,'ccpSConf','num','SELL: signal on which RED candle after the greens (1 = classic: first red. Any number, e.g. 2, 5, 10 = yellow prepare dot on each red before it, SELL on that red; greens in between allowed)',{min:1,max:1000,step:1});
    fld(b,d,'ccpBGap','num','BUY: minimum candles between BUY signals, even if the setup is met (0 = off, e.g. 20, 30, 50)',{min:0,max:5000,step:1});
    fld(b,d,'ccpSGap','num','SELL: minimum candles between SELL signals, even if the setup is met (0 = off, e.g. 20, 30, 50)',{min:0,max:5000,step:1});
    fld(b,d,'ccpBigOn','sel','BIG-candle filter: count only big candles (small = manipulation, ignored)',{opts:['Off','Run + confirm','Run only','Confirm only']});
    fld(b,d,'ccpBigX','num','A candle is BIG when its body is at least this many times the average body (1 = average, 1.5 = clearly bigger)',{min:0.1,max:20,step:0.1});
    fld(b,d,'ccpBigLen','num','Average body measured over the previous N candles',{min:3,max:500,step:1});
    fld(b,d,'ccpBigPct','num','Optional: also needs a body of at least this % of price (0 = off)',{min:0,max:100,step:0.1});
    fld(b,d,'ccpSmallRst','chk','A small candle resets an unfinished run (off = small candles are simply ignored)');
    fld(b,d,'ccpVolOn','chk','VOLUME filter: the confirming candle needs enough volume (thin-volume moves are ignored)');
    fld(b,d,'ccpVolX','num','Confirming candle volume must be at least this many times the average (1.2 = 20% above average)',{min:0.1,max:20,step:0.1});
    fld(b,d,'ccpVolLen','num','Average volume measured over the previous N candles',{min:3,max:500,step:1});
    fld(b,d,'ccpWkOn','chk','WICK filter: the confirming candle must be mostly body (long wicks = rejection / manipulation, ignored)');
    fld(b,d,'ccpWkMin','num','Body must be at least this % of the candle height, wick to wick (60 = body is 60% or more)',{min:1,max:100,step:1});
    fld(b,d,'ccpScOn','chk','STRONG-CLOSE filter: BUY candle must close near its high, SELL candle near its low');
    fld(b,d,'ccpScMin','num','Close must be in the top (BUY) / bottom (SELL) this % of the candle (70 = top / bottom 30% zone)',{min:1,max:100,step:1});
    fld(b,d,'ccpRecOn','chk','RECOVERY filter: the confirming candle must win back part of the run (a tiny bounce after a long fall / rise is ignored)');
    fld(b,d,'ccpRecMin','num','Must win back at least this % of the whole run (30 = a third of it)',{min:0,max:200,step:1});
    fld(b,d,'ccpRpOn','chk','RUN-SIZE filter: the red / green run must move enough to count');
    fld(b,d,'ccpRpPct','num','The run must move at least this % of price (use more on higher timeframes, e.g. 1 on 15m, 5 on 4h)',{min:0,max:100,step:0.1});
    fld(b,d,'ccpSpOn','chk','SPIKE filter: ignore giant news / stop-hunt candles completely (not counted, never confirm)');
    fld(b,d,'ccpSpX','num','A spike is a candle whose high-low range is more than this many times the average range',{min:1,max:20,step:0.5});
    fld(b,d,'ccpSpLen','num','Average range measured over the previous N candles',{min:3,max:500,step:1});
    fld(b,d,'ccpLocOn','chk','LOCATION filter: BUY only low in the recent range, SELL only high in it');
    fld(b,d,'ccpLocLen','num','Recent range = highest high to lowest low of the last N candles',{min:5,max:2000,step:5});
    fld(b,d,'ccpLocPct','num','BUY only in the lowest this % of the range, SELL only in the highest this % (40 = bottom 40% / top 40%)',{min:1,max:99,step:1});
    fld(b,d,'ccpSesOn','chk','SESSION filter: ignore confirming candles during a quiet / manipulated time window');
    fld(b,d,'ccpSesFrom','num','Block from this hour (0-23, your device local time)',{min:0,max:23,step:1});
    fld(b,d,'ccpSesTo','num','Block until this hour (0-24; e.g. from 22 to 6 blocks the night)',{min:0,max:24,step:1});
    fld(b,d,'ccpPrep','chk','Show glass PREPARE column (green / red, first confirming candle only)');
    fld(b,d,'ccpDoji','chk','Doji keeps a qualified setup alive (off = doji cancels it)');
    fld(b,d,'ccpExp','num','Optional expiry: drop a waiting setup after this many candles (0 = wait indefinitely)',{min:0,max:500,step:1});
    fld(b,d,'ccpWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'ccpBuy','chk','BUY signals enabled'); fld(b,d,'ccpSell','chk','SELL signals enabled');
    fld(b,d,'ccpBuyOn','chk','Show BUY markers'); fld(b,d,'ccpSellOn','chk','Show SELL markers'); fld(b,d,'ccpCount','chk','Show candle count labels');
    fld(b,d,'ccpStyle','sel','Signal style: BUY / SELL buttons or full-height glass lines (green = BUY, red = SELL)',{opts:['Buttons','Glass lines']});
    fld(b,d,'ccpGlassW','num','Glass line width in px (0 = one candle wide)',{min:0,max:60,step:1});
    fld(b,d,'ccpBtnSz','sel','Marker size',{opts:['Tiny','Small','Normal']}); fld(b,d,'ccpDist','num','Marker distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'ccpBtnBuy','col','BUY colour'); fld(b,d,'ccpBtnSell','col','SELL colour'); fld(b,d,'ccpLbl','chk','Show small note next to the marker');
    fld(b,d,'ccpN','num','Signals shown on chart',{min:1,max:2000,step:10}); fld(b,d,'ccpSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']}); },
  sig:(c,i,n,Z)=>{ if(c.length<5) return 0; const r=ccpRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.ccp='Strategy \u00b7 4-8 bearish candles then the first bullish close = BUY, 4-8 bullish then the first bearish close = SELL (setup waits indefinitely)'; }catch(e){}
{ const _cpD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='ccpview') return ccpDraw(d,X,Y,W,H); return _cpD.apply(this,arguments); };
  const _cpR=recomputeExtras; recomputeExtras=function(){ _cpR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='ccp'&&stVis(Z)) scriptBoxes.push({type:'ccpview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('ccp strategy failed',err); window.__ccpErr=err; }

// =====================================================================================
// [pcr] STRATEGY (Price Action) · "Adjustable Pro Ranging Channel"   (self-contained: every name starts with pcr / PCR)
// A least-squares regression line through the last N candles is the yellow dotted middle line. The GREEN line (top) and the RED line (bottom)
// are parallel to it and are set in % : "Channel width %" is the total gap between green and red measured against the middle line at the
// latest candle (3.28 = green 1.64% above and red 1.64% below). It re-fits on every new candle, so the lines follow the latest price.
// SIGNALS: BUY when a closed candle's low touches the red line, SELL when its high touches the green line. After a BUY the next BUY must wait
// "Candles between BUYs" (default 20, use 20-50) and the same for SELLs, so repeated retests of one line do not stack signals. No breakout logic yet.
// The channel re-fits on every new candle, so signals are re-evaluated against the current lines (they can shift while the channel moves).
// Hooks: STRATS.pcr + draw + recomputeExtras + PAID + runStrategy wrapper (own BUY / SELL markers, because the generic engine draws one arrow per open position).
// =====================================================================================
try{
const pcrSrc={close:x=>x.close,open:x=>x.open,high:x=>x.high,low:x=>x.low,hl2:x=>(x.high+x.low)/2,hlc3:x=>(x.high+x.low+x.close)/3,ohlc4:x=>(x.open+x.high+x.low+x.close)/4};
const pcrFmt=v=>{ const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=100?2:a>=1?4:a>=0.01?5:8}); };
function pcrFit(c,Z){
  const nAll=c.length; if(nAll<3) return null;
  let n=(Z.pcrLive===true||nAll<4)?nAll:nAll-1;   // rolling mode: fit on CLOSED candles only
  if(Z.pcrFix!==false&&nAll>=4){   // FIXED mode (default): the channel is anchored to one candle and never moves until you re-fit it
    let key='x'; try{ key=sym[0]+'|'+tf[0]; }catch(e){}
    if(!Z.pcrAnc||typeof Z.pcrAnc!=='object') Z.pcrAnc={};
    let t=Z.pcrAnc[key], idx=-1;
    if(t!=null&&!Z.pcrReset){ let lo=0,hi=nAll-2; while(lo<=hi){ const m=(lo+hi)>>1; if(c[m].time<=t){ idx=m; lo=m+1; } else hi=m-1; } if(idx>=0&&c[idx].time!==t) idx=-1; }
    if(idx<0){ idx=nAll-2; Z.pcrAnc[key]=c[idx].time; Z.pcrReset=false; try{ save(); }catch(e){} }
    n=idx+1; }
  const N=Math.min(n,Math.max(3,Math.round(Z.pcrLen)||300));
  const f=pcrSrc[Z.pcrSrc]||pcrSrc.close, i0=n-N; let sx=0,sy=0,sxx=0,sxy=0;
  for(let i=i0;i<n;i++){ const y=f(c[i]); sx+=i; sy+=y; sxx+=i*i; sxy+=i*y; }
  const den=N*sxx-sx*sx||1, b=(N*sxy-sx*sy)/den, a=(sy-b*sx)/N, pct=Math.max(0,+Z.pcrPct||0), mid=i=>a+b*i, off=Math.abs(mid(n-1))*pct/200;
  return {n,N,i0,a,b,off,pct,mid};
}
function pcrDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<3) return; const r=pcrFit(c,Z); if(!r) return; const {n,i0,off,mid}=r;
  const cU=Z.pcrUp||'#43a047', cL=Z.pcrLow||'#e53950', cM=Z.pcrMid||'#fdd835', lw=Math.max(1,Math.min(8,+Z.pcrW||2));
  const xa=X(i0), xe=X(n-1), xp=X(n-2); if(xa==null||xe==null) return;
  const bs=(xp!=null&&xe-xp>0.5)?xe-xp:6, ext=Z.pcrExt!==false?Math.max(0,(W-xe)/bs):0, i1=n-1+ext, xr=xe+ext*bs;
  const P=(i,k)=>Y(mid(i)+k*off), uA=P(i0,1), uB=P(i1,1), lA=P(i0,-1), lB=P(i1,-1), mA=P(i0,0), mB=P(i1,0);
  if([uA,uB,lA,lB,mA,mB].some(v=>v==null)) return;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.lineCap='round'; cx.setLineDash([]);
  if(Z.pcrFill!==false){ cx.globalAlpha=.07; cx.fillStyle=cM; cx.beginPath(); cx.moveTo(xa,uA); cx.lineTo(xr,uB); cx.lineTo(xr,lB); cx.lineTo(xa,lA); cx.closePath(); cx.fill(); }
  // ---- optional: fair value gaps (unfilled only), drawn behind everything else ----
  if(Z.pcrFvg===true){ const fv=pcrFvgs(c,Z); if(fv.length||fv.done.length){ const cGu=Z.pcrFvgBull||'#81c784', cGd=Z.pcrFvgBear||'#e57373', cGy=Z.pcrFvgOldCol||'#9e9e9e'; cx.lineWidth=1;
    fv.done.forEach(g=>{ const x0=X(g.i), x1=X(g.end), yT=Y(g.top), yB=Y(g.bot); if(x0==null||x1==null||yT==null||yB==null||x1<0) return; const xs=Math.max(x0,0);
      cx.globalAlpha=.14; cx.fillStyle=cGy; cx.fillRect(xs,yT,x1-xs,yB-yT); cx.globalAlpha=.45; cx.strokeStyle=cGy; cx.strokeRect(xs,yT,x1-xs,yB-yT); });
    fv.forEach(g=>{ const x0=X(g.i), yT=Y(g.top), yB=Y(g.bot); if(x0==null||yT==null||yB==null) return; const col=g.bull?cGu:cGd, xs=Math.max(x0,0);
      cx.globalAlpha=.22; cx.fillStyle=col; cx.fillRect(xs,yT,W-xs,yB-yT); cx.globalAlpha=.6; cx.strokeStyle=col; cx.strokeRect(xs,yT,W-xs,yB-yT); }); cx.globalAlpha=1; } }
  cx.globalAlpha=1; cx.lineWidth=lw;
  cx.strokeStyle=cU; cx.beginPath(); cx.moveTo(xa,uA); cx.lineTo(xr,uB); cx.stroke();
  cx.strokeStyle=cL; cx.beginPath(); cx.moveTo(xa,lA); cx.lineTo(xr,lB); cx.stroke();
  if(Z.pcrMidOn!==false){ cx.strokeStyle=cM; cx.lineWidth=Math.max(1,lw-0.5); cx.setLineDash([2,5]); cx.beginPath(); cx.moveTo(xa,mA); cx.lineTo(xr,mB); cx.stroke(); cx.setLineDash([]); }
  if(Z.pcrDots!==false){ const dot=(x,y,col)=>{ cx.fillStyle=col; cx.beginPath(); cx.arc(x,y,5,0,6.2832); cx.fill(); }; dot(xa,uA,cU); dot(xa,lA,cL); const xl=X(c.length-1); if(xl!=null){ dot(xl,P(c.length-1,1),cU); dot(xl,P(c.length-1,-1),cL); } }
  if(Z.pcrLbl!==false){ const fz=Math.max(6,Math.min(14,+Z.pcrLblSz||8)); cx.font=fz+'px system-ui'; cx.textBaseline='middle'; cx.textAlign='left';
    const tag=(txt,x,y,bg)=>{ const w=cx.measureText(txt).width+6, hh=fz+4, lx=Math.max(2,W-w-3); cx.globalAlpha=.75; cx.fillStyle=bg; cx.fillRect(lx,y-hh/2,w,hh); cx.globalAlpha=1; cx.fillStyle='#fff'; cx.fillText(txt,lx+3,y+.5); };
    const L=c.length-1, yu=Y(mid(L)+off), yl=Y(mid(L)-off);
    if(yu!=null) tag('+'+(r.pct/2).toFixed(2)+'% '+pcrFmt(mid(L)+off),0,yu-(fz+4)/2-1,cU);
    if(yl!=null) tag('-'+(r.pct/2).toFixed(2)+'% '+pcrFmt(mid(L)-off),0,yl+(fz+4)/2+1,cL); }
  const taken=[];   // boxes already used by buttons / labels, so nothing is drawn on top of anything else
  // signal points: tiny dot on the touched line -> dotted line -> tiny button (BUY below the red line, SELL above the green line)
  if(Z.pcrSig!==false&&Z.pcrBtn!==false){ const g=pcrSignals(c,Z); if(g){ const len=Math.max(8,Math.min(120,+Z.pcrBtnLen||26)), cB=Z.pcrBuyBtn||'#43a047', cS=Z.pcrSellBtn||'#e53950', words=Z.labels!==false;
    cx.font='bold 8.5px system-ui'; cx.textBaseline='middle'; cx.textAlign='center';
    g.out.forEach(q=>{ const xs=X(q.i), ys=Y(q.ps); if(xs==null||ys==null||xs<-30||xs>W+30) return; const cb0=c[q.i]; let x=xs, y=cb0?Y(q.side>0?Math.min(cb0.open,cb0.close):Math.max(cb0.open,cb0.close)):null; if(y==null) y=ys;
      const buy=q.side>0, col=buy?cB:cS, txt=words?(buy?'BUY':'SELL'):'', w=Math.max(12,(txt?cx.measureText(txt).width:0)+9), h=12, by=pcrPlace(taken,xs,buy?ys+len:ys-len,w,h,buy?1:-1);
      cx.globalAlpha=.9; cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([2,3]); cx.beginPath(); cx.moveTo(x,y); cx.lineTo(xs,by+(buy?-h/2:h/2)); cx.stroke(); cx.setLineDash([]);
      cx.globalAlpha=1; cx.fillStyle=col; cx.beginPath(); cx.arc(x,y,2.6,0,6.2832); cx.fill();
      cx.beginPath(); if(cx.roundRect) cx.roundRect(xs-w/2,by-h/2,w,h,h/2); else cx.rect(xs-w/2,by-h/2,w,h); cx.fill();
      if(txt){ cx.fillStyle='#fff'; cx.fillText(txt,xs,by+.5); } }); cx.textAlign='left'; } }
  // ---- optional: BREAKOUT (dotted line + tiny yellow button) ----
  if(Z.pcrBrk===true){ const bk=pcrBreaks(c,Z,r); if(bk&&bk.length){ const len=Math.max(10,Math.min(160,+Z.pcrBrkLen||34)), col=Z.pcrBrkCol||'#fdd835';
    cx.font='bold 8.5px system-ui'; cx.textBaseline='middle'; cx.textAlign='center'; const tw=cx.measureText('Breakout').width+9, h=12;
    bk.forEach(q=>{ const xs=X(q.i), ys=Y(q.cl); if(xs==null||ys==null||xs<-40||xs>W+40) return; const up=q.side>0, by=pcrPlace(taken,xs,up?ys-len:ys+len,tw,h,up?-1:1);
      cx.globalAlpha=.9; cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([2,3]); cx.beginPath(); cx.moveTo(xs,ys); cx.lineTo(xs,by+(up?h/2:-h/2)); cx.stroke(); cx.setLineDash([]);
      cx.globalAlpha=1; cx.fillStyle=col; cx.beginPath(); cx.arc(xs,ys,2.6,0,6.2832); cx.fill();
      cx.beginPath(); if(cx.roundRect) cx.roundRect(xs-tw/2,by-h/2,tw,h,h/2); else cx.rect(xs-tw/2,by-h/2,tw,h); cx.fill();
      cx.fillStyle='#1b1b1b'; cx.fillText('Breakout',xs,by+.5); }); cx.textAlign='left'; } }
  // ---- optional: market structure BOS (white dotted) / CHoCH (bullish / bearish dotted) ----
  if(Z.pcrStr===true){ const ev=pcrStruct(c,Z); if(ev&&ev.length){ const fz=Math.max(6,Math.min(14,+Z.pcrStrSz||8)), cBBu=Z.pcrBosBull||'#26a69a', cBBe=Z.pcrBosBear||'#ef5350', cBu=Z.pcrChBull||'#26a69a', cBe=Z.pcrChBear||'#ef5350';
    cx.font='bold '+fz+'px system-ui'; cx.textBaseline='middle'; cx.textAlign='center'; cx.lineWidth=1.2;
    ev.forEach(q=>{ const x0=X(q.x0), x1=X(q.x1), y=Y(q.y); if(x0==null||x1==null||y==null||(x0<-50&&x1<-50)||(x0>W+50&&x1>W+50)) return;
      const col=q.tag==='BOS'?(q.bull?cBBu:cBBe):(q.bull?cBu:cBe); cx.globalAlpha=.95; cx.strokeStyle=col; cx.setLineDash([3,4]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]);
      if(Z.pcrStrLbl!==false){ cx.fillStyle=col; const lt=q.tag==='BOS'?'BOS':'CHoCH', lw=cx.measureText(lt).width+4, ly=pcrPlace(taken,(x0+x1)/2,y+(q.bull?-(fz*0.9):(fz*0.9)),lw,fz+2,q.bull?-1:1); cx.fillText(lt,(x0+x1)/2,ly); } });
    cx.globalAlpha=1; cx.textAlign='left'; } }
  cx.restore();
}
// Breakout: N consecutive CLOSED candles close outside the channel (default 2 = the second candle confirms). One marker per excursion,
// and the next breakout on the same side must wait "Candles between breakouts" (20-50) so a retest does not stack markers on one spot.
// Fair value gap: bullish = candle 3 low is above candle 1 high (gap between them), bearish = mirror. Only gaps that price has NOT filled yet are kept.
// Fill = "Full" (price trades through the whole gap) or "Touch" (price enters the gap at all).
function pcrFvgs(c,Z){
  const n=c.length, bars=Math.max(20,Math.round(Z.pcrFvgBars||500)), st=Math.max(2,n-bars), full=Z.pcrFvgFill!=='Touch', mn=Math.max(0,+Z.pcrFvgMin||0)/100, mx=Math.max(1,Math.round(Z.pcrFvgMax||10)), old=Z.pcrFvgOld===true?Math.max(0,Math.round(Z.pcrFvgOldN==null?5:Z.pcrFvgOldN)):0, out=[], done=[];
  for(let i=st;i<n-1;i++){ const a=c[i-2], k=c[i]; let bull=null, top,bot;
    if(k.low>a.high){ bull=true; bot=a.high; top=k.low; } else if(k.high<a.low){ bull=false; top=a.low; bot=k.high; }
    if(bull===null||(top-bot)<bot*mn) continue;
    let end=-1; for(let j=i+1;j<n;j++){ const q=c[j]; if(bull?(full?q.low<=bot:q.low<=top):(full?q.high>=top:q.high>=bot)){ end=j; break; } }
    if(end<0) out.push({i:i-2,bull,top,bot}); else if(old>0) done.push({i:i-2,end,bull,top,bot}); }
  const res=out.slice(-mx); res.done=done.slice(-old); return res;
}
function pcrPlace(T,xc,by,w,h,dir){ for(let n=0;n<10;n++){ let hit=false; for(let k=0;k<T.length;k++){ const q=T[k]; if(Math.abs(xc-q.x)<(w+q.w)/2+2&&Math.abs(by-q.y)<(h+q.h)/2+2){ hit=true; break; } } if(!hit) break; by+=dir*(h+3); } T.push({x:xc,y:by,w:w,h:h}); return by; }
function pcrBreaks(c,Z,r){
  r=r||pcrFit(c,Z); if(!r) return [];
  if(Z.pcrBrkV!==3){ Z.pcrBrkV=3; Z.pcrBrkN=2; try{ save(); }catch(e){} }   // one-time: breakout now counts the THIRD candle
   const last=c.length-2, out=[]; if(last<r.i0) return out;
  const need=Math.max(1,Math.round(Z.pcrBrkN==null?2:Z.pcrBrkN)), gap=Math.max(0,Math.round(Z.pcrBrkGap==null?20:Z.pcrBrkGap));
  let su=0, sd=0, lu=-1e9, ld=-1e9;
  for(let i=r.i0;i<=last;i++){ const k=c[i], m=r.mid(i), up=m+r.off, lo=m-r.off;
    su=k.close>up?su+1:0; sd=k.close<lo?sd+1:0;
    if(su===need&&i-lu>=gap){ out.push({i,time:k.time,side:1,cl:k.close,lv:up}); lu=i; }
    if(sd===need&&i-ld>=gap){ out.push({i,time:k.time,side:-1,cl:k.close,lv:lo}); ld=i; } }
  return out;
}
// Market structure: swing highs / lows (confirmed after "swing length" candles each side). A break of the last swing continues the trend (BOS)
// or flips it (CHoCH). Closed candles only, so lines do not flicker with the forming candle.
function pcrStruct(c,Z){
  const L=Math.max(2,Math.min(30,Math.round(Z.pcrStrLen==null?5:Z.pcrStrLen))), end=c.length-2, bars=Math.max(50,Math.round(Z.pcrStrBars||500)), st=Math.max(L,end-bars), wick=Z.pcrStrBrk==='Wick', mx=Math.max(1,Math.round(Z.pcrStrMax||30));
  if(end<2*L+2) return []; let hi=null, lo=null, bias=0; const ev=[];
  for(let t=st;t<=end;t++){ const p=t-L;
    if(p>=L){ let isH=true, isL=true; for(let j=p-L;j<=p+L;j++){ if(j===p) continue; if(j<p){ if(c[j].high>c[p].high) isH=false; if(c[j].low<c[p].low) isL=false; } else { if(c[j].high>=c[p].high) isH=false; if(c[j].low<=c[p].low) isL=false; } }
      if(isH) hi={i:p,v:c[p].high,done:false}; if(isL) lo={i:p,v:c[p].low,done:false}; }
    const k=c[t];
    if(hi&&!hi.done&&(wick?k.high:k.close)>hi.v){ ev.push({tag:bias===-1?'CHoCH':'BOS',bull:true,x0:hi.i,x1:t,y:hi.v}); bias=1; hi.done=true; }
    if(lo&&!lo.done&&(wick?k.low:k.close)<lo.v){ ev.push({tag:bias===1?'CHoCH':'BOS',bull:false,x0:lo.i,x1:t,y:lo.v}); bias=-1; lo.done=true; } }
  return ev.slice(-mx);
}
function pcrSignals(c,Z){
  const r=pcrFit(c,Z); if(!r) return null; const n=c.length, last=n-2, out=[]; if(last<r.i0) return {out,nb:0,ns:0,r};   // closed candles only (the newest candle is still forming)
  const tol=Math.max(0,+Z.pcrTol||0)/100, cb=Math.max(0,Math.round(Z.pcrCoolB==null?20:Z.pcrCoolB)), cs=Math.max(0,Math.round(Z.pcrCoolS==null?20:Z.pcrCoolS));
  // touch of a line only STARTS a setup. SELL (green line): fires on the close of the 2nd RED candle, counting from the touch candle (red red / red green red).
  // BUY (red line): the mirror, fires on the close of the 2nd GREEN candle. The setup is dropped if it does not complete within "max candles to wait".
  const need=Math.max(1,Math.round(Z.pcrNeed==null?2:Z.pcrNeed)), mw=Math.max(need,Math.round(Z.pcrMaxW==null?10:Z.pcrMaxW));
  let nb=0, ns=0;
  const scan=(side,cool)=>{ let lastS=-1e9;
    for(let i=r.i0;i<=last;i++){ const b=c[i], m=r.mid(i), up=m+r.off, lo=m-r.off;
      const touch=side>0?(b.low<=lo*(1+tol)):(b.high>=up*(1-tol)); if(!touch||i-lastS<cool) continue;
      let cnt=0;
      for(let j=i;j<=Math.min(last,i+mw-1);j++){ const k=c[j], mj0=r.mid(j), u0=mj0+r.off, l0=mj0-r.off, bt=Math.max(k.open,k.close), bb=Math.min(k.open,k.close), inside=Z.pcrInside===false||(bb>=l0&&bt<=u0); if(inside&&(side>0?(k.close>k.open):(k.close<k.open))) cnt++;
        if(cnt>=need){ const mj=r.mid(j); out.push({i:j,ti:i,time:k.time,side,p:side>0?lo:up,ps:side>0?mj-r.off:mj+r.off}); lastS=j; if(side>0) nb++; else ns++; i=j; break; } } } };
  if(Z.long!==false) scan(1,cb); if(Z.short!==false) scan(-1,cs);
  out.sort((x,y)=>x.i-y.i);
  return {out,nb,ns,r};
}
STRATS.pcr={label:'Adjustable Pro Plus Ranging Channel · regression middle line with a green top line and a red bottom line set in %',short:'Adjustable Pro Plus Ranging Channel',own:true,
  defs:{limit:false,useSl:false,pcrSrc:'close',pcrLen:300,pcrPct:3.28,pcrExt:true,pcrFix:true,pcrReset:false,pcrLive:false,pcrMidOn:true,pcrFill:true,pcrDots:true,pcrLbl:true,pcrSig:true,pcrKeep:true,pcrBtn:true,pcrArrows:false,pcrBtnLen:26,pcrBuyBtn:'#43a047',pcrSellBtn:'#e53950',pcrCoolB:20,pcrCoolS:20,pcrNeed:2,pcrMaxW:10,pcrInside:true,pcrLblSz:8,pcrTol:0,pcrW:2,pcrUp:'#43a047',pcrLow:'#e53950',pcrMid:'#fdd835',pcrFvg:false,pcrFvgFill:'Full',pcrFvgBars:500,pcrFvgMax:10,pcrFvgMin:0,pcrFvgOld:false,pcrFvgOldN:5,pcrFvgOldCol:'#9e9e9e',pcrFvgBull:'#81c784',pcrFvgBear:'#e57373',pcrBrk:false,pcrBrkN:2,pcrBrkV:3,pcrBrkGap:20,pcrBrkLen:34,pcrBrkCol:'#fdd835',pcrStr:false,pcrStrLen:5,pcrStrBrk:'Close',pcrStrBars:500,pcrStrMax:30,pcrStrLbl:true,pcrStrSz:8,pcrBosBull:'#26a69a',pcrBosBear:'#ef5350',pcrChBull:'#26a69a',pcrChBear:'#ef5350'},
  inputs:(b,d)=>{
    fld(b,d,'pcrPct','num','Channel width % (green to red, total)',{min:0.01,max:100,step:0.01}); fld(b,d,'pcrLen','num','Regression length (bars)',{min:3,max:5000,step:10}); fld(b,d,'pcrSrc','sel','Source',{opts:['close','open','high','low','hl2','hlc3','ohlc4']});
    fld(b,d,'pcrSig','chk','Show BUY (red line touch) / SELL (green line touch) signals'); fld(b,d,'pcrBtn','chk','Show signal point + dotted line + tiny button'); fld(b,d,'pcrBtnLen','num','Dotted line length (px)',{min:8,max:120,step:2}); fld(b,d,'pcrBuyBtn','col','BUY button colour'); fld(b,d,'pcrSellBtn','col','SELL button colour'); fld(b,d,'pcrArrows','chk','Also show the chart arrow markers'); fld(b,d,'pcrKeep','chk','Arrow markers: always show (ignore the global signal-marker switch)'); fld(b,d,'pcrNeed','num','Confirm candles (2 = second red for SELL / second green for BUY)',{min:1,max:5,step:1}); fld(b,d,'pcrInside','chk','Confirming candle body must be fully inside the channel (filters manipulation)'); fld(b,d,'pcrMaxW','num','Max candles to wait for the confirmation',{min:2,max:50,step:1}); fld(b,d,'pcrCoolB','num','Candles between BUYs (try 20 to 50)',{min:0,max:1000,step:1}); fld(b,d,'pcrCoolS','num','Candles between SELLs (try 20 to 50)',{min:0,max:1000,step:1}); fld(b,d,'pcrTol','num','Touch tolerance % (0 = wick must reach the line)',{min:0,max:10,step:0.01});
    fld(b,d,'pcrFvg','chk','FAIR VALUE GAPS: bullish (light green) / bearish (light red), unfilled only'); fld(b,d,'pcrFvgFill','sel','Gap counts as filled when price',{opts:['Full','Touch']}); fld(b,d,'pcrFvgOld','chk','Also show the last FILLED gaps in grey'); fld(b,d,'pcrFvgOldN','num','Filled gaps shown (e.g. 5, 7, 20)',{min:1,max:200,step:1}); fld(b,d,'pcrFvgOldCol','col','Filled gap colour'); fld(b,d,'pcrFvgMax','num','Gaps shown (latest unfilled)',{min:1,max:100,step:1}); fld(b,d,'pcrFvgMin','num','Minimum gap size (% of price)',{min:0,max:10,step:0.01}); fld(b,d,'pcrFvgBars','num','Gap scan (last bars)',{min:20,max:5000,step:50}); fld(b,d,'pcrFvgBull','col','Bullish gap colour'); fld(b,d,'pcrFvgBear','col','Bearish gap colour');
    fld(b,d,'pcrBrk','chk','BREAKOUT: mark a close outside the channel (dotted line + tiny yellow button)'); fld(b,d,'pcrBrkN','num','Breakout confirm: closed candles outside (2 = second candle)',{min:1,max:5,step:1}); fld(b,d,'pcrBrkGap','num','Candles between breakouts (20 to 50, avoids stacked retests)',{min:0,max:200,step:1}); fld(b,d,'pcrBrkLen','num','Breakout dotted line length (px)',{min:10,max:160,step:2}); fld(b,d,'pcrBrkCol','col','Breakout button colour');
    fld(b,d,'pcrStr','chk','MARKET STRUCTURE: BOS + CHoCH dotted lines (bullish green, bearish red)'); fld(b,d,'pcrStrLen','num','Structure swing length (candles each side)',{min:2,max:30,step:1}); fld(b,d,'pcrStrBrk','sel','Structure break by',{opts:['Close','Wick']}); fld(b,d,'pcrStrMax','num','Structure lines shown (latest)',{min:1,max:200,step:1}); fld(b,d,'pcrStrBars','num','Structure scan (last bars)',{min:50,max:5000,step:50}); fld(b,d,'pcrStrLbl','chk','Show BOS / CHoCH labels'); fld(b,d,'pcrStrSz','num','Structure label size (px)',{min:6,max:14,step:1}); fld(b,d,'pcrBosBull','col','BOS bullish colour'); fld(b,d,'pcrBosBear','col','BOS bearish colour'); fld(b,d,'pcrChBull','col','CHoCH bullish colour'); fld(b,d,'pcrChBear','col','CHoCH bearish colour');
    fld(b,d,'pcrFix','chk','FIXED channel: lines never move until you re-fit (off = rolling, re-fits every candle)');
    fld(b,d,'pcrReset','chk','Re-fit the fixed channel to the latest closed candle now (tick once, then close)');
    fld(b,d,'pcrLive','chk','Let the live (forming) candle move the lines (off = lines stay fixed until the candle closes)');
    fld(b,d,'pcrExt','chk','Extend lines to the right edge'); fld(b,d,'pcrMidOn','chk','Show middle line'); fld(b,d,'pcrFill','chk','Show fill between the lines'); fld(b,d,'pcrDots','chk','Show end dots'); fld(b,d,'pcrLbl','chk','Show % / price labels'); fld(b,d,'pcrLblSz','num','Label text size (px)',{min:6,max:14,step:1});
    fld(b,d,'pcrW','num','Line width',{min:1,max:8,step:1}); fld(b,d,'pcrUp','col','Green line colour'); fld(b,d,'pcrLow','col','Red line colour'); fld(b,d,'pcrMid','col','Middle line colour'); },
  sig:()=>0};
try{ DESC.pcr='Price action · regression channel with green / red lines set by a % width; BUY on a red line touch, SELL after a green line touch + 2nd red candle (BUY mirror on red line), with a candle gap between repeat signals'; }catch(e){}
try{ if(typeof PAID!=='undefined'&&!PAID.includes('s:pcr')) PAID.push('s:pcr'); }catch(e){}
{ const _pcD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='pcrview') return pcrDraw(d,X,Y,W,H); return _pcD.apply(this,arguments); };
  const _pcR=recomputeExtras; recomputeExtras=function(){ _pcR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='pcr'&&stVis(Z)) scriptBoxes.push({type:'pcrview',pts:[],o:Z}); }); };
  // the generic engine draws one same-direction arrow per open position, so this strategy adds its own BUY / SELL markers after it runs
  const _pcS=runStrategy; runStrategy=function(quiet){ _pcS.apply(this,arguments); try{ let add=[];
    strats.forEach(Z=>{ if(Z.k!=='pcr'||!stVis(Z)||Z.pcrSig===false||!candles||candles.length<5) return; const g=pcrSignals(candles,Z); if(!g) return;
      if(Z.pcrArrows===true) g.out.forEach(q=>add.push(q.side>0?{time:q.time,position:'belowBar',color:Z.buyCol||'#2dd4a7',shape:'arrowUp',text:Z.labels!==false?'BUY':'',keep:Z.pcrKeep!==false}:{time:q.time,position:'aboveBar',color:Z.sellCol||'#ff5d7a',shape:'arrowDown',text:Z.labels!==false?'SELL':'',keep:Z.pcrKeep!==false}));
      Z._stat=g.nb+' buys \u00b7 '+g.ns+' sells'; const lq=g.out[g.out.length-1], lc=candles[candles.length-2];
      if(lq&&lc&&lq.time===lc.time&&lq.time>(Z._ls||0)){ if(!quiet&&typeof toast==='function') toast((lq.side>0?'BUY':'SELL')+' signal \u00b7 '+sym[0]+' '+tf[0],lq.side>0?(Z.buyCol||'#2dd4a7'):(Z.sellCol||'#ff5d7a')); Z._ls=lq.time; try{ lastSig=Math.max(lastSig,lq.time); }catch(e){} } });
    if(add.length){ stratMk=stratMk.concat(add); applyMarkers(); } }catch(e){ console.error('pcr markers',e); } }; }
}catch(err){ console.error('pcr strategy failed',err); window.__pcrErr=err; }

// ===== Relative Performance - Asset Comparison (chart type 21): engine =====
try{
// =====================================================================================
// Relative Performance — Asset Comparison  (chart type 21)
// Independent chart module: its own chart instance, its own data layer. It does not touch the candle series,
// indicators or any of the 20 other chart types. index.html only calls window.mpRP.enter() / leave().
//   ENGINE (no DOM, unit-tested): klines paging, base-date alignment, normalisation, live kline streams,
//                                 reconnect + backfill, de-duplication, stale-response protection.
//   VIEW   : dark line chart (zero / 100 baseline, synced crosshair, legend with exact values, zoom / pan).
// Normalisation (same function for history and live ticks):
//   percent : (price / basePrice - 1) x 100      -> base point = 0 %
//   indexed : (price / basePrice) x 100          -> base point = 100
//   basePrice = CLOSE of the candle whose open time is the base timestamp T0 (T0 = first candle of the base asset
//   inside the chosen range). Every asset is normalised by its OWN price at that SAME timestamp.
// Never invented: an asset with no candle at T0 is not drawn (flagged instead); a missing candle is a gap, not a fill.
// Not a trading signal: past relative performance only.
// =====================================================================================
(function(root){
'use strict';
const RP_IV={'1m':60,'3m':180,'5m':300,'15m':900,'30m':1800,'1h':3600,'2h':7200,'4h':14400,'6h':21600,'8h':28800,'12h':43200,'1d':86400,'3d':259200,'1w':604800,'1M':2592000};
const RP_TFS=[['1m','1m'],['3m','3m'],['5m','5m'],['15m','15m'],['30m','30m'],['1h','1h'],['2h','2h'],['4h','4h'],['6h','6h'],['8h','8h'],['12h','12h'],['1D','1d'],['3D','3d'],['1W','1w'],['1M','1M']];
const RP_RANGES=[['1D',1],['5D',5],['1M',30],['3M',91],['6M',182],['YTD',-1],['1Y',365],['3Y',1095],['ALL',-2]];
const RP_MAXC=20000, RP_PAGE=1000, RP_MAXA=10;
const rpNorm=(p,b,mode)=>mode==='idx'?(p/b)*100:(p/b-1)*100;   // the ONE normalisation function

function rpEngine(env){
  const E={assets:[],mode:'pct',iv:'1d',startMs:0,endMs:null,T0:null,epoch:0,loading:false,notices:[],conn:{spot:'off',futures:'off'},paused:false,lastMsg:0};
  const L=[], conns={}; let seq=0;
  const emit=(t,d)=>{ L.slice().forEach(f=>{ try{ f(t,d); }catch(e){ if(root.console) console.error('rp listener',e); } }); };
  E.on=f=>{ L.push(f); };
  const newAsset=(symbol,market)=>({id:++seq,symbol:String(symbol).toUpperCase(),market:market==='futures'?'futures':'spot',candles:new Map(),status:'idle',msg:'',first:null,last:null,base:null,gaps:0});
  const fmtD=t=>new Date(t*1000).toISOString().slice(0,16).replace('T',' ')+' UTC';
  E.fmtD=fmtD;
  const reset=a=>{ a.candles.clear(); a.first=a.last=a.base=null; a.gaps=0; a.msg=''; };
  async function getJSON(url){ let err; for(let k=0;k<3;k++){ try{ const r=await env.fetch(url); if(!r.ok){ const e=new Error('HTTP '+r.status); e.fatal=(r.status===400||r.status===404); throw e; } return await r.json(); }catch(e){ err=e; if(e.fatal) break; await env.sleep(350*(k+1)); } } throw err; }
  const parse=(r,now)=>{ const t=Math.floor(r[0]/1000), c=+r[4]; if(!(c>0)||!isFinite(c)||!isFinite(t)) return null; return {t,o:+r[1],h:+r[2],l:+r[3],c,x:r[6]<now}; };
  function store(a,cd){ a.candles.set(cd.t,cd); if(a.first==null||cd.t<a.first) a.first=cd.t; if(a.last==null||cd.t>a.last) a.last=cd.t; }
  async function fetchKlines(a,fromMs,stale){ const out=[]; let cur=fromMs; const now=env.now();
    for(let it=0;it<80;it++){ if(stale()) return out;
      const rows=await getJSON(env.rest[a.market]+'/klines?symbol='+encodeURIComponent(a.symbol)+'&interval='+E.iv+'&startTime='+cur+'&limit='+RP_PAGE);
      if(!Array.isArray(rows)) throw new Error('bad reply'); rows.forEach(r=>{ const c=parse(r,now); if(c) out.push(c); });
      if(rows.length<RP_PAGE) break; cur=rows[rows.length-1][0]+1; }
    return out; }
  async function loadOne(a,fromMs,stale){ a.status='loading'; a.msg=''; emit('status',a);
    try{ const rows=await fetchKlines(a,fromMs,stale); if(stale()) return; reset(a); rows.forEach(c=>store(a,c)); a.status=a.candles.size?'loaded':'nodata'; if(!a.candles.size) a.msg='No data in this period'; }
    catch(e){ if(stale()) return; a.status='error'; a.msg=e&&e.fatal?'Not available on '+(a.market==='futures'?'Futures':'Spot'):'Network problem. Tap to retry'; } }
  function judge(a){ if(a.status!=='loaded'&&a.status!=='ok'&&a.status!=='nohist') return; if(E.T0==null){ return; }
    const c=a.candles.get(E.T0);
    if(c&&c.c>0){ a.base=c.c; a.status='ok'; a.msg=''; }
    else { a.base=null; a.status='nohist'; const f=a.first; a.msg=f!=null&&f>E.T0?'Not enough history. First candle '+fmtD(f):'No candle at the base date (missing data)'; }
  }
  E._seed=function(list,keep){ if(!keep){ E.assets.length=0; } else { E.assets.length=0; } const seen=new Set(); list.forEach(x=>{ const s=String(x[0]).toUpperCase(), m=x[1]==='futures'?'futures':'spot'; if(seen.has(m+s)||E.assets.length>=RP_MAXA) return; seen.add(m+s); E.assets.push(newAsset(s,m)); }); E.T0=null; };
  E.est=()=>Math.ceil((((E.endMs||env.now())-E.startMs)/1000)/RP_IV[E.iv]);
  function finalize(){ const p=E.assets[0]; E.notices=[]; E.T0=null;
    if(p&&p.candles.size) E.T0=p.first; else if(p) E.notices.push({k:'base',t:'Base asset '+p.symbol+' has no data for this period'});
    if(E.T0!=null&&E.T0*1000-E.startMs>RP_IV[E.iv]*1000*1.5&&E.startMs>0) E.notices.push({k:'moved',t:'Base date moved to the first candle of '+p.symbol+': '+fmtD(E.T0)});
    E.assets.forEach(judge); countGaps(); }
  function countGaps(){ E.assets.forEach(a=>{ a.gaps=0; if(a.status!=='ok') return; const step=E.iv==='1M'?0:RP_IV[E.iv]; if(!step) return; let n=0; for(let t=E.T0;t<a.last;t+=step){ if(!a.candles.has(t)) n++; } a.gaps=n; }); }
  E.load=async function(){ const ep=++E.epoch, stale=()=>ep!==E.epoch; E.loading=true; E.T0=null; E.notices=[];
    if(E.est()>RP_MAXC){ E.assets.forEach(a=>{ reset(a); a.status='toolong'; a.msg=''; }); E.notices.push({k:'toolong',t:'Too many candles ('+E.est()+') for this range and timeframe. Use a shorter range or a larger timeframe.'}); E.loading=false; closeAll(); emit('rebuild'); return; }
    E.assets.forEach(a=>{ reset(a); a.status='loading'; }); emit('status');
    await Promise.all(E.assets.map(a=>loadOne(a,E.startMs,stale))); if(stale()) return;
    finalize(); E.loading=false; emit('rebuild',{fit:true}); syncStreams(); };
  E.addAsset=function(symbol,market){ symbol=String(symbol).toUpperCase(); market=market==='futures'?'futures':'spot';
    if(E.assets.some(a=>a.symbol===symbol&&a.market===market)) return 'dup'; if(E.assets.length>=RP_MAXA) return 'max';
    const a=newAsset(symbol,market); E.assets.push(a);
    if(E.T0==null||E.loading){ E.load(); return 'ok'; }
    const ep=E.epoch, stale=()=>ep!==E.epoch; emit('status');
    loadOne(a,E.T0*1000,stale).then(()=>{ if(stale()) return; judge(a); countGaps(); emit('rebuild'); syncStreams(); }); return 'ok'; };
  E.removeAsset=function(id){ const i=E.assets.findIndex(a=>a.id===id); if(i<0||E.assets.length<2) return; E.assets.splice(i,1); if(i===0) E.load(); else { countGaps(); emit('rebuild'); syncStreams(); } };
  E.makeBase=function(id){ const i=E.assets.findIndex(a=>a.id===id); if(i<=0) return; const a=E.assets.splice(i,1)[0]; E.assets.unshift(a); E.load(); };
  E.retry=function(id){ const a=E.assets.find(x=>x.id===id); if(!a) return; if(E.T0==null||a===E.assets[0]){ E.load(); return; } const ep=E.epoch, stale=()=>ep!==E.epoch; loadOne(a,E.T0*1000,stale).then(()=>{ if(stale()) return; judge(a); countGaps(); emit('rebuild'); syncStreams(); }); };
  E.switchMarket=function(id){ const a=E.assets.find(x=>x.id===id); if(!a) return 'none'; const m=a.market==='spot'?'futures':'spot'; if(E.assets.some(x=>x.symbol===a.symbol&&x.market===m)) return 'dup'; a.market=m; if(a===E.assets[0]||E.T0==null) E.load(); else E.retry(id); return 'ok'; };
  E.setStart=function(ms,endMs){ E.startMs=ms; E.endMs=endMs||null; return E.load(); };
  E.setIv=function(iv){ if(!RP_IV[iv]||iv===E.iv) return; E.iv=iv; return E.load(); };
  E.setMode=function(m){ E.mode=m==='idx'?'idx':'pct'; emit('rebuild'); };
  E.rebaseCommon=function(){ let m=E.T0; E.assets.forEach(a=>{ if(a.status==='nohist'&&a.first!=null&&a.first>m) m=a.first; }); if(m===E.T0) return false; E.startMs=m*1000; E.load(); return true; };
  E.value=(a,price)=>rpNorm(price,a.base,E.mode);
  E.baseValue=()=>E.mode==='idx'?100:0;
  E.masterTimes=function(){ if(E.T0==null) return []; const set=new Set(); let mx=E.T0; E.assets.forEach(a=>{ if(a.status!=='ok') return; a.candles.forEach((c,t)=>{ if(t>=E.T0){ set.add(t); if(t>mx) mx=t; } }); });
    if(E.iv!=='1M'){ const step=RP_IV[E.iv]; for(let t=E.T0;t<=mx;t+=step) set.add(t); }
    return Array.from(set).sort((x,y)=>x-y); };
  E.points=function(a,master){ const pts=[]; if(a.status!=='ok') return pts; for(let i=0;i<master.length;i++){ const t=master[i], c=a.candles.get(t); if(c) pts.push({time:t,value:E.value(a,c.c)}); else if(t>E.T0&&t<a.last) pts.push({time:t}); } return pts; };
  E.at=(a,t)=>{ const c=a.status==='ok'?a.candles.get(t):null; return c?{v:E.value(a,c.c),p:c.c,live:!c.x}:null; };
  E.latest=a=>{ if(a.status!=='ok'||a.last==null) return null; return E.at(a,a.last); };
  // ---- live ----
  function onKline(m,msg){ const d=(msg&&msg.data)||msg; if(!d||d.e!=='kline'||!d.k) return; const k=d.k; if(k.i!==E.iv) return;
    const sy=String(d.s||k.s||'').toUpperCase(), a=E.assets.find(x=>x.market===m&&x.symbol===sy); if(!a||a.status!=='ok'||E.T0==null||E.loading) return;
    const t=Math.floor(k.t/1000); if(t<E.T0) return; const c={t,o:+k.o,h:+k.h,l:+k.l,c:+k.c,x:!!k.x}; if(!(c.c>0)||!isFinite(c.c)) return;
    store(a,c); E.lastMsg=env.now(); emit('tick',{asset:a,candle:c}); }
  function setConn(m,s){ if(E.conn[m]===s) return; E.conn[m]=s; emit('conn'); }
  function closeConn(m){ const c=conns[m]; if(!c) return; c.closed=true; if(c.timer) env.clearTimeout(c.timer); if(c.wd) env.clearInterval(c.wd); try{ c.ws&&c.ws.close(); }catch(e){} delete conns[m]; setConn(m,'off'); }
  function closeAll(){ Object.keys(conns).forEach(closeConn); }
  function openConn(m,key,streams){ const c={m,key,ws:null,tries:0,closed:false,timer:null,wd:null,lastMsg:env.now()}; conns[m]=c;
    const retry=()=>{ if(c.closed) return; c.tries++; setConn(m,'reconnecting'); c.timer=env.setTimeout(connect,Math.min(30000,1000*Math.pow(2,Math.min(c.tries,5)))); };
    function connect(){ if(c.closed) return; let ws; try{ ws=new env.WS(env.ws[m]+'/stream?streams='+streams.join('/')); }catch(e){ retry(); return; } c.ws=ws; let opened=false;
      ws.onopen=()=>{ if(c.closed||c.ws!==ws) return; opened=true; c.tries=0; c.lastMsg=env.now(); setConn(m,'live'); E.backfill(); };
      ws.onmessage=ev=>{ if(c.closed||c.ws!==ws) return; c.lastMsg=env.now(); let j; try{ j=JSON.parse(ev.data); }catch(e){ return; } onKline(m,j); };
      ws.onclose=()=>{ if(c.closed||c.ws!==ws) return; retry(); };
      ws.onerror=()=>{ try{ ws.close(); }catch(e){} }; }
    c.wd=env.setInterval(()=>{ if(!c.closed&&c.ws&&env.now()-c.lastMsg>120000){ try{ c.ws.close(); }catch(e){} } },15000);
    setConn(m,'connecting'); connect(); }
  function syncStreams(){ if(E.paused){ return; } ['spot','futures'].forEach(m=>{
    const streams=E.assets.filter(a=>a.market===m&&a.status==='ok').map(a=>a.symbol.toLowerCase()+'@kline_'+E.iv).sort(), key=streams.join('/');
    const cur=conns[m]; if(!streams.length){ if(cur) closeConn(m); return; } if(cur&&cur.key===key) return; if(cur) closeConn(m); openConn(m,key,streams); }); }
  E.syncStreams=syncStreams;
  E.pause=function(){ E.paused=true; closeAll(); };
  E.resume=function(){ E.paused=false; syncStreams(); E.backfill(); };
  E.backfill=async function(){ if(E.T0==null||E.loading) return; const ep=E.epoch, stale=()=>ep!==E.epoch;
    await Promise.all(E.assets.filter(a=>a.status==='ok').map(async a=>{ try{ const rows=await fetchKlines(a,Math.max(a.last||E.T0,E.T0)*1000,stale); if(stale()) return; rows.forEach(c=>{ if(c.t>=E.T0) store(a,c); }); }catch(e){} }));
    if(stale()) return; countGaps(); emit('rebuild'); };
  E.dispose=function(){ closeAll(); E.epoch++; };
  E._conns=conns; E._onKline=onKline;
  return E;
}

// ---------------------------------------------------------------------------------------
root.__rpParts={rpEngine,rpNorm,RP_IV,RP_TFS,RP_RANGES,RP_MAXC,RP_MAXA};
})(typeof window!=='undefined'?window:globalThis);

}catch(err){ console.error('relative performance engine failed',err); window.__rpErr=err; }
// ===== Relative Performance - Asset Comparison (chart type 21): view =====
// ---- Relative Performance: VIEW (runs inside start(), uses the app's helpers) ----
try{ (function(){
const P=window.__rpParts; if(!P||typeof LightweightCharts==='undefined'){ console.error('rp: engine missing'); return; }
const {rpEngine,RP_IV,RP_TFS,RP_RANGES,RP_MAXC}=P, SKEY='mp_rp_v1', COLS=['#f5b942','#4dabf7','#2dd4a7','#ff5d7a','#b388ff','#ff9800','#26c6da','#d4e157','#ec407a','#9ccc65'];
const REST={spot:API+'/api/v3',futures:FAPI+'/fapi/v1'}, WSU={spot:WSS,futures:FWSS+'/market'};
const eng=rpEngine({fetch:(u)=>fetch(u),sleep:ms=>new Promise(r=>setTimeout(r,ms)),now:()=>Date.now(),rest:REST,ws:WSU,WS:WebSocket,
  setTimeout:(f,ms)=>setTimeout(f,ms),clearTimeout:t=>clearTimeout(t),setInterval:(f,ms)=>setInterval(f,ms),clearInterval:t=>clearInterval(t)});
const ui={root:null,chart:null,base:null,series:new Map(),on:false,hoverT:null,range:'3M',custom:null,appSym:null,appTf:null,poll:null,pend:false,lists:{spot:null,futures:null,busy:false},inited:false,fit:true,colorOf:{}};
const $q=(s,e)=>(e||ui.root).querySelector(s);
const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
const light=()=>document.documentElement.getAttribute('data-theme')==='light';
const TH=()=>light()?{bg:'#ffffff',tx:'#4a5470',gr:'rgba(0,0,0,.06)',base:'#7a859e',fg:'#141a2b',pn:'#f1f3f9',ln:'#dfe3ee'}:{bg:'#0b0e14',tx:'#7f8aa3',gr:'rgba(255,255,255,.04)',base:'#8a93a8',fg:'#e6eaf2',pn:'#141a26',ln:'#232c3d'};
const fmtV=v=>{ if(v==null||!isFinite(v)) return '\u2014'; return eng.mode==='idx'?v.toFixed(2):(v>0?'+':'')+v.toFixed(2)+'%'; };
const fmtAx=v=>eng.mode==='idx'?v.toFixed(1):v.toFixed(1)+'%';
const fmtP=p=>p==null?'':p>=1000?p.toLocaleString('en-US',{maximumFractionDigits:2}):p>=1?p.toFixed(4):p>=0.01?p.toFixed(5):p.toPrecision(4);
const mk=m=>m==='futures'?'FUTURES':'SPOT';
const quoteOf=s=>{ const m=/(USDT|USDC|FDUSD|BUSD|TUSD|USD|BTC|ETH|BNB|EUR|TRY|BRL|GBP|JPY)$/.exec(s); return m?m[1]:'?'; };
const saveSt=()=>{ try{ localStorage.setItem(SKEY,JSON.stringify({a:eng.assets.map(a=>[a.symbol,a.market]),mode:eng.mode,iv:eng.iv,range:ui.range,custom:ui.custom,appSym:ui.appSym,appTf:ui.appTf})); }catch(e){} };
const loadSt=()=>{ try{ return JSON.parse(localStorage.getItem(SKEY)||'null'); }catch(e){ return null; } };
const startOf=()=>{ const now=Date.now(), r=ui.range; if(r==='CUSTOM'&&ui.custom) return [ui.custom.s,ui.custom.e||null]; const d=(RP_RANGES.find(x=>x[0]===r)||['3M',91])[1];
  if(d===-1) return [Date.UTC(new Date().getUTCFullYear(),0,1),null]; if(d===-2) return [Date.UTC(2017,0,1),null]; return [now-d*86400000,null]; };
const appIv=()=>{ try{ return (tf&&isNative(tf)&&RP_IV[tf[1]])?tf[1]:null; }catch(e){ return null; } };
const appMarket=s=>isPerp(s)?'futures':'spot';

// ---------- DOM ----------
function css(){ if(document.getElementById('rpCss')) return; const s=document.createElement('style'); s.id='rpCss'; s.textContent=
'#rpView{position:absolute;inset:0;z-index:4;display:none;flex-direction:column;background:var(--rb);color:var(--rf);font:12px system-ui,-apple-system,Segoe UI,sans-serif;-webkit-tap-highlight-color:transparent}'
+'#rpView.on{display:flex}#rpView *{box-sizing:border-box}'
+'#rpView .rpBar{touch-action:pan-x;display:flex;align-items:center;gap:5px;padding:5px 8px;overflow-x:auto;white-space:nowrap;scrollbar-width:none;flex:none}#rpView .rpBar::-webkit-scrollbar{display:none}'
+'#rpView button{font:600 11px system-ui;color:var(--rf);background:var(--rp);border:1px solid var(--rl);border-radius:8px;padding:5px 9px;cursor:pointer;flex:none}'
+'#rpView button.on{background:#2962ff;border-color:#2962ff;color:#fff}#rpView button.add{border-style:dashed}'
+'#rpView .rpLeg{touch-action:pan-x;display:flex;gap:6px;padding:2px 8px 4px;overflow-x:auto;scrollbar-width:none;flex:none}#rpView .rpLeg::-webkit-scrollbar{display:none}'
+'#rpView .rpChip{flex:none;min-width:118px;border:1px solid var(--rl);background:var(--rp);border-radius:10px;padding:4px 8px;cursor:pointer}#rpView .rpChip.bad{opacity:.75;border-color:#ff9800}'
+'#rpView .rpChip .n{display:flex;align-items:center;gap:5px;font-weight:700;font-size:11px}#rpView .rpChip .d{width:9px;height:9px;border-radius:50%;flex:none}#rpView .rpChip .m{font-weight:600;font-size:8.5px;opacity:.65;letter-spacing:.04em}'
+'#rpView .rpChip .v{font:800 14px system-ui;margin-top:1px}#rpView .rpChip .p{font-size:10px;opacity:.65;margin-top:1px}'
+'#rpView .rpNote{touch-action:pan-y;padding:0 10px 3px;font-size:10.5px;color:#ffb300;line-height:1.35;flex:none;max-height:64px;overflow:auto}#rpView .rpNote div{margin:1px 0}#rpView .rpNote button{font-size:10px;padding:1px 7px;margin-left:6px;border-color:#ffb300;color:#ffb300;background:transparent}'
+'#rpView .rpTime{padding:0 10px 2px;font-size:10.5px;opacity:.75;flex:none;display:flex;justify-content:space-between;gap:8px}'
+'#rpView .rpCh{flex:1;min-height:0;position:relative}#rpView .rpFoot{flex:none;padding:3px 10px 4px;font-size:9.5px;opacity:.55;display:flex;justify-content:space-between;gap:8px}'
+'#rpView .rpPop{position:absolute;left:8px;right:8px;top:44px;max-height:72%;overflow:auto;touch-action:pan-y;background:var(--rp);border:1px solid var(--rl);border-radius:12px;padding:10px;z-index:3;box-shadow:0 12px 34px rgba(0,0,0,.45);display:none}'
+'#rpView .rpPop h4{margin:0 0 6px;font:700 11px system-ui;opacity:.75}#rpView .rpGrid{display:flex;flex-wrap:wrap;gap:6px}'
+'#rpView .rpPop input{width:100%;font:14px system-ui;padding:8px 10px;border-radius:9px;border:1px solid var(--rl);background:var(--rb);color:var(--rf);margin-bottom:6px}'
+'#rpView .rpRow{display:flex;align-items:center;gap:6px;padding:6px 2px;border-bottom:1px solid var(--rl)}#rpView .rpRow b{flex:1;font-size:12.5px}#rpView .rpRow button:disabled{opacity:.3}'
+'#rpView .rpMsg{opacity:.6;padding:8px 2px;font-size:11px}'; document.head.appendChild(s); }

function build(){ if(ui.root) return; css();
  const r=el('div'); r.id='rpView'; r.innerHTML='<div class="rpBar" id="rpB1"></div><div class="rpBar" id="rpB2"></div><div class="rpLeg" id="rpLg"></div><div class="rpNote" id="rpNt"></div><div class="rpTime" id="rpTm"><span id="rpT1"></span><span id="rpT2"></span></div><div class="rpCh" id="rpCh"></div><div class="rpFoot"><span>Past relative performance only. Not a trading signal.</span><span id="rpCn"></span></div><div class="rpPop" id="rpPop"></div>';
  ['pointerdown','mousedown','touchstart','click','dblclick','contextmenu'].forEach(ev=>r.addEventListener(ev,e=>e.stopPropagation()));
  r.addEventListener('click',e=>{ if(!e.target.closest('#rpPop')&&!e.target.closest('button')&&!e.target.closest('.rpChip')) closePop(); });
  $('mw').appendChild(r); ui.root=r; applyTheme();
  const host=$q('#rpCh'), t=TH();
  ui.chart=LightweightCharts.createChart(host,{autoSize:true,layout:{background:{type:'solid',color:t.bg},textColor:t.tx,fontFamily:'Inter,system-ui,sans-serif',fontSize:11},
    grid:{vertLines:{color:t.gr},horzLines:{color:t.gr}},crosshair:{mode:0,vertLine:{color:'rgba(124,140,255,.6)',width:1,style:3,labelBackgroundColor:'#7c8cff'},horzLine:{color:'rgba(124,140,255,.6)',width:1,style:3,labelBackgroundColor:'#7c8cff'}},
    timeScale:{timeVisible:true,secondsVisible:false,rightOffset:4,borderVisible:false},rightPriceScale:{borderVisible:false,scaleMargins:{top:.08,bottom:.08}},
    localization:{priceFormatter:fmtAx}});
  ui.base=ui.chart.addLineSeries({color:t.base,lineWidth:1,lineStyle:2,lastValueVisible:false,priceLineVisible:false,crosshairMarkerVisible:false,priceFormat:{type:'custom',formatter:fmtAx,minMove:0.01}});
  ui.chart.subscribeCrosshairMove(p=>{ ui.hoverT=(p&&p.time)?p.time:null; paintLegend(); });
  try{ new MutationObserver(applyTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']}); }catch(e){}
  document.addEventListener('visibilitychange',()=>{ if(ui.on&&!document.hidden) eng.backfill(); });
  eng.on(onEng); toolbar(); }
function applyTheme(){ if(!ui.root) return; const t=TH(), s=ui.root.style; s.setProperty('--rb',t.bg); s.setProperty('--rf',t.fg); s.setProperty('--rp',t.pn); s.setProperty('--rl',t.ln);
  if(ui.chart){ ui.chart.applyOptions({layout:{background:{type:'solid',color:t.bg},textColor:t.tx},grid:{vertLines:{color:t.gr},horzLines:{color:t.gr}}}); ui.base.applyOptions({color:t.base}); } }

// ---------- toolbar ----------
function btn(p,txt,fn,on,cls){ const b=el('button',(on?'on ':'')+(cls||''),txt); b.type='button'; b.onclick=e=>{ e.stopPropagation(); fn(b); }; p.appendChild(b); return b; }
function toolbar(){ const b1=$q('#rpB1'), b2=$q('#rpB2'); b1.innerHTML=''; b2.innerHTML='';
  const tfl=(RP_TFS.find(x=>x[1]===eng.iv)||['?'])[0];
  btn(b1,'\u23F1 '+tfl+' \u25BE',()=>popTf());
  RP_RANGES.forEach(([k])=>btn(b1,k,()=>{ ui.range=k; ui.custom=null; applyRange(); },ui.range===k));
  btn(b1,ui.range==='CUSTOM'?'\ud83d\udcc5 '+new Date(ui.custom.s).toISOString().slice(0,10):'\ud83d\udcc5 Custom',()=>popCustom(),ui.range==='CUSTOM');
  btn(b2,'% Percent',()=>{ eng.setMode('pct'); toolbar(); saveSt(); },eng.mode==='pct');
  btn(b2,'Index 100',()=>{ eng.setMode('idx'); toolbar(); saveSt(); },eng.mode==='idx');
  btn(b2,'+ Add asset',()=>popAdd(),false,'add');
  btn(b2,'\u2922 Fit',()=>ui.chart.timeScale().fitContent());
  btn(b2,'\u21BA Reset',()=>resetAll());
  btn(b2,'\u2715 Close',()=>{ try{ setCType(0); }catch(e){} }); }
function applyRange(){ const [s,e]=startOf(); toolbar(); saveSt(); eng.setStart(s,e); }
function resetAll(){ ui.range='3M'; ui.custom=null; const p=eng.assets[0]; const s=p?[p.symbol,p.market]:[sym[0],appMarket(sym[0])]; setAssets(defaultSet(s[0],s[1])); eng.mode='pct'; const iv=appIv(); eng.iv=iv||'1d'; const [a,b]=startOf(); eng.startMs=a; eng.endMs=b; toolbar(); saveSt(); eng.load(); }
function defaultSet(s,m){ const alt=s==='BTCUSDT'?'ETHUSDT':'BTCUSDT'; return [[s,m],[alt,m]]; }
function setAssets(list){ eng._seed(list); }

// ---------- popups ----------
function pop(){ const p=$q('#rpPop'); p.innerHTML=''; p.style.display='block'; return p; }
function closePop(){ const p=$q('#rpPop'); if(p){ p.style.display='none'; p.innerHTML=''; } }
function popTf(){ const p=pop(); p.appendChild(el('h4','','Timeframe')); const g=el('div','rpGrid'); p.appendChild(g);
  RP_TFS.forEach(([l,v])=>btn(g,l,()=>{ closePop(); eng.setIv(v); toolbar(); saveSt(); },eng.iv===v));
  const c=el('div','rpMsg','Data: aligned candles of the selected timeframe for every asset.'); p.appendChild(c); }
function popCustom(){ const p=pop(); p.appendChild(el('h4','','Custom range (UTC dates)'));
  const a=el('input'); a.type='date'; a.max=new Date().toISOString().slice(0,10); const b=el('input'); b.type='date'; b.max=a.max;
  const cur=startOf(); a.value=new Date(cur[0]).toISOString().slice(0,10); if(ui.custom&&ui.custom.e) b.value=new Date(ui.custom.e).toISOString().slice(0,10);
  p.appendChild(el('div','rpMsg','Start date = comparison base date')); p.appendChild(a); p.appendChild(el('div','rpMsg','End date (optional, empty = now)')); p.appendChild(b);
  btn(p,'Apply',()=>{ const s=Date.parse(a.value+'T00:00:00Z'); if(!isFinite(s)){ toast('Pick a start date','#ff5d7a'); return; } let e=b.value?Date.parse(b.value+'T23:59:59Z'):null; if(e&&e<=s){ toast('End date must be after the start date','#ff5d7a'); return; } ui.range='CUSTOM'; ui.custom={s,e}; closePop(); applyRange(); },true); }
async function loadLists(){ if(ui.lists.busy||(ui.lists.spot&&ui.lists.futures)) return; ui.lists.busy=true;
  const g=async(u,f)=>{ try{ const j=await (await fetch(u)).json(); return Array.isArray(j)?j.map(x=>x.symbol).filter(s=>/^[A-Z0-9]{4,24}$/.test(s)):null; }catch(e){ return null; } };
  const [s,f]=await Promise.all([g(API+'/api/v3/ticker/price'),g(FAPI+'/fapi/v1/ticker/price')]); ui.lists.spot=s||ui.lists.spot; ui.lists.futures=f||ui.lists.futures; ui.lists.busy=false; }
function popAdd(){ const p=pop(); p.appendChild(el('h4','','Search symbols (Spot and Futures are separate markets)'));
  const inp=el('input'); inp.type='search'; inp.placeholder='BTC, ETH, SOL ...'; inp.autocomplete='off'; inp.autocapitalize='characters'; p.appendChild(inp); const out=el('div'); p.appendChild(out);
  const draw=()=>{ out.innerHTML=''; const q=inp.value.trim().toUpperCase(), S=ui.lists.spot, F=ui.lists.futures;
    if(!S&&!F){ out.appendChild(el('div','rpMsg',ui.lists.busy?'Loading symbols\u2026':'Could not load the symbol lists. Check the connection.')); return; }
    const set=new Map(); (S||[]).forEach(s=>set.set(s,{s:1})); (F||[]).forEach(s=>{ const o=set.get(s)||{}; o.f=1; set.set(s,o); });
    let keys=Array.from(set.keys()); if(q) keys=keys.filter(k=>k.indexOf(q)>-1); else keys=keys.filter(k=>/USDT$/.test(k)).sort(); keys.sort((a,b)=>{ const sa=a.indexOf(q)===0?0:1, sb=b.indexOf(q)===0?0:1; return sa-sb||(/USDT$/.test(a)?0:1)-(/USDT$/.test(b)?0:1)||a.localeCompare(b); });
    keys.slice(0,40).forEach(k=>{ const o=set.get(k), row=el('div','rpRow'); row.appendChild(el('b','',k));
      const add=(m)=>{ const r=eng.addAsset(k,m); if(r==='dup') toast(k+' ('+mk(m)+') is already in the comparison','#f5b942'); else if(r==='max') toast('Maximum 10 assets','#ff5d7a'); else { closePop(); saveSt(); } };
      const bs=btn(row,'Spot',()=>add('spot')); bs.disabled=!o.s; const bf=btn(row,'Futures',()=>add('futures')); bf.disabled=!o.f; out.appendChild(row); });
    if(!keys.length) out.appendChild(el('div','rpMsg','No symbol found')); };
  inp.oninput=draw; draw(); loadLists().then(draw); setTimeout(()=>{ try{ inp.focus(); }catch(e){} },60); }
function popAsset(a){ const p=pop(); p.appendChild(el('h4','',a.symbol+' \u00b7 '+mk(a.market))); const g=el('div','rpGrid'); p.appendChild(g);
  if(a!==eng.assets[0]) btn(g,'Make base asset',()=>{ closePop(); eng.makeBase(a.id); saveSt(); });
  btn(g,'Switch to '+(a.market==='spot'?'Futures':'Spot'),()=>{ const r=eng.switchMarket(a.id); closePop(); if(r==='dup') toast('Already in the comparison','#f5b942'); saveSt(); });
  if(a.status!=='ok'&&a.status!=='loading') btn(g,'Retry',()=>{ closePop(); eng.retry(a.id); });
  if(eng.assets.length>1) btn(g,'Remove',()=>{ closePop(); eng.removeAsset(a.id); saveSt(); });
  if(a.msg) p.appendChild(el('div','rpMsg',a.msg)); }

// ---------- chart sync ----------
function colorFor(a){ if(!ui.colorOf[a.market+a.symbol]){ const used=new Set(Object.values(ui.colorOf)); ui.colorOf[a.market+a.symbol]=COLS.find(c=>!used.has(c))||COLS[a.id%COLS.length]; } return ui.colorOf[a.market+a.symbol]; }
function rebuild(fit){ if(!ui.chart) return; if(fit) ui.hoverT=null; const live=new Set(eng.assets.map(a=>a.id));
  ui.series.forEach((s,id)=>{ if(!live.has(id)){ try{ ui.chart.removeSeries(s.api); }catch(e){} ui.series.delete(id); } });
  const bv=eng.baseValue(), master=eng.masterTimes();
  ui.chart.applyOptions({localization:{priceFormatter:fmtAx}});
  if(ui.baseLine){ try{ ui.base.removePriceLine(ui.baseLine); }catch(e){} ui.baseLine=null; }
  ui.base.setData(master.map(t=>({time:t,value:bv}))); ui.baseT=master.length?master[master.length-1]:0;
  if(master.length) ui.baseLine=ui.base.createPriceLine({price:bv,color:TH().base,lineWidth:1,lineStyle:2,axisLabelVisible:true,title:eng.mode==='idx'?'100':'0%'});
  eng.assets.forEach(a=>{ let s=ui.series.get(a.id);
    if(!s){ s={api:ui.chart.addLineSeries({color:colorFor(a),lineWidth:2,lastValueVisible:true,priceLineVisible:false,crosshairMarkerVisible:true,crosshairMarkerRadius:4,priceFormat:{type:'custom',formatter:fmtAx,minMove:0.01}}),last:0}; ui.series.set(a.id,s); }
    s.api.applyOptions({priceFormat:{type:'custom',formatter:fmtAx,minMove:0.01},visible:a.status==='ok'});
    const pts=eng.points(a,master); s.api.setData(pts); s.last=pts.length?pts[pts.length-1].time:0; });
  if(fit||ui.fit){ try{ ui.chart.timeScale().fitContent(); }catch(e){} ui.fit=false; }
  paintLegend(); paintNotes(); }
function onEng(type,d){ if(!ui.on) return;
  if(type==='rebuild') rebuild(d&&d.fit); else if(type==='status'){ paintLegend(); paintNotes(); } else if(type==='conn') paintConn();
  else if(type==='tick'){ const a=d.asset, s=ui.series.get(a.id); if(!s||a.status!=='ok') return; const t=d.candle.t;
    if(t<s.last){ rebuild(false); return; } s.api.update({time:t,value:eng.value(a,d.candle.c)}); s.last=t; if(t>ui.baseT){ ui.base.update({time:t,value:eng.baseValue()}); ui.baseT=t; } schedLegend(); } }
function schedLegend(){ if(ui.pend) return; ui.pend=true; requestAnimationFrame(()=>{ ui.pend=false; paintLegend(); }); }
function paintLegend(){ if(!ui.root) return; const lg=$q('#rpLg'); lg.innerHTML=''; const T=ui.hoverT;
  eng.assets.forEach(a=>{ const c=el('div','rpChip'+(a.status==='ok'?'':' bad')); c.onclick=e=>{ e.stopPropagation(); popAsset(a); };
    const n=el('div','n'); const d=el('span','d'); d.style.background=colorFor(a); n.appendChild(d); n.appendChild(el('span','',a.symbol.replace(/USDT$/,'')+(a===eng.assets[0]?' \u2605':''))); n.appendChild(el('span','m',mk(a.market))); c.appendChild(n);
    let r=null; if(a.status==='ok') r=T?eng.at(a,T):eng.latest(a);
    const v=el('div','v',a.status==='ok'?(r?fmtV(r.v):(T?'no candle':'\u2014')):a.status==='loading'?'loading\u2026':'\u26A0 '+(a.status==='error'?'error':a.status==='toolong'?'range':'no history'));
    if(r&&eng.mode==='pct') v.style.color=r.v>=0?'#2dd4a7':'#ff5d7a'; c.appendChild(v);
    c.appendChild(el('div','p',r?fmtP(r.p)+(r.live&&!T?' \u00b7 live':''):(a.msg||''))); lg.appendChild(c); });
  const t1=$q('#rpT1'), t2=$q('#rpT2'), m=eng.mode==='pct'?'Percent change':'Indexed (base = 100)'; t1.textContent=T?eng.fmtD(T):(eng.T0!=null?'Base: '+eng.fmtD(eng.T0):''); t2.textContent=m+' \u00b7 '+((RP_TFS.find(x=>x[1]===eng.iv)||[''])[0]); paintConn(); }
function paintConn(){ const c=$q('#rpCn'); if(!c) return; const st=['spot','futures'].filter(m=>eng.assets.some(a=>a.market===m)).map(m=>mk(m).toLowerCase()+': '+({live:'live',connecting:'connecting',reconnecting:'reconnecting\u2026',off:'idle'}[eng.conn[m]]||'idle')); c.textContent=st.join(' \u00b7 '); }
function paintNotes(){ const n=$q('#rpNt'); n.innerHTML=''; const add=(t,fn,lab)=>{ const d=el('div','',t); if(fn){ const b=el('button','',lab); b.type='button'; b.onclick=e=>{ e.stopPropagation(); fn(); }; d.appendChild(b); } n.appendChild(d); };
  eng.notices.forEach(x=>{ if(x.k==='toolong') add(x.t,()=>{ const step=RP_IV[eng.iv]*1000; ui.range='CUSTOM'; ui.custom={s:Date.now()-Math.floor(RP_MAXC*0.95)*step,e:null}; applyRange(); },'Use the latest '+Math.floor(RP_MAXC*0.95)+' candles'); else add(x.t); });
  const bad=eng.assets.filter(a=>a.status==='nohist'); bad.forEach(a=>add(a.symbol+' ('+mk(a.market)+'): '+a.msg+'. Not drawn.')); 
  if(bad.some(a=>a.first!=null)) add('Compare from the first date all assets share?',()=>{ if(eng.rebaseCommon()){ ui.range='CUSTOM'; ui.custom={s:eng.startMs,e:null}; toolbar(); saveSt(); } },'Rebase');
  eng.assets.filter(a=>a.status==='error'||a.status==='nodata').forEach(a=>add(a.symbol+' ('+mk(a.market)+'): '+a.msg));
  eng.assets.filter(a=>a.status==='ok'&&a.gaps>0).forEach(a=>add(a.symbol+': '+a.gaps+' missing candle'+(a.gaps>1?'s':'')+' shown as gaps (not filled).'));
  const q0=quoteOf(eng.assets[0]?eng.assets[0].symbol:''), mixQ=eng.assets.filter(a=>quoteOf(a.symbol)!==q0); if(mixQ.length) add('Different quote currency from the base asset ('+q0+'): '+mixQ.map(a=>a.symbol).join(', ')+'.');
  if(new Set(eng.assets.map(a=>a.market)).size>1) add('Spot and Futures markets are mixed. Each line is labelled with its market.');
  if(eng.T0!=null&&eng.est()<3) add('Very few candles in this range for this timeframe. Choose a longer range or a smaller timeframe.'); }

// ---------- app sync ----------
function seedFromApp(){ const s=sym[0], m=appMarket(s), iv=appIv(); ui.appSym=s; ui.appTf=iv; const st=loadSt();
  if(st&&Array.isArray(st.a)&&st.a.length){ ui.range=st.range||'3M'; ui.custom=st.custom||null; eng.mode=st.mode==='idx'?'idx':'pct'; eng.iv=RP_IV[st.iv]?st.iv:'1d'; eng._seed(st.a);
    if(st.appSym!==s){ followApp(true); } else if(iv&&st.appTf!==iv&&iv!==eng.iv){ eng.iv=iv; } }
  else { eng.iv=iv||'1d'; eng._seed(defaultSet(s,m)); }
  const [a,b]=startOf(); eng.startMs=a; eng.endMs=b; }
function followApp(quiet){ const s=sym[0], m=appMarket(s); ui.appSym=s; const i=eng.assets.findIndex(a=>a.symbol===s&&a.market===m);
  if(i===0) return false; if(i>0){ const a=eng.assets.splice(i,1)[0]; eng.assets.unshift(a); } else { eng._seed([[s,m]].concat(eng.assets.slice(0,RP_MAXA-1).map(a=>[a.symbol,a.market])),true); }
  if(!quiet){ eng.load(); saveSt(); } return true; }
function pollApp(){ if(!ui.on) return; try{ const s=sym[0], iv=appIv();
  if(s!==ui.appSym){ followApp(false); }
  if(iv!==ui.appTf){ ui.appTf=iv; if(iv&&iv!==eng.iv){ eng.setIv(iv); toolbar(); saveSt(); } } }catch(e){} }

const api={
  enter(){ build(); const first=!ui.inited; if(first){ seedFromApp(); ui.inited=true; } else { pollApp(); }
    ui.on=true; ui.root.classList.add('on'); try{ $('legend').style.visibility='hidden'; }catch(e){}
    toolbar(); ui.fit=true; if(first||eng.T0==null||!eng.assets.some(a=>a.status==='ok')){ rebuild(false); eng.load(); } else { eng.resume(); rebuild(true); }
    clearInterval(ui.poll); ui.poll=setInterval(pollApp,800); },
  leave(){ if(!ui.root) return; ui.on=false; closePop(); ui.root.classList.remove('on'); try{ $('legend').style.visibility=''; }catch(e){} clearInterval(ui.poll); eng.pause(); saveSt(); },
  row(){ return '<span style="opacity:.8">Relative performance \u00b7 '+(eng.mode==='pct'?'percent':'indexed')+'</span>'; },
  engine:eng, version:1
};
window.mpRP=api;
try{ if(ctype===21){ api.enter(); } }catch(e){}
})(); }catch(err){ console.error('relative performance failed',err); window.__rpErr=err; }

// =====================================================================================
// [dvq] INDICATOR · "Dual Volume Divergence Index Quantitative Qualitative Estimation [DW]" (port of the TradingView Pine v4 script by DonovanWall)   (self-contained: every name starts with dvq / DVQ)
// DVDI = (EMA of [PVI - EMA(PVI)]) - (EMA of [NVI - EMA(NVI)]).  PVI moves with price on bars where volume rose, NVI against price on bars where volume fell.
// Two trailing levels (fast / slow) are built from the smoothed average range of the oscillator and decide the wave direction.
// Centre line = cumulative average of the oscillator (Dynamic) or 0 (Static).  Own pane with its own scale.
// Hooks: IND.dvq only. Nothing existing is edited.  (Pine fills and bar colouring are not drawn: the chart has no fill-between-lines or candle recolour hook.)
// =====================================================================================
try{
function dvqSrc(q,s){ return s==='open'?q.open:s==='high'?q.high:s==='low'?q.low:s==='hl2'?(q.high+q.low)/2:q.close; }
// Pine EMA(x,t) user function: seeds with the first value, na restarts the seed
function dvqEma(v,t){ const k=2/(t+1), o=new Array(v.length).fill(null); let p=null;
  for(let i=0;i<v.length;i++){ const x=v[i]; if(x==null||!isFinite(x)){ p=null; continue; } p=(p==null)?x:(x-p)*k+p; o[i]=p; } return o; }
// smallest price step of this market, read from the decimals of the recent closes (Pine syminfo.mintick)
function dvqTick(c){ let dec=0; for(let i=Math.max(0,c.length-300);i<c.length;i++){ const x=c[i].close; if(!isFinite(x)) continue; let d=0;
    while(d<8){ const s=x*Math.pow(10,d); if(Math.abs(s-Math.round(s))<1e-6) break; d++; } if(d>dec) dec=d; } return Math.pow(10,-dec); }
// Dual Volume Divergence Index
function dvqDvdi(c,src,t1,t2,vtype){ const n=c.length, tick=dvqTick(c); let vs=0; for(let i=0;i<n;i++) vs+=c[i].volume||0; const hasVol=vs>0;
  const x=c.map(q=>dvqSrc(q,src)), P=new Array(n), N=new Array(n); let tr=0, PVI=0, NVI=0, pv=0, px=0;
  for(let i=0;i<n;i++){ const rng=c[i].close-c[i].open; tr=Math.abs(rng)<tick?tr:rng; const tv=Math.abs(tr)/tick;
    const vol=(vtype==='Tick'||!hasVol)?tv:(c[i].volume||0);
    PVI=vol>pv?PVI+(x[i]-px):PVI; NVI=vol<pv?NVI-(x[i]-px):NVI; P[i]=PVI; N[i]=NVI; pv=vol; px=x[i]; }
  const ps=dvqEma(P,t1), ns=dvqEma(N,t1), pd=dvqEma(P.map((v,i)=>v-ps[i]),t2), nd=dvqEma(N.map((v,i)=>v-ns[i]),t2);
  return pd.map((v,i)=>v-nd[i]); }
// Trailing level (Pine tl): follows x, steps only when x moves further than the smoothed range
function dvqTl(x,t,m){ const n=x.length, w=t*2-1, rg=x.map((v,i)=>i?Math.abs(v-x[i-1]):null), av=dvqEma(rg,w), sm=dvqEma(av,w).map(v=>v==null?null:v*m), o=new Array(n);
  for(let i=0;i<n;i++){ if(i===0||o[i-1]==null||sm[i]==null){ o[i]=x[i]; continue; } const p=o[i-1], r=sm[i];
    o[i]=x[i]>p?((x[i]-r)<p?p:(x[i]-r)):((x[i]+r)>p?p:(x[i]+r)); } return o; }
const DVQ_UP='#05ffa6', DVQ_UP2='#00945f', DVQ_DN='#ff0a70', DVQ_DN2='#990040', DVQ_FL='#cccccc';
function dvqCalc(c,p){ const n=c.length; if(n<3) return [[],[],[],[]];
  const per=Math.max(1,Math.round(p.per)||13), sp=Math.max(1,Math.round(p.smper)||6), fm=+p.fm>=0?+p.fm:2.618, sm=+p.sm>=0?+p.sm:4.236;
  const d=dvqDvdi(c,p.src||'close',per,sp,p.vt), ft=dvqTl(d,per,fm), st=dvqTl(d,per,sm);
  const ce=new Array(n); if(p.ct==='Static'){ ce.fill(0); } else { let s=0; for(let i=0;i<n;i++){ s+=d[i]; ce[i]=s/(i+1); } }
  const A=[],B=[],C=[],D=[];
  for(let i=0;i<n;i++){ const t=c[i].time, v=d[i], f=ft[i], s=st[i], m=ce[i];
    if(![v,f,s,m].every(isFinite)) continue;
    const col=(v>f&&v>s&&v>m)?DVQ_UP:(v<f&&v<s&&v>m)?DVQ_UP2:(v<f&&v<s&&v<m)?DVQ_DN:(v>f&&v>s&&v<m)?DVQ_DN2:DVQ_FL;
    const pm=i?ce[i-1]:null, cc=pm==null?DVQ_FL:m>pm?DVQ_UP:m<pm?DVQ_DN:DVQ_FL;
    A.push({time:t,value:v,color:col}); B.push({time:t,value:s}); C.push({time:t,value:f}); D.push({time:t,value:m,color:cc}); }
  return [A,B,C,D]; }
IND.dvq={label:'DVDIQQE [DW] \u2013 Dual Volume Divergence Index QQE: volume-pressure wave with fast and slow trailing levels',cat:'Momentum',
  nm:p=>'DVDIQQE '+p.per+' '+p.smper,
  p:{src:'close',per:13,smper:6,vt:'Default',fm:2.618,sm:4.236,ct:'Dynamic'},
  cols:['#05ffa6','#ffffff','#9aa3b5','#cccccc'],kinds:['line','dots','dots','line'],pane:2,
  fields:[['src','sel','Source',{opts:['close','open','high','low','hl2']}],['per','num','Sampling period',{min:1,max:200,step:1}],['smper','num','Smoothing period',{min:1,max:100,step:1}],
    ['vt','sel','Volume type (Tick = use candle size instead of real volume)',{opts:['Default','Tick']}],['fm','num','Fast trailing level range multiplier',{min:0,max:20,step:0.001}],['sm','num','Slow trailing level range multiplier',{min:0,max:20,step:0.001}],
    ['ct','sel','Center line type',{opts:['Dynamic','Static']}]],
  calc:dvqCalc};
try{ DESC.dvq='Volume-pressure oscillator with fast and slow trailing levels: green above the centre line and both levels = strong up wave, pink below = strong down wave'; }catch(e){}
}catch(err){ console.error('dvq indicator failed',err); window.__dvqErr=err; }

//# sourceURL=tools-7.js
/*@@part 15*/
(function(){
'use strict';
var G=(typeof window!=='undefined')?window:globalThis;
/* ====================================================================================================
   CORE  (pure logic + Binance feed — no DOM; unit-tested in Node, also used by collector/collector.js)
   Real Binance depth only. Resting limit orders are NEVER mixed with executed trades or candles.
   Segment format (snapshot + delta):  seg={t0,t1,open,why,snaps:[{t,di,ds,id,lo,hi,kLo,kHi,b:[[p,q]],a:[[p,q]]}],
                                            deltas:[{t,s,id,c:[[side,price,oldQty,newQty]]}]}   side 0=bid 1=ask
   ==================================================================================================== */
function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }

/* ---------- order book with Binance snapshot + diff synchronisation ----------
   Spot   : drop u<=lastUpdateId; first event needs U<=L+1<=u; afterwards U must equal previous u+1.
   Futures: drop u<L;             first event needs U<=L<=u;   afterwards pu must equal previous u.   */
function OB(mk){ this.mk=mk==='F'?'F':'S'; this.resyncs=0; this.reset(''); }
OB.prototype.reset=function(why){ this.bids=new Map(); this.asks=new Map(); this.lastId=0; this.lastU=0; this.synced=false; this.haveSnap=false;
  this.needSnap=true; this.buf=[]; this.why=why||''; this.kLo=null; this.kHi=null; this.rbuf=null; };
OB.prototype._side=function(m,arr,sd,ch){
  for(var i=0;i<arr.length;i++){
    var p=+arr[i][0], q=+arr[i][1]; if(!(p>0)||!(q>=0)||!isFinite(p+q)) continue;
    var o=m.get(p)||0;
    if(q===0){ if(o===0) continue; m.delete(p); } else { if(q===o) continue; m.set(p,q); }
    if(ch) ch.push([sd,p,o,q]);
  }
};
OB.prototype._seq=function(ev){
  if(ev.u<=this.lastU) return 'old';                       // duplicate or older than what is already applied
  if(this.mk==='S') return ev.U===this.lastU+1?'ok':'gap';
  return ev.pu===this.lastU?'ok':'gap';
};
OB.prototype.invalidate=function(why){ var b=this.buf; this.reset(why); this.buf=b; this.resyncs++; };   // book cleared: never shown as live
OB.prototype.feed=function(ev){
  if(!ev||!isFinite(ev.U)||!isFinite(ev.u)||ev.u<ev.U||!Array.isArray(ev.b)||!Array.isArray(ev.a)) return {r:'bad'};
  if(this.rbuf) this.rbuf.push(ev);
  if(!this.synced){ this.buf.push(ev); if(this.buf.length>20000) this.buf.shift(); if(!this.haveSnap) return {r:'buffered'};
    var d=this._drain();
    if(d.r==='synced'&&d.applied.length){ var ch=[]; d.applied.forEach(function(x){ ch.push.apply(ch,x.ch); }); return {r:'applied',ch:ch,ev:ev,justSynced:true}; }
    return d; }
  return this._apply(ev);
};
OB.prototype._apply=function(ev){
  var s=this._seq(ev); if(s==='old') return {r:'dup'};
  if(s==='gap'){ this.invalidate('sequence gap: expected '+(this.mk==='S'?'U='+(this.lastU+1):'pu='+this.lastU)+', got U='+ev.U+(ev.pu!=null?' pu='+ev.pu:'')); this.buf.push(ev); return {r:'gap'}; }
  var ch=[]; this._side(this.bids,ev.b,0,ch); this._side(this.asks,ev.a,1,ch); this.lastU=ev.u; return {r:'applied',ch:ch,ev:ev};
};
function edge(m,lo){ var e=null; m.forEach(function(_,p){ if(e===null||(lo?p<e:p>e)) e=p; }); return e; }
OB.prototype.setSnapshot=function(s){
  this.bids=new Map(); this.asks=new Map(); this._side(this.bids,s.bids||[],0,null); this._side(this.asks,s.asks||[],1,null);
  this.lastId=+s.lastUpdateId; this.lastU=this.lastId; this.haveSnap=true; this.synced=false; this.needSnap=false; this.rbuf=null;
  var lim=s.limit||Infinity;          // a side that returned the full level limit is only known out to its last level; a shorter side is known completely
  this.kLo=this.bids.size>=lim?edge(this.bids,true):null; this.kHi=this.asks.size>=lim?edge(this.asks,false):null;
  return this._drain();
};
OB.prototype._drain=function(){
  var applied=[];
  while(this.buf.length){
    var ev=this.buf[0];
    if(!this.synced){
      var L=this.lastId;
      if(this.mk==='S'?ev.u<=L:ev.u<L){ this.buf.shift(); continue; }
      var ok=this.mk==='S'?(ev.U<=L+1&&ev.u>=L+1):(ev.U<=L&&ev.u>=L);
      if(!ok){ this.haveSnap=false; this.needSnap=true; this.why='snapshot is older than the first buffered update'; return {r:'need-snap',applied:applied}; }
      this.buf.shift(); var ch=[]; this._side(this.bids,ev.b,0,ch); this._side(this.asks,ev.a,1,ch); this.lastU=ev.u; this.synced=true; applied.push({ev:ev,ch:ch}); continue;
    }
    this.buf.shift(); var r=this._apply(ev);
    if(r.r==='applied') applied.push({ev:ev,ch:r.ch}); else if(r.r==='gap') return {r:'gap',applied:applied};
  }
  return {r:this.synced?'synced':'waiting',applied:applied};
};
OB.prototype.best=function(){ var b=edge(this.bids,false), a=edge(this.asks,true); return {bid:b,ask:a,mid:(b!=null&&a!=null)?(b+a)/2:null}; };
OB.prototype.crossed=function(){ var x=this.best(); return x.bid!=null&&x.ask!=null&&x.bid>=x.ask; };
/* Scheduled integrity refresh: while the stream keeps running, a fresh REST snapshot is replayed with the buffered updates and compared with the
   live book. Levels inside the snapshot range that differ are corrected and counted; the known depth range follows the newest snapshot. */
OB.prototype.refreshBegin=function(){ this.rbuf=[]; };
OB.prototype.refreshEnd=function(s){
  var rb=this.rbuf||[]; this.rbuf=null; if(!this.synced) return {ok:false,reason:'not synced',retry:false};
  var L=+s.lastUpdateId, cb=new Map(), ca=new Map(), last=L, first=true, i, ev;
  this._side(cb,s.bids||[],0,null); this._side(ca,s.asks||[],1,null);
  for(i=0;i<rb.length;i++){
    ev=rb[i]; if(this.mk==='S'?ev.u<=L:ev.u<L) continue;
    if(first){ var ok=this.mk==='S'?(ev.U<=L+1&&ev.u>=L+1):(ev.U<=L&&ev.u>=L); if(!ok) return {ok:false,reason:'refresh snapshot older than buffered updates',retry:true}; first=false; }
    else if(this.mk==='S'?ev.U!==last+1:ev.pu!==last) return {ok:false,reason:'refresh sequence gap',retry:false};
    this._side(cb,ev.b,0,null); this._side(ca,ev.a,1,null); last=ev.u;
  }
  if(last!==this.lastU) return {ok:false,reason:'refresh snapshot and live stream are at different update ids',retry:true};
  var lim=s.limit||Infinity, nLo=cb.size>=lim?edge(cb,true):null, nHi=ca.size>=lim?edge(ca,false):null, ch=[], diffs=0, self=this;
  function fix(live,cand,sd,lo,hi){
    cand.forEach(function(q,p){ if((live.get(p)||0)!==q){ diffs++; self._side(live,[[p,q]],sd,ch); } });
    var del=[]; live.forEach(function(q,p){ if(p>=lo&&p<=hi&&!cand.has(p)) del.push(p); });
    del.forEach(function(p){ diffs++; self._side(live,[[p,0]],sd,ch); });
  }
  fix(this.bids,cb,0,nLo==null?0:nLo,Infinity); fix(this.asks,ca,1,0,nHi==null?Infinity:nHi);   // compare only inside the snapshot's own range
  /* levels outside the old range stayed known through the diff stream, so the known range only grows within a segment */
  this.kLo=(nLo==null||this.kLo==null)?null:Math.min(this.kLo,nLo); this.kHi=(nHi==null||this.kHi==null)?null:Math.max(this.kHi,nHi);
  return {ok:true,diffs:diffs,ch:ch};
};

/* ---------- snapshot + delta store ---------- */
function Store(o){ o=o||{}; this.snapEvery=o.snapEvery||60000; this.win=o.win||0.15; this.maxMs=o.maxMs||0; this.keep=o.keep!==false;
  this.segs=[]; this.cur=null; this.curSnap=null; this.lastT=0; this.seq=0; this.startedAt=0; this.on={snap:o.onSnap,delta:o.onDelta,seg:o.onSeg}; }
Store.prototype.begin=function(t,ob,why){
  this.end(t,'new segment'); t=Math.max(t,this.lastT); this.lastT=t;
  var seg={t0:t,t1:t,open:true,why:'',snaps:[],deltas:[]}; this.cur=seg; if(this.keep) this.segs.push(seg);
  if(!this.startedAt) this.startedAt=t;
  if(this.on.seg) this.on.seg('begin',seg,why||''); this.snap(t,ob);
};
Store.prototype.end=function(t,why){
  var c=this.cur; if(!c) return; c.open=false; c.why=why||''; if(t) c.t1=Math.max(c.t1,t); this.cur=null; this.curSnap=null;
  if(this.on.seg) this.on.seg('end',c,why||'');
};
Store.prototype.snap=function(t,ob){
  var seg=this.cur; if(!seg) return; var b=ob.best(); if(b.mid==null) return;
  t=Math.max(t,this.lastT); this.lastT=t; var lo=b.mid*(1-this.win), hi=b.mid*(1+this.win), bb=[], aa=[];
  ob.bids.forEach(function(q,p){ if(p>=lo&&p<=hi) bb.push([p,q]); }); ob.asks.forEach(function(q,p){ if(p>=lo&&p<=hi) aa.push([p,q]); });
  var sn={t:t,di:seg.deltas.length,ds:this.seq,id:ob.lastU,lo:lo,hi:hi,kLo:ob.kLo,kHi:ob.kHi,b:bb,a:aa};
  seg.snaps.push(sn); this.curSnap=sn; seg.t1=Math.max(seg.t1,t); if(this.on.snap) this.on.snap(seg,sn);
};
Store.prototype.record=function(t,ob,ch){
  var seg=this.cur, sn=this.curSnap; if(!seg||!sn) return;
  t=Math.max(t,this.lastT); this.lastT=t; var c=[];
  for(var i=0;i<ch.length;i++){ var p=ch[i][1]; if(p>=sn.lo&&p<=sn.hi) c.push(ch[i]); }
  if(c.length){ var d={t:t,s:this.seq++,id:ob.lastU,c:c}; seg.deltas.push(d); if(this.on.delta) this.on.delta(seg,d); }
  seg.t1=t; if(t-sn.t>=this.snapEvery) this.snap(t,ob);
  if(this.maxMs) this.trim(t-this.maxMs);
};
Store.prototype.trim=function(cut){
  var keep=[], i, j;
  for(i=0;i<this.segs.length;i++){
    var s=this.segs[i]; if(!s.open&&s.t1<cut) continue;
    var k=-1; for(j=0;j<s.snaps.length;j++){ if(s.snaps[j].t<=cut) k=j; else break; }
    if(k>0){ var di=s.snaps[k].di; s.snaps=s.snaps.slice(k); s.deltas=s.deltas.slice(di); s.snaps.forEach(function(x){ x.di-=di; }); s.t0=s.snaps[0].t; }
    keep.push(s);
  }
  this.segs=keep;
};
function bsearch(arr,t,key){ var lo=0,hi=arr.length-1,r=-1; while(lo<=hi){ var m=(lo+hi)>>1; if(arr[m][key]<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function applyC(bm,am,c){ for(var i=0;i<c.length;i++){ var m=c[i][0]===0?bm:am; if(c[i][3]>0) m.set(c[i][1],c[i][3]); else m.delete(c[i][1]); } }
/* Book state at time t inside one segment (latest snapshot at or before t, then the deltas after it). null when t is outside the segment. */
function stateAt(seg,t){
  if(t<seg.t0||t>seg.t1) return null; var k=bsearch(seg.snaps,t,'t'); if(k<0) return null; var sn=seg.snaps[k], bm=new Map(sn.b), am=new Map(sn.a);
  for(var i=sn.di;i<seg.deltas.length&&seg.deltas[i].t<=t;i++) applyC(bm,am,seg.deltas[i].c);
  return {bids:bm,asks:am,snap:sn};
}
/* Coverage: continuous recorded periods. Everything between them is a gap (no data, never interpolated). */
function coverage(segs){ var a=segs.filter(function(s){ return s.snaps.length; }).map(function(s){ return {t0:s.t0,t1:s.t1,why:s.why||''}; }).sort(function(x,y){ return x.t0-y.t0; });
  return {start:a.length?a[0].t0:null,end:a.length?a[a.length-1].t1:null,segments:a}; }

/* ---------- heatmap grid: time (columns) × price (rows), real resting liquidity only ----------
   value = base quantity (mode 'b') or quote notional price×qty (mode 'q'). -1 = outside the known depth range (unknown, not zero). */
function buildGrid(segs,o){
  var cols=o.cols, rows=o.rows, pLo=o.pLo, pHi=o.pHi, q=o.mode!=='b', dt=(o.t1-o.t0)/cols, h=(pHi-pLo)/rows, N=cols*rows;
  var bid=new Float32Array(N), ask=new Float32Array(N), mid=new Float64Array(cols).fill(NaN), ok=new Uint8Array(cols), gapBefore=0, c, si, i;
  var ss=segs.filter(function(s){ return s.snaps.length; }).sort(function(a,b){ return a.t0-b.t0; }), cur=null, work=null;
  for(c=0;c<cols;c++){
    var te=o.t0+(c+1)*dt, seg=null;
    for(si=0;si<ss.length;si++){ if(ss[si].t0<=te&&ss[si].t1>=o.t0+c*dt){ seg=ss[si]; break; } }
    if(!seg) continue; var tt=Math.min(te,seg.t1); if(tt<seg.t0) continue;
    var k=bsearch(seg.snaps,tt,'t'); if(k<0) continue; var sn=seg.snaps[k];
    if(!work||work.seg!==seg||work.k!==k){ work={seg:seg,k:k,sn:sn,bm:new Map(sn.b),am:new Map(sn.a),i:sn.di}; }
    if(!o.snapOnly){ while(work.i<seg.deltas.length&&seg.deltas[work.i].t<=tt){ applyC(work.bm,work.am,seg.deltas[work.i].c); work.i++; } }
    ok[c]=1; var base=c*rows, bestB=-Infinity, bestA=Infinity;
    var lo=Math.max(sn.lo,sn.kLo==null?-Infinity:sn.kLo), hi=Math.min(sn.hi,sn.kHi==null?Infinity:sn.kHi), r;
    for(r=0;r<rows;r++){ var pc=pLo+(r+0.5)*h; if(pc<lo||pc>hi){ bid[base+r]=-1; ask[base+r]=-1; } }
    work.bm.forEach(function(qty,p){ if(p>bestB) bestB=p; var r=Math.floor((p-pLo)/h); if(r<0||r>=rows||bid[base+r]<0) return; bid[base+r]+=q?p*qty:qty; });
    work.am.forEach(function(qty,p){ if(p<bestA) bestA=p; var r=Math.floor((p-pLo)/h); if(r<0||r>=rows||ask[base+r]<0) return; ask[base+r]+=q?p*qty:qty; });
    if(bestB>0&&bestA<Infinity) mid[c]=(bestB+bestA)/2;
  }
  return {cols:cols,rows:rows,t0:o.t0,t1:o.t1,pLo:pLo,pHi:pHi,mode:q?'q':'b',bid:bid,ask:ask,mid:mid,ok:ok,snapOnly:!!o.snapOnly};
}

/* ---------- liquidity walls ---------- */
/* vals: per-price-bin values for ONE side (-1 = unknown). A bin is a wall when ALL enabled conditions hold:
   v >= minV (absolute threshold), v >= ratio × median of the positive neighbours within ±k bins, v >= the pct-th percentile of positive bins. */
function detectWalls(vals,o){
  o=o||{}; var k=o.k||10, ratio=o.ratio==null?3:o.ratio, minV=o.minV||0, pct=o.pct==null?0.95:o.pct, n=vals.length, pos=[], i, j, out=[];
  for(i=0;i<n;i++) if(vals[i]>0) pos.push(vals[i]); if(!pos.length) return out;
  pos.sort(function(a,b){ return a-b; }); var pv=pos[Math.min(pos.length-1,Math.floor(pct*pos.length))];
  for(i=0;i<n;i++){
    var v=vals[i]; if(!(v>0)||v<minV||v<pv) continue; var nb=[];
    for(j=Math.max(0,i-k);j<=Math.min(n-1,i+k);j++) if(j!==i&&vals[j]>0) nb.push(vals[j]);
    var ref=0; if(nb.length){ nb.sort(function(a,b){ return a-b; }); ref=nb.length%2?nb[(nb.length-1)/2]:(nb[nb.length/2-1]+nb[nb.length/2])/2; }
    if(ref>0&&v<ratio*ref) continue; out.push({i:i,v:v,ref:ref});
  }
  return out;
}
/* Wall life cycle. Public depth has no order ids, so a wall that vanishes at one price and a similar one that appears at another cannot be tied
   together reliably: nothing is ever labelled "moved", and a removal is "removed from the displayed book" (cancel OR fill, not distinguishable). */
function WallTracker(){ this.m=new Map(); }
WallTracker.prototype.update=function(t,det,cur,step,reduceBelow){   // det: Map key→{side,price,v}; cur: Map key→current value for that bin
  var self=this; reduceBelow=reduceBelow||0.5;
  det.forEach(function(w,key){ var e=self.m.get(key);
    if(!e||e.status==='removed'){ e={key:key,side:w.side,price:w.price,first:t,last:t,peak:w.v,v:w.v,status:'active',removedAt:0}; self.m.set(key,e); }
    e.last=t; e.v=w.v; e.peak=Math.max(e.peak,w.v); e.status=w.v<reduceBelow*e.peak?'reduced':'active'; });
  self.m.forEach(function(e,key){ if(det.has(key)) return; var v=cur.get(key)||0; e.v=v;
    if(e.status==='removed') return; if(v<=0){ e.status='removed'; e.removedAt=t; } else e.status=v<reduceBelow*e.peak?'reduced':'active'; });
  var dead=[]; self.m.forEach(function(e,key){ if(e.status==='removed'&&t-e.removedAt>600000) dead.push(key); }); dead.forEach(function(k){ self.m.delete(k); });
};
WallTracker.prototype.list=function(){ var a=[]; this.m.forEach(function(e){ a.push(e); }); return a.sort(function(x,y){ return y.v-x.v; }); };

/* ---------- imbalance & movement ---------- */
function imbalance(bids,asks,mid,pct,mode,kLo,kHi){
  var lo=mid*(1-pct/100), hi=mid*(1+pct/100), b=0, a=0, q=mode!=='b';
  bids.forEach(function(qty,p){ if(p>=lo&&p<=mid) b+=q?p*qty:qty; }); asks.forEach(function(qty,p){ if(p<=hi&&p>=mid) a+=q?p*qty:qty; });
  var tot=b+a;
  return {bid:b,ask:a,imb:tot>0?(b-a)/tot*100:null,pct:pct,lo:lo,hi:hi,limited:(kLo!=null&&kLo>lo)||(kHi!=null&&kHi<hi)};
}
function movement(deltas,t0,t1,lo,hi){          // displayed-liquidity change, NOT executed trades
  var r={addBid:0,remBid:0,addAsk:0,remAsk:0,n:0}; var k=bsearch(deltas,t0-1,'t');
  for(var i=k+1;i<deltas.length&&deltas[i].t<=t1;i++){ r.n++;
    var c=deltas[i].c; for(var j=0;j<c.length;j++){ var p=c[j][1]; if(lo!=null&&(p<lo||p>hi)) continue; var d=(c[j][3]-c[j][2])*p;
      if(c[j][0]===0){ if(d>0) r.addBid+=d; else r.remBid-=d; } else { if(d>0) r.addAsk+=d; else r.remAsk-=d; } } }
  r.netBid=r.addBid-r.remBid; r.netAsk=r.addAsk-r.remAsk; return r;
}
/* colour intensity 0..1 for a value (linear / log / per-column relative) */
function intensity(v,scale,vmax,min,gain){
  if(!(v>0)||v<min||!(vmax>0)) return 0; var t;
  if(scale==='log'){ var ref=Math.max(min,vmax*1e-3); t=Math.log1p(v/ref)/Math.log1p(vmax/ref); } else t=v/vmax;
  t*=gain; return t>1?1:t<0?0:t;
}
function quoteOf(sym){ var Q=['USDT','USDC','FDUSD','BUSD','TUSD','USDP','USD','BTC','ETH','BNB','EUR','TRY','BRL','GBP','JPY']; sym=String(sym); for(var i=0;i<Q.length;i++) if(sym.length>Q[i].length&&sym.slice(-Q[i].length)===Q[i]) return {base:sym.slice(0,-Q[i].length),quote:Q[i]}; return {base:sym,quote:''}; }

/* ---------- live Binance feed (browser and Node ≥22) ---------- */
function Feed(o){
  this.o=o; this.mk=o.market==='F'?'F':'S'; this.sym=String(o.symbol).toUpperCase(); this.ob=new OB(this.mk);
  this.store=o.store||new Store(o.storeOpt); this.stale=o.staleMs||20000; this.refreshEvery=o.refreshEvery==null?600000:o.refreshEvery;
  this.minSnapGap=o.minSnapGap||2000; this.state='connecting'; this.lastMsg=0; this.lastApplied=0; this.err=''; this.gen=0; this.ws=null; this.timer=null;
  this.stopped=true; this.fails=0; this.fetching=false; this.nextSnapAt=0; this.refreshing=false; this.lastRefresh=0; this.audit={checks:0,diffs:0,last:0}; this.msgs=0;
}
Feed.prototype.status=function(){
  if(this.stopped) return 'disconnected'; if(this.state==='reconnecting') return this.fails>5?'disconnected':'reconnecting';
  if(!this.ob.synced||!this.store.cur) return 'connecting';
  return (Date.now()-this.lastMsg>this.stale)?'stale':'live';
};
Feed.prototype._emit=function(){ var s=this.status(); if(s!==this._last){ this._last=s; if(this.o.onStatus) this.o.onStatus(s,this); } };
Feed.prototype.start=function(){
  if(!this.stopped) return; this.stopped=false; var self=this; this._open();
  this.timer=setInterval(function(){ self._tick(); },1000);
};
Feed.prototype.stop=function(){ this.stopped=true; this.gen++; if(this.timer){ clearInterval(this.timer); this.timer=null; } try{ if(this.ws) this.ws.close(); }catch(e){} this.ws=null; this.store.end(Date.now(),'stopped'); this.ob.reset('stopped'); this._emit(); };
Feed.prototype._open=function(){
  var self=this, g=++this.gen, ws; this.state='connecting'; this.ob.reset('connecting'); this.fetching=false; this._emit();
  try{ ws=new WebSocket(this.o.wsBase+this.sym.toLowerCase()+'@depth@100ms'); }catch(e){ this.err='WebSocket unavailable'; this._lost(g); return; }
  this.ws=ws;
  ws.onopen=function(){ if(g!==self.gen) return; self.fails=0; self.err=''; self.snap(); };
  ws.onmessage=function(m){ if(g!==self.gen) return; var ev; try{ var j=JSON.parse(m.data); ev={U:j.U,u:j.u,pu:j.pu,b:j.b,a:j.a,E:j.E,T:j.T}; if(j.e!=='depthUpdate') return; }catch(e){ return; } self._msg(ev); };
  ws.onerror=function(){ if(g!==self.gen) return; self.err='WebSocket error'; };
  ws.onclose=function(){ if(g!==self.gen) return; self._lost(g); };
};
Feed.prototype._lost=function(g){
  if(this.stopped) return; this.gen++; this.fails++; this.store.end(Date.now(),'connection lost'); this.ob.reset('connection lost'); this.state='reconnecting'; this._emit();
  var self=this, d=Math.min(30000,1000*Math.pow(2,Math.min(this.fails,5)))*(0.75+Math.random()*0.5); this.rt=setTimeout(function(){ if(!self.stopped) self._open(); },d);
};
Feed.prototype._msg=function(ev){
  var now=Date.now(); this.lastMsg=now; this.msgs++; var r=this.ob.feed(ev), t=this.o.useEventTime&&ev.E?ev.E:now;
  if(r.r==='applied'){ this.lastApplied=now; if(!this.store.cur){ this.store.begin(t,this.ob,''); this.lastRefresh=now; } else this.store.record(t,this.ob,r.ch); if(this.o.onUpdate) this.o.onUpdate(r.ch,t); }   // the update that completes the sync opens the recording segment (its changes are inside that first snapshot)
  else if(r.r==='gap'){ this.store.end(t,this.ob.why); this._emit(); this.snap(); }
  else if(r.r==='buffered'||r.r==='waiting'||r.r==='need-snap'){ if(this.ob.needSnap&&!this.fetching) this.snap(); }
  this._emit();
};
Feed.prototype._fetchSnap=async function(){
  var wait=this.nextSnapAt-Date.now(); if(wait>0) await sleep(wait);
  var r=await fetch(this.o.restBase+'?symbol='+this.sym+'&limit=1000');
  this.nextSnapAt=Date.now()+this.minSnapGap;
  if(r.status===429||r.status===418){ var ra=+((r.headers&&r.headers.get&&r.headers.get('Retry-After'))||0); this.nextSnapAt=Date.now()+Math.max(ra,r.status===418?120:30)*1000; var e=new Error('Binance rate limit ('+r.status+') — backing off '+Math.round((this.nextSnapAt-Date.now())/1000)+'s'); e.rate=true; throw e; }
  if(!r.ok){ var j0={}; try{ j0=await r.json(); }catch(x){} throw new Error(j0.msg||('Binance depth HTTP '+r.status)); }
  var j=await r.json(); if(!j||!isFinite(j.lastUpdateId)||!Array.isArray(j.bids)||!Array.isArray(j.asks)) throw new Error('Unexpected depth snapshot');
  j.limit=1000; return j;
};
Feed.prototype.snap=async function(){
  if(this.fetching||this.stopped||this.ob.synced||this.ob.haveSnap) return; var g=this.gen, self=this; this.fetching=true;   // never replace a book that is already synchronised
  try{
    var j=await this._fetchSnap(); if(g!==this.gen||this.stopped) return;
    var res=this.ob.setSnapshot(j); this.err='';
    if(res.r==='synced'||(res.r==='waiting'&&this.ob.synced)){ if(!this.store.cur) this.store.begin(this.o.useEventTime?(this.lastMsg||Date.now()):Date.now(),this.ob,this.ob.why); this.lastRefresh=Date.now(); }
    else if(res.r==='need-snap'||res.r==='gap'){ this.store.end(Date.now(),this.ob.why); this.fetching=false; setTimeout(function(){ if(g===self.gen) self.snap(); },200); return; }
  }catch(e){ this.err=(e&&e.message)||'snapshot failed'; this.fetching=false; var d=e&&e.rate?Math.max(1000,this.nextSnapAt-Date.now()):3000; setTimeout(function(){ if(g===self.gen&&!self.stopped&&!self.ob.synced) self.snap(); },d); this._emit(); return; }
  this.fetching=false; this._emit();
};
Feed.prototype._refresh=async function(){
  if(this.refreshing||this.fetching||!this.ob.synced||!this.store.cur) return; var g=this.gen; this.refreshing=true;
  for(var tries=0;tries<3&&g===this.gen;tries++){
    this.ob.refreshBegin();
    try{
      var j=await this._fetchSnap(); if(g!==this.gen) break; var rs=this.ob.refreshEnd(j);
      if(rs.ok){ this.audit.checks++; this.audit.diffs+=rs.diffs; this.audit.last=rs.diffs; var t=Date.now(); if(rs.ch.length) this.store.record(t,this.ob,rs.ch); this.store.snap(t,this.ob); this.lastRefresh=t; break; }
      if(!rs.retry) { this.lastRefresh=Date.now()-this.refreshEvery+30000; break; }
    }catch(e){ this.ob.rbuf=null; this.err=(e&&e.message)||'refresh failed'; this.lastRefresh=Date.now()-this.refreshEvery+60000; break; }
  }
  this.ob.rbuf=null; this.refreshing=false;
};
Feed.prototype._tick=function(){
  if(this.stopped) return;
  if(this.ob.synced&&this.ob.crossed()){ this.store.end(Date.now(),'crossed book'); this.ob.invalidate('crossed book (bid >= ask)'); this.snap(); }
  if(this.refreshEvery&&this.ob.synced&&Date.now()-this.lastRefresh>=this.refreshEvery) this._refresh();
  this._emit();
};
G.mpLH={core:{OB:OB,Store:Store,Feed:Feed,stateAt:stateAt,coverage:coverage,buildGrid:buildGrid,detectWalls:detectWalls,WallTracker:WallTracker,imbalance:imbalance,movement:movement,intensity:intensity,quoteOf:quoteOf,bsearch:bsearch}};

/* ====================================================================================================
   UI  (only inside the app)  — independent overlay on #mw, own canvas, no effect on any other chart type
   ==================================================================================================== */
if(typeof document==='undefined'||typeof $==='undefined'||typeof API==='undefined') return;

var KEY='mpvLHv1';
var RANGES=[['5m',300e3],['15m',900e3],['30m',1800e3],['1h',3600e3],['4h',14400e3],['12h',43200e3],['24h',86400e3],['7d',604800e3],['Custom',0]];
var S={ctl:null,market:'S',symbol:'BTCUSDT',range:'15m',mode:'q',scale:'log',gain:1,min:0,depth:1,win:0.5,res:4,bids:true,asks:true,walls:true,wr:3,wmin:0,api:'',cFrom:'',cTo:''};
var shown=false, ui=null, feed=null, timer=null, view=null, hover=null, tracker=new WallTracker(), wallStep=0, lastMid=null, raf=0, srv={key:'',grid:null,meta:null,t:0,busy:false,err:''};
var symLists={S:null,F:null}, symBusy=false, addMk='S', drag=null, ptrs={}, pinch=null, LUT=null, og=null, lastDraw={}, wallInfo={bid:null,ask:null,n:0};
var WSB=(typeof WSS!=='undefined'?WSS:'wss://stream.binance.com:9443'), FWSB=(typeof FWSS!=='undefined'?FWSS:'wss://fstream.binance.com');

function saveS(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
function loadS(){
  var had=false; try{ var raw=localStorage.getItem(KEY); had=!!raw; var j=JSON.parse(raw||'null')||{};
    ['market','symbol','range','mode','scale','api','cFrom','cTo'].forEach(function(k){ if(typeof j[k]==='string') S[k]=j[k]; });
    ['gain','min','depth','win','res','wr','wmin'].forEach(function(k){ if(typeof j[k]==='number'&&isFinite(j[k])) S[k]=j[k]; }); ['bids','asks','walls','ctl'].forEach(function(k){ if(typeof j[k]==='boolean') S[k]=j[k]; }); }catch(e){}
  if(!/^[A-Z0-9]{3,24}$/.test(S.symbol)) S.symbol='BTCUSDT'; if(S.market!=='F') S.market='S'; if(!RANGES.some(function(r){ return r[0]===S.range; })) S.range='15m';
  if(['q','b'].indexOf(S.mode)<0) S.mode='q'; if(['log','lin','rel'].indexOf(S.scale)<0) S.scale='log'; if(S.api&&!/^https?:\/\//.test(S.api)) S.api='';
  if(!had){ try{ var s0=String(sym[0]||'').toUpperCase(); if(/^[A-Z0-9]{3,24}$/.test(s0)){ S.symbol=s0; S.market=isPerp(s0)?'F':'S'; } }catch(e){} }
}
function h(tag,cls,txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function pad(n){ return (n<10?'0':'')+n; }
function fmtN(v,d){ if(v==null||!isFinite(v)) return '—'; var a=Math.abs(v); return a>=1e9?(v/1e9).toFixed(2)+'B':a>=1e6?(v/1e6).toFixed(2)+'M':a>=1e4?(v/1e3).toFixed(1)+'K':a>=100?v.toFixed(0):a>=1?v.toFixed(d==null?2:d):a===0?'0':v.toPrecision(3); }
function fmtP(p,span){ if(p==null||!isFinite(p)) return '—'; var d=span>=100?2:span>=1?3:span>=0.01?5:7; if(p>=1000&&span>=1) d=2; return p.toFixed(Math.max(0,Math.min(8,d))); }
function fmtT(t,span){ var d=new Date(t); return (span>86400e3?pad(d.getMonth()+1)+'-'+pad(d.getDate())+' ':'')+pad(d.getHours())+':'+pad(d.getMinutes())+(span<=1800e3?':'+pad(d.getSeconds()):''); }
function fmtFull(t){ var d=new Date(t); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); }
function niceStep(raw){ var e=Math.pow(10,Math.floor(Math.log10(raw))), f=raw/e; return (f<1.5?1:f<3.5?2:f<7.5?5:10)*e; }
function unitName(){ var q=quoteOf(S.symbol); return S.mode==='b'?(q.base||'base'):(q.quote||'quote'); }
function mkLabel(){ return S.market==='F'?'USDⓈ-M Futures':'Binance Spot'; }
function rangeMs(){ for(var i=0;i<RANGES.length;i++) if(RANGES[i][0]===S.range) return RANGES[i][1]; return 900e3; }

/* ---------- colour ramps (bids teal, asks red — consistent intensity scale) ---------- */
function ramp(stops){ var out=new Uint8ClampedArray(256*3); for(var i=0;i<256;i++){ var t=i/255, k=0; while(k<stops.length-2&&t>stops[k+1][0]) k++; var a=stops[k], b=stops[k+1], f=(t-a[0])/(b[0]-a[0]); for(var c=0;c<3;c++) out[i*3+c]=a[1][c]+(b[1][c]-a[1][c])*Math.max(0,Math.min(1,f)); } return out; }
function luts(){ if(LUT) return LUT; LUT={b:ramp([[0,[14,20,30]],[0.25,[8,70,86]],[0.55,[18,150,150]],[0.8,[45,212,167]],[1,[225,255,244]]]),a:ramp([[0,[14,20,30]],[0.25,[84,26,58]],[0.55,[196,40,72]],[0.8,[255,110,100]],[1,[255,236,190]]])}; return LUT; }

/* ---------- feed lifecycle ---------- */
function startFeed(){
  stopFeed(); tracker=new WallTracker(); wallStep=0; lastMid=null; view=null; srv={key:'',grid:null,meta:null,t:0,busy:false,err:''};
  var f=S.market==='F';
  feed=new Feed({market:S.market,symbol:S.symbol,restBase:f?FAPI+'/fapi/v1/depth':API+'/api/v3/depth',wsBase:f?FWSB+'/public/ws/':WSB+'/ws/',
    storeOpt:{snapEvery:15000,win:0.1,maxMs:2*3600e3},refreshEvery:120000,staleMs:20000,onStatus:function(){ paintStatus(); }});
  feed.start(); paintStatus();
}
function stopFeed(){ if(feed){ try{ feed.stop(); }catch(e){} feed=null; } }

/* ---------- walls (detected on notional per price bin; never labelled support/resistance, never "spoofing") ---------- */
function scanWalls(){
  if(!feed||!feed.ob.synced){ return; } var ob=feed.ob, b=ob.best(); if(b.mid==null) return; lastMid=b.mid;
  var pct=Math.max(S.depth,0.5)/100, step=niceStep(2*b.mid*pct/100), lo=Math.floor(b.mid*(1-pct)/step), n=Math.ceil(2*b.mid*pct/step)+2;
  if(step!==wallStep){ tracker=new WallTracker(); wallStep=step; }
  var vb=new Float32Array(n), va=new Float32Array(n), cur=new Map(), i;
  ob.bids.forEach(function(q,p){ var k=Math.round(p/step)-lo; if(k>=0&&k<n) vb[k]+=p*q; }); ob.asks.forEach(function(q,p){ var k=Math.round(p/step)-lo; if(k>=0&&k<n) va[k]+=p*q; });
  for(i=0;i<n;i++){ var pb=(lo+i)*step; if(ob.kLo!=null&&pb<ob.kLo) vb[i]=-1; if(ob.kHi!=null&&pb>ob.kHi) va[i]=-1; }
  var det=new Map(), o={ratio:S.wr,minV:S.wmin,pct:0.95,k:10};
  detectWalls(vb,o).forEach(function(w){ var key='0:'+step+':'+(lo+w.i); det.set(key,{side:0,price:(lo+w.i)*step,v:w.v}); });
  detectWalls(va,o).forEach(function(w){ var key='1:'+step+':'+(lo+w.i); det.set(key,{side:1,price:(lo+w.i)*step,v:w.v}); });
  for(i=0;i<n;i++){ if(vb[i]>0) cur.set('0:'+step+':'+(lo+i),vb[i]); if(va[i]>0) cur.set('1:'+step+':'+(lo+i),va[i]); }
  tracker.update(Date.now(),det,cur,step);
  var L=tracker.list(), bw=null, aw=null, cnt=0; L.forEach(function(e){ if(e.status==='removed') return; cnt++; if(e.side===0&&(!bw||e.v>bw.v)) bw=e; if(e.side===1&&(!aw||e.v>aw.v)) aw=e; }); wallInfo={bid:bw,ask:aw,n:cnt};
}

/* ---------- view (time × price) ---------- */
function priceRange(){
  var m=lastMid; if(!m) return null;
  if(S.win===0){ var ob=feed&&feed.ob, lo=ob&&ob.kLo!=null?Math.max(ob.kLo,m*0.95):m*0.995, hi=ob&&ob.kHi!=null?Math.min(ob.kHi,m*1.05):m*1.005; if(!(hi>lo)){ lo=m*0.995; hi=m*1.005; } return {pLo:lo,pHi:hi}; }
  return {pLo:m*(1-S.win/100),pHi:m*(1+S.win/100)};
}
function curView(){
  var now=Date.now(), pr=priceRange(), t0,t1;
  if(view){ var v=view; if(v.follow){ var sp=v.t1-v.t0; return {t0:now-sp,t1:now,pLo:v.pLo,pHi:v.pHi,follow:true}; } return v; }
  if(!pr) return null;
  if(S.range==='Custom'&&S.cFrom&&S.cTo){ t0=Date.parse(S.cFrom); t1=Date.parse(S.cTo); if(!(t1>t0)){ t1=now; t0=now-900e3; } } else { t1=now; t0=now-rangeMs(); }
  return {t0:t0,t1:t1,pLo:pr.pLo,pHi:pr.pHi,follow:S.range!=='Custom'};
}
function resetView(){ view=null; hover=null; srv.key=''; schedule(); }

/* ---------- grid source: this page's recording, or the collector server ---------- */
function toGridFromServer(j){
  var N=j.meta.cols*j.meta.rows, bid=new Float32Array(N), ask=new Float32Array(N), i; for(i=0;i<j.bid.length;i++) bid[j.bid[i][0]]=j.bid[i][1]; for(i=0;i<j.ask.length;i++) ask[j.ask[i][0]]=j.ask[i][1];
  return {cols:j.meta.cols,rows:j.meta.rows,t0:j.meta.from,t1:j.meta.to,pLo:j.meta.pLo,pHi:j.meta.pHi,mode:j.meta.mode,bid:bid,ask:ask,mid:Float64Array.from(j.mid,function(x){ return x==null?NaN:x; }),ok:Uint8Array.from(j.ok),snapOnly:j.meta.snapOnly};
}
function fetchServer(v,cols,rows){
  var key=[S.api,S.market,S.symbol,S.mode,cols,rows,Math.round(v.t0/5000),Math.round(v.t1/5000),v.pLo.toFixed(4),v.pHi.toFixed(4)].join('|');
  if(srv.busy||(srv.key===key&&Date.now()-srv.t<5000)) return; srv.busy=true;
  var url=S.api.replace(/\/+$/,'')+'/lh/heatmap?market='+S.market+'&symbol='+S.symbol+'&from='+Math.round(v.t0)+'&to='+Math.round(v.t1)+'&cols='+cols+'&rows='+rows+'&pLo='+v.pLo+'&pHi='+v.pHi+'&mode='+S.mode;
  fetch(url).then(function(r){ return r.json().then(function(j){ if(!r.ok) throw new Error(j.error||('HTTP '+r.status)); return j; }); }).then(function(j){ srv.grid=toGridFromServer(j); srv.meta=j.meta; srv.key=key; srv.t=Date.now(); srv.err=''; srv.busy=false; schedule(); })
    .catch(function(e){ srv.busy=false; srv.t=Date.now(); srv.key=key; srv.err='Collector: '+((e&&e.message)||'unreachable'); schedule(); });
}
function getGrid(v,cols,rows){
  if(S.api){ fetchServer(v,cols,rows); return srv.grid&&srv.meta?{g:srv.grid,cov:srv.meta.unavailableBefore,src:'collector'}:{g:null,src:'collector'}; }
  if(!feed) return {g:null,src:'local'}; var segs=feed.store.segs, cov=coverage(segs);
  return {g:buildGrid(segs,{t0:v.t0,t1:v.t1,cols:cols,rows:rows,pLo:v.pLo,pHi:v.pHi,mode:S.mode}),cov:cov.start,src:'local'};
}

/* ---------- drawing ---------- */
function schedule(){ if(raf||!shown) return; raf=requestAnimationFrame(function(){ raf=0; draw(); }); }
function hatch(ctx,x,y,w,hh){ ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,hh); ctx.clip(); ctx.fillStyle='rgba(127,138,163,.07)'; ctx.fillRect(x,y,w,hh); ctx.strokeStyle='rgba(127,138,163,.16)'; ctx.lineWidth=1;
  for(var k=-hh;k<w;k+=9){ ctx.beginPath(); ctx.moveTo(x+k,y+hh); ctx.lineTo(x+k+hh,y); ctx.stroke(); } ctx.restore(); }
function draw(){
  if(!shown||!ui) return; var wrap=ui.wrap, W=wrap.clientWidth, H=wrap.clientHeight; if(W<40||H<40) return;
  var dpr=Math.min(2,window.devicePixelRatio||1), cv=ui.cv; if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.width=W+'px'; cv.style.height=H+'px'; }
  var ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle='#0b0e14'; ctx.fillRect(0,0,W,H);
  var PR=W<500?50:60, PB=20, PW=W-PR, PH=H-PB, v=curView();
  ctx.font='10px Inter,system-ui,sans-serif'; ctx.textBaseline='middle';
  if(!v){ msg(ctx,W,H,feed&&feed.err?feed.err:'Waiting for the first synchronised Binance order book…'); lastDraw={}; return; }
  var cols=Math.max(20,Math.min(600,Math.floor(PW/S.res))), rows=Math.max(20,Math.min(240,Math.floor(PH/3))), G2=getGrid(v,cols,rows), g=G2.g;
  if(!g){ msg(ctx,W,H,srv.err||(S.api?'Loading history from the collector…':'Waiting for order-book data…')); axes(ctx,v,PW,PH,W,H,PR); lastDraw={}; return; }
  /* intensity */
  var L=luts(), i, c, r, smp=[]; var vis=function(x){ return x>0; };
  for(i=0;i<g.bid.length;i+=5){ if(S.bids&&g.bid[i]>0) smp.push(g.bid[i]); if(S.asks&&g.ask[i]>0) smp.push(g.ask[i]); }
  smp.sort(function(a,b){ return a-b; }); var vmax=smp.length?smp[Math.min(smp.length-1,Math.floor(smp.length*0.995))]:1, colMax=null;
  if(S.scale==='rel'){ colMax=new Float64Array(g.cols); for(c=0;c<g.cols;c++){ var m=0; for(r=0;r<g.rows;r++){ var a1=S.bids?g.bid[c*g.rows+r]:0, a2=S.asks?g.ask[c*g.rows+r]:0; if(a1>m) m=a1; if(a2>m) m=a2; } colMax[c]=m; } }
  if(!og) og=document.createElement('canvas'); og.width=g.cols; og.height=g.rows; var octx=og.getContext('2d'), img=octx.createImageData(g.cols,g.rows), d=img.data, sc=S.scale==='rel'?'lin':S.scale;
  for(c=0;c<g.cols;c++){ if(!g.ok[c]) continue; for(r=0;r<g.rows;r++){
    var k=c*g.rows+r, vb=g.bid[k], va=g.ask[k], o=((g.rows-1-r)*g.cols+c)*4, col=null, tt=0, mx=colMax?colMax[c]:vmax;
    if(vb<0||va<0){ d[o]=24;d[o+1]=30;d[o+2]=44;d[o+3]=255; continue; }
    if(S.bids&&vb>0){ tt=intensity(vb,sc,mx,S.min,S.gain); if(tt>0) col=L.b; } if(S.asks&&va>0){ var t2=intensity(va,sc,mx,S.min,S.gain); if(t2>tt){ tt=t2; col=L.a; } }
    if(col){ var ix=Math.round(tt*255)*3; d[o]=col[ix]; d[o+1]=col[ix+1]; d[o+2]=col[ix+2]; d[o+3]=255; } else { d[o+3]=0; } } }
  octx.putImageData(img,0,0); ctx.imageSmoothingEnabled=false;
  var x0=(g.t0-v.t0)/(v.t1-v.t0)*PW, xw=(g.t1-g.t0)/(v.t1-v.t0)*PW, y0=(v.pHi-g.pHi)/(v.pHi-v.pLo)*PH, yh=(g.pHi-g.pLo)/(v.pHi-v.pLo)*PH;
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,PW,PH); ctx.clip(); ctx.drawImage(og,x0,y0,xw,yh);
  /* missing data: unavailable history / recording gaps — hatched, never filled */
  var cw=xw/g.cols, run=-1;
  for(c=0;c<=g.cols;c++){ var bad=c<g.cols&&!g.ok[c]; if(bad&&run<0) run=c; if(!bad&&run>=0){ var rx=x0+run*cw, rw=(c-run)*cw, tEnd=g.t0+(c)*(g.t1-g.t0)/g.cols; hatch(ctx,rx,0,rw,PH);
      if(rw>110){ var unavail=G2.cov==null||tEnd<=G2.cov+1000; ctx.fillStyle='rgba(200,208,225,.78)'; ctx.textAlign='center'; ctx.fillText(unavail?'Historical order-book data is unavailable for this period.':'No recorded order-book data (recording gap)',rx+rw/2,PH/2); ctx.textAlign='left'; } run=-1; } }
  /* wall markers */
  if(S.walls&&feed){ var now=Date.now(); tracker.list().forEach(function(e){ var y=(v.pHi-e.price)/(v.pHi-v.pLo)*PH; if(y<0||y>PH) return; var xa=Math.max(0,(e.first-v.t0)/(v.t1-v.t0)*PW), xb=Math.min(PW,((e.status==='removed'?e.removedAt:now)-v.t0)/(v.t1-v.t0)*PW); if(xb<=xa) return;
      ctx.lineWidth=e.status==='active'?1.6:1; ctx.strokeStyle=e.status==='active'?'rgba(255,255,255,.9)':e.status==='reduced'?'rgba(255,196,87,.85)':'rgba(150,160,185,.55)'; ctx.setLineDash(e.status==='active'?[]:e.status==='reduced'?[5,3]:[2,3]);
      ctx.beginPath(); ctx.moveTo(xa,y); ctx.lineTo(xb,y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle=e.side===0?'#2dd4a7':'#ff5d7a'; ctx.beginPath(); ctx.arc(xa,y,2.5,0,6.3); ctx.fill(); }); }
  /* market price line (mid of the recorded book) + current price */
  ctx.strokeStyle='rgba(124,140,255,.95)'; ctx.lineWidth=1.3; ctx.beginPath(); var st=false; for(c=0;c<g.cols;c++){ var mv=g.mid[c]; if(!isFinite(mv)){ st=false; continue; } var px=x0+(c+0.5)*cw, py=(v.pHi-mv)/(v.pHi-v.pLo)*PH; if(!st){ ctx.moveTo(px,py); st=true; } else ctx.lineTo(px,py); } ctx.stroke();
  if(lastMid&&v.follow!==false){ var ly=(v.pHi-lastMid)/(v.pHi-v.pLo)*PH; if(ly>=0&&ly<=PH){ ctx.setLineDash([4,3]); ctx.strokeStyle='rgba(124,140,255,.7)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,ly); ctx.lineTo(PW,ly); ctx.stroke(); ctx.setLineDash([]); } }
  ctx.restore();
  axes(ctx,v,PW,PH,W,H,PR);
  if(lastMid){ var ly2=(v.pHi-lastMid)/(v.pHi-v.pLo)*PH; if(ly2>=0&&ly2<=PH){ ctx.fillStyle='#7c8cff'; ctx.fillRect(PW,ly2-8,PR,16); ctx.fillStyle='#0b0e14'; ctx.textAlign='left'; ctx.fillText(fmtP(lastMid,v.pHi-v.pLo),PW+4,ly2); } }
  lastDraw={v:v,g:g,PW:PW,PH:PH,cov:G2.cov,src:G2.src,vmax:vmax};
  /* crosshair */
  if(hover&&hover.x>=0&&hover.x<=PW&&hover.y>=0&&hover.y<=PH){ ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(hover.x,0); ctx.lineTo(hover.x,PH); ctx.moveTo(0,hover.y); ctx.lineTo(PW,hover.y); ctx.stroke(); ctx.setLineDash([]); paintHover(); } else ui.info.textContent=infoIdle();
  paintNotes(G2);
}
function msg(ctx,W,H,t){ ctx.fillStyle='#7f8aa3'; ctx.textAlign='center'; ctx.font='12px Inter,system-ui,sans-serif'; ctx.fillText(t,W/2,H/2); ctx.textAlign='left'; }
function axes(ctx,v,PW,PH,W,H,PR){
  ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.fillStyle='#7f8aa3'; ctx.lineWidth=1; ctx.textAlign='left'; ctx.font='10px Inter,system-ui,sans-serif';
  var ps=niceStep((v.pHi-v.pLo)/6), p=Math.ceil(v.pLo/ps)*ps; for(;p<v.pHi;p+=ps){ var y=(v.pHi-p)/(v.pHi-v.pLo)*PH; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(PW,y); ctx.stroke(); ctx.fillText(fmtP(p,v.pHi-v.pLo),PW+4,y); }
  var span=v.t1-v.t0, steps=[1e3,5e3,15e3,30e3,60e3,300e3,900e3,1800e3,3600e3,7200e3,14400e3,43200e3,86400e3], ts=steps[steps.length-1], k; for(k=0;k<steps.length;k++) if(span/steps[k]<=Math.max(3,Math.floor(PW/70))){ ts=steps[k]; break; }
  var off=new Date().getTimezoneOffset()*60000; ctx.textAlign='center'; for(var t=Math.ceil((v.t0-off)/ts)*ts+off;t<v.t1;t+=ts){ var x=(t-v.t0)/span*PW; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,PH); ctx.stroke(); ctx.fillText(fmtT(t,span),x,PH+10); } ctx.textAlign='left';
}
function infoIdle(){ return 'Colour = resting limit-order '+(S.mode==='b'?'quantity ('+unitName()+')':'value ('+unitName()+')')+', not traded volume. Drag to pan · wheel / pinch to zoom.'; }
function paintHover(){
  var D=lastDraw; if(!D.g||!hover) return; var g=D.g, v=D.v, c=Math.floor(hover.x/D.PW*g.cols), tm=v.t0+hover.x/D.PW*(v.t1-v.t0), p=v.pHi-hover.y/D.PH*(v.pHi-v.pLo), r=Math.floor((p-g.pLo)/((g.pHi-g.pLo)/g.rows)), t='';
  t=fmtFull(tm)+' · price '+fmtP(p,v.pHi-v.pLo);
  if(c>=0&&c<g.cols&&r>=0&&r<g.rows){ if(!g.ok[c]) t+=' · no recorded data'; else { var b=g.bid[c*g.rows+r], a=g.ask[c*g.rows+r]; if(b<0||a<0) t+=' · outside the known depth range'; else t+=' · bids '+fmtN(b)+' · asks '+fmtN(a)+' '+unitName(); } }
  ui.info.textContent=t;
}

/* ---------- panels ---------- */
function statusInfo(){ var s=feed?feed.status():'disconnected'; return {live:['Live','#2dd4a7'],connecting:['Connecting','#ffc457'],reconnecting:['Reconnecting','#ffc457'],stale:['Stale','#ff9f43'],disconnected:['Disconnected','#ff5d7a']}[s]||['—','#7f8aa3']; }
function paintStatus(){ if(!ui) return; var s=statusInfo(); ui.dot.style.background=s[1]; ui.stt.textContent=s[0]; ui.stt.style.color=s[1]; ui.chip.title=feed&&feed.err?feed.err:''; }
function cell(parent,label,val,sub,cls){ var c=h('div','lh-st'); c.appendChild(h('small',null,label)); c.appendChild(h('b',cls||'',val)); if(sub) c.appendChild(h('i',null,sub)); parent.appendChild(c); }
function paintStats(){
  if(!ui) return; var st=ui.st; st.innerHTML=''; var ob=feed&&feed.ob, q=quoteOf(S.symbol);
  if(!ob||!ob.synced||lastMid==null){ st.appendChild(h('div','lh-sub',feed&&feed.err?feed.err:'Statistics appear once the order book is synchronised with Binance.')); return; }
  var im=imbalance(ob.bids,ob.asks,lastMid,S.depth,'q',ob.kLo,ob.kHi), ib=imbalance(ob.bids,ob.asks,lastMid,S.depth,'b',ob.kLo,ob.kHi), now=Date.now();
  var mv=null; try{ var sg=feed.store.cur; if(sg) mv=movement(sg.deltas,now-60000,now,im.lo,im.hi); }catch(e){}
  cell(st,'Bid liquidity',fmtN(im.bid),fmtN(ib.bid)+' '+q.base+' · '+q.quote,'lh-up'); cell(st,'Ask liquidity',fmtN(im.ask),fmtN(ib.ask)+' '+q.base+' · '+q.quote,'lh-dn');
  cell(st,'Bid/ask imbalance',im.imb==null?'—':(im.imb>0?'+':'')+im.imb.toFixed(1)+'%','±'+S.depth+'% of mid'+(im.limited?' · depth limited':''),im.imb==null?'':im.imb>=0?'lh-up':'lh-dn');
  cell(st,'Largest bid wall',wallInfo.bid?fmtP(wallInfo.bid.price,lastMid*0.01)+' · '+fmtN(wallInfo.bid.v):'none','notional '+q.quote,'lh-up'); cell(st,'Largest ask wall',wallInfo.ask?fmtP(wallInfo.ask.price,lastMid*0.01)+' · '+fmtN(wallInfo.ask.v):'none','notional '+q.quote,'lh-dn');
  cell(st,'Detected walls',String(wallInfo.n),'active + reduced');
  cell(st,'Added (60s)',mv?'bid +'+fmtN(mv.addBid)+' · ask +'+fmtN(mv.addAsk):'—','displayed liquidity, '+q.quote); cell(st,'Removed (60s)',mv?'bid −'+fmtN(mv.remBid)+' · ask −'+fmtN(mv.remAsk):'—','cancelled or filled — not distinguishable');
  var ago=Math.max(0,Math.round((now-(feed.lastApplied||0))/1000)), cs=feed.store.startedAt;
  cell(st,'Last order-book update',feed.lastApplied?ago+'s ago':'—',feed.audit.checks?('integrity checks '+feed.audit.checks+' · corrections '+feed.audit.diffs):'REST cross-check pending');
  cell(st,'Recording since',cs?fmtFull(cs):'—',S.api?'history from the collector':'this page session only');
}
function paintWalls(){
  if(!ui) return; var box=ui.walls; box.innerHTML=''; if(!S.walls) return; var L=tracker.list().slice(0,8), q=quoteOf(S.symbol); if(!L.length) return;
  var tb=h('table'), hd=h('tr'); ['Side','Price','Notional '+q.quote,'Qty '+q.base,'First seen','Last seen','Status'].forEach(function(x){ hd.appendChild(h('th',null,x)); }); tb.appendChild(hd);
  L.forEach(function(e){ var tr=h('tr'); [e.side===0?'Bid':'Ask',fmtP(e.price,lastMid?lastMid*0.01:1),fmtN(e.v),fmtN(e.price>0?e.v/e.price:0,4),fmtT(e.first,1),fmtT(e.last,1),{active:'Active',reduced:'Reduced',removed:'Removed from book'}[e.status]].forEach(function(x,i){ var td=h('td',i===0?(e.side===0?'lh-up':'lh-dn'):'',x); tr.appendChild(td); }); tb.appendChild(tr); });
  var w=h('div'); w.style.overflowX='auto'; w.appendChild(tb); box.appendChild(w);
}
function paintNotes(G2){
  if(!ui) return; var n=[], mkl=mkLabel();
  n.push(mkl+' · '+S.symbol+' · '+(S.api?'history from collector'+(srv.err?' ('+srv.err+')':''):'recorded in this browser tab since '+(feed&&feed.store.startedAt?fmtFull(feed.store.startedAt):'—')+'; leaves with the tab. Set a Collector for persistent history.'));
  if(G2&&G2.g&&G2.g.snapOnly) n.push('Wide ranges are sampled from periodic snapshots.');
  if(feed&&feed.ob&&feed.ob.resyncs) n.push('Resynchronisations: '+feed.ob.resyncs+' (gaps are shown hatched, never filled).');
  n.push('Imbalance = (bid − ask) / (bid + ask) of resting-order notional ('+quoteOf(S.symbol).quote+') within the chosen range of mid. Binance exposes 1000 levels per side at sync; rows beyond the known depth are shaded, not shown as empty.');
  n.push('A level that disappears may be a cancellation or a fill — public depth cannot tell them apart. Walls are not support/resistance and nothing here identifies spoofing. COIN-M is not shown.');
  ui.notes.textContent=n.join(' ');
}
function tick(){ if(!shown) return; try{ scanWalls(); paintStats(); paintWalls(); paintStatus(); }catch(e){ console.error('liquidity heatmap',e); } schedule(); }

/* ---------- styles + DOM ---------- */
function css(){
  if(document.getElementById('lhv-css')) return; var s=document.createElement('style'); s.id='lhv-css';
  s.textContent='#lhv{position:absolute;inset:0;z-index:7;display:none;flex-direction:column;background:var(--bg,#0b0e14);color:var(--txt,#e9edf5);font:12px/1.35 Inter,system-ui,sans-serif;min-height:0}'
  +'#lhv .lh-row{display:flex;align-items:center;gap:6px;padding:4px 8px;overflow-x:auto;white-space:nowrap;scrollbar-width:none;-webkit-overflow-scrolling:touch;flex:none}#lhv .lh-row::-webkit-scrollbar{display:none}#lhv .lh-row>*{flex:none}#lhv .lh-ctl{flex:none}@media (max-height:560px){#lhv .lh-bot{max-height:30%}}'
  +'#lhv button,#lhv select,#lhv input{font:inherit;color:inherit;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:5px 9px;min-height:30px}#lhv select{padding-right:4px}'
  +'#lhv button.on{background:rgba(124,140,255,.28);border-color:rgba(124,140,255,.6)}#lhv .lh-seg{display:flex;gap:0}#lhv .lh-seg button{border-radius:0}#lhv .lh-seg button:first-child{border-radius:8px 0 0 8px}#lhv .lh-seg button:last-child{border-radius:0 8px 8px 0}'
  +'#lhv input[type=number]{width:74px}#lhv input[type=range]{width:78px;padding:0}#lhv label{display:flex;align-items:center;gap:4px;color:#7f8aa3}'
  +'#lhv .lh-chip{display:flex;align-items:center;gap:5px;font-weight:600;padding:4px 9px;border-radius:14px;background:rgba(255,255,255,.06)}#lhv .lh-dot{width:8px;height:8px;border-radius:50%}'
  +'#lhv .lh-wrap{position:relative;flex:1 1 auto;min-height:180px;touch-action:none}#lhv canvas{position:absolute;inset:0;display:block;touch-action:none}'
  +'#lhv .lh-info{padding:3px 8px;color:#9aa6c0;font-size:11px;flex:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  +'#lhv .lh-bot{flex:none;max-height:42%;overflow-y:auto;border-top:1px solid rgba(255,255,255,.07)}'
  +'#lhv .lh-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(138px,1fr));gap:5px;padding:6px 8px}#lhv .lh-st{background:rgba(255,255,255,.04);border-radius:8px;padding:5px 8px;min-width:0}'
  +'#lhv .lh-st small{display:block;color:#7f8aa3;font-size:10px}#lhv .lh-st b{display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#lhv .lh-st i{display:block;color:#6b7690;font-size:9.5px;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  +'#lhv .lh-up{color:#2dd4a7}#lhv .lh-dn{color:#ff5d7a}#lhv .lh-sub{color:#7f8aa3;padding:4px 8px}#lhv .lh-notes{color:#6b7690;font-size:10px;padding:4px 8px 10px}'
  +'#lhv table{border-collapse:collapse;font-size:10.5px;margin:0 8px 4px;min-width:420px}#lhv th{color:#7f8aa3;font-weight:500;text-align:left;padding:2px 8px 2px 0}#lhv td{padding:2px 8px 2px 0}'
  +'#lhv .lh-add{position:absolute;inset:0;background:rgba(11,14,20,.97);z-index:3;display:none;flex-direction:column;gap:6px;padding:10px}#lhv .lh-add.on{display:flex}#lhv .lh-list{overflow-y:auto;display:flex;flex-direction:column;gap:3px}#lhv .lh-list button{text-align:left}';
  document.head.appendChild(s);
}
function sel(opts,cur,fn,fmt){ var s=h('select'); opts.forEach(function(o){ var arr=Array.isArray(o), e=h('option',null,fmt?fmt(o):String(arr?o[1]:o)); e.value=String(arr?o[0]:o); s.appendChild(e); }); s.value=String(cur); s.onchange=function(){ fn(s.value); }; return s; }
function seg(items,cur,fn){ var d=h('div','lh-seg'); items.forEach(function(it){ var b=h('button',cur===it[0]?'on':null,it[1]); b.dataset.k=it[0]; b.onclick=function(){ fn(it[0]); }; d.appendChild(b); }); return d; }
function ensureUI(){
  if(ui) return ui; css(); var root=h('div'), r1=h('div','lh-row'), r2=h('div','lh-row'), r3=h('div','lh-row'), r4=h('div','lh-row'); root.id='lhv';
  var sb=h('button',null,S.symbol+' ▾'); sb.onclick=openAdd; r1.appendChild(sb);
  var mk=seg([['S','Spot'],['F','USDⓈ-M Futures']],S.market,function(m){ if(S.market===m) return; S.market=m; saveS(); paintCtl(); startFeed(); schedule(); }); r1.appendChild(mk);
  var chip=h('div','lh-chip'), dot=h('span','lh-dot'), stt=h('span'); chip.appendChild(dot); chip.appendChild(stt); r1.appendChild(chip);
  var rs=sel(RANGES.map(function(r){ return r[0]; }),S.range,function(v){ S.range=v; saveS(); view=null; srv.key=''; paintCtl(); schedule(); },function(v){ return v==='Custom'?'Custom range':'Last '+v; }); r2.appendChild(rs);
  var ms=seg([['q','Value'],['b','Quantity']],S.mode,function(m){ S.mode=m; saveS(); srv.key=''; paintCtl(); schedule(); }); r2.appendChild(ms);
  var sc=sel([['log','Log scale'],['lin','Linear'],['rel','Relative (per column)']],S.scale,function(v){ S.scale=v; saveS(); schedule(); },function(o){ return o[1]; }); r2.appendChild(sc);
  var rz=sel([[2,'Fine'],[4,'Normal'],[8,'Coarse']],S.res,function(v){ S.res=+v; saveS(); srv.key=''; schedule(); },function(o){ return 'Resolution: '+o[1]; }); r2.appendChild(rz);
  var wn=sel([[0,'Auto'],[0.1,'±0.1%'],[0.25,'±0.25%'],[0.5,'±0.5%'],[1,'±1%'],[2,'±2%'],[5,'±5%']],S.win,function(v){ S.win=+v; saveS(); view=null; srv.key=''; schedule(); },function(o){ return 'Price: '+o[1]; }); r3.appendChild(wn);
  var dp=sel([[0.25,'±0.25%'],[0.5,'±0.5%'],[1,'±1%'],[2,'±2%'],[5,'±5%'],['c','Custom…']],S.depth,function(v){ if(v==='c'){ var x=parseFloat(prompt('Depth range for statistics: % either side of the mid price (0.01–20)',String(S.depth))); if(isFinite(x)&&x>=0.01&&x<=20) S.depth=x; paintCtl(); } else S.depth=+v; saveS(); tick(); },function(o){ return 'Depth: '+o[1]; }); r3.appendChild(dp);
  var mn=h('input'); mn.type='number'; mn.min='0'; mn.step='any'; mn.placeholder='min'; mn.title='Minimum visible liquidity (in the selected unit)'; mn.onchange=function(){ S.min=Math.max(0,+mn.value||0); saveS(); schedule(); }; var ml=h('label'); ml.appendChild(document.createTextNode('Min')); ml.appendChild(mn); r3.appendChild(ml);
  var gn=h('input'); gn.type='range'; gn.min='0.3'; gn.max='3'; gn.step='0.1'; gn.title='Heatmap colour intensity'; gn.oninput=function(){ S.gain=+gn.value; saveS(); schedule(); }; var gl=h('label'); gl.appendChild(document.createTextNode('Intensity')); gl.appendChild(gn); r3.appendChild(gl);
  var tg=function(k,t){ var b=h('button',S[k]?'on':null,t); b.onclick=function(){ S[k]=!S[k]; saveS(); b.classList.toggle('on',S[k]); schedule(); tick(); }; return b; };
  r4.appendChild(tg('bids','Bids')); r4.appendChild(tg('asks','Asks')); r4.appendChild(tg('walls','Walls'));
  var wr=sel([[2,'2×'],[3,'3×'],[5,'5×'],[8,'8×']],S.wr,function(v){ S.wr=+v; saveS(); tick(); },function(o){ return 'Wall ≥ '+o[1]+' neighbours'; }); r4.appendChild(wr);
  var wm=h('input'); wm.type='number'; wm.min='0'; wm.step='any'; wm.placeholder='wall min'; wm.title='Minimum wall size in quote-asset notional'; wm.onchange=function(){ S.wmin=Math.max(0,+wm.value||0); saveS(); tick(); }; r4.appendChild(wm);
  var rv=h('button',null,'Reset view'); rv.onclick=resetView; r4.appendChild(rv);
  var sv=h('button',null,'Collector'); sv.title='Persistent history from your collector server'; sv.onclick=function(){ var u=prompt('Collector API URL (leave empty to use this page\'s own recording only)',S.api||''); if(u===null) return; u=u.trim(); if(u&&!/^https?:\/\//.test(u)) return toast('URL must start with http:// or https://','#ff5d7a'); S.api=u; saveS(); srv={key:'',grid:null,meta:null,t:0,busy:false,err:''}; paintCtl(); schedule(); }; r4.appendChild(sv);
  var rc=h('div','lh-row'); var fi=h('input'), ti=h('input'); fi.type='datetime-local'; ti.type='datetime-local'; var ap=h('button',null,'Apply');
  ap.onclick=function(){ if(!fi.value||!ti.value||Date.parse(fi.value)>=Date.parse(ti.value)) return toast('Pick a valid From / To','#ff5d7a'); S.range='Custom'; S.cFrom=fi.value; S.cTo=ti.value; saveS(); view=null; srv.key=''; paintCtl(); schedule(); }; rc.appendChild(fi); rc.appendChild(ti); rc.appendChild(ap);
  var wrap=h('div','lh-wrap'), cv=document.createElement('canvas'); wrap.appendChild(cv); var info=h('div','lh-info'), bot=h('div','lh-bot'), st=h('div','lh-stats'), walls=h('div'), notes=h('div','lh-notes'), add=h('div','lh-add');
  bot.appendChild(st); bot.appendChild(walls); bot.appendChild(notes); wrap.appendChild(add);
  var ctl=h('div','lh-ctl'); [r2,r3,r4,rc].forEach(function(x){ ctl.appendChild(x); });
  var gear=h('button',null,'⚙'); gear.title='Show / hide controls'; r1.appendChild(gear);
  if(S.ctl==null) S.ctl=!((window.innerHeight||1000)<560);          // short (landscape) screens start with the controls collapsed
  ctl.style.display=S.ctl?'':'none'; gear.classList.toggle('on',S.ctl); gear.onclick=function(){ S.ctl=!S.ctl; saveS(); ctl.style.display=S.ctl?'':'none'; gear.classList.toggle('on',S.ctl); schedule(); };
  [r1,ctl,wrap,info,bot].forEach(function(x){ root.appendChild(x); }); $('mw').appendChild(root);
  ui={root:root,sb:sb,mk:mk,chip:chip,dot:dot,stt:stt,rs:rs,ms:ms,sc:sc,rz:rz,wn:wn,dp:dp,mn:mn,gn:gn,wm:wm,wr:wr,rc:rc,fi:fi,ti:ti,wrap:wrap,cv:cv,info:info,st:st,walls:walls,notes:notes,add:add};
  bindPointer(cv); if(window.ResizeObserver) new ResizeObserver(function(){ schedule(); }).observe(wrap); else window.addEventListener('resize',schedule);
  return ui;
}
function paintCtl(){
  if(!ui) return; ui.sb.textContent=S.symbol+' ▾'; Array.prototype.forEach.call(ui.mk.children,function(b){ b.classList.toggle('on',b.dataset.k===S.market); }); Array.prototype.forEach.call(ui.ms.children,function(b){ b.classList.toggle('on',b.dataset.k===S.mode); });
  ui.rs.value=S.range; ui.sc.value=S.scale; ui.rz.value=String(S.res); ui.wn.value=String(S.win); ui.mn.value=S.min?String(S.min):''; ui.gn.value=String(S.gain); ui.wm.value=S.wmin?String(S.wmin):''; ui.wr.value=String(S.wr);
  if(!Array.prototype.some.call(ui.dp.options,function(o){ return +o.value===S.depth; })){ var o=h('option',null,'±'+S.depth+'%'); o.value=String(S.depth); ui.dp.insertBefore(o,ui.dp.options[ui.dp.options.length-1]); } ui.dp.value=String(S.depth);
  ui.rc.style.display=S.range==='Custom'?'':'none'; if(S.range==='Custom'){ if(!S.cFrom){ var n=Date.now(); S.cFrom=new Date(n-3600e3-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16); S.cTo=new Date(n-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16); } ui.fi.value=S.cFrom; ui.ti.value=S.cTo; }
  paintStatus();
}

/* ---------- pan / zoom / crosshair (mouse, touch, pinch) ---------- */
function ensureManual(){ if(!view){ var v=curView(); if(!v) return null; view={t0:v.t0,t1:v.t1,pLo:v.pLo,pHi:v.pHi,follow:v.follow!==false}; } else if(view.follow){ var c=curView(); view.t0=c.t0; view.t1=c.t1; } return view; }
function bindPointer(cv){
  function pos(e){ var r=cv.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  cv.addEventListener('pointerdown',function(e){ try{ cv.setPointerCapture(e.pointerId); }catch(x){} var p=pos(e); ptrs[e.pointerId]=p; if(Object.keys(ptrs).length===2){ var k=Object.keys(ptrs), a=ptrs[k[0]], b=ptrs[k[1]]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1}; drag=null; } else drag={x:p.x,y:p.y,moved:false}; });
  cv.addEventListener('pointermove',function(e){
    var p=pos(e); if(ptrs[e.pointerId]) ptrs[e.pointerId]=p; var D=lastDraw;
    if(pinch&&Object.keys(ptrs).length===2){ var k=Object.keys(ptrs), a=ptrs[k[0]], b=ptrs[k[1]], d=Math.hypot(a.x-b.x,a.y-b.y)||1, f=pinch.d/d; pinch.d=d; zoom(f,f,(a.x+b.x)/2,(a.y+b.y)/2); return; }
    if(drag&&ptrs[e.pointerId]&&D.v){ var dx=p.x-drag.x, dy=p.y-drag.y; if(Math.abs(dx)+Math.abs(dy)>3) drag.moved=true; if(drag.moved){ var v=ensureManual(); if(!v) return; var ts=(v.t1-v.t0)/D.PW, ps=(v.pHi-v.pLo)/D.PH; var nt=Date.now(); var sh=-dx*ts; if(v.t1+sh>nt){ sh=nt-v.t1; } v.t0+=sh; v.t1+=sh; v.follow=v.t1>=nt-1500; v.pLo+=dy*ps; v.pHi+=dy*ps; drag.x=p.x; drag.y=p.y; srv.key=''; } }
    hover=p; schedule(); });
  var end=function(e){ delete ptrs[e.pointerId]; if(Object.keys(ptrs).length<2) pinch=null; if(!Object.keys(ptrs).length) drag=null; };
  cv.addEventListener('pointerup',end); cv.addEventListener('pointercancel',end); cv.addEventListener('pointerleave',function(e){ if(!ptrs[e.pointerId]){ hover=null; schedule(); } });
  cv.addEventListener('wheel',function(e){ e.preventDefault(); var p=pos(e), f=Math.exp(Math.sign(e.deltaY)*0.15); if(e.ctrlKey||e.metaKey||e.shiftKey) zoom(1,f,p.x,p.y); else zoom(f,1,p.x,p.y); },{passive:false});
  cv.addEventListener('dblclick',resetView);
}
function zoom(ft,fp,x,y){
  var D=lastDraw; if(!D.v) return; var v=ensureManual(); if(!v) return; var nt=Date.now(), tc=v.t0+x/D.PW*(v.t1-v.t0), pc=v.pHi-y/D.PH*(v.pHi-v.pLo);
  var n0=tc-(tc-v.t0)*ft, n1=tc+(v.t1-tc)*ft;
  if(n1-n0<=8*864e5&&n1-n0>=20e3){ if(n1>nt){ n0-=n1-nt; n1=nt; } v.t0=n0; v.t1=n1; }
  var q0=pc-(pc-v.pLo)*fp, q1=pc+(v.pHi-pc)*fp; if(q1-q0<=pc*0.5&&q1-q0>=pc*1e-5){ v.pLo=q0; v.pHi=q1; }
  v.follow=v.t1>=nt-1500; srv.key=''; schedule();
}

/* ---------- symbol sheet ---------- */
async function jget(url){ var r=await fetch(url); return r.json(); }
async function ensureSyms(){
  if(symBusy) return; symBusy=true;
  try{ if(!symLists.S){ var a=await jget(API+'/api/v3/ticker/price'); if(Array.isArray(a)) symLists.S=a.map(function(x){ return x.symbol; }).filter(function(s){ return /^[A-Z0-9]{3,24}$/.test(s); }).sort(); }
    if(!symLists.F){ var b=await jget(FAPI+'/fapi/v1/ticker/price'); if(Array.isArray(b)) symLists.F=b.map(function(x){ return x.symbol; }).filter(function(s){ return /^[A-Z0-9]{3,24}$/.test(s); }).sort(); } }catch(e){}
  symBusy=false; if(ui&&ui.add.classList.contains('on')) paintAdd();
}
function openAdd(){ addMk=S.market; ui.add.classList.add('on'); paintAdd(true); ensureSyms(); }
function closeAdd(){ if(ui) ui.add.classList.remove('on'); }
function choose(mk,s){ s=String(s||'').toUpperCase().trim(); if(!/^[A-Z0-9]{3,24}$/.test(s)) return toast('That symbol is not valid','#ff5d7a'); S.market=mk; S.symbol=s; saveS(); closeAdd(); paintCtl(); startFeed(); schedule(); }
function paintAdd(focus){
  var qi=ui.add.querySelector('input.q'), keep=qi?qi.value:''; ui.add.innerHTML=''; var hd=h('div','lh-row'); hd.appendChild(h('b',null,'Choose symbol'));
  var sg=seg([['S','Binance Spot'],['F','USDⓈ-M Futures']],addMk,function(m){ addMk=m; paintAdd(true); }); hd.appendChild(sg); var cl=h('button',null,'Close'); cl.onclick=closeAdd; hd.appendChild(cl); ui.add.appendChild(hd);
  var q=h('input','q'); q.type='search'; q.placeholder='Search symbol, e.g. SOL'; q.value=keep; ui.add.appendChild(q); var ls=h('div','lh-list'); ui.add.appendChild(ls);
  var draw2=function(){ ls.innerHTML=''; var s=q.value.toUpperCase().replace(/[^A-Z0-9]/g,''), L=symLists[addMk]; if(!L) ls.appendChild(h('div','lh-sub',symBusy?'Loading Binance symbols…':'Could not load the symbol list. You can still type an exact symbol.'));
    var hits=L?L.filter(function(x){ return !s||x.indexOf(s)>=0; }).sort(function(a,b){ var A1=a.indexOf(s)===0?0:1,B1=b.indexOf(s)===0?0:1; return A1-B1||(/USDT$/.test(b)?1:0)-(/USDT$/.test(a)?1:0)||a.length-b.length; }).slice(0,80):[];
    hits.forEach(function(x){ var b=h('button',null,x+'  ·  '+(addMk==='F'?'USDⓈ-M Futures':'Spot')); b.onclick=function(){ choose(addMk,x); }; ls.appendChild(b); });
    if(s.length>=3&&(!L||hits.indexOf(s)<0)){ var mb=h('button',null,'Try "'+s+'" on '+(addMk==='F'?'USDⓈ-M Futures':'Spot')); mb.onclick=function(){ choose(addMk,s); }; ls.appendChild(mb); } };
  q.oninput=draw2; draw2(); if(focus){ try{ q.focus({preventScroll:true}); }catch(e){} }
}

/* ---------- show / hide ---------- */
function show(){ ensureUI(); shown=true; ui.root.style.display='flex'; paintCtl(); if(!feed) startFeed(); if(timer) clearInterval(timer); timer=setInterval(tick,1000); tick(); }
function hide(){ if(!shown) return; shown=false; if(timer){ clearInterval(timer); timer=null; } closeAdd(); stopFeed(); if(ui) ui.root.style.display='none'; }   // no background sockets once the chart type is left
G.mpLH.type=function(t,prev){ try{ if(t===23) show(); else if(prev===23||shown) hide(); }catch(e){ console.error('liquidity heatmap',e); } };
G.mpLH.show=show; G.mpLH.hide=hide;
loadS();
try{ if(typeof ctype!=='undefined'&&ctype===23) show(); }catch(e){}

})();
