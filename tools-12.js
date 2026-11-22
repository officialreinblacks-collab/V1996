/* MarketPlusView tool code - tools-12.js
   Higher Timeframe Trend Frontier  (IND key: hfx)
   Loaded by index.html (fetched at start-up, evaluated inside start() like tools-3 ... tools-8).
   Guide page: Script2.html#hfx   (opened by the "Read script" button in the tool's settings).
   Everything is calculated from the candles already on the chart - no extra network calls. */
/*@@part 112*/
try{
/* ---------- defaults ---------- */
const HF_DEF={htf:'1h',front:true,upColor:'#00e676',dnColor:'#ff5252',
  speed:0.15,lateAccel:true,lateStart:70,lateFactor:3,lateCurve:1.5,
  showBoxes:true,bullColor:'#00e676',bearColor:'#ff5252',
  showPrices:true,hiLabCol:'#00c853',loLabCol:'#e53950',priceSize:'Small',
  showOpen:true,openMult:0.05,openCol:'#1e8eea',showLines:true,
  showTrap:true,trapRows:48,trapOffset:10,trapWidth:22,buyCol:'#4a549d',sellCol:'#1f8d89',trapSep:true,trapLabels:true,
  info:true};
const HF_ZONES=9, HF_HORIZON=3, HF_HALF=240, HF_KEEP=95;

/* ---------- helpers ---------- */
const hfSecOf=iv=>{ const m=/^(\d+)([mhdwM])$/.exec(String(iv||'')); return m?(+m[1])*({m:60,h:3600,d:86400,w:604800,M:2592000}[m[2]]):0; };
const hfPid=(t,sec,iv)=>/w$/.test(iv)?Math.floor((t+259200)/sec):Math.floor(t/sec);   // weeks start on Monday
const hfClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hfRgba=(c,a)=>{ c=String(c||'#888888'); let m=/^#?([0-9a-f]{6})$/i.exec(c); if(m){ const n=parseInt(m[1],16); return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'; }
  m=/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c); if(m) return 'rgba('+parseInt(m[1]+m[1],16)+','+parseInt(m[2]+m[2],16)+','+parseInt(m[3]+m[3],16)+','+a+')';
  m=/rgba?\(([^)]+)\)/i.exec(c); if(m){ const q=m[1].split(','); return 'rgba('+(+q[0])+','+(+q[1])+','+(+q[2])+','+a+')'; } return c; };
const hfFmt=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=1000?v.toFixed(2):Math.abs(v)>=100?v.toFixed(2):Math.abs(v)>=1?v.toFixed(4):v.toPrecision(5);
const hfLabPx={Tiny:8,Small:9,Normal:11,Large:13,Huge:16};

/* one candle's contribution to the trapped buyers / sellers rows (estimated from OHLCV, not real bid/ask) */
function hfTrapAdd(buy,sell,rows,low,step,span,last,green,o,h,l,c,act,age,mt){
  const cr=Math.max(h-l,mt), body=hfClamp((c-o)/cr,-1,1), cloc=hfClamp((2*c-h-l)/cr,-1,1);
  const bs=hfClamp(0.5+0.35*body+0.15*cloc,0.05,0.95), ss=1-bs;
  const uw=Math.max(0,h-Math.max(o,c))/cr, lw=Math.max(0,Math.min(o,c)-l)/cr;
  const br=0.70+1.30*uw, sr=0.70+1.30*lw, bReg=green?0.30:1.50, sReg=green?1.50:0.30;
  const fr=hfClamp(Math.floor((l-low)/step),0,rows-1), lr=hfClamp(Math.floor((h-low)/step),0,rows-1);
  for(let row=fr;row<=lr;row++){
    const bot=low+row*step, top=bot+step;
    const ov=h>l?Math.max(0,Math.min(h,top)-Math.max(l,bot))/(h-l):(c>=bot&&c<=top?1:0);
    if(ov>0){ const pr=(bot+top)/2, bl=Math.max(0,pr-last), sl=Math.max(0,last-pr);
      const bE=0.15+0.85*Math.min(1,bl/(span*0.25)), sE=0.15+0.85*Math.min(1,sl/(span*0.25)), base=act*ov*age;
      buy[row]+=base*bs*bReg*br*bE; sell[row]+=base*ss*sReg*sr*sE; } }
}

