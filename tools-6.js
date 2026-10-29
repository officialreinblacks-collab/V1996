/* tools-6.js — MarketPlusView tool code. index.html loads this file and runs it inside start() at the spot where this code used to be (same order, same scope).
   Keep the file name. Tools in this file: STRATS.tdl, STRATS.paw, STRATS.fpc, STRATS.gpa, STRATS.dbt, STRATS.msa, STRATS.obr, STRATS.pac, STRATS.sno */
try{
const TDL_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
function tdlAtr(cs){ const o=new Array(cs.length).fill(0); let p=null; for(let i=0;i<cs.length;i++){ const x=cs[i], tr=i?Math.max(x.h-x.l,Math.abs(x.h-cs[i-1].c),Math.abs(x.l-cs[i-1].c)):x.h-x.l; p=p==null?tr:(p*13+tr)/14; o[i]=p; } return o; }
// cs: candles already mirrored so the machine always works on a DOWN trendline through pivot highs (break up = BUY)
function tdlMachine(cs,Z){
  const n=cs.length, L=Math.max(2,Math.round(Z.tdlL)||5), minT=Math.max(2,Math.round(Z.tdlMinT)||2), gap=Math.max(2,Math.round(Z.tdlGap)||8), span=Math.max(20,Math.round(Z.tdlSpan)||250),
    minD=Z.tdlMinD==null?0.5:+Z.tdlMinD, tol=Z.tdlTol==null?0.3:+Z.tdlTol, buf=Z.tdlBuf==null?0.1:+Z.tdlBuf, retW=Math.max(3,Math.round(Z.tdlRetW)||30),
    rr=Z.tdlRR==null?2:+Z.tdlRR, sb=Z.tdlSlBuf==null?0.3:+Z.tdlSlBuf, maxA=Math.max(1,Math.round(Z.tdlMaxA)||3), atr=tdlAtr(cs), PH=[], act=[], out=[], sigB=new Map(), sigR=new Map();
  const val=(ln,x)=>ln.p1+ln.m*(x-ln.i1);
  const mkEv=(x,v,a)=>{ const sl=Math.min(x.l,v)-sb*a, en=x.c; return {en,sl,tp:en>sl?en+rr*(en-sl):null}; };
  const drop=(ln,t,st)=>{ ln.st=st; ln.end=t; const q=act.indexOf(ln); if(q>=0) act.splice(q,1); };
  for(let t=0;t<n;t++){
    const x=cs[t], a=atr[t]||0;
    // 1) lines already on the chart: break (red X), then retest (blue arrow)
    act.slice().forEach(ln=>{ if(t<=ln.t0) return; const v=val(ln,t);
      if(ln.st==='live'){
        if(x.c>v+buf*a&&(!Z.tdlBull||x.c>x.o)){
          if(!ln.shown){ drop(ln,t,'weak'); return; }
          ln.st='brk'; ln.brk=t; ln.evB=Object.assign({t},mkEv(x,v,a)); sigB.set(t,1); }
        else if(t-ln.i1>span*2) drop(ln,t,'old'); }
      else if(ln.st==='brk'){
        if(x.c<v-buf*a) drop(ln,t,'fake');
        else if(t>=ln.brk+2&&x.l<=v+tol*a&&x.c>=v&&(!Z.tdlRetBull||x.c>x.o)){ ln.ret=t; ln.evR=Object.assign({t},mkEv(x,v,a)); sigR.set(t,1); drop(ln,t,'ret'); }
        else if(t>ln.brk+retW) drop(ln,t,'done'); } });
    // 2) a new swing high is confirmed L bars later: extra touch on a live line, or a new line through two swing highs
    const k=t-L;
    if(k>=L){ let ih=true; for(let j=k-L;j<=k+L&&ih;j++){ if(j===k) continue; if(j<k?cs[j].h>=cs[k].h:cs[j].h>cs[k].h) ih=false; }
      if(ih){ const P={i:k,p:cs[k].h}; PH.push(P); let hit=false;
        act.forEach(ln=>{ if(ln.st!=='live'||P.i<=ln.i2) return; if(Math.abs(P.p-val(ln,P.i))<=tol*(atr[P.i]||0)){ ln.touches.push(P); hit=true; if(!ln.shown&&ln.touches.length>=minT){ ln.shown=true; out.push(ln); } } });
        if(!hit){ let best=null; const a2=atr[P.i]||0;
          for(let m=PH.length-2;m>=0&&m>=PH.length-17;m--){ const Hh=PH[m]; if(P.i-Hh.i>span) break; if(P.i-Hh.i<gap||Hh.p<=P.p+minD*a2) continue;
            const sl=(P.p-Hh.p)/(P.i-Hh.i); let ok=true;
            for(let j=Hh.i+1;j<=t;j++){ const v=Hh.p+sl*(j-Hh.i), aj=atr[j]||0; if(cs[j].c>v+0.1*aj||(Z.tdlStrict&&cs[j].h>v+0.1*aj)){ ok=false; break; } }
            if(!ok) continue;
            const tc=[Hh]; for(let m2=m+1;m2<PH.length-1;m2++){ const Q=PH[m2]; if(Math.abs(Q.p-(Hh.p+sl*(Q.i-Hh.i)))<=tol*(atr[Q.i]||0)) tc.push(Q); } tc.push(P);
            const sc=tc.length*1000+(P.i-Hh.i); if(!best||sc>best.sc) best={sc,Hh,sl,tc}; }
          if(best){ const ln={i1:best.Hh.i,p1:best.Hh.p,i2:P.i,m:best.sl,touches:best.tc,t0:t,st:'live',shown:best.tc.length>=minT,brk:null,ret:null,end:null,evB:null,evR:null};
            act.push(ln); if(ln.shown) out.push(ln);
            const lv=act.filter(z=>z.st==='live'); while(lv.length>maxA) drop(lv.shift(),t,'old'); } } } } }
  return {lines:out.filter(l=>l.st!=='weak'&&l.st!=='old'),sigB,sigR}; }
const tdlCache={};
function tdlRun(c,Z,m){ m=m||c.length; const l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.tdlDir,Z.tdlEntry,Z.tdlL,Z.tdlMinT,Z.tdlGap,Z.tdlSpan,Z.tdlMinD,Z.tdlTol,Z.tdlStrict,Z.tdlBuf,Z.tdlBull,Z.tdlRetW,Z.tdlRetBull,Z.tdlRR,Z.tdlSlBuf,Z.tdlMaxA].join('|');
  const h=tdlCache[Z.sid]; if(h&&h.k===key) return h.r;
  const lines=[], sig=new Map(), sl=m>6000?m-6000:0, cc=c.slice(sl,m), eb=Z.tdlEntry!=='Retest only', er=Z.tdlEntry!=='Break only';
  [1,-1].forEach(s=>{ if(Z.tdlDir==='Sell only'&&s===1) return; if(Z.tdlDir==='Buy only'&&s===-1) return;
    const cs=cc.map(x=>s===1?{o:x.open,h:x.high,l:x.low,c:x.close}:{o:-x.open,h:-x.low,l:-x.high,c:-x.close}), r=tdlMachine(cs,Z);
    r.lines.forEach(q=>{ q.s=s; q.off=sl; lines.push(q); }); if(eb) r.sigB.forEach((v,i)=>{ sig.set(i+sl,s); }); if(er) r.sigR.forEach((v,i)=>{ sig.set(i+sl,s); }); });
  lines.sort((a,b)=>(a.i2+a.off)-(b.i2+b.off)); const r={lines,sig}; tdlCache[Z.sid]={k:key,r}; return r; }
function tdlDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<31) return; const m=c.length-1, r=tdlRun(c,Z,m); if(!r) return;
  const fs=TDL_FS[Z.tdlSize]||7.5, ext=Math.max(0,Math.round(Z.tdlExt==null?15:Z.tdlExt)), retW=Math.max(3,Math.round(Z.tdlRetW)||30), eb=Z.tdlEntry!=='Retest only', er=Z.tdlEntry!=='Break only', lbl=Z.tdlLbl!==false,
    cDn=Z.tdlDnC||'#f23645', cUp=Z.tdlUpC||'#42a5f5', cX=Z.tdlXC||'#ff1744', cA=Z.tdlArC||'#2979ff', cO=Z.tdlOC||'#ef5350', lw=Z.tdlW==null?1.5:+Z.tdlW, bC=Z.buyCol||'#2dd4a7', sC=Z.sellCol||'#ff5d7a';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle'; cx.textAlign='center';
  const txt=(t,x,y,col,bold)=>{ cx.font=(bold?'bold ':'')+fs+'px system-ui'; cx.textAlign='center'; cx.fillStyle=col; cx.fillText(t,x,y); };
  const hl=(p,i0,i1,col,dash)=>{ const y=Y(p), a=X(i0), b=X(i1); if(y==null||a==null||b==null) return null; cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(a,y); cx.lineTo(b,y); cx.stroke(); cx.setLineDash([]); return {a,b,y}; };
  r.lines.filter(q=>Z.tdlHist!==false||q.st==='live'||q.st==='brk').slice(-Math.max(1,Math.round(Z.tdlN)||6)).forEach(q=>{
    const s=q.s, o=q.off, P=v=>s*v, buy=s===1, val=x=>q.p1+q.m*(x-q.i1), col=buy?cDn:cUp;
    let e; if(q.st==='live') e=m-1-o+ext; else if(q.st==='brk') e=Math.min(m-1-o+ext,q.brk+retW); else if(q.st==='ret') e=q.ret+4; else if(q.st==='done') e=q.brk+retW; else e=q.end;
    const xa=X(q.i1+o), xb=X(e+o), ya=Y(P(val(q.i1))), yb=Y(P(val(e))); if(xa==null||xb==null||ya==null||yb==null) return;
    cx.strokeStyle=col; cx.lineWidth=lw; cx.setLineDash(Z.tdlDash===false?[]:[6,4]); cx.beginPath(); cx.moveTo(xa,ya); cx.lineTo(xb,yb); cx.stroke(); cx.setLineDash([]);
    if(Z.tdlCirc!==false) q.touches.forEach(tp=>{ const x=X(tp.i+o), y=Y(P(tp.p)); if(x==null||y==null) return; cx.strokeStyle=cO; cx.lineWidth=1.5; cx.beginPath(); cx.arc(x,y,7,0,6.2832); cx.stroke(); });
    if(lbl) txt(q.touches.length+' touches',(xa+xb)/2,(ya+yb)/2+(buy?-11:11),'#b2b5be');
    if(q.brk!=null&&Z.tdlMk!==false){ const x=X(q.brk+o), y=Y(P(val(q.brk)));
      if(x!=null&&y!=null){ cx.strokeStyle=cX; cx.lineWidth=3; cx.beginPath(); cx.moveTo(x-6,y-6); cx.lineTo(x+6,y+6); cx.moveTo(x+6,y-6); cx.lineTo(x-6,y+6); cx.stroke();
        if(lbl) txt('Break'+(eb?(buy?' \u00b7 BUY':' \u00b7 SELL'):''),x,y+(buy?1:-1)*(fs+14),eb?(buy?bC:sC):'#b2b5be',eb); } }
    if(q.ret!=null&&Z.tdlMk!==false){ const cb=c[q.ret+o], x=X(q.ret+o), y=cb?Y(buy?cb.low:cb.high):null;
      if(x!=null&&y!=null){ const k=buy?1:-1, tip=y+k*9, base=y+k*38; cx.strokeStyle=cx.fillStyle=cA; cx.lineWidth=3; cx.beginPath(); cx.moveTo(x,base); cx.lineTo(x,tip+k*6); cx.stroke();
        cx.beginPath(); cx.moveTo(x,tip); cx.lineTo(x-6,tip+k*11); cx.lineTo(x+6,tip+k*11); cx.closePath(); cx.fill();
        if(lbl) txt('Retest'+(er?(buy?' \u00b7 BUY':' \u00b7 SELL'):''),x,base+k*(fs+4),er?(buy?bC:sC):'#b2b5be',er); } }
    if(Z.tdlTpSl!==false){ const ev=eb&&q.evB?q.evB:(er&&q.evR?q.evR:null);
      if(ev&&ev.tp!=null){ const a=ev.t+o, e2=a+25, sl=hl(P(ev.sl),a,e2,'#f23645',[4,3]), tp=hl(P(ev.tp),a,e2,'#089981',[4,3]); if(sl) txt('SL',sl.b+12,sl.y,'#fff'); if(tp) txt('TP',tp.b+12,tp.y,'#fff'); } } });
  cx.globalAlpha=1; cx.restore(); }
