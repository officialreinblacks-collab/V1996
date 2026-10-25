// ===================================================================================================
// tools-2.js  -  extra tools loaded by index.html and run INSIDE the app (direct eval in start()).
// Each tool is its own try{} block: if one fails, the app and the other tools keep working.
// ===================================================================================================

// ---- [mmx] INDICATOR: Market Matrix - port of "Market Matrix (Zeiierman)" (c) Zeiierman, CC BY-NC-SA 4.0 ----
// Six mini-panels from a higher time frame (candles + MAs + swing anchored VWAP, RSI, MACD, Relative Trend Index, Absolute Strength Index,
// Range Oscillator) drawn to the right of the price, plus 89 EMA, chart volume, auto Fibonacci and regression channel. Original: tradingview.com
try{
const MM_DEF={tf:'1d',hist:150,guides:true,zones:true,fills:true,vals:true,bg:false,maOn:true,maF:true,maFl:20,maM:true,maMl:50,maS:true,maSl:200,
  vwOn:true,sw:50,apt:20,adapt:false,bias:10,marks:true,rsiL:14,rsiM:9,rsiOb:70,rsiOs:30,mF:12,mS:26,mG:9,rtiL:100,rtiSens:95,rtiSig:20,rtiOb:80,rtiOs:20,
  asiL:15,asiTop:0.15,asiBot:0.15,asiType:'SMA',asiLen:14,asiOb:8,asiOs:-8,rngL:50,rngM:2,heatN:2,heatT:1,heatOn:true,
  emaOn:true,emaL:89,volOn:true,volN:135,fib:false,fibL:160,chan:false,chanL:100};
const mmN=v=>v!=null&&isFinite(v), mmSec=iv=>{ const m=/^(\d+)([mhdwM])$/.exec(iv||''); return m?(+m[1])*({m:60,h:3600,d:86400,w:604800,M:2592000}[m[2]]):0; };
function mmEma(v,n){ const k=2/(n+1), o=new Array(v.length).fill(null); let p=null; for(let i=0;i<v.length;i++){ if(!mmN(v[i])){ p=null; continue; } p=p==null?v[i]:k*v[i]+(1-k)*p; o[i]=p; } return o; }
function mmSma(v,n){ const o=new Array(v.length).fill(null); for(let i=n-1;i<v.length;i++){ let s=0,ok=true; for(let j=i-n+1;j<=i;j++){ if(!mmN(v[j])){ ok=false; break; } s+=v[j]; } if(ok) o[i]=s/n; } return o; }
function mmWma(v,n){ const o=new Array(v.length).fill(null), d=n*(n+1)/2; for(let i=n-1;i<v.length;i++){ let s=0,ok=true; for(let j=0;j<n;j++){ const x=v[i-n+1+j]; if(!mmN(x)){ ok=false; break; } s+=x*(j+1); } if(ok) o[i]=s/d; } return o; }
function mmRma(v,n){ const o=new Array(v.length).fill(null); let p=null, s=0, c=0; for(let i=0;i<v.length;i++){ if(!mmN(v[i])){ p=null; s=0; c=0; continue; } if(p==null){ s+=v[i]; c++; if(c===n){ p=s/n; o[i]=p; } } else { p=(p*(n-1)+v[i])/n; o[i]=p; } } return o; }
function mmHma(v,n){ const a=mmWma(v,Math.max(1,Math.round(n/2))), b=mmWma(v,n), d=v.map((x,i)=>mmN(a[i])&&mmN(b[i])?2*a[i]-b[i]:null); return mmWma(d,Math.max(1,Math.round(Math.sqrt(n)))); }
function mmRsi(v,n){ const o=new Array(v.length).fill(null); let g=0,l=0; for(let i=1;i<v.length;i++){ const x=v[i]-v[i-1], gg=Math.max(x,0), ll=Math.max(-x,0); if(i<=n){ g+=gg; l+=ll; if(i===n){ g/=n; l/=n; } } else { g=(g*(n-1)+gg)/n; l=(l*(n-1)+ll)/n; } if(i>=n) o[i]=l===0?100:100-100/(1+g/l); } return o; }
const mmHi=(v,i,n)=>{ let m=null; for(let j=Math.max(0,i-n+1);j<=i;j++) if(mmN(v[j])&&(m==null||v[j]>m)) m=v[j]; return m; }, mmLo=(v,i,n)=>{ let m=null; for(let j=Math.max(0,i-n+1);j<=i;j++) if(mmN(v[j])&&(m==null||v[j]<m)) m=v[j]; return m; };
const MM_RGB={weakUp:[76,175,80],weakDn:[136,14,79]}, MM_TRANS='rgba(41,98,255,1)', MM_BULL='rgba(9,255,0,1)', MM_BEAR='rgba(255,0,0,1)';
function mmCompute(R,p){ const N=R.length, o=R.map(x=>x.o), h=R.map(x=>x.h), l=R.map(x=>x.l), c=R.map(x=>x.c), v=R.map(x=>x.v), X={o,h,l,c,v};
  X.rsi=mmRsi(c,p.rsiL); X.rsiMa=mmSma(X.rsi,p.rsiM);
  const ef=mmEma(c,p.mF), es=mmEma(c,p.mS); X.m=c.map((_,i)=>ef[i]-es[i]); X.sg=mmEma(X.m,p.mG); X.hist=X.m.map((x,i)=>x-X.sg[i]);
  // Relative Trend Index (nearest-rank percentiles)
  const up=c.map((x,i)=>i>=1?x+Math.abs(x-c[i-1])/2:null), lo=c.map((x,i)=>i>=1?x-Math.abs(x-c[i-1])/2:null), L=p.rtiL;
  const uR=Math.max(1,Math.min(L,Math.round(p.rtiSens/100*L))), lR=Math.max(1,Math.min(L,Math.round((100-p.rtiSens)/100*L))), uP=(uR-0.5)*100/L, lP=(lR-0.5)*100/L, rk=(a,pc)=>{ const s=a.slice().sort((x,y)=>x-y); return s[Math.max(1,Math.ceil(pc/100*s.length))-1]; };
  X.rti=new Array(N).fill(null); for(let i=L;i<N;i++){ const hi=rk(up.slice(i-L+1,i+1),uP), lw=rk(lo.slice(i-L+1,i+1),lP); if(hi!==lw) X.rti[i]=100*(c[i]-lw)/(hi-lw); } X.rtiS=mmEma(X.rti,p.rtiSig);
  // Absolute Strength Index
  const av=new Array(N).fill(0); for(let i=0;i<N;i++){ const pr=[]; for(let k=1;k<=p.asiL;k++){ if(i-k-1>=0&&c[i-k-1]!==0) pr.push(c[i-k]/c[i-k-1]-1); }
    if(pr.length){ pr.sort((a,b)=>a-b); const n=pr.length, wi=Math.max(0,Math.min(n-1,Math.ceil(n*(1-p.asiTop))-1)), li=Math.max(0,Math.min(n-1,Math.ceil(n*p.asiBot)-1)), win=pr[wi], los=pr[li], cur=i>=p.asiL&&c[i-p.asiL]!==0?c[i]/c[i-p.asiL]-1:null;
      av[i]=cur!=null&&win!==los?(cur-los)/(win-los)*2-1:0; } }
  X.asi=av; X.asiS=p.asiType==='EMA'?mmEma(av,p.asiLen):p.asiType==='WMA'?mmWma(av,p.asiLen):p.asiType==='RMA'?mmRma(av,p.asiLen):p.asiType==='HMA'?mmHma(av,p.asiLen):mmSma(av,p.asiLen);
  // Range Oscillator with the original heat-map colours
  const tr=R.map((x,i)=>i?Math.max(x.h-x.l,Math.abs(x.h-c[i-1]),Math.abs(x.l-c[i-1])):x.h-x.l), at=mmRma(tr,200), osc=new Array(N).fill(null), mean=new Array(N).fill(null);
  for(let i=0;i<N;i++){ let wp=0,wt=0; for(let j=0;j<p.rngL;j++){ if(i-j-1<0) break; const w=Math.abs(c[i-j]-c[i-j-1])/c[i-j-1]; wp+=c[i-j]*w; wt+=w; } if(wt!==0) mean[i]=wp/wt; const ra=mmN(at[i])?at[i]*p.rngM:null; if(mean[i]!=null&&ra) osc[i]=100*(c[i]-mean[i])/ra; }
  X.rng=osc; X.rngC=new Array(N).fill(null); let td=0;
  for(let i=0;i<N;i++){ const old=td; td=mean[i]!=null&&c[i]>mean[i]?1:mean[i]!=null&&c[i]<mean[i]?-1:old; const flip=td!==old, ra=mmN(at[i])?at[i]*p.rngM:null;
    const hi=i>=99?mmHi(osc,i,100):null, lw=i>=99?mmLo(osc,i,100):null; let col=null;
    if(mmN(osc[i])&&hi!=null&&lw!=null&&hi>lw){ const st=(hi-lw)/p.heatN, ne=Math.max(0,Math.min(p.heatN-1,Math.ceil((osc[i]-lw)/st)-1)), mid=lw+st*(ne+0.5); let cnt=0;
      for(let j=0;j<100;j++){ const q=osc[i-j]; if(mmN(q)&&q>=mid-st*0.5&&q<mid+st*0.5) cnt++; }
      const b=td===1?MM_RGB.weakUp:MM_RGB.weakDn, a1=1-Math.max(0,80-cnt)/100, f=Math.max(0,Math.min(1,(cnt-p.heatT)/10)); col='rgba('+b[0]+','+b[1]+','+b[2]+','+(a1+(1-a1)*f).toFixed(3)+')'; }
    let oc=col==null||flip?MM_TRANS:col; if(mean[i]!=null&&ra){ if(c[i]>mean[i]+ra) oc=MM_BULL; else if(c[i]<mean[i]-ra) oc=MM_BEAR; } X.rngC[i]=oc; }
  X.ma=[[p.maFl,p.maF],[p.maMl,p.maM],[p.maSl,p.maS]].map(q=>q[1]&&p.maOn?mmSma(c,q[0]):new Array(N).fill(null));
  // swing anchored VWAP
  if(p.vwOn){ const at50=mmRma(tr,50), aavg=mmRma(at50,50), val=new Array(N).fill(null), dir=new Array(N).fill(0), anc=[]; let ph=null,pl=null,pi=-1,qi=-1,ld=0,wp=null,wv=null;
    const alpha=k=>{ let apt=p.apt; if(p.adapt&&mmN(at50[k])&&mmN(aavg[k])&&aavg[k]>0&&at50[k]>0) apt=p.apt/Math.pow(at50[k]/aavg[k],p.bias); apt=Math.round(Math.max(5,Math.min(300,apt))); return 1-Math.exp(-Math.log(2)/Math.max(1,apt)); };
    for(let j=0;j<N;j++){ let nh=true, nl=true; for(let k=Math.max(0,j-p.sw+1);k<=j;k++){ if(h[k]>h[j]) nh=false; if(l[k]<l[j]) nl=false; }
      if(nh){ ph=h[j]; pi=j; } if(nl){ pl=l[j]; qi=j; } const d=pi>qi?1:-1;
      if(ld!==0&&d!==ld){ const ai=d>0?qi:pi, ap=d>0?pl:ph; if(ai>=0&&ap!=null){ anc.push({i:ai,p:ap,kind:d>0?-1:1}); wp=ap*v[ai]; wv=v[ai];
          for(let k=ai;k<=j;k++){ const a=alpha(k), hc=(h[k]+l[k]+c[k])/3; wp=(1-a)*wp+a*hc*v[k]; wv=(1-a)*wv+a*v[k]; val[k]=wv>0?wp/wv:null; dir[k]=d; } } }
      else { const a=alpha(j), hc=(h[j]+l[j]+c[j])/3; if(wp==null){ wp=hc*v[j]; wv=v[j]; } wp=(1-a)*wp+a*hc*v[j]; wv=(1-a)*wv+a*v[j]; val[j]=wv>0?wp/wv:null; dir[j]=d; }
      ld=d; }
    X.vw=val; X.vd=dir; X.anc=anc; } else { X.vw=new Array(N).fill(null); X.vd=new Array(N).fill(0); X.anc=[]; }
  return X; }

const mmD={}, mmRs=new WeakSet();
function mmGet(p){ const key=sym[0]+'|'+p.tf; let d=mmD[key]; if(!d) d=mmD[key]={rows:null,ts:0,busy:false,err:false,X:null,xk:''};
  if(!d.busy&&Date.now()-d.ts>60000){ d.busy=true;
    fetch(`${RB(sym[0])}/klines?symbol=${sym[0]}&interval=${p.tf}&limit=1000`).then(r=>r.json()).then(a=>{ if(Array.isArray(a)&&a.length){ d.rows=a.map(x=>({t:x[0]/1000,o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]})); d.err=false; } else d.err=true; }).catch(()=>{ d.err=true; })
      .then(()=>{ d.busy=false; d.ts=Date.now(); try{ render(); }catch(e){} }); }
  if(d.rows){ const k=JSON.stringify(p)+'|'+d.rows.length+'|'+d.rows[d.rows.length-1].t+'|'+d.rows[d.rows.length-1].c; if(d.xk!==k){ d.X=mmCompute(d.rows,p); d.xk=k; } }
  return d; }

IND.mmx={label:'Market Matrix \u00b7 6 higher-time-frame mini panels (Zeiierman)',cat:'Trend',nm:p=>'Market Matrix '+String(p.tf||'').toUpperCase(),p:Object.assign({},MM_DEF),cols:['#00e5c0'],
  fields:[['tf','sel','Mini-chart timeframe',{opts:['1h','4h','1d','1w']}],['hist','num','History points per panel',{min:20,max:245}],['vals','chk','Show values in panel headers'],['guides','chk','Show level / reference lines'],['bg','chk','Show panel backgrounds'],['zones','chk','Show shaded OB/OS zones'],['fills','chk','Show oscillator fills'],
    ['maOn','chk','HTF moving averages'],['maFl','num','Fast MA length',{min:2,max:400}],['maMl','num','Mid MA length',{min:2,max:400}],['maSl','num','Slow MA length',{min:2,max:400}],
    ['vwOn','chk','Swing anchored VWAP'],['sw','num','Swing period',{min:2,max:250}],['apt','num','Adaptive price tracking',{min:1,step:1}],['adapt','chk','Adapt tracking by ATR ratio'],['bias','num','Volatility bias',{min:0.1,step:0.1}],['marks','chk','Show HH / LH / HL / LL'],
    ['rsiL','num','RSI period',{min:2}],['rsiM','num','RSI MA period',{min:2}],['rsiOb','num','RSI overbought',{min:1,max:100}],['rsiOs','num','RSI oversold',{min:0,max:99}],
    ['mF','num','MACD fast',{min:2}],['mS','num','MACD slow',{min:3}],['mG','num','MACD signal',{min:2}],
    ['rtiL','num','RTI trend length',{min:10,max:300}],['rtiSens','num','RTI sensitivity',{min:50,max:98}],['rtiSig','num','RTI signal length',{min:1,max:200}],['rtiOb','num','RTI overbought',{min:0,max:100}],['rtiOs','num','RTI oversold',{min:0,max:100}],
    ['asiL','num','ASI returns lookback',{min:3,max:100}],['asiTop','num','ASI top percentile',{min:0.05,max:0.3,step:0.01}],['asiBot','num','ASI bottom percentile',{min:0.05,max:0.3,step:0.01}],['asiType','sel','ASI signal MA type',{opts:['SMA','EMA','WMA','RMA','HMA']}],['asiLen','num','ASI signal length',{min:1,max:150}],['asiOb','num','ASI overbought',{min:-20,max:20}],['asiOs','num','ASI oversold',{min:-20,max:20}],
    ['rngL','num','Range minimum length',{min:1}],['rngM','num','Range width multiplier',{min:0.1,step:0.1}],['heatN','num','Heat levels',{min:2,max:100}],['heatT','num','Minimum touches per level',{min:1}],['heatOn','chk','Original heat-map colours'],
    ['emaOn','chk','Show EMA on the chart'],['emaL','num','EMA length',{min:2}],['volOn','chk','Show chart volume'],['volN','num','Volume bars',{min:20,max:400}],['fib','chk','Auto Fibonacci'],['fibL','num','Fibonacci lookback',{min:30,max:450}],['chan','chk','Auto regression channel'],['chanL','num','Regression length',{min:30,max:400}]],
  calc:(c,p)=>{ if(!p.emaOn) return [[]]; const v=lrEmaMM(c.map(x=>x.close),p.emaL), o=[]; v.forEach((x,i)=>{ if(x!=null&&i>=p.emaL-1) o.push({time:c[i].time,value:x}); }); return [o]; },
  extras:(c,p)=>({mk:[],boxes:[{type:'mmview',pts:[],o:p}],labels:[]})};
function lrEmaMM(v,n){ return mmEma(v,n); }

