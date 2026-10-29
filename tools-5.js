/* tools-5.js — MarketPlusView tool code. index.html loads this file and runs it inside start() at the spot where this code used to be (same order, same scope).
   Keep the file name. Tools in this file: STRATS.rvp, STRATS.czt, STRATS.bkc, IND.wt, IND.lsv, IND.lqh, STRATS.ibauc, STRATS.ssm, STRATS.sbk, STRATS.po3, STRATS.sae */
try{
const RVP_KEYS=['rvpL','rvpR','rvpLb','rvpMem','rvpRad','rvpBins','rvpK','rvpIt','rvpAtr','rvpAtrM','rvpBroken','rvpMaxLn','rvpLn'];
function rvpCompute(all,Z){
  const Lb=Math.max(50,Math.round(Z.rvpLb)||600), off=Math.max(0,all.length-(Lb+600)), c=off?all.slice(off):all, n=c.length, L=Math.max(1,Math.round(Z.rvpL)||5), R=Math.max(1,Math.round(Z.rvpR)||5), mem=Math.max(20,Math.round(Z.rvpMem)||240);
  if(n<L+R+20) return null;
  const AL=Math.max(1,Math.round(Z.rvpAtr)||14), atr=new Float64Array(n).fill(NaN); { let s=0,rma=NaN; for(let t=0;t<n;t++){ const pc=t?c[t-1].close:c[t].close, tr=t?Math.max(c[t].high-c[t].low,Math.abs(c[t].high-pc),Math.abs(c[t].low-pc)):c[t].high-c[t].low;
      if(t<AL){ s+=tr; if(t===AL-1){ rma=s/AL; atr[t]=rma; } } else { rma=(rma*(AL-1)+tr)/AL; atr[t]=rma; } } }
  const pivots=[], lines=[]; const maxLn=Math.max(10,Math.round(Z.rvpMaxLn)||120);
  for(let t=0;t<n;t++){ const p=t-R; let ph=NaN,pl=NaN;
    if(p-L>=0){ const vh=c[p].high, vl=c[p].low; let a=true,b=true;
      for(let m=1;m<=L&&(a||b);m++){ if(!(vh>c[p-m].high)) a=false; if(!(vl<c[p-m].low)) b=false; }
      for(let m=1;m<=R&&(a||b);m++){ if(!(vh>=c[p+m].high)) a=false; if(!(vl<=c[p+m].low)) b=false; }
      if(a) ph=vh; if(b) pl=vl; }
    if(!isNaN(ph)) pivots.unshift({price:ph,bar:t-R,isHigh:true}); if(!isNaN(pl)) pivots.unshift({price:pl,bar:t-R,isHigh:false});
    while(pivots.length>0){ const o=pivots[pivots.length-1]; if(pivots.length>mem||t-o.bar>Lb) pivots.pop(); else break; }
    const thr=isNaN(atr[t])?0:atr[t]*Z.rvpAtrM;
    if(Z.rvpLn){
      const ovl=px=>lines.some(q=>!q.broken&&Math.abs(q.level-px)<=thr);
      if(!isNaN(ph)&&!ovl(ph)) lines.push({level:ph,sup:false,start:t-R,end:null,broken:false});
      if(!isNaN(pl)&&!ovl(pl)) lines.push({level:pl,sup:true,start:t-R,end:null,broken:false});
      for(let i=lines.length-1;i>=0;i--){ const q=lines[i];
        if(t-q.start>Lb){ lines.splice(i,1); continue; }
        if(!q.broken){ const up=!q.sup&&c[t].close>q.level, dn=q.sup&&c[t].close<q.level;
          if(up||dn){ if(Z.rvpBroken){ q.broken=true; q.end=t; } else lines.splice(i,1); } } }
      while(lines.length>maxLn) lines.shift(); } }
  if(!pivots.length) return {off,n,pivots,lines,prof:null};
  // ---- profile over the lookback window
  const wb=Math.min(Lb,n-1); let hi=-Infinity,lo=Infinity; for(let i=n-1-wb;i<=n-1;i++){ if(c[i].high>hi) hi=c[i].high; if(c[i].low<lo) lo=c[i].low; }
  const bins=Math.max(20,Math.round(Z.rvpBins)||140), range=Math.max(hi-lo,1e-9), bs=range/bins, K=Math.max(1,Math.min(Math.round(Z.rvpK)||5,pivots.length));
  // k-means on pivot prices
  const np=pivots.length, lab=new Array(np).fill(0), cen=new Array(K).fill(0); let mn=Infinity,mx=-Infinity; pivots.forEach(q=>{ if(q.price<mn) mn=q.price; if(q.price>mx) mx=q.price; });
  const step=K>1?(mx-mn)/(K-1):0; for(let k=0;k<K;k++) cen[k]=K===1?(mn+mx)/2:mn+step*k;
  for(let it=0;it<(Math.round(Z.rvpIt)||25);it++){ for(let i=0;i<np;i++){ let bi=0,bd=1e10; for(let k=0;k<K;k++){ const d=Math.abs(pivots[i].price-cen[k]); if(d<bd){ bd=d; bi=k; } } lab[i]=bi; }
    const sm=new Array(K).fill(0), ct=new Array(K).fill(0); for(let i=0;i<np;i++){ sm[lab[i]]+=pivots[i].price; ct[lab[i]]++; } for(let k=0;k<K;k++) if(ct[k]>0) cen[k]=sm[k]/ct[k]; }
  const sorted=cen.slice().sort((a,b)=>a-b), map=new Array(K).fill(0), used=new Array(K).fill(false);
  for(let k=0;k<K;k++){ let br=0,bd=1e10; for(let q=0;q<K;q++){ if(!used[q]){ const d=Math.abs(cen[k]-sorted[q]); if(d<bd){ bd=d; br=q; } } } used[br]=true; map[k]=br; }
  for(let i=0;i<np;i++) lab[i]=map[lab[i]];
  const cnt=new Array(bins).fill(0), hc=new Array(bins).fill(0), lc=new Array(bins).fill(0), cb=new Array(bins*K).fill(0), rad=Math.max(0,Math.round(Z.rvpRad));
  if(hi>lo){ for(let i=0;i<np;i++){ const q=pivots[i]; if(!(n-1-q.bar<=Lb&&q.price>=lo&&q.price<=hi)) continue;
      let bi=Math.floor((q.price-lo)/bs); bi=Math.max(0,Math.min(bins-1,bi)); const cid=lab[i]; for(let j=Math.max(0,bi-rad);j<=Math.min(bins-1,bi+rad);j++){ cnt[j]++; if(q.isHigh) hc[j]++; else lc[j]++; cb[j*K+cid]++; } } }
  let mc=0,pi=0; for(let i=0;i<bins;i++) if(cnt[i]>mc){ mc=cnt[i]; pi=i; }
  const dom=new Array(bins).fill(0); for(let i=0;i<bins;i++){ let bd=0,bk=0; for(let k=0;k<K;k++){ if(cb[i*K+k]>bd){ bd=cb[i*K+k]; bk=k; } } dom[i]=bk; }
  return {off,n,pivots,lines,prof:{hi,lo,bs,bins,K,cen:sorted,lab,cnt,hc,lc,dom,mc,pi,pocPrice:lo+pi*bs+bs*.5}};
}
const rvpCache={};
function rvpGet(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close].concat(RVP_KEYS.map(k=>Z[k])).join('|');
  if(!rvpCache[Z.sid]||rvpCache[Z.sid].k!==key) rvpCache[Z.sid]={k:key,r:rvpCompute(c,Z)}; return rvpCache[Z.sid].r; }
const rvpRgba=(h,a)=>{ const v=parseInt(String(h||'#000000').replace('#',''),16)||0; return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+Math.max(0,Math.min(1,a)).toFixed(3)+')'; };
const rvpP=v=>{ const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=1000?2:a>=1?4:6}); };
function rvpDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<60) return; const r=rvpGet(c,Z); if(!r) return;
  const off=r.off, n=r.n, last=n-1+off, Lb=Math.max(50,Math.round(Z.rvpLb)||600), P=r.prof, pal=[Z.rvpC1,Z.rvpC2,Z.rvpC3,Z.rvpC4,Z.rvpC5,Z.rvpC6,Z.rvpC7,Z.rvpC8].map((v,i)=>v||['#fdd835','#2962ff','#ff9800','#f23645','#089981','#26a69a','#ef5350','#787b86'][i]), pc=id=>pal[id%8];
  const supC=Z.rvpSup||'#00ffbb', resC=Z.rvpRes||'#ff1100', fg='#d1d4dc';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  const xr=X(last); if(xr==null){ cx.restore(); return; }
  const pill=(txt,x,y,col,bg,al)=>{ cx.font='9px system-ui'; cx.textBaseline='middle'; cx.textAlign='left'; const w=cx.measureText(txt).width+6, lx=Math.max(2,Math.min(x,W-w-2)); cx.globalAlpha=al==null?.85:al; cx.fillStyle=bg||'#0b0f1a'; cx.fillRect(lx,y-6,w,12); cx.globalAlpha=1; cx.fillStyle=col; cx.fillText(txt,lx+3,y); };
  // ---- pivot lines (broken ones faint + dotted)
  if(Z.rvpLn){ r.lines.forEach(q=>{ const x0=X(q.start+off), x1=q.broken?X(q.end+off):xr, y=Y(q.level); if(x0==null||x1==null||y==null) return;
      cx.strokeStyle=q.broken?rvpRgba(fg,.18):(q.sup?supC:resC); cx.lineWidth=1; cx.setLineDash(q.broken?[1.5,3]:[]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]); }); }
  if(P){ const prof=P, profEnd=last+Math.min(Math.round(Z.rvpOff)+Math.round(Z.rvpW),500), aw=Math.max(1,profEnd-(last+Math.round(Z.rvpOff))), lw=Math.max(0,last-Lb), xe=X(profEnd), xl=X(lw);
    // ---- cluster centroid lines + POC line
    if(Z.rvpShow&&Z.rvpCl&&xe!=null&&xl!=null){ prof.cen.forEach((v,k)=>{ if(v<prof.lo||v>prof.hi) return; const y=Y(v); if(y==null) return; cx.strokeStyle=rvpRgba(pc(k),.55); cx.lineWidth=1; cx.setLineDash([5,4]); cx.beginPath(); cx.moveTo(xl,y); cx.lineTo(xe,y); cx.stroke(); }); cx.setLineDash([]); }
    // ---- probability profile
    let pocCol=pc(0); { let bd=0; for(let k=0;k<prof.K;k++){ /* cluster with most hits inside the POC bin */ const v=prof.dom[prof.pi]; pocCol=pc(v); } }
    if(Z.rvpShow&&Z.rvpPoc&&prof.mc>0&&xe!=null&&xl!=null){ const y=Y(prof.pocPrice); if(y!=null){ cx.strokeStyle=pocCol; cx.lineWidth=2; cx.beginPath(); cx.moveTo(xl,y); cx.lineTo(xe,y); cx.stroke(); } }
    if(Z.rvpShow&&xe!=null){ for(let i=0;i<prof.bins;i++){ const cnt=prof.cnt[i]; if(!(cnt>0&&prof.mc>0)) continue; const bb=prof.lo+i*prof.bs, bt=bb+prof.bs, pr=cnt/prof.mc, bw=Math.max(1,Math.round(pr*aw)), xb=X(profEnd-bw), y0=Y(bt), y1=Y(bb); if(xb==null||y0==null||y1==null) continue;
        const isP=i===prof.pi, col=pc(prof.dom[i]), bt2=isP?Z.rvpPocT:Z.rvpRegT, brT=isP?Z.rvpPocT:Math.max(0,Z.rvpRegT-35), h=Math.max(1,Math.abs(y1-y0)), top=Math.min(y0,y1);
        cx.fillStyle=rvpRgba(col,(100-bt2)/100); cx.fillRect(xb,top,xe-xb,h); cx.strokeStyle=rvpRgba(col,(100-brT)/100); cx.lineWidth=1; cx.strokeRect(xb+.5,top+.5,xe-xb-1,Math.max(0,h-1));
        if(Z.rvpTxt&&h>=8){ cx.font='8px system-ui'; cx.fillStyle=fg; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(Z.rvpTxtMode==='Count'?String(cnt):(pr*100).toFixed(0)+'%',(xb+xe)/2,top+h/2); } } }
    // ---- level labels on active lines: reversal probability = profile density at the line's price
    if(Z.rvpLn&&Z.rvpLLbl!=='None'){ r.lines.forEach(q=>{ if(q.broken) return; const y=Y(q.level); if(y==null) return; let bi=Math.floor((q.level-prof.lo)/prof.bs); bi=Math.max(0,Math.min(prof.bins-1,bi));
        const cnt=(q.level>=prof.lo&&q.level<=prof.hi)?prof.cnt[bi]:0, pr=prof.mc>0?Math.round(cnt/prof.mc*100):0, col=q.sup?supC:resC;
        pill(Z.rvpLLbl==='Full'?rvpP(q.level)+' ('+pr+'% Reversal Probability)':rvpP(q.level)+' \u00b7 '+pr+'%',xr+4,y,col,rvpRgba(col,.2),1); }); }
    // ---- pivot dots
    if(Z.rvpDots){ const rd={Tiny:1.5,Small:2.5,Normal:3.5,Large:5,Huge:7}[Z.rvpDotSz]||2.5, lim=Math.min(Math.round(Z.rvpMaxDots)||260,r.pivots.length);
      for(let i=0;i<lim;i++){ const q=r.pivots[i]; if(n-1-q.bar>Lb) continue; const x=X(q.bar+off), y=Y(q.price); if(x==null||y==null) continue; cx.fillStyle=rvpRgba(pc(prof.lab[i]||0),(100-Z.rvpDotT)/100); cx.beginPath(); cx.arc(x,y,rd,0,6.2832); cx.fill(); } }
    // ---- profile labels
    if(Z.rvpShow&&Z.rvpPLbl&&xe!=null){ const yt=Y(prof.hi), yb=Y(prof.lo), yp=Y(prof.pocPrice); cx.font='10px system-ui'; cx.textBaseline='middle'; cx.textAlign='center';
      if(yt!=null){ cx.fillStyle=fg; cx.fillText('Reversal Probability',xe-aw/2,yt-20); cx.fillText(rvpP(prof.hi),xe-aw/2,yt-8); } if(yb!=null){ cx.fillStyle=fg; cx.fillText(rvpP(prof.lo),xe-aw/2,yb+9); }
      if(yp!=null){ cx.textAlign='left'; cx.fillStyle=pocCol; cx.fillText('Max Reversal Zone',xe+4,yp-6); cx.fillText('Pivots: '+prof.mc,xe+4,yp+6); } } }
  cx.globalAlpha=1; cx.restore();
}
STRATS.rvp={label:'Reversal Probability Profile \u00b7 clustered pivot probability profile with reversal-probability support / resistance lines',short:'Reversal Probability Profile',own:true,
  defs:{limit:false,useSl:false,rvpL:5,rvpR:5,rvpLb:600,rvpMem:240,rvpRad:3,rvpBins:140,rvpK:5,rvpIt:25,rvpAtr:14,rvpAtrM:2,
    rvpShow:true,rvpW:70,rvpOff:90,rvpRegT:75,rvpPocT:0,rvpTxt:false,rvpTxtMode:'Probability',rvpPLbl:true,rvpPoc:true,rvpCl:true,rvpLn:true,rvpLLbl:'Compact',rvpBroken:true,rvpMaxLn:120,rvpDots:true,rvpMaxDots:260,rvpDotSz:'Small',rvpDotT:30,
    rvpSup:'#00ffbb',rvpRes:'#ff1100',rvpC1:'#fdd835',rvpC2:'#2962ff',rvpC3:'#ff9800',rvpC4:'#f23645',rvpC5:'#089981',rvpC6:'#26a69a',rvpC7:'#ef5350',rvpC8:'#787b86'},
  inputs:(b,d)=>{
    fld(b,d,'rvpL','num','Pivot left bars',{min:1,max:50,step:1}); fld(b,d,'rvpR','num','Pivot right bars',{min:1,max:50,step:1}); fld(b,d,'rvpLb','num','Calculation lookback (bars)',{min:50,max:5000,step:50}); fld(b,d,'rvpMem','num','Pivot memory',{min:20,max:400,step:10});
    fld(b,d,'rvpRad','num','Bin smoothing radius',{min:0,max:20,step:1}); fld(b,d,'rvpBins','num','Profile resolution (bins)',{min:20,max:220,step:10}); fld(b,d,'rvpK','num','Profile clusters',{min:2,max:8,step:1}); fld(b,d,'rvpIt','num','Cluster iterations',{min:5,max:50,step:1});
    fld(b,d,'rvpAtr','num','ATR length',{min:1,max:200,step:1}); fld(b,d,'rvpAtrM','num','ATR overlap multiplier',{min:0,max:20,step:.1});
    fld(b,d,'rvpShow','chk','Show profile'); fld(b,d,'rvpW','num','Profile width (bars)',{min:10,max:250,step:5}); fld(b,d,'rvpOff','num','Profile offset (bars)',{min:0,max:250,step:5}); fld(b,d,'rvpRegT','num','Regular bin transparency',{min:0,max:100,step:5}); fld(b,d,'rvpPocT','num','POC bin transparency',{min:0,max:100,step:5});
    fld(b,d,'rvpTxt','chk','Show bin text'); fld(b,d,'rvpTxtMode','sel','Bin text mode',{opts:['Probability','Count']}); fld(b,d,'rvpPLbl','chk','Show profile labels'); fld(b,d,'rvpPoc','chk','Show probability POC line'); fld(b,d,'rvpCl','chk','Show cluster lines');
    fld(b,d,'rvpLn','chk','Show pivot lines'); fld(b,d,'rvpLLbl','sel','Line labels',{opts:['Compact','Full','None']}); fld(b,d,'rvpBroken','chk','Keep broken lines'); fld(b,d,'rvpMaxLn','num','Maximum pivot lines',{min:10,max:150,step:10});
    fld(b,d,'rvpDots','chk','Show pivot dots'); fld(b,d,'rvpMaxDots','num','Maximum pivot dots',{min:10,max:300,step:10}); fld(b,d,'rvpDotSz','sel','Pivot dot size',{opts:['Tiny','Small','Normal','Large','Huge']}); fld(b,d,'rvpDotT','num','Pivot dot transparency',{min:0,max:100,step:5});
    fld(b,d,'rvpSup','col','Support colour'); fld(b,d,'rvpRes','col','Resistance colour');
    for(let i=1;i<=8;i++) fld(b,d,'rvpC'+i,'col','Cluster '+i+' colour'); },
  sig:()=>0};
