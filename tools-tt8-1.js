/* tools-8.js — MarketPlusView tool code. Several small pieces in one file: each piece after a part marker line is run by index.html inside start() at the spot where that code used to be (same order, same scope).
   Keep the file name and the markers. Tools in this file: IND.tpo, IND.sbx, IND.rzr, IND.rbs, IND.scr, IND.cus, IND.cusp, STRATS.ccz, STRATS.wre, IND.mvp, STRATS.scr */
/*@@part 8*/
IND.tpo={label:'TPO – Market Profile (letters)',nm:p=>`TPO ${p.period}m · ${p.sess}h · VA ${p.va}%`,p:{period:30,sess:24,va:70,ib:true},cols:[],calc:()=>[],
  fields:[['period','sel','TPO block size (minutes)',{opts:[5,15,30,60],num:1}],['sess','num','Session length (hours)',{min:1,max:168}],
          ['va','num','Value Area %',{min:10,max:100}],['ib','chk','Show Initial Balance (first 2 blocks)']]};
/*@@part 9*/
const SBXK=['rangeMode','rangeValue','endBack','useExtended','lockLevel','rowPct','va','showVA','profWidth','tol','maxBarsRetest','minBars','atrLen','pivotAtr','reqBull','breakBufAtr','breakOnClose','maxBarsBreak','allowRevive','reviveBars','htfOn','htfTf','htfLen','showSteps','pivotStrength','minRetestCandles','maxRetestCandles'];
function stRow(b,label,p,onK,colK,sel){
  const r=document.createElement('div'), lab=document.createElement('label'); r.className='fr';
  lab.style.cssText='display:flex;align-items:center;gap:12px;flex:1';
  const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=p[onK]!==false; cb.onchange=()=>{ p[onK]=cb.checked; };
  lab.appendChild(cb); lab.appendChild(document.createTextNode(label)); r.appendChild(lab);
  const col=document.createElement('input'); col.type='color'; col.value=p[colK]; col.oninput=()=>{ p[colK]=col.value; };
  col.style.cssText='width:46px;height:38px;padding:0;border:1px solid #444;border-radius:8px;background:none'; r.appendChild(col);
  (sel||[]).forEach(([k,opts,num])=>{ const s_=document.createElement('select'); opts.forEach(x=>{ const o=document.createElement('option'); o.value=x; o.textContent=x; s_.appendChild(o); });
    s_.value=p[k]; s_.style.width=num?'64px':'112px'; s_.onchange=()=>{ p[k]=num?+s_.value:s_.value; }; r.appendChild(s_); });
  b.appendChild(r);
}
function sbxStyle(b,d){
  const p=d.p, SHP=['Circle','Square','Arrow up','Arrow down'], LOCS=['Below bar','Above bar'], W4=[1,2,3,4];
  const head=t=>{ const h=document.createElement('div'); h.className='sech'; h.textContent=t; b.appendChild(h); };
  stRow(b,'Signal Level',p,'sigOn','sigCol',[['sigW',W4,1]]); stRow(b,'Pivot High',p,'pivOn','pivCol',[['pivW',W4,1]]);
  stRow(b,'Retest Upper',p,'ruOn','ruCol',[['ruW',W4,1]]); stRow(b,'Retest Lower',p,'rlOn','rlCol',[['rlW',W4,1]]);
  stRow(b,'Cross',p,'crossOn','crossCol',[['crossShape',SHP],['crossLoc',LOCS]]); stRow(b,'Retest',p,'retOn','retCol',[['retShape',SHP],['retLoc',LOCS]]);
  stRow(b,'Super Buy',p,'buyOn','buyCol',[['buyShape',SHP],['buyLoc',LOCS]]);
  head('GRAPHIC OBJECTS'); fld(b,p,'boxesOn','chk','Boxes'); fld(b,p,'linesOn','chk','Lines');
  head('OUTPUT VALUES'); fld(b,p,'precision','sel','Precision',{opts:['Default','0','1','2','3','4','5','6','7','8']});
  fld(b,p,'labelsOn','chk','Labels on price scale'); fld(b,p,'valuesStatus','chk','Values in status line');
  head('INPUT VALUES'); fld(b,p,'inputsStatus','chk','Inputs in status line');
}
function sbxVis(b,d){
  const vr=d.p.vr;
  ['Ticks','Seconds','Minutes','Hours','Days','Weeks','Months','Ranges'].forEach(name=>{
    const v=vr[name], r=document.createElement('div'); r.className='fr'; const lab=document.createElement('label'); lab.style.cssText='display:flex;align-items:center;gap:12px;flex:1';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!v.on; cb.onchange=()=>{ v.on=cb.checked; }; lab.appendChild(cb); lab.appendChild(document.createTextNode(name)); r.appendChild(lab);
    if('min' in v){ const mk=key=>{ const e=document.createElement('input'); e.type='number'; e.value=v[key]; e.style.width='76px'; e.oninput=()=>{ const x=parseFloat(e.value); if(!isNaN(x)) v[key]=x; }; return e; };
      r.appendChild(mk('min')); const dash=document.createElement('span'); dash.textContent='–'; r.appendChild(dash); r.appendChild(mk('max')); }
    b.appendChild(r); });
}
IND.sbx={label:'Super Buys ⚡️⚡️⚡️',title:'Super Buys ⚡️⚡️⚡️',cat:'Premium Paid Tool',cols:[],calc:()=>[],
  nm:p=>'Super Buys ⚡️⚡️⚡️'+(p.inputsStatus!==false?' '+SBXK.map(k=>p[k]===true?'true':p[k]===false?'false':p[k]).join(' '):''),
  status:i=>i.p.valuesStatus!==false&&i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:{rangeMode:'Candles',rangeValue:100,endBack:0,useExtended:false,lockLevel:true,rowPct:0.08,va:70,showVA:true,profWidth:30,tol:0.15,maxBarsRetest:30,minBars:24,atrLen:14,pivotAtr:0.5,
    reqBull:true,breakBufAtr:0.1,breakOnClose:true,maxBarsBreak:40,allowRevive:false,reviveBars:40,htfOn:false,htfTf:'4 hours',htfLen:50,showSteps:false,pivotStrength:2,minRetestCandles:4,maxRetestCandles:20,
    sigOn:true,sigCol:'#fdd835',sigW:2,pivOn:true,pivCol:'#ff9800',pivW:1,ruOn:true,ruCol:'#2962ff',ruW:1,rlOn:true,rlCol:'#2962ff',rlW:1,
    crossOn:true,crossCol:'#00bcd4',crossShape:'Circle',crossLoc:'Below bar',retOn:true,retCol:'#ff9800',retShape:'Square',retLoc:'Below bar',buyOn:true,buyCol:'#90ee90',buyShape:'Arrow up',buyLoc:'Below bar',
    boxesOn:true,linesOn:true,precision:'Default',labelsOn:true,valuesStatus:true,inputsStatus:true,
    vr:{Ticks:{on:true},Seconds:{on:true,min:1,max:59},Minutes:{on:true,min:1,max:59},Hours:{on:true,min:1,max:24},Days:{on:true,min:1,max:366},Weeks:{on:true,min:1,max:52},Months:{on:true,min:1,max:12},Ranges:{on:true}}},
  fields:[['rangeMode','sel','Range Unit',{opts:['Candles','Minutes','Hours','Days']}],['rangeValue','num','Range Length',{min:1,step:1}],
    ['endBack','num','Range End: Bars Back From Latest Candle (0 = live, use 150 to test on history)',{min:0,step:1}],
    ['useExtended','chk','Auto Extended (profile keeps growing after range end)'],['lockLevel','chk','Lock Signal Level at Range End (signals only after range end)'],
    ['rowPct','num','Row Size %',{min:.001,step:'any'}],['va','num','Value Area %',{min:10,max:100,step:'any'}],['showVA','chk','Show VAH / VAL'],
    ['profWidth','num','Profile Width % of Range',{min:5,max:100,step:'any'}],['tol','num','Retest Tolerance %',{min:0,step:'any'}],
    ['maxBarsRetest','num','Max Bars to Wait for Retest',{min:1}],['minBars','num','Min Bars in Range Before Signals (unlocked mode only)',{min:0}],
    ['atrLen','num','ATR Length',{min:1}],['pivotAtr','num','Min Pivot Height (x ATR above level)',{min:0,step:'any'}],['reqBull','chk','Retest Candle Must Close Bullish'],
    ['breakBufAtr','num','Break Buffer (x ATR above previous high)',{min:0,step:'any'}],['breakOnClose','chk','Break Previous High On Candle Close'],
    ['maxBarsBreak','num','Max Bars to Break Previous High After Retest',{min:1}],['allowRevive','chk','Allow Buy After Invalid If Previous High Breaks'],
    ['reviveBars','num','Max Bars Revival Stays Valid',{min:1}],['htfOn','chk','Higher Timeframe Trend Filter'],
    ['htfTf','sel','Higher Timeframe',{opts:['15 minutes','1 hour','4 hours','1 day']}],['htfLen','num','Higher Timeframe EMA Length',{min:1}],
    ['showSteps','chk','Show Setup Steps (cross / retest / pivot high)'],['pivotStrength','num','Pivot Strength',{min:1,max:20}],
    ['minRetestCandles','num','Minimum Retest Candles',{min:1,max:50}],['maxRetestCandles','num','Maximum Retest Candles',{min:1,max:200}]],
  styleTab:sbxStyle, visTab:sbxVis,
  visOk:i=>{ const [u,m]=tfUnit(), v=i.p.vr&&i.p.vr[u]; return !v||(v.on&&m>=v.min&&m<=v.max); },
  extras:(c,p,inst)=>sbxRun(c,p,inst)};

// ================= Premium Paid Tool: RSI Zone Reversal (RSI touches the oversold zone -> crosses 50 -> pivot high -> retest of 50 -> break) =================
const emaP=(v,len)=>{ const a=2/(len+1), o=new Array(v.length).fill(NaN); v.forEach((x,i)=>{ o[i]=i?a*x+(1-a)*o[i-1]:x; }); return o; };   // Pine ta.ema: starts from the first value
function rzrRsi(c,p){
  const n=c.length, rl=Math.max(2,Math.round(p.rsiLen)), S=p.src||'close', val=b=>S==='hl2'?(b.high+b.low)/2:b[S];
  const up=new Array(n).fill(NaN), dn=new Array(n).fill(NaN), rsi=new Array(n).fill(NaN), src=c.map(val); let su=0,sd=0;
  for(let i=1;i<n;i++){ const ch=src[i]-src[i-1], u=Math.max(ch,0), d=Math.max(-ch,0);
    if(i<=rl){ su+=u; sd+=d; if(i===rl){ up[i]=su/rl; dn[i]=sd/rl; } } else { up[i]=(up[i-1]*(rl-1)+u)/rl; dn[i]=(dn[i-1]*(rl-1)+d)/rl; }
    if(i>=rl) rsi[i]=dn[i]===0?100:(up[i]===0?0:100-100/(1+up[i]/dn[i])); }
  return {rsi,up,dn,src,rl};
}
function rzrMachine(c,rsi,p,nClosed,trendOk,ema50Ok){
  const n=c.length, ps=Math.max(1,Math.round(p.pivotStr)), mk=[], pivArr=new Array(n).fill(NaN);
  const g=(k,d)=>p[k]===undefined?d:p[k], M=(on,col,sh,loc)=>({on:g(on,true),col:g(col),sh:SHMAP[g(sh)],loc:LOCMAP[g(loc,'Below bar')]||'belowBar'});
  const mT=M('touchOn','touchCol','touchShape','touchLoc'), mC=M('crossOn','crossCol','crossShape','crossLoc'), mR=M('retOn','retCol','retShape','retLoc'), mB=M('buyOn','buyCol','buyShape','buyLoc');
  let stage=0,touchBar=NaN,crossBar=NaN,pivotHigh=NaN,retestCount=0;
  for(let i=0;i<n;i++){
    const b=c[i], r=rsi[i], crossRaw=i>0&&r>p.midLvl&&rsi[i-1]<=p.midLvl;
    const pc=(i-2*ps>=0&&pivAt(c,i-ps,ps,ps,'h'))?c[i-ps].high:NaN;
    const touchNow=stage===0&&r<=p.zoneHigh;
    if(touchNow){ stage=1; touchBar=i; pivotHigh=NaN; retestCount=0; }
    const crossNow=stage===1&&crossRaw;
    if(crossNow){ stage=2; crossBar=i; }
    const pivotFound=stage===2&&!isNaN(pc)&&(i-ps)>=nz0(crossBar,i);
    if(pivotFound){ pivotHigh=pc; stage=3; }
    const inRetest=r<=p.midLvl+p.retestTol&&r>=p.midLvl-p.retestTol, retestInc=stage===3&&inRetest;
    if(retestInc) retestCount++;
    const retestMark=retestInc&&retestCount===p.minRetest;
    const failNow=stage>=2&&r<p.midLvl-p.retestTol, timeoutNow=stage>=1&&(i-nz0(touchBar,i))>p.maxBars;
    if(failNow||timeoutNow){ stage=0; pivotHigh=NaN; retestCount=0; }
    const breakSrc=p.bosOnClose?b.close:b.high;
    const buyNow=stage===3&&retestCount>=p.minRetest&&!isNaN(pivotHigh)&&breakSrc>pivotHigh&&(!p.reqBull||b.close>b.open)&&ema50Ok[i]&&trendOk[i];
    if(buyNow){ stage=0; pivotHigh=NaN; retestCount=0; }
    if(p.showSteps&&stage===3) pivArr[i]=pivotHigh;
    if(i<nClosed){   // the candle still forming never prints a signal
      if(touchNow&&mT.on) mk.push({time:b.time,position:mT.loc,color:mT.col,shape:mT.sh,text:''});
      if(p.showSteps){ if(crossNow&&mC.on) mk.push({time:b.time,position:mC.loc,color:mC.col,shape:mC.sh,text:''}); if(retestMark&&mR.on) mk.push({time:b.time,position:mR.loc,color:mR.col,shape:mR.sh,text:''}); }
      if(buyNow&&mB.on) mk.push({time:b.time,position:mB.loc,color:mB.col,shape:mB.sh,text:'Buy'});
    }
  }
  return {mk,pivArr};
}
function rzrCalc(c,p,nClosed){
  const n=c.length; if(n<8) return null;
  const R=rzrRsi(c,p), cl=c.map(b=>b.close), emaT=emaP(cl,Math.max(2,Math.round(p.trendLen))), ema5=emaP(cl,Math.max(2,Math.round(p.ema50Len))), atr=atrW(c,14);
  const trendOk=c.map((b,i)=>!p.useTrendBuy||b.close>=emaT[i]), ema50Ok=c.map((b,i)=>!p.useEma50||b.close>ema5[i]);
  const m=rzrMachine(c,R.rsi,p,nClosed,trendOk,ema50Ok);
  const L=n-1, s=R.src[L], up=R.up[L], dn=R.dn[L], rl=R.rl;
  const fl=t=>{ const x=(rl-1)*(dn*t/(100-t)-up); return x>=0?s+x:s+x*(100-t)/t; };      // price at which RSI would equal t on the next bar
  const zones=(isFinite(up)&&isFinite(dn))?{left:Math.max(0,L-Math.round(p.boxBars)),osTop:fl(p.zoneHigh),osBot:fl(p.zoneLow),obTop:fl(p.obHigh),obBot:fl(p.obLow),mid:fl(p.midLvl)}:null;
  let trend=null; { const e=emaT[L], a=atr[L]; if(isFinite(e)&&isFinite(a)&&a>0){ const isUp=c[L].close>=e, st=Math.min(100,Math.abs(c[L].close-e)/a/p.fullDist*100), dp=(c[L].close-e)/e*100;
    trend={up:isUp,txt:(isUp?'UP TREND ':'DOWN TREND ')+Math.round(st)+'%',dist:(dp>=0?'+':'')+(Math.round(dp*100)/100)+'% from EMA '+p.trendLen,alpha:1-(85-st*0.6)/100}; } }
  return {mk:m.mk,pivArr:m.pivArr,zones,trend,rsiLast:R.rsi[L]};
}
function rzrRun(c,p){
  const empty={mk:[],boxes:[],labels:[],stat:''}, r=rzrCalc(c,p,c.length-1); if(!r) return empty;
  const pr=p.precision==='Default'||p.precision==null?null:+p.precision, f=v=>pr==null?fmt(v):v.toLocaleString(undefined,{minimumFractionDigits:pr,maximumFractionDigits:pr});
  const fg=hex=>{ const h=hex.replace('#',''), l=(parseInt(h.slice(0,2),16)*299+parseInt(h.slice(2,4),16)*587+parseInt(h.slice(4,6),16)*114)/1000; return l>150?'#000':'#fff'; };
  const v=r.pivArr[c.length-1], labels=[], stat=[];
  if(p.showSteps&&p.pivOn!==false&&!isNaN(v)){ stat.push(f(v)); if(p.labelsOn!==false) labels.push({p:v,text:f(v),col:p.pivCol,fg:fg(p.pivCol)}); }
  return {mk:r.mk,boxes:[{type:'rzrview',pts:[],r,o:p}],labels,stat:stat.join(' ')};
}
function rzrDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r) return; const z=r.zones;
  if(z&&o.showZones!==false){
    const xl=X(z.left);
    if(xl!=null&&isFinite(xl)&&o.boxesOn!==false){
      [[z.osTop,z.osBot,'#4caf50',.15],[z.obTop,z.obBot,'#f44336',.12]].forEach(([t,b,col,fa])=>{ const yT=Y(t), yB=Y(b); if(yT==null||yB==null||!isFinite(yT)||!isFinite(yB)) return;
        const y0=Math.min(yT,yB), h=Math.abs(yB-yT); cx.globalAlpha=fa; cx.fillStyle=col; cx.fillRect(xl,y0,W-xl,h);
        cx.globalAlpha=.7; cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(xl,y0,W-xl,h); cx.globalAlpha=1; }); }
    if(xl!=null&&isFinite(xl)&&o.linesOn!==false){ const y=Y(z.mid); if(y!=null&&isFinite(y)){ cx.strokeStyle='rgba(158,158,158,.85)'; cx.lineWidth=1; cx.setLineDash([6,5]); cx.beginPath(); cx.moveTo(xl,y); cx.lineTo(W,y); cx.stroke(); cx.setLineDash([]); } }
  }
  if(o.showSteps&&o.pivOn!==false) sbPoly(r.pivArr,X,Y,o.pivCol,o.pivW,1);
  if(o.showTrend!==false&&o.tablesOn!==false&&r.trend){
    const t=r.trend; cx.font='bold 13px system-ui'; const w1=cx.measureText(t.txt).width; cx.font='11px system-ui'; const w2=cx.measureText(t.dist).width;
    const w=Math.max(w1,w2)+18, h1=24, h2=20, x=W-w-8, y=H-h1-h2-8;
    cx.globalAlpha=Math.max(.1,Math.min(.8,t.alpha)); cx.fillStyle=t.up?'#4caf50':'#f44336'; cx.fillRect(x,y,w,h1+h2); cx.globalAlpha=1;
    cx.fillStyle='#fff'; cx.textAlign='center'; cx.textBaseline='middle'; cx.font='bold 13px system-ui'; cx.fillText(t.txt,x+w/2,y+h1/2); cx.font='11px system-ui'; cx.fillText(t.dist,x+w/2,y+h1+h2/2);
    cx.textAlign='left'; cx.textBaseline='alphabetic';
  }
}
const RZK=['rsiLen','src','zoneLow','zoneHigh','midLvl','obLow','obHigh','retestTol','minRetest','pivotStr','maxBars','bosOnClose','reqBull','showZones','boxBars','showSteps','showTrend','trendLen','fullDist','useTrendBuy','useEma50','ema50Len'];
function rzrStyle(b,d){
  const p=d.p, SHP=['Circle','Square','Arrow up','Arrow down'], LOCS=['Below bar','Above bar'], W4=[1,2,3,4];
  const head=t=>{ const h=document.createElement('div'); h.className='sech'; h.textContent=t; b.appendChild(h); };
  stRow(b,'Zone Touch',p,'touchOn','touchCol',[['touchShape',SHP],['touchLoc',LOCS]]); stRow(b,'Cross 50',p,'crossOn','crossCol',[['crossShape',SHP],['crossLoc',LOCS]]);
  stRow(b,'Retest',p,'retOn','retCol',[['retShape',SHP],['retLoc',LOCS]]); stRow(b,'Pivot High',p,'pivOn','pivCol',[['pivW',W4,1]]);
  stRow(b,'Buy',p,'buyOn','buyCol',[['buyShape',SHP],['buyLoc',LOCS]]);
  head('GRAPHIC OBJECTS'); fld(b,p,'boxesOn','chk','Boxes'); fld(b,p,'linesOn','chk','Lines'); fld(b,p,'tablesOn','chk','Tables');
  head('OUTPUT VALUES'); fld(b,p,'precision','sel','Precision',{opts:['Default','0','1','2','3','4','5','6','7','8']});
  fld(b,p,'labelsOn','chk','Labels on price scale'); fld(b,p,'valuesStatus','chk','Values in status line');
  head('INPUT VALUES'); fld(b,p,'inputsStatus','chk','Inputs in status line');
}
IND.rzr={label:'RSI Zone Reversal',title:'RSI Zone Reversal',cat:'Premium Paid Tool',cols:[],calc:()=>[],live:true,
  nm:p=>'RSI Zone Reversal'+(p.inputsStatus!==false?' '+RZK.map(k=>p[k]===true?'true':p[k]===false?'false':p[k]).join(' '):''),
  status:i=>i.p.valuesStatus!==false&&i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:{rsiLen:14,src:'close',zoneLow:20,zoneHigh:30,midLvl:50,obLow:70,obHigh:80,retestTol:3,minRetest:2,pivotStr:2,maxBars:60,bosOnClose:true,reqBull:true,showZones:true,boxBars:30,showSteps:false,
    showTrend:true,trendLen:200,fullDist:8,useTrendBuy:false,useEma50:false,ema50Len:50,
    touchOn:true,touchCol:'#00e676',touchShape:'Circle',touchLoc:'Below bar',crossOn:true,crossCol:'#00bcd4',crossShape:'Circle',crossLoc:'Below bar',
    retOn:true,retCol:'#ff9800',retShape:'Square',retLoc:'Below bar',pivOn:true,pivCol:'#ff9800',pivW:1,buyOn:true,buyCol:'#90ee90',buyShape:'Arrow up',buyLoc:'Below bar',
    boxesOn:true,linesOn:true,tablesOn:true,precision:'Default',labelsOn:true,valuesStatus:true,inputsStatus:true,
    vr:{Ticks:{on:true},Seconds:{on:true,min:1,max:59},Minutes:{on:true,min:1,max:59},Hours:{on:true,min:1,max:24},Days:{on:true,min:1,max:366},Weeks:{on:true,min:1,max:52},Months:{on:true,min:1,max:12},Ranges:{on:true}}},
  fields:[['rsiLen','num','RSI Length',{min:2,step:1}],['src','sel','RSI Source',{opts:['close','open','high','low','hl2']}],
    ['zoneLow','num','Oversold Zone Low',{min:1,max:49,step:1}],['zoneHigh','num','Oversold Zone High',{min:1,max:49,step:1}],['midLvl','num','Middle Level',{min:1,max:99,step:1}],
    ['obLow','num','Overbought Zone Low',{min:51,max:99,step:1}],['obHigh','num','Overbought Zone High',{min:51,max:99,step:1}],
    ['retestTol','num','Retest Tolerance (RSI points around middle)',{min:.5,step:.5}],['minRetest','num','Minimum Retest Candles',{min:1,max:50,step:1}],
    ['pivotStr','num','Pivot Strength',{min:1,max:20,step:1}],['maxBars','num','Max Bars For Setup To Complete',{min:5,step:1}],
    ['bosOnClose','chk','BOS On Candle Close (off = wick)'],['reqBull','chk','BOS Candle Must Be Bullish'],['showZones','chk','Show RSI Zones On Price'],
    ['boxBars','num','Zone Start (bars back)',{min:1,step:1}],['showSteps','chk','Show Structure (cross / retest / pivot high)'],['showTrend','chk','Show Trend Box (bottom right)'],
    ['trendLen','num','Trend EMA Length',{min:2,step:1}],['fullDist','num','Trend Full Strength Distance (x ATR)',{min:.5,step:.5}],
    ['useTrendBuy','chk','200 EMA Trend Filter (buy only when price above 200 EMA)'],['useEma50','chk','50 EMA Buy Filter (buy only when price above 50 EMA)'],
    ['ema50Len','num','Buy Filter EMA Length',{min:2,step:1}]],
  styleTab:rzrStyle, visTab:sbxVis,
  visOk:i=>{ const [u,m]=tfUnit(), v=i.p.vr&&i.p.vr[u]; return !v||(v.on&&m>=v.min&&m<=v.max); },
  extras:(c,p,inst)=>rzrRun(c,p)};