{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='mmview') return _D.apply(this,arguments);
    const p=Object.assign({},MM_DEF,d.o), n0=candles.length; if(n0<5) return; cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    const pt=(txt,x,y,col,sz,bold,al)=>{ cx.font=(bold?'bold ':'')+sz+'px system-ui'; cx.textAlign=al||'left'; cx.fillStyle=col; cx.fillText(txt,x,y); };
    const xl=X(n0-1);
    // chart volume (bottom of the price area)
    if(p.volOn){ let pk=0; const a=Math.max(0,n0-p.volN); for(let i=a;i<n0;i++) pk=Math.max(pk,candles[i].volume||0);
      if(pk>0) for(let i=a;i<n0;i++){ const x0=X(i), x1=X(i+1); if(x0==null) continue; const bw=Math.max(1,(x1!=null?x1-x0:4)*0.8), hh=H*0.14*Math.min((candles[i].volume||0)/pk,1); cx.fillStyle=candles[i].close>=candles[i].open?'rgba(0,177,142,.34)':'rgba(235,65,80,.34)'; cx.fillRect(x0-bw/2,H-14-hh,bw,hh); } }
    if(p.chan&&n0>p.chanL){ const m=p.chanL, a=n0-m; let sx=0,sy=0,sxx=0,sxy=0; for(let k=0;k<m;k++){ const y=candles[a+k].close; sx+=k; sy+=y; sxx+=k*k; sxy+=k*y; } const sl=(m*sxy-sx*sy)/(m*sxx-sx*sx), ic=(sy-sl*sx)/m; let ss=0; for(let k=0;k<m;k++){ const e=candles[a+k].close-(ic+sl*k); ss+=e*e; } const sg=Math.sqrt(ss/m), xa=X(a), xb=X(n0-1);
      if(xa!=null&&xb!=null) [-2,0,2].forEach(f=>{ const ya=Y(ic+f*sg), yb=Y(ic+sl*(m-1)+f*sg); if(ya==null||yb==null) return; cx.strokeStyle=f===0?'rgba(235,65,80,.52)':'rgba(235,65,80,.8)'; cx.setLineDash([5,4]); cx.beginPath(); cx.moveTo(xa,ya); cx.lineTo(xb,yb); cx.stroke(); cx.setLineDash([]); }); }
    if(p.fib&&n0>p.fibL){ const a=n0-p.fibL; let hi=-1e30,lw=1e30; for(let i=a;i<n0;i++){ hi=Math.max(hi,candles[i].high); lw=Math.min(lw,candles[i].low); } const xa=X(a), xb=X(n0-1);
      if(xa!=null&&xb!=null) [0,0.236,0.382,0.5,0.618,0.786,1].forEach(r=>{ const lv=lw+(hi-lw)*r, y=Y(lv); if(y==null) return; cx.strokeStyle='rgba(139,163,188,.5)'; cx.setLineDash([4,4]); cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(xb,y); cx.stroke(); cx.setLineDash([]); pt(r+' ('+(lv>=100?lv.toFixed(2):lv.toPrecision(5))+')',xa+(xb-xa)*0.45,y-6,'rgba(225,237,244,.7)',8); }); }
    // mini panels
    const dd=mmGet(p), sec=mmSec(p.tf), cs=mmSec(tf[1]); let msg=null;
    if(sec&&cs&&cs>sec) msg='Mini-chart timeframe must be equal to or higher than the chart timeframe'; else if(!dd.rows) msg=dd.err?'Could not load '+p.tf+' candles for '+sym[0]:'Loading '+p.tf+' candles\u2026';
    const gap=36, x0=(xl==null?W*0.45:xl)+gap, Wp=W-x0-8;
    if(!msg&&Wp<230){ if(!mmRs.has(d.o)){ mmRs.add(d.o); try{ const ts=chart.timeScale(), bs=ts.options().barSpacing||6; ts.applyOptions({rightOffset:(ts.options().rightOffset||0)+Math.ceil((330-Wp)/bs)}); }catch(e){} } msg='Scroll the chart left to make room for the panels'; }
    if(msg){ pt(msg,Math.min(W-8,Math.max(8,x0)),H*0.06,'#ff9800',9,true,x0>W*0.5?'right':'left'); cx.restore(); return; }
    const Xd=dd.X, RN=dd.rows.length, n=Math.max(2,Math.min(p.hist,RN)), s0=RN-n, cg=14, cw=(Wp-cg)/2, top=H*0.04, rg=8, rh=(H*0.84-2*rg)/3, hd=30;
    const colx=[x0,x0+cw+cg], P=[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]];
    const frame=(k,title,info,icol)=>{ const x=colx[P[k][0]], y=top+P[k][1]*(rh+rg); if(p.bg){ cx.fillStyle='rgba(10,27,56,.5)'; cx.fillRect(x-3,y,cw+6,rh); cx.fillStyle='rgba(35,52,81,.55)'; cx.fillRect(x-3,y,cw+6,hd-2); cx.strokeStyle='rgba(54,83,108,.35)'; cx.strokeRect(x-3,y,cw+6,rh); }
      pt(title,x,y+8,'rgb(225,237,244)',8,true); if(p.vals) pt(info,x,y+20,icol,8); return {x,y:y+hd,w:cw,h:rh-hd-4}; };
    const sx=(R,j)=>R.x+j*(R.w-1)/(n-1), L=(R,lo,hi)=>v=>R.y+R.h-Math.max(0.005,Math.min(0.995,(v-lo)/(hi-lo)))*R.h;
    const sh=(arr)=>arr.slice(s0,s0+n);
    const trace=(R,vals,f,col,lw,dash)=>{ cx.strokeStyle=col; cx.lineWidth=lw||2; cx.setLineDash(dash||[]); cx.beginPath(); let on=false; vals.forEach((v,j)=>{ if(!mmN(v)){ on=false; return; } const x=sx(R,j), y=f(v); if(on) cx.lineTo(x,y); else{ cx.moveTo(x,y); on=true; } }); cx.stroke(); cx.setLineDash([]); };
    const exc=(R,vals,f,th,above,col)=>{ const yb=f(th); cx.fillStyle=col; for(let j=1;j<vals.length;j++){ const a=vals[j-1], b=vals[j]; if(!mmN(a)||!mmN(b)) continue; if(!(above?(a>th||b>th):(a<th||b<th))) continue; const x1=sx(R,j-1), x2=sx(R,j), ya=f(above?Math.max(a,th):Math.min(a,th)), yb2=f(above?Math.max(b,th):Math.min(b,th)); cx.beginPath(); cx.moveTo(x1,yb); cx.lineTo(x1,ya); cx.lineTo(x2,yb2); cx.lineTo(x2,yb); cx.closePath(); cx.fill(); } };
    const zones=(R,f,ob,os,co,cs2)=>{ if(!p.zones) return; cx.fillStyle=co; cx.fillRect(R.x,R.y,R.w,f(ob)-R.y); cx.fillStyle=cs2; cx.fillRect(R.x,f(os),R.w,R.y+R.h-f(os)); };
    const lines=(R,f,ob,os,co,cs2)=>{ if(!p.guides) return; [[ob,co],[os,cs2]].forEach(q=>{ cx.strokeStyle=q[1]; cx.lineWidth=1; cx.setLineDash([4,3]); cx.beginPath(); cx.moveTo(R.x,f(q[0])); cx.lineTo(R.x+R.w,f(q[0])); cx.stroke(); cx.setLineDash([]); }); };
    const mid=(R,f,v)=>{ if(!p.guides) return; cx.strokeStyle='rgba(139,163,188,.3)'; cx.lineWidth=1; cx.setLineDash([1,3]); cx.beginPath(); cx.moveTo(R.x,f(v)); cx.lineTo(R.x+R.w,f(v)); cx.stroke(); cx.setLineDash([]); };
    const last=a=>a[RN-1], fx=(v,dg)=>mmN(v)?v.toFixed(dg==null?2:dg):'-', pr=v=>v>=100?v.toFixed(2):v.toPrecision(5);
    const OBZ='rgba(0,177,142,.07)', OSZ='rgba(235,65,80,.07)', OBL='rgba(0,177,142,.9)', OSL='rgba(235,65,80,.9)';
    // 1 HTF candles + MAs + swing VWAP
    { const R=frame(0,p.tf.toUpperCase()+'  |  HTF CANDLES + SWING VWAP','C '+pr(last(Xd.c))+' | '+n+' bars'+(p.vwOn&&mmN(last(Xd.vw))?' | VW '+pr(last(Xd.vw)):''),'rgb(0,177,142)');
      let hi=-1e30,lo=1e30; for(let j=0;j<n;j++){ const i=s0+j; hi=Math.max(hi,Xd.h[i]); lo=Math.min(lo,Xd.l[i]); Xd.ma.forEach(a=>{ if(mmN(a[i])){ hi=Math.max(hi,a[i]); lo=Math.min(lo,a[i]); } }); if(mmN(Xd.vw[i])){ hi=Math.max(hi,Xd.vw[i]); lo=Math.min(lo,Xd.vw[i]); } }
      const rg2=Math.max(hi-lo,1e-9), cmax=hi+rg2*0.065, cmin=lo-rg2*0.065, f=L(R,cmin,cmax), bw=Math.max(1,Math.min(5,R.w/n*0.7));
      for(let j=0;j<n;j++){ const i=s0+j, x=sx(R,j), up=Xd.c[i]>=Xd.o[i], col=up?'rgb(0,177,142)':'rgb(235,65,80)'; cx.strokeStyle=col; cx.lineWidth=1; cx.beginPath(); cx.moveTo(x,f(Xd.l[i])); cx.lineTo(x,f(Xd.h[i])); cx.stroke();
        const yo=f(Xd.o[i]), yc=f(Xd.c[i]); cx.fillStyle=up?'rgba(0,177,142,.85)':'rgba(235,65,80,.85)'; cx.fillRect(x-bw/2,Math.min(yo,yc),bw,Math.max(1,Math.abs(yc-yo))); }
      [[0,'rgb(247,211,42)'],[1,'rgb(72,132,255)'],[2,'rgb(240,240,240)']].forEach(q=>trace(R,sh(Xd.ma[q[0]]),f,q[1],1.5,[2,3]));
      if(p.vwOn){ let seg=[],pd=0; const flush=()=>{ if(seg.length>1){ cx.strokeStyle=pd>0?'#00e676':'#ff5252'; cx.lineWidth=2; cx.beginPath(); seg.forEach((q,k)=>k?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1])); cx.stroke(); } seg=[]; };
        for(let j=0;j<n;j++){ const i=s0+j, v=Xd.vw[i]; if(!mmN(v)){ flush(); pd=0; continue; } if(pd!==0&&Xd.vd[i]!==pd) flush(); seg.push([sx(R,j),f(v)]); pd=Xd.vd[i]; } flush();
        if(p.marks){ let ph=null,pl=null; Xd.anc.forEach(a=>{ let tag=''; if(a.kind===1){ if(ph!=null) tag=a.p>ph?'HH':a.p<ph?'LH':''; ph=a.p; } else { if(pl!=null) tag=a.p>pl?'HL':a.p<pl?'LL':''; pl=a.p; }
            if(tag&&a.i>=s0){ const y=f(a.p), pad=R.h*0.025; pt(tag,sx(R,a.i-s0),a.kind===1?y-pad-4:y+pad+4,'rgba(0,162,255,.85)',9,true,'center'); } }); } } }
    // 2 RSI
    { const R=frame(1,p.tf.toUpperCase()+'  |  RSI','RSI '+fx(last(Xd.rsi))+'    MA '+fx(last(Xd.rsiMa)),'rgb(247,211,42)'), f=L(R,0,100), a=sh(Xd.rsi);
      zones(R,f,p.rsiOb,p.rsiOs,OBZ,OSZ); mid(R,f,50); if(p.fills){ exc(R,a,f,p.rsiOb,true,'rgba(0,177,142,.36)'); exc(R,a,f,p.rsiOs,false,'rgba(235,65,80,.36)'); }
      trace(R,a,f,'rgb(158,123,240)',2); trace(R,sh(Xd.rsiMa),f,'rgb(247,211,42)',2); lines(R,f,p.rsiOb,p.rsiOs,OBL,OSL); }
    // 3 MACD
    { const R=frame(2,p.tf.toUpperCase()+'  |  MACD','MACD '+fx(last(Xd.m))+'  SIG '+fx(last(Xd.sg))+'  HIST '+fx(last(Xd.hist)),'rgb(243,157,39)'); let ab=1e-5; for(let j=0;j<n;j++){ const i=s0+j; [Xd.m[i],Xd.sg[i],Xd.hist[i]].forEach(v=>{ if(mmN(v)) ab=Math.max(ab,Math.abs(v)); }); } ab*=1.18;
      const f=L(R,-ab,ab), z=f(0); mid(R,f,0); const bw=Math.max(1,R.w/n*0.8);
      for(let j=0;j<n;j++){ const i=s0+j, hv=Xd.hist[i], pv=i>0?Xd.hist[i-1]:null; if(!mmN(hv)) continue; let col;
        if(hv>=0) col=(pv==null||hv>=pv)?'rgb(15,176,166)':'rgb(126,206,206)'; else col=(pv==null||hv<=pv)?'rgb(229,78,100)':'rgb(241,158,172)'; cx.fillStyle=col; const y=f(hv); cx.fillRect(sx(R,j)-bw/2,Math.min(y,z),bw,Math.max(1,Math.abs(y-z))); }
      trace(R,sh(Xd.m),f,'rgb(246,151,21)',2); trace(R,sh(Xd.sg),f,'rgb(52,112,245)',2); }
    // 4 RTI
    { const R=frame(3,p.tf.toUpperCase()+'  |  RELATIVE TREND INDEX','RTI '+fx(last(Xd.rti))+'    EMA '+fx(last(Xd.rtiS)),'rgb(12,194,174)'), a=sh(Xd.rti), b=sh(Xd.rtiS); let lo=Math.min(0,p.rtiOs), hi=Math.max(100,p.rtiOb); a.concat(b).forEach(v=>{ if(mmN(v)){ lo=Math.min(lo,v); hi=Math.max(hi,v); } }); const pd=Math.max((hi-lo)*0.08,3); lo-=pd; hi+=pd; const f=L(R,lo,hi);
      zones(R,f,p.rtiOb,p.rtiOs,OBZ,OSZ); mid(R,f,50); if(p.fills){ exc(R,a,f,p.rtiOb,true,'rgba(9,255,0,.52)'); exc(R,a,f,p.rtiOs,false,'rgba(255,0,0,.52)'); }
      trace(R,a,f,'rgb(12,194,174)',2); trace(R,b,f,'rgb(40,190,235)',2); lines(R,f,p.rtiOb,p.rtiOs,OBL,OSL); }
    // 5 ASI
    { const R=frame(4,p.tf.toUpperCase()+'  |  ABSOLUTE STRENGTH INDEX','ASI '+fx(last(Xd.asi))+'    '+p.asiType+' '+fx(last(Xd.asiS)),'rgb(87,128,245)'), a=sh(Xd.asi), b=sh(Xd.asiS); let lo=Math.min(-10,p.asiOs), hi=Math.max(10,p.asiOb); a.concat(b).forEach(v=>{ if(mmN(v)){ lo=Math.min(lo,v); hi=Math.max(hi,v); } }); const pd=Math.max((hi-lo)*0.08,0.4); lo-=pd; hi+=pd; const f=L(R,lo,hi);
      zones(R,f,p.asiOb,p.asiOs,OBZ,OSZ); mid(R,f,0); if(p.fills){ exc(R,a,f,p.asiOb,true,'rgba(9,255,0,.5)'); exc(R,a,f,p.asiOs,false,'rgba(255,0,0,.5)'); }
      trace(R,a,f,'rgb(87,128,245)',2); trace(R,b,f,'rgb(241,207,51)',2); lines(R,f,p.asiOb,p.asiOs,OBL,OSL); }
    // 6 Range oscillator
    { const R=frame(5,p.tf.toUpperCase()+'  |  RANGE OSCILLATOR','OSC '+fx(last(Xd.rng))+'    BOUNDS +/-100','rgb(41,98,255)'), a=sh(Xd.rng); let lo=-100, hi=100; a.forEach(v=>{ if(mmN(v)){ lo=Math.min(lo,v); hi=Math.max(hi,v); } }); const pd=Math.max((hi-lo)*0.055,10); lo-=pd; hi+=pd; const f=L(R,lo,hi);
      zones(R,f,100,-100,OBZ,OSZ); mid(R,f,0);
      if(p.fills){ [[0,true,.08],[50,true,.16],[100,true,.32]].forEach(q=>exc(R,a,f,q[0],q[1],'rgba(9,255,0,'+q[2]+')')); [[0,false,.08],[-50,false,.16],[-100,false,.32]].forEach(q=>exc(R,a,f,q[0],q[1],'rgba(255,0,0,'+q[2]+')')); }
      if(p.heatOn){ const cl=sh(Xd.rngC); cx.lineWidth=2; for(let j=1;j<n;j++){ if(!mmN(a[j-1])||!mmN(a[j])) continue; cx.strokeStyle=cl[j]||MM_TRANS; cx.beginPath(); cx.moveTo(sx(R,j-1),f(a[j-1])); cx.lineTo(sx(R,j),f(a[j])); cx.stroke(); } } else trace(R,a,f,MM_TRANS,2);
      lines(R,f,100,-100,OBL,OSL); }
    cx.restore(); }; }
}catch(err){ console.error('mmx indicator failed',err); window.__mmxErr=err; }


// ---- [slo] INDICATOR: Shaakuni - Liquidity Levels & Order Blocks - port of the Pine v6 script by Shaakuni (MPL 2.0) ----
// Previous week / previous day highs, lows and 50% (EQ) levels, simple Order Blocks (OB / POI) from a swing break + ATR impulse rule,
// and a small panel with the active New York session and the status of the previous day's high / low. A context tool, not a strategy.
try{
const SL_DEF={panel:true,pos:'Top Right',theme:'Dark',tz:'Auto (DST)',psize:'Small',showWeek:true,showEQ:true,showPrevW:true,showDay:true,showDEQ:true,showOB:true,showFresh:true,showMit:false,
  lbMode:'Auto',lbMan:500,swLen:10,imp:0.7,cBull:'#2979ff',cBear:'#ff7043',cEQ:'#ffd700',cDEQ:'#00e5ff',cHead:'#ffc850',cLab:'#a0a0a0'};
const slTfSec=iv=>{ const m=/^(\d+)([mhdwM])$/.exec(iv||''); return m?(+m[1])*({m:60,h:3600,d:86400,w:604800,M:2592000}[m[2]]):0; };
const slRgba=(c,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'')); if(!m) return c; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const slFmt=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1000?String(Math.round(v)):Math.abs(v)>=100?v.toFixed(2):v.toPrecision(5);
const slSame=(a,b)=>a!=null&&b!=null&&Math.abs(a-b)<=Math.abs(a)*1e-7;
let slFmtr=null;
function slSession(tz){ let h,m; const d=new Date();
  if(tz==='Auto (DST)'){ try{ if(!slFmtr) slFmtr=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'numeric',hourCycle:'h23'}); const q=slFmtr.formatToParts(d); h=+q.find(x=>x.type==='hour').value%24; m=+q.find(x=>x.type==='minute').value; }catch(e){ h=(d.getUTCHours()-4+24)%24; m=d.getUTCMinutes(); } }
  else { h=(d.getUTCHours()-(tz==='Manual UTC-4 (EDT)'?4:5)+24)%24; m=d.getUTCMinutes(); }
  const t=h*60+m; return t>=1200&&t<1440?'Asian':t>=120&&t<300?'London':t>=420&&t<600?'New York':t>=600&&t<720?'London Close':'-'; }
function slCompute(c,p){ const N=c.length, D={N,ok:false,zones:[]}; if(N<20) return D;
  const H=c.map(x=>x.high), L=c.map(x=>x.low), O=c.map(x=>x.open), C=c.map(x=>x.close);
  // ATR(14), Wilder
  const atr=new Array(N).fill(null); { let s=0; for(let i=0;i<N;i++){ const tr=i?Math.max(H[i]-L[i],Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1])):H[i]-L[i]; if(i<14){ s+=tr; if(i===13) atr[i]=s/14; } else atr[i]=(atr[i-1]*13+tr)/14; } }
  // weekly + daily ranges
  let tH=null,tL=null,tHB=-1,tLB=-1,pwh=null,pwl=null,pwhB=-1,pwlB=-1,pwh2=null,pwl2=null,pwh2B=-1,pwl2B=-1,pw=null,dH=null,dL=null,dHB=-1,dLB=-1,pdh=null,pdl=null,pdhB=-1,pdlB=-1,pd=null;
  for(let i=0;i<N;i++){ const day=Math.floor(c[i].time/86400), wk=Math.floor((day+3)/7);
    if(i===0||wk!==pw){ pwh2=pwh; pwl2=pwl; pwh2B=pwhB; pwl2B=pwlB; pwh=tH; pwl=tL; pwhB=tHB; pwlB=tLB; tH=H[i]; tL=L[i]; tHB=i; tLB=i; } else { if(H[i]>tH){ tH=H[i]; tHB=i; } if(L[i]<tL){ tL=L[i]; tLB=i; } }
    if(i===0||day!==pd){ pdh=dH; pdl=dL; pdhB=dHB; pdlB=dLB; dH=H[i]; dL=L[i]; dHB=i; dLB=i; } else { if(H[i]>dH){ dH=H[i]; dHB=i; } if(L[i]<dL){ dL=L[i]; dLB=i; } }
    pw=wk; pd=day; }
  const cl=b=>Math.max(b,N-1-499);
  D.week=pwh!=null?{hi:pwh,lo:pwl,hiB:cl(pwhB),loB:cl(pwlB),cur:false}:{hi:tH,lo:tL,hiB:cl(tHB),loB:cl(tLB),cur:true};
  D.prevW=pwh!=null&&pwh2!=null?{hi:pwh2,lo:pwl2,hiB:cl(pwh2B),loB:cl(pwl2B)}:null;
  D.day=pdh!=null?{hi:pdh,lo:pdl,hiB:cl(pdhB),loB:cl(pdlB),cur:false}:{hi:dH,lo:dL,hiB:cl(dHB),loB:cl(dLB),cur:true};
  D.pdh=pdh; D.pdl=pdl; D.dHi=dH; D.dLo=dL; D.close=C[N-1];
  D.pdhSt='Active'; D.pdlSt='Active';
  if(pdh!=null){ if(C[N-1]>pdh) D.pdhSt='Break'; else if(dH>pdh) D.pdhSt='Sweep !'; }
  if(pdl!=null){ if(C[N-1]<pdl) D.pdlSt='Break'; else if(dL<pdl) D.pdlSt='Sweep !'; }
  // order blocks / POI (confirmed bars only, no repaint)
  const sw=p.swLen, im=p.imp, Z=[]; let lastBull=-1, lastBear=-1;
  for(let t=0;t<N;t++){
    if(t<N-1&&atr[t]!=null&&t>sw+2){ const a=atr[t];
      let hh=H[t-1], hOff=1; for(let i=2;i<=sw;i++) if(H[t-i]>hh){ hh=H[t-i]; hOff=i; }
      if(C[t]>hh&&hOff>=3){ let mn=L[t-1], mnOff=1; for(let i=2;i<=hOff-1;i++) if(L[t-i]<mn){ mn=L[t-i]; mnOff=i; }
        let dOff=-1; for(let k=0;k<=mnOff-1;k++){ const o=mnOff-1-k; if(C[t-o]>O[t-o]&&(C[t-o]-O[t-o])>=a*im){ dOff=o; break; } }
        if(dOff>=0){ let ob=mnOff; for(let j=dOff+1;j<=mnOff;j++) if(C[t-j]<O[t-j]){ ob=j; break; }
          let fresh=true; if(ob>=2) for(let k=0;k<=ob-2;k++) if(L[t-k]<=H[t-ob]){ fresh=false; break; }
          const obBar=t-ob; if(fresh&&obBar!==lastBull){ lastBull=obBar; Z.push({ty:5,top:H[t-ob],bot:L[t-ob],obBar,cbar:t,st:0,mit:-1}); } } }
      let ll=L[t-1], lOff=1; for(let i=2;i<=sw;i++) if(L[t-i]<ll){ ll=L[t-i]; lOff=i; }
      if(C[t]<ll&&lOff>=3){ let mx=H[t-1], mxOff=1; for(let i=2;i<=lOff-1;i++) if(H[t-i]>mx){ mx=H[t-i]; mxOff=i; }
        let dOff=-1; for(let k=0;k<=mxOff-1;k++){ const o=mxOff-1-k; if(C[t-o]<O[t-o]&&(O[t-o]-C[t-o])>=a*im){ dOff=o; break; } }
        if(dOff>=0){ let ob=mxOff; for(let j=dOff+1;j<=mxOff;j++) if(C[t-j]>O[t-j]){ ob=j; break; }
          let fresh=true; if(ob>=2) for(let k=0;k<=ob-2;k++) if(H[t-k]>=L[t-ob]){ fresh=false; break; }
          const obBar=t-ob; if(fresh&&obBar!==lastBear){ lastBear=obBar; Z.push({ty:6,top:H[t-ob],bot:L[t-ob],obBar,cbar:t,st:0,mit:-1}); } } } }
    for(let k=Z.length-1;k>=0;k--){ const z=Z[k]; if(z.st===0&&t>z.cbar&&H[t]>=z.bot&&L[t]<=z.top){ z.st=2; z.mit=t; } } }
  const lb=p.lbMode==='Auto'?(()=>{ const s=slTfSec(tf[1]); return s<=60?2000:s<=300?1500:s<=900?1000:s<=1800?700:s<=3600?500:s<=14400?250:150; })():p.lbMan;
  D.zones=Z.filter(z=>z.cbar>=N-1-lb).slice(-200); D.ok=true; return D; }
let slMem=null;
function slGet(c,p){ const N=c.length, key=JSON.stringify(p)+'|'+N+'|'+(N?c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(slMem&&slMem.k===key) return slMem.D;
  let D; try{ D=slCompute(c,p); }catch(e){ console.error('slo calc failed',e); D={N,ok:false,zones:[]}; } slMem={k:key,D}; return D; }
IND.slo={label:'Shaakuni \u00b7 Liquidity Levels & Order Blocks',cat:'Trend',nm:()=>'Shaakuni Levels & OB',p:Object.assign({},SL_DEF),cols:['#ffc850'],
  fields:[['panel','chk','Show panel'],['pos','sel','Panel position',{opts:['Top Left','Top Right','Bottom Left','Bottom Right','Middle Left','Middle Right']}],['theme','sel','Theme',{opts:['Dark','Light']}],['tz','sel','Timezone',{opts:['Auto (DST)','Manual UTC-4 (EDT)','Manual UTC-5 (EST)']}],['psize','sel','Panel text size',{opts:['Small','Medium','Large']}],
    ['showWeek','chk','Show weekly high / low'],['showEQ','chk','Show weekly EQ (50%)'],['showPrevW','chk','Show previous week'],['showDay','chk','Show daily high / low'],['showDEQ','chk','Show daily EQ (50%)'],
    ['showOB','chk','Show Order Blocks (OB / POI)'],['showFresh','chk','Show unmitigated'],['showMit','chk','Show mitigated'],['lbMode','sel','Zone lookback',{opts:['Auto','Manual']}],['lbMan','num','Manual lookback (bars)',{min:30,max:2000}],
    ['swLen','num','OB structure lookback (bars)',{min:3,max:50}],['imp','num','OB impulse candle (x ATR)',{min:0.1,max:5,step:0.1}],
    ['cBull','col','Bull OB / POI'],['cBear','col','Bear OB / POI'],['cEQ','col','Weekly EQ'],['cDEQ','col','Daily EQ'],['cHead','col','Panel header text']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},SL_DEF,p); return {mk:[],boxes:[{type:'slview',pts:[],o:q,D:slGet(c,q)}],labels:[]}; }};