try{ DESC.rvp='Strategy \u00b7 pivot-cluster reversal probability profile with probability-labelled support / resistance lines'; }catch(e){}
{ const _rvD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='rvpview') return rvpDraw(d,X,Y,W,H); return _rvD.apply(this,arguments); };
  const _rvR=recomputeExtras; recomputeExtras=function(){ _rvR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='rvp'&&stVis(Z)) scriptBoxes.push({type:'rvpview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('rvp strategy failed',err); window.__rvpErr=err; }


// =====================================================================================
// [czt] STRATEGY · "Curved Trendlines" (Zeiierman port)   (self-contained: every name starts with czt / CZT)
// Last N confirmed pivot highs / lows are each fitted with their own quadratic curve (least squares); the upper curve is shifted up by its
// largest positive residual, the lower curve down by its largest negative residual. Draws the curved channel with layered gradient fill,
// mid line, optional historical best-fit channels, a live buy / sell volume profile and historical "memory" profiles above / below.
// The Pine script has no trade signals, so this adds no BUY / SELL. Hooks: STRATS.czt + draw + recomputeExtras.
// =====================================================================================
try{
const CZT_KEYS=['cztPl','cztPts','cztExt','cztHist','cztHKeep','cztHWin','cztHMin','cztProf','cztRows','cztPW','cztGap','cztMem','cztMW'];
const cztDet=(a,b,c,d,e,f,g,h,i)=>a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
function cztFit(xs,ys,upper){
  const sz=xs.length; if(sz<3) return null;
  const base=xs[0], n=sz; let sx=0,sx2=0,sx3=0,sx4=0,sy=0,sxy=0,sx2y=0;
  for(let i=0;i<sz;i++){ const x=xs[i]-base, y=ys[i], x2=x*x; sx+=x; sx2+=x2; sx3+=x2*x; sx4+=x2*x2; sy+=y; sxy+=x*y; sx2y+=x2*y; }
  const D=cztDet(n,sx,sx2,sx,sx2,sx3,sx2,sx3,sx4); if(!(Math.abs(D)>1e-7)) return null;
  const a=cztDet(sy,sx,sx2,sxy,sx2,sx3,sx2y,sx3,sx4)/D, b=cztDet(n,sy,sx2,sx,sxy,sx3,sx2,sx2y,sx4)/D, c=cztDet(n,sx,sy,sx,sx2,sxy,sx2,sx3,sx2y)/D;
  const mean=sy/n; let sse=0,sst=0,off=upper?-1e10:1e10;
  for(let i=0;i<sz;i++){ const x=xs[i]-base, y=ys[i], res=y-(a+b*x+c*x*x); sse+=res*res; sst+=(y-mean)*(y-mean); off=upper?Math.max(off,res):Math.min(off,res); }
  if(![a,b,c,off].every(isFinite)) return null;
  return {a,b,c,base,r2:sst>0?1-sse/sst:1,off};
}
const cztAt=(q,x)=>{ const r=x-q.base; return q.a+q.b*r+q.c*r*r+q.off; };
function cztSafeEnd(up,dn,sx,ex){ let s=ex; if(ex>sx){ if(cztAt(up,sx)-cztAt(dn,sx)<=0) s=sx; else for(let x=sx+1;x<=ex;x++){ if(cztAt(up,x)-cztAt(dn,x)<=0){ s=x-1; break; } } } return s; }
function cztProfile(c,from,to,pLow,pHigh,rowSize,alignTop,mt){
  const span=pHigh-pLow; if(!(from>=0&&to>=from&&span>mt&&rowSize>0)) return null;
  const rows=Math.max(1,Math.ceil(span/rowSize-1e-9)); if(rows>600) return null;
  const gridLow=alignTop?pHigh-rowSize*rows:pLow, bu=new Float64Array(rows), bd=new Float64Array(rows), cl=b=>Math.max(0,Math.min(rows-1,b));
  for(let i=from;i<=to;i++){ const k=c[i], vol=k.volume||0, bh=Math.min(k.high,pHigh), bl=Math.max(k.low,pLow), rg=k.high-k.low; if(!(bh>=bl&&vol>0)) continue;
    const bf=rg>0?Math.max(0,Math.min(1,(k.close-k.low)/rg)):.5, uv=vol*bf, dv=vol-uv;
    if(rg<=mt){ const b=cl(Math.floor((k.close-gridLow)/rowSize)); bu[b]+=uv; bd[b]+=dv; }
    else { const f=cl(Math.floor((bl-gridLow)/rowSize)), l=cl(Math.floor((bh-gridLow)/rowSize));
      for(let b=f;b<=l;b++){ const lo=gridLow+rowSize*b, ov=Math.max(0,Math.min(bh,lo+rowSize)-Math.max(bl,lo)), w=ov/rg; bu[b]+=uv*w; bd[b]+=dv*w; } } }
  let mx=0,poc=0; for(let b=0;b<rows;b++){ const t=bu[b]+bd[b]; if(t>mx){ mx=t; poc=b; } }
  const out=[]; if(mx>0) for(let b=0;b<rows;b++){ const t=bu[b]+bd[b]; if(t>0) out.push({b,lo:Math.max(pLow,gridLow+rowSize*b),hi:Math.min(pHigh,gridLow+rowSize*(b+1)),u:bu[b],d:bd[b],t}); }
  const pl=Math.max(pLow,gridLow+rowSize*poc), ph=Math.min(pHigh,gridLow+rowSize*(poc+1));
  return {rows:out,mx,poc,pocPrice:(pl+ph)/2};
}
function cztCompute(all,Z){
  const off=Math.max(0,all.length-5000), c=off?all.slice(off):all, n=c.length, L=Math.max(1,Math.round(Z.cztPl)||10), P=Math.max(3,Math.min(15,Math.round(Z.cztPts)||6)), ext=Math.max(0,Math.round(Z.cztExt)||0);
  if(n<2*L+5) return null;
  const hx=[],hy=[],lx=[],ly=[],picks=[], hw=Math.max(5,Math.round(Z.cztHWin)||80), hmin=+Z.cztHMin||0; let bucketId=null, best=null;
  for(let t=2*L;t<n;t++){ const p=t-L; let ph=NaN,pl=NaN, a=true,b=true; const vh=c[p].high, vl=c[p].low;
    for(let m=1;m<=L&&(a||b);m++){ if(!(vh>c[p-m].high)) a=false; if(!(vl<c[p-m].low)) b=false; if(!(vh>=c[p+m].high)) a=false; if(!(vl<=c[p+m].low)) b=false; }
    if(a) ph=vh; if(b) pl=vl;
    if(!isNaN(ph)){ hx.push(p); hy.push(ph); if(hx.length>P){ hx.shift(); hy.shift(); } }
    if(!isNaN(pl)){ lx.push(p); ly.push(pl); if(lx.length>P){ lx.shift(); ly.shift(); } }
    if(Z.cztHist&&(!isNaN(ph)||!isNaN(pl))&&hx.length>=3&&lx.length>=3){ const up=cztFit(hx,hy,true), dn=cztFit(lx,ly,false);
      if(up&&dn){ const score=Math.min(up.r2,dn.r2)*100, bucket=Math.floor((t+off)/hw); if(bucketId==null) bucketId=bucket;
        if(bucket!==bucketId){ if(best) picks.push(best); bucketId=bucket; best=null; }
        if(score>=hmin&&(!best||score>best.score)) best={up,dn,score,first:Math.max(up.base,dn.base),last:Math.max(hx[hx.length-1],lx[lx.length-1])}; } } }
  const up=cztFit(hx,hy,true), dn=cztFit(lx,ly,false), R={off,n,up,dn,picks:picks.slice(-Math.max(1,Math.round(Z.cztHKeep)||10)),endX:n-1+ext,startX:0,live:null,um:null,lm:null,pX:n-1,sS:0,liveHigh:0,liveLow:0};
  if(!up||!dn) return R;
  R.startX=Math.max(up.base,dn.base); R.endX=cztSafeEnd(up,dn,R.startX,R.endX);
  const sS=Math.min(hx[0],lx[0]); R.sS=sS; let hi=-Infinity,lo=Infinity; for(let i=sS;i<n;i++){ if(c[i].high>hi) hi=c[i].high; if(c[i].low<lo) lo=c[i].low; }
  R.liveHigh=hi; R.liveLow=lo; const liveSpan=hi-lo, mt=Math.max(1e-9,c[n-1].close*1e-7), pU=cztAt(up,R.endX), pL=cztAt(dn,R.endX), memReady=!!Z.cztMem&&sS-1>=0;
  const uS=memReady?Math.max(0,pU-hi):0, lS=memReady?Math.max(0,lo-pL):0, comb=(Z.cztProf?liveSpan:0)+uS+lS, bins=Math.max(10,Math.round(Z.cztRows)||48);
  const rowSize=Math.max(Math.max(liveSpan,mt)/bins,comb/245), maxW=Math.max(Math.round(Z.cztPW)||60,Math.round(Z.cztMW)||50);
  R.pX=n-1+Math.min(ext+Math.max(0,Math.round(Z.cztGap)||0),Math.max(0,490-maxW));
  if(Z.cztProf) R.live=cztProfile(c,sS,n-1,lo,hi,rowSize,false,mt);
  if(uS>mt) R.um=cztProfile(c,0,sS-1,hi,pU,rowSize,false,mt);
  if(lS>mt) R.lm=cztProfile(c,0,sS-1,pL,lo,rowSize,true,mt);
  return R;
}
const cztCache={};
function cztGet(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,l.volume].concat(CZT_KEYS.map(k=>Z[k])).join('|');
  if(!cztCache[Z.sid]||cztCache[Z.sid].k!==key) cztCache[Z.sid]={k:key,r:cztCompute(c,Z)}; return cztCache[Z.sid].r; }
const cztRgba=(h,a)=>{ let s=String(h||'#000000').replace('#',''); if(s.length===3) s=s.split('').map(q=>q+q).join(''); const v=parseInt(s,16)||0; return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+Math.max(0,Math.min(1,a)).toFixed(3)+')'; };
function cztDraw(d,X,Y,W,H){
  const Z=d.o, cs=candles; if(!cs||cs.length<30) return; const r=cztGet(cs,Z); if(!r||!r.up||!r.dn) return;
  const off=r.off, up=r.up, dn=r.dn, g0=X(0), g1=X(1);
  const xs=i=>{ const k=i+off, v=X(k); if(v!=null) return v; return (g0!=null&&g1!=null)?g0+(g1-g0)*k:null; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round'; cx.lineCap='butt';
  const curve=(q,a,b,col,wd,dash,al,segs)=>{ const span=b-a; if(!(span>0)) return; const sg=Math.max(1,Math.min(segs||120,span)); cx.beginPath(); let st=false;
    for(let i=0;i<=sg;i++){ const xi=a+Math.round(span*i/sg), x=xs(xi), y=Y(cztAt(q,xi)); if(x==null||y==null) continue; if(!st){ cx.moveTo(x,y); st=true; } else cx.lineTo(x,y); }
    cx.globalAlpha=al; cx.strokeStyle=col; cx.lineWidth=wd; cx.setLineDash(dash||[]); cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1; };
  const sX=r.startX, eX=r.endX, hasCh=eX>sX;
  // ---- gradient fill (layered, strongest at the outer edges, fading to the middle)
  if(Z.cztFill&&hasCh){ const span=eX-sX, sg=Math.max(1,Math.min(80,span)), S=[]; for(let i=0;i<=sg;i++){ const xi=sX+Math.round(span*i/sg), x=xs(xi); if(x==null) continue; const u=cztAt(up,xi), l=cztAt(dn,xi); S.push({x,u,l,m:(u+l)/2}); }
    const N=Math.max(3,Math.min(9,Math.round(Z.cztLay)||5)), eA=+Z.cztEdgeA, mA=+Z.cztMidA;
    if(S.length>1) for(let g=0;g<N;g++){ const t1=g/N, t2=(g+1)/N, al=(100-Math.round(mA+(eA-mA)*(t1+t2)/2))/100;
      [['u',Z.cztUpC],['l',Z.cztLoC]].forEach(([s,col])=>{ cx.beginPath(); let ok=true;
        for(let i=0;i<S.length&&ok;i++){ const q=S[i], y=Y(q.m+(q[s]-q.m)*t2); if(y==null){ ok=false; break; } if(i) cx.lineTo(q.x,y); else cx.moveTo(q.x,y); }
        for(let i=S.length-1;i>=0&&ok;i--){ const q=S[i], y=Y(q.m+(q[s]-q.m)*t1); if(y==null){ ok=false; break; } cx.lineTo(q.x,y); }
        if(!ok) return; cx.closePath(); cx.globalAlpha=al; cx.fillStyle=col; cx.fill(); cx.globalAlpha=1; }); } }
  // ---- historical best-fit channels (dotted)
  if(Z.cztHist) r.picks.forEach(p=>{ const e2=cztSafeEnd(p.up,p.dn,p.first,p.last); if(e2>p.first){ curve(p.up,p.first,e2,Z.cztHC,Z.cztHW,[1.5,3],1,30); curve(p.dn,p.first,e2,Z.cztHC,Z.cztHW,[1.5,3],1,30); } });
  // ---- curves + mid line
  if(Z.cztUp&&eX>up.base) curve(up,up.base,eX,Z.cztUpC,Z.cztW,null,1);
  if(Z.cztLo&&eX>dn.base) curve(dn,dn.base,eX,Z.cztLoC,Z.cztW,null,1);
  if(Z.cztMid&&hasCh){ const span=eX-sX, sg=Math.max(1,Math.min(80,span)); cx.beginPath(); let st=false;
    for(let i=0;i<=sg;i++){ const xi=sX+Math.round(span*i/sg), x=xs(xi), y=Y((cztAt(up,xi)+cztAt(dn,xi))/2); if(x==null||y==null) continue; if(!st){ cx.moveTo(x,y); st=true; } else cx.lineTo(x,y); }
    cx.globalAlpha=.85; cx.strokeStyle=Z.cztMidC; cx.lineWidth=Z.cztMidW; cx.stroke(); cx.globalAlpha=1; }
  // ---- volume profiles (buy / sell split, grows to the right of the projected curve end)
  const pX=r.pX, xb=xs(pX), last=r.n-1;
  const prof=(P,w,uc,dc,pocOn,pc)=>{ if(!P||!(P.mx>0)||xb==null) return; w=Math.max(1,Math.round(w)||1);
    P.rows.forEach(rw=>{ const tw=Math.max(1,Math.round(w*rw.t/P.mx)), dw=Math.round(tw*rw.d/rw.t), uw=tw-dw, ins=(rw.hi-rw.lo)*.08, yT=Y(rw.hi-ins), yB=Y(rw.lo+ins); if(yT==null||yB==null) return;
      const top=Math.min(yT,yB), h=Math.max(1,Math.abs(yB-yT)), al=(100-Math.round(76-46*rw.t/P.mx))/100, xm=xs(pX+dw), xe=xs(pX+tw); if(xm==null||xe==null) return;
      if(dw>0){ cx.fillStyle=cztRgba(dc,al); cx.fillRect(xb,top,xm-xb,h); } if(uw>0){ cx.fillStyle=cztRgba(uc,al); cx.fillRect(xm,top,xe-xm,h); }
      if(pocOn&&rw.b===P.poc){ cx.fillStyle=cztRgba(pc,.12); cx.fillRect(xb,top,xe-xb,h); cx.strokeStyle=pc; cx.lineWidth=2; cx.strokeRect(xb,top,xe-xb,h); } });
    if(pocOn){ const y=Y(P.pocPrice), xa=xs(Math.max(0,last-18)); if(y!=null&&xa!=null){ cx.strokeStyle=cztRgba(pc,.75); cx.lineWidth=2; cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(xb,y); cx.stroke(); } } };
  if(Z.cztProf){ prof(r.live,Z.cztPW,Z.cztUpV,Z.cztDnV,Z.cztPoc,Z.cztPocC);
    if(Z.cztBnd){ const xa=xs(r.sS), xe=xs(pX+Math.round(Z.cztPW)); const hy=Y(r.liveHigh), ly=Y(r.liveLow);
      if(xa!=null&&xe!=null){ cx.setLineDash([1.5,3]); cx.lineWidth=1; if(hy!=null){ cx.strokeStyle=cztRgba(Z.cztUpC,.6); cx.beginPath(); cx.moveTo(xa,hy); cx.lineTo(xe,hy); cx.stroke(); }
        if(ly!=null){ cx.strokeStyle=cztRgba(Z.cztLoC,.6); cx.beginPath(); cx.moveTo(xa,ly); cx.lineTo(xe,ly); cx.stroke(); } cx.setLineDash([]); } } }
  if(Z.cztMem){ prof(r.um,Z.cztMW,Z.cztMUp,Z.cztMDn,Z.cztMPoc,Z.cztMPocC); prof(r.lm,Z.cztMW,Z.cztMUp,Z.cztMDn,Z.cztMPoc,Z.cztMPocC); }
  cx.globalAlpha=1; cx.restore();
}
STRATS.czt={label:'Curved Trendlines (Zeiierman) \u00b7 quadratic-fit pivot channel, gradient fill, live buy / sell volume profile, memory profiles',short:'Curved Trendlines',own:true,
  defs:{limit:false,useSl:false,cztPl:10,cztPts:6,cztExt:20,cztUp:true,cztUpC:'#f23645',cztLo:true,cztLoC:'#00e676',cztW:2,cztMid:true,cztMidC:'#ffffff',cztMidW:1,cztFill:true,cztLay:5,cztEdgeA:65,cztMidA:97,
    cztHist:false,cztHKeep:10,cztHWin:80,cztHMin:50,cztHC:'#2962ff',cztHW:1,
    cztProf:true,cztRows:48,cztPW:60,cztGap:5,cztUpV:'#2b9e8f',cztDnV:'#4a58b6',cztPoc:true,cztPocC:'#ff9120',cztBnd:false,
    cztMem:true,cztMW:50,cztMUp:'#2b9e8f',cztMDn:'#4a58b6',cztMPoc:true,cztMPocC:'#209eff'},
  inputs:(b,d)=>{
    fld(b,d,'cztPl','num','Pivot length',{min:1,max:100,step:1}); fld(b,d,'cztPts','num','Structure points',{min:3,max:15,step:1}); fld(b,d,'cztExt','num','Extend bars',{min:0,max:300,step:5});
    fld(b,d,'cztUp','chk','Upper curve'); fld(b,d,'cztUpC','col','Upper curve colour'); fld(b,d,'cztLo','chk','Lower curve'); fld(b,d,'cztLoC','col','Lower curve colour'); fld(b,d,'cztW','num','Curve width',{min:1,max:5,step:1});
    fld(b,d,'cztMid','chk','Mid line'); fld(b,d,'cztMidC','col','Mid line colour'); fld(b,d,'cztMidW','num','Mid line width',{min:1,max:4,step:1});
    fld(b,d,'cztFill','chk','Gradient fill'); fld(b,d,'cztLay','num','Gradient layers',{min:3,max:9,step:1}); fld(b,d,'cztEdgeA','num','Outer transparency',{min:0,max:100,step:1}); fld(b,d,'cztMidA','num','Center transparency',{min:0,max:100,step:1});
    fld(b,d,'cztHist','chk','Historical curves'); fld(b,d,'cztHKeep','num','Historical channels to keep',{min:1,max:10,step:1}); fld(b,d,'cztHWin','num','Best fit window (bars)',{min:25,max:500,step:5}); fld(b,d,'cztHMin','num','Minimum historical fit %',{min:0,max:100,step:1});
    fld(b,d,'cztHC','col','Historical colour'); fld(b,d,'cztHW','num','Historical width',{min:1,max:3,step:1});
    fld(b,d,'cztProf','chk','Show live profile'); fld(b,d,'cztRows','num','Profile rows',{min:10,max:100,step:1}); fld(b,d,'cztPW','num','Profile width (bars)',{min:10,max:120,step:5}); fld(b,d,'cztGap','num','Profile gap (bars)',{min:0,max:100,step:1});
    fld(b,d,'cztUpV','col','Up volume colour'); fld(b,d,'cztDnV','col','Down volume colour'); fld(b,d,'cztPoc','chk','Show POC'); fld(b,d,'cztPocC','col','POC colour'); fld(b,d,'cztBnd','chk','Show profile bounds');
    fld(b,d,'cztMem','chk','Historical memory profile'); fld(b,d,'cztMW','num','Memory profile width (bars)',{min:10,max:100,step:5}); fld(b,d,'cztMUp','col','Memory up volume colour'); fld(b,d,'cztMDn','col','Memory down volume colour');
    fld(b,d,'cztMPoc','chk','Show memory POC'); fld(b,d,'cztMPocC','col','Memory POC colour'); },
  sig:()=>0};
try{ DESC.czt='Strategy \u00b7 curved pivot channel (quadratic fit) with gradient fill, live buy / sell volume profile and historical memory profiles'; }catch(e){}
{ const _czD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='cztview') return cztDraw(d,X,Y,W,H); return _czD.apply(this,arguments); };
  const _czR=recomputeExtras; recomputeExtras=function(){ _czR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='czt'&&stVis(Z)) scriptBoxes.push({type:'cztview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('czt strategy failed',err); window.__cztErr=err; }


// =====================================================================================
// [bkc] STRATEGY · "Smart Money Breakout Channels" (AlgoAlpha port)   (self-contained: every name starts with bkc / BKC)
// A channel forms when the volatility-extreme timing lines cross (stdev of normalised price): the box spans the highest high /
// lowest low of the quiet period, with a red upper and a green lower ATR zone and a dashed centre line. A close outside ends it
// (strong closes = candle body centre) and prints a ▲ / ▼ label. Optional volume bars inside the newest channel (Volume / Comparison /
// Delta), volume text in the box corner and a buy / sell pressure gauge to the right of the last bar.
// Up / down volume is split from the candle's close position (no 1-minute source in this app). Optional BUY / SELL on breakouts (off by default).
// Hooks: STRATS.bkc + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const BKC_KEYS=['bkcNest','bkcStrong','bkcNorm','bkcLen'];
const bkcUV=k=>{ const v=k.volume||0, rg=k.high-k.low, bf=rg>0?Math.max(0,Math.min(1,(k.close-k.low)/rg)):.5; return [v*bf,v*(1-bf)]; };
function bkcCompute(c,Z){
  const n=c.length, L=Math.max(1,Math.round(Z.bkcLen)||14), NL=Math.max(1,Math.round(Z.bkcNorm)||100);
  const R={n,off:0,boxes:[],mid:new Array(n).fill(NaN),hgt:new Array(n).fill(NaN),sv:new Array(n).fill(NaN),sig:new Map(),brk:[],active:false,gTop:0,gBot:0,hv:0,lv:0,vold:0};
  if(n<NL+30) return R;
  // atr (rma) · normalised price · stdev(14) · volume sma(20)
  const atr=new Array(n).fill(null); let s=0;
  for(let i=0;i<n;i++){ const tr=i?Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)):c[i].high-c[i].low;
    if(i<L){ s+=tr; if(i===L-1) atr[i]=s/L; } else atr[i]=(atr[i-1]*(L-1)+tr)/L; }
  const np=new Array(n).fill(null), vol=new Array(n).fill(null);
  for(let i=NL-1;i<n;i++){ let hh=-Infinity,ll=Infinity; for(let j=i-NL+1;j<=i;j++){ if(c[j].high>hh) hh=c[j].high; if(c[j].low<ll) ll=c[j].low; } np[i]=hh>ll?(c[i].close-ll)/(hh-ll):null; }
  for(let i=13;i<n;i++){ let ok=true,m=0; for(let j=i-13;j<=i;j++){ if(np[j]==null){ ok=false; break; } m+=np[j]; } if(!ok) continue; m/=14; let q=0; for(let j=i-13;j<=i;j++) q+=(np[j]-m)*(np[j]-m); vol[i]=Math.sqrt(q/14); }
  let vs=0; for(let i=0;i<n;i++){ vs+=c[i].volume||0; if(i>=20) vs-=c[i-20].volume||0; if(i>=19) R.sv[i]=vs/20; }
  // timing lines: position of the highest / lowest stdev inside the last length+1 bars
  const up=new Array(n).fill(null), lo=new Array(n).fill(null);
  for(let i=L;i<n;i++){ let ok=true,hi=-Infinity,lw=Infinity,hb=0,lb=0; for(let k=0;k<=L;k++){ const v=vol[i-k]; if(v==null){ ok=false; break; } if(v>hi){ hi=v; hb=-k; } if(v<lw){ lw=v; lb=-k; } }
    if(ok){ up[i]=(hb+L)/L; lo[i]=(lb+L)/L; } }
  const has=i=>i>0&&up[i]!=null&&lo[i]!=null&&up[i-1]!=null&&lo[i-1]!=null;
  let live=[], since=null, hvold=null, lvold=null, lastBrk=0;
  for(let i=0;i<n;i++){
    const k=c[i], uvdv=bkcUV(k), vold=uvdv[0]-uvdv[1];
    if(hvold==null){ hvold=vold; lvold=vold; }
    const cLU=has(i)&&lo[i]>up[i]&&lo[i-1]<=up[i-1], cUL=has(i)&&up[i]>lo[i]&&up[i-1]<=lo[i-1];
    if(cLU) since=0; else if(since!=null) since++;
    const dur=Math.max(since==null?0:since,1);
    if(cLU){ hvold=vold; lvold=vold; }
    if(vold>hvold) hvold=vold; if(vold<lvold) lvold=vold;
    if(cUL&&dur>10&&i-dur+1>=0&&atr[i]!=null){
      let h=-Infinity,l=Infinity; for(let j=i-dur+1;j<=i;j++){ if(c[j].high>h) h=c[j].high; if(c[j].low<l) l=c[j].low; }
      let ok=true; if(!Z.bkcNest) for(const b of live){ if(h>b.bot&&l<b.top){ ok=false; break; } }
      if(ok){ const b={left:i-dur,right:i,top:h,bot:l,vola:atr[i]/2,state:'live',lb:i,ab:false}; live.unshift(b); R.boxes.push(b); }
    }
    const px=Z.bkcStrong?(k.close+k.open)/2:k.close; let bu=false,bd=false;
    for(let j=live.length-1;j>=0;j--){ const b=live[j];
      if(px>b.top){ b.state='up'; R.brk.push({i,dir:1,price:b.bot}); live.splice(j,1); bu=true; }
      else if(px<b.bot){ b.state='down'; R.brk.push({i,dir:-1,price:b.top}); live.splice(j,1); bd=true; }
      else { b.right=i; b.lb=i; b.ab=px>(b.top+b.bot)/2; } }
    lastBrk=bu||bd?1:0; if(bu&&!bd) R.sig.set(i,1); else if(bd&&!bu) R.sig.set(i,-1);
    if(live.length){ const b=live[0]; R.mid[i]=(b.top+b.bot)/2; R.hgt[i]=b.top-b.bot; }
    if(i===n-1){ R.active=live.length>0&&!lastBrk; if(live.length){ R.gTop=live[0].top; R.gBot=live[0].bot; } R.hv=hvold; R.lv=lvold; R.vold=vold; }
  }
  return R;
}
const bkcCache={};
function bkcGet(all,Z,live){
  const off=Math.max(0,all.length-3000), c=off?all.slice(off):all; if(c.length<130) return null;
  const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,l.volume].concat(BKC_KEYS.map(k=>Z[k])).join('|'), ck=Z.sid+(live?'L':'C');
  if(!bkcCache[ck]||bkcCache[ck].k!==key){ const r=bkcCompute(c,Z); r.off=off; bkcCache[ck]={k:key,r}; } return bkcCache[ck].r;
}
const bkcRgba=(h,a)=>{ let s=String(h||'#000000').replace('#',''); if(s.length===3) s=s.split('').map(q=>q+q).join(''); const v=parseInt(s,16)||0; return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+Math.max(0,Math.min(1,a)).toFixed(3)+')'; };
const bkcMix=(a,b,t)=>{ const f=h=>{ const v=parseInt(String(h).replace('#',''),16)||0; return [v>>16&255,v>>8&255,v&255]; }, x=f(a), y=f(b); t=Math.max(0,Math.min(1,t)); return 'rgb('+x.map((q,i)=>Math.round(q+(y[i]-q)*t)).join(',')+')'; };
const bkcK=v=>(Math.round(v/1000*10)/10)+'K';
function bkcDraw(d,X,Y,W,H){
  const Z=d.o, cs=candles; if(!cs||cs.length<130) return; const r=bkcGet(cs,Z,true); if(!r) return;
  const off=r.off, n=r.n, g0=X(0), g1=X(1), bw=(g0!=null&&g1!=null)?Math.max(1,Math.abs(g1-g0)):6;
  const xs=i=>{ const k=i+off, v=X(k); if(v!=null) return v; return (g0!=null&&g1!=null)?g0+(g1-g0)*k:null; };
  const fg=document.documentElement.getAttribute('data-theme')==='light'?'#131722':'#ffffff', green=Z.bkcBull||'#00ffbb', red=Z.bkcBear||'#ff1100', fs=({Tiny:8,Small:9.5,Normal:11,Large:13})[Z.bkcTS]||8;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineWidth=1; cx.font=fs+'px system-ui'; cx.textBaseline='middle';
  // ---- channel boxes
  r.boxes.slice(-150).forEach(b=>{ const x0=xs(b.left), x1=xs(b.right), yT=Y(b.top), yB=Y(b.bot); if(x0==null||x1==null||yT==null||yB==null||x1<-5||x0>W+5) return;
    const w=Math.max(1,x1-x0), yUb=Y(b.top-b.vola), yLt=Y(b.bot+b.vola);
    cx.fillStyle=bkcRgba(fg,.10); cx.fillRect(x0,Math.min(yT,yB),w,Math.max(1,Math.abs(yB-yT)));
    if(yUb!=null){ cx.fillStyle=bkcRgba(red,.30); cx.fillRect(x0,Math.min(yT,yUb),w,Math.max(1,Math.abs(yUb-yT))); }
    if(yLt!=null){ cx.fillStyle=bkcRgba(green,.30); cx.fillRect(x0,Math.min(yB,yLt),w,Math.max(1,Math.abs(yB-yLt))); }
    const ym=Y((b.top+b.bot)/2); if(ym!=null){ cx.strokeStyle=bkcRgba(fg,.5); cx.setLineDash([4,3]); cx.beginPath(); cx.moveTo(x0,ym); cx.lineTo(x1,ym); cx.stroke(); cx.setLineDash([]); }
    // volume text in the corner of the zone opposite to price (as the Pine script does)
    const k=cs[b.lb+off]; if(k){ const uv=bkcUV(k), mode=Z.bkcMode;
      const tx=mode==='Volume'?bkcK(k.volume||0):mode==='Delta'?bkcK(uv[0]-uv[1]):bkcK(uv[0])+'/'+bkcK(uv[1]);
      const yy=b.ab?Y(b.bot+b.vola/2):Y(b.top-b.vola/2); if(yy!=null){ cx.textAlign='right'; cx.fillStyle=bkcRgba(fg,.7); cx.fillText(tx,x1-3,yy); } } });
  // ---- volume bars inside the newest channel
  if(Z.bkcVol){ const cw=Math.max(1,bw*.7), VS=+Z.bkcVS||.5;
    for(let t=n-1;t>=0;t--){ const x=xs(t); if(x==null) continue; if(x<-bw) break; if(x>W+bw||isNaN(r.mid[t])) continue;
      const k=cs[t+off], sv=r.sv[t]; if(!k||!(sv>0)) continue; const mid=r.mid[t], ch=r.hgt[t]*VS, q=ch/4, uvdv=bkcUV(k), mode=Z.bkcMode;
      const bar=(a,b2,col,al)=>{ const y1=Y(a), y2=Y(b2); if(y1==null||y2==null) return; cx.globalAlpha=al; cx.fillStyle=col; cx.fillRect(x-cw/2,Math.min(y1,y2),cw,Math.max(1,Math.abs(y2-y1))); cx.globalAlpha=1; };
      if(mode==='Volume'){ const ratio=(k.volume||0)/sv, hh=ratio*q, tr=Math.max(20,Math.min(80,80-(ratio-.5)*40)); bar(mid,mid+hh,fg,(100-tr)/100); bar(mid,mid-hh,fg,(100-tr)/100); }
      else if(mode==='Comparison'){ bar(mid,mid+uvdv[0]/sv*q,green,1); bar(mid,mid-uvdv[1]/sv*q,red,1); }
      else { const vd=uvdv[0]-uvdv[1], hh=Math.abs(vd/sv)*q; if(vd>=0) bar(mid,mid+hh,green,1); else bar(mid,mid-hh,red,1); } } }
  // ---- breakout labels
  r.brk.slice(-120).forEach(b=>{ const x=xs(b.i), y=Y(b.price); if(x==null||y==null||x<-20||x>W+20) return; const up=b.dir===1, col=up?green:red, w=18, h=15, y0=up?y+5:y-5-h;
    cx.fillStyle=col; cx.beginPath(); cx.moveTo(x,y); cx.lineTo(x-4,y+(up?5:-5)); cx.lineTo(x+4,y+(up?5:-5)); cx.closePath(); cx.fill(); cx.fillRect(x-w/2,y0,w,h);
    cx.fillStyle=fg; cx.textAlign='center'; cx.font='10px system-ui'; cx.fillText(up?'\u25B2':'\u25BC',x,y0+h/2+.5); cx.font=fs+'px system-ui'; });
  // ---- buy / sell pressure gauge (right of the last bar, newest channel only)
  if(r.active&&r.gTop>r.gBot){ const gx=xs(n-1+2), px=xs(n-1+3); if(gx!=null){ const seg=21, sl=(r.gTop-r.gBot)/seg; cx.lineWidth=4; cx.lineCap='butt';
      for(let i=0;i<seg;i++){ const y1=r.gTop-i*sl, y2=r.gTop-(i+1)*sl, a=Y(y1), b=Y(y2); if(a==null||b==null) continue; cx.strokeStyle=bkcMix(red,green,(y1-r.gBot)/(r.gTop-r.gBot)); cx.beginPath(); cx.moveTo(gx,a); cx.lineTo(gx,b+(b>a?.5:-.5)); cx.stroke(); }
      const rg=r.hv-r.lv; if(rg>0&&px!=null){ let dv=-100*2*((r.vold-r.lv)/rg-.5); dv=Math.max(-100,Math.min(100,dv)); const py=Y(r.gTop-((dv+100)/200)*(r.gTop-r.gBot)); if(py!=null){ cx.fillStyle=fg; cx.textAlign='left'; cx.font='11px system-ui'; cx.fillText('\u25C0',px-4,py); } } cx.lineWidth=1; } }
  cx.globalAlpha=1; cx.restore();
}
STRATS.bkc={label:'Smart Money Breakout Channels (AlgoAlpha) \u00b7 volatility channels, ATR zones, breakout labels, volume bars, buy / sell gauge',short:'Breakout Channels',own:true,
  defs:{limit:false,useSl:false,bkcNest:false,bkcStrong:true,bkcNorm:100,bkcLen:14,bkcVol:true,bkcMode:'Comparison',bkcVS:.5,bkcTS:'Tiny',bkcBull:'#00ffbb',bkcBear:'#ff1100',bkcSig:false},
  inputs:(b,d)=>{
    fld(b,d,'bkcNest','chk','Nested Channels'); fld(b,d,'bkcStrong','chk','Strong Closes Only'); fld(b,d,'bkcNorm','num','Normalization Length',{min:1,max:500,step:1}); fld(b,d,'bkcLen','num','Box Detection Length',{min:1,max:100,step:1});
    fld(b,d,'bkcVol','chk','Show Volume Analysis'); fld(b,d,'bkcMode','sel','Volume Display Mode',{opts:['Volume','Comparison','Delta']}); fld(b,d,'bkcVS','num','Volume Scale',{min:0.1,max:2,step:0.1});
    fld(b,d,'bkcTS','sel','Volume Text Size',{opts:['Tiny','Small','Normal','Large']}); fld(b,d,'bkcBull','col','Bullish Colour'); fld(b,d,'bkcBear','col','Bearish Colour');
    fld(b,d,'bkcSig','chk','BUY / SELL on breakouts (up = BUY, down = SELL)'); },
  sig:(c,i,n,Z)=>{ if(!Z.bkcSig||c.length<130) return 0; const r=bkcGet(c,Z,false); if(!r) return 0; return r.sig.get(i-r.off)||0; }};
try{ DESC.bkc='Strategy \u00b7 volatility breakout channels with ATR zones, \u25B2 / \u25BC breakouts, volume bars and a buy / sell gauge'; }catch(e){}
{ const _bkD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='bkcview') return bkcDraw(d,X,Y,W,H); return _bkD.apply(this,arguments); };
  const _bkR=recomputeExtras; recomputeExtras=function(){ _bkR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='bkc'&&stVis(Z)) scriptBoxes.push({type:'bkcview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('bkc strategy failed',err); window.__bkcErr=err; }


// [wt] INDICATOR · WaveTrend Oscillator [WT] (LazyBear port) - oscillator pane, picker category Momentum
try{
IND.wt={label:'WaveTrend Oscillator [WT]',cat:'Momentum',nm:p=>`WT ${p.n1} ${p.n2}`,p:{n1:10,n2:21,ob1:60,ob2:53,os1:-60,os2:-53},
  cols:['#4caf50','#f23645','#2962ff'],kinds:['line','line','hist'],pane:1,
  lines:p=>[[p.ob1,'#f23645',0],[p.ob2,'#f23645',1],[0,'#787b86',0],[p.os2,'#4caf50',1],[p.os1,'#4caf50',0]],
  fields:[['n1','num','Channel Length',{min:1,max:200}],['n2','num','Average Length',{min:1,max:300}],['ob1','num','Over Bought Level 1',{step:1}],['ob2','num','Over Bought Level 2',{step:1}],['os1','num','Over Sold Level 1',{step:1}],['os2','num','Over Sold Level 2',{step:1}]],
  calc:(c,p)=>{ const ap=c.map(x=>(x.high+x.low+x.close)/3), esa=emaV(ap,p.n1), dd=emaV(ap.map((v,i)=>esa[i]!=null?Math.abs(v-esa[i]):null),p.n1),
      ci=ap.map((v,i)=>esa[i]!=null&&dd[i]!=null&&dd[i]!==0?(v-esa[i])/(0.015*dd[i]):null), w1=emaV(ci,p.n2), w2=smaV(w1,4),
      h=w1.map((x,i)=>x!=null&&w2[i]!=null?x-w2[i]:null);
    return [toS(c,w1),toS(c,w2),toS(c,h).map(q=>({...q,color:'rgba(41,98,255,.25)'}))]; }};
}catch(err){ console.error('wt indicator failed',err); }

// =====================================================================================
// [lsv] INDICATOR · "Liquidity Spectrum Visualizer" (BigBeluga port)   (self-contained: every name starts with lsv / LSV)
// Volume bubbles (size and strength = volume / stdev(volume,200)), a volume profile left of the lookback window
// and liquidity levels at the heaviest price bins. Hooks: IND.lsv + draw (nothing existing is edited).
// =====================================================================================
try{
const LSV_DEF={lookback:200,bubbles:true,profile:true,levels:true,up:'#22b16c',dn:'#dd7e2a'};
const lsvFmtVol=v=>{ const a=Math.abs(v); const f=(x,s)=>(Math.round(x*100)/100)+s; return a>=1e9?f(v/1e9,'B'):a>=1e6?f(v/1e6,'M'):a>=1e3?f(v/1e3,'K'):String(Math.round(v*100)/100); };
function lsvCompute(c,p){
  const n=c.length, LB=Math.max(2,Math.min(Math.round(p.lookback)||200,n)), from=n-LB, R={ok:false,n,from,LB,bub:[],bins:[],hiI:[],loI:[],mx:NaN,mn:NaN};
  if(n<2) return R;
  const v=c.map(x=>x.volume||0);
  // bubbles: tier from volume / population stdev of the last 200 bars
  for(let i=from;i<n;i++){ if(i<199) continue; let m=0; for(let k=i-199;k<=i;k++) m+=v[k]; m/=200; let q=0; for(let k=i-199;k<=i;k++) q+=(v[k]-m)*(v[k]-m); const sd=Math.sqrt(q/200); if(!(sd>0)) continue;
    const nv=v[i]/sd, x=c[i], tier=nv>=4?4:nv>=3?3:nv>=2?2:nv>=1?1:0;
    R.bub.push({i,y:(x.high+x.low+x.close)/3,tier,up:x.close>x.open,a:.5+.5*Math.min(1,Math.max(0,nv/5)),txt:tier===4?lsvFmtVol(v[i]):''}); }
  // profile: 100 bins between the lowest low and highest high of the window
  let mx=-Infinity, mn=Infinity; for(let i=from;i<n;i++){ mx=Math.max(mx,c[i].high); mn=Math.min(mn,c[i].low); }
  R.mx=mx; R.mn=mn; const step=(mx-mn)/100; if(!(step>0)) return R;
  for(let i=from;i<n;i++){ if(c[i].high===mx) R.hiI.push(i); if(c[i].low===mn) R.loI.push(i); }
  const bins=new Array(100).fill(0);
  for(let i=0;i<100;i++){ const lo=mn+step*i, up=lo+step; for(let j=from;j<n;j++){ const cl=c[j].close; if(cl>=lo-step&&cl<=up+step) bins[i]+=v[j]; } }
  const bm=Math.max(...bins), last=c[n-1].close;
  for(let i=0;i<100;i++){ const lo=mn+step*i, up=lo+step; R.bins.push({lo,up,val:bm>0?Math.trunc(bins[i]/bm*50):0,up2:last>(up+lo)/2}); }
  R.ok=true; return R;
}
function lsvDraw(d,X,Y,W,H){
  const r=d.r, o=d.o; if(!r) return;
  const x0=X(0), x1=X(1), xs=i=>{ const v=X(i); if(v!=null) return v; return (x0!=null&&x1!=null)?x0+(x1-x0)*i:null; };
  const last=r.n-1, base=last-r.LB-(o.profile?50:0), RAD=[2.5,4,6,9,13];
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  if(r.ok){
    r.bins.forEach(b=>{ const col=b.up2?o.up:o.dn, ya=Y(b.up), yb=Y(b.lo); if(ya==null||yb==null) return;
      if(o.profile){ const xa=xs(base), xb=xs(base+b.val); if(xa!=null&&xb!=null){ cx.globalAlpha=.1+.9*(b.val/50); cx.fillStyle=col; cx.fillRect(xa,Math.min(ya,yb),Math.max(0,xb-xa),Math.max(1,Math.abs(yb-ya))); } }
      if(o.levels&&b.val>25){ const y=(ya+yb)/2, xa=xs(base), xb=xs(last+5); if(xa!=null&&xb!=null){ cx.globalAlpha=.1+.9*((b.val-25)/25); cx.strokeStyle=col; cx.lineWidth=b.val>35?2:1; cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(xb,y); cx.stroke(); } } });
    cx.globalAlpha=1; cx.font='10px system-ui'; cx.textAlign='center'; cx.textBaseline='middle';
    const tag=(i,price,hi)=>{ const x=xs(i), y=Y(price); if(x==null||y==null||x<-30||x>W+30) return; const t=String(+price.toFixed(8)), w=cx.measureText(t).width+10, h=16, ty=hi?y-6-h:y+6;
      cx.fillStyle=hi?o.dn:o.up; cx.beginPath(); cx.rect(x-w/2,ty,w,h); cx.fill(); cx.beginPath(); if(hi){ cx.moveTo(x-4,ty+h); cx.lineTo(x+4,ty+h); cx.lineTo(x,y-1); } else { cx.moveTo(x-4,ty); cx.lineTo(x+4,ty); cx.lineTo(x,y+1); } cx.fill();
      cx.fillStyle='#fff'; cx.fillText(t,x,ty+h/2+.5); };
    if(r.hiI.length) tag(r.hiI[r.hiI.length-1],r.mx,true); if(r.loI.length) tag(r.loI[r.loI.length-1],r.mn,false); }
  if(o.bubbles){ cx.textAlign='center'; cx.textBaseline='middle'; cx.font='10px system-ui';
    r.bub.forEach(q=>{ const x=xs(q.i), y=Y(q.y); if(x==null||y==null||x<-20||x>W+20) return; cx.globalAlpha=q.a; cx.fillStyle=q.up?o.up:o.dn; cx.beginPath(); cx.arc(x,y,RAD[q.tier],0,6.2832); cx.fill();
      if(q.txt){ cx.globalAlpha=1; cx.fillStyle='#e6e8ee'; cx.fillText(q.txt,x,y); } }); }
  cx.globalAlpha=1; cx.restore();
}
{ const _lsvPrev=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='lsvview') return lsvDraw(d,X,Y,W,H); return _lsvPrev.apply(this,arguments); }; }
IND.lsv={label:'Liquidity Spectrum Visualizer – volume bubbles, volume profile, liquidity levels',title:'Liquidity Spectrum Visualizer',cat:'Volume',cols:[],calc:()=>[],live:true,
  nm:p=>'Liquidity Spectrum '+p.lookback,
  p:Object.assign({},LSV_DEF),
  inputsTab:(b,d)=>{ const p=d.p, F=(k,t,l,o)=>fld(b,p,k,t,l,o); F('lookback','num','LookBack',{min:10,max:5000,step:10}); F('bubbles','chk','Display volume bubbles'); F('profile','chk','Volume profile'); F('levels','chk','Liquidity levels'); },
  styleTab:(b,d)=>{ const p=d.p; fld(b,p,'up','col','Up colour'); fld(b,p,'dn','col','Down colour'); },
  extras:(c,p)=>({mk:[],boxes:[{type:'lsvview',pts:[],r:lsvCompute(c,p),o:p}],labels:[]})};
}catch(err){ console.error('lsv indicator failed',err); window.__lsvErr=err; }