/* ---------- main calculation ---------- */
function hfCompute(c,p){
  const N=c.length, D={ok:false,N};
  if(N<5) return D;
  const csec=hfSecOf(tf[1]), hsec=hfSecOf(p.htf);
  if(!csec||!hsec||hsec<=csec){ D.err='Higher timeframe ('+p.htf+') must be greater than the chart timeframe ('+tf[1]+')'; return D; }
  const mt=Math.pow(10,Math.floor(Math.log10(Math.max(1e-9,c[N-1].close)))-4);
  // 1) group the chart candles into higher-timeframe periods
  const per=[], pidx=new Int32Array(N); let lastPid=null;
  for(let i=0;i<N;i++){ const id=hfPid(c[i].time,hsec,p.htf);
    if(id!==lastPid){ per.push({id,s:i,e:i,o:c[i].open,h:c[i].high,l:c[i].low,hB:i,lB:i,c:c[i].close,start:(/w$/.test(p.htf)?id*hsec-259200:id*hsec)}); lastPid=id; }
    else { const q=per[per.length-1]; q.e=i; q.c=c[i].close; if(c[i].high>q.h){ q.h=c[i].high; q.hB=i; } if(c[i].low<q.l){ q.l=c[i].low; q.lB=i; } }
    pidx[i]=per.length-1; }
  per[0].partial=c[0].time>per[0].start+csec;           // first period started before the loaded history: not usable
  per.forEach((q,k)=>{ q.valid=!(k===0&&q.partial); q.green=q.c>=q.o; });
  // 2) higher-timeframe ATR(14) of the previous period (Wilder; uses fewer periods if less history is loaded)
  { let prev=null, rma=null, cnt=0, sum=0;
    per.forEach((q,k)=>{ q.atrPrev=(k>0&&per[k-1].atrVal!=null)?per[k-1].atrVal:null;
      if(!q.valid){ q.atrVal=null; return; }
      const tr=prev==null?q.h-q.l:Math.max(q.h-q.l,Math.abs(q.h-prev),Math.abs(q.l-prev)); prev=q.c; cnt++;
      if(cnt<=14){ sum+=tr; rma=sum/cnt; } else rma=(rma*13+tr)/14; q.atrVal=rma; }); }
  // 3) chart ATR(14)
  const atr=new Float64Array(N); { let s=0, r=null;
    for(let i=0;i<N;i++){ const tr=i?Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)):c[i].high-c[i].low;
      if(i<14){ s+=tr; if(i===13) r=s/14; } else r=(r*13+tr)/14;
      atr[i]=Math.max(r!=null?r:c[i].high-c[i].low,mt); } }
  // 4) echo memory + frontier, bar by bar
  const fr=new Float64Array(N).fill(NaN), up=new Uint8Array(N), op=new Float64Array(N), newP=new Uint8Array(N), zone=new Int32Array(N).fill(-1);
  const eUp=new Float64Array(HF_ZONES), eDn=new Float64Array(HF_ZONES), eVis=new Float64Array(HF_ZONES), decay=Math.pow(0.5,1/HF_HALF);
  const expBars=Math.max(1,hsec/csec), startFrac=p.lateStart/100; let frontier=NaN, age=0, bias=0, eN=0, prevF=NaN, lastPrg=0, lastSpd=1;
  const i0=per[0].valid?0:per[0].e+1;
  for(let i=0;i<N;i++){
    const k=pidx[i], q=per[k], ref=k>0&&per[k-1].valid?per[k-1]:null, ci=c[i];
    if(ref){ const span=Math.max(ref.h-ref.l,mt*10), bot=ref.l-span*0.25, w=span*1.5/HF_ZONES; zone[i]=hfClamp(Math.floor((ci.close-bot)/w),0,HF_ZONES-1); }
    if(i<i0) continue;
    for(let z=0;z<HF_ZONES;z++){ eUp[z]*=decay; eDn[z]*=decay; eVis[z]*=decay; }
    const oz=i>=HF_HORIZON?zone[i-HF_HORIZON]:-1;
    if(oz>=0){ const resp=hfClamp((ci.close-c[i-HF_HORIZON].close)/atr[i-HF_HORIZON],-2,2); eUp[oz]+=Math.max(resp,0); eDn[oz]+=Math.max(-resp,0); eVis[oz]+=1; }
    if(zone[i]>=0){ const cz=zone[i], a=Math.max(0,cz-1), b=Math.min(HF_ZONES-1,cz+1), sc=z=>(eUp[z]-eDn[z])/(2+eUp[z]+eDn[z]);
      bias=0.6*sc(cz)+0.2*sc(a)+0.2*sc(b); eN=0.6*eVis[cz]+0.2*eVis[a]+0.2*eVis[b]; } else { bias=0; eN=0; }
    const isNew=(i===0)||k!==pidx[i-1]||i===i0;
    const prg=hfClamp((ci.time+csec-q.start)/hsec,0,1), late=hfClamp((prg-startFrac)/(1-startFrac),0,1);
    const spd=p.lateAccel?1+(p.lateFactor-1)*Math.pow(late,p.lateCurve):1; lastPrg=prg; lastSpd=spd;
    if(isNew){ age=0; frontier=q.o; newP[i]=1; }
    else { age++;
      const r=Math.min(1,eN/4), qq=hfClamp(0.5+0.3*bias*r,0.15,0.85), gap=ci.close-frontier, vel=atr[i]*p.speed*(gap>=0?qq:1-qq)*spd;
      frontier+=Math.sign(gap)*Math.min(Math.abs(gap),vel); }
    fr[i]=isNew?NaN:frontier; up[i]=(isNaN(prevF)||frontier>=prevF)?1:0; op[i]=Math.floor(Math.min(88,age/expBars*88)); prevF=frontier; }
  D.per=per; D.pidx=pidx; D.fr=fr; D.up=up; D.op=op; D.newP=newP; D.csec=csec; D.hsec=hsec; D.progress=lastPrg; D.speed=lastSpd; D.i0=i0; D.mt=mt;
  // 5) two-sided trapped buyers / sellers profile: newest three higher-timeframe periods incl. the developing one
  D.trap=null;
  const cur=per.length-1;
  if(p.showTrap&&cur>=2&&per[cur-2].valid){
    const rows=Math.max(12,Math.min(60,Math.round(p.trapRows))), q2=per[cur-2], q1=per[cur-1], q0=per[cur];
    const hi=Math.max(q2.h,q1.h,q0.h), lo=Math.min(q2.l,q1.l,q0.l), span=Math.max(hi-lo,mt*rows), step=span/rows, last=c[N-1].close;
    const buy=new Float64Array(rows), sell=new Float64Array(rows); let vs=0; for(let i=q2.s;i<N;i++) vs+=Math.max(0,c[i].volume||0);
    for(let i=q2.s;i<N;i++){ const k=pidx[i], ps=per[k], rec=k===cur?1:k===cur-1?0.85:0.70, ci=c[i];
      hfTrapAdd(buy,sell,rows,lo,step,span,last,ps.green,ci.open,ci.high,ci.low,ci.close,vs>0?Math.max(0,ci.volume||0):1,rec,mt); }
    let bp=0,sp=0,br=0,sr=0; for(let r=0;r<rows;r++){ if(buy[r]>bp){ bp=buy[r]; br=r; } if(sell[r]>sp){ sp=sell[r]; sr=r; } }
    D.trap={rows,lo,hi,step,buy,sell,bp,sp,br,sr,vol:vs>0}; }
  D.ok=true; return D;
}
let hfMem=null;
function hfGet(c,p){ const N=c.length, l=N?c[N-1]:null, key=JSON.stringify(p)+'|'+tf[1]+'|'+sym[0]+'|'+N+'|'+(N?c[0].time+'|'+l.time+'|'+l.close+'|'+l.high+'|'+l.low+'|'+l.volume:'');
  if(hfMem&&hfMem.k===key) return hfMem.D;
  let D; try{ D=hfCompute(c,p); }catch(e){ console.error('hfx calc failed',e); D={ok:false,N,err:'Higher Timeframe Trend Frontier could not be calculated'}; }
  hfMem={k:key,D}; return D; }