{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='slview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, n0=candles.length; if(!D||!D.ok||n0<5) return; const dark=p.theme!=='Light';
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    const xe=X(n0-1), xp=X(n0-2), bw=(xe!=null&&xp!=null)?Math.max(1,xe-xp):6, xr=(xe==null?W*0.8:xe)+bw*5, xa=i=>{ const v=X(i); return v==null?0:v; };
    const C={pwh:dark?'#dc3232':'#8b0000',pwl:dark?'#1eb464':'#0a5c34',pdh:dark?'#ff8c00':'#964500',pdl:dark?'#0096c8':'#004e7c'};
    const ln=(x1,x2,y,col,dash,w)=>{ if(y==null) return; cx.strokeStyle=col; cx.lineWidth=w||1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y); cx.lineTo(x2,y); cx.stroke(); cx.setLineDash([]); };
    const lab=(txt,y,bg,fg)=>{ if(y==null) return; cx.font='bold 9px system-ui'; const w=cx.measureText(txt).width+8, x=Math.min(xr,W-w-2); cx.fillStyle=bg; cx.fillRect(x,y-7,w,14); cx.fillStyle=fg; cx.textAlign='left'; cx.fillText(txt,x+4,y); };
    const small=(txt,x,y,col)=>{ cx.font='9px system-ui'; cx.fillStyle=col; cx.textAlign='center'; cx.fillText(txt,x,y); };
    const dayOn=p.showDay&&['1w','1M'].indexOf(tf[1])<0&&!(slTfSec(tf[1])>=604800);
    const wk=D.week, dy=D.day; let mergeH=false, mergeL=false;
    if(dayOn&&p.showWeek){ mergeH=slSame(dy.hi,wk.hi); mergeL=slSame(dy.lo,wk.lo); }
    // order blocks
    if(p.showOB) D.zones.forEach(z=>{ const bull=z.ty===5, fresh=z.st<2; if(fresh&&!p.showFresh) return; if(!fresh&&!p.showMit) return;
      const x0=xa(z.obBar), x1=fresh?xr:xa(z.mit+2), y0=Y(z.top), y1=Y(z.bot); if(y0==null||y1==null||x1<=x0) return;
      const col=bull?p.cBull:p.cBear;
      cx.fillStyle=fresh?slRgba(col,dark?0.18:0.32):'rgba(0,0,0,.25)'; cx.fillRect(x0,Math.min(y0,y1),x1-x0,Math.max(1,Math.abs(y1-y0)));
      if(fresh){ cx.strokeStyle=slRgba(col,dark?0.7:0.85); cx.lineWidth=1; cx.strokeRect(x0,Math.min(y0,y1),x1-x0,Math.max(1,Math.abs(y1-y0))); }
      const cxm=(x0+Math.min(x1,W))/2; if(Math.abs(y1-y0)>9) small(slSec()>=3600?'POI':'OB',cxm,(y0+y1)/2,'rgba(255,255,255,.85)'); });
    function slSec(){ return slTfSec(tf[1]); }
    // weekly
    if(p.showWeek&&wk.hi!=null){ const yh=Y(wk.hi), yl=Y(wk.lo), xh=xa(wk.hiB), xl=xa(wk.loB);
      if(yh!=null&&yl!=null){ cx.fillStyle=dark?'rgba(128,128,128,.05)':'rgba(120,120,120,.07)'; cx.fillRect(Math.min(xh,xl),Math.min(yh,yl),xr-Math.min(xh,xl),Math.abs(yl-yh)); }
      ln(xh,xr,yh,C.pwh); ln(xl,xr,yl,C.pwl);
      lab((mergeH?'PDH / PWH  ':'PWH  ')+slFmt(wk.hi),yh,C.pwh,'#fff'); lab((mergeL?'PDL / PWL  ':'PWL  ')+slFmt(wk.lo),yl,C.pwl,'#fff');
      if(p.showEQ){ const eq=(wk.hi+wk.lo)/2, ye=Y(eq); ln(Math.min(xh,xl),xr,ye,p.cEQ,[5,4]); lab('W-EQ (50%)  '+slFmt(eq),ye,p.cEQ,'#000'); }
      if(p.showPrevW&&D.prevW){ const v=D.prevW, a=xa(v.hiB), b=xa(v.loB); ln(a,xr,Y(v.hi),slRgba(C.pwh,0.4),[1.5,3]); ln(b,xr,Y(v.lo),slRgba(C.pwl,0.4),[1.5,3]);
        const y1=Y(v.hi), y2=Y(v.lo); if(y1!=null) small(slFmt(v.hi),a,y1-8,C.pwh); if(y2!=null) small(slFmt(v.lo),b,y2+8,C.pwl); } }
    // daily
    if(dayOn&&dy.hi!=null){ const yh=Y(dy.hi), yl=Y(dy.lo), xh=xa(dy.hiB), xl=xa(dy.loB);
      ln(xh,xr,yh,C.pdh); ln(xl,xr,yl,C.pdl);
      if(!mergeH) lab('PDH  '+slFmt(dy.hi),yh,C.pdh,'#fff'); if(!mergeL) lab('PDL  '+slFmt(dy.lo),yl,C.pdl,'#fff');
      if(p.showDEQ){ const eq=(dy.hi+dy.lo)/2, ye=Y(eq); ln(Math.min(xh,xl),xr,ye,p.cDEQ,[5,4]); lab('D-EQ (50%)  '+slFmt(eq),ye,p.cDEQ,'#000'); } }
    // panel
    if(p.panel){ const fs=p.psize==='Large'?14:p.psize==='Medium'?12:10, rh=fs+9, sess=slSession(p.tz), live=sess!=='-', hasD=dayOn&&D.pdh!=null;
      const stTxt=s=>s==='Sweep !'?'Sweep !':s==='Break'?'Broken X':'Active', stCol=s=>s==='Sweep !'?'#fff':s==='Break'?'#c86464':'#a0a0a0';
      const rows=[['Shaakuni - Levels & OB',String(sym[0])+' / '+String(tf[1]),p.cHead,'#a0a0a0','#1f1f1f'],['Session',live?sess:'No Active Session','#a0a0a0',live?'#64c88c':'#a0a0a0','#2d2d2d']];
      if(hasD){ rows.push(['Day High',stTxt(D.pdhSt)+'  '+slFmt(D.pdh),C.pdh,stCol(D.pdhSt),D.pdhSt==='Sweep !'?'rgba(0,180,80,.75)':'#141414']); rows.push(['Day Low',stTxt(D.pdlSt)+'  '+slFmt(D.pdl),C.pdl,stCol(D.pdlSt),D.pdlSt==='Sweep !'?'rgba(0,180,80,.75)':'#141414']); }
      cx.font=fs+'px system-ui'; let w1=0,w2=0; rows.forEach(r=>{ w1=Math.max(w1,cx.measureText(r[0]).width); w2=Math.max(w2,cx.measureText(r[1]).width); }); const pw=w1+w2+32, ph=rows.length*rh, m=6;
      const left=/Left/.test(p.pos), x0=left?m:W-pw-m, y0=/Top/.test(p.pos)?m+34:/Bottom/.test(p.pos)?H-ph-m-24:(H-ph)/2;
      rows.forEach((r,k)=>{ const y=y0+k*rh; cx.fillStyle=r[4]; cx.fillRect(x0,y,pw,rh); cx.font=(k===0?'bold ':'')+fs+'px system-ui'; cx.textAlign='left'; cx.fillStyle=r[2]; cx.fillText(r[0],x0+8,y+rh/2); cx.textAlign='right'; cx.fillStyle=r[3]; cx.fillText(r[1],x0+pw-8,y+rh/2); });
      cx.strokeStyle='#2a2a2a'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph); }
    cx.restore(); }; }
}catch(err){ console.error('slo indicator failed',err); window.__sloErr=err; }

// ---- [dpr] INDICATOR: Dual-Phase Reversal - Exhaustion, Pivots & Pressure - port of the Pine v6 script by (c) dgtrd ----
// Momentum Exhaustion (9 steps) -> Terminal Exhaustion (13 steps) with support / resistance and invalidation levels, higher-timeframe Range Pivots
// (S / P / R, developing + historical), Volume Pressure oscillator drawn under / over the price, Volume-Weighted Bars and a small dashboard.
try{
const DP_DEF={mode:'Completed Only',srLv:true,stopLv:false,piv:true,pivTf:'Auto',devPiv:false,histPiv:false,cR:'#f23645',cS:'#089981',
  prs:true,cOsc:'#00bcd4',prsLen:13,ob:75,os:25,oscLen:200,place:'Bottom',oscH:9,oscOff:5,
  vwb:true,vma:89,vhi:1.618,vlo:0.618,dash:true,dpos:'Top Right'};
const dpRgba=(c,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'')); if(!m) return c; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const dpTfSec=iv=>{ const m=/^(\d+)([mhdwM])$/.exec(iv||''); return m?(+m[1])*({m:60,h:3600,d:86400,w:604800,M:2592000}[m[2]]):0; };
const dpFmt=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1000?String(Math.round(v)):Math.abs(v)>=100?v.toFixed(2):v.toPrecision(5);
function dpAuto(s){ if(s<=180) return '1 Hour'; if(s<=900) return '4 Hour'; if(s<=3600) return 'Daily'; if(s<=14400) return 'Weekly'; if(s===86400) return 'Monthly'; if(s===604800) return 'Quarterly'; if(s<86400) return 'Monthly'; return 'Yearly'; }
function dpKey(t,k){ if(k==='1 Hour') return Math.floor(t/3600); if(k==='4 Hour') return Math.floor(t/14400); if(k==='Daily') return Math.floor(t/86400);
  if(k==='Weekly') return Math.floor((Math.floor(t/86400)+3)/7); const d=new Date(t*1000), y=d.getUTCFullYear(), m=d.getUTCMonth();
  return k==='Monthly'?y*12+m:k==='Quarterly'?y*4+Math.floor(m/3):y; }
const dpPv=(o,h,l,c)=>{ const x=c<o?h+2*l+c:c>o?2*h+l+c:h+l+2*c; return [x/2-l,x/4,x/2-h]; };
function dpCompute(c,p,tfs){ const N=c.length, D={N,ok:false}; if(N<30) return D;
  const O=c.map(x=>x.open),H=c.map(x=>x.high),L=c.map(x=>x.low),C=c.map(x=>x.close),V=c.map(x=>x.volume||0);
  const A=()=>new Array(N).fill(0), bc=A(),sc=A(),bq=A(),sq=A(),bRes=A(),sSup=A(),bStop=A(),sStop=A(),bec=A(),sec=A(),bf=A(),sf=A(),beStopA=A(),seStopA=A();
  const g=(a,i,k)=>i-k>=0?a[i-k]:NaN;
  let bCnt=0,sCnt=0,bLowest=0,bHigh=0,sHighest=0,sLow=0,bResP=0,sSupP=0,bStpP=0,sStpP=0;
  let bE=0,sE=0,stB=false,stS=false,refB=0,refS=0,beHi=0,beHigh=0,beLow=0,beLowest=0,beStop=0,beTgt=0,seHi=0,seHigh=0,seLow=0,seLowest=0,seStop=0,seTgt=0;
  for(let i=0;i<N;i++){ const c0=C[i], c4=g(C,i,4), c1=g(C,i,1), c5=g(C,i,5);
    const bms=c0<c4&&c1>c5, sms=c0>c4&&c1<c5;
    if(c0<c4){ bCnt=(bCnt===0||bCnt===9)?(bms?1:0):bCnt+1; sCnt=0; } else if(c0>c4){ sCnt=(sCnt===0||sCnt===9)?(sms?1:0):sCnt+1; bCnt=0; } else { bCnt=0; sCnt=0; }
    const l1=g(L,i,1),l2=g(L,i,2),l3=g(L,i,3),h1=g(H,i,1),h2=g(H,i,2),h3=g(H,i,3);
    bq[i]=((L[i]<=l3&&L[i]<=l2)||(l1<=l3&&l1<=l2))?1:0; sq[i]=((H[i]>=h3&&H[i]>=h2)||(h1>=h3&&h1>=h2))?1:0; bc[i]=bCnt; sc[i]=sCnt;
    let hi9=NaN,lo9=NaN; if(i>=8){ hi9=-Infinity; lo9=Infinity; for(let k=i-8;k<=i;k++){ if(H[k]>hi9) hi9=H[k]; if(L[k]<lo9) lo9=L[k]; } }
    bResP=bCnt===9?hi9:(c0>bResP?0:bResP); bRes[i]=bResP;
    if(bCnt===1) bLowest=L[i]; if(bCnt>0){ bLowest=Math.min(L[i],bLowest); if(L[i]===bLowest) bHigh=H[i]; }
    bStpP=bCnt===9?2*bLowest-bHigh:(c0<bStpP?0:bStpP); bStop[i]=bStpP;
    sSupP=sCnt===9?lo9:(c0<sSupP?0:sSupP); sSup[i]=sSupP;
    if(sCnt===1) sHighest=H[i]; if(sCnt>0){ sHighest=Math.max(H[i],sHighest); if(H[i]===sHighest) sLow=L[i]; }
    sStpP=sCnt===9?2*sHighest-sLow:(c0>sStpP?0:sStpP); sStop[i]=sStpP;
    // terminal exhaustion - buy side
    const bCond=c0<=g(L,i,2), bFail=bCond&&L[i]>=refB, bePrev=bE;
    stB=(bCnt===9&&bE===0)?true:((sCnt===9||bE===13||c0>bResP)?false:stB);
    bE=stB?(bCnt===9?(bCond?1:0):(bCond?bE+1:bE)):0; if(bE===13&&bFail) bE-=1; if(bE===8&&bE!==bePrev) refB=c0;
    bf[i]=(stB&&bE===bePrev&&bE===12&&bFail)?1:0; bec[i]=bE;
    if(bE===1){ beLowest=L[i]; beHi=H[i]; } if(stB){ beHi=Math.max(H[i],beHi); beLowest=Math.min(L[i],beLowest); if(H[i]===beHi) beLow=L[i]; if(L[i]===beLowest) beHigh=H[i]; }
    beTgt=bE===13?2*beHi-beLow:((c0>beTgt||(beStop===0&&sE===13))?0:beTgt);
    beStop=bE===13?2*beLowest-beHigh:((c0<beStop||(beTgt===0&&sE===13))?0:beStop); beStopA[i]=beStop;
    // terminal exhaustion - sell side
    const sCond=c0>=g(H,i,2), sFail=sCond&&H[i]<=refS, sePrev=sE;
    stS=(sCnt===9&&sE===0)?true:((bCnt===9||sE===13||c0<sSupP)?false:stS);
    sE=stS?(sCnt===9?(sCond?1:0):(sCond?sE+1:sE)):0; if(sE===13&&sFail) sE-=1; if(sE===8&&sE!==sePrev) refS=c0;
    sf[i]=(stS&&sE===sePrev&&sE===12&&sFail)?1:0; sec[i]=sE;
    if(sE===1){ seLowest=L[i]; seHi=H[i]; } if(stS){ seHi=Math.max(H[i],seHi); seLowest=Math.min(L[i],seLowest); if(H[i]===seHi) seLow=L[i]; if(L[i]===seLowest) seHigh=H[i]; }
    seStop=sE===13?2*seHi-seLow:((c0>seStop||(seTgt===0&&bE===13))?0:seStop); seStopA[i]=seStop;
    seTgt=sE===13?2*seLowest-seHigh:((c0<seTgt||(seStop===0&&bE===13))?0:seTgt); }
  Object.assign(D,{O,H,L,C,V,bc,sc,bq,sq,bRes,sSup,bStop,sStop,bec,sec,bf,sf,beStopA,seStopA});
  // higher-timeframe range pivots
  const kind=p.pivTf==='Auto'?dpAuto(dpTfSec(tfs)):p.pivTf; D.kind=kind;
  const R1a=new Array(N).fill(NaN),Pa=new Array(N).fill(NaN),S1a=new Array(N).fill(NaN),chg=A();
  let o=0,h=0,l=0,ox=0,hx=0,lx=0,cx_=0,pk=null,st=0,pst=-1,haveP=false;
  for(let i=0;i<N;i++){ const k=dpKey(c[i].time,kind);
    if(i===0){ o=O[0]; h=H[0]; l=L[0]; st=0; }
    else if(k!==pk){ ox=o; hx=h; lx=l; cx_=C[i-1]; o=O[i]; h=H[i]; l=L[i]; pst=st; st=i; haveP=true; chg[i]=1; }
    else { h=Math.max(h,H[i]); l=Math.min(l,L[i]); }
    pk=k; if(haveP){ const q=dpPv(ox,hx,lx,cx_); R1a[i]=q[0]; Pa[i]=q[1]; S1a[i]=q[2]; } }
  D.R1a=R1a; D.Pa=Pa; D.S1a=S1a; D.chg=chg; D.havePiv=haveP&&pst>=0;
  if(D.havePiv){ D.t1=c[st].time; D.t11=c[pst].time; D.dev=dpPv(o,h,l,C[N-1]); }
  // volume pressure
  const osc=A(); if(p.prs){ const len=Math.max(1,p.prsLen|0); for(let i=0;i<N;i++){ if(!V[i]) continue; let bp=0,sp=0;
      for(let j=0;j<len&&i-j>=0;j++){ const k=i-j, d=C[k]-O[k], r=H[k]-L[k]; if(r>0){ if(d>0) bp+=d/r*V[k]; if(d<0) sp+=d/r*V[k]; } }
      const dom=bp+Math.abs(sp); osc[i]=dom!==0?100*(bp/dom):50; } }
  const sig=new Array(N).fill(NaN); { let s=0; for(let i=0;i<N;i++){ s+=osc[i]; if(i>=9) s-=osc[i-9]; if(i>=8) sig[i]=s/9; } }
  D.osc=osc; D.hist=osc.map((v,i)=>v-sig[i]);
  const vl=Math.max(1,p.vma|0), vs=new Array(N).fill(NaN); { let s=0; for(let i=0;i<N;i++){ s+=V[i]; if(i>=vl) s-=V[i-vl]; if(i>=vl-1) vs[i]=s/vl; } } D.vsma=vs;
  D.ok=true; return D; }
let dpMem=null;
function dpGet(c,p){ const N=c.length, key=JSON.stringify(p)+'|'+tf[1]+'|'+N+'|'+(N?c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low+'|'+c[N-1].volume:''); if(dpMem&&dpMem.k===key) return dpMem.D;
  let D; try{ D=dpCompute(c,p,tf[1]); }catch(e){ console.error('dpr calc failed',e); D={N,ok:false}; } dpMem={k:key,D}; return D; }
IND.dpr={label:'Dual-Phase Reversal (DGT)',cat:'Trend',nm:()=>'Dual-Phase Reversal',p:Object.assign({},DP_DEF),cols:['#00bcd4'],
  fields:[['mode','sel','Phase display mode',{opts:['Completed Only','All Sequence Steps','None']}],['srLv','chk','Momentum support & resistance levels'],['stopLv','chk','Momentum & terminal invalidation levels'],
    ['piv','chk','Range pivot'],['pivTf','sel','Pivot timeframe',{opts:['Auto','1 Hour','4 Hour','Daily','Weekly','Monthly','Quarterly','Yearly']}],['devPiv','chk','Developing range pivot'],['histPiv','chk','Historical range pivot'],['cR','col','Resistance'],['cS','col','Support'],
    ['prs','chk','Volume pressure'],['cOsc','col','Pressure line'],['prsLen','num','Pressure length',{min:1,max:200}],['ob','num','Pressure upper band',{min:1,max:100}],['os','num','Pressure lower band',{min:0,max:99}],
    ['oscLen','num','Display length (bars)',{min:10,max:475,step:10}],['place','sel','Placement',{opts:['Top','Middle','Bottom']}],['oscH','num','Height',{min:1,max:10}],['oscOff','num','Vertical offset',{min:-3,max:10}],
    ['vwb','chk','Volume-weighted bars'],['vma','num','Volume MA length',{min:1,max:500}],['vhi','num','High-volume multiplier',{min:1,step:0.1}],['vlo','num','Low-volume multiplier',{min:0.1,step:0.1}],
    ['dash','chk','Dashboard'],['dpos','sel','Dashboard position',{opts:['Top Right','Top Left','Bottom Left']}]],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},DP_DEF,p); return {mk:[],boxes:[{type:'dprview',pts:[],o:q,D:dpGet(c,q)}],labels:[]}; }};

