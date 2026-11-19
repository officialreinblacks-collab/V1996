// dealer-engine.js - server copy of the Dealer Levels & Liquidity Sweep logic from tool11.js (same rules, so the phone push and the chart agree).
// Used by server.js for watches with tool:'dlr'. If you change the rules in tool11.js (the tool page string), regenerate/copy them here too.
const med=a=>{const b=[...a].sort((x,y)=>x-y);return b[b.length>>1]||0};
/* ---------- math helpers ---------- */
function atr(a,n=14){const r=[];let p=0;for(let i=0;i<a.length;i++){const x=a[i],tr=i?Math.max(x.h-x.l,Math.abs(x.h-a[i-1].c),Math.abs(x.l-a[i-1].c)):x.h-x.l;p=i<n?(p*i+tr)/(i+1):(p*(n-1)+tr)/n;r.push(p)}return r}
function ema(a,n){const k=2/(n+1);let e=a[0].c;for(const x of a)e=x.c*k+e*(1-k);return e}
function piv(a,L,R){const o=[];for(let i=L;i<a.length-R;i++){let h=1,l=1;for(let k=1;k<=L;k++){if(a[i-k].h>=a[i].h)h=0;if(a[i-k].l<=a[i].l)l=0}for(let k=1;k<=R;k++){if(a[i+k].h>a[i].h)h=0;if(a[i+k].l<a[i].l)l=0}if(h)o.push({i,p:a[i].h,hi:1});if(l)o.push({i,p:a[i].l,hi:0})}return o}
const mirror=a=>a.map(x=>({t:x.t,o:-x.o,h:-x.l,l:-x.h,c:-x.c,v:x.v}));

/* ---------- market structure: swing pivots, BOS / CHoCH on closes ---------- */
function struct(a,L=3){const p=piv(a,L,L),ev=[];let tr=0,sh=null,sl=null,pi=0;
 for(let i=0;i<a.length;i++){while(pi<p.length&&p[pi].i+L<=i){const q=p[pi++];q.hi?sh={p:q.p,i:q.i,u:0}:sl={p:q.p,i:q.i,u:0}}
  if(sh&&!sh.u&&a[i].c>sh.p){ev.push({i,dir:1,t:tr===1||!tr?'BOS':'CHoCH',lv:sh.p,from:sh.i});sh.u=1;tr=1}
  if(sl&&!sl.u&&a[i].c<sl.p){ev.push({i,dir:-1,t:tr===-1||!tr?'BOS':'CHoCH',lv:sl.p,from:sl.i});sl.u=1;tr=-1}}
 return{ev,tr}}
function trend(a,L){const p=piv(a,L,L),H=p.filter(x=>x.hi).slice(-2),W=p.filter(x=>!x.hi).slice(-2);let s=0;
 if(H.length>1&&W.length>1){if(H[1].p>H[0].p&&W[1].p>W[0].p)s=2;else if(H[1].p<H[0].p&&W[1].p<W[0].p)s=-2}
 s+=a.at(-1).c>ema(a.slice(-120),50)?1:-1;return s>=2?1:s<=-2?-1:0}