// [rbs] PREMIUM STRATEGY · "% Retest Buy & Sell"   (self-contained block: every name starts with rbs / RBS)
// Category: Premium Strategy.  Added by registering IND.rbs (same extras()/draw hook pattern as Super Buys and RSI Zone Reversal).
//
// SECTIONS  1 defaults · 2 input clean-up · 3 reference high/low · 4 candidate range + consolidation filter · 5 engine (state machine)
//           6 chart hook · 7 alerts · 8 drawing + debug panel · 9 settings panel A–M · 10 registration
//
// PERCENTAGE (exact):   h = anchor × Range% / 100            (basis "% of anchor price", default - the same maths as the chart's % measure)
//                       h = (HH − LL) × Range% / 100         (basis "% of lookback range")
//   anchor Low : B = LL, T = LL + h        anchor High : T = HH, B = HH − h        (HH/LL = highest high / lowest low of the lookback)
// BREAK   : close > T + buf  (up)   close < B − buf (down)      buf = Break buffer × ATR(14);  wick-based only when opted in
// RETEST  : up: low ≤ T + tol and close > T − tol       down: high ≥ B − tol and close < B + tol       tol = tolerance % × (T − B)
// BUY     : after an up-break and a retest bar r, a later bar within "confirmation candles" closes > T, bullish, and above high[r]
// SELL    : mirror at B.   INVERT (default ON): the break signals swap sides - break DOWN = BUY, break UP = SELL (same bars, opposite label).   INVALID: up-broken zone closes < T − invDist×(T−B); down-broken zone closes > B + invDist×(T−B)
// NON-REPAINTING: the forming candle is never used, a range is locked once confirmed, and bar i only ever sees bars ≤ i.
// =====================================================================================
/*RBS-ENGINE-BEGIN*/
// ---------- [rbs] SECTION 1 · constants & defaults ----------
const RBS_NAME='% Retest Buy & Sell';
const RBS_TFS={'15 minutes':900,'1 hour':3600,'4 hours':14400,'1 day':86400,'1 week':604800};
const RBS_SENS={ High:{inPct:65,minTouch:2,anchorTouch:1,erMax:.45,hAtr:1,contract:false}, Medium:{inPct:80,minTouch:3,anchorTouch:2,erMax:.30,hAtr:1.5,contract:false}, Low:{inPct:90,minTouch:4,anchorTouch:3,erMax:.20,hAtr:2,contract:true} };
const RBS_DEF={
  // A · range detection
  anchor:'Auto', rangeTf:'Current', confirmBars:2,
  // B · percentage
  pct:2, pctBasis:'Anchor price',
  // C · lookback
  lbUnit:'Candles', lbValue:200,
  // D · support & resistance
  tolPct:10,
  // E · consolidation filter
  consOn:true, consSens:'Medium',
  // F · buy / sell logic
  logic:'Break & Retest', confirm:'Break → Retest → Confirm', reclaimTrigger:'Close below, then close back', enableBuy:true, enableSell:true, invert:true, sigLimit:'1', cooldown:3,
  // G · breakout, retest & invalidation
  bufAtr:.1, wickBreak:false, confBars:3, strongConf:true, maxWait:150, reclaimBars:6, invDist:.5, maxAge:0, replaceOld:false,
  // H · auto extension
  autoExt:true, extMode:'Until invalidated', extBars:100,
  // I · manual adjustment
  manOn:false, manAnchor:'Free', manTop:0, manBot:0, manStartT:0, manEndBars:0,
  // J · visuals
  showBoxes:true, showLevels:true, showSignals:true, showHist:true, showDev:true, fillOn:true, fillAlpha:.12, lvlW:2,
  boxCol:'#00bcd4', greyCol:'#9e9e9e', lvlCol:'#00bcd4', buyCol:'#2dd4a7', sellCol:'#ff5d7a', showBuy:true, showSell:true,
  // K · alerts
  alBuy:true, alSell:true, alBreak:false, alRetest:false, alRange:false, alSound:false,
  // L · performance
  histZones:'10',
  // M · debug
  debug:false,
  inputsStatus:false, valuesStatus:true,
  vr:{Ticks:{on:true},Seconds:{on:true,min:1,max:59},Minutes:{on:true,min:1,max:59},Hours:{on:true,min:1,max:24},Days:{on:true,min:1,max:366},Weeks:{on:true,min:1,max:52},Months:{on:true,min:1,max:12},Ranges:{on:true}}
};

// ---------- [rbs] SECTION 2 · input normalisation (every number is clamped here, never trusted) ----------
function rbsNorm(p){
  const o=Object.assign({},RBS_DEF,p||{}), n=(v,d,lo,hi)=>{ v=+v; if(!isFinite(v)) v=d; return Math.min(hi,Math.max(lo,v)); };
  o.pct=n(o.pct,2,1,100); o.lbValue=n(o.lbValue,200,1,100000); o.tolPct=n(o.tolPct,10,0,100); o.bufAtr=n(o.bufAtr,.1,0,10);
  o.confBars=Math.round(n(o.confBars,3,1,50)); o.confirmBars=Math.round(n(o.confirmBars,2,1,50)); o.cooldown=Math.round(n(o.cooldown,3,0,500));
  o.invDist=n(o.invDist,.5,0,10); o.maxAge=Math.round(n(o.maxAge,0,0,1e6)); o.maxWait=Math.round(n(o.maxWait,150,0,1e6)); o.reclaimBars=Math.round(n(o.reclaimBars,6,1,500));
  o.extBars=Math.round(n(o.extBars,100,1,1e6)); o.manEndBars=Math.round(n(o.manEndBars,0,0,1e6)); o.manTop=+o.manTop||0; o.manBot=+o.manBot||0; o.manStartT=+o.manStartT||0;
  o.invert=o.invert!==false&&o.invert!=='false'&&o.invert!==0; o.sigLimit=o.sigLimit==='Unlimited'?0:Math.round(n(o.sigLimit,1,0,1000));
  o.pctBasis=/range/i.test(String(o.pctBasis))?'Lookback range':'Anchor price';           // 'Anchor price' (default) | 'Lookback range'
  o.fillAlpha=n(o.fillAlpha,.12,0,1); o.lvlW=n(o.lvlW,2,1,6);
  return o;
}
// lookback length in bars of the range timeframe:  L = round(value * unitSeconds / refSeconds), clamped to 5..5000
function rbsBars(P,refS){
  const u={Candles:refS,Hours:3600,Days:86400,Weeks:604800,Months:2592000}[P.lbUnit]||refS;
  return Math.max(5,Math.min(5000,Math.round(P.lbValue*u/refS)));
}
function rbsHtfSec(P,tfS,months){ const s=RBS_TFS[P.rangeTf]; return (!months&&s&&s>tfS)?s:0; }

// ---------- [rbs] SECTION 3 · reference high / low per bar (current timeframe or completed higher-timeframe buckets) ----------
function rbsWindows(c,nC,P,tfS,months){
  const hh=new Float64Array(nC).fill(NaN), ll=new Float64Array(nC).fill(NaN), st=new Int32Array(nC).fill(-1), htfS=rbsHtfSec(P,tfS,months);
  if(!htfS){
    const L=rbsBars(P,tfS), dh=[], dl=[]; let hh0=0, hl0=0;
    for(let i=0;i<nC;i++){
      while(dh.length>hh0&&c[dh[dh.length-1]].high<=c[i].high) dh.pop(); dh.push(i); while(dh[hh0]<=i-L) hh0++;
      while(dl.length>hl0&&c[dl[dl.length-1]].low>=c[i].low) dl.pop(); dl.push(i); while(dl[hl0]<=i-L) hl0++;
      if(i>=L-1){ hh[i]=c[dh[hh0]].high; ll[i]=c[dl[hl0]].low; st[i]=i-L+1; } }
    return {L,mode:'Current TF',hh,ll,st};
  }
  const bk=[]; for(let i=0;i<nC;i++){ const k=Math.floor(c[i].time/htfS), q=bk[bk.length-1];
    if(!q||q.key!==k) bk.push({key:k,hi:c[i].high,lo:c[i].low,s:i}); else { if(c[i].high>q.hi) q.hi=c[i].high; if(c[i].low<q.lo) q.lo=c[i].low; } }
  const L=Math.max(2,rbsBars(P,htfS)); let cur=-1, lastM=-1, H=NaN, Lw=NaN, S0=-1;
  for(let i=0;i<nC;i++){
    while(bk[cur+1]&&bk[cur+1].s<=i) cur++;
    const m=cur+((c[i].time+tfS)>=(bk[cur].key+1)*htfS?1:0);          // number of COMPLETED higher-timeframe bars at bar i
    if(m>=L){ if(m!==lastM){ lastM=m; H=-Infinity; Lw=Infinity; for(let k=m-L;k<m;k++){ if(bk[k].hi>H) H=bk[k].hi; if(bk[k].lo<Lw) Lw=bk[k].lo; } S0=bk[m-L].s; }
      hh[i]=H; ll[i]=Lw; st[i]=S0; } }
  return {L,mode:'HTF '+P.rangeTf,hh,ll,st};
}

// ---------- [rbs] SECTION 4 · candidate range + consolidation filter ----------
function rbsTouches(c,st,en,T,B,tol){ let tT=0,tB=0,lT=-99,lB=-99;
  for(let k=st;k<=en;k++){ if(c[k].high>=T-tol){ if(k-lT>=3) tT++; lT=k; } if(c[k].low<=B+tol){ if(k-lB>=3) tB++; lB=k; } }
  return [tT,tB]; }
function rbsInside(c,st,en,T,B){ let n=0; for(let k=st;k<=en;k++){ const x=c[k].close; if(x>=B&&x<=T) n++; } return n/(en-st+1); }
// returns the candidate box for bar i plus every filter value; `full` keeps evaluating after the first failure (debug only)
function rbsCand(c,i,W,P,S,X,full){
  const hh=W.hh[i], ll=W.ll[i], st=W.st[i], info={ok:false,hh,ll,st,why:[],i};
  if(!(st>=0)||!isFinite(hh)||!isFinite(ll)){ info.why.push('warming up (need '+W.L+' bars)'); return info; }
  if(!(hh>ll)){ info.why.push('flat range (high = low)'); return info; }
  const a=X.atr[i], aOk=isFinite(a), path=X.pl[i]-X.pl[st], er=path>0?Math.abs(c[i].close-c[st].close)/path:0; info.er=er; info.atr=aOk?a:NaN;
  const bad=m=>{ info.why.push(m); return !full; };
  if(P.consOn&&er>S.erMax&&bad('trending: ER '+er.toFixed(2)+' > '+S.erMax)) return info;
  const boxFor=side=>{ const base=side==='L'?ll:hh, h=P.pctBasis==='Lookback range'?(hh-ll)*P.pct/100:Math.abs(base)*P.pct/100;
    return side==='L'?{side,anchor:ll,B:ll,T:ll+h,h}:{side,anchor:hh,T:hh,B:hh-h,h}; };
  let box;
  if(P.anchor==='Highest High') box=boxFor('H'); else if(P.anchor==='Lowest Low') box=boxFor('L');
  else { const bL=boxFor('L'), bH=boxFor('H'), fL=rbsInside(c,st,i,bL.T,bL.B), fH=rbsInside(c,st,i,bH.T,bH.B);
    box=Math.abs(fL-fH)>1e-9?(fL>fH?bL:bH):(Math.abs(c[i].close-bL.anchor)<=Math.abs(c[i].close-bH.anchor)?bL:bH); info.auto=box.side==='L'?'Low':'High'; }
  info.box=box; info.T=box.T; info.B=box.B; info.h=box.h; info.side=box.side;
  if(!(box.h>0)||!isFinite(box.h)){ info.why.push('box height is zero'); return info; }
  if(aOk&&box.h<.1*a&&bad('box smaller than 0.1×ATR')) return info;
  if(P.consOn&&aOk&&box.h<S.hAtr*a&&bad('box '+(box.h/a).toFixed(2)+'×ATR < '+S.hAtr+'×ATR')) return info;
  if(P.consOn&&S.contract){ const cnt=X.ac[i+1]-X.ac[st], mean=cnt?(X.ap[i+1]-X.ap[st])/cnt:NaN; if(aOk&&isFinite(mean)&&a>mean&&bad('no volatility contraction (ATR above its average)')) return info; }
  const ins=rbsInside(c,st,i,box.T,box.B), inNeed=P.consOn?S.inPct:60; info.inside=ins;
  if(ins*100<inNeed&&bad('only '+(ins*100).toFixed(0)+'% of closes inside (need '+inNeed+'%)')) return info;
  const tol=P.tolPct/100*box.h, tc=rbsTouches(c,st,i,box.T,box.B,tol), need=P.consOn?S.minTouch:2; info.tT=tc[0]; info.tB=tc[1];
  const anNeed=P.consOn?S.anchorTouch:1, anHave=box.side==='L'?tc[1]:tc[0];       // the anchor edge must be a level price came back to, not a one-off spike
  if((tc[0]<1||tc[1]<1||tc[0]+tc[1]<need||anHave<anNeed)&&bad('touches top '+tc[0]+' / bottom '+tc[1]+' (need ≥1 each, ≥'+need+' total, anchor edge ≥'+anNeed+')')) return info;
  info.ok=info.why.length===0; return info;
}