{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='dprview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, N=candles.length; if(!D||!D.ok||N<30||D.N!==N) return;
    const xe=X(N-1), xp=X(N-2); if(xe==null||xp==null) return; const bw=xe-xp; if(!(bw>0)) return;
    const xi=i=>xe+(i-(N-1))*bw, iLo=Math.max(0,Math.floor(N-1-(xe+40)/bw)), iHi=Math.min(N-1,Math.ceil(N-1+(W+40-xe)/bw));
    const tb=(t)=>{ if(t>=candles[N-1].time){ const dt=candles[N-1].time-candles[N-2].time; return N-1+(t-candles[N-1].time)/(dt||1); }
      let a=0,b=N-1; while(a<b){ const m=(a+b)>>1; if(candles[m].time<t) a=m+1; else b=m; } return a; };
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    const fg='#d1d4dc', RED='#f23645', TEAL='#089981';
    // volume-weighted bars (repaint the candle with its volume colour)
    if(p.vwb){ const cw=Math.max(1,Math.round(bw*0.74)); for(let i=iLo;i<=iHi;i++){ const v=D.V[i], vs=D.vsma[i]; if(!v||!(vs>0)) continue; let col=null; const up=D.O[i]<D.C[i];
        if(v>vs*p.vhi) col=up?'#006400':'#910000'; else if(v<vs*p.vlo) col=up?'#7FFFD4':'#FF9800'; if(!col) continue;
        const x=xi(i), yh=Y(D.H[i]), yl=Y(D.L[i]), yo=Y(D.O[i]), yc=Y(D.C[i]); if(yh==null||yl==null||yo==null||yc==null) continue;
        cx.strokeStyle=col; cx.fillStyle=col; cx.lineWidth=1; cx.beginPath(); cx.moveTo(x,yh); cx.lineTo(x,yl); cx.stroke(); cx.fillRect(x-cw/2,Math.min(yo,yc),cw,Math.max(1,Math.abs(yc-yo))); } }
    // historical range pivots
    if(p.histPiv){ const seg=(arr,col,brk)=>{ cx.strokeStyle=col; cx.lineWidth=1; cx.beginPath(); let pen=false; for(let i=Math.max(0,iLo-1);i<=iHi;i++){ const v=arr[i]; if(!(v>0)||(brk&&D.chg[i])){ pen=false; if(!(v>0)||!brk) continue; }
          const y=Y(v); if(y==null){ pen=false; continue; } const x=xi(i); if(!pen){ cx.moveTo(x,y); pen=true; } else cx.lineTo(x,y); } cx.stroke(); };
      seg(D.R1a,p.cR,true); seg(D.Pa,'#2962ff',false); seg(D.S1a,p.cS,true); }
    // momentum support / resistance + invalidation levels
    const poly=(arr,col)=>{ cx.strokeStyle=col; cx.lineWidth=1; cx.beginPath(); let pen=false; for(let i=Math.max(0,iLo-1);i<=iHi;i++){ const v=arr[i]; if(!(v>0)){ pen=false; continue; } const y=Y(v); if(y==null){ pen=false; continue; } const x=xi(i); if(!pen){ cx.moveTo(x,y); pen=true; } else cx.lineTo(x,y); } cx.stroke(); };
    const dots=(arr)=>{ cx.fillStyle='#2962ff'; for(let i=iLo;i<=iHi;i++){ const v=arr[i]; if(!(v>0)) continue; const y=Y(v); if(y==null) continue; cx.beginPath(); cx.arc(xi(i),y,1.4,0,6.2832); cx.fill(); } };
    if(p.srLv){ poly(D.bRes,RED); poly(D.sSup,TEAL); }
    if(p.stopLv){ dots(D.bStop); dots(D.sStop); dots(D.beStopA); dots(D.seStopA); }
    // phase markers
    if(p.mode!=='None'){ const all=p.mode==='All Sequence Steps'; const up=new Array(iHi-iLo+1).fill(0), dn=new Array(iHi-iLo+1).fill(0);
      const put=(i,above,txt,bg,col)=>{ const x=xi(i), k=i-iLo, y0=above?Y(D.H[i]):Y(D.L[i]); if(y0==null) return; const ln=String(txt).split('\n'); cx.font=(bg?'bold ':'')+'9px system-ui'; cx.textAlign='center';
        const w=Math.max(14,Math.max.apply(null,ln.map(s=>cx.measureText(s).width))+8), h=bg?ln.length*10+4:11, off=above?up[k]:dn[k], g0=4, yEdge=above?y0-g0-off:y0+g0+off, yTop=above?yEdge-h-(bg?4:0):yEdge+(bg?4:0);
        if(bg){ cx.fillStyle=bg; const ry=above?yTop:yTop; cx.beginPath(); cx.moveTo(x,yEdge); cx.lineTo(x-3,above?yEdge-4:yEdge+4); cx.lineTo(x+3,above?yEdge-4:yEdge+4); cx.closePath(); cx.fill(); cx.fillRect(x-w/2,ry,w,h); }
        cx.fillStyle=col; ln.forEach((s,j)=>cx.fillText(s,x,yTop+(bg?2:0)+5+j*10+(bg?0:0))); if(above) up[k]+=h+(bg?4:0)+1; else dn[k]+=h+(bg?4:0)+1; };
      const a25=(c,a)=>dpRgba(c,a);
      for(let i=iLo;i<=iHi;i++){ const bn=D.bc[i], sn=D.sc[i], pb=D.bq[i], ps=D.sq[i], be=D.bec[i], se=D.sec[i], bePv=i?D.bec[i-1]:0, sePv=i?D.sec[i-1]:0;
        if(all){ if(bn>=1&&bn<=7) put(i,true,String(bn),null,RED); if(bn===8) put(i,true,pb?'Q8':'8',pb?a25(TEAL,.25):null,pb?'#fff':RED);
                 if(sn>=1&&sn<=7) put(i,true,String(sn),null,TEAL); if(sn===8) put(i,true,ps?'Q8':'8',ps?a25(RED,.25):null,ps?'#fff':TEAL); }
        if(bn===9) put(i,false,pb?'M\nQ':'M',a25(TEAL,.75),'#fff');
        if(sn===9) put(i,true,ps?'Q\nM':'M',a25(RED,.75),'#fff');
        if(all){ if(be!==bePv&&be>=1&&be<=12) put(i,false,String(be),null,RED); if(D.bf[i]) put(i,false,'+',null,RED);
                 if(se!==sePv&&se>=1&&se<=12) put(i,false,String(se),null,TEAL); if(D.sf[i]) put(i,false,'+',null,TEAL); }
        if(be!==bePv&&be===13) put(i,false,'T',a25('#006400',.75),'#fff');
        if(se!==sePv&&se===13) put(i,true,'T',a25('#910000',.75),'#fff'); } }
    // range pivots (current + developing)
    if(p.piv&&D.havePiv){ const t1=D.t1, t11=D.t11, t2=2*t1-t11, t20=3*t1-2*t11, ix1=xi(tb(t1)), ix2=xi(tb(t2)), ix20=xi(tb(t20));
      const lvl=(x1,x2,v,col,w,lb)=>{ const y=Y(v); if(y==null) return; cx.strokeStyle=col; cx.lineWidth=w; cx.beginPath(); cx.moveTo(x1,y); cx.lineTo(x2,y); cx.stroke();
        cx.font='bold 10px system-ui'; cx.fillStyle=col; cx.textAlign='left'; cx.fillText(lb+' ('+dpFmt(v)+')',x2+4,y); };
      lvl(ix1,ix2,D.S1a[N-1],p.cS,2,'S'); lvl(ix1,ix2,D.R1a[N-1],p.cR,2,'R'); lvl(ix1,ix2,D.Pa[N-1],'#2962ff',2,'P');
      if(p.devPiv&&D.dev){ lvl(ix2,ix20,D.dev[2],p.cS,1,'S'); lvl(ix2,ix20,D.dev[0],p.cR,1,'R'); lvl(ix2,ix20,D.dev[1],'#2962ff',1,'P'); } }
    // volume pressure oscillator
    if(p.prs&&candles[N-1].volume){ const Lk=Math.min(Math.max(10,p.oscLen|0),N-1); let pHi=-Infinity,pLo=Infinity,oH=-Infinity,oL=Infinity;
      for(let i=N-Lk;i<=N-1;i++){ if(D.H[i]>pHi) pHi=D.H[i]; if(D.L[i]<pLo) pLo=D.L[i]; if(D.osc[i]>oH) oH=D.osc[i]; if(D.osc[i]<oL) oL=D.osc[i]; }
      const rate=(pHi-pLo)/pHi, mid=p.place==='Middle', off=p.oscOff/10; if(!mid){ pLo=pLo*(1-rate*off); pHi=pHi*(1+rate*off); }
      const oLw=oH===oL?oL-1:oL, hight=rate/(11-p.oscH), base=p.place==='Top'?pHi:pLo;
      const lev=v=>mid?pLo+(v-oLw)*(pHi-pLo)/(oH-oLw):base*(1+v/oH*hight);
      const xs=xi(N-1-Lk), xz=xi(N-1), yOb=Y(lev(p.ob)), yOs=Y(lev(p.os)), yMd=Y(lev(50));
      if(yOb!=null&&yOs!=null){ if(!mid){ cx.fillStyle='rgba(41,98,255,.05)'; cx.fillRect(xs,Math.min(yOb,yOs),xz-xs,Math.abs(yOs-yOb)); }
        cx.strokeStyle='#808080'; cx.lineWidth=1; cx.setLineDash([4,3]); [yOb,yOs].forEach(y=>{ cx.beginPath(); cx.moveTo(xs,y); cx.lineTo(xz,y); cx.stroke(); });
        if(yMd!=null){ cx.strokeStyle='rgba(128,128,128,.5)'; cx.beginPath(); cx.moveTo(xs,yMd); cx.lineTo(xz,yMd); cx.stroke(); } cx.setLineDash([]); }
      const hw=Math.max(1.5,bw*0.62), yb=Y(base);
      for(let b=0;b<Lk;b++){ const i=N-1-b, hs=D.hist[i]; if(!isFinite(hs)) continue; const x=xi(i); if(x<-10||x>W+10) continue; const yt=Y(base*(1+hs/oH*hight)); if(yb==null||yt==null) continue;
        const pv=i?D.hist[i-1]:hs; const col=hs>=0?(pv<hs?'#26A69A':'#B2DFDB'):(pv<hs?'#FFCDD2':'#FF5252'); cx.fillStyle=col; cx.fillRect(x-hw/2,Math.min(yb,yt),hw,Math.max(1,Math.abs(yt-yb))); }
      cx.strokeStyle=p.cOsc; cx.lineWidth=1.5; cx.beginPath(); let pen=false; for(let b=Lk;b>=0;b--){ const i=N-1-b; const y=Y(lev(D.osc[i])); if(y==null){ pen=false; continue; } const x=xi(i); if(!pen){ cx.moveTo(x,y); pen=true; } else cx.lineTo(x,y); } cx.stroke(); }
    // dashboard
    if(p.dash){ const last=N-1, bn=D.bc[last], sn=D.sc[last], be=D.bec[last], se=D.sec[last], cl=D.C[last];
      const mT=bn>0?'Buy-side '+bn+'/9':sn>0?'Sell-side '+sn+'/9':'\u2014', mC=bn>0?RED:sn>0?TEAL:'#9598a1';
      const tT=be>0?'Buy-side '+be+'/13':se>0?'Sell-side '+se+'/13':'\u2014', tC=be>0?RED:se>0?TEAL:'#9598a1';
      const R1=D.R1a[last], P=D.Pa[last], S1=D.S1a[last], pvOk=p.piv&&R1>0&&P>0&&S1>0; let pT='\u2014', pC='#9598a1';
      if(pvOk){ const dR=Math.abs(cl-R1), dP=Math.abs(cl-P), dS=Math.abs(cl-S1), isR=dR<=dP&&dR<=dS, isP=!isR&&dP<=dS, nm=isR?'R':isP?'P':'S', nv=isR?R1:isP?P:S1, pc=(nv-cl)/cl*100;
        pT=nm+' '+(pc>=0?'+':'')+(Math.round(pc*100)/100)+'%'; pC=cl>R1?TEAL:cl<S1?RED:'#9598a1'; }
      const o=D.osc[last], hasV=!!candles[N-1].volume; const prT=!p.prs?'Off':hasV?(o>=50?Math.round(o)+'% Bull':Math.round(100-o)+'% Bear'):'No data', prC=!p.prs?'#9598a1':hasV?(o>=50?TEAL:RED):'#9598a1';
      const rows=[['Momentum',mT,mC],['Terminal',tT,tC],['Pivot',pT,pC],['Pressure',prT,prC]]; const fs=11, rh=fs+9; cx.font=fs+'px system-ui'; let w1=0,w2=0; rows.forEach(r=>{ w1=Math.max(w1,cx.measureText(r[0]).width); w2=Math.max(w2,cx.measureText(r[1]).width); });
      cx.font='bold '+fs+'px system-ui'; const tw=cx.measureText('Dual-Phase Reversal').width, pw=Math.max(w1+w2+30,tw+16), ph=(rows.length+1)*rh, m=6;
      const left=/Left/.test(p.dpos), x0=left?m:W-pw-m, y0=/Top/.test(p.dpos)?m+34:Hh-ph-m-24;
      cx.fillStyle='rgba(0,0,0,.35)'; cx.fillRect(x0,y0,pw,ph); cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph);
      cx.textAlign='center'; cx.fillStyle=fg; cx.fillText('Dual-Phase Reversal',x0+pw/2,y0+rh/2);
      rows.forEach((r,k)=>{ const y=y0+(k+1)*rh; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x0+pw,y); cx.stroke(); cx.font=fs+'px system-ui'; cx.textAlign='left'; cx.fillStyle=fg; cx.fillText(r[0],x0+8,y+rh/2); cx.textAlign='right'; cx.fillStyle=r[2]; cx.fillText(r[1],x0+pw-8,y+rh/2); }); }
    cx.restore(); }; }
}catch(err){ console.error('dpr indicator failed',err); window.__dprErr=err; }

// ---- [lsp] INDICATOR: Liquidity Sweep Pro - port of the Pine v6 script "Liquidity Sweep Pro | Open Source" by PROTRADER9 (MPL 2.0) ----
// Swing highs / lows (pivot, same number of bars left and right) become liquidity levels. When a candle pokes through the latest level and
// CLOSES back on the other side, it prints BEAR SWEEP (above a swing high) or BULL SWEEP (below a swing low). Only the newest high and low are drawn.
try{
const LS_DEF={pivotLen:5,showLevels:true,showSignals:true,confirmClose:true,mkSize:'Small',alBull:true,alBear:true,alSound:false,cHigh:'#f23645',cLow:'#00e676',cBull:'#089981',cBear:'#f23645'};
const LS_SZ={Small:.8,Normal:1,Large:1.5};
function lsCompute(c,p){ const N=c.length, K=Math.max(1,Math.round(+p.pivotLen)||5), D={N,ok:false,ev:[],hi:null,lo:null}; if(N<2*K+2) return D;
  const H=c.map(x=>x.high), Lw=c.map(x=>x.low), C=c.map(x=>x.close); let lastH=null,lastL=null,hiB=-1,loB=-1;
  for(let i=0;i<N;i++){ const k=i-K;
    if(k>=K){ let ph=true,pl=true; for(let j=k-K;j<=k+K;j++){ if(j===k) continue; if(j<k){ if(H[j]>=H[k]) ph=false; if(Lw[j]<=Lw[k]) pl=false; } else { if(H[j]>H[k]) ph=false; if(Lw[j]<Lw[k]) pl=false; } }
      if(ph){ lastH=H[k]; hiB=k; } if(pl){ lastL=Lw[k]; loB=k; } }
    if(p.confirmClose&&i===N-1) continue;   // the newest candle is still forming: wait for its close
    if(lastH!=null&&H[i]>lastH&&C[i]<lastH) D.ev.push({type:'bear',time:c[i].time,idx:i,price:C[i],level:lastH});
    if(lastL!=null&&Lw[i]<lastL&&C[i]>lastL) D.ev.push({type:'bull',time:c[i].time,idx:i,price:C[i],level:lastL}); }
  D.hi=lastH!=null?{v:lastH,b:hiB}:null; D.lo=lastL!=null?{v:lastL,b:loB}:null; D.ok=true; return D; }
let lsMem=null;
function lsGet(c,p){ const N=c.length, key=JSON.stringify([p.pivotLen,p.confirmClose])+'|'+N+'|'+(N?c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(lsMem&&lsMem.k===key) return lsMem.D;
  let D; try{ D=lsCompute(c,p); }catch(e){ console.error('lsp calc failed',e); D={N,ok:false,ev:[],hi:null,lo:null}; } lsMem={k:key,D}; return D; }
IND.lsp={label:'Liquidity Sweep Pro (PROTRADER9)',cat:'Trend',nm:p=>'Liquidity Sweep Pro '+(p&&p.pivotLen!=null?p.pivotLen:5),p:Object.assign({},LS_DEF),cols:['#f23645'],
  fields:[['pivotLen','num','Swing length',{min:1,max:50}],['showLevels','chk','Show liquidity levels'],['showSignals','chk','Show sweep signals'],['confirmClose','chk','Require candle close confirmation'],
    ['mkSize','sel','Signal size',{opts:['Small','Normal','Large']}],['cHigh','col','Swing high level'],['cLow','col','Swing low level'],['cBear','col','BEAR SWEEP signal'],['cBull','col','BULL SWEEP signal'],
    ['alBull','chk','Alert on BULL SWEEP'],['alBear','chk','Alert on BEAR SWEEP'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},LS_DEF,p), D=lsGet(c,q), mk=[], sz=LS_SZ[q.mkSize]||.8;
    if(q.showSignals&&D.ok) D.ev.forEach(e=>{ if(e.type==='bull') mk.push({time:e.time,position:'belowBar',color:q.cBull,shape:'arrowUp',text:'BULL SWEEP',size:sz,keep:true}); else mk.push({time:e.time,position:'aboveBar',color:q.cBear,shape:'arrowDown',text:'BEAR SWEEP',size:sz,keep:true}); });
    return {mk,boxes:[{type:'lspview',pts:[],o:q,D}],labels:[],events:D.ev}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='lspview') return _D.apply(this,arguments);
    const p=d.o, D=d.D; if(!p.showLevels||!D||!D.ok) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.lineWidth=1; cx.setLineDash([5,4]);
    const one=(lv,col)=>{ if(!lv) return; const y=Y(lv.v); if(y==null) return; let x0=X(lv.b); if(x0==null) x0=0; cx.strokeStyle=col; cx.beginPath(); cx.moveTo(Math.max(0,x0),y); cx.lineTo(W,y); cx.stroke(); };
    one(D.hi,p.cHigh); one(D.lo,p.cLow); cx.setLineDash([]); cx.restore(); }; }
// alerts: fire once, when the sweep candle has closed (the newest closed candle), while the app is open
function lsAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='lsp'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},LS_DEF,i.p); let quiet=q; if(i._lsK!==key){ i._lsK=key; i._lsLast={}; quiet=true; }
    const last=i._lsLast||(i._lsLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!(e.type==='bull'?P.alBull:P.alBear)) return;
      toast((e.type==='bull'?'Bullish':'Bearish')+' liquidity sweep \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 Close '+e.price,e.type==='bull'?'#2e7d32':'#c62828');
      if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _lsRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_lsRE.apply(this,arguments); try{ lsAlerts(q); }catch(e){ console.error('lsp alerts',e); } return rv; }; }
try{ DESC.lsp='Swing high / low liquidity levels with BULL / BEAR SWEEP signals when price wicks through and closes back'; }catch(e){}
}catch(err){ console.error('lsp indicator failed',err); window.__lspErr=err; }

// ---- [lsr] INDICATOR: Liquidity Sweep Reversal & Targets - port of the Pine v6 script "LSRT [PhenLabs]" by (c) PhenLabs (MPL 2.0) ----
// Swing highs / lows become liquidity pools (BSL above, SSL below). A candle that pokes through a pool and CLOSES back is a sweep. Seven filter profiles run
// side by side on the loaded candles; each sweep that passes the profile opens an Entry / Stop / TP1-TP3 plan. Auto-Optimize shows the profile with the best
// TP1+ win rate on this chart. Candles are treated as closed bars: the newest (still forming) candle is never used.
try{
const LR_PRESETS=['Auto-Optimize (Best Chart Win Rate)','Balanced (55% Absorb)','Conservative (65% Absorb)','Aggressive (45% Absorb)','Trend-Aligned (EMA 50 + 52% Absorb)','Volume Climax (62% Absorb + 1.25x Vol)','Wide-Stop Defense (60% Absorb + 1.6x SL)','Custom Threshold'];
const LR_TM=['R Ladder + Opposing Pool Magnet','Fixed R Ladder (1R / 2R / 3R)'];
const LR_DEF={pivotLen:10,maxPools:2,zoneAtr:0.35,preset:LR_PRESETS[0],customAbs:55,targetMode:LR_TM[0],slBuf:0.20,be:true,past:false,skipped:false,dash:true,dpos:'Top Right',dsize:'Small',theme:'Dark',cBull:'#00E6A8',cBear:'#FF3B69',alBuy:true,alSell:true,alTp:true,alSl:true,alSound:false};
const LR_CFG=[['Balanced (55% Absorb)',55,1.5,1.0,.35,false,0],['Conservative (65% Absorb)',65,1.25,1.15,.35,false,0],['Aggressive (45% Absorb)',45,2.0,.85,.30,false,0],['Trend-Aligned (EMA 50)',52,1.6,.9,.30,true,0],['Volume Climax (62% + RVOL)',62,1.4,.8,.28,false,1.25],['Wide-Stop Defense (1.6x SL)',60,1.5,1.6,.45,false,0],['Custom Threshold',55,1.6,1.0,.35,false,0]];
const lrClamp=(v,a,b)=>Math.min(Math.max(v,a),b), lrRnd1=v=>Math.round(v*10)/10;
const lrRgba=(c,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'')); if(!m) return c; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const lrFmt=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1000?v.toFixed(2):Math.abs(v)>=100?v.toFixed(2):v.toPrecision(5);
function lrEma(v,n){ const k=2/(n+1), o=new Array(v.length).fill(null); let p=null; for(let i=0;i<v.length;i++){ p=p==null?v[i]:k*v[i]+(1-k)*p; o[i]=p; } return o; }
function lrCompute(c,p){ const N=c.length, K=Math.max(3,Math.min(50,Math.round(+p.pivotLen)||10)), mt=1e-8, D={N,K,ok:false}; if(N<2*K+22) return D;
  const H=c.map(x=>x.high), Lw=c.map(x=>x.low), O=c.map(x=>x.open), C=c.map(x=>x.close), V=c.map(x=>+x.volume||0), T=c.map(x=>x.time);
  const atr=new Array(N).fill(null); { let s=0; for(let i=0;i<N;i++){ const tr=i?Math.max(H[i]-Lw[i],Math.abs(H[i]-C[i-1]),Math.abs(Lw[i]-C[i-1])):H[i]-Lw[i]; if(i<14){ s+=tr; if(i===13) atr[i]=s/14; } else atr[i]=(atr[i-1]*13+tr)/14; } }
  const safe=atr.map((a,i)=>a!=null?a:Math.max(H[i]-Lw[i],mt*10)), ema50=lrEma(C,50);
  const volSma=new Array(N).fill(null); for(let i=19;i<N;i++){ let s=0; for(let j=i-19;j<=i;j++) s+=V[j]; volSma[i]=s/20; }
  const rel=[],bullA=[],bearA=[],rawD=[],bullT=[],bearT=[],bullCrash=[],bearCrash=[]; let hasReal=false;
  for(let i=0;i<N;i++){ const span=Math.max(H[i]-Lw[i],mt), hr=V[i]>0&&volSma[i]!=null&&volSma[i]>0; if(i===N-1) hasReal=hr;
    const ra=hr?V[i]/volSma[i]:span/Math.max(safe[i],mt); rel.push(ra); const an=lrClamp(ra/2,0,1), bcs=lrClamp((C[i]-Lw[i])/span,0,1), scs=lrClamp((H[i]-C[i])/span,0,1);
    rawD.push(((2*bcs)-1)*lrClamp(ra,0.3,2.5)); bullA.push(lrRnd1(lrClamp((0.50*bcs+0.35*an+0.15*(C[i]>=O[i]?1:0.65))*100,0,100))); bearA.push(lrRnd1(lrClamp((0.50*scs+0.35*an+0.15*(C[i]<=O[i]?1:0.65))*100,0,100)));
    bullT.push(C[i]>=ema50[i]); bearT.push(C[i]<=ema50[i]); const mv=(C[i]-(i>=5?C[i-5]:C[i]))/Math.max(safe[i],mt); bearCrash.push(mv<-3.6&&C[i]<O[i]); bullCrash.push(mv>3.6&&C[i]>O[i]); }
  const dEma=lrEma(rawD,5), netD=dEma.map(v=>lrClamp(v*60,-100,100));
  const E=LR_CFG.map((q,id)=>({id,name:q[0],minAbs:id===6?+p.customAbs:q[1],maxSweep:q[2],slScale:q[3],minRisk:q[4],reqTrend:q[5],minRel:q[6],total:0,win:0,loss:0,tp1:0,tp2:0,tp3:0,net:0,lastDir:0,lastText:'NONE',active:null,plans:[],ev:[]}));
  const bsl=[],ssl=[];
  for(let t=0;t<N-1;t++){ const sa=safe[t], hi=H[t], lo=Lw[t], cl=C[t], tm=T[t];
    // A: manage every open plan
    for(const e of E){ const cp=e.active; if(!cp||cp.status!==0||t<=cp.entryBar) continue; const d=cp.dir, reach=x=>d===1?hi>=x:lo<=x, slHit=d===1?lo<=cp.activeSl:hi>=cp.activeSl;
      if(slHit){ if(cp.tp1Hit){ cp.beHit=true; cp.status=2; cp.endIdx=t; e.total++; e.win++; e.net+=cp.tp2Hit?(cp.tp1R+cp.tp2R)*0.5:cp.tp1R*0.5; }
        else { cp.slHit=true; cp.status=-1; cp.endIdx=t; e.total++; e.loss++; e.net-=1; e.ev.push({type:'sl',time:tm,idx:t,price:cp.activeSl}); } }
      else { if(!cp.tp1Hit&&reach(cp.tp1)){ cp.tp1Hit=true; e.tp1++; e.ev.push({type:'tp1',time:tm,idx:t,price:cp.tp1}); if(p.be) cp.activeSl=cp.entry; }
        if(!cp.tp2Hit&&reach(cp.tp2)){ cp.tp2Hit=true; e.tp2++; e.ev.push({type:'tp2',time:tm,idx:t,price:cp.tp2}); }
        if(!cp.tp3Hit&&reach(cp.tp3)){ cp.tp3Hit=true; e.tp3++; e.ev.push({type:'tp3',time:tm,idx:t,price:cp.tp3}); cp.status=1; cp.endIdx=t; e.total++; e.win++; e.net+=cp.tp3R; }
        else if(t-cp.entryBar>=60){ cp.status=cp.tp1Hit?2:3; cp.endIdx=t; e.total++; if(cp.tp1Hit){ e.win++; e.net+=cp.tp1R; } else { const x=(d===1?cl-cp.entry:cp.entry-cl)/Math.max(cp.risk,mt); if(x>=0) e.win++; else e.loss++; e.net+=x; } } } }
    // B: sweeps of armed pools
    let bullCand=false,sSsl=null,sSslOut=null,sSslPt=t,bDepth=0,bearCand=false,sBsl=null,sBslOut=null,sBslPt=t,sDepth=0;
    for(let i=ssl.length-1;i>=0;i--){ const q=ssl[i]; if(cl<q.outer||lo<q.level-2*sa) ssl.splice(i,1); else if(lo<q.level&&cl>=q.level){ bullCand=true; if(sSsl==null||q.level<sSsl){ sSsl=q.level; sSslOut=q.outer; sSslPt=q.pt; bDepth=(q.level-lo)/Math.max(sa,mt); } ssl.splice(i,1); } }
    for(let i=bsl.length-1;i>=0;i--){ const q=bsl[i]; if(cl>q.outer||hi>q.level+2*sa) bsl.splice(i,1); else if(hi>q.level&&cl<=q.level){ bearCand=true; if(sBsl==null||q.level>sBsl){ sBsl=q.level; sBslOut=q.outer; sBslPt=q.pt; sDepth=(hi-q.level)/Math.max(sa,mt); } bsl.splice(i,1); } }
    if(bullCand&&bearCand){ bullCand=false; bearCand=false; }
    // C: register newly confirmed swing pools
    const k=t-K; if(k>=K){ let ph=true,pl=true; for(let j=k-K;j<=k+K;j++){ if(j===k) continue; if(j<k){ if(H[j]>=H[k]) ph=false; if(Lw[j]<=Lw[k]) pl=false; } else { if(H[j]>H[k]) ph=false; if(Lw[j]<Lw[k]) pl=false; } }
      const zt=sa*p.zoneAtr;
      if(ph){ const oH=H[k]+zt*0.65, iH=H[k]-zt*0.35; let ok=true; for(let j=0;j<K;j++) if(C[t-j]>oH) ok=false; if(ok){ bsl.push({level:H[k],outer:oH,inner:iH,pt:k,def:bearA[k]}); while(bsl.length>8) bsl.shift(); } }
      if(pl){ const oL=Lw[k]-zt*0.65, iL=Lw[k]+zt*0.35; let ok=true; for(let j=0;j<K;j++) if(C[t-j]<oL) ok=false; if(ok){ ssl.push({level:Lw[k],outer:oL,inner:iL,pt:k,def:bullA[k]}); while(ssl.length>8) ssl.shift(); } } }
    // D: judge the sweep in every profile
    if(bullCand||bearCand) for(const e of E){ let take=0;
      if(bullCand){ if(bDepth<=e.maxSweep&&bullA[t]>=e.minAbs&&!bearCrash[t]&&(!e.reqTrend||bullT[t])&&rel[t]>=e.minRel){ take=1; e.lastDir=1; e.lastText='BUY (SSL \u00b7 '+Math.round(bullA[t])+'%)'; e.ev.push({type:'buy',time:tm,idx:t,price:cl}); }
        else { e.lastText='SKIP (SSL \u00b7 '+Math.round(bullA[t])+'%)'; e.ev.push({type:'skip',dir:1,time:tm,idx:t}); } }
      if(bearCand){ if(sDepth<=e.maxSweep&&bearA[t]>=e.minAbs&&!bullCrash[t]&&(!e.reqTrend||bearT[t])&&rel[t]>=e.minRel){ take=-1; e.lastDir=-1; e.lastText='SELL (BSL \u00b7 '+Math.round(bearA[t])+'%)'; e.ev.push({type:'sell',time:tm,idx:t,price:cl}); }
        else { e.lastText='SKIP (BSL \u00b7 '+Math.round(bearA[t])+'%)'; e.ev.push({type:'skip',dir:-1,time:tm,idx:t}); } }
      if(!take) continue;
      const pv=e.active; if(pv&&pv.status===0){ pv.status=pv.tp1Hit?2:3; pv.endIdx=t; e.total++; if(pv.tp1Hit){ e.win++; e.net+=pv.tp1R; } else { const x=(pv.dir===1?cl-pv.entry:pv.entry-cl)/Math.max(pv.risk,mt); if(x>=0) e.win++; else e.loss++; e.net+=x; } }
      const sd=take, ent=cl, eff=p.slBuf*e.slScale;
      const rawSl=sd===1?Math.min(lo,sSslOut==null?lo:sSslOut)-eff*sa:Math.max(hi,sBslOut==null?hi:sBslOut)+eff*sa;
      const risk=lrClamp(Math.abs(ent-rawSl),sa*e.minRisk,sa*3), sl=ent-sd*risk; let tp3=ent+3*sd*risk, tp3R=3, mag=false;
      if(p.targetMode===LR_TM[0]){ let best=null;
        if(sd===1&&bsl.length){ bsl.forEach(o=>{ const dR=(o.level-ent)/risk; if(dR>=2.2&&dR<=4.5&&(best==null||o.level<best)) best=o.level; }); if(best!=null){ tp3=best; tp3R=lrRnd1((best-ent)/risk); mag=true; } }
        else if(sd===-1&&ssl.length){ ssl.forEach(o=>{ const dR=(ent-o.level)/risk; if(dR>=2.2&&dR<=4.5&&(best==null||o.level>best)) best=o.level; }); if(best!=null){ tp3=best; tp3R=lrRnd1((ent-best)/risk); mag=true; } } }
      const swL=Math.max(t>=12?t-12:t,sd===1?sSslPt:sBslPt), pl={dir:sd,entryBar:t,entry:ent,initSl:sl,activeSl:sl,risk,tp1:ent+sd*risk,tp2:ent+2*sd*risk,tp3,tp1R:1,tp2R:2,tp3R,mag,absorb:sd===1?bullA[t]:bearA[t],tp1Hit:false,tp2Hit:false,tp3Hit:false,slHit:false,beHit:false,status:0,endIdx:-1,
        swLeft:swL,swTop:sd===1?sSsl:Math.max(hi,sBslOut==null?hi:sBslOut),swBot:sd===1?Math.min(lo,sSslOut==null?lo:sSslOut):sBsl,signalY:sd===1?lo-sa*0.15:hi+sa*0.15};
      e.plans.push(pl); while(e.plans.length>8) e.plans.shift(); e.active=pl; } }
  // pick the profile to show
  const wr=e=>e.total?e.win/e.total*100:0; let sel=0, pi=LR_PRESETS.indexOf(p.preset);
  if(pi<=0){ let bw=-1,bn=-1e9,bid=0;
    for(let i=0;i<=5;i++){ const e=E[i]; if(e.total>=3){ const w=wr(e); if(w>bw||(w===bw&&e.net>bn)){ bw=w; bn=e.net; bid=i; } } }
    for(let i=0;i<=2;i++){ const e=E[i]; if(e.total>0){ const w=wr(e); if(w>bw||(w===bw&&e.net>bn)){ bw=w; bn=e.net; bid=i; } } }
    if(bw<0) for(let i=0;i<=5;i++){ const e=E[i]; if(e.total>0){ const w=wr(e); if(w>bw||(w===bw&&e.net>bn)){ bw=w; bn=e.net; bid=i; } } }
    sel=bid; } else sel=pi-1;
  const lc=C[N-1], near=(arr,n)=>arr.slice().sort((a,b)=>Math.abs(a.level-lc)-Math.abs(b.level-lc)).slice(0,n);
  D.E=E; D.sel=sel; D.auto=pi<=0; D.showBsl=near(bsl,p.maxPools); D.showSsl=near(ssl,p.maxPools); D.close=lc; D.atr=safe[N-1]; D.delta=netD[N-1]; D.hasReal=hasReal;
  D.events=E[sel].ev.filter(x=>x.type!=='skip'); D.ok=true; return D; }