STRATS.tdl={label:'Trendlines \u00b7 2+ touch trendline, break (red X) = trend shift, retest (blue arrow) = safer entry',short:'Trendlines',own:true,
  defs:{limit:false,useSl:false,tdlDir:'Both',tdlEntry:'Retest only',tdlL:5,tdlMinT:2,tdlGap:8,tdlSpan:250,tdlMinD:0.5,tdlTol:0.3,tdlStrict:false,tdlBuf:0.1,tdlBull:true,tdlRetW:30,tdlRetBull:true,tdlRR:2,tdlSlBuf:0.3,tdlMaxA:3,
    tdlDnC:'#f23645',tdlUpC:'#42a5f5',tdlXC:'#ff1744',tdlArC:'#2979ff',tdlOC:'#ef5350',tdlW:1.5,tdlDash:true,tdlCirc:true,tdlMk:true,tdlLbl:true,tdlTpSl:true,tdlExt:15,tdlHist:true,tdlSize:'Small',tdlN:6,tdlSig:true},
  inputs:(b,d)=>{
    fld(b,d,'tdlDir','sel','Trade direction (Buy = down trendline breaks up, Sell = up trendline breaks down)',{opts:['Both','Buy only','Sell only']});
    fld(b,d,'tdlEntry','sel','Entry signal (retest = the safer entry)',{opts:['Retest only','Break only','Break + Retest']});
    fld(b,d,'tdlL','num','Swing pivot length (bars each side)',{min:2,max:30,step:1}); fld(b,d,'tdlMinT','num','Minimum touch points',{min:2,max:6,step:1});
    fld(b,d,'tdlGap','num','Min bars between the two anchor points',{min:2,max:150,step:1}); fld(b,d,'tdlSpan','num','Max bars a trendline can span',{min:30,max:800,step:10});
    fld(b,d,'tdlMinD','num','Min slope: price move between anchors (x ATR)',{min:0,max:10,step:0.1}); fld(b,d,'tdlTol','num','Touch tolerance (x ATR)',{min:0.05,max:2,step:0.05});
    fld(b,d,'tdlStrict','chk','Strict: wicks may not cross the line before the break'); fld(b,d,'tdlMaxA','num','Max live trendlines per side',{min:1,max:10,step:1});
    fld(b,d,'tdlBuf','num','Break buffer beyond the line (x ATR)',{min:0,max:2,step:0.05}); fld(b,d,'tdlBull','chk','Break candle must close in trade direction');
    fld(b,d,'tdlRetW','num','Retest window after the break (bars)',{min:3,max:150,step:1}); fld(b,d,'tdlRetBull','chk','Retest candle must close in trade direction');
    fld(b,d,'tdlRR','num','Take profit (R multiple)',{min:0.5,max:10,step:0.5}); fld(b,d,'tdlSlBuf','num','Stop buffer beyond the line / candle (x ATR)',{min:0,max:3,step:0.05});
    fld(b,d,'tdlDnC','col','Down trendline colour'); fld(b,d,'tdlUpC','col','Up trendline colour'); fld(b,d,'tdlXC','col','Break X colour'); fld(b,d,'tdlArC','col','Retest arrow colour'); fld(b,d,'tdlOC','col','Touch circle colour');
    fld(b,d,'tdlW','num','Line width',{min:1,max:5,step:0.5}); fld(b,d,'tdlDash','chk','Dashed lines'); fld(b,d,'tdlCirc','chk','Touch point circles'); fld(b,d,'tdlMk','chk','Break X and retest arrow');
    fld(b,d,'tdlLbl','chk','Show labels'); fld(b,d,'tdlTpSl','chk','Show SL / TP on signal'); fld(b,d,'tdlExt','num','Extend live lines to the right (bars)',{min:0,max:200,step:5});
    fld(b,d,'tdlHist','chk','Keep broken / retested lines on the chart'); fld(b,d,'tdlSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']}); fld(b,d,'tdlN','num','Trendlines shown',{min:1,max:30,step:1});
    fld(b,d,'tdlSig','chk','BUY / SELL signals'); },
  sig:(c,i,n,Z)=>{ if(Z.tdlSig===false||c.length<30) return 0; const r=tdlRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.tdl='Strategy \u00b7 trendlines with 2+ touches: break = trend shift, retest of the broken line = safer BUY / SELL entry'; }catch(e){}
{ const _tdD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='tdlview') return tdlDraw(d,X,Y,W,H); return _tdD.apply(this,arguments); };
  const _tdR=recomputeExtras; recomputeExtras=function(){ _tdR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='tdl'&&stVis(Z)) scriptBoxes.push({type:'tdlview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('tdl strategy failed',err); window.__tdlErr=err; }

// =====================================================================================
// [paw] STRATEGY · "Price Action Wave Analysis" (Tradeciety method)   (self-contained: every name starts with paw / PAW)
// Swing waves + swing highs / lows + support / resistance (supply / demand) + classic wave patterns:
//  1) Swing waves: confirmed pivots joined by a zigzag, each labelled HH / HL / LH / LL. Trend = HH+HL (up), LH+LL (down), mixed = range / transition.
//  2) Demand zone: when a down move fails to make a lower low and the structure turns up (HH + HL) the failed low becomes a demand zone
//     (mirror: supply zone). A retest of the zone with a rejection candle = BUY (mirror: SELL).
//  3) Head and Shoulders (top) / Inverse Head and Shoulders (bottom) with neckline. Neckline break = signal, the retest of the neckline is the optional safer entry.
//     Target = measured move (head to neckline), stop beyond the right shoulder.
// Hooks: STRATS.paw + draw + recomputeExtras (same pattern as the other strategies). Nothing existing is edited.
// =====================================================================================
try{
const PAW_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
function pawAtr(cs){ const o=new Array(cs.length).fill(0); let p=null; for(let i=0;i<cs.length;i++){ const x=cs[i], tr=i?Math.max(x.h-x.l,Math.abs(x.h-cs[i-1].c),Math.abs(x.l-cs[i-1].c)):x.h-x.l; p=p==null?tr:(p*13+tr)/14; o[i]=p; } return o; }
// trend from the last two swing highs and last two swing lows: 1 = HH+HL, -1 = LH+LL, 0 = mixed
function pawTrend(piv){ let h1=null,h2=null,l1=null,l2=null;
  for(let q=piv.length-1;q>=0&&(h2==null||l2==null);q--){ const v=piv[q]; if(v.h){ if(h1==null) h1=v; else if(h2==null) h2=v; } else { if(l1==null) l1=v; else if(l2==null) l2=v; } }
  if(!h2||!l2) return 0; const hh=h1.p>h2.p, hl=l1.p>l2.p; return hh&&hl?1:(!hh&&!hl?-1:0); }
// cs: candles already mirrored so the machine always looks for BULLISH setups (demand zone, inverse H&S, break up = BUY)
function pawMachine(cs,Z){
  const n=cs.length, L=Math.max(2,Math.round(Z.pawL)||5), atr=pawAtr(cs),
    minD=Z.pawMinD==null?1:+Z.pawMinD, sym=Z.pawSym==null?0.5:+Z.pawSym, buf=Z.pawBuf==null?0.1:+Z.pawBuf, tol=Z.pawTol==null?0.3:+Z.pawTol,
    brkW=Math.max(5,Math.round(Z.pawBrkW)||40), retW=Math.max(3,Math.round(Z.pawRetW)||25), span=Math.max(10,Math.round(Z.pawSpan)||120),
    rr=Z.pawRR==null?2:+Z.pawRR, sb=Z.pawSlBuf==null?0.3:+Z.pawSlBuf, zMax=Z.pawZMax==null?1.5:+Z.pawZMax,
    piv=[], pats=[], zones=[], sigB=new Map(), sigR=new Map(), sigZ=new Map();
  const pushPiv=(isH,i,p,t)=>{ const last=piv[piv.length-1];
    if(last&&last.h===isH){ if(isH?p>last.p:p<last.p){ piv[piv.length-1]={i,p,h:isH,t}; return true; } return false; }
    piv.push({i,p,h:isH,t}); return true; };
  const mkEv=(q,x,v,a,brk)=>{ let sl=brk?q.rs.p-sb*a:Math.min(x.l,v)-sb*a; if(!(sl<x.c)) sl=x.l-sb*a;
    const risk=x.c-sl, tpM=v+q.dist, tp=risk>0?(tpM>x.c+0.5*risk?tpM:x.c+rr*risk):null; return {en:x.c,sl,tp}; };
  const onPivot=t=>{
    const cur=piv[piv.length-1]; cur.tr=pawTrend(piv); const pr=piv.length>1?piv[piv.length-2].tr:0;
    // demand zone: structure turns up -> the failed low (lowest of the last two swing lows) becomes the zone
    if(cur.tr===1&&pr!==1){ let lo=null,c2=0; for(let q=piv.length-1;q>=0&&c2<2;q--){ if(!piv[q].h){ c2++; if(!lo||piv[q].p<lo.p) lo=piv[q]; } }
      if(lo&&!zones.some(z=>z.i===lo.i)){ const a=atr[lo.i]||0; let bt=-Infinity; for(let j=Math.max(0,lo.i-2);j<=Math.min(t,lo.i+2);j++) bt=Math.max(bt,Math.max(cs[j].o,cs[j].c));
        const bot=lo.p, top=bot+Math.min(Math.max(bt-bot,0.4*a),zMax*a);
        zones.push({i:lo.i,bot,top,t0:t,st:'live',end:null,touches:0,sigN:0}); } }
    // inverse head and shoulders: L1 (left shoulder) H1 L2 (head) H2 L3 (right shoulder) just confirmed
    const m=piv.length;
    if(!cur.h&&m>=5){ const L3=piv[m-1],H2=piv[m-2],L2=piv[m-3],H1=piv[m-4],L1=piv[m-5];
      const nk=(H1.p+H2.p)/2, depth=nk-L2.p, a=atr[L2.i]||0;
      if(L2.p<L1.p&&L2.p<L3.p&&depth>=minD*a&&depth>0&&L3.i-L1.i<=span&&H2.i>H1.i){
        const dl=nk-L1.p, dr=nk-L3.p;
        if(dl>=0.25*depth&&dr>=0.25*depth&&L1.p-L2.p>=0.2*depth&&L3.p-L2.p>=0.2*depth&&Math.abs(L1.p-L3.p)<=sym*depth){
          const sl=(H2.p-H1.p)/(H2.i-H1.i), val=x=>H1.p+sl*(x-H1.i);
          let ok=val(L3.i)>L3.p; for(let j=H2.i+1;j<=t&&ok;j++){ if(cs[j].c>val(j)+buf*(atr[j]||0)) ok=false; }
          if(ok&&!pats.some(q=>q.hd.i===L2.i&&q.rs.i===L3.i)) pats.push({i1:H1.i,p1:H1.p,i2:H2.i,p2:H2.p,m:sl,ls:L1,hd:L2,rs:L3,dist:val(L2.i)-L2.p,t0:t,st:'wait',brk:null,ret:null,end:null,evB:null,evR:null}); } } } };
  for(let t=0;t<n;t++){
    const x=cs[t], a=atr[t]||0;
    // zones already on the chart: broken, or retested
    zones.forEach(z=>{ if(z.st!=='live'||t<=z.t0) return;
      if(x.c<z.bot-buf*a){ z.st='broken'; z.end=t; return; }
      if(x.l<=z.top){ z.touches++;
        if(x.c>z.bot&&(!Z.pawZBull||x.c>x.o)&&(!Z.pawFirst||z.sigN===0)){ z.sigN++; sigZ.set(t,1); z.ev=z.ev||{}; z.ev[t]={en:x.c,sl:z.bot-sb*a,tp:x.c+rr*(x.c-(z.bot-sb*a))}; } } });
    // patterns waiting for the neckline break, then the retest
    pats.forEach(q=>{ if(t<=q.t0||(q.st!=='wait'&&q.st!=='brk')) return; const v=q.p1+q.m*(t-q.i1);
      if(q.st==='wait'){
        if(x.c<q.hd.p){ q.st='fail'; q.end=t; }
        else if(x.c>v+buf*a&&(!Z.pawBull||x.c>x.o)){ q.st='brk'; q.brk=t; q.evB=Object.assign({t},mkEv(q,x,v,a,true)); sigB.set(t,1); }
        else if(t>q.rs.i+brkW){ q.st='exp'; q.end=t; } }
      else if(q.st==='brk'){
        if(x.c<v-buf*a){ q.st='fake'; q.end=t; }
        else if(t>=q.brk+2&&x.l<=v+tol*a&&x.c>=v&&(!Z.pawBull||x.c>x.o)){ q.ret=t; q.evR=Object.assign({t},mkEv(q,x,v,a,false)); sigR.set(t,1); q.st='ret'; q.end=t; }
        else if(t>q.brk+retW){ q.st='done'; q.end=t; } } });
    // a swing pivot is confirmed L bars after it formed
    const k=t-L;
    if(k>=L){ let ih=true,il=true;
      for(let j=k-L;j<=k+L;j++){ if(j===k) continue; if(j<k?cs[j].h>=cs[k].h:cs[j].h>cs[k].h) ih=false; if(j<k?cs[j].l<=cs[k].l:cs[j].l<cs[k].l) il=false; }
      let ord=[]; if(ih&&il){ const lh=piv.length?piv[piv.length-1].h:null; ord=lh===true?[false,true]:[true,false]; } else if(ih) ord=[true]; else if(il) ord=[false];
      ord.forEach(isH=>{ if(pushPiv(isH,k,isH?cs[k].h:cs[k].l,t)) onPivot(t); }); } }
  return {piv,pats,zones,sigB,sigR,sigZ}; }
const pawCache={};
function pawRun(c,Z,m){ m=m||c.length; const l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.pawDir,Z.pawSetup,Z.pawEntry,Z.pawL,Z.pawMinD,Z.pawSym,Z.pawSpan,Z.pawBuf,Z.pawTol,Z.pawBull,Z.pawBrkW,Z.pawRetW,Z.pawZMax,Z.pawZBull,Z.pawFirst,Z.pawRR,Z.pawSlBuf].join('|');
  const h=pawCache[Z.sid]; if(h&&h.k===key) return h.r;
  const pats=[], zones=[], sig=new Map(), sl=m>6000?m-6000:0, cc=c.slice(sl,m), eb=Z.pawEntry!=='Retest only', er=Z.pawEntry!=='Break only', useP=Z.pawSetup!=='Zone only', useZ=Z.pawSetup!=='Pattern only';
  let piv=[];
  [1,-1].forEach(s=>{
    const cs=cc.map(x=>s===1?{o:x.open,h:x.high,l:x.low,c:x.close}:{o:-x.open,h:-x.low,l:-x.high,c:-x.close}), r=pawMachine(cs,Z);
    if(s===1){ let lh=null,ll=null; piv=r.piv.map(v=>{ const q={i:v.i+sl,p:v.p,h:v.h,tr:v.tr||0}; if(v.h){ q.lab=lh==null?'':(v.p>lh?'HH':'LH'); lh=v.p; } else { q.lab=ll==null?'':(v.p>ll?'HL':'LL'); ll=v.p; } return q; }); }
    if(Z.pawDir==='Sell only'&&s===1) return; if(Z.pawDir==='Buy only'&&s===-1) return;
    r.pats.forEach(q=>{ q.s=s; q.off=sl; pats.push(q); }); r.zones.forEach(q=>{ q.s=s; q.off=sl; zones.push(q); });
    if(useP&&eb) r.sigB.forEach((v,i)=>{ sig.set(i+sl,s); }); if(useP&&er) r.sigR.forEach((v,i)=>{ sig.set(i+sl,s); }); if(useZ) r.sigZ.forEach((v,i)=>{ sig.set(i+sl,s); }); });
  pats.sort((a,b)=>(a.rs.i+a.off)-(b.rs.i+b.off)); zones.sort((a,b)=>(a.i+a.off)-(b.i+b.off));
  const r={piv,pats,zones,sig}; pawCache[Z.sid]={k:key,r}; return r; }
function pawDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<31) return; const m=c.length-1, r=pawRun(c,Z,m); if(!r) return;
  const fs=PAW_FS[Z.pawSize]||7.5, ext=Math.max(0,Math.round(Z.pawExt==null?15:Z.pawExt)), retW=Math.max(3,Math.round(Z.pawRetW)||25), brkW=Math.max(5,Math.round(Z.pawBrkW)||40),
    eb=Z.pawEntry!=='Retest only', er=Z.pawEntry!=='Break only', useP=Z.pawSetup!=='Zone only', lbl=Z.pawLbl!==false,
    cUp=Z.pawUp||'#4caf50', cDn=Z.pawDn||'#f23645', cNe=Z.pawNe||'#9297a7', cZD=Z.pawZD||'#26a69a', cZS=Z.pawZS||'#ef5350', cNk=Z.pawNk||'#42a5f5', cX=Z.pawXC||'#ff1744', cA=Z.pawArC||'#2979ff',
    bC=Z.buyCol||'#2dd4a7', sC=Z.sellCol||'#ff5d7a', fg='#d1d4dc';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle'; cx.textAlign='center';
  const txt=(t,x,y,col,bold)=>{ cx.font=(bold?'bold ':'')+fs+'px system-ui'; cx.textAlign='center'; cx.fillStyle=col; cx.fillText(t,x,y); };
  const hl=(p,i0,i1,col,dash)=>{ const y=Y(p), a=X(i0), b=X(i1); if(y==null||a==null||b==null) return null; cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(a,y); cx.lineTo(b,y); cx.stroke(); cx.setLineDash([]); return {a,b,y}; };
  const infoMode=Z.pawLblMode!=='BUY / SELL', cInfo='#6aa7ff';
  const infoTag=(idx,up,label,col)=>{ col=col||cInfo; const cb=c[idx], x=X(idx); if(!cb||x==null||x<-30||x>W+30) return; const ye=Y(up?cb.high:cb.low); if(ye==null) return;
    cx.save(); cx.font='600 '+fs+'px system-ui'; const w=cx.measureText(label).width+10, h=fs+7, g=9, yc=up?ye-g-h/2:ye+g+h/2, x0=x-w/2, y0=yc-h/2, rr=3;
    cx.strokeStyle=col; cx.fillStyle=col; cx.lineWidth=1; cx.globalAlpha=0.9; cx.beginPath(); cx.moveTo(x,ye+(up?-2:2)); cx.lineTo(x,up?y0+h:y0); cx.stroke();
    cx.fillStyle='rgba(19,23,34,.9)'; cx.beginPath(); cx.moveTo(x0+rr,y0); cx.lineTo(x0+w-rr,y0); cx.arcTo(x0+w,y0,x0+w,y0+rr,rr); cx.lineTo(x0+w,y0+h-rr); cx.arcTo(x0+w,y0+h,x0+w-rr,y0+h,rr); cx.lineTo(x0+rr,y0+h); cx.arcTo(x0,y0+h,x0,y0+h-rr,rr); cx.lineTo(x0,y0+rr); cx.arcTo(x0,y0,x0+rr,y0,rr); cx.closePath(); cx.fill(); cx.stroke();
    cx.globalAlpha=1; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillStyle=col; cx.fillText(label,x,yc+0.5); cx.restore(); };
  // 1) supply / demand zones
  r.zones.filter(z=>Z.pawHist!==false||z.st==='live').slice(-Math.max(1,Math.round(Z.pawNZ)||4)).forEach(z=>{
    const s=z.s, o=z.off, dem=s===1, col=dem?cZD:cZS, live=z.st==='live', e=live?(m-o+ext):z.end;
    const xa=X(z.i+o), xb=X(e+o), y1=Y(s*z.top), y2=Y(s*z.bot); if(xa==null||xb==null||y1==null||y2==null) return;
    const yt=Math.min(y1,y2), hh=Math.max(2,Math.abs(y2-y1)), cc=live?col:cNe;
    cx.fillStyle=rgba(cc,live?0.2:0.08); cx.fillRect(xa,yt,xb-xa,hh); cx.strokeStyle=rgba(cc,live?0.9:0.4); cx.lineWidth=1; cx.strokeRect(xa,yt,xb-xa,hh);
    if(infoMode&&Z.pawMk!==false&&Z.pawSetup!=='Pattern only'&&z.ev) Object.keys(z.ev).forEach(t=>{ infoTag(+t+o,!dem,'Retest',dem?bC:sC); });
    if(lbl){ cx.font='bold '+fs+'px system-ui'; cx.textAlign='left'; cx.fillStyle=live?fg:cNe; cx.fillText((dem?'Demand':'Supply')+(z.touches?' \u00b7 '+z.touches+'x':'')+(live?'':' (broken)'),xa+4,yt+(dem?hh+fs:-fs)); cx.textAlign='center'; } });
  // 2) swing waves: zigzag coloured by the trend at each pivot + HH / HL / LH / LL labels
  const pv=r.piv.slice(-Math.max(2,Math.round(Z.pawNP)||40));
  if(Z.pawZig!==false){ cx.lineWidth=1.4; for(let q=1;q<pv.length;q++){ const a=pv[q-1], b=pv[q], xa=X(a.i), xb=X(b.i), ya=Y(a.p), yb=Y(b.p); if(xa==null||xb==null||ya==null||yb==null) continue;
      cx.strokeStyle=b.tr===1?cUp:(b.tr===-1?cDn:cNe); cx.beginPath(); cx.moveTo(xa,ya); cx.lineTo(xb,yb); cx.stroke(); } }
  if(Z.pawLab!==false) pv.forEach(p=>{ if(!p.lab) return; const x=X(p.i), y=Y(p.p); if(x==null||y==null||x<-20||x>W+20) return; txt(p.lab,x,y+(p.h?-9:9),(p.lab==='HH'||p.lab==='HL')?cUp:cDn,true); });
  // 3) head and shoulders / inverse head and shoulders
  if(useP) r.pats.filter(q=>Z.pawHist!==false||q.st==='wait'||q.st==='brk').slice(-Math.max(1,Math.round(Z.pawN)||3)).forEach(q=>{
    const s=q.s, o=q.off, P=v=>s*v, buy=s===1, val=x=>q.p1+q.m*(x-q.i1), k=buy?1:-1, db=Z.pawRev!==false?!buy:buy, ka=db?1:-1; let e;
    if(q.st==='wait') e=Math.min(m-o,q.rs.i+brkW)+(m-o<=q.rs.i+brkW?ext:0); else if(q.st==='brk') e=Math.min(m-o+ext,q.brk+retW); else if(q.st==='ret') e=q.ret+4; else if(q.st==='done') e=q.brk+retW; else e=q.end;
    const pts=[q.ls,{i:q.i1,p:q.p1},q.hd,{i:q.i2,p:q.p2},q.rs];
    if(Z.pawPoly!==false){ cx.strokeStyle=rgba(cNe,0.9); cx.lineWidth=1; cx.setLineDash([3,3]); cx.beginPath(); let st=false; pts.forEach(p=>{ const x=X(p.i+o), y=Y(P(p.p)); if(x==null||y==null) return; if(!st){ cx.moveTo(x,y); st=true; } else cx.lineTo(x,y); }); cx.stroke(); cx.setLineDash([]); }
    const xa=X(q.i1+o), xb=X(e+o), ya=Y(P(val(q.i1))), yb=Y(P(val(e))); if(xa!=null&&xb!=null&&ya!=null&&yb!=null){
      cx.strokeStyle=cNk; cx.lineWidth=1.5; cx.setLineDash([6,4]); cx.beginPath(); cx.moveTo(xa,ya); cx.lineTo(xb,yb); cx.stroke(); cx.setLineDash([]); }
    if(lbl){ [[q.ls,'Left Shoulder'],[q.hd,'Head'],[q.rs,'Right Shoulder']].forEach(a=>{ const x=X(a[0].i+o), y=Y(P(a[0].p)); if(x==null||y==null) return; cx.strokeStyle=cNk; cx.lineWidth=1.5; cx.beginPath(); cx.arc(x,y,5,0,6.2832); cx.stroke(); txt(a[1],x,y+k*(fs+11),fg); });
      const xm=X(q.hd.i+o), ym=Y(P(val(q.hd.i))); if(xm!=null&&ym!=null) txt((buy?'Inverse H&S':'Head & Shoulders')+' \u00b7 '+({wait:'waiting for break',brk:'neckline broken',ret:'retested',done:'broken',fake:'failed',fail:'failed',exp:'expired'}[q.st]||''),xm,ym-k*(fs+5),cNk,true); }
    const pillB=(idx,up,label,col)=>{ const cb=c[idx], x=X(idx); if(!cb||x==null) return; const ye=Y(up?cb.low:cb.high); if(ye==null) return;
      cx.font='bold '+(fs+1.5)+'px system-ui'; const tw=cx.measureText(label).width, w=tw+18, h=fs+12, g=11, yc=up?ye+g+h/2:ye-g-h/2, x0=x-w/2, y0=yc-h/2, r=h/2;
      cx.save(); cx.shadowColor=col; cx.shadowBlur=12; cx.fillStyle=col; cx.beginPath(); cx.moveTo(x0+r,y0); cx.lineTo(x0+w-r,y0); cx.arc(x0+w-r,y0+r,r,-1.5708,1.5708); cx.lineTo(x0+r,y0+h); cx.arc(x0+r,y0+r,r,1.5708,4.7124); cx.closePath(); cx.fill();
      cx.beginPath(); if(up){ cx.moveTo(x,ye+2); cx.lineTo(x-4,y0+1); cx.lineTo(x+4,y0+1); } else { cx.moveTo(x,ye-2); cx.lineTo(x-4,y0+h-1); cx.lineTo(x+4,y0+h-1); } cx.closePath(); cx.fill(); cx.restore();
      cx.textAlign='center'; cx.fillStyle='#0b1220'; cx.fillText(label,x,yc+0.5); };
    if(q.brk!=null&&Z.pawMk!==false&&infoMode) infoTag(q.brk+o,buy,'Breakout',buy?bC:sC);
    else if(q.brk!=null&&Z.pawMk!==false) pillB(q.brk+o,db,Z.pawLblMode==='BUY / SELL'?(eb?(db?'\u25B2 BUY':'\u25BC SELL'):'BREAK'):(db?'\u25B2 BREAKOUT':'\u25BC BREAKOUT'),eb?(db?bC:sC):'#9aa0b4');
    const tagR=(idx,up,label,col)=>{ const cb=c[idx], x=X(idx); if(!cb||x==null) return; const ye=Y(up?cb.high:cb.low); if(ye==null) return;
      cx.font='bold '+(fs+0.5)+'px system-ui'; const w=cx.measureText(label).width+14, h=fs+9, g=18, yc=up?ye-g-h/2:ye+g+h/2, x0=x-w/2, y0=yc-h/2, r=4;
      cx.save(); cx.strokeStyle=col; cx.fillStyle=col; cx.lineWidth=1; cx.setLineDash([2,2]); cx.beginPath(); cx.moveTo(x,ye+(up?-3:3)); cx.lineTo(x,up?y0+h:y0); cx.stroke(); cx.setLineDash([]);
      cx.beginPath(); cx.arc(x,ye+(up?-3:3),2.2,0,6.2832); cx.fill();
      cx.fillStyle='rgba(19,23,34,.92)'; cx.lineWidth=1.4; cx.beginPath(); cx.moveTo(x0+r,y0); cx.lineTo(x0+w-r,y0); cx.arcTo(x0+w,y0,x0+w,y0+r,r); cx.lineTo(x0+w,y0+h-r); cx.arcTo(x0+w,y0+h,x0+w-r,y0+h,r); cx.lineTo(x0+r,y0+h); cx.arcTo(x0,y0+h,x0,y0+h-r,r); cx.lineTo(x0,y0+r); cx.arcTo(x0,y0,x0+r,y0,r); cx.closePath(); cx.fill(); cx.stroke(); cx.restore();
      cx.textAlign='center'; cx.fillStyle=col; cx.fillText(label,x,yc+0.5); };
    if(q.ret!=null&&Z.pawMk!==false&&infoMode) infoTag(q.ret+o,buy,'Retest',buy?bC:sC);
    else if(q.ret!=null&&Z.pawMk!==false) tagR(q.ret+o,db,Z.pawLblMode==='BUY / SELL'?(er?'RETEST '+(db?'\u25B2 BUY':'\u25BC SELL'):'RETEST'):'RETEST '+(db?'\u25B2':'\u25BC'),er?(db?bC:sC):'#9aa0b4');
    if(Z.pawSLTP===true){ const ev=eb&&q.evB?q.evB:(er&&q.evR?q.evR:null);
      if(ev&&ev.tp!=null){ const a=ev.t+o, e2=a+25, tp1v=ev.en+(ev.tp-ev.en)/2, dot=[2,3], sl=hl(P(ev.sl),a,e2,'#f23645',dot), t1=hl(P(tp1v),a,e2,'#089981',dot), t2=hl(P(ev.tp),a,e2,'#089981',dot); if(sl) txt('SL',sl.b+14,sl.y,'#fff'); if(t1) txt('TP1',t1.b+14,t1.y,'#fff'); if(t2) txt('TP2',t2.b+14,t2.y,'#fff'); } } });
  // 4) trend badge
  if(Z.pawBadge!==false&&r.piv.length){ const tr=r.piv[r.piv.length-1].tr, t1=tr===1?'Uptrend \u00b7 HH + HL':(tr===-1?'Downtrend \u00b7 LH + LL':'Range / transition'), col=tr===1?cUp:(tr===-1?cDn:cNe);
    cx.font='bold 10px system-ui'; const tw=cx.measureText('Wave trend: '+t1).width+16, bx=W-tw-8, by=8; cx.fillStyle='rgba(19,23,34,.82)'; cx.fillRect(bx,by,tw,20); cx.fillStyle=col; cx.fillRect(bx,by,3,20);
    cx.textAlign='left'; cx.fillStyle=fg; cx.fillText('Wave trend: '+t1,bx+9,by+10); cx.textAlign='center'; }
  cx.globalAlpha=1; cx.restore(); }