/* ---------- 1. dealer levels from clustered swing reactions ---------- */
function levels(D){const a15=D['15m'].cl,a1=D['1h'].cl,a4=D['4h'].cl,tol=atr(a1).at(-1)*.4,pts=[];
 [[a4,'H4',3,4],[a1,'H1',2,5],[a15,'M15',1,4]].forEach(([a,nm,w,L])=>piv(a,L,L).forEach(q=>pts.push({p:q.p,w:w*(.4+.6*q.i/a.length),tf:nm,age:(a.at(-1).t-a[q.i].t)/3600})));
 pts.sort((x,y)=>x.p-y.p);const cs=[];let c=null;
 for(const q of pts){if(c&&q.p-c.last<=tol){c.pts.push(q);c.last=q.p}else{c={pts:[q],last:q.p};cs.push(c)}}
 return cs.map(c=>{const W=c.pts.reduce((s,q)=>s+q.w,0),p=c.pts.reduce((s,q)=>s+q.p*q.w,0)/W;let tc=0;
  a1.slice(-300).forEach(x=>{if((Math.abs(x.h-p)<=tol&&x.c<p)||(Math.abs(x.l-p)<=tol&&x.c>p))tc++});
  const sc=W+.5*Math.min(tc,10),f={};c.pts.forEach(q=>f[q.tf]=(f[q.tf]||0)+1);
  return{p,score:sc,conf:Math.round(100*(1-Math.exp(-sc/8))),why:Object.entries(f).map(e=>e[0]+'×'+e[1]).join(' ')+' swings, '+tc+' H1 reactions, newest swing '+Math.round(Math.min(...c.pts.map(q=>q.age)))+'h ago'}}).filter(c=>c.score>=2.2)}
function dealer(cs,px,D){const A15=atr(D['15m'].cl).at(-1),up=cs.filter(c=>c.p>px).sort((a,b)=>a.p-b.p),dn=cs.filter(c=>c.p<=px).sort((a,b)=>b.p-a.p),L={};
 const mk=(c,t)=>c&&{...c,why:t+' '+c.why};
 L.res=mk(up[0],'Nearest cluster above price.');L.sup=mk(dn[0],'Nearest cluster below price.');
 L.ceil=mk(up.slice(1).sort((a,b)=>b.score-a.score||b.p-a.p)[0],'Strongest cluster above Active Resistance.');
 if(L.res&&L.ceil){const m=up.filter(c=>c.p>L.res.p&&c.p<L.ceil.p).sort((a,b)=>b.score-a.score)[0];
  L.piv=m?mk(m,'Strongest cluster between resistance and ceiling; price must reclaim it to flip bias.'):{p:(L.res.p+L.ceil.p)/2,conf:25,why:'No cluster between resistance and ceiling, so the midpoint is used (low confidence).'}}
 L.stab=mk(dn.slice(1,4).sort((a,b)=>b.score-a.score)[0],'Strongest of the next 3 clusters below Active Support.');
 if(L.res||L.sup){const below=L.sup&&(!L.res||px-L.sup.p<=L.res.p-px);
  L.trap=below?{lo:L.sup.p-.6*A15,hi:L.sup.p,conf:L.sup.conf,why:'Sell-side liquidity band (0.6×M15 ATR) under Active Support: stops rest here; a sweep followed by a reclaim is the buy trap.'}
  :{lo:L.res.p,hi:L.res.p+.6*A15,conf:L.res.conf,why:'Buy-side liquidity band (0.6×M15 ATR) over Active Resistance: stops rest here; a sweep followed by a rejection is the sell trap.'}}
 return L}

/* ---------- 2. market bias ---------- */
function bias(D){const t4=trend(D['4h'].cl,4),t1=trend(D['1h'].cl,5),t15=trend(D['15m'].cl,4),h=D['1h'].cl.slice(-48),A1=atr(D['1h'].cl).at(-1);
 const rng=(Math.max(...h.map(x=>x.h))-Math.min(...h.map(x=>x.l)))/A1,ar=['↓','·','↑'],tx=`H4 ${ar[t4+1]}  H1 ${ar[t1+1]}  M15 ${ar[t15+1]}`;let b,r;
 if(t4&&t4===t1&&t15===t4){b=t4>0?'BULLISH':'BEARISH';r='H4, H1 and M15 structure all agree (HH/HL or LH/LL plus EMA50 side).'}
 else if(t1&&t15===-t1){b='REVERSAL DEVELOPING';r=`M15 structure has turned ${t15>0?'up':'down'} against the H1 ${t1>0?'uptrend':'downtrend'}; needs H1 confirmation.`}
 else if(t1&&(t4===t1||!t4)){b=t1>0?'BULLISH':'BEARISH';r='H1 trend is '+(t1>0?'up':'down')+(t4?' and H4 agrees.':' with H4 neutral.')+' M15 is mixed.'}
 else if(!t1&&rng<5){b='RANGING';r=`H1 structure is flat and the last 48 H1 candles span only ${rng.toFixed(1)} ATR.`}
 else{b='NEUTRAL';r='Timeframes conflict or H1 has no clear structure.'}
 return{b,r,tx,t4,t1,t15}}

