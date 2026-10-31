/* tools-8.js — MarketPlusView tool code. Several small pieces in one file: each piece after a part marker line is run by index.html inside start() at the spot where that code used to be (same order, same scope).
   Keep the file name and the markers. Tools in this file: IND.fob, IND.tpo, IND.sbx, IND.rzr, IND.rbs, IND.scr, IND.cus, IND.cusp, STRATS.ccz, STRATS.wre, IND.mvp, STRATS.scr, IND.rva (Reinblacks Volume Profile & Auction Strategy + Module 2: three-setup session profile engine) */
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
/* ===== Thomas Trend Cloud Pro (port of the Pine v6 indicator): trend cloud, buy/sell arrows, double top/bottom circles, BOS/CHoCH, FVG zones, Entry/TP1/TP2, dashboard ===== */
function tcpCore(c,p){
  const n=c.length, R={n,atr:[],bull:[],up:[],lo:[],basis:[],buy:[],sell:[],circ:[],bos:[],fvg:[],sig:null,last:'WAIT'};
  if(n<3) return R;
  const atr=atrW(c,p.atrLen), k=2/(p.emaLen+1); let e=NaN, sm=0;
  for(let i=0;i<n;i++){ sm+=c[i].close; if(i>=p.emaLen) sm-=c[i-p.emaLen].close;
    if(i<p.emaLen-1) e=NaN; else if(i===p.emaLen-1) e=sm/p.emaLen; else e=c[i].close*k+e*(1-k);
    R.basis[i]=e; const a=atr[i], ok=isFinite(e)&&isFinite(a); R.up[i]=ok?e+a*.8:NaN; R.lo[i]=ok?e-a*.8:NaN; R.atr[i]=a; }
  // supertrend (Pine ta.supertrend): direction -1 = bullish
  let fu=NaN, fl=NaN, dir=1, st=NaN; const bear=[];
  for(let i=0;i<n;i++){ const a=atr[i];
    if(!isFinite(a)){ R.bull[i]=false; bear[i]=false; continue; }
    const hl=(c[i].high+c[i].low)/2, bu=hl+p.atrFactor*a, bl=hl-p.atrFactor*a;
    if(!isFinite(fu)){ fu=bu; fl=bl; dir=1; st=fu; }
    else { const pc=c[i-1].close, pfu=fu, pfl=fl; fl=(bl>pfl||pc<pfl)?bl:pfl; fu=(bu<pfu||pc>pfu)?bu:pfu;
      dir=(st===pfu)?(c[i].close>fu?-1:1):(c[i].close<fl?1:-1); st=dir===-1?fl:fu; }
    R.bull[i]=dir<0; bear[i]=dir>0; }
  const tol=p.tolerance, L=p.swingLen, mt=1e-8;
  let pH=NaN,pHb=-1,pL=NaN,pLb=-1, sH=NaN,sL=NaN, psH=NaN,psL=NaN, mTrend=0;
  for(let i=0;i<n;i++){
    const buy=i>0&&R.bull[i]&&bear[i-1], sell=i>0&&bear[i]&&R.bull[i-1];
    if(buy){ R.buy.push(i); R.last='BUY'; R.sig={i,buy:true}; } if(sell){ R.sell.push(i); R.last='SELL'; R.sig={i,buy:false}; }
    const j=i-L;
    if(j>=L){
      if(pivAt(c,j,L,L,'h')){ const v=c[j].high;
        if(isFinite(pH)&&Math.abs(v-pH)/Math.max(Math.abs(pH),mt)*100<=tol){ R.circ.push({i:pHb,p:pH,top:true},{i:j,p:v,top:true}); }
        pH=v; pHb=j; sH=v; }
      if(pivAt(c,j,L,L,'l')){ const v=c[j].low;
        if(isFinite(pL)&&Math.abs(v-pL)/Math.max(Math.abs(pL),mt)*100<=tol){ R.circ.push({i:pLb,p:pL,top:false},{i:j,p:v,top:false}); }
        pL=v; pLb=j; sL=v; } }
    const bb=isFinite(sH)&&isFinite(psH)&&c[i].close>sH&&c[i-1].close<=psH, sb=isFinite(sL)&&isFinite(psL)&&c[i].close<sL&&c[i-1].close>=psL;
    if(bb){ const ch=mTrend===-1; R.bos.push({i,up:true,ch}); mTrend=1; }
    if(sb){ const ch=mTrend===1; R.bos.push({i,up:false,ch}); mTrend=-1; }
    psH=sH; psL=sL;
    if(i>=2){ if(c[i].low>c[i-2].high) R.fvg.push({l:i-2,top:c[i].low,bot:c[i-2].high,bull:true});
      if(c[i].high<c[i-2].low) R.fvg.push({l:i-2,top:c[i-2].low,bot:c[i].high,bull:false}); } }
  R.fvg=R.fvg.slice(-Math.max(1,p.maxFVG)); R.circ=R.circ.slice(-300); R.bos=R.bos.slice(-150);
  if(R.sig){ const i=R.sig.i, d=Math.max(R.atr[i]*p.tp1ATR,c[i].close*1e-8), gap=p.tpGapPips*p.pipSize, b=R.sig.buy;
    R.sig.entry=c[i].close; R.sig.tp1=b?R.sig.entry+d:R.sig.entry-d; R.sig.tp2=b?R.sig.tp1+gap:R.sig.tp1-gap; }
  return R;
}
IND.tcp={label:'Thomas Trend Cloud Pro',title:'Thomas Trend Cloud Pro',cat:'Trend',live:true,
  nm:p=>`Thomas Trend Cloud Pro ${p.emaLen} ${p.atrLen} ${p.atrFactor}`,
  p:{emaLen:20,atrLen:10,atrFactor:2.5,pipSize:.1,tpGapPips:300,tp1ATR:1.5,rightBars:12,swingLen:5,tolerance:.3,
    showCloud:true,showTri:true,showPatterns:true,showStructure:true,showFVG:true,maxFVG:3,showTargets:true,showDash:true,
    buyCol:'#19b491',sellCol:'#be872d'},
  cols:['#8a91a5','#8a91a5','#6b7388'],
  fields:[['emaLen','num','Cloud Length',{min:2,max:500}],['atrLen','num','ATR Length',{min:2,max:200}],['atrFactor','num','Trend Sensitivity',{min:.5,step:.1}],
    ['pipSize','num','Pip Size (Broker Dependent)',{min:.00001,step:'any'}],['tpGapPips','num','TP1 to TP2 Gap (Pips)',{min:1,step:1}],['tp1ATR','num','TP1 Distance (ATR)',{min:.1,step:.1}],
    ['rightBars','num','Right Label Distance',{min:2,max:100,step:1}],['swingLen','num','Pattern Swing Length',{min:2,max:50,step:1}],['tolerance','num','Double Pattern Tolerance (%)',{min:.05,step:.05}],
    ['showCloud','chk','Show Trend Cloud fill'],['showTri','chk','Show BUY / SELL arrows'],['showPatterns','chk','Double Top / Bottom Circles'],['showStructure','chk','Show BOS / CHoCH'],
    ['showFVG','chk','Show FVG Zones'],['maxFVG','num','Maximum FVG Zones',{min:1,max:10,step:1}],['showTargets','chk','Show Entry / TP1 / TP2'],['showDash','chk','Show Dashboard'],
    ['buyCol','col','BUY colour'],['sellCol','col','SELL colour']],
  calc:(c,p)=>{ const R=tcpCore(c,p), f=a=>{ const o=[]; for(let i=0;i<R.n;i++) if(isFinite(a[i])) o.push({time:c[i].time,value:a[i]}); return o; }; return [f(R.up),f(R.lo),f(R.basis)]; },
  extras:(c,p)=>{ const R=tcpCore(c,p), mk=[], ev=[];
    R.buy.forEach(i=>{ if(p.showTri) mk.push({time:c[i].time,position:'belowBar',color:p.buyCol,shape:'arrowUp',text:'',keep:true}); ev.push({k:'tcpB'+c[i].time,time:c[i].time,msg:'BUY · Thomas Trend Cloud Pro',col:'#19b491'}); });
    R.sell.forEach(i=>{ if(p.showTri) mk.push({time:c[i].time,position:'aboveBar',color:p.sellCol,shape:'arrowDown',text:'',keep:true}); ev.push({k:'tcpS'+c[i].time,time:c[i].time,msg:'SELL · Thomas Trend Cloud Pro',col:'#be872d'}); });
    return {mk,ev:ev.slice(-30),labels:[],stat:'',boxes:[{type:'tcpview',pts:[],r:R,o:p,c}]}; }};
function tcpDraw(d,X,Y,W,H){
  const R=d.r, p=d.o, c=d.c; if(!R||!R.n) return; const n=R.n, TEAL='#19b491', RED='#e5484d', BLUE='#2962ff', GREEN='#26a65b';
  const rgba=(h,a)=>{ const v=h.replace('#',''); return 'rgba('+parseInt(v.slice(0,2),16)+','+parseInt(v.slice(2,4),16)+','+parseInt(v.slice(4,6),16)+','+a+')'; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  if(p.showCloud){ const xs=[],yu=[],yl=[]; for(let i=0;i<n;i++){ if(!isFinite(R.up[i])) continue; const x=X(i), a=Y(R.up[i]), b=Y(R.lo[i]); if(x==null||a==null||b==null) continue; xs.push(x); yu.push(a); yl.push(b); }
    if(xs.length>1){ cx.beginPath(); cx.moveTo(xs[0],yu[0]); for(let k=1;k<xs.length;k++) cx.lineTo(xs[k],yu[k]); for(let k=xs.length-1;k>=0;k--) cx.lineTo(xs[k],yl[k]); cx.closePath(); cx.fillStyle='rgba(128,134,150,.18)'; cx.fill(); } }
  if(p.showFVG) R.fvg.forEach(f=>{ const x0=X(f.l), y0=Y(f.top), y1=Y(f.bot); if(x0==null||y0==null||y1==null) return; const col=f.bull?'#009688':'#f23645';
    cx.fillStyle=rgba(col,.14); cx.fillRect(x0,Math.min(y0,y1),Math.max(0,W-x0),Math.abs(y1-y0)); cx.strokeStyle=rgba(col,.45); cx.lineWidth=1; cx.strokeRect(x0,Math.min(y0,y1),Math.max(0,W-x0),Math.abs(y1-y0)); });
  if(p.showPatterns) R.circ.forEach(q=>{ const x=X(q.i), y=Y(q.p); if(x==null||y==null) return; cx.beginPath(); cx.arc(x,y,6,0,6.2832); cx.fillStyle=q.top?RED:TEAL; cx.fill(); });
  if(p.showStructure){ cx.font='bold 10px system-ui'; cx.textAlign='center'; R.bos.forEach(b=>{ const x=X(b.i), y=Y(b.up?c[b.i].low:c[b.i].high); if(x==null||y==null) return;
      const t=(b.ch?'CHoCH ':'BOS ')+(b.up?'\u2191':'\u2193'), col=b.ch?BLUE:(b.up?GREEN:RED), w=cx.measureText(t).width+10, h=16, yy=b.up?y+6:y-6-h;
      cx.fillStyle=col; cx.fillRect(x-w/2,yy,w,h); cx.beginPath(); if(b.up){ cx.moveTo(x-4,yy); cx.lineTo(x+4,yy); cx.lineTo(x,yy-5); } else { cx.moveTo(x-4,yy+h); cx.lineTo(x+4,yy+h); cx.lineTo(x,yy+h+5); } cx.fill();
      cx.fillStyle='#fff'; cx.fillText(t,x,yy+h/2); }); }
  if(p.showTargets&&R.sig){ const s=R.sig, xa=X(s.i), xb=X(s.i+p.rightBars), ye=Y(s.entry), y1=Y(s.tp1), y2=Y(s.tp2);
    if(xa!=null&&xb!=null&&ye!=null&&y1!=null&&y2!=null){ cx.fillStyle='rgba(0,150,136,.10)'; cx.fillRect(xa,Math.min(y1,y2),xb-xa,Math.abs(y2-y1));
      const ln=(y,col,w)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(xb,y); cx.stroke(); };
      ln(ye,BLUE,2); ln(y1,TEAL,1); ln(y2,TEAL,1);
      cx.font='bold 10px system-ui'; cx.textAlign='left'; const tag=(y,t,col)=>{ const w=cx.measureText(t).width+10; cx.fillStyle=col; cx.fillRect(xb+3,y-8,w,16); cx.fillStyle='#fff'; cx.fillText(t,xb+8,y); };
      tag(ye,(s.buy?'BUY ENTRY: ':'SELL ENTRY: ')+fmt(s.entry),BLUE); tag(y1,'TP1: '+fmt(s.tp1),TEAL); tag(y2,'TP2: '+fmt(s.tp2),TEAL); } }
  if(p.showDash){ const bull=R.bull[n-1], rows=[['THOMAS CLOUD','PRO','#232830','#232830',TEAL],['Trend',bull?'BULLISH':'BEARISH','rgba(128,134,150,.45)',bull?'#19916e':'#be4141','#fff'],
      ['Last Signal',R.last,'rgba(128,134,150,.45)',R.last==='BUY'?GREEN:R.last==='SELL'?RED:'#808696','#fff'],['TP Gap',p.tpGapPips+' pips','rgba(128,134,150,.45)','#232830',TEAL]];
    const rh=18, w1=88, w2=84, x0=W-w1-w2-8, y0=8; cx.font='bold 11px system-ui'; cx.textAlign='left';
    rows.forEach((r,k)=>{ const y=y0+k*rh; cx.fillStyle=r[2]; cx.fillRect(x0,y,w1,rh); cx.fillStyle=r[3]; cx.fillRect(x0+w1,y,w2,rh); cx.fillStyle='#fff'; cx.fillText(r[0],x0+6,y+rh/2); cx.fillStyle=r[4]; cx.fillText(r[1],x0+w1+6,y+rh/2); }); }
  cx.restore();
}
{ const _tcpPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='tcpview') return tcpDraw(d,X,Y,W,H); return _tcpPrevDraw.apply(this,arguments); }; }
/* ===== Trend Fair Value Gap Delta [ChartPrime] (port of the Pine v6 indicator): SMA +/- ATR bands, trend state, trend-aligned FVGs with buy/sell delta boxes, gradient, stats label ===== */
function tfdSrc(x,s){ return s==='hl2'?(x.high+x.low)/2:s==='hlc3'?(x.high+x.low+x.close)/3:s==='ohlc4'?(x.open+x.high+x.low+x.close)/4:(x[s]!=null?x[s]:x.close); }
function tfdCore(c,p){
  const N=c.length, S=Math.max(0,N-3000), n=N-S, R={S,N,n,basis:[],up:[],lo:[],trend:[],act:[],zb:[],zr:[],fvgN:0,mitN:0};
  if(n<3) return R;
  const cc=S?c.slice(S):c, atr=atrW(cc,p.atrLen); let sm=0; const s=cc.map(x=>tfdSrc(x,p.src));
  for(let i=0;i<n;i++){ sm+=s[i]; if(i>=p.length) sm-=s[i-p.length];
    const b=i>=p.length-1?sm/p.length:NaN; R.basis[i]=b; R.up[i]=isFinite(b)&&isFinite(atr[i])?b+atr[i]*p.atrMult:NaN; R.lo[i]=isFinite(b)&&isFinite(atr[i])?b-atr[i]*p.atrMult:NaN; }
  let tr=1, fvgN=0, mitN=0; const live=[];   // live = zones not locked yet
  for(let i=0;i<n;i++){
    const conf=i<n-1, up=R.up[i], lo=R.lo[i], pt=tr;   // the forming last candle never changes the trend or creates a zone (Pine barstate.isconfirmed)
    if(conf&&i>0&&isFinite(up)&&isFinite(lo)){ if(cc[i].close>up&&cc[i-1].close<up) tr=1; else if(cc[i].close<lo&&cc[i-1].close>lo) tr=-1; }
    R.trend[i]=tr; if(tr!==pt){ fvgN=0; mitN=0; }
    if(p.showFvg&&conf&&i>=2){
      const bull=tr===1&&cc[i].low>cc[i-2].high, bear=tr===-1&&cc[i].high<cc[i-2].low;
      if(bull||bear){ fvgN++; const m=cc[i-1], rng=m.high-m.low, v=m.volume||0, bv=rng===0?v/2:v*(m.close-m.low)/rng, sv=rng===0?v/2:v*(m.high-m.close)/rng, tv=(bv+sv)||1;
        const z={st:i,end:i,top:bull?cc[i].low:cc[i-2].low,bot:bull?cc[i-2].high:cc[i].high,br:bv/tv,sr:sv/tv,mit:false,lock:false,bull};
        (bull?R.zb:R.zr).push(z); live.push(z); } }
    for(let k=live.length-1;k>=0;k--){ const z=live[k];
      const mit=z.bull?cc[i].low<z.bot:cc[i].high>z.top, bl=z.bull?lo>=z.bot:up<=z.top;
      if(mit&&!z.mit&&!z.lock){ z.mit=true; z.lock=true; mitN++; } else if(bl) z.lock=true;
      if(!z.lock) z.end=i; else live.splice(k,1); }
  }
  R.fvgN=fvgN; R.mitN=mitN;
  const old=z=>(n-1-z.st)<=3000;
  R.zb=R.zb.filter(old).slice(-500); R.zr=R.zr.filter(old).slice(-500);
  for(let i=0;i<n;i++){ const t=R.trend[i], a=t===1?R.lo[i]:R.up[i]; R.act[i]=(i>0&&t!==R.trend[i-1])?NaN:a; }
  R.last=R.trend[n-1]; R.band=R.last===1?R.lo[n-1]:R.up[n-1];
  return R;
}
IND.tfd={label:'Trend Fair Value Gap Delta [ChartPrime]',title:'Trend Fair Value Gap Delta',cat:'Trend',live:true,
  nm:p=>`Trend FVG Delta ${p.length} ${p.atrLen} ${p.atrMult}`,
  p:{length:20,src:'close',atrLen:50,atrMult:2,showFvg:true,showGradient:true,gradBandT:80,gradPriceT:100,showStats:true,showPct:true,
    bullCol:'#009688',bearCol:'#2962ff',upCol:'#2962ff',loCol:'#009688',buyCol:'#009688',sellCol:'#2962ff',mitCol:'#808696',txtCol:'#ffffff'},
  cols:['#2962ff','#009688','#009688'],
  fields:[['length','num','SMA Length',{min:1,max:500,step:1}],['src','sel','Source',{opts:['close','open','high','low','hl2','hlc3','ohlc4']}],
    ['atrLen','num','ATR Length',{min:1,max:500,step:1}],['atrMult','num','Band Multiplier',{min:.1,step:.1}],
    ['showFvg','chk','Show Trend-Aligned FVGs'],['showPct','chk','Show buy / sell % text in the delta boxes'],
    ['showGradient','chk','Show Price-Band Gradient Fill'],['gradBandT','num','Gradient Band Transparency',{min:0,max:100,step:1}],['gradPriceT','num','Gradient Price Transparency',{min:0,max:100,step:1}],
    ['showStats','chk','Show Last Bar FVG Stats Label'],
    ['bullCol','col','Bullish colour (trend / FVG)'],['bearCol','col','Bearish colour (trend / FVG)'],['buyCol','col','Buy volume box'],['sellCol','col','Sell volume box'],
    ['mitCol','col','Mitigated FVG'],['txtCol','col','Box & label text']],
  calc:(c,p)=>{ const R=tfdCore(c,p), f=a=>{ const o=[]; for(let i=0;i<R.n;i++) if(isFinite(a[i])) o.push({time:c[R.S+i].time,value:a[i]}); return o; };
    const act=[]; for(let i=0;i<R.n;i++){ const t=c[R.S+i].time; if(isFinite(R.act[i])) act.push({time:t,value:R.act[i],color:R.trend[i]===1?p.bullCol:p.bearCol}); else act.push({time:t}); }
    return [f(R.up),f(R.lo),act]; },
  extras:(c,p)=>{ const R=tfdCore(c,p); return {mk:[],labels:[],stat:'',boxes:[{type:'tfdview',pts:[],r:R,o:p,c}]}; }};
