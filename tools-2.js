// ===================================================================================================
// tools-2.js  -  extra tools loaded by index.html and run INSIDE the app (direct eval in start()).
// Each tool is its own try{} block: if one fails, the app and the other tools keep working.
// ===================================================================================================

// ---- [lrs] INDICATOR: Low-Risk ETF Strategy (RSMK) - port of TASC Oct 2026 (M. Katsanos) Pine v6 script ----
try{
const LRS_DEF={rsBars:35,rsiBars:10,mar:50,rsCrit:3,minVol:0,rsiOS:35,maBars:15,corMin:0.6,timeExit:30,tpPct:25,bench:'BTCUSDT',fill:true};
const lrB={}; let lrVer=0;
const lrN=v=>v!=null&&isFinite(v);
function lrEma(v,n){ const k=2/(n+1), o=new Array(v.length).fill(null); let p=null; for(let i=0;i<v.length;i++){ if(!lrN(v[i])){ p=null; continue; } p=p==null?v[i]:k*v[i]+(1-k)*p; o[i]=p; } return o; }   // Pine ta.ema seeds with the first value
function lrSma(v,n){ const o=new Array(v.length).fill(null); for(let i=n-1;i<v.length;i++){ let s=0,ok=true; for(let j=i-n+1;j<=i;j++){ if(!lrN(v[j])){ ok=false; break; } s+=v[j]; } if(ok) o[i]=s/n; } return o; }
function lrExt(v,n,mx){ const o=new Array(v.length).fill(null); for(let i=n-1;i<v.length;i++){ let m=null,ok=true; for(let j=i-n+1;j<=i;j++){ if(!lrN(v[j])){ ok=false; break; } m=m==null?v[j]:(mx?Math.max(m,v[j]):Math.min(m,v[j])); } if(ok) o[i]=m; } return o; }
function lrRsi(v,n){ const o=new Array(v.length).fill(null); let g=0,l=0; for(let i=1;i<v.length;i++){ const x=v[i]-v[i-1], gg=Math.max(x,0), ll=Math.max(-x,0);
  if(i<=n){ g+=gg; l+=ll; if(i===n){ g/=n; l/=n; } } else { g=(g*(n-1)+gg)/n; l=(l*(n-1)+ll)/n; }
  if(i>=n) o[i]=l===0?100:100-100/(1+g/l); } return o; }
function lrCor(a,b,n){ const o=new Array(a.length).fill(null); for(let i=n-1;i<a.length;i++){ let sa=0,sb=0,ok=true; for(let j=i-n+1;j<=i;j++){ if(!lrN(a[j])||!lrN(b[j])){ ok=false; break; } sa+=a[j]; sb+=b[j]; }
  if(!ok) continue; const ma=sa/n, mb=sb/n; let c=0,va=0,vb=0; for(let j=i-n+1;j<=i;j++){ const x=a[j]-ma, y=b[j]-mb; c+=x*y; va+=x*x; vb+=y*y; } if(va>0&&vb>0) o[i]=c/Math.sqrt(va*vb); } return o; }

// benchmark candles (same interval) fetched once per symbol / interval / benchmark, like the HTF filter does
async function lrFetch(b,iv,t0,d){ try{ let end=null, rows=[];
    for(let k=0;k<4;k++){ const r=await fetch(`${RB(b)}/klines?symbol=${b}&interval=${iv}&limit=1000${end?'&endTime='+end:''}`); if(!r.ok) break; const a=await r.json(); if(!Array.isArray(a)||!a.length) break; rows=a.concat(rows); end=a[0][0]-1; if(a[0][0]/1000<=t0) break; }
    d.m=new Map(); rows.forEach(x=>d.m.set(Math.floor(x[0]/1000),+x[4])); if(!d.m.size) d.err=1; }catch(e){ d.m=new Map(); d.err=1; }
  lrVer++; try{ inds.forEach(i=>{ if(i.t==='lrs'){ i._xs=null; recalc(i); } }); recomputeExtras(); render(); }catch(e){} }
function lrBench(c,p){ const b=String(p.bench||'BTCUSDT').toUpperCase().replace(/[^A-Z0-9]/g,''), key=sym[0]+'|'+tf[1]+'|'+b; let d=lrB[key]; if(!d){ d=lrB[key]={m:null,b}; lrFetch(b,tf[1],c[0].time,d); } return d; }

function lrRun(c,p){ const n=c.length, d=lrBench(c,p), q=Object.assign({},LRS_DEF,p), bm=d.m;
  const cl=c.map(x=>x.close), bn=c.map(x=>bm?(bm.has(x.time)?bm.get(x.time):null):null);
  const rs1=cl.map((x,i)=>i>=q.rsBars&&lrN(bn[i])&&lrN(bn[i-q.rsBars])&&bn[i]>0&&bn[i-q.rsBars]>0?Math.log(x/bn[i])-Math.log(cl[i-q.rsBars]/bn[i-q.rsBars]):null);
  const rsmk=lrEma(rs1,4).map(x=>lrN(x)?x*100:null), mars=lrSma(rsmk,q.mar), hh=lrExt(rsmk,4,true);
  const roc=cl.map((x,i)=>i>=6&&lrN(bn[i])&&lrN(bn[i-6])&&bn[i-6]>0?(bn[i]-bn[i-6])/bn[i-6]*100:null), cor=lrCor(cl,bn,100);
  const rsi=lrRsi(cl,q.rsiBars), ll=lrExt(rsi,20,false), e5=lrEma(cl,5), s5=lrSma(cl,q.maBars), vs=lrSma(c.map(x=>x.volume||0),5);
  let pos=0, ep=0, eb=0; const buys=[], exits=[], segs=[]; let cur=null;
  for(let i=0;i<n;i++){ const r=rsmk[i];
    const gotVol=q.minVol<=0||(lrN(vs[i])&&vs[i]>q.minVol);
    const rsS=lrN(r)&&lrN(mars[i])&&r>mars[i]&&r>q.rsCrit&&r===hh[i]&&r<25;
    const roS=lrN(roc[i])&&lrN(cor[i])&&((roc[i]>-6&&cor[i]>q.corMin)||(roc[i]<-6&&cor[i]<-q.corMin));
    const riS=lrN(ll[i])&&lrN(rsi[i])&&i>=3&&lrN(rsi[i-3])&&ll[i]<q.rsiOS&&rsi[i]>rsi[i-3];
    const moS=lrN(e5[i])&&i>=5&&lrN(s5[i-5])&&e5[i]>s5[i-5];
    const isBuy=gotVol&&rsS&&roS&&riS&&moS&&pos===0;
    const isSell=lrN(r)&&r<-q.rsCrit&&lrN(cor[i])&&cor[i]>0.8&&pos===1, per=pos===1&&cl[i]>=ep*(1+q.tpPct/100), reb=pos===1&&i-eb>=q.timeExit, ex=isSell||per||reb;
    if(ex){ exits.push({i,why:isSell?'weak RS':per?'+'+q.tpPct+'% target':'rebalance',ret:(cl[i]-ep)/ep*100}); if(cur){ cur.i1=i; segs.push(cur); cur=null; } }
    if(isBuy){ pos=1; ep=cl[i]; eb=i; buys.push({i}); cur={i0:i,i1:null,ep}; } else if(ex) pos=0; }
  if(cur) segs.push(cur);
  return {rsmk,mars,buys,exits,segs,d,n}; }

IND.lrs={label:'Low-Risk ETF Strategy (RSMK relative strength) \u00b7 Buy / Exit',cat:'Momentum',nm:p=>'LRETF '+p.rsBars+' vs '+String(p.bench||'').replace(/USDT$/,''),
  p:Object.assign({},LRS_DEF),cols:['#00e676','#2962ff'],pane:2,lines:[[0,'#787b86',0]],
  fields:[['bench','txt','Benchmark symbol (Binance, e.g. BTCUSDT, ETHUSDT)'],['rsBars','num','RSMK length',{min:2,max:300}],['rsiBars','num','RSI length',{min:2,max:100}],['mar','num','RS MA length',{min:2,max:300}],['rsCrit','num','RS entry level',{min:0,step:0.5}],
    ['rsiOS','num','RSI oversold',{min:1,max:99}],['maBars','num','MA bars',{min:2,max:200}],['corMin','num','Minimum correlation',{min:0,max:1,step:0.05}],['timeExit','num','Rebalance period (bars)',{min:1,max:1000}],
    ['tpPct','num','Profit target exit %',{min:1,max:500}],['minVol','num','Minimum average volume (0 = off)',{min:0}],['fill','chk','Show entry line and position fill']],
  calc:(c,p)=>{ const r=lrRun(c,p), a=[], b=[]; for(let i=0;i<c.length;i++){ const v=r.rsmk[i]; if(lrN(v)) a.push({time:c[i].time,value:v,color:v>0?'#00e676':'#ff5252'}); if(lrN(r.mars[i])) b.push({time:c[i].time,value:r.mars[i]}); } return [a,b]; },
  extras:(c,p,i)=>{ const cc=c.length>1?c.slice(0,-1):c, r=lrRun(cc,p), mk=[], d=r.d;   // signals use closed candles only (no repaint)
    r.buys.forEach(x=>mk.push({time:cc[x.i].time,position:'belowBar',color:'#2dd4a7',shape:'arrowUp',text:'Buy'}));
    r.exits.forEach(x=>mk.push({time:cc[x.i].time,position:'aboveBar',color:'#ff5d7a',shape:'arrowDown',text:'Exit'}));
    mk.sort((a,b)=>a.time-b.time);
    const w=r.exits.filter(x=>true), won=w.filter(x=>x.ret>0).length;
    const stat=!d.m?'benchmark '+d.b+' loading\u2026':d.err?'no data for benchmark '+d.b:(w.length?'closed '+w.length+' \u00b7 up '+Math.round(won/w.length*100)+'%':'no closed trades yet');
    return {mk,boxes:p.fill===false?[]:[{type:'lrview',pts:[],r:{segs:r.segs},o:p}],labels:[],stat}; }};

{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='lrview') return _D.apply(this,arguments);
    const S=d.r.segs, n=candles.length; cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip();
    S.forEach(s=>{ const e=s.i1==null?n-1:s.i1, ye=Y(s.ep); if(ye==null) return; const xa=X(s.i0), xb=X(e); if(xa==null&&xb==null) return;
      for(let i=s.i0;i<=Math.min(e,n-1);i++){ const x0=X(i); if(x0==null) continue; const x1=X(i+1), bw=x1!=null?Math.max(1,x1-x0):4, yc=Y(candles[i].close); if(yc==null) continue;
        cx.fillStyle=(i>s.i0&&candles[i-1].close>s.ep)||(i===s.i0)?'rgba(0,150,136,.22)':'rgba(244,67,54,.22)'; cx.fillRect(x0-bw/2,Math.min(yc,ye),bw,Math.abs(yc-ye)); }
      cx.strokeStyle='#ffeb3b'; cx.lineWidth=1; cx.setLineDash([2,3]); cx.beginPath(); cx.moveTo(xa==null?0:xa,ye); cx.lineTo(xb==null?W:xb,ye); cx.stroke(); cx.setLineDash([]); });
    cx.restore(); }; }
}catch(err){ console.error('lrs indicator failed',err); window.__lrsErr=err; }
