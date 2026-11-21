/* tools-strats.js - the five strategies copied out of tools-7.js and tools-8.js for the server (tools-engine.js loads this file).
   Fast Future Sniper Pro Plus (mru), Bullish Engulfing (beg), Candlestick Pro Plus Counter Premium (ccp), Adjustable Pro Plus Ranging Channel (pcr), Consecutive Candles Zones (ccz).
   Code is unchanged; if you change a rule in the app tools files, copy it here too. */

// ===== mru =====
{
// [mru] STRATEGY · "Fast Future Sniper" (full-body candle: marubozu)   (self-contained: every name starts with mru / MRU)
// Marubozu = a candle that is (almost) all body: no or tiny wicks, so one side controlled the whole candle.
// SELL straight after a BEARISH marubozu closes, BUY straight after a BULLISH marubozu closes.
// The candle that is still forming is never used (signal only once it has closed). Same small button as the Engulfing tool:
// rounded BUY / SELL button away from the price, joined to the candle by a dotted line. Hooks: STRATS.mru + draw + recomputeExtras.
// =====================================================================================
try{
const MRU_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const MRU_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
function mruAtr(c,n){ const o=new Array(c.length).fill(0); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*(n-1)+tr)/n; o[i]=p; } return o; }
function mruEmaN(Z){ const v=Z.mruEma; if(!v||v==='Off') return 0; const n=v==='Custom'?Math.round(+Z.mruEmaLen)||50:Math.round(+v); return Math.max(2,Math.min(1000,n)); }
function mruEma(c,n){ const o=new Array(c.length).fill(null); let p=null; for(let i=0;i<c.length;i++){ const k=2/(Math.min(i+1,n)+1); p=p==null?c[i].close:c[i].close*k+p*(1-k); o[i]=p; } return o; }   // starts on the very first candle (short averaging window while history is short), so the line covers the whole chart
function mruTfOk(Z){ if(Z.mruHtf===false) return true; try{ const t=tf, sec=t[3]?t[3]*30*86400:t[2]; return !(sec<3600); }catch(e){ return true; } }
const mruCache={};
function mruRun(c,Z){ if(!mruTfOk(Z)) return {ev:[],sig:new Map()}; const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.mruDir,Z.mruPct,Z.mruWick,Z.mruAtr,Z.mruWait,Z.mruEma,Z.mruEmaLen,Z.mruVolOn,Z.mruVolX,Z.mruVolLen,Z.mruDirOn,Z.mruDirLen,Z.mruDirMin,Z.mruDistP,Z.mruDistA,Z.mruGapB,Z.mruGapS,Z.mruSrOn,Z.mruSrLen,Z.mruSrK,Z.mruSrPct,Z.mruSrAtr,Z.mruSwOn,Z.mruSwN,Z.mruSwW,Z.mruFtOn,Z.mruFtPct,Z.mruMtfOn,Z.mruMtfMul,Z.mruMtfLen,Z.mruExtOn,Z.mruExtLen,Z.mruExtP,Z.mruExtA,Z.mruFlatOn,Z.mruFlatLen,Z.mruFlatBars,Z.mruFlatPct].join('|');
  const h=mruCache[Z.sid]; if(h&&h.k===key) return h.r;
  const pct=Math.min(1,Math.max(0.5,(Z.mruPct==null?90:+Z.mruPct)/100)), wk=Math.min(0.5,Math.max(0,(Z.mruWick==null?5:+Z.mruWick)/100)), ma=Z.mruAtr==null?0.8:+Z.mruAtr,
    last=Z.mruWait===false?m:m-1, atr=mruAtr(c,14), ev=[], sig=new Map(), eN=mruEmaN(Z), ema=eN?mruEma(c,eN):null,
    gapB=Math.max(0,Math.round(+Z.mruGapB)||0), gapS=Math.max(0,Math.round(+Z.mruGapS)||0),
    dirOn=Z.mruDirOn===true, dirL=Math.max(1,Math.min(200,Math.round(+Z.mruDirLen)||5)), dirMin=Math.max(0,+Z.mruDirMin||0), distP=Math.max(0,+Z.mruDistP||0), distA=Math.max(0,+Z.mruDistA||0),
    vOn=Z.mruVolOn===true, vx=+Z.mruVolX>0?+Z.mruVolX:1.2, vl=Math.max(3,Math.min(500,Math.round(+Z.mruVolLen)||20)), lowV=new Array(m).fill(false);
  if(vOn){ let sv=0; for(let i=0;i<m;i++){ const v=+c[i].volume||0, n=Math.min(i,vl), av=n>0?sv/n:0; lowV[i]=i>=3&&av>0&&v<vx*av; sv+=v; if(i>=vl) sv-=(+c[i-vl].volume||0); } }   // VOLUME filter: the signal candle needs volume >= X times the recent average (skipped when the data has no volume)
  let lastB=-1e9, lastS=-1e9;
  // SUPPORT / RESISTANCE filter: skip a BUY right under a recent swing high and a SELL right above a recent swing low (a swing = highest / lowest of K candles each side, confirmed after K candles)
  const srOn=Z.mruSrOn===true, srLen=Math.max(10,Math.min(2000,Math.round(+Z.mruSrLen)||100)), srK=Math.max(1,Math.min(30,Math.round(+Z.mruSrK)||5)), srPct=Math.max(0,+Z.mruSrPct||0), srAtr=Math.max(0,+Z.mruSrAtr||0);
  const srBlock=(i,s_,cl)=>{ const tol=Math.max(cl*srPct/100,srAtr*(atr[i-1]||atr[i]||0)); if(!(tol>0)) return false;
    for(let j=i-srK;j>=Math.max(srK,i-srLen);j--){ let ok=true; const h=c[j].high, l=c[j].low;
      if(s_===1){ if(h<=cl||h-cl>tol) continue; for(let q=j-srK;q<=j+srK&&ok;q++){ if(q!==j&&c[q]&&c[q].high>h) ok=false; } if(ok) return true; }
      else { if(l>=cl||cl-l>tol) continue; for(let q=j-srK;q<=j+srK&&ok;q++){ if(q!==j&&c[q]&&c[q].low<l) ok=false; } if(ok) return true; } }
    return false; };
  // LIQUIDITY-SWEEP filter: a candle that spiked above the recent high and closed back under it blocks BUY signals for a few candles; one that spiked below the recent low and closed back above it blocks SELL signals
  const swOn=Z.mruSwOn===true, swN=Math.max(3,Math.min(500,Math.round(+Z.mruSwN)||20)), swW=Math.max(1,Math.min(50,Math.round(+Z.mruSwW)||3)), swUp=new Array(m).fill(false), swDn=new Array(m).fill(false);
  if(swOn){ for(let i=swN;i<m;i++){ let hh=-1e18, ll=1e18; for(let j=i-swN;j<i;j++){ if(c[j].high>hh) hh=c[j].high; if(c[j].low<ll) ll=c[j].low; } if(c[i].high>hh&&c[i].close<hh) swUp[i]=true; if(c[i].low<ll&&c[i].close>ll) swDn[i]=true; } }
  // FOLLOW-THROUGH, HIGHER-TIMEFRAME, OVEREXTENSION and FLAT-EMA filters (each optional; the last three use their own EMA, independent of the main EMA filter)
  const ftOn=Z.mruFtOn===true, ftPct=Math.max(0,Math.min(100,+Z.mruFtPct||0));
  const ec={}, getE=n=>ec[n]||(ec[n]=mruEma(c,n));
  const mtfOn=Z.mruMtfOn===true, mtfMul=Math.max(2,Math.min(500,Math.round(+Z.mruMtfMul)||4)), mtfLen=Math.max(2,Math.min(500,Math.round(+Z.mruMtfLen)||50)); let mtfE=null;
  if(mtfOn&&m>6){ const dt=Math.max(1,c[m-1].time-c[m-2].time), gl=[], gi=new Array(m); let pg=null; for(let i=0;i<m;i++){ const g=Math.floor(c[i].time/(dt*mtfMul)); if(g!==pg){ gl.push({close:c[i].close}); pg=g; } else gl[gl.length-1].close=c[i].close; gi[i]=gl.length-1; }
    const ge=[]; let p=null; for(let k=0;k<gl.length;k++){ const a=2/(Math.min(k+1,mtfLen)+1); p=p==null?gl[k].close:gl[k].close*a+p*(1-a); ge.push(p); }
    mtfE=new Array(m).fill(null); for(let i=0;i<m;i++){ if(gi[i]>=1) mtfE[i]=ge[gi[i]-1]; } }   // value of the higher-timeframe EMA as of the last COMPLETED higher-timeframe bar (no repaint)
  const extOn=Z.mruExtOn===true, extLen=Math.max(2,Math.min(1000,Math.round(+Z.mruExtLen)||50)), extP=Math.max(0,+Z.mruExtP||0), extA=Math.max(0,+Z.mruExtA||0);
  const flOn=Z.mruFlatOn===true, flLen=Math.max(2,Math.min(1000,Math.round(+Z.mruFlatLen)||50)), flBars=Math.max(1,Math.min(500,Math.round(+Z.mruFlatBars)||10)), flPct=Math.max(0,+Z.mruFlatPct||0);
  const swHit=(i,s_)=>{ for(let j=Math.max(0,i-swW);j<i;j++){ if(s_===1?swUp[j]:swDn[j]) return true; } return false; };
  for(let i=1;i<last;i++){ const x=c[i], rg=x.high-x.low; if(!(rg>0)) continue; const bo=Math.abs(x.close-x.open); if(bo<pct*rg) continue;
    const uw=x.high-Math.max(x.open,x.close), lw=Math.min(x.open,x.close)-x.low; if(uw>wk*rg||lw>wk*rg) continue;
    if(ma>0&&bo<ma*(atr[i-1]||atr[i])) continue;
    const s=x.close>x.open?1:-1; if(s===1&&Z.mruDir==='Sell only') continue; if(s===-1&&Z.mruDir==='Buy only') continue;
    if(ema&&ema[i]!=null){ if(s===-1&&x.close>ema[i]) continue; if(s===1&&x.close<ema[i]) continue;
      if(dirOn&&i-dirL>=0&&ema[i-dirL]!=null){ const sl=(ema[i]-ema[i-dirL])/ema[i-dirL]*100; if(s===-1&&!(sl<-dirMin)) continue; if(s===1&&!(sl>dirMin)) continue; }   // EMA DIRECTION: SELL only while the EMA is falling, BUY only while it is rising
      const dd=Math.abs(x.close-ema[i]); if(distP>0&&dd<ema[i]*distP/100) continue; if(distA>0&&dd<distA*(atr[i-1]||atr[i]||0)) continue; }   // MINIMUM DISTANCE: the close must be clearly beyond the EMA, not just touching it   // EMA filter: SELL only below the EMA, BUY only above it; the other side is invalid
    if(lowV[i]) continue;
    if(mtfOn&&mtfE&&mtfE[i]!=null){ if(s===1&&x.close<mtfE[i]) continue; if(s===-1&&x.close>mtfE[i]) continue; }   // HIGHER-TIMEFRAME agreement: BUY only above the higher-timeframe EMA, SELL only below it
    if(extOn){ const e=getE(extLen)[i]; if(e!=null){ const dd=Math.abs(x.close-e); if((extP>0&&dd>e*extP/100)||(extA>0&&dd>extA*(atr[i-1]||atr[i]||0))) continue; } }   // OVEREXTENDED: price already too far from the EMA
    if(flOn&&i-flBars>=0){ const E=getE(flLen), e0=E[i-flBars], e1=E[i]; if(e0!=null&&e1!=null&&Math.abs(e1-e0)/e0*100<flPct) continue; }   // FLAT EMA: choppy market, no signal
    if(ftOn){ if(i+1>=last) continue; const nx=c[i+1], bd=Math.abs(x.close-x.open); if(s===1?(nx.close<x.close-ftPct/100*bd):(nx.close>x.close+ftPct/100*bd)) continue; }   // FOLLOW-THROUGH: the next candle must not take back most of the signal candle (the signal then shows one candle later)
    if(srOn&&srBlock(i,s,x.close)) continue;
    if(swOn&&swHit(i,s)) continue;
    if(s===1){ if(i-lastB<gapB) continue; lastB=i; } else { if(i-lastS<gapS) continue; lastS=i; }   // SPACING: minimum candles between signals of the same side (0 = off)
    ev.push({i,s}); sig.set(i,s); }
  const r={ev,sig}; mruCache[Z.sid]={k:key,r}; return r; }
function mruDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return;
  if(!mruTfOk(Z)){ cx.save(); cx.font='9px system-ui'; cx.textAlign='left'; cx.textBaseline='middle'; cx.fillStyle='rgba(209,212,220,0.75)'; cx.fillText('Fast Future Sniper: works on 1h and above',12,H-12); cx.restore(); return; }
  const r=mruRun(c,Z); if(!r) return;
  const fs=MRU_FS[Z.mruSize]||7.5, lbl=Z.mruLbl!==false, bt=MRU_BT[Z.mruBtnSz]||MRU_BT.Small, dist=Math.max(8,Math.round(Z.mruDist==null?40:Z.mruDist)), box=Z.mruBox===true,
    btB=Z.mruBtnBuy||'#2dd4a7', btS=Z.mruBtnSell||'#ff5d7a';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  { const en=mruEmaN(Z); if(en&&Z.mruEmaShow!==false){ const ea=mruEma(c,en); cx.strokeStyle=Z.mruEmaCol||'#f5b942'; cx.lineWidth=1.5; cx.beginPath(); let st=false;
      for(let i=Math.max(0,c.length-2000);i<c.length;i++){ if(ea[i]==null){ continue; } const xx=X(i), yy=Y(ea[i]); if(xx==null||yy==null){ st=false; continue; } if(!st){ cx.moveTo(xx,yy); st=true; } else cx.lineTo(xx,yy); } cx.stroke(); } }
  const glass=Z.mruStyle==='Glass lines';
  let glw=3; if(glass){ const a=X(c.length-1), b2=X(c.length-2), sp=(a!=null&&b2!=null)?Math.abs(a-b2):6; glw=Z.mruGlW==='Thin'?3:Z.mruGlW==='Wide'?Math.max(8,sp*3):Math.max(3,sp*0.9); }
  r.ev.slice(-Math.max(1,Math.round(Z.mruN)||300)).forEach(e=>{
    const bb=c[e.i], xt=X(e.i); if(!bb||xt==null||xt<-30||xt>W+30) return; const buy=e.s===1, k=buy?1:-1, y=Y(buy?bb.low:bb.high); if(y==null) return;
    if(glass){ const col=buy?btB:btS, L=xt-glw/2;   // GLASS LINE: a transparent vertical band over the signal candle, full height of the chart (top to bottom) like the session shading
      const g=cx.createLinearGradient(L,0,L+glw,0); g.addColorStop(0,rgba(col,0.42)); g.addColorStop(0.5,rgba(col,0.14)); g.addColorStop(1,rgba(col,0.42));
      cx.fillStyle=g; cx.fillRect(L,0,glw,H);
      const v=cx.createLinearGradient(0,0,0,H); v.addColorStop(0,'rgba(255,255,255,0.10)'); v.addColorStop(0.5,'rgba(255,255,255,0)'); v.addColorStop(1,'rgba(255,255,255,0.10)'); cx.fillStyle=v; cx.fillRect(L,0,glw,H);
      cx.fillStyle='rgba(255,255,255,0.30)'; cx.fillRect(L,0,1,H); cx.fillStyle=rgba(col,0.6); cx.fillRect(L+glw-1,0,1,H);
      if(box){ const y1=Y(bb.high), y2=Y(bb.low); if(y1!=null&&y2!=null){ cx.strokeStyle=rgba(col,0.8); cx.lineWidth=1.2; cx.strokeRect(xt-5,Math.min(y1,y2)-2,10,Math.abs(y2-y1)+4); } }
      return; }
    const w=bt[0],h=bt[1],fz=bt[2], ty=y+k*dist, by=k===1?ty+h:ty-h, top=Math.min(ty,by), col=buy?btB:btS;
    if(box){ const y1=Y(bb.high), y2=Y(bb.low); if(y1!=null&&y2!=null){ cx.strokeStyle=rgba(col,0.8); cx.lineWidth=1.2; cx.strokeRect(xt-5,Math.min(y1,y2)-2,10,Math.abs(y2-y1)+4); } }
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y+k*3); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y+k*3,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.fillText(buy?'BUY':'SELL',xt,top+h/2+.5);
  });
  cx.globalAlpha=1; cx.restore(); }
STRATS.mru={label:'Fast Future Sniper Pro Plus \u00b7 SELL right after a strong bearish candle closes, BUY right after a strong bullish candle closes',short:'Fast Future Sniper Pro Plus',own:true,
  defs:{limit:false,useSl:false,mruDir:'Both',mruPct:90,mruWick:5,mruAtr:0.8,mruWait:true,mruEma:'Off',mruEmaLen:50,mruGapB:0,mruGapS:0,mruFtOn:false,mruFtPct:50,mruMtfOn:false,mruMtfMul:4,mruMtfLen:50,mruExtOn:false,mruExtLen:50,mruExtP:5,mruExtA:0,mruFlatOn:false,mruFlatLen:50,mruFlatBars:10,mruFlatPct:0.3,mruSrOn:false,mruSrLen:100,mruSrK:5,mruSrPct:0.5,mruSrAtr:0,mruSwOn:false,mruSwN:20,mruSwW:3,mruDirOn:false,mruDirLen:5,mruDirMin:0,mruDistP:0,mruDistA:0,mruVolOn:false,mruVolX:1.2,mruVolLen:20,mruEmaShow:true,mruEmaCol:'#f5b942',mruHtf:true,mruBox:false,mruStyle:'Buttons',mruGlW:'Candle',mruDist:40,mruBtnSz:'Small',mruBtnBuy:'#2dd4a7',mruBtnSell:'#ff5d7a',mruN:300,mruSig:true},
  inputs:(b,d)=>{
    fld(b,d,'mruDir','sel','Trade direction',{opts:['Both','Buy only','Sell only']});
    fld(b,d,'mruPct','num','Body must be at least this % of the candle range',{min:60,max:100,step:1});
    fld(b,d,'mruWick','num','Max wick on each side (% of range, 0 = no wick at all)',{min:0,max:30,step:1});
    fld(b,d,'mruAtr','num','Ignore small candles (body below x ATR, 0 = off)',{min:0,max:5,step:0.1});
    fld(b,d,'mruEma','sel','EMA filter: SELL only below the EMA, BUY only above it (the other side is not shown)',{opts:['Off','50','100','200','Custom']});
    fld(b,d,'mruEmaLen','num','Custom EMA period (used when the filter is set to Custom)',{min:2,max:1000,step:1});
    fld(b,d,'mruEmaShow','chk','Draw the EMA line on the chart'); fld(b,d,'mruEmaCol','col','EMA line colour');
    fld(b,d,'mruFtOn','chk','FOLLOW-THROUGH filter: the next candle must not take back most of the signal candle (the signal then shows one candle later)');
    fld(b,d,'mruFtPct','num','Drop the signal if the next candle gives back more than this % of the signal candle (50 = half)',{min:0,max:100,step:5});
    fld(b,d,'mruMtfOn','chk','HIGHER-TIMEFRAME filter: BUY only above, SELL only below the EMA of a bigger timeframe');
    fld(b,d,'mruMtfMul','num','Bigger timeframe = this many times the chart timeframe (4 on 1h = 4h, 24 on 1h = 1D)',{min:2,max:500,step:1});
    fld(b,d,'mruMtfLen','num','EMA period on the bigger timeframe',{min:2,max:500,step:1});
    fld(b,d,'mruExtOn','chk','OVEREXTENSION filter: skip signals when price is already far from the EMA (chasing)');
    fld(b,d,'mruExtLen','num','EMA period used for the overextension check',{min:2,max:1000,step:1});
    fld(b,d,'mruExtP','num','Too far = more than this % of price away from that EMA (0 = off)',{min:0,max:100,step:0.5});
    fld(b,d,'mruExtA','num','Or more than this many ATR away (0 = off)',{min:0,max:50,step:0.5});
    fld(b,d,'mruFlatOn','chk','FLAT-EMA filter: no signals while the EMA is flat (choppy market)');
    fld(b,d,'mruFlatLen','num','EMA period used for the flat check',{min:2,max:1000,step:1});
    fld(b,d,'mruFlatBars','num','Measure the EMA movement over the last N candles',{min:1,max:500,step:1});
    fld(b,d,'mruFlatPct','num','Flat = the EMA moved less than this % over those candles',{min:0,max:20,step:0.05});
    fld(b,d,'mruSrOn','chk','SUPPORT / RESISTANCE filter: skip a BUY right under a recent swing high, a SELL right above a recent swing low');
    fld(b,d,'mruSrLen','num','Look for swing highs / lows in the last N candles',{min:10,max:2000,step:10});
    fld(b,d,'mruSrK','num','A swing = highest / lowest of this many candles each side',{min:1,max:30,step:1});
    fld(b,d,'mruSrPct','num','"Right under / above" = within this % of price (0.5 = half a percent)',{min:0,max:20,step:0.05});
    fld(b,d,'mruSrAtr','num','Or within this many ATR (0 = off, the larger of the two is used)',{min:0,max:20,step:0.1});
    fld(b,d,'mruSwOn','chk','LIQUIDITY-SWEEP filter: after a spike through a recent high that fell back, BUYs are blocked; after a spike through a recent low that bounced, SELLs are blocked');
    fld(b,d,'mruSwN','num','Recent high / low = the last N candles',{min:3,max:500,step:1});
    fld(b,d,'mruSwW','num','A sweep blocks the opposite signal for this many candles',{min:1,max:50,step:1});
    fld(b,d,'mruGapB','num','SPACING: minimum candles between BUY signals (0 = off, e.g. 10, 20, 50)',{min:0,max:5000,step:1});
    fld(b,d,'mruGapS','num','SPACING: minimum candles between SELL signals (0 = off, e.g. 10, 20, 50)',{min:0,max:5000,step:1});
    fld(b,d,'mruDirOn','chk','EMA DIRECTION filter (needs an EMA above): SELL only while the EMA is falling, BUY only while it is rising');
    fld(b,d,'mruDirLen','num','Direction is measured over the last N candles',{min:1,max:200,step:1});
    fld(b,d,'mruDirMin','num','EMA must move at least this % over those candles (0 = any direction, 0.2 = clearly sloping, flat EMA ignored)',{min:0,max:20,step:0.05});
    fld(b,d,'mruDistP','num','MINIMUM DISTANCE from the EMA, % of price (0 = off, e.g. 0.3)',{min:0,max:50,step:0.05});
    fld(b,d,'mruDistA','num','MINIMUM DISTANCE from the EMA, in ATR (0 = off, e.g. 0.5)',{min:0,max:20,step:0.1});
    fld(b,d,'mruVolOn','chk','VOLUME filter: the signal candle needs enough volume (a full-body candle on thin volume is often a push, not a real move)');
    fld(b,d,'mruVolX','num','Signal candle volume must be at least this many times the average (1.2 = 20% above average)',{min:0.1,max:20,step:0.1});
    fld(b,d,'mruVolLen','num','Average volume measured over the previous N candles',{min:3,max:500,step:1});
    fld(b,d,'mruWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'mruHtf','chk','Only on 1h and higher timeframes (no signals below 1h)');
    fld(b,d,'mruBox','chk','Outline the signal candle');
    fld(b,d,'mruStyle','sel','Signal style: BUY / SELL buttons, or glass lines from top to bottom of the screen (like the sessions)',{opts:['Buttons','Glass lines']});
    fld(b,d,'mruGlW','sel','Glass line width (used when the style is Glass lines)',{opts:['Thin','Candle','Wide']});
    fld(b,d,'mruBtnSz','sel','BUY / SELL button size',{opts:['Tiny','Small','Normal']}); fld(b,d,'mruDist','num','Button distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'mruBtnBuy','col','BUY colour (button / glass line)'); fld(b,d,'mruBtnSell','col','SELL colour (button / glass line)');
    fld(b,d,'mruN','num','Signals shown on chart',{min:1,max:2000,step:10});
    fld(b,d,'mruSig','chk','BUY / SELL signals'); },
  sig:(c,i,n,Z)=>{ if(Z.mruSig===false||c.length<20) return 0; const r=mruRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.mru='Strategy \u00b7 instant SELL / BUY after a full-body candle closes (1h and above)'; }catch(e){}
{ const _muD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='mruview') return mruDraw(d,X,Y,W,H); return _muD.apply(this,arguments); };
  const _muR=recomputeExtras; recomputeExtras=function(){ _muR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='mru'&&stVis(Z)) scriptBoxes.push({type:'mruview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('mru strategy failed',err); window.__mruErr=err; }


}

// ===== beg =====
{
// [beg] STRATEGY · "Bullish Engulfing"   (self-contained: every name starts with beg / BEG)
// Two candles: (1) a red / bearish candle that is part of a downtrend, immediately followed by
// (2) a green / bullish candle that completely engulfs it: it starts at (or below) the previous close and
// closes ABOVE the previous high. The bull candle should have minimal to no upper / lower wick (it closes at or near its top).
// BUY right after the engulfing candle closes (the candle that is still forming is never used).
// Same small BUY button as Fast Future Sniper / Engulfing Candle + RSI. Hooks: STRATS.beg + draw + recomputeExtras.
// =====================================================================================
try{
const BEG_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const BEG_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
function begAtr(c,n){ const o=new Array(c.length).fill(0); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*(n-1)+tr)/n; o[i]=p; } return o; }
const begCache={};
function begRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.begMode,Z.begWick,Z.begTol,Z.begTrend,Z.begLook,Z.begAtr,Z.begWait].join('|');
  const h=begCache[Z.sid]; if(h&&h.k===key) return h.r;
  const wk=Math.min(0.5,Math.max(0,(Z.begWick==null?10:+Z.begWick)/100)), tol=Math.max(0,(Z.begTol==null?10:+Z.begTol)/100), lb=Math.max(1,Math.round(Z.begLook==null?5:Z.begLook)),
    ma=Z.begAtr==null?0:+Z.begAtr, md=Z.begMode||'Close above previous high', last=Z.begWait===false?m:m-1, atr=ma>0?begAtr(c,14):null, ev=[], sig=new Map();
  for(let i=1;i<last;i++){ const p=c[i-1], x=c[i], rg=x.high-x.low, pr=p.high-p.low;
    if(!(rg>0)||!(p.close<p.open)||!(x.close>x.open)) continue;                                      // red candle, then green candle
    if(Z.begTrend!==false){ if(i-1-lb<0||!(p.close<c[i-1-lb].close)) continue; }                    // red candle belongs to a downtrend
    if(x.open>p.close+tol*pr) continue;                                                              // buyers start at the previous close (or lower)
    if(md==='Close above previous high'){ if(!(x.close>p.high)) continue; }
    else if(md==='Body engulfs body'){ if(!(x.close>=p.open)) continue; }
    else { if(!(x.close>=p.open&&x.high>=p.high&&x.low<=p.low)) continue; }                          // full range engulfs
    const uw=x.high-x.close, lw=x.open-x.low; if(uw>wk*rg||lw>wk*rg) continue;                       // minimal to no wick
    if(atr&&Math.abs(x.close-x.open)<ma*(atr[i-1]||atr[i])) continue;
    ev.push({i,s:1}); sig.set(i,1); }
  const r={ev,sig}; begCache[Z.sid]={k:key,r}; return r; }
const begBH={Tiny:9,Small:12,Normal:16,Large:20};
function begBolt(x,yTop,h,col){ const w=h*0.62, ox=x-w/2, pts=[[0.66,0],[0.06,0.56],[0.44,0.56],[0.30,1],[0.94,0.38],[0.56,0.38],[0.66,0]];
  cx.save(); cx.setLineDash([]); cx.shadowColor=col; cx.shadowBlur=7; cx.fillStyle=col; cx.beginPath(); pts.forEach((q,k)=>{ const px=ox+q[0]*w, py=yTop+q[1]*h; if(k) cx.lineTo(px,py); else cx.moveTo(px,py); }); cx.closePath(); cx.fill();
  cx.shadowBlur=0; cx.strokeStyle='rgba(255,255,255,0.7)'; cx.lineWidth=0.8; cx.stroke(); cx.restore(); }
function begCounter(Z,r,X,W,H){   // optional tiny transparent box: bolt + number of bullish engulfings (no label) = how much bullish power is in the market
  const bh=begBH[Z.begCntSz]||9, col=Z.begBoltCol||'#00e676', N=Math.round(Z.begCntN==null?100:+Z.begCntN)||0, m=(typeof candles!=='undefined'&&candles)?candles.length:0, from=N>0?m-N:0;   // counts the LAST N candles: the number does not change when the chart is dragged
  let n=0; r.ev.forEach(e=>{ if(e.i>=from) n++; });
  const txt=String(n), fz=Math.max(8,Math.round(bh*0.95)), pad=4, gap=3, iw=bh*0.62, v=parseInt(String(col).replace('#',''),16)||0, rg=a=>'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')';
  cx.save(); cx.setLineDash([]); cx.font='bold '+fz+'px system-ui'; const tw=cx.measureText(txt).width, bw=pad*2+iw+gap+tw, hh=bh+pad*2-2, ps=Z.begCntPos||'Bottom right', mg=8,
    x0=ps.indexOf('right')>=0?W-bw-mg:mg, y0=ps.indexOf('Top')===0?34:H-hh-mg, x=Math.max(0,Math.min(W-bw,x0+(+Z.begCntX||0))), y=Math.max(0,Math.min(H-hh,y0+(+Z.begCntY||0))), q=Math.min(5,hh/2);
  cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+bw,y,x+bw,y+hh,q); cx.arcTo(x+bw,y+hh,x,y+hh,q); cx.arcTo(x,y+hh,x,y,q); cx.arcTo(x,y,x+bw,y,q); cx.closePath();
  cx.fillStyle='rgba(0,0,0,0.22)'; cx.fill(); cx.strokeStyle=rg(0.45); cx.lineWidth=1; cx.stroke();
  begBolt(x+pad+iw/2,y+(hh-bh)/2,bh,col);
  cx.fillStyle=col; cx.textAlign='left'; cx.textBaseline='middle'; cx.fillText(txt,x+pad+iw+gap,y+hh/2+0.5); cx.restore(); }
function begDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=begRun(c,Z); if(!r) return;
  const fs=BEG_FS[Z.begSize]||7.5, lbl=Z.begLbl!==false, box=Z.begBox!==false, bt=BEG_BT[Z.begBtnSz]||BEG_BT.Small, dist=Math.max(8,Math.round(Z.begDist==null?40:Z.begDist)),
    btB=Z.begBtnBuy||'#2dd4a7', bxc=Z.begBoxCol||'#2dd4a7';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  r.ev.slice(-Math.max(1,Math.round(Z.begN)||300)).forEach(e=>{
    const p=c[e.i-1], bb=c[e.i], xt=X(e.i), xp=X(e.i-1); if(!bb||!p||xt==null||xt<-30||xt>W+30) return;
    const lo=Math.min(p.low,bb.low), hi=Math.max(p.high,bb.high), yLo=Y(lo), yHi=Y(hi); if(yLo==null||yHi==null) return;
    // outline around the two candles: red candle + the green candle that engulfs it
    if(box&&xp!=null){ const hw=Math.max(3,Math.abs(xt-xp)*0.5+2); cx.fillStyle=rgba(bxc,0.10); cx.strokeStyle=rgba(bxc,0.75); cx.lineWidth=1; rr(xp-hw+1,Math.min(yHi,yLo)-3,xt-xp+2*hw-2,Math.abs(yLo-yHi)+6,3); cx.fill(); cx.stroke(); }
    const sb=Z.begSig!==false&&Z.begBtn!==false, bolt=Z.begBolt===true, bside=Z.begBoltPos==='Beside the button', bh=begBH[Z.begBoltSz]||12, bc=Z.begBoltCol||'#00e676', yb0=Math.max(yLo,yHi)+(box?3:0);
    if(bolt&&(!bside||!sb)) begBolt(xt,yb0+3,bh,bc);                    // bullish bolt sits BELOW the candles
    if(!sb) return;                                                      // BUY signals off / BUY button off: no button
    const y=yb0+((bolt&&!bside)?bh+5:0), ty=y+dist, w=bt[0],h=bt[1],fz=bt[2], top=ty, col=btB;
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y+3); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y+3,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText('BUY',xt,top+h/2+.5);
    if(lbl){ cx.font=(fs-1)+'px system-ui'; cx.fillStyle='rgba(209,212,220,0.9)'; cx.fillText('bullish engulfing',xt,top+h+fs); }
    if(bolt&&bside) begBolt(xt+w/2+bh*0.4+5,top+h/2-bh/2,bh,bc);       // optional: bolt beside the BUY button
  });
  if(Z.begCnt===true) begCounter(Z,r,X,W,H);
  cx.globalAlpha=1; cx.restore(); }