function tfdDraw(d,X,Y,W,H){
  const R=d.r, p=d.o, c=d.c; if(!R||!R.n) return; const S=R.S, n=R.n;
  const rgba=(h,a)=>{ const v=h.replace('#',''); return 'rgba('+parseInt(v.slice(0,2),16)+','+parseInt(v.slice(2,4),16)+','+parseInt(v.slice(4,6),16)+','+a+')'; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  if(p.showGradient){ const aB=1-p.gradBandT/100, aP=1-p.gradPriceT/100;
    for(let i=1;i<n;i++){ if(!isFinite(R.act[i])||!isFinite(R.act[i-1])||R.trend[i]!==R.trend[i-1]) continue;
      const x0=X(S+i-1), x1=X(S+i); if(x0==null||x1==null||x1<-10||x0>W+10) continue;
      const yb0=Y(R.act[i-1]), yb1=Y(R.act[i]), yc0=Y(c[S+i-1].close), yc1=Y(c[S+i].close); if(yb0==null||yb1==null||yc0==null||yc1==null) continue;
      const col=R.trend[i]===1?p.bullCol:p.bearCol, yB=(yb0+yb1)/2, yC=(yc0+yc1)/2; if(Math.abs(yB-yC)<.5) continue;
      const g=cx.createLinearGradient(0,yB,0,yC); g.addColorStop(0,rgba(col,aB)); g.addColorStop(1,rgba(col,aP));
      cx.fillStyle=g; cx.beginPath(); cx.moveTo(x0,yb0); cx.lineTo(x1,yb1); cx.lineTo(x1,yc1); cx.lineTo(x0,yc0); cx.closePath(); cx.fill(); } }
  if(p.showFvg) [R.zb,R.zr].forEach(L=>L.forEach(z=>{ const xs=X(S+z.st), xe=X(S+z.end), yt=Y(z.top), yb=Y(z.bot); if(xs==null||xe==null||yt==null||yb==null||xe<0||xs>W) return;
    const base=z.bull?p.bullCol:p.bearCol, fillC=z.mit?rgba(p.mitCol,.15):rgba(base,.15), lineC=z.mit?rgba(p.mitCol,.4):rgba(base,.5), y0=Math.min(yt,yb), h=Math.abs(yb-yt);
    cx.fillStyle=fillC; cx.fillRect(xs,y0,xe-xs,h); cx.strokeStyle=lineC; cx.lineWidth=1; cx.beginPath(); cx.moveTo(xs,yt); cx.lineTo(xe,yt); cx.moveTo(xs,yb); cx.lineTo(xe,yb); cx.stroke();
    if(z.mit) return; const len=z.end-z.st, ym=(yt+yb)/2, bl=Math.max(1,Math.floor(len*z.br)), sl=Math.max(1,Math.floor(len*z.sr));
    const xb=X(S+z.st+bl), xsl=X(S+z.st+sl); if(xb==null||xsl==null) return;
    cx.fillStyle=rgba(p.buyCol,.6); cx.fillRect(xs,y0,xb-xs,Math.abs(ym-y0)); cx.fillStyle=rgba(p.sellCol,.6); cx.fillRect(xs,ym,xsl-xs,y0+h-ym);
    if(p.showPct&&h>=12){ cx.font='9px system-ui'; cx.textAlign='center'; cx.fillStyle=p.txtCol;
      if(xb-xs>26) cx.fillText((z.br*100).toFixed(1)+'%',(xs+xb)/2,y0+(ym-y0)/2); if(xsl-xs>26) cx.fillText((z.sr*100).toFixed(1)+'%',(xs+xsl)/2,ym+(y0+h-ym)/2); } }));
  if(p.showStats&&isFinite(R.band)){ const xl=X(S+n-1), yl=Y(R.band); if(xl!=null&&yl!=null){ const bull=R.last===1, rows=['Current '+(bull?'Bullish':'Bearish')+' Trend Stats','FVGs Detected: '+R.fvgN,'FVGs Mitigated: '+R.mitN];
      cx.font='bold 10px system-ui'; const w=Math.max.apply(null,rows.map(t=>cx.measureText(t).width))+14, h=rows.length*14+8, x0=Math.min(xl+8,W-w-4), y0=Math.max(4,Math.min(H-h-4,yl-h/2));
      cx.fillStyle=bull?p.bullCol:p.bearCol; cx.fillRect(x0,y0,w,h); cx.fillStyle=p.txtCol; cx.textAlign='left'; rows.forEach((t,k)=>cx.fillText(t,x0+7,y0+4+k*14+7)); } }
  cx.restore();
}
{ const _tfdPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='tfdview') return tfdDraw(d,X,Y,W,H); return _tfdPrevDraw.apply(this,arguments); }; }
/* ===== FVG Order Blocks [BigBeluga] (port of the Pine v5 indicator): fair value gap boxes with % size, order block zone behind each gap (1 ATR deep), broken blocks, optional signals ===== */
function fobCore(c,p){
  const N=c.length, R={N,gaps:[],obs:[],sigs:[]};
  if(N<5) return R;
  const atr=atrW(c,200), LB=Math.max(1,p.lookback|0), start=Math.max(2,N-LB), s0=Math.max(2,start-200), fu=[], fd=[];
  for(let i=s0;i<N;i++){ fu[i]=(c[i].low-c[i-2].high)/c[i].low*100; fd[i]=(c[i-2].low-c[i].high)/c[i-2].low*100; }
  const hi=(a,i)=>{ let m=-Infinity; for(let k=Math.max(s0,i-199);k<=i;k++) if(isFinite(a[k])&&a[k]>m) m=a[k]; return m; };
  const rm=(L,b)=>{ const k=L.indexOf(b); if(k>=0) L.splice(k,1); };
  const L1=[], L2=[], gaps=[], sigs=[];
  for(let i=start;i<N;i++){
    const conf=i<N-1, a=c[i], b1=c[i-1], b2=c[i-2];   // the forming candle never creates a gap (Pine barstate.isconfirmed)
    const gb=conf&&b2.high<a.low&&b2.high<b1.high&&b2.low<a.low&&fu[i]>p.filter, gr=conf&&b2.low>a.high&&b2.low>b1.low&&b2.high>a.high&&fd[i]>p.filter;
    if(gb){ const mx=hi(fu,i), t=mx>0?Math.min(1,fu[i]/mx):0;
      if(p.showImb) gaps.push({l:i-1,r:i+5,top:a.low,bot:b2.high,t,txt:fu[i].toFixed(2)+'%'});
      if(isFinite(atr[i])) L1.push({l:i-1,top:b2.high,bot:b2.high-atr[i],t,txt:fu[i].toFixed(2)+'%',bull:true,broken:false}); }
    if(gr){ const mx=hi(fd,i), t=mx>0?Math.min(1,fd[i]/mx):0;
      if(p.showImb) gaps.push({l:i-1,r:i+5,top:b2.low,bot:a.high,t,txt:'-'+fd[i].toFixed(2)+'%'});
      if(isFinite(atr[i])) L2.push({l:i-1,top:b2.low+atr[i],bot:b2.low,t,txt:fd[i].toFixed(2)+'%',bull:false,broken:false}); }
    [[L1,true,gb],[L2,false,gr]].forEach(([L,bull,gap])=>{
      L.slice().forEach(b=>{
        if(bull?a.high<b.bot:a.low>b.top){ b.broken=true; if(!p.showBroken) rm(L,b); }
        if(p.showSignal&&!gap&&(bull?(a.low>b.top&&b1.low<=b.top):(a.high<b.bot&&b1.high>=b.bot))) sigs.push({i:i-1,y:bull?b1.low:b1.high,bull});
        for(const o of L){ if(o.top<b.top&&o.top>b.bot){ rm(L,b); break; } } }); });
    if(L1.length>=p.boxAmt) L1.shift();
    if(L2.length>=p.boxAmt) L2.shift();
  }
  R.obs=L1.concat(L2); R.sigs=sigs.slice(-50); R.gaps=gaps.slice(-Math.max(0,500-R.obs.length));
  return R;
}
IND.fob={label:'FVG Order Blocks [BigBeluga]',title:'FVG Order Blocks [BigBeluga]',cat:'Trend',live:true,
  nm:p=>`FVG Order Blocks ${p.filter} ${p.boxAmt}`,
  p:{filter:.5,showImb:true,boxAmt:6,showBroken:false,showSignal:false,lookback:2000,bullCol:'#14be94',bearCol:'#c21919',txtCol:'#d1d4dc'},
  cols:[],
  fields:[['filter','num','Filter Gaps by %',{min:0,max:100,step:.1}],['showImb','chk','Fair Value Gaps'],['boxAmt','num','Blocks Amount',{min:1,max:50,step:1}],
    ['showBroken','chk','Broken Blocks'],['showSignal','chk','Order Blocks Signals'],['lookback','num','Lookback (candles)',{min:50,max:5000,step:50}],
    ['bullCol','col','Bullish colour'],['bearCol','col','Bearish colour'],['txtCol','col','Gap / text colour']],
  calc:()=>[],
  extras:(c,p)=>{ const R=fobCore(c,p); return {mk:[],labels:[],stat:'',boxes:[{type:'fobview',pts:[],r:R,o:p,c}]}; }};
function fobDraw(d,X,Y,W,H){
  const R=d.r, p=d.o; if(!R||!R.N) return; const N=R.N;
  const rgba=(h,a)=>{ const v=h.replace('#',''); return 'rgba('+parseInt(v.slice(0,2),16)+','+parseInt(v.slice(2,4),16)+','+parseInt(v.slice(4,6),16)+','+a+')'; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  R.gaps.forEach(g=>{ const xs=X(g.l), xe=X(g.r), yt=Y(g.top), yb=Y(g.bot); if(xs==null||xe==null||yt==null||yb==null||xe<0||xs>W) return;
    const y0=Math.min(yt,yb), h=Math.max(1,Math.abs(yb-yt)); cx.fillStyle=rgba(p.txtCol,.10+.20*g.t); cx.fillRect(xs,y0,xe-xs,h);
    if(h>=9&&xe-xs>24){ cx.font='9px system-ui'; cx.textAlign='center'; cx.fillStyle=p.txtCol; cx.fillText(g.txt,(xs+xe)/2,y0+h/2); } });
  const xr=X(N-1+15);
  R.obs.forEach(b=>{ const xs=X(b.l), yt=Y(b.top), yb=Y(b.bot); if(xs==null||xr==null||yt==null||yb==null||xr<0||xs>W) return;
    const y0=Math.min(yt,yb), h=Math.max(1,Math.abs(yb-yt)), col=b.bull?p.bullCol:p.bearCol;
    if(b.broken){ cx.fillStyle=rgba(p.txtCol,.15); cx.fillRect(xs,y0,xr-xs,h); }
    else { cx.fillStyle=rgba(col,.30*b.t); cx.fillRect(xs,y0,xr-xs,h); cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(xs,y0,xr-xs,h); }
    if(h>=9){ cx.font='9px system-ui'; cx.textAlign='right'; cx.fillStyle=p.txtCol; cx.fillText(b.txt,Math.min(xr,W)-4,y0+h/2); } });
  R.sigs.forEach(s=>{ const x=X(s.i), y=Y(s.y); if(x==null||y==null||x<-10||x>W+10) return; cx.fillStyle=s.bull?p.bullCol:p.bearCol; cx.beginPath();
    if(s.bull){ cx.moveTo(x,y+5); cx.lineTo(x-5,y+13); cx.lineTo(x+5,y+13); } else { cx.moveTo(x,y-5); cx.lineTo(x-5,y-13); cx.lineTo(x+5,y-13); } cx.closePath(); cx.fill(); });
  cx.restore();
}
{ const _fobPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='fobview') return fobDraw(d,X,Y,W,H); return _fobPrevDraw.apply(this,arguments); }; }
/* ===== Rounding Bottom & Top Detector [JPT] (port of the Pine v6 indicator): confirmed breakout / breakdown of a rounded base or top, curved formation, level line, labels ===== */
function rbtIv(c){ const n=c.length; if(n<3) return 0; const d=[]; for(let k=Math.max(1,n-8);k<n;k++) d.push(c[k].time-c[k-1].time); d.sort((a,b)=>a-b); let v=d[d.length>>1]; if(v>1e8) v/=1000; return v; }   // candle length in seconds
function rbtCore(c,p){
  const n=c.length, L=Math.max(20,Math.round(p.lookback)), H=Math.floor(L/2), R={n,L,sigs:[],pend:[],locked:false};
  if(rbtIv(c)<3500){ R.locked=true; return R; }   // locked: 1 hour and above only
  if(n<L+2) return R;
  const N=Math.max(0,Math.round(+p.confirmN)||0), gap=Math.max(0,Math.round(+p.minGap)||0); let lastShown=-1e9;
  const RT=!!p.useRetest, W=30, rt=0.003, last=n-2, busy=[-1,-1];   // after the break: up to 30 candles to retest the level (within 0.3%) and then break the previous high / low
  // Breakout -> Retest -> BOS: after the break the level must be retested and held, then the swing made before the retest must be broken (close) = sign
  const seq=(i,bottom,edge)=>{ let ext=bottom?c[i].high:c[i].low, r=-1;
    for(let k=i+1;k<=Math.min(i+W,last);k++){
      if(bottom?c[k].close<edge:c[k].close>edge) return {end:k,ok:false};   // the break failed
      if(r<0){ ext=bottom?Math.max(ext,c[k].high):Math.min(ext,c[k].low); if(bottom?c[k].low<=edge*(1+rt):c[k].high>=edge*(1-rt)) r=k; }
      else if(bottom?c[k].close>ext:c[k].close<ext) return {end:k,ok:true,r,b:k}; }
    if(i+W>last) return {end:last,pend:true,r};   // still waiting
    return {end:i+W,ok:false}; };
  const add=(i,bottom,edge,ext)=>{
    if(RT){ const d=bottom?0:1; if(i<=busy[d]) return; const q=seq(i,bottom,edge); busy[d]=q.end;
      if(q.pend){ R.pend.push({i,bottom,edge,ext,pend:true,r:q.r,stage:q.r>=0?2:1}); return; }
      if(!q.ok) return; const cb=q.b; if(gap>0&&cb-lastShown<gap) return; lastShown=cb; R.sigs.push({i,ci:cb,bottom,edge,ext,r:q.r}); return; }
    const ci=i+N; if(ci>n-2) return;   // still waiting for the confirmation candles
    if(N>0&&p.holdLevel){ for(let k=i+1;k<=ci;k++){ if(bottom?!(c[k].close>edge):!(c[k].close<edge)) return; } }   // the break must hold: noise is dropped
    if(gap>0&&ci-lastShown<gap) return; lastShown=ci; R.sigs.push({i,ci,bottom,edge,ext}); };
  const lo25=Math.floor(L*.25), hi75=Math.floor(L*.75), eps=1e-10, th=p.edgePct*10, bp=p.breakoutPct/100;
  for(let i=L+1;i<n-1;i++){   // last (forming) candle never signals: Pine barstate.isconfirmed
    let lH=-Infinity,rH=-Infinity,lL=Infinity,rL=Infinity,pL=Infinity,pH=-Infinity,iL=-1,iH=-1;
    for(let k=i-2*H+1;k<=i-H;k++){ if(c[k].high>lH) lH=c[k].high; if(c[k].low<lL) lL=c[k].low; }
    for(let k=i-H;k<=i-1;k++){ if(c[k].high>rH) rH=c[k].high; if(c[k].low<rL) rL=c[k].low; }
    for(let k=i-L;k<=i-1;k++){ if(c[k].low<=pL){ pL=c[k].low; iL=k; } if(c[k].high>=pH){ pH=c[k].high; iH=k; } }   // ties: the most recent bar, like ta.lowestbars
    const lowOff=i-1-iL, highOff=i-1-iH, bEdge=Math.abs(lH-rH)/Math.max(Math.abs(lH),eps)*100, tEdge=Math.abs(lL-rL)/Math.max(Math.abs(lL),eps)*100;
    const res=Math.max(lH,rH), sup=Math.min(lL,rL), cl=c[i].close;
    if(p.showBottom&&cl>res*(1+bp)&&lowOff>=lo25&&lowOff<=hi75&&bEdge<=th&&res-pL>eps) add(i,true,res,pL);
    if(p.showTop&&cl<sup*(1-bp)&&highOff>=lo25&&highOff<=hi75&&tEdge<=th&&pH-sup>eps) add(i,false,sup,pH); }
  return R;
}
IND.rbt={label:'Rounding Bottom & Top Detector [JPT]',title:'Rounding Bottom & Top Detector',cat:'Trend',cols:[],calc:()=>[],
  nm:p=>`RBT Detector ${p.lookback} \u00b7 1H+`,
  p:{lookback:30,edgePct:.2,breakoutPct:.05,confirmN:0,holdLevel:true,minGap:0,useRetest:false,showBottom:true,showTop:true,showCurves:true,showLevels:true,showSignals:false,showMarkers:true,curveSteps:20,
    bottomCol:'#0ab266',topCol:'#ff6767',levelCol:'#91919b'},
  fields:[['lookback','num','Pattern Lookback',{min:20,max:200,step:1}],['edgePct','num','Edge Similarity (%)',{min:.01,max:5,step:.05}],['breakoutPct','num','Breakout Confirmation (%)',{min:0,max:2,step:.05}],
    ['confirmN','num','Show the sign only after N candles past the break (0 = off; try 2, 3 or 4)',{min:0,max:10,step:1}],['holdLevel','chk','Confirmation: every candle must close beyond the level (filters noise)'],
    ['minGap','num','Next sign / curve only after N candles (0 = off; try 30, 50, 100)',{min:0,max:1000,step:1}],
    ['useRetest','chk','Breakout \u2192 Retest \u2192 BOS \u2192 BUY / SELL (extends the dotted line while waiting)'],
    ['showBottom','chk','Show Rounding Bottom'],['showTop','chk','Show Rounding Top'],['showCurves','chk','Show Curved Formation'],['showLevels','chk','Show Support / Resistance'],
    ['showSignals','chk','Show Breakout Signals (labels)'],['showMarkers','chk','Show breakout arrows'],['curveSteps','num','Curve Smoothness',{min:8,max:40,step:1}],
    ['bottomCol','col','Rounding Bottom colour'],['topCol','col','Rounding Top colour'],['levelCol','col','Support / Resistance colour']],
  extras:(c,p)=>{ const R=rbtCore(c,p), mk=[], ev=[];
    R.sigs.forEach(s=>{ const t=c[s.ci].time; if(p.showMarkers) mk.push({time:t,position:s.bottom?'belowBar':'aboveBar',color:s.bottom?p.bottomCol:p.topCol,shape:s.bottom?'arrowUp':'arrowDown',text:'',keep:true});
      ev.push({k:'rbt'+(s.bottom?'B':'T')+t,time:t,msg:(s.bottom?'Rounding Bottom breakout':'Rounding Top breakdown')+(p.useRetest?' (retest + BOS confirmed)':(+p.confirmN>0?' (confirmed after '+Math.round(+p.confirmN)+' candles)':'')),col:s.bottom?p.bottomCol:p.topCol}); });
    return {mk,ev:ev.slice(-30),labels:[],stat:'',boxes:[{type:'rbtview',pts:[],r:R,o:p,c}]}; }};