let lrMem=null;
function lrGet(c,p){ const N=c.length, key=JSON.stringify(p)+'|'+N+'|'+(N?c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(lrMem&&lrMem.k===key) return lrMem.D;
  let D; try{ D=lrCompute(c,p); }catch(e){ console.error('lsr calc failed',e); D={N,ok:false}; } lrMem={k:key,D}; return D; }
IND.lsr={label:'Liquidity Sweep Reversal & Targets [PhenLabs]',cat:'Trend',nm:()=>'LSRT [PhenLabs]',p:Object.assign({},LR_DEF),cols:['#00E6A8'],
  fields:[['pivotLen','num','Swing liquidity lookback',{min:3,max:50}],['maxPools','num','Active pools shown per side',{min:1,max:5}],['zoneAtr','num','Defense zone thickness (ATR)',{min:0.1,max:1.2,step:0.05}],
    ['preset','sel','Absorption filter mode',{opts:LR_PRESETS}],['customAbs','num','Custom min absorption (%)',{min:25,max:90,step:5}],['targetMode','sel','Target projection mode',{opts:LR_TM}],['slBuf','num','Stop loss buffer beyond wick (ATR)',{min:0.05,max:1,step:0.05}],
    ['be','chk','Move stop to breakeven after TP1'],['past','chk','Keep historical trade plans (last 5)'],['skipped','chk','Show filtered (SKIP) sweeps'],['dash','chk','Show summary dashboard'],['dpos','sel','Dashboard position',{opts:['Top Right','Top Left','Bottom Right','Bottom Left']}],
    ['dsize','sel','Table size',{opts:['Tiny','Small','Normal','Large']}],['theme','sel','Theme',{opts:['Dark','Light']}],['cBull','col','Bullish reversal & reward'],['cBear','col','Bearish reversal & risk'],
    ['alBuy','chk','Alert on BUY'],['alSell','chk','Alert on SELL'],['alTp','chk','Alert on TP1 / TP2 / TP3'],['alSl','chk','Alert on Stop Loss'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},LR_DEF,p), D=lrGet(c,q); return {mk:[],boxes:[{type:'lsrview',pts:[],o:q,D}],labels:[],events:D.ok?D.events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='lsrview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, n0=candles.length; if(!D||!D.ok||n0<5) return; const dark=p.theme!=='Light', bull=p.cBull, bear=p.cBear, E=D.E[D.sel];
    const fg=dark?'#e6e8ee':'#131722', muted=dark?'rgba(230,232,238,.55)':'rgba(19,23,34,.55)', pill=dark?'rgba(14,17,26,.88)':'rgba(255,255,255,.92)';
    cx.save(); cx.beginPath(); cx.rect(0,0,Wd(),Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    function Wd(){ return W; }
    const xe=X(n0-1), xp=X(n0-2), bw=(xe!=null&&xp!=null)?Math.max(1,xe-xp):6, xr=(xe==null?W*0.8:xe)+bw*6, xa=i=>{ const v=X(i); return v==null?0:v; };
    const ln=(x1,x2,y,col,dash,w)=>{ cx.strokeStyle=col; cx.lineWidth=w||1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y); cx.lineTo(x2,y); cx.stroke(); cx.setLineDash([]); };
    const tag=(txt,x,y,bg,fg2,bold)=>{ cx.font=(bold?'bold ':'')+'9px system-ui'; const w=cx.measureText(txt).width+8, xx=Math.min(x,W-w-2); cx.fillStyle=bg; cx.fillRect(xx,y-7,w,14); cx.fillStyle=fg2; cx.textAlign='left'; cx.fillText(txt,xx+4,y); };
    // defense pools
    D.showBsl.forEach(q=>{ const y0=Y(q.outer), y1=Y(q.inner), yl=Y(q.level); if(y0==null||y1==null||yl==null) return; const x0=xa(q.pt);
      cx.fillStyle=lrRgba(bear,0.12); cx.fillRect(x0,Math.min(y0,y1),xr-x0,Math.max(1,Math.abs(y1-y0))); cx.strokeStyle=lrRgba(bear,0.45); cx.lineWidth=1; cx.strokeRect(x0,Math.min(y0,y1),xr-x0,Math.max(1,Math.abs(y1-y0)));
      ln(x0,xr,yl,lrRgba(bear,0.75),[5,4]); tag('BSL \u00b7 '+lrFmt(q.level)+' \u00b7 Seller Def '+Math.round(q.def)+'%',xr,yl,lrRgba(bear,0.3),fg); });
    D.showSsl.forEach(q=>{ const y0=Y(q.outer), y1=Y(q.inner), yl=Y(q.level); if(y0==null||y1==null||yl==null) return; const x0=xa(q.pt);
      cx.fillStyle=lrRgba(bull,0.12); cx.fillRect(x0,Math.min(y0,y1),xr-x0,Math.max(1,Math.abs(y1-y0))); cx.strokeStyle=lrRgba(bull,0.45); cx.lineWidth=1; cx.strokeRect(x0,Math.min(y0,y1),xr-x0,Math.max(1,Math.abs(y1-y0)));
      ln(x0,xr,yl,lrRgba(bull,0.75),[5,4]); tag('SSL \u00b7 '+lrFmt(q.level)+' \u00b7 Buyer Def '+Math.round(q.def)+'%',xr,yl,lrRgba(bull,0.3),fg); });
    // swept zones and signal badges (last 8 setups of the shown profile)
    E.plans.forEach(pl=>{ const col=pl.dir===1?bull:bear, x0=xa(pl.swLeft), x1=xa(pl.entryBar), yt=Y(pl.swTop), yb=Y(pl.swBot); if(yt!=null&&yb!=null&&x1>x0){ cx.fillStyle=lrRgba(col,0.18); cx.fillRect(x0,Math.min(yt,yb),x1-x0,Math.max(1,Math.abs(yb-yt))); cx.strokeStyle=lrRgba(col,0.8); cx.lineWidth=1; cx.setLineDash([4,3]); cx.strokeRect(x0,Math.min(yt,yb),x1-x0,Math.max(1,Math.abs(yb-yt))); cx.setLineDash([]); }
      const sx=X(pl.entryBar), sy=Y(pl.signalY); if(sx==null||sy==null) return; const txt=(pl.dir===1?'BUY \u00b7 ':'SELL \u00b7 ')+Math.round(pl.absorb)+'%'; cx.font='bold 10px system-ui'; const w=cx.measureText(txt).width+10, up=pl.dir===1, by=up?sy+4:sy-4-16;
      cx.fillStyle=col; cx.beginPath(); cx.moveTo(sx,sy); cx.lineTo(sx-4,up?sy+4:sy-4); cx.lineTo(sx+4,up?sy+4:sy-4); cx.closePath(); cx.fill(); cx.fillRect(sx-w/2,by,w,16); cx.fillStyle='#0B0E14'; cx.textAlign='center'; cx.fillText(txt,sx,by+8); });
    // trade plans: the latest one, or the last 5
    const pls=E.plans.slice(p.past?-5:-1);
    pls.forEach(pl=>{ const x1=xa(pl.entryBar), x2=pl.status===0?xr:Math.max(x1+1,xa(pl.endIdx)), yE=Y(pl.entry), yS=Y(pl.initSl), y1=Y(pl.tp1), y2=Y(pl.tp2), y3=Y(pl.tp3); if(yE==null||yS==null||y3==null) return;
      cx.fillStyle=lrRgba(bear,0.12); cx.fillRect(x1,Math.min(yE,yS),x2-x1,Math.max(1,Math.abs(yS-yE))); cx.strokeStyle=lrRgba(bear,0.4); cx.lineWidth=1; cx.strokeRect(x1,Math.min(yE,yS),x2-x1,Math.max(1,Math.abs(yS-yE)));
      cx.fillStyle=lrRgba(bull,0.10); cx.fillRect(x1,Math.min(yE,y3),x2-x1,Math.max(1,Math.abs(y3-yE))); cx.strokeStyle=lrRgba(bull,0.4); cx.strokeRect(x1,Math.min(yE,y3),x2-x1,Math.max(1,Math.abs(y3-yE)));
      ln(x1,x2,yE,fg,[],2); ln(x1,x2,yS,bear,[],2); if(y1!=null) ln(x1,x2,y1,lrRgba(bull,0.85),[1.5,3],1); if(y2!=null) ln(x1,x2,y2,lrRgba(bull,0.9),[5,4],1); ln(x1,x2,y3,bull,[],2);
      const slS=pl.slHit?' \u2717':pl.beHit?' (BE \u2713)':(pl.tp1Hit&&pl.activeSl===pl.entry)?' (BE ARMED)':' (-1.0R)';
      tag('ENTRY \u00b7 '+lrFmt(pl.entry),x2,yE,pill,fg,true); tag('SL \u00b7 '+lrFmt(pl.initSl)+slS,x2,yS,lrRgba(bear,pl.slHit?0.85:0.3),fg,true);
      if(y1!=null) tag('TP1 \u00b7 '+lrFmt(pl.tp1)+' (1R)'+(pl.tp1Hit?' \u2713':''),x2,y1,lrRgba(bull,pl.tp1Hit?0.85:0.25),fg,true); if(y2!=null) tag('TP2 \u00b7 '+lrFmt(pl.tp2)+' (2R)'+(pl.tp2Hit?' \u2713':''),x2,y2,lrRgba(bull,pl.tp2Hit?0.85:0.25),fg,true);
      tag('TP3 \u00b7 '+lrFmt(pl.tp3)+' ('+pl.tp3R+'R'+(pl.mag?' \u00b7 MAG':'')+')'+(pl.tp3Hit?' \u2713':''),x2,y3,lrRgba(bull,pl.tp3Hit?0.9:0.3),fg,true); });
    // filtered sweeps
    if(p.skipped) E.ev.forEach(e=>{ if(e.type!=='skip') return; const x=X(e.idx), cd=candles[e.idx]; if(x==null||!cd) return; const up=e.dir===1, y=Y(up?cd.low:cd.high); if(y==null) return; const yy=y+(up?9:-9), col=up?bull:bear;
      cx.fillStyle=lrRgba(col,0.45); cx.beginPath(); cx.arc(x,yy,3,0,6.2832); cx.fill(); cx.font='8px system-ui'; cx.fillStyle=muted; cx.textAlign='center'; cx.fillText('SKIP',x,yy+(up?10:-10)); });
    // dashboard
    if(p.dash){ const eng=E, wrate=eng.total?eng.win/eng.total*100:0, dC=D.delta>=0?bull:bear, nb=D.showBsl[0], ns=D.showSsl[0], sigC=eng.lastDir===1?bull:eng.lastDir===-1?bear:muted;
      const ap=eng.active; let pS='No Active Plan', pL='\u2014', pP='\u2014', pC=muted; if(ap){ pC=ap.dir===1?bull:bear; pS=(ap.dir===1?'LONG @ ':'SHORT @ ')+lrFmt(ap.entry); pL='SL '+lrFmt(ap.activeSl)+' | TP1 '+lrFmt(ap.tp1); pP=(ap.tp1Hit?'TP1\u2713 ':'TP1\u00b7 ')+(ap.tp2Hit?'TP2\u2713 ':'TP2\u00b7 ')+(ap.tp3Hit?'TP3\u2713':ap.slHit?'SL\u2717':ap.beHit?'BE\u2713':'OPEN'); }
      const rows=[['Liquidity Sweep & Targets',D.hasReal?'LIVE VOL':'PRICE-PROXY','[PhenLabs]',fg,bull,muted,true],
        ['Nearest BSL Pool',nb?lrFmt(nb.level)+' ('+lrRnd1((nb.level-D.close)/D.atr)+' ATR)':'Scanning...',nb?'Seller '+Math.round(nb.def)+'%':'\u2014',muted,bear,bear],
        ['Nearest SSL Pool',ns?lrFmt(ns.level)+' ('+lrRnd1((D.close-ns.level)/D.atr)+' ATR)':'Scanning...',ns?'Buyer '+Math.round(ns.def)+'%':'\u2014',muted,bull,bull],
        ['Active Profile',(D.auto?'Auto Best: ':'Mode: ')+eng.name,(D.delta>=0?'Buyer +':'Seller ')+Math.round(D.delta)+'%',muted,D.auto?bull:fg,dC],
        ['Last Sweep Signal',eng.lastText,eng.lastDir!==0?'TAKE':'WAIT',muted,sigC,sigC],
        ['Active Trade Plan',pS,pP,muted,pC,pC],['Plan SL / TP1',pL,p.be?'BE @ TP1: ON':'BE @ TP1: OFF',muted,fg,muted],
        ['Win Rate (TP1+)',eng.total?lrRnd1(wrate)+'% ('+eng.win+'W / '+eng.loss+'L)':'Calibrating (0 Trades)',(eng.net>=0?'+':'')+lrRnd1(eng.net)+'R',muted,wrate>=55?bull:eng.total?fg:muted,eng.net>=0?bull:bear],
        ['Target Hits','TP1: '+eng.tp1+' | TP2: '+eng.tp2+' | TP3: '+eng.tp3,'Closed-Bar',muted,fg,muted]];
      let fs=({Tiny:9,Small:10,Normal:12,Large:14})[p.dsize]||10, cw=[0,0,0], pw, rh, m=6;
      for(;;){ cw=[0,0,0]; rh=fs+8; rows.forEach(r=>{ cx.font=(r[6]?'bold ':'')+fs+'px system-ui'; for(let j=0;j<3;j++) cw[j]=Math.max(cw[j],cx.measureText(r[j]).width); }); pw=cw[0]+cw[1]+cw[2]+48; if(pw<=W-2*m||fs<=6) break; fs--; }
      const ph=rows.length*rh, x0=/Left/.test(p.dpos)?m:W-pw-m, y0=/Top/.test(p.dpos)?m+34:Hh-ph-m-24;
      cx.fillStyle=pill; cx.fillRect(x0,y0,pw,ph); rows.forEach((r,k)=>{ const y=y0+k*rh; if(k) { cx.strokeStyle='rgba(128,128,128,.25)'; cx.lineWidth=1; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x0+pw,y); cx.stroke(); }
        const bo=r[6]?'bold ':''; cx.textAlign='left'; cx.font=(r[6]||k===0?'bold ':'')+fs+'px system-ui'; cx.fillStyle=r[3]; cx.fillText(r[0],x0+8,y+rh/2); cx.font=(k===0||k>=1?'bold ':'')+fs+'px system-ui'; cx.fillStyle=r[4]; cx.fillText(r[1],x0+16+cw[0],y+rh/2); cx.font=(k===0||k>=1?'bold ':'')+fs+'px system-ui'; cx.fillStyle=r[5]; cx.fillText(r[2],x0+24+cw[0]+cw[1],y+rh/2); });
      cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph); }
    cx.restore(); }; }
// alerts: fire once, when the candle that carried the event has closed (the newest closed candle), while the app is open
function lrAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='lsr'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},LR_DEF,i.p); let quiet=q; if(i._lrK!==key){ i._lrK=key; i._lrLast={}; quiet=true; }
    const last=i._lrLast||(i._lrLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      const on=e.type==='buy'?P.alBuy:e.type==='sell'?P.alSell:e.type==='sl'?P.alSl:P.alTp; if(quiet||e.time!==cc||!on) return;
      const nm={buy:'BUY \u00b7 bullish SSL sweep reversal',sell:'SELL \u00b7 bearish BSL sweep reversal',tp1:'TP1 reached',tp2:'TP2 reached',tp3:'TP3 reached',sl:'Stop loss hit'}[e.type];
      toast('LSRT \u00b7 '+nm+' \u00b7 '+sym[0]+' '+tf[0],(e.type==='buy'||e.type.indexOf('tp')===0)?'#2e7d32':'#c62828'); if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _lrRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_lrRE.apply(this,arguments); try{ lrAlerts(q); }catch(e){ console.error('lsr alerts',e); } return rv; }; }
try{ DESC.lsr='Swing liquidity pools, sweep reversal signals with Entry, Stop Loss and TP1-TP3 plans, seven filter profiles and a win-rate dashboard'; }catch(e){}
}catch(err){ console.error('lsr indicator failed',err); window.__lsrErr=err; }

// ---- [hvf] INDICATOR: HTF Volume Footprint - port of the Pine v6 script by (c) CandelaCharts (MPL 2.0) ----
// Builds a Bid x Ask volume footprint for higher time frame candles (for example the daily candle) from lower time frame candles (for example 1m).
// The lower time frame candles are loaded from Binance for the current symbol. The candle and its footprint are drawn to the right of the last bar (scroll the chart
// to the right to see them), and can also be mapped onto the chart. Each LTF candle is split over the price rows by overlap: a green candle counts as ask (buy)
// volume, a red candle as bid (sell) volume, a doji half and half. POC = busiest row. Value area = 70% of the volume around the POC.
try{
const HF_TFS=['15m','30m','1h','2h','4h','6h','12h','1d','1w','1M'], HF_LTFS=['1m','3m','5m','15m','30m','1h'];
const HF_THEMES={'Teal - Navy':['#089981','#0C3299'],'Teal - Orange':['#089981','#FF9800'],'Teal - Red':['#089981','#F23645'],'Blue - Orange':['#2962FF','#FF9800'],'Green - Red':['#4CAF50','#F23645'],'Brown - Black':['#C69C6D','#000000'],'Aqua - Black':['#00BCD4','#000000'],'Blue - Pink':['#2962FF','#FF69B4'],'Cyan - Purple':['#00BCD4','#9C27B0'],'Green - Navy':['#4CAF50','#0C3299']};
const HF_DEF={font:'Monospace',tsize:'Tiny',hideBrand:false,scale:'Linear',numMode:'All Rows',showNums:true,compact:true,pocHl:true,grad:true,ny:false,offset:15,space:8,fpGap:1,margin:16,candleW:4,fpW:18,
  g1on:true,g1tf:'1d',g1ltf:'1m',g1n:1,g1rows:40,g1map:false,g2on:false,g2tf:'1w',g2ltf:'1m',g2n:1,g2rows:40,g2map:false,
  theme:'Teal - Red',cBull:'#089981',cBear:'#F23645',cPoc:'#FFEB3B',cVa:'#787B86',cWick:'#787B86',cNum:'#000000',labels:true,mapSep:true,mapTrend:false,vaLbl:true,vaPrice:false};
const hfSec=iv=>{ const m=/^(\d+)([mhdwM])$/.exec(iv||''); return m?(+m[1])*({m:60,h:3600,d:86400,w:604800,M:2592000}[m[2]]):0; };
const hfTfName=iv=>{ const m=/^(\d+)([mhdwM])$/.exec(iv||''); return m?m[1]+(m[2]==='m'?'m':m[2].toUpperCase()):String(iv); };
const hfA=(c,tr)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'')); if(!m) return c; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+((100-tr)/100)+')'; };
const hfLerp=(c,trLo,trHi,r)=>hfA(c,trLo+(trHi-trLo)*r);
const hfFmtP=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=100?v.toFixed(2):v.toPrecision(5);
let hfFmtr=null;
function hfNyOff(t){ try{ if(!hfFmtr) hfFmtr=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
    const q={}; hfFmtr.formatToParts(new Date(t*1000)).forEach(x=>{ q[x.type]=+x.value; }); return Math.round(Date.UTC(q.year,q.month-1,q.day,q.hour%24,q.minute,q.second)/1000-t); }catch(e){ return -18000; } }