// ---------- [rbs] SECTION 5 · the engine: ranges → breakout → retest → confirmation (closed candles only) ----------
function rbsEngine(c,p0,env){
  const P=rbsNorm(p0), n=c.length, nC=Math.max(0,n-1), tfS=env&&env.tfS>0?env.tfS:60, months=!!(env&&env.months);   // the forming candle (last) is never used
  const out={ranges:[],sigs:[],events:[],dev:null,dbg:null,nC,P,stat:''};
  if(nC<8){ out.dbg={state:'NO DATA',why:['need at least 8 closed candles']}; return out; }
  const atr=atrW(c,14), pl=new Float64Array(nC), ap=new Float64Array(nC+1), ac=new Int32Array(nC+1);
  for(let i=0;i<nC;i++){ pl[i]=i?pl[i-1]+Math.abs(c[i].close-c[i-1].close):0; const a=atr[i]; ap[i+1]=ap[i]+(isFinite(a)?a:0); ac[i+1]=ac[i]+(isFinite(a)?1:0); }
  const W=rbsWindows(c,nC,P,tfS,months), S=RBS_SENS[P.consSens]||RBS_SENS.Medium, X={atr,pl,ap,ac};
  const ev=(type,i,msg,R)=>out.events.push({type,i,time:c[i].time,msg,rid:R?R.id:0});
  let lastSig=-1e9;
  const emit=(R,i,dir,kind)=>{
    if(P.invert&&!/reclaim|wick \+ close/.test(kind)) dir=-dir;          // fade the break: break DOWN = BUY, break UP = SELL (reclaim / wick triggers keep their own direction)
    if((dir>0&&!P.enableBuy)||(dir<0&&!P.enableSell)||R.used||i-lastSig<P.cooldown) return false;
    R.sigCount++; if(P.sigLimit>0&&R.sigCount>=P.sigLimit) R.used=true; lastSig=i; const b=c[i];
    out.sigs.push({i,time:b.time,dir,kind,price:b.close,hi:b.high,lo:b.low,rid:R.id}); ev(dir>0?'buy':'sell',i,(dir>0?'BUY':'SELL')+' · '+kind+' · '+rbsFmt(b.close),R); return true; };
  const inval=(R,i,why)=>{ if(R.state==='invalid') return; R.state='invalid'; R.invalidIdx=i; R.why=why; };
  const mk=(box,i,st,tc,manual)=>{ const R={id:out.ranges.length+1,T:box.T,B:box.B,H:box.T-box.B,tol:P.tolPct/100*(box.T-box.B),side:box.side||'',anchor:box.anchor,startIdx:st,createdIdx:i,
      state:'active',dir:0,breakIdx:-1,invalidIdx:-1,why:'',level:NaN,tT:tc[0],tB:tc[1],lT:-99,lB:-99,rStage:0,rIdx:-1,rHigh:0,rLow:0,sigCount:0,used:false,retestExpired:false,manual:!!manual,endForced:-1,endIdx:i,toEdge:false,pct:P.pct};
    if(P.replaceOld) out.ranges.forEach(q=>inval(q,i,'replaced by a newer range'));
    out.ranges.push(R); ev('range',i,'New range '+rbsFmt(R.B)+' – '+rbsFmt(R.T),R); return R; };

  // one closed bar `i` applied to one range (a range never looks at bars after i)
  const step=(R,i)=>{
    if(R.state==='invalid') return;
    const b=c[i], a=isFinite(atr[i])?atr[i]:0, buf=P.bufAtr*a, T=R.T, B=R.B, H=R.H, tol=R.tol, useW=P.confirm==='Immediate break'||P.wickBreak;
    const brk=P.logic!=='Reclaim', rcl=P.logic!=='Break & Retest';
    if(R.endForced>=0&&i>R.endForced){ inval(R,i,'manual end point'); return; }
    if(P.maxAge>0&&i-R.createdIdx>P.maxAge){ inval(R,i,'maximum age reached'); return; }
    if(R.state==='active'){
      if(b.high>=T-tol){ if(i-R.lT>=3) R.tT++; R.lT=i; } if(b.low<=B+tol){ if(i-R.lB>=3) R.tB++; R.lB=i; }
      if(rcl&&P.reclaimTrigger==='Wick + close'){          // explicit opt-in: single-candle wick through the edge, close back inside
        if(b.low<B-buf&&b.close>B&&b.close>b.open) emit(R,i,1,'wick + close at support');
        else if(b.high>T+buf&&b.close<T&&b.close<b.open) emit(R,i,-1,'wick + close at resistance'); }
      const up=(useW?b.high:b.close)>T+buf, dn=(useW?b.low:b.close)<B-buf;
      if(up||dn){ const dir=up&&dn?(b.close>=(T+B)/2?1:-1):(up?1:-1);
        R.state='broken'; R.dir=dir; R.breakIdx=i; R.level=dir>0?T:B; ev('breakout',i,'Breakout '+(dir>0?'UP through ':'DOWN through ')+rbsFmt(R.level),R);
        if(brk&&(P.confirm==='Candle close'||P.confirm==='Immediate break')) emit(R,i,dir,P.confirm==='Candle close'?'breakout close':'immediate break'); }
      return; }
    // state === 'broken'
    const d=R.dir;
    if(rcl&&P.reclaimTrigger!=='Wick + close'&&i-R.breakIdx<=P.reclaimBars){          // failed break: closes back inside
      if(d<0&&b.close>B&&b.close>b.open) emit(R,i,1,'reclaim of support');
      else if(d>0&&b.close<T&&b.close<b.open) emit(R,i,-1,'reclaim of resistance'); }
    if(brk&&!R.used&&!R.retestExpired&&(P.confirm==='Break → Retest → Confirm'||P.confirm==='Break & Retest')){
      if(P.maxWait>0&&i-R.breakIdx>P.maxWait) R.retestExpired=true;
      else { const isRet=d>0?(b.low<=T+tol&&b.close>T-tol):(b.high>=B-tol&&b.close<B+tol);
        if(P.confirm==='Break & Retest'){
          if(isRet&&((d>0&&b.close>b.open&&b.close>T)||(d<0&&b.close<b.open&&b.close<B))){ ev('retest',i,'Retest of '+rbsFmt(R.level),R); emit(R,i,d,'break + retest'); } }
        else {
          let done=false;
          if(R.rStage===1){
            if(i-R.rIdx>P.confBars) R.rStage=0;                                           // confirmation window expired
            else { const ok=d>0?(b.close>T&&b.close>b.open&&(!P.strongConf||b.close>R.rHigh)):(b.close<B&&b.close<b.open&&(!P.strongConf||b.close<R.rLow));
              if(ok&&emit(R,i,d,'break → retest → confirm')){ R.rStage=0; done=true; } } }
          if(!done&&isRet&&i>R.breakIdx){ if(R.rStage!==1) ev('retest',i,'Retest of '+rbsFmt(R.level),R); R.rStage=1; R.rIdx=i; R.rHigh=b.high; R.rLow=b.low; } } } }
    if(d>0?b.close<T-P.invDist*H:b.close>B+P.invDist*H) inval(R,i,'failed break: closed back inside the box');
  };

  // manual range (section I) replaces the automatic detection for the whole history
  let man=null;
  if(P.manOn){ let T=P.manTop, B=P.manBot;
    if(P.manAnchor==='Top'&&T>0) B=T-Math.abs(T)*P.pct/100; else if(P.manAnchor==='Bottom'&&B>0) T=B+Math.abs(B)*P.pct/100;
    let s=0; while(s<nC&&c[s].time<P.manStartT) s++;
    if(T>B&&T>0&&B>0&&s<nC-1) man={T,B,s}; else out.manualMsg='Manual range ignored: needs top > bottom > 0 and a start time inside the loaded history'; }
  let active=null, streak=null, minStart=0;
  if(man){ const R=mk({T:man.T,B:man.B,side:'M',anchor:man.T},man.s,man.s,rbsTouches(c,man.s,man.s,man.T,man.B,P.tolPct/100*(man.T-man.B)),true); active=R; if(P.manEndBars>0) R.endForced=man.s+P.manEndBars; }
  for(let i=0;i<nC;i++){
    for(let k=0;k<out.ranges.length;k++){ const R=out.ranges[k]; if(R.createdIdx<i) step(R,i); }
    if(active&&active.state!=='active'){ minStart=Math.max(minStart,(active.state==='broken'?active.breakIdx:active.invalidIdx)+1); active=null; streak=null; if(man) man=null; }
    if(active||man) continue;
    if(W.st[i]<minStart){ streak=null; continue; }
    const cd=rbsCand(c,i,W,P,S,X,false);
    if(!cd.ok){ streak=null; continue; }
    if(streak&&streak.side===cd.side&&streak.anchor===cd.box.anchor) streak.n++; else streak={side:cd.side,anchor:cd.box.anchor,n:1,cd};
    if(streak.n>=P.confirmBars){ active=mk(cd.box,i,cd.st,[cd.tT,cd.tB],false); active.hh=cd.hh; active.ll=cd.ll; streak=null; } }

  // ----- finalise: where each box is drawn to (extension rule) -----
  const last=nC-1;
  out.ranges.forEach(R=>{
    let e=last, edge=true;
    if(!P.autoExt){ e=R.state==='active'?R.createdIdx:(R.breakIdx>=0?R.breakIdx:R.invalidIdx); edge=false; }
    else if(P.extMode==='Infinite / right edge'){ e=last; edge=true; }
    else if(P.extMode==='Fixed number of candles'){ if(R.state!=='active'){ let f=(R.breakIdx>=0?R.breakIdx:R.invalidIdx)+P.extBars; if(R.state==='invalid') f=Math.min(f,R.invalidIdx); if(f<last){ e=f; edge=false; } } }
    else if(R.state==='invalid'){ e=R.invalidIdx; edge=false; }
    if(R.endForced>=0&&R.state==='invalid'&&R.why==='manual end point'){ e=R.endForced; edge=false; }
    R.endIdx=Math.max(R.startIdx,e); R.toEdge=edge; });

  // ----- developing (not yet confirmed) candidate, only meaningful when no range is active -----
  const curA=out.ranges.length?out.ranges[out.ranges.length-1]:null, hasActive=!!(curA&&curA.state==='active');
  const cdL=rbsCand(c,last,W,P,S,X,true);
  if(!hasActive&&!man&&streak&&cdL.ok) out.dev={T:cdL.T,B:cdL.B,st:cdL.st,n:streak.n,need:P.confirmBars};

  // ----- debug snapshot (always built, only drawn when Debug is on) -----
  const R=curA, brokenR=[...out.ranges].reverse().find(q=>q.state==='broken');
  const rc=R&&R.state!=='invalid'?R:(brokenR||R), D={mode:W.mode,L:W.L,hh:cdL.hh,ll:cdL.ll,pct:P.pct,basis:P.pctBasis,candOk:cdL.ok,candWhy:cdL.why,cand:cdL,streak:streak?streak.n:0,need:P.confirmBars,man:!!man,manualMsg:out.manualMsg||''};
  if(!rc){ D.state=out.dev?'DEVELOPING '+out.dev.n+'/'+out.dev.need:'NO RANGE'; D.up=cdL.T; D.lo=cdL.B; D.brk='none'; D.ret='n/a'; D.buy='no confirmed range'; D.sell='no confirmed range'; }
  else { D.up=rc.T; D.lo=rc.B; D.state=rc.state==='active'?'ACTIVE (confirmed, locked)':rc.state==='broken'?'BROKEN '+(rc.dir>0?'UP':'DOWN')+' (grey, extending)':'INVALID: '+rc.why;
    D.brk=rc.breakIdx>=0?(rc.dir>0?'UP':'DOWN')+' at bar '+rc.breakIdx+' ('+(last-rc.breakIdx)+' bars ago)':'none';
    D.ret=rc.breakIdx<0?'n/a (no break yet)':rc.used?'done':rc.retestExpired?'expired':rc.rStage===1?'retest seen at bar '+rc.rIdx+', waiting for confirmation':'waiting for retest';
    const tk=rc.state==='active'?('waiting for close beyond '+rbsFmt(rc.T+P.bufAtr*(isFinite(atr[last])?atr[last]:0))):null;
    const side=s0=>{ const s=P.invert?-s0:s0; return rc.state==='active'?(s>0?'break ✗ · retest ✗ · confirm ✗ (needs close > '+rbsFmt(rc.T+P.bufAtr*(isFinite(atr[last])?atr[last]:0))+')':'break ✗ · retest ✗ · confirm ✗ (needs close < '+rbsFmt(rc.B-P.bufAtr*(isFinite(atr[last])?atr[last]:0))+')')
      :rc.state==='broken'?(rc.dir===s?(rc.used?'DONE (signal fired)':'break ✓ · retest '+(rc.rStage===1?'✓':'✗')+' · confirm ✗'):'—'):'—'; };
    D.buy=side(1); D.sell=side(-1); D.touches=rc.tT+' top / '+rc.tB+' bottom'; D.key=rc.tT>=rc.tB?'top (resistance)':'bottom (support)'; D.tk=tk; }
  out.dbg=D;
  const sh=R?(R.state==='active'?'ACTIVE':R.state==='broken'?'BROKEN '+(R.dir>0?'↑':'↓'):'INVALID'):(out.dev?'DEV':'—');
  out.stat=R?rbsFmt(R.B)+'–'+rbsFmt(R.T)+' '+sh:(out.dev?'developing '+rbsFmt(out.dev.B)+'–'+rbsFmt(out.dev.T):'no range');
  return out;
}
function rbsFmt(v){ if(!isFinite(v)) return '–'; return Math.abs(v)<1?v.toFixed(6):Math.abs(v)<100?v.toFixed(4):v.toFixed(2); }
/*RBS-ENGINE-END*/

// ---------- [rbs] SECTION 6 · running the engine for the chart ----------
function rbsRun(c,p,inst){
  const empty={mk:[],boxes:[],labels:[],stat:'',events:[]}; if(!c||c.length<9) return empty;
  const tfS=tf[3]?tf[3]*30*86400:tf[2], env={tfS,months:!!tf[3]}, P=rbsNorm(p), hs=rbsHtfSec(P,tfS,env.months);
  const need=hs?rbsBars(P,hs)*(hs/tfS):rbsBars(P,tfS);
  if(need+12>c.length&&moreOld&&!loadingOld) loadOlder();          // lookback longer than the loaded history: fetch more candles (the chart recalculates when they arrive)
  const r=rbsEngine(c,p,env);
  return {mk:[],boxes:[{type:'rbsview',pts:[],r,o:P}],labels:[],stat:r.stat,events:r.events};
}

// ---------- [rbs] SECTION 7 · alerts (each type is switched on/off on its own; only the newest closed candle can fire) ----------
function rbsAlerts(q){
  if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  const FLAG={buy:'alBuy',sell:'alSell',breakout:'alBreak',retest:'alRetest',range:'alRange'}, TXT={buy:'BUY',sell:'SELL',breakout:'BREAKOUT',retest:'RETEST',range:'NEW RANGE'}, COL={buy:'#2e7d32',sell:'#c62828',breakout:'#546e7a',retest:'#f57c00',range:'#00838f'};
  inds.forEach(i=>{
    if(i.t!=='rbs'||!i._xr||!i._xr.events||!show(i)) return;
    const P=rbsNorm(i.p); let quiet=q; if(i._rbsK!==key){ i._rbsK=key; i._rbsLast={}; quiet=true; }       // first run / new symbol or interval: learn history silently
    const last=i._rbsLast||(i._rbsLast={});
    i._xr.events.forEach(e=>{
      if(e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!P[FLAG[e.type]]) return;
      toast(TXT[e.type]+' · '+RBS_NAME+' · '+sym[0]+' '+tf[0]+(e.type==='buy'||e.type==='sell'?'':' · '+e.msg),COL[e.type]);
      if(P.alSound&&typeof beep==='function') beep(); }); });
}
{ const _rbsPrevRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_rbsPrevRE.apply(this,arguments); try{ rbsAlerts(q); }catch(e){ console.error('rbs alerts',e); } return rv; }; }