STRATS.paw={label:'Price Action Wave Analysis \u00b7 HH / HL / LH / LL swing waves, supply / demand zones and Head & Shoulders with neckline break / retest',short:'Price Action Wave Analysis',own:true,
  defs:{limit:false,useSl:false,pawDir:'Both',pawSetup:'Both',pawEntry:'Break only',pawL:5,pawMinD:1,pawSym:0.5,pawSpan:120,pawBuf:0.1,pawTol:0.3,pawBull:true,pawBrkW:40,pawRetW:25,pawZMax:1.5,pawZBull:true,pawFirst:true,pawRR:2,pawSlBuf:0.3,
    pawUp:'#4caf50',pawDn:'#f23645',pawNe:'#9297a7',pawZD:'#26a69a',pawZS:'#ef5350',pawNk:'#42a5f5',pawXC:'#ff1744',pawArC:'#2979ff',
    pawZig:true,pawLab:true,pawPoly:true,pawBadge:true,pawLbl:true,pawMk:true,pawLblMode:'Breakout / Retest',pawSLTP:false,pawRev:true,pawHist:true,pawExt:15,pawNP:40,pawN:3,pawNZ:4,pawSize:'Small',pawSig:true},
  inputs:(b,d)=>{
    fld(b,d,'pawDir','sel','Trade direction (Buy = demand zone / inverse H&S, Sell = supply zone / H&S)',{opts:['Both','Buy only','Sell only']});
    fld(b,d,'pawSetup','sel','Signals from',{opts:['Both','Pattern only','Zone only']});
    fld(b,d,'pawEntry','sel','Head & Shoulders entry (retest = the safer entry)',{opts:['Break only','Retest only','Break + Retest']});
    fld(b,d,'pawL','num','Swing pivot length (bars each side)',{min:2,max:30,step:1});
    fld(b,d,'pawMinD','num','H&S min head depth (x ATR)',{min:0.2,max:10,step:0.1}); fld(b,d,'pawSym','num','H&S shoulder symmetry (max gap, share of head depth)',{min:0.1,max:1,step:0.05});
    fld(b,d,'pawSpan','num','H&S max bars from left to right shoulder',{min:20,max:600,step:5}); fld(b,d,'pawBuf','num','Break buffer beyond the line (x ATR)',{min:0,max:2,step:0.05});
    fld(b,d,'pawBull','chk','Break / retest candle must close in trade direction'); fld(b,d,'pawBrkW','num','Neckline break window after right shoulder (bars)',{min:5,max:300,step:1});
    fld(b,d,'pawRetW','num','Retest window after the break (bars)',{min:3,max:150,step:1}); fld(b,d,'pawTol','num','Retest tolerance (x ATR)',{min:0.05,max:2,step:0.05});
    fld(b,d,'pawZMax','num','Max zone height (x ATR)',{min:0.4,max:6,step:0.1}); fld(b,d,'pawZBull','chk','Zone retest candle must close in trade direction'); fld(b,d,'pawFirst','chk','Zone signal on first retest only');
    fld(b,d,'pawRR','num','Take profit fallback (R multiple)',{min:0.5,max:10,step:0.5}); fld(b,d,'pawSlBuf','num','Stop buffer (x ATR)',{min:0,max:3,step:0.05});
    fld(b,d,'pawUp','col','Up wave colour'); fld(b,d,'pawDn','col','Down wave colour'); fld(b,d,'pawNe','col','Range / neutral colour'); fld(b,d,'pawZD','col','Demand zone colour'); fld(b,d,'pawZS','col','Supply zone colour');
    fld(b,d,'pawNk','col','Neckline colour'); fld(b,d,'pawXC','col','Break X colour'); fld(b,d,'pawArC','col','Retest arrow colour');
    fld(b,d,'pawZig','chk','Swing wave zigzag'); fld(b,d,'pawLab','chk','HH / HL / LH / LL labels'); fld(b,d,'pawPoly','chk','Draw the H&S wave path'); fld(b,d,'pawBadge','chk','Wave trend badge');
    fld(b,d,'pawLbl','chk','Show labels'); fld(b,d,'pawMk','chk','Signal buttons'); fld(b,d,'pawLblMode','sel','Signal wording',{opts:['Breakout / Retest','BUY / SELL']}); fld(b,d,'pawSLTP','chk','Show SL / TP1 / TP2 on signal'); fld(b,d,'pawRev','chk','Reverse signals (do the opposite of the pattern)'); fld(b,d,'pawHist','chk','Keep finished patterns / broken zones on the chart');
    fld(b,d,'pawExt','num','Extend live lines / zones to the right (bars)',{min:0,max:200,step:5}); fld(b,d,'pawSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'pawNP','num','Swing pivots shown',{min:4,max:200,step:2}); fld(b,d,'pawN','num','H&S patterns shown',{min:1,max:20,step:1}); fld(b,d,'pawNZ','num','Zones shown',{min:1,max:20,step:1});
    fld(b,d,'pawSig','chk','Chart signals (arrows)'); },
  sig:(c,i,n,Z)=>{ if(Z.pawSig===false||c.length<30) return 0; const r=pawRun(c,Z); return r?(Z.pawRev!==false?-1:1)*(r.sig.get(i)||0):0; }};
try{ DESC.paw='Swing waves HH / HL / LH / LL, demand & supply zones, Head & Shoulders neckline break / retest'; }catch(e){}
{ const _pwD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='pawview') return pawDraw(d,X,Y,W,H); return _pwD.apply(this,arguments); };
  const _pwR=recomputeExtras; recomputeExtras=function(){ _pwR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='paw'&&stVis(Z)) scriptBoxes.push({type:'pawview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('paw strategy failed',err); window.__pawErr=err; }

// =====================================================================================
// [fpc] STRATEGY · "Fakey + Pin Bar Combo" (PriceAction.com method)   (self-contained: every name starts with fpc / FPC)
// A previous swing high / low is a key level (blue zone, red line). When price comes back to it and prints a rejection
// candle (pin bar = long wick, small body, closes back off the level, and / or a Fakey = false break of an inside bar that closes back inside)
// the level is respected: BUY at support / SELL at resistance. Old support that was broken becomes resistance and the other way round.
// Stop beyond the pattern wick, target = next key level (or R multiple). Hooks: STRATS.fpc + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const FPC_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
function fpcAtr(cs){ const o=new Array(cs.length).fill(0); let p=null; for(let i=0;i<cs.length;i++){ const x=cs[i], tr=i?Math.max(x.h-x.l,Math.abs(x.h-cs[i-1].c),Math.abs(x.l-cs[i-1].c)):x.h-x.l; p=p==null?tr:(p*13+tr)/14; o[i]=p; } return o; }
// cs: candles already mirrored so the machine always looks for BULLISH setups (rejection at support = BUY)
function fpcMachine(cs,Z){
  const n=cs.length, L=Math.max(2,Math.round(Z.fpcL)||5), atr=fpcAtr(cs), tol=Z.fpcTol==null?0.35:+Z.fpcTol, age=Math.max(20,Math.round(Z.fpcAge)||400),
    minT=Math.max(1,Math.round(Z.fpcMinT)||1), pinR=Z.fpcPinR==null?0.6:+Z.fpcPinR, minR=Z.fpcMinR==null?0.5:+Z.fpcMinR, wk=Z.fpcWick==null?0.3:+Z.fpcWick,
    mode=Z.fpcMode||'Pin or Fakey', sb=Z.fpcSlBuf==null?0.2:+Z.fpcSlBuf, rr=Z.fpcRR==null?2:+Z.fpcRR, cd=Math.max(0,Math.round(Z.fpcCd==null?3:Z.fpcCd)),
    lv=[], ev=[], sig=new Map(); let last=-1e9;
  for(let t=0;t<n;t++){
    const x=cs[t], a=atr[t]||0;
    if(t>=3&&t-last>cd&&a>0){
      const z=tol*a; let best=null,bd=1e18;
      for(const q of lv){ if(q.t>=t||t-q.i>age||q.n<minT) continue;
        if(x.l<=q.p+z&&x.l>=q.p-1.5*z&&x.c>=q.p-0.5*z&&cs[t-1].c>q.p-z){ const d=Math.abs(x.l-q.p); if(d<bd){ bd=d; best=q; } } }
      if(best){
        const rng=x.h-x.l, lw=Math.min(x.o,x.c)-x.l, uw=x.h-Math.max(x.o,x.c), bo=Math.abs(x.c-x.o), m0=cs[t-2], ib=cs[t-1];
        const pin=rng>=minR*a&&lw>=pinR*rng&&uw<=wk*rng&&bo<=0.4*rng;
        const fk=ib.h<=m0.h&&ib.l>=m0.l&&x.l<ib.l&&x.c>ib.l;
        const ok=mode==='Pin bar only'?pin:(mode==='Fakey only'?fk:(mode==='Combo only'?(pin&&fk):(pin||fk)));
        if(ok){ const sl=x.l-sb*a, risk=x.c-sl;
          if(risk>0){ let tpN=null; for(const q of lv){ if(q.t<t&&q.p>=x.c+risk&&(tpN==null||q.p<tpN)) tpN=q.p; }
            const tp=(Z.fpcTP!=='R multiple'&&tpN!=null)?tpN:x.c+rr*risk;
            ev.push({t,lv:best,kind:pin&&fk?'combo':(pin?'pin':'fakey'),pin,fk,en:x.c,sl,tp,z,tpLvl:Z.fpcTP!=='R multiple'&&tpN!=null}); sig.set(t,1); last=t; } } } }
    // swing pivots (highs and lows) become key levels, nearby ones are merged
    const k=t-L;
    if(k>=L){ let ih=true,il=true;
      for(let j=k-L;j<=k+L;j++){ if(j===k) continue; if(j<k?cs[j].h>=cs[k].h:cs[j].h>cs[k].h) ih=false; if(j<k?cs[j].l<=cs[k].l:cs[j].l<cs[k].l) il=false; }
      const add=(isH,p)=>{ const zz=tol*(atr[k]||0), q=lv.find(u=>Math.abs(u.p-p)<=zz); if(q) q.n++; else { lv.push({i:k,p,h:isH,n:1,t}); if(lv.length>300) lv.shift(); } };
      if(ih) add(true,cs[k].h); if(il) add(false,cs[k].l); } }
  return {lv,ev,sig}; }
const fpcCache={};
function fpcRun(c,Z,m){ m=m||c.length; const l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.fpcDir,Z.fpcMode,Z.fpcL,Z.fpcTol,Z.fpcAge,Z.fpcMinT,Z.fpcPinR,Z.fpcMinR,Z.fpcWick,Z.fpcTP,Z.fpcRR,Z.fpcSlBuf,Z.fpcCd].join('|');
  const h=fpcCache[Z.sid]; if(h&&h.k===key) return h.r;
  const evs=[], sig=new Map(), sl=m>6000?m-6000:0, cc=c.slice(sl,m); let lv=[];
  [1,-1].forEach(s=>{
    const cs=cc.map(x=>s===1?{o:x.open,h:x.high,l:x.low,c:x.close}:{o:-x.open,h:-x.low,l:-x.high,c:-x.close}), r=fpcMachine(cs,Z);
    if(s===1) lv=r.lv.map(q=>({i:q.i+sl,p:q.p,h:q.h,n:q.n}));
    if(Z.fpcDir==='Sell only'&&s===1) return; if(Z.fpcDir==='Buy only'&&s===-1) return;
    r.ev.forEach(e=>{ e.s=s; e.off=sl; evs.push(e); }); r.sig.forEach((v,i)=>{ sig.set(i+sl,s); }); });
  evs.sort((a,b)=>(a.t+a.off)-(b.t+b.off));
  const r={ev:evs,sig,lv}; fpcCache[Z.sid]={k:key,r}; return r; }
function fpcDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<31) return; const m=c.length-1, r=fpcRun(c,Z,m); if(!r) return;
  const fs=FPC_FS[Z.fpcSize]||7.5, ext=Math.max(0,Math.round(Z.fpcExt==null?20:Z.fpcExt)), lbl=Z.fpcLbl!==false,
    cLv=Z.fpcLv||'#e53935', cZn=Z.fpcZn||'#5c7cfa', cAr=Z.fpcAr||'#d32f2f', cBx=Z.fpcBx||'#e53935', bC=Z.buyCol||'#2dd4a7', sC=Z.sellCol||'#ff5d7a', fg='#d1d4dc';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle'; cx.textAlign='center';
  const txt=(t,x,y,col,bold)=>{ cx.font=(bold?'bold ':'')+fs+'px system-ui'; cx.textAlign='center'; cx.fillStyle=col; cx.fillText(t,x,y); };
  const hl=(p,i0,i1,col,dash)=>{ const y=Y(p), a=X(i0), b=X(i1); if(y==null||a==null||b==null) return null; cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(a,y); cx.lineTo(b,y); cx.stroke(); cx.setLineDash([]); return {a,b,y}; };
  // all active key levels (optional, faint)
  if(Z.fpcLvAll===true){ const age=Math.max(20,Math.round(Z.fpcAge)||400); r.lv.filter(q=>m-q.i<=age&&q.n>=Math.max(1,Math.round(Z.fpcMinT)||1)).slice(-15).forEach(q=>{ hl(q.p,q.i,m+ext,rgba(cLv,0.35),[4,4]); }); }
  r.ev.slice(-Math.max(1,Math.round(Z.fpcN)||6)).forEach(e=>{
    const s=e.s, o=e.off, P=v=>s*v, buy=s===1, k=buy?1:-1, q=e.lv, t=e.t+o, i0=q.i+o, cb=c[t]; if(!cb) return;
    // key level line + blue zones (previous swing and the retest)
    const ln=hl(P(q.p),i0,t+ext,cLv); const zy1=Y(P(q.p+e.z)), zy2=Y(P(q.p-e.z));
    if(zy1!=null&&zy2!=null){ const zt=Math.min(zy1,zy2), zh=Math.max(3,Math.abs(zy2-zy1));
      [[i0-2,i0+2],[t-3,t+2]].forEach(a=>{ const xa=X(a[0]), xb=X(a[1]); if(xa==null||xb==null) return; cx.fillStyle=rgba(cZn,0.5); cx.fillRect(xa,zt,xb-xa,zh); }); }
    const realLow=s===1?!q.h:q.h, px=X(i0), py=Y(P(q.p));
    if(lbl&&px!=null&&py!=null) txt('Previous swing '+(realLow?'low':'high'),px,py+(realLow?1:-1)*(fs*2+8),cLv,true);
    // fakey: red box around the inside bar + the false-break bar
    if(e.fk&&Z.fpcMk!==false){ const a=c[t-1]; if(a){ const xa=X(t-1), xb=X(t), y1=Y(Math.max(a.high,cb.high)), y2=Y(Math.min(a.low,cb.low)); if(xa!=null&&xb!=null&&y1!=null&&y2!=null){ cx.strokeStyle=cBx; cx.lineWidth=2; cx.strokeRect(xa-5,Math.min(y1,y2)-3,xb-xa+10,Math.abs(y2-y1)+6); } } }
    // pin bar: circle on the rejection wick, arrow in the trade direction
    const x=X(t), y=Y(buy?cb.low:cb.high);
    if(x!=null&&y!=null&&Z.fpcMk!==false){
      if(e.pin){ cx.strokeStyle=cBx; cx.lineWidth=2; cx.beginPath(); cx.ellipse(x,y,9,6,0,0,6.2832); cx.stroke(); }
      const tip=y+k*10, base=y+k*40; cx.strokeStyle=cx.fillStyle=cAr; cx.lineWidth=3.5; cx.beginPath(); cx.moveTo(x,base); cx.lineTo(x,tip+k*6); cx.stroke();
      cx.beginPath(); cx.moveTo(x,tip); cx.lineTo(x-7,tip+k*12); cx.lineTo(x+7,tip+k*12); cx.closePath(); cx.fill();
      if(lbl) txt((e.kind==='combo'?'Fakey + Pin bar':(e.kind==='pin'?'Pin bar':'Fakey'))+(buy?' BUY at support':' SELL at resistance'),x,base+k*(fs+5),buy?bC:sC,true); }
    });
  cx.globalAlpha=1; cx.restore(); }