function hfBucket(t,tf,ny){ const off=(ny&&hfSec(tf)>=86400)?hfNyOff(t):0, l=t+off, u=tf.slice(-1); let s,e;
  if(u==='M'){ const d=new Date(l*1000); s=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)/1000; e=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1)/1000; }
  else if(u==='w'){ const wk=Math.floor((Math.floor(l/86400)+3)/7); s=(wk*7-3)*86400; e=s+604800; }
  else { const sec=hfSec(tf); s=Math.floor(l/sec)*sec; e=s+sec; }
  return [s-off,e-off]; }
function hfPeriods(tf,n,ny,lastT){ let b=hfBucket(lastT,tf,ny); const out=[{s:b[0],e:b[1]}]; for(let i=1;i<n;i++){ b=hfBucket(out[0].s-1,tf,ny); out.unshift({s:b[0],e:b[1]}); } return out; }
// LTF candles from Binance, cached per symbol / interval / period. Finished periods load once, the running period refreshes every 30 s.
const hfD={};
function hfFetch(sy,ltf,per,now){ const key=sy+'|'+ltf+'|'+per.s; let d=hfD[key]; if(!d) d=hfD[key]={rows:[],busy:false,ts:0,err:false,done:false}; const ls=hfSec(ltf), closed=per.e<=now-ls*2;
  if(d.busy||d.done) return d; if(!closed&&Date.now()-d.ts<30000) return d; if(d.err&&Date.now()-d.ts<15000) return d;
  d.busy=true; let from=d.rows.length?d.rows[d.rows.length-1].t:per.s; const rows=d.rows.slice(); if(rows.length) rows.pop(); let pages=0; const to=Math.min(per.e,now+ls)*1000-1;
  const step=()=>fetch(`${RB(sy)}/klines?symbol=${sy}&interval=${ltf}&startTime=${from*1000}&endTime=${to}&limit=1000`).then(r=>r.json()).then(a=>{ if(!Array.isArray(a)) throw new Error('bad'); a.forEach(x=>rows.push({t:x[0]/1000,o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]})); pages++; if(a.length>=1000&&pages<30){ from=a[a.length-1][0]/1000+ls; return step(); } });
  step().then(()=>{ d.rows=rows; d.err=false; d.done=closed; }).catch(()=>{ d.err=true; }).then(()=>{ d.busy=false; d.ts=Date.now(); try{ render(); }catch(e){} });
  return d; }
const hfPM={};
function hfProfile(key,rows,R){ const L=rows[rows.length-1], ck=R+'|'+rows.length+'|'+L.c+'|'+L.v, hit=hfPM[key]; if(hit&&hit.k===ck) return hit.P;
  let h=-1e30,l=1e30; rows.forEach(x=>{ if(x.h>h) h=x.h; if(x.l<l) l=x.l; }); const P={o:rows[0].o,c:L.c,h,l,bull:L.c>=rows[0].o,R,ok:false};
  const step=(h-l)/Math.max(1,R); if(step>0){ const bid=new Array(R).fill(0), ask=new Array(R).fill(0);
    rows.forEach(x=>{ const buy=x.c>x.o?x.v:x.c<x.o?0:x.v*0.5, sell=x.c<x.o?x.v:x.c>x.o?0:x.v*0.5, rg=x.h-x.l;
      if(rg<=0){ const i=Math.max(0,Math.min(R-1,Math.floor((x.c-l)/step))); ask[i]+=buy; bid[i]+=sell; }
      else { const r0=Math.max(0,Math.floor((x.l-l)/step)), r1=Math.min(R-1,Math.floor((x.h-l)/step)); for(let r=r0;r<=r1;r++){ const lo=l+r*step, ov=Math.min(x.h,lo+step)-Math.max(x.l,lo); if(ov>0){ const f=ov/rg; ask[r]+=buy*f; bid[r]+=sell*f; } } } });
    const tot=bid.map((b,i)=>b+ask[i]); let mx=0,ms=0,sum=0,poc=0; for(let r=0;r<R;r++){ sum+=tot[r]; if(tot[r]>mx){ mx=tot[r]; poc=r; } ms=Math.max(ms,bid[r],ask[r]); }
    let hi=poc,lo=poc,acc=tot[poc]; const tg=sum*0.7; if(sum>0) while(acc<tg&&(hi<R-1||lo>0)){ const up=hi<R-1?tot[hi+1]:0, dn=lo>0?tot[lo-1]:0; if(hi<R-1&&(lo===0||up>=dn)){ hi++; acc+=up; } else if(lo>0){ lo--; acc+=dn; } else break; }
    Object.assign(P,{ok:true,step,bid,ask,tot,poc,pocP:l+poc*step+step*0.5,maxSide:ms>0?ms:mx,avg:sum/R,vah:l+(hi+1)*step,val:l+lo*step}); }
  hfPM[key]={k:ck,P}; return P; }
function hfGroup(p,gi,lastT){ const on=p['g'+gi+'on'], tf=p['g'+gi+'tf'], ltf=p['g'+gi+'ltf'], n=Math.max(1,Math.min(10,Math.round(+p['g'+gi+'n'])||1)), R=Math.max(10,Math.min(60,Math.round(+p['g'+gi+'rows'])||40));
  const g={on,tf,ltf,n,R,map:p['g'+gi+'map'],cands:[],msg:''}; if(!on) return g;
  if(!(hfSec(ltf)>0)||hfSec(ltf)>=hfSec(tf)){ g.msg='Group '+gi+': LTF source ('+hfTfName(ltf)+') must be lower than the HTF ('+hfTfName(tf)+')'; g.on=false; return g; }
  if(n*hfSec(tf)/hfSec(ltf)>30000){ g.msg='Group '+gi+': too many '+hfTfName(ltf)+' candles needed, raise the LTF source or lower the candle count'; g.on=false; return g; }
  const now=Date.now()/1000; let busy=0, err=0;
  hfPeriods(tf,n,p.ny,lastT).forEach(per=>{ const d=hfFetch(sym[0],ltf,per,now), rows=d.rows.filter(x=>x.t>=per.s&&x.t<per.e); if(d.busy) busy++; if(d.err&&!rows.length) err++;
    g.cands.push({per,P:rows.length?hfProfile(sym[0]+'|'+ltf+'|'+per.s,rows,R):null}); });
  if(!g.cands.some(c=>c.P)) g.msg=err?'Group '+gi+': could not load '+hfTfName(ltf)+' candles for '+sym[0]:'Group '+gi+': loading '+hfTfName(ltf)+' candles\u2026'; else if(busy) g.msg='';
  return g; }
IND.hvf={label:'HTF Volume Footprint (CandelaCharts)',cat:'Volume',nm:()=>'HTF Volume Footprint',p:Object.assign({},HF_DEF),cols:['#089981'],
  fields:[['g1on','chk','Group I: enable'],['g1tf','sel','Group I: HTF',{opts:HF_TFS}],['g1ltf','sel','Group I: LTF source',{opts:HF_LTFS}],['g1n','num','Group I: candle count',{min:1,max:10}],['g1rows','num','Group I: row resolution',{min:10,max:60}],['g1map','chk','Group I: map to chart'],
    ['g2on','chk','Group II: enable'],['g2tf','sel','Group II: HTF',{opts:HF_TFS}],['g2ltf','sel','Group II: LTF source',{opts:HF_LTFS}],['g2n','num','Group II: candle count',{min:1,max:10}],['g2rows','num','Group II: row resolution',{min:10,max:60}],['g2map','chk','Group II: map to chart'],
    ['scale','sel','Volume scaling',{opts:['Square Root','Logarithmic','Linear']}],['numMode','sel','Number display',{opts:['All Rows','Significant Only (> Avg)','POC Only']}],['showNums','chk','Show volume numbers'],['compact','chk','Abbreviate large (K/M)'],['pocHl','chk','Highlight high volume node (POC)'],['grad','chk','Volume gradient'],['ny','chk','Anchor to NY midnight (1d and higher)'],
    ['offset','num','Projected offset (bars)',{min:1,max:200}],['space','num','Candle space',{min:1,max:30}],['fpGap','num','Footprint gap',{min:0,max:20}],['margin','num','Group margin',{min:1,max:50}],['candleW','num','Candle width',{min:2,max:12}],['fpW','num','Footprint width',{min:6,max:50,step:2}],
    ['theme','sel','Theme',{opts:['Custom'].concat(Object.keys(HF_THEMES))}],['cBull','col','Bull (Custom theme)'],['cBear','col','Bear (Custom theme)'],['cPoc','col','POC'],['cVa','col','Value area'],['cWick','col','Wick / separators'],['cNum','col','Numbers'],
    ['labels','chk','Show HTF header labels'],['mapSep','chk','Show mapped separator'],['mapTrend','chk','Show mapped trend line'],['vaLbl','chk','POC / VAH / VAL labels'],['vaPrice','chk','Include price in labels'],
    ['font','sel','Text font',{opts:['Default','Monospace']}],['tsize','sel','Text size',{opts:['Tiny','Small','Normal','Large','Huge','Auto']}],['hideBrand','chk','Hide brand']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},HF_DEF,p), lastT=c.length?c[c.length-1].time:0, G=lastT?[hfGroup(q,1,lastT),hfGroup(q,2,lastT)]:[]; return {mk:[],boxes:[{type:'hvfview',pts:[],o:q,G}],labels:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='hvfview') return _D.apply(this,arguments);
    const p=d.o, G=d.G, n0=candles.length; if(n0<5||!G||!G.length) return; const xe=X(n0-1), xp=X(n0-2); if(xe==null) return; const bw=xp!=null?Math.max(1,xe-xp):6, xk=k=>xe+bw*k;
    const th=HF_THEMES[p.theme]||[p.cBull,p.cBear], bull=th[0], bear=th[1], fam=p.font==='Monospace'?'ui-monospace,Menlo,Consolas,monospace':'system-ui,sans-serif';
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    const cw=p.candleW%2===0?p.candleW:p.candleW+1, half=Math.max(1,Math.floor(cw/2)), halfFp=Math.max(4,Math.floor(p.fpW/2)), unit=cw+p.fpGap+halfFp*2+p.space;
    const ratio=(v,mx)=>{ if(!(v>0&&mx>0)) return 0; const r=Math.min(1,v/mx); return p.scale==='Square Root'?Math.sqrt(r):p.scale==='Logarithmic'?Math.log(1+9*r)/Math.log(10):r; };
    const fvol=v=>{ if(!p.compact) return String(Math.round(v)); if(v>=1e6) return (+(v/1e6).toFixed(1))+'M'; if(v>=1e3) return (+(v/1e3).toFixed(1))+'K'; return String(Math.round(v)); };
    const pad=s=>({1:'   ',2:'  ',3:' '})[s.length]||'';
    const ln=(x1,y1,x2,y2,col,w,dash)=>{ cx.strokeStyle=col; cx.lineWidth=w||1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke(); cx.setLineDash([]); };
    const rect=(x1,yA,x2,yB,bg,bd,w)=>{ const x=Math.min(x1,x2), y=Math.min(yA,yB), ww=Math.max(1,Math.abs(x2-x1)), hh=Math.max(1,Math.abs(yB-yA)); if(bg){ cx.fillStyle=bg; cx.fillRect(x,y,ww,hh); } if(bd){ cx.strokeStyle=bd; cx.lineWidth=w||1; cx.strokeRect(x,y,ww,hh); } };
    const msgs=[]; let base=p.offset;
    G.forEach((g,gi)=>{ if(g.msg) msgs.push(g.msg); if(!g.on) return; const cs=g.cands;
      // mapped candles on the chart
      if(g.map) cs.forEach(cd=>{ const P=cd.P; if(!P) return; let i1=-1,i2=-1; for(let i=0;i<n0;i++){ const t=candles[i].time; if(t>=cd.per.s&&i1<0) i1=i; if(t<cd.per.e) i2=i; } if(i1<0||i2<i1) return;
        const x1=X(i1), x2=X(i2); if(x1==null||x2==null) return; const col=P.bull?bull:bear, top=Math.max(P.o,P.c), bot=Math.min(P.o,P.c), xm=(x1+x2)/2, yT=Y(top), yB=Y(bot), yH=Y(P.h), yL=Y(P.l); if(yT==null||yB==null||yH==null||yL==null) return;
        rect(x1,yT,x2,yB,hfA(col,85),col,1); if(P.h>top) ln(xm,yT,xm,yH,col,1); if(P.l<bot) ln(xm,yB,xm,yL,col,1); if(p.mapTrend){ const yo=Y(P.o), yc=Y(P.c); if(yo!=null&&yc!=null) ln(x1,yo,x2,yc,col,1); }
        if(p.mapSep&&i1>0) ln(x1,0,x1,Hh,hfA(p.cWick,70),1,[2,3]);
        if(p.labels){ cx.font='bold 10px '+fam; cx.fillStyle=col; cx.textAlign='center'; cx.fillText(hfTfName(g.tf),xm,yH-8); } });
      // projected candles and footprints
      let minK=1e9,maxK=-1e9,maxH=-1e30; const fs=({Tiny:8,Small:10,Normal:12,Large:14,Huge:18})[p.tsize];
      cs.forEach((cd,j)=>{ const P=cd.P; if(!P) return; const shift=base+j*unit, ctr=shift+half, cL=ctr-half, cR=ctr+half, fpC=cR+p.fpGap+1+halfFp, col=P.bull?bull:bear, top=Math.max(P.o,P.c), bot=Math.min(P.o,P.c);
        minK=Math.min(minK,cL); maxK=Math.max(maxK,fpC+halfFp); maxH=Math.max(maxH,P.h);
        const yT=Y(top), yB=Y(bot), yH=Y(P.h), yL=Y(P.l); if(yT==null||yB==null||yH==null||yL==null) return;
        rect(xk(cL),yT,xk(cR),yB,col,col,1); if(P.h>top) ln(xk(ctr),yT,xk(ctr),yH,col,1); if(bot>P.l) ln(xk(ctr),yB,xk(ctr),yL,col,1);
        if(!P.ok) return; ln(xk(fpC),yH,xk(fpC),yL,hfA(p.cWick,60),1,[1,3]);
        for(let r=0;r<P.R;r++){ const yb=Y(P.l+r*P.step), yt=Y(P.l+(r+1)*P.step); if(yb==null||yt==null) continue; const bv=P.bid[r], av=P.ask[r], tv=bv+av;
          const rb=ratio(bv,P.maxSide), ra=ratio(av,P.maxSide), bl=bv>0?Math.max(1,Math.round(rb*halfFp)):0, al=av>0?Math.max(1,Math.round(ra*halfFp)):0;
          if(bl>0) rect(xk(fpC-bl),yt,xk(fpC),yb,p.grad?hfLerp(bear,70,15,rb):hfA(bear,25),p.grad?hfLerp(bear,55,20,rb):hfA(bear,40),1);
          if(al>0) rect(xk(fpC),yt,xk(fpC+al),yb,p.grad?hfLerp(bull,70,15,ra):hfA(bull,25),p.grad?hfLerp(bull,55,20,ra):hfA(bull,40),1);
          if(p.pocHl&&r===P.poc) rect(xk(fpC-Math.max(1,bl)),yt,xk(fpC+Math.max(1,al)),yb,hfA(p.cPoc,75),p.cPoc,2);
          if(p.showNums&&(bv>0||av>0)){ const show=p.numMode==='All Rows'||(p.numMode==='POC Only'?r===P.poc:tv>=P.avg), rh=Math.abs(yb-yt), f=fs||Math.max(7,Math.min(14,rh*0.8));
            if(show&&rh>=f*0.9){ const sb=fvol(bv), sa=fvol(av); cx.font=f+'px '+fam; cx.textAlign='center'; cx.fillStyle=r===P.poc?p.cPoc:p.cNum; cx.fillText(pad(sb)+sb+' '+sa+pad(sa),xk(fpC),(yt+yb)/2); } } }
        const yV=Y(P.vah), yVl=Y(P.val), yP=Y(P.pocP); if(yV!=null&&yVl!=null){ ln(xk(fpC-halfFp),yV,xk(fpC+halfFp),yV,p.cVa,2); ln(xk(fpC-halfFp),yVl,xk(fpC+halfFp),yVl,p.cVa,2);
          if(p.vaLbl){ const lab=(txt,pr,y,c2)=>{ if(y==null) return; cx.font='9px '+fam; cx.textAlign='left'; cx.fillStyle=c2; cx.fillText(p.vaPrice?txt+' '+hfFmtP(pr):txt,xk(fpC+halfFp)+4,y); }; lab('VAH',P.vah,yV,p.cVa); lab('VAL',P.val,yVl,p.cVa); lab('POC',P.pocP,yP,p.cPoc); } } });
      if(p.labels&&maxH>-1e29){ const yh=Y(maxH); if(yh!=null){ cx.font='bold 13px '+fam; cx.fillStyle=getComputedStyle(document.body).color||'#d1d4dc'; cx.textAlign='center'; cx.fillText(hfTfName(g.tf),xk((minK+maxK)/2),yh-12); } }
      base+=cs.length*unit+p.margin; });
    if(msgs.length){ cx.font='11px system-ui'; cx.textAlign='right'; msgs.forEach((m,k)=>{ const w=cx.measureText(m).width+12; cx.fillStyle='rgba(20,24,34,.85)'; cx.fillRect(W-w-6,40+k*20,w,18); cx.fillStyle='#ffb74d'; cx.fillText(m,W-12,49+k*20); }); }
    if(!p.hideBrand){ cx.font='10px '+fam; cx.textAlign='right'; cx.fillStyle='rgba(128,128,128,.8)'; cx.fillText('\u00a9 CandelaCharts',W-8,Hh-30); }
    cx.restore(); }; }
try{ DESC.hvf='Bid x Ask volume footprint for higher time frame candles, with POC and value area, built from lower time frame candles'; }catch(e){}
}catch(err){ console.error('hvf indicator failed',err); window.__hvfErr=err; }

// ---- [tto] INDICATOR: TheStrat TTO - Triangle They Out - port of the Pine v6 script "TheStrat TTO v1.3.0" (MPL 2.0) ----
// A pullback leaves a swing point (structure). A later bar sweeps it and closes back inside (the stop run). The entry is a break of that sweep bar's opposite
// extreme, and the sweep extreme is the stop reference. Four time frame slots (default 5m 15m 30m 1H) each run their own detector and fair value gaps on candles
// built from one lower time frame stream. That stream is loaded from Binance when it is finer than the chart. Display and alerts only. All three filters of the original are
// ported: fair value gap, timeframe continuity and ACT trend direction (the ACT candle colour logic is built in; the higher time frame candles it needs load from Binance).
try{
const TT_TFS=['1m','3m','5m','15m','30m','1h','2h','4h','6h','12h','1d'], TT_TFC=['15m','30m','1h','2h','4h','6h','12h','1d','1w'];
const TT_DEF={s1on:true,s1tf:'5m',s2on:true,s2tf:'15m',s3on:true,s3tf:'30m',s4on:true,s4tf:'1h',hideFiner:true,showBull:true,showBear:true,reclaim:2,sweep2Age:8,showYoung:true,
  fvgOn:true,fvgThr:0,fvgBox:true,fvgSession:false,tfcOn:true,tfc1on:true,tfc1tf:'1d',tfc2on:false,tfc2tf:'1h',tfc3on:false,tfc3tf:'1w',
  cBull:'#4caf50',cBear:'#f23645',marker:'Triangle',msize:'Auto',cLevel:'#9c9c9c',tag:true,tagPos:'Top Right',alSweep:true,alEntry:true,showAllGaps:false,showRejected:false,showArrows:false,cStruct:'#9c9c9c',cSweep2:'#ffffff',actFilter:'Off',actLadder:'Auto'};
const ttSec=iv=>{ const m=/^(\d+)([mhdwM])$/.exec(iv||''); return m?(+m[1])*({m:60,h:3600,d:86400,w:604800,M:2592000}[m[2]]):0; };
const ttName=(sec,tfs)=>sec<3600?Math.round(sec/60)+'m':sec<86400&&sec%3600===0?(sec/3600)+'H':sec===86400?'D':tfs;
const ttA=(c,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'')); if(!m) return c; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const ttFmt=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=100?v.toFixed(2):v.toPrecision(5);
// klines from Binance, cached; the running candle refreshes, history loads once
const ttK={};
function ttLoad(sy,iv,start,refreshMs,maxPages){ const key=sy+'|'+iv; let d=ttK[key]; if(!d) d=ttK[key]={rows:[],from:0,busy:false,ts:0,err:false}; if(d.busy) return d; const ls=ttSec(iv);
  const reset=!d.rows.length||d.from>start+ls*2; if(!reset&&Date.now()-d.ts<refreshMs) return d; if(d.err&&Date.now()-d.ts<15000) return d;
  d.busy=true; const rows=reset?[]:d.rows.slice(); let from=reset?start:rows[rows.length-1].t, pages=0, capped=false; if(!reset) rows.pop();
  const step=()=>fetch(`${RB(sy)}/klines?symbol=${sy}&interval=${iv}&startTime=${Math.floor(from)*1000}&limit=1000`).then(r=>r.json()).then(a=>{ if(!Array.isArray(a)) throw new Error('bad'); a.forEach(x=>rows.push({t:x[0]/1000,o:+x[1],h:+x[2],l:+x[3],c:+x[4]})); pages++;
    if(a.length>=1000){ if(pages<maxPages){ from=a[a.length-1][0]/1000+ls; return step(); } capped=true; } });
  step().then(()=>{ d.rows=rows; d.from=reset?start:d.from; d.err=false; }).catch(()=>{ d.err=true; }).then(()=>{ d.busy=false; d.ts=capped?0:Date.now(); try{ render(); }catch(e){} }); return d; }