// ---------- [rbs] SECTION 8 · drawing (boxes, levels, signals, debug panel) ----------
const rbsFg=hex=>{ const h=String(hex).replace('#',''); if(h.length<6) return '#fff'; return (parseInt(h.slice(0,2),16)*299+parseInt(h.slice(2,4),16)*587+parseInt(h.slice(4,6),16)*114)/1000>150?'#000':'#fff'; };
function rbsRR(x,y,w,h,r){ cx.beginPath(); cx.moveTo(x+r,y); cx.arcTo(x+w,y,x+w,y+h,r); cx.arcTo(x+w,y+h,x,y+h,r); cx.arcTo(x,y+h,x,y,r); cx.arcTo(x,y,x+w,y,r); cx.closePath(); }
function rbsDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r||!r.ranges) return;
  const vr=chart.timeScale().getVisibleLogicalRange(), v0=vr?vr.from-2:-1e9, v1=vr?vr.to+2:1e9;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  // --- boxes + levels (latest N zones; the active one is always the newest) ---
  const cap=o.histZones==='Unlimited'?Infinity:(+o.histZones||10); let list=r.ranges; if(list.length>cap) list=list.slice(list.length-cap);
  list.forEach((R,ix)=>{
    const hist=R.state!=='active'; if(hist&&o.showHist===false) return;
    if(R.startIdx>v1||(!R.toEdge&&R.endIdx<v0)) return;
    const xa=X(R.startIdx), xb=R.toEdge?W:X(R.endIdx), yT=Y(R.T), yB=Y(R.B);
    if(xa==null||xb==null||yT==null||yB==null||!isFinite(xa+xb+yT+yB)) return;
    const x0=Math.max(-2,xa), x1=Math.min(W,xb); if(x1<=x0) return;
    const col=hist?o.greyCol:o.boxCol, y0=Math.min(yT,yB), hh=Math.max(1,Math.abs(yB-yT));
    if(o.showBoxes!==false){
      if(o.fillOn){ cx.globalAlpha=hist?o.fillAlpha*.7:o.fillAlpha; cx.fillStyle=col; cx.fillRect(x0,y0,x1-x0,hh); }
      cx.globalAlpha=hist?.65:.9; cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(x0,y0,x1-x0,hh); }
    if(o.showLevels!==false){
      const topKey=R.state==='broken'?R.dir>0:R.tT>=R.tB, lc=hist?o.greyCol:o.lvlCol, withLbl=ix>=list.length-3;
      const role=top=>{ if(R.state==='broken'||(R.state==='invalid'&&R.breakIdx>=0)){ if(top) return R.dir>0?'Support (flip)':'Broken'; return R.dir<0?'Resistance (flip)':'Support'; } return top?'Resistance':'Support'; };
      [[R.T,yT,true],[R.B,yB,false]].forEach(([pr,y,top])=>{ const key=top===topKey;
        cx.globalAlpha=hist&&!key?.6:1; cx.strokeStyle=lc; cx.lineWidth=key?o.lvlW:1; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke();
        if(withLbl){ let t=role(top)+' '+fmt(pr); if(key&&R.rStage===1) t='Retest · '+t; cx.globalAlpha=.95; cx.font='10px system-ui'; cx.textAlign='right'; cx.textBaseline=top?'bottom':'top'; cx.fillStyle=lc; cx.fillText(t,x1-6,y+(top?-3:3)); } }); }
    cx.globalAlpha=1; });
  // --- developing candidate (not confirmed, may still change) ---
  if(o.showDev!==false&&r.dev){ const dv=r.dev, xa=X(dv.st), yT=Y(dv.T), yB=Y(dv.B);
    if(xa!=null&&yT!=null&&yB!=null&&isFinite(xa+yT+yB)){ cx.setLineDash([5,4]); cx.globalAlpha=.75; cx.strokeStyle=o.boxCol; cx.lineWidth=1; cx.strokeRect(Math.max(-2,xa),Math.min(yT,yB),W-Math.max(-2,xa),Math.max(1,Math.abs(yB-yT)));
      cx.setLineDash([]); cx.font='10px system-ui'; cx.textAlign='right'; cx.textBaseline='bottom'; cx.fillStyle=o.boxCol; cx.fillText('developing '+dv.n+'/'+dv.need,W-6,Math.min(yT,yB)-3); cx.globalAlpha=1; } }
  // --- BUY / SELL labels ---
  if(o.showSignals!==false){ cx.font='bold 11px system-ui'; cx.textAlign='center'; cx.textBaseline='middle';
    r.sigs.forEach(s=>{ if(s.i<v0||s.i>v1||(s.dir>0&&o.showBuy===false)||(s.dir<0&&o.showSell===false)) return;
      const x=X(s.i), buy=s.dir>0, y=Y(buy?s.lo:s.hi); if(x==null||y==null||!isFinite(x+y)||x<-30||x>W+30) return;
      const col=buy?o.buyCol:o.sellCol, txt=buy?'BUY':'SELL', w=cx.measureText(txt).width+14, h=17, py=buy?y+10:y-10-h;
      cx.globalAlpha=1; cx.fillStyle=col; cx.beginPath(); if(buy){ cx.moveTo(x,y+3); cx.lineTo(x-4,y+10); cx.lineTo(x+4,y+10); } else { cx.moveTo(x,y-3); cx.lineTo(x-4,y-10); cx.lineTo(x+4,y-10); } cx.closePath(); cx.fill();
      rbsRR(x-w/2,py,w,h,4); cx.fill(); cx.fillStyle=rbsFg(col); cx.fillText(txt,x,py+h/2+.5); }); }
  // --- debug panel ---
  if(o.debug&&r.dbg){ const D=r.dbg, L=['% RETEST BUY & SELL · DEBUG · last closed bar #'+(r.nC-1),
      'Lookback: '+(D.L||'–')+' bars · '+(D.mode||''), 'Calculated high: '+rbsFmt(D.hh)+'   low: '+rbsFmt(D.ll), 'Range %: '+D.pct+'  ('+D.basis+')',
      'Upper boundary: '+rbsFmt(D.up)+'   Lower boundary: '+rbsFmt(D.lo), 'State: '+D.state, 'Breakout state: '+D.brk, 'Retest state: '+D.ret, 'BUY  condition: '+D.buy, 'SELL condition: '+D.sell];
    if(D.touches) L.push('Touches: '+D.touches+' · key level: '+D.key);
    if(D.cand&&D.cand.er!=null) L.push('Candidate: ER '+D.cand.er.toFixed(2)+(D.cand.inside!=null?' · inside '+(D.cand.inside*100).toFixed(0)+'%':'')+(D.cand.tT!=null?' · touches '+D.cand.tT+'/'+D.cand.tB:'')+(D.cand.auto?' · auto→'+D.cand.auto:''));
    if(!D.candOk&&D.candWhy&&D.candWhy.length) D.candWhy.slice(0,3).forEach(m=>L.push('  ✗ '+m));
    if(D.manualMsg) L.push(D.manualMsg);
    cx.font='11px ui-monospace,Menlo,Consolas,monospace'; const narrow=W<700, mw=Math.max(...L.map(s=>cx.measureText(s).width)), lw=Math.min(W-16,mw+16), lh=15;
    const fit=s=>{ let t=s; while(t.length>4&&cx.measureText(t).width>lw-16) t=t.slice(0,-2); return t===s?s:t+'…'; }, T=L.map(fit);
    const px=narrow?8:W-lw-8, py=narrow?176:8;                    // top-right on wide screens, below the app legend on phones (never over the legend)
    cx.globalAlpha=.88; cx.fillStyle='#0e1117'; rbsRR(px,py,lw,T.length*lh+10,6); cx.fill(); cx.globalAlpha=1; cx.textAlign='left'; cx.textBaseline='top';
    T.forEach((s,k)=>{ cx.fillStyle=k===0?'#00bcd4':'#d5dbe8'; cx.fillText(s,px+8,py+5+k*lh); }); }
  cx.restore();
}
{ const _rbsPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='rbsview') return rbsDraw(d,X,Y,W,H); return _rbsPrevDraw.apply(this,arguments); }; }

// ---------- [rbs] SECTION 9 · settings panel (sections A–M, same widgets as the other premium tools) ----------
function rbsInputs(b,d){
  const p=d.p, el=(tag,css,txt)=>{ const e=document.createElement(tag); if(css) e.style.cssText=css; if(txt!=null) e.textContent=txt; return e; };
  const head=t=>{ const h=el('div'); h.className='sech'; h.textContent=t; b.appendChild(h); };
  const note=(box,t)=>box.appendChild(el('div','color:#8a93a6;font-size:13px;line-height:1.45;padding:2px 0 8px',t));
  const btn=(txt,fn,on)=>{ const e=el('button','padding:8px 12px;margin:0 8px 8px 0;border-radius:8px;border:1px solid #3a4152;background:'+(on?'#2962ff':'#1e222d')+';color:#fff;font-size:14px',txt); e.type='button'; e.onclick=fn; return e; };
  const num=(box,k,l,o)=>fld(box,p,k,'num',l,o), chk=(box,k,l)=>fld(box,p,k,'chk',l), sel=(box,k,l,opts)=>fld(box,p,k,'sel',l,{opts});
  head('A. RANGE DETECTION');
  sel(b,'anchor','Range Anchor',['Highest High','Lowest Low','Auto']); sel(b,'rangeTf','Range timeframe (Current = chart interval)',['Current','15 minutes','1 hour','4 hours','1 day','1 week']);
  num(b,'confirmBars','Bars a range must qualify before it is confirmed',{min:1,max:50,step:1});
  note(b,'Developing (dashed) → Confirmed (locked, solid) → Historical (grey). Only a confirmed range can produce signals.');
  head('B. PERCENTAGE'); const sB=el('div'); b.appendChild(sB);
  const fillB=()=>{ sB.innerHTML=''; num(sB,'pct','Range %',{min:1,max:100,step:.1});
    const row=el('div','padding:2px 0 4px'); [1,2,5,10,25,50,75,100].forEach(v=>row.appendChild(btn(v+'%',()=>{ p.pct=v; fillB(); },+p.pct===v))); sB.appendChild(row);
    sel(sB,'pctBasis','Percentage basis',['Anchor price','Lookback range']);
    note(sB,'Height h = anchor price × Range % (basis "Anchor price", the default) or (High − Low) × Range % (basis "Lookback range"). Anchor Low: bottom = Low, top = Low + h. Anchor High: top = High, bottom = High − h.'); };
  fillB();
  head('C. LOOKBACK'); sel(b,'lbUnit','Lookback unit',['Candles','Hours','Days','Weeks','Months']); num(b,'lbValue','Lookback length',{min:1,step:1});
  note(b,'Bars = round(length × unit seconds ÷ range-timeframe seconds), limited to 5–5000. A month counts as 30 days.');
  head('D. SUPPORT & RESISTANCE'); num(b,'tolPct','Touch / retest tolerance (% of box height)',{min:0,max:100,step:1});
  note(b,'Bottom edge = support, top edge = resistance. After a break the broken edge flips (resistance → support after an up-break, support → resistance after a down-break). The edge with more touches is the key level.');
  head('E. CONSOLIDATION FILTER'); chk(b,'consOn','Consolidation filter'); sel(b,'consSens','Sensitivity (High = more ranges, Low = strictest)',['Low','Medium','High']);
  note(b,'Uses containment of closes, boundary touches, efficiency ratio (sideways vs trending), box size vs ATR and, on Low, volatility contraction. OFF keeps only a basic sanity check (60% of closes inside, one touch per side).');
  head('F. BUY / SELL LOGIC');
  sel(b,'logic','Signal logic',['Break & Retest','Reclaim','Both']); sel(b,'confirm','Confirmation (Break & Retest logic)',['Break → Retest → Confirm','Break & Retest','Candle close','Immediate break']);
  sel(b,'reclaimTrigger','Reclaim trigger',['Close below, then close back','Wick + close']); chk(b,'invert','Invert break signals (break DOWN = BUY, break UP = SELL)'); chk(b,'enableBuy','Buy signals'); chk(b,'enableSell','Sell signals');
  sel(b,'sigLimit','Signals per zone',['1','2','3','Unlimited']); num(b,'cooldown','Minimum candles between signals',{min:0,step:1});
  note(b,'Break & Retest: with Invert ON (default) a break below the bottom → retest → BUY and a break above the top → retest → SELL; with Invert OFF it is the reverse (break up = Buy, break down = Sell). Reclaim: a failed break that closes back inside. "Wick + close" and "Immediate break" use wicks and are opt-in; signals still print on closed candles only.');
  head('G. BREAKOUT, RETEST & INVALIDATION');
  num(b,'bufAtr','Break buffer (× ATR beyond the edge)',{min:0,step:.05}); chk(b,'wickBreak','A wick beyond the edge counts as a break (default: close)');
  num(b,'confBars','Candles allowed for the confirmation candle',{min:1,step:1}); chk(b,'strongConf','Confirmation must close beyond the retest candle');
  num(b,'maxWait','Max candles to wait for a retest (0 = until invalidated)',{min:0,step:1}); num(b,'reclaimBars','Candles allowed for a reclaim',{min:1,step:1});
  num(b,'invDist','Invalidation distance (× box height back inside the box)',{min:0,step:.05}); num(b,'maxAge','Max zone age in candles (0 = off)',{min:0,step:1}); chk(b,'replaceOld','A new range replaces (invalidates) older zones');
  head('H. AUTO EXTENSION'); chk(b,'autoExt','Auto Extend'); sel(b,'extMode','Extension',['Until invalidated','Fixed number of candles','Infinite / right edge']); num(b,'extBars','Fixed extension (candles after the break)',{min:1,step:1});
  head('I. MANUAL ADJUSTMENT'); const sM=el('div'); b.appendChild(sM);
  const fillM=()=>{ sM.innerHTML=''; chk(sM,'manOn','Manual Adjustment (replaces automatic detection until that zone breaks or is invalidated)');
    sel(sM,'manAnchor','Anchor position',['Free','Top','Bottom']); num(sM,'manTop','Top boundary (price)',{min:0,step:'any'}); num(sM,'manBot','Bottom boundary (price)',{min:0,step:'any'});
    const r=el('label'); r.className='fr'; r.appendChild(el('span',null,'Start point (date and time)')); const dt=el('input'); dt.type='datetime-local';
    if(p.manStartT>0){ const t=new Date(p.manStartT*1000-new Date(p.manStartT*1000).getTimezoneOffset()*60000); dt.value=t.toISOString().slice(0,16); }
    dt.onchange=()=>{ const t=Date.parse(dt.value); p.manStartT=isNaN(t)?0:Math.floor(t/1000); }; r.appendChild(dt); sM.appendChild(r);
    num(sM,'manEndBars','End point: stop after N candles (0 = normal extension rule)',{min:0,step:1});
    const row=el('div','padding:6px 0');
    row.appendChild(btn('Use latest detected range',()=>{ const inst=inds.find(x=>x.t==='rbs'&&x._xr&&x._xr.boxes&&x._xr.boxes[0]&&x._xr.boxes[0].r), rs=inst?inst._xr.boxes[0].r.ranges:[];
      const R=[...rs].reverse().find(q=>q.state!=='invalid')||rs[rs.length-1]; if(!R){ toast('No detected range to copy yet','#ff5d7a'); return; }
      p.manTop=R.T; p.manBot=R.B; p.manStartT=candles[Math.min(candles.length-1,R.startIdx)].time; p.manEndBars=0; p.manAnchor='Free'; fillM(); }));
    row.appendChild(btn('Reset to Auto',()=>{ p.manOn=false; p.manTop=0; p.manBot=0; p.manStartT=0; p.manEndBars=0; p.manAnchor='Free'; fillM(); })); sM.appendChild(row);
    note(sM,'Anchor Top: bottom = top − h. Anchor Bottom: top = bottom + h (h from Range %). Free: both prices are used as typed. A manual box stays locked and is never overwritten by the automatic calculation.'); };
  fillM();
  head('J. VISUALS'); chk(b,'showBoxes','Show Boxes'); chk(b,'showLevels','Show Levels'); chk(b,'showSignals','Show Signals'); chk(b,'showHist','Show historical (grey) zones'); chk(b,'showDev','Show developing range (dashed)');
  chk(b,'fillOn','Shaded area'); num(b,'fillAlpha','Shade opacity (0–1)',{min:0,max:1,step:.02}); num(b,'lvlW','Key level line width',{min:1,max:6,step:1});
  head('K. ALERTS'); chk(b,'alBuy','Buy signal'); chk(b,'alSell','Sell signal'); chk(b,'alBreak','Breakout'); chk(b,'alRetest','Retest'); chk(b,'alRange','New range detected'); chk(b,'alSound','Play a sound');
  head('L. PERFORMANCE'); sel(b,'histZones','Zones kept on the chart (newest first)',['5','10','20','50','Unlimited']);
  head('M. DEBUG'); chk(b,'debug','Debug mode (shows the calculated values on the chart)');
}
function rbsStyle(b,d){
  const p=d.p, head=t=>{ const h=document.createElement('div'); h.className='sech'; h.textContent=t; b.appendChild(h); };
  stRow(b,'Active box',p,'showBoxes','boxCol'); stRow(b,'Broken / historical (grey)',p,'showHist','greyCol'); stRow(b,'Support / resistance levels',p,'showLevels','lvlCol');
  stRow(b,'BUY signal',p,'showBuy','buyCol'); stRow(b,'SELL signal',p,'showSell','sellCol');
  head('OUTPUT VALUES'); fld(b,p,'valuesStatus','chk','Values in status line'); head('INPUT VALUES'); fld(b,p,'inputsStatus','chk','Inputs in status line');
}

// ---------- [rbs] SECTION 10 · registration under "Premium Strategy" ----------
IND.rbs={label:RBS_NAME,title:RBS_NAME,cat:'Premium Strategy',cols:[],calc:()=>[],
  nm:p=>RBS_NAME+' '+p.pct+'% · '+p.lbValue+' '+String(p.lbUnit||'').toLowerCase(),
  status:i=>i.p.valuesStatus!==false&&i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:RBS_DEF, inputsTab:rbsInputs, styleTab:rbsStyle, visTab:typeof sbxVis==='function'?sbxVis:undefined,
  visOk:i=>{ const [u,m]=tfUnit(), v=i.p.vr&&i.p.vr[u]; return !v||(v.on&&m>=v.min&&m<=v.max); },
  extras:(c,p,inst)=>rbsRun(c,p,inst)};
// (the picker category 'Premium Strategy' and its one-line description are registered by two single-line additions next to CATS / DESC)
// ================= end of [rbs] % Retest Buy & Sell =================