function rbtDraw(d,X,Y,W,H){
  const R=d.r, p=d.o, c=d.c; if(!R) return; const L=R.L, steps=Math.max(8,Math.round(p.curveSteps));
  if(R.locked){ cx.save(); cx.font='bold 11px system-ui'; cx.textAlign='center'; cx.textBaseline='middle'; const l1='Rounding Bottom & Top Detector', l2='works on 1 hour and above only (1h, 4h, 1D...)', w=Math.min(W-16,Math.max(cx.measureText(l1).width,cx.measureText(l2).width)+24), x=W/2, y=H*0.42;
    cx.fillStyle='rgba(20,24,34,.92)'; cx.fillRect(x-w/2,y-24,w,48); cx.strokeStyle='#e53950'; cx.lineWidth=1; cx.strokeRect(x-w/2,y-24,w,48); cx.fillStyle='#fff'; cx.fillText('\u{1F512} '+l1,x,y-8); cx.font='11px system-ui'; cx.fillStyle='#ffb3bd'; cx.fillText(l2,x,y+10); cx.restore(); return; }
  if(!R.sigs.length) return;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  R.sigs.slice(-9).concat((R.pend||[]).slice(-3)).forEach(s=>{   // Pine keeps about 200 lines: 21 per formation
    const col=s.bottom?p.bottomCol:p.topCol, x0=s.i-L, x1=s.i-1, tot=x1-x0;
    if(p.showCurves&&tot>0){ cx.strokeStyle=col; cx.lineWidth=2; cx.beginPath(); let ok=true;
      for(let k=0;k<=steps;k++){ const t=k/steps, y=s.bottom?s.edge-(s.edge-s.ext)*Math.sin(Math.PI*t):s.edge+(s.ext-s.edge)*Math.sin(Math.PI*t), px=X(x0+Math.round(tot*t)), py=Y(y); if(px==null||py==null){ ok=false; break; } if(k) cx.lineTo(px,py); else cx.moveTo(px,py); }
      if(ok) cx.stroke(); }
    if(p.showLevels){ const a=X(x0), b=X(s.pend?R.n-1:s.ci), y=Y(s.edge); if(a!=null&&b!=null&&y!=null){ cx.strokeStyle=p.levelCol; cx.lineWidth=1; cx.setLineDash([6,4]); cx.beginPath(); cx.moveTo(a,y); cx.lineTo(b,y); cx.stroke(); cx.setLineDash([]); } }
  });
  if(p.showSignals){ cx.font='bold 10px system-ui'; cx.textAlign='center';
    R.sigs.slice(-100).forEach(s=>{ const x=X(s.ci), y=Y(s.bottom?c[s.ci].low:c[s.ci].high); if(x==null||y==null) return; const cn=p.useRetest?' \u00b7 RT+BOS':(Math.round(+p.confirmN)>0?' \u00b7 +'+Math.round(+p.confirmN):''), t=s.bottom?['Rounding Bottom','BREAKOUT \u2191'+cn]:['Rounding Top','BREAKDOWN \u2193'+cn];
      const w=Math.max(cx.measureText(t[0]).width,cx.measureText(t[1]).width)+12, h=30, yy=s.bottom?y+6:y-6-h; cx.fillStyle=s.bottom?p.bottomCol:p.topCol; cx.fillRect(x-w/2,yy,w,h);
      cx.beginPath(); if(s.bottom){ cx.moveTo(x-4,yy); cx.lineTo(x+4,yy); cx.lineTo(x,yy-5); } else { cx.moveTo(x-4,yy+h); cx.lineTo(x+4,yy+h); cx.lineTo(x,yy+h+5); } cx.fill();
      cx.fillStyle='#fff'; cx.fillText(t[0],x,yy+9); cx.fillText(t[1],x,yy+22); }); }
  cx.restore();
}
try{ DESC.rbt='Rounded base / top breakout with optional N-candle wait or Breakout, Retest, BOS filter and spacing between signs. Works on 1 hour and above only'; }catch(e){}
{ const _rbtPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='rbtview') return rbtDraw(d,X,Y,W,H); return _rbtPrevDraw.apply(this,arguments); }; }
/* ===== Anchored VWAP Pullback & Target Zones [PhenLabs] (port of the Pine v6 indicator): 7 parallel profile engines, structural anchored VWAP value band, pullback reclaim entries, SL + TP1-TP3 plans, auto-optimizer, dashboard ===== */
const AVP_MODES=['Auto-Optimize (Best Chart Win Rate)','Balanced (1.0\u03c3 Band \u00b7 26% Eff)','Conservative (0.8\u03c3 Band \u00b7 35% Eff)','Aggressive (1.25\u03c3 Band \u00b7 18% Eff)','Shallow Pullback (0.65\u03c3 \u00b7 30% Eff)','Deep Value Reclaim (1.45\u03c3 \u00b7 22% Eff)','Volume Climax Reclaim (1.0\u03c3 \u00b7 1.25x Vol)','Custom Thresholds'];
const AVP_TGT=['R Ladder + Impulse High/Low Magnet','Fixed R Ladder (1R / 2R / 3R)'];
const avpClamp=(v,a,b)=>Math.min(Math.max(v,a),b);
function avpEng(id,nm,bs,os,er,mq,sl,mr,ma){ return {id,nameTag:nm,bandSigma:bs,outerSigma:os,minErPct:er,minQual:mq,slScale:sl,minRiskAtr:mr,minRelAct:ma,total:0,win:0,loss:0,tp1:0,tp2:0,tp3:0,net:0,lastDir:0,lastQual:0,lastText:'NONE',act:-1,
  bullIn:false,bullPbLow:NaN,bullPbTime:0,bullPbUsed:0,bearIn:false,bearPbHigh:NaN,bearPbTime:0,bearPbUsed:0,ev:[],skips:[]}; }
const avpCache={};
function avpRun(c,p){
  const N=c.length, mt=Math.max(1e-9,(N?c[N-1].close:1)*1e-8), sw=Math.max(3,Math.round(p.swingLen)), maxPb=Math.max(1,Math.round(p.maxPbPerAnchor)), minImp=p.minImpulseAtr;
  const R={N,engs:[],plans:[],bias:[],avw:[],sd:[],abar:[],sel:0,bullAnc:null,bearAnc:null};
  const E=R.engs; E.push(avpEng(0,'Balanced (1.0\u03c3 \u00b7 26% Eff)',1,2,26,52,1,.35,0),avpEng(1,'Conservative (0.8\u03c3 \u00b7 35% Eff)',.8,1.75,35,60,1.15,.35,0),avpEng(2,'Aggressive (1.25\u03c3 \u00b7 18% Eff)',1.25,2.3,18,44,.85,.3,0),
    avpEng(3,'Shallow Pullback (0.65\u03c3 \u00b7 30%)',.65,1.6,30,55,.9,.3,0),avpEng(4,'Deep Value Reclaim (1.45\u03c3)',1.45,2.5,22,48,1.25,.4,0),avpEng(5,'Volume Climax (1.0\u03c3 + 1.25x Vol)',1,2,24,58,.95,.32,1.25),
    avpEng(6,'Custom Thresholds',p.customBandSig,p.customBandSig+1,p.customMinEr,50,1,.35,0));
  if(N<30) return R;
  const atrR=atrW(c,14), M=[], dd=[]; let vs=0;
  for(let i=0;i<N;i++){ const x=c[i], v=x.volume||0; vs+=v; if(i>=20) vs-=c[i-20].volume||0; const vsm=i>=19?vs/20:NaN;
    const atr=isFinite(atrR[i])?atrR[i]:Math.max(x.high-x.low,mt*10), span=Math.max(x.high-x.low,mt), hasV=v>0&&isFinite(vsm)&&vsm>0, rel=hasV?v/vsm:span/Math.max(atr,mt), aN=avpClamp(rel/2,0,1), bw=hasV?Math.max(v,1e-6):Math.max(rel,.1);
    dd.push(i?Math.abs(x.close-c[i-1].close):0); let ps=0; if(i>=9){ for(let k=i-9;k<=i;k++) ps+=dd[k]; }
    const net=Math.abs(x.close-(i>=10?c[i-10].close:x.close)), er=ps>0?avpClamp(net/ps*100,0,100):0, eN=avpClamp(er/55,0,1);
    const bcs=avpClamp((x.close-x.low)/span,0,1), scs=avpClamp((x.high-x.close)/span,0,1);
    const bq=Math.round(avpClamp((.4*bcs+.35*eN+.25*aN)*100*(x.close>x.open?1:.85),0,100)*10)/10, sq=Math.round(avpClamp((.4*scs+.35*eN+.25*aN)*100*(x.close<x.open?1:.85),0,100)*10)/10;
    M.push({atr,span,hasV,rel,bw,er,bq,sq}); }
  R.M=M;
  let bAct=false,bBar=0,bPx=NaN,bWP=0,bWP2=0,bW=0,bAv=NaN,bSd=0,bImp=NaN,bArm=false, sAct=false,sBar=0,sPx=NaN,sWP=0,sWP2=0,sW=0,sAv=NaN,sSd=0,sImp=NaN,sArm=false, bias=0;
  const plans=R.plans, hybrid=p.targetMode===AVP_TGT[0];
  const rec=(e,i,k)=>{ e.ev.push({i,k}); if(e.ev.length>60) e.ev.shift(); };
  for(let i=0;i<=N-2;i++){
    const x=c[i], H=x.high, Lo=x.low, Cl=x.close, Op=x.open, m=M[i], atr=m.atr;
    // STEP A: resolve active plans
    E.forEach(e=>{ if(e.act<0||e.act>=plans.length) return; const cp=plans[e.act]; if(cp.status!==0||i<=cp.entryBar) return;
      const bull=cp.dir===1, hitSl=bull?Lo<=cp.activeSl:H>=cp.activeSl;
      if(hitSl){ if(cp.tp1Hit){ cp.beHit=true; cp.status=2; cp.endBar=i; e.total++; e.win++; e.net+=cp.tp2Hit?(cp.tp1R+cp.tp2R)*.5:cp.tp1R*.5; }
        else { cp.slHit=true; cp.status=-1; cp.endBar=i; e.total++; e.loss++; e.net-=1; rec(e,i,'sl'); } return; }
      const reach=v=>bull?H>=v:Lo<=v;
      if(!cp.tp1Hit&&reach(cp.tp1)){ cp.tp1Hit=true; e.tp1++; rec(e,i,'tp1'); if(p.useBeRatchet) cp.activeSl=cp.entry; }
      if(!cp.tp2Hit&&reach(cp.tp2)){ cp.tp2Hit=true; e.tp2++; rec(e,i,'tp2'); }
      if(!cp.tp3Hit&&reach(cp.tp3)){ cp.tp3Hit=true; e.tp3++; rec(e,i,'tp3'); cp.status=1; cp.endBar=i; e.total++; e.win++; e.net+=cp.tp3R; }
      else if(i-cp.entryBar>=60){ cp.status=cp.tp1Hit?2:3; cp.endBar=i; e.total++;
        if(cp.tp1Hit){ e.win++; e.net+=cp.tp1R; } else { const xr=(bull?Cl-cp.entry:cp.entry-Cl)/Math.max(cp.risk,mt); if(xr>=0) e.win++; else e.loss++; e.net+=xr; } } });
    // STEP B: update anchored VWAPs
    if(bAct){ bWP+=m.bw*((H+Lo+Cl)/3); bWP2+=m.bw*Math.pow((H+Lo+Cl)/3,2); bW+=m.bw; bAv=bWP/Math.max(bW,1e-9); const v=Math.max(0,bWP2/Math.max(bW,1e-9)-bAv*bAv); bSd=Math.max(Math.sqrt(v),atr*.25);
      if(!isFinite(bImp)||H>=bImp) bImp=H; if(!bArm&&(bImp-bPx)>=minImp*atr) bArm=true;
      if(Cl<bPx||Cl<bAv-2.6*bSd){ bAct=false; bArm=false; E.forEach(e=>e.bullIn=false); } }
    if(sAct){ sWP+=m.bw*((H+Lo+Cl)/3); sWP2+=m.bw*Math.pow((H+Lo+Cl)/3,2); sW+=m.bw; sAv=sWP/Math.max(sW,1e-9); const v=Math.max(0,sWP2/Math.max(sW,1e-9)-sAv*sAv); sSd=Math.max(Math.sqrt(v),atr*.25);
      if(!isFinite(sImp)||Lo<=sImp) sImp=Lo; if(!sArm&&(sPx-sImp)>=minImp*atr) sArm=true;
      if(Cl>sPx||Cl>sAv+2.6*sSd){ sAct=false; sArm=false; E.forEach(e=>e.bearIn=false); } }
    // STEP C: seed new swing anchors
    const j=i-sw;
    if(j>=sw){
      if(pivAt(c,j,sw,sw,'l')){ const pl=c[j].low;
        const rep=!bAct||pl<bPx||E[0].bullPbUsed>=maxPb||(bArm&&pl>bPx&&(H-pl)>=minImp*atr);
        if(rep&&Cl>pl){ let a=0,b=0,w=0,mx=H;
          for(let k=sw;k>=0;k--){ const y=c[i-k], spK=Math.max(y.high-y.low,mt), wk=M[i-k].hasV?Math.max(y.volume||0,1e-6):Math.max(spK/Math.max(atr,mt),.1), pk=(y.high+y.low+y.close)/3; a+=wk*pk; b+=wk*pk*pk; w+=wk; if(y.high>=mx) mx=y.high; }
          bAct=true; bBar=j; bPx=pl; bWP=a; bWP2=b; bW=w; bAv=a/Math.max(w,1e-9); bSd=Math.max(Math.sqrt(Math.max(0,b/Math.max(w,1e-9)-bAv*bAv)),atr*.25); bImp=mx; bArm=(mx-pl)>=minImp*atr;
          E.forEach(e=>{ e.bullIn=false; e.bullPbLow=NaN; e.bullPbTime=j; e.bullPbUsed=0; }); } }
      if(pivAt(c,j,sw,sw,'h')){ const ph=c[j].high;
        const rep=!sAct||ph>sPx||E[0].bearPbUsed>=maxPb||(sArm&&ph<sPx&&(ph-Lo)>=minImp*atr);
        if(rep&&Cl<ph){ let a=0,b=0,w=0,mn=Lo;
          for(let k=sw;k>=0;k--){ const y=c[i-k], spK=Math.max(y.high-y.low,mt), wk=M[i-k].hasV?Math.max(y.volume||0,1e-6):Math.max(spK/Math.max(atr,mt),.1), pk=(y.high+y.low+y.close)/3; a+=wk*pk; b+=wk*pk*pk; w+=wk; if(y.low<=mn) mn=y.low; }
          sAct=true; sBar=j; sPx=ph; sWP=a; sWP2=b; sW=w; sAv=a/Math.max(w,1e-9); sSd=Math.max(Math.sqrt(Math.max(0,b/Math.max(w,1e-9)-sAv*sAv)),atr*.25); sImp=mn; sArm=(ph-mn)>=minImp*atr;
          E.forEach(e=>{ e.bearIn=false; e.bearPbHigh=NaN; e.bearPbTime=j; e.bearPbUsed=0; }); } } }
    if(bAct&&bArm&&!(sAct&&sArm)) bias=1; else if(sAct&&sArm&&!(bAct&&bArm)) bias=-1; else if(bAct&&bArm&&sAct&&sArm) bias=bBar>=sBar?1:-1; else if(bAct) bias=1; else if(sAct) bias=-1; else bias=0;
    R.bias[i]=bias; R.avw[i]=bias===1?bAv:bias===-1?sAv:NaN; R.sd[i]=bias===1?bSd:bias===-1?sSd:NaN; R.abar[i]=bias===1?bBar:bias===-1?sBar:-1;
    // STEP D: pullback arming and reclaim in each engine
    const f5=(Cl-(i>=5?c[i-5].close:Cl))/Math.max(atr,mt), bearCrash=f5<-3.6&&Cl<Op, bullCrash=f5>3.6&&Cl>Op, prevH=i?c[i-1].high:H, prevL=i?c[i-1].low:Lo, pbWin=i<12?i:i-12;
    E.forEach((e,eIdx)=>{ let openDir=-99; if(e.act>=0&&e.act<plans.length&&plans[e.act].status===0) openDir=plans[e.act].dir; let bt=false,st=false;
      if(bAct&&bArm&&e.bullPbUsed<maxPb&&isFinite(bAv)){ const up=bAv+e.bandSigma*bSd, lowDef=bAv-e.outerSigma*bSd;
        if(Lo<=up&&Cl>=lowDef&&Cl>bPx&&H<bImp){ if(!e.bullIn){ e.bullIn=true; e.bullPbLow=Lo; e.bullPbTime=i; } else if(Lo<(isFinite(e.bullPbLow)?e.bullPbLow:Lo)) e.bullPbLow=Lo; } else if(Cl<lowDef) e.bullIn=false;
        const rec_=e.bullIn&&Cl>bAv&&Cl>Op&&Cl>=prevH-.2*atr;
        if(rec_&&openDir!==1){ const leg=Math.max(bImp-bPx,atr*.5), dep=(bImp-(isFinite(e.bullPbLow)?e.bullPbLow:Lo))/leg;
          if(m.er>=e.minErPct&&m.bq>=e.minQual&&m.rel>=e.minRelAct&&dep>=.12&&dep<=.85&&!bearCrash){ bt=true; e.lastDir=1; e.lastQual=m.bq; e.lastText='BUY (AVWAP \u00b7 '+Math.round(m.bq)+'%)'; }
          else { e.skips.push({i,dir:1}); e.bullIn=false; e.lastText='SKIP (CHOP \u00b7 '+Math.round(m.er)+'%)'; } } }
      if(sAct&&sArm&&e.bearPbUsed<maxPb&&isFinite(sAv)&&!bt){ const lowB=sAv-e.bandSigma*sSd, upDef=sAv+e.outerSigma*sSd;
        if(H>=lowB&&Cl<=upDef&&Cl<sPx&&Lo>sImp){ if(!e.bearIn){ e.bearIn=true; e.bearPbHigh=H; e.bearPbTime=i; } else if(H>(isFinite(e.bearPbHigh)?e.bearPbHigh:H)) e.bearPbHigh=H; } else if(Cl>upDef) e.bearIn=false;
        const rec_=e.bearIn&&Cl<sAv&&Cl<Op&&Cl<=prevL+.2*atr;
        if(rec_&&openDir!==-1){ const leg=Math.max(sPx-sImp,atr*.5), dep=((isFinite(e.bearPbHigh)?e.bearPbHigh:H)-sImp)/leg;
          if(m.er>=e.minErPct&&m.sq>=e.minQual&&m.rel>=e.minRelAct&&dep>=.12&&dep<=.85&&!bullCrash){ st=true; e.lastDir=-1; e.lastQual=m.sq; e.lastText='SELL (AVWAP \u00b7 '+Math.round(m.sq)+'%)'; }
          else { e.skips.push({i,dir:-1}); e.bearIn=false; e.lastText='SKIP (CHOP \u00b7 '+Math.round(m.er)+'%)'; } } }
      if(!(bt||st)) return;
      if(e.act>=0&&e.act<plans.length){ const pp=plans[e.act]; if(pp.status===0){ pp.status=pp.tp1Hit?2:3; pp.endBar=i; e.total++;
        if(pp.tp1Hit){ e.win++; e.net+=pp.tp1R; } else { const fr=(pp.dir===1?Cl-pp.entry:pp.entry-Cl)/Math.max(pp.risk,mt); if(fr>=0) e.win++; else e.loss++; e.net+=fr; } } }
      const sd=bt?1:-1, entry=Cl, effB=p.slBufferAtr*e.slScale;
      const rawSl=sd===1?Math.min(isFinite(e.bullPbLow)?e.bullPbLow:Lo,bAv-e.bandSigma*bSd)-effB*atr:Math.max(isFinite(e.bearPbHigh)?e.bearPbHigh:H,sAv+e.bandSigma*sSd)+effB*atr;
      const risk=avpClamp(Math.abs(entry-rawSl),atr*e.minRiskAtr,atr*3), sl=sd===1?entry-risk:entry+risk;
      let t1=entry+sd*risk, t2=entry+sd*2*risk, t3=entry+sd*3*risk, r2=2, r3=3, mag=false;
      if(hybrid){ if(sd===1&&isFinite(bImp)){ const dR=(bImp-entry)/risk; if(dR>=1.3&&dR<=2.4){ t2=bImp; r2=Math.round(dR*10)/10; mag=true; } else if(dR>2.4&&dR<=4.5){ t3=bImp; r3=Math.round(dR*10)/10; mag=true; } }
        else if(sd===-1&&isFinite(sImp)){ const dR=(entry-sImp)/risk; if(dR>=1.3&&dR<=2.4){ t2=sImp; r2=Math.round(dR*10)/10; mag=true; } else if(dR>2.4&&dR<=4.5){ t3=sImp; r3=Math.round(dR*10)/10; mag=true; } } }
      const pbLeft=Math.max(pbWin,sd===1?e.bullPbTime:e.bearPbTime), pbTop=sd===1?bAv+e.bandSigma*bSd:Math.max(H,isFinite(e.bearPbHigh)?e.bearPbHigh:H), pbBot=sd===1?Math.min(Lo,isFinite(e.bullPbLow)?e.bullPbLow:Lo):sAv-e.bandSigma*sSd;
      plans.push({profId:eIdx,dir:sd,entryBar:i,entry,initSl:sl,activeSl:sl,risk,tp1:t1,tp2:t2,tp3:t3,tp1R:1,tp2R:r2,tp3R:r3,tpIsMag:mag,qualPct:sd===1?m.bq:m.sq,tp1Hit:false,tp2Hit:false,tp3Hit:false,slHit:false,beHit:false,status:0,endBar:-1,pbLeft,pbTop,pbBot,signalY:sd===1?Lo-atr*.15:H+atr*.15});
      e.act=plans.length-1; rec(e,i,sd===1?'buy':'sell');
      if(sd===1){ e.bullIn=false; e.bullPbUsed++; } else { e.bearIn=false; e.bearPbUsed++; }
      let cnt=0, old=-1; for(let k=0;k<plans.length;k++) if(plans[k].profId===eIdx){ cnt++; if(old===-1) old=k; }
      if(cnt>8&&old>=0){ plans.splice(old,1); E.forEach(q=>{ if(q.act>old) q.act--; }); }
    });
  }
  R.avw[N-1]=R.avw[N-2]; R.sd[N-1]=R.sd[N-2]; R.bias[N-1]=R.bias[N-2]; R.abar[N-1]=R.abar[N-2];
  R.bullAvwap=bAv; R.bearAvwap=sAv; R.trendBias=R.bias[N-2]; R.liveAvwap=R.avw[N-1]; R.liveSd=R.sd[N-1];
  R.bullAnc=bAct&&R.trendBias===1?{i:bBar,p:bPx}:null; R.bearAnc=sAct&&R.trendBias===-1?{i:sBar,p:sPx}:null;
  // pick the profile (auto-optimizer = best closed-trade win rate; same tie rules as the Pine script)
  const mi=AVP_MODES.indexOf(p.filterPreset); let sel=0;
  if(mi<=0){ let bw=-1,bn=-1e9,bi=0; const wr=e=>e.win/e.total*100;
    for(let k=0;k<=5;k++){ const e=E[k]; if(e.total>=3){ const w=wr(e); if(w>bw||(w===bw&&e.net>bn)){ bw=w; bn=e.net; bi=k; } } }
    for(let k=0;k<=2;k++){ const e=E[k]; if(e.total>0){ const w=wr(e); if(w>bw||(w===bw&&e.net>bn)){ bw=w; bn=e.net; bi=k; } } }
    if(bw<0){ for(let k=0;k<=5;k++){ const e=E[k]; if(e.total>0){ const w=wr(e); if(w>bw||(w===bw&&e.net>bn)){ bw=w; bn=e.net; bi=k; } } } }
    sel=bi; } else sel=mi-1;
  R.sel=sel; return R;
}
function avpGet(c,p){ const N=c.length; if(N<2) return avpRun(c,p);
  const key=[N,c[0].time,c[N-2].time,c[N-2].close,c[N-2].high,c[N-2].low,JSON.stringify(p)].join('|'); if(avpCache.k===key) return avpCache.r; const r=avpRun(c,p); avpCache.k=key; avpCache.r=r; return r; }