STRATS.fpc={label:'Fakey + Pin Bar Combo \u00b7 rejection candle at a previous swing high / low (support & resistance), BUY / SELL with stop beyond the wick',short:'Fakey + Pin Bar Combo',own:true,
  defs:{limit:false,useSl:false,fpcDir:'Both',fpcMode:'Pin or Fakey',fpcL:5,fpcTol:0.35,fpcAge:400,fpcMinT:1,fpcPinR:0.6,fpcMinR:0.5,fpcWick:0.3,fpcTP:'Next level',fpcRR:2,fpcSlBuf:0.2,fpcCd:3,
    fpcLv:'#e53935',fpcZn:'#5c7cfa',fpcAr:'#d32f2f',fpcBx:'#e53935',fpcLvAll:false,fpcLbl:true,fpcMk:true,fpcN:6,fpcExt:20,fpcSize:'Small',fpcSig:true},
  inputs:(b,d)=>{
    fld(b,d,'fpcDir','sel','Trade direction (Buy = support, Sell = resistance)',{opts:['Both','Buy only','Sell only']});
    fld(b,d,'fpcMode','sel','Signal pattern',{opts:['Pin or Fakey','Combo only','Pin bar only','Fakey only']});
    fld(b,d,'fpcL','num','Swing length for key levels (bars each side)',{min:2,max:30,step:1}); fld(b,d,'fpcTol','num','Key level zone (x ATR each side)',{min:0.05,max:2,step:0.05});
    fld(b,d,'fpcAge','num','Max age of a key level (bars)',{min:20,max:3000,step:10}); fld(b,d,'fpcMinT','num','Min swings merged in a level (1 = any swing)',{min:1,max:10,step:1});
    fld(b,d,'fpcPinR','num','Pin bar: min wick share of the candle',{min:0.4,max:0.9,step:0.05}); fld(b,d,'fpcWick','num','Pin bar: max opposite wick share',{min:0.05,max:0.6,step:0.05});
    fld(b,d,'fpcMinR','num','Pin bar: min candle size (x ATR)',{min:0.1,max:3,step:0.1}); fld(b,d,'fpcCd','num','Bars to wait between signals',{min:0,max:50,step:1});
    fld(b,d,'fpcTP','sel','Take profit',{opts:['Next level','R multiple']}); fld(b,d,'fpcRR','num','R multiple (also the fallback when no level is ahead)',{min:0.5,max:10,step:0.5});
    fld(b,d,'fpcSlBuf','num','Stop buffer beyond the wick (x ATR)',{min:0,max:3,step:0.05});
    fld(b,d,'fpcLv','col','Key level colour'); fld(b,d,'fpcZn','col','Zone colour'); fld(b,d,'fpcAr','col','Arrow colour'); fld(b,d,'fpcBx','col','Fakey box / pin circle colour');
    fld(b,d,'fpcLvAll','chk','Show all active key levels (faint)'); fld(b,d,'fpcLbl','chk','Show labels'); fld(b,d,'fpcMk','chk','Pattern markers (box, circle, arrow)');
    fld(b,d,'fpcN','num','Signals shown on chart',{min:1,max:50,step:1}); fld(b,d,'fpcExt','num','Extend level to the right (bars)',{min:0,max:200,step:5}); fld(b,d,'fpcSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'fpcSig','chk','BUY / SELL signals'); },
  sig:(c,i,n,Z)=>{ if(Z.fpcSig===false||c.length<30) return 0; const r=fpcRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.fpc='Strategy \u00b7 pin bar / Fakey rejection at a previous swing high or low: BUY at support, SELL at resistance'; }catch(e){}
{ const _fpD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='fpcview') return fpcDraw(d,X,Y,W,H); return _fpD.apply(this,arguments); };
  const _fpR=recomputeExtras; recomputeExtras=function(){ _fpR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='fpc'&&stVis(Z)) scriptBoxes.push({type:'fpcview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('fpc strategy failed',err); window.__fpcErr=err; }


// =====================================================================================
// [gpa] STRATEGY · "Gap Analysis" (Fair Value Gap + structure + flag, "How to analyse a gap in the market")   (self-contained: every name starts with gpa / GPA)
// 1) Strong move: one big impulse candle that leaves a Fair Value Gap (3-candle imbalance).  2) Price bases at the bottom, then prints
// HL -> HH (structure turns).  3) A descending Flag pulls back; the flag break = BUY (mirror for SELL).  4) Target = the gap fill
// (top of the strong candle or the FVG edge).  5) Optional: after the gap is filled and rejected = SELL (the move continues in the
// original direction).  Hooks: STRATS.gpa + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const GPA_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
function gpaAtr(cs){ const o=new Array(cs.length).fill(0); let p=null; for(let i=0;i<cs.length;i++){ const x=cs[i], tr=i?Math.max(x.h-x.l,Math.abs(x.h-cs[i-1].c),Math.abs(x.l-cs[i-1].c)):x.h-x.l; p=p==null?tr:(p*13+tr)/14; o[i]=p; } return o; }
function gpaPush(seq,pv){ const l=seq[seq.length-1]; if(l&&l.h===pv.h){ if(pv.h?pv.p>l.p:pv.p<l.p) seq[seq.length-1]=pv; } else seq.push(pv); }
// bottom (lowest pivot low) -> HL -> HH, then a lower pivot high = flag. returns the points or null
function gpaStruct(seq,tl){
  let iL=-1; for(let i=0;i<seq.length;i++){ if(!seq[i].h&&(iL<0||seq[i].p<seq[iL].p)) iL=i; } if(iL<0) return null;
  let iH=-1; for(let j=iL+3;j<seq.length;j++){ if(seq[j].h&&(iH<0||seq[j].p>=seq[iH].p)) iH=j; } if(iH<0) return null;
  const L1=seq[iL], H2=seq[iH], L2=seq[iH-1]; if(!L2||L2.h||!(L2.p>L1.p)) return null;
  let H1=null; for(let j=iL+1;j<=iH-2;j++){ if(seq[j].h&&(!H1||seq[j].p>H1.p)) H1=seq[j]; } if(!H1||!(H2.p>H1.p)) return null;
  let H3=null,L3=null; for(const q of seq.slice(iH+1)){ if(!q.h){ if(q.p<L2.p-tl) return null; if(!L3||q.p<L3.p) L3=q; } else { if(q.p>=H2.p) return null; H3=q; } }
  if(!H3) return null; return {L1,H1,L2,H2,H3,L3}; }
// cs: candles already mirrored so the machine always looks for BULLISH setups after a strong BEARISH move
function gpaMachine(cs,Z){
  const n=cs.length, L=Math.max(2,Math.round(Z.gpaL)||5), atr=gpaAtr(cs), imp=Z.gpaImp==null?2:+Z.gpaImp, mg=Z.gpaMinGap==null?0.1:+Z.gpaMinGap,
    age=Math.max(30,Math.round(Z.gpaAge)||300), minF=Math.max(1,Math.round(Z.gpaFlagMin)||4), tol=Z.gpaTol==null?0.3:+Z.gpaTol, sb=Z.gpaSlBuf==null?0.2:+Z.gpaSlBuf,
    rr=Z.gpaRR==null?2:+Z.gpaRR, mrr=Z.gpaMinRR==null?1:+Z.gpaMinRR, tm=Z.gpaTgt||'Move origin', fs=Z.gpaFill!==false, gaps=[], all=[], ev=[], sig=new Map();
  for(let t=0;t<n;t++){
    const x=cs[t], a=atr[t]||0;
    // 1) strong bearish candle leaving a fair value gap (high of candle t-2 above low of candle t... mirrored: low[t-2] > high[t])
    if(t>=2){ const A=cs[t-2], B=cs[t-1], a0=atr[t-2]||0;
      if(a0>0&&A.l>x.h&&B.c<B.o&&(B.h-B.l)>=imp*a0&&(A.l-x.h)>=mg*a0){
        const ng={c:t,b:t-1,top:A.l,bot:x.h,org:B.h,tgt:tm==='FVG edge'?A.l:Math.max(B.h,A.l),seq:[],done:false,sigDone:false,flT:-1,fillT:null}; gaps.push(ng); all.push(ng); if(gaps.length>12) gaps.shift(); if(all.length>300) all.shift(); } }
    // 2) swing pivots feed every open gap
    const k=t-L;
    if(k>=L){ let ih=true,il=true;
      for(let j=k-L;j<=k+L;j++){ if(j===k) continue; if(j<k?cs[j].h>=cs[k].h:cs[j].h>cs[k].h) ih=false; if(j<k?cs[j].l<=cs[k].l:cs[j].l<cs[k].l) il=false; }
      gaps.forEach(g=>{ if(g.done||k<g.c) return; if(il) gpaPush(g.seq,{h:false,i:k,p:cs[k].l}); if(ih) gpaPush(g.seq,{h:true,i:k,p:cs[k].h}); }); }
    // 3) flag break = BUY, gap fill = target
    gaps.forEach(g=>{ if(g.done) return; if(t-g.c>age){ g.done=true; return; }
      if(!g.sigDone&&a>0){ const st=gpaStruct(g.seq,tol*a);
        if(st&&t>st.H3.i&&t-st.H2.i>=minF){ const sl0=(st.H3.p-st.H2.p)/Math.max(1,st.H3.i-st.H2.i), lv=st.H3.p+sl0*(t-st.H3.i), pv=lv-sl0;
          if(cs[t-1].c<=pv&&x.c>lv){ let fl=1e18; for(let j=st.H2.i;j<t;j++) if(cs[j].l<fl) fl=cs[j].l;
            const sl=fl-sb*a, risk=x.c-sl;
            if(risk>0&&g.tgt-x.c>=mrr*risk){ ev.push({t,g,kind:'flag',d:1,st,en:x.c,sl,tp:g.tgt,lv,sl0,fl}); sig.set(t,1); g.sigDone=true; g.flT=t; } } } }
      if(x.h>=g.tgt){ if(g.sigDone&&t>g.flT&&fs&&x.c<g.tgt&&x.c<x.o&&a>0){ const sl=x.h+sb*a, risk=sl-x.c; if(risk>0){ ev.push({t,g,kind:'cont',d:-1,en:x.c,sl,tp:x.c-rr*risk}); sig.set(t,-1); } }
        g.fillT=t; g.done=true; } });
    all.forEach(g=>{ if(g.fillT==null&&t>g.c&&x.h>=g.tgt) g.fillT=t; });
  }
  return {ev,sig,all}; }
const gpaCache={};
function gpaRun(c,Z,m){ m=m||c.length; const l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.gpaDir,Z.gpaL,Z.gpaImp,Z.gpaMinGap,Z.gpaAge,Z.gpaFlagMin,Z.gpaTol,Z.gpaSlBuf,Z.gpaRR,Z.gpaMinRR,Z.gpaTgt,Z.gpaFill].join('|');
  const h=gpaCache[Z.sid]; if(h&&h.k===key) return h.r;
  const evs=[], gp=[], sig=new Map(), sl=m>6000?m-6000:0, cc=c.slice(sl,m);
  [1,-1].forEach(s=>{
    const cs=cc.map(x=>s===1?{o:x.open,h:x.high,l:x.low,c:x.close}:{o:-x.open,h:-x.low,l:-x.high,c:-x.close}), r=gpaMachine(cs,Z);
    r.all.forEach(g=>gp.push({s,off:sl,g}));
    r.ev.forEach(e=>{ const fd=s*e.d; if(Z.gpaDir==='Sell only'&&fd===1) return; if(Z.gpaDir==='Buy only'&&fd===-1) return; e.s=s; e.off=sl; evs.push(e); });
    r.sig.forEach((d,i)=>{ const fd=s*d; if(Z.gpaDir==='Sell only'&&fd===1) return; if(Z.gpaDir==='Buy only'&&fd===-1) return; sig.set(i+sl,fd); }); });
  evs.sort((a,b)=>(a.t+a.off)-(b.t+b.off));
  gp.sort((a,b)=>(a.g.c+a.off)-(b.g.c+b.off)); const r={ev:evs,sig,gp}; gpaCache[Z.sid]={k:key,r}; return r; }
function gpaDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<40) return; const m=c.length-1, r=gpaRun(c,Z,m); if(!r) return;
  const fs=GPA_FS[Z.gpaSize]||7.5, ext=Math.max(0,Math.round(Z.gpaExt==null?20:Z.gpaExt)), lbl=Z.gpaLbl!==false,
    cG=Z.gpaGap||'#3b82f6', cT=Z.gpaTgtC||'#2962ff', cS=Z.gpaStC||'#3d5afe', bC=Z.buyCol||'#2dd4a7', sC=Z.sellCol||'#ff5d7a';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  const txt=(t,x,y,col,bold,al)=>{ cx.font=(bold?'bold ':'')+fs+'px system-ui'; cx.textAlign=al||'center'; cx.fillStyle=col; cx.fillText(t,x,y); };
  const seg=(i0,p0,i1,p1,col,dash,w)=>{ const a=X(i0),b=X(i1),y0=Y(p0),y1=Y(p1); if(a==null||b==null||y0==null||y1==null) return; cx.strokeStyle=col; cx.lineWidth=w||1.5; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(a,y0); cx.lineTo(b,y1); cx.stroke(); cx.setLineDash([]); };
  const done=new Set(), show=Math.max(1,Math.round(Z.gpaN)||4);
  // fair value gap blocks: unfilled ones extend to the right until price fills them (green = bullish, red = bearish); filled ones turn grey and stop at the fill
  if(Z.gpaBlk!==false&&r.gp){
    const cU={'1':Z.gpaUpR||'#ff8a80','-1':Z.gpaUpG||'#90ee90'}, cF=Z.gpaFilC||'#b0b0b0', nU=Math.max(1,Math.round(Z.gpaNU==null?10:Z.gpaNU)), nF=Math.max(0,Math.round(Z.gpaNF==null?4:Z.gpaNF));
    const blk=(q,col,end,tag)=>{ const g=q.g, o=q.off, s=q.s, xa=X(g.b+o), xb=end==null?W:X(end+o), y1=Y(s*g.bot), y2=Y(s*g.tgt); if(xa==null||xb==null||y1==null||y2==null||xb<=xa) return;
      const top=Math.min(y1,y2), h=Math.max(3,Math.abs(y2-y1)); cx.fillStyle=rgba(col,0.32); cx.fillRect(xa,top,xb-xa,h); cx.strokeStyle=rgba(col,0.85); cx.lineWidth=1; cx.setLineDash([]); cx.strokeRect(xa,top,xb-xa,h);
      if(lbl) txt(tag,Math.min(xb,W)-4,top+h/2,col,false,'right'); };
    r.gp.filter(q=>q.g.fillT!=null).slice(-nF).forEach(q=>blk(q,cF,q.g.fillT,'Filled'));
    r.gp.filter(q=>q.g.fillT==null).slice(-nU).forEach(q=>blk(q,cU[String(q.s)],null,(q.s===1?'Bearish':'Bullish')+' gap \u00b7 unfilled')); }
  r.ev.filter(e=>e.kind==='flag').slice(-show).forEach(e=>{ done.add(e.g); });
  r.ev.slice(-show*2).forEach(e=>{
    const s=e.s, o=e.off, P=v=>s*v, fd=s*e.d, t=e.t+o, g=e.g, cb=c[t]; if(!cb) return;
    const dn=s===1?1:-1;   // screen direction used for labels below / above real lows / highs
    if(e.kind==='flag'){
      const st=e.st, endI=(g.fillT!=null?g.fillT:e.t+ext)+o;
      // fair value gap box up to the target + dashed gap-fill line
      const xa=X(g.b+o), y1=Y(P(g.bot)), y2=Y(P(g.tgt));
      seg(g.b+o,P(g.tgt),endI,P(g.tgt),cT,[6,4],1.6);
      if(lbl&&xa!=null){ const ym=(y1+y2)/2; txt('Fair Value Gap',xa+4,ym,cT,true,'left'); txt('Strong '+(s===1?'bearish':'bullish')+' move',xa-4,Y(P(g.bot))+(s===1?-1:1)*(fs*2),cS,true,'right'); }
      // structure labels
      if(lbl){ [[st.L2,s===1?'HL':'LH'],[st.H2,s===1?'HH':'LL'],[st.H1,s===1?'H':'L']].slice(0,2).forEach(a=>{ const px=X(a[0].i+o), py=Y(P(a[0].p)); if(px!=null&&py!=null) txt(a[1],px,py+(a[0].h?-1:1)*dn*(fs+5),cS,true); }); }
      // flag: descending channel (upper through the highs, lower parallel through the flag low)
      const i0=st.H2.i+o, i1=t, p0=st.H2.p, p1=e.lv, low=st.L3?st.L3.p:e.fl, off=low-(st.H3.p+e.sl0*(st.L3?st.L3.i-st.H3.i:0));
      seg(i0,p0,i1,p1,cS,[],1.6); seg(i0,p0+(off<0?off:-Math.abs(st.H2.p-low)*0.6),i1,p1+(off<0?off:-Math.abs(st.H2.p-low)*0.6),cS,[],1.2);
      const fx=X(Math.round((i0+i1)/2)), fy=Y(P(Math.max(p0,p1)));
      if(lbl&&fx!=null&&fy!=null) txt('Flag',fx,fy+dn*0+(s===1?-(fs+6):(fs+6)),cS,true);
      // buy / sell arrow at the flag break
      const x=X(t), y=Y(fd===1?cb.low:cb.high), k=fd;
      if(x!=null&&y!=null){ const tip=y+k*10, base=y+k*40; cx.strokeStyle=cx.fillStyle=fd===1?bC:sC; cx.lineWidth=3.5; cx.beginPath(); cx.moveTo(x,base); cx.lineTo(x,tip+k*6); cx.stroke();
        cx.beginPath(); cx.moveTo(x,tip); cx.lineTo(x-7,tip+k*12); cx.lineTo(x+7,tip+k*12); cx.closePath(); cx.fill();
        if(lbl) txt((fd===1?'BUY':'SELL')+' flag break \u2192 gap fill',x,base+k*(fs+5),fd===1?bC:sC,true); }
      // gap filled marker
      if(g.fillT!=null){ const gx=X(g.fillT+o), gy=Y(P(g.tgt)); if(gx!=null&&gy!=null){ cx.strokeStyle=cT; cx.lineWidth=2; cx.beginPath(); cx.arc(gx,gy,6,0,6.2832); cx.stroke(); if(lbl) txt('Gap filled',gx,gy+(s===1?-(fs+10):(fs+10)),cT,true); } }
    } else {
      const x=X(t), y=Y(fd===1?cb.low:cb.high), k=fd;
      if(x!=null&&y!=null){ const tip=y+k*10, base=y+k*40; cx.strokeStyle=cx.fillStyle=fd===1?bC:sC; cx.lineWidth=3.5; cx.beginPath(); cx.moveTo(x,base); cx.lineTo(x,tip+k*6); cx.stroke();
        cx.beginPath(); cx.moveTo(x,tip); cx.lineTo(x-7,tip+k*12); cx.lineTo(x+7,tip+k*12); cx.closePath(); cx.fill();
        if(lbl) txt((fd===1?'BUY':'SELL')+' after gap filled \u2192 '+(fd===1?'bullish':'bearish')+' move',x,base+k*(fs+5),fd===1?bC:sC,true); } } });
  cx.globalAlpha=1; cx.restore(); }
STRATS.gpa={label:'Gap Analysis \u00b7 strong move leaves a Fair Value Gap, HL / HH structure, flag break = BUY / SELL toward the gap fill',short:'Gap Analysis',own:true,
  defs:{limit:false,useSl:false,gpaDir:'Both',gpaL:5,gpaImp:2,gpaMinGap:0.1,gpaAge:300,gpaFlagMin:4,gpaTol:0.3,gpaTgt:'Move origin',gpaSlBuf:0.2,gpaFill:true,gpaRR:2,gpaMinRR:1,
    gpaBlk:true,gpaUpG:'#90ee90',gpaUpR:'#ff8a80',gpaFilC:'#b0b0b0',gpaNU:10,gpaNF:4,gpaTgtC:'#2962ff',gpaStC:'#3d5afe',gpaLbl:true,gpaN:4,gpaExt:20,gpaSize:'Small',gpaSig:true},
  inputs:(b,d)=>{
    fld(b,d,'gpaDir','sel','Trade direction (Buy = after a bearish gap, Sell = after a bullish gap)',{opts:['Both','Buy only','Sell only']});
    fld(b,d,'gpaImp','num','Strong move: min candle size (x ATR)',{min:1,max:6,step:0.1}); fld(b,d,'gpaMinGap','num','Fair value gap: min size (x ATR)',{min:0,max:2,step:0.05});
    fld(b,d,'gpaTgt','sel','Gap target',{opts:['Move origin','FVG edge']}); fld(b,d,'gpaL','num','Swing length for HL / HH (bars each side)',{min:2,max:20,step:1});
    fld(b,d,'gpaFlagMin','num','Min bars in the flag',{min:1,max:30,step:1}); fld(b,d,'gpaTol','num','HL tolerance (x ATR)',{min:0,max:2,step:0.05});
    fld(b,d,'gpaAge','num','Max bars a gap stays active',{min:30,max:2000,step:10}); fld(b,d,'gpaMinRR','num','Min reward : risk to the gap fill',{min:0,max:10,step:0.5});
    fld(b,d,'gpaSlBuf','num','Stop buffer beyond the flag (x ATR)',{min:0,max:3,step:0.05});
    fld(b,d,'gpaFill','chk','Opposite signal when the gap fills and price rejects (move continues)'); fld(b,d,'gpaRR','num','R multiple for that signal',{min:0.5,max:10,step:0.5});
    fld(b,d,'gpaBlk','chk','Show gap blocks (extend until filled)'); fld(b,d,'gpaUpG','col','Unfilled bullish gap colour'); fld(b,d,'gpaUpR','col','Unfilled bearish gap colour'); fld(b,d,'gpaFilC','col','Filled gap colour'); fld(b,d,'gpaNU','num','Unfilled gaps shown',{min:1,max:50,step:1}); fld(b,d,'gpaNF','num','Filled gaps shown (grey)',{min:0,max:50,step:1}); fld(b,d,'gpaTgtC','col','Gap fill line colour'); fld(b,d,'gpaStC','col','Structure / flag colour');
    fld(b,d,'gpaLbl','chk','Show labels'); fld(b,d,'gpaN','num','Setups shown on chart',{min:1,max:30,step:1}); fld(b,d,'gpaExt','num','Extend gap line to the right (bars)',{min:0,max:200,step:5}); fld(b,d,'gpaSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'gpaSig','chk','BUY / SELL signals'); },
  sig:(c,i,n,Z)=>{ if(Z.gpaSig===false||c.length<40) return 0; const r=gpaRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.gpa='Strategy \u00b7 strong move + fair value gap, HL / HH, flag break BUY / SELL toward the gap fill'; }catch(e){}
{ const _gpD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='gpaview') return gpaDraw(d,X,Y,W,H); return _gpD.apply(this,arguments); };
  const _gpR=recomputeExtras; recomputeExtras=function(){ _gpR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='gpa'&&stVis(Z)) scriptBoxes.push({type:'gpaview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('gpa strategy failed',err); window.__gpaErr=err; }


// =====================================================================================
// [dbt] STRATEGY · "Price Action Setup" (High Probability Long Setup: downtrend LH/LL -> double bottom -> trendline breakout -> retest entry)   (self-contained: every name starts with dbt / DBT)
// Downtrend with Lower Highs (trendline through them), a Failed new Lower High, a Double Bottom (liquidity sweep) at the swing low,
// breakout above the trendline, then a RETEST of the broken trendline and a strong bullish candle on the retest = BUY (mirror = SELL).
// Stop below the swing low, target = R multiple (default 1.4 RR) drawn as green reward / red risk boxes. Signals only on bars after the
// bottom is confirmed (no repainting). Hooks: STRATS.dbt + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const DBT_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
function dbtAtr(cs){ const o=new Array(cs.length).fill(0); let p=null; for(let i=0;i<cs.length;i++){ const x=cs[i], tr=i?Math.max(x.h-x.l,Math.abs(x.h-cs[i-1].c),Math.abs(x.l-cs[i-1].c)):x.h-x.l; p=p==null?tr:(p*13+tr)/14; o[i]=p; } return o; }
function dbtPush(seq,pv){ const l=seq[seq.length-1]; if(l&&l.h===pv.h){ if(pv.h?pv.p>l.p:pv.p<l.p) seq[seq.length-1]=pv; } else seq.push(pv); }
// cs mirrored so the machine always looks for the BULLISH setup (downtrend -> double bottom -> breakout -> retest)
function dbtMachine(cs,Z){
  const n=cs.length, L=Math.max(2,Math.round(Z.dbtL)||4), atr=dbtAtr(cs), minLH=Math.max(2,Math.round(Z.dbtMinLH)||3), dbT=Z.dbtDbTol==null?0.8:+Z.dbtDbTol,
    rtT=Z.dbtRtTol==null?0.3:+Z.dbtRtTol, body=Z.dbtBody==null?0.5:+Z.dbtBody, conf=Math.max(0,Math.round(Z.dbtConf==null?1:Z.dbtConf)),
    wBO=Math.max(5,Math.round(Z.dbtWaitBO)||60), wRT=Math.max(3,Math.round(Z.dbtWaitRT)||40), age=Math.max(20,Math.round(Z.dbtAge)||150),
    sb=Z.dbtSlBuf==null?0.2:+Z.dbtSlBuf, rr=Z.dbtRR==null?1.4:+Z.dbtRR, maxR=Z.dbtMaxR==null?0:+Z.dbtMaxR, seq=[], cands=[], ev=[], sig=new Map();
  for(let t=0;t<n;t++){
    const x=cs[t], a=atr[t]||0, k=t-L;
    if(k>=L){ let ih=true,il=true;
      for(let j=k-L;j<=k+L;j++){ if(j===k) continue; if(j<k?cs[j].h>=cs[k].h:cs[j].h>cs[k].h) ih=false; if(j<k?cs[j].l<=cs[k].l:cs[j].l<cs[k].l) il=false; }
      if(il) dbtPush(seq,{h:false,i:k,p:cs[k].l}); if(ih) dbtPush(seq,{h:true,i:k,p:cs[k].h});
      const q=seq.length;
      // a new bottom B2 closes a candidate: B1 (low) , Hn (failed lower high) , B2 (low), highs before Hn must be falling (lower highs)
      if(il&&q>=5&&!seq[q-1].h&&seq[q-1].i===k){ const B2=seq[q-1], Hn=seq[q-2], B1=seq[q-3], ak=atr[k]||a;
        if(Hn.h&&!B1.h&&ak>0&&Math.abs(B2.p-B1.p)<=dbT*ak&&Hn.p-Math.max(B1.p,B2.p)>=ak&&!cands.some(c=>c.B2.i===B2.i)){
          const hs=[]; for(let j=q-2;j>=0;j-=2){ if(!seq[j].h) break; if(hs.length&&!(seq[j].p>hs[hs.length-1].p)) break; hs.push(seq[j]); }   // newest first, each older one higher
          for(let len=Math.min(hs.length,7);len>=minLH;len--){ const c0=hs[len-1], sl0=(Hn.p-c0.p)/Math.max(1,Hn.i-c0.i); if(!(sl0<0)) continue;
            let ok=true; for(let j=c0.i;j<=B2.i;j++){ if(cs[j].c>c0.p+sl0*(j-c0.i)+0.1*ak){ ok=false; break; } }
            if(ok){ const ch=hs.slice(0,len).reverse(), cd={B1,B2,Hn,c0,ch,sl:sl0,a:ak,made:t,bo:-1,touch:-1,done:false};
              for(let j=B2.i+1;j<=t;j++){ if(cs[j].c>c0.p+sl0*(j-c0.i)){ cd.bo=j; break; } }   // state only: no signal before the bottom is confirmed
              cands.push(cd); if(cands.length>10) cands.shift(); break; } } } } }
    cands.forEach(cd=>{ if(cd.done||t<=cd.made) return;
      if(t-cd.B2.i>age){ cd.done=true; return; }
      const ln=cd.c0.p+cd.sl*(t-cd.c0.i), lo=Math.min(cd.B1.p,cd.B2.p);
      if(x.c<lo-dbT*cd.a){ cd.done=true; return; }
      if(cd.bo<0){ if(x.c>ln) cd.bo=t; else if(t-cd.B2.i>wBO) cd.done=true; return; }
      if(x.c<ln-cd.a||t-cd.bo>wRT){ cd.done=true; return; }
      if(t>cd.bo&&x.l<=ln+rtT*cd.a) cd.touch=t;
      if(cd.touch>=0&&t-cd.touch<=conf&&x.c>x.o&&(x.c-x.o)>=body*cd.a&&(x.c-x.o)>=0.5*(x.h-x.l)&&x.c>ln){
        const sl=lo-sb*cd.a, risk=x.c-sl;
        if(risk>0&&(maxR<=0||risk<=maxR*cd.a)){ ev.push({t,d:1,cd,bo:cd.bo,en:x.c,sl,tp:x.c+rr*risk}); sig.set(t,1); cd.done=true; } } });
  }
  return {ev,sig}; }
const dbtCache={};
function dbtRun(c,Z,m){ m=m||c.length; const l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.dbtDir,Z.dbtL,Z.dbtMinLH,Z.dbtDbTol,Z.dbtRtTol,Z.dbtBody,Z.dbtConf,Z.dbtWaitBO,Z.dbtWaitRT,Z.dbtAge,Z.dbtSlBuf,Z.dbtRR,Z.dbtMaxR].join('|');
  const h=dbtCache[Z.sid]; if(h&&h.k===key) return h.r;
  const evs=[], sig=new Map(), sl=m>6000?m-6000:0, cc=c.slice(sl,m);
  [1,-1].forEach(s=>{ if(Z.dbtDir==='Sell only'&&s===1) return; if(Z.dbtDir==='Buy only'&&s===-1) return;
    const cs=cc.map(x=>s===1?{o:x.open,h:x.high,l:x.low,c:x.close}:{o:-x.open,h:-x.low,l:-x.high,c:-x.close}), r=dbtMachine(cs,Z);
    r.ev.forEach(e=>{ e.s=s; e.off=sl; evs.push(e); }); r.sig.forEach((d,i)=>{ sig.set(i+sl,s); }); });
  evs.sort((a,b)=>(a.t+a.off)-(b.t+b.off));
  const r={ev:evs,sig}; dbtCache[Z.sid]={k:key,r}; return r; }
function dbtDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<50) return; const m=c.length-1, r=dbtRun(c,Z,m); if(!r) return;
  const fs=DBT_FS[Z.dbtSize]||7.5, ext=Math.max(1,Math.round(Z.dbtExt==null?25:Z.dbtExt)), lbl=Z.dbtLbl!==false, cLn=Z.dbtLn||'#e0e0e0', cTx=Z.dbtTx||'#e0e0e0',
    bC=Z.buyCol||'#2dd4a7', sC=Z.sellCol||'#ff5d7a', cRw=Z.dbtRw||'#7bd88f', cRk=Z.dbtRk||'#ff8a80', show=Math.max(1,Math.round(Z.dbtN)||3);
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  const txt=(t,x,y,col,bold,al)=>{ cx.font=(bold?'bold ':'')+fs+'px system-ui'; cx.textAlign=al||'center'; cx.fillStyle=col; cx.fillText(t,x,y); };
  r.ev.slice(-show).forEach(e=>{
    const s=e.s, o=e.off, P=v=>s*v, cd=e.cd, t=e.t+o, cb=c[t]; if(!cb) return; const up=s===1, ah=up?-1:1;   // ah: screen direction for labels at the "high" pivots (above real highs for buys)
    const ln=i=>cd.c0.p+cd.sl*(i-cd.c0.i);
    // trendline through the lower highs, extended to the entry bar
    { const x0=X(cd.c0.i+o), x1=X(e.t+3+o), y0=Y(P(ln(cd.c0.i))), y1=Y(P(ln(e.t+3))); if(x0!=null&&x1!=null&&y0!=null&&y1!=null){ cx.strokeStyle=cLn; cx.lineWidth=1.6; cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y1); cx.stroke(); } }
    // grey neckline band at the failed lower high
    { const xa=X(cd.B1.i+o), xb=X(cd.bo+o), y1=Y(P(cd.Hn.p+0.12*cd.a)), y2=Y(P(cd.Hn.p-0.12*cd.a)); if(xa!=null&&xb!=null&&y1!=null&&y2!=null){ cx.fillStyle='rgba(176,176,176,0.35)'; cx.fillRect(xa,Math.min(y1,y2),xb-xa,Math.max(3,Math.abs(y2-y1))); } }
    if(lbl){ cd.ch.forEach(p=>{ const px=X(p.i+o), py=Y(P(p.p)); if(px==null||py==null) return; const last=p===cd.Hn;
        txt(last?'Failed new '+(up?'LH':'HL'):(up?'LH':'HL'),px,py+ah*(fs+(last?5:3)),cTx,true); }); }
    // double bottom (liquidity sweep): circles on both lows
    [cd.B1,cd.B2].forEach(p=>{ const px=X(p.i+o), py=Y(P(p.p)); if(px==null||py==null) return; cx.strokeStyle=cLn; cx.lineWidth=1.6; cx.beginPath(); cx.ellipse(px,py,9,7,0,0,6.2832); cx.stroke(); });
    { const px=X(Math.round((cd.B1.i+cd.B2.i)/2+o)), py=Y(P(Math.min(cd.B1.p,cd.B2.p))); if(lbl&&px!=null&&py!=null) txt(up?'Double Bottom':'Double Top',px,py-ah*(fs+14),cTx,true); }
    // breakout label
    { const bb=c[cd.bo+o]; if(lbl&&bb){ const bx=X(cd.bo+o), by=Y(up?bb.high:bb.low); if(bx!=null&&by!=null) txt('BREAKOUT',bx,by+ah*(fs+8),cTx,true); } }
    // risk / reward boxes (image style: light green reward, light red risk) + entry arrow
    { const xa=X(t), xb=X(t+ext), yt=Y(P(e.tp)), ys=Y(P(e.sl)), ye2=Y(P(e.en)); if(xa!=null&&xb!=null&&yt!=null&&ys!=null&&ye2!=null){
        cx.fillStyle=rgba(cRw,0.28); cx.fillRect(xa,Math.min(ye2,yt),xb-xa,Math.max(2,Math.abs(yt-ye2))); cx.fillStyle=rgba(cRk,0.38); cx.fillRect(xa,Math.min(ye2,ys),xb-xa,Math.max(2,Math.abs(ys-ye2)));
        if(lbl) txt((Z.dbtRR==null?1.4:Z.dbtRR)+'RR',(xa+xb)/2,Math.min(ye2,yt)-fs-2,cTx,true); } }
    { const x=X(t), y=Y(up?cb.low:cb.high), k=s; if(x!=null&&y!=null){ const tip=y+k*10, base=y+k*40; cx.strokeStyle=cx.fillStyle=up?bC:sC; cx.lineWidth=3.5; cx.beginPath(); cx.moveTo(x,base); cx.lineTo(x,tip+k*6); cx.stroke();
        cx.beginPath(); cx.moveTo(x,tip); cx.lineTo(x-7,tip+k*12); cx.lineTo(x+7,tip+k*12); cx.closePath(); cx.fill();
        if(lbl) txt('RETEST ENTRY \u00b7 '+(up?'BUY':'SELL'),x,base+k*(fs+5),up?bC:sC,true); } } });
  cx.globalAlpha=1; cx.restore(); }
STRATS.dbt={label:'Price Action Setup \u00b7 downtrend lower highs, double bottom, trendline breakout, retest entry with strong candle (mirror = SELL), stop below the swing low, RR target',short:'Price Action Setup',own:true,
  defs:{limit:false,useSl:false,dbtDir:'Both',dbtL:4,dbtMinLH:3,dbtDbTol:0.8,dbtRtTol:0.3,dbtBody:0.5,dbtConf:1,dbtWaitBO:60,dbtWaitRT:40,dbtAge:150,dbtSlBuf:0.2,dbtRR:1.4,dbtMaxR:0,
    dbtLn:'#e0e0e0',dbtTx:'#e0e0e0',dbtRw:'#7bd88f',dbtRk:'#ff8a80',dbtLbl:true,dbtN:3,dbtExt:25,dbtSize:'Small',dbtSig:true},
  inputs:(b,d)=>{
    fld(b,d,'dbtDir','sel','Trade direction (Buy = double bottom after a downtrend, Sell = double top after an uptrend)',{opts:['Both','Buy only','Sell only']});
    fld(b,d,'dbtL','num','Swing length (bars each side)',{min:2,max:20,step:1}); fld(b,d,'dbtMinLH','num','Min lower highs on the trendline (incl. the failed new LH)',{min:2,max:6,step:1});
    fld(b,d,'dbtDbTol','num','Double bottom: max difference between the two lows (x ATR)',{min:0.1,max:3,step:0.1});
    fld(b,d,'dbtRtTol','num','Retest: distance to the trendline (x ATR)',{min:0,max:2,step:0.05}); fld(b,d,'dbtBody','num','Strong candle: min body (x ATR)',{min:0.1,max:3,step:0.1});
    fld(b,d,'dbtConf','num','Bars allowed between the retest touch and the strong candle',{min:0,max:5,step:1});
    fld(b,d,'dbtWaitBO','num','Max bars to wait for the breakout',{min:5,max:300,step:5}); fld(b,d,'dbtWaitRT','num','Max bars to wait for the retest after the breakout',{min:3,max:200,step:1});
    fld(b,d,'dbtAge','num','Max bars a setup stays active',{min:20,max:1000,step:10});
    fld(b,d,'dbtSlBuf','num','Stop buffer below the swing low (x ATR)',{min:0,max:3,step:0.05}); fld(b,d,'dbtRR','num','Reward : risk target',{min:0.5,max:10,step:0.1});
    fld(b,d,'dbtMaxR','num','Skip if stop is bigger than (x ATR, 0 = off)',{min:0,max:50,step:1});
    fld(b,d,'dbtLn','col','Trendline / circles colour'); fld(b,d,'dbtTx','col','Label colour'); fld(b,d,'dbtRw','col','Reward box colour'); fld(b,d,'dbtRk','col','Risk box colour');
    fld(b,d,'dbtLbl','chk','Show labels'); fld(b,d,'dbtN','num','Setups shown on chart',{min:1,max:30,step:1}); fld(b,d,'dbtExt','num','Risk / reward box length (bars)',{min:5,max:200,step:5}); fld(b,d,'dbtSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'dbtSig','chk','BUY / SELL signals'); },
  sig:(c,i,n,Z)=>{ if(Z.dbtSig===false||c.length<50) return 0; const r=dbtRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.dbt='Price Action \u00b7 downtrend LH/LL, double bottom, trendline breakout, retest entry: BUY (or mirror SELL) with risk / reward box'; }catch(e){}
{ const _dbD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='dbtview') return dbtDraw(d,X,Y,W,H); return _dbD.apply(this,arguments); };
  const _dbR=recomputeExtras; recomputeExtras=function(){ _dbR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='dbt'&&stVis(Z)) scriptBoxes.push({type:'dbtview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('dbt strategy failed',err); window.__dbtErr=err; }
// =====================================================================================
// [msa] STRATEGY (Price Action) · "Market Structure Analysis" (Premium / Discount, BOS, CHoCH, IDM, liquidity sweep, FVG, SSL, trade setup)   (self-contained: every name starts with msa / MSA)
// Finds the dominant swing high (or swing low = mirror), the CHoCH that confirmed the trend change, the BOS breaks that followed, the liquidity sweep before the high,
// the Premium / Discount zones split at the 50% level, unfilled Fair Value Gaps, the sell-side (buy-side) liquidity pool and a Potential Trade Setup (entry zone, stop, 2 targets)
// plus a Key Levels / Outlook panel. Bearish is analysed on real candles, Bullish on mirrored candles (same code). Hooks: STRATS.msa + draw + recomputeExtras + PAID. Nothing existing is edited.
// =====================================================================================
try{
const MSA_FS={Tiny:8,Small:10,Normal:12,Large:14};
function msaAtr(cs){ const o=new Array(cs.length).fill(0); let p=null; for(let i=0;i<cs.length;i++){ const x=cs[i], tr=i?Math.max(x.h-x.l,Math.abs(x.h-cs[i-1].c),Math.abs(x.l-cs[i-1].c)):x.h-x.l; p=p==null?tr:(p*13+tr)/14; o[i]=p; } return o; }
function msaPush(seq,pv){ const l=seq[seq.length-1]; if(l&&l.h===pv.h){ if(pv.h?pv.p>l.p:pv.p<l.p) seq[seq.length-1]=pv; } else seq.push(pv); }
// cs is always analysed as a BEARISH structure (high -> CHoCH -> lower lows); bullish setups arrive mirrored
function msaMachine(cs,Z){
  const n=cs.length, L=Math.max(2,Math.round(Z.msaL)||5), atr=msaAtr(cs), a=atr[n-1]||0; if(n<L*4+10||!(a>0)) return null;
  const seq=[]; for(let k=L;k<n-L;k++){ let ih=true,il=true;
    for(let j=k-L;j<=k+L;j++){ if(j===k) continue; if(j<k?cs[j].h>=cs[k].h:cs[j].h>cs[k].h) ih=false; if(j<k?cs[j].l<=cs[k].l:cs[j].l<cs[k].l) il=false; }
    if(il) msaPush(seq,{h:false,i:k,p:cs[k].l}); if(ih) msaPush(seq,{h:true,i:k,p:cs[k].h}); }
  const hs=seq.map((s,q)=>({s,q})).filter(o=>o.s.h&&o.q>=1&&o.q<seq.length-1).sort((x,y)=>y.s.p-x.s.p); let best=null;
  for(const o of hs){ const H=o.s, pl=seq[o.q-1]; if(pl.h) continue; let ch=-1;
    for(let t=H.i+1;t<n;t++){ if(cs[t].c<pl.p){ ch=t; break; } if(cs[t].h>H.p) break; }
    if(ch<0) continue; let lo=H.i+1; for(let t=H.i+1;t<n;t++) if(cs[t].l<cs[lo].l) lo=t;
    const Lo={i:lo,p:cs[lo].l}; if(H.p-Lo.p<2*a) continue; best={H,pl,ch,Lo,q:o.q}; break; }
  if(!best) return null;
  const {H,pl,ch,Lo,q}=best, mid=(H.p+Lo.p)/2, sb=Z.msaSlBuf==null?0.5:+Z.msaSlBuf, rr=Z.msaRR==null?2:+Z.msaRR;
  // liquidity sweep: the swing high that was taken out by the high before price reversed
  let sw=null; for(let j=q-1;j>=0;j--){ const P=seq[j]; if(P.h&&P.i<H.i&&P.p<H.p&&H.i-P.i<=200){ let rej=false; for(let t=H.i;t<=Math.min(n-1,H.i+4);t++) if(cs[t].c<P.p) rej=true; if(rej) sw=P; break; } }
  // BOS: swing lows after the high that were later broken by a close, IDM: first pullback high after the CHoCH
  const bos=[], sw2=[]; let idm=null, prevH=H.p, prevL=pl.p;
  for(let j=q+1;j<seq.length;j++){ const P=seq[j];
    if(P.h){ const isI=!idm&&P.i>ch; if(isI) idm=P; sw2.push({h:true,i:P.i,p:P.p,t:isI?'IDM':(P.p<prevH?'LH':'HH')}); prevH=P.p; }
    else { sw2.push({h:false,i:P.i,p:P.p,t:P.p<prevL?'LL':'HL'}); prevL=P.p; let b=-1; for(let t=P.i+1;t<n;t++){ if(cs[t].c<P.p){ b=t; break; } } if(b>=0&&P.p<pl.p) bos.push({lv:P.p,from:P.i,to:b}); } }
  // unfilled bearish FVG after the high: low of bar t-1 is above the high of bar t+1
  const fvg=[]; for(let t=H.i+1;t<n-1;t++){ const top=cs[t-1].l, bot=cs[t+1].h; if(top-bot>=0.15*a){ let fill=false; for(let u=t+2;u<n;u++) if(cs[u].h>=top){ fill=true; break; } if(!fill) fvg.push({i:t-1,t:t+1,top,bot}); } }
  const showF=Math.max(0,Math.round(Z.msaFvg==null?3:Z.msaFvg)), fv=fvg.slice(-showF);
  // potential trade setup: entry zone = latest FVG inside the lower half, else the 50 - 61.8% retracement of the last leg down
  let ez=null, zi=Lo.i; const lf=fvg.filter(f=>f.top<=H.p&&f.i>=ch-2&&f.i<Lo.i+n).slice(-1)[0];
  if(lf&&lf.t>=Lo.i-L*3){ ez={top:lf.top,bot:lf.bot}; zi=Math.max(Lo.i,lf.t); } else { let top=H.p; for(let j=seq.length-1;j>=0;j--){ if(seq[j].h&&seq[j].i>Lo.i){ top=seq[j].p; break; } } if(top-Lo.p<a) top=mid;
    ez={top:Lo.p+0.618*(top-Lo.p),bot:Lo.p+0.5*(top-Lo.p)}; }
  const em=(ez.top+ez.bot)/2, sl=ez.top+sb*a, risk=sl-em; let tp1=em-rr*risk; if(tp1<=Lo.p) tp1=(em+Lo.p)/2; const tp2=Lo.p;
  // signal: first bar after the SSL and the zone exist that rallies into the zone and closes bearish below it (before the stop is reached)
  let sigBar=-1; for(let t=Math.max(zi,Lo.i)+1;t<n;t++){ const x=cs[t]; if(x.c>sl) break; if(x.h>=ez.bot&&x.c<x.o&&x.c<ez.top){ sigBar=t; break; } }
  return {H,pl,ch,Lo,mid,sw,bos:bos.slice(-Math.max(0,Math.round(Z.msaBos==null?2:Z.msaBos))),idm,sw2,fv,ez,sl,tp1,tp2,sigBar,a,n}; }
const msaCache={};
function msaRun(c,Z){ const m=c.length, l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.msaDir,Z.msaN,Z.msaL,Z.msaBos,Z.msaFvg,Z.msaSlBuf,Z.msaRR].join('|');
  const h=msaCache[Z.sid]; if(h&&h.k===key) return h.r;
  const sl=Math.max(0,m-Math.max(60,Math.round(Z.msaN)||300)), cc=c.slice(sl); let best=null;
  [1,-1].forEach(s=>{ if(Z.msaDir==='Bearish only'&&s===-1) return; if(Z.msaDir==='Bullish only'&&s===1) return;
    const cs=cc.map(x=>s===1?{o:x.open,h:x.high,l:x.low,c:x.close}:{o:-x.open,h:-x.low,l:-x.high,c:-x.close}), a=msaMachine(cs,Z);
    if(a&&(!best||a.ch>best.a.ch)) best={a,s,sl}; });
  msaCache[Z.sid]={k:key,r:best}; return best; }
function msaDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<60) return; const r=msaRun(c,Z); if(!r) return;
  const A=r.a, s=r.s, o=r.sl, P=v=>s*v, bear=s===1, fs=MSA_FS[Z.msaSize]||12, ext=Math.max(2,Math.round(Z.msaExt==null?20:Z.msaExt)), lbl=Z.msaLbl!==false, m=c.length-1;
  const cTx=Z.msaTx||'#e8eaed', cLn=Z.msaLn||'#f5c542', cPr=Z.msaPrem||'#9aa8e8', cDi=Z.msaDisc||'#7bd88f', cFv=Z.msaFvgCol||'#7bd88f', cEn=Z.msaEnt||'#ff9800', cSl=Z.msaSlCol||'#ff5d7a', cTp=Z.msaTpCol||'#2dd4a7';
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  const rl=v=>s*v, xr=X(m+ext), xl=i=>X(i+o);
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  const txt=(t,x,y,col,bold,al,sz)=>{ cx.font=(bold?'bold ':'')+(sz||fs)+'px system-ui'; cx.textAlign=al||'center'; cx.fillStyle=col; cx.fillText(t,x,y); };
  const line=(x1,y1,x2,y2,col,w,dash)=>{ cx.strokeStyle=col; cx.lineWidth=w||1.4; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke(); cx.setLineDash([]); };
  const ok=(...v)=>v.every(q=>q!=null&&isFinite(q));
  const xa=xl(A.H.i-2), yH=Y(P(A.H.p)), yM=Y(P(A.mid)), yL=Y(P(A.Lo.p));
  if(ok(xa,xr,yH,yM,yL)){
    const topN=bear?'PREMIUM ZONE':'DISCOUNT ZONE', botN=bear?'DISCOUNT ZONE':'PREMIUM ZONE', topC=bear?cPr:cDi, botC=bear?cDi:cPr, x0=Math.max(xa,6), x1=Math.min(xr,W-6), xm=(x0+x1)/2;
    // premium (top) and discount (bottom) zones in mirrored space: top = near the swing high, bottom = near the swing low
    cx.fillStyle=rgba(topC,.28); cx.fillRect(xa,Math.min(yH,yM),xr-xa,Math.abs(yM-yH)); cx.fillStyle=rgba(botC,.22); cx.fillRect(xa,Math.min(yM,yL),xr-xa,Math.abs(yL-yM));
    cx.strokeStyle=cLn; cx.lineWidth=1; cx.setLineDash([5,4]); cx.strokeRect(xa,Math.min(yH,yM),xr-xa,Math.abs(yM-yH)); cx.setLineDash([]);
    if(lbl&&x1>x0){ txt(bear?'PREMIUM ZONE':'DISCOUNT ZONE',xm,(yH+yM)/2,cTx,true); txt(botN,xm,(yM+yL)/2,cTx,true); }
    // 50% level
    line(xa,yM,xr,yM,cTx,1.2); if(lbl&&x1>x0) txt('50% LEVEL',x1-4,yM-fs*.9,cTx,true,'right');
    // swing high / low label
    const hx=xl(A.H.i); if(lbl&&ok(hx)) txt((bear?'▲ High ':'▼ Low ')+fmt(rl(A.H.p)),hx,yH+(bear?-fs-4:fs+4),cTx,true);
    // SSL / BSL
    line(xa,yL,xr,yL,cLn,1.6); if(lbl){ txt((bear?'Low ':'High ')+fmt(rl(A.Lo.p)),Math.max(xl(A.Lo.i),6),yL+(bear?fs+4:-fs-4),cTx,true,'left'); if(x1>x0) txt(bear?'SSL':'BSL',x1-4,yL+(bear?fs+4:-fs-4),cSl,true,'right'); } }
  // CHoCH
  { const x1=xl(A.pl.i), x2=xl(A.ch), y=Y(P(A.pl.p)); if(ok(x1,x2,y)){ line(x1,y,x2,y,cLn,1.3,[6,4]); if(lbl) txt('CHOCH',x1,y+s*(fs+5),cTx,true,'left'); } }
  // BOS lines
  A.bos.forEach(b=>{ const x1=xl(b.from), x2=xl(b.to), y=Y(P(b.lv)); if(ok(x1,x2,y)){ line(x1,y,x2,y,cLn,1.3); if(lbl) txt('BOS',(x1+x2)/2,y+s*(fs+4),cTx,true); } });
  // liquidity sweep
  if(A.sw){ const x1=xl(A.sw.i), x2=xl(A.H.i+Math.round(Z.msaL||5)), y=Y(P(A.sw.p)); if(ok(x1,x2,y)){ line(x1,y,x2,y,cLn,1.3,[6,4]); if(lbl){ txt('$$$',x2+fs*1.4,y-s*(fs+2),cTx,true); txt('Liquidity Taken Out',x1,y-s*(fs*2+6),cTx,false,'left'); txt('( Market Sweep )',x1,y-s*(fs*3+6),cTx,false,'left'); } } }
  // structure labels
  if(lbl) A.sw2.forEach(p=>{ const x=xl(p.i), y=Y(P(p.p)); if(!ok(x,y)) return; const dy=(p.h?-1:1)*s, col=p.t==='IDM'?cLn:(p.t==='LL'||p.t==='HH'?cSl:cTx); txt(p.t,x,y+dy*(fs+3),col,true); });
  // fair value gaps
  A.fv.forEach(f=>{ const xa2=xl(f.i), xb2=X(Math.min(m+ext,f.t+Math.round(ext*.8))+0), y1=Y(P(f.top)), y2=Y(P(f.bot)); if(ok(xa2,xb2,y1,y2)){ cx.fillStyle=rgba(cFv,.32); cx.fillRect(xa2,Math.min(y1,y2),xb2-xa2,Math.max(3,Math.abs(y2-y1))); if(lbl) txt('FVG',(xa2+xb2)/2,(y1+y2)/2,cTx,true); } });
  // potential trade setup: entry zone, stop, targets
  { const xs=X(m-6), xe=xr, yt=Y(P(A.ez.top)), yb=Y(P(A.ez.bot)), ys=Y(P(A.sl)), y1=Y(P(A.tp1)), y2=Y(P(A.tp2)); if(ok(xs,xe,yt,yb,ys,y1,y2)){
      cx.fillStyle=rgba(cEn,.28); cx.fillRect(xs,Math.min(yt,yb),xe-xs,Math.max(3,Math.abs(yb-yt))); line(xs,ys,xe,ys,cSl,1.4,[6,4]); line(xs,y1,xe,y1,cTp,1.4,[6,4]);
      if(lbl&&xe>6){ const xr2=Math.min(xe,W-6); txt('ENTRY '+fmt(rl(A.ez.bot))+' - '+fmt(rl(A.ez.top)),xr2,(yt+yb)/2,cTx,true,'right'); txt('SL '+fmt(rl(A.sl)),xr2,ys+(bear?-fs*.8:fs*.8),cSl,true,'right'); txt('TP1 '+fmt(rl(A.tp1)),xr2,y1+(bear?fs*.8:-fs*.8),cTp,true,'right'); } } }
  // BUY / SELL arrow on the signal bar
  if(Z.msaSig&&A.sigBar>=0){ const cb=c[A.sigBar+o], x=xl(A.sigBar), y=cb&&Y(bear?cb.high:cb.low); if(cb&&ok(x,y)){ const k=bear?-1:1, tip=y+(bear?-10:10), base=y+(bear?-40:40), col=bear?'#ff5d7a':'#2dd4a7'; line(x,base,x,tip-k*6,col,3.5); cx.fillStyle=col; cx.beginPath(); cx.moveTo(x,tip); cx.lineTo(x-7,tip-k*12); cx.lineTo(x+7,tip-k*12); cx.closePath(); cx.fill(); if(lbl) txt(bear?'SELL':'BUY',x,base+(bear?-1:1)*(fs+5),col,true); } }
  // key levels / outlook / trade setup panel
  if(Z.msaPanel!==false){ const pf=Math.max(9,fs-1), rows=[
      [bear?'Premium Zone High':'Discount Zone Low',fmt(rl(A.H.p))],['50% Level',fmt(rl(A.mid))],[bear?'Discount Zone':'Premium Zone',fmt(rl(A.mid))+' - '+fmt(rl(A.Lo.p))],[bear?'SSL (Sell Side Liquidity)':'BSL (Buy Side Liquidity)',fmt(rl(A.Lo.p))],
      null,['Entry Zone',fmt(rl(A.ez.bot))+' - '+fmt(rl(A.ez.top))],['Stop Loss',fmt(rl(A.sl))],['Take Profit 1',fmt(rl(A.tp1))],['Take Profit 2',fmt(rl(A.tp2))]];
    cx.font='bold '+pf+'px system-ui'; let wMax=0; rows.forEach(rw=>{ if(rw) wMax=Math.max(wMax,cx.measureText(rw[0]+'   '+rw[1]).width); }); const hd=(bear?'BEARISH BIAS':'BULLISH BIAS'), pw=Math.max(wMax,cx.measureText(hd).width)+22, ph=(rows.length+2)*(pf+6)+10, pos=Z.msaPos||'Top right',
      px=/left/i.test(pos)?8:W-pw-8, py=/Top/i.test(pos)?8:H-ph-8;
    cx.fillStyle='rgba(20,24,34,.82)'; cx.fillRect(px,py,pw,ph); cx.strokeStyle=cLn; cx.lineWidth=1; cx.strokeRect(px,py,pw,ph);
    let yy=py+pf+8; cx.textBaseline='middle'; txt(hd,px+pw/2,yy,bear?cSl:cTp,true,'center',pf+1); yy+=pf+6; txt('KEY LEVELS · TRADE SETUP',px+pw/2,yy,cTx,false,'center',pf-1); yy+=pf+4;
    rows.forEach(rw=>{ if(!rw){ line(px+6,yy-2,px+pw-6,yy-2,'rgba(255,255,255,.25)',1); yy+=4; return; } txt(rw[0],px+8,yy,cTx,false,'left',pf); txt(rw[1],px+pw-8,yy,rw[0]==='Stop Loss'?cSl:/Take/.test(rw[0])?cTp:cTx,true,'right',pf); yy+=pf+6; }); }
  cx.globalAlpha=1; cx.restore(); }
STRATS.msa={label:'Market Structure Analysis · premium / discount zones, 50% level, BOS, CHoCH, IDM, liquidity sweep, FVG, SSL / BSL, key levels, outlook and trade setup (bearish or bullish)',short:'Market Structure Analysis',own:true,
  defs:{limit:false,useSl:false,msaDir:'Auto',msaN:300,msaL:5,msaBos:2,msaFvg:3,msaSlBuf:0.5,msaRR:2,msaExt:20,msaLbl:true,msaPanel:true,msaPos:'Top right',msaSize:'Normal',msaSig:false,
    msaTx:'#e8eaed',msaLn:'#f5c542',msaPrem:'#9aa8e8',msaDisc:'#7bd88f',msaFvgCol:'#7bd88f',msaEnt:'#ff9800',msaSlCol:'#ff5d7a',msaTpCol:'#2dd4a7'},
  inputs:(b,d)=>{
    fld(b,d,'msaDir','sel','Direction',{opts:['Auto','Bearish only','Bullish only']}); fld(b,d,'msaN','num','Bars analysed',{min:60,max:2000,step:10}); fld(b,d,'msaL','num','Swing length (bars each side)',{min:2,max:20,step:1});
    fld(b,d,'msaBos','num','BOS lines shown',{min:0,max:10,step:1}); fld(b,d,'msaFvg','num','Fair value gaps shown',{min:0,max:10,step:1});
    fld(b,d,'msaSlBuf','num','Stop buffer beyond the entry zone (x ATR)',{min:0,max:5,step:0.1}); fld(b,d,'msaRR','num','Take profit 1 reward : risk',{min:0.5,max:10,step:0.1}); fld(b,d,'msaExt','num','Zones extend to the right (bars)',{min:2,max:200,step:1});
    fld(b,d,'msaLbl','chk','Show labels'); fld(b,d,'msaPanel','chk','Show key levels / trade setup panel'); fld(b,d,'msaPos','sel','Panel position',{opts:['Top right','Top left','Bottom right','Bottom left']}); fld(b,d,'msaSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'msaPrem','col','Premium zone colour'); fld(b,d,'msaDisc','col','Discount zone colour'); fld(b,d,'msaFvgCol','col','FVG colour'); fld(b,d,'msaLn','col','Structure line colour'); fld(b,d,'msaTx','col','Label colour');
    fld(b,d,'msaEnt','col','Entry zone colour'); fld(b,d,'msaSlCol','col','Stop loss colour'); fld(b,d,'msaTpCol','col','Take profit colour');
    fld(b,d,'msaSig','chk','BUY / SELL signal when price retests the entry zone (latest setup only, can change as new candles form)'); },
  sig:(c,i,n,Z)=>{ if(!Z.msaSig||c.length<60) return 0; const r=msaRun(c,Z); if(!r||r.a.sigBar<0) return 0; return i===r.a.sigBar+r.sl?(r.s===1?-1:1):0; }};
try{ DESC.msa='Price Action · premium / discount, 50% level, BOS, CHoCH, IDM, liquidity sweep, FVG, SSL, key levels and trade setup'; }catch(e){}
try{ if(typeof PAID!=='undefined'&&!PAID.includes('s:msa')) PAID.unshift('s:msa'); }catch(e){}
{ const _msD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='msaview') return msaDraw(d,X,Y,W,H); return _msD.apply(this,arguments); };
  const _msR=recomputeExtras; recomputeExtras=function(){ _msR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='msa'&&stVis(Z)) scriptBoxes.push({type:'msaview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('msa strategy failed',err); window.__msaErr=err; }

// =====================================================================================
// [obr] STRATEGY · "Order Block Retest" (S.O.T Academy: Types of Bullish Order Block Retest)   (self-contained: every name starts with obr / OBR)
// BOS (close breaks a swing high) -> DEMAND ZONE = last down candle at the swing low that started the impulse -> price pulls back
// and RETESTS the zone. The pullback is classified into one of THREE setups, each can be switched on / off in the settings:
//   1  Continuation pattern : pullback channel with lower highs + lower lows into the zone
//   2  Consolidation        : flat range after the high, then a drop into the zone
//   3  Buy-side liquidity   : equal highs (buy-side liquidity) + PDL (previous low) swept, then the zone
// BUY = a strong bullish candle on the retest (close above the middle of the zone). Mirror = SELL (supply zone) when direction allows it.
// Stop below the zone, target = last high (buy-side liquidity) or a reward:risk multiple. Signals only on closed bars (no repainting).
// Hooks: STRATS.obr + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const OBR_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
function obrAtr(cs){ const o=new Array(cs.length).fill(0); let p=null; for(let i=0;i<cs.length;i++){ const x=cs[i], tr=i?Math.max(x.h-x.l,Math.abs(x.h-cs[i-1].c),Math.abs(x.l-cs[i-1].c)):x.h-x.l; p=p==null?tr:(p*13+tr)/14; o[i]=p; } return o; }
function obrPush(seq,pv){ const l=seq[seq.length-1]; if(l&&l.h===pv.h){ if(pv.h?pv.p>l.p:pv.p<l.p) seq[seq.length-1]=pv; } else seq.push(pv); }
// classify the pullback between the post-BOS high and the first retest of the zone (cs mirrored: always the bullish case)
function obrClass(cs,seq,cd,t,Z,a){
  const pk=cd.peak, pv=[]; for(let j=seq.length-1;j>=0&&seq[j].i>cd.ob;j--) pv.unshift(seq[j]);
  // 3 · buy-side liquidity: two equal highs, the low between them (PDL) is swept, then the zone
  if(Z.obrLiq!==false){ const lqT=Z.obrLqT==null?0.5:+Z.obrLqT, lqD=Z.obrLqD==null?1:+Z.obrLqD;
    for(let j=pv.length-3;j>=0;j--){ const A=pv[j],M=pv[j+1],B=pv[j+2]; if(!(A.h&&!M.h&&B.h)) continue;
      const top=Math.max(A.p,B.p); if(Math.abs(A.p-B.p)>lqT*a||top-M.p<lqD*a||top<pk.p-lqT*a||cd.zt>=M.p) continue;
      let sw=-1,hh=-Infinity; for(let q=B.i+1;q<=t;q++){ if(cs[q].h>hh) hh=cs[q].h; if(sw<0&&cs[q].l<M.p) sw=q; }
      if(sw<0||hh>top+lqT*a) continue;
      return {type:'L',A,M,B,sw,tgt:top}; } }
  const pp=pv.filter(p=>p.i>pk.i);
  // 2 · consolidation: flat highs + flat lows (>= 2 each) after the high, well above the zone
  if(Z.obrCons!==false){ const cMin=Z.obrCMin==null?1:+Z.obrCMin, cMax=Z.obrCMax==null?6:+Z.obrCMax, fl=Z.obrCFlat==null?0.35:+Z.obrCFlat, cBars=Z.obrCBars==null?6:+Z.obrCBars, gap=Z.obrCGap==null?0.5:+Z.obrCGap;
    const q=pp.slice(-18), mean=arr=>arr.reduce((u,p)=>u+p.p,0)/arr.length; let best=null;
    for(let s=0;s<q.length;s++) for(let e=s+3;e<q.length;e++){
      const sub=q.slice(s,e+1), hs=sub.filter(p=>p.h), ls=sub.filter(p=>!p.h); if(hs.length<2||ls.length<2) continue;
      const hM=Math.max.apply(null,hs.map(p=>p.p)), hm=Math.min.apply(null,hs.map(p=>p.p)), lM=Math.max.apply(null,ls.map(p=>p.p)), lm=Math.min.apply(null,ls.map(p=>p.p)), ht=mean(hs)-mean(ls);
      if(ht<cMin*a||ht>cMax*a||(hM-hm)>fl*ht||(lM-lm)>fl*ht) continue;
      if(sub[sub.length-1].i-sub[0].i<cBars||lm<=cd.zt+gap*a||hM>pk.p+0.5*a) continue;
      const sc=sub.length*10000+e; if(!best||sc>best.sc) best={sc,sub,top:hM,bot:lm}; }
    if(best) return {type:'R',top:best.top,bot:best.bot,i0:best.sub[0].i,i1:best.sub[best.sub.length-1].i,tgt:pk.p}; }
  // 1 · continuation pattern: lower highs AND lower lows (a falling channel) into the zone
  if(Z.obrCont!==false){ const mh=Math.max(1,Math.round(Z.obrCLH==null?2:Z.obrCLH)), ml=Math.max(1,Math.round(Z.obrCLL==null?2:Z.obrCLL));
    const ph=pp.filter(p=>p.h), pl=pp.filter(p=>!p.h), hs=[], ls=[];
    for(let j=ph.length-1;j>=0;j--){ if(!hs.length||ph[j].p>hs[0].p) hs.unshift(ph[j]); else break; }
    for(let j=pl.length-1;j>=0;j--){ if(!ls.length||pl[j].p>ls[0].p) ls.unshift(pl[j]); else break; }
    if(hs.length>=mh&&ls.length>=ml) return {type:'C',hs,ls,tgt:pk.p}; }
  return null; }
// cs mirrored so the machine always looks for the BULLISH case
function obrMachine(cs,Z){
  const n=cs.length, L=Math.max(2,Math.round(Z.obrL)||4), atr=obrAtr(cs), bosMax=Math.max(10,Math.round(Z.obrBosMax)||60),
    imp=Z.obrImp==null?1.5:+Z.obrImp, zMax=Z.obrZMax==null?3:+Z.obrZMax, rtT=Z.obrRtTol==null?0.15:+Z.obrRtTol, body=Z.obrBody==null?0.4:+Z.obrBody,
    conf=Math.max(0,Math.round(Z.obrConf==null?2:Z.obrConf)), age=Math.max(20,Math.round(Z.obrAge)||200), brk=Z.obrBrk==null?0.3:+Z.obrBrk,
    sb=Z.obrSlBuf==null?0.2:+Z.obrSlBuf, rr=Z.obrRR==null?2:+Z.obrRR, maxR=Z.obrMaxR==null?0:+Z.obrMaxR, seq=[], cands=[], ev=[], sig=new Map();
  for(let t=0;t<n;t++){
    const x=cs[t], a=atr[t]||0, k=t-L;
    if(k>=L){ let ih=true,il=true;
      for(let j=k-L;j<=k+L;j++){ if(j===k) continue; if(j<k?cs[j].h>=cs[k].h:cs[j].h>cs[k].h) ih=false; if(j<k?cs[j].l<=cs[k].l:cs[j].l<cs[k].l) il=false; }
      if(il) obrPush(seq,{h:false,i:k,p:cs[k].l}); if(ih) obrPush(seq,{h:true,i:k,p:cs[k].h}); }
    // BOS: a close above an unbroken swing high. Zone = last down candle at the low that started the move.
    if(a>0&&t>0){ let first=null,cnt=0;
      for(let j=seq.length-1;j>=0&&cnt<12;j--){ const p=seq[j]; if(!p.h||p.br) continue; cnt++; if(x.c>p.p){ p.br=true; if(!first) first=p; } }
      if(first&&t-first.i<=bosMax){
        let ob=first.i+1; for(let j=first.i+1;j<=t;j++) if(cs[j].l<=cs[ob].l) ob=j;
        let j0=ob; if(!(cs[ob].c<cs[ob].o)){ for(let j=ob-1;j>=Math.max(first.i+1,ob-3);j--) if(cs[j].c<cs[j].o){ j0=j; break; } }
        const zb=Math.min(cs[j0].l,cs[ob].l), zt=Math.min(cs[j0].h,zb+zMax*a);
        if(zt>zb&&x.c-zt>=imp*a&&!cands.some(cd=>cd.ob===ob)){ cands.push({ob,j0,zt,zb,hi:first,bos:t,peak:{i:t,p:x.h},a,touch:-1,lo:Infinity,done:false,type:null,info:null,tgt:0}); if(cands.length>12) cands.shift(); } } }
    cands.forEach(cd=>{ if(cd.done||t<=cd.bos) return;
      if(t-cd.bos>age||x.c<cd.zb-brk*cd.a){ cd.done=true; return; }
      if(cd.touch<0){
        if(x.h>cd.peak.p) cd.peak={i:t,p:x.h};
        if(x.l<=cd.zt+rtT*cd.a&&t>cd.peak.i){
          if(cd.peak.p-cd.zt<imp*cd.a){ cd.done=true; return; }
          const cl=obrClass(cs,seq,cd,t,Z,cd.a); if(!cl){ cd.done=true; return; }
          cd.touch=t; cd.type=cl.type; cd.info=cl; cd.tgt=cl.tgt; cd.lo=x.l; }
        else return; }
      else cd.lo=Math.min(cd.lo,x.l);
      const sl=cd.zb-sb*cd.a, en=x.c, risk=en-sl, mid=cd.zb+(cd.zt-cd.zb)*0.5;
      if(x.c>x.o&&(x.c-x.o)>=body*cd.a&&(x.c-x.o)>=0.5*(x.h-x.l)&&x.c>mid&&cd.lo>=sl&&risk>0&&(maxR<=0||risk<=maxR*cd.a)){
        let tp=en+rr*risk; if(Z.obrTgt!=='Reward : risk'&&cd.tgt-en>=0.5*risk) tp=cd.tgt;
        ev.push({t,d:1,cd,en,sl,tp}); sig.set(t,1); cd.done=true; }
      else if(t-cd.touch>=conf||cd.lo<sl) cd.done=true; });
  }
  return {ev,sig}; }
const obrCache={};
function obrRun(c,Z,m){ m=m||c.length; const l=c[m-1], key=[m,c[0].time,l.time,l.high,l.low,l.close,Z.obrDir,Z.obrCont,Z.obrCons,Z.obrLiq,Z.obrL,Z.obrBosMax,Z.obrImp,Z.obrZMax,Z.obrRtTol,Z.obrBody,Z.obrConf,Z.obrAge,Z.obrBrk,Z.obrSlBuf,Z.obrRR,Z.obrMaxR,Z.obrTgt,Z.obrCLH,Z.obrCLL,Z.obrCMin,Z.obrCMax,Z.obrCFlat,Z.obrCBars,Z.obrCGap,Z.obrLqT,Z.obrLqD].join('|');
  const h=obrCache[Z.sid]; if(h&&h.k===key) return h.r;
  const evs=[], sig=new Map(), sl=m>6000?m-6000:0, cc=c.slice(sl,m), dir=Z.obrDir||'Buy only';
  [1,-1].forEach(s=>{ if(dir==='Sell only'&&s===1) return; if(dir==='Buy only'&&s===-1) return;
    const cs=cc.map(x=>s===1?{o:x.open,h:x.high,l:x.low,c:x.close}:{o:-x.open,h:-x.low,l:-x.high,c:-x.close}), r=obrMachine(cs,Z);
    r.ev.forEach(e=>{ e.s=s; e.off=sl; evs.push(e); }); r.sig.forEach((d,i)=>{ sig.set(i+sl,s); }); });
  evs.sort((a,b)=>(a.t+a.off)-(b.t+b.off));
  const r={ev:evs,sig}; obrCache[Z.sid]={k:key,r}; return r; }
function obrDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<50) return; const m=c.length-1, r=obrRun(c,Z,m); if(!r||!r.ev.length) return;
  const fs=OBR_FS[Z.obrSize]||7.5, ext=Math.max(1,Math.round(Z.obrExt==null?25:Z.obrExt)), lbl=Z.obrLbl!==false, cLn=Z.obrLn||'#ffffff', cTx=Z.obrTx||'#e0e0e0',
    cZn=Z.obrZn||'#2dd4a7', cCh=Z.obrCh||'#ff5d7a', bC=Z.buyCol||'#2dd4a7', sC=Z.sellCol||'#ff5d7a', show=Math.max(1,Math.round(Z.obrN)||3);
  const rgba=(hex,al)=>{ const v=parseInt(String(hex).replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+al+')'; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  const txt=(t,x,y,col,bold,al)=>{ cx.font=(bold?'bold ':'')+fs+'px system-ui'; cx.textAlign=al||'center'; cx.fillStyle=col; cx.fillText(t,x,y); };
  const seg=(i0,p0,i1,p1,col,w)=>{ const x0=X(i0),x1=X(i1),y0=Y(p0),y1=Y(p1); if(x0==null||x1==null||y0==null||y1==null) return; cx.strokeStyle=col; cx.lineWidth=w; cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y1); cx.stroke(); };
  const xmk=(i,p,col)=>{ const x=X(i), y=Y(p); if(x==null||y==null) return; cx.strokeStyle=col; cx.lineWidth=2; cx.beginPath(); cx.moveTo(x-5,y-5); cx.lineTo(x+5,y+5); cx.moveTo(x+5,y-5); cx.lineTo(x-5,y+5); cx.stroke(); };
  const arw=(i0,p,i1,col)=>{ const x0=X(i0), x1=X(i1), y=Y(p); if(x0==null||x1==null||y==null) return; cx.strokeStyle=cx.fillStyle=col; cx.lineWidth=1.8; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke();
    cx.beginPath(); cx.moveTo(x1+2,y); cx.lineTo(x1-7,y-4); cx.lineTo(x1-7,y+4); cx.closePath(); cx.fill(); };
  r.ev.slice(-show).forEach(e=>{
    const s=e.s, o=e.off, P=v=>s*v, cd=e.cd, t=e.t+o, cb=c[t]; if(!cb) return; const up=s===1, ah=up?-1:1, inf=cd.info;
    // BOS line + label
    seg(cd.hi.i+o,P(cd.hi.p),cd.bos+o,P(cd.hi.p),cLn,1.6);
    if(lbl){ const bx=X(Math.round((cd.hi.i+cd.bos)/2+o)), by=Y(P(cd.hi.p)); if(bx!=null&&by!=null) txt('BOS',bx,by+ah*(fs*0.8+3),cTx,true); }
    // demand / supply zone box (white outline like the S.O.T image)
    { const xa=X(cd.j0+o), xb=X(t+ext), y1=Y(P(cd.zt)), y2=Y(P(cd.zb)); if(xa!=null&&xb!=null&&y1!=null&&y2!=null){ const yt=Math.min(y1,y2), hh=Math.max(3,Math.abs(y2-y1));
        cx.fillStyle=rgba(cZn,0.16); cx.fillRect(xa,yt,xb-xa,hh); cx.strokeStyle=cLn; cx.lineWidth=1.6; cx.strokeRect(xa,yt,xb-xa,hh);
        if(lbl) txt(up?'DEMAND ZONE':'SUPPLY ZONE',xa+5,yt+hh/2,cTx,true,'left'); } }
    // the pullback pattern
    if(inf&&inf.type==='C'){ const hs=inf.hs, ls=inf.ls, h0=hs[0], h1=hs[hs.length-1], mm=(h1.p-h0.p)/Math.max(1,h1.i-h0.i), ln=i=>h0.p+mm*(i-h0.i);
      let off=0; ls.forEach(p=>{ off=Math.min(off,p.p-ln(p.i)); }); const si=Math.min(h0.i,ls[0].i), ei=cd.touch;
      seg(si+o,P(ln(si)),ei+o,P(ln(ei)),cCh,1.6); seg(si+o,P(ln(si)+off),ei+o,P(ln(ei)+off),cCh,1.6);
      if(lbl){ const mi=Math.round((si+ei)/2), mx=X(mi+o), my=Y(P(cd.peak.p)); if(mx!=null&&my!=null) txt('CONTINUATION PATTERN',mx,my+ah*(fs+7),cTx,true); } }
    else if(inf&&inf.type==='R'){ const ei=cd.touch; seg(inf.i0+o,P(inf.top),ei+o,P(inf.top),cCh,1.6); seg(inf.i0+o,P(inf.bot),ei+o,P(inf.bot),cCh,1.6);
      if(lbl){ const mx=X(Math.round((inf.i0+inf.i1)/2+o)), my=Y(P(Math.max(inf.top,cd.peak.p))); if(mx!=null&&my!=null) txt('CONSOLIDATION',mx,my+ah*(fs+7),cTx,true); } }
    else if(inf&&inf.type==='L'){ const A=inf.A, B=inf.B, M=inf.M;
      arw(A.i+o,P(inf.tgt),B.i+10+o,cCh); xmk(A.i+o,P(A.p),cLn); xmk(B.i+o,P(B.p),cLn);
      arw(M.i+o,P(M.p),Math.max(inf.sw,M.i+4)+o,cCh); xmk(inf.sw+o,P(M.p),cLn);
      if(lbl){ const mx=X(Math.round((A.i+B.i)/2+o)), my=Y(P(inf.tgt)), px=X(M.i+o), py=Y(P(M.p));
        if(mx!=null&&my!=null) txt(up?'BUY-SIDE LIQUIDITY':'SELL-SIDE LIQUIDITY',mx,my+ah*(fs+6),cTx,true);
        if(px!=null&&py!=null) txt(up?'PDL':'PDH',px,py-ah*(fs+6),cTx,true); } }
    // retest circle
    { const tb=c[cd.touch+o]; if(tb){ const px=X(cd.touch+o), py=Y(up?tb.low:tb.high); if(px!=null&&py!=null){ cx.strokeStyle=cLn; cx.lineWidth=1.8; cx.beginPath(); cx.ellipse(px,py,10,8,0,0,6.2832); cx.stroke(); } } }
    // BUY / SELL button (pill with gradient, gloss, glow and a pointer to the candle)
    if(Z.obrBtn!==false){ const x=X(t), yc=Y(up?cb.low:cb.high), yz=Y(P(cd.zb)); let y=yc; if(yc!=null&&yz!=null) y=up?Math.max(yc,yz):Math.min(yc,yz); if(x!=null&&y!=null){
        const bs=Math.max(7,Math.round(fs)), main=up?'\u25B2  BUY':'\u25BC  SELL', sub=Z.obrBtnSub===false?'':({C:'CONTINUATION',R:'CONSOLIDATION',L:'LIQUIDITY'})[cd.type]||'', col=up?bC:sC;
        cx.font='bold '+bs+'px system-ui'; const w1=cx.measureText(main).width; const sf=Math.max(5,Math.round(bs*0.62)); cx.font='bold '+sf+'px system-ui'; const w2=sub?cx.measureText(sub).width:0;
        const bw=Math.max(w1,w2)+bs*1.3, bh=bs*(sub?2.5:1.8), gap=7, top=up?y+gap:y-gap-bh, bx=x-bw/2, rad=Math.min(bh/2,bs*1.1);
        const mix=(hex,tg,k)=>{ const v=parseInt(String(hex).replace('#',''),16), f=q=>Math.round(q+(tg-q)*k); return 'rgb('+f(v>>16&255)+','+f(v>>8&255)+','+f(v&255)+')'; };
        const path=()=>{ cx.beginPath(); cx.moveTo(bx+rad,top); cx.lineTo(bx+bw-rad,top); cx.arcTo(bx+bw,top,bx+bw,top+rad,rad); cx.lineTo(bx+bw,top+bh-rad); cx.arcTo(bx+bw,top+bh,bx+bw-rad,top+bh,rad);
          cx.lineTo(bx+rad,top+bh); cx.arcTo(bx,top+bh,bx,top+bh-rad,rad); cx.lineTo(bx,top+rad); cx.arcTo(bx,top,bx+rad,top,rad); cx.closePath(); };
        if(yc!=null&&Math.abs(y-yc)>2){ cx.strokeStyle=rgba(col,0.8); cx.lineWidth=1; cx.beginPath(); cx.moveTo(x,yc); cx.lineTo(x,y); cx.stroke(); }
        // pointer toward the candle
        cx.fillStyle=mix(col,0,0.15); cx.beginPath(); if(up){ cx.moveTo(x,y+1); cx.lineTo(x-4,y+gap+1); cx.lineTo(x+4,y+gap+1); } else { cx.moveTo(x,y-1); cx.lineTo(x-4,y-gap-1); cx.lineTo(x+4,y-gap-1); } cx.closePath(); cx.fill();
        // glow + body
        cx.save(); cx.shadowColor=rgba(col,0.6); cx.shadowBlur=7; cx.shadowOffsetY=2; const g=cx.createLinearGradient(0,top,0,top+bh); g.addColorStop(0,mix(col,255,0.22)); g.addColorStop(0.55,col); g.addColorStop(1,mix(col,0,0.32));
        cx.fillStyle=g; path(); cx.fill(); cx.restore();
        // gloss + border
        cx.save(); path(); cx.clip(); cx.fillStyle='rgba(255,255,255,0.20)'; cx.fillRect(bx,top,bw,bh*0.46); cx.restore();
        cx.strokeStyle='rgba(255,255,255,0.85)'; cx.lineWidth=1; path(); cx.stroke();
        // text
        cx.save(); cx.shadowColor='rgba(0,0,0,0.4)'; cx.shadowBlur=2; cx.shadowOffsetY=1; cx.textAlign='center'; cx.fillStyle='#fff'; cx.font='bold '+bs+'px system-ui'; cx.fillText(main,bx+bw/2,sub?top+bh*0.36:top+bh/2);
        if(sub){ cx.globalAlpha=0.92; cx.font='bold '+sf+'px system-ui'; cx.fillText(sub,bx+bw/2,top+bh*0.74); } cx.restore(); } } });
  cx.globalAlpha=1; cx.restore(); }
STRATS.obr={label:'Order Block Retest \u00b7 BOS, demand zone and 3 retest setups (continuation pattern, consolidation, buy-side liquidity) with BUY signal, stop below the zone, target last high / RR',short:'Order Block Retest',own:true,
  defs:{limit:false,useSl:false,obrDir:'Buy only',obrCont:true,obrCons:true,obrLiq:true,obrL:4,obrBosMax:60,obrImp:1.5,obrZMax:3,obrRtTol:0.15,obrBody:0.4,obrConf:2,obrAge:200,obrBrk:0.3,
    obrSlBuf:0.2,obrRR:2,obrMaxR:0,obrTgt:'Last high',obrCLH:2,obrCLL:2,obrCMin:1,obrCMax:6,obrCFlat:0.35,obrCBars:6,obrCGap:0.5,obrLqT:0.5,obrLqD:1,
    obrLn:'#ffffff',obrTx:'#e0e0e0',obrZn:'#2dd4a7',obrCh:'#ff5d7a',obrLbl:true,obrBtn:true,obrBtnSub:true,obrN:3,obrExt:25,obrSize:'Small',obrSig:true},
  inputs:(b,d)=>{
    fld(b,d,'obrCont','chk','Setup 1 \u00b7 Continuation pattern (falling channel into the demand zone)');
    fld(b,d,'obrCons','chk','Setup 2 \u00b7 Consolidation (range, then drop into the demand zone)');
    fld(b,d,'obrLiq','chk','Setup 3 \u00b7 Buy-side liquidity (equal highs, PDL swept, then the zone)');
    fld(b,d,'obrDir','sel','Trade direction (Buy = demand zone, Sell = mirror supply zone)',{opts:['Buy only','Both','Sell only']});
    fld(b,d,'obrL','num','Swing length (bars each side)',{min:2,max:20,step:1}); fld(b,d,'obrBosMax','num','Max bars from the swing high to the BOS',{min:10,max:300,step:5});
    fld(b,d,'obrImp','num','Impulse size: min move away from the zone (x ATR)',{min:0.5,max:10,step:0.1}); fld(b,d,'obrZMax','num','Max zone height (x ATR)',{min:0.5,max:10,step:0.1});
    fld(b,d,'obrRtTol','num','Retest: distance to the zone top (x ATR)',{min:0,max:2,step:0.05}); fld(b,d,'obrBody','num','Strong candle: min body (x ATR)',{min:0.1,max:3,step:0.1});
    fld(b,d,'obrConf','num','Bars allowed between the retest touch and the strong candle',{min:0,max:6,step:1}); fld(b,d,'obrAge','num','Max bars a zone stays active',{min:20,max:1000,step:10});
    fld(b,d,'obrBrk','num','Zone broken when a close is below it by (x ATR)',{min:0,max:3,step:0.05});
    fld(b,d,'obrCLH','num','Setup 1: min lower highs',{min:1,max:6,step:1}); fld(b,d,'obrCLL','num','Setup 1: min lower lows',{min:1,max:6,step:1});
    fld(b,d,'obrCMin','num','Setup 2: min range height (x ATR)',{min:0.2,max:10,step:0.1}); fld(b,d,'obrCMax','num','Setup 2: max range height (x ATR)',{min:1,max:30,step:0.5});
    fld(b,d,'obrCFlat','num','Setup 2: how flat the range edges must be (0.1 strict, 0.6 loose)',{min:0.1,max:1,step:0.05}); fld(b,d,'obrCBars','num','Setup 2: min range length (bars)',{min:3,max:100,step:1});
    fld(b,d,'obrCGap','num','Setup 2: min gap between the range and the zone (x ATR)',{min:0,max:5,step:0.1});
    fld(b,d,'obrLqT','num','Setup 3: how equal the two highs must be (x ATR)',{min:0.1,max:3,step:0.1}); fld(b,d,'obrLqD','num','Setup 3: min depth of the PDL below the highs (x ATR)',{min:0.2,max:10,step:0.1});
    fld(b,d,'obrSlBuf','num','Zone must hold: allowed wick below the zone (x ATR)',{min:0,max:3,step:0.05}); fld(b,d,'obrMaxR','num','Skip if stop is bigger than (x ATR, 0 = off)',{min:0,max:50,step:1});
    fld(b,d,'obrLn','col','Outline / BOS colour'); fld(b,d,'obrTx','col','Label colour'); fld(b,d,'obrZn','col','Zone fill colour'); fld(b,d,'obrCh','col','Channel / range / liquidity colour');
    fld(b,d,'obrLbl','chk','Show labels'); fld(b,d,'obrN','num','Setups shown on chart',{min:1,max:30,step:1}); fld(b,d,'obrExt','num','Zone box length (bars)',{min:5,max:200,step:5}); fld(b,d,'obrSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'obrBtn','chk','Show BUY / SELL buttons on the chart'); fld(b,d,'obrBtnSub','chk','Show the setup name inside the button');
    fld(b,d,'obrSig','chk','BUY / SELL signals'); },
  sig:(c,i,n,Z)=>{ if(Z.obrSig===false||c.length<50) return 0; const r=obrRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.obr='Price Action \u00b7 BOS + demand zone retest: continuation pattern, consolidation or buy-side liquidity, BUY button on the chart'; }catch(e){}
{ const _obO=runOne; runOne=function(Z,quiet,out){ if(!Z||Z.k!=='obr') return _obO.apply(this,arguments); const tmp=[]; _obO.call(this,Z,quiet,tmp); tmp.forEach(x=>{ if(x.shape!=='arrowUp'&&x.shape!=='arrowDown') out.push(x); }); }; }
{ const _obD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='obrview') return obrDraw(d,X,Y,W,H); return _obD.apply(this,arguments); };
  const _obR=recomputeExtras; recomputeExtras=function(){ _obR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='obr'&&stVis(Z)) scriptBoxes.push({type:'obrview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('obr strategy failed',err); window.__obrErr=err; }


// =====================================================================================
// [pac] STRATEGY · "Price Action Concepts"   (self-contained: every name starts with pac / PAC)
// Port of the LuxAlgo Price Action Concepts idea (as in the screenshot): internal + swing market structure
// (BOS / CHoCH / CHoCH+), equal highs / lows, volumetric order blocks with buy / sell bars and volume %,
// trend line liquidity zones, liquidity grabs and a structure scanner box.
// BUY / SELL: order block retest (first touch, rejection close) and / or CHoCH+ reversal.
// Hooks (same pattern as bbs / obr): STRATS.pac + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const PAC_KEYS=['inL','swL','tlL','obInt','obSw','obMit','sigMode','sigTrend','eqT','tlN','tlW'];
function pacCompute(c,Z){
  const n=c.length, out={n,c,ev:[],obs:[],eqs:[],grabs:[],sigs:[],tls:[],mapS:new Map(),IN:null,SW:null};
  if(n<40) return out;
  const atr=new Array(n).fill(0), tr=[]; let s=0;
  for(let i=0;i<n;i++){ const b=c[i], t=i?Math.max(b.high-b.low,Math.abs(b.high-c[i-1].close),Math.abs(b.low-c[i-1].close)):b.high-b.low; tr.push(t); s+=t; if(i>=200) s-=tr[i-200]; atr[i]=s/Math.min(i+1,200); }
  const mk=L=>({L,hi:null,lo:null,bias:0,ph:[],pl:[]});
  const IN=mk(Math.max(2,Math.round(Z.inL)||5)), SW=mk(Math.max(2,Math.round(Z.swL)||50));
  const TL=Math.max(2,Math.round(Z.tlL)||10), tph=[], tpl=[];
  const mode=Z.sigMode||'Both', useOB=mode!=='CHoCH+', useCH=mode!=='Order Block retest';
  const piv=(p,L)=>{ let h=true,l=true; for(let j=p-L;j<=p+L;j++){ if(j===p) continue;
    if(j<p?c[j].high>c[p].high:c[j].high>=c[p].high) h=false; if(j<p?c[j].low<c[p].low:c[j].low<=c[p].low) l=false; if(!h&&!l) break; } return [h,l]; };
  const addSig=(t,v)=>{ if(!out.mapS.has(t)){ out.mapS.set(t,v); out.sigs.push({i:t,v}); } };
  const brk=(E,kind,t,dir)=>{
    const lv=dir>0?E.hi:E.lo; let tag=E.bias===-dir?'CHoCH':'BOS';
    if(tag==='CHoCH'){ const a=dir>0?E.pl:E.ph; if(a.length>=2&&(dir>0?a[a.length-1].p>a[a.length-2].p:a[a.length-1].p<a[a.length-2].p)) tag='CHoCH+'; }
    E.bias=dir; lv.crossed=true;
    out.ev.push({i:t,f:lv.i,p:lv.p,d:dir,tag,k:kind});
    let q=-1, best=dir>0?1e18:-1e18;
    for(let j=lv.i;j<t;j++){ if(dir>0?c[j].low<best:c[j].high>best){ best=dir>0?c[j].low:c[j].high; q=j; } }
    if(q>=0&&((kind==='i'&&Z.obInt)||(kind==='s'&&Z.obSw))){
      let bv=0,tv=0; for(let j=Math.max(0,t-2);j<=t;j++){ const x=c[j], r=x.high>x.low?(x.close-x.low)/(x.high-x.low):.5, v=x.volume||0; tv+=v; bv+=v*r; }
      out.obs.push({i0:q,top:c[q].high,bot:c[q].low,d:dir,k:kind,bv,sv:tv-bv,vol:tv,t0:t,end:null,touched:false});
    }
    if(useCH&&tag==='CHoCH+') addSig(t,dir);
  };
  const step=(E,kind,t)=>{
    const L=E.L, p=t-L, b=c[t];
    if(p-L>=0){ const [h,l]=piv(p,L);
      if(h){ const o={i:p,p:c[p].high,crossed:false,grab:false};
        if(kind==='i'){ const pv=E.ph[E.ph.length-1]; if(pv&&Math.abs(pv.p-o.p)<(Z.eqT||.1)*atr[p]) out.eqs.push({i0:pv.i,i1:p,p:(pv.p+o.p)/2,d:1}); }
        E.ph.push(o); E.hi=o; }
      if(l){ const o={i:p,p:c[p].low,crossed:false,grab:false};
        if(kind==='i'){ const pv=E.pl[E.pl.length-1]; if(pv&&Math.abs(pv.p-o.p)<(Z.eqT||.1)*atr[p]) out.eqs.push({i0:pv.i,i1:p,p:(pv.p+o.p)/2,d:-1}); }
        E.pl.push(o); E.lo=o; } }
    if(kind==='i'){
      if(E.hi&&!E.hi.grab&&!E.hi.crossed&&b.high>E.hi.p&&b.close<E.hi.p){ E.hi.grab=true; out.grabs.push({i:t,top:b.high,bot:Math.max(E.hi.p,b.close),d:-1}); }
      if(E.lo&&!E.lo.grab&&!E.lo.crossed&&b.low<E.lo.p&&b.close>E.lo.p){ E.lo.grab=true; out.grabs.push({i:t,top:Math.min(E.lo.p,b.close),bot:b.low,d:1}); } }
    if(E.hi&&!E.hi.crossed&&b.close>E.hi.p) brk(E,kind,t,1);
    if(E.lo&&!E.lo.crossed&&b.close<E.lo.p) brk(E,kind,t,-1);
  };
  for(let t=0;t<n;t++){
    const b=c[t];
    step(SW,'s',t); step(IN,'i',t);
    { const p=t-TL; if(p-TL>=0){ const [h,l]=piv(p,TL); if(h) tph.push({i:p,p:c[p].high}); if(l) tpl.push({i:p,p:c[p].low}); } }
    // order blocks: mitigation first, then first-touch retest signal
    for(const o of out.obs){ if(o.end!=null||t<=o.t0) continue; const mid=(o.top+o.bot)/2;
      const mit=o.d>0?(Z.obMit==='Wick'?b.low<o.bot:Z.obMit==='Average'?b.close<mid:b.close<o.bot):(Z.obMit==='Wick'?b.high>o.top:Z.obMit==='Average'?b.close>mid:b.close>o.top);
      if(mit){ o.end=t; continue; }
      const tch=o.d>0?b.low<=o.top:b.high>=o.bot;
      if(tch&&!o.touched){ o.touched=true;
        const rej=o.d>0?b.close>o.top:b.close<o.bot, trendOK=!Z.sigTrend||SW.bias===o.d||IN.bias===o.d&&SW.bias===0;
        if(useOB&&rej&&trendOK) addSig(t,o.d); } }
  }
  // trend line liquidity zones (pivot pairs with the right slope, broken when price closes through the band)
  const w=Z.tlW>0?Z.tlW:.5;
  const mkTl=(arr,down)=>{ const L=[]; for(let k=1;k<arr.length;k++){ const a=arr[k-1], b2=arr[k];
    if(down?b2.p<a.p:b2.p>a.p){ const sl=(b2.p-a.p)/(b2.i-a.i); let end=n-1, br=false;
      for(let u=b2.i+TL+1;u<n;u++){ const y=b2.p+sl*(u-b2.i); if(down?c[u].close>y+atr[u]*w:c[u].close<y-atr[u]*w){ end=u; br=true; break; } }
      L.push({i0:a.i,p0:a.p,i1:b2.i,p1:b2.p,sl,end,br,d:down?-1:1,w:atr[b2.i]*w}); } } return L.slice(-Math.max(1,Math.round(Z.tlN)||2)); };
  out.tls=[...mkTl(tph,true),...mkTl(tpl,false)];
  out.IN=IN; out.SW=SW; return out;
}
const pacC={sig:{},draw:{}};
function pacGet(slot,c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,PAC_KEYS.map(k=>Z[k]).join(',')].join('|');
  const m=pacC[slot]; if(!m[Z.sid]||m[Z.sid].k!==key) m[Z.sid]={k:key,r:pacCompute(c,Z)}; return m[Z.sid].r; }
const pacFmt=v=>v>=1e6?(v/1e6).toFixed(2)+'M':v>=1e3?(v/1e3).toFixed(3)+'K':String(Math.round(v));
function pacDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<40) return; const r=pacGet('draw',c,Z), n=r.n;
  const pos=Z.pacPos||'#089981', neg=Z.pacNeg||'#f23645', tx=Z.pacTxt||'#b2b5be';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  const xr=Math.min(W,(X(n-1)||W)+40);
  // trend line liquidity zones
  if(Z.tlOn!==false) r.tls.forEach(t=>{ const x0=X(t.i0), x1=X(t.end), ya=Y(t.p0), yb=Y(t.p0+t.sl*(t.end-t.i0)), yw=Y(t.p0+t.w), yz=Y(t.p0); if(x0==null||x1==null||ya==null||yb==null||yw==null||yz==null) return;
    const hw=Math.max(2,Math.abs(yw-yz)); cx.globalAlpha=t.br?.25:.55; cx.fillStyle=t.d<0?neg:'#2962ff';
    cx.beginPath(); cx.moveTo(x0,ya-hw); cx.lineTo(x1,yb-hw); cx.lineTo(x1,yb+hw); cx.lineTo(x0,ya+hw); cx.closePath(); cx.fill(); cx.globalAlpha=1; });
  // order blocks: last N per side, volume bars + percent
  const show=[]; [1,-1].forEach(dr=>{ show.push(...r.obs.filter(o=>o.d===dr&&o.end==null).slice(-Math.max(1,Math.round(Z.obN)||3))); });
  const sumV=show.reduce((a,o)=>a+o.vol,0), maxV=Math.max(1,...show.map(o=>Math.max(o.bv,o.sv)));
  show.forEach(o=>{ const x0=X(o.i0), yT=Y(o.top), yB=Y(o.bot); if(x0==null||yT==null||yB==null) return; const y0=Math.min(yT,yB), hh=Math.max(2,Math.abs(yB-yT)), col=o.d>0?pos:neg;
    cx.globalAlpha=.14; cx.fillStyle=col; cx.fillRect(x0,y0,Math.max(1,xr-x0),hh); cx.globalAlpha=1;
    const bw=(xr-x0)*.6; cx.fillStyle=pos; cx.globalAlpha=.85; cx.fillRect(x0,y0,Math.max(1,bw*o.bv/maxV),hh/2);
    cx.fillStyle=neg; cx.fillRect(x0,y0+hh/2,Math.max(1,bw*o.sv/maxV),hh/2); cx.globalAlpha=1;
    if(o.vol>0){ const ym=y0+hh/2; cx.strokeStyle=tx; cx.globalAlpha=.6; cx.setLineDash([2,3]); cx.beginPath(); cx.moveTo(x0+Math.max(bw*o.bv/maxV,bw*o.sv/maxV),ym); cx.lineTo(xr-4,ym); cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1;
      cx.fillStyle=tx; cx.font='9px system-ui'; cx.textAlign='right'; cx.textBaseline='bottom'; cx.fillText(pacFmt(o.vol)+' ('+Math.round(o.vol/sumV*100)+'%)',xr-4,ym-1); } });
  // market structure lines + labels
  r.ev.filter(e=>e.k==='i'?Z.msInt!==false:Z.msSw!==false).slice(-(Math.round(Z.msN)||40)).forEach(e=>{ let x0=X(e.f); const x1=X(e.i), y=Y(e.p); if(x1==null||y==null) return; if(x0==null) x0=0;
    const col=e.d>0?pos:neg; cx.strokeStyle=col; cx.fillStyle=col; cx.lineWidth=1; cx.setLineDash(e.k==='i'?[4,3]:[]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]);
    cx.font=(e.k==='s'?'bold 10px':'8px')+' system-ui'; cx.textAlign='center'; cx.textBaseline=e.d>0?'bottom':'top'; cx.fillText(e.tag,(x0+x1)/2,y+(e.d>0?-2:2)); });
  // equal highs / lows
  if(Z.eqOn!==false) r.eqs.slice(-12).forEach(q=>{ const x0=X(q.i0), x1=X(q.i1), y=Y(q.p); if(x0==null||x1==null||y==null) return; const col=q.d>0?neg:pos;
    cx.strokeStyle=col; cx.fillStyle=col; cx.setLineDash([3,3]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]);
    cx.font='8px system-ui'; cx.textAlign='center'; cx.textBaseline=q.d>0?'bottom':'top'; cx.fillText(q.d>0?'EQH':'EQL',(x0+x1)/2,y+(q.d>0?-2:2)); });
  // liquidity grabs
  if(Z.grabOn!==false) r.grabs.slice(-15).forEach(g=>{ const x=X(g.i), yT=Y(g.top), yB=Y(g.bot); if(x==null||yT==null||yB==null) return; const w2=Math.max(3,Math.abs((X(g.i)||0)-(X(g.i-1)||0))*.8);
    cx.globalAlpha=.8; cx.fillStyle=g.d<0?neg:'#2962ff'; cx.fillRect(x-w2/2,Math.min(yT,yB),w2,Math.max(2,Math.abs(yB-yT))); cx.globalAlpha=1; });
  // structure scanner box (top right)
  if(Z.scanOn!==false){ const le=r.ev.filter(e=>e.k==='i'?Z.msInt!==false:Z.msSw!==false).slice(-1)[0], bx=W-124, by=8;
    cx.fillStyle='rgba(30,34,45,.92)'; cx.fillRect(bx,by,116,40); cx.strokeStyle='rgba(255,255,255,.12)'; cx.strokeRect(bx,by,116,40);
    cx.fillStyle=tx; cx.font='bold 9px system-ui'; cx.textAlign='center'; cx.textBaseline='middle'; let tfs=''; try{ tfs=tf&&tf[0]?tf[0]:''; }catch(e){}
    cx.fillText('Structure Scanner'+(tfs?' ('+tfs+')':''),bx+58,by+12);
    if(le){ cx.fillStyle=le.d>0?pos:neg; cx.globalAlpha=.25; cx.fillRect(bx+6,by+21,104,14); cx.globalAlpha=1; cx.fillStyle=le.d>0?pos:neg; cx.font='bold 9px system-ui'; cx.fillText(le.tag,bx+58,by+28); } }
  cx.restore();
}
STRATS.pac={label:'Price Action Concepts \u00b7 BOS / CHoCH / CHoCH+, volumetric order blocks, trend line liquidity zones, liquidity grabs, EQH / EQL, structure scanner',short:'Price Action Concepts',own:true,
  defs:{limit:false,useSl:false,inL:5,swL:50,tlL:10,msInt:true,msSw:true,msN:40,obInt:true,obSw:true,obN:3,obMit:'Close',sigMode:'Both',sigTrend:true,
    eqOn:true,eqT:.1,tlOn:true,tlN:2,tlW:.5,grabOn:true,scanOn:true,pacPos:'#089981',pacNeg:'#f23645',pacTxt:'#b2b5be'},
  inputs:(b,d)=>{
    fld(b,d,'sigMode','sel','BUY / SELL signal from',{opts:['Both','Order Block retest','CHoCH+']}); fld(b,d,'sigTrend','chk','Order block retest only with the swing trend');
    fld(b,d,'msInt','chk','Internal structure (dashed)'); fld(b,d,'inL','num','Internal length',{min:2,max:30,step:1});
    fld(b,d,'msSw','chk','Swing structure (solid)'); fld(b,d,'swL','num','Swing length',{min:5,max:200,step:1}); fld(b,d,'msN','num','Structure labels shown',{min:5,max:200,step:5});
    fld(b,d,'obInt','chk','Internal order blocks'); fld(b,d,'obSw','chk','Swing order blocks'); fld(b,d,'obN','num','Order blocks per side',{min:1,max:10,step:1});
    fld(b,d,'obMit','sel','Order block mitigation',{opts:['Close','Wick','Average']});
    fld(b,d,'eqOn','chk','Equal highs / lows'); fld(b,d,'eqT','num','EQH / EQL threshold (x ATR)',{min:.01,max:1,step:.01});
    fld(b,d,'tlOn','chk','Trend line liquidity zones'); fld(b,d,'tlL','num','Trend line pivot length',{min:2,max:50,step:1}); fld(b,d,'tlN','num','Trend lines per side',{min:1,max:5,step:1}); fld(b,d,'tlW','num','Zone width (x ATR)',{min:.1,max:3,step:.1});
    fld(b,d,'grabOn','chk','Liquidity grabs'); fld(b,d,'scanOn','chk','Structure scanner box');
    fld(b,d,'pacPos','col','Bullish color'); fld(b,d,'pacNeg','col','Bearish color'); fld(b,d,'pacTxt','col','Text color'); },
  sig:(c,i,n,Z)=>{ if(c.length<40) return 0; return pacGet('sig',c,Z).mapS.get(i)||0; }};
try{ DESC.pac='Strategy \u00b7 LuxAlgo-style price action: structure, volumetric order blocks, liquidity zones; BUY / SELL on order block retest or CHoCH+'; }catch(e){}
{ const _pcD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='pacview') return pacDraw(d,X,Y,W,H); return _pcD.apply(this,arguments); };
  const _pcR=recomputeExtras; recomputeExtras=function(){ _pcR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='pac'&&stVis(Z)) scriptBoxes.push({type:'pacview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('pac strategy failed',err); window.__pacErr=err; }


// =====================================================================================
// [sno] STRATEGY · "Signals & Overlays"   (self-contained: every name starts with sno / SNO)
// Port of the LuxAlgo Signals & Overlays idea (as in the screenshot): Smart Trail with band, Reversal Zones,
// green / purple / red candle coloring, Confirmation signals (normal + strong "+"), Contrarian signals,
// exit "x" marks and the side dashboard (optimal sensitivity, trend strength, volatility, squeeze, volume sentiment).
// Hooks (same pattern as pac / obr): STRATS.sno + runOne wrapper + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const SNO_KEYS=['sens','sigMode','sigFilter','trendFilter','rzLen','rz1','rz2','rz3','thr'];
const snoEma=(a,len)=>{ const k=2/(len+1), o=new Array(a.length); let e=a[0]; for(let i=0;i<a.length;i++){ e=i?a[i]*k+e*(1-k):a[0]; o[i]=e; } return o; };
function snoAtr(c,len){ const n=c.length, o=new Array(n).fill(0), tr=[]; let s=0;
  for(let i=0;i<n;i++){ const b=c[i], t=i?Math.max(b.high-b.low,Math.abs(b.high-c[i-1].close),Math.abs(b.low-c[i-1].close)):b.high-b.low; tr.push(t); s+=t; if(i>=len) s-=tr[i-len]; o[i]=s/Math.min(i+1,len); } return o; }
function snoTrail(c,hl2,atr,mult){
  const n=c.length, dir=new Array(n).fill(1), tl=new Array(n).fill(NaN); let up=0, dn=0, d=1;
  for(let i=0;i<n;i++){ const a=atr[i]*mult, bu=hl2[i]-a, bd=hl2[i]+a;
    if(i===0){ up=bu; dn=bd; d=1; } else { const pu=up, pd=dn;
      up=(c[i-1].close>pu)?Math.max(bu,pu):bu; dn=(c[i-1].close<pd)?Math.min(bd,pd):bd;
      if(d===-1&&c[i].close>pd) d=1; else if(d===1&&c[i].close<pu) d=-1; }
    dir[i]=d; tl[i]=d===1?up:dn; }
  return {dir,tl};
}
function snoCompute(c,Z){
  const n=c.length, out={n,c,sigs:[],exits:[],mapS:new Map(),col:[],trail:[],tb:[],cen:[],U:[[],[],[]],L:[[],[],[]],dash:null};
  if(n<60) return out;
  const hl2=c.map(x=>(x.high+x.low)/2), cl=c.map(x=>x.close), atr=snoAtr(c,14);
  const sens=Math.max(2,Z.sens||12), mult=sens/4, T=snoTrail(c,hl2,atr,mult);
  const eF=snoEma(cl,9), eS=snoEma(cl,21), thr=Z.thr>0?Z.thr:.4;
  const score=cl.map((_,i)=>atr[i]>0?(eF[i]-eS[i])/atr[i]:0);
  // kaufman efficiency ratio (trend strength)
  const er=cl.map((_,i)=>{ if(i<20) return 0; let p=0; for(let j=i-19;j<=i;j++) p+=Math.abs(cl[j]-cl[j-1]); return p>0?Math.abs(cl[i]-cl[i-20])/p:0; });
  // reversal zones: smoothed center +/- multiples of the mean absolute deviation
  const rl=Math.max(5,Math.round(Z.rzLen)||50), cen=snoEma(snoEma(cl,rl),Math.max(3,Math.round(rl/4)));
  const dev=snoEma(cl.map((x,i)=>Math.abs(x-cen[i])),100), ks=[Z.rz1||1.8,Z.rz2||2.6,Z.rz3||3.4];
  for(let i=0;i<n;i++){ for(let k=0;k<3;k++){ out.U[k][i]=cen[i]+ks[k]*dev[i]; out.L[k][i]=cen[i]-ks[k]*dev[i]; } }
  out.cen=cen;
  // smart trail (smoothed for display) + band
  out.trail=snoEma(T.tl,4); out.tb=atr.map(a=>a*mult*.45);
  // candle colors: 1 green, -1 red, 0 purple
  for(let i=0;i<n;i++) out.col[i]=T.dir[i]>0&&score[i]>=thr?1:T.dir[i]<0&&score[i]<=-thr?-1:0;
  // confirmation signals (flip = normal, score confirmation = strong "+")
  const sg=[]; let strongDone=true, expDir=0, exDone=true;
  for(let i=30;i<n;i++){
    const flip=T.dir[i]!==T.dir[i-1], v=T.dir[i];
    if(flip){ strongDone=false; expDir=v; exDone=false; if(!(Z.trendFilter&&er[i]<.3)) sg.push({i,v,strong:false,flip:true,k:'c'}); }
    if(!strongDone&&((v>0&&score[i]>=thr)||(v<0&&score[i]<=-thr))){ strongDone=true;
      const last=sg[sg.length-1]; if(last&&last.i===i&&last.k==='c') last.strong=true; else if(!(Z.trendFilter&&er[i]<.3)) sg.push({i,v,strong:true,flip:false,k:'c'}); }
    if(expDir&&!exDone&&(expDir>0?c[i].high>=out.U[0][i]:c[i].low<=out.L[0][i])){ exDone=true; out.exits.push({i,d:expDir}); }
  }
  // contrarian signals: price re-enters from outside the inner reversal zone line
  for(let i=31;i<n;i++){
    if(cl[i-1]<out.L[0][i-1]&&cl[i]>=out.L[0][i]){ let lo=1e18; for(let j=Math.max(0,i-5);j<=i;j++) lo=Math.min(lo,c[j].low); sg.push({i,v:1,strong:lo<=out.L[1][i],flip:true,k:'x'}); }
    if(cl[i-1]>out.U[0][i-1]&&cl[i]<=out.U[0][i]){ let hi=-1e18; for(let j=Math.max(0,i-5);j<=i;j++) hi=Math.max(hi,c[j].high); sg.push({i,v:-1,strong:hi>=out.U[1][i],flip:true,k:'x'}); }
  }
  const md=Z.sigMode||'Confirmation', fl=Z.sigFilter||'All';
  sg.sort((a,b)=>a.i-b.i).forEach(s=>{
    if(md==='Confirmation'&&s.k!=='c') return; if(md==='Contrarian'&&s.k!=='x') return;
    if(fl==='Strong only'&&!s.strong) return; if(fl==='Normal only'&&!s.flip) return;
    out.sigs.push(s); if(!out.mapS.has(s.i)) out.mapS.set(s.i,s.v); });
  // dashboard
  const L=n-1, rank=(arr,v)=>{ const w=arr.slice(Math.max(0,arr.length-100)); return w.filter(x=>x<=v).length/w.length*100; };
  let best=sens, bestR=-1e18;
  for(let s=4;s<=24;s+=2){ const t=snoTrail(c,hl2,atr,s/4); let r=0, ent=cl[30], d0=t.dir[30];
    for(let i=31;i<n;i++){ if(t.dir[i]!==t.dir[i-1]){ r+=d0*(cl[i]/ent-1); ent=cl[i]; d0=t.dir[i]; } }
    r+=d0*(cl[L]/ent-1); if(r>bestR){ bestR=r; best=s; } }
  const bw=cl.map((_,i)=>{ if(i<20) return 0; let m=0; for(let j=i-19;j<=i;j++) m+=cl[j]; m/=20; let v=0; for(let j=i-19;j<=i;j++) v+=(cl[j]-m)*(cl[j]-m); return m>0?Math.sqrt(v/20)*4/m:0; });
  let uv=0,tv=0; for(let j=Math.max(0,L-19);j<=L;j++){ const v=c[j].volume||0; tv+=v; if(c[j].close>=c[j].open) uv+=v; }
  const volp=rank(atr.slice(0,n),atr[L]), sq=100-rank(bw.slice(20),bw[L]);
  out.dash={opt:best,trend:Math.round(er[L]*100),trending:er[L]>=.3,vol:Math.round(volp),volLbl:volp<33?'Low Volatility':volp<66?'Medium Volatility':'High Volatility',sq:Math.round(sq),vs:tv>0?Math.round(uv/tv*100):null,dir:T.dir[L]};
  return out;
}
try{ window.__snoCompute=snoCompute; }catch(e){}
const snoC={sig:{},draw:{}};
function snoGet(slot,c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,SNO_KEYS.map(k=>Z[k]).join(',')].join('|');
  const m=snoC[slot]; if(!m[Z.sid]||m[Z.sid].k!==key) m[Z.sid]={k:key,r:snoCompute(c,Z)}; return m[Z.sid].r; }
function snoDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<60) return; const r=snoGet('draw',c,Z), n=r.n, i0=Math.max(40,n-1500);
  const pos=Z.snoPos||'#16c05a', neg=Z.snoNeg||'#e5242d', neu=Z.snoNeu||'#8b5cf6', tx=Z.snoTxt||'#b2b5be';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  const band=(A,B,col,al)=>{ cx.globalAlpha=al; cx.fillStyle=col; let seg=[];
    const flush=()=>{ if(seg.length>1){ cx.beginPath(); seg.forEach((p,k)=>k?cx.lineTo(p.x,p.ya):cx.moveTo(p.x,p.ya)); for(let k=seg.length-1;k>=0;k--) cx.lineTo(seg[k].x,seg[k].yb); cx.closePath(); cx.fill(); } seg=[]; };
    for(let i=i0;i<n;i++){ const x=X(i), ya=Y(A[i]), yb=Y(B[i]); if(x==null||ya==null||yb==null||!isFinite(A[i])||!isFinite(B[i])){ flush(); continue; } seg.push({x,ya,yb}); } flush(); cx.globalAlpha=1; };
  // reversal zones (two shades above in red, two shades below in green)
  if(Z.rzOn!==false){ band(r.U[0],r.U[1],neg,.22); band(r.U[1],r.U[2],neg,.32); band(r.L[0],r.L[1],pos,.22); band(r.L[1],r.L[2],pos,.32); }
  // smart trail + band
  if(Z.trOn!==false){ const up=r.trail.map((v,i)=>v+r.tb[i]), dn=r.trail.map((v,i)=>v-r.tb[i]); band(up,dn,'#2962ff',.22);
    cx.strokeStyle='#2962ff'; cx.lineWidth=2; cx.beginPath(); let st=false;
    for(let i=i0;i<n;i++){ const x=X(i), y=Y(r.trail[i]); if(x==null||y==null){ st=false; continue; } if(!st){ cx.moveTo(x,y); st=true; } else cx.lineTo(x,y); } cx.stroke(); cx.lineWidth=1; }
  // candle coloring (green strong up / purple neutral / red strong down)
  if(Z.candOn!==false){ const sp=Math.abs((X(n-1)||0)-(X(n-2)||0)), bw=Math.max(1,sp*.72);
    for(let i=i0;i<n;i++){ const x=X(i), b=c[i], yo=Y(b.open), ycl=Y(b.close), yh=Y(b.high), yl=Y(b.low); if(x==null||yo==null||ycl==null||yh==null||yl==null) continue;
      const col=r.col[i]>0?pos:r.col[i]<0?neg:neu; cx.fillStyle=col; cx.strokeStyle=col; cx.beginPath(); cx.moveTo(x,yh); cx.lineTo(x,yl); cx.stroke();
      cx.fillRect(x-bw/2,Math.min(yo,ycl),bw,Math.max(1,Math.abs(ycl-yo))); } }
  // exits (blue x above for long exits, orange x below for short exits)
  if(Z.exOn!==false) r.exits.slice(-40).forEach(e=>{ const x=X(e.i), y=Y(e.d>0?c[e.i].high:c[e.i].low); if(x==null||y==null) return; const yy=y+(e.d>0?-12:12);
    cx.strokeStyle=e.d>0?'#2962ff':'#ff9800'; cx.lineWidth=2; cx.beginPath(); cx.moveTo(x-4,yy-4); cx.lineTo(x+4,yy+4); cx.moveTo(x+4,yy-4); cx.lineTo(x-4,yy+4); cx.stroke(); cx.lineWidth=1; });
  // signals: block arrows ("+" inside = strong)
  r.sigs.slice(-60).forEach(s=>{ const x=X(s.i); if(x==null) return; const up=s.v>0, y=Y(up?c[s.i].low:c[s.i].high); if(y==null) return;
    const w2=s.strong?9:6.5, h=s.strong?26:20, st=h*.5, base=y+(up?10:-10), tip=base+(up?h:-h)*0; const col=up?pos:neg;
    cx.fillStyle=col; cx.beginPath();
    if(up){ cx.moveTo(x,base); cx.lineTo(x+w2,base+h*.45); cx.lineTo(x+w2*.5,base+h*.45); cx.lineTo(x+w2*.5,base+h); cx.lineTo(x-w2*.5,base+h); cx.lineTo(x-w2*.5,base+h*.45); cx.lineTo(x-w2,base+h*.45); }
    else { const b2=y-10; cx.moveTo(x,b2); cx.lineTo(x+w2,b2-h*.45); cx.lineTo(x+w2*.5,b2-h*.45); cx.lineTo(x+w2*.5,b2-h); cx.lineTo(x-w2*.5,b2-h); cx.lineTo(x-w2*.5,b2-h*.45); cx.lineTo(x-w2,b2-h*.45); }
    cx.closePath(); cx.fill();
    if(s.strong){ cx.fillStyle='#fff'; cx.font='bold 11px system-ui'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText('+',x,up?base+h*.72:y-10-h*.72); } });
  // dashboard (right side)
  if(Z.dashOn!==false&&r.dash){ const D=r.dash, rows=[['Optimal Sensitivity',String(D.opt),tx],['Trend Strength',D.trend+'% '+(D.trending?'Trending':'Ranging'),D.trending?pos:tx],[D.volLbl,D.vol+'%',tx],['Squeeze',D.sq+'%',D.sq>=70?neu:tx],['Volume Sentiment',D.vs==null?'n/a':D.vs+'%',D.vs==null?tx:D.vs>=55?pos:D.vs<=45?neg:tx]];
    const bw=118, bh=34, bx=W-bw-62, by=Math.max(8,H*.5-rows.length*bh/2);
    rows.forEach((q,k)=>{ const y=by+k*(bh+3); cx.fillStyle='rgba(30,34,45,.92)'; cx.fillRect(bx,y,bw,bh); cx.strokeStyle='rgba(255,255,255,.1)'; cx.strokeRect(bx,y,bw,bh);
      cx.fillStyle=tx; cx.font='9px system-ui'; cx.textAlign='left'; cx.textBaseline='middle'; cx.fillText(q[0],bx+7,y+11); cx.fillStyle=q[2]; cx.font='bold 11px system-ui'; cx.fillText(q[1],bx+7,y+24); }); }
  cx.restore();
}
STRATS.sno={label:'Signals & Overlays \u00b7 Smart Trail, Reversal Zones, green / purple / red candles, Confirmation (normal + strong +) and Contrarian signals, exit x, dashboard',short:'Signals & Overlays',
  defs:{limit:false,useSl:false,sens:12,sigMode:'Confirmation',sigFilter:'All',trendFilter:false,thr:.4,rzLen:50,rz1:1.8,rz2:2.6,rz3:3.4,
    trOn:true,rzOn:true,candOn:true,exOn:true,dashOn:true,snoPos:'#16c05a',snoNeg:'#e5242d',snoNeu:'#8b5cf6',snoTxt:'#b2b5be'},
  inputs:(b,d)=>{
    fld(b,d,'sigMode','sel','Signal mode',{opts:['Confirmation','Contrarian','Both']}); fld(b,d,'sigFilter','sel','Trade on signals',{opts:['All','Strong only','Normal only']});
    fld(b,d,'sens','num','Sensitivity (dashboard shows the optimal one)',{min:2,max:50,step:1}); fld(b,d,'thr','num','Strong signal threshold',{min:.1,max:2,step:.05});
    fld(b,d,'trendFilter','chk','Trend strength filter (skip ranging markets)');
    fld(b,d,'trOn','chk','Smart Trail'); fld(b,d,'rzOn','chk','Reversal Zones'); fld(b,d,'rzLen','num','Reversal Zones length',{min:10,max:200,step:5});
    fld(b,d,'rz1','num','Zone 1 (x deviation)',{min:.5,max:6,step:.1}); fld(b,d,'rz2','num','Zone 2 (x deviation)',{min:.5,max:8,step:.1}); fld(b,d,'rz3','num','Zone 3 (x deviation)',{min:.5,max:10,step:.1});
    fld(b,d,'candOn','chk','Candle coloring'); fld(b,d,'exOn','chk','Exit x marks'); fld(b,d,'dashOn','chk','Dashboard');
    fld(b,d,'snoPos','col','Bullish color'); fld(b,d,'snoNeg','col','Bearish color'); fld(b,d,'snoNeu','col','Neutral candle color'); fld(b,d,'snoTxt','col','Text color'); },
  sig:(c,i,n,Z)=>{ if(c.length<60) return 0; return snoGet('sig',c,Z).mapS.get(i)||0; }};
try{ DESC.sno='Strategy \u00b7 LuxAlgo-style Smart Trail + Reversal Zones with confirmation / contrarian signals, candle coloring and dashboard'; }catch(e){}
{ const _snO=runOne; runOne=function(Z,quiet,out){ if(!Z||Z.k!=='sno') return _snO.apply(this,arguments); const tmp=[]; _snO.call(this,Z,quiet,tmp); tmp.forEach(x=>{ if(x.shape!=='arrowUp'&&x.shape!=='arrowDown') out.push(x); }); }; }
{ const _snD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='snoview') return snoDraw(d,X,Y,W,H); return _snD.apply(this,arguments); };
  const _snR=recomputeExtras; recomputeExtras=function(){ _snR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='sno'&&stVis(Z)) scriptBoxes.push({type:'snoview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('sno strategy failed',err); window.__snoErr=err; }
//# sourceURL=tools-6.js