// ================= Premium Paid Tool: Spike Counter Reversal (spikes -> counter -> opposite-candle close -> BUY / SELL -> spike zone -> zone fill clean-up) =================
// Everything runs on CLOSED candles only (the candle still forming is never used), so signals never repaint.
function scrCalc(c,p){
  const n=c.length, nC=n-1, mk=[], ev=[], sigs=[], seqs=[], Z=[];
  const res={mk,ev,Z,stat:''}; if(n<12) return res;
  const N=Math.max(1,Math.round(p.count)), cap=Math.max(0,Math.round(p.maxCount)||0), maxW=Math.max(1,Math.round(p.maxWait));
  const atr=atrW(c,Math.max(1,Math.round(p.atrLen))), pctMin=p.pctPreset==='Custom'?+p.pctCustom:parseFloat(p.pctPreset)||2;
  const spike=(i,k=1)=>{ const b=c[i], rg=b.high-b.low; if(!(rg>0)) return 0; const a=i>0?atr[i-1]:NaN;
    const okA=isFinite(a)&&rg>=a*p.atrMul*k, okP=b.close>0&&rg/b.close*100>=pctMin*k, m=p.method;
    const ok=m==='ATR'?okA:m==='Percentage'?okP:m==='ATR and %'?(okA&&okP):(okA||okP); if(!ok) return 0;
    if(p.bodyOn&&Math.abs(b.close-b.open)<rg*p.bodyPct/100) return 0;
    return b.close>b.open?1:b.close<b.open?-1:0; };
  let dir=0,cnt=0,sHi=NaN,sLo=NaN,sStart=0,wait=false,waitBars=0,gapN=0,nSp=0; const G=Math.max(0,Math.round(+p.gap||0)), FK=Math.min(1,Math.max(.3,(+p.followPct||100)/100));
  const reset=()=>{ dir=0; cnt=0; sHi=sLo=NaN; wait=false; waitBars=0; gapN=0; };
  const cmk=(i,t)=>{ if(p.showCount) mk.push({time:c[i].time,position:dir<0?'aboveBar':'belowBar',color:dir<0?p.sellCol:p.buyCol,shape:'circle',text:String(t),size:1,keep:true}); };
  for(let i=0;i<nC;i++){
    const b=c[i];
    // 1) zone fill check (only candles AFTER the signal candle)
    Z.forEach(z=>{ if(z.fill!=null||z.sigI>=i) return; const up=z.side==='BUY';
      let hit;
      if(p.fillMethod==='First Touch') hit=up?b.high>z.edge:b.low<z.edge;   // first touch of the part of the zone not already reached by the confirmation candle
      else if(p.fillMethod==='Candle Close Through Zone') hit=up?b.close>=z.top:b.close<=z.bot;
      else hit=up?b.high>=z.top:b.low<=z.bot;
      if(hit){ z.fill=i; if(p.alFill) ev.push({k:'fill',time:b.time,msg:'Spike Counter: '+z.side+' zone filled',col:'#2962ff'}); } });
    let sp=spike(i);
    if(!sp&&FK<1&&dir!==0&&cnt>0){ const f=spike(i,FK); if(f===dir) sp=f; }          // optional: later spikes of a running sequence only need FK × the threshold
    if(sp) nSp++;
    // 2) waiting for the confirmation candle to CLOSE
    if(wait){
      if(sp===dir){ cnt++; sHi=Math.max(sHi,b.high); sLo=Math.min(sLo,b.low); waitBars=0; if(cap&&cnt>cap) reset(); else cmk(i,cnt); continue; }
      const want=-dir, pv=c[i-1]; let ok=true;
      if(p.needOpp) ok=want>0?b.close>b.open:b.close<b.open;
      if(ok&&p.cBodyOn){ const rg=b.high-b.low; ok=rg>0&&Math.abs(b.close-b.open)>=rg*p.cBodyPct/100; }
      if(ok&&p.cRangeOn){ const a=atr[i-1]; ok=isFinite(a)&&(b.high-b.low)>=a*p.cRangeAtr; }
      if(ok&&p.cBreakOn) ok=want>0?b.close>pv.high:b.close<pv.low;
      if(ok){ const side=want>0?'BUY':'SELL';
        sigs.push({side,i,time:b.time});
        const z={side,left:sStart,sigI:i,top:sHi,bot:sLo,fill:null,edge:side==='BUY'?Math.min(sHi,Math.max(sLo,b.high)):Math.max(sLo,Math.min(sHi,b.low))}; Z.push(z);
        if(side==='BUY'?p.alBuy:p.alSell) ev.push({k:side.toLowerCase(),time:b.time,msg:'Spike Counter '+side+' Signal',col:side==='BUY'?'#2e7d32':'#c62828'});
        reset(); continue; }
      if(++waitBars>=maxW) reset(); else continue;
    }
    // 3) counting consecutive spikes
    if(sp===0){ if(cnt>0&&gapN<G){ gapN++; sHi=Math.max(sHi,b.high); sLo=Math.min(sLo,b.low); } else { dir=0; cnt=0; gapN=0; } }          // optional: up to G ordinary candles may sit between spikes
    else if(sp===dir){ cnt++; gapN=0; sHi=Math.max(sHi,b.high); sLo=Math.min(sLo,b.low); }
    else { dir=sp; cnt=1; gapN=0; sHi=b.high; sLo=b.low; sStart=i; }
    if(sp!==0){ if(cap&&cnt>cap){ reset(); continue; } cmk(i,cnt);
      if(cnt>=N){ wait=true; waitBars=0; if(p.alSeq) ev.push({k:'seq',time:b.time,msg:'Spike Counter: '+cnt+' '+(dir<0?'bearish':'bullish')+' spikes, waiting '+(dir<0?'BUY':'SELL'),col:'#2962ff'}); } }
  }
  // signal markers (permanent: they never depend on the zone state)
  const shown=sigs.filter(s=>s.side==='BUY'?p.showBuy:p.showSell);
  const keepIdx=new Set(); if(!p.histOn){ ['BUY','SELL'].forEach(sd=>{ const l=shown.filter(s=>s.side===sd); if(l.length) keepIdx.add(l[l.length-1]); }); }
  shown.forEach(s=>{ if(!p.histOn&&!keepIdx.has(s)) return; const buy=s.side==='BUY';
    mk.push({time:s.time,position:(buy?p.buyLoc:p.sellLoc)==='Above bar'?'aboveBar':'belowBar',color:buy?p.buyCol:p.sellCol,shape:buy?'arrowUp':'arrowDown',text:p.textOn?(buy?'BUY ↑':'SELL ↓'):'',size:Math.max(1,Math.round(p.size)),keep:true}); });
  res.stat=wait?('Waiting '+(dir<0?'BUY':'SELL')+' ('+cnt+'/'+N+')'):cnt?((dir<0?'Bear ':'Bull ')+cnt+'/'+N):'';
  res.stat=(res.stat?res.stat+' · ':'')+nSp+' spikes · '+sigs.length+' signals';          // tuning aid: how many spikes / signals these settings find in the loaded history
  return res;
}
function scrRun(c,p){
  const r=scrCalc(c,p); let zs=[];
  if(p.showZones!==false){ const act=r.Z.filter(z=>z.fill==null&&(z.side==='BUY'?p.buyZoneOn!==false:p.sellZoneOn!==false)).slice(-Math.max(1,Math.round(p.maxZones)));
    zs=act.concat(p.keepFilled?r.Z.filter(z=>z.fill!=null).slice(-10):[]); }
  return {mk:r.mk,ev:r.ev,stat:r.stat,boxes:zs.length?[{type:'scrview',pts:[],zs,o:p}]:[],labels:[]};
}
function scrDraw(d,X,Y,W,H){
  const o=d.o; if(!d.zs) return; cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip();
  d.zs.forEach(z=>{ const grey=z.fill!=null, col=grey?'#9e9e9e':(z.side==='BUY'?o.buyZoneCol:o.sellZoneCol);
    let xl=X(z.left); if(xl==null||!isFinite(xl)) return; xl=Math.max(0,xl);
    let xr=grey?X(z.fill):(o.extend!==false?W:X(z.sigI)); if(xr==null||!isFinite(xr)) return; xr=Math.min(W,xr); if(xr<=xl) return;
    const yT=Y(z.top), yB=Y(z.bot); if(yT==null||yB==null||!isFinite(yT)||!isFinite(yB)) return;
    const y0=Math.min(yT,yB), h=Math.max(1,Math.abs(yB-yT)), ty=o.zoneType||'Rectangle';
    if(ty==='Rectangle'||ty==='Both'){ cx.globalAlpha=Math.max(0,Math.min(1,(grey?.5:1)*(o.zoneOpacity==null?18:o.zoneOpacity)/100)); cx.fillStyle=col; cx.fillRect(xl,y0,xr-xl,h); }
    cx.globalAlpha=grey?.55:.85; cx.strokeStyle=col; cx.lineWidth=1;
    if(ty==='Rectangle') cx.strokeRect(xl,y0,xr-xl,h);
    else { cx.beginPath(); cx.moveTo(xl,y0); cx.lineTo(xr,y0); cx.moveTo(xl,y0+h); cx.lineTo(xr,y0+h); cx.stroke(); }
    if(o.zoneLabel){ cx.globalAlpha=.9; cx.fillStyle=col; cx.font='11px system-ui'; cx.textAlign='left'; cx.textBaseline='top'; cx.fillText((grey?'Filled ':'')+z.side+' zone',xl+4,y0+3); }
    cx.globalAlpha=1; });
  cx.restore();
}
const SCK=['method','atrLen','atrMul','count','fillMethod'];
function scrStyle(b,d){
  const p=d.p, LOCS=['Below bar','Above bar'], head=t=>{ const h=document.createElement('div'); h.className='sech'; h.textContent=t; b.appendChild(h); };
  head('SIGNALS'); stRow(b,'BUY signal',p,'showBuy','buyCol',[['buyLoc',LOCS]]); stRow(b,'SELL signal',p,'showSell','sellCol',[['sellLoc',LOCS]]);
  head('ZONES'); stRow(b,'BUY zone',p,'buyZoneOn','buyZoneCol',[]); stRow(b,'SELL zone',p,'sellZoneOn','sellZoneCol',[]);
  fld(b,p,'zoneOpacity','num','Zone fill opacity %',{min:0,max:100,step:1});
}
IND.scr={label:'Spike Counter Reversal',title:'Spike Counter Reversal',cat:'Premium Paid Tool',cols:[],calc:()=>[],
  nm:p=>'Spike Counter Reversal '+SCK.map(k=>p[k]).join(' '),
  status:i=>i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:{method:'ATR',atrLen:14,atrMul:2,pctPreset:'2%',pctCustom:1.5,bodyOn:false,bodyPct:70,
    count:3,maxCount:0,maxWait:1,gap:0,followPct:100,
    needOpp:true,cBodyOn:false,cBodyPct:50,cRangeOn:false,cRangeAtr:1,cBreakOn:false,
    showZones:true,zoneType:'Rectangle',fillMethod:'Full Fill',extend:true,maxZones:5,keepFilled:false,zoneLabel:false,zoneOpacity:18,
    buyZoneOn:true,buyZoneCol:'#26a69a',sellZoneOn:true,sellZoneCol:'#ef5350',
    showBuy:true,showSell:true,histOn:true,size:2,textOn:true,showCount:false,buyCol:'#00e676',sellCol:'#ff5252',buyLoc:'Below bar',sellLoc:'Above bar',
    alBuy:true,alSell:true,alSeq:false,alFill:false,
    vr:{Ticks:{on:true},Seconds:{on:true,min:1,max:59},Minutes:{on:true,min:1,max:59},Hours:{on:true,min:1,max:24},Days:{on:true,min:1,max:366},Weeks:{on:true,min:1,max:52},Months:{on:true,min:1,max:12},Ranges:{on:true}}},
  fields:[
    ['method','sel','Detection: method',{opts:['ATR','Percentage','ATR and %','ATR or %']}],['atrLen','num','Detection: ATR length',{min:1,step:1}],['atrMul','num','Detection: ATR multiplier (range ≥ ATR × this)',{min:.1,step:.1}],
    ['pctPreset','sel','Detection: minimum range % of price',{opts:['1%','2%','3%','5%','Custom']}],['pctCustom','num','Detection: custom minimum range %',{min:.01,step:'any'}],
    ['bodyOn','chk','Detection: require strong body'],['bodyPct','num','Detection: minimum body % of candle range',{min:1,max:100,step:1}],
    ['followPct','num','Detection: later spikes in a sequence need only this % of the threshold (100 = same)',{min:30,max:100,step:5}],
    ['count','num','Counter: number of consecutive spikes',{min:1,step:1}],['maxCount','num','Counter: maximum spikes (0 = no limit)',{min:0,step:1}],
    ['maxWait','num','Counter: candles to wait for confirmation (1 = next candle only)',{min:1,step:1}],
    ['gap','num','Counter: ordinary candles allowed between spikes (0 = strictly consecutive)',{min:0,max:5,step:1}],
    ['needOpp','chk','Confirm: opposite-colour candle required'],['cBodyOn','chk','Confirm: minimum body %'],['cBodyPct','num','Confirm: candle body % of range',{min:1,max:100,step:1}],
    ['cRangeOn','chk','Confirm: minimum candle range'],['cRangeAtr','num','Confirm: candle range ≥ ATR × this',{min:.1,step:.1}],
    ['cBreakOn','chk','Confirm: close beyond previous candle high (BUY) / low (SELL)'],
    ['showZones','chk','Zone: show zones'],['zoneType','sel','Zone: type',{opts:['Rectangle','Upper/lower lines','Both']}],
    ['fillMethod','sel','Zone: fill method',{opts:['First Touch','Full Fill','Candle Close Through Zone']}],['extend','chk','Zone: extend to the right'],
    ['maxZones','num','Zone: maximum active zones',{min:1,step:1}],['keepFilled','chk','Zone: keep filled zones in grey (last 10)'],['zoneLabel','chk','Zone: label'],
    ['histOn','chk','Signals: show historical signals'],['textOn','chk','Signals: BUY ↑ / SELL ↓ text'],['size','num','Signals: marker size',{min:1,max:6,step:1}],['showCount','chk','Signals: show spike count on spike candles'],
    ['alBuy','chk','Alerts: BUY signal'],['alSell','chk','Alerts: SELL signal'],['alSeq','chk','Alerts: required spikes reached'],['alFill','chk','Alerts: zone filled']
  ],
  styleTab:scrStyle, visTab:sbxVis,
  visOk:i=>{ const [u,m]=tfUnit(), v=i.p.vr&&i.p.vr[u]; return !v||(v.on&&m>=v.min&&m<=v.max); },
  extras:(c,p)=>scrRun(c,p)};
/*@@part 10*/
function fxInputs(b,d){
  const ta=document.createElement('textarea'); ta.value=d.p.f||''; ta.rows=3; ta.spellcheck=false; ta.setAttribute('autocapitalize','off'); ta.setAttribute('autocorrect','off');
  ta.style.cssText='width:100%;box-sizing:border-box;background:#151a24;color:#eee;border:1px solid #333;border-radius:10px;padding:10px;font:15px/1.4 ui-monospace,Menlo,monospace;margin-top:8px;resize:vertical';
  const msg=document.createElement('div'); msg.style.cssText='font-size:13px;margin:8px 0 10px;min-height:18px';
  const chk=()=>{ const q=FX.compile(ta.value); msg.style.color=q.err?'#ff5d7a':'#2dd4a7';
    msg.textContent=q.err?q.err:(q.bool?'OK · true/false result – arrows mark each bar where it turns true':'OK · number result – drawn as a line'); };
  ta.oninput=()=>{ d.p.f=ta.value; chk(); };
  const row=document.createElement('div'); row.style.cssText='display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px';
  ['ema(close,9)','sma(close,20)','rsi(close,14)','crossover(','highest(high,20)','close','volume',' > ',' and '].forEach(t=>{
    const x=document.createElement('button'); x.type='button'; x.textContent=t.trim(); x.style.cssText='background:rgba(255,255,255,.07);color:#eee;border:0;border-radius:8px;padding:7px 10px;font-size:13px';
    x.onclick=()=>{ const a=ta.selectionStart==null?ta.value.length:ta.selectionStart, e=ta.selectionEnd==null?a:ta.selectionEnd; ta.value=ta.value.slice(0,a)+t+ta.value.slice(e); const q=a+t.length; ta.focus(); try{ ta.setSelectionRange(q,q); }catch(_){} ta.oninput(); };
    row.appendChild(x); });
  const help=document.createElement('div'); help.style.cssText='color:#9a9a9a;font-size:12.5px;line-height:1.55';
  help.innerHTML='<b>Prices:</b> open high low close volume hl2 hlc3 ohlc4<br><b>Maths:</b> + − * / % ^ ( ) abs sqrt log exp min max<br><b>Compare:</b> &gt; &lt; &gt;= &lt;= == != and or not<br><b>Functions:</b> sma ema rsi stdev sum highest lowest atr shift change roc iff<br><b>Cross:</b> crossover(a,b) crossunder(a,b) cross(a,b)<br><b>Examples:</b><br>ema(close,9) &gt; ema(close,21)<br>rsi(close,14) &lt; 30 and volume &gt; sma(volume,20)*1.5<br>close &gt; highest(high,20)';
  b.appendChild(ta); b.appendChild(msg); b.appendChild(row); b.appendChild(help); chk();
}
IND.cus={label:'Custom formula – on price chart',title:'Custom formula',cat:'Scripts',fx:1,nm:p=>'ƒ '+fxShort(p.f),status:i=>FX.compile(i.p.f).err?' ⚠':'',
  p:{f:'crossover(ema(close,9), ema(close,21))'},cols:['#2dd4a7'],inputsTab:fxInputs,
  calc:(c,p)=>{ const q=FX.compile(p.f); return [q.err||q.bool?[]:FX.pts(p.f,c)]; },
  extras:(c,p,i)=>({mk:FX.marks(p.f,c,(i&&i.cols[0])||'#2dd4a7')})};
IND.cusp={label:'Custom formula – own pane',title:'Custom formula',cat:'Scripts',fx:1,pane:2,nm:p=>'ƒ '+fxShort(p.f),status:i=>FX.compile(i.p.f).err?' ⚠':'',
  p:{f:'rsi(close,14) - 50'},cols:['#a78bfa'],inputsTab:fxInputs,
  calc:(c,p)=>[FX.compile(p.f).err?[]:FX.pts(p.f,c)],
  extras:(c,p,i)=>({mk:FX.marks(p.f,c,(i&&i.cols[0])||'#a78bfa')})};
/*@@part 11*/
STRATS.ccz={label:'Consecutive Candles Zones – sell after bullish run, buy after bearish run',short:'Consecutive Candles Zones',
  defs:{sellMin:4,sellMax:10,buyMin:4,buyMax:10,showCount:true,showZones:true,showTriangles:true},
  inputs:(b,d)=>{ fld(b,d,'sellMin','num','Sell After Minimum Consecutive Bullish Candles',{min:2,max:50});
    fld(b,d,'sellMax','num','Sell After Maximum Consecutive Bullish Candles',{min:2,max:50});
    fld(b,d,'buyMin','num','Buy After Minimum Consecutive Bearish Candles',{min:2,max:50});
    fld(b,d,'buyMax','num','Buy After Maximum Consecutive Bearish Candles',{min:2,max:50});
    fld(b,d,'showCount','chk','Show Candle Counter (2 to 50)'); fld(b,d,'showZones','chk','Show Zones'); fld(b,d,'showTriangles','chk','Show Triangles'); },
  sig:(c,i,n,Z)=>{ if(i<1) return 0; const b=c[i];
    const sMin=Z.sellMin||4, sMax=Z.sellMax||10, bMin=Z.buyMin||4, bMax=Z.buyMax||10;
    if(!(b.close>b.open)){ let k=0; while(i-1-k>=0&&c[i-1-k].close>c[i-1-k].open) k++; if(k>=sMin&&k<=sMax) return -1; }   // run of bullish ended -> SELL
    if(!(b.close<b.open)){ let k=0; while(i-1-k>=0&&c[i-1-k].close<c[i-1-k].open) k++; if(k>=bMin&&k<=bMax) return 1; }    // run of bearish ended -> BUY
    return 0; }};