function avpLight(c,R){ const N=c.length, m=R.M&&R.M[N-1]; return m||null; }
IND.avp={label:'Anchored VWAP Pullback & Target Zones [PhenLabs]',title:'Anchored VWAP Pullback & Target Zones',cat:'Trend',
  nm:p=>'AVPT \u00b7 AVWAP Pullback'+(p.filterPreset===AVP_MODES[0]?' (Auto)':''),
  p:{swingLen:10,maxPbPerAnchor:2,minImpulseAtr:1.4,filterPreset:AVP_MODES[0],customMinEr:26,customBandSig:1,targetMode:AVP_TGT[0],slBufferAtr:.2,useBeRatchet:true,
    showPastPlans:false,showSkipped:false,showDash:true,dashSize:'Small',bullCol:'#00E6A8',bearCol:'#FF3B69'},
  cols:['#00E6A8','#00E6A8','#00E6A8'],
  fields:[['swingLen','num','Structural Anchor Swing Lookback',{min:3,max:40,step:1}],['maxPbPerAnchor','num','Max Pullbacks Per Trend Anchor',{min:1,max:4,step:1}],['minImpulseAtr','num','Min Impulse Expansion (ATR)',{min:.6,max:3.5,step:.1}],
    ['filterPreset','sel','Pullback Filter Mode',{opts:AVP_MODES}],['customMinEr','num','Custom Min Trend Efficiency (%)',{min:10,max:70,step:2}],['customBandSig','num','Custom Value Band Width (Sigma)',{min:.4,max:2.2,step:.05}],
    ['targetMode','sel','Target Projection Mode',{opts:AVP_TGT}],['slBufferAtr','num','Stop Loss Buffer Beyond Pullback (ATR)',{min:.05,max:1,step:.05}],['useBeRatchet','chk','Move Stop to Breakeven After TP1'],
    ['showPastPlans','chk','Keep Historical Trade Plans (Last 5)'],['showSkipped','chk','Show Filtered (SKIP) Pullbacks'],['showDash','chk','Show Summary Dashboard'],['dashSize','sel','Table Size',{opts:['Tiny','Small','Normal','Large']}],
    ['bullCol','col','Bullish Trend & Reward Color'],['bearCol','col','Bearish Trend & Risk Color']],
  calc:(c,p)=>{ const R=avpGet(c,p), N=c.length, s0=Math.max(0,N-181), A=[],T=[],B=[]; const rg=(h,a)=>{ const v=h.replace('#',''); return 'rgba('+parseInt(v.slice(0,2),16)+','+parseInt(v.slice(2,4),16)+','+parseInt(v.slice(4,6),16)+','+a+')'; };
    for(let i=s0;i<N;i++){ const t=c[i].time, ok=R.bias&&R.bias.length&&isFinite(R.avw[i])&&isFinite(R.sd[i])&&!(i>0&&(R.bias[i]!==R.bias[i-1]||R.abar[i]!==R.abar[i-1]));
      if(!ok){ A.push({time:t}); T.push({time:t}); B.push({time:t}); continue; }
      const bl=R.bias[i]===1, col=bl?p.bullCol:p.bearCol, sg=R.engs[R.sel].bandSigma, ec=rg(col,.14);
      A.push({time:t,value:R.avw[i],color:col}); T.push({time:t,value:R.avw[i]+sg*R.sd[i],color:ec}); B.push({time:t,value:R.avw[i]-sg*R.sd[i],color:ec}); }
    return [A,T,B]; },
  extras:(c,p)=>{ const R=avpGet(c,p), mk=[], ev=[], E=R.engs[R.sel], N=c.length; if(!E||!R.bias.length) return {mk,ev,labels:[],stat:'',boxes:[]};
    const rg=(h,a)=>{ const v=h.replace('#',''); return 'rgba('+parseInt(v.slice(0,2),16)+','+parseInt(v.slice(2,4),16)+','+parseInt(v.slice(4,6),16)+','+a+')'; };
    if(p.showSkipped) E.skips.forEach(s=>mk.push({time:c[s.i].time,position:s.dir===1?'belowBar':'aboveBar',color:rg(s.dir===1?p.bullCol:p.bearCol,.55),shape:'circle',text:'SKIP',keep:true}));
    const MSG={buy:['BUY','#2e7d32'],sell:['SELL','#c62828'],tp1:['TP1 reached','#2e7d32'],tp2:['TP2 reached','#2e7d32'],tp3:['TP3 reached','#2e7d32'],sl:['Stop Loss hit','#c62828']};
    E.ev.forEach(q=>{ const mm=MSG[q.k]; ev.push({k:'avp'+q.k+c[q.i].time,time:c[q.i].time,msg:mm[0]+' \u00b7 AVPT',col:mm[1]}); });
    return {mk,ev:ev.slice(-30),labels:[],stat:'',boxes:[{type:'avpview',pts:[],r:R,o:p,c}]}; }};