/* ---------- registration ---------- */
IND.hfx={label:'Higher Timeframe Trend Frontier',cat:'Trend',nm:p=>'HTF Trend Frontier '+String((p&&p.htf)||'').toUpperCase(),p:Object.assign({},HF_DEF),cols:['#1f6feb'],
  fields:[['htf','sel','Higher timeframe (must be above chart timeframe)',{opts:['5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','1w']}],
    ['front','chk','Show Echo Frontier line'],['upColor','col','Frontier up'],['dnColor','col','Frontier down'],
    ['speed','num','Frontier speed (chart ATR)',{min:0.01,max:1.5,step:0.01}],
    ['lateAccel','chk','Late-HTF acceleration'],['lateStart','num','Start after HTF progress (%)',{min:10,max:95,step:5}],['lateFactor','num','Final speed multiplier',{min:1,max:10,step:0.25}],['lateCurve','num','Acceleration curve',{min:0.5,max:4,step:0.25}],
    ['showBoxes','chk','Coloured HTF boxes'],['bullColor','col','Bullish box'],['bearColor','col','Bearish box'],
    ['showPrices','chk','High / low price labels'],['hiLabCol','col','High label'],['loLabCol','col','Low label'],['priceSize','sel','Label size',{opts:['Tiny','Small','Normal','Large','Huge']}],
    ['showOpen','chk','HTF ATR opening zone'],['openMult','num','Opening zone width (x previous HTF ATR)',{min:0.01,max:1,step:0.01}],['openCol','col','Opening zone colour'],
    ['showLines','chk','Vertical dividers at new HTF periods'],
    ['showTrap','chk','Trapped buyers / sellers profile'],['trapRows','num','Price rows',{min:12,max:60,step:1}],['trapOffset','num','Offset (bars)',{min:1,max:120,step:1}],['trapWidth','num','Side width (bars)',{min:5,max:80,step:1}],
    ['buyCol','col','Trapped buyers colour'],['sellCol','col','Trapped sellers colour'],['trapSep','chk','Normalise each side'],['trapLabels','chk','Show trap labels'],
    ['info','chk','Show status text (HTF progress / speed)']],
  calc:(c,p)=>[[]],
  extras:(c,p)=>({mk:[],boxes:[{type:'hfxview',pts:[],o:p}],labels:[]})};