// =====================================================================================
// [lqh] INDICATOR · "Liquidity Heatmap" (Nephew_Sam_ port)   (self-contained: every name starts with lqh / LQH)
// Multi-timeframe swing highs (red) / lows (green) drawn as hatched bands; higher timeframe = stronger colour.
// Pivots of each timeframe are built by resampling the loaded chart candles. Hooks: IND.lqh + draw (nothing edited).
// =====================================================================================
try{
const LQH_TF={'1 minute':['m',1],'3 minutes':['m',3],'5 minutes':['m',5],'15 minutes':['m',15],'30 minutes':['m',30],'45 minutes':['m',45],'1 hour':['m',60],'2 hours':['m',120],'3 hours':['m',180],'4 hours':['m',240],'8 hours':['m',480],'12 hours':['m',720],
  '1 day':['d',1],'3 days':['d',3],'1 week':['w',1],'1 month':['M',1],'2 months':['M',2]};
const LQH_MIN=k=>{ const [u,n]=LQH_TF[k]||['m',15]; return u==='m'?n:u==='d'?n*1440:u==='w'?n*10080:n*43830; };
function lqhKey(t,k){ const [u,n]=LQH_TF[k]||['m',15];
  if(u==='m') return Math.floor(t/(n*60));
  const day=Math.floor(t/86400);
  if(u==='d') return Math.floor(day/n);
  if(u==='w') return Math.floor((day+3)/7);
  const dt=new Date(t*1000); return Math.floor((dt.getUTCFullYear()*12+dt.getUTCMonth())/n); }
function lqhBars(c,k){ const out=[]; let last=null;
  for(let i=0;i<c.length;i++){ const q=lqhKey(c[i].time,k); if(q!==last){ out.push({i,h:c[i].high,l:c[i].low}); last=q; } else { const b=out[out.length-1]; if(c[i].high>b.h) b.h=c[i].high; if(c[i].low<b.l) b.l=c[i].low; } }
  return out; }
function lqhPivots(bars,lb,rb,lvl,n,out,anchorK){
  const N=bars.length; if(N<lb+rb+1) return;
  for(let k=lb;k<N-rb;k++){ let hi=true,lo=true;
    for(let j=k-lb;j<=k+rb;j++){ if(j===k) continue; if(j<k?bars[j].h>bars[k].h:bars[j].h>=bars[k].h) hi=false; if(j<k?bars[j].l<bars[k].l:bars[j].l<=bars[k].l) lo=false; if(!hi&&!lo) break; }
    if(hi) out.push({i:bars[k].i,p:bars[k].h,top:true,lvl,n}); if(lo) out.push({i:bars[k].i,p:bars[k].l,top:false,lvl,n}); } }
const LQH_ROWS=[
  ['i',[['15 minutes',7,7],['30 minutes',7,7],['1 hour',7,6],['2 hours',7,6],['4 hours',6,6],['1 day',5,5]]],
  ['h',[['8 hours',7,7],['1 day',7,7],['3 days',7,6],['1 week',7,6],['1 month',6,6],['2 months',5,5]]]];
const LQH_LEN=[6,10,10,10,15,15];
const lqhDef=()=>{ const p={hide:true}; LQH_ROWS.forEach(([g,rows])=>rows.forEach((r,k)=>{ p[g+k+'on']=!(g==='h'&&k===5); p[g+k+'tf']=r[0]; p[g+k+'l']=r[1]; p[g+k+'r']=r[2]; })); return p; };
function lqhRun(c,p){
  const n=c.length; if(n<40) return {items:[]};
  let mn=1e9; for(let i=Math.max(1,n-60);i<n;i++){ const d=c[i].time-c[i-1].time; if(d>0&&d<mn) mn=d; } const chartMin=mn/60;
  const g=chartMin<240?'i':'h', rows=LQH_ROWS.find(x=>x[0]===g)[1], items=[], cache={};
  if(chartMin<=3&&p[g+'0on']){ const k='5 minutes'; cache[k]=lqhBars(c,k); lqhPivots(cache[k],6,6,1,12,items); }
  rows.forEach((r,k)=>{ if(!p[g+k+'on']) return; const tfk=p[g+k+'tf']; const m=LQH_MIN(tfk);
    if(p.hide?!(chartMin<m):m<chartMin) return;
    const bars=cache[tfk]||(cache[tfk]=lqhBars(c,tfk)); lqhPivots(bars,Math.max(2,p[g+k+'l']|0),Math.max(2,p[g+k+'r']|0),k+1,LQH_LEN[k],items); });
  items.sort((a,b)=>a.lvl-b.lvl); return {items:items.slice(-500)}; }
const lqhPat={};
function lqhPattern(col){ if(lqhPat[col]) return lqhPat[col]; const cv=document.createElement('canvas'); cv.width=cv.height=3; const x=cv.getContext('2d'); x.fillStyle=col; x.fillRect(0,0,1,1); x.fillRect(2,1,1,1); x.fillRect(1,2,1,1); return lqhPat[col]=cx.createPattern(cv,'repeat'); }
function lqhDraw(d,X,Y,W,H){
  const r=d.r; if(!r||!r.items.length) return; const lh=Math.max(7,Math.min(16,W*0.0145));
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  r.items.forEach(q=>{ const x=X(q.i), y=Y(q.p); if(x==null||y==null||x>W) return;
    const big=q.lvl>=5, w=(q.n+1)*Math.max(3,W*0.0105), h=lh*(big?2:1), a=Math.min(1,(1-(80-q.lvl*10)/100)+.12), col=q.top?'#F23645':'#4CAF50';
    cx.globalAlpha=a; cx.fillStyle=lqhPattern(col); cx.fillRect(x,y-h/2,w,h); });
  cx.restore(); }
IND.lqh={label:'Liquidity Heatmap \u00b7 multi-timeframe swing highs / lows',title:'Liquidity Heatmap',cat:'Trend',cols:[],calc:()=>[],
  nm:p=>'Liquidity Heatmap',p:lqhDef(),
  inputsTab:(b,d)=>{ const p=d.p, hd=t=>{ const e=document.createElement('div'); e.textContent=t; e.style.cssText='margin:14px 0 6px;color:#8a90a5;font-size:12px;letter-spacing:.5px'; b.appendChild(e); };
    LQH_ROWS.forEach(([g,rows])=>{ hd(g==='i'?'INTRADAY TIMEFRAMES (chart below 4 hours)':'HIGHER TIMEFRAMES (chart 4 hours and above)');
      rows.forEach((r,k)=>{ fld(b,p,g+k+'on','chk','Show #'+(k+1)); fld(b,p,g+k+'tf','sel','  Timeframe',{opts:Object.keys(LQH_TF)}); fld(b,p,g+k+'l','num','  Left',{min:2,max:20,step:1}); fld(b,p,g+k+'r','num','  Right',{min:2,max:20,step:1}); }); });
    hd('OTHER SETTINGS'); fld(b,p,'hide','chk','Hide lines lower than enabled timeframes?'); },
  extras:(c,p)=>({mk:[],boxes:[{type:'lqhview',pts:[],o:p,r:lqhRun(c,p)}]})};
try{ DESC.lqh='Hatched bands at swing highs and lows from many timeframes; higher timeframes are stronger'; }catch(e){}
{ const _lD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='lqhview') return lqhDraw(d,X,Y,W,H); return _lD.apply(this,arguments); }; }
}catch(err){ console.error('lqh indicator failed',err); window.__lqhErr=err; }