function avpDraw(d,X,Y,W,H){
  const R=d.r, p=d.o, c=d.c; if(!R||!R.bias.length) return; const N=c.length, E=R.engs[R.sel], BC=p.bullCol, SC=p.bearCol, FG='#e9edf5', BG='#0b0e14';
  const rg=(h,a)=>{ const v=h.replace('#',''); return 'rgba('+parseInt(v.slice(0,2),16)+','+parseInt(v.slice(2,4),16)+','+parseInt(v.slice(4,6),16)+','+a+')'; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  // value band fill (recent 180 bars, breaks on anchor change)
  { const s0=Math.max(1,N-181); let run=[]; const flush=()=>{ if(run.length>1){ cx.beginPath(); run.forEach((q,k)=>k?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1])); for(let k=run.length-1;k>=0;k--) cx.lineTo(run[k][0],run[k][2]); cx.closePath(); cx.fillStyle=rg(run.bias>0?BC:SC,.08); cx.fill(); } run=[]; };
    for(let i=s0;i<N;i++){ const ok=isFinite(R.avw[i])&&isFinite(R.sd[i])&&R.bias[i]===R.bias[i-1]&&R.abar[i]===R.abar[i-1]; if(!ok){ flush(); continue; }
      const x=X(i), a=Y(R.avw[i]+E.bandSigma*R.sd[i]), b=Y(R.avw[i]-E.bandSigma*R.sd[i]); if(x==null||a==null||b==null){ flush(); continue; } run.bias=R.bias[i]; run.push([x,a,b]); } flush(); }
  const tag=(x,y,t,bg,fg,left,up,sz)=>{ cx.font='bold '+(sz||9)+'px system-ui'; const w=cx.measureText(t).width+8, h=15; let x0=left?x+5:x-w/2, y0=left?y-h/2:(up?y+6:y-6-h); cx.fillStyle=bg; cx.fillRect(x0,y0,w,h);
    if(!left){ cx.beginPath(); if(up){ cx.moveTo(x-4,y0); cx.lineTo(x+4,y0); cx.lineTo(x,y0-5); } else { cx.moveTo(x-4,y0+h); cx.lineTo(x+4,y0+h); cx.lineTo(x,y0+h+5); } cx.fill(); }
    cx.fillStyle=fg; cx.textAlign='left'; cx.fillText(t,x0+4,y0+h/2); };
  const anc=R.trendBias===1?R.bullAnc:R.trendBias===-1?R.bearAnc:null;
  if(anc){ const x=X(anc.i), y=Y(anc.p); if(x!=null&&y!=null) tag(x,y,'\u2693 AVWAP',rg(R.trendBias===1?BC:SC,.75),'#0B0E14',false,R.trendBias===1); }
  const sp=R.plans.filter(q=>q.profId===R.sel), tot=sp.length;
  if(tot){ const sS=p.showPastPlans?Math.max(0,tot-5):Math.max(0,tot-3), sP=p.showPastPlans?Math.max(0,tot-3):tot-1;
    for(let k=sS;k<tot;k++){ const q=sp[k], x=X(q.entryBar), y=Y(q.signalY); if(x==null||y==null) continue; tag(x,y,(q.dir===1?'BUY ':'SELL ')+Math.round(q.qualPct)+'%',rg(q.dir===1?BC:SC,k===tot-1?.95:.75),'#0B0E14',false,q.dir===1); }
    for(let k=sP;k<tot;k++){ const q=sp[k], last=k===tot-1, xa=X(q.entryBar), xr=X(q.status===0?N-1+6:Math.max(q.endBar,q.entryBar+1)); if(xa==null||xr==null) continue;
      const yE=Y(q.entry), yS=Y(q.initSl), y1=Y(q.tp1), y2=Y(q.tp2), y3=Y(q.tp3); if([yE,yS,y1,y2,y3].some(v=>v==null)) continue;
      const pc=q.dir===1?BC:SC, xl=X(q.pbLeft), yt=Y(q.pbTop), yb=Y(q.pbBot);
      if(xl!=null&&yt!=null&&yb!=null){ cx.fillStyle=rg(pc,.10); cx.fillRect(xl,Math.min(yt,yb),xa-xl,Math.abs(yb-yt)); cx.strokeStyle=rg(pc,.45); cx.lineWidth=1; cx.setLineDash([1,3]); cx.strokeRect(xl,Math.min(yt,yb),xa-xl,Math.abs(yb-yt)); cx.setLineDash([]); }
      cx.fillStyle=rg(SC,.10); cx.fillRect(xa,Math.min(yE,yS),xr-xa,Math.abs(yS-yE)); cx.strokeStyle=rg(SC,.30); cx.strokeRect(xa,Math.min(yE,yS),xr-xa,Math.abs(yS-yE));
      cx.fillStyle=rg(BC,.08); cx.fillRect(xa,Math.min(yE,y3),xr-xa,Math.abs(y3-yE)); cx.strokeStyle=rg(BC,.30); cx.strokeRect(xa,Math.min(yE,y3),xr-xa,Math.abs(y3-yE));
      const ln=(y,col,dash)=>{ cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash(dash); cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(xr,y); cx.stroke(); cx.setLineDash([]); };
      ln(yE,'rgba(233,237,245,.75)',[]); ln(yS,rg(SC,.8),[]); ln(y1,rg(BC,.65),[1,3]); ln(y2,rg(BC,.7),[6,4]); ln(y3,rg(BC,.85),[]);
      if(last){ const f=v=>fmt(v), ck='\u2713';
        const slS=q.slHit?' \u2717':q.beHit?' (BE '+ck+')':(q.tp1Hit&&q.activeSl===q.entry)?' (BE)':' (-1R)', mg2=(q.tpIsMag&&q.tp2R!==2)?'\u00b7MAG':'', mg3=(q.tpIsMag&&q.tp2R===2)?'\u00b7MAG':'';
        tag(xr,yE,'ENTRY  '+f(q.entry),'rgba(11,14,20,.8)',FG,true); tag(xr,yS,'SL  '+f(q.initSl)+slS,rg(SC,q.slHit?.8:.18),FG,true);
        tag(xr,y1,'TP1  '+f(q.tp1)+' ('+q.tp1R+'R)'+(q.tp1Hit?' '+ck:''),rg(BC,q.tp1Hit?.8:.16),FG,true);
        tag(xr,y2,'TP2  '+f(q.tp2)+' ('+q.tp2R+'R'+mg2+')'+(q.tp2Hit?' '+ck:''),rg(BC,q.tp2Hit?.8:.16),FG,true);
        tag(xr,y3,'TP3  '+f(q.tp3)+' ('+q.tp3R+'R'+mg3+')'+(q.tp3Hit?' '+ck:''),rg(BC,q.tp3Hit?.85:.2),FG,true); } } }
  if(p.showDash){ const m=R.M[N-1], bias=R.trendBias, bcol=bias===1?BC:bias===-1?SC:'#8a91a5', muted='#8a91a5', win=E, erClear=m.er>=win.minErPct;
    const wr=win.total?win.win/win.total*100:0, netS=(win.net>=0?'+':'')+win.net.toFixed(1)+'R';
    let plan=win.lastText, pcol=win.lastDir===1?BC:win.lastDir===-1?SC:muted;
    if(win.act>=0&&win.act<R.plans.length){ const lp=R.plans[win.act]; pcol=lp.dir===1?BC:SC; const stt=lp.tp3Hit?'TP3\u2713':lp.slHit?'SL\u2717':lp.beHit?'BE\u2713':lp.tp2Hit?'TP2\u2713':lp.tp1Hit?'TP1\u2713':'OPEN'; plan=(lp.dir===1?'LONG @ ':'SHORT @ ')+fmt(lp.entry)+' ('+stt+')'; }
    const rows=[['AVPT [PhenLabs]',(bias===1?'BULL \u00b7 ':bias===-1?'BEAR \u00b7 ':'NEUTRAL \u00b7 ')+Math.round(m.er)+'% Eff',FG,erClear?bcol:muted],
      ['Anchored VWAP',isFinite(R.liveAvwap)?fmt(R.liveAvwap)+' (\u00b1'+(+win.bandSigma.toFixed(2))+'\u03c3)':'Scanning...',muted,bcol],
      ['Filter Profile',(p.filterPreset===AVP_MODES[0]?'Auto: ':'')+win.nameTag,muted,p.filterPreset===AVP_MODES[0]?BC:FG],
      ['Win Rate (TP1+)',win.total?wr.toFixed(1)+'% ('+win.win+'W/'+win.loss+'L) \u00b7 '+netS:'0 Trades',muted,wr>=55?BC:win.total===0?muted:FG],
      ['Target Hits','TP1: '+win.tp1+' \u00b7 TP2: '+win.tp2+' \u00b7 TP3: '+win.tp3,muted,FG],['Trade Plan',plan,muted,pcol]];
    const fs={Tiny:9,Small:10,Normal:11,Large:13}[p.dashSize]||10, rh=fs+9; cx.font='bold '+fs+'px system-ui';
    const w1=Math.max.apply(null,rows.map(r=>cx.measureText(r[0]).width))+14, w2=Math.max.apply(null,rows.map(r=>cx.measureText(r[1]).width))+14, tw=w1+w2, x0=Math.max(4,W-tw-6), y0=6;
    rows.forEach((r,k)=>{ const y=y0+k*rh; cx.fillStyle=k?'rgba(11,14,20,.82)':'rgba(11,14,20,.92)'; cx.fillRect(x0,y,tw,rh); cx.strokeStyle='rgba(233,237,245,.18)'; cx.strokeRect(x0,y,tw,rh);
      cx.textAlign='left'; cx.fillStyle=r[2]; cx.fillText(r[0],x0+6,y+rh/2); cx.textAlign='right'; cx.fillStyle=r[3]; cx.fillText(r[1],x0+tw-6,y+rh/2); }); }
  cx.restore();
}
{ const _avpPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='avpview') return avpDraw(d,X,Y,W,H); return _avpPrevDraw.apply(this,arguments); }; }
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
try{
/* ===== REINBLACKS VOLUME PROFILE & AUCTION STRATEGY (port of the Reinblacks Pine v6 strategy spec, built for this chart) =====
   Volume Profile (POC / VAH / VAL / HVN / LVN, previous + current session), volume analysis (healthy move, absorption, no supply / no demand,
   volume divergence), Auction Market Theory shapes (D, P, B, THIN), candlestick confirmation, previous-session value-area re-entry,
   higher-timeframe context, risk engine (1 % risk sizing, structure / ATR stop, R:R gate, partial, break-even, trailing), alerts, dashboard,
   built-in back-test (net profit, drawdown, win rate, profit factor, long vs short, equity curve).
   Everything is computed on CLOSED candles only (the forming candle is never used) and a signal is filled at the NEXT candle open: no repainting, no look-ahead.
   Volume per price row is an APPROXIMATION: each candle's volume is spread evenly over the rows its high-low range touches. It is not exchange order flow. */
const RVA_HTF={'Auto':0,'15m':900,'30m':1800,'1h':3600,'2h':7200,'4h':14400,'6h':21600,'12h':43200,'1D':86400,'3D':259200,'1W':604800};
const RVA_LAD=[900,1800,3600,7200,14400,21600,43200,86400,259200,604800];
const RVA_STOP=['Market structure','ATR','Structure (ATR-capped)'];
const RVA_TPM=['Model target (D-shape POC, re-entry VA edge)','Fixed R:R'];
const RVA_CT=['Linear / spot (USDT)','Inverse (coin-margined)'];
const RVA_M2TP=['Setup default (nearest barrier / naked POC)','Fixed R:R'];
const RVA_SN={S1:'POC FIRST RETURN',S2:'VALUE AREA RE-ENTRY',S3:'BREAKOUT RETEST'};
const RVA_SM={S1:'Setup 1 \u00b7 POC first-return reaction',S2:'Setup 2 \u00b7 Value-area re-entry reversal',S3:'Setup 3 \u00b7 Value-area breakout and retest'};
const rvaLab=l=>RVA_SN[l]||l;
const RVA_DEF={
  rows:400,vaPct:70,sessHours:24,sessOff:0,hvnMult:1.4,lvnMult:.4,maxNodes:3,
  volLen:20,spikeMult:1.8,bigAtr:.9,absBody:.35,noSup:.7,divLen:3,divRatio:.9,
  balTol:.12,pShare:55,thinMult:2.2,thinTrend:.5,minSessBars:8,minRangeAtr:1.5,
  wickMult:2,dojiBody:.1,rejWick:.6,bodyMin:.5,closePos:.6,ltfProxy:true,
  mRot:true,mCont:true,mThin:true,mAbs:true,mRe:true,allowLong:true,allowShort:true,
  reqVol:true,reqStruct:true,locAtr:.25,swingLen:3,
  useHtf:true,htf:'Auto',reAccept:2,reWin:24,
  risk:1,capital:10000,atrLen:14,stopMode:'Structure (ATR-capped)',slMult:1.5,slPad:.25,maxStopAtr:4,minStopAtr:.25,
  tpMode:RVA_TPM[0],tpRR:2,minRR:2,part:false,partPct:50,partR:1,be:false,beR:1,trail:false,trailAtr:2,
  comm:.05,slip:.02,maxLev:5,contract:RVA_CT[0],qtyStep:.001,
  showHist:true,histW:14,showVA:true,showPrev:true,showNodes:true,showPlans:true,planKeep:3,showSig:true,sigText:true,stickLbl:true,
  dash:true,dpos:'Top Right',dsize:'Tiny',theme:'Dark',stats:true,spos:'Bottom Left',
  m2On:true,s1On:true,s2On:true,s3On:true,pocFilter:true,cluFrac:.8,s1Win:6,s2Out:1,s2Bull:true,s3Body:.6,s3Close:.7,s3Vol:1.2,s3Wick:.35,s3Near:.5,s3Pen:.3,s3Run:3,s3Win:30,s3Bos:20,atrProt:.5,tpBuf:.1,m2Tp:RVA_M2TP[0],minNotional:5,showNaked:true,showTested:false,nakedMax:6,showClu:true,cClu:'#ffd23f',
  cPoc:'#e5383b',cVa:'#4da3ff',cBull:'#2e9e5b',cBear:'#e5383b',
  alLong:true,alShort:true,alDivB:true,alDivS:true,alPoc:false,alVah:false,alVal:false,alRe:true,alSL:true,alTP:true,alBo:true,alNpoc:false
};
const rvaRgba=(h,a)=>{ const v=String(h).replace('#',''); return 'rgba('+parseInt(v.slice(0,2),16)+','+parseInt(v.slice(2,4),16)+','+parseInt(v.slice(4,6),16)+','+a+')'; };
const rvaFmt=v=>{ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return a>=1000?v.toFixed(1):a>=10?v.toFixed(2):a>=1?v.toFixed(3):v.toFixed(5); };
function rvaIv(k){ const d=[]; for(let i=Math.max(1,k.length-20);i<k.length;i++) d.push(k[i].time-k[i-1].time); d.sort((a,b)=>a-b); let v=d[d.length>>1]||60; if(v>1e8) v/=1000; return v; }
function rvaAdd(S,b){ const lo=Math.floor(b.low/S.bin), hi=Math.floor(b.high/S.bin), cnt=hi-lo+1, sh=(b.volume||0)/cnt;
  for(let j=lo;j<=hi;j++) S.v[j]=(S.v[j]||0)+sh; if(lo<S.mn) S.mn=lo; if(hi>S.mx) S.mx=hi; }
// profile statistics: POC, value area (expanding from the POC), HVN / LVN nodes
function rvaStats(S,q){
  const mn=S.mn, mx=S.mx; if(!(mn<=mx)) return null; const len=mx-mn+1, a=new Array(len); let tot=0, pk=0, pi=0;
  for(let j=0;j<len;j++){ const x=S.v[mn+j]||0; a[j]=x; tot+=x; if(x>pk){ pk=x; pi=j; } }
  if(tot<=0) return null;
  let lo=pi, hi=pi, acc=pk; const tgt=tot*q.va/100;
  while(acc<tgt&&(lo>0||hi<len-1)){ const u=hi<len-1?a[hi+1]+(hi+2<len?a[hi+2]:0):-1, d=lo>0?a[lo-1]+(lo-2>=0?a[lo-2]:0):-1;
    if(u>=d){ hi++; acc+=a[hi]; } else { lo--; acc+=a[lo]; } }
  const avg=tot/len, sm=a.map((x,j)=>(x+(j?a[j-1]:x)+(j<len-1?a[j+1]:x))/3), sep=Math.max(2,Math.round(len*.06)), hv=[], lv=[];
  for(let j=0;j<len;j++){ const L=j?sm[j-1]:sm[j], R=j<len-1?sm[j+1]:sm[j];
    if(sm[j]>=L&&sm[j]>=R&&a[j]>=avg*q.hvnM) hv.push({j,v:a[j]});
    if(j>0&&j<len-1&&sm[j]<=L&&sm[j]<=R&&a[j]<=avg*q.lvnM) lv.push({j,v:a[j]}); }
  const sp=sm[pi], thr=sp*(q.cluFrac||.6); let c0=pi, c1=pi; while(c0>0&&sm[c0-1]>=thr) c0--; while(c1<len-1&&sm[c1+1]>=thr) c1++;
  { const mx2=Math.max(1,Math.round((hi-lo+1)*.4)); while(c1-c0+1>mx2){ const l2=c0<pi?sm[c0]:Infinity, r2=c1>pi?sm[c1]:Infinity; if(l2===Infinity&&r2===Infinity) break; if(l2<=r2) c0++; else c1--; } }
  const pick=(arr,asc)=>{ arr.sort((x,y)=>asc?x.v-y.v:y.v-x.v); const o=[]; for(const e of arr){ if(o.length>=q.maxNodes) break; if(o.every(z=>Math.abs(z.j-e.j)>=sep)) o.push(e); }
    return o.map(e=>({p:(mn+e.j+.5)*S.bin,lo:(mn+e.j)*S.bin,hi:(mn+e.j+1)*S.bin,v:e.v})); };
  return {poc:(mn+pi+.5)*S.bin,vah:(mn+hi+1)*S.bin,val:(mn+lo)*S.bin,clLo:(mn+c0)*S.bin,clHi:(mn+c1+1)*S.bin,tot,pk,avg,rows:a,mn,bin:S.bin,len,pi,lo,hi,hvn:pick(hv,false),lvn:pick(lv,true)};
}
function rvaShareAbove(st,mid){ let s=0; for(let j=0;j<st.len;j++) if((st.mn+j+.5)*st.bin>mid) s+=st.rows[j]; return st.tot>0?s/st.tot:.5; }
// Auction Market Theory classification: D (balanced), P (upper heavy), B (lower heavy), THIN (low-volume trend) or UNCLEAR (never forced)
function rvaShape(S,st,atr,q,close){
  if(!st||S.n<q.minSessBars||!(atr>0)) return {s:'UNCLEAR',d:0};
  const rg=S.hi-S.lo; if(rg<q.minRangeAtr*atr) return {s:'UNCLEAR',d:0};
  const mid=(S.hi+S.lo)/2, pp=(st.poc-S.lo)/rg, ab=rvaShareAbove(st,mid);
  if(Math.abs(pp-.5)<=q.balTol&&Math.abs(ab-.5)<=.12) return {s:'D',d:0};
  if(pp>.5+q.balTol&&ab>=q.pShare/100&&close>mid) return {s:'P',d:1};
  if(pp<.5-q.balTol&&ab<=1-q.pShare/100&&close<mid) return {s:'B',d:-1};
  const drift=close-S.o;
  if(st.pk/st.avg<=q.thinMult&&Math.abs(drift)>=q.thinTrend*rg) return {s:'THIN',d:drift>0?1:-1};
  return {s:'UNCLEAR',d:0};
}
function rvaGet(c,p){
  const D={ok:false,msg:'',mk:[],ev:[],trades:[],sigs:[],lbl:[]}, N=c.length-1;
  const nm=(x,d,lo,hi)=>{ x=+x; if(!isFinite(x)) x=d; return Math.max(lo,Math.min(hi,x)); };
  if(N<80){ D.msg='Needs at least 80 closed candles'; return D; }
  const k=c.slice(0,N); if(!k.some(x=>x.volume>0)){ D.msg='No volume data on this market'; return D; }
  const iv=rvaIv(k), g=(key,d,lo,hi)=>nm(p[key],d,lo,hi);
  const q={ rows:Math.round(g('rows',400,10,500)), va:g('vaPct',70,30,95), SL:Math.round(g('sessHours',24,1,168))*3600, OFF:g('sessOff',0,-12,12)*3600,
    hvnM:g('hvnMult',1.4,1,5), lvnM:g('lvnMult',.4,.05,1), maxNodes:Math.round(g('maxNodes',3,1,6)),
    volLen:Math.round(g('volLen',20,3,200)), spike:g('spikeMult',1.8,1,6), bigAtr:g('bigAtr',.9,.2,3), absBody:g('absBody',.35,.05,.7), noSup:g('noSup',.7,.2,1),
    divLen:Math.round(g('divLen',3,2,10)), divRatio:g('divRatio',.9,.3,1),
    balTol:g('balTol',.12,.02,.3), pShare:g('pShare',55,50,90), thinMult:g('thinMult',2.2,1.2,6), thinTrend:g('thinTrend',.5,.2,1), minSessBars:Math.round(g('minSessBars',8,3,200)), minRangeAtr:g('minRangeAtr',1.5,.3,10),
    wick:g('wickMult',2,1,5), doji:g('dojiBody',.1,.02,.3), rej:g('rejWick',.6,.4,.9), bodyMin:g('bodyMin',.5,.2,.9), closePos:g('closePos',.6,.5,.9), ltf:!!p.ltfProxy,
    loc:g('locAtr',.25,.05,2), L:Math.round(g('swingLen',3,2,10)),
    reAcc:Math.round(g('reAccept',2,1,5)), reWin:Math.round(g('reWin',24,3,300)),
    risk:g('risk',1,.1,10), cap:g('capital',10000,100,1e9), atrLen:Math.round(g('atrLen',14,2,100)), slMult:g('slMult',1.5,.3,10), slPad:g('slPad',.25,0,3), maxStop:g('maxStopAtr',4,.5,20), minStop:g('minStopAtr',.25,.02,3),
    tpRR:g('tpRR',2,.5,20), minRR:g('minRR',2,.5,20), partPct:g('partPct',50,5,95), partR:g('partR',1,.3,10), beR:g('beR',1,.3,10), trailAtr:g('trailAtr',2,.3,10),
    comm:g('comm',.05,0,1), slip:g('slip',.02,0,1), maxLev:g('maxLev',5,1,125), step:g('qtyStep',.001,1e-8,1e6), planKeep:Math.round(g('planKeep',3,1,20)),
    cluFrac:g('cluFrac',.8,.3,.95), s1Win:Math.round(g('s1Win',6,1,30)), s2Out:Math.round(g('s2Out',1,1,5)), s3Body:g('s3Body',.6,.3,.95), s3Close:g('s3Close',.7,.5,.95), s3Vol:g('s3Vol',1.2,.5,5), s3Wick:g('s3Wick',.35,.05,.8), s3Near:g('s3Near',.5,.1,3), s3Pen:g('s3Pen',.3,0,2), s3Run:g('s3Run',3,1,10), s3Win:Math.round(g('s3Win',30,3,300)), s3Bos:Math.round(g('s3Bos',20,2,200)),
    atrProt:g('atrProt',.5,0,5), tpBuf:g('tpBuf',.1,0,2), minNot:g('minNotional',5,0,1e9) };
  const atr=atrW(k,q.atrLen), vma=[]; { let s=0; for(let i=0;i<N;i++){ s+=k[i].volume||0; if(i>=q.volLen) s-=k[i-q.volLen].volume||0; vma.push(s/Math.min(i+1,q.volLen)); } }
  // ---- higher timeframe buckets (completed candles only) ----
  let H=RVA_HTF[p.htf]; if(H==null) H=0; if(!H){ const t=iv*6; H=RVA_LAD.find(x=>x>=t)||RVA_LAD[RVA_LAD.length-1]; }
  const htfOn=!!p.useHtf&&H>iv*1.5, bk=[];
  if(htfOn) for(let i=0;i<N;i++){ const key=Math.floor(k[i].time/H), b=k[i], L=bk[bk.length-1];
    if(L&&L.key===key){ if(b.high>L.h) L.h=b.high; if(b.low<L.l) L.l=b.low; L.c=b.close; L.v+=b.volume||0; } else bk.push({key,o:b.open,h:b.high,l:b.low,c:b.close,v:b.volume||0}); }
  let hm=0, hSH=[], hSL=[], hTr=0, hSt=null;
  const hCompute=()=>{ const j=hm-1-2; if(j>=2){ const x=bk[j]; let ph=true, pl=true;
      for(let u=j-2;u<=j+2;u++){ if(u===j) continue; if(bk[u].high!==undefined){} const y=bk[u]; if(u<j?y.h>=x.h:y.h>x.h) ph=false; if(u<j?y.l<=x.l:y.l<x.l) pl=false; }
      if(ph) hSH.push(x.h); if(pl) hSL.push(x.l); }
    const a=hSH.length, b=hSL.length; hTr=(a>=2&&b>=2)?((hSH[a-1]>hSH[a-2]&&hSL[b-1]>hSL[b-2])?1:(hSH[a-1]<hSH[a-2]&&hSL[b-1]<hSL[b-2])?-1:0):0;
    const from=Math.max(0,hm-20); let mxh=-Infinity, mnl=Infinity; for(let u=from;u<hm;u++){ if(bk[u].h>mxh) mxh=bk[u].h; if(bk[u].l<mnl) mnl=bk[u].l; }
    if(hm-from>=5&&mxh>mnl){ const S2={bin:(mxh-mnl)/q.rows,v:{},mn:Infinity,mx:-Infinity}; for(let u=from;u<hm;u++) rvaAdd(S2,{low:bk[u].l,high:bk[u].h,volume:bk[u].v}); hSt=rvaStats(S2,q); } };
  // ---- main walk ----
  let S=null, prev=null, fin=[], re=null, firstR=0; { let mx=-Infinity, mn=Infinity; for(let i=0;i<Math.min(N,150);i++){ if(k[i].high>mx) mx=k[i].high; if(k[i].low<mn) mn=k[i].low; } firstR=mx-mn; }
  let lSH=NaN, lSL=NaN, pSH=NaN, pSL=NaN, tr=0, lastPL=null, lastPH=null, divBullAt=-1e9, divBearAt=-1e9;
  // ---- MODULE 2 state: naked POCs, POC sequence, per-session setup state machines ----
  const np=[], seqP=[]; let seqB=0, seqV=0, seqRun=0, seqRunDir=0;
  const seqUpd=poc=>{ const Lp=seqP.length?seqP[seqP.length-1]:null; seqP.push(poc); if(Lp==null) return; const tl=Math.abs(Lp)*1e-6, dd=poc>Lp+tl?1:poc<Lp-tl?-1:0; if(!dd) return;
    if(dd===seqRunDir) seqRun++; else { seqRunDir=dd; seqRun=1; }
    if(seqRun>=2){ seqB=dd; seqV=0; } else if(seqB!==0&&dd===-seqB){ seqV++; if(seqV>=2){ seqB=0; seqV=0; } } };
  const mkM2=()=>({s1:{t0:-1,pi:-1,d:0,done:false},s2:{dir:0,ext:NaN,nOut:0,cnt:0,i0:0,pLo:Infinity,pHi:-Infinity},s3:{dir:0,lvl:NaN,bi:-1,ph:NaN,t0:-1,pb:NaN},cA:0,cB:0,cI:0,rx:null,note:'',volNote:'n/a'});
  let m2=mkM2(), lastM2=m2;
  let pos=null, pend=null, eq=q.cap, curve=[{t:k[0].time,e:q.cap}], lastNear=0, ab=new Array(N).fill(0);
  const trades=D.trades, push=(i,type,msg,col,price)=>D.ev.push({k:type,time:k[i].time,msg,col,type,price});
  const GREEN=p.cBull||'#2e9e5b', RED=p.cBear||'#e5383b';
  const patt=i=>{ const b=k[i], rg=b.high-b.low; const r={bull:'',bear:'',doji:false}; if(!(rg>0)) return r;
    const body=Math.abs(b.close-b.open), up=b.high-Math.max(b.open,b.close), lo=Math.min(b.open,b.close)-b.low, pb=i?k[i-1]:null;
    r.doji=body<=q.doji*rg;
    if(!r.doji||true){
      if(lo>=q.wick*body&&up<=.3*rg&&lo>=.5*rg) r.bull='Hammer'; else if(up>=q.wick*body&&lo<=.3*rg&&up>=.5*rg) r.bear='Shooting star';
      if(pb&&body/rg>=q.bodyMin){ const pbody=Math.abs(pb.close-pb.open);
        if(pb.close<pb.open&&b.close>b.open&&b.close>=pb.open&&b.open<=pb.close&&body>pbody) r.bull='Bullish engulfing';
        if(pb.close>pb.open&&b.close<b.open&&b.close<=pb.open&&b.open>=pb.close&&body>pbody) r.bear='Bearish engulfing'; }
      if(!r.bull&&lo>=q.rej*rg&&b.close>=b.low+.5*rg) r.bull='Rejection';
      if(!r.bear&&up>=q.rej*rg&&b.close<=b.low+.5*rg) r.bear='Rejection'; }
    if(q.ltf){ if(r.bull&&b.close<b.low+q.closePos*rg) r.bull=''; if(r.bear&&b.close>b.high-q.closePos*rg) r.bear=''; }
    return r; };
  const volc=i=>{ const b=k[i], rg=b.high-b.low, body=Math.abs(b.close-b.open), A=atr[i], v=b.volume||0, m=vma[i], pv=i?k[i-1].volume||0:0, pv2=i>1?k[i-2].volume||0:0, o={lab:'Normal',bull:false,bear:false,abs:0};
    if(!(rg>0)||!(A>0)) return o; const up=b.high-Math.max(b.open,b.close), lo=Math.min(b.open,b.close)-b.low, spike=v>=q.spike*m;
    if(spike&&body<=q.absBody*rg){ if(lo>up*1.3){ o.abs=1; o.lab='Absorption (buyers)'; } else if(up>lo*1.3){ o.abs=-1; o.lab='Absorption (sellers)'; } else o.lab='Absorption (neutral)'; }
    else if(rg>=q.bigAtr*A&&v>pv&&v>m){ if(b.close>b.open){ o.bull=true; o.lab='Healthy move \u2191'; } else if(b.close<b.open){ o.bear=true; o.lab='Healthy move \u2193'; } }
    else if(b.close<b.open&&v<m*q.noSup&&v<pv&&v<pv2){ o.bull=true; o.lab='No supply'; }
    else if(b.close>b.open&&v<m*q.noSup&&v<pv&&v<pv2){ o.bear=true; o.lab='No demand'; }
    else if(spike) o.lab='Volume spike';
    return o; };
  let lastVL='Normal', lastShape={s:'UNCLEAR',d:0}, lastSt=null, lastBias=0, lastHd=0, lastTr=0, lastPat=null;
  for(let i=0;i<N;i++){
    const b=k[i], id=Math.floor((b.time-q.OFF)/q.SL), A=atr[i];
    // ---- session roll ----
    if(!S||id!==S.id){ if(S){ S.i1=i-1; S.st=rvaStats(S,q); S.v=null; fin.push(S); prev=S; S.cp=S.st?(S.c>S.st.vah?'above':S.c<S.st.val?'below':'inside'):'';
        if(S.st){ np.push({poc:S.st.poc,id:S.id,i0:S.i0,i1:S.i1,tested:false}); if(np.length>80) np.splice(0,np.length-80); seqUpd(S.st.poc); } }
      const pr=prev?Math.max(prev.hi-prev.lo,1e-9):firstR; S={id,i0:i,lo:b.low,hi:b.high,o:b.open,c:b.close,v:{},mn:Infinity,mx:-Infinity,n:0,bin:Math.max(pr/q.rows,(isFinite(A)&&A>0?A*.02:0),b.close*1e-6)};
      re=null; m2=mkM2(); if(prev&&prev.st){ const dir=b.open<prev.st.val?1:b.open>prev.st.vah?-1:0; if(dir) re={dir,cnt:0,ext:dir>0?b.low:b.high,done:false,bars:0,entered:false}; } }
    S.c=b.close; S.n++; if(b.low<S.lo) S.lo=b.low; if(b.high>S.hi) S.hi=b.high; rvaAdd(S,b);
    const st=rvaStats(S,q); lastSt=st;
    // ---- structure (swing pivots confirmed L bars later) ----
    { const j=i-q.L; if(j>=q.L){ let ph=true, pl=true; for(let u=j-q.L;u<=j+q.L;u++){ if(u===j) continue; if(u<j?k[u].high>=k[j].high:k[u].high>k[j].high) ph=false; if(u<j?k[u].low<=k[j].low:k[u].low<k[j].low) pl=false; }
        if(ph){ pSH=lSH; lSH=k[j].high; } if(pl){ pSL=lSL; lSL=k[j].low; }
        // volume divergence on a confirmed swing (volume around the swing, compared with the previous swing)
        const vv=(u)=>((k[u-1].volume||0)+(k[u].volume||0)+(k[u+1].volume||0))/3;
        if(pl){ const cur={j,p:k[j].low,v:vv(j)}; if(lastPL&&j-lastPL.j<=80&&cur.p<lastPL.p&&cur.v<lastPL.v*q.divRatio){ divBullAt=i; push(i,'divB','Bullish volume divergence (lower low, weaker volume)',GREEN,k[j].low); } lastPL=cur; }
        if(ph){ const cur={j,p:k[j].high,v:vv(j)}; if(lastPH&&j-lastPH.j<=80&&cur.p>lastPH.p&&cur.v<lastPH.v*q.divRatio){ divBearAt=i; push(i,'divS','Bearish volume divergence (higher high, weaker volume)',RED,k[j].high); } lastPH=cur; } }
      tr=(isFinite(pSH)&&isFinite(pSL)&&isFinite(lSH)&&isFinite(lSL))?((lSH>pSH&&lSL>pSL)?1:(lSH<pSH&&lSL<pSL)?-1:0):0; }
    // ---- higher timeframe context (only completed HTF candles) ----
    let hd=0; if(htfOn){ while(hm<bk.length&&(bk[hm].key+1)*H<=b.time+iv+1e-6){ hm++; hCompute(); }
      hd=hTr; if(hSt){ if(hd>0&&b.close<hSt.val) hd=0; else if(hd<0&&b.close>hSt.vah) hd=0; else if(hd===0) hd=b.close>hSt.vah?1:b.close<hSt.val?-1:0; } }
    const bias=htfOn?(hd!==0?(tr===-hd?0:hd):tr):tr;
    const vc=volc(i); ab[i]=vc.abs; const pt=patt(i); lastVL=vc.lab; lastPat=pt;
    const sh=rvaShape(S,st,A,q,b.close); lastShape=sh; lastBias=bias; lastHd=hd; lastTr=tr;
    // ================= back-test engine: fill / manage on this candle =================
    if(pend&&!pos){ const d=pend.dir, fx=b.open*(1+d*q.slip/100), r0=d*(fx-pend.stop), okR=r0>0&&r0<=q.maxStop*pend.atr*1.25&&d*(pend.tp-fx)/r0>=q.minRR*.9;
      if(okR){ const rAmt=eq*q.risk/100; let qty=rAmt/r0; if(qty*fx>eq*q.maxLev) qty=eq*q.maxLev/fx; qty=Math.floor(qty/q.step)*q.step;
        if(qty>0&&qty*fx>=q.minNot){ const fee=q.comm/100*qty*fx; pos={dir:d,i0:i,entry:fx,stop:pend.stop,stop0:pend.stop,tp:pend.tp,qty,q0:qty,risk0:r0,rAmt:qty*r0,ext:fx,pnl:-fee,model:pend.model,label:pend.label,partDone:false,beDone:false}; } }
      pend=null; } else if(pend) pend=null;
    if(pos){ const d=pos.dir, slHit=d>0?b.low<=pos.stop:b.high>=pos.stop, tpHit=d>0?b.high>=pos.tp:b.low<=pos.tp;
      const close=(px,kind)=>{ const fee=q.comm/100*Math.abs(px*pos.qty); pos.pnl+=d*(px-pos.entry)*pos.qty-fee; eq+=pos.pnl;
        trades.push({i0:pos.i0,i1:i,dir:d,entry:pos.entry,stop:pos.stop0,tp:pos.tp,exit:px,pnl:pos.pnl,R:pos.rAmt>0?pos.pnl/pos.rAmt:0,res:kind,model:pos.model,label:pos.label,qty:pos.q0,part:pos.partDone});
        curve.push({t:b.time,e:eq}); push(i,kind==='tp'?'tp':'sl',(kind==='tp'?'Take profit hit':kind==='sl'?'Stop loss hit':kind==='be'?'Stop hit at break-even':'Trailing stop hit')+' \u00b7 '+rvaLab(pos.label),kind==='tp'?GREEN:RED,px); pos=null; };
      if(slHit){ const px=pos.stop*(1-d*q.slip/100), kind=(d>0?pos.stop>pos.entry:pos.stop<pos.entry)?'tr':(pos.stop===pos.entry?'be':'sl'); close(px,kind); }
      else { if(p.part&&!pos.partDone){ const lv=pos.entry+d*q.partR*pos.risk0; if(d>0?b.high>=lv:b.low<=lv){ const qp=pos.qty*q.partPct/100; pos.pnl+=d*(lv-pos.entry)*qp-q.comm/100*qp*lv; pos.qty-=qp; pos.partDone=true; } }
        if(tpHit) close(pos.tp,'tp');
        else { if(p.be&&!pos.beDone&&(d>0?b.high>=pos.entry+d*q.beR*pos.risk0:b.low<=pos.entry+d*q.beR*pos.risk0)){ pos.beDone=true; pos.stop=d>0?Math.max(pos.stop,pos.entry):Math.min(pos.stop,pos.entry); }
          if(p.trail){ pos.ext=d>0?Math.max(pos.ext,b.high):Math.min(pos.ext,b.low); if(d*(pos.ext-pos.entry)>=pos.risk0&&A>0){ const ns=pos.ext-d*q.trailAtr*A; pos.stop=d>0?Math.max(pos.stop,ns):Math.min(pos.stop,ns); } } } } }
    // ---- level events (alerts): POC retest, VAH / VAL rejection ----
    if(st&&S.n>=q.minSessBars&&A>0){ const tol=q.loc*A, rg=b.high-b.low, up=b.high-Math.max(b.open,b.close), lo=Math.min(b.open,b.close)-b.low;
      const near=(b.low<=st.poc+tol&&b.high>=st.poc-tol); if(near&&!lastNear) push(i,'poc','POC retest @ '+rvaFmt(st.poc),'#ffffff',st.poc); lastNear=near?1:0;
      if(rg>0&&b.high>=st.vah-tol&&b.close<st.vah&&up>=.4*rg) push(i,'vah','VAH rejection @ '+rvaFmt(st.vah),RED,st.vah);
      if(rg>0&&b.low<=st.val+tol&&b.close>st.val&&lo>=.4*rg) push(i,'val','VAL rejection @ '+rvaFmt(st.val),GREEN,st.val); }
    // ================= entry models (closed candle) =================
    if(re&&!re.done&&prev&&prev.st){ re.bars++; const inside=b.close>prev.st.val&&b.close<prev.st.vah;
      if(re.dir>0){ if(b.low<re.ext) re.ext=b.low; } else if(b.high>re.ext) re.ext=b.high;
      if(inside){ if(!re.entered){ re.entered=true; push(i,'re','Previous value area re-entry ('+(re.dir>0?'from below':'from above')+')',re.dir>0?GREEN:RED,b.close); } re.cnt++; } else re.cnt=0;
      if((re.dir>0&&b.close>=prev.st.vah)||(re.dir<0&&b.close<=prev.st.val)||re.bars>q.reWin) re.done=true; }
    // ================= MODULE 2: three-setup session profile engine =================
    // Levels come ONLY from the previous completed session (frozen at the roll); every rule below reads closed candles; a signal is filled at the next open.
    let cand=null;
    for(const z of np) if(!z.tested&&b.low<=z.poc&&b.high>=z.poc){ z.tested=true; z.ti=i; push(i,'npoc','Naked POC tested @ '+rvaFmt(z.poc),'#ffd23f',z.poc); }
    if(p.m2On&&prev&&prev.st&&A>0){
      const pv=prev.st, cl0=pv.clLo, cl1=pv.clHi, tolc=q.loc*A, M=m2, Rg=b.high-b.low, vN=b.volume||0, vP=i?(k[i-1].volume||0):0;
      const dirOK=d=>(d>0?p.allowLong:p.allowShort)&&!(p.pocFilter&&seqB===-d)&&!(p.useHtf&&hd===-d);
      const nearL=(arr,d,e)=>{ let best=null; for(const L of arr){ if(!isFinite(L)) continue; const dd=d*(L-e); if(dd>.5*A&&(best==null||dd<d*(best-e))) best=L; } return best; };
      const nk=()=>np.filter(z=>!z.tested).map(z=>z.poc);
      const outC=L=>!(L>=cl0&&L<=cl1);
      const mk2=(d,label,stp0,pick,soft)=>{ if(!dirOK(d)) return null; const e=b.close, stp=d>0?Math.min(stp0,e-q.atrProt*A):Math.max(stp0,e+q.atrProt*A), r=d*(e-stp);
        if(!(r>0)||r<q.minStop*A||r>q.maxStop*A) return null;
        let tp=e+d*r*q.tpRR;
        if(p.m2Tp!==RVA_M2TP[1]){ const L=pick(e); if(L!=null){ const t2=L-d*q.tpBuf*A; if(d*(t2-e)/r>=q.minRR-1e-9) tp=t2; else if(!soft) return null; } }
        if(d*(tp-e)/r<q.minRR-1e-9) return null;
        return {dir:d,model:RVA_SM[label],label,entryRef:e,stop:stp,tp,rr:d*(tp-e)/r,atr:A,i}; };
      // acceptance counters (consecutive closes beyond / inside the previous value area)
      M.cA=b.close>pv.vah?M.cA+1:0; M.cB=b.close<pv.val?M.cB+1:0; M.cI=(b.close<=pv.vah&&b.close>=pv.val)?M.cI+1:0;
      // reaction: test of a profile level, rejection, then a directional candle that confirms
      if(M.rx&&!M.rx.conf&&i===M.rx.i+1&&((M.rx.d>0&&b.close>b.open&&b.close>M.rx.lv)||(M.rx.d<0&&b.close<b.open&&b.close<M.rx.lv))) M.rx.conf=true;
      if(Rg>0) for(const [nL,lv] of [['VAH',pv.vah],['VAL',pv.val],['POC',pv.poc]]){ if(b.high>=lv-tolc&&b.low<=lv+tolc){ const lw=Math.min(b.open,b.close)-b.low, uw=b.high-Math.max(b.open,b.close);
          if(b.close>lv&&lw>=.4*Rg){ M.rx={nm:nL,d:1,i,conf:false,lv}; break; } if(b.close<lv&&uw>=.4*Rg){ M.rx={nm:nL,d:-1,i,conf:false,lv}; break; } } }
      // ---- SETUP 1: POC first-return reaction (only when the previous session CLOSED OUTSIDE its value area) ----
      if(p.s1On&&prev.cp&&prev.cp!=='inside'){ const s=M.s1; if(!s.done){
          if(s.t0<0&&b.high>=cl0-tolc&&b.low<=cl1+tolc){ s.t0=i; push(i,'s1','POC cluster first return ('+rvaFmt(cl0)+' - '+rvaFmt(cl1)+')','#ffd23f',pv.poc); }
          if(s.t0>=0){
            if(s.pi>=0&&i===s.pi+1){ const d=s.d, ok=d>0?(b.close>b.open&&b.close>cl1):(b.close<b.open&&b.close<cl0), vOk=vN>vP; M.volNote='S1 confirm volume '+(vP>0?(vN/vP).toFixed(2)+'x previous':'-')+(vOk?' \u2713':' \u2717');
              if(ok&&vOk){ const pb=k[s.pi]; cand=mk2(d,'S1',d>0?Math.min(cl0,pb.low)-q.slPad*A:Math.max(cl1,pb.high)+q.slPad*A,e=>nearL([pv.vah,pv.val].concat(pv.hvn.map(x=>x.p),nk()).filter(outC),d,e),false); s.done=true; }
              else { s.pi=-1; if(i-s.t0>=q.s1Win) s.done=true; } }
            if(!s.done&&s.pi<0&&i-s.t0<=q.s1Win){ const dl=pt.bull&&b.low<=cl1+tolc&&b.close>=cl1, ds=pt.bear&&b.high>=cl0-tolc&&b.close<=cl0; if(dl&&!ds){ s.pi=i; s.d=1; } else if(ds&&!dl){ s.pi=i; s.d=-1; } }
            if(!s.done&&s.pi<0&&i-s.t0>=q.s1Win) s.done=true; } } }
      // ---- SETUP 2: value-area re-entry reversal (only when the previous session CLOSED INSIDE its value area) ----
      if(p.s2On&&prev.cp==='inside'){ const s=M.s2, VAL=pv.val, VAH=pv.vah;
        if(b.low<VAL) s.pLo=Math.min(s.pLo,b.low); else s.pLo=Infinity; if(b.high>VAH) s.pHi=Math.max(s.pHi,b.high); else s.pHi=-Infinity;
        if(s.dir===0){ if(b.close<VAL){ s.dir=1; s.ext=Math.min(s.pLo,b.low); s.nOut=1; s.cnt=0; s.i0=i; } else if(b.close>VAH){ s.dir=-1; s.ext=Math.max(s.pHi,b.high); s.nOut=1; s.cnt=0; s.i0=i; } }
        else { const d=s.dir; if(d>0){ if(b.low<s.ext) s.ext=b.low; } else if(b.high>s.ext) s.ext=b.high;
          const out=d>0?b.close<VAL:b.close>VAH, thru=d>0?b.close>=VAH:b.close<=VAL;
          if(i-s.i0>q.reWin||thru){ s.dir=0; s.cnt=0; s.nOut=0; }
          else if(out){ if(s.cnt>0) M.note='Re-entry acceptance failed'; s.nOut++; s.cnt=0; }
          else if(s.nOut>=q.s2Out){ s.cnt++; if(s.cnt===1) push(i,'re','Value-area re-entry ('+(d>0?'from below':'from above')+')',d>0?GREEN:RED,b.close);
            if(s.cnt>=q.reAcc&&(!p.s2Bull||(d>0?b.close>b.open:b.close<b.open))){ const ex=s.ext; cand=mk2(d,'S2',d>0?ex-q.slPad*A:ex+q.slPad*A,e=>nearL([d>0?VAH:VAL].concat(pv.hvn.map(x=>x.p)),d,e),false); s.dir=0; s.cnt=0; s.nOut=0; s.pLo=Infinity; s.pHi=-Infinity; } } } }
      // ---- SETUP 3: value-area breakout and retest (any previous close) ----
      if(p.s3On){ const s=M.s3, VAH=pv.vah, VAL=pv.val;
        if(s.dir===0){ const pc=i?k[i-1].close:b.open, body=Math.abs(b.close-b.open), up=b.close>VAH&&pc<=VAH, dn=b.close<VAL&&pc>=VAL;
          if((up||dn)&&Rg>0&&vN>0){ const d=up?1:-1, bodyOK=body>=q.s3Body*Rg&&(d>0?b.close>b.open&&(b.close-b.low)>=q.s3Close*Rg:b.close<b.open&&(b.high-b.close)>=q.s3Close*Rg),
              volOK=vN>=q.s3Vol*vma[i], opp=d>0?b.high-Math.max(b.open,b.close):Math.min(b.open,b.close)-b.low, absorb=/^Absorption/.test(vc.lab)||opp>q.s3Wick*Rg;
            M.volNote='Breakout volume '+(vma[i]>0?(vN/vma[i]).toFixed(2)+'x average':'-')+(volOK?' \u2713':' \u2717');
            if(bodyOK&&volOK&&!absorb&&dirOK(d)){ s.dir=d; s.lvl=d>0?VAH:VAL; s.bi=i; s.ph=d>0?b.high:b.low; s.t0=-1; s.pb=NaN; M.note=''; push(i,'bo',(d>0?'Breakout above':'Breakout below')+' previous '+(d>0?'VAH ':'VAL ')+rvaFmt(s.lvl)+' - waiting for the pullback (never chase)',d>0?GREEN:RED,b.close); }
            else M.note='Breakout candle rejected: '+(!bodyOK?'weak body':!volOK?'volume below average x '+q.s3Vol:absorb?'possible absorption':'blocked by bias filter'); } }
        else if(i>s.bi){ const d=s.dir, lv=s.lvl, fail=why=>{ s.dir=0; s.t0=-1; M.note='Breakout setup invalid: '+why; };
          const deep=d>0?b.low<lv-q.s3Pen*A:b.high>lv+q.s3Pen*A;
          if(i-s.bi>q.s3Win) fail('too slow');
          else if(d>0?b.close<lv:b.close>lv) fail('close back through the level');
          else if(s.t0<0){ const touch=d>0?b.low<=lv+q.s3Near*A:b.high>=lv-q.s3Near*A;
            if(touch){ if(deep) fail('pullback too deep'); else { s.t0=i; s.pb=d>0?b.low:b.high; } }
            else { s.ph=d>0?Math.max(s.ph,b.high):Math.min(s.ph,b.low); if(Math.abs(b.close-lv)>q.s3Run*A) fail('price ran away without a retest'); } }
          else { if(deep) fail('pullback too deep'); else if(i-s.t0>q.s3Bos) fail('no break of structure');
            else { s.pb=d>0?Math.min(s.pb,b.low):Math.max(s.pb,b.high);
              if(i>s.t0&&(d>0?b.close>s.ph:b.close<s.ph)){ cand=mk2(d,'S3',d>0?s.pb-q.slPad*A:s.pb+q.slPad*A,e=>nearL(nk(),d,e),true); M.note=''; s.dir=0; s.t0=-1; push(i,'bo','Break of structure confirmed after the retest ('+(d>0?'higher high':'lower low')+')',d>0?GREEN:RED,b.close); } } } } }
    }
    lastM2=m2;
    let sig=null;
    if(!pos&&!pend&&prev&&prev.st&&A>0&&i>=q.L*2+5){
      const mk=(d,model,label,tpM)=>{ if(d>0?!p.allowLong:!p.allowShort) return null; const e=b.close;
        let stp; if(label==='RE'){ stp=d>0?re.ext-q.slPad*A:re.ext+q.slPad*A; }
        else { let sb=d>0?Math.min(b.low,i?k[i-1].low:b.low):Math.max(b.high,i?k[i-1].high:b.high); const sw=d>0?lSL:lSH;
          if(isFinite(sw)&&(d>0?sw<e:sw>e)&&Math.abs(e-sw)<=q.maxStop*A) sb=d>0?Math.min(sb,sw):Math.max(sb,sw);
          const sS=d>0?sb-q.slPad*A:sb+q.slPad*A, sA=d>0?e-q.slMult*A:e+q.slMult*A;
          stp=p.stopMode==='ATR'?sA:p.stopMode==='Market structure'?sS:(d>0?Math.max(sS,e-q.maxStop*A):Math.min(sS,e+q.maxStop*A)); }
        const r=d*(e-stp); if(!(r>0)||r<q.minStop*A||r>q.maxStop*A) return null;
        let tp=(p.tpMode===RVA_TPM[0]&&tpM!=null&&d*(tpM-e)>0)?tpM:e+d*r*q.tpRR; if(p.tpMode===RVA_TPM[0]&&tpM!=null&&!(d*(tpM-e)>0)) return null;
        const rr=d*(tp-e)/r; if(rr<q.minRR-1e-9) return null; return {dir:d,model,label,entryRef:e,stop:stp,tp,rr,atr:A,i}; };
      const bullV=vc.bull||(ab[i-1]===1&&b.close>Math.max(k[i-1].close,(k[i-1].high+k[i-1].low)/2))||(ab[i]===1&&b.close>=(b.high+b.low)/2)||(i-divBullAt<=10);
      const bearV=vc.bear||(ab[i-1]===-1&&b.close<Math.min(k[i-1].close,(k[i-1].high+k[i-1].low)/2))||(ab[i]===-1&&b.close<=(b.high+b.low)/2)||(i-divBearAt<=10);
      const okS=(d)=>!p.reqStruct||(d>0?bias>=0:bias<=0), okC=(d)=>!p.reqStruct||bias===d, vOK=d=>!p.reqVol||(d>0?bullV:bearV);
      const tol=q.loc*A, bull=!!pt.bull, bear=!!pt.bear, near=(lv,d)=>d>0?(b.low<=lv+tol&&b.low>=lv-A&&b.close>lv):(b.high>=lv-tol&&b.high<=lv+A&&b.close<lv);
      // 0) MODULE 2 candidate (Setup 1 / 2 / 3), first priority; one position at a time keeps it duplicate-free
      if(!sig&&cand) sig=cand;
      // 1) previous-session value-area re-entry (accepted closes inside the old value area)
      if(!sig&&p.mRe&&!(p.m2On&&p.s2On)&&re&&!re.done&&re.cnt>=q.reAcc&&(!p.useHtf||hd!==-re.dir)){ const d=re.dir; sig=mk(d,'Previous value-area re-entry','RE',d>0?prev.st.vah:prev.st.val); if(sig) re.done=true; }
      // 2) D-shape rotation: VAL long / VAH short, POC target
      if(!sig&&p.mRot&&sh.s==='D'&&st){ if(bull&&near(st.val,1)&&okS(1)&&vOK(1)) sig=mk(1,'D-shape rotation (VAL \u2192 POC)','ROT',st.poc>b.close?st.poc:st.vah);
        if(!sig&&bear&&near(st.vah,-1)&&okS(-1)&&vOK(-1)) sig=mk(-1,'D-shape rotation (VAH \u2192 POC)','ROT',st.poc<b.close?st.poc:st.val); }
      // 3) P / B continuation: pullback to POC or HVN inside an accepted trend
      const pull=(d)=>{ let m=d>0?-Infinity:Infinity; for(let u=Math.max(0,i-10);u<i;u++) m=d>0?Math.max(m,k[u].high):Math.min(m,k[u].low); return d>0?(m-b.low>=.5*A):(b.high-m>=.5*A); };
      const lvls=st?[st.poc].concat(st.hvn.map(x=>x.p)):[];
      if(!sig&&p.mCont&&st&&(sh.s==='P'||sh.s==='B')){ const d=sh.d, ok=d>0?bull:bear; if(ok&&okC(d)&&vOK(d)&&pull(d)&&lvls.some(lv=>near(lv,d))) sig=mk(d,sh.s==='P'?'P-shape continuation (pullback to POC / HVN)':'B-shape continuation (pullback to POC / HVN)','CONT',null); }
      // 4) THIN profile: pullbacks in the established trend
      if(!sig&&p.mThin&&st&&sh.s==='THIN'){ const d=sh.d, ok=d>0?bull:bear; if(ok&&okC(d)&&vOK(d)&&pull(d)&&lvls.some(lv=>near(lv,d))) sig=mk(d,'Thin-profile trend pullback','THIN',null); }
      // 5) absorption at a profile level (needs rejection / follow-through)
      if(!sig&&p.mAbs&&st){ const lv=[st.poc,st.vah,st.val].concat(st.hvn.map(x=>x.p), prev.st.vah, prev.st.val, prev.st.poc);
        const absBar=(d)=>{ for(const u of [i,i-1]){ if(u<0||ab[u]!==d) continue; const e=d>0?k[u].low:k[u].high; if(lv.some(L=>Math.abs(e-L)<=tol*1.5)) return u; } return -1; };
        const ub=absBar(1), us=absBar(-1);
        if(ub>=0&&(bull||b.close>k[ub].high)&&b.close>b.open&&okS(1)) sig=mk(1,'Volume absorption (buyers) at level','ABS',null);
        if(!sig&&us>=0&&(bear||b.close<k[us].low)&&b.close<b.open&&okS(-1)) sig=mk(-1,'Volume absorption (sellers) at level','ABS',null); }
    }
    if(sig){ pend=sig; D.sigs.push(sig); const up=sig.dir>0; D.lbl.push({i,dir:sig.dir,txt:(up?'BUY ':'SELL ')+rvaLab(sig.label),px:up?b.low:b.high}); D.mk.push({time:b.time,position:up?'belowBar':'aboveBar',color:up?GREEN:RED,shape:up?'arrowUp':'arrowDown',text:(p.sigText&&!p.stickLbl)?(up?'BUY ':'SELL ')+rvaLab(sig.label):'',keep:true});
      push(i,up?'long':'short',(up?'LONG':'SHORT')+' confirmed \u00b7 '+sig.model+' \u00b7 entry ref '+rvaFmt(sig.entryRef)+' \u00b7 SL '+rvaFmt(sig.stop)+' \u00b7 TP '+rvaFmt(sig.tp)+' \u00b7 '+sig.rr.toFixed(2)+'R',up?GREEN:RED,sig.entryRef); }
  }
  // ---- close the books ----
  const cur=S; cur.st=lastSt; const wins=trades.filter(t=>t.pnl>0), loss=trades.filter(t=>t.pnl<=0);
  const gw=wins.reduce((a,t)=>a+t.pnl,0), gl=-loss.reduce((a,t)=>a+t.pnl,0), side=d=>{ const a=trades.filter(t=>t.dir===d); return {n:a.length,w:a.filter(t=>t.pnl>0).length,net:a.reduce((s,t)=>s+t.pnl,0)}; };
  let pk=q.cap, mdd=0; curve.forEach(pnt=>{ if(pnt.e>pk) pk=pnt.e; const dd=(pk-pnt.e)/pk; if(dd>mdd) mdd=dd; });
  D.stats={n:trades.length,w:wins.length,net:eq-q.cap,netPct:(eq/q.cap-1)*100,mdd:mdd*100,wr:trades.length?wins.length/trades.length*100:0,pf:gl>0?gw/gl:(gw>0?Infinity:0),avgW:wins.length?gw/wins.length:0,avgL:loss.length?-gl/loss.length:0,L:side(1),S:side(-1),eq,cap:q.cap};
  const setStat=lab=>{ const a=trades.filter(t=>t.label===lab); let cum=0, pk2=0, mdd2=0, gw2=0, gl2=0, sr=0, w2=0; a.forEach(t=>{ cum+=t.pnl; if(cum>pk2) pk2=cum; if(pk2-cum>mdd2) mdd2=pk2-cum; if(t.pnl>0){ gw2+=t.pnl; w2++; } else gl2-=t.pnl; sr+=t.R; });
    const sd=d=>{ const z=a.filter(t=>t.dir===d); return {n:z.length,w:z.filter(t=>t.pnl>0).length,net:z.reduce((x,t)=>x+t.pnl,0)}; };
    return {n:a.length,w:w2,net:cum,wr:a.length?w2/a.length*100:0,pf:gl2>0?gw2/gl2:(gw2>0?Infinity:0),mdd:mdd2/q.cap*100,avgR:a.length?sr/a.length:0,L:sd(1),S:sd(-1)}; };
  D.setupStats={S1:setStat('S1'),S2:setStat('S2'),S3:setStat('S3')};
  { const lastP=D.cur&&D.cur.c!=null?D.cur.c:k[N-1].close, un=np.filter(z=>!z.tested&&(!prev||z.id!==prev.id)); let up=null, dn=null; un.forEach(z=>{ if(z.poc>lastP&&(up==null||z.poc<up)) up=z.poc; if(z.poc<lastP&&(dn==null||z.poc>dn)) dn=z.poc; });
    D.m2={cp:prev?prev.cp:'',seqB,seqWarn:seqB!==0&&seqV===1,seqN:seqP.length,seqLast:seqP.slice(-3),M:lastM2,nUp:up,nDn:dn,nUn:un.length,nTested:np.filter(z=>z.tested).length}; }
  D.np=np; D.ivl=(iv>=86400?(iv/86400)+'D':iv>=3600?(iv/3600)+'h':(iv/60)+'m');
  D.curve=curve; D.ok=true; D.N=N; D.q=q; D.cur=cur; D.prev=prev; D.shape=lastShape; D.bias=lastBias; D.hd=lastHd; D.tr=lastTr; D.volLab=lastVL; D.htfOn=htfOn; D.H=H; D.hSt=hSt; D.pos=pos; D.pend=pend; D.atr=atr[N-1]; D.pat=lastPat; D.iv=iv;
  D.ev=D.ev.filter(e=>({long:p.alLong,short:p.alShort,divB:p.alDivB,divS:p.alDivS,poc:p.alPoc,vah:p.alVah,val:p.alVal,re:p.alRe,sl:p.alSL,tp:p.alTP,bo:p.alBo,npoc:p.alNpoc,s1:p.alPoc})[e.type]!==false).slice(-80);
  D.allEv=null; return D;
}
IND.rva={label:'Reinblacks Volume Profile & Auction Strategy',title:'Reinblacks Volume Profile & Auction Strategy',cat:'Strategies',cols:[],calc:()=>[],
  nm:()=>'Reinblacks VP & Auction',p:Object.assign({},RVA_DEF),
  fields:[
    ['m2On','chk','MODULE 2 \u00b7 Three-setup engine (POC first return / Value-area re-entry / Breakout + retest)'],['s1On','chk','MODULE 2 \u00b7 Setup 1: POC first-return reaction (previous close outside VA)'],['s2On','chk','MODULE 2 \u00b7 Setup 2: Value-area re-entry reversal (previous close inside VA)'],['s3On','chk','MODULE 2 \u00b7 Setup 3: Value-area breakout and retest'],['pocFilter','chk','MODULE 2 \u00b7 POC sequence trend filter (blocks trades against it)'],['cluFrac','num','MODULE 2 \u00b7 POC cluster width (rows above this share of the POC row)',{min:.3,max:.95,step:.05}],['m2Tp','sel','MODULE 2 \u00b7 Take-profit mode',{opts:RVA_M2TP}],['atrProt','num','MODULE 2 \u00b7 ATR stop protection (minimum stop distance, ATR)',{min:0,max:5,step:.1}],['tpBuf','num','MODULE 2 \u00b7 Target placed before the barrier by (ATR)',{min:0,max:2,step:.05}],
    ['s1Win','num','SETUP 1 \u00b7 Candles allowed after the first return',{min:1,max:30,step:1}],['s2Out','num','SETUP 2 \u00b7 Closes outside the value area before a re-entry counts',{min:1,max:5,step:1}],['s2Bull','chk','SETUP 2 \u00b7 Last confirming candle must close in the trade direction'],
    ['s3Body','num','SETUP 3 \u00b7 Breakout candle min body / range',{min:.3,max:.95,step:.05}],['s3Close','num','SETUP 3 \u00b7 Breakout close position in the candle',{min:.5,max:.95,step:.05}],['s3Vol','num','SETUP 3 \u00b7 Breakout volume \u2265 \u00d7 volume average',{min:.5,max:5,step:.1}],['s3Wick','num','SETUP 3 \u00b7 Absorption filter: max opposite wick / range',{min:.05,max:.8,step:.05}],['s3Near','num','SETUP 3 \u00b7 Pullback zone around the level (ATR)',{min:.1,max:3,step:.1}],['s3Pen','num','SETUP 3 \u00b7 Allowed shallow penetration (ATR)',{min:0,max:2,step:.05}],['s3Run','num','SETUP 3 \u00b7 Skip if price runs away without a retest (ATR)',{min:1,max:10,step:.5}],['s3Win','num','SETUP 3 \u00b7 Candles allowed for the whole breakout setup',{min:3,max:300,step:1}],['s3Bos','num','SETUP 3 \u00b7 Candles allowed after the pullback for the break of structure',{min:2,max:200,step:1}],
    ['nakedMax','num','NAKED POC \u00b7 Lines shown',{min:1,max:20,step:1}],['showNaked','chk','NAKED POC \u00b7 Show untested historical POCs'],['showTested','chk','NAKED POC \u00b7 Also show tested POCs (grey)'],['showClu','chk','CHART \u00b7 Main POC cluster zone'],['minNotional','num','COSTS \u00b7 Minimum order value (skip smaller trades)',{min:0,max:1e6,step:1}],
    ['rows','num','PROFILE \u00b7 Profile row count (400 default, lower it if the chart feels slow)',{min:10,max:500,step:5}],['vaPct','num','PROFILE \u00b7 Value Area %',{min:30,max:95,step:1}],['sessHours','num','PROFILE \u00b7 Session length (hours, 24 = crypto day)',{min:1,max:168,step:1}],['sessOff','num','PROFILE \u00b7 Session start offset (hours UTC)',{min:-12,max:12,step:1}],
    ['hvnMult','num','PROFILE \u00b7 HVN sensitivity (row volume \u00d7 average)',{min:1,max:5,step:.1}],['lvnMult','num','PROFILE \u00b7 LVN sensitivity (row volume \u00d7 average)',{min:.05,max:1,step:.05}],['maxNodes','num','PROFILE \u00b7 Nodes shown (HVN / LVN each)',{min:1,max:6,step:1}],
    ['volLen','num','VOLUME \u00b7 Volume moving average length',{min:3,max:200,step:1}],['spikeMult','num','VOLUME \u00b7 Spike multiplier',{min:1,max:6,step:.1}],['bigAtr','num','VOLUME \u00b7 Large candle (range \u00d7 ATR)',{min:.2,max:3,step:.1}],['absBody','num','VOLUME \u00b7 Absorption max body / range',{min:.05,max:.7,step:.05}],['noSup','num','VOLUME \u00b7 No supply / no demand volume \u00d7 average',{min:.2,max:1,step:.05}],['divLen','num','VOLUME \u00b7 Divergence swing length',{min:2,max:10,step:1}],['divRatio','num','VOLUME \u00b7 Divergence: volume must be below \u00d7 previous swing',{min:.3,max:1,step:.05}],
    ['balTol','num','AUCTION \u00b7 D-shape POC tolerance around mid-range',{min:.02,max:.3,step:.01}],['pShare','num','AUCTION \u00b7 P / B volume share above / below mid-range (%)',{min:50,max:90,step:1}],['thinMult','num','AUCTION \u00b7 THIN: POC row must be below \u00d7 average',{min:1.2,max:6,step:.1}],['thinTrend','num','AUCTION \u00b7 THIN: session drift / range',{min:.2,max:1,step:.05}],['minSessBars','num','AUCTION \u00b7 Candles needed before classifying',{min:3,max:200,step:1}],['minRangeAtr','num','AUCTION \u00b7 Minimum session range (ATR)',{min:.3,max:10,step:.1}],
    ['wickMult','num','CANDLES \u00b7 Hammer / star wick \u00d7 body',{min:1,max:5,step:.1}],['dojiBody','num','CANDLES \u00b7 Doji max body / range',{min:.02,max:.3,step:.01}],['rejWick','num','CANDLES \u00b7 Rejection wick min / range',{min:.4,max:.9,step:.05}],['bodyMin','num','CANDLES \u00b7 Engulfing min body / range',{min:.2,max:.9,step:.05}],['ltfProxy','chk','CANDLES \u00b7 Lower-timeframe proxy: close must finish in the signal direction'],['closePos','num','CANDLES \u00b7 Proxy: close position in the candle',{min:.5,max:.9,step:.05}],
    ['mRot','chk','MODEL \u00b7 D-shape rotation (VAL / VAH \u2192 POC)'],['mCont','chk','MODEL \u00b7 P / B continuation (pullback to POC / HVN)'],['mThin','chk','MODEL \u00b7 THIN profile trend pullback'],['mAbs','chk','MODEL \u00b7 Volume absorption at a level'],['mRe','chk','MODEL \u00b7 Previous value-area re-entry'],['allowLong','chk','MODEL \u00b7 Allow LONG'],['allowShort','chk','MODEL \u00b7 Allow SHORT'],
    ['reqVol','chk','FILTER \u00b7 Require volume confirmation'],['reqStruct','chk','FILTER \u00b7 Require market-structure bias'],['locAtr','num','FILTER \u00b7 Level touch tolerance (ATR)',{min:.05,max:2,step:.05}],['swingLen','num','FILTER \u00b7 Swing length (market structure)',{min:2,max:10,step:1}],
    ['useHtf','chk','MTF \u00b7 Use higher-timeframe context'],['htf','sel','MTF \u00b7 Higher timeframe',{opts:Object.keys(RVA_HTF)}],['reAccept','num','ACCEPTANCE \u00b7 Confirming closes inside the previous value area',{min:1,max:5,step:1}],['reWin','num','RE-ENTRY \u00b7 Setup expires after (candles)',{min:3,max:300,step:1}],
    ['risk','num','RISK \u00b7 Risk per trade (% of equity)',{min:.1,max:10,step:.1}],['capital','num','RISK \u00b7 Starting capital',{min:100,max:1e9,step:100}],['atrLen','num','RISK \u00b7 ATR period',{min:2,max:100,step:1}],['stopMode','sel','RISK \u00b7 Stop-loss method',{opts:RVA_STOP}],['slMult','num','RISK \u00b7 ATR stop multiplier',{min:.3,max:10,step:.1}],['slPad','num','RISK \u00b7 Stop padding beyond structure (ATR)',{min:0,max:3,step:.05}],['maxStopAtr','num','RISK \u00b7 Skip if stop wider than (ATR)',{min:.5,max:20,step:.5}],['minStopAtr','num','RISK \u00b7 Skip if stop tighter than (ATR)',{min:.02,max:3,step:.02}],
    ['tpMode','sel','EXIT \u00b7 Take-profit mode',{opts:RVA_TPM}],['tpRR','num','EXIT \u00b7 Fixed take-profit R:R',{min:.5,max:20,step:.25}],['minRR','num','EXIT \u00b7 Minimum R:R to take a trade',{min:.5,max:20,step:.25}],
    ['part','chk','EXIT \u00b7 Partial profit'],['partPct','num','EXIT \u00b7 Partial size (%)',{min:5,max:95,step:5}],['partR','num','EXIT \u00b7 Partial at R',{min:.3,max:10,step:.1}],['be','chk','EXIT \u00b7 Move stop to break-even'],['beR','num','EXIT \u00b7 Break-even at R',{min:.3,max:10,step:.1}],['trail','chk','EXIT \u00b7 ATR trailing stop (after 1R)'],['trailAtr','num','EXIT \u00b7 Trailing distance (ATR)',{min:.3,max:10,step:.1}],
    ['comm','num','COSTS \u00b7 Commission per side (%)',{min:0,max:1,step:.01}],['slip','num','COSTS \u00b7 Slippage per fill (%)',{min:0,max:1,step:.01}],['maxLev','num','COSTS \u00b7 Maximum leverage (size cap)',{min:1,max:125,step:1}],['contract','sel','COSTS \u00b7 Contract type (size display)',{opts:RVA_CT}],['qtyStep','num','COSTS \u00b7 Quantity step',{min:1e-8,max:1000,step:.001}],
    ['showHist','chk','CHART \u00b7 Volume profile histogram'],['histW','num','CHART \u00b7 Histogram width (% of chart)',{min:6,max:40,step:1}],['showVA','chk','CHART \u00b7 POC / VAH / VAL lines'],['showPrev','chk','CHART \u00b7 Previous session value area'],['showNodes','chk','CHART \u00b7 HVN / LVN zones'],['showPlans','chk','CHART \u00b7 Entry / SL / TP plans'],['planKeep','num','CHART \u00b7 Plans kept',{min:1,max:20,step:1}],['showSig','chk','CHART \u00b7 BUY / SELL arrows'],['sigText','chk','CHART \u00b7 Setup name beside the arrows'],['stickLbl','chk','CHART \u00b7 Pin the BUY / SELL labels to the signal candle price (they never drift)'],
    ['dash','chk','DASHBOARD \u00b7 Show dashboard'],['dpos','sel','DASHBOARD \u00b7 Position',{opts:['Top Right','Top Left','Bottom Right','Bottom Left']}],['dsize','sel','DASHBOARD \u00b7 Size',{opts:['Tiny','Small','Normal','Large']}],['theme','sel','DASHBOARD \u00b7 Theme',{opts:['Dark','Light']}],['stats','chk','DASHBOARD \u00b7 Show back-test panel + equity curve'],['spos','sel','DASHBOARD \u00b7 Back-test panel position',{opts:['Top Right','Top Left','Bottom Right','Bottom Left']}],
    ['cPoc','col','COLOUR \u00b7 POC'],['cClu','col','COLOUR \u00b7 POC cluster / naked POC'],['cVa','col','COLOUR \u00b7 VAH / VAL / value area'],['cBull','col','COLOUR \u00b7 LONG / BUY'],['cBear','col','COLOUR \u00b7 SHORT / SELL'],
    ['alLong','chk','ALERT \u00b7 Confirmed LONG'],['alShort','chk','ALERT \u00b7 Confirmed SHORT'],['alDivB','chk','ALERT \u00b7 Bullish volume divergence'],['alDivS','chk','ALERT \u00b7 Bearish volume divergence'],['alPoc','chk','ALERT \u00b7 POC retest'],['alVah','chk','ALERT \u00b7 VAH rejection'],['alVal','chk','ALERT \u00b7 VAL rejection'],['alRe','chk','ALERT \u00b7 Previous value-area re-entry'],['alSL','chk','ALERT \u00b7 Stop loss hit'],['alTP','chk','ALERT \u00b7 Take profit hit'],['alBo','chk','ALERT \u00b7 Breakout / break of structure (Setup 3)'],['alNpoc','chk','ALERT \u00b7 Naked POC tested']],
  extras:(c,p)=>{ const q=Object.assign({},RVA_DEF,p), D=rvaGet(c,q); return {mk:(D.ok&&q.showSig)?D.mk:[],boxes:[{type:'rvaview',pts:[],o:q,D}],labels:[],ev:D.ok?D.ev:[]}; }};
{ const _rvaD=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='rvaview') return _rvaD.apply(this,arguments);
    const p=d.o, D=d.D, dark=p.theme!=='Light', fg=dark?'#e8eaf0':'#131722', muted=dark?'rgba(232,234,240,.6)':'rgba(19,23,34,.6)', pill=dark?'rgba(12,14,20,.9)':'rgba(255,255,255,.94)';
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    if(!D||!D.ok){ const l1='Reinblacks Volume Profile & Auction Strategy', l2=(D&&D.msg)||'Loading...'; cx.font='bold 11px system-ui'; const w=Math.min(W-16,Math.max(cx.measureText(l1).width,cx.measureText(l2).width)+24), x=W/2, y=Hh*.42;
      cx.fillStyle='rgba(20,24,34,.92)'; cx.fillRect(x-w/2,y-24,w,48); cx.strokeStyle='#e5383b'; cx.lineWidth=1; cx.strokeRect(x-w/2,y-24,w,48); cx.textAlign='center'; cx.fillStyle='#fff'; cx.fillText(l1,x,y-8); cx.font='11px system-ui'; cx.fillStyle='#ffb3bd'; cx.fillText(l2,x,y+10); cx.restore(); return; }
    const n0=candles.length, xe=X(n0-1), xp=X(n0-2), bw=(xe!=null&&xp!=null)?Math.max(1,xe-xp):6, xr=(xe==null?W*.8:xe)+bw*5, xa=i=>{ const v=X(i); return v==null?(i<n0/2?-50:W+50):v; };
    const histPx=p.showHist?Math.round(W*p.histW/100):0, xl=W-histPx-4;
    const ln=(x1,x2,y,col,dash,w)=>{ cx.strokeStyle=col; cx.lineWidth=w||1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y); cx.lineTo(x2,y); cx.stroke(); cx.setLineDash([]); };
    const PL=[], tag=(txt,x,y,bg,fg2,bold)=>{ cx.font=(bold?'bold ':'')+'9px system-ui'; const w=cx.measureText(txt).width+8, xx=Math.max(2,Math.min(x-w,W-w-2)); let yy=y;
      // never let two tags sit on top of each other: slide the later one down (short tick shows its real price)
      for(let g=0;g<14;g++){ const hit=PL.find(r=>xx<r.x+r.w+1&&xx+w>r.x-1&&Math.abs(yy-r.y)<14); if(!hit) break; yy=hit.y+14; }
      PL.push({x:xx,w,y:yy}); if(Math.abs(yy-y)>1){ cx.strokeStyle=bg; cx.lineWidth=1.5; cx.beginPath(); cx.moveTo(xx,y); cx.lineTo(xx,yy); cx.stroke(); }
      cx.fillStyle=bg; cx.fillRect(xx,yy-7,w,14); cx.fillStyle=fg2; cx.textAlign='left'; cx.fillText(txt,xx+4,yy); };
    const tagA=(txt,x0,y,bg,fg2,bold)=>{ cx.font=(bold?'bold ':'')+'9px system-ui'; const w=cx.measureText(txt).width+8; tag(txt,Math.max(2,x0)+w,y,bg,fg2,bold); };
    const box=(x0,x1,ya,yb,fill,stroke,dash)=>{ const t0=Math.min(ya,yb), h=Math.max(1,Math.abs(yb-ya)); cx.fillStyle=fill; cx.fillRect(x0,t0,Math.max(1,x1-x0),h); if(stroke){ cx.strokeStyle=stroke; cx.lineWidth=1; cx.setLineDash(dash||[]); cx.strokeRect(x0,t0,Math.max(1,x1-x0),h); cx.setLineDash([]); } };
    const S=D.cur, st=S.st, pv=D.prev, ps=pv&&pv.st, cB=p.cBull, cR=p.cBear, cP=p.cPoc, cV=p.cVa, xs=xa(S.i0), xlim=Math.min(xr,xl);
    // previous session value area (band + lines)
    if(p.showPrev&&ps){ const yh=Y(ps.vah), yl=Y(ps.val), yp=Y(ps.poc); if(yh!=null&&yl!=null){ box(xs,xlim,yh,yl,rvaRgba(cV,.05),rvaRgba(cV,.35),[2,3]); tagA('prev VAH '+rvaFmt(ps.vah),xs,yh,rvaRgba(cV,.18),fg,false); tagA('prev VAL '+rvaFmt(ps.val),xs,yl,rvaRgba(cV,.18),fg,false); if(p.m2On&&p.showClu&&Number.isFinite(ps.clHi)){ const ya=Y(ps.clHi), yb=Y(ps.clLo); if(ya!=null&&yb!=null){ box(xs,xlim,ya,yb,rvaRgba(p.cClu,.16),rvaRgba(p.cClu,.75),[]); tagA('POC CLUSTER',xs,Math.min(ya,yb)-9,rvaRgba(p.cClu,.4),fg,true); } }
      if(yp!=null){ if(p.m2On){ ln(xs,xlim,yp,cP,[],3); tagA('prev POC '+rvaFmt(ps.poc)+((D.m2&&D.m2.seqB>0)?' \u25b2':(D.m2&&D.m2.seqB<0)?' \u25bc':''),xs,yp,rvaRgba(cP,.85),'#fff',true); } else { ln(xs,xlim,yp,rvaRgba(cP,.55),[5,4],1); tagA('prev POC',xs,yp,rvaRgba(cP,.2),fg,false); } } } }
    if(p.m2On&&p.showNaked&&D.np){ let shown=0; for(let j=D.np.length-1;j>=0&&shown<Math.round(+p.nakedMax||6);j--){ const z=D.np[j]; if(pv&&z.id===pv.id) continue; if(z.tested&&!p.showTested) continue; const y=Y(z.poc); if(y==null) continue; if(!z.tested) shown++;
        const x0=Math.max(0,xa(z.i1)); ln(x0,xlim,y,z.tested?'rgba(150,150,150,.55)':rvaRgba(p.cClu,.9),[2,3],1); tagA((z.tested?'tested ':'nPOC ')+rvaFmt(z.poc),xs,y,z.tested?'rgba(120,120,120,.35)':rvaRgba(p.cClu,.3),fg,false); } }
    // current session: HVN / LVN, POC, VAH, VAL
    if(st){ if(p.showNodes){ st.hvn.forEach(h=>{ const ya=Y(h.hi), yb=Y(h.lo); if(ya==null||yb==null) return; box(xs,xlim,ya,yb,rvaRgba(cP,.12),null); tagA('HVN',xs,(ya+yb)/2,rvaRgba(cP,.3),fg,false); });
        st.lvn.forEach(h=>{ const ya=Y(h.hi), yb=Y(h.lo); if(ya==null||yb==null) return; box(xs,xlim,ya,yb,rvaRgba(cV,.05),rvaRgba(cV,.4),[3,3]); tagA('LVN',xs,(ya+yb)/2,rvaRgba(cV,.15),fg,false); }); }
      if(p.showVA){ const yp=Y(st.poc), yh=Y(st.vah), yl=Y(st.val); if(yh!=null&&yl!=null){ box(xs,xlim,yh,yl,rvaRgba(cV,.045),null); ln(xs,xlim,yh,rvaRgba(cV,.9),[],1); ln(xs,xlim,yl,rvaRgba(cV,.9),[],1); tagA('VAH '+rvaFmt(st.vah),xs,yh,rvaRgba(cV,.22),fg,true); tagA('VAL '+rvaFmt(st.val),xs,yl,rvaRgba(cV,.22),fg,true); }
        if(yp!=null){ ln(xs,xlim,yp,cP,[],2); tagA('POC '+rvaFmt(st.poc),xs,yp,rvaRgba(cP,.85),'#fff',true); } }
      // side histogram (approximate volume per price row, current session)
      if(p.showHist&&histPx>8){ let mxv=0; st.rows.forEach(v=>{ if(v>mxv) mxv=v; }); const hv=new Set(st.hvn.map(h=>Math.round((h.lo/st.bin)-st.mn))), lv=new Set(st.lvn.map(h=>Math.round((h.lo/st.bin)-st.mn)));
        for(let j=0;j<st.len;j++){ const yt=Y((st.mn+j+1)*st.bin), yb=Y((st.mn+j)*st.bin); if(yt==null||yb==null) continue; const w=st.rows[j]/mxv*histPx, inVA=j>=st.lo&&j<=st.hi, poc=j===st.pi;
          cx.fillStyle=poc?rvaRgba(cP,.9):hv.has(j)?rvaRgba(cP,.5):lv.has(j)?rvaRgba(cV,.1):inVA?rvaRgba(cV,.32):rvaRgba(cV,.14); cx.fillRect(W-w-2,Math.min(yt,yb),w,Math.max(1,Math.abs(yb-yt)-.5)); } } }
    // trade plans (entry / stop / target)
    if(p.showPlans){ const arr=D.trades.slice(-Math.max(1,Math.round(+p.planKeep)||3)).map(t=>({t,open:false})); if(D.pos) arr.push({t:{i0:D.pos.i0,dir:D.pos.dir,entry:D.pos.entry,stop:D.pos.stop0,tp:D.pos.tp,res:'open',label:D.pos.label},open:true});
      else if(D.pend) arr.push({t:{i0:D.N,dir:D.pend.dir,entry:D.pend.entryRef,stop:D.pend.stop,tp:D.pend.tp,res:'pend',label:D.pend.label},open:true});
      arr.forEach(({t,open})=>{ const x1=xa(t.i0), x2=open?xr:Math.max(x1+bw,xa(t.i1)), yE=Y(t.entry), yS=Y(t.stop), yT=Y(t.tp); if(yE==null||yS==null||yT==null) return; const win=t.res==='tp';
        box(x1,x2,yE,yS,rvaRgba(cR,.12),rvaRgba(cR,.4)); box(x1,x2,yE,yT,rvaRgba(cB,.1),rvaRgba(cB,.4)); ln(x1,x2,yE,fg,[],1.5); ln(x1,x2,yS,cR,[],1.5); ln(x1,x2,yT,cB,[],1.5);
        if(open){ tagA((t.res==='pend'?'ENTRY ref ':'ENTRY ')+rvaFmt(t.entry),x1,yE,pill,fg,true); tagA('SL '+rvaFmt(t.stop),x1,yS,rvaRgba(cR,.35),fg,true); tagA('TP '+rvaFmt(t.tp),x1,yT,rvaRgba(cB,.35),fg,true); }
        else tagA((win?'TP \u2713 ':t.res==='sl'?'SL \u2717 ':t.res==='be'?'BE ':'TRAIL ')+(t.R>=0?'+':'')+t.R.toFixed(2)+'R',x1,win?yT:yS,rvaRgba(win?cB:cR,.7),'#fff',true); }); }
    // BUY / SELL labels pinned to the signal candle (x = candle, y = its low / high price, fixed pixel gap, dotted stem)
    if(p.showSig&&p.sigText&&p.stickLbl&&D.lbl){ D.lbl.slice(-80).forEach(L=>{ const x=X(L.i), y=Y(L.px); if(x==null||y==null||x<-60||x>W+60) return; const up=L.dir>0, yy=y+(up?30:-30), col=up?cB:cR;
        cx.font='bold 9px system-ui'; const w=cx.measureText(L.txt).width+10, x0=Math.max(2,Math.min(W-w-2,x-w/2));
        cx.strokeStyle=rvaRgba(col,.8); cx.lineWidth=1; cx.setLineDash([2,2]); cx.beginPath(); cx.moveTo(x,y+(up?3:-3)); cx.lineTo(x,yy+(up?-7:7)); cx.stroke(); cx.setLineDash([]);
        cx.fillStyle=rvaRgba(col,.92); cx.fillRect(x0,yy-7,w,14); cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText(L.txt,x0+5,yy); }); }
    // dashboard
    const panel=(rows,pos,fs0)=>{ let fs=fs0, cw=[0,0,0], pw, rh, m=6; for(;;){ cw=[0,0,0]; rh=fs+8; rows.forEach(r=>{ cx.font=(r[6]?'bold ':'')+fs+'px system-ui'; for(let j=0;j<3;j++) cw[j]=Math.max(cw[j],cx.measureText(r[j]||'').width); }); pw=cw[0]+cw[1]+cw[2]+40; if(pw<=W-2*m||fs<=6) break; fs--; }
      const ph=rows.length*rh, x0=/Left/.test(pos)?m:W-pw-m, y0=/Top/.test(pos)?m+34:Hh-ph-m-24; cx.fillStyle=pill; cx.fillRect(x0,y0,pw,ph);
      rows.forEach((r,kk)=>{ const y=y0+kk*rh; if(kk){ cx.strokeStyle='rgba(128,128,128,.25)'; cx.lineWidth=1; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x0+pw,y); cx.stroke(); }
        cx.textAlign='left'; cx.font=(kk===0?'bold ':'')+fs+'px system-ui'; cx.fillStyle=r[3]; cx.fillText(r[0],x0+8,y+rh/2); cx.font='bold '+fs+'px system-ui'; cx.fillStyle=r[4]; cx.fillText(r[1],x0+16+cw[0],y+rh/2); cx.fillStyle=r[5]||muted; cx.fillText(r[2]||'',x0+24+cw[0]+cw[1],y+rh/2); });
      cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph); return {x0,y0,pw,ph,rh}; };
    const fs=({Tiny:9,Small:10,Normal:12,Large:14})[p.dsize]||9, dirT=v=>v>0?'Bullish':v<0?'Bearish':'Neutral', dirC=v=>v>0?cB:v<0?cR:muted;
    if(p.dash){ const A=D.pos||D.pend, lt=D.trades.length?D.trades[D.trades.length-1]:null, pl=D.pos?{dir:D.pos.dir,entry:D.pos.entry,stop:D.pos.stop0,tp:D.pos.tp,tag:'OPEN \u00b7 '+rvaLab(D.pos.label)}:D.pend?{dir:D.pend.dir,entry:D.pend.entryRef,stop:D.pend.stop,tp:D.pend.tp,tag:'PENDING \u00b7 '+rvaLab(D.pend.label)}:lt?{dir:lt.dir,entry:lt.entry,stop:lt.stop,tp:lt.tp,tag:'last closed \u00b7 '+rvaLab(lt.label)}:null;
      const rr=pl?Math.abs(pl.tp-pl.entry)/Math.max(1e-12,Math.abs(pl.entry-pl.stop)):null, shp={D:'D-SHAPE (balanced)',P:'P-SHAPE (upper heavy)',B:'B-SHAPE (lower heavy)',THIN:'THIN (low-volume trend)',UNCLEAR:'UNCLEAR'}[D.shape.s];
      const rows=[['REINBLACKS \u00b7 Volume Profile & Auction','rule-based estimate','',fg,cP,muted,true],
        ['Market bias',dirT(D.bias),'',muted,dirC(D.bias)],['Higher TF direction',D.htfOn?dirT(D.hd):'off',D.htfOn?'HTF '+(D.H>=86400?(D.H/86400)+'D':D.H>=3600?(D.H/3600)+'h':(D.H/60)+'m'):'',muted,D.htfOn?dirC(D.hd):muted],['Trading TF direction',dirT(D.tr),'',muted,dirC(D.tr)],
        ['Profile class',shp,'',muted,D.shape.s==='UNCLEAR'?muted:fg],['POC / VAH / VAL',st?rvaFmt(st.poc):'-',st?rvaFmt(st.vah)+' / '+rvaFmt(st.val):'',muted,cP,fg],
        ['Volume condition',D.volLab,'',muted,fg],['Active setup',pl?(pl.dir>0?'LONG':'SHORT'):'none',pl?pl.tag:'',muted,pl?(pl.dir>0?cB:cR):muted],
        ['Entry / SL / TP',pl?rvaFmt(pl.entry):'-',pl?rvaFmt(pl.stop)+' / '+rvaFmt(pl.tp):'',muted,fg,fg],['Risk % / R:R',p.risk+'%',rr!=null?rr.toFixed(2)+'R':'-',muted,fg,fg]];
      if(D.pos||D.pend){ const o=D.pos||{entry:D.pend.entryRef,stop:D.pend.stop,qty:null}; const ri=Math.abs(o.entry-o.stop), q=D.q, qty=D.pos?D.pos.qty:Math.min(D.stats.eq*q.risk/100/Math.max(ri,1e-12),D.stats.eq*q.maxLev/o.entry);
        rows.push(['Position size',/Inverse/.test(p.contract)?(qty*o.entry).toFixed(0)+' USD contracts':qty.toFixed(4)+' units','',muted,fg]); }
      if(p.m2On&&D.m2){ const m=D.m2, M=m.M, Q=D.q, s1=M.s1, s2=M.s2, s3=M.s3, cp=m.cp;
        const cpT=cp==='above'?'ABOVE value area':cp==='below'?'BELOW value area':cp==='inside'?'INSIDE value area':'-';
        const sqT=(m.seqB>0?'BULLISH (higher POCs)':m.seqB<0?'BEARISH (lower POCs)':(m.seqN<3?'Developing structure':'NEUTRAL'))+(p.pocFilter?'':' (filter off)');
        const t1=!p.s1On?'off':cp==='inside'?'disabled (closed inside VA)':!cp?'-':s1.done?'used / expired':s1.pi>=0?'candle formed, confirm next':s1.t0>=0?'cluster touched, need rejection':'waiting first return';
        const t2=!p.s2On?'off':cp!=='inside'?'disabled (closed outside VA)':s2.dir!==0?(s2.dir>0?'below VAL':'above VAH')+' \u00b7 '+s2.cnt+'/'+Q.reAcc+' closes inside':'waiting excursion';
        const t3=!p.s3On?'off':s3.dir!==0?(s3.t0>=0?'pullback held, waiting BOS':'breakout seen, waiting pullback'):'waiting breakout';
        const accT=M.cA>0?'above VAH '+M.cA+'/'+Q.reAcc+(M.cA>=Q.reAcc?' \u2713':''):M.cB>0?'below VAL '+M.cB+'/'+Q.reAcc+(M.cB>=Q.reAcc?' \u2713':''):M.cI>0?'inside VA '+M.cI+' close'+(M.cI>1?'s':''):'-';
        const rxT=(M.rx&&D.N-1-M.rx.i<=12)?M.rx.nm+(M.rx.d>0?' \u2191 bullish':' \u2193 bearish')+(M.rx.conf?' \u2713 confirmed':' (unconfirmed)'):'none';
        rows.push(['MODULE 2 \u00b7 Previous session','closed',cpT,fg,cP,muted,true],
          ['Prev POC / VAH / VAL',ps?rvaFmt(ps.poc):'-',ps?rvaFmt(ps.vah)+' / '+rvaFmt(ps.val):'',muted,cP,fg],
          ['POC sequence',sqT,m.seqWarn?'1st violation (warning)':'',muted,m.seqB>0?cB:m.seqB<0?cR:muted,'#ffd23f'],
          ['Setup 1 \u00b7 POC first return',t1,'',muted,fg],['Setup 2 \u00b7 VA re-entry',t2,'',muted,fg],['Setup 3 \u00b7 Breakout + retest',t3,'',muted,fg],
          ['Acceptance',accT,'',muted,fg],['Reaction',rxT,'',muted,fg],['Volume confirmation',M.volNote||'n/a','',muted,fg],['Breakout confirmation',M.note||(s3.dir!==0?t3:'none'),'',muted,fg],
          ['Naked POC above / below',m.nUp!=null?rvaFmt(m.nUp):'-',m.nDn!=null?rvaFmt(m.nDn):'-',muted,'#ffd23f','#ffd23f'],['Naked POCs untested / tested',String(m.nUn),String(m.nTested),muted,fg,fg]); }
      panel(rows,p.dpos,fs); }
    if(p.stats){ const s=D.stats, f=v=>(v>=0?'+':'')+v.toFixed(2), rows=[['Back-test (loaded candles)',s.n+' trades','',fg,cP,muted,true],['Net profit',f(s.net),f(s.netPct)+'%',muted,s.net>=0?cB:cR,s.net>=0?cB:cR],['Max drawdown',s.mdd.toFixed(1)+'%','',muted,cR],['Win rate',s.wr.toFixed(1)+'%',s.w+'W / '+(s.n-s.w)+'L',muted,fg],
        ['Profit factor',isFinite(s.pf)?s.pf.toFixed(2):'inf','',muted,fg],['Avg win / loss',f(s.avgW),f(s.avgL),muted,cB,cR],['LONG',s.L.n+' tr \u00b7 '+(s.L.n?Math.round(s.L.w/s.L.n*100):0)+'%',f(s.L.net),muted,fg,s.L.net>=0?cB:cR],['SHORT',s.S.n+' tr \u00b7 '+(s.S.n?Math.round(s.S.w/s.S.n*100):0)+'%',f(s.S.net),muted,fg,s.S.net>=0?cB:cR]];
      if(p.m2On&&D.setupStats){ const pfT=v=>isFinite(v)?v.toFixed(2):'inf'; rows.push(['MODULE 2 \u00b7 per setup ('+D.ivl+' chart)','trades \u00b7 win \u00b7 PF','net \u00b7 max DD',fg,cP,muted,true]);
          [['S1','POC first return'],['S2','VA re-entry'],['S3','Breakout + retest']].forEach(([k2,nm2])=>{ const z=D.setupStats[k2]; rows.push([k2+' '+nm2,z.n+' \u00b7 '+(z.n?Math.round(z.wr)+'%':'-')+' \u00b7 '+pfT(z.pf),f(z.net)+' \u00b7 '+z.mdd.toFixed(1)+'%',muted,fg,z.net>=0?cB:cR],
            ['   avg R \u00b7 long \u00b7 short',(z.avgR>=0?'+':'')+z.avgR.toFixed(2)+'R','L '+z.L.n+' '+f(z.L.net)+' \u00b7 S '+z.S.n+' '+f(z.S.net),muted,fg,fg]); }); }
      const g=panel(rows,p.spos,fs); // equity curve under / over the table
      const cv=D.curve; if(cv.length>1){ const gh=Math.max(26,g.rh*3), up=/Top/.test(p.spos), gy=up?g.y0+g.ph+3:g.y0-gh-3; cx.fillStyle=pill; cx.fillRect(g.x0,gy,g.pw,gh); let lo=Infinity,hi=-Infinity; cv.forEach(z=>{ if(z.e<lo) lo=z.e; if(z.e>hi) hi=z.e; }); if(hi===lo) hi=lo+1;
        cx.strokeStyle=s.net>=0?cB:cR; cx.lineWidth=1.5; cx.beginPath(); cv.forEach((z,j)=>{ const x=g.x0+4+(g.pw-8)*j/(cv.length-1), y=gy+gh-4-(gh-8)*(z.e-lo)/(hi-lo); if(j) cx.lineTo(x,y); else cx.moveTo(x,y); }); cx.stroke();
        cx.font='8px system-ui'; cx.fillStyle=muted; cx.textAlign='left'; cx.fillText('Equity curve (closed trades)',g.x0+5,gy+7); cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(g.x0,gy,g.pw,gh); } }
    cx.restore(); }; }
try{ DESC.rva='Reinblacks strategy + Module 2 three-setup engine (POC first return, value-area re-entry, breakout + retest, POC sequence filter, naked POC targets): session volume profile (POC, VAH, VAL, HVN, LVN), D / P / B / THIN auction shapes, volume absorption + divergence, candle confirmation, previous value-area re-entry, HTF context, 1 % risk sizing, entry / SL / TP plans, alerts, dashboard and built-in back-test. Closed candles only, no repainting; rule-based estimates, nothing is guaranteed'; }catch(e){}

}catch(err){ console.error("Reinblacks Volume Profile & Auction Strategy failed",err); window.__rvaErr=err; }
//# sourceURL=tools-8.js
