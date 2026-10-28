// ===================================================================================================
// tools-2.js  -  extra tools loaded by index.html and run INSIDE the app (direct eval in start()).
// Each tool is its own try{} block: if one fails, the app and the other tools keep working.
// ===================================================================================================

// ---- [trf] INDICATOR: Trend Following - 200 EMA bias, break of structure, Fibonacci pullback, retest + reversal candle, SL / TP ----
// Institutional trend-following method for the H4 and Daily charts (works on any time frame):
//  1. BIAS     - price on one side of the 200 EMA and the EMA slope is steep enough. Above = only LONG, below = only SHORT.
//  2. IMPULSE  - a close beyond the last swing high (long) / swing low (short) = BoS. The leg runs from the previous swing low to the new high.
//  3. PULLBACK - wait for price to come back into the 38.2% - 50% Fibonacci zone of that leg (never chase the move).
//  4. CONFIRM  - at the zone, a Hammer / Shooting star or an Engulfing candle that also touches the 200 EMA and / or the broken swing level (retest).
//  5. EXECUTE  - entry at the close of the signal candle, SL beyond the leg's swing low / high, TP at the next swing (liquidity) level, at least 1:2.
// Closed candles only, nothing repaints. Look: BoS tags, a blue pullback box and a yellow circle on the entry (like an order-block chart).
try{
const TR_DEF={emaLen:200,useSlope:true,slopeLen:20,minSlope:0.5,swing:5,minLeg:1.5,fibA:38.2,fibB:50,zoneTol:0.15,reqFib:true,
  minConf:1,emaTol:0.5,lvlTol:0.35,useHammer:true,useEngulf:true,wickMult:2,
  atrLen:14,slPad:0.1,tpMode:'Next liquidity',minRR:2,maxRR:6,fbRR:2,maxBars:100,
  showEma:true,showBos:true,showZone:true,showBox:true,showCircle:true,showArrows:true,showLabels:true,keep:6,
  showStats:true,statPos:'Top right',cLong:'#26a69a',cShort:'#ef5350',cZone:'#2962ff',cBos:'#d9c3a0',cEntry:'#ffeb3b',
  alLong:true,alShort:true,alTP:false,alSL:false,alSound:false};
const trA=(hex,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const trFR=v=>Number.isInteger(+v)?(+v).toFixed(1):(+v).toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
const trFx=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=100?v.toFixed(2):Math.abs(v)>=1?v.toFixed(4):v.toFixed(6);
function trEma(c,n){ const N=c.length, o=new Float64Array(N).fill(NaN); if(N<n) return o; const k=2/(n+1); let s=0; for(let i=0;i<n;i++) s+=c[i].close; let p=s/n; o[n-1]=p; for(let i=n;i<N;i++){ p=c[i].close*k+p*(1-k); o[i]=p; } return o; }
function trAtr(c,L){ const N=c.length, o=new Float64Array(N).fill(NaN); let pc=null,rma=null,sum=0; for(let i=0;i<N;i++){ const h=c[i].high,l=c[i].low,tr=pc==null?h-l:Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)); pc=c[i].close;
    if(i<L-1) sum+=tr; else if(i===L-1){ sum+=tr; rma=sum/L; o[i]=rma; } else { rma=(rma*(L-1)+tr)/L; o[i]=rma; } } return o; }
// one pass per direction: d=+1 works on the real prices (long), d=-1 on mirrored prices (short), so the logic is written once
function trScan(c,p,ema,atr,d,n,D){
  const H=new Float64Array(c.length),L=new Float64Array(c.length),O=new Float64Array(c.length),C=new Float64Array(c.length),E=new Float64Array(c.length);
  for(let i=0;i<c.length;i++){ H[i]=d>0?c[i].high:-c[i].low; L[i]=d>0?c[i].low:-c[i].high; O[i]=d*c[i].open; C[i]=d*c[i].close; E[i]=d*ema[i]; }
  const R=Math.max(2,Math.round(+p.swing)||5), SL=Math.max(1,Math.round(+p.slopeLen)||20), fA=(+p.fibA||38.2)/100, fB=(+p.fibB||50)/100, zt=+p.zoneTol||0, minLeg=+p.minLeg||0;
  const pH=[], pL=[]; let P=null, pBroken=true, S=null;
  for(let i=0;i<n;i++){
    const j=i-R;
    if(j>=R){   // pivots, confirmed R bars later
      let ih=true, il=true; for(let k=1;k<=R;k++){ if(H[j-k]>H[j]||H[j+k]>=H[j]) ih=false; if(L[j-k]<L[j]||L[j+k]<=L[j]) il=false; }
      if(ih){ const q={i:j,p:H[j]}; pH.push(q); P=q; pBroken=false; } if(il) pL.push({i:j,p:L[j]}); }
    const a=atr[i], em=E[i]; if(!(a>0)||!(em===em)||i<SL||!(ema[i-SL]===ema[i-SL])) { S=null; continue; }
    const slope=d*(ema[i]-ema[i-SL])/a, bias=C[i]>em&&(!p.useSlope||slope>=+p.minSlope);
    // 1) break of structure in the direction of the bias -> new impulse leg
    if(P&&!pBroken&&C[i]>P.p&&bias){ pBroken=true;
      const lo=pL.length?pL[pL.length-1]:null;
      if(lo&&H[i]-lo.p>=minLeg*a){ S={lo:lo.p,loI:lo.i,hi:H[i],hiI:i,brk:P.p,brkI:P.i,bosI:i,bar0:i,dead:false}; D.bos.push({d,i0:P.i,i1:i,p:d*P.p,S}); } }
    else if(S&&i>S.bosI){
      if(!bias||C[i]<S.lo){ S.dead=true; S.end=i; S=null; continue; }
      if(H[i]>S.hi){ S.hi=H[i]; S.hiI=i; continue; }   // still extending the impulse: no pullback yet
      const rg=S.hi-S.lo, zTop=S.hi-fA*rg, zBot=S.hi-fB*rg, tol=zt*a;
      S.zTop=zTop; S.zBot=zBot; S.end=i;
      const fibHit=L[i]<=zTop+tol&&C[i]>=zBot-tol&&L[i]>S.lo;
      if(p.reqFib&&!fibHit) continue;
      const eT=L[i]<=em+(+p.emaTol||0)*a&&C[i]>=em, lT=L[i]<=S.brk+(+p.lvlTol||0)*a&&C[i]>=S.brk-(+p.lvlTol||0)*a;
      if((eT?1:0)+(lT?1:0)<Math.round(+p.minConf||0)) continue;
      const rng=H[i]-L[i]; if(!(rng>0)) continue; const body=Math.abs(C[i]-O[i]), lw=Math.min(O[i],C[i])-L[i], uw=H[i]-Math.max(O[i],C[i]);
      const hammer=p.useHammer&&lw>=(+p.wickMult||2)*Math.max(body,rng*0.05)&&uw<=lw*0.5&&(C[i]-L[i])/rng>=0.5;
      const eng=p.useEngulf&&i>0&&C[i-1]<O[i-1]&&C[i]>O[i]&&C[i]>=O[i-1]&&O[i]<=C[i-1];
      if(!hammer&&!eng) continue;
      // 5) entry, stop, take profit
      const entry=C[i], sl=S.lo-(+p.slPad||0)*a, risk=entry-sl; if(!(risk>0)) continue;
      let tp=null, rr=0, fb=false;
      if(p.tpMode==='Next liquidity'){ const cand=[S.hi]; for(let k=pH.length-1;k>=0&&pH.length-k<=60;k--){ if(pH[k].i<i&&pH[k].p>entry) cand.push(pH[k].p); } cand.sort((x,y)=>x-y);
        for(const v of cand){ const r=(v-entry)/risk; if(r>=+p.minRR&&r<=+p.maxRR){ tp=v; rr=r; break; } } }
      if(tp==null){ rr=p.tpMode==='Next liquidity'?(+p.fbRR||2):(+p.minRR||2); tp=entry+risk*rr; fb=p.tpMode==='Next liquidity'; }
      const tr={d,i,time:c[i].time,entry:d*entry,sl:d*sl,tp:d*tp,rr,fb,res:'open',end:n-1,r:0,pat:hammer?(d>0?'Hammer':'Shooting star'):'Engulfing',eT,lT,zi:S};
      // follow the trade
      for(let k=i+1;k<n;k++){ if(k-i>(+p.maxBars||100)){ tr.res='time'; tr.end=k-1; tr.r=(C[k-1]-entry)/risk; break; }
        if(L[k]<=sl){ tr.res='sl'; tr.end=k; tr.r=-1; break; } if(H[k]>=tp){ tr.res='tp'; tr.end=k; tr.r=rr; break; } }
      D.tr.push(tr); S.sig=tr; S.end=i; S=null; } }
  if(S&&!S.dead) S.active=true; }
function trCompute(c,p,forming){
  const N=c.length, D={N,ok:false,msg:'',bos:[],tr:[],ema:null,ev:[],st:null};
  const EL=Math.max(5,Math.round(+p.emaLen)||200); if(N<EL+(+p.slopeLen||20)+20){ D.msg='Trend Following: needs at least '+(EL+(+p.slopeLen||20)+20)+' candles (loaded '+N+')'; return D; }
  const n=forming?N-1:N, ema=trEma(c,EL), atr=trAtr(c,Math.max(2,Math.round(+p.atrLen)||14)); D.ema=ema;
  trScan(c,p,ema,atr,1,n,D); trScan(c,p,ema,atr,-1,n,D);
  D.tr.sort((x,y)=>x.i-y.i);
  let cnt=0,wins=0,net=0,gw=0,gl=0;
  D.tr.forEach(t=>{ D.ev.push({type:t.d>0?'long':'short',time:t.time,idx:t.i,price:t.entry}); if(t.res==='tp'||t.res==='sl'){ D.ev.push({type:t.res,time:c[t.end].time,idx:t.end,price:t.res==='tp'?t.tp:t.sl}); }
    if(t.res!=='open'){ cnt++; net+=t.r; if(t.r>0){ wins++; gw+=t.r; } else gl+=Math.abs(t.r); } });
  D.ev.sort((x,y)=>x.time-y.time);
  D.st={n:cnt,wr:cnt?100*wins/cnt:0,net,pf:gl>0?gw/gl:(gw>0?99:0),avg:cnt?net/cnt:0,open:D.tr.filter(t=>t.res==='open').length};
  D.ok=true; return D; }
let trMem=null;
function trGet(c,p){ const N=c.length, iv=N>1?c[N-1].time-c[N-2].time:0, forming=N>0&&iv>0&&(c[N-1].time+iv)*1000>Date.now();
  const key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+forming+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(trMem&&trMem.k===key) return trMem.D;
  let D; try{ D=trCompute(c,p,forming); }catch(e){ console.error('trf calc failed',e); D={N,ok:false,msg:'',bos:[],tr:[],ema:null,ev:[],st:null}; } trMem={k:key,D}; return D; }
IND.trf={label:'Trend Following \u00b7 200 EMA Pullback (H4 / Daily)',cat:'Trend',nm:p=>'Trend Following '+(p&&p.emaLen||200),p:Object.assign({},TR_DEF),cols:['#ff9800'],
  fields:[['emaLen','num','EMA period (bias)',{min:20,max:500}],['useSlope','chk','Require a steep EMA slope'],['slopeLen','num','Slope measured over (bars)',{min:3,max:100}],['minSlope','num','Minimum slope (x ATR over that period)',{min:0,max:10,step:0.1}],
    ['swing','num','Swing strength (bars each side)',{min:2,max:20}],['minLeg','num','Minimum impulse leg (x ATR)',{min:0,max:20,step:0.25}],
    ['fibA','num','Pullback zone from (% retracement)',{min:10,max:90,step:0.1}],['fibB','num','Pullback zone to (% retracement)',{min:10,max:95,step:0.1}],['zoneTol','num','Zone tolerance (x ATR)',{min:0,max:2,step:0.05}],['reqFib','chk','Require the Fibonacci zone'],
    ['minConf','num','Confluence needed (0 = off, 1 = EMA or swing level, 2 = both)',{min:0,max:2}],['emaTol','num','EMA touch distance (x ATR)',{min:0,max:3,step:0.05}],['lvlTol','num','Swing level touch distance (x ATR)',{min:0,max:3,step:0.05}],
    ['useHammer','chk','Hammer / Shooting star'],['useEngulf','chk','Engulfing candle'],['wickMult','num','Hammer wick (x body)',{min:1,max:6,step:0.5}],
    ['atrLen','num','ATR period',{min:2,max:100}],['slPad','num','Stop distance beyond the swing (x ATR)',{min:0,max:3,step:0.05}],
    ['tpMode','sel','Take profit',{opts:['Next liquidity','Fixed RR']}],['minRR','num','Minimum risk : reward',{min:1,max:20,step:0.25}],['maxRR','num','Maximum risk : reward (Next liquidity)',{min:1,max:50,step:0.5}],['fbRR','num','Risk : reward when no liquidity level fits',{min:1,max:20,step:0.25}],['maxBars','num','Close a trade after (bars)',{min:5,max:1000}],
    ['showEma','chk','Show the EMA line'],['showBos','chk','Show BoS tags'],['showZone','chk','Show the pullback zone box'],['showBox','chk','Show TP / SL boxes'],['showCircle','chk','Show the yellow entry circle'],['showArrows','chk','Show BUY / SELL arrows'],['showLabels','chk','Show labels'],['keep','num','Setups to display',{min:1,max:50}],
    ['cLong','col','Long / TP'],['cShort','col','Short / SL'],['cZone','col','Pullback zone'],['cBos','col','BoS tag'],['cEntry','col','Entry circle'],
    ['showStats','chk','Show statistics (estimate, not a backtest)'],['statPos','sel','Statistics position',{opts:['Top right','Top left','Bottom right','Bottom left']}],
    ['alLong','chk','Alert on BUY'],['alShort','chk','Alert on SELL'],['alTP','chk','Alert on take profit'],['alSL','chk','Alert on stop loss'],['alSound','chk','Play a sound']],
  calc:(c,p)=>{ const q=Object.assign({},TR_DEF,p); if(q.showEma===false||!c||c.length<5) return [[]]; const e=trEma(c,Math.max(5,Math.round(+q.emaLen)||200)), o=[]; for(let i=0;i<c.length;i++) if(e[i]===e[i]) o.push({time:c[i].time,value:e[i]}); return [o]; },
  extras:(c,p)=>{ const q=Object.assign({},TR_DEF,p), D=trGet(c,q), mk=[];
    if(D.ok&&q.showArrows) D.tr.slice(-Math.max(1,Math.round(+q.keep)||6)*3).forEach(t=>mk.push({time:t.time,position:t.d>0?'belowBar':'aboveBar',color:t.d>0?q.cLong:q.cShort,shape:t.d>0?'arrowUp':'arrowDown',text:t.d>0?'BUY':'SELL',size:.9,keep:true}));
    mk.sort((a,b)=>a.time-b.time);
    return {mk,boxes:[{type:'trfview',pts:[],o:q,D}],labels:[],events:D.ok?D.ev:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='trfview') return _D.apply(this,arguments);
    const p=d.o, D=d.D; if(!D) return; const K=Math.max(1,Math.round(+p.keep)||6);
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.font='10px system-ui,sans-serif'; cx.textBaseline='middle';
    if(D.ok){
      const lab=(t,x,y,bg,fg,al)=>{ const w=cx.measureText(t).width+10; let lx=al==='c'?x-w/2:x; if(al!=='c'&&lx+w>W-2) lx=x-6-w; cx.fillStyle=bg; cx.beginPath(); if(cx.roundRect) cx.roundRect(lx,y-7,w,14,4); else cx.rect(lx,y-7,w,14); cx.fill(); cx.fillStyle=fg; cx.textAlign='left'; cx.fillText(t,lx+5,y); };
      // BoS tags + pullback zone (setups that produced a trade or are still waiting)
      const bs=D.bos.filter(b=>b.S.sig||b.S.active).sort((x,y)=>x.i1-y.i1).slice(-K);
      bs.forEach(b=>{ const S=b.S, x0=X(b.i0), x1=X(b.i1), y=Y(b.p);
        if(p.showZone&&S.zTop!=null){ const xa=X(b.i1), xb=X(S.sig?S.sig.i:D.N-1), yt=Y(b.d*S.zTop), yb=Y(b.d*S.zBot);
          if(xa!=null&&xb!=null&&yt!=null&&yb!=null){ const bx=Math.min(xa,xb), bw=Math.max(8,Math.abs(xb-xa)+6), by=Math.min(yt,yb), bh=Math.max(3,Math.abs(yb-yt));
            cx.fillStyle=trA(p.cZone,.22); cx.fillRect(bx,by,bw,bh); cx.strokeStyle=trA(p.cZone,.55); cx.lineWidth=1; cx.strokeRect(bx+.5,by+.5,bw,bh);
            if(p.showLabels){ cx.fillStyle=trA(p.cZone,.95); cx.textAlign='left'; cx.font='9px system-ui,sans-serif'; cx.fillText('Pullback '+trFR(p.fibA)+'-'+trFR(p.fibB)+'%',bx+4,by+Math.min(bh/2,9)); cx.font='10px system-ui,sans-serif'; } } }
        if(p.showBos&&x0!=null&&x1!=null&&y!=null){ cx.strokeStyle=trA(p.cBos,.9); cx.lineWidth=1; cx.setLineDash([]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1+10,y); cx.stroke();
          lab('BoS',x1+12,y,trA(p.cBos,1),'#3b3226'); } });
      // trades: TP / SL boxes, entry circle, result tag
      D.tr.slice(-K).forEach(t=>{ const x0=X(t.i); let x1=X(t.end); if(x0==null||x1==null) return; x1=Math.max(x1,x0+8); if(t.res==='open') x1=x1+14;
        const yE=Y(t.entry), yT=Y(t.tp), yS=Y(t.sl); if(yE==null||yT==null||yS==null) return; const cl=t.d>0?p.cLong:p.cShort;
        if(p.showBox){ cx.fillStyle=trA(p.cLong,.16); cx.fillRect(x0,Math.min(yE,yT),x1-x0,Math.abs(yT-yE)); cx.fillStyle=trA(p.cShort,.16); cx.fillRect(x0,Math.min(yE,yS),x1-x0,Math.abs(yS-yE));
          cx.lineWidth=1; cx.setLineDash([]); cx.strokeStyle=trA(p.cLong,.7); cx.beginPath(); cx.moveTo(x0,yT); cx.lineTo(x1,yT); cx.stroke(); cx.strokeStyle=trA(p.cShort,.8); cx.beginPath(); cx.moveTo(x0,yS); cx.lineTo(x1,yS); cx.stroke();
          cx.strokeStyle=trA('#ffffff',.55); cx.setLineDash([4,3]); cx.beginPath(); cx.moveTo(x0,yE); cx.lineTo(x1,yE); cx.stroke(); cx.setLineDash([]); }
        if(p.showLabels&&p.showBox){ lab('TP '+trFR(t.rr)+'R'+(t.fb?'':' \u00b7 liquidity'),x1+3,yT,trA(p.cLong,.85),'#fff'); lab('SL',x1+3,yS,trA(p.cShort,.85),'#fff');
          if(t.res!=='open'){ const ok=t.r>0; lab((ok?'\u2713 +':'\u2717 ')+trFR(Math.abs(t.r)).replace(/^/,ok?'':'-')+'R'+(t.res==='time'?' (time)':''),x1+3,yE,ok?trA(p.cLong,.95):trA(p.cShort,.95),'#fff'); } }
        if(p.showCircle){ cx.fillStyle=trA(p.cEntry,.9); cx.strokeStyle='#8a6d00'; cx.lineWidth=1; cx.beginPath(); cx.arc(x0,yE,6,0,Math.PI*2); cx.fill(); cx.stroke(); }
        if(p.showLabels){ const tx=(t.d>0?'BUY':'SELL')+' \u00b7 '+t.pat; lab(tx,x0,t.d>0?yE+14:yE-14,trA(cl,.9),'#fff','c'); } }); }
    if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); }
    if(D.ok&&p.showStats&&D.st){ const S=D.st, rows=[['Closed trades',String(S.n)],['Win rate',S.wr.toFixed(1)+' %'],['Net R',(S.net>=0?'+':'')+S.net.toFixed(1)],['Profit factor',S.pf.toFixed(2)],['Avg R / trade',S.avg.toFixed(2)],['Open now',String(S.open)]];
      cx.font='11px system-ui,sans-serif'; const rh=17; let w0=cx.measureText('Trend Following').width, w1=cx.measureText('estimate').width;
      rows.forEach(r=>{ w0=Math.max(w0,cx.measureText(r[0]).width); w1=Math.max(w1,cx.measureText(r[1]).width); }); w0+=12; w1+=12; const tw=w0+w1, th=rh*(rows.length+1), pos=p.statPos||'Top right';
      const tx=pos.indexOf('left')>-1?8:W-tw-8, ty=pos.indexOf('Top')>-1?8:H-th-8;
      cx.fillStyle='rgba(0,0,0,.72)'; cx.fillRect(tx,ty,tw,th); cx.fillStyle='rgba(255,152,0,.45)'; cx.fillRect(tx,ty,tw,rh); cx.strokeStyle='rgba(140,140,140,.35)'; cx.lineWidth=1; cx.strokeRect(tx+.5,ty+.5,tw,th);
      cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText('Trend Following',tx+6,ty+rh/2); cx.font='9px system-ui,sans-serif'; cx.fillText('estimate',tx+w0+6,ty+rh/2); cx.font='11px system-ui,sans-serif';
      rows.forEach((r,k)=>{ const y=ty+rh*(k+1)+rh/2; cx.fillStyle='#fff'; cx.fillText(r[0],tx+6,y); cx.fillText(r[1],tx+w0+6,y); }); }
    cx.restore(); }; }
// alerts: fire once, when the signal candle (or the candle that hit TP / SL) has closed, while the app is open
function trAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0], KEY={long:'alLong',short:'alShort',tp:'alTP',sl:'alSL'},
    MSG={long:['TREND BUY','#2e7d32'],short:['TREND SELL','#c62828'],tp:['Trend Following: take profit hit','#2e7d32'],sl:['Trend Following: stop loss hit','#c62828']};
  inds.forEach(i=>{ if(i.t!=='trf'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},TR_DEF,i.p); let quiet=q; if(i._trK!==key){ i._trK=key; i._trLast={}; quiet=true; }
    const last=i._trLast||(i._trLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!P[KEY[e.type]]) return;
      toast(MSG[e.type][0]+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+trFx(e.price),MSG[e.type][1]);
      if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _trRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_trRE.apply(this,arguments); try{ trAlerts(q); }catch(e){ console.error('trf alerts',e); } return rv; }; }
try{ DESC.trf='200 EMA sets the bias, a break of structure starts the impulse, then BUY / SELL on a Hammer or Engulfing candle in the 38.2-50% pullback at the EMA / broken swing level, with SL, TP (next liquidity, at least 1:2) and a small statistics table'; }catch(e){}
}catch(err){ console.error('trf indicator failed',err); window.__trfErr=err; }

// ---- [nb] INDICATOR: Jilly's ORB + Noise Band - port of the Pine v6 script "Jilly's ORB + Noise Band" (ORB+NB) ----
// Opening-range breakout that only trades the break when the time-of-day Noise Band confirms it (Zarattini, Aziz & Barbon, 2024): at a checkpoint close
// price must be outside the opening range AND outside the noise band AND beyond the session VWAP. One trade per session, filled at the next bar open,
// wide ATR catastrophe stop, optional target, flat late in the day. Green / red boxes follow the trade, a table shows closed-trade statistics.
try{
const NB_DEF={N:20,k:1.25,refMode:'Gap-adjusted',rollGuard:true,useNB:true,orLen:15,bufAtr:0.3,useOR:true,cadence:15,lastEntry:'14:00',flatAt:'15:45',
  qty:1,rtCost:1.8,pointValue:2,tick:0,stopMode:'ATR',stopMult:10,tgtMode:'R multiple',tgtR:1,tgtAtr:5,atrLen:9,atrTf:'5m',sess:'0930-1600',tz:'America/New_York',
  showSig:true,showStop:true,showBoxes:true,showOR:true,showVwap:true,showOpen:true,showBg:true,showCk:true,showStats:true,statsPos:'Top Right',boxLead:5,
  cBand:'#2a78d6',cVwap:'#eb6834',cOR:'#787b86',cOpen:'#9c27b0',alLong:true,alShort:true,alExit:false,alSound:false};
const NB_TZ=['America/New_York','America/Chicago','America/Los_Angeles','Europe/London','Europe/Berlin','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Australia/Sydney','UTC'];
function nbSess(s,d){ const m=/^\s*(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})\s*$/.exec(String(s||'')); return m?[(+m[1])*60+(+m[2]),(+m[3])*60+(+m[4])]:d; }
function nbHM(t,d){ const m=/^\s*(\d{1,2}):?(\d{2})\s*$/.exec(String(t||'')); return m?(+m[1])*60+(+m[2]):d; }
const nbIn=(m,s)=>s[0]<=s[1]?(m>=s[0]&&m<s[1]):(m>=s[0]||m<s[1]);
const nbFm={};
function nbParts(tz,t){ let f=nbFm[tz]; if(f===undefined){ try{ f=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric'}); }catch(e){ f=null; } nbFm[tz]=f; }
  if(!f){ const d=new Date(t*1000); return {key:d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate(),min:d.getUTCHours()*60+d.getUTCMinutes()}; }
  const q={}; f.formatToParts(new Date(t*1000)).forEach(x=>{ q[x.type]=+x.value; }); return {key:q.year*10000+q.month*100+q.day,min:(q.hour%24)*60+q.minute}; }
function nbIv(c){ let m=0; for(let i=c.length-1;i>0&&i>c.length-40;i--){ const d=c[i].time-c[i-1].time; if(d>0&&(m===0||d<m)) m=d; } return m; }
function nbTfSec(s){ const m=/^(\d+)\s*([mhd])?/i.exec(String(s||'5m')); const n=m?+m[1]:5, u=((m&&m[2])||'m').toLowerCase(); return n*(u==='h'?3600:u==='d'?86400:60); }
function nbTick(c){ let d=0; for(let i=Math.max(0,c.length-300);i<c.length;i++){ const s=String(c[i].close), k=s.indexOf('.'); if(k>=0) d=Math.max(d,Math.min(8,s.length-k-1)); } return Math.pow(10,-d); }
function nbA(hex,a){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
const nbUsd=v=>(v<0?'-$':'$')+Math.abs(v).toLocaleString('en-US',{maximumFractionDigits:0});
const nbSg=v=>(v<0?'\u2212$':'+$')+Math.abs(v).toLocaleString('en-US',{maximumFractionDigits:0});
function nbCompute(c,p,iv,forming){
  const N=c.length, D={N,ok:false,msg:''};
  if(N<10||!iv) return D;
  if(iv%60||iv>3600){ D.msg='ORB + Noise Band: use a minute chart (1, 5 or 15 min)'; return D; }
  const TF=iv/60, cad=Math.round(+p.cadence)||15, orLen=Math.round(+p.orLen)||15;
  if(cad%TF||orLen%TF){ D.msg='ORB + Noise Band: the chart interval must divide the checkpoint cadence and the OR length'; return D; }
  const sp=nbSess(p.sess,[570,960]), START=sp[0], END=sp[1], RTH=(((END-START+1440)%1440)||1440);
  const LAST=(nbHM(p.lastEntry,840)-START+1440)%1440, FLAT=Math.min((nbHM(p.flatAt,945)-START+1440)%1440,RTH), STUB=RTH-180;
  if(FLAT<=orLen||LAST<=orLen){ D.msg='ORB + Noise Band: last entry and flat time must be after the opening range'; return D; }
  const tick=+p.tick>0?+p.tick:nbTick(c), tickD=d=>Math.max(Math.round(d/tick)*tick,tick), rt=x=>Math.round(x/tick)*tick, PV=+p.pointValue||1, Q=Math.max(1,Math.round(+p.qty)||1), COST=+p.rtCost||0;
  // ATR on the ATR time frame (aggregated from the chart candles; if the chart is coarser the chart candles are used)
  const S=Math.max(iv,nbTfSec(p.atrTf)), aL=Math.max(1,Math.round(+p.atrLen)||9), aMap=new Map(); { let id0=null,cur=null,pc=null,rma=null,sum=0,cnt=0; const flush=()=>{ if(!cur) return; const tr=pc==null?cur.h-cur.l:Math.max(cur.h-cur.l,Math.abs(cur.h-pc),Math.abs(cur.l-pc)); pc=cur.c;
        if(cnt<aL-1){ sum+=tr; cnt++; } else if(cnt===aL-1){ sum+=tr; cnt++; rma=sum/aL; aMap.set(cur.id,rma); } else { rma=(rma*(aL-1)+tr)/aL; aMap.set(cur.id,rma); } };
    for(let i=0;i<N;i++){ const id=Math.floor(c[i].time/S); if(id!==id0){ flush(); cur={id,h:c[i].high,l:c[i].low,c:c[i].close}; id0=id; } else { cur.h=Math.max(cur.h,c[i].high); cur.l=Math.min(cur.l,c[i].low); cur.c=c[i].close; } } flush(); }
  const atrAt=i=>{ const id=Math.floor((c[i].time+iv)/S)-1; for(let k=0;k<=12;k++){ const v=aMap.get(id-k); if(v!=null) return v; } return NaN; };
  const F=()=>new Float64Array(N).fill(NaN);
  Object.assign(D,{UB:F(),LB:F(),VW:F(),DO:F(),OH:F(),OL:F(),stp:F(),tgt:F(),ck:new Uint8Array(N),trades:[],sessions:[],ev:[],note:S>iv||S===iv?'':'ATR from chart candles'});
  const st={cntL:0,cntS:0,winL:0,winS:0,gpL:0,glL:0,gpS:0,glS:0,eq:0,pk:0,dd:0,eqL:0,pkL:0,ddL:0,eqS:0,pkS:0,ddS:0};
  const rec=(sd,pnl)=>{ const L=sd===1; if(L){ st.cntL++; if(pnl>0){ st.winL++; st.gpL+=pnl; } else st.glL-=pnl; } else { st.cntS++; if(pnl>0){ st.winS++; st.gpS+=pnl; } else st.glS-=pnl; }
    st.eq+=pnl; st.pk=Math.max(st.pk,st.eq); st.dd=Math.max(st.dd,st.pk-st.eq);
    if(L){ st.eqL+=pnl; st.pkL=Math.max(st.pkL,st.eqL); st.ddL=Math.max(st.ddL,st.pkL-st.eqL); } else { st.eqS+=pnl; st.pkS=Math.max(st.pkS,st.eqS); st.ddS=Math.max(st.ddS,st.pkS-st.eqS); } return pnl; };
  const rows=[]; let validDay=false,rollSess=false,lastRollYm=0,dayOpen=NaN,priorClose=NaN,sessClose=NaN,sessLastKey=0,goodClose=NaN,sessStart=null,cumPV=0,cumV=0,lastKey=0,lastMove=NaN,orh=NaN,orl=NaN,traded=false,
    side=0,entryPx=NaN,stopPx=NaN,tgtPx=NaN,pend=0,pendAtr=NaN,cur=null,row=null,ses=null,prevIn=false,prevKey=0,prevClose=NaN,bhPx=NaN,firstT=null,bhPk=0,bhDD=0;
  const fin=(xp,xi,kind)=>{ const pnl=rec(side,(side*(xp-entryPx))*PV*Q-COST*Q); Object.assign(cur,{i1:xi,exit:xp,pnl,kind,open:false}); D.ev.push({type:'exit',time:c[xi].time,idx:xi,price:xp});
    side=0; entryPx=NaN; stopPx=NaN; tgtPx=NaN; cur=null; };
  for(let i=0;i<N;i++){ const b=c[i], q=nbParts(p.tz,b.time), inRTH=nbIn(q.min,sp), dayCh=q.key!==prevKey, newSess=inRTH&&(!prevIn||dayCh), endedEarly=prevIn&&(!inRTH||dayCh), live=forming&&i===N-1;
    if(pend!==0){ side=pend; entryPx=b.open; const orLvl=p.stopMode==='Opposite OR'?(pend===1?orl:orh):rt((orh+orl)/2), orDist=pend*(b.open-orLvl), dist=(p.stopMode==='ATR'||orDist<=0)?tickD(p.stopMult*pendAtr):orDist;
      const td=p.tgtMode==='R multiple'?p.tgtR*dist:p.tgtMode==='ATR multiple'?tickD(p.tgtAtr*pendAtr):NaN; stopPx=b.open-pend*dist; tgtPx=isNaN(td)?NaN:b.open+pend*td;
      cur={i0:i,i1:i,side,entry:b.open,stop:stopPx,tgt:tgtPx,fav:b.open,adv:b.open,open:true,dist}; D.trades.push(cur); if(isNaN(bhPx)){ bhPx=b.open; firstT=b.time; } }
    pend=0;
    if(endedEarly&&side!==0) fin(prevClose,i-1,'x');
    if(newSess){ if(validDay&&sessLastKey>0){ if(sessLastKey<=STUB) rows.pop(); else goodClose=sessClose; } priorClose=goodClose; validDay=q.min===START; rollSess=false;
      if(cur){ cur.open=false; cur.i1=i-1; cur.kind=''; cur=null; } side=0; entryPx=stopPx=tgtPx=NaN;
      if(validDay){ row=new Float32Array(RTH+1).fill(NaN); rows.push(row); const y=Math.floor(q.key/10000), m=Math.floor(q.key/100)%100, d=q.key%100;
        if(p.rollGuard&&m%3===0){ const dow1=new Date(Date.UTC(y,m-1,1)).getUTCDay(), tf3=1+((5-dow1+7)%7)+14; if(d>=tf3&&lastRollYm!==y*100+m){ rollSess=true; lastRollYm=y*100+m; } }
        ses={i0:i,i1:i,open:b.open,orh:NaN,orl:NaN,lastOr:-1}; D.sessions.push(ses); }
      dayOpen=b.open; sessStart=b.time; sessLastKey=0; cumPV=0; cumV=0; lastKey=0; lastMove=NaN; orh=NaN; orl=NaN; traded=false; }
    if(inRTH&&sessStart!=null&&validDay){ const key=Math.round((b.time+iv-sessStart)/60); sessClose=b.close; sessLastKey=key; cumPV+=(b.high+b.low+b.close)/3*(b.volume||0); cumV+=(b.volume||0);
      const vw=cumV>0?cumPV/cumV:b.close; if(key<=orLen){ orh=isNaN(orh)?b.high:Math.max(orh,b.high); orl=isNaN(orl)?b.low:Math.min(orl,b.low); } const orDone=key>=orLen; let sig=NaN;
      if(key>=1&&key<=RTH){ const mv=Math.abs(b.close/dayOpen-1); if(!isNaN(lastMove)&&key>lastKey+1) for(let k=lastKey+1;k<key;k++) row[k]=lastMove;
        if(rows.length>p.N){ let s=0,n=0; for(let r=rows.length-1-p.N;r<rows.length-1;r++){ const v=rows[r][key]; if(!isNaN(v)){ s+=v; n++; } } sig=n>0?s/n:NaN; } row[key]=mv; lastKey=key; lastMove=mv; }
      let UB=NaN,LB=NaN; if(!isNaN(sig)){ const gap=p.refMode==='Gap-adjusted'&&!rollSess&&!isNaN(priorClose), up=gap?Math.max(dayOpen,priorClose):dayOpen, dn=gap?Math.min(dayOpen,priorClose):dayOpen; UB=up*(1+p.k*sig); LB=dn*(1-p.k*sig); }
      if(side!==0){ const hitS=side===1?b.low<=stopPx:b.high>=stopPx, hitT=!isNaN(tgtPx)&&(side===1?b.high>=tgtPx:b.low<=tgtPx);
        if(hitS) fin(side===1?Math.min(b.open,stopPx):Math.max(b.open,stopPx),i,'SL'); else if(hitT) fin(tgtPx,i,'TP'); else if(key>=FLAT) fin(b.close,i,'x'); }
      const isCheck=key%cad===0&&key>orLen&&key<=LAST&&key+TF<FLAT; D.ck[i]=isCheck?1:0; const atr=atrAt(i);
      if(isCheck&&!traded&&side===0&&orDone&&!isNaN(atr)&&(!p.useNB||!isNaN(sig))&&!live){
        const goL=(!p.useOR||b.close>orh+p.bufAtr*atr)&&(!p.useNB||b.close>UB)&&b.close>vw, goS=(!p.useOR||b.close<orl-p.bufAtr*atr)&&(!p.useNB||b.close<LB)&&b.close<vw;
        if(goL||goS){ pend=goL?1:-1; pendAtr=atr; traded=true; D.ev.push({type:goL?'long':'short',time:b.time,idx:i,price:b.close}); } }
      D.UB[i]=UB; D.LB[i]=LB; D.VW[i]=vw; D.DO[i]=dayOpen; if(orDone){ D.OH[i]=orh; D.OL[i]=orl; ses.lastOr=i; ses.orh=orh; ses.orl=orl; } ses.i1=i; }
    if(side!==0&&cur){ D.stp[i]=stopPx; D.tgt[i]=tgtPx; cur.fav=side===1?Math.max(cur.fav,b.high):Math.min(cur.fav,b.low); cur.adv=side===1?Math.min(cur.adv,b.low):Math.max(cur.adv,b.high); cur.i1=i; }
    if(!isNaN(bhPx)){ const e=(b.close-bhPx)*PV*Q; bhPk=Math.max(bhPk,e); bhDD=Math.max(bhDD,bhPk-e); }
    prevIn=inRTH; prevKey=q.key; prevClose=b.close; }
  D.st=st; D.bh=isNaN(bhPx)?null:{pnl:(c[N-1].close-bhPx)*PV*Q,dd:bhDD}; D.firstT=firstT; D.PV=PV; D.Q=Q; D.tick=tick; D.ok=true; return D; }
let nbMem=null;
function nbGet(c,p){ const N=c.length, iv=nbIv(c), forming=N>0&&iv>0&&(c[N-1].time+iv)*1000>Date.now();
  const key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+forming+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(nbMem&&nbMem.k===key) return nbMem.D;
  let D; try{ D=nbCompute(c,p,iv,forming); }catch(e){ console.error('orbnb calc failed',e); D={N,ok:false,msg:''}; } nbMem={k:key,D}; return D; }
IND.orbnb={label:"Jilly's ORB + Noise Band",cat:'Trend',nm:()=>'ORB+NB',p:Object.assign({},NB_DEF),cols:['#2a78d6'],
  fields:[['N','num','Noise band lookback N (sessions)',{min:2,max:60}],['k','num','Band multiplier k',{min:0.1,max:10,step:0.05}],['refMode','sel','Reference',{opts:['Open','Gap-adjusted']}],['rollGuard','chk','Roll guard (Gap-adjusted)'],['useNB','chk','Require Noise Band confirmation'],
    ['orLen','num','OR length (min)',{min:1,max:120}],['bufAtr','num','Trigger buffer x ATR',{min:0,max:5,step:0.05}],['useOR','chk','Require OR break'],
    ['cadence','sel','Checkpoint cadence (min)',{opts:['5','15','30'],num:true}],['lastEntry','txt','Last entry checkpoint (HH:MM)'],['flatAt','txt','Flat time (HH:MM)'],
    ['qty','num','Contracts',{min:1,max:1000}],['rtCost','num','Round-trip cost per contract ($)',{min:0,max:1000,step:0.1}],['pointValue','num','Point value ($ per 1.0 of price; MNQ = 2)',{min:0.0001,max:100000,step:0.5}],['tick','num','Tick size (0 = automatic)',{min:0,max:1000,step:0.01}],
    ['stopMode','sel','Stop',{opts:['ATR','Opposite OR','ORM']}],['stopMult','num','Stop ATR multiple',{min:0.1,max:100,step:0.5}],
    ['tgtMode','sel','Target',{opts:['R multiple','ATR multiple','None']}],['tgtR','num','Target R multiple',{min:0.1,max:50,step:0.25}],['tgtAtr','num','Target ATR multiple',{min:0.1,max:100,step:0.5}],
    ['atrLen','num','ATR length',{min:1,max:200}],['atrTf','sel','ATR timeframe',{opts:['1m','5m','15m','30m','1h']}],
    ['sess','txt','Session (e.g. 0930-1600)'],['tz','sel','Timezone',{opts:NB_TZ}],
    ['showSig','chk','Entry / exit markers'],['showStop','chk','Stop / target lines'],['showBoxes','chk','Show SL/TP boxes'],['showOR','chk','OR high / low / mid'],['showVwap','chk','Session VWAP'],['showOpen','chk','Reference (open) line'],
    ['showBg','chk','Shade time in position'],['showCk','chk','Checkpoint dots'],['showStats','chk','Show performance table'],['statsPos','sel','Table position',{opts:['Top Left','Top Right','Top Center','Middle Left','Middle Right','Bottom Left','Bottom Right','Bottom Center']}],
    ['boxLead','num','Box projection (bars ahead)',{min:0,max:100}],['cBand','col','Band'],['cVwap','col','VWAP'],['cOR','col','OR'],['cOpen','col','Session open'],
    ['alLong','chk','Alert on long signal'],['alShort','chk','Alert on short signal'],['alExit','chk','Alert on exit'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},NB_DEF,p), D=nbGet(c,q); return {mk:[],boxes:[{type:'nbview',pts:[],o:q,D}],labels:[],events:D.ok?D.ev:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='nbview') return _D.apply(this,arguments);
    const p=d.o, D=d.D; if(!D) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.textBaseline='middle';
    if(D.ok){ const N=D.N, xa=X(0), xb=X(1); let dx=(xa!=null&&xb!=null)?xb-xa:6; if(!(dx>0)) dx=6; let lo=0, hi=N-1; if(xa!=null){ lo=Math.max(0,Math.floor(-xa/dx)-3); hi=Math.min(N-1,Math.ceil((W-xa)/dx)+3); } if(hi<lo){ cx.restore(); return; }
      const tr=D.trades, vis=t=>{ const e=t.open?N-1:t.i1; return e>=lo&&t.i0<=hi; };
      if(p.showBg) tr.forEach(t=>{ if(!t.side||!vis(t)) return; const e=t.open?N-1:t.i1-1; if(e<t.i0) return; const x0=X(t.i0), x1=X(e); if(x0==null||x1==null) return; cx.fillStyle=t.side===1?'rgba(8,153,129,.09)':'rgba(242,54,69,.09)'; cx.fillRect(x0-dx/2,0,x1-x0+dx,H); });
      const ln=(arr,col,w,dash,fn)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); let on=false; for(let i=lo;i<=hi;i++){ const v=fn?fn(i):arr[i]; if(v==null||isNaN(v)){ on=false; continue; } const x=X(i), y=Y(v); if(x==null||y==null){ on=false; continue; } if(on) cx.lineTo(x,y); else{ cx.moveTo(x,y); on=true; } } cx.stroke(); cx.setLineDash([]); };
      ln(D.UB,p.cBand,2); ln(D.LB,p.cBand,2); if(p.showVwap) ln(D.VW,p.cVwap,2); if(p.showOpen) ln(D.DO,p.cOpen,1);
      if(p.showOR){ ln(D.OH,p.cOR,1); ln(D.OL,p.cOR,1); ln(null,p.cOR,1,[4,3],i=>(D.OH[i]+D.OL[i])/2); }
      if(p.showStop){ ln(D.stp,'#f23645',1); ln(D.tgt,'#4caf50',1); }
      cx.font='9px system-ui,sans-serif'; cx.textAlign='left';
      D.sessions.forEach(s=>{ if(s.i1<lo||s.i0>hi) return; const lab=(v,t,col)=>{ const x=X(s.i1), y=Y(v); if(x==null||y==null) return; cx.fillStyle=col; cx.fillText(t,x+4,y); };
        if(p.showOR&&s.lastOr>=0){ const e=s.lastOr; const x=X(e); [[s.orh,'ORH'],[s.orl,'ORL'],[(s.orh+s.orl)/2,'ORM']].forEach(a=>{ const y=Y(a[0]); if(x!=null&&y!=null){ cx.fillStyle=p.cOR; cx.fillText(a[1],x+4,y); } }); }
        if(p.showOpen) lab(s.open,'Opening',p.cOpen); });
      if(p.showBoxes) tr.forEach(t=>{ if(!t.side||!vis(t)) return; const x0=X(t.i0), x1=X(t.open?Math.min(N-1+p.boxLead,t.i1+p.boxLead):t.i1); if(x0==null||x1==null) return; const e=t.entry;
        const won=!t.open&&t.side*(t.exit-e)>0, snap=!t.open&&t.exit!==e; let pr=t.side*(t.fav-e)>0?[e,t.fav]:null, rk=t.side*(t.adv-e)<0?[e,t.adv]:null; if(snap){ if(won) pr=[e,t.exit]; else rk=[e,t.exit]; }
        const bx=(r,fill,brd)=>{ if(!r) return; const y1=Y(Math.max(r[0],r[1])), y2=Y(Math.min(r[0],r[1])); if(y1==null||y2==null) return; cx.fillStyle=fill; cx.fillRect(x0,y1,x1-x0,Math.max(1,y2-y1)); cx.strokeStyle=brd; cx.lineWidth=1; cx.strokeRect(x0+.5,y1,x1-x0,Math.max(1,y2-y1)); return [y1,y2]; };
        const a=bx(pr,'rgba(76,175,80,.15)','rgba(76,175,80,.5)'), b2=bx(rk,'rgba(242,54,69,.15)','rgba(242,54,69,.5)');
        if(snap){ const yy=won?a:b2; if(yy){ const atBottom=won!==(t.side===1); cx.font='11px system-ui,sans-serif'; cx.textAlign='center'; cx.fillStyle=t.pnl>0?'#4caf50':'#f23645'; cx.fillText(nbSg(t.pnl),(x0+x1)/2,atBottom?yy[1]-7:yy[0]+7); } } });
      if(p.showSig) tr.forEach(t=>{ if(!t.side||!vis(t)) return; cx.font='bold 9px system-ui,sans-serif'; cx.textAlign='center';
        const x=X(t.i0), y=Y(t.entry); if(x!=null&&y!=null){ const L=t.side===1, by=L?y+4:y-17; cx.fillStyle=L?'#089981':'#f23645'; cx.fillRect(x-7,by,14,13); cx.fillStyle='#fff'; cx.fillText(L?'L':'S',x,by+6.5); }
        if(!t.open&&t.kind){ const xe=X(t.i1), ye=Y(t.exit); if(xe!=null&&ye!=null){ cx.fillStyle='rgba(120,123,134,.4)'; cx.fillRect(xe-9,ye-7,18,14); cx.fillStyle='#d1d4dc'; cx.fillText(t.kind==='x'?'\u2715':t.kind,xe,ye); } } });
      if(p.showCk){ cx.fillStyle='rgba(150,150,160,.55)'; for(let i=lo;i<=hi;i++){ if(!D.ck[i]) continue; const x=X(i); if(x==null) continue; cx.beginPath(); cx.arc(x,H-8,2,0,6.2832); cx.fill(); } } }
    if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); }
    if(D.ok&&p.showStats&&D.st){ const S=D.st, tot=S.cntL+S.cntS, nL=S.gpL-S.glL, nS=S.gpS-S.glS, fP=(w,n)=>n>0?(100*w/n).toFixed(1)+'%':'\u2014', fPF=(a,g)=>g>0?(a/g).toFixed(2):a>0?'\u221e':'\u2014',
        fE=(n,k)=>k>0?(n<0?'-$':'$')+Math.abs(n/k).toFixed(2):'\u2014', gc=v=>v>=0?'#4caf50':'#f23645', W0='#fff', R0='#f23645';
      const T=[['ORB + NB','All','Long','Short'],['Trades',String(tot),String(S.cntL),String(S.cntS)],['Win %',fP(S.winL+S.winS,tot),fP(S.winL,S.cntL),fP(S.winS,S.cntS)],['PF',fPF(S.gpL+S.gpS,S.glL+S.glS),fPF(S.gpL,S.glL),fPF(S.gpS,S.glS)],
        ['Expectancy',fE(S.eq,tot),fE(nL,S.cntL),fE(nS,S.cntS)],['P&L',tot?nbUsd(S.eq):'\u2014',S.cntL?nbUsd(nL):'\u2014',S.cntS?nbUsd(nS):'\u2014'],['Closed-trade Max DD',nbUsd(S.dd),S.cntL?nbUsd(S.ddL):'\u2014',S.cntS?nbUsd(S.ddS):'\u2014'],
        ['B&H P&L',D.bh?nbUsd(D.bh.pnl):'\u2014','',''],['B&H Max DD',D.bh?nbUsd(D.bh.dd):'\u2014','',''],['First trade',D.firstT?new Date(D.firstT*1000).toLocaleString('en-GB',{timeZone:p.tz,day:'2-digit',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).replace(',',''):'\u2014','','']];
      const colr=[[],[],[],[],[null,S.eq>=0?1:0,nL>=0?1:0,nS>=0?1:0],[null,tot?(S.eq>=0?1:0):-1,S.cntL?(nL>=0?1:0):-1,S.cntS?(nS>=0?1:0):-1],[null,2,2,2],[null,D.bh?(D.bh.pnl>=0?1:0):-1],[null,2],[]];
      cx.font='11px system-ui,sans-serif'; const cw=[0,0,0,0], rh=17; T.forEach(r=>r.forEach((s,j)=>{ cw[j]=Math.max(cw[j],cx.measureText(s).width+12); })); const tw=cw[0]+cw[1]+cw[2]+cw[3], th=rh*T.length, pos=p.statsPos||'Top Right';
      const tx=pos.indexOf('Left')>-1?8:pos.indexOf('Center')>-1?(W-tw)/2:W-tw-8, ty=pos.indexOf('Top')>-1?8:pos.indexOf('Middle')>-1?(H-th)/2:H-th-8;
      cx.fillStyle='rgba(0,0,0,.8)'; cx.fillRect(tx,ty,tw,th); cx.fillStyle='rgba(41,98,255,.3)'; cx.fillRect(tx,ty,tw,rh); cx.strokeStyle='rgba(140,140,140,.4)'; cx.lineWidth=1; cx.strokeRect(tx+.5,ty+.5,tw,th); cx.textAlign='left';
      T.forEach((r,i)=>{ let x=tx; r.forEach((s,j)=>{ let col=W0; const cc=(colr[i]||[])[j]; if(cc===1) col='#4caf50'; else if(cc===0) col='#f23645'; else if(cc===2) col=R0; else if(cc===-1) col=W0; cx.fillStyle=col; cx.fillText(s,x+6,ty+rh*i+rh/2); x+=cw[j]; }); }); }
    cx.restore(); }; }
// alerts: fire once, when the signal / exit candle has closed (the newest closed candle), while the app is open
function nbAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0], KEY={long:'alLong',short:'alShort',exit:'alExit'},
    MSG={long:['ORB+NB LONG: fills at the next bar open','#2e7d32'],short:['ORB+NB SHORT: fills at the next bar open','#c62828'],exit:['ORB+NB EXIT','#37474f']};
  inds.forEach(i=>{ if(i.t!=='orbnb'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},NB_DEF,i.p); let quiet=q; if(i._nbK!==key){ i._nbK=key; i._nbLast={}; quiet=true; }
    const last=i._nbLast||(i._nbLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!P[KEY[e.type]]) return;
      toast(MSG[e.type][0]+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+e.price,MSG[e.type][1]);
      if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _nbRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_nbRE.apply(this,arguments); try{ nbAlerts(q); }catch(e){ console.error('orbnb alerts',e); } return rv; }; }
try{ DESC.orbnb='Opening-range breakout confirmed by a time-of-day Noise Band and VWAP: one trade per session, ATR stop, flat late, with trade boxes and a statistics table'; }catch(e){}
}catch(err){ console.error('nb indicator failed',err); window.__nbErr=err; }

// ---- [ocb] INDICATOR: Opening Candle Breakout [OCB] - port of the Pine v6 script "Opening Candle Breakout [OCB] v1.1" by elpips (MPL 2.0) ----
// The FIRST candle of the session sets the direction (green = LONG, red = SHORT). Entry = its close, stop = its opposite side (clamped by ATR),
// targets T1 / T2 / T3 in R multiples. Weak candles (body smaller than the ATR filter) print a grey "no setup" mark. One setup per day, lines extend
// while the session is open. A small statistics table estimates the result on the candles on the chart (not a backtest). Idea: Zarattini & Aziz (2023).
try{
const OC_DEF={sessFirst:'0930-0935',sessEnd:'1555-1600',sessDay:'0930-1600',tz:'America/New_York',minBodyATR:0.5,atrLen:14,minStopATR:0.10,maxStopATR:2,
  tp1R:2,tp2R:5,tp3R:10,keepDays:5,showLabels:true,showSetups:true,showSkip:true,cLong:'#009988',cShort:'#CC3311',cStop:'#FF0066',cTarget:'#00C853',
  showStats:true,statTP:10,statPos:'Top right',alLong:true,alShort:true,alSkip:false,alClose:false,alSound:false};
const OC_TZ=['America/New_York','America/Chicago','America/Los_Angeles','Europe/London','Europe/Berlin','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Australia/Sydney','UTC'];
function ocSess(s,d){ const m=/^\s*(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})\s*$/.exec(String(s||'')); return m?[(+m[1])*60+(+m[2]),(+m[3])*60+(+m[4])]:d; }
const ocIn=(m,s)=>s[0]<=s[1]?(m>=s[0]&&m<s[1]):(m>=s[0]||m<s[1]);
const ocFm={};
function ocParts(tz,t){ let f=ocFm[tz]; if(f===undefined){ try{ f=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric'}); }catch(e){ f=null; } ocFm[tz]=f; }
  if(!f){ const d=new Date(t*1000); return {key:d.getUTCFullYear()*10000+(d.getUTCMonth()+1)*100+d.getUTCDate(),min:d.getUTCHours()*60+d.getUTCMinutes()}; }
  const q={}; f.formatToParts(new Date(t*1000)).forEach(x=>{ q[x.type]=+x.value; }); return {key:q.year*10000+q.month*100+q.day,min:(q.hour%24)*60+q.minute}; }
function ocIv(c){ let m=0; for(let i=c.length-1;i>0&&i>c.length-40;i--){ const d=c[i].time-c[i-1].time; if(d>0&&(m===0||d<m)) m=d; } return m; }
const ocFR=v=>Number.isInteger(+v)?(+v).toFixed(1):String(+v);
function ocA(hex,a){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
function ocCompute(c,p,iv,forming){
  const N=c.length, D={N,ok:false,msg:'',days:[],sig:[],sk:[],ev:[],st:null};
  if(N<3||!iv) return D;
  const sF=ocSess(p.sessFirst,[570,575]), sE=ocSess(p.sessEnd,[955,960]), sD=ocSess(p.sessDay,[570,960]), wl=((sF[1]-sF[0])%1440+1440)%1440;
  if(iv>=86400){ D.msg='OCB needs an intraday chart (first candle '+p.sessFirst+')'; return D; }
  if(Math.round(iv/60)!==wl){ D.msg='OCB: the first-candle window '+p.sessFirst+' is '+wl+' min - use the '+wl+' minute chart'; return D; }
  const L=Math.max(5,Math.round(+p.atrLen)||14), atr=new Array(N).fill(null); let pc=null,rma=null,sum=0;
  for(let i=0;i<N;i++){ const h=c[i].high,l=c[i].low,tr=pc==null?h-l:Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)); pc=c[i].close;
    if(i<L-1) sum+=tr; else if(i===L-1){ sum+=tr; rma=sum/L; atr[i]=rma; } else { rma=(rma*(L-1)+tr)/L; atr[i]=rma; } }
  const days=D.days; let cur=null, sDir=0,sEntry=NaN,sStop=NaN,sRisk=NaN,pend=false,pDir=0,pStop=NaN,trades=0,wins=0,sumR=0,gw=0,gl=0;
  for(let i=0;i<N;i++){ const b=c[i], q=ocParts(p.tz,b.time), isF=ocIn(q.min,sF), isE=ocIn(q.min,sE), inS=ocIn(q.min,sD), live=forming&&i===N-1;
    let dir=0, stopLv=NaN;
    if(isF&&!live){ const a=atr[i], body=Math.abs(b.close-b.open), bodyOk=p.minBodyATR<=0||(a!=null&&body>=a*p.minBodyATR), lg=b.close>b.open&&bodyOk, sh=b.close<b.open&&bodyOk;
      if(lg||sh){ if(a!=null){ dir=lg?1:-1; const raw=lg?b.close-b.low:b.high-b.close, risk=Math.min(Math.max(raw,a*p.minStopATR),a*p.maxStopATR), e=b.close; stopLv=e-dir*risk;
          cur={i,end:i,time:b.time,day:q.key,dir,entry:e,stop:stopLv,t:[e+dir*risk*p.tp1R,e+dir*risk*p.tp2R,e+dir*risk*p.tp3R]}; days.push(cur);
          D.sig.push({time:b.time,dir}); D.ev.push({type:dir>0?'long':'short',time:b.time,idx:i,price:b.close}); } }
      else { D.sk.push({time:b.time}); D.ev.push({type:'skip',time:b.time,idx:i,price:b.close}); } }
    if(isE&&!live) D.ev.push({type:'close',time:b.time,idx:i,price:b.close});
    if(cur&&inS&&q.key===cur.day&&i>=cur.i) cur.end=i;   // today's lines keep extending while the session is open
    // statistics (estimate): enter at the open of the candle after the signal, stop at the signal stop, target statTP R, else exit at session close
    if(pend){ sDir=pDir; sEntry=b.open; sStop=pStop; sRisk=Math.abs(b.open-pStop); pend=false; }
    if(sDir!==0&&sRisk>0){ const tg=sEntry+sDir*sRisk*p.statTP, hSL=sDir===1?b.low<=sStop:b.high>=sStop, hTP=sDir===1?b.high>=tg:b.low<=tg; let r=null;
      if(hSL) r=-1; else if(hTP) r=+p.statTP; else if(isE) r=sDir*(b.close-sEntry)/sRisk;
      if(r!=null){ trades++; sumR+=r; if(r>0){ wins++; gw+=r; } else gl+=Math.abs(r); sDir=0; } }
    if(dir!==0&&sDir===0){ pend=true; pDir=dir; pStop=stopLv; } }
  D.st={trades,wr:trades>0?100*wins/trades:0,net:sumR,pf:gl>0?gw/gl:0,avg:trades>0?sumR/trades:0}; D.ok=true; return D; }
let ocMem=null;
function ocGet(c,p){ const N=c.length, iv=ocIv(c), forming=N>0&&iv>0&&(c[N-1].time+iv)*1000>Date.now();
  const key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+forming+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(ocMem&&ocMem.k===key) return ocMem.D;
  let D; try{ D=ocCompute(c,p,iv,forming); }catch(e){ console.error('ocb calc failed',e); D={N,ok:false,msg:'',days:[],sig:[],sk:[],ev:[],st:null}; } ocMem={k:key,D}; return D; }
IND.ocb={label:'Opening Candle Breakout [OCB] (elpips)',cat:'Trend',nm:()=>'OCB',p:Object.assign({},OC_DEF),cols:['#009988'],
  fields:[['sessFirst','txt','First session candle (e.g. 0930-0935)'],['sessEnd','txt','Session close (e.g. 1555-1600)'],['sessDay','txt','Trading session - line extension (e.g. 0930-1600)'],['tz','sel','Timezone of the session',{opts:OC_TZ}],
    ['minBodyATR','num','Minimum candle body (x ATR, 0 = off)',{min:0,max:5,step:0.05}],['atrLen','num','ATR period (bars)',{min:5,max:200}],
    ['minStopATR','num','Minimum stop (x ATR)',{min:0.01,max:5,step:0.05}],['maxStopATR','num','Maximum stop (x ATR)',{min:0.25,max:20,step:0.25}],
    ['tp1R','num','Target 1 (R)',{min:0.5,max:100,step:0.5}],['tp2R','num','Target 2 (R)',{min:0.5,max:100,step:0.5}],['tp3R','num','Target 3 (R)',{min:0.5,max:100,step:0.5}],
    ['keepDays','num','Days to display',{min:1,max:30}],['showLabels','chk','Show labels'],['showSetups','chk','Show LONG / SHORT arrows'],['showSkip','chk','Show grey "no setup" marks'],
    ['cLong','col','Long'],['cShort','col','Short'],['cStop','col','Stop'],['cTarget','col','Targets'],
    ['showStats','chk','Show statistics (estimate, not a backtest)'],['statTP','num','Stats exit: target (R), otherwise session close',{min:0.5,max:100,step:0.5}],['statPos','sel','Statistics position',{opts:['Top right','Top left','Bottom right','Bottom left']}],
    ['alLong','chk','Alert on OCB Long'],['alShort','chk','Alert on OCB Short'],['alSkip','chk','Alert on OCB No setup'],['alClose','chk','Alert on OCB session close'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},OC_DEF,p), D=ocGet(c,q), mk=[];
    if(D.ok){ if(q.showSetups) D.sig.forEach(s=>mk.push({time:s.time,position:s.dir>0?'belowBar':'aboveBar',color:s.dir>0?q.cLong:q.cShort,shape:s.dir>0?'arrowUp':'arrowDown',text:'',size:.8,keep:true}));
      if(q.showSkip) D.sk.forEach(s=>mk.push({time:s.time,position:'aboveBar',color:'#9e9e9e',shape:'square',text:'',size:.4,keep:true}));
      mk.sort((a,b)=>a.time-b.time); }
    return {mk,boxes:[{type:'ocbview',pts:[],o:q,D}],labels:[],events:D.ok?D.ev:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='ocbview') return _D.apply(this,arguments);
    const p=d.o, D=d.D; if(!D) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.font='10px system-ui,sans-serif'; cx.textBaseline='middle';
    if(D.ok){ D.days.slice(-Math.max(1,Math.round(p.keepDays))).forEach(z=>{ const x0=X(z.i); let x1=X(z.end); if(x0==null||x1==null) return; x1=Math.max(x1,x0+6);
        const cl=z.dir>0?p.cLong:p.cShort, lv=[[z.entry,cl,2,[],''],[z.stop,p.cStop,2,[],'SL  -1R'],[z.t[0],p.cTarget,1,[5,4],'T1  '+ocFR(p.tp1R)+'R'],[z.t[1],p.cTarget,1,[5,4],'T2  '+ocFR(p.tp2R)+'R'],[z.t[2],p.cTarget,1,[5,4],'T3  '+ocFR(p.tp3R)+'R']];
        lv.forEach(a=>{ const y=Y(a[0]); if(y==null) return; cx.strokeStyle=a[1]; cx.lineWidth=a[2]; cx.setLineDash(a[3]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]);
          if(p.showLabels&&a[4]){ const w=cx.measureText(a[4]).width+8; let lx=x1+3; if(lx+w>W-2) lx=Math.max(2,W-w-2); cx.fillStyle=ocA(a[1],a[1]===p.cStop?.8:.6); cx.fillRect(lx,y-7,w,14); cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText(a[4],lx+4,y); } });
        if(p.showLabels){ const y=Y(z.entry); if(y!=null){ const t=z.dir>0?'LONG':'SHORT', w=cx.measureText(t).width+10, by=z.dir>0?y+4:y-18; cx.fillStyle=cl; cx.fillRect(x0-w/2,by,w,14); cx.fillStyle='#fff'; cx.textAlign='center'; cx.fillText(t,x0,by+7); } } }); }
    if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); }
    if(D.ok&&p.showStats&&D.st){ const S=D.st, rows=[['Trades',String(S.trades)],['Win rate',S.wr.toFixed(1)+' %'],['Net R',S.net.toFixed(1)],['Profit factor',S.pf.toFixed(2)],['Avg R / trade',S.avg.toFixed(2)],['Exit',ocFR(p.statTP)+'R or session close']];
      cx.font='11px system-ui,sans-serif'; const rh=17; let w0=cx.measureText('OCB \u00b7 estimate').width, w1=cx.measureText('not a backtest').width;
      rows.forEach(r=>{ w0=Math.max(w0,cx.measureText(r[0]).width); w1=Math.max(w1,cx.measureText(r[1]).width); }); w0+=12; w1+=12; const tw=w0+w1, th=rh*(rows.length+1), pos=p.statPos||'Top right';
      const tx=pos.indexOf('left')>-1?8:W-tw-8, ty=pos.indexOf('Top')>-1?8:H-th-8;
      cx.fillStyle='rgba(0,0,0,.72)'; cx.fillRect(tx,ty,tw,th); cx.fillStyle='rgba(41,98,255,.4)'; cx.fillRect(tx,ty,tw,rh); cx.strokeStyle='rgba(140,140,140,.35)'; cx.lineWidth=1; cx.strokeRect(tx+.5,ty+.5,tw,th);
      cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText('OCB \u00b7 estimate',tx+6,ty+rh/2); cx.font='9px system-ui,sans-serif'; cx.fillText('not a backtest',tx+w0+6,ty+rh/2); cx.font='11px system-ui,sans-serif';
      rows.forEach((r,k)=>{ const y=ty+rh*(k+1)+rh/2; cx.fillStyle='#fff'; cx.fillText(r[0],tx+6,y); cx.fillText(r[1],tx+w0+6,y); }); }
    cx.restore(); }; }
// alerts: fire once, when the event candle has closed (the newest closed candle), while the app is open
function ocAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0], KEY={long:'alLong',short:'alShort',skip:'alSkip',close:'alClose'},
    MSG={long:['OCB LONG','#2e7d32'],short:['OCB SHORT','#c62828'],skip:['OCB no setup today','#546e7a'],close:['OCB session close','#37474f']};
  inds.forEach(i=>{ if(i.t!=='ocb'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},OC_DEF,i.p); let quiet=q; if(i._ocK!==key){ i._ocK=key; i._ocLast={}; quiet=true; }
    const last=i._ocLast||(i._ocLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!P[KEY[e.type]]) return;
      toast(MSG[e.type][0]+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 Close '+e.price,MSG[e.type][1]);
      if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _ocRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_ocRE.apply(this,arguments); try{ ocAlerts(q); }catch(e){ console.error('ocb alerts',e); } return rv; }; }
try{ DESC.ocb='First candle of the session sets the direction: entry at its close, stop at its opposite side, targets at 2R / 5R / 10R, plus a small statistics table'; }catch(e){}
}catch(err){ console.error('ocb indicator failed',err); window.__ocbErr=err; }

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

// ---- [xlb] PREMIUM STRATEGY · "Buy/Sell Signals XL"  - port of the TradingView Pine v6 indicator "Buy/Sell Signals XL" (self-contained: every name starts with xl / XL) =================
try{
// Category: Premium Strategy.  Registered as IND.xlb with the same extras() / draw hook / alerts hook pattern as % Retest Buy & Sell.
// SIX SIGNAL ENGINES (one runs on the chart, all six run in the Engine Scanner):  OC · Breakout · Donchian · MA Cross · Supertrend · Aroon
// Every engine has its own stop loss / take profit settings, the shared Enable SL/TP, Exit trigger and ATR length, trade lines, zones, exit X, lookback P/L info box,
// a multi-timeframe scanner, an engine scanner and alerts.  Scanners use Binance candles of each scanned time frame and read CLOSED candles only.
// NON-REPAINT (same three modes as the original): Entries + Exits / Entries Only / Off.
/*XL-ENGINE-BEGIN*/
const XL_NAME='Buy/Sell Signals XL';
const XL_MODES=['OC','Breakout','Donchian','MA Cross','Supertrend','Aroon'];
const XL_POS=['Top Left','Top Center','Top Right','Middle Left','Middle Center','Middle Right','Bottom Left','Bottom Center','Bottom Right'];
const XL_SZ5=['Tiny','Small','Normal','Large','Huge'];
const XL_DET=['Micro','Low','Medium','High','Maximum'];
const XL_TP3=['ATR target','SL multiple','Opposite signal'];
const XL_DEF={
  mode:'OC', nrMode:'Entries + Exits',
  // OC
  bodyLen:50, bodyMult:3, ocVol:0, ocAlt:true, ocNoOvl:true, ocSlMode:'Candle wick', ocSlBuf:0, ocTpMode:'SL multiple', ocSlMult:1.5, ocTpMult:3, ocTpRMult:1,
  // Breakout
  baseMode:'Variable', baseLen:10, varMin:5, varMax:30, baseMult:2, brkMode:'Bar Close (Edge)', minBreak:0, brkVol:0, brkVolLen:50, brkTrend:false, brkTrendLen:200, brkShowTrend:false, brkEmaCol:'#ff9800',
  brkAlt:true, brkNoOvl:true, noBaseInTrade:true, brkShowBase:true, brkSlMode:'Base edge', brkSlBuf:0, brkTpMode:'Base height', brkSlMult:1.5, brkTpMult:3, brkTpRMult:2, brkTpBMult:1,
  // Donchian
  donLen:20, donEntMode:'Bar Close (Edge)', donVol:0, donAlt:true, donNoOvl:true, donShowChan:true, donChanCol:'#787b86', donShade:true, donShowMid:true,
  donSlMode:'Channel opposite', donSlBuf:0, donTpMode:'SL multiple', donSlMult:2, donTpMult:3, donTpRMult:.5,
  // MA Cross
  fastLen:9, slowLen:21, maType:'EMA', maSrc:'Close', minSep:0, maTrend:false, maTrendLen:200, maEntMode:'Bar Close (Edge)', maVol:0, maAlt:false, maNoOvl:true,
  maShowMAs:true, maFastCol:'#ff9800', maSlowCol:'#9c27b0', maShowFill:true, maTrendCol:'#787b86', maSlMode:'ATR', swingLen:5, maSlBuf:0, slMin:1, maTpMode:'SL multiple', maSlMult:2, maTpMult:3, maTpRMult:1,
  // Supertrend
  stLen:10, stMult:3, stEntMode:'Bar Close (Entry)', stNoOvl:true, stShowLine:true, stSlMode:'Supertrend line', stSlBuf:0, stTpMode:'SL multiple', stSlMult:1.5, stTpMult:3, stTpRMult:.5,
  // Aroon
  arLen:14, arSigMode:'Crossover', arStrong:70, arSm:'None', arSmLen:3, arVol:0, arVolLen:50, arAlt:true, arNoOvl:true, arSlMode:'ATR', arSlBuf:0, arTpMode:'SL multiple', arSlMult:1.5, arTpMult:3, arTpRMult:1,
  // shared stop loss / take profit
  useRisk:true, exitMode:'Wick', atrLen:14,
  // lookback P/L + info box
  lookback:20, showTable:false, tablePos:'Top Right', tableSize:'Small', showClosed:0,
  // scanners
  showScan:false, scTfList:'5m, 15m, 30m, 1h, 4h, 1d', scMax:6, scPos:'Top Center', scSize:'Small', scDetail:'High',
  showEng:false, engPos:'Bottom Center', engSize:'Small', engDetail:'Low',
  // display
  showLabels:true, lblSize:'Small', buyCol:'#4caf50', sellCol:'#f23645', showEntryMark:true, entryMarkCol:'#2962ff', showAvgDot:true, avgDotCol:'#ffb300', avgDotSize:'Large',
  showTradeLines:true, entryCol:'#2962ff', slCol:'#f23645', tpCol:'#4caf50', showTradeLbl:true, showX:true, xCol:'#2962ff', showZone:true, slZoneCol:'#f23645', tpZoneCol:'#4caf50', lineW:1,
  // alerts
  alBuy:true, alSell:true, alExit:true, alScan:true, alAll:false, alSound:false,
  inputsStatus:false, valuesStatus:true };
const XL_NUM={bodyLen:[1,1000,1],bodyMult:[0,100],ocVol:[0,100],ocSlBuf:[0,20],ocSlMult:[.1,50],ocTpMult:[.1,100],ocTpRMult:[.1,100],
  baseLen:[3,500,1],varMin:[3,200,1],varMax:[3,200,1],baseMult:[.1,50],minBreak:[0,20],brkVol:[0,100],brkVolLen:[1,1000,1],brkTrendLen:[2,1000,1],brkSlBuf:[0,20],brkSlMult:[.1,50],brkTpMult:[.1,100],brkTpRMult:[.1,100],brkTpBMult:[.1,100],
  donLen:[2,500,1],donVol:[0,100],donSlBuf:[0,20],donSlMult:[.1,50],donTpMult:[.1,100],donTpRMult:[.1,100],
  fastLen:[1,500,1],slowLen:[2,1000,1],minSep:[0,20],maTrendLen:[2,1000,1],maVol:[0,100],swingLen:[1,200,1],maSlBuf:[0,20],slMin:[0,20],maSlMult:[.1,50],maTpMult:[.1,100],maTpRMult:[.1,100],
  stLen:[1,200,1],stMult:[.1,50],stSlBuf:[0,20],stSlMult:[.1,50],stTpMult:[.1,100],stTpRMult:[.1,100],
  arLen:[2,500,1],arStrong:[50,100],arSmLen:[1,200,1],arVol:[0,100],arVolLen:[1,1000,1],arSlBuf:[0,20],arSlMult:[.1,50],arTpMult:[.1,100],arTpRMult:[.1,100],
  atrLen:[1,500,1],lookback:[1,500,1],showClosed:[0,50,1],scMax:[1,12,1],lineW:[1,4,1]};
const XL_OPT={mode:XL_MODES,nrMode:['Entries + Exits','Entries Only','Off'],baseMode:['Fixed','Variable'],brkMode:['Bar Close (Edge)','Bar Close (Entry)','Bar Wick (Edge)'],
  donEntMode:['Bar Close (Entry)','Bar Close (Edge)'],maEntMode:['Bar Close (Entry)','Bar Close (Edge)'],stEntMode:['Bar Close (Entry)','Bar Close (Edge)'],
  maType:['SMA','EMA','WMA','HMA','RMA'],maSrc:['Close','Open','High','Low','HL2','HLC3','OHLC4'],arSigMode:['Crossover','Strong trend'],arSm:['None','SMA','EMA','RMA','WMA','HMA'],
  ocSlMode:['ATR','Candle wick','Candle body','None'],ocTpMode:XL_TP3,brkSlMode:['ATR','Base edge'],brkTpMode:['ATR target','SL multiple','Base height'],
  donSlMode:['ATR','Channel opposite','Channel middle','Candle wick','Candle body','None'],donTpMode:XL_TP3,maSlMode:['ATR','Swing','Candle wick','Candle body','None'],maTpMode:XL_TP3,
  stSlMode:['Supertrend line','ATR','Candle wick','Candle body','None'],stTpMode:XL_TP3,arSlMode:['ATR','Aroon extreme','Candle wick','Candle body','None'],arTpMode:XL_TP3,
  exitMode:['Wick','Close'],tablePos:XL_POS,tableSize:XL_SZ5,scPos:XL_POS,scSize:XL_SZ5,scDetail:XL_DET,engPos:XL_POS,engSize:XL_SZ5,engDetail:XL_DET,lblSize:XL_SZ5,avgDotSize:XL_SZ5};
function xlNorm(p){ const o=Object.assign({},XL_DEF,p||{});
  for(const k in XL_NUM){ const r=XL_NUM[k]; let v=+o[k]; if(!isFinite(v)) v=XL_DEF[k]; v=Math.min(r[1],Math.max(r[0],v)); o[k]=r[2]?Math.round(v):v; }
  for(const k in XL_OPT){ if(XL_OPT[k].indexOf(o[k])<0) o[k]=XL_DEF[k]; }
  o.varMax=Math.max(o.varMax,o.varMin); return o; }

// ---------- [xlb] maths (Pine-compatible: SMA seeded EMA / RMA, NaN-safe) ----------
const xlN=v=>typeof v==='number'&&isFinite(v);
function xSma(a,n){ const N=a.length,o=new Array(N).fill(NaN); let s=0,bad=0; for(let i=0;i<N;i++){ const x=a[i]; if(xlN(x)) s+=x; else bad++; if(i>=n){ const y=a[i-n]; if(xlN(y)) s-=y; else bad--; } if(i>=n-1&&bad===0) o[i]=s/n; } return o; }
function xEma(a,n,rma){ const N=a.length,o=new Array(N).fill(NaN), k=rma?1/n:2/(n+1), sm=xSma(a,n); let p=NaN; for(let i=0;i<N;i++){ const x=a[i]; if(!xlN(x)){ p=NaN; continue; } if(!xlN(p)){ p=sm[i]; if(!xlN(p)) continue; } else p=k*x+(1-k)*p; o[i]=p; } return o; }
function xWma(a,n){ const N=a.length,o=new Array(N).fill(NaN), d=n*(n+1)/2; for(let i=n-1;i<N;i++){ let s=0,ok=true; for(let j=0;j<n;j++){ const x=a[i-n+1+j]; if(!xlN(x)){ ok=false; break; } s+=x*(j+1); } if(ok) o[i]=s/d; } return o; }
function xHma(a,n){ const h=xWma(a,Math.max(1,Math.floor(n/2))), f=xWma(a,n), d=a.map((_,i)=>xlN(h[i])&&xlN(f[i])?2*h[i]-f[i]:NaN); return xWma(d,Math.max(1,Math.floor(Math.sqrt(n)))); }
function xMa(a,n,t){ return t==='SMA'?xSma(a,n):t==='WMA'?xWma(a,n):t==='HMA'?xHma(a,n):t==='RMA'?xEma(a,n,true):xEma(a,n,false); }
function xAtr(h,l,c,n){ const N=c.length,tr=new Array(N); for(let i=0;i<N;i++) tr[i]=i?Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])):h[i]-l[i]; return xEma(tr,n,true); }
function xHL(a,n,hi){ const N=a.length,o=new Array(N).fill(NaN); for(let i=n-1;i<N;i++){ let m=a[i]; for(let j=i-n+1;j<i;j++){ const x=a[j]; if(hi?x>m:x<m) m=x; } o[i]=m; } return o; }
function xSuper(h,l,c,len,mult){ const N=c.length, atr=xAtr(h,l,c,len), st=new Array(N).fill(NaN), dr=new Array(N).fill(NaN); let fl=NaN,fu=NaN,sp=NaN;
  for(let i=0;i<N;i++){ const a=atr[i], src=(h[i]+l[i])/2; let up=src+mult*a, lo=src-mult*a; const pl=xlN(fl)?fl:0, pu=xlN(fu)?fu:0, c1=i?c[i-1]:NaN;
    lo=(lo>pl||c1<pl)?lo:pl; up=(up<pu||c1>pu)?up:pu; let d; if(!i||!xlN(atr[i-1])) d=1; else if(sp===pu) d=c[i]>up?-1:1; else d=c[i]<lo?1:-1;
    const s=d===-1?lo:up; st[i]=s; dr[i]=d; fl=lo; fu=up; sp=s; }
  return {st,dr}; }
function xSrc(x,s){ return s==='Open'?x.open:s==='High'?x.high:s==='Low'?x.low:s==='HL2'?(x.high+x.low)/2:s==='HLC3'?(x.high+x.low+x.close)/3:s==='OHLC4'?(x.open+x.high+x.low+x.close)/4:x.close; }
const xClamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const xNz=(v,d)=>xlN(v)?v:d;
function xVarBase(h,l,i,minLen,capLen,cap){ let bHi=NaN,bLo=NaN,bN=0; if(i<1) return [bHi,bLo,bN]; let rHi=h[i-1],rLo=l[i-1]; const lim=Math.min(capLen,i);
  if(lim>=minLen&&xlN(cap)){ for(let k=1;k<=lim;k++){ rHi=Math.max(rHi,h[i-k]); rLo=Math.min(rLo,l[i-k]); if(rHi-rLo>cap) break; if(k>=minLen){ bHi=rHi; bLo=rLo; bN=k; } } }
  return [bHi,bLo,bN]; }

// ---------- [xlb] the engine: one engine (0 OC, 1 Breakout, 2 Donchian, 3 MA Cross, 4 Supertrend, 5 Aroon) over a candle array ----------
// opt.closedOnly: ignore the forming (last) candle.   opt.nr: Non-repaint mode.   opt.tfSec: seconds per candle (market time).
function xlEngine(c,m,P,opt){
  opt=opt||{}; const N=c.length, nUse=opt.closedOnly?Math.max(0,N-1):N, nr=opt.nr||'Entries + Exits', tfSec=opt.tfSec||60;
  const R={sigs:[],trades:[],cur:null,bases:[],gaps:[],gapsM:[],P,m,N,nUse,vis:{},slAtrX:NaN,lastSigTime:null,lastSigIdx:-1,tfSec};
  if(nUse<3) return R;
  const isOC=m===0,isBrk=m===1,isDon=m===2,isMA=m===3,isST=m===4,isAr=m===5;
  const A=a=>a[m];
  const slSel=A([P.ocSlMode,P.brkSlMode,P.donSlMode,P.maSlMode,P.stSlMode,P.arSlMode]), tpSel=A([P.ocTpMode,P.brkTpMode,P.donTpMode,P.maTpMode,P.stTpMode,P.arTpMode]);
  const slBuf=A([P.ocSlBuf,P.brkSlBuf,P.donSlBuf,P.maSlBuf,P.stSlBuf,P.arSlBuf]), slMult=A([P.ocSlMult,P.brkSlMult,P.donSlMult,P.maSlMult,P.stSlMult,P.arSlMult]);
  const tpMult=A([P.ocTpMult,P.brkTpMult,P.donTpMult,P.maTpMult,P.stTpMult,P.arTpMult]), tpRMult=A([P.ocTpRMult,P.brkTpRMult,P.donTpRMult,P.maTpRMult,P.stTpRMult,P.arTpRMult]);
  const alternate=A([P.ocAlt,P.brkAlt,P.donAlt,P.maAlt,false,P.arAlt]), noOverlap=A([P.ocNoOvl,P.brkNoOvl,P.donNoOvl,P.maNoOvl,P.stNoOvl,P.arNoOvl]);
  const slAtrM=slSel==='ATR', slWick=slSel==='Candle wick', slBody=slSel==='Candle body', slEdge=slSel==='Base edge', slOpp=slSel==='Channel opposite', slMid=slSel==='Channel middle', slSwing=slSel==='Swing', slStl=slSel==='Supertrend line', slAroon=slSel==='Aroon extreme';
  const tpAtr=tpSel==='ATR target', tpBase=tpSel==='Base height', tpOpp=tpSel==='Opposite signal', tpRisk=tpSel==='SL multiple';
  const hasSl=slSel!=='None', hasTp=!tpOpp&&!(tpRisk&&!hasSl), riskOn=P.useRisk&&(hasSl||hasTp), bothExits=hasSl&&hasTp, exitOnClose=P.exitMode==='Close';
  const exitLive=nr==='Off'||(nr==='Entries Only'&&!exitOnClose);
  R.hasSl=hasSl; R.hasTp=hasTp; R.riskOn=riskOn; R.slSel=slSel; R.tpSel=tpSel; R.alternate=alternate; R.noOverlap=noOverlap; R.slMult=slMult; R.tpMult=tpMult; R.tpRMult=tpRMult;
  const o=new Array(N),h=new Array(N),l=new Array(N),cl=new Array(N),vo=new Array(N),tm=new Array(N);
  for(let i=0;i<N;i++){ const x=c[i]; o[i]=x.open; h[i]=x.high; l[i]=x.low; cl[i]=x.close; vo[i]=x.volume||0; tm[i]=x.time; }
  const atr=xAtr(h,l,cl,P.atrLen), nanA=()=>new Array(N).fill(NaN);
  // ----- series for the selected engine -----
  let rawBull=null,rawBear=null, upB,loB,midB, fast,slow,trend, swLo,swHi, stLine,stDir, arUp,arDn,arHi,arLo, emaT, fixHi,fixLo, bodyAvg,volAvg;
  const volOk=(mult,avg,i)=>mult<=0||(xlN(avg[i])&&vo[i]>=avg[i]*mult);
  if(isOC){ const body=cl.map((x,i)=>Math.abs(x-o[i])); bodyAvg=xSma(body,P.bodyLen); volAvg=xSma(vo,P.bodyLen); rawBull=i=>cl[i]>o[i]&&i>0&&cl[i]>Math.max(o[i-1],cl[i-1])&&body[i]>=bodyAvg[i]*P.bodyMult&&(P.ocVol<=0||vo[i]>=volAvg[i]*P.ocVol);
    rawBear=i=>cl[i]<o[i]&&i>0&&cl[i]<Math.min(o[i-1],cl[i-1])&&body[i]>=bodyAvg[i]*P.bodyMult&&(P.ocVol<=0||vo[i]>=volAvg[i]*P.ocVol); }
  else if(isDon){ const hh=xHL(h,P.donLen,true), ll=xHL(l,P.donLen,false); upB=nanA(); loB=nanA(); midB=nanA(); for(let i=1;i<N;i++){ upB[i]=hh[i-1]; loB[i]=ll[i-1]; midB[i]=(upB[i]+loB[i])/2; } volAvg=xSma(vo,P.donLen);
    rawBull=i=>cl[i]>upB[i]&&(P.donVol<=0||vo[i]>=volAvg[i]*P.donVol); rawBear=i=>cl[i]<loB[i]&&(P.donVol<=0||vo[i]>=volAvg[i]*P.donVol); }
  else if(isMA){ const px=c.map(x=>xSrc(x,P.maSrc)); fast=xMa(px,P.fastLen,P.maType); slow=xMa(px,P.slowLen,P.maType); trend=P.maTrend?xMa(px,P.maTrendLen,P.maType):nanA(); volAvg=xSma(vo,P.slowLen); swLo=xHL(l,P.swingLen,false); swHi=xHL(h,P.swingLen,true);
    const sepOk=i=>P.minSep<=0||(xlN(atr[i])&&Math.abs(fast[i]-slow[i])>=atr[i]*P.minSep), vOk=i=>P.maVol<=0||vo[i]>=volAvg[i]*P.maVol;
    rawBull=i=>i>0&&fast[i]>slow[i]&&fast[i-1]<=slow[i-1]&&vOk(i)&&sepOk(i)&&(!P.maTrend||cl[i]>trend[i]);
    rawBear=i=>i>0&&fast[i]<slow[i]&&fast[i-1]>=slow[i-1]&&vOk(i)&&sepOk(i)&&(!P.maTrend||cl[i]<trend[i]); }
  else if(isST){ const s=xSuper(h,l,cl,P.stLen,P.stMult); stLine=s.st; stDir=s.dr; rawBull=i=>i>0&&stDir[i]<0&&stDir[i-1]>0; rawBear=i=>i>0&&stDir[i]>0&&stDir[i-1]<0; }
  else if(isAr){ const L=P.arLen, u=nanA(), d=nanA(); for(let i=L;i<N;i++){ let bh=i-L,bl=i-L; for(let j=i-L;j<=i;j++){ if(h[j]>=h[bh]) bh=j; if(l[j]<=l[bl]) bl=j; } u[i]=100*(L+(bh-i))/L; d[i]=100*(L+(bl-i))/L; }
    const sm=P.arSm==='None'?(a=>a):(a=>xMa(a,P.arSm==='HMA'?Math.max(P.arSmLen,2):P.arSmLen,P.arSm)); arUp=sm(u); arDn=sm(d); arHi=xHL(h,L,true); arLo=xHL(l,L,false); volAvg=xSma(vo,P.arVolLen);
    const sB=i=>arUp[i]>=P.arStrong&&arDn[i]<=100-P.arStrong, sS=i=>arDn[i]>=P.arStrong&&arUp[i]<=100-P.arStrong, vOk=i=>P.arVol<=0||vo[i]>=volAvg[i]*P.arVol;
    rawBull=i=>i>0&&(P.arSigMode==='Crossover'?(arUp[i]>arDn[i]&&arUp[i-1]<=arDn[i-1]):(sB(i)&&!sB(i-1)))&&vOk(i);
    rawBear=i=>i>0&&(P.arSigMode==='Crossover'?(arDn[i]>arUp[i]&&arDn[i-1]<=arUp[i-1]):(sS(i)&&!sS(i-1)))&&vOk(i); }
  else { // Breakout: the base depends on trade state, so it is worked out inside the loop
    const hh=xHL(h,P.baseLen,true), ll=xHL(l,P.baseLen,false); fixHi=nanA(); fixLo=nanA(); for(let i=1;i<N;i++){ fixHi[i]=hh[i-1]; fixLo[i]=ll[i-1]; }
    emaT=xEma(cl,P.brkTrendLen,false); volAvg=xSma(vo,P.brkVolLen); }
  R.vis={atr,upB,loB,midB,fast,slow,trend,stLine,stDir,emaT,arUp,arDn};
  R.hi=h; R.lo=l;
  const isVar=isBrk&&P.baseMode==='Variable', wickMode=P.brkMode==='Bar Wick (Edge)', edgeEntry=P.brkMode!=='Bar Close (Entry)';
  const donEdge=P.donEntMode==='Bar Close (Edge)', maEdge=P.maEntMode==='Bar Close (Edge)', stEdge=P.stEntMode==='Bar Close (Edge)';
  // ----- trade state -----
  let dir=0,inTrade=false,lastSigBar=null,lastExitBar=null,lastSigTime=null,mktSigBar=-1,cur=null; const durs=[],dursM=[];
  const closeTrade=(i,exitPx,reason)=>{ const t=cur, pnl=t.dir===1?(exitPx-t.entry)/t.entry*100:(t.entry-exitPx)/t.entry*100;
    t.i1=i; t.exit=exitPx; t.reason=reason; t.pnl=pnl; R.trades.push(t); durs.push((tm[i]-t.t0)*1000); dursM.push((i-t.i0)*tfSec*1000); cur=null; };
  for(let i=0;i<nUse;i++){
    const last=i===N-1, conf=!last||nr==='Off', exConf=!last||exitLive, a=atr[i];
    // base (Breakout)
    let consHi=NaN,consLo=NaN,baseN=0,isBase=false,brkBuf=xlN(a)?P.minBreak*a:0;
    if(isBrk){ if(isVar){ let cap=Math.max(P.varMax,P.varMin); if(lastSigBar!==null) cap=Math.min(cap,i-lastSigBar-1);
        if(P.noBaseInTrade&&riskOn) cap=inTrade?0:(lastExitBar===null?cap:Math.min(cap,i-lastExitBar-1));
        const vb=xVarBase(h,l,i,P.varMin,cap,a*P.baseMult); consHi=vb[0]; consLo=vb[1]; baseN=vb[2]; isBase=baseN>0; }
      else { consHi=fixHi[i]; consLo=fixLo[i]; baseN=P.baseLen; isBase=(consHi-consLo)<=a*P.baseMult; } }
    // raw signal
    let rb=false,rs=false;
    if(isBrk){ const fresh=isVar||((lastSigBar===null||i-lastSigBar>P.baseLen)&&(!(P.noBaseInTrade&&riskOn)||(!inTrade&&(lastExitBar===null||i-lastExitBar>P.baseLen))));
      const up=(wickMode?h[i]:cl[i])>consHi+brkBuf, dn=(wickMode?l[i]:cl[i])<consLo-brkBuf, both=up&&dn, vOk=P.brkVol<=0||(xlN(volAvg[i])&&vo[i]>=volAvg[i]*P.brkVol);
      rb=isBase&&fresh&&up&&(!both||cl[i]>o[i])&&(!P.brkTrend||cl[i]>emaT[i])&&vOk; rs=isBase&&fresh&&dn&&(!both||cl[i]<o[i])&&(!P.brkTrend||cl[i]<emaT[i])&&vOk; }
    else { rb=!!rawBull(i); rs=!!rawBear(i); }
    // entry and stop for each direction
    const bufD=xlN(a)?slBuf*a:0, minD=isMA&&xlN(a)?P.slMin*a:0;
    const maEntry=xClamp(xNz(isMA?slow[i]:NaN,cl[i]),l[i],h[i]), stEntry=xClamp(xNz(isST&&i?stLine[i-1]:NaN,cl[i]),l[i],h[i]);
    const entBuy=isBrk?(edgeEntry?consHi+brkBuf:cl[i]):isDon?(donEdge?xNz(upB[i],cl[i]):cl[i]):isMA?(maEdge?maEntry:cl[i]):isST?(stEdge?stEntry:cl[i]):cl[i];
    const entSell=isBrk?(edgeEntry?consLo-brkBuf:cl[i]):isDon?(donEdge?xNz(loB[i],cl[i]):cl[i]):isMA?(maEdge?maEntry:cl[i]):isST?(stEdge?stEntry:cl[i]):cl[i];
    const lvB=slWick?l[i]-bufD:slBody?o[i]-bufD:slSwing?swLo[i]-bufD:slEdge?consLo-bufD:slOpp?xNz(loB&&loB[i],l[i])-bufD:slMid?xNz(midB&&midB[i],entBuy)-bufD:slStl?stLine[i]-bufD:slAroon?arLo[i]-bufD:NaN;
    const lvS=slWick?h[i]+bufD:slBody?o[i]+bufD:slSwing?swHi[i]+bufD:slEdge?consHi+bufD:slOpp?xNz(upB&&upB[i],h[i])+bufD:slMid?xNz(midB&&midB[i],entSell)+bufD:slStl?stLine[i]+bufD:slAroon?arHi[i]+bufD:NaN;
    const slB=!hasSl?NaN:slAtrM?entBuy-a*slMult:isMA?Math.min(lvB,entBuy-minD):lvB, slS=!hasSl?NaN:slAtrM?entSell+a*slMult:isMA?Math.max(lvS,entSell+minD):lvS;
    const needStop=P.useRisk&&hasSl, okB=!isBrk||!needStop||(xlN(slB)&&slB<entBuy), okS=!isBrk||!needStop||(xlN(slS)&&slS>entSell);
    // Supertrend only: a flip on the very bar the open trade is stopped / targeted still fires
    const slTouch=()=>hasSl&&(exitOnClose?(dir===1?cl[i]<=cur.sl:cl[i]>=cur.sl):(dir===1?l[i]<=cur.sl:h[i]>=cur.sl));
    const tpTouch=()=>hasTp&&(exitOnClose?(dir===1?cl[i]>=cur.tp:cl[i]<=cur.tp):(dir===1?h[i]>=cur.tp:l[i]<=cur.tp));
    let stSlPre=false,stTpPre=false; if(isST&&P.useRisk&&inTrade&&exConf){ stSlPre=slTouch(); stTpPre=!stSlPre&&tpTouch(); }
    const blk=noOverlap&&riskOn&&inTrade&&!(stSlPre||stTpPre);
    const buy=conf&&rb&&!(blk&&(bothExits||dir===1))&&(!alternate||dir!==1)&&okB, sell=conf&&rs&&!(blk&&(bothExits||dir===-1))&&(!alternate||dir!==-1)&&okS;
    // 1) SL / TP exit check on the open trade (SL first when both are touched on the same bar)
    if(P.useRisk&&inTrade&&exConf){ const sh=slTouch(), th=!sh&&tpTouch();
      if(sh||th){ closeTrade(i,exitOnClose?cl[i]:(sh?cur.sl:cur.tp),sh?-1:1); inTrade=false; lastExitBar=i; } }
    // 2) new signal: close the open trade (reversal) and open the new one
    if(buy||sell){
      if(lastSigTime!==null){ R.gaps.push((tm[i]-lastSigTime)*1000); R.gapsM.push((i-mktSigBar)*tfSec*1000); }
      lastSigTime=tm[i]; mktSigBar=i;
      if(inTrade){ closeTrade(i,cl[i],0); }
      dir=buy?1:-1; lastSigBar=i; inTrade=true;
      const entry=dir===1?entBuy:entSell, sl=!hasSl?NaN:dir===1?slB:slS, riskDist=Math.abs(entry-sl);
      R.slAtrX=hasSl&&!slAtrM&&a>0?riskDist/a:NaN;
      const tpDist=tpAtr?a*tpMult:tpBase?(consHi-consLo)*P.brkTpBMult:riskDist*tpRMult, tp=!hasTp?NaN:dir===1?entry+tpDist:entry-tpDist;
      let avgBars=0; if(dursM.length){ const k=dursM.slice(-P.lookback); let s=0; k.forEach(x=>s+=x); avgBars=Math.min(499,Math.max(1,Math.round(s/k.length/(tfSec*1000)))); }
      cur={i0:i,t0:tm[i],dir,entry,sl,tp,i1:-1,exit:NaN,reason:null,pnl:NaN,avgBars,baseHi:consHi,baseLo:consLo,baseN};
      R.sigs.push({i,time:tm[i],dir,entry,sl,tp}); R.lastSigIdx=i;
      if(isBrk&&P.brkShowBase) R.bases.push({i0:i-baseN,i1:i,hi:consHi,lo:consLo,dir}); } }
  R.cur=cur; R.lastSigTime=lastSigTime; R.mktSigBar=mktSigBar; R.durs=durs; R.dursM=dursM; R.tm=tm; R.cl=cl; R.ok=true;
  return R; }

// ---------- [xlb] lookback statistics over the last N closed trades (compounded, same as the info box) ----------
function xlStats(R,P,nowClose,nowTime,lastIdx){
  const n0=R.trades.length, tr=R.trades.slice(Math.max(0,n0-P.lookback)), n=tr.length, S={n,tp:0,sl:0,rev:0,win:0,loss:0,winSum:0,lossSum:0,net:NaN,wr:NaN,avgWin:NaN,avgLoss:NaN,dd:0,avgP:NaN,openPnl:NaN};
  let eq=1,pk=1,sum=0; tr.forEach(t=>{ if(t.reason===1) S.tp++; else if(t.reason===-1) S.sl++; else S.rev++; if(t.pnl>0){ S.win++; S.winSum+=t.pnl; } else if(t.pnl<0){ S.loss++; S.lossSum+=t.pnl; }
    eq*=1+t.pnl/100; pk=Math.max(pk,eq); S.dd=Math.min(S.dd,(eq/pk-1)*100); sum+=t.pnl; });
  if(n){ S.net=(eq-1)*100; S.wr=S.win/n*100; S.avgP=sum/n; } if(S.win) S.avgWin=S.winSum/S.win; if(S.loss) S.avgLoss=S.lossSum/S.loss;
  const avg=a=>{ const k=a.slice(-P.lookback); if(!k.length) return NaN; let s=0; k.forEach(x=>s+=x); return s/k.length; };
  S.avgGap=avg(R.gaps); S.avgGapM=avg(R.gapsM); S.avgDur=avg(R.durs); S.avgDurM=avg(R.dursM);
  const t=R.cur; if(t&&xlN(nowClose)) S.openPnl=t.dir===1?(nowClose-t.entry)/t.entry*100:(t.entry-nowClose)/t.entry*100;
  if(t&&nowTime!=null){ S.inMs=(nowTime-t.t0)*1000; S.inMsM=(lastIdx-t.i0)*R.tfSec*1000; }
  if(R.lastSigTime!=null&&nowTime!=null){ S.sinceMs=(nowTime-R.lastSigTime)*1000; S.sinceMsM=(lastIdx-R.mktSigBar)*R.tfSec*1000; }
  return S; }
// summary of one engine on one time frame (scanners: closed candles only, state as of the last closed candle)
function xlSummary(R,P){ const lt=R.cur||R.trades[R.trades.length-1], lastIdx=R.nUse-1, nowC=R.cl?R.cl[lastIdx]:NaN, nowT=R.tm?R.tm[lastIdx]:null, S=xlStats(R,P,nowC,nowT,lastIdx), lc=R.trades[R.trades.length-1];
  return {dir:lt?lt.dir:0,stat:R.cur?1:(lc?(lc.reason===1?2:lc.reason===-1?3:0):0),entry:lt?lt.entry:NaN,sl:lt?lt.sl:NaN,tp:lt?lt.tp:NaN,isNew:R.lastSigIdx===lastIdx,px:nowC,
    avgGap:S.avgGap,net:S.net,win:S.win,loss:S.loss,n:S.n,avgP:S.avgP,openPnl:S.openPnl,sigTime:R.lastSigTime,dd:S.dd,nowT}; }
/*XL-ENGINE-END*/

// ---------- [xlb] scanner data: Binance klines per scanned time frame (one request each, shared by both scanners, refreshed every 30 s) ----------
const XL_IVS=['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M'];
const XL_IVSEC={'1m':60,'3m':180,'5m':300,'15m':900,'30m':1800,'1h':3600,'2h':7200,'4h':14400,'6h':21600,'8h':28800,'12h':43200,'1d':86400,'3d':259200,'1w':604800,'1M':2592000};
const xlK={};
function xlLoad(sy,iv){ const key=sy+'|'+iv; let d=xlK[key]; if(!d) d=xlK[key]={rows:null,ts:0,busy:false,err:false,sum:{}}; if(d.busy) return d;
  if(d.rows&&Date.now()-d.ts<30000) return d; if(d.err&&Date.now()-d.ts<15000) return d; d.busy=true;
  fetch(`${RB(sy)}/klines?symbol=${sy}&interval=${iv}&limit=1000`).then(r=>r.json()).then(a=>{ if(!Array.isArray(a)||!a.length) throw new Error('bad');
    d.rows=a.map(x=>({time:x[0]/1000,open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]})); d.err=false; }).catch(()=>{ d.err=true; })
    .then(()=>{ d.busy=false; d.ts=Date.now(); try{ render(); }catch(e){} });
  return d; }
// typed list -> Binance intervals.  15 = 15 minutes, 60 = 1h, 4h, 1D, 1W; a capital M is a month.  Unknown entries are skipped.
function xlParseTf(raw,max){ const out=[]; String(raw||'').split(/[,\n]/).forEach(s=>{ const t=s.trim(); if(!t) return; const m=/^(\d+)\s*([a-zA-Z]?)$/.exec(t); if(!m) return; const n=+m[1], u=m[2]; let iv=null;
    if(u===''||u==='m') iv=(n>=60&&n%60===0)?(n/60)+'h':n+'m'; else if(u==='h'||u==='H') iv=n+'h'; else if(u==='d'||u==='D') iv=n+'d'; else if(u==='w'||u==='W') iv=n+'w'; else if(u==='M') iv=n+'M';
    if(iv&&XL_IVS.indexOf(iv)>=0&&out.indexOf(iv)<0) out.push(iv); }); return out.slice(0,max); }
function xlScanCache(d,tag,pk,fn){ const rows=d.rows, k=pk+'|'+rows.length+'|'+rows[rows.length-1].time; const e=d.sum[tag]; if(e&&e.k===k) return e.v; const v=fn(); d.sum[tag]={k,v}; return v; }

// ---------- [xlb] chart hook ----------
function xlRun(c,p,inst){
  const empty={mk:[],boxes:[],labels:[],stat:'',events:[]}; if(!c||c.length<5) return empty;
  const P=xlNorm(p), m=XL_MODES.indexOf(P.mode), N=c.length, tfS=tf[3]?tf[3]*30*86400:tf[2], pk=JSON.stringify(P), L=c[N-1];
  const key=pk+'|'+N+'|'+c[0].time+'|'+L.time+'|'+L.open+'|'+L.high+'|'+L.low+'|'+L.close+'|'+L.volume+'|'+tfS;
  let R; if(inst&&inst._xlC&&inst._xlC.k===key) R=inst._xlC.R; else { R=xlEngine(c,m,P,{nr:P.nrMode,tfSec:tfS}); if(inst) inst._xlC={k:key,R}; }
  const scan=[], eng=[];
  if(P.showScan||P.showEng){ xlParseTf(P.scTfList,P.scMax).forEach(iv=>{ const d=xlLoad(sym[0],iv), s=XL_IVSEC[iv], ok=d.rows&&d.rows.length>5;
      if(P.showScan) scan.push({iv,S:ok?xlScanCache(d,'m'+m,pk,()=>xlSummary(xlEngine(d.rows,m,P,{closedOnly:true,tfSec:s}),P)):null});
      if(P.showEng) eng.push({iv,S:ok?XL_MODES.map((_,k)=>xlScanCache(d,'e'+k,pk,()=>xlSummary(xlEngine(d.rows,k,P,{closedOnly:true,tfSec:s}),P))):null}); }); }
  const events=[]; R.sigs.forEach(s=>events.push({type:s.dir>0?'buy':'sell',time:s.time,idx:s.i}));
  R.trades.forEach(t=>{ if(t.reason===1||t.reason===-1) events.push({type:t.reason===1?'tp':'sl',time:R.tm[t.i1],idx:t.i1}); }); events.sort((a,b)=>a.time-b.time);
  const S=xlStats(R,P,L.close,L.time,N-1);
  const stat=P.mode+' \u00b7 '+(R.cur?(R.cur.dir>0?'BUY':'SELL')+' open':'no open trade')+' \u00b7 '+(S.n?('win '+S.wr.toFixed(0)+'% \u00b7 net '+(S.net>=0?'+':'')+S.net.toFixed(2)+'%'):'no closed trades yet');
  return {mk:[],boxes:[{type:'xlview',pts:[],r:{R,P,scan,eng},o:P}],labels:[],stat,events}; }

// ---------- [xlb] alerts (BUY / SELL / TP-SL exits of the chart engine, optional all-engines alert, scanner alert; only the newest CLOSED candle can fire) ----------
function xlAlerts(q){
  if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{
    if(i.t!=='xlb'||!i._xr||!i._xr.events||!show(i)) return;
    const P=xlNorm(i.p); let quiet=q; if(i._xlK!==key){ i._xlK=key; i._xlLast={}; i._xlAllL={}; quiet=true; }
    if(i._xlSym!==sym[0]){ i._xlSym=sym[0]; i._xlSeen={}; }
    const last=i._xlLast||(i._xlLast={}), snd=()=>{ if(P.alSound&&typeof beep==='function') beep(); };
    i._xr.events.forEach(e=>{ if(e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc) return; if(!(e.type==='buy'?P.alBuy:e.type==='sell'?P.alSell:P.alExit)) return;
      const nm=e.type==='buy'?'BUY':e.type==='sell'?'SELL':e.type==='tp'?'TAKE PROFIT hit':'STOP LOSS hit';
      toast(nm+' \u00b7 XL '+P.mode+' \u00b7 '+sym[0]+' '+tf[0],e.type==='buy'||e.type==='tp'?'#2e7d32':'#c62828'); snd(); });
    // all six engines (the chart engine is already covered above)
    if(P.alAll){ const m=XL_MODES.indexOf(P.mode), tfS=tf[3]?tf[3]*30*86400:tf[2], k2=JSON.stringify(P)+'|'+candles.length+'|'+cc;
      if(!i._xlAll||i._xlAll.k!==k2){ const ev=[]; XL_MODES.forEach((nm,k)=>{ if(k===m) return; const R=xlEngine(candles,k,P,{closedOnly:true,tfSec:tfS}); R.sigs.forEach(s=>ev.push({type:s.dir>0?'buy':'sell',time:s.time,eng:nm})); }); i._xlAll={k:k2,ev}; }
      const la=i._xlAllL||(i._xlAllL={});
      i._xlAll.ev.forEach(e=>{ const kk=e.eng+e.type; if(e.time<=(la[kk]||0)) return; la[kk]=e.time; if(quiet||e.time!==cc) return;
        toast((e.type==='buy'?'BUY':'SELL')+' \u00b7 XL '+e.eng+' \u00b7 '+sym[0]+' '+tf[0],e.type==='buy'?'#2e7d32':'#c62828'); snd(); }); }
    // scanned time frames: a new signal on any of them (history is learned silently)
    if(P.alScan){ const seen=i._xlSeen||(i._xlSeen={}), msgs=[], chk=(tag,iv,S,nm)=>{ if(!S||S.sigTime==null) return; const kk=tag+'|'+iv; if(!(kk in seen)){ seen[kk]=S.sigTime; return; }
        if(seen[kk]!==S.sigTime){ seen[kk]=S.sigTime; msgs.push(iv+' '+nm+' '+(S.dir>0?'BUY':'SELL')); } };
      (i._xr.boxes&&i._xr.boxes[0]?i._xr.boxes[0].r.scan:[]).forEach(s=>chk('m',s.iv,s.S,P.mode));
      (i._xr.boxes&&i._xr.boxes[0]?i._xr.boxes[0].r.eng:[]).forEach(s=>{ if(s.S) s.S.forEach((x,k)=>chk('e'+k,s.iv,x,XL_MODES[k])); });
      if(msgs.length&&!quiet){ toast('XL scanner \u00b7 '+sym[0]+' \u00b7 '+msgs.slice(0,4).join(' | ')+(msgs.length>4?' ...':''),'#1565c0'); snd(); } }
  }); }
{ const _xlPrevRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_xlPrevRE.apply(this,arguments); try{ xlAlerts(q); }catch(e){ console.error('xlb alerts',e); } return rv; }; }

// ---------- [xlb] drawing: indicator lines, base boxes, trade lines / zones / X, BUY-SELL labels, info box, scanners ----------
const xlFs={Tiny:8,Small:10,Normal:12,Large:14,Huge:16}, xlLb={Tiny:.8,Small:1,Normal:1.25,Large:1.6,Huge:2}, xlDot={Tiny:3,Small:4,Normal:5,Large:7,Huge:9};
const xlOnC='#4caf50', xlOffC='#f23645', xlHdr='#3b5b92';
function xlRgba(hex,a){ const h=String(hex||'').replace('#',''); if(h.length<6) return 'rgba(128,128,128,'+a+')'; return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+a+')'; }
const xlFg=hex=>{ const h=String(hex).replace('#',''); if(h.length<6) return '#fff'; return (parseInt(h.slice(0,2),16)*299+parseInt(h.slice(2,4),16)*587+parseInt(h.slice(4,6),16)*114)/1000>150?'#000':'#fff'; };
function xlRR(x,y,w,h,r){ cx.beginPath(); cx.moveTo(x+r,y); cx.arcTo(x+w,y,x+w,y+h,r); cx.arcTo(x+w,y+h,x,y+h,r); cx.arcTo(x,y+h,x,y,r); cx.arcTo(x,y,x+w,y,r); cx.closePath(); }
function xlFmt(v){ if(!xlN(v)) return '-'; return Math.abs(v)<1?v.toFixed(6):Math.abs(v)<100?v.toFixed(4):v.toFixed(2); }
function xlPx(v,ref){ return !xlN(v)?'-':v.toFixed(ref>=1000?2:ref>=20?3:5); }
const xlPct=v=>!xlN(v)?'n/a':(v>=0?'+':'')+v.toFixed(2)+'%';
const xlPosC=v=>!xlN(v)?'#fff':v>=0?xlOnC:xlOffC;
function xlDur(ms){ if(!xlN(ms)) return 'n/a'; const U=[[6e4,'sec',1e3],[36e5,'min',6e4],[864e5,'hr',36e5],[6048e5,'days',864e5],[26298e5,'wks',6048e5],[315576e5,'mo',26298e5]]; for(const u of U) if(ms<u[0]) return (ms/u[2]).toFixed(1)+' '+u[1]; return (ms/315576e5).toFixed(1)+' yrs'; }
function xlDurC(ms){ if(!xlN(ms)) return 'n/a'; const U=[[6e4,'s',1e3],[36e5,'m',6e4],[864e5,'h',36e5],[6048e5,'d',864e5],[26298e5,'w',6048e5],[315576e5,'mo',26298e5]]; let v,t; for(const u of U){ if(ms<u[0]){ v=ms/u[2]; t=u[1]; break; } } if(t==null){ v=ms/315576e5; t='y'; } return v.toFixed(v>=10?0:1)+t; }
const xlDual=(a,b)=>!xlN(a)?'n/a':xlDurC(a)+' / '+(xlN(b)?xlDurC(b):'n/a');
const xlC=(t,c,bg,a,span)=>({t:String(t),c:c||'#fff',bg:bg||null,a:a||'l',span:span||1});
// draws a table of cells (rows of {t,c,bg,a,span}) at one of the nine chart positions, shrunk to fit narrow screens
function xlGrid(rows,pos,fs,W,H){ if(!rows.length) return; cx.save(); cx.font=fs+'px system-ui'; const pad=5, rh=fs+7, nc=Math.max.apply(null,rows.map(r=>r.reduce((s,x)=>s+(x.span||1),0))), cw=new Array(nc).fill(0);
  rows.forEach(r=>{ let c0=0; r.forEach(x=>{ const sp=x.span||1; if(sp===1) cw[c0]=Math.max(cw[c0],cx.measureText(x.t).width+pad*2); c0+=sp; }); });
  rows.forEach(r=>{ let c0=0; r.forEach(x=>{ const sp=x.span||1; if(sp>1){ let w=0; for(let k=0;k<sp;k++) w+=cw[c0+k]; const need=cx.measureText(x.t).width+pad*2; if(need>w){ const add=(need-w)/sp; for(let k=0;k<sp;k++) cw[c0+k]+=add; } } c0+=sp; }); });
  const tw=cw.reduce((a,b)=>a+b,0), th=rows.length*rh, sc=Math.max(.35,Math.min(1,(W-12)/tw,(H-40)/th)), w=tw*sc, h=th*sc, narrow=W<700;
  const x=/Left/.test(pos)?6:/Center/.test(pos)?(W-w)/2:W-w-6, y=/^Top/.test(pos)?(narrow?176:8):/^Middle/.test(pos)?(H-h)/2:H-h-30;
  cx.translate(x,y); cx.scale(sc,sc); cx.globalAlpha=.9; cx.fillStyle='#131722'; cx.fillRect(0,0,tw,th); cx.globalAlpha=1; cx.textBaseline='middle';
  rows.forEach((r,ri)=>{ let c0=0; const py=ri*rh; r.forEach(cell=>{ const sp=cell.span||1; let x0=0; for(let k=0;k<c0;k++) x0+=cw[k]; let ww=0; for(let k=0;k<sp;k++) ww+=cw[c0+k];
      if(cell.bg){ cx.fillStyle=cell.bg; cx.fillRect(x0,py,ww,rh); } cx.strokeStyle='rgba(128,128,128,.35)'; cx.lineWidth=1; cx.strokeRect(x0,py,ww,rh);
      cx.fillStyle=cell.c; cx.textAlign=cell.a==='r'?'right':cell.a==='c'?'center':'left'; cx.fillText(cell.t,cell.a==='r'?x0+ww-pad:cell.a==='c'?x0+ww/2:x0+pad,py+rh/2+.5); c0+=sp; }); });
  cx.strokeStyle='rgba(128,128,128,.6)'; cx.strokeRect(0,0,tw,th); cx.restore(); }
// which trades keep their lines on the chart: the open one, the last closed one (exit X), and the last N closed setups (Show closed trades)
function xlVisTrades(R,P){ if(!P.useRisk) return []; let keep=[]; const el=R.trades.filter(t=>t.reason!==0?(P.showX||P.showClosed>0):P.showClosed>0);
  if(P.showClosed>0) keep=el.slice(-P.showClosed); else { const lt=R.trades[R.trades.length-1]; if(!R.cur&&lt&&lt.reason!==0&&P.showX) keep=[lt]; }
  if(R.cur) keep.push(R.cur); return keep; }
function xlInfoRows(R,P,S){ const rows=[], hd=t=>rows.push([xlC(t,'#fff',xlHdr,'c',2)]), rw=(l,v,c)=>rows.push([xlC(l),xlC(v,c,null,'r')]), m=R.m, isVar=m===1&&P.baseMode==='Variable';
  hd('XL - '+P.mode.toUpperCase()+' BUY/SELL SIGNALS'); rw('Timeframe',tf[0],'#fff'); rw('Non-Repaint',P.nrMode,P.nrMode==='Entries + Exits'?xlOnC:P.nrMode==='Entries Only'?'#ff9800':xlOffC);
  const vol=[P.ocVol,P.brkVol,P.donVol,P.maVol,0,P.arVol][m];
  if(m===0){ rw('Avg Body Length',P.bodyLen,'#fff'); rw('Min Body',P.bodyMult.toFixed(1)+'x','#fff'); }
  else if(m===1){ rw('Base Length',isVar?P.varMin+'-'+P.varMax+' bars':P.baseLen+' bars','#fff'); rw('Breakout Entry Mode',P.brkMode,'#fff'); rw('Max Base Height',P.baseMult.toFixed(1)+'x ATR','#fff'); if(P.minBreak>0) rw('Min Breakout',P.minBreak.toFixed(1)+'x ATR','#fff'); }
  else if(m===2){ rw('Channel Length',P.donLen,'#fff'); rw('Entry Mode',P.donEntMode,'#fff'); }
  else if(m===3){ rw('Fast / Slow MA',P.maType+' '+P.fastLen+' / '+P.slowLen,'#fff'); rw('Entry Mode',P.maEntMode,'#fff'); if(P.minSep>0) rw('Min Cross Strength',P.minSep.toFixed(2)+'x ATR','#fff'); }
  else if(m===5){ rw('Aroon Len / Smoothing',P.arLen+(P.arSm!=='None'?' / '+P.arSm+' '+P.arSmLen:''),'#fff'); rw('Signal Mode',P.arSigMode==='Crossover'?'Crossover':'Strong '+P.arStrong.toFixed(0),'#fff'); }
  else { rw('Supertrend Len / Factor',P.stLen+' / '+P.stMult.toFixed(1),'#fff'); rw('Entry Mode',P.stEntMode,'#fff'); }
  if(vol>0) rw('Min Volume',vol.toFixed(1)+'x','#fff');
  if((m===1&&P.brkTrend)||(m===3&&P.maTrend)) rw('Trend Filter',m===1?'EMA '+P.brkTrendLen:P.maType+' '+P.maTrendLen,'#fff');
  if(m!==4) rw('Alternate Signals',R.alternate?'ON':'OFF',R.alternate?xlOnC:xlOffC);
  rw('Ignore Signals in Trade',R.noOverlap?'ON':'OFF',R.noOverlap?xlOnC:xlOffC); if(m===1) rw('Ignore Base in Trade',P.noBaseInTrade?'ON':'OFF',P.noBaseInTrade?xlOnC:xlOffC);
  rw('Exit Trigger',R.riskOn?P.exitMode:'-','#fff');
  const at=xlN(R.slAtrX)?R.slAtrX.toFixed(1)+'x ATR':'n/a', s=R.slSel;
  const slTxt=s==='ATR'?R.slMult.toFixed(1)+'x ATR':s==='Aroon extreme'?'AE: '+at:s==='Supertrend line'?'ST: '+at:s==='Swing'?'SW: '+at:s==='Candle wick'?'CW: '+at:s==='Candle body'?'CB: '+at:s==='Base edge'?'BE: '+at:s==='Channel opposite'?'CO: '+at:s==='Channel middle'?'CM: '+at:'None';
  const t=R.tpSel, tpTxt=t==='ATR target'?R.tpMult.toFixed(1)+'x ATR':t==='Base height'?P.brkTpBMult.toFixed(1)+'x Base':t==='SL multiple'&&R.hasSl?R.tpRMult.toFixed(1)+'x SL':'Opp. Signal';
  rw('Stop Loss',P.useRisk?slTxt:'OFF',P.useRisk?'#fff':xlOffC); rw('Take Profit',P.useRisk?tpTxt:'OFF',P.useRisk?'#fff':xlOffC);
  hd('LOOKBACK P/L'); rw('Trades Counted',S.n+' / '+P.lookback,'#fff');
  rw('Exits TP / SL / Signal',(P.useRisk&&R.hasTp?S.tp:'-')+' / '+(P.useRisk&&R.hasSl?S.sl:'-')+' / '+S.rev,'#fff'); rw('Net P/L',xlPct(S.net),xlPosC(S.net));
  rw('Win Rate',!xlN(S.wr)?'n/a':S.wr.toFixed(0)+'% ('+S.win+'W/'+S.loss+'L)','#fff'); rw('Avg Win / Loss',xlPct(S.avgWin)+' / '+xlPct(S.avgLoss),'#fff');
  rw('Max Drawdown',S.n?xlPct(S.dd):'n/a',S.dd<0?xlOffC:'#fff'); rw('Open Trade P/L',xlPct(S.openPnl),xlPosC(S.openPnl));
  rw('Avg Time/Sig (cal/mkt)',xlDual(S.avgDur,S.avgDurM),'#fff'); rw('Time in Sig (cal/mkt)',xlDual(S.inMs,S.inMsM),'#fff');
  rw('Time btw Sig (cal/mkt)',xlDual(S.avgGap,S.avgGapM),'#fff'); rw('Time from Sig (cal/mkt)',xlDual(S.sinceMs,S.sinceMsM),'#fff'); return rows; }
function xlScanRows(r,P,nowT){ const rows=[], cols={Micro:[0,1,2,12],Low:[0,1,2,3,10,12],Medium:[0,1,2,3,8,9,10,12],High:[0,1,2,3,5,6,7,8,9,10,12],Maximum:[0,1,2,3,4,5,6,7,8,9,10,11,12]}[P.scDetail]||[0,1,2,3,5,6,7,8,9,10,12], nc=cols.length;
  const hdr=['Timeframe','Signal','Status','Avg Between','Last Signal','Entry','SL','TP','Open P/L','Avg P/L','Net P/L','Max DD','Win Rate / '+P.lookback];
  rows.push([xlC('XL - '+P.mode.toUpperCase()+' BUY/SELL SCANNER ('+sym[0]+' / Standard)','#fff',xlHdr,'c',nc)]);
  rows.push(cols.map((c,j)=>xlC(hdr[c],'#fff','rgba(59,91,146,.55)',j?'r':'l')));
  r.scan.forEach(s=>{ const S=s.S, ok=!!S&&xlN(S.px), dd=ok?S.dir:0, has=ok&&dd!==0, hs=ok&&S.n>0, op=ok&&S.stat===1, bg=ok&&S.isNew?xlRgba(dd===1?P.buyCol:P.sellCol,.3):null;
    const tx=[s.iv,!ok?'n/a':dd===1?'BUY':dd===-1?'SELL':'-',!ok?'-':S.stat===1?'OPEN':S.stat===2?'TP':S.stat===3?'SL':'-',ok&&xlN(S.avgGap)?xlDur(S.avgGap):'-',ok&&S.sigTime!=null?xlDur((S.nowT-S.sigTime)*1000):'-',
      has?xlPx(S.entry,S.px):'-',has?xlPx(S.sl,S.px):'-',has?xlPx(S.tp,S.px):'-',op?xlPct(S.openPnl):'-',hs?xlPct(S.avgP):'-',hs?xlPct(S.net):'-',hs?xlPct(S.dd):'-',hs?(S.win/S.n*100).toFixed(0)+'% ('+S.win+'W/'+S.loss+'L)':'-'];
    const tc=['#fff',dd===1?P.buyCol:dd===-1?P.sellCol:'#888',ok&&S.stat===1?'#fff':ok&&S.stat===2?P.buyCol:ok&&S.stat===3?P.sellCol:'#888','#fff','#fff','#fff','#fff','#fff',op?xlPosC(S.openPnl):'#888',hs?xlPosC(S.avgP):'#888',hs?xlPosC(S.net):'#888',hs&&S.dd<0?xlOffC:'#fff',hs&&S.n<P.lookback?xlOffC:'#fff'];
    rows.push(cols.map((c,j)=>xlC(tx[c],tc[c],bg,j?'r':'l'))); }); return rows; }
function xlEngRows(r,P){ const rows=[], cols={Micro:[6],Low:[1,6],Medium:[0,1,6],High:[0,1,4,6],Maximum:[0,1,3,4,5,6]}[P.engDetail]||[1,6], ne=cols.length, nc=1+6*ne;
  const hdr=['Signal','Status','Avg Between','Open P/L','Net P/L','Max DD','Win Rate / '+P.lookback];
  rows.push([xlC('XL - Engine Scanner ('+sym[0]+' / Standard)','#fff',xlHdr,'c',nc)]);
  const r1=[xlC('','#fff','rgba(59,91,146,.55)')]; XL_MODES.forEach((n,k)=>r1.push(xlC(n,'#fff',k%2?'#2a4170':xlHdr,'c',ne))); rows.push(r1);
  const r2=[xlC('Timeframe','#fff','rgba(59,91,146,.55)','l')]; XL_MODES.forEach((n,k)=>cols.forEach(c=>r2.push(xlC(hdr[c],'#fff',k%2?'rgba(42,65,112,.6)':'rgba(59,91,146,.55)','c')))); rows.push(r2);
  r.eng.forEach(e=>{ const row=[xlC(e.iv,'#fff',null,'l')]; XL_MODES.forEach((n,k)=>{ const S=e.S&&e.S[k], ok=!!S&&xlN(S.px), dd=ok?S.dir:0, hs=ok&&S.n>0, op=ok&&S.stat===1;
      const tx=[!ok?'n/a':dd===1?'BUY':dd===-1?'SELL':'-',!ok?'-':S.stat===1?'OPEN':S.stat===2?'TP':S.stat===3?'SL':'-',ok&&xlN(S.avgGap)?xlDur(S.avgGap):'-',op?xlPct(S.openPnl):'-',hs?xlPct(S.net):'-',hs?xlPct(S.dd):'-',hs?(S.win/S.n*100).toFixed(0)+'% ('+S.win+'W/'+S.loss+'L)':'-'];
      const tc=[dd===1?P.buyCol:dd===-1?P.sellCol:'#888',ok&&S.stat===1?'#fff':ok&&S.stat===2?P.buyCol:ok&&S.stat===3?P.sellCol:'#888','#fff',op?xlPosC(S.openPnl):'#888',hs?xlPosC(S.net):'#888',hs&&S.dd<0?xlOffC:'#fff',hs&&S.n<P.lookback?xlOffC:'#fff'];
      cols.forEach(c=>row.push(xlC(tx[c],tc[c],null,'c'))); }); rows.push(row); }); return rows; }

function xlDraw(d,X,Y,W,H){
  const r=d.r, P=d.o; if(!r||!r.R||!r.R.ok) return; const R=r.R, N=R.N, m=R.m, V=R.vis;
  const vr=chart.timeScale().getVisibleLogicalRange(), v0=vr?Math.max(0,Math.floor(vr.from)-2):0, v1=vr?Math.min(N-1,Math.ceil(vr.to)+2):N-1; if(v1<v0) return;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round'; cx.lineCap='round';
  const poly=(arr,col,w)=>{ if(!arr) return; cx.strokeStyle=col; cx.lineWidth=w; cx.beginPath(); let pen=false; for(let i=v0;i<=v1;i++){ const v=arr[i]; if(!xlN(v)){ pen=false; continue; } const x=X(i), y=Y(v); if(x==null||y==null){ pen=false; continue; } if(pen) cx.lineTo(x,y); else { cx.moveTo(x,y); pen=true; } } cx.stroke(); };
  const fillRuns=(up,lo,colAt)=>{ if(!up||!lo) return; let run=[],col=null; const flush=()=>{ if(run.length>1){ cx.fillStyle=col; cx.beginPath(); run.forEach((p,k)=>k?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1])); for(let k=run.length-1;k>=0;k--) cx.lineTo(run[k][0],run[k][2]); cx.closePath(); cx.fill(); } run=[]; };
    for(let i=v0;i<=v1;i++){ const a=up[i], b=lo[i]; if(!xlN(a)||!xlN(b)){ flush(); col=null; continue; } const x=X(i), ya=Y(a), yb=Y(b); if(x==null||ya==null||yb==null){ flush(); col=null; continue; }
      const cc=colAt(i); if(cc!==col){ const pv=run[run.length-1]; flush(); col=cc; if(pv) run.push(pv); } run.push([x,ya,yb]); } flush(); };
  // --- engine lines ---
  if(m===1&&P.brkShowTrend) poly(V.emaT,P.brkEmaCol,1);
  if(m===2&&P.donShowChan){ if(P.donShade) fillRuns(V.upB,V.loB,()=>xlRgba(P.donChanCol,.08)); poly(V.upB,P.donChanCol,1); poly(V.loB,P.donChanCol,1); if(P.donShowMid){ cx.globalAlpha=.6; poly(V.midB,P.donChanCol,1); cx.globalAlpha=1; } }
  if(m===3&&P.maShowMAs){ if(P.maShowFill) fillRuns(V.fast,V.slow,i=>xlRgba(V.fast[i]>=V.slow[i]?P.buyCol:P.sellCol,.15)); poly(V.fast,P.maFastCol,2); poly(V.slow,P.maSlowCol,2); if(P.maTrend) poly(V.trend,P.maTrendCol,2); }
  if(m===4&&P.stShowLine&&V.stLine){ cx.lineWidth=2; for(let i=Math.max(1,v0);i<=v1;i++){ const a=V.stLine[i-1], b=V.stLine[i]; if(!xlN(a)||!xlN(b)||V.stDir[i]!==V.stDir[i-1]) continue; const x0=X(i-1),x1=X(i),y0=Y(a),y1=Y(b); if(x0==null||x1==null||y0==null||y1==null) continue;
      cx.strokeStyle=V.stDir[i]<0?P.buyCol:P.sellCol; cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y1); cx.stroke(); } }
  // --- Breakout base boxes ---
  R.bases.forEach(b=>{ if(b.i1<v0||b.i0>v1) return; const xa=X(b.i0), xb=X(b.i1), ya=Y(b.hi), yb=Y(b.lo); if(xa==null||xb==null||ya==null||yb==null) return; const col=b.dir===1?P.buyCol:P.sellCol;
    cx.fillStyle=xlRgba(col,.15); cx.fillRect(xa,Math.min(ya,yb),xb-xa,Math.max(1,Math.abs(yb-ya))); cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(xa,Math.min(ya,yb),xb-xa,Math.max(1,Math.abs(yb-ya))); });
  // --- trade lines, zones, exit X, average-time dot ---
  const lw=P.lineW; cx.font='11px system-ui'; cx.textBaseline='middle';
  xlVisTrades(R,P).forEach(t=>{ const open=t.i1<0; if(t.i0>v1||(!open&&t.i1<v0)) return; const xa=X(t.i0), xb=open?W:X(t.i1); if(xa==null||xb==null) return; const x0=Math.max(-2,xa), x1=Math.min(W,xb);
    const yE=Y(t.entry), yS=xlN(t.sl)?Y(t.sl):null, yT=xlN(t.tp)?Y(t.tp):null; if(yE==null) return;
    if(P.showZone){ if(yS!=null&&x1>x0){ cx.fillStyle=xlRgba(P.slZoneCol,.15); cx.fillRect(x0,Math.min(yE,yS),x1-x0,Math.max(1,Math.abs(yS-yE))); } if(yT!=null&&x1>x0){ cx.fillStyle=xlRgba(P.tpZoneCol,.15); cx.fillRect(x0,Math.min(yE,yT),x1-x0,Math.max(1,Math.abs(yT-yE))); } }
    if(P.showTradeLines&&x1>x0){ cx.lineWidth=lw; cx.strokeStyle=P.entryCol; cx.beginPath(); cx.moveTo(x0,yE); cx.lineTo(x1,yE); cx.stroke(); cx.setLineDash([5,4]);
      if(yS!=null){ cx.strokeStyle=P.slCol; cx.beginPath(); cx.moveTo(x0,yS); cx.lineTo(x1,yS); cx.stroke(); } if(yT!=null){ cx.strokeStyle=P.tpCol; cx.beginPath(); cx.moveTo(x0,yT); cx.lineTo(x1,yT); cx.stroke(); } cx.setLineDash([]); }
    if(P.showTradeLbl){ cx.textAlign='right'; const lx=xa-3; if(lx>20&&lx<W+300){ cx.fillStyle=P.entryCol; cx.fillText('Entry '+xlFmt(t.entry),lx,yE); if(yS!=null){ cx.fillStyle=P.slCol; cx.fillText('SL '+xlFmt(t.sl),lx,yS); } if(yT!=null){ cx.fillStyle=P.tpCol; cx.fillText('TP '+xlFmt(t.tp),lx,yT); } } }
    if(!open&&P.showX&&t.reason!==0){ const xx=X(t.i1), yy=Y(t.exit); if(xx!=null&&yy!=null){ cx.font='bold 17px system-ui'; cx.textAlign='center'; cx.fillStyle=P.xCol; cx.fillText('\u2715',xx,yy+.5); cx.font='11px system-ui'; } }
    if(open&&P.showAvgDot&&P.showTradeLines&&t.avgBars>0){ const xd=X(t.i0+t.avgBars); if(xd!=null&&xd>-10&&xd<W+10){ cx.fillStyle=P.avgDotCol; cx.beginPath(); cx.arc(xd,yE,xlDot[P.avgDotSize]||7,0,6.2832); cx.fill(); } } });
  // --- entry dots + BUY / SELL labels ---
  const sc=xlLb[P.lblSize]||1; cx.font='bold '+Math.round(11*sc)+'px system-ui'; cx.textAlign='center'; cx.textBaseline='middle';
  R.sigs.forEach(s=>{ if(s.i<v0||s.i>v1) return; const x=X(s.i); if(x==null||x<-30||x>W+30) return; const buy=s.dir>0;
    if(P.showEntryMark){ const ye=Y(s.entry); if(ye!=null){ cx.fillStyle=P.entryMarkCol; cx.beginPath(); cx.arc(x,ye,3,0,6.2832); cx.fill(); } }
    if(P.showLabels){ const y=Y(buy?R.lo[s.i]:R.hi[s.i]); if(y==null) return; const col=buy?P.buyCol:P.sellCol, txt=buy?'BUY':'SELL', w=cx.measureText(txt).width+14*sc, h=17*sc, ar=7*sc, py=buy?y+ar+3:y-ar-3-h;
      cx.fillStyle=col; cx.beginPath(); if(buy){ cx.moveTo(x,y+3); cx.lineTo(x-4*sc,y+3+ar); cx.lineTo(x+4*sc,y+3+ar); } else { cx.moveTo(x,y-3); cx.lineTo(x-4*sc,y-3-ar); cx.lineTo(x+4*sc,y-3-ar); } cx.closePath(); cx.fill();
      xlRR(x-w/2,py,w,h,4); cx.fill(); cx.fillStyle=xlFg(col); cx.fillText(txt,x,py+h/2+.5); } });
  cx.restore();
  // --- tables ---
  const cN=candles.length?candles[candles.length-1]:null;
  if(P.showTable){ const S=xlStats(R,P,cN?cN.close:NaN,cN?cN.time:null,N-1); xlGrid(xlInfoRows(R,P,S),P.tablePos,xlFs[P.tableSize]||10,W,H); }
  if(P.showScan&&r.scan.length) xlGrid(xlScanRows(r,P),P.scPos,xlFs[P.scSize]||10,W,H);
  if(P.showEng&&r.eng.length) xlGrid(xlEngRows(r,P),P.engPos,xlFs[P.engSize]||10,W,H);
}
{ const _xlPrevDraw=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='xlview') return xlDraw(d,X,Y,W,H); return _xlPrevDraw.apply(this,arguments); }; }

// ---------- [xlb] settings panel (one collapsible group per engine; the group of the selected Signal mode opens first) ----------
function xlInputs(b,d){
  const p=d.p, head=t=>{ const h=document.createElement('div'); h.className='sech'; h.textContent=t; b.appendChild(h); };
  const note=(box,t)=>box.appendChild(Object.assign(document.createElement('div'),{textContent:t,style:'color:#8a93a6;font-size:13px;line-height:1.45;padding:2px 0 8px'}));
  const grp=(title,open,fn)=>{ const dt=document.createElement('details'); if(open) dt.open=true; dt.style.cssText='margin:8px 0;border:1px solid #2a3350;border-radius:12px;padding:0 10px';
    const sm=document.createElement('summary'); sm.textContent=title; sm.style.cssText='padding:11px 2px;font-weight:700;cursor:pointer'; dt.appendChild(sm); const box=document.createElement('div'); box.style.cssText='padding-bottom:8px'; dt.appendChild(box); b.appendChild(dt);
    fn(box,(k,l,o)=>fld(box,p,k,'num',l,o),(k,l)=>fld(box,p,k,'chk',l),(k,l,opts)=>fld(box,p,k,'sel',l,{opts}),(k,l)=>fld(box,p,k,'txt',l)); };
  const cur=p.mode||'OC', tp3=XL_TP3;
  head('A. SIGNAL ENGINE'); fld(b,p,'mode','sel','Signal mode',{opts:XL_MODES}); fld(b,p,'nrMode','sel','Non-repaint',{opts:XL_OPT.nrMode});
  note(b,'Only the engine chosen as Signal mode runs on the chart. Open the groups below to set each engine (the groups of the other engines are ignored, except by the Engine Scanner). Non-repaint: Entries + Exits = everything waits for the candle to close; Entries Only = signals wait, SL / TP register the moment price touches them (Wick exit trigger); Off = everything live and may repaint. The scanners always read closed candles.');
  grp('OC mode',cur==='OC',(bx,num,chk,sel)=>{ num('bodyLen','Average body length',{min:1,max:1000,step:1}); num('bodyMult','Min body vs average (x)',{min:0,max:100,step:.5}); num('ocVol','Min volume vs average (x, 0 = off)',{min:0,max:100,step:.5});
    chk('ocAlt','Alternate signals'); chk('ocNoOvl','Ignore signals while a trade is open'); sel('ocSlMode','Stop loss mode',XL_OPT.ocSlMode); num('ocSlBuf','Stop buffer (x ATR)',{min:0,max:20,step:.05}); sel('ocTpMode','Take profit mode',tp3);
    num('ocSlMult','Stop loss (x ATR)',{min:.1,max:50,step:.1}); num('ocTpMult','Take profit (x ATR)',{min:.1,max:100,step:.1}); num('ocTpRMult','Take profit (x SL)',{min:.1,max:100,step:.1});
    note(bx,'A large candle that closes beyond the previous candle\'s body.'); });
  grp('Breakout mode',cur==='Breakout',(bx,num,chk,sel)=>{ sel('baseMode','Base mode',XL_OPT.baseMode); num('baseLen','Fixed base length (bars)',{min:3,max:500,step:1}); num('varMin','Variable min base (bars)',{min:3,max:200,step:1}); num('varMax','Variable max base (bars)',{min:3,max:200,step:1});
    num('baseMult','Max base height (x ATR)',{min:.1,max:50,step:.1}); sel('brkMode','Breakout entry mode',XL_OPT.brkMode); num('minBreak','Min breakout strength (x ATR)',{min:0,max:20,step:.1}); num('brkVol','Min volume vs average (x, 0 = off)',{min:0,max:100,step:.5}); num('brkVolLen','Average volume length',{min:1,max:1000,step:1});
    chk('brkTrend','Trend filter'); num('brkTrendLen','Trend EMA length',{min:2,max:1000,step:1}); chk('brkShowTrend','Show trend EMA'); chk('brkAlt','Alternate signals'); chk('brkNoOvl','Ignore signals while a trade is open'); chk('noBaseInTrade','Ignore base development while a trade is open'); chk('brkShowBase','Show base zones');
    sel('brkSlMode','Stop loss mode',XL_OPT.brkSlMode); num('brkSlBuf','Stop buffer (x ATR)',{min:0,max:20,step:.05}); sel('brkTpMode','Take profit mode',XL_OPT.brkTpMode); num('brkSlMult','Stop loss (x ATR)',{min:.1,max:50,step:.1}); num('brkTpMult','Take profit (x ATR)',{min:.1,max:100,step:.1});
    num('brkTpRMult','Take profit (x SL)',{min:.1,max:100,step:.1}); num('brkTpBMult','Take profit (x base height)',{min:.1,max:100,step:.1}); note(bx,'A close (or wick) beyond a tight consolidation base. A base stop that is not beyond the entry skips the signal.'); });
  grp('Donchian mode',cur==='Donchian',(bx,num,chk,sel)=>{ num('donLen','Channel length',{min:2,max:500,step:1}); sel('donEntMode','Entry mode',XL_OPT.donEntMode); num('donVol','Min volume vs average (x, 0 = off)',{min:0,max:100,step:.5}); chk('donAlt','Alternate signals'); chk('donNoOvl','Ignore signals while a trade is open');
    chk('donShowChan','Show Donchian channel'); chk('donShade','Show channel shading'); chk('donShowMid','Show middle line'); sel('donSlMode','Stop loss mode',XL_OPT.donSlMode); num('donSlBuf','Stop buffer (x ATR)',{min:0,max:20,step:.05}); sel('donTpMode','Take profit mode',tp3);
    num('donSlMult','Stop loss (x ATR)',{min:.1,max:50,step:.1}); num('donTpMult','Take profit (x ATR)',{min:.1,max:100,step:.1}); num('donTpRMult','Take profit (x SL)',{min:.1,max:100,step:.1}); });
  grp('MA Cross mode',cur==='MA Cross',(bx,num,chk,sel)=>{ num('fastLen','Fast MA length',{min:1,max:500,step:1}); num('slowLen','Slow MA length',{min:2,max:1000,step:1}); sel('maType','MA type',XL_OPT.maType); sel('maSrc','MA source',XL_OPT.maSrc);
    num('minSep','Min cross strength (x ATR, 0 = off)',{min:0,max:20,step:.05}); chk('maTrend','Trend filter'); num('maTrendLen','Trend MA length',{min:2,max:1000,step:1}); sel('maEntMode','Entry mode',XL_OPT.maEntMode); num('maVol','Min volume vs average (x, 0 = off)',{min:0,max:100,step:.5});
    chk('maAlt','Alternate signals'); chk('maNoOvl','Ignore signals while a trade is open'); chk('maShowMAs','Show moving averages'); chk('maShowFill','Show MA shading'); sel('maSlMode','Stop loss mode',XL_OPT.maSlMode); num('swingLen','Swing length (bars)',{min:1,max:200,step:1});
    num('maSlBuf','Stop buffer (x ATR)',{min:0,max:20,step:.05}); num('slMin','Min stop distance (x ATR)',{min:0,max:20,step:.05}); sel('maTpMode','Take profit mode',tp3); num('maSlMult','Stop loss (x ATR)',{min:.1,max:50,step:.1}); num('maTpMult','Take profit (x ATR)',{min:.1,max:100,step:.1}); num('maTpRMult','Take profit (x SL)',{min:.1,max:100,step:.1}); });
  grp('Supertrend mode',cur==='Supertrend',(bx,num,chk,sel)=>{ num('stLen','Supertrend ATR length',{min:1,max:200,step:1}); num('stMult','Supertrend factor',{min:.1,max:50,step:.1}); sel('stEntMode','Entry mode',XL_OPT.stEntMode); chk('stNoOvl','Ignore signals while a trade is open'); chk('stShowLine','Show Supertrend line');
    sel('stSlMode','Stop loss mode',XL_OPT.stSlMode); num('stSlBuf','Stop buffer (x ATR)',{min:0,max:20,step:.05}); sel('stTpMode','Take profit mode',tp3); num('stSlMult','Stop loss (x ATR)',{min:.1,max:50,step:.1}); num('stTpMult','Take profit (x ATR)',{min:.1,max:100,step:.1}); num('stTpRMult','Take profit (x SL)',{min:.1,max:100,step:.1}); });
  grp('Aroon mode',cur==='Aroon',(bx,num,chk,sel)=>{ num('arLen','Aroon length',{min:2,max:500,step:1}); sel('arSigMode','Signal mode',XL_OPT.arSigMode); num('arStrong','Strong trend level',{min:50,max:100,step:5}); sel('arSm','Smoothing',XL_OPT.arSm); num('arSmLen','Smoothing length',{min:1,max:200,step:1});
    num('arVol','Min volume vs average (x, 0 = off)',{min:0,max:100,step:.5}); num('arVolLen','Average volume length',{min:1,max:1000,step:1}); chk('arAlt','Alternate signals'); chk('arNoOvl','Ignore signals while a trade is open'); sel('arSlMode','Stop loss mode',XL_OPT.arSlMode); num('arSlBuf','Stop buffer (x ATR)',{min:0,max:20,step:.05});
    sel('arTpMode','Take profit mode',tp3); num('arSlMult','Stop loss (x ATR)',{min:.1,max:50,step:.1}); num('arTpMult','Take profit (x ATR)',{min:.1,max:100,step:.1}); num('arTpRMult','Take profit (x SL)',{min:.1,max:100,step:.1}); note(bx,'The Aroon lines are not drawn on the price chart; only the signals are.'); });
  grp('Stop Loss / Take Profit (shared)',false,(bx,num,chk,sel)=>{ chk('useRisk','Enable SL/TP'); sel('exitMode','Exit trigger',XL_OPT.exitMode); num('atrLen','ATR length',{min:1,max:500,step:1});
    note(bx,'OFF = pure stop-and-reverse: no lines, trades close only on the next signal. Wick = SL / TP hit when the candle touches the level. Close = only when a candle closes beyond it. If SL and TP are touched on the same candle the SL is assumed first.'); });
  grp('Lookback P/L and info box',false,(bx,num,chk,sel)=>{ num('lookback','Lookback (last N closed trades)',{min:1,max:500,step:1}); chk('showTable','Show info box'); sel('tablePos','Info box position',XL_POS); sel('tableSize','Info box size',XL_SZ5); num('showClosed','Show closed trades (0 = off)',{min:0,max:50,step:1}); });
  grp('Multi-Timeframe Scanner',false,(bx,num,chk,sel,txt)=>{ chk('showScan','Show scanner'); txt('scTfList','Timeframes (comma separated)'); num('scMax','Max timeframes',{min:1,max:12,step:1}); sel('scPos','Scanner position',XL_POS); sel('scSize','Scanner size',XL_SZ5); sel('scDetail','Scanner detail',XL_DET);
    note(bx,'Scans this symbol on each time frame with the selected engine, using Binance candles and closed candles only. Use 15 or 15m for minutes, 4h, 1D, 1W; a capital M is a month. Each time frame is one request, so keep the list short on a phone.'); });
  grp('Engine Scanner',false,(bx,num,chk,sel)=>{ chk('showEng','Show engine scanner'); sel('engPos','Engine scanner position',XL_POS); sel('engSize','Engine scanner size',XL_SZ5); sel('engDetail','Engine scanner detail',XL_DET);
    note(bx,'All six engines side by side on each time frame of the list above, each with its own settings and trade history. Keep it away from the info box and the scanner, because only one table fits in each spot.'); });
  grp('Alerts',false,(bx,num,chk)=>{ chk('alBuy','BUY alert'); chk('alSell','SELL alert'); chk('alExit','Take profit / stop loss hit alert'); chk('alScan','Scanner alert (new signal on a scanned time frame)'); chk('alAll','All-engines alert (BUY / SELL of the other five engines)'); chk('alSound','Play a sound');
    note(bx,'Alerts fire once, when the candle closes, while the app is open.'); });
}
function xlStyle(b,d){
  const p=d.p, head=t=>{ const h=document.createElement('div'); h.className='sech'; h.textContent=t; b.appendChild(h); };
  head('SIGNALS'); stRow(b,'BUY label',p,'showLabels','buyCol',[['lblSize',XL_SZ5]]); stRow(b,'SELL label',p,'showLabels','sellCol'); stRow(b,'Entry marker (dot)',p,'showEntryMark','entryMarkCol'); stRow(b,'Avg time marker (dot)',p,'showAvgDot','avgDotCol',[['avgDotSize',XL_SZ5]]);
  head('TRADE LINES AND ZONES'); stRow(b,'Entry line',p,'showTradeLines','entryCol'); stRow(b,'SL line',p,'showTradeLines','slCol'); stRow(b,'TP line',p,'showTradeLines','tpCol'); stRow(b,'SL zone shading',p,'showZone','slZoneCol'); stRow(b,'TP zone shading',p,'showZone','tpZoneCol');
  stRow(b,'Exit X',p,'showX','xCol'); fld(b,p,'showTradeLbl','chk','Show Entry / SL / TP price labels'); fld(b,p,'lineW','sel','Line width',{opts:[1,2,3,4],num:true});
  head('ENGINE LINES'); stRow(b,'Trend EMA (Breakout)',p,'brkShowTrend','brkEmaCol'); stRow(b,'Donchian channel',p,'donShowChan','donChanCol'); stRow(b,'Fast MA (MA Cross)',p,'maShowMAs','maFastCol'); stRow(b,'Slow MA (MA Cross)',p,'maShowMAs','maSlowCol'); stRow(b,'Trend MA (MA Cross)',p,'maShowMAs','maTrendCol'); stRow(b,'Supertrend line (BUY / SELL colors)',p,'stShowLine','buyCol');
  head('OUTPUT VALUES'); fld(b,p,'valuesStatus','chk','Values in status line'); head('INPUT VALUES'); fld(b,p,'inputsStatus','chk','Inputs in status line');
}

// ---------- [xlb] registration under "Premium Strategy" ----------
IND.xlb={label:XL_NAME,title:XL_NAME,cat:'Premium Strategy',cols:[],calc:()=>[],live:true,
  nm:p=>XL_NAME+(p.inputsStatus?' '+p.mode:''),
  status:i=>i.p.valuesStatus!==false&&i._xr&&i._xr.stat?'  '+i._xr.stat:'',
  p:XL_DEF, inputsTab:xlInputs, styleTab:xlStyle, visTab:typeof sbxVis==='function'?sbxVis:undefined,
  visOk:i=>{ const [u,m]=tfUnit(), v=i.p.vr&&i.p.vr[u]; return !v||(v.on&&m>=v.min&&m<=v.max); },
  extras:(c,p,inst)=>xlRun(c,p,inst)};
// ================= end of [xlb] Buy/Sell Signals XL =================
try{ DESC.xlb='Premium strategy \u00b7 six BUY / SELL engines (OC, Breakout, Donchian, MA Cross, Supertrend, Aroon) with SL / TP lines, lookback P/L box, multi-timeframe and engine scanners'; }catch(e){}   // picker description
}catch(err){ console.error('xlb strategy failed',err); window.__xlbErr=err; }

// ---- [pfm] INDICATOR: PO3 Fractal Matrix+ - HTF candle block with the C1-C4 sequence, T-Spots, sequence CISD, SMT, PSP, dividers, PDH / PDL and checklist ----
// The fractal model runs on one higher-time-frame candle, folded from the chart candles: C2 trades through one side of C1 and closes back inside its body (or the C3 closure),
// the T-Spot is the half of the candle where the next wick should form, a CISD after C2's extreme and a SMT / PSP against correlated assets confirm it.
try{
const PF_DEF={htf:'Auto',cnt:5,off:10,wid:3,dayOff:0,dir:'Both',gate:'Wait for xC2',c3:true,spot:'Easy',zone:'EQ',keep3:true,spotEq:true,
  assets:'Auto',a1:'',a2:'',a3:'',i1:false,i2:false,i3:false,smt:true,smtTfs:'15m,1H,4H,1D',smtLook:4,smtLn:true,smtLbl:true,psp:true,pspAll:false,
  tags:true,sweep:true,divs:true,pd:true,mid:true,list:true,lpos:'Bottom Center',theme:'Dark',cUp:'#7246CE',cDn:'#8a8f9c'};
const pfSec=iv=>{ const m=/^(\d+)([mhdwM])$/.exec(iv||''); return m?(+m[1])*({m:60,h:3600,d:86400,w:604800,M:2629800}[m[2]]):0; };
const pfNm=s=>s>=2419200?Math.round(s/2629800)+'M':s>=604800?Math.round(s/604800)+'W':s>=86400?Math.round(s/86400)+'D':s>=3600&&s%3600===0?(s/3600)+'H':Math.round(s/60)+'m';
const pfRgba=(c,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'')); if(!m) return c; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const pfFmt=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1000?v.toFixed(1):Math.abs(v)>=100?v.toFixed(2):v.toPrecision(5);
const pfKey=(t,s,o)=>{ if(s>=2419200){ const d=new Date((t-o*3600)*1000); return d.getUTCFullYear()*12+d.getUTCMonth(); } return Math.floor((t-o*3600+(s===604800?345600:0))/s); };
const pfOpenT=(k,s,o)=>{ if(s>=2419200) return Date.UTC(Math.floor(k/12),k%12,1)/1000+o*3600; return k*s-(s===604800?345600:0)+o*3600; };
const pfExt=(g,s)=>s===-1?g.h:g.l, pfExtT=(g,s)=>s===-1?g.hiT:g.loT, pfExtB=(g,s)=>s===-1?g.hiB:g.loB;
// assets: other Binance symbols read on the chart interval (fetched once, cached)
const pfA={};
function pfAssetList(p){ if(p.assets==='Auto'){ const m=/^(.*?)(USDT|USDC|FDUSD|BUSD)$/.exec(String(sym[0])); if(!m) return []; const b=m[1], q=m[2]; const g=b==='BTC'?['ETH','SOL','BNB']:b==='ETH'?['BTC','SOL','BNB']:[]; return g.map(x=>({s:x+q,inv:false})); }
  return [[p.a1,p.i1],[p.a2,p.i2],[p.a3,p.i3]].filter(x=>String(x[0]||'').trim()).map(x=>({s:String(x[0]).trim().toUpperCase(),inv:!!x[1]})); }
function pfAsset(s){ const key=s+'|'+tf[1]; let d=pfA[key]; if(!d) d=pfA[key]={m:null,ts:0,busy:false};
  if(!d.busy&&Date.now()-d.ts>60000){ d.busy=true; fetch(`${RB(s)}/klines?symbol=${s}&interval=${tf[1]}&limit=1000`).then(r=>r.json()).then(a=>{ if(Array.isArray(a)&&a.length){ const m={}; a.forEach(x=>{ m[x[0]/1000]={o:+x[1],h:+x[2],l:+x[3],c:+x[4]}; }); d.m=m; } }).catch(()=>{}).then(()=>{ d.busy=false; d.ts=Date.now(); try{ render(); }catch(e){} }); }
  return d.m; }
function pfCompute(c,p){ const N=c.length, D={ok:false,N}; const cs=pfSec(tf[1]); if(N<30||!cs) return D;
  // HTF pick
  const opts=cs<300?[900,3600,14400]:cs<900?[3600,14400,86400]:cs<3600?[14400,86400,604800]:[86400,604800,2629800];
  let hs=p.htf==='Auto'?0:pfSec(p.htf.toLowerCase().replace('1d','1d')); if(!hs){ hs=opts.find(x=>x/cs>=12)||(opts[2]/cs>1?opts[2]:opts[1]/cs>1?opts[1]:opts[0]); } if(hs<=cs) return D;
  const al=pfAssetList(p), AM=al.map(a=>pfAsset(a.s)), inv=al.map(a=>a.inv), nA=al.length;
  const peerAt=(k,t)=>{ const m=AM[k]; const r=m&&m[t]; return r?{o:r.o,h:r.h,l:r.l,c:r.c,seen:true}:null; };
  const mkPeers=t=>{ const o=[]; for(let k=0;k<nA;k++){ const q=peerAt(k,t); o.push(q||{seen:false}); } return o; };
  const ingest=(book,key,openT,cap,i)=>{ const b=c[i]; let g=book.length?book[book.length-1]:null;
    if(!g||g.key!==key){ book.push({key,t:openT,o:b.open,h:b.high,l:b.low,c:b.close,hiB:i,loB:i,hiT:b.time,loT:b.time,oB:i,full:book.length>0,peers:mkPeers(b.time)}); while(book.length>cap) book.shift(); }
    else { g.c=b.close; if(b.high>g.h){ g.h=b.high; g.hiB=i; g.hiT=b.time; } if(b.low<g.l){ g.l=b.low; g.loB=i; g.loT=b.time; }
      g.peers.forEach((pr,k)=>{ const q=peerAt(k,b.time); if(!q) return; if(pr.seen){ pr.h=Math.max(pr.h,q.h); pr.l=Math.min(pr.l,q.l); } else { pr.o=q.o; pr.h=q.h; pr.l=q.l; pr.seen=true; } pr.c=q.c; }); } };
  const thin=g=>Math.abs(g.c-g.o)<(g.h-g.l)*0.1;
  const psp=g=>{ let rd=0,ag=0; const me=Math.sign(g.c-g.o); g.peers.forEach((pr,k)=>{ if(pr.seen&&pr.o!=null){ rd++; if(Math.sign(pr.c-pr.o)*(inv[k]?-1:1)!==me) ag++; } }); return rd>0&&(p.pspAll?ag===rd:ag>0); };
  const book=[], rec=[], marks=[], cap=Math.max(17,p.cnt+3);
  const c1Of=i=>{ if(i>=1&&!thin(book[i-1])) return i-1; if(i>=2&&thin(book[i-1])&&!thin(book[i-2])) return i-2; return -1; };
  const holds=(i,s)=>{ const e=pfExt(book[i],s); for(let j=i+1;j<book.length;j++){ const x=pfExt(book[j],s); if(s===-1?x>e:x<e) return false; } return true; };
  const seqAt=(s,i)=>{ const n=book.length, j=c1Of(i); if(j<0) return null; const a=book[j], b=book[i], forming=i===n-1, took=s===-1?b.h>a.h:b.l<a.l, far=s===-1?b.l<a.l:b.h>a.h;
    const inB=b.c<Math.max(a.o,a.c)&&b.c>Math.min(a.o,a.c);
    if(took&&(forming||inB)){ if(holds(i,s)) return {side:s,c1:j,c2:i,phase:n-1-i+2,both:far,viaC3:false}; }
    else if(p.c3&&took&&!forming){ const d=book[i+1], past=s===-1?b.c>a.h:b.c<a.l, back=s===-1?d.c<Math.min(b.o,b.c):d.c>Math.max(b.o,b.c); if(past&&back&&holds(i,s)) return {side:s,c1:j,c2:i,phase:n-1-i+2,both:false,viaC3:true}; }
    return null; };
  const evalS=s=>{ const n=book.length; if(n<2) return null; for(let i=n-1;i>=Math.max(1,n-3);i--){ const h=seqAt(s,i); if(h) return h; } return null; };
  const snap=g=>g?{t:g.t,o:g.o,h:g.h,l:g.l,c:g.c,hiB:g.hiB,loB:g.loB,hiT:g.hiT,loT:g.loT,oB:g.oB,full:g.full}:{};
  const forming=r=>r.live&&r.phase===(r.viaC3?3:2);
  const sync=(h,s)=>{ let liveT=null; if(h){ const a=book[h.c1], b=book[h.c2]; liveT=b.t; let r=rec.find(x=>x.side===s&&x.c2.t===b.t);
      if(!r){ r={side:s,c1:{},c2:{},c3:{},c4:{},phase:0,live:false,both:false,viaC3:false,psp:false,smt:false,spent3:false,spent4:false,cxB:null}; rec.push(r); if(rec.length>10) rec.shift(); }
      r.c1=snap(a); r.c2=snap(b); r.both=h.both; r.viaC3=h.viaC3; r.phase=Math.max(r.phase,h.phase); r.live=true;
      if(r.cxB!=null&&r.cxB<=pfExtB(r.c2,s)){ r.cxB=r.cxT=r.cxStartT=r.cxLvl=r.cxBrokeT=null; }
      if(h.phase>=3) r.c3=snap(book[h.c2+1]); if(h.phase>=4) r.c4=snap(book[h.c2+2]); r.psp=psp(b);
      // HTF candle SMT at C2: the chart's C2 took C1's extreme, a correlated asset's C2 did not (once C2 has closed)
      if(nA&&p.smt&&!forming(r)){ const hi=k=>(s===-1)!==inv[k], A1=a.peers, A2=b.peers; let dv=0; for(let k=0;k<nA;k++){ if(A1[k]&&A2[k]&&A1[k].seen&&A2[k].seen){ const r1=hi(k)?A1[k].h:A1[k].l, r2=hi(k)?A2[k].h:A2[k].l; if(hi(k)?r2<=r1:r2>=r1) dv++; } } if(dv>0) r.smt=true; } }
    rec.forEach(x=>{ if(x.side===s){ const still=h&&x.c2.t===liveT; if(x.live&&!still) x.doneT=1; x.live=!!still; } }); };
  const zone=(r,w)=>{ const g=w===3?r.c2:r.c3; if((w===3&&r.viaC3)||g.c==null) return null; let far=null,mid=null,top,bot;
    if(p.zone==='EQ'){ if(w===3){ const ag=r.side===1?g.c<=g.o:g.c>=g.o; far=ag?g.c:pfExt(g,-r.side); mid=ag?(g.c+pfExt(g,r.side))/2:(g.h+g.l)/2; }
      else if(r.viaC3||(r.side===1?g.c>r.c2.h:g.c<r.c2.l)){ far=pfExt(g,-r.side); mid=(g.h+g.l)/2; } if(far==null) return null; top=Math.max(far,mid); bot=Math.min(far,mid); }
    else { const dp=(w===3?50:25)/100, inn=g.c-r.side*(g.h-g.l)*dp; top=Math.max(g.c,inn); bot=Math.min(g.c,inn); }
    return {top,bot,eq:r.side===1?bot:top}; };
  const strong=r=>{ const sp=r.c1.h-r.c1.l, eq=(r.c1.h+r.c1.l)/2, run=r.side===1?r.c1.l-r.c2.l:r.c2.h-r.c1.h, pa=r.side===1?r.c2.c>eq:r.c2.c<eq; return pa&&sp>0&&run>=sp*0.1; };
  const spotOk=r=>{ const cx=r.cxB!=null; switch(p.spot){ case 'Easy': return cx||r.smt; case 'Medium': return cx&&r.smt; case 'Hard': return cx&&r.smt&&r.psp; case 'Max': return cx&&r.smt&&r.psp&&!r.both&&strong(r); default: return true; } };
  const sideOk=s=>p.dir==='Both'||(p.dir==='Bullish only'?s===1:s===-1);
  const otherAlive=r=>rec.some(o=>o.side===-r.side&&o.c2.t===r.c2.t&&o.live);
  const visible=r=>{ let ok=sideOk(r.side); if(ok&&r.both&&p.gate==='Wait for xC2') ok=r.live?!otherAlive(r):r.phase>=4; return ok; };
  const spentNow=(r,w)=>{ const g=w===3?r.c3:r.c4; if(g.t==null) return false; const z=zone(r,w); if(!z) return false; let cl=null;
    if(p.zone==='EQ'){ const i=book.findIndex(x=>x.t===g.t); if(i>=0&&i<book.length-1) cl=book[i].c; } else if(r.phase>=w) cl=book[book.length-1].c;
    return cl!=null&&(r.side===1?cl<z.bot:cl>z.top); };
  // chart SMT timeframes
  const names={'15m':900,'30m':1800,'1H':3600,'90m':5400,'4H':14400,'6H':21600,'1D':86400}, depthOf={900:4,1800:4,3600:6,5400:6,14400:14,21600:10,86400:10};
  const lanes=p.smt&&nA?String(p.smtTfs).split(',').map(x=>x.trim()).map(x=>names[x]||names[x.toUpperCase()]||names[x.toLowerCase()]).filter(s=>s&&s/cs>=6&&s/cs<=100).map(s=>({sec:s,depth:p.smtLook?Math.max(p.smtLook,depthOf[s]||6):depthOf[s]||6,book:[]})):[];
  const untouched=(bk,r,dir)=>{ const lv=pfExt(bk[r],dir); for(let j=r+1;j<=bk.length-2;j++){ const x=pfExt(bk[j],dir); if(dir===-1?x>=lv:x<=lv) return false; } return true; };
  const scan=(L,i)=>{ const bk=L.book, n=bk.length; if(n<2) return; const take=bk[n-1];
    [-1,1].forEach(dir=>{ let got=0; const used=[]; for(let back=1;back<=L.depth;back++){ const r=n-1-back; if(r<0||got>=1||!bk[r].full) continue; const ref=bk[r], lv=pfExt(ref,dir);
      if(!untouched(bk,r,dir)) continue; const took=dir===-1?take.h>lv:take.l<lv; let rd=0,off=0,who=[];
      for(let k=0;k<nA;k++){ const pr=ref.peers[k], pt=take.peers[k]; if(pr&&pt&&pr.seen&&pt.seen){ rd++; const ad=inv[k]?-dir:dir, tk=ad===-1?pt.h>pr.h:pt.l<pr.l; if(tk!==took){ off++; who.push(al[k].s.replace(/(USDT|USDC|FDUSD|BUSD)$/,'')); } } }
      if(rd>0&&off>0&&used.every(u=>Math.abs(u-lv)>cs*0)){ got++; used.push(lv); let d=marks.find(x=>x.sec===L.sec&&x.dir===dir&&x.refOpen===ref.t&&x.takeOpen===take.t); if(!d){ d={sec:L.sec,dir,refOpen:ref.t,takeOpen:take.t}; marks.push(d); }
        Object.assign(d,{refPx:lv,takePx:pfExt(take,dir),refAt:pfExtT(ref,dir),takeAt:pfExtT(take,dir),who:who.join('+'),seen:i}); } } }); };
  const gone=(d,i)=>{ const L=lanes.find(x=>x.sec===d.sec); if(!L||!L.book.length) return true; const live=d.takeOpen===L.book[L.book.length-1].t, b=c[i];
    return d.refOpen<L.book[0].t||(live&&d.seen!==i)||(!live&&(d.dir===-1?b.high>Math.max(d.refPx,d.takePx):b.low<Math.min(d.refPx,d.takePx))); };
  const clean=i=>{ for(let k=marks.length-1;k>=0;k--) if(gone(marks[k],i)) marks.splice(k,1);
    for(let k=marks.length-1;k>=0;k--){ const a=marks[k]; if(marks.some(b=>b!==a&&b.dir===a.dir&&b.sec>a.sec&&(b.takeAt===a.takeAt&&Math.abs(b.takePx-a.takePx)<=cs*1e-9||b.refAt===a.refAt&&Math.abs(b.refPx-a.refPx)<=cs*1e-9))) marks.splice(k,1); }
    const seen={}; for(let k=marks.length-1;k>=0;k--){ const d=marks[k], kk=d.sec+'|'+d.dir; if(seen[kk]) marks.splice(k,1); else seen[kk]=1; } };
  // sequence CISD: a close back through the open of the opposing run before it (2+ candles, within 60 bars)
  const run={dn:{o:null,b:0,n:0,t:0},up:{o:null,b:0,n:0,t:0}};
  const step=(r,same,bef,i)=>{ if(same){ if(bef) r.n++; else { r.n=1; r.o=c[i].open; r.b=i; r.t=c[i].time; } } };
  const lastN=Math.min(N,4000), s0=N-lastN;
  for(let i=s0;i<N;i++){ const b=c[i], conf=i<N-1; ingest(book,pfKey(b.time,hs,p.dayOff),pfOpenT(pfKey(b.time,hs,p.dayOff),hs,p.dayOff),cap,i);
    lanes.forEach(L=>{ const k=pfKey(b.time,L.sec,0); ingest(L.book,k,pfOpenT(k,L.sec,0),L.depth+2,i); scan(L,i); }); if(lanes.length) clean(i);
    const dnB=i>s0&&c[i-1].close<c[i-1].open, upB=i>s0&&c[i-1].close>c[i-1].open; step(run.dn,b.close<b.open,dnB,i); step(run.up,b.close>b.open,upB,i);
    let cxSide=0,cxLvl=null,cxT0=null;
    if(conf){ [[run.dn,1],[run.up,-1]].forEach(([r,sd])=>{ if(cxSide===0&&r.o!=null&&r.n>=2&&i-r.b<=60&&(sd===1?b.close>b.open&&b.close>r.o:b.close<b.open&&b.close<r.o)){ cxSide=sd; cxLvl=r.o; cxT0=r.t; r.o=null; r.n=0; } });
      sync(evalS(-1),-1); sync(evalS(1),1);
      if(cxSide) rec.forEach(r=>{ if(r.live&&r.side===cxSide&&r.cxB==null&&pfExtB(r.c2,r.side)!=null&&i>pfExtB(r.c2,r.side)){ r.cxB=i; r.cxT=b.time; r.cxStartT=cxT0; r.cxLvl=cxLvl; } }); }
    rec.forEach(r=>{ if(r.live&&!r.smt&&lanes.length) marks.forEach(d=>{ if(d.dir===r.side&&d.sec<=hs&&d.takeAt>=r.c2.t&&(r.c3.t==null||d.takeAt<r.c3.t)) r.smt=true; });
      if(r.cxB!=null&&r.cxBrokeT==null&&i>r.cxB&&(r.side===1?b.close<r.cxLvl:b.close>r.cxLvl)) r.cxBrokeT=b.time;
      r.spent3=r.spent3||spentNow(r,3); r.spent4=r.spent4||spentNow(r,4); }); }
  // the one sequence drawn: the newest that passes the filter; a running closed one first
  let shown=null; for(let i=rec.length-1;i>=0&&!shown;i--){ const r=rec[i]; if(r.live&&!forming(r)&&visible(r)&&spotOk(r)) shown=r; }
  for(let i=rec.length-1;i>=0&&!shown;i--){ const r=rec[i]; if(visible(r)&&(r.live||r.phase>=(r.viaC3?4:3))&&spotOk(r)) shown=r; }
  const pend=p.gate!=='Immediate'&&!shown&&rec.some(a=>a.live&&rec.some(b=>b!==a&&b.live&&b.c2.t===a.c2.t&&b.side!==a.side));
  // previous-day high / low on the chart
  let pdH=null,pdL=null,dh=null,dl=null,dhT=0,dlT=0,pdHT=0,pdLT=0,pdk=null; for(let i=s0;i<N;i++){ const k=Math.floor(c[i].time/86400); if(k!==pdk){ if(pdk!=null){ pdH=dh; pdL=dl; pdHT=dhT; pdLT=dlT; } pdk=k; dh=c[i].high; dl=c[i].low; dhT=dlT=c[i].time; } else { if(c[i].high>dh){ dh=c[i].high; dhT=c[i].time; } if(c[i].low<dl){ dl=c[i].low; dlT=c[i].time; } } }
  D.pd=hs<86400&&pdH!=null?{h:pdH,l:pdL,hT:pdHT,lT:pdLT,hTk:c.slice(-N).some(x=>x.time>pdHT&&x.high>pdH),lTk:c.slice(-N).some(x=>x.time>pdLT&&x.low<pdL)}:null;
  Object.assign(D,{ok:true,book,rec,shown,marks,lanes,hs,cs,pend,al,nA,hasData:AM.some(m=>!!m),zone,spotOk,forming:forming(shown||{})}); D.zoneOf=zone; return D; }
let pfMem=null;
function pfGet(c,p){ const N=c.length, key=JSON.stringify(p)+'|'+tf[1]+'|'+sym[0]+'|'+N+'|'+(N?c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:'')+'|'+Object.keys(pfA).map(k=>pfA[k].m?1:0).join('');
  if(pfMem&&pfMem.k===key) return pfMem.D; let D; try{ D=pfCompute(c,p); }catch(e){ console.error('pfm calc failed',e); D={ok:false,N}; } pfMem={k:key,D}; return D; }
IND.pfm={label:'PO3 Fractal Matrix+ \u00b7 C1-C4 sequence, T-Spot, CISD, SMT, PSP',cat:'Trend',nm:()=>'PO3 Fractal Matrix+',p:Object.assign({},PF_DEF),cols:['#7246CE'],
  fields:[['htf','sel','HTF candle timeframe',{opts:['Auto','15m','1h','4h','1d','1w']}],['cnt','num','HTF candles shown',{min:1,max:15}],['off','num','Bars right of price',{min:2,max:100}],['wid','num','Candle width (bars)',{min:1,max:9,step:2}],['dayOff','num','HTF open offset (hours from UTC)',{min:-12,max:12}],
    ['dir','sel','Sequence direction',{opts:['Both','Bullish only','Bearish only']}],['gate','sel','C2 through both sides',{opts:['Wait for xC2','Immediate']}],['c3','chk','C3 closures'],
    ['spot','sel','T-Spot filter',{opts:['Open','Easy','Medium','Hard','Max']}],['zone','sel','T-Spot measured',{opts:['EQ','Depth %']}],['keep3','chk','Keep C3 T-Spot during C4'],['spotEq','chk','T-Spot EQ line'],
    ['assets','sel','Correlated assets',{opts:['Auto','Manual']}],['a1','txt','Asset 1 (Binance symbol)'],['i1','chk','Asset 1 inverse'],['a2','txt','Asset 2'],['i2','chk','Asset 2 inverse'],['a3','txt','Asset 3'],['i3','chk','Asset 3 inverse'],
    ['smt','chk','Show SMT'],['smtTfs','txt','SMT time frames (15m,30m,1H,90m,4H,6H,1D)'],['smtLook','num','SMT lookback (candles)',{min:1,max:20}],['smtLn','chk','SMT lines on chart'],['smtLbl','chk','SMT asset labels'],['psp','chk','PSP candles'],['pspAll','chk','Every asset must disagree'],
    ['tags','chk','C1 / C2 / C3 / C4 tags'],['sweep','chk','C1 sweep line'],['divs','chk','HTF candle dividers'],['pd','chk','PDH / PDL on the chart'],['mid','chk','Candle midpoints'],['list','chk','Checklist'],['lpos','sel','Checklist position',{opts:['Bottom Center','Bottom Right','Bottom Left','Middle Left','Middle Right','Top Left']}],
    ['theme','sel','Theme',{opts:['Dark','Light']}],['cUp','col','Bullish colour'],['cDn','col','Bearish colour']],
  calc:()=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},PF_DEF,p); return {mk:[],boxes:[{type:'pfmview',pts:[],o:q,D:pfGet(c,q)}],labels:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='pfmview') return _D.apply(this,arguments);
  const p=d.o, D=d.D, n0=candles.length; if(!D||!D.ok||n0<5) return; const dark=p.theme!=='Light', ink=dark?'#e6e8ee':'#131722', UP=p.cUp, DN=p.cDn, book=D.book;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  const xe=X(n0-1), xp=X(n0-2), bw=(xe!=null&&xp!=null)?Math.max(1,xe-xp):6, xb=i=>(xe==null?W*0.8:xe)+bw*(i-(n0-1));
  const tIdx=t=>{ let lo=0,hi=n0-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(candles[m].time<=t) lo=m; else hi=m-1; } return lo; }, xt=t=>t<candles[0].time?xb(0):xb(tIdx(t)), xcl=x=>Math.max(-50,Math.min(W+50,x));
  const ln=(x1,x2,y,col,dash,w)=>{ if(y==null) return; cx.strokeStyle=col; cx.lineWidth=w||1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(xcl(x1),y); cx.lineTo(xcl(x2),y); cx.stroke(); cx.setLineDash([]); };
  const sl=(x1,y1,x2,y2,col,dash)=>{ if(y1==null||y2==null) return; cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke(); cx.setLineDash([]); };
  const tx=(t,x,y,col,al,fs,b)=>{ cx.font=(b?'bold ':'')+(fs||9)+'px system-ui'; cx.fillStyle=col||ink; cx.textAlign=al||'center'; cx.fillText(t,x,y); };
  const box=(x1,y1,x2,y2,col,al)=>{ if(y1==null||y2==null) return; cx.fillStyle=pfRgba(col,al); cx.fillRect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.max(1,Math.abs(y2-y1))); };
  const n=book.length, sh=D.shown, S=sh?sh.side:0, ci=t=>book.findIndex(g=>g.t===t), step=p.wid+1, half=(p.wid-1)/2, nS=Math.min(Math.max(p.cnt,sh?n-ci(sh.c1.t):0),n);
  const x0b=n0-1+p.off, xr=xb(x0b+nS*step+7), edge=xb(n0-1+Math.max(1,p.off-7));
  // chart marks of the drawn sequence
  const tag=(t,x,y,up)=>{ if(y==null) return; tx(t,x,y+(up?11:-11),ink,'center',9,true); };
  if(sh){ const s=sh.side, up=s===1; const t1=pfExtT(sh.c1,s), t2=pfExtT(sh.c2,s), p1=pfExt(sh.c1,s), p2=pfExt(sh.c2,s);
    if(p.sweep&&t1!=null){ const to=sh.phase>=3&&sh.c3.t!=null?sh.c3.t:candles[n0-1].time; ln(xt(t1),xt(to),Y(p1),ink,[],1); }
    if(p.tags&&t1!=null&&t2!=null){ tag('C2'+(sh.both?'':'')+(D.nA&&sh.smt?'+SMT':'')+(sh.live&&sh.phase===(sh.viaC3?3:2)&&!sh.viaC3?'?':'')+(sh.psp&&p.psp?' PSP':''),xt(t2),Y(p2),up); tag('C1',xt(t1),Y(p1),up);
      const hc=D.hs/D.cs/2*bw; if(sh.phase>=3&&sh.c3.t!=null&&pfExtT(sh.c3,s)!=null) tag('C3',xt(sh.c3.t)+hc,Y(pfExt(sh.c3,s)),up); if(sh.phase>=4&&sh.c4.t!=null&&pfExtT(sh.c4,s)!=null) tag('C4',xt(sh.c4.t)+hc,Y(pfExt(sh.c4,s)),up); }
    // T-Spots
    [3,4].forEach(w=>{ const g=w===3?sh.c3:sh.c4, spent=w===3?sh.spent3:sh.spent4; if(g.t==null) return; let xe2=w===3&&sh.phase>=4&&sh.c4.t!=null?xt(sh.c4.t):edge; const z=D.zoneOf(sh,w); if(!z||xe2<=xt(g.t)) return; const xs=xt(g.t), eq=z.eq, col=sh.side===1?UP:DN;
      if(spent&&p.spot!=='Open'){ ln(xs,xe2,Y(eq),DN,[2,3],1); tx('XC'+w,xs+4,Y(eq)+(s===1?9:-9),DN,'left',8); }
      else if(sh.phase>=w&&(w===4||sh.phase<4||p.keep3)){ box(xs,Y(z.top),xe2,Y(z.bot),col,dark?0.22:0.14); if(p.spotEq) ln(xs,xe2,Y(eq),col,[],1); tx('C'+w+' T-Spot',xe2+3,Y((z.top+z.bot)/2),ink,'left',8); } });
    // sequence CISD
    if(sh.cxB!=null&&sh.cxStartT!=null){ const col=sh.side===1?UP:DN; ln(xt(sh.cxStartT),xt(sh.cxT)+bw*3,Y(sh.cxLvl),col,sh.cxBrokeT?[2,3]:[],1); tx('CISD',xt(sh.cxT)+bw*3+3,Y(sh.cxLvl),ink,'left',8); } }
  // SMT lines
  if(p.smt&&p.smtLn) D.marks.forEach(m=>{ if(m.takeAt<=m.refAt) return; const x1=xt(m.refAt), x2=xt(m.takeAt), y1=Y(m.refPx), y2=Y(m.takePx); sl(x1,y1,x2,y2,UP); if(y1!=null){ cx.fillStyle=UP; cx.beginPath(); cx.arc(x1,y1,2,0,6.3); cx.fill(); }
    if(p.smtLbl&&y2!=null) tx(m.who||(pfNm(m.sec)+' SMT'),x2,y2+(m.dir===-1?-9:9),UP,'center',8); });
  // dividers
  if(p.divs&&n>1){ const vis=book.slice(-p.cnt); let hi=-Infinity,lo=Infinity; vis.forEach(g=>{ hi=Math.max(hi,g.h); lo=Math.min(lo,g.l); }); vis.forEach(g=>{ if(g.t<candles[0].time) return; const x=xt(g.t), y1=Y(hi), y2=Y(lo); if(y1==null||y2==null) return; ln2(x,y1,y2); if(D.hs>=86400) tx(new Date(g.t*1000).toUTCString().slice(0,3),x,y1-8,ink,'center',8); else tx(new Date(g.t*1000).toISOString().slice(11,16),x,y2+9,ink,'center',8); }); }
  function ln2(x,y1,y2){ cx.strokeStyle=pfRgba(ink,0.45); cx.lineWidth=1; cx.setLineDash([1,3]); cx.beginPath(); cx.moveTo(x,y1); cx.lineTo(x,y2); cx.stroke(); cx.setLineDash([]); }
  // PDH / PDL
  if(p.pd&&D.pd){ const q=D.pd, xR=xb(n0+2); [['PDH',q.h,q.hT,q.hTk],['PDL',q.l,q.lT,q.lTk]].forEach(a=>{ const y=Y(a[1]); ln(xt(a[2]),xR,y,ink,a[3]?[2,3]:[],1); tx(a[0],xR+3,y,ink,'left',9); }); }
  // HTF candle block
  const bwc=(i)=>xb(x0b+i*step+half), bt=[]; const pspOf=(k)=>{ const g=book[k], pv=book[k-1]; return p.psp&&k>=1&&pv&&(g.h>pv.h||g.l<pv.l)&&hasPsp(g); };
  function hasPsp(g){ let rd=0,ag=0; const me=Math.sign(g.c-g.o); g.peers.forEach((pr,k)=>{ if(pr.seen&&pr.o!=null){ rd++; const th=Math.sign(pr.c-pr.o)*(p['i'+(k+1)]&&p.assets==='Manual'?-1:1); if(th!==me) ag++; } }); return rd>0&&(p.pspAll?ag===rd:ag>0); }
  let hiV=-Infinity,loV=Infinity; const tagAt={}; if(sh){ const mp={}; [['c1','C1'],['c2',null],['c3','C3'],['c4','C4']].forEach(([k,nm])=>{ const g=sh[k]; if(g.t==null) return; const j=ci(g.t); if(j<0) return; if(k==='c2') tagAt[j]='C2'+(D.nA&&sh.smt?'+SMT':'')+(sh.psp&&p.psp?' PSP':''); else if(!tagAt[j]||k==='c1') tagAt[j]=nm; }); }
  for(let i=0;i<nS;i++){ const k=n-nS+i, g=book[k]; if(!g) continue; const x=bwc(i), bull=g.c>=g.o, b1=Math.max(g.o,g.c), b2=Math.min(g.o,g.c), yb1=Y(b1), yb2=Y(b2), yh=Y(g.h), yl=Y(g.l); if(yb1==null||yb2==null||yh==null||yl==null) continue;
    const w=bw*(p.wid), xl=x-w/2; const fill=pspOf(k)?pfRgba(bull?UP:DN,0.55):bull?(dark?'#e6e8ee':'#ffffff'):(dark?'#4b5060':'#505050');
    cx.fillStyle=fill; cx.fillRect(xl,Math.min(yb1,yb2),w,Math.max(1,Math.abs(yb2-yb1))); cx.strokeStyle=k===n-1?UP:ink; cx.lineWidth=1; cx.strokeRect(xl,Math.min(yb1,yb2),w,Math.max(1,Math.abs(yb2-yb1)));
    cx.strokeStyle=ink; cx.beginPath(); cx.moveTo(x,yh); cx.lineTo(x,Math.min(yb1,yb2)); cx.moveTo(x,Math.max(yb1,yb2)); cx.lineTo(x,yl); cx.stroke();
    if(p.mid) ln(xl-bw,xl+w+bw,Y((g.h+g.l)/2),pfRgba(ink,0.5),[1,2],1);
    hiV=Math.max(hiV,g.h); loV=Math.min(loV,g.l); if(p.tags&&tagAt[k]) tx(tagAt[k],x,yl+11,ink,'center',9,true); }
  const hiY=Y(hiV), loY=Y(loV); if(hiY!=null){ const last=book[n-1], left=Math.max(0,last.t+D.hs-candles[n0-1].time-D.cs), nm=pfNm(D.hs), mm=Math.floor(left/60), cd=left>=86400?Math.floor(left/86400)+'d '+Math.floor(left%86400/3600)+'h':Math.floor(left/3600)+':'+String(mm%60).padStart(2,'0');
    tx('\u25cc '+nm+' \u00b7 '+cd,bwc(nS/2-0.5),hiY-9,ink,'center',10,true); tx(nm,bwc(nS/2-0.5),loY+(Object.keys(tagAt).length?24:10),ink,'center',10,true); }
  // previous candle high / low and the live T-Spot on the block
  if(n>=2){ const pv=book[n-2], nm=D.hs>=86400?(D.hs>=2419200?'PM':D.hs>=604800?'PW':'PD'):pfNm(D.hs)+' ', xs=bwc(nS-2), xR2=xb(x0b+nS*step); [['H',pv.h],['L',pv.l]].forEach(a=>{ ln(xs,xR2+bw,Y(a[1]),ink,[],1); tx(nm+a[0],xR2+bw+3,Y(a[1]),ink,'left',9); }); }
  if(sh&&p.spot!=='Open'||sh){ const w=sh.phase>=4?4:3, g=w===4?sh.c4:sh.c3, z=D.zoneOf(sh,w), j=g.t!=null?ci(g.t):-1, dead=w===4?sh.spent4:sh.spent3; if(z&&j>=0&&!(dead&&p.spot!=='Open')){ const i=j-(n-nS), col=sh.side===1?UP:DN; if(i>=0){ box(bwc(i)-bw*step/2,Y(z.top),xR2f(),Y(z.bot),col,dark?0.22:0.14); if(p.spotEq) ln(bwc(i)-bw*step/2,xR2f(),Y(z.eq),col,[],1); } } }
  function xR2f(){ return xb(x0b+nS*step); }
  // checklist
  if(p.list){ const dr=sh, ph=!D.hasData&&D.nA?'':'', rows=[['PO3 Fractalized',!dr?'WAITING':dr.live?'\u25cf LIVE':'DONE'],['PHASE',dr?(dr.side===1?'\u2191 ':'\u2193 ')+(D.forming?(dr.viaC3?'C3?':dr.both?'xC2?':'C2?'):dr.both&&dr.phase===3?'xC2':'C'+dr.phase)+(dr.live?'':' done'):D.pend?'xC2 both sides':'none'],
      [dr&&dr.viaC3?'C3 CLOSED':'C2 CLOSED',dr&&!D.forming&&dr.phase>=3?'\u2713':'\u00d7'],['CISD',dr&&dr.cxB!=null?'\u2713':'\u00d7'],['SMT',dr&&dr.smt?'\u2713':'\u00d7'],['PSP',dr&&dr.psp?'\u2713':'\u00d7'],
      ['T-SPOT',dr&&dr.phase>=3?((dr.phase>=4?dr.spent4:dr.spent3)?'spent':'live'):'--'],['ASSETS',D.nA?D.al.map(a=>a.s.replace(/(USDT|USDC|FDUSD|BUSD)$/,'')+(a.inv?' inv':'')).join(' \u00b7 ')+(D.hasData?'':' (loading)'):'none']];
    const fs=10,rh=fs+8,m=6; cx.font=fs+'px system-ui'; let w1=0,w2=0; rows.forEach(r=>{ w1=Math.max(w1,cx.measureText(r[0]).width); w2=Math.max(w2,cx.measureText(r[1]).width); }); const pw=w1+w2+32, phh=rows.length*rh, lp=p.lpos;
    const x0=/Left/.test(lp)?m:/Center/.test(lp)?(W-pw)/2:W-pw-m, y0=/Top/.test(lp)?m+34:/Bottom/.test(lp)?H-phh-m-24:(H-phh)/2;
    cx.fillStyle=dark?'rgba(14,17,26,.88)':'rgba(255,255,255,.92)'; cx.fillRect(x0,y0,pw,phh); rows.forEach((r,k)=>{ const y=y0+k*rh+rh/2; tx(r[0],x0+8,y,ink,'left',fs,k===0); tx(r[1],x0+pw-8,y,k===0?'#7246CE':ink,'right',fs,k===0); });
    cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,phh); }
  cx.restore(); }; }
try{ DESC.pfm='PO3 fractal model on a higher-time-frame candle: C1-C4 sequence, T-Spots, sequence CISD, SMT and PSP against correlated assets, dividers, PDH / PDL and a checklist'; }catch(e){}
}catch(err){ console.error('pfm indicator failed',err); window.__pfmErr=err; }

// ---- [f17] INDICATOR: DrFX God Mode X - Fusion17 Adaptive Consensus - 17 weighted engine votes, confirmed LONG / SHORT signals, structure, FVGs, risk geometry and HUD ----
// Each of the 17 engines gives a bounded vote in [-1,+1]; the weighted agreement is a rule score (not a probability). Signals print on closed candles only.
try{
const F7_DEF={fastLen:21,slowLen:55,biasLen:200,pivotLen:5,minScore:62,minEdge:20,cool:8,regLen:24,reqTrend:true,noChop:true,gate:false,minBr:7,adapt:true,
  showFVG:true,fvgAtr:0.22,maxGaps:6,showSw:true,showStr:true,showCloud:true,showPD:true,showRisk:true,atrStop:1.8,rr1:1.5,rr2:3,proj:22,hud:true,hpos:'Top Right',life:true,theme:'Dark',cUp:'#1ae7a0',cDn:'#ff4f7a'};
const F7_N=['APEX Control','Crypto Hunter','Dark Knight','Fury FX','FX Pro Adaptive','GOD / Prop Hunt','ICT Structure','QMAE Entropy','RAPTOR Wave','SW Force','Trader Scalper','TRH Zones','VENOM Fusion','VP Vision','Volume Trader','Diamond HTF','AtroNox VWAP'];
const F7_W=[1.25,1,1.1,.8,1,.75,1.2,.75,.9,.7,.9,1,.55,.7,.75,.65,.6];
const f7c=(x,a,b)=>Math.min(b,Math.max(a,x)), f7v=x=>x==null||!isFinite(x)?null:f7c(x,-1,1), nz=(x,d)=>x==null||!isFinite(x)?(d==null?0:d):x;
function f7ema(v,n){ const k=2/(n+1), o=new Array(v.length).fill(null); let p=null; for(let i=0;i<v.length;i++){ if(v[i]==null) continue; p=p==null?v[i]:k*v[i]+(1-k)*p; o[i]=p; } return o; }
function f7rma(v,n){ const o=new Array(v.length).fill(null); let p=null,s=0,c=0; for(let i=0;i<v.length;i++){ if(v[i]==null) continue; if(p==null){ s+=v[i]; c++; if(c===n){ p=s/n; o[i]=p; } } else { p=(p*(n-1)+v[i])/n; o[i]=p; } } return o; }
function f7sma(v,n){ const o=new Array(v.length).fill(null); for(let i=n-1;i<v.length;i++){ let s=0,ok=true; for(let j=i-n+1;j<=i;j++){ if(v[j]==null){ ok=false; break; } s+=v[j]; } if(ok) o[i]=s/n; } return o; }
function f7sd(v,n){ const o=new Array(v.length).fill(null); for(let i=n-1;i<v.length;i++){ let s=0,q=0,ok=true; for(let j=i-n+1;j<=i;j++){ if(v[j]==null){ ok=false; break; } s+=v[j]; q+=v[j]*v[j]; } if(ok) o[i]=Math.sqrt(Math.max(0,q/n-(s/n)*(s/n))); } return o; }
function f7lin(v,n,off){ const o=new Array(v.length).fill(null); for(let i=n-1+off;i<v.length;i++){ const e=i-off; let sx=0,sy=0,sxy=0,sxx=0,ok=true; for(let j=0;j<n;j++){ const y=v[e-n+1+j]; if(y==null){ ok=false; break; } sx+=j; sy+=y; sxy+=j*y; sxx+=j*j; } if(!ok) continue; const b=(n*sxy-sx*sy)/(n*sxx-sx*sx), a=(sy-b*sx)/n; o[i]=a+b*(n-1); } return o; }
const f7hi=(v,i,n)=>{ let m=-Infinity; for(let j=Math.max(0,i-n+1);j<=i;j++) if(v[j]>m) m=v[j]; return m; }, f7lo=(v,i,n)=>{ let m=Infinity; for(let j=Math.max(0,i-n+1);j<=i;j++) if(v[j]<m) m=v[j]; return m; };
function f7htf(c,sec,cs){ // last CLOSED higher-time-frame close and its EMA50 on that candle's close, per bar
  const o=new Array(c.length).fill(null); if(sec<=cs) return o; const cl=[]; let key=null,last=null; const E=[]; let e=null;
  for(let i=0;i<c.length;i++){ const k=Math.floor(c[i].time/sec); if(key!=null&&k!==key){ cl.push(last); e=e==null?last:last*(2/51)+e*(1-2/51); E.push(e); } key=k; last=c[i].close; if(E.length) o[i]={c:cl[cl.length-1],e:E[E.length-1],ok:cl.length>=2}; } return o; }
function f7calc(c,p){ const N=c.length, D={ok:false,N}; if(N<60) return D; const cs=c.length>1?c[N-1].time-c[N-2].time:60;
  const O=c.map(x=>x.open),H=c.map(x=>x.high),L=c.map(x=>x.low),C=c.map(x=>x.close),V=c.map(x=>x.volume),hasV=V.some(x=>x>0),T=c.map(x=>x.time);
  const tr=C.map((_,i)=>i?Math.max(H[i]-L[i],Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1])):H[i]-L[i]); const atr=f7rma(tr,14), atrA=f7sma(atr,50), mt=1e-9;
  const eF=f7ema(C,p.fastLen), eS=f7ema(C,p.slowLen), eB=f7ema(C,p.biasLen), hlc=C.map((_,i)=>(H[i]+L[i]+C[i])/3);
  // RSI, MACD, DMI/ADX
  const chg=C.map((x,i)=>i?x-C[i-1]:null), rsiG=f7rma(chg.map(x=>x==null?null:Math.max(x,0)),14), rsiL=f7rma(chg.map(x=>x==null?null:Math.max(-x,0)),14), rsi=rsiG.map((g,i)=>g==null||rsiL[i]==null?null:rsiL[i]===0?100:100-100/(1+g/rsiL[i]));
  const e12=f7ema(C,12), e26=f7ema(C,26), ml=C.map((_,i)=>e12[i]-e26[i]), sg=f7ema(ml,9), mh=ml.map((x,i)=>x-sg[i]);
  const pdm=C.map((_,i)=>i?(H[i]-H[i-1]>L[i-1]-L[i]&&H[i]-H[i-1]>0?H[i]-H[i-1]:0):null), mdm=C.map((_,i)=>i?(L[i-1]-L[i]>H[i]-H[i-1]&&L[i-1]-L[i]>0?L[i-1]-L[i]:0):null);
  const tr14=f7rma(tr,14), pD=f7rma(pdm,14).map((x,i)=>x==null||!tr14[i]?null:100*x/tr14[i]), mD=f7rma(mdm,14).map((x,i)=>x==null||!tr14[i]?null:100*x/tr14[i]), dx=pD.map((x,i)=>x==null||mD[i]==null||x+mD[i]===0?null:100*Math.abs(x-mD[i])/(x+mD[i])), adx=f7rma(dx,14);
  // Supertrend(2.7, 11): up = true when bullish
  const a11=f7rma(tr,11), stUp=new Array(N).fill(true); { let fu=null,fl=null,up=true; for(let i=0;i<N;i++){ if(a11[i]==null) continue; const m=(H[i]+L[i])/2, bu=m+2.7*a11[i], bl=m-2.7*a11[i]; fu=(fu==null||bu<fu||C[i-1]>fu)?bu:fu; fl=(fl==null||bl>fl||C[i-1]<fl)?bl:fl; if(up&&C[i]<fl) up=false; else if(!up&&C[i]>fu) up=true; stUp[i]=up; } }
  const vm=f7sma(V,20), rv=V.map((x,i)=>hasV&&vm[i]?x/vm[i]:null), vpr=V.map((x,i)=>hasV?x*(C[i]-O[i])/Math.max(H[i]-L[i],mt):null), fS=f7ema(vpr,5), vE=f7ema(V,5), flow=fS.map((x,i)=>hasV&&x!=null&&vE[i]?100*x/Math.max(vE[i],1):null);
  const aCh=f7sma(chg.map(x=>x==null?null:Math.abs(x)),p.regLen);
  const rs=C.map((_,i)=>(H[i]-L[i])||mt), cp=C.map((_,i)=>(C[i]-O[i])/rs[i]), press=f7ema(cp,8);
  // KAMA
  const kam=new Array(N).fill(null); { let k=null; for(let i=0;i<N;i++){ if(i<10||aCh[i]==null){ continue; } const dl=Math.abs(C[i]-C[i-10]); let nz2=0; for(let j=0;j<10;j++) nz2+=Math.abs(C[i-j]-C[i-j-1]); const er=nz2>0?dl/nz2:0, sc=Math.pow(er*(2/3-2/31)+2/31,2); k=k==null?C[i]:k+sc*(C[i]-k); kam[i]=k; } }
  const mfiA=(()=>{ const o=new Array(N).fill(null); for(let i=14;i<N;i++){ let pu=0,pd=0; for(let j=i-13;j<=i;j++){ const f=hlc[j]*V[j]; if(hlc[j]>hlc[j-1]) pu+=f; else if(hlc[j]<hlc[j-1]) pd+=f; } o[i]=pd===0?100:100-100/(1+pu/pd); } return o; })();
  const vw=(()=>{ const o=new Array(N).fill(null); for(let i=33;i<N;i++){ let s=0,w=0; for(let j=i-33;j<=i;j++){ s+=C[j]*V[j]; w+=V[j]; } o[i]=w>0?s/w:null; } return o; })();
  const ls30=f7lin(C,30,0), ls34=f7lin(C,34,0), hl34=f7ema(hlc,34), sd34=f7sd(hlc,34), e34=f7ema(C,34), chn=C.map((_,i)=>i>=p.fastLen?{u:f7hi(H,i-1,21),l:f7lo(L,i-1,21)}:null), roc7=C.map((x,i)=>i>=7?100*(x/C[i-7]-1):null);
  // previous day high / low (UTC day), session VWAP
  const pdH=new Array(N).fill(null), pdL=new Array(N).fill(null), vwp=new Array(N).fill(null); { let dk=null,dh=0,dl=0,ph=null,pl=null,sv=0,sw=0; for(let i=0;i<N;i++){ const k=Math.floor(T[i]/86400); if(k!==dk){ if(dk!=null){ ph=dh; pl=dl; } dk=k; dh=H[i]; dl=L[i]; sv=0; sw=0; } else { dh=Math.max(dh,H[i]); dl=Math.min(dl,L[i]); } sv+=hlc[i]*V[i]; sw+=V[i]; pdH[i]=ph; pdL[i]=pl; vwp[i]=hasV&&sw>0?sv/sw:null; } }
  const h1=f7htf(c,3600,cs), h2=f7htf(c,14400,cs), intraday=cs<86400;
  // structure, FVG, signals
  let lsh=null,lsl=null,ms=0,lastSig=-1e9,dem=null,sup=null; const sig=[], marks=[], gaps=[], pv=p.pivotLen; let last=null, entropyHist=0;
  for(let i=0;i<N;i++){ const A=atr[i]; if(i>=2*pv){ const q=i-pv; let ph=true,pl=true; for(let j=q-pv;j<=q+pv;j++){ if(j===q) continue; if(H[j]>H[q]||(j>q&&H[j]===H[q])) ph=false; if(L[j]<L[q]||(j>q&&L[j]===L[q])) pl=false; } if(ph) lsh=H[q]; if(pl) lsl=L[q]; }
    const bullBreak=i>0&&lsh!=null&&C[i]>lsh&&C[i-1]<=lsh, bearBreak=i>0&&lsl!=null&&C[i]<lsl&&C[i-1]>=lsl, bullCh=bullBreak&&ms===-1, bearCh=bearBreak&&ms===1; if(bullBreak) ms=1; if(bearBreak) ms=-1;
    const swL=lsl!=null&&L[i]<lsl&&C[i]>lsl, swH=lsh!=null&&H[i]>lsh&&C[i]<lsh; if(A==null) { continue; }
    if(p.showStr&&(bullBreak||bearBreak)) marks.push({i,t:bullCh?'CHoCH':bearCh?'CHoCH':'BOS',up:bullBreak,k:1}); if(p.showSw&&(swL||swH)) marks.push({i,t:'SWP',up:swL,k:2});
    const bullF=i>=2&&L[i]>H[i-2]&&(L[i]-H[i-2])>=A*p.fvgAtr, bearF=i>=2&&H[i]<L[i-2]&&(L[i-2]-H[i])>=A*p.fvgAtr;
    for(const g of gaps){ if(g.end==null&&(g.bull?L[i]<=g.bot:H[i]>=g.top)) g.end=i; } if(bullF) gaps.push({i:i-2,top:L[i],bot:H[i-2],bull:true,end:null}); if(bearF) gaps.push({i:i-2,top:L[i-2],bot:H[i],bull:false,end:null});
    if(bullBreak){ dem=null; for(let k=1;k<=8&&i-k>=0;k++) if(C[i-k]<O[i-k]){ dem={top:Math.max(O[i-k],C[i-k]),bot:L[i-k]}; break; } } if(bearBreak){ sup=null; for(let k=1;k<=8&&i-k>=0;k++) if(C[i-k]>O[i-k]){ sup={top:H[i-k],bot:Math.min(O[i-k],C[i-k])}; break; } }
    if(dem&&C[i]<dem.bot) dem=null; if(sup&&C[i]>sup.top) sup=null;
    if(adx[i]==null||eB[i]==null||rsi[i]==null||i<p.biasLen||kam[i]==null) continue;
    const trending=adx[i]>=23, eff=(()=>{ const d=Math.abs(C[i]-C[Math.max(0,i-p.regLen)]), t=nz(aCh[i])*p.regLen; return t>0?f7c(d/t,0,1):0; })(), tnd=adx[i]>=23&&eff>=.28, chop=adx[i]<17||eff<.17;
    // entropy
    let su=0,sf=0,sd=0; const W=28; for(let n=0;n<W;n++){ const m=C[i-n]-C[i-n-1], b=Math.max(nz(atr[i-n],mt),mt)*.16; if(m>b) su++; else if(m<-b) sd++; else sf++; }
    const up=su/W,fp=sf/W,dp=sd/W, sh=-(up>0?up*Math.log(up):0)-(fp>0?fp*Math.log(fp):0)-(dp>0?dp*Math.log(dp):0), ent=f7c(sh/Math.log(3),0,1), entC=1-ent;
    const a=Math.max(A,mt), v=new Array(17).fill(null);
    v[0]=f7v(((eF[i]-eS[i])/a)*.65+((C[i]-eB[i])/a)*.25);
    const ch=chn[i]; v[1]=ch?f7v((C[i]>ch.u?.6:C[i]<ch.l?-.6:0)+(nz(roc7[i])/Math.max(100*a/Math.max(Math.abs(C[i]),mt),.1))*.12):null;
    v[2]=f7v((stUp[i]?1:-1)*f7c(adx[i]/27,.2,1));
    v[3]=hasV?f7v(nz(flow[i])/55*.6+nz(press[i])*.4):null;
    v[4]=f7v(((C[i]-kam[i])/a)*.35+((kam[i]-nz(kam[i-3],kam[i]))/a)*.8);
    const pH=pdH[i],pL=pdL[i]; v[5]=intraday&&pH!=null?f7v((C[i]>pH?.85:C[i]<pL?-.85:(C[i]-(pH+pL)/2)/Math.max(pH-pL,mt))*.95):null;
    const bF=bullF?.35:bearF?-.35:swL?.3:swH?-.3:0; v[6]=f7v((ms===1?.48:ms===-1?-.48:0)+bF);
    v[7]=f7v((up-dp)*(.42+entC));
    const wS=(C[i]-C[i-2])/a, wL=(C[i-2]-C[i-4])/a; const spec=wS-wL, reg=ls30[i], regS=reg==null?0:(reg-nz(ls30[i-4],reg))/a; v[8]=f7v(.45*spec+.55*regS);
    const force=cp[i]*(hasV?f7c(nz(rv[i]),0,2.5)/1.4:1); v[9]=f7v(force);
    const bE=C[i]>O[i]&&C[i-1]<O[i-1]&&C[i]>=O[i-1]&&O[i]<=C[i-1], rE=C[i]<O[i]&&C[i-1]>O[i-1]&&C[i]<=O[i-1]&&O[i]>=C[i-1]; v[10]=f7v((C[i]-e34[i])/a*.52+(bE?.42:rE?-.42:0));
    const dsp=Math.abs(C[i]-O[i])/a; v[11]=f7v((dem&&L[i]<=dem.top+A*.5&&C[i]>dem.bot?.55:sup&&H[i]>=sup.bot-A*.5&&C[i]<sup.top?-.55:0)+(bullBreak?.45:bearBreak?-.45:0)*f7c(dsp,.25,1.4));
    v[12]=f7v(((eF[i]>eS[i]?1:-1)+(stUp[i]?1:-1)+(mh[i]>0?1:-1))/3*f7c(adx[i]/23,.35,1));
    v[13]=hasV&&vw[i]!=null?f7v((C[i]-vw[i])/a*.58):null;
    v[14]=hasV&&mfiA[i]!=null?f7v(((mfiA[i]-50)/50)*.8+f7c(nz(rv[i])-1,-1,1)*cp[i]*.2):null;
    let hs=0,hn=0; [h1[i],h2[i]].forEach((h,k)=>{ if(h&&h.ok&&[3600,14400][k]>cs){ hs+=h.c>h.e?1:-1; hn++; } }); v[15]=hn?f7v(hs/hn):null;
    const vv=intraday&&vwp[i]!=null?(C[i]>vwp[i]?1:-1):(C[i]>eB[i]?1:-1); v[16]=f7v((vv+(rsi[i]>50?1:-1)+(eS[i]>eS[i-3]?1:-1))/3);
    const w=F7_W.slice(); let bp=0,rp=0,pp=0,wi=0,nm=0,bb=0,rb=0; const drift=0;
    for(let k=0;k<17;k++){ if(p.adapt){ if(chop&&[0,1,2,8,12].includes(k)) w[k]*=.72; if(tnd&&(k===6||k===11)) w[k]*=1.14; if(ent>.92&&(k===1||k===8)) w[k]*=.79; } const x=v[k]; if(x==null) continue; bp+=f7c((x+.12)/1.12,0,1)*w[k]; rp+=f7c((-x+.12)/1.12,0,1)*w[k]; pp+=w[k]; wi+=x*w[k]; nm++; if(x>.24) bb++; if(x<-.24) rb++; }
    const bull=pp>0?100*bp/pp:0, bear=pp>0?100*rp/pp:0, edge=bull-bear, chopVeto=p.noChop&&chop&&ent>.89;
    const tl=!p.reqTrend||(eF[i]>eS[i]&&C[i]>=eB[i]), ts=!p.reqTrend||(eF[i]<eS[i]&&C[i]<=eB[i]);
    const upX=C[i]>eF[i]&&C[i-1]<=eF[i-1], dnX=C[i]<eF[i]&&C[i-1]>=eF[i-1], eU=eF[i]>eS[i]&&eF[i-1]<=eS[i-1], eD=eF[i]<eS[i]&&eF[i-1]>=eS[i-1], sU=stUp[i]&&!stUp[i-1], sD=!stUp[i]&&stUp[i-1];
    const lt=upX||eU||bullBreak||bullF||sU||(bE&&C[i]>kam[i])||(ch&&C[i]>ch.u&&C[i-1]<=nz(chn[i-1]&&chn[i-1].u,ch.u)), st=dnX||eD||bearBreak||bearF||sD||(rE&&C[i]<kam[i])||(ch&&C[i]<ch.l&&C[i-1]>=nz(chn[i-1]&&chn[i-1].l,ch.l));
    const okc=i-lastSig>p.cool&&i<N-1&&!chopVeto, L2=okc&&lt&&tl&&bull>=p.minScore&&edge>=p.minEdge&&(!p.gate||bb>=p.minBr), S2=okc&&st&&ts&&bear>=p.minScore&&edge<=-p.minEdge&&(!p.gate||rb>=p.minBr);
    if(L2||S2){ lastSig=i; const r=A*p.atrStop, d=L2?1:-1; sig.push({i,d,score:L2?bull:bear,e:C[i],sl:C[i]-d*r,t1:C[i]+d*r*p.rr1,t2:C[i]+d*r*p.rr2,ch:L2?bullCh:bearCh}); }
    if(i===N-1) last={v,w,bull,bear,edge,nm,bb,rb,adx:adx[i],ent,eff,tnd,chop,chopVeto,atr:A,imp:pp>0?wi/pp:0,ms,swL,swH,bullF,bearF,rv:rv[i],mfi:mfiA[i],vwma:vw[i],hs:hn?hs/hn:null}; }
  if(!last) return D;
  // reference lifecycle of the newest signal
  let ref='NO REFERENCE'; const sg0=sig[sig.length-1]; if(sg0){ ref='ACTIVE REFERENCE'; for(let i=sg0.i+1;i<N-1;i++){ const sT=sg0.d===1?L[i]<=sg0.sl:H[i]>=sg0.sl, tT=sg0.d===1?H[i]>=sg0.t1:L[i]<=sg0.t1; if(sT&&tT){ ref='AMBIGUOUS PATH'; break; } if(sT){ ref='STOP REFERENCE TOUCHED'; break; } if(tT){ ref='TP1 REFERENCE TOUCHED'; break; } } }
  Object.assign(D,{ok:true,eF,eS,eB,sig,marks,gaps,last,ref,pdH:pdH[N-1],pdL:pdL[N-1],intraday,hasV}); return D; }
let f7m=null;
function f7get(c,p){ const N=c.length, key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[1]+'|'+N+'|'+(N?c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(f7m&&f7m.k===key) return f7m.D; let D; try{ D=f7calc(c,p); }catch(e){ console.error('f17 calc failed',e); D={ok:false}; } f7m={k:key,D}; return D; }
IND.f17={label:'DrFX God Mode X \u00b7 Fusion17 Adaptive Consensus (17 engines)',cat:'Trend',nm:()=>'DrFX Fusion17',p:Object.assign({},F7_DEF),cols:['#23deea'],
  fields:[['fastLen','num','Fast EMA',{min:2,max:200}],['slowLen','num','Slow EMA',{min:3,max:300}],['biasLen','num','Macro EMA',{min:20,max:500}],['pivotLen','num','Confirmed swing depth',{min:2,max:20}],['minScore','num','Minimum 17-engine agreement',{min:35,max:95}],['minEdge','num','Minimum long / short score edge',{min:0,max:70}],['cool','num','Bars between signals',{min:0,max:100}],['regLen','num','Regime lookback',{min:8,max:100}],
    ['reqTrend','chk','Require trend alignment'],['noChop','chk','Avoid signals in strong chop'],['gate','chk','Require directional engine breadth'],['minBr','num','Minimum engine breadth',{min:3,max:15}],['adapt','chk','Adjust engine weights by regime'],
    ['showFVG','chk','Fair value gaps'],['fvgAtr','num','Minimum FVG width (ATR)',{min:0.05,max:2,step:0.01}],['maxGaps','num','Live gaps per side',{min:1,max:15}],['showSw','chk','Liquidity sweep markers'],['showStr','chk','BOS / CHoCH markers'],['showCloud','chk','Trend cloud'],['showPD','chk','Previous day high / low'],
    ['showRisk','chk','Draw last signal risk geometry'],['atrStop','num','Stop distance (ATR)',{min:0.3,max:6,step:0.1}],['rr1','num','Take profit 1 (R)',{min:0.5,max:8,step:0.25}],['rr2','num','Take profit 2 (R)',{min:1,max:15,step:0.25}],['proj','num','Projection width (bars)',{min:5,max:100}],['life','chk','Monitor last signal outcome'],
    ['hud','chk','Show dashboard'],['hpos','sel','Dashboard position',{opts:['Top Right','Top Left','Bottom Right','Bottom Left','Middle Right']}],['theme','sel','Theme',{opts:['Dark','Light']}],['cUp','col','Bullish colour'],['cDn','col','Bearish colour']],
  calc:()=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},F7_DEF,p), D=f7get(c,q); return {mk:[],boxes:[{type:'f17view',pts:[],o:q,D}],labels:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='f17view') return _D.apply(this,arguments);
  const p=d.o, D=d.D, n0=candles.length; if(!D||!D.ok||n0<5) return; const dark=p.theme!=='Light', fg=dark?'#e6f4fb':'#131722', mute=dark?'#7f9cb2':'#5b6784', UP=p.cUp, DN=p.cDn, i0=Math.max(0,n0-1500);
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  const xe=X(n0-1), xp=X(n0-2), bw=(xe!=null&&xp!=null)?Math.max(1,xe-xp):6, xb=i=>(xe==null?W*.8:xe)+bw*(i-(n0-1)), vis=i=>{ const x=xb(i); return x>-20&&x<W+20; };
  const path=(arr,col,w)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.beginPath(); let on=false; for(let i=i0;i<n0;i++){ const v=arr[i], x=xb(i); if(v==null||x<-20||x>W+20){ on=false; continue; } const y=Y(v); if(y==null){ on=false; continue; } if(on) cx.lineTo(x,y); else { cx.moveTo(x,y); on=true; } } cx.stroke(); };
  const tx=(t,x,y,col,fs,b)=>{ cx.font=(b?'bold ':'')+(fs||9)+'px system-ui'; cx.fillStyle=col; cx.textAlign='center'; cx.fillText(t,x,y); };
  if(p.showCloud){ cx.fillStyle=D.eF[n0-1]>=D.eS[n0-1]?'rgba(26,231,160,.12)':'rgba(255,79,122,.12)'; cx.beginPath(); let st=false, last=null; for(let i=i0;i<n0;i++){ const a=D.eF[i], b=D.eS[i], x=xb(i); if(a==null||b==null||x<-20||x>W+20) continue; const y=Y(a); if(y==null) continue; if(!st){ cx.moveTo(x,y); st=true; } else cx.lineTo(x,y); last=i; }
    for(let i=last==null?-1:last;i>=i0;i--){ const b=D.eS[i], x=xb(i); if(b==null||x<-20||x>W+20) continue; const y=Y(b); if(y!=null) cx.lineTo(x,y); } cx.fill(); path(D.eF,'rgba(35,222,234,.95)',2); path(D.eS,'rgba(147,114,255,.95)',2); }
  path(D.eB,'rgba(253,193,85,.8)',2);
  // FVGs
  if(p.showFVG){ [true,false].forEach(bl=>{ const g=D.gaps.filter(x=>x.bull===bl&&x.end==null).slice(-p.maxGaps); g.forEach(x=>{ const y1=Y(x.top), y2=Y(x.bot); if(y1==null||y2==null) return; const x0=xb(x.i); cx.fillStyle=bl?'rgba(26,231,160,.14)':'rgba(255,79,122,.14)'; cx.fillRect(x0,Math.min(y1,y2),W-x0,Math.max(1,Math.abs(y2-y1))); }); }); }
  if(p.showPD&&D.intraday&&D.pdH!=null){ [[D.pdH,'PD H'],[D.pdL,'PD L']].forEach(a=>{ const y=Y(a[0]); if(y==null) return; cx.strokeStyle='rgba(253,193,85,.6)'; cx.setLineDash([2,3]); cx.beginPath(); cx.moveTo(0,y); cx.lineTo(W,y); cx.stroke(); cx.setLineDash([]); cx.font='9px system-ui'; cx.fillStyle='#fdc155'; cx.textAlign='right'; cx.fillText(a[1],W-4,y-6); }); }
  D.marks.forEach(m=>{ if(m.i<i0||!vis(m.i)) return; const cd=candles[m.i], x=xb(m.i), y=Y(m.up?cd.low:cd.high); if(y==null) return; tx(m.t,x,y+(m.up?10:-10),m.k===1?(m.up?'#23deea':'#fdc155'):'#9372ff',8); });
  D.sig.forEach(s=>{ if(s.i<i0||!vis(s.i)) return; const cd=candles[s.i], x=xb(s.i), up=s.d===1, y=Y(up?cd.low:cd.high); if(y==null) return; const col=up?UP:DN, t=(up?'\u25b2 LONG ':'\u25bc SHORT ')+Math.round(s.score), yy=y+(up?8:-8); cx.font='bold 9px system-ui'; const w=cx.measureText(t).width+8; cx.fillStyle=col; cx.fillRect(x-w/2,up?yy:yy-14,w,14); cx.fillStyle=dark?'#080d1b':'#fff'; cx.textAlign='center'; cx.fillText(t,x,up?yy+7:yy-7); });
  const sg=D.sig[D.sig.length-1]; if(p.showRisk&&sg){ const x1=xb(sg.i), x2=xb(sg.i+p.proj), ys=Y(sg.sl), ye=Y(sg.e), y1=Y(sg.t1), y2=Y(sg.t2); if(ye!=null&&ys!=null&&y2!=null){ cx.fillStyle='rgba(255,79,122,.10)'; cx.fillRect(x1,Math.min(ye,ys),x2-x1,Math.abs(ys-ye)); cx.fillStyle='rgba(26,231,160,.10)'; cx.fillRect(x1,Math.min(ye,y2),x2-x1,Math.abs(y2-ye));
      [[ye,fg,[],'ENTRY '+sg.e.toPrecision(6)],[ys,'#ff4f7a',[5,4],'STOP '+sg.sl.toPrecision(6)],[y1,'#1ae7a0',[2,3],'TP1 '+sg.t1.toPrecision(6)],[y2,'#23deea',[5,4],'TP2 '+sg.t2.toPrecision(6)]].forEach(a=>{ if(a[0]==null) return; cx.strokeStyle=a[1]; cx.lineWidth=1.5; cx.setLineDash(a[2]); cx.beginPath(); cx.moveTo(x1,a[0]); cx.lineTo(x2,a[0]); cx.stroke(); cx.setLineDash([]); cx.font='9px system-ui'; cx.fillStyle=a[1]; cx.textAlign='left'; cx.fillText(a[3],x2+3,a[0]); }); } }
  // dashboard
  if(p.hud){ const L=D.last, fs=9, rh=fs+7, m=6, sgn=v=>v>=.24?'\u25b2 BULL':v<=-.24?'\u25bc BEAR':'\u25c6 NEUTRAL', col=v=>v>=.24?'#1ae7a0':v<=-.24?'#ff4f7a':'#fdc155', bar=v=>{ const n=Math.round(f7c(Math.abs(v),0,1)*8); return '\u25b0'.repeat(n)+'\u25b1'.repeat(8-n); };
    const bias=L.edge>18?'BULLISH CONFLUENCE':L.edge<-18?'BEARISH CONFLUENCE':'MIXED / NEUTRAL', bc=L.edge>18?'#1ae7a0':L.edge<-18?'#ff4f7a':'#fdc155';
    const rows=[['DRFX GOD MODE X \u00b7 FUSION 17','',bc,true],['REGIME '+(L.chopVeto?'CHOP FILTER':L.tnd?'DIRECTIONAL':L.chop?'RANGE / CHOP':'TRANSITION'),'ADX '+L.adx.toFixed(1)+' \u00b7 ENT '+L.ent.toFixed(2),'#23deea',false],['BULL '+L.bull.toFixed(1),'BEAR '+L.bear.toFixed(1),fg,true]];
    F7_N.forEach((n,k)=>{ const v=L.v[k]; rows.push([String(k+1).padStart(2,'0')+' '+n,v==null?'N/A':bar(v)+' '+v.toFixed(2)+' '+sgn(v),v==null?mute:col(v),false]); });
    rows.push(['EDGE '+L.edge.toFixed(1)+' pts \u00b7 '+bias,L.nm+' / 17 computed',bc,true],['STRUCTURE '+(L.ms===1?'BULLISH':L.ms===-1?'BEARISH':'UNDEFINED'),'BREADTH '+Math.max(L.bb,L.rb),fg,false]);
    if(p.life&&sg) rows.push([(sg.d===1?'LAST: LONG ':'LAST: SHORT ')+sg.e.toPrecision(6),D.ref,fg,false]); rows.push(['INDICATOR ONLY \u00b7 RULE AGREEMENT, NOT A PROBABILITY','',mute,false]);
    cx.font=fs+'px system-ui'; let w1=0,w2=0; rows.forEach(r=>{ w1=Math.max(w1,cx.measureText(r[0]).width); w2=Math.max(w2,cx.measureText(r[1]).width); }); const pw=Math.min(W-2*m,w1+w2+28), ph=rows.length*rh, lp=p.hpos, x0=/Left/.test(lp)?m:W-pw-m, y0=/Top/.test(lp)?m+34:/Bottom/.test(lp)?H-ph-m-24:(H-ph)/2;
    cx.fillStyle=dark?'rgba(8,13,27,.9)':'rgba(255,255,255,.93)'; cx.fillRect(x0,y0,pw,ph); rows.forEach((r,k)=>{ const y=y0+k*rh+rh/2; cx.font=(r[3]?'bold ':'')+fs+'px system-ui'; cx.fillStyle=r[2]; cx.textAlign='left'; cx.fillText(r[0],x0+7,y); cx.textAlign='right'; cx.fillText(r[1],x0+pw-7,y); }); cx.strokeStyle='rgba(60,100,130,.6)'; cx.strokeRect(x0,y0,pw,ph); }
  cx.restore(); }; }
// alert: a new confirmed LONG / SHORT, once, when its candle has closed
function f7Alerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='f17'||!i._xr||!i._xr.sigs||!show(i)) return; let quiet=q; if(i._f7K!==key){ i._f7K=key; i._f7L=0; quiet=true; } i._xr.sigs.forEach(s=>{ const t=candles[s.i]&&candles[s.i].time; if(!t||t>cc||t<=(i._f7L||0)) return; i._f7L=t; if(quiet||t!==cc) return; toast('DrFX Fusion17 \u00b7 '+(s.d===1?'LONG':'SHORT')+' \u00b7 '+Math.round(s.score)+' \u00b7 '+sym[0]+' '+tf[0],s.d===1?'#2e7d32':'#c62828'); }); }); }
{ const _e=IND.f17.extras; IND.f17.extras=(c,p)=>{ const r=_e(c,p); r.sigs=r.boxes[0].D.ok?r.boxes[0].D.sig:[]; return r; }; }
{ const _R=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_R.apply(this,arguments); try{ f7Alerts(q); }catch(e){ console.error('f17 alerts',e); } return rv; }; }
try{ DESC.f17='17 weighted engine votes into one rule score, confirmed LONG / SHORT signals with risk geometry, BOS / CHoCH, sweeps, FVGs, trend cloud and a diagnostic dashboard'; }catch(e){}
}catch(err){ console.error('f17 indicator failed',err); window.__f17Err=err; }

// ---- [sxl] INDICATOR: Sessions [LuxAlgo] - port of the Pine v6 script "Sessions [LuxAlgo]" (c) LuxAlgo, CC BY-NC-SA 4.0 ----
// Four trading sessions (default New York, London, Tokyo, Sydney). Each one can draw a range box (high to low), a linear-regression trendline, the running mean,
// a session VWAP and its Max / Min extended until the next session. Optional dashboard (status; advanced adds trend correlation, volume and sigma),
// session dividers along the bottom and a daily divider with the weekday name. Needs an intraday chart. Session hours are read at a fixed UTC offset.
try{
const SX_K=['a','b','c','d'];
const SX_DEF={utc:0,exch:false,transp:90,outline:true,rlabel:true,aCol:'#ff5d00',bCol:'#2157f3',cCol:'#e91e63',dCol:'#ffeb3b',
  dash:false,adv:false,dpos:'Top Right',dsize:'Small',sdiv:false,ddiv:true};
[['New York','1300-2200'],['London','0700-1600'],['Tokyo','0000-0900'],['Sydney','2100-0600']].forEach((a,j)=>{ const k=SX_K[j]; SX_DEF[k+'On']=true; SX_DEF[k+'Name']=a[0]; SX_DEF[k+'Hrs']=a[1]; SX_DEF[k+'Rng']=true; SX_DEF[k+'Trd']=false; SX_DEF[k+'Mean']=false; SX_DEF[k+'Vwap']=false; SX_DEF[k+'Mm']=false; });
const SX_MIN=[[780,1320],[420,960],[0,540],[1260,360]];
const SX_FS={Tiny:8,Small:10,Normal:12,Large:14,Huge:18};
const SX_DAY=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function sxSess(s,d){ const m=/^\s*(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})\s*$/.exec(String(s||'')); return m?[(+m[1])*60+(+m[2]),(+m[3])*60+(+m[4])]:d; }
const sxIn=(m,s)=>s[0]<=s[1]?(m>=s[0]&&m<s[1]):(m>=s[0]||m<s[1]);
function sxIv(c){ let m=0; for(let i=c.length-1;i>0&&i>c.length-40;i--){ const d=c[i].time-c[i-1].time; if(d>0&&(m===0||d<m)) m=d; } return m; }
function sxA(hex,a){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
function sxVol(v){ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return a>=1e9?(v/1e9).toFixed(2)+'B':a>=1e6?(v/1e6).toFixed(2)+'M':a>=1e3?(v/1e3).toFixed(2)+'K':v.toFixed(2); }
function sxCompute(c,p,iv){ const N=c.length, D={N,ok:false,msg:'',S:[]}; if(N<2||!iv) return D;
  if(iv>=86400){ D.msg='Sessions needs an intraday chart'; return D; }
  const off=p.exch?0:Math.max(-12,Math.min(14,Math.round(+p.utc)||0)), mins=new Array(N);
  for(let i=0;i<N;i++) mins[i]=(((Math.floor(c[i].time/60)+off*60)%1440)+1440)%1440;
  SX_K.forEach((k,j)=>{ const s=sxSess(p[k+'Hrs'],SX_MIN[j]), on=!!p[k+'On'], act=new Uint8Array(N), runs=[], vw=on&&p[k+'Vwap']?new Array(N).fill(null):null; let cur=null;
    for(let i=0;i<N;i++){ const a=on&&sxIn(mins[i],s)?1:0; act[i]=a; if(!a){ cur=null; continue; } const b=c[i], v=b.volume||0;
      if(!cur){ cur={a:i,b:i,hi:b.high,lo:b.low,n:0,sY:0,sXY:0,sY2:0,nu:0,de:0}; runs.push(cur); }
      cur.b=i; if(b.high>cur.hi) cur.hi=b.high; if(b.low<cur.lo) cur.lo=b.low; cur.n++; cur.sY+=b.close; cur.sXY+=b.close*cur.n; cur.sY2+=b.close*b.close; cur.nu+=b.close*v; cur.de+=v;
      if(vw) vw[i]=cur.de!==0?cur.nu/cur.de:null; }
    runs.forEach(r=>{ const n=r.n, avg=r.sY/n, wa=r.sXY/(n*(n+1)/2), cov=(wa-avg)*(n+1)/2, vr=Math.max(r.sY2/n-avg*avg,0), den=Math.sqrt(vr)*(Math.sqrt(n*n-1)/(2*Math.sqrt(3)));
      r.mean=avg; r.dev=Math.sqrt(vr); r.cor=n>1&&den!==0?cov/den:null; r.f=n>1?4*avg-3*wa:r.sY; r.l=n>1?3*wa-2*avg:r.sY; });
    D.S.push({k,j,on,act,runs,vw,last:runs.length?runs[runs.length-1]:null,live:N>0&&act[N-1]===1}); });
  D.ok=true; return D; }
let sxMem=null;
function sxGet(c,p){ const N=c.length, iv=sxIv(c), key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low+'|'+(c[N-1].volume||0):''); if(sxMem&&sxMem.k===key) return sxMem.D;
  let D; try{ D=sxCompute(c,p,iv); }catch(e){ console.error('sxl calc failed',e); D={N,ok:false,msg:'',S:[]}; } sxMem={k:key,D}; return D; }
const sxF=[];
SX_K.forEach((k,j)=>{ const g='Session '+k.toUpperCase()+' \u00b7 '; sxF.push([k+'On','chk',g+'Enable'],[k+'Name','txt',g+'Name'],[k+'Hrs','txt',g+'Hours (e.g. 1300-2200)'],[k+'Rng','chk',g+'Range box'],[k+'Trd','chk',g+'Trendline'],[k+'Mean','chk',g+'Mean'],[k+'Vwap','chk',g+'VWAP'],[k+'Mm','chk',g+'Max / Min'],[k+'Col','col',g+'Colour']); });
IND.sxl={label:'Sessions [LuxAlgo]',cat:'Trend',nm:()=>'Sessions [LuxAlgo]',p:Object.assign({},SX_DEF),cols:['#ff5d00'],
  fields:sxF.concat([['utc','num','Timezone: UTC offset (+/-)',{min:-12,max:14}],['exch','chk','Use exchange timezone (crypto data is UTC)'],
    ['transp','num','Range area transparency (0 solid, 100 invisible)',{min:0,max:100}],['outline','chk','Range outline'],['rlabel','chk','Range label'],
    ['dash','chk','Dashboard'],['adv','chk','Dashboard: advanced (trend, volume, sigma)'],['dpos','sel','Dashboard position',{opts:['Top Right','Bottom Right','Bottom Left']}],['dsize','sel','Dashboard size',{opts:['Tiny','Small','Normal','Large','Huge']}],
    ['sdiv','chk','Show sessions divider (bottom of chart)'],['ddiv','chk','Show daily divider']]),
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},SX_DEF,p), D=sxGet(c,q); return {mk:[],boxes:[{type:'sxlview',pts:[],o:q,D}],labels:[],events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='sxlview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, N=candles.length; if(!D||!N) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.textBaseline='middle';
    if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); }
    if(D.ok){ const xa=X(0), xb=X(N-1); let i0=0, i1=N-1;
      if(xa!=null&&xb!=null&&N>1){ const dx=(xb-xa)/(N-1); if(dx>0){ i0=Math.max(0,Math.floor((-30-xa)/dx)); i1=Math.min(N-1,Math.ceil((W+30-xa)/dx)); } }
      D.S.forEach(S=>{ if(!S.on) return; const col=p[S.k+'Col'], name=p[S.k+'Name'];
        S.runs.forEach((r,ri)=>{ if(r.b<i0||r.a>i1) return; const x0=X(r.a), x1=X(r.b); if(x0==null||x1==null) return;
          if(p[S.k+'Rng']){ const yT=Y(r.hi), yB=Y(r.lo); if(yT!=null&&yB!=null){ cx.fillStyle=sxA(col,Math.max(0,Math.min(1,1-(+p.transp||0)/100))); cx.fillRect(x0,yT,Math.max(1,x1-x0),yB-yT);
              if(p.outline){ cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([1,3]); cx.strokeRect(x0+.5,yT+.5,Math.max(1,x1-x0),yB-yT); cx.setLineDash([]); }
              if(p.rlabel){ cx.font='9px system-ui,sans-serif'; cx.fillStyle=col; cx.textAlign='center'; cx.textBaseline='bottom'; cx.fillText(name,(x0+x1)/2,yT-2); cx.textBaseline='middle'; } } }
          if(p[S.k+'Trd']){ const y0=Y(r.f), y1=Y(r.l); if(y0!=null&&y1!=null){ cx.strokeStyle=col; cx.lineWidth=1; cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y1); cx.stroke(); } }
          if(p[S.k+'Mean']){ const y=Y(r.mean); if(y!=null){ cx.strokeStyle=col; cx.lineWidth=1; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); } } });
        if(S.vw){ cx.strokeStyle=col; cx.lineWidth=1; cx.beginPath(); let pen=false; for(let i=Math.max(0,i0-1);i<=i1;i++){ const v=S.vw[i]; if(v==null){ pen=false; continue; } const x=X(i), y=Y(v); if(x==null||y==null){ pen=false; continue; } if(pen) cx.lineTo(x,y); else{ cx.moveTo(x,y); pen=true; } } cx.stroke(); }
        if(p[S.k+'Mm']) S.runs.forEach((r,ri)=>{ const nx=S.runs[ri+1], e=nx?nx.a-1:N-1, a=r.b+1; if(a>e||e<i0||a>i1) return; const xs=X(a), xe=X(e); if(xs==null||xe==null) return; cx.strokeStyle=col; cx.lineWidth=1; [r.hi,r.lo].forEach(v=>{ const y=Y(v); if(y==null) return; cx.beginPath(); cx.moveTo(xs,y); cx.lineTo(xe,y); cx.stroke(); }); }); });
      // session dividers: a dot on every active bar and a bar mark at each start / end, along the bottom
      if(p.sdiv){ cx.font='9px system-ui,sans-serif'; cx.textAlign='center'; D.S.forEach(S=>{ if(!S.on) return; const col=p[S.k+'Col'], y=H-8-S.j*8; for(let i=Math.max(0,i0);i<=i1;i++){ const a=S.act[i], pa=i>0?S.act[i-1]:0, x=X(i); if(x==null) continue;
          if(a){ cx.fillStyle=col; cx.beginPath(); cx.arc(x,y,1.3,0,6.2832); cx.fill(); } if(a!==pa){ cx.fillStyle=col; cx.fillText('\u275a',x,y-3); } } }); }
      // daily divider with the weekday name (new day at 00:00 UTC)
      if(p.ddiv){ cx.strokeStyle='rgba(158,158,158,.8)'; cx.lineWidth=1; cx.setLineDash([5,4]); cx.font='9px system-ui,sans-serif'; cx.textAlign='center'; cx.fillStyle='#9e9e9e';
        for(let i=Math.max(1,i0);i<=i1;i++){ const dw=new Date(candles[i].time*1000).getUTCDay(); if(dw===new Date(candles[i-1].time*1000).getUTCDay()) continue; const x=X(i); if(x==null) continue; cx.beginPath(); cx.moveTo(x,0); cx.lineTo(x,H); cx.stroke(); cx.setLineDash([]); cx.fillText(SX_DAY[dw],x,10); cx.setLineDash([5,4]); }
        cx.setLineDash([]); }
      // dashboard
      if(p.dash){ const fs=SX_FS[p.dsize]||10, rh=fs+8, adv=!!p.adv, cols=adv?5:2, heads=['Session','Status','Trend','Volume','\u03c3'], rows=D.S.map(S=>{ const on=S.on, st=on?(S.live?'Active':'Inactive'):'Disabled', la=S.last;
          const cor=la&&la.cor!=null?(Math.round(la.cor*100)/100).toString():'-', dev=la?la.dev.toFixed(4):'-', vol=la?sxVol(la.de):'-';
          return {name:p[S.k+'Name'],nc:p[S.k+'Col'],st,sc:on?(S.live?'#089981':'#f23645'):'#808080',cor,cc:la&&la.cor!=null?(la.cor>=0?'#089981':'#f23645'):null,dev,vol}; });
        cx.font=fs+'px system-ui,sans-serif'; const cw=new Array(cols).fill(0); const meas=(i,t)=>{ cw[i]=Math.max(cw[i],cx.measureText(t).width+12); };
        heads.slice(0,cols).forEach((h,i)=>meas(i,h)); rows.forEach(r=>{ meas(0,r.name); meas(1,r.st); if(adv){ meas(2,r.cor); meas(3,r.vol); meas(4,r.dev); } });
        const tw=cw.reduce((a,b)=>a+b,0), th=rh*(rows.length+2), pos=p.dpos||'Top Right', tx=pos==='Bottom Left'?8:W-tw-8, ty=pos==='Top Right'?8:H-th-8;
        cx.fillStyle='#161616'; cx.fillRect(tx,ty,tw,th); cx.strokeStyle='#2E2E2E'; cx.lineWidth=1; cx.strokeRect(tx+.5,ty+.5,tw,th);
        cx.fillStyle='#DBDBDB'; cx.textAlign='center'; cx.fillText('Sessions [LuxAlgo]',tx+tw/2,ty+rh/2);
        cx.strokeStyle='#2E2E2E'; cx.beginPath(); cx.moveTo(tx,ty+rh); cx.lineTo(tx+tw,ty+rh); cx.stroke();
        let x=tx; heads.slice(0,cols).forEach((h,i)=>{ cx.fillStyle='#808080'; if(i===0){ cx.textAlign='left'; cx.fillText(h,x+6,ty+rh*1.5); } else{ cx.textAlign='right'; cx.fillText(h,x+cw[i]-6,ty+rh*1.5); } x+=cw[i]; });
        rows.forEach((r,k)=>{ const y=ty+rh*(k+2)+rh/2; let x2=tx; const cells=[[r.name,r.nc,null],[r.st,'#DBDBDB',r.sc],[r.cor,'#DBDBDB',r.cc],[r.vol,'#DBDBDB',null],[r.dev,'#DBDBDB',null]];
          cells.slice(0,cols).forEach((cl,i)=>{ if(cl[2]){ cx.fillStyle=cl[2]; cx.fillRect(x2,y-rh/2,cw[i],rh); } cx.fillStyle=cl[1]; if(i===0){ cx.textAlign='left'; cx.fillText(cl[0],x2+6,y); } else{ cx.textAlign='right'; cx.fillText(cl[0],x2+cw[i]-6,y); } x2+=cw[i]; }); }); } }
    cx.restore(); }; }
try{ DESC.sxl='Four trading sessions (New York, London, Tokyo, Sydney): range boxes, trendline, mean, VWAP, Max / Min, a dashboard, session dividers and a daily divider'; }catch(e){}
}catch(err){ console.error('sxl indicator failed',err); window.__sxlErr=err; }

// ---- [mrs] PREMIUM STRATEGY: Mean Reversion - Bollinger Bands (20, 2) and / or RSI (14) stretch, close back inside, SL beyond the extreme wick, TP at the mean ----
// Price tends to snap back to its average after an over-extended move. The tool waits for the stretch, then for the exhaustion, then prints the trade:
//  1. STRETCH  - a candle pierces the outer Bollinger Band, and / or RSI goes beyond 70 / 30 (the mode decides which one is needed, or both).
//  2. ENTRY    - ONLY when a candle CLOSES back inside the bands (RSI mode: RSI closes back inside 30 - 70). The entry is that close. Closed candles only, nothing repaints.
//  3. STOP     - just beyond the extreme wick of the stretch (plus a small ATR pad).
//  4. TARGET   - the mean: the middle Bollinger band (the 20 SMA) or the 50-period moving average. Fixed when the signal prints.
//  5. FILTERS  - ranging market only (ADX), no news-spike candles (a very tall candle in the stretch cancels the setup), optional band-width and volume dry-up filters.
// Look: Bollinger bands + mean line, a blue "Stretch" box over the over-extended leg, TP / SL boxes, a yellow circle on the entry (like an order-block chart).
try{
const MR_DEF={bbLen:20,bbMult:2,rsiLen:14,mode:'Bollinger Bands',rsiOB:70,rsiOS:30,look:3,sameBar:true,
  useAdx:true,adxLen:14,adxMax:25,useSpike:true,spikeMult:3,atrLen:14,useBw:false,minBw:1,useVol:false,volMult:1,
  tpMode:'Middle band',maLen:50,slPad:0.1,minRR:1,maxBars:60,
  showBands:true,showStretch:true,showBox:true,showCircle:true,showArrows:true,showLabels:true,keep:8,
  showStats:true,statPos:'Top right',cLong:'#26a69a',cShort:'#ef5350',cStretch:'#2962ff',cEntry:'#ffeb3b',
  alLong:true,alShort:true,alTP:false,alSL:false,alSound:false};
const mrA=(hex,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const mrFR=v=>Number.isInteger(+v)?(+v).toFixed(1):(+v).toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
const mrFx=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=100?v.toFixed(2):Math.abs(v)>=1?v.toFixed(4):v.toFixed(6);
function mrSma(v,n){ const N=v.length, o=new Float64Array(N).fill(NaN); let s=0; for(let i=0;i<N;i++){ s+=v[i]; if(i>=n) s-=v[i-n]; if(i>=n-1) o[i]=s/n; } return o; }
function mrStd(v,m,n){ const N=v.length, o=new Float64Array(N).fill(NaN); for(let i=n-1;i<N;i++){ let s=0; for(let k=i-n+1;k<=i;k++){ const d=v[k]-m[i]; s+=d*d; } o[i]=Math.sqrt(s/n); } return o; }
function mrRsi(v,L){ const N=v.length, o=new Float64Array(N).fill(NaN); if(N<=L) return o; let g=0,l=0; for(let i=1;i<=L;i++){ const d=v[i]-v[i-1]; if(d>0) g+=d; else l-=d; } g/=L; l/=L; o[L]=l===0?100:100-100/(1+g/l);
  for(let i=L+1;i<N;i++){ const d=v[i]-v[i-1]; g=(g*(L-1)+(d>0?d:0))/L; l=(l*(L-1)+(d<0?-d:0))/L; o[i]=l===0?100:100-100/(1+g/l); } return o; }
function mrAtr(c,L){ const N=c.length, o=new Float64Array(N).fill(NaN); let pc=null,rma=null,sum=0; for(let i=0;i<N;i++){ const h=c[i].high,l=c[i].low,tr=pc==null?h-l:Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)); pc=c[i].close;
    if(i<L-1) sum+=tr; else if(i===L-1){ sum+=tr; rma=sum/L; o[i]=rma; } else { rma=(rma*(L-1)+tr)/L; o[i]=rma; } } return o; }
function mrAdx(c,L){ const N=c.length, o=new Float64Array(N).fill(NaN); if(N<2*L+1) return o; let sT=0,sP=0,sM=0; const dx=new Float64Array(N).fill(NaN);
  for(let i=1;i<N;i++){ const h=c[i].high,l=c[i].low,ph=c[i-1].high,pl=c[i-1].low,pc=c[i-1].close, up=h-ph, dn=pl-l, pdm=(up>dn&&up>0)?up:0, mdm=(dn>up&&dn>0)?dn:0, tr=Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc));
    if(i<=L){ sT+=tr; sP+=pdm; sM+=mdm; } else { sT=sT-sT/L+tr; sP=sP-sP/L+pdm; sM=sM-sM/L+mdm; }
    if(i>=L&&sT>0){ const pi=100*sP/sT, mi=100*sM/sT; dx[i]=(pi+mi)>0?100*Math.abs(pi-mi)/(pi+mi):0; } }
  let s=0; for(let i=L;i<2*L;i++) s+=dx[i]; let a=s/L; o[2*L-1]=a; for(let i=2*L;i<N;i++){ a=(a*(L-1)+dx[i])/L; o[i]=a; } return o; }
function mrInd(c,p){ const N=c.length, cl=new Float64Array(N); for(let i=0;i<N;i++) cl[i]=c[i].close;
  const bl=Math.max(2,Math.round(+p.bbLen)||20), basis=mrSma(cl,bl), sd=mrStd(cl,basis,bl), k=+p.bbMult||2, up=new Float64Array(N), lo=new Float64Array(N);
  for(let i=0;i<N;i++){ up[i]=basis[i]+k*sd[i]; lo[i]=basis[i]-k*sd[i]; }
  const ma=p.tpMode==='Middle band'?basis:mrSma(cl,Math.max(2,Math.round(+p.maLen)||50));
  const vol=new Float64Array(N); for(let i=0;i<N;i++) vol[i]=+c[i].volume||0;
  return {basis,up,lo,mean:ma,rsi:mrRsi(cl,Math.max(2,Math.round(+p.rsiLen)||14)),atr:mrAtr(c,Math.max(2,Math.round(+p.atrLen)||14)),adx:mrAdx(c,Math.max(2,Math.round(+p.adxLen)||14)),vavg:mrSma(vol,20),vol}; }
// one pass per direction: d=+1 works on the real prices (BUY, stretch down), d=-1 on mirrored prices (SELL, stretch up), so the logic is written once
function mrScan(c,p,I,d,n,D){
  const H=new Float64Array(c.length),L=new Float64Array(c.length),C=new Float64Array(c.length),LO=new Float64Array(c.length),RS=new Float64Array(c.length);
  for(let i=0;i<c.length;i++){ H[i]=d>0?c[i].high:-c[i].low; L[i]=d>0?c[i].low:-c[i].high; C[i]=d*c[i].close; LO[i]=d>0?I.lo[i]:-I.up[i]; RS[i]=d>0?I.rsi[i]:100-I.rsi[i]; }
  const thr=d>0?(+p.rsiOS||30):100-(+p.rsiOB||70), look=Math.max(1,Math.round(+p.look)||3), mode=p.mode, wantBB=mode!=='RSI', wantRS=mode!=='Bollinger Bands', NONE=-1e9;
  let lastBB=NONE,lastRS=NONE,ext=NaN,st=-1;
  for(let i=0;i<n;i++){
    if(!(LO[i]===LO[i])||(wantRS&&!(RS[i]===RS[i]))||!(I.atr[i]>0)){ lastBB=NONE; lastRS=NONE; ext=NaN; st=-1; continue; }
    if(wantBB&&L[i]<LO[i]) lastBB=i; if(wantRS&&RS[i]<thr) lastRS=i;
    const aBB=lastBB>NONE&&i-lastBB<=look, aRS=lastRS>NONE&&i-lastRS<=look;
    if(!aBB&&!aRS){ ext=NaN; st=-1; continue; }
    if(!(ext===ext)){ ext=L[i]; st=i; } else if(L[i]<ext) ext=L[i];
    const bbSet=wantBB&&aBB&&(lastBB<i||p.sameBar), rsSet=wantRS&&aRS, bbBack=C[i]>=LO[i], rsBack=RS[i]>=thr;
    let fire=false;
    if(mode==='Bollinger Bands') fire=bbSet&&bbBack; else if(mode==='RSI') fire=rsSet&&rsBack; else if(mode==='Bollinger + RSI') fire=bbSet&&rsSet&&bbBack; else fire=(bbSet&&bbBack)||(rsSet&&rsBack);
    if(!fire) continue;
    const src=(bbSet&&bbBack)?'Band':'RSI', s0=st, ex=ext; lastBB=NONE; lastRS=NONE; ext=NaN; st=-1;   // the setup is used up, signal or not
    const a=I.atr[i];
    if(p.useAdx&&!(I.adx[i]<=(+p.adxMax||25))) continue;                                           // trending market: no mean reversion
    if(p.useSpike){ let bad=false; for(let k=s0;k<=i;k++) if(H[k]-L[k]>(+p.spikeMult||3)*a){ bad=true; break; } if(bad) continue; }   // news-spike candle inside the stretch
    if(p.useBw&&!((I.up[i]-I.lo[i])/I.basis[i]*100>=(+p.minBw||0))) continue;
    if(p.useVol&&I.vavg[i]>0&&!(I.vol[i]<=(+p.volMult||1)*I.vavg[i])) continue;
    const entry=C[i], sl=ex-(+p.slPad||0)*a, risk=entry-sl, tp=d*I.mean[i]; if(!(risk>0)||!(tp>entry)) continue;
    const rr=(tp-entry)/risk; if(rr<(+p.minRR||0)) continue;
    const tr={d,i,s0,time:c[i].time,entry:d*entry,sl:d*sl,tp:d*tp,ext:d*ex,band:d*LO[i],rr,res:'open',end:n-1,r:0,src};
    for(let k=i+1;k<n;k++){ if(k-i>(+p.maxBars||60)){ tr.res='time'; tr.end=k-1; tr.r=(C[k-1]-entry)/risk; break; }
      if(L[k]<=sl){ tr.res='sl'; tr.end=k; tr.r=-1; break; } if(H[k]>=tp){ tr.res='tp'; tr.end=k; tr.r=rr; break; } }
    D.tr.push(tr); } }
function mrCompute(c,p,forming){
  const N=c.length, D={N,ok:false,msg:'',tr:[],ev:[],I:null,st:null};
  const need=Math.max(+p.bbLen||20,+p.rsiLen||14,2*(+p.adxLen||14),+p.maLen||50)+10; if(N<need){ D.msg='Mean Reversion: needs at least '+need+' candles (loaded '+N+')'; return D; }
  const n=forming?N-1:N, I=mrInd(c,p); D.I=I;
  mrScan(c,p,I,1,n,D); mrScan(c,p,I,-1,n,D);
  D.tr.sort((x,y)=>x.i-y.i);
  let cnt=0,wins=0,net=0,gw=0,gl=0;
  D.tr.forEach(t=>{ D.ev.push({type:t.d>0?'long':'short',time:t.time,idx:t.i,price:t.entry}); if(t.res==='tp'||t.res==='sl'){ D.ev.push({type:t.res,time:c[t.end].time,idx:t.end,price:t.res==='tp'?t.tp:t.sl}); }
    if(t.res!=='open'){ cnt++; net+=t.r; if(t.r>0){ wins++; gw+=t.r; } else gl+=Math.abs(t.r); } });
  D.ev.sort((x,y)=>x.time-y.time);
  D.st={n:cnt,wr:cnt?100*wins/cnt:0,net,pf:gl>0?gw/gl:(gw>0?99:0),avg:cnt?net/cnt:0,open:D.tr.filter(t=>t.res==='open').length};
  D.ok=true; return D; }
let mrMem=null;
function mrGet(c,p){ const N=c.length, iv=N>1?c[N-1].time-c[N-2].time:0, forming=N>0&&iv>0&&(c[N-1].time+iv)*1000>Date.now();
  const key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+forming+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(mrMem&&mrMem.k===key) return mrMem.D;
  let D; try{ D=mrCompute(c,p,forming); }catch(e){ console.error('mrs calc failed',e); D={N,ok:false,msg:'',tr:[],ev:[],I:null,st:null}; } mrMem={k:key,D}; return D; }
IND.mrs={label:'Mean Reversion \u00b7 Bollinger Bands + RSI',title:'Mean Reversion \u00b7 Bollinger Bands + RSI',cat:'Premium Strategy',nm:p=>'Mean Reversion '+(p&&p.bbLen||20)+' / '+(p&&p.bbMult||2),p:Object.assign({},MR_DEF),cols:['#2962ff','#ff9800','#2962ff'],
  fields:[['mode','sel','Setup (what must stretch)',{opts:['Bollinger Bands','RSI','Bollinger + RSI','Bollinger or RSI']}],
    ['bbLen','num','Bollinger length',{min:5,max:200}],['bbMult','num','Bollinger multiplier (std dev)',{min:0.5,max:5,step:0.1}],
    ['rsiLen','num','RSI length',{min:2,max:100}],['rsiOB','num','RSI overbought (SELL stretch)',{min:50,max:99}],['rsiOS','num','RSI oversold (BUY stretch)',{min:1,max:50}],
    ['look','num','Candles allowed between the stretch and the close back inside',{min:1,max:20}],['sameBar','chk','The stretch candle may also be the entry candle (wick outside, close inside)'],
    ['tpMode','sel','Target (the mean)',{opts:['Middle band','50 MA']}],['maLen','num','Moving average length (50 MA target)',{min:5,max:400}],
    ['slPad','num','Stop distance beyond the extreme wick (x ATR)',{min:0,max:3,step:0.05}],['minRR','num','Minimum risk : reward (0 = off)',{min:0,max:10,step:0.1}],['maxBars','num','Close a trade after (bars)',{min:5,max:1000}],['atrLen','num','ATR period',{min:2,max:100}],
    ['useAdx','chk','Volatility filter: ranging market only (ADX)'],['adxLen','num','ADX length',{min:2,max:100}],['adxMax','num','No trade when ADX is above',{min:5,max:60}],
    ['useSpike','chk','News filter: cancel the setup if a spike candle is inside the stretch'],['spikeMult','num','Spike candle = range bigger than (x ATR)',{min:1.5,max:10,step:0.25}],
    ['useBw','chk','Band width filter'],['minBw','num','Minimum band width (% of price)',{min:0,max:20,step:0.1}],
    ['useVol','chk','Volume dry-up filter (needs volume)'],['volMult','num','Entry candle volume at most (x 20-bar average)',{min:0.2,max:5,step:0.1}],
    ['showBands','chk','Show the Bollinger bands and the mean'],['showStretch','chk','Show the "Stretch" box'],['showBox','chk','Show TP / SL boxes'],['showCircle','chk','Show the yellow entry circle'],['showArrows','chk','Show BUY / SELL arrows'],['showLabels','chk','Show labels'],['keep','num','Trades to display',{min:1,max:50}],
    ['cLong','col','BUY / TP'],['cShort','col','SELL / SL'],['cStretch','col','Stretch box'],['cEntry','col','Entry circle'],
    ['showStats','chk','Show statistics (estimate, not a backtest)'],['statPos','sel','Statistics position',{opts:['Top right','Top left','Bottom right','Bottom left']}],
    ['alLong','chk','Alert on BUY'],['alShort','chk','Alert on SELL'],['alTP','chk','Alert on take profit'],['alSL','chk','Alert on stop loss'],['alSound','chk','Play a sound']],
  calc:(c,p)=>{ const q=Object.assign({},MR_DEF,p); if(q.showBands===false||!c||c.length<5) return [[],[],[]]; let I; try{ I=mrInd(c,q); }catch(e){ return [[],[],[]]; } const u=[],m=[],l=[];
    for(let i=0;i<c.length;i++){ if(I.up[i]===I.up[i]) u.push({time:c[i].time,value:I.up[i]}); if(I.mean[i]===I.mean[i]) m.push({time:c[i].time,value:I.mean[i]}); if(I.lo[i]===I.lo[i]) l.push({time:c[i].time,value:I.lo[i]}); } return [u,m,l]; },
  extras:(c,p)=>{ const q=Object.assign({},MR_DEF,p), D=mrGet(c,q), mk=[];
    if(D.ok&&q.showArrows) D.tr.slice(-Math.max(1,Math.round(+q.keep)||8)*3).forEach(t=>mk.push({time:t.time,position:t.d>0?'belowBar':'aboveBar',color:t.d>0?q.cLong:q.cShort,shape:t.d>0?'arrowUp':'arrowDown',text:t.d>0?'BUY':'SELL',size:.9,keep:true}));
    mk.sort((a,b)=>a.time-b.time);
    return {mk,boxes:[{type:'mrsview',pts:[],o:q,D}],labels:[],events:D.ok?D.ev:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='mrsview') return _D.apply(this,arguments);
    const p=d.o, D=d.D; if(!D) return; const K=Math.max(1,Math.round(+p.keep)||8);
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.font='10px system-ui,sans-serif'; cx.textBaseline='middle';
    if(D.ok){
      const lab=(t,x,y,bg,fg,al)=>{ const w=cx.measureText(t).width+10; let lx=al==='c'?x-w/2:x; if(al!=='c'&&lx+w>W-2) lx=x-6-w; cx.fillStyle=bg; cx.beginPath(); if(cx.roundRect) cx.roundRect(lx,y-7,w,14,4); else cx.rect(lx,y-7,w,14); cx.fill(); cx.fillStyle=fg; cx.textAlign='left'; cx.fillText(t,lx+5,y); };
      D.tr.slice(-K).forEach(t=>{ const x0=X(t.i); let x1=X(t.end); if(x0==null||x1==null) return; x1=Math.max(x1,x0+8); if(t.res==='open') x1=x1+14;
        const yE=Y(t.entry), yT=Y(t.tp), yS=Y(t.sl); if(yE==null||yT==null||yS==null) return; const cl=t.d>0?p.cLong:p.cShort;
        // the stretch: from the first stretched candle to the entry candle, between the band and the extreme wick
        if(p.showStretch){ const xs=X(t.s0), yb=Y(t.band), yx=Y(t.ext); if(xs!=null&&yb!=null&&yx!=null){ const bx=Math.min(xs,x0)-3, bw=Math.max(10,Math.abs(x0-xs)+6), by=Math.min(yb,yx), bh=Math.max(3,Math.abs(yx-yb));
            cx.fillStyle=mrA(p.cStretch,.22); cx.fillRect(bx,by,bw,bh); cx.strokeStyle=mrA(p.cStretch,.6); cx.lineWidth=1; cx.setLineDash([3,2]); cx.strokeRect(bx+.5,by+.5,bw,bh); cx.setLineDash([]);
            if(p.showLabels){ cx.fillStyle=mrA(p.cStretch,.95); cx.textAlign='left'; cx.font='9px system-ui,sans-serif'; cx.fillText('Stretch',bx+3,t.d>0?by+bh+8:by-8); cx.font='10px system-ui,sans-serif'; } } }
        if(p.showBox){ cx.fillStyle=mrA(p.cLong,.16); cx.fillRect(x0,Math.min(yE,yT),x1-x0,Math.abs(yT-yE)); cx.fillStyle=mrA(p.cShort,.16); cx.fillRect(x0,Math.min(yE,yS),x1-x0,Math.abs(yS-yE));
          cx.lineWidth=1; cx.setLineDash([]); cx.strokeStyle=mrA(p.cLong,.7); cx.beginPath(); cx.moveTo(x0,yT); cx.lineTo(x1,yT); cx.stroke(); cx.strokeStyle=mrA(p.cShort,.8); cx.beginPath(); cx.moveTo(x0,yS); cx.lineTo(x1,yS); cx.stroke();
          cx.strokeStyle=mrA('#ffffff',.55); cx.setLineDash([4,3]); cx.beginPath(); cx.moveTo(x0,yE); cx.lineTo(x1,yE); cx.stroke(); cx.setLineDash([]); }
        if(p.showLabels&&p.showBox){ lab('TP mean '+mrFR(t.rr)+'R',x1+3,yT,mrA(p.cLong,.85),'#fff'); lab('SL',x1+3,yS,mrA(p.cShort,.85),'#fff');
          if(t.res!=='open'){ const ok=t.r>0; lab((ok?'\u2713 +':'\u2717 ')+mrFR(Math.abs(t.r)).replace(/^/,ok?'':'-')+'R'+(t.res==='time'?' (time)':''),x1+3,yE,ok?mrA(p.cLong,.95):mrA(p.cShort,.95),'#fff'); } }
        if(p.showCircle){ cx.fillStyle=mrA(p.cEntry,.9); cx.strokeStyle='#8a6d00'; cx.lineWidth=1; cx.beginPath(); cx.arc(x0,yE,6,0,Math.PI*2); cx.fill(); cx.stroke(); }
        if(p.showLabels){ const tx=(t.d>0?'BUY':'SELL')+' \u00b7 '+(t.src==='RSI'?'RSI snap-back':'Band snap-back'); lab(tx,x0,t.d>0?yE+14:yE-14,mrA(cl,.9),'#fff','c'); } }); }
    if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); }
    if(D.ok&&p.showStats&&D.st){ const S=D.st, rows=[['Closed trades',String(S.n)],['Win rate',S.wr.toFixed(1)+' %'],['Net R',(S.net>=0?'+':'')+S.net.toFixed(1)],['Profit factor',S.pf.toFixed(2)],['Avg R / trade',S.avg.toFixed(2)],['Open now',String(S.open)]];
      cx.font='11px system-ui,sans-serif'; const rh=17; let w0=cx.measureText('Mean Reversion').width, w1=cx.measureText('estimate').width;
      rows.forEach(r=>{ w0=Math.max(w0,cx.measureText(r[0]).width); w1=Math.max(w1,cx.measureText(r[1]).width); }); w0+=12; w1+=12; const tw=w0+w1, th=rh*(rows.length+1), pos=p.statPos||'Top right';
      const tx=pos.indexOf('left')>-1?8:W-tw-8, ty=pos.indexOf('Top')>-1?8:H-th-8;
      cx.fillStyle='rgba(0,0,0,.72)'; cx.fillRect(tx,ty,tw,th); cx.fillStyle='rgba(41,98,255,.55)'; cx.fillRect(tx,ty,tw,rh); cx.strokeStyle='rgba(140,140,140,.35)'; cx.lineWidth=1; cx.strokeRect(tx+.5,ty+.5,tw,th);
      cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText('Mean Reversion',tx+6,ty+rh/2); cx.font='9px system-ui,sans-serif'; cx.fillText('estimate',tx+w0+6,ty+rh/2); cx.font='11px system-ui,sans-serif';
      rows.forEach((r,k)=>{ const y=ty+rh*(k+1)+rh/2; cx.fillStyle='#fff'; cx.fillText(r[0],tx+6,y); cx.fillText(r[1],tx+w0+6,y); }); }
    cx.restore(); }; }
// alerts: fire once, when the signal candle (or the candle that hit TP / SL) has closed, while the app is open
function mrAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0], KEY={long:'alLong',short:'alShort',tp:'alTP',sl:'alSL'},
    MSG={long:['MEAN REVERSION BUY','#2e7d32'],short:['MEAN REVERSION SELL','#c62828'],tp:['Mean Reversion: take profit (mean) hit','#2e7d32'],sl:['Mean Reversion: stop loss hit','#c62828']};
  inds.forEach(i=>{ if(i.t!=='mrs'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},MR_DEF,i.p); let quiet=q; if(i._mrK!==key){ i._mrK=key; i._mrLast={}; quiet=true; }
    const last=i._mrLast||(i._mrLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!P[KEY[e.type]]) return;
      toast(MSG[e.type][0]+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+mrFx(e.price),MSG[e.type][1]);
      if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _mrRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_mrRE.apply(this,arguments); try{ mrAlerts(q); }catch(e){ console.error('mrs alerts',e); } return rv; }; }
try{ DESC.mrs='Premium strategy \u00b7 price stretches outside the Bollinger Band (and / or RSI 70 / 30), closes back inside \u2192 BUY / SELL with SL beyond the extreme wick and TP at the mean, ranging-market and news-spike filters'; }catch(e){}
}catch(err){ console.error('mrs strategy failed',err); window.__mrsErr=err; }

// ---- [mfp] INDICATOR: Money Flow Profile [LuxAlgo] - volume / money flow profile, sentiment profile, heatmap, level of significance, consolidation zones (self-contained: every name starts with mfp / MFP) ----
// Looks at the last N bars (Lookback Length) and splits their high-low range into rows. Every bar's volume (or money flow = volume x typical price) is spread over the rows it touches.
//  1. VOLUME / MONEY FLOW PROFILE - one bar per row on the right. Rows at or above the High threshold (% of the busiest row) are High Traded Nodes, at or below the Low threshold Low Traded Nodes, the rest Average.
//  2. SENTIMENT PROFILE           - net buy minus sell per row (bars growing left of the price column). Bar Polarity: close vs open. Bar Trend: close vs the previous close.
//  3. HEATMAP                     - the rows shaded across the whole range, by the volume profile or by the sentiment profile.
//  4. LEVEL OF SIGNIFICANCE       - the busiest row (point of control) as a zone or a line.   HIGHEST SENTIMENT ZONE - the row with the biggest net buy / sell, dotted outline.
//  5. CONSOLIDATION ZONES         - the connected rows around the busiest one that hold at least the threshold % of its volume.
// Information tool: it prints no buy / sell signals. Closed and running bars both count, so the running bar moves the profile slightly. Nothing else on the chart is touched.
try{
const MFP_DEF={len:500,src:'Volume',vpOn:true,hiCol:'#fbc02d',hiThr:53,avgCol:'#2962ff',loCol:'#e53935',loThr:37,
  spOn:true,pol:'Bar Polarity',bullCol:'#009688',bearCol:'#e53935',hmOn:true,hmSrc:'Volume/Money Flow Profile',hmTr:73,
  los:'Last(Zone)',consOn:false,consThr:25,consCol:'#ffeb3b',hszOn:true,plvOn:true,plvCol:'#4dabf7',plvSize:'Small',bgOn:true,bgCol:'#009688',bgTr:90,
  rows:25,wPct:13,tsize:'Auto',hOff:13,barTr:55};
const MFP_FS={Tiny:7,Small:9,Normal:11,Large:13,Huge:16};
function mfpA(hex,a){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+Math.max(0,Math.min(1,a))+')'; }
function mfpNum(v){ const a=Math.abs(v); return a>=1e9?(v/1e9).toFixed(3)+'B':a>=1e6?(v/1e6).toFixed(3)+'M':a>=1e3?(v/1e3).toFixed(3)+'K':v.toFixed(2); }
function mfpPx(v){ return v==null||!isFinite(v)?'-':Math.abs(v)>=1000?v.toFixed(2):Number(v.toPrecision(6)).toString(); }
function mfpCompute(c,p){ const N=c.length, D={ok:false,msg:''}; if(N<2){ D.msg='Money Flow Profile: not enough candles'; return D; }
  const L=Math.max(10,Math.min(5000,Math.round(+p.len)||500)), i0=Math.max(0,N-L), R=Math.max(5,Math.min(100,Math.round(+p.rows)||25));
  let hi=-Infinity, lo=Infinity; for(let i=i0;i<N;i++){ if(c[i].high>hi) hi=c[i].high; if(c[i].low<lo) lo=c[i].low; }
  const step=(hi-lo)/R; if(!(step>0)){ D.msg='Money Flow Profile: the range has no height'; return D; }
  const up=new Float64Array(R), dn=new Float64Array(R), mf=p.src==='Money Flow', trend=p.pol==='Bar Trend';
  for(let i=i0;i<N;i++){ const b=c[i]; let v=b.volume||0; if(mf) v*=(b.high+b.low+b.close)/3; if(!(v>0)) continue;
    const ref=trend?(i>0?c[i-1].close:b.open):b.open, fu=b.close>ref?1:b.close<ref?0:0.5, rg=b.high-b.low;
    if(rg<=0){ const r=Math.max(0,Math.min(R-1,Math.floor((b.close-lo)/step))); up[r]+=v*fu; dn[r]+=v*(1-fu); }
    else{ const r0=Math.max(0,Math.floor((b.low-lo)/step)), r1=Math.min(R-1,Math.floor((b.high-lo)/step));
      for(let r=r0;r<=r1;r++){ const bl=lo+r*step, ov=Math.min(b.high,bl+step)-Math.max(b.low,bl); if(ov>0){ const f=v*ov/rg; up[r]+=f*fu; dn[r]+=f*(1-fu); } } } }
  const tot=new Array(R), net=new Array(R); let mx=0, poc=0, sum=0, mxA=0, hsz=0, sumA=0;
  for(let r=0;r<R;r++){ tot[r]=up[r]+dn[r]; net[r]=up[r]-dn[r]; sum+=tot[r]; const a=Math.abs(net[r]); sumA+=a; if(tot[r]>mx){ mx=tot[r]; poc=r; } if(a>mxA){ mxA=a; hsz=r; } }
  if(!(mx>0)){ D.msg='Money Flow Profile: no volume data for this symbol'; return D; }
  const hT=Math.max(0,+p.hiThr||53)/100, lT=Math.max(0,+p.loThr||37)/100, cls=tot.map(v=>{ const q=v/mx; return q>=hT?2:q<=lT?0:1; });
  const cT=Math.max(0,+p.consThr||25)/100; let ca=poc, cb=poc; while(ca>0&&tot[ca-1]/mx>=cT) ca--; while(cb<R-1&&tot[cb+1]/mx>=cT) cb++;
  Object.assign(D,{ok:true,N,i0,R,hi,lo,step,tot,net,sum,sumA,mx,mxA,poc,hsz,cls,ca,cb}); return D; }
let mfpMem=null;
function mfpGet(c,p){ const N=c.length, L=N?c[N-1]:null, key=JSON.stringify([p.len,p.src,p.pol,p.rows,p.hiThr,p.loThr,p.consThr])+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+(N?c[0].time+'|'+L.time+'|'+L.close+'|'+L.high+'|'+L.low+'|'+(L.volume||0):''); if(mfpMem&&mfpMem.k===key) return mfpMem.D;
  let D; try{ D=mfpCompute(c,p); }catch(e){ console.error('mfp calc failed',e); D={ok:false,msg:'Money Flow Profile: calculation failed'}; } mfpMem={k:key,D}; return D; }
IND.mfp={label:'Money Flow Profile [LuxAlgo]',cat:'Volume',nm:()=>'Money Flow Profile [LuxAlgo]',p:Object.assign({},MFP_DEF),cols:['#fbc02d'],
  fields:[['len','num','Lookback Length / Fixed Range (bars)',{min:10,max:5000}],['src','sel','Profile Source',{opts:['Volume','Money Flow']}],
    ['vpOn','chk','Volume / Money Flow Profile'],['hiCol','col','High Traded Nodes'],['hiThr','num','High Traded Nodes: threshold %',{min:0,max:100}],['avgCol','col','Average Traded Nodes'],['loCol','col','Low Traded Nodes'],['loThr','num','Low Traded Nodes: threshold %',{min:0,max:100}],
    ['spOn','chk','Sentiment Profile'],['pol','sel','Sentiment Polarity Method',{opts:['Bar Polarity','Bar Trend']}],['bullCol','col','Bullish Nodes'],['bearCol','col','Bearish Nodes'],
    ['hmOn','chk','Profile Heatmap'],['hmSrc','sel','Heatmap Source',{opts:['Volume/Money Flow Profile','Sentiment Profile']}],['hmTr','num','Heatmap Transparency (0 solid, 100 invisible)',{min:0,max:100}],
    ['los','sel','Level of Significance',{opts:['Last(Zone)','Last(Line)','Off']}],['consOn','chk','Consolidation Zones'],['consThr','num','Consolidation Threshold %',{min:0,max:100}],['consCol','col','Consolidation Zones colour'],
    ['hszOn','chk','Highest Sentiment Zone'],['plvOn','chk','Profile Price Levels'],['plvCol','col','Profile Price Levels colour'],['plvSize','sel','Profile Price Levels size',{opts:['Tiny','Small','Normal','Large']}],
    ['bgOn','chk','Profile Range Background Fill'],['bgCol','col','Profile Range Background colour'],['bgTr','num','Profile Range Background transparency',{min:0,max:100}],
    ['rows','num','Number of Rows',{min:5,max:100}],['wPct','num','Profile Width %',{min:2,max:50}],['tsize','sel','Profile Text Size',{opts:['Auto','Tiny','Small','Normal','Large','Huge']}],['hOff','num','Profile Horizontal Offset (bars)',{min:0,max:200}],['barTr','num','Profile bar transparency',{min:0,max:100}]],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},MFP_DEF,p), D=mfpGet(c,q); return {mk:[],boxes:[{type:'mfpview',pts:[],o:q,D}],labels:[],events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='mfpview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, N=candles.length; if(!D||!N) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    if(!D.ok||D.N!==N){ if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); } cx.restore(); return; }
    const xa=X(D.i0), xb=X(N-1), yT=Y(D.hi), yB=Y(D.lo); if(xa==null||xb==null||yT==null||yB==null){ cx.restore(); return; }
    const R=D.R, ry=r=>Y(D.lo+r*D.step), rowH=Math.abs(ry(1)-ry(0)), span=N-1-D.i0, bw=span>0&&xb>xa?(xb-xa)/span:6, rw=Math.max(1,xb-xa);
    const colOf=r=>D.cls[r]===2?p.hiCol:D.cls[r]===0?p.loCol:p.avgCol, snCol=r=>D.net[r]>=0?p.bullCol:p.bearCol;
    // range background + heatmap rows
    if(p.bgOn){ cx.fillStyle=mfpA(p.bgCol,1-(+p.bgTr||0)/100); cx.fillRect(xa,Math.min(yT,yB),rw,Math.abs(yB-yT)); }
    if(p.hmOn){ const bs=p.hmSrc==='Sentiment Profile', a0=1-(+p.hmTr||0)/100;
      for(let r=0;r<R;r++){ const y0=ry(r+1), y1=ry(r); if(y0==null||y1==null) continue; const q=bs?(D.mxA>0?Math.abs(D.net[r])/D.mxA:0):D.tot[r]/D.mx, col=bs?snCol(r):colOf(r);
        cx.fillStyle=mfpA(col,a0*(0.35+0.65*q)); cx.fillRect(xa,Math.min(y0,y1),rw,Math.abs(y1-y0)); cx.fillStyle=mfpA(col,Math.min(1,a0*0.9)); cx.fillRect(xa,y1-0.5,rw,1); } }
    // profile geometry (price column in the middle, sentiment grows left of it, volume grows right of it)
    const fsA=Math.max(6,Math.min(11,rowH*0.62)), fs=p.tsize==='Auto'?fsA:(MFP_FS[p.tsize]||fsA), pfs=Math.max(6,Math.min(12,(MFP_FS[p.plvSize]||9)));
    const showPc=!!p.plvOn&&rowH>=pfs-1, pcW=showPc?Math.round(pfs*5.6+8):0, off=Math.max(0,+p.hOff||0)*bw;
    const side=Math.max(12,(Math.max(2,+p.wPct||13)/100)*rw), total=side*2+pcW;   // locked to the chart: anchored to the last bar + offset, scrolls and zooms with time and price
    const x0=xb+off, sB=x0+side, vB=sB+pcW;
    // consolidation zone, level of significance, highest sentiment zone (drawn across the range, dotted into the profile)
    const band=(ra,rb)=>{ const y0=ry(rb+1), y1=ry(ra); return y0==null||y1==null?null:[Math.min(y0,y1),Math.abs(y1-y0)]; };
    if(p.consOn){ const b=band(D.ca,D.cb); if(b){ cx.fillStyle=mfpA(p.consCol,0.14); cx.fillRect(xa,b[0],rw,b[1]); cx.strokeStyle=mfpA(p.consCol,0.7); cx.lineWidth=1; cx.setLineDash([4,3]); cx.strokeRect(xa+.5,b[0]+.5,rw,b[1]); cx.setLineDash([]); } }
    if(p.los!=='Off'){ const b=band(D.poc,D.poc); if(b){ const col=p.hiCol, zone=/Zone/.test(p.los);
        if(zone){ cx.fillStyle=mfpA(col,0.3); cx.fillRect(xa,b[0],rw,b[1]); cx.strokeStyle=col; cx.lineWidth=1.2; cx.beginPath(); cx.moveTo(xa,b[0]); cx.lineTo(xb,b[0]); cx.moveTo(xa,b[0]+b[1]); cx.lineTo(xb,b[0]+b[1]); cx.stroke(); }
        else{ const ym=b[0]+b[1]/2; cx.strokeStyle=col; cx.lineWidth=1.5; cx.beginPath(); cx.moveTo(xa,ym); cx.lineTo(xb,ym); cx.stroke(); }
        cx.strokeStyle=mfpA(col,0.85); cx.lineWidth=1; cx.setLineDash([2,3]); cx.beginPath(); const yy=zone?[b[0],b[0]+b[1]]:[b[0]+b[1]/2]; yy.forEach(y=>{ cx.moveTo(xb,y); cx.lineTo(x0,y); }); cx.stroke(); cx.setLineDash([]); } }
    if(p.hszOn&&D.mxA>0){ const b=band(D.hsz,D.hsz); if(b){ const col=snCol(D.hsz); cx.strokeStyle=mfpA(col,0.95); cx.lineWidth=1; cx.setLineDash([2,3]); cx.strokeRect(xa+.5,b[0]+.5,rw,b[1]); cx.beginPath(); cx.moveTo(xb,b[0]); cx.lineTo(x0,b[0]); cx.moveTo(xb,b[0]+b[1]); cx.lineTo(x0,b[0]+b[1]); cx.stroke(); cx.setLineDash([]); } }
    // profile rows
    const fill=1-(+p.barTr||0)/100, fnt=s=>{ cx.font=s+'px system-ui,sans-serif'; }, bh=Math.max(1,rowH-1);
    for(let r=0;r<R;r++){ const y0=ry(r+1), y1=ry(r); if(y0==null||y1==null) continue; const top=Math.min(y0,y1), h=Math.max(1,Math.abs(y1-y0)-1), ym=top+h/2;
      if(p.spOn&&D.mxA>0){ const v=D.net[r], len=Math.abs(v)/D.mxA*side, col=snCol(r); if(len>0){ cx.fillStyle=mfpA(col,fill); cx.fillRect(sB-len,top,len,h); cx.strokeStyle=mfpA(col,0.95); cx.lineWidth=(p.hszOn&&r===D.hsz)?2:1; cx.strokeRect(sB-len+.5,top+.5,Math.max(1,len-1),Math.max(1,h-1));
          if(rowH>=fs+1){ fnt(fs); const t=(v<0?'-':'')+mfpNum(Math.abs(v))+' ('+(D.sumA>0?(Math.abs(v)/D.sumA*100).toFixed(2):'0')+'%)'; if(cx.measureText(t).width+6<=len){ cx.fillStyle='#e8eaed'; cx.textAlign='right'; cx.fillText(t,sB-3,ym); } } } }
      if(p.vpOn){ const v=D.tot[r], len=v/D.mx*side, col=colOf(r); if(len>0){ cx.fillStyle=mfpA(col,fill); cx.fillRect(vB,top,len,h); cx.strokeStyle=mfpA(col,0.95); cx.lineWidth=(p.los!=='Off'&&r===D.poc)?2:1; cx.strokeRect(vB+.5,top+.5,Math.max(1,len-1),Math.max(1,h-1));
          if(rowH>=fs+1){ fnt(fs); const t=mfpNum(v)+(p.src==='Money Flow'&&/USDT$/i.test(String(sym[0]))?' USDT':'')+' ('+(D.sum>0?(v/D.sum*100).toFixed(2):'0')+'%)'; if(cx.measureText(t).width+6<=len){ cx.fillStyle='#e8eaed'; cx.textAlign='left'; cx.fillText(t,vB+3,ym); } } } }
      if(showPc){ cx.fillStyle='rgba(18,20,26,.85)'; cx.fillRect(sB,top,pcW,h); cx.strokeStyle='#2e3340'; cx.lineWidth=1; cx.strokeRect(sB+.5,top+.5,pcW-1,Math.max(1,h-1)); fnt(pfs); cx.fillStyle='#d1d4dc'; cx.textAlign='center'; cx.fillText(mfpPx(D.lo+(r+0.5)*D.step),sB+pcW/2,ym); } }
    // range high / low labels
    if(p.plvOn){ fnt(pfs+1); cx.fillStyle=p.plvCol; cx.textAlign='left'; cx.textBaseline='bottom'; cx.fillText(mfpPx(D.hi),xb+4,Math.min(yT,yB)-2); cx.textBaseline='top'; cx.fillText(mfpPx(D.lo),xb+4,Math.max(yT,yB)+3); cx.textBaseline='middle'; }
    cx.restore(); }; }
try{ DESC.mfp='Volume / money flow profile with high, average and low traded nodes, a buy minus sell sentiment profile, a heatmap, level of significance, highest sentiment zone and consolidation zones'; }catch(e){}
}catch(err){ console.error('mfp indicator failed',err); window.__mfpErr=err; }

// ---- [sgc] INDICATOR: Strong Gradient Channel - port of the Pine v6 script "Strong Gradient Channel" (self-contained: every name starts with sgc / SGC) ----
// 1. LinReg channel over the last N bars (Std Dev / Max Deviation / ATR walls), projected to the right.
// 2. Sloped volume profile: rows follow the slope of the channel, split into buy / sell parallelograms, spectral volume ramp, POC, value area, delta POC, institutional rows.
// 3. Intrabar order flow: lower time frame candles are loaded from Binance (Auto: 5m on 15m, 15m on 1h, 1h on 4h ...) to split each candle's volume into buy / sell, CVD and session delta.
// 4. Contrarian fade engine: FADE up / down when price pierces a channel wall and the auction shows exhaustion (score 0-10). Closed candles only.
// 5. Naked POC magnets: the POC of a strong fade candle is extended to the right until price trades through it.
// 6. Scenario projection: a path from the last bar through trigger / reverse / retest / target, every waypoint clamped inside the sloped channel walls.
// 7. Optional dashboard and legend. Information tool, not financial advice. All of it is drawn in price / time space, so it moves with the chart.
try{
const SGC_DEF={len:480,src:'hlc3',dev:'Std Dev',upM:2,dnM:2,fillCh:true,mid:true,
  rows:45,wPct:34,side:'Left',split:true,ramp:true,poc:true,va:true,fillVa:true,vaPct:70,ext:false,dPoc:true,insta:true,
  ltf:true,gran:'Auto',cls:'Blend',blend:65,divLen:14,
  sig:true,minScore:6,extLen:10,cool:5,tgt:true,tgtBars:14,
  naked:true,nkMin:6,nkMax:8,
  scen:true,shape:'Standard',anchor:'Channel Extremes',sdir:'Auto (net flow)',proj:70,revP:55,retP:55,pad:2,sCol:'#FFB020',glow:true,slab:true,rails:true,chExt:100,
  dash:false,dpos:'Top Right',dsize:'Small',theme:'Obsidian Aurora',custom:false,cuBuy:'#00E5C0',cuSell:'#FF2D78',cuPoc:'#FFD166',cuAcc:'#B388FF',legend:false,lpos:'Bottom Right'};
const SGC_TH={'Obsidian Aurora':{buy:'#00E5C0',sell:'#FF2D78',poc:'#FFD166',acc:'#B388FF',panel:'#0D1117',r:['#1B4E88','#2A7DB8','#21B5A8','#5EE0C0','#C9FDF0']},
  'Magma':{buy:'#F1605D',sell:'#B63679',poc:'#FCFDBF',acc:'#FEAF77',panel:'#120409',r:['#6A176E','#B63679','#F1605D','#FEAF77','#FCFDBF']},
  'Plasma':{buy:'#00E5FF',sell:'#FF3D71',poc:'#FFC400',acc:'#D500F9',panel:'#0A0416',r:['#6A00A8','#B12A90','#E16462','#FCA636','#F0F921']},
  'Deep Ocean':{buy:'#3FC1C9',sell:'#F45B69',poc:'#FFD97D',acc:'#6C8AE4',panel:'#0A0F14',r:['#12303A','#1E6E7A','#2FA8B0','#6FD9C0','#CFF5E8']},
  'Graphite Mono':{buy:'#D0D6DE',sell:'#7A8391',poc:'#FFFFFF',acc:'#A8B2C1',panel:'#0E0E10',r:['#303036','#55555C','#7A7A82','#A2A2AA','#E4E4EC']}};
const SGC_FS={Tiny:8,Small:10,Normal:12,Large:14};
const SGC_INSTA='#FFEB3B', SGC_TXT='#E6EDF3', SGC_MUT='#8B949E';
const sgcClamp=(v,a,b)=>Math.max(a,Math.min(b,v)), sgcDiv=(a,b)=>b===0?0:a/b;
function sgcRgb(h){ const m=/^#?([0-9a-f]{6})/i.exec(h||''); const n=m?parseInt(m[1],16):0x888888; return [n>>16&255,n>>8&255,n&255]; }
function sgcA(h,a){ const c=sgcRgb(h); return 'rgba('+c[0]+','+c[1]+','+c[2]+','+sgcClamp(a,0,1)+')'; }
function sgcRamp(t,r){ const u=sgcClamp(t,0,1)*4, i=Math.min(3,Math.floor(u)), a=sgcRgb(r[i]), b=sgcRgb(r[i+1]), f=u-i; return '#'+[0,1,2].map(k=>Math.round(a[k]+(b[k]-a[k])*f).toString(16).padStart(2,'0')).join(''); }
function sgcP(v){ return v==null||!isFinite(v)?'-':Math.abs(v)>=1000?v.toFixed(2):Number(v.toPrecision(6)).toString(); }
function sgcV(v){ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return a>=1e9?(v/1e9).toFixed(2)+'B':a>=1e6?(v/1e6).toFixed(2)+'M':a>=1e3?(v/1e3).toFixed(2)+'K':v.toFixed(2); }
function sgcSec(iv){ const m=/^(\d+)([mhdwM])$/.exec(iv||''); return m?(+m[1])*({m:60,h:3600,d:86400,w:604800,M:2592000}[m[2]]):0; }
const SGC_G={'1 Minute':'1m','5 Minute':'5m','15 Minute':'15m','1 Hour':'1h'};
function sgcLtfIv(p,ts){ if(p.gran!=='Auto') return SGC_G[p.gran]||'5m'; return ts>=14400?'1h':ts>=3600?'15m':ts>=900?'5m':'1m'; }
function sgcBuy(o,h,l,cl,p){ const r=Math.max(h-l,Math.abs(cl)*1e-9||1e-12), loc=(cl-l)/r, bs=cl>o?1:cl<o?0:0.5, k=(+p.blend)/100;
  return sgcClamp(p.cls==='Close Location'?loc:p.cls==='Body Direction'?bs:k*loc+(1-k)*bs,0,1); }
// lower time frame candles from Binance, cached per symbol / interval; the tail refreshes every 30 s
const sgcLT={};
function sgcFetch(sy,ltf,t0){ const key=sy+'|'+ltf; let d=sgcLT[key]; if(!d) d=sgcLT[key]={rows:[],t0:0,busy:false,ts:0,err:false,ver:0};
  if(d.busy) return d; const need=!d.rows.length||t0<d.t0; if(!need&&Date.now()-d.ts<30000) return d; if(d.err&&Date.now()-d.ts<15000) return d;
  const ls=sgcSec(ltf); d.busy=true; let rows,from; if(need){ rows=[]; from=t0; d.t0=t0; } else{ rows=d.rows.slice(); from=rows[rows.length-1].t; rows.pop(); } let pages=0;
  const step=()=>fetch(`${RB(sy)}/klines?symbol=${sy}&interval=${ltf}&startTime=${from*1000}&limit=1000`).then(r=>r.json()).then(a=>{ if(!Array.isArray(a)) throw new Error('bad'); a.forEach(x=>rows.push({t:x[0]/1000,o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]})); pages++; if(a.length>=1000&&pages<14){ from=a[a.length-1][0]/1000+ls; return step(); } });
  step().then(()=>{ d.rows=rows; d.err=false; d.ver++; }).catch(()=>{ d.err=true; }).then(()=>{ d.busy=false; d.ts=Date.now(); try{ render(); }catch(e){} });
  return d; }
function sgcAtr(c,n){ const out=new Array(c.length).fill(null); let a=null; for(let i=0;i<c.length;i++){ const b=c[i], tr=i?Math.max(b.high-b.low,Math.abs(b.high-c[i-1].close),Math.abs(b.low-c[i-1].close)):b.high-b.low;
    if(i===n-1){ let s=0; for(let k=0;k<n;k++){ const q=c[k], t=k?Math.max(q.high-q.low,Math.abs(q.high-c[k-1].close),Math.abs(q.low-c[k-1].close)):q.high-q.low; s+=t; } a=s/n; } else if(a!=null&&i>=n) a=(a*(n-1)+tr)/n; out[i]=a; } return out; }
function sgcCompute(c,p,LT){ const N=c.length, D={ok:false,msg:''}; if(N<25){ D.msg='Strong Gradient Channel: not enough candles'; return D; }
  let L=Math.max(20,Math.min(5000,Math.round(+p.len)||480)); L=Math.min(L,N-1); const startIdx=N-L, lenM1=L-1, fL=L, taLen=L;
  const th=SGC_TH[p.theme]||SGC_TH['Obsidian Aurora'], BUY=p.custom?p.cuBuy:th.buy, SELL=p.custom?p.cuSell:th.sell, POCC=p.custom?p.cuPoc:th.poc, ACC=p.custom?p.cuAcc:th.acc;
  const sv=i=>{ const b=c[i]; switch(p.src){ case 'high':return b.high; case 'low':return b.low; case 'hl2':return (b.high+b.low)/2; case 'hlc3':return (b.high+b.low+b.close)/3; case 'ohlc4':return (b.open+b.high+b.low+b.close)/4; default:return b.close; } };
  let sX=0,sY=0,sXY=0,sXX=0; for(let i=0;i<L;i++){ const y=sv(startIdx+i); sX+=i; sY+=y; sXY+=y*i; sXX+=i*i; }
  const den=fL*sXX-sX*sX, s=den!==0?(fL*sXY-sX*sY)/den:0, ic=(sY-s*sX)/fL, sp=ic, endBase=ic+s*lenM1;
  let acc=0,maxDev=-1e18,minDev=1e18; for(let k=0;k<L;k++){ const b=c[startIdx+k], bY=ic+s*k, d=sv(startIdx+k)-bY; acc+=d*d; maxDev=Math.max(maxDev,b.high-bY); minDev=Math.min(minDev,b.low-bY); }
  const sd=Math.sqrt(acc/fL), atrA=sgcAtr(c,14), atr100A=sgcAtr(c,100), atr14=atrA[N-1], atr100=atr100A[N-1], atrBand=(atr14==null?c[N-1].close*0.01:atr14)*3;
  const upB=p.dev==='Std Dev'?p.upM*sd:p.dev==='Max Deviation'?maxDev:p.upM*atrBand, dnB=p.dev==='Std Dev'?p.dnM*sd:p.dev==='Max Deviation'?-minDev:p.dnM*atrBand;
  const rng=maxDev-minDev; if(!(rng>0)){ D.msg='Strong Gradient Channel: the range has no height'; return D; }
  // ---- sloped volume profile (whole-candle buy share, like the Pine script) ----
  const R=sgcClamp(Math.round(+p.rows)||45,10,50), slotSz=rng/R, invSz=R/rng, mS=R-1, sVol=new Float64Array(R), sBuy=new Float64Array(R), sSell=new Float64Array(R); let tV=0,tB=0,tS=0;
  for(let k=0;k<L;k++){ const b=c[startIdx+k], bY=ic+s*k, dH=b.high-bY, dL=b.low-bY, bSz=dH-dL, bf=sgcBuy(b.open,b.high,b.low,b.close,p), v=b.volume||0; if(!(bSz>0)||!(v>0)) continue;
    const a=Math.max(0,Math.floor((dL-minDev)*invSz)), e=Math.min(mS,Math.floor((dH-minDev)*invSz)); if(a>e) continue; const vp=v/bSz;
    for(let j=a;j<=e;j++){ const lo=minDev+slotSz*j, ov=Math.min(dH,lo+slotSz)-Math.max(dL,lo); if(ov>0){ const q=vp*ov; sVol[j]+=q; sBuy[j]+=q*bf; sSell[j]+=q*(1-bf); tV+=q; tB+=q*bf; tS+=q*(1-bf); } } }
  const mean=tV/R; let vs=0; for(let j=0;j<R;j++){ const d=sVol[j]-mean; vs+=d*d; } const instT=mean+2*Math.sqrt(vs/R);
  let maxV=0,pIdx=0,maxDl=-1e18,dpIdx=0; for(let j=0;j<R;j++){ if(sVol[j]>maxV){ maxV=sVol[j]; pIdx=j; } const ad=Math.abs(sBuy[j]-sSell[j]); if(ad>maxDl){ maxDl=ad; dpIdx=j; } }
  const pocDev=minDev+(pIdx+0.5)*slotSz, dpocDev=minDev+(dpIdx+0.5)*slotSz; let vaV=maxV, vaHi=pIdx, vaLo=pIdx; const vaT=tV*(+p.vaPct||70)*0.01;
  while(vaV<vaT&&(vaHi<mS||vaLo>0)){ const u=vaHi<mS?sVol[vaHi+1]:-1, l=vaLo>0?sVol[vaLo-1]:-1; if(u>=l&&vaHi<mS){ vaHi++; vaV+=u; } else if(vaLo>0){ vaLo--; vaV+=l; } else break; }
  const vahDev=minDev+(vaHi+1)*slotSz, valDev=minDev+vaLo*slotSz;
  // ---- intrabar order flow, series, fade signals, naked POCs (last M bars) ----
  const tfs=sgcSec(tf[0]), lIv=sgcLtfIv(p,tfs), ls=sgcSec(lIv), ltfOk=tfs>0&&ls>0&&ls<=tfs, ratio=ltfOk?tfs/ls:1;
  const M=Math.max(30,Math.min(N,1500,Math.floor(12000/Math.max(1,ratio)))), i0=N-M; let ltfState='off', rows=null;
  if(ltfOk){ const d=sgcFetch(sym[0],lIv,c[i0].time); rows=d.rows; ltfState=d.rows.length?(d.busy?'refresh':'ok'):(d.err?'error':'loading'); D.ltfVer=d.ver; }
  const subA=new Int32Array(M).fill(0), subB=new Int32Array(M).fill(0);
  if(rows&&rows.length){ let q=0; while(q<rows.length&&rows[q].t<c[i0].time) q++; for(let i=i0;i<N;i++){ const tEnd=i<N-1?c[i+1].time:c[i].time+tfs; subA[i-i0]=q; while(q<rows.length&&rows[q].t<tEnd) q++; subB[i-i0]=q; } }
  const P1=new Float64Array(N+1), P2=new Float64Array(N+1), P3=new Float64Array(N+1); for(let i=0;i<N;i++){ const y=sv(i); P1[i+1]=P1[i]+y; P2[i+1]=P2[i]+y*y; P3[i+1]=P3[i]+i*y; }
  const cvdA=new Float64Array(M); let cvd=0, sess=0, signals=[], npocs=[], lastSig=-9999, lastC={score:0,dir:0,pocP:null}, last={}; const confirmedLast=N-1;
  for(let i=i0;i<N;i++){ const b=c[i], m=i-i0, nSub=subB[m]-subA[m], vol=b.volume||0, bf=sgcBuy(b.open,b.high,b.low,b.close,p); let ibB=vol*bf, ibS=vol*(1-bf);
    if(p.ltf&&nSub>0){ ibB=0; ibS=0; for(let q=subA[m];q<subB[m];q++){ const r=rows[q], f=sgcBuy(r.o,r.h,r.l,r.c,p); ibB+=r.v*f; ibS+=r.v*(1-f); } }
    const barVol=ibB+ibS, barDelta=ibB-ibS; cvd+=barDelta; cvdA[m]=cvd; const newDay=i===i0||Math.floor(b.time/86400)!==Math.floor(c[i-1].time/86400); sess=(newDay?0:sess)+barDelta;
    let avgVol=null; if(i>=19){ let t=0; for(let k=i-19;k<=i;k++) t+=c[k].volume||0; avgVol=t/20; }
    let cvdHiP=null,cvdLoP=null; if(m>=p.divLen){ cvdHiP=-1e30; cvdLoP=1e30; for(let k=m-p.divLen;k<m;k++){ if(cvdA[k]>cvdHiP) cvdHiP=cvdA[k]; if(cvdA[k]<cvdLoP) cvdLoP=cvdA[k]; } }
    let candScore=0, fadeDir=0, candPocP=null, shape='D';
    if(nSub>0&&b.high>b.low&&barVol>0&&i>=taLen-1&&i>=p.extLen){
      const a0=i-taLen+1, n=taLen, Sy=P1[i+1]-P1[a0], Sy2=P2[i+1]-P2[a0], Sxy=(P3[i+1]-P3[a0])-a0*Sy, Sx=n*(n-1)/2, Sxx=(n-1)*n*(2*n-1)/6, dn=n*Sxx-Sx*Sx, sl=dn!==0?(n*Sxy-Sx*Sy)/dn:0, ic2=(Sy-sl*Sx)/n, rMid=ic2+sl*(n-1), rStd=Math.sqrt(Math.max(0,Sy2/n-(Sy/n)*(Sy/n)));
      const wallUp=rMid+p.upM*rStd, wallDn=rMid-p.dnM*rStd; let hiPrev=-1e30, loPrev=1e30; for(let k=i-p.extLen;k<i;k++){ if(c[k].high>hiPrev) hiPrev=c[k].high; if(c[k].low<loPrev) loPrev=c[k].low; }
      const upW=b.high-Math.max(b.open,b.close), dnW=Math.min(b.open,b.close)-b.low, candShort=b.high>hiPrev&&b.high>=wallUp&&upW>=dnW, candLong=b.low<loPrev&&b.low<=wallDn&&dnW>=upW;
      if(candShort||candLong){ const RW=12+2, step=(b.high-b.low)/14, lv=new Float64Array(14); let lmax=0;
        for(let q=subA[m];q<subB[m];q++){ const r=rows[q], bot=sgcClamp(Math.floor((r.l-b.low)/step),0,13), top=sgcClamp(Math.floor((r.h-b.low)/step),0,13), sh=r.v/(top-bot+1); for(let x=bot;x<=top;x++) lv[x]+=sh; }
        let lp=0; for(let x=0;x<14;x++){ if(lv[x]>lmax){ lmax=lv[x]; lp=x; } } candPocP=b.low+step*(lp+0.5); const pocLoc=(lp+0.5)/14; let hf=-1,hl=-1; for(let x=0;x<14;x++){ if(lv[x]>=0.7*lmax){ if(hf<0) hf=x; hl=x; } }
        let bim=false; if(hl-hf>=3){ let thin=0; for(let x=hf+1;x<hl;x++) if(lv[x]<0.35*lmax) thin++; bim=thin>=2; } shape=bim?'B':pocLoc>=0.62?'P':pocLoc<=0.38?'b':'D';
        const body=Math.abs(b.close-b.open), rowRng=b.high-b.low, relVol=sgcDiv(barVol,avgVol==null?barVol:avgVol), dDom=sgcDiv(Math.abs(barDelta),barVol), mid=(b.high+b.low)/2, cEff=sgcClamp((relVol-1)/1.5,0,1)*sgcClamp(1-sgcDiv(body,rowRng),0,1);
        let cW,cT,cS,cD; if(candShort){ fadeDir=-1; cW=sgcClamp(sgcDiv(upW,rowRng)/0.5,0,1); cT=barDelta>0&&b.close<mid?sgcClamp(dDom/0.5,0,1):0; cS=shape==='P'?sgcClamp((pocLoc-0.5)/0.35,0,1):0; cD=cvdHiP!=null&&cvd<cvdHiP?1:0; }
        else{ fadeDir=1; cW=sgcClamp(sgcDiv(dnW,rowRng)/0.5,0,1); cT=barDelta<0&&b.close>mid?sgcClamp(dDom/0.5,0,1):0; cS=shape==='b'?sgcClamp((0.5-pocLoc)/0.35,0,1):0; cD=cvdLoP!=null&&cvd>cvdLoP?1:0; }
        candScore=sgcClamp((1.8*cW+2*cEff+2*cT+1.6*cS+1.6*cD)*(shape==='B'?0.55:1),0,10);
        const conf=i<confirmedLast;
        if(p.sig&&conf&&fadeDir!==0&&candScore>=p.minScore&&shape!=='B'&&i-lastSig>=p.cool){ lastSig=i; let tg=candPocP, bd=1e12; if(p.tgt){ npocs.forEach(nn=>{ const ok=fadeDir===1?nn.price>b.close:nn.price<b.close, dd=Math.abs(nn.price-b.close); if(ok&&dd<bd){ bd=dd; tg=nn.price; } }); }
          signals.push({i,dir:fadeDir,score:candScore,shape,delta:barDelta,relVol,pocP:candPocP,tgt:p.tgt?tg:null}); }
        if(p.naked&&conf&&candScore>=p.nkMin&&fadeDir!==0){ npocs.push({price:candPocP,born:i}); while(npocs.length>p.nkMax) npocs.shift(); } } }
    for(let k=npocs.length-1;k>=0;k--){ const nn=npocs[k]; if(i>nn.born&&b.high>=nn.price&&b.low<=nn.price) npocs.splice(k,1); }
    if(i===N-1){ lastC={score:candScore,dir:fadeDir,pocP:candPocP}; last={barVol,barDelta,ibB,ibS,sess,avgVol,cvd}; } }
  // ---- scenario projection (last bar) ----
  let SC=null; const xAt=xi=>sp+s*(xi-startIdx), wallAt=(xi,up)=>xAt(xi)+(up?upB:-dnB);
  if(p.scen){ const px=c[N-1].close, buyR=sgcDiv(tB,tV), flow=(buyR-0.5)+(s>0?0.15:-0.15)+((last.cvd||0)>=0?0.05:-0.05), dir=p.sdir==='Up First'?1:p.sdir==='Down First'?-1:(flow>=0?1:-1);
    const lPOC=endBase+pocDev, lDPO=endBase+dpocDev, lVAH=endBase+vahDev, lVAL=endBase+valDev, wU=endBase+upB, wL=endBase-dnB, pad=(wU-wL)*(p.pad/100), chW=wU-wL, padF=chW!==0?pad/chW:0, useW=p.anchor==='Channel Extremes';
    const near=(d)=>{ let best=null; [lPOC,lDPO,lVAH,lVAL].forEach(v=>{ const ok=d>0?v>px:v<px; if(ok&&(best==null||(d>0?v<best:v>best))) best=v; }); return best; };
    const toF=v=>chW!==0?(v-wL)/chW:0.5, trL=near(dir), tgL=near(-dir);
    const trF=useW||trL==null?(dir>0?1:0):sgcClamp(toF(trL),padF,1-padF), tgF=useW||tgL==null?(dir>0?0:1):sgcClamp(toF(tgL),padF,1-padF), pxF=sgcClamp(toF(px),padF,1-padF);
    const legT=trF-pxF, revF=sgcClamp(trF-legT*(p.revP/100),padF,1-padF), legR=revF-trF, retF=sgcClamp(trF>revF?revF+Math.abs(legR)*(p.retP/100):revF-Math.abs(legR)*(p.retP/100),padF,1-padF);
    let extF=null; if(p.shape==='Extended'){ const far=dir>0?0:1; extF=sgcClamp(tgF+(far-tgF)*0.5,padF,1-padF); }
    const ys=[pxF,trF], nm=['','TRIGGER']; if(p.shape!=='Simple'){ ys.push(revF,retF); nm.push('REVERSE','RETEST'); } ys.push(tgF); nm.push('TARGET'); if(p.shape==='Extended'&&extF!=null){ ys.push(extF); nm.push('EXTENSION'); }
    const legs=ys.length-1; let sumD=0; for(let k=1;k<=legs;k++) sumD+=Math.abs(ys[k]-ys[k-1]);
    const nodes=[{x:N-1,y:wallAt(N-1,false)+ys[0]*(wallAt(N-1,true)-wallAt(N-1,false))}]; let xc=N-1, clamped=false;
    for(let k=1;k<=legs;k++){ const f=ys[k], d=Math.abs(f-ys[k-1]), span=Math.max(4,sumD>0?Math.round(p.proj*d/sumD):6), xK=Math.min(xc+span,N-1+p.chExt+p.proj), lw=wallAt(xK,false), uw=wallAt(xK,true); if(f>=1-padF||f<=padF) clamped=true; nodes.push({x:xK,y:lw+f*(uw-lw)}); xc=xK; }
    SC={dir,nodes,nm,trig:wL+trF*chW,tgt:wL+tgF*chW,legs,clamped,px}; }
  Object.assign(D,{ok:true,N,L,startIdx,s,sp,endBase,upB,dnB,minDev,maxDev,R,slotSz,sVol,sBuy,sSell,tV,tB,tS,maxV,pIdx,dpIdx,pocDev,dpocDev,vahDev,valDev,instT,signals,npocs,SC,lastC,last,ltfState,lIv,i0,M,
    atr14,atr100,cvd,BUY,SELL,POCC,ACC,ltfOk}); return D; }
let sgcMem=null;
function sgcGet(c,p){ const N=c.length, Lc=N?c[N-1]:null, d=sgcLT[sym[0]+'|'+sgcLtfIv(p,sgcSec(tf[0]))], key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+(N?c[0].time+'|'+Lc.time+'|'+Lc.close+'|'+Lc.high+'|'+Lc.low+'|'+(Lc.volume||0):'')+'|'+(d?d.ver:0)+'|'+(d&&d.busy?1:0);
  if(sgcMem&&sgcMem.k===key) return sgcMem.D; let D; try{ D=sgcCompute(c,p,null); }catch(e){ console.error('sgc calc failed',e); D={ok:false,msg:'Strong Gradient Channel: calculation failed'}; } sgcMem={k:key,D}; return D; }
IND.sgc={label:'Strong Gradient Channel',cat:'Trend',nm:()=>'Strong Gradient Channel',p:Object.assign({},SGC_DEF),cols:['#FFB020'],
  fields:[['len','num','1 · Channel Length (bars)',{min:20,max:5000}],['src','sel','1 · Source',{opts:['close','high','low','hl2','hlc3','ohlc4']}],['dev','sel','1 · Band Basis',{opts:['Std Dev','Max Deviation','ATR']}],['upM','num','1 · Upper Band Mult',{min:0.1,max:8,step:0.1}],['dnM','num','1 · Lower Band Mult',{min:0.1,max:8,step:0.1}],['fillCh','chk','1 · Fill Channel Body'],['mid','chk','1 · Show Midline'],
    ['rows','num','2 · Profile Rows',{min:10,max:50}],['wPct','num','2 · Profile Width %',{min:5,max:90}],['side','sel','2 · Profile Anchor',{opts:['Left','Right']}],['split','chk','2 · Split Buy / Sell'],['ramp','chk','2 · Spectral Ramp (volume-weighted)'],['poc','chk','2 · POC Line'],['va','chk','2 · Value Area Lines'],['fillVa','chk','2 · Fill Value Area'],['vaPct','num','2 · Value Area %',{min:40,max:95}],['ext','chk','2 · Profile Extremes (Max/Min)'],['dPoc','chk','2 · Delta POC Line'],['insta','chk','2 · Highlight Institutional Rows'],
    ['ltf','chk','3 · Use Intrabar Volume'],['gran','sel','3 · Intrabar Granularity',{opts:['Auto','1 Minute','5 Minute','15 Minute','1 Hour']}],['cls','sel','3 · Volume Classification',{opts:['Body Direction','Close Location','Blend']}],['blend','num','3 · Blend — Close Location %',{min:0,max:100}],['divLen','num','3 · CVD Divergence Lookback',{min:3,max:100}],
    ['sig','chk','4 · Fade Signals At Channel Walls'],['minScore','num','4 · Min Conviction Score',{min:0,max:10,step:0.5}],['extLen','num','4 · Local Extreme Lookback',{min:2,max:100}],['cool','num','4 · Signal Cooldown (bars)',{min:0,max:50}],['tgt','chk','4 · Fade Target / Invalidation'],['tgtBars','num','4 · Target Line Length',{min:2,max:80}],
    ['naked','chk','5 · Track Untested POCs'],['nkMin','num','5 · Naked POC Min Score',{min:0,max:10,step:0.5}],['nkMax','num','5 · Max Active Naked POCs',{min:1,max:30}],
    ['scen','chk','6 · Build Forward Scenario'],['shape','sel','6 · Path Detail',{opts:['Simple','Standard','Extended']}],['anchor','sel','6 · Trigger / Target Anchor',{opts:['Channel Extremes','Key Levels']}],['sdir','sel','6 · Trigger Direction',{opts:['Auto (net flow)','Up First','Down First']}],['proj','num','6 · Projection Length (bars)',{min:12,max:400}],['revP','num','6 · Reverse Retrace (% of trigger leg)',{min:10,max:95,step:5}],['retP','num','6 · Retest Recovery (% of reverse leg)',{min:10,max:95,step:5}],['pad','num','6 · Wall Padding (% of channel width)',{min:0,max:25,step:0.5}],['sCol','col','6 · Path Color'],['glow','chk','6 · Glow'],['slab','chk','6 · Waypoint Labels'],['rails','chk','6 · Trigger / Target Rails'],['chExt','num','6 · Extend Channel Right (bars)',{min:0,max:500}],
    ['dash','chk','7 · Show Command Dashboard'],['dpos','sel','7 · Dashboard Position',{opts:['Top Right','Middle Right','Bottom Right','Bottom Left','Top Left']}],['dsize','sel','7 · Dashboard Text Size',{opts:['Tiny','Small','Normal','Large']}],['theme','sel','7 · Color Theme',{opts:Object.keys(SGC_TH)}],['custom','chk','7 · Use Custom Colors'],['cuBuy','col','7 · Bullish Volume'],['cuSell','col','7 · Bearish Volume'],['cuPoc','col','7 · POC'],['cuAcc','col','7 · Accent'],['legend','chk','7 · Show Legend Key'],['lpos','sel','7 · Legend Position',{opts:['Bottom Right','Bottom Left','Middle Left']}]],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},SGC_DEF,p), D=sgcGet(c,q); return {mk:[],boxes:[{type:'sgcview',pts:[],o:q,D}],labels:[],events:[]}; }};
function sgcMeter(pct,n){ const f=Math.round(sgcClamp(pct,0,100)/100*n); let s=''; for(let i=0;i<n;i++) s+=i<f?'▰':'▱'; return s; }
function sgcSplit(pct,n){ const f=Math.round(sgcClamp(pct,0,100)/100*n); let s=''; for(let i=0;i<n;i++) s+=i<f?'█':'▒'; return s; }
function sgcStars(sc){ const f=Math.round(sgcClamp(sc,0,10)/2); let s=''; for(let i=0;i<5;i++) s+=i<f?'★':'☆'; return s; }
const sgcTier=sc=>sc>=8.5?'EXT':sc>=7?'V.STR':sc>=5.5?'STR':sc>=4?'MOD':'WK', sgcTierN=sc=>sc>=8.5?'EXTREME':sc>=7?'VERY STRONG':sc>=5.5?'STRONG':sc>=4?'MODERATE':'WEAK';
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='sgcview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, N=candles.length; if(!D||!N) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    if(!D.ok||D.N!==N){ if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); } cx.restore(); return; }
    const xe=X(N-1), xp=X(N-2); if(xe==null||xp==null||!(xe-xp>0)){ cx.restore(); return; } const bw=xe-xp, xi=i=>xe+(i-(N-1))*bw, yv=(i,dv)=>Y(D.sp+D.s*(i-D.startIdx)+(dv||0));
    const BUY=D.BUY,SELL=D.SELL,POCC=D.POCC,ACC=D.ACC, th=SGC_TH[p.theme]||SGC_TH['Obsidian Aurora'], si=D.startIdx, eE=N-1+p.chExt, endCh=N-1, fnt=(z,b)=>{ cx.font=(b?'bold ':'')+z+'px system-ui,sans-serif'; };
    const line=(i1,y1,i2,y2,col,w,dash)=>{ const a=xi(i1), b=xi(i2); if(y1==null||y2==null) return; cx.strokeStyle=col; cx.lineWidth=w||1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(a,y1); cx.lineTo(b,y2); cx.stroke(); cx.setLineDash([]); };
    const lab=(t,i,y,col,z)=>{ if(y==null) return; fnt(z||10); cx.fillStyle=col; cx.textAlign='left'; cx.fillText(t,xi(i)+4,y); };
    const lvl=(dv)=>({a:yv(si,dv),b:yv(eE,dv)});
    // channel
    const uA=yv(si,D.upB), uB=yv(eE,D.upB), lA=yv(si,-D.dnB), lB=yv(eE,-D.dnB);
    if(p.fillCh&&uA!=null&&uB!=null&&lA!=null&&lB!=null){ cx.fillStyle=sgcA(ACC,0.06); cx.beginPath(); cx.moveTo(xi(si),uA); cx.lineTo(xi(eE),uB); cx.lineTo(xi(eE),lB); cx.lineTo(xi(si),lA); cx.closePath(); cx.fill(); }
    if(p.va&&p.fillVa){ const a=yv(si,D.vahDev), b=yv(eE,D.vahDev), c2=yv(eE,D.valDev), d2=yv(si,D.valDev); if(a!=null&&b!=null&&c2!=null&&d2!=null){ cx.fillStyle=sgcA(ACC,0.10); cx.beginPath(); cx.moveTo(xi(si),a); cx.lineTo(xi(eE),b); cx.lineTo(xi(eE),c2); cx.lineTo(xi(si),d2); cx.closePath(); cx.fill(); } }
    if(p.mid) line(si,yv(si,0),eE,yv(eE,0),sgcA(SGC_TXT,0.45),1);
    line(si,uA,eE,uB,sgcA(SELL,0.8),2); line(si,lA,eE,lB,sgcA(BUY,0.8),2);
    // sloped profile
    const left=p.side==='Left', profW=Math.max(D.L*(+p.wPct||34)*0.01,5), inv=D.maxV>0?1/D.maxV:0;
    const quad=(x0,x1,dB,dT,fill,stroke)=>{ const a=yv(x0,dB), b=yv(x0,dT), c2=yv(x1,dT), d2=yv(x1,dB); if(a==null||b==null||c2==null||d2==null) return; cx.beginPath(); cx.moveTo(xi(x0),a); cx.lineTo(xi(x0),b); cx.lineTo(xi(x1),c2); cx.lineTo(xi(x1),d2); cx.closePath(); cx.fillStyle=fill; cx.fill(); cx.strokeStyle=stroke; cx.lineWidth=1; cx.stroke(); };
    for(let j=0;j<D.R;j++){ const sv=D.sVol[j]; if(!(sv>0)) continue; const dB=D.minDev+D.slotSz*j, dT=dB+D.slotSz, vf=sv*inv, isI=p.insta&&sv>D.instT, rc=sgcRamp(vf,th.r), buyC=isI?SGC_INSTA:(p.ramp?rc:BUY), sellC=isI?SGC_INSTA:(p.ramp?rc:SELL);
      if(p.split){ const iB=Math.round(D.sBuy[j]*inv*profW), iS=Math.round(D.sSell[j]*inv*profW), b0=left?si:endCh-iB, b1=left?si+iB:endCh, s0=left?b1:b0-iS, s1=left?b1+iS:b0;
        if(iB>0) quad(b0,b1,dB,dT,sgcA(buyC,0.78),sgcA(buyC,0.85)); if(iS>0) quad(s0,s1,dB,dT,sgcA(sellC,p.ramp?0.55*0.75:0.55),sgcA(sellC,0.85)); }
      else{ const iT=Math.round(vf*profW); if(iT>0){ const x0=left?si:endCh-iT, x1=left?si+iT:endCh, nb=D.sBuy[j]>=D.sSell[j], col=isI?SGC_INSTA:(p.ramp?rc:(nb?BUY:SELL)); quad(x0,x1,dB,dT,sgcA(col,0.7),sgcA(col,0.85)); } } }
    // key lines
    if(p.poc){ const a=yv(si,D.pocDev), b=yv(eE,D.pocDev); line(si,a,eE,b,POCC,3); lab('POC '+sgcP(D.endBase+D.s*p.chExt+D.pocDev),eE,b,POCC,11); }
    if(p.dPoc){ const a=yv(si,D.dpocDev), b=yv(eE,D.dpocDev); line(si,a,eE,b,ACC,2,[6,4]); lab('ΔPOC',eE,b,ACC,11); }
    if(p.va){ [['VAH',D.vahDev],['VAL',D.valDev]].forEach(q=>{ const a=yv(si,q[1]), b=yv(eE,q[1]); line(si,a,eE,b,sgcA(ACC,0.7),1,[6,4]); lab(q[0],eE,b,sgcA(ACC,0.8),9); }); }
    if(p.ext){ [D.maxDev,D.minDev].forEach(v=>line(si,yv(si,v),eE,yv(eE,v),sgcA(SGC_MUT,0.6),1,[1,3])); }
    lab('UPPER',eE,uB,sgcA(SELL,0.8),9); lab('LOWER',eE,lB,sgcA(BUY,0.8),9);
    // naked POCs, fade signals and targets
    if(p.naked) D.npocs.forEach(n=>line(n.born,Y(n.price),N,Y(n.price),sgcA(POCC,0.7),2));
    D.signals.forEach(sg=>{ const b=candles[sg.i], x=xi(sg.i), col=sg.dir===1?BUY:SELL, t=(sg.dir===1?'FADE ▲ ':'FADE ▼ ')+sg.score.toFixed(1); fnt(10,true); const w=cx.measureText(t).width+10, up=sg.dir===1, yb=Y(up?b.low:b.high); if(yb==null) return;
      const y0=up?yb+5:yb-5-16; cx.fillStyle=sgcA(col,0.88); cx.beginPath(); cx.moveTo(x,yb+(up?2:-2)); cx.lineTo(x-4,y0+(up?0:16)); cx.lineTo(x+4,y0+(up?0:16)); cx.closePath(); cx.fill();
      cx.beginPath(); if(cx.roundRect) cx.roundRect(x-w/2,y0,w,16,4); else cx.rect(x-w/2,y0,w,16); cx.fill(); cx.fillStyle='#fff'; cx.textAlign='center'; cx.fillText(t,x,y0+8);
      if(sg.tgt!=null){ const yt=Y(sg.tgt); if(yt!=null) line(sg.i,yt,sg.i+p.tgtBars,yt,sgcA(col,0.75),1,[1,3]); } });
    // scenario
    const SC=D.SC; if(SC){ const sc=p.sCol, nd=SC.nodes, ys=nd.map(n=>Y(n.y)); if(ys.every(v=>v!=null)){
      for(let k=1;k<nd.length;k++){ if(p.glow) line(nd[k-1].x,ys[k-1],nd[k].x,ys[k],sgcA(sc,0.18),5); line(nd[k-1].x,ys[k-1],nd[k].x,ys[k],sc,2); }
      for(let k=1;k<nd.length;k++){ const x=xi(nd[k].x), y=ys[k]; cx.fillStyle=sc; cx.beginPath(); cx.moveTo(x,y-6); cx.lineTo(x+6,y); cx.lineTo(x,y+6); cx.lineTo(x-6,y); cx.closePath(); cx.fill();
        if(k===nd.length-1){ const dn=nd[k].y<nd[k-1].y; cx.beginPath(); if(dn){ cx.moveTo(x,y); cx.lineTo(x-7,y-13); cx.lineTo(x+7,y-13); } else{ cx.moveTo(x,y); cx.lineTo(x-7,y+13); cx.lineTo(x+7,y+13); } cx.closePath(); cx.fill(); }
        if(p.slab){ const pc=SC.px>0?(nd[k].y-SC.px)/SC.px*100:0; fnt(12); cx.fillStyle=sc; cx.textAlign='left'; cx.fillText(SC.nm[k]+'  '+sgcP(nd[k].y)+'   ('+(pc>=0?'+':'')+pc.toFixed(2)+'%)',x+10,y); } }
      if(p.rails){ const xr=nd[nd.length-1].x; [SC.trig,SC.tgt].forEach(v=>{ const y=Y(v); if(y!=null) line(N-1,y,xr,y,sgcA(sc,0.4),1,[1,3]); }); } } }
    // dashboard + legend
    const box=(rows,pos,z,title)=>{ fnt(z); const rh=z+7; const cw=[0,0,0]; rows.forEach(r=>{ if(r.h) return; [r.l,r.m,r.v].forEach((t,k)=>{ cw[k]=Math.max(cw[k],cx.measureText(String(t)).width+10); }); });
      const hw=cx.measureText(title).width+16; const tw=Math.max(cw[0]+cw[1]+cw[2],hw), th2=rh*(rows.length+1); const mx=pos.indexOf('Left')>=0?6:W-tw-6, my=pos.indexOf('Top')===0?6:pos.indexOf('Middle')===0?(H-th2)/2:H-th2-6;
      cx.fillStyle=sgcA(th.panel,0.94); cx.fillRect(mx,my,tw,th2); cx.strokeStyle=sgcA(ACC,0.45); cx.lineWidth=1; cx.strokeRect(mx+.5,my+.5,tw,th2);
      cx.fillStyle=sgcA(ACC,0.72); cx.fillRect(mx,my,tw,rh); cx.fillStyle=SGC_TXT; cx.textAlign='center'; fnt(z,true); cx.fillText(title,mx+tw/2,my+rh/2); fnt(z);
      rows.forEach((r,k)=>{ const y=my+rh*(k+1)+rh/2; if(r.h){ cx.fillStyle=sgcA(ACC,0.14); cx.fillRect(mx,y-rh/2,tw,rh); cx.fillStyle=ACC; cx.textAlign='center'; cx.fillText(r.l,mx+tw/2,y); return; }
        const sc2=tw/(cw[0]+cw[1]+cw[2]); cx.textAlign='left'; cx.fillStyle=r.lc||SGC_MUT; cx.fillText(r.l,mx+5,y); cx.textAlign='center'; cx.fillStyle=r.mc||SGC_TXT; cx.fillText(r.m,mx+cw[0]*sc2+cw[1]*sc2/2,y); cx.textAlign='right'; cx.fillStyle=r.vc||SGC_TXT; cx.fillText(r.v,mx+tw-5,y); }); };
    if(p.dash){ const z=SGC_FS[p.dsize]||10, L=D.last||{}, lc=D.lastC, up=D.s>0, slopePct=sgcDiv(D.s*(D.L-1),candles[N-1].close)*100, cl=candles[N-1].close, upW=D.endBase+D.upB, dnW=D.endBase-D.dnB, pos=sgcClamp(sgcDiv(cl-dnW,upW-dnW)*10,0,10);
      const regime=cl>upW?'OVERBOUGHT':cl<dnW?'OVERSOLD':'INSIDE', buyR=sgcDiv(D.tB,D.tV), poc=D.endBase+D.pocDev, dpo=D.endBase+D.dpocDev, vah=D.endBase+D.vahDev, val=D.endBase+D.valDev, bp=sgcDiv(L.ibB||0,L.barVol||0)*100, rel=sgcDiv(L.barVol||0,L.avgVol==null?(L.barVol||1):L.avgVol);
      const cB=up?BUY:SELL, cvC=(L.cvd||0)>=0?BUY:SELL, dC=(L.barDelta||0)>=0?BUY:SELL, vaB=sgcDiv(D.vahDev-D.valDev,D.slotSz), comp=sgcClamp(10-vaB/D.R*10,0,10), volP=sgcClamp(sgcDiv(D.atr14||0,D.atr100||D.atr14||1)*50,0,100);
      const vst=volP<40?'COMPRESSED':volP>65?'EXPANSION':'NORMAL', ov=regime==='OVERSOLD'&&buyR>=0.5?'BULLISH REVERSAL WATCH':regime==='OVERBOUGHT'&&buyR<=0.5?'BEARISH REVERSAL WATCH':up?'BULL TREND':'BEAR TREND', ovC=/BULL/.test(ov)?BUY:/BEAR/.test(ov)?SELL:POCC, SC2=D.SC;
      const rows=[{l:D.ltfState==='ok'||D.ltfState==='refresh'?'LTF '+D.lIv+' loaded':'LTF '+D.lIv+' '+D.ltfState,m:'',v:sym[0],lc:SGC_MUT,vc:SGC_MUT},{h:1,l:'◤ CHANNEL & TREND ◢'},
        {l:'LinReg Slope',m:up?'▲ Bullish':'▼ Bearish',v:slopePct.toFixed(2)+'%',mc:cB,vc:cB},{l:'Channel Pos',m:sgcMeter(pos*10,8),v:pos.toFixed(1)+'/10',mc:pos>=7?SELL:pos<=3?BUY:POCC},{l:'Price Regime',m:regime,v:sgcP(cl),mc:regime==='OVERBOUGHT'?SELL:regime==='OVERSOLD'?BUY:SGC_MUT},{l:'Upper Wall',m:'▲ resistance',v:sgcP(upW),mc:SELL,vc:SELL},{l:'Lower Wall',m:'▼ support',v:sgcP(dnW),mc:BUY,vc:BUY},
        {h:1,l:'◤ LIVE ORDER FLOW ◢'},{l:'Delta',m:sgcMeter(Math.abs(sgcDiv(L.barDelta||0,L.barVol||0))*100,8),v:((L.barDelta||0)>0?'+':'')+sgcV(L.barDelta||0),mc:dC,vc:dC},{l:'Buy / Sell',m:sgcSplit(bp,8),v:Math.round(bp)+' / '+Math.round(100-bp)+'%',mc:bp>=50?BUY:SELL},{l:'CVD',m:(L.cvd||0)>=0?'▲ ▲ ▲':'▼ ▼ ▼',v:sgcV(L.cvd||0),mc:cvC,vc:cvC},{l:'Session Δ',m:'',v:((L.sess||0)>0?'+':'')+sgcV(L.sess||0),vc:(L.sess||0)>=0?BUY:SELL},{l:'Rel Volume',m:sgcMeter(sgcClamp(rel*40,0,100),8),v:rel.toFixed(2)+'x',mc:rel>1.5?POCC:ACC},
        {h:1,l:'◤ VOLUME PROFILE ◢'},{l:'Volume POC',m:cl>=poc?'ABOVE':'BELOW',v:sgcP(poc),mc:cl>=poc?BUY:SELL,vc:POCC},{l:'Delta POC',m:'Δ max',v:sgcP(dpo),mc:ACC,vc:ACC},{l:'Value Area',m:cl<=vah&&cl>=val?'INSIDE':'OUTSIDE',v:sgcP(val)+'..'+sgcP(vah),mc:ACC},{l:'Buy Bias',m:sgcSplit(buyR*100,8),v:Math.round(buyR*100)+'% '+(buyR>=0.6?'DEMAND':buyR<=0.4?'SUPPLY':'BATTLE'),mc:buyR>=0.55?BUY:buyR<=0.45?SELL:POCC},{l:'Compression',m:sgcMeter(comp*10,8),v:comp.toFixed(1)+'/10',mc:comp>=7?POCC:ACC},
        {h:1,l:'◤ AUCTION & FADE ◢'},{l:'Conviction',m:sgcMeter(lc.score*10,8),v:lc.score.toFixed(1)+'/10 '+sgcTier(lc.score),mc:lc.score>=7?(lc.dir===1?BUY:SELL):lc.score>=5.5?POCC:SGC_MUT},{l:'Fade Signal',m:sgcStars(lc.score),v:lc.dir===0?'NONE':lc.dir===1?'FADE ▲ LONG':'FADE ▼ SHORT',mc:lc.dir===1?BUY:lc.dir===-1?SELL:SGC_MUT,vc:lc.dir===1?BUY:lc.dir===-1?SELL:SGC_MUT},{l:'Naked POCs',m:D.npocs.length+' active',v:'',mc:ACC},
        {h:1,l:'◤ REGIME ◢'},{l:'Volatility',m:sgcMeter(volP,8),v:vst,mc:volP>65?POCC:ACC,vc:volP>65?POCC:ACC},{l:'Trend Bias',m:up?'▲ Bullish':'▼ Bearish',v:sgcTierN(Math.abs(slopePct)*4),mc:cB,vc:cB},{l:'CVD State',m:(L.cvd||0)>=0?'ACCUMULATION':'DISTRIBUTION',v:'',mc:cvC},{l:'SIGNAL',m:ov,v:'',mc:ovC,lc:SGC_TXT}];
      if(SC2){ const mv=(SC2.tgt-cl)/cl*100; rows.push({h:1,l:'◤ SCENARIO PATH ◢'},{l:'Direction',m:SC2.dir>0?'▲ UP FIRST':'▼ DOWN FIRST',v:'path',mc:SC2.dir>0?BUY:SELL},{l:'Trigger',m:'→',v:sgcP(SC2.trig),mc:p.sCol,vc:p.sCol},{l:'Target',m:(mv>=0?'+':'')+mv.toFixed(2)+'%',v:sgcP(SC2.tgt),mc:SC2.dir>0?BUY:SELL},{l:'Containment',m:SC2.clamped?'CLAMPED TO WALLS':'INSIDE WALLS',v:SC2.legs+' legs',mc:SC2.clamped?POCC:BUY}); }
      box(rows,p.dpos,z,'⚡ STRONG GRADIENT CHANNEL'); }
    if(p.legend){ const rows=[{l:'█',m:'Bullish (buy) profile volume',v:'',lc:BUY},{l:'█',m:'Bearish (sell) profile volume',v:'',lc:SELL},{l:'▬',m:'POC — highest-volume row',v:'',lc:POCC},{l:'▬',m:'ΔPOC / value-area levels',v:'',lc:ACC},{l:'█',m:'Institutional row (vol > mean + 2σ)',v:'',lc:SGC_INSTA},{l:'▲▼',m:'Contrarian fade at a channel wall',v:'',lc:SGC_TXT},{l:'┈',m:'Naked POC magnet (untested)',v:'',lc:POCC},{l:'╱',m:'Scenario path inside the channel',v:'',lc:p.sCol}];
      box(rows,p.lpos==='Middle Left'?'Middle Left':p.lpos,10,'STRONG GRADIENT CHANNEL — KEY'); }
    // status line
    if(D.ltfOk&&(D.ltfState==='loading'||D.ltfState==='error')){ cx.font='10px system-ui,sans-serif'; cx.fillStyle='rgba(255,193,7,.9)'; cx.textAlign='left'; cx.fillText(D.ltfState==='loading'?'Strong Gradient Channel: loading '+D.lIv+' intrabar candles…':'Strong Gradient Channel: could not load '+D.lIv+' intrabar candles (signals off)',10,H-12); }
    cx.restore(); }; }
try{ DESC.sgc='LinReg channel with a sloped buy / sell volume profile, POC and value area, intrabar order flow, contrarian fade signals at the walls, naked POCs and a forward scenario path clamped inside the channel'; }catch(e){}
}catch(err){ console.error('sgc indicator failed',err); window.__sgcErr=err; }

// ---- [cwr] PREMIUM STRATEGY: Cardwell Range Analyze - port of the Pine v6 script "Cardwell Range Analyze [MarkitTick]" (c) MarkitTick, CC BY-NC-SA 4.0 (self-contained: every name starts with cw / CW) ----
// Andrew Cardwell's RSI range rules: in an uptrend RSI lives between 40 and 80, in a downtrend between 20 and 60.
//  1. TREND   - price above (below) the trend moving average (50 SMA by default) = uptrend (downtrend).
//  2. REGIME  - BULLISH = uptrend and RSI inside the bull range; BEARISH = downtrend and RSI inside the bear range. It must hold for N bars in a row (confirmation bars).
//  3. SIGNAL  - BUY on the first candle that turns BULLISH, SELL on the first candle that turns BEARISH (closed candles only, nothing repaints).
//  4. FILTERS - optional higher-time-frame regime (built from the loaded candles, last CLOSED higher candle) and optional ADX chop filter.
//  5. LEVELS  - entry, stop loss (ATR x 1.5) and three ATR take-profits, drawn for the latest signal. Candles are coloured by regime, a dashboard shows the live state.
try{
const CW_DEF={rsiLen:14,rsiSrc:'close',trendLen:50,trendSrc:'close',bullLo:40,bullHi:80,bearLo:20,bearHi:60,confirm:2,
  useHtf:false,htf:'4 hours',useAdx:false,adxLen:14,adxMin:20,
  atrLen:14,slMult:1.5,tp1:1,tp2:2,tp3:3,entryMode:'Previous close (as the original)',ext:50,lvKeep:1,keep:20,
  showCandles:true,showSignals:true,showLevels:true,showDash:true,dashPos:'Top right',
  cBull:'#26a69a',cBear:'#ef5350',cNeut:'#787b86',cBorder:'#000000',cBuy:'#2196f3',cSell:'#ff9800',cSL:'#ef5350',cEntry:'#2196f3',cTP:'#26a69a',cRisk:'#ef5350',cReward:'#26a69a',
  alLong:true,alShort:true,alSound:false};
const CW_HTF={'1 min':60,'3 min':180,'5 min':300,'15 min':900,'30 min':1800,'1 hour':3600,'2 hours':7200,'4 hours':14400,'Daily':86400,'Weekly':604800};
const cwA=(hex,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const cwFx=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=100?v.toFixed(2):Math.abs(v)>=1?v.toFixed(4):v.toFixed(6);
function cwSrc(c,name){ const N=c.length, o=new Float64Array(N); for(let i=0;i<N;i++){ const x=c[i]; o[i]=name==='open'?x.open:name==='high'?x.high:name==='low'?x.low:name==='hl2'?(x.high+x.low)/2:name==='hlc3'?(x.high+x.low+x.close)/3:name==='ohlc4'?(x.open+x.high+x.low+x.close)/4:x.close; } return o; }
function cwSma(v,n){ const N=v.length, o=new Float64Array(N).fill(NaN); let s=0; for(let i=0;i<N;i++){ s+=v[i]; if(i>=n) s-=v[i-n]; if(i>=n-1) o[i]=s/n; } return o; }
function cwRma(v,n,from){ const N=v.length, o=new Float64Array(N).fill(NaN); let s=0,k=0,r=NaN; for(let i=from||0;i<N;i++){ const x=v[i]; if(!(x===x)) continue; if(k<n){ s+=x; k++; if(k===n){ r=s/n; o[i]=r; } } else { r=(r*(n-1)+x)/n; o[i]=r; } } return o; }
function cwRsi(v,L){ const N=v.length, up=new Float64Array(N).fill(NaN), dn=new Float64Array(N).fill(NaN); for(let i=1;i<N;i++){ const d=v[i]-v[i-1]; up[i]=d>0?d:0; dn[i]=d<0?-d:0; }
  const a=cwRma(up,L,1), b=cwRma(dn,L,1), o=new Float64Array(N).fill(NaN); for(let i=0;i<N;i++) if(a[i]===a[i]&&b[i]===b[i]) o[i]=b[i]===0?100:100-100/(1+a[i]/b[i]); return o; }
function cwTr(c){ const N=c.length, o=new Float64Array(N); for(let i=0;i<N;i++){ const h=c[i].high,l=c[i].low; o[i]=i?Math.max(h-l,Math.abs(h-c[i-1].close),Math.abs(l-c[i-1].close)):h-l; } return o; }
function cwAdx(c,L){ const N=c.length, tr=cwTr(c), pdm=new Float64Array(N), mdm=new Float64Array(N);
  for(let i=1;i<N;i++){ const up=c[i].high-c[i-1].high, dn=c[i-1].low-c[i].low; pdm[i]=(up>dn&&up>0)?up:0; mdm[i]=(dn>up&&dn>0)?dn:0; }
  const rt=cwRma(tr,L), rp=cwRma(pdm,L,1), rm=cwRma(mdm,L,1), dx=new Float64Array(N).fill(NaN);
  for(let i=0;i<N;i++){ if(!(rt[i]>0)||rp[i]!==rp[i]||rm[i]!==rm[i]) continue; const p=100*rp[i]/rt[i], m=100*rm[i]/rt[i], s=p+m; dx[i]=100*Math.abs(p-m)/(s===0?1:s); }
  let f=0; while(f<N&&!(dx[f]===dx[f])) f++; return cwRma(dx,L,f); }
// the Cardwell regime itself, used on the chart candles and on the folded higher-time-frame candles
function cwRegime(src,tsrc,p){ const N=src.length, L=Math.max(1,Math.round(+p.rsiLen)||14), T=Math.max(1,Math.round(+p.trendLen)||50), cf=Math.max(1,Math.round(+p.confirm)||1);
  const rsi=cwRsi(src,L), ma=cwSma(tsrc,T), reg=new Int8Array(N), bc=new Int32Array(N), rc=new Int32Array(N), up=new Uint8Array(N), dn=new Uint8Array(N), bR=new Uint8Array(N), rR=new Uint8Array(N); let b=0,r=0;
  for(let i=0;i<N;i++){ const ok=rsi[i]===rsi[i]&&ma[i]===ma[i]; const u=ok&&tsrc[i]>ma[i], d=ok&&tsrc[i]<ma[i]; up[i]=u?1:0; dn[i]=d?1:0;
    const inBull=ok&&rsi[i]>=p.bullLo&&rsi[i]<=p.bullHi, inBear=ok&&rsi[i]>=p.bearLo&&rsi[i]<=p.bearHi, bRaw=u&&inBull, rRaw=d&&inBear; bR[i]=bRaw?1:0; rR[i]=rRaw?1:0;
    b=bRaw?b+1:0; r=rRaw?r+1:0; bc[i]=b; rc[i]=r; reg[i]=(bRaw&&b>=cf)?1:(rRaw&&r>=cf)?-1:0; }
  return {rsi,ma,reg,bc,rc,up,dn,bR,rR}; }
// higher time frame: fold the loaded candles into HTF candles, take the regime of the last CLOSED HTF candle (same as request.security(...)[1])
function cwHtfState(c,p,out){ const sec=CW_HTF[p.htf]||14400, N=c.length, bars=[], idx=new Int32Array(N);
  for(let i=0;i<N;i++){ const k=Math.floor(c[i].time/sec); let b=bars[bars.length-1]; if(!b||b.k!==k){ b={k,time:k*sec,open:c[i].open,high:c[i].high,low:c[i].low,close:c[i].close}; bars.push(b); } else { if(c[i].high>b.high) b.high=c[i].high; if(c[i].low<b.low) b.low=c[i].low; b.close=c[i].close; } idx[i]=bars.length-1; }
  const R=cwRegime(cwSrc(bars,p.rsiSrc),cwSrc(bars,p.trendSrc),p), st=new Int8Array(N); out.htfBars=bars.length;
  for(let i=0;i<N;i++){ const j=idx[i]-1; st[i]=j>=0?R.reg[j]:0; } return st; }
function cwCompute(c,p,forming){
  const N=c.length, D={N,ok:false,msg:'',sig:[],ev:[],R:null,adx:null,atr:null,htf:null,n:forming?N-1:N};
  const need=Math.max(+p.rsiLen||14,+p.trendLen||50,2*(+p.adxLen||14),+p.atrLen||14)+10; if(N<need){ D.msg='Cardwell Range: needs at least '+need+' candles (loaded '+N+')'; return D; }
  const R=cwRegime(cwSrc(c,p.rsiSrc),cwSrc(c,p.trendSrc),p), adx=cwAdx(c,Math.max(2,Math.round(+p.adxLen)||14)), atr=cwRma(cwTr(c),Math.max(1,Math.round(+p.atrLen)||14));
  D.R=R; D.adx=adx; D.atr=atr;
  let htf=null; if(p.useHtf){ htf=cwHtfState(c,p,D); D.htf=htf; if(D.htfBars<(+p.trendLen||50)+2) D.msg='HTF filter: only '+D.htfBars+' higher candles can be built from the loaded candles (needs '+((+p.trendLen||50)+2)+'), use a lower HTF'; }
  const prevClose=(p.entryMode||'').indexOf('Previous')===0;
  for(let i=1;i<D.n;i++){ const cur=R.reg[i], prv=R.reg[i-1]; if(cur===0||cur===prv) continue; const d=cur;
    if(p.useHtf&&!(htf&&htf[i]===d)) continue;
    if(p.useAdx&&!(adx[i]>=(+p.adxMin||0))) continue;
    const a=atr[i]; if(!(a>0)) continue; const e=prevClose?c[i-1].close:c[i].close;
    D.sig.push({d,i,time:c[i].time,entry:e,sl:e-d*a*p.slMult,tp1:e+d*a*p.tp1,tp2:e+d*a*p.tp2,tp3:e+d*a*p.tp3}); }
  D.sig.forEach((s,k)=>{ D.ev.push({type:s.d>0?'long':'short',time:s.time,idx:s.i,price:s.entry}); });
  D.ok=true; return D; }
let cwMem=null;
function cwGet(c,p){ const N=c.length, iv=N>1?c[N-1].time-c[N-2].time:0, forming=N>0&&iv>0&&(c[N-1].time+iv)*1000>Date.now();
  const key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+forming+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(cwMem&&cwMem.k===key) return cwMem.D;
  let D; try{ D=cwCompute(c,p,forming); }catch(e){ console.error('cwr calc failed',e); D={N,ok:false,msg:'',sig:[],ev:[],R:null}; } cwMem={k:key,D}; return D; }
IND.cwr={label:'Cardwell Range Analyze \u00b7 RSI regime BUY / SELL',title:'Cardwell Range Analyze \u00b7 RSI regime BUY / SELL',cat:'Premium Strategy',nm:p=>'Cardwell Range '+(p&&p.rsiLen||14)+' / '+(p&&p.trendLen||50),p:Object.assign({},CW_DEF),cols:[],calc:()=>[],live:true,
  fields:[['rsiLen','num','RSI length',{min:1,max:200}],['rsiSrc','sel','RSI source',{opts:['close','open','high','low','hl2','hlc3','ohlc4']}],
    ['trendLen','num','Trend MA length',{min:1,max:500}],['trendSrc','sel','Trend source',{opts:['close','open','high','low','hl2','hlc3','ohlc4']}],
    ['bullLo','num','Bull range low (uptrend RSI floor)',{min:0,max:100}],['bullHi','num','Bull range high',{min:0,max:100}],['bearLo','num','Bear range low',{min:0,max:100}],['bearHi','num','Bear range high (downtrend RSI ceiling)',{min:0,max:100}],
    ['confirm','num','Regime confirm bars',{min:1,max:20}],
    ['useHtf','chk','Use higher-time-frame confirmation'],['htf','sel','HTF timeframe',{opts:Object.keys(CW_HTF)}],
    ['useAdx','chk','Use chop filter (ADX)'],['adxLen','num','ADX length',{min:1,max:200}],['adxMin','num','ADX minimum strength',{min:0,max:100}],
    ['atrLen','num','ATR length',{min:1,max:200}],['slMult','num','SL ATR multiplier',{min:0.1,max:20,step:0.1}],['tp1','num','TP1 ATR multiplier',{min:0.1,max:30,step:0.1}],['tp2','num','TP2 ATR multiplier',{min:0.1,max:30,step:0.1}],['tp3','num','TP3 ATR multiplier',{min:0.1,max:30,step:0.1}],
    ['entryMode','sel','Entry price',{opts:['Previous close (as the original)','Signal candle close']}],['ext','num','Level line extend (bars)',{min:1,max:500}],['lvKeep','num','Signals whose levels stay on the chart',{min:1,max:10}],['keep','num','BUY / SELL signs to display',{min:1,max:200}],
    ['showCandles','chk','Colour candles by regime'],['showSignals','chk','Show BUY / SELL signals'],['showLevels','chk','Show trade levels (SL / Entry / TP1-TP3)'],['showDash','chk','Show dashboard'],['dashPos','sel','Dashboard position',{opts:['Top right','Top left','Bottom right','Bottom left']}],
    ['cBull','col','Bull candle'],['cBear','col','Bear candle'],['cNeut','col','Neutral candle'],['cBorder','col','Candle border'],['cBuy','col','BUY sign'],['cSell','col','SELL sign'],['cSL','col','SL line'],['cEntry','col','Entry line'],['cTP','col','TP lines'],['cRisk','col','Risk zone'],['cReward','col','Reward zone'],
    ['alLong','chk','Alert on BUY (also closes a short)'],['alShort','chk','Alert on SELL (also closes a long)'],['alSound','chk','Play a sound']],
  extras:(c,p)=>{ const q=Object.assign({},CW_DEF,p), D=cwGet(c,q), mk=[];
    if(D.ok&&q.showSignals) D.sig.slice(-Math.max(1,Math.round(+q.keep)||20)).forEach(s=>mk.push({time:s.time,position:s.d>0?'belowBar':'aboveBar',color:s.d>0?q.cBuy:q.cSell,shape:s.d>0?'arrowUp':'arrowDown',text:s.d>0?'BUY':'SELL',size:.9,keep:true}));
    mk.sort((a,b)=>a.time-b.time);
    return {mk,boxes:[{type:'cwrview',pts:[],o:q,D,c}],labels:[],events:D.ok?D.ev:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='cwrview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, c=d.c; if(!D) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.textBaseline='middle';
    if(D.ok&&D.R){ const R=D.R, N=D.N;
      // 1) heatmap candles (drawn over the normal ones, like plotcandle in the Pine script)
      if(p.showCandles&&c){ const xa=X(N-1), xb=X(N-2), step=(xa!=null&&xb!=null)?Math.abs(xa-xb):6, bw=Math.max(1,Math.min(step*.72,40));
        for(let i=0;i<N;i++){ const x=X(i); if(x==null||x<-bw-4||x>W+bw+4) continue; const k=c[i], yo=Y(k.open), yc=Y(k.close), yh=Y(k.high), yl=Y(k.low); if(yo==null||yc==null||yh==null||yl==null) continue;
          const col=R.reg[i]>0?p.cBull:R.reg[i]<0?p.cBear:p.cNeut; cx.strokeStyle=col; cx.lineWidth=1; cx.beginPath(); cx.moveTo(x,yh); cx.lineTo(x,yl); cx.stroke();
          const top=Math.min(yo,yc), hh=Math.max(1,Math.abs(yc-yo)); cx.fillStyle=col; cx.fillRect(x-bw/2,top,bw,hh); if(bw>=3){ cx.strokeStyle=p.cBorder; cx.lineWidth=1; cx.strokeRect(x-bw/2+.5,top+.5,bw-1,Math.max(0,hh-1)); } } }
      // 2) trade levels of the latest signal(s)
      if(p.showLevels&&D.sig.length){ const xa=X(N-1), xb=X(N-2), step=(xa!=null&&xb!=null)?Math.abs(xa-xb):6, ext=Math.max(1,Math.round(+p.ext)||50);
        const lab=(t,x,y,bg)=>{ cx.font='10px system-ui,sans-serif'; const w=cx.measureText(t).width+10; let lx=x+3; if(lx+w>W-2) lx=Math.max(2,x-w-3); cx.fillStyle=bg; cx.beginPath(); if(cx.roundRect) cx.roundRect(lx,y-7,w,14,3); else cx.rect(lx,y-7,w,14); cx.fill(); cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText(t,lx+5,y); };
        D.sig.slice(-Math.max(1,Math.round(+p.lvKeep)||1)).forEach(s=>{ const x0=X(s.i); if(x0==null) return; const x1=x0+ext*step, yS=Y(s.sl), yE=Y(s.entry), y1=Y(s.tp1), y2=Y(s.tp2), y3=Y(s.tp3); if(yS==null||yE==null||y1==null||y2==null||y3==null) return;
          cx.fillStyle=cwA(p.cRisk,.2); cx.fillRect(x0,Math.min(yS,yE),x1-x0,Math.abs(yE-yS)); cx.fillStyle=cwA(p.cReward,.15); cx.fillRect(x0,Math.min(yE,y3),x1-x0,Math.abs(y3-yE));
          const ln=(y,col,w,dash)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash?[5,4]:[]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]); };
          ln(yS,cwA(p.cSL,1),2,false); ln(yE,cwA(p.cEntry,1),1,true); ln(y1,cwA(p.cTP,.6),1,true); ln(y2,cwA(p.cTP,.8),1,true); ln(y3,cwA(p.cTP,1),1,true);
          lab('\u2715 SL '+cwFx(s.sl),x1,yS,cwA(p.cSL,.95)); lab('\u25b6 Entry '+cwFx(s.entry),x1,yE,cwA(p.cEntry,.95)); lab('\u25c6 TP1 '+cwFx(s.tp1),x1,y1,cwA(p.cTP,.6)); lab('\u2726 TP2 '+cwFx(s.tp2),x1,y2,cwA(p.cTP,.8)); lab('\u25c6 TP3 '+cwFx(s.tp3),x1,y3,cwA(p.cTP,1)); }); }
      // 3) dashboard (values of the last candle)
      if(p.showDash){ const i=N-1, bar=(v,m)=>{ const f=Math.round(Math.min(Math.max(v/m,0),1)*10); let s=''; for(let k=1;k<=10;k++) s+=k<=f?'\u2588':'\u2591'; return s+'  '+Math.round(v/m*100)+'%'; };
        const fc=r=>r>=.66?'#26a69a':r>=.33?'#f9a825':'#ef5350', rg=R.reg[i], rgT=rg>0?'BULLISH':rg<0?'BEARISH':'NEUTRAL', rgC=rg>0?p.cBull:rg<0?p.cBear:p.cNeut;
        const adxV=D.adx[i]===D.adx[i]?D.adx[i]:0, chopOk=!p.useAdx||adxV>=(+p.adxMin||0), hs=D.htf?D.htf[i]:0, cf=Math.max(1,Math.round(+p.confirm)||1), cnt=R.bR[i]?R.bc[i]:R.rR[i]?R.rc[i]:0, cm=Math.min(cnt,cf), rr=p.slMult?p.tp3/p.slMult:0, rsiV=R.rsi[i]===R.rsi[i]?R.rsi[i]:0;
        const rows=[['Regime',rgT,rgC],['RSI Value',bar(rsiV,100),rgC],['Bull Range',p.bullLo+'\u2013'+p.bullHi,'#fff'],['Bear Range',p.bearLo+'\u2013'+p.bearHi,'#fff'],['Trend',R.up[i]?'UP':'DOWN',R.up[i]?p.cBull:p.cBear],
          ['ADX Strength',bar(adxV,100),fc(adxV/100)],['Chop Filter',!p.useAdx?'OFF':chopOk?'PASS':'BLOCKED',!p.useAdx?p.cNeut:chopOk?p.cBull:p.cBear],
          ['HTF Regime',!p.useHtf?'OFF':hs>0?'BULLISH':hs<0?'BEARISH':'NEUTRAL',!p.useHtf?p.cNeut:hs>0?p.cBull:hs<0?p.cBear:p.cNeut],
          ['Confirm Bars',bar(cm,cf),fc(cm/cf)],['ATR Value',cwFx(D.atr[i]),'#fff'],['Last Price',cwFx(c[i].close),'#fff'],['TP3:SL Ratio',bar(rr,5),fc(Math.min(rr/5,1))]];
        cx.font='11px system-ui,sans-serif'; const rh=17; let w0=cx.measureText('Cardwell RSI').width, w1=0; rows.forEach(r=>{ w0=Math.max(w0,cx.measureText(r[0]).width); w1=Math.max(w1,cx.measureText(r[1]).width); }); w0+=14; w1+=14;
        const tw=w0+w1, th=rh*(rows.length+1), pos=p.dashPos||'Top right', tx=pos.indexOf('left')>-1?8:W-tw-8, ty=pos.indexOf('Top')>-1?8:H-th-8;
        cx.fillStyle='rgba(10,15,26,.9)'; cx.fillRect(tx,ty,tw,th); cx.fillStyle='rgba(20,181,203,.8)'; cx.fillRect(tx,ty,tw,rh); cx.strokeStyle='rgba(140,140,140,.35)'; cx.lineWidth=1; cx.strokeRect(tx+.5,ty+.5,tw,th);
        cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText('Cardwell RSI',tx+6,ty+rh/2);
        rows.forEach((r,k)=>{ const y=ty+rh*(k+1)+rh/2; cx.fillStyle='rgba(13,17,23,1)'; cx.fillRect(tx+w0,y-rh/2,w1,rh); cx.fillStyle='rgba(255,255,255,.7)'; cx.fillText(r[0],tx+6,y); cx.fillStyle=r[2]; cx.fillText(r[1],tx+w0+6,y); }); } }
    if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); }
    cx.restore(); }; }
// alerts: fire once, when the signal candle has closed, while the app is open (the Pine script also sends close-long / close-short with the opposite signal)
function cwAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0], KEY={long:'alLong',short:'alShort'},
    MSG={long:['CARDWELL BUY \u00b7 close any short','#2e7d32'],short:['CARDWELL SELL \u00b7 close any long','#c62828']};
  inds.forEach(i=>{ if(i.t!=='cwr'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},CW_DEF,i.p); let quiet=q; if(i._cwK!==key){ i._cwK=key; i._cwLast={}; quiet=true; }
    const last=i._cwLast||(i._cwLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!P[KEY[e.type]]) return;
      toast(MSG[e.type][0]+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+cwFx(e.price),MSG[e.type][1]);
      if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _cwRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_cwRE.apply(this,arguments); try{ cwAlerts(q); }catch(e){ console.error('cwr alerts',e); } return rv; }; }
try{ DESC.cwr='Premium strategy \u00b7 Cardwell RSI ranges (40-80 uptrend / 20-60 downtrend) with a trend MA: BUY / SELL when the regime turns bullish / bearish, ATR stop and three targets, optional HTF and ADX filters, regime-coloured candles and a dashboard'; }catch(e){}
}catch(err){ console.error('cwr strategy failed',err); window.__cwrErr=err; }

