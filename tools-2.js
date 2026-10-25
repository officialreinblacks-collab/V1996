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
