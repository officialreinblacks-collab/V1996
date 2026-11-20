'use strict';
// ise-engine.js - server copy of ICT Structure Engine (IND.ise in tool10.html): same rules, so the phone push, the email, Telegram and the chart agree.
// Used by server.js for watches with tool:'ise'. Works on the chart timeframe candles (about 500) and decides on CLOSED candles only.
// If you change the rules in tool10.html, copy them here too.
const IS_TZ=['America/New_York','UTC','Europe/London','Europe/Berlin','Asia/Dubai','Asia/Tokyo','Australia/Sydney','Africa/Lagos','America/Chicago','America/Los_Angeles'];
const IS_T=[]; for(let h=0;h<24;h++){ const s=(h<10?'0':'')+h; IS_T.push(s+':00'); IS_T.push(s+':30'); }
const IS_TF=['1m','3m','5m','15m','30m','1h','2h','4h','6h','12h','1d','1w'];
const IS_DEF={
  extLen:10, intLen:3, breakBy:'Close', showExt:true, showInt:false, showSw:true,
  htfOn:true, htfTf:'4h', htfLen:5, htfShow:true,
  obOn:true, obFrom:'External', obEdge:'Body', obMaxAtr:1.5, obNeedImb:false, obMinScore:0, obMit:'Close', obBreaker:true, obMax:4, obKeep:false, obMid:true,
  fvgOn:true, fvgMin:0.2, fvgFill:'Full', fvgShrink:true, fvgMax:5,
  liqOn:true, liqLen:5, eqTol:0.1, liqSingle:false, liqMax:6,
  rbOn:true, rbWick:0.5, rbMax:3, pbOn:true, pbConf:3, pbMax:3,
  keyDay:true, keyWeek:true, sessLiq:true, keyMo:true,
  kzShow:true, asiaOn:true, asiaS:'20:00', asiaE:'00:00', lonOn:true, lonS:'02:00', lonE:'05:00', nyamOn:true, nyamS:'07:00', nyamE:'10:00', nypmOn:true, nypmS:'13:30', nypmE:'16:00',
  tz:'America/New_York', timeFilter:'Killzones', showSb:false,
  biasOn:true, biasFilter:'Off', judasOn:true, judasS:'00:00', judasE:'05:00', judasSweep:true,
  sdShow:true, sdLevels:'1, 2, 2.5',
  setupOn:true, setupWin:20, setupTtl:30, dispReq:true, entryArray:'FVG first', entryFilter:'Discount / Premium',
  pdOn:true, oteOn:true,
  showSig:true, showSetupLbl:true, showSweepLbl:true, showZoneText:true, zoneTr:85,
  preset:'Balanced', slMode:'Wick-Anchored', tpMode:'R-Multiples', atrRisk:14, slMult:1.5, tp1:1, tp2:2, tp3:3, be:true, beOff:0, showSlTp:true, showPast:true,
  dash:true, dashPos:'Top Right', dashSize:'Small', showMkt:true, showIct:true, showTrd:true, showStat:true, statsPeriod:'All-Time',
  cBull:'#00e676', cBear:'#ff5252', cFvgBull:'#2962ff', cFvgBear:'#ff9800', cOte:'#f9a825', cRbBull:'#00bfa5', cRbBear:'#f06292',
  cAsia:'#9c27b0', cLon:'#3f51b5', cNyam:'#795548', cNypm:'#607d8b',
  alSlRev:true, alTpBe:true, alStruct:true, alSetup:true, alOb:true, alMinScore:2, alFvg:false, alSweep:true, alRbPb:false, alJudas:true, alBias:false, alSound:true,
  atrLen:50, histMax:150
};
const IS_PRE={Conservative:[2.5,1,2,4],Balanced:[1.5,1,2,3],Aggressive:[1,1.5,2.5,4],Scalping:[0.8,0.8,1.5,2]};
const IS_MS=86400000;
const isRgba=(hex,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return 'rgba(128,128,128,'+a+')'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const isHM=s=>{ const m=/^(\d+):(\d+)$/.exec(s||''); return m?(+m[1])*60+(+m[2]):0; };
const isIn=(lm,s,e)=>s===e?true:(s<e?(lm>=s&&lm<e):(lm>=s||lm<e));
const isF=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1000?v.toFixed(2):Math.abs(v)>=100?v.toFixed(3):Math.abs(v)>=1?v.toFixed(5):v.toPrecision(5);
const isFmtC={}; const isOffM=new Map();
function isOff(tz,t){ const k=Math.floor(t/3600), mk=tz+'|'+k; let v=isOffM.get(mk); if(v!==undefined) return v;
  let f=isFmtC[tz]; if(f===undefined){ try{ f=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric'}); }catch(e){ f=null; } isFmtC[tz]=f; }
  if(!f) v=0; else { const q={}; f.formatToParts(new Date(k*3600000)).forEach(x=>{ q[x.type]=+x.value; }); v=Math.round((Date.UTC(q.year,q.month-1,q.day,q.hour%24,q.minute)-k*3600000)/60000); }
  if(isOffM.size>40000) isOffM.clear(); isOffM.set(mk,v); return v; }
const isSecOf=(tf,cs)=>{ const m=/^(\d+)([mhdw])$/.exec(tf||''); let s=m?(+m[1])*({m:60,h:3600,d:86400,w:604800}[m[2]]):cs; if(s<cs) s=cs; return Math.ceil(s/cs)*cs; };
const isTfName=s=>s>=604800?(s/604800)+'w':s>=86400?(s/86400)+'d':s>=3600?(s/3600)+'h':Math.round(s/60)+'m';
function isTick(c,m){ let dec=0; for(let i=Math.max(0,m-200);i<m;i++){ for(const v of [c[i].open,c[i].high,c[i].low,c[i].close]){ const s=v.toFixed(8).replace(/0+$/,''); const d=s.length-s.indexOf('.')-1; if(d>dec) dec=d; } } return Math.pow(10,-Math.min(8,Math.max(0,dec))); }
function isRma(c,m,len){ const out=new Array(m); let prev=0,sum=0; for(let i=0;i<m;i++){ const h=c[i].high,l=c[i].low,pc=i?c[i-1].close:c[i].open; const tr=i?Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)):h-l; if(i<len){ sum+=tr; prev=sum/(i+1); } else prev=(prev*(len-1)+tr)/len; out[i]=prev; } return out; }

// ---------------------------------------------------------------- engine
function iseCompute(c,p){
  const n0=c.length, D={n:n0,ok:false,lines:[],labs:[],zones:[],kz:[],keys:[],pools:[],trades:[],ev:[],sd:null,ds:null,pd:null,htf:null,warn:null,mo:null,sb:[],m:0};
  if(n0<120) return D;
  const m=n0-1; D.m=m;                       // the last candle is still forming: only bars 0..m-1 are used
  let cs=0; for(let i=Math.max(1,m-400);i<m;i++){ const d=c[i].time-c[i-1].time; if(d>0&&(!cs||d<cs)) cs=d; }
  if(!cs) return D;
  const pre=IS_PRE[p.preset]||[+p.slMult,+p.tp1,+p.tp2,+p.tp3], effSL=pre[0], E1=pre[1], E2=pre[2], E3=pre[3];
  if(!(E1<E2&&E2<E3)){ D.warn='TP multipliers must satisfy TP1 < TP2 < TP3'; return D; }
  if(+p.intLen>=+p.extLen){ D.warn='Internal swing length must be smaller than the external swing length'; return D; }
  const sdKs=[]; String(p.sdLevels).split(',').forEach(s=>{ const t=s.replace(/\s/g,''); if(!t) return; const v=+t; if(!(v>0&&v<=10)) D.warn='SD levels: "'+t+'" is not a number between 0 and 10 (example: 1, 2, 2.5)'; else if(sdKs.indexOf(v)<0) sdKs.push(v); });
  sdKs.sort((a,b)=>a-b); if(sdKs.length>8) D.warn='SD levels: at most 8 levels are allowed';
  if(D.warn) return D;
  const tz=p.tz, htfSec=isSecOf(p.htfTf,cs), htfActive=!!p.htfOn&&htfSec>cs, kzActive=cs<=3600, intraday=cs<86400;
  const WARM=Math.max(50,+p.atrLen,+p.extLen*2+1);
  const tick=isTick(c,m), flo=v=>Math.floor(v/tick+1e-9)*tick, cel=v=>Math.ceil(v/tick-1e-9)*tick;
  const H=j=>c[j].high, L=j=>c[j].low, O=j=>c[j].open, C=j=>c[j].close;
  const aZ=isRma(c,m,+p.atrLen), aR=isRma(c,m,+p.atrRisk);
  const MN=new Array(m), LM=new Array(m), DK=new Array(m), WK=new Array(m);
  for(let i=0;i<m;i++){ const mn=Math.floor(c[i].time/60)+isOff(tz,c[i].time); MN[i]=mn; LM[i]=((mn%1440)+1440)%1440; DK[i]=Math.floor(mn/1440); WK[i]=Math.floor((DK[i]+3)/7); }
  const BULL_T='#00e676', BEAR_T='#ff5252', MUT='#9aa3b5', AMB='#ffd54f', SDC='#ce93d8', KEYC='rgba(176,190,197,.8)', SUB='rgba(154,163,181,.9)';
  const arrow=d=>d>0?'\u25B2':'\u25BC', stars=s=>'\u2605'.repeat(s)+'\u2606'.repeat(4-s);
  const fmt=v=>isF(v);
  const baseCol=(dir,isF2)=>isF2?(dir>0?p.cFvgBull:p.cFvgBear):(dir>0?p.cBull:p.cBear);
  let I=0;

  // ---- higher timeframe: closed HTF bars, trend, order blocks and dealing range; each base bar sees the last HTF bar that closed BEFORE it
  const HB=[], HS=[];
  if(htfActive){
    for(let i=0;i<m;i++){ const k=Math.floor(c[i].time/htfSec), q=HB.length?HB[HB.length-1]:null;
      if(!q||q.k!==k) HB.push({k:k,time:k*htfSec,open:c[i].open,high:c[i].high,low:c[i].low,close:c[i].close,i0:i,i1:i});
      else { if(c[i].high>q.high) q.high=c[i].high; if(c[i].low<q.low) q.low=c[i].low; q.close=c[i].close; q.i1=i; } }
    HB.forEach((q,j)=>{ q.closed=j<HB.length-1||c[q.i1].time+cs>=(q.k+1)*htfSec; });
    const hA=isRma(HB,HB.length,+p.atrLen), len=+p.htfLen;
    let hP=null,hI=null,hX=false,lP=null,lI=null,lX=false,tr=0,bTop=null,bBtm=null,bI=null,sTop=null,sBtm=null,sI=null;
    for(let k=0;k<HB.length;k++){ const q=HB[k], a=hA[k];
      if(k>=2*len){ const pb=k-len; let ih=true,il=true; for(let j=k-2*len;j<=k;j++){ if(j===pb) continue; if(j<pb?HB[j].high>=HB[pb].high:HB[j].high>HB[pb].high) ih=false; if(j<pb?HB[j].low<=HB[pb].low:HB[j].low<HB[pb].low) il=false; }
        if(ih){ hP=HB[pb].high; hI=pb; hX=false; } if(il){ lP=HB[pb].low; lI=pb; lX=false; } }
      if(hP!=null&&!hX&&q.close>hP){ hX=true; tr=1; const n=Math.max(1,Math.min(k-hI,200)); let xi=1; for(let j=1;j<=n;j++){ if(HB[k-j].low<HB[k-xi].low) xi=j; }
        const x=HB[k-xi], body=Math.max(x.open,x.close), edge=body-x.low<0.1*a?x.high:body; bTop=+p.obMaxAtr>0?Math.min(edge,x.low+p.obMaxAtr*a):edge; bBtm=x.low; bI=x.i0; }
      else if(lP!=null&&!lX&&q.close<lP){ lX=true; tr=-1; const n=Math.max(1,Math.min(k-lI,200)); let xi=1; for(let j=1;j<=n;j++){ if(HB[k-j].high>HB[k-xi].high) xi=j; }
        const x=HB[k-xi], body=Math.min(x.open,x.close), edge=x.high-body<0.1*a?x.low:body; sBtm=+p.obMaxAtr>0?Math.max(edge,x.high-p.obMaxAtr*a):edge; sTop=x.high; sI=x.i0; }
      if(bBtm!=null&&q.close<bBtm){ bTop=bBtm=bI=null; }
      if(sTop!=null&&q.close>sTop){ sTop=sBtm=sI=null; }
      HS[k]={trend:tr,bTop:bTop,bBtm:bBtm,bI:bI,sTop:sTop,sBtm:sBtm,sI:sI,hP:hP,lP:lP}; }
  }
  let hk=-1, hs=null;

  // ---- state
  const obs=[], fvgs=[], pools=[], keys=[], rbs=[], pbs=[], allZ=[];
  const sExt={hi:null,lo:null,trend:0}, sInt={hi:null,lo:null,trend:0};
  let rHi=null,rHiIdx=null,rLo=null,rLoIdx=null,seenHi=null,seenLo=null;
  let lastBuySweep=null,lastSellSweep=null,usedBuySweep=null,usedSellSweep=null,lastBuyName='',lastSellName='';
  let setZone=null,setExpire=0,setLegLo=null,setLegHi=null,setSweepName='',prevTrend=0,trendStart=null;
  let moPrice=null,moLine=null,judasState=0,judasExt=null,judasExtBar=null,judasDir=0;
  let dCur=null,dPrev=null,dPrev2=null,wCur=null,wPrev=null;
  const SES=[{nm:'Asian',on:p.asiaOn,s:isHM(p.asiaS),e:isHM(p.asiaE),col:p.cAsia},{nm:'London',on:p.lonOn,s:isHM(p.lonS),e:isHM(p.lonE),col:p.cLon},{nm:'NY AM',on:p.nyamOn,s:isHM(p.nyamS),e:isHM(p.nyamE),col:p.cNyam},{nm:'NY PM',on:p.nypmOn,s:isHM(p.nypmS),e:isHM(p.nypmE),col:p.cNypm}];
  SES.forEach(S=>{ S.act=false; S.hi=0; S.lo=0; S.start=0; S.startT=0; S.bx=null; S.hasRange=false; });
  const sAsia=SES[0], jS=isHM(p.judasS), jE=isHM(p.judasE);
  let T=null, winCount=0, lossCount=0, formStr=''; const tradeT=[], tradeW=[];
  let lastSigBar=null,lastSigDir=0,lastSigScore=0, sdDraw=null, kzNameNow='', inSbNow=false;
  let curDayBias=0;

  // ---- drawing records
  const addLine=(x0,x1,y,col,dash,w)=>{ const o={x0:x0,x1:x1,y:y,col:col,dash:dash||0,w:w||1}; D.lines.push(o); return o; };
  const addLab=(x,y,t,col,pos,sz,bg,tc,tip)=>{ D.labs.push({x:x,y:y,t:t,col:col,pos:pos||'a',sz:sz||0,bg:bg||null,tc:tc||null,tip:tip||''}); };
  const ev=(k,dir,msg)=>{ D.ev.push({k:k,dir:dir,t:c[I].time,i:I,msg:msg}); };

  // ---- structure
  const pivotAt=(len,hi)=>{ if(I<2*len) return null; const q=I-len; for(let j=I-2*len;j<=I;j++){ if(j===q) continue; if(hi?(j<q?H(j)>=H(q):H(j)>H(q)):(j<q?L(j)<=L(q):L(j)<L(q))) return null; } return hi?H(q):L(q); };
  const stepS=(S,ph,pl,len,lbl,byClose)=>{
    if(ph!=null){ if(lbl&&S.hi) addLab(I-len,ph,ph>S.hi.price?'HH':'LH',MUT,'a'); S.hi={price:ph,idx:I-len,taken:false}; }
    if(pl!=null){ if(lbl&&S.lo) addLab(I-len,pl,pl<S.lo.price?'LL':'HL',MUT,'b'); S.lo={price:pl,idx:I-len,taken:false}; }
    let upB=!!S.hi&&!S.hi.taken&&(byClose?C(I):H(I))>S.hi.price, dnB=!!S.lo&&!S.lo.taken&&(byClose?C(I):L(I))<S.lo.price;
    if(upB&&dnB){ S.hi.taken=true; S.lo.taken=true; upB=C(I)>S.hi.price; dnB=C(I)<S.lo.price; }
    let e=0;
    if(upB){ S.hi.taken=true; e=S.trend<0?2:1; S.trend=1; } else if(dnB){ S.lo.taken=true; e=S.trend>0?-2:-1; S.trend=-1; }
    return e; };
  const drawBreak=(pv,e,major)=>{ const col=e>0?BULL_T:BEAR_T, x1=Math.max(pv.idx,I-9999); addLine(x1,I,pv.price,col,major?0:1,1); addLab(Math.round((x1+I)/2),pv.price,Math.abs(e)===2?'CHoCH':'BOS',col,e>0?'a':'b',major?0:-1); };

  // ---- FVG, order block search
  const fvgAt=(dir,k)=>{ const a=I-k; if(a-2<0) return false; const gapMin=p.fvgMin*aZ[a];
    return dir>0?(L(a)>H(a-2)&&C(a-1)>H(a-2)&&L(a)-H(a-2)>=gapMin):(H(a)<L(a-2)&&C(a-1)<L(a-2)&&L(a-2)-H(a)>=gapMin); };
  const findOB=(dir,fromIdx)=>{ const n=Math.max(1,Math.min(I-fromIdx,300)); let xi=1;
    for(let j=1;j<=n&&I-j>=0;j++){ if(dir>0?L(I-j)<L(I-xi):H(I-j)>H(I-xi)) xi=j; }
    let src=xi, found=false; for(let j=xi;j<=Math.min(xi+2,n)&&I-j>=0;j++){ if(dir>0?C(I-j)<O(I-j):C(I-j)>O(I-j)){ src=j; found=true; break; } }
    const s=I-src, dist=dir>0?L(I-xi):H(I-xi);
    let prox=dir>0?(p.obEdge==='Body'?Math.max(O(s),C(s)):H(s)):(p.obEdge==='Body'?Math.min(O(s),C(s)):L(s));
    if(Math.abs(prox-dist)<0.1*aZ[I]) prox=dir>0?H(s):L(s);
    if(+p.obMaxAtr>0&&Math.abs(prox-dist)>p.obMaxAtr*aZ[I]) prox=dist+dir*p.obMaxAtr*aZ[I];
    let imb=false; for(let k=0;k<=Math.max(xi-1,0);k++){ if(fvgAt(dir,k)){ imb=true; break; } }
    let pre2=false, gone=false; for(let k=xi-1;k>=0;k--){ if(gone&&(dir>0?L(I-k)<=prox:H(I-k)>=prox)){ pre2=true; break; } gone=gone||(dir>0?L(I-k)>prox:H(I-k)<prox); }
    return {prox:prox,dist:dist,off:src,xi:xi,imb:imb,pre:pre2,found:found}; };
  const rTopF=()=>htfActive&&hs?hs.hP:rHi, rBotF=()=>htfActive&&hs?hs.lP:rLo;
  const zoneScore=(dir,top,btm,imb,liq)=>{ const rt=rTopF(), rb=rBotF(); const half=rt!=null&&rb!=null&&rt>rb&&(dir>0?(top+btm)/2<(rt+rb)/2:(top+btm)/2>(rt+rb)/2); const algn=htfActive&&hs&&hs.trend===dir; return (imb?1:0)+(liq?1:0)+(algn?1:0)+(half?1:0); };
  const newZone=(top,btm,dir,left,isFvg,score,touched,kind)=>{ const z={l:left,top:top,btm:btm,eq:(top+btm)/2,dir:dir,born:I,fvg:isFvg,score:score,breaker:false,touched:touched,setup:false,entered:false,alive:true,gone:false,kind:kind||(isFvg?1:0),pbBar:null,pbTop:0,pbBtm:0,endI:-1}; allZ.push(z); return z; };
  const retire=(z,keep)=>{ z.alive=false; z.endI=I; z.gone=!keep; };
  const trimZones=(arr,dir,maxN)=>{ let cnt=0; for(let i=arr.length-1;i>=0;i--){ const z=arr[i]; if(z.dir===dir){ cnt++; if(cnt>maxN){ retire(z,false); arr.splice(i,1); } } } };
  const overlaps=(arr,dir,top,btm)=>{ for(const z of arr){ if(z.dir===dir&&!z.breaker&&!z.touched){ const ov=Math.min(top,z.top)-Math.max(btm,z.btm); if(ov>0.5*Math.min(top-btm,z.top-z.btm)) return true; } } return false; };
  const claimSetup=(arr,dir,since)=>{ for(let i=arr.length-1;i>=0;i--){ const z=arr[i]; if(z.dir===dir&&!z.breaker&&!z.touched&&z.born>=since) return z; } return null; };
  const dropSetup=(z,why)=>{ z.setup=false; if(p.alSetup){ const msg='Setup '+arrow(z.dir)+' cancelled: '+why; ev('setup',z.dir,msg); } };
  const rng=(z)=>fmt(z.btm)+'\u2013'+fmt(z.top);

  const updateOB=()=>{
    for(let i=obs.length-1;i>=0;i--){ const z=obs[i]; if(I<=z.born) continue;
      const dist=z.dir>0?z.btm:z.top, beyond=z.dir>0?C(I)<dist:C(I)>dist;
      const broken=z.breaker?beyond:p.obMit==='50%'?(z.dir>0?C(I)<z.eq:C(I)>z.eq):p.obMit==='Wick'?(z.dir>0?L(I)<dist:H(I)>dist):beyond;
      if(broken){
        if(p.obBreaker&&!z.breaker&&beyond){ z.breaker=true; z.setup=false; z.pbBar=null; z.dir=-z.dir; z.touched=false; z.born=I; z.score=zoneScore(z.dir,z.top,z.btm,false,false); }
        else { obs.splice(i,1); retire(z,p.obKeep); }
      } else if(!z.touched&&L(I)<=z.top&&H(I)>=z.btm){
        z.touched=true;
        if(p.pbOn&&!z.breaker&&(z.dir>0?C(I)<O(I):C(I)>O(I))){ z.pbBar=I; z.pbTop=H(I); z.pbBtm=L(I); }
        if(z.setup){ z.setup=false; z.entered=true; }
        else if(p.alOb&&z.score>=p.alMinScore) ev('ob',z.dir,(z.breaker?'Breaker ':'OB ')+stars(z.score)+' '+arrow(z.dir)+' touch '+rng(z));
      } };
  };
  const updateAux=(arr,tag)=>{ for(let i=arr.length-1;i>=0;i--){ const z=arr[i]; if(I<=z.born) continue; const dist=z.dir>0?z.btm:z.top;
      if(z.dir>0?C(I)<dist:C(I)>dist){ arr.splice(i,1); retire(z,false); }
      else if(!z.touched&&L(I)<=z.top&&H(I)>=z.btm){ z.touched=true; if(p.alRbPb) ev('rbpb',z.dir,tag+' '+arrow(z.dir)+' touch '+rng(z)); } } };
  const updatePbCand=()=>{ for(const z of obs){ if(z.pbBar!=null&&!z.breaker&&I>z.pbBar){ if(I-z.pbBar>p.pbConf) z.pbBar=null; else if(z.dir>0?C(I)>z.pbTop:C(I)<z.pbBtm){ if(z.pbTop-z.pbBtm>=tick){ const q=newZone(z.pbTop,z.pbBtm,z.dir,z.pbBar,false,0,false,3); pbs.push(q); if(p.alRbPb) ev('rbpb',z.dir,'PB '+arrow(z.dir)+' '+rng(q)); } z.pbBar=null; } } } };
  const updateFvgs=()=>{ for(let i=fvgs.length-1;i>=0;i--){ const z=fvgs[i]; if(I<=z.born) continue;
      if(!z.touched&&L(I)<=z.top&&H(I)>=z.btm){ z.touched=true; if(z.setup){ if(z.dir>0?C(I)>=z.btm:C(I)<=z.top) z.entered=true; z.setup=false; } }
      let filled=false;
      if(z.dir>0){ filled=L(I)<=(p.fvgFill==='Touch'?z.top:p.fvgFill==='50%'?z.eq:z.btm); if(!filled&&p.fvgShrink&&L(I)<z.top) z.top=L(I); }
      else { filled=H(I)>=(p.fvgFill==='Touch'?z.btm:p.fvgFill==='50%'?z.eq:z.top); if(!filled&&p.fvgShrink&&H(I)>z.btm) z.btm=H(I); }
      if(filled){ fvgs.splice(i,1); retire(z,false); } } };

  // ---- liquidity: pools (EQH / EQL) and key levels
  const trimPools=side=>{ let cnt=0; for(let i=pools.length-1;i>=0;i--){ if(pools[i].side===side){ cnt++; if(cnt>p.liqMax) pools.splice(i,1); } } };
  const addPool=(price,side)=>{ const at=I-p.liqLen;
    for(const q of pools){ if(q.side===side&&Math.abs(q.price-price)<=p.eqTol*aZ[I]){ q.hits++; q.price=side>0?Math.max(q.price,price):Math.min(q.price,price); return; } }
    pools.push({price:price,side:side,hits:1,x0:at}); trimPools(side); };
  const updatePools=()=>{ let buySw=false,sellSw=false,bN='',sN='';
    for(let i=pools.length-1;i>=0;i--){ const q=pools[i];
      if(q.side>0?H(I)>q.price:L(I)<q.price){ const swept=q.side>0?C(I)<q.price:C(I)>q.price, notable=q.hits>1||p.liqSingle; pools.splice(i,1);
        if(swept){ if(q.side>0){ buySw=true; bN=q.hits>1?'EQH':'swing high'; } else { sellSw=true; sN=q.hits>1?'EQL':'swing low'; }
          if(notable&&p.alSweep) ev('sweep',q.side,'Sweep '+(q.side>0?(q.hits>1?'EQH ':'high '):(q.hits>1?'EQL ':'low '))+fmt(q.price)); }
        if(p.liqOn&&notable){ if(swept&&p.showSweepLbl) addLab(I,q.price,'Sweep',q.side>0?BEAR_T:BULL_T,q.side>0?'a':'b'); addLine(Math.max(q.x0,I-9999),I,q.price,'rgba(102,102,102,.55)',0,1); addLab(I,q.price,(q.side>0?'EQH':'EQL')+(q.hits>2?' \u00D7'+q.hits:''),SUB,'r',-1); } } }
    return {buySw:buySw,sellSw:sellSw,bN:bN,sN:sN}; };
  const setKey=(name,price,side,start)=>{ for(let i=keys.length-1;i>=0;i--){ if(keys[i].name===name) keys.splice(i,1); } keys.push({name:name,price:price,side:side,start:start,taken:false,endI:-1}); };
  const updateKeys=()=>{ let buySw=false,sellSw=false,bN='',sN='';
    for(const k of keys){ if(k.taken) continue; if(k.side>0?H(I)>k.price:L(I)<k.price){ k.taken=true; k.endI=I;
        if(k.side>0?C(I)<k.price:C(I)>k.price){ if(k.side>0){ buySw=true; bN=k.name; } else { sellSw=true; sN=k.name; }
          if(p.showSweepLbl) addLab(I,k.price,k.name+' sweep',k.side>0?BEAR_T:BULL_T,k.side>0?'a':'b');
          if(p.alSweep) ev('sweep',k.side,'Sweep '+k.name+' '+fmt(k.price)); } } }
    return {buySw:buySw,sellSw:sellSw,bN:bN,sN:sN}; };
  const nextLiq=(dir,beyond)=>{ let best=null,name=''; for(const q of pools){ if(q.side===dir&&(dir>0?q.price>beyond:q.price<beyond)&&(best==null||(dir>0?q.price<best:q.price>best))){ best=q.price; name=q.hits>1?(dir>0?'EQH':'EQL'):(dir>0?'Swing H':'Swing L'); } }
    for(const k of keys){ if(k.side===dir&&!k.taken&&(dir>0?k.price>beyond:k.price<beyond)&&(best==null||(dir>0?k.price<best:k.price>best))){ best=k.price; name=k.name; } } return [best,name]; };
  const nextSd=(dir,beyond,lo,hi)=>{ const r=hi-lo; if(!(r>0)) return [null,'']; for(const k of sdKs){ const lvl=dir>0?hi+k*r:lo-k*r; if(dir>0?lvl>beyond:lvl<beyond) return [lvl,'-'+k+' SD']; } return [null,'']; };
  const nextTarget=(dir,beyond,lo,hi)=>p.tpMode==='Liquidity'?nextLiq(dir,beyond):p.tpMode==='Std Deviations'?nextSd(dir,beyond,lo,hi):[null,''];

  // ---- setup helpers
  const legHasFvg=(dir,span)=>{ for(let k=0;k<=Math.max(span-1,0);k++){ if(fvgAt(dir,k)) return true; } return false; };
  const pickZone=(d,since)=>{ let z=null; const useF=p.fvgOn&&p.entryArray!=='OB only', useO=p.obOn&&p.entryArray!=='FVG only';
    if(p.entryArray==='FVG first'||p.entryArray==='FVG only'){ if(useF) z=claimSetup(fvgs,d,since); if(!z&&useO) z=claimSetup(obs,d,I); }
    else { if(useO) z=claimSetup(obs,d,I); if(!z&&useF) z=claimSetup(fvgs,d,since); } return z; };
  const entryCheck=(dir,legLo,legHi)=>{ let why=''; const cl=C(I);
    if(p.entryFilter==='Discount / Premium'){ const rt=rTopF(), rb=rBotF(); if(rt==null||rb==null||rt<=rb) why='PD filter not ready (no valid dealing range yet)'; else if(dir>0?cl>=(rt+rb)/2:cl<=(rt+rb)/2) why='entry outside '+(dir>0?'discount':'premium'); }
    else if(p.entryFilter==='OTE (\u2265 62%)'){ const r=legHi-legLo; if(!(r>0)) why='OTE filter not ready (invalid setup leg)'; else if(!(dir>0?cl<=legHi-0.618*r&&cl>legLo:cl>=legLo+0.618*r&&cl<legHi)) why='entry outside OTE'; }
    return why; };
  const byClose=p.breakBy==='Close', biasActive=!!p.biasOn&&intraday;
  const dayLvlOk=!!p.keyDay&&intraday, weekLvlOk=!!p.keyWeek&&cs<604800;
  const SBW=[[180,240],[600,660],[840,900]];

  // ---- trade plan
  const buildPlan=(dir,sig)=>{ const R={ok:false,why:'',sl:null,risk:null,tp1:null,tp2:null,tp3:null,tag2:'',tag3:''}; if(!dir) return R;
    const ra=aR[I], slDist=ra*effSL; if(!(slDist>0)){ R.why='ATR not ready'; return R; }
    const cl=C(I), buf=ra*0.25, minD=ra*0.5;
    const slAtr=cl-dir*slDist, slWick=dir>0?Math.min(L(I)-buf,cl-minD):Math.max(H(I)+buf,cl+minD);
    const slZone=dir>0?Math.min((sig.distal!=null?sig.distal:L(I))-buf,cl-minD):Math.max((sig.distal!=null?sig.distal:H(I))+buf,cl+minD);
    const slSwp=dir>0?Math.min((sig.sweepExt!=null?sig.sweepExt:L(I))-buf,cl-minD):Math.max((sig.sweepExt!=null?sig.sweepExt:H(I))+buf,cl+minD);
    const slRaw=p.slMode==='ATR'?slAtr:p.slMode==='Zone-Anchored'?slZone:p.slMode==='Sweep-Anchored'?slSwp:slWick;
    const sl=dir>0?flo(slRaw):cel(slRaw), risk=dir*(cl-sl); if(!(risk>0)){ R.why='invalid risk (stop within one tick)'; return R; }
    let tp1=cl+dir*risk*E1, tp2=cl+dir*risk*E2, tp3=cl+dir*risk*E3, tag2='', tag3='';
    if(p.tpMode!=='R-Multiples'){ const a=nextTarget(dir,tp1,sig.legLo,sig.legHi); if(a[0]!=null){ tag2=a[1]; tp2=a[0]; }
      const b=nextTarget(dir,tp2,sig.legLo,sig.legHi); if(b[0]!=null){ tag3=b[1]; tp3=b[0]; } else tp3=dir>0?Math.max(tp3,tp2+risk):Math.min(tp3,tp2-risk); }
    const rd=v=>dir>0?flo(v):cel(v); tp1=rd(tp1); tp2=rd(tp2); tp3=rd(tp3);
    if(dir*(tp1-cl)<=0){ R.why='TP1 within one tick of entry'; return R; }
    if(dir*(tp2-tp1)<=0||dir*(tp3-tp2)<=0){ R.why='targets collapse within one tick'; return R; }
    R.ok=true; R.sl=sl; R.risk=risk; R.tp1=tp1; R.tp2=tp2; R.tp3=tp3; R.tag2=tag2; R.tag3=tag3; return R; };
  const closeTrade=(res,win)=>{ T.endI=I; T.res=res; T.win=win; if(win) winCount++; else lossCount++; formStr=(formStr+(win?'\u25B0':'\u25B1')).slice(-10); tradeT.push(c[I].time+cs); tradeW.push(win); T=null; };

  // =============================== main pass ===============================
  for(I=0;I<m;I++){
    if(htfActive){ while(hk+1<HB.length&&HB[hk+1].closed&&HB[hk+1].i1<I) hk++; hs=hk>=0?HS[hk]:null; }
    const t=c[I].time, warmed=I>=WARM;
    let newDay=false;
    if(!dCur||DK[I]!==dCur.k){ dPrev2=dPrev; dPrev=dCur; dCur={k:DK[I],hi:H(I),lo:L(I),close:C(I)}; newDay=true; } else { dCur.hi=Math.max(dCur.hi,H(I)); dCur.lo=Math.min(dCur.lo,L(I)); dCur.close=C(I); }
    let newWeek=false;
    if(!wCur||WK[I]!==wCur.k){ wPrev=wCur; wCur={k:WK[I],hi:H(I),lo:L(I)}; newWeek=true; } else { wCur.hi=Math.max(wCur.hi,H(I)); wCur.lo=Math.min(wCur.lo,L(I)); }
    const pdh=dPrev?dPrev.hi:null, pdl=dPrev?dPrev.lo:null, pdc=dPrev?dPrev.close:null, ppdh=dPrev2?dPrev2.hi:null, ppdl=dPrev2?dPrev2.lo:null;
    let dBias=0; if(biasActive&&pdc!=null&&ppdh!=null) dBias=pdc>ppdh?1:pdc<ppdl?-1:(pdh>ppdh&&pdl<ppdl)?0:pdh>ppdh?-1:pdl<ppdl?1:0;
    curDayBias=dBias;
    const lmI=LM[I];
    const inS=SES.map(S=>kzActive&&S.on&&isIn(lmI,S.s,S.e));
    const inAny=inS.some(x=>x), inSb=kzActive&&SBW.some(w=>lmI>=w[0]&&lmI<w[1]);
    const timeOk=!kzActive||p.timeFilter==='Off'||(p.timeFilter==='Killzones'?inAny:inSb);
    const kzName=inS[0]?'Asian':inS[1]?'London':inS[2]?'NY AM':inS[3]?'NY PM':''; kzNameNow=kzName; inSbNow=inSb;
    if(p.showSb&&inSb) D.sb.push(I);
    const biasLongOk=!biasActive||p.biasFilter==='Off'||(p.biasFilter==='With bias only'?dBias===1:dBias>=0), biasShortOk=!biasActive||p.biasFilter==='Off'||(p.biasFilter==='With bias only'?dBias===-1:dBias<=0);

    // 1. levels in force at the start of this bar, then the sessions that just ended
    if(dayLvlOk&&pdh!=null&&newDay){ setKey('PDH',pdh,1,I); setKey('PDL',pdl,-1,I); }
    if(weekLvlOk&&wPrev&&newWeek){ setKey('PWH',wPrev.hi,1,I); setKey('PWL',wPrev.lo,-1,I); }
    SES.forEach((S,j)=>{ const inn=inS[j], st=inn&&!S.act, en=S.act&&!inn;
      if(st){ S.start=I; S.startT=t; S.hi=H(I); S.lo=L(I); S.hasRange=true; if(p.kzShow){ S.bx={l:I,r:I+1,top:S.hi,btm:S.lo,col:S.col,nm:S.nm}; D.kz.push(S.bx); } }
      else if(inn){ S.hi=Math.max(S.hi,H(I)); S.lo=Math.min(S.lo,L(I)); if(S.bx){ S.bx.top=S.hi; S.bx.btm=S.lo; S.bx.r=I+1; } }
      S.act=inn;
      if(en){ S.bx=null; if(p.sessLiq){ setKey(S.nm+' H',S.hi,1,S.start); setKey(S.nm+' L',S.lo,-1,S.start); } } });

    // 2. liquidity sweeps of this bar
    const lp=updatePools(), kp=updateKeys();
    if(lp.buySw||kp.buySw){ lastBuySweep=I; lastBuyName=kp.buySw?kp.bN:lp.bN; }
    if(lp.sellSw||kp.sellSw){ lastSellSweep=I; lastSellName=kp.sellSw?kp.sN:lp.sN; }
    const lph=pivotAt(+p.liqLen,true), lpl=pivotAt(+p.liqLen,false); if(lph!=null) addPool(lph,1); if(lpl!=null) addPool(lpl,-1);

    // midnight open + daily bias
    if(kzActive&&newDay){ moPrice=lmI===0?O(I):null; judasState=0; judasExt=null; judasExtBar=null; judasDir=0; moLine=null;
      if(p.keyMo&&lmI===0){ moLine=addLine(I,I+1,O(I),AMB,1,1); moLine.lab='Midnight Open'+(biasActive?' \u00B7 Bias '+(dBias>0?'\u25B2':dBias<0?'\u25BC':'\u2014'):''); D.mo=moLine; } }
    else if(p.keyMo&&kzActive&&moLine) moLine.x1=I+1;
    if(biasActive&&p.alBias&&pdh!=null&&newDay) ev('bias',dBias,'Daily bias '+(dBias>0?'\u25B2 bullish, draw on PDH '+fmt(pdh):dBias<0?'\u25BC bearish, draw on PDL '+fmt(pdl):'neutral (inside or outside day)'));

    // Judas swing
    const inJ=kzActive&&p.judasOn&&biasActive&&isIn(lmI,jS,jE);
    if(judasState===1&&dBias!==judasDir){ judasState=0; judasExt=null; judasExtBar=null; judasDir=0; }
    if(inJ&&judasState<2&&moPrice!=null&&dBias!==0){ const bull=dBias>0;
      if(bull?L(I)<moPrice:H(I)>moPrice){ if(judasExt==null||(bull?L(I)<judasExt:H(I)>judasExt)){ judasExt=bull?L(I):H(I); judasExtBar=I; } judasState=1; judasDir=dBias; }
      const asiaReady=sAsia.hasRange&&t-sAsia.startT<=86400, sw=!p.judasSweep||!p.asiaOn||(asiaReady&&(bull?judasExt<sAsia.lo:judasExt>sAsia.hi));
      if(judasState===1&&sw&&(bull?C(I)>moPrice:C(I)<moPrice)){ judasState=2; addLab(judasExtBar,bull?judasExt-0.3*aZ[I]:judasExt+0.3*aZ[I],'Judas '+(bull?'\u25B2':'\u25BC'),null,bull?'b':'a',0,'#ffb300','#1a1a1a');
        if(p.alJudas) ev('judas',dBias,'Judas Swing '+(bull?'\u25B2':'\u25BC')+' confirmed, extreme '+fmt(judasExt)); } }

    // 3. structure
    const exPH=pivotAt(+p.extLen,true), exPL=pivotAt(+p.extLen,false), inPH=pivotAt(+p.intLen,true), inPL=pivotAt(+p.intLen,false);
    const evExt=stepS(sExt,exPH,exPL,+p.extLen,!!p.showSw,byClose), evInt=stepS(sInt,inPH,inPL,+p.intLen,false,byClose);
    if(sExt.trend!==prevTrend){ prevTrend=sExt.trend; trendStart=I; }
    if(evExt!==0){ if(p.showExt) drawBreak(evExt>0?sExt.hi:sExt.lo,evExt,true); if(p.alStruct) ev('struct',evExt,(Math.abs(evExt)===2?'CHoCH ':'BOS ')+arrow(evExt)); }
    if(evInt!==0&&p.showInt&&evInt*evExt<=0) drawBreak(evInt>0?sInt.hi:sInt.lo,evInt,false);

    // 4. dealing range
    if(sExt.hi&&sExt.hi.idx!==seenHi){ seenHi=sExt.hi.idx; rHi=sExt.hi.price; rHiIdx=sExt.hi.idx; }
    if(sExt.lo&&sExt.lo.idx!==seenLo){ seenLo=sExt.lo.idx; rLo=sExt.lo.price; rLoIdx=sExt.lo.idx; }
    if(rHi!=null&&H(I)>rHi){ rHi=H(I); rHiIdx=I; } if(rLo!=null&&L(I)<rLo){ rLo=L(I); rLoIdx=I; }

    // 5. can a setup be armed
    const chUp=evExt===2||evInt===2, chDn=evExt===-2||evInt===-2;
    const armUp=!!p.setupOn&&warmed&&timeOk&&biasLongOk&&chUp&&!chDn&&lastSellSweep!=null&&lastSellSweep!==usedSellSweep&&I-lastSellSweep<=p.setupWin;
    const armDn=!!p.setupOn&&warmed&&timeOk&&biasShortOk&&chDn&&!chUp&&lastBuySweep!=null&&lastBuySweep!==usedBuySweep&&I-lastBuySweep<=p.setupWin;

    // 6. order blocks
    if(p.obOn){ updateOB(); trimZones(obs,1,+p.obMax); trimZones(obs,-1,+p.obMax);
      const e=p.obFrom==='External'?evExt:evInt;
      if(e!==0){ const dir=e>0?1:-1, pv=p.obFrom==='External'?(dir>0?sExt.hi:sExt.lo):(dir>0?sInt.hi:sInt.lo), f=findOB(dir,pv.idx);
        const top=Math.max(f.prox,f.dist), btm=Math.min(f.prox,f.dist), swp=dir>0?lastSellSweep:lastBuySweep, liq=swp!=null&&Math.abs(swp-(I-f.xi))<=2, score=zoneScore(dir,top,btm,f.imb,liq);
        const pass=f.found&&(f.imb||!p.obNeedImb)&&(score>=p.obMinScore||(dir>0?armUp:armDn))&&top-btm>=tick;
        if(pass&&!overlaps(obs,dir,top,btm)){ obs.push(newZone(top,btm,dir,I-f.off,false,score,f.pre)); trimZones(obs,dir,+p.obMax); } } }

    // propulsion blocks, rejection blocks
    if(p.pbOn){ updateAux(pbs,'PB'); if(p.obOn){ updatePbCand(); trimZones(pbs,1,+p.pbMax); trimZones(pbs,-1,+p.pbMax); } }
    if(p.rbOn){ updateAux(rbs,'RB'); const o=+p.extLen;
      if(exPH!=null&&I-o>=0){ const bTop=Math.max(O(I-o),C(I-o)), rg=H(I-o)-L(I-o);
        if(rg>0&&H(I-o)-bTop>=p.rbWick*rg&&H(I-o)-bTop>=tick&&!overlaps(obs,-1,H(I-o),bTop)){ let ph=false; for(let k=0;k<=o-1;k++){ if(H(I-k)>=bTop){ ph=true; break; } } rbs.push(newZone(H(I-o),bTop,-1,I-o,false,0,ph,2)); trimZones(rbs,-1,+p.rbMax); } }
      if(exPL!=null&&I-o>=0){ const bBot=Math.min(O(I-o),C(I-o)), rg=H(I-o)-L(I-o);
        if(rg>0&&bBot-L(I-o)>=p.rbWick*rg&&bBot-L(I-o)>=tick&&!overlaps(obs,1,bBot,L(I-o))){ let pl=false; for(let k=0;k<=o-1;k++){ if(L(I-k)<=bBot){ pl=true; break; } } rbs.push(newZone(bBot,L(I-o),1,I-o,false,0,pl,2)); trimZones(rbs,1,+p.rbMax); } } }

    // 7. fair value gaps
    if(p.fvgOn){ updateFvgs();
      if(fvgAt(1,0)){ fvgs.push(newZone(L(I),H(I-2),1,I-1,true,0,false)); trimZones(fvgs,1,+p.fvgMax); if(p.alFvg) ev('fvg',1,'FVG \u25B2 '+fmt(H(I-2))+'\u2013'+fmt(L(I))); }
      if(fvgAt(-1,0)){ fvgs.push(newZone(L(I-2),H(I),-1,I-1,true,0,false)); trimZones(fvgs,-1,+p.fvgMax); if(p.alFvg) ev('fvg',-1,'FVG \u25BC '+fmt(H(I))+'\u2013'+fmt(L(I-2))); } }

    // 8. setup (one active): first the fate of the current one, then arming a new one
    const sig={dir:0,distal:null,sweepExt:null,score:0,kind:'',sweep:'',legLo:null,legHi:null};
    if(setZone){ const z=setZone, expired=I>setExpire, opp=z.dir>0?chDn:chUp;
      if(expired){ dropSetup(z,'expired'); setZone=null; }
      else if(opp){ dropSetup(z,'opposite CHoCH'); setZone=null; }
      else if(z.entered){ const why=entryCheck(z.dir,setLegLo,setLegHi);
        if(why===''){ sig.dir=z.dir; sig.distal=z.dir>0?z.btm:z.top; sig.sweepExt=z.dir>0?setLegLo:setLegHi; sig.legLo=setLegLo; sig.legHi=setLegHi; sig.sweep=setSweepName; sig.score=z.score; sig.kind=z.fvg?'FVG':'OB'; }
        else if(p.alSetup) ev('setup',z.dir,'Setup '+arrow(z.dir)+' skipped: '+why);
        z.setup=false; setZone=null; }
      else if(!z.alive||!z.setup){ dropSetup(z,'zone broken'); setZone=null; } }
    if(armUp||armDn){ const d=armUp?1:-1, since=armUp?lastSellSweep:lastBuySweep, span=Math.min(I-since,300);
      let legLo=L(I), legHi=H(I); for(let k=0;k<=span&&I-k>=0;k++){ legLo=Math.min(legLo,L(I-k)); legHi=Math.max(legHi,H(I-k)); }
      const disp=!p.dispReq||legHasFvg(d,span);
      if(!disp&&p.alSetup) ev('setup',d,'Setup '+arrow(d)+' rejected: no displacement');
      const z=disp?pickZone(d,since):null;
      if(z){ if(setZone) dropSetup(setZone,'replaced'); if(z.fvg) z.score=zoneScore(d,z.top,z.btm,true,true);
        z.setup=true; setZone=z; setExpire=I+(+p.setupTtl); setLegLo=legLo; setLegHi=legHi; setSweepName=d>0?lastSellName:lastBuyName;
        sdDraw=null; if(p.sdShow&&legHi-legLo>0) sdDraw={x0:I,d:d,lv:sdKs.map(k=>({y:d>0?legHi+k*(legHi-legLo):legLo-k*(legHi-legLo),t:'-'+k+' SD'}))};
        if(armUp) usedSellSweep=lastSellSweep; else usedBuySweep=lastBuySweep;
        if(p.showSetupLbl) addLab(I,d>0?L(I):H(I),'Setup '+arrow(d),null,d>0?'b':'a',0,d>0?p.cBull:'#d32f2f',d>0?'#004d25':'#ffffff');
        if(p.alSetup) ev('setup',d,'Setup '+arrow(d)+' armed: Sweep '+setSweepName+' \u2192 CHoCH, zone '+rng(z)); } }

    // ========================= trade engine =========================
    let tp1F=false,tp2F=false,tp3F=false;
    if(T&&I>T.i){ const d=T.dir, eff=T.sl, beStart=T.be;
      const slRaw=d===1?L(I)<=eff:H(I)>=eff, t1=d===1?H(I)>=T.tp1:L(I)<=T.tp1, t2=d===1?H(I)>=T.tp2:L(I)<=T.tp2, t3=d===1?H(I)>=T.tp3:L(I)<=T.tp3;
      tp1F=t1&&!T.r1; tp2F=t2&&!T.r2; tp3F=t3&&!T.r3;
      if(tp1F){ T.r1=true; T.i1=I; } if(tp2F){ T.r2=true; T.i2=I; } if(tp3F){ T.r3=true; T.i3=I; }
      let beExit=false, beNow=false, beLevel=null;
      if(p.be&&tp1F&&!T.be){ const off=Math.min(p.beOff*T.atr,0.5*Math.abs(T.tp1-T.entry)), bp=d===1?flo(T.entry+off):cel(T.entry-off); beLevel=bp;
        if(d===1?C(I)<bp:C(I)>bp) beExit=!t3; else { T.sl=bp; T.be=true; T.beI=I; beNow=true; } }
      const closeSl=slRaw&&!tp1F&&!tp3F, dn=d===1?'Long':'Short';
      if(beNow&&p.alTpBe) ev('be',d,'BREAK-EVEN '+dn+' SL \u2192 '+fmt(beLevel));
      if(tp1F&&p.alTpBe) ev('tp1',d,'TP1 HIT '+dn+' '+fmt(T.tp1));
      if(tp2F&&p.alTpBe) ev('tp2',d,'TP2 HIT '+dn+' '+fmt(T.tp2));
      if(t3||closeSl||beExit){
        if(t3){ if(p.alTpBe) ev('tp3',d,'TP3 HIT '+dn+' '+fmt(T.tp3)); closeTrade('TP3',true); }
        else if(closeSl){ if(p.alSlRev) ev('sl',d,(beStart?'BE STOP-OUT ':'SL HIT ')+dn+' SL '+fmt(eff)); closeTrade(beStart?'BE stop':'SL',T.r1); }
        else { if(p.alTpBe) ev('beexit',d,'BE EXIT @ CLOSE '+dn+' '+fmt(C(I))); closeTrade('BE exit',true); } } }

    const sigBarDir=warmed?sig.dir:0, plan=buildPlan(sigBarDir,sig);
    if(plan.ok&&T&&sigBarDir===-T.dir){ if(p.alSlRev) ev('rev',sigBarDir,'REVERSAL \u2192 '+(sigBarDir>0?'LONG':'SHORT')+' '+fmt(C(I))+' ('+(T.r1?'closed after TP1, win':'closed before TP1, loss')+')'); closeTrade('Reversal',T.r1); }
    let opened=false;
    if(plan.ok&&!T){ opened=true;
      T={dir:sigBarDir,i:I,entry:C(I),sl:plan.sl,sl0:plan.sl,tp1:plan.tp1,tp2:plan.tp2,tp3:plan.tp3,tag2:plan.tag2,tag3:plan.tag3,risk:plan.risk,atr:aR[I],score:sig.score,kind:sig.kind,sweep:sig.sweep,
         r1:false,r2:false,r3:false,be:false,endI:null,res:'',win:false,kz:kzName};
      D.trades.push(T); lastSigBar=I; lastSigDir=sigBarDir; lastSigScore=sig.score;
      if(p.showSig) addLab(I,sigBarDir>0?L(I):H(I),sigBarDir>0?'\u25B2 BUY':'\u25BC SELL',null,sigBarDir>0?'b':'a',1,sigBarDir>0?p.cBull:'#d32f2f',sigBarDir>0?'#004d25':'#ffffff');
      ev('entry',sigBarDir,(sigBarDir>0?'LONG ':'SHORT ')+'Price '+fmt(C(I))+' \u00B7 Sweep '+sig.sweep+' \u2192 CHoCH \u2192 '+sig.kind+' \u00B7 Score '+(sig.score*25)+'/100 \u00B7 SL '+fmt(plan.sl)+' \u00B7 TP1 '+fmt(plan.tp1)+' \u00B7 TP2 '+(plan.tag2?plan.tag2+' ':'')+fmt(plan.tp2)+' \u00B7 TP3 '+(plan.tag3?plan.tag3+' ':'')+fmt(plan.tp3)); }
    if(sigBarDir!==0&&!opened&&p.alSetup) ev('setup',sigBarDir,'Signal '+arrow(sigBarDir)+' not executed: '+(T&&T.dir===sigBarDir?'position already open':plan.why+(T?', opposite position kept':'')));
  }
  I=m-1;

  // ---- results for the drawing layer
  const lim=+p.histMax;
  if(htfActive){ while(hk+1<HB.length&&HB[hk+1].closed) hk++; hs=hk>=0?HS[hk]:null; }
  D.lines=D.lines.slice(-lim*3); D.labs=D.labs.slice(-lim*3); D.kz=D.kz.slice(-40); D.sb=D.sb.slice(-600);
  D.keys=keys.slice(); D.pools=pools.filter(q=>q.hits>1||p.liqSingle);
  { const vis=allZ.filter(z=>!z.gone), alive=vis.filter(z=>z.alive), dead=vis.filter(z=>!z.alive); D.zones=dead.slice(-lim).concat(alive); }
  D.pd=(p.pdOn&&rHi!=null&&rLo!=null&&rHi>rLo)?{l:Math.min(rHiIdx,rLoIdx),hi:rHi,lo:rLo,trend:sExt.trend}:null;
  if(htfActive&&p.htfShow&&hs) D.htf={tf:p.htfTf,bull:hs.bTop!=null?{l:hs.bI,top:hs.bTop,btm:hs.bBtm}:null,bear:hs.sTop!=null?{l:hs.sI,top:hs.sTop,btm:hs.sBtm}:null};
  D.sd=sdDraw; D.tick=tick;
  { const cl=C(m-1); let nBull=0,nBear=0,zDn=null,zUp=null;
    for(const z of obs){ if(z.dir>0){ nBull++; if(z.btm<=cl&&(!zDn||z.top>zDn.top)) zDn=z; } else { nBear++; if(z.top>=cl&&(!zUp||z.btm<zUp.btm)) zUp=z; } }
    const inside=z=>z?rng(z)+(cl>=z.btm&&cl<=z.top?' (inside)':''):null;
    const lastClose=c[m-1].time+cs; let pW=winCount,pL=lossCount;
    if(p.statsPeriod!=='All-Time'){ const cut=lastClose-(p.statsPeriod==='24 Hours'?1:30)*86400; pW=0; pL=0; for(let i=0;i<tradeT.length;i++){ if(tradeT[i]>=cut){ if(tradeW[i]) pW++; else pL++; } } }
    D.ds={ trend:sExt.trend, intTrend:sInt.trend, age:(trendStart==null||sExt.trend===0)?null:(m-1-trendStart), htf:htfActive&&hs?hs.trend:null, htfActive:htfActive, htfTf:p.htfTf,
      pos:(rHi!=null&&rLo!=null&&rHi>rLo)?(cl-rLo)/(rHi-rLo)*100:null, state:T?T.dir:0, lastBar:lastSigBar==null?null:(m-1-lastSigBar), lastDir:lastSigDir, lastScore:lastSigScore,
      nBull:nBull, nBear:nBear, fvgN:fvgs.length, demand:inside(zDn), supply:inside(zUp), setup:setZone?{dir:setZone.dir,left:setExpire-(m-1),sweep:setSweepName}:null,
      kz:!kzActive?'n/a (TF > 1H)':kzNameNow===''?(inSbNow?'Silver Bullet':'\u2014'):kzNameNow+(inSbNow?' \u00B7 SB':''), kzOn:kzNameNow!==''||inSbNow,
      pdh:dayLvlOk&&dPrev?fmt(dPrev.hi)+' / '+fmt(dPrev.lo):'\u2014', rbN:p.rbOn?rbs.length:'off', pbN:p.pbOn?pbs.length:'off',
      bias:!biasActive?'off':curDayBias>0?'\u25B2 Bullish \u2192 PDH':curDayBias<0?'\u25BC Bearish \u2192 PDL':'\u2014 Neutral', biasDir:curDayBias,
      judas:(!p.judasOn||!biasActive)?'off':!kzActive?'n/a (TF > 1H)':moPrice==null?'n/a (no 00:00 bar)':judasState===2?arrow(judasDir)+' confirmed':judasState===1?'forming':'\u2014', judasOn:judasState===2,
      T:T, pW:pW, pL:pL, form:formStr, period:p.statsPeriod==='24 Hours'?'24H':p.statsPeriod==='30 Days'?'30D':'All-Time' }; }
  D.ok=true; return D;
}

const KINDS_BASE={entry:1,sl:1,tp1:1,tp2:1,tp3:1}, KINDS_ALL={entry:1,sl:1,tp1:1,tp2:1,tp3:1,be:1,beexit:1,rev:1,setup:1,struct:1,sweep:1,ob:1,fvg:1,rbpb:1,judas:1,bias:1};
const PRESETS=['Conservative','Balanced','Aggressive','Scalping'], TFILT=['Off','Killzones','Silver Bullet'];
// w = {symbol, interval, tool:'ise', opts:{preset, timeFilter, all}}   c = candles [{time,open,high,low,close,volume}] oldest first (seconds), last one still forming
function events(w,c){
  const o=w.opts||{}, p=Object.assign({},IS_DEF,{preset:PRESETS.indexOf(o.preset)<0?'Balanced':o.preset,timeFilter:TFILT.indexOf(o.timeFilter)<0?'Killzones':o.timeFilter});
  if(o.all){ p.alFvg=true; p.alRbPb=true; p.alBias=true; }
  const D=iseCompute(c,p); if(!D.ok) return [];
  const want=o.all?KINDS_ALL:KINDS_BASE, sym=w.symbol, tf=w.interval, out=[];
  D.ev.forEach(e=>{ if(!want[e.k]||e.i<D.m-3) return;
    const key=sym+'|'+tf+'|ise|'+e.k+'|'+e.t+'|'+e.dir; let title;
    if(e.k==='entry') title=(e.dir>0?'\uD83D\uDFE2 BUY ':'\uD83D\uDD34 SELL ')+'\u00b7 ICT Structure Engine '+sym+' '+tf;
    else if(e.k==='sl') title='\uD83D\uDED1 ICT Structure Engine stop '+sym+' '+tf;
    else if(/^tp\d$/.test(e.k)) title='\u2705 ICT Structure Engine '+e.k.toUpperCase()+' '+sym+' '+tf;
    else title='\uD83D\uDFE0 ICT Structure Engine '+sym+' '+tf;
    out.push({key:key,title:title,body:e.msg}); });
  return out; }
module.exports={events:events,compute:iseCompute,DEF:IS_DEF};