// =====================================================================================
// [ibauc] STRATEGY · "IBAUC · Initial Balance + Auction Intelligence"   (self-contained: every name starts with ib / IB)
// Draws the Initial Balance box (IBH / IBM / IBL, extended through the day), optional projections, an Auction Intelligence
// dashboard (REGIME / BIAS / PHASE / AUCTION / PRESSURE / QUALITY / NEXT) and optional decision candles.
// Optional BUY / SELL when price is ACCEPTED outside the IB (2 closes beyond IBH / IBL, first close inside the auction window).
// Hooks: STRATS.ibauc + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const IB_TZ=['America/New_York','America/Chicago','America/Los_Angeles','UTC','Europe/London','Europe/Berlin','Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Africa/Nairobi','Australia/Sydney'];
const IB_FS={Tiny:9,Small:11,Normal:13,Large:15};
const ibHM=s=>{ const m=/^\s*(\d{1,2})\s*:?\s*(\d{2})\s*$/.exec(String(s==null?'':s)); if(!m) return null; const h=+m[1], q=+m[2]; return (h>24||q>59)?null:h*60+q; };
const ibFmt=v=>{ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return a>=1000?v.toFixed(1):a>=10?v.toFixed(2):a>=1?v.toFixed(4):a>=0.01?v.toFixed(5):v.toPrecision(3); };
const ibRgba=(h,a)=>{ const v=parseInt(String(h||'#2962ff').replace('#','').slice(0,6),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; };
const ibDF={}, ibOC={};
function ibOff(zone,t){ if(zone==='UTC') return 0; const b=Math.floor(t/3600), hk=zone+'|'+b; let v=ibOC[hk]; if(v!==undefined) return v;
  let f=ibDF[zone]; if(!f) f=ibDF[zone]=new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
  const p={}; f.formatToParts(new Date(b*3600000)).forEach(x=>{ p[x.type]=+x.value; });
  v=Date.UTC(p.year,p.month-1,p.day,p.hour%24,p.minute,p.second)/1000-b*3600;
  if(Object.keys(ibOC).length>30000) Object.keys(ibOC).forEach(k=>delete ibOC[k]); ibOC[hk]=v; return v; }
const IB_UP='#089981', IB_DN='#f23645', IB_NEU='#d1d4dc';
function ibCompute(c,Z){
  const n=c.length; if(n<5) return null;
  const tfS=tf[3]?tf[3]*30*86400:tf[2]; if(!(tfS<86400)) return {off:true};
  const zone=Z.ibTz||'America/New_York', s0=ibHM(Z.ibStart), e1=ibHM(Z.ibEnd); if(s0==null||e1==null) return null;
  const wrap=e1<=s0, e0=wrap?e1+1440:e1, stepM=tfS/60, win=Math.max(1,Z.ibWin||30);
  const dy=new Int32Array(n), md=new Float64Array(n);
  for(let i=0;i<n;i++){ const L=c[i].time+ibOff(zone,c[i].time), d=Math.floor(L/86400); dy[i]=d; md[i]=(L-d*86400)/60; }
  const insts=[]; let cur=null;
  for(let i=0;i<n;i++){ const m=md[i]; let key=null; if(m>=s0&&m<e0) key=dy[i]; else if(wrap&&m+1440>=s0&&m+1440<e0) key=dy[i]-1; if(key==null) continue;
    const x=c[i]; if(cur&&cur.key===key){ cur.i1=i; if(x.high>cur.hi) cur.hi=x.high; if(x.low<cur.lo) cur.lo=x.low; }
    else { cur={key,i0:i,i1:i,hi:x.high,lo:x.low}; insts.push(cur); } }
  insts.forEach((q,k)=>{
    q.mid=(q.hi+q.lo)/2; q.rng=q.hi-q.lo; const nx=insts[k+1]; let end=nx?nx.i0-1:n-1;
    if(!wrap){ const d0=dy[q.i0]; let j=q.i1; while(j+1<n&&dy[j+1]===d0) j++; end=Math.min(end,j); }
    q.end=Math.max(end,q.i1);
    const mm=(wrap&&md[q.i1]<s0)?md[q.i1]+1440:md[q.i1]; q.building=(k===insts.length-1)&&q.i1===n-1&&(mm+stepM<e0);
    const prev=insts.slice(Math.max(0,k-10),k); q.ratio=prev.length?q.rng/Math.max(1e-12,prev.reduce((a,p)=>a+p.rng,0)/prev.length):1;
    q.decs=[]; q.acc=null; q.accDir=0; q.brokeUp=false; q.brokeDn=false;
    const t0=q.i1+1<n?c[q.i1+1].time:0; let dec=null, dd=0;
    for(let j=q.i1+1;j<=q.end&&j<n;j++){ const x=c[j]; if(x.high>q.hi) q.brokeUp=true; if(x.low<q.lo) q.brokeDn=true;
      const dir=x.close>q.hi?1:x.close<q.lo?-1:0, inW=(x.time-t0)<win*60;
      if(dec==null){ if(dir&&inW){ dec=j; dd=dir; q.decs.push({j,dir}); } }
      else if(q.acc==null){ if(dir===dd){ q.acc=j; q.accDir=dd; } else { dec=null; } } } });
  const sig=new Map(); insts.forEach(q=>{ if(q.acc!=null) sig.set(q.acc,q.accDir); });
  const L=insts[insts.length-1]; let dash=null;
  if(L&&L.end>=n-1){
    const lc=c[n-1].close, above=lc>L.hi, below=lc<L.lo; let buy=0,tot=0;
    for(let j=Math.max(0,n-20);j<n;j++){ const x=c[j], v=x.volume||1; tot+=v; if(x.close>=x.open) buy+=v; }
    const bp=tot?Math.round(buy/tot*100):50, accUp=L.accDir===1&&above, accDn=L.accDir===-1&&below;
    const inW=L.i1+1<n&&(c[n-1].time-c[L.i1+1].time)<win*60, bld=L.building;
    const regime=bld?'Building':(above||below)?'Expansion':(L.ratio<.7?'Compression':'Balance');
    const bias=above?['Bullish',IB_UP]:below?['Bearish',IB_DN]:lc>=L.mid?['Lean Bullish','#7fd9c0']:['Lean Bearish','#f59aa5'];
    const phase=bld?'IB Building':(accUp||accDn)?'Acceptance':inW?'Auction':'Rotation';
    const auc=bld?['IB forming',IB_NEU]:above?(accUp?['Accepted Above',IB_UP]:['Testing Above',IB_NEU]):below?(accDn?['Accepted Below',IB_DN]:['Testing Below',IB_NEU]):
      (L.brokeUp&&L.brokeDn)?['Two-sided',IB_NEU]:L.brokeUp?['Rejected Above',IB_DN]:L.brokeDn?['Rejected Below',IB_UP]:['Inside IB',IB_NEU];
    const pr=bp>=50?['BUY '+bp+'%',IB_UP]:['SELL '+(100-bp)+'%',IB_DN];
    let s=0; if(accUp||accDn) s++; if(L.ratio>=1) s++; if((above&&bp>=55)||(below&&bp<=45)) s++; if(L.decs.length) s++;
    const ql=bld?['-',IB_NEU]:s>=3?['Strong',IB_UP]:s===2?['Moderate','#ff9800']:['Weak',IB_DN];
    let nx; if(bld) nx='Wait for the IB to close';
    else if(accUp) nx='Retest '+ibFmt(L.hi)+' (\u0394'+ibFmt(lc-L.hi)+')\nInvalidation <'+ibFmt(L.hi);
    else if(accDn) nx='Retest '+ibFmt(L.lo)+' (\u0394'+ibFmt(L.lo-lc)+')\nInvalidation >'+ibFmt(L.lo);
    else if(above) nx='Need 2nd close above '+ibFmt(L.hi); else if(below) nx='Need 2nd close below '+ibFmt(L.lo);
    else nx='Break '+ibFmt(L.hi)+' / '+ibFmt(L.lo)+'\nNo acceptance yet';
    dash=[['REGIME',regime,IB_NEU],['BIAS',bias[0],bias[1]],['PHASE',phase,IB_NEU],['AUCTION',auc[0],auc[1]],['PRESSURE',pr[0],pr[1]],['QUALITY',ql[0],ql[1]],['NEXT',nx,IB_NEU]]; }
  return {insts,dash,sig,off:false}; }
const ibCache={};
function ibRun(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,l.volume,Z.ibStart,Z.ibEnd,Z.ibTz,Z.ibWin,tf[2],tf[3]].join('|');
  const m=ibCache[Z.sid]; if(m&&m.k===key) return m.r; const r=ibCompute(c,Z); ibCache[Z.sid]={k:key,r}; return r; }
function ibDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<10) return; const r=ibRun(c,Z); if(!r||r.off) return; const n=c.length, fs=IB_FS[Z.ibSize]||11;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle'; cx.textAlign='left'; cx.font=fs+'px system-ui';
  const col=Z.ibCol||'#2962ff', shown=r.insts.slice(-3);
  shown.forEach((q,k)=>{ const isLast=q===r.insts[r.insts.length-1], yH=Y(q.hi), yL=Y(q.lo); if(yH==null||yL==null) return;
    let x0=X(q.i0); if(x0==null) x0=0; let x1=X(q.i1); if(x1==null) x1=x0; let xe=X(Math.min(q.end,n-1)); if(xe==null) xe=W; if(isLast&&q.end>=n-1) xe+=22; if(xe<0||x0>W) return;
    cx.globalAlpha=1; cx.fillStyle=ibRgba(col,.12); cx.fillRect(x0,Math.min(yH,yL),Math.max(1,x1-x0),Math.abs(yL-yH)); cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(x0,Math.min(yH,yL),Math.max(1,x1-x0),Math.abs(yL-yH));
    cx.setLineDash([2,3]); [q.hi,q.lo].forEach(p=>{ const y=Y(p); if(y==null) return; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(xe,y); cx.stroke(); });
    if(Z.ibMid!=='Off'){ const y=Y(q.mid); if(y!=null){ cx.strokeStyle=Z.ibMidCol||'#787b86'; cx.setLineDash([8,6]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(xe,y); cx.stroke(); } }
    if(Z.ibProj==='On'&&isLast){ cx.strokeStyle=Z.ibProjCol||'#ff9800'; cx.setLineDash([2,3]); [[1,1],[2,1],[1,-1],[2,-1]].forEach(([m,sg])=>{ const p=sg>0?q.hi+q.rng*m:q.lo-q.rng*m, y=Y(p); if(y==null) return; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(xe,y); cx.stroke(); cx.fillStyle=Z.ibProjCol||'#ff9800'; cx.fillText((sg>0?'IBH':'IBL')+' '+(sg>0?'+':'-')+m+'x \u00b7 '+ibFmt(p),xe+4,y); }); }
    cx.setLineDash([]); if(isLast||k===shown.length-2){ cx.fillStyle=col; const lx=xe+4; if(lx<W-20){ cx.fillText('IBH \u00b7 '+ibFmt(q.hi),lx,yH); cx.fillStyle=Z.ibMidCol||'#787b86'; if(Z.ibMid!=='Off'){ const y=Y(q.mid); if(y!=null) cx.fillText('IBM \u00b7 '+ibFmt(q.mid),lx,y); } cx.fillStyle=col; cx.fillText('IBL \u00b7 '+ibFmt(q.lo),lx,yL); } } });
  if(Z.ibDec==='On') shown.forEach(q=>q.decs.forEach(dc=>{ const x=X(dc.j), b=c[dc.j]; if(x==null||!b) return; const xp=X(dc.j-1), bw=Math.max(2,((xp!=null?x-xp:6))*.7), cc=dc.dir>0?(Z.ibUp||IB_UP):(Z.ibDn||IB_DN), yo=Y(b.open), yc=Y(b.close), yh=Y(b.high), yl=Y(b.low); if(yo==null||yc==null||yh==null||yl==null) return;
    cx.globalAlpha=1; cx.strokeStyle=cc; cx.fillStyle=cc; cx.lineWidth=1; cx.beginPath(); cx.moveTo(x,yh); cx.lineTo(x,yl); cx.stroke(); cx.fillRect(x-bw/2,Math.min(yo,yc),bw,Math.max(1,Math.abs(yc-yo))); }));
  if(Z.ibDash!==false&&r.dash){ const rows=r.dash, pad=6, lh=fs+7; cx.font=fs+'px system-ui'; let w1=0,w2=0; rows.forEach(rw=>{ w1=Math.max(w1,cx.measureText(rw[0]).width); rw[1].split('\n').forEach(t=>{ w2=Math.max(w2,cx.measureText(t).width); }); });
    const wTot=w1+w2+pad*4, hs=rows.map(rw=>rw[1].split('\n').length*lh-(rw[1].split('\n').length>1?4:0)), hTot=hs.reduce((a,b)=>a+b,0), x0=Math.max(2,W-wTot-6), y0=6;
    cx.globalAlpha=.78; cx.fillStyle='#000'; cx.fillRect(x0,y0,wTot,hTot); cx.globalAlpha=1; cx.strokeStyle='#2a2e39'; cx.lineWidth=1; cx.strokeRect(x0,y0,wTot,hTot);
    let y=y0; rows.forEach((rw,i)=>{ const h=hs[i]; if(i){ cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x0+wTot,y); cx.stroke(); }
      cx.fillStyle='#d1d4dc'; cx.textAlign='left'; cx.fillText(rw[0],x0+pad,y+h/2); const ls=rw[1].split('\n'); cx.fillStyle=rw[2]; cx.textAlign='center'; ls.forEach((t,j)=>cx.fillText(t,x0+pad*2+w1+(w2+pad*2)/2,y+(j+.5)*(h/ls.length))); y+=h; }); }
  cx.globalAlpha=1; cx.restore(); }