// bar-by-bar port of the Pine logic (bar i uses the candle that just closed = candle i-1)
function cczCompute(c,Z){
  const n=c.length, sMin=Z.sellMin||4, sMax=Z.sellMax||10, bMin=Z.buyMin||4, bMax=Z.buyMax||10;
  let bullCnt=0, bearCnt=0, lastH=NaN, lastL=NaN, sTop=NaN, sBot=NaN, sHit=false, bTop=NaN, bBot=NaN, bHit=false;
  const sz=[], bz=[], cnt=[], tri=[]; let sc=null, bc=null;
  for(let i=1;i<n;i++){ const k=c[i-1], bull=k.close>k.open, bear=k.close<k.open;
    const pBull=bullCnt, pBear=bearCnt;
    bullCnt=bull?bullCnt+1:0; bearCnt=bear?bearCnt+1:0;
    const sellS=pBull>=sMin&&pBull<=sMax&&bullCnt===0, buyS=pBear>=bMin&&pBear<=bMax&&bearCnt===0;
    const newSell=sellS&&!isNaN(lastH), newBuy=buyS&&!isNaN(lastH);
    if(newSell){ sTop=lastH; sBot=lastL; sHit=false; sc={i0:i,top:sTop,bot:sBot,hit:null,end:n-1}; if(sz.length) sz[sz.length-1].end=i; sz.push(sc); }
    else if(!sHit&&c[i].high>=sBot){ sHit=true; if(sc) sc.hit=i; }
    if(newBuy){ bTop=lastH; bBot=lastL; bHit=false; bc={i0:i,top:bTop,bot:bBot,hit:null,end:n-1}; if(bz.length) bz[bz.length-1].end=i; bz.push(bc); }
    else if(!bHit&&c[i].low<=bTop){ bHit=true; if(bc) bc.hit=i; }
    lastH=k.high; lastL=k.low;
    if(bullCnt>=2&&bullCnt<=50) cnt.push({i,v:bullCnt,bull:true});
    if(bearCnt>=2&&bearCnt<=50) cnt.push({i,v:bearCnt,bull:false});
    if(sellS) tri.push({i,sell:true}); if(buyS) tri.push({i,sell:false});
  }
  return {n,c,sz,bz,cnt,tri};
}
let cczCache={k:'',r:null};
function cczDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<3) return;
  const k=[c.length,c[0].time,c[c.length-1].high,c[c.length-1].low,Z.sellMin,Z.sellMax,Z.buyMin,Z.buyMax].join('|');
  if(cczCache.k!==k) cczCache={k,r:cczCompute(c,Z)};
  const r=cczCache.r, last=r.n-1;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  if(Z.showZones!==false){
    const seg=(i0,i1,top,bot,col)=>{ if(i1<i0) return; const x0=X(i0), x1=X(i1), y0=Y(top), y1=Y(bot); if(x0==null||x1==null||y0==null||y1==null) return;
      const t=Math.min(y0,y1), h=Math.max(1,Math.abs(y1-y0));
      cx.globalAlpha=.2; cx.fillStyle=col; cx.fillRect(x0,t,x1-x0,h);
      cx.globalAlpha=.8; cx.strokeStyle=col; cx.lineWidth=1; cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y0); cx.moveTo(x0,y1); cx.lineTo(x1,y1); cx.stroke(); cx.globalAlpha=1; };
    const zone=(z,col)=>{ if(z.hit==null) seg(z.i0,z.end,z.top,z.bot,col); else { seg(z.i0,z.hit,z.top,z.bot,col); seg(z.hit,z.end,z.top,z.bot,'#808080'); } };
    r.sz.forEach(z=>zone(z,'#f23645')); r.bz.forEach(z=>zone(z,'#089981')); }
  if(Z.showCount!==false){ cx.font='11px system-ui'; cx.textAlign='center';
    r.cnt.forEach(q=>{ const x=X(q.i), y=Y(q.bull?c[q.i].high:c[q.i].low); if(x==null||y==null) return;
      cx.fillStyle=q.bull?'#089981':'#f23645'; cx.textBaseline=q.bull?'bottom':'top'; cx.fillText(String(q.v),x,q.bull?y-2:y+2); }); }
  if(Z.showTriangles!==false){
    r.tri.forEach(q=>{ const x=X(q.i), y=Y(q.sell?c[q.i].high:c[q.i].low); if(x==null||y==null) return; const s=5;
      cx.fillStyle=q.sell?'#f23645':'#089981'; cx.beginPath();
      if(q.sell){ const b=y-6; cx.moveTo(x-s,b-s); cx.lineTo(x+s,b-s); cx.lineTo(x,b); }
      else { const b=y+6; cx.moveTo(x-s,b+s); cx.lineTo(x+s,b+s); cx.lineTo(x,b); }
      cx.closePath(); cx.fill(); }); }
  cx.restore();
}
{ const _cczPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='cczview') return cczDraw(d,X,Y,W,H); return _cczPrevDraw.apply(this,arguments); };
  const _cczPrevRE=recomputeExtras; recomputeExtras=function(){ _cczPrevRE.apply(this,arguments);
    strats.forEach(Z=>{ if(Z.k==='ccz'&&stVis(Z)) scriptBoxes.push({type:'cczview',pts:[],o:Z}); }); }; }

// ---------- [wre] strategy: Wyckoff Range Engine (compact port of the WillyAlgoTrader Pine script v3.3.2; credit to the original author) ----------
const WRE_D={atrLen:14,effBase:50,climScore:60,climPeak:2,trendSw:2,entry:'LPS / LPSY',swingRev:1,arRet:.5,minH:3,maxH:8,arMax:60,life:400,stZone:.3,maxST:3,reqST:true,reclaim:8,failDist:.5,testZone:.4,sosEff:1.2,sosLeg:1.5,sosLogic:'Effort OR leg length',sosBuf:.1,lpsFloor:.75,lpsMax:60,markUT:true,proj:1,projBars:40,showFailed:true,showEv:true,showPh:true,showTrade:true};
function wreCompute(c,Z){
  const n=c.length, S=[], rs=[], EV=[], SG={}, cl=x=>Math.max(0,Math.min(1,x)); let cur=null, rid=0;
  const atr=new Array(n).fill(0); { let s=0; for(let i=0;i<n;i++){ const k=c[i], tr=i?Math.max(k.high-k.low,Math.abs(k.high-c[i-1].close),Math.abs(k.low-c[i-1].close)):k.high-k.low; if(i<Z.atrLen){ s+=tr; if(i===Z.atrLen-1) atr[i]=s/Z.atrLen; } else atr[i]=(atr[i-1]*(Z.atrLen-1)+tr)/Z.atrLen; } }
  const uv=c.some(k=>k.volume>0), raw=c.map(k=>uv?(k.volume||0):k.high-k.low), rt=new Array(n).fill(1);
  { let s=0; for(let i=0;i<n;i++){ s+=raw[i]; if(i>=Z.effBase) s-=raw[i-Z.effBase]; const m=s/Math.min(i+1,Z.effBase); rt[i]=m>0?raw[i]/m:1; } }
  const lg=(a,b)=>{ let s=0,pk=0,m=0; for(let k=a+1;k<=b;k++){ s+=rt[k]; if(rt[k]>pk) pk=rt[k]; m++; } return [m?s/m:1,pk,m]; };
  const U=(r,p)=>{ const h=r.top-r.bot; return h>0?(r.side===1?(p-r.bot)/h:(r.top-p)/h):.5; }, PO=(r,u)=>{ const h=r.top-r.bot; return r.side===1?r.bot+u*h:r.top-u*h; };
  const useL=Z.entry==='LPS / LPSY'||Z.entry==='Spring + LPS', useSp=Z.entry==='Spring / UTAD'||Z.entry==='Spring + LPS', useSo=Z.entry==='SOS / SOW';
  const BU='#00E676', BE='#FF5252', YE='#FFEB3B', CY='#00E5FF', OR='#FF9100';
  let legDir=0, ext=0, extBar=0, lsBar=0, lsPx=0, cand=0, cPx=0, cBar=0, cEff=0, cLeg=0, cEv=null;
  const ev=(r,i,p,t,clim,col,sub)=>{ const e={i,p,t,below:(r.side===1)===clim,col,sub:!!sub,off:.5*atr[Math.min(i,n-1)],rid:r.id}; EV.push(e); return e; };
  const sig=(i,dir,info)=>{ const k=c[i], a=atr[i]; if(!a) return; const sl=dir>0?Math.min(k.low-.25*a,k.close-.5*a):Math.max(k.high+.25*a,k.close+.5*a), rk=Math.abs(k.close-sl); SG[i]={dir,e:k.close,sl,tp:[1,2,3].map(m=>k.close+dir*rk*m),info}; };
  const div=(r,bar,ph)=>{ if(bar>r.lastDiv){ r.divs.push({i:bar,ph,from:r.lastDiv}); r.lastDiv=bar; } };
  const extC=(r,bar,px)=>{ if(r.side===1) r.bot=px; else r.top=px; ev(r,bar,px,'ext',true,CY,true); };
  const setSp=(r,bar,px,eff,i)=>{ r.sprung=true; r.tested=false; r.sp=px; r.spEff=eff; r.stage=3; ev(r,bar,px,r.side===1?'Spring':'UTAD',true,YE); div(r,bar,2); if(useSp) sig(i,r.side,(r.side===1?'Spring':'UTAD')+' @ '+px); };
  const runOf=(kind,px)=>{ let st=null, cnt=0; if(S.length>=2){ let j=S.length-2, s=S[j]; st=s; while(j-2>=0){ const po=S[j-2], bt=S[j-1], oo=kind===-1?po.price>s.price:po.price<s.price, bo=kind===-1?bt.price>px:bt.price<px; if(oo&&bo){ j-=2; s=po; st=s; cnt++; } else break; } } return [st,cnt]; };
  const warm=Math.max(Z.effBase,Z.atrLen,50);
  for(let i=warm;i<n;i++){
    const k=c[i], a=atr[i]; if(!a) continue; let sw=null;
    if(legDir===0){ legDir=1; lsBar=i; lsPx=k.low; ext=k.high; extBar=i; }
    else if(legDir===1){ if(k.high>ext){ ext=k.high; extBar=i; }
      if(k.close<ext-Z.swingRev*a){ const [e,p,m]=lg(lsBar,extBar); sw={kind:1,price:ext,bar:extBar,legEff:e,legPeak:p,legAtr:(ext-lsPx)/a}; const ob=extBar; legDir=-1; lsBar=ob; lsPx=ext;
        if(ob===i){ ext=k.low; extBar=i; } else { let lo=Infinity, lb=i; for(let q=ob+1;q<=i;q++) if(c[q].low<lo){ lo=c[q].low; lb=q; } ext=lo; extBar=lb; } } }
    else { if(k.low<ext){ ext=k.low; extBar=i; }
      if(k.close>ext+Z.swingRev*a){ const [e,p,m]=lg(lsBar,extBar); sw={kind:-1,price:ext,bar:extBar,legEff:e,legPeak:p,legAtr:(lsPx-ext)/a}; const ob=extBar; legDir=1; lsBar=ob; lsPx=ext;
        if(ob===i){ ext=k.high; extBar=i; } else { let hi=-Infinity, hb=i; for(let q=ob+1;q<=i;q++) if(c[q].high>hi){ hi=c[q].high; hb=q; } ext=hi; extBar=hb; } } }
    if(sw){ S.push(sw); if(S.length>60) S.shift(); }
    let closeR=false, failR=false, tag=''; const fail=t=>{ closeR=true; failR=true; tag=t; };
    // A) bar-level checks
    if(cur){
      const h=Math.max(cur.top-cur.bot,1e-12), uC=U(cur,k.close), col=cur.side===1?BU:BE, nm=(x,y)=>cur.side===1?x:y;
      if(!cur.brokeOut&&i-cur.climaxBar>Z.life) fail('TIMED OUT');
      if(!closeR&&!cur.brokeOut&&uC<-Z.failDist*a/h){ ev(cur,i,cur.side===1?k.low:k.high,nm('BREAKDOWN','BREAKOUT'),true,OR); fail('BROKEN'); }
      if(!closeR&&cur.pend){ if(uC>=0){ cur.pend=false; if(Z.reqST&&cur.nTests===0) extC(cur,cur.pBar,cur.pPx); else setSp(cur,cur.pBar,cur.pPx,cur.pEff,i); }
        else if(i-cur.pConf>Z.reclaim){ ev(cur,i,cur.side===1?k.low:k.high,nm('BREAKDOWN','BREAKOUT'),true,OR); cur.pend=false; fail('BROKEN'); } }
      if(!closeR&&cur.brokeOut&&!cur.lpsSeen&&i>cur.breakBar&&uC<.5){ ev(cur,i,cur.side===1?k.low:k.high,nm('SOS lost','SOW lost'),true,OR); fail('BREAKOUT LOST'); }
      if(!closeR&&!cur.brokeOut&&!cur.pend&&legDir===cur.side&&(cur.nTests>0||cur.sprung)){
        const [le,lp]=lg(lsBar,i), la=Math.abs(k.close-lsPx)/a, eo=le>=Z.sosEff, lo=la>=Z.sosLeg, q=Z.sosLogic==='Effort AND leg length'?(eo&&lo):(eo||lo);
        if(uC>1+Z.sosBuf*a/h&&q){ cur.brokeOut=true; cur.breakBar=i; cur.stage=4; ev(cur,i,cur.side===1?k.high:k.low,nm('SOS','SOW'),false,col); div(cur,i,cur.sprung?3:2); cur.target=PO(cur,1+Z.proj); if(useSo) sig(i,cur.side,nm('SOS','SOW')+' @ '+k.close); } }
      if(!closeR&&cur.brokeOut&&!cur.lpsSeen&&i-cur.breakBar>Z.lpsMax){ closeR=true; tag=nm('MARKUP \u00B7 no LPS','MARKDOWN \u00B7 no LPSY'); }
    }
    // B) swing classification
    if(sw){
      if(!cur){
        if(cand!==0){
          if((cand===1&&sw.kind===1)||(cand===-1&&sw.kind===-1)){ const hp=cand===1?sw.price-cPx:cPx-sw.price, rtr=cLeg>0?hp/cLeg:0;
            if(hp>=Z.minH*a&&rtr>=Z.arRet){ cur={id:++rid,side:cand,top:cand===1?sw.price:cPx,bot:cand===1?cPx:sw.price,climaxBar:cBar,stage:1,nTests:0,utCount:0,sprung:false,tested:false,brokeOut:false,lpsSeen:false,pend:false,divs:[],lastDiv:cBar,end:null,tag:'',failed:false,target:null,breakBar:0};
              if(cEv) cEv.rid=cur.id; cEv=null; ev(cur,sw.bar,sw.price,'AR',false,cand===1?BU:BE); cand=0; } }
          else if(cand===1?sw.price<cPx:sw.price>cPx){ cLeg+=Math.abs(sw.price-cPx); cPx=sw.price; cBar=sw.bar; if(cEv){ cEv.i=sw.bar; cEv.p=sw.price; } } }
        if(!cur&&cand===0){ const [st,cnt]=runOf(sw.kind,sw.price), rp=st?Math.abs(st.price-sw.price):0, ra=rp/a, rb=st?sw.bar-st.bar:0, [re,rpk]=lg(st?st.bar:sw.bar,sw.bar);
          const sc=Math.round(30*cl(re-1)+30*cl((rpk-1)/3)+20*cl((ra-2)/6)+20*cl((ra/Math.max(rb,1))/.5));
          if(cnt>=Z.trendSw&&rpk>=Z.climPeak&&sc>=Z.climScore){ cand=sw.kind===-1?1:-1; cPx=sw.price; cBar=sw.bar; cEff=re; cLeg=rp; cEv=ev({side:cand,id:0},sw.bar,sw.price,cand===1?'SC':'BC',true,CY); } }
      } else if(!closeR){
        const u=U(cur,sw.price), uC=U(cur,k.close), col=cur.side===1?BU:BE, nm=(x,y)=>cur.side===1?x:y, climSide=(cur.side===1&&sw.kind===-1)||(cur.side===-1&&sw.kind===1);
        if(climSide){
          if(u<0&&!cur.brokeOut){ if(uC>=0){ if(Z.reqST&&cur.nTests===0) extC(cur,sw.bar,sw.price); else setSp(cur,sw.bar,sw.price,sw.legEff,i); } else { cur.pend=true; cur.pBar=sw.bar; cur.pPx=sw.price; cur.pEff=sw.legEff; cur.pConf=i; } }
          else if(cur.brokeOut){ if(!cur.lpsSeen&&sw.bar>cur.breakBar&&u>=Z.lpsFloor){ cur.lpsSeen=true; cur.stage=5; ev(cur,sw.bar,sw.price,nm('LPS','LPSY'),true,col); div(cur,sw.bar,4); if(useL) sig(i,cur.side,nm('LPS','LPSY')+' @ '+sw.price); closeR=true; tag=nm('MARKUP','MARKDOWN'); } }
          else if(cur.sprung){ if(!cur.tested&&u>U(cur,cur.sp)&&u<=Z.testZone&&sw.legEff<cur.spEff){ cur.tested=true; ev(cur,sw.bar,sw.price,'Test',true,col); } }
          else if(u>=0&&u<=Z.stZone&&cur.nTests<Z.maxST){ cur.nTests++; if(cur.stage<2){ cur.stage=2; div(cur,sw.bar,1); } ev(cur,sw.bar,sw.price,'ST',true,col); }
        } else {
          if(cur.pend&&u<0){ ev(cur,sw.bar,sw.price,nm('BREAKDOWN','BREAKOUT'),false,OR); cur.pend=false; fail('BROKEN'); }
          else if(u>1&&!cur.brokeOut){
            if(cur.nTests===0&&!cur.sprung){ const nh=(cur.side===1?sw.price-cur.bot:cur.top-sw.price)/a;
              if(nh>Z.maxH){ ev(cur,sw.bar,sw.price,'no range \u00B7 trend',false,OR,true); fail('NO RANGE \u00B7 trend'); }
              else { if(cur.side===1) cur.top=sw.price; else cur.bot=sw.price; ev(cur,sw.bar,sw.price,'AR+',false,col,true); } }
            else if(Z.markUT&&uC<=1){ cur.utCount++; ev(cur,sw.bar,sw.price,nm('UT','Shakeout'),false,YE,true); } } }
      }
    }
    // C) finalize
    if(cur&&closeR){ cur.end=i; cur.tag=tag; cur.failed=failR; rs.push(cur); cur=null; }
    if(cand!==0&&!cur&&i-cBar>Z.arMax){ if(cEv) cEv.dropped=true; cEv=null; cand=0; }
  }
  const show=rs.slice(-4), ids={}; show.concat(cur?[cur]:[]).forEach(g=>{ ids[g.id]=g; });
  return {SG,rs:show,cur,EV:EV.filter(e=>!e.dropped&&(ids[e.rid]||(e.rid===0&&e===cEv))),ids,n};
}
let wreCache={k:'',r:null};
function wreGet(c,Z){ if(!c||c.length<60) return {SG:{},rs:[],cur:null,EV:[],ids:{},n:0}; const k=c.length+'|'+c[0].time+'|'+c[c.length-1].time+'|'+Object.keys(WRE_D).map(q=>Z[q]).join(','); if(wreCache.k!==k) wreCache={k,r:wreCompute(c,Z)}; return wreCache.r; }
STRATS.wre={label:'Wyckoff Range Engine ? accumulation / distribution ranges with SC, AR, ST, Spring, SOS and LPS entries',short:'Wyckoff Range Engine',
  defs:{...WRE_D,limit:true,tp:4,useSl:true,sl:2},
  inputs:(b,d)=>{ fld(b,d,'entry','sel','Trade Entry Signal',{opts:['LPS / LPSY','Spring / UTAD','SOS / SOW','Spring + LPS']});
    fld(b,d,'climScore','num','Climax Score Threshold (0-100)',{min:20,max:95}); fld(b,d,'climPeak','num','Climax Peak Bar Effort (x baseline)',{min:1,max:6,step:.1});
    fld(b,d,'trendSw','num','Trend Context (lower lows in the run)',{min:1,max:6}); fld(b,d,'swingRev','num','Swing Reversal (x ATR)',{min:.5,max:6,step:.1});
    fld(b,d,'atrLen','num','ATR Period',{min:1,max:100}); fld(b,d,'effBase','num','Effort Baseline (bars)',{min:10,max:500});
    fld(b,d,'arRet','num','AR Min Retrace',{min:.1,max:1,step:.02}); fld(b,d,'minH','num','Min Range Height (x ATR)',{min:.5,max:20,step:.25}); fld(b,d,'maxH','num','Max Range Height (x ATR)',{min:2,max:40,step:.5});
    fld(b,d,'arMax','num','Max Bars To Confirm AR',{min:5,max:500}); fld(b,d,'life','num','Range Lifetime (bars)',{min:20,max:5000});
    fld(b,d,'stZone','num','ST Zone (u <=)',{min:.05,max:.9,step:.05}); fld(b,d,'maxST','num','Max ST Per Range',{min:1,max:6}); fld(b,d,'reqST','chk','Spring Needs A Prior ST');
    fld(b,d,'reclaim','num','Reclaim Deadline (bars)',{min:1,max:40}); fld(b,d,'failDist','num','Decisive Break Distance (x ATR)',{min:.1,max:5,step:.1}); fld(b,d,'testZone','num','Test Zone (u <=)',{min:.05,max:.9,step:.05});
    fld(b,d,'sosEff','num','SOS / SOW Leg Effort (x baseline)',{min:.5,max:5,step:.1}); fld(b,d,'sosLeg','num','SOS / SOW Leg Length (x ATR)',{min:.25,max:10,step:.25});
    fld(b,d,'sosLogic','sel','SOS / SOW Confirmation',{opts:['Effort OR leg length','Effort AND leg length']}); fld(b,d,'sosBuf','num','SOS / SOW Close Beyond Range (x ATR)',{min:0,max:3,step:.05});
    fld(b,d,'lpsFloor','num','LPS / LPSY Floor (u >=)',{min:.5,max:1.5,step:.05}); fld(b,d,'lpsMax','num','LPS Search Window (bars)',{min:5,max:500}); fld(b,d,'markUT','chk','Mark UT / Shakeout');
    fld(b,d,'proj','num','Target Projection (x range height)',{min:.25,max:5,step:.25}); fld(b,d,'projBars','num','Target Line Extension (bars)',{min:5,max:300});
    fld(b,d,'showEv','chk','Show Event Labels'); fld(b,d,'showPh','chk','Show Phase Dividers'); fld(b,d,'showTrade','chk','Show SL / TP guide of the last entry'); fld(b,d,'showFailed','chk','Keep Failed / Expired Ranges (gray)'); },
  sig:(c,i,n,Z)=>{ const r=wreGet(c,Z); return r.SG[i]?r.SG[i].dir:0; }};