/* ---------- drawing ---------- */
const hfSet=new WeakSet();
function hfxDraw(d,X,Y,W,H){
  const p=Object.assign({},HF_DEF,d.o), n=candles.length; if(n<5) return;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  try{
    const D=hfGet(candles,p);
    if(!D.ok){ cx.font='bold 10px system-ui'; cx.textAlign='left'; cx.fillStyle='#ff9800'; cx.fillText(D.err||'Loading...',8,H*0.06); return; }
    let a=0,b=n-1; try{ const r=chart.timeScale().getVisibleLogicalRange(); if(r){ a=Math.max(0,Math.floor(r.from)-2); b=Math.min(n-1,Math.ceil(r.to)+2); } }catch(e){}
    const per=D.per, pa=D.pidx[a], pb=D.pidx[b], first=Math.max(pa,per.length-HF_KEEP), fg='rgba(205,215,230,';
    // opening zones + dotted mid line
    if(p.showOpen) for(let k=first;k<=pb;k++){ const q=per[k]; if(!q.valid||q.atrPrev==null) continue; const band=q.atrPrev*p.openMult, x0=X(q.s), x1=X(q.e), yt=Y(q.o+band), yb=Y(q.o-band), ym=Y(q.o); if(x0==null||x1==null||yt==null||yb==null) continue;
      cx.fillStyle=hfRgba(p.openCol,0.17); cx.fillRect(x0,yt,Math.max(1,x1-x0),Math.max(1,yb-yt)); cx.strokeStyle=hfRgba(p.openCol,0.55); cx.lineWidth=1; cx.strokeRect(x0,yt,Math.max(1,x1-x0),Math.max(1,yb-yt));
      cx.strokeStyle=hfRgba(p.openCol,0.9); cx.setLineDash([1,3]); cx.beginPath(); cx.moveTo(x0,ym); cx.lineTo(x1,ym); cx.stroke(); cx.setLineDash([]); }
    // coloured HTF range boxes
    if(p.showBoxes) for(let k=first;k<=pb;k++){ const q=per[k]; if(!q.valid) continue; const x0=X(q.s), x1=X(q.e), yt=Y(q.h), yb=Y(q.l); if(x0==null||x1==null||yt==null||yb==null) continue; const col=q.green?p.bullColor:p.bearColor;
      cx.fillStyle=hfRgba(col,0.10); cx.fillRect(x0,yt,Math.max(1,x1-x0),Math.max(1,yb-yt)); cx.strokeStyle=hfRgba(col,0.48); cx.lineWidth=1; cx.strokeRect(x0,yt,Math.max(1,x1-x0),Math.max(1,yb-yt)); }
    // vertical dividers
    if(p.showLines){ cx.strokeStyle=fg+'.35)'; cx.lineWidth=1; cx.setLineDash([1,3]); for(let k=Math.max(1,first);k<=pb;k++){ const x=X(per[k].s); if(x==null) continue; cx.beginPath(); cx.moveTo(x,0); cx.lineTo(x,H); cx.stroke(); } cx.setLineDash([]); }
    // Echo Frontier: wide fading underlay, then thin line, then period dots
    if(p.front){ const seg=(w,fade)=>{ cx.lineWidth=w; cx.lineCap='round'; for(let j=Math.max(1,a);j<=b;j++){ if(isNaN(D.fr[j])||isNaN(D.fr[j-1])) continue; const x0=X(j-1), x1=X(j), y0=Y(D.fr[j-1]), y1=Y(D.fr[j]); if(x0==null||x1==null||y0==null||y1==null) continue;
          cx.strokeStyle=hfRgba(D.up[j]?p.upColor:p.dnColor,fade?Math.max(0.05,1-D.op[j]/100):1); cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y1); cx.stroke(); } cx.lineCap='butt'; };
      seg(5,true); seg(1.5,false);
      cx.fillStyle=fg+'.75)'; for(let j=Math.max(1,a);j<=b;j++){ if(!D.newP[j-1]||isNaN(D.fr[j])) continue; const x=X(j), y=Y(D.fr[j]); if(x==null||y==null) continue; cx.beginPath(); cx.arc(x,y,2.5,0,6.2832); cx.fill(); } }
    // high / low price labels
    if(p.showPrices){ const sz=hfLabPx[p.priceSize]||9;
      const lab=(txt,x,y,col,down)=>{ if(x==null||y==null) return; cx.font='bold '+sz+'px system-ui'; const w=cx.measureText(txt).width+10, h=sz+7, g=5, bx=Math.max(2,Math.min(W-w-2,x-w/2)), by=down?y-g-h:y+g;
        cx.fillStyle=col; cx.beginPath(); cx.rect(bx,by,w,h); cx.fill(); cx.beginPath(); if(down){ cx.moveTo(x-4,by+h); cx.lineTo(x+4,by+h); cx.lineTo(x,y); } else { cx.moveTo(x-4,by); cx.lineTo(x+4,by); cx.lineTo(x,y); } cx.closePath(); cx.fill();
        cx.fillStyle='#ffffff'; cx.textAlign='center'; cx.fillText(txt,bx+w/2,by+h/2+0.5); };
      for(let k=first;k<=pb;k++){ const q=per[k]; if(!q.valid) continue; lab(hfFmt(q.h),X(q.hB),Y(q.h),p.hiLabCol,true); lab(hfFmt(q.l),X(q.lB),Y(q.l),p.loLabCol,false); } }
    // trapped buyers (left) / trapped sellers (right)
    const T=D.trap;
    if(T){ const rows=T.rows, tw=Math.max(5,Math.min(80,Math.round(p.trapWidth))), to=Math.max(1,Math.min(120,Math.round(p.trapOffset))), xc=n-1+to+tw, xl=xc-tw, xr=xc+tw;
      if(!hfSet.has(d.o)){ hfSet.add(d.o); try{ const ts=chart.timeScale(), need=to+2*tw+4; if((ts.options().rightOffset||0)<need) ts.applyOptions({rightOffset:need}); }catch(e){} }
      const bScale=p.trapSep?T.bp:Math.max(T.bp,T.sp), sScale=p.trapSep?T.sp:Math.max(T.bp,T.sp), xC=X(xc);
      if(xC!=null){ for(let r=0;r<rows;r++){ const yt=Y(T.lo+(r+1)*T.step), yb=Y(T.lo+r*T.step); if(yt==null||yb==null) continue;
          const bR=bScale>0?T.buy[r]/bScale:0, sR=sScale>0?T.sell[r]/sScale:0, bw=T.buy[r]>0?Math.max(1,Math.round(tw*bR)):1, sw=T.sell[r]>0?Math.max(1,Math.round(tw*sR)):1,
            bA=T.buy[r]>0?(72-57*bR):96, sA=T.sell[r]>0?(72-57*sR):96, xb=X(xc-bw), xs=X(xc+sw), h=Math.max(1,yb-yt); if(xb==null||xs==null) continue;
          cx.fillStyle=hfRgba(p.buyCol,1-Math.floor(bA)/100); cx.fillRect(xb,yt,xC-xb,h); cx.fillStyle=hfRgba(p.sellCol,1-Math.floor(sA)/100); cx.fillRect(xC,yt,xs-xC,h); }
        const peak=(row,has,col)=>{ if(!has) return; const x0=X(xl), x1=X(xr), yt=Y(T.lo+(row+1)*T.step), yb=Y(T.lo+row*T.step); if(x0==null||x1==null||yt==null||yb==null) return; cx.strokeStyle=col; cx.lineWidth=2; cx.strokeRect(x0,yt,x1-x0,Math.max(1,yb-yt)); };
        peak(T.br,T.bp>0,'rgb(29,151,255)'); peak(T.sr,T.sp>0,'rgb(255,145,27)');
        if(p.trapLabels){ const yy=Y(T.hi+T.step), xa=X(xc-Math.round(tw*0.5)), xb2=X(xc+Math.round(tw*0.5)); cx.font='bold 9px system-ui'; cx.textAlign='center';
          if(yy!=null&&xa!=null){ cx.fillStyle=p.buyCol; cx.fillText('TRAPPED BUYERS',xa,yy); } if(yy!=null&&xb2!=null){ cx.fillStyle=p.sellCol; cx.fillText('TRAPPED SELLERS',xb2,yy); } } } }
    // small status text
    if(p.info){ cx.font='9px system-ui'; cx.textAlign='left'; cx.fillStyle='rgba(120,170,255,.95)'; cx.fillText('HTF '+p.htf.toUpperCase()+'  |  progress '+Math.round(D.progress*100)+'%  |  speed x'+D.speed.toFixed(2)+(T&&!T.vol?'  |  no volume: profile uses equal weight':''),8,H*0.04+4); }
  }finally{ cx.restore(); }
}
{ const _D=draw; draw=function(d,X,Y,W,H){ if(!d||d.type!=='hfxview') return _D.apply(this,arguments); hfxDraw(d,X,Y,W,H); }; }
}catch(err){ console.error('hfx (tools-12.js) failed',err); window.__hfxErr=err; }