STRATS.ibauc={label:'IBAUC \u00b7 Initial Balance (IBH / IBM / IBL) with Auction Intelligence dashboard',short:'IBAUC',own:true,
  defs:{limit:false,useSl:false,ibStart:'09:30',ibEnd:'10:30',ibTz:'America/New_York',ibCol:'#2962ff',ibMid:'On',ibMidCol:'#787b86',ibProj:'Off',ibProjCol:'#ff9800',ibDash:true,ibSize:'Small',ibWin:30,ibDec:'Off',ibUp:'#089981',ibDn:'#f23645',ibSig:false},
  inputs:(b,d)=>{
    fld(b,d,'ibStart','txt','Initial Balance start (HH:MM)'); fld(b,d,'ibEnd','txt','Initial Balance end (HH:MM)'); fld(b,d,'ibTz','sel','Session timezone',{opts:IB_TZ});
    fld(b,d,'ibCol','col','Initial Balance lines colour'); fld(b,d,'ibMid','sel','Initial Balance midpoint',{opts:['On','Off']}); fld(b,d,'ibMidCol','col','Midpoint colour');
    fld(b,d,'ibProj','sel','Initial Balance projections',{opts:['Off','On']}); fld(b,d,'ibProjCol','col','Projections colour');
    fld(b,d,'ibDash','chk','Auction Intelligence dashboard'); fld(b,d,'ibSize','sel','Dashboard size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'ibWin','sel','Auction window (minutes)',{opts:['15','30','45','60','90','120'],num:true});
    fld(b,d,'ibDec','sel','Auction decision candles',{opts:['Off','On']}); fld(b,d,'ibUp','col','Decision candle up colour'); fld(b,d,'ibDn','col','Decision candle down colour');
    fld(b,d,'ibSig','chk','BUY / SELL when price is accepted outside the IB (2 closes above IBH = BUY, below IBL = SELL)'); },
  sig:(c,i,n,Z)=>{ if(!Z.ibSig||c.length<10) return 0; const r=ibRun(c,Z); if(!r||r.off) return 0; return r.sig.get(i)||0; }};
try{ DESC.ibauc='Strategy \u00b7 Initial Balance IBH / IBM / IBL with Auction Intelligence dashboard, decision candles and optional accepted-break BUY / SELL'; }catch(e){}
{ const _iD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='ibaucview') return ibDraw(d,X,Y,W,H); return _iD.apply(this,arguments); };
  const _iR=recomputeExtras; recomputeExtras=function(){ _iR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='ibauc'&&stVis(Z)) scriptBoxes.push({type:'ibaucview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('ibauc strategy failed',err); window.__ibaucErr=err; }


// =====================================================================================
// [ssm] STRATEGY · "Sweep MSS Order Block Setup" (School of Trade model)   (self-contained: every name starts with ssm / SSM)
// Bearish chain (mirrored for bullish): MSS (close breaks the swing low before the last swing high) -> that high candle is the
// ORDER BLOCK -> SWEEP (a lower swing low is taken out) -> IDM (first pullback high) -> BOS -> TARGET (lowest low) ->
// ACCUMULATION (tight range above the target) -> price returns into the ORDER BLOCK and rejects = SELL (target = TARGET,
// stop = above the order block). Bullish is the exact mirror and gives BUY.
// Hooks: STRATS.ssm + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const SSM_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const ssmRgba=(h,a)=>{ const v=parseInt(String(h||'#f23645').replace('#','').slice(0,6),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; };
function ssmAtr(cs){ const o=new Array(cs.length).fill(0); let p=null; for(let i=0;i<cs.length;i++){ const x=cs[i], tr=i?Math.max(x.h-x.l,Math.abs(x.h-cs[i-1].c),Math.abs(x.l-cs[i-1].c)):x.h-x.l; p=p==null?tr:(p*13+tr)/14; o[i]=p; } return o; }
// cs: candles already mirrored so the machine always looks for the bearish chain
function ssmMachine(cs,Z){
  const n=cs.length, L=Math.max(2,Math.round(Z.ssmL)||5), AB=Math.max(4,Math.round(Z.ssmAcc)||8), atr=ssmAtr(cs), PH=[], PL=[], out=[], sig=new Map(); let cur=null, usedH=-1;
  for(let t=0;t<n;t++){
    const k=t-L;
    if(k>=L){ let ih=true, il=true; for(let j=k-L;j<=k+L;j++){ if(j===k) continue; if(j<k){ if(cs[j].h>=cs[k].h) ih=false; if(cs[j].l<=cs[k].l) il=false; } else { if(cs[j].h>cs[k].h) ih=false; if(cs[j].l<cs[k].l) il=false; } }
      if(ih){ PH.push({i:k,p:cs[k].h}); if(cur&&cur.idm==null&&k>cur.mssI) cur.idm={i:k,p:cs[k].h}; }
      if(il){ PL.push({i:k,p:cs[k].l}); if(cur&&cur.idm&&cur.bosL==null&&k>cur.idm.i) cur.bosL={i:k,p:cs[k].l}; } }
    const x=cs[t], a=atr[t]||0;
    if(!cur){
      if(t<2||!PH.length) continue; const lh=PH[PH.length-1]; if(lh.i===usedH||t-lh.i>60) continue;
      let ll=null, lx=-1; for(let q=PL.length-1;q>=0;q--) if(PL[q].i<lh.i){ ll=PL[q]; lx=q; break; } if(!ll) continue;
      if(!(x.c<ll.p)) continue; let first=true; for(let j=lh.i;j<t;j++) if(cs[j].c<ll.p){ first=false; break; } if(!first) continue;
      let sw=null; for(let q=Math.max(0,lx-5);q<lx;q++) if(PL[q].p<ll.p&&(!sw||PL[q].p<sw.p)) sw=PL[q];
      const hb=cs[lh.i], top=hb.h; let bot=Math.min(hb.o,hb.c); if(a&&top-bot>2*a) bot=top-2*a;
      cur={mssI:t,pl:ll,ob:{i0:lh.i,top,bot},sw:sw,swT:(sw&&Z.ssmNeedSw)?null:t,idm:null,bosL:null,bosT:null,tgt:null,acc:null,sigI:null,end:null,state:'live'}; out.push(cur); usedH=lh.i; }
    if(cur){
      if(x.c>cur.ob.top||t-cur.mssI>(Z.ssmMax||200)){ cur.state='fail'; cur.end=t; cur=null; continue; }
      if(cur.swT==null&&x.c<cur.sw.p) cur.swT=t;
      if(cur.bosL&&cur.bosT==null&&x.c<cur.bosL.p) cur.bosT=t;
      if(cur.swT!=null&&t>=cur.swT){
        if(!cur.tgt||x.l<cur.tgt.p){ cur.tgt={i:t,p:x.l}; cur.acc=null; }
        else if(!cur.acc&&t-cur.tgt.i>=AB){ let hi=-Infinity, lo=Infinity; for(let j=t-AB+1;j<=t;j++){ if(cs[j].h>hi) hi=cs[j].h; if(cs[j].l<lo) lo=cs[j].l; }
          if(lo>=cur.tgt.p&&hi<cur.ob.bot&&(hi-lo)<=(Z.ssmK||3.5)*a) cur.acc={i0:t-AB+1,i1:t,hi,lo}; }
        else if(cur.acc&&x.h<=cur.acc.hi&&x.l>=cur.acc.lo) cur.acc.i1=t;
        if(cur.acc&&t>cur.acc.i1&&x.h>=cur.ob.bot){
          if(x.c<=cur.ob.top&&x.c<x.o){ cur.sigI=t; cur.state='sig'; cur.end=t; cur.sl=cur.ob.top+(Z.ssmBuf||0)*a; sig.set(t,1); cur=null; }
          else if(x.c>cur.ob.top){ cur.state='fail'; cur.end=t; cur=null; } } } } }
  return {setups:out,sig}; }
const ssmCache={};
function ssmRun(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,Z.ssmDir,Z.ssmL,Z.ssmAcc,Z.ssmK,Z.ssmMax,Z.ssmNeedSw,Z.ssmBuf].join('|');
  const m=ssmCache[Z.sid]; if(m&&m.k===key) return m.r; const all=[], sig=new Map(); const sl=c.length>6000?c.length-6000:0, cc=sl?c.slice(sl):c;
  [[1,'Sell only'],[-1,'Buy only']].forEach(([s,only])=>{ if(Z.ssmDir===only) { /* wrong side hidden */ } if(Z.ssmDir==='Both'||Z.ssmDir!==only){ /* keep */ } });
  [1,-1].forEach(s=>{ if(Z.ssmDir==='Sell only'&&s===-1) return; if(Z.ssmDir==='Buy only'&&s===1) return;
    const cs=cc.map(x=>s===1?{o:x.open,h:x.high,l:x.low,c:x.close}:{o:-x.open,h:-x.low,l:-x.high,c:-x.close}), r=ssmMachine(cs,Z);
    r.setups.forEach(q=>{ q.s=s; q.off=sl; all.push(q); }); r.sig.forEach((v,i)=>{ sig.set(i+sl,s===1?-1:1); }); });
  all.sort((a,b)=>a.mssI-b.mssI); const r={setups:all,sig}; ssmCache[Z.sid]={k:key,r}; return r; }
function ssmDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<30) return; const r=ssmRun(c,Z); if(!r) return; const n=c.length, fs=SSM_FS[Z.ssmSize]||10, lc=Z.ssmLine||'#d1d4dc';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle'; cx.textAlign='center'; cx.font=fs+'px system-ui';
  const xi=(i,f)=>{ const v=X(Math.max(0,Math.min(n-1,i))); return v==null?f:v; };
  const lab=(t,x,y)=>{ cx.fillStyle='#fff'; cx.globalAlpha=.95; cx.fillText(t,x,y); cx.globalAlpha=1; };
  const hl=(p,i0,i1,col,dash)=>{ const y=Y(p); if(y==null) return null; const a=xi(i0+(0),0), b=xi(i1,W); cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(a,y); cx.lineTo(b,y); cx.stroke(); cx.setLineDash([]); return {a,b,y}; };
  r.setups.slice(-(Math.max(1,Math.round(Z.ssmN)||4))).forEach(q=>{ const s=q.s, o=q.off, P=v=>s*v, col=s===1?(Z.ssmBear||'#f23645'):(Z.ssmBull||'#089981'), end=q.sigI!=null?q.sigI:(q.end!=null?q.end:n-1-o), E=end+o;
    const ob=q.ob, yT=Y(P(ob.top)), yB=Y(P(ob.bot));
    if(yT!=null&&yB!=null){ const a=xi(ob.i0+o,0), b=q.state==='live'?xi(n-1,W)+30:xi(E,W); cx.fillStyle=ssmRgba(col,.22); cx.fillRect(a,Math.min(yT,yB),Math.max(2,b-a),Math.max(2,Math.abs(yB-yT))); cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(a,Math.min(yT,yB),Math.max(2,b-a),Math.max(2,Math.abs(yB-yT))); if(Z.ssmLbl!==false) lab('ORDER BLOCK',(a+b)/2,(yT+yB)/2); }
    if(Z.ssmLbl===false) return;
    const m=hl(P(q.pl.p),q.pl.i+o,q.mssI+o,lc); if(m) lab('MSS',(m.a+m.b)/2,m.y+(s===1?-fs:fs));
    if(q.sw){ const w=hl(P(q.sw.p),q.sw.i+o,(q.swT!=null?q.swT:q.mssI+20)+o,lc); if(w) lab('SWEEP',(w.a+w.b)/2,w.y+(s===1?fs:-fs)); }
    if(q.idm){ const e=q.bosT!=null?q.bosT:q.idm.i+12, h=hl(P(q.idm.p),q.idm.i+o,e+o,lc); if(h) lab('IDM',(h.a+h.b)/2,h.y+(s===1?-fs:fs)); }
    if(q.bosL){ const e=q.bosT!=null?q.bosT:q.bosL.i+12, h=hl(P(q.bosL.p),q.bosL.i+o,e+o,lc); if(h) lab('BOS',(h.a+h.b)/2,h.y+(s===1?-fs:fs)); }
    if(q.acc){ const yh=Y(P(q.acc.hi)), yl=Y(P(q.acc.lo)); if(yh!=null&&yl!=null){ const a=xi(q.acc.i0+o,0), b=xi(q.acc.i1+o,W); cx.strokeStyle='#fff'; cx.lineWidth=1; cx.strokeRect(a,Math.min(yh,yl),Math.max(2,b-a),Math.max(2,Math.abs(yl-yh))); lab('ACCUMULATION',(a+b)/2,Math.max(yh,yl)+fs+2); } }
    if(q.tgt){ const t=hl(P(q.tgt.p),q.tgt.i+o,E+(q.state==='live'?0:12),lc); if(t) lab('TARGET',Math.min(W-30,(t.a+t.b)/2),t.y+(s===1?fs:-fs)); }
    if(q.sigI!=null&&Z.ssmTpSl!==false&&q.tgt){ const a=q.sigI+o, e=a+25, sl=hl(P(q.sl),a,e,'#f23645',[4,3]); const tp=hl(P(q.tgt.p),a,e,'#089981',[4,3]); if(sl) lab('SL',sl.b+12,sl.y); if(tp) lab('TP',tp.b+12,tp.y);
      const yS=Y(P(q.sl)), yP=Y(P(q.tgt.p)); if(yS!=null&&yP!=null&&sl&&tp){ cx.fillStyle='rgba(129,196,255,.14)'; cx.fillRect(sl.a,Math.min(yS,yP),sl.b-sl.a,Math.abs(yP-yS)); } } });
  cx.globalAlpha=1; cx.restore(); }
STRATS.ssm={label:'Sweep MSS Order Block \u00b7 MSS, sweep, IDM, BOS, target, accumulation, order block retest (SELL / BUY)',short:'Sweep MSS OB Setup',own:true,
  defs:{limit:false,useSl:false,ssmDir:'Both',ssmL:5,ssmAcc:8,ssmK:3.5,ssmMax:200,ssmNeedSw:true,ssmBuf:0.1,ssmBear:'#f23645',ssmBull:'#089981',ssmLine:'#d1d4dc',ssmLbl:true,ssmTpSl:true,ssmSize:'Tiny',ssmN:4,ssmSig:true},
  inputs:(b,d)=>{
    fld(b,d,'ssmDir','sel','Trade direction',{opts:['Both','Sell only','Buy only']}); fld(b,d,'ssmL','num','Swing pivot length',{min:2,max:20,step:1});
    fld(b,d,'ssmNeedSw','chk','Require the sweep (lower swing low taken out)'); fld(b,d,'ssmAcc','num','Accumulation bars',{min:4,max:40,step:1}); fld(b,d,'ssmK','num','Max accumulation range (x ATR)',{min:1,max:10,step:0.5});
    fld(b,d,'ssmMax','num','Max bars from MSS to entry',{min:30,max:1000,step:10}); fld(b,d,'ssmBuf','num','Stop buffer above / below order block (ATR)',{min:0,max:3,step:0.05});
    fld(b,d,'ssmBear','col','Sell setup colour'); fld(b,d,'ssmBull','col','Buy setup colour'); fld(b,d,'ssmLine','col','Structure line colour');
    fld(b,d,'ssmLbl','chk','Show MSS / SWEEP / IDM / BOS / TARGET labels'); fld(b,d,'ssmTpSl','chk','Show SL / TP on signal'); fld(b,d,'ssmSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']});
    fld(b,d,'ssmN','num','Setups shown',{min:1,max:20,step:1}); fld(b,d,'ssmSig','chk','BUY / SELL signals on the order block retest'); },
  sig:(c,i,n,Z)=>{ if(Z.ssmSig===false||c.length<30) return 0; const r=ssmRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.ssm='Strategy \u00b7 MSS + sweep + IDM + BOS + target + accumulation, then SELL / BUY on the order block retest'; }catch(e){}
{ const _sD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='ssmview') return ssmDraw(d,X,Y,W,H); return _sD.apply(this,arguments); };
  const _sR=recomputeExtras; recomputeExtras=function(){ _sR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='ssm'&&stVis(Z)) scriptBoxes.push({type:'ssmview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('ssm strategy failed',err); window.__ssmErr=err; }


// =====================================================================================
// [sbk] STRATEGY · "Support Break"   (self-contained: every name starts with sbk / SBK)
// Market-structure setup: a RED correction leg (lower highs down to a higher low) -> the first minor resistance formed after that
// low = the GREEN "Support Break" level -> price closes above it = BUY -> BLUE impulse leg runs up to the next peak, then the
// next red correction starts and the chain repeats. Mirror image (resistance break after a rally correction) gives SELL.
// Hooks: STRATS.sbk + draw + recomputeExtras (same pattern as the other strategies). Nothing existing is edited.
// =====================================================================================
try{
const SBK_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
function sbkAtr(cs){ const o=new Array(cs.length).fill(0); let p=null; for(let i=0;i<cs.length;i++){ const x=cs[i], tr=i?Math.max(x.h-x.l,Math.abs(x.h-cs[i-1].c),Math.abs(x.l-cs[i-1].c)):x.h-x.l; p=p==null?tr:(p*13+tr)/14; o[i]=p; } return o; }
// cs: candles already mirrored so the machine always looks for the BUY chain
function sbkMachine(cs,Z){
  const n=cs.length, L=Math.max(2,Math.round(Z.sbkL)||4), back=Math.max(10,Math.round(Z.sbkBack)||60), maxB=Math.max(10,Math.round(Z.sbkMax)||80),
    drop=Z.sbkDrop==null?2:+Z.sbkDrop, rr=Z.sbkRR==null?2:+Z.sbkRR, buf=Z.sbkBuf==null?0.1:+Z.sbkBuf, atr=sbkAtr(cs), PH=[], PL=[], out=[], sig=new Map();
  let cur=null, last=null;
  for(let t=0;t<n;t++){
    const k=t-L, x=cs[t];
    if(k>=L){ let ih=true, il=true; for(let j=k-L;j<=k+L;j++){ if(j===k) continue; if(j<k){ if(cs[j].h>=cs[k].h) ih=false; if(cs[j].l<=cs[k].l) il=false; } else { if(cs[j].h>cs[k].h) ih=false; if(cs[j].l<cs[k].l) il=false; } }
      if(ih){ PH.push({i:k,p:cs[k].h}); if(cur&&cur.brk==null&&k>cur.pl.i&&(!cur.lvl||cs[k].h>cur.lvl.p)) cur.lvl={i:k,p:cs[k].h}; }
      if(il){ const q={i:k,p:cs[k].l,hh:cs[k].h}, pi=PL.length; PL.push(q);
        if(cur&&cur.brk==null&&q.p<cur.pl.p){ cur.state='fail'; cur.end=t; cur=null; }
        if(!cur){ let bnd=-1; for(let m=pi-1;m>=0;m--) if(PL[m].p<q.p){ bnd=PL[m].i; break; }
          let ph=null; for(let m=PH.length-1;m>=0;m--){ const h=PH[m]; if(h.i>=q.i) continue; if(h.i<=bnd||q.i-h.i>back) break; if(!ph||h.p>ph.p) ph=h; }
          if(ph&&ph.p-q.p>=drop*(atr[q.i]||0)&&q.i-ph.i>=2){ let pb=null; for(let m=pi-1;m>=0;m--) if(PL[m].i<ph.i){ pb=PL[m]; break; }
            if(!Z.sbkHL||!pb||q.p>pb.p){ cur={pl:q,top:ph,lvl:null,brk:null,pk:null,state:'live',end:null,sl:null,tp:null,en:null}; out.push(cur); last=null; } } } } }
    if(last&&t>last.brk&&x.h>last.pk.p) last.pk={i:t,p:x.h};
    if(cur&&cur.brk==null){
      if(cur.lvl&&x.c>cur.lvl.p&&(!Z.sbkBull||x.c>x.o)){ const a=atr[t]||0; cur.brk=t; cur.state='sig'; cur.end=t; cur.sl=cur.pl.p-buf*a; cur.en=x.c; cur.tp=x.c+rr*(x.c-cur.sl); cur.pk={i:t,p:x.h}; sig.set(t,1); last=cur; cur=null; }
      else if(x.c>cur.top.p||t-cur.pl.i>maxB){ cur.state='fail'; cur.end=t; cur=null; } } }
  return {setups:out,sig}; }
const sbkCache={};
function sbkRun(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,Z.sbkDir,Z.sbkL,Z.sbkDrop,Z.sbkHL,Z.sbkBull,Z.sbkMax,Z.sbkBack,Z.sbkRR,Z.sbkBuf].join('|');
  const m=sbkCache[Z.sid]; if(m&&m.k===key) return m.r; const all=[], sig=new Map(); const sl=c.length>6000?c.length-6000:0, cc=sl?c.slice(sl):c;
  [1,-1].forEach(s=>{ if(Z.sbkDir==='Sell only'&&s===1) return; if(Z.sbkDir==='Buy only'&&s===-1) return;
    const cs=cc.map(x=>s===1?{o:x.open,h:x.high,l:x.low,c:x.close}:{o:-x.open,h:-x.low,l:-x.high,c:-x.close}), r=sbkMachine(cs,Z);
    r.setups.forEach(q=>{ q.s=s; q.off=sl; all.push(q); }); r.sig.forEach((v,i)=>{ sig.set(i+sl,s); }); });
  all.sort((a,b)=>a.pl.i-b.pl.i); const r={setups:all,sig}; sbkCache[Z.sid]={k:key,r}; return r; }
function sbkDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<30) return; const r=sbkRun(c,Z); if(!r) return; const n=c.length, fs=SBK_FS[Z.sbkSize]||7.5, ext=Math.max(0,Math.round(Z.sbkExt==null?20:Z.sbkExt));
  const cR=Z.sbkRed||'#f23645', cB=Z.sbkBlue||'#2962ff', cG=Z.sbkGreen||'#43a047';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle'; cx.textAlign='center';
  const xi=(i,f)=>{ const v=X(Math.max(0,Math.min(n-1,i))); return v==null?f:v; };
  const seg=(i0,p0,i1,p1,col,w)=>{ const y0=Y(p0), y1=Y(p1); if(y0==null||y1==null) return; cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash([]); cx.beginPath(); cx.moveTo(xi(i0,0),y0); cx.lineTo(xi(i1,W),y1); cx.stroke(); };
  const hl=(p,i0,i1,col,w,dash)=>{ const y=Y(p); if(y==null) return null; const a=xi(i0,0), b=xi(i1,W)+(i1>=n-1?24:0); cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(a,y); cx.lineTo(b,y); cx.stroke(); cx.setLineDash([]); return {a,b,y}; };
  r.setups.filter(q=>q.state!=='fail').slice(-(Math.max(1,Math.round(Z.sbkN)||6))).forEach(q=>{ const s=q.s, o=q.off, P=v=>s*v, sell=s===-1;
    seg(q.top.i+o,P(q.top.p),q.pl.i+o,P(q.pl.hh),cR,2);
    if(q.lvl){ const i0=Math.max(q.pl.i,q.lvl.i-8)+o, i1=q.brk!=null?Math.min(n-1,q.brk+o+ext):n-1, g=hl(P(q.lvl.p),i0,i1,cG,1.5);
      if(g&&Z.sbkLbl!==false){ cx.font=fs+'px system-ui'; cx.fillStyle='#b2b5be'; cx.fillText(sell?'Resistance Break':'Support Break',Math.max(g.a+34,g.b-38),g.y-(sell?-fs-1:fs+1)); } }
    if(q.brk!=null){ if(q.pk) seg(q.pl.i+o,P(q.pl.p),q.pk.i+o,P(q.pk.p),cB,2);
      if(Z.sbkLbl!==false&&q.lvl){ const xb=xi(q.brk+o,W), yb=Y(P(q.lvl.p)); if(yb!=null){ const m=sell?1:-1, col=sell?cR:cG, fz=fs+5; cx.strokeStyle='#e8603c'; cx.fillStyle='#e8603c'; cx.lineWidth=3; cx.setLineDash([]);
          const x0=xb-30, y0=yb+m*28, x1=xb-3, y1=yb+m*3; cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y1); cx.stroke(); const an=Math.atan2(y1-y0,x1-x0); cx.beginPath(); cx.moveTo(x1+3*Math.cos(an),y1+3*Math.sin(an)); cx.lineTo(x1-7*Math.cos(an-.5),y1-7*Math.sin(an-.5)); cx.lineTo(x1-7*Math.cos(an+.5),y1-7*Math.sin(an+.5)); cx.closePath(); cx.fill();
          cx.font='bold '+fz+'px system-ui'; cx.fillStyle=col; cx.fillText(sell?'SELL':'BUY',x0-8,y0+m*(fz*0.6)); } }
 } });
  cx.globalAlpha=1; cx.restore(); }