function wreDraw(d,X,Y,W,H){
  const Z=d.o, c=candles.slice(0,-1); if(c.length<60) return; const r=wreGet(c,Z), last=c.length-1, gr='#7F8C8D';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.font='bold 11px sans-serif'; cx.textBaseline='middle';
  const all=r.rs.concat(r.cur?[r.cur]:[]), hid={}; all.forEach(g=>{ if(g.failed&&!Z.showFailed) hid[g.id]=1; });
  all.forEach(g=>{ if(hid[g.id]) return; const col=g.failed?gr:g.side===1?'#00E676':'#FF5252', x0=X(g.climaxBar), x1=X(g.end==null?last:g.end), yT=Y(g.top), yB=Y(g.bot); if(x0==null||x1==null||yT==null||yB==null) return;
    cx.globalAlpha=.07; cx.fillStyle=col; cx.fillRect(x0,Math.min(yT,yB),x1-x0,Math.abs(yB-yT)); cx.globalAlpha=.95; cx.strokeStyle=col; cx.lineWidth=2; cx.beginPath(); cx.moveTo(x0,yT); cx.lineTo(x1,yT); cx.moveTo(x0,yB); cx.lineTo(x1,yB); cx.stroke();
    cx.globalAlpha=1; cx.fillStyle=col; cx.textAlign='left'; cx.fillText((g.side===1?'ACCUMULATION':'DISTRIBUTION')+' \u00B7 '+(g.tag||'Phase '+'ABCDE'[g.stage-1]),x0+4,g.side===1?yT-8:yB+10);
    if(Z.showPh) g.divs.forEach(v=>{ const x=X(v.i); if(x==null) return; cx.globalAlpha=.55; cx.lineWidth=1; cx.setLineDash([4,4]); cx.beginPath(); cx.moveTo(x,Math.min(yT,yB)-6); cx.lineTo(x,Math.max(yT,yB)+6); cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1; const xm=X((v.from+v.i)/2); if(xm!=null){ cx.textAlign='center'; cx.fillText('Phase '+'ABCDE'[v.ph-1],xm,Math.max(yT,yB)+14); } });
    if(g.target!=null&&g.breakBar){ const y=Y(g.target), xa=X(g.breakBar), xb=X(g.breakBar+Z.projBars); if(y!=null&&xa!=null&&xb!=null){ cx.globalAlpha=.9; cx.lineWidth=2; cx.setLineDash([6,4]); cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(xb,y); cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1; cx.textAlign='left'; cx.fillText('Target',xb+3,y); } } });
  if(Z.showEv) r.EV.forEach(e=>{ if(hid[e.rid]) return; const x=X(e.i), y=Y(e.p+(e.below?-e.off:e.off)); if(x==null||y==null) return; cx.font=(e.sub?'10':'bold 12')+'px sans-serif'; cx.textAlign='center'; const w=cx.measureText(e.t).width+6;
    cx.globalAlpha=.75; cx.fillStyle='#131722'; cx.fillRect(x-w/2,y-8,w,16); cx.globalAlpha=1; cx.fillStyle=e.col; cx.fillText(e.t,x,y); });
  const ks=Object.keys(r.SG).map(Number); if(Z.showTrade&&ks.length){ const li=Math.max.apply(null,ks), g=r.SG[li], xa=X(li), xb=X(li+20);
    if(xa!=null&&xb!=null){ cx.font='bold 10px sans-serif'; cx.textAlign='left'; [[g.e,'ENTRY','#5C8AAE'],[g.sl,'SL','#E57373'],[g.tp[0],'TP1','#66BB6A'],[g.tp[1],'TP2','#66BB6A'],[g.tp[2],'TP3','#66BB6A']].forEach(([p,t,col])=>{ const y=Y(p); if(y==null) return; cx.strokeStyle=col; cx.fillStyle=col; cx.lineWidth=t==='SL'?2:1; cx.setLineDash(t==='ENTRY'?[2,3]:t==='SL'?[]:[5,4]); cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(xb,y); cx.stroke(); cx.setLineDash([]); cx.fillText(t,xb+3,y); }); } }
  cx.restore();
}
{ const _wrePrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='wreview') return wreDraw(d,X,Y,W,H); return _wrePrevDraw.apply(this,arguments); };
  const _wrePrevRE=recomputeExtras; recomputeExtras=function(){ _wrePrevRE.apply(this,arguments);
    strats.forEach(Z=>{ if(Z.k==='wre'&&stVis(Z)) scriptBoxes.push({type:'wreview',pts:[],o:Z}); }); }; }

// ---------- [mvp] indicator: MOYA Sessions & Volume Profile (port of the Pine script by RealSebastianMoya, MPL 2.0; session and profile logic derived from LeviathanCapital) ----------
const MVP_SESS=['1 Minute','2 Minutes','3 Minutes','4 Minutes','5 Minutes','6 Minutes','7 Minutes','8 Minutes','9 Minutes','10 Minutes','12 Minutes','15 Minutes','20 Minutes','25 Minutes','30 Minutes','35 Minutes','40 Minutes','45 Minutes','50 Minutes','55 Minutes','Tokyo','London','New York','1 Hour','2 Hours','3 Hours','4 Hours','5 Hours','6 Hours','7 Hours','8 Hours','9 Hours','10 Hours','11 Hours','12 Hours','Daily','2 Days','3 Days','4 Days','5 Days','6 Days','7 Days','Weekly','2 Weeks','3 Weeks','4 Weeks','5 Weeks','Monthly','2 Months','3 Months','4 Months','5 Months','6 Months','7 Months','Quarterly','Yearly'];
const MVP_WIN={'Tokyo':[0,9],'London':[7,16],'New York':[13,22]}, MVP_PX={Tiny:9,Small:11,Normal:13,Large:16,Huge:20}, MVP_KEEP=12;
function mvpRuns(c,name){
  const n=c.length, runs=[], W=MVP_WIN[name];
  const utc=t=>new Date(t*1000);
  if(W){ let st=-1; for(let i=0;i<n;i++){ const d=utc(c[i].time), h=d.getUTCHours(), inw=h>=W[0]&&h<W[1], day=Math.floor(c[i].time/86400);
      if(inw&&(st<0||day!==Math.floor(c[st].time/86400))){ if(st>=0) runs.push({s:st,e:i-1,live:false}); st=i; }
      else if(!inw&&st>=0){ runs.push({s:st,e:i-1,live:false}); st=-1; } }
    if(st>=0) runs.push({s:st,e:n-1,live:true}); return runs; }
  let mul=1, key;
  let m;
  if((m=name.match(/^(\d+) Minutes?$/))) key=t=>Math.floor(t/(60*m[1]));
  else if((m=name.match(/^(\d+) Hours?$/))) key=t=>Math.floor(t/(3600*m[1]));
  else { const base=name==='Yearly'?(t=>utc(t).getUTCFullYear()):name==='Quarterly'?(t=>{ const d=utc(t); return d.getUTCFullYear()*4+Math.floor(d.getUTCMonth()/3); }):/Month/.test(name)?(t=>{ const d=utc(t); return d.getUTCFullYear()*12+d.getUTCMonth(); }):/Week/.test(name)?(t=>Math.floor((Math.floor(t/86400)+3)/7)):(t=>Math.floor(t/86400));
    const q=name.match(/^(\d+) /); mul=q?+q[1]:1; if(mul===1) key=base; else { let cnt=0, last=null; const memo=[]; for(let i=0;i<n;i++){ const b=base(c[i].time); if(b!==last){ cnt++; last=b; } memo.push(Math.floor(cnt/mul)); } key=null; var ids=memo; } }
  const idOf=key?(i=>key(c[i].time)):(i=>ids[i]); let st=0, cur=idOf(0);
  for(let i=1;i<n;i++){ const g=idOf(i); if(g!==cur){ runs.push({s:st,e:i-1,live:false}); st=i; cur=g; } }
  runs.push({s:st,e:n-1,live:true}); return runs;
}
function mvpProfile(c,s,e,p,hi,lo){
  const R=Math.max(5,p.res|0), gap=(hi-lo)/R; if(!(gap>0)) return null;
  const tops=[], g=new Array(R).fill(0), rd=new Array(R).fill(0); for(let i=0;i<R;i++) tops.push(hi-gap*i);
  const gv=(a,b,c2,d,hh,v)=>{ const ov=Math.max(Math.min(Math.max(a,b),Math.max(c2,d))-Math.max(Math.min(a,b),Math.min(c2,d)),0), r=ov*v/hh; return isFinite(r)?r:0; };
  for(let q=s;q<=e;q++){ const k=c[q], v=k.volume||0; if(!v) continue; const bt=Math.max(k.close,k.open), bb=Math.min(k.close,k.open), up=k.close>=k.open, tw=k.high-bt, bw=bb-k.low, body=bt-bb, den=2*tw+2*bw+body;
    const bv=den>0?body*v/den:0, tv=den>0?2*tw*v/den:0, wv=den>0?2*bw*v/den:0;
    for(let i=0;i<R;i++){ const zt=tops[i], zb=zt-gap, w=gv(zb,zt,bt,k.high,tw,tv)/2+gv(zb,zt,bb,k.low,bw,wv)/2, bd=gv(zb,zt,bb,bt,body,bv); g[i]+=(up?bd:0)+w; rd[i]+=(up?0:bd)+w; } }
  let mx=0, pi=0; for(let i=0;i<R;i++){ const t=g[i]+rd[i]; if(t>mx){ mx=t; pi=i; } }
  const poc=tops[pi]-gap/2; let sum=0; for(let i=0;i<R;i++) sum+=g[i]+rd[i];
  let cnt=g[pi]+rd[pi], vah=hi, val=lo; const tg=sum*(p.VA/100);
  for(let i=1;i<=R;i++){ const u=pi-i, d=pi+i; if(u>=0&&u<R){ cnt+=g[u]+rd[u]; if(cnt>=tg) break; vah=tops[u]; } if(d>=0&&d<R){ cnt+=g[d]+rd[d]; if(cnt>=tg) break; val=tops[d]-gap; } }
  const tot=g.map((x,i)=>x+rd[i]), mean=sum/R, nodes=[];
  if(mean>0&&(p.showHVN||p.showLVN)){ const zones=(test,pick)=>{ const out=[]; let i=0; while(i<R){ if(test(tot[i])){ let j=i, v=tot[i]; while(j<R&&test(tot[j])){ v=pick(v,tot[j]); j++; } if(j-i>=p.minBins) out.push({v,a:i,b:j-1}); i=j; } else i++; } return out; };
    if(p.showLVN) zones(x=>x<=mean*p.lvnThr,Math.min).sort((x,y)=>x.v-y.v).slice(0,p.maxNodes).forEach(z=>nodes.push({t:'LVN',top:tops[z.a],bot:tops[z.b]-gap}));
    if(p.showHVN) zones(x=>x>=mean*p.hvnThr,Math.max).sort((x,y)=>y.v-x.v).slice(0,p.maxNodes).forEach(z=>nodes.push({t:'HVN',top:tops[z.a],bot:tops[z.b]-gap})); }
  return {tops,g,rd,gap,poc,vah,val,rmv:Math.max(...g)+Math.max(...rd),nodes};
}
function mvpCompute(c,p){
  const n=c.length; if(n<5) return null; const runs=mvpRuns(c,p.sess), S=[]; let live=null;
  const build=(r,isLive)=>{ const s=r.s, e=isLive?r.e-1:r.e; if(e<s) return null; let hi=-Infinity, lo=Infinity; for(let q=Math.max(0,s-1);q<=e;q++){ if(c[q].high>hi) hi=c[q].high; if(c[q].low<lo) lo=c[q].low; }
    const pr=mvpProfile(c,s,e,p,hi,lo); if(!pr) return null; return {s,e,hi,lo,pr,L:e+1-s,live:isLive}; };
  runs.slice(-MVP_KEEP-1).forEach(r=>{ if(r.live&&(!MVP_WIN[p.sess]||r.e===n-1)){ live=build(r,true); } else if(!r.live){ const b=build(r,false); if(b) S.push(b); } });
  const fx=[]; if(p.showFx) Object.keys(MVP_WIN).forEach(nm=>{ mvpRuns(c,nm).filter(r=>!r.live).slice(-8).forEach(r=>{ let hi=-Infinity, lo=Infinity; for(let q=r.s;q<=r.e;q++){ if(c[q].high>hi) hi=c[q].high; if(c[q].low<lo) lo=c[q].low; } fx.push({nm,s:r.s,e:r.e,hi,lo}); }); });
  return {S,live,fx,n,last:c[n-1].close};
}
IND.mvp={label:'MOYA Sessions & Volume Profile',title:'MOYA Sessions & Volume Profile',cat:'Volume',cols:[],calc:()=>[],live:true,
  nm:p=>'MOYA Sessions & Volume Profile '+p.sess,
  p:{sess:'Daily',showProf:true,showPoc:true,showVA:true,showVAb:false,showCur:true,showLabels:true,showFx:false,extend:false,extBars:50,res:30,VA:70,mode:'Mode 2',showHVN:false,showLVN:false,nodeStyle:'Box',hvnThr:1.5,lvnThr:.4,minBins:1,maxNodes:3,showNodeLbl:true,
    sessLblCol:'#ffffff',sessLblSize:'Normal',lvlLblSize:'Small',bullCol:'#376b89',bearCol:'#3e3f4c',pocCol:'#f23645',vahCol:'#2962ff',valCol:'#9aa3b8',showBox:true,boxCol:'#787b86',showPanel:true,panelPos:'Top Right',
    vr:{Ticks:{on:true},Seconds:{on:true,min:1,max:59},Minutes:{on:true,min:1,max:59},Hours:{on:true,min:1,max:24},Days:{on:true,min:1,max:366},Weeks:{on:true,min:1,max:52},Months:{on:true,min:1,max:12},Ranges:{on:true}}},
  fields:[['sess','sel','Session Type',{opts:MVP_SESS}],['showProf','chk','Show Volume Profile'],['showPoc','chk','Show POC'],['showVA','chk','Show VAH and VAL'],['showVAb','chk','Show Value Area Box'],['showCur','chk','Show Live Zone'],['showLabels','chk','Show Labels'],['showFx','chk','Show Forex Sessions'],
    ['extend','chk','Extend Lines Right'],['extBars','num','Extension Bars',{min:1,max:500}],['res','num','Resolution',{min:5,max:100}],['VA','num','Value Area %',{min:1,max:100}],['mode','sel','Bar Mode',{opts:['Mode 1','Mode 2','Mode 3']}],
    ['showHVN','chk','Show HVN (High Volume Nodes)'],['showLVN','chk','Show LVN (Low Volume Nodes)'],['nodeStyle','sel','Node Style',{opts:['Box','Line Only']}],['hvnThr','num','HVN Threshold (x Average Volume)',{min:1,max:5,step:.1}],['lvnThr','num','LVN Threshold (x Average Volume)',{min:.05,max:1,step:.05}],
    ['minBins','num','Min Zone Size (bins)',{min:1,max:10}],['maxNodes','num','Max Nodes per Type (per session)',{min:1,max:10}],['showNodeLbl','chk','Show Node Labels'],
    ['sessLblSize','sel','Session Label Size',{opts:['Tiny','Small','Normal','Large','Huge']}],['lvlLblSize','sel','POC / VAH / VAL Label Size',{opts:['Tiny','Small','Normal','Large','Huge']}],
    ['sessLblCol','col','Session Label Color'],['bullCol','col','Bullish Volume'],['bearCol','col','Bearish Volume'],['pocCol','col','POC'],['vahCol','col','VAH'],['valCol','col','VAL'],['showBox','chk','Show Zone Box'],['boxCol','col','Box Border'],
    ['showPanel','chk','Show Panel'],['panelPos','sel','Panel Position',{opts:['Top Right','Top Left','Bottom Right','Bottom Left']}]],
  extras:(c,p)=>({mk:[],boxes:[{type:'mvpview',pts:[],r:mvpCompute(c,p),o:p}],labels:[],stat:''})};
