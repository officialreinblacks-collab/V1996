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

// ---- [fbs] INDICATOR: Final Bullets snap - 50 EMA bias + Weekly / Daily / Monthly Fair Value Gaps locked on any lower time frame, BUY / SELL after a gap is filled ----
// EMA BIAS   - price above the EMA = BUY side, price below = SELL side. Only gaps on the same side of the EMA as price are drawn (switchable), so the chart shows what is happening now.
// FVG        - 3-candle gap built from the REAL weekly / daily / monthly candles (fetched on their own), so the zones never change when you drop to a lower time frame.
//              A gap exists once its 3rd candle has closed. Active bullish gap = green, active bearish = red. Every zone carries a tiny label (W / D / M + date of the gap).
// UNFILLED   - Recent (formed in the last N candles of its own time frame), Historical (older, still unfilled) or Both.
// FILLED     - a bearish gap is filled when price closes above its top, a bullish gap when price closes below its bottom (Wick option: any wick through). The last 10 filled stay on the chart in grey.
// BUY        - price above the EMA and a bearish gap ABOVE the EMA gets filled: BUY immediately on the fill candle, on the RETEST (price dips back to the top of the gap and closes above it), or both.
// SELL       - the mirror: price below the EMA and a bullish gap BELOW the EMA gets filled (close below its bottom): SELL immediately, on the retest, or both.
// NOTE       - klines are read for the loaded market (1000 candles per time frame). If monthly candles are not offered, they are built from the daily candles.
try{
const FB_DEF={emaLen:50,wOn:true,dOn:true,mOn:true,scope:'Both',recentN:20,sideFilter:true,minPct:0,fillMode:'Close',showFilled:true,filledN:10,
  sig:true,buyMode:'Retest',retestBars:60,closed:true,lbl:true,lblDate:true,lblSize:'Tiny',transp:85,outline:true,info:true,
  cBull:'#089981',cBear:'#f23645',cGrey:'#9e9e9e',cBuy:'#089981',cSell:'#f23645',mkSize:'Normal',alBuy:true,alSell:true,alSound:false};
const FB_SZ={Small:.6,Normal:.8,Large:1}, FB_FS={Tiny:7,Small:8,Normal:10};
const FB_TF=[['W','1w',604800,'wOn','Weekly'],['D','1d',86400,'dOn','Daily'],['M','1M',2592000,'mOn','Monthly']];
const FB_MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fbA(hex,a){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
function fbDate(t,tf){ const d=new Date(t*1000); return tf==='M'?FB_MO[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2):d.getUTCDate()+' '+FB_MO[d.getUTCMonth()]; }
function fbNext(t,iv){ if(iv!=='1M') return t+(iv==='1w'?604800:86400); const d=new Date(t*1000); return Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1)/1000; }
// klines per market and time frame, cached; the history loads once and refreshes every 5 minutes
const fbK={};
function fbLoad(sy,iv){ const key=sy+'|'+iv; let d=fbK[key]; if(!d) d=fbK[key]={rows:null,busy:false,ts:0,err:false}; if(d.busy) return d;
  if(d.rows&&Date.now()-d.ts<300000) return d; if(d.err&&Date.now()-d.ts<20000) return d; d.busy=true;
  fetch(`${RB(sy)}/klines?symbol=${sy}&interval=${iv}&limit=1000`).then(r=>r.json()).then(a=>{ if(!Array.isArray(a)||a.length<4) throw new Error('bad'); d.rows=a.map(x=>({t:x[0]/1000,o:+x[1],h:+x[2],l:+x[3],c:+x[4]})); d.err=false; })
    .catch(()=>{ d.err=true; }).then(()=>{ d.busy=false; d.ts=Date.now(); try{ recomputeExtras(); render(); }catch(e){} });
  return d; }
function fbFoldM(rows){ const out=[]; let key=-1, b=null; rows.forEach(r=>{ const d=new Date(r.t*1000), k=d.getUTCFullYear()*12+d.getUTCMonth(); if(k!==key){ key=k; b={t:Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)/1000,o:r.o,h:r.h,l:r.l,c:r.c}; out.push(b); } else { if(r.h>b.h) b.h=r.h; if(r.l<b.l) b.l=r.l; b.c=r.c; } }); return out; }
function fbRows(p){ const sy=sym[0], R={}, wait=[], bad=[], ver=[];
  FB_TF.forEach(tf_=>{ if(!p[tf_[3]]) return; const d=fbLoad(sy,tf_[1]); let rows=d.rows;
    if(!rows&&tf_[0]==='M'&&d.err){ const dd=fbLoad(sy,'1d'); if(dd.rows){ if(!dd.m||dd.mTs!==dd.ts){ dd.m=fbFoldM(dd.rows); dd.mTs=dd.ts; } rows=dd.m; } else if(dd.err) bad.push(tf_[4]); else wait.push(tf_[4]); }
    else if(!rows){ if(d.err) bad.push(tf_[4]); else wait.push(tf_[4]); }
    if(rows){ R[tf_[0]]=rows; const l=rows[rows.length-1]; ver.push(tf_[0]+rows.length+'_'+l.t+'_'+l.c); } });
  return {R,wait,bad,ver:ver.join('|')}; }
// every 3-candle gap of one time frame; a gap exists once its 3rd candle has closed
function fbGaps(rows,iv,minPct,now){ const n=rows.length, out=[], clo=k=>k+1<n?rows[k+1].t:fbNext(rows[k].t,iv);
  for(let k=2;k<n;k++){ const A=rows[k-2], B=rows[k-1], C=rows[k], ct=clo(k); if(ct>now) continue; let bull=null, top=0, bot=0;
    if(C.l>A.h){ bull=true; bot=A.h; top=C.l; } else if(C.h<A.l){ bull=false; top=A.l; bot=C.h; } if(bull===null) continue;
    if(bot>0&&(top-bot)/bot*100<minPct) continue;
    out.push({bull,top,bot,t0:B.t,avail:ct,k,age:n-1-k}); }
  return out; }
const fbHit=(g,hi,lo,cl,wick)=>g.bull?(wick?lo<=g.bot:cl<=g.bot):(wick?hi>=g.top:cl>=g.top);
function fbCompute(c,p){ const N0=c.length, N=p.closed?N0-1:N0, D={N,ok:false,G:[],sig:[],side:0,ema:NaN,cnt:{W:0,D:0,M:0},L:50}; if(N<3) return D;
  const L=Math.max(2,Math.round(+p.emaLen)||50), kk=2/(L+1), E=new Array(N); let pv=0; D.L=L;
  for(let i=0;i<N;i++){ const v=c[i].close; pv=i===0?v:v*kk+pv*(1-kk); E[i]=i>=L-1?pv:NaN; }
  const now=Date.now()/1000, wick=p.fillMode==='Wick', t0=c[0].time, RN=Math.max(1,Math.round(+p.recentN)||20), FN=Math.max(0,Math.round(+p.filledN)||0), RW=Math.max(1,Math.round(+p.retestBars)||60);
  const lb=t=>{ let lo=0,hi=N; while(lo<hi){ const m=(lo+hi)>>1; if(c[m].time<t) lo=m+1; else hi=m; } return lo; };
  const im=p.buyMode==='Immediate'||p.buyMode==='Both', rt=p.buyMode==='Retest'||p.buyMode==='Both';
  const le=E[N-1], lc=c[N-1].close; D.ema=le; D.side=le===le?(lc>le?1:lc<le?-1:0):0;
  const all=[]; D.R=p.__R||{};
  FB_TF.forEach(tf_=>{ const key=tf_[0]; if(!p[tf_[3]]) return; const rows=D.R[key]; if(!rows||rows.length<4) return;
    const clo=j=>j+1<rows.length?rows[j+1].t:fbNext(rows[j].t,tf_[1]);
    fbGaps(rows,tf_[1],+p.minPct||0,now).forEach(g=>{ g.tf=key; g.fi=-2; g.fillT=null; g.s=lb(g.avail); g.d0=lb(g.t0); let done=false;
      // before the loaded chart starts: judge the fill on the candles of the gap's own time frame
      if(g.avail<t0){ for(let j=g.k+1;j<rows.length;j++){ const cj=clo(j); if(cj>t0||cj>now) break; if(fbHit(g,rows[j].h,rows[j].l,rows[j].c,wick)){ g.fi=-1; g.fillT=cj; done=true; break; } } }
      if(!done){ for(let i=g.s;i<N;i++){ if(fbHit(g,c[i].high,c[i].low,c[i].close,wick)){ g.fi=i; g.fillT=c[i].time; break; } } }
      // signals: a gap filled on the trend side of the EMA, price continuing in that direction
      if(g.fi>=0&&p.sig){ const i=g.fi, e=E[i], cl=c[i].close, mid=(g.top+g.bot)/2;
        if(e===e){
          if(!g.bull&&mid>e&&cl>e){ if(im) D.sig.push({i,time:c[i].time,dir:1,tf:key,kind:'IM',price:cl});
            if(rt) for(let j=i+1;j<N&&j<=i+RW;j++){ const b=c[j], e2=E[j]; if(b.close<g.bot||(e2===e2&&b.close<e2)) break; if(b.low<=g.top&&b.close>g.top){ D.sig.push({i:j,time:b.time,dir:1,tf:key,kind:'RT',price:b.close}); break; } } }
          else if(g.bull&&mid<e&&cl<e){ if(im) D.sig.push({i,time:c[i].time,dir:-1,tf:key,kind:'IM',price:cl});
            if(rt) for(let j=i+1;j<N&&j<=i+RW;j++){ const b=c[j], e2=E[j]; if(b.close>g.top||(e2===e2&&b.close>e2)) break; if(b.high>=g.bot&&b.close<g.bot){ D.sig.push({i:j,time:b.time,dir:-1,tf:key,kind:'RT',price:b.close}); break; } } } } }
      all.push(g); }); });
  // what to draw now: only the side of the EMA price is on
  const okSide=g=>{ if(!p.sideFilter||!(le===le)||D.side===0) return true; const m=(g.top+g.bot)/2; return D.side>0?m>le:m<le; };
  FB_TF.forEach(tf_=>{ const key=tf_[0], gs=all.filter(g=>g.tf===key&&okSide(g));
    const un=gs.filter(g=>g.fillT==null&&(p.scope==='Both'||(p.scope==='Recent'?g.age<RN:g.age>=RN))).sort((a,b)=>a.age-b.age).slice(0,80);
    const fl=p.showFilled?gs.filter(g=>g.fi>=0).sort((a,b)=>b.fi-a.fi).slice(0,FN):[];
    D.cnt[key]=un.length; un.forEach(g=>{ g.st='act'; D.G.push(g); }); fl.forEach(g=>{ g.st='fil'; D.G.push(g); }); });
  D.sig.sort((a,b)=>a.i-b.i); D.ok=true; return D; }
let fbMem=null;
function fbGet(c,p,r){ const N=c.length, key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+r.ver+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(fbMem&&fbMem.k===key) return fbMem.D;
  let D; try{ D=fbCompute(c,Object.assign({},p,{__R:r.R})); }catch(e){ console.error('fbs calc failed',e); D={N,ok:false,G:[],sig:[],side:0,cnt:{W:0,D:0,M:0},L:50}; } fbMem={k:key,D}; return D; }
IND.fbs={label:'Final Bullets snap \u00b7 50 EMA + Weekly / Daily / Monthly FVG',cat:'Trend',nm:p=>'Final Bullets snap '+((p&&p.emaLen)||50),p:Object.assign({},FB_DEF),cols:['#ffb300'],
  fields:[['emaLen','num','EMA length (the trend line)',{min:2,max:400}],
    ['wOn','chk','Weekly FVG'],['dOn','chk','Daily FVG'],['mOn','chk','Monthly FVG'],
    ['scope','sel','Unfilled gaps to show',{opts:['Recent','Historical unfilled','Both']}],['recentN','num','Recent = formed in the last N candles of that time frame',{min:1,max:200}],
    ['sideFilter','chk','Only gaps on the same side of the EMA as price'],['minPct','num','Minimum gap size %',{min:0,max:20,step:0.05}],
    ['fillMode','sel','A gap is filled by',{opts:['Close','Wick']}],['showFilled','chk','Keep the recent filled gaps (grey)'],['filledN','num','Filled gaps kept per time frame',{min:0,max:50}],
    ['sig','chk','BUY / SELL signals'],['buyMode','sel','Signal on',{opts:['Retest','Immediate','Both']}],['retestBars','num','Retest window (candles)',{min:1,max:500}],['closed','chk','Closed candles only (no repaint)'],
    ['lbl','chk','Tiny label on every gap'],['lblDate','chk','Label shows the date of the gap'],['lblSize','sel','Label size',{opts:['Tiny','Small','Normal']}],
    ['transp','num','Zone transparency (0 solid, 100 invisible)',{min:0,max:100}],['outline','chk','Zone outline'],['info','chk','Status line (top left)'],
    ['cBull','col','Active bullish gap'],['cBear','col','Active bearish gap'],['cGrey','col','Filled gap'],['cBuy','col','BUY signal'],['cSell','col','SELL signal'],['mkSize','sel','Signal size',{opts:['Small','Normal','Large']}],
    ['alBuy','chk','Alert on BUY'],['alSell','chk','Alert on SELL'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[emaS(c,Math.max(2,Math.round(+(p&&p.emaLen))||50),'close')],
  extras:(c,p)=>{ const q=Object.assign({},FB_DEF,p), r=fbRows(q), D=fbGet(c,q,r), mk=[], ev=[], sz=FB_SZ[q.mkSize]||.8;
    if(D.ok&&q.sig) D.sig.forEach(s=>{ const up=s.dir>0; mk.push({time:s.time,position:up?'belowBar':'aboveBar',color:up?q.cBuy:q.cSell,shape:up?'arrowUp':'arrowDown',text:(up?'BUY ':'SELL ')+s.tf+(s.kind==='RT'?' RT':''),size:sz,keep:true}); ev.push({type:up?'buy':'sell',time:s.time,price:s.price,tf:s.tf,kind:s.kind}); });
    const msg=r.wait.length?'Final Bullets snap: loading '+r.wait.join(' / ')+' candles...':r.bad.length?'Final Bullets snap: could not load '+r.bad.join(' / ')+' candles for this market':'';
    return {mk,boxes:[{type:'fbsview',pts:[],o:q,D,msg}],labels:[],events:ev}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='fbsview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, N=candles.length; if(!D||!N) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.textBaseline='middle';
    if(D.ok){ const fs=FB_FS[p.lblSize]||7, al=Math.max(0,Math.min(1,1-(+p.transp||0)/100)); cx.font=fs+'px system-ui,sans-serif';
      D.G.forEach(g=>{ const filled=g.st==='fil', col=filled?p.cGrey:(g.bull?p.cBull:p.cBear), ya=Y(g.top), yb=Y(g.bot); if(ya==null||yb==null) return;
        let x0=X(Math.max(0,Math.min(N-1,g.d0))); if(x0==null) x0=0; let x1=filled?X(g.fi):W; if(x1==null) x1=W; if(x1<0||x0>W) return;
        const yT=Math.min(ya,yb), hh=Math.max(1,Math.abs(yb-ya)), w=Math.max(1,x1-x0);
        cx.fillStyle=fbA(col,filled?al*.8:al); cx.fillRect(x0,yT,w,hh);
        if(p.outline){ cx.strokeStyle=fbA(col,filled?.6:.9); cx.lineWidth=1; cx.setLineDash(filled?[2,3]:[]); cx.strokeRect(x0+.5,yT+.5,w,hh); cx.setLineDash([]); }
        if(p.lbl){ const t=g.tf+' FVG'+(p.lblDate?' '+fbDate(g.t0,g.tf):'')+(filled?' \u2713':''), tw=cx.measureText(t).width, right=Math.min(x1,W-4), tiny=hh<fs+3;
          let lx=right, ta='right'; if(right-x0<tw+4){ lx=Math.max(x0+2,2); ta='left'; } cx.fillStyle=filled?'#9e9e9e':col; cx.textAlign=ta; cx.textBaseline=tiny?'bottom':'top'; cx.fillText(t,lx,tiny?yT-1:yT+2); cx.textBaseline='middle'; } }); }
    // status line
    let ty=8; cx.textAlign='left'; cx.font='10px system-ui,sans-serif';
    if(p.info&&D.ok){ const sd=D.side>0?'ABOVE':D.side<0?'BELOW':'ON', mode=D.side>0?'BUY side':D.side<0?'SELL side':'no side', t='FINAL BULLETS SNAP \u00b7 price '+sd+' EMA '+D.L+' \u00b7 '+mode+' \u00b7 open gaps  W '+D.cnt.W+'  D '+D.cnt.D+'  M '+D.cnt.M;
      const tw=cx.measureText(t).width; cx.fillStyle='rgba(16,16,16,.72)'; cx.fillRect(6,ty-8,tw+12,16); cx.fillStyle=D.side>0?'#2ee6b8':D.side<0?'#ff6b7a':'#DBDBDB'; cx.fillText(t,12,ty); ty+=18; }
    if(d.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.fillText(d.msg,10,ty); }
    cx.restore(); }; }
// alerts: fire once, when the signal candle has closed (the newest closed candle), while the app is open
function fbAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='fbs'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},FB_DEF,i.p); let quiet=q; if(i._fbK!==key){ i._fbK=key; i._fbLast={}; quiet=true; }
    const last=i._fbLast||(i._fbLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!(e.type==='buy'?P.alBuy:P.alSell)) return;
      toast('Final Bullets snap \u00b7 '+(e.type==='buy'?'BUY':'SELL')+' \u00b7 '+e.tf+' FVG '+(e.kind==='RT'?'retest':'filled')+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 Close '+e.price,e.type==='buy'?'#2e7d32':'#c62828');
      if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _fbRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_fbRE.apply(this,arguments); try{ fbAlerts(q); }catch(e){ console.error('fbs alerts',e); } return rv; }; }
try{ DESC.fbs='50 EMA bias with Weekly, Daily and Monthly fair value gaps kept locked on lower time frames, tiny labels, grey filled gaps and BUY / SELL on the fill or the retest'; }catch(e){}
}catch(err){ console.error('fbs indicator failed',err); window.__fbsErr=err; }


// ---- [sfp] INDICATOR: Swing Failure Pattern [LuxAlgo] - port of the Pine v5 script "Swing Failure Pattern [LuxAlgo]" (c) LuxAlgo, CC BY-NC-SA 4.0 (self-contained: every name starts with sf / SF) ----
// SWING  - a swing high / low is a pivot with "Swings" candles on the left and 1 on the right (the same as ta.pivothigh / ta.pivotlow(len, 1)).
// BEARISH SFP - a candle trades ABOVE the latest swing high but opens AND closes below it (a wick-only break). Drawn: the swing line, a dotted CONFIRMATION line at the lowest low
//           since the swing, a thick wick line and an "SFP" label. When a later candle CLOSES below the confirmation line the setup is confirmed and a down arrow appears.
//           An unconfirmed setup is dropped when a candle closes above the swing high, when 500 candles pass, or when a newer SFP replaces it. BULLISH SFP is the mirror.
// NOTE   - the original can validate the wick by lower-timeframe volume (request.security_lower_tf). The app has no lower-timeframe feed, so this port offers a plain
//           "minimum wick share of the candle" filter instead (0 = off). With "closed candles only" the forming candle is never used, so nothing repaints.
try{
const SF_POS=['Top Right','Top Left','Bottom Right','Bottom Left'];
const SF_DEF={len:5,bull:true,bear:true,minWick:0,closed:true,showSwing:true,showConf:true,showWick:true,showLbl:true,maxN:40,
  cBull:'#089981',cBear:'#f23645',wickA:50,lblFs:10,dash:false,dpos:SF_POS[0],alSfp:true,alConf:true,alSound:false,sig:false,sigMin:20,sigOn:'SFP candle',sigLen:40,alSig:true};
const sfClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sfA(hex,a){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
function sfFmt(v){ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return v.toFixed(a>=1000?2:a>=10?3:a>=1?4:6); }
function sfCompute(c,p){ const N0=c.length, N=p.closed?N0-1:N0, D={N,ok:false,recs:[],events:[],sigs:[],nBear:0,nBull:0,nConf:0};
  const len=sfClamp(Math.round(+p.len)||5,1,50), minW=sfClamp(+p.minWick||0,0,100), sigMin=Math.max(1,Math.round(+p.sigMin)||1); if(N<len+3) return D;
  const pivH=n=>{ if(n<len+1) return NaN; const pb=n-1, H=c[pb].high; for(let k=1;k<=len;k++) if(c[pb-k].high>H) return NaN; return c[n].high<H?H:NaN; };
  const pivL=n=>{ if(n<len+1) return NaN; const pb=n-1, L=c[pb].low; for(let k=1;k<=len;k++) if(c[pb-k].low<L) return NaN; return c[n].low>L?L:NaN; };
  const S={bear:{sw:NaN,bx:-1,ext:{v:Infinity,i:-1},cur:null},bull:{sw:NaN,bx:-1,ext:{v:-Infinity,i:-1},cur:null}};
  for(let n=0;n<N;n++){ const b=c[n], rng=b.high-b.low;
    for(let side=0;side<2;side++){ const dir=side===0?-1:1, on=side===0?p.bear:p.bull, s=side===0?S.bear:S.bull; if(!on) continue;
      const pv=side===0?pivH(n):pivL(n); if(!isNaN(pv)){ s.sw=pv; s.bx=n-1; s.ext=side===0?{v:Infinity,i:-1}:{v:-Infinity,i:-1}; }
      if(s.bx>=0){ const sw=s.sw, hit=side===0?(b.high>sw&&b.open<sw&&b.close<sw):(b.low<sw&&b.open>sw&&b.close>sw);
        if(hit){ const share=rng>0?(side===0?(b.high-sw):(sw-b.low))/rng*100:100;
          if(share>=minW){ let oP=sw, oB=n; if(side===0){ if(s.ext.v<sw){ oP=s.ext.v; oB=s.ext.i; } } else { if(s.ext.v>sw){ oP=s.ext.v; oB=s.ext.i; } }
            if(s.cur&&!s.cur.conf) s.cur.del=true;
            s.cur={dir,sw,bix:s.bx,sfp:n,wick:side===0?b.high:b.low,oP,oB,x2:n,conf:false,ci:-1,active:true,del:false}; D.recs.push(s.cur);
            s.cur.age=n-s.bx; D.events.push({type:'sfp',dir,time:b.time,price:s.cur.wick});
            if(p.sig&&p.sigOn!=='Confirmation'&&s.cur.age>=sigMin){ D.sigs.push({dir,idx:n,age:s.cur.age,price:s.cur.wick}); D.events.push({type:'sig',dir,time:b.time,price:b.close}); } } } }
      const r=s.cur;
      if(r&&r.active&&!r.conf){ r.x2=n; if(side===0?b.close<r.oP:b.close>r.oP){ r.conf=true; r.ci=n; D.events.push({type:'conf',dir,time:b.time,price:r.oP});
          if(p.sig&&p.sigOn==='Confirmation'&&r.age>=sigMin){ D.sigs.push({dir,idx:n,age:r.age,price:side===0?b.high:b.low}); D.events.push({type:'sig',dir,time:b.time,price:b.close}); } } }
      if(r&&(n-r.bix>500||(side===0?b.close>r.sw:b.close<r.sw))){ r.active=false; if(!r.conf) r.del=true; }
      if(side===0){ if(b.low<=s.ext.v) s.ext={v:b.low,i:n}; } else { if(b.high>=s.ext.v) s.ext={v:b.high,i:n}; } } }
  D.recs=D.recs.filter(r=>!r.del); D.recs.forEach(r=>{ if(r.dir===-1) D.nBear++; else D.nBull++; if(r.conf) D.nConf++; }); D.ok=true; return D; }
let sfMem=null;
function sfGet(c,p){ const N=c.length, key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(sfMem&&sfMem.k===key) return sfMem.D;
  let D; try{ D=sfCompute(c,p); }catch(e){ console.error('sfp calc failed',e); D={N,ok:false,recs:[],events:[],sigs:[],nBear:0,nBull:0,nConf:0}; } sfMem={k:key,D}; return D; }
IND.sfp={label:'Swing Failure Pattern [LuxAlgo]',cat:'Trend',nm:()=>'Swing Failure Pattern [LuxAlgo]',p:Object.assign({},SF_DEF),cols:['#f23645'],
  fields:[['len','num','Swings (candles each side of a swing point)',{min:1,max:50,step:1}],['bull','chk','Bullish SFP'],['bear','chk','Bearish SFP'],
    ['minWick','num','Minimum wick share of the candle (%), 0 = off',{min:0,max:100,step:5}],['closed','chk','Closed candles only (no repaint)'],
    ['showSwing','chk','Swing lines'],['showConf','chk','Confirmation lines'],['showWick','chk','Swing failure wick'],['showLbl','chk','Swing failure label'],
    ['maxN','num','Max setups drawn',{min:5,max:300,step:5}],['lblFs','num','Label text size',{min:7,max:16}],['wickA','num','Wick opacity (%)',{min:10,max:100,step:5}],
    ['cBull','col','Bullish colour'],['cBear','col','Bearish colour'],
    ['dash','chk','Show info panel'],['dpos','sel','Panel position',{opts:SF_POS}],
    ['sig','chk','BUY / SELL signals (for beginners)'],['sigMin','num','Signal only if the swing is N candles old or more (any number: 6, 20, 30 ...)',{min:1,max:5000,step:1}],['sigOn','sel','Signal appears on',{opts:['SFP candle','Confirmation']}],['sigLen','num','Signal dotted line length (px)',{min:10,max:200}],
    ['alSfp','chk','Alert: new SFP'],['alConf','chk','Alert: SFP confirmed'],['alSig','chk','Alert: BUY / SELL signal'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},SF_DEF,p), D=sfGet(c,q); return {mk:[],boxes:[{type:'sfpview',pts:[],o:q,D}],labels:[],events:D.ok?D.events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='sfpview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, n0=candles.length; if(!D||!D.ok||n0<5) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    const fs=sfClamp(Math.round(+p.lblFs)||10,7,16), wa=sfClamp(+p.wickA||50,10,100)/100, recs=D.recs.slice(-sfClamp(Math.round(+p.maxN)||40,5,300));
    const ln=(x1,y1,x2,y2,col,w,dash)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke(); cx.setLineDash([]); };
    recs.forEach(r=>{ const col=r.dir===-1?p.cBear:p.cBull, xs=X(r.bix), xo=X(r.oB), xe=X(r.x2), xf=X(r.sfp); if(xe==null||(xe<-40&&xf<-40)) return; if(xs!=null&&xs>W+40&&xf>W+40) return;
      const ys=Y(r.sw), yo=Y(r.oP), yw=Y(r.wick);
      if(p.showSwing&&xs!=null&&ys!=null) ln(xs,ys,xe,ys,col,1);
      if(p.showConf&&xo!=null&&yo!=null) ln(xo,yo,xe,yo,col,1,[1,3]);
      if(p.showWick&&xf!=null&&yw!=null&&ys!=null) ln(xf,yw,xf,ys,sfA(col,wa),3);
      if(p.showLbl&&xf!=null&&yw!=null){ cx.font='bold '+fs+'px system-ui'; cx.fillStyle=col; cx.textAlign='center'; const sameBar=r.ci===r.sfp, up=r.dir===-1;
        if(sameBar){ const t1=up?'SFP':'\u25b2', t2=up?'\u25bc':'SFP'; if(up){ cx.fillText(t2,xf,yw-fs*0.7-3); cx.fillText(t1,xf,yw-fs*1.8-3); } else { cx.fillText(t1,xf,yw+fs*0.7+3); cx.fillText(t2,xf,yw+fs*1.8+3); } }
        else cx.fillText('SFP',xf,up?yw-fs*0.8-3:yw+fs*0.8+3); }
      if(p.showLbl&&r.conf&&r.ci!==r.sfp){ const xc=X(r.ci), cd=candles[r.ci]; if(xc!=null&&cd){ const yc=Y(r.dir===-1?cd.high:cd.low); if(yc!=null){ cx.font='bold '+fs+'px system-ui'; cx.fillStyle=col; cx.textAlign='center'; cx.fillText(r.dir===-1?'\u25bc':'\u25b2',xc,r.dir===-1?yc-fs*0.8-3:yc+fs*0.8+3); } } } });
    if(p.sig&&D.sigs&&D.sigs.length){ const bf=Math.max(7,fs-1), gap=fs*2.6+8, sl=sfClamp(+p.sigLen||40,10,200);
      D.sigs.slice(-sfClamp(Math.round(+p.maxN)||40,5,300)).forEach(g=>{ const cd=candles[g.idx], sx=X(g.idx), sy=Y(g.price); if(!cd||sx==null||sy==null||sx<-30||sx>W+30) return;
        const up=g.dir===-1, col=up?p.cBear:p.cBull, txt=up?'sell':'buy', y1=up?sy-gap:sy+gap, y2=up?y1-sl:y1+sl;
        cx.font='bold '+bf+'px system-ui'; const w=cx.measureText(txt).width+10, h=bf+6, by=up?y2-h:y2;
        ln(sx,y1,sx,y2,col,1,[1.5,2.5]); cx.fillStyle=col; cx.beginPath(); if(cx.roundRect) cx.roundRect(sx-w/2,by,w,h,h/2); else cx.rect(sx-w/2,by,w,h); cx.fill();
        cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText(txt,sx,by+h/2+0.5); }); }
    if(p.dash){ const last=D.recs.length?D.recs[D.recs.length-1]:null, rows=[['Bearish SFP',String(D.nBear),p.cBear],['Bullish SFP',String(D.nBull),p.cBull],['Confirmed',D.nConf+' / '+D.recs.length,'#e6e8ee'],
        ['Latest',last?((last.dir===-1?'Bearish':'Bullish')+' \u00b7 '+(last.conf?'confirmed':'waiting')):'none yet',last?(last.dir===-1?p.cBear:p.cBull):'rgba(230,232,238,.6)']];
      const f=10, rh=f+8, m=6; cx.font='bold '+f+'px system-ui'; let w0=cx.measureText('Swing Failure Pattern').width, w1=0; rows.forEach(r=>{ w0=Math.max(w0,cx.measureText(r[0]).width); w1=Math.max(w1,cx.measureText(r[1]).width); });
      const pw=Math.min(W-2*m,w0+w1+30), ph=(rows.length+1)*rh, x0=/Left/.test(p.dpos)?m:W-pw-m, y0=/Top/.test(p.dpos)?m+34:Hh-ph-m-24;
      cx.fillStyle='rgba(10,13,20,.9)'; cx.fillRect(x0,y0,pw,ph); cx.textAlign='left'; cx.fillStyle='#e6e8ee'; cx.fillText('Swing Failure Pattern',x0+8,y0+rh/2);
      rows.forEach((r,k)=>{ const y=y0+(k+1)*rh+rh/2; cx.font=f+'px system-ui'; cx.textAlign='left'; cx.fillStyle='rgba(230,232,238,.6)'; cx.fillText(r[0],x0+8,y); cx.font='bold '+f+'px system-ui'; cx.fillStyle=r[2]; cx.textAlign='right'; cx.fillText(r[1],x0+pw-8,y); });
      cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph); }
    cx.restore(); }; }
// alerts: fire once, when the candle that carried the event has closed (the newest closed candle), while the app is open
function sfAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='sfp'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},SF_DEF,i.p); let quiet=q; if(i._sfK!==key){ i._sfK=key; i._sfLast={}; quiet=true; }
    const last=i._sfLast||(i._sfLast={});
    i._xr.events.forEach(e=>{ const k=e.type+e.dir; if(e.time>cc||e.time<=(last[k]||0)) return; last[k]=e.time;
      const on=e.type==='sfp'?P.alSfp:e.type==='sig'?P.alSig:P.alConf; if(quiet||e.time!==cc||!on) return;
      const nm=e.type==='sig'?((e.dir===-1?'SELL':'BUY')+' signal - swing failed after '+P.sigMin+'+ candles'):e.type==='sfp'?((e.dir===-1?'Bearish':'Bullish')+' SFP - wick through the swing '+(e.dir===-1?'high':'low')+', close back inside'):((e.dir===-1?'Bearish':'Bullish')+' SFP CONFIRMED - closed beyond the confirmation line');
      toast('SFP \u00b7 '+nm+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+sfFmt(e.price),e.type==='sig'?(e.dir===-1?'#c62828':'#2e7d32'):(e.dir===-1?'#c62828':'#2e7d32')); if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _sfRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_sfRE.apply(this,arguments); try{ sfAlerts(q); }catch(e){ console.error('sfp alerts',e); } return rv; }; }
try{ DESC.sfp='Swing Failure Pattern: a candle wicks through the latest swing high / low but opens and closes back inside it. Draws the swing line, a dotted confirmation line, the failure wick and an SFP label; a closing break of the confirmation line adds an arrow'; }catch(e){}
}catch(err){ console.error('sfp indicator failed',err); window.__sfpErr=err; }

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


// ---- [rbl] INDICATOR: Reinblacks Liquidity & Inducement Detector - Smart Money Concepts: liquidity pools, supply / demand, FVGs, potential inducement, entry candidates, risk plan, dashboard (self-contained: every name starts with rb / RB) ----
// ALL OF THIS IS A RULE-BASED ESTIMATE. Nothing here proves that a zone is genuine or fake liquidity / inducement, and no setup is guaranteed to win.
// Candles are treated as closed bars: the newest (still forming) candle is never used, so no signal repaints.
//  LIQUIDITY   - confirmed swing highs / lows (pivot, N bars each side) become pools: BSL above highs, SSL below lows. Two or more swings within X ATR of each
//                other merge into EQH / EQL (equal highs / lows = a cluster of resting stop orders). A pool is SWEPT when a wick passes it (optionally: and the candle closes back).
//  SUPPLY/DEMAND - a displacement candle (body >= X ATR, body >= Y% of its range) that closes beyond the origin candle creates a zone = the origin candle's wick-to-wick range
//                (origin = last opposite candle within 5 bars). Zones die when a candle CLOSES through them. Nearest zones are ranked A, B, C.
//  FVG         - 3-candle imbalance (gap between candle 1 and candle 3, middle candle in the same direction, gap >= X ATR). Extended until filled (wick / close / 50%).
//  INDUCEMENT  - a zone is flagged POTENTIAL INDUCEMENT when, BEYOND it (further from the market it came from), there is an unfilled FVG AND an unswept liquidity pool
//                (or either one, setting) within N ATR. The next zone beyond it is highlighted as a POTENTIAL STRONGER ZONE.
//  ENTRY       - 1) price sweeps a pool beyond a flagged zone  2) price then reaches an unfilled FVG or the stronger candidate zone beyond it
//                3) a closed candle confirms (rejection wick / engulfing / close back through the target edge / micro structure shift, configurable)
//                -> SELL candidate (supply side) or BUY candidate (demand side). SL beyond the sweep extreme / target + pad, TP at opposing liquidity or fixed R:R.
try{
const RB_TP=['Opposing liquidity (else fixed R:R)','Fixed R:R'];
const RB_EV=['FVG and liquidity beyond the zone','FVG or liquidity beyond the zone'];
const RB_FILL=['Wick reaches far edge','Close beyond far edge','Wick reaches 50%'];
const RB_DEF={swingLen:5,eqAtr:0.15,maxPools:3,showLiq:true,showEq:true,showSwings:true,showSweeps:true,
  impAtr:1.5,bodyPct:55,maxZoneAtr:4,maxZones:3,showZones:true,
  fvgAtr:0.15,fvgFill:RB_FILL[0],maxFvg:3,showFvg:true,
  showInd:true,indEv:RB_EV[0],beyondAtr:6,needCand:false,
  reqReject:true,sweepWin:30,
  confWick:true,confEngulf:true,confClose:false,confShift:true,minConf:1,reqConf:true,confWin:3,wickPct:40,shiftLen:3,cool:6,
  showSig:true,showRisk:true,slPad:0.2,tpMode:RB_TP[0],rr:2,minRR:1.5,maxRisk:6,keep:2,
  dash:true,dpos:'Top Right',dsize:'Small',theme:'Dark',cBull:'#26a69a',cBear:'#ef5350',cInd:'#ffb300',cFvg:'#7c8cff',cCand:'#00e5ff',
  alSweep:true,alFvg:false,alInd:true,alLong:true,alShort:true,alSound:false};
const rbClamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const rbRgba=(c,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'')); if(!m) return c; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const rbFmt=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1000?v.toFixed(2):Math.abs(v)>=100?v.toFixed(2):v.toPrecision(5);
const rbBx=(s,x)=>s===-1?x:-x;                       // "beyond" axis: up for supply side (s=-1), down for demand side (s=+1)
const rbRng=(s,a,b)=>{ const x=rbBx(s,a), y=rbBx(s,b); return x<y?[x,y]:[y,x]; };
function rbCompute(c,p){ const N=c.length, K=rbClamp(Math.round(+p.swingLen)||5,2,30), D={N,ok:false}; if(N<2*K+30) return D;
  const O=c.map(x=>x.open), H=c.map(x=>x.high), L=c.map(x=>x.low), C=c.map(x=>x.close), T=c.map(x=>x.time);
  for(let i=0;i<N;i++) if(![O[i],H[i],L[i],C[i]].every(isFinite)) return D;      // missing data: do nothing rather than guess
  const atr=new Array(N).fill(null); { let s=0; for(let i=0;i<N;i++){ const tr=i?Math.max(H[i]-L[i],Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1])):H[i]-L[i]; if(i<14){ s+=tr; if(i===13) atr[i]=s/14; } else atr[i]=(atr[i-1]*13+tr)/14; } }
  const A=i=>atr[i]!=null?atr[i]:Math.max(H[i]-L[i],1e-8);
  const pools=[],zones=[],fvgs=[],swings=[],setups=[],plans=[],ev=[],sweepMk=[], lastSig={'-1':-1e9,'1':-1e9};
  const fm=RB_FILL.indexOf(p.fvgFill)<0?0:RB_FILL.indexOf(p.fvgFill), needBoth=p.indEv===RB_EV[0];
  const confOn=[p.confWick,p.confEngulf,p.confClose,p.confShift].filter(Boolean).length, reqConf=p.reqConf&&confOn>0, minConf=rbClamp(Math.round(+p.minConf)||1,1,Math.max(1,confOn));
  let tcur=0; const cap=(arr,test,n)=>{ let k=0; for(let i=arr.length-1;i>=0;i--) if(test(arr[i])&&++k>n){ arr[i].end=tcur; arr[i].alive=false; } };
  for(let t=0;t<N-1;t++){ tcur=t; const a=A(t), rg=Math.max(H[t]-L[t],1e-8);
    // 1) FVGs: extend until filled
    for(const f of fvgs){ if(f.end>=0||t<=f.born) continue; const mid=(f.top+f.bot)/2; let fill;
      if(f.dir===1){ fill=fm===0?L[t]<=f.bot:fm===1?C[t]<f.bot:L[t]<=mid; } else { fill=fm===0?H[t]>=f.top:fm===1?C[t]>f.top:H[t]>=mid; }
      if(fill) f.end=t; }
    // 2) zones: a CLOSE through the zone ends it; count re-tests
    for(const z of zones){ if(z.end>=0||t<=z.born) continue; if(z.s===1?C[t]<z.lo:C[t]>z.hi){ z.end=t; continue; } const hit=H[t]>=z.lo&&L[t]<=z.hi; if(hit&&!z.inside) z.tests++; z.inside=hit; }
    // 3) manage open plans (stop first when both are inside one candle - the conservative reading)
    for(const pl of plans){ if(pl.status!==0||t<=pl.idx) continue; const sl=pl.s===1?L[t]<=pl.sl:H[t]>=pl.sl, tp=pl.s===1?H[t]>=pl.tp:L[t]<=pl.tp;
      if(sl){ pl.status=-1; pl.end=t; ev.push({type:'sl',time:T[t],idx:t,price:pl.sl}); } else if(tp){ pl.status=1; pl.end=t; ev.push({type:'tp',time:T[t],idx:t,price:pl.tp}); } else if(t-pl.idx>=150){ pl.status=2; pl.end=t; } }
    // 4) liquidity sweeps (a flagged zone from the PREVIOUS bar + a pool beyond it = an armed setup)
    for(const q of pools){ if(!q.alive) continue; const s=q.s, took=s===-1?H[t]>q.level:L[t]<q.level; if(!took) continue; q.alive=false; q.end=t;
      const reject=s===-1?C[t]<=q.level:C[t]>=q.level, isSweep=p.reqReject?reject:true; if(!isSweep) continue; q.swept=t;
      ev.push({type:s===-1?'swpB':'swpS',time:T[t],idx:t,price:q.level}); sweepMk.push({idx:t,price:s===-1?H[t]:L[t],s,level:q.level});
      for(const z of zones){ if(z.s!==s||!z.ind||z.idx>t||(z.end>=0&&z.end<t)) continue; const zr=rbRng(s,z.lo,z.hi), lb=rbBx(s,q.level); if(lb<=zr[1]-0.25*a||lb>zr[1]+p.beyondAtr*a) continue;
        if(setups.some(x=>!x.done&&x.z===z&&x.s===s)) continue; setups.push({s,z,sweepBar:t,level:q.level,ext:s===-1?H[t]:L[t],reach:null,done:false}); } }
    // 5) register structures confirmed on this bar
    { const k=t-K; if(k>=K){ let ph=true,pl=true; for(let j=k-K;j<=k+K;j++){ if(j===k) continue; if(j<k){ if(H[j]>=H[k]) ph=false; if(L[j]<=L[k]) pl=false; } else { if(H[j]>H[k]) ph=false; if(L[j]<L[k]) pl=false; } }
        const addPool=(s,level)=>{ const tol=p.eqAtr*a; let m=null; for(const q of pools) if(q.alive&&q.s===s&&Math.abs(q.level-level)<=tol){ m=q; break; }
          if(m){ m.eq=true; m.cnt++; m.idx2=k; m.level=s===-1?Math.max(m.level,level):Math.min(m.level,level); } else { pools.push({s,level,idx:k,idx2:k,eq:false,cnt:1,alive:true,end:-1,born:t}); cap(pools,q=>q.alive&&q.s===s,14); } };
        if(ph){ swings.push({idx:k,price:H[k],type:'H'}); addPool(-1,H[k]); }
        if(pl){ swings.push({idx:k,price:L[k],type:'L'}); addPool(1,L[k]); } } }
    { const body=Math.abs(C[t]-O[t]); if(t>=1&&body>=p.impAtr*a&&body/rg>=p.bodyPct/100){ const s=C[t]>O[t]?1:-1; let o=-1;
        for(let j=t-1;j>=Math.max(0,t-5);j--){ if(s===1?C[j]<O[j]:C[j]>O[j]){ o=j; break; } } if(o<0) o=t-1;
        const lo=L[o], hi=H[o];
        if(hi-lo<=p.maxZoneAtr*a&&(s===1?C[t]>hi:C[t]<lo)&&!zones.some(z=>z.end<0&&z.s===s&&z.lo<=hi&&z.hi>=lo)){ zones.push({s,lo,hi,idx:o,born:t,end:-1,tests:0,inside:false,ind:false,alive:true}); cap(zones,z=>z.alive&&z.end<0&&z.s===s,8); } } }
    if(t>=2){ if(L[t]-H[t-2]>=p.fvgAtr*a&&C[t-1]>O[t-1]){ fvgs.push({dir:1,bot:H[t-2],top:L[t],idx:t-1,born:t,end:-1,alive:true}); ev.push({type:'fvgU',time:T[t],idx:t,price:L[t]}); cap(fvgs,f=>f.alive&&f.end<0&&f.dir===1,10); }
      if(L[t-2]-H[t]>=p.fvgAtr*a&&C[t-1]<O[t-1]){ fvgs.push({dir:-1,top:L[t-2],bot:H[t],idx:t-1,born:t,end:-1,alive:true}); ev.push({type:'fvgD',time:T[t],idx:t,price:H[t]}); cap(fvgs,f=>f.alive&&f.end<0&&f.dir===-1,10); } }
    // 6) potential inducement: what sits BEYOND each live zone
    for(const z of zones){ if(z.end>=0) continue; const s=z.s, zr=rbRng(s,z.lo,z.hi), zt=zr[1], lim=zt+p.beyondAtr*a; let fv=null,fb=0,lq=null,lb=0,cd=null,cb=0;
      for(const f of fvgs){ if(f.end>=0) continue; const fr=rbRng(s,f.bot,f.top); if(fr[0]>=zt&&fr[0]<=lim&&(fv==null||fr[0]<fb)){ fv=f; fb=fr[0]; } }
      for(const q of pools){ if(!q.alive||q.s!==s) continue; const v=rbBx(s,q.level); if(v>zt-0.25*a&&v<=lim&&(lq==null||v<lb)){ lq=q; lb=v; } }
      for(const z2 of zones){ if(z2===z||z2.end>=0||z2.s!==s) continue; const r2=rbRng(s,z2.lo,z2.hi); if(r2[0]>=zt&&r2[0]<=lim&&(cd==null||r2[0]<cb)){ cd=z2; cb=r2[0]; } }
      let ok=needBoth?(fv&&lq):(fv||lq); if(p.needCand&&!cd) ok=false;
      if(ok&&!z.ind){ z.ind=true; z.indBar=t; if(!z.fired){ z.fired=true; ev.push({type:s===-1?'indS':'indD',time:T[t],idx:t,price:s===-1?z.hi:z.lo}); } } else if(!ok) z.ind=false;
      z.evF=fv; z.evL=lq; z.cand=cd; }
    // 7) setups: sweep -> reach FVG / stronger zone -> closed-candle confirmation
    for(const st of setups){ if(st.done) continue; const s=st.s, z=st.z;
      if(t-st.sweepBar>p.sweepWin){ st.done=true; continue; }
      st.ext=s===-1?Math.max(st.ext,H[t]):Math.min(st.ext,L[t]);
      if(!st.reach){ const zr=rbRng(s,z.lo,z.hi), zt=zr[1], lim=zt+p.beyondAtr*a, bHi=s===-1?H[t]:-L[t], bLo=s===-1?L[t]:-H[t], tg=[];
        for(const f of fvgs){ if(!(f.end<0||f.end>=t)||f.born>t) continue; const fr=rbRng(s,f.bot,f.top); if(fr[0]>=zt&&fr[0]<=lim) tg.push({r:fr,lo:Math.min(f.bot,f.top),hi:Math.max(f.bot,f.top),kind:'FVG',f}); }
        for(const z2 of zones){ if(z2===z||z2.s!==s||z2.born>t||!(z2.end<0||z2.end>=t)) continue; const r2=rbRng(s,z2.lo,z2.hi); if(r2[0]>=zt&&r2[0]<=lim) tg.push({r:r2,lo:z2.lo,hi:z2.hi,kind:'ZONE',z:z2}); }
        tg.sort((x,y)=>x.r[0]-y.r[0]); const hit=tg.find(x=>bHi>=x.r[0]&&bLo<=x.r[1]); if(hit) st.reach={bar:t,tgt:hit}; }
      if(!st.reach) continue; const R=st.reach, tg=R.tgt;
      if(t>R.bar+p.confWin){ st.done=true; continue; }
      if(s===-1?C[t]>tg.hi:C[t]<tg.lo){ st.done=true; continue; }                        // closed THROUGH the target: it failed
      let n=0;
      if(s===-1){ if(p.confWick&&(H[t]-Math.max(O[t],C[t]))/rg>=p.wickPct/100&&C[t]<=tg.hi&&H[t]>=tg.lo) n++;
        if(p.confEngulf&&t>0&&C[t]<O[t]&&C[t-1]>O[t-1]&&C[t]<=O[t-1]&&O[t]>=C[t-1]) n++;
        if(p.confClose&&C[t]<O[t]&&C[t]<tg.lo) n++;
        if(p.confShift&&t>p.shiftLen&&C[t]<O[t]){ let m=Infinity; for(let j=t-p.shiftLen;j<t;j++) m=Math.min(m,L[j]); if(C[t]<m) n++; } }
      else { if(p.confWick&&(Math.min(O[t],C[t])-L[t])/rg>=p.wickPct/100&&C[t]>=tg.lo&&L[t]<=tg.hi) n++;
        if(p.confEngulf&&t>0&&C[t]>O[t]&&C[t-1]<O[t-1]&&C[t]>=O[t-1]&&O[t]<=C[t-1]) n++;
        if(p.confClose&&C[t]>O[t]&&C[t]>tg.hi) n++;
        if(p.confShift&&t>p.shiftLen&&C[t]>O[t]){ let m=-Infinity; for(let j=t-p.shiftLen;j<t;j++) m=Math.max(m,H[j]); if(C[t]>m) n++; } }
      if(reqConf&&n<minConf) continue;
      st.done=true; if(t-lastSig[s]<p.cool) continue;
      const entry=C[t], dirS=s===1?1:-1, slRaw=s===-1?Math.max(st.ext,tg.hi):Math.min(st.ext,tg.lo), sl=s===-1?slRaw+p.slPad*a:slRaw-p.slPad*a, risk=Math.abs(sl-entry);
      if(!(risk>=a*0.2&&risk<=p.maxRisk*a)) continue;
      let tp=null,liq=false; if(p.tpMode===RB_TP[0]){ let best=null,bd=0; for(const q of pools){ if(!q.alive||q.s!==-s) continue; const d=s===-1?entry-q.level:q.level-entry; if(d>0&&d/risk>=p.minRR&&(best==null||d<bd)){ best=q; bd=d; } } if(best){ tp=best.level; liq=true; } }
      if(tp==null) tp=entry+dirS*p.rr*risk;
      const pl={s,idx:t,time:T[t],entry,sl,tp,risk,rr:Math.abs(tp-entry)/risk,liq,conf:n,kind:tg.kind,tgtLo:tg.lo,tgtHi:tg.hi,sweepBar:st.sweepBar,sweepLevel:st.level,status:0,end:-1,zone:z};
      plans.push(pl); lastSig[s]=t; ev.push({type:s===1?'long':'short',time:T[t],idx:t,price:entry}); }
    while(setups.length>40) setups.shift(); }
  // ---- results for the newest candle ----
  const lc=C[N-1], atrN=A(N-1), dist=(lo,hi)=>lc>hi?lc-hi:lc<lo?lo-lc:0;
  const alivePools=pools.filter(q=>q.alive), alZ=zones.filter(z=>z.end<0), alF=fvgs.filter(f=>f.end<0);
  const showPools=[-1,1].map(s=>alivePools.filter(q=>q.s===s).sort((x,y)=>Math.abs(x.level-lc)-Math.abs(y.level-lc)).slice(0,p.maxPools)).reduce((x,y)=>x.concat(y),[]);
  alZ.forEach(z=>{ z.isCand=false; z.beyond=false; }); alF.forEach(f=>{ f.beyond=false; });
  alZ.filter(z=>z.ind).forEach(z=>{ if(z.cand&&z.cand.end<0) z.cand.isCand=true; if(z.evF) z.evF.beyond=true; });
  const zShow=[];
  [-1,1].forEach(s=>{ const l=alZ.filter(z=>z.s===s).sort((x,y)=>dist(x.lo,x.hi)-dist(y.lo,y.hi)||y.born-x.born), mx=Math.max(1,Math.round(+p.maxZones)||3); l.forEach((z,i)=>{ z.rank=i; z.multi=l.length>1; });
    l.filter(z=>z.rank<mx||z.ind||z.isCand).forEach(z=>zShow.push(z)); });
  const fShow=[]; [-1,1].forEach(d=>{ alF.filter(f=>f.dir===d).sort((x,y)=>dist(x.bot,x.top)-dist(y.bot,y.top)||y.born-x.born).slice(0,Math.max(1,Math.round(+p.maxFvg)||3)).forEach(f=>fShow.push(f)); alF.filter(f=>f.dir===d&&f.beyond&&fShow.indexOf(f)<0).forEach(f=>fShow.push(f)); });
  const hs=swings.filter(x=>x.type==='H').slice(-2), ls=swings.filter(x=>x.type==='L').slice(-2); let bias='Neutral / ranging', bs=0;
  if(hs.length===2&&ls.length===2){ const hh=hs[1].price>hs[0].price, hl=ls[1].price>ls[0].price; if(hh&&hl){ bias='Bullish (HH + HL)'; bs=1; } else if(!hh&&!hl){ bias='Bearish (LH + LL)'; bs=-1; } else bias='Mixed structure'; }
  const nb=alivePools.filter(q=>q.s===-1).sort((x,y)=>Math.abs(x.level-lc)-Math.abs(y.level-lc))[0]||null, ns=alivePools.filter(q=>q.s===1).sort((x,y)=>Math.abs(x.level-lc)-Math.abs(y.level-lc))[0]||null;
  const indZ=alZ.filter(z=>z.ind).sort((x,y)=>dist(x.lo,x.hi)-dist(y.lo,y.hi));
  D.pools=showPools; D.zones=zShow; D.fvgs=fShow; D.alFvgU=alF.filter(f=>f.dir===1).length; D.alFvgD=alF.filter(f=>f.dir===-1).length; D.nearFvg=alF.slice().sort((x,y)=>dist(x.bot,x.top)-dist(y.bot,y.top))[0]||null;
  D.swings=swings.slice(-40); D.sweepMk=sweepMk.slice(-15); D.plans=plans; D.events=ev.slice(-400); D.bias=bias; D.biasS=bs; D.nb=nb; D.ns=ns; D.indS=indZ.find(z=>z.s===-1)||null; D.indD=indZ.find(z=>z.s===1)||null;
  D.close=lc; D.atr=atrN; D.ok=true;
  const done=plans.filter(x=>x.status===1||x.status===-1); D.win=done.filter(x=>x.status===1).length; D.loss=done.filter(x=>x.status===-1).length; D.net=done.reduce((q,x)=>q+(x.status===1?x.rr:-1),0);
  return D; }
let rbMem=null;
function rbGet(c,p){ const N=c.length, key=JSON.stringify(p)+'|'+N+'|'+(N?c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(rbMem&&rbMem.k===key) return rbMem.D;
  let D; try{ D=rbCompute(c,p); }catch(e){ console.error('rbl calc failed',e); D={N,ok:false}; } rbMem={k:key,D}; return D; }
IND.rbl={label:'Reinblacks Liquidity & Inducement Detector',cat:'Trend',nm:()=>'Reinblacks Liq & Inducement',p:Object.assign({},RB_DEF),cols:['#ffb300'],
  fields:[['swingLen','num','Swing length (bars each side)',{min:2,max:30}],['eqAtr','num','Equal highs / lows tolerance (ATR)',{min:0.02,max:1,step:0.01}],['maxPools','num','Liquidity lines shown per side',{min:1,max:8}],
    ['showLiq','chk','Show liquidity lines (BSL / SSL)'],['showEq','chk','Highlight equal highs / lows (EQH / EQL)'],['showSwings','chk','Show swing highs / lows'],['showSweeps','chk','Mark liquidity sweeps'],
    ['reqReject','chk','Sweep needs a close back inside (rejection)'],['sweepWin','num','Setup expires after (bars from sweep)',{min:5,max:100}],
    ['showZones','chk','Show supply / demand zones (A, B, C)'],['impAtr','num','Displacement candle body (ATR)',{min:0.5,max:5,step:0.1}],['bodyPct','num','Displacement min body / range (%)',{min:30,max:95,step:5}],['maxZoneAtr','num','Max zone height (ATR)',{min:1,max:10,step:0.5}],['maxZones','num','Zones shown per side',{min:1,max:6}],
    ['showFvg','chk','Show unfilled FVGs'],['fvgAtr','num','Min FVG size (ATR)',{min:0,max:2,step:0.05}],['fvgFill','sel','FVG counts as filled when',{opts:RB_FILL}],['maxFvg','num','FVGs shown per direction',{min:1,max:8}],
    ['showInd','chk','Show POTENTIAL INDUCEMENT labels'],['indEv','sel','Evidence beyond the zone',{opts:RB_EV}],['beyondAtr','num','Look beyond the zone up to (ATR)',{min:1,max:20,step:0.5}],['needCand','chk','Also require a stronger candidate zone'],
    ['showSig','chk','Show BUY / SELL candidate signals'],['reqConf','chk','Require closed-candle confirmation'],['confWick','chk','Confirm: rejection wick'],['confEngulf','chk','Confirm: engulfing candle'],['confClose','chk','Confirm: close back through target edge'],['confShift','chk','Confirm: micro structure shift'],
    ['minConf','num','Confirmations needed',{min:1,max:4}],['confWin','num','Confirmation window (bars after reaching target)',{min:0,max:10}],['wickPct','num','Rejection wick min (% of range)',{min:20,max:80,step:5}],['shiftLen','num','Structure shift lookback (bars)',{min:2,max:10}],['cool','num','Cooldown between signals (bars)',{min:0,max:50}],
    ['showRisk','chk','Show entry / SL / TP plan'],['slPad','num','Stop padding beyond swing / zone (ATR)',{min:0,max:2,step:0.05}],['tpMode','sel','Take-profit mode',{opts:RB_TP}],['rr','num','Fixed risk : reward',{min:0.5,max:10,step:0.25}],['minRR','num','Min R:R for a liquidity target',{min:0.5,max:10,step:0.25}],['maxRisk','num','Skip setups with stop wider than (ATR)',{min:1,max:20,step:0.5}],['keep','num','Plans kept on chart',{min:1,max:6}],
    ['dash','chk','Show dashboard'],['dpos','sel','Dashboard position',{opts:['Top Right','Top Left','Bottom Right','Bottom Left']}],['dsize','sel','Table size',{opts:['Tiny','Small','Normal','Large']}],['theme','sel','Theme',{opts:['Dark','Light']}],
    ['cBull','col','Demand / SSL / BUY'],['cBear','col','Supply / BSL / SELL'],['cInd','col','Potential inducement'],['cFvg','col','FVG'],['cCand','col','Stronger candidate zone'],
    ['alSweep','chk','Alert on liquidity sweep'],['alFvg','chk','Alert on new FVG'],['alInd','chk','Alert on potential inducement'],['alLong','chk','Alert on BUY candidate'],['alShort','chk','Alert on SELL candidate'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},RB_DEF,p), D=rbGet(c,q); return {mk:[],boxes:[{type:'rblview',pts:[],o:q,D}],labels:[],events:D.ok?D.events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='rblview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, n0=candles.length; if(!D||!D.ok||n0<5) return; const dark=p.theme!=='Light', bull=p.cBull, bear=p.cBear, ind=p.cInd, fvc=p.cFvg, cand=p.cCand;
    const fg=dark?'#e6e8ee':'#131722', muted=dark?'rgba(230,232,238,.55)':'rgba(19,23,34,.55)', pill=dark?'rgba(14,17,26,.88)':'rgba(255,255,255,.92)';
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    const xe=X(n0-1), xp=X(n0-2), bw=(xe!=null&&xp!=null)?Math.max(1,xe-xp):6, xr=(xe==null?W*0.8:xe)+bw*6, xa=i=>{ const v=X(i); return v==null?0:v; };
    const ln=(x1,x2,y,col,dash,w)=>{ cx.strokeStyle=col; cx.lineWidth=w||1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y); cx.lineTo(x2,y); cx.stroke(); cx.setLineDash([]); };
    const tag=(txt,x,y,bg,fg2,bold,left)=>{ cx.font=(bold?'bold ':'')+'9px system-ui'; const w=cx.measureText(txt).width+8, xx=left?Math.max(2,x):Math.min(x,W-w-2); cx.fillStyle=bg; cx.fillRect(xx,y-7,w,14); cx.fillStyle=fg2; cx.textAlign='left'; cx.fillText(txt,xx+4,y); };
    const box=(x0,x1,ya,yb,fill,stroke,dash)=>{ const t0=Math.min(ya,yb), h=Math.max(1,Math.abs(yb-ya)); cx.fillStyle=fill; cx.fillRect(x0,t0,Math.max(1,x1-x0),h); cx.strokeStyle=stroke; cx.lineWidth=1; cx.setLineDash(dash||[]); cx.strokeRect(x0,t0,Math.max(1,x1-x0),h); cx.setLineDash([]); };
    const LET=['A','B','C','D','E','F'];
    // FVG boxes (unfilled, extended to the right edge)
    if(p.showFvg) D.fvgs.forEach(f=>{ const ya=Y(f.top), yb=Y(f.bot); if(ya==null||yb==null) return; const x0=xa(f.idx), col=f.beyond?ind:fvc;
      box(x0,xr,ya,yb,rbRgba(col,f.beyond?0.2:0.13),rbRgba(col,f.beyond?0.85:0.5),f.beyond?[4,3]:[2,3]); tag((f.dir===1?'FVG \u25B2':'FVG \u25BC')+(f.beyond?' \u00b7 beyond inducement':''),xr,(ya+yb)/2,rbRgba(col,0.3),fg,false); });
    // supply / demand zones, potential inducement, stronger candidate
    if(p.showZones) D.zones.forEach(z=>{ const ya=Y(z.hi), yb=Y(z.lo); if(ya==null||yb==null) return; const sup=z.s===-1, base=sup?bear:bull, isInd=p.showInd&&z.ind, isCand=p.showInd&&z.isCand, x0=xa(z.idx);
      const edge=isInd?ind:isCand?cand:base; box(x0,xr,ya,yb,rbRgba(base,0.16),rbRgba(edge,isInd||isCand?0.95:0.6),isInd?[5,3]:isCand?[2,2]:null); if(isInd||isCand) { cx.strokeStyle=rbRgba(edge,0.95); cx.lineWidth=2; cx.strokeRect(x0,Math.min(ya,yb),Math.max(1,xr-x0),Math.max(1,Math.abs(yb-ya))); }
      const nm=(sup?'SUPPLY':'DEMAND')+(z.multi&&z.rank<LET.length?' '+LET[z.rank]:''), my=Math.min(ya,yb)+8; tag(nm+(z.tests?' \u00b7 tested x'+z.tests:''),x0+3,my,rbRgba(base,0.55),fg,true,true);
      if(isInd) tag('POTENTIAL INDUCEMENT',x0+3,my+15,rbRgba(ind,0.9),'#0B0E14',true,true); else if(isCand) tag('POTENTIAL STRONGER ZONE',x0+3,my+15,rbRgba(cand,0.9),'#0B0E14',true,true); });
    // liquidity lines
    if(p.showLiq) D.pools.forEach(q=>{ const y=Y(q.level); if(y==null) return; const sup=q.s===-1, col=sup?bear:bull, x0=xa(q.idx), eq=q.eq&&p.showEq;
      ln(x0,xr,y,rbRgba(col,eq?0.95:0.7),eq?[]:[5,4],eq?2:1); tag((eq?(sup?'EQH':'EQL')+' x'+q.cnt+' \u00b7 ':'')+(sup?'BSL':'SSL')+(eq?' (stops)':''),xr,y,rbRgba(col,eq?0.5:0.3),fg,eq); });
    // swing points and sweeps
    if(p.showSwings){ cx.font='8px system-ui'; cx.textAlign='center'; D.swings.forEach(w=>{ const x=X(w.idx), y=Y(w.price); if(x==null||y==null) return; const up=w.type==='H'; cx.fillStyle=muted; cx.beginPath(); cx.arc(x,y+(up?-5:5),1.8,0,6.2832); cx.fill(); }); }
    if(p.showSweeps) D.sweepMk.forEach(m=>{ const x=X(m.idx), y=Y(m.price); if(x==null||y==null) return; const up=m.s===-1, col=up?bear:bull, yy=y+(up?-8:8); cx.fillStyle=rbRgba(col,0.9); cx.beginPath(); cx.moveTo(x,yy-4); cx.lineTo(x+4,yy); cx.lineTo(x,yy+4); cx.lineTo(x-4,yy); cx.closePath(); cx.fill();
      cx.font='8px system-ui'; cx.fillStyle=muted; cx.textAlign='center'; cx.fillText('SWEEP',x,yy+(up?-9:9)); });
    // signals + risk plan
    if(p.showSig||p.showRisk){ const pls=D.plans.slice(-40);
      if(p.showSig) pls.forEach(pl=>{ const cd=candles[pl.idx], sx=X(pl.idx); if(!cd||sx==null) return; const up=pl.s===1, sy=Y(up?cd.low:cd.high); if(sy==null) return; const col=up?bull:bear, txt=(up?'BUY':'SELL')+' \u00b7 '+pl.rr.toFixed(1)+'R', ay=up?sy+5:sy-5;
        cx.font='bold 10px system-ui'; const w=cx.measureText(txt).width+10, by=up?ay+4:ay-4-16; cx.fillStyle=col; cx.beginPath(); cx.moveTo(sx,ay); cx.lineTo(sx-4,up?ay+4:ay-4); cx.lineTo(sx+4,up?ay+4:ay-4); cx.closePath(); cx.fill(); cx.fillRect(sx-w/2,by,w,16); cx.fillStyle='#0B0E14'; cx.textAlign='center'; cx.fillText(txt,sx,by+8); });
      if(p.showRisk) D.plans.slice(-Math.max(1,Math.round(+p.keep)||2)).forEach(pl=>{ const x1=xa(pl.idx), x2=pl.status===0?xr:Math.max(x1+bw,xa(pl.end)), yE=Y(pl.entry), yS=Y(pl.sl), yT=Y(pl.tp); if(yE==null||yS==null||yT==null) return;
        box(x1,x2,yE,yS,rbRgba(bear,0.12),rbRgba(bear,0.4)); box(x1,x2,yE,yT,rbRgba(bull,0.1),rbRgba(bull,0.4)); ln(x1,x2,yE,fg,[],2); ln(x1,x2,yS,bear,[],2); ln(x1,x2,yT,bull,[],2);
        tag('ENTRY ref \u00b7 '+rbFmt(pl.entry),x2,yE,pill,fg,true); tag('SL \u00b7 '+rbFmt(pl.sl)+(pl.status===-1?' \u2717':''),x2,yS,rbRgba(bear,pl.status===-1?0.85:0.3),fg,true);
        tag('TP \u00b7 '+rbFmt(pl.tp)+' \u00b7 '+pl.rr.toFixed(2)+'R'+(pl.liq?' (liquidity)':'')+(pl.status===1?' \u2713':''),x2,yT,rbRgba(bull,pl.status===1?0.85:0.3),fg,true); }); }
    // dashboard
    if(p.dash){ const pl=D.plans.length?D.plans[D.plans.length-1]:null, bc=D.biasS>0?bull:D.biasS<0?bear:fg, ago=pl?(n0-2-pl.idx):0;
      const near=(q,u)=>q?rbFmt(q.level)+' ('+(Math.abs(q.level-D.close)/D.atr).toFixed(1)+' ATR)'+(q.eq?' '+u:''):'none';
      const zt=z=>z?rbFmt(z.lo)+' - '+rbFmt(z.hi):'none';
      const rows=[['Reinblacks Liq & Inducement','rule-based estimate','',fg,ind,muted,true],
        ['Market bias',D.bias,'',muted,bc,muted],
        ['Nearest BSL (above)',near(D.nb,'EQH'),'',muted,bear,muted],
        ['Nearest SSL (below)',near(D.ns,'EQL'),'',muted,bull,muted],
        ['Unfilled FVGs','\u25B2 '+D.alFvgU+'  \u25BC '+D.alFvgD,D.nearFvg?'nearest '+rbFmt(D.nearFvg.bot)+' - '+rbFmt(D.nearFvg.top):'',muted,fvc,muted],
        ['Potential inducement SUPPLY',zt(D.indS),D.indS&&D.indS.cand?'stronger zone above?':'',muted,D.indS?ind:muted,cand],
        ['Potential inducement DEMAND',zt(D.indD),D.indD&&D.indD.cand?'stronger zone below?':'',muted,D.indD?ind:muted,cand],
        ['Latest candidate',pl?(pl.s===1?'BUY':'SELL')+' @ '+rbFmt(pl.entry):'none yet',pl?ago+' bars ago \u00b7 '+(pl.status===0?'OPEN':pl.status===1?'TP \u2713':pl.status===-1?'SL \u2717':'EXPIRED'):'',muted,pl?(pl.s===1?bull:bear):muted,muted],
        ['Plan SL / TP / R:R',pl?rbFmt(pl.sl)+' / '+rbFmt(pl.tp):'-',pl?pl.rr.toFixed(2)+'R':'',muted,fg,muted],
        ['Closed plans (loaded chart)',(D.win+D.loss)?D.win+'W / '+D.loss+'L':'none yet',(D.win+D.loss)?(D.net>=0?'+':'')+D.net.toFixed(1)+'R':'',muted,fg,D.net>=0?bull:bear]];
      let fs=({Tiny:9,Small:10,Normal:12,Large:14})[p.dsize]||10, cw=[0,0,0], pw, rh, m=6;
      for(;;){ cw=[0,0,0]; rh=fs+8; rows.forEach(r=>{ cx.font=(r[6]?'bold ':'')+fs+'px system-ui'; for(let j=0;j<3;j++) cw[j]=Math.max(cw[j],cx.measureText(r[j]).width); }); pw=cw[0]+cw[1]+cw[2]+48; if(pw<=W-2*m||fs<=6) break; fs--; }
      const ph=rows.length*rh, x0=/Left/.test(p.dpos)?m:W-pw-m, y0=/Top/.test(p.dpos)?m+34:Hh-ph-m-24;
      cx.fillStyle=pill; cx.fillRect(x0,y0,pw,ph); rows.forEach((r,k)=>{ const y=y0+k*rh; if(k){ cx.strokeStyle='rgba(128,128,128,.25)'; cx.lineWidth=1; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x0+pw,y); cx.stroke(); }
        cx.textAlign='left'; cx.font=(k===0?'bold ':'')+fs+'px system-ui'; cx.fillStyle=r[3]; cx.fillText(r[0],x0+8,y+rh/2); cx.font='bold '+fs+'px system-ui'; cx.fillStyle=r[4]; cx.fillText(r[1],x0+16+cw[0],y+rh/2); cx.fillStyle=r[5]; cx.fillText(r[2],x0+24+cw[0]+cw[1],y+rh/2); });
      cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph); }
    cx.restore(); }; }
// alerts: fire once, when the candle that carried the event has closed (the newest closed candle), while the app is open
function rbAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='rbl'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},RB_DEF,i.p); let quiet=q; if(i._rbK!==key){ i._rbK=key; i._rbLast={}; quiet=true; }
    const last=i._rbLast||(i._rbLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      const on={swpB:P.alSweep,swpS:P.alSweep,fvgU:P.alFvg,fvgD:P.alFvg,indS:P.alInd,indD:P.alInd,long:P.alLong,short:P.alShort}[e.type]; if(quiet||e.time!==cc||!on) return;
      const nm={swpB:'Buy-side liquidity (BSL) swept',swpS:'Sell-side liquidity (SSL) swept',fvgU:'Bullish FVG formed',fvgD:'Bearish FVG formed',indS:'POTENTIAL INDUCEMENT supply zone',indD:'POTENTIAL INDUCEMENT demand zone',long:'BUY candidate (confirmed on close)',short:'SELL candidate (confirmed on close)'}[e.type];
      toast('REINBLACKS \u00b7 '+nm+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+rbFmt(e.price),(e.type==='long'||e.type==='swpS'||e.type==='fvgU')?'#2e7d32':(e.type==='indS'||e.type==='indD')?'#f9a825':'#c62828'); if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _rbRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_rbRE.apply(this,arguments); try{ rbAlerts(q); }catch(e){ console.error('rbl alerts',e); } return rv; }; }
try{ DESC.rbl='Smart Money liquidity map: BSL / SSL, equal highs / lows, supply & demand A-B-C, unfilled FVGs, POTENTIAL INDUCEMENT zones with a stronger-zone candidate, closed-candle BUY / SELL candidates with entry, stop, target and R:R, alerts and a dashboard. Rule-based estimates only, nothing is guaranteed'; }catch(e){}
}catch(err){ console.error('rbl indicator failed',err); window.__rblErr=err; }

// ---- [fgz] INDICATOR: Reinblacks Fibonacci Golden Zone Detector - swing legs, Fibonacci levels, 0.618-0.650 golden zone, closed-candle reversal candidates, volume filter, AUTO or MANUAL (candle count) range (self-contained: every name starts with fz / FZ) ----
// A golden zone is a POTENTIAL reaction area, not a guaranteed reversal. Candles are treated as closed bars: the newest (still forming) candle is never used.
//  RANGE (choose with "Auto range"):
//   AUTO ON  - "Latest swing pair": the last two opposite CONFIRMED swings. "Highest / lowest swing in window": the highest confirmed swing high and the lowest confirmed swing low of the last N candles.
//              With "Follow new extremes" the 0.000 anchor moves up / down as price prints a new high / low, before the next swing confirms (only past candles are used).
//   AUTO OFF - MANUAL candle counting: the range is the highest high and lowest low of the last N candles (set N yourself, and shift it back with "Range ends N candles ago").
//  DIRECTION - the later extreme decides: high after low = uptrend (measured low -> high, 0.000 at the high, retracement goes DOWN); low after high = downtrend (0.000 at the low, retracement goes UP).
//  SWING CONFIRMATION DELAY - a swing needs "swing length" candles on EACH side, so it is only known swing-length candles after it formed. Nothing is drawn earlier, so history never uses the future.
//  SIGNAL - a closed candle trades into the golden zone (this candle or one of the last few), closes no deeper than the invalidation level, passes the optional candle patterns and the optional volume filter
//           -> potential BUY (uptrend) / SELL (downtrend). One candidate per leg and a cooldown, so retests do not stack.
try{
const FZ_MODES=['Latest swing pair','Highest / lowest swing in window'];
const FZ_DIR=['By order of extremes','Force uptrend','Force downtrend'];
const FZ_TV=[[1,0,'#787b86'],[1,0.706,'#f23645'],[1,0.618,'#ff9800'],[1,1,'#4caf50'],[1,0.76,'#089981'],[0,0.786,'#0f6e7f'],[0,1,'#4a4a4a'],[0,1.618,'#2962ff'],[0,2.618,'#8b2b35'],[0,3.618,'#5b2166'],[0,4.236,'#881a3f'],[0,1.272,'#8a5a0a'],
  [0,1.414,'#8b2b35'],[0,2.272,'#8a5a0a'],[0,2.414,'#3a6b35'],[0,2,'#12594f'],[0,3,'#0f6e7f'],[0,3.272,'#4a4a4a'],[0,3.414,'#2a3f9a'],[0,4,'#8b2b35'],[0,4.272,'#5b2166'],[0,4.414,'#881a3f'],[0,4.618,'#8a5a0a'],[0,4.764,'#12594f']];
const FZ_EXT=['Extend lines right','None','Extend lines left','Extend both'], FZ_LS=['Solid','Dashed','Dotted'], FZ_LH=['Left','Right'], FZ_LVT=['Top','Middle','Bottom'];
const FZ_DEF={auto:true,autoMode:FZ_MODES[0],swingLen:5,autoBars:150,extend:true,minLeg:2,manBars:100,manOff:0,manDir:FZ_DIR[0],
  trendOn:true,trendCol:'#787b86',trendSt:'Dashed',lnSt:'Solid',lnW:1,ext:FZ_EXT[0],one:false,oneCol:'#2962ff',bg:true,bgOp:20,rev:false,prices:true,lvMode:'Values',lblH:'Left',lblV:'Middle',fs:12,logSc:false,
  gA:0.618,gB:0.65,showLines:true,showZone:true,showAnch:true,showCount:true,
  showSig:false,sigText:'Short (BUY / SELL)',reqCandle:true,cfHammer:true,cfEngulf:true,cfStrong:true,minConf:1,wickPct:50,zoneWin:3,invLvl:0.786,once:true,cool:5,
  volOn:false,volMult:1,volLen:20,
  dash:true,dpos:'Top Right',dsize:'Small',theme:'Dark',dLev:false,dSet:false,
  cGold:'#ffd54f',cBull:'#1de9b6',cBear:'#ff5d7a',
  alZone:false,alBuy:false,alSell:false,alSound:false};
FZ_TV.forEach((q,i)=>{ FZ_DEF['k'+i]=!!q[0]; FZ_DEF['v'+i]=q[1]; FZ_DEF['c'+i]=q[2]; });
const fzClamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const fzRgba=(c,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'')); if(!m) return c; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const fzFmt=v=>{ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=100?2:a>=1?4:a>=0.01?5:8}); };
function fzCompute(c,p){ const N=c.length, K=fzClamp(Math.round(+p.swingLen)||5,2,30), D={N,ok:false}; if(N<2*K+25) return D;
  const O=c.map(x=>x.open), H=c.map(x=>x.high), L=c.map(x=>x.low), C=c.map(x=>x.close), V=c.map(x=>+x.volume||0), T=c.map(x=>x.time);
  for(let i=0;i<N;i++) if(![O[i],H[i],L[i],C[i]].every(isFinite)) return D;      // missing price data: do nothing rather than guess
  const atr=new Array(N).fill(null); { let s=0; for(let i=0;i<N;i++){ const tr=i?Math.max(H[i]-L[i],Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1])):H[i]-L[i]; if(i<14){ s+=tr; if(i===13) atr[i]=s/14; } else atr[i]=(atr[i-1]*13+tr)/14; } }
  const A=i=>atr[i]!=null?atr[i]:Math.max(H[i]-L[i],1e-8);
  const hasVol=V.some(v=>v>0), vLen=Math.max(2,Math.round(+p.volLen)||20), vAvg=t=>{ if(t<vLen) return null; let s=0; for(let j=t-vLen;j<t;j++) s+=V[j]; return s/vLen; };
  const gMin=Math.min(+p.gA,+p.gB), gMax=Math.max(+p.gA,+p.gB), manN=Math.max(5,Math.round(+p.manBars)||100), manOff=Math.max(0,Math.round(+p.manOff)||0), autoN=Math.max(10,Math.round(+p.autoBars)||150);
  const pivH=[], pivL=[], ev=[], sigs=[], zoneSeen=new Set(), sigSeen=new Set(), lastSig={'1':-1e9,'-1':-1e9};
  const confOn=[p.cfHammer,p.cfEngulf,p.cfStrong].filter(Boolean).length, needConf=p.reqCandle&&confOn>0, minConf=fzClamp(Math.round(+p.minConf)||1,1,Math.max(1,confOn));
  // the range in force on closed candle t (uses candles 0..t only)
  function legAt(t){ let hiI=-1, loI=-1, start=0, forced=0;
    if(!p.auto){ const e=t-manOff; if(e<manN-1) return null; start=e-manN+1; let mh=-Infinity, ml=Infinity; for(let j=start;j<=e;j++){ if(H[j]>=mh){ mh=H[j]; hiI=j; } if(L[j]<=ml){ ml=L[j]; loI=j; } }
      forced=p.manDir===FZ_DIR[1]?1:p.manDir===FZ_DIR[2]?-1:0; }
    else if(p.autoMode===FZ_MODES[0]){ if(!pivH.length||!pivL.length) return null; hiI=pivH[pivH.length-1].idx; loI=pivL[pivL.length-1].idx; }
    else { let bh=null, bl=null; for(let i=pivH.length-1;i>=0;i--){ const q=pivH[i]; if(q.idx<t-autoN) break; if(!bh||q.price>bh.price) bh=q; } for(let i=pivL.length-1;i>=0;i--){ const q=pivL[i]; if(q.idx<t-autoN) break; if(!bl||q.price<bl.price) bl=q; }
      if(!bh||!bl) return null; hiI=bh.idx; loI=bl.idx; }
    if(hiI<0||loI<0||hiI===loI) return null;
    let up=forced?forced===1:hiI>loI, hiP=H[hiI], loP=L[loI];
    if(p.auto){ if(p.extend){ if(up){ for(let j=hiI+1;j<=t;j++) if(H[j]>hiP){ hiP=H[j]; hiI=j; } } else { for(let j=loI+1;j<=t;j++) if(L[j]<loP){ loP=L[j]; loI=j; } } }
      if(up){ for(let j=hiI+1;j<=t;j++) if(C[j]<loP) return null; } else { for(let j=loI+1;j<=t;j++) if(C[j]>hiP) return null; } }     // closed beyond the 1.000 anchor: leg is dead
    const range=hiP-loP; if(!(range>0)||range<p.minLeg*A(t)) return null;
    const end=Math.max(hiI,loI), st=Math.min(hiI,loI), useLog=!!p.logSc&&loP>0&&hiP>0, lH=useLog?Math.log(hiP):hiP, lL=useLog?Math.log(loP):loP, back=v=>useLog?Math.exp(v):v, mk=(r,flip)=>{ const u=flip?!up:up; return back(u?lH-r*(lH-lL):lL+r*(lH-lL)); }, lvl=r=>mk(r,false), lvlD=r=>mk(r,!!p.rev), za=lvl(gMin), zb=lvl(gMax);
    return {up,hiI,hiP,loI,loP,range,start:st,end,win:p.auto?st:start,lvl,lvlD,zTop:Math.max(za,zb),zBot:Math.min(za,zb),key:up?'U'+loI:'D'+hiI}; }
  let lastLeg=null;
  for(let t=0;t<N-1;t++){ const k=t-K;
    if(k>=K){ let ph=true, pl=true; for(let j=k-K;j<=k+K;j++){ if(j===k) continue; if(j<k){ if(H[j]>=H[k]) ph=false; if(L[j]<=L[k]) pl=false; } else { if(H[j]>H[k]) ph=false; if(L[j]<L[k]) pl=false; } }
      if(ph) pivH.push({idx:k,price:H[k],conf:t}); if(pl) pivL.push({idx:k,price:L[k],conf:t}); }
    const g=legAt(t); if(t===N-2) lastLeg=g; if(!g||t<=g.end) continue;
    const rg=Math.max(H[t]-L[t],1e-8), hit=j=>j>g.end&&H[j]>=g.zBot&&L[j]<=g.zTop, now=hit(t);
    if(now&&!zoneSeen.has(g.key)){ zoneSeen.add(g.key); ev.push({type:g.up?'zoneU':'zoneD',time:T[t],idx:t,price:C[t]}); }
    let recent=false; for(let j=Math.max(g.end+1,t-Math.max(1,Math.round(+p.zoneWin)||3)+1);j<=t;j++) if(hit(j)){ recent=true; break; }
    if(!recent) continue;
    const dir=g.up?1:-1, deep=g.lvl(p.invLvl); if(!(g.up?C[t]>=deep:C[t]<=deep)) continue;
    let n=0;
    if(g.up){ if(p.cfHammer&&(Math.min(O[t],C[t])-L[t])/rg>=p.wickPct/100&&C[t]>=L[t]+0.5*rg) n++; if(p.cfEngulf&&t>0&&C[t]>O[t]&&C[t-1]<O[t-1]&&C[t]>=O[t-1]&&O[t]<=C[t-1]) n++; if(p.cfStrong&&t>0&&C[t]>O[t]&&C[t]>H[t-1]) n++; }
    else { if(p.cfHammer&&(H[t]-Math.max(O[t],C[t]))/rg>=p.wickPct/100&&C[t]<=H[t]-0.5*rg) n++; if(p.cfEngulf&&t>0&&C[t]<O[t]&&C[t-1]>O[t-1]&&C[t]<=O[t-1]&&O[t]>=C[t-1]) n++; if(p.cfStrong&&t>0&&C[t]<O[t]&&C[t]<L[t-1]) n++; }
    if(needConf?n<minConf:!now) continue;
    let volOk=true, vr=null; if(p.volOn&&hasVol){ const av=vAvg(t); if(av!=null&&av>0){ vr=V[t]/av; volOk=vr>=p.volMult; } } if(!volOk) continue;
    if(t-lastSig[dir]<p.cool) continue; if(p.once&&sigSeen.has(g.key+dir)) continue;
    sigSeen.add(g.key+dir); lastSig[dir]=t; sigs.push({idx:t,time:T[t],dir,price:C[t],inZone:now,conf:n,vr,key:g.key}); ev.push({type:dir===1?'buy':'sell',time:T[t],idx:t,price:C[t]}); }
  D.leg=lastLeg; D.sigs=sigs; D.events=ev.slice(-300); D.close=C[N-2]; D.atr=A(N-2); D.hasVol=hasVol; D.manN=manN; D.n=N;
  D.inZone=!!(lastLeg&&N-2>lastLeg.end&&H[N-2]>=lastLeg.zBot&&L[N-2]<=lastLeg.zTop); D.ok=true; return D; }
let fzMem=null;
function fzGet(c,p){ const N=c.length, key=JSON.stringify(p)+'|'+N+'|'+(N?c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(fzMem&&fzMem.k===key) return fzMem.D;
  let D; try{ D=fzCompute(c,p); }catch(e){ console.error('fgz calc failed',e); D={N,ok:false}; } fzMem={k:key,D}; return D; }
const FZ_FIELDS=[['auto','chk','AUTO range (follows swings). Off = MANUAL candle count'],['autoMode','sel','Auto: how the range is chosen',{opts:FZ_MODES}],['swingLen','num','Swing length (candles each side, = confirmation delay)',{min:2,max:30}],['autoBars','num','Auto window for highest / lowest swing (candles)',{min:10,max:2000,step:10}],
    ['extend','chk','Follow new highest high / lowest low before the next swing confirms'],['minLeg','num','Ignore ranges smaller than (ATR)',{min:0,max:20,step:0.5}],
    ['manBars','num','MANUAL: range = last N candles (candle count)',{min:5,max:5000,step:5}],['manOff','num','MANUAL: range ends N candles ago (0 = latest)',{min:0,max:2000,step:1}],['manDir','sel','MANUAL: trend direction',{opts:FZ_DIR}],
    ['trendOn','chk','Trend line'],['trendCol','col','Trend line colour'],['trendSt','sel','Trend line style',{opts:FZ_LS}],['lnSt','sel','Levels line style',{opts:FZ_LS}],['lnW','num','Levels line width',{min:1,max:6}],['ext','sel','Extend',{opts:FZ_EXT}]];
for(let i=0;i<24;i++){ FZ_FIELDS.push(['k'+i,'chk','Level '+(i+1)+' - show'],['v'+i,'num','Level '+(i+1)+' - value',{min:0,max:10,step:0.001}],['c'+i,'col','Level '+(i+1)+' - colour']); }
FZ_FIELDS.push(['one','chk','Use one colour for everything'],['oneCol','col','The one colour'],['bg','chk','Background (fill between levels)'],['bgOp','num','Background opacity (%)',{min:0,max:100,step:5}],['rev','chk','Reverse'],['prices','chk','Prices'],['lvMode','sel','Levels shown as',{opts:['Values','Percents']}],
  ['lblH','sel','Labels: left / right',{opts:FZ_LH}],['lblV','sel','Labels: top / middle / bottom',{opts:FZ_LVT}],['fs','num','Font size',{min:8,max:20}],['logSc','chk','Fib levels based on log scale'],
  ['showLines','chk','Show levels and labels'],['showZone','chk','Show GOLDEN ZONE box'],['gA','num','Golden zone from',{min:0,max:1,step:0.001}],['gB','num','Golden zone to',{min:0,max:1,step:0.001}],['cGold','col','Golden zone colour'],['showAnch','chk','Show swing anchors'],['showCount','chk','Show candle count of the range'],
  ['showSig','chk','Show BUY / SELL candidates (optional)'],['sigText','sel','Signal label',{opts:['Short (BUY / SELL)','Full text']}],['reqCandle','chk','Require candlestick confirmation'],['cfHammer','chk','Pattern: rejection wick / hammer'],['cfEngulf','chk','Pattern: engulfing candle'],['cfStrong','chk','Pattern: close beyond previous candle'],
  ['minConf','num','Patterns needed',{min:1,max:3}],['wickPct','num','Rejection wick min (% of range)',{min:20,max:80,step:5}],['zoneWin','num','Zone touch may be up to N candles back',{min:1,max:10}],['invLvl','num','Invalid if the close is deeper than level',{min:0.65,max:1,step:0.005}],['once','chk','One candidate per range'],['cool','num','Cooldown between candidates (candles)',{min:0,max:100}],
  ['volOn','chk','Volume filter: signal candle needs enough volume'],['volMult','num','Volume must be at least x the average',{min:0.1,max:10,step:0.1}],['volLen','num','Average volume over N candles',{min:3,max:200}],
  ['dash','chk','Show info panel'],['dpos','sel','Panel position',{opts:['Top Right','Top Left','Bottom Right','Bottom Left']}],['dsize','sel','Panel size',{opts:['Tiny','Small','Normal','Large']}],['theme','sel','Theme',{opts:['Dark','Light']}],['dLev','chk','Panel: list the levels'],['dSet','chk','Panel: show settings'],
  ['cBull','col','Bullish / swing anchors'],['cBear','col','Bearish'],
  ['alZone','chk','Alert: price enters the golden zone'],['alBuy','chk','Alert: bullish reversal candidate'],['alSell','chk','Alert: bearish reversal candidate'],['alSound','chk','Play a sound']);
IND.fgz={label:'Reinblacks Fibonacci Golden Zone Detector',cat:'Trend',nm:()=>'Reinblacks Fib Golden Zone',p:Object.assign({},FZ_DEF),cols:['#ffd54f'],
  fields:FZ_FIELDS,
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},FZ_DEF,p), D=fzGet(c,q); return {mk:[],boxes:[{type:'fgzview',pts:[],o:q,D}],labels:[],events:D.ok?D.events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='fgzview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, n0=candles.length; if(!D||!D.ok||n0<5) return; const dark=p.theme!=='Light', g=D.leg;
    const fg=dark?'#e6e8ee':'#131722', muted=dark?'rgba(230,232,238,.6)':'rgba(19,23,34,.6)', pill=dark?'rgba(10,13,20,.9)':'rgba(255,255,255,.93)', bull=p.cBull, bear=p.cBear, gold=p.cGold;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    const xe=X(n0-1), xp=X(n0-2), bw=(xe!=null&&xp!=null)?Math.max(1,xe-xp):6, xr=(xe==null?W*0.78:xe)+bw*5, xa=i=>{ const v=X(i); return v==null?0:v; };
    const ln=(x1,x2,y,col,dash,w)=>{ cx.strokeStyle=col; cx.lineWidth=w||1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y); cx.lineTo(x2,y); cx.stroke(); cx.setLineDash([]); };
    const tag=(txt,x,y,bg,fg2,bold,left,bd)=>{ cx.font=(bold?'bold ':'')+'9px system-ui'; const w=cx.measureText(txt).width+10, xx=left?Math.max(2,x):Math.min(x,W-w-2); cx.fillStyle=bg; cx.fillRect(xx,y-7,w,14); if(bd){ cx.strokeStyle=bd; cx.lineWidth=1; cx.strokeRect(xx,y-7,w,14); } cx.fillStyle=fg2; cx.textAlign='left'; cx.fillText(txt,xx+5,y); };
    const LV=[]; for(let i=0;i<24;i++){ const r=+p['v'+i]; if(p['k'+i]&&isFinite(r)&&r>=0) LV.push({r,col:p.one?p.oneCol:p['c'+i]}); }
    const fsz=fzClamp(Math.round(+p.fs)||12,8,20), lw=fzClamp(Math.round(+p.lnW)||1,1,6), DASH={Solid:[],Dashed:[5,4],Dotted:[1.5,3]}, rt=r=>p.lvMode==='Percents'?(+(r*100).toFixed(1))+'%':String(+r.toFixed(3));

    if(!p.auto){ const x=X(Math.max(0,Math.min(n0-2,(g?g.win:n0-2-p.manOff-D.manN+1)))); if(x!=null&&g){ ln(x,x,0,fzRgba(muted,0.5),[2,4],1); tag('Manual range \u00b7 '+D.manN+' candles',x+2,12,pill,muted,false,true); } }
    if(g){ const x0=xa(g.start), yH=Y(g.hiP), yL=Y(g.loP), xH=X(g.hiI), xL=X(g.loI);
      const xs=(p.ext===FZ_EXT[2]||p.ext===FZ_EXT[3])?0:x0, xf=(p.ext===FZ_EXT[0]||p.ext===FZ_EXT[3])?W:xa(g.end);
      if(p.bg&&p.showLines){ const S=LV.slice().sort((u,v)=>u.r-v.r); for(let i=1;i<S.length;i++){ const y1=Y(g.lvlD(S[i-1].r)), y2=Y(g.lvlD(S[i].r)); if(y1==null||y2==null||Math.abs(y2-y1)<0.5) continue; cx.fillStyle=fzRgba(S[i].col,fzClamp(+p.bgOp,0,100)/100); cx.fillRect(xs,Math.min(y1,y2),Math.max(1,xf-xs),Math.abs(y2-y1)); } }
      if(p.showZone){ const ya=Y(g.zTop), yb=Y(g.zBot); if(ya!=null&&yb!=null){ const t0=Math.min(ya,yb), h=Math.max(2,Math.abs(yb-ya)); cx.fillStyle=fzRgba(gold,0.2); cx.fillRect(xs,t0,Math.max(1,xf-xs),h); cx.strokeStyle=fzRgba(gold,0.9); cx.lineWidth=1; cx.strokeRect(xs,t0,Math.max(1,xf-xs),h); tag('GOLDEN ZONE',Math.max(xs,x0)+6,t0+h/2,fzRgba(gold,0.92),'#14110a',true,true); } }
      if(p.showLines) LV.forEach(q=>{ const price=g.lvlD(q.r), y=Y(price); if(y==null) return; ln(xs,xf,y,q.col,DASH[p.lnSt]||[],lw);
        const txt=rt(q.r)+(p.prices?' ('+fzFmt(price)+')':''); cx.font=fsz+'px system-ui'; const tw=cx.measureText(txt).width, ty=y+(p.lblV==='Top'?-(fsz*0.75):p.lblV==='Bottom'?(fsz*0.75):0); let tx, al;
        if(p.lblH==='Right'){ if(xf>=W-1){ tx=W-4; al='right'; } else { tx=xf+4; al='left'; if(tx+tw>W-2){ tx=W-4; al='right'; } } } else { if(xs-4-tw>=2){ tx=xs-4; al='right'; } else { tx=xs+4; al='left'; } }
        if(p.lblV==='Middle'){ const bx=al==='right'?tx-tw-3:tx-3; cx.fillStyle=pill; cx.fillRect(bx,ty-fsz/2-1,tw+6,fsz+2); }
        cx.textAlign=al; cx.fillStyle=q.col; cx.fillText(txt,tx,ty); });
      if(p.trendOn&&xH!=null&&xL!=null&&yH!=null&&yL!=null){ cx.strokeStyle=p.trendCol; cx.lineWidth=1; cx.setLineDash(DASH[p.trendSt]||[5,4]); cx.beginPath(); cx.moveTo(xL,yL); cx.lineTo(xH,yH); cx.stroke(); cx.setLineDash([]);
        if(p.showCount){ const n=Math.abs(g.hiI-g.loI); tag(n+' candles',(xH+xL)/2+6,(yH+yL)/2,pill,muted,false,true); } }
      if(p.showAnch){ const an=(x,y,txt,col,up)=>{ if(x==null||y==null) return; cx.strokeStyle=col; cx.lineWidth=2; cx.fillStyle=pill; cx.beginPath(); cx.arc(x,y,4,0,6.2832); cx.fill(); cx.stroke(); tag(txt,x-24,y+(up?-20:20),pill,col,true,true,fzRgba(col,0.8)); };
        an(xH,yH,p.auto?'Swing High':'Range High',bull,true); an(xL,yL,p.auto?'Swing Low':'Range Low',bull,false); } }
    // signals
    if(p.showSig) D.sigs.slice(-30).forEach(s=>{ const cd=candles[s.idx], sx=X(s.idx); if(!cd||sx==null) return; const up=s.dir===1, sy=Y(up?cd.low:cd.high); if(sy==null) return; const col=up?bull:bear, full=p.sigText==='Full text', txt=full?(up?'Bullish Reversal Signal':'Bearish Reversal Signal'):(up?'BUY':'SELL'), ay=up?sy+5:sy-5;
      cx.font='bold 10px system-ui'; const w=cx.measureText(txt).width+12, by=up?ay+4:ay-4-16; cx.fillStyle=col; cx.beginPath(); cx.moveTo(sx,ay); cx.lineTo(sx-4,up?ay+4:ay-4); cx.lineTo(sx+4,up?ay+4:ay-4); cx.closePath(); cx.fill();
      cx.fillStyle=pill; cx.fillRect(sx-w/2,by,w,16); cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(sx-w/2,by,w,16); cx.fillStyle=col; cx.textAlign='center'; cx.fillText(txt,sx,by+8); });
    // info panel
    if(p.dash){ const ls=D.sigs.length?D.sigs[D.sigs.length-1]:null, rows=[];
      rows.push(['h','Reinblacks Golden Zone','rule-based']);
      if(!g) rows.push(['kv','Range','none yet',muted]);
      else { if(p.dLev){ rows.push(['h','Fibonacci Levels','']); LV.slice().sort((u,v)=>u.r-v.r).forEach(q=>rows.push(['kv',rt(q.r),fzFmt(g.lvlD(q.r)),q.col])); }
        rows.push(['kv','Golden zone',fzFmt(g.zBot)+' - '+fzFmt(g.zTop),gold]);
        rows.push(['kv','Trend',g.up?'\u2191 Uptrend (low \u2192 high)':'\u2193 Downtrend (high \u2192 low)',g.up?bull:bear]);
        rows.push(['kv','Range',(p.auto?'Auto':'Manual')+' \u00b7 '+Math.abs(g.hiI-g.loI)+' candles',fg]);
        rows.push(['kv','Price now',D.inZone?'inside golden zone':(g.up?(D.close>g.zTop?'above zone':'below zone'):(D.close<g.zBot?'below zone':'above zone')),D.inZone?gold:muted]); }
      rows.push(['kv','Latest signal',ls?(ls.dir===1?'Potential Bullish Reversal':'Potential Bearish Reversal'):'none yet',ls?(ls.dir===1?bull:bear):muted]);
      if(ls) rows.push(['kv','',(n0-2-ls.idx)+' candles ago'+(ls.inZone?' \u00b7 in golden zone':'')+(ls.vr!=null?' \u00b7 vol x'+ls.vr.toFixed(1):''),muted]);
      if(p.dSet){ rows.push(['h','Settings','(abbreviated)']); rows.push(['kv','Swing length',String(p.swingLen),muted]); rows.push(['kv','Golden zone',p.gA+' - '+p.gB,muted]); rows.push(['kv','Require confirmation',p.reqCandle?'\u2713':'-',muted]); rows.push(['kv','Volume filter',p.volOn?(D.hasVol?'\u2713':'on, no volume data'):'-',muted]); }
      let fs=({Tiny:9,Small:10,Normal:12,Large:14})[p.dsize]||10, w0=0,w1=0, rh, m=6, pw;
      for(;;){ w0=0; w1=0; rh=fs+8; rows.forEach(r=>{ cx.font='bold '+fs+'px system-ui'; w0=Math.max(w0,cx.measureText(r[1]).width); w1=Math.max(w1,cx.measureText(r[2]).width); }); pw=w0+w1+36; if(pw<=W-2*m||fs<=6) break; fs--; }
      const ph=rows.length*rh, x0=/Left/.test(p.dpos)?m:W-pw-m, y0=/Top/.test(p.dpos)?m+34:Hh-ph-m-24;
      cx.fillStyle=pill; cx.fillRect(x0,y0,pw,ph); rows.forEach((r,k)=>{ const y=y0+k*rh+rh/2; if(r[0]==='h'){ cx.fillStyle=fzRgba(gold,0.18); cx.fillRect(x0,y-rh/2,pw,rh); cx.font='bold '+fs+'px system-ui'; cx.textAlign='left'; cx.fillStyle=fg; cx.fillText(r[1],x0+8,y); cx.fillStyle=muted; cx.font=fs+'px system-ui'; cx.textAlign='right'; cx.fillText(r[2],x0+pw-8,y); }
        else { cx.font=fs+'px system-ui'; cx.textAlign='left'; cx.fillStyle=muted; cx.fillText(r[1],x0+8,y); cx.font='bold '+fs+'px system-ui'; cx.fillStyle=r[3]; cx.textAlign='right'; cx.fillText(r[2],x0+pw-8,y); } });
      cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph); }
    cx.restore(); }; }
// alerts: fire once, when the candle that carried the event has closed (the newest closed candle), while the app is open
function fzAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='fgz'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},FZ_DEF,i.p); let quiet=q; if(i._fzK!==key){ i._fzK=key; i._fzLast={}; quiet=true; }
    const last=i._fzLast||(i._fzLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      const on={zoneU:P.alZone,zoneD:P.alZone,buy:P.alBuy,sell:P.alSell}[e.type]; if(quiet||e.time!==cc||!on) return;
      const nm={zoneU:'Price entered the GOLDEN ZONE (uptrend)',zoneD:'Price entered the GOLDEN ZONE (downtrend)',buy:'Potential BULLISH reversal in the golden zone',sell:'Potential BEARISH reversal in the golden zone'}[e.type];
      toast('GOLDEN ZONE \u00b7 '+nm+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+fzFmt(e.price),(e.type==='buy')?'#2e7d32':(e.type==='sell')?'#c62828':'#f9a825'); if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _fzRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_fzRE.apply(this,arguments); try{ fzAlerts(q); }catch(e){ console.error('fgz alerts',e); } return rv; }; }
try{ DESC.fgz='Fibonacci retracement from the latest swing (auto, or manual candle count) with a 0.618-0.650 GOLDEN ZONE, closed-candle BUY / SELL reversal candidates with optional candle patterns and volume filter, alerts and a panel. A potential reaction area, not a guaranteed reversal'; }catch(e){}
}catch(err){ console.error('fgz indicator failed',err); window.__fgzErr=err; }

// ---- [lgs] INDICATOR: Reinblacks Liquidity Golden Snap - most-traded price zone (volume profile), auto-extending green / red box, liquidity SWEEP + reclaim BUY / SELL (self-contained: every name starts with lg / LG) ----
// Candles are treated as closed bars: the newest (still forming) candle is never used, so nothing repaints.
//  ZONE   - over the last "Look-back" candles the price range is cut into bins and every candle adds its volume (or 1 per candle when the feed has no volume) to the bins it touched.
//           The tightest band of "Zone height" bins holding the MOST trading = the zone. It is re-measured every "Refresh" candles using only past candles.
//           Zone BELOW price = GREEN box (buy side). Zone ABOVE price = RED box (sell side). The newest box auto-extends to the right edge.
//  SWEEP  - BUY side: a candle trades BELOW the green box (its low breaks the bottom). The sweep is COUNTED on the 2nd candle of the break (adjustable). SELL side is the mirror (above the red box).
//           A sweep is drawn as a dotted line to a tiny yellow "sweep" button.
//  BUY    - after a sweep below the green box, price must come back above the box: the 2nd GREEN candle that closes back above it (adjustable) = BUY. SELL = the mirror with RED candles.
//           A dotted line connects the candle to a tiny green "buy" (or red "sell") button.
//  FILTERS- "Next sweep after N candles" and "Next BUY / SELL after N candles" are plain numbers: 50, 20, 100 ... any value. They remove noise between markers.
try{
const LG_REC=['Past the zone','Zone middle','Zone edge'], LG_POS=['Top Right','Top Left','Bottom Right','Bottom Left'];
const LG_DEF={look:200,refresh:20,bins:60,zoneBins:3,useVol:true,
  extend:true,pastZ:2,fillOp:38,midLine:true,showTag:true,
  sweepN:2,buyN:2,maxWait:10,rec:LG_REC[0],brk:0,
  sweepGap:20,sigGap:50,
  showSweep:true,showSig:true,maxMk:60,sweepLen:14,sigLen:30,btnFs:8,
  dash:true,dpos:LG_POS[0],dsize:'Small',theme:'Dark',
  cBuy:'#2e9e4f',cSell:'#c62f3a',cSweep:'#ffd54f',
  alSweep:false,alBuy:true,alSell:true,alSound:false};
const lgClamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const lgRgba=(c,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'')); if(!m) return c; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const lgFmt=v=>{ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=100?2:a>=1?5:a>=0.01?6:9}); };
function lgCompute(c,p){ const N=c.length, D={N,ok:false}; if(N<35) return D;
  const O=c.map(x=>x.open), H=c.map(x=>x.high), L=c.map(x=>x.low), C=c.map(x=>x.close), V=c.map(x=>+x.volume||0), T=c.map(x=>x.time);
  for(let i=0;i<N;i++) if(![O[i],H[i],L[i],C[i]].every(isFinite)) return D;      // missing price data: do nothing rather than guess
  const atr=new Array(N).fill(null); { let s=0; for(let i=0;i<N;i++){ const tr=i?Math.max(H[i]-L[i],Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1])):H[i]-L[i]; if(i<14){ s+=tr; if(i===13) atr[i]=s/14; } else atr[i]=(atr[i-1]*13+tr)/14; } }
  const A=i=>atr[i]!=null?atr[i]:Math.max(H[i]-L[i],1e-12);
  const look=lgClamp(Math.round(+p.look)||200,20,5000), R=lgClamp(Math.round(+p.refresh)||20,1,1000), B=lgClamp(Math.round(+p.bins)||60,10,400), ZB=lgClamp(Math.round(+p.zoneBins)||3,1,Math.max(1,B-1));
  const sweepN=lgClamp(Math.round(+p.sweepN)||2,1,20), buyN=lgClamp(Math.round(+p.buyN)||2,1,20), maxWait=Math.max(sweepN,buyN,Math.round(+p.maxWait)||10), sweepGap=Math.max(0,Math.round(+p.sweepGap)||0), sigGap=Math.max(0,Math.round(+p.sigGap)||0), brkM=Math.max(0,+p.brk||0);
  const hasVol=V.some(v=>v>0), useV=!!p.useVol&&hasVol;
  const zones=[], sweeps=[], sigs=[], ev=[]; let cur=null, lastSweep={'1':-1e9,'-1':-1e9}, lastSig=-1e9;
  function build(t){ const s=Math.max(0,t-look+1); if(t-s+1<30) return null; let hi=-Infinity, lo=Infinity;
    for(let j=s;j<=t;j++){ if(H[j]>hi) hi=H[j]; if(L[j]<lo) lo=L[j]; } const rg=hi-lo; if(!(rg>0)) return null;
    const bw=rg/B, prof=new Float64Array(B);
    for(let j=s;j<=t;j++){ const a=lgClamp(Math.floor((L[j]-lo)/bw),0,B-1), b=lgClamp(Math.floor((H[j]-lo)/bw),0,B-1), w=useV?V[j]:1, nb=b-a+1; if(!(w>0)) continue; for(let k=a;k<=b;k++) prof[k]+=w/nb; }
    let tot=0; for(let k=0;k<B;k++) tot+=prof[k]; if(!(tot>0)) return null;
    let sum=0; for(let k=0;k<ZB;k++) sum+=prof[k]; let best=sum, bi=0; for(let k=ZB;k<B;k++){ sum+=prof[k]-prof[k-ZB]; if(sum>best){ best=sum; bi=k-ZB+1; } }
    const bot=lo+bi*bw, top=lo+(bi+ZB)*bw, mid=(bot+top)/2, side=C[t]>=mid?1:-1;      // zone below price = buy side, above price = sell side
    return {built:t,start:t+1,from:s,bot,top,mid,side,share:best/tot,st:{ph:0,b:-1,g:0,mk:false,armed:side===1?C[t]>=bot:C[t]<=top}}; }
  for(let t=29;t<N-1;t++){
    if(!cur||t-cur.built>=R){ const z=build(t); if(z){ zones.push(z); cur=z; } }
    if(!cur||t<=cur.built) continue;
    const z=cur, st=z.st, s=z.side, a=A(t), brk=brkM*a;
    const rl=p.rec===LG_REC[1]?z.mid:p.rec===LG_REC[2]?(s===1?z.bot:z.top):(s===1?z.top:z.bot);
    const beyond=s===1?L[t]<z.bot-brk:H[t]>z.top+brk, back=s===1?C[t]>=z.bot:C[t]<=z.top;
    if(st.ph===0){ if(!st.armed&&back) st.armed=true; if(st.armed&&beyond){ st.ph=1; st.b=t; st.g=0; st.mk=false; } }
    if(st.ph===1){ const k=t-st.b+1;
      const isG=s===1?(C[t]>O[t]&&C[t]>rl):(C[t]<O[t]&&C[t]<rl), lost=s===1?C[t]<rl:C[t]>rl;
      if(isG) st.g++; else if(lost) st.g=0;
      const fire=st.g>=buyN;
      if(!st.mk&&(k>=sweepN||fire)){ st.mk=true;
        if(t-lastSweep[s]>=sweepGap){ lastSweep[s]=t; const ex=s===1?L[t]:H[t]; sweeps.push({idx:t,time:T[t],dir:s,price:ex,brk:st.b}); ev.push({type:'sweep',time:T[t],idx:t,price:ex,dir:s}); } }
      if(fire){ if(t-lastSig>=sigGap){ lastSig=t; sigs.push({idx:t,time:T[t],dir:s,price:C[t],zone:z.built}); ev.push({type:s===1?'buy':'sell',time:T[t],idx:t,price:C[t]}); }
        st.ph=0; st.armed=false; }
      else if(k>=maxWait){ st.ph=0; st.armed=false; } } }
  D.zones=zones.slice(-60); D.cur=cur; D.sweeps=sweeps; D.sigs=sigs; D.events=ev.slice(-300); D.close=C[N-2]; D.hasVol=hasVol; D.useV=useV; D.n=N;
  D.nBuy=sigs.filter(s=>s.dir===1).length; D.nSell=sigs.length-D.nBuy; D.ok=!!cur; return D; }
let lgMem=null;
function lgGet(c,p){ const N=c.length, key=JSON.stringify(p)+'|'+N+'|'+(N?c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(lgMem&&lgMem.k===key) return lgMem.D;
  let D; try{ D=lgCompute(c,p); }catch(e){ console.error('lgs calc failed',e); D={N,ok:false}; } lgMem={k:key,D}; return D; }
const LG_FIELDS=[['look','num','Look-back: find the most-traded zone in the last N candles',{min:20,max:5000,step:10}],['refresh','num','Re-measure the zone every N candles',{min:1,max:1000,step:1}],['bins','num','Price bins (more = finer)',{min:10,max:400,step:5}],['zoneBins','num','Zone height (bins)',{min:1,max:60,step:1}],['useVol','chk','Use volume (off = count candles)'],
  ['extend','chk','Auto extend the newest zone to the right'],['pastZ','num','Older zones to keep drawn',{min:0,max:30}],['fillOp','num','Zone opacity (%)',{min:5,max:90,step:5}],['midLine','chk','Dashed middle line'],['showTag','chk','Zone label'],
  ['sweepN','num','SWEEP is counted on candle # of the break (2 = second candle)',{min:1,max:20}],['buyN','num','BUY / SELL on the Nth candle that closes back (2 = second)',{min:1,max:20}],['maxWait','num','Give up after N candles without a reclaim',{min:2,max:100}],['rec','sel','Candle must close back',{opts:LG_REC}],['brk','num','Break must pass the zone by (x ATR)',{min:0,max:3,step:0.05}],
  ['sweepGap','num','Next SWEEP only after N candles (any number: 20, 50 ...)',{min:0,max:5000,step:1}],['sigGap','num','Next BUY / SELL only after N candles (any number: 50, 100 ...)',{min:0,max:5000,step:1}],
  ['showSweep','chk','Show SWEEP buttons'],['showSig','chk','Show BUY / SELL buttons'],['maxMk','num','Max markers drawn',{min:5,max:300,step:5}],['sweepLen','num','Sweep dotted line length (px)',{min:4,max:120}],['sigLen','num','BUY / SELL dotted line length (px)',{min:4,max:160}],['btnFs','num','Button text size',{min:6,max:14}],
  ['dash','chk','Show info panel'],['dpos','sel','Panel position',{opts:LG_POS}],['dsize','sel','Panel size',{opts:['Tiny','Small','Normal','Large']}],['theme','sel','Theme',{opts:['Dark','Light']}],
  ['cBuy','col','BUY / green zone colour'],['cSell','col','SELL / red zone colour'],['cSweep','col','SWEEP button colour'],
  ['alSweep','chk','Alert: sweep counted'],['alBuy','chk','Alert: BUY'],['alSell','chk','Alert: SELL'],['alSound','chk','Play a sound']];
IND.lgs={label:'Reinblacks Liquidity Golden Snap',cat:'Trend',nm:()=>'Liquidity Golden Snap',p:Object.assign({},LG_DEF),cols:['#2e9e4f'],
  fields:LG_FIELDS,
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},LG_DEF,p), D=lgGet(c,q); return {mk:[],boxes:[{type:'lgsview',pts:[],o:q,D}],labels:[],events:D.ok?D.events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='lgsview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, n0=candles.length; if(!D||!D.ok||n0<5) return; const dark=p.theme!=='Light';
    const fg=dark?'#e6e8ee':'#131722', muted=dark?'rgba(230,232,238,.6)':'rgba(19,23,34,.6)', pill=dark?'rgba(10,13,20,.9)':'rgba(255,255,255,.93)';
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    const xa=i=>{ const v=X(i); return v==null?0:v; }, op=lgClamp(+p.fillOp,5,90)/100, zs=D.zones, curZ=D.cur;
    // zones: older ones (faded, end where the next one starts) and the newest one (auto extends to the right edge)
    const showFrom=Math.max(0,zs.length-1-lgClamp(Math.round(+p.pastZ)||0,0,30));
    for(let i=showFrom;i<zs.length;i++){ const z=zs[i], isNew=z===curZ, nx=zs[i+1], col=z.side===1?p.cBuy:p.cSell;
      const xs=isNew?xa(z.from):xa(z.start), xf=isNew?(p.extend?W:xa(n0-2)):xa(nx?nx.start:n0-2); if(xf<=xs) continue;
      const ya=Y(z.top), yb=Y(z.bot); if(ya==null||yb==null) continue; const t0=Math.min(ya,yb), h=Math.max(3,Math.abs(yb-ya)), a=isNew?op:op*0.55;
      cx.fillStyle=lgRgba(col,a); cx.fillRect(xs,t0,xf-xs,h); cx.strokeStyle=lgRgba(col,isNew?0.95:0.5); cx.lineWidth=1; cx.strokeRect(xs,t0,xf-xs,h);
      if(p.midLine){ const ym=Y(z.mid); if(ym!=null){ cx.strokeStyle=isNew?'rgba(255,255,255,.9)':'rgba(255,255,255,.4)'; cx.setLineDash([6,4]); cx.beginPath(); cx.moveTo(xs,ym); cx.lineTo(xf,ym); cx.stroke(); cx.setLineDash([]); } }
      if(isNew&&p.showTag){ const txt=(z.side===1?'BUY ZONE':'SELL ZONE')+' \u00b7 most traded'; cx.font='bold 9px system-ui'; const w=cx.measureText(txt).width+10, tx=Math.max(xs,2)+4, ty=z.side===1?t0+h+8:t0-8;
        cx.fillStyle=pill; cx.fillRect(tx,ty-7,w,14); cx.strokeStyle=lgRgba(col,0.9); cx.lineWidth=1; cx.strokeRect(tx,ty-7,w,14); cx.fillStyle=col; cx.textAlign='left'; cx.fillText(txt,tx+5,ty); } }
    // tiny button on a dotted line
    const btn=(sx,sy,len,up,txt,col,fgc)=>{ const fs=lgClamp(Math.round(+p.btnFs)||8,6,14); cx.font='bold '+fs+'px system-ui'; const w=cx.measureText(txt).width+8, h=fs+5, y1=up?sy-3:sy+3, y2=up?y1-len:y1+len, by=up?y2-h:y2;
      cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([1.5,2.5]); cx.beginPath(); cx.moveTo(sx,y1); cx.lineTo(sx,y2); cx.stroke(); cx.setLineDash([]);
      cx.fillStyle=col; cx.beginPath(); if(cx.roundRect) cx.roundRect(sx-w/2,by,w,h,h/2); else cx.rect(sx-w/2,by,w,h); cx.fill();
      cx.fillStyle=fgc; cx.textAlign='center'; cx.fillText(txt,sx,by+h/2+0.5); return h; };
    const cap=lgClamp(Math.round(+p.maxMk)||60,5,300), sl=lgClamp(+p.sweepLen||14,4,120), gl=lgClamp(+p.sigLen||30,4,160), sigAt={};
    if(p.showSig) D.sigs.slice(-cap).forEach(s=>{ sigAt[s.idx]=1; });
    if(p.showSweep) D.sweeps.slice(-cap).forEach(s=>{ const cd=candles[s.idx], sx=X(s.idx); if(!cd||sx==null) return; const up=s.dir===-1, sy=Y(up?cd.high:cd.low); if(sy==null) return; btn(sx,sy,sl,up,'sweep',p.cSweep,'#14110a'); });
    if(p.showSig) D.sigs.slice(-cap).forEach(s=>{ const cd=candles[s.idx], sx=X(s.idx); if(!cd||sx==null) return; const up=s.dir===-1, sy=Y(up?cd.high:cd.low); if(sy==null) return;
      const stack=(p.showSweep&&D.sweeps.some(w=>w.idx===s.idx&&w.dir===s.dir))?sl+14:0; btn(sx,sy,gl+stack,up,s.dir===1?'buy':'sell',s.dir===1?p.cBuy:p.cSell,'#ffffff'); });
    // info panel
    if(p.dash){ const rows=[], z=curZ, ls=D.sigs.length?D.sigs[D.sigs.length-1]:null, lw=D.sweeps.length?D.sweeps[D.sweeps.length-1]:null;
      rows.push(['h','Liquidity Golden Snap','rule-based']);
      rows.push(['kv','Zone',lgFmt(z.bot)+' - '+lgFmt(z.top),z.side===1?p.cBuy:p.cSell]);
      rows.push(['kv','Side',z.side===1?'BUY zone (below price)':'SELL zone (above price)',z.side===1?p.cBuy:p.cSell]);
      rows.push(['kv','Traded here',(z.share*100).toFixed(0)+'% of '+(D.useV?'volume':'candles'),fg]);
      rows.push(['kv','Sweeps counted',String(D.sweeps.length),p.cSweep]);
      rows.push(['kv','BUY / SELL',D.nBuy+' / '+D.nSell,fg]);
      rows.push(['kv','Latest sweep',lw?((n0-2-lw.idx)+' candles ago'):'none yet',muted]);
      rows.push(['kv','Latest signal',ls?((ls.dir===1?'BUY':'SELL')+' \u00b7 '+(n0-2-ls.idx)+' candles ago'):'none yet',ls?(ls.dir===1?p.cBuy:p.cSell):muted]);
      let fs=({Tiny:9,Small:10,Normal:12,Large:14})[p.dsize]||10, w0=0,w1=0, rh, m=6, pw;
      for(;;){ w0=0; w1=0; rh=fs+8; rows.forEach(r=>{ cx.font='bold '+fs+'px system-ui'; w0=Math.max(w0,cx.measureText(r[1]).width); w1=Math.max(w1,cx.measureText(r[2]).width); }); pw=w0+w1+36; if(pw<=W-2*m||fs<=6) break; fs--; }
      const ph=rows.length*rh, x0=/Left/.test(p.dpos)?m:W-pw-m, y0=/Top/.test(p.dpos)?m+34:Hh-ph-m-24;
      cx.fillStyle=pill; cx.fillRect(x0,y0,pw,ph); rows.forEach((r,k)=>{ const y=y0+k*rh+rh/2; if(r[0]==='h'){ cx.fillStyle=lgRgba(p.cSweep,0.2); cx.fillRect(x0,y-rh/2,pw,rh); cx.font='bold '+fs+'px system-ui'; cx.textAlign='left'; cx.fillStyle=fg; cx.fillText(r[1],x0+8,y); cx.fillStyle=muted; cx.font=fs+'px system-ui'; cx.textAlign='right'; cx.fillText(r[2],x0+pw-8,y); }
        else { cx.font=fs+'px system-ui'; cx.textAlign='left'; cx.fillStyle=muted; cx.fillText(r[1],x0+8,y); cx.font='bold '+fs+'px system-ui'; cx.fillStyle=r[3]; cx.textAlign='right'; cx.fillText(r[2],x0+pw-8,y); } });
      cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph); }
    cx.restore(); }; }
// alerts: fire once, when the candle that carried the event has closed (the newest closed candle), while the app is open
function lgAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='lgs'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},LG_DEF,i.p); let quiet=q; if(i._lgK!==key){ i._lgK=key; i._lgLast={}; quiet=true; }
    const last=i._lgLast||(i._lgLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      const on={sweep:P.alSweep,buy:P.alBuy,sell:P.alSell}[e.type]; if(quiet||e.time!==cc||!on) return;
      const nm={sweep:'Liquidity SWEEP counted ('+(e.dir===1?'below the buy zone':'above the sell zone')+')',buy:'BUY - swept below the zone and closed back above it',sell:'SELL - swept above the zone and closed back below it'}[e.type];
      toast('GOLDEN SNAP \u00b7 '+nm+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+lgFmt(e.price),(e.type==='buy')?'#2e7d32':(e.type==='sell')?'#c62828':'#f9a825'); if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _lgRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_lgRE.apply(this,arguments); try{ lgAlerts(q); }catch(e){ console.error('lgs alerts',e); } return rv; }; }
try{ DESC.lgs='Finds the price zone where most trading happened (volume profile over an adjustable number of candles). Zone below price = green box, above = red box, auto-extended to the right. Price sweeping through it and closing back (2nd green / red candle) gives a BUY / SELL; sweeps get a yellow button. Adjustable gaps between sweeps and between signals'; }catch(e){}
}catch(err){ console.error('lgs indicator failed',err); window.__lgsErr=err; }

// ---- [ebs] INDICATOR: Equal Buys and Sells by Reinblacks B - Signature Split 2 look (thick yellow middle rectangle, green above / red below), cross + retest + BOS + 2nd candle BUY / SELL, SL / TP1-3 (self-contained: every name starts with eb / EB) ----
// Candles are treated as closed bars: the newest (still forming) candle is never used, so nothing repaints.
//  MIDDLE  - a thick yellow rectangle in the middle of the range (Auto = middle of the last "Look-back" candles, ONE rectangle across the whole chart) or at a PRICE you type (Manual) and can LOCK.
//            Candles above the rectangle are painted green, candles below it red (like Signature Split 2). Optional soft green / red glow behind them.
//  CROSS   - BUY side: a candle CLOSES above the rectangle after the previous close was at or below its top. SELL side is the mirror. A tiny dot marks it.
//            The next cross on the same side only counts after N candles (pick 10 / 20 / 30 / 50 / 69 / 100 / 150 / 200 or type your own number).
//  RETEST  - price comes back to touch the rectangle and holds (does not close through it) = yellow triangle. Own "next retest after N candles" filter.
//  BOS     - break of structure: a CLOSE beyond the most recent PROPER swing (a pivot with N candles on each side, not just one tall candle) that is still unbroken. Dotted white line + "BOS".
//  ENTRY   - after the BOS, the 2nd green candle (BUY) / 2nd red candle (SELL) = signal. BOS, green, red, red, green = BUY. BOS, green, red, green = BUY. Own "next BUY / SELL after N candles" filter.
//  RISK    - SL: below the rectangle (its edge, or the low of the 1st / 2nd candle from it), or a number of pips, or a percent. TP1 / TP2 / TP3: pips, candles (x average candle size), percent or risk : reward.
try{
const EB_THK=['ATR x','% of price','Pips'], EB_SLM=['Rectangle','Pips','Percent'], EB_ANC=['Rectangle edge','1st candle from rectangle','2nd candle from rectangle'], EB_TPM=['Pips','Candles','Percent','Risk : Reward'], EB_RSK=['Latest signal','All signals','Off'];
const EB_GAPS=['Custom','10','20','30','50','69','100','150','200'], EB_POS=['Top Right','Top Left','Bottom Right','Bottom Left'];
const EB_DEF={look:1000,midPrice:0,lock:true,thkMode:EB_THK[0],thk:0,midFill:45,
  colCandles:true,glow:16,
  crossSel:'50',crossN:50,retSel:'30',retN:30,sigSel:'50',sigN:50,
  retWait:40,retClose:false,swing:3,bosSwing:'1st',bosWait:60,bosClose:true,buyN:2,entWait:12,cancelBack:true,
  slMode:EB_SLM[0],slAnchor:EB_ANC[1],slVal:0,slPad:0.1,pipSize:0,
  tpMode:EB_TPM[3],tp1:0,tp2:0,tp3:0,showRisk:EB_RSK[0],showPrices:true,
  showCross:true,showRet:true,showBos:true,showSig:true,maxMk:60,sigLen:30,btnFs:8,triSz:5,
  dash:false,dpos:EB_POS[0],dsize:'Small',theme:'Dark',
  cMid:'#ffd400',cBuy:'#2e9e4f',cSell:'#c62f3a',cUp:'#00e676',cDn:'#ff1744',cRet:'#ffd54f',
  alCross:false,alRet:false,alBos:false,alBuy:true,alSell:true,alSound:false};
const ebClamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const ebRgba=(c,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'')); if(!m) return c; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const ebFmt=v=>{ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=100?2:a>=1?5:a>=0.01?6:9}); };
const ebGap=(sel,n)=>{ const v=sel==='Custom'?+n:parseInt(sel,10); return Math.max(0,Math.round(isFinite(v)?v:0)); };
const ebPip=(price,p)=>{ if(+p.pipSize>0) return +p.pipSize; return price>=10000?1:price>=1000?0.1:price>=20?0.01:price>=1?0.0001:0.00001; };
const ebLk={}, ebThk={};
const ebKey=()=>{ try{ return String(sym[0])+'|'+String(tf[0]); }catch(e){ return '|'; } };
function ebCompute(c,p,lockP){ const N=c.length, D={N,ok:false}; if(N<45) return D;
  const O=c.map(x=>x.open), H=c.map(x=>x.high), L=c.map(x=>x.low), C=c.map(x=>x.close), T=c.map(x=>x.time);
  for(let i=0;i<N;i++) if(![O[i],H[i],L[i],C[i]].every(isFinite)) return D;
  const atr=new Array(N).fill(null); { let s=0; for(let i=0;i<N;i++){ const tr=i?Math.max(H[i]-L[i],Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1])):H[i]-L[i]; if(i<14){ s+=tr; if(i===13) atr[i]=s/14; } else atr[i]=(atr[i-1]*13+tr)/14; } }
  const A=i=>atr[i]!=null?atr[i]:Math.max(H[i]-L[i],1e-12);
  const look=ebClamp(Math.round(+p.look)||200,20,5000), R=ebClamp(Math.round(+p.refresh)||50,1,2000), S=ebClamp(Math.round(+p.swing)||3,1,15);
  const gC=ebGap(p.crossSel,p.crossN), gR=ebGap(p.retSel,p.retN), gS=ebGap(p.sigSel,p.sigN);
  const retWait=ebClamp(Math.round(+p.retWait)||40,1,1000), bosWait=ebClamp(Math.round(+p.bosWait)||60,1,2000), entWait=ebClamp(Math.round(+p.entWait)||12,1,500), buyN=ebClamp(Math.round(+p.buyN)||2,1,10);
  let autoMid=0; { const s0=Math.max(0,N-1-look); let hi=-Infinity, lo=Infinity; for(let j=s0;j<=N-2;j++){ if(H[j]>hi) hi=H[j]; if(L[j]<lo) lo=L[j]; } autoMid=(hi+lo)/2; }
  const manual=+p.midPrice>0, fixedP=manual?+p.midPrice:(lockP>0?lockP:autoMid), fixed=true;   // ONE continuous rectangle across the whole chart, like the Signature Split 2 line
  let meanA=0; { let s=0,k=0; for(let i=14;i<=N-2;i++){ s+=atr[i]; k++; } meanA=k?s/k:A(N-2); }
  const kk0=+p.thk>0?+p.thk:(p.thkMode==='ATR x'?0.8:p.thkMode==='% of price'?0.25:20);
  const thKey=ebKey()+'|'+p.thkMode+'|'+kk0; if(fixed&&p.thkMode==='ATR x'){ if(!ebThk[thKey]) ebThk[thKey]=meanA; meanA=ebThk[thKey]; }
  const PH=[], PL=[], zones=[], crosses=[], rets=[], boses=[], sigs=[], ev=[];
  const isPH=j=>{ if(j<S||j+S>=N) return false; for(let k=1;k<=S;k++) if(!(H[j]>H[j-k])||!(H[j]>=H[j+k])) return false; return true; };
  const isPL=j=>{ if(j<S||j+S>=N) return false; for(let k=1;k<=S;k++) if(!(L[j]<L[j-k])||!(L[j]<=L[j+k])) return false; return true; };
  let cur=null; const st={'1':null,'-1':null}, lastC={'1':-1e9,'-1':-1e9}, lastR={'1':-1e9,'-1':-1e9}, lastS={'1':-1e9,'-1':-1e9};
  function build(t){ let mid;
    if(fixed) mid=fixedP; else { const s=Math.max(0,t-look+1); let hi=-Infinity, lo=Infinity; for(let j=s;j<=t;j++){ if(H[j]>hi) hi=H[j]; if(L[j]<lo) lo=L[j]; } if(!(hi>lo)) return null; mid=(hi+lo)/2; }
    let th=p.thkMode==='ATR x'?kk0*(fixed?meanA:A(t)):p.thkMode==='% of price'?mid*kk0/100:kk0*ebPip(mid,p); th=Math.max(th,Math.abs(mid)*1e-6);
    return {built:t,start:t+1,mid,top:mid+th/2,bot:mid-th/2}; }
  function trade(s,t,g){ const up=s===1, e=C[t], a=A(t), pip=ebPip(e,p); let sl;
    if(p.slMode==='Pips'){ const v=+p.slVal>0?+p.slVal:20; sl=up?e-v*pip:e+v*pip; }
    else if(p.slMode==='Percent'){ const v=+p.slVal>0?+p.slVal:0.5; sl=e*(1+(up?-1:1)*v/100); }
    else { let ext=up?g.z.bot:g.z.top; const an=p.slAnchor;
      if(an===EB_ANC[1]||an===EB_ANC[2]){ ext=up?Math.min(ext,L[g.ret]):Math.max(ext,H[g.ret]); }
      if(an===EB_ANC[2]&&g.ret>0){ ext=up?Math.min(ext,L[g.ret-1]):Math.max(ext,H[g.ret-1]); }
      const pad=Math.max(0,+p.slPad||0)*a; sl=up?ext-pad:ext+pad; }
    if(up?sl>=e:sl<=e) sl=up?e-a:e+a;
    const risk=Math.abs(e-sl), tps=[];
    for(let k=1;k<=3;k++){ const raw=+p['tp'+k]; let d;
      if(p.tpMode==='Pips') d=(raw>0?raw:[30,60,90][k-1])*pip;
      else if(p.tpMode==='Candles') d=(raw>0?raw:[2,4,6][k-1])*a;
      else if(p.tpMode==='Percent') d=e*(raw>0?raw:[0.5,1,1.5][k-1])/100;
      else d=risk*(raw>0?raw:k);
      tps.push(up?e+d:e-d); }
    const r={sl:false,tp:0,end:-1};
    for(let m=t+1;m<=N-2;m++){ const hs=up?L[m]<=sl:H[m]>=sl; if(hs){ r.sl=true; r.end=m; break; }
      while(r.tp<3&&(up?H[m]>=tps[r.tp]:L[m]<=tps[r.tp])) r.tp++;
      if(r.tp>=3){ r.end=m; break; } }
    return {idx:t,time:T[t],dir:s,price:e,slP:sl,tps,risk,res:r,ret:g.ret}; }
  for(let t=1;t<=N-2;t++){
    const jj=t-S; if(jj>=S){ if(isPH(jj)) PH.push({j:jj,v:H[jj]}); if(isPL(jj)) PL.push({j:jj,v:L[jj]}); }
    if(t>=29&&(fixed?!cur:(!cur||t-cur.built>=R))){ const z=build(t); if(z){ zones.push(z); cur=z; } }
    if(!cur||t<=cur.built) continue;
    for(const s of [1,-1]){ const up=s===1; let g=st[s];
      if(!g){ const zz=cur, crossed=up?(C[t]>zz.top&&C[t-1]<=zz.top):(C[t]<zz.bot&&C[t-1]>=zz.bot);
        if(crossed&&t-lastC[s]>=gC){ lastC[s]=t; st[s]={ph:1,cx:t,z:zz,ret:-1,lvl:null,lvj:-1,bos:-1,gc:0};
          const pr=up?zz.top:zz.bot; crosses.push({idx:t,time:T[t],dir:s,price:pr}); ev.push({type:'cross',time:T[t],idx:t,price:pr,dir:s}); }
        continue; }
      const zz=g.z, lost=up?C[t]<zz.bot:C[t]>zz.top;
      if(g.ph===1){ if(t-g.cx>retWait){ st[s]=null; continue; }
        const touch=up?L[t]<=zz.top:H[t]>=zz.bot;
        if(touch){ if(lost){ st[s]=null; continue; }
          const okC=!p.retClose||(up?C[t]>=zz.top:C[t]<=zz.bot);
          if(okC&&t-lastR[s]>=gR){ lastR[s]=t; g.ph=2; g.ret=t; const pr=up?L[t]:H[t]; rets.push({idx:t,time:T[t],dir:s,price:pr}); ev.push({type:'ret',time:T[t],idx:t,price:pr,dir:s}); } }
        continue; }
      if(g.ph===2){ if(t-g.ret>bosWait||(p.cancelBack&&lost)){ st[s]=null; continue; }
        if(g.lvl==null){ const piv=up?PH:PL, SN=ebClamp(parseInt(p.bosSwing,10)||1,1,4); let hit=0; for(let q=piv.length-1,n=0;q>=0&&n<80;q--,n++){ const pv=piv[q]; if(pv.j<g.cx-look) break; if(pv.j>=t) continue;
            if(up?C[t-1]>=pv.v:C[t-1]<=pv.v) continue; let broken=false; for(let m=pv.j+1;m<t;m++){ if(up?H[m]>pv.v:L[m]<pv.v){ broken=true; break; } } if(broken) continue; if(++hit<SN) continue; g.lvl=pv.v; g.lvj=pv.j; break; } }
        if(g.lvl!=null&&t>g.ret){ const brk=p.bosClose?(up?C[t]>g.lvl:C[t]<g.lvl):(up?H[t]>g.lvl:L[t]<g.lvl);
          if(brk){ g.ph=3; g.bos=t; g.gc=0; boses.push({idx:t,time:T[t],dir:s,level:g.lvl,j:g.lvj}); ev.push({type:'bos',time:T[t],idx:t,price:g.lvl,dir:s}); } }
        continue; }
      if(g.ph===3){ if(t-g.bos>entWait||(p.cancelBack&&lost)){ st[s]=null; continue; }
        if(up?C[t]>O[t]:C[t]<O[t]) g.gc++;
        if(g.gc>=buyN){ if(t-lastS[s]>=gS){ lastS[s]=t; const tr=trade(s,t,g); sigs.push(tr); ev.push({type:up?'buy':'sell',time:T[t],idx:t,price:C[t],dir:s,sl:tr.slP,tps:tr.tps}); }
          st[s]=null; } } } }
  D.zones=zones.slice(-400); D.cur=cur; D.fixed=fixed; D.crosses=crosses; D.rets=rets; D.boses=boses; D.sigs=sigs; D.events=ev.slice(-400); D.n=N; D.close=C[N-2];
  D.nBuy=sigs.filter(s=>s.dir===1).length; D.nSell=sigs.length-D.nBuy;
  D.tpHit=[0,1,2].map(k=>sigs.filter(s=>s.res.tp>k).length); D.slHit=sigs.filter(s=>s.res.sl).length; D.ok=!!cur; return D; }
let ebMem=null;
function ebGet(c,p){ const N=c.length, sk=ebKey(), key=JSON.stringify(p)+'|'+sk+'|'+N+'|'+(N?c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(ebMem&&ebMem.k===key) return ebMem.D;
  let D; try{ D=ebCompute(c,p,0); if(p.lock&&!(+p.midPrice>0)){ if(!ebLk[sk]&&D.ok) ebLk[sk]=D.cur.mid; if(ebLk[sk]) D=ebCompute(c,p,ebLk[sk]); } else delete ebLk[sk]; }
  catch(e){ console.error('ebs calc failed',e); D={N,ok:false}; } ebMem={k:key,D}; return D; }
const EB_FIELDS=[
  ['look','num','Middle: Look-back candles (Auto = middle of their high / low)',{min:20,max:5000,step:10}],
  ['midPrice','num','Middle: Manual PRICE (0 = Auto). Type the price you want',{min:0,step:'any'}],['lock','chk','Middle: LOCK the Auto price so the rectangle stays put (off = follows the latest candles)'],
  ['thkMode','sel','Rectangle thickness unit',{opts:EB_THK}],['thk','num','Rectangle thickness (0 = default: 0.8 ATR / 0.25 % / 20 pips)',{min:0,step:'any'}],['midFill','num','Rectangle opacity (%)',{min:10,max:100,step:5}],
  ['colCandles','chk','Candles: green above the rectangle, red below it'],['glow','num','Soft green / red glow behind candles (%, 0 = off)',{min:0,max:60,step:2}],
  ['crossSel','sel','Crossover: next one only after N candles (pick a number)',{opts:EB_GAPS}],['crossN','num','Crossover: your own N (used when the pick is Custom)',{min:0,max:5000,step:1}],
  ['retSel','sel','Retest: next one only after N candles (pick a number)',{opts:EB_GAPS}],['retN','num','Retest: your own N (used when the pick is Custom)',{min:0,max:5000,step:1}],
  ['sigSel','sel','BUY / SELL: next one only after N candles (pick a number)',{opts:EB_GAPS}],['sigN','num','BUY / SELL: your own N (used when the pick is Custom)',{min:0,max:5000,step:1}],
  ['retWait','num','Retest must come within N candles of the cross',{min:1,max:1000}],['retClose','chk','Retest candle must close back above (below) the rectangle'],
  ['swing','num','BOS: swing strength (candles each side of a proper swing)',{min:1,max:15}],['bosSwing','sel','BOS: break the Nth swing (1st = latest unbroken swing, 2nd, 3rd, 4th = further back)',{opts:['1st','2nd','3rd','4th']}],['bosWait','num','BOS: give up after N candles from the retest',{min:1,max:2000}],['bosClose','chk','BOS needs a candle CLOSE beyond the swing (off = wick)'],
  ['buyN','num','Entry: BUY / SELL on the Nth green / red candle after the BOS',{min:1,max:10}],['entWait','num','Entry: give up after N candles from the BOS',{min:1,max:500}],['cancelBack','chk','Cancel the setup if price closes back through the rectangle'],
  ['slMode','sel','SL: type',{opts:EB_SLM}],['slAnchor','sel','SL (Rectangle): placed beyond',{opts:EB_ANC}],['slVal','num','SL: pips or % (0 = 20 pips / 0.5 %)',{min:0,step:'any'}],['slPad','num','SL (Rectangle): extra room (x ATR)',{min:0,max:3,step:0.05}],['pipSize','num','Pip size (0 = auto: forex 0.0001, JPY / gold / crypto scaled)',{min:0,step:'any'}],
  ['tpMode','sel','TP: type (Candles = x average candle size)',{opts:EB_TPM}],['tp1','num','TP1 value (0 = default 30 pips / 2 / 0.5 % / 1R)',{min:0,step:'any'}],['tp2','num','TP2 value (0 = default 60 pips / 4 / 1 % / 2R)',{min:0,step:'any'}],['tp3','num','TP3 value (0 = default 90 pips / 6 / 1.5 % / 3R)',{min:0,step:'any'}],
  ['showRisk','sel','Show SL / TP lines',{opts:EB_RSK}],['showPrices','chk','Prices on the SL / TP labels'],
  ['showCross','chk','Show crossover dots'],['showRet','chk','Show retest triangles'],['showBos','chk','Show BOS line + text'],['showSig','chk','Show BUY / SELL buttons'],['maxMk','num','Max markers drawn',{min:5,max:300,step:5}],['sigLen','num','BUY / SELL dotted line length (px)',{min:4,max:160}],['btnFs','num','Button text size',{min:6,max:14}],['triSz','num','Triangle size',{min:3,max:10}],
  ['dash','chk','Show info panel'],['dpos','sel','Panel position',{opts:EB_POS}],['dsize','sel','Panel size',{opts:['Tiny','Small','Normal','Large']}],['theme','sel','Theme',{opts:['Dark','Light']}],
  ['cMid','col','Middle rectangle colour'],['cBuy','col','BUY colour'],['cSell','col','SELL colour'],['cUp','col','Candles above the rectangle'],['cDn','col','Candles below the rectangle'],['cRet','col','Retest triangle colour'],
  ['alCross','chk','Alert: crossover'],['alRet','chk','Alert: retest'],['alBos','chk','Alert: BOS'],['alBuy','chk','Alert: BUY'],['alSell','chk','Alert: SELL'],['alSound','chk','Play a sound']];
IND.ebs={label:'Equal Buys and Sells by Reinblacks B',cat:'Trend',nm:()=>'Equal Buys and Sells',p:Object.assign({},EB_DEF),cols:['#ffd400'],
  fields:EB_FIELDS,
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},EB_DEF,p), D=ebGet(c,q); return {mk:[],boxes:[{type:'ebsview',pts:[],o:q,D}],labels:[],events:D.ok?D.events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='ebsview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, n0=candles.length; if(!D||!D.ok||n0<5) return; const dark=p.theme!=='Light';
    const fg=dark?'#e6e8ee':'#131722', muted=dark?'rgba(230,232,238,.6)':'rgba(19,23,34,.6)', pill=dark?'rgba(10,13,20,.9)':'rgba(255,255,255,.93)', wht=dark?'#ffffff':'#131722';
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    const xa=i=>{ const v=X(i); return v==null?0:v; }, zs=D.zones, nz=zs.length, keep=ebClamp(Math.round(+p.pastZ)||0,0,400), first=Math.max(0,nz-1-keep);
    const xsOf=i=>i===0?-6:xa(zs[i].start), xfOf=i=>i===nz-1?W:xa(zs[i+1].start);
    // soft split glow + the thick yellow middle rectangle
    const gl=ebClamp(+p.glow||0,0,60)/100, op=ebClamp(+p.midFill,10,100)/100;
    for(let i=first;i<nz;i++){ const z=zs[i], xs=xsOf(i), xf=xfOf(i); if(xf<=0||xs>=W||xf<=xs) continue; const ya=Y(z.top), yb=Y(z.bot); if(ya==null||yb==null) continue; const t0=Math.min(ya,yb), b0=Math.max(ya,yb), h=Math.max(3,b0-t0);
      if(gl>0){ if(t0>0){ const g=cx.createLinearGradient(0,t0,0,Math.max(0,t0-Hh*0.55)); g.addColorStop(0,ebRgba(p.cUp,gl)); g.addColorStop(1,ebRgba(p.cUp,0)); cx.fillStyle=g; cx.fillRect(xs,0,xf-xs,t0); }
        if(b0<Hh){ const g=cx.createLinearGradient(0,b0,0,Math.min(Hh,b0+Hh*0.55)); g.addColorStop(0,ebRgba(p.cDn,gl)); g.addColorStop(1,ebRgba(p.cDn,0)); cx.fillStyle=g; cx.fillRect(xs,b0,xf-xs,Hh-b0); } }
      cx.fillStyle=ebRgba(p.cMid,op); cx.fillRect(xs,t0,xf-xs,h); cx.strokeStyle=ebRgba(p.cMid,0.95); cx.lineWidth=1; cx.strokeRect(xs,t0,xf-xs,h); }
    // candles: green above the rectangle, red below it (painted over the chart candles)
    if(p.colCandles&&n0>2){ const x1=X(n0-1), x0=X(n0-2); let bs=(x1!=null&&x0!=null)?Math.abs(x1-x0):6; if(!(bs>0)) bs=6; const bw=Math.max(1,Math.floor(bs*0.7)), hw=bw/2; let zi=nz-1;
      for(let i=n0-1;i>=0;i--){ const x=X(i); if(x==null) continue; if(x<-bs) break; if(x>W+bs) continue; const cd=candles[i]; if(!cd) continue;
        while(zi>0&&zs[zi].start>i) zi--; const z=zs[zi], upc=cd.close>=z.mid, col=upc?p.cUp:p.cDn, yh=Y(cd.high), yl=Y(cd.low), yo=Y(cd.open), yc=Y(cd.close); if(yh==null||yl==null||yo==null||yc==null) continue;
        cx.strokeStyle=col; cx.lineWidth=1; cx.beginPath(); cx.moveTo(Math.round(x)+0.5,yh); cx.lineTo(Math.round(x)+0.5,yl); cx.stroke();
        const bt=Math.min(yo,yc), bh=Math.max(1,Math.abs(yo-yc)); cx.fillStyle=col; cx.fillRect(Math.round(x-hw),bt,bw,bh); } }
    const cap=ebClamp(Math.round(+p.maxMk)||60,5,300), fs=ebClamp(Math.round(+p.btnFs)||8,6,14), ts=ebClamp(+p.triSz||5,3,10), placed=[];
    // BOS: dotted white line from the swing to the break candle, with the word BOS
    if(p.showBos) D.boses.slice(-cap).forEach(b=>{ const x1=X(b.idx), x0=X(Math.max(0,b.j)), y=Y(b.level); if(x1==null||x0==null||y==null) return; cx.strokeStyle=wht; cx.lineWidth=1; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]);
      cx.font='bold '+(fs)+'px system-ui'; cx.textAlign='center'; const tx=(x0+x1)/2, ty=b.dir===1?y-fs*0.75:y+fs*0.75; cx.lineWidth=2.5; cx.strokeStyle=dark?'rgba(5,8,14,.9)':'rgba(255,255,255,.95)'; cx.strokeText('BOS',tx,ty); cx.fillStyle=wht; cx.fillText('BOS',tx,ty); });
    // crossover dots
    if(p.showCross) D.crosses.slice(-cap).forEach(k=>{ const sx=X(k.idx), sy=Y(k.price); if(sx==null||sy==null) return; cx.beginPath(); cx.arc(sx,sy,2.6,0,6.2832); cx.fillStyle=k.dir===1?p.cBuy:p.cSell; cx.fill(); cx.strokeStyle=wht; cx.lineWidth=1; cx.stroke(); });
    // retest: yellow triangle (points at the rectangle)
    if(p.showRet) D.rets.slice(-cap).forEach(r=>{ const cd=candles[r.idx], sx=X(r.idx); if(!cd||sx==null) return; const up=r.dir===1, sy=Y(up?cd.low:cd.high); if(sy==null) return; const y0=up?sy+3:sy-3, y1=up?y0+ts*1.6:y0-ts*1.6;
      cx.beginPath(); cx.moveTo(sx,y0); cx.lineTo(sx-ts,y1); cx.lineTo(sx+ts,y1); cx.closePath(); cx.fillStyle=p.cRet; cx.fill(); cx.strokeStyle='rgba(20,17,10,.8)'; cx.lineWidth=1; cx.stroke(); placed.push([sx-ts,Math.min(y0,y1),sx+ts,Math.max(y0,y1)]); });
    // tiny BUY / SELL button on a dotted line (moved further out if it would overlap another button or triangle)
    const btn=(sx,sy,len,up,txt,col)=>{ cx.font='bold '+fs+'px system-ui'; const w=cx.measureText(txt).width+8, h=fs+5; let L=len, tries=0, y1, y2, by;
      for(;;){ y1=up?sy-3:sy+3; y2=up?y1-L:y1+L; by=up?y2-h:y2; const r=[sx-w/2,by,sx+w/2,by+h]; if(tries++>10||!placed.some(q=>r[0]<q[2]&&r[2]>q[0]&&r[1]<q[3]&&r[3]>q[1])){ placed.push(r); break; } L+=h+3; }
      cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([1.5,2.5]); cx.beginPath(); cx.moveTo(sx,y1); cx.lineTo(sx,y2); cx.stroke(); cx.setLineDash([]);
      cx.fillStyle=col; cx.beginPath(); if(cx.roundRect) cx.roundRect(sx-w/2,by,w,h,h/2); else cx.rect(sx-w/2,by,w,h); cx.fill(); cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText(txt,sx,by+h/2+0.5); };
    const gl2=ebClamp(+p.sigLen||30,4,160);
    if(p.showSig) D.sigs.slice(-cap).forEach(s=>{ const cd=candles[s.idx], sx=X(s.idx); if(!cd||sx==null) return; const up=s.dir===-1, sy=Y(up?cd.high:cd.low); if(sy==null) return; btn(sx,sy,gl2,up,s.dir===1?'buy':'sell',s.dir===1?p.cBuy:p.cSell); });
    // SL / TP1-3 lines for the latest signal (or all), tiny labels pushed apart so they never overlap
    if(p.showRisk!==EB_RSK[2]&&D.sigs.length){ const list=p.showRisk===EB_RSK[1]?D.sigs.slice(-Math.min(cap,12)):D.sigs.slice(-1);
      list.forEach(s=>{ const x0=X(s.idx); if(x0==null) return; let x1=s.res.end>=0?X(s.res.end):W-4; if(x1==null) x1=W-4; x1=Math.min(Math.max(x1,x0+14),W-2);
        const lv=[['Entry',s.price,wht,false],['SL',s.slP,p.cSell,s.res.sl],['TP1',s.tps[0],p.cBuy,s.res.tp>=1],['TP2',s.tps[1],p.cBuy,s.res.tp>=2],['TP3',s.tps[2],p.cBuy,s.res.tp>=3]], labs=[];
        lv.forEach(v=>{ const y=Y(v[1]); if(y==null) return; cx.strokeStyle=v[0]==='Entry'?ebRgba(wht,0.6):v[2]; cx.lineWidth=1; cx.setLineDash(v[0]==='Entry'?[5,3]:[2,3]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]); if(v[0]!=='Entry') labs.push({y,t:v[0]+(v[3]?(v[0]==='SL'?' \u2717':' \u2713'):'')+(p.showPrices?' '+ebFmt(v[1]):''),c:v[2]}); });
        labs.sort((a,b)=>a.y-b.y); const gap=fs+3; for(let k=1;k<labs.length;k++) if(labs[k].y-labs[k-1].y<gap) labs[k].y=labs[k-1].y+gap;
        cx.font='bold '+(fs-1)+'px system-ui'; cx.textAlign='right'; labs.forEach(l=>{ const w=cx.measureText(l.t).width+6, rx=x1; cx.fillStyle=pill; cx.fillRect(rx-w,l.y-(fs+1)/2,w,fs+1); cx.fillStyle=l.c; cx.fillText(l.t,rx-3,l.y+0.5); }); }); }
    // info panel
    if(p.dash){ const rows=[], z=D.cur, ls=D.sigs.length?D.sigs[D.sigs.length-1]:null;
      rows.push(['h','Equal Buys and Sells','rule-based']);
      rows.push(['kv','Middle price',ebFmt(z.mid)+(D.fixed?' (fixed)':' (auto)'),p.cMid]);
      rows.push(['kv','Rectangle',ebFmt(z.bot)+' - '+ebFmt(z.top),fg]);
      rows.push(['kv','Cross / Retest / BOS',D.crosses.length+' / '+D.rets.length+' / '+D.boses.length,fg]);
      rows.push(['kv','BUY / SELL',D.nBuy+' / '+D.nSell,fg]);
      rows.push(['kv','TP1 / TP2 / TP3 hit',D.tpHit.join(' / '),p.cBuy]);
      rows.push(['kv','Stopped out (SL)',String(D.slHit),p.cSell]);
      rows.push(['kv','Latest signal',ls?((ls.dir===1?'BUY':'SELL')+' \u00b7 '+(n0-2-ls.idx)+' candles ago'):'none yet',ls?(ls.dir===1?p.cBuy:p.cSell):muted]);
      let f2=({Tiny:9,Small:10,Normal:12,Large:14})[p.dsize]||10, w0=0,w1=0, rh, m=6, pw;
      for(;;){ w0=0; w1=0; rh=f2+8; rows.forEach(r=>{ cx.font='bold '+f2+'px system-ui'; w0=Math.max(w0,cx.measureText(r[1]).width); w1=Math.max(w1,cx.measureText(r[2]).width); }); pw=w0+w1+36; if(pw<=W-2*m||f2<=6) break; f2--; }
      const ph=rows.length*rh, x0=/Left/.test(p.dpos)?m:W-pw-m, y0=/Top/.test(p.dpos)?m+34:Hh-ph-m-24;
      cx.fillStyle=pill; cx.fillRect(x0,y0,pw,ph); rows.forEach((r,k)=>{ const y=y0+k*rh+rh/2; if(r[0]==='h'){ cx.fillStyle=ebRgba(p.cMid,0.22); cx.fillRect(x0,y-rh/2,pw,rh); cx.font='bold '+f2+'px system-ui'; cx.textAlign='left'; cx.fillStyle=fg; cx.fillText(r[1],x0+8,y); cx.fillStyle=muted; cx.font=f2+'px system-ui'; cx.textAlign='right'; cx.fillText(r[2],x0+pw-8,y); }
        else { cx.font=f2+'px system-ui'; cx.textAlign='left'; cx.fillStyle=muted; cx.fillText(r[1],x0+8,y); cx.font='bold '+f2+'px system-ui'; cx.fillStyle=r[3]; cx.textAlign='right'; cx.fillText(r[2],x0+pw-8,y); } });
      cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph); }
    cx.restore(); }; }
// alerts: fire once, when the candle that carried the event has closed (the newest closed candle), while the app is open
function ebAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='ebs'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},EB_DEF,i.p); let quiet=q; if(i._ebK!==key){ i._ebK=key; i._ebLast={}; quiet=true; }
    const last=i._ebLast||(i._ebLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      const on={cross:P.alCross,ret:P.alRet,bos:P.alBos,buy:P.alBuy,sell:P.alSell}[e.type]; if(quiet||e.time!==cc||!on) return;
      const nm={cross:'Price crossed the middle rectangle '+(e.dir===1?'UP':'DOWN'),ret:'Retest of the middle rectangle ('+(e.dir===1?'buy side':'sell side')+')',bos:'BOS '+(e.dir===1?'(up)':'(down)'),buy:'BUY - 2nd green candle after BOS',sell:'SELL - 2nd red candle after BOS'}[e.type];
      const ex=(e.type==='buy'||e.type==='sell')?' \u00b7 SL '+ebFmt(e.sl)+' \u00b7 TP1 '+ebFmt(e.tps[0]):'';
      toast('EQUAL BUYS & SELLS \u00b7 '+nm+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+ebFmt(e.price)+ex,(e.type==='buy')?'#2e7d32':(e.type==='sell')?'#c62828':'#f9a825'); if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _ebRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_ebRE.apply(this,arguments); try{ ebAlerts(q); }catch(e){ console.error('ebs alerts',e); } return rv; }; }
try{ DESC.ebs='Signature Split 2 look: thick yellow middle rectangle (auto or your own locked price), candles green above and red below. Cross of the rectangle, retest (yellow triangle), proper-swing BOS (dotted white line), then BUY / SELL on the 2nd green / red candle. Pick the gap in candles between crosses, retests and signals (30, 50, 69 ... or type your own). SL by rectangle, pips or percent; TP1-3 by pips, candles, percent or risk : reward'; }catch(e){}
}catch(err){ console.error('ebs indicator failed',err); window.__ebsErr=err; }

// ---- [mss] INDICATOR: Market Shift Scalping System (MSS)  (self-contained: every name starts with ms / MS) ----
// Four questions, answered in order, all from CLOSED candles only (nothing repaints, the forming candle is never used for a decision):
//  1. WHO CONTROLS THE MARKET?  Direction timeframe (default 1H = 12 x the chart candle on a 5M chart): EXTERNAL swing structure (HH / HL / LH / LL, BOS) and INTERNAL structure
//     (small swings inside it, internal BOS / MSS). A structure break is valid only after a candle CLOSES beyond the swing point. They are kept separate:
//     external BEARISH + internal BULLISH = "BULLISH PULLBACK WITHIN BEARISH TREND", never a full reversal.
//  2. WHERE MAY I LOOK FOR A TRADE?  Location timeframe (default 15M = 3 x the chart candle): premium / discount of the chosen range (equilibrium 0.5) + valid supply / demand
//     zones (origin of an impulsive move that broke structure). Buys need discount + demand, sells need premium + supply. Entering a zone alone is never a signal.
//  3. HAS THE MARKET SHIFTED?  Chart (execution) timeframe: after price reaches an approved location the tool waits for the last relevant internal lower high (buy) / higher low (sell)
//     to break with a candle CLOSE beyond it = market shift confirmation.
//  4. WHERE IS IT INVALID / WHERE DO I TAKE PROFIT / WHEN DO I STAY OUT?  stop beyond the zone / swing + buffer, configurable R targets or nearest level, risk based position size,
//     and a filter list (unclear structure, no zone, outside location, no 5M shift, volatility, spread, reward-to-risk, missing data).
// The higher timeframes are built from the candles loaded on the chart (no extra feed), so open the tool on the 5M chart for the 1H / 15M / 5M method.
// Only the first two stages of the method are confirmed by the source transcript. Every other rule (entry, stop, targets, filters) is a CONFIGURABLE DEFAULT, not a claim about the original trader.
try{
const MS_POS=['Top Left','Top Right','Bottom Left','Bottom Right'];
const MS_TFS={'Auto':0,'5 min':300,'15 min':900,'30 min':1800,'1 hour':3600,'2 hours':7200,'4 hours':14400,'Daily':86400};
const MS_DIRF=['Off (location + shift only)','External trend','Internal order flow','Either (external or internal agrees)'];
const MS_RS=['External swing (direction TF)','Internal swing (direction TF)','Location TF swing'];
const MS_ZB=['Full candle range','Candle body','Consolidation range'];
const MS_ZS=['Fresh only','Fresh + Tested','Fresh + Tested + Mitigated'];
const MS_EM=['Market (confirmed close)','Retest of the broken level','Manual (levels + alert only)'];
const MS_SLB=['Zone or swing, whichever is farther','Zone only','Swing extreme only'];
const MS_TPM=['Fixed R multiples','Nearest level as TP1 (swing / liquidity / opposing zone)'];
const MS_CT=['Black & grey','White & black','Off (app colours)'];
const MS_DASH=['Full','Compact','Off'];
const MS_DEF={dirTf:'Auto',locTf:'Auto',extLen:5,intLen:2,locLen:3,exLen:2,rangeSrc:MS_RS[0],
  zoneBounds:MS_ZB[0],impMult:1.5,maxZoneAtr:4,zoneStates:MS_ZS[1],apprAtr:0.5,maxZones:12,
  dirFilter:MS_DIRF[3],armWin:30,reqLH:true,reqSweep:false,cool:10,sigValid:20,
  entryMode:MS_EM[0],rtWin:20,slBasis:MS_SLB[0],slBuf:0.15,risk:1,balance:10000,contract:1,
  tpMode:MS_TPM[0],tp1:1,tp2:2,tp3:3,p1:50,p2:30,be:true,minRR:1,maxHold:300,
  volMax:2.5,spreadMax:0.25,spread:0,slip:0,comm:0,
  candleTheme:MS_CT[0],showFib:true,showZones:true,showInval:true,showExt:true,showInt:true,showExec:true,showLbl:true,showLiq:true,showSig:false,showLevels:true,lvKeep:2,ext:40,maxStruct:30,
  dash:MS_DASH[0],dashPos:MS_POS[0],showStats:true,statsPos:MS_POS[2],
  cBuy:'#3fb950',cSell:'#e5121a',cExt:'#ffffff',cInt:'#9aa0ad',cLvl:'#f0b90b',alSig:true,alTP:true,alSound:false};
const msClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function msA(hex,a){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
function msFx(v){ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return v.toFixed(a>=1000?2:a>=10?3:a>=1?4:6); }
function msTfName(s){ if(!s) return '-'; if(s%86400===0) return (s/86400)+'D'; if(s%3600===0) return (s/3600)+'H'; if(s%60===0) return (s/60)+'M'; return s+'s'; }
function msIv(c,n){ const a=[]; for(let i=Math.max(1,n-200);i<n;i++){ const d=c[i].time-c[i-1].time; if(d>0) a.push(d); } if(!a.length) return 60; a.sort((x,y)=>x-y); return a[a.length>>1]; }
function msAtr(b,n,L){ const o=new Float64Array(n).fill(NaN); let r=NaN,s=0; for(let i=0;i<n;i++){ const tr=i?Math.max(b[i].high-b[i].low,Math.abs(b[i].high-b[i-1].close),Math.abs(b[i].low-b[i-1].close)):b[i].high-b[i].low;
    if(i<L){ s+=tr; if(i===L-1){ r=s/L; o[i]=r; } } else { r=(r*(L-1)+tr)/L; o[i]=r; } } return o; }
// fold the chart candles into higher-timeframe candles (time buckets); i0/i1 = first/last chart candle, hiI/loI = chart candle holding the high / low
function msFold(c,n,sec,iv){ const bars=[], idx=new Int32Array(n);
  for(let i=0;i<n;i++){ const k=Math.floor(c[i].time/sec); let b=bars[bars.length-1];
    if(!b||b.k!==k){ b={k,time:k*sec,open:c[i].open,high:c[i].high,low:c[i].low,close:c[i].close,i0:i,i1:i,hiI:i,loI:i}; bars.push(b); }
    else { if(c[i].high>b.high){ b.high=c[i].high; b.hiI=i; } if(c[i].low<b.low){ b.low=c[i].low; b.loI=i; } b.close=c[i].close; b.i1=i; }
    idx[i]=bars.length-1; }
  let nb=bars.length; if(nb&&(c[n-1].time+iv)<(bars[nb-1].k+1)*sec-1) nb--;   // last bucket still forming -> not closed, never used
  return {bars,idx,nb}; }
// market structure engine. Pivot = candle with `len` candles on each side (confirmed `len` candles later). Pivots alternate H / L.
// A break needs a candle CLOSE beyond the active swing point (a wick alone never counts). A break against the running trend is a SHIFT (MSS).
function msStruct(b,N,len){ len=Math.max(1,Math.round(+len)||3);
  const S={all:[],live:[],brk:[],tr:new Int8Array(N),rH:new Float64Array(N).fill(NaN),rL:new Float64Array(N).fill(NaN),rU:new Int8Array(N),N,len};
  let actH=null,actL=null,trend=0;
  const add=(t,k,p,n)=>{ const lv=S.live, last=lv[lv.length-1];
    if(last&&last.t===t){ if(t==='H'?p<=last.p:p>=last.p) return; last.sup=n; lv.pop(); }
    let prev=null; for(let q=lv.length-1;q>=0;q--) if(lv[q].t===t){ prev=lv[q]; break; }
    const o={t,i:k,p,conf:n,sup:null,lb:prev?(t==='H'?(p>prev.p?'HH':'LH'):(p>prev.p?'HL':'LL')):t};
    lv.push(o); S.all.push(o); if(t==='H') actH={p,i:k,broken:false}; else actL={p,i:k,broken:false}; };
  const lastOf=t=>{ for(let q=S.live.length-1;q>=0;q--) if(S.live[q].t===t) return S.live[q]; return null; };
  for(let n=0;n<N;n++){ const k=n-len;
    if(k>=len){ let hi=true,lo=true; for(let j=1;j<=len;j++){ if(!(b[k].high>b[k-j].high&&b[k].high>=b[k+j].high)) hi=false; if(!(b[k].low<b[k-j].low&&b[k].low<=b[k+j].low)) lo=false; if(!hi&&!lo) break; }
      if(hi) add('H',k,b[k].high,n); if(lo) add('L',k,b[k].low,n); }
    const cl=b[n].close;
    if(actH&&!actH.broken&&cl>actH.p){ actH.broken=true; const lw=lastOf('L'); S.brk.push({dir:1,sw:actH.i,to:n,p:actH.p,shift:trend===-1,low:lw?{i:lw.i,p:lw.p}:null}); trend=1; }
    else if(actL&&!actL.broken&&cl<actL.p){ actL.broken=true; const hw=lastOf('H'); S.brk.push({dir:-1,sw:actL.i,to:n,p:actL.p,shift:trend===1,high:hw?{i:hw.i,p:hw.p}:null}); trend=-1; }
    S.tr[n]=trend; const lv=S.live; if(lv.length>=2){ const a=lv[lv.length-1], q=lv[lv.length-2]; S.rH[n]=Math.max(a.p,q.p); S.rL[n]=Math.min(a.p,q.p); S.rU[n]=a.t==='H'?1:-1; } }
  return S; }
function msLastPiv(S,t,before,n){ for(let q=S.all.length-1;q>=0;q--){ const p=S.all[q]; if(p.t===t&&p.i<before&&p.conf<=n&&(p.sup==null||p.sup>n)) return p; } return null; }
// supply / demand: origin of an impulsive move that broke structure on the location timeframe
function msZones(S,bars,aL,P,c,nUse,maxZ){ const Z=[], mode=P.zoneBounds;
  S.brk.forEach(k=>{ const d=k.dir, to=k.to; if(!(aL[to]>0)) return;
    let o=-1,best=d>0?Infinity:-Infinity; for(let q=Math.max(0,k.sw);q<to;q++){ const v=d>0?bars[q].low:bars[q].high; if(d>0?v<best:v>best){ best=v; o=q; } } if(o<0) return;
    let imp=0; for(let q=o;q<=to;q++) imp=Math.max(imp,d>0?bars[q].high-bars[o].low:bars[o].high-bars[q].low);
    if(imp<(+P.impMult||0)*aL[to]) return;
    let top,bot,s0=o;
    if(mode===MS_ZB[1]){ top=Math.max(bars[o].open,bars[o].close); bot=Math.min(bars[o].open,bars[o].close); }
    else if(mode===MS_ZB[2]){ let a=o,e=o; const lim=0.8*aL[to]; for(let g=0;g<5&&a>0&&(bars[a-1].high-bars[a-1].low)<=lim;g++) a--; for(let g=0;g<5&&e+1<to&&(bars[e+1].high-bars[e+1].low)<=lim;g++) e++;
      top=-Infinity; bot=Infinity; for(let q=a;q<=e;q++){ top=Math.max(top,bars[q].high); bot=Math.min(bot,bars[q].low); } s0=a; }
    else { top=bars[o].high; bot=bars[o].low; }
    if(!(top>bot)||(top-bot)>(+P.maxZoneAtr||99)*aL[to]) return;
    const ov=Z.some(z=>z.d===d&&Math.min(z.top,top)-Math.max(z.bot,bot)>0.5*Math.min(z.top-z.bot,top-bot)); if(ov) return;
    Z.push({d,top,bot,s0:bars[s0].i0,start:bars[to].i1+1,imp:imp/aL[to],tI:-1,mI:-1,xI:-1}); });
  const out=Z.slice(-60);
  out.forEach(z=>{ for(let i=z.start;i<nUse;i++){ const b=c[i];
      if(z.d>0){ if(b.close<z.bot){ z.xI=i; break; } if(z.mI<0&&b.low<=z.bot) z.mI=i; if(z.tI<0&&b.low<=z.top) z.tI=i; }
      else { if(b.close>z.top){ z.xI=i; break; } if(z.mI<0&&b.high>=z.top) z.mI=i; if(z.tI<0&&b.high>=z.bot) z.tI=i; } } });
  return out; }
// zone state at candle i: 0 fresh, 1 tested, 2 mitigated (wicked through the far side, closed back), 3 invalidated (closed beyond the far side)
const msSt=(z,i)=>(z.xI>=0&&i>=z.xI)?3:(z.mI>=0&&i>=z.mI)?2:(z.tI>=0&&i>=z.tI)?1:0;
const MS_STN=['fresh','tested','mitigated','invalidated'];
function msPlan(P,d,entry,slRaw,atr,levels){ const buf=(+P.slBuf||0)*atr, sl=d>0?slRaw-buf:slRaw+buf, risk=(entry-sl)*d; if(!(risk>0)||!isFinite(risk)) return null;
  const mult=[+P.tp1||1,+P.tp2||2,+P.tp3||3]; let t=mult.map(k=>entry+d*risk*k), near=null;
  if(P.tpMode!==MS_TPM[0]&&levels){ levels.forEach(L=>{ const r=(L-entry)*d/risk; if(r>=0.5&&(near===null||r<(near-entry)*d/risk)) near=L; }); if(near!==null) t[0]=near; }
  t.sort((a,b)=>(a-b)*d);
  const rp=msClamp(+P.risk||1,0.25,2), cash=(+P.balance||0)*rp/100, units=cash/risk;
  return {d,entry,sl,tp:t,risk,rr:t.map(x=>(x-entry)*d/risk),units,lots:units/(+P.contract||1),cash,rp,nearest:near!==null}; }
// trade simulation (backtest): stop is checked before targets inside one candle (the cautious way); partial profits, optional break-even after TP1
function msSim(c,nUse,s,P){ const d=s.d; let plan=s.plan, eI=s.n, start=s.n+1;
  if(s.mode==='retest'){ const lvl=s.level, pr=msPlan(P,d,lvl,s.slRaw,s.atr,s.levels); if(!pr||pr.rr[0]<(+P.minRR||0)) return {status:'cancel',why:'retest plan fails the minimum reward-to-risk'};
    plan=pr; let f=-1; const end=Math.min(nUse-1,s.n+(+P.rtWin||20));
    for(let m=s.n+1;m<=end;m++){ const b=c[m]; if(d>0?b.low<=lvl:b.high>=lvl){ f=m; break; } if(d>0?b.high>=plan.tp[0]:b.low<=plan.tp[0]) return {status:'cancel',why:'target reached before a retest'}; }
    if(f<0){ if(end>=nUse-1&&s.n+(+P.rtWin||20)>=nUse-1) return {status:'pending',plan}; return {status:'cancel',why:'no retest within '+(+P.rtWin||20)+' candles'}; }
    eI=f; start=f+1; const b=c[f];
    if(d>0?b.low<=plan.sl:b.high>=plan.sl){ const cost0=((+P.spread||0)+2*(+P.slip||0)+2*(+P.comm||0)/100*plan.entry)/plan.risk; return {d,plan,entry:plan.entry,entryI:f,exitI:f,R:-1-cost0,status:'closed',reason:'SL',hit:[false,false,false],hitI:[-1,-1,-1],costR:cost0,entryT:c[f].time,bars:0}; } }
  const entry=plan.entry, risk=plan.risk; let p1=msClamp(+P.p1||0,0,100)/100, p2=msClamp(+P.p2||0,0,100)/100, p3=Math.max(0,1-p1-p2); const sm=(p1+p2+p3)||1; const parts=[p1/sm,p2/sm,p3/sm];
  let rem=1,R=0,slc=plan.sl,exitI=-1,reason='',status='open'; const hit=[false,false,false], hitI=[-1,-1,-1], last=Math.min(nUse-1,eI+(+P.maxHold||300));
  for(let k=start;k<=last&&status==='open';k++){ const b=c[k];
    if(d>0?b.low<=slc:b.high>=slc){ R+=rem*((slc-entry)*d/risk); rem=0; exitI=k; reason=(slc===entry&&hit[0])?'BE':'SL'; status='closed'; break; }
    for(let t=0;t<3;t++){ if(!hit[t]&&rem>1e-9&&(d>0?b.high>=plan.tp[t]:b.low<=plan.tp[t])){ hit[t]=true; hitI[t]=k; const f2=t===2?rem:Math.min(rem,parts[t]); R+=f2*plan.rr[t]; rem-=f2; if(t===0&&P.be) slc=entry;
        if(rem<=1e-9){ rem=0; exitI=k; reason='TP'+(t+1); status='closed'; break; } } } }
  if(status==='open'&&last<nUse-1){ R+=rem*((c[last].close-entry)*d/risk); exitI=last; reason='TIME'; status='closed'; rem=0; }
  const cost=((+P.spread||0)+2*(+P.slip||0)+2*(+P.comm||0)/100*entry)/risk;
  let Rf=R-cost, unreal=null; if(status==='open') unreal=Rf+rem*((c[nUse-1].close-entry)*d/risk);
  return {d,plan,entry,entryI:eI,exitI,R:Rf,unreal,status,reason,hit,hitI,costR:cost,entryT:c[eI].time,bars:exitI>=0?exitI-eI:nUse-1-eI}; }
function msSess(t){ const h=new Date(t*1000).getUTCHours(); return h<7?'Asia':h<12?'London':h<21?'New York':'Late'; }
function msStats(trs,iv){ const cl=trs.filter(t=>t.status==='closed'), S={n:cl.length,w:0,l:0,gp:0,gl:0,sumR:0,dd:0,hold:0,ses:{},wins:0,losses:0};
  let eq=0,peak=0; cl.forEach(t=>{ const R=t.R; S.sumR+=R; eq+=R; if(eq>peak) peak=eq; S.dd=Math.max(S.dd,peak-eq); if(R>0){ S.w++; S.gp+=R; } else { S.l++; S.gl+=-R; } S.hold+=t.bars*iv;
    const k=msSess(t.entryT), q=S.ses[k]||(S.ses[k]={n:0,w:0,R:0}); q.n++; if(R>0) q.w++; q.R+=R; });
  S.wr=S.n?S.w/S.n*100:NaN; S.avgR=S.n?S.sumR/S.n:NaN; S.aw=S.w?S.gp/S.w:NaN; S.al=S.l?S.gl/S.l:NaN; S.rr=(S.w&&S.l)?S.aw/S.al:NaN; S.pf=S.gl>0?S.gp/S.gl:(S.gp>0?Infinity:NaN); S.avgHold=S.n?S.hold/S.n:NaN; return S; }
function msCompute(c,P,forming){
  const N=c.length, nUse=forming?N-1:N, D={N,nUse,ok:false,msg:'',sigs:[],trades:[],events:[],rejs:[],notes:[],zones:[]};
  if(nUse<80){ D.msg='MSS needs at least 80 closed candles (loaded '+nUse+')'; return D; }
  const iv=msIv(c,nUse); D.iv=iv;
  let sD=MS_TFS[P.dirTf]||0, sL=MS_TFS[P.locTf]||0; if(!sL) sL=iv*3; if(!sD) sD=iv*12;
  if(sL<iv*1.5){ sL=iv*3; D.notes.push('Location TF must be higher than the chart candle: using chart x3'); }
  if(sD<sL*1.5){ sD=sL*4; D.notes.push('Direction TF must be higher than the location TF: using location x4'); }
  D.sD=sD; D.sL=sL;
  const F1=msFold(c,nUse,sD,iv), F2=msFold(c,nUse,sL,iv);
  const eL=Math.max(1,Math.round(+P.extLen)||5), iL=Math.max(1,Math.round(+P.intLen)||2), lL=Math.max(1,Math.round(+P.locLen)||3), xL=Math.max(1,Math.round(+P.exLen)||2);
  if(F1.nb<2*eL+8){ D.msg='Direction TF ('+msTfName(sD)+') has only '+F1.nb+' closed candles from the loaded data, needs '+(2*eL+8)+'. Load more history or lower the swing length'; return D; }
  if(F2.nb<2*lL+8){ D.msg='Location TF ('+msTfName(sL)+') has only '+F2.nb+' closed candles from the loaded data, needs '+(2*lL+8); return D; }
  const SDe=msStruct(F1.bars,F1.nb,eL), SDi=msStruct(F1.bars,F1.nb,iL), SLs=msStruct(F2.bars,F2.nb,lL), SE=msStruct(c,nUse,xL);
  const aE=msAtr(c,nUse,14), aL=msAtr(F2.bars,F2.nb,14), cs=new Float64Array(nUse+1); for(let i=0;i<nUse;i++) cs[i+1]=cs[i]+(aE[i]===aE[i]?aE[i]:0);
  const zones=msZones(SLs,F2.bars,aL,P,c,nUse); D.zones=zones; D.S={SDe,SDi,SLs,SE,F1,F2};
  const maxSt=P.zoneStates===MS_ZS[0]?0:P.zoneStates===MS_ZS[2]?2:1, appr=Math.max(0,+P.apprAtr||0);
  const trAt=(S,idx,i)=>{ const j=idx[i]-1; return (j<0||j>=S.N)?0:S.tr[j]; };
  const rS=P.rangeSrc===MS_RS[1]?SDi:P.rangeSrc===MS_RS[2]?SLs:SDe, rIdx=P.rangeSrc===MS_RS[2]?F2.idx:F1.idx, rBars=P.rangeSrc===MS_RS[2]?F2.bars:F1.bars; D.rS=rS;
  const rngAt=i=>{ const j=rIdx[i]-1; if(j<0||j>=rS.N) return null; const hi=rS.rH[j], lo=rS.rL[j]; return (hi===hi&&lo===lo&&hi>lo)?[hi,lo,rS.rU[j]]:null; };
  const dirOK=(d,i)=>{ const e=trAt(SDe,F1.idx,i), n=trAt(SDi,F1.idx,i), f=P.dirFilter; return f===MS_DIRF[0]?true:f===MS_DIRF[1]?e===d:f===MS_DIRF[2]?n===d:(e===d||n===d); };
  const Tn=v=>v>0?'BULLISH':v<0?'BEARISH':'UNCLEAR';
  const levelsFor=(d,i,entry)=>{ const L=[], j=F1.idx[i]-1, t=d>0?'H':'L';
    SDe.all.forEach(p=>{ if(p.t===t&&p.conf<=j&&(p.sup==null||p.sup>j)&&(p.p-entry)*d>0) L.push(p.p); });
    SE.all.forEach(p=>{ if(p.t===t&&p.conf<=i&&(p.sup==null||p.sup>i)&&(p.p-entry)*d>0) L.push(p.p); });
    zones.forEach(z=>{ if(z.d===-d&&z.start<=i&&msSt(z,i)<3){ const e=d>0?z.bot:z.top; if((e-entry)*d>0) L.push(e); } }); return L; };
  const arms=[null,null], cool=[0,0]; let busy=-1;
  for(let i=Math.max(40,2*xL+3);i<nUse;i++){ const b=c[i], atr=aE[i]; if(!(atr>0)) continue;
    for(let sd=0;sd<2;sd++){ const d=sd===0?1:-1; let a=arms[sd];
      if(!a){ if(i<cool[sd]) continue; if(!dirOK(d,i)) continue; const rg=rngAt(i); if(!rg) continue; const eq=(rg[0]+rg[1])/2; if(!(d>0?b.low<eq:b.high>eq)) continue;
        let bz=null; zones.forEach(z=>{ if(z.d!==d||z.start>i) return; const st=msSt(z,i-1); if(st>maxSt) return; const near=d>0?(b.low<=z.top+appr*atr&&b.close>=z.bot):(b.high>=z.bot-appr*atr&&b.close<=z.top); if(near&&(!bz||z.start>bz.start)) bz=z; });
        if(!bz) continue; a=arms[sd]={z:bz,start:i,last:i,ext:d>0?b.low:b.high,extI:i,st:msSt(bz,i-1),rg,pct0:((d>0?b.low:b.high)-rg[1])/(rg[0]-rg[1])*100}; }
      else { if(d>0?b.low<a.ext:b.high>a.ext){ a.ext=d>0?b.low:b.high; a.extI=i; }
        if(d>0?b.low<=a.z.top+appr*atr:b.high>=a.z.bot-appr*atr) a.last=i;
        if(i-a.last>(+P.armWin||30)||(d>0?b.close<a.z.bot:b.close>a.z.top)){ arms[sd]=null; continue; } }
      const piv=msLastPiv(SE,d>0?'H':'L',a.extI,i); if(!piv) continue; if(P.reqLH&&piv.lb!==(d>0?'LH':'HL')) continue;
      if(!(d>0?b.close>piv.p:b.close<piv.p)) continue;
      const pv2=msLastPiv(SE,d>0?'L':'H',a.extI,i), swept=!!(pv2&&(d>0?a.ext<pv2.p:a.ext>pv2.p)); if(P.reqSweep&&!swept) continue;
      arms[sd]=null; cool[sd]=i+Math.max(1,Math.round(+P.cool)||1); if(i<=busy) continue;
      const zEdge=d>0?a.z.bot:a.z.top, slRaw=P.slBasis===MS_SLB[1]?zEdge:P.slBasis===MS_SLB[2]?a.ext:(d>0?Math.min(zEdge,a.ext):Math.max(zEdge,a.ext));
      const mode=P.entryMode===MS_EM[1]?'retest':P.entryMode===MS_EM[2]?'manual':'market', entry=mode==='retest'?piv.p:b.close, lv=levelsFor(d,i,entry), plan=msPlan(P,d,entry,slRaw,atr,lv);
      let why=''; const avg=i>=120?(cs[i]-cs[i-100])/100:NaN;
      if(!plan) why='stop-loss distance is not valid';
      else if(avg>0&&atr>(+P.volMax||99)*avg) why='excessive volatility (ATR '+(atr/avg).toFixed(1)+'x its 100-candle average)';
      else if((+P.spread||0)>(+P.spreadMax||99)*plan.risk) why='spread is '+Math.round((+P.spread||0)/plan.risk*100)+'% of the stop distance';
      else if(plan.rr[0]<(+P.minRR||0)) why='reward-to-risk to TP1 is only '+plan.rr[0].toFixed(2);
      if(why){ D.rejs.push({i,d,why,time:b.time}); if(D.rejs.length>5) D.rejs.shift(); continue; }
      const rg=a.rg, pct=a.pct0;
      const sig={d,n:i,time:b.time,level:piv.p,zone:a.z,zst:a.st,swept,ext:a.ext,mode,plan,slRaw,atr,levels:lv,pct,rg,extT:trAt(SDe,F1.idx,i),intT:trAt(SDi,F1.idx,i)};
      sig.reasons=['Direction: external '+Tn(sig.extT)+', internal '+Tn(sig.intT),
        'Location: price entered '+(d>0?'DISCOUNT':'PREMIUM')+' ('+pct.toFixed(0)+'% of the range) + '+MS_STN[a.st]+' '+(d>0?'demand':'supply')+' zone '+msFx(a.z.bot)+' - '+msFx(a.z.top),
        'Shift: '+msTfName(iv)+' candle closed '+(d>0?'above':'below')+' internal '+(d>0?'lower high ':'higher low ')+msFx(piv.p)+(swept?' after a liquidity sweep':''),
        'Invalidated beyond '+msFx(plan.sl)];
      const tr=msSim(c,nUse,sig,P); sig.trade=tr; if(tr.status==='cancel'){ D.rejs.push({i,d,why:tr.why,time:b.time}); if(D.rejs.length>5) D.rejs.shift(); continue; }
      D.sigs.push(sig); if(tr.status!=='pending'){ D.trades.push(tr); tr.sig=sig; busy=tr.status==='open'?Infinity:tr.exitI; } else busy=nUse; } }
  D.sigs.forEach(s=>{ D.events.push({type:s.d>0?'buy':'sell',dir:s.d,time:s.time,price:s.plan.entry});
    const t=s.trade; if(t&&t.status!=='pending'&&t.status!=='cancel'){ t.hitI.forEach((hi,k)=>{ if(hi>=0) D.events.push({type:'tp',dir:s.d,k:k+1,time:c[hi].time,price:t.plan.tp[k]}); }); if(t.status==='closed'&&(t.reason==='SL'||t.reason==='BE')) D.events.push({type:'sl',dir:s.d,reason:t.reason,time:c[t.exitI].time,price:t.plan.sl}); } });
  D.events.sort((x,y)=>x.time-y.time);
  D.stats=msStats(D.trades,iv);
  // data reliability
  let gaps=0,cnt=0; for(let i=Math.max(1,nUse-500);i<nUse;i++){ const dt=c[i].time-c[i-1].time; cnt++; if(dt>1.5*iv&&dt<2*86400) gaps++; } D.gaps=gaps; D.gapPct=cnt?gaps/cnt*100:0;
  // ---- live state (last closed candle, price = last candle incl. the forming one) ----
  const L0=nUse-1, price=c[N-1].close, b0=c[L0], atr0=aE[L0], avg0=L0>=120?(cs[L0]-cs[L0-100])/100:NaN, extT=trAt(SDe,F1.idx,L0), intT=trAt(SDi,F1.idx,L0), rg0=rngAt(L0);
  const lv={price,extT,intT,warns:[],reasons:[],atr:atr0};
  lv.cond=extT===0?'UNCLEAR STRUCTURE':(extT===intT?Tn(extT)+' TREND (internal agrees)':(intT===0?Tn(extT)+' TREND (internal unclear)':Tn(intT)+' PULLBACK WITHIN '+Tn(extT)+' TREND'));
  lv.condCol=extT===0?'#f0b90b':(extT===intT?(extT>0?P.cBuy:P.cSell):'#f0b90b');
  if(rg0){ const eq=(rg0[0]+rg0[1])/2; lv.hi=rg0[0]; lv.lo=rg0[1]; lv.up=rg0[2]; lv.eq=eq; lv.pct=(price-rg0[1])/(rg0[0]-rg0[1])*100; lv.zone=price>eq?'PREMIUM':'DISCOUNT'; }
  const near=d=>{ let best=null; zones.forEach(z=>{ if(z.d!==d||z.xI>=0) return; const dist=d>0?Math.max(0,price-z.top):Math.max(0,z.bot-price); if(!best||dist<best.dist) best={z,dist,st:msSt(z,L0)}; }); return best; };
  lv.zD=near(1); lv.zS=near(-1);
  lv.arm=[arms[0]?{d:1,a:arms[0]}:null,arms[1]?{d:-1,a:arms[1]}:null].filter(Boolean).map(o=>{ const p=msLastPiv(SE,o.d>0?'H':'L',o.a.extI,L0); return {d:o.d,z:o.a.z,level:p?p.p:NaN,lh:p?p.lb:'',ext:o.a.ext}; });
  if(extT===0) lv.warns.push('Unclear market structure: no confirmed external break yet on '+msTfName(sD));
  if(avg0>0&&atr0>(+P.volMax||99)*avg0) lv.warns.push('Excessive volatility: ATR '+(atr0/avg0).toFixed(1)+'x its average');
  if((+P.spread||0)>0&&atr0>0&&(+P.spread||0)>(+P.spreadMax||99)*atr0) lv.warns.push('Wide spread compared with the candle range');
  if(D.gapPct>5) lv.warns.push('Missing / unreliable data: '+gaps+' gaps in the last '+cnt+' candles');
  if(!zones.some(z=>z.xI<0)) lv.warns.push('No valid supply / demand zone on '+msTfName(sL));
  D.notes.forEach(n=>lv.warns.push(n));
  if(D.rejs.length){ const r=D.rejs[D.rejs.length-1]; if(L0-r.i<=(+P.sigValid||20)) lv.warns.push('Setup rejected: '+r.why); }
  const ls=D.sigs[D.sigs.length-1], tr=ls&&ls.trade, active=ls&&tr&&tr.status!=='cancel'&&tr.status!=='closed'&&(tr.status==='open'||(L0-ls.n)<=(+P.sigValid||20));
  const hard=lv.warns.filter(w=>/^(Unclear|Excessive|Missing)/.test(w));
  if(active){ lv.state=ls.d>0?'BUY SETUP':'SELL SETUP'; lv.reasons=ls.reasons.slice(0,3); lv.sig=ls; if(ls.mode==='manual') lv.reasons.push('Manual mode: confirm the entry yourself'); if(ls.mode==='retest'&&tr.status==='pending') lv.reasons.push('Waiting for a retest of '+msFx(ls.level)); }
  else if(hard.length){ lv.state='NO TRADE'; lv.reasons=hard.slice(0,3); }
  else { lv.state='WAIT';
    if(lv.zone) lv.reasons.push('Price in '+lv.zone+' ('+(lv.pct<0?'below the range':lv.pct>100?'above the range':lv.pct.toFixed(0)+'% of the range')+')'+(lv.zone==='PREMIUM'?': only sells qualify':': only buys qualify')); else lv.reasons.push('No valid price range yet');
    const want=lv.zone==='PREMIUM'?lv.zS:lv.zone==='DISCOUNT'?lv.zD:null;
    if(want) lv.reasons.push(want.dist<=appr*atr0?('Price at '+MS_STN[want.st]+' '+(want.z.d>0?'demand':'supply')+' zone, waiting for the shift'):('Next '+(want.z.d>0?'demand':'supply')+' zone is '+(want.dist/atr0).toFixed(1)+' ATR away')); else if(lv.zone) lv.reasons.push('No valid '+(lv.zone==='PREMIUM'?'supply':'demand')+' zone for this side');
    lv.arm.forEach(o=>{ lv.reasons.push('Armed '+(o.d>0?'BUY':'SELL')+': waiting for a close '+(o.d>0?'above ':'below ')+(isFinite(o.level)?msFx(o.level):'the internal '+(o.d>0?'lower high':'higher low'))); });
    if(lv.zone&&!lv.arm.length&&P.dirFilter!==MS_DIRF[0]){ const d=lv.zone==='PREMIUM'?-1:1; if(!dirOK(d,L0)) lv.reasons.push('Direction filter blocks '+(d>0?'buys':'sells')+' (external '+Tn(extT).toLowerCase()+', internal '+Tn(intT).toLowerCase()+')'); }
    if(!lv.arm.length) lv.reasons.push('No confirmed '+msTfName(iv)+' market shift'); }
  D.live=lv;
  // range drawn as fibonacci premium / discount
  const rl=rS.live; if(rl.length>=2){ const a=rl[rl.length-1], q=rl[rl.length-2], px=p=>p.t==='H'?rBars[p.i].hiI:rBars[p.i].loI; D.fib={hi:Math.max(a.p,q.p),lo:Math.min(a.p,q.p),up:a.t==='H',i0:px(q),i1:px(a)}; }
  // liquidity: internal swing points not yet taken
  D.liq=[]; [SDi,SE].forEach((S,si)=>{ const ex=si===0?(p=>p.t==='H'?F1.bars[p.i].hiI:F1.bars[p.i].loI):(p=>p.i); S.all.filter(p=>p.sup==null).slice(-40).forEach(p=>{ const x=ex(p); let taken=false; for(let k=x+1;k<nUse;k++){ if(p.t==='H'?c[k].high>p.p:c[k].low<p.p){ taken=true; break; } } if(!taken) D.liq.push({t:p.t,p:p.p,x}); }); });
  D.liq=D.liq.slice(-12);
  D.ok=true; return D; }
let msMem=null;
function msGet(c,p){ const N=c.length, iv=N>1?c[N-1].time-c[N-2].time:0, forming=N>0&&iv>0&&(c[N-1].time+iv)*1000>Date.now();
  const key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+forming+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(msMem&&msMem.k===key) return msMem.D;
  let D; try{ D=msCompute(c,p,forming); }catch(e){ console.error('mss calc failed',e); D={N,ok:false,msg:'MSS calculation error: '+(e&&e.message),sigs:[],trades:[],events:[]}; }
  msMem={k:key,D}; try{ if(D.ok&&D.stats&&D.stats.n){ const k='rc_mss_stats', o=JSON.parse(localStorage.getItem(k)||'{}'); o[sym[0]+' '+tf[0]]={n:D.stats.n,wr:D.stats.wr,avgR:D.stats.avgR,pf:isFinite(D.stats.pf)?D.stats.pf:null,t:Date.now()}; localStorage.setItem(k,JSON.stringify(o)); } }catch(e){} return D; }
IND.mss={label:'Market Shift Scalping System (MSS)',title:'Market Shift Scalping System (MSS) \u00b7 who controls, where to look, has it shifted',cat:'Trend',nm:()=>'Market Shift Scalping System',p:Object.assign({},MS_DEF),cols:['#e5121a'],
  fields:[['dirTf','sel','Direction timeframe (market direction)',{opts:Object.keys(MS_TFS)}],['locTf','sel','Location timeframe (premium / discount, zones)',{opts:Object.keys(MS_TFS)}],
    ['extLen','num','External swing sensitivity (candles each side)',{min:1,max:30}],['intLen','num','Internal swing sensitivity (direction TF)',{min:1,max:15}],['locLen','num','Location TF swing sensitivity (zones)',{min:1,max:15}],['exLen','num','Entry TF internal swing sensitivity',{min:1,max:10}],
    ['rangeSrc','sel','Premium / discount range from',{opts:MS_RS}],
    ['zoneBounds','sel','Zone boundaries',{opts:MS_ZB}],['impMult','num','Zone: minimum impulse (x ATR), weaker zones are filtered',{min:0,max:10,step:0.1}],['maxZoneAtr','num','Zone: maximum height (x ATR)',{min:0.5,max:20,step:0.5}],
    ['zoneStates','sel','Zones allowed for a setup',{opts:MS_ZS}],['apprAtr','num','Approach distance to a zone (x ATR)',{min:0,max:5,step:0.1}],
    ['dirFilter','sel','Direction filter',{opts:MS_DIRF}],['armWin','num','Wait for the shift for N candles after the last zone touch',{min:3,max:300}],['reqLH','chk','Require a real lower high (buy) / higher low (sell) as the level'],['reqSweep','chk','Require a liquidity sweep before the shift'],['cool','num','Candles to wait after a setup on the same side',{min:1,max:300}],['sigValid','num','A setup stays active for N candles',{min:1,max:300}],
    ['entryMode','sel','Entry mode',{opts:MS_EM}],['rtWin','num','Retest entry: wait up to N candles',{min:1,max:300}],
    ['slBasis','sel','Stop-loss placement',{opts:MS_SLB}],['slBuf','num','Stop-loss buffer (x ATR)',{min:0,max:5,step:0.05}],
    ['risk','num','Risk per trade (%) 0.25 to 2',{min:0.25,max:2,step:0.25}],['balance','num','Account balance',{min:1,max:1e9,step:100}],['contract','num','Units per lot (position size in lots)',{min:0.0001,max:1e9,step:1}],
    ['tpMode','sel','Targets',{opts:MS_TPM}],['tp1','num','TP1 (R multiple)',{min:0.1,max:20,step:0.1}],['tp2','num','TP2 (R multiple)',{min:0.1,max:30,step:0.1}],['tp3','num','TP3 (R multiple)',{min:0.1,max:50,step:0.1}],
    ['p1','num','Partial close at TP1 (%)',{min:0,max:100,step:5}],['p2','num','Partial close at TP2 (%)',{min:0,max:100,step:5}],['be','chk','Move stop to break-even after TP1'],['minRR','num','Minimum reward-to-risk to TP1',{min:0,max:10,step:0.1}],['maxHold','num','Backtest: close a trade after N candles',{min:5,max:2000}],
    ['volMax','num','Block when ATR is above N x its average',{min:1,max:10,step:0.1}],['spreadMax','num','Block when spread is above this share of the stop distance',{min:0,max:2,step:0.05}],
    ['spread','num','Backtest: spread (price units)',{min:0,max:1e6,step:0.01}],['slip','num','Backtest: slippage per side (price units)',{min:0,max:1e6,step:0.01}],['comm','num','Backtest: commission per side (% of price)',{min:0,max:5,step:0.001}],
    ['candleTheme','sel','Candle theme',{opts:MS_CT}],['showFib','chk','Premium / discount fibonacci'],['showZones','chk','Supply / demand zones'],['showInval','chk','Show invalidated zones'],['maxZones','num','Zones drawn',{min:2,max:40}],
    ['showExt','chk','External structure (BOS, HH HL LH LL)'],['showInt','chk','Internal structure'],['showExec','chk','Entry-timeframe market shift (MSS)'],['showLbl','chk','Structure labels'],['maxStruct','num','Structure items drawn',{min:5,max:200}],['showLiq','chk','Liquidity levels'],
    ['showSig','chk','System BUY / SELL arrows (auto signals; strategy signals are separate)'],['showLevels','chk','Trade levels (entry / SL / TP1-TP3)'],['lvKeep','num','Setups whose levels stay on the chart',{min:1,max:10}],['ext','num','Level line length (candles)',{min:5,max:300}],
    ['dash','sel','Dashboard',{opts:MS_DASH}],['dashPos','sel','Dashboard position',{opts:MS_POS}],['showStats','chk','Backtest statistics panel'],['statsPos','sel','Statistics position',{opts:MS_POS}],
    ['cBuy','col','Buy / bullish / discount'],['cSell','col','Sell / bearish / premium'],['cExt','col','External structure text'],['cInt','col','Internal structure'],['cLvl','col','Level colour'],
    ['alSig','chk','Alert: BUY / SELL setup'],['alTP','chk','Alert: target / stop hit'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},MS_DEF,p), D=msGet(c,q), mk=[];
    if(D.ok&&q.showSig) D.sigs.slice(-60).forEach(s=>{ if(s.trade&&s.trade.status==='cancel') return; mk.push({time:s.time,position:s.d>0?'belowBar':'aboveBar',color:s.d>0?q.cBuy:q.cSell,shape:s.d>0?'arrowUp':'arrowDown',text:s.d>0?'BUY':'SELL',size:.9,keep:true}); });
    return {mk,boxes:[{type:'mssview',pts:[],o:q,D}],labels:[],events:D.ok?D.events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='mssview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, n0=candles.length; if(!D||n0<5) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    const ln=(x1,y1,x2,y2,col,w,dash)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke(); cx.setLineDash([]); };
    const tx=(t,x,y,col,fs,al,bold)=>{ cx.font=(bold?'bold ':'')+fs+'px system-ui'; cx.fillStyle=col; cx.textAlign=al||'left'; cx.fillText(t,x,y); };
    const pill=(t,x,y,bg)=>{ cx.font='bold 9px system-ui'; const w=cx.measureText(t).width+8; let lx=x+3; if(lx+w>W-2) lx=Math.max(2,x-w-3); cx.fillStyle=bg; cx.beginPath(); if(cx.roundRect) cx.roundRect(lx,y-6,w,12,3); else cx.rect(lx,y-6,w,12); cx.fill(); cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText(t,lx+4,y+0.5); };
    const sx=(()=>{ const xa=X(n0-1), xb=X(n0-2); return (xa!=null&&xb!=null)?Math.abs(xa-xb):6; })();
    // candle theme (drawn over the normal candles)
    if(p.candleTheme!==MS_CT[2]){ const wb=p.candleTheme===MS_CT[1], bw=Math.max(1,Math.min(sx*.72,40)), up=wb?'#ffffff':'#8a8f9c', dn=wb?'#000000':'#14161c', ub=wb?'#9aa0ad':'#cfd3dc', db=wb?'#9aa0ad':'#6b7080';
      for(let i=0;i<n0;i++){ const x=X(i); if(x==null||x<-bw-4||x>W+bw+4) continue; const k=candles[i], yo=Y(k.open), yc=Y(k.close), yh=Y(k.high), yl=Y(k.low); if(yo==null||yc==null||yh==null||yl==null) continue;
        const bull=k.close>=k.open, col=bull?ub:db; ln(x,yh,x,yl,col,1); const top=Math.min(yo,yc), hh=Math.max(1,Math.abs(yc-yo)); cx.fillStyle=bull?up:dn; cx.fillRect(x-bw/2,top,bw,hh); if(bw>=3){ cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(x-bw/2+.5,top+.5,bw-1,Math.max(0,hh-1)); } } }
    if(!D.ok){ tx(D.msg||'MSS: no data',8,Hh-40,'#f0b90b',11,'left',true); cx.restore(); return; }
    const S=D.S, lv=D.live, nU=D.nUse;
    // 1) premium / discount fibonacci
    if(p.showFib&&D.fib){ const f=D.fib, rg=f.hi-f.lo, x0=Math.max(-4,X(f.i0)==null?0:X(f.i0)), yH=Y(f.hi), yL=Y(f.lo), yE=Y((f.hi+f.lo)/2);
      if(yH!=null&&yL!=null&&yE!=null){ cx.fillStyle=msA(p.cSell,.07); cx.fillRect(x0,Math.min(yH,yE),W-x0,Math.abs(yE-yH)); cx.fillStyle=msA(p.cBuy,.07); cx.fillRect(x0,Math.min(yE,yL),W-x0,Math.abs(yL-yE));
        [0,0.382,0.5,0.618,0.65,0.786,1].forEach(r=>{ const pr=f.up?f.hi-r*rg:f.lo+r*rg, y=Y(pr); if(y==null) return; ln(x0,y,W,y,r===0.5?'rgba(255,255,255,.75)':'rgba(190,195,208,.35)',r===0.5?1.2:1,r===0.5?[6,3]:[2,4]); tx((r===0.5?'0.5 EQ ':r.toFixed(3)+' ')+msFx(pr),W-4,y-6,r===0.5?'rgba(255,255,255,.9)':'rgba(190,195,208,.7)',9,'right'); });
        tx('PREMIUM',x0+4,Math.min(yH,yE)+9,msA(p.cSell,.9),9,'left',true); tx('DISCOUNT',x0+4,Math.max(yL,yE)-9,msA(p.cBuy,.9),9,'left',true); } }
    // 2) supply / demand zones
    if(p.showZones){ const fs=z=>z.xI>=0?3:z.mI>=0?2:z.tI>=0?1:0, val=D.zones.filter(z=>z.xI<0).slice(-Math.max(1,Math.round(+p.maxZones)||12)), inv=p.showInval?D.zones.filter(z=>z.xI>=0).slice(-3):[], AL=[.2,.15,.1,.05];
      inv.concat(val).forEach(z=>{ const st=fs(z), x0=X(z.s0), x1=z.xI>=0?X(z.xI):W-2, y1=Y(z.top), y2=Y(z.bot); if(x0==null||x1==null||y1==null||y2==null||x1<0||x0>W) return; const xs=Math.max(-4,x0), col=z.d>0?p.cBuy:p.cSell;
        cx.fillStyle=msA(col,AL[st]); cx.fillRect(xs,Math.min(y1,y2),Math.max(1,x1-xs),Math.max(1,Math.abs(y2-y1))); cx.strokeStyle=msA(col,st===3?.35:.8); cx.lineWidth=1; cx.setLineDash(st===3?[3,3]:[]); cx.strokeRect(xs+.5,Math.min(y1,y2)+.5,Math.max(1,x1-xs),Math.max(1,Math.abs(y2-y1))); cx.setLineDash([]);
        tx((z.d>0?'DEMAND':'SUPPLY')+' \u00b7 '+MS_STN[st],xs+4,Math.min(y1,y2)+8,msA(col,st===3?.5:.95),9,'left',true); }); }
    // 3) structure: external (direction TF), internal (direction TF), entry-TF shifts
    const pX=(bars,q)=>bars?(q.t==='H'?bars[q.i].hiI:bars[q.i].loI):q.i, mS=Math.max(5,Math.round(+p.maxStruct)||30);
    const brkDraw=(St,bars,ext,onlyShift)=>{ St.brk.filter(k=>!onlyShift||k.shift).slice(-mS).forEach(k=>{ const xs=X(bars?(k.dir>0?bars[k.sw].hiI:bars[k.sw].loI):k.sw), xe=X(bars?bars[k.to].i1:k.to), y=Y(k.p); if(xs==null||xe==null||y==null||xe<-20||xs>W+20) return;
        const col=k.dir>0?p.cBuy:p.cSell; ln(Math.max(-4,xs),y,xe,y,ext?msA(col,.95):msA(col,.6),ext?1.6:1,ext?null:[3,3]);
        if(p.showLbl){ const t=onlyShift?'MSS':(ext?'BOS':(k.shift?'MSS':'BOS')); tx(t,(Math.max(-4,xs)+xe)/2,k.dir>0?y-6:y+7,msA(col,ext?1:.8),ext?10:8,'center',ext||onlyShift); } }); };
    const pivDraw=(St,bars,ext)=>{ if(!p.showLbl) return; St.all.filter(q=>q.sup==null&&q.lb.length===2).slice(-mS).forEach(q=>{ const x=X(pX(bars,q)), y=Y(q.p); if(x==null||y==null||x<-10||x>W+10) return; tx(q.lb,x,q.t==='H'?y-8:y+9,ext?p.cExt:p.cInt,ext?10:8,'center',ext); }); };
    if(p.showInt){ brkDraw(S.SDi,S.F1.bars,false,false); pivDraw(S.SDi,S.F1.bars,false); }
    if(p.showExt){ brkDraw(S.SDe,S.F1.bars,true,false); pivDraw(S.SDe,S.F1.bars,true); }
    if(p.showExec) brkDraw(S.SE,null,false,true);
    // 4) liquidity
    if(p.showLiq&&D.liq) D.liq.forEach(q=>{ const x=X(q.x), y=Y(q.p); if(x==null||y==null||x>W) return; ln(Math.max(-4,x),y,W,y,'rgba(154,160,173,.45)',1,[2,4]); tx(q.t==='H'?'BSL':'SSL',W-4,y-5,'rgba(154,160,173,.8)',8,'right'); });
    // 5) trade levels of the newest setups
    if(p.showLevels&&D.sigs.length){ const keep=Math.max(1,Math.round(+p.lvKeep)||2), len=Math.max(5,Math.round(+p.ext)||40);
      D.sigs.filter(s=>!(s.trade&&s.trade.status==='cancel')).slice(-keep).forEach(s=>{ const t=s.trade, pl=(t&&t.plan)||s.plan, i0=(t&&t.entryI!=null)?t.entryI:s.n, x0=X(i0); if(x0==null) return; const x1=(t&&t.status==='closed'&&t.exitI>=0)?X(t.exitI):x0+len*sx; if(x1==null) return;
        const yE=Y(pl.entry), yS=Y(pl.sl), y1=Y(pl.tp[0]), y2=Y(pl.tp[1]), y3=Y(pl.tp[2]); if(yE==null||yS==null||y1==null||y2==null||y3==null||x1<0||x0>W) return;
        cx.fillStyle=msA(p.cSell,.16); cx.fillRect(x0,Math.min(yS,yE),Math.max(1,x1-x0),Math.abs(yE-yS)); cx.fillStyle=msA(p.cBuy,.12); cx.fillRect(x0,Math.min(yE,y3),Math.max(1,x1-x0),Math.abs(y3-yE));
        ln(x0,yS,x1,yS,msA(p.cSell,1),1.6); ln(x0,yE,x1,yE,'rgba(255,255,255,.9)',1,[5,3]); [y1,y2,y3].forEach((y,k)=>ln(x0,y,x1,y,msA(p.cBuy,.9),1,[2,3]));
        pill('SL '+msFx(pl.sl),x1,yS,msA(p.cSell,.9)); pill('Entry '+msFx(pl.entry),x1,yE,'rgba(90,96,112,.95)'); pill('TP1 '+msFx(pl.tp[0]),x1,y1,msA(p.cBuy,.85)); pill('TP2 '+msFx(pl.tp[1]),x1,y2,msA(p.cBuy,.85)); pill('TP3 '+msFx(pl.tp[2]),x1,y3,msA(p.cBuy,.85));
        const ly=Y(s.level); if(ly!=null){ ln(Math.max(-4,x0-sx*12),ly,x0,ly,p.cLvl,1,[2,2]); tx(s.d>0?'LH broken':'HL broken',Math.max(2,x0-sx*12),ly-6,p.cLvl,8,'left'); }
        if(t&&t.status==='closed') pill(t.reason+' '+(t.R>=0?'+':'')+t.R.toFixed(2)+'R',x1,(s.d>0?Math.min(yS,y3):Math.max(yS,y3))+(s.d>0?-14:14),t.R>0?msA(p.cBuy,.95):msA(p.cSell,.95)); }); }
    // 6) dashboard
    const m=6, f=10, rh=13;
    const panel=(pos,title,rows)=>{ const maxW=Math.min(W-2*m,285), L=[]; cx.font=f+'px system-ui';
      rows.forEach(r=>{ if(r.n!==undefined){ cx.font=f+'px system-ui'; let line=''; String(r.n).split(' ').forEach(wd=>{ const t=line?line+' '+wd:wd; if(cx.measureText(t).width>maxW-18&&line){ L.push({n:line,c:r.c}); line=wd; } else line=t; }); if(line) L.push({n:line,c:r.c}); } else L.push(r); });
      cx.font='bold '+f+'px system-ui'; let w=cx.measureText(title).width;
      L.forEach(r=>{ if(r.k!==undefined){ cx.font=f+'px system-ui'; const a=cx.measureText(r.k).width; cx.font='bold '+f+'px system-ui'; w=Math.max(w,a+cx.measureText(r.v).width+22); } else if(r.n!==undefined){ cx.font=f+'px system-ui'; w=Math.max(w,cx.measureText(r.n).width); } else { cx.font='bold 9px system-ui'; w=Math.max(w,cx.measureText(r.h).width); } });
      const pw=Math.min(maxW,w+18), ph=(L.length+1)*rh+8, x0=/Left/.test(pos)?m:W-pw-m, y0=/Top/.test(pos)?m+34:Hh-ph-m-24;
      cx.fillStyle='rgba(10,13,20,.9)'; cx.fillRect(x0,y0,pw,ph); cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph);
      tx(title,x0+8,y0+rh/2+3,'#e6e8ee',f,'left',true); let y=y0+rh*1.5+5;
      L.forEach(r=>{ if(r.h!==undefined){ tx(r.h,x0+8,y+rh/2-1,'#e5121a',9,'left',true); } else if(r.n!==undefined){ tx(r.n,x0+8,y+rh/2-1,r.c||'rgba(230,232,238,.8)',f,'left'); } else { tx(r.k,x0+8,y+rh/2-1,'rgba(230,232,238,.6)',f,'left'); tx(r.v,x0+pw-8,y+rh/2-1,r.c||'#e6e8ee',f,'right',true); } y+=rh; }); };
    const TN=v=>v>0?'BULLISH':v<0?'BEARISH':'UNCLEAR', TC=v=>v>0?p.cBuy:v<0?p.cSell:'#f0b90b', iv=D.iv, eN=msTfName(iv), lN=msTfName(D.sL), dN=msTfName(D.sD);
    if(p.dash!==MS_DASH[2]&&lv){ const R=[], full=p.dash===MS_DASH[0];
      if(full){ R.push({h:'MARKET OVERVIEW'},{k:'Instrument',v:sym[0]+' \u00b7 '+tf[0]},{k:'Price',v:msFx(lv.price)},{k:'External trend',v:TN(lv.extT),c:TC(lv.extT)},{k:'Internal order flow',v:TN(lv.intT),c:TC(lv.intT)},{n:lv.cond,c:lv.condCol},
          {k:'Premium / discount',v:lv.zone?lv.zone+' '+lv.pct.toFixed(0)+'%':'-',c:lv.zone==='PREMIUM'?p.cSell:lv.zone==='DISCOUNT'?p.cBuy:'#e6e8ee'});
        const zr=lv.zone==='PREMIUM'?lv.zS:lv.zone==='DISCOUNT'?lv.zD:null, ar=lv.arm&&lv.arm[0];
        R.push({h:'MULTI-TIMEFRAME'},{k:dN+' direction',v:(lv.extT?TN(lv.extT).slice(0,4):'-')+' / '+(lv.intT?TN(lv.intT).slice(0,4):'-'),c:TC(lv.extT)},
          {k:lN+' location',v:zr?(zr.dist<=(+p.apprAtr||0)*lv.atr?'AT ':'')+(zr.z.d>0?'DEMAND ':'SUPPLY ')+MS_STN[zr.st]:(lv.zone||'-'),c:zr?(zr.z.d>0?p.cBuy:p.cSell):'#e6e8ee'},
          {k:eN+' entry',v:lv.sig?'SHIFT CONFIRMED':ar?'ARMED '+(ar.d>0?'BUY':'SELL'):'NO SHIFT',c:lv.sig?(lv.sig.d>0?p.cBuy:p.cSell):ar?'#f0b90b':'rgba(230,232,238,.7)'}); }
      R.push({h:'SIGNAL'},{k:'Status',v:lv.state,c:lv.state==='BUY SETUP'?p.cBuy:lv.state==='SELL SETUP'?p.cSell:lv.state==='NO TRADE'?'#f0b90b':'#e6e8ee'}); lv.reasons.forEach(r=>R.push({n:'\u2022 '+r}));
      if(full&&lv.warns.length&&lv.state!=='NO TRADE'){ R.push({h:'FILTERS'}); lv.warns.slice(0,4).forEach(w=>R.push({n:'! '+w,c:'#f0b90b'})); }
      if(lv.sig){ const s=lv.sig, pl=(s.trade&&s.trade.plan)||s.plan; R.push({h:'TRADE PLANNER'},{k:'Entry'+(s.mode==='retest'?' (retest)':''),v:msFx(pl.entry)},{k:'Stop loss',v:msFx(pl.sl),c:p.cSell},{k:'SL distance',v:msFx(pl.risk)},{k:'TP1 / R',v:msFx(pl.tp[0])+' / '+pl.rr[0].toFixed(2),c:p.cBuy},{k:'TP2 / R',v:msFx(pl.tp[1])+' / '+pl.rr[1].toFixed(2),c:p.cBuy},{k:'TP3 / R',v:msFx(pl.tp[2])+' / '+pl.rr[2].toFixed(2),c:p.cBuy},
          {k:'Risk',v:pl.rp+'% = '+pl.cash.toFixed(2)},{k:'Position size',v:(pl.units>=100?pl.units.toFixed(1):pl.units.toFixed(4))+' units / '+pl.lots.toFixed(pl.lots>=1?2:4)+' lots'}); }
      panel(p.dashPos,'Market Shift Scalping System',R); }
    if(p.showStats&&D.stats){ const st=D.stats, R=[], dur=sec=>{ if(!(sec>=0)) return '-'; const mi=sec/60; return mi<90?mi.toFixed(0)+' min':(mi/60).toFixed(1)+' h'; }, fm=(v,dg)=>(v==null||!isFinite(v))?'-':v.toFixed(dg);
      if(!st.n) R.push({n:'No completed trades in the loaded history.'}); else { R.push({k:'Total trades',v:st.n+'  (W '+st.w+' / L '+st.l+')'},{k:'Win rate',v:fm(st.wr,1)+'%'},{k:'Avg R per trade',v:fm(st.avgR,2)+'R',c:st.avgR>0?p.cBuy:p.cSell},{k:'Avg reward-to-risk',v:fm(st.rr,2)},{k:'Profit factor',v:isFinite(st.pf)?fm(st.pf,2):(st.gp>0?'inf':'-')},{k:'Max drawdown',v:fm(st.dd,2)+'R (~'+fm(st.dd*msClamp(+p.risk||1,0.25,2),1)+'%)'},{k:'Avg holding time',v:dur(st.avgHold)});
        R.push({h:'BY SESSION (UTC)'}); ['Asia','London','New York','Late'].forEach(k=>{ const q=st.ses[k]; if(q) R.push({k:k,v:q.n+' \u00b7 '+(q.w/q.n*100).toFixed(0)+'% \u00b7 '+(q.R>=0?'+':'')+q.R.toFixed(1)+'R',c:q.R>=0?p.cBuy:p.cSell}); });
        let all=null; try{ all=JSON.parse(localStorage.getItem('rc_mss_stats')||'{}'); }catch(e){} const ks=all?Object.keys(all).sort((a,b)=>all[b].t-all[a].t).slice(0,4):[]; if(ks.length){ R.push({h:'BY INSTRUMENT (last viewed)'}); ks.forEach(k=>R.push({k:k,v:all[k].n+' \u00b7 '+all[k].wr.toFixed(0)+'% \u00b7 '+(all[k].avgR>=0?'+':'')+all[k].avgR.toFixed(2)+'R'})); } }
      R.push({n:'Costs: spread '+(+p.spread||0)+', slippage '+(+p.slip||0)+', commission '+(+p.comm||0)+'%. Past results do not guarantee future results.',c:'rgba(230,232,238,.5)'}); panel(p.statsPos,'MSS backtest (loaded history)',R); }
    cx.restore(); }; }
// alerts: fire once, when the candle that carried the event has closed (the newest closed candle), while the app is open
function msAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='mss'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},MS_DEF,i.p); let quiet=q; if(i._msK!==key){ i._msK=key; i._msLast={}; quiet=true; }
    const last=i._msLast||(i._msLast={});
    i._xr.events.forEach(e=>{ const k=e.type+e.dir+(e.k||''); if(e.time>cc||e.time<=(last[k]||0)) return; last[k]=e.time;
      const on=(e.type==='buy'||e.type==='sell')?P.alSig:P.alTP; if(quiet||e.time!==cc||!on) return;
      const nm=e.type==='buy'?'BUY SETUP - market shift at discount / demand':e.type==='sell'?'SELL SETUP - market shift at premium / supply':e.type==='tp'?('Target TP'+e.k+' reached'):(e.reason==='BE'?'Break-even stop hit':'Stop loss hit');
      toast('MSS \u00b7 '+nm+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+msFx(e.price),(e.type==='buy'||(e.type==='tp'))?'#2e7d32':'#c62828'); if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _msRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_msRE.apply(this,arguments); try{ msAlerts(q); }catch(e){ console.error('mss alerts',e); } return rv; }; }
try{ DESC.mss='Market Shift Scalping System: 1) who controls the market (external vs internal structure, BOS closes only), 2) where to look (premium / discount + supply / demand zones), 3) has the market shifted (closed-candle break of the internal lower high / higher low), then stop, targets, position size, a "when not to trade" filter and a backtest. Never forces a signal'; }catch(e){}
}catch(err){ console.error('mss indicator failed',err); window.__mssErr=err; }

// ---- [msi] INDICATOR: Reinblacks Market Structure Intelligence (MSI)  (self-contained: every name starts with mi / MI) ----
// ONE shared engine, two analysis modes. Everything is built from CLOSED candles only (the forming candle never creates or changes anything, nothing repaints).
//  MODE A  SCALPING : 1H trend + control  ->  15M trading location  ->  chart candle (5M) entry confirmation.
//  MODE B  TOP-DOWN : Daily major trend / external structure -> 4H internal structure + points of interest (supply / demand) -> 1H fractal structure -> 15M setup confirmation -> chart candle (5M) execution.
// All timeframes can be changed. Higher timeframes are folded from the candles loaded on the chart (no extra feed), so open the tool on the 5M chart.
// Modules (one calculation each, shared by everything): external + internal structure (HH HL LH LL, BOS, MSS - a BOS needs a candle CLOSE beyond the level, a wick never counts),
// fractal structure (a lower-timeframe shift inside a higher-timeframe chart, with its confirmation status), liquidity (swing highs / lows, equal highs / lows, buy-side / sell-side,
// internal / external, swept / unswept, what followed a sweep), supply / demand (fresh, tested, mitigated, invalidated), premium / discount (0, .382, .5, .618, .65, .786, 1),
// trading location (trend-following, countertrend, unconfirmed), entry confirmation (last internal LH / HL closed beyond), risk (size, SL, TP1-TP3, partials, break-even) and a backtest with costs.
// Every signal (BUY / SELL / WAIT / NO TRADE) lists WHY. Analysis only: the tool never sends an order. Rules beyond structure / location / confirmation are CONFIGURABLE DEFAULTS.
try{
const MI_POS=['Top Left','Top Right','Bottom Left','Bottom Right'];
const MI_TFS={'Auto':0,'1 min':60,'5 min':300,'15 min':900,'30 min':1800,'1 hour':3600,'2 hours':7200,'4 hours':14400,'Daily':86400,'Weekly':604800};
const MI_MODE=['Scalping (1H trend / 15M location / 5M entry)','Top-down (Daily / 4H / 1H / 15M / 5M entry)'];
const MI_RS=['External swing (top timeframe)','Internal swing (top timeframe)','POI / location timeframe swing','Manual high / low'];
const MI_ZB=['Full candle range','Candle body','Consolidation range'];
const MI_ZS=['Fresh only','Fresh + Tested','Fresh + Tested + Mitigated'];
const MI_EM=['Market (confirmed close)','Retest of the broken level','Manual (levels + alert only)'];
const MI_SLB=['Zone or swing, whichever is farther','Zone only','Swing extreme only'];
const MI_TPM=['Fixed R multiples','Nearest level as TP1 (swing / liquidity / opposing zone)','Structure levels as TP1 - TP3 (swings, liquidity, opposing zones)'];
const MI_TT=['Trend-following only','Trend-following + countertrend','Any direction (location + shift only)'];
const MI_CT=['Black & grey','White & black','Off (app colours)'];
const MI_DASH=['Full','Compact','Off'];
const MI_DEF={mode:MI_MODE[0],sTrend:'Auto',sLoc:'Auto',tdMajor:'Daily',tdPoi:'4 hours',tdInter:'1 hour',tdSetup:'15 min',
  extLen:5,intLen:2,midLen:3,exLen:2,rangeSrc:MI_RS[0],manHi:0,manLo:0,zoneBounds:MI_ZB[0],impMult:1.5,maxZoneAtr:4,zoneStates:MI_ZS[1],apprAtr:0.5,maxZones:10,
  tradeTypes:MI_TT[1],reqPD:true,reqSetup:true,armWin:30,reqLH:true,reqSweep:false,cool:10,sigValid:20,eqTol:0.1,swpWin:30,
  entryMode:MI_EM[0],rtWin:20,slBasis:MI_SLB[0],slBuf:0.15,risk:1,balance:10000,contract:1,lotStep:0.01,
  tpMode:MI_TPM[0],tp1:1,tp2:2,tp3:3,p1:50,p2:30,be:true,minRR:1,maxHold:300,volMax:2.5,spreadMax:0.25,spread:0,slip:0,comm:0,
  candleTheme:MI_CT[0],showFib:true,showZones:true,showInval:false,showExt:true,showInt:true,showFrac:true,showExec:true,showLbl:true,showLiq:true,showSwept:true,showLevels:true,lvKeep:2,ext:40,maxStruct:24,
  dash:MI_DASH[0],pOv:MI_POS[0],pSt:MI_POS[1],pTr:MI_POS[2],showNarr:true,showStats:true,statsPos:MI_POS[3],
  cBuy:'#3fb950',cSell:'#e5121a',cExt:'#ffffff',cInt:'#9aa0ad',cLvl:'#f0b90b',alSig:true,alTP:true,alSound:false};
const miClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function miA(hex,a){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
function miFx(v){ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return v.toFixed(a>=1000?2:a>=10?3:a>=1?4:6); }
function miTf(s){ if(!s) return '-'; if(s%604800===0) return (s/604800)+'W'; if(s%86400===0) return (s/86400)+'D'; if(s%3600===0) return (s/3600)+'H'; if(s%60===0) return (s/60)+'M'; return s+'s'; }
function miIv(c,n){ const a=[]; for(let i=Math.max(1,n-200);i<n;i++){ const d=c[i].time-c[i-1].time; if(d>0) a.push(d); } if(!a.length) return 60; a.sort((x,y)=>x-y); return a[a.length>>1]; }
function miAtr(b,n,L){ const o=new Float64Array(n).fill(NaN); let r=NaN,s=0; for(let i=0;i<n;i++){ const tr=i?Math.max(b[i].high-b[i].low,Math.abs(b[i].high-b[i-1].close),Math.abs(b[i].low-b[i-1].close)):b[i].high-b[i].low;
    if(i<L){ s+=tr; if(i===L-1){ r=s/L; o[i]=r; } } else { r=(r*(L-1)+tr)/L; o[i]=r; } } return o; }
// fold chart candles into higher-timeframe candles; i0/i1 = first/last chart candle of the bar, hiI/loI = chart candle holding the high / low; a bucket still forming is never counted
function miFold(c,n,sec,iv){ const bars=[], idx=new Int32Array(n);
  for(let i=0;i<n;i++){ const k=Math.floor(c[i].time/sec); let b=bars[bars.length-1];
    if(!b||b.k!==k){ b={k,time:k*sec,open:c[i].open,high:c[i].high,low:c[i].low,close:c[i].close,i0:i,i1:i,hiI:i,loI:i}; bars.push(b); }
    else { if(c[i].high>b.high){ b.high=c[i].high; b.hiI=i; } if(c[i].low<b.low){ b.low=c[i].low; b.loI=i; } b.close=c[i].close; b.i1=i; }
    idx[i]=bars.length-1; }
  let nb=bars.length; if(nb&&(c[n-1].time+iv)<(bars[nb-1].k+1)*sec-1) nb--;
  return {bars,idx,nb}; }
// structure engine: pivot = candle with `len` candles each side (known `len` candles later), pivots alternate H / L, HH HL LH LL labels.
// A break needs a candle CLOSE beyond the active swing point. A break against the running trend is a shift (MSS), with the trend, the swing and the broken level recorded.
function miStruct(b,N,len){ len=Math.max(1,Math.round(+len)||3);
  const S={all:[],live:[],brk:[],tr:new Int8Array(N),rH:new Float64Array(N).fill(NaN),rL:new Float64Array(N).fill(NaN),rU:new Int8Array(N),N,len};
  let actH=null,actL=null,trend=0;
  const add=(t,k,p,n)=>{ const lv=S.live, last=lv[lv.length-1];
    if(last&&last.t===t){ if(t==='H'?p<=last.p:p>=last.p) return; last.sup=n; lv.pop(); }
    let prev=null; for(let q=lv.length-1;q>=0;q--) if(lv[q].t===t){ prev=lv[q]; break; }
    const o={t,i:k,p,conf:n,sup:null,lb:prev?(t==='H'?(p>prev.p?'HH':'LH'):(p>prev.p?'HL':'LL')):t};
    lv.push(o); S.all.push(o); if(t==='H') actH={p,i:k,broken:false}; else actL={p,i:k,broken:false}; };
  const lastOf=t=>{ for(let q=S.live.length-1;q>=0;q--) if(S.live[q].t===t) return S.live[q]; return null; };
  for(let n=0;n<N;n++){ const k=n-len;
    if(k>=len){ let hi=true,lo=true; for(let j=1;j<=len;j++){ if(!(b[k].high>b[k-j].high&&b[k].high>=b[k+j].high)) hi=false; if(!(b[k].low<b[k-j].low&&b[k].low<=b[k+j].low)) lo=false; if(!hi&&!lo) break; }
      if(hi) add('H',k,b[k].high,n); if(lo) add('L',k,b[k].low,n); }
    const cl=b[n].close;
    if(actH&&!actH.broken&&cl>actH.p){ actH.broken=true; const lw=lastOf('L'); S.brk.push({dir:1,sw:actH.i,to:n,p:actH.p,shift:trend===-1,low:lw?{i:lw.i,p:lw.p}:null}); trend=1; }
    else if(actL&&!actL.broken&&cl<actL.p){ actL.broken=true; const hw=lastOf('H'); S.brk.push({dir:-1,sw:actL.i,to:n,p:actL.p,shift:trend===1,high:hw?{i:hw.i,p:hw.p}:null}); trend=-1; }
    S.tr[n]=trend; const lv=S.live; if(lv.length>=2){ const a=lv[lv.length-1], q=lv[lv.length-2]; S.rH[n]=Math.max(a.p,q.p); S.rL[n]=Math.min(a.p,q.p); S.rU[n]=a.t==='H'?1:-1; } }
  return S; }
function miLastPiv(S,t,before,n){ for(let q=S.all.length-1;q>=0;q--){ const p=S.all[q]; if(p.t===t&&p.i<before&&p.conf<=n&&(p.sup==null||p.sup>n)) return p; } return null; }
// supply / demand: origin of an impulsive move that broke structure on the POI timeframe; zones that caused a SHIFT (MSS) rank above plain BOS zones
function miZones(S,bars,aL,P,c,nUse){ const Z=[], mode=P.zoneBounds;
  S.brk.forEach(k=>{ const d=k.dir, to=k.to; if(!(aL[to]>0)) return;
    let o=-1,best=d>0?Infinity:-Infinity; for(let q=Math.max(0,k.sw);q<to;q++){ const v=d>0?bars[q].low:bars[q].high; if(d>0?v<best:v>best){ best=v; o=q; } } if(o<0) return;
    let imp=0; for(let q=o;q<=to;q++) imp=Math.max(imp,d>0?bars[q].high-bars[o].low:bars[o].high-bars[q].low);
    if(imp<(+P.impMult||0)*aL[to]) return;
    let top,bot,s0=o;
    if(mode===MI_ZB[1]){ top=Math.max(bars[o].open,bars[o].close); bot=Math.min(bars[o].open,bars[o].close); }
    else if(mode===MI_ZB[2]){ let a=o,e=o; const lim=0.8*aL[to]; for(let g=0;g<5&&a>0&&(bars[a-1].high-bars[a-1].low)<=lim;g++) a--; for(let g=0;g<5&&e+1<to&&(bars[e+1].high-bars[e+1].low)<=lim;g++) e++;
      top=-Infinity; bot=Infinity; for(let q=a;q<=e;q++){ top=Math.max(top,bars[q].high); bot=Math.min(bot,bars[q].low); } s0=a; }
    else { top=bars[o].high; bot=bars[o].low; }
    if(!(top>bot)||(top-bot)>(+P.maxZoneAtr||99)*aL[to]) return;
    const ov=Z.some(z=>z.d===d&&Math.min(z.top,top)-Math.max(z.bot,bot)>0.5*Math.min(z.top-z.bot,top-bot)); if(ov) return;
    Z.push({d,top,bot,s0:bars[s0].i0,start:bars[to].i1+1,imp:imp/aL[to],shift:!!k.shift,score:imp/aL[to]+(k.shift?2:0),tI:-1,mI:-1,xI:-1}); });
  const out=Z.slice(-70);
  out.forEach(z=>{ for(let i=z.start;i<nUse;i++){ const b=c[i];
      if(z.d>0){ if(b.close<z.bot){ z.xI=i; break; } if(z.mI<0&&b.low<=z.bot) z.mI=i; if(z.tI<0&&b.low<=z.top) z.tI=i; }
      else { if(b.close>z.top){ z.xI=i; break; } if(z.mI<0&&b.high>=z.top) z.mI=i; if(z.tI<0&&b.high>=z.bot) z.tI=i; } } });
  return out; }
const miSt=(z,i)=>(z.xI>=0&&i>=z.xI)?3:(z.mI>=0&&i>=z.mI)?2:(z.tI>=0&&i>=z.tI)?1:0;
const MI_STN=['fresh','tested','mitigated','invalidated'];
// risk: stop beyond the invalidation level (+ATR buffer), targets as R multiples or from structure levels, size from balance x risk% / stop distance
function miPlan(P,d,entry,slRaw,atr,levels){ const buf=(+P.slBuf||0)*atr, sl=d>0?slRaw-buf:slRaw+buf, risk=(entry-sl)*d; if(!(risk>0)||!isFinite(risk)) return null;
  const mult=[+P.tp1||1,+P.tp2||2,+P.tp3||3]; let t=mult.map(k=>entry+d*risk*k), near=false;
  if(P.tpMode!==MI_TPM[0]&&levels&&levels.length){ const ls=Array.from(new Set(levels.map(x=>+x.toFixed(8)))).filter(L=>(L-entry)*d/risk>=0.5).sort((a,b)=>(a-b)*d);
    if(ls.length){ near=true; t[0]=ls[0]; if(P.tpMode===MI_TPM[2]){ let prev=ls[0]; for(let k=1;k<3;k++){ const nx=ls.find(L=>(L-prev)*d>0.3*risk); if(nx!==undefined){ t[k]=nx; prev=nx; } } } } }
  t.sort((a,b)=>(a-b)*d);
  const rp=miClamp(+P.risk||1,0.25,2), cash=(+P.balance||0)*rp/100, units=cash/risk, step=+P.lotStep||0, rawLots=units/(+P.contract||1), lots=step>0?Math.floor(rawLots/step+1e-9)*step:rawLots;
  return {d,entry,sl,tp:t,risk,rr:t.map(x=>(x-entry)*d/risk),units,lots,rawLots,cash,rp,nearest:near}; }
function miSim(c,nUse,s,P){ const d=s.d; let plan=s.plan, eI=s.n, start=s.n+1;
  if(s.mode==='retest'){ const lvl=s.level, pr=miPlan(P,d,lvl,s.slRaw,s.atr,s.levels); if(!pr||pr.rr[0]<(+P.minRR||0)) return {status:'cancel',why:'retest plan fails the minimum reward-to-risk'};
    plan=pr; let f=-1; const end=Math.min(nUse-1,s.n+(+P.rtWin||20));
    for(let m=s.n+1;m<=end;m++){ const b=c[m]; if(d>0?b.low<=lvl:b.high>=lvl){ f=m; break; } if(d>0?b.high>=plan.tp[0]:b.low<=plan.tp[0]) return {status:'cancel',why:'target reached before a retest'}; }
    if(f<0){ if(s.n+(+P.rtWin||20)>=nUse-1) return {status:'pending',plan}; return {status:'cancel',why:'no retest within '+(+P.rtWin||20)+' candles'}; }
    eI=f; start=f+1; const b=c[f];
    if(d>0?b.low<=plan.sl:b.high>=plan.sl){ const cost0=((+P.spread||0)+2*(+P.slip||0)+2*(+P.comm||0)/100*plan.entry)/plan.risk; return {d,plan,entry:plan.entry,entryI:f,exitI:f,R:-1-cost0,status:'closed',reason:'SL',hit:[false,false,false],hitI:[-1,-1,-1],costR:cost0,entryT:c[f].time,bars:0}; } }
  const entry=plan.entry, risk=plan.risk; let p1=miClamp(+P.p1||0,0,100)/100, p2=miClamp(+P.p2||0,0,100)/100, p3=Math.max(0,1-p1-p2); const sm=(p1+p2+p3)||1; const parts=[p1/sm,p2/sm,p3/sm];
  let rem=1,R=0,slc=plan.sl,exitI=-1,reason='',status='open'; const hit=[false,false,false], hitI=[-1,-1,-1], last=Math.min(nUse-1,eI+(+P.maxHold||300));
  for(let k=start;k<=last&&status==='open';k++){ const b=c[k];
    if(d>0?b.low<=slc:b.high>=slc){ R+=rem*((slc-entry)*d/risk); rem=0; exitI=k; reason=(slc===entry&&hit[0])?'BE':'SL'; status='closed'; break; }
    for(let t=0;t<3;t++){ if(!hit[t]&&rem>1e-9&&(d>0?b.high>=plan.tp[t]:b.low<=plan.tp[t])){ hit[t]=true; hitI[t]=k; const f2=t===2?rem:Math.min(rem,parts[t]); R+=f2*plan.rr[t]; rem-=f2; if(t===0&&P.be) slc=entry;
        if(rem<=1e-9){ rem=0; exitI=k; reason='TP'+(t+1); status='closed'; break; } } } }
  if(status==='open'&&last<nUse-1){ R+=rem*((c[last].close-entry)*d/risk); exitI=last; reason='TIME'; status='closed'; rem=0; }
  const cost=((+P.spread||0)+2*(+P.slip||0)+2*(+P.comm||0)/100*entry)/risk;
  let Rf=R-cost, unreal=null; if(status==='open') unreal=Rf+rem*((c[nUse-1].close-entry)*d/risk);
  return {d,plan,entry,entryI:eI,exitI,R:Rf,unreal,status,reason,hit,hitI,costR:cost,entryT:c[eI].time,bars:exitI>=0?exitI-eI:nUse-1-eI}; }
function miSess(t){ const h=new Date(t*1000).getUTCHours(); return h<7?'Asia':h<12?'London':h<21?'New York':'Late'; }
function miStats(trs,iv){ const cl=trs.filter(t=>t.status==='closed'), S={n:cl.length,w:0,l:0,gp:0,gl:0,sumR:0,dd:0,hold:0,ses:{},cls:{}};
  let eq=0,peak=0; cl.forEach(t=>{ const R=t.R; S.sumR+=R; eq+=R; if(eq>peak) peak=eq; S.dd=Math.max(S.dd,peak-eq); if(R>0){ S.w++; S.gp+=R; } else { S.l++; S.gl+=-R; } S.hold+=t.bars*iv;
    const k=miSess(t.entryT), q=S.ses[k]||(S.ses[k]={n:0,w:0,R:0}); q.n++; if(R>0) q.w++; q.R+=R;
    const ck=t.cls||'trend', cq=S.cls[ck]||(S.cls[ck]={n:0,w:0,R:0}); cq.n++; if(R>0) cq.w++; cq.R+=R; });
  S.wr=S.n?S.w/S.n*100:NaN; S.avgR=S.n?S.sumR/S.n:NaN; S.aw=S.w?S.gp/S.w:NaN; S.al=S.l?S.gl/S.l:NaN; S.rr=(S.w&&S.l)?S.aw/S.al:NaN; S.pf=S.gl>0?S.gp/S.gl:(S.gp>0?Infinity:NaN); S.avgHold=S.n?S.hold/S.n:NaN; return S; }
const miTN=v=>v>0?'BULLISH':v<0?'BEARISH':'UNCLEAR';
const miPc=v=>!isFinite(v)?'-':v>100?'above the range':v<0?'below the range':v.toFixed(0)+'% of the range';
function miChain(P,iv,notes){ const td=P.mode===MI_MODE[1]; let raw;
  if(td) raw=[['Major trend',MI_TFS[P.tdMajor]||86400],['POI',MI_TFS[P.tdPoi]||14400],['Intermediate',MI_TFS[P.tdInter]||3600],['Setup',MI_TFS[P.tdSetup]||900]];
  else raw=[['Trend',MI_TFS[P.sTrend]||iv*12],['Location',MI_TFS[P.sLoc]||iv*3]];
  const out=[]; let low=iv;
  for(let k=raw.length-1;k>=0;k--){ let s=raw[k][1]; if(s<low*1.5){ const ns=Math.round(low*(k===raw.length-1?3:4)); notes.push(raw[k][0]+' timeframe ('+miTf(s)+') must be higher than the next lower one: using '+miTf(ns)); s=ns; } out.unshift({role:raw[k][0],s}); low=s; }
  return out; }
function miCompute(c,P,forming){
  const N=c.length, nUse=forming?N-1:N, D={N,nUse,ok:false,msg:'',sigs:[],trades:[],events:[],rejs:[],notes:[],zones:[],liq:[],frac:[]};
  if(nUse<80){ D.msg='MSI needs at least 80 closed candles (loaded '+nUse+')'; return D; }
  const iv=miIv(c,nUse); D.iv=iv; D.td=P.mode===MI_MODE[1];
  const ch=miChain(P,iv,D.notes), eL=Math.max(1,Math.round(+P.extLen)||5), iL=Math.max(1,Math.round(+P.intLen)||2), mL=Math.max(1,Math.round(+P.midLen)||3), xL=Math.max(1,Math.round(+P.exLen)||2);
  // levels (top -> bottom): each folded from the chart candles; the chart candle itself is the entry level
  const LV=ch.map((q,k)=>{ const F=miFold(c,nUse,q.s,iv), len=k===0?eL:mL; return {role:q.role,s:q.s,name:miTf(q.s),F,bars:F.bars,idx:F.idx,nb:F.nb,len}; });
  for(let k=0;k<LV.length;k++){ const L=LV[k], need=2*L.len+8; if(L.nb<need){ D.msg=L.role+' timeframe ('+L.name+') has only '+L.nb+' closed candles from the loaded data, needs '+need+'. Load more history, lower the swing sensitivity or choose a lower timeframe'; return D; } L.S=miStruct(L.bars,L.nb,L.len); L.atr=miAtr(L.bars,L.nb,14); }
  const T=LV[0], Ti=miStruct(T.bars,T.nb,iL), SE=miStruct(c,nUse,xL), aE=miAtr(c,nUse,14), cs=new Float64Array(nUse+1); for(let i=0;i<nUse;i++) cs[i+1]=cs[i]+(aE[i]===aE[i]?aE[i]:0);
  const EN={role:'Entry',s:iv,name:miTf(iv),entry:true,S:SE,len:xL}; const ALL=LV.concat([EN]); D.LV=LV; D.EN=EN; D.Ti=Ti; D.SE=SE;
  const poi=LV[1], setup=D.td?LV[3]:null, mid=LV[LV.length-1], zones=miZones(poi.S,poi.bars,poi.atr,P,c,nUse); D.zones=zones; D.poi=poi;
  const maxSt=P.zoneStates===MI_ZS[0]?0:P.zoneStates===MI_ZS[2]?2:1, appr=Math.max(0,+P.apprAtr||0);
  const cI=(L,j)=>L.entry?j:L.bars[j].i1;                                // chart candle holding the end of bar j
  const trAt=(L,i)=>{ if(L.entry) return i<1?0:SE.tr[i-1]; const j=L.idx[i]-1; return (j<0||j>=L.nb)?0:L.S.tr[j]; };
  const trI=i=>{ const j=T.idx[i]-1; return (j<0||j>=T.nb)?0:Ti.tr[j]; };
  // ---- fractal engine: a child-timeframe shift (MSS) seen inside the parent chart; parent confirmation tracked separately ----
  for(let k=0;k<ALL.length-1;k++){ const par=ALL[k], chd=ALL[k+1], ev=[];
    chd.S.brk.forEach(b=>{ if(!b.shift) return; const ci=cI(chd,b.to), pt=trAt(par,ci), d=b.dir; if(pt===0) return;
      const kind=pt===-d?'shift':'resume'; let conf=null; if(kind==='shift'){ for(const q of par.S.brk){ if(q.dir===d&&cI(par,q.to)>ci){ conf=q; break; } } }
      ev.push({parent:par.name,child:chd.name,dir:d,kind,i:ci,time:c[ci].time,price:b.p,pt,htf:kind==='shift'?(conf?'confirmed':'pending'):'',htfT:conf?c[cI(par,conf.to)].time:0}); });
    ev.slice(-3).forEach(e=>D.frac.push(e)); }
  D.frac.sort((a,b)=>a.time-b.time); D.frac=D.frac.slice(-14);
  // ---- range for premium / discount ----
  const rS=P.rangeSrc===MI_RS[1]?Ti:P.rangeSrc===MI_RS[2]?poi.S:T.S, rL=P.rangeSrc===MI_RS[2]?poi:T, manual=P.rangeSrc===MI_RS[3]&&(+P.manHi>+P.manLo)&&(+P.manLo>0); D.rS=rS; D.rL=rL;
  const rngAt=i=>{ if(manual) return [+P.manHi,+P.manLo,0]; const j=rL.idx[i]-1; if(j<0||j>=rS.N) return null; const hi=rS.rH[j], lo=rS.rL[j]; return (hi===hi&&lo===lo&&hi>lo)?[hi,lo,rS.rU[j]]:null; };
  // ---- trading location class: trend-following / countertrend / none ----
  const clsOf=(d,i)=>{ const ext=trAt(T,i), int=trI(i), sup=(int===d||trAt(mid,i)===d), tt=P.tradeTypes;
    if(ext===d) return 'trend'; if(tt===MI_TT[0]) return null; if(tt===MI_TT[2]) return 'counter'; return sup?'counter':null; };
  const setupOK=(d,i)=>!(P.reqSetup&&setup)||trAt(setup,i)===d;
  const levelsFor=(d,i,entry)=>{ const Lv=[], t=d>0?'H':'L';
    ALL.forEach(L=>{ if(L.entry){ SE.all.forEach(p=>{ if(p.t===t&&p.conf<=i&&(p.sup==null||p.sup>i)&&(p.p-entry)*d>0) Lv.push(p.p); }); return; }
      const j=L.idx[i]-1; if(j<0||L!==T&&L!==poi) return; L.S.all.forEach(p=>{ if(p.t===t&&p.conf<=j&&(p.sup==null||p.sup>j)&&(p.p-entry)*d>0) Lv.push(p.p); }); });
    zones.forEach(z=>{ if(z.d===-d&&z.start<=i&&miSt(z,i)<3){ const e=d>0?z.bot:z.top; if((e-entry)*d>0) Lv.push(e); } }); return Lv; };
  // ---- entry engine (armed at an approved location, confirmed by a CLOSE beyond the last internal LH / HL) ----
  const arms=[null,null], cool=[0,0]; let busy=-1;
  for(let i=Math.max(40,2*xL+3);i<nUse;i++){ const b=c[i], atr=aE[i]; if(!(atr>0)) continue;
    for(let sd=0;sd<2;sd++){ const d=sd===0?1:-1; let a=arms[sd];
      if(!a){ if(i<cool[sd]) continue; const cl=clsOf(d,i); if(!cl) continue; const rg=rngAt(i); if(P.reqPD&&!rg) continue; const eq=rg?(rg[0]+rg[1])/2:NaN; if(P.reqPD&&!(d>0?b.low<eq:b.high>eq)) continue;
        let bz=null; zones.forEach(z=>{ if(z.d!==d||z.start>i) return; const st=miSt(z,i-1); if(st>maxSt) return; const near=d>0?(b.low<=z.top+appr*atr&&b.close>=z.bot):(b.high>=z.bot-appr*atr&&b.close<=z.top); if(near&&(!bz||z.score>bz.score||(z.score===bz.score&&z.start>bz.start))) bz=z; });
        if(!bz) continue; a=arms[sd]={z:bz,start:i,last:i,ext:d>0?b.low:b.high,extI:i,st:miSt(bz,i-1),rg,cls:cl,sup:(trI(i)===d||trAt(mid,i)===d),pct0:rg?((d>0?b.low:b.high)-rg[1])/(rg[0]-rg[1])*100:NaN}; }
      else { if(d>0?b.low<a.ext:b.high>a.ext){ a.ext=d>0?b.low:b.high; a.extI=i; }
        if(d>0?b.low<=a.z.top+appr*atr:b.high>=a.z.bot-appr*atr) a.last=i;
        if(i-a.last>(+P.armWin||30)||(d>0?b.close<a.z.bot:b.close>a.z.top)){ arms[sd]=null; continue; } }
      const piv=miLastPiv(SE,d>0?'H':'L',a.extI,i); if(!piv) continue; if(P.reqLH&&piv.lb!==(d>0?'LH':'HL')) continue;
      if(!(d>0?b.close>piv.p:b.close<piv.p)) continue; if(!setupOK(d,i)) continue;
      const pv2=miLastPiv(SE,d>0?'L':'H',a.extI,i), swept=!!(pv2&&(d>0?a.ext<pv2.p:a.ext>pv2.p)); if(P.reqSweep&&!swept) continue;
      arms[sd]=null; cool[sd]=i+Math.max(1,Math.round(+P.cool)||1); if(i<=busy) continue;
      const zEdge=d>0?a.z.bot:a.z.top, slRaw=P.slBasis===MI_SLB[1]?zEdge:P.slBasis===MI_SLB[2]?a.ext:(d>0?Math.min(zEdge,a.ext):Math.max(zEdge,a.ext));
      const mode=P.entryMode===MI_EM[1]?'retest':P.entryMode===MI_EM[2]?'manual':'market', entry=mode==='retest'?piv.p:b.close, lv=levelsFor(d,i,entry), plan=miPlan(P,d,entry,slRaw,atr,lv);
      let why=''; const avg=i>=120?(cs[i]-cs[i-100])/100:NaN;
      if(!plan) why='stop-loss distance is not valid';
      else if(avg>0&&atr>(+P.volMax||99)*avg) why='excessive volatility (ATR '+(atr/avg).toFixed(1)+'x its 100-candle average)';
      else if((+P.spread||0)>(+P.spreadMax||99)*plan.risk) why='spread is '+Math.round((+P.spread||0)/plan.risk*100)+'% of the stop distance';
      else if(plan.rr[0]<(+P.minRR||0)) why='reward-to-risk to TP1 is only '+plan.rr[0].toFixed(2);
      if(why){ D.rejs.push({i,d,why,time:b.time}); if(D.rejs.length>5) D.rejs.shift(); continue; }
      const extT=trAt(T,i), intT=trI(i), pct=a.pct0;
      const sig={d,n:i,time:b.time,level:piv.p,zone:a.z,zst:a.st,swept,ext:a.ext,mode,plan,slRaw,atr,levels:lv,pct,rg:a.rg,extT,intT,cls:a.cls};
      sig.reasons=['Control: '+T.name+' external '+miTN(extT)+', internal '+miTN(intT)+' -> '+(a.cls==='trend'?'TREND-FOLLOWING':(a.sup?'COUNTERTREND ('+(intT===d?T.name+' internal':mid.name)+' flow supports it)':'COUNTERTREND (no structural support: "Any direction" mode)')),
        'Location: '+(isFinite(pct)?(d>0?'DISCOUNT':'PREMIUM')+' ('+miPc(pct)+') + ':'')+MI_STN[a.st]+' '+(d>0?'demand':'supply')+' zone '+miFx(a.z.bot)+' - '+miFx(a.z.top)+(a.z.shift?' (it caused a structure shift)':''),
        (setup&&P.reqSetup?setup.name+' setup shift '+miTN(d).toLowerCase()+'. ':'')+'Confirmation: '+miTf(iv)+' candle closed '+(d>0?'above':'below')+' internal '+(d>0?'lower high ':'higher low ')+miFx(piv.p)+(swept?' after a liquidity sweep':''),
        'Invalidated beyond '+miFx(plan.sl)];
      const tr=miSim(c,nUse,sig,P); sig.trade=tr; if(tr.status==='cancel'){ D.rejs.push({i,d,why:tr.why,time:b.time}); if(D.rejs.length>5) D.rejs.shift(); continue; }
      D.sigs.push(sig); if(tr.status!=='pending'){ tr.cls=sig.cls; D.trades.push(tr); tr.sig=sig; busy=tr.status==='open'?Infinity:tr.exitI; } else busy=nUse; } }
  D.sigs.forEach(s=>{ D.events.push({type:s.d>0?'buy':'sell',dir:s.d,time:s.time,price:s.plan.entry});
    const t=s.trade; if(t&&t.status!=='pending'&&t.status!=='cancel'){ t.hitI.forEach((hi,k)=>{ if(hi>=0) D.events.push({type:'tp',dir:s.d,k:k+1,time:c[hi].time,price:t.plan.tp[k]}); }); if(t.status==='closed'&&(t.reason==='SL'||t.reason==='BE')) D.events.push({type:'sl',dir:s.d,reason:t.reason,time:c[t.exitI].time,price:t.plan.sl}); } });
  D.events.sort((x,y)=>x.time-y.time); D.stats=miStats(D.trades,iv);
  // ---- liquidity engine: swing highs / lows (external = top timeframe, internal = POI + entry timeframe), equal highs / lows, sweeps, what followed ----
  { const src=[{S:T.S,bars:T.bars,sc:'external'},{S:poi.S,bars:poi.bars,sc:'internal'},{S:SE,bars:null,sc:'internal'}], Lq=[], lastAtr=aE[nUse-1]||0;
    src.forEach(q=>{ q.S.all.filter(p=>p.sup==null).slice(-26).forEach(p=>{ const x=q.bars?(p.t==='H'?q.bars[p.i].hiI:q.bars[p.i].loI):p.i, cf=q.bars?q.bars[p.conf].i1:p.conf;
        if(Lq.some(o=>o.t===p.t&&Math.abs(o.p-p.p)<1e-9&&o.x===x)) return; Lq.push({t:p.t,p:p.p,x,cf,sc:q.sc,eq:false,st:'open',swI:-1,res:''}); }); });
    Lq.forEach(o=>{ for(let k=o.cf+1;k<nUse;k++){ const bb=c[k]; if(o.t==='H'?bb.high>o.p:bb.low<o.p){ if(o.t==='H'?bb.close<=o.p:bb.close>=o.p){ o.st='swept'; o.swI=k; } else { o.st='broken'; o.swI=k; } break; } } });
    for(let a=0;a<Lq.length;a++) for(let b2=a+1;b2<Lq.length;b2++){ const A=Lq[a], B=Lq[b2]; if(A.t===B.t&&A.x!==B.x&&Math.abs(A.p-B.p)<=(+P.eqTol||0)*lastAtr){ A.eq=true; B.eq=true; } }
    const W=Math.max(3,Math.round(+P.swpWin)||30);
    Lq.forEach(o=>{ if(o.st!=='swept') return; const ex=o.t==='H'?c[o.swI].high:c[o.swI].low; let res='';
      for(let k=o.swI+1;k<nUse&&k<=o.swI+W;k++){ if(o.t==='H'?c[k].close>ex:c[k].close<ex){ res='failed'; break; } const sh=SE.brk.find(q=>q.dir===(o.t==='H'?-1:1)&&q.to===k&&q.shift); if(sh){ res='shift'; break; } }
      o.res=res||((nUse-1-o.swI)>=W?'none':'wait'); });
    const keep=[]; ['open','swept','broken'].forEach(st=>{ const L=Lq.filter(o=>o.st===st).sort((a,b)=>a.x-b.x); (st==='open'?L.slice(-14):L.slice(-8)).forEach(o=>keep.push(o)); });
    D.liq=keep; const sw=Lq.filter(o=>o.st==='swept').sort((a,b)=>a.swI-b.swI); D.lastSweep=sw.length?sw[sw.length-1]:null; }
  let gaps=0,cnt=0; for(let i=Math.max(1,nUse-500);i<nUse;i++){ const dt=c[i].time-c[i-1].time; cnt++; if(dt>1.5*iv&&dt<2*86400) gaps++; } D.gaps=gaps; D.gapPct=cnt?gaps/cnt*100:0;
  const age=Date.now()/1000-(c[nUse-1].time+iv); D.age=age; D.delayed=age>6*iv&&age<4*86400&&!forming;
  // ---- latest structure events ----
  const lastBrk=(S,L)=>{ const k=S.brk[S.brk.length-1]; return k?{dir:k.dir,shift:k.shift,p:k.p,i:cI(L,k.to)}:null; };
  const bosL=[]; [[T.S,T,'ext'],[Ti,T,'int'],[SE,EN,'entry']].forEach(([S,L,sc])=>{ for(let q=S.brk.length-1;q>=0;q--){ const k=S.brk[q]; if(!k.shift){ bosL.push({sc,tf:L.name,dir:k.dir,p:k.p,i:cI(L,k.to)}); break; } } });
  const mssL=[]; [[T.S,T,'ext'],[Ti,T,'int'],[SE,EN,'entry']].forEach(([S,L,sc])=>{ for(let q=S.brk.length-1;q>=0;q--){ const k=S.brk[q]; if(k.shift){ mssL.push({sc,tf:L.name,dir:k.dir,p:k.p,i:cI(L,k.to)}); break; } } });
  bosL.sort((a,b)=>b.i-a.i); mssL.sort((a,b)=>b.i-a.i); D.lastBos=bosL[0]||null; D.lastMss=mssL[0]||null;
  // ---- live state (last closed candle) ----
  const L0=nUse-1, price=c[N-1].close, atr0=aE[L0], avg0=L0>=120?(cs[L0]-cs[L0-100])/100:NaN, extT=trAt(T,L0), intT=trI(L0), rg0=rngAt(L0);
  const lv={price,extT,intT,warns:[],reasons:[],atr:atr0,tr:ALL.map(L=>({L,t:trAt(L,L0)}))};
  lv.cond=extT===0?'UNCLEAR STRUCTURE':(extT===intT?miTN(extT)+' TREND (internal agrees)':(intT===0?miTN(extT)+' TREND (internal unclear)':miTN(intT)+' PULLBACK WITHIN '+miTN(extT)+' TREND'));
  lv.condCol=extT===0?'#f0b90b':(extT===intT?(extT>0?P.cBuy:P.cSell):'#f0b90b');
  if(rg0){ const eq=(rg0[0]+rg0[1])/2; lv.hi=rg0[0]; lv.lo=rg0[1]; lv.up=rg0[2]; lv.eq=eq; lv.pct=(price-rg0[1])/(rg0[0]-rg0[1])*100; lv.zone=Math.abs(price-eq)<(rg0[0]-rg0[1])*0.01?'EQUILIBRIUM':price>eq?'PREMIUM':'DISCOUNT'; }
  const near=d=>{ let best=null; zones.forEach(z=>{ if(z.d!==d||z.xI>=0) return; const dist=d>0?Math.max(0,price-z.top):Math.max(0,z.bot-price); if(!best||dist<best.dist-1e-12||(Math.abs(dist-best.dist)<1e-12&&z.score>best.z.score)) best={z,dist,st:miSt(z,L0)}; }); return best; };
  lv.zD=near(1); lv.zS=near(-1); lv.clsB=clsOf(1,L0); lv.clsS=clsOf(-1,L0);
  lv.arm=[arms[0]?{d:1,a:arms[0]}:null,arms[1]?{d:-1,a:arms[1]}:null].filter(Boolean).map(o=>{ const p=miLastPiv(SE,o.d>0?'H':'L',o.a.extI,L0); return {d:o.d,z:o.a.z,level:p?p.p:NaN,lh:p?p.lb:'',ext:o.a.ext,cls:o.a.cls}; });
  if(extT===0) lv.warns.push('Unclear market structure: no confirmed external break yet on '+T.name);
  if(avg0>0&&atr0>(+P.volMax||99)*avg0) lv.warns.push('Excessive volatility: ATR '+(atr0/avg0).toFixed(1)+'x its average');
  if((+P.spread||0)>0&&atr0>0&&(+P.spread||0)>(+P.spreadMax||99)*atr0) lv.warns.push('Wide spread compared with the candle range');
  if(D.gapPct>5) lv.warns.push('Missing / unreliable data: '+gaps+' gaps in the last '+cnt+' candles');
  if(D.delayed) lv.warns.push('Delayed data: the last closed candle is '+Math.round(age/60)+' min old');
  if(!zones.some(z=>z.xI<0)) lv.warns.push('No valid supply / demand zone on '+poi.name);
  D.notes.forEach(n=>lv.warns.push(n));
  if(D.rejs.length){ const r=D.rejs[D.rejs.length-1]; if(L0-r.i<=(+P.sigValid||20)) lv.warns.push('Setup rejected: '+r.why); }
  const ls=D.sigs[D.sigs.length-1], tr=ls&&ls.trade, active=ls&&tr&&tr.status!=='cancel'&&tr.status!=='closed'&&(tr.status==='open'||(L0-ls.n)<=(+P.sigValid||20));
  const hard=lv.warns.filter(w=>/^(Unclear|Excessive|Missing|Delayed)/.test(w));
  lv.sideTxt=d=>{ const w=near(d), cl=d>0?lv.clsB:lv.clsS; if(!w) return 'none (no valid '+(d>0?'demand':'supply')+' zone)'; const at=w.dist<=appr*atr0, side=(d>0&&lv.zone==='PREMIUM')||(d<0&&lv.zone==='DISCOUNT');
    return (at?'AT ':(w.dist/atr0).toFixed(1)+' ATR to ')+miFx(w.z.bot)+' - '+miFx(w.z.top)+' ('+MI_STN[w.st]+', '+(cl==='trend'?'trend-following':cl==='counter'?'countertrend':'unconfirmed: direction not supported')+(side&&P.reqPD?', wrong side of 50%':'')+')'; };
  if(active){ lv.state=ls.d>0?'BUY':'SELL'; lv.reasons=ls.reasons.slice(); lv.sig=ls; if(ls.mode==='manual') lv.reasons.push('Manual mode: confirm the entry yourself'); if(ls.mode==='retest'&&tr.status==='pending') lv.reasons.push('Waiting for a retest of '+miFx(ls.level)); }
  else if(hard.length){ lv.state='NO TRADE'; lv.reasons=hard.slice(0,3); }
  else { lv.state='WAIT';
    lv.reasons.push('External: '+miTN(extT)+' ('+T.name+'), internal: '+miTN(intT));
    lv.reasons.push(lv.zone?'Location: '+lv.zone+' ('+miPc(lv.pct)+')'+(lv.zone==='PREMIUM'?': only sells qualify':lv.zone==='DISCOUNT'?': only buys qualify':''):'Location: no valid price range yet');
    const want=lv.zone==='PREMIUM'?lv.zS:lv.zone==='DISCOUNT'?lv.zD:null;
    if(want) lv.reasons.push(want.dist<=appr*atr0?((want.z.d>0?'Demand':'Supply')+' zone reached ('+MI_STN[want.st]+'), waiting for the shift'):((want.z.d>0?'Demand':'Supply')+' zone not reached: '+(want.dist/atr0).toFixed(1)+' ATR away')); else if(lv.zone) lv.reasons.push('No valid '+(lv.zone==='PREMIUM'?'supply':'demand')+' zone for this side');
    lv.arm.forEach(o=>{ lv.reasons.push('Armed '+(o.d>0?'BUY':'SELL')+' ('+(o.cls==='trend'?'trend-following':'countertrend')+'): waiting for a close '+(o.d>0?'above ':'below ')+(isFinite(o.level)?miFx(o.level):'the internal '+(o.d>0?'lower high':'higher low'))+(setup&&P.reqSetup&&trAt(setup,L0)!==o.d?' and a '+setup.name+' shift':'')); });
    if(lv.zone&&!lv.arm.length){ const d=lv.zone==='PREMIUM'?-1:1; if(lv.zone!=='EQUILIBRIUM'&&!(d>0?lv.clsB:lv.clsS)) lv.reasons.push('Unconfirmed: '+(d>0?'buys':'sells')+' are not supported by the structure (external '+miTN(extT).toLowerCase()+', internal '+miTN(intT).toLowerCase()+')'); }
    if(!lv.arm.length) lv.reasons.push('Entry confirmation missing: no '+miTf(iv)+' market shift'); }
  // ---- plain-language narrative, built only from the numbers above ----
  { const N1=[], tn=v=>miTN(v).toLowerCase();
    N1.push(T.name+' structure is '+tn(extT)+(D.lastBos&&D.lastBos.sc==='ext'?' (last external BOS '+(D.lastBos.dir>0?'up':'down')+' at '+miFx(D.lastBos.p)+')':'')+'.');
    if(intT!==extT&&intT!==0&&extT!==0) N1.push('The '+T.name+' internal structure is '+tn(intT)+': a '+tn(intT)+' pullback inside a '+tn(extT)+' trend, not a reversal.'); else if(intT===extT&&extT!==0) N1.push('Internal structure agrees.');
    const fr=D.frac[D.frac.length-1]; if(fr&&fr.i>=L0-600){ if(fr.kind==='shift') N1.push('A fractal '+(fr.dir>0?'bullish':'bearish')+' shift appeared on '+fr.child+' inside the '+fr.parent+' chart; '+(fr.htf==='confirmed'?fr.parent+' has also broken, so the reversal is confirmed.':fr.parent+' has not broken yet, so it is only a lower-timeframe shift, not a reversal.')); else N1.push('On '+fr.child+' the move has resumed '+(fr.dir>0?'up':'down')+' in line with the '+fr.parent+' trend.'); }
    const sw=D.lastSweep; if(sw&&L0-sw.swI<=300) N1.push((sw.t==='H'?'Buy-side':'Sell-side')+' liquidity at '+miFx(sw.p)+' was swept'+(sw.res==='shift'?' and a '+miTf(iv)+' shift followed.':sw.res==='failed'?' but price kept going: no reversal.':sw.res==='wait'?'; waiting to see if a shift follows.':' with no shift.'));
    if(lv.zone) N1.push('Price trades in '+lv.zone.toLowerCase()+(isFinite(lv.pct)?' ('+miPc(lv.pct)+')':'')+'.');
    if(lv.state==='BUY'||lv.state==='SELL') N1.push('A '+lv.state+' setup is confirmed ('+(lv.sig.cls==='trend'?'trend-following':'countertrend')+'): plan stop beyond '+miFx(lv.sig.plan.sl)+'.');
    else if(lv.state==='NO TRADE') N1.push('Stay out: '+lv.reasons[0]+'.');
    else { const side=lv.zone==='PREMIUM'?-1:lv.zone==='DISCOUNT'?1:0, w=side>0?lv.zD:side<0?lv.zS:null;
      if(w) N1.push('Preferred approach: '+(w.dist<=appr*atr0?'price is at the '+(side>0?'demand':'supply')+' zone, wait for the '+miTf(iv)+' '+(side>0?'bullish':'bearish')+' close beyond the internal '+(side>0?'lower high':'higher low')+'.':'wait for a move into the '+(side>0?'demand':'supply')+' zone '+miFx(w.z.bot)+' - '+miFx(w.z.top)+', then look for '+miTf(iv)+' '+(side>0?'bullish':'bearish')+' confirmation.'));
      else N1.push('Preferred approach: wait; no approved location yet.'); }
    lv.narr=N1.join(' '); }
  D.live=lv;
  const rl=rS.live; if(manual) D.fib={hi:+P.manHi,lo:+P.manLo,up:true,i0:Math.max(0,nUse-200),i1:nUse-1}; else if(rl.length>=2){ const a=rl[rl.length-1], q=rl[rl.length-2], px=p=>rL.bars[p.i]?(p.t==='H'?rL.bars[p.i].hiI:rL.bars[p.i].loI):0; D.fib={hi:Math.max(a.p,q.p),lo:Math.min(a.p,q.p),up:a.t==='H',i0:px(q),i1:px(a)}; }
  D.ok=true; return D; }
let miMem=null;
function miGet(c,p){ const N=c.length, iv=N>1?c[N-1].time-c[N-2].time:0, forming=N>0&&iv>0&&(c[N-1].time+iv)*1000>Date.now();
  const key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+forming+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(miMem&&miMem.k===key) return miMem.D;
  let D; try{ D=miCompute(c,p,forming); }catch(e){ console.error('msi calc failed',e); D={N,ok:false,msg:'MSI calculation error: '+(e&&e.message),sigs:[],trades:[],events:[]}; }
  miMem={k:key,D}; try{ if(D.ok&&D.stats&&D.stats.n){ const k='rc_msi_stats', o=JSON.parse(localStorage.getItem(k)||'{}'); o[sym[0]+' '+tf[0]+' '+(D.td?'TD':'SC')]={n:D.stats.n,wr:D.stats.wr,avgR:D.stats.avgR,pf:isFinite(D.stats.pf)?D.stats.pf:null,t:Date.now()}; localStorage.setItem(k,JSON.stringify(o)); } }catch(e){} return D; }
IND.msi={label:'Reinblacks Market Structure Intelligence (MSI)',title:'Reinblacks Market Structure Intelligence (MSI) \u00b7 structure, fractals, liquidity, zones, entries, risk',cat:'Trend',nm:()=>'Reinblacks MSI',p:Object.assign({},MI_DEF),cols:['#e5121a'],
  fields:[['mode','sel','Analysis mode',{opts:MI_MODE}],
    ['sTrend','sel','Scalping: trend timeframe (Auto = 12 x chart candle = 1H on 5M)',{opts:Object.keys(MI_TFS)}],['sLoc','sel','Scalping: location timeframe (Auto = 3 x chart candle = 15M on 5M)',{opts:Object.keys(MI_TFS)}],
    ['tdMajor','sel','Top-down: major trend / external structure timeframe',{opts:Object.keys(MI_TFS)}],['tdPoi','sel','Top-down: internal structure + points of interest timeframe',{opts:Object.keys(MI_TFS)}],['tdInter','sel','Top-down: fractal / intermediate timeframe',{opts:Object.keys(MI_TFS)}],['tdSetup','sel','Top-down: setup confirmation timeframe',{opts:Object.keys(MI_TFS)}],
    ['extLen','num','External swing sensitivity (candles each side)',{min:1,max:30}],['intLen','num','Internal swing sensitivity (top timeframe)',{min:1,max:15}],['midLen','num','Lower timeframes swing sensitivity (zones, fractal, setup)',{min:1,max:15}],['exLen','num','Entry timeframe internal swing sensitivity',{min:1,max:10}],
    ['rangeSrc','sel','Premium / discount range from',{opts:MI_RS}],['manHi','num','Manual range: high (0 = off)',{min:0,max:1e9,step:0.01}],['manLo','num','Manual range: low',{min:0,max:1e9,step:0.01}],
    ['zoneBounds','sel','Zone boundaries',{opts:MI_ZB}],['impMult','num','Zone: minimum impulse (x ATR)',{min:0,max:10,step:0.1}],['maxZoneAtr','num','Zone: maximum height (x ATR)',{min:0.5,max:20,step:0.5}],['zoneStates','sel','Zones allowed for a setup',{opts:MI_ZS}],['apprAtr','num','Approach distance to a zone (x ATR)',{min:0,max:5,step:0.1}],
    ['tradeTypes','sel','Trade types allowed',{opts:MI_TT}],['reqPD','chk','Require premium (sell) / discount (buy)'],['reqSetup','chk','Top-down: require the setup timeframe to shift first'],['armWin','num','Wait for the shift for N candles after the last zone touch',{min:3,max:300}],['reqLH','chk','Require a real lower high (buy) / higher low (sell) as the level'],['reqSweep','chk','Require a liquidity sweep before the shift'],['cool','num','Candles to wait after a setup on the same side',{min:1,max:300}],['sigValid','num','A setup stays active for N candles',{min:1,max:300}],
    ['eqTol','num','Equal highs / lows tolerance (x ATR)',{min:0,max:1,step:0.01}],['swpWin','num','After a sweep, look for a shift for N candles',{min:3,max:300}],
    ['entryMode','sel','Entry mode',{opts:MI_EM}],['rtWin','num','Retest entry: wait up to N candles',{min:1,max:300}],['slBasis','sel','Stop-loss placement',{opts:MI_SLB}],['slBuf','num','Stop-loss buffer (x ATR)',{min:0,max:5,step:0.05}],
    ['risk','num','Risk per trade (%) 0.25 to 2',{min:0.25,max:2,step:0.25}],['balance','num','Account balance',{min:1,max:1e9,step:100}],['contract','num','Contract size: units per lot',{min:0.0001,max:1e9,step:1}],['lotStep','num','Minimum lot step (0 = no rounding)',{min:0,max:100,step:0.01}],
    ['tpMode','sel','Targets',{opts:MI_TPM}],['tp1','num','TP1 (R multiple)',{min:0.1,max:20,step:0.1}],['tp2','num','TP2 (R multiple)',{min:0.1,max:30,step:0.1}],['tp3','num','TP3 (R multiple)',{min:0.1,max:50,step:0.1}],
    ['p1','num','Partial close at TP1 (%)',{min:0,max:100,step:5}],['p2','num','Partial close at TP2 (%)',{min:0,max:100,step:5}],['be','chk','Move stop to break-even after TP1'],['minRR','num','Minimum reward-to-risk to TP1',{min:0,max:10,step:0.1}],['maxHold','num','Backtest: close a trade after N candles',{min:5,max:2000}],
    ['volMax','num','Block when ATR is above N x its average',{min:1,max:10,step:0.1}],['spreadMax','num','Block when spread is above this share of the stop distance',{min:0,max:2,step:0.05}],
    ['spread','num','Backtest: spread (price units)',{min:0,max:1e6,step:0.01}],['slip','num','Backtest: slippage per side (price units)',{min:0,max:1e6,step:0.01}],['comm','num','Backtest: commission per side (% of price)',{min:0,max:5,step:0.001}],
    ['candleTheme','sel','Candle theme',{opts:MI_CT}],['showFib','chk','Premium / discount fibonacci'],['showZones','chk','Supply / demand zones'],['showInval','chk','Show invalidated zones'],['maxZones','num','Zones drawn',{min:2,max:40}],
    ['showExt','chk','External structure (BOS, MSS, HH HL LH LL)'],['showInt','chk','Internal structure'],['showFrac','chk','Fractal shift labels'],['showExec','chk','Entry-timeframe market shift (MSS)'],['showLbl','chk','Structure labels'],['maxStruct','num','Structure items drawn',{min:5,max:200}],
    ['showLiq','chk','Liquidity: unswept levels (BSL / SSL / EQH / EQL)'],['showSwept','chk','Liquidity: swept levels'],['showLevels','chk','Trade levels (entry / SL / TP1-TP3)'],['lvKeep','num','Setups whose levels stay on the chart',{min:1,max:10}],['ext','num','Level line length (candles)',{min:5,max:300}],
    ['dash','sel','Dashboard',{opts:MI_DASH}],['pOv','sel','Market overview + timeframe alignment position',{opts:MI_POS}],['pSt','sel','Structural intelligence + narrative position',{opts:MI_POS}],['pTr','sel','Trading opportunities position',{opts:MI_POS}],['showNarr','chk','Market narrative'],['showStats','chk','Backtest statistics panel'],['statsPos','sel','Statistics position',{opts:MI_POS}],
    ['cBuy','col','Buy / bullish / discount'],['cSell','col','Sell / bearish / premium'],['cExt','col','External structure text'],['cInt','col','Internal structure'],['cLvl','col','Level colour'],
    ['alSig','chk','Alert: BUY / SELL setup'],['alTP','chk','Alert: target / stop hit'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},MI_DEF,p), D=miGet(c,q), mk=[];
    if(D.ok) D.sigs.slice(-60).forEach(s=>{ if(s.trade&&s.trade.status==='cancel') return; mk.push({time:s.time,position:s.d>0?'belowBar':'aboveBar',color:s.d>0?q.cBuy:q.cSell,shape:s.d>0?'arrowUp':'arrowDown',text:s.d>0?'BUY':'SELL',size:.9,keep:true}); });
    return {mk,boxes:[{type:'msiview',pts:[],o:q,D}],labels:[],events:D.ok?D.events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='msiview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, n0=candles.length; if(!D||n0<5) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    const ln=(x1,y1,x2,y2,col,w,dash)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke(); cx.setLineDash([]); };
    const tx=(t,x,y,col,fs,al,bold)=>{ cx.font=(bold?'bold ':'')+fs+'px system-ui'; cx.fillStyle=col; cx.textAlign=al||'left'; cx.fillText(t,x,y); };
    const pill=(t,x,y,bg)=>{ cx.font='bold 9px system-ui'; const w=cx.measureText(t).width+8; let lx=x+3; if(lx+w>W-2) lx=Math.max(2,x-w-3); cx.fillStyle=bg; cx.beginPath(); if(cx.roundRect) cx.roundRect(lx,y-6,w,12,3); else cx.rect(lx,y-6,w,12); cx.fill(); cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText(t,lx+4,y+0.5); };
    const sx=(()=>{ const xa=X(n0-1), xb=X(n0-2); return (xa!=null&&xb!=null)?Math.abs(xa-xb):6; })();
    if(p.candleTheme!==MI_CT[2]){ const wb=p.candleTheme===MI_CT[1], bw=Math.max(1,Math.min(sx*.72,40)), up=wb?'#ffffff':'#8a8f9c', dn=wb?'#000000':'#14161c', ub=wb?'#9aa0ad':'#cfd3dc', db=wb?'#9aa0ad':'#6b7080';
      for(let i=0;i<n0;i++){ const x=X(i); if(x==null||x<-bw-4||x>W+bw+4) continue; const k=candles[i], yo=Y(k.open), yc=Y(k.close), yh=Y(k.high), yl=Y(k.low); if(yo==null||yc==null||yh==null||yl==null) continue;
        const bull=k.close>=k.open, col=bull?ub:db; ln(x,yh,x,yl,col,1); const top=Math.min(yo,yc), hh=Math.max(1,Math.abs(yc-yo)); cx.fillStyle=bull?up:dn; cx.fillRect(x-bw/2,top,bw,hh); if(bw>=3){ cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(x-bw/2+.5,top+.5,bw-1,Math.max(0,hh-1)); } } }
    if(!D.ok){ tx(D.msg||'MSI: no data',8,Hh-40,'#f0b90b',11,'left',true); cx.restore(); return; }
    const lv=D.live, T=D.LV[0];
    // 1) premium / discount
    if(p.showFib&&D.fib){ const f=D.fib, rg=f.hi-f.lo, x0=Math.max(-4,X(f.i0)==null?0:X(f.i0)), yH=Y(f.hi), yL=Y(f.lo), yE=Y((f.hi+f.lo)/2);
      if(yH!=null&&yL!=null&&yE!=null){ cx.fillStyle=miA(p.cSell,.07); cx.fillRect(x0,Math.min(yH,yE),W-x0,Math.abs(yE-yH)); cx.fillStyle=miA(p.cBuy,.07); cx.fillRect(x0,Math.min(yE,yL),W-x0,Math.abs(yL-yE));
        [0,0.382,0.5,0.618,0.65,0.786,1].forEach(r=>{ const pr=f.up?f.hi-r*rg:f.lo+r*rg, y=Y(pr); if(y==null) return; ln(x0,y,W,y,r===0.5?'rgba(255,255,255,.75)':'rgba(190,195,208,.35)',r===0.5?1.2:1,r===0.5?[6,3]:[2,4]); tx((r===0.5?'0.5 EQ ':r.toFixed(3)+' ')+miFx(pr),W-4,y-6,r===0.5?'rgba(255,255,255,.9)':'rgba(190,195,208,.7)',9,'right'); });
        tx('PREMIUM',x0+4,Math.min(yH,yE)+9,miA(p.cSell,.9),9,'left',true); tx('DISCOUNT',x0+4,Math.max(yL,yE)-9,miA(p.cBuy,.9),9,'left',true); } }
    // 2) supply / demand (zones that caused a shift rank first)
    if(p.showZones){ const fs=z=>z.xI>=0?3:z.mI>=0?2:z.tI>=0?1:0, mz=Math.max(1,Math.round(+p.maxZones)||10), val=D.zones.filter(z=>z.xI<0).sort((a,b)=>b.score-a.score).slice(0,mz), inv=p.showInval?D.zones.filter(z=>z.xI>=0).slice(-3):[], AL=[.2,.15,.1,.05];
      inv.concat(val).forEach(z=>{ const st=fs(z), x0=X(z.s0), x1=z.xI>=0?X(z.xI):W-2, y1=Y(z.top), y2=Y(z.bot); if(x0==null||x1==null||y1==null||y2==null||x1<0||x0>W) return; const xs=Math.max(-4,x0), col=z.d>0?p.cBuy:p.cSell;
        cx.fillStyle=miA(col,AL[st]); cx.fillRect(xs,Math.min(y1,y2),Math.max(1,x1-xs),Math.max(1,Math.abs(y2-y1))); cx.strokeStyle=miA(col,st===3?.35:.8); cx.lineWidth=1; cx.setLineDash(st===3?[3,3]:[]); cx.strokeRect(xs+.5,Math.min(y1,y2)+.5,Math.max(1,x1-xs),Math.max(1,Math.abs(y2-y1))); cx.setLineDash([]);
        tx((z.d>0?'DEMAND':'SUPPLY')+' \u00b7 '+MI_STN[st]+(z.shift?' \u00b7 MSS':''),xs+4,Math.min(y1,y2)+8,miA(col,st===3?.5:.95),9,'left',true); }); }
    // 3) structure: external / internal on the top timeframe, entry shifts
    const mS=Math.max(5,Math.round(+p.maxStruct)||24), pX=(bars,q)=>bars?(q.t==='H'?bars[q.i].hiI:bars[q.i].loI):q.i;
    const brkDraw=(St,bars,ext,onlyShift)=>{ St.brk.filter(k=>!onlyShift||k.shift).slice(-mS).forEach(k=>{ const xs=X(bars?(k.dir>0?bars[k.sw].hiI:bars[k.sw].loI):k.sw), xe=X(bars?bars[k.to].i1:k.to), y=Y(k.p); if(xs==null||xe==null||y==null||xe<-20||xs>W+20) return;
        const col=k.dir>0?p.cBuy:p.cSell; ln(Math.max(-4,xs),y,xe,y,ext?'rgba(255,255,255,.92)':miA(p.cInt,.8),ext?1.6:1,ext?null:[3,3]);
        if(p.showLbl){ const t=onlyShift?'MSS':(k.shift?'MSS':'BOS'); tx(t,(Math.max(-4,xs)+xe)/2,k.dir>0?y-6:y+7,miA(col,ext?1:.8),ext?10:8,'center',ext||onlyShift); } }); };
    const pivDraw=(St,bars,ext)=>{ if(!p.showLbl) return; St.all.filter(q=>q.sup==null&&q.lb.length===2).slice(-mS).forEach(q=>{ const x=X(pX(bars,q)), y=Y(q.p); if(x==null||y==null||x<-10||x>W+10) return; tx(q.lb,x,q.t==='H'?y-8:y+9,ext?p.cExt:p.cInt,ext?10:8,'center',ext); }); };
    if(p.showInt){ brkDraw(D.Ti,T.bars,false,false); pivDraw(D.Ti,T.bars,false); }
    if(p.showExt){ brkDraw(T.S,T.bars,true,false); pivDraw(T.S,T.bars,true); }
    if(p.showExec) brkDraw(D.SE,null,false,true);
    // 4) fractal shifts
    if(p.showFrac) D.frac.filter(e=>e.kind==='shift').slice(-5).forEach(e=>{ const x=X(e.i), y=Y(e.price); if(x==null||y==null||x<-30||x>W+30) return; const col=e.dir>0?p.cBuy:p.cSell, t='FRACTAL '+(e.dir>0?'BULL':'BEAR')+' '+e.child+' in '+e.parent+(e.htf==='confirmed'?' \u2713 HTF':' \u00b7 LTF only');
      cx.fillStyle=miA(col,.9); cx.beginPath(); cx.arc(x,y,3,0,6.3); cx.fill(); tx(t,x+5,e.dir>0?y+12:y-12,miA(col,.95),8,'left',true); });
    // 5) liquidity: unswept (solid dashed line to the edge) and swept (stops at the sweep, marked)
    if(D.liq) D.liq.forEach(q=>{ const x=X(q.x), y=Y(q.p); if(x==null||y==null) return; const nm=(q.t==='H'?(q.eq?'EQH':'BSL'):(q.eq?'EQL':'SSL'))+(q.sc==='external'?' ext':'');
      if(q.st==='open'){ if(!p.showLiq||x>W) return; ln(Math.max(-4,x),y,W,y,'rgba(154,160,173,.5)',1,[2,4]); tx(nm,W-4,y-5,'rgba(154,160,173,.85)',8,'right'); }
      else if(p.showSwept){ const xe=X(q.swI); if(xe==null||xe<-10) return; ln(Math.max(-4,x),y,xe,y,'rgba(154,160,173,.3)',1,[1,3]); cx.fillStyle=q.st==='swept'?'#f0b90b':'rgba(154,160,173,.6)'; cx.beginPath(); cx.arc(xe,y,2.5,0,6.3); cx.fill();
        tx((q.st==='swept'?nm+' SWEPT'+(q.res==='shift'?' \u2192 shift':q.res==='failed'?' \u2192 no reversal':''):nm+' broken'),xe+4,y+(q.t==='H'?-7:8),q.st==='swept'?'#f0b90b':'rgba(154,160,173,.6)',8,'left'); } });
    // 6) trade levels
    if(p.showLevels&&D.sigs.length){ const keep=Math.max(1,Math.round(+p.lvKeep)||2), len=Math.max(5,Math.round(+p.ext)||40);
      D.sigs.filter(s=>!(s.trade&&s.trade.status==='cancel')).slice(-keep).forEach(s=>{ const t=s.trade, pl=(t&&t.plan)||s.plan, i0=(t&&t.entryI!=null)?t.entryI:s.n, x0=X(i0); if(x0==null) return; const x1=(t&&t.status==='closed'&&t.exitI>=0)?X(t.exitI):x0+len*sx; if(x1==null) return;
        const yE=Y(pl.entry), yS=Y(pl.sl), y1=Y(pl.tp[0]), y2=Y(pl.tp[1]), y3=Y(pl.tp[2]); if(yE==null||yS==null||y1==null||y2==null||y3==null||x1<0||x0>W) return;
        cx.fillStyle=miA(p.cSell,.16); cx.fillRect(x0,Math.min(yS,yE),Math.max(1,x1-x0),Math.abs(yE-yS)); cx.fillStyle=miA(p.cBuy,.12); cx.fillRect(x0,Math.min(yE,y3),Math.max(1,x1-x0),Math.abs(y3-yE));
        ln(x0,yS,x1,yS,miA(p.cSell,1),1.6); ln(x0,yE,x1,yE,'rgba(255,255,255,.9)',1,[5,3]); [y1,y2,y3].forEach(y=>ln(x0,y,x1,y,miA(p.cBuy,.9),1,[2,3]));
        pill('SL '+miFx(pl.sl),x1,yS,miA(p.cSell,.9)); pill('Entry '+miFx(pl.entry),x1,yE,'rgba(90,96,112,.95)'); pill('TP1 '+miFx(pl.tp[0]),x1,y1,miA(p.cBuy,.85)); pill('TP2 '+miFx(pl.tp[1]),x1,y2,miA(p.cBuy,.85)); pill('TP3 '+miFx(pl.tp[2]),x1,y3,miA(p.cBuy,.85));
        const ly=Y(s.level); if(ly!=null){ ln(Math.max(-4,x0-sx*12),ly,x0,ly,p.cLvl,1,[2,2]); tx(s.d>0?'LH broken':'HL broken',Math.max(2,x0-sx*12),ly-6,p.cLvl,8,'left'); }
        if(t&&t.status==='closed') pill(t.reason+' '+(t.R>=0?'+':'')+t.R.toFixed(2)+'R',x1,(s.d>0?Math.min(yS,y3):Math.max(yS,y3))+(s.d>0?-14:14),t.R>0?miA(p.cBuy,.95):miA(p.cSell,.95)); }); }
    // 7) dashboard panels
    const m=6, f=10, rh=13;
    const panel=(pos,title,rows)=>{ const maxW=Math.min(W-2*m,285), L=[]; cx.font=f+'px system-ui';
      rows.forEach(r=>{ if(r.n!==undefined){ cx.font=f+'px system-ui'; let line=''; String(r.n).split(' ').forEach(wd=>{ const t=line?line+' '+wd:wd; if(cx.measureText(t).width>maxW-18&&line){ L.push({n:line,c:r.c}); line=wd; } else line=t; }); if(line) L.push({n:line,c:r.c}); } else L.push(r); });
      const lim=Math.max(6,Math.floor((Hh-80)/rh*0.62)); if(L.length>lim){ L.length=lim-1; L.push({n:'...',c:'rgba(230,232,238,.5)'}); }
      cx.font='bold '+f+'px system-ui'; let w=cx.measureText(title).width;
      L.forEach(r=>{ if(r.k!==undefined){ cx.font=f+'px system-ui'; const a=cx.measureText(r.k).width; cx.font='bold '+f+'px system-ui'; w=Math.max(w,a+cx.measureText(r.v).width+22); } else if(r.n!==undefined){ cx.font=f+'px system-ui'; w=Math.max(w,cx.measureText(r.n).width); } else { cx.font='bold 9px system-ui'; w=Math.max(w,cx.measureText(r.h).width); } });
      const pw=Math.min(maxW,w+18), ph=(L.length+1)*rh+8, x0=/Left/.test(pos)?m:W-pw-m, y0=/Top/.test(pos)?m+34:Hh-ph-m-24;
      cx.fillStyle='rgba(10,13,20,.9)'; cx.fillRect(x0,y0,pw,ph); cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph);
      tx(title,x0+8,y0+rh/2+3,'#e6e8ee',f,'left',true); let y=y0+rh*1.5+5;
      L.forEach(r=>{ if(r.h!==undefined){ tx(r.h,x0+8,y+rh/2-1,'#e5121a',9,'left',true); } else if(r.n!==undefined){ tx(r.n,x0+8,y+rh/2-1,r.c||'rgba(230,232,238,.8)',f,'left'); } else { tx(r.k,x0+8,y+rh/2-1,'rgba(230,232,238,.6)',f,'left'); tx(r.v,x0+pw-8,y+rh/2-1,r.c||'#e6e8ee',f,'right',true); } y+=rh; }); };
    const TC=v=>v>0?p.cBuy:v<0?p.cSell:'#f0b90b', iv=D.iv, eN=miTf(iv), ago=i=>{ const s=(D.nUse-1-i)*iv; return s<5400?Math.round(s/60)+'m ago':s<172800?(s/3600).toFixed(0)+'h ago':(s/86400).toFixed(0)+'d ago'; };
    if(p.dash!==MI_DASH[2]&&lv){ const full=p.dash===MI_DASH[0];
      if(full){ const R=[{h:'MARKET OVERVIEW'},{k:'Instrument',v:sym[0]+' \u00b7 '+tf[0]},{k:'Price',v:miFx(lv.price)},{k:'Mode',v:D.td?'TOP-DOWN':'SCALPING'},{k:'External ('+T.name+')',v:miTN(lv.extT),c:TC(lv.extT)},{k:'Internal ('+T.name+')',v:miTN(lv.intT),c:TC(lv.intT)},{n:lv.cond,c:lv.condCol},
          {k:'Premium / discount',v:lv.zone?lv.zone+(isFinite(lv.pct)?(lv.pct>100?' (>100%)':lv.pct<0?' (<0%)':' '+lv.pct.toFixed(0)+'%'):''):'-',c:lv.zone==='PREMIUM'?p.cSell:lv.zone==='DISCOUNT'?p.cBuy:'#e6e8ee'},{h:'TIMEFRAME ALIGNMENT'}];
        lv.tr.forEach(o=>R.push({k:o.L.name+' '+(o.L.entry?'entry':o.L.role.toLowerCase()),v:miTN(o.t),c:TC(o.t)}));
        const al=lv.tr.filter(o=>o.t!==0), same=al.length&&al.every(o=>o.t===al[0].t); R.push({n:same&&al.length>1?'All timeframes agree: '+miTN(al[0].t).toLowerCase():'Timeframes are mixed: wait for alignment or trade the pullback only at a valid location',c:same?TC(al[0].t):'#f0b90b'});
        panel(p.pOv,'MSI \u00b7 Overview',R);
        const S=[{h:'STRUCTURAL INTELLIGENCE'}], dn=e=>e?(e.dir>0?'BULL ':'BEAR ')+e.tf+' '+(e.sc==='ext'?'ext ':e.sc==='int'?'int ':'')+miFx(e.p)+' \u00b7 '+ago(e.i):'-';
        S.push({k:'Latest BOS',v:dn(D.lastBos),c:D.lastBos?TC(D.lastBos.dir):null},{k:'Latest MSS',v:dn(D.lastMss),c:D.lastMss?TC(D.lastMss.dir):null});
        const sw=D.lastSweep; S.push({k:'Latest sweep',v:sw?(sw.t==='H'?'BSL ':'SSL ')+miFx(sw.p)+' \u00b7 '+ago(sw.swI):'-',c:sw?'#f0b90b':null}); if(sw) S.push({n:sw.res==='shift'?'A shift followed the sweep':sw.res==='failed'?'Price continued: sweep was not a reversal':sw.res==='wait'?'Waiting for a shift after the sweep':'No shift followed the sweep',c:'rgba(230,232,238,.7)'});
        if(isFinite(lv.hi)) S.push({k:'Range high / low',v:miFx(lv.hi)+' / '+miFx(lv.lo)});
        const fr=D.frac.slice(-3).reverse(); if(fr.length){ S.push({h:'FRACTAL EVENTS'}); fr.forEach(e=>S.push({n:(e.kind==='shift'?'Fractal '+(e.dir>0?'bullish':'bearish')+' shift: ':'Resume '+(e.dir>0?'up: ':'down: '))+e.child+' in '+e.parent+(e.kind==='shift'?(e.htf==='confirmed'?' - HTF reversal confirmed':' - LTF only, '+e.parent+' not broken'):'')+' \u00b7 '+ago(e.i),c:e.kind==='shift'?TC(e.dir):'rgba(230,232,238,.65)'})); }
        else S.push({n:'No fractal events in the loaded history.',c:'rgba(230,232,238,.5)'});
        if(p.showNarr){ S.push({h:'MARKET NARRATIVE'},{n:lv.narr,c:'rgba(230,232,238,.88)'}); }
        panel(p.pSt,'MSI \u00b7 Structure',S); }
      const O=[{h:'SIGNAL'},{k:'Status',v:lv.state,c:lv.state==='BUY'?p.cBuy:lv.state==='SELL'?p.cSell:lv.state==='NO TRADE'?'#f0b90b':'#e6e8ee'}]; lv.reasons.forEach(r=>O.push({n:'\u2022 '+r}));
      if(full){ O.push({h:'TRADING OPPORTUNITIES'},{n:'Buy location: '+lv.sideTxt(1),c:p.cBuy},{n:'Sell location: '+lv.sideTxt(-1),c:p.cSell},{k:'Entry confirmation',v:lv.sig?'CONFIRMED':lv.arm.length?'ARMED '+(lv.arm[0].d>0?'BUY':'SELL'):'MISSING',c:lv.sig?(lv.sig.d>0?p.cBuy:p.cSell):lv.arm.length?'#f0b90b':'rgba(230,232,238,.7)'});
        if(lv.warns.length&&lv.state!=='NO TRADE'){ O.push({h:'FILTERS'}); lv.warns.slice(0,4).forEach(w=>O.push({n:'! '+w,c:'#f0b90b'})); } }
      if(lv.sig){ const s=lv.sig, pl=(s.trade&&s.trade.plan)||s.plan; O.push({h:'TRADE PLANNER'},{k:'Type',v:s.cls==='trend'?'Trend-following':'Countertrend'},{k:'Entry'+(s.mode==='retest'?' (retest)':''),v:miFx(pl.entry)},{k:'Stop loss',v:miFx(pl.sl),c:p.cSell},{k:'SL distance',v:miFx(pl.risk)},{k:'TP1 / R',v:miFx(pl.tp[0])+' / '+pl.rr[0].toFixed(2),c:p.cBuy},{k:'TP2 / R',v:miFx(pl.tp[1])+' / '+pl.rr[1].toFixed(2),c:p.cBuy},{k:'TP3 / R',v:miFx(pl.tp[2])+' / '+pl.rr[2].toFixed(2),c:p.cBuy},
          {k:'Risk',v:pl.rp+'% = '+pl.cash.toFixed(2)},{k:'Position size',v:(pl.units>=100?pl.units.toFixed(1):pl.units.toFixed(4))+' units / '+pl.lots.toFixed(pl.lots>=1?2:4)+' lots'},{n:'Partials '+(+p.p1||0)+'% TP1, '+(+p.p2||0)+'% TP2, rest TP3'+(p.be?', stop to break-even after TP1':''),c:'rgba(230,232,238,.6)'}); }
      O.push({n:'Data: app chart feed \u00b7 '+D.nUse+' closed candles \u00b7 '+(D.gapPct>5?D.gaps+' gaps':'no gaps')+' \u00b7 analysis only, no orders are sent',c:'rgba(230,232,238,.45)'});
      panel(p.pTr,'MSI \u00b7 Opportunities',O); }
    if(p.showStats&&D.stats){ const st=D.stats, R=[], dur=sec=>{ if(!(sec>=0)) return '-'; const mi=sec/60; return mi<90?mi.toFixed(0)+' min':(mi/60).toFixed(1)+' h'; }, fm=(v,dg)=>(v==null||!isFinite(v))?'-':v.toFixed(dg);
      if(!st.n) R.push({n:'No completed trades in the loaded history.'}); else { R.push({k:'Total trades',v:st.n+'  (W '+st.w+' / L '+st.l+')'},{k:'Win rate',v:fm(st.wr,1)+'%'},{k:'Avg R per trade',v:fm(st.avgR,2)+'R',c:st.avgR>0?p.cBuy:p.cSell},{k:'Avg reward-to-risk',v:fm(st.rr,2)},{k:'Profit factor',v:isFinite(st.pf)?fm(st.pf,2):(st.gp>0?'inf':'-')},{k:'Max drawdown',v:fm(st.dd,2)+'R (~'+fm(st.dd*miClamp(+p.risk||1,0.25,2),1)+'%)'},{k:'Avg holding time',v:dur(st.avgHold)});
        R.push({h:'TREND vs COUNTERTREND'}); [['trend','Trend-following'],['counter','Countertrend']].forEach(([k,nm])=>{ const q=st.cls[k]; R.push({k:nm,v:q?q.n+' \u00b7 '+(q.w/q.n*100).toFixed(0)+'% \u00b7 '+(q.R>=0?'+':'')+q.R.toFixed(1)+'R':'0',c:q?(q.R>=0?p.cBuy:p.cSell):null}); });
        R.push({h:'BY SESSION (UTC)'}); ['Asia','London','New York','Late'].forEach(k=>{ const q=st.ses[k]; if(q) R.push({k:k,v:q.n+' \u00b7 '+(q.w/q.n*100).toFixed(0)+'% \u00b7 '+(q.R>=0?'+':'')+q.R.toFixed(1)+'R',c:q.R>=0?p.cBuy:p.cSell}); });
        let all=null; try{ all=JSON.parse(localStorage.getItem('rc_msi_stats')||'{}'); }catch(e){} const ks=all?Object.keys(all).sort((a,b)=>all[b].t-all[a].t).slice(0,5):[]; if(ks.length){ R.push({h:'BY INSTRUMENT / TIMEFRAME (last viewed)'}); ks.forEach(k=>R.push({k:k,v:all[k].n+' \u00b7 '+all[k].wr.toFixed(0)+'% \u00b7 '+(all[k].avgR>=0?'+':'')+all[k].avgR.toFixed(2)+'R'})); } }
      R.push({n:'Costs: spread '+(+p.spread||0)+', slippage '+(+p.slip||0)+', commission '+(+p.comm||0)+'%. Closed candles only, no look-ahead. Past results do not guarantee future results.',c:'rgba(230,232,238,.5)'}); panel(p.statsPos,'MSI backtest (loaded history)',R); }
    cx.restore(); }; }
// alerts: fire once, when the candle that carried the event has closed (the newest closed candle), while the app is open
function miAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='msi'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},MI_DEF,i.p); let quiet=q; if(i._miK!==key){ i._miK=key; i._miLast={}; quiet=true; }
    const last=i._miLast||(i._miLast={});
    i._xr.events.forEach(e=>{ const k=e.type+e.dir+(e.k||''); if(e.time>cc||e.time<=(last[k]||0)) return; last[k]=e.time;
      const on=(e.type==='buy'||e.type==='sell')?P.alSig:P.alTP; if(quiet||e.time!==cc||!on) return;
      const nm=e.type==='buy'?'BUY - confirmed shift at demand':e.type==='sell'?'SELL - confirmed shift at supply':e.type==='tp'?('Target TP'+e.k+' reached'):(e.reason==='BE'?'Break-even stop hit':'Stop loss hit');
      toast('MSI \u00b7 '+nm+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+miFx(e.price),(e.type==='buy'||(e.type==='tp'))?'#2e7d32':'#c62828'); if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _miRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_miRE.apply(this,arguments); try{ miAlerts(q); }catch(e){ console.error('msi alerts',e); } return rv; }; }
try{ DESC.msi='Reinblacks Market Structure Intelligence: scalping (1H / 15M / 5M) or top-down (Daily / 4H / 1H / 15M / 5M) analysis from one engine: external + internal structure, fractal shifts, liquidity sweeps, supply / demand, premium / discount, entry confirmation, risk plan and backtest. BUY / SELL / WAIT / NO TRADE always with the reasons, never forced'; }catch(e){}
}catch(err){ console.error('msi indicator failed',err); window.__msiErr=err; }

// ---- [mfg] INDICATOR: MFG 2.5 by Reinblacks Baristar - a 3 AM to 7 AM window: EMA cross, pullback, entry, SL under the cross candle, TP1 / TP2 / TP3 ----
// Vertical lines mark the start and the end of the window. The EMA is drawn only inside the window (it stops at the end time, the history stays).
// BUY: a green candle crosses UP through the EMA (the cross candle), 1-2 red candles pull back, then the next green candle = BUY at its close. SL under the cross candle.
// SELL: the mirror image (red cross candle, green pullback candles, next red candle = SELL, SL above the cross candle). Closed candles only, nothing repaints.
try{
const MF_DEF={tz:'Chart time zone (as on your axis)',startH:3,endH:7,emaLen:13,emaMode:'Always (live, follows price)',emaBack:1000,lnSt:'Dotted',minPull:1,maxPull:2,needEma:false,slBuf:0,tp1R:1,tp2R:2,tp3R:3,gap:50,after:'Stop at the end time',keepDays:0,
  showLines:true,showShade:true,showEma:true,showSig:true,showBox:true,showCross:true,showLabels:true,showStats:true,statPos:'Top right',
  cStart:'#2962ff',cEnd:'#e53950',cEma:'#ffb300',cBuy:'#26a69a',cSell:'#ef5350',cSl:'#ff1744',cTp:'#00c853',alBuy:true,alSell:true,alSound:false};
const MF_TZ=['Chart time zone (as on your axis)','UTC','America/New_York','America/Chicago','America/Los_Angeles','Europe/London','Europe/Berlin','Africa/Lagos','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Australia/Sydney','Device time'];
const MF_AFT=['Stop at the end time','Run until SL or TP3'], MF_EM=['Always (live, follows price)','Inside the window only'], MF_LS=['Dotted','Dashed','Solid'];
const mfC=(v,a,b)=>Math.max(a,Math.min(b,v));
const mfMin=h=>{ const v=+h; return Math.round(mfC(isFinite(v)?v:0,0,23.99)*60)%1440; };
const mfHM=m=>{ const h=Math.floor(m/60), mi=m%60; return ((h%12)||12)+(mi?':'+(mi<10?'0':'')+mi:'')+' '+(h<12?'AM':'PM'); };
const mfP=v=>v==null||!isFinite(v)?'':Math.abs(v)>=1000?v.toFixed(2):Math.abs(v)>=1?v.toFixed(4):v.toPrecision(5);
const mfRg=v=>Number.isInteger(+v)?String(+v):String(+(+v).toFixed(2));
function mfRgba(hex,a){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
function mfTz(s){ if(!s||String(s).indexOf('Chart')===0){ let z='UTC'; try{ z=(window.mpXO&&window.mpXO.XO&&window.mpXO.XO.tz)||'UTC'; }catch(e){} return z; } return s==='Device time'?'local':s; }
const mfFm={}, mfOC={};
function mfOffCalc(tz,t){ if(tz==='local') return -new Date(t*1000).getTimezoneOffset();
  let f=mfFm[tz]; if(f===undefined){ try{ f=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric'}); }catch(e){ f=null; } mfFm[tz]=f; }
  if(!f) return 0; const q={}; f.formatToParts(new Date(t*1000)).forEach(x=>{ q[x.type]=+x.value; });
  return Math.round(Date.UTC(q.year,q.month-1,q.day,q.hour%24,q.minute)/60000-t/60); }
function mfLoc(tz,t){ const b=Math.floor(t/3600), k=tz+'|'+b; let off=mfOC[k]; if(off===undefined){ if(Object.keys(mfOC).length>30000){ for(const x in mfOC) delete mfOC[x]; } off=mfOC[k]=mfOffCalc(tz,b*3600); }
  const lm=Math.floor(t/60)+off, day=Math.floor(lm/1440); return {day,min:lm-day*1440}; }
function mfIv(c){ let m=0; for(let i=c.length-1;i>0&&i>c.length-40;i--){ const d=c[i].time-c[i-1].time; if(d>0&&(m===0||d<m)) m=d; } return m; }
function mfCompute(c,p,iv,forming,tz){
  const N=c.length, D={N,iv,ok:false,msg:'',ema:null,sess:[],tr:[],ev:[],st:null,L:0};
  if(N<5||!iv) return D;
  if(iv>=86400){ D.msg='MFG 2.5 needs an intraday chart (it works inside a time window)'; return D; }
  const s=mfMin(p.startH), e=mfMin(p.endH);
  if(s===e){ D.msg='MFG 2.5: the start time and the end time are the same'; return D; }
  const wrap=s>e, L=mfC(Math.round(+p.emaLen)||13,1,500), gap=Math.max(0,Math.round(+p.gap)||0), mnP=isFinite(+p.minPull)?mfC(Math.round(+p.minPull),0,10):1, mxP=Math.max(mnP,isFinite(+p.maxPull)?mfC(Math.round(+p.maxPull),0,10):2), run=p.after===MF_AFT[1];
  D.L=L; D.s=s; D.e=e;
  // EMA of the close (starts with a simple average, like the usual EMA)
  const ema=new Array(N).fill(null), k=2/(L+1); let sum=0, pv=null;
  for(let i=0;i<N;i++){ const cl=c[i].close; if(i<L-1) sum+=cl; else if(i===L-1){ sum+=cl; pv=sum/L; ema[i]=pv; } else { pv=cl*k+pv*(1-k); ema[i]=pv; } }
  D.ema=ema;
  // ATR 14 (only used for the optional stop buffer)
  const atr=new Array(N).fill(null); { let pc=null, rma=null, sm=0; for(let i=0;i<N;i++){ const h=c[i].high, l=c[i].low, tr=pc==null?h-l:Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)); pc=c[i].close; if(i<13) sm+=tr; else if(i===13){ sm+=tr; rma=sm/14; atr[i]=rma; } else { rma=(rma*13+tr)/14; atr[i]=rma; } } }
  // local clock of every candle, then the windows (one per day)
  const mn=new Array(N), sess=D.sess; let cur=null;
  for(let i=0;i<N;i++){ const q=mfLoc(tz,c[i].time), m=q.min; mn[i]=m; const w=wrap?(m>=s||m<e):(m>=s&&m<e); if(!w) continue;
    const id=q.day-(wrap&&m<e?1:0); if(!cur||cur.id!==id){ cur={id,i0:i,i1:i}; sess.push(cur); } else cur.i1=i; }
  sess.forEach(S=>{ const d0=((mn[S.i0]-s)%1440+1440)%1440, d1=((e-mn[S.i1])%1440+1440)%1440; S.tS=c[S.i0].time-d0*60; S.tE=c[S.i1].time+d1*60; });
  // signals
  let last=-1e9;
  sess.forEach((S,si)=>{ let st=null;
    for(let i=S.i0;i<=S.i1;i++){ if(forming&&i===N-1) break; const b=c[i], em=ema[i]; if(em==null){ st=null; continue; }
      const pb=i>0?c[i-1]:null, pe=i>0?ema[i-1]:null, green=b.close>b.open, red=b.close<b.open;
      const cu=green&&b.close>em&&(b.open<=em||(pb&&pe!=null&&pb.close<=pe)), cd=red&&b.close<em&&(b.open>=em||(pb&&pe!=null&&pb.close>=pe));
      if(st){ const bull=st.dir===1;
        { const pull=bull?red:green, go=bull?green:red, broke=bull?b.low<st.lv:b.high>st.lv;
          if(broke) st=null;
          else if(pull){ st.pulls++; if(st.pulls>mxP) st=null; }
          else if(go){ const okE=!p.needEma||(bull?b.close>em:b.close<em);
            if(st.pulls>=mnP&&okE&&i-last>=gap){ const buf=Math.max(0,+p.slBuf||0)*(atr[st.ci]||0), sl=bull?st.lv-buf:st.lv+buf, en=b.close, risk=bull?en-sl:sl-en;
              if(risk>0){ const R=[+p.tp1R||1,+p.tp2R||2,+p.tp3R||3], T=R.map(r=>en+(bull?1:-1)*risk*r);
                const tr={si,dir:bull?1:-1,ci:st.ci,i,time:b.time,entry:en,sl,t:T,R,tp:0,res:'',ri:-1,end:i};
                const endI=Math.min(run?N-1:S.i1,N-1);
                for(let j=i+1;j<=endI;j++){ if(forming&&j===N-1) break; const q=c[j], hitSL=bull?q.low<=sl:q.high>=sl;
                  if(hitSL){ tr.res='sl'; tr.ri=j; break; }
                  for(let z=0;z<3;z++){ const hit=bull?q.high>=T[z]:q.low<=T[z]; if(hit&&tr.tp<z+1) tr.tp=z+1; }
                  if(tr.tp===3){ tr.res='tp3'; tr.ri=j; break; } }
                tr.end=tr.ri>=0?tr.ri:Math.min(endI,forming?N-2:N-1); if(tr.end<i) tr.end=i;
                D.tr.push(tr); D.ev.push({type:bull?'buy':'sell',time:b.time,idx:i,price:en}); last=i; } }
            st=null; } } }
      if(!st&&(cu||cd)) st={dir:cu?1:-1,ci:i,lv:cu?b.low:b.high,pulls:0}; } });
  // statistics (estimate): a trade is a win when TP1 was reached before the stop; a loss when the stop came first
  let n=D.tr.length, w=0, l=0, t1=0, t2=0, t3=0, pend=0; D.tr.forEach(t=>{ if(t.tp>=1){ w++; t1++; if(t.tp>=2) t2++; if(t.tp>=3) t3++; } else if(t.res==='sl') l++; else pend++; });
  D.st={n,w,l,t1,t2,t3,pend,wr:(w+l)>0?100*w/(w+l):0}; D.ok=true; return D; }
let mfMem=null;
function mfGet(c,p){ const N=c.length, iv=mfIv(c), tz=mfTz(p.tz), forming=N>0&&iv>0&&(c[N-1].time+iv)*1000>Date.now();
  const key=JSON.stringify(p)+'|'+tz+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+forming+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(mfMem&&mfMem.k===key) return mfMem.D;
  let D; try{ D=mfCompute(c,p,iv,forming,tz); }catch(e){ console.error('mfg calc failed',e); D={N,iv,ok:false,msg:'MFG 2.5 calculation error: '+(e&&e.message),ema:null,sess:[],tr:[],ev:[],st:null}; } mfMem={k:key,D}; return D; }
IND.mfg={label:'MFG 2.5 by Reinblacks Baristar',title:'MFG 2.5 by Reinblacks Baristar \u00b7 3 AM to 7 AM EMA cross, pullback entry, SL and TP1 / TP2 / TP3',cat:'Trend',nm:p=>'MFG 2.5 \u00b7 EMA '+((p&&p.emaLen)||13),p:Object.assign({},MF_DEF),cols:['#ffb300'],
  fields:[['tz','sel','Time zone of the window',{opts:MF_TZ}],['startH','num','Window starts at (hour: 3 = 3 AM, 3.5 = 3:30 AM)',{min:0,max:23.75,step:0.25}],['endH','num','Window ends at (hour: 7 = 7 AM)',{min:0,max:23.75,step:0.25}],
    ['emaLen','num','EMA length (13, 20, 50 ... any number)',{min:1,max:500,step:1}],['emaMode','sel','EMA is drawn',{opts:MF_EM}],['emaBack','num','EMA starts this many candles behind (1000 ... 0 = all)',{min:0,max:50000,step:50}],['lnSt','sel','SL / TP line style',{opts:MF_LS}],
    ['minPull','num','Pullback candles needed before the entry (min)',{min:0,max:10,step:1}],['maxPull','num','Pullback candles allowed before the entry (max)',{min:1,max:10,step:1}],['needEma','chk','Entry candle must also close on the right side of the EMA'],
    ['slBuf','num','Stop buffer beyond the cross candle (x ATR, 0 = none)',{min:0,max:3,step:0.05}],['tp1R','num','TP1 (x risk)',{min:0.25,max:50,step:0.25}],['tp2R','num','TP2 (x risk)',{min:0.25,max:50,step:0.25}],['tp3R','num','TP3 (x risk)',{min:0.25,max:50,step:0.25}],
    ['gap','num','Next signal only after N candles (50, 20, 79 ... any number, 0 = off)',{min:0,max:5000,step:1}],['after','sel','Trade lines',{opts:MF_AFT}],['keepDays','num','Days to display (0 = all history)',{min:0,max:3650,step:1}],
    ['showLines','chk','Show the start / end vertical lines'],['showShade','chk','Shade the window'],['showEma','chk','Show the EMA (inside the window only)'],['showSig','chk','Show BUY / SELL tags'],['showBox','chk','Show the stop / target boxes'],['showCross','chk','Mark the cross candle'],['showLabels','chk','Show labels and prices'],
    ['cStart','col','Start line'],['cEnd','col','End line'],['cEma','col','EMA'],['cBuy','col','Buy'],['cSell','col','Sell'],['cSl','col','Stop loss'],['cTp','col','Targets'],
    ['showStats','chk','Show the results box (estimate, not a backtest)'],['statPos','sel','Results box position',{opts:['Top right','Top left','Bottom right','Bottom left']}],
    ['alBuy','chk','Alert on BUY'],['alSell','chk','Alert on SELL'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},MF_DEF,p), D=mfGet(c,q); return {mk:[],boxes:[{type:'mfgview',pts:[],o:q,D}],labels:[],events:D.ok?D.ev:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='mfgview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, N=candles.length; if(!D) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.font='10px system-ui,sans-serif'; cx.textBaseline='middle'; cx.setLineDash([]);
    if(D.ok&&N>=3&&D.N===N){ const iv=D.iv, c=candles, ema=D.ema;
      const xi=i=>{ const v=X(i); return v==null?null:v; };
      const xt=t=>{ let lo=0, hi=N-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(c[m].time<=t) lo=m; else hi=m-1; } const x0=xi(lo); if(x0==null) return null; let bs; if(lo>0){ const xp=xi(lo-1); bs=xp==null?6:x0-xp; } else { const xn=xi(1); bs=xn==null?6:xn-x0; } return x0+((t-c[lo].time)/iv-0.5)*bs; };
      const pill=(t,x,y,bg,al)=>{ const w=cx.measureText(t).width+8; let lx=al==='r'?x-w:al==='c'?x-w/2:x; if(lx+w>W-2) lx=W-w-2; if(lx<2) lx=2; cx.fillStyle=bg; cx.fillRect(lx,y-7,w,14); cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText(t,lx+4,y); };
      const keep=Math.max(0,Math.round(+p.keepDays)||0); let S0=0; if(keep>0){ const lastId=D.sess.length?D.sess[D.sess.length-1].id:0; while(S0<D.sess.length&&D.sess[S0].id<=lastId-keep) S0++; }
      for(let si=S0;si<D.sess.length;si++){ const S=D.sess[si], xs=xt(S.tS), xe=xt(S.tE); if(xs==null||xe==null) continue; if(xe<-60||xs>W+60) continue;
        if(p.showShade){ cx.fillStyle=mfRgba(p.cStart,0.06); cx.fillRect(xs,0,Math.max(1,xe-xs),H); }
        if(p.showLines){ cx.lineWidth=1.3; cx.setLineDash([6,4]); cx.strokeStyle=p.cStart; cx.beginPath(); cx.moveTo(xs,0); cx.lineTo(xs,H); cx.stroke(); cx.strokeStyle=p.cEnd; cx.beginPath(); cx.moveTo(xe,0); cx.lineTo(xe,H); cx.stroke(); cx.setLineDash([]); }
      }
      if(p.showEma&&ema){ const always=p.emaMode!==MF_EM[1], back=Math.max(0,Math.round(+p.emaBack)||0), a0=back>0?Math.max(0,N-back):0;
        const seg=(i0,i1,w,col)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.lineJoin='round'; cx.beginPath(); let on=false; for(let i=i0;i<=i1;i++){ const v=ema[i]; if(v==null){ on=false; continue; } const x=xi(i), y=Y(v); if(x==null||y==null){ on=false; continue; } if(x<-30){ on=false; continue; } if(x>W+30) break; if(on) cx.lineTo(x,y); else { cx.moveTo(x,y); on=true; } } cx.stroke(); };
        if(always) seg(a0,N-1,1.5,mfRgba(p.cEma,0.6));
        for(let si=S0;si<D.sess.length;si++){ const S=D.sess[si]; if(always&&S.i1<a0) continue; seg(always?Math.max(S.i0,a0):S.i0,S.i1,2.5,p.cEma); } }
      for(let si=S0;si<D.sess.length;si++){ const S=D.sess[si], xs=xt(S.tS), xe=xt(S.tE); if(xs==null||xe==null||xe<-60||xs>W+60) continue;
        if(p.showLines&&p.showLabels){ pill(mfHM(D.s),xs+3,10,p.cStart,'l'); pill(mfHM(D.e),xe-3,10,p.cEnd,'r'); } }
      D.tr.forEach(t=>{ if(t.si<S0) return; const x0=xi(t.i), x1r=xi(t.end), xc=xi(t.ci); if(x0==null||x1r==null) return; const x1=Math.max(x1r,x0+8); if(x1<-60||x0>W+60) return;
        const buy=t.dir===1, cl=buy?p.cBuy:p.cSell, yE=Y(t.entry), yS=Y(t.sl), yT=t.t.map(v=>Y(v)); if(yE==null||yS==null||yT.some(v=>v==null)) return;
        if(p.showBox){ cx.fillStyle=mfRgba(p.cTp,0.10); cx.fillRect(x0,Math.min(yE,yT[2]),x1-x0,Math.max(1,Math.abs(yE-yT[2]))); cx.fillStyle=mfRgba(p.cSl,0.14); cx.fillRect(x0,Math.min(yE,yS),x1-x0,Math.max(1,Math.abs(yE-yS))); }
        cx.lineWidth=1.5; cx.strokeStyle=cl; cx.beginPath(); cx.moveTo(x0,yE); cx.lineTo(x1,yE); cx.stroke();
        const xsl=(xc!=null&&xc<x0)?xc:x0;
        const DS=p.lnSt==='Solid'?[]:p.lnSt==='Dashed'?[6,4]:[2,3]; cx.setLineDash(DS); cx.beginPath(); cx.moveTo(xsl,yS); cx.lineTo(x1,yS); cx.strokeStyle=p.cSl; cx.lineWidth=t.res==='sl'?2.4:1.8; cx.stroke();
        for(let z=0;z<3;z++){ const hit=t.tp>z; cx.strokeStyle=p.cTp; cx.lineWidth=hit?2.4:1.8; cx.setLineDash(DS); cx.beginPath(); cx.moveTo(x0,yT[z]); cx.lineTo(x1,yT[z]); cx.stroke(); } cx.setLineDash([]);
        if(p.showCross&&xc!=null){ const ye=Y(D.ema[t.ci]); if(ye!=null){ cx.beginPath(); cx.arc(xc,ye,3.5,0,Math.PI*2); cx.fillStyle='#ffd54f'; cx.fill(); cx.strokeStyle='#14110a'; cx.lineWidth=1; cx.stroke(); } }
        if(p.showLabels){ const lx=x1+3; pill('SL '+mfP(t.sl)+(t.res==='sl'?' \u2715':''),lx,yS,mfRgba(p.cSl,0.85),'l'); for(let z=0;z<3;z++) pill('TP'+(z+1)+' ('+mfRg(t.R[z])+'R) '+mfP(t.t[z])+(t.tp>z?' \u2713':''),lx,yT[z],mfRgba(p.cTp,0.8),'l'); }
        if(p.showSig){ const cd=candles[t.i], yh=Y(buy?cd.low:cd.high); if(yh!=null){ const ty=buy?yh+16:yh-16, tx='MFG '+(buy?'BUY':'SELL'), w=cx.measureText(tx).width+10;
            cx.fillStyle=cl; cx.beginPath(); if(buy){ cx.moveTo(x0,yh+3); cx.lineTo(x0-4,yh+9); cx.lineTo(x0+4,yh+9); } else { cx.moveTo(x0,yh-3); cx.lineTo(x0-4,yh-9); cx.lineTo(x0+4,yh-9); } cx.closePath(); cx.fill();
            cx.fillRect(x0-w/2,ty-7,w,14); cx.fillStyle='#fff'; cx.textAlign='center'; cx.fillText(tx,x0,ty); cx.textAlign='left'; } } }); }
    if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); }
    if(D.ok&&p.showStats&&D.st){ const S=D.st, rows=[['Signals',String(S.n)],['TP1 reached',String(S.t1)],['TP2 reached',String(S.t2)],['TP3 reached',String(S.t3)],['Stop loss',String(S.l)],['Open / expired',String(S.pend)],['Win rate',(S.w+S.l)>0?S.wr.toFixed(1)+' %':'\u2014']];
      cx.font='11px system-ui,sans-serif'; const rh=17; let w0=cx.measureText('MFG 2.5 \u00b7 estimate').width, w1=cx.measureText('not a backtest').width;
      rows.forEach(r=>{ w0=Math.max(w0,cx.measureText(r[0]).width); w1=Math.max(w1,cx.measureText(r[1]).width); }); w0+=12; w1+=12; const tw=w0+w1, th=rh*(rows.length+1), pos=p.statPos||'Top right';
      const tx=pos.indexOf('left')>-1?8:W-tw-8, ty=pos.indexOf('Top')>-1?30:H-th-8;
      cx.fillStyle='rgba(0,0,0,.72)'; cx.fillRect(tx,ty,tw,th); cx.fillStyle='rgba(41,98,255,.45)'; cx.fillRect(tx,ty,tw,rh); cx.strokeStyle='rgba(140,140,140,.35)'; cx.lineWidth=1; cx.strokeRect(tx+.5,ty+.5,tw,th);
      cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText('MFG 2.5 \u00b7 estimate',tx+6,ty+rh/2); cx.font='9px system-ui,sans-serif'; cx.fillText('not a backtest',tx+w0+6,ty+rh/2); cx.font='11px system-ui,sans-serif';
      rows.forEach((r,k)=>{ const y=ty+rh*(k+1)+rh/2; cx.fillStyle='#fff'; cx.fillText(r[0],tx+6,y); cx.fillText(r[1],tx+w0+6,y); }); }
    cx.restore(); }; }
// alerts: fire once, when the signal candle has closed (the newest closed candle), while the app is open
function mfAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0], KEY={buy:'alBuy',sell:'alSell'}, MSG={buy:['MFG 2.5 BUY','#2e7d32'],sell:['MFG 2.5 SELL','#c62828']};
  inds.forEach(i=>{ if(i.t!=='mfg'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},MF_DEF,i.p); let quiet=q; if(i._mfK!==key){ i._mfK=key; i._mfLast={}; quiet=true; }
    const last=i._mfLast||(i._mfLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!P[KEY[e.type]]) return;
      toast(MSG[e.type][0]+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 Close '+mfP(e.price),MSG[e.type][1]);
      if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _mfRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_mfRE.apply(this,arguments); try{ mfAlerts(q); }catch(e){ console.error('mfg alerts',e); } return rv; }; }
try{ DESC.mfg='MFG 2.5 by Reinblacks Baristar: marks a 3 AM to 7 AM window with two vertical lines. The EMA (13 by default) runs live with price and starts 1000 candles behind (or draws only inside the window, your choice). Trades show only inside the window: price crosses over the EMA, 1-2 pullback candles, then BUY on the next green candle (SELL is the mirror). Stop under the cross candle, TP1 / TP2 / TP3 as dotted lines'; }catch(e){}
}catch(err){ console.error('mfg indicator failed',err); window.__mfgErr=err; }

// ---- [mfs] INDICATOR: MFG Snap - 1:15 PM to 2:15 PM window, the first 5 candles make a range, rectangles above / below it, break + 2nd green / red candle = BUY / SELL (self-contained: every name starts with mq / MQ) ----
// Two vertical lines mark the start (1:15 PM) and the end (2:15 PM) of every day. Closed candles only, nothing repaints.
//  RANGE  - from the start line the first N candles (default 5) are counted: their highest high and lowest low. The boxes appear when the Nth candle has CLOSED and are extended to the end line.
//  BOXES  - "Above + below": a green rectangle sits ON TOP of the range (from its highest high up) and a red one UNDER it (from its lowest low down). "One box": one rectangle over the whole range.
//  BREAK  - a candle CLOSES above the green box = break up. A candle CLOSES below the red box = break down (wick option in settings). A small triangle marks it.
//  ENTRY  - after a break up the 2nd GREEN candle = BUY (the break candle itself is not counted, red candles in between are fine): break, green, red, green = BUY. break, red, green, red, red, green = BUY.
//           SELL is the mirror: break down, then the 2nd RED candle. Both entries are only valid inside the window (or until the next window, your choice).
try{
const MQ_MD=['Above + below','One box over the range'], MQ_AFT=['Stop at the end time','Run until the next window'];
const MQ_TZ=['Chart time zone (as on your axis)','UTC','America/New_York','America/Chicago','America/Los_Angeles','Europe/London','Europe/Berlin','Africa/Lagos','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Australia/Sydney','Device time'];
const MQ_STRAT=['MFG Snap (1:15 PM window)','New York sells and buy','BOS buy and sell (market structure)','Break up buy / break down sell (rectangles until 00:00)'];
const MQ_TFS={'Auto':0,'5 min':300,'15 min':900,'30 min':1800,'1 hour':3600,'2 hours':7200,'4 hours':14400,'Daily':86400};
const MQ_BSL=['Tight: broken level or break candle (nearest)','Direction TF break candle extreme (wide)','Protected swing (wide)'];
const MQ_BCF=['Chart candle close (immediate)','Direction TF candle close (slower)'];
const MQ_DEF={tz:MQ_TZ[0],startH:13.25,endH:14.25,rectT:0,cnt:5,mode:MQ_MD[0],thk:0.5,brkClose:true,entryN:2,cancelBack:false,perSide:1,gap:0,after:MQ_AFT[0],keepDays:0,
  showLines:true,showShade:true,showBox:true,showLabels:true,showBrk:true,showSig:true,sigLen:30,btnFs:8,
  cStart:'#2962ff',cEnd:'#e53950',cUp:'#2e9e4f',cDn:'#c62f3a',cBuy:'#2e9e4f',cSell:'#c62f3a',slN:2,tp1R:1,tp2R:2,tp3R:3,tp4R:4,showRisk:true,onlyActive:true,cSl:'#ff1744',cTp:'#00c853',bkPad:0.1,bkExt:60,bkCont:true,bkLen:50,bkRev:true,bkMax:0,bkHide:true,cFail:'#8a8f98',cFailRec:'#5b6068',recOn:true,cRecBuy:'#00b0ff',cRecSell:'#ff9100',alBuy:true,alSell:true,alSound:false,
  strat:MQ_STRAT[3],nySess:true,showWin:true,nyStartH:16,nyEndH:0,nyBox:true,nyName:'New York',nyBrkGap:50,nySigGap:50,nyShowBrk:true,nySlPad:0,nyTp1R:1,nyTp2R:2,nyTp3R:3,nyFvg:false,nyFvgReq:false,nySmc:false,nyOb:true,nySmcLen:5,nySmcReq:false,nyTransp:90,cNy:'#ff5d00',cBrk:'#ff9800',cFvgUp:'#26a69a',cFvgDn:'#ef5350',
  bosTf:'Auto',bosLen:5,bosSl:MQ_BSL[0],bosConf:MQ_BCF[0],bosPad:0.5,bosLines:true,bosLbl:true,cBosBuy:'#3fb950',cBosSell:'#e5121a',cBosTxt:'#ffffff',
  showMss:true,mssTf:'Auto',mssLen:5,mssConf:MQ_BCF[0],mssKeep:10,mssLbl:true,cMssUp:'#00bcd4',cMssDn:'#ff9800'};
const mqC=(v,a,b)=>Math.max(a,Math.min(b,v));
const mqMin=h=>{ const v=+h; return Math.round(mqC(isFinite(v)?v:0,0,23.99)*60)%1440; };
const mqHM=m=>{ const h=Math.floor(m/60), mi=m%60; return ((h%12)||12)+(mi?':'+(mi<10?'0':'')+mi:'')+' '+(h<12?'AM':'PM'); };
const mqP=v=>v==null||!isFinite(v)?'':Math.abs(v)>=1000?v.toFixed(2):Math.abs(v)>=1?v.toFixed(4):v.toPrecision(5);
function mqRgba(hex,a){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
function mqTz(s){ if(!s||String(s).indexOf('Chart')===0){ let z='UTC'; try{ z=(window.mpXO&&window.mpXO.XO&&window.mpXO.XO.tz)||'UTC'; }catch(e){} return z; } return s==='Device time'?'local':s; }
const mqFm={}, mqOC={};
function mqOffCalc(tz,t){ if(tz==='local') return -new Date(t*1000).getTimezoneOffset();
  let f=mqFm[tz]; if(f===undefined){ try{ f=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric'}); }catch(e){ f=null; } mqFm[tz]=f; }
  if(!f) return 0; const q={}; f.formatToParts(new Date(t*1000)).forEach(x=>{ q[x.type]=+x.value; });
  return Math.round(Date.UTC(q.year,q.month-1,q.day,q.hour%24,q.minute)/60000-t/60); }
function mqLoc(tz,t){ const b=Math.floor(t/3600), k=tz+'|'+b; let off=mqOC[k]; if(off===undefined){ if(Object.keys(mqOC).length>30000){ for(const x in mqOC) delete mqOC[x]; } off=mqOC[k]=mqOffCalc(tz,b*3600); }
  const lm=Math.floor(t/60)+off, day=Math.floor(lm/1440); return {day,min:lm-day*1440}; }
function mqIv(c){ let m=0; for(let i=c.length-1;i>0&&i>c.length-40;i--){ const d=c[i].time-c[i-1].time; if(d>0&&(m===0||d<m)) m=d; } return m; }
// ---- BREAK UP buy / BREAK DOWN sell (optional strategy of MFG Snap, works ALONE: it is one of the 4 strategies, the others are off while it is selected) ----
//  Only the two rectangles matter (green above the 5-candle range, red under it), drawn until 00:00 (setting "Rectangles extend until"). The New York session is NOT needed.
//  BUY  = the 2nd GREEN candle that CLOSED above the green rectangle line (the break candle counts as the 1st when it is green): green red red green, green green, red green red green = BUY. SELL = the mirror (red candles below the red rectangle).
//  SL tightly beyond the OTHER rectangle (BUY just below the red one, SELL just above the green one), TP1 / TP2 / TP3 as usual (TP1R / TP2R / TP3R).
//  Failed (SL hit before any TP): SL, TP1-3 and the BUY / SELL button turn grey + a small grey X at the top. Won (a TP reached): everything turns green for a BUY, red for a SELL.
// ---- NEW YORK sells and buy (optional strategy of MFG Snap, only one strategy works at a time) ----
// Trades only from the New York start until the trading end (default 00:00). Nothing is computed or drawn outside that period.
//  1 BREAKOUT - a candle closes beyond the day's green (up) / red (down) rectangle. Tiny button. The next breakout counts only after N candles (default 50).
//  2 RETEST   - price comes back to the broken rectangle edge. 3 BOS - a close beyond the high (low) of the move before the retest. 4 BUY / SELL at that close, next one only after N candles (default 50).
//  SL = below the lower rectangle (BUY) / above the upper rectangle (SELL), TP1 / TP2 / TP3. Optional: Fair Value Gaps and Smart Money Concept (swing BOS / CHoCH, order blocks) as zones and / or as a condition.
function mqNY(c,p,iv,forming,tz,D){
  const N=c.length, sess=D.sess; D.sig=[]; D.brk=[]; D.ev=[]; D.nyOn=true; D.nyBrk=[]; D.nyBox=[]; D.nyFvg=[]; D.nySmc={lines:[],obs:[]};
  const nS=mqMin(p.nyStartH); let nE=mqMin(p.nyEndH); if(nE===0) nE=1440;
  if(nS===nE){ D.msg='MFG Snap New York: the start time and the end time are the same'; return; }
  const wrapN=nE<=nS, brkC=!!p.brkClose, gv=(v,d)=>{ const x=Math.round(+v); return isFinite(x)&&x>=0?x:d; }, bGap=gv(p.nyBrkGap,50), sGap=gv(p.nySigGap,50);
  const pad=isFinite(+p.nySlPad)?Math.max(0,+p.nySlPad):0, R3=[1,2,3].map(k=>{ const v=+p['nyTp'+k+'R']; return v>0?v:k; });
  const wantFvg=!!(p.nyFvg||p.nyFvgReq), wantSmc=!!(p.nySmc||p.nySmcReq), L=mqC(Math.round(+p.nySmcLen)||5,2,30);
  const mn=new Array(N), dy=new Array(N); for(let i=0;i<N;i++){ const q=mqLoc(tz,c[i].time); mn[i]=q.min; dy[i]=q.day; }
  const inW=(i,d0)=>{ const m=mn[i], d=dy[i]; return wrapN?((d===d0&&m>=nS)||(d===d0+1&&m<nE)):(d===d0&&m>=nS&&m<nE); };
  const fB=new Uint8Array(N), fS=new Uint8Array(N), tr=new Int8Array(N);
  let lastBrk=-1e9, lastSig=-1e9;
  sess.forEach((S,si)=>{
    if(!S.rg) return;
    let a=-1, b=-1;
    for(let j=S.rg.b+1;j<N;j++){ if(inW(j,S.id)){ if(a<0) a=j; b=j; } else if(a>=0) break; else if(dy[j]>S.id+1) break; }
    if(a<0) return;
    const e=(forming&&b===N-1)?b-1:b;                                                            // last CLOSED candle of the period
    let hi=-Infinity, lo=Infinity; for(let j=a;j<=b;j++){ hi=Math.max(hi,c[j].high); lo=Math.min(lo,c[j].low); } D.nyBox.push({si,a,b,hi,lo});
    if(e<a) return;
    const up=S.rg.up, dn=S.rg.dn; let sz=0; for(let j=S.i0;j<=S.rg.b;j++) sz+=c[j].high-c[j].low; sz/=(S.rg.b-S.i0+1);
    // Fair Value Gaps (3 candles: the 1st and the 3rd do not touch). Zone runs until price trades through it, or until the end of the period
    if(wantFvg) for(let j=a+2;j<=e;j++){ const x=c[j-2], z=c[j]; let f=null;
      if(z.low>x.high){ fB[j]=1; f={dir:1,i:j-1,top:z.low,bot:x.high}; } else if(z.high<x.low){ fS[j]=1; f={dir:-1,i:j-1,top:x.low,bot:z.high}; }
      if(f){ f.si=si; f.end=e; for(let k=j+1;k<=e;k++){ if(f.dir===1?c[k].low<=f.bot:c[k].high>=f.top){ f.end=k; break; } } D.nyFvg.push(f); } }
    // Smart Money Concept: swing pivots (L candles each side), close beyond a swing = BOS (same trend) or CHoCH (trend change), order block = the extreme candle of the move
    if(wantSmc){ let ph=null, pl=null, t=0; const o0=D.nySmc.obs.length;
      for(let j=a;j<=e;j++){ const k=j-L;
        if(k>=a+L){ let ih=true, il=true; for(let m=k-L;m<=k+L;m++){ if(m===k) continue; if(m<k?c[m].high>c[k].high:c[m].high>=c[k].high) ih=false; if(m<k?c[m].low<c[k].low:c[m].low<=c[k].low) il=false; }
          if(ih) ph={i:k,v:c[k].high}; if(il) pl={i:k,v:c[k].low}; }
        const q=c[j];
        if(ph&&q.close>ph.v){ D.nySmc.lines.push({si,i0:ph.i,i1:j,y:ph.v,dir:1,txt:t===-1?'CHoCH':'BOS'}); let m0=ph.i; for(let m=ph.i;m<=j;m++) if(c[m].low<c[m0].low) m0=m; D.nySmc.obs.push({si,dir:1,i:m0,top:c[m0].high,bot:c[m0].low,end:e,from:j}); t=1; ph=null; }
        else if(pl&&q.close<pl.v){ D.nySmc.lines.push({si,i0:pl.i,i1:j,y:pl.v,dir:-1,txt:t===1?'CHoCH':'BOS'}); let m0=pl.i; for(let m=pl.i;m<=j;m++) if(c[m].high>c[m0].high) m0=m; D.nySmc.obs.push({si,dir:-1,i:m0,top:c[m0].high,bot:c[m0].low,end:e,from:j}); t=-1; pl=null; }
        tr[j]=t; }
      for(let u=o0;u<D.nySmc.obs.length;u++){ const ob=D.nySmc.obs[u]; for(let k=ob.from+1;k<=e;k++){ if(ob.dir===1?c[k].close<ob.bot:c[k].close>ob.top){ ob.end=k; break; } } } }
    // breakout > retest > BOS > BUY / SELL
    const bu=k=>brkC?c[k].close>up.hi:c[k].high>up.hi, bd=k=>brkC?c[k].close<dn.lo:c[k].low<dn.lo; let st=null;
    for(let j=a;j<=e;j++){ const q=c[j], uB=bu(j), dB=bd(j);
      if(st&&j>=st.brk&&(st.dir===1?fB[j]:fS[j])) st.fv=true;
      if(st&&j>st.brk){ const u=st.dir===1, opp=u?dB:uB;
        if(opp) st=null;                                                                         // the other side broke: this setup is dead
        else if(st.ph===0){ if(u?q.low<=up.hi:q.high>=dn.lo){ if(u?q.close<up.lo:q.close>dn.hi) st=null; else { st.ph=1; st.swing=st.ext; } } else st.ext=u?Math.max(st.ext,q.high):Math.min(st.ext,q.low); }   // retest
        else { if(u?q.close<up.lo:q.close>dn.hi) st=null;                                        // closed back inside the range: cancelled
          else if(u?q.close>st.swing:q.close<st.swing){                                         // BOS
            const okF=!p.nyFvgReq||st.fv, okS=!p.nySmcReq||tr[j]===st.dir;
            if(okF&&okS){ if(j-lastSig>=sGap){ const en=q.close, sl=u?dn.lo-pad*sz:up.hi+pad*sz, risk=u?en-sl:sl-en;
                if(risk>0){ const T=R3.map(r=>en+(u?1:-1)*risk*r), t={si,dir:st.dir,brk:st.brk,i:j,time:q.time,price:en,sl,t:T,R:R3,tp:0,res:'',end:j,ki:j};
                  for(let m=j+1;m<=e;m++){ const z=c[m]; if(u?z.low<=sl:z.high>=sl){ t.res='sl'; t.end=m; break; } for(let k=0;k<3;k++){ if((u?z.high>=T[k]:z.low<=T[k])&&t.tp<k+1) t.tp=k+1; } t.end=m; if(t.tp===3){ t.res='tp3'; break; } }
                  D.sig.push(t); D.ev.push({type:u?'buy':'sell',time:q.time,idx:j,price:q.close,sl,t:T,ny:1}); lastSig=j; } }
              st=null; } } } }
      const uP=bu(j-1), dP=bd(j-1); let nb=0; if(uB&&!uP) nb=1; else if(dB&&!dP) nb=-1;
      if(nb&&j-lastBrk>=bGap){ D.nyBrk.push({si,dir:nb,i:j}); lastBrk=j; st={dir:nb,brk:j,ph:0,ext:nb===1?q.high:q.low,swing:0,fv:!!(nb===1?fB[j]:fS[j])}; } } });
}
// ---- BOS buy and sell (optional strategy of MFG Snap, works ALONE: every other MFG Snap BUY / SELL is switched off while it is selected) ----
// The BOS is the EXTERNAL structure break of the direction timeframe (Auto = 12 x the chart candle, 1 hour on a 5 min chart): swing highs / lows (HH HL LH LL) are found on those candles (a swing is final once confirmed),
// a BOS = the first CHART candle that CLOSES beyond the active swing (a wick never counts; breaks with the trend and breaks that flip the trend are both BOS). The signal is on that very candle: BUY on a bullish BOS, SELL on a bearish BOS, no waiting.
// (Setting: confirm on the direction-timeframe candle close instead = slower.) Closed candles only, nothing repaints. The line runs from the swing to the break candle, the label BOS sits in the middle.
// Only inside the New York period (start .. trading end, default 4 PM .. 00:00): no signal and no BOS line outside it. SL = the nearer of the broken level / the break candle + a small padding, TP1 / TP2 / TP3 = New York R multiples.
function mqFold(c,n,sec,iv){ const bars=[]; for(let i=0;i<n;i++){ const k=Math.floor(c[i].time/sec); let b=bars[bars.length-1];
    if(!b||b.k!==k){ b={k,time:k*sec,open:c[i].open,high:c[i].high,low:c[i].low,close:c[i].close,i0:i,i1:i,hiI:i,loI:i}; bars.push(b); }
    else { if(c[i].high>b.high){ b.high=c[i].high; b.hiI=i; } if(c[i].low<b.low){ b.low=c[i].low; b.loI=i; } b.close=c[i].close; b.i1=i; } }
  let nb=bars.length; if(nb&&(c[n-1].time+iv)<(bars[nb-1].k+1)*sec-1) nb--;                      // newest bucket still forming: never used
  return {bars,nb}; }
function mqStruct(c,F,nUse,len,fast){ len=Math.max(1,Math.round(+len)||5); const b=F.bars, NB=F.nb, S={all:[],live:[],brk:[]}; let actH=null,actL=null,nxt=0;
  const add=(t,k,p,n)=>{ const lv=S.live, last=lv[lv.length-1];
    if(last&&last.t===t){ if(t==='H'?p<=last.p:p>=last.p) return; last.sup=n; lv.pop(); }
    let prev=null; for(let q=lv.length-1;q>=0;q--) if(lv[q].t===t){ prev=lv[q]; break; }
    const o={t,i:k,p,conf:n,sup:null,lb:prev?(t==='H'?(p>prev.p?'HH':'LH'):(p>prev.p?'HL':'LL')):t};
    lv.push(o); S.all.push(o); if(t==='H') actH={p,i:k,broken:false}; else actL={p,i:k,broken:false}; };
  const lastOf=t=>{ for(let q=S.live.length-1;q>=0;q--) if(S.live[q].t===t) return S.live[q]; return null; };
  const brkTry=(cl,i)=>{ if(actH&&!actH.broken&&cl>actH.p){ actH.broken=true; const lw=lastOf('L'); S.brk.push({dir:1,sw:actH.i,ci:i,p:actH.p,prot:lw?lw.p:null}); }
    else if(actL&&!actL.broken&&cl<actL.p){ actL.broken=true; const hw=lastOf('H'); S.brk.push({dir:-1,sw:actL.i,ci:i,p:actL.p,prot:hw?hw.p:null}); } };
  for(let i=0;i<nUse;i++){
    while(nxt<NB&&b[nxt].i1<=i){ const n=nxt++, k=n-len;                                           // a direction-timeframe candle has just closed: confirm its swing
      if(k>=len){ let hi=true,lo=true; for(let j=1;j<=len;j++){ if(!(b[k].high>b[k-j].high&&b[k].high>=b[k+j].high)) hi=false; if(!(b[k].low<b[k-j].low&&b[k].low<=b[k+j].low)) lo=false; if(!hi&&!lo) break; }
        if(hi) add('H',k,b[k].high,n); if(lo) add('L',k,b[k].low,n); }
      if(!fast) brkTry(b[n].close,b[n].i1); }
    if(fast) brkTry(c[i].close,i); }                                                              // immediate: the chart candle that closes beyond the swing is the BOS candle
  return S; }
function mqBOS(c,p,iv,forming,tz,D){
  const N=c.length, nUse=forming?N-1:N; D.sig=[]; D.brk=[]; D.ev=[]; D.nyOn=true; D.bosOn=true; D.nyBrk=[]; D.nyBox=[]; D.nyFvg=[]; D.nySmc={lines:[],obs:[]}; D.bosLines=[]; D.bosPiv=[];
  const sessOn=p.nySess!==false, nS=sessOn?mqMin(p.nyStartH):0; let nE=sessOn?mqMin(p.nyEndH):0; if(nE===0) nE=1440;            // New York session ON (default): only inside it. OFF: all day
  if(nS===nE){ D.msg='MFG Snap BOS: the New York start time and the trading end are the same'; return; }
  const wrapN=nE<=nS, R3=[1,2,3].map(k=>{ const v=+p['nyTp'+k+'R']; return v>0?v:k; }), pad=isFinite(+p.bosPad)?Math.max(0,+p.bosPad):0.5;
  let sec=MQ_TFS[p.bosTf]||0; if(!sec) sec=iv*12; if(sec<iv*2){ sec=iv*12; D.msg='BOS direction timeframe must be higher than the chart candle: using chart x12'; }
  const len=mqC(Math.round(+p.bosLen)||5,1,30), F=mqFold(c,nUse,sec,iv), fast=p.bosConf!==MQ_BCF[1];
  if(F.nb<2*len+4){ D.msg='MFG Snap BOS: the direction timeframe has only '+F.nb+' closed candles from the loaded data, needs '+(2*len+4)+'. Load more history, lower the swing length or use a lower direction timeframe'; return; }
  const mn=new Array(N), dy=new Array(N), per=new Int32Array(N).fill(-1), periods=[];
  for(let i=0;i<N;i++){ const q=mqLoc(tz,c[i].time); mn[i]=q.min; dy[i]=q.day; const m=q.min, w=wrapN?(m>=nS||m<nE):(m>=nS&&m<nE); if(!w) continue;
    const id=wrapN&&m<nE?q.day-1:q.day; let cur=periods[periods.length-1];
    if(!cur||cur.id!==id||cur.b!==i-1){ cur={id,a:i,b:i,hi:c[i].high,lo:c[i].low}; periods.push(cur); } else { cur.b=i; cur.hi=Math.max(cur.hi,c[i].high); cur.lo=Math.min(cur.lo,c[i].low); }
    per[i]=periods.length-1; }
  const sidOf=pi=>{ const id=periods[pi].id; let n=0; for(let k=0;k<D.sess.length;k++) if(D.sess[k].id<id) n++; return n; };
  periods.forEach((P,pi)=>{ P.si=sidOf(pi); if(sessOn) D.nyBox.push({si:P.si,a:P.a,b:P.b,hi:P.hi,lo:P.lo}); });
  const S=mqStruct(c,F,nUse,len,fast), origin=new Set();
  S.brk.forEach(k=>{ const j=k.ci; if(j>=nUse||per[j]<0) return;                                  // the BOS candle must close inside the New York period
    const P=periods[per[j]], up=k.dir===1, q=c[j], en=q.close, i0=up?F.bars[k.sw].hiI:F.bars[k.sw].loI;
    D.bosLines.push({si:P.si,i0,i1:j,y:k.p,dir:k.dir}); origin.add(k.sw);
    let sz=0, n=0; for(let m=Math.max(0,j-19);m<=j;m++){ sz+=c[m].high-c[m].low; n++; } sz=n?sz/n:0;
    let slr; if(p.bosSl===MQ_BSL[1]){ const bk=Math.floor(q.time/sec); slr=up?q.low:q.high; for(let m=j-1;m>=0&&Math.floor(c[m].time/sec)===bk;m--) slr=up?Math.min(slr,c[m].low):Math.max(slr,c[m].high); }
    else if(p.bosSl===MQ_BSL[2]&&k.prot!=null&&(up?k.prot<en:k.prot>en)) slr=k.prot;
    else slr=up?Math.max(k.p,q.low):Math.min(k.p,q.high);                                          // tight: the nearer of the broken level / the break candle extreme
    const sl=up?slr-pad*sz:slr+pad*sz, risk=up?en-sl:sl-en; if(!(risk>0)) return;
    const T=R3.map(r=>en+(up?1:-1)*risk*r), t={si:P.si,dir:k.dir,brk:j,i:j,time:q.time,price:en,sl,t:T,R:R3,tp:0,res:'',end:j,ki:j}, pe=Math.min(P.b,nUse-1);
    for(let m=j+1;m<=pe;m++){ const z=c[m]; if(up?z.low<=sl:z.high>=sl){ t.res='sl'; t.end=m; break; } for(let u=0;u<3;u++){ if((up?z.high>=T[u]:z.low<=T[u])&&t.tp<u+1) t.tp=u+1; } t.end=m; if(t.tp===3){ t.res='tp3'; break; } }
    t.done=!!t.res||per[j]<periods.length-1||P.b<nUse-1;                                           // finished trade (stop / TP3 hit, or the New York period is over)
    D.sig.push(t); D.ev.push({type:up?'buy':'sell',time:q.time,idx:j,price:q.close,sl,t:T,ny:1,bos:1}); });
  S.all.filter(q=>q.sup==null&&q.lb.length===2).forEach(q=>{ const bar=F.bars[q.i], ci=q.t==='H'?bar.hiI:bar.loI; if(!(per[ci]>=0||origin.has(q.i))) return; D.bosPiv.push({si:per[ci]>=0?periods[per[ci]].si:0,i:ci,y:q.p,t:q.t,lb:q.lb}); });
  D.bosPiv=D.bosPiv.slice(-80); }
// ---- MSS (market structure shift), OPTIONAL overlay of MFG Snap: lines + label only, NO BUY / SELL ----
// Same swing structure as the BOS strategy (swing highs / lows HH HL LH LL found on the chosen higher timeframe, a break = a chart candle CLOSING beyond the active swing).
// A MSS = the first break that goes AGAINST the previous break (the trend flips): a bullish break after a bearish one, or a bearish break after a bullish one. Breaks with the trend are BOS, not MSS.
// The very first break of the loaded history has nothing before it, so it is never marked. Works with every strategy of MFG Snap, all day (not limited to the New York period).
function mqMSS(c,p,iv,forming,D){
  const N=c.length, nUse=forming?N-1:N; D.mss=[]; D.mssTf='';
  let sec=MQ_TFS[p.mssTf]||0; if(!sec) sec=iv*12; if(sec<iv*2){ sec=iv*12; D.msg=D.msg||'MSS timeframe must be higher than the chart candle: using chart x12'; }
  D.mssTf=sec>=86400?Math.round(sec/86400)+'D':sec>=3600?(Math.round(sec/360)/10)+'H':Math.round(sec/60)+'m';
  const len=mqC(Math.round(+p.mssLen)||5,1,30), F=mqFold(c,nUse,sec,iv), fast=p.mssConf!==MQ_BCF[1];
  if(F.nb<2*len+4){ D.msg=D.msg||'MSS: the timeframe has only '+F.nb+' closed candles from the loaded data, needs '+(2*len+4)+'. Load more history, lower the swing length or use a lower MSS timeframe'; return; }
  const S=mqStruct(c,F,nUse,len,fast); let prev=0;
  S.brk.forEach(k=>{ if(prev!==0&&k.dir!==prev){ const bar=F.bars[k.sw]; D.mss.push({i0:k.dir===1?bar.hiI:bar.loI,i1:k.ci,y:k.p,dir:k.dir}); } prev=k.dir; });
  const keep=Math.max(0,Math.round(+p.mssKeep)||0); if(keep>0&&D.mss.length>keep) D.mss=D.mss.slice(-keep);
}
// BREAK strategy: only the New York box (high to low of the New York period, default 4 PM to 00:00) is shown when "New York session" is ON. No New York signals, buttons, FVG or SMC.
function mqNYBox(c,p,tz,D){ const N=c.length, nS=mqMin(p.nyStartH); let nE=mqMin(p.nyEndH); if(nE===0) nE=1440; if(nS===nE) return; const wrapN=nE<=nS, per=[];
  for(let i=0;i<N;i++){ const q=mqLoc(tz,c[i].time), m=q.min, w=wrapN?(m>=nS||m<nE):(m>=nS&&m<nE); if(!w) continue; const id=wrapN&&m<nE?q.day-1:q.day; let cur=per[per.length-1];
    if(!cur||cur.id!==id||cur.b!==i-1) per.push({id,a:i,b:i,hi:c[i].high,lo:c[i].low}); else { cur.b=i; cur.hi=Math.max(cur.hi,c[i].high); cur.lo=Math.min(cur.lo,c[i].low); } }
  D.nyOn=true; D.nyBrk=[]; D.nyFvg=[]; D.nySmc={lines:[],obs:[]}; D.nyBox=per.map(P=>{ let n=0; for(let k=0;k<D.sess.length;k++) if(D.sess[k].id<P.id) n++; return {si:n,a:P.a,b:P.b,hi:P.hi,lo:P.lo}; }); }
function mqCompute(c,p,iv,forming,tz){
  const N=c.length, D={N,iv,ok:false,msg:'',sess:[],brk:[],sig:[],ev:[]};
  if(N<5||!iv) return D;
  if(iv>=86400){ D.msg='MFG Snap needs an intraday chart (it works inside a time window)'; return D; }
  const s=mqMin(p.startH), e=mqMin(p.endH);
  if(s===e){ D.msg='MFG Snap: the start time and the end time are the same'; return D; }
  const wrap=s>e, K=mqC(Math.round(+p.cnt)||5,1,200), eN=mqC(Math.round(+p.entryN)||2,1,10), one=p.mode===MQ_MD[1], brkC=!!p.brkClose, run=p.after===MQ_AFT[1];
  const per=isFinite(+p.perSide)?Math.round(+p.perSide):1, lim=per>0?per:1e9, gap=Math.max(0,Math.round(+p.gap)||0), thk=isFinite(+p.thk)?Math.max(0,+p.thk):0.5;
  const slN=mqC(Math.round(+p.slN)||2,1,50), R=[1,2,3,4].map(k=>{ const v=+p['tp'+k+'R']; return v>0?v:k; });
  D.s=s; D.e=e; const bk=p.strat===MQ_STRAT[3]; D.bkOn=bk;   // BREAK buy / sell strategy (works alone)
  // local clock of every candle, then the windows (one per day)
  const mn=new Array(N), sess=D.sess; let cur=null;
  for(let i=0;i<N;i++){ const q=mqLoc(tz,c[i].time), m=q.min; mn[i]=m; const w=wrap?(m>=s||m<e):(m>=s&&m<e); if(!w) continue;
    const id=q.day-(wrap&&m<e?1:0); if(!cur||cur.id!==id){ cur={id,i0:i,i1:i}; sess.push(cur); } else cur.i1=i; }
  sess.forEach(S=>{ const d0=((mn[S.i0]-s)%1440+1440)%1440, d1=((e-mn[S.i1])%1440+1440)%1440; S.tS=c[S.i0].time-d0*60; S.tE=c[S.i1].time+d1*60; });
  { const rE=(p.rectT!==''&&p.rectT!=null&&isFinite(+p.rectT))?mqMin(p.rectT):e; sess.forEach(S=>{ S.tR=Math.max(S.tE,S.tS+(((rE-s)%1440+1440)%1440)*60); }); }   // rectangles only: extended up to this time
  let last=-1e9, shortN=0, minHave=1e9;
  sess.forEach((S,si)=>{
    const a=S.i0, b=a+K-1, have=S.i1-S.i0+1;
    if(have<K){ if(si>0&&si<sess.length-1){ shortN++; minHave=Math.min(minHave,have); } return; }      // not enough candles in this window (or the day is still in progress)
    if(forming&&b>=N-1) return;                                                                  // the Nth candle is still forming
    let hi=-Infinity, lo=Infinity, sz=0; for(let j=a;j<=b;j++){ hi=Math.max(hi,c[j].high); lo=Math.min(lo,c[j].low); sz+=c[j].high-c[j].low; } sz/=K;
    const th=thk*sz, up=one?{lo,hi}:{lo:hi,hi:hi+th}, dn=one?{lo,hi}:{lo:lo-th,hi:lo};
    S.rg={hi,lo,up,dn,b};
    let endI=Math.min(run?(si+1<sess.length?sess[si+1].i0-1:N-1):S.i1,N-1);
    if(bk){ let e2=S.i1; while(e2+1<N&&c[e2+1].time<S.tR) e2++; endI=Math.min(e2,si+1<sess.length?sess[si+1].i0-1:N-1,N-1); }   // BREAK strategy: signals are valid as long as the rectangles are drawn (until 00:00)
    const mkTr=(dir,j,q,brk)=>{ const bull=dir===1, en=q.close, k=Math.max(0,j-slN); let sl=bull?c[k].low:c[k].high;   // stop loss: the Nth candle back from the entry candle
      if(bull?sl>=en:sl<=en){ for(let m=k;m<=j;m++) sl=bull?Math.min(sl,c[m].low):Math.max(sl,c[m].high); }
      const risk=bull?en-sl:sl-en; if(!(risk>0)) return null; const T=R.map(r=>en+(bull?1:-1)*risk*r), tr={si,dir,brk,i:j,time:q.time,price:en,sl,t:T,R,tp:0,res:'',end:j,ki:k};
      for(let m=j+1;m<=endI;m++){ if(forming&&m===N-1) break; const z=c[m], hs=bull?z.low<=sl:z.high>=sl; if(hs){ tr.res='sl'; tr.end=m; break; }
        for(let u=0;u<4;u++){ if((bull?z.high>=T[u]:z.low<=T[u])&&tr.tp<u+1) tr.tp=u+1; } tr.end=m; if(tr.tp===4){ tr.res='tp4'; break; } }
      return tr; };
    // BREAK strategy: SL tightly beyond the OTHER rectangle (BUY: just below the red one, SELL: just above the green one), TP1 / TP2 / TP3
    const bpad=isFinite(+p.bkPad)?Math.max(0,+p.bkPad):0.1;
    const mkBk=(dir,j,q,brk)=>{ const bull=dir===1, en=q.close, sl=bull?dn.lo-bpad*sz:up.hi+bpad*sz, risk=bull?en-sl:sl-en; if(!(risk>0)) return null;
      const R3=R.slice(0,3), T=R3.map(r=>en+(bull?1:-1)*risk*r), tr={si,dir,brk,i:j,time:q.time,price:en,sl,t:T,R:R3,tp:0,res:'',end:j,ki:j,bk:1};
      const revOn=p.bkRev!==false, ext=isFinite(+p.bkExt)?Math.max(0,Math.round(+p.bkExt)):60, lastM=p.bkCont!==false?N-1:endI;   // bkCont: the trade is followed past the end time (00:00) until SL / TP3 / price turns back, not cut at the rectangles' end
      for(let m=j+1;m<=lastM;m++){ if(forming&&m===N-1) break; const z=c[m], hs=bull?z.low<=sl:z.high>=sl; if(hs){ tr.res='sl'; tr.end=m; break; }
        for(let u=0;u<3;u++){ if((bull?z.high>=T[u]:z.low<=T[u])&&tr.tp<u+1) tr.tp=u+1; } tr.end=m; if(tr.tp===3){ tr.res='tp3'; break; }
        if(revOn&&tr.tp>=1&&(bull?z.close<en:z.close>en)){ tr.res='rev'; break; } }   // a trade that already reached TP1 ends when price turns back through the entry (the lines stop there)
      tr.xe=tr.end;
      if(tr.res==='tp3'){ for(let m=tr.end+1;m<=lastM&&m<=tr.end+ext;m++){ if(forming&&m===N-1) break; const z=c[m]; if(bull?z.close<en:z.close>en) break; tr.xe=m; } }   // lines of a completed trade keep extending until price turns back through the entry
      return tr; };
    // RECOVERY (same direction, never opposite): when a break trade hits its stop before any TP (liquidity sweep), the SAME rules start again after the stop candle:
    // a failed BUY waits for the Nth (2nd) green candle that closes above the green line = recovery BUY; a failed SELL waits for the 2nd red candle that closes below the red line = recovery SELL.
    // Same tight stop beyond the other rectangle, TP1-3, own colours. One recovery per failed trade, valid until the rectangles end (00:00).
    // MAX TRADES PER DAY (default 0 = no limit, trading goes on until 00:00; a number limits it, the recovery counts): a trade can only start when the previous one is FINISHED (no overlapping trades), and never after the limit.
    // First trade fails -> only its recovery may follow (if the recovery fails too: no third trade until tomorrow). First trade wins -> one more trade, then nothing more until tomorrow.
    let tN=0, busy=-1; const bkMax=(Math.round(+p.bkMax)||0)>0?Math.round(+p.bkMax):1e9, okT=j=>tN<bkMax&&j>busy;
    // RECOVERY: after a trade hits its stop (before any TP) the NEXT trade of the day is a recovery. It can be the SAME direction (the 2nd green / red candle beyond the line again)
    // OR the OPPOSITE direction (the normal break + 2nd candle of the other rectangle): whichever completes first. Recovery of a recovery does not exist. Only one trade at a time, max trades per day.
    let recPend=null;
    const after=tr=>{ tN++; busy=tr.res?tr.end:1e9; recPend=null; if(bk&&p.recOn&&!tr.rec&&tr.res==='sl'&&tr.tp===0) recPend={dir:tr.dir,g:0,brk:tr.brk}; };
    const cntG=(d,q)=>d===1?(q.close>q.open&&q.close>up.hi):(q.close<q.open&&q.close<dn.lo);   // a green (red) candle that CLOSED beyond the rectangle line
    let st=null; const armed={'1':true,'-1':true}, cnt={'1':0,'-1':0};
    for(let j=b+1;j<=endI;j++){
      if(forming&&j===N-1) break;
      const q=c[j], upB=brkC?q.close>up.hi:q.high>up.hi, dnB=brkC?q.close<dn.lo:q.low<dn.lo;
      if(!upB) armed[1]=true; if(!dnB) armed[-1]=true;
      let handled=false;
      if(bk&&recPend&&okT(j)){ if(cntG(recPend.dir,q)) recPend.g++;                                   // same-direction recovery: the Nth green / red candle beyond the line again
        if(recPend.g>=eN){ const tr=mkBk(recPend.dir,j,q,recPend.brk); if(tr){ tr.rec=1; D.sig.push(tr); D.ev.push({type:recPend.dir===1?'buy':'sell',time:q.time,idx:j,price:q.close,sl:tr.sl,t:tr.t,bk:1,rec:1}); last=j; after(tr); st=null; handled=true; } } }
      if(st){ const u=st.dir===1, opp=u?dnB:upB;
        if(opp) st=null;                                                                         // the other side broke: this setup is dead
        else if(p.cancelBack&&(u?q.close<hi:q.close>lo)) st=null;                                // optional: closed back inside the range
        else { handled=true; if(bk?cntG(st.dir,q):(u?q.close>q.open:q.close<q.open)) st.g++;
          if(st.g>=eN){ if(j-last>=gap&&(!bk||okT(j))){ const tr=(bk?mkBk:mkTr)(st.dir,j,q,st.brk); if(tr){ if(bk&&recPend) tr.rec=1; D.sig.push(tr); D.ev.push({type:u?'buy':'sell',time:q.time,idx:j,price:q.close,sl:tr.sl,t:tr.t,bk:bk?1:0,rec:tr.rec?1:0}); last=j; cnt[st.dir]++; if(bk) after(tr); } } st=null; } } }
      if(!handled&&!st){ const canU=upB&&armed[1]&&(bk||cnt[1]<lim)&&(!bk||okT(j)), canD=dnB&&armed[-1]&&(bk||cnt[-1]<lim)&&(!bk||okT(j)); let d=0;
        if(canU&&canD) d=q.close>=q.open?1:-1; else if(canU) d=1; else if(canD) d=-1;
        if(d){ st={dir:d,brk:j,g:0}; armed[d]=false; D.brk.push({si,dir:d,i:j});
          if(bk){ if(cntG(d,q)) st.g=1;                                                          // the break candle itself counts when it is green (red for a SELL): green, green = BUY
            if(st.g>=eN){ if(j-last>=gap&&okT(j)){ const tr=mkBk(d,j,q,j); if(tr){ if(recPend) tr.rec=1; D.sig.push(tr); D.ev.push({type:d===1?'buy':'sell',time:q.time,idx:j,price:q.close,sl:tr.sl,t:tr.t,bk:1,rec:tr.rec?1:0}); last=j; cnt[d]++; after(tr); } } st=null; } } } } } });
  if(p.strat===MQ_STRAT[1]){ try{ mqNY(c,p,iv,forming,tz,D); }catch(e){ console.error('mfs new york failed',e); D.msg='MFG Snap New York error: '+(e&&e.message); } }
  if(bk&&p.nySess!==false){ try{ mqNYBox(c,p,tz,D); }catch(e){ console.error('mfs ny box failed',e); } }
  const bosM=p.strat===MQ_STRAT[2];
  if(bosM){ try{ mqBOS(c,p,iv,forming,tz,D); }catch(e){ console.error('mfs bos failed',e); D.sig=[]; D.brk=[]; D.ev=[]; D.msg='MFG Snap BOS error: '+(e&&e.message); } }   // BOS works alone: the window BUY / SELL and break triangles are dropped
  if(shortN&&!bosM) D.msg='MFG Snap: on this timeframe the window holds only '+minHave+' candles but '+K+' are needed. Use a lower timeframe or count fewer candles';
  if(p.showMss){ try{ mqMSS(c,p,iv,forming,D); }catch(e){ console.error('mfs mss failed',e); D.mss=[]; D.msg=D.msg||'MFG Snap MSS error: '+(e&&e.message); } }
  D.ok=true; return D; }
function mqBkCol(s,p,def){ if(!s.bk) return def; if(s.res==='sl'&&s.tp===0) return s.rec?(p.cFailRec||'#5b6068'):(p.cFail||'#8a8f98'); if(s.rec) return s.dir===1?(p.cRecBuy||'#00b0ff'):(p.cRecSell||'#ff9100'); if(s.tp>0) return s.dir===1?p.cBuy:p.cSell; return def; }
let mqMem=null;
function mqGet(c,p){ const N=c.length, iv=mqIv(c), tz=mqTz(p.tz), forming=N>0&&iv>0&&(c[N-1].time+iv)*1000>Date.now();
  const key=JSON.stringify(p)+'|'+tz+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+forming+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(mqMem&&mqMem.k===key) return mqMem.D;
  let D; try{ D=mqCompute(c,p,iv,forming,tz); }catch(e){ console.error('mfs calc failed',e); D={N,iv,ok:false,msg:'MFG Snap calculation error: '+(e&&e.message),sess:[],brk:[],sig:[],ev:[]}; } mqMem={k:key,D}; return D; }
IND.mfs={label:'MFG Snap',title:'MFG Snap \u00b7 default: Break up buy / break down sell + New York box (also: BOS buy and sell, 1:15 PM window, New York sells and buy, Break up buy / break down sell)',cat:'Trend',nm:p=>'MFG Snap',p:Object.assign({},MQ_DEF),cols:['#2962ff'],
  fields:[['tz','sel','Time zone of the window',{opts:MQ_TZ}],['startH','num','Start line (hour: 13.25 = 1:15 PM)',{min:0,max:23.99,step:'any'}],['endH','num','End line (hour: 14.25 = 2:15 PM)',{min:0,max:23.99,step:'any'}],['rectT','num','Rectangles extend until (hour: 0 = midnight 00:00, 15 = 3 PM). Only the rectangles are extended',{min:0,max:23.99,step:'any'}],
    ['cnt','num','Candles counted from the start line (5, 3, 6 ... any number)',{min:1,max:200,step:1}],['mode','sel','Rectangles',{opts:MQ_MD}],['thk','num','Rectangle thickness (x average candle of the counted candles)',{min:0,max:10,step:0.1}],
    ['brkClose','chk','Break needs a candle CLOSE beyond the rectangle (off = wick)'],['entryN','num','BUY / SELL on the Nth green / red candle after the break (2 = second)',{min:1,max:10,step:1}],['cancelBack','chk','Cancel the setup if price closes back inside the range'],
    ['perSide','num','Signals per side per window (0 = no limit)',{min:0,max:50,step:1}],['gap','num','Next signal only after N candles (0 = off, 20, 50 ... any number)',{min:0,max:5000,step:1}],['slN','num','Stop loss: on the Nth candle back from the entry candle (2 = two candles back)',{min:1,max:50,step:1}],['tp1R','num','TP1 (x risk)',{min:0.25,max:50,step:0.25}],['tp2R','num','TP2 (x risk)',{min:0.25,max:50,step:0.25}],['tp3R','num','TP3 (x risk)',{min:0.25,max:50,step:0.25}],['tp4R','num','TP4 (x risk)',{min:0.25,max:50,step:0.25}],['after','sel','Signals / trade lines are followed',{opts:MQ_AFT}],['keepDays','num','Days to display (0 = all history)',{min:0,max:3650,step:1}],
    ['showLines','chk','Show the start / end vertical lines'],['showShade','chk','Shade the window'],['showBox','chk','Show the rectangles'],['showLabels','chk','Show the time labels on the lines'],['showBrk','chk','Show the break triangles'],['showSig','chk','Show BUY / SELL buttons'],['showRisk','chk','Show the stop loss and TP1-TP4 lines'],['onlyActive','chk','Live trade: SL + TP1-TP3 stay (touched ones get a tick) and follow price until TP3 or SL; finished trades are hidden'],
    ['sigLen','num','BUY / SELL dotted line length (px)',{min:4,max:160}],['btnFs','num','Button text size',{min:6,max:14}],
    ['cStart','col','Start line'],['cEnd','col','End line'],['cUp','col','Upper rectangle (break up)'],['cDn','col','Lower rectangle (break down)'],['cBuy','col','BUY'],['cSell','col','SELL'],['cSl','col','Stop loss'],['cTp','col','Take profits'],['bkLen','num','Break strategy: SL / TP lines are at least this many candles long, price + level at the end (0 = off)',{min:0,max:500,step:5}],['bkCont','chk','Break strategy: keep the SL / TP1-3 lines running past the end time until SL, TP3 or price turns back (not cut at 00:00)'],['bkExt','num','Break strategy: TP lines of a completed trade keep extending (candles) until price turns back through the entry',{min:0,max:500,step:5}],['bkRev','chk','Break strategy: a trade that reached TP1 ends (lines stop) when price closes back through the entry'],['bkHide','chk','Break strategy: a failed trade followed by another trade hides its SL / TP lines (no overlapping boxes)'],['bkMax','num','Break strategy: maximum trades per day (0 = no limit: trades continue until the rectangles end at 00:00; a recovery counts as a trade)',{min:0,max:50,step:1}],['bkPad','num','Break strategy: stop loss padding beyond the rectangle (x average candle, 0 = exactly at the edge)',{min:0,max:10,step:0.05}],['cFail','col','Break strategy: failed trade (SL / TP1-3 / BUY / SELL / X)'],['cFailRec','col','Recovery trade failed (darker grey, SL / TP1-3 / button / X)'],['recOn','chk','Break strategy: RECOVERY after a stop: the next trade (same direction or the opposite) is a recovery'],['cRecBuy','col','Recovery BUY theme'],['cRecSell','col','Recovery SELL theme'],
    ['alBuy','chk','Alert on BUY'],['alSell','chk','Alert on SELL'],['alSound','chk','Play a sound'],
    ['strat','sel','STRATEGY (only one works, the others are off): MFG Snap window, New York sells and buy, BOS buy and sell, or Break up buy / break down sell',{opts:MQ_STRAT}],['showWin','chk','Win-rate box (top right, small, transparent): TP1 / TP2 / TP3 / overall'],['nySess','chk','New York session ON: BOS BUY / SELL and BOS lines only inside it (start and end below). Off = all day'],
    ['bosTf','sel','BOS strategy: direction timeframe (Auto = 12 x chart candle, 1 hour on 5 min)',{opts:Object.keys(MQ_TFS)}],['bosLen','num','BOS strategy: swing length (candles on each side, direction timeframe)',{min:1,max:30,step:1}],['bosConf','sel','BOS strategy: BUY / SELL on',{opts:MQ_BCF}],['bosSl','sel','BOS strategy: stop loss',{opts:MQ_BSL}],['bosPad','num','BOS strategy: stop loss padding (x average candle)',{min:0,max:10,step:0.1}],['bosLines','chk','BOS strategy: show the BOS lines'],['bosLbl','chk','BOS strategy: show the HH HL LH LL labels'],['cBosBuy','col','BOS line (bullish)'],['cBosSell','col','BOS line (bearish)'],['cBosTxt','col','HH HL LH LL labels'],['showMss','chk','MSS (market structure shift): show it from a higher timeframe on this chart, lines only, NO BUY / SELL (works with every strategy)'],['mssTf','sel','MSS: timeframe (Auto = 12 x chart candle, 1 hour on 5 min)',{opts:Object.keys(MQ_TFS)}],['mssLen','num','MSS: swing length (candles on each side, MSS timeframe)',{min:1,max:30,step:1}],['mssConf','sel','MSS: confirmed on',{opts:MQ_BCF}],['mssKeep','num','MSS: how many of the latest MSS to show (0 = all)',{min:0,max:500,step:1}],['mssLbl','chk','MSS: show the label'],['cMssUp','col','MSS line (bullish shift)'],['cMssDn','col','MSS line (bearish shift)'],['nyStartH','num','New York: session start = trading start (hour: 16 = 4 PM, 16.5 = 4:30 PM)',{min:0,max:23.99,step:'any'}],['nyEndH','num','New York: trading end (hour: 0 = 00:00). After it nothing is drawn or happens until the next New York session',{min:0,max:23.99,step:'any'}],
    ['nyBox','chk','New York: show the New York box'],['nyName','txt','New York: box name'],['nyBrkGap','num','New York: next BREAKOUT counts only after N candles (50, 20, 100 ... any number, 0 = off)',{min:0,max:5000,step:1}],['nySigGap','num','New York: next BUY / SELL only after N candles (50, 69, 100 ... any number, 0 = off)',{min:0,max:5000,step:1}],['nyShowBrk','chk','New York: show the breakout buttons'],
    ['nySlPad','num','New York: stop loss padding beyond the rectangle (x average candle, 0 = exactly at the rectangle)',{min:0,max:10,step:0.1}],['nyTp1R','num','New York: TP1 (x risk)',{min:0.25,max:50,step:0.25}],['nyTp2R','num','New York: TP2 (x risk)',{min:0.25,max:50,step:0.25}],['nyTp3R','num','New York: TP3 (x risk)',{min:0.25,max:50,step:0.25}],
    ['nyFvg','chk','New York advanced: show Fair Value Gaps'],['nyFvgReq','chk','New York advanced: BUY / SELL needs a Fair Value Gap in its direction after the breakout'],['nySmc','chk','New York advanced: Smart Money Concept (swing BOS / CHoCH lines)'],['nyOb','chk','New York advanced: Smart Money Concept order blocks'],['nySmcLen','num','New York advanced: swing length (candles on each side)',{min:2,max:30,step:1}],['nySmcReq','chk','New York advanced: BUY / SELL needs the Smart Money structure in its direction'],
    ['nyTransp','num','New York: box transparency (0 solid, 100 invisible)',{min:0,max:100}],['cNy','col','New York box'],['cBrk','col','New York breakout buttons'],['cFvgUp','col','New York bullish Fair Value Gap'],['cFvgDn','col','New York bearish Fair Value Gap']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},MQ_DEF,p), D=mqGet(c,q); return {mk:[],boxes:[{type:'mfsview',pts:[],o:q,D}],labels:[],events:D.ok?D.ev:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='mfsview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, N=candles.length; if(!D) return;
    // BOS mode: ONE set of BUY / SELL + ONE risk display. If 'MFG Snap + Risk management' (mfr) is also on the chart it already draws the same BOS signals, so this one skips them (no double buttons, no double SL / TP)
    const dupe=!!(D.bosOn||D.bkOn)&&!p.autoRisk&&(()=>{ try{ return inds.some(i=>i.t==='mfr'&&show(i)); }catch(e){ return false; } })();
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.font='10px system-ui,sans-serif'; cx.textBaseline='middle'; cx.setLineDash([]);
    if(D.ok&&N>=3&&D.N===N){ const iv=D.iv, c=candles, one=p.mode===MQ_MD[1];
      const xi=i=>{ const v=X(i); return v==null?null:v; };
      const xt=t=>{ let lo=0, hi=N-1; while(lo<hi){ const m=(lo+hi+1)>>1; if(c[m].time<=t) lo=m; else hi=m-1; } const x0=xi(lo); if(x0==null) return null; let bs; if(lo>0){ const xp=xi(lo-1); bs=xp==null?6:x0-xp; } else { const xn=xi(1); bs=xn==null?6:xn-x0; } return x0+((t-c[lo].time)/iv-0.5)*bs; };
      const pill=(t,x,y,bg,al)=>{ const w=cx.measureText(t).width+8; let lx=al==='r'?x-w:al==='c'?x-w/2:x; if(lx+w>W-2) lx=W-w-2; if(lx<2) lx=2; cx.fillStyle=bg; cx.fillRect(lx,y-7,w,14); cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText(t,lx+4,y); };
      const keep=Math.max(0,Math.round(+p.keepDays)||0); let S0=0; if(keep>0){ const lastId=D.sess.length?D.sess[D.sess.length-1].id:0; while(S0<D.sess.length&&D.sess[S0].id<=lastId-keep) S0++; }
      const vis=[]; for(let si=S0;si<D.sess.length;si++){ const S=D.sess[si], xs=xt(S.tS), xe=xt(S.tE); if(xs==null||xe==null||xe<-60||xs>W+60) continue; const xr=xt(S.tR); vis.push([S,xs,xe,xr==null?xe:Math.max(xr,xe)]); }
      // shading, rectangles, vertical lines
      vis.forEach(([S,xs,xe,xr])=>{ if(p.showShade){ cx.fillStyle=mqRgba(p.cStart,0.06); cx.fillRect(xs,0,Math.max(1,xe-xs),H); }
        if(p.showBox&&S.rg){ const box=(lo,hi,col,txt,above)=>{ const ya=Y(hi), yb=Y(lo); if(ya==null||yb==null) return; const t0=Math.min(ya,yb), h=Math.max(3,Math.abs(yb-ya));
            cx.fillStyle=mqRgba(col,0.28); cx.fillRect(xs,t0,Math.max(1,xr-xs),h); cx.strokeStyle=mqRgba(col,0.95); cx.lineWidth=1; cx.strokeRect(xs+0.5,t0+0.5,Math.max(1,xr-xs),h);
            if(p.showLabels&&txt){ cx.font='bold 9px system-ui,sans-serif'; pill(txt,xs+3,above?t0-8:t0+h+8,mqRgba(col,0.9),'l'); cx.font='10px system-ui,sans-serif'; } };
          if(one) box(S.rg.lo,S.rg.hi,p.cStart,null,true);
          else { box(S.rg.up.lo,S.rg.up.hi,p.cUp,null,true); box(S.rg.dn.lo,S.rg.dn.hi,p.cDn,null,false); } }
        if(p.showLines){ cx.lineWidth=1.3; cx.setLineDash([6,4]); cx.strokeStyle=p.cStart; cx.beginPath(); cx.moveTo(xs,0); cx.lineTo(xs,H); cx.stroke(); cx.strokeStyle=p.cEnd; cx.beginPath(); cx.moveTo(xe,0); cx.lineTo(xe,H); cx.stroke(); cx.setLineDash([]);
          if(p.showLabels){ pill(mqHM(D.s),xs+3,10,p.cStart,'l'); pill(mqHM(D.e),xe-3,10,p.cEnd,'r'); } } });
      // NEW YORK mode: the New York box (high to low of the period), Fair Value Gaps, Smart Money Concept
      if(D.nyOn){ const dot=(col,x0,x1,yA,yB,al,txt)=>{ const t0=Math.min(yA,yB), h=Math.max(1,Math.abs(yB-yA)), w=Math.max(2,x1-x0); cx.fillStyle=mqRgba(col,al); cx.fillRect(x0,t0,w,h); cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([1,3]); cx.strokeRect(x0+.5,t0+.5,w,h); cx.setLineDash([]);
          if(txt){ cx.font='9px system-ui,sans-serif'; cx.fillStyle=col; cx.textAlign='center'; cx.textBaseline='bottom'; cx.fillText(txt,x0+w/2,t0-2); cx.textBaseline='middle'; cx.font='10px system-ui,sans-serif'; } };
        if(p.nyBox) (D.nyBox||[]).forEach(r=>{ if(r.si<S0) return; const x0=xi(r.a), x1=xi(r.b), yT=Y(r.hi), yB=Y(r.lo); if(x0==null||x1==null||yT==null||yB==null||x1<-60||x0>W+60) return; dot(p.cNy,x0,x1,yT,yB,mqC(1-(+p.nyTransp>=0?+p.nyTransp:90)/100,0,1),p.nyName==null?'New York':p.nyName); });
        if(p.nyFvg) (D.nyFvg||[]).forEach(z=>{ if(z.si<S0) return; const x0=xi(z.i), x1=xi(z.end), yT=Y(z.top), yB=Y(z.bot); if(x0==null||x1==null||yT==null||yB==null||x1<-60||x0>W+60) return; dot(z.dir===1?p.cFvgUp:p.cFvgDn,x0,x1,yT,yB,0.2,'FVG'); });
        if(p.nySmc){ if(p.nyOb) (D.nySmc.obs||[]).forEach(z=>{ if(z.si<S0) return; const x0=xi(z.i), x1=xi(z.end), yT=Y(z.top), yB=Y(z.bot); if(x0==null||x1==null||yT==null||yB==null||x1<-60||x0>W+60) return; dot(z.dir===1?p.cBuy:p.cSell,x0,x1,yT,yB,0.18,'OB'); });
          (D.nySmc.lines||[]).forEach(z=>{ if(z.si<S0) return; const x0=xi(z.i0), x1=xi(z.i1), y=Y(z.y); if(x0==null||x1==null||y==null||x1<-60||x0>W+60) return; const col=z.dir===1?p.cBuy:p.cSell; cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([2,3]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]);
            cx.font='bold 8px system-ui,sans-serif'; cx.fillStyle=col; cx.textAlign='center'; cx.textBaseline=z.dir===1?'bottom':'top'; cx.fillText(z.txt,(x0+x1)/2,z.dir===1?y-1:y+1); cx.textBaseline='middle'; cx.font='10px system-ui,sans-serif'; }); } }
      // BOS strategy: external-structure BOS lines (solid, label in the middle) + swing labels, only inside the New York period
      if(D.bosOn&&!dupe){ if(p.bosLines) (D.bosLines||[]).forEach(z=>{ if(z.si<S0) return; const x0=xi(z.i0), x1=xi(z.i1), y=Y(z.y); if(x0==null||x1==null||y==null||x1<-60||x0>W+60) return; const col=z.dir===1?p.cBosBuy:p.cBosSell, xa=Math.max(-4,x0);
          cx.strokeStyle=col; cx.lineWidth=1.6; cx.setLineDash([]); cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(x1,y); cx.stroke();
          cx.font='bold 10px system-ui,sans-serif'; cx.fillStyle=col; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText('BOS',(xa+x1)/2,z.dir===1?y-6:y+7); cx.font='10px system-ui,sans-serif'; cx.textAlign='left'; });
        if(p.bosLbl) (D.bosPiv||[]).forEach(q=>{ if(q.si<S0) return; const x=xi(q.i), y=Y(q.y); if(x==null||y==null||x<-10||x>W+10) return; cx.font='bold 10px system-ui,sans-serif'; cx.fillStyle=p.cBosTxt; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(q.lb,x,q.t==='H'?y-8:y+9); cx.font='10px system-ui,sans-serif'; cx.textAlign='left'; }); }
      // MSS (market structure shift) from the chosen higher timeframe: dashed line + label only, NO buy / sell
      if(p.showMss) (D.mss||[]).forEach(z=>{ const x0=xi(z.i0), x1=xi(z.i1), y=Y(z.y); if(x0==null||x1==null||y==null||x1<-60||x0>W+60) return; const col=z.dir===1?p.cMssUp:p.cMssDn, xa=Math.max(-4,x0);
        cx.strokeStyle=col; cx.lineWidth=1.8; cx.setLineDash([7,4]); cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]);
        if(p.mssLbl){ cx.font='bold 10px system-ui,sans-serif'; cx.fillStyle=col; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText('MSS'+(D.mssTf?' '+D.mssTf:''),(xa+x1)/2,z.dir===1?y-6:y+7); cx.font='10px system-ui,sans-serif'; cx.textAlign='left'; } });
      const fs=mqC(Math.round(+p.btnFs)||8,6,14), ts=4, placed=[];
      // break triangles (point in the direction of the break)
      if(p.showBrk) D.brk.forEach(k=>{ if(k.si<S0) return; const cd=c[k.i], sx=xi(k.i); if(!cd||sx==null||sx<-20||sx>W+20) return; const up=k.dir===1, yy=Y(up?cd.high:cd.low); if(yy==null) return;
        const y0=up?yy-3:yy+3, y1=up?y0-ts*1.7:y0+ts*1.7; cx.beginPath(); cx.moveTo(sx,y1); cx.lineTo(sx-ts,y0); cx.lineTo(sx+ts,y0); cx.closePath(); cx.fillStyle=up?p.cBuy:p.cSell; cx.fill(); cx.strokeStyle='rgba(10,13,20,.85)'; cx.lineWidth=1; cx.stroke(); placed.push([sx-ts,Math.min(y0,y1),sx+ts,Math.max(y0,y1)]); });
      // tiny BUY / SELL button on a dotted line (moved further out if it would overlap another one)
      const btn=(sx,sy,len,up,txt,col)=>{ cx.font='bold '+fs+'px system-ui,sans-serif'; const w=cx.measureText(txt).width+8, h=fs+5; let L=len, tries=0, y1, y2, by;
        for(;;){ y1=up?sy-3:sy+3; y2=up?y1-L:y1+L; by=up?y2-h:y2; const r=[sx-w/2,by,sx+w/2,by+h]; if(tries++>10||!placed.some(q=>r[0]<q[2]&&r[2]>q[0]&&r[1]<q[3]&&r[3]>q[1])){ placed.push(r); break; } L+=h+3; }
        cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([1.5,2.5]); cx.beginPath(); cx.moveTo(sx,y1); cx.lineTo(sx,y2); cx.stroke(); cx.setLineDash([]);
        cx.fillStyle=col; cx.beginPath(); if(cx.roundRect) cx.roundRect(sx-w/2,by,w,h,h/2); else cx.rect(sx-w/2,by,w,h); cx.fill(); cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText(txt,sx,by+h/2+0.5); cx.font='10px system-ui,sans-serif'; cx.textAlign='left'; };
      if(p.showRisk&&!dupe&&!(D.bosOn&&p.autoRisk)) D.sig.forEach(s=>{ if(s.si<S0) return; let xe=s.xe!=null?s.xe:s.end; if(s.bk){ const ml=Math.max(0,Math.round(+p.bkLen)||0); if(ml>0&&xe<s.i+ml) xe=s.i+ml; D.sig.forEach(t=>{ if(t!==s&&t.i>s.end&&t.i<xe) xe=t.i; }); }   // bkLen: lines are at least N candles long (clear distance, price + level at the end)   // extended lines stop where the next trade starts (no overlap)
        const isAct=(s.done!==undefined?!s.done:(!s.res&&s.end>=N-2))&&(!s.bk||!D.sess[s.si]||c[N-1].time<D.sess[s.si].tR); if(isAct&&p.onlyActive!==false) xe=N-1;   // break strategy: a trade dies at 00:00 (end of its rectangles) - yesterday's trade never shows today   // live trade: the lines follow price to the newest candle until TP3 or SL
        const x0=xi(s.i), x1r=(()=>{ if(xe<=N-1) return xi(xe); const v=xi(N-1), pv=xi(N-2); return v==null?null:pv==null?v:v+(v-pv)*(xe-(N-1)); })(); if(x0==null||x1r==null) return; const x1=Math.max(x1r,x0+14); if(x1<-60||x0>W+60) return; const xk=xi(s.ki), xsl=(xk!=null&&xk<x0)?xk:x0;
        const lvAll=[['SL',s.sl,mqBkCol(s,p,p.cSl),s.res==='sl',xsl]].concat(s.t.map((v,u)=>['TP'+(u+1),v,mqBkCol(s,p,p.cTp),s.tp>u,x0])), onlyAct=p.onlyActive!==false, lv=onlyAct?(isAct?lvAll:[]):lvAll, labs=[], hid=s.bk&&p.bkHide!==false&&s.res==='sl'&&s.tp===0&&D.sig.some(t=>t!==s&&t.si===s.si&&t.i>s.i);   // failed trade followed by another one: its box disappears completely (button + X stay)
        lv.forEach(v=>{ if(hid) return; const y=Y(v[1]); if(y==null) return; cx.strokeStyle=v[2]; cx.lineCap=v[0]==='SL'?'butt':'round'; cx.lineWidth=v[0]==='SL'?(v[3]?2.2:1.4):(v[3]?3.6:3); cx.setLineDash(v[0]==='SL'?[]:[0.1,7.5]); cx.beginPath(); cx.moveTo(v[4],y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]); cx.lineCap='butt'; labs.push({y,t:v[0]+(v[3]?(v[0]==='SL'?' \u2715':' \u2713'):'')+' '+mqP(v[1]),c:v[2]}); });
        labs.sort((a,b)=>a.y-b.y); for(let k=1;k<labs.length;k++) if(labs[k].y-labs[k-1].y<14) labs[k].y=labs[k-1].y+14;
        cx.font='bold 9px system-ui,sans-serif'; labs.forEach(l=>pill(l.t,x1+3,l.y,mqRgba(l.c,0.85),'l')); cx.font='10px system-ui,sans-serif';
        if(s.bk&&s.res==='sl'&&s.tp===0){ const ys=lvAll.map(v=>Y(v[1])).filter(v=>v!=null), xe=xi(s.end); if(ys.length&&xe!=null){ const yx=Math.min.apply(null,ys)-10, r=s.rec?5:4; cx.strokeStyle=s.rec?(p.cFailRec||'#5b6068'):(p.cFail||'#8a8f98'); cx.lineWidth=s.rec?2.6:2; cx.beginPath(); cx.moveTo(xe-r,yx-r); cx.lineTo(xe+r,yx+r); cx.moveTo(xe+r,yx-r); cx.lineTo(xe-r,yx+r); cx.stroke(); } } });   // failed trade: a small grey X at the top
      const gl=mqC(+p.sigLen||30,4,160);
      if(D.nyOn&&p.nyShowBrk) (D.nyBrk||[]).forEach(k=>{ if(k.si<S0) return; const cd=c[k.i], sx=xi(k.i); if(!cd||sx==null||sx<-20||sx>W+20) return; const up=k.dir===1, sy=Y(up?cd.high:cd.low); if(sy==null) return; btn(sx,sy,gl,up,up?'break up':'break down',p.cBrk); });
      if(p.showSig&&!dupe) D.sig.forEach(s=>{ if(s.si<S0) return; const cd=c[s.i], sx=xi(s.i); if(!cd||sx==null||sx<-20||sx>W+20) return; const up=s.dir===-1, sy=Y(up?cd.high:cd.low); if(sy==null) return; btn(sx,sy,gl,up,(s.rec?'recovery ':'')+(s.dir===1?'buy':'sell'),mqBkCol(s,p,s.dir===1?p.cBuy:p.cSell)); });
      // win-rate box (top right): of the FINISHED trades shown on the chart, how many reached TP1 / TP2 / TP3, and the overall result (1/3 of the position closed at each target, the rest at the stop or at the end of the period)
      if(p.showWin&&!dupe){ const L=D.sig.filter(s=>s.si>=S0), dn=L.filter(s=>s.done!==undefined?s.done:(!!s.res||s.end<N-2)), n=dn.length, cn=k=>dn.filter(s=>s.tp>=k).length; let net=0, wn=0;
        dn.forEach(s=>{ const rk=Math.abs(s.price-s.sl)||1e-9; let r=0; for(let k=0;k<3;k++){ if(s.tp>k) r+=(s.t[k]-s.price)*s.dir/rk/3; else if(s.res==='sl') r-=1/3; else r+=(c[Math.min(s.end,N-1)].close-s.price)*s.dir/rk/3; } net+=r; if(r>0) wn++; });
        const pc=(a,b)=>b?Math.round(a/b*100)+'%':'-', rows=[['TP1',pc(cn(1),n)+'  '+cn(1)+'/'+n],['TP2',pc(cn(2),n)+'  '+cn(2)+'/'+n],['TP3',pc(cn(3),n)+'  '+cn(3)+'/'+n],['Overall',pc(wn,n)+'  '+wn+'/'+n],['Net',(net>=0?'+':'')+net.toFixed(1)+'R']];
        cx.font='9px system-ui,sans-serif'; let w0=0, w1=0; rows.forEach(r=>{ w0=Math.max(w0,cx.measureText(r[0]).width); w1=Math.max(w1,cx.measureText(r[1]).width); });
        const bw=w0+w1+22, rh=12, bh=(rows.length+1)*rh+6, bx=W-bw-6, by=34;
        cx.fillStyle='rgba(10,13,20,.32)'; cx.fillRect(bx,by,bw,bh); cx.strokeStyle='rgba(128,128,128,.25)'; cx.lineWidth=1; cx.strokeRect(bx+.5,by+.5,bw,bh); cx.textBaseline='middle';
        cx.font='bold 8px system-ui,sans-serif'; cx.fillStyle='rgba(230,232,238,.75)'; cx.textAlign='left'; cx.fillText(n?'Win rate  ('+n+' trades)':'Win rate  (no finished trade yet)',bx+6,by+rh/2+3);
        rows.forEach((r,k)=>{ const y=by+rh*(k+1)+rh/2+3; cx.font='9px system-ui,sans-serif'; cx.fillStyle='rgba(230,232,238,.65)'; cx.textAlign='left'; cx.fillText(r[0],bx+6,y); cx.font='bold 9px system-ui,sans-serif'; cx.fillStyle=(k>=3&&n)?(net>=0?p.cBuy:p.cSell):'#e6e8ee'; cx.textAlign='right'; cx.fillText(r[1],bx+bw-6,y); });
        cx.font='10px system-ui,sans-serif'; cx.textAlign='left'; }
    }
    if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); }
    cx.restore(); }; }
// alerts: fire once, when the signal candle has closed (the newest closed candle), while the app is open
function mqAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0], KEY={buy:'alBuy',sell:'alSell'}, MSG={buy:['MFG SNAP BUY - break up, then the 2nd green candle','#2e7d32'],sell:['MFG SNAP SELL - break down, then the 2nd red candle','#c62828']};
  inds.forEach(i=>{ if(i.t!=='mfs'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},MQ_DEF,i.p); let quiet=q; if(i._mqK!==key){ i._mqK=key; i._mqLast={}; quiet=true; }
    const last=i._mqLast||(i._mqLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!P[KEY[e.type]]) return;
      const tp=e.type==='buy'?'BUY':'SELL', dsc=e.rec?'RECOVERY - stop hit, 2nd '+(e.type==='buy'?'green':'red')+' candle again':e.bk?'BREAK - 2nd '+(e.type==='buy'?'green candle closed above':'red candle closed below')+' the line':e.bos?'BOS - structure break':e.ny?'New York - retest + BOS':(e.type==='buy'?'break up, then the 2nd green candle':'break down, then the 2nd red candle');
      toast(tp+' \u00b7 MFG Snap '+dsc+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 Close '+mqP(e.price)+(e.sl!=null?' \u00b7 SL '+mqP(e.sl)+' \u00b7 TP1 '+mqP(e.t[0]):''),MSG[e.type][1]);   // starts with BUY / SELL: the app also sends it as a phone / system notification
      if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _mqRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_mqRE.apply(this,arguments); try{ mqAlerts(q); }catch(e){ console.error('mfs alerts',e); } return rv; }; }
try{ DESC.mfs='MFG Snap: two vertical lines at 1:15 PM and 2:15 PM. The first 5 candles from 1:15 PM give a range; a green rectangle sits above it and a red one below it, both extended to midnight (only the rectangles). A candle closing above the green rectangle = break up, then the 2nd green candle = BUY (green, red, green = BUY; red, green, red, red, green = BUY). A close below the red rectangle = break down, then the 2nd red candle = SELL. Stop loss on the 2nd candle back from the entry candle, TP1 to TP4 as dotted lines. Optional strategy "New York sells and buy" (one strategy works at a time): New York box, breakout of the green / red rectangle, retest, BOS, BUY / SELL until 00:00, SL under the lower rectangle (SELL above the upper one), TP1 to TP3, optional Fair Value Gaps and Smart Money Concept. Fourth strategy "Break up buy / break down sell": works alone, uses only the green / red rectangles (extended to 00:00, no New York session): the 2nd green candle that closed above the green line = BUY (the break candle counts when green), the 2nd red candle that closed below the red line = SELL, SL tightly beyond the other rectangle, TP1 to TP3; a failed trade turns grey with a small grey X, a won trade turns green (BUY) / red (SELL). Third strategy "BOS buy and sell (market structure)": works alone (all other MFG Snap BUY / SELL are off). A BOS = the external structure of the direction timeframe (Auto = 12 x chart candle) closes beyond its swing; the line runs from the swing to the break candle with BOS in the middle and HH / HL / LH / LL labels; BUY on a bullish BOS, SELL on a bearish BOS on the very candle that closes beyond the swing (default, no waiting), only inside the New York period (4 PM to 00:00 by default), tight SL at the broken level / break candle, TP1 to TP3. The Break up buy / break down sell strategy is the default of a new MFG Snap (with the New York box shown, nothing else of New York)'; }catch(e){}
}catch(err){ console.error('mfs indicator failed',err); window.__mfsErr=err; }

// ---- [mfr] INDICATOR: MFG Snap + Risk management - MFG Snap signals (green / red rectangle break, 2nd candle) + the Reinblacks Risk management tool placed AUTOMATICALLY on every BUY / SELL (self-contained: every name starts with mr / MR) ----
// BUY / SELL come from MFG Snap (same rules, same settings). On every NEW signal the risk tool is put on the chart by itself: entry = the signal close, stop = the MFG Snap stop, target = rkR x risk.
// Lot size, margin, liquidation and $ risk / reward come from the Reinblacks Risk settings (balance, risk %, leverage). The box then follows the price by itself until the target or the stop is hit.
try{
const MR_KEY='mpMfrLast';
IND.mfr=Object.assign({},IND.mfs,{label:'MFG Snap + Risk management',title:'MFG Snap + Reinblacks Risk management - break + 2nd candle = BUY / SELL, the risk tool is placed automatically',nm:p=>'MFG Snap + Risk',p:Object.assign({},IND.mfs.p,{autoRisk:true,rkR:2,rkPast:true}),
  fields:IND.mfs.fields.concat([['autoRisk','chk','Put the Reinblacks risk tool on every new BUY / SELL automatically'],['rkR','num','Risk tool target (x risk, 2 = 1:2)',{min:0.25,max:50,step:0.25}],['rkPast','chk','Also place the latest past signal when the tool is added (to see how it ended)']])});
function mrAuto(q){ if(candles.length<2||typeof window.mpRiskAuto!=='function') return; const n=candles.length, cc=candles[n-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='mfr'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},IND.mfr.p,i.p); const first=i._mrK!==key; if(first) i._mrK=key; if(!P.autoRisk) return;
    const ev=i._xr.events; if(!ev.length) return; const e=ev[ev.length-1], id=key+'|'+e.time; let last=''; try{ last=localStorage.getItem(MR_KEY)||''; }catch(x){}
    if(last===id||i._mrDone===id) return;
    const live=!q&&!first&&e.time>=cc, past=first&&P.rkPast; if(!live&&!past) return;
    const side=e.type==='buy'?'long':'short', R=+P.rkR>0?+P.rkR:2, risk=Math.abs(e.price-e.sl); if(!(risk>0)) return;
    const ok=window.mpRiskAuto({side,entry:e.price,sl:e.sl,tp:e.price+(side==='long'?1:-1)*risk*R,time:e.time,quiet:!live,label:'MFG SNAP '+(side==='long'?'BUY':'SELL')});
    if(ok){ i._mrDone=id; try{ localStorage.setItem(MR_KEY,id); }catch(x){} } }); }
{ const _mrRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_mrRE.apply(this,arguments); try{ mrAuto(q); }catch(e){ console.error('mfr auto risk',e); } return rv; }; }
try{ DESC.mfr='MFG Snap + Risk management: the MFG Snap rules (1:15 PM to 2:15 PM, 5-candle range, green / red rectangles, break + 2nd green / red candle = BUY / SELL) and, on every new signal, the Reinblacks Risk management tool is placed automatically: entry at the signal close, stop from MFG Snap, target at your R:R, lot size from your risk %. The box follows the price until the target or the stop is hit'; }catch(e){}
}catch(err){ console.error('mfr indicator failed',err); window.__mfrErr=err; }

// ---- [tzc] INDICATOR: Triangle & Cycle Projection - ATH marker, descending (bearish) triangle, red Cycle Bottom line, projected Next ATH (self-contained: every name starts with tz / TZ) ----
// Built from a Gold 2D chart idea: price makes an ATH, then a descending triangle forms (lower highs on a falling trendline, flat support). A break below the support
// is expected to run down to the "Cycle Bottom" (red line), and from there the next cycle can climb to a new ATH. The tool draws that whole story on the chart.
// Closed candles only (the newest, still forming candle is never used for detection), nothing repaints.
//  ATH     - highest high of the last "Look-back" candles. Green circle + "ATH - price".
//  TRIANGLE- pivot highs after the ATH give the falling trendline (the upper tangent from the ATH, so no pivot high is above it). Pivot lows give the flat support:
//            the first price level touched N times (adjustable) within the tolerance. The pattern ends at the apex. Optional small inset "Descending Triangle" like the picture.
//  BREAK   - a candle CLOSING below the support (plus a small buffer) = breakdown (bearish). A close above the trendline = break up (bullish). Both are alert events.
//  CYCLE   - red line at the Cycle Bottom: "Impulse base" (top of the base the big rally started from), "Measured move" (support minus a share of the triangle height) or "Manual price".
//            Red circle with the price where price reached it (or where it is projected to), dashed red path from the breakdown.
//  NEXT ATH- green circle at the next target: "Fib extension" (ATH + ratio x (ATH - cycle bottom), 0.382 by default) or "Manual price", dashed green path from the cycle bottom.
try{
const TZ_POS=['Top Right','Top Left','Bottom Right','Bottom Left'], TZ_BASE=['Impulse base','Measured move','Manual price'], TZ_NEXT=['Fib extension','Manual price'];
const TZ_DEF={look:800,pivot:5,tol:1.2,touches:2,bkBuf:0.3,
  cycMode:TZ_BASE[0],cycPrice:0,mmMult:0.3,baseBars:20,projBars:30,
  nextMode:TZ_NEXT[0],nextFib:0.382,nextPrice:0,nextBars:70,
  cur:'$',showAth:true,showTri:true,showFill:true,showSup:true,showLabel:true,label:'Bearish Symmetrical Triangle Pattern',showInset:true,insetTxt:'Descending Triangle',
  showCycle:true,showNext:true,showPath:true,
  dash:true,dpos:'Bottom Left',dsize:'Small',theme:'Dark',
  cAth:'#2e9e4f',cTri:'#e0e3eb',cCyc:'#e53935',cNext:'#2e9e4f',
  alBrk:true,alUp:true,alCyc:false,alSound:false};
const tzClamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const tzRgba=(c,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(c||'')); if(!m) return c; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const tzFmt=(v,cur)=>{ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return (cur||'')+v.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:a>=100?2:a>=1?4:a>=0.01?6:9}); };
function tzCompute(c,p){ const N=c.length, D={N,ok:false,msg:''}; if(N<40){ D.msg='Needs at least 40 candles'; return D; }
  const H=c.map(x=>x.high), L=c.map(x=>x.low), C=c.map(x=>x.close), T=c.map(x=>x.time);
  for(let i=0;i<N;i++) if(![H[i],L[i],C[i]].every(isFinite)) return D;
  const n=N-1, look=tzClamp(Math.round(+p.look)||800,50,20000), st=Math.max(0,n-look), len=tzClamp(Math.round(+p.pivot)||5,2,30), touches=tzClamp(Math.round(+p.touches)||2,1,6), bkB=Math.max(0,+p.bkBuf||0);
  // ATH = highest high of the window (closed candles only)
  let ai=st; for(let i=st;i<n;i++) if(H[i]>=H[ai]) ai=i; const athP=H[ai]; D.ath={idx:ai,price:athP};
  let s0=0,c0=0; const a0=(n-ai>=10)?ai:st; for(let i=Math.max(a0,1);i<n;i++){ s0+=Math.max(H[i]-L[i],Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1])); c0++; }
  const atr=c0?s0/c0:Math.max(H[n-1]-L[n-1],1e-9), tolv=Math.max(0.0000001,(+p.tol||1.2)*atr), bkv=bkB*atr;
  // pivots after the ATH (confirmed: need `len` candles on the right)
  const PH=[], PL=[]; for(let i=ai+1;i<=n-1-len;i++){ let ph=true,pl=true; for(let k=Math.max(0,i-len);k<=i+len;k++){ if(k===i) continue; if(H[k]>H[i]) ph=false; if(L[k]<L[i]) pl=false; if(!ph&&!pl) break; } if(ph) PH.push({i,p:H[i]}); if(pl) PL.push({i,p:L[i]}); }
  // flat support: first level touched `touches` times (stops counting once price has already closed through it)
  let S=null, supFirst=null, supHits=0;
  for(let a=0;a<PL.length&&S==null;a++){ const g=[PL[a]]; for(let b=a+1;b<PL.length&&g.length<6;b++){ const q=PL[b], lv=PL[a].p; if(Math.abs(q.p-lv)>tolv) continue; let bro=false; for(let k=g[g.length-1].i+1;k<q.i;k++) if(C[k]<lv-tolv-bkv){ bro=true; break; } if(bro) break; g.push(q); }
    if(g.length>=touches){ S=g.reduce((s,x)=>s+x.p,0)/g.length; supFirst=g[0].i; supHits=g.length; } }
  if(S==null&&PL.length){ const m=PL.reduce((b,x)=>x.p<b.p?x:b,PL[0]); S=m.p; supFirst=m.i; supHits=1; }
  let tri=null, bk=-1, up=-1;
  if(S!=null){ for(let k=supFirst+1;k<=n-1;k++) if(C[k]<S-bkv){ bk=k; break; }
    // falling trendline = upper tangent from the ATH over the pivot highs before the breakdown
    let best=null; PH.forEach(q=>{ if(bk>=0&&q.i>=bk) return; if(q.p>=athP) return; const sl=(q.p-athP)/(q.i-ai); if(!best||sl>best.sl) best={sl,q}; });
    if(best){ const sl=best.sl, jt=best.q.i; let hh=1; PH.forEach(q=>{ if(q.i<=ai) return; if(Math.abs(q.p-(athP+sl*(q.i-ai)))<=tolv) hh++; });
      const apex=Math.min(ai+(S-athP)/sl,n+2000), lastK=bk>=0?bk-1:n-1; for(let k=jt+1;k<=lastK;k++) if(C[k]>athP+sl*(k-ai)+bkv){ up=k; break; }
      let left=ai; for(let i=st;i<ai;i++) if(Math.abs(L[i]-S)<=tolv){ left=i; break; }
      tri={sl,jt,jp:best.q.p,apex,S,left,hi:hh,lo:supHits,bk,up,status:(bk>=0&&bk>=up)?'Broke down':(up>=0?'Broke up':'Forming')}; } }
  D.tri=tri; D.S=S;
  if(!tri&&!D.msg) D.msg=(n-ai<len*2+3)?'ATH is recent - waiting for the pullback':'No triangle found yet (try a smaller pivot length)';
  // cycle bottom
  const lowAfter=n-1>ai?Math.min.apply(null,L.slice(ai+1,n)):L[n-1], supRef=S!=null?S:lowAfter, hgt=Math.max(athP-supRef,atr);
  let cp=null, mode=p.cycMode, used=mode;
  if(mode==='Manual price'&&+p.cycPrice>0) cp=+p.cycPrice;
  else if(mode==='Impulse base'||(mode==='Manual price')){ let o=st; for(let i=st;i<ai;i++) if(L[i]<L[o]) o=i; if(o<ai){ let top=-Infinity; const bb=Math.max(3,Math.round(+p.baseBars)||20), lim=L[o]+0.15*(athP-L[o]); let e=Math.min(ai-1,o+bb); for(let k=o+1;k<=e;k++) if(C[k]>lim){ e=k-1; break; } for(let i=Math.max(st,o-bb);i<=Math.max(o,e);i++) if(H[i]>top) top=H[i]; if(isFinite(top)&&top<supRef&&top>0) cp=top; } used='Impulse base'; }
  if(cp==null||cp<=0){ cp=Math.max(supRef-Math.max(0.05,+p.mmMult||0.3)*hgt,athP*0.01); used='Measured move'; }
  if(mode==='Measured move'){ cp=Math.max(supRef-Math.max(0.05,+p.mmMult||0.3)*hgt,athP*0.01); used='Measured move'; }
  else if(mode==='Manual price'&&+p.cycPrice>0) used='Manual price';
  // has price already reached the cycle bottom?
  let cI=-1; const from=bk>=0?bk:ai+1; for(let k=from;k<=n-1;k++) if(L[k]<=cp+tolv*0.5){ cI=k; break; }
  let cLow=null; if(cI>=0){ let m=cI; for(let k=cI;k<=Math.min(n-1,cI+len*3);k++) if(L[k]<L[m]) m=k; cI=m; cLow=L[m]; }
  const projI=cI>=0?cI:(bk>=0?bk:n-1)+Math.max(3,Math.round(+p.projBars)||30);
  D.cyc={price:cp,idx:projI,reached:cI>=0,low:cLow,mode:used,from};
  // next ATH target
  let np=(p.nextMode==='Manual price'&&+p.nextPrice>0)?+p.nextPrice:athP+Math.max(0.01,+p.nextFib||0.382)*(athP-cp); if(!(np>0)) np=athP;
  let nI=-1; if(cI>=0) for(let k=cI+1;k<=n-1;k++) if(H[k]>=np){ nI=k; break; }
  D.next={price:np,idx:nI>=0?nI:projI+Math.max(5,Math.round(+p.nextBars)||70),reached:nI>=0};
  // events
  const ev=[]; if(tri&&bk>=0) ev.push({type:'brk',time:T[bk],price:C[bk],idx:bk,dir:-1}); if(tri&&up>=0) ev.push({type:'up',time:T[up],price:C[up],idx:up,dir:1}); if(cI>=0) ev.push({type:'cyc',time:T[cI],price:cLow,idx:cI,dir:-1});
  ev.sort((a,b)=>a.idx-b.idx); D.events=ev; D.close=C[n-1]; D.n=n; D.atr=atr; D.ok=true; return D; }
let tzMem=null;
function tzGet(c,p){ const N=c.length, key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(tzMem&&tzMem.k===key) return tzMem.D;
  let D; try{ D=tzCompute(c,p); }catch(e){ console.error('tzc calc failed',e); D={N,ok:false,msg:'',events:[]}; } tzMem={k:key,D}; return D; }
const TZ_FIELDS=[['look','num','Look-back: find the ATH in the last N candles',{min:50,max:20000,step:50}],['pivot','num','Pivot length (candles each side)',{min:2,max:30,step:1}],['tol','num','Touch tolerance (x ATR)',{min:0.2,max:5,step:0.1}],['touches','num','Support touches needed',{min:1,max:6,step:1}],['bkBuf','num','Break buffer (x ATR, close beyond the line)',{min:0,max:3,step:0.1}],
  ['showAth','chk','Show ATH marker'],['showTri','chk','Show triangle trendline'],['showFill','chk','Fill the triangle'],['showSup','chk','Show flat support line'],['showLabel','chk','Show pattern label'],['label','txt','Pattern label text'],['showInset','chk','Show small "Descending Triangle" box'],['insetTxt','txt','Small box title'],
  ['cycMode','sel','Cycle Bottom from',{opts:TZ_BASE}],['cycPrice','num','Cycle Bottom: manual price (0 = off)',{min:0,max:100000000,step:1}],['mmMult','num','Measured move: share of triangle height below support',{min:0.05,max:3,step:0.05}],['baseBars','num','Impulse base: candles after the low',{min:3,max:200,step:1}],['projBars','num','Cycle circle: candles after the breakdown (projection)',{min:3,max:500,step:1}],
  ['nextMode','sel','Next ATH from',{opts:TZ_NEXT}],['nextFib','num','Next ATH: ratio of (ATH - cycle bottom) above the ATH',{min:0.05,max:5,step:0.01}],['nextPrice','num','Next ATH: manual price (0 = off)',{min:0,max:100000000,step:1}],['nextBars','num','Next ATH circle: candles after the cycle bottom',{min:5,max:1000,step:1}],
  ['cur','txt','Price prefix (e.g. $)'],['showCycle','chk','Show Cycle Bottom line'],['showNext','chk','Show Next ATH'],['showPath','chk','Show dashed paths'],
  ['dash','chk','Show info panel'],['dpos','sel','Panel position',{opts:TZ_POS}],['dsize','sel','Panel size',{opts:['Tiny','Small','Normal','Large']}],['theme','sel','Theme',{opts:['Dark','Light']}],
  ['cAth','col','ATH / Next ATH circle colour'],['cTri','col','Triangle line colour'],['cCyc','col','Cycle Bottom colour'],['cNext','col','Next ATH path colour'],
  ['alBrk','chk','Alert: breakdown below support'],['alUp','chk','Alert: break above the trendline'],['alCyc','chk','Alert: Cycle Bottom reached'],['alSound','chk','Play a sound']];
IND.tzc={label:'Triangle & Cycle Projection',cat:'Trend',nm:()=>'Triangle & Cycle Projection',p:Object.assign({},TZ_DEF),cols:['#e53935'],
  fields:TZ_FIELDS,
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},TZ_DEF,p), D=tzGet(c,q); return {mk:[],boxes:[{type:'tzcview',pts:[],o:q,D}],labels:[],events:D.ok?D.events:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='tzcview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, n0=candles.length; if(!D||n0<5) return; const dark=p.theme!=='Light', cur=p.cur||'';
    const fg=dark?'#e6e8ee':'#131722', muted=dark?'rgba(230,232,238,.6)':'rgba(19,23,34,.6)', pill=dark?'rgba(10,13,20,.9)':'rgba(255,255,255,.93)';
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    if(!D.ok){ if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,Hh-14); } cx.restore(); return; }
    const xN=X(n0-1), xP=X(n0-2), step=(xN!=null&&xP!=null&&xN!==xP)?(xN-xP):6;
    const xa=i=>{ if(i<=n0-1){ const v=X(i); if(v!=null) return v; } return (xN==null?0:xN)+(i-(n0-1))*step; };
    const dot=(x,y,col)=>{ cx.fillStyle=col; cx.beginPath(); cx.arc(x,y,7,0,6.2832); cx.fill(); cx.strokeStyle='#ffffff'; cx.lineWidth=2; cx.beginPath(); cx.arc(x,y,7,0,6.2832); cx.stroke(); };
    const tag=(txt,x,y,col,al)=>{ cx.font='bold 11px system-ui,sans-serif'; const w=cx.measureText(txt).width+12; let x0=al==='c'?x-w/2:al==='r'?x-w:x; x0=Math.max(2,Math.min(W-w-2,x0)); cx.fillStyle=pill; cx.fillRect(x0,y-9,w,18); cx.strokeStyle=tzRgba(col,0.9); cx.lineWidth=1; cx.strokeRect(x0+.5,y-8.5,w,18); cx.fillStyle=col; cx.textAlign='left'; cx.fillText(txt,x0+6,y+0.5); };
    const A=D.ath, T=D.tri, CY=D.cyc, NX=D.next, xAth=xa(A.idx), yAth=Y(A.price);
    // triangle: fill, falling trendline, flat support, label
    if(T){ const xs=xAth, xe=xa(T.apex), yS=Y(T.S);
      if(yS!=null&&yAth!=null){
        if(p.showFill){ cx.fillStyle=tzRgba(p.cTri,0.07); cx.beginPath(); cx.moveTo(xs,yAth); cx.lineTo(xe,yS); cx.lineTo(xs,yS); cx.closePath(); cx.fill(); }
        if(p.showSup){ cx.strokeStyle=p.cTri; cx.lineWidth=1.5; cx.beginPath(); cx.moveTo(xa(T.left),yS); cx.lineTo(xe,yS); cx.stroke(); }
        if(p.showTri){ cx.strokeStyle=p.cTri; cx.lineWidth=1.5; cx.beginPath(); cx.moveTo(xs,yAth); cx.lineTo(xe,yS); cx.stroke(); }
        if(p.showLabel&&p.label){ cx.font='bold 10px system-ui,sans-serif'; cx.fillStyle=p.cTri; cx.textAlign='center'; cx.fillText(p.label,(Math.max(xs,0)+Math.min(xe,W))/2,yS+12); } } }
    // small "Descending Triangle" box (top, like the picture)
    if(p.showInset){ const bw=124, bh=92, bx=tzClamp(xAth+200,8,W-bw-8), by=30;
      cx.fillStyle=pill; cx.beginPath(); if(cx.roundRect) cx.roundRect(bx,by,bw,bh,6); else cx.rect(bx,by,bw,bh); cx.fill(); cx.strokeStyle='rgba(128,128,128,.55)'; cx.lineWidth=1; cx.stroke();
      cx.font='bold 10px system-ui,sans-serif'; cx.fillStyle=fg; cx.textAlign='center'; cx.fillText(p.insetTxt||'',bx+bw/2,by+12);
      const l=bx+10, r=bx+bw-10, t=by+26, b=by+bh-14; cx.strokeStyle=muted; cx.lineWidth=1; cx.beginPath(); cx.moveTo(l,t); cx.lineTo(r-14,b-12); cx.stroke(); cx.beginPath(); cx.moveTo(l,b-12); cx.lineTo(r,b-12); cx.stroke();
      cx.strokeStyle=p.cCyc; cx.lineWidth=1.3; cx.beginPath(); const zz=[[0,0],[.1,.55],[.2,.1],[.3,.6],[.42,.25],[.52,.62],[.63,.38],[.72,.62],[.8,.55],[.92,1.05]]; zz.forEach((q,k)=>{ const x=l+q[0]*(r-l), y=t+q[1]*(b-12-t); if(k) cx.lineTo(x,y); else cx.moveTo(x,y); }); cx.stroke(); }
    // Cycle Bottom: red line across the chart, centred pill, circle + price
    const yC=Y(CY.price), xC=xa(CY.idx);
    if(p.showCycle&&yC!=null){ cx.strokeStyle=p.cCyc; cx.lineWidth=2; cx.beginPath(); cx.moveTo(0,yC); cx.lineTo(W,yC); cx.stroke(); tag('Cycle Bottom',W*0.5,yC,p.cCyc,'c'); }
    // dashed paths: breakdown -> cycle bottom (red), cycle bottom -> next ATH (green)
    const yCp=yC==null?null:(CY.reached&&CY.low!=null&&Y(CY.low)!=null?Y(CY.low):yC), yN=Y(NX.price), xNx=xa(NX.idx);
    if(p.showPath&&T&&T.bk>=0&&!CY.reached&&yCp!=null){ const bc=candles[T.bk], yb=bc?Y(bc.close):null; if(yb!=null){ cx.strokeStyle=p.cCyc; cx.lineWidth=1.6; cx.setLineDash([6,5]); cx.beginPath(); cx.moveTo(xa(T.bk),yb); cx.lineTo(xC,yCp); cx.stroke(); cx.setLineDash([]); } }
    if(p.showPath&&p.showNext&&yCp!=null&&yN!=null&&!NX.reached){ cx.strokeStyle=p.cNext; cx.lineWidth=1.8; cx.setLineDash([6,5]); cx.beginPath(); cx.moveTo(xC,yCp); cx.quadraticCurveTo(xC+(xNx-xC)*0.55,yCp,xNx,yN); cx.stroke(); cx.setLineDash([]); }
    if(p.showCycle&&yCp!=null){ dot(xC,yCp,p.cCyc); const lowP=CY.reached&&CY.low!=null?CY.low:CY.price; tag(tzFmt(lowP,cur),xC,yCp+20,p.cCyc,'c'); }
    if(p.showNext&&yN!=null){ dot(xNx,yN,p.cAth); tag('Next ATH - '+tzFmt(NX.price,cur),xNx,yN-20,p.cAth,'r'); }
    // ATH marker
    if(p.showAth&&yAth!=null){ dot(xAth,yAth,p.cAth); tag('ATH - '+tzFmt(A.price,cur),xAth-8,yAth-20,p.cAth,'c'); }
    // info panel
    if(p.dash){ const rows=[], px=D.close; rows.push(['h','Triangle & Cycle','rule-based']);
      rows.push(['kv','ATH',tzFmt(A.price,cur),p.cAth]);
      if(T){ rows.push(['kv','Support (flat)',tzFmt(T.S,cur)+' \u00b7 '+T.lo+'x',fg]); rows.push(['kv','Trendline touches',String(T.hi),fg]); rows.push(['kv','Status',T.status,T.status==='Broke down'?p.cCyc:T.status==='Broke up'?p.cAth:'#ffd54f']); }
      else rows.push(['kv','Triangle',D.msg||'none yet',muted]);
      rows.push(['kv','Cycle Bottom',tzFmt(CY.price,cur)+(px?' ('+((CY.price/px-1)*100).toFixed(1)+'%)':''),p.cCyc]);
      rows.push(['kv','Cycle from',CY.mode+(CY.reached?' \u00b7 reached':''),muted]);
      rows.push(['kv','Next ATH',tzFmt(NX.price,cur)+(px?' (+'+((NX.price/px-1)*100).toFixed(1)+'%)':''),p.cAth]);
      let fs=({Tiny:9,Small:10,Normal:12,Large:14})[p.dsize]||10, w0=0,w1=0, rh, m=6, pw;
      for(;;){ w0=0; w1=0; rh=fs+8; rows.forEach(r=>{ cx.font='bold '+fs+'px system-ui'; w0=Math.max(w0,cx.measureText(r[1]).width); w1=Math.max(w1,cx.measureText(r[2]).width); }); pw=w0+w1+36; if(pw<=W-2*m||fs<=6) break; fs--; }
      const ph=rows.length*rh, x0=/Left/.test(p.dpos)?m:W-pw-m, y0=/Top/.test(p.dpos)?m+34:Hh-ph-m-24;
      cx.fillStyle=pill; cx.fillRect(x0,y0,pw,ph); rows.forEach((r,k)=>{ const y=y0+k*rh+rh/2; if(r[0]==='h'){ cx.fillStyle=tzRgba(p.cCyc,0.2); cx.fillRect(x0,y-rh/2,pw,rh); cx.font='bold '+fs+'px system-ui'; cx.textAlign='left'; cx.fillStyle=fg; cx.fillText(r[1],x0+8,y); cx.fillStyle=muted; cx.font=fs+'px system-ui'; cx.textAlign='right'; cx.fillText(r[2],x0+pw-8,y); }
        else { cx.font=fs+'px system-ui'; cx.textAlign='left'; cx.fillStyle=muted; cx.fillText(r[1],x0+8,y); cx.font='bold '+fs+'px system-ui'; cx.fillStyle=r[3]; cx.textAlign='right'; cx.fillText(r[2],x0+pw-8,y); } });
      cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph); }
    cx.restore(); }; }
// alerts: fire once, when the candle that carried the event has closed (the newest closed candle), while the app is open
function tzAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0];
  inds.forEach(i=>{ if(i.t!=='tzc'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},TZ_DEF,i.p); let quiet=q; if(i._tzK!==key){ i._tzK=key; i._tzLast={}; quiet=true; }
    const last=i._tzLast||(i._tzLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      const on={brk:P.alBrk,up:P.alUp,cyc:P.alCyc}[e.type]; if(quiet||e.time!==cc||!on) return;
      const nm={brk:'BREAKDOWN - closed below the triangle support',up:'BREAK UP - closed above the triangle trendline',cyc:'CYCLE BOTTOM reached'}[e.type];
      toast('TRIANGLE & CYCLE \u00b7 '+nm+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+tzFmt(e.price,P.cur),(e.type==='up')?'#2e7d32':'#c62828'); if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _tzRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_tzRE.apply(this,arguments); try{ tzAlerts(q); }catch(e){ console.error('tzc alerts',e); } return rv; }; }
try{ DESC.tzc='Marks the ATH, finds the descending (bearish) triangle after it - falling trendline plus flat support - and draws the red Cycle Bottom line with a circle, then a dashed path up to the projected Next ATH. Alerts on the breakdown below support, the break above the trendline and the cycle bottom being reached'; }catch(e){}
}catch(err){ console.error('tzc indicator failed',err); window.__tzcErr=err; }

// ---- [amd] PREMIUM STRATEGY: MarketPlusView AMD Three-Session POC Breakout - Asian (Accumulation) / London (Manipulation) / New York (Distribution), Fixed Range Volume Profile POC, breakout close, retest, BOS, candle-sequence entry, SL / TP1-TP3, risk, dashboard and backtest panel (self-contained: every name starts with amd / AMD) ----
// Strict order, never changed:  THREE-SESSION RANGE > POC > NEW YORK BREAKOUT > RETEST > BOS > CANDLE SEQUENCE > ENTRY AT THE CANDLE CLOSE > SL > TP1 > TP2 > TP3.
//  1. SESSIONS  - Asian, London and New York windows (your own hours and time zone, no hidden daylight-saving rule). Each gets its own neutral background, a separator and a name.
//  2. PROFILE   - a Fixed Range Volume Profile over the range (default Asian + London, locked when New York opens; or the whole previous day). Candle volume is spread over the price rows the candle touched,
//                 in proportion to the overlap (an approximation: ordinary candles do not carry exact volume at every price). POC = the row with the most volume, Value Area (default 70 %) grows out from the POC.
//  3. BREAKOUT  - in New York a candle must CLOSE beyond the POC (a wick is not enough). No close = no trade.
//  4. RETEST    - price comes back to the POC area (tolerance in ATR) and holds. A decisive close back through the POC kills the setup. The retest swing low / high is recorded.
//  5. BOS       - after the retest a confirmed pivot (pivot length = confirmation delay, so nothing repaints) must be broken by a candle CLOSE.
//  6. SEQUENCE  - only AFTER the BOS. BUY:  A red, red, GREEN   B red, GREEN   C GREEN.  SELL: A green, green, RED   B green, RED   C RED. Entry = the close of that candle. Max candles after the BOS is a setting.
//  7. SL / TP   - SL beyond the retest swing (+ buffer). TP1-TP3 as risk-to-reward, or the nearest opposing liquidity (session highs / lows, previous day, value area, swings).
//  8. MANAGEMENT- risk % sizing, partial exits, break-even after TP1, max trades per New York session, one position at a time, daily loss limit, commission / spread / slippage in the backtest.
// Closed candles only. If SL and a target are inside the same candle the backtest counts the SL first. Results are an estimate on the candles loaded in the chart - no win rate is promised.
try{
const AMD_TZ=['UTC','Chart time zone (as on your axis)','America/New_York','America/Chicago','America/Los_Angeles','Europe/London','Europe/Berlin','Africa/Nairobi','Africa/Lagos','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Australia/Sydney','Device time'];
const AMD_PM=['Asian + London (locked when New York opens)','Previous day, all three sessions (locked)'];
const AMD_TP=['Risk-to-Reward','Market structure / liquidity'];
const AMD_HOLD=['Close at the end of the New York session','Run until SL / TP3'];
const AMD_POS=['Top Right','Top Left','Bottom Right','Bottom Left'];
const AMD_DEF={tz:AMD_TZ[0],aOn:true,aHrs:'0000-0700',lOn:true,lHrs:'0700-1300',nHrs:'1300-2200',
  pm:AMD_PM[0],rows:48,va:70,
  brkBuf:0,retTol:0.35,invBuf:0.15,maxSet:60,piv:3,
  patA:true,patB:true,patC:true,maxBos:5,
  slBuf:0.15,maxRisk:8,
  tpMode:AMD_TP[0],tp1R:1,tp2R:2,tp3R:3,tpMin:1,tsA:true,tsL:true,tsP:true,tsS:true,tsV:true,
  partial:true,p1:40,p2:30,p3:30,be:true,hold:AMD_HOLD[0],risk:1,eq:10000,maxTr:2,oneAt:true,dl:false,dlPct:3,comm:0.02,slip:0.01,spr:0.01,atrLen:14,
  showSess:true,showNames:true,showRange:true,showProf:true,histW:22,showLines:true,showBrk:true,showRet:true,showBos:true,showSig:true,showRisk:true,showNT:true,keep:4,
  showDash:true,dpos:'Top Right',showPerf:true,ppos:'Bottom Right',
  cA:'#6b7a8f',cL:'#8f7a6b',cN:'#6b8f7a',cPoc:'#ffd600',cBuy:'#26a69a',cSell:'#ef5350',alBuy:true,alSell:true,alSound:false};
const amdC=(v,a,b)=>Math.max(a,Math.min(b,v));
const amdA=(hex,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const amdP=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1000?v.toFixed(2):Math.abs(v)>=1?v.toFixed(4):v.toPrecision(5);
const amdFR=v=>Number.isInteger(+v)?(+v).toFixed(1):(+v).toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
const amdHM=m=>{ m=((Math.round(m)%1440)+1440)%1440; const h=Math.floor(m/60), mi=m%60; return (h<10?'0':'')+h+':'+(mi<10?'0':'')+mi; };
function amdSess(s,d){ const m=/^\s*(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})\s*$/.exec(String(s||'')); if(!m) return d; const a=(+m[1])*60+(+m[2]), b=(+m[3])*60+(+m[4]); return (a<1440&&b<=1440)?[a,b%1440]:d; }
function amdTz(s){ if(!s||String(s).indexOf('Chart')===0){ let z='UTC'; try{ z=(window.mpXO&&window.mpXO.XO&&window.mpXO.XO.tz)||'UTC'; }catch(e){} return z; } return s==='Device time'?'local':s; }
const amdFm={}, amdOC={};
function amdOff(tz,t){ if(tz==='local') return -new Date(t*1000).getTimezoneOffset();
  let f=amdFm[tz]; if(f===undefined){ try{ f=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric'}); }catch(e){ f=null; } amdFm[tz]=f; }
  if(!f) return 0; const q={}; f.formatToParts(new Date(t*1000)).forEach(x=>{ q[x.type]=+x.value; });
  return Math.round(Date.UTC(q.year,q.month-1,q.day,q.hour%24,q.minute)/60000-t/60); }
function amdLoc(tz,t){ if(tz==='UTC'){ const lm=Math.floor(t/60), day=Math.floor(lm/1440); return {day,min:lm-day*1440}; }
  const b=Math.floor(t/3600), k=tz+'|'+b; let off=amdOC[k]; if(off===undefined){ if(Object.keys(amdOC).length>30000){ for(const x in amdOC) delete amdOC[x]; } off=amdOC[k]=amdOff(tz,b*3600); }
  const lm=Math.floor(t/60)+off, day=Math.floor(lm/1440); return {day,min:lm-day*1440}; }
function amdIv(c){ let m=0; for(let i=c.length-1;i>0&&i>c.length-40;i--){ const d=c[i].time-c[i-1].time; if(d>0&&(m===0||d<m)) m=d; } return m; }
function amdAtr(c,L){ const N=c.length, o=new Float64Array(N).fill(NaN); let pc=null,rma=null,sum=0; for(let i=0;i<N;i++){ const h=c[i].high,l=c[i].low,tr=pc==null?h-l:Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)); pc=c[i].close;
    if(i<L-1) sum+=tr; else if(i===L-1){ sum+=tr; rma=sum/L; o[i]=rma; } else { rma=(rma*(L-1)+tr)/L; o[i]=rma; } } return o; }
function amdPH(c,p,L,R){ const h=c[p].high; for(let k=p-L;k<=p+R;k++){ if(k===p||k<0||k>=c.length) continue; if(k<p?c[k].high>=h:c[k].high>h) return false; } return true; }
function amdPL(c,p,L,R){ const h=c[p].low; for(let k=p-L;k<=p+R;k++){ if(k===p||k<0||k>=c.length) continue; if(k<p?c[k].low<=h:c[k].low<h) return false; } return true; }
// Fixed Range Volume Profile: every candle's volume is split over the price rows between its low and high (proportional to the overlap). POC = busiest row. Value Area grows from the POC to the busier neighbour until it holds VA % of the volume.
function amdProf(c,rg,R,vaP){ let hi=-Infinity, lo=Infinity, cnt=0, tv=0;
  rg.forEach(r=>{ for(let j=r[0];j<=r[1];j++){ const b=c[j]; if(b.high>hi) hi=b.high; if(b.low<lo) lo=b.low; cnt++; if(b.volume>0) tv+=b.volume; } });
  if(!(hi>lo)||cnt<3) return null;
  const useV=tv>0, step=(hi-lo)/R, V=new Float64Array(R);
  rg.forEach(r=>{ for(let j=r[0];j<=r[1];j++){ const b=c[j], v=useV?(b.volume>0?b.volume:0):1; if(v<=0) continue; const span=b.high-b.low; let a=Math.floor((b.low-lo)/step), z=Math.floor((b.high-lo)/step); if(a<0) a=0; if(z>=R) z=R-1;
      if(span<=0||a>=z){ V[a]+=v; continue; }
      for(let k=a;k<=z;k++){ const rl=lo+k*step, rh=rl+step, ov=Math.min(b.high,rh)-Math.max(b.low,rl); if(ov>0) V[k]+=v*ov/span; } } });
  let tot=0, pI=0, mx=0; for(let k=0;k<R;k++){ tot+=V[k]; if(V[k]>mx){ mx=V[k]; pI=k; } }
  if(!(tot>0)) return null;
  let a=pI, z=pI, acc=V[pI]; const goal=tot*vaP/100;
  while(acc<goal&&(a>0||z<R-1)){ const up=z<R-1?V[z+1]:-1, dn=a>0?V[a-1]:-1; if(up>=dn){ z++; acc+=V[z]; } else { a--; acc+=V[a]; } }
  return {lo,hi,step,R,V,mx,tot,useV,pI,poc:lo+(pI+0.5)*step,vah:lo+(z+1)*step,val:lo+a*step,vaLo:a,vaHi:z}; }
// TP1-TP3: risk-to-reward multiples, or the nearest opposing liquidity beyond minR x risk (missing ones are filled with the R:R values)
function amdTargets(c,cyc,ci,pf,d,en,risk,j,PL,p){ const cy=cyc[ci], cfg=[+p.tp1R>0?+p.tp1R:1,+p.tp2R>0?+p.tp2R:2,+p.tp3R>0?+p.tp3R:3]; let T=[], tn=[];
  if(p.tpMode===AMD_TP[1]){ const minR=Math.max(0,+p.tpMin||0), L=[], add=(v,n)=>{ if(v!=null&&isFinite(v)&&(v-en)*d>=risk*minR&&(v-en)*d>0) L.push([v,n]); }, A=cy.s[0], Lo=cy.s[1], pv=ci>0?cyc[ci-1]:null;
    if(p.tsA&&A) add(d>0?A.hi:A.lo,'Asia '+(d>0?'high':'low')); if(p.tsL&&Lo) add(d>0?Lo.hi:Lo.lo,'London '+(d>0?'high':'low')); if(p.tsP&&pv) add(d>0?pv.hi:pv.lo,'Prev day '+(d>0?'high':'low')); if(p.tsV) add(d>0?pf.vah:pf.val,d>0?'VAH':'VAL');
    if(p.tsS) for(let q=j-PL;q>=Math.max(PL,j-PL-400);q--){ if(d>0?amdPH(c,q,PL,PL):amdPL(c,q,PL,PL)) add(d>0?c[q].high:c[q].low,'Swing '+(d>0?'high':'low')); }
    L.sort((a,b)=>(a[0]-b[0])*d); L.forEach(x=>{ if(T.length>=3) return; if(!T.length||(x[0]-T[T.length-1])*d>=0.25*risk){ T.push(x[0]); tn.push(x[1]); } });
    for(let u=T.length;u<3;u++){ const base=u>0?T[u-1]:en; let v=en+d*risk*cfg[u]; if((v-base)*d<0.25*risk) v=base+d*risk*0.5; T.push(v); tn.push(amdFR(cfg[u])+'R'); } }
  else { T=cfg.map(r=>en+d*risk*r); tn=cfg.map(r=>amdFR(r)+'R'); }
  return {T,tn}; }
// backtest of one trade: stop first if SL and a target sit in the same candle, partial exits, break-even after TP1, costs in R
function amdSim(c,t,endI,forming,N,p,closeEnd){ const d=t.dir, en=t.price, risk=Math.abs(en-t.sl); let f=[0,0,1];
  if(p.partial){ f=[Math.max(0,+p.p1||0),Math.max(0,+p.p2||0),Math.max(0,+p.p3||0)]; const s=f[0]+f[1]+f[2]; f=s>0?f.map(x=>x/s):[0,0,1]; }
  let stop=t.sl, rem=1, rs=0, tp=0, res='open', end=t.i, reached=false; const hit=[0,0,0];
  for(let m=t.i+1;m<=endI;m++){ if(forming&&m===N-1) break; const z=c[m]; end=m; if(m===endI) reached=true;
    if(d>0?z.low<=stop:z.high>=stop){ rs+=rem*((stop-en)*d/risk); rem=0; res=Math.abs(stop-en)<1e-12&&tp>0?'be':'sl'; break; }
    let nb=null; for(let u=0;u<3;u++){ if(!hit[u]&&(d>0?z.high>=t.t[u]:z.low<=t.t[u])){ hit[u]=1; rs+=f[u]*((t.t[u]-en)*d/risk); rem-=f[u]; tp=u+1; if(u===0&&p.be) nb=en; } }
    if(rem<=1e-9||hit[2]){ rem=0; res='tp'+tp; break; }
    if(nb!=null) stop=nb; }
  if(res==='open'&&closeEnd&&reached){ rs+=rem*((c[endI].close-en)*d/risk); rem=0; res='time'; }
  const cost=((2*((+p.comm||0)+(+p.slip||0))+(+p.spr||0))/100*en)/risk;
  t.tp=tp; t.end=end; t.res=res; t.rs=rs; t.cost=cost; t.rr=res==='open'?null:rs-cost; }
function amdCompute(c,p,iv,forming,tz){
  const N=c.length, D={N,iv,ok:false,msg:'',cyc:[],tr:[],nt:[],brk:[],set:[],ev:[],st:null,live:null,sc:null,mn:null,S:null,tzn:tz};
  if(N<30||!iv) return D;
  if(iv>=86400){ D.msg='AMD POC Breakout needs an intraday chart (it works inside trading sessions)'; return D; }
  const DEFS=[['a',[0,420]],['l',[420,780]],['n',[780,1320]]], S=DEFS.map(x=>({k:x[0],on:x[0]==='n'||!!p[x[0]+'On'],t:amdSess(p[x[0]+'Hrs'],x[1])})); D.S=S;
  for(let k=0;k<3;k++){ if(S[k].on&&S[k].t[0]===S[k].t[1]){ D.msg='AMD POC Breakout: a session has the same start and end time'; return D; } }
  const R=amdC(Math.round(+p.rows)||48,8,200), VA=amdC(+p.va||70,10,100), PL=amdC(Math.round(+p.piv)||3,1,15), AL=amdC(Math.round(+p.atrLen)||14,2,100), maxSet=Math.max(5,Math.round(+p.maxSet)||60), maxBos=amdC(Math.round(+p.maxBos)||5,1,30),
    brkB=Math.max(0,+p.brkBuf||0), tolM=Math.max(0,+p.retTol||0), invM=Math.max(0,+p.invBuf||0), slB=Math.max(0,+p.slBuf||0), maxRk=Math.max(0.5,+p.maxRisk||8), maxTr=Math.max(1,Math.round(+p.maxTr)||1),
    rkP=amdC(+p.risk||1,0.01,100), EQ0=Math.max(1,+p.eq||10000), dlP=Math.max(0.1,+p.dlPct||3), hold0=p.hold===AMD_HOLD[0];
  const sc=new Int8Array(N).fill(-1), mn=new Array(N), idd=new Array(N);
  for(let i=0;i<N;i++){ const q=amdLoc(tz,c[i].time), m=q.min; mn[i]=m;
    for(let k=2;k>=0;k--){ const s=S[k]; if(!s.on) continue; const a=s.t[0], b=s.t[1], w=a>b, inn=w?(m>=a||m<b):(m>=a&&m<b); if(inn){ sc[i]=k; idd[i]=q.day-(w&&m<b?1:0); break; } } }
  D.sc=sc; D.mn=mn;
  const cyc=D.cyc, byId=new Map();
  for(let i=0;i<N;i++){ const k=sc[i]; if(k<0) continue; let cy=byId.get(idd[i]); if(!cy){ cy={id:idd[i],s:[null,null,null],hi:-Infinity,lo:Infinity,stat:null,pf:null,rx0:-1,rx1:-1,nt:[],tr:[]}; byId.set(idd[i],cy); cyc.push(cy); }
    let z=cy.s[k]; if(!z){ z={i0:i,i1:i,hi:c[i].high,lo:c[i].low}; cy.s[k]=z; } else { z.i1=i; if(c[i].high>z.hi) z.hi=c[i].high; if(c[i].low<z.lo) z.lo=c[i].low; }
    if(c[i].high>cy.hi) cy.hi=c[i].high; if(c[i].low<cy.lo) cy.lo=c[i].low; }
  cyc.sort((a,b)=>a.id-b.id);
  const atr=amdAtr(c,AL); let lastEnd=-1;
  cyc.forEach((cy,ci)=>{
    const NY=cy.s[2]; cy.stat={brk:'Waiting',ret:'-',bos:'-',ent:'-',dir:0,note:''};
    if(!NY||NY.i0<1) return;
    let rg=[];
    if(p.pm===AMD_PM[1]){ const pv=ci>0?cyc[ci-1]:null; if(pv) [0,1,2].forEach(k=>{ const z=pv.s[k]; if(z) rg.push([z.i0,Math.min(z.i1,NY.i0-1)]); }); }
    else [0,1].forEach(k=>{ const z=cy.s[k]; if(z&&z.i0<NY.i0) rg.push([z.i0,Math.min(z.i1,NY.i0-1)]); });
    rg=rg.filter(r=>r[1]>=r[0]);
    if(!rg.length){ cy.stat.ent='No range data'; return; }
    const pf=amdProf(c,rg,R,VA); if(!pf){ cy.stat.ent='Range too small'; return; }
    cy.pf=pf; cy.rx0=Math.min.apply(null,rg.map(r=>r[0])); cy.rx1=Math.max.apply(null,rg.map(r=>r[1]));
    const poc=pf.poc; let st=null, trN=0, armU=c[NY.i0-1].close<=poc, armD=c[NY.i0-1].close>=poc;
    const cancel=(j,why,d)=>{ cy.stat.ent='NO TRADE'; cy.stat.note=why; const o={cy:ci,i:j,why,dir:d}; cy.nt.push(o); D.nt.push(o); if(st&&st.rec){ st.rec.res='fail'; st.rec.end=j; st.rec.why=why; } st=null; };
    const tryEntry=(j,pat,a)=>{ const d=st.dir, b=c[j], en=b.close, sl=d>0?st.ext-slB*st.a0:st.ext+slB*st.a0, risk=(en-sl)*d;
      if(trN>=maxTr) return cancel(j,'Max trades per New York session reached',d);
      if(p.oneAt&&j<=lastEnd) return cancel(j,'A trade is still open',d);
      if(p.dl){ let sR=0; cy.tr.forEach(t=>{ if(t.res!=='open'&&t.end<j) sR+=t.rr; }); if(sR*rkP<=-dlP) return cancel(j,'Daily loss limit reached',d); }
      if(!(risk>0)||risk>maxRk*a) return cancel(j,'Risk parameters invalid (stop too tight or too wide)',d);
      const tg=amdTargets(c,cyc,ci,pf,d,en,risk,j,PL,p), t={cy:ci,dir:d,pat,brk:st.brk,tch:st.tch,bos:st.bos,i:j,time:b.time,price:en,sl,t:tg.T,tn:tg.tn,R:tg.T.map(v=>(v-en)*d/risk),tp:0,res:'open',end:j,rr:null,sw:st.lvlI,lvl:st.lvl,ext:st.ext};
      const live=ci===cyc.length-1&&sc[N-1]===2&&NY.i1===N-1, endI=hold0?NY.i1:N-1, closeEnd=hold0&&!live;
      amdSim(c,t,endI,forming,N,p,closeEnd); cy.tr.push(t); D.tr.push(t); trN++; lastEnd=t.res==='open'?N-1:t.end;
      cy.stat.ent=(d>0?'BUY':'SELL')+' - pattern '+pat; cy.stat.note=''; if(st.rec){ st.rec.res='trade'; st.rec.end=j; } D.ev.push({type:d>0?'buy':'sell',time:b.time,idx:j,price:en,sl,t:tg.T}); st=null; };
    for(let j=NY.i0;j<=NY.i1;j++){
      if(forming&&j===N-1) break;
      const b=c[j], a=atr[j]>0?atr[j]:(pf.hi-pf.lo)/20;
      if(!st){
        const upB=armU&&b.close>poc+brkB*a, dnB=armD&&b.close<poc-brkB*a;
        if(upB||dnB){ const d=upB?1:-1, rec={cy:ci,dir:d,brk:j,tch:-1,bos:-1,end:j,ext:null,lvl:null,lvlI:-1,poc,tol:tolM*a,res:'live',why:''};
          st={dir:d,ph:'ret',brk:j,tch:-1,ext:0,leg:d>0?b.high:b.low,legI:j,sw:null,bos:-1,lvl:0,lvlI:-1,rd:0,a0:a,tol:tolM*a,inv:invM*a,rec}; D.set.push(rec);
          if(d>0) armU=false; else armD=false; D.brk.push({cy:ci,i:j,dir:d});
          cy.stat.brk=d>0?'Break above POC (close confirmed)':'Break below POC (close confirmed)'; cy.stat.ret='Waiting'; cy.stat.bos='-'; cy.stat.ent='-'; cy.stat.note=''; cy.stat.dir=d; }
      } else {
        const d=st.dir, pp=j-PL;
        if(pp>=st.brk&&st.ph!=='ent'&&(d>0?amdPH(c,pp,PL,PL):amdPL(c,pp,PL,PL))) st.sw={i:pp,v:d>0?c[pp].high:c[pp].low};
        const bad=d>0?b.close<poc-st.inv:b.close>poc+st.inv;
        if(bad){ if(st.ph==='ret'||st.ph==='tch') cy.stat.ret='Failed'; cancel(j,st.ph==='ent'?'Price closed back through the POC':'Retest failed - closed back through the POC',d); }
        else if(st.ph!=='ent'&&j-st.brk>maxSet) cancel(j,st.ph==='ret'?'Retest did not happen in time':'BOS did not happen in time',d);
        else if(st.ph==='ret'){
          if(d>0?b.low<=poc+st.tol:b.high>=poc-st.tol){ st.ph='tch'; st.tch=j; st.ext=d>0?b.low:b.high; st.rec.tch=j; st.rec.ext=st.ext; cy.stat.ret='Touched - holding'; cy.stat.bos='Waiting'; }
          else if(d>0?b.high>st.leg:b.low<st.leg){ st.leg=d>0?b.high:b.low; st.legI=j; } }
        else if(st.ph==='tch'){
          st.ext=d>0?Math.min(st.ext,b.low):Math.max(st.ext,b.high); st.rec.ext=st.ext;
          const lvl=st.sw?st.sw.v:st.leg;
          if(d>0?b.close>lvl:b.close<lvl){ st.ph='ent'; st.bos=j; st.lvl=lvl; st.lvlI=st.sw?st.sw.i:st.legI; st.rd=0; st.rec.bos=j; st.rec.lvl=lvl; st.rec.lvlI=st.lvlI; cy.stat.bos='Confirmed (close '+(d>0?'above':'below')+' swing)'; cy.stat.ent='Waiting for candle pattern'; } }
        else if(st.ph==='ent'){
          if(j-st.bos>maxBos) cancel(j,'Entry sequence expired',d);
          else { const slv=d>0?st.ext-slB*st.a0:st.ext+slB*st.a0;
            if(d>0?b.close<slv:b.close>slv) cancel(j,'Retest swing broken before entry',d);
            else { const g=d>0?b.close>b.open:b.close<b.open, r=d>0?b.close<b.open:b.close>b.open;
              if(r){ st.rd++; if(st.rd>2) cancel(j,'Candle sequence failed',d); }
              else if(g){ const pat=st.rd===0?'C':st.rd===1?'B':'A'; if(!p['pat'+pat]) cancel(j,'Pattern '+pat+' is switched off',d); else tryEntry(j,pat,a); } } } }
      }
      if(b.close<=poc) armU=true; if(b.close>=poc) armD=true;
    }
    const live=ci===cyc.length-1&&NY.i1===N-1;
    if(st){ if(!live) cancel(NY.i1,st.ph==='ret'?'Retest did not happen before the session ended':st.ph==='tch'?'BOS not confirmed before the session ended':'Candle sequence missing - session ended',st.dir); }
    else if(!live&&cy.stat.brk==='Waiting'){ cy.stat.ent='NO TRADE'; cy.stat.note='POC breakout did not happen'; const o={cy:ci,i:NY.i1,why:'POC breakout did not happen',dir:0}; cy.nt.push(o); D.nt.push(o); }
  });
  // backtest summary
  D.tr.sort((a,b)=>a.i-b.i);
  const cl=D.tr.filter(t=>t.res!=='open'), ord=cl.slice().sort((a,b)=>a.end-b.end);
  let eq=EQ0, peak=EQ0, mdd=0, gp=0, gl=0, netR=0, w=0, l=0;
  ord.forEach(t=>{ eq+=eq*rkP/100*t.rr; if(eq>peak) peak=eq; mdd=Math.max(mdd,(peak-eq)/peak*100); netR+=t.rr; if(t.rr>0){ w++; gp+=t.rr; } else { l++; gl-=t.rr; } });
  D.tr.forEach(t=>{ let e0=EQ0; ord.forEach(o=>{ if(o.end<t.i) e0+=e0*rkP/100*o.rr; }); t.riskAmt=e0*rkP/100; t.units=t.riskAmt/Math.abs(t.price-t.sl); });
  const sub=a=>{ const n=a.length, ww=a.filter(t=>t.rr>0).length, nr=a.reduce((s,t)=>s+t.rr,0); return {n,w:ww,wr:n?ww/n*100:0,net:nr}; };
  const wins=cl.filter(t=>t.rr>0), loss=cl.filter(t=>t.rr<=0), aw=wins.length?gp/wins.length:0, al=loss.length?gl/loss.length:0;
  D.st={n:cl.length,open:D.tr.length-cl.length,w,l,wr:cl.length?w/cl.length*100:0,pf:gl>0?gp/gl:(gp>0?Infinity:0),mdd,netR,net:eq-EQ0,netPct:(eq-EQ0)/EQ0*100,avgR:cl.length?netR/cl.length:0,payoff:al>0?aw/al:(aw>0?Infinity:0),eq,
    buy:sub(cl.filter(t=>t.dir>0)),sell:sub(cl.filter(t=>t.dir<0)),ny:sub(cl),asia:sub([]),lon:sub([])};
  const last=cyc.length?cyc[cyc.length-1]:null; D.live=last; D.ok=true; return D; }
let amdMem=null;
function amdGet(c,p){ const N=c.length, iv=amdIv(c), tz=amdTz(p.tz), forming=N>0&&iv>0&&(c[N-1].time+iv)*1000>Date.now();
  const key=JSON.stringify(p)+'|'+tz+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+forming+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low+'|'+(c[N-1].volume||0):''); if(amdMem&&amdMem.k===key) return amdMem.D;
  let D; try{ D=amdCompute(c,p,iv,forming,tz); }catch(e){ console.error('amd calc failed',e); D={N,iv,ok:false,msg:'AMD POC Breakout calculation error: '+(e&&e.message),cyc:[],tr:[],nt:[],brk:[],set:[],ev:[],st:null}; } amdMem={k:key,D}; return D; }
IND.amd={label:'AMD Three-Session POC Breakout',title:'MarketPlusView AMD Three-Session POC Breakout \u00b7 sessions, volume-profile POC, New York breakout, retest, BOS, candle sequence, SL / TP1-TP3',cat:'Premium Strategy',nm:p=>'AMD POC Breakout',p:Object.assign({},AMD_DEF),cols:['#ffd600'],
  fields:[['tz','sel','Time zone of the session hours',{opts:AMD_TZ}],['aOn','chk','Asian session (Accumulation) on'],['aHrs','txt','Asian hours (e.g. 0000-0700)'],['lOn','chk','London session (Manipulation) on'],['lHrs','txt','London hours (e.g. 0700-1300)'],['nHrs','txt','New York hours = trading session (e.g. 1300-2200)'],
    ['pm','sel','Volume profile range',{opts:AMD_PM}],['rows','num','Volume profile resolution (rows)',{min:8,max:200,step:1}],['va','num','Value Area %',{min:10,max:100,step:1}],
    ['brkBuf','num','Breakout: close must pass the POC by (x ATR, 0 = any close beyond)',{min:0,max:5,step:0.05}],['retTol','num','Retest tolerance (x ATR around the POC)',{min:0,max:5,step:0.05}],['invBuf','num','Invalidate: close back through the POC by (x ATR)',{min:0,max:5,step:0.05}],['maxSet','num','Max candles from breakout to BOS',{min:5,max:500,step:1}],['piv','num','BOS pivot length (left = right candles; also the confirmation delay)',{min:1,max:15,step:1}],
    ['patA','chk','Pattern A: red, red, GREEN (SELL: green, green, RED)'],['patB','chk','Pattern B: red, GREEN (SELL: green, RED)'],['patC','chk','Pattern C: GREEN (SELL: RED)'],['maxBos','num','Max candles between the BOS and the entry',{min:1,max:30,step:1}],
    ['slBuf','num','Stop loss safety buffer (x ATR beyond the retest swing)',{min:0,max:5,step:0.05}],['maxRisk','num','Reject the trade if the stop is wider than (x ATR)',{min:0.5,max:50,step:0.5}],
    ['tpMode','sel','Take profit mode',{opts:AMD_TP}],['tp1R','num','TP1 (x risk)',{min:0.25,max:50,step:0.25}],['tp2R','num','TP2 (x risk)',{min:0.25,max:50,step:0.25}],['tp3R','num','TP3 (x risk)',{min:0.25,max:50,step:0.25}],['tpMin','num','Structure mode: first target at least (x risk) away',{min:0,max:10,step:0.25}],
    ['tsA','chk','Structure targets: Asian high / low'],['tsL','chk','Structure targets: London high / low'],['tsP','chk','Structure targets: previous day high / low'],['tsS','chk','Structure targets: swing highs / lows'],['tsV','chk','Structure targets: Value Area high / low'],
    ['partial','chk','Partial exits at TP1 / TP2 / TP3'],['p1','num','Close at TP1 (%)',{min:0,max:100,step:5}],['p2','num','Close at TP2 (%)',{min:0,max:100,step:5}],['p3','num','Close at TP3 (%)',{min:0,max:100,step:5}],['be','chk','Move the stop to break-even after TP1'],['hold','sel','Open trade at the end of New York',{opts:AMD_HOLD}],
    ['risk','num','Risk per trade (% of equity)',{min:0.01,max:100,step:0.05}],['eq','num','Starting equity (backtest)',{min:1,max:1e9,step:100}],['maxTr','num','Max trades per New York session',{min:1,max:20,step:1}],['oneAt','chk','One position at a time (no duplicate entries)'],['dl','chk','Daily loss limit'],['dlPct','num','Daily loss limit (% of equity)',{min:0.1,max:100,step:0.1}],
    ['comm','num','Commission per side (% of price)',{min:0,max:5,step:0.005}],['slip','num','Slippage per side (% of price)',{min:0,max:5,step:0.005}],['spr','num','Spread (% of price)',{min:0,max:5,step:0.005}],['atrLen','num','ATR length',{min:2,max:100,step:1}],
    ['showSess','chk','Show session backgrounds and separators'],['showNames','chk','Show session names'],['showRange','chk','Show the three-session range box'],['showProf','chk','Show the volume profile histogram'],['histW','num','Histogram width (% of the range width)',{min:5,max:100,step:1}],['showLines','chk','Show POC / VAH / VAL lines'],
    ['showBrk','chk','Show breakout labels'],['showRet','chk','Show retest zones'],['showBos','chk','Show BOS lines and labels'],['showSig','chk','Show BUY / SELL signals'],['showRisk','chk','Show entry, stop loss and TP1-TP3'],['showNT','chk','Show NO TRADE labels'],['keep','num','Days (cycles) to draw',{min:1,max:60,step:1}],
    ['showDash','chk','Dashboard'],['dpos','sel','Dashboard position',{opts:AMD_POS}],['showPerf','chk','Performance panel (backtest)'],['ppos','sel','Performance panel position',{opts:AMD_POS}],
    ['cA','col','Asian zone'],['cL','col','London zone'],['cN','col','New York zone'],['cPoc','col','POC'],['cBuy','col','Bullish'],['cSell','col','Bearish'],['alBuy','chk','Alert on BUY'],['alSell','chk','Alert on SELL'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},AMD_DEF,p), D=amdGet(c,q); return {mk:[],boxes:[{type:'amdview',pts:[],o:q,D}],labels:[],events:D.ok?D.ev:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='amdview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, N=candles.length; if(!D||!N) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.font='10px system-ui,sans-serif'; cx.textBaseline='middle'; cx.setLineDash([]);
    if(D.ok&&D.N===N){ const c=candles, cyc=D.cyc, c0=Math.max(0,cyc.length-Math.max(1,Math.round(+p.keep)||4)), SC=[p.cA,p.cL,p.cN], SN=['Asian \u00b7 Accumulation','London \u00b7 Manipulation','New York \u00b7 Distribution'];
      const xi=i=>X(i); let bs=6; { const a=X(N-1), b=X(Math.max(0,N-2)); if(a!=null&&b!=null&&a!==b) bs=Math.abs(a-b); }
      const pill=(t,x,y,bg,al,fg)=>{ const w=cx.measureText(t).width+8; let lx=al==='r'?x-w:al==='c'?x-w/2:x; if(lx+w>W-2) lx=W-w-2; if(lx<2) lx=2; cx.fillStyle=bg; cx.beginPath(); if(cx.roundRect) cx.roundRect(lx,y-7,w,14,3); else cx.rect(lx,y-7,w,14); cx.fill(); cx.fillStyle=fg||'#fff'; cx.textAlign='left'; cx.fillText(t,lx+4,y); };
      const hl=(x0,x1,y,col,lw,dash)=>{ cx.strokeStyle=col; cx.lineWidth=lw; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]); };
      for(let ci=c0;ci<cyc.length;ci++){ const cy=cyc[ci];
        if(p.showSess) for(let k=0;k<3;k++){ const s=cy.s[k]; if(!s||!D.S[k].on) continue; const xs=xi(s.i0), xe=xi(s.i1); if(xs==null||xe==null) continue; const l=xs-bs/2, r=xe+bs/2; if(r<-5||l>W+5) continue;
          cx.fillStyle=amdA(SC[k],0.11); cx.fillRect(l,0,Math.max(1,r-l),H); cx.strokeStyle=amdA(SC[k],0.7); cx.lineWidth=1; cx.setLineDash([5,4]); cx.beginPath(); cx.moveTo(l,0); cx.lineTo(l,H); cx.stroke(); cx.setLineDash([]);
          if(p.showNames&&r-l>30){ cx.font='bold 9px system-ui,sans-serif'; const nm=r-l>110?SN[k]:SN[k].split(' \u00b7 ')[0]; cx.fillStyle=amdA(SC[k],1); cx.textAlign='left'; cx.fillText(nm,Math.max(l+4,3),10+k*0); cx.font='10px system-ui,sans-serif'; } }
        const pf=cy.pf, NY=cy.s[2]; if(!pf||!NY) continue; const xa=xi(cy.rx0), xb=xi(NY.i1); if(xa==null||xb==null) continue; const xr0=xa-bs/2, xr1=xb+bs/2; if(xr1<-5||xr0>W+5) continue;
        const yH=Y(pf.hi), yL=Y(pf.lo);
        if(p.showRange&&yH!=null&&yL!=null){ cx.strokeStyle='rgba(200,200,210,.55)'; cx.lineWidth=1; cx.setLineDash([2,3]); cx.strokeRect(xr0+.5,Math.min(yH,yL)+.5,xr1-xr0,Math.abs(yL-yH)); cx.setLineDash([]); cx.font='9px system-ui,sans-serif'; cx.fillStyle='rgba(200,200,210,.9)'; cx.textAlign='left'; cx.fillText(p.pm===AMD_PM[1]?'Three-session range':'Asian + London range',xr0+4,Math.min(yH,yL)-6); cx.font='10px system-ui,sans-serif'; }
        if(p.showProf){ const xe2=xi(cy.rx1), wpx=amdC(Math.abs((xe2==null?xr1:xe2)-xa)*(+p.histW||22)/100,24,260);
          for(let k=0;k<pf.R;k++){ const v=pf.V[k]; if(!(v>0)) continue; const y1=Y(pf.lo+(k+1)*pf.step), y0=Y(pf.lo+k*pf.step); if(y1==null||y0==null) continue; const inVA=k>=pf.vaLo&&k<=pf.vaHi, w=Math.max(1,v/pf.mx*wpx);
            cx.fillStyle=k===pf.pI?amdA(p.cPoc,0.85):inVA?'rgba(66,133,244,.42)':'rgba(150,160,175,.28)'; cx.fillRect(xr0,Math.min(y0,y1),w,Math.max(1,Math.abs(y0-y1)-1)); } }
        if(p.showLines){ const yP=Y(pf.poc), yV=Y(pf.vah), yW=Y(pf.val); if(yV!=null){ hl(xr0,xr1,yV,'rgba(100,170,255,.9)',1,[4,3]); cx.font='9px system-ui,sans-serif'; cx.fillStyle='rgba(100,170,255,1)'; cx.textAlign='left'; cx.fillText('VAH '+amdP(pf.vah),xr0+4,yV-6); }
          if(yW!=null){ hl(xr0,xr1,yW,'rgba(100,170,255,.9)',1,[4,3]); cx.font='9px system-ui,sans-serif'; cx.fillStyle='rgba(100,170,255,1)'; cx.textAlign='left'; cx.fillText('VAL '+amdP(pf.val),xr0+4,yW+7); }
          if(yP!=null){ hl(xr0,xr1,yP,p.cPoc,2.2); cx.font='bold 9px system-ui,sans-serif'; pill('POC '+amdP(pf.poc),xr1-3,yP,amdA('#8a6d00',0.92),'r',p.cPoc); cx.font='10px system-ui,sans-serif'; } } }
      cx.font='bold 9px system-ui,sans-serif';
      D.set.forEach(r=>{ if(r.cy<c0) return; const up=r.dir>0, col=up?p.cBuy:p.cSell, xb=xi(r.brk); if(xb==null||xb<-20||xb>W+20) return;
        if(p.showBrk){ const bar=c[r.brk], yy=Y(up?bar.high:bar.low); if(yy!=null){ const y0=up?yy-3:yy+3, y1=up?y0-7:y0+7; cx.beginPath(); cx.moveTo(xb,y1); cx.lineTo(xb-4,y0); cx.lineTo(xb+4,y0); cx.closePath(); cx.fillStyle=col; cx.fill(); pill(up?'BRK \u25b2':'BRK \u25bc',xb,up?y1-9:y1+9,amdA(col,0.85),'c'); } }
        if(p.showRet&&r.tch>=0){ const xt=xi(r.tch), xe=xi(r.bos>=0?r.bos:r.end), yp=Y(r.poc), yt=Y(r.poc+(up?1:-1)*r.tol); if(xt!=null&&xe!=null&&yp!=null&&yt!=null){ const x0=xt-bs/2, x1=Math.max(xe+bs/2,x0+8); cx.fillStyle=amdA(col,0.2); cx.fillRect(x0,Math.min(yp,yt),x1-x0,Math.max(2,Math.abs(yt-yp))); cx.strokeStyle=amdA(col,0.8); cx.lineWidth=1; cx.setLineDash([3,2]); cx.strokeRect(x0+.5,Math.min(yp,yt)+.5,x1-x0,Math.max(2,Math.abs(yt-yp))); cx.setLineDash([]);
            const ye=Y(r.ext); if(ye!=null){ hl(x0,x1,ye,amdA(col,0.9),1,[1.5,2.5]); } pill('Retest',x0,Math.max(yp,yt)+9,amdA(col,0.8),'l'); } }
        if(p.showBos&&r.bos>=0){ const xl=xi(r.lvlI>=0?r.lvlI:r.brk), xe=xi(r.bos), yl=Y(r.lvl); if(xl!=null&&xe!=null&&yl!=null){ hl(xl,xe,yl,col,1.2,[5,3]); pill(up?'BOS \u25b2':'BOS \u25bc',xe,yl+(up?-9:9),amdA(col,0.9),'c'); } } });
      if(p.showNT) D.nt.forEach(o=>{ if(o.cy<c0) return; const cy=cyc[o.cy], x=xi(o.i); if(!cy||!cy.pf||x==null||x<-40||x>W+40) return; const yP=Y(cy.pf.poc); if(yP==null) return; const t='NO TRADE \u00b7 '+(o.why.length>46?o.why.slice(0,45)+'\u2026':o.why); pill(t,x,yP+(o.dir>0?-16:o.dir<0?16:-16),'rgba(90,96,110,.92)','r'); });
      D.tr.forEach(t=>{ if(t.cy<c0) return; const x0=xi(t.i), x1r=xi(t.end); if(x0==null||x1r==null) return; const x1=Math.max(x1r,x0+14); if(x1<-60||x0>W+60) return; const up=t.dir>0, col=up?p.cBuy:p.cSell, yE=Y(t.price);
        if(p.showRisk&&yE!=null){ const ySL=Y(t.sl), yT=t.t.map(Y); if(ySL!=null){ cx.fillStyle=amdA(p.cSell,0.13); cx.fillRect(x0,Math.min(yE,ySL),x1-x0,Math.abs(ySL-yE)); } if(yT[2]!=null){ cx.fillStyle=amdA(p.cBuy,0.10); cx.fillRect(x0,Math.min(yE,yT[2]),x1-x0,Math.abs(yT[2]-yE)); }
          const lv=[['SL',t.sl,p.cSell,t.res==='sl',x0]].concat(t.t.map((v,u)=>['TP'+(u+1)+(t.tn[u]?' '+t.tn[u]:''),v,p.cBuy,t.tp>u,x0])), labs=[]; hl(x0,x1,yE,'rgba(255,255,255,.7)',1,[4,3]);
          lv.forEach(v=>{ const y=Y(v[1]); if(y==null) return; hl(v[4],x1,y,v[2],v[3]?2.2:1.3,v[0]==='SL'?[]:[4,3]); labs.push({y,t:v[0]+(v[3]?(v[0]==='SL'?' \u2715':' \u2713'):'')+' '+amdP(v[1]),c:v[2]}); });
          labs.sort((a,b)=>a.y-b.y); for(let k=1;k<labs.length;k++) if(labs[k].y-labs[k-1].y<14) labs[k].y=labs[k-1].y+14; labs.forEach(l=>pill(l.t,x1+3,l.y,amdA(l.c,0.88),'l'));
          if(t.res!=='open'){ const ok=t.rr>0, nm=t.res==='sl'?'SL':t.res==='be'?'BE':t.res==='time'?'Session end':t.res.toUpperCase(); pill((ok?'\u2713 ':'\u2717 ')+nm+' '+(t.rr>=0?'+':'')+amdFR(t.rr)+'R',x1+3,yE,ok?amdA(p.cBuy,0.95):amdA(p.cSell,0.95),'l'); } }
        if(p.showSig&&yE!=null){ const bar=c[t.i], sy=Y(up?bar.low:bar.high); if(sy!=null){ const L=26, y2=up?sy+4+L:sy-4-L; cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([1.5,2.5]); cx.beginPath(); cx.moveTo(x0,up?sy+4:sy-4); cx.lineTo(x0,y2); cx.stroke(); cx.setLineDash([]); pill((up?'BUY ':'SELL ')+t.pat,x0,up?y2+8:y2-8,col,'c'); } } });
      cx.font='10px system-ui,sans-serif';
      // panels
      const used={}; const panel=(title,rows,pos)=>{ cx.font='10px system-ui,sans-serif'; const rh=15; let w0=cx.measureText(title).width, w1=0; rows.forEach(r=>{ if(r[0]===null){ w0=Math.max(w0,cx.measureText(r[1]).width-60); return; } w0=Math.max(w0,cx.measureText(r[0]).width); w1=Math.max(w1,cx.measureText(String(r[1])).width); }); w0+=14; w1+=14; const tw=Math.min(W-16,w0+w1), th=rh*(rows.length+1), top=pos.indexOf('Top')===0, left=pos.indexOf('Left')>-1, key=pos, off=used[key]||0;
        const tx=left?8:W-tw-8, ty=top?8+off:H-th-8-off; used[key]=off+th+6;
        cx.fillStyle='rgba(12,16,26,.84)'; cx.fillRect(tx,ty,tw,th); cx.strokeStyle='rgba(120,130,150,.45)'; cx.lineWidth=1; cx.strokeRect(tx+.5,ty+.5,tw,th); cx.fillStyle='rgba(255,214,0,.22)'; cx.fillRect(tx,ty,tw,rh); cx.fillStyle='#fff'; cx.font='bold 10px system-ui,sans-serif'; cx.textAlign='left'; cx.fillText(title,tx+6,ty+rh/2+0.5); cx.font='10px system-ui,sans-serif';
        rows.forEach((r,k)=>{ const y=ty+rh*(k+1)+rh/2; if(r[0]===null){ cx.fillStyle=r[2]||'#9aa3b5'; cx.textAlign='left'; cx.fillText(r[1],tx+6,y); return; } cx.fillStyle='#b8c0d4'; cx.textAlign='left'; cx.fillText(r[0],tx+6,y); cx.fillStyle=r[2]||'#fff'; cx.textAlign='right'; cx.fillText(String(r[1]),tx+tw-6,y); }); };
      if(p.showDash){ const cy=D.live, lt=cy?cy.tr[cy.tr.length-1]:null, si=D.sc[N-1], nm=si>=0?['Asian','London','New York'][si]:'Out of session', tm=amdHM(D.mn[N-1]), g='#26a69a', r='#ef5350', st=cy?cy.stat:null;
        const col=t=>/^NO TRADE|Failed/.test(t)?r:/Confirmed|Touched|BUY|SELL/.test(t)?g:'#fff', dirC=lt?(lt.dir>0?g:r):'#fff';
        panel('AMD POC Breakout',[['Session',nm+' ('+tm+')',si===2?g:'#fff'],['POC',cy&&cy.pf?amdP(cy.pf.poc):'-',p.cPoc],['Breakout',st?st.brk:'-',col(st?st.brk:'')],['Retest',st?st.ret:'-',col(st?st.ret:'')],['BOS',st?st.bos:'-',col(st?st.bos:'')],['Entry',st?(st.ent==='NO TRADE'?'NO TRADE':st.ent):'-',col(st?st.ent:'')],
          [null,st&&st.note?st.note:'',r],['Direction',lt?(lt.dir>0?'BUY':'SELL'):'-',dirC],['Entry price',lt?amdP(lt.price):'-'],['Stop loss',lt?amdP(lt.sl):'-',lt?r:'#fff'],['TP1',lt?amdP(lt.t[0]):'-',lt?g:'#fff'],['TP2',lt?amdP(lt.t[1]):'-',lt?g:'#fff'],['TP3',lt?amdP(lt.t[2]):'-',lt?g:'#fff'],['Trades today',(cy?cy.tr.length:0)+' / '+(Math.max(1,Math.round(+p.maxTr)||1))]].filter(x=>x[0]!==null||x[1]),p.dpos||'Top Right'); }
      if(p.showPerf&&D.st){ const S=D.st, f=v=>(v>=0?'+':'')+amdFR(v), g='#26a69a', r='#ef5350', pfs=S.pf===Infinity?'\u221e':S.pf.toFixed(2);
        panel('Backtest (estimate)',[['Total trades',S.n+(S.open?' (+'+S.open+' open)':'')],['Winning / losing',S.w+' / '+S.l],['Win rate',S.wr.toFixed(1)+' %'],['Profit factor',pfs],['Max drawdown',S.mdd.toFixed(2)+' %',S.mdd>0?r:'#fff'],['Net profit',(S.net>=0?'+':'')+S.net.toFixed(2)+' ('+S.netPct.toFixed(1)+' %)',S.net>=0?g:r],['Net R / avg R',f(S.netR)+'R / '+f(S.avgR)+'R'],['Avg win / avg loss',S.payoff===Infinity?'\u221e':S.payoff.toFixed(2)],
          ['BUY',S.buy.n+' \u00b7 '+S.buy.wr.toFixed(0)+' % \u00b7 '+f(S.buy.net)+'R'],['SELL',S.sell.n+' \u00b7 '+S.sell.wr.toFixed(0)+' % \u00b7 '+f(S.sell.net)+'R'],['New York',S.ny.n+' \u00b7 '+S.ny.wr.toFixed(0)+' % \u00b7 '+f(S.ny.net)+'R'],['Asian / London','no entries (by design)','#9aa3b5']],p.ppos||'Bottom Right'); } }
    if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); }
    cx.restore(); }; }
// alerts: fire once, when the entry candle has closed (the newest closed candle), while the app is open
function amdAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0], KEY={buy:'alBuy',sell:'alSell'}, MSG={buy:['AMD POC BUY - breakout, retest, BOS, candle sequence','#2e7d32'],sell:['AMD POC SELL - breakout, retest, BOS, candle sequence','#c62828']};
  inds.forEach(i=>{ if(i.t!=='amd'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},AMD_DEF,i.p); let quiet=q; if(i._amK!==key){ i._amK=key; i._amLast={}; quiet=true; }
    const last=i._amLast||(i._amLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!P[KEY[e.type]]) return;
      toast(MSG[e.type][0]+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 Entry '+amdP(e.price)+' \u00b7 SL '+amdP(e.sl)+' \u00b7 TP1 '+amdP(e.t[0]),MSG[e.type][1]);
      if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _amRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_amRE.apply(this,arguments); try{ amdAlerts(q); }catch(e){ console.error('amd alerts',e); } return rv; }; }
try{ DESC.amd='Premium strategy \u00b7 Asian (Accumulation), London (Manipulation) and New York (Distribution) sessions, a Fixed Range Volume Profile with POC / VAH / VAL, then the New York sequence: a candle CLOSE beyond the POC, a retest, a Break of Structure, a candle pattern (red-red-green, red-green or green; the mirror for SELL) and the entry at that candle close. Stop loss beyond the retest swing, TP1-TP3 as R:R or nearest liquidity, risk sizing, dashboard and a backtest panel'; }catch(e){}
}catch(err){ console.error('amd strategy failed',err); window.__amdErr=err; }

// ---- [mts] PREMIUM STRATEGY: MARKETPLUSVIEW \u2014 MTF STRUCTURE SIGNALS - higher-timeframe BOS / CHOCH bias + entry-timeframe BUY / SELL (self-contained: every name starts with mts / MTS) ----
// ONE tool, ONE selector. STRATEGY MODE is either BOS (trend continuation) or CHOCH (trend reversal); only the selected one runs, switching resets everything.
//  1. HIGHER TIMEFRAME - confirmed swing highs / lows (a pivot is confirmed only after N candles have closed to its right). A candle CLOSE (or wick, optional) beyond the last unbroken swing:
//        break in the direction of the current structure = BOS, break against it = CHOCH, the very first break (no structure yet) = grey "BRK" (never counted as BOS or CHOCH).
//        BOS mode   : bias = direction of the latest HTF BOS. An HTF CHOCH makes the bias NEUTRAL until a new BOS prints in the new direction.
//        CHOCH mode : bias = direction of the latest HTF CHOCH, until the opposite CHOCH.
//  2. ENTRY TIMEFRAME - same structure engine on the entry candles. BOS mode needs an entry BOS, CHOCH mode needs an entry CHOCH, in the direction of the HTF bias. BUY / SELL prints when that entry candle has CLOSED
//        (or, in Retest mode, when the broken level has been retested and held on a closed candle).
//  3. NEVER against the HTF bias. Optional filters: HTF / entry confirmation, strong break candle, liquidity sweep first, premium / discount, chop, room to move, HTF EMA side, volume, session, fresh bias, HTF zone,
//        duplicates, cooldown, neutral ignore, min swing, ATR, minimum quality score (0-100).
//  4. EVERY signal gets a stop (beyond the entry swing), TP1-TP3 (R:R or the next HTF swing), a quality score, and a backtest result. The backtest panel and the filter test show what each filter did on the candles loaded.
//  5. NO REPAINT - only closed candles (a candle counts as closed only if the data was read AFTER it ended), confirmed pivots only, no look-ahead (an HTF event is known at its candle close, never earlier), printed signals never move.
// HTF / entry candles are read on their own (Binance klines), so the tool works on any chart time frame. If a timeframe is not offered it is built from a lower one (2m, 10m, 8h) or from the chart candles.
// No result is promised: this is a market-structure tool and the backtest is an estimate on the candles loaded, not a guarantee of profit.
try{
const MTS_MODE=['BOS \u2014 Trend Continuation','CHOCH \u2014 Trend Reversal'];
const MTS_HTF=[['5 Minutes','5m',300],['15 Minutes','15m',900],['30 Minutes','30m',1800],['1 Hour','1h',3600],['2 Hours','2h',7200],['4 Hours','4h',14400],['8 Hours','8h',28800],['12 Hours','12h',43200],['Daily','1d',86400],['Weekly','1w',604800]];
const MTS_ENT=[['1 Minute','1m',60],['2 Minutes','2m',120],['3 Minutes','3m',180],['5 Minutes','5m',300],['10 Minutes','10m',600],['15 Minutes','15m',900],['30 Minutes','30m',1800]];
const MTS_BASE={'2m':'1m','10m':'5m','8h':'4h'};
const MTS_SECS={'1m':60,'2m':120,'3m':180,'5m':300,'10m':600,'15m':900,'30m':1800,'1h':3600,'2h':7200,'4h':14400,'8h':28800,'12h':43200,'1d':86400,'1w':604800};
const MTS_SW=['2','3','5','8','10','Custom'], MTS_BRK=['Candle close (recommended)','Wick break'], MTS_DET=['Full','Compact'], MTS_POS=['Top Right','Top Left','Bottom Right','Bottom Left'];
const MTS_ENTRY=['On break close','On retest of the broken level'], MTS_TP=['Fixed R:R','Next HTF swing (else R:R)'], MTS_SESS=['Off','London','New York','London + New York','Asia','Custom'];
const MTS_SESSW={'London':[420,960],'New York':[780,1260],'London + New York':[420,1260],'Asia':[0,480]};
const MTS_DEF={mode:MTS_MODE[0],htf:'1 Hour',etf:'5 Minutes',swing:'5',swingC:6,eSwing:0,brk:MTS_BRK[0],
  entryMode:MTS_ENTRY[0],retestBars:12,retestTol:0.15,
  reqHtf:true,reqEnt:false,noDup:true,cool:0,ignNeu:true,minSw:false,minSwAtr:1,minBody:true,minBodyAtr:0.5,atrOn:false,atrMult:0.8,atrLen:14,
  sweepOn:false,sweepLook:20,pdOn:false,pdLevel:50,chopOn:false,chopN:30,chopMax:2,roomOn:false,roomR:1.5,emaOn:false,emaLen:200,volOn:false,volMult:1.2,
  sess:'Off',sessHrs:'0700-1600',freshOn:false,freshN:12,zoneOn:false,zoneTol:0.2,minScore:0,
  slBuf:0.2,slMax:0,tpMode:MTS_TP[0],tp1R:1,tp2R:2,tp3R:3,p1:50,p2:30,p3:20,be:true,costPct:0.04,
  showSw:true,showLvl:true,showBos:true,showChoch:true,showBias:true,showEnt:true,showSig:true,showDev:true,showZones:true,showRisk:true,trKeep:6,detail:MTS_DET[0],keep:25,
  showDash:true,dpos:'Top Right',showBt:true,bpos:'Bottom Right',cmpOn:false,cpos:'Bottom Left',
  scanOn:false,scanSyms:'BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,DOGEUSDT',scanFresh:6,spos:'Top Left',
  cBull:'#26a69a',cBear:'#ef5350',cNeu:'#8d949e',
  alBosBuy:true,alBosSell:true,alChochBuy:true,alChochSell:true,alHtfBull:false,alHtfBear:false,alBias:false,alNew:false,alScan:false,alSound:false};
const mtsC=(v,a,b)=>Math.max(a,Math.min(b,v));
const mtsA=(hex,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; };
const mtsP=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1000?v.toFixed(2):Math.abs(v)>=1?v.toFixed(4):v.toPrecision(5);
const mtsFR=v=>(v>=0?'':'\u2212')+Math.abs(v).toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
const mtsSecOf=iv=>MTS_SECS[iv]||60;
const mtsShort=code=>code==='1d'?'D':code==='1w'?'W':String(code).toUpperCase();
const mtsPick=(list,label,d)=>list.find(x=>x[0]===label)||list[d];
const MTS_MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const mtsTime=t=>{ const d=new Date(t*1000), z=n=>(n<10?'0':'')+n; return d.getUTCDate()+' '+MTS_MO[d.getUTCMonth()]+' '+z(d.getUTCHours())+':'+z(d.getUTCMinutes())+' UTC'; };
const mtsAge=s=>s<3600?Math.max(1,Math.round(s/60))+'m':s<86400?Math.round(s/3600)+'h':Math.round(s/86400)+'d';
function mtsIv(c){ let m=0; for(let i=c.length-1;i>0&&i>c.length-40;i--){ const d=c[i].time-c[i-1].time; if(d>0&&(m===0||d<m)) m=d; } return m; }
function mtsIdx(c,t){ let lo=0,hi=c.length-1,r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(c[m].time<=t){ r=m; lo=m+1; } else hi=m-1; } return r; }
function mtsUpTo(arr,key,v){ let lo=0,hi=arr.length; while(lo<hi){ const m=(lo+hi)>>1; if(arr[m][key]<=v) lo=m+1; else hi=m; } return lo; }
function mtsLastClosed(R,sec,tc){ let lo=0,hi=R.length-1,r=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(R[m].t+sec<=tc){ r=m; lo=m+1; } else hi=m-1; } return r; }
function mtsSessWin(p){ if(!p.sess||p.sess==='Off') return null; if(p.sess!=='Custom') return MTS_SESSW[p.sess]||null; const m=/^\s*(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})\s*$/.exec(String(p.sessHrs||'')); if(!m) return null; const a=(+m[1])*60+(+m[2]), b=(+m[3])*60+(+m[4]); return (a<1440&&b<=1440)?[a,b%1440]:null; }
const mtsInSess=(m,w)=>w[0]<=w[1]?(m>=w[0]&&m<w[1]):(m>=w[0]||m<w[1]);
// chart candle whose price is closest to v inside [t0, t1): puts a marker exactly on the candle that made the swing
function mtsExt(c,t0,t1,isHigh,v){ let a=mtsIdx(c,t0), b=mtsIdx(c,t1-1); if(b<0) return -1; if(a<0) a=0; if(b-a>4000) a=b-4000; let best=a, bd=Infinity; for(let q=a;q<=b;q++){ const d=Math.abs((isHigh?c[q].high:c[q].low)-v); if(d<bd){ bd=d; best=q; } } return best; }
function mtsAtr(R,L){ const N=R.length, o=new Float64Array(N).fill(NaN); let pc=null,rma=null,sum=0; for(let i=0;i<N;i++){ const h=R[i].h,l=R[i].l,tr=pc==null?h-l:Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)); pc=R[i].c;
    if(i<L-1) sum+=tr; else if(i===L-1){ sum+=tr; rma=sum/L; o[i]=rma; } else { rma=(rma*(L-1)+tr)/L; o[i]=rma; } } return o; }
function mtsEma(R,n){ const N=R.length, o=new Float64Array(N).fill(NaN); if(N<n) return o; const k=2/(n+1); let s=0; for(let i=0;i<n;i++) s+=R[i].c; let p=s/n; o[n-1]=p; for(let i=n;i<N;i++){ p=R[i].c*k+p*(1-k); o[i]=p; } return o; }
// ---------- klines: per market and interval, cached; the history pages back until it covers the chart, the newest candles refresh ----------
const mtsK={};
function mtsKl(sy,iv,q){ return fetch(`${RB(sy)}/klines?symbol=${sy}&interval=${iv}&limit=1000${q||''}`).then(r=>r.json()).then(a=>{ if(!Array.isArray(a)) throw new Error('bad'); return a.map(x=>({t:x[0]/1000,o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]||0})); }); }
function mtsLoad(sy,iv,need,maxPages,refMin){ const key=sy+'|'+iv; let d=mtsK[key]; if(!d) d=mtsK[key]={rows:[],busy:false,ts:0,t0:0,err:false,ver:0,pages:0,done:false};
  const ls=mtsSecOf(iv), ref=Math.max(refMin||0,Math.max(8000,Math.min(30000,ls*100))); if(d.busy) return d; if(d.err&&Date.now()-d.ts<20000) return d;
  const covers=d.rows.length&&(d.rows[0].t<=need+ls||d.done||d.pages>=maxPages); if(covers&&Date.now()-d.ts<ref) return d;
  d.busy=true; const t0=Date.now();
  (async()=>{ try{ let rows=d.rows.slice();
      if(rows.length){ const a=await mtsKl(sy,iv,'&startTime='+Math.floor(rows[rows.length-1].t*1000));
        if(a.length>=1000){ rows=[]; d.pages=0; d.done=false; } else { const m=new Map(); rows.forEach(r=>m.set(r.t,r)); a.forEach(r=>m.set(r.t,r)); rows=Array.from(m.values()).sort((x,y)=>x.t-y.t); } }
      if(!rows.length){ rows=await mtsKl(sy,iv); d.pages=1; d.done=rows.length<1000; }
      while(rows.length&&rows[0].t>need+ls&&!d.done&&d.pages<maxPages){ const a=await mtsKl(sy,iv,'&endTime='+(Math.floor(rows[0].t*1000)-1)); d.pages++; if(a.length<1000) d.done=true; if(!a.length) break; rows=a.concat(rows); }
      d.rows=rows; d.err=false; d.ver++; d.t0=t0; }catch(e){ d.err=true; }
    d.busy=false; d.ts=Date.now(); try{ recomputeExtras(); render(); }catch(e){} })();
  return d; }
function mtsFold(rows,sec,off){ const out=[]; let key=null, b=null; rows.forEach(r=>{ const k=Math.floor((r.t-off)/sec); if(k!==key){ key=k; b={t:k*sec+off,o:r.o,h:r.h,l:r.l,c:r.c,v:r.v||0}; out.push(b); } else { if(r.h>b.h) b.h=r.h; if(r.l<b.l) b.l=r.l; b.c=r.c; b.v+=r.v||0; } }); return out; }
// where the candles of one timeframe come from: the chart itself (same timeframe), the klines feed, or the chart candles folded up (feed not available)
function mtsSrc(c,civ,code,need,maxP){ const sec=mtsSecOf(code), N=c.length;
  if(sec===civ) return {code,sec,kind:'chart',ver:N+'|'+c[N-1].time};
  const base=MTS_BASE[code]||code, d=mtsLoad(sym[0],base,need,maxP);
  if(d.rows.length) return {code,sec,kind:'feed',base,d,ver:d.ver};
  if(d.err&&civ<sec&&sec%civ===0) return {code,sec,kind:'fold',ver:N+'|'+c[N-1].time};
  return {code,sec,kind:'wait',err:d.err}; }
// CLOSED candles only. A feed candle counts as closed when a later one exists, or when the data was requested after it ended.
function mtsBuild(s,c){ const nowS=Date.now()/1000, sec=s.sec, off=s.code==='1w'?345600:0; let bs, closed, rows;
  if(s.kind==='feed'){ const d=s.d; bs=mtsSecOf(s.base); closed=d.rows.filter((r,i)=>r.t+bs<=nowS&&(i<d.rows.length-1||d.t0/1000>=r.t+bs+0.5)); }
  else { const civ=mtsIv(c); bs=s.kind==='chart'?sec:civ; closed=c.map(x=>({t:x.time,o:x.open,h:x.high,l:x.low,c:x.close,v:x.volume||0})).filter(r=>r.t+bs<=nowS); }
  if(s.kind==='chart'||(s.kind==='feed'&&s.base===s.code)) return closed;
  if(!closed.length) return [];
  const lastEnd=closed[closed.length-1].t+bs, f=mtsFold(closed,sec,off); rows=f.filter(r=>r.t+sec<=lastEnd);
  if(rows.length&&rows[0].t<closed[0].t) rows.shift(); return rows; }
// ---------- structure engine: confirmed pivots (right side = N closed candles), BOS / CHOCH classification, no look-ahead ----------
function mtsEngine(R,sw,wick,sec){ const N=R.length, ev=[], pv=[]; let trend=0, hi=null, lo=null, pH=null, pL=null;
  for(let k=0;k<N;k++){ const p=k-sw;
    if(p>=sw){ const h=R[p].h, l=R[p].l; let isH=true, isL=true;
      for(let q=p-sw;q<=p+sw&&(isH||isL);q++){ if(q===p) continue; if(q<p){ if(R[q].h>=h) isH=false; if(R[q].l<=l) isL=false; } else { if(R[q].h>h) isH=false; if(R[q].l<l) isL=false; } }
      if(isH){ hi={v:h,i:p,x:false,t:R[p].t}; pv.push({i:p,t:R[p].t,ck:R[k].t+sec,ci:k,dir:1,v:h,lab:pH==null?'H':(h>pH?'HH':'LH')}); pH=h; }
      if(isL){ lo={v:l,i:p,x:false,t:R[p].t}; pv.push({i:p,t:R[p].t,ck:R[k].t+sec,ci:k,dir:-1,v:l,lab:pL==null?'L':(l>pL?'HL':'LL')}); pL=l; } }
    const b=R[k], upB=hi&&!hi.x&&(wick?b.h>hi.v:b.c>hi.v), dnB=lo&&!lo.x&&(wick?b.l<lo.v:b.c<lo.v);
    const order=upB&&dnB?(b.c>=b.o?[1,-1]:[-1,1]):upB?[1]:dnB?[-1]:[];
    order.forEach(d=>{ const L=d>0?hi:lo, O=d>0?lo:hi, kind=trend===0?'INIT':(trend===d?'BOS':'CHOCH');
      ev.push({k,t:b.t,tc:b.t+sec,dir:d,kind,lv:L.v,lvI:L.i,lvT:R[L.i].t,leg:O?Math.abs(L.v-O.v):0,c:b.c}); L.x=true; trend=d; }); }
  let devH=null, devL=null;
  if(hi){ let m=-Infinity, mi=-1; for(let q=hi.i+1;q<N;q++) if(R[q].h>m){ m=R[q].h; mi=q; } if(mi>=0) devH={v:m,i:mi,t:R[mi].t}; }
  if(lo){ let m=Infinity, mi=-1; for(let q=lo.i+1;q<N;q++) if(R[q].l<m){ m=R[q].l; mi=q; } if(mi>=0) devL={v:m,i:mi,t:R[mi].t}; }
  return {ev,pv,trend,hi,lo,devH,devL}; }
// HTF fair value gaps and order blocks (confluence zones). A zone is known from the close of the candle that formed it and ends when a later HTF candle closes through its far side.
function mtsZones(rH,Hs,eh){ const N=rH.length, atr=mtsAtr(rH,14), z=[], from=Math.max(2,N-700);
  for(let i=from;i<N;i++){ const a=atr[i], tol=(isFinite(a)?a:0)*0.1;
    if(rH[i-2].h<rH[i].l&&rH[i].l-rH[i-2].h>tol) z.push({dir:1,kind:'FVG',lo:rH[i-2].h,hi:rH[i].l,t0:rH[i-1].t,tc:rH[i].t+Hs,end:Infinity,j:i});
    else if(rH[i-2].l>rH[i].h&&rH[i-2].l-rH[i].h>tol) z.push({dir:-1,kind:'FVG',lo:rH[i].h,hi:rH[i-2].l,t0:rH[i-1].t,tc:rH[i].t+Hs,end:Infinity,j:i}); }
  eh.ev.forEach(e=>{ if(e.kind==='INIT'||e.k<from) return; for(let j=e.k-1;j>=Math.max(0,e.lvI,e.k-30);j--){ const b=rH[j]; if(e.dir>0?b.c<b.o:b.c>b.o){ z.push({dir:e.dir,kind:'OB',lo:b.l,hi:b.h,t0:b.t,tc:e.tc,end:Infinity,j:e.k}); break; } } });
  z.forEach(q=>{ for(let m=q.j+1;m<N;m++){ if(q.dir>0?rH[m].c<q.lo:rH[m].c>q.hi){ q.end=rH[m].t+Hs; break; } } });
  z.sort((a,b)=>a.tc-b.tc); return z; }
// everything that does not depend on the filter switches (so the filter test can re-run the signals cheaply)
function mtsCtx(p,rH,rE,H,E){
  const bosMode=p.mode===MTS_MODE[0], wick=p.brk===MTS_BRK[1];
  const swN=p.swing==='Custom'?mtsC(Math.round(+p.swingC)||5,1,30):(+p.swing||5), swE=(+p.eSwing>0)?mtsC(Math.round(+p.eSwing),1,30):swN;
  const eh=mtsEngine(rH,swN,wick,H[2]), ee=mtsEngine(rE,swE,wick,E[2]);
  // HTF bias timeline for the selected mode (BOS mode: only a BOS sets it, a CHOCH makes it neutral; CHOCH mode: only a CHOCH sets it)
  const bias=[{tc:-Infinity,bias:0,from:0,ev:null}]; let cur=0;
  eh.ev.forEach(e=>{ let nb=cur; if(bosMode){ nb=e.kind==='BOS'?e.dir:0; } else { if(e.kind==='CHOCH') nb=e.dir; else if(e.kind==='INIT') nb=0; }
    if(nb!==cur){ bias.push({tc:e.tc,bias:nb,from:cur,ev:e}); cur=nb; } });
  const AL=mtsC(Math.round(+p.atrLen)||14,2,100), atr=mtsAtr(rE,AL), N=rE.length, ps=new Float64Array(N+1), vps=new Float64Array(N+1);
  for(let i=0;i<N;i++){ ps[i+1]=ps[i]+(isFinite(atr[i])?atr[i]:0); vps[i+1]=vps[i]+(rE[i].v||0); }
  const lowV=new Array(N).fill(null), highV=new Array(N).fill(null); { let pi=0, cl=null, ch=null; for(let j=0;j<N;j++){ while(pi<ee.pv.length&&ee.pv[pi].ci<=j){ const q=ee.pv[pi++]; if(q.dir>0) ch=q.v; else cl=q.v; } lowV[j]=cl; highV[j]=ch; } }
  return {bosMode,H,E,rH,rE,eh,ee,bias,atr,ps,vps,hasVol:vps[N]>0,ema:mtsEma(rH,mtsC(Math.round(+p.emaLen)||200,2,500)),lowV,highV,
    chochTc:eh.ev.filter(e=>e.kind==='CHOCH').map(e=>e.tc),zones:mtsZones(rH,H[2],eh),swN,swE}; }
const MTS_W={body:1,sweep:1.5,pd:1,chop:1,room:1.5,ema:1,vol:1,sess:0.5,fresh:1,zone:1.5,swing:1,atr:0.5};
// signals + stop / targets + quality score for one set of switches
function mtsSignals(p,X){ const {rE,H,E,ee,eh,atr,bias,ps,vps,hasVol,ema,lowV,highV,chochTc,zones}=X, N=rE.length, Hs=H[2], Es=E[2], need=X.bosMode?'BOS':'CHOCH';
  const cool=Math.max(0,Math.round(+p.cool)||0), mSw=Math.max(0,+p.minSwAtr||0), mBd=Math.max(0,+p.minBodyAtr||0), aM=Math.max(0,+p.atrMult||0), vM=Math.max(0,+p.volMult||0), look=Math.max(1,Math.round(+p.sweepLook)||20),
    pdL=mtsC((+p.pdLevel||50)/100,0.05,1), chN=Math.max(1,Math.round(+p.chopN)||30), chMax=Math.max(1,Math.round(+p.chopMax)||2), roomR=Math.max(0,+p.roomR||0), fN=Math.max(1,Math.round(+p.freshN)||12), zTol=Math.max(0,+p.zoneTol||0),
    slB=Math.max(0,+p.slBuf||0), slMax=Math.max(0,+p.slMax||0), minSc=mtsC(+p.minScore||0,0,100), win=mtsSessWin(p), retest=p.entryMode===MTS_ENTRY[1], rBars=Math.max(1,Math.round(+p.retestBars)||12), rTol=Math.max(0,+p.retestTol||0),
    tp1R=Math.max(0.1,+p.tp1R||1), tp2R=Math.max(0.1,+p.tp2R||2), tp3R=Math.max(0.1,+p.tp3R||3), structTp=p.tpMode===MTS_TP[1];
  const atrAvg=k=>{ const a=Math.max(0,k-49); return (ps[k+1]-ps[a])/(k+1-a); };
  const volRatio=k=>{ const a=Math.max(0,k-20), n=k-a; if(n<5) return NaN; const av=(vps[k]-vps[a])/n; return av>0?(rE[k].v||0)/av:NaN; };
  const sweepOK=(k,d)=>{ for(let j=Math.max(1,k-look);j<=k;j++){ const ref=(d>0?lowV:highV)[j-1]; if(ref==null) continue; if(d>0?(rE[j].l<ref&&rE[j].c>ref):(rE[j].h>ref&&rE[j].c<ref)) return true; } return false; };
  const cands=[];
  ee.ev.forEach(e=>{ if(e.kind!==need) return; const k=e.k, d=e.dir, bar=rE[k], a=atr[k];
    if(p.reqEnt&&(d>0?bar.c<=bar.o:bar.c>=bar.o)) return;      // break candle must close in the signal direction
    if(p.minSw&&isFinite(a)&&e.leg<mSw*a) return;
    if(p.minBody&&isFinite(a)&&Math.abs(bar.c-bar.o)<mBd*a) return;
    if(p.atrOn&&isFinite(a)&&a<aM*atrAvg(k)) return;
    if(p.volOn&&hasVol){ const vr=volRatio(k); if(isFinite(vr)&&vr<vM) return; }
    if(p.sweepOn&&!sweepOK(k,d)) return;
    let sk=k;
    if(retest){ sk=-1; const tol=rTol*(isFinite(a)?a:0); for(let j=k+1;j<N&&j<=k+rBars;j++){ const z=rE[j];
        if(d>0?z.c<e.lv-tol:z.c>e.lv+tol) break;               // the break failed: price closed back through the level
        if(d>0?(z.l<=e.lv+tol&&z.c>e.lv):(z.h>=e.lv-tol&&z.c<e.lv)){ sk=j; break; } }
      if(sk<0) return; }
    cands.push({e,d,k:sk,ek:k}); });
  cands.sort((x,y)=>x.k-y.k||x.ek-y.ek);
  const sig=[]; let bi=0, lastDir=0, lastK=-1e9;
  cands.forEach(cd=>{ const e=cd.e, d=cd.d, k=cd.k, bar=rE[k], tc=bar.t+Es, en=bar.c, a0=atr[k], a=isFinite(a0)?a0:(Math.abs(bar.h-bar.l)||en*0.001);
    while(bi+1<bias.length&&bias[bi+1].tc<=tc) bi++; const b=bias[bi].bias;
    if(b!==0&&b!==d) return;                                   // never against the HTF bias
    if(b===0&&(p.reqHtf||p.ignNeu)) return;                    // neutral structure
    if(p.noDup&&lastDir===d) return;
    if(cool>0&&k-lastK<cool) return;
    // stop: beyond the last confirmed entry swing on the other side (else the lowest / highest of the last 6 candles)
    let sl=null; { const u=mtsUpTo(ee.pv,'ci',k); for(let q=u-1;q>=0&&q>u-80;q--){ const z=ee.pv[q]; if(z.dir===-d&&(en-z.v)*d>0){ sl=z.v-d*slB*a; break; } }
      if(sl==null){ let m=d>0?Infinity:-Infinity; for(let j=Math.max(0,k-5);j<=k;j++) m=d>0?Math.min(m,rE[j].l):Math.max(m,rE[j].h); sl=m-d*slB*a; } }
    let risk=(en-sl)*d; if(!(risk>0)){ sl=en-d*a; risk=a; }
    if(slMax>0&&risk>slMax*a) return;
    // HTF context at the signal time (only what was confirmed by then)
    const hp=eh.pv, u=mtsUpTo(hp,'ck',tc); let hiV=null, loV=null, tgt=null;
    for(let q=u-1;q>=0&&q>u-80&&(hiV==null||loV==null);q--){ if(hp[q].dir>0){ if(hiV==null) hiV=hp[q].v; } else if(loV==null) loV=hp[q].v; }
    for(let q=u-1;q>=0&&q>u-150;q--){ const z=hp[q]; if(z.dir===d&&(z.v-en)*d>0&&(tgt==null||(z.v-tgt)*d<0)) tgt=z.v; }
    const pos=(hiV!=null&&loV!=null&&hiV>loV)?(en-loV)/(hiV-loV):null, pdOK=pos==null?null:(d>0?pos<=pdL:pos>=1-pdL);
    const m1=chochTc.length?mtsUpTo(chochTc.map(x=>({t:x})),'t',tc)-mtsUpTo(chochTc.map(x=>({t:x})),'t',tc-chN*Hs):0, chopOK=m1<chMax;
    const hb=mtsLastClosed(X.rH,Hs,tc), em=hb>=0?ema[hb]:NaN, emaOK=isFinite(em)?(d>0?en>em:en<em):null;
    const mn=Math.floor(tc/60)%1440, sessOK=mtsInSess(mn,win||MTS_SESSW['London + New York']);
    const bt=bias[bi].tc, freshOK=(b!==0&&isFinite(bt))?(tc-bt<=fN*Hs):null;
    const zoneOK=zones.some(z=>z.dir===d&&z.tc<=tc&&z.end>tc&&bar.l<=z.hi+zTol*a&&bar.h>=z.lo-zTol*a);
    const roomOK=tgt==null?null:((tgt-en)*d>=(roomR||1.5)*risk), vr=hasVol?volRatio(k):NaN, volOK=isFinite(vr)?vr>=(vM||1.2):null;
    if(p.pdOn&&pdOK===false) return; if(p.chopOn&&!chopOK) return; if(p.roomOn&&tgt!=null&&(tgt-en)*d<roomR*risk) return; if(p.emaOn&&emaOK===false) return;
    if(win&&!sessOK) return; if(p.freshOn&&freshOK===false) return; if(p.zoneOn&&!zoneOK) return;
    // quality score 0-100: every factor that can be evaluated counts, whether its filter is switched on or not
    const F={body:Math.abs(bar.c-bar.o)>=(p.minBody?mBd:0.5)*a,sweep:sweepOK(cd.ek,d),pd:pdOK,chop:chopOK,room:roomOK,ema:emaOK,vol:volOK,sess:sessOK,fresh:freshOK,zone:zoneOK,swing:e.leg>=a,atr:isFinite(a0)?a0>=0.8*atrAvg(k):null};
    let sw=0, sp=0; for(const n in F){ if(F[n]==null) continue; sw+=MTS_W[n]; if(F[n]) sp+=MTS_W[n]; } const q=sw>0?Math.round(100*sp/sw):0;
    if(minSc>0&&q<minSc) return;
    // targets
    let t1=en+d*risk*tp1R, t2=en+d*risk*tp2R, t3=en+d*risk*tp3R;
    if(structTp&&tgt!=null&&(tgt-en)*d>=risk*(tp1R+0.25)) t2=tgt; if((t3-t2)*d<=0) t3=t2+d*risk*0.5; if((t2-t1)*d<=0) t2=t1+d*risk*0.5;
    lastDir=d; lastK=k;
    sig.push({dir:d,kind:e.kind,k,t:bar.t,tc,price:en,bias:b,biasTc:bt,lv:e.lv,lvT:e.lvT,leg:e.leg,sl,risk,tps:[t1,t2,t3],R:[t1,t2,t3].map(v=>(v-en)*d/risk),tgt,q,F,retest:k!==cd.ek}); });
  sig.forEach(s=>mtsSim(rE,s,p,Es));
  return {sig,st:mtsStats(sig)}; }
// backtest of one trade: stop first if SL and a target sit in the same candle, partial exits, break-even after TP1, costs in R
function mtsSim(rE,s,p,Es){ const d=s.dir, en=s.price, risk=s.risk, N=rE.length; let f=[Math.max(0,+p.p1||0),Math.max(0,+p.p2||0),Math.max(0,+p.p3||0)]; const sm=f[0]+f[1]+f[2]; f=sm>0?f.map(x=>x/sm):[0,0,1];
  let stop=s.sl, rem=1, rs=0, tp=0, res='open', end=s.k; const hit=[0,0,0];
  for(let m=s.k+1;m<N;m++){ const z=rE[m]; end=m;
    if(d>0?z.l<=stop:z.h>=stop){ rs+=rem*((stop-en)*d/risk); rem=0; res=Math.abs(stop-en)<1e-12?'be':'sl'; break; }
    let nb=null; for(let u=0;u<3;u++){ if(!hit[u]&&(d>0?z.h>=s.tps[u]:z.l<=s.tps[u])){ hit[u]=1; rs+=f[u]*((s.tps[u]-en)*d/risk); rem-=f[u]; tp=u+1; if(u===0&&p.be) nb=en; } }
    if(rem<=1e-9||hit[2]){ rem=0; res='tp'+tp; break; }
    if(nb!=null) stop=nb; }
  s.tp=tp; s.end=end; s.endT=rE[end].t+Es; s.res=res; s.rs=rs;
  const cost=((Math.max(0,+p.costPct||0))/100*en)/risk; s.rr=res==='open'?null:rs-cost; }
function mtsStats(sig){ const cl=sig.filter(s=>s.res!=='open'), ord=cl.slice().sort((a,b)=>a.end-b.end); let eq=0,pk=0,mdd=0,gp=0,gl=0,w=0;
  ord.forEach(s=>{ eq+=s.rr; if(eq>pk) pk=eq; mdd=Math.max(mdd,pk-eq); if(s.rr>0){ w++; gp+=s.rr; } else gl-=s.rr; });
  const sub=a=>{ const n=a.length, ww=a.filter(s=>s.rr>0).length; return {n,wr:n?ww/n*100:0,net:a.reduce((x,s)=>x+s.rr,0)}; };
  return {n:cl.length,open:sig.length-cl.length,w,wr:cl.length?w/cl.length*100:0,avgR:cl.length?eq/cl.length:0,netR:eq,pf:gl>0?gp/gl:(gp>0?Infinity:0),mdd,buy:sub(cl.filter(s=>s.dir>0)),sell:sub(cl.filter(s=>s.dir<0))}; }
const MTS_AB=[['Strong candle body','minBody'],['Min swing size','minSw'],['ATR volatility','atrOn'],['Liquidity sweep','sweepOn'],['Premium / discount','pdOn'],['Chop filter','chopOn'],['Room to move','roomOn'],['Retest entry','@entry'],['HTF EMA side','emaOn'],['Volume','volOn'],['Session','@sess'],['Fresh bias','freshOn'],['HTF zone','zoneOn'],['No duplicates','noDup'],['Entry candle','reqEnt']];
const mtsIsOn=(p,k)=>k==='@entry'?p.entryMode===MTS_ENTRY[1]:k==='@sess'?p.sess!=='Off':!!p[k];
function mtsToggle(p,k){ const q=Object.assign({},p); if(k==='@entry') q.entryMode=p.entryMode===MTS_ENTRY[1]?MTS_ENTRY[0]:MTS_ENTRY[1]; else if(k==='@sess') q.sess=p.sess==='Off'?'London + New York':'Off'; else q[k]=!p[k]; return q; }
function mtsCompute(p,rH,rE,H,E,opt){
  const X=mtsCtx(p,rH,rE,H,E), R=mtsSignals(p,X), sig=R.sig, eh=X.eh, ee=X.ee;
  const ev=[]; sig.forEach(s=>ev.push({type:'sig',dir:s.dir,kind:s.kind,tc:s.tc,price:s.price,bias:s.bias,sl:s.sl,tp1:s.tps[0],q:s.q}));
  eh.ev.forEach(e=>ev.push({type:'htf',dir:e.dir,kind:e.kind,tc:e.tc,price:e.c}));
  X.bias.slice(1).forEach(x=>ev.push({type:'bias',dir:x.bias,from:x.from,tc:x.tc,price:x.ev?x.ev.c:0})); ev.sort((a,b)=>a.tc-b.tc);
  const lastH=eh.ev.length?eh.ev[eh.ev.length-1]:null, curBias=X.bias[X.bias.length-1].bias, ls=sig.length?sig[sig.length-1]:null;
  let ab=null; if(p.cmpOn&&!(opt&&opt.light)){ ab=MTS_AB.map(f=>{ const on=mtsIsOn(p,f[1]), r=mtsSignals(mtsToggle(p,f[1]),X); return {name:f[0],on,st:r.st}; }); }
  return {ok:true,bosMode:X.bosMode,H,E,swN:X.swN,swE:X.swE,eh,ee,bias:X.bias,curBias,sig,ev,lastH,ls,entTrend:ee.trend,st:R.st,ab,zones:X.zones,nH:rH.length,nE:rE.length}; }
let mtsMem=null;
function mtsGet(c,p){ const N=c.length, civ=mtsIv(c); if(N<20||!civ) return {ok:false,msg:'MTF Structure Signals: waiting for chart data'};
  const H=mtsPick(MTS_HTF,p.htf,3), E=mtsPick(MTS_ENT,p.etf,3);
  if(H[2]<=E[2]) return {ok:false,H,E,msg:'MTF Structure Signals: the higher timeframe must be larger than the entry timeframe'};
  const sH=mtsSrc(c,civ,H[1],c[0].time-90*H[2],3), sE=mtsSrc(c,civ,E[1],c[0].time-50*E[2],8);
  if(sH.kind==='wait'||sE.kind==='wait') return {ok:false,H,E,loading:!(sH.err||sE.err),msg:(sH.err||sE.err)?'MTF Structure Signals: candles for the selected timeframes could not be loaded (retrying)':'MTF Structure Signals: loading higher and entry timeframe candles\u2026'};
  const key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+sH.kind+sH.ver+'|'+sE.kind+sE.ver; if(mtsMem&&mtsMem.k===key) return mtsMem.D;
  let D; try{ const rH=mtsBuild(sH,c), rE=mtsBuild(sE,c);
    if(rH.length<20||rE.length<20) D={ok:false,H,E,msg:'MTF Structure Signals: not enough closed candles on the selected timeframes yet'}; else D=mtsCompute(p,rH,rE,H,E); }
  catch(e){ console.error('mts calc failed',e); D={ok:false,H,E,msg:'MTF Structure Signals calculation error: '+(e&&e.message)}; }
  mtsMem={k:key,D}; return D; }
// ---------- scanner: the same logic on other markets (their own klines, refreshed slowly), shows which ones have a fresh signal ----------
const mtsSM={};
function mtsScan(p){ const H=mtsPick(MTS_HTF,p.htf,3), E=mtsPick(MTS_ENT,p.etf,3); if(H[2]<=E[2]) return [];
  const list=Array.from(new Set(String(p.scanSyms||'').toUpperCase().split(/[\s,;]+/).filter(Boolean))).slice(0,12), nowS=Date.now()/1000, fresh=Math.max(1,Math.round(+p.scanFresh)||6)*E[2], out=[];
  const bH=MTS_BASE[H[1]]||H[1], bE=MTS_BASE[E[1]]||E[1];
  list.forEach(sy=>{ const dH=mtsLoad(sy,bH,nowS-300*H[2],1,45000), dE=mtsLoad(sy,bE,nowS-1500*E[2],2,45000);
    if(!dH.rows.length||!dE.rows.length){ out.push({sy,state:dH.err||dE.err?'err':'load'}); return; }
    const key=JSON.stringify(p)+'|'+dH.ver+'|'+dE.ver; let m=mtsSM[sy]; if(!m||m.k!==key){ let D=null; try{ const rH=mtsBuild({kind:'feed',sec:H[2],code:H[1],base:bH,d:dH},[]), rE=mtsBuild({kind:'feed',sec:E[2],code:E[1],base:bE,d:dE},[]); if(rH.length>=20&&rE.length>=20) D=mtsCompute(Object.assign({},p,{cmpOn:false}),rH,rE,H,E,{light:1}); }catch(e){ D=null; } m=mtsSM[sy]={k:key,D}; }
    if(!m.D){ out.push({sy,state:'load'}); return; } const ls=m.D.ls; out.push({sy,state:'ok',bias:m.D.curBias,ls:ls?{dir:ls.dir,kind:ls.kind,tc:ls.tc,price:ls.price,q:ls.q}:null,age:ls?nowS-ls.tc:Infinity,fresh:!!ls&&nowS-ls.tc<=fresh}); });
  out.sort((a,b)=>(b.fresh?1:0)-(a.fresh?1:0)||(a.age||1e12)-(b.age||1e12)); return out; }
// chart coordinates of everything that is drawn (chart candle indexes), rebuilt only when the data or the chart length changes
let mtsVM=null;
function mtsMap(D,c,p){ const N=c.length, key=(D.__id||(D.__id=Math.random()))+'|'+N+'|'+c[0].time+'|'+c[N-1].time+'|'+p.keep+'|'+p.trKeep; if(mtsVM&&mtsVM.k===key) return mtsVM.V;
  const V={N,piv:[],evs:[],bias:[],dev:[],act:[],sig:[],ent:[],tr:[],zn:[]}, Hs=D.H[2], Es=D.E[2], keep=Math.max(3,Math.round(+p.keep)||25), t0=c[0].time;
  D.eh.pv.slice(-keep*2).forEach(q=>{ if(q.t+Hs<t0) return; const i=mtsExt(c,q.t,q.t+Hs,q.dir>0,q.v); if(i>=0) V.piv.push({i,dir:q.dir,v:q.v,lab:q.lab}); });
  D.eh.ev.slice(-keep).forEach(e=>{ const i1=mtsIdx(c,e.tc-1); if(i1<0) return; let i0=mtsExt(c,e.lvT,e.lvT+Hs,e.dir>0,e.lv); if(i0<0) i0=0; V.evs.push({i0,i1,dir:e.dir,kind:e.kind,v:e.lv}); });
  const ba=D.bias; for(let k=0;k<ba.length;k++){ const a=ba[k].tc===-Infinity?0:Math.max(0,mtsIdx(c,ba[k].tc-1)), z=k+1<ba.length?mtsIdx(c,ba[k+1].tc-1):N-1; if(z>=0&&z>=a) V.bias.push({i0:a,i1:z,b:ba[k].bias}); }
  [['hi',1],['lo',-1]].forEach(([n,d])=>{ const L=D.eh[n]; if(L&&!L.x){ const i=mtsExt(c,L.t,L.t+Hs,d>0,L.v); V.act.push({i:i<0?0:i,dir:d,v:L.v}); } });
  [['devH',1],['devL',-1]].forEach(([n,d])=>{ const L=D.eh[n]; if(L){ const i=mtsExt(c,L.t,L.t+Hs,d>0,L.v); if(i>=0) V.dev.push({i,dir:d,v:L.v}); } });
  D.sig.slice(-300).forEach(s=>{ const i=mtsIdx(c,s.tc-1); if(i<0) return; V.sig.push({i,dir:s.dir,kind:s.kind,price:s.price,bias:s.bias,tc:s.tc,q:s.q,retest:s.retest});
    const i0=mtsIdx(c,s.lvT); V.ent.push({i0:i0<0?0:i0,i1:i,dir:s.dir,kind:s.kind,v:s.lv}); });
  D.sig.slice(-Math.max(1,Math.round(+p.trKeep)||6)).forEach(s=>{ const i0=mtsIdx(c,s.tc-1); if(i0<0) return; const i1=s.res==='open'?N-1:Math.max(i0,mtsIdx(c,s.endT-1)); V.tr.push({i0,i1,dir:s.dir,en:s.price,sl:s.sl,tps:s.tps,R:s.R,res:s.res,rr:s.rr,tp:s.tp}); });
  D.zones.filter(z=>z.end===Infinity||z.end>t0).slice(-24).forEach(z=>{ const i0=Math.max(0,mtsIdx(c,z.t0)), i1=z.end===Infinity?N-1:mtsIdx(c,z.end-1); if(i1>=0&&i1>=i0) V.zn.push({i0,i1,dir:z.dir,kind:z.kind,lo:z.lo,hi:z.hi,open:z.end===Infinity}); });
  mtsVM={k:key,V}; return V; }
IND.mts={label:'MARKETPLUSVIEW \u2014 MTF STRUCTURE SIGNALS',title:'MARKETPLUSVIEW \u2014 MTF STRUCTURE SIGNALS \u00b7 higher-timeframe BOS / CHOCH bias + entry-timeframe BUY / SELL',cat:'Premium Strategy',nm:p=>'MTF Structure '+(p&&p.mode===MTS_MODE[1]?'CHOCH':'BOS'),p:Object.assign({},MTS_DEF),cols:['#26a69a'],
  fields:[['mode','sel','STRATEGY MODE (main setting - only the selected one runs)',{opts:MTS_MODE}],['htf','sel','Higher structure timeframe',{opts:MTS_HTF.map(x=>x[0])}],['etf','sel','Entry timeframe',{opts:MTS_ENT.map(x=>x[0])}],
    ['swing','sel','Swing sensitivity (candles each side of a swing)',{opts:MTS_SW}],['swingC','num','Custom swing sensitivity (used when Custom)',{min:1,max:30,step:1}],['eSwing','num','Entry swing override (0 = same as above)',{min:0,max:30,step:1}],['brk','sel','Break confirmation',{opts:MTS_BRK}],
    ['entryMode','sel','Entry type',{opts:MTS_ENTRY}],['retestBars','num','Retest: max candles to wait',{min:1,max:100,step:1}],['retestTol','num','Retest tolerance (x ATR around the broken level)',{min:0,max:3,step:0.05}],
    ['reqHtf','chk','Require higher timeframe confirmation (HTF bias must exist and match)'],['reqEnt','chk','Require entry confirmation candle (break candle closes in the signal direction)'],['noDup','chk','Prevent duplicate signals in the same direction'],['cool','num','Signal cooldown (entry candles, 0 = off)',{min:0,max:500,step:1}],['ignNeu','chk','Ignore signals when HTF structure is neutral'],
    ['minBody','chk','Strong break candle (minimum body size filter)'],['minBodyAtr','num','Minimum break-candle body (x ATR)',{min:0,max:10,step:0.05}],['minSw','chk','Minimum swing size filter'],['minSwAtr','num','Minimum swing size (x ATR of the entry timeframe)',{min:0,max:20,step:0.1}],
    ['atrOn','chk','ATR volatility filter'],['atrMult','num','ATR must be at least (x its 50-candle average)',{min:0,max:5,step:0.05}],['atrLen','num','ATR length',{min:2,max:100,step:1}],
    ['sweepOn','chk','Liquidity sweep first (entry swing taken out, then closed back, before the break)'],['sweepLook','num','Sweep: look back (entry candles)',{min:1,max:200,step:1}],
    ['pdOn','chk','Premium / discount (BUY in the lower part, SELL in the upper part of the HTF range)'],['pdLevel','num','Premium / discount limit (% of the HTF range)',{min:5,max:100,step:5}],
    ['chopOn','chk','Chop filter (pause when the HTF keeps flipping)'],['chopN','num','Chop: look back (HTF candles)',{min:3,max:300,step:1}],['chopMax','num','Chop: pause at this many HTF CHOCH',{min:1,max:20,step:1}],
    ['roomOn','chk','Room to move (next HTF swing must be far enough)'],['roomR','num','Room: minimum distance (x risk)',{min:0.5,max:10,step:0.25}],
    ['emaOn','chk','HTF EMA side (BUY above, SELL below)'],['emaLen','num','HTF EMA length',{min:2,max:500,step:1}],['volOn','chk','Volume filter (break candle volume above average)'],['volMult','num','Volume: at least (x 20-candle average)',{min:0,max:10,step:0.1}],
    ['sess','sel','Session filter (UTC)',{opts:MTS_SESS}],['sessHrs','txt','Custom session hours UTC (e.g. 0700-1600)'],['freshOn','chk','Fresh bias window (HTF bias must be recent)'],['freshN','num','Fresh bias: max HTF candles since the bias event',{min:1,max:500,step:1}],
    ['zoneOn','chk','HTF zone (entry candle must touch an active HTF order block / FVG of the same side)'],['zoneTol','num','Zone tolerance (x ATR)',{min:0,max:3,step:0.05}],['minScore','num','Minimum quality score 0-100 (0 = off)',{min:0,max:100,step:5}],
    ['slBuf','num','Stop loss buffer beyond the entry swing (x ATR)',{min:0,max:5,step:0.05}],['slMax','num','Skip the signal if the stop is wider than (x ATR, 0 = off)',{min:0,max:50,step:0.5}],['tpMode','sel','Take profit mode',{opts:MTS_TP}],['tp1R','num','TP1 (x risk)',{min:0.1,max:20,step:0.25}],['tp2R','num','TP2 (x risk)',{min:0.1,max:20,step:0.25}],['tp3R','num','TP3 (x risk)',{min:0.1,max:30,step:0.25}],
    ['p1','num','Backtest: close at TP1 (%)',{min:0,max:100,step:5}],['p2','num','Backtest: close at TP2 (%)',{min:0,max:100,step:5}],['p3','num','Backtest: close at TP3 (%)',{min:0,max:100,step:5}],['be','chk','Backtest: stop to break-even after TP1'],['costPct','num','Backtest: costs per trade (% of price, round trip)',{min:0,max:5,step:0.005}],
    ['showSw','chk','Show HTF swing highs / lows'],['showLvl','chk','Show active (unbroken) HTF swing levels'],['showBos','chk','Show BOS lines and labels'],['showChoch','chk','Show CHOCH lines and labels'],['showBias','chk','Show HTF bias strip'],['showEnt','chk','Show entry timeframe confirmation'],['showSig','chk','Show BUY / SELL signals'],['showDev','chk','Show developing (unconfirmed) swings'],
    ['showZones','chk','Show HTF order blocks / FVG zones'],['showRisk','chk','Show stop loss and TP1-TP3 lines'],['trKeep','num','Trades with SL / TP lines drawn (latest)',{min:1,max:50,step:1}],['detail','sel','Signal label',{opts:MTS_DET}],['keep','num','HTF events to draw',{min:3,max:200,step:1}],
    ['showDash','chk','Dashboard'],['dpos','sel','Dashboard position',{opts:MTS_POS}],['showBt','chk','Backtest panel (estimate)'],['bpos','sel','Backtest panel position',{opts:MTS_POS}],['cmpOn','chk','Filter test panel (each filter switched on / off)'],['cpos','sel','Filter test position',{opts:MTS_POS}],
    ['scanOn','chk','Multi-symbol scanner'],['scanSyms','txt','Scanner symbols (comma separated, up to 12)'],['scanFresh','num','Scanner: a signal is fresh for (entry candles)',{min:1,max:200,step:1}],['spos','sel','Scanner position',{opts:MTS_POS}],
    ['cBull','col','Bullish colour'],['cBear','col','Bearish colour'],['cNeu','col','Neutral colour'],
    ['alBosBuy','chk','Alert: Bullish BOS BUY'],['alBosSell','chk','Alert: Bearish BOS SELL'],['alChochBuy','chk','Alert: Bullish CHOCH BUY'],['alChochSell','chk','Alert: Bearish CHOCH SELL'],['alHtfBull','chk','Alert: HTF bullish structure'],['alHtfBear','chk','Alert: HTF bearish structure'],['alBias','chk','Alert: HTF bias change'],['alNew','chk','Alert: any new entry signal'],['alScan','chk','Alert: fresh signal on a scanner symbol'],['alSound','chk','Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},MTS_DEF,p), D=mtsGet(c,q), V=D.ok&&c.length?mtsMap(D,c,q):null, S=q.scanOn?mtsScan(q):null; return {mk:[],boxes:[{type:'mtsview',pts:[],o:q,D,V,S}],labels:[],events:D.ok?D.ev:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='mtsview') return _D.apply(this,arguments);
    const p=d.o, D=d.D, V=d.V, S=d.S, N=candles.length; if(!D||!N) return;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.font='10px system-ui,sans-serif'; cx.textBaseline='middle'; cx.setLineDash([]);
    const col=dr=>dr>0?p.cBull:dr<0?p.cBear:p.cNeu, g=p.cBull, r=p.cBear, nz='#9aa3b5';
    const pill=(t,x,y,bg,al,fg,fs)=>{ cx.font=(fs||'bold 9px system-ui,sans-serif'); const w=cx.measureText(t).width+8; let lx=al==='r'?x-w:al==='c'?x-w/2:x; if(lx+w>W-2) lx=W-w-2; if(lx<2) lx=2; cx.fillStyle=bg; cx.beginPath(); if(cx.roundRect) cx.roundRect(lx,y-7,w,14,3); else cx.rect(lx,y-7,w,14); cx.fill(); cx.fillStyle=fg||'#fff'; cx.textAlign='left'; cx.fillText(t,lx+4,y); return w; };
    const hl=(x0,x1,y,cl,lw,dash)=>{ cx.strokeStyle=cl; cx.lineWidth=lw; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]); };
    const used={}; const panel=(title,rows,pos,tint)=>{ const rh=15; cx.font='bold 10px system-ui,sans-serif'; let w0=cx.measureText(title).width-60, w1=0; cx.font='10px system-ui,sans-serif'; rows.forEach(q=>{ w0=Math.max(w0,cx.measureText(q[0]).width); w1=Math.max(w1,cx.measureText(String(q[1])).width); });
      cx.font='bold 10px system-ui,sans-serif'; const tw=Math.min(W-16,Math.max(w0+w1+30,cx.measureText(title).width+16)), th=rh*(rows.length+1), top=pos.indexOf('Top')===0, left=pos.indexOf('Left')>-1, off=used[pos]||0, tx=left?8:W-tw-8, ty=top?8+off:H-th-14-off; used[pos]=off+th+6;
      cx.fillStyle='rgba(12,16,26,.84)'; cx.fillRect(tx,ty,tw,th); cx.strokeStyle='rgba(120,130,150,.45)'; cx.lineWidth=1; cx.strokeRect(tx+.5,ty+.5,tw,th); cx.fillStyle=tint||'rgba(38,166,154,.22)'; cx.fillRect(tx,ty,tw,rh);
      cx.fillStyle='#fff'; cx.font='bold 10px system-ui,sans-serif'; cx.textAlign='left'; cx.fillText(title,tx+6,ty+rh/2+0.5); cx.font='10px system-ui,sans-serif';
      rows.forEach((q,k)=>{ const y=ty+rh*(k+1)+rh/2; cx.fillStyle='#b8c0d4'; cx.textAlign='left'; cx.fillText(q[0],tx+6,y); cx.fillStyle=q[2]||'#fff'; cx.textAlign='right'; cx.fillText(String(q[1]),tx+tw-6,y); }); };
    if(D.ok&&V&&V.N===N){ const c=candles; let bs=6; { const a=X(N-1), b=X(Math.max(0,N-2)); if(a!=null&&b!=null&&a!==b) bs=Math.abs(a-b); } const xr=(X(N-1)||W)+bs*4;
      // HTF bias strip (green / red / grey) along the bottom edge
      if(p.showBias) V.bias.forEach(s=>{ const x0=X(s.i0), x1=X(s.i1); if(x0==null||x1==null) return; const a=x0-bs/2, b=x1+bs/2; if(b<0||a>W) return; cx.fillStyle=mtsA(col(s.b),0.85); cx.fillRect(a,H-4,Math.max(1,b-a),4); });
      // HTF order blocks / fair value gaps
      if(p.showZones) V.zn.forEach(z=>{ const x0=X(z.i0), x1=X(z.i1), y0=Y(z.hi), y1=Y(z.lo); if(x0==null||x1==null||y0==null||y1==null) return; const a=x0-bs/2, b=Math.max(x1+bs/2,a+6); if(b<0||a>W) return; const cl=col(z.dir), top=Math.min(y0,y1), hh=Math.max(2,Math.abs(y1-y0));
        cx.fillStyle=mtsA(cl,z.open?0.14:0.07); cx.fillRect(a,top,b-a,hh); cx.strokeStyle=mtsA(cl,z.open?0.7:0.35); cx.lineWidth=1; cx.setLineDash(z.kind==='FVG'?[3,3]:[]); cx.strokeRect(a+.5,top+.5,b-a,hh); cx.setLineDash([]); cx.font='8px system-ui,sans-serif'; cx.fillStyle=mtsA(cl,1); cx.textAlign='left'; cx.fillText('HTF '+z.kind,Math.max(a+3,2),top+7); });
      // active (unbroken) HTF swing levels
      if(p.showLvl) V.act.forEach(a=>{ const x0=X(a.i), y=Y(a.v); if(x0==null||y==null) return; hl(x0,xr,y,mtsA(col(0),0.7),1,[2,4]); pill('HTF '+(a.dir>0?'swing high ':'swing low ')+mtsP(a.v),xr,y+(a.dir>0?-9:9),mtsA(col(0),0.75),'r','#fff','9px system-ui,sans-serif'); });
      // developing (not yet confirmed) swings - dotted and grey, they can still change until confirmed
      if(p.showDev) V.dev.forEach(a=>{ const x0=X(a.i), y=Y(a.v); if(x0==null||y==null) return; hl(x0,xr,y,mtsA(col(0),0.7),1,[1,3]); pill('developing '+(a.dir>0?'high':'low'),xr,y+(a.dir>0?-9:9),mtsA(col(0),0.45),'r','#e6e9ef','9px system-ui,sans-serif'); });
      // HTF swings (confirmed)
      if(p.showSw){ cx.font='9px system-ui,sans-serif'; cx.textAlign='center'; V.piv.forEach(q=>{ const x=X(q.i), y=Y(q.v); if(x==null||y==null||x<-10||x>W+10) return; cx.fillStyle=mtsA(col(0),0.95); cx.beginPath(); cx.arc(x,y,2.5,0,6.2832); cx.fill(); cx.fillStyle=mtsA('#cfd6e6',0.95); cx.fillText(q.lab,x,y+(q.dir>0?-9:9)); }); }
      // HTF BOS / CHOCH lines and labels
      V.evs.forEach(e=>{ const init=e.kind==='INIT'; if(init?!p.showBos:(e.kind==='BOS'?!p.showBos:!p.showChoch)) return; const x0=X(e.i0), x1=X(e.i1), y=Y(e.v); if(x0==null||x1==null||y==null||x1<-10||x0>W+10) return;
        const cl=init?col(0):col(e.dir); hl(x0,x1,y,cl,e.kind==='CHOCH'?1.8:1.3,e.kind==='CHOCH'?[]:[5,3]); pill((init?'BRK':e.kind)+(e.dir>0?' \u25b2':' \u25bc'),(x0+x1)/2,y+(e.dir>0?-9:9),mtsA(cl,0.9),'c'); });
      // entry timeframe confirmation (the entry structure break behind every signal)
      if(p.showEnt) V.ent.forEach(e=>{ const x0=X(e.i0), x1=X(e.i1), y=Y(e.v); if(x0==null||x1==null||y==null||x1<-10||x0>W+10) return; const cl=col(e.dir); hl(x0,x1,y,mtsA(cl,0.8),1,[2,2]); cx.font='8px system-ui,sans-serif'; cx.fillStyle=mtsA(cl,1); cx.textAlign='center'; cx.fillText('entry '+e.kind,(x0+x1)/2,y+(e.dir>0?-6:6)); });
      // stop loss and targets of the latest signals, with the backtest outcome
      if(p.showRisk) V.tr.forEach(t=>{ const x0=X(t.i0), x1r=X(t.i1); if(x0==null||x1r==null) return; const x1=Math.max(x1r,x0+14); if(x1<-60||x0>W+60) return; const yE=Y(t.en), ySL=Y(t.sl); if(yE==null) return;
        if(ySL!=null){ cx.fillStyle=mtsA(r,0.12); cx.fillRect(x0,Math.min(yE,ySL),x1-x0,Math.abs(ySL-yE)); } const yT=t.tps.map(Y); if(yT[2]!=null){ cx.fillStyle=mtsA(g,0.08); cx.fillRect(x0,Math.min(yE,yT[2]),x1-x0,Math.abs(yT[2]-yE)); }
        hl(x0,x1,yE,'rgba(255,255,255,.6)',1,[4,3]); const labs=[];
        if(ySL!=null){ hl(x0,x1,ySL,r,t.res==='sl'?2.2:1.2); labs.push({y:ySL,t:'SL '+mtsP(t.sl),c:r}); }
        t.tps.forEach((v,u)=>{ const y=Y(v); if(y==null) return; hl(x0,x1,y,g,t.tp>u?2.2:1.2,[4,3]); labs.push({y,t:'TP'+(u+1)+' '+mtsFR(t.R[u])+'R'+(t.tp>u?' \u2713':''),c:g}); });
        labs.sort((a,b)=>a.y-b.y); for(let k=1;k<labs.length;k++) if(labs[k].y-labs[k-1].y<14) labs[k].y=labs[k-1].y+14; labs.forEach(l=>pill(l.t,x1+3,l.y,mtsA(l.c,0.88),'l'));
        if(t.res!=='open'&&t.rr!=null){ const ok=t.rr>0, nm=t.res==='sl'?'SL':t.res==='be'?'BE':t.res.toUpperCase(); pill((ok?'\u2713 ':'\u2717 ')+nm+' '+(t.rr>=0?'+':'')+mtsFR(t.rr)+'R',x1+3,yE,ok?mtsA(g,0.95):mtsA(r,0.95),'l'); } });
      // BUY / SELL signals
      if(p.showSig){ const lastX={'1':-1e9,'-1':-1e9}, full=p.detail!==MTS_DET[1];
        V.sig.forEach(s=>{ const x=X(s.i); if(x==null||x<-40||x>W+40) return; const up=s.dir>0, bar=c[s.i], y0=Y(up?bar.low:bar.high); if(y0==null) return; const cl=col(s.dir), ay=up?y0+5:y0-5;
          cx.fillStyle=cl; cx.beginPath(); if(up){ cx.moveTo(x,ay); cx.lineTo(x-5,ay+10); cx.lineTo(x+5,ay+10); } else { cx.moveTo(x,ay); cx.lineTo(x-5,ay-10); cx.lineTo(x+5,ay-10); } cx.closePath(); cx.fill();
          const t1=(up?'BUY ':'SELL ')+mtsP(s.price)+' \u00b7 Q'+s.q, t2=mtsShort(D.E[1])+' \u00b7 HTF '+(s.bias>0?'\u25b2':s.bias<0?'\u25bc':'-')+' '+(D.bosMode?'BOS':'CHOCH')+(s.retest?' \u00b7 retest':'');
          cx.font='bold 9px system-ui,sans-serif'; const wl=Math.max(cx.measureText(t1).width,full?cx.measureText(t2).width:0)+10; if(x-lastX[s.dir]<wl+4) return; lastX[s.dir]=x;
          const h=full?26:14, top=up?ay+13:ay-13-h; let lx=x-wl/2; if(lx+wl>W-2) lx=W-wl-2; if(lx<2) lx=2;
          cx.fillStyle=cl; cx.beginPath(); if(cx.roundRect) cx.roundRect(lx,top,wl,h,3); else cx.rect(lx,top,wl,h); cx.fill(); cx.fillStyle='#fff'; cx.textAlign='left'; cx.font='bold 9px system-ui,sans-serif'; cx.fillText(t1,lx+5,top+7.5);
          if(full){ cx.font='8px system-ui,sans-serif'; cx.fillStyle='rgba(255,255,255,.92)'; cx.fillText(t2,lx+5,top+19.5); } }); }
      // dashboard
      if(p.showDash){ const bz=D.curBias, ls=D.ls, lh=D.lastH, et=D.entTrend, stat=ls&&bz===ls.dir?(ls.dir>0?'BUY':'SELL'):'WAIT', rows=[];
        rows.push(['Strategy',D.bosMode?'BOS':'CHOCH']); rows.push(['Higher TF',mtsShort(D.H[1])]); rows.push(['Entry TF',mtsShort(D.E[1])]);
        rows.push(['HTF Bias',bz>0?'BULLISH':bz<0?'BEARISH':'NEUTRAL',bz>0?g:bz<0?r:nz]);
        rows.push(['Last HTF Event',lh?(lh.kind==='INIT'?(lh.dir>0?'Bullish break (start)':'Bearish break (start)'):(lh.dir>0?'Bullish ':'Bearish ')+lh.kind):'-',lh?col(lh.dir):nz]);
        rows.push(['Entry Structure',et>0?'Bullish':et<0?'Bearish':'Waiting',et>0?g:et<0?r:nz]);
        rows.push(['Signal Status',stat,stat==='BUY'?g:stat==='SELL'?r:nz]);
        rows.push(['Last Signal',ls?(ls.dir>0?'BUY ':'SELL ')+mtsP(ls.price)+' \u00b7 '+mtsTime(ls.tc):'-',ls?col(ls.dir):nz]);
        rows.push(['Quality',ls?ls.q+' / 100':'-',ls?(ls.q>=70?g:ls.q>=45?'#f9a825':r):nz]); rows.push(['Stop / TP1',ls?mtsP(ls.sl)+' / '+mtsP(ls.tps[0]):'-']);
        panel('MARKETPLUSVIEW \u2014 MTF STRUCTURE',rows,p.dpos||'Top Right'); }
      if(p.showBt&&D.st){ const s=D.st, pf=s.pf===Infinity?'\u221e':s.pf.toFixed(2), f=v=>(v>=0?'+':'')+mtsFR(v);
        panel('Backtest (estimate)',[['Closed trades',s.n+(s.open?' (+'+s.open+' open)':'')],['Win rate',s.n?s.wr.toFixed(1)+' %':'-'],['Average R',s.n?f(s.avgR)+'R':'-',s.avgR>0?g:s.n?r:'#fff'],['Net R',s.n?f(s.netR)+'R':'-',s.netR>0?g:s.n?r:'#fff'],['Profit factor',s.n?pf:'-'],['Max drawdown',s.n?mtsFR(s.mdd)+'R':'-'],
          ['BUY',s.buy.n+' \u00b7 '+s.buy.wr.toFixed(0)+' % \u00b7 '+f(s.buy.net)+'R'],['SELL',s.sell.n+' \u00b7 '+s.sell.wr.toFixed(0)+' % \u00b7 '+f(s.sell.net)+'R'],[null,'on loaded candles, no promise','#9aa3b5']].filter(x=>x[0]!==null||x[1]).map(x=>x[0]===null?['',x[1],x[2]]:x),p.bpos||'Bottom Right','rgba(249,168,37,.22)'); }
      if(p.cmpOn&&D.ab){ const s=D.st, f=v=>(v>=0?'+':'')+mtsFR(v), line=t=>t.n+' \u00b7 '+(t.n?t.wr.toFixed(0):'-')+'% \u00b7 '+(t.n?f(t.avgR)+'R':'-'), rows=[['Current',line(s)]];
        D.ab.forEach(a=>rows.push([(a.on?'\u2212 ':'+ ')+a.name,line(a.st),a.st.n<10?'#9aa3b5':a.st.avgR>s.avgR+0.02?g:a.st.avgR<s.avgR-0.02?r:'#fff'])); rows.push(['','n \u00b7 win % \u00b7 avg R  (+ on / \u2212 off)','#9aa3b5']);
        panel('Filter test (estimate)',rows,p.cpos||'Bottom Left','rgba(41,98,255,.30)'); } }
    if(S&&S.length){ const rows=S.map(q=>{ const nm=q.sy.replace(/USDT$/,''); if(q.state!=='ok') return [nm,q.state==='err'?'no data':'loading\u2026',nz]; if(!q.ls) return [nm,(q.bias>0?'\u25b2':q.bias<0?'\u25bc':'-')+' no signal',nz]; return [nm,(q.ls.dir>0?'BUY ':'SELL ')+mtsAge(q.age)+(q.fresh?' \u2605':''),q.fresh?col(q.ls.dir):nz]; });
      panel('MTF scanner \u2605 = fresh',rows,p.spos||'Top Left','rgba(156,39,176,.30)'); }
    if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,H-14); }
    cx.restore(); }; }
// alerts: each confirmed event fires ONCE (when its candle has closed). Changing mode / timeframes / market re-baselines, so nothing old is replayed.
function mtsAlerts(q){ if(candles.length<2) return; const nowS=Date.now()/1000;
  inds.forEach(i=>{ if(i.t!=='mts'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},MTS_DEF,i.p), ev=i._xr.events, bx=i._xr.boxes&&i._xr.boxes[0], D=bx&&bx.D, S=bx&&bx.S; if(!D||!D.ok) return;
    const key=sym[0]+'|'+tf[0]+'|'+P.mode+'|'+P.htf+'|'+P.etf+'|'+P.swing+'|'+P.swingC+'|'+P.eSwing+'|'+P.brk+'|'+P.entryMode; let mx=0; ev.forEach(e=>{ if(e.tc>mx) mx=e.tc; });
    if(i._mtK!==key){ i._mtK=key; i._mtB=mx; i._scB={}; }
    const base=i._mtB||0; i._scB=i._scB||{}; const fresh=Math.max(180,2*(D.E?D.E[2]:60)), sound=[];
    if(!q) ev.filter(e=>e.tc>base).forEach(e=>{ i._mtB=Math.max(i._mtB||0,e.tc); if(nowS-e.tc>fresh) return; let msg=null, cl='#2962ff';
      if(e.type==='sig'){ const k=e.kind==='BOS'?(e.dir>0?'alBosBuy':'alBosSell'):(e.dir>0?'alChochBuy':'alChochSell'); if(!P[k]&&!P.alNew) return;
        msg='MTF '+(e.dir>0?'BUY':'SELL')+' ('+e.kind+') \u00b7 '+sym[0]+' \u00b7 entry '+mtsShort(D.E[1])+' @ '+mtsP(e.price)+' \u00b7 SL '+mtsP(e.sl)+' \u00b7 TP1 '+mtsP(e.tp1)+' \u00b7 Q'+e.q; cl=e.dir>0?'#2e7d32':'#c62828'; }
      else if(e.type==='htf'){ if(e.kind==='INIT') return; if(!(e.dir>0?P.alHtfBull:P.alHtfBear)) return; msg='HTF '+mtsShort(D.H[1])+' '+(e.dir>0?'bullish':'bearish')+' structure ('+e.kind+') \u00b7 '+sym[0]; cl=e.dir>0?'#2e7d32':'#c62828'; }
      else if(e.type==='bias'){ if(!P.alBias) return; const nm=v=>v>0?'bullish':v<0?'bearish':'neutral'; msg='HTF '+mtsShort(D.H[1])+' bias changed: '+nm(e.from)+' \u2192 '+nm(e.dir)+' \u00b7 '+sym[0]; cl='#f9a825'; }
      if(msg){ toast(msg,cl); sound.push(1); } });
    else i._mtB=Math.max(base,mx);
    if(S) S.forEach(r=>{ if(r.state!=='ok'||!r.ls) return; const old=i._scB[r.sy]; if(old===undefined){ i._scB[r.sy]=r.ls.tc; return; } if(r.ls.tc>old){ i._scB[r.sy]=r.ls.tc; if(!q&&P.alScan&&r.fresh){ toast('Scanner: '+(r.ls.dir>0?'BUY':'SELL')+' ('+r.ls.kind+') \u00b7 '+r.sy+' \u00b7 entry '+mtsShort(D.E[1])+' @ '+mtsP(r.ls.price)+' \u00b7 Q'+r.ls.q,r.ls.dir>0?'#2e7d32':'#c62828'); sound.push(1); } } });
    if(sound.length&&P.alSound&&typeof beep==='function') beep(); }); }
{ const _mtRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_mtRE.apply(this,arguments); try{ mtsAlerts(q); }catch(e){ console.error('mts alerts',e); } return rv; }; }
try{ DESC.mts='Premium strategy \u00b7 ONE tool with a BOS (trend continuation) / CHOCH (trend reversal) selector. The higher timeframe (5 min to weekly) sets the bias from confirmed swing highs / lows closed beyond; the entry timeframe (1 to 30 min) prints BUY / SELL only after a matching, candle-closed BOS or CHOCH (or its retest) in the direction of that bias. Never against the bias. Optional fake-signal filters (strong candle, liquidity sweep, premium / discount, chop, room to move, EMA, volume, session, fresh bias, HTF zones, quality score), SL / TP1-TP3, HTF order blocks / FVG, backtest and filter-test panels, multi-symbol scanner, once-per-signal alerts, no repainting. No profit is promised'; }catch(e){}
}catch(err){ console.error('mts strategy failed',err); window.__mtsErr=err; }

// ---- [mavt] INDICATOR: Marketplusview Adaptive Value Tracker (MAVT) - adaptive VWAP-style value line, deviation bands, trend, retest, rejection, overextension, consolidation, BUY / SELL confirmation, OTC mode, higher-time-frame direction, info panel (self-contained: every name starts with mv / MV) ----
// Website: Marketplusview.com.  An independent, price-based market-analysis instrument. NOT a real institutional VWAP and NOT a promise of profit or accuracy.
// VALUE LINE  - a running weighted average of price, restarted by the chosen reset (Rolling window / Session / Daily / Weekly / No reset).
//               Weighting: Tick Volume (real tick volume, falls back to Adaptive when volume is missing / unreliable), Price Weighted (equal weights),
//               Adaptive (weight grows with candle activity, body strength and volatility, capped so one candle can never dominate). Then smoothed by Sensitivity.
// TREND       - score = value-line slope + price position + market structure (HH/HL or LH/LL) + candle momentum (+ optional EMA). A neutral zone and a confirm-bars
//               rule stop the status flipping on every small candle.
// RETEST      - price moved away from the line, comes back to touch it, the line holds, and a rejection candle closes. It must move away again before the next retest.
// OVEREXTENSION - distance from the line in ATR + position outside the deviation bands + momentum: NORMAL / EXTENDED / HIGHLY EXTENDED (never a reversal signal by itself).
// SIGNALS     - BUY / SELL only on a closed candle, with spacing between signals and a re-arm rule (price must revisit the line before the next same-side signal).
// HIGHER TIME FRAME - the HTF value direction is read from the PREVIOUS completed higher-time-frame candle only (no future data, no repaint).
// With "closed candles only" the forming candle is never used, so confirmed signals never repaint.
try{
const MV_POS=['Top Right','Top Left','Bottom Right','Bottom Left'];
const MV_CALC=['Adaptive Weighted','Price Weighted','Tick Volume Weighted'];
const MV_SRC=['Close','HL2','HLC3','OHLC4'];
const MV_VT=['Custom (use the Reset setting)','Intraday value','Session value','Rolling value','Long-term value'];
const MV_RST=['Rolling','Session','Daily','Weekly','No reset'];
const MV_SENS=['Low','Medium','High'];
const MV_BM=['Standard deviation','ATR','Percentage'];
const MV_TFS={'Off':0,'5 min':300,'15 min':900,'1 hour':3600,'4 hours':14400};
const MV_DEF={mode:'Advanced',calc:'Adaptive Weighted',src:'HLC3',len:50,sens:6,volAdj:1,adaptStr:1,valType:MV_VT[0],reset:'Rolling',sessLen:8,sessStart:0,closed:true,
  showLine:true,lw:2,lineA:0,trendCol:true,cLine:'#2962ff',cBull:'#089981',cBear:'#f23645',cNeut:'#9aa1ad',
  bU1:true,bL1:true,bU2:true,bL2:true,bMode:MV_BM[0],bm1:1,bm2:2,bp1:0.15,bp2:0.3,bFill:true,cBand:'#7a8cff',showBands:false,
  nz:0.25,slopeLen:5,confirm:2,
  emaOn:false,emaShow:false,emaLen:50,emaSrc:'Close',cEma:'#ffb300',
  showRT:true,rtAway:0.6,rtTouch:0.2,rtCool:10,
  rejSens:'Medium',
  ext1:3,ext2:5,showWarn:false,showRev:false,
  consOn:true,consShade:true,consSens:'Medium',
  sigBuy:true,sigSell:true,showTrend:false,sigGap:8,allowCons:false,allowExt:false,maxN:80,
  otc:false,otcSens:4,otcSmooth:3,otcAct:true,otcVol:true,
  mtfOn:false,mtf1:'5 min',mtf2:'15 min',mtf3:'1 hour',mtfFilter:false,
  dash:true,dpos:MV_POS[0],
  alCu:true,alCd:true,alRu:true,alRd:true,alBuy:true,alSell:true,alTu:true,alTd:true,alOv:true,alCo:true,alRv:true,alSound:false};
const mvClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mvA(hex,a){ const m=/^#?([0-9a-f]{6})$/i.exec(hex||''); if(!m) return hex||'#888'; const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
function mvFmt(v){ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return v.toFixed(a>=1000?2:a>=10?3:a>=1?4:6); }
function mvSrcV(b,s){ return s==='Close'?b.close:s==='HL2'?(b.high+b.low)/2:s==='OHLC4'?(b.open+b.high+b.low+b.close)/4:(b.high+b.low+b.close)/3; }
// Wilder RMA; the first L-1 values use an expanding average so nothing is NaN
function mvRma(a,L){ const n=a.length, o=new Float64Array(n); let r=0,s=0; for(let i=0;i<n;i++){ s+=a[i]; if(i<L-1){ o[i]=s/(i+1); } else if(i===L-1){ r=s/L; o[i]=r; } else { r=(r*(L-1)+a[i])/L; o[i]=r; } } return o; }
function mvEma(a,L){ const n=a.length, o=new Float64Array(n), k=2/(L+1); for(let i=0;i<n;i++) o[i]=i?o[i-1]+k*(a[i]-o[i-1]):a[i]; return o; }
function mvIv(c,N){ let m=0; for(let i=N-1;i>0&&i>N-40;i--){ const d=c[i].time-c[i-1].time; if(d>0&&(m===0||d<m)) m=d; } return m; }
function mvResetOf(p){ const v=p.valType; return v==='Intraday value'?'Daily':v==='Session value'?'Session':v==='Rolling value'?'Rolling':v==='Long-term value'?'No reset':(MV_RST.indexOf(p.reset)>-1?p.reset:'Rolling'); }
// start index of the current calculation period for every candle
function mvStart(c,N,p,reset,L){ const st=new Int32Array(N), sl=Math.max(1,Math.round(+p.sessLen)||8)*3600, so=((((+p.sessStart)||0)%24)+24)%24*3600; let key=null,s=0;
  for(let i=0;i<N;i++){ const t=c[i].time; if(reset==='Rolling'){ st[i]=Math.max(0,i-L+1); continue; } if(reset==='No reset'){ st[i]=0; continue; }
    const k=reset==='Daily'?Math.floor(t/86400):reset==='Weekly'?Math.floor((Math.floor(t/86400)+3)/7):Math.floor((t-so)/sl); if(k!==key){ key=k; s=i; } st[i]=s; }
  return st; }
// ---- core engine: value line, bands, slope, trend (used for the chart AND for higher time frames) ----
function mvEngine(c,N,p,otc){
  const eps=1e-12, E={N,eff:'',volFallback:false}, L=mvClamp(Math.round(+p.len)||50,5,2000), str=mvClamp(+p.adaptStr||0,0,3), va=mvClamp(+p.volAdj||0,0,3);
  const src=new Float64Array(N), tr=new Float64Array(N), vol=new Float64Array(N); let pos=0,sv=0,sv2=0;
  for(let i=0;i<N;i++){ const b=c[i], pc=i?c[i-1].close:b.open; src[i]=mvSrcV(b,p.src); tr[i]=Math.max(b.high-b.low,Math.abs(b.high-pc),Math.abs(b.low-pc)); const v=+b.volume>0?+b.volume:0; vol[i]=v; if(v>0){ pos++; sv+=v; sv2+=v*v; } }
  const avgV=pos?sv/pos:0, varV=pos?sv2/pos-avgV*avgV:0, reliable=N>0&&pos/N>=0.6&&varV>avgV*avgV*1e-4;
  let eff=p.calc; if(otc) eff='OTC'; else if(eff==='Tick Volume Weighted'&&!reliable){ eff='Adaptive Weighted'; E.volFallback=true; } E.eff=eff;
  const atr=mvRma(tr,14), atrS=new Float64Array(N); { let s=0; for(let i=0;i<N;i++){ s+=atr[i]; if(i>=50) s-=atr[i-50]; atrS[i]=s/Math.min(i+1,50); } }
  const w=new Float64Array(N);
  for(let i=0;i<N;i++){ const b=c[i], rg=b.high-b.low, a=Math.max(atr[i],eps), act=mvClamp(rg/a,0.25,3), mom=1+str*(rg>eps?Math.abs(b.close-b.open)/rg:0), vf=mvClamp(Math.pow(a/Math.max(atrS[i],eps),va),0.5,2); let x=1;
    if(eff==='Price Weighted') x=1;
    else if(eff==='Tick Volume Weighted') x=avgV>0?mvClamp(vol[i]/avgV,0.1,4):1;
    else if(eff==='OTC'){ if(p.otcAct) x*=Math.pow(act,str)*mom; if(p.otcVol) x*=vf; x=mvClamp(x,0.2,3); }
    else x=mvClamp(Math.pow(act,str)*mom*vf,0.2,3);
    w[i]=x; }
  const SW=new Float64Array(N+1), SWP=new Float64Array(N+1); for(let i=0;i<N;i++){ SW[i+1]=SW[i]+w[i]; SWP[i+1]=SWP[i]+w[i]*src[i]; }
  const reset=mvResetOf(p), st=mvStart(c,N,p,reset,L); E.reset=reset; E.L=L;
  const sl=otc?(Math.max(1,Math.round(11-mvClamp(+p.otcSens||5,1,10)))+Math.max(0,Math.round(+p.otcSmooth)||0)):Math.max(1,Math.round(11-mvClamp(+p.sens||5,1,10))), al=2/(sl+1);
  const val=new Float64Array(N); for(let i=0;i<N;i++){ const s=st[i], dw=SW[i+1]-SW[s], base=dw>eps?(SWP[i+1]-SWP[s])/dw:src[i];
    if(i===0||(reset!=='Rolling'&&st[i]!==st[i-1])) val[i]=base; else val[i]=val[i-1]+al*(base-val[i-1]); }
  const sl2=mvClamp(Math.round(+p.slopeLen)||5,1,50), slopeN=new Float64Array(N);
  for(let i=0;i<N;i++){ const j=Math.max(i-sl2,(reset==='Rolling'||reset==='No reset')?0:st[i]); slopeN[i]=i>j?(val[i]-val[j])/Math.max(atr[i],eps)*(sl2/(i-j)):0; }
  // deviation bands
  const d1=new Float64Array(N+1), d2=new Float64Array(N+1); for(let i=0;i<N;i++){ const d=src[i]-val[i]; d1[i+1]=d1[i]+d; d2[i+1]=d2[i]+d*d; }
  const bm=p.bMode, pc=bm==='Percentage', m1=pc?+p.bp1:+p.bm1, m2=pc?+p.bp2:+p.bm2, bu1=new Float64Array(N), bl1=new Float64Array(N), bu2=new Float64Array(N), bl2=new Float64Array(N);
  for(let i=0;i<N;i++){ const n=Math.min(i+1,L), a1=d1[i+1]-d1[i+1-n], a2=d2[i+1]-d2[i+1-n], vr=a2/n-(a1/n)*(a1/n), sd=Math.sqrt(Math.max(vr,0)), a=Math.max(atr[i],eps);
    const u=bm==='ATR'?a:pc?Math.abs(val[i])/100:Math.max(sd,a*0.25); bu1[i]=val[i]+m1*u; bl1[i]=val[i]-m1*u; bu2[i]=val[i]+m2*u; bl2[i]=val[i]-m2*u; }
  // optional EMA filter (independent of the value line)
  const es=new Float64Array(N); for(let i=0;i<N;i++) es[i]=mvSrcV(c[i],p.emaSrc); const ema=mvEma(es,Math.max(2,Math.round(+p.emaLen)||50));
  // candle momentum (smoothed body share) and market structure
  const mraw=new Float64Array(N); for(let i=0;i<N;i++){ const rg=c[i].high-c[i].low; mraw[i]=rg>eps?(c[i].close-c[i].open)/rg:0; } const mo=mvEma(mraw,3);
  const nz=Math.max(0.01,+p.nz||0.25), cf=Math.max(1,Math.round(+p.confirm)||1), K=8, trd=new Int8Array(N), score=new Int8Array(N), stg=new Int8Array(N); let cur=0,cnt=0;
  for(let i=0;i<N;i++){ const a=Math.max(atr[i],eps), s1=slopeN[i]>nz?2:slopeN[i]<-nz?-2:0, pd=(c[i].close-val[i])/a, s2=pd>nz*0.5?1:pd<-nz*0.5?-1:0, s3=mo[i]>0.15?1:mo[i]<-0.15?-1:0, s4=p.emaOn?(c[i].close>ema[i]?1:c[i].close<ema[i]?-1:0):0; let s5=0;
    if(i>=2*K){ let h1=-Infinity,l1=Infinity,h0=-Infinity,l0=Infinity; for(let k=0;k<K;k++){ const x=c[i-k], y=c[i-K-k]; if(x.high>h1) h1=x.high; if(x.low<l1) l1=x.low; if(y.high>h0) h0=y.high; if(y.low<l0) l0=y.low; } s5=(h1>h0&&l1>l0)?1:(h1<h0&&l1<l0)?-1:0; }
    const sc=s1+s2+s3+s4+s5; score[i]=sc; const tg=sc>=3?1:sc<=-3?-1:(Math.abs(sc)<=1?0:cur);
    if(tg!==cur){ cnt++; if(cnt>=cf){ cur=tg; cnt=0; } } else cnt=0; trd[i]=cur; stg[i]=cur!==0?(Math.abs(sc)>=5?2:1):0; }
  Object.assign(E,{src,atr,atrS,val,slopeN,bu1,bl1,bu2,bl2,ema,mo,tr:trd,score,stg,st}); return E; }
// ---- higher-time-frame direction: built from closed chart candles, read from the PREVIOUS completed HTF candle (no future data) ----
function mvHtf(c,N,p,sec,iv){ if(!(sec>iv*1.5)) return {na:true,why:'not above chart'};
  const bars=[], idx=new Int32Array(N);
  for(let i=0;i<N;i++){ const k=Math.floor(c[i].time/sec); let b=bars[bars.length-1]; if(!b||b.k!==k){ b={k,time:k*sec,open:c[i].open,high:c[i].high,low:c[i].low,close:c[i].close,volume:+c[i].volume||0}; bars.push(b); } else { if(c[i].high>b.high) b.high=c[i].high; if(c[i].low<b.low) b.low=c[i].low; b.close=c[i].close; b.volume+=+c[i].volume||0; } idx[i]=bars.length-1; }
  const lastK=bars[bars.length-1].k, done=(c[N-1].time+iv)>=(lastK+1)*sec, nb=done?bars.length:bars.length-1; if(nb<30) return {na:true,why:'needs more history'};
  const q=Object.assign({},p,{reset:'Rolling',valType:MV_VT[0],len:Math.max(10,Math.min(Math.round(+p.len)||50,30))}), E=mvEngine(bars,nb,q,!!p.otc), s=new Int8Array(N);
  for(let i=0;i<N;i++){ const j=idx[i]-1; s[i]=(j>=0&&j<nb)?E.tr[j]:0; } return {st:s,dir:s[N-1]}; }
// ---- main analysis: rejection, consolidation, overextension, retests, confirmation, signals, events ----
function mvCompute(c,p,N0){
  const N=p.closed?N0-1:N0, D={N,ok:false,msg:'',ev:[],mk:[],E:null};
  if(N<60){ D.msg='MAVT needs at least 60 candles (loaded '+N0+')'; return D; }
  const eps=1e-12, otc=!!p.otc, E=mvEngine(c,N,p,otc); D.E=E; const iv=mvIv(c,N);
  // higher time frames (optional)
  D.mtf=[]; let filt=null;
  if(p.mtfOn){ [p.mtf1,p.mtf2,p.mtf3].forEach(n=>{ const sec=MV_TFS[n]||0; if(!sec) return; const r=mvHtf(c,N,p,sec,iv); D.mtf.push({name:n,res:r}); if(!filt&&r&&r.st) filt=r.st; }); }
  // rejection candles
  const sm={Low:[0.6,0.65],Medium:[0.5,0.55],High:[0.4,0.45]}[p.rejSens]||[0.5,0.55], wT=sm[0], bT=sm[1], rejB=new Uint8Array(N), rejA=new Uint8Array(N);
  for(let i=1;i<N;i++){ const b=c[i], pb=c[i-1], rg=b.high-b.low; if(rg<=eps) continue; const lo=Math.min(b.open,b.close), hi=Math.max(b.open,b.close), lw=(lo-b.low)/rg, uw=(b.high-hi)/rg, body=Math.abs(b.close-b.open)/rg, bull=b.close>b.open, bear=b.close<b.open;
    rejB[i]=((lw>=wT&&b.close>=b.low+0.5*rg)||(bull&&pb.close<pb.open&&b.close>=pb.open&&b.open<=pb.close)||(bull&&body>=bT&&(b.high-b.close)/rg<=0.25)||(pb.close<E.val[i-1]&&b.close>E.val[i]&&bull))?1:0;
    rejA[i]=((uw>=wT&&b.close<=b.high-0.5*rg)||(bear&&pb.close>pb.open&&b.close<=pb.open&&b.open>=pb.close)||(bear&&body>=bT&&(b.close-b.low)/rg<=0.25)||(pb.close>E.val[i-1]&&b.close<E.val[i]&&bear))?1:0; }
  // consolidation (needs k of 4: ATR compression, narrow candles, flat line, price oscillating around the line)
  const need={Low:4,Medium:3,High:2}[p.consSens]||3, nz=Math.max(0.01,+p.nz||0.25), cons=new Uint8Array(N); let onC=0,offC=0,cs=0;
  for(let i=10;i<N;i++){ const a=Math.max(E.atr[i],eps); let rs=0; for(let k=0;k<5;k++) rs+=c[i-k].high-c[i-k].low; rs/=5; let near=0,cr=0; for(let k=0;k<10;k++){ const j=i-k; if(Math.abs(c[j].close-E.val[j])<0.8*Math.max(E.atr[j],eps)) near++; if(k>0){ const s1=c[j].close-E.val[j], s0=c[j-1].close-E.val[j-1]; if((s1>=0)!==(s0>=0)) cr++; } }
    const n=(E.atr[i]<0.95*E.atrS[i]?1:0)+(rs/a<0.95?1:0)+(Math.abs(E.slopeN[i])<nz?1:0)+((near>=7||cr>=2)?1:0);
    if(n>=need){ onC++; offC=0; if(onC>=3) cs=1; } else { offC++; onC=0; if(offC>=2) cs=0; } cons[i]=p.consOn?cs:0; }
  // overextension level: 0 normal, 1 extended, 2 highly extended
  const ext=new Uint8Array(N), e1=Math.max(0.5,+p.ext1||2), e2=Math.max(e1,+p.ext2||3.5);
  for(let i=0;i<N;i++){ const cl=c[i].close, a=Math.max(E.atr[i],eps), dA=Math.abs(cl-E.val[i])/a, bl=(cl>E.bu2[i]||cl<E.bl2[i])?2:(cl>E.bu1[i]||cl<E.bl1[i])?1:0, al=dA>=e2?2:dA>=e1?1:0;
    ext[i]=(al>=2&&bl>=2)?2:(al>=1&&bl>=1)?1:0; }
  D.rejB=rejB; D.rejA=rejA; D.cons=cons; D.ext=ext;
  // sequential pass
  const touch=Math.max(0,+p.rtTouch||0.2), away=Math.max(0.1,+p.rtAway||0.6), cool=Math.max(1,Math.round(+p.rtCool)||10), gap=Math.max(1,Math.round(+p.sigGap)||8), conf=new Int8Array(N);
  let awayU=false,awayD=false,lastRtU=-999,lastRtD=-999,rtU=-999,rtD=-999,armB=true,armS=true,lastBuy=-999,lastSell=-999,lastRev=-999,lastExtU=-999,lastExtD=-999,wasExt=-999,prevTr=E.tr[0],prevExt=0,prevCons=0;
  const ev=(type,i,dir,price)=>{ D.ev.push({type,idx:i,time:c[i].time,dir,price:price==null?c[i].close:price}); };
  for(let i=1;i<N;i++){ const b=c[i], pb=c[i-1], v=E.val[i], pv=E.val[i-1], a=Math.max(E.atr[i],eps), tr=E.tr[i], sN=E.slopeN[i], warm=i>=40;
    if(warm){ if(pb.close<=pv&&b.close>v) ev('crossUp',i,1); if(pb.close>=pv&&b.close<v) ev('crossDn',i,-1); }
    if(tr!==prevTr){ if(warm&&tr!==0){ ev(tr>0?'trendUp':'trendDn',i,tr); D.mk.push({i,k:'trend',d:tr}); } prevTr=tr; }
    // away / retest
    if(b.close>v+away*a) awayU=true; if(b.close<v-away*a) awayD=true; if(b.close<v-touch*a) awayU=false; if(b.close>v+touch*a) awayD=false;
    if(b.low<=v+touch*a) armB=true; if(b.high>=v-touch*a) armS=true;
    if(awayU&&b.low<=v+touch*a&&b.close>=v&&sN>=-nz*0.5&&(tr>=0||sN>0)&&rejB[i]&&i-lastRtU>=cool){ lastRtU=i; rtU=i; awayU=false; if(warm){ ev('retestUp',i,1,v); D.mk.push({i,k:'retest',d:1}); } }
    if(awayD&&b.high>=v-touch*a&&b.close<=v&&sN<=nz*0.5&&(tr<=0||sN<0)&&rejA[i]&&i-lastRtD>=cool){ lastRtD=i; rtD=i; awayD=false; if(warm){ ev('retestDn',i,-1,v); D.mk.push({i,k:'retest',d:-1}); } }
    // overextension edges, reversal, return to value
    const x=ext[i]; if(x>=1){ if(b.close>v) lastExtU=i; else lastExtD=i; wasExt=i; }
    if(warm&&x>=1&&prevExt===0) ev('over',i,b.close>v?1:-1);
    if(warm&&x===2&&prevExt<2) D.mk.push({i,k:'warn',d:b.close>v?-1:1,up:b.close>v});
    if(warm&&i-lastRev>=8){ if(i-lastExtU<=3&&rejA[i]&&b.close<b.open){ lastRev=i; D.mk.push({i,k:'rev',d:-1}); } else if(i-lastExtD<=3&&rejB[i]&&b.close>b.open){ lastRev=i; D.mk.push({i,k:'rev',d:1}); } }
    if(wasExt>-1&&i-wasExt<=30&&x===0&&Math.abs(b.close-v)<=0.5*a&&Math.abs(pb.close-pv)>0.5*a){ if(warm) ev('ret',i,pb.close>pv?-1:1,v); wasExt=-999; }
    prevExt=x; if(cons[i]&&!prevCons&&warm) ev('cons',i,0); prevCons=cons[i];
    // confirmation + signals (closed candles only)
    const emaB=!p.emaOn||b.close>E.ema[i], emaS=!p.emaOn||b.close<E.ema[i], mB=!filt||filt[i]>=0, mS=!filt||filt[i]<=0;
    const nearB=b.low-v<=0.8*a, nearS=v-b.high<=0.8*a;
    const cB=b.close>v&&sN>nz*0.5&&b.close>b.open&&nearB&&(rejB[i]||i-rtU<=3)&&emaB&&mB&&tr>=0, cS=b.close<v&&sN<-nz*0.5&&b.close<b.open&&nearS&&(rejA[i]||i-rtD<=3)&&emaS&&mS&&tr<=0;
    conf[i]=cB?1:cS?-1:0;
    const okExt=x===0||p.allowExt, okCons=!cons[i]||p.allowCons;
    if(warm&&cB&&armB&&i-lastBuy>=gap&&okExt&&okCons){ lastBuy=i; armB=false; armS=true; D.mk.push({i,k:'buy',d:1}); ev('buy',i,1); }
    else if(warm&&cS&&armS&&i-lastSell>=gap&&okExt&&okCons){ lastSell=i; armS=false; armB=true; D.mk.push({i,k:'sell',d:-1}); ev('sell',i,-1); } }
  D.conf=conf; D.lastBuy=lastBuy; D.lastSell=lastSell; D.otc=otc; D.ok=true; return D; }
let mvMem=null;
function mvGet(c,p){ const N=c.length, key=JSON.stringify(p)+'|'+sym[0]+'|'+tf[0]+'|'+N+'|'+(N?c[0].time+'|'+c[N-1].time+'|'+c[N-1].close+'|'+c[N-1].high+'|'+c[N-1].low:''); if(mvMem&&mvMem.k===key) return mvMem.D;
  let D; try{ D=mvCompute(c,p,N); }catch(e){ console.error('mavt calc failed',e); D={N,ok:false,msg:'MAVT calculation error: '+(e&&e.message),ev:[],mk:[]}; } mvMem={k:key,D}; return D; }
IND.mavt={label:'Marketplusview Adaptive Value Tracker (MAVT)',cat:'Trend',nm:()=>'MAVT',p:Object.assign({},MV_DEF),cols:['#2962ff'],
  fields:[
    ['mode','sel','Display mode (Beginner hides the advanced extras)',{opts:['Beginner','Advanced']}],
    ['calc','sel','1 Main \u00b7 Calculation mode',{opts:MV_CALC}],['src','sel','1 Main \u00b7 Price source',{opts:MV_SRC}],['len','num','1 Main \u00b7 Lookback (candles)',{min:5,max:2000,step:1}],
    ['valType','sel','1 Main \u00b7 Value type',{opts:MV_VT}],['reset','sel','1 Main \u00b7 Reset',{opts:MV_RST}],['sens','num','1 Main \u00b7 Sensitivity (1 smooth \u2013 10 fast)',{min:1,max:10,step:1}],
    ['adaptStr','num','2 Adaptive \u00b7 Adaptive strength',{min:0,max:3,step:0.1}],['volAdj','num','2 Adaptive \u00b7 Volatility adjustment',{min:0,max:3,step:0.1}],
    ['sessLen','num','3 Session \u00b7 Session length (hours)',{min:1,max:24,step:1}],['sessStart','num','3 Session \u00b7 Session start hour (UTC)',{min:0,max:23,step:1}],
    ['closed','chk','Closed candles only (no repaint)'],
    ['showLine','chk','4 Line \u00b7 Show value line'],['lw','num','4 Line \u00b7 Thickness',{min:1,max:6,step:1}],['lineA','num','4 Line \u00b7 Transparency (%)',{min:0,max:90,step:5}],['trendCol','chk','4 Line \u00b7 Colour by trend'],
    ['cLine','col','4 Line \u00b7 Line colour (when trend colours are off)'],['cBull','col','4 Line \u00b7 Bullish colour'],['cBear','col','4 Line \u00b7 Bearish colour'],['cNeut','col','4 Line \u00b7 Neutral colour'],
    ['showBands','chk','5 Bands \u00b7 Show deviation bands'],['bMode','sel','5 Bands \u00b7 Band type',{opts:MV_BM}],['bm1','num','5 Bands \u00b7 Inner distance (deviation / ATR)',{min:0.1,max:10,step:0.1}],['bm2','num','5 Bands \u00b7 Outer distance (deviation / ATR)',{min:0.1,max:20,step:0.1}],
    ['bp1','num','5 Bands \u00b7 Inner distance (%)',{min:0.01,max:20,step:0.01}],['bp2','num','5 Bands \u00b7 Outer distance (%)',{min:0.01,max:40,step:0.01}],
    ['bU1','chk','5 Bands \u00b7 Upper band 1'],['bL1','chk','5 Bands \u00b7 Lower band 1'],['bU2','chk','5 Bands \u00b7 Upper band 2'],['bL2','chk','5 Bands \u00b7 Lower band 2'],['bFill','chk','5 Bands \u00b7 Shaded areas'],['cBand','col','5 Bands \u00b7 Band colour'],
    ['nz','num','6 Trend \u00b7 Neutral zone (bigger = fewer trend changes)',{min:0.05,max:2,step:0.05}],['slopeLen','num','6 Trend \u00b7 Slope length (candles)',{min:1,max:50,step:1}],['confirm','num','6 Trend \u00b7 Confirm candles before a trend change',{min:1,max:10,step:1}],['showTrend','chk','6 Trend \u00b7 Trend-change markers'],
    ['showRT','chk','7 Retest \u00b7 Retest markers'],['rtAway','num','7 Retest \u00b7 Price must first move away by (ATR)',{min:0.1,max:5,step:0.1}],['rtTouch','num','7 Retest \u00b7 Touch distance (ATR)',{min:0,max:2,step:0.05}],['rtCool','num','7 Retest \u00b7 Candles between retests',{min:1,max:100,step:1}],
    ['rejSens','sel','8 Candles \u00b7 Confirmation sensitivity',{opts:MV_SENS}],
    ['ext1','num','9 Overextension \u00b7 EXTENDED from (ATR away)',{min:0.5,max:10,step:0.1}],['ext2','num','9 Overextension \u00b7 HIGHLY EXTENDED from (ATR away)',{min:0.5,max:15,step:0.1}],['showWarn','chk','9 Overextension \u00b7 Warning markers'],['showRev','chk','9 Overextension \u00b7 Reversal markers (extension + rejection)'],
    ['consOn','chk','10 Consolidation \u00b7 Detect consolidation'],['consShade','chk','10 Consolidation \u00b7 Background shading'],['consSens','sel','10 Consolidation \u00b7 Sensitivity',{opts:MV_SENS}],
    ['emaOn','chk','11 EMA \u00b7 Use EMA confirmation'],['emaShow','chk','11 EMA \u00b7 Show EMA'],['emaLen','num','11 EMA \u00b7 EMA length',{min:2,max:500,step:1}],['emaSrc','sel','11 EMA \u00b7 EMA source',{opts:MV_SRC}],['cEma','col','11 EMA \u00b7 EMA colour'],
    ['sigBuy','chk','12 Signals \u00b7 BUY markers'],['sigSell','chk','12 Signals \u00b7 SELL markers'],['sigGap','num','12 Signals \u00b7 Minimum candles between signals',{min:1,max:200,step:1}],['allowCons','chk','12 Signals \u00b7 Allow signals inside consolidation'],['allowExt','chk','12 Signals \u00b7 Allow signals when extended'],['maxN','num','12 Signals \u00b7 Markers kept on the chart',{min:10,max:500,step:10}],
    ['otc','chk','13 OTC \u00b7 OTC mode (no real volume, price-based estimate)'],['otcSens','num','13 OTC \u00b7 OTC sensitivity (1 smooth \u2013 10 fast)',{min:1,max:10,step:1}],['otcSmooth','num','13 OTC \u00b7 Extra smoothing (candles)',{min:0,max:30,step:1}],['otcAct','chk','13 OTC \u00b7 Candle-activity weighting'],['otcVol','chk','13 OTC \u00b7 Volatility weighting'],
    ['mtfOn','chk','14 Multi-timeframe \u00b7 Show higher-timeframe direction'],['mtf1','sel','14 Multi-timeframe \u00b7 Timeframe 1',{opts:Object.keys(MV_TFS)}],['mtf2','sel','14 Multi-timeframe \u00b7 Timeframe 2',{opts:Object.keys(MV_TFS)}],['mtf3','sel','14 Multi-timeframe \u00b7 Timeframe 3',{opts:Object.keys(MV_TFS)}],['mtfFilter','chk','14 Multi-timeframe \u00b7 Signals must agree with timeframe 1'],
    ['dash','chk','15 Panel \u00b7 Show information panel'],['dpos','sel','15 Panel \u00b7 Panel position',{opts:MV_POS}],
    ['alCu','chk','16 Alerts \u00b7 Price crosses above value'],['alCd','chk','16 Alerts \u00b7 Price crosses below value'],['alRu','chk','16 Alerts \u00b7 Bullish retest'],['alRd','chk','16 Alerts \u00b7 Bearish retest'],
    ['alBuy','chk','16 Alerts \u00b7 Bullish confirmation (BUY)'],['alSell','chk','16 Alerts \u00b7 Bearish confirmation (SELL)'],['alTu','chk','16 Alerts \u00b7 Trend turns bullish'],['alTd','chk','16 Alerts \u00b7 Trend turns bearish'],
    ['alOv','chk','16 Alerts \u00b7 Overextension'],['alCo','chk','16 Alerts \u00b7 Consolidation detected'],['alRv','chk','16 Alerts \u00b7 Price returning to value'],['alSound','chk','16 Alerts \u00b7 Play a sound']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>{ const q=Object.assign({},MV_DEF,p), D=mvGet(c,q); return {mk:[],boxes:[{type:'mavtview',pts:[],o:q,D}],labels:[],events:D.ok?D.ev:[]}; }};
{ const _D=draw; draw=function(d,X,Y,W,Hh){ if(!d||d.type!=='mavtview') return _D.apply(this,arguments);
    const p=d.o, D=d.D; if(!D) return; const n0=candles.length;
    cx.save(); cx.beginPath(); cx.rect(0,0,W,Hh); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
    if(!D.ok){ if(D.msg){ cx.fillStyle='rgba(255,193,7,.95)'; cx.textAlign='left'; cx.font='11px system-ui,sans-serif'; cx.fillText(D.msg,10,Hh-14); } cx.restore(); return; }
    const E=D.E, N=D.N, adv=p.mode==='Advanced', xa=X(N-1), xb=X(N-2), step=(xa!=null&&xb!=null)?Math.abs(xa-xb):6;
    const dirCol=k=>k>0?p.cBull:k<0?p.cBear:p.cNeut;
    // 1) consolidation shading
    if(p.consOn&&p.consShade){ cx.fillStyle='rgba(154,161,173,.10)'; let s=-1; for(let i=0;i<=N;i++){ const on=i<N&&D.cons[i]; if(on&&s<0) s=i; if(!on&&s>=0){ const x1=X(s), x2=X(i-1); if(x1!=null&&x2!=null&&x2>-20&&x1<W+20) cx.fillRect(x1-step/2,0,x2-x1+step,Hh); s=-1; } } }
    // 2) deviation bands (hidden in Beginner mode)
    if(p.showBands&&adv){ const poly=(A,B,col)=>{ cx.beginPath(); let f=true,last=-1; for(let i=0;i<N;i++){ const x=X(i), y=Y(A[i]); if(x==null||y==null||x<-20||x>W+20) continue; if(f){ cx.moveTo(x,y); f=false; } else cx.lineTo(x,y); last=i; }
        if(last<0) return; for(let i=last;i>=0;i--){ const x=X(i), y=Y(B[i]); if(x==null||y==null||x<-20||x>W+20) continue; cx.lineTo(x,y); } cx.closePath(); cx.fillStyle=col; cx.fill(); };
      const line=(A,dash,al)=>{ cx.beginPath(); let f=true; for(let i=0;i<N;i++){ const x=X(i), y=Y(A[i]); if(x==null||y==null||x<-20||x>W+20) continue; if(f){ cx.moveTo(x,y); f=false; } else cx.lineTo(x,y); } cx.strokeStyle=mvA(p.cBand,al); cx.lineWidth=1; cx.setLineDash(dash); cx.stroke(); cx.setLineDash([]); };
      if(p.bFill){ if(p.bU1&&p.bL1) poly(E.bu1,E.bl1,mvA(p.cBand,.07)); if(p.bU1&&p.bU2) poly(E.bu2,E.bu1,mvA(p.cBand,.04)); if(p.bL1&&p.bL2) poly(E.bl1,E.bl2,mvA(p.cBand,.04)); }
      if(p.bU1) line(E.bu1,[],.55); if(p.bL1) line(E.bl1,[],.55); if(p.bU2) line(E.bu2,[2,3],.45); if(p.bL2) line(E.bl2,[2,3],.45); }
    // 3) optional EMA
    if(p.emaShow){ cx.beginPath(); let f=true; for(let i=0;i<N;i++){ const x=X(i), y=Y(E.ema[i]); if(x==null||y==null||x<-20||x>W+20) continue; if(f){ cx.moveTo(x,y); f=false; } else cx.lineTo(x,y); } cx.strokeStyle=mvA(p.cEma,.85); cx.lineWidth=1; cx.stroke(); }
    // 4) adaptive value line (colour = trend state of each candle)
    if(p.showLine){ const al=1-mvClamp(+p.lineA||0,0,90)/100; cx.lineWidth=mvClamp(Math.round(+p.lw)||2,1,6); cx.lineCap='round'; cx.lineJoin='round'; let curC=null, open=false;
      for(let i=0;i<N;i++){ const x=X(i), y=Y(E.val[i]); if(x==null||y==null||x<-20||x>W+20){ if(open){ cx.stroke(); open=false; } continue; }
        const col=mvA(p.trendCol?dirCol(E.tr[i]):p.cLine,al);
        if(!open){ cx.beginPath(); cx.moveTo(x,y); open=true; curC=col; cx.strokeStyle=col; }
        else if(col!==curC){ cx.lineTo(x,y); cx.stroke(); cx.beginPath(); cx.moveTo(x,y); curC=col; cx.strokeStyle=col; }
        else cx.lineTo(x,y); }
      if(open) cx.stroke(); }
    // 5) markers: retest / reversal / warning / trend change / BUY / SELL (stacked per candle so they never overlap)
    const vis=m=>m.k==='retest'?p.showRT:m.k==='buy'?p.sigBuy:m.k==='sell'?p.sigSell:m.k==='rev'?(p.showRev&&adv):m.k==='warn'?(p.showWarn&&adv):m.k==='trend'?(p.showTrend&&adv):false;
    const ord={retest:0,rev:1,warn:2,trend:3,buy:4,sell:4}, hgt={retest:12,rev:12,warn:15,trend:12,buy:19,sell:19};
    const list=D.mk.filter(vis).slice(-mvClamp(Math.round(+p.maxN)||80,10,500)).sort((a,b)=>a.i-b.i||ord[a.k]-ord[b.k]), st={};
    cx.textAlign='center';
    list.forEach(m=>{ const k=candles[m.i], x=X(m.i); if(!k||x==null||x<-20||x>W+20) return; const below=m.d>0, y0=Y(below?k.low:k.high); if(y0==null) return; const S=st[m.i]||(st[m.i]={u:6,d:6}); const off=below?S.d:S.u, h=hgt[m.k]; if(below) S.d+=h; else S.u+=h;
      const cy=below?y0+off+h/2:y0-off-h/2, col=m.k==='warn'?'#f9a825':dirCol(m.d);
      if(m.k==='buy'||m.k==='sell'){ const t=m.k==='buy'?'BUY':'SELL'; cx.font='bold 9px system-ui,sans-serif'; const w=cx.measureText(t).width+10; cx.fillStyle=col; cx.beginPath(); if(cx.roundRect) cx.roundRect(x-w/2,cy-7,w,14,7); else cx.rect(x-w/2,cy-7,w,14); cx.fill(); cx.fillStyle='#fff'; cx.fillText(t,x,cy+.5); }
      else if(m.k==='retest'){ cx.fillStyle='rgba(10,13,20,.9)'; cx.strokeStyle=col; cx.lineWidth=1.6; cx.beginPath(); cx.arc(x,cy,4,0,Math.PI*2); cx.fill(); cx.stroke(); }
      else if(m.k==='rev'){ cx.fillStyle=col; cx.beginPath(); cx.moveTo(x,cy-5); cx.lineTo(x+5,cy); cx.lineTo(x,cy+5); cx.lineTo(x-5,cy); cx.closePath(); cx.fill(); }
      else if(m.k==='warn'){ cx.fillStyle=col; cx.beginPath(); cx.arc(x,cy,6,0,Math.PI*2); cx.fill(); cx.fillStyle='#1a1300'; cx.font='bold 9px system-ui,sans-serif'; cx.fillText('!',x,cy+.5); }
      else { cx.fillStyle=col; cx.beginPath(); if(m.d>0){ cx.moveTo(x,cy-5); cx.lineTo(x+5,cy+4); cx.lineTo(x-5,cy+4); } else { cx.moveTo(x,cy+5); cx.lineTo(x+5,cy-4); cx.lineTo(x-5,cy-4); } cx.closePath(); cx.fill(); } });
    // 6) information panel (values of the last closed candle)
    if(p.dash){ const i=N-1, b=candles[i]||{close:E.src[i]}, v=E.val[i], a=Math.max(E.atr[i],1e-12), dev=(b.close-v)/a, sN=E.slopeN[i], nz=Math.max(0.01,+p.nz||0.25), tr=E.tr[i], st2=E.stg[i], cons=D.cons[i], ex=D.ext[i], cf=D.conf[i], amber='#f9a825', grey='rgba(230,232,238,.75)';
      const dirT=tr>0?'Bullish':tr<0?'Bearish':'Neutral', posT=Math.abs(b.close-v)<=0.15*a?'At Value':b.close>v?'Above Value':'Below Value', posC=Math.abs(b.close-v)<=0.15*a?p.cNeut:b.close>v?p.cBull:p.cBear;
      const condT=cons?'Consolidating':ex===2?'Highly Extended':ex===1?'Extended':tr!==0?'Trending':'Normal', condC=cons?p.cNeut:ex>=1?amber:tr!==0?dirCol(tr):'#e6e8ee';
      const lnT=sN>nz?'Rising':sN<-nz?'Falling':'Flat', lnC=sN>nz?p.cBull:sN<-nz?p.cBear:p.cNeut, ar=E.atr[i]/Math.max(E.atrS[i],1e-12), vT=ar<0.8?'Low':ar>1.3?'High':'Normal';
      const cfT=cf>0?'Bullish Confirmed':cf<0?'Bearish Confirmed':'No Confirmation', cfC=cf>0?p.cBull:cf<0?p.cBear:p.cNeut;
      const recent=(D.lastBuy>D.lastSell?D.lastBuy:D.lastSell), sgT=(N-1-recent<=3&&recent>0)?(D.lastBuy>D.lastSell?'BUY':'SELL'):'None', sgC=sgT==='BUY'?p.cBull:sgT==='SELL'?p.cBear:p.cNeut;
      const rows=[]; if(p.otc) rows.push(['Mode','OTC MODE',amber]);
      rows.push(['Direction',dirT+(tr!==0?(st2===2?' \u00b7 Strong':' \u00b7 Weak'):''),dirCol(tr)],['Price',posT,posC],['Condition',condT,condC]);
      if(!adv){ if(p.sigBuy||p.sigSell) rows.push(['Signal',sgT,sgC]); }
      else { rows.push(['Value line',lnT,lnC],['Confirmation',cfT,cfC],['Volatility',vT,vT==='High'?amber:'#e6e8ee']);
        const q=Math.abs(b.close-v), bandT=(b.close>E.bu2[i]||b.close<E.bl2[i])?'Beyond band 2':(b.close>E.bu1[i]||b.close<E.bl1[i])?'Beyond band 1':'Inside band 1';
        const rs=E.reset==='Rolling'?('Rolling '+E.L):E.reset, md=D.otc?'OTC price-based':E.eff.replace(' Weighted','')+(E.volFallback?' (no volume)':''), hr=Math.floor((((candles[i]&&candles[i].time)||0)%86400)/3600), sess=hr<7?'Asia':hr<12?'London':hr<16?'London + New York':hr<21?'New York':'Off-hours';
        rows.push(['Value',mvFmt(v),'#e6e8ee'],['Deviation',(dev>=0?'+':'')+dev.toFixed(2)+' ATR',Math.abs(dev)>=(+p.ext1||2)?amber:'#e6e8ee'],['ATR',mvFmt(E.atr[i]),'#e6e8ee'],['Slope',(sN>=0?'+':'')+sN.toFixed(2)+' ATR',lnC],['Band position',bandT,ex>=1?amber:'#e6e8ee'],['Calculation',md,D.otc?amber:'#e6e8ee'],['Reset',rs,'#e6e8ee'],['Session',sess,'#e6e8ee']);
        if(p.sigBuy||p.sigSell) rows.push(['Last signal',sgT,sgC]);
        D.mtf.forEach(m=>{ const r=m.res; rows.push(['TF '+m.name,r&&r.st?(r.dir>0?'Bullish':r.dir<0?'Bearish':'Neutral'):'n/a',r&&r.st?dirCol(r.dir):'rgba(230,232,238,.45)']); }); }
      const f=10, rh=f+8, m=6, head='MARKETPLUSVIEW \u00b7 MAVT', foot=D.otc?'OTC estimate \u00b7 not real VWAP / volume':'marketplusview.com';
      cx.font='bold '+f+'px system-ui'; let w0=cx.measureText(head).width+6, w1=0; rows.forEach(r=>{ w0=Math.max(w0,cx.measureText(r[0]).width); w1=Math.max(w1,cx.measureText(r[1]).width); }); w0=Math.max(w0,0); cx.font=(f-1)+'px system-ui'; const wf=cx.measureText(foot).width+16;
      const pw=Math.min(W-2*m,Math.max(w0+w1+34,wf)), ph=(rows.length+2)*rh, x0=/Left/.test(p.dpos)?m:W-pw-m, y0=/Top/.test(p.dpos)?m+34:Hh-ph-m-24;
      cx.fillStyle='rgba(10,13,20,.88)'; cx.fillRect(x0,y0,pw,ph); cx.fillStyle='rgba(41,98,255,.9)'; cx.fillRect(x0,y0,pw,2); cx.textAlign='left'; cx.font='bold '+f+'px system-ui'; cx.fillStyle='#e6e8ee'; cx.fillText(head,x0+8,y0+rh/2+1);
      rows.forEach((r,k)=>{ const y=y0+(k+1)*rh+rh/2; cx.font=f+'px system-ui'; cx.textAlign='left'; cx.fillStyle='rgba(230,232,238,.6)'; cx.fillText(r[0],x0+8,y); cx.font='bold '+f+'px system-ui'; cx.fillStyle=r[2]; cx.textAlign='right'; cx.fillText(r[1],x0+pw-8,y); });
      cx.font=(f-1)+'px system-ui'; cx.textAlign='left'; cx.fillStyle=D.otc?amber:'rgba(230,232,238,.4)'; cx.fillText(foot,x0+8,y0+(rows.length+1)*rh+rh/2);
      cx.strokeStyle='rgba(128,128,128,.4)'; cx.lineWidth=1; cx.strokeRect(x0,y0,pw,ph); }
    cx.restore(); }; }
// alerts: fire once, when the candle that carried the event has closed (the newest closed candle), while the app is open
function mvAlerts(q){ if(candles.length<2) return; const cc=candles[candles.length-2].time, key=sym[0]+'|'+tf[0],
    KEY={crossUp:'alCu',crossDn:'alCd',retestUp:'alRu',retestDn:'alRd',buy:'alBuy',sell:'alSell',trendUp:'alTu',trendDn:'alTd',over:'alOv',cons:'alCo',ret:'alRv'},
    MSG={crossUp:['Price crossed ABOVE the value line','#2e7d32'],crossDn:['Price crossed BELOW the value line','#c62828'],retestUp:['Bullish retest of value','#2e7d32'],retestDn:['Bearish retest of value','#c62828'],buy:['BUY confirmation','#2e7d32'],sell:['SELL confirmation','#c62828'],trendUp:['Trend turned bullish','#2e7d32'],trendDn:['Trend turned bearish','#c62828'],over:['Price is extended from value','#f9a825'],cons:['Consolidation detected','#546e7a'],ret:['Price returning to value','#2962ff']};
  inds.forEach(i=>{ if(i.t!=='mavt'||!i._xr||!i._xr.events||!show(i)) return; const P=Object.assign({},MV_DEF,i.p); let quiet=q; if(i._mvK!==key){ i._mvK=key; i._mvLast={}; quiet=true; }
    const last=i._mvLast||(i._mvLast={});
    i._xr.events.forEach(e=>{ if(e.time>cc||e.time<=(last[e.type]||0)) return; last[e.type]=e.time;
      if(quiet||e.time!==cc||!P[KEY[e.type]]) return; const m=MSG[e.type];
      toast('MAVT \u00b7 '+m[0]+' \u00b7 '+sym[0]+' '+tf[0]+' \u00b7 '+mvFmt(e.price),m[1]); if(P.alSound&&typeof beep==='function') beep(); }); }); }
{ const _mvRE=recomputeExtras; recomputeExtras=function(){ const q=quietNext; const rv=_mvRE.apply(this,arguments); try{ mvAlerts(q); }catch(e){ console.error('mavt alerts',e); } return rv; }; }
try{ DESC.mavt='Marketplusview Adaptive Value Tracker: an adaptive VWAP-style value line (tick-volume, price or adaptive weighting, OTC mode for charts without real volume), optional deviation bands, trend and consolidation status, value retests, rejection candles, overextension status, optional BUY / SELL confirmation, higher-timeframe direction and a clean info panel. A market-analysis aid, not a promise of profit'; }catch(e){}
}catch(err){ console.error('mavt indicator failed',err); window.__mavtErr=err; }