STRATS.sbk={label:'Support Break \u00b7 red correction, green level, blue impulse, BUY / SELL on the break',short:'Support Break',own:true,
  defs:{limit:false,useSl:false,sbkDir:'Buy only',sbkL:4,sbkDrop:2,sbkHL:true,sbkBull:true,sbkMax:80,sbkBack:60,sbkRR:2,sbkBuf:0.1,sbkRed:'#f23645',sbkBlue:'#2962ff',sbkGreen:'#43a047',sbkLbl:true,sbkExt:20,sbkSize:'Small',sbkN:6,sbkSig:true},
  inputs:(b,d)=>{
    fld(b,d,'sbkDir','sel','Trade direction',{opts:['Buy only','Sell only','Both']}); fld(b,d,'sbkL','num','Swing pivot length',{min:2,max:20,step:1});
    fld(b,d,'sbkDrop','num','Min correction size (x ATR)',{min:0.5,max:10,step:0.5}); fld(b,d,'sbkHL','chk','Require higher low (lower high for sells)'); fld(b,d,'sbkBull','chk','Break candle must close in trade direction');
    fld(b,d,'sbkMax','num','Max bars from correction low to break',{min:10,max:500,step:5}); fld(b,d,'sbkBack','num','Look back for the correction start (bars)',{min:10,max:300,step:5});
        fld(b,d,'sbkRed','col','Correction leg colour'); fld(b,d,'sbkGreen','col','Support Break level colour'); fld(b,d,'sbkBlue','col','Impulse leg colour');
    fld(b,d,'sbkLbl','chk','Show BUY / SELL arrow and level label'); fld(b,d,'sbkExt','num','Level extension after break (bars)',{min:0,max:200,step:5});
    fld(b,d,'sbkSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']}); fld(b,d,'sbkN','num','Setups shown',{min:1,max:30,step:1}); fld(b,d,'sbkSig','chk','BUY / SELL signals on the break'); },
  sig:(c,i,n,Z)=>{ if(Z.sbkSig===false||c.length<30) return 0; const r=sbkRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.sbk='Strategy \u00b7 red correction leg, green Support Break level, blue impulse: BUY when price closes above the level'; }catch(e){}
{ const _bD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='sbkview') return sbkDraw(d,X,Y,W,H); return _bD.apply(this,arguments); };
  const _bR=recomputeExtras; recomputeExtras=function(){ _bR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='sbk'&&stVis(Z)) scriptBoxes.push({type:'sbkview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('sbk strategy failed',err); window.__sbkErr=err; }


// =====================================================================================
// [po3] STRATEGY · "PO3 Power of 3"   (self-contained: every name starts with po / PO)
// Bullish PO3 (default; mirrored for the optional bearish PO3): period OPEN -> ACCUMULATION (tight range near the open) -> MANIPULATION (false sweep
// of the accumulation low, ideally below the period open) -> price closes back above the accumulation low = BUY ->
// DISTRIBUTION (expansion up to the period high). Bearish PO3 is the exact mirror and gives SELL.
// Period = Day / Week / 8 Hours / 4 Hours / 1 Hour in a chosen time zone and start hour.
// Hooks: STRATS.po3 + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const PO_FS={Tiny:6,Small:7.5,Normal:9,Large:11};
const PO_TZ={'New York':'America/New_York','UTC':'UTC','London':'Europe/London','Nairobi':'Africa/Nairobi','Dubai':'Asia/Dubai','Tokyo':'Asia/Tokyo'};
const poRgba=(h,a)=>{ const v=parseInt(String(h||'#26c6da').replace('#','').slice(0,6),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; };
const poDF={}, poOC={};
function poOff(zone,t){ if(zone==='UTC') return 0; const b=Math.floor(t/3600), hk=zone+'|'+b; let v=poOC[hk]; if(v!==undefined) return v;
  let f=poDF[zone]; if(!f) f=poDF[zone]=new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
  const p={}; f.formatToParts(new Date(b*3600000)).forEach(x=>{ p[x.type]=+x.value; }); v=Date.UTC(p.year,p.month-1,p.day,p.hour%24,p.minute,p.second)/1000-b*3600;
  if(Object.keys(poOC).length>30000) Object.keys(poOC).forEach(k=>delete poOC[k]); poOC[hk]=v; return v; }
const PO_LEN={'1 Hour':3600,'4 Hours':14400,'8 Hours':28800,'Day':86400};
function poKey(t,Z){ const l=t+poOff(PO_TZ[Z.poTz]||'UTC',t), sh=Math.max(0,Math.min(23,Math.round(Z.poHr)||0))*3600;
  if(Z.poTf==='Week') return Math.floor((l-sh-345600)/604800); return Math.floor((l-sh)/(PO_LEN[Z.poTf]||86400)); }
function poAtr(cs){ const o=new Array(cs.length).fill(0); let p=null; for(let i=0;i<cs.length;i++){ const x=cs[i], tr=i?Math.max(x.h-x.l,Math.abs(x.h-cs[i-1].c),Math.abs(x.l-cs[i-1].c)):x.h-x.l; p=p==null?tr:(p*13+tr)/14; o[i]=p; } return o; }
// cs: candles already mirrored so the machine always looks for the bullish chain
function poMachine(cs,ks,Z){
  const n=cs.length, AB=Math.max(3,Math.round(Z.poAB)||6), K=Z.poK==null?3:+Z.poK, late=Z.poLate>0?Math.round(Z.poLate):1e9, depth=Z.poDepth==null?5:+Z.poDepth,
    maxMan=Math.max(3,Math.round(Z.poMan)||40), rr=Z.poRR==null?2:+Z.poRR, buf=Z.poBuf==null?0.1:+Z.poBuf, atr=poAtr(cs), out=[], sig=new Map(); let st=null;
  for(let t=0;t<n;t++){ const x=cs[t], a=atr[t]||0;
    if(!st||ks[t]!==st.key){ st={key:ks[t],i0:t,iE:t,o:x.o,acc:null,man:null,state:'wait',sigI:null,dh:null,di:null,sl:null,tp:null,en:null}; out.push(st); }
    st.iE=t;
    if(st.state==='wait'){ const s0=t-AB+1;
      if(s0>=st.i0){ if(s0-st.i0>late) st.state='fail'; else { let hi=-Infinity, lo=Infinity; for(let j=s0;j<=t;j++){ if(cs[j].h>hi) hi=cs[j].h; if(cs[j].l<lo) lo=cs[j].l; } if(hi-lo<=K*a){ st.acc={i0:s0,i1:t,hi,lo}; st.state='acc'; } } } }
    else if(st.state==='acc'){ const A=st.acc;
      if(x.l<A.lo){ st.man={i0:t,lo:x.l}; st.state='man'; } else if(x.c>A.hi) st.state='fail'; else if(x.h<=A.hi) A.i1=t; }
    if(st.state==='man'){ const M=st.man, A=st.acc; if(x.l<M.lo) M.lo=x.l;
      if(x.c<A.lo-depth*a||t-M.i0>maxMan) st.state='fail';
      else if(x.c>A.lo&&x.c>x.o&&(!Z.poOpen||M.lo<st.o)){ st.state='sig'; st.sigI=t; st.en=x.c; st.sl=M.lo-buf*a; st.tp=x.c+rr*(x.c-st.sl); st.dh=x.h; st.di=t; sig.set(t,1); } }
    else if(st.state==='sig'&&t>st.sigI){ if(x.h>st.dh){ st.dh=x.h; st.di=t; } } }
  return {setups:out,sig}; }
const poCache={};
function poRun(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,Z.poDir,Z.poTf,Z.poTz,Z.poHr,Z.poAB,Z.poK,Z.poLate,Z.poDepth,Z.poMan,Z.poOpen,Z.poRR,Z.poBuf].join('|');
  const m=poCache[Z.sid]; if(m&&m.k===key) return m.r; const all=[], sig=new Map(); const sl=c.length>6000?c.length-6000:0, cc=sl?c.slice(sl):c, ks=cc.map(x=>poKey(x.time,Z));
  [1,-1].forEach(s=>{ if(Z.poDir==='Sell only'&&s===1) return; if(Z.poDir==='Buy only'&&s===-1) return;
    const cs=cc.map(x=>s===1?{o:x.open,h:x.high,l:x.low,c:x.close}:{o:-x.open,h:-x.low,l:-x.high,c:-x.close}), r=poMachine(cs,ks,Z);
    r.setups.forEach(q=>{ q.s=s; q.off=sl; all.push(q); }); r.sig.forEach((v,i)=>{ sig.set(i+sl,s); }); });
  all.sort((a,b)=>a.i0-b.i0); const r={setups:all,sig}; poCache[Z.sid]={k:key,r}; return r; }
function poDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<30) return; const r=poRun(c,Z); if(!r) return; const n=c.length, fs=PO_FS[Z.poSize]||7.5;
  const cA=Z.poAcc||'#26c6da', cM=Z.poManC||'#ff9800';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  const xi=(i,f)=>{ const v=X(Math.max(0,Math.min(n-1,i))); return v==null?f:v; };
  const box=(i0,i1,p0,p1,col,al)=>{ const y0=Y(p0), y1=Y(p1); if(y0==null||y1==null) return null; const a=xi(i0,0), b=Math.max(a+3,xi(i1,W)), t=Math.min(y0,y1), h=Math.max(2,Math.abs(y1-y0));
    cx.fillStyle=poRgba(col,al); cx.fillRect(a,t,b-a,h); cx.strokeStyle=poRgba(col,.9); cx.lineWidth=1; cx.setLineDash([]); cx.strokeRect(a,t,b-a,h); return {a,b,t,bt:t+h}; };
  const hl=(p,i0,i1,col,dash)=>{ const y=Y(p); if(y==null) return null; const a=xi(i0,0), b=xi(i1,W); cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(a,y); cx.lineTo(b,y); cx.stroke(); cx.setLineDash([]); return {a,b,y}; };
  const lab=(t,x,y,col,bold,al)=>{ cx.font=(bold?'bold ':'')+fs+'px system-ui'; cx.textAlign=al||'center'; cx.fillStyle=col||'#d1d4dc'; cx.fillText(t,x,y); };
  r.setups.filter(q=>q.state==='acc'||q.state==='man'||q.state==='sig').slice(-(Math.max(1,Math.round(Z.poN)||3))).forEach(q=>{ const s=q.s, o=q.off, P=v=>s*v, E=q.iE+o, A=q.acc, buy=s===1, M=q.man, tc=buy?(Z.poDist||'#4caf50'):(Z.poDistS||'#f23645');
    const bx=box(A.i0+o,A.i1+o,P(A.hi),P(A.lo),cA,.22); if(bx&&Z.poLbl!==false) lab('Accumulation',(bx.a+bx.b)/2,buy?bx.t-fs-1:bx.bt+fs+1,'#d1d4dc');
    if(Z.poLines!==false){ const op=hl(P(q.o),q.i0+o,E,'#9aa0a6',[2,3]); if(op&&Z.poLbl!==false) lab('Open',op.b-4,op.y+(buy?fs+1:-fs-1),'#9aa0a6',false,'right');
      if(M){ const lo=hl(P(M.lo),M.i0+o-2,E,'#9aa0a6',[2,3]); if(lo&&Z.poLbl!==false) lab(buy?'Low':'High',lo.b-4,lo.y+(buy?fs+1:-fs-1),'#9aa0a6',false,'right'); } }
    if(M){ const mi=q.sigI!=null?q.sigI+o:Math.min(E,n-1), mb=box(M.i0+o,mi,P(A.lo),P(M.lo),cM,.28); if(mb&&Z.poLbl!==false) lab('Manipulation',mb.a-3,(mb.t+mb.bt)/2,'#d1d4dc',false,'right'); }
    if(q.state==='sig'){
      if(q.dh>A.hi){ const db=box(q.sigI+o,E+(E>=n-1?12:0),P(A.lo),P(q.dh),tc,.2); if(db&&Z.poLbl!==false) lab('Distribution',(db.a+db.b)/2,(db.t+db.bt)/2,'#d1d4dc'); }
      if(Z.poLbl!==false){ const cb=c[q.sigI+o]; if(cb){ const y=Y(buy?cb.low:cb.high), xb=xi(q.sigI+o,W); if(y!=null) lab(buy?'\u25B2 BUY':'\u25BC SELL',xb,y+(buy?1:-1)*(fs+12),tc,true); } }
      if(Z.poTpSl!==false){ const a=q.sigI+o, e=a+25, sl=hl(P(q.sl),a,e,'#f23645',[4,3]), tp=hl(P(q.tp),a,e,'#089981',[4,3]); if(sl) lab('SL',sl.b+4,sl.y,'#fff',false,'left'); if(tp) lab('TP',tp.b+4,tp.y,'#fff',false,'left'); } } });
  cx.globalAlpha=1; cx.restore(); }
STRATS.po3={label:'PO3 Power of 3 \u00b7 accumulation, manipulation sweep, distribution (BUY / SELL)',short:'PO3 (Power of 3)',own:true,
  defs:{limit:false,useSl:false,poDir:'Buy only',poTf:'Day',poTz:'New York',poHr:0,poAB:6,poK:3,poLate:0,poDepth:5,poMan:40,poOpen:true,poRR:2,poBuf:0.1,poAcc:'#26c6da',poManC:'#ff9800',poDist:'#4caf50',poDistS:'#f23645',poLbl:true,poLines:true,poTpSl:true,poSize:'Small',poN:3,poSig:true},
  inputs:(b,d)=>{
    fld(b,d,'poDir','sel','Trade direction (Buy = Bullish PO3, Sell = Bearish PO3)',{opts:['Buy only','Both','Sell only']}); fld(b,d,'poTf','sel','Period (one PO3 per period)',{opts:['Day','Week','8 Hours','4 Hours','1 Hour']});
    fld(b,d,'poTz','sel','Period time zone',{opts:['New York','UTC','London','Nairobi','Dubai','Tokyo']}); fld(b,d,'poHr','num','Period start hour (0-23)',{min:0,max:23,step:1});
    fld(b,d,'poAB','num','Accumulation bars',{min:3,max:40,step:1}); fld(b,d,'poK','num','Max accumulation range (x ATR)',{min:1,max:10,step:0.5});
    fld(b,d,'poLate','num','Accumulation must start within N bars of open (0 = any)',{min:0,max:300,step:1}); fld(b,d,'poOpen','chk','Manipulation must sweep below (above for sells) the period open');
    fld(b,d,'poDepth','num','Max sweep depth before setup fails (x ATR)',{min:0.5,max:20,step:0.5}); fld(b,d,'poMan','num','Max bars for the sweep to reverse',{min:3,max:300,step:1});
    fld(b,d,'poRR','num','Take profit (R multiple)',{min:0.5,max:10,step:0.5}); fld(b,d,'poBuf','num','Stop buffer beyond the sweep (ATR)',{min:0,max:3,step:0.05});
    fld(b,d,'poAcc','col','Accumulation colour'); fld(b,d,'poManC','col','Manipulation colour'); fld(b,d,'poDist','col','Distribution colour (buy)'); fld(b,d,'poDistS','col','Distribution colour (sell)');
    fld(b,d,'poLbl','chk','Show labels'); fld(b,d,'poLines','chk','Show Open / Low / High lines'); fld(b,d,'poTpSl','chk','Show SL / TP on signal');
    fld(b,d,'poSize','sel','Label size',{opts:['Tiny','Small','Normal','Large']}); fld(b,d,'poN','num','Periods shown',{min:1,max:20,step:1}); fld(b,d,'poSig','chk','BUY / SELL signals when the sweep reverses'); },
  sig:(c,i,n,Z)=>{ if(Z.poSig===false||c.length<30) return 0; const r=poRun(c,Z); return r?(r.sig.get(i)||0):0; }};