/* ---------- 5. liquidity pools and sweeps ---------- */
function liquidity(D,px,A15,a){const pools=[],a15=D['15m'].cl,a1=D['1h'].cl,P=piv(a15.slice(-300),3,3),tol=.15*A15;
 for(const hi of[1,0]){const q=P.filter(x=>x.hi===hi);for(let i=0;i<q.length;i++)for(let j=i+1;j<q.length;j++)if(Math.abs(q[i].p-q[j].p)<=tol){pools.push({k:hi?'EQH':'EQL',p:(q[i].p+q[j].p)/2,hi});break}}
 const day=x=>Math.floor(x.t/86400),d0=day(a1.at(-1))-1,pd=a1.filter(x=>day(x)===d0);
 if(pd.length){pools.push({k:'PDH',p:Math.max(...pd.map(x=>x.h)),hi:1},{k:'PDL',p:Math.min(...pd.map(x=>x.l)),hi:0})}
 const ses=x=>Math.floor(x.t/28800),s0=ses(a1.at(-1))-1,ps=a1.filter(x=>ses(x)===s0);
 if(ps.length){pools.push({k:'PSH',p:Math.max(...ps.map(x=>x.h)),hi:1},{k:'PSL',p:Math.min(...ps.map(x=>x.l)),hi:0})}
 const P1=piv(a1,5,5);for(const hi of[1,0]){const q=P1.filter(x=>x.hi===hi).reverse().find(x=>hi?!a1.slice(x.i+1).some(y=>y.h>x.p):!a1.slice(x.i+1).some(y=>y.l<x.p));if(q)pools.push({k:'SWH/SWL'.split('/')[hi?0:1],p:q.p,hi})}
 const w=a.slice(-200),n=w.length;
 return pools.filter(o=>Math.abs(o.p-px)<=8*A15).map(o=>{o.side=o.hi?'BSL':'SSL';let sw=-1;
  for(let i=n-1;i>=0;i--)if(o.hi?w[i].h>o.p&&w[i].c<o.p:w[i].l<o.p&&w[i].c>o.p){sw=i;break}
  const acc=w.slice(-3).every(x=>o.hi?x.c>o.p:x.c<o.p)&&n>3;
  o.st=acc?'accepted (genuine breakout)':sw>=n-40&&sw>=0?'SWEPT '+(n-1-sw)+' bars ago':'intact';o.swept=!acc&&sw>=n-40&&sw>=0;return o}).sort((x,y)=>y.p-x.p).slice(0,14)}

/* ---------- 3 & 4. setup state machine (written for the SELL frame; BUY uses mirrored candles) ---------- */
function setup(a,lvl,A){const n=a.length,r={};let ti=-1;
 for(let i=n-1;i>=n-40;i--)if(a[i].h>=lvl-.15*A){ti=i;break}
 if(ti<0)return r;let ts=ti;
 for(let i=ti-1;i>=Math.max(0,n-60);i--){if(a[i].h>=lvl-.15*A&&ts-i<=6)ts=i;else if(ts-i>6)break}
 let ext=-Infinity,hx=ts;for(let i=ts;i<n;i++)if(a[i].h>ext){ext=a[i].h;hx=i}
 Object.assign(r,{touch:1,ts,ext,hx,swept:ext>lvl,rej:ti<n-1||a[ti].c<lvl});
 const bd=x=>Math.abs(x.c-x.o),avg=a.slice(Math.max(0,n-21),n-1).reduce((s,x)=>s+bd(x),0)/20||1e-9;
 for(let j=hx;j<n;j++){const x=a[j];if(x.c<x.o&&x.c<lvl&&bd(x)>=1.3*avg){r.disp=j;r.dr=bd(x)/avg;break}}
 const e=struct(a).ev.find(e=>e.dir<0&&e.i>hx&&e.i>=ts);
 if(e){r.ev=e;for(let k=e.i+1;k<Math.min(n,e.i+7);k++)if(a[k].c<a[k].o&&a[k].c<e.lv){r.k=k;break}
  for(let m=e.i+1;m<n;m++)if(a[m].h>=e.lv-.25*A&&a[m].c<e.lv){r.m=m;break}
  if(r.k!=null){r.si=Math.max(r.k,r.m==null?r.k:r.m);r.entry=a[r.si].c;r.sl=ext+.1*A;r.inv=a.slice(r.si+1).some(x=>x.h>r.sl)}}
 return r}