function ttOpenAt(rows,t){ let lo=0,hi=rows.length-1,r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(rows[m].t<=t){ r=m; lo=m+1; } else hi=m-1; } return r>=0?rows[r].o:null; }
// ---- ACT direction filter: port of ACT v1.0.0 candle colour logic (ladder, bar classification, higher time frame windows, direction, stance) ----
// Per chart bar code: 1 green (main trend up), -1 red, 2 blue (counter-trend up), -2 purple (counter-trend down), 0 grey (no trend).
const TT_ACT_F=['Off','Trend or counter-trend','Main trend only'], TT_ACT_L=['Auto','Scalp: 15m 30m 1H 4H D','Day Trade: 30m 1H 4H D W','Swing: 4H D W M Q','Position: D W M Q Y'];
const TT_LAD=[['30','60','240','D'],['60','240','D','W'],['D','W','M','3M'],['W','M','3M','12M']];
const TT_ACT_IV={'30':['30m',0],'60':['1h',0],'240':['4h',0],'D':['1d',0],'W':['1w',0],'M':['1M',0],'3M':['1M',1],'12M':['1M',1]};
const TT_ACT_SPAN={'30':5400,'60':10800,'240':43200,'D':259200,'W':1814400,'M':7776000,'3M':23328000,'12M':94608000};
const ttTfSec=x=>({'30':1800,'60':3600,'240':14400,'D':86400,'W':604800,'M':2592000,'3M':7776000,'12M':31104000})[x]||0;
const ttLadIdx=(sel,e)=>{ const x=String(sel||'Auto'); return /^Scalp/.test(x)?0:/^Day/.test(x)?1:/^Swing/.test(x)?2:/^Position/.test(x)?3:(e<60?0:e<=3600?1:e<=86400?2:3); };
const ttEtFmt=(()=>{ try{ return new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric'}); }catch(e){ return null; } })();
const ttEtMemo=new Map();
// New York 4 hour bucket id (what ACT anchors its 4H rung to on charts finer than 4H)
function ttEtId(t){ const k=Math.floor(t/3600); let v=ttEtMemo.get(k); if(v!==undefined) return v; let y,m,d,h;
  if(ttEtFmt){ const q={}; ttEtFmt.formatToParts(new Date(k*3600000)).forEach(x=>{ q[x.type]=+x.value; }); y=q.year; m=q.month; d=q.day; h=q.hour%24; }
  else { const dt=new Date(k*3600000-5*3600000); y=dt.getUTCFullYear(); m=dt.getUTCMonth()+1; d=dt.getUTCDate(); h=dt.getUTCHours(); }
  v=Date.UTC(y,m-1,d)/86400000*6+Math.floor(h/4); if(ttEtMemo.size>20000) ttEtMemo.clear(); ttEtMemo.set(k,v); return v; }
function ttActBid(t0,e){ switch(t0){ case '30': return t=>Math.floor(t/1800); case '60': return t=>Math.floor(t/3600); case '240': return e<14400?ttEtId:(t=>Math.floor(t/14400));
  case 'D': return t=>Math.floor(t/86400); case 'W': return t=>Math.floor((t-345600)/604800);
  case 'M': return t=>{ const d=new Date(t*1000); return d.getUTCFullYear()*12+d.getUTCMonth(); };
  case '3M': return t=>{ const d=new Date(t*1000); return Math.floor((d.getUTCFullYear()*12+d.getUTCMonth())/3); };
  default: return t=>new Date(t*1000).getUTCFullYear(); } }
// request the candles each rung needs (State 2, Direction 1, Direction 2; State 1 only decides whether the ladder can run)
function ttActGet(c,p){ const e=ttSec(tf[1]), filt=p.actFilter||'Off', r={on:false,na:false,main:filt==='Main trend only',msg:'',sig:'',rung:null,codes:null};
  if(filt==='Off'||c.length<2) return r; const L=TT_LAD[ttLadIdx(p.actLadder,e)];
  if(e>ttTfSec(L[0])){ r.na=true; return r; }
  const sy=sym[0], c0=c[0].time, sig=[]; r.rung=[];
  for(let k=1;k<4;k++){ const t0=L[k]; if(ttTfSec(t0)<e){ r.rung.push({tf:t0,eff:false}); continue; }
    let iv=TT_ACT_IV[t0]; if(t0==='240'&&e<14400) iv=['1h',1];
    const d=ttLoad(sy,iv[0],c0-TT_ACT_SPAN[t0],60000,12);
    if(!d.rows.length&&!r.msg) r.msg=d.err?'TTO: could not load ACT '+iv[0]+' candles for '+sy:'TTO: loading ACT '+iv[0]+' candles\u2026';
    sig.push(d.rows.length+':'+(d.rows.length?d.rows[d.rows.length-1].t:0)); r.rung.push({tf:t0,eff:true,agg:!!iv[1],rows:d.rows}); }
  r.on=true; r.sig=sig.join(','); return r; }
// one rung as per-chart-bar series: current bar (open from the real higher time frame candle, high/low/close running over the chart bars) and the previous bar
function ttActSeries(c,T,e,g){ const N=c.length, S={o:new Array(N).fill(null),h:new Array(N).fill(null),l:new Array(N).fill(null),c:new Array(N).fill(null),ph:new Array(N).fill(null),pl:new Array(N).fill(null),po:new Array(N).fill(null),pc:new Array(N).fill(null)};
  if(!g.eff){ for(let i=0;i<N;i++){ S.o[i]=c[i].open; S.h[i]=c[i].high; S.l[i]=c[i].low; S.c[i]=c[i].close; if(i>0){ S.ph[i]=c[i-1].high; S.pl[i]=c[i-1].low; S.po[i]=c[i-1].open; S.pc[i]=c[i-1].close; } } return S; }
  const bid=ttActBid(g.tf,e); let rows=g.rows;
  if(g.agg){ const a=[]; let cur=null,cid=null; rows.forEach(x=>{ const id=bid(x.t); if(id!==cid){ cur={t:x.t,o:x.o,h:x.h,l:x.l,c:x.c}; a.push(cur); cid=id; } else { cur.h=Math.max(cur.h,x.h); cur.l=Math.min(cur.l,x.l); cur.c=x.c; } }); rows=a; }
  const idx=new Map(); rows.forEach((x,j)=>idx.set(bid(x.t),j));
  let cid=null,ro=0,rh=0,rl=0,rc=0,pa=null;
  for(let i=0;i<N;i++){ const id=bid(T[i]);
    if(id!==cid){ if(cid!==null) pa={o:ro,h:rh,l:rl,c:rc}; cid=id; ro=c[i].open; rh=c[i].high; rl=c[i].low; } else { rh=Math.max(rh,c[i].high); rl=Math.min(rl,c[i].low); } rc=c[i].close;
    const j=idx.get(id), row=j!==undefined?rows[j]:null, pr=j!==undefined&&j>0?rows[j-1]:pa;
    S.o[i]=row?row.o:ro; S.h[i]=rh; S.l[i]=rl; S.c[i]=rc; if(pr){ S.ph[i]=pr.h; S.pl[i]=pr.l; S.po[i]=pr.o; S.pc[i]=pr.c; } }
  return S; }
// bar type of the current higher time frame bar against the previous one (1 inside, 2 directional, 3 outside, F = failed)
function ttActClass(c1h,c1l,c1o,c1c,cch,ccl,cco,ccc){ const r={type:'n/a',inside:false,ifB:false,ifS:false,fB:false,fS:false}; if(c1h==null||cch==null) return r;
  const bh=cch>c1h, bl=ccl<c1l, up=ccc>cco, inC=ccc<=c1h&&ccc>=c1l;
  if(bh&&bl){ if(inC){ if(up){ r.type='F3u'; r.fB=true; } else { r.type='F3d'; r.fS=true; } } else if(ccc>c1h){ r.type='3u'; r.ifB=true; } else { r.type='3d'; r.ifS=true; } }
  else if(bh){ if(inC){ r.type='F2u'; r.fB=true; } else { r.type='2u'; r.ifB=true; } }
  else if(bl){ if(inC){ r.type='F2d'; r.fS=true; } else { r.type='2d'; r.ifS=true; } }
  else { r.inside=true; r.type=up?'1u':'1d'; }
  return r; }
function ttActCodes(c,A){ const N=c.length, T=c.map(x=>x.time), e=ttSec(tf[1]), R=A.rung.map(g=>ttActSeries(c,T,e,g)), s2=R[0], d1=R[1], d2=R[2], codes=new Int8Array(N);
  const gt=(a,b)=>a!=null&&b!=null&&a>b, lt=(a,b)=>a!=null&&b!=null&&a<b;
  for(let i=0;i<N;i++){ const cl=c[i].close, hi=c[i].high, lo=c[i].low;
    const t2=ttActClass(s2.ph[i],s2.pl[i],s2.po[i],s2.pc[i],s2.h[i],s2.l[i],s2.o[i],s2.c[i]), k1=ttActClass(d1.ph[i],d1.pl[i],d1.po[i],d1.pc[i],d1.h[i],d1.l[i],d1.o[i],d1.c[i]), k2=ttActClass(d2.ph[i],d2.pl[i],d2.po[i],d2.pc[i],d2.h[i],d2.l[i],d2.o[i],d2.c[i]);
    const d1u=gt(cl,d1.o[i]), d1d=lt(cl,d1.o[i]), d2u=gt(cl,d2.o[i]), d2d=lt(cl,d2.o[i]);
    const agB=d1u&&d2u, agS=d1d&&d2d, conflict=(d1u&&d2d)||(d1d&&d2u);
    const sL=t2.type==='2u'||t2.type==='3u', sS=t2.type==='2d'||t2.type==='3d';
    let dir=0, ct=false; if(agB||agS){ dir=agB?1:-1; } else if(sL||sS){ dir=sL?1:-1; ct=true; }
    const s2lb=s2.ph[i]!=null&&hi>=s2.ph[i], s2ls=s2.pl[i]!=null&&lo<=s2.pl[i], d1lb=d1.ph[i]!=null&&hi>=d1.ph[i], d1ls=d1.pl[i]!=null&&lo<=d1.pl[i];
    let aside;
    if(conflict){ const cb=s2lb&&!s2ls&&cl>=s2.ph[i], cs=s2ls&&!s2lb&&cl<=s2.pl[i]; aside=!(cb||cs); }
    else if(k1.inside&&!d1lb&&!d1ls) aside=k2.inside||!(agB||agS);
    else if((agB&&((k1.fB&&k2.ifB)||(k1.ifB&&k2.fB)))||(agS&&((k1.fS&&k2.ifS)||(k1.ifS&&k2.fS)))) aside=true;
    else aside=!(agB||agS);
    codes[i]=aside||dir===0?0:dir*(ct?2:1); }
  return codes; }
function ttoCompute(c,p,U,TFS,ACT){ const N=c.length, T=c.map(x=>x.time), chartSec=ttSec(tf[1]), D={N,ok:false};
  const ci=t=>{ let lo=0,hi=N-1,r=0; while(lo<=hi){ const m=(lo+hi)>>1; if(T[m]<=t){ r=m; lo=m+1; } else hi=m-1; } return r; };
  const cfg=[1,2,3,4].map(k=>({on:!!p['s'+k+'on'],tf:p['s'+k+'tf'],sec:ttSec(p['s'+k+'tf'])})); cfg.forEach(x=>{ x.name=ttName(x.sec,x.tf); });
  let unitSec=chartSec; cfg.forEach(x=>{ if(x.on&&x.sec>0&&x.sec<unitSec) unitSec=x.sec; });
  cfg.forEach(x=>{ x.rank=1+cfg.filter(y=>y.on&&y.sec<x.sec).length; x.usable=x.on&&x.sec>0&&x.sec%unitSec===0; x.visible=!p.hideFiner||x.sec>=chartSec; });
  D.cfg=cfg; D.unitSec=unitSec; D.native=unitSec===chartSec;
  // ACT direction: a unit that runs AT its chart bar's close (the chart's own bars, a slot equal to the unit) reads that bar's colour; everything else reads the last completed chart bar
  const actOn=!!(ACT&&ACT.on&&ACT.codes), actMain=!!(ACT&&ACT.main), codeAt=j=>actOn&&j>=0&&j<N?ACT.codes[j]:0;
  const actPass=(bull,code)=>!actOn||(actMain?(bull?code===1:code===-1):(bull?code>0:code<0));
  const mk=()=>({armed:false,armedShown:false,entered:false,sweptLevel:null,extreme:null,trigger:null,trigLine:null,sweep2:false,flushOn:false,flushExt:null,flushExtT:null,flushBars:0});
  const S=cfg.map(()=>({bH:null,bL:null,bC:null,bT:null,bLast:null,bId:null,barsSeen:0,h1:null,l1:null,c1:null,t1:null,h2:null,l2:null,t2:null,bull:mk(),bear:mk(),bullGaps:[],bearGaps:[],lows:[],highs:[]}));
  const out={mks:{},lvl:[],trig:[],box:[],arr:[],rej:[],ev:[]}, tfcA=TFS.filter(x=>x.on&&x.sec>=chartSec&&x.rows.length);
  const tfcState=(uc,t)=>{ let bo=true,be=true; if(p.tfcOn) tfcA.forEach(x=>{ const o=ttOpenAt(x.rows,t); if(o==null) return; if(uc>o) be=false; else bo=false; }); return [bo,be]; };
  const startTrig=(bull,price,t,w)=>{ const r={t0:t,t1:t,price,faint:false,bull,w}; out.trig.push(r); return r; };
  const endTrig=(r,t,faint)=>{ if(r){ r.t1=t; if(faint) r.faint=true; } };
  // fair value gaps
  const findGap=(gaps,price)=>{ for(let i=gaps.length-1;i>=0;i--){ const g=gaps[i]; if(price>=g.bottom&&price<=g.top) return g; } return null; };
  const drawGapBox=(g,bull,t,name)=>{ if(!p.fvgBox) return; if(!g.bx){ g.bx={t0:g.startTime,t1:t,top:g.top,bottom:g.bottom,bull,name,ext:false}; out.box.push(g.bx); } g.bx.t1=t; };
  const mitigate=(s,h,l,t)=>{ for(let i=s.bullGaps.length-1;i>=0;i--){ const g=s.bullGaps[i]; if(l<g.bottom){ if(p.showAllGaps&&g.bx){ g.bx.ext=false; g.bx.t1=t; } s.bullGaps.splice(i,1); } }
    for(let i=s.bearGaps.length-1;i>=0;i--){ const g=s.bearGaps[i]; if(h>g.top){ if(p.showAllGaps&&g.bx){ g.bx.ext=false; g.bx.t1=t; } s.bearGaps.splice(i,1); } } };
  const gapQualify=(bull,price,streamSec,tx)=>{ let hit=false; cfg.forEach((x,k)=>{ if(x.usable&&x.sec>=streamSec){ const g=findGap(bull?S[k].bullGaps:S[k].bearGaps,price); if(g){ hit=true; drawGapBox(g,bull,tx,x.name); } } }); return hit; };
  // level registry
  const addLevel=(arr,price,born,bornIdx,sb)=>{ let dup=null; for(const lv of arr) if(lv.price===price){ dup=lv; break; } if(dup&&sb) dup.sweepBorn=true; if(!dup){ if(arr.length>=50) arr.shift(); arr.push({price,born,bornIdx,sweepBorn:sb}); } };
  const relocate=(arr,oldP,newP,born,idx)=>{ let moved=false; for(const lv of arr) if(lv.price===oldP){ lv.price=newP; lv.born=born; lv.bornIdx=idx; lv.sweepBorn=true; moved=true; break; } if(!moved) addLevel(arr,newP,born,idx,true); };
  const deepest=(arr,ext,cl,extT)=>{ let b=null; for(const lv of arr) if(lv.price>ext&&lv.price<=cl&&lv.born<=extT&&(!b||lv.price<b.price)) b=lv; return b; };
  const highestR=(arr,ext,cl,extT)=>{ let b=null; for(const lv of arr) if(lv.price<ext&&lv.price>=cl&&lv.born<=extT&&(!b||lv.price>b.price)) b=lv; return b; };
  const rmLowsAbove=(arr,lo)=>{ for(let i=arr.length-1;i>=0;i--) if(arr[i].price>lo) arr.splice(i,1); }, rmHighsBelow=(arr,hi)=>{ for(let i=arr.length-1;i>=0;i--) if(arr[i].price<hi) arr.splice(i,1); };
  const sameDay=(a,b)=>Math.floor(a/86400)===Math.floor(b/86400);
  function processBar(k,h,l,c,t,tEnd,tq){ const cf=cfg[k], s=S[k], tx=tEnd, lw=cf.rank, sec=cf.sec, name=cf.name;
    if((!p.fvgSession||s.t2==null||sameDay(t,s.t2))&&s.h2!=null&&s.c1!=null){
      if(l>s.h2&&s.c1>s.h2&&(l-s.h2)/s.h2*100>=p.fvgThr){ if(s.bullGaps.length>=100) s.bullGaps.shift(); const g={top:l,bottom:s.h2,startTime:s.t2,bx:null}; if(p.showAllGaps){ g.bx={t0:g.startTime,t1:t,top:g.top,bottom:g.bottom,bull:true,name,ext:true,faint:true}; out.box.push(g.bx); } s.bullGaps.push(g); }
      if(h<s.l2&&s.c1<s.l2&&(s.l2-h)/h*100>=p.fvgThr){ if(s.bearGaps.length>=100) s.bearGaps.shift(); const g={top:s.l2,bottom:h,startTime:s.t2,bx:null}; if(p.showAllGaps){ g.bx={t0:g.startTime,t1:t,top:g.top,bottom:g.bottom,bull:false,name,ext:true,faint:true}; out.box.push(g.bx); } s.bearGaps.push(g); } }
    s.barsSeen++;
    if(s.l2!=null&&s.l1<s.l2&&s.l1<l) addLevel(s.lows,s.l1,s.t1,s.barsSeen,false);
    if(s.h2!=null&&s.h1>s.h2&&s.h1>h) addLevel(s.highs,s.h1,s.t1,s.barsSeen,false);
    const [bullOk,bearOk]=tfcState(c,tq); const actD=(D.native&&sec===unitSec)?codeAt(ci(tq)):codeAt(ci(tq)-1);
    for(const bull of [true,false]){ if(bull?!p.showBull:!p.showBear) continue; const sd=bull?s.bull:s.bear, lv=bull?s.lows:s.highs;
      if(sd.armed){ if(bull?c<sd.sweptLevel:c>sd.sweptLevel){ sd.armed=false; endTrig(sd.trigLine,tx,true); sd.trigLine=null; }
        else if(bull?l<sd.extreme:h>sd.extreme){ relocate(lv,sd.extreme,bull?l:h,t,s.barsSeen); sd.extreme=bull?l:h; sd.trigger=bull?h:l; if(sd.trigLine){ endTrig(sd.trigLine,tx,false); sd.trigLine=startTrig(bull,sd.trigger,tx,lw); } } }
      else if(sd.entered) sd.entered=false;
      else { const any=bull?lv.some(x=>x.price>l):lv.some(x=>x.price<h);
        if(!sd.flushOn&&any){ sd.flushOn=true; sd.flushExt=bull?l:h; sd.flushExtT=t; sd.flushBars=0; }
        else if(sd.flushOn){ if(bull?l<sd.flushExt:h>sd.flushExt){ sd.flushExt=bull?l:h; sd.flushExtT=t; sd.flushBars=0; } else sd.flushBars++; }
        if(sd.flushOn){ let arm=null; if(sd.flushBars<=p.reclaim) arm=bull?deepest(lv,sd.flushExt,c,sd.flushExtT):highestR(lv,sd.flushExt,c,sd.flushExtT);
          if(arm){ const sw2=arm.sweepBorn&&s.barsSeen-arm.bornIdx>=p.sweep2Age, young=arm.sweepBorn&&!sw2; let show=false, rej=null;
            if(!cf.visible) rej=null; else if(!(bull?bullOk:bearOk)) rej='tfc'; else if(!actPass(bull,actD)) rej='act'; else if(young&&!p.showYoung) rej='young'; else if(!p.fvgOn) show=true; else { show=gapQualify(bull,sd.flushExt,sec,tx); if(!show) rej='gap'; }
            sd.armed=true; sd.armedShown=show; sd.sweptLevel=arm.price; sd.extreme=sd.flushExt; sd.trigger=bull?h:l; sd.sweep2=sw2; sd.trigLine=null;
            if(show){ out.lvl.push({t0:arm.born,t1:tx,price:arm.price,w:lw}); sd.trigLine=startTrig(bull,sd.trigger,tx,lw); if(p.showArrows) out.arr.push({t:tx,bull,sw2});
              out.ev.push({type:'sweep',bull,sw2,slot:name,level:arm.price,trig:sd.trigger,time:tq}); }
            else if(p.showRejected&&rej) out.rej.push({t:tx,bull,txt:'x '+rej});
            if(bull) rmLowsAbove(lv,sd.flushExt); else rmHighsBelow(lv,sd.flushExt); addLevel(lv,sd.flushExt,sd.flushExtT,s.barsSeen,true); sd.flushOn=false; }
          else if(sd.flushBars>p.reclaim){ if(bull) rmLowsAbove(lv,sd.flushExt); else rmHighsBelow(lv,sd.flushExt); sd.flushOn=false; } } } }
    s.h2=s.h1; s.l2=s.l1; s.t2=s.t1; s.h1=h; s.l1=l; s.c1=c; s.t1=t; }
  function unitEntry(k,h,l,c,t){ const cf=cfg[k], s=S[k]; const [bullOk,bearOk]=tfcState(c,t); const actU=D.native?codeAt(ci(t)):codeAt(ci(t)-1);
    for(const bull of [true,false]){ if(bull?!p.showBull:!p.showBear) continue; const sd=bull?s.bull:s.bear;
      if(sd.armed&&(bull?h>sd.trigger:l<sd.trigger)){ const taken=sd.armedShown&&(bull?bullOk:bearOk)&&actPass(bull,actU); endTrig(sd.trigLine,t,!taken); sd.trigLine=null;
        if(taken){ const txt=cf.name+(sd.sweep2?' \u00d72':''), key=ci(t)+'|'+(bull?1:0); let m=out.mks[key]; if(!m) out.mks[key]={i:ci(t),bull,text:txt,rank:cf.rank}; else { m.text+=' \u00b7 '+txt; if(cf.rank>m.rank) m.rank=cf.rank; }
          out.ev.push({type:'entry',bull,slot:cf.name,trig:sd.trigger,ext:sd.extreme,time:t}); }
        sd.armed=false; sd.entered=true; } } }
  function unitTick(k,h,l,c,t){ const cf=cfg[k], s=S[k]; if(!cf.usable) return; mitigate(s,h,l,t);
    if(cf.sec===unitSec){ unitEntry(k,h,l,c,t); processBar(k,h,l,c,t,t,t); }
    else { const id=Math.floor(t/cf.sec);
      if(s.bId==null){ unitEntry(k,h,l,c,t); s.bId=id; s.bH=h; s.bL=l; s.bC=c; s.bT=t; s.bLast=t; }
      else if(id!==s.bId){ processBar(k,s.bH,s.bL,s.bC,s.bT,s.bLast,t); unitEntry(k,h,l,c,t); s.bId=id; s.bH=h; s.bL=l; s.bC=c; s.bT=t; s.bLast=t; }
      else { unitEntry(k,h,l,c,t); s.bH=Math.max(s.bH,h); s.bL=Math.min(s.bL,l); s.bC=c; s.bLast=t; } } }
  for(const u of U) for(let k=0;k<4;k++) unitTick(k,u.h,u.l,u.c,u.t);
  const lastT=U.length?U[U.length-1].t:0; S.forEach(s=>{ [s.bull,s.bear].forEach(sd=>{ if(sd.armed&&sd.trigLine) sd.trigLine.t1=lastT; }); });
  const cap=(a,n)=>a.length>n?a.slice(-n):a; D.mks=Object.values(out.mks).slice(-500); D.lvl=cap(out.lvl,250).map(x=>Object.assign(x,{i0:ci(x.t0),i1:ci(x.t1)})); D.trig=cap(out.trig,250).map(x=>Object.assign(x,{i0:ci(x.t0),i1:ci(x.t1)}));
  D.box=cap(out.box,500).map(x=>Object.assign(x,{i0:ci(x.t0),i1:ci(x.t1)})); D.arr=cap(out.arr,300).map(x=>Object.assign(x,{i:ci(x.t)})); D.rej=cap(out.rej,300).map(x=>Object.assign(x,{i:ci(x.t)})); D.events=out.ev.slice(-300);
  D.actTag=actOn?(actMain?'act main':'act'):(ACT&&ACT.na?'act n/a':'');
  D.ok=true; return D; }
let ttMem=null;
function ttoGet(c,p){ const N=c.length, chartSec=ttSec(tf[1]); let msg='', U=[], unitSec=chartSec; if(N<30) return {ok:false,msg:'TTO: not enough candles'};
  [1,2,3,4].forEach(k=>{ const sc=ttSec(p['s'+k+'tf']); if(p['s'+k+'on']&&sc>0&&sc<unitSec) unitSec=sc; });
  const sy=sym[0], unitIv=[1,2,3,4].map(k=>p['s'+k+'tf']).concat([tf[1]]).find(iv=>ttSec(iv)===unitSec), start=Math.max(c[0].time,c[N-1].time-20000*unitSec), now=Date.now()/1000;
  if(unitSec===chartSec) U=c.slice(0,N-1).map(x=>({t:x.time,h:x.high,l:x.low,c:x.close}));
  else { const d=ttLoad(sy,unitIv,start,30000,25); U=d.rows.filter(x=>x.t>=start&&x.t+unitSec<=now).map(x=>({t:x.t,h:x.h,l:x.l,c:x.c})); if(!U.length) msg=d.err?'TTO: could not load '+unitIv+' candles for '+sy:'TTO: loading '+unitIv+' candles\u2026'; }
  const TFS=[1,2,3,4].slice(0,3).map(k=>{ const iv=p['tfc'+k+'tf'], on=!!p['tfc'+k+'on']&&p.tfcOn; const x={on,sec:ttSec(iv),rows:[]}; if(on&&x.sec>=chartSec) x.rows=ttLoad(sy,iv,start-x.sec,60000,6).rows; return x; });
  const act=ttActGet(c,p);
  const key=JSON.stringify(p)+'|'+act.sig+(act.na?'|n':'')+(act.msg?'|m':'')+'|'+N+'|'+c[N-1].time+'|'+U.length+'|'+(U.length?U[U.length-1].t+'|'+U[U.length-1].c:'')+'|'+TFS.map(x=>x.rows.length).join(',');
  if(ttMem&&ttMem.k===key) return ttMem.D; let D; if(!U.length) D={ok:false,msg}; else if(act.msg) D={ok:false,msg:act.msg}; else { try{ if(act.on) act.codes=ttActCodes(c,act); D=ttoCompute(c,p,U,TFS,act); }catch(e){ console.error('tto calc failed',e); D={ok:false,msg:'TTO: calculation failed'}; } } ttMem={k:key,D}; return D; }
IND.tto={label:'TheStrat TTO: Triangle They Out',cat:'Trend',nm:()=>'TTO',p:Object.assign({},TT_DEF),cols:['#4caf50'],
  fields:[['s1on','chk','Slot 1: enable'],['s1tf','sel','Slot 1: timeframe',{opts:TT_TFS}],['s2on','chk','Slot 2: enable'],['s2tf','sel','Slot 2: timeframe',{opts:TT_TFS}],['s3on','chk','Slot 3: enable'],['s3tf','sel','Slot 3: timeframe',{opts:TT_TFS}],['s4on','chk','Slot 4: enable'],['s4tf','sel','Slot 4: timeframe',{opts:TT_TFS}],
    ['hideFiner','chk','Hide slots finer than the chart'],['showBull','chk','Bullish TTOs'],['showBear','chk','Bearish TTOs'],['reclaim','num','Reclaim window (slot bars)',{min:0,max:10}],['sweep2Age','num','Sweep-of-sweep minimum age (slot bars)',{min:0,max:100}],['showYoung','chk','Show quick re-sweeps'],
    ['fvgOn','chk','Only show TTOs inside a fair value gap'],['fvgThr','num','Minimum gap size %',{min:0,max:10,step:0.05}],['fvgBox','chk','Draw qualifying gaps'],['fvgSession','chk','Ignore gaps across days'],
    ['tfcOn','chk','Filter by timeframe continuity'],['tfc1on','chk','Continuity 1: enable'],['tfc1tf','sel','Continuity 1: timeframe',{opts:TT_TFC}],['tfc2on','chk','Continuity 2: enable'],['tfc2tf','sel','Continuity 2: timeframe',{opts:TT_TFC}],['tfc3on','chk','Continuity 3: enable'],['tfc3tf','sel','Continuity 3: timeframe',{opts:TT_TFC}],
    ['actFilter','sel','Filter by ACT trend direction',{opts:TT_ACT_F}],['actLadder','sel','ACT ladder',{opts:TT_ACT_L}],
    ['cBull','col','Bullish'],['cBear','col','Bearish'],['marker','sel','Entry marker',{opts:['Triangle','Arrow','Label','Diamond','Circle']}],['msize','sel','Marker size',{opts:['Auto','Tiny','Small','Normal','Large']}],['cLevel','col','Swept level'],
    ['tag','chk','Show status tag'],['tagPos','sel','Status tag position',{opts:['Top Right','Top Center','Top Left','Bottom Right','Bottom Left']}],['alSweep','chk','Alert on sweeps (setup armed)'],['alEntry','chk','Alert on entries'],
    ['showAllGaps','chk','Show all live gaps'],['showRejected','chk','Mark filtered-out sweeps'],['showArrows','chk','Show armed-setup arrows'],['cStruct','col','Armed arrow'],['cSweep2','col','x2 armed arrow']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},TT_DEF,p), D=ttoGet(c,q); return {mk:[],boxes:[{type:'ttoview',pts:[],o:q,D}],labels:[],events:D.ok?D.events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='ttoview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, n0=candles.length; if(n0<5) return; cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    if(!D||!D.ok){ if(D&&D.msg){ cx.font='11px system-ui'; cx.textAlign='right'; const w=cx.measureText(D.msg).width+12; cx.fillStyle='rgba(20,24,34,.85)'; cx.fillRect(W-w-6,40,w,18); cx.fillStyle='#ffb74d'; cx.fillText(D.msg,W-12,49); } cx.restore(); return; }
    const xi=i=>{ const v=X(i); return v==null?null:v; }, bull=p.cBull, bear=p.cBear;
    const ln=(x1,y1,x2,y2,col,w,dash)=>{ cx.strokeStyle=col; cx.lineWidth=w||1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke(); cx.setLineDash([]); };
    // gap boxes
    D.box.forEach(b=>{ const x0=xi(b.i0), x1=b.ext?W:xi(b.i1), yt=Y(b.top), yb=Y(b.bottom); if(x0==null||x1==null||yt==null||yb==null) return; const col=b.bull?bull:bear;
      cx.fillStyle=ttA(col,b.faint?0.05:0.08); cx.fillRect(x0,Math.min(yt,yb),Math.max(1,x1-x0),Math.max(1,Math.abs(yb-yt))); cx.font='9px system-ui'; cx.textAlign='left'; cx.fillStyle=ttA(col,b.faint?0.4:0.6); cx.fillText(b.name,x0+3,Math.min(yt,yb)+7); });
    D.lvl.forEach(v=>{ const x0=xi(v.i0), x1=xi(v.i1), y=Y(v.price); if(x0==null||x1==null||y==null) return; ln(x0,y,x1,y,ttA(p.cLevel,0.7),v.w); });
    D.trig.forEach(v=>{ const x0=xi(v.i0), x1=xi(v.i1), y=Y(v.price); if(x0==null||x1==null||y==null) return; ln(x0,y,x1,y,ttA(v.bull?bull:bear,v.faint?0.25:0.75),v.w,[1.5,3]); });
    const sz=r=>({Tiny:4,Small:6,Normal:8,Large:11})[p.msize]||(r>=3?6:4);
    D.arr.forEach(a=>{ const x=xi(a.i), cd=candles[a.i]; if(x==null||!cd) return; const y=Y(a.bull?cd.low:cd.high); if(y==null) return; const s=4, dir=a.bull?1:-1, y0=y+dir*6; cx.fillStyle=a.sw2?p.cSweep2:p.cStruct; cx.beginPath(); cx.moveTo(x,y0); cx.lineTo(x-s,y0+dir*s*1.6); cx.lineTo(x+s,y0+dir*s*1.6); cx.closePath(); cx.fill(); });
    D.rej.forEach(a=>{ const x=xi(a.i), cd=candles[a.i]; if(x==null||!cd) return; const y=Y(a.bull?cd.low:cd.high); if(y==null) return; cx.font='9px system-ui'; cx.textAlign='center'; cx.fillStyle='rgba(150,150,150,.8)'; cx.fillText(a.txt,x,y+(a.bull?12:-12)); });
    D.mks.forEach(m=>{ const x=xi(m.i), cd=candles[m.i]; if(x==null||!cd) return; const y=Y(m.bull?cd.low:cd.high); if(y==null) return; const s=sz(m.rank), col=m.bull?bull:bear, dir=m.bull?1:-1, c0=y+dir*(5+s), tcol=p.marker==='Label'?'#fff':ttA(col,0.7);
      cx.fillStyle=col; cx.strokeStyle=col;
      if(p.marker==='Arrow'){ cx.beginPath(); cx.moveTo(x,c0-dir*s); cx.lineTo(x-s,c0); cx.lineTo(x+s,c0); cx.closePath(); cx.fill(); cx.fillRect(x-s*0.35,c0,s*0.7,s*dir); }
      else if(p.marker==='Diamond'){ cx.beginPath(); cx.moveTo(x,c0-s); cx.lineTo(x+s,c0); cx.lineTo(x,c0+s); cx.lineTo(x-s,c0); cx.closePath(); cx.fill(); }
      else if(p.marker==='Circle'){ cx.beginPath(); cx.arc(x,c0,s,0,6.2832); cx.fill(); }
      else if(p.marker==='Label'){ cx.font='bold '+(s>=6?10:9)+'px system-ui'; const w=cx.measureText(m.text).width+8, hh=s>=6?16:14, by=m.bull?y+5:y-5-hh; cx.fillRect(x-w/2,by,w,hh); cx.fillStyle='#fff'; cx.textAlign='center'; cx.fillText(m.text,x,by+hh/2); return; }
      else { cx.beginPath(); cx.moveTo(x,c0-dir*s); cx.lineTo(x-s,c0+dir*s); cx.lineTo(x+s,c0+dir*s); cx.closePath(); cx.fill(); }
      cx.font='bold '+(s>=6?10:9)+'px system-ui'; cx.textAlign='center'; cx.fillStyle=tcol; cx.fillText(m.text,x,c0+dir*(s+9)); });
    if(p.tag){ const cf=D.cfg, off=cf.filter(x=>x.on&&!x.usable).map(x=>x.name).join(' '), hid=cf.filter(x=>x.on&&x.usable&&!x.visible).map(x=>x.name).join(' ');
      const txt='TTO 1.3.0  |  units '+(D.native?'chart':Math.round(D.unitSec/60)+'m')+'  |  alerts '+(D.native?'live':'bar close')+(p.fvgOn?'  |  gap':'  |  no gap filter')+(p.tfcOn?'  |  tfc':'')+(D.actTag?'  |  '+D.actTag:'')+(off?'  |  off: '+off:'')+(hid?'  |  hidden: '+hid:'');
      let fs=10; cx.font=fs+'px system-ui'; while(cx.measureText(txt).width+12>W-8&&fs>6){ fs--; cx.font=fs+'px system-ui'; } const w=cx.measureText(txt).width+12, h=fs+8, pos=p.tagPos, x0=/Left/.test(pos)?4:/Center/.test(pos)?(W-w)/2:W-w-4, y0=/Top/.test(pos)?4+34:Hh-h-4-24;
      cx.fillStyle='rgba(26,26,26,.85)'; cx.fillRect(x0,y0,w,h); cx.textAlign='left'; cx.fillStyle='#b2b5be'; cx.fillText(txt,x0+6,y0+h/2); }
    cx.restore(); }; }
// alerts (toasts): sweeps and entries from the newest closed candle onward, once each, while the app is open
function ttoAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='tto'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},TT_DEF,i.p); let quiet=q; if(i._ttK!==key){ i._ttK=key; i._ttSeen={}; quiet=true; } const seen=i._ttSeen||(i._ttSeen={});
    i._xr.events.forEach(e=>{ const k=e.type+e.bull+e.slot+e.time; if(seen[k]) return; seen[k]=1; if(quiet||e.time<cc) return; if(e.type==='sweep'?!P.alSweep:!P.alEntry) return;
      const msg=e.type==='sweep'?'TTO '+e.slot+(e.bull?' bullish':' bearish')+(e.sw2?' SWEEP-OF-SWEEP':' sweep')+' \u00b7 level '+ttFmt(e.level)+', entry '+(e.bull?'over ':'under ')+ttFmt(e.trig):'TTO '+e.slot+(e.bull?' bullish entry over ':' bearish entry under ')+ttFmt(e.trig)+' \u00b7 stop ref '+ttFmt(e.ext);
      toast(msg+' \u00b7 '+sym[0]+' '+tf[0],e.bull?'#2e7d32':'#c62828'); }); }); }
{ const _ttRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_ttRE.apply(this,arguments); try{ ttoAlerts(q); }catch(e){ console.error('tto alerts',e); } return rv; }; }
try{ DESC.tto='Liquidity sweep and reclaim entries on up to four time frames, with fair value gap, timeframe continuity and ACT trend direction filters'; }catch(e){}
}catch(err){ console.error('tto indicator failed',err); window.__ttoErr=err; }

