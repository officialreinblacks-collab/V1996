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


// ---- [lrs] INDICATOR: Low-Risk ETF Strategy (RSMK) - port of TASC Oct 2026, Markos Katsanos (PineCoders version) ----
// Buy-only relative-strength tool: RSMK line + its average in an own pane, Buy / Exit markers on the price chart.
// The benchmark (default BTCUSDT instead of SPY) is fetched from Binance on the chart's interval and matched by candle time.
try{
const LRS_SYMS=['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','PAXGUSDT'];
const lrsD={};
function lrsRsi(v,n){ const o=new Array(v.length).fill(null); let g=0,l=0; for(let i=1;i<v.length;i++){ const x=v[i]-v[i-1], gg=Math.max(x,0), ll=Math.max(-x,0); if(i<=n){ g+=gg; l+=ll; if(i===n){ g/=n; l/=n; } } else { g=(g*(n-1)+gg)/n; l=(l*(n-1)+ll)/n; } if(i>=n) o[i]=l===0?100:100-100/(1+g/l); } return o; }
function lrsCor(a,b,n,i){ if(i<n-1) return null; let sa=0,sb=0; for(let k=i-n+1;k<=i;k++){ if(a[k]==null||b[k]==null) return null; sa+=a[k]; sb+=b[k]; } const ma=sa/n, mb=sb/n; let c=0,va=0,vb=0; for(let k=i-n+1;k<=i;k++){ const x=a[k]-ma, y=b[k]-mb; c+=x*y; va+=x*x; vb+=y*y; } return va>0&&vb>0?c/Math.sqrt(va*vb):null; }
function lrsBench(bs){ const iv=tf[1], key=bs+'|'+iv; let d=lrsD[key]; if(!d) d=lrsD[key]={map:null,ts:0,busy:false,err:false};
  if(!d.busy&&Date.now()-d.ts>30000){ d.busy=true;
    (async()=>{ try{ let end=null, all=[]; for(let pg=0;pg<3;pg++){ const r=await fetch(`${RB(bs)}/klines?symbol=${bs}&interval=${iv}&limit=1000${end?'&endTime='+end:''}`).then(x=>x.json()); if(!Array.isArray(r)||!r.length) break; all=r.concat(all); end=r[0][0]-1; if(r.length<1000) break; }
        if(all.length){ const m=new Map(); all.forEach(x=>m.set(x[0]/1000,+x[4])); d.map=m; d.err=false; } else d.err=true; }catch(e){ d.err=true; }
      d.busy=false; d.ts=Date.now(); try{ render(); }catch(e){} })(); }
  return d; }
function lrsCore(c,p){ const N=c.length, d=lrsBench(p.bench), cl=c.map(x=>x.close), vo=c.map(x=>x.volume||0);
  const R={rsmk:new Array(N).fill(null),mars:new Array(N).fill(null),buy:[],exit:[],segs:[],ready:false,err:d.err,busy:!d.map};
  if(!d.map) return R;
  const bn=c.map(x=>d.map.has(x.time)?d.map.get(x.time):null); let last=null; // carry the last known benchmark value over gaps
  for(let i=0;i<N;i++){ if(bn[i]!=null) last=bn[i]; else if(last!=null&&i>0) bn[i]=last; }
  const rs1=cl.map((x,i)=>{ if(i<p.rsL||bn[i]==null||bn[i-p.rsL]==null) return null; const a=Math.log(x/bn[i]), b=Math.log(cl[i-p.rsL]/bn[i-p.rsL]); return isFinite(a)&&isFinite(b)?a-b:null; });
  const rs=emaV(rs1,4).map(v=>v==null?null:v*100), mars=smaV(rs,p.rsMa), rsi=lrsRsi(cl,p.rsiL), e5=emaV(cl,5), sm=smaV(cl,p.maB), vsm=smaV(vo,5);
  R.rsmk=rs; R.mars=mars; R.ready=true;
  let pos=0, ep=0, eb=0; const nC=N-1;   // the candle still forming never prints a signal
  for(let i=0;i<N;i++){
    const r=rs[i]; if(r==null) continue;
    let hh=null; for(let k=Math.max(0,i-3);k<=i;k++){ if(rs[k]==null){ hh=null; break; } if(hh==null||rs[k]>hh) hh=rs[k]; }
    const cor=lrsCor(cl,bn,100,i), roc=i>=6&&bn[i]!=null&&bn[i-6]?(bn[i]-bn[i-6])/bn[i-6]*100:null;
    let llr=null; if(i>=19){ for(let k=i-19;k<=i;k++){ if(rsi[k]==null){ llr=null; break; } if(llr==null||rsi[k]<llr) llr=rsi[k]; } }
    const gotVol=p.minVol<=0||(vsm[i]!=null&&vsm[i]>p.minVol);
    const rsSig=mars[i]!=null&&r>mars[i]&&r>p.rsCrit&&hh!=null&&r===hh&&r<25;
    const rocSig=cor!=null&&roc!=null&&((roc>-6&&cor>p.corMin)||(roc<-6&&cor<-p.corMin));
    const rsiSig=llr!=null&&llr<p.rsiOs&&rsi[i]!=null&&rsi[i-3]!=null&&rsi[i]>rsi[i-3];
    const momSig=e5[i]!=null&&i>=5&&sm[i-5]!=null&&e5[i]>sm[i-5];
    const isBuy=gotVol&&rsSig&&rocSig&&rsiSig&&momSig&&pos===0;
    const isSell=cor!=null&&r<-p.rsCrit&&cor>0.8&&pos===1, perExit=pos===1&&cl[i]>=ep*(1+p.tp/100), reBal=pos===1&&i-eb>=p.hold, ex=isSell||perExit||reBal;
    if(isBuy&&i<nC){ pos=1; ep=cl[i]; eb=i; R.buy.push(i); R.segs.push({a:i,b:N-1,ep}); } else if(ex&&i<nC){ pos=0; R.exit.push(i); R.segs[R.segs.length-1].b=i; }
  }
  return R; }
// The app calls calc()/extras() on every live tick: work on the newest 3000 candles only and reuse the result for ~1.5 s.
const lrsMem={};
function lrsCalc(c,p){ const N=c.length, st=Math.max(0,N-3000), d=lrsBench(p.bench), key=JSON.stringify(p)+'|'+N+'|'+(N?c[N-1].time:0)+'|'+(d.map?d.map.size:-1)+'|'+d.ts, m=lrsMem[key], now=Date.now();
  if(m&&now-m.t<1500) return m.R;
  let R; try{ R=lrsCore(st?c.slice(st):c,p); }catch(e){ console.error('lrs calc failed',e); R={rsmk:[],mars:[],buy:[],exit:[],segs:[]}; }
  if(st){ R.rsmk=new Array(st).fill(null).concat(R.rsmk); R.mars=new Array(st).fill(null).concat(R.mars); R.buy=R.buy.map(i=>i+st); R.exit=R.exit.map(i=>i+st); R.segs=R.segs.map(q=>({a:q.a+st,b:q.b+st,ep:q.ep})); }
  Object.keys(lrsMem).forEach(k=>{ if(k!==key) delete lrsMem[k]; }); lrsMem[key]={t:now,R}; return R; }
IND.lrs={label:'Low-Risk ETF Strategy (RSMK)',cat:'Momentum',nm:p=>'LRETF '+p.bench,p:{bench:'BTCUSDT',rsL:35,rsiL:10,rsMa:50,rsCrit:3,minVol:0,rsiOs:35,maB:15,corMin:0.6,hold:30,tp:25,showLine:true},
  cols:['#2dd4a7','#2962ff'],kinds:['line','line'],pane:1,lines:p=>[[0,'#787b86']],
  fields:[['bench','sel','Benchmark symbol',{opts:LRS_SYMS}],['rsL','num','RSMK length',{min:2,max:300}],['rsiL','num','RSI length',{min:2,max:100}],['rsMa','num','RS MA length',{min:2,max:300}],['rsCrit','num','RS entry level',{step:0.5}],['minVol','num','Minimum volume (0 = off)',{min:0}],['rsiOs','num','RSI oversold',{min:1,max:99}],['maB','num','MA bars',{min:2,max:200}],['corMin','num','Minimum correlation',{min:0,max:1,step:0.05}],['hold','num','Rebalance period (bars)',{min:1,max:500}],['tp','num','Profit target exit %',{min:1,max:500}],['showLine','chk','Show entry line and position fill']],
  calc:(c,p)=>{ const R=lrsCalc(c,Object.assign({},IND.lrs.p,p)); return [toS(c,R.rsmk),toS(c,R.mars)]; },
  extras:(c,p)=>{ const R=lrsCalc(c,Object.assign({},IND.lrs.p,p)), mk=[]; R.buy.forEach(i=>mk.push({time:c[i].time,position:'belowBar',color:'#2dd4a7',shape:'arrowUp',text:'Buy'})); R.exit.forEach(i=>mk.push({time:c[i].time,position:'aboveBar',color:'#f23645',shape:'circle',text:'Exit'})); mk.sort((a,b)=>a.time-b.time); return {mk:mk.slice(-500),boxes:p.showLine!==false&&R.segs.length?[{type:'lrsview',pts:[],o:{segs:R.segs.slice(-60)}}]:[],labels:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='lrsview') return _D.apply(this,arguments);
    const n0=candles.length; cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
    d.o.segs.forEach(sg=>{ const b=Math.min(sg.b,n0-1), ye=Y(sg.ep); if(ye==null||sg.a>=n0) return;
      for(let i=sg.a+1;i<=b;i++){ const x0=X(i-1), x1=X(i), y0=Y(candles[i-1].close), y1=Y(candles[i].close); if(x0==null||x1==null||y0==null||y1==null) continue;
        cx.fillStyle=candles[i-1].close>sg.ep?'rgba(0,150,136,.2)':'rgba(242,54,69,.2)'; cx.beginPath(); cx.moveTo(x0,ye); cx.lineTo(x0,y0); cx.lineTo(x1,y1); cx.lineTo(x1,ye); cx.closePath(); cx.fill(); }
      const xa=X(sg.a), xb=X(b); if(xa==null||xb==null) return; cx.strokeStyle='#ffeb3b'; cx.lineWidth=1; cx.setLineDash([2,3]); cx.beginPath(); cx.moveTo(xa,ye); cx.lineTo(xb,ye); cx.stroke(); cx.setLineDash([]); });
    cx.restore(); }; }
}catch(err){ console.error('lrs indicator failed',err); window.__lrsErr=err; }