function targets(dir,en,cs,L){if(dir>0){const u=cs.filter(c=>c.p>en).sort((a,b)=>a.p-b.p).map(c=>c.p),t1=u[0],t2=L.piv&&L.piv.p>t1?L.piv.p:u.find(p=>p>t1);
  return[t1,t2,L.ceil&&L.ceil.p>t2?L.ceil.p:u.find(p=>p>t2)]}
 const d=cs.filter(c=>c.p<en).sort((a,b)=>b.p-a.p).map(c=>c.p),t1=d[0],t2=d.find(p=>p<t1);return[t1,t2,L.stab&&L.stab.p<t2?L.stab.p:d.find(p=>p<t2)]}

/* ---------- 6. breakout / reclaim scenarios ---------- */
function scen(a,cs,px,A15,Ae){const out=[],n=a.length,s=Math.max(1,n-40);
 cs.filter(c=>Math.abs(c.p-px)<=3*A15).sort((x,y)=>Math.abs(x.p-px)-Math.abs(y.p-px)).slice(0,4).forEach(c=>{const L=c.p;let k=-1,d=0;
  for(let i=n-1;i>=s;i--){const u=a[i].c>L&&a[i-1].c<=L,w=a[i].c<L&&a[i-1].c>=L;if(u||w){k=i;d=u?1:-1;break}}
  if(k<0)return;const af=a.slice(k+1),big=Math.abs(a[k].c-a[k].o)>=.7*Ae,cur=a[n-1].c,fresh=n-1-k<=20;
  if(d>0&&cur>L){const rt=af.some(y=>y.l<=L+.25*Ae&&y.c>L);out.push({t:'BULLISH BREAKOUT',L,ok:big&&rt,s:big?(rt?'closed above with momentum, retest held as support':'closed above with momentum, waiting for retest'):'closed above on weak momentum, unconfirmed'})}
  else if(d>0&&fresh)out.push({t:'BEARISH RECLAIM FAILURE',L,ok:1,s:'broke above, then closed back below'});
  else if(d<0&&cur<L){const rt=af.some(y=>y.h>=L-.25*Ae&&y.c<L);out.push({t:'BEARISH BREAKDOWN',L,ok:big&&rt,s:big?(rt?'closed below with displacement, retest failed':'closed below with displacement, waiting for retest'):'closed below on weak momentum, unconfirmed'})}
  else if(d<0&&fresh)out.push({t:'BULLISH RECLAIM',L,ok:0,s:'broke below, then closed back above; needs structure confirmation'})});
 return out}