try{ DESC.po3='Strategy \u00b7 Power of 3: accumulation near the open, manipulation sweep, then BUY / SELL into distribution'; }catch(e){}
{ const _pD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='poview') return poDraw(d,X,Y,W,H); return _pD.apply(this,arguments); };
  const _pR=recomputeExtras; recomputeExtras=function(){ _pR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='po3'&&stVis(Z)) scriptBoxes.push({type:'poview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('po3 strategy failed',err); window.__poErr=err; }

// =====================================================================================
// [sae] STRATEGY · "Strategy Analysis Tool"   (self-contained: every name starts with sae / SAE)
// S1 Liquidity Sweep + BOS (close) + FVG retrace · S2 Daily Open bias + sweep + BOS · S3 Fibonacci Golden Zone (0.618-0.786) + FVG
// Optional Confluence Mode (>= N independent strategies agree), rule-based 0-100 score, risk / position sizing, max daily loss,
// built-in backtest (signal on candle close, entry next open, spread + slippage + commission, SL-first when both hit in one candle).
// Hooks: STRATS.sae + draw + recomputeExtras + runOne wrapper. Nothing existing is edited.
// =====================================================================================
try{
const SAE_NAMES=['Liquidity Sweep + BOS + FVG','Daily Open','Fibonacci Golden Zone + FVG','Confluence (all three)'];
const SAE_SES={'All':null,'Asia':[0,8],'London':[7,16],'New York':[12,21]};
const SAE_KEYS=['saeStrat','saeDir','saeLen','saeStrong','saeBosWin','saeRetWin','saeBias','saeMinAgree','saeAgreeWin','saeMin','saeRR','saeBuf','saeTp','saeBal','saeRisk','saeTickSz','saeTickVal','saeMaxDay','saeStop','saeLev','saeLot','saeSpr','saeSlip','saeCom','saeBoth','saeFrom','saeTo','saeSes','saeDayHr','saeMinLeg','saeVidRef','saeVidEntry','saeVidTp','saeFibSl'];
const saeRg=(h,a)=>{ const v=parseInt(String(h).replace('#','').slice(0,6),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; };
const saeF=v=>v==null||!isFinite(v)?'-':Math.abs(v)>=100?v.toFixed(2):Math.abs(v)>=1?v.toFixed(4):v.toFixed(6);
const saeM=v=>(v<0?'-':'')+'$'+Math.abs(v).toFixed(2);
function saeAtr(c){ const o=new Array(c.length); let p=null; for(let i=0;i<c.length;i++){ const x=c[i], tr=i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low; p=p==null?tr:(p*13+tr)/14; o[i]=p; } return o; }

const saeFvg=(cs,k)=>k>=2&&cs[k-2].h<cs[k].l&&cs[k-1].c>cs[k-1].o?{k,lo:cs[k-2].h,hi:cs[k].l}:null;
// ---------- 1. structure / setups (uses only candles up to bar t) ----------
function saeScan(c,Z){
  const n=c.length, atr=saeAtr(c), dh=Math.round(Z.saeDayHr)||0, L=Math.max(2,Math.round(Z.saeLen)||5), buf=Z.saeBuf==null?0.1:+Z.saeBuf,
    strong=Z.saeStrong==null?0.6:+Z.saeStrong, bw=Math.round(Z.saeBosWin)||30, rw=Math.round(Z.saeRetWin)||40, minLeg=Z.saeMinLeg==null?2:+Z.saeMinLeg;
  const dk=c.map(x=>Math.floor((x.time-dh*3600)/86400)), dOpen=new Array(n), bias=new Array(n).fill(0), pO=new Array(n), pC=new Array(n), dS=new Array(n);
  { let cur=null, pv=null; for(let i=0;i<n;i++){ if(!cur||cur.k!==dk[i]){ pv=cur; cur={k:dk[i],o:c[i].open,c:c[i].close,i0:i}; } cur.c=c[i].close; dOpen[i]=cur.o; dS[i]=cur.i0; if(pv){ pO[i]=pv.o; pC[i]=pv.c; bias[i]=pv.c>pv.o?1:pv.c<pv.o?-1:0; } } }
  const cands=[], evs=[], fvgs=[], sweeps=[], boss=[], zones=[], invs=[], live=[];
  const mir=d=>c.map(x=>d===1?{o:x.open,h:x.high,l:x.low,c:x.close}:{o:-x.open,h:-x.low,l:-x.high,c:-x.close});
  const piv=(cs,t,SH,SL)=>{ const p=t-L; if(p<L) return; const q=cs[p]; let hh=true, ll=true;
    for(let j=p-L;j<=p+L;j++){ if(j===p) continue; const e=cs[j]; if(j<p){ if(e.h>=q.h) hh=false; if(e.l<=q.l) ll=false; } else { if(e.h>q.h) hh=false; if(e.l<q.l) ll=false; } }
    if(hh) SH.push({i:p,p:q.h}); if(ll) SL.push({i:p,p:q.l}); };
  const rng=(d,a,b)=>[Math.min(d*a,d*b),Math.max(d*a,d*b)];
  // d=1 bullish chain; d=-1 runs the same code on mirrored candles. mode 1 = Strategy 1, mode 2 = Strategy 2
  const mach=(d,mode)=>{ const cs=mir(d), SH=[], SL=[]; let st=null, lastSw=-1;
    const fvgAt=(k)=>saeFvg(cs,k);
    const setF=(f,t)=>{ st.fvg=f; const r=rng(d,f.lo,f.hi); st.fr={k:f.k,lo:r[0],hi:r[1],d,m:mode,end:null}; fvgs.push(st.fr); evs.push({i:t,t:'fvg',d,m:mode}); };
    const kill=(t,why)=>{ invs.push({t,d,why,m:mode}); if(st.fr&&st.fr.end==null) st.fr.end=t; st=null; };
    const emit=(t,a,ret)=>{ const f=st.fvg, z=f?rng(d,f.lo,f.hi):null;
      const en=d*cs[t].c, pc=pC[t]; let tp=null; if(mode===2&&Z.saeVidTp&&pc!=null) tp=[en+(pc-en)*0.5,pc,pc+(pc-en)*0.5];
      cands.push({t,d,strat:mode,entry:en,sl:d*(st.swLow-buf*a),zone:z,cond:{sweep:1,bos:1,fvg:f?1:0,ret:ret?1:0,fib:0},tps:tp}); st=null; };
    for(let t=0;t<n;t++){ piv(cs,t,SH,SL); const x=cs[t], a=atr[t]||0;
      if(st){
        if(x.c<=st.lvl) kill(t,'closed back beyond the swept level');
        else if(st.state==='sweep'){ if(x.l<st.swLow) st.swLow=x.l;
          if(t-st.sw>bw) kill(t,'no BOS within '+bw+' candles');
          else if(x.c>st.bosP&&x.c>x.o&&(x.c-x.o)>=strong*a&&(mode!==2||dk[t]===dk[st.sw])){
            const lh=st.bosK>0&&SH[st.bosK].p<SH[st.bosK-1].p, lab=lh?'CHoCH':'BOS';
            st.state='bos'; st.bos=t; boss.push({i0:st.bosI,i1:t,p:d*st.bosP,d,lab,m:mode}); evs.push({i:t,t:'bos',d,m:mode,txt:lab});
            let f=null; for(let k=Math.max(2,st.sw-1);k<=t;k++){ const g=fvgAt(k); if(g) f=g; } if(f) setF(f,t);
            if(mode===2&&!Z.saeVidEntry) emit(t,a,false); } }
        else if(st.state==='bos'){
          if(x.c<st.swLow) kill(t,'closed below the sweep low');
          else if(t-st.bos>rw) kill(t,'no retrace into the FVG in '+rw+' candles');
          else { if(!st.fvg&&t>st.bos){ const f=fvgAt(t); if(f) setF(f,t); }
            if(st.fvg&&x.c<st.fvg.lo) kill(t,'FVG closed through');
            else if(st.fvg&&t>st.bos&&t>st.fvg.k&&x.l<=st.fvg.hi&&x.c>=st.fvg.lo&&x.c>x.o) emit(t,a,true); } } }
      if(!st){ const ls=SL[SL.length-1], hs=SH[SH.length-1];
        if(ls&&hs&&ls.i!==lastSw&&x.l<ls.p&&x.c>ls.p&&(mode!==2||(bias[t]*d>0&&(Z.saeVidRef?pO[t]!=null&&x.l<d*pO[t]:x.l<d*dOpen[t])))){
          lastSw=ls.i; st={state:'sweep',sw:t,lvl:ls.p,swLow:x.l,bosP:hs.p,bosI:hs.i,bosK:SH.length-1,fvg:null,fr:null};
          sweeps.push({i:t,p:d*ls.p,d,m:mode}); evs.push({i:t,t:'sweep',d,m:mode}); } } }
    if(st) live.push({d,m:mode,state:st.state,lvl:d*st.lvl,bosP:d*st.bosP,fvg:st.fvg}); };
  const fib=d=>{ const cs=mir(d), fvgAt=(k)=>saeFvg(cs,k), SH=[], SL=[], done=new Set(), seen=new Set(), zr=new Map(), zin=new Set(), fk=new Set();
    for(let t=0;t<n;t++){ piv(cs,t,SH,SL); const x=cs[t], a=atr[t]||0; if(SH.length<2||SL.length<2) continue;
      const H=SH[SH.length-1], H0=SH[SH.length-2]; let q=SL.length-1; while(q>=0&&SL[q].i>=H.i) q--; if(q<1) continue;
      const Lw=SL[q], L0=SL[q-1]; if(!(H.p>H0.p&&Lw.p>L0.p)) continue;   // established uptrend (HH + HL)
      const R=H.p-Lw.p; if(R<minLeg*a||t-H.i>120||done.has(H.i)) continue;
      let z=zr.get(H.i); if(!z){ z={i0:H.i,i1:null,d,H:d*H.p,R,m:3}; zones.push(z); zr.set(H.i,z); }
      if(x.c<Lw.p){ done.add(H.i); z.i1=t; if(seen.has(H.i)) invs.push({t,d,why:'closed beyond the swing low',m:3}); continue; }
      const top=H.p-0.618*R, bot=H.p-0.786*R;
      if(t>H.i&&x.l<=top&&!zin.has(H.i)){ zin.add(H.i); evs.push({i:t,t:'zone',d,m:3}); }
      let ov=null; for(let k=t-1;k>=Math.max(Lw.i+2,t-80);k--){ const f=fvgAt(k); if(!f) continue; const lo=Math.max(bot,f.lo), hi=Math.min(top,f.hi); if(lo>=hi) continue;
        let ok=true; for(let j=k+1;j<t;j++) if(cs[j].c<f.lo){ ok=false; break; } if(ok){ ov={k,lo,hi}; break; } }
      if(!ov) continue; seen.add(H.i); const key=H.i+'|'+ov.k;
      if(!fk.has(key)){ fk.add(key); const r=rng(d,ov.lo,ov.hi); fvgs.push({k:ov.k,lo:r[0],hi:r[1],d,m:3,end:null}); evs.push({i:t,t:'fvg',d,m:3}); }
      if(t>ov.k&&x.l<=ov.hi&&x.c>=ov.lo&&x.c>x.o){ cands.push({t,d,strat:3,entry:d*x.c,sl:d*((Z.saeFibSl?bot:Lw.p)-buf*a),zone:rng(d,ov.lo,ov.hi),cond:{sweep:0,bos:0,fvg:1,ret:1,fib:1},tps:[d*(H.p-0.382*R),d*H.p,d*(H.p+0.272*R)]}); done.add(H.i); z.i1=t; } } };
  [1,-1].forEach(d=>{ mach(d,1); mach(d,2); fib(d); });
  cands.sort((a,b)=>a.t-b.t);
  return {c,n,atr,dOpen,pO,pC,dS,bias,cands,evs,fvgs,sweeps,boss,zones,invs,live}; }

// ---------- 2. confluence, score, filters, backtest ----------
function saeEval(S,Z){
  const c=S.c, n=S.n, W=Math.max(1,Math.round(Z.saeAgreeWin)||20), si=Math.max(0,SAE_NAMES.indexOf(Z.saeStrat)), conf=si===3, minA=Math.max(2,Math.min(3,Math.round(Z.saeMinAgree)||2));
  const ses=SAE_SES[Z.saeSes||'All'];
  S.cands.forEach(cc=>{ const set=new Set(); S.cands.forEach(o=>{ if(o.d===cc.d&&o.t<=cc.t&&cc.t-o.t<=W) set.add(o.strat); }); cc.agree=set.size;
    const bs=S.bias[cc.t]*cc.d>0, ag=cc.agree>=3?15:cc.agree===2?8:0;
    cc.list=[['Liquidity sweep',cc.cond.sweep,20],['BOS / CHoCH closed beyond level',cc.cond.bos,20],['Fair value gap',cc.cond.fvg,15],['Retrace into zone + confirm candle',cc.cond.ret,10],['Daily bias aligned',bs,10],['Golden zone overlaps FVG',cc.cond.fib,10],['Independent strategies agree ('+cc.agree+')',ag>0,15]];
    cc.score=cc.list.reduce((s,x,i)=>s+(x[1]?(i===6?ag:x[2]):0),0); cc.bias=bs; });
  const ev2=[]; S.cands.forEach(cc=>{ if(cc.agree>=2) ev2.push({i:cc.t,t:'confl',d:cc.d,m:cc.strat}); });
  const last={}, pick=[];
  S.cands.forEach(cc=>{ if(Z.saeDir==='Buy only'&&cc.d<0||Z.saeDir==='Sell only'&&cc.d>0) return;
    if(conf){ if(cc.agree<minA) return; if(last[cc.d]!=null&&cc.t-last[cc.d]<=W) return; last[cc.d]=cc.t; } else if(cc.strat!==si+1) return;
    if(cc.score<(Z.saeMin||0)) return; if(Z.saeBias&&!cc.bias) return;
    if(ses){ const h=new Date(c[cc.t].time*1000).getUTCHours(); if(h<ses[0]||h>=ses[1]) return; } pick.push(cc); });
  // backtest: signal on candle close t -> fill at open of t+1, costs, SL first if both levels are inside one candle
  const bal0=Z.saeBal>0?+Z.saeBal:10000, risk=(Z.saeRisk>0?+Z.saeRisk:1)/100, mult=Z.saeTickSz>0&&Z.saeTickVal>0?Z.saeTickVal/Z.saeTickSz:1, lot=Z.saeLot>0?+Z.saeLot:0, lev=Z.saeLev>0?+Z.saeLev:10,
    spr=(+Z.saeSpr||0)/100, slp=(+Z.saeSlip||0)/100, com=(+Z.saeCom||0)/100, rr=Z.saeRR>0?+Z.saeRR:2, ti=Z.saeTp==='TP1'?0:Z.saeTp==='TP3'?2:1, slFirst=Z.saeBoth!=='TP first',
    maxDay=(Z.saeMaxDay>0?+Z.saeMaxDay:0)/100, from=Z.saeFrom?Date.parse(Z.saeFrom+'T00:00:00Z')/1000:0, to=Z.saeTo?Date.parse(Z.saeTo+'T23:59:59Z')/1000:1e12;
  let eq=bal0, peak=eq, mdd=0, pos=null, pend=null, pi=0, dayK=null, dayStart=eq, costs=0, blocked=0; const trades=[], sigMap=new Map();
  const cls=(i,lvl,tag,b)=>{ const p=pos, adj=lvl*(spr/2+(tag==='SL'?slp:0)); let ex=p.s>0?lvl-adj:lvl+adj;
    if(tag==='SL'&&(p.s>0?b.open<p.sl:b.open>p.sl)) ex=p.s>0?b.open-adj:b.open+adj;
    const cm=com*(p.entry+ex)*p.units*mult, pnl=(ex-p.entry)*p.s*p.units*mult-cm; costs+=cm; eq+=pnl; peak=Math.max(peak,eq); mdd=Math.max(mdd,(peak-eq)/peak*100);
    Object.assign(p,{exit:ex,i1:i,pnl,R:pnl/p.riskAmt,tag,closed:true}); trades.push(p); pos=null; };
  for(let i=0;i<n;i++){ const b=c[i], k=Math.floor(b.time/86400); if(dayK!==k){ dayK=k; dayStart=eq; }
    if(pend){ const cc=pend; pend=null; const p0=b.open, e=cc.d>0?p0*(1+spr/2+slp):p0*(1-spr/2-slp), dist=Math.abs(e-cc.sl);
      if(dist>0&&(cc.d>0?cc.sl<e:cc.sl>e)){ const riskAmt=eq*risk; let u=riskAmt/(dist*mult); u=Math.min(u,eq*lev/(e*mult)); if(lot>0) u=Math.floor(u/lot)*lot;
        if(u>0){ const R=dist; let tps=cc.tps&&cc.d*(cc.tps[0]-e)>0&&cc.d*(cc.tps[1]-cc.tps[0])>0&&cc.d*(cc.tps[2]-cc.tps[1])>0?cc.tps.slice():[e+cc.d*R*rr*0.5,e+cc.d*R*rr,e+cc.d*R*rr*1.5];
          pos={cc,s:cc.d,t:cc.t,i0:i,entry:e,sl:cc.sl,tps,tp:tps[ti],units:u,riskAmt:u*dist*mult,score:cc.score,strat:cc.strat,rr:Math.abs(tps[ti]-e)/dist,agree:cc.agree,list:cc.list,zone:cc.zone,closed:false}; } } if(!pos) sigMap.delete(cc.t); }
    if(pos){ const sH=pos.s>0?b.low<=pos.sl:b.high>=pos.sl, tH=pos.s>0?b.high>=pos.tp:b.low<=pos.tp;
      if(sH&&(!tH||slFirst)) cls(i,pos.sl,'SL',b); else if(tH) cls(i,pos.tp,'TP',b); }
    if(!pos&&!pend){ while(pi<pick.length&&pick[pi].t<i) pi++;
      if(pi<pick.length&&pick[pi].t===i){ const cc=pick[pi++];
        if(b.time>=from&&b.time<=to){ if(Z.saeStop&&maxDay>0&&(eq-dayStart)/dayStart<=-maxDay){ blocked++; } else { pend=cc; sigMap.set(i,cc); } } } } }
  const all=trades.slice(); if(pos) all.push(pos);
  const wins=trades.filter(x=>x.pnl>0), loss=trades.filter(x=>x.pnl<=0), gw=wins.reduce((s,x)=>s+x.pnl,0), gl=-loss.reduce((s,x)=>s+x.pnl,0), mon={}, side={buy:{n:0,w:0,net:0},sell:{n:0,w:0,net:0}};
  trades.forEach(x=>{ const m=new Date(c[x.i1].time*1000).toISOString().slice(0,7), q=mon[m]||(mon[m]={n:0,w:0,net:0}); q.n++; q.net+=x.pnl; if(x.pnl>0) q.w++;
    const sd=x.s>0?side.buy:side.sell; sd.n++; sd.net+=x.pnl; if(x.pnl>0) sd.w++; });
  const stats={n:trades.length,w:wins.length,l:loss.length,wr:trades.length?wins.length/trades.length*100:0,net:eq-bal0,eq,bal0,pf:gl>0?gw/gl:(gw>0?Infinity:0),mdd,avgR:trades.length?trades.reduce((s,x)=>s+x.R,0)/trades.length:0,
    avgRR:trades.length?trades.reduce((s,x)=>s+x.rr,0)/trades.length:0,mon,side,costs,blocked,open:pos?1:0,range:[c[0].time,c[n-1].time]};
  return {trades:all,sigMap,stats,evs:S.evs.concat(ev2),pick}; }

const saeCache={};
function saeRun(c,Z){ if(!c||c.length<40) return null; const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close].concat(SAE_KEYS.map(k=>Z[k])).join('|');
  const m=saeCache[Z.sid]; if(m&&m.k===key) return m.r; const S=saeScan(c,Z), E=saeEval(S,Z), r=Object.assign({},S,E);
  r.marks=[]; E.trades.forEach(x=>{ const b=c[x.t]; r.marks.push(x.s>0?{time:b.time,position:'belowBar',color:'#2dd4a7',shape:'arrowUp',text:'BUY '+x.score}:{time:b.time,position:'aboveBar',color:'#ff5d7a',shape:'arrowDown',text:'SELL '+x.score});
    if(x.closed) r.marks.push({time:c[x.i1].time,position:x.s>0?'aboveBar':'belowBar',color:x.tag==='TP'?'#2dd4a7':'#ff5d7a',shape:'circle',text:x.tag}); });
  r.marks.sort((a,b)=>a.time-b.time); saeCache[Z.sid]={k:key,r}; return r; }

// ---------- 3. chart overlay + setup panel ----------
function saeDraw(d,X,Y,W,H){
  const Z=d.o, all=candles; if(!all||all.length<41) return; const c=all.slice(0,-1), r=saeRun(c,Z); if(!r) return; const n=c.length, lo=Math.max(0,n-Math.round(Z.saeBars||250)), si=Math.max(0,SAE_NAMES.indexOf(Z.saeStrat)), sh=m=>si===3||m===si+1, fs=8;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  const xi=(i,f)=>{ const v=X(Math.max(0,Math.min(n-1,i))); return v==null?f:v; };
  const box=(i0,i1,p0,p1,col,al,ext)=>{ const y0=Y(p0), y1=Y(p1); if(y0==null||y1==null) return null; const a=xi(i0,0), b=ext?W:Math.max(a+3,xi(i1,W)), t=Math.min(y0,y1), h=Math.max(2,Math.abs(y1-y0)); cx.fillStyle=saeRg(col,al); cx.fillRect(a,t,Math.max(2,b-a),h); cx.strokeStyle=saeRg(col,.8); cx.lineWidth=1; cx.strokeRect(a,t,Math.max(2,b-a),h); return {a,b,t,bt:t+h}; };
  const hl=(p,i0,i1,col,dash,ext)=>{ const y=Y(p); if(y==null) return null; const a=xi(i0,0), b=ext?W:xi(i1,W); cx.strokeStyle=col; cx.lineWidth=1; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(a,y); cx.lineTo(b,y); cx.stroke(); cx.setLineDash([]); return {a,b,y}; };
  const lab=(t,x,y,col,bold,al)=>{ cx.font=(bold?'bold ':'')+fs+'px system-ui'; cx.textAlign=al||'center'; cx.fillStyle=col||'#d1d4dc'; cx.fillText(t,x,y); };
  // FVG rectangles (until filled), golden zones, sweeps, BOS / CHoCH
  r.fvgs.filter(f=>sh(f.m)&&(f.end==null||f.end>=lo)&&f.k+3>=lo).slice(-12).forEach(f=>{ const b=box(f.k-2,f.end==null?n:f.end,f.hi,f.lo,f.d>0?'#26a69a':'#ef5350',.22,f.end==null); if(b) lab('FVG',b.a+2,(b.t+b.bt)/2,'#b2b5be',false,'left'); });
  r.zones.filter(z=>sh(z.m)&&(z.i1==null||z.i1>=lo)).slice(-2).forEach(z=>{ const e=z.i1==null, up=z.d>0, top=z.H-z.d*0.618*z.R, bot=z.H-z.d*0.786*z.R;
    const b=box(z.i0,z.i1==null?n:z.i1,top,bot,'#ffd54f',.14,e); if(b){ lab('Golden zone 0.618-0.786',b.a+3,b.t-fs,'#ffd54f',false,'left'); }
    [[0.618],[0.705],[0.786]].forEach(q=>{ const l=hl(z.H-z.d*q[0]*z.R,z.i0,z.i1==null?n:z.i1,'rgba(255,213,79,.75)',[3,3],e); if(l) lab(q[0],l.b-3,l.y-fs+1,'#ffd54f',false,'right'); }); });
  r.sweeps.filter(s=>sh(s.m)&&s.i>=lo).slice(-10).forEach(s=>{ const y=Y(s.p), x=xi(s.i,0); if(y==null) return; cx.strokeStyle='#ff9800'; cx.setLineDash([2,2]); cx.beginPath(); cx.moveTo(xi(s.i-8,0),y); cx.lineTo(x,y); cx.stroke(); cx.setLineDash([]); lab(s.d>0?'\u25BC Sell-side sweep':'\u25B2 Buy-side sweep',x,y+(s.d>0?fs+3:-fs-3),'#ff9800',true); });
  r.boss.filter(s=>sh(s.m)&&s.i1>=lo).slice(-10).forEach(s=>{ const l=hl(s.p,s.i0,s.i1,s.d>0?'#26a69a':'#ef5350',[]); if(l) lab(s.lab,(l.a+l.b)/2,l.y+(s.d>0?-fs-2:fs+2),s.d>0?'#26a69a':'#ef5350',true); });
  // daily open / previous daily open + close
  { const s0=r.dS[n-1], t1=n-1; [[r.dOpen[n-1],'Daily open','#ffeb3b'],[r.pO[n-1],'Prev D open','#90a4ae'],[r.pC[n-1],'Prev D close','#b39ddb']].forEach(q=>{ if(q[0]==null) return; const l=hl(q[0],s0,t1,q[2],[5,3],true); if(l) lab(q[1]+' '+saeF(q[0]),W-4,l.y-fs+1,q[2],false,'right'); }); }
  // entry / SL / TP of the latest setups
  const T=r.trades.slice(-Math.max(1,Math.round(Z.saeN)||2));
  T.forEach(x=>{ if(x.i0+2<lo-30) return; const e=x.closed?x.i1:n+8, g=x.closed?.55:1;
    [[x.entry,'Entry','#2962ff'],[x.sl,'SL','#f23645'],[x.tps[0],'TP1','#089981'],[x.tps[1],'TP2','#089981'],[x.tps[2],'TP3','#089981']].forEach(q=>{ const l=hl(q[0],x.i0,e,q[2],q[1]==='Entry'?[]:[4,3]); if(l) lab(q[1]+' '+saeF(q[0]),l.b+3,l.y,'#d1d4dc',false,'left'); });
    if(x.zone&&!x.closed){ box(x.i0-1,x.i0+6,x.zone[1],x.zone[0],'#2962ff',.18); } });
  cx.restore(); }

// ---------- 4. backtest report + alerts ----------
const saeRep=document.createElement('div'); saeRep.style.cssText='position:fixed;inset:0;z-index:9999;display:none;overflow:auto;background:#0e1118;color:#d1d4dc;font:13px system-ui;padding:12px'; document.body.appendChild(saeRep);
const si3=(m,Z)=>{ const i=Math.max(0,SAE_NAMES.indexOf(Z.saeStrat)); return i===3||m===i+1; };
function saeShow(Z){ const c=candles.slice(0,-1), r=saeRun(c,Z); if(!r) return; const s=r.stats, f=v=>isFinite(v)?v.toFixed(2):'\u221E', fd=t=>new Date(t*1000).toISOString().slice(0,10), col=v=>v>=0?'#2dd4a7':'#ff5d7a';
  const row=(a,b)=>'<tr><td style="padding:3px 6px;color:#8d93a1">'+a+'</td><td style="padding:3px 6px;text-align:right">'+b+'</td></tr>', sd=q=>q.n+' trades \u00b7 win '+(q.n?Math.round(q.w/q.n*100):0)+'% \u00b7 <span style="color:'+col(q.net)+'">'+saeM(q.net)+'</span>';
  const T=r.trades.filter(x=>x.closed).slice(-15).reverse().map(x=>'<tr><td>'+fd(c[x.t].time)+'</td><td style="color:'+(x.s>0?'#2dd4a7':'#ff5d7a')+'">'+(x.s>0?'BUY':'SELL')+'</td><td>'+saeF(x.entry)+'</td><td>'+x.tag+'</td><td style="color:'+col(x.pnl)+'">'+saeM(x.pnl)+'</td><td>'+x.R.toFixed(2)+'R</td></tr>').join('');
  const lt=r.trades[r.trades.length-1], lv=r.live.filter(q=>si3(q.m,Z))[0], li=r.invs.filter(q=>si3(q.m,Z)).slice(-1)[0];
  let LS='<div style="background:#171b26;border-radius:10px;padding:8px 10px;margin:8px 0"><b>Latest setup</b><br>';
  if(lt){ const bu=lt.s>0, gr=lt.score>=75?'high':lt.score>=50?'medium':'low', mu=Z.saeTickSz>0&&Z.saeTickVal>0?Z.saeTickVal/Z.saeTickSz:1, pl=(lt.tp-lt.entry)*lt.s*lt.units*mu;
    LS+='<span style="color:'+(bu?'#2dd4a7':'#ff5d7a')+';font-weight:700">'+(bu?'BUY':'SELL')+'</span> \u00b7 '+['Sweep + BOS + FVG','Daily Open','Fib + FVG'][lt.strat-1]+' \u00b7 '+new Date(c[lt.t].time*1000).toISOString().slice(0,16).replace('T',' ')+' UTC<br>Entry '+saeF(lt.entry)+' \u00b7 Stop '+saeF(lt.sl)+'<br>TP1 '+saeF(lt.tps[0])+' \u00b7 TP2 '+saeF(lt.tps[1])+' \u00b7 TP3 '+saeF(lt.tps[2])+'<br>Reward:risk '+lt.rr.toFixed(2)+' \u00b7 size '+(lt.units>=100?lt.units.toFixed(0):lt.units.toPrecision(4))+' \u00b7 risk '+saeM(lt.riskAmt)+' \u00b7 est. '+saeM(pl)+' at target / '+saeM(-lt.riskAmt)+' at stop<br>Quality '+lt.score+'/100 ('+gr+')'+(lt.closed?' \u00b7 closed '+lt.tag+' '+lt.R.toFixed(2)+'R':' \u00b7 open')
      +'<br>'+lt.list.map(q=>'<span style="color:'+(q[1]?'#2dd4a7':'#707683')+'">'+(q[1]?'\u2713 ':'\u2717 ')+q[0]+'</span>').join('<br>'); }
  else LS+='No valid setup with the current filters.';
  if(lv) LS+='<br><span style="color:#ff9800">Watching: '+(lv.d>0?'bullish':'bearish')+' sweep, '+(lv.state==='sweep'?'waiting for a BOS close beyond '+saeF(lv.bosP):lv.fvg?'waiting for a retrace into the FVG':'waiting for an FVG')+'</span>'; else if(li&&(!lt||li.t>lt.t)) LS+='<br><span style="color:#ff9800">Last setup invalid: '+li.why+'</span>';
  LS+='</div>';
  saeRep.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">Strategy Analysis \u00b7 backtest</b><button id="saeX" style="background:#2a2e39;color:#fff;border:0;border-radius:8px;padding:6px 12px">Close</button></div>'
   +'<p style="color:#ff9800;margin:8px 0">Historical candles loaded on this chart: '+c.length+' bars, '+fd(s.range[0])+' to '+fd(s.range[1])+' ('+sym[0]+' '+tf[0]+'). Results are a simulation on past data and do not predict future results or guarantee profit.</p>'
   +LS+'<table style="width:100%;border-collapse:collapse">'+row('Strategy',Z.saeStrat)+row('Total trades',s.n+(s.open?' (+1 open)':''))+row('Winning / losing',s.w+' / '+s.l)+row('Win rate',s.wr.toFixed(1)+'%')+row('Net profit / loss (after costs)','<span style="color:'+col(s.net)+'">'+saeM(s.net)+' ('+(s.net/s.bal0*100).toFixed(1)+'%)</span>')
   +row('Profit factor',f(s.pf))+row('Maximum drawdown',s.mdd.toFixed(1)+'%')+row('Average R per trade',s.avgR.toFixed(2)+'R')+row('Average planned reward:risk',s.avgRR.toFixed(2))+row('Commission paid',saeM(s.costs))+row('Signals blocked by daily loss limit',s.blocked)
   +row('Buy performance',sd(s.side.buy))+row('Sell performance',sd(s.side.sell))+'</table>'
   +'<b style="display:block;margin:10px 0 4px">By month</b><table style="width:100%;border-collapse:collapse">'+(Object.keys(s.mon).sort().map(k=>row(k,s.mon[k].n+' trades \u00b7 win '+Math.round(s.mon[k].w/s.mon[k].n*100)+'% \u00b7 <span style="color:'+col(s.mon[k].net)+'">'+saeM(s.mon[k].net)+'</span>')).join('')||row('-','no closed trades'))+'</table>'
   +'<b style="display:block;margin:10px 0 4px">Last trades</b><table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="color:#8d93a1"><td>Date</td><td>Side</td><td>Entry</td><td>Exit</td><td>P/L</td><td>R</td></tr>'+(T||'<tr><td colspan=6>none</td></tr>')+'</table>'
   +'<p style="color:#8d93a1;margin-top:10px">Rules: signal uses only candles closed at that time; fill at the next candle open plus spread and slippage; if stop and target are both inside one candle the stop is assumed first (setting); one trade at a time; risk % of current equity.</p>';
  saeRep.style.display='block'; document.getElementById('saeX').onclick=()=>{ saeRep.style.display='none'; }; }
function saeAlerts(Z,r,c){ if(!r||!c.length) return; const li=c.length-1, lt=c[li].time, on=Z.saeAl||{}; if(lt<=(Z._alT||0)) return; const TX={sweep:'Liquidity swept',bos:'Structure break closed',fvg:'FVG formed',zone:'Price entered the golden zone',confl:'Multiple conditions align'};
  const out=[]; r.evs.forEach(e=>{ if(e.i===li&&on[e.t]&&(SAE_NAMES.indexOf(Z.saeStrat)===3||e.m===SAE_NAMES.indexOf(Z.saeStrat)+1)) out.push((TX[e.t]||e.t)+(e.txt?' ('+e.txt+')':'')+' \u00b7 '+(e.d>0?'bullish':'bearish')); });
  if(on.setup&&r.sigMap.has(li)) out.push('BUY / SELL setup is valid \u00b7 '+(r.sigMap.get(li).d>0?'BUY':'SELL')); Z._alT=lt; if(!out.length) return;
  const tx=[...new Set(out)].join(' | ')+' \u00b7 '+sym[0]+' '+tf[0]; toast(tx,'#ffd54f'); try{ if(Z.saeBrowser&&window.Notification){ if(Notification.permission==='granted') new Notification('Strategy Analysis',{body:tx}); else if(Notification.permission==='default') Notification.requestPermission(); } }catch(e){} }

// ---------- 5. registration (Strategies category) ----------
try{ const A=window.mpvAuth; if(A&&typeof A.lockStrat==='function'&&!A.__saeSilver){ A.__saeSilver=true; const _ls=A.lockStrat.bind(A);   // Strategy Analysis Tool is a SILVER-plan strategy
  A.lockStrat=function(k,quiet,name){ if(k==='sae'&&typeof A.can==='function'&&!A.can('silver')){ if(!quiet){ try{ toast('Strategy Analysis Tool needs the Silver plan','#ff5d7a'); }catch(e){} try{ if(window.mpvOpenUnlock) window.mpvOpenUnlock('Silver'); }catch(e){} } return true; } return _ls(k,quiet,name); }; } }catch(e){ console.error('sae silver gate',e); }
STRATS.sae={label:'Strategy Analysis Tool \u00b7 Liquidity Sweep + BOS + FVG, Daily Open, Fibonacci Golden Zone + FVG, Confluence, risk sizing and backtest (BUY / SELL)',short:'Strategy Analysis Tool',own:true,
  defs:{limit:false,useSl:false,saeStrat:SAE_NAMES[0],saeDir:'Both',saeLen:5,saeStrong:0.6,saeBosWin:30,saeRetWin:40,saeBias:false,saeMinAgree:2,saeAgreeWin:20,saeMin:40,saeRR:2,saeBuf:0.1,saeTp:'TP2',saeMinLeg:2,saeVidRef:false,saeVidEntry:false,saeVidTp:false,saeFibSl:false,
    saeBal:10000,saeRisk:1,saeTickSz:0,saeTickVal:0,saeMaxDay:3,saeStop:true,saeLev:10,saeLot:0,saeSpr:0.01,saeSlip:0.01,saeCom:0.04,saeBoth:'SL first (conservative)',saeFrom:'',saeTo:'',saeSes:'All',saeDayHr:0,
    saeBars:250,saeN:2,saeAl:{sweep:false,bos:false,fvg:false,zone:false,confl:true,setup:true},saeBrowser:false},
  inputs:(b,d)=>{ d.saeAl=d.saeAl||{};
    { const w=document.createElement('div'); w.style.cssText='margin:6px 0 10px'; const bt=document.createElement('button'); bt.type='button'; bt.textContent='\ud83d\udcca Backtest report (optional) \u00b7 latest setup, results, risk';
      bt.style.cssText='width:100%;padding:10px 12px;border-radius:12px;border:0;background:#2962ff;color:#fff;font:700 13px system-ui,sans-serif;cursor:pointer';
      bt.onclick=ev=>{ ev.preventDefault(); ev.stopPropagation(); try{ saeShow(d); }catch(e){ console.error('sae report',e); } }; w.appendChild(bt); b.appendChild(w); }
    fld(b,d,'saeStrat','sel','Strategy',{opts:SAE_NAMES}); fld(b,d,'saeDir','sel','Direction',{opts:['Both','Buy only','Sell only']});
    fld(b,d,'saeLen','num','Swing length (candles each side)',{min:2,max:30,step:1}); fld(b,d,'saeStrong','num','BOS candle body (x ATR, strong close)',{min:0,max:3,step:0.1});
    fld(b,d,'saeBosWin','num','Max candles from sweep to BOS',{min:5,max:200,step:1}); fld(b,d,'saeRetWin','num','Max candles from BOS to FVG retrace',{min:5,max:300,step:1});
    fld(b,d,'saeMinLeg','num','Fib swing leg minimum size (x ATR)',{min:0,max:10,step:0.5}); fld(b,d,'saeDayHr','num','Daily candle open hour (UTC)',{min:0,max:23,step:1});
    fld(b,d,'saeBias','chk','Filter: require previous daily candle bias');
    fld(b,d,'saeVidRef','chk','Video option \u00b7 Daily Open: use the previous daily candle open as the level'); fld(b,d,'saeVidEntry','chk','Video option \u00b7 Daily Open: enter on the FVG retrace (not at the BOS close)'); fld(b,d,'saeVidTp','chk','Video option \u00b7 Daily Open: take profit at the previous daily close'); fld(b,d,'saeFibSl','chk','Video option \u00b7 Fibonacci: stop just beyond the golden zone'); fld(b,d,'saeMin','num','Filter: minimum quality score (0-100)',{min:0,max:100,step:5});
    fld(b,d,'saeMinAgree','num','Confluence: strategies that must agree (2-3)',{min:2,max:3,step:1}); fld(b,d,'saeAgreeWin','num','Confluence: agreement window (candles)',{min:1,max:200,step:1});
    fld(b,d,'saeRR','num','Risk-to-reward ratio (TP2)',{min:0.5,max:10,step:0.5}); fld(b,d,'saeTp','sel','Backtest exits at',{opts:['TP1','TP2','TP3']}); fld(b,d,'saeBuf','num','Stop buffer beyond sweep / swing (ATR)',{min:0,max:3,step:0.05});
    fld(b,d,'saeBal','num','Account balance',{min:1,step:100}); fld(b,d,'saeRisk','num','Risk per trade %',{min:0.1,max:10,step:0.1});
    fld(b,d,'saeTickSz','num','Tick size (0 = trade in units / coins)',{min:0,step:0.0001}); fld(b,d,'saeTickVal','num','Tick value in account currency',{min:0,step:0.01}); fld(b,d,'saeLot','num','Lot step (0 = none)',{min:0,step:0.01}); fld(b,d,'saeLev','num','Max leverage (position cap)',{min:1,max:500,step:1});
    fld(b,d,'saeMaxDay','num','Maximum daily loss %',{min:0,max:50,step:0.5}); fld(b,d,'saeStop','chk','Disable new signals after the daily loss limit');
    fld(b,d,'saeSpr','num','Spread % of price',{min:0,step:0.005}); fld(b,d,'saeSlip','num','Slippage % per fill',{min:0,step:0.005}); fld(b,d,'saeCom','num','Commission % per side',{min:0,step:0.01}); fld(b,d,'saeBoth','sel','If stop and target are in one candle',{opts:['SL first (conservative)','TP first']});
    fld(b,d,'saeFrom','txt','Backtest from date (YYYY-MM-DD, blank = all loaded)'); fld(b,d,'saeTo','txt','Backtest to date (YYYY-MM-DD)'); fld(b,d,'saeSes','sel','Trading session (UTC hours)',{opts:['All','Asia','London','New York']});
    [['sweep','Alert: liquidity swept'],['bos','Alert: BOS / CHoCH closed'],['fvg','Alert: FVG formed'],['zone','Alert: price in golden zone'],['confl','Alert: multiple conditions align'],['setup','Alert: BUY / SELL setup valid']].forEach(q=>fld(b,d.saeAl,q[0],'chk',q[1]));
    fld(b,d,'saeBrowser','chk','Also send browser notifications (needs permission)'); fld(b,d,'saeBars','num','Overlay history (candles)',{min:50,max:2000,step:10}); fld(b,d,'saeN','num','Setups drawn (entry / SL / TP)',{min:1,max:10,step:1}); },
  sig:(c,i,n,Z)=>{ if(c.length<40) return 0; const r=saeRun(c,Z); if(!r) return 0; const x=r.sigMap.get(i); return x?x.d:0; }};
try{ DESC.sae='Strategy \u00b7 liquidity sweep + BOS + FVG, daily open, Fibonacci golden zone + FVG, confluence score, risk sizing and backtest report'; }catch(e){}
{ const _D=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='saeview') return saeDraw(d,X,Y,W,H); return _D.apply(this,arguments); };
  const _R=recomputeExtras; recomputeExtras=function(){ _R.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='sae'&&stVis(Z)) scriptBoxes.push({type:'saeview',pts:[],o:Z}); }); };
  const _O=runOne; runOne=function(Z,quiet,out){ if(!Z||Z.k!=='sae') return _O.apply(this,arguments); const tmp=[]; _O.call(this,Z,quiet,tmp);
    const c=candles.slice(0,-1), r=c.length>=40?saeRun(c,Z):null; if(r){ r.marks.forEach(m=>out.push(m)); const s=r.stats; Z._stat=s.n+' trades \u00b7 win '+Math.round(s.wr)+'% \u00b7 <span class="'+(s.net>=0?'up':'down')+'">'+(s.net>=0?'+':'')+(s.net/s.bal0*100).toFixed(1)+'%</span> (after costs)'; }
    if(!quiet) saeAlerts(Z,r,c); }; }
}catch(err){ console.error('sae strategy failed',err); window.__saeErr=err; }
//# sourceURL=tools-5.js
