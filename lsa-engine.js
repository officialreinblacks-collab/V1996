'use strict';
// lsa-engine.js - server copy of Liquidity Sweep Pro - Automated (IND.lsa in tool10.html): same rules, so the phone push, the email and the chart agree.
// Used by server.js for watches with tool:'lsa'. Needs 1 minute candles (about 3000 = 2 days) and decides on CLOSED candles only.
// If you change the rules in tool10.html, copy them here too.
const LX_TZ=['America/New_York','UTC','Europe/London','Europe/Berlin','Asia/Dubai','Asia/Tokyo','Australia/Sydney','Africa/Lagos','America/Chicago','America/Los_Angeles'];
const LX_T=[]; for(let h=0;h<24;h++){ const s=(h<10?'0':'')+h; LX_T.push(s+':00'); LX_T.push(s+':30'); }
const LX_TF=['1m','3m','5m','15m','30m','1h','2h','4h','6h','12h','1d','1w','1M'];
const LX_DEF={
  tfLiq:'15m', tfConf:'5m', tfEnt:'1m',
  lvPD:true, lvPS:true, lvAsia:true, lvLon:true, lvNY:true, lvEq:true, lvExt:true, lvInt:false, maxLv:10,
  extLen:5, intLen:2, mssLen:3, eqTol:0.10, minSweep:0.05, reclaim:3, confWin:18, brkAtr:0.3,
  dispAtr:1.0, dispClose:65, dispStruct:true, dispVol:false, dispVolX:1.3,
  cisdMode:'Sequence Open', reqCisd:true, reqMss:true, intMode:'Optional',
  entry:'IFVG', ifvg:true, fvgMin:0.3, zoneLife:120, armBars:36,
  minQ:'A', slBasis:'Sweep Extreme', slBuf:0.25, maxRisk:4, minRR:1.5,
  tpMode:'Liquidity', tp3Mode:'External Liquidity', r1:2, r2:2.5, r3:3, tp1Min:1, sp1:40, sp2:30, be:true,
  cont:true, maxCont:2, contRR:1.5,
  tz:'America/New_York', dayStart:'00:00',
  asiaOn:false, asiaS:'20:00', asiaE:'00:00', lonOn:true, lonS:'02:00', lonE:'05:00', nyOn:true, nyS:'07:00', nyE:'10:00', maxSig:2,
  showHist:true, histDetail:false, liveBars:5, showSw:true, showCls:true, showGrab:false, showBrk:true, showDisp:true, showCisd:true, showMss:true, showInt:true, showPD:true, maxZ:6,
  dash:true, dashPos:'Top Left', dashSize:'Small', stats:true, statsPos:'Bottom Left',
  cBuy:'#2ebd85', cSell:'#f6465d', cLvl:'#ffd60a', cDisp:'#4aa3ff', cCisd:'#b266ff', cFvg:'#26c6da', cIfvg:'#ffb74d',
  alSweep:true, alDisp:false, alCisd:false, alMss:false, alInt:false, alIfvg:false, alEntry:true, alSl:true, alTp1:true, alTp2:true, alTp3:true, alInv:false, alSound:true
};
const lxHM=s=>{ const m=/^(\d+):(\d+)$/.exec(s||''); return m?(+m[1])*60+(+m[2]):0; };
const lxIn=(lm,s,e)=>s===e?true:(s<e?(lm>=s&&lm<e):(lm>=s||lm<e));
const LX_MON=2592000;
const lxSecOf=(tf,cs)=>{ const m=/^(\d+)([mhdwM])$/.exec(tf||''); let s=m?(+m[1])*({m:60,h:3600,d:86400,w:604800,M:LX_MON}[m[2]]):cs; if(s<cs) s=cs; const r=Math.ceil(s/cs)*cs; return (m&&m[2]==='M'&&r===LX_MON*(+m[1]))?LX_MON*(+m[1]):r; };
const lxF=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1000?v.toFixed(2):Math.abs(v)>=100?v.toFixed(3):Math.abs(v)>=1?v.toFixed(5):v.toPrecision(5);
const lxRgba=(hex,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return 'rgba(128,128,128,'+a+')'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const lxFmtC={}; const lxOffM=new Map();
function lxOff(tz,t){ const k=Math.floor(t/3600), mk=tz+'|'+k; let v=lxOffM.get(mk); if(v!==undefined) return v;
  let f=lxFmtC[tz]; if(f===undefined){ try{ f=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric'}); }catch(e){ f=null; } lxFmtC[tz]=f; }
  if(!f) v=0; else { const q={}; f.formatToParts(new Date(k*3600000)).forEach(x=>{ q[x.type]=+x.value; }); v=Math.round((Date.UTC(q.year,q.month-1,q.day,q.hour%24,q.minute)-k*3600000)/60000); }
  if(lxOffM.size>40000) lxOffM.clear(); lxOffM.set(mk,v); return v; }
const lxClock=(tz,t)=>{ const mn=Math.floor(t/60)+lxOff(tz,t), lm=((mn%1440)+1440)%1440, h=Math.floor(lm/60), m=lm%60; return (h<10?'0':'')+h+':'+(m<10?'0':'')+m; };

// ---------------------------------------------------------------- aggregation layer (closed bars only)
function lxLayer(sec,cs){
  const L={sec:sec,bars:[],cur:null,trSum:0};
  L.fin=function(out){ const q=L.cur; if(!q) return; L.cur=null; const B=L.bars, n=B.length, pb=n?B[n-1]:null;
    const tr=pb?Math.max(q.high-q.low,Math.abs(q.high-pb.close),Math.abs(q.low-pb.close)):q.high-q.low;
    L.trSum+=tr; q.atr=n<14?L.trSum/(n+1):(pb.atr*13+tr)/14; q.idx=n; B.push(q); out.push({sec:sec,q:q}); };
  const mon=sec===LX_MON, wk=sec===604800;
  L.feed=function(i,b,out){ let k,t0,t1; if(mon){ const d=new Date(b.time*1000), y=d.getUTCFullYear(), mo=d.getUTCMonth(); k=y*12+mo; t0=Date.UTC(y,mo,1)/1000; t1=Date.UTC(y,mo+1,1)/1000; }
    else if(wk){ k=Math.floor((b.time-345600)/sec); t0=k*sec+345600; t1=t0+sec; } else { k=Math.floor(b.time/sec); t0=k*sec; t1=t0+sec; }
    if(L.cur&&L.cur.k!==k) L.fin(out);
    const q=L.cur;
    if(!q) L.cur={k:k,time:t0,open:b.open,high:b.high,low:b.low,close:b.close,vol:b.volume||0,i0:i,i1:i,hiI:i,loI:i};
    else { if(b.high>q.high){ q.high=b.high; q.hiI=i; } if(b.low<q.low){ q.low=b.low; q.loI=i; } q.close=b.close; q.vol+=b.volume||0; q.i1=i; }
    if(b.time+cs>=t1) L.fin(out); };
  return L; }

// ---------------------------------------------------------------- engine
function lxCompute(c,p){
  const n0=c.length, D={ok:false,n:n0,m:0,lv:[],sw:[],zn:[],tr:[],ev:[],gb:[],bk:[],dp:[],st:null,ds:null,info:null};
  if(n0<80) return D;
  const m=n0-1;                      // the last candle is still forming: only bars 0..m-1 are used
  let cs=0; for(let i=Math.max(1,m-400);i<m;i++){ const d=c[i].time-c[i-1].time; if(d>0&&(!cs||d<cs)) cs=d; }
  if(!cs) return D;
  const sLq=lxSecOf(p.tfLiq,cs), sCf=lxSecOf(p.tfConf,cs), sEn=lxSecOf(p.tfEnt,cs);
  const LY={}, getL=s=>LY[s]||(LY[s]=lxLayer(s,cs)), LQ=getL(sLq), CF=getL(sCf), EN=getL(sEn), LAYS=Object.keys(LY).map(k=>LY[k]);
  D.info={cs:cs,sLq:sLq,sCf:sCf,sEn:sEn,m:m};
  const tz=p.tz, dsMin=lxHM(p.dayStart);
  const SES=[{k:'A',nm:'Asian',on:p.asiaOn,s:lxHM(p.asiaS),e:lxHM(p.asiaE),lv:p.lvAsia,cur:null,hi:0,lo:0,hiLv:null,loLv:null,mid:null},
             {k:'L',nm:'London',on:p.lonOn,s:lxHM(p.lonS),e:lxHM(p.lonE),lv:p.lvLon,cur:null,hi:0,lo:0,hiLv:null,loLv:null,mid:null},
             {k:'N',nm:'New York',on:p.nyOn,s:lxHM(p.nyS),e:lxHM(p.nyE),lv:p.lvNY,cur:null,hi:0,lo:0,hiLv:null,loLv:null,mid:null}];
  const QR={'B':1,'A':2,'A+':3}, minQ=QR[p.minQ]||2;
  const intEff=p.intMode==='Off'?(p.minQ==='A+'?'Required':'Off'):(p.minQ==='A+'?'Required':p.intMode);
  const f1=Math.max(0,p.sp1)/100, f2=Math.max(0,p.sp2)/100, fs=f1+f2>1?f1+f2:1, F1=f1/fs, F2=f2/fs;
  let BI=0, levels=[], lvId=0, sid=0, tid=0;
  const IH=[],IL=[],MH=[],ML=[], XH=[], XL=[];
  const ST={'1':null,'-1':null}, TR={'1':null,'-1':null};
  const pend=[], Z=[], sigCnt={}, openT=[];
  let bias=0, lastS=null, lastT=null, pdH=null, pdL=null, psH=null, psL=null, dk=null, dHi=0, dLo=0, lastSesK=null;
  const ev=(k,dir,msg,x)=>{ const e=Object.assign({k:k,dir:dir,i:BI,t:c[BI].time,msg:msg},x||{}); D.ev.push(e); return e; };
  const addLv=o=>{ o.id=++lvId; o.sw=-1; o.end=-1; if(o.born==null) o.born=o.i; o.cnt=1; levels.push(o); D.lv.push(o); return o; };
  const dropLv=lv=>{ if(lv&&lv.end<0) lv.end=BI; };
  const lvOn=lv=>lv.kind==='PD'?p.lvPD:lv.kind==='PS'?p.lvPS:lv.kind==='EXT'?p.lvExt:lv.kind==='EQ'?p.lvEq:lv.kind==='SES'?true:false;
  const RANK={PD:5,SES:4,PS:3,EQ:4,EXT:3};

  // ---- sessions / day bookkeeping on every closed base bar
  const finSes=(S)=>{ S.cur=null; if(!isFinite(S.hi)||!isFinite(S.lo)) return;
    S.mid=(S.hi+S.lo)/2;
    if(S.lv){ dropLv(S.hiLv); dropLv(S.loLv); S.hiLv=addLv({side:1,price:S.hi,i:BI,kind:'SES',name:S.k+'SH',sk:S.k}); S.loLv=addLv({side:-1,price:S.lo,i:BI,kind:'SES',name:S.k+'SL',sk:S.k}); }
    if(p.lvPS){ dropLv(psH); dropLv(psL); psH=addLv({side:1,price:S.hi,i:BI,kind:'PS',name:'PSH'}); psL=addLv({side:-1,price:S.lo,i:BI,kind:'PS',name:'PSL'}); }
    lastSesK=S.k; };
  const sesTrack=(i)=>{ const t=c[i].time, off=lxOff(tz,t), mn=Math.floor(t/60)+off, lm=((mn%1440)+1440)%1440, dkey=Math.floor((mn-dsMin)/1440);
    if(dk!==null&&dkey!==dk){ if(isFinite(dHi)&&p.lvPD){ dropLv(pdH); dropLv(pdL); pdH=addLv({side:1,price:dHi,i:i,kind:'PD',name:'PDH'}); pdL=addLv({side:-1,price:dLo,i:i,kind:'PD',name:'PDL'}); } dHi=-Infinity; dLo=Infinity; }
    if(dk===null){ dHi=-Infinity; dLo=Infinity; }
    dk=dkey; dHi=Math.max(dHi,c[i].high); dLo=Math.min(dLo,c[i].low);
    SES.forEach(S=>{ const inn=lxIn(lm,S.s,S.e), inst=inn?Math.floor((mn-S.s)/1440):null;
      if(S.cur!==null&&inst!==S.cur) finSes(S);
      if(inn){ if(S.cur===null){ S.cur=inst; S.hi=-Infinity; S.lo=Infinity; } S.hi=Math.max(S.hi,c[i].high); S.lo=Math.min(S.lo,c[i].low); } }); };
  const sigSes=t=>{ const off=lxOff(tz,t), mn=Math.floor(t/60)+off, lm=((mn%1440)+1440)%1440; let any=false;
    for(const S of SES){ if(S.on){ any=true; if(lxIn(lm,S.s,S.e)) return {k:S.k,key:S.k+'|'+Math.floor((mn-S.s)/1440)}; } }
    return any?null:{k:'-',key:'-|'+Math.floor((mn-dsMin)/1440)}; };

  // ---- pivots
  const pivot=(B,k,len,H,Lo)=>{ if(k<2*len) return; const pb=k-len, q=B[pb]; let isH=true,isL=true;
    for(let j=pb-len;j<=pb+len;j++){ if(j===pb) continue; const r=B[j];
      if(j<pb?r.high>=q.high:r.high>q.high) isH=false; if(j<pb?r.low<=q.low:r.low<q.low) isL=false; if(!isH&&!isL) break; }
    if(isH) H.push({price:q.high,pb:pb,i:q.hiI,ci:BI,sw:-1}); if(isL) Lo.push({price:q.low,pb:pb,i:q.loI,ci:BI,sw:-1}); };

  // ---- displacement (closed bar): body vs ATR, strong close, optional internal break and volume
  const dispDir=(B,k)=>{ if(k<1) return 0; const q=B[k], rng=q.high-q.low; if(!(rng>0)) return 0; const body=Math.abs(q.close-q.open), at=B[k-1].atr;
    if(body<p.dispAtr*at) return 0; const up=q.close>q.open, cl=up?(q.close-q.low)/rng:(q.high-q.close)/rng; if(cl*100<p.dispClose) return 0;
    if(p.dispVol){ let s=0,cn=0; for(let j=Math.max(0,k-20);j<k;j++){ s+=B[j].vol; cn++; } if(cn&&s>0&&q.vol<p.dispVolX*s/cn) return 0; }
    if(p.dispStruct){ let mx=-Infinity,mn=Infinity; for(let j=Math.max(0,k-3);j<k;j++){ mx=Math.max(mx,B[j].high); mn=Math.min(mn,B[j].low); } if(up?q.close<=mx:q.close>=mn) return 0; }
    return up?1:-1; };

  // ---- 15m: external swings, equal highs / lows, structure bias
  const onLQ=q=>{ const B=LQ.bars, k=q.idx, nH=XH.length, nL=XL.length; pivot(B,k,p.extLen,XH,XL);
    if(XH.length>nH){ const pv=XH[XH.length-1], tol=p.eqTol*q.atr; let hit=null;
      if(p.lvEq) for(const lv of levels){ if(lv.side===1&&(lv.kind==='EXT'||lv.kind==='EQ')&&Math.abs(lv.price-pv.price)<=tol){ hit=lv; break; } }
      if(hit){ hit.kind='EQ'; hit.name='EQH'; hit.price=Math.max(hit.price,pv.price); hit.cnt++; hit.born=BI; }
      else addLv({side:1,price:pv.price,i:pv.i,born:BI,kind:'EXT',name:'ExtH'}); }
    if(XL.length>nL){ const pv=XL[XL.length-1], tol=p.eqTol*q.atr; let hit=null;
      if(p.lvEq) for(const lv of levels){ if(lv.side===-1&&(lv.kind==='EXT'||lv.kind==='EQ')&&Math.abs(lv.price-pv.price)<=tol){ hit=lv; break; } }
      if(hit){ hit.kind='EQ'; hit.name='EQL'; hit.price=Math.min(hit.price,pv.price); hit.cnt++; hit.born=BI; }
      else addLv({side:-1,price:pv.price,i:pv.i,born:BI,kind:'EXT',name:'ExtL'}); }
    if(XH.length&&q.close>XH[XH.length-1].price) bias=1; else if(XL.length&&q.close<XL[XL.length-1].price) bias=-1;
    // age out stale swing levels
    if(k%10===0){ let nx=0; for(let j=levels.length-1;j>=0;j--){ const lv=levels[j]; if(lv.kind==='EXT'||lv.kind==='EQ'){ nx++; if(nx>40||BI-lv.born>12000) dropLv(lv); } } } };

  // ---- setups
  const endSetup=(S,why,quiet)=>{ if(S.done) return; S.done=true; S.dead=true; S.endI=BI; S.why=why; ST[S.dir]=null; if(!quiet) ev('invalid',S.dir,'Setup invalidated: '+why,{sid:S.id}); };
  const classify=(S,ok)=>{ S.cls=S.kind==='EQ'?'STOP HUNT':(ok?'GENUINE SWEEP':'LIQ GRAB'); S.clsI=BI; };
  const newSetup=(pd,q)=>{ const dir=pd.dir, bull=dir>0, B=CF.bars, k=q.idx; const old=ST[dir]; if(old&&!old.done) return null;
    const S={id:++sid,dir:dir,lv:pd.lv,ext:pd.ext,extI:pd.extI,extBar:pd.extBar,rcBar:k,rcI:BI,t:c[BI].time,stage:'swept',kind:pd.lv.kind,cls:null,clsI:-1,
      disp:null,cisd:null,mss:null,intSw:null,intOk:null,intT:[],intN:0,ready:null,end:k+p.confWin,cisdLv:null,cisdI:0,mssRef:null,mssI:0,done:false,dead:false,trade:null,why:''};
    // CISD origin: the opposing-colour candle sequence that delivered price into the sweep
    let j=pd.extBar; const isOpp=r=>bull?r.close<r.open:r.close>r.open; if(!isOpp(B[j])) j--;
    let last=j, first=j, cnt=0; while(j>=0&&cnt<12&&isOpp(B[j])){ first=j; cnt++; j--; }
    if(cnt===0){ S.cisdLv=B[pd.extBar].open; S.cisdI=B[pd.extBar].i0; }
    else { const fo=B[first], lo=B[last];
      S.cisdLv=p.cisdMode==='Last Opposing Candle Open'?lo.open:p.cisdMode==='Sequence Midpoint'?(fo.open+lo.close)/2:fo.open; S.cisdI=fo.i0; }
    // MSS / BOS reference: the last swing that was left behind before the sweep extreme
    const P=bull?MH:ML; let ref=null; for(let q2=P.length-1;q2>=0;q2--){ if(P[q2].pb<pd.extBar){ ref=P[q2]; break; } }
    if(ref){ S.mssRef=ref.price; S.mssI=ref.i; } else { let v=bull?-Infinity:Infinity, vi=B[Math.max(0,pd.extBar-6)].i0; for(let z=Math.max(0,pd.extBar-6);z<pd.extBar;z++){ if(bull?B[z].high>v:B[z].low<v){ v=bull?B[z].high:B[z].low; vi=bull?B[z].hiI:B[z].loI; } } S.mssRef=isFinite(v)?v:B[pd.extBar].close; S.mssI=vi; }
    ST[dir]=S; D.sw.push(S); lastS=S;
    ev('sweep',dir,(bull?'Bullish':'Bearish')+' sweep of '+pd.lv.name+' '+lxF(pd.lv.price),{sid:S.id,price:pd.lv.price});
    return S; };
  const stepInt=(S,q)=>{ if(intEff==='Off'||!S.disp||S.intOk) return; const bull=S.dir>0, B=CF.bars, k=q.idx, P=bull?IL:IH;
    for(;S.intN<P.length;S.intN++){ const pv=P[S.intN]; if(pv.pb>=S.disp.bar&&(bull?pv.price>S.ext:pv.price<S.ext)) S.intT.push({price:pv.price,pb:pv.pb,i:pv.i,st:0,n0:0}); }
    S.intT.forEach(t=>{ if(t.st===2||t.st===-1||S.intSw) return;
      if(t.st===0&&(bull?q.low<t.price:q.high>t.price)){ t.st=1; t.n0=k; }
      if(t.st===1){ if(bull?q.close>t.price:q.close<t.price){ t.st=2; S.intSw={bar:k,i:BI,price:t.price,pb:t.pb,pi:t.i,tgt:t}; ev('intsweep',S.dir,(bull?'Bullish':'Bearish')+' internal liquidity swept '+lxF(t.price),{sid:S.id,price:t.price}); } else if(k-t.n0>=p.reclaim) t.st=-1; } });
    if(S.intSw&&!S.intOk&&k>=S.intSw.bar){ let ref=bull?-Infinity:Infinity; for(let z=S.intSw.pb;z<S.intSw.bar;z++){ ref=bull?Math.max(ref,B[z].high):Math.min(ref,B[z].low); }
      const d2=dispDir(B,k)===S.dir, st2=k>S.intSw.bar&&(bull?q.close>ref:q.close<ref);
      if(d2||st2) S.intOk={bar:k,i:BI,by:d2?'displacement':'structure'}; } };
  const stepSetup=(S,q)=>{ if(S.done) return; const k=q.idx, bull=S.dir>0, B=CF.bars;
    if(k>S.extBar&&(bull?q.close<S.ext:q.close>S.ext)){ if(!S.cls) classify(S,false); return endSetup(S,'price closed beyond the sweep extreme'); }
    if(!S.disp&&k>=S.extBar){ if(dispDir(B,k)===S.dir){ S.disp={bar:k,i:BI,hi:q.high,lo:q.low}; D.dp.push({S:S,i:q.i1,hi:q.high,lo:q.low,dir:S.dir}); ev('disp',S.dir,(bull?'Bullish':'Bearish')+' displacement',{sid:S.id}); } }
    if(!S.cisd&&k>=S.extBar&&(bull?q.close>S.cisdLv:q.close<S.cisdLv)){ S.cisd={bar:k,i:BI}; ev('cisd',S.dir,(bull?'Bullish':'Bearish')+' CISD confirmed at '+lxF(S.cisdLv),{sid:S.id,price:S.cisdLv}); }
    if(!S.mss&&k>S.extBar&&(bull?q.close>S.mssRef:q.close<S.mssRef)){ S.mss={bar:k,i:BI}; ev('mss',S.dir,(bull?'Bullish':'Bearish')+' MSS/BOS confirmed at '+lxF(S.mssRef),{sid:S.id,price:S.mssRef}); }
    stepInt(S,q);
    if(!S.ready&&S.disp&&(S.cisd||!p.reqCisd)&&(S.mss||!p.reqMss)){ S.ready={bar:k,i:BI}; S.stage='armed'; S.end=k+p.armBars; classify(S,true); }
    else if(!S.ready&&k>=S.end){ classify(S,false); endSetup(S,'not confirmed in time (displacement / CISD / MSS)'); }
    else if(S.ready&&k>=S.end) endSetup(S,'entry window expired'); };

  // ---- 5m: sweeps, classification, displacement, CISD, MSS, internal liquidity
  const onCF=q=>{ const B=CF.bars, k=q.idx, atr=q.atr, tolA=p.minSweep*atr;
    pivot(B,k,p.intLen,IH,IL); pivot(B,k,p.mssLen,MH,ML);
    // pierces of active levels this bar
    const hit={'1':[],'-1':[]};
    for(const lv of levels){ if(lv.sw>=0||lv.end>=0||!lvOn(lv)||BI<=lv.born&&lv.kind!=='PD'&&lv.kind!=='SES'&&lv.kind!=='PS') continue;
      if(lv.side<0){ if(q.low<lv.price-tolA) hit['1'].push(lv); } else if(q.high>lv.price+tolA) hit['-1'].push(lv); }
    [1,-1].forEach(dir=>{ const hs=hit[dir]; if(!hs.length) return;
      hs.sort((a,b)=>(RANK[b.kind]-RANK[a.kind])||(dir>0?a.price-b.price:b.price-a.price)); const main=hs[0];
      hs.forEach(l=>{ l.sw=BI; });
      const ex=pend.find(x=>!x.done&&x.dir===dir);
      if(ex){ if((RANK[main.kind]||0)>(RANK[ex.lv.kind]||0)) ex.lv=main; ex.all=ex.all.concat(hs); }
      else pend.push({dir:dir,lv:main,all:hs,ext:dir>0?q.low:q.high,extI:dir>0?q.loI:q.hiI,extBar:k,start:k,done:false,dB:false}); });
    for(const pd of pend){ if(pd.done) continue; const bull=pd.dir>0;
      if(pd.start<k&&(bull?q.low<pd.ext:q.high>pd.ext)){ pd.ext=bull?q.low:q.high; pd.extI=bull?q.loI:q.hiI; pd.extBar=k; }
      if(dispDir(B,k)===-pd.dir) pd.dB=true;
      const back=bull?q.close>pd.lv.price:q.close<pd.lv.price;
      if(back){ pd.done=true; newSetup(pd,q); }
      else if(k-pd.start>=p.reclaim-1){ pd.done=true; const beyond=bull?pd.lv.price-q.close:q.close-pd.lv.price;
        if(beyond>=p.brkAtr*atr&&pd.dB){ D.bk.push({dir:-pd.dir,lv:pd.lv,i:q.i1,price:q.close,ext:pd.ext,extI:pd.extI}); } } }
    for(let z=pend.length-1;z>=0;z--) if(pend[z].done) pend.splice(z,1);
    // internal pivots swept (liquidity grabs of minor liquidity; shown only if enabled)
    if(p.showGrab){ [[IL,1],[IH,-1]].forEach(a=>{ const P=a[0], d2=a[1]; for(let z=P.length-1;z>=Math.max(0,P.length-6);z--){ const pv=P[z]; if(pv.sw>=0||pv.ci>=BI) continue;
        if(d2>0?q.low<pv.price-tolA:q.high>pv.price+tolA){ pv.sw=BI; if(d2>0?q.close>pv.price:q.close<pv.price) D.gb.push({dir:d2,price:pv.price,i:q.i1,ext:d2>0?q.low:q.high,extI:d2>0?q.loI:q.hiI}); } } }); }
    [IH,IL].forEach(P=>{ for(let z=P.length-1;z>=Math.max(0,P.length-30);z--){ const pv=P[z]; if(pv.sw<0&&(P===IH?q.high>pv.price:q.low<pv.price)&&BI>pv.ci) pv.sw=BI; } });
    // setups
    [1,-1].forEach(dir=>{ const S=ST[dir]; if(S&&!S.done) stepSetup(S,q); });
    // trend tracking for continuation entries
    [1,-1].forEach(dir=>{ const T=TR[dir]; if(!T||!T.active) return; const bull=dir>0;
      if(q.i0>T.firstI){ if(T.hh===null) T.hh=bull?q.high:q.low; else { if(bull?q.close>T.hh:q.close<T.hh) T.bos=true; T.hh=bull?Math.max(T.hh,q.high):Math.min(T.hh,q.low); } }
      if(bull?q.close<T.ext:q.close>T.ext) T.active=false; });
    levels=levels.filter(l=>l.sw<0&&l.end<0); };

  // ---- trade construction (SL / TP1-3 / risk-to-reward)
  const mkTrade=(dir,e,zone,S,cont,gs)=>{ const bull=dir>0, E=EN.bars, ent=e.close, cB=CF.bars, cL=LQ.bars;
    const a5=cB.length?cB[cB.length-1].atr:e.atr, a15=cL.length?cL[cL.length-1].atr:a5, buf=p.slBuf*a5; let basis;
    if(cont){ const P=bull?IL:IH; let sw=null; for(let j=P.length-1;j>=0;j--){ if(bull?P[j].price<ent:P[j].price>ent){ sw=P[j].price; break; } }
      basis=bull?Math.min(sw===null?zone.bot:sw,zone.bot):Math.max(sw===null?zone.top:sw,zone.top); }
    else if(p.slBasis==='Entry Swing'){ let lo=Infinity,hi=-Infinity; for(let j=Math.max(0,(zone.eb==null?e.idx:zone.eb)-2);j<=e.idx;j++){ lo=Math.min(lo,E[j].low); hi=Math.max(hi,E[j].high); } basis=bull?lo:hi; }
    else basis=S.ext;
    const sl=bull?basis-buf:basis+buf; if(bull?sl>=ent:sl<=ent) return null; const R=Math.abs(ent-sl);
    if(R<0.15*a5||R>p.maxRisk*a15) return null;
    const ds=bull?1:-1, dist=v=>Math.abs(v-ent), fx=r=>ent+ds*r*R, beyond=v=>bull?v>ent:v<ent;
    let tp1=fx(p.r1), tp2=fx(p.r2), tp3=fx(p.r3); const src=['R','R','R'];
    if(p.tpMode==='Liquidity'){
      const P=bull?IH:IL; let best=null; P.forEach(pv=>{ if(pv.sw<0&&beyond(pv.price)&&dist(pv.price)>=p.tp1Min*R&&(best===null||dist(pv.price)<dist(best))) best=pv.price; });
      if(best!==null){ tp1=best; src[0]='INT'; }
      let b2=null, s2=''; levels.forEach(lv=>{ if(lv.side===(bull?1:-1)&&(lv.kind==='PD'||lv.kind==='SES'||lv.kind==='PS')&&beyond(lv.price)&&dist(lv.price)>dist(tp1)+0.25*R&&(b2===null||dist(lv.price)<dist(b2))){ b2=lv.price; s2=lv.name; } });
      SES.forEach(Q=>{ if(Q.mid!==null&&beyond(Q.mid)&&dist(Q.mid)>dist(tp1)+0.25*R&&(b2===null||dist(Q.mid)<dist(b2))){ b2=Q.mid; s2=Q.k+'-MID'; } });
      if(b2!==null){ tp2=b2; src[1]=s2; } else if(!(dist(tp2)>dist(tp1)+0.25*R)) tp2=ds>0?Math.max(tp2,tp1+0.25*R):Math.min(tp2,tp1-0.25*R);
      if(p.tp3Mode==='External Liquidity'){ let b3=null, s3=''; levels.forEach(lv=>{ if(lv.side===(bull?1:-1)&&(lv.kind==='EXT'||lv.kind==='EQ'||lv.kind==='PD'||lv.kind==='SES'||lv.kind==='PS')&&beyond(lv.price)&&dist(lv.price)>dist(tp2)+0.25*R&&(b3===null||dist(lv.price)<dist(b3))){ b3=lv.price; s3=lv.name; } });
        if(b3!==null){ tp3=b3; src[2]=s3; } }
    }
    if(!(dist(tp2)>dist(tp1))){ tp2=ds>0?tp1+0.25*R:tp1-0.25*R; }
    if(!(dist(tp3)>dist(tp2))){ tp3=ds>0?Math.max(fx(p.r3),tp2+0.25*R):Math.min(fx(p.r3),tp2-0.25*R); src[2]='R'; }
    const rr=[dist(tp1)/R,dist(tp2)/R,dist(tp3)/R];
    if(rr[1]<p.minRR) return null;
    if(cont){ let near=null; levels.forEach(lv=>{ if(lv.side===(bull?1:-1)&&(lv.kind==='EXT'||lv.kind==='EQ'||lv.kind==='PD'||lv.kind==='SES')&&beyond(lv.price)&&(near===null||dist(lv.price)<dist(near))) near=lv.price; });
      if(near!==null&&dist(near)<p.contRR*R) return null; }
    let cls='CONT'; if(!cont){ cls=(S.intOk&&intEff!=='Off')?'A+':(S.cisd&&S.mss)?'A':'B'; }
    return {id:++tid,dir:dir,entryI:BI,time:c[BI].time,entry:ent,sl:sl,tp:[tp1,tp2,tp3],src:src,rr:rr,risk:R,model:zone.k,zone:zone.k==='MKT'?null:zone,cls:cls,cont:cont,ses:gs.k,sesKey:gs.key,sid:S?S.id:0,S:S,
      rem:1,R:0,hit:0,hitI:[],be:false,closed:false,exitI:-1,exitP:0,res:'',slNow:sl,wr:F1*rr[0]+F2*rr[1]+(1-F1-F2)*rr[2]}; };

  // ---- entry timeframe: FVG / IFVG / OB zones and the entry triggers
  const addZ=(k,dir,top,bot,e,rel)=>{ const z={k:k,dir:dir,top:top,bot:bot,eb:e.idx,formI:BI,live:true,endI:-1,rel:rel||0,used:false,mit:false}; Z.push(z); D.zn.push(z); if(Z.length>160){ Z.shift(); } return z; };
  const relS=(dir)=>{ const S=ST[dir]; return S&&!S.done?S.id:0; };
  const trig=(z,e,bull)=>{ const mid=(z.top+z.bot)/2; return bull?(e.low<=z.top&&e.close>z.bot&&e.close>=mid&&e.close>e.open):(e.high>=z.bot&&e.close<z.top&&e.close<=mid&&e.close<e.open); };
  const gate=()=>{ const gs=sigSes(c[BI].time); if(!gs) return null; if((sigCnt[gs.key]||0)>=p.maxSig) return null; return gs; };
  const openTrade=(t)=>{ D.tr.push(t); openT.push(t); lastT=t; sigCnt[t.sesKey]=(sigCnt[t.sesKey]||0)+1;
    ev('entry',t.dir,(t.dir>0?'BUY ':'SELL ')+(t.cont?'continuation ':'')+t.cls+' @ '+lxF(t.entry)+'  SL '+lxF(t.sl)+'  TP1 '+lxF(t.tp[0])+'  TP3 '+lxF(t.tp[2])+'  RR '+t.rr[1].toFixed(1),{tid:t.id,price:t.entry}); };
  const tryEntry=(S,e)=>{ if(S.done||!S.ready||BI<S.ready.i) return; const bull=S.dir>0;
    if(intEff==='Required'&&!S.intOk) return;
    const cls=(S.intOk&&intEff!=='Off')?'A+':(S.cisd&&S.mss)?'A':'B'; if(QR[cls]<minQ) return;
    const gs=gate(); if(!gs) return; let zone=null;
    if(p.entry==='Market after MSS/BOS'){ zone={k:'MKT',top:e.close,bot:e.close,eb:e.idx}; }
    else { const wk=p.entry==='FVG'?'FVG':p.entry==='Order Block'?'OB':'IFVG';
      for(let j=Z.length-1;j>=0;j--){ const z=Z[j]; if(!z.live||z.used||z.dir!==S.dir||z.k!==wk||z.eb>=e.idx||z.formI<S.extI) continue; if(BI<=S.ready.i) continue; if(trig(z,e,bull)){ zone=z; break; } } }
    if(!zone) return; const t=mkTrade(S.dir,e,zone,S,false,gs); if(!t) return;
    if(zone.k!=='MKT') zone.used=true; S.done=true; S.stage='traded'; S.trade=t; S.endI=BI; ST[S.dir]=null;
    TR[S.dir]={dir:S.dir,first:t,firstI:BI,active:true,n:0,hh:null,bos:false,ext:S.ext}; TR[-S.dir]=null; openTrade(t); };
  const tryCont=(T,e)=>{ if(!p.cont||!T.active||T.n>=p.maxCont||!T.bos||T.first.closed&&T.first.res==='SL') return; const bull=T.dir>0;
    const gs=gate(); if(!gs) return; let zone=null;
    for(let j=Z.length-1;j>=0;j--){ const z=Z[j]; if(!z.live||z.used||z.dir!==T.dir||z.k!=='FVG'||z.eb>=e.idx||z.formI<=T.firstI) continue; if(trig(z,e,bull)){ zone=z; break; } }
    if(!zone) return; const t=mkTrade(T.dir,e,zone,null,true,gs); if(!t) return; t.sid=T.first.sid; zone.used=true; T.n++; openTrade(t); };
  const onEN=e=>{ const E=EN.bars, k=e.idx, atr=e.atr;
    [1,-1].forEach(dir=>{ const S=ST[dir]; if(S&&S.ready&&!S.done) tryEntry(S,e); const T=TR[dir]; if(T&&T.active) tryCont(T,e); });
    // zone life: inversion (IFVG), mitigation, expiry
    for(let j=Z.length-1;j>=0;j--){ const z=Z[j]; if(!z.live||z.eb>=k) continue;
      if(k-z.eb>p.zoneLife){ z.live=false; z.endI=BI; continue; }
      if(z.k==='FVG'){ const inv=z.dir>0?e.close<z.bot:e.close>z.top;
        if(inv){ z.live=false; z.endI=BI; if(p.ifvg){ const nd=-z.dir, rl=relS(nd); const iz=addZ('IFVG',nd,z.top,z.bot,e,rl); if(rl){ const S=ST[nd]; if(S&&BI>=S.extI) ev('ifvg',nd,(nd>0?'Bullish':'Bearish')+' IFVG formed '+lxF(z.bot)+' - '+lxF(z.top),{sid:S.id,price:(z.top+z.bot)/2}); } } }
        else if(z.dir>0?e.low<=z.bot:e.high>=z.top){ z.live=false; z.mit=true; z.endI=BI; } }
      else if(z.k==='IFVG'||z.k==='OB'){ if(z.dir>0?e.close<z.bot:e.close>z.top){ z.live=false; z.endI=BI; } } }
    // new zones on this bar
    if(k>=2){ const b2=E[k-2];
      if(e.low>b2.high&&e.low-b2.high>=p.fvgMin*atr) addZ('FVG',1,e.low,b2.high,e,relS(1));
      if(e.high<b2.low&&b2.low-e.high>=p.fvgMin*atr) addZ('FVG',-1,b2.low,e.high,e,relS(-1)); }
    const dd=dispDir(E,k); if(dd!==0&&k>=3){ for(let j=k-1;j>=Math.max(0,k-4);j--){ const r=E[j]; if(dd>0?r.close<r.open:r.close>r.open){ const top=Math.max(r.open,r.close), bot=Math.min(r.open,r.close); if(top-bot>0) addZ('OB',dd,top,bot,e,relS(dd)); break; } } } };

  // ---- open trade management on each closed bar (SL checked first: conservative when SL and TP share a bar)
  const simTrades=i=>{ const b=c[i]; for(let z=openT.length-1;z>=0;z--){ const t=openT[z]; if(i<=t.entryI) continue; const bull=t.dir>0;
      if(bull?b.low<=t.slNow:b.high>=t.slNow){ const r=(bull?t.slNow-t.entry:t.entry-t.slNow)/t.risk; t.R+=t.rem*r; t.rem=0; t.closed=true; t.exitI=i; t.exitP=t.slNow;
        t.res=t.hit>0?('TP'+t.hit+(t.be?' +BE':' +SL')):'SL'; BI=i; ev('sl',t.dir,'Stop loss hit'+(t.be?' (breakeven)':'')+' @ '+lxF(t.slNow),{tid:t.id,price:t.slNow}); openT.splice(z,1); continue; }
      for(let j=t.hit;j<3;j++){ const L=t.tp[j]; if(!(bull?b.high>=L:b.low<=L)) break;
        const take=j===0?F1:j===1?F2:t.rem; const tk=Math.min(t.rem,take); t.R+=tk*t.rr[j]; t.rem-=tk; t.hit=j+1; t.hitI.push(i); BI=i;
        ev('tp'+(j+1),t.dir,'Take profit '+(j+1)+' hit @ '+lxF(L),{tid:t.id,price:L});
        if(j===0&&p.be){ t.slNow=t.entry; t.be=true; }
        if(j===2||t.rem<=1e-9){ t.closed=true; t.exitI=i; t.exitP=L; t.res='TP'+t.hit; openT.splice(z,1); break; } } } };

  // ---------------------------------------------------------------- main pass
  const out=[];
  for(let i=0;i<m;i++){ BI=i; const b=c[i];
    sesTrack(i); simTrades(i); BI=i;
    out.length=0; LAYS.forEach(L=>L.feed(i,b,out));
    const by={}; out.forEach(o=>{ (by[o.sec]||(by[o.sec]=[])).push(o.q); });
    if(by[sLq]) by[sLq].forEach(onLQ);
    if(by[sCf]) by[sCf].forEach(onCF);
    if(by[sEn]) by[sEn].forEach(onEN); }
  BI=m-1;

  // ---------------------------------------------------------------- statistics (closed trades) + dashboard state
  const cl=D.tr.filter(t=>t.closed).sort((a,b)=>a.exitI-b.exitI);
  const agg=arr=>{ let w=0,l=0,be=0,gw=0,gl=0,net=0; arr.forEach(t=>{ net+=t.R; if(t.R>1e-9){ w++; gw+=t.R; } else if(t.R<-1e-9){ l++; gl-=t.R; } else be++; });
    return {n:arr.length,w:w,l:l,be:be,wr:(w+l)?w/(w+l)*100:0,net:net,pf:gl>0?gw/gl:(gw>0?Infinity:0)}; };
  const tot=agg(cl); let cum=0,pk=0,dd=0; cl.forEach(t=>{ cum+=t.R; pk=Math.max(pk,cum); dd=Math.max(dd,pk-cum); });
  tot.dd=dd; tot.avgRR=cl.length?cl.reduce((a,t)=>a+t.wr,0)/cl.length:0; tot.avgR=cl.length?tot.net/cl.length:0;
  tot.ses={A:agg(cl.filter(t=>t.ses==='A')),L:agg(cl.filter(t=>t.ses==='L')),N:agg(cl.filter(t=>t.ses==='N'))};
  tot.cls={'A+':agg(cl.filter(t=>t.cls==='A+')),'A':agg(cl.filter(t=>t.cls==='A')),'B':agg(cl.filter(t=>t.cls==='B')),'CONT':agg(cl.filter(t=>t.cls==='CONT'))};
  tot.open=D.tr.filter(t=>!t.closed).length; D.st=tot; D.m=m;
  D.tr.forEach(t=>{ t.live=!t.closed||(m-1-t.entryI)<=p.liveBars; });
  // dashboard snapshot (state at the newest closed bar)
  const lastC=c[m-1].close, nowT=c[n0-1].time, off=lxOff(tz,nowT), mn=Math.floor(nowT/60)+off, lm=((mn%1440)+1440)%1440;
  let up=null, dn=null; levels.forEach(lv=>{ if(!(lv.kind==='EXT'||lv.kind==='EQ'||lv.kind==='PD'||lv.kind==='SES'||lv.kind==='PS')) return; if(lv.price>lastC){ if(!up||lv.price<up.price) up=lv; } else if(!dn||lv.price>dn.price) dn=lv; });
  const act=ST[1]&&!ST[1].done?ST[1]:ST[-1]&&!ST[-1].done?ST[-1]:null, S0=act||lastS;
  const inS=SES.filter(Q=>lxIn(lm,Q.s,Q.e)).map(Q=>Q.nm+(Q.on?'':' (off)'));
  D.ds={bias:act?act.dir:bias,up:up,dn:dn,S:S0,act:!!act,T:lastT,ses:inS.length?inS.join(' + '):'Off-session',lastC:lastC,clock:lxClock(tz,nowT),
        lv:levels.filter(l=>l.sw<0&&l.end<0&&lvOn(l)),intEff:intEff};
  D.int=[]; IH.slice(-30).forEach(v=>{ if(v.sw<0) D.int.push({side:1,price:v.price,i:v.i}); }); IL.slice(-30).forEach(v=>{ if(v.sw<0) D.int.push({side:-1,price:v.price,i:v.i}); });
  if(D.zn.length>4000) D.zn=D.zn.slice(-4000);
  D.ok=true; return D; }

let lxKey='', lxVal=null;
function lxGet(c,p){ const n=c.length, k=n+'|'+(n>2?c[n-2].time+'|'+c[n-2].close+'|'+c[0].time:'')+'|'+JSON.stringify(p);
  if(k!==lxKey){ lxKey=k; try{ lxVal=lxCompute(c,p); }catch(e){ console.error('lsa compute',e); lxVal={ok:false,n:n,lv:[],sw:[],zn:[],tr:[],ev:[],gb:[],bk:[],dp:[],st:null,ds:null,info:null}; } }
  return lxVal; }


const KINDS_BASE={entry:1,sl:1,tp1:1,tp2:1,tp3:1}, KINDS_ALL={entry:1,sl:1,tp1:1,tp2:1,tp3:1,sweep:1,disp:1,cisd:1,mss:1,intsweep:1,ifvg:1,invalid:1};
const ENTRY_MODELS=['IFVG','FVG','Order Block','Market after MSS/BOS'], QUALS=['B','A','A+'];
const nf=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1000?v.toFixed(2):Math.abs(v)>=100?v.toFixed(3):Math.abs(v)>=1?v.toFixed(4):v.toPrecision(4);
// w = {symbol, interval:'1m', tool:'lsa', opts:{entry, minQ, all, any}}   c = 1m candles [{time,open,high,low,close,volume}] oldest first, last one still forming
function events(w,c){
  const o=w.opts||{}, p=Object.assign({},LX_DEF,{entry:ENTRY_MODELS.indexOf(o.entry)<0?'IFVG':o.entry,minQ:QUALS.indexOf(o.minQ)<0?'A':o.minQ});
  if(o.any){ p.asiaOn=false; p.lonOn=false; p.nyOn=false; }
  const D=lxCompute(c,p); if(!D.ok) return [];
  const want=o.all?KINDS_ALL:KINDS_BASE, sym=w.symbol, out=[];
  D.ev.forEach(e=>{ if(!want[e.k]||e.i<D.m-3) return;
    const key=sym+'|lsa|'+e.k+'|'+e.t+'|'+(e.tid||e.sid||0); let title, body;
    if(e.k==='entry'){ const t=D.tr.find(x=>x.id===e.tid); if(!t) return;
      title=(t.dir>0?'\uD83D\uDFE2 BUY ':'\uD83D\uDD34 SELL ')+(t.cont?'CONT ':'')+t.cls+' \u00b7 Liquidity Sweep Pro '+sym;
      body='Entry '+nf(t.entry)+' \u00b7 SL '+nf(t.sl)+' \u00b7 TP1 '+nf(t.tp[0])+' \u00b7 TP2 '+nf(t.tp[1])+' \u00b7 TP3 '+nf(t.tp[2])+' \u00b7 RR 1:'+t.rr[1].toFixed(1)+' (TP2) \u00b7 '+(t.cont?'continuation':t.model)+(t.ses&&t.ses!=='-'?' \u00b7 '+({A:'Asian',L:'London',N:'New York'}[t.ses]):''); }
    else if(e.k==='sl'){ title='\uD83D\uDED1 Liquidity Sweep Pro stop hit '+sym; body=e.msg; }
    else if(/^tp/.test(e.k)){ title='\u2705 Liquidity Sweep Pro '+e.k.toUpperCase()+' hit '+sym; body=e.msg; }
    else { title='\uD83D\uDFE0 Liquidity Sweep Pro '+sym; body=e.msg; }
    out.push({key:key,title:title,body:body}); });
  return out; }
module.exports={events:events,compute:lxCompute,DEF:LX_DEF};
