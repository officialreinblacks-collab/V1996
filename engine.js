// AUTO-COPIED from the app's Market Scanner engine so the server and the chart give identical signals.
module.exports=function(tfLabel){
  const tf=[tfLabel];
function atrW(c,n){ const a=new Array(c.length).fill(NaN); let t=0;   // Wilder ATR, same as Pine ta.atr
  for(let i=0;i<c.length;i++){ const tr=i?Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)):c[i].high-c[i].low;
    if(i<n){ t+=tr; if(i===n-1) a[i]=t/n; } else a[i]=(a[i-1]*(n-1)+tr)/n; } return a; }
function pivAt(c,j,L,R,kind){   // is bar j a pivot low ('l') / high ('h')?  (caller guarantees j-L>=0 and j+R<c.length)
  const v=kind==='l'?c[j].low:c[j].high;
  for(let k=j-L;k<=j+R;k++){ if(k===j) continue; const w=kind==='l'?c[k].low:c[k].high;
    if(kind==='l'?(k<j?w<v:w<=v):(k<j?w>v:w>=v)) return false; }
  return true; }
// MSC-BEGIN
const MSC_DEF={auto:true,swing:5,minScore:4,cool:6,entryMode:'Market (at signal)',tp1:1,tp2:2,tp3:3,slBuf:0.2,moveBE:true,maxWait:12,impMult:1.4,maxZones:6,
  showHistory:false,showBoxes:true,showZones:true,showSwings:true,showDash:true};

function mscTfMin(){ const s=String((typeof tf!=='undefined'&&tf&&tf[0])||'1h'), m=s.match(/^(\d+)\s*([a-zA-Z]+)/); if(!m) return 60; const v=+m[1], u=m[2];
  return u==='m'?v:(u==='h'||u==='H')?v*60:(u==='d'||u==='D')?v*1440:(u==='w'||u==='W')?v*10080:u==='M'?v*43200:60; }
function mscEma(c,n){ const a=new Array(c.length).fill(NaN), k=2/(n+1); let p=NaN; for(let i=0;i<c.length;i++){ p=isNaN(p)?c[i].close:c[i].close*k+p*(1-k); a[i]=i>=n-1?p:NaN; } return a; }
function mscRsi(c,n){ const a=new Array(c.length).fill(NaN); let g=0,l=0; for(let i=1;i<c.length;i++){ const d=c[i].close-c[i-1].close, u=d>0?d:0, w=d<0?-d:0;
  if(i<=n){ g+=u; l+=w; if(i===n){ g/=n; l/=n; a[i]=l===0?100:100-100/(1+g/l); } } else { g=(g*(n-1)+u)/n; l=(l*(n-1)+w)/n; a[i]=l===0?100:100-100/(1+g/l); } } return a; }