/* ---------- master analysis ---------- */
function analyze(D,etf,P){const E=D[etf],a=E.cl,px=E.all.at(-1).c,Ae=atr(a).at(-1),A15=atr(D['15m'].cl).at(-1);
 const cs=levels(D),L=dealer(cs,px,D),B=bias(D),str=struct(a),liq=liquidity(D,px,A15,a),sc=scen(a,cs,px,A15,Ae);
 const bal=+P.bal||10000,rk=+P.risk||1,minRR=+P.rr||2,cand=[];
 if(L.res)cand.push({dir:-1,lv:L.res.p,r:setup(a,L.res.p,Ae),nm:'SELL at Active Dealer Resistance'});
 if(L.sup){const r=setup(mirror(a),-L.sup.p,Ae);['ext','sl','entry'].forEach(k=>r[k]!=null&&(r[k]=-r[k]));if(r.ev)r.ev={...r.ev,lv:-r.ev.lv};cand.push({dir:1,lv:L.sup.p,r,nm:'BUY at Active Dealer Support'})}
 const pr=c=>[c.r.touch,c.r.swept,c.r.rej,c.r.disp!=null,c.r.ev,c.r.k!=null].filter(Boolean).length;
 cand.sort((x,y)=>pr(y)-pr(x)||Math.abs(px-x.lv)-Math.abs(px-y.lv));const C=cand[0]||null,r=C?C.r:{};
 const A={px,Ae,A15,cs,L,B,str,liq,sc,C,r,bal,rk,minRR,status:'WAITING',block:[],plan:null,grade:null};
 const near=Math.min(L.res?L.res.p-px:1e18,L.sup?px-L.sup.p:1e18);
 if(near<=1.5*A15)A.status='APPROACHING LEVEL';
 const vr=Ae/(med(atr(a).slice(-100))||Ae),spike=a.slice(-3).some(x=>x.h-x.l>3.2*Ae);A.vr=vr;
 A.vol=vr>2.5||spike?'EXTREME':vr>1.8?'HIGH':vr<.45?'DEAD':'NORMAL';
 if(C&&r.touch){A.status=r.swept&&!r.ev?'LIQUIDITY SWEEP':'CONFIRMATION REQUIRED';
  if(r.k!=null){const en=r.entry,sl=r.sl,risk=Math.abs(en-sl),tp=targets(C.dir,en,cs,L),rrOf=t=>t?Math.abs(t-en)/risk:null,rr=[rrOf(tp[0]),rrOf(tp[1]),rrOf(tp[2])],gate=rr[1]!=null?rr[1]:rr[0];
   const dist=Math.abs(px-en)/Ae,qty=risk>0?bal*rk/100/risk:0;
   A.plan={dir:C.dir,en,sl,tp,rr,risk,qty,notional:qty*en,dist};
   if(r.inv){A.status='SETUP INVALIDATED';A.block.push('price traded through the stop level after the signal')}
   else{if(!r.rej)A.block.push('no rejection back through the level');if(r.disp==null)A.block.push('no displacement candle');
    if(gate==null||gate<minRR)A.block.push(`RR ${gate==null?'n/a':'1:'+gate.toFixed(2)} (TP2 basis) is below the minimum 1:${minRR}`);
    if(A.vol==='EXTREME')A.block.push('volatility is extreme');if(A.vol==='DEAD')A.block.push('market is too quiet / low quality');
    if(dist>.8)A.block.push(`price is ${dist.toFixed(1)} ATR away from the entry zone, entry has passed`);}
   const S10=[],add=(n,v,t)=>S10.push({n,v:Math.max(0,Math.min(10,v)),t}),al=C.dir*(B.b==='BULLISH'?1:B.b==='BEARISH'?-1:0);
   add('HTF trend alignment',B.b==='REVERSAL DEVELOPING'?(C.dir===B.t15?6:2):B.b==='BULLISH'||B.b==='BEARISH'?(al>0?10:0):5,B.b);
   add('Liquidity sweep',r.swept?10:5,r.swept?'level swept':'touch only');add('Market structure shift',r.ev?(r.ev.t==='CHoCH'?10:8):0,r.ev?r.ev.t:'none');
   add('Displacement',r.dr?r.dr*4:0,r.dr?r.dr.toFixed(1)+'× avg body':'none');add('Confirmation candle',r.k!=null?10:0,r.k!=null?'closed beyond break':'none');
   add('Retest quality',r.m!=null?10:5,r.m!=null?'retest held':'no retest (market entry)');
   add('Distance to target',(Math.abs((tp[0]||en)-en)/Ae)*4,((Math.abs((tp[0]||en)-en)/Ae)).toFixed(1)+' ATR to TP1');
   add('Risk-to-reward',gate==null?0:gate/3*10,gate==null?'n/a':'1:'+gate.toFixed(2));
   add('Volatility',A.vol==='NORMAL'?(vr<1.3?10:7):A.vol==='HIGH'?4:0,A.vol+' ('+vr.toFixed(2)+'× norm)');
   const opp=cs.filter(c=>C.dir>0?(c.p>en&&c.p<en+risk):(c.p<en&&c.p>en-risk)).reduce((m,c)=>Math.max(m,c.score),0);add('Nearby opposing levels',10-opp*1.5,opp?'level within 1R':'clear path for 1R');
   const tot=Math.round(S10.reduce((s,x)=>s+x.v,0)),g=tot>=85?'A+':tot>=70?'A':tot>=55?'B':'C';A.grade={tot,g,S10};
   if(!A.block.length&&g==='C')A.block.push('setup quality is C (weak): avoid or wait');
   if(!r.inv&&A.block.length)A.status=A.block.every(b=>b.includes('entry has passed'))?'WAITING':'CONFIRMATION REQUIRED';
   else if(!r.inv)A.status=C.dir>0?'BUY CONFIRMED':'SELL CONFIRMED'}}
 return A}