STRATS.beg={label:'Bullish Engulfing \u00b7 red candle in a downtrend, then a green candle that engulfs it (closes above its high) with no wick = BUY',short:'Bullish Engulfing',own:true,
  defs:{limit:false,useSl:false,short:false,begMode:'Close above previous high',begTrend:true,begLook:5,begTol:10,begWick:10,begAtr:0,begWait:true,begBox:true,begLbl:true,begDist:40,begBtnSz:'Small',begBtnBuy:'#2dd4a7',begBoxCol:'#2dd4a7',begBtn:true,begCnt:false,begCntN:100,begCntX:0,begCntY:0,begCntPos:'Bottom right',begCntSz:'Tiny',begBolt:false,begBoltSz:'Small',begBoltPos:'On the candles (bullish below, bearish above)',begBoltCol:'#00e676',begN:300,begSize:'Small',begSig:true},
  inputs:(b,d)=>{ Object.keys(STRATS.beg.defs).forEach(k=>{ if(k.indexOf('beg')===0&&d[k]===undefined) d[k]=STRATS.beg.defs[k]; });
    fld(b,d,'begMode','sel','Engulfing rule',{opts:['Close above previous high','Body engulfs body','Full range engulfs']});
    fld(b,d,'begTrend','chk','Red candle must be part of a downtrend'); fld(b,d,'begLook','num','Downtrend look-back (price must be lower than this many bars ago)',{min:1,max:50,step:1});
    fld(b,d,'begTol','num','Green candle opens at / below previous close (tolerance, % of previous range)',{min:0,max:100,step:1});
    fld(b,d,'begWick','num','Max upper / lower wick on the green candle (% of its range, 0 = no wick at all)',{min:0,max:50,step:1});
    fld(b,d,'begAtr','num','Ignore small green candles (body below x ATR, 0 = off)',{min:0,max:5,step:0.1});
    fld(b,d,'begWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'begBox','chk','Outline the two candles'); fld(b,d,'begBoxCol','col','Outline colour');
    fld(b,d,'begBtnSz','sel','BUY button size',{opts:['Tiny','Small','Normal']}); fld(b,d,'begDist','num','Button distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'begBtn','chk','Show the BUY button on the chart (off = hide it, outline and bolt stay)'); fld(b,d,'begBtnBuy','col','BUY button colour'); fld(b,d,'begLbl','chk','Show small note under the button');
    fld(b,d,'begBolt','chk','Also show a lightning bolt on every bullish engulfing (optional, the BUY button stays)'); fld(b,d,'begBoltCol','col','Bullish bolt colour (green)');
    fld(b,d,'begCnt','chk','Show a tiny transparent counter box: bolt + number of bullish engulfings (no label, optional)'); fld(b,d,'begCntN','num','Counter counts the last N candles (0 = all loaded). Stays the same when you drag the chart',{min:0,max:50000,step:10});
    fld(b,d,'begCntPos','sel','Counter position',{opts:['Top left','Top right','Bottom left','Bottom right']}); fld(b,d,'begCntSz','sel','Counter size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'begCntX','num','Counter nudge: left (-) / right (+) in px, from the chosen corner',{min:-800,max:800,step:4}); fld(b,d,'begCntY','num','Counter nudge: up (-) / down (+) in px, from the chosen corner',{min:-800,max:800,step:4});
    fld(b,d,'begBoltSz','sel','Bolt size',{opts:['Tiny','Small','Normal','Large']}); fld(b,d,'begBoltPos','sel','Bolt position',{opts:['On the candles (bullish below, bearish above)','Beside the button']});
    fld(b,d,'begN','num','Signals shown on chart',{min:1,max:2000,step:10}); fld(b,d,'begSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'begSig','chk','BUY signals (off = no signals and no BUY button)'); },
  sig:(c,i,n,Z)=>{ if(Z.begSig===false||c.length<20) return 0; const r=begRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.beg='Strategy \u00b7 red candle in a downtrend followed by a green candle that engulfs it, closes above its high, no wick = BUY'; }catch(e){}
{ const _beD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='begview') return begDraw(d,X,Y,W,H); return _beD.apply(this,arguments); };
  const _beR=recomputeExtras; recomputeExtras=function(){ _beR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='beg'&&stVis(Z)) scriptBoxes.push({type:'begview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('beg strategy failed',err); window.__begErr=err; }

}

// ===== ccp =====
{
// [ccp] STRATEGY · "Candlestick Counter Premium"   (self-contained: every name starts with ccp / CCP)
// Counts consecutive bearish / bullish candles. A run that reaches the minimum QUALIFIES the setup; the setup then waits
// (indefinitely by default) until the first OPPOSITE candle CLOSES -> one BUY (after bearish run) / one SELL (after bullish run)
// on that confirming candle. The maximum is only the initial range: a run longer than the maximum stays qualified.
// A doji (close = open) is neither colour: it resets an unqualified count but never cancels a qualified setup and never signals.
// Only closed candles are used (the forming candle is ignored), so signals never move or repaint.
// Hooks: STRATS.ccp + draw + recomputeExtras.
// =====================================================================================
try{
try{ const A=window.mpvAuth; if(A&&typeof A.lockStrat==='function'&&!A.__ccpMetal){ A.__ccpMetal=true; const _ls=A.lockStrat.bind(A);   // Candlestick Pro Plus Counter Premium is a METAL-plan strategy
  const METAL={ccp:'Candlestick Pro Plus Counter Premium',mru:'Fast Future Sniper Pro Plus'}; A.lockStrat=function(k,quiet,name){ if(METAL[k]&&typeof A.can==='function'&&!A.can('metal')){ if(!quiet){ try{ toast(METAL[k]+' needs the Metal plan','#ff5d7a'); }catch(e){} try{ if(window.mpvOpenUnlock) window.mpvOpenUnlock('Metal'); }catch(e){} } return true; } return _ls(k,quiet,name); }; } }catch(e){ console.error('ccp metal gate',e); }
const CCP_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const CCP_BT={Tiny:[30,13,7.5],Small:[38,16,9],Normal:[48,20,11]};
const ccpCache={};
function ccpRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.ccpBMin,Z.ccpBMax,Z.ccpSMin,Z.ccpSMax,Z.ccpBuy,Z.ccpSell,Z.ccpDoji,Z.ccpExp,Z.ccpWait,Z.ccpBConf,Z.ccpSConf,Z.ccpBGap,Z.ccpSGap,Z.ccpBigOn,Z.ccpBigX,Z.ccpBigLen,Z.ccpBigPct,Z.ccpSmallRst,Z.ccpVolOn,Z.ccpVolX,Z.ccpVolLen,Z.ccpWkOn,Z.ccpWkMin,Z.ccpScOn,Z.ccpScMin,Z.ccpRecOn,Z.ccpRecMin,Z.ccpRpOn,Z.ccpRpPct,Z.ccpSpOn,Z.ccpSpX,Z.ccpSpLen,Z.ccpLocOn,Z.ccpLocLen,Z.ccpLocPct,Z.ccpSesOn,Z.ccpSesFrom,Z.ccpSesTo].join('|');
  const h=ccpCache[Z.sid]; if(h&&h.k===key) return h.r;
  const iv=(v,d)=>{ v=Math.round(+v); return isFinite(v)&&v>=2?Math.min(50,v):d; };            // validate: whole number 2..50
  const bMin=iv(Z.ccpBMin,4), bMax=Math.max(bMin,iv(Z.ccpBMax,8)), sMin=iv(Z.ccpSMin,4), sMax=Math.max(sMin,iv(Z.ccpSMax,8));   // max can never be below min
  const keep=Z.ccpDoji!==false, exp=Math.max(0,Math.round(Z.ccpExp==null?0:Z.ccpExp)), wantB=Z.ccpBuy!==false, wantS=Z.ccpSell!==false;
  const cf=v=>{ v=Math.round(+v); return isFinite(v)&&v>=1?Math.min(1000,v):1; }, bConf=cf(Z.ccpBConf), sConf=cf(Z.ccpSConf);   // 1 = classic (signal on the first opposite candle); 2 or more (any number) = signal on the Nth opposite candle, yellow PREPARE dot before it
  const last=Z.ccpWait===false?m:m-1, cnt=new Array(m).fill(0), dir=new Array(m).fill(0), ev=[], prep=[], sig=new Map();
  const gp=v=>{ v=Math.round(+v); return isFinite(v)&&v>0?Math.min(5000,v):0; }, bGap=gp(Z.ccpBGap), sGap=gp(Z.ccpSGap);   // optional cooldown: minimum candles since the previous SHOWN signal of the same side (0 = off)
  // optional BIG-candle filter: a candle is BIG when its body >= X times the average body of the previous N candles (and, optionally, >= a minimum body % of price). Small candles = noise / manipulation.
  const bm=Z.ccpBigOn||'Off', fRun=bm==='Run + confirm'||bm==='Run only', fConf=bm==='Run + confirm'||bm==='Confirm only', rstSmall=Z.ccpSmallRst===true;
  const bx=+Z.ccpBigX>0?+Z.ccpBigX:1, bl=Math.max(3,Math.min(500,Math.round(+Z.ccpBigLen)||20)), bp=Math.max(0,+Z.ccpBigPct||0), big=new Array(m).fill(true);
  if(fRun||fConf){ let sm=0; for(let i=0;i<m;i++){ const bd=Math.abs(c[i].close-c[i].open), n=Math.min(i,bl), av=n>0?sm/n:bd; big[i]=i<3||(bd>=bx*av&&(!bp||bd/(c[i].close||1)*100>=bp)); sm+=bd; if(i>=bl) sm-=Math.abs(c[i-bl].close-c[i-bl].open); } }
  // optional VOLUME confirmation: the confirming candle needs volume >= X times the average of the previous N candles (thin-volume moves are often manipulation); skipped when the data has no volume
  const vOn=Z.ccpVolOn===true, vx=+Z.ccpVolX>0?+Z.ccpVolX:1.2, vl=Math.max(3,Math.min(500,Math.round(+Z.ccpVolLen)||20)), lowV=new Array(m).fill(false);
  if(vOn){ let sv=0; for(let i=0;i<m;i++){ const v=+c[i].volume||0, n=Math.min(i,vl), av=n>0?sv/n:0; lowV[i]=i>=3&&av>0&&v<vx*av; sv+=v; if(i>=vl) sv-=(+c[i-vl].volume||0); } }
  // optional WICK filter (body must be >= X% of the candle's full high-low height) and STRONG-CLOSE filter (BUY candle closes in its top X%, SELL candle in its bottom X%): a confirming candle that fails is ignored
  const wkOn=Z.ccpWkOn===true, wkMin=Math.max(1,Math.min(100,+Z.ccpWkMin||60)), scOn=Z.ccpScOn===true, scMin=Math.max(1,Math.min(100,+Z.ccpScMin||70)), weakC=new Array(m).fill(false);
  if(wkOn||scOn){ for(let i=0;i<m;i++){ const x=c[i], rg=x.high-x.low; if(!(rg>0)) continue; const bd=Math.abs(x.close-x.open), up=x.close>x.open;
    if(wkOn&&bd/rg*100<wkMin) weakC[i]=true; if(scOn&&((up&&(x.close-x.low)/rg*100<scMin)||(!up&&x.close<x.open&&(x.high-x.close)/rg*100<scMin))) weakC[i]=true; } }
  // optional SPIKE filter (a candle whose high-low range is more than X times the average range = news spike / stop hunt: ignored completely), RUN-SIZE filter (the run must move at least X% of price to qualify)
  // and RECOVERY filter (a confirming candle must win back at least X% of the run's move)
  const spOn=Z.ccpSpOn===true, spx=+Z.ccpSpX>0?+Z.ccpSpX:3, spl=Math.max(3,Math.min(500,Math.round(+Z.ccpSpLen)||20)), spk=new Array(m).fill(false);
  if(spOn){ let sr=0; for(let i=0;i<m;i++){ const rg=c[i].high-c[i].low, n=Math.min(i,spl), av=n>0?sr/n:0; spk[i]=i>=3&&av>0&&rg>spx*av; sr+=rg; if(i>=spl) sr-=(c[i-spl].high-c[i-spl].low); } }
  const rpOn=Z.ccpRpOn===true, rpPct=Math.max(0,+Z.ccpRpPct||0), recOn=Z.ccpRecOn===true, recMin=Math.max(0,Math.min(200,+Z.ccpRecMin||0));
  // optional LOCATION filter (BUY only in the lower part of the recent range, SELL only in the upper part) and SESSION filter (confirming candles are ignored during the hours you block, device local time)
  const locOn=Z.ccpLocOn===true, locLen=Math.max(5,Math.min(2000,Math.round(+Z.ccpLocLen)||100)), locPct=Math.max(1,Math.min(99,+Z.ccpLocPct||40)), pos=new Array(m).fill(50);
  if(locOn){ for(let i=0;i<m;i++){ let hi=-1e18, lo=1e18; for(let j=Math.max(0,i-locLen+1);j<=i;j++){ if(c[j].high>hi) hi=c[j].high; if(c[j].low<lo) lo=c[j].low; } pos[i]=hi>lo?(c[i].close-lo)/(hi-lo)*100:50; } }
  const sesOn=Z.ccpSesOn===true, sF=Math.max(0,Math.min(23,Math.round(+Z.ccpSesFrom||0))), sT=Math.max(0,Math.min(24,Math.round(Z.ccpSesTo==null?6:+Z.ccpSesTo))), sesBad=new Array(m).fill(false);
  if(sesOn&&sF!==sT){ for(let i=0;i<m;i++){ const h=new Date(c[i].time*1000).getHours(); sesBad[i]=sF<sT?(h>=sF&&h<sT):(h>=sF||h<sT); } }
  let bRS=0,bRL=0,sRS=0,sRH=0,bSS=0,bSL=0,sSS=0,sSH=0;   // run start / extreme (unfinished run) and setup start / extreme (qualified setup)
  let bear=0, bull=0, bQ=false, sQ=false, bQi=-1, sQi=-1, bG=0, sG=0, lastB=-1e9, lastS=-1e9;
  for(let i=0;i<last;i++){ const x=c[i], up=x.close>x.open, dn=x.close<x.open, runSm=(fRun&&!big[i])||spk[i], confSm=(fConf&&!big[i])||lowV[i]||weakC[i]||spk[i]||sesBad[i];
    if(exp>0){ if(bQ&&i-bQi>exp){ bQ=false; bear=0; } if(sQ&&i-sQi>exp){ sQ=false; bull=0; } }   // optional expiry (off by default)
    if(dn){                                                       // bearish candle closed
      const recS=(recOn&&sQ&&(sSH-sSS)>0&&((sSH-x.close)/(sSH-sSS)*100<recMin))||(locOn&&pos[i]<100-locPct);
      if(sQ&&!confSm&&!recS){ sG++; if(sG>=sConf){ if(wantS&&i-lastS>=sGap){ ev.push({i,s:-1}); sig.set(i,-1); lastS=i; } sQ=false; sG=0; } else if(wantS&&sG===1) prep.push({i,s:-1}); }   // Nth bearish candle closed -> one SELL (earlier ones = yellow prepare dot; candles of the other colour in between are allowed)
      if(runSm){ if(rstSmall&&!spk[i]){ if(!bQ||!keep){ bQ=false; bear=0; } if(!sQ||!keep){ sQ=false; bull=0; } } }   // small candle: ignored (or resets an unfinished run)
      else { if(bear===0){ bRS=x.open; bRL=x.low; } else bRL=Math.min(bRL,x.low); bull=0; bear++; if(!bQ&&bear>=bMin&&(!rpOn||(bRS-bRL)/(bRS||1)*100>=rpPct)){ bQ=true; bQi=i; bG=0; bSS=bRS; bSL=bRL; } if(bQ) bSL=Math.min(bSL,x.low);
      cnt[i]=bear; dir[i]=-1; }
    } else if(up){                                                // bullish candle closed
      const recB=(recOn&&bQ&&(bSS-bSL)>0&&((x.close-bSL)/(bSS-bSL)*100<recMin))||(locOn&&pos[i]>locPct);
      if(bQ&&!confSm&&!recB){ bG++; if(bG>=bConf){ if(wantB&&i-lastB>=bGap){ ev.push({i,s:1}); sig.set(i,1); lastB=i; } bQ=false; bG=0; } else if(wantB&&bG===1) prep.push({i,s:1}); }     // Nth bullish candle closed -> one BUY (earlier ones = yellow prepare dot; reds in between are allowed)
      if(runSm){ if(rstSmall&&!spk[i]){ if(!bQ||!keep){ bQ=false; bear=0; } if(!sQ||!keep){ sQ=false; bull=0; } } }
      else { if(bull===0){ sRS=x.open; sRH=x.high; } else sRH=Math.max(sRH,x.high); bear=0; bull++; if(!sQ&&bull>=sMin&&(!rpOn||(sRH-sRS)/(sRS||1)*100>=rpPct)){ sQ=true; sQi=i; sG=0; sSS=sRS; sSH=sRH; } if(sQ) sSH=Math.max(sSH,x.high);
      cnt[i]=bull; dir[i]=1; }
    } else {                                                      // doji: never counts, never signals
      if(!bQ||!keep){ bQ=false; bear=0; } if(!sQ||!keep){ sQ=false; bull=0; }   // unqualified counts reset; qualified setups survive
    }
  }
  const r={ev,prep,sig,cnt,dir,bMin,sMin}; ccpCache[Z.sid]={k:key,r}; return r; }
function ccpDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<5) return; const r=ccpRun(c,Z); if(!r) return;
  const fs=CCP_FS[Z.ccpSize]||7.5, lbl=Z.ccpLbl!==false, bt=CCP_BT[Z.ccpBtnSz]||CCP_BT.Small, dist=Math.max(8,Math.round(Z.ccpDist==null?30:Z.ccpDist)),
    cB=Z.ccpBtnBuy||'#2dd4a7', cS=Z.ccpBtnSell||'#ff5d7a', showB=Z.ccpBuyOn!==false, showS=Z.ccpSellOn!==false, showC=Z.ccpCount===true;
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const shade=(hex,k)=>{ const v=parseInt(String(hex).replace('#',''),16); const f=a=>Math.max(0,Math.min(255,Math.round(a*k))); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
  const rr=(x,y,w,h,q)=>{ cx.beginPath(); cx.moveTo(x+q,y); cx.arcTo(x+w,y,x+w,y+h,q); cx.arcTo(x+w,y+h,x,y+h,q); cx.arcTo(x,y+h,x,y,q); cx.arcTo(x,y,x+w,y,q); cx.closePath(); };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textAlign='center'; cx.textBaseline='middle';
  if(showC){ cx.font=(fs)+'px system-ui';                                          // small count numbers: bullish above, bearish below
    for(let i=Math.max(0,c.length-1500);i<c.length;i++){ if(!r.dir[i]) continue; const xt=X(i); if(xt==null||xt<-10||xt>W+10) continue;
      const y=r.dir[i]===1?Y(c[i].high):Y(c[i].low); if(y==null) continue; const q=r.dir[i]===1?(r.cnt[i]>=r.sMin):(r.cnt[i]>=r.bMin);
      cx.fillStyle=r.dir[i]===1?rgba(cS,q?0.95:0.55):rgba(cB,q?0.95:0.55); cx.fillText(String(r.cnt[i]),xt,r.dir[i]===1?y-fs:y+fs); } }
  if(Z.ccpPrep!==false&&r.prep&&r.prep.length){ r.prep.slice(-Math.max(1,Math.round(Z.ccpN)||300)).forEach(e=>{   // PREPARE: glass column on the FIRST confirming candle only, full chart height, one candle wide
    if(e.s===1?!showB:!showS) return; const xt=X(e.i); if(xt==null||xt<-30||xt>W+30) return;
    const xn=X(e.i+1), xp=X(e.i-1); let bs=(xn!=null&&xn-xt>1)?xn-xt:(xp!=null&&xt-xp>1)?xt-xp:8; bs=Math.max(4,bs); const x0=xt-bs/2;
    const pc=e.s===1?cB:cS;   // glass takes the candle's colour: green column on a green (BUY side) candle, red column on a red (SELL side) candle
    const gr=cx.createLinearGradient(x0,0,x0+bs,0); gr.addColorStop(0,rgba(pc,.05)); gr.addColorStop(.5,rgba(pc,.16)); gr.addColorStop(1,rgba(pc,.05));
    cx.fillStyle=gr; cx.fillRect(x0,0,bs,H);
    cx.strokeStyle=rgba(pc,.28); cx.lineWidth=1; cx.beginPath(); cx.moveTo(x0+.5,0); cx.lineTo(x0+.5,H); cx.moveTo(x0+bs-.5,0); cx.lineTo(x0+bs-.5,H); cx.stroke(); }); }
  r.ev.slice(-Math.max(1,Math.round(Z.ccpN)||300)).forEach(e=>{
    if(e.s===1?!showB:!showS) return; const bb=c[e.i], xt=X(e.i); if(!bb||xt==null||xt<-30||xt>W+30) return;
    const buy=e.s===1, col=buy?cB:cS, yLo=Y(bb.low), yHi=Y(bb.high); if(yLo==null||yHi==null) return;
    if(Z.ccpStyle==='Glass lines'){   // optional style: transparent glass band from the top of the chart to the bottom edge (like session shading), green = BUY, red = SELL
      const xn=X(e.i+1), xp=X(e.i-1); let bs=(xn!=null&&xn-xt>1)?xn-xt:(xp!=null&&xt-xp>1)?xt-xp:8; bs=Math.max(4,bs);
      const gw=Math.max(0,+Z.ccpGlassW||0), gwid=gw>0?gw:bs, gx=xt-gwid/2;
      const gg=cx.createLinearGradient(gx,0,gx+gwid,0); gg.addColorStop(0,rgba(col,.10)); gg.addColorStop(.5,rgba(col,.34)); gg.addColorStop(1,rgba(col,.10));
      cx.fillStyle=gg; cx.fillRect(gx,0,gwid,H);
      const vg=cx.createLinearGradient(0,0,0,H); vg.addColorStop(0,'rgba(255,255,255,0.10)'); vg.addColorStop(.5,'rgba(255,255,255,0)'); vg.addColorStop(1,'rgba(255,255,255,0.06)');
      cx.fillStyle=vg; cx.fillRect(gx,0,gwid,H);
      cx.strokeStyle=rgba(col,.55); cx.lineWidth=1; cx.beginPath(); cx.moveTo(gx+.5,0); cx.lineTo(gx+.5,H); cx.moveTo(gx+gwid-.5,0); cx.lineTo(gx+gwid-.5,H); cx.stroke();
      return; }
    const w=bt[0], h=bt[1], fz=bt[2], y=buy?Math.max(yLo,yHi)+3:Math.min(yLo,yHi)-3, ty=buy?y+dist:y-dist, top=buy?ty:ty-h;
    cx.strokeStyle=rgba(col,0.9); cx.lineWidth=1.2; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(xt,y+(buy?0:0)); cx.lineTo(xt,ty); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=col; cx.beginPath(); cx.arc(xt,y,2.5,0,6.2832); cx.fill();
    const gr=cx.createLinearGradient(0,top,0,top+h); gr.addColorStop(0,col); gr.addColorStop(1,shade(col,0.7));
    cx.save(); cx.shadowColor=rgba(col,0.55); cx.shadowBlur=8; cx.fillStyle=gr; rr(xt-w/2,top,w,h,h/2); cx.fill(); cx.restore();
    cx.strokeStyle='rgba(255,255,255,0.55)'; cx.lineWidth=1; rr(xt-w/2+.5,top+.5,w-1,h-1,h/2); cx.stroke();
    cx.font='bold '+fz+'px system-ui'; cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText(buy?'BUY':'SELL',xt,top+h/2+.5);
    if(lbl){ cx.font=(fs-1)+'px system-ui'; cx.fillStyle='rgba(209,212,220,0.9)'; cx.fillText(buy?'bearish run ended':'bullish run ended',xt,buy?top+h+fs:top-fs+1); }
  });
  cx.globalAlpha=1; cx.restore(); }
STRATS.ccp={label:'Candlestick Pro Plus Counter Premium \u00b7 count consecutive bearish / bullish candles, qualify at the minimum, then BUY / SELL when the first opposite candle closes',short:'Candlestick Pro Plus Counter Premium',own:true,
  defs:{limit:false,useSl:false,long:true,short:true,ccpBMin:4,ccpBMax:8,ccpSMin:4,ccpSMax:8,ccpBConf:1,ccpSConf:1,ccpBGap:0,ccpSGap:0,ccpLocOn:false,ccpLocLen:100,ccpLocPct:40,ccpSesOn:false,ccpSesFrom:0,ccpSesTo:6,ccpRecOn:false,ccpRecMin:30,ccpRpOn:false,ccpRpPct:2,ccpSpOn:false,ccpSpX:3,ccpSpLen:20,ccpWkOn:false,ccpWkMin:60,ccpScOn:false,ccpScMin:70,ccpVolOn:false,ccpVolX:1.2,ccpVolLen:20,ccpBigOn:'Off',ccpBigX:1,ccpBigLen:20,ccpBigPct:0,ccpSmallRst:false,ccpPrep:true,ccpDoji:true,ccpExp:0,ccpWait:true,ccpBuy:true,ccpSell:true,ccpBuyOn:true,ccpSellOn:true,ccpCount:false,ccpLbl:false,ccpDist:30,ccpStyle:'Buttons',ccpGlassW:0,ccpBtnSz:'Small',ccpBtnBuy:'#2dd4a7',ccpBtnSell:'#ff5d7a',ccpN:300,ccpSize:'Small'},
  inputs:(b,d)=>{
    fld(b,d,'ccpBMin','num','BUY: minimum consecutive BEARISH candles to qualify',{min:2,max:50,step:1});
    fld(b,d,'ccpBMax','num','BUY: maximum bearish range (a longer run stays qualified)',{min:2,max:50,step:1});
    fld(b,d,'ccpSMin','num','SELL: minimum consecutive BULLISH candles to qualify',{min:2,max:50,step:1});
    fld(b,d,'ccpSMax','num','SELL: maximum bullish range (a longer run stays qualified)',{min:2,max:50,step:1});
    fld(b,d,'ccpBConf','num','BUY: signal on which GREEN candle after the reds (1 = classic: first green. Any number, e.g. 2, 5, 10 = yellow prepare dot on each green before it, BUY on that green; reds in between allowed)',{min:1,max:1000,step:1});
    fld(b,d,'ccpSConf','num','SELL: signal on which RED candle after the greens (1 = classic: first red. Any number, e.g. 2, 5, 10 = yellow prepare dot on each red before it, SELL on that red; greens in between allowed)',{min:1,max:1000,step:1});
    fld(b,d,'ccpBGap','num','BUY: minimum candles between BUY signals, even if the setup is met (0 = off, e.g. 20, 30, 50)',{min:0,max:5000,step:1});
    fld(b,d,'ccpSGap','num','SELL: minimum candles between SELL signals, even if the setup is met (0 = off, e.g. 20, 30, 50)',{min:0,max:5000,step:1});
    fld(b,d,'ccpBigOn','sel','BIG-candle filter: count only big candles (small = manipulation, ignored)',{opts:['Off','Run + confirm','Run only','Confirm only']});
    fld(b,d,'ccpBigX','num','A candle is BIG when its body is at least this many times the average body (1 = average, 1.5 = clearly bigger)',{min:0.1,max:20,step:0.1});
    fld(b,d,'ccpBigLen','num','Average body measured over the previous N candles',{min:3,max:500,step:1});
    fld(b,d,'ccpBigPct','num','Optional: also needs a body of at least this % of price (0 = off)',{min:0,max:100,step:0.1});
    fld(b,d,'ccpSmallRst','chk','A small candle resets an unfinished run (off = small candles are simply ignored)');
    fld(b,d,'ccpVolOn','chk','VOLUME filter: the confirming candle needs enough volume (thin-volume moves are ignored)');
    fld(b,d,'ccpVolX','num','Confirming candle volume must be at least this many times the average (1.2 = 20% above average)',{min:0.1,max:20,step:0.1});
    fld(b,d,'ccpVolLen','num','Average volume measured over the previous N candles',{min:3,max:500,step:1});
    fld(b,d,'ccpWkOn','chk','WICK filter: the confirming candle must be mostly body (long wicks = rejection / manipulation, ignored)');
    fld(b,d,'ccpWkMin','num','Body must be at least this % of the candle height, wick to wick (60 = body is 60% or more)',{min:1,max:100,step:1});
    fld(b,d,'ccpScOn','chk','STRONG-CLOSE filter: BUY candle must close near its high, SELL candle near its low');
    fld(b,d,'ccpScMin','num','Close must be in the top (BUY) / bottom (SELL) this % of the candle (70 = top / bottom 30% zone)',{min:1,max:100,step:1});
    fld(b,d,'ccpRecOn','chk','RECOVERY filter: the confirming candle must win back part of the run (a tiny bounce after a long fall / rise is ignored)');
    fld(b,d,'ccpRecMin','num','Must win back at least this % of the whole run (30 = a third of it)',{min:0,max:200,step:1});
    fld(b,d,'ccpRpOn','chk','RUN-SIZE filter: the red / green run must move enough to count');
    fld(b,d,'ccpRpPct','num','The run must move at least this % of price (use more on higher timeframes, e.g. 1 on 15m, 5 on 4h)',{min:0,max:100,step:0.1});
    fld(b,d,'ccpSpOn','chk','SPIKE filter: ignore giant news / stop-hunt candles completely (not counted, never confirm)');
    fld(b,d,'ccpSpX','num','A spike is a candle whose high-low range is more than this many times the average range',{min:1,max:20,step:0.5});
    fld(b,d,'ccpSpLen','num','Average range measured over the previous N candles',{min:3,max:500,step:1});
    fld(b,d,'ccpLocOn','chk','LOCATION filter: BUY only low in the recent range, SELL only high in it');
    fld(b,d,'ccpLocLen','num','Recent range = highest high to lowest low of the last N candles',{min:5,max:2000,step:5});
    fld(b,d,'ccpLocPct','num','BUY only in the lowest this % of the range, SELL only in the highest this % (40 = bottom 40% / top 40%)',{min:1,max:99,step:1});
    fld(b,d,'ccpSesOn','chk','SESSION filter: ignore confirming candles during a quiet / manipulated time window');
    fld(b,d,'ccpSesFrom','num','Block from this hour (0-23, your device local time)',{min:0,max:23,step:1});
    fld(b,d,'ccpSesTo','num','Block until this hour (0-24; e.g. from 22 to 6 blocks the night)',{min:0,max:24,step:1});
    fld(b,d,'ccpPrep','chk','Show glass PREPARE column (green / red, first confirming candle only)');
    fld(b,d,'ccpDoji','chk','Doji keeps a qualified setup alive (off = doji cancels it)');
    fld(b,d,'ccpExp','num','Optional expiry: drop a waiting setup after this many candles (0 = wait indefinitely)',{min:0,max:500,step:1});
    fld(b,d,'ccpWait','chk','Only after the candle has closed (ignore the live candle)');
    fld(b,d,'ccpBuy','chk','BUY signals enabled'); fld(b,d,'ccpSell','chk','SELL signals enabled');
    fld(b,d,'ccpBuyOn','chk','Show BUY markers'); fld(b,d,'ccpSellOn','chk','Show SELL markers'); fld(b,d,'ccpCount','chk','Show candle count labels');
    fld(b,d,'ccpStyle','sel','Signal style: BUY / SELL buttons or full-height glass lines (green = BUY, red = SELL)',{opts:['Buttons','Glass lines']});
    fld(b,d,'ccpGlassW','num','Glass line width in px (0 = one candle wide)',{min:0,max:60,step:1});
    fld(b,d,'ccpBtnSz','sel','Marker size',{opts:['Tiny','Small','Normal']}); fld(b,d,'ccpDist','num','Marker distance from price (px, dotted line connects it)',{min:8,max:150,step:2});
    fld(b,d,'ccpBtnBuy','col','BUY colour'); fld(b,d,'ccpBtnSell','col','SELL colour'); fld(b,d,'ccpLbl','chk','Show small note next to the marker');
    fld(b,d,'ccpN','num','Signals shown on chart',{min:1,max:2000,step:10}); fld(b,d,'ccpSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']}); },
  sig:(c,i,n,Z)=>{ if(c.length<5) return 0; const r=ccpRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.ccp='Strategy \u00b7 4-8 bearish candles then the first bullish close = BUY, 4-8 bullish then the first bearish close = SELL (setup waits indefinitely)'; }catch(e){}
{ const _cpD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='ccpview') return ccpDraw(d,X,Y,W,H); return _cpD.apply(this,arguments); };
  const _cpR=recomputeExtras; recomputeExtras=function(){ _cpR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='ccp'&&stVis(Z)) scriptBoxes.push({type:'ccpview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('ccp strategy failed',err); window.__ccpErr=err; }

}

// ===== pcr =====
{
// [pcr] STRATEGY (Price Action) · "Adjustable Pro Ranging Channel"   (self-contained: every name starts with pcr / PCR)
// A least-squares regression line through the last N candles is the yellow dotted middle line. The GREEN line (top) and the RED line (bottom)
// are parallel to it and are set in % : "Channel width %" is the total gap between green and red measured against the middle line at the
// latest candle (3.28 = green 1.64% above and red 1.64% below). It re-fits on every new candle, so the lines follow the latest price.
// SIGNALS: BUY when a closed candle's low touches the red line, SELL when its high touches the green line. After a BUY the next BUY must wait
// "Candles between BUYs" (default 20, use 20-50) and the same for SELLs, so repeated retests of one line do not stack signals. No breakout logic yet.
// The channel re-fits on every new candle, so signals are re-evaluated against the current lines (they can shift while the channel moves).
// Hooks: STRATS.pcr + draw + recomputeExtras + PAID + runStrategy wrapper (own BUY / SELL markers, because the generic engine draws one arrow per open position).
// =====================================================================================
try{
const pcrSrc={close:x=>x.close,open:x=>x.open,high:x=>x.high,low:x=>x.low,hl2:x=>(x.high+x.low)/2,hlc3:x=>(x.high+x.low+x.close)/3,ohlc4:x=>(x.open+x.high+x.low+x.close)/4};
const pcrFmt=v=>{ const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=100?2:a>=1?4:a>=0.01?5:8}); };
function pcrFit(c,Z){
  const nAll=c.length; if(nAll<3) return null;
  let n=(Z.pcrLive===true||nAll<4)?nAll:nAll-1;   // rolling mode: fit on CLOSED candles only
  if(Z.pcrFix!==false&&nAll>=4){   // FIXED mode (default): the channel is anchored to one candle and never moves until you re-fit it
    let key='x'; try{ key=sym[0]+'|'+tf[0]; }catch(e){}
    if(!Z.pcrAnc||typeof Z.pcrAnc!=='object') Z.pcrAnc={};
    let t=Z.pcrAnc[key], idx=-1;
    if(t!=null&&!Z.pcrReset){ let lo=0,hi=nAll-2; while(lo<=hi){ const m=(lo+hi)>>1; if(c[m].time<=t){ idx=m; lo=m+1; } else hi=m-1; } if(idx>=0&&c[idx].time!==t) idx=-1; }
    if(idx<0){ idx=nAll-2; Z.pcrAnc[key]=c[idx].time; Z.pcrReset=false; try{ save(); }catch(e){} }
    n=idx+1; }
  const N=Math.min(n,Math.max(3,Math.round(Z.pcrLen)||300));
  const f=pcrSrc[Z.pcrSrc]||pcrSrc.close, i0=n-N; let sx=0,sy=0,sxx=0,sxy=0;
  for(let i=i0;i<n;i++){ const y=f(c[i]); sx+=i; sy+=y; sxx+=i*i; sxy+=i*y; }
  const den=N*sxx-sx*sx||1, b=(N*sxy-sx*sy)/den, a=(sy-b*sx)/N, pct=Math.max(0,+Z.pcrPct||0), mid=i=>a+b*i, off=Math.abs(mid(n-1))*pct/200;
  return {n,N,i0,a,b,off,pct,mid};
}
function pcrDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<3) return; const r=pcrFit(c,Z); if(!r) return; const {n,i0,off,mid}=r;
  const cU=Z.pcrUp||'#43a047', cL=Z.pcrLow||'#e53950', cM=Z.pcrMid||'#fdd835', lw=Math.max(1,Math.min(8,+Z.pcrW||2));
  const xa=X(i0), xe=X(n-1), xp=X(n-2); if(xa==null||xe==null) return;
  const bs=(xp!=null&&xe-xp>0.5)?xe-xp:6, ext=Z.pcrExt!==false?Math.max(0,(W-xe)/bs):0, i1=n-1+ext, xr=xe+ext*bs;
  const P=(i,k)=>Y(mid(i)+k*off), uA=P(i0,1), uB=P(i1,1), lA=P(i0,-1), lB=P(i1,-1), mA=P(i0,0), mB=P(i1,0);
  if([uA,uB,lA,lB,mA,mB].some(v=>v==null)) return;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.lineCap='round'; cx.setLineDash([]);
  if(Z.pcrFill!==false){ cx.globalAlpha=.07; cx.fillStyle=cM; cx.beginPath(); cx.moveTo(xa,uA); cx.lineTo(xr,uB); cx.lineTo(xr,lB); cx.lineTo(xa,lA); cx.closePath(); cx.fill(); }
  // ---- optional: fair value gaps (unfilled only), drawn behind everything else ----
  if(Z.pcrFvg===true){ const fv=pcrFvgs(c,Z); if(fv.length||fv.done.length){ const cGu=Z.pcrFvgBull||'#81c784', cGd=Z.pcrFvgBear||'#e57373', cGy=Z.pcrFvgOldCol||'#9e9e9e'; cx.lineWidth=1;
    fv.done.forEach(g=>{ const x0=X(g.i), x1=X(g.end), yT=Y(g.top), yB=Y(g.bot); if(x0==null||x1==null||yT==null||yB==null||x1<0) return; const xs=Math.max(x0,0);
      cx.globalAlpha=.14; cx.fillStyle=cGy; cx.fillRect(xs,yT,x1-xs,yB-yT); cx.globalAlpha=.45; cx.strokeStyle=cGy; cx.strokeRect(xs,yT,x1-xs,yB-yT); });
    fv.forEach(g=>{ const x0=X(g.i), yT=Y(g.top), yB=Y(g.bot); if(x0==null||yT==null||yB==null) return; const col=g.bull?cGu:cGd, xs=Math.max(x0,0);
      cx.globalAlpha=.22; cx.fillStyle=col; cx.fillRect(xs,yT,W-xs,yB-yT); cx.globalAlpha=.6; cx.strokeStyle=col; cx.strokeRect(xs,yT,W-xs,yB-yT); }); cx.globalAlpha=1; } }
  cx.globalAlpha=1; cx.lineWidth=lw;
  cx.strokeStyle=cU; cx.beginPath(); cx.moveTo(xa,uA); cx.lineTo(xr,uB); cx.stroke();
  cx.strokeStyle=cL; cx.beginPath(); cx.moveTo(xa,lA); cx.lineTo(xr,lB); cx.stroke();
  if(Z.pcrMidOn!==false){ cx.strokeStyle=cM; cx.lineWidth=Math.max(1,lw-0.5); cx.setLineDash([2,5]); cx.beginPath(); cx.moveTo(xa,mA); cx.lineTo(xr,mB); cx.stroke(); cx.setLineDash([]); }
  if(Z.pcrDots!==false){ const dot=(x,y,col)=>{ cx.fillStyle=col; cx.beginPath(); cx.arc(x,y,5,0,6.2832); cx.fill(); }; dot(xa,uA,cU); dot(xa,lA,cL); const xl=X(c.length-1); if(xl!=null){ dot(xl,P(c.length-1,1),cU); dot(xl,P(c.length-1,-1),cL); } }
  if(Z.pcrLbl!==false){ const fz=Math.max(6,Math.min(14,+Z.pcrLblSz||8)); cx.font=fz+'px system-ui'; cx.textBaseline='middle'; cx.textAlign='left';
    const tag=(txt,x,y,bg)=>{ const w=cx.measureText(txt).width+6, hh=fz+4, lx=Math.max(2,W-w-3); cx.globalAlpha=.75; cx.fillStyle=bg; cx.fillRect(lx,y-hh/2,w,hh); cx.globalAlpha=1; cx.fillStyle='#fff'; cx.fillText(txt,lx+3,y+.5); };
    const L=c.length-1, yu=Y(mid(L)+off), yl=Y(mid(L)-off);
    if(yu!=null) tag('+'+(r.pct/2).toFixed(2)+'% '+pcrFmt(mid(L)+off),0,yu-(fz+4)/2-1,cU);
    if(yl!=null) tag('-'+(r.pct/2).toFixed(2)+'% '+pcrFmt(mid(L)-off),0,yl+(fz+4)/2+1,cL); }
  const taken=[];   // boxes already used by buttons / labels, so nothing is drawn on top of anything else
  // signal points: tiny dot on the touched line -> dotted line -> tiny button (BUY below the red line, SELL above the green line)
  if(Z.pcrSig!==false&&Z.pcrBtn!==false){ const g=pcrSignals(c,Z); if(g){ const len=Math.max(8,Math.min(120,+Z.pcrBtnLen||26)), cB=Z.pcrBuyBtn||'#43a047', cS=Z.pcrSellBtn||'#e53950', words=Z.labels!==false;
    cx.font='bold 8.5px system-ui'; cx.textBaseline='middle'; cx.textAlign='center';
    g.out.forEach(q=>{ const xs=X(q.i), ys=Y(q.ps); if(xs==null||ys==null||xs<-30||xs>W+30) return; const cb0=c[q.i]; let x=xs, y=cb0?Y(q.side>0?Math.min(cb0.open,cb0.close):Math.max(cb0.open,cb0.close)):null; if(y==null) y=ys;
      const buy=q.side>0, col=buy?cB:cS, txt=words?(buy?'BUY':'SELL'):'', w=Math.max(12,(txt?cx.measureText(txt).width:0)+9), h=12, by=pcrPlace(taken,xs,buy?ys+len:ys-len,w,h,buy?1:-1);
      cx.globalAlpha=.9; cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([2,3]); cx.beginPath(); cx.moveTo(x,y); cx.lineTo(xs,by+(buy?-h/2:h/2)); cx.stroke(); cx.setLineDash([]);
      cx.globalAlpha=1; cx.fillStyle=col; cx.beginPath(); cx.arc(x,y,2.6,0,6.2832); cx.fill();
      cx.beginPath(); if(cx.roundRect) cx.roundRect(xs-w/2,by-h/2,w,h,h/2); else cx.rect(xs-w/2,by-h/2,w,h); cx.fill();
      if(txt){ cx.fillStyle='#fff'; cx.fillText(txt,xs,by+.5); } }); cx.textAlign='left'; } }
  // ---- optional: BREAKOUT (dotted line + tiny yellow button) ----
  if(Z.pcrBrk===true){ const bk=pcrBreaks(c,Z,r); if(bk&&bk.length){ const len=Math.max(10,Math.min(160,+Z.pcrBrkLen||34)), col=Z.pcrBrkCol||'#fdd835';
    cx.font='bold 8.5px system-ui'; cx.textBaseline='middle'; cx.textAlign='center'; const tw=cx.measureText('Breakout').width+9, h=12;
    bk.forEach(q=>{ const xs=X(q.i), ys=Y(q.cl); if(xs==null||ys==null||xs<-40||xs>W+40) return; const up=q.side>0, by=pcrPlace(taken,xs,up?ys-len:ys+len,tw,h,up?-1:1);
      cx.globalAlpha=.9; cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash([2,3]); cx.beginPath(); cx.moveTo(xs,ys); cx.lineTo(xs,by+(up?h/2:-h/2)); cx.stroke(); cx.setLineDash([]);
      cx.globalAlpha=1; cx.fillStyle=col; cx.beginPath(); cx.arc(xs,ys,2.6,0,6.2832); cx.fill();
      cx.beginPath(); if(cx.roundRect) cx.roundRect(xs-tw/2,by-h/2,tw,h,h/2); else cx.rect(xs-tw/2,by-h/2,tw,h); cx.fill();
      cx.fillStyle='#1b1b1b'; cx.fillText('Breakout',xs,by+.5); }); cx.textAlign='left'; } }
  // ---- optional: market structure BOS (white dotted) / CHoCH (bullish / bearish dotted) ----
  if(Z.pcrStr===true){ const ev=pcrStruct(c,Z); if(ev&&ev.length){ const fz=Math.max(6,Math.min(14,+Z.pcrStrSz||8)), cBBu=Z.pcrBosBull||'#26a69a', cBBe=Z.pcrBosBear||'#ef5350', cBu=Z.pcrChBull||'#26a69a', cBe=Z.pcrChBear||'#ef5350';
    cx.font='bold '+fz+'px system-ui'; cx.textBaseline='middle'; cx.textAlign='center'; cx.lineWidth=1.2;
    ev.forEach(q=>{ const x0=X(q.x0), x1=X(q.x1), y=Y(q.y); if(x0==null||x1==null||y==null||(x0<-50&&x1<-50)||(x0>W+50&&x1>W+50)) return;
      const col=q.tag==='BOS'?(q.bull?cBBu:cBBe):(q.bull?cBu:cBe); cx.globalAlpha=.95; cx.strokeStyle=col; cx.setLineDash([3,4]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]);
      if(Z.pcrStrLbl!==false){ cx.fillStyle=col; const lt=q.tag==='BOS'?'BOS':'CHoCH', lw=cx.measureText(lt).width+4, ly=pcrPlace(taken,(x0+x1)/2,y+(q.bull?-(fz*0.9):(fz*0.9)),lw,fz+2,q.bull?-1:1); cx.fillText(lt,(x0+x1)/2,ly); } });
    cx.globalAlpha=1; cx.textAlign='left'; } }
  cx.restore();
}
// Breakout: N consecutive CLOSED candles close outside the channel (default 2 = the second candle confirms). One marker per excursion,
// and the next breakout on the same side must wait "Candles between breakouts" (20-50) so a retest does not stack markers on one spot.
// Fair value gap: bullish = candle 3 low is above candle 1 high (gap between them), bearish = mirror. Only gaps that price has NOT filled yet are kept.
// Fill = "Full" (price trades through the whole gap) or "Touch" (price enters the gap at all).
function pcrFvgs(c,Z){
  const n=c.length, bars=Math.max(20,Math.round(Z.pcrFvgBars||500)), st=Math.max(2,n-bars), full=Z.pcrFvgFill!=='Touch', mn=Math.max(0,+Z.pcrFvgMin||0)/100, mx=Math.max(1,Math.round(Z.pcrFvgMax||10)), old=Z.pcrFvgOld===true?Math.max(0,Math.round(Z.pcrFvgOldN==null?5:Z.pcrFvgOldN)):0, out=[], done=[];
  for(let i=st;i<n-1;i++){ const a=c[i-2], k=c[i]; let bull=null, top,bot;
    if(k.low>a.high){ bull=true; bot=a.high; top=k.low; } else if(k.high<a.low){ bull=false; top=a.low; bot=k.high; }
    if(bull===null||(top-bot)<bot*mn) continue;
    let end=-1; for(let j=i+1;j<n;j++){ const q=c[j]; if(bull?(full?q.low<=bot:q.low<=top):(full?q.high>=top:q.high>=bot)){ end=j; break; } }
    if(end<0) out.push({i:i-2,bull,top,bot}); else if(old>0) done.push({i:i-2,end,bull,top,bot}); }
  const res=out.slice(-mx); res.done=done.slice(-old); return res;
}
function pcrPlace(T,xc,by,w,h,dir){ for(let n=0;n<10;n++){ let hit=false; for(let k=0;k<T.length;k++){ const q=T[k]; if(Math.abs(xc-q.x)<(w+q.w)/2+2&&Math.abs(by-q.y)<(h+q.h)/2+2){ hit=true; break; } } if(!hit) break; by+=dir*(h+3); } T.push({x:xc,y:by,w:w,h:h}); return by; }
function pcrBreaks(c,Z,r){
  r=r||pcrFit(c,Z); if(!r) return [];
  if(Z.pcrBrkV!==3){ Z.pcrBrkV=3; Z.pcrBrkN=2; try{ save(); }catch(e){} }   // one-time: breakout now counts the THIRD candle
   const last=c.length-2, out=[]; if(last<r.i0) return out;
  const need=Math.max(1,Math.round(Z.pcrBrkN==null?2:Z.pcrBrkN)), gap=Math.max(0,Math.round(Z.pcrBrkGap==null?20:Z.pcrBrkGap));
  let su=0, sd=0, lu=-1e9, ld=-1e9;
  for(let i=r.i0;i<=last;i++){ const k=c[i], m=r.mid(i), up=m+r.off, lo=m-r.off;
    su=k.close>up?su+1:0; sd=k.close<lo?sd+1:0;
    if(su===need&&i-lu>=gap){ out.push({i,time:k.time,side:1,cl:k.close,lv:up}); lu=i; }
    if(sd===need&&i-ld>=gap){ out.push({i,time:k.time,side:-1,cl:k.close,lv:lo}); ld=i; } }
  return out;
}
// Market structure: swing highs / lows (confirmed after "swing length" candles each side). A break of the last swing continues the trend (BOS)
// or flips it (CHoCH). Closed candles only, so lines do not flicker with the forming candle.
function pcrStruct(c,Z){
  const L=Math.max(2,Math.min(30,Math.round(Z.pcrStrLen==null?5:Z.pcrStrLen))), end=c.length-2, bars=Math.max(50,Math.round(Z.pcrStrBars||500)), st=Math.max(L,end-bars), wick=Z.pcrStrBrk==='Wick', mx=Math.max(1,Math.round(Z.pcrStrMax||30));
  if(end<2*L+2) return []; let hi=null, lo=null, bias=0; const ev=[];
  for(let t=st;t<=end;t++){ const p=t-L;
    if(p>=L){ let isH=true, isL=true; for(let j=p-L;j<=p+L;j++){ if(j===p) continue; if(j<p){ if(c[j].high>c[p].high) isH=false; if(c[j].low<c[p].low) isL=false; } else { if(c[j].high>=c[p].high) isH=false; if(c[j].low<=c[p].low) isL=false; } }
      if(isH) hi={i:p,v:c[p].high,done:false}; if(isL) lo={i:p,v:c[p].low,done:false}; }
    const k=c[t];
    if(hi&&!hi.done&&(wick?k.high:k.close)>hi.v){ ev.push({tag:bias===-1?'CHoCH':'BOS',bull:true,x0:hi.i,x1:t,y:hi.v}); bias=1; hi.done=true; }
    if(lo&&!lo.done&&(wick?k.low:k.close)<lo.v){ ev.push({tag:bias===1?'CHoCH':'BOS',bull:false,x0:lo.i,x1:t,y:lo.v}); bias=-1; lo.done=true; } }
  return ev.slice(-mx);
}
function pcrSignals(c,Z){
  const r=pcrFit(c,Z); if(!r) return null; const n=c.length, last=n-2, out=[]; if(last<r.i0) return {out,nb:0,ns:0,r};   // closed candles only (the newest candle is still forming)
  const tol=Math.max(0,+Z.pcrTol||0)/100, cb=Math.max(0,Math.round(Z.pcrCoolB==null?20:Z.pcrCoolB)), cs=Math.max(0,Math.round(Z.pcrCoolS==null?20:Z.pcrCoolS));
  // touch of a line only STARTS a setup. SELL (green line): fires on the close of the 2nd RED candle, counting from the touch candle (red red / red green red).
  // BUY (red line): the mirror, fires on the close of the 2nd GREEN candle. The setup is dropped if it does not complete within "max candles to wait".
  const need=Math.max(1,Math.round(Z.pcrNeed==null?2:Z.pcrNeed)), mw=Math.max(need,Math.round(Z.pcrMaxW==null?10:Z.pcrMaxW));
  let nb=0, ns=0;
  const scan=(side,cool)=>{ let lastS=-1e9;
    for(let i=r.i0;i<=last;i++){ const b=c[i], m=r.mid(i), up=m+r.off, lo=m-r.off;
      const touch=side>0?(b.low<=lo*(1+tol)):(b.high>=up*(1-tol)); if(!touch||i-lastS<cool) continue;
      let cnt=0;
      for(let j=i;j<=Math.min(last,i+mw-1);j++){ const k=c[j], mj0=r.mid(j), u0=mj0+r.off, l0=mj0-r.off, bt=Math.max(k.open,k.close), bb=Math.min(k.open,k.close), inside=Z.pcrInside===false||(bb>=l0&&bt<=u0); if(inside&&(side>0?(k.close>k.open):(k.close<k.open))) cnt++;
        if(cnt>=need){ const mj=r.mid(j); out.push({i:j,ti:i,time:k.time,side,p:side>0?lo:up,ps:side>0?mj-r.off:mj+r.off}); lastS=j; if(side>0) nb++; else ns++; i=j; break; } } } };
  if(Z.long!==false) scan(1,cb); if(Z.short!==false) scan(-1,cs);
  out.sort((x,y)=>x.i-y.i);
  return {out,nb,ns,r};
}
STRATS.pcr={label:'Adjustable Pro Plus Ranging Channel · regression middle line with a green top line and a red bottom line set in %',short:'Adjustable Pro Plus Ranging Channel',own:true,
  defs:{limit:false,useSl:false,pcrSrc:'close',pcrLen:300,pcrPct:3.28,pcrExt:true,pcrFix:true,pcrReset:false,pcrLive:false,pcrMidOn:true,pcrFill:true,pcrDots:true,pcrLbl:true,pcrSig:true,pcrKeep:true,pcrBtn:true,pcrArrows:false,pcrBtnLen:26,pcrBuyBtn:'#43a047',pcrSellBtn:'#e53950',pcrCoolB:20,pcrCoolS:20,pcrNeed:2,pcrMaxW:10,pcrInside:true,pcrLblSz:8,pcrTol:0,pcrW:2,pcrUp:'#43a047',pcrLow:'#e53950',pcrMid:'#fdd835',pcrFvg:false,pcrFvgFill:'Full',pcrFvgBars:500,pcrFvgMax:10,pcrFvgMin:0,pcrFvgOld:false,pcrFvgOldN:5,pcrFvgOldCol:'#9e9e9e',pcrFvgBull:'#81c784',pcrFvgBear:'#e57373',pcrBrk:false,pcrBrkN:2,pcrBrkV:3,pcrBrkGap:20,pcrBrkLen:34,pcrBrkCol:'#fdd835',pcrStr:false,pcrStrLen:5,pcrStrBrk:'Close',pcrStrBars:500,pcrStrMax:30,pcrStrLbl:true,pcrStrSz:8,pcrBosBull:'#26a69a',pcrBosBear:'#ef5350',pcrChBull:'#26a69a',pcrChBear:'#ef5350'},
  inputs:(b,d)=>{
    fld(b,d,'pcrPct','num','Channel width % (green to red, total)',{min:0.01,max:100,step:0.01}); fld(b,d,'pcrLen','num','Regression length (bars)',{min:3,max:5000,step:10}); fld(b,d,'pcrSrc','sel','Source',{opts:['close','open','high','low','hl2','hlc3','ohlc4']});
    fld(b,d,'pcrSig','chk','Show BUY (red line touch) / SELL (green line touch) signals'); fld(b,d,'pcrBtn','chk','Show signal point + dotted line + tiny button'); fld(b,d,'pcrBtnLen','num','Dotted line length (px)',{min:8,max:120,step:2}); fld(b,d,'pcrBuyBtn','col','BUY button colour'); fld(b,d,'pcrSellBtn','col','SELL button colour'); fld(b,d,'pcrArrows','chk','Also show the chart arrow markers'); fld(b,d,'pcrKeep','chk','Arrow markers: always show (ignore the global signal-marker switch)'); fld(b,d,'pcrNeed','num','Confirm candles (2 = second red for SELL / second green for BUY)',{min:1,max:5,step:1}); fld(b,d,'pcrInside','chk','Confirming candle body must be fully inside the channel (filters manipulation)'); fld(b,d,'pcrMaxW','num','Max candles to wait for the confirmation',{min:2,max:50,step:1}); fld(b,d,'pcrCoolB','num','Candles between BUYs (try 20 to 50)',{min:0,max:1000,step:1}); fld(b,d,'pcrCoolS','num','Candles between SELLs (try 20 to 50)',{min:0,max:1000,step:1}); fld(b,d,'pcrTol','num','Touch tolerance % (0 = wick must reach the line)',{min:0,max:10,step:0.01});
    fld(b,d,'pcrFvg','chk','FAIR VALUE GAPS: bullish (light green) / bearish (light red), unfilled only'); fld(b,d,'pcrFvgFill','sel','Gap counts as filled when price',{opts:['Full','Touch']}); fld(b,d,'pcrFvgOld','chk','Also show the last FILLED gaps in grey'); fld(b,d,'pcrFvgOldN','num','Filled gaps shown (e.g. 5, 7, 20)',{min:1,max:200,step:1}); fld(b,d,'pcrFvgOldCol','col','Filled gap colour'); fld(b,d,'pcrFvgMax','num','Gaps shown (latest unfilled)',{min:1,max:100,step:1}); fld(b,d,'pcrFvgMin','num','Minimum gap size (% of price)',{min:0,max:10,step:0.01}); fld(b,d,'pcrFvgBars','num','Gap scan (last bars)',{min:20,max:5000,step:50}); fld(b,d,'pcrFvgBull','col','Bullish gap colour'); fld(b,d,'pcrFvgBear','col','Bearish gap colour');
    fld(b,d,'pcrBrk','chk','BREAKOUT: mark a close outside the channel (dotted line + tiny yellow button)'); fld(b,d,'pcrBrkN','num','Breakout confirm: closed candles outside (2 = second candle)',{min:1,max:5,step:1}); fld(b,d,'pcrBrkGap','num','Candles between breakouts (20 to 50, avoids stacked retests)',{min:0,max:200,step:1}); fld(b,d,'pcrBrkLen','num','Breakout dotted line length (px)',{min:10,max:160,step:2}); fld(b,d,'pcrBrkCol','col','Breakout button colour');
    fld(b,d,'pcrStr','chk','MARKET STRUCTURE: BOS + CHoCH dotted lines (bullish green, bearish red)'); fld(b,d,'pcrStrLen','num','Structure swing length (candles each side)',{min:2,max:30,step:1}); fld(b,d,'pcrStrBrk','sel','Structure break by',{opts:['Close','Wick']}); fld(b,d,'pcrStrMax','num','Structure lines shown (latest)',{min:1,max:200,step:1}); fld(b,d,'pcrStrBars','num','Structure scan (last bars)',{min:50,max:5000,step:50}); fld(b,d,'pcrStrLbl','chk','Show BOS / CHoCH labels'); fld(b,d,'pcrStrSz','num','Structure label size (px)',{min:6,max:14,step:1}); fld(b,d,'pcrBosBull','col','BOS bullish colour'); fld(b,d,'pcrBosBear','col','BOS bearish colour'); fld(b,d,'pcrChBull','col','CHoCH bullish colour'); fld(b,d,'pcrChBear','col','CHoCH bearish colour');
    fld(b,d,'pcrFix','chk','FIXED channel: lines never move until you re-fit (off = rolling, re-fits every candle)');
    fld(b,d,'pcrReset','chk','Re-fit the fixed channel to the latest closed candle now (tick once, then close)');
    fld(b,d,'pcrLive','chk','Let the live (forming) candle move the lines (off = lines stay fixed until the candle closes)');
    fld(b,d,'pcrExt','chk','Extend lines to the right edge'); fld(b,d,'pcrMidOn','chk','Show middle line'); fld(b,d,'pcrFill','chk','Show fill between the lines'); fld(b,d,'pcrDots','chk','Show end dots'); fld(b,d,'pcrLbl','chk','Show % / price labels'); fld(b,d,'pcrLblSz','num','Label text size (px)',{min:6,max:14,step:1});
    fld(b,d,'pcrW','num','Line width',{min:1,max:8,step:1}); fld(b,d,'pcrUp','col','Green line colour'); fld(b,d,'pcrLow','col','Red line colour'); fld(b,d,'pcrMid','col','Middle line colour'); },
  sig:()=>0};
try{ DESC.pcr='Price action · regression channel with green / red lines set by a % width; BUY on a red line touch, SELL after a green line touch + 2nd red candle (BUY mirror on red line), with a candle gap between repeat signals'; }catch(e){}
try{ if(typeof PAID!=='undefined'&&!PAID.includes('s:pcr')) PAID.push('s:pcr'); }catch(e){}
{ const _pcD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='pcrview') return pcrDraw(d,X,Y,W,H); return _pcD.apply(this,arguments); };
  const _pcR=recomputeExtras; recomputeExtras=function(){ _pcR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='pcr'&&stVis(Z)) scriptBoxes.push({type:'pcrview',pts:[],o:Z}); }); };
  // the generic engine draws one same-direction arrow per open position, so this strategy adds its own BUY / SELL markers after it runs
  const _pcS=runStrategy; runStrategy=function(quiet){ _pcS.apply(this,arguments); try{ let add=[];
    strats.forEach(Z=>{ if(Z.k!=='pcr'||!stVis(Z)||Z.pcrSig===false||!candles||candles.length<5) return; const g=pcrSignals(candles,Z); if(!g) return;
      if(Z.pcrArrows===true) g.out.forEach(q=>add.push(q.side>0?{time:q.time,position:'belowBar',color:Z.buyCol||'#2dd4a7',shape:'arrowUp',text:Z.labels!==false?'BUY':'',keep:Z.pcrKeep!==false}:{time:q.time,position:'aboveBar',color:Z.sellCol||'#ff5d7a',shape:'arrowDown',text:Z.labels!==false?'SELL':'',keep:Z.pcrKeep!==false}));
      Z._stat=g.nb+' buys \u00b7 '+g.ns+' sells'; const lq=g.out[g.out.length-1], lc=candles[candles.length-2];
      if(lq&&lc&&lq.time===lc.time&&lq.time>(Z._ls||0)){ if(!quiet&&typeof toast==='function') toast((lq.side>0?'BUY':'SELL')+' signal \u00b7 '+sym[0]+' '+tf[0],lq.side>0?(Z.buyCol||'#2dd4a7'):(Z.sellCol||'#ff5d7a')); Z._ls=lq.time; try{ lastSig=Math.max(lastSig,lq.time); }catch(e){} } });
    if(add.length){ stratMk=stratMk.concat(add); applyMarkers(); } }catch(e){ console.error('pcr markers',e); } }; }
}catch(err){ console.error('pcr strategy failed',err); window.__pcrErr=err; }

// =====================================================================================
}

// ===== ccz =====
{
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
}