function mvpDraw(d,X,Y,W,H){
  const r=d.r, p=d.o; if(!r) return; const rgba=(h,a)=>{ const v=h.replace('#',''); return 'rgba('+parseInt(v.slice(0,2),16)+','+parseInt(v.slice(2,4),16)+','+parseInt(v.slice(4,6),16)+','+a+')'; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  const one=(z)=>{ const pr=z.pr, s=z.s, e=z.e, L=z.L, lm=s, rm=(e+1)-Math.floor(L/1.4), lineEnd=e+(p.extend?p.extBars:0), buf=pr.gap/10, xs=X(s), xe=X(e), yH=Y(z.hi), yL=Y(z.lo); if(xs==null||xe==null||yH==null||yL==null) return;
    if(p.showProf) for(let i=0;i<pr.tops.length;i++){ const zt=pr.tops[i], zb=zt-pr.gap, y0=Y(zt-buf), y1=Y(zb+buf); if(y0==null||y1==null) continue; const gE=lm+(rm-lm)*(pr.g[i]/pr.rmv), rE=gE+(rm-lm)*(pr.rd[i]/pr.rmv), h=Math.max(1,Math.abs(y1-y0)), t=Math.min(y0,y1);
      const rect=(a,b,col)=>{ const xa=X(a), xb=X(b); if(xa==null||xb==null) return; cx.fillStyle=rgba(col,.5); cx.fillRect(Math.min(xa,xb),t,Math.abs(xb-xa),h); };
      if(p.mode==='Mode 2'){ rect(lm,gE,p.bullCol); rect(gE,rE,p.bearCol); } else if(p.mode==='Mode 1') rect(lm,gE,p.bullCol); else { rect(lm,gE,p.bullCol); rect(lm-(rE-gE),lm,p.bearCol); } }
    if(p.showBox){ cx.strokeStyle=p.boxCol; cx.lineWidth=1.5; cx.setLineDash([6,4]); cx.strokeRect(xs,Math.min(yH,yL),xe-xs,Math.abs(yL-yH)); cx.setLineDash([]); }
    if(p.showLabels){ const xm=X((e+lm)/2); if(xm!=null){ cx.font='bold '+MVP_PX[p.sessLblSize]+'px sans-serif'; cx.fillStyle=p.sessLblCol; cx.textAlign='center'; cx.fillText(p.sess,xm,yH-MVP_PX[p.sessLblSize]); } }
    const xl=X(lineEnd), lbl=(price,t,col,y)=>{ cx.font=MVP_PX[p.lvlLblSize]+'px sans-serif'; cx.fillStyle=col; cx.textAlign='left'; cx.fillText(t+' '+p.sess,xl+3,y); }, ln=(price,col,t)=>{ const y=Y(price); if(y==null||xl==null) return; cx.strokeStyle=col; cx.lineWidth=1.5; cx.beginPath(); cx.moveTo(xs,y); cx.lineTo(xl,y); cx.stroke(); lbl(price,t,col,y); };
    if(p.showPoc) ln(pr.poc,p.pocCol,'POC'); if(p.showVA){ ln(pr.vah,p.vahCol,'VAH'); ln(pr.val,p.valCol,'VAL'); }
    if(p.showVAb){ const a=Y(pr.vah), b=Y(pr.val); if(a!=null&&b!=null){ cx.fillStyle=rgba('#6b9fff',.12); cx.fillRect(xs,Math.min(a,b),xe-xs,Math.abs(b-a)); } }
    if(!z.live) pr.nodes.forEach(nd=>{ const yt=Y(nd.top), yb=Y(nd.bot); if(yt==null||yb==null) return; const hv=nd.t==='HVN', col=hv?'#00e5ff':'#ff9800', mid=(yt+yb)/2;
      if(p.nodeStyle==='Box'){ cx.fillStyle=rgba(col,.15); cx.fillRect(xs,Math.min(yt,yb),xe-xs,Math.abs(yb-yt)); }
      cx.strokeStyle=col; cx.lineWidth=hv?2:1; cx.setLineDash([5,4]); cx.beginPath(); cx.moveTo(xs,mid); cx.lineTo(xl,mid); cx.stroke(); cx.setLineDash([]);
      if(p.showNodeLbl){ cx.font='9px sans-serif'; cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText(nd.t,xl+3,mid); } }); };
  r.S.forEach(one); if(p.showCur&&r.live) one(r.live);
  r.fx.forEach(f=>{ const xs=X(f.s), xe=X(f.e), a=Y(f.hi), b=Y(f.lo); if(xs==null||xe==null||a==null||b==null) return; if(p.showBox){ cx.strokeStyle=p.boxCol; cx.lineWidth=1.5; cx.setLineDash([6,4]); cx.strokeRect(xs,Math.min(a,b),xe-xs,Math.abs(b-a)); cx.setLineDash([]); }
    if(p.showLabels){ cx.font='bold '+MVP_PX[p.sessLblSize]+'px sans-serif'; cx.fillStyle=p.sessLblCol; cx.textAlign='center'; cx.fillText(f.nm,(xs+xe)/2,Math.min(a,b)-MVP_PX[p.sessLblSize]); } });
  if(p.showPanel&&r.live){ const z=r.live.pr, f=v=>fmt(v), pos=p.panelPos, rows=[['MOYA Volume Profile',p.sess,'#f43f5e'],['POC',f(z.poc),'#f43f5e'],['VAH',f(z.vah),'#00bfa5'],['VAL',f(z.val),'#00bfa5'],['POC Dist.',f(r.last-z.poc),r.last-z.poc>=0?'#00bfa5':'#f43f5e'],['Price vs VA',r.last>z.vah?'\u25B2 Above VA':r.last<z.val?'\u25BC Below VA':'\u25CF Inside VA',r.last>z.vah?'#00bfa5':r.last<z.val?'#f43f5e':'#fff'],['VA %',p.VA+'%','#fff']];
    const rh=16, w1=96, w2=120, pw=w1+w2, ph=rows.length*rh, x0=/Right/.test(pos)?W-pw-6:6, y0=/Top/.test(pos)?6:H-ph-6;
    cx.fillStyle='rgba(11,15,23,.88)'; cx.fillRect(x0,y0,pw,ph); cx.font='11px sans-serif'; cx.textAlign='left';
    rows.forEach((q,i)=>{ if(i===0){ cx.fillStyle='#f43f5e'; cx.fillRect(x0,y0,pw,rh); } cx.fillStyle='#fff'; cx.fillText(q[0],x0+6,y0+i*rh+rh/2); cx.fillStyle=i===0?'#fff':q[2]; cx.fillText(q[1],x0+w1+6,y0+i*rh+rh/2); }); }
  cx.restore();
}
{ const _mvpPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='mvpview') return mvpDraw(d,X,Y,W,H); return _mvpPrevDraw.apply(this,arguments); }; }
/*@@part 12*/
try{
const scrS={};
const scrEma=(a,len)=>{ const k=2/(len+1), o=new Array(a.length); let e=a[0]; for(let i=0;i<a.length;i++){ e=i?a[i]*k+e*(1-k):a[0]; o[i]=e; } return o; };
function scrSyms(Z){ return String(Z.scrTick||'').toUpperCase().split(/[\s,;]+/).filter(x=>/^[A-Z0-9]{5,20}$/.test(x)).filter((x,i,a)=>a.indexOf(x)===i).slice(0,10); }
const scrPx=v=>v>=100?v.toFixed(2):v>=1?v.toFixed(4):Number(v.toPrecision(4)).toString();
function scrRow(sym,k,Z){
  const c=k.map(x=>({time:Math.floor(x[0]/1000),open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]}));
  if(c.length<80||!window.__snoCompute) return {sym,err:'no data'};
  const r=window.__snoCompute(c,{sens:Z.scrSens||12,sigMode:'Confirmation',sigFilter:'All',thr:.4,rzLen:50,rz1:1.8,rz2:2.6,rz3:3.4,trendFilter:false});
  const n=c.length, L=n-1, cl=c.map(x=>x.close), d=r.dash, px=cl[L], chg=cl[L-1]?(px/cl[L-1]-1)*100:0;
  const hl2=c.map(x=>(x.high+x.low)/2), e1=scrEma(hl2,21), e2=scrEma(e1,21), trc=px>2*e1[L]-e2[L]?1:-1;
  let hi=-1e18,lo=1e18; for(let j=L-39;j<=L;j++){ hi=Math.max(hi,c[j].high); lo=Math.min(lo,c[j].low); }
  const cat=px>((hi+lo)/2+scrEma(cl,20)[L])/2?1:-1;
  const ls=r.sigs[r.sigs.length-1]||null, exits=ls?r.exits.filter(e=>e.i>ls.i&&e.d===ls.v).length:0;
  const zone=px>=r.U[0][L]?1:px<=r.L[0][L]?-1:0;
  const it=[ls?(ls.v>0?1:0):null,d.dir>0?1:0,px>r.cen[L]?1:0,cat>0?1:0,trc>0?1:0,d.vs==null?null:(d.vs>=50?1:0)].filter(x=>x!=null);
  const pct=it.length?it.reduce((a,x)=>a+x,0)/it.length*100:50;
  return {sym,px,chg,pct,sig:ls?{v:ls.v,strong:!!ls.strong}:null,exits,trail:d.dir,cat,trc,zone,trend:d.trend,trending:d.trending,vol:d.vol,volLbl:d.volLbl.split(' ')[0],sq:d.sq,vs:d.vs};
}
async function scrFetch(Z,st){
  st.loading=true; st.ts=Date.now(); const syms=scrSyms(Z), iv=Z.scrTf||'1h';
  try{ const rows=await Promise.all(syms.map(async s=>{ try{ const r=await fetch(`${RB(s)}/klines?symbol=${s}&interval=${iv}&limit=500`); if(!r.ok) throw 0; const k=await r.json(); if(!Array.isArray(k)) throw 0; return scrRow(s,k,Z); }catch(e){ return {sym:s,err:'n/a'}; } }));
    st.rows=rows; }catch(e){}
  st.loading=false; st.ts=Date.now(); try{ drawInds(); }catch(e){}
}
function scrGet(Z){ const key=[scrSyms(Z).join(','),Z.scrTf,Z.scrSens].join('|'); let st=scrS[Z.sid];
  if(!st||st.key!==key){ st=scrS[Z.sid]={key,rows:st?st.rows:[],ts:0,loading:false}; }
  if(!st.loading&&Date.now()-st.ts>60000) scrFetch(Z,st); return st; }
const scrRate=p=>p>80?['\u25b2 Strong Bullish',2]:p>60?['\u25b3 Bullish',1]:p>=40?['\u2015 Neutral',0]:p>=20?['\u25bd Bearish',-1]:['\u25bc Strong Bearish',-2];
function scrView(Z){
  const st=scrGet(Z); let rows=(st.rows||[]).filter(r=>!r.err);
  const rf=Z.scrRate||'All', sf=Z.scrSig||'All';
  rows=rows.filter(r=>{ const rt=scrRate(r.pct)[1];
    if(rf==='Any Bullish'&&rt<=0) return false; if(rf==='Any Bearish'&&rt>=0) return false;
    if(rf==='Strong Bullish'&&rt!==2) return false; if(rf==='Bullish'&&rt!==1) return false; if(rf==='Neutral'&&rt!==0) return false; if(rf==='Bearish'&&rt!==-1) return false; if(rf==='Strong Bearish'&&rt!==-2) return false;
    if(sf==='Any Buy'&&!(r.sig&&r.sig.v>0)) return false; if(sf==='Any Sell'&&!(r.sig&&r.sig.v<0)) return false; return true; });
  const sk={'Rating':r=>r.pct,'% CHG':r=>r.chg,'Trend Strength':r=>r.trend,'Volatility':r=>r.vol,'Volume Sentiment':r=>r.vs==null?-1:r.vs,'Price':r=>r.px}[Z.scrSort];
  if(sk){ const m=Z.scrOrder==='Ascending'?1:-1; rows=rows.slice().sort((a,b)=>m*(sk(a)-sk(b))); }
  return {rows,st,bad:(st.rows||[]).filter(r=>r.err).length};
}
function scrDraw(d,X,Y,W,H){
  const Z=d.o; const V=scrView(Z), rows=V.rows;
  const pos=Z.scrPos||'#089981', neg=Z.scrNeg||'#f23645', tx=Z.scrTxt||'#d1d4dc', mu='#8a91a5', blue='#2962ff';
  const dirT=v=>[v>0?'\u25b2 Bullish':'\u25bc Bearish',v>0?pos:neg];
  const cols=[
    {h:'TICKER',w:74,f:r=>[r.sym.replace(/USDT$/,'')+' \u00b7 '+(Z.scrTf||'1h').toUpperCase(),tx]},
    Z.cPrice!==false&&{h:'PRICE',w:72,f:r=>[scrPx(r.px),tx]},
    {h:'% CHG',w:58,f:r=>[(r.chg>=0?'+':'')+r.chg.toFixed(2)+'%',r.chg>=0?pos:neg]},
    {h:'RATING',w:106,f:r=>{ const q=scrRate(r.pct); return [q[0],q[1]>0?pos:q[1]<0?neg:mu]; }},
    {h:'SIGNAL',w:52,f:r=>r.sig?[(r.sig.v>0?'\u25b2':'\u25bc')+(r.sig.strong?'+':''),'#fff',r.sig.v>0?pos:neg]:['\u2015',mu]},
    {h:'EXITS',w:44,f:r=>r.sig?[String(r.exits),'#fff',blue]:['\u2015',mu]},
    {h:'SMART TRAIL',w:78,f:r=>dirT(r.trail)},
    Z.cCat!==false&&{h:'CATCHER',w:72,f:r=>dirT(r.cat)},
    Z.cTrc!==false&&{h:'TRACER',w:72,f:r=>dirT(r.trc)},
    Z.cZone&&{h:'ZONES',w:76,f:r=>r.zone>0?['Overbought',neg]:r.zone<0?['Oversold',pos]:['Neutral',mu]},
    {h:'TREND STRENGTH',w:96,f:r=>[(r.trending?'\u2191 ':'\u2744 ')+r.trend+'%',r.trending?pos:'#4aa3ff']},
    {h:'LUX VOLATILITY',w:94,f:r=>[(r.volLbl==='High'?'\u26a0 ':r.volLbl==='Low'?'\u2198 ':'\u2014 ')+r.volLbl,r.volLbl==='High'?'#f5c542':r.volLbl==='Low'?'#4aa3ff':tx]},
    Z.cSq!==false&&{h:'SQUEEZE',w:62,f:r=>[r.sq+'%',r.sq>=70?'#a78bfa':tx]},
    Z.cVs!==false&&{h:'VOL SENT.',w:66,f:r=>r.vs==null?['n/a',mu]:[r.vs+'%',r.vs>=55?pos:r.vs<=45?neg:tx]}
  ].filter(Boolean);
  const tw=cols.reduce((a,q)=>a+q.w,0), rh=24, th=16+(rows.length+1)*rh+(V.bad||!rows.length?16:0), s=Math.min(1,(W-12)/tw);
  const x0=Math.max(4,(W-tw*s)/2), y0=Z.scrPlace==='Top'?8:Z.scrPlace==='Middle'?Math.max(8,(H-th*s)/2):Math.max(8,H-th*s-34);
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.translate(x0,y0); cx.scale(s,s); cx.setLineDash([]);
  cx.fillStyle='rgba(16,20,29,.94)'; cx.fillRect(0,0,tw,th); cx.strokeStyle='rgba(255,255,255,.14)'; cx.strokeRect(0,0,tw,th);
  cx.font='bold 10px system-ui'; cx.textBaseline='middle'; cx.textAlign='left'; cx.fillStyle=mu;
  cx.fillText('Screener (S&O) \u00b7 '+(Z.scrTf||'1h')+(V.st.loading?' \u00b7 loading\u2026':''),8,9);
  let x=0; cols.forEach(q=>{ cx.fillStyle=mu; cx.font='bold 9px system-ui'; cx.fillText(q.h,x+6,16+rh/2); x+=q.w; });
  cx.strokeStyle='rgba(255,255,255,.14)'; cx.beginPath(); cx.moveTo(0,16+rh); cx.lineTo(tw,16+rh); cx.stroke();
  rows.forEach((r,k)=>{ const y=16+(k+1)*rh; let xx=0; if(k%2) { cx.fillStyle='rgba(255,255,255,.03)'; cx.fillRect(0,y,tw,rh); }
    cols.forEach(q=>{ const v=q.f(r); if(v[2]){ cx.fillStyle=v[2]; cx.fillRect(xx+2,y+2,q.w-4,rh-4); cx.textAlign='center'; cx.fillStyle=v[1]; cx.font='bold 11px system-ui'; cx.fillText(v[0],xx+q.w/2,y+rh/2); cx.textAlign='left'; }
      else { cx.fillStyle=v[1]; cx.font=(q.h==='TICKER'?'bold ':'')+'10.5px system-ui'; cx.fillText(v[0],xx+6,y+rh/2); } xx+=q.w; }); });
  if(!rows.length||V.bad){ cx.fillStyle=mu; cx.font='9px system-ui'; cx.fillText(!rows.length?(V.st.loading||!V.st.ts?'Loading tickers\u2026':'No tickers match the filters'):V.bad+' ticker(s) returned no data',8,th-9); }
  cx.restore();
}
STRATS.scr={label:'Screener (S&O) \u00b7 scans up to 10 tickers: rating, signal, exits, Smart Trail, Catcher, Tracer, trend strength, volatility, squeeze, volume sentiment, filter + sort',short:'Screener (S&O)',own:true,
  defs:{scrTick:'BTCUSDT,ETHUSDT,SOLUSDT,BNBUSDT,XRPUSDT,DOGEUSDT',scrTf:'1h',scrSens:12,scrSort:'Rating',scrOrder:'Descending',scrRate:'All',scrSig:'All',scrPlace:'Bottom',
    cPrice:true,cCat:true,cTrc:true,cZone:false,cSq:true,cVs:true,scrPos:'#089981',scrNeg:'#f23645',scrTxt:'#d1d4dc'},
  inputs:(b,d)=>{
    fld(b,d,'scrTick','txt','Tickers (up to 10, Binance, comma separated)'); fld(b,d,'scrTf','sel','Timeframe',{opts:['5m','15m','1h','4h','1d']});
    fld(b,d,'scrSens','num','Signal sensitivity',{min:2,max:50,step:1});
    fld(b,d,'scrRate','sel','Filter: rating',{opts:['All','Any Bullish','Any Bearish','Strong Bullish','Bullish','Neutral','Bearish','Strong Bearish']});
    fld(b,d,'scrSig','sel','Filter: last signal',{opts:['All','Any Buy','Any Sell']});
    fld(b,d,'scrSort','sel','Sort by',{opts:['None','Rating','% CHG','Price','Trend Strength','Volatility','Volume Sentiment']}); fld(b,d,'scrOrder','sel','Sort order',{opts:['Descending','Ascending']});
    fld(b,d,'scrPlace','sel','Table position',{opts:['Top','Middle','Bottom']});
    fld(b,d,'cPrice','chk','Column: price'); fld(b,d,'cCat','chk','Column: Trend Catcher'); fld(b,d,'cTrc','chk','Column: Trend Tracer'); fld(b,d,'cZone','chk','Column: Reversal Zones');
    fld(b,d,'cSq','chk','Column: squeeze'); fld(b,d,'cVs','chk','Column: volume sentiment');
    fld(b,d,'scrPos','col','Bullish color'); fld(b,d,'scrNeg','col','Bearish color'); fld(b,d,'scrTxt','col','Text color'); },
  sig:()=>0};
try{ DESC.scr='Strategy \u00b7 LuxAlgo-style screener table: scans up to 10 tickers with rating, signals, trail status, trend strength, volatility; filter + sort (no trades)'; }catch(e){}
{ const _scO=runOne; runOne=function(Z,quiet,out){ if(!Z||Z.k!=='scr') return _scO.apply(this,arguments); Z._stat='Screener \u00b7 '+scrSyms(Z).length+' tickers \u00b7 '+(Z.scrTf||'1h'); }; }
{ const _scD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='scrview') return scrDraw(d,X,Y,W,H); return _scD.apply(this,arguments); };
  const _scR=recomputeExtras; recomputeExtras=function(){ _scR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='scr'&&stVis(Z)) scriptBoxes.push({type:'scrview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('scr strategy failed',err); window.__scrErr=err; }
//# sourceURL=tools-8.js