const num=v=>v==null||!isFinite(v)?'-':v<1?v.toFixed(5):v<100?v.toFixed(3):v.toFixed(2);
// w: {symbol, interval, opts:{rr,risk,bal,sweep}}   K: {'4h':[candles],'1h':[..],'15m':[..],[entry tf]:[..]} candles = {time,open,high,low,close,volume}; the last one is still forming.
function events(w,K){const D={};for(const tf of Object.keys(K)){const all=K[tf].map(x=>({t:x.time,o:x.open,h:x.high,l:x.low,c:x.close,v:x.volume}));D[tf]={all,cl:all.slice(0,-1)}}
  const iv=w.interval,o=w.opts||{};if(!D['4h']||!D['1h']||!D['15m']||!D[iv]||D['4h'].cl.length<120||D['1h'].cl.length<120||D['15m'].cl.length<120||D[iv].cl.length<120)return[];
  const A=analyze(D,iv,{rr:o.rr,risk:o.risk,bal:o.bal}),a=D[iv].cl,n=a.length,r=A.r||{},tag=w.symbol+' '+iv,ev=[];
  if(/CONFIRMED/.test(A.status)&&A.plan&&r.si!=null&&r.si>=n-2){const p=A.plan,buy=p.dir>0;
   ev.push({key:`${w.symbol}|${iv}|dlr|${buy?'B':'S'}|${a[r.hx].t}`,title:(buy?'🟢 BUY ':'🔴 SELL ')+'Dealer Levels '+tag,
    body:`Entry ${num(p.en)} · SL ${num(p.sl)} · TP1 ${num(p.tp[0])} · TP2 ${num(p.tp[1])} · TP3 ${num(p.tp[2])} · RR ${p.rr[1]?'1:'+p.rr[1].toFixed(1):p.rr[0]?'1:'+p.rr[0].toFixed(1):'-'} · grade ${A.grade?A.grade.g:'-'}`})}
  else if(o.sweep&&A.status==='LIQUIDITY SWEEP'&&A.C&&r.hx!=null&&r.hx>=n-2)
   ev.push({key:`${w.symbol}|${iv}|dlr|sweep|${A.C.dir>0?'B':'S'}|${a[r.hx].t}`,title:'🟠 Liquidity sweep '+tag,body:`${A.C.dir>0?'Support':'Resistance'} ${num(A.C.lv)} swept. Waiting for a ${A.C.dir>0?'bullish':'bearish'} structure break before any signal.`});
  return ev}
module.exports={events,analyze};