// ---- [bce] PREMIUM STRATEGY · "Bullish Cross + Bullish Engulfing"  (self-contained: every name starts with bce / BCE) =================
try{
// Category: Premium Strategy.  Registered as IND.bce with the same extras() / alerts hook pattern as % Retest Buy & Sell (nothing existing is edited).
// BULLISH CROSS : fast EMA closes above the slow EMA after being at / below it on the previous closed candle   (defaults 9 / 21)
// BUY           : after a bullish cross, a BULLISH ENGULFING candle must CLOSE within the next N closed candles (N = lookback)  ->  BUY on that candle's close
// BEARISH CROSS : fast EMA closes below the slow EMA after being at / above it   ->   SELL after a BEARISH ENGULFING candle closes (exact mirror)
// ENGULFING     : bull = green candle whose body covers the previous candle's body (prev must be red unless switched off), bear = mirror.
// ONE SIGNAL PER SETUP: each cross opens one setup; the first engulfing candle fires it and closes it. An opposite cross replaces the setup, an expired lookback drops it.
// NON-REPAINTING: the forming (last) candle is never used and bar i only ever sees bars <= i, so a printed signal never moves or disappears.
/*BCE-ENGINE-BEGIN*/
const BCE_NAME='Bullish Cross + Bullish Engulfing';
const BCE_DEF={
  active:true,                                                    // strategy on / off
  bullCross:true, bearCross:true, fastLen:9, slowLen:21, src:'Close', minSep:0,   // cross detection
  lookback:5, crossBarCounts:false,                               // candles allowed after the cross for the engulfing candle
  engMode:'Body engulfs body', reqOpp:true, minBody:1,            // candlestick confirmation
  showBuy:true, showSell:true, buyCol:'#2dd4a7', sellCol:'#ff5d7a', mkSize:'Small',
  alBuy:true, alSell:true, alSound:false,
  inputsStatus:false, valuesStatus:true };
const BCE_SZ={Small:.8,Normal:1,Large:1.5};
function bceNorm(p){ const o=Object.assign({},BCE_DEF,p||{}), n=(v,d,lo,hi)=>{ v=+v; if(!isFinite(v)) v=d; return Math.min(hi,Math.max(lo,v)); };
  o.fastLen=Math.round(n(o.fastLen,9,1,500)); o.slowLen=Math.round(n(o.slowLen,21,2,1000)); o.lookback=Math.round(n(o.lookback,5,1,50));
  o.minSep=n(o.minSep,0,0,50); o.minBody=n(o.minBody,1,0,10); return o; }
function bceSrc(x,s){ return s==='HL2'?(x.high+x.low)/2:s==='HLC3'?(x.high+x.low+x.close)/3:s==='OHLC4'?(x.open+x.high+x.low+x.close)/4:x.close; }
function bceEma(v,n){ const o=new Array(v.length).fill(NaN), k=2/(n+1); let s=0,p=NaN;      // EMA seeded with the SMA of the first n values
  for(let i=0;i<v.length;i++){ const x=v[i]; if(!isFinite(x)) continue; if(i<n-1){ s+=x; continue; } if(i===n-1){ s+=x; p=s/n; o[i]=p; continue; } p=x*k+p*(1-k); o[i]=p; } return o; }
function bceEng(c,i,dir,P){            // is closed candle i an engulfing candle of direction dir (1 bullish / -1 bearish)?
  if(i<1) return false; const a=c[i-1], b=c[i], aTop=Math.max(a.open,a.close), aBot=Math.min(a.open,a.close), bBody=Math.abs(b.close-b.open), aBody=aTop-aBot;
  if(!(bBody>0)) return false;
  if(dir>0){ if(!(b.close>b.open)) return false; if(P.reqOpp&&!(a.close<a.open)) return false;
    if(!(b.open<=aBot&&b.close>=aTop&&(b.open<aBot||b.close>aTop))) return false; if(P.engMode!=='Body engulfs body'&&!(b.close>a.high)) return false; }
  else { if(!(b.close<b.open)) return false; if(P.reqOpp&&!(a.close>a.open)) return false;
    if(!(b.open>=aTop&&b.close<=aBot&&(b.open>aTop||b.close<aBot))) return false; if(P.engMode!=='Body engulfs body'&&!(b.close<a.low)) return false; }
  return bBody>=aBody*P.minBody; }
function bceEngine(c,p){
  const P=bceNorm(p), n=c?c.length:0, nC=Math.max(0,n-1), out={events:[],stat:'',P};              // the forming candle (last) is never used
  if(!P.active){ out.stat='OFF'; return out; }
  if(P.fastLen>=P.slowLen){ out.stat='fast EMA must be shorter than slow EMA'; return out; }
  if(nC<P.slowLen+2){ out.stat='waiting for candles'; return out; }
  const src=[]; for(let i=0;i<nC;i++) src.push(bceSrc(c[i],P.src)); const f=bceEma(src,P.fastLen), s=bceEma(src,P.slowLen);
  let setup=null;
  for(let i=1;i<nC;i++){
    if(isFinite(f[i])&&isFinite(s[i])&&isFinite(f[i-1])&&isFinite(s[i-1])){
      if(f[i]>s[i]&&f[i-1]<=s[i-1]) setup=P.bullCross?{dir:1,bar:i,used:false}:null;                // a new cross always replaces the old setup
      else if(f[i]<s[i]&&f[i-1]>=s[i-1]) setup=P.bearCross?{dir:-1,bar:i,used:false}:null; }
    if(!setup) continue;
    const age=i-setup.bar; if(age>P.lookback){ setup=null; continue; }
    if(setup.used||age<(P.crossBarCounts?0:1)) continue;                                            // the engulfing candle must come AFTER the cross candle
    if(P.minSep>0&&!(Math.abs(f[i]-s[i])/c[i].close*100>=P.minSep)) continue;
    if(bceEng(c,i,setup.dir,P)){ setup.used=true; out.events.push({type:setup.dir>0?'buy':'sell',time:c[i].time,idx:i,price:c[i].close}); } }
  const l=nC-1, tag='EMA '+P.fastLen+'/'+P.slowLen;
  out.stat=setup&&!setup.used&&l-setup.bar<=P.lookback?tag+' · '+(setup.dir>0?'bull':'bear')+' cross '+(l-setup.bar)+' bar(s) ago, waiting for '+(setup.dir>0?'bullish':'bearish')+' engulfing':tag+' · no open setup';
  return out; }
/*BCE-ENGINE-END*/

// ---------- [bce] chart hook: small BUY / SELL markers (keep:true so they stay visible with the other indicator markers) ----------
function bceRun(c,p){
  const r=bceEngine(c,p), P=r.P, mk=[], sz=BCE_SZ[P.mkSize]||.8;
  r.events.forEach(e=>{ if(e.type==='buy'&&P.showBuy) mk.push({time:e.time,position:'belowBar',color:P.buyCol,shape:'arrowUp',text:'BUY',size:sz,keep:true});
    else if(e.type==='sell'&&P.showSell) mk.push({time:e.time,position:'aboveBar',color:P.sellCol,shape:'arrowDown',text:'SELL',size:sz,keep:true}); });
  return {mk,stat:r.stat,events:r.events}; }

// ---------- [bce] alerts (BUY and SELL switched on / off separately; only the newest CLOSED candle can fire) ----------
function bceAlerts(q){
  if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{
    if(i.t!=='bce'||!i._xr||!i._xr.events||!show(i)) return;
    const P=bceNorm(i.p); let quiet=q; if(i._bceK!==key){ i._bceK=key; i._bceLast={}; quiet=true; }   // first run / new symbol or interval: learn history silently
    const last=i._bceLast||(i._bceLast={});
    i._xr.events.forEach(e=>{
      if(e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!(e.type==='buy'?P.alBuy:P.alSell)) return;
      toast((e.type==='buy'?'BUY':'SELL')+' · '+BCE_NAME+' · '+sym[0]+' '+tf[0],e.type==='buy'?'#2e7d32':'#c62828');
      if(P.alSound&&typeof beep==='function') beep(); }); });
}
{ const _bcePrevRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_bcePrevRE.apply(this,arguments); try{ bceAlerts(q); }catch(e){ console.error('bce alerts',e); } return rv; }; }

// ---------- [bce] settings panel ----------
function bceInputs(b,d){
  const p=d.p, el=(tag,css,txt)=>{ const e=document.createElement(tag); if(css) e.style.cssText=css; if(txt!=null) e.textContent=txt; return e; };
  const head=t=>{ const h=el('div'); h.className='sech'; h.textContent=t; b.appendChild(h); };
  const note=t=>b.appendChild(el('div','color:#8a93a6;font-size:13px;line-height:1.45;padding:2px 0 8px',t));
  const num=(k,l,o)=>fld(b,p,k,'num',l,o), chk=(k,l)=>fld(b,p,k,'chk',l), sel=(k,l,opts)=>fld(b,p,k,'sel',l,{opts});
  head('A. STRATEGY'); chk('active','Strategy active');
  note('OFF removes every signal and alert of this strategy without deleting it.');
  head('B. CROSS DETECTION'); chk('bullCross','Bullish cross (fast EMA crosses above slow EMA) → BUY setups'); chk('bearCross','Bearish cross (fast EMA crosses below slow EMA) → SELL setups');
  num('fastLen','Fast EMA length',{min:1,max:500,step:1}); num('slowLen','Slow EMA length',{min:2,max:1000,step:1}); sel('src','EMA source',['Close','HL2','HLC3','OHLC4']);
  num('minSep','Minimum EMA gap at the signal candle (% of price, 0 = off)',{min:0,max:50,step:.01});
  note('The fast EMA must be shorter than the slow EMA. Each cross opens one setup; a cross the other way replaces it.');
  head('C. LOOKBACK'); num('lookback','Candles allowed after the cross for the engulfing candle',{min:1,max:50,step:1}); chk('crossBarCounts','Engulfing candle may be the cross candle itself');
  note('The engulfing candle must close AFTER the cross candle (unless the option above is on) and within this many closed candles. If none forms, there is no signal.');
  head('D. CANDLESTICK CONFIRMATION'); sel('engMode','Engulfing rule',['Body engulfs body','Body + close beyond previous high / low']);
  chk('reqOpp','Previous candle must be the opposite colour (red before BUY, green before SELL)'); num('minBody','Minimum body size vs previous body (×)',{min:0,max:10,step:.1});
  note('Bullish: green candle whose open ≤ previous body low and close ≥ previous body high. Bearish: the mirror. The signal prints only after that candle has closed.');
  head('E. SIGNALS'); chk('showBuy','Show BUY signals'); chk('showSell','Show SELL signals'); sel('mkSize','Label size',['Small','Normal','Large']);
  head('F. ALERTS'); chk('alBuy','BUY alert'); chk('alSell','SELL alert'); chk('alSound','Play a sound');
  note('Alerts fire once, when the confirming candle closes, while the app is open.');
}
function bceStyle(b,d){
  const p=d.p, head=t=>{ const h=document.createElement('div'); h.className='sech'; h.textContent=t; b.appendChild(h); };
  stRow(b,'BUY signal',p,'showBuy','buyCol'); stRow(b,'SELL signal',p,'showSell','sellCol');
  head('OUTPUT VALUES'); fld(b,p,'valuesStatus','chk','Values in status line'); head('INPUT VALUES'); fld(b,p,'inputsStatus','chk','Inputs in status line');
}

// ---------- [bce] registration under "Premium Strategy" ----------
IND.bce={label:BCE_NAME,title:BCE_NAME,cat:'Premium Strategy',cols:[],calc:()=>[],
  nm:p=>BCE_NAME+(p.inputsStatus?' EMA '+p.fastLen+'/'+p.slowLen+' · '+p.lookback:''),
  status:i=>i.p.valuesStatus!==false&&i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:BCE_DEF, inputsTab:bceInputs, styleTab:bceStyle, visTab:typeof sbxVis==='function'?sbxVis:undefined,
  visOk:i=>{ const [u,m]=tfUnit(), v=i.p.vr&&i.p.vr[u]; return !v||(v.on&&m>=v.min&&m<=v.max); },
  extras:(c,p,inst)=>bceRun(c,p)};
// ================= end of [bce] Bullish Cross + Bullish Engulfing =================
try{ DESC.bce='Premium strategy \u00b7 fast / slow EMA cross, then an engulfing candle closes \u2192 small BUY / SELL'; }catch(e){}   // picker description
}catch(err){ console.error('bce strategy failed',err); window.__bceErr=err; }