function mscCompute(c,Z){
  const P=Object.assign({},MSC_DEF,Z), n=c.length, tm=mscTfMin();
  const R=P.auto?(tm<=15?4:tm<=240?5:6):Math.max(2,Math.round(P.swing));
  const atr=atrW(c,14), e50=mscEma(c,50), e200=mscEma(c,200), rsi=mscRsi(c,14);
  const SH=[], SL=[], zones=[], trades=[]; let pend=null, pos=null, lastSig=-99, trend=0;
  const vavg=i=>{ let s=0,k=0; for(let j=Math.max(0,i-19);j<=i;j++){ s+=c[j].volume||0; k++; } return k?s/k:0; };
  const mk=(s,e,slp,i0,sc)=>{ const rk=Math.abs(e-slp)||1e-9; return {side:s,i0,e,sl:slp,sl0:slp,risk:rk,t:[1,2,3].map(k=>e+s*rk*P['tp'+k]),hit:0,score:sc}; };
  const close=(i,tag,x)=>{ trades.push({side:pos.side,i0:pos.i0,i1:i,e:pos.e,sl:pos.sl0,t:pos.t,hit:pos.hit,tag,R:pos.side*(x-pos.e)/pos.risk,win:pos.hit>=1}); pos=null; };
  const manage=i=>{ const b=c[i], s=pos.side;
    if(s>0?b.low<=pos.sl:b.high>=pos.sl){ close(i,pos.hit>0?(P.moveBE?'BE':'SL'):'SL',pos.sl); return; }
    while(pos.hit<3&&(s>0?b.high>=pos.t[pos.hit]:b.low<=pos.t[pos.hit])){ pos.hit++; if(P.moveBE&&pos.hit===1) pos.sl=pos.e; }
    if(pos.hit>=3) close(i,'TP3',pos.t[2]); };
  const side=(s,i)=>{ const b=c[i]; let sc=0, z=null, lv=null;
    if(trend===s) sc++;
    if(s>0?(b.close>e50[i]&&(isNaN(e200[i])||e50[i]>e200[i])):(b.close<e50[i]&&(isNaN(e200[i])||e50[i]<e200[i]))) sc++;
    const r=rsi[i], rp=rsi[i-1]; if(!isNaN(r)&&!isNaN(rp)&&(s>0?(r>45&&r<70&&r>rp):(r<55&&r>30&&r<rp))) sc++;
    for(let k=zones.length-1;k>=0;k--){ const q=zones[k]; if(q.dead||q.dir!==s||q.born>=i) continue;
      if(s>0?(b.low<=q.top&&b.close>q.bot&&b.close>b.open):(b.high>=q.bot&&b.close<q.top&&b.close<b.open)){ z=q; sc+=2; break; } }
    const H=s>0?SH[SH.length-1]:SL[SL.length-1];
    if(H&&i>0&&(s>0?(b.close>H.p&&c[i-1].close<=H.p&&b.close>b.open):(b.close<H.p&&c[i-1].close>=H.p&&b.close<b.open))){ lv=H; sc+=2; if((b.volume||0)>1.2*vavg(i)) sc++; }
    return {sc,z,lv}; };
  for(let i=0;i<n;i++){
    const b=c[i], A=atr[i], j=i-R;
    if(j>=R){ if(pivAt(c,j,R,R,'h')){ const pv=SH[SH.length-1]; SH.push({i:j,p:c[j].high,lab:pv?(c[j].high>pv.p?'HH':'LH'):'H'}); }
      if(pivAt(c,j,R,R,'l')){ const pv=SL[SL.length-1]; SL.push({i:j,p:c[j].low,lab:pv?(c[j].low>pv.p?'HL':'LL'):'L'}); }
      if(SH.length>1&&SL.length>1){ const hh=SH[SH.length-1].p>SH[SH.length-2].p, hl=SL[SL.length-1].p>SL[SL.length-2].p; trend=hh&&hl?1:(!hh&&!hl?-1:0); } }
    zones.forEach(z=>{ if(!z.dead&&i>z.born&&(z.dir>0?b.close<z.bot:b.close>z.top)) z.dead=i; });
    if(pend&&!pos){ const s=pend.side;
      if(i-pend.i0>P.maxWait||(s>0?b.close<pend.sl:b.close>pend.sl)) pend=null;
      else if(i>pend.i0&&(s>0?b.low<=pend.e:b.high>=pend.e)){ const fill=s>0?Math.min(b.open,pend.e):Math.max(b.open,pend.e);
        pos=mk(s,fill,pend.sl,i,pend.score); pend=null; manage(i); } }
    else if(pos&&i>pos.i0) manage(i);
    if(!isNaN(A)&&i>=2){ const body=Math.abs(b.close-b.open), bs=c[i-1];
      if(b.close>b.open&&body>=P.impMult*A&&b.close>bs.high) zones.push({dir:1,top:Math.max(bs.open,bs.close),bot:bs.low,left:i-1,born:i});
      else if(b.close<b.open&&body>=P.impMult*A&&b.close<bs.low) zones.push({dir:-1,top:bs.high,bot:Math.min(bs.open,bs.close),left:i-1,born:i}); }
    if(!pos&&!pend&&i-lastSig>P.cool&&!isNaN(A)&&!isNaN(e50[i])&&i>0){
      const a=side(1,i), d=side(-1,i); let s=0, r=null;
      if(a.sc>=P.minScore&&a.sc>=d.sc){ s=1; r=a; } else if(d.sc>=P.minScore){ s=-1; r=d; }
      if(s){ let e=b.close, lim=false; const opp=s>0?SL[SL.length-1]:SH[SH.length-1];
        if(String(P.entryMode).indexOf('Limit')===0){ const lvl=r.z?(s>0?r.z.top:r.z.bot):(r.lv?r.lv.p:null); if(lvl!=null&&(s>0?lvl<b.close:lvl>b.close)){ e=lvl; lim=true; } }
        const base=r.z?(s>0?r.z.bot:r.z.top):(lim?(s>0?e-A:e+A):(opp?opp.p:(s>0?b.low:b.high)));
        let slp=lim?base-s*P.slBuf*A:(s>0?Math.min(base,b.low):Math.max(base,b.high))-s*P.slBuf*A;
        if(Math.abs(e-slp)<0.5*A) slp=e-s*0.5*A; if(Math.abs(e-slp)>4*A) slp=e-s*4*A;
        const t=mk(s,e,slp,i,r.sc); if(lim) pend=t; else pos=t; lastSig=i; } } }
  const li=n-1; let er=0, vr=1;
  if(n>25){ let s=0; for(let k=li-19;k<=li;k++) s+=Math.abs(c[k].close-c[k-1].close); er=s?Math.abs(c[li].close-c[li-20].close)/s:0; }
  if(!isNaN(atr[li])){ let s=0,k=0; for(let j=Math.max(0,li-99);j<=li;j++) if(!isNaN(atr[j])){ s+=atr[j]; k++; } vr=k?atr[li]/(s/k):1; }
  const dir=trend!==0?trend:(!isNaN(e50[li])?(c[li].close>e50[li]?1:-1):0), volat=vr>1.5, cons=er<0.25;
  const state=(cons?'CONSOLIDATING':dir>0?'UP TREND':dir<0?'DOWN TREND':'RANGING')+(volat?' · VOLATILE':'');
  const rec=trades.slice(-10), rw=rec.filter(x=>x.win).length, rl=rec.length-rw;
  const pts=(volat?1:0)+((!cons&&dir<0)?1:0)+(rec.length>=3&&rl>rw?1:0), risk=pts===0?'SAFE':pts===1?'RISKY':'HIGH RISK';
  const w=trades.filter(x=>x.win).length;
  return {n,c,zones,SH,SL,trades,pos,pend,trend,state,risk,w,l:trades.length-w}; }

  return mscCompute;
};
