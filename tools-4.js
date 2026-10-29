/* tools-4.js — MarketPlusView tool code. index.html loads this file and runs it inside start() at the spot where this code used to be (same order, same scope).
   Keep the file name. Tools in this file: STRATS.kzp, STRATS.bbs, STRATS.hrm, STRATS.tts, STRATS.bsp, STRATS.vpn, STRATS.frv, STRATS.hsd, STRATS.prv, STRATS.fsw, STRATS.f3x, STRATS.lpo, STRATS.sdx, STRATS.ard, STRATS.sfa, STRATS.dsz, STRATS.axz, STRATS.pgs, STRATS.pdo */
try{
const KZP_COL={blue:'#2962ff',orange:'#ff9800',green:'#4caf50',red:'#f23645',yellow:'#fdd835',purple:'#9c27b0',aqua:'#00bcd4',lime:'#00e676',teal:'#089981',silver:'#b2b5be',gray:'#787b86',grey:'#787b86',white:'#ffffff',black:'#000000',fuchsia:'#e040fb',maroon:'#880e4f',navy:'#311b92',olive:'#808000',pink:'#ff4081'};
const kzpCol=(s,fb)=>{ s=String(s==null?'':s).trim().toLowerCase(); if(KZP_COL[s]) return KZP_COL[s]; return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s)?s:fb; };
const kzpHM=s=>{ const m=/^\s*(\d{1,2})\s*:?\s*(\d{2})\s*$/.exec(String(s==null?'':s)); if(!m) return null; const h=+m[1], q=+m[2]; return (h>24||q>59)?null:h*60+q; };
const KZP_TZ={'New York':'America/New_York','UTC':'UTC','London':'Europe/London','Frankfurt':'Europe/Berlin','Dubai':'Asia/Dubai','Singapore':'Asia/Singapore','Tokyo':'Asia/Tokyo','Sydney':'Australia/Sydney'};
for(let g=-12;g<=14;g++) KZP_TZ['GMT'+(g<0?'':'+')+g]='Etc/GMT'+(g>0?'-':'+')+Math.abs(g);
const KZP_LIM={'1 minute':60,'5 minutes':300,'15 minutes':900,'30 minutes':1800,'1 hour':3600,'4 hours':14400,'1 day':86400,'No limit':1e12};
const KZP_SIZE={Tiny:8,Small:10,Normal:12,Large:14,Huge:18};
const KZP_DASH={Solid:[],Dashed:[6,4],Dotted:[2,3]};
const KZP_DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ---- timezone offset (seconds), cached per hour so thousands of candles stay cheap ----
const kzpDF={}, kzpOC={};
function kzpOff(zone,t){ if(zone==='UTC') return 0; const b=Math.floor(t/3600), hk=zone+'|'+b; let v=kzpOC[hk]; if(v!==undefined) return v;
  let f=kzpDF[zone]; if(!f) f=kzpDF[zone]=new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
  const p={}; f.formatToParts(new Date(b*3600000)).forEach(x=>{ p[x.type]=+x.value; });
  v=Date.UTC(p.year,p.month-1,p.day,p.hour%24,p.minute,p.second)/1000-b*3600;
  if(Object.keys(kzpOC).length>30000) Object.keys(kzpOC).forEach(k=>delete kzpOC[k]); kzpOC[hk]=v; return v; }

// ---- text inputs: "Time, Color, Label" per line, "Multiplier, Color" per line ('//' = ignored) ----
function kzpLines(txt,withLabel){ const out=[]; String(txt||'').split(/\r?\n/).forEach(l=>{ l=l.trim(); if(!l||l.startsWith('//')) return; const p=l.split(',').map(x=>x.trim()); const m=kzpHM(p[0]); if(m==null) return; out.push({m,col:kzpCol(p[1],null),label:withLabel?p.slice(2).join(',').trim():''}); }); return out; }
function kzpMults(txt){ const out=[]; String(txt||'').split(/\r?\n/).forEach(l=>{ l=l.trim(); if(!l||l.startsWith('//')) return; const p=l.split(',').map(x=>x.trim()); const v=parseFloat(p[0]); if(v>0) out.push({v,col:kzpCol(p[1],null)}); }); return out; }
const kzpFmt=v=>{ if(v==null||!isFinite(v)) return '-'; const a=Math.abs(v); return a>=1000?v.toFixed(1):a>=1?v.toFixed(2):a>=0.01?v.toFixed(4):v.toPrecision(3); };

function kzpDefs(){ return {
  long:false,short:false,limit:false,useSl:false,atr:false,
  tz:'New York',tfLimit:'30 minutes',lblSize:'Tiny',cutOn:false,cutS:'18:00',cutE:'18:01',
  showBoxes:true,sessLimit:3,
  kz:[{on:true,name:'ASIA',col:'#2962ff',s:'20:00',e:'00:00'},{on:true,name:'LNDN',col:'#e53935',s:'02:00',e:'05:00'},{on:true,name:'NYAM',col:'#009688',s:'09:30',e:'11:00'},
      {on:false,name:'NYL',col:'#ff9800',s:'12:00',e:'13:00'},{on:true,name:'NYPM',col:'#9c27b0',s:'13:30',e:'16:00'},{on:false,name:'RTH',col:'#ffffff',s:'09:30',e:'16:00'}],
  showPiv:true,pivStyle:'Solid',pivW:1,showMid:false,midStyle:'Dotted',pivLbl:true,pivLblPos:'Right',alertPiv:true,extPast:'Until Mitigated',extFrom:'Most Recent',
  showTable:true,tblPos:'Top Right',tblSize:'Small',stPiv:true,stLvl:true,stDwm:true,lookback:20,rangeMode:'Average',
  showLvl:false,lvlTxt:'0.25\n0.5\n1.0\n// 1.5\n// 2.0',lvlStyle:'Dotted',
  dwmHist:'Session Limit',alertDwm:false,dwmStyle:'Dotted',
  dwm:{D:{open:false,hl:true,mid:true,div:false,col:'#2962ff'},W:{open:false,hl:true,mid:true,div:false,col:'#089981'},M:{open:false,hl:true,mid:true,div:false,col:'#f23645'}},
  dowOn:false,dowPos:'Bottom',dowAt:'Midnight',hideWk:true,
  showOpen:true,openHist:'Most Recent',openTxt:'0930, blue, NY Open\n1200, orange, Midday\n1600, #ff0000, Close\n// 0000, yellow, Midnight',openStyle:'Dashed',openW:1,openCol:'#787b86',
  showTs:true,tsHist:'Most Recent',tsTxt:'0930, green\n1200, orange\n1600, red\n// 0000, yellow',tsStyle:'Dotted',tsCol:'#787b86' }; }
// fill any setting an older saved copy does not have yet
function kzpFix(Z){ const D=kzpDefs(); Object.keys(D).forEach(k=>{ if(Z[k]===undefined) Z[k]=D[k]; }); ['D','W','M'].forEach(t=>{ if(!Z.dwm[t]) Z.dwm[t]=D.dwm[t]; }); return Z; }

// ---------------------------------------------------------------- calculation
function kzpCompute(c,Z){
  const n=c.length; if(n<3) return null;
  const tfS=tf[3]?tf[3]*30*86400:tf[2], lim=KZP_LIM[Z.tfLimit]||1800;
  if(tfS>lim) return {off:true,why:'Hidden: chart interval is above the '+Z.tfLimit+' limit'};
  const zone=KZP_TZ[Z.tz]||'America/New_York', stepM=tfS/60;
  const look=Math.max(2,Math.floor(Z.lookback)||20), sl=Math.max(1,Math.floor(Z.sessLimit)||3);
  const dy=new Int32Array(n), md=new Float64Array(n), dEnd=new Int32Array(n), mk=new Int32Array(n);
  let lastD=null, lastMk=0;
  for(let i=0;i<n;i++){ const L=c[i].time+kzpOff(zone,c[i].time), d=Math.floor(L/86400); dy[i]=d; md[i]=(L-d*86400)/60;
    if(d!==lastD){ const t=new Date(d*86400000); lastMk=t.getUTCFullYear()*12+t.getUTCMonth(); lastD=d; } mk[i]=lastMk; }
  for(let i=n-1;i>=0;i--) dEnd[i]=(i<n-1&&dy[i+1]===dy[i])?dEnd[i+1]:i;
  // drawing cutoff: candles that overlap the cutoff window
  const cut=[], cs=Z.cutOn?kzpHM(Z.cutS):null; let ce=Z.cutOn?kzpHM(Z.cutE):null;
  if(cs!=null&&ce!=null){ if(ce<=cs) ce+=1440; for(let i=0;i<n;i++){ const a=md[i], b=a+stepM; if((a<ce&&b>cs)||(a<ce-1440&&b>cs-1440)) cut.push(i); } }
  const cutAfter=i=>{ if(!cut.length) return null; let lo=0,hi=cut.length; while(lo<hi){ const m=(lo+hi)>>1; if(cut[m]>i) hi=m; else lo=m+1; } return lo<cut.length?cut[lo]:null; };

  // ---- killzone sessions ----
  const kz=Z.kz||[], insts=[], byK=[];
  if(tfS<86400) kz.forEach((s,k)=>{ byK[k]=[]; if(!s.on) return; const s0=kzpHM(s.s); let e0=kzpHM(s.e); if(s0==null||e0==null) return; if(e0<=s0) e0+=1440;
    let cur=null;
    for(let i=0;i<n;i++){ const a=md[i], b=a+stepM; let key=null;
      if(a<e0&&b>s0) key=dy[i]; else if(a<e0-1440&&b>s0-1440) key=dy[i]-1; if(key==null) continue;
      const x=c[i];
      if(cur&&cur.key===key){ cur.i1=i; if(x.high>cur.hi){ cur.hi=x.high; cur.hiI=i; } if(x.low<cur.lo){ cur.lo=x.low; cur.loI=i; } }
      else { cur={k,key,name:s.name||('S'+(k+1)),col:s.col||'#888888',i0:i,i1:i,hi:x.high,lo:x.low,hiI:i,loI:i,open:x.open}; insts.push(cur); byK[k].push(cur); } } });
  insts.forEach(q=>{ q.rng=q.hi-q.lo; q.done=q.i1<n-1; q.mH=null; q.mL=null; q.dc=0; q.ds=0; q.ds2=0;
    for(let j=q.i1+1;j<n&&(q.mH==null||q.mL==null);j++){ if(q.mH==null&&c[j].high>q.hi) q.mH=j; if(q.mL==null&&c[j].low<q.lo) q.mL=j; }
    for(let i=q.i0;i<=q.i1;i++){ const d=c[i].close-q.open; q.dc++; q.ds+=d; q.ds2+=d*d; } });
  byK.forEach(L=>{ L.forEach((q,j)=>{ const nx=L[j+1]; q.cycDone=!!nx; q.nxI=nx?nx.i0:null; const cy=nx?nx.i0:n; q.hitH=q.mH!=null&&q.mH<cy; q.hitL=q.mL!=null&&q.mL<cy; }); });

  const tag=Z.rangeMode==='Median'?'med':Z.rangeMode==='Standard Deviation'?'\u03c3':'avg';
  const meas=arr=>{ if(!arr.length) return null;
    if(Z.rangeMode==='Median'){ const v=arr.map(q=>q.rng).sort((a,b)=>a-b), m=v.length>>1; return v.length%2?v[m]:(v[m-1]+v[m])/2; }
    if(Z.rangeMode==='Standard Deviation'){ let cn=0,s=0,s2=0; arr.forEach(q=>{ cn+=q.dc; s+=q.ds; s2+=q.ds2; }); if(cn<2) return null; const mean=s/cn; return Math.sqrt(Math.max(0,s2/cn-mean*mean)); }
    return arr.reduce((a,q)=>a+q.rng,0)/arr.length; };
  const mults=kzpMults(Z.lvlTxt);
  byK.forEach(L=>{ L.forEach((q,j)=>{ q.R=meas(L.slice(Math.max(0,j-look),j).filter(x=>x.done)); // snapshot at this session's open
    q.lv=mults.map(m=>q.R==null?null:{up:q.hi>=q.open+m.v*q.R,dn:q.lo<=q.open-m.v*q.R}); }); });

  // ---- previous day / week / month ----
  const per={D:[],W:[],M:[]}, keyOf={D:i=>dy[i],W:i=>Math.floor((dy[i]+3)/7),M:i=>mk[i]};
  ['D','W','M'].forEach(tg=>{ const P=per[tg], kf=keyOf[tg]; let cur=null;
    for(let i=0;i<n;i++){ const k=kf(i), x=c[i];
      if(!cur||cur.key!==k){ cur={key:k,i0:i,i1:i,hi:x.high,lo:x.low,open:x.open,prev:P.length?P[P.length-1]:null}; P.push(cur); }
      else { cur.i1=i; if(x.high>cur.hi) cur.hi=x.high; if(x.low<cur.lo) cur.lo=x.low; } }
    P.forEach(p=>{ p.bH=null; p.bL=null; if(!p.prev) return; for(let i=p.i0;i<=p.i1;i++){ if(p.bH==null&&c[i].high>=p.prev.hi) p.bH=i; if(p.bL==null&&c[i].low<=p.prev.lo) p.bL=i; if(p.bH!=null&&p.bL!=null) break; } }); });

  // ---- alerts (events) ----
  const ev=[];
  byK.forEach(L=>{ L.slice(-1).forEach(q=>{ if(q.mH!=null) ev.push({i:q.mH,time:c[q.mH].time,kind:'piv',msg:q.name+' high broken',col:q.col}); if(q.mL!=null) ev.push({i:q.mL,time:c[q.mL].time,kind:'piv',msg:q.name+' low broken',col:q.col}); }); });
  ['D','W','M'].forEach(tg=>{ const cf=Z.dwm[tg]; if(!cf||!cf.hl) return; const P=per[tg], p=P[P.length-1]; if(!p||!p.prev) return;
    if(p.bH!=null) ev.push({i:p.bH,time:c[p.bH].time,kind:'dwm',msg:'P'+tg+'H broken',col:cf.col}); if(p.bL!=null) ev.push({i:p.bL,time:c[p.bL].time,kind:'dwm',msg:'P'+tg+'L broken',col:cf.col}); });

  // ---- stats table ----
  const rate=(arr,f)=>{ const a=arr; if(a.length<1) return null; let h=0; a.forEach(x=>{ if(f(x)) h++; }); return {p:h/a.length,n:a.length}; };
  const tbl=[];
  byK.forEach(L=>{ if(!L.length) return; const done=L.filter(x=>x.done), cyc=L.filter(x=>x.cycDone), last=L[L.length-1];
    tbl.push({kind:'kz',name:last.name,col:last.col,range:last.rng,avgv:meas(done.slice(-look)),hi:rate(L,x=>x.hitH),lo:rate(L,x=>x.hitL),hiNow:last.mH!=null,loNow:last.mL!=null,
      lv:mults.map((m,mi)=>{ const a=L.filter(x=>x.lv&&x.lv[mi]); return {u:rate(a,x=>x.lv[mi].up),dn:rate(a,x=>x.lv[mi].dn),uNow:!!(last.lv&&last.lv[mi]&&last.lv[mi].up),dNow:!!(last.lv&&last.lv[mi]&&last.lv[mi].dn)}; })}); });
  ['D','W','M'].forEach(tg=>{ const cf=Z.dwm[tg], P=per[tg]; if(!cf||!cf.hl||P.length<2) return; const cur=P[P.length-1], done=P.slice(1);
    tbl.push({kind:'dwm',name:'P'+tg,col:cf.col,range:cur.hi-cur.lo,avgv:cur.prev.hi-cur.prev.lo,hi:rate(done,x=>x.hi>x.prev.hi),lo:rate(done,x=>x.lo<x.prev.lo),hiNow:cur.hi>cur.prev.hi,loNow:cur.lo<cur.prev.lo,lv:[]}); });

  // ---- opening prices / timestamps / day-of-week ----
  const hc=h=>h==='All'?1e9:h==='Session Limit'?sl:1;
  const occ=(rules,hist)=>rules.map(R=>{ const idx=[]; let ld=null; for(let i=0;i<n;i++){ if(dy[i]!==ld&&md[i]<=R.m&&R.m<md[i]+stepM){ idx.push(i); ld=dy[i]; } } const sel=idx.slice(-hc(hist)); return {m:R.m,col:R.col,label:R.label,idx:sel,nx:sel.map(i=>{ const k=idx.indexOf(i); return k+1<idx.length?idx[k+1]:null; })}; });
  const open=Z.showOpen?occ(kzpLines(Z.openTxt,true),Z.openHist):[], ts=Z.showTs?occ(kzpLines(Z.tsTxt,false),Z.tsHist):[];
  const dow=[]; if(Z.dowOn){ let ld=null; for(let i=0;i<n;i++){ const wd=(dy[i]+4)%7; let hit=false;
      if(Z.dowAt==='Midday'){ hit=dy[i]!==ld&&md[i]<=720&&720<md[i]+stepM; } else hit=dy[i]!==ld;
      if(hit){ ld=dy[i]; if(!(Z.hideWk&&(wd===0||wd===6))) dow.push({i,t:KZP_DOW[wd]}); } } }
  const bad={n:0}; const chk=(txt,f)=>String(txt||'').split(/\r?\n/).forEach(l=>{ l=l.trim(); if(!l||l.startsWith('//')) return; if(!f(l.split(',')[0])) bad.n++; });
  chk(Z.openTxt,v=>kzpHM(v)!=null); chk(Z.tsTxt,v=>kzpHM(v)!=null); chk(Z.lvlTxt,v=>parseFloat(v)>0);
  return {n,off:false,tfS,insts,byK,mults,tag,per,tbl,ev,open,ts,dow,dEnd,cutAfter,sl,bad};
}
const kzpC={};
function kzpGet(Z){ const c=candles; if(!c||c.length<3) return null; kzpFix(Z); const l=c[c.length-1];
  const key=[c.length,c[0].time,l.time,l.high,l.low,tf[0],JSON.stringify(Z,(k,v)=>(k[0]==='_'||k==='vis'||k==='sid')?undefined:v)].join('|');
  let e=kzpC[Z.sid]; if(!e||e.k!==key){ let r=null; try{ r=kzpCompute(c,Z); }catch(err){ console.error('kzp compute',err); } e=kzpC[Z.sid]={k:key,r}; } return e.r; }

// ---------------------------------------------------------------- drawing
function kzpDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<3) return; const r=kzpGet(Z); if(!r||r.off) return;
  const fs=KZP_SIZE[Z.lblSize]||8, n=r.n, sl=r.sl, x0b=X(0), x1b=X(1), bw=(x0b!=null&&x1b!=null)?Math.abs(x1b-x0b):6;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip();
  const setLn=(st,w,col)=>{ cx.setLineDash(KZP_DASH[st]||[]); cx.lineWidth=w||1; cx.strokeStyle=col; cx.globalAlpha=1; };
  const hl=(i0,i1,p,col,st,w)=>{ const y=Y(p), xa=i0==null?0:X(i0), xb=i1==null?W:X(i1); if(y==null||xa==null||xb==null) return null;
    if(xb>=0&&xa<=W){ setLn(st,w,col); cx.beginPath(); cx.moveTo(xa,y); cx.lineTo(xb,y); cx.stroke(); } return {xa,xb,y}; };
  const vl=(i,col,st,w)=>{ const x=X(i); if(x==null||x<0||x>W) return; setLn(st,w,col); cx.beginPath(); cx.moveTo(x,0); cx.lineTo(x,H); cx.stroke(); };
  const lbl=(t,s,col,pos,above)=>{ if(!s||!t) return; cx.setLineDash([]); cx.globalAlpha=1; cx.font=fs+'px system-ui'; cx.fillStyle=col; cx.textBaseline=above?'bottom':'top';
    const xa=Math.max(2,s.xa), xb=Math.min(W-2,s.xb); let x,al;
    if(pos==='Left'){ x=xa+2; al='left'; } else if(pos==='Center'){ x=(xa+xb)/2; al='center'; } else { x=xb-2; al='right'; }
    if(xb<2||xa>W-2) return; cx.textAlign=al; cx.fillText(t,x,s.y+(above?-1:1)); };
  const lastOf=k=>{ const L=r.byK[k]; return L&&L.length?L[L.length-1]:null; };
  const shown=[]; r.byK.forEach(L=>{ L.slice(-sl).forEach(q=>shown.push(q)); });

  // killzone boxes
  if(Z.showBoxes) shown.forEach(q=>{ const xa=X(q.i0), xb=X(q.i1), ya=Y(q.hi), yb=Y(q.lo); if(xa==null||xb==null||ya==null||yb==null) return;
    const L=xa-bw/2, Wd=Math.max(2,xb-xa+bw), T=Math.min(ya,yb), Hh=Math.max(1,Math.abs(yb-ya));
    cx.setLineDash([]); cx.globalAlpha=.22; cx.fillStyle=q.col; cx.fillRect(L,T,Wd,Hh); cx.globalAlpha=.85; cx.strokeStyle=q.col; cx.lineWidth=1; cx.strokeRect(L,T,Wd,Hh);
    if(Wd>34){ cx.globalAlpha=.5; cx.fillStyle=q.col; cx.font='bold '+(fs+5)+'px system-ui'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(q.name,L+Wd/2,T+Hh/2); } cx.globalAlpha=1; });

  // pivots (+ midpoints)
  if(Z.showPiv) shown.forEach(q=>{ const allS=Z.extFrom==='All Sessions'||Z.extFrom==='All', past=Z.extPast==='Past Mitigation', stopAt=(!allS&&q.nxI!=null)?q.nxI:null;
    [true,false].forEach(isH=>{ const p=isH?q.hi:q.lo, si=isH?q.hiI:q.loI, mi0=isH?q.mH:q.mL, mi=(mi0!=null&&(stopAt==null||mi0<stopAt))?mi0:null;
      let end=(mi!=null&&!past)?mi:null; if(stopAt!=null&&(end==null||stopAt<end)) end=stopAt; const ce=r.cutAfter(si); if(ce!=null&&(end==null||ce<end)) end=ce;
      let s1; if(past&&mi!=null&&(end==null||end>mi)){ s1=hl(si,mi,p,q.col,Z.pivStyle,Z.pivW); hl(mi,end,p,'#808080',Z.pivStyle,Z.pivW); } else s1=hl(si,end,p,q.col,Z.pivStyle,Z.pivW);
      if(Z.pivLbl) lbl(q.name+(isH?' High':' Low'),s1,q.col,Z.pivLblPos,isH); });
    if(Z.showMid){ const mid=(q.hi+q.lo)/2; let end=stopAt; const ce=r.cutAfter(q.i1); if(ce!=null&&(end==null||ce<end)) end=ce; hl(q.i1,end,mid,q.col,Z.midStyle,Z.pivW); } });

  // range levels (snapshots at each session open)
  if(Z.showLvl&&r.mults.length) shown.forEach(q=>{ if(q.R==null) return; r.mults.forEach(m=>{ const col=m.col||q.col; [1,-1].forEach(sg=>{ const s1=hl(q.i0,q.i1,q.open+sg*m.v*q.R,col,Z.lvlStyle,1); lbl((sg>0?'+':'-')+m.v+' '+r.tag,s1,col,'Right',sg>0); }); }); });

  // previous day / week / month (labels sitting at the same price on the latest period are merged, e.g. "D OPEN / W OPEN")
  const dmg=[];
  ['D','W','M'].forEach(tg=>{ const cf=Z.dwm[tg], P=r.per[tg]; if(!cf||!P.length) return; const cnt=Z.dwmHist==='All'?P.length:Z.dwmHist==='Most Recent'?1:sl;
    P.slice(-cnt).forEach(p=>{ const latest=p===P[P.length-1], e=latest?null:p.i1, put=(t,s,price,above)=>{ if(latest) dmg.push({t,s,col:cf.col,above,price}); else lbl(t,s,cf.col,'Right',above); };
      if(cf.hl&&p.prev){ put('P'+tg+'H',hl(p.i0,e,p.prev.hi,cf.col,Z.dwmStyle,1),p.prev.hi,true); put('P'+tg+'L',hl(p.i0,e,p.prev.lo,cf.col,Z.dwmStyle,1),p.prev.lo,false);
        if(cf.mid){ const m=(p.prev.hi+p.prev.lo)/2; put('P'+tg+'M',hl(p.i0,e,m,cf.col,Z.dwmStyle,1),m,true); } }
      if(cf.open) put(tg+' OPEN',hl(p.i0,e,p.open,cf.col,Z.dwmStyle,1),p.open,true);
      if(cf.div&&p.i0>0) vl(p.i0,cf.col,Z.dwmStyle,1); }); });
  { const used=new Array(dmg.length).fill(false);
    dmg.forEach((a,i)=>{ if(used[i]) return; let t=a.t; for(let j=i+1;j<dmg.length;j++){ if(!used[j]&&Math.abs(dmg[j].price-a.price)<=Math.abs(a.price)*1e-9){ used[j]=true; t+=' / '+dmg[j].t; } } lbl(t,a.s,a.col,'Right',a.above); }); }

  // opening prices
  r.open.forEach(R=>{ const col=R.col||Z.openCol; R.idx.forEach((i,jx)=>{ let end=R.nx[jx]; const ce=r.cutAfter(i); if(ce!=null&&(end==null||ce<end)) end=ce; lbl(R.label,hl(i,end,c[i].open,col,Z.openStyle,Z.openW),col,'Right',true); }); });
  // vertical timestamps
  r.ts.forEach(R=>{ const col=R.col||Z.tsCol; R.idx.forEach(i=>vl(i,col,Z.tsStyle,1)); });
  // day-of-week labels
  if(r.dow.length){ cx.setLineDash([]); cx.globalAlpha=1; cx.font=fs+'px system-ui'; cx.fillStyle='#9aa3b5'; cx.textAlign='center'; const top=Z.dowPos==='Top'; cx.textBaseline=top?'top':'bottom';
    r.dow.forEach(q=>{ const x=X(q.i); if(x==null||x<0||x>W) return; cx.fillText(q.t,x,top?3:H-3); }); }

  // stats table
  if(Z.showTable&&r.tbl.length){
    const rows=r.tbl.filter(q=>q.kind==='kz'||Z.stDwm), tfs={Tiny:8,Small:10,Normal:12,Large:14}[Z.tblSize]||10, showHL=Z.stPiv||(Z.stDwm&&rows.some(q=>q.kind==='dwm')), showLv=Z.stLvl&&r.mults.length;
    if(rows.length){
      const head=['','Range']; if(showHL) head.push('High','Low'); if(showLv) r.mults.forEach(m=>head.push(m.v+'x'));
      const pc=v=>v==null?'-':Math.round(v.p*100)+'%', pr=(a,b)=>(a==null?'-':Math.round(a.p*100))+'/'+(b==null?'-':Math.round(b.p*100));
      const body=rows.map(q=>{ const cells=[{t:q.name,bg:q.col,fg:'#fff'},{t:kzpFmt(q.range),hit:q.avgv!=null&&q.avgv>0&&q.range/q.avgv>=1,bg:q.col}];
        if(showHL){ const on=q.kind==='dwm'||Z.stPiv; cells.push({t:on?pc(q.hi):'',hit:on&&q.hiNow,bg:q.col},{t:on?pc(q.lo):'',hit:on&&q.loNow,bg:q.col}); }
        if(showLv) r.mults.forEach((m,mi)=>{ const v=q.lv&&q.lv[mi]; cells.push(v?{t:pr(v.u,v.dn),hit:v.uNow||v.dNow,bg:q.col}:{t:''}); });
        return cells; });
      cx.setLineDash([]); cx.globalAlpha=1; cx.font=tfs+'px system-ui';
      const cw=head.map((h,j)=>Math.max(cx.measureText(h).width,...body.map(b=>cx.measureText(b[j].t).width))+10), rh=tfs+8, tw=cw.reduce((a,v)=>a+v,0), th=rh*(body.length+1), pos=Z.tblPos||'Top Right';
      const ox=pos.indexOf('Left')>=0?4:pos.indexOf('Center')>=0?(W-tw)/2:W-tw-4, oy=pos.indexOf('Bottom')>=0?H-th-4:pos.indexOf('Middle')>=0?(H-th)/2:4;
      cx.textAlign='center'; cx.textBaseline='middle';
      const cell=(x,y,w,t,bg,fg,al)=>{ cx.globalAlpha=.94; cx.fillStyle=bg; cx.fillRect(x,y,w,rh); cx.globalAlpha=1; cx.strokeStyle='#363a45'; cx.lineWidth=1; cx.strokeRect(x+.5,y+.5,w-1,rh-1); cx.fillStyle=fg; cx.fillText(t,x+w/2,y+rh/2+.5); };
      let x=ox; head.forEach((h,j)=>{ cell(x,oy,cw[j],h,'#1e222d','#d1d4dc'); x+=cw[j]; });
      body.forEach((b,i)=>{ let xx=ox; b.forEach((q,j)=>{ cell(xx,oy+rh*(i+1),cw[j],q.t,q.hit||q.bg&&j===0?q.bg:'#131722',q.hit||j===0?'#fff':'#d1d4dc'); xx+=cw[j]; }); }); } }
  if(r.bad&&r.bad.n){ const msg='\u26a0 '+r.bad.n+' setting line'+(r.bad.n>1?'s':'')+' could not be read'; cx.setLineDash([]); cx.font='11px system-ui'; const bw2=cx.measureText(msg).width+14;
    cx.globalAlpha=.92; cx.fillStyle='#4a1f26'; cx.fillRect(W-bw2-4,H-26,bw2,20); cx.globalAlpha=1; cx.strokeStyle='#f23645'; cx.lineWidth=1; cx.strokeRect(W-bw2-3.5,H-25.5,bw2-1,19);
    cx.fillStyle='#ffd7dc'; cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(msg,W-bw2/2-4,H-16); }
  cx.restore();
}

// ---------------------------------------------------------------- settings dialog
function kzpArea(b,obj,key,label,rows){ const r=document.createElement('label'); r.className='fr'; r.style.display='block'; const sp=document.createElement('span'); sp.textContent=label; sp.style.display='block';
  const ta=document.createElement('textarea'); ta.rows=rows||5; ta.value=obj[key]||''; ta.style.cssText='width:100%;box-sizing:border-box;margin-top:6px;background:#111;color:#e6e6e6;border:1px solid #3a3a3a;border-radius:8px;padding:8px;font:13px/1.4 monospace';
  ta.oninput=()=>{ obj[key]=ta.value; }; r.appendChild(sp); r.appendChild(ta); b.appendChild(r); }
const kzpHead=(b,t)=>{ const h=document.createElement('div'); h.textContent=t; h.style.cssText='margin:14px 0 4px;font-size:12px;letter-spacing:.06em;color:#8a93a6;text-transform:uppercase'; b.appendChild(h); };
const kzpNote=(b,t)=>{ const h=document.createElement('div'); h.textContent=t; h.style.cssText='color:#8a93a6;font-size:12px;line-height:1.45;padding:4px 0'; b.appendChild(h); };
function kzpSettings(){ const Zs=strat; kzpFix(Zs); const ST=['Solid','Dashed','Dotted'], HI=['Most Recent','Session Limit','All'];
  openModal('KZP Killzones & Pivots',{
    Killzones:(b,d)=>{ if(window.rcBtn) window.rcBtn(b,'kzp','KZP Killzones & Pivots'); fld(b,d,'showBoxes','chk','Show boxes'); fld(b,d,'sessLimit','num','Session limit (kept per killzone)',{min:1,max:30});
      d.kz.forEach(s=>{ kzpHead(b,s.name||'Session'); fld(b,s,'on','chk','Enabled'); fld(b,s,'name','txt','Label'); fld(b,s,'s','txt','Start (HH:MM)'); fld(b,s,'e','txt','End (HH:MM)'); fld(b,s,'col','col','Color'); }); },
    Pivots:(b,d)=>{ fld(b,d,'showPiv','chk','Show pivots (session highs / lows)'); fld(b,d,'pivStyle','sel','Pivot line style',{opts:ST}); fld(b,d,'pivW','num','Pivot line width',{min:1,max:5});
      fld(b,d,'showMid','chk','Midpoints'); fld(b,d,'midStyle','sel','Midpoint style',{opts:ST}); fld(b,d,'pivLbl','chk','Pivot labels'); fld(b,d,'pivLblPos','sel','Label position',{opts:['Left','Center','Right']});
      fld(b,d,'alertPiv','chk','Alert broken pivots'); fld(b,d,'extPast','sel','Extend pivots',{opts:['Until Mitigated','Past Mitigation']}); fld(b,d,'extFrom','sel','...from which sessions',{opts:['Most Recent','All Sessions']});
      kzpNote(b,'Past Mitigation keeps the line going after price trades through it (the part after the break turns grey).'); },
    Range:(b,d)=>{ fld(b,d,'showTable','chk','Show data table'); fld(b,d,'tblPos','sel','Table position',{opts:['Top Left','Top Center','Top Right','Middle Left','Middle Center','Middle Right','Bottom Left','Bottom Center','Bottom Right']}); fld(b,d,'tblSize','sel','Table size',{opts:['Tiny','Small','Normal','Large']});
      fld(b,d,'stPiv','chk','Pivot stats'); fld(b,d,'stLvl','chk','Range level stats'); fld(b,d,'stDwm','chk','D/W/M stats'); fld(b,d,'lookback','num','Data lookback (sessions)',{min:2,max:200});
      fld(b,d,'rangeMode','sel','Range measurement',{opts:['Average','Median','Standard Deviation']}); fld(b,d,'showLvl','chk','Show range levels'); kzpArea(b,d,'lvlTxt','Multiplier, Color (one per line)',5); fld(b,d,'lvlStyle','sel','Level style',{opts:ST});
      kzpNote(b,'Example line: 1.5, purple. Lines starting with // are ignored. Levels are fixed at each session open.'); },
    'Day / Week / Month':(b,d)=>{ fld(b,d,'dwmHist','sel','History',{opts:['Most Recent','Session Limit','All']}); fld(b,d,'alertDwm','chk','Alert high/low break'); fld(b,d,'dwmStyle','sel','Line style',{opts:ST});
      [['D','Day'],['W','Week'],['M','Month']].forEach(([t,nm])=>{ kzpHead(b,nm); const o=d.dwm[t]; fld(b,o,'open','chk',t+' Open'); fld(b,o,'hl','chk','Previous high / low'); fld(b,o,'mid','chk','Midline'); fld(b,o,'div','chk','Divider'); fld(b,o,'col','col','Color'); });
      kzpHead(b,'Day of week'); fld(b,d,'dowOn','chk','Day of week labels'); fld(b,d,'dowPos','sel','Position',{opts:['Bottom','Top']}); fld(b,d,'dowAt','sel','Shown at',{opts:['Midnight','Midday']}); fld(b,d,'hideWk','chk','Hide weekend labels'); },
    'Open & Time':(b,d)=>{ kzpHead(b,'Opening prices'); fld(b,d,'showOpen','chk','Show opening prices'); fld(b,d,'openHist','sel','History',{opts:HI}); kzpArea(b,d,'openTxt','Time, Color, Label (one per line)',5);
      fld(b,d,'openStyle','sel','Style',{opts:ST}); fld(b,d,'openW','num','Width',{min:1,max:5}); fld(b,d,'openCol','col','Default color');
      kzpHead(b,'Timestamps'); fld(b,d,'showTs','chk','Show timestamps'); fld(b,d,'tsHist','sel','History',{opts:HI}); kzpArea(b,d,'tsTxt','Time, Color (one per line)',5); fld(b,d,'tsStyle','sel','Style',{opts:ST}); fld(b,d,'tsCol','col','Default color'); },
    Global:(b,d)=>{ fld(b,d,'cutOn','chk','Drawing cutoff time'); fld(b,d,'cutS','txt','Cutoff start (HH:MM)'); fld(b,d,'cutE','txt','Cutoff end (HH:MM)'); fld(b,d,'tz','sel','Timezone',{opts:Object.keys(KZP_TZ)});
      fld(b,d,'lblSize','sel','Label size',{opts:Object.keys(KZP_SIZE)}); fld(b,d,'tfLimit','sel','Timeframe limit',{opts:Object.keys(KZP_LIM)}); kzpNote(b,'Nothing is drawn when the chart interval is above the timeframe limit. Lower intraday charts work best.'); },
    Visibility:(b,d)=>visFlds(b,d.vis)
  },clone(Zs),d=>{ const ix=strats.findIndex(z=>z.sid===d.sid); if(ix>=0) strats[ix]=d; else strats.push(d); strat=d; kzpC[d.sid]=null; resetSig(); runStrategy(true); },
  ()=>({sid:Zs.sid,k:Zs.k,on:Zs.on,...SDEF('kzp')}));
}

// ---------------------------------------------------------------- registration
STRATS.kzp={label:'KZP \u00b7 Killzones, pivots, range stats and key levels (ICT sessions)',short:'KZP Killzones & Pivots',own:true,
  get defs(){ return kzpDefs(); },
  sig:()=>0,
  watch:(cl,Z,quiet)=>{ const r=kzpGet(Z); if(!r){ Z._stat=''; return; } if(r.off){ Z._stat=r.why; return; }
    const ncl=candles.length-2; let mx=Z._kal||0;
    r.ev.forEach(e=>{ if(e.i>ncl) return; if(!quiet&&e.i===ncl&&e.time>(Z._kal||0)&&(e.kind==='piv'?Z.alertPiv:Z.alertDwm)) toast(e.msg+' \u00b7 '+sym[0]+' '+tf[0],e.col); mx=Math.max(mx,e.time); });
    Z._kal=mx; const act=r.byK.filter(L=>L.length).length; Z._stat=act+' killzones tracked \u00b7 '+Z.tz+' time'; }};
{ const _kzD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='kzpview') return kzpDraw(d,X,Y,W,H); return _kzD.apply(this,arguments); };
  const _kzR=recomputeExtras; recomputeExtras=function(){ _kzR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='kzp'&&stVis(Z)) scriptBoxes.push({type:'kzpview',pts:[],o:Z}); }); };
  const _kzS=stratSettings; stratSettings=function(){ if(strat&&strat.k==='kzp') return kzpSettings(); return _kzS.apply(this,arguments); };
  const _kzN=stratName; stratName=function(k){ k=k||strat; if(k&&k.k==='kzp'){ const on=(k.kz||[]).filter(s=>s.on).map(s=>s.name).join(' '); return STRATS.kzp.short+(on?' \u00b7 '+on:''); } return _kzN.apply(this,arguments); }; }
}catch(err){ console.error('kzp strategy failed',err); window.__kzpErr=err; }


// =====================================================================================
// [bbs] STRATEGY · "Breaker Blocks with Signals"   (self-contained: every name starts with bbs / BBS)
// Port of the LuxAlgo idea: swing structure -> MSS -> breaker block (failed order block) -> retest signals,
// optional R:R take-profit lines, premium/discount swing zones. Appears in the Strategies list.
// Hooks (same pattern as ccz / kzp): STRATS.bbs + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const BBS_KEYS=['bbLen','bbBody','bb2','bbStop','bbPD','bbTp','rr1','rr2','rr3'];
function bbsCompute(c,Z){
  const n=c.length, L=Math.max(2,Math.round(Z.bbLen)||5);
  const ph=[], pl=[], boxes=[], sigs=[], tps=[];
  let wB=null, wU=null, bb=null;
  const rrs=[Z.rr1||2,Z.rr2||3,Z.rr3||4];
  const endBox=(t)=>{ if(bb&&!bb.done){ bb.end=Math.min(bb.end,t); bb.done=true; } };
  for(let t=L*2;t<n;t++){
    const p=t-L; let isH=true,isL=true;
    for(let j=p-L;j<=p+L;j++){ if(j===p) continue;
      if(j<p?c[j].high>c[p].high:c[j].high>=c[p].high) isH=false;
      if(j<p?c[j].low<c[p].low:c[j].low<=c[p].low) isL=false; }
    if(isH){ const pv=ph[ph.length-1], hh=!!pv&&c[p].high>pv.p; ph.push({i:p,p:c[p].high,hh,k:'h',brk:null});
      let ok=hh; if(ok&&Z.bbPD){ let mx=-1e18,mn=1e18; for(let j=Math.max(0,p-150);j<=t;j++){ mx=Math.max(mx,c[j].high); mn=Math.min(mn,c[j].low); } ok=c[p].high>=(mx+mn)/2; }
      if(ok){ let lo=null; for(let q=pl.length-1;q>=0;q--) if(pl[q].i<p){ lo=pl[q]; break; } if(lo) wB={hh:p,lo:lo.p,loI:lo.i}; } }
    if(isL){ const pv=pl[pl.length-1], ll=!!pv&&c[p].low<pv.p; pl.push({i:p,p:c[p].low,hh:ll,k:'l',brk:null});
      let ok=ll; if(ok&&Z.bbPD){ let mx=-1e18,mn=1e18; for(let j=Math.max(0,p-150);j<=t;j++){ mx=Math.max(mx,c[j].high); mn=Math.min(mn,c[j].low); } ok=c[p].low<=(mx+mn)/2; }
      if(ok){ let hi=null; for(let q=ph.length-1;q>=0;q--) if(ph[q].i<p){ hi=ph[q]; break; } if(hi) wU={ll:p,hi:hi.p,hiI:hi.i}; } }
    const b=c[t];
    // ---- active breaker block: signals, cancel / reset, swing break stop
    if(bb&&!bb.done&&t>bb.mss){
      const bear=bb.dir<0;
      if(isL&&bear&&p>bb.mss) bb.ref=pl[pl.length-1];
      if(isH&&!bear&&p>bb.mss) bb.ref=ph[ph.length-1];
      const inBox=b.open<=bb.top&&b.open>=bb.bot;
      let sg=0;
      if(bear){ if(b.close<bb.bot&&inBox&&!bb.cancel) sg=-1; }
      else { if(b.close>bb.top&&inBox&&!bb.cancel) sg=1; }
      if(sg) sigs.push({i:t,v:sg,box:bb});
      if(Z.bbStop){ if(bear?b.close>bb.avg:b.close<bb.avg) bb.cancel=true; else if(bear?b.close<bb.bot:b.close>bb.top) bb.cancel=false; }
      if(bb.ref&&(bear?b.close<bb.ref.p:b.close>bb.ref.p)){ if(!sg) sigs.push({i:t,v:bear?-1:1,box:bb,brk:true}); bb.end=t; bb.done=true; }
    }
    // ---- market structure shift -> new breaker block (replaces the previous pattern)
    if(wB&&t>wB.hh&&b.close<wB.lo){
      let k=wB.hh; for(let j=wB.hh;j>=Math.max(0,wB.loI);j--) if(c[j].close<c[j].open){ k=j; break; }
      let top=-1e18,bot=1e18; for(let j=Math.max(0,k-(Z.bb2?1:0));j<=k;j++){ const x=c[j]; top=Math.max(top,Z.bbBody?Math.max(x.open,x.close):x.high); bot=Math.min(bot,Z.bbBody?Math.min(x.open,x.close):x.low); }
      endBox(t); bb={dir:-1,i0:k,top,bot,avg:(top+bot)/2,mss:t,end:n-1,done:false,cancel:false,ref:null}; boxes.push(bb); wB=null; wU=null;
    } else if(wU&&t>wU.ll&&b.close>wU.hi){
      let k=wU.ll; for(let j=wU.ll;j>=Math.max(0,wU.hiI);j--) if(c[j].close>c[j].open){ k=j; break; }
      let top=-1e18,bot=1e18; for(let j=Math.max(0,k-(Z.bb2?1:0));j<=k;j++){ const x=c[j]; top=Math.max(top,Z.bbBody?Math.max(x.open,x.close):x.high); bot=Math.min(bot,Z.bbBody?Math.min(x.open,x.close):x.low); }
      endBox(t); bb={dir:1,i0:k,top,bot,avg:(top+bot)/2,mss:t,end:n-1,done:false,cancel:false,ref:null}; boxes.push(bb); wB=null; wU=null;
    }
  }
  // ---- take-profit lines for signals of the latest breaker block (and earlier ones, drawn until hit)
  sigs.forEach(s=>{ const d=s.v, bx=s.box, e=c[s.i].close, sl=d<0?bx.top:bx.bot, risk=Math.abs(sl-e); if(!(risk>0)) return;
    const lv=rrs.map(r=>e+(d<0?-1:1)*risk*r), hit=[null,null,null]; let end=n-1;
    for(let u=s.i+1;u<n;u++){ lv.forEach((q,x)=>{ if(hit[x]==null&&(d<0?c[u].low<=q:c[u].high>=q)) hit[x]=u; });
      if(d<0?c[u].close>=sl:c[u].close<=sl){ end=u; break; } if(hit[2]!=null){ end=u; break; } }
    tps.push({i0:s.i,d,e,sl,lv,hit,end}); });
  // ---- swing break highlights + PD arrays (last pivots)
  [ph,pl].forEach(arr=>{ arr.slice(-8).forEach(q=>{ for(let u=q.i+L+1;u<n;u++){ if(q.k==='h'?c[u].close>q.p:c[u].close<q.p){ q.brk=u; break; } } }); });
  return {n,c,ph,pl,boxes,sigs,tps,bb:boxes[boxes.length-1]||null,L,mapS:new Map(sigs.map(s=>[s.i,s.v]))};
}
const bbsC={sig:{},draw:{}};
function bbsGet(slot,c,Z){ const key=[c.length,c[0].time,c[c.length-1].time,c[c.length-1].high,c[c.length-1].low,c[c.length-1].close,BBS_KEYS.map(k=>Z[k]).join(',')].join('|');
  const m=bbsC[slot]; if(!m[Z.sid]||m[Z.sid].k!==key) m[Z.sid]={k:key,r:bbsCompute(c,Z)}; return m[Z.sid].r; }
function bbsDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=bbsGet('draw',c,Z), n=r.n;
  const pos=Z.bbPosCol||'#089981', neg=Z.bbNegCol||'#f23645', tx=Z.bbTxtCol||'#b2b5be', ln=Z.bbLineCol||'#b2b5be';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  const xr=Math.min(W,(X(n-1)||W)+30);
  if(Z.bbShowPDZ&&r.ph.length&&r.pl.length){ const hi=r.ph[r.ph.length-1], lo=r.pl[r.pl.length-1], x0=X(Math.min(hi.i,lo.i)), yH=Y(hi.p), yL=Y(lo.p), yM=Y((hi.p+lo.p)/2);
    if(x0!=null&&yH!=null&&yL!=null){ cx.globalAlpha=.1; cx.fillStyle=neg; cx.fillRect(x0,Math.min(yH,yM),xr-x0,Math.abs(yM-yH)); cx.fillStyle=pos; cx.fillRect(x0,Math.min(yL,yM),xr-x0,Math.abs(yL-yM)); cx.globalAlpha=.5; cx.strokeStyle=tx; cx.setLineDash([3,3]); cx.beginPath(); cx.moveTo(x0,yM); cx.lineTo(xr,yM); cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1; } }
  if(Z.bbSwings!==false){
    const pv=[...r.ph.slice(-5),...r.pl.slice(-5)].sort((a,b)=>a.i-b.i);
    cx.strokeStyle=ln; cx.globalAlpha=.6; cx.lineWidth=1; cx.beginPath(); let st=false;
    pv.forEach(q=>{ const x=X(q.i),y=Y(q.p); if(x==null||y==null) return; if(!st){ cx.moveTo(x,y); st=true; } else cx.lineTo(x,y); }); cx.stroke(); cx.globalAlpha=1;
    cx.font='9px system-ui'; cx.textAlign='center'; cx.fillStyle=tx;
    pv.forEach(q=>{ const x=X(q.i),y=Y(q.p); if(x==null||y==null) return; const h=q.k==='h'; cx.textBaseline=h?'bottom':'top'; cx.fillText(h?(q.hh?'HH':'H'):(q.hh?'LL':'L'),x,h?y-3:y+3); });
    // PD arrays: premium at swing highs, discount at swing lows, extended until traded through
    [[r.ph.slice(-2),neg,'Premium PD Array',true],[r.pl.slice(-2),pos,'Discount PD Array',false]].forEach(([arr,col,nm,h])=>{ arr.forEach(q=>{
      const x0=X(q.i), x1=X(q.brk!=null?q.brk:n-1), y0=Y(q.p), cb=c[q.i], y1=Y(h?Math.max(cb.open,cb.close):Math.min(cb.open,cb.close)); if(x0==null||x1==null||y0==null||y1==null) return;
      cx.globalAlpha=.25; cx.fillStyle=col; cx.fillRect(x0,Math.min(y0,y1),Math.max(1,x1-x0),Math.max(2,Math.abs(y1-y0))); cx.globalAlpha=.8; cx.strokeStyle=col; cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y0); cx.stroke();
      cx.globalAlpha=.85; cx.fillStyle=tx; cx.font='8px system-ui'; cx.textAlign='left'; cx.textBaseline=h?'top':'bottom'; cx.fillText(nm,x0+14,y0+(h?2:-2)); cx.font='9px system-ui'; cx.globalAlpha=1; }); });
  }
  if(Z.bbHiSwing){ cx.setLineDash([4,3]); cx.lineWidth=1.2; [...r.ph.slice(-8),...r.pl.slice(-8)].forEach(q=>{ if(q.brk==null) return; const x0=X(q.i),x1=X(q.brk),y=Y(q.p); if(x0==null||x1==null||y==null) return;
      const up=q.k==='h'; cx.strokeStyle=up?pos:neg; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.fillStyle=up?pos:neg; cx.textAlign='center'; cx.textBaseline=up?'bottom':'top'; cx.fillText('BOS',(x0+x1)/2,y+(up?-2:2)); }); cx.setLineDash([]); }
  const bx=r.bb;
  if(bx){ const col=bx.dir>0?pos:neg, x0=X(bx.i0), x1=X(bx.end), yT=Y(bx.top), yB=Y(bx.bot), yA=Y(bx.avg);
    if(x0!=null&&x1!=null&&yT!=null&&yB!=null){ const x2=bx.done?x1:xr;
      cx.globalAlpha=.22; cx.fillStyle=col; cx.fillRect(x0,Math.min(yT,yB),Math.max(1,x2-x0),Math.max(1,Math.abs(yB-yT)));
      cx.globalAlpha=.9; cx.strokeStyle=col; cx.lineWidth=1; cx.strokeRect(x0,Math.min(yT,yB),Math.max(1,x2-x0),Math.max(1,Math.abs(yB-yT)));
      cx.setLineDash([3,3]); cx.beginPath(); cx.moveTo(x0,yA); cx.lineTo(x2,yA); cx.stroke(); cx.setLineDash([]);
      cx.globalAlpha=1; cx.fillStyle=col; cx.font='bold 9px system-ui'; cx.textAlign='right'; cx.textBaseline='middle'; cx.fillText(bx.dir>0?'+BB':'-BB',x0-3,(yT+yB)/2); } }
  r.sigs.slice(-30).forEach(s=>{ const x=X(s.i); if(x==null) return; const up=s.v>0, y=Y(up?c[s.i].low:c[s.i].high); if(y==null) return; const q=5, b=y+(up?7:-7);
    cx.fillStyle='#ff9800'; cx.beginPath(); if(up){ cx.moveTo(x-q,b+q); cx.lineTo(x+q,b+q); cx.lineTo(x,b); } else { cx.moveTo(x-q,b-q); cx.lineTo(x+q,b-q); cx.lineTo(x,b); } cx.closePath(); cx.fill(); });
  if(Z.bbTp){ const col=Z.bbTpCol||'#2962ff'; cx.font='9px system-ui'; cx.textBaseline='bottom'; cx.textAlign='left';
    r.tps.slice(-6).forEach(t=>{ const x0=X(t.i0), x1=X(t.end); if(x0==null||x1==null) return;
      t.lv.forEach((q,k)=>{ const y=Y(q); if(y==null) return; const xe=t.hit[k]!=null?X(t.hit[k]):x1; if(xe==null) return;
        cx.strokeStyle=col; cx.globalAlpha=t.hit[k]!=null?.5:.9; cx.setLineDash([5,3]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(xe,y); cx.stroke(); cx.setLineDash([]);
        cx.fillStyle=col; cx.globalAlpha=1; cx.fillText('TP'+(k+1)+(t.hit[k]!=null?' \u2713':''),x0+2,y-1); }); }); }
  cx.restore();
}
STRATS.bbs={label:'Breaker Blocks with Signals \u00b7 MSS breaker block, retest signals, R:R take profit, premium/discount swings',short:'Breaker Blocks with Signals',own:true,
  defs:{limit:false,useSl:false,bbLen:5,bbBody:false,bb2:false,bbStop:true,bbPD:false,bbShowPDZ:false,bbHiSwing:false,bbSwings:true,bbTxtCol:'#b2b5be',bbLineCol:'#b2b5be',
    bbTp:false,bbTpCol:'#2962ff',rr1:2,rr2:3,rr3:4,bbPosCol:'#089981',bbNegCol:'#f23645'},
  inputs:(b,d)=>{
    fld(b,d,'bbLen','num','Market structure \u00b7 swing length',{min:2,max:50,step:1});
    fld(b,d,'bbBody','chk','Use only candle body'); fld(b,d,'bb2','chk','Use 2 candles instead of 1'); fld(b,d,'bbStop','chk','Stop at first break of center line');
    fld(b,d,'bbPD','chk','Only when E is in Premium/Discount Array'); fld(b,d,'bbShowPDZ','chk','Show Premium/Discount Zone');
    fld(b,d,'bbHiSwing','chk','Highlight Swing Breaks'); fld(b,d,'bbSwings','chk','Show Swings/PD Arrays');
    fld(b,d,'bbTxtCol','col','Text color'); fld(b,d,'bbLineCol','col','Swing line color');
    fld(b,d,'bbTp','chk','Enable TP'); fld(b,d,'bbTpCol','col','TP color');
    fld(b,d,'rr1','num','R:R 1  (1 : x)',{min:0.1,step:0.05}); fld(b,d,'rr2','num','R:R 2  (1 : x)',{min:0.1,step:0.05}); fld(b,d,'rr3','num','R:R 3  (1 : x)',{min:0.1,step:0.05});
    fld(b,d,'bbPosCol','col','+BB color'); fld(b,d,'bbNegCol','col','-BB color'); },
  sig:(c,i,n,Z)=>{ if(c.length<20) return 0; return bbsGet('sig',c,Z).mapS.get(i)||0; }};
try{ DESC.bbs='Strategy \u00b7 swing MSS builds breaker blocks; BUY / SELL on retest, optional R:R take-profit lines'; }catch(e){}   // DESC lives in another scope; the label is the fallback description
{ const _bbD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='bbsview') return bbsDraw(d,X,Y,W,H); return _bbD.apply(this,arguments); };
  const _bbR=recomputeExtras; recomputeExtras=function(){ _bbR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='bbs'&&stVis(Z)) scriptBoxes.push({type:'bbsview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('bbs strategy failed',err); window.__bbsErr=err; }


// =====================================================================================
// [hrm] STRATEGY · "Harmonics"   (self-contained: every name starts with hrm / HRM)
// Gartley / Bat / Butterfly / Crab / Shark / Cypher detection from zigzag swings, 0-100 pattern score,
// potential (XABC) + completed (XABCD) patterns, limit entries after C or D, two targets, stop,
// win-rate statistics table. Hooks: STRATS.hrm + draw + recomputeExtras (nothing existing is edited).
// =====================================================================================
try{
const HRM_TG=['.382 AD','.618 AD','1.272 AD','1.618 AD','C','.618 CD','1.618 XA'];
const HRM_T=[
 {k:'gartley',n:'Gartley',s:'G',t1:'.618 AD',t2:'1.272 AD',ck:[['ab',.618,.618],['bc',.382,.886],['cd',1.13,1.618],['ad',.786,.786,1]],prz:['ad',.786]},
 {k:'bat',n:'Bat',s:'Ba',t1:'.618 AD',t2:'1.272 AD',ck:[['ab',.382,.5],['bc',.382,.886],['cd',1.618,2.618],['ad',.886,.886,1]],prz:['ad',.886]},
 {k:'butterfly',n:'Butterfly',s:'Bf',t1:'.618 AD',t2:'1.272 AD',ck:[['ab',.786,.786],['bc',.382,.886],['cd',1.618,2.24],['ad',1.272,1.272,1]],prz:['ad',1.272]},
 {k:'crab',n:'Crab',s:'Cr',t1:'.618 AD',t2:'1.618 AD',ck:[['ab',.382,.618],['bc',.382,.886],['cd',2.24,3.618],['ad',1.618,1.618,1]],prz:['ad',1.618]},
 {k:'shark',n:'Shark',s:'S',t1:'.382 AD',t2:'C',ck:[['ab',.382,.886],['bc',1.13,1.618],['dx',.886,1.13,1]],prz:['dx',1]},
 {k:'cypher',n:'Cypher',s:'Cy',t1:'.618 CD',t2:'1.618 XA',ck:[['ab',.382,.618],['cx',1.272,1.414],['dx',.786,.786,1]],prz:['dx',.786]}];
const hrmRS=(v,lo,hi,err)=>{ if(v>=lo&&v<=hi) return 100; const d=(v<lo?lo-v:hi<v?v-hi:0)/((lo+hi)/2)*100; return d>err?-1:100-40*d/err; };
function hrmRatios(X,A,B,C,D){ const XA=Math.abs(A.p-X.p), AB=Math.abs(A.p-B.p), BC=Math.abs(C.p-B.p), XC=Math.abs(C.p-X.p);
  const r={ab:AB/XA,bc:BC/AB,cx:XC/XA}; if(D){ const CD=Math.abs(C.p-D.p); r.cd=CD/BC; r.ad=Math.abs(A.p-D.p)/XA; r.dx=CD/XC; } return r; }
function hrmScore(T,r,full,err,W){ let sw=0,ss=0; for(const [k,lo,hi,d] of T.ck){ if(!full&&d) continue; if(r[k]==null) continue; const s=hrmRS(r[k],lo,hi,err); if(s<0) return -1; const w=d?W:1; sw+=w; ss+=w*s; } return sw?ss/sw:-1; }
function hrmPrz(T,bull,X,A,C){ const s=bull?1:-1, XA=Math.abs(A.p-X.p), XC=Math.abs(C.p-X.p); return T.prz[0]==='ad'?A.p-s*T.prz[1]*XA:C.p-s*T.prz[1]*XC; }
function hrmTgt(nm,bull,X,A,C,D){ const s=bull?1:-1, AD=Math.abs(A-D), CD=Math.abs(C-D);
  switch(nm){ case '.382 AD': return D+s*.382*AD; case '.618 AD': return D+s*.618*AD; case '1.272 AD': return D+s*1.272*AD; case '1.618 AD': return D+s*1.618*AD;
    case 'C': return C; case '.618 CD': return D+s*.618*CD; default: return D+s*1.618*Math.abs(A-X); } }
function hrmCompute(c,Z){
  const n=c.length, L=Math.max(2,Math.round(Z.hrmLen)||5), err=Z.hrmErr||15, W=Z.hrmWt||4, asy=1+(Z.hrmAsym||250)/100;
  const pv=[], pats=[], sigs=[], trades=[]; let pend=[]; const filled=new Set();
  const en=k=>Z['hrm_'+k]!==false, dirOk=bull=>bull?Z.hrmBull!==false:Z.hrmBear!==false;
  const mkPend=(pat,kind,entry,t)=>{ const bull=pat.bull, T=pat.T, X=pat.X,A=pat.A,C=pat.C; const D=kind==='C'?pat.prz:pat.D.p;
    const t1=hrmTgt(Z['hrm_t1_'+T.k]||T.t1,bull,X.p,A.p,C.p,D), t2=hrmTgt(Z['hrm_t2_'+T.k]||T.t2,bull,X.p,A.p,C.p,D);
    const span=Math.max(3,(kind==='C'?C.i-X.i:pat.D.i-X.i));
    pend.push({pat,kind,dir:bull?1:-1,entry,t1,t2,key:X.i+'-'+C.i,exp:t+(kind==='C'?Math.max(10,span):Math.max(2,Math.round((Z.hrmDWin||.5)*span))),inv:kind==='C'?pat.prz-(bull?1:-1)*0.3*Math.abs(C.p-X.p):pat.D.p}); };
  for(let t=L*2;t<n;t++){
    const b=c[t];
    // ---- pending limit entries
    pend=pend.filter(p=>{ if(t>p.exp) return false; if(p.dir>0?b.low<p.inv:b.high>p.inv) return false;
      let f=null; const d=p.dir;
      if(p.kind==='C') f=d>0?(b.low<=p.entry?Math.min(p.entry,b.open):null):(b.high>=p.entry?Math.max(p.entry,b.open):null);
      else f=d>0?(b.high>=p.entry?Math.max(p.entry,b.open):null):(b.low<=p.entry?Math.min(p.entry,b.open):null);
      if(f==null) return true; if(filled.has(p.key)) return false;
      if(d*(p.t1-f)<=0) return false;
      const stop=f-d*Math.abs(p.t1-f)*(Z.hrmStop||75)/100;
      const tr={pat:p.pat,dir:d,e:f,stop,t1:p.t1,t2:p.t2,f:t,h1:null,h2:null,res:null,ret:0,end:null,kind:p.kind,r1:d*(p.t1-f)/f*100,r2:d*(p.t2-f)/f*100};
      trades.push(tr); sigs.push({i:t,v:d}); p.pat.tr=tr; filled.add(p.key); return false; });
    // ---- open trades
    trades.forEach(tr=>{ if(tr.res||tr.f>=t) return; const d=tr.dir, sp=tr.h1!=null?tr.e:tr.stop;
      if(d>0?b.low<=sp:b.high>=sp){ tr.res=tr.h1!=null?'be':'sl'; tr.ret=tr.h1!=null?tr.r1/2:-Math.abs(tr.e-tr.stop)/tr.e*100; tr.end=t; return; }
      if(tr.h1==null&&(d>0?b.high>=tr.t1:b.low<=tr.t1)) tr.h1=t;
      if(tr.h1!=null&&tr.h2==null&&(d>0?b.high>=tr.t2:b.low<=tr.t2)){ tr.h2=t; tr.res='tp'; tr.ret=(tr.r1+tr.r2)/2; tr.end=t; } });
    // ---- zigzag pivots confirmed on this bar
    const p=t-L; let isH=true,isL=true;
    for(let j=p-L;j<=p+L;j++){ if(j===p) continue; if(j<p?c[j].high>c[p].high:c[j].high>=c[p].high) isH=false; if(j<p?c[j].low<c[p].low:c[j].low<=c[p].low) isL=false; }
    let changed=false;
    const add=(k,price)=>{ const last=pv[pv.length-1];
      if(last&&last.k===k){ if(k==='h'?price>last.p:price<last.p){ pv[pv.length-1]={k,i:p,p:price}; return true; } return false; }
      pv.push({k,i:p,p:price}); return true; };
    if(isH&&add('h',c[p].high)) changed=true; if(isL&&add('l',c[p].low)) changed=true;
    if(!changed) continue;
    const m=pv.length, doneNow=[], potNow=[];
    const legOk=(X,A,B,C,D)=>{ const q=[A.i-X.i,B.i-A.i,C.i-B.i].concat(D?[D.i-C.i]:[]); return Math.max(...q)/Math.max(1,Math.min(...q))<=asy; };
    if(m>=5){ const [X,A,B,C,D]=pv.slice(m-5); const bull=D.k==='l';
      if(legOk(X,A,B,C,D)&&dirOk(bull)){ const r=hrmRatios(X,A,B,C,D);
        HRM_T.forEach(T=>{ if(!en(T.k)) return; const s=hrmScore(T,r,true,err,W); if(s<60) return;
          const pat={id:pats.length,T,bull,X,A,B,C,D,score:s,kind:'done',tr:null}; pats.push(pat); doneNow.push(pat); }); } }
    if(m>=4){ const [X,A,B,C]=pv.slice(m-4); const bull=C.k==='h';
      if(legOk(X,A,B,C)&&dirOk(bull)){ const r=hrmRatios(X,A,B,C,null);
        HRM_T.forEach(T=>{ if(!en(T.k)) return; const s=hrmScore(T,r,false,err,W); if(s<60) return; const prz=hrmPrz(T,bull,X,A,C);
          if(bull?prz>=C.p:prz<=C.p) return; const pat={id:pats.length,T,bull,X,A,B,C,D:null,prz,score:s,kind:'pot',tr:null}; pats.push(pat); potNow.push(pat); }); } }
    // ---- entries
    if(doneNow.length){ pend=pend.filter(q=>!(q.kind==='C'&&doneNow.some(d=>d.X.i+'-'+d.C.i===q.key)));
      if(Z.hrmEnD!==false){ const best=doneNow.sort((a,b)=>b.score-a.score)[0];
        if(best.score>=(Z.hrmDScore||90)&&!filled.has(best.X.i+'-'+best.C.i)){ const lim=(Z.hrmDLim||1)/100, e=best.D.p*(1+(best.bull?1:-1)*lim); mkPend(best,'D',e,t); } } }
    else if(potNow.length&&Z.hrmEnC!==false){ const best=potNow.sort((a,b)=>b.score-a.score)[0];
      if(best.score>=(Z.hrmCScore||90)&&!filled.has(best.X.i+'-'+best.C.i)&&(best.bull?best.prz<b.close:best.prz>b.close)) mkPend(best,'C',best.prz,t); }
  }
  // ---- statistics per type
  const stats=HRM_T.map(T=>{ const ps=pats.filter(q=>q.T===T&&q.kind==='done'&&q.score>=(Z.hrmHigh!==false?80:60)), tr=trades.filter(x=>x.pat.T===T), cl=tr.filter(x=>x.res);
    return {T,pat:ps.length,trd:tr.length,t1:cl.length?cl.filter(x=>x.h1!=null).length/cl.length*100:0,t2:cl.length?cl.filter(x=>x.h2!=null).length/cl.length*100:0,
      avg:cl.length?cl.reduce((a,x)=>a+x.ret,0)/cl.length:0,tot:cl.reduce((a,x)=>a+x.ret,0)}; });
  return {n,pats,trades,sigs,stats,last:pv[pv.length-1]||null,mapS:new Map(sigs.map(s=>[s.i,s.v]))};
}
const hrmCache={sig:{},draw:{}};
function hrmGet(slot,c,Z){ const key=[c.length,c[0].time,c[c.length-1].time,c[c.length-1].high,c[c.length-1].low,c[c.length-1].close,Object.keys(Z).filter(k=>k.indexOf('hrm')===0).sort().map(k=>Z[k]).join(',')].join('|');
  const m=hrmCache[slot]; if(!m[Z.sid]||m[Z.sid].k!==key) m[Z.sid]={k:key,r:hrmCompute(c,Z)}; return m[Z.sid].r; }
function hrmDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<30) return; const r=hrmGet('draw',c,Z), n=r.n;
  const bc=Z.hrmBullCol||'#43a047', sc=Z.hrmBearCol||'#e53935', tx=Z.hrmTxtCol||'#d1d4dc';
  const minS=Z.hrmHigh!==false?80:60;
  const show=p=>(p.bull?Z.hrmBull!==false:Z.hrmBear!==false)&&p.score>=minS&&(p.kind==='done'||(Z.hrmPot!==false&&r.last&&p.C.i===r.last.i&&p.C.p===r.last.p))&&(!Z.hrmLB||(p.D||p.C).i>=n-(Z.hrmLBn||100))&&(Z['hrm_'+p.T.k]!==false);
  const list=r.pats.filter(show).slice(-10);
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineWidth=1.3;
  const P=q=>[X(q.i),Y(q.p)];
  list.forEach(p=>{ const col=p.bull?bc:sc, pts=[p.X,p.A,p.B,p.C].concat(p.D?[p.D]:[]).map(P); if(pts.some(q=>q[0]==null||q[1]==null)) return;
    const poly=(a)=>{ cx.beginPath(); a.forEach((q,i)=>i?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1])); cx.closePath(); };
    cx.globalAlpha=.16; cx.fillStyle=col; poly([pts[0],pts[1],pts[2]]); cx.fill(); if(pts[4]){ poly([pts[2],pts[3],pts[4]]); cx.fill(); }
    cx.globalAlpha=.95; cx.strokeStyle=col; cx.beginPath(); pts.forEach((q,i)=>i?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1])); cx.stroke();
    cx.globalAlpha=.5; cx.setLineDash([2,3]); cx.beginPath(); cx.moveTo(pts[0][0],pts[0][1]); cx.lineTo(pts[2][0],pts[2][1]); cx.moveTo(pts[1][0],pts[1][1]); cx.lineTo(pts[3][0],pts[3][1]);
    if(pts[4]){ cx.moveTo(pts[2][0],pts[2][1]); cx.lineTo(pts[4][0],pts[4][1]); cx.moveTo(pts[0][0],pts[0][1]); cx.lineTo(pts[4][0],pts[4][1]); } cx.stroke(); cx.setLineDash([]);
    cx.globalAlpha=1; cx.font='9px system-ui'; cx.textAlign='center'; cx.fillStyle=tx;
    ['X','A','B','C','D'].slice(0,pts.length).forEach((nm,i)=>{ const up=(i===0?p.X:i===1?p.A:i===2?p.B:i===3?p.C:p.D).k==='h'; cx.textBaseline=up?'bottom':'top'; cx.fillText(nm,pts[i][0],pts[i][1]+(up?-3:3)); });
    let lx,ly,res='';
    if(p.D){ lx=pts[4][0]; ly=pts[4][1]; if(p.tr){ res=p.tr.res==='sl'?' \u2717':p.tr.h1!=null?' \u2713':p.tr.res?'':' \u231b'; } }
    else { const pz=Y(p.prz), cxx=pts[3][0], xe=Math.min(W,(X(n-1)||W)+20); if(pz!=null){ cx.globalAlpha=.8; cx.strokeStyle=col; cx.setLineDash([4,3]); cx.beginPath(); cx.moveTo(cxx,pts[3][1]); cx.lineTo(xe,pz); cx.stroke(); cx.setLineDash([]); lx=xe; ly=pz; res=' PRZ'; } }
    if(lx!=null){ const txt=p.T.s+' '+p.score.toFixed(1)+res, w=cx.measureText(txt).width+8, up=p.D?p.D.k==='h':!p.bull;
      cx.globalAlpha=.85; cx.fillStyle=p.bull?'#16351f':'#3a1818'; cx.fillRect(lx-w/2,ly+(up?-22:6),w,15); cx.strokeStyle=col; cx.strokeRect(lx-w/2,ly+(up?-22:6),w,15);
      cx.globalAlpha=1; cx.fillStyle=tx; cx.textBaseline='middle'; cx.fillText(txt,lx,ly+(up?-14.5:13.5)); }
    if(p.tr){ const tr=p.tr, x0=X(tr.f), x1=X(tr.end!=null?tr.end:n-1); if(x0!=null&&x1!=null){ cx.font='8px system-ui'; cx.textAlign='left';
      [[tr.t1,'#43a047','T1'],[tr.t2,'#26a69a','T2'],[tr.stop,'#e53935','SL'],[tr.e,'#9aa0b4','E']].forEach(([v,cl,nm])=>{ const y=Y(v); if(y==null) return; cx.globalAlpha=.7; cx.strokeStyle=cl; cx.setLineDash([3,3]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]); cx.globalAlpha=1; cx.fillStyle=cl; cx.textBaseline='bottom'; cx.fillText(nm,x1+2,y); }); } }
  });
  if(Z.hrmTbl!==false){ const rows=r.stats, x0=6, y0=58, cw=[26,28,28,40,40,44,46], hd=['','Pat','Trd','T1%','T2%','Avg%','Tot%'], rh=13, tw=cw.reduce((a,b)=>a+b,0);
    cx.globalAlpha=.88; cx.fillStyle='#1b1f2b'; cx.fillRect(x0,y0,tw+6,rh*(rows.length+2)+4); cx.globalAlpha=1; cx.font='9px system-ui'; cx.textBaseline='middle'; cx.textAlign='right';
    const row=(y,vals,col)=>{ let x=x0+3; vals.forEach((v,i)=>{ x+=cw[i]; cx.fillStyle=col; cx.fillText(v,x,y); }); };
    row(y0+rh/2+2,hd,'#8a90a5');
    rows.forEach((s,i)=>row(y0+rh*(i+1)+rh/2+2,[s.T.s,s.pat,s.trd,s.t1.toFixed(0),s.t2.toFixed(0),s.avg.toFixed(2),s.tot.toFixed(1)],tx));
    const tt=rows.reduce((a,s)=>({p:a.p+s.pat,t:a.t+s.trd,r:a.r+s.tot}),{p:0,t:0,r:0}); row(y0+rh*(rows.length+1)+rh/2+2,['All',tt.p,tt.t,'','','',tt.r.toFixed(1)],'#ffd54f'); }
  cx.restore();
}
const hrmDefs={limit:false,useSl:false,hrmLen:5,hrmBull:true,hrmBear:true,hrmPot:true,hrmHigh:true,hrmLB:false,hrmLBn:100,hrmEnC:true,hrmCScore:90,hrmEnD:true,hrmDLim:1,hrmDScore:90,hrmDWin:.5,hrmStop:75,
  hrmErr:15,hrmWt:4,hrmAsym:250,hrmBullCol:'#43a047',hrmBearCol:'#e53935',hrmTxtCol:'#d1d4dc',hrmTbl:true};
HRM_T.forEach(T=>{ hrmDefs['hrm_'+T.k]=true; hrmDefs['hrm_t1_'+T.k]=T.t1; hrmDefs['hrm_t2_'+T.k]=T.t2; });
STRATS.hrm={label:'Harmonics \u00b7 Gartley, Bat, Butterfly, Crab, Shark, Cypher with scoring, targets and stats',short:'Harmonics',own:true,defs:hrmDefs,
  inputs:(b,d)=>{
    fld(b,d,'hrmBull','chk','Include Bullish'); fld(b,d,'hrmBear','chk','Include Bearish'); fld(b,d,'hrmPot','chk','Include Potential / Incomplete'); fld(b,d,'hrmHigh','chk','Only high scoring (80+)');
    fld(b,d,'hrmLB','chk','Limit to lookback bars'); fld(b,d,'hrmLBn','num','Lookback bars',{min:10,step:10}); fld(b,d,'hrmLen','num','Swing length (bars each side)',{min:2,max:30,step:1});
    HRM_T.forEach(T=>{ fld(b,d,'hrm_'+T.k,'chk',T.n); fld(b,d,'hrm_t1_'+T.k,'sel','  '+T.n+' \u00b7 Target 1',{opts:HRM_TG}); fld(b,d,'hrm_t2_'+T.k,'sel','  '+T.n+' \u00b7 Target 2',{opts:HRM_TG}); });
    fld(b,d,'hrmEnC','chk','Enter after Point C (limit at PRZ)'); fld(b,d,'hrmCScore','num','  If score is above',{min:60,max:100});
    fld(b,d,'hrmEnD','chk','Enter after Point D'); fld(b,d,'hrmDLim','num','  Enter at limit % away from D',{min:0,step:0.1}); fld(b,d,'hrmDScore','num','  If score is above',{min:60,max:100});
    fld(b,d,'hrmDWin','num','  Entry window (x pattern length)',{min:0.1,step:0.1}); fld(b,d,'hrmStop','num','Stop (% of distance entry \u2192 Target 1)',{min:10,max:300});
    fld(b,d,'hrmErr','num','Allowed fib ratio error %',{min:1,max:60}); fld(b,d,'hrmWt','num','Weight of point D ratio',{min:1,max:10}); fld(b,d,'hrmAsym','num','Allowed leg length asymmetry %',{min:0,max:1000});
    fld(b,d,'hrmTbl','chk','Show statistics table'); fld(b,d,'hrmBullCol','col','Bullish colour'); fld(b,d,'hrmBearCol','col','Bearish colour'); fld(b,d,'hrmTxtCol','col','Label text'); },
  sig:(c,i,n,Z)=>{ if(c.length<30) return 0; return hrmGet('sig',c,Z).mapS.get(i)||0; }};
try{ DESC.hrm='Strategy \u00b7 scored harmonic patterns (XABCD) with limit entries, 2 targets, stop and stats'; }catch(e){}
{ const _hD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='hrmview') return hrmDraw(d,X,Y,W,H); return _hD.apply(this,arguments); };
  const _hR=recomputeExtras; recomputeExtras=function(){ _hR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='hrm'&&stVis(Z)) scriptBoxes.push({type:'hrmview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('hrm strategy failed',err); window.__hrmErr=err; }



// =====================================================================================
// [tts] STRATEGY · "Trend Targets" (AlgoAlpha port)   (self-contained: every name starts with tts / TTS)
// Supertrend bands -> WMA -> EMA trend line. BUY / SELL on every trend-line turn, rejection arrows when price keeps
// touching the line, and Entry / Stop Loss / TP1-TP3 levels (ATR based) with hit marks. Appears in the Strategies list.
// Hooks (same pattern as bbs / hrm): STRATS.tts + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const TTS_KEYS=['ttsF','ttsAtr','ttsWma','ttsEma','ttsRej','ttsVol','ttsSlM','ttsTp1','ttsTp2','ttsTp3'];
function ttsRma(a,len){ const o=new Array(a.length).fill(null); let s=0,cnt=0,prev=null;
  for(let i=0;i<a.length;i++){ const v=a[i]; if(v==null) continue;
    if(prev==null){ s+=v; cnt++; if(cnt===len){ prev=s/len; o[i]=prev; } } else { prev=(prev*(len-1)+v)/len; o[i]=prev; } }
  return o; }
function ttsAtrArr(c,len){ const tr=c.map((x,i)=>i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low); return ttsRma(tr,len); }
function ttsWma(a,len){ const o=new Array(a.length).fill(null), den=len*(len+1)/2;
  for(let i=len-1;i<a.length;i++){ let s=0,ok=true; for(let k=0;k<len;k++){ const v=a[i-len+1+k]; if(v==null){ ok=false; break; } s+=v*(k+1); } if(ok) o[i]=s/den; }
  return o; }
function ttsEma(a,len){ const o=new Array(a.length).fill(null), al=2/(len+1); let prev=null,s=0,cnt=0;
  for(let i=0;i<a.length;i++){ const v=a[i]; if(v==null) continue;
    if(prev==null){ s+=v; cnt++; if(cnt===len){ prev=s/len; o[i]=prev; } } else { prev=al*v+(1-al)*prev; o[i]=prev; } }
  return o; }
function ttsCompute(c,Z){
  const n=c.length, F=+Z.ttsF||12, AP=Math.max(1,Math.round(Z.ttsAtr)||90), WL=Math.max(1,Math.round(Z.ttsWma)||40), EL=Math.max(1,Math.round(Z.ttsEma)||14);
  const CONT=Math.max(1,Math.round(Z.ttsRej)||3), VP=Math.max(1,Math.round(Z.ttsVol)||14);
  const atr=ttsAtrArr(c,AP), vol=ttsAtrArr(c,VP);
  const lwr=new Array(n).fill(null), upr=new Array(n).fill(null), mid=new Array(n).fill(null);
  for(let i=0;i<n;i++){ if(atr[i]==null) continue; const src=(c[i].high+c[i].low)/2; let lo=src-F*atr[i], up=src+F*atr[i];
    const pl=lwr[i-1]!=null?lwr[i-1]:0, pu=upr[i-1]!=null?upr[i-1]:0;
    lo=(lo>pl||(i>0&&c[i-1].close<pl))?lo:pl; up=(up<pu||(i>0&&c[i-1].close>pu))?up:pu;
    lwr[i]=lo; upr[i]=up; mid[i]=(lo+up)/2; }
  const tL=ttsEma(ttsWma(mid,WL),EL);
  const trend=new Array(n).fill(0), sigs=[], flips=[], rejUp=[], rejDn=[], map=new Map();
  let tr=0, rc=0;
  for(let i=0;i<n;i++){
    const t0=tL[i], t1=i>0?tL[i-1]:null, t2=i>1?tL[i-2]:null; const prevTr=tr;
    if(t0!=null&&t1!=null&&t2!=null){
      if(t0>t1&&t1<=t2) tr=1; else if(t0<t1&&t1>=t2) tr=-1; }
    trend[i]=tr;
    if(t0!=null){
      const rb=tr===1&&c[i].high>t0&&c[i].low<t0, rs=tr===-1&&c[i].high>t0&&c[i].low<t0;
      if(rb||rs) rc++;
      const crossed=(prevTr<=0&&tr>0)||(prevTr>=0&&tr<0);
      if(crossed||(!(rb||rs)&&rc>0)) rc=0;
      if(rc>CONT&&tr===1) rejUp.push(i); if(rc>CONT&&tr===-1) rejDn.push(i); }
    if(prevTr<=0&&tr>0&&i>0){ flips.push({i,v:1}); }
    if(prevTr>=0&&tr<0&&i>0){ flips.push({i,v:-1}); }
    const ls=prevTr<=0&&tr>0, ss=prevTr>=0&&tr<0;
    if((ls||ss)&&vol[i]!=null){ const d=ls?1:-1, e=c[i].close, sl=ls?c[i].low-vol[i]*Z.ttsSlM:c[i].high+vol[i]*Z.ttsSlM, risk=Math.abs(e-sl);
      sigs.push({i,v:d,e,sl,lv:[e+d*risk*Z.ttsTp1,e+d*risk*Z.ttsTp2,e+d*risk*Z.ttsTp3],hit:[null,null,null],slHit:null,end:n-1});
      map.set(i,d); }
  }
  // targets: first touch after the signal; stop is assumed first when both are touched in one candle
  sigs.forEach((s,k)=>{ const nx=sigs[k+1]?sigs[k+1].i:n; let end=nx>=n?n-1:nx;
    for(let u=s.i+1;u<nx&&u<n;u++){ const b=c[u];
      if(s.v>0?b.low<=s.sl:b.high>=s.sl){ s.slHit=u; end=u; break; }
      s.lv.forEach((q,x)=>{ if(s.hit[x]==null&&(s.v>0?b.high>=q:b.low<=q)) s.hit[x]=u; });
      if(s.hit[2]!=null){ end=u; break; } }
    s.end=end; });
  return {n,tL,trend,sigs,flips,rejUp,rejDn,mapS:map};
}
const ttsC={sig:{},draw:{}};
function ttsGet(slot,c,Z){ const key=[c.length,c[0].time,c[c.length-1].time,c[c.length-1].high,c[c.length-1].low,c[c.length-1].close,TTS_KEYS.map(k=>Z[k]).join(',')].join('|');
  const m=ttsC[slot]; if(!m[Z.sid]||m[Z.sid].k!==key) m[Z.sid]={k:key,r:ttsCompute(c,Z)}; return m[Z.sid].r; }
const ttsP=v=>{ const a=Math.abs(v), d=a>=1000?2:a>=1?4:a>=.01?6:8; return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:d}); };
function ttsDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<30) return; const r=ttsGet('draw',c,Z), n=r.n;
  const up=Z.ttsUp||'#00ffbb', dn=Z.ttsDn||'#ff1100', rd='#ff1100';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  const xr=Math.min(W,(X(n-1)||W)+40), from=Math.max(1,n-4000);
  // trend line, coloured by trend
  cx.lineWidth=2; cx.globalAlpha=.8;
  let seg=null;
  const flush=()=>{ if(seg){ cx.stroke(); seg=null; } };
  for(let i=from;i<n;i++){ const t0=r.tL[i], t1=r.tL[i-1]; if(t0==null||t1==null){ flush(); continue; }
    const x0=X(i-1), x1=X(i), y0=Y(t1), y1=Y(t0); if(x0==null||x1==null||y0==null||y1==null){ flush(); continue; }
    if(x1<-20) continue; if(x0>W+20) break;
    const col=r.trend[i]===1?up:dn; if(seg!==col){ flush(); cx.strokeStyle=col; cx.beginPath(); seg=col; cx.moveTo(x0,y0); } cx.lineTo(x1,y1); }
  flush(); cx.globalAlpha=1;
  // trend-change labels
  r.flips.forEach(f=>{ if(f.i<from) return; const x=X(f.i), y=Y(r.tL[f.i]); if(x==null||y==null||x<-20||x>W+20) return; const u=f.v>0, col=u?up:dn, q=6;
    cx.fillStyle=col; cx.globalAlpha=.9; cx.beginPath(); if(u){ cx.moveTo(x,y); cx.lineTo(x-q,y+q*1.6); cx.lineTo(x+q,y+q*1.6); } else { cx.moveTo(x,y); cx.lineTo(x-q,y-q*1.6); cx.lineTo(x+q,y-q*1.6); } cx.closePath(); cx.fill(); cx.globalAlpha=1; });
  // rejection arrows
  if(Z.ttsShowRej!==false){ cx.font='9px system-ui'; cx.textAlign='center';
    r.rejUp.forEach(i=>{ if(i<from) return; const x=X(i), y=Y(c[i].low); if(x==null||y==null||x<-20||x>W+20) return; cx.fillStyle=up; cx.textBaseline='top'; cx.fillText('\u25B2',x,y+3); });
    r.rejDn.forEach(i=>{ if(i<from) return; const x=X(i), y=Y(c[i].high); if(x==null||y==null||x<-20||x>W+20) return; cx.fillStyle=dn; cx.textBaseline='bottom'; cx.fillText('\u25BC',x,y-3); }); }
  // entry / stop / take-profit levels
  if(Z.ttsTP!==false){ const last=r.sigs.slice(-Math.max(1,Math.round(Z.ttsHist)||1));
    cx.font='9px system-ui'; cx.textBaseline='middle';
    last.forEach((s,k)=>{ const isLast=k===last.length-1, x0=X(s.i); if(x0==null) return;
      const ext=(isLast&&s.end>=n-1&&s.slHit==null&&s.hit[2]==null)?xr:X(s.end); if(ext==null) return;
      const ye=Y(s.e), ys=Y(s.sl), y3=Y(s.lv[2]); if(ye==null||ys==null||y3==null) return;
      cx.globalAlpha=.09; cx.fillStyle=rd; cx.fillRect(x0,Math.min(ye,ys),Math.max(1,ext-x0),Math.abs(ys-ye)); cx.fillStyle=up; cx.fillRect(x0,Math.min(ye,y3),Math.max(1,ext-x0),Math.abs(y3-ye));
      const lines=[[s.e,'Entry \u25B8 ',s.v>0?up:dn,null,1],[s.sl,'\u2718 SL \u25B8 ',rd,s.slHit,.75],...s.lv.map((q,x)=>[q,' \u2714 TP'+(x+1)+' \u25B8 ',up,s.hit[x],.75])];
      lines.forEach(([p,tx,col,hit,al])=>{ const y=Y(p); if(y==null) return; const xe=hit!=null?X(hit):ext; if(xe==null) return;
        cx.globalAlpha=al; cx.strokeStyle=col; cx.lineWidth=hit!=null?1:1.6; cx.setLineDash(hit!=null?[4,3]:[]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(xe,y); cx.stroke(); cx.setLineDash([]);
        if(hit!=null){ cx.globalAlpha=1; cx.fillStyle=col; cx.beginPath(); cx.arc(xe,y,3,0,6.2832); cx.fill(); }
        if(isLast){ const lab=tx+ttsP(p); cx.globalAlpha=.85; const w=cx.measureText(lab).width+8, lx=Math.min(W-w-2,Math.max(2,xe-w)); cx.fillStyle=col; cx.fillRect(lx,y-7,w,14);
          cx.globalAlpha=1; cx.fillStyle='#fff'; cx.textAlign='left'; cx.fillText(lab,lx+4,y); } }); }); }
  cx.globalAlpha=1; cx.restore();
}
STRATS.tts={label:'Trend Targets \u00b7 Supertrend/WMA/EMA trend line, BUY / SELL on turns, rejection arrows, Entry / SL / TP1-3',short:'Trend Targets',own:true,
  defs:{limit:false,useSl:false,ttsF:12,ttsAtr:90,ttsWma:40,ttsEma:14,ttsRej:3,ttsShowRej:true,ttsTP:true,ttsHist:1,ttsVol:14,ttsSlM:5,ttsTp1:0.5,ttsTp2:1,ttsTp3:1.5,ttsUp:'#00ffbb',ttsDn:'#ff1100'},
  inputs:(b,d)=>{
    fld(b,d,'ttsF','num','Supertrend factor',{min:1,step:0.5}); fld(b,d,'ttsAtr','num','Supertrend ATR period',{min:1,max:500,step:1});
    fld(b,d,'ttsWma','num','WMA length',{min:1,max:300,step:1}); fld(b,d,'ttsEma','num','EMA length',{min:1,max:300,step:1});
    fld(b,d,'ttsRej','num','Rejection confirmation count',{min:1,max:50,step:1}); fld(b,d,'ttsShowRej','chk','Show rejection arrows');
    fld(b,d,'ttsTP','chk','Show Entry / SL / Take Profit levels'); fld(b,d,'ttsHist','num','Signals to show levels for',{min:1,max:30,step:1});
    fld(b,d,'ttsVol','num','Volatility (ATR) period',{min:1,max:200,step:1}); fld(b,d,'ttsSlM','num','Stop loss ATR multiplier',{min:0.1,step:0.1});
    fld(b,d,'ttsTp1','num','TP1 multiplier (x SL distance)',{min:0.1,step:0.1}); fld(b,d,'ttsTp2','num','TP2 multiplier (x SL distance)',{min:0.1,step:0.1}); fld(b,d,'ttsTp3','num','TP3 multiplier (x SL distance)',{min:0.1,step:0.1});
    fld(b,d,'ttsUp','col','Bullish colour'); fld(b,d,'ttsDn','col','Bearish colour'); },
  sig:(c,i,n,Z)=>{ if(c.length<30) return 0; return ttsGet('sig',c,Z).mapS.get(i)||0; }};
try{ DESC.tts='Strategy \u00b7 Supertrend/WMA/EMA trend line: BUY / SELL on turns, rejection arrows, Entry / SL / TP1-3 levels'; }catch(e){}
{ const _tD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='ttsview') return ttsDraw(d,X,Y,W,H); return _tD.apply(this,arguments); };
  const _tR=recomputeExtras; recomputeExtras=function(){ _tR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='tts'&&stVis(Z)) scriptBoxes.push({type:'ttsview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('tts strategy failed',err); window.__ttsErr=err; }


// =====================================================================================
// [bsp] STRATEGY · "Buyers & Sellers Profile + Dynamic S/R" (Zeiierman port)   (self-contained: every name starts with bsp / BSP)
// Rolling volume profile (estimated buy / sell split by close location, POC) + profile-guided pivot support / resistance:
// each swing pivot is judged with the profile as it was at that time, pulled to the nearby volume node, scored 0-100,
// merged / trimmed, and removed on a confirmed close beyond it. The Pine script has no trade signals, so this adds no BUY / SELL.
// Hooks (same pattern as bbs / hrm / tts): STRATS.bsp + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const BSP_KEYS=['bspLb','bspRows','bspSw','bspSrch','bspNode','bspEvid','bspPull','bspScore','bspMax','bspMerge','bspBreak'];
const bspClip=x=>Math.max(0,Math.min(1,x));
function bspRma(a,len){ const o=new Array(a.length).fill(null); let s=0,prev=null;
  for(let i=0;i<a.length;i++){ if(prev==null){ s+=a[i]; if(i===len-1){ prev=s/len; o[i]=prev; } } else { prev=(prev*(len-1)+a[i])/len; o[i]=prev; } } return o; }
function bspAtr(c,len){ return bspRma(c.map((x,i)=>i?Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)):x.high-x.low),len); }
function bspSma(a,len){ const o=new Array(a.length).fill(null); let s=0; for(let i=0;i<a.length;i++){ s+=a[i]; if(i>=len) s-=a[i-len]; if(i>=len-1) o[i]=s/len; } return o; }
// profile over candle indices a..b (inclusive)
function bspProfile(c,a,b,rows,tick){
  let lo=c[a].low, hi=c[a].high; for(let i=a;i<=b;i++){ if(c[i].low<lo) lo=c[i].low; if(c[i].high>hi) hi=c[i].high; }
  const span=Math.max(hi-lo,tick*rows), bot=lo-(span-(hi-lo))*.5, step=span/rows, tot=new Array(rows).fill(0), buy=new Array(rows).fill(0);
  const rid=p=>Math.max(0,Math.min(rows-1,Math.floor((p-bot)/step)));
  for(let i=a;i<=b;i++){ const x=c[i], l=x.low, h=x.high, r=h-l, v=Math.max(x.volume||0,0), bf=r>0?bspClip((x.close-l)/r):.5, r0=rid(l), r1=rid(h);
    for(let j=r0;j<=r1;j++){ const rl=bot+j*step, ov=r>0?Math.max(0,Math.min(h,rl+step)-Math.max(l,rl)):step, fr=r>0?ov/r:1;
      if(fr>0){ const av=v*fr; tot[j]+=av; buy[j]+=av*bf; } } }
  return {bot,step,tot,buy}; }
function bspLevels(c,Z,live){
  const n=c.length; if(n<60) return null;
  const L=Math.max(2,Math.round(Z.bspSw)||5), LB=Math.max(100,Math.round(Z.bspLb)||600), ROWS=Math.max(24,Math.round(Z.bspRows)||72), MAXL=Math.max(2,Math.round(Z.bspMax)||20);
  const VOLLEN=40, ABS=Math.min(3,L), tick=Math.max(c[n-1].close*1e-7,1e-10);
  const vol=c.map(x=>x.volume||0), avgV=bspSma(vol,VOLLEN), atr=bspAtr(c,14), lv=[];
  const t0=Math.max(L*2,n-4000);
  const lvCol=0;
  for(let t=t0;t<n;t++){
    const p=t-L;
    if(t>VOLLEN+L*2+5&&p>=L){
      let isH=true,isL=true;
      for(let j=p-L;j<=p+L;j++){ if(j===p) continue;
        if(j<p?c[j].high>c[p].high:c[j].high>=c[p].high) isH=false;
        if(j<p?c[j].low<c[p].low:c[j].low<=c[p].low) isL=false; }
      [[isL,true],[isH,false]].forEach(([is,supp])=>{ if(!is) return;
        const raw=supp?c[p].low:c[p].high, a=Math.max(0,p-Math.max(1,Math.min(LB,t-L+1))+1), pf=bspProfile(c,a,p,ROWS,tick);
        const atrP=Math.max(atr[p]!=null?atr[p]:tick,tick), mx=Math.max(Math.max(...pf.tot),1e-7), rad=Math.max(atrP*Z.bspSrch,pf.step*2);
        let bP=raw,bE=-1,bS=0,bPk=0;
        for(let r=0;r<ROWS;r++){ const pp=pf.bot+(r+.5)*pf.step, d=Math.abs(pp-raw); if(d>rad) continue;
          const rv=pf.tot[r], str=rv/mx, l1=r>0?pf.tot[r-1]:rv, r2=r<ROWS-1?pf.tot[r+1]:rv, nAvg=Math.max((l1+r2)*.5,mx*.01), pk=bspClip((rv/nAvg-.85)/.65),
            bSh=rv>0?bspClip(pf.buy[r]/rv):.5, dir=supp?bSh:1-bSh, prox=1-d/rad, e=.5*str+.2*pk+.2*dir+.1*prox;
          if(e>bE){ bE=e; bP=pp; bS=str; bPk=pk; } }
        const evid=Math.max(bE,0), node=bP, nStr=bS;
        // pivot features
        const vb=avgV[p]!=null?avgV[p]:vol[p], vr=vb>0?vol[p]/vb:1, vSc=bspClip((vr-.8)/(2.2-.8)), pr=Math.max(c[p].high-c[p].low,tick),
          wick=supp?Math.min(c[p].open,c[p].close)-c[p].low:c[p].high-Math.max(c[p].open,c[p].close), wSc=bspClip((wick/pr)/.5);
        let aSc=0; for(let k=0;k<=ABS*2;k++){ const o=p+ABS-k; if(o<0||o>=n) continue; const cr=Math.max(c[o].high-c[o].low,tick), v=Math.max(vol[o],0), base=avgV[o]!=null?avgV[o]:v,
            vRat=base>0?v/base:1, bRat=Math.abs(c[o].close-c[o].open)/cr, sm=bspClip((.4-bRat)/.4), av=bspClip((vRat-1)/(1.5-1)); aSc=Math.max(aSc,Math.sqrt(sm*av)); }
        const ok=nStr>=Z.bspNode&&evid>=Z.bspEvid, pull=ok?Z.bspPull*bspClip(evid/.65):0, fp=raw+(node-raw)*pull, sc=100*(.5*evid+.2*aSc+.15*vSc+.15*wSc);
        if(ok&&sc>=Z.bspScore){
          const tol=Math.max(atrP*Z.bspMerge,tick); let id=-1,best=1e20;
          lv.forEach((q,ix)=>{ if(q.supp===supp){ const d=Math.abs(q.p-fp); if(d<=tol&&d<best){ best=d; id=ix; } } });
          if(id>=0){ const q=lv[id]; if(sc>q.sc){ q.p=fp; q.sc=sc; q.raw=raw; q.node=node; q.evid=evid; q.nStr=nStr; q.born=p; } }
          else lv.push({p:fp,sc,raw,node,evid,nStr,supp,born:p}); } });
    }
    // confirmed-close breaks (the forming candle never breaks a level)
    if(!(live&&t===n-1)&&lv.length){ const buf=Math.max((atr[t]||0)*Z.bspBreak,0);
      for(let i=lv.length-1;i>=0;i--){ const q=lv[i]; if(q.supp?c[t].close<q.p-buf:c[t].close>q.p+buf) lv.splice(i,1); } }
    while(lv.length>MAXL){ let w=0,s=lv[0].sc; for(let i=1;i<lv.length;i++) if(lv[i].sc<s){ s=lv[i].sc; w=i; } lv.splice(w,1); }
  }
  return lv;
}
const bspCache={};
function bspGet(c,Z){ const cl=c.slice(0,-1), l=cl[cl.length-1]; if(cl.length<60) return null;
  const key=[cl.length,cl[0].time,l.time,l.high,l.low,l.close,BSP_KEYS.map(k=>Z[k]).join(',')].join('|');
  if(!bspCache[Z.sid]||bspCache[Z.sid].k!==key) bspCache[Z.sid]={k:key,lv:bspLevels(cl,Z,false)};
  const n=c.length, LB=Math.max(100,Math.round(Z.bspLb)||600), ROWS=Math.max(24,Math.round(Z.bspRows)||72), bars=Math.max(1,Math.min(LB,n)),
    prof=bspProfile(c,n-bars,n-1,ROWS,Math.max(c[n-1].close*1e-7,1e-10)); let mxv=0,poc=0; prof.tot.forEach((v,i)=>{ if(v>mxv){ mxv=v; poc=i; } });
  return {n,lv:bspCache[Z.sid].lv||[],prof,mx:mxv,poc,rows:ROWS}; }
const bspP=v=>{ const a=Math.abs(v), d=a>=1000?2:a>=1?4:a>=.01?6:8; return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:d}); };
function bspDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<60) return; const r=bspGet(c,Z); if(!r) return; const n=r.n;
  const sup=Z.bspSupCol||'#1fc774', res=Z.bspResCol||'#ef4b4b', core=Z.bspCoreCol||'#ffcd40', raw=Z.bspRawCol||'#a0a6b2', bu=Z.bspBuyCol||'#2b9e8f', se=Z.bspSellCol||'#4a58b6', pc=Z.bspPocCol||'#ff9120';
  // profile is pinned to the right edge of the screen (does not move when the chart is scrolled / zoomed)
  const wp=Math.max(10,Math.min(60,Z.bspWp==null?26:Z.bspWp)), maxPx=W*wp/100, xR=W-(Z.bspOffp==null?6:Z.bspOffp), xL=xR-maxPx, showP=Z.bspShow!==false&&r.mx>0, xEnd=showP?xL-2:W;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle'; cx.textAlign='center';
  const lal=s=>s>=82?.95:s>=62?.8:s>=45?.65:.5, lwd=s=>s>=82?4:s>=62?3:2, rings=s=>s>=82?4:s>=66?3:s>=50?2:1, rad=k=>k>=4?8.5:k===3?6.5:k===2?4.8:3.2, ral=k=>k>=4?.32:k===3?.48:k===2?.7:.96;
  const dash=Z.bspStyle==='Dotted'?[2,3]:Z.bspStyle==='Dashed'?[7,4]:[];
  // ---- volume profile (right edge, bars grow to the left)
  if(showP){ const prof=r.prof;
    for(let k=0;k<r.rows;k++){ const rv=prof.tot[k]; if(!(rv>0)) continue; const str=rv/r.mx, bSh=bspClip(prof.buy[k]/rv), tw=Math.max(1,Math.round(maxPx*str)), bwid=Math.round(tw*bSh), sw=tw-bwid, xs=xR-tw,
        yT=Y(prof.bot+(k+.92)*prof.step), yB=Y(prof.bot+(k+.08)*prof.step); if(yT==null||yB==null) continue; const top=Math.min(yT,yB), h=Math.max(1,Math.abs(yB-yT)), fa=.4+.5*str;
      cx.globalAlpha=fa; if(bwid>0){ cx.fillStyle=bu; cx.fillRect(xs,top,bwid,h); } if(sw>0){ cx.fillStyle=se; cx.fillRect(xs+bwid,top,sw,h); }
      if(Z.bspPoc!==false&&k===r.poc){ cx.globalAlpha=.15; cx.fillStyle=pc; cx.fillRect(xs,top,tw,h); cx.globalAlpha=1; cx.strokeStyle=pc; cx.lineWidth=2; cx.strokeRect(xs,top,tw,h); }
      if(Z.bspLvlRows!==false){ const lo=prof.bot+(k+.08)*prof.step, hi=prof.bot+(k+.92)*prof.step, q=r.lv.find(z=>z.p>=lo&&z.p<=hi);
        if(q){ cx.globalAlpha=.1; cx.fillStyle=core; cx.fillRect(xs,top,tw,h); cx.globalAlpha=1; cx.strokeStyle=q.supp?sup:res; cx.lineWidth=2; cx.strokeRect(xs,top,tw,h); } } }
    if(Z.bspPoc!==false){ const pp=prof.bot+(r.poc+.5)*prof.step, y=Y(pp); if(y!=null){
        cx.globalAlpha=.45; cx.strokeStyle=pc; cx.lineWidth=1.5; cx.setLineDash([6,4]); cx.beginPath(); cx.moveTo(0,y); cx.lineTo(xR,y); cx.stroke(); cx.setLineDash([]);
        cx.globalAlpha=1; cx.font='bold 10px system-ui'; cx.textAlign='right'; cx.lineWidth=3; cx.strokeStyle='rgba(10,12,20,.9)'; const tx='POC '+bspP(pp); cx.strokeText(tx,xL-6,y-8); cx.fillStyle=pc; cx.fillText(tx,xL-6,y-8); cx.textAlign='center'; } } }
  // ---- active levels (run to the profile)
  r.lv.forEach(q=>{ const x0=X(q.born), y=Y(q.p); if(x0==null||y==null) return; const col=q.supp?sup:res;
    cx.globalAlpha=lal(q.sc); cx.strokeStyle=col; cx.lineWidth=lwd(q.sc); cx.setLineDash(dash); cx.beginPath(); cx.moveTo(Math.max(-5,x0),y); cx.lineTo(xEnd,y); cx.stroke(); cx.setLineDash([]); });
  cx.globalAlpha=1;
  // ---- pivot markers (raw pivot, guide, rings, score)
  if(Z.bspDots!==false) r.lv.forEach(q=>{ const x=X(q.born), y=Y(q.p); if(x==null||y==null||x<-20||x>xEnd) return; const base=q.supp?sup:res;
    if(Z.bspRaw!==false){ const yr=Y(q.raw); if(yr!=null){ cx.globalAlpha=.55; cx.strokeStyle=core; cx.lineWidth=1; cx.setLineDash([1,3]); cx.beginPath(); cx.moveTo(x,yr); cx.lineTo(x,y); cx.stroke(); cx.setLineDash([]);
        cx.globalAlpha=.4; cx.fillStyle=raw; cx.beginPath(); cx.arc(x,yr,3.2,0,6.2832); cx.fill(); } }
    for(let k=rings(q.sc);k>=1;k--){ cx.globalAlpha=k===1?(q.evid>=.45?1:.78):ral(k); cx.fillStyle=k===1?core:base; cx.beginPath(); cx.arc(x,y,rad(k),0,6.2832); cx.fill(); }
    if(Z.bspDotSc!==false){ cx.globalAlpha=1; cx.fillStyle='#fff'; cx.font='bold 8px system-ui'; cx.fillText(String(Math.round(q.sc)),x,y+.5); } });
  // ---- fixed score tags just left of the profile (always readable, whatever the scroll position)
  if(Z.bspEdge!==false){ cx.font='bold 10px system-ui'; cx.textAlign='right'; cx.lineWidth=3;
    r.lv.slice().sort((a,b)=>a.p-b.p).forEach(q=>{ const y=Y(q.p); if(y==null||y<0||y>H) return; const col=q.supp?sup:res, tx=String(Math.round(q.sc));
      cx.globalAlpha=1; cx.fillStyle=col; cx.beginPath(); cx.arc(xEnd-3,y,3,0,6.2832); cx.fill();
      cx.strokeStyle='rgba(10,12,20,.9)'; cx.strokeText(tx,xEnd-10,y); cx.fillStyle=col; cx.fillText(tx,xEnd-10,y); }); cx.textAlign='center'; }
  cx.globalAlpha=1; cx.restore();
}
STRATS.bsp={label:'Buyers & Sellers Profile + S/R \u00b7 rolling buy/sell volume profile, POC, profile-guided support / resistance with 0-100 scores',short:'Buyers & Sellers Profile + S/R',own:true,
  defs:{limit:false,useSl:false,bspLb:600,bspRows:72,bspWp:26,bspOffp:6,bspShow:true,bspPoc:true,bspLvlRows:true,bspSw:5,bspSrch:1.2,bspNode:.08,bspEvid:.22,bspPull:.85,bspScore:30,bspMax:20,bspMerge:.16,bspBreak:.10,
    bspSupCol:'#1fc774',bspResCol:'#ef4b4b',bspCoreCol:'#ffcd40',bspRawCol:'#a0a6b2',bspBuyCol:'#2b9e8f',bspSellCol:'#4a58b6',bspPocCol:'#ff9120',bspStyle:'Solid',bspDots:true,bspRaw:true,bspDotSc:true,bspEdge:true},
  inputs:(b,d)=>{
    fld(b,d,'bspLb','num','Profile lookback (bars)',{min:100,max:1500,step:50}); fld(b,d,'bspRows','num','Profile rows',{min:24,max:100,step:1});
    fld(b,d,'bspWp','num','Profile width (% of chart)',{min:10,max:60,step:1}); fld(b,d,'bspOffp','num','Profile gap from right edge (px)',{min:0,max:80,step:1});
    fld(b,d,'bspShow','chk','Show profile'); fld(b,d,'bspPoc','chk','Show POC'); fld(b,d,'bspLvlRows','chk','Outline rows with active levels');
    fld(b,d,'bspSw','num','Swing length',{min:2,max:25,step:1}); fld(b,d,'bspSrch','num','Search ATR',{min:0.2,max:3,step:0.05});
    fld(b,d,'bspNode','num','Min node (vs POC)',{min:0,max:1,step:0.01}); fld(b,d,'bspEvid','num','Min evidence',{min:0,max:1,step:0.01});
    fld(b,d,'bspPull','num','Profile pull',{min:0,max:1,step:0.05}); fld(b,d,'bspScore','num','Min score',{min:0,max:100,step:1});
    fld(b,d,'bspMax','num','Max levels',{min:2,max:40,step:1}); fld(b,d,'bspMerge','num','Merge ATR',{min:0,max:1,step:0.02}); fld(b,d,'bspBreak','num','Break ATR',{min:0,max:0.5,step:0.01});
    fld(b,d,'bspStyle','sel','Level line style',{opts:['Solid','Dotted','Dashed']});
    fld(b,d,'bspDots','chk','Pivot dots'); fld(b,d,'bspRaw','chk','Raw pivot + guide'); fld(b,d,'bspDotSc','chk','Score inside dot'); fld(b,d,'bspEdge','chk','Right-edge score');
    fld(b,d,'bspSupCol','col','Support colour'); fld(b,d,'bspResCol','col','Resistance colour'); fld(b,d,'bspCoreCol','col','Pivot core colour'); fld(b,d,'bspRawCol','col','Raw pivot colour');
    fld(b,d,'bspBuyCol','col','Profile buy colour'); fld(b,d,'bspSellCol','col','Profile sell colour'); fld(b,d,'bspPocCol','col','POC colour'); },
  sig:()=>0};
try{ DESC.bsp='Strategy \u00b7 rolling buy/sell volume profile + POC with profile-guided support / resistance levels and scores'; }catch(e){}
{ const _sD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='bspview') return bspDraw(d,X,Y,W,H); return _sD.apply(this,arguments); };
  const _sR=recomputeExtras; recomputeExtras=function(){ _sR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='bsp'&&stVis(Z)) scriptBoxes.push({type:'bspview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('bsp strategy failed',err); window.__bspErr=err; }

// =====================================================================================
// [vpn] STRATEGY · "Volume Profile with Node Detection" (LuxAlgo port)   (self-contained: every name starts with vpn / VPN)
// Volume profile over the last N bars (buy / sell split, Value Area, POC / VAH / VAL), with volume peak / trough node detection,
// peak / trough clusters and highest / lowest N nodes. Uses the chart's own candles (no lower-timeframe request).
// The Pine script has no trade signals, so this adds no BUY / SELL. Hooks: STRATS.vpn + draw + recomputeExtras.
// =====================================================================================
try{
const VPN_KEYS=['vpnLen','vpnRows','vpnVA','vpnPk','vpnPkP','vpnTr','vpnTrP','vpnThr','vpnHi','vpnLoN','vpnPoc'];
const vpnCache={};
const vpnRgba=(h,a)=>{ h=String(h||'#888888'); if(h[0]==='#'&&h.length===4) h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3]; const m=/^#([0-9a-f]{6})/i.exec(h); if(!m) return h; const v=parseInt(m[1],16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+Math.max(0,Math.min(1,a))+')'; };
const vpnP=v=>{ const a=Math.abs(v), d=a>=1000?2:a>=1?4:a>=.01?5:8; return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:d}); };
function vpnNodes(tot,N,peak,thr){
  const R=tot.length, out=[]; if(N<1) return out; let mx=0; tot.forEach(v=>{ if(v>mx) mx=v; }); if(!(mx>0)) return out;
  const pad=peak?0:mx, g=j=>(j<0||j>=R)?pad:tot[j];
  for(let i=0;i<R;i++){ let ok=true; const gi=g(i);
    for(let j=i-N;j<=i+N&&ok;j++){ if(j===i) continue; if(peak?gi<=g(j):gi>=g(j)) ok=false; }
    if(ok&&tot[i]/mx>thr) out.push(i); }
  return out; }
function vpnCalc(c,Z){
  const n=c.length; if(n<3) return null;
  const L=Math.max(10,Math.min(5000,Math.round(Z.vpnLen)||360)), a=Math.max(0,n-1-L), R=Math.max(30,Math.min(130,Math.round(Z.vpnRows)||100));
  let lo=Infinity, hi=-Infinity; for(let i=a;i<n;i++){ if(c[i].low<lo) lo=c[i].low; if(c[i].high>hi) hi=c[i].high; }
  if(!(hi>lo)) return null;
  const step=(hi-lo)/R, tot=new Array(R).fill(0), bull=new Array(R).fill(0), dev=[], wantDev=Z.vpnPoc==='Developing'; let mxI=0;
  for(let i=a;i<n;i++){ const x=c[i], v=Math.max(x.volume||0,0), l=x.low, h=x.high, up=x.close>x.open;
    const s=Math.max(0,Math.floor((l-lo)/step)), e=Math.min(R-1,Math.floor((h-lo)/step));
    for(let k=s;k<=e;k++){ let f=1; if(h>l){ f=Math.max(0,Math.min(h,lo+(k+1)*step)-Math.max(l,lo+k*step))/(h-l); }
      const q=v*f; tot[k]+=q; if(up) bull[k]+=q; if(tot[k]>tot[mxI]) mxI=k; }
    if(wantDev) dev.push({i,p:lo+(mxI+.5)*step}); }
  let mx=0, poc=0; for(let k=0;k<R;k++){ if(tot[k]>mx){ mx=tot[k]; poc=k; } }
  if(!(mx>0)) return null;
  const target=tot.reduce((s,v)=>s+v,0)*Math.max(0,Math.min(1,(Z.vpnVA==null?70:Z.vpnVA)/100)); let vah=poc, val=poc, vol=tot[poc];
  while(vol<target){ if(val===0&&vah===R-1) break; const up=vah<R-1?tot[vah+1]:0, dn=val>0?tot[val-1]:0; if(up===0&&dn===0) break;
    if(up>=dn){ vol+=up; vah++; } else { vol+=dn; val--; } }
  const thr=Math.max(0,(Z.vpnThr==null?1:Z.vpnThr)/100), pkN=Math.floor(R*Math.max(0,(Z.vpnPkP||0))/100), trN=Math.floor(R*Math.max(0,(Z.vpnTrP||0))/100);
  const peaks=Z.vpnPk!=='None'?vpnNodes(tot,pkN,true,thr):[], troughs=Z.vpnTr!=='None'?vpnNodes(tot,trN,false,thr):[];
  const order=tot.map((v,i)=>i).sort((x,y)=>tot[y]-tot[x]||x-y), highs=order.slice(0,Math.max(0,Math.min(31,Math.round(Z.vpnHi)||0)));
  const lows=[]; { const seen=new Set(), nL=Math.max(0,Math.min(31,Math.round(Z.vpnLoN)||0)); for(let j=order.length-1;j>=0&&lows.length<nL;j--){ const v=tot[order[j]]; if(seen.has(v)) continue; seen.add(v); lows.push(order[j]); } }
  return {a,n,R,lo,hi,step,tot,bull,mx,poc,vah,val,peaks,troughs,pkN,trN,highs,lows,dev}; }
function vpnGet(c,Z){ const n=c.length, l=c[n-1]; if(n<3) return null;
  const key=[n,c[0].time,l.time,l.high,l.low,l.close,l.volume,VPN_KEYS.map(k=>Z[k]).join(',')].join('|');
  if(!vpnCache[Z.sid]||vpnCache[Z.sid].k!==key) vpnCache[Z.sid]={k:key,r:vpnCalc(c,Z)};
  return vpnCache[Z.sid].r; }
function vpnDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<3) return; const r=vpnGet(c,Z); if(!r) return;
  const {a,n,R,lo,hi,step,tot,bull,mx}=r, right=Z.vpnPlace!=='Left', grad=Z.vpnGrad!=='Classic Colors', showP=Z.vpnShow!==false;
  const lblPx=({Tiny:9,Small:10,Normal:12})[Z.vpnLbl], lblW=lblPx?Math.round(lblPx*5.6)+10:0;
  const wp=Math.max(5,Math.min(60,Z.vpnWp==null?30:Z.vpnWp)), maxPx=W*wp/100, gap=Z.vpnGap==null?0:Z.vpnGap;
  const xR=W-gap, xS=right?xR:Math.max(0,X(a)==null?0:X(a));   // right: bars grow leftwards from xR; left: bars grow rightwards from xS
  const x0=Math.max(0,X(a)==null?0:X(a));
  const rowY=(k,f0,f1)=>{ const y1=Y(lo+(k+f1)*step), y0=Y(lo+(k+f0)*step); if(y1==null||y0==null) return null; return [Math.min(y0,y1),Math.max(1,Math.abs(y0-y1))]; };
  const inVA=k=>k>=r.val&&k<=r.vah;
  // left end (right placement) / right end (left placement) of each row's bar
  const edge=k=>{ const w=(tot[k]/mx)*maxPx; return right?xR-w:xS+w; };
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  // backgrounds
  const yTop=Y(hi), yBot=Y(lo), yVah=Y(lo+(r.vah+1)*step), yVal=Y(lo+r.val*step);
  if(Z.vpnPrBg&&yTop!=null&&yBot!=null){ cx.fillStyle=vpnRgba('#2962ff',.05); cx.fillRect(x0,Math.min(yTop,yBot),W-x0,Math.abs(yBot-yTop)); }
  if(Z.vpnVaBg&&yVah!=null&&yVal!=null){ cx.fillStyle=vpnRgba('#2962ff',.11); cx.fillRect(x0,Math.min(yVah,yVal),W-x0,Math.abs(yVal-yVah)); }
  // profile rows (up volume, then down volume)
  if(showP) for(let k=0;k<R;k++){ if(!(tot[k]>0)) continue; const rr=rowY(k,.1,.9); if(!rr) continue; const ratio=tot[k]/mx, va=inVA(k);
    const cu=va?Z.vpnVAU:Z.vpnPU, cd=va?Z.vpnVAD:Z.vpnPD, au=grad?.05+.95*ratio:(va?.7:.5), ad=au;
    const bw=(bull[k]/mx)*maxPx, dw=((tot[k]-bull[k])/mx)*maxPx;
    cx.fillStyle=vpnRgba(cu,au); if(right) cx.fillRect(xR-bw,rr[0],bw,rr[1]); else cx.fillRect(xS,rr[0],bw,rr[1]);
    cx.fillStyle=vpnRgba(cd,ad); if(right) cx.fillRect(xR-bw-dw,rr[0],dw,rr[1]); else cx.fillRect(xS+bw,rr[0],dw,rr[1]); }
  // node boxes (span from chart start to the row's bar, or from the bar to the right edge)
  const node=(k,f0,f1,col)=>{ const rr=rowY(k,f0,f1); if(!rr) return; const e=showP?edge(k):(right?xR:xS), xa=right?x0:(showP?e:x0), xb=right?(showP?e:xR):(showP?W:xR);
    if(xb<=xa) return; cx.fillStyle=col; cx.fillRect(xa,rr[0],xb-xa,rr[1]); };
  const nodeSet=(list,N,mode,hex,al0,al1,isPk)=>{ if(!list.length||mode==='None') return; const set=new Set(list);
    list.forEach(k=>{ const ratio=isPk?tot[k]/mx:(1-tot[k]/mx); const col=mode==='Clusters'?vpnRgba(hex,al0+(al1-al0)*ratio):vpnRgba(hex,al1); node(k,.1,.9,col);
      if(mode==='Clusters') for(let j=k-N;j<=k+N;j++){ if(j<0||j>=R||set.has(j)) continue; node(j,0,1,col); } }); };
  nodeSet(r.peaks,r.pkN,Z.vpnPk,Z.vpnPkCol||'#2962ff',.05,.5,true);
  nodeSet(r.troughs,r.trN,Z.vpnTr,Z.vpnTrCol||'#787b86',.05,.5,false);
  r.highs.forEach(k=>node(k,.1,.9,vpnRgba(Z.vpnHiCol||'#ff9800',.75)));
  r.lows.forEach(k=>node(k,.1,.9,vpnRgba(Z.vpnLoCol||'#0c3299',.75)));
  // POC / VAH / VAL lines
  const pocP=lo+(r.poc+.5)*step, vahP=lo+(r.vah+1)*step, valP=lo+r.val*step, lineEnd=right?(showP?xR:W):W, pocEnd=right&&showP?edge(r.poc):lineEnd;
  const hline=(p,col,w,xe)=>{ const y=Y(p); if(y==null) return; cx.strokeStyle=col; cx.lineWidth=w; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(xe,y); cx.stroke(); };
  if(Z.vpnVah) hline(vahP,Z.vpnVahCol||'#2962ff',1,lineEnd); if(Z.vpnVal) hline(valP,Z.vpnValCol||'#2962ff',1,lineEnd);
  if(Z.vpnPoc==='Regular') hline(pocP,Z.vpnPocCol||'#fbc02d',Z.vpnPocW||2,pocEnd);
  if(Z.vpnPoc==='Developing'&&r.dev.length){ cx.strokeStyle=Z.vpnPocCol||'#fbc02d'; cx.lineWidth=Z.vpnPocW||2; cx.beginPath(); let st=false;
    r.dev.forEach(q=>{ const x=X(q.i), y=Y(q.p); if(x==null||y==null) return; if(!st){ cx.moveTo(x,y); st=true; } else cx.lineTo(x,y); });
    const yl=Y(r.dev[r.dev.length-1].p), xl=X(n-1); if(st&&yl!=null&&xl!=null){ cx.lineTo(xl,yl); cx.lineTo(pocEnd,Y(pocP)==null?yl:Y(pocP)); } cx.stroke(); }
  // price labels
  if(lblPx){ cx.font='bold '+lblPx+'px system-ui'; cx.textAlign='left';     const lab=(p,col,pos)=>{ const y=Y(p); if(y==null) return; const tx=vpnP(p), tw=cx.measureText(tx).width+8, lx=W-gap-tw-1, hh=lblPx+6, yy=pos==='up'?y-hh:pos==='down'?y:y-hh/2;
      cx.fillStyle='rgba(14,17,26,.82)'; cx.fillRect(lx,yy,tw,hh); cx.fillStyle=vpnRgba(col,.14); cx.fillRect(lx,yy,tw,hh); cx.fillStyle=col; cx.fillText(tx,lx+4,yy+hh/2+.5); };
    lab(hi,'#d1d4dc','up'); lab(vahP,Z.vpnVahCol||'#2962ff','mid'); lab(pocP,Z.vpnPocCol||'#fbc02d','mid'); lab(valP,Z.vpnValCol||'#2962ff','mid'); lab(lo,'#d1d4dc','down'); }
  cx.globalAlpha=1; cx.restore();
}
STRATS.vpn={label:'Volume Profile with Node Detection [LuxAlgo] \u00b7 buy/sell volume profile, Value Area, POC, volume peak / trough nodes',short:'Volume Profile + Node Detection',own:true,
  defs:{limit:false,useSl:false,vpnLen:360,vpnRows:100,vpnVA:70,vpnPlace:'Right',vpnWp:30,vpnGap:0,vpnGrad:'Gradient Colors',vpnShow:true,
    vpnPk:'Peaks',vpnPkP:9,vpnPkCol:'#2962ff',vpnTr:'None',vpnTrP:7,vpnTrCol:'#787b86',vpnThr:1,vpnHi:0,vpnHiCol:'#ff9800',vpnLoN:0,vpnLoCol:'#0c3299',
    vpnVAU:'#2962ff',vpnVAD:'#fbc02d',vpnPU:'#5d606b',vpnPD:'#d1d4dc',vpnPoc:'None',vpnPocCol:'#fbc02d',vpnPocW:2,vpnVah:false,vpnVahCol:'#2962ff',vpnVal:false,vpnValCol:'#2962ff',
    vpnLbl:'Small',vpnVaBg:false,vpnPrBg:false},
  inputs:(b,d)=>{
    fld(b,d,'vpnPk','sel','Volume peaks',{opts:['Peaks','Clusters','None']}); fld(b,d,'vpnPkCol','col','Peak colour'); fld(b,d,'vpnPkP','num','Peak detection %',{min:0,max:100,step:1});
    fld(b,d,'vpnTr','sel','Volume troughs',{opts:['Troughs','Clusters','None']}); fld(b,d,'vpnTrCol','col','Trough colour'); fld(b,d,'vpnTrP','num','Trough detection %',{min:0,max:100,step:1});
    fld(b,d,'vpnThr','num','Volume node threshold %',{min:0,max:100,step:1});
    fld(b,d,'vpnHi','num','Highest volume nodes',{min:0,max:31,step:1}); fld(b,d,'vpnHiCol','col','Highest nodes colour');
    fld(b,d,'vpnLoN','num','Lowest volume nodes',{min:0,max:31,step:1}); fld(b,d,'vpnLoCol','col','Lowest nodes colour');
    fld(b,d,'vpnShow','chk','Show volume profile'); fld(b,d,'vpnGrad','sel','Profile colours',{opts:['Gradient Colors','Classic Colors']});
    fld(b,d,'vpnVAU','col','Value Area up'); fld(b,d,'vpnVAD','col','Value Area down'); fld(b,d,'vpnPU','col','Profile up volume'); fld(b,d,'vpnPD','col','Profile down volume');
    fld(b,d,'vpnPoc','sel','Point of Control',{opts:['Developing','Regular','None']}); fld(b,d,'vpnPocCol','col','POC colour'); fld(b,d,'vpnPocW','num','POC width',{min:1,max:6,step:1});
    fld(b,d,'vpnVah','chk','Value Area High line'); fld(b,d,'vpnVahCol','col','VAH colour'); fld(b,d,'vpnVal','chk','Value Area Low line'); fld(b,d,'vpnValCol','col','VAL colour');
    fld(b,d,'vpnLbl','sel','Profile price labels',{opts:['Tiny','Small','Normal','None']});
    fld(b,d,'vpnLen','num','Profile lookback (bars)',{min:10,max:5000,step:10}); fld(b,d,'vpnVA','num','Value Area %',{min:0,max:100,step:1});
    fld(b,d,'vpnPlace','sel','Profile placement',{opts:['Right','Left']}); fld(b,d,'vpnRows','num','Number of rows',{min:30,max:130,step:10});
    fld(b,d,'vpnWp','num','Profile width (% of chart)',{min:5,max:60,step:1}); fld(b,d,'vpnGap','num','Gap from right edge (px)',{min:0,max:80,step:1});
    fld(b,d,'vpnVaBg','chk','Value Area background'); fld(b,d,'vpnPrBg','chk','Profile range background'); },
  sig:()=>0};
try{ DESC.vpn='Strategy \u00b7 LuxAlgo volume profile: buy/sell split, Value Area, POC / VAH / VAL, volume peak and trough nodes, highest / lowest nodes'; }catch(e){}
{ const _vD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='vpnview') return vpnDraw(d,X,Y,W,H); return _vD.apply(this,arguments); };
  const _vR=recomputeExtras; recomputeExtras=function(){ _vR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='vpn'&&stVis(Z)) scriptBoxes.push({type:'vpnview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('vpn strategy failed',err); window.__vpnErr=err; }

// =====================================================================================
// [frv] STRATEGY · "Volume Profile / Fixed Range" (LonesomeTheBlue port)   (self-contained: every name starts with frv / FRV)
// Profile over the last N candles anchored at the first of them: rows between lowest low and highest high, volume split by body / wick
// into up (green candle) and down (red candle) parts, Value Area, POC line extended right + label. No BUY / SELL (the Pine has none).
// =====================================================================================
try{
const frvCache={};
const frvRgba=(h,a)=>{ h=String(h||'#888888'); if(h[0]==='#'&&h.length===4) h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3]; const m=/^#([0-9a-f]{6})/i.exec(h); if(!m) return h; const v=parseInt(m[1],16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; };
const frvP=v=>{ const a=Math.abs(v), d=a>=1000?2:a>=1?4:a>=.01?5:8; return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:d}); };
function frvCalc(c,Z){
  const n=c.length, B=Math.max(1,Math.min(500,Math.round(Z.frvBars)||150)), C=Math.max(5,Math.min(100,Math.round(Z.frvRows)||24)), a=Math.max(0,n-B), bb=n-a;
  let top=-Infinity, bot=Infinity; for(let i=a;i<n;i++){ if(c[i].high>top) top=c[i].high; if(c[i].low<bot) bot=c[i].low; }
  if(!(top>bot)) return null;
  const step=(top-bot)/C, dist=(top-bot)/500, lv=[]; for(let x=0;x<=C;x++) lv.push(bot+step*x);
  const gv=(y11,y12,y21,y22,h,v)=>{ if(!(h>0)) return 0; const o=Math.min(Math.max(y11,y12),Math.max(y21,y22))-Math.max(Math.min(y11,y12),Math.min(y21,y22)); return Math.max(o,0)*v/h; };
  const up=new Array(C).fill(0), dn=new Array(C).fill(0);
  for(let i=a;i<n;i++){ const k=c[i], v=Math.max(k.volume||0,0), bt=Math.max(k.close,k.open), bm=Math.min(k.close,k.open), green=k.close>=k.open,
      tw=k.high-bt, bw=bm-k.low, body=bt-bm, den=2*tw+2*bw+body; if(!(den>0)) continue;
    const bv=body*v/den, tv=2*tw*v/den, wv=2*bw*v/den;
    for(let x=0;x<C;x++){ const l0=lv[x], l1=lv[x+1], b=gv(l0,l1,bm,bt,body,bv), t=gv(l0,l1,bt,k.high,tw,tv)/2, w=gv(l0,l1,bm,k.low,bw,wv)/2;
      up[x]+=(green?b:0)+t+w; dn[x]+=(green?0:b)+t+w; } }
  const tot=up.map((v,i)=>v+dn[i]); let mx=0, poc=0; tot.forEach((v,i)=>{ if(v>mx){ mx=v; poc=i; } });
  if(!(mx>0)) return null;
  const target=tot.reduce((s,v)=>s+v,0)*(Z.frvVA==null?70:Z.frvVA)/100; let vt=tot[poc], hiR=poc, loR=poc;
  for(let x=0;x<C;x++){ if(vt>=target) break; const u=hiR<C-1?tot[hiR+1]:0, d=loR>0?tot[loR-1]:0; if(u===0&&d===0) break; if(u>=d){ vt+=u; hiR++; } else { vt+=d; loR--; } }
  return {a,n,bb,C,lv,dist,up,dn,mx,poc,hiR,loR,pocP:(lv[poc]+lv[poc+1])/2}; }
function frvGet(c,Z){ const n=c.length; if(n<2) return null;
  const l2=c[n-1], key=[n,c[0].time,l2.time,l2.high,l2.low,l2.close,l2.volume,Z.frvBars,Z.frvRows,Z.frvVA].join('|');
  if(!frvCache[Z.sid]||frvCache[Z.sid].k!==key) frvCache[Z.sid]={k:key,r:frvCalc(c,Z)};
  return frvCache[Z.sid].r; }
function frvDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<2) return; const r=frvGet(c,Z); if(!r) return;
  const {a,n,bb,C,lv,dist,up,dn,mx,poc,hiR,loR}=r, xs=X(a), xe=X(a+1); if(xs==null||xe==null) return;
  const bar=(xe-xs)||1, wBars=bb/3, px=v=>Math.round(v/mx*wBars)*bar;   // widest row = 1/3 of the range, in bar widths
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]);
  for(let x=0;x<C;x++){ const yT=Y(lv[x+1]-dist), yB=Y(lv[x]+dist); if(yT==null||yB==null) continue; const top=Math.min(yT,yB), h=Math.max(1,Math.abs(yB-yT)), va=x>=loR&&x<=hiR, wu=px(up[x]), wd=px(dn[x]);
    cx.fillStyle=frvRgba(va?Z.frvVU:Z.frvUp,va?.7:.25); if(wu>0) cx.fillRect(xs,top,wu,h);
    cx.fillStyle=frvRgba(va?Z.frvVD:Z.frvDn,va?.7:.25); if(wd>0) cx.fillRect(xs+wu,top,wd,h); }
  const y=Y(r.pocP);
  if(y!=null){ cx.strokeStyle=Z.frvPocCol||'#ff0000'; cx.lineWidth=Z.frvPocW||2; cx.beginPath(); cx.moveTo(xs,y); cx.lineTo(W,y); cx.stroke();
    if(Z.frvLbl){ const last=c[n-1], tx='POC: '+frvP(r.pocP); cx.font='11px system-ui'; cx.textAlign='center'; cx.textBaseline='middle'; const tw=cx.measureText(tx).width+16, hh=22,
        lx=Math.max(tw/2+2,Math.min(W-tw/2-2,X(n-1+15)==null?W/2:X(n-1+15))), above=last.close>=r.pocP, ty=above?y+8:y-8-hh;
      cx.fillStyle='#2962ff'; cx.beginPath(); cx.moveTo(lx-6,above?ty:ty+hh); cx.lineTo(lx,above?ty-6:ty+hh+6); cx.lineTo(lx+6,above?ty:ty+hh); cx.fill(); cx.fillRect(lx-tw/2,ty,tw,hh);
      cx.fillStyle='#fff'; cx.fillText(tx,lx,ty+hh/2+.5); } }
  cx.restore(); }
STRATS.frv={label:'Volume Profile / Fixed Range \u00b7 last N candles, body/wick volume split, Value Area, POC line + label',short:'Volume Profile / Fixed Range',own:true,
  defs:{limit:false,useSl:false,frvBars:150,frvRows:24,frvVA:70,frvPocCol:'#ff0000',frvPocW:2,frvVU:'#2962ff',frvVD:'#ff9800',frvUp:'#2962ff',frvDn:'#ff9800',frvLbl:true},
  inputs:(b,d)=>{
    fld(b,d,'frvBars','num','Number of bars',{min:1,max:500,step:10}); fld(b,d,'frvRows','num','Row size',{min:5,max:100,step:1}); fld(b,d,'frvVA','num','Value Area volume %',{min:0,max:100,step:1});
    fld(b,d,'frvPocCol','col','POC colour'); fld(b,d,'frvPocW','num','POC width',{min:1,max:5,step:1});
    fld(b,d,'frvVU','col','Value Area up'); fld(b,d,'frvVD','col','Value Area down'); fld(b,d,'frvUp','col','Up volume'); fld(b,d,'frvDn','col','Down volume');
    fld(b,d,'frvLbl','chk','Show POC label'); },
  sig:()=>0};
try{ DESC.frv='Strategy \u00b7 fixed-range volume profile over the last N candles with Value Area and POC line + label'; }catch(e){}
{ const _fD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='frvview') return frvDraw(d,X,Y,W,H); return _fD.apply(this,arguments); };
  const _fR=recomputeExtras; recomputeExtras=function(){ _fR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='frv'&&stVis(Z)) scriptBoxes.push({type:'frvview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('frv strategy failed',err); window.__frvErr=err; }

// =====================================================================================
// [hsd] STRATEGY (Price Action) · "Head & Shoulders" with Classic and Conservative entries   (self-contained: every name starts with hsd / HSD)
// Confirmed swing pivots -> LS / Head / RS with a sloped neckline (through the two troughs). Classic entry = first close beyond the neckline.
// Conservative entry = wait for the retest of the neckline, then enter on the rejecting candle. Stop = right shoulder (Classic) / retest high
// (Conservative); target = head height measured from the neckline. Inverse H&S (BUY) is the mirror image. Closed candles only.
// =====================================================================================
try{
const HSD_KEYS=['hsdSw','hsdTol','hsdBrk','hsdRet','hsdMode','hsdBear','hsdBull','hsdMax','hsdBars','hsdCol','hsdFull'];
const hsdCache={};
const hsdRgba=(h,a)=>{ h=String(h||'#888888'); if(h[0]==='#'&&h.length===4) h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3]; const m=/^#([0-9a-f]{6})/i.exec(h); if(!m) return h; const v=parseInt(m[1],16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; };
const hsdP=v=>{ const a=Math.abs(v), d=a>=1000?2:a>=1?4:a>=.01?5:8; return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:d}); };
function hsdCalc(c,Z){
  const n=c.length, S=Math.max(2,Math.round(Z.hsdSw)||5), tol=Math.max(0,(Z.hsdTol==null?25:Z.hsdTol)/100), maxB=Math.max(2,Math.round(Z.hsdBrk)||30), maxR=Math.max(1,Math.round(Z.hsdRet)||15), mode=Z.hsdMode||'Classic';
  const a0=Math.max(0,n-Math.max(60,Math.round(Z.hsdBars)||1000)), out=[]; if(n<4*S+10) return out;
  [1,-1].forEach(dir=>{
    if(dir>0&&Z.hsdBear===false) return; if(dir<0&&Z.hsdBull===false) return;
    // everything below is in "mirrored" space: for the inverse pattern prices are negated, so it is always a bearish H&S
    const colReq=Z.hsdCol!==false, fullReq=Z.hsdFull!==false;   // fullReq: the whole candle BODY (open and close) must sit beyond the neckline, wicks may touch it
       // breakout candle must be red (SELL) / green (BUY), not just any candle closing through the neckline
    const H=i=>dir>0?c[i].high:-c[i].low, L=i=>dir>0?c[i].low:-c[i].high, CL=i=>dir*c[i].close, OP=i=>dir*c[i].open, pv=[];
    for(let i=a0+S;i<=n-1-S;i++){ let ph=true, pl=true; const h=H(i), l=L(i);
      for(let j=i-S;j<=i+S;j++){ if(j===i) continue; if(H(j)>h||(j<i&&H(j)===h)) ph=false; if(L(j)<l||(j<i&&L(j)===l)) pl=false; }
      if(ph) pv.push({i,p:h,hi:true}); else if(pl) pv.push({i,p:l,hi:false}); }
    const al=[]; pv.forEach(q=>{ const t=al[al.length-1]; if(t&&t.hi===q.hi){ if(q.hi?q.p>t.p:q.p<t.p) al[al.length-1]=q; } else al.push(q); });
    const used=new Set();
    for(let k=4;k<al.length;k++){
      const LS=al[k-4], T1=al[k-3], HD=al[k-2], T2=al[k-1], RS=al[k];
      if(!(LS.hi&&!T1.hi&&HD.hi&&!T2.hi&&RS.hi)||used.has(HD.i)||T2.i===T1.i) continue;
      const neck=i=>T1.p+(T2.p-T1.p)*(i-T1.i)/(T2.i-T1.i), hH=HD.p-neck(HD.i);
      if(!(hH>0)||HD.p<=LS.p||HD.p<=RS.p||LS.p<=neck(LS.i)||RS.p<=neck(RS.i)||Math.abs(LS.p-RS.p)>tol*hH) continue;
      const s1=HD.i-LS.i, s2=RS.i-HD.i; if(s1<=0||s2<=0||s1/s2>3||s2/s1>3) continue;
      let br=-1, dead=false; for(let j=RS.i+1;j<n&&j<=RS.i+maxB;j++){ if(H(j)>HD.p){ dead=true; break; } if(CL(j)<neck(j)&&(!colReq||CL(j)<OP(j))&&(!fullReq||OP(j)<neck(j))){ br=j; break; } }
      if(dead) continue; const pending=br<0&&RS.i+maxB>=n-1; if(br<0&&!pending) continue;
      const ents=[]; let wait=null;
      if(br>=0){
        const mk=(kind,ei,sl,x)=>{ const entry=CL(ei), tp=neck(br)-hH; if(!(sl>entry)||!(tp<entry)) return; let res='open', end=n-1;
          for(let t=ei+1;t<n;t++){ if(H(t)>=sl){ res='sl'; end=t; break; } if(L(t)<=tp){ res='tp'; end=t; break; } }
          ents.push({kind,i:ei,entry,sl,tp,res,end,...(x||{})}); };
        if(mode==='Classic'||mode==='Both'||mode==='All') mk('Classic',br,RS.p);
        if(mode==='Conservative'||mode==='Both'||mode==='All'){ let touched=false, mh=-Infinity, ei=-1;
          for(let r=br+1;r<n&&r<=br+maxR;r++){ if(H(r)>RS.p) break; mh=Math.max(mh,H(r)); if(H(r)>=neck(r)) touched=true; if(touched&&CL(r)<OP(r)&&CL(r)<neck(r)){ ei=r; break; } }
          if(ei>=0) mk('Conservative',ei,mh); }
        // Retest + BOS: after the neckline break price comes back to test the neckline (retest), then a candle CLOSES beyond the last swing
        // low (break of structure, BOS) made before the retest. Stop = highest point of the retest, target = head height from the neckline.
        if(mode==='Retest + BOS'||mode==='All'){ let rt=-1, rh=-Infinity, sLow=L(br), ei=-1, lvl=0, dead2=false;
          for(let r=br+1;r<n&&r<=br+2*maxR;r++){ if(H(r)>RS.p){ dead2=true; break; }
            if(rt<0){ if(H(r)>=neck(r)){ rt=r; rh=H(r); } else sLow=Math.min(sLow,L(r)); }
            else { rh=Math.max(rh,H(r)); if(CL(r)<sLow){ ei=r; lvl=sLow; break; } } }
          if(ei>=0) mk('Retest+BOS',ei,rh,{rt,bos:lvl,rh,br}); else if(!dead2&&br+2*maxR>=n-1) wait={br,rt,rh}; } }
      if(!ents.length&&!pending&&!wait) continue;
      used.add(HD.i); out.push({dir,LS,T1,HD,T2,RS,br,hH,ents,pending,wait}); } });
  out.sort((x,y)=>(x.br<0?1e9:x.br)-(y.br<0?1e9:y.br)); const mx=Math.max(1,Math.round(Z.hsdMax)||6); return out.slice(-mx); }
function hsdGet(cc,Z){ if(Z.hsdVer!==2){ Z.hsdVer=2; Z.hsdMode='Retest + BOS'; }   // one-time: existing copies switch to the Breakout > Retest > BOS flow
  const c=cc.slice(0,-1), n=c.length; if(n<30) return null; const l=c[n-1];
  const key=[n,c[0].time,l.time,l.high,l.low,l.close,HSD_KEYS.map(k=>Z[k]).join(',')].join('|');
  if(!hsdCache[Z.sid]||hsdCache[Z.sid].k!==key) hsdCache[Z.sid]={k:key,r:hsdCalc(c,Z)};
  return hsdCache[Z.sid].r; }
function hsdDraw(d,X,Y,W,H){
  const Z=d.o, cc=candles; if(!cc||cc.length<31) return; const pats=hsdGet(cc,Z); if(!pats||!pats.length) return;
  const neckC=Z.hsdNeck||'#d1d4dc', slC=Z.hsdSl||'#ef5350', tpC=Z.hsdTp||'#26a69a', enC=Z.hsdEn||'#ffffff', showLv=Z.hsdLv!==false, showLb=Z.hsdLb!==false;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle';
  const txt=(t,x,y,col,al,sz)=>{ cx.font='bold '+(sz||10)+'px system-ui'; cx.textAlign=al||'center'; cx.lineWidth=3; cx.strokeStyle='rgba(10,12,20,.9)'; cx.strokeText(t,x,y); cx.fillStyle=col; cx.fillText(t,x,y); };
  const ring=(i,price)=>{ const x=X(i), y=Y(price); if(x==null||y==null) return; cx.strokeStyle='#ffffff'; cx.lineWidth=2; cx.fillStyle='rgba(10,12,20,.9)'; cx.beginPath(); cx.arc(x,y,5.5,0,6.2832); cx.fill(); cx.stroke(); };   // white ring = where price touches the neckline again
  const tag=(t,px,py,dx,dy,col,fill)=>{ if(px==null||py==null||px<-30||px>W+30||py<-30||py>H+30) return; const ex=px+dx, ey=py+dy;   // tiny see-through chip joined to the price point by a dotted line
    cx.save(); cx.strokeStyle=hsdRgba(col,.75); cx.lineWidth=1; cx.setLineDash([2,3]); cx.beginPath(); cx.moveTo(px,py); cx.lineTo(ex,ey); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle=hsdRgba(col,.9); cx.beginPath(); cx.arc(px,py,2,0,6.2832); cx.fill();
    cx.font='bold 9px system-ui'; const w=Math.ceil(cx.measureText(t).width)+10, h=14, x0=ex-w/2, y0=ey-h/2;
    cx.fillStyle=fill?hsdRgba(col,.5):'rgba(14,17,26,.4)'; cx.beginPath(); if(cx.roundRect) cx.roundRect(x0,y0,w,h,4); else cx.rect(x0,y0,w,h); cx.fill(); cx.strokeStyle=hsdRgba(col,.6); cx.lineWidth=1; cx.stroke();
    cx.fillStyle=fill?'rgba(255,255,255,.95)':hsdRgba(col,.95); cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(t,ex,ey+.5); cx.restore(); };
  const line=(x1,y1,x2,y2,col,w,dash)=>{ cx.strokeStyle=col; cx.lineWidth=w; cx.setLineDash(dash||[]); cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke(); cx.setLineDash([]); };
  pats.forEach(q=>{ const dr=q.dir, P=p=>dr*p, neck=i=>q.T1.p+(q.T2.p-q.T1.p)*(i-q.T1.i)/(q.T2.i-q.T1.i), endI=q.br>=0?Math.max(q.br+2,q.wait?cc.length-1:0,...q.ents.map(e=>e.i+3)):cc.length-1;   // neckline runs on through the retest to the BOS / entry
    const x1=X(q.T1.i), y1=Y(P(neck(q.T1.i))), x2=X(endI), y2=Y(P(neck(endI))); if(x1!=null&&y1!=null&&x2!=null&&y2!=null) line(x1,y1,x2,y2,neckC,2);
    if(showLb){ [['LS',q.LS],['Head',q.HD],['RS',q.RS]].forEach(([t,pv])=>{ const x=X(pv.i), y=Y(P(pv.p)); if(x==null||y==null) return; const up=dr>0; txt((up?'\u25bc ':'\u25b2 ')+t,x,y+(up?-12:12),slC,'center',10); });
      const xm=X((q.T1.i+endI)/2), ym=Y(P(neck((q.T1.i+endI)/2))); if(xm!=null&&ym!=null) txt('Neckline',xm,ym+(dr>0?14:-14),neckC,'center',10);
      if(q.pending){ const x=X(q.RS.i), y=Y(P(q.RS.p)); if(x!=null&&y!=null) txt('pending',x,y+(dr>0?-26:26),'#9aa3b5','center',9); } }
    if(q.wait){ const w=q.wait; tag('1 Breakout',X(w.br),Y(P(neck(w.br))),-14,dr>0?34:-34,'#ffffff');
      if(w.rt>=0){ ring(w.rt,P(neck(w.rt))); tag('2 Retest',X(w.rt),Y(P(neck(w.rt))),0,dr>0?-34:34,'#ffb300'); }
      const xp=X(q.RS.i), yp=Y(P(q.RS.p)); if(xp!=null&&yp!=null) txt(w.rt>=0?'Waiting for BOS':'Waiting for retest',xp,yp+(dr>0?-28:28),'#ffb300','center',10); }
    q.ents.forEach(e=>{ const xs=X(e.i), ye=Y(P(e.entry)), ys=Y(P(e.sl)), yt=Y(P(e.tp)); if(xs==null||ye==null||ys==null||yt==null) return;
      const xe=e.res==='open'?W:Math.min(W,X(e.end)+8), col=dr>0?slC:tpC;
      if(showLv){ line(xs,ye,xe,ye,enC,1.5); line(xs,ys,xe,ys,slC,1.5); line(xs,yt,xe,yt,tpC,1.5);
        const lx=Math.max(xs+46,xe-4); txt('Entry '+hsdP(P(e.entry)),lx,ye-7,enC,'right',9); txt('Stop Loss '+hsdP(P(e.sl)),lx,ys+(dr>0?-7:7),slC,'right',9); txt('Target '+hsdP(P(e.tp)),lx,yt+(dr>0?7:-7),tpC,'right',9);
        // dashed projection arrow from entry to target
        const ax=X(e.i+10); if(ax!=null){ line(xs,ye,ax,yt,col,1.5,[5,4]); const ang=Math.atan2(yt-ye,ax-xs); cx.fillStyle=col; cx.beginPath(); cx.moveTo(ax,yt); cx.lineTo(ax-9*Math.cos(ang-.45),yt-9*Math.sin(ang-.45)); cx.lineTo(ax-9*Math.cos(ang+.45),yt-9*Math.sin(ang+.45)); cx.fill(); } }
      if(e.kind==='Retest+BOS'){ const xr=X(e.rt), yb=Y(P(e.bos)); if(xr!=null&&yb!=null){ line(xr,yb,xs,yb,'#ffb300',1.5,[4,3]); tag('3 BOS',(xr+xs)/2,yb,0,dr>0?26:-26,'#ffb300'); }
        ring(e.rt,P(neck(e.rt))); tag('2 Retest',xr,Y(P(neck(e.rt))),0,dr>0?-34:34,'#ffb300'); tag('1 Breakout',X(e.br),Y(P(neck(e.br))),-14,dr>0?34:-34,'#ffffff'); }
      tag((dr>0?'\u25bc SELL':'\u25b2 BUY')+(Z.hsdMode==='Retest + BOS'?'':' \u00b7 '+e.kind),xs,ye,0,dr>0?-42:42,col,true);   // tiny, see-through, tied to the entry price by a dotted line (moves with the chart)
      if(e.res!=='open'){ const xh=X(e.end), yh=e.res==='tp'?yt:ys; if(xh!=null) txt(e.res==='tp'?'\u2713':'\u2717',xh,yh,e.res==='tp'?tpC:slC,'center',13); } }); });
  cx.globalAlpha=1; cx.restore(); }
STRATS.hsd={label:'Head & Shoulders \u00b7 neckline break (Classic) or neckline retest (Conservative) entry, stop, target; inverse pattern too',short:'Head & Shoulders (Classic / Conservative)',own:true,
  defs:{limit:false,useSl:false,hsdSw:5,hsdTol:25,hsdBrk:30,hsdRet:15,hsdMode:'Retest + BOS',hsdVer:2,hsdCol:true,hsdFull:true,hsdBear:true,hsdBull:true,hsdMax:6,hsdBars:1000,hsdLv:true,hsdLb:true,hsdNeck:'#d1d4dc',hsdSl:'#ef5350',hsdTp:'#26a69a',hsdEn:'#ffffff'},
  inputs:(b,d)=>{
    fld(b,d,'hsdMode','sel','Entry type',{opts:['Retest + BOS','Classic','Conservative','Both','All']}); fld(b,d,'hsdCol','chk','Breakout candle must be red (SELL) / green (BUY)'); fld(b,d,'hsdFull','chk','Whole candle body must be outside the neckline'); fld(b,d,'hsdBear','chk','Head & Shoulders (SELL)'); fld(b,d,'hsdBull','chk','Inverse Head & Shoulders (BUY)');
    fld(b,d,'hsdSw','num','Swing length (bars each side)',{min:2,max:20,step:1}); fld(b,d,'hsdTol','num','Shoulder tolerance (% of head height)',{min:0,max:100,step:1});
    fld(b,d,'hsdBrk','num','Max bars to neckline break',{min:2,max:100,step:1}); fld(b,d,'hsdRet','num','Max bars to wait for retest',{min:1,max:60,step:1});
    fld(b,d,'hsdMax','num','Patterns to show',{min:1,max:30,step:1}); fld(b,d,'hsdBars','num','Look back (bars)',{min:100,max:5000,step:100});
    fld(b,d,'hsdLb','chk','Pattern labels'); fld(b,d,'hsdLv','chk','Entry / Stop / Target levels');
    fld(b,d,'hsdNeck','col','Neckline colour'); fld(b,d,'hsdEn','col','Entry colour'); fld(b,d,'hsdSl','col','Stop colour'); fld(b,d,'hsdTp','col','Target colour'); },
  sig:()=>0};
try{ DESC.hsd='Price action \u00b7 Head & Shoulders (and inverse): neckline, Classic break entry or Conservative retest entry, stop and measured-move target'; }catch(e){}
try{ if(typeof PAID!=='undefined'&&!PAID.includes('s:hsd')) PAID.push('s:hsd'); }catch(e){}
{ const _hD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='hsdview') return hsdDraw(d,X,Y,W,H); return _hD.apply(this,arguments); };
  const _hR=recomputeExtras; recomputeExtras=function(){ _hR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='hsd'&&stVis(Z)) scriptBoxes.push({type:'hsdview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('hsd strategy failed',err); window.__hsdErr=err; }


// =====================================================================================
// [prv] STRATEGY · "Polynomial/Linear Regression Volume Profile" (BigBeluga port)   (self-contained: every name starts with prv / PRV)
// Least-squares regression (linear or polynomial degree 2) over the last N bars, a +-3 SD channel split into rows,
// a curved volume profile that follows the regression, the POC line, SD levels and an info dashboard.
// The Pine script has no trade signals, so this adds no BUY / SELL. Hooks: STRATS.prv + draw + recomputeExtras.
// =====================================================================================
try{
function prvSolve(A,B){ const n=B.length; for(let i=0;i<n;i++){ let m=i; for(let r=i+1;r<n;r++) if(Math.abs(A[r][i])>Math.abs(A[m][i])) m=r;
    [A[i],A[m]]=[A[m],A[i]]; [B[i],B[m]]=[B[m],B[i]]; const p=A[i][i]||1e-12;
    for(let r=i+1;r<n;r++){ const f=A[r][i]/p; for(let k=i;k<n;k++) A[r][k]-=f*A[i][k]; B[r]-=f*B[i]; } }
  const x=new Array(n).fill(0); for(let i=n-1;i>=0;i--){ let s=B[i]; for(let k=i+1;k<n;k++) s-=A[i][k]*x[k]; x[i]=s/(A[i][i]||1e-12); } return x; }
const prvSrcF={hl2:x=>(x.high+x.low)/2,close:x=>x.close,open:x=>x.open,high:x=>x.high,low:x=>x.low,hlc3:x=>(x.high+x.low+x.close)/3,ohlc4:x=>(x.open+x.high+x.low+x.close)/4};
function prvCompute(c,Z){
  const N=Math.max(2,Math.round(Z.prvLen)||200); if(c.length<N+1) return null;
  const deg=Z.prvMode==='Linear'?1:2, BINS=Math.max(5,Math.round(Z.prvBins)||20), f=prvSrcF[Z.prvSrc]||prvSrcF.hl2, w=c.slice(c.length-N), src=w.map(f), vol=w.map(x=>x.volume||0);
  const m=deg+1, A=Array.from({length:m},()=>new Array(m).fill(0)), B=new Array(m).fill(0), tn=i=>N>1?i/(N-1):0;
  for(let i=0;i<N;i++){ const t=tn(i), pw=[]; for(let j=0;j<m;j++) pw.push(Math.pow(t,j)); for(let a=0;a<m;a++){ B[a]+=pw[a]*src[i]; for(let b=0;b<m;b++) A[a][b]+=pw[a]*pw[b]; } }
  const co=prvSolve(A,B), pred=src.map((_,i)=>{ const t=tn(i); let s=0; for(let j=0;j<m;j++) s+=co[j]*Math.pow(t,j); return s; });
  const mean=src.reduce((a,b)=>a+b,0)/N, sd=Math.sqrt(src.reduce((a,b)=>a+(b-mean)*(b-mean),0)/N), dev=Math.max(sd*3/BINS,1e-12);
  const bv=new Array(BINS*2).fill(0);
  for(let i=0;i<N;i++){ const bi=Math.floor((src[i]-pred[i])/dev)+BINS; if(bi>=0&&bi<BINS*2) bv[bi]+=vol[i]; }
  let mx=0,poc=-1; bv.forEach((v,i)=>{ if(v>mx){ mx=v; poc=i; } });
  return {N,n:c.length,BINS,pred,sd,dev,bv,mx,poc,bull:pred[N-1]>pred[0]};
}
const prvFmtV=v=>{ const a=Math.abs(v); return a>=1e9?(v/1e9).toFixed(2)+'B':a>=1e6?(v/1e6).toFixed(2)+'M':a>=1e3?(v/1e3).toFixed(2)+'K':v.toFixed(2); };
const prvFmtP=v=>{ const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=1?2:6}); };
const prvDash=s=>s==='Dashed'?[6,4]:s==='Dotted'?[1.5,3]:[];
function prvRgb(h){ const v=parseInt(h.replace('#',''),16); return [v>>16&255,v>>8&255,v&255]; }
function prvDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<20) return; const r=prvCompute(c,Z); if(!r) return; const {N,n,BINS,pred,sd,dev}=r, i0=n-N;
  const fg='#d1d4dc', c1=Z.prvC1||'#2962ff', c2=Z.prvC2||'#ff9800', pocC=Z.prvPocCol||'#ffa600', sdC=Z.prvSdCol||'#637a78', mainC=r.bull?c1:c2, lowC=Z.prvCLow||'#af2b2b';
  const xs=[]; for(let i=0;i<N;i++){ const x=X(i0+i); xs.push(x); } if(xs.some(x=>x==null)) return;
  const xl=xs[N-1];
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round'; cx.textBaseline='middle'; cx.textAlign='left';
  const curve=(off,col,wd,dash,al,from)=>{ cx.beginPath(); let st=false; for(let i=from||0;i<N;i++){ const y=Y(pred[i]+off); if(y==null) continue; if(!st){ cx.moveTo(xs[i],y); st=true; } else cx.lineTo(xs[i],y); }
    cx.globalAlpha=al; cx.strokeStyle=col; cx.lineWidth=wd; cx.setLineDash(dash); cx.stroke(); cx.setLineDash([]); };
  // grid rows
  for(let s=1;s<=BINS;s++){ curve(s*dev,fg,1,prvDash(Z.prvGridSty),.12); curve(-s*dev,fg,1,prvDash(Z.prvGridSty),.12); }
  // volume profile following the regression
  if(r.mx>0){ const pl=Math.round(N*(Math.max(5,Math.min(50,Z.prvW))/100)), yy=Y(pred[N-1]), yy2=Y(pred[N-1]+dev), bh=(yy!=null&&yy2!=null)?Math.abs(yy2-yy):6, lw=Math.max(1,Math.min(16,bh*.9)), lo=prvRgb(lowC), hi=prvRgb(mainC);
    cx.lineCap='butt';
    for(let s=0;s<BINS*2;s++){ const v=r.bv[s]; if(!(v>0)) continue; const rel=v/r.mx, mw=Math.round(pl*rel), st=N-mw; if(N-st<2) continue;
      const col='rgba('+Math.round(lo[0]+(hi[0]-lo[0])*rel)+','+Math.round(lo[1]+(hi[1]-lo[1])*rel)+','+Math.round(lo[2]+(hi[2]-lo[2])*rel)+','+(.37+.63*rel).toFixed(2)+')';
      cx.beginPath(); let started=false; for(let i=st;i<N;i++){ const y=Y(pred[i]+(s-BINS)*dev); if(y==null) continue; if(!started){ cx.moveTo(xs[i],y); started=true; } else cx.lineTo(xs[i],y); }
      cx.globalAlpha=1; cx.strokeStyle=col; cx.lineWidth=lw; cx.stroke(); } }
  // SD levels
  if(Z.prvSd!==false){ [1,-1,2,-2,3,-3].forEach(k=>curve(k*sd,sdC,Z.prvSdW||1,prvDash(Z.prvSdSty),.9)); }
  // baseline + POC
  curve(0,fg,2,prvDash(Z.prvBaseSty),.95);
  let pocY=null, pocP=null; if(r.poc>=0){ const off=(r.poc-BINS)*dev; pocP=pred[N-1]+off; if(Z.prvPoc!==false) curve(off,pocC,Z.prvPocW||2,prvDash(Z.prvPocSty),1); }
  cx.globalAlpha=1;
  // labels (kept inside the chart area)
  cx.font='10px system-ui';
  const tag=(txt,x,y,bg,col)=>{ const w=cx.measureText(txt).width+8, lx=Math.max(2,Math.min(W-w-2,x)); cx.globalAlpha=.85; cx.fillStyle=bg; cx.fillRect(lx,y-7,w,14); cx.globalAlpha=1; cx.fillStyle=col; cx.fillText(txt,lx+4,y); };
  const lp=pred[N-1];
  if(r.poc>=0){ const y=Y(pocP); if(y!=null) tag('\u2190 POC  Vol: '+prvFmtV(r.mx),xl+4,y,'rgba(255,166,0,.8)','#fff'); }
  const yh=Y(lp+BINS*dev), yl=Y(lp-BINS*dev);
  if(yh!=null) tag('Channel High (+3 SD): '+prvFmtP(lp+BINS*dev),xl+4,yh-9,'rgba(209,212,220,.16)',fg);
  if(yl!=null) tag('Channel Low (-3 SD): '+prvFmtP(lp-BINS*dev),xl+4,yl+9,'rgba(209,212,220,.16)',fg);
  if(Z.prvSd!==false) [1,-1,2,-2].forEach(k=>{ const y=Y(lp+k*sd); if(y==null) return; cx.fillStyle=sdC; const tx=(k>0?'+':'-')+Math.abs(k)+' SD', w=cx.measureText(tx).width; cx.fillText(tx,Math.max(2,Math.min(W-w-2,xl+4)),y); });
  // dashboard (top-right)
  if(Z.prvDashOn!==false){ const fs=Z.prvDashSz==='Small'?9:Z.prvDashSz==='Large'?13:11, rowsT=[['Regression Matrix','Metrics',fg,null],['Direction',r.bull?'Bullish \u2197':'Bearish \u2198','#fff',r.bull?c1:c2],['POC Level',pocP!=null?prvFmtP(pocP):'-','#ffeb3b',null],['POC Volume',prvFmtV(r.mx),'#ff9800',null],['Channel High/Low','H: '+prvFmtP(lp+BINS*dev)+'  L: '+prvFmtP(lp-BINS*dev),'#fff',null]];
    cx.font=fs+'px system-ui'; const rh=fs+9; let w0=0,w1=0; rowsT.forEach(t=>{ w0=Math.max(w0,cx.measureText(t[0]).width); w1=Math.max(w1,cx.measureText(t[1]).width); }); w0+=12; w1+=12;
    const tx=Math.max(2,W-w0-w1-6), ty=6; cx.textBaseline='middle';
    rowsT.forEach((t,i)=>{ const y=ty+i*rh; cx.globalAlpha=.8; cx.fillStyle=i===0?'#131722':'#000'; cx.fillRect(tx,y,w0,rh-1); cx.fillStyle=t[3]||(i===0?'#131722':'#000'); cx.fillRect(tx+w0,y,w1,rh-1);
      cx.globalAlpha=1; cx.fillStyle=i===0?fg:'#fff'; cx.textAlign='left'; cx.fillText(t[0],tx+6,y+rh/2); cx.fillStyle=t[2]; cx.fillText(t[1],tx+w0+6,y+rh/2); }); }
  cx.globalAlpha=1; cx.restore();
}
STRATS.prv={label:'Polynomial/Linear Regression Volume Profile \u00b7 regression channel, SD levels, curved volume profile, POC, dashboard',short:'Regression Volume Profile',own:true,
  defs:{limit:false,useSl:false,prvSrc:'hl2',prvLen:200,prvMode:'Polynomial',prvBins:20,prvW:20,prvPoc:true,prvPocCol:'#ffa600',prvPocW:2,prvPocSty:'Solid',prvSd:true,prvSdCol:'#637a78',prvSdSty:'Dashed',prvSdW:1,
    prvC1:'#2962ff',prvC2:'#ff9800',prvCLow:'#af2b2b',prvBaseSty:'Dashed',prvGridSty:'Dotted',prvDashOn:true,prvDashSz:'Normal'},
  inputs:(b,d)=>{
    fld(b,d,'prvSrc','sel','Source',{opts:['hl2','close','open','high','low','hlc3','ohlc4']}); fld(b,d,'prvLen','num','Period (bars)',{min:2,max:1000,step:10});
    fld(b,d,'prvMode','sel','Regression mode',{opts:['Linear','Polynomial']}); fld(b,d,'prvBins','num','Grid rows each side',{min:5,max:60,step:1}); fld(b,d,'prvW','num','Max profile width (% of period)',{min:5,max:50,step:1});
    fld(b,d,'prvPoc','chk','Show POC line'); fld(b,d,'prvPocCol','col','POC colour'); fld(b,d,'prvPocW','num','POC width',{min:1,max:10,step:1}); fld(b,d,'prvPocSty','sel','POC line style',{opts:['Solid','Dashed','Dotted']});
    fld(b,d,'prvSd','chk','Show SD levels'); fld(b,d,'prvSdCol','col','SD colour'); fld(b,d,'prvSdSty','sel','SD line style',{opts:['Solid','Dashed','Dotted']}); fld(b,d,'prvSdW','num','SD line width',{min:1,max:5,step:1});
    fld(b,d,'prvC1','col','Bullish colour'); fld(b,d,'prvC2','col','Bearish colour'); fld(b,d,'prvCLow','col','Low volume colour');
    fld(b,d,'prvBaseSty','sel','Baseline style',{opts:['Solid','Dashed','Dotted']}); fld(b,d,'prvGridSty','sel','Grid lines style',{opts:['Solid','Dashed','Dotted']});
    fld(b,d,'prvDashOn','chk','Show dashboard'); fld(b,d,'prvDashSz','sel','Dashboard size',{opts:['Auto','Small','Normal','Large']}); },
  sig:()=>0};
try{ DESC.prv='Strategy \u00b7 linear / polynomial regression channel with SD levels, curved volume profile and POC'; }catch(e){}
{ const _rD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='prvview') return prvDraw(d,X,Y,W,H); return _rD.apply(this,arguments); };
  const _rR=recomputeExtras; recomputeExtras=function(){ _rR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='prv'&&stVis(Z)) scriptBoxes.push({type:'prvview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('prv strategy failed',err); window.__prvErr=err; }


// =====================================================================================
// [fsw] STRATEGY · "Fibonacci Sequence Swing" (ChartPrime port)   (self-contained: every name starts with fsw / FSW)
// ZigZag from N-bar highs / lows. Each swing is cut into 21 equal steps and levels are drawn at the Fibonacci sequence
// 0,1,1,2,3,5,8,13,21; every level shows how many candles crossed it (retest count) and gets thicker / stronger with it.
// The Pine script has no trade signals, so this adds no BUY / SELL. Hooks: STRATS.fsw + draw + recomputeExtras.
// =====================================================================================
try{
const FSW_SEQ=[0,1,1,2,3,5,8,13,21], FSW_KEYS=['fswD'];
function fswCompute(all,Z){
  const off=Math.max(0,all.length-3000), a=all.slice(off), n=a.length, D=Math.max(2,Math.round(Z.fswD)||150); if(n<D+2) return null;
  let zh=null,zl=null,dir=0,ih=null,il=null, leg=null; const legs=[], swings=[];
  const cross=(level,fromIdx,t)=>{ let k=0; for(let j=fromIdx;j<=t;j++) if(a[j].high>level&&a[j].low<level) k++; return k; };
  for(let t=0;t<n;t++){
    const pz={zh,zl,dir,ih,il};
    let isH=false,isL=false;
    if(t>=D-1){ let hh=-Infinity,ll=Infinity; for(let j=t-D+1;j<=t;j++){ if(a[j].high>hh) hh=a[j].high; if(a[j].low<ll) ll=a[j].low; } isH=a[t].high===hh; isL=a[t].low===ll; }
    if(isH){ zh=a[t].high; dir=1; ih=t; }
    if(isL){ zl=a[t].low; dir=-1; il=t; }
    if(t>0&&dir!==pz.dir&&dir===1){
      if(il!=null&&zl!=null){ leg={x0:il,y0:zl,x1:t,y1:zh,up:true,txt:zh}; legs.push(leg); }
      if(pz.ih!=null&&pz.zh!=null&&pz.zl!=null&&il!=null){ const hh=pz.zh, ll=pz.zl, st=(hh-ll)/21, lv=[];
        for(let i=FSW_SEQ.length-1;i>=0;i--){ const level=hh-st*FSW_SEQ[i]; lv.push({s:FSW_SEQ[i],level,cr:cross(level,pz.ih,t)}); }
        swings.push({x0:pz.ih,x1:il,up:false,lv}); } }
    if(dir===1&&leg&&leg.up){ leg.x1=ih; leg.y1=zh; }
    if(t>0&&dir!==pz.dir&&dir===-1){
      if(ih!=null&&zh!=null){ leg={x0:ih,y0:zh,x1:t,y1:zl,up:false,txt:zl}; legs.push(leg); }
      if(pz.il!=null&&pz.zl!=null&&pz.zh!=null&&ih!=null){ const hh=pz.zh, ll=pz.zl, st=(hh-ll)/21, lv=[];
        for(let i=0;i<FSW_SEQ.length;i++){ const level=ll+st*FSW_SEQ[i]; lv.push({s:FSW_SEQ[i],level,cr:cross(level,pz.il,t)}); }
        swings.push({x0:pz.il,x1:ih,up:true,lv}); } }
    if(dir===-1&&leg&&!leg.up){ leg.x1=il; leg.y1=zl; }
  }
  let live=null;
  if(dir===1&&il!=null&&zl!=null&&zh!=null){ const st=(zh-zl)/21; live={up:true,x0:il,lv:FSW_SEQ.map(s=>{ const level=zl+st*s; return {s,level,cr:cross(level,il,n-1)}; })}; }
  if(dir===-1&&ih!=null&&zl!=null&&zh!=null){ const st=(zh-zl)/21; live={up:false,x0:ih,lv:FSW_SEQ.map(s=>{ const level=zh-st*s; return {s,level,cr:cross(level,ih,n-1)}; })}; }
  return {off,n,legs,swings,live};
}
const fswCache={};
function fswGet(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,Z.fswD].join('|');
  if(!fswCache[Z.sid]||fswCache[Z.sid].k!==key) fswCache[Z.sid]={k:key,r:fswCompute(c,Z)}; return fswCache[Z.sid].r; }
const fswP=v=>{ const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=1?2:6}); };
function fswRgb(h){ const v=parseInt(h.replace('#',''),16); return [v>>16&255,v>>8&255,v&255]; }
function fswDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<60) return; const r=fswGet(c,Z); if(!r) return; const {off,n}=r, MAX=Math.max(1,Math.round(Z.fswMax)||30);
  const zc=Z.fswZig||'#9297a7', up=Z.fswUp||'#4caf50', dn=Z.fswDn||'#f23645', fg='#d1d4dc';
  const colOf=(cr,hex)=>{ const q=fswRgb(hex), a=.2+.8*Math.min(cr,MAX)/MAX; return 'rgba('+q[0]+','+q[1]+','+q[2]+','+a.toFixed(2)+')'; }, wOf=cr=>Math.max(1,Math.min(6,Math.floor(cr/10)));
  const xl=X(n-1+off); if(xl==null) return; const bw=(X(n-2+off)!=null&&xl-X(n-2+off)>0)?xl-X(n-2+off):6;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle'; cx.textAlign='center';
  // finished swings (last N)
  r.swings.slice(-Math.max(0,Math.round(Z.fswN)||0)).forEach(s=>{ const x0=X(s.x0+off), x1=X(s.x1+off); if(x0==null||x1==null) return; const hex=s.up?up:dn; const seen={};
    s.lv.forEach(q=>{ if(seen[q.s]) return; seen[q.s]=1; const y=Y(q.level); if(y==null) return; cx.strokeStyle=colOf(q.cr,hex); cx.lineWidth=wOf(q.cr); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); }); });
  // zigzag legs + pivot labels
  cx.lineWidth=1; cx.strokeStyle=zc; cx.setLineDash([5,4]);
  r.legs.forEach(g=>{ const x0=X(g.x0+off), x1=X(g.x1+off), y0=Y(g.y0), y1=Y(g.y1); if(x0==null||x1==null||y0==null||y1==null) return; cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y1); cx.stroke(); });
  cx.setLineDash([]);
  if(Z.fswZL!==false){ cx.fillStyle=zc; cx.font='9px system-ui'; r.legs.slice(-12).forEach(g=>{ const x=X(g.x0+off), y=Y(g.y0); if(x==null||y==null||x<-30||x>W+30) return;
      if(g.up){ cx.fillText('\u25B2',x,y+8); cx.fillText(fswP(g.txt),x,y+19); } else { cx.fillText(fswP(g.txt),x,y-19); cx.fillText('\u25BC',x,y-8); } }); }
  // live swing levels + labels
  const lv=r.live; if(lv){ const x0=X(lv.x0+off); if(x0!=null){ const hex=lv.up?up:dn, seen={}, items=[]; cx.font='10px system-ui';
      lv.lv.forEach(q=>{ if(seen[q.s]) return; seen[q.s]=1; const y=Y(q.level); if(y==null) return; items.push({q,y,txt:String(q.s)+(q.cr?' -\u25C6- '+q.cr:'')}); });
      let mw=0; items.forEach(it=>{ it.w=cx.measureText(it.txt).width+10; mw=Math.max(mw,it.w); });
      const xe=Math.min(xl+5*bw,W-mw-2);
      items.forEach(it=>{ cx.strokeStyle=colOf(it.q.cr,hex); cx.lineWidth=wOf(it.q.cr); cx.beginPath(); cx.moveTo(x0,it.y); cx.lineTo(xe,it.y); cx.stroke(); });
      if(Z.fswLL!==false){ const sorted=items.slice().sort((a,b)=>a.y-b.y); sorted.forEach((it,i)=>{ it.ly=i&&it.y<sorted[i-1].ly+13?sorted[i-1].ly+13:it.y; });
        sorted.forEach(it=>{ cx.fillStyle=colOf(it.q.cr,hex); cx.fillRect(xe,it.ly-7,it.w,14); cx.fillStyle=fg; cx.textAlign='left'; cx.fillText(it.txt,xe+5,it.ly); }); cx.textAlign='center'; } } }
  cx.globalAlpha=1; cx.restore();
}
STRATS.fsw={label:'Fibonacci Sequence Swing \u00b7 zigzag swings with Fibonacci-sequence levels (0,1,1,2,3,5,8,13,21) and retest counts',short:'Fibonacci Sequence Swing',own:true,
  defs:{limit:false,useSl:false,fswD:150,fswZig:'#9297a7',fswUp:'#4caf50',fswDn:'#f23645',fswMax:30,fswN:6,fswZL:true,fswLL:true},
  inputs:(b,d)=>{
    fld(b,d,'fswD','num','ZigZag depth',{min:2,max:500,step:1}); fld(b,d,'fswMax','num','Retest limit',{min:1,max:200,step:1}); fld(b,d,'fswN','num','Finished swings to show',{min:0,max:60,step:1});
    fld(b,d,'fswZL','chk','Show ZigZag pivot labels'); fld(b,d,'fswLL','chk','Show level labels');
    fld(b,d,'fswZig','col','ZigZag colour'); fld(b,d,'fswUp','col','Up colour'); fld(b,d,'fswDn','col','Down colour'); },
  sig:()=>0};
try{ DESC.fsw='Strategy \u00b7 zigzag swings with Fibonacci-sequence levels and retest counts'; }catch(e){}
{ const _fD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='fswview') return fswDraw(d,X,Y,W,H); return _fD.apply(this,arguments); };
  const _fR=recomputeExtras; recomputeExtras=function(){ _fR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='fsw'&&stVis(Z)) scriptBoxes.push({type:'fswview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('fsw strategy failed',err); window.__fswErr=err; }


// =====================================================================================
// [f3x] STRATEGY · "Fib 1-2-3 Extension"   (self-contained: every name starts with f3x / F3X)
// Finds the latest confirmed 1 -> 2 -> 3 swing (low-high-higher low for bullish, high-low-lower high for bearish),
// draws numbered points + arrows and Fibonacci levels measured on the 1-2 leg from point 1
// (0, 38.2, 50, 61.8, 100, 138.2, 161.8, 200 by default) and a target arrow from point 3.
// No BUY / SELL signals. Hooks: STRATS.f3x + draw + recomputeExtras. Appears in the Strategies list.
// =====================================================================================
try{
function f3xCompute(all,Z){
  const off=Math.max(0,all.length-3000), a=all.slice(off), n=a.length, L=Math.max(2,Math.round(Z.f3L)||8); if(n<L*2+6) return null;
  const pv=[];
  for(let t=L;t<n-L;t++){
    let hh=-Infinity,ll=Infinity; for(let j=t-L;j<=t+L;j++){ if(a[j].high>hh) hh=a[j].high; if(a[j].low<ll) ll=a[j].low; }
    let isH=a[t].high===hh, isL=a[t].low===ll;
    if(isH){ for(let j=t-L;j<t;j++) if(a[j].high>=hh){ isH=false; break; } }
    if(isL){ for(let j=t-L;j<t;j++) if(a[j].low<=ll){ isL=false; break; } }
    if(isH===isL) continue;
    const p={i:t,v:isH?a[t].high:a[t].low,h:isH}, last=pv[pv.length-1];
    if(last&&last.h===p.h){ if((p.h&&p.v>last.v)||(!p.h&&p.v<last.v)) pv[pv.length-1]=p; } else pv.push(p);
  }
  for(let k=pv.length-1;k>=2;k--){
    const p3=pv[k],p2=pv[k-1],p1=pv[k-2];
    if(!p1.h&&p2.h&&!p3.h&&p3.v>p1.v&&p3.v<p2.v) return {off,n,p1,p2,p3,up:true};
    if(p1.h&&!p2.h&&p3.h&&p3.v<p1.v&&p3.v>p2.v) return {off,n,p1,p2,p3,up:false};
  }
  return null;
}
const f3xCache={};
function f3xGet(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,Z.f3L].join('|');
  if(!f3xCache[Z.sid]||f3xCache[Z.sid].k!==key) f3xCache[Z.sid]={k:key,r:f3xCompute(c,Z)}; return f3xCache[Z.sid].r; }
const f3xP=v=>{ const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=100?2:a>=1?4:6}); };
function f3xArrow(x0,y0,x1,y1,col,w){
  cx.strokeStyle=col; cx.fillStyle=col; cx.lineWidth=w; cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y1); cx.stroke();
  const ang=Math.atan2(y1-y0,x1-x0), s=9; cx.beginPath(); cx.moveTo(x1,y1);
  cx.lineTo(x1-s*Math.cos(ang-.45),y1-s*Math.sin(ang-.45)); cx.lineTo(x1-s*Math.cos(ang+.45),y1-s*Math.sin(ang+.45)); cx.closePath(); cx.fill();
}
function f3xDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<40) return; const r=f3xGet(c,Z); if(!r) return;
  const {off,n,p1,p2,p3,up}=r, main=Z.f3Main||'#e5121a', lvc=Z.f3Lvl||'#9297a7', tg=Z.f3Tgt||'#f5a623', fg='#d1d4dc';
  const x1=X(p1.i+off), x2=X(p2.i+off), x3=X(p3.i+off), xl=X(n-1+off); if(x1==null||x2==null||x3==null||xl==null) return;
  const bw=(X(n-2+off)!=null&&xl-X(n-2+off)>0)?xl-X(n-2+off):6, ext=Math.max(0,Math.round(Z.f3Ext)||15);
  const xe=Math.min(xl+ext*bw,W-96), diff=p2.v-p1.v;
  const rat=String(Z.f3Lv||'').split(/[ ,;]+/).map(parseFloat).filter(v=>isFinite(v));
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.textBaseline='middle';
  // fib levels (measured on the 1-2 leg, from point 1)
  cx.font='10px system-ui'; cx.lineWidth=1;
  rat.forEach(q=>{ const price=p1.v+diff*q/100, y=Y(price); if(y==null) return;
    const key=(q===0||q===100); cx.strokeStyle=key?main:lvc; cx.setLineDash([5,4]); cx.beginPath(); cx.moveTo(x1,y); cx.lineTo(xe,y); cx.stroke(); cx.setLineDash([]);
    if(Z.f3Lab!==false){ const t=q+'%  '+f3xP(price); cx.fillStyle=key?main:lvc; cx.textAlign='left'; cx.fillText(t,xe+4,y); } });
  // 1 -> 2 -> 3 arrows
  const y1=Y(p1.v), y2=Y(p2.v), y3=Y(p3.v);
  if(y1!=null&&y2!=null&&y3!=null){
    f3xArrow(x1,y1,x2,y2,main,2); f3xArrow(x2,y2,x3,y3,main,2);
    // target arrow from point 3 to the target level
    const ty=Y(p1.v+diff*(Number(Z.f3Tp)||161.8)/100);
    if(Z.f3Arr!==false&&ty!=null) f3xArrow(x3,y3,Math.max(x3+20,xe-8),ty,tg,2);
    // numbered points (low points sit below, high points above, like the reference chart)
    cx.font='bold 11px system-ui'; cx.textAlign='center';
    [[x1,y1,'1',!p1.h],[x2,y2,'2',!p2.h],[x3,y3,'3',!p3.h]].forEach(([x,y,t,low])=>{ const cy=low?y+17:y-17;
      cx.fillStyle=main; cx.beginPath(); cx.arc(x,cy,9,0,Math.PI*2); cx.fill(); cx.fillStyle='#fff'; cx.fillText(t,x,cy+.5); });
  }
  cx.restore();
}
STRATS.f3x={label:'Fib 1-2-3 Extension \u00b7 auto 1-2-3 swing with Fibonacci retracement / extension levels and target arrow',short:'Fib 1-2-3 Extension',own:true,
  defs:{limit:false,useSl:false,f3L:8,f3Lv:'0, 38.2, 50, 61.8, 100, 138.2, 161.8, 200',f3Tp:161.8,f3Ext:15,f3Lab:true,f3Arr:true,f3Main:'#e5121a',f3Lvl:'#9297a7',f3Tgt:'#f5a623'},
  inputs:(b,d)=>{
    fld(b,d,'f3L','num','Swing pivot length (bars each side)',{min:2,max:100,step:1});
    fld(b,d,'f3Lv','txt','Fib levels % (comma separated)');
    fld(b,d,'f3Tp','num','Target level %',{min:1,max:1000,step:0.1});
    fld(b,d,'f3Ext','num','Extend lines to the right (bars)',{min:0,max:200,step:1});
    fld(b,d,'f3Lab','chk','Show level labels'); fld(b,d,'f3Arr','chk','Show target arrow');
    fld(b,d,'f3Main','col','Points / 0% / 100% colour'); fld(b,d,'f3Lvl','col','Level colour'); fld(b,d,'f3Tgt','col','Target arrow colour'); },
  sig:()=>0};
try{ DESC.f3x='Strategy \u00b7 auto 1-2-3 swing: 0 / 38.2 / 50 / 61.8 / 100 / 138.2 / 161.8 / 200 Fibonacci levels with target arrow'; }catch(e){}
{ const _fD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='f3xview') return f3xDraw(d,X,Y,W,H); return _fD.apply(this,arguments); };
  const _fR=recomputeExtras; recomputeExtras=function(){ _fR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='f3x'&&stVis(Z)) scriptBoxes.push({type:'f3xview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('f3x strategy failed',err); window.__f3xErr=err; }


// =====================================================================================
// [lpo] STRATEGY · "Liquidity Pools & Order Blocks"   (self-contained: every name starts with lpo / LPO)
// Swing highs / lows are liquidity pools: a line runs from the swing until a candle closes through it (taken), or to the
// right edge while it is still untouched. When a pool is taken, the last opposite candle before the break becomes an
// Order Block (bullish after a swing high is broken, bearish after a swing low is broken). A block is drawn as a box
// until price closes through its far side (mitigated). No BUY / SELL signals. Hooks: STRATS.lpo + draw + recomputeExtras.
// =====================================================================================
try{
function lpoCompute(all,Z){
  const off=Math.max(0,all.length-3000), a=all.slice(off), n=a.length, L=Math.max(2,Math.round(Z.lpL)||10); if(n<L*2+6) return null;
  const isPivH=new Array(n).fill(false), isPivL=new Array(n).fill(false);
  for(let t=L;t<n-L;t++){
    let hh=-Infinity,ll=Infinity; for(let j=t-L;j<=t+L;j++){ if(a[j].high>hh) hh=a[j].high; if(a[j].low<ll) ll=a[j].low; }
    let H=a[t].high===hh, Lw=a[t].low===ll;
    if(H){ for(let j=t-L;j<t;j++) if(a[j].high>=hh){ H=false; break; } }
    if(Lw){ for(let j=t-L;j<t;j++) if(a[j].low<=ll){ Lw=false; break; } }
    isPivH[t]=H; isPivL[t]=Lw;
  }
  const hp=[], lp=[], obs=[], seen={}; let actH=[], actL=[];
  for(let t=0;t<n;t++){
    const p=t-L; // pivot at p is confirmed on bar t
    if(p>=0&&isPivH[p]){ const o={i:p,v:a[p].high,end:null,hi:true}; hp.push(o); actH.push(o); }
    if(p>=0&&isPivL[p]){ const o={i:p,v:a[p].low,end:null,hi:false}; lp.push(o); actL.push(o); }
    const cl=a[t].close;
    // swing highs taken by a close above -> bullish order block
    let brokeH=null; actH=actH.filter(o=>{ if(t>o.i+L&&cl>o.v){ o.end=t; if(!brokeH||o.i<brokeH.i) brokeH=o; return false; } return true; });
    if(brokeH){ let k=-1; for(let j=t-1;j>=brokeH.i;j--){ if(a[j].close<a[j].open){ k=j; break; } }
      if(k>=0&&!seen['u'+k]){ seen['u'+k]=1; obs.push({i:k,t0:t,up:true,hi:a[k].high,lo:a[k].low,mit:null}); } }
    let brokeL=null; actL=actL.filter(o=>{ if(t>o.i+L&&cl<o.v){ o.end=t; if(!brokeL||o.i<brokeL.i) brokeL=o; return false; } return true; });
    if(brokeL){ let k=-1; for(let j=t-1;j>=brokeL.i;j--){ if(a[j].close>a[j].open){ k=j; break; } }
      if(k>=0&&!seen['d'+k]){ seen['d'+k]=1; obs.push({i:k,t0:t,up:false,hi:a[k].high,lo:a[k].low,mit:null}); } }
  }
  obs.forEach(b=>{ for(let j=b.t0+1;j<n;j++){ if(b.up?a[j].close<b.lo:a[j].close>b.hi){ b.mit=j; break; } } });
  return {off,n,hp,lp,obs};
}
const lpoCache={};
function lpoGet(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,Z.lpL].join('|');
  if(!lpoCache[Z.sid]||lpoCache[Z.sid].k!==key) lpoCache[Z.sid]={k:key,r:lpoCompute(c,Z)}; return lpoCache[Z.sid].r; }
const lpoP=v=>{ const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=100?2:a>=1?4:6}); };
function lpoRgb(h){ const v=parseInt(String(h).replace('#',''),16)||0; return [v>>16&255,v>>8&255,v&255]; }
function lpoDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<40) return; const r=lpoGet(c,Z); if(!r) return; const {off,n}=r;
  const xl=X(n-1+off); if(xl==null) return; const bw=(X(n-2+off)!=null&&xl-X(n-2+off)>0)?xl-X(n-2+off):6;
  const xe=Math.min(xl+Math.max(0,Math.round(Z.lpExt)||10)*bw,W-4), pc=Z.lpPool||'#f5a623', bu=Z.lpBull||'#2dd4a7', be=Z.lpBear||'#ff5d7a';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.textBaseline='middle'; cx.textAlign='left'; cx.font='10px system-ui';
  // order blocks
  if(Z.lpOB!==false){ const list=r.obs.filter(b=>!(Z.lpHide&&b.mit!=null)).slice(-Math.max(0,Math.round(Z.lpO)||0));
    list.forEach(b=>{ const x0=X(b.i+off); if(x0==null) return; const x1=b.mit!=null?X(b.mit+off):xe; if(x1==null) return;
      const yt=Y(b.hi), yb=Y(b.lo); if(yt==null||yb==null) return; const q=lpoRgb(b.up?bu:be), col='rgb('+q[0]+','+q[1]+','+q[2]+')';
      cx.fillStyle='rgba('+q[0]+','+q[1]+','+q[2]+','+(b.mit!=null?.08:.2)+')'; cx.fillRect(x0,yt,x1-x0,yb-yt);
      cx.strokeStyle=col; cx.lineWidth=b.mit!=null?1:1.6; cx.setLineDash(b.mit!=null?[4,3]:[]); cx.strokeRect(x0,yt,x1-x0,yb-yt); cx.setLineDash([]);
      if(Z.lpLab!==false){ cx.fillStyle=col; const ty=b.up?yb+9:yt-9; cx.fillText((b.up?'Bullish':'Bearish')+' Order Block'+(b.mit!=null?' (mitigated)':''),x0,ty); } }); }
  // liquidity pools
  if(Z.lpPl!==false){ const N=Math.max(0,Math.round(Z.lpN)||0); cx.lineWidth=1.6; cx.strokeStyle=pc;
    [r.hp.slice(-N),r.lp.slice(-N)].forEach((arr,g)=>{ arr.forEach(o=>{ const x0=X(o.i+off); if(x0==null) return; const x1=o.end!=null?X(o.end+off):xe; if(x1==null) return; const y=Y(o.v); if(y==null) return;
        cx.globalAlpha=o.end!=null?.55:1; cx.setLineDash(o.end!=null?[6,4]:[]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); cx.setLineDash([]);
        if(Z.lpLab!==false){ cx.fillStyle=pc; cx.fillText('Liquidity Pool'+(o.end!=null?' \u00b7 taken':''),x0+2,g===0?y-8:y+8); } cx.globalAlpha=1; }); }); }
  cx.globalAlpha=1; cx.restore();
}
STRATS.lpo={label:'Liquidity Pools & Order Blocks \u00b7 swing liquidity lines, taken pools and bullish / bearish order blocks',short:'Liquidity Pools & Order Blocks',own:true,
  defs:{limit:false,useSl:false,lpL:10,lpN:4,lpO:4,lpExt:10,lpPl:true,lpOB:true,lpHide:false,lpLab:true,lpPool:'#f5a623',lpBull:'#2dd4a7',lpBear:'#ff5d7a'},
  inputs:(b,d)=>{
    fld(b,d,'lpL','num','Swing length (bars each side)',{min:2,max:100,step:1});
    fld(b,d,'lpN','num','Liquidity pools to show (each side)',{min:0,max:30,step:1}); fld(b,d,'lpO','num','Order blocks to show',{min:0,max:30,step:1});
    fld(b,d,'lpExt','num','Extend boxes / lines to the right (bars)',{min:0,max:200,step:1});
    fld(b,d,'lpPl','chk','Show liquidity pools'); fld(b,d,'lpOB','chk','Show order blocks'); fld(b,d,'lpHide','chk','Hide mitigated order blocks'); fld(b,d,'lpLab','chk','Show labels');
    fld(b,d,'lpPool','col','Liquidity pool colour'); fld(b,d,'lpBull','col','Bullish order block colour'); fld(b,d,'lpBear','col','Bearish order block colour'); },
  sig:()=>0};
try{ DESC.lpo='Strategy \u00b7 swing liquidity pools (taken / untouched) with bullish and bearish order block boxes'; }catch(e){}
{ const _fD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='lpoview') return lpoDraw(d,X,Y,W,H); return _fD.apply(this,arguments); };
  const _fR=recomputeExtras; recomputeExtras=function(){ _fR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='lpo'&&stVis(Z)) scriptBoxes.push({type:'lpoview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('lpo strategy failed',err); window.__lpoErr=err; }


// =====================================================================================
// [sdx] STRATEGY · "Supply Demand Legs & Entry Zones"   (self-contained: every name starts with sdx / SDX)
// Big swing pivots become Supply (swing high) / Demand (swing low) zones (red). The leg between two zones is a blue box.
// Inside each leg the first valid pullback base is the green Entry Zone and the leg gets a green check; a leg that ran
// straight with no valid pullback gets a red cross (no entry). No BUY / SELL signals. Hooks: STRATS.sdx + draw + recomputeExtras.
// =====================================================================================
try{
function sdxCompute(all,Z){
  const off=Math.max(0,all.length-3000), a=all.slice(off), n=a.length, L=Math.max(3,Math.round(Z.sdL)||20), l=Math.max(2,Math.round(Z.sdI)||5), R=(Number(Z.sdR)||25)/100;
  if(n<L*2+10) return null;
  const atr=i=>{ let s=0,k=0; for(let j=Math.max(1,i-13);j<=i;j++){ s+=Math.max(a[j].high-a[j].low,Math.abs(a[j].high-a[j-1].close),Math.abs(a[j].low-a[j-1].close)); k++; } return k?s/k:(a[i].high-a[i].low); };
  const piv=(len,H)=>{ const o=new Array(n).fill(false); for(let t=len;t<n-len;t++){ let ex=H?-Infinity:Infinity; for(let j=t-len;j<=t+len;j++){ const v=H?a[j].high:a[j].low; if(H?v>ex:v<ex) ex=v; }
      const me=H?a[t].high:a[t].low; if(me!==ex) continue; let ok=true; for(let j=t-len;j<t;j++){ if(H?a[j].high>=ex:a[j].low<=ex){ ok=false; break; } } o[t]=ok; } return o; };
  const bh=piv(L,true), bl=piv(L,false), ih=piv(l,true), il=piv(l,false), pv=[];
  for(let t=L;t<n-L;t++){ if(bh[t]===bl[t]) continue; const p={i:t,v:bh[t]?a[t].high:a[t].low,h:bh[t]}, last=pv[pv.length-1];
    if(last&&last.h===p.h){ if((p.h&&p.v>last.v)||(!p.h&&p.v<last.v)) pv[pv.length-1]=p; } else pv.push(p); }
  const th=Math.max(0.1,Number(Z.sdT)||2);
  pv.forEach(p=>{ const w=atr(p.i)*th; if(p.h){ p.top=p.v; p.bot=p.v-w; } else { p.bot=p.v; p.top=p.v+w; } });
  const legs=[];
  for(let k=1;k<pv.length;k++){ const A=pv[k-1], B=pv[k], up=!A.h; let top,bot;
    if(up){ bot=A.top; top=B.bot; } else { top=A.bot; bot=B.top; }
    if(top<=bot){ top=Math.max(A.v,B.v); bot=Math.min(A.v,B.v); }
    let g=null;
    if(up){ for(let q=A.i+1;q<B.i&&!g;q++){ if(!il[q]) continue; let hh=-1; for(let t=A.i+1;t<q;t++) if(ih[t]&&(hh<0||a[t].high>a[hh].high)) hh=t; if(hh<0) continue;
        const imp=a[hh].high-A.v; if(imp<=0||a[q].low<=A.v) continue; if((a[hh].high-a[q].low)/imp>=R){ let mx=-Infinity; for(let t=hh;t<=q;t++) mx=Math.max(mx,a[t].close,a[t].open);
          g={x0:hh,x1:Math.min(B.i,q+l),top:Math.min(mx,a[hh].high),bot:a[q].low}; } } }
    else { for(let q=A.i+1;q<B.i&&!g;q++){ if(!ih[q]) continue; let hh=-1; for(let t=A.i+1;t<q;t++) if(il[t]&&(hh<0||a[t].low<a[hh].low)) hh=t; if(hh<0) continue;
        const imp=A.v-a[hh].low; if(imp<=0||a[q].high>=A.v) continue; if((a[q].high-a[hh].low)/imp>=R){ let mn=Infinity; for(let t=hh;t<=q;t++) mn=Math.min(mn,a[t].close,a[t].open);
          g={x0:hh,x1:Math.min(B.i,q+l),top:a[q].high,bot:Math.max(mn,a[hh].low)}; } } }
    legs.push({A,B,up,top,bot,g});
  }
  return {off,n,pv,legs};
}
const sdxCache={};
function sdxGet(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,Z.sdL,Z.sdI,Z.sdR,Z.sdT].join('|');
  if(!sdxCache[Z.sid]||sdxCache[Z.sid].k!==key) sdxCache[Z.sid]={k:key,r:sdxCompute(c,Z)}; return sdxCache[Z.sid].r; }
function sdxRgb(h){ const v=parseInt(String(h).replace('#',''),16)||0; return [v>>16&255,v>>8&255,v&255]; }
function sdxBox(x0,y0,x1,y1,hex,fa,lw,dash){ const q=sdxRgb(hex), t=Math.min(y0,y1), h=Math.abs(y1-y0), l=Math.min(x0,x1), w=Math.abs(x1-x0);
  cx.fillStyle='rgba('+q[0]+','+q[1]+','+q[2]+','+fa+')'; cx.fillRect(l,t,w,h); cx.strokeStyle='rgba('+q[0]+','+q[1]+','+q[2]+',.85)'; cx.lineWidth=lw; cx.setLineDash(dash||[]); cx.strokeRect(l,t,w,h); cx.setLineDash([]); }
function sdxMark(x,y,ok,col,s){ s=Math.max(2,Number(s)||5); cx.strokeStyle=col; cx.lineWidth=Math.max(1.5,s*.4); cx.lineCap='round'; cx.lineJoin='round'; cx.beginPath();
  if(ok){ cx.moveTo(x-s,y); cx.lineTo(x-s*.25,y+s*.85); cx.lineTo(x+s*1.15,y-s); } else { cx.moveTo(x-s,y-s); cx.lineTo(x+s,y+s); cx.moveTo(x+s,y-s); cx.lineTo(x-s,y+s); }
  cx.stroke(); cx.lineCap='butt'; }
function sdxDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<60) return; const r=sdxGet(c,Z); if(!r) return; const {off,n}=r, M=Math.max(1,Math.round(Z.sdW)||8);
  const sc=Z.sdSup||'#f5a623', dc=Z.sdDem||'#a78bfa', rc=Z.sdSell||'#ff5d7a', lc=Z.sdLeg||'#4f8cff', gc=Z.sdEntry||'#2dd4a7', legs=r.legs.slice(-Math.max(0,Math.round(Z.sdN)||0));
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.textBaseline='middle'; cx.textAlign='left'; cx.font=(Math.max(6,Number(Z.sdFs)||7))+'px system-ui';
  // blue legs
  legs.forEach(g=>{ const x0=X(g.A.i+off), x1=X(g.B.i+off), y0=Y(g.top), y1=Y(g.bot); if(x0==null||x1==null||y0==null||y1==null) return; sdxBox(x0,y0,x1,y1,lc,.1,1); });
  // red supply / demand zones
  const done={}; legs.forEach(g=>[g.A,g.B].forEach(p=>{ if(done[p.i]) return; done[p.i]=1;
    const x0=X(Math.max(0,p.i-M)+off), x1=X(Math.min(n-1,p.i+M)+off), y0=Y(p.top), y1=Y(p.bot); if(x0==null||x1==null||y0==null||y1==null) return;
    const zc=p.h?sc:dc; sdxBox(x0,y0,x1,y1,zc,.16,1.2); if(Z.sdLab!==false){ cx.fillStyle=zc; cx.fillText(p.h?'Supply':'Demand',x0+3,p.h?Math.min(y0,y1)-8:Math.max(y0,y1)+8); } }));
  // green entry zones + checks / crosses
  legs.forEach(g=>{ if(g.g){ const e=g.g, ec=g.up?gc:rc, x0=X(e.x0+off), x1=X(e.x1+off), y0=Y(e.top), y1=Y(e.bot); if(x0==null||x1==null||y0==null||y1==null) return;
      sdxBox(x0,y0,x1,y1,ec,.28,1.4); if(Z.sdLab!==false){ cx.fillStyle=ec; cx.fillText(g.up?'Buy entry':'Sell entry',x0+3,Math.min(y0,y1)-8); }
      if(Z.sdMk!==false) sdxMark(Math.max(x0,x1)+Math.max(2,Number(Z.sdMs)||5)+6,(y0+y1)/2,true,ec,Z.sdMs);
    } else if(Z.sdMk!==false){ const x0=X(g.A.i+off), x1=X(g.B.i+off), y0=Y(g.top), y1=Y(g.bot); if(x0==null||x1==null||y0==null||y1==null) return; sdxMark((x0+x1)/2,(y0+y1)/2,false,rc,Z.sdMs); } });
  cx.restore();
}
STRATS.sdx={label:'Supply Demand Legs & Entry Zones \u00b7 supply / demand zones, swing legs, pullback entry zones with check / cross',short:'Supply Demand Legs & Entry Zones',own:true,
  defs:{limit:false,useSl:false,sdL:20,sdI:5,sdR:25,sdT:2,sdW:8,sdN:4,sdLab:true,sdMk:true,sdMs:5,sdFs:7,sdSup:'#f5a623',sdDem:'#a78bfa',sdSell:'#ff5d7a',sdLeg:'#4f8cff',sdEntry:'#2dd4a7'},
  inputs:(b,d)=>{
    fld(b,d,'sdL','num','Big swing length (bars each side)',{min:3,max:200,step:1}); fld(b,d,'sdI','num','Pullback swing length (bars each side)',{min:2,max:50,step:1});
    fld(b,d,'sdR','num','Minimum pullback % of the move',{min:5,max:90,step:1}); fld(b,d,'sdT','num','Zone thickness (x ATR)',{min:0.1,max:20,step:0.1});
    fld(b,d,'sdW','num','Zone half-width (bars)',{min:1,max:100,step:1}); fld(b,d,'sdN','num','Legs to show',{min:0,max:30,step:1});
    fld(b,d,'sdLab','chk','Show labels'); fld(b,d,'sdFs','num','Label text size',{min:6,max:16,step:1}); fld(b,d,'sdMk','chk','Show check / cross marks'); fld(b,d,'sdMs','num','Check / cross size',{min:2,max:20,step:1});
    fld(b,d,'sdSup','col','Supply zone colour'); fld(b,d,'sdDem','col','Demand zone colour'); fld(b,d,'sdLeg','col','Leg colour'); fld(b,d,'sdEntry','col','Buy entry colour'); fld(b,d,'sdSell','col','Sell entry colour'); },
  sig:()=>0};
try{ DESC.sdx='Strategy \u00b7 supply / demand zones, swing legs and pullback entry zones with check / cross'; }catch(e){}
{ const _fD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='sdxview') return sdxDraw(d,X,Y,W,H); return _fD.apply(this,arguments); };
  const _fR=recomputeExtras; recomputeExtras=function(){ _fR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='sdx'&&stVis(Z)) scriptBoxes.push({type:'sdxview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('sdx strategy failed',err); window.__sdxErr=err; }


// =====================================================================================
// [ard] STRATEGY · "Auto Range Detector" (QuantAlgo port)   (self-contained: every name starts with ard / ARD)
// Scans 1x / 2x / 3x windows each bar for a compressed, rotating, flat, well-touched band (percentile / absolute / body
// boundaries), anchors the box back over earlier history, confirms it after N bars, ends it on a break (close or wick,
// ATR buffer), absorbs small overshoots, and revives it when a break fails (deviation). Draws shaded boxes with
// equilibrium + quartile lines, range tags, breakout and deviation markers.
// Optional BUY / SELL on confirmed breakouts (off by default - the Pine script itself only has alerts).
// Hooks: STRATS.ard + draw + recomputeExtras. Nothing existing is edited.
// =====================================================================================
try{
const ARD_SCAN_KEYS=['ardBase','ardBasis','ardPct','ardAtr','ardComp','ardCal','ardRot','ardTouchB','ardMinT','ardTol','ardDrift','ardCont'];
const ARD_ALL_KEYS=ARD_SCAN_KEYS.concat(['ardScale','ardTiming','ardAnch','ardAnchLb','ardMinBars','ardAbsorb','ardOver','ardConfirm','ardBuf','ardMerge','ardDev','ardCool','ardAge','ardBrk','ardDevM']);
const ARD_PRESETS={Classic:['#00ff00','#ff0000'],Aqua:['#00d4ff','#ff8c00'],Cosmic:['#49ffce','#9932cc'],Cyber:['#00cccc','#ff6600'],Neon:['#ffff00','#ff00ff']};
function ardRma(a,len){ const o=new Array(a.length).fill(null); let s=0,prev=null; for(let i=0;i<a.length;i++){ if(prev==null){ s+=a[i]; if(i===len-1){ prev=s/len; o[i]=prev; } } else { prev=(prev*(len-1)+a[i])/len; o[i]=prev; } } return o; }
function ardPctl(arr,p){ const s=arr.slice().sort((a,b)=>a-b), ix=p/100*(s.length-1), lo=Math.floor(ix), hi=Math.ceil(ix); return s[lo]+(s[hi]-s[lo])*(ix-lo); }
// ---- one window on one bar -> qualified? + boundaries + compression
function ardScanBar(c,i,atrv,hist,len,Z){
  if(i-len<0) return {q:false,top:0,bot:0,comp:99};
  let top=-Infinity,bot=Infinity;
  if(Z.ardBasis==='Percentile band'){ const hs=[],ls=[]; for(let j=i-len+1;j<=i;j++){ hs.push(c[j].high); ls.push(c[j].low); } top=ardPctl(hs,Z.ardPct); bot=ardPctl(ls,100-Z.ardPct); }
  else for(let j=i-len+1;j<=i;j++){ const x=c[j], h=Z.ardBasis==='Body extremes'?Math.max(x.open,x.close):x.high, l=Z.ardBasis==='Body extremes'?Math.min(x.open,x.close):x.low; if(h>top) top=h; if(l<bot) bot=l; }
  const ctx=atrv!=null&&atrv>0; if(!ctx) return {q:false,top,bot,comp:99};
  const band=top-bot, comp=band>0?band/(atrv*Math.sqrt(len)):99, cap=i<1?Z.ardCal:Math.max(1,Math.min(Z.ardCal,i-Z.ardAtr));
  if(i-cap<0||band<=0) return {q:false,top,bot,comp};
  let cnt=0; for(let j=i-cap;j<i;j++) if(hist[j]<=comp) cnt++; const rank=100*cnt/cap;
  if(rank>Z.ardComp||!(i>len+5)) return {q:false,top,bot,comp};
  let sxy=0; const xm=(len-1)/2; for(let k=0;k<len;k++) sxy+=(k-xm)*c[i-len+1+k].close; const slope=sxy/(len*(len*len-1)/12), drift=Math.abs(slope)*len/band;
  if(drift>Z.ardDrift) return {q:false,top,bot,comp};
  const mid=(top+bot)/2, tol=Z.ardTol*atrv, wk=Z.ardTouchB==='Wick reaches'; let cr=0,ht=0,hb=0,ct=0;
  for(let k=0;k<len;k++){ const x=c[i-k], pv=c[i-k-1]; if((x.close>mid)!==(pv.close>mid)) cr++;
    if(wk?x.high>=top-tol:x.close>=top-tol) ht++; if(wk?x.low<=bot+tol:x.close<=bot+tol) hb++; if(x.close<=top&&x.close>=bot) ct++; }
  const q=cr>=Math.max(3,Math.round(Z.ardRot*len))&&ht>=Z.ardMinT&&hb>=Z.ardMinT&&ct/len>=Z.ardCont;
  return {q,top,bot,comp};
}
function ardPrep(cl,Z){
  const n=cl.length, L=Math.max(8,Math.round(Z.ardBase)||20), lens=[L,L*2,L*3], tr=cl.map((x,i)=>i?Math.max(x.high-x.low,Math.abs(x.high-cl[i-1].close),Math.abs(x.low-cl[i-1].close)):x.high-x.low), atr=ardRma(tr,Math.max(14,Math.round(Z.ardAtr)||200));
  const hist=lens.map(()=>new Array(n).fill(99)), res=lens.map(()=>new Array(n).fill(null));
  for(let i=0;i<n;i++) lens.forEach((len,k)=>{ const r=ardScanBar(cl,i,atr[i],hist[k],len,Z); hist[k][i]=r.comp; res[k][i]=r; });
  return {atr,hist,res,lens,tr};
}
const ardPrepCache={};
function ardPrepGet(cl,Z){ const l=cl[cl.length-1], key=[cl.length,cl[0].time,l.time,l.high,l.low,l.close,ARD_SCAN_KEYS.map(k=>Z[k]).join(',')].join('|');
  if(!ardPrepCache[Z.sid]||ardPrepCache[Z.sid].k!==key) ardPrepCache[Z.sid]={k:key,r:ardPrep(cl,Z)}; return ardPrepCache[Z.sid].r; }
function ardMachine(c,atr,res,Z){
  const n=c.length, L=Math.max(8,Math.round(Z.ardBase)||20), wick=Z.ardConfirm==='Wick beyond', boxes=[], devs=[], sigMap=new Map();
  let cur=null, dormant=false, dSince=0, dDir=0, dPrice=0, dBar=0, cool=0;
  const anchorSpan=(t,win,top,bot,tol)=>{ let span=win; if(Z.ardAnch==='Extend to containment'){ const limit=Math.min(Z.ardAnchLb,t), allowed=Math.max(2,Math.round((1-Z.ardCont)*win)); let out=0,off=0;
      while(off<limit&&out<=allowed){ const x=c[t-off], cin=x.close<=top&&x.close>=bot, full=cin&&x.high<=top+tol&&x.low>=bot-tol;
        if(cin){ out=Math.max(0,out-1); if(full&&off+1>=win) span=off+1; } else out++; off++; } } return span; };
  for(let t=0;t<n;t++){
    const b=c[t], a=atr[t];
    if(cool>0) cool--;
    // ---- scan result for this bar
    const qa=res[0][t]&&res[0][t].q, qb=res[1][t]&&res[1][t].q, qc=res[2][t]&&res[2][t].q;
    const uD=Z.ardScale!=='Base only'&&qb, uT=Z.ardScale==='Base + 2x + 3x'&&qc, qual=qa||uD||uT, k=uT?2:uD?1:0, sl=L*(k+1), st=qual?res[k][t]:null;
    // ---- open
    if(!cur&&!dormant&&cool<=0&&qual){ const ab=anchorSpan(t,sl,st.top,st.bot,Z.ardTol*a);
      cur={left:t-ab+1,right:t,top:st.top,bot:st.bot,opened:t,conf:false,state:'live',held:0,h:0,brk:null}; boxes.push(cur); }
    // ---- active
    const active=cur&&!dormant&&cur.state==='live';
    if(active){ const bo=Z.ardBuf*a, ao=Z.ardOver*a;
      if(Z.ardAbsorb&&!wick&&b.close<=cur.top&&b.close>=cur.bot){ if(b.high>cur.top&&b.high<=cur.top+ao) cur.top=b.high; if(b.low<cur.bot&&b.low>=cur.bot-ao) cur.bot=b.low; }
      const bu=wick?b.high>cur.top+bo:b.close>cur.top+bo, bd=wick?b.low<cur.bot-bo:b.close<cur.bot-bo, aged=Z.ardAge>0&&t-cur.opened+1>=Z.ardAge;
      if(bu||bd||aged){ const dir=bu?1:bd?-1:0, held=dir?t-cur.left:t-cur.left+1, hh=cur.bot!==0?(cur.top-cur.bot)/cur.bot*100:0, hold=Z.ardMerge&&dir!==0&&cur.conf;
        if(cur.conf){ cur.right=t; cur.state=dir===1?'up':dir===-1?'down':'aged'; cur.held=held; cur.h=hh; if(Z.ardBrk!==false&&dir) cur.brk={t,dir}; if(dir) sigMap.set(t,dir); }
        else { boxes.splice(boxes.indexOf(cur),1); }
        if(hold){ dormant=true; dSince=t; dDir=dir; dPrice=dir===1?b.high:b.low; dBar=t; } else cur=null;
        cool=Z.ardCool; }
      else cur.conf=t-cur.left+1>=Z.ardMinBars; }
    // ---- dormant (waiting for a failed break to come back inside)
    if(dormant){ if(dDir===1&&b.high>dPrice){ dPrice=b.high; dBar=t; } if(dDir===-1&&b.low<dPrice){ dPrice=b.low; dBar=t; }
      const re=dDir===1?b.close<=cur.top:b.close>=cur.bot, ex=t-dSince>=Z.ardDev;
      if(re&&t>dSince){ if(Z.ardDevM!==false) devs.push({t:dBar,price:dPrice,dir:dDir}); cur.brk=null; cur.state='live'; cur.conf=true; dormant=false; dDir=0; cool=0; sigMap.delete(dSince); }
      else if(ex){ dormant=false; dDir=0; cur=null; } }
    // ---- live box follows the current bar
    if(cur&&!dormant&&cur.state==='live'){ cur.right=t; cur.held=t-cur.left+1; cur.h=cur.bot!==0?(cur.top-cur.bot)/cur.bot*100:0; }
  }
  return {boxes,devs,sigMap};
}
function ardGet(call,Z,live){
  const cl=live?call.slice(0,-1):call; if(cl.length<80) return null; const off=Math.max(0,cl.length-3000), cc=cl.slice(off), P=ardPrepGet(cc,Z);
  let c=cc, atr=P.atr, res=P.res;
  if(live){ const lv=call[call.length-1]; c=cc.concat([lv]); const n=cc.length, ATRL=Math.max(14,Math.round(Z.ardAtr)||200), pa=P.atr[n-1], tr=Math.max(lv.high-lv.low,Math.abs(lv.high-cc[n-1].close),Math.abs(lv.low-cc[n-1].close)), na=pa!=null?(pa*(ATRL-1)+tr)/ATRL:null;
    atr=P.atr.concat([na]); const hist=P.hist.map(h=>h.concat([99]));
    res=P.res.map((r,k)=>{ const x=ardScanBar(c,n,na,hist[k],P.lens[k],Z); return r.concat([x]); }); }
  const r=ardMachine(c,atr,res,Z); r.off=off+0; r.n=c.length; return r;
}
const ardMCache={};
function ardRun(call,Z,live){ const l=call[call.length-1], key=[call.length,call[0].time,l.time,l.high,l.low,l.close,l.volume,live?1:0,ARD_ALL_KEYS.map(k=>Z[k]).join(',')].join('|');
  const m=ardMCache[Z.sid+(live?'L':'C')]; if(m&&m.k===key) return m.r; const r=ardGet(call,Z,live); ardMCache[Z.sid+(live?'L':'C')]={k:key,r}; return r; }
const ardPT=v=>Number(v.toFixed(2))+'%';
function ardRgba(h,a){ const v=parseInt(h.replace('#',''),16); return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; }
function ardTxt(h){ const v=parseInt(h.replace('#',''),16), f=x=>{ x/=255; return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4); }; return .2126*f(v>>16&255)+.7152*f(v>>8&255)+.0722*f(v&255)>.179?'#000':'#fff'; }
function ardDraw(d,X,Y,W,H){
  const Z=d.o, call=candles; if(!call||call.length<100) return; const live=Z.ardTiming==='Live bar', r=ardRun(live?call:call.slice(0,-1),Z,live); if(!r) return;
  const pre=ARD_PRESETS[Z.ardPreset], bull=pre?pre[0]:(Z.ardBull||'#00ffaa'), bear=pre?pre[1]:(Z.ardBear||'#ff0000'), rng=Z.ardRange||'#787b86', fs=({Tiny:8,Small:9.5,Normal:11,Large:13})[Z.ardSize]||9.5;
  const steps=Math.max(1,Math.round(Z.ardGrad)||4), off=r.off;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.textBaseline='middle'; cx.textAlign='center'; cx.font=fs+'px system-ui';
  const pill=(txt,x,y,bg,up)=>{ const w=cx.measureText(txt).width+10, h=fs+6, yy=up?y+4:y-4-h; cx.globalAlpha=.9; cx.fillStyle=bg; cx.fillRect(x-w/2,yy,w,h); cx.globalAlpha=1; cx.fillStyle=ardTxt(bg); cx.fillText(txt,x,yy+h/2+.5); };
  r.boxes.slice(-60).forEach(bx=>{ const x0=X(bx.left+off), x1=X(bx.right+off), yT=Y(bx.top), yB=Y(bx.bot); if(x0==null||x1==null||yT==null||yB==null||x1<-10||x0>W+10) return;
    const base=bx.state==='up'?bull:bx.state==='down'?bear:rng, ret=bx.state!=='live', hgt=Math.abs(yB-yT), top=Math.min(yT,yB), w=Math.max(1,x1-x0);
    for(let i=0;i<steps;i++){ const cd=Math.abs((i+.5)/steps-.5)*2, tr=Math.min(99,Math.max(0,Z.ardFill+(1-cd)*10)); cx.globalAlpha=(100-tr)/100; cx.fillStyle=base; cx.fillRect(x0,top+hgt*i/steps,w,hgt/steps+.5); }
    cx.globalAlpha=ret?.65:(bx.conf?.65:.35); cx.strokeStyle=base; cx.lineWidth=1; cx.setLineDash(!ret&&!bx.conf?[5,4]:[]); cx.strokeRect(x0,top,w,Math.max(1,hgt)); cx.setLineDash([2,3]);
    const ln=(p,al)=>{ const y=Y(p); if(y==null) return; cx.globalAlpha=al; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke(); };
    if(Z.ardEq!==false) ln((bx.top+bx.bot)/2,.75); if(Z.ardQ!==false){ ln(bx.bot+(bx.top-bx.bot)*.25,.3); ln(bx.bot+(bx.top-bx.bot)*.75,.3); } cx.setLineDash([]);
    if(Z.ardLbl!==false){ cx.globalAlpha=.9; cx.fillStyle=base; const tx=(ret||bx.conf?'RANGE   ':'FORMING   ')+bx.held+' BARS   '+ardPT(bx.h); cx.fillText(tx,(x0+x1)/2,top-fs*.8); } });
  cx.globalAlpha=1;
  r.boxes.slice(-60).forEach(bx=>{ if(!bx.brk||Z.ardBrk===false) return; const x=X(bx.brk.t+off); if(x==null||x<-30||x>W+30) return; const b=call[bx.brk.t+off]; if(!b) return;
    const up=bx.brk.dir===1; pill((up?'\u25B2  ':'\u25BC  ')+'Breakout',x,Y(up?b.low:b.high),up?bull:bear,up); });
  r.devs.slice(-40).forEach(v=>{ const x=X(v.t+off); if(x==null||x<-30||x>W+30) return; const up=v.dir!==1; pill((v.dir===1?'\u2935  ':'\u2934  ')+'Deviation',x,Y(v.price),v.dir===1?bear:bull,up); });
  cx.globalAlpha=1; cx.restore();
}
STRATS.ard={label:'Auto Range Detector \u00b7 compressed, rotating, flat ranges with confirmed boxes, breakouts and deviations',short:'Auto Range Detector',own:true,
  defs:{limit:false,useSl:false,ardScale:'Base + 2x + 3x',ardBase:20,ardBasis:'Percentile band',ardPct:90,ardTiming:'Bar close',ardAtr:200,ardComp:40,ardCal:500,ardRot:.18,ardTouchB:'Wick reaches',ardMinT:2,ardTol:.10,ardDrift:.45,ardCont:.70,
    ardAnch:'Extend to containment',ardAnchLb:300,ardMinBars:10,ardAbsorb:true,ardOver:.25,ardConfirm:'Close beyond',ardBuf:.15,ardMerge:true,ardDev:10,ardCool:3,ardAge:0,
    ardPreset:'Custom',ardBull:'#00ffaa',ardBear:'#ff0000',ardRange:'#787b86',ardGrad:4,ardFill:88,ardEq:true,ardQ:true,ardLbl:true,ardBrk:true,ardDevM:true,ardSize:'Small',ardSig:false},
  inputs:(b,d)=>{
    fld(b,d,'ardScale','sel','Scan scaling',{opts:['Base only','Base + 2x','Base + 2x + 3x']}); fld(b,d,'ardBase','num','Base scan length',{min:8,max:100,step:1});
    fld(b,d,'ardBasis','sel','Boundary basis',{opts:['Percentile band','Absolute extremes','Body extremes']}); fld(b,d,'ardPct','num','Boundary percentile',{min:70,max:100,step:1});
    fld(b,d,'ardTiming','sel','Signal timing',{opts:['Bar close','Live bar']}); fld(b,d,'ardAtr','num','ATR length',{min:14,max:1000,step:1});
    fld(b,d,'ardComp','num','Compression percentile',{min:5,max:95,step:5}); fld(b,d,'ardCal','num','Calibration lookback',{min:100,max:2000,step:50});
    fld(b,d,'ardRot','num','Min rotation rate',{min:0.05,max:0.6,step:0.01}); fld(b,d,'ardTouchB','sel','Touch definition',{opts:['Wick reaches','Close reaches']});
    fld(b,d,'ardMinT','num','Min boundary touches',{min:1,max:10,step:1}); fld(b,d,'ardTol','num','Touch tolerance (ATR)',{min:0.02,max:1,step:0.02});
    fld(b,d,'ardDrift','num','Max drift',{min:0.05,max:2,step:0.05}); fld(b,d,'ardCont','num','Min containment',{min:0.4,max:1,step:0.05});
    fld(b,d,'ardAnch','sel','Range anchoring',{opts:['Scan window only','Extend to containment']}); fld(b,d,'ardAnchLb','num','Anchor lookback',{min:20,max:500,step:10});
    fld(b,d,'ardMinBars','num','Minimum range bars',{min:2,max:200,step:1}); fld(b,d,'ardAbsorb','chk','Absorb overshoot'); fld(b,d,'ardOver','num','Overshoot tolerance (ATR)',{min:0.05,max:1,step:0.05});
    fld(b,d,'ardConfirm','sel','Break confirmation',{opts:['Close beyond','Wick beyond']}); fld(b,d,'ardBuf','num','Breakout buffer (ATR)',{min:0,max:2,step:0.05});
    fld(b,d,'ardMerge','chk','Merge deviations'); fld(b,d,'ardDev','num','Deviation window (bars)',{min:1,max:100,step:1}); fld(b,d,'ardCool','num','Cooldown bars',{min:0,max:100,step:1}); fld(b,d,'ardAge','num','Max range age (0 = off)',{min:0,max:2000,step:10});
    fld(b,d,'ardPreset','sel','Colour preset',{opts:['Classic','Aqua','Cosmic','Cyber','Neon','Custom']}); fld(b,d,'ardBull','col','Bullish colour (Custom)'); fld(b,d,'ardBear','col','Bearish colour (Custom)'); fld(b,d,'ardRange','col','Range colour');
    fld(b,d,'ardGrad','num','Gradient steps',{min:1,max:10,step:1}); fld(b,d,'ardFill','num','Fill transparency',{min:50,max:100,step:1});
    fld(b,d,'ardEq','chk','Show equilibrium line'); fld(b,d,'ardQ','chk','Show quartile levels'); fld(b,d,'ardLbl','chk','Show range labels'); fld(b,d,'ardBrk','chk','Show breakout markers'); fld(b,d,'ardDevM','chk','Show deviation markers');
    fld(b,d,'ardSize','sel','Label text size',{opts:['Tiny','Small','Normal','Large']}); fld(b,d,'ardSig','chk','BUY / SELL on confirmed breakouts (up = BUY, down = SELL)'); },
  sig:(c,i,n,Z)=>{ if(!Z.ardSig||c.length<100) return 0; const r=ardRun(c,Z,false); if(!r) return 0; return r.sigMap.get(i-r.off)||0; }};
try{ DESC.ard='Strategy \u00b7 compressed flat ranges: confirmed boxes, breakouts, deviations, equilibrium + quartiles'; }catch(e){}
{ const _aD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='ardview') return ardDraw(d,X,Y,W,H); return _aD.apply(this,arguments); };
  const _aR=recomputeExtras; recomputeExtras=function(){ _aR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='ard'&&stVis(Z)) scriptBoxes.push({type:'ardview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('ard strategy failed',err); window.__ardErr=err; }


// =====================================================================================
// [sfa] STRATEGY · "Swing Fibonacci Arcs & Volume Profile" (BigBeluga port)   (self-contained: every name starts with sfa / SFA)
// Swing structure from N-bar highs / lows (confirmed swing line + dashed real-time line), Fibonacci arcs (half ellipses,
// 23.6% .. 100%) anchored at the swing start and scaled by the real-time swing, plus a volume profile of the current swing
// with its POC line. The Pine script has no trade signals, so this adds no BUY / SELL. Hooks: STRATS.sfa + draw + recomputeExtras.
// =====================================================================================
try{
const SFA_LV=[['236',.236,'23.6%'],['382',.382,'38.2%'],['500',.5,'50.0%'],['618',.618,'61.8%'],['786',.786,'78.6%'],['100',1,'100.0%']];
function sfaCompute(all,Z){
  const off=Math.max(0,all.length-5000), a=all.slice(off), n=a.length, L=Math.max(5,Math.round(Z.sfaLen)||70); if(n<L+2) return null;
  let Hi=0,Hv=a[0].high,Li=0,Lv=a[0].low,dir=false,prevDir=false,swingPrice=null,swingIndex=null,conf=null,changeY=a[0].high,changeX=0;
  for(let t=0;t<n;t++){
    const pHi=Hi,pHv=Hv,pLi=Li,pLv=Lv; let isH=false,isL=false;
    if(t>=L-1){ let hh=-Infinity,ll=Infinity; for(let j=t-L+1;j<=t;j++){ if(a[j].high>hh) hh=a[j].high; if(a[j].low<ll) ll=a[j].low; } isH=a[t].high===hh; isL=a[t].low===ll; }
    if(isH){ Hi=t; Hv=a[t].high; dir=true; }
    if(isL){ Li=t; Lv=a[t].low; dir=false; }
    if(dir!==prevDir){
      if(dir){ changeY=a[t].high; swingPrice=Lv; swingIndex=Li; conf={x0:Li,y0:Lv,x1:pHi,y1:pHv,bull:false}; }
      else { changeY=a[t].low; swingIndex=Hi; swingPrice=Hv; conf={x0:Hi,y0:Hv,x1:pLi,y1:pLv,bull:true}; } }
    if(!dir&&isL&&a[t].low<=changeY){ changeY=a[t].low; changeX=t; }
    if(dir&&isH&&a[t].high>=changeY){ changeY=a[t].high; changeX=t; }
    prevDir=dir;
  }
  if(swingIndex==null) return null;
  // ATR(100) * 0.3 (Wilder), used for the profile row count
  let atr=null,rma=null,sum=0; for(let t=0;t<n;t++){ const pc=t?a[t-1].close:a[t].close, tr=t?Math.max(a[t].high-a[t].low,Math.abs(a[t].high-pc),Math.abs(a[t].low-pc)):a[t].high-a[t].low;
    if(t<100){ sum+=tr; if(t===99) rma=sum/100; } else rma=(rma*99+tr)/100; } if(rma!=null) atr=rma*0.3;
  // volume profile of the current swing
  let vp=null; const sb=swingIndex, eb=n-1;
  if(eb>sb){ let pMin=Infinity,pMax=-Infinity; for(let i=sb;i<=eb;i++){ if(a[i].low<pMin) pMin=a[i].low; if(a[i].high>pMax) pMax=a[i].high; }
    if(pMax>pMin){ const span=pMax-pMin, cA=atr!=null?atr:span/50, raw=span/(cA*0.5), rows=Math.trunc(Math.min(Math.max(raw,10),100)), rh=span/rows, bins=new Array(rows).fill(0), win=rh*2;
      for(let i=sb;i<=eb;i++){ const cl=a[i].close, v=(a[i].volume==null||isNaN(a[i].volume))?1:a[i].volume;
        for(let q=0;q<rows;q++){ const mid=pMin+q*rh+rh/2, dist=Math.abs(cl-mid); if(dist<=win){ bins[q]+=v*Math.max(0,1-dist/win); } } }
      let mx=0,poc=0; for(let q=0;q<rows;q++) if(bins[q]>mx){ mx=bins[q]; poc=q; }
      if(mx>0) vp={pMin,pMax,rows,rh,bins,mx,poc}; } }
  return {off,n,swingIndex,swingPrice,changeX,changeY,conf,vp};
}
const sfaCache={};
function sfaGet(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,l.volume,Z.sfaLen].join('|');
  if(!sfaCache[Z.sid]||sfaCache[Z.sid].k!==key) sfaCache[Z.sid]={k:key,r:sfaCompute(c,Z)}; return sfaCache[Z.sid].r; }
function sfaRgb(h){ const v=parseInt(String(h||'#000000').replace('#',''),16)||0; return [v>>16&255,v>>8&255,v&255]; }
const sfaRgba=(h,a)=>{ const q=sfaRgb(h); return 'rgba('+q[0]+','+q[1]+','+q[2]+','+a+')'; };
const sfaFmtV=v=>{ const a=Math.abs(v); return a>=1e9?(v/1e9).toFixed(2)+'B':a>=1e6?(v/1e6).toFixed(2)+'M':a>=1e3?(v/1e3).toFixed(2)+'K':v.toFixed(2); };
function sfaDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<80) return; const r=sfaGet(c,Z); if(!r) return;
  const off=r.off, si=r.swingIndex+off, sp=r.swingPrice, ci=r.changeX+off, cyP=r.changeY, last=r.n-1+off, cap=last+500;
  const xs=X(si), ys=Y(sp); if(xs==null||ys==null) return;
  const segs=Math.max(10,Math.min(100,Math.round(Z.sfaSegs)||25)), pw=Math.max(0,Math.round(Z.sfaPw)), fa=(100-Math.max(0,Math.min(100,Z.sfaFillT)))/100;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  // ---- arcs
  const rawDx=Math.abs(r.changeX-r.swingIndex), rawDy=Math.abs(cyP-sp), minDy=r.conf?Math.abs(r.conf.y0-r.conf.y1):0;
  if(rawDx>0&&rawDy>0){
    const dx=Math.max(rawDx,70)*(Z.sfaX||1.5), dy=Math.max(rawDy,minDy)*(Z.sfaY||1.5), up=cyP>=sp;
    const arc=(rx,ry)=>{ const p=[]; for(let i=0;i<=segs;i++){ const ang=Math.PI*i/segs, x=X(Math.min(si+rx*Math.cos(ang),cap)), y=Y(up?sp+ry*Math.sin(ang):sp-ry*Math.sin(ang)); if(x==null||y==null) return null; p.push([x,y]); } return p; };
    let prev=0; cx.font='12px system-ui'; cx.textAlign='center';
    SFA_LV.forEach(([k,f,txt])=>{ const rr=f; if(!Z['sfaS'+k]){ prev=rr; return; } const rx=dx*rr,ry=dy*rr, prx=dx*prev, pry=dy*prev, col=Z['sfaC'+k]||'#2962ff', outer=arc(rx,ry);
      if(outer){
        if(Z['sfaF'+k]){ const inner=arc(prx,pry); if(inner){ cx.beginPath(); outer.forEach((q,i)=>i?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1])); for(let i=inner.length-1;i>=0;i--) cx.lineTo(inner[i][0],inner[i][1]); cx.closePath(); cx.fillStyle=sfaRgba(col,fa); cx.fill(); } }
        if(pw>0){ cx.beginPath(); outer.forEach((q,i)=>i?cx.lineTo(q[0],q[1]):cx.moveTo(q[0],q[1])); cx.strokeStyle=col; cx.lineWidth=pw; cx.stroke(); }
        const ax=X(Math.min(si,cap)), ay=Y(up?sp+ry:sp-ry); if(ax!=null&&ay!=null){ cx.fillStyle=col; cx.textBaseline=up?'bottom':'top'; cx.fillText(txt,ax,up?ay-3:ay+3); } }
      prev=rr; });
  }
  // ---- volume profile + POC
  const vp=r.vp; if(Z.sfaVp&&vp){ const xe=X(last), maxW=Math.max(5,Math.round(Z.sfaVpW)||35), lo=sfaRgb(Z.sfaVpLo), hi=sfaRgb(Z.sfaVpHi); cx.lineWidth=1;
    for(let q=0;q<vp.rows;q++){ const v=vp.bins[q], bl=Math.round(v/vp.mx*maxW), xr=X(si+bl), yt=Y(vp.pMin+(q+1)*vp.rh), yb=Y(vp.pMin+q*vp.rh); if(xr==null||yt==null||yb==null) continue; const t=v/vp.mx, al=.2+.8*t,
        col='rgba('+Math.round(lo[0]+(hi[0]-lo[0])*t)+','+Math.round(lo[1]+(hi[1]-lo[1])*t)+','+Math.round(lo[2]+(hi[2]-lo[2])*t)+','+al.toFixed(2)+')';
      if(Z.sfaVpFill){ cx.fillStyle=col; cx.globalAlpha=.35; cx.fillRect(xs,Math.min(yt,yb),xr-xs,Math.abs(yb-yt)); cx.globalAlpha=1; }
      cx.strokeStyle=col; cx.strokeRect(xs+.5,Math.min(yt,yb)+.5,Math.max(0,xr-xs),Math.abs(yb-yt)); }
    if(Z.sfaPoc&&xe!=null){ const pocP=vp.pMin+(vp.poc+.5)*vp.rh, pl=Math.round(vp.bins[vp.poc]/vp.mx*maxW), x0=X(si+pl), py=Y(pocP);
      if(x0!=null&&py!=null){ cx.strokeStyle=Z.sfaPocCol||'#fdd835'; cx.lineWidth=2; cx.beginPath(); cx.moveTo(x0,py); cx.lineTo(xe,py); cx.stroke();
        cx.font='10px system-ui'; cx.textAlign='left'; cx.textBaseline='middle'; cx.fillStyle=Z.sfaPocCol||'#fdd835'; cx.fillText(sfaFmtV(vp.bins[vp.poc]),Math.min(xe+6,W-40),py); } } }
  // ---- swing lines
  if(r.conf){ const q=r.conf, x0=X(q.x0+off), x1=X(q.x1+off), y0=Y(q.y0), y1=Y(q.y1); if(x0!=null&&x1!=null&&y0!=null&&y1!=null){ cx.strokeStyle=q.bull?(Z.sfaBull||'#089981'):(Z.sfaBear||'#f23645'); cx.lineWidth=2; cx.beginPath(); cx.moveTo(x0,y0); cx.lineTo(x1,y1); cx.stroke(); } }
  { const x1=X(ci), y1=Y(cyP); if(x1!=null&&y1!=null){ cx.strokeStyle=Z.sfaRt||'#787b86'; cx.lineWidth=1; cx.setLineDash([5,4]); cx.beginPath(); cx.moveTo(xs,ys); cx.lineTo(x1,y1); cx.stroke(); cx.setLineDash([]); } }
  cx.globalAlpha=1; cx.restore();
}
STRATS.sfa={label:'Swing Fibonacci Arcs & Volume Profile \u00b7 swing structure, Fibonacci arcs, swing volume profile and POC',short:'Swing Fib Arcs & Volume Profile',own:true,
  defs:{limit:false,useSl:false,sfaLen:70,sfaBull:'#089981',sfaBear:'#f23645',sfaRt:'#787b86',sfaX:1.5,sfaY:1.5,sfaSegs:25,sfaPw:1,sfaFillT:80,
    sfaS236:true,sfaC236:'#2962ff',sfaF236:true, sfaS382:true,sfaC382:'#4caf50',sfaF382:false, sfaS500:true,sfaC500:'#089981',sfaF500:false,
    sfaS618:true,sfaC618:'#fdd835',sfaF618:false, sfaS786:true,sfaC786:'#ff9800',sfaF786:true, sfaS100:true,sfaC100:'#f23645',sfaF100:false,
    sfaVp:true,sfaVpW:35,sfaVpLo:'#2962ff',sfaVpHi:'#2962ff',sfaVpFill:false,sfaPoc:true,sfaPocCol:'#fdd835'},
  inputs:(b,d)=>{
    fld(b,d,'sfaLen','num','Swing structure (bars)',{min:5,max:200,step:1}); fld(b,d,'sfaBull','col','Bull swing colour'); fld(b,d,'sfaBear','col','Bear swing colour'); fld(b,d,'sfaRt','col','Real-time swing colour');
    fld(b,d,'sfaX','num','Arcs horizontal scale (X)',{min:.1,max:10,step:.1}); fld(b,d,'sfaY','num','Arcs vertical scale (Y)',{min:.1,max:10,step:.1});
    fld(b,d,'sfaSegs','num','Arc resolution (segments)',{min:10,max:100,step:1}); fld(b,d,'sfaPw','num','Arcs line width',{min:0,max:10,step:1}); fld(b,d,'sfaFillT','num','Fill transparency (%)',{min:0,max:100,step:5});
    SFA_LV.forEach(([k,f,txt])=>{ fld(b,d,'sfaS'+k,'chk','Show '+txt); fld(b,d,'sfaC'+k,'col',txt+' colour'); fld(b,d,'sfaF'+k,'chk',txt+' fill'); });
    fld(b,d,'sfaVp','chk','Show volume profile'); fld(b,d,'sfaVpW','num','Profile max width (bars)',{min:5,max:150,step:1}); fld(b,d,'sfaVpLo','col','Profile low-volume colour'); fld(b,d,'sfaVpHi','col','Profile high-volume colour'); fld(b,d,'sfaVpFill','chk','Fill profile bars');
    fld(b,d,'sfaPoc','chk','Show POC line'); fld(b,d,'sfaPocCol','col','POC colour'); },
  sig:()=>0};
try{ DESC.sfa='Strategy \u00b7 swing structure with Fibonacci arcs, swing volume profile and POC line'; }catch(e){}
{ const _sfD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='sfaview') return sfaDraw(d,X,Y,W,H); return _sfD.apply(this,arguments); };
  const _sfR=recomputeExtras; recomputeExtras=function(){ _sfR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='sfa'&&stVis(Z)) scriptBoxes.push({type:'sfaview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('sfa strategy failed',err); window.__sfaErr=err; }


// =====================================================================================
// [dsz] STRATEGY · "The Distilled Sweep Zone" (port)   (self-contained: every name starts with dsz / DSZ)
// Range edges (last unbroken swing high / low) on the chart tier + 2 higher tiers, each anchored on the CHART candle that
// printed the extreme; a projected likely-sweep AREA (price band in ATR + time window from the level's age); completed
// session H/L + previous-day H/L with circle markers; HTF 1 + chart unmitigated FVGs; "Draw above / below" tables.
// The Pine script has no trade signals, so this adds no BUY / SELL. Hooks: STRATS.dsz + draw + recomputeExtras.
// =====================================================================================
try{
const DSZ_TZ={'New York':'America/New_York','UTC':'UTC','London':'Europe/London','Frankfurt':'Europe/Berlin','Dubai':'Asia/Dubai','Singapore':'Asia/Singapore','Tokyo':'Asia/Tokyo','Sydney':'Australia/Sydney'};
const DSZ_TFS={'1m':60,'3m':180,'5m':300,'15m':900,'30m':1800,'1h':3600,'2h':7200,'4h':14400,'6h':21600,'12h':43200,'1D':86400,'1W':604800};
const DSZ_B0='Reverting raids (0.10 / 0.23 / 0.41)', DSZ_B1='All raids (0.16 / 0.36 / 0.73)', DSZ_B2='Measured on this chart', DSZ_B3='Custom';
const DSZ_KEYS=['dszChart','dszGov','dszG2','dszPair','dszMan1','dszMan2','dszPiv','dszGPiv','dszSess','dszPD','dszTZ','dszAsia','dszLon','dszNY','dszPM','dszGapChartIn','dszGapOn','dszGapMit','dszGapLim'];
const dszDF={},dszOC={};
function dszOff(zone,t){ if(zone==='UTC') return 0; const b=Math.floor(t/3600), hk=zone+'|'+b; let v=dszOC[hk]; if(v!==undefined) return v;
  let f=dszDF[zone]; if(!f) f=dszDF[zone]=new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
  const p={}; f.formatToParts(new Date(b*3600000)).forEach(x=>{ p[x.type]=+x.value; });
  v=Date.UTC(p.year,p.month-1,p.day,p.hour%24,p.minute,p.second)/1000-b*3600;
  if(Object.keys(dszOC).length>30000) Object.keys(dszOC).forEach(k=>delete dszOC[k]); dszOC[hk]=v; return v; }
const dszBk=(t,s)=>s>=604800?Math.floor((t+345600)/s)*s-345600:Math.floor(t/s)*s;
function dszSess(txt,fb){ const m=/(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})/.exec(String(txt||'')) || /(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})/.exec(fb); let s=+m[1]*60+ +m[2], e=+m[3]*60+ +m[4]; if(e===0) e=1440; return [s,e]; }
const dszIn=(m,s)=>s[0]<s[1]?(m>=s[0]&&m<s[1]):(m>=s[0]||m<s[1]);
function dszPair(tfs,Z){ if(Z.dszPair==='Manual') return [DSZ_TFS[Z.dszMan1]||0,DSZ_TFS[Z.dszMan2]||0];
  const f=s=>s<=60?900:s<=180?1800:s<=300?3600:s<=900?14400:s<=1800?21600:s<=10800?86400:s<=86400?604800:0; const g=f(tfs); return [g,g?f(g):0]; }
function dszBuckets(c,s){ const b=[]; for(let i=0;i<c.length;i++){ const k=dszBk(c[i].time,s), q=b[b.length-1];
    if(!q||q.k!==k) b.push({k,i0:i,i1:i,h:c[i].high,l:c[i].low}); else { q.i1=i; if(c[i].high>q.h) q.h=c[i].high; if(c[i].low<q.l) q.l=c[i].low; } } return b; }
function dszCompute(all,Z,tfs){
  const off=Math.max(0,all.length-12000), c=off?all.slice(off):all, n=c.length; if(n<60) return null;
  const T=new Float64Array(n); for(let i=0;i<n;i++) T[i]=c[i].time;
  const atr=new Float64Array(n).fill(NaN); { let s=0,rma=NaN; for(let t=0;t<n;t++){ const pc=t?c[t-1].close:c[t].close, tr=t?Math.max(c[t].high-c[t].low,Math.abs(c[t].high-pc),Math.abs(c[t].low-pc)):c[t].high-c[t].low;
      if(t<14){ s+=tr; if(t===13){ rma=s/14; atr[t]=rma; } } else { rma=(rma*13+tr)/14; atr[t]=rma; } } }
  const pr=dszPair(tfs,Z), gs=pr[0], g2s=pr[1], govOk=!!Z.dszGov&&gs>tfs, g2Ok=!!Z.dszG2&&g2s>gs&&g2s>tfs, useC=!!Z.dszChart;
  const ps=Z.dszPiv>0?Math.round(Z.dszPiv):(tfs<=60?6:tfs<=300?5:tfs<=900?4:tfs<=3600?3:2), gp=Math.max(1,Math.round(Z.dszGPiv)||2);
  const bk1=gs>tfs?dszBuckets(c,gs):null, bk2=(g2s>gs&&g2s>tfs)?dszBuckets(c,g2s):null;
  const ev1=new Int32Array(n).fill(-1), ev2=new Int32Array(n).fill(-1), nb1=new Int32Array(n).fill(-1);
  const mark=(bk,ev,s)=>{ if(!bk) return; bk.forEach((q,j)=>{ if(j<bk.length-1||T[q.i1]+tfs>=q.k+s) ev[q.i1]=j; }); };
  mark(bk1,ev1,gs); mark(bk2,ev2,g2s); if(bk1) bk1.forEach((q,j)=>{ nb1[q.i0]=j; });
  const bpiv=(bk,j,hi)=>{ const p=j-gp; if(p-gp<0) return null; const q=bk[p], v=hi?q.h:q.l;
    for(let m=1;m<=gp;m++){ const L=bk[p-m], R=bk[p+m]; if(hi){ if(!(v>L.h)||!(v>=R.h)) return null; } else { if(!(v<L.l)||!(v<=R.l)) return null; } }
    let o=q.i0, bv=hi?c[o].high:c[o].low; for(let i=q.i0;i<=q.i1;i++){ const x=hi?c[i].high:c[i].low; if(hi?x>bv:x<bv){ bv=x; o=i; } } return {v,o}; };
  const cpiv=(t,hi)=>{ const p=t-ps; if(p-ps<0) return -1; const v=hi?c[p].high:c[p].low;
    for(let m=1;m<=ps;m++){ if(hi){ if(!(v>c[p-m].high)||!(v>=c[p+m].high)) return -1; } else { if(!(v<c[p-m].low)||!(v<=c[p+m].low)) return -1; } } return p; };
  const P=new Array(6).fill(NaN), A=new Array(6).fill(null), B=new Array(6).fill(null), TK=new Array(6).fill(false), TKI=new Array(6).fill(null), wS=[], oS=[];
  const setE=(i,px,a,t)=>{ P[i]=px; A[i]=a; B[i]=t; TK[i]=false; TKI[i]=null; };
  // sessions + previous day
  const sessVis=!!Z.dszSess&&tfs<=3600, pdVis=!!Z.dszPD&&tfs<=86400, tz=DSZ_TZ[Z.dszTZ]||'America/New_York';
  const SS=[dszSess(Z.dszAsia,'1800-0000'),dszSess(Z.dszLon,'0200-0500'),dszSess(Z.dszNY,'0930-1200'),dszSess(Z.dszPM,'1300-1600')];
  const xp=new Array(10).fill(NaN), xt=new Array(10).fill(null), xk=new Array(10).fill(false);
  const sHi=[NaN,NaN,NaN,NaN], sLo=[NaN,NaN,NaN,NaN], sHt=[0,0,0,0], sLt=[0,0,0,0], sWas=[false,false,false,false], sFull=[false,false,false,false], sSeen=[false,false,false,false];
  let curD=null, pdSeenAny=false;
  // gaps
  const gaps=[]; const gapMit=Z.dszGapMit==='Full fill'?1:0, gapLim=Math.max(1,Math.round(Z.dszGapLim)||30), gapEn=!!Z.dszGapOn&&gs>tfs;
  for(let t=0;t<n;t++){
    const h=c[t].high, l=c[t].low;
    // ---- swing engine
    if(useC){ const ph=cpiv(t,true); if(ph>=0) setE(0,c[ph].high,ph,t); const pl=cpiv(t,false); if(pl>=0) setE(1,c[pl].low,pl,t); }
    if(govOk&&bk1&&ev1[t]>=0){ const a=bpiv(bk1,ev1[t],true); if(a) setE(2,a.v,a.o,t); const b=bpiv(bk1,ev1[t],false); if(b) setE(3,b.v,b.o,t); }
    if(g2Ok&&bk2&&ev2[t]>=0){ const a=bpiv(bk2,ev2[t],true); if(a) setE(4,a.v,a.o,t); const b=bpiv(bk2,ev2[t],false); if(b) setE(5,b.v,b.o,t); }
    for(let i=0;i<6;i++){ const px=P[i]; if(!isNaN(px)&&!TK[i]){ const hit=i%2===0?h>px:l<px; if(hit){ TK[i]=true; TKI[i]=t;
          if(B[i]!=null){ wS.push(t-B[i]); oS.push(atr[t]>0?(i%2===0?h-px:px-l)/atr[t]:NaN); while(wS.length>400){ wS.shift(); oS.shift(); } } } } }
    // ---- sessions
    if(sessVis){ const loc=((T[t]+dszOff(tz,T[t]))%86400+86400)%86400, mn=Math.floor(loc/60);
      for(let j=0;j<8;j++){ const px=xp[j]; if(!isNaN(px)&&!xk[j]&&(j%2===0?h>=px:l<=px)) xk[j]=true; }
      for(let j=0;j<4;j++){ const inside=dszIn(mn,SS[j]), was=sWas[j];
        if(inside){ if(!was){ sHi[j]=h; sLo[j]=l; sHt[j]=t; sLt[j]=t; sFull[j]=sSeen[j]; } else { if(h>sHi[j]){ sHi[j]=h; sHt[j]=t; } if(l<sLo[j]){ sLo[j]=l; sLt[j]=t; } } }
        else if(was&&sFull[j]){ xp[j*2]=sHi[j]; xp[j*2+1]=sLo[j]; xt[j*2]=sHt[j]; xt[j*2+1]=sLt[j]; xk[j*2]=h>=sHi[j]; xk[j*2+1]=l<=sLo[j]; }
        sWas[j]=inside; sSeen[j]=true; } }
    // ---- previous day
    if(pdVis){ const dk=Math.floor(T[t]/86400);
      if(!curD) curD={dk,h,l,hi:t,li:t,ok:(T[t]-dk*86400)<=Math.max(tfs,60)};
      else if(curD.dk!==dk){ if(curD.ok){ xp[8]=curD.h; xp[9]=curD.l; xt[8]=curD.hi; xt[9]=curD.li; xk[8]=false; xk[9]=false; pdSeenAny=true; }
        curD={dk,h,l,hi:t,li:t,ok:true}; }
      else { if(h>curD.h){ curD.h=h; curD.hi=t; } if(l<curD.l){ curD.l=l; curD.li=t; } }
      if(!isNaN(xp[8])&&h>=xp[8]) xk[8]=true; if(!isNaN(xp[9])&&l<=xp[9]) xk[9]=true; }
    // ---- gaps
    if(gapEn&&bk1&&nb1[t]>=3){ const jn=nb1[t], q1=bk1[jn-1], q3=bk1[jn-3];
      if(jn-3>=1){ const bull=q1.l>q3.h, bear=q1.h<q3.l;
        if(bull||bear){ let o=q3.i0, bv=bull?c[o].high:c[o].low; for(let i=q3.i0;i<=q3.i1;i++){ const x=bull?c[i].high:c[i].low; if(bull?x>bv:x<bv){ bv=x; o=i; } }
          gaps.push({lo:bull?q3.h:q1.h,hi:bull?q1.l:q3.l,dir:bull?1:-1,chart:false,o}); } } }
    for(let j=gaps.length-1;j>=0;j--){ const g=gaps[j], bull=g.dir===1, hit=bull?(l<=(gapMit?g.lo:g.hi)):(h>=(gapMit?g.hi:g.lo)); if(hit) gaps.splice(j,1); }
    if(Z.dszGapChartIn&&t>=2){ const bull=l>c[t-2].high, bear=h<c[t-2].low;
      if(bull||bear) gaps.push({lo:bull?c[t-2].high:h,hi:bull?l:c[t-2].low,dir:bull?1:-1,chart:true,o:t-2}); }
    if(gaps.length>gapLim){ for(let src=0;src<2;src++){ let cnt=0; for(let j=gaps.length-1;j>=0;j--){ if(gaps[j].chart===(src===1)){ cnt++; if(cnt>gapLim) gaps.splice(j,1); } } } }
  }
  return {off,n,tfs,gs,g2s,govOk,g2Ok,useC,P,A,B,TK,TKI,wS,oS,atr:atr[n-1],xp,xt,xk,sessVis,pdVis,gaps,gapEn,close:c[n-1].close,last:c[n-1]};
}
const dszCache={};
function dszTfsOf(){ return (tf&&tf[3])?tf[3]*2592000:(tf&&tf[2])||60; }
function dszGet(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,dszTfsOf()].concat(DSZ_KEYS.map(k=>Z[k])).join('|');
  if(!dszCache[Z.sid]||dszCache[Z.sid].k!==key) dszCache[Z.sid]={k:key,r:dszCompute(c,Z,dszTfsOf())}; return dszCache[Z.sid].r; }
function dszWaitQ(r,Z,age,pct){ let v=NaN;
  if(r.wS.length>=Z.dszSample){ const rem=[]; r.wS.forEach(w=>{ if(w>=age) rem.push(w-age); }); if(rem.length>=8){ rem.sort((a,b)=>a-b); v=rem[Math.min(Math.floor(pct*(rem.length-1)),rem.length-1)]; } }
  if(isNaN(v)) v=pct<=.25?2+.56*age:pct>=.75?29+5.1*age:7+1.8*age; return Math.max(1,v); }
const dszTag=s=>s<60?s+'s':s<3600?(s/60)+'m':s<86400?(s/3600)+'H':s<604800?'D':'W';
const dszRgba=(h,a)=>{ const v=parseInt(String(h||'#000000').replace('#',''),16)||0; return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'; };
const dszDash=s=>s==='Dashed'?[6,4]:s==='Dotted'?[1.5,3]:[];
const dszP=v=>{ const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=1000?2:a>=1?4:6}); };
function dszDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<60) return; const r=dszGet(c,Z); if(!r) return;
  const off=r.off, n=r.n, last=n-1+off, xr=X(last+4), tfs=r.tfs; if(xr==null) return;
  const atr=r.atr, tags=[dszTag(tfs),dszTag(r.gs),dszTag(r.g2s)], tierOn=[r.useC,r.govOk,r.g2Ok];
  const lines=[]; // everything that could be listed in the tables
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round'; cx.lineCap='butt';
  cx.font='9px system-ui'; cx.textAlign='left'; cx.textBaseline='middle';
  const rc=Z.dszRngCol||'#2962ff', tkc=Z.dszTkCol||'#787b86';
  // ---- shade between the highest enabled tier's edges
  if(Z.dszRng&&Z.dszFil){ const b9=r.g2Ok?4:r.govOk?2:0, hp=r.P[b9], lp=r.P[b9+1];
    if(!isNaN(hp)&&!isNaN(lp)&&hp>lp&&r.A[b9]!=null&&r.A[b9+1]!=null){ const x0=X(Math.min(r.A[b9],r.A[b9+1])+off), y0=Y(hp), y1=Y(lp); if(x0!=null&&y0!=null&&y1!=null){ cx.fillStyle=dszRgba(Z.dszFilCol||'#2962ff',.07); cx.fillRect(x0,y0,xr-x0,y1-y0); } } }
  // ---- range edges + the sweep zone
  const band=(()=>{ let a=.10,b=.41,m=.23; if(Z.dszBand===DSZ_B1){ a=.16; b=.73; m=.36; } else if(Z.dszBand===DSZ_B3){ a=Math.min(Z.dszLoA,Z.dszHiA); b=Math.max(Z.dszLoA,Z.dszHiA); m=Z.dszMdA; }
    else if(Z.dszBand===DSZ_B2){ const ov=r.oS.filter(x=>!isNaN(x)).sort((p,q)=>p-q); if(r.oS.length>=Z.dszSample&&ov.length>=8){ a=ov[Math.floor(.25*(ov.length-1))]; m=ov[Math.floor(.5*(ov.length-1))]; b=ov[Math.floor(.75*(ov.length-1))]; } else { a=.16; b=.73; m=.36; } } return [a,b,m]; })();
  for(let i=0;i<6;i++){ const px=r.P[i], a0=r.A[i], tier=i>>1; if(isNaN(px)||a0==null||!tierOn[tier]) continue;
    const isH=i%2===0, tk=r.TK[i], x0=X(a0+off), y=Y(px); if(x0==null||y==null) continue;
    if(Z.dszRng&&(!tk||Z.dszKeep)){ const col=tk?tkc:rc, w9=Math.max(1,(Z.dszRngW||2)-(2-tier)), xe=tk&&r.TKI[i]!=null?X(r.TKI[i]+off):xr; if(xe!=null){
        cx.strokeStyle=col; cx.lineWidth=w9; cx.setLineDash(tk?[]:dszDash(Z.dszRngSty)); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(xe,y); cx.stroke(); cx.setLineDash([]);
        if(Z.dszTx){ cx.fillStyle=col; cx.fillText(tags[tier]+(isH?' BSL':' SSL')+(tk?' \u2713':''),xe+3,y); } } }
    if(!tk){ lines.push({tag:tags[tier]+(isH?' BSL':' SSL'),px,ink:tier===0?'#000000':'#2962ff'});
      if(Z.dszCirc){ const pad=Math.max(7,Math.abs((Y(px+(atr||0)*(Z.dszGapC||.08))||y)-y)), cy=y+(isH?-pad:pad); cx.strokeStyle='#607d8b'; cx.lineWidth=1.5; cx.beginPath(); cx.arc(x0,cy,4,0,Math.PI*2); cx.stroke(); }
      // ---- the projected sweep zone
      const zt=tier===0?Z.dszZC:tier===1?Z.dszZG:Z.dszZ2;
      if(Z.dszZOn&&zt&&atr>0){ const za=isH?px+Math.min(band[0],band[1])*atr:px-Math.min(band[0],band[1])*atr, zb=isH?px+Math.max(band[0],band[1])*atr:px-Math.max(band[0],band[1])*atr, zm=isH?px+band[2]*atr:px-band[2]*atr;
        const age=Math.max(0,n-1-(r.B[i]==null?n-1:r.B[i]));
        let xa=x0, xb=xr, xm=null; if(Z.dszTime){ xa=X(last+dszWaitQ(r,Z,age,.25)); xb=X(last+dszWaitQ(r,Z,age,.75)); xm=X(last+dszWaitQ(r,Z,age,.5)); }
        const ya=Y(za), yb=Y(zb), ym=Y(zm);
        if(xa!=null&&xb!=null&&ya!=null&&yb!=null){ const zc=Z.dszZCol||'#f23645'; cx.fillStyle=dszRgba(zc,(100-Z.dszZFill)/100); cx.fillRect(xa,Math.min(ya,yb),xb-xa,Math.abs(yb-ya));
          cx.strokeStyle=dszRgba(zc,(100-Z.dszZBord)/100); cx.lineWidth=1; cx.strokeRect(xa+.5,Math.min(ya,yb)+.5,xb-xa,Math.abs(yb-ya));
          cx.strokeStyle=dszRgba(zc,.65); cx.lineWidth=Z.dszMedW||1; cx.setLineDash([1.5,3]);
          if(ym!=null){ cx.beginPath(); cx.moveTo(xa,ym); cx.lineTo(xb,ym); cx.stroke(); }
          if(Z.dszTime&&Z.dszMedT&&xm!=null){ cx.beginPath(); cx.moveTo(xm,ya); cx.lineTo(xm,yb); cx.stroke(); } cx.setLineDash([]); } } } }
  // ---- sessions + previous day
  const SN=['Asia','London','NY AM','NY PM'], SC=[Z.dszAsiaC||'#fdd835',Z.dszLonC||'#2962ff',Z.dszNYC||'#4caf50',Z.dszPMC||'#9c27b0'];
  for(let j=0;j<10;j++){ const px=r.xp[j], vis=j<8?r.sessVis:r.pdVis; if(!vis||isNaN(px)||r.xk[j]||r.xt[j]==null) continue;
    const isH=j%2===0, name=j===8?'PDH':j===9?'PDL':SN[j>>1]+(isH?' H':' L'), ink=j>=8?(Z.dszPdC||'#b54b57'):SC[j>>1], x0=X(r.xt[j]+off), y=Y(px); if(x0==null||y==null) continue;
    lines.push({tag:name,px,ink});
    if(Z.dszCirc){ const pad=Math.max(7,Math.abs((Y(px+(atr||0)*.08)||y)-y)), cy=y+(isH?-pad:pad); cx.strokeStyle=ink; cx.lineWidth=1.5; cx.beginPath(); cx.arc(x0,cy,4,0,Math.PI*2); cx.stroke(); }
    if(Z.dszXNames){ cx.fillStyle=ink; cx.textAlign='center'; cx.fillText(name,x0,y+(isH?-20:20)); cx.textAlign='left'; }
    if(Z.dszXLines){ cx.strokeStyle=dszRgba(ink,.65); cx.lineWidth=1; cx.setLineDash([1.5,3]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(xr,y); cx.stroke(); cx.setLineDash([]); } }
  // ---- fair value gaps
  const gc=Z.dszGapCol||'#787b86'; let chartSeen=0;
  for(let j=r.gaps.length-1;j>=0;j--){ const g=r.gaps[j], bull=g.dir===1, tgt=bull?(Z.dszGapMit==='Full fill'?g.lo:g.hi):(Z.dszGapMit==='Full fill'?g.hi:g.lo), nm=(g.chart?tags[0]:tags[1])+' FVG';
    lines.push({tag:nm,px:tgt,ink:gc});
    if(g.chart) chartSeen++; const show=g.chart?(Z.dszGapChartShow&&chartSeen<=Z.dszGapRecent):r.gapEn; if(!show) continue;
    const x0=X(g.o+off), y0=Y(g.hi), y1=Y(g.lo); if(x0==null||y0==null||y1==null) continue;
    if(Z.dszGapBox){ cx.fillStyle=dszRgba(gc,(100-Z.dszGapTr)/100); cx.fillRect(x0,Math.min(y0,y1),xr-x0,Math.abs(y1-y0)); cx.strokeStyle=dszRgba(gc,.35); cx.lineWidth=1; cx.strokeRect(x0+.5,Math.min(y0,y1)+.5,xr-x0,Math.abs(y1-y0)); }
    if(Z.dszGapName){ const yt=Y(tgt); if(yt!=null){ cx.fillStyle=gc; cx.fillText(nm,xr+3,yt); } } }
  // ---- liquidity draw tables (nearest draws only, far -> near above, near -> far below)
  if(Z.dszTb){ const cl=r.close, rows=Math.max(1,Math.round(Z.dszTbRows)||6), fs=Z.dszTbSize==='Normal'?12:Z.dszTbSize==='Small'?10:9, rh=fs+6;
    const dist=px=>{ const dd=Math.abs(px-cl); return Z.dszTbUnit==='Percent'?(cl?(dd/Math.abs(cl)*100).toFixed(3)+'%':'-'):dszP(dd); };
    const up=lines.filter(q=>q.px>cl).sort((a,b)=>a.px-b.px).slice(0,rows).reverse(), dn=lines.filter(q=>q.px<cl).sort((a,b)=>b.px-a.px).slice(0,rows);
    cx.font=fs+'px monospace'; cx.textBaseline='middle'; cx.textAlign='left';
    const paint=(list,head,bottom)=>{ const all=[['',head,'Price','Away'].slice(1)].concat(list.length?list.map(q=>[q.tag,dszP(q.px),dist(q.px),q.ink]):[['No active draws','','','#000000']]);
      all[0]=[head,'Price','Away','#ffffff']; let w0=0,w1=0,w2=0; all.forEach(q=>{ w0=Math.max(w0,cx.measureText(q[0]).width); w1=Math.max(w1,cx.measureText(q[1]).width); w2=Math.max(w2,cx.measureText(q[2]).width); }); w0+=10; w1+=10; w2+=10;
      const tw=w0+w1+w2, th=all.length*rh, tx=Z.dszTbSide==='Left'?4:Math.max(2,W-tw-4), ty=bottom?Math.max(2,H-th-4):4;
      all.forEach((q,k)=>{ const y=ty+k*rh; cx.fillStyle=k===0?'#000000':'#ffffff'; cx.globalAlpha=.92; cx.fillRect(tx,y,tw,rh-1); cx.globalAlpha=1;
        cx.fillStyle=k===0?'#ffffff':q[3]; cx.fillText(q[0],tx+5,y+rh/2); cx.fillText(q[1],tx+w0+5,y+rh/2); cx.fillStyle=k===0?'#ffffff':'#000000'; cx.fillText(q[2],tx+w0+w1+5,y+rh/2); }); };
    paint(up,'Draw above',false); paint(dn,'Draw below',true); }
  cx.globalAlpha=1; cx.restore();
}
STRATS.dsz={label:'The Distilled Sweep Zone \u00b7 range edges on 3 tiers, likely-sweep price + time area, session / previous-day liquidity, FVGs, draw tables',short:'Distilled Sweep Zone',own:true,
  defs:{limit:false,useSl:false,dszChart:true,dszGov:true,dszG2:true,dszPair:'Auto',dszMan1:'1h',dszMan2:'4h',dszPiv:0,dszGPiv:2,
    dszRng:true,dszRngCol:'#2962ff',dszRngW:2,dszRngSty:'Solid',dszFil:false,dszFilCol:'#2962ff',dszTx:true,dszKeep:true,dszTkCol:'#787b86',
    dszZOn:true,dszZC:false,dszZG:true,dszZ2:true,dszBand:DSZ_B0,dszLoA:.10,dszHiA:.41,dszMdA:.23,dszTime:true,dszSample:40,dszMedT:true,dszZCol:'#f23645',dszZFill:90,dszZBord:70,dszMedW:1,
    dszSess:true,dszPD:true,dszCirc:true,dszXLines:true,dszXNames:true,dszTZ:'New York',dszAsia:'1800-0000',dszLon:'0200-0500',dszNY:'0930-1200',dszPM:'1300-1600',
    dszAsiaC:'#fdd835',dszLonC:'#2962ff',dszNYC:'#4caf50',dszPMC:'#9c27b0',dszPdC:'#b54b57',
    dszGapChartIn:true,dszGapChartShow:false,dszGapRecent:3,dszGapOn:true,dszGapBox:true,dszGapName:true,dszGapMit:'First touch',dszGapLim:30,dszGapCol:'#787b86',dszGapTr:90,
    dszTb:true,dszTbSide:'Right',dszTbRows:6,dszTbSize:'Tiny',dszTbUnit:'Points'},
  inputs:(b,d)=>{ const TFO=Object.keys(DSZ_TFS), LS=['Solid','Dashed','Dotted'];
    fld(b,d,'dszChart','chk','Tier: chart timeframe'); fld(b,d,'dszGov','chk','Tier: higher timeframe 1 (governing)'); fld(b,d,'dszG2','chk','Tier: higher timeframe 2'); fld(b,d,'dszPair','sel','Pairing',{opts:['Auto','Manual']});
    fld(b,d,'dszMan1','sel','Manual HTF 1',{opts:TFO}); fld(b,d,'dszMan2','sel','Manual HTF 2',{opts:TFO}); fld(b,d,'dszPiv','num','Chart pivot strength (0 = auto)',{min:0,max:20,step:1}); fld(b,d,'dszGPiv','num','Higher-timeframe pivot strength',{min:1,max:10,step:1});
    fld(b,d,'dszRng','chk','Draw the range'); fld(b,d,'dszRngCol','col','Level colour'); fld(b,d,'dszRngW','num','Level width (HTF 2, stepped down per tier)',{min:1,max:5,step:1}); fld(b,d,'dszRngSty','sel','Level style',{opts:LS});
    fld(b,d,'dszFil','chk','Shade between the edges'); fld(b,d,'dszTx','chk','Label each edge'); fld(b,d,'dszKeep','chk','Keep a taken edge, ticked'); fld(b,d,'dszTkCol','col','Taken colour');
    fld(b,d,'dszZOn','chk','Project the likely sweep zone'); fld(b,d,'dszZC','chk','  zone on chart range'); fld(b,d,'dszZG','chk','  zone on HTF 1'); fld(b,d,'dszZ2','chk','  zone on HTF 2');
    fld(b,d,'dszBand','sel','Price band',{opts:[DSZ_B0,DSZ_B1,DSZ_B2,DSZ_B3]}); fld(b,d,'dszLoA','num','Custom: from (x ATR beyond)',{min:0,max:3,step:.01}); fld(b,d,'dszHiA','num','Custom: to (x ATR beyond)',{min:.01,max:5,step:.01}); fld(b,d,'dszMdA','num','Custom: median mark',{min:0,max:5,step:.01});
    fld(b,d,'dszTime','chk','Give the zone a TIME axis (estimated area)'); fld(b,d,'dszSample','num','Learn from this chart after (raids)',{min:8,max:400,step:1}); fld(b,d,'dszMedT','chk','Mark the median time');
    fld(b,d,'dszZCol','col','Zone colour'); fld(b,d,'dszZFill','num','Zone fill transparency (%)',{min:40,max:100,step:1}); fld(b,d,'dszZBord','num','Zone border transparency (%)',{min:40,max:100,step:1}); fld(b,d,'dszMedW','num','Median width',{min:1,max:4,step:1});
    fld(b,d,'dszSess','chk','Completed session H/L (up to 1H)'); fld(b,d,'dszPD','chk','Previous-day high / low'); fld(b,d,'dszCirc','chk','Circle markers on liquidity extremes'); fld(b,d,'dszXLines','chk','Session / PD level lines'); fld(b,d,'dszXNames','chk','Session / PD names');
    fld(b,d,'dszTZ','sel','Session timezone',{opts:Object.keys(DSZ_TZ)}); fld(b,d,'dszAsia','txt','Asia (HHMM-HHMM)'); fld(b,d,'dszLon','txt','London'); fld(b,d,'dszNY','txt','New York AM'); fld(b,d,'dszPM','txt','New York PM');
    fld(b,d,'dszAsiaC','col','Asia colour'); fld(b,d,'dszLonC','col','London colour'); fld(b,d,'dszNYC','col','New York AM colour'); fld(b,d,'dszPMC','col','New York PM colour'); fld(b,d,'dszPdC','col','Previous-day colour');
    fld(b,d,'dszGapOn','chk','Show HTF 1 gaps'); fld(b,d,'dszGapChartIn','chk','Include chart gaps in tables'); fld(b,d,'dszGapChartShow','chk','Show recent chart gaps on chart'); fld(b,d,'dszGapRecent','num','Recent chart gaps to draw',{min:1,max:20,step:1});
    fld(b,d,'dszGapBox','chk','Draw gap boxes'); fld(b,d,'dszGapName','chk','Label gaps'); fld(b,d,'dszGapMit','sel','Remove gap after',{opts:['First touch','Full fill']}); fld(b,d,'dszGapLim','num','Maximum retained gaps',{min:1,max:60,step:1});
    fld(b,d,'dszGapCol','col','Gap colour'); fld(b,d,'dszGapTr','num','Gap box transparency (%)',{min:0,max:100,step:1});
    fld(b,d,'dszTb','chk','Show liquidity draw tables'); fld(b,d,'dszTbSide','sel','Table side',{opts:['Right','Left']}); fld(b,d,'dszTbRows','num','Maximum rows per table',{min:1,max:16,step:1}); fld(b,d,'dszTbSize','sel','Table text size',{opts:['Tiny','Small','Normal']}); fld(b,d,'dszTbUnit','sel','Distance unit',{opts:['Points','Percent']}); },
  sig:()=>0};
try{ DESC.dsz='Strategy \u00b7 range edges on 3 tiers, likely-sweep price + time area, session / previous-day liquidity, FVGs and draw tables'; }catch(e){}
{ const _dzD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='dszview') return dszDraw(d,X,Y,W,H); return _dzD.apply(this,arguments); };
  const _dzR=recomputeExtras; recomputeExtras=function(){ _dzR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='dsz'&&stVis(Z)) scriptBoxes.push({type:'dszview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('dsz strategy failed',err); window.__dszErr=err; }


// =====================================================================================
// [axz] STRATEGY · "Support Resistance Confluence Zones" (AxeAlgo port)   (self-contained: every name starts with axz / AXZ)
// Pivot highs / lows that land close together merge into confluence zones (2+ pivots), scored 0-100 (touches, HTF swing
// alignment, round numbers, volume spikes), with retest counting, break -> flip (S <-> R), POC midline, badges, de-cluttering,
// optional developing levels, flip / rejection markers and a dashboard. The Pine script has no trade signals: no BUY / SELL.
// Hooks: STRATS.axz + draw + recomputeExtras.
// =====================================================================================
try{
const AXZ_TFS={'15m':900,'30m':1800,'1h':3600,'2h':7200,'4h':14400,'6h':21600,'12h':43200,'1D':86400,'1W':604800};
const AXZ_KEYS=['axzAuto','axzFlip','axzPiv','axzRight','axzAtr','axzTol','axzMinH','axzMaxH','axzHtf','axzHtfMode','axzHtfMan','axzHtfTol','axzRnd','axzRndTol','axzVol','axzSep','axzBuf','axzFar','axzMax','axzRej','axzFlipMk','axzMidMode'];
const axzBk=(t,s)=>s>=604800?Math.floor((t+345600)/s)*s-345600:Math.floor(t/s)*s;
function axzBuckets(c,s){ const b=[]; for(let i=0;i<c.length;i++){ const k=axzBk(c[i].time,s), q=b[b.length-1];
    if(!q||q.k!==k) b.push({k,i0:i,i1:i,h:c[i].high,l:c[i].low}); else { q.i1=i; if(c[i].high>q.h) q.h=c[i].high; if(c[i].low<q.l) q.l=c[i].low; } } return b; }
function axzRoundNear(px,atr,Z){ const a=Math.abs(px); if(!(a>0)||!(atr>0)) return false;
  const mag=Math.floor(Math.log10(a)), b1=Math.pow(10,mag), b01=b1/10, b001=b1/100, b0005=b001/2, tol=Z.axzRndTol*atr,
    n1=Math.round(a/b01)*b01, n2=Math.round(a/(b01/2))*(b01/2), n3=Math.round(a/b001)*b001, n4=Math.round(a/b0005)*b0005;
  return Math.abs(a-n1)<=tol||Math.abs(a-n2)<=tol||Math.abs(a-n3)<=tol||Math.abs(a-n4)<=tol; }
function axzScoreRaw(touch,aligned,rn,hv){ const t=Math.max(touch,2), ts=80-40/(1+(t-2)*.15), bonus=(aligned?8:0)+(rn?6:0)+(hv?6:0); return Math.trunc(Math.min(100,ts+bonus)); }
function axzMid(z,Z){ return Z.axzMidMode==='Volume POC Anchor'&&!isNaN(z.pocPx)&&z.pocPx>=z.bot&&z.pocPx<=z.top?z.pocPx:(z.top+z.bot)/2; }
function axzFacts(z,Z,atr,hh,hl){ const m=axzMid(z,Z), lv=z.dir===1?hh:hl, ok=atr>0;
  const aligned=!!Z.axzHtf&&!isNaN(lv)&&ok&&Math.abs(m-lv)<=Z.axzHtfTol*atr, rn=!!Z.axzRnd&&ok&&axzRoundNear(m,atr,Z), hv=z.hasVol&&!!Z.axzVol;
  return {m,aligned,rn,hv,score:axzScoreRaw(z.touch+z.preTouch,aligned,rn,hv)}; }
function axzCompute(all,Z,tfs){
  const off=Math.max(0,all.length-4000), c=off?all.slice(off):all, n=c.length; if(n<80) return null;
  const AL=Math.max(2,Math.round(Z.axzAtr)||14), atr=new Float64Array(n).fill(NaN); { let s=0,rma=NaN; for(let t=0;t<n;t++){ const pc=t?c[t-1].close:c[t].close, tr=t?Math.max(c[t].high-c[t].low,Math.abs(c[t].high-pc),Math.abs(c[t].low-pc)):c[t].high-c[t].low;
      if(t<AL){ s+=tr; if(t===AL-1){ rma=s/AL; atr[t]=rma; } } else { rma=(rma*(AL-1)+tr)/AL; atr[t]=rma; } } }
  const isHV=new Uint8Array(n); { let s=0; for(let t=0;t<n;t++){ s+=c[t].volume||0; if(t>=20) s-=c[t-20].volume||0; if(t>=19){ const sm=s/20; isHV[t]=(sm>0&&(c[t].volume||0)>sm*1.5)?1:0; } } }
  const L=Z.axzAuto?(tfs<=60?8:tfs<=300?10:tfs<=3600?14:tfs<=14400?18:24):Math.max(3,Math.round(Z.axzPiv)||10), R=Math.max(1,Math.round(Z.axzRight)||3);
  // ---- HTF swing levels (pivot 5 left / 2 right on the higher timeframe, active once confirmed)
  const hs=Z.axzHtfMode==='Manual'?(AXZ_TFS[Z.axzHtfMan]||0):(tfs<=60?900:tfs<=300?3600:tfs<=900?14400:tfs<=3600?86400:tfs<=14400?604800:0);
  const hH=new Float64Array(n).fill(NaN), hL=new Float64Array(n).fill(NaN);
  if(Z.axzHtf&&hs>tfs){ const bk=axzBuckets(c,hs), ev=new Int32Array(n).fill(-1); bk.forEach((q,j)=>{ if(j<bk.length-1||c[q.i1].time+tfs>=q.k+hs) ev[q.i1]=j; });
    let ch=NaN,cl=NaN; for(let t=0;t<n;t++){ const j=ev[t]; if(j>=0){ const p=j-2; if(p-5>=0){ let ph=true,pl=true; const q=bk[p];
          for(let m=1;m<=5;m++){ if(!(q.h>bk[p-m].h)) ph=false; if(!(q.l<bk[p-m].l)) pl=false; } for(let m=1;m<=2;m++){ if(!(q.h>=bk[p+m].h)) ph=false; if(!(q.l<=bk[p+m].l)) pl=false; }
          if(ph) ch=q.h; if(pl) cl=q.l; } } hH[t]=ch; hL[t]=cl; } }
  const zones=[], hiB=[], loB=[], flipMk=[], rejMk=[]; let a=NaN,t=0;
  const bounds=(top,bot)=>{ const minH=Math.max(Z.axzMinH*a,Z.axzTol*a*.5); if(top-bot<minH){ const m=(top+bot)/2; top=m+minH/2; bot=m-minH/2; } if(top-bot>Z.axzMaxH*a){ const m=(top+bot)/2; top=m+Z.axzMaxH*a/2; bot=m-Z.axzMaxH*a/2; } return [top,bot]; };
  const pivot=(dir,px,isVol,raw,buf,pvBar)=>{ let merged=false;
    for(const z of zones){ if(z.dir===dir&&px>=z.bot-Z.axzTol*a&&px<=z.top+Z.axzTol*a){ const b=bounds(Math.max(z.top,px),Math.min(z.bot,px)); z.top=b[0]; z.bot=b[1]; z.touch++; z.lastTouchBar=t; z.hasVol=z.hasVol||isVol; if(raw>z.maxVol){ z.maxVol=raw; z.pocPx=px; } merged=true; break; } }
    if(merged) return;
    for(let k=buf.length-1;k>=0;k--) if(t-buf[k].b>Z.axzBuf) buf.splice(k,1);
    let pi=-1; for(let k=0;k<buf.length;k++) if(Math.abs(buf[k].px-px)<=Z.axzTol*a){ pi=k; break; }
    if(pi>=0){ const q=buf[pi], b=bounds(Math.max(q.px,px),Math.min(q.px,px));
      zones.push({top:b[0],bot:b[1],dir,touch:2,preTouch:0,flipCount:0,born:Math.max(0,Math.min(q.b,pvBar)),lastTouchBar:t,hasVol:q.v||isVol,pocPx:raw>=q.vol?px:q.px,maxVol:Math.max(raw,q.vol),visible:true,isBest:false}); buf.splice(pi,1); }
    else { buf.push({px,b:pvBar,v:isVol,vol:raw}); if(buf.length>20) buf.shift(); } };
  const mergeZ=()=>{ if(zones.length<2) return; for(let i=zones.length-1;i>=1;i--){ const zi=zones[i];
      for(let j=i-1;j>=0;j--){ const zj=zones[j]; if(zi.dir===zj.dir&&zi.top>=zj.bot-Z.axzTol*a&&zi.bot<=zj.top+Z.axzTol*a){ const b=bounds(Math.max(zi.top,zj.top),Math.min(zi.bot,zj.bot));
          zj.top=b[0]; zj.bot=b[1]; zj.touch+=zi.touch; zj.preTouch+=zi.preTouch; zj.lastTouchBar=Math.max(zi.lastTouchBar,zj.lastTouchBar); zj.born=Math.min(zi.born,zj.born); zj.hasVol=zj.hasVol||zi.hasVol;
          if(zi.maxVol>zj.maxVol){ zj.maxVol=zi.maxVol; zj.pocPx=zi.pocPx; } zones.splice(i,1); break; } } } };
  for(t=0;t<n;t++){ a=atr[t]; if(!(a>0)) continue; const cc=c[t];
    const p=t-R;
    if(p-L>=0){ const vh=c[p].high, vl=c[p].low; let ph=true,pl=true;
      for(let m=1;m<=L&&(ph||pl);m++){ if(!(vh>c[p-m].high)) ph=false; if(!(vl<c[p-m].low)) pl=false; }
      for(let m=1;m<=R&&(ph||pl);m++){ if(!(vh>=c[p+m].high)) ph=false; if(!(vl<=c[p+m].low)) pl=false; }
      if(ph) pivot(1,vh,!!isHV[p],c[p].volume||0,hiB,p); if(pl) pivot(-1,vl,!!isHV[p],c[p].volume||0,loB,p); }
    mergeZ();
    for(let i=zones.length-1;i>=0;i--){ const z=zones[i]; let removed=false;
      if(z.born!==t){ const through=z.dir===1?cc.close>z.top:cc.close<z.bot;
        if(through){ if(Z.axzFlip){ z.dir=-z.dir; z.preTouch+=z.touch; z.touch=1; z.flipCount++; z.lastTouchBar=t; if(Z.axzFlipMk){ flipMk.push({i:t,p:z.dir===1?z.bot:z.top}); if(flipMk.length>20) flipMk.shift(); } } else { zones.splice(i,1); removed=true; } }
        else if(cc.low<=z.top&&cc.high>=z.bot){
          if(t-z.lastTouchBar>=Z.axzSep){ z.touch++; z.lastTouchBar=t; if(isHV[t]) z.hasVol=true; }
          if(Z.axzRej){ const f=axzFacts(z,Z,a,hH[t],hL[t]);
            if(f.score>=60){ if(z.dir===1&&cc.high>=z.bot&&cc.close<z.bot&&cc.close<cc.open){ rejMk.push({i:t,p:cc.high,up:false}); if(rejMk.length>25) rejMk.shift(); }
              else if(z.dir===-1&&cc.low<=z.top&&cc.close>z.top&&cc.close>cc.open){ rejMk.push({i:t,p:cc.low,up:true}); if(rejMk.length>25) rejMk.shift(); } } } } }
      if(!removed&&Math.abs(cc.close-axzMid(z,Z))>Z.axzFar*a) zones.splice(i,1); }
    while(zones.length>Z.axzMax) zones.shift(); }
  return {off,n,zones,hiB,loB,flipMk,rejMk,atr:atr[n-1],hh:hH[n-1],hl:hL[n-1],last:c[n-1]};
}
const axzCache={};
function axzTfsOf(){ return (tf&&tf[3])?tf[3]*2592000:(tf&&tf[2])||60; }
function axzGet(c,Z){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close,l.volume,axzTfsOf()].concat(AXZ_KEYS.map(k=>Z[k])).join('|');
  if(!axzCache[Z.sid]||axzCache[Z.sid].k!==key) axzCache[Z.sid]={k:key,r:axzCompute(c,Z,axzTfsOf())}; return axzCache[Z.sid].r; }
const axzRgba=(h,a)=>{ const v=parseInt(String(h||'#000000').replace('#',''),16)||0; return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+Math.max(0,Math.min(1,a)).toFixed(3)+')'; };
const axzP=v=>{ const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=1000?2:a>=1?4:6}); };
function axzDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<80) return; const r=axzGet(c,Z); if(!r) return;
  const off=r.off, last=r.n-1+off, ext=Math.max(5,Math.round(Z.axzExt)||22), xr=X(last+ext), atr=r.atr, cl=r.last.close, zs=r.zones; if(xr==null||!(atr>0)) return;
  const fct=zs.map(z=>axzFacts(z,Z,atr,r.hh,r.hl));
  // ---- visibility: rank by distance, keep the nearest shelves per side, min score
  zs.forEach((z,i)=>{ const m=fct[i].m, isR=m>cl&&z.dir===1, isS=m<cl&&z.dir===-1, dz=Math.abs(m-cl); let rr=0,sr=0;
    if(isR||isS) zs.forEach((z2,j)=>{ if(j===i) return; const m2=fct[j].m, d2=Math.abs(m2-cl); if(isR&&m2>cl&&z2.dir===1&&d2<dz) rr++; if(isS&&m2<cl&&z2.dir===-1&&d2<dz) sr++; });
    const rc=isR?rr+1:0, sc=isS?sr+1:0; let ok=fct[i].score>=Z.axzMinSc; if(ok&&cl<z.bot&&z.dir===1&&rc>Z.axzMaxLv) ok=false; if(ok&&cl>z.top&&z.dir===-1&&sc>Z.axzMaxLv) ok=false; z.visible=ok; z.isBest=false; });
  let bi=-1,bs=-1; zs.forEach((z,i)=>{ if(z.visible&&fct[i].score>bs){ bs=fct[i].score; bi=i; } }); if(bi>=0) zs[bi].isBest=true;
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  const fs=Z.axzBadgeSz==='Tiny'?8:Z.axzBadgeSz==='Normal'?12:10;
  // ---- developing (single pivot) levels
  if(Z.axzTent){ const g=(buf,col,tt)=>{ const gt=Math.min(95,Math.round(tt*.65)); buf.forEach(q=>{ const x0=X(q.b+off), y=Y(q.px); if(x0==null||y==null) return; cx.strokeStyle=axzRgba(col,(100-gt)/100); cx.lineWidth=1; cx.setLineDash([5,4]); cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(xr,y); cx.stroke(); }); cx.setLineDash([]); };
    g(r.hiB,Z.axzResC,Z.axzResT); g(r.loB,Z.axzSupC,Z.axzSupT); }
  const badges=[];
  zs.forEach((z,i)=>{ if(!z.visible) return; const f=fct[i], zc=z.dir===1?Z.axzResC:Z.axzSupC, uT=z.dir===1?Z.axzResT:Z.axzSupT, baseT=uT>0?uT:85, bBase=Math.max(0,Math.round(baseT*.47)); let bw,bt,bgt;
    if(f.score>=80){ bw=3; bt=Math.max(0,bBase-25); bgt=Math.max(0,Math.round(baseT-8)); } else if(f.score>=60){ bw=2; bt=bBase; bgt=Math.min(98,Math.round(baseT)); } else { bw=1; bt=Math.min(95,bBase+25); bgt=Math.min(98,Math.round(baseT+7)); }
    const dist=Math.abs(f.m-cl)/atr, span=Math.max(Z.axzFar-Z.axzFade,1), fade=dist<=Z.axzFade?0:Math.min(30,(dist-Z.axzFade)/span*30); bt=Math.min(bt+Math.round(fade),95); bgt=Math.min(bgt+Math.round(fade*.6),98);
    if(z.isBest){ bw++; bt=Math.max(bt-15,0); }
    const x0=X(Math.max(0,z.born)+off), y0=Y(z.top), y1=Y(z.bot); if(x0==null||y0==null||y1==null) return;
    cx.fillStyle=axzRgba(zc,(100-bgt)/100); cx.fillRect(x0,Math.min(y0,y1),xr-x0,Math.abs(y1-y0)); cx.strokeStyle=axzRgba(zc,(100-bt)/100); cx.lineWidth=bw; cx.strokeRect(x0,Math.min(y0,y1),xr-x0,Math.abs(y1-y0));
    const ym=Y(f.m); if(ym==null) return;
    if(Z.axzMid){ cx.strokeStyle=axzRgba(zc,(100-Math.min(bt+15,95))/100); cx.lineWidth=1; cx.setLineDash([5,4]); cx.beginPath(); cx.moveTo(x0,ym); cx.lineTo(xr,ym); cx.stroke(); cx.setLineDash([]); }
    if(Z.axzBadge){ const touchTxt=z.flipCount>0&&z.preTouch>0?z.preTouch+'+'+z.touch+'\u00d7':z.touch+'\u00d7';
      badges.push({y:ym,txt:(z.isBest?'\u265b ':'')+(f.score>=80?'\u2605 ':'')+(z.dir===1?'RES':'SUP')+' '+f.score+' | '+touchTxt+(f.aligned?' \u25c8':'')+(f.rn?' \u25ce':'')+(f.hv?' \u24cb':''),res:z.dir===1}); } });
  // ---- markers
  cx.font='13px system-ui'; cx.textAlign='center'; cx.textBaseline='middle';
  r.flipMk.forEach(m=>{ const x=X(m.i+off), y=Y(m.p); if(x==null||y==null) return; cx.fillStyle=Z.axzFlipC||'#ffd400'; cx.fillText('\u21c4',x,y); });
  cx.font='10px system-ui';
  r.rejMk.forEach(m=>{ const x=X(m.i+off), y=Y(m.p); if(x==null||y==null) return; cx.fillStyle=m.up?(Z.axzSupC||'#d4af37'):(Z.axzRejC||'#b22833'); cx.fillText(m.up?'\u25b2':'\u25bc',x,y+(m.up?9:-9)); });
  // ---- badges (pills at the right edge)
  cx.font=fs+'px system-ui'; cx.textAlign='left'; cx.textBaseline='middle';
  badges.forEach(b=>{ const w=cx.measureText(b.txt).width+10, h=fs+6, x=Math.max(2,Math.min(xr+2,W-w-2)); cx.fillStyle=b.res?'rgba(45,20,12,.94)':'rgba(24,36,20,.94)'; cx.fillRect(x,b.y-h/2,w,h); cx.fillStyle=b.res?'#FF9575':'#E5C158'; cx.fillText(b.txt,x+5,b.y); });
  // ---- dashboard
  if(Z.axzDash){ const lastC=r.last; let aD=NaN,aP=NaN,aR='-',bD=NaN,bP=NaN,bR='-',cD=NaN,cP=NaN,cR='-',cDet='-',sS=-1,sT=0,sP=NaN,sR='-';
    zs.forEach((z,i)=>{ if(!z.visible) return; const f=fct[i], m=f.m, dd=Math.abs(m-cl), inside=cl>=z.bot&&cl<=z.top, test=(z.dir===1&&lastC.high>=z.bot&&cl<=z.top+.15*atr)||(z.dir===-1&&lastC.low<=z.top&&cl>=z.bot-.15*atr);
      if(inside||test){ if(isNaN(cD)||dd<cD){ cD=dd; cP=m; cR=z.dir===1?'R':'S'; cDet=inside?(z.dir===1?'Inside Res':'Inside Sup'):(z.dir===1?'Testing Res':'Testing Sup'); } }
      else if(m>cl&&(isNaN(aD)||m-cl<aD)){ aD=m-cl; aP=m; aR=z.dir===1?'R':'S'; } else if(m<cl&&(isNaN(bD)||cl-m<bD)){ bD=cl-m; bP=m; bR=z.dir===1?'R':'S'; }
      if(f.score>sS){ sS=f.score; sT=z.touch+z.preTouch; sP=m; sR=z.dir===1?'R':'S'; } });
    const rc=Z.axzResC||'#b22833', sc=Z.axzSupC||'#d4af37', col=q=>q==='R'?rc:q==='S'?sc:'#C9B37E';
    let st='No Active Zones', stc='#F5F5F5'; if(zs.length){ if(!isNaN(cP)){ st=cDet; stc=col(cR); } else if(!isNaN(aP)&&isNaN(bP)){ st='Below All Shelves (Bearish Floor)'; stc=rc; } else if(isNaN(aP)&&!isNaN(bP)){ st='Above All Shelves (Bullish Sky)'; stc=sc; } else if(!isNaN(aP)&&!isNaN(bP)){ st='In Range (Between S & R)'; stc='#FFD400'; } }
    const rows=[['\u25c6 AUTO S/R',zs.length+' active zones','#FFD400','#F5F5F5'],['At Price',isNaN(cP)?'-':cDet+' @'+axzP(cP),'#C9B37E',col(cR)],
      ['Nearest Above',isNaN(aP)?'-':aR+' '+axzP(aP)+'  ('+(aD/atr).toFixed(1)+' ATR)','#C9B37E',col(aR)],['Nearest Below',isNaN(bP)?'-':bR+' '+axzP(bP)+'  ('+(bD/atr).toFixed(1)+' ATR)','#C9B37E',col(bR)],
      ['Strongest Shelf',isNaN(sP)?'-':sR+' '+sS+' | '+sT+'\u00d7  @'+axzP(sP),'#C9B37E','#FFD400'],['Structure State',st,'#C9B37E',stc]];
    const dfs=Z.axzDSz==='Tiny'?8:Z.axzDSz==='Normal'?12:10, rh=dfs+7; cx.font=dfs+'px system-ui'; let w0=0,w1=0; rows.forEach(q=>{ w0=Math.max(w0,cx.measureText(q[0]).width); w1=Math.max(w1,cx.measureText(q[1]).width); }); w0+=12; w1+=12;
    const tx=/Left/.test(Z.axzDPos)?4:Math.max(2,W-w0-w1-4), ty=/Bottom/.test(Z.axzDPos)?Math.max(2,H-rows.length*rh-4):4;
    rows.forEach((q,k)=>{ const y=ty+k*rh; cx.fillStyle='rgba(20,17,11,.92)'; cx.fillRect(tx,y,w0+w1,rh-1); cx.fillStyle=q[2]; cx.fillText(q[0],tx+6,y+rh/2); cx.fillStyle=q[3]; cx.fillText(q[1],tx+w0+6,y+rh/2); }); }
  cx.globalAlpha=1; cx.restore();
}
STRATS.axz={label:'Support Resistance Confluence Zones \u00b7 pivot-cluster zones scored 0-100, retests, S/R flips, POC midline, badges',short:'S/R Confluence Zones',own:true,
  defs:{limit:false,useSl:false,axzAuto:true,axzFlip:true,axzMaxLv:4,axzMinSc:0,axzBadge:true,axzBadgeSz:'Small',axzMid:true,axzMidMode:'Volume POC Anchor',axzTent:false,axzFlipMk:false,axzRej:false,axzDash:false,
    axzPiv:10,axzRight:3,axzAtr:14,axzTol:.35,axzMinH:.08,axzMaxH:1.5,axzHtf:true,axzHtfMode:'Auto (Higher TF)',axzHtfMan:'4h',axzHtfTol:.5,axzRnd:true,axzRndTol:.15,axzVol:true,
    axzSep:5,axzExt:22,axzBuf:100,axzFar:20,axzFade:3,axzMax:12,axzDPos:'Top Right',axzDSz:'Small',axzResC:'#b22833',axzSupC:'#d4af37',axzResT:85,axzSupT:85,axzFlipC:'#ffd400',axzRejC:'#b22833'},
  inputs:(b,d)=>{
    fld(b,d,'axzAuto','chk','Auto-tune pivot length to timeframe'); fld(b,d,'axzFlip','chk','Flip broken zones (S <-> R)'); fld(b,d,'axzMaxLv','num','Max active levels per direction',{min:1,max:10,step:1}); fld(b,d,'axzMinSc','num','Min confluence score to display',{min:0,max:90,step:10});
    fld(b,d,'axzBadge','chk','Show confluence badges'); fld(b,d,'axzBadgeSz','sel','Badge text size',{opts:['Tiny','Small','Normal']}); fld(b,d,'axzMid','chk','Show zone midline / anchor'); fld(b,d,'axzMidMode','sel','Midline mode',{opts:['Volume POC Anchor','50% Geometric Midline']});
    fld(b,d,'axzTent','chk','Show developing (single-pivot) levels'); fld(b,d,'axzFlipMk','chk','Show flip markers'); fld(b,d,'axzRej','chk','Show rejection / sweep markers'); fld(b,d,'axzDash','chk','Show dashboard');
    fld(b,d,'axzPiv','num','Pivot length (bars, when auto-tune is off)',{min:3,max:60,step:1}); fld(b,d,'axzRight','num','Confirmation bars',{min:1,max:10,step:1}); fld(b,d,'axzAtr','num','ATR length',{min:2,max:100,step:1});
    fld(b,d,'axzTol','num','Cluster tolerance (x ATR)',{min:.05,max:2,step:.05}); fld(b,d,'axzMinH','num','Min zone height (x ATR)',{min:.01,max:1,step:.01}); fld(b,d,'axzMaxH','num','Max zone height (x ATR)',{min:.5,max:8,step:.1});
    fld(b,d,'axzHtf','chk','Boost zones aligned with HTF structure'); fld(b,d,'axzHtfMode','sel','HTF resolution',{opts:['Auto (Higher TF)','Manual']}); fld(b,d,'axzHtfMan','sel','Manual HTF timeframe',{opts:Object.keys(AXZ_TFS)}); fld(b,d,'axzHtfTol','num','HTF alignment tolerance (x ATR)',{min:.1,max:3,step:.1});
    fld(b,d,'axzRnd','chk','Boost zones near round numbers'); fld(b,d,'axzRndTol','num','Round number tolerance (x ATR)',{min:.02,max:1,step:.01}); fld(b,d,'axzVol','chk','Boost zones formed on high volume');
    fld(b,d,'axzSep','num','Min bars between retests',{min:1,max:30,step:1}); fld(b,d,'axzExt','num','Zone forward extension (bars)',{min:5,max:100,step:1}); fld(b,d,'axzBuf','num','Unpaired pivot memory (bars)',{min:10,max:400,step:1});
    fld(b,d,'axzFar','num','Auto-cull distance (x ATR)',{min:5,max:60,step:1}); fld(b,d,'axzFade','num','Fade start distance (x ATR)',{min:.5,max:20,step:.5}); fld(b,d,'axzMax','num','Max zones in memory',{min:2,max:30,step:1});
    fld(b,d,'axzDPos','sel','Dashboard position',{opts:['Top Right','Top Left','Bottom Right','Bottom Left']}); fld(b,d,'axzDSz','sel','Dashboard text size',{opts:['Tiny','Small','Normal']});
    fld(b,d,'axzResC','col','Resistance colour'); fld(b,d,'axzResT','num','Resistance fill transparency (%)',{min:0,max:100,step:1}); fld(b,d,'axzSupC','col','Support colour'); fld(b,d,'axzSupT','num','Support fill transparency (%)',{min:0,max:100,step:1}); fld(b,d,'axzFlipC','col','Flip marker colour'); fld(b,d,'axzRejC','col','Rejection marker colour'); },
  sig:()=>0};
try{ DESC.axz='Strategy \u00b7 pivot-cluster support / resistance zones scored 0-100 with retests, role flips and POC midline'; }catch(e){}
{ const _axD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='axzview') return axzDraw(d,X,Y,W,H); return _axD.apply(this,arguments); };
  const _axR=recomputeExtras; recomputeExtras=function(){ _axR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='axz'&&stVis(Z)) scriptBoxes.push({type:'axzview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('axz strategy failed',err); window.__axzErr=err; }


// =====================================================================================
// [pgs] STRATEGY · "Premium GOLD Signal" (EMA + RSI signals, SL + 3 TPs, Order Blocks, FVG)   (self-contained: every name starts with pgs / PGS)
// BUY when close > EMA and RSI > level (first bar of the condition), SELL on the opposite. Each signal gets Entry, Stop Loss
// (beyond the previous N candles) and TP1-TP3 (fixed price step), with TP / SL hit dots. Also Order Blocks (swing break),
// Fair Value Gaps, EMA line and trend-coloured candles. Hooks: STRATS.pgs + draw + recomputeExtras.
// =====================================================================================
try{
const PGS_KEYS=['pgsEma','pgsRsi','pgsLvl','pgsOne','pgsSlLb','pgsSlBuf','pgsTp','pgsTpAtr','pgsOB','pgsSw','pgsMaxOB','pgsFVG','pgsMinAtr','pgsMaxFVG','pgsRemMit'];
function pgsCompute(c,Z,live){
  const n=c.length, EL=Math.max(1,Math.round(Z.pgsEma)||9), RL=Math.max(1,Math.round(Z.pgsRsi)||14), SLB=Math.max(1,Math.round(Z.pgsSlLb)||4), SW=Math.max(2,Math.round(Z.pgsSw)||10);
  const ema=new Array(n).fill(null), al=2/(EL+1); { let p=null; for(let i=0;i<n;i++){ p=p==null?c[i].close:al*c[i].close+(1-al)*p; ema[i]=p; } }
  const rsi=new Array(n).fill(null); { let ug=0,dg=0,pu=null,pd=null; for(let i=1;i<n;i++){ const ch=c[i].close-c[i-1].close, u=Math.max(ch,0), d=Math.max(-ch,0);
      if(pu==null){ ug+=u; dg+=d; if(i===RL){ pu=ug/RL; pd=dg/RL; } } else { pu=(pu*(RL-1)+u)/RL; pd=(pd*(RL-1)+d)/RL; }
      if(pu!=null) rsi[i]=pd===0?100:pu===0?0:100-100/(1+pu/pd); } }
  const atr=new Array(n).fill(null); { let s=0,p=null; for(let i=0;i<n;i++){ const tr=i?Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)):c[i].high-c[i].low;
      if(p==null){ s+=tr; if(i===13){ p=s/14; atr[i]=p; } } else { p=(p*13+tr)/14; atr[i]=p; } } }
  const bull=new Uint8Array(n), bear=new Uint8Array(n); for(let i=0;i<n;i++){ if(rsi[i]==null) continue; bull[i]=(c[i].close>ema[i]&&rsi[i]>Z.pgsLvl)?1:0; bear[i]=(c[i].close<ema[i]&&rsi[i]<Z.pgsLvl)?1:0; }
  const bullOB=[],bearOB=[],bullF=[],bearF=[],dead=[], trades=[], sigMap=new Map();
  let swH=NaN,swHB=0,swHU=true,swL=NaN,swLB=0,swLU=true, dir=0, tr=null, sl=0,tp=[0,0,0],hit=[false,false,false], entryBar=-1;
  const upd=(arr,isBull,pd,pu,t)=>{ for(let k=arr.length-1;k>=0;k--){ const z=arr[k], broken=isBull?pd<z.bot:pu>z.top; if(broken){ arr.splice(k,1); if(!Z.pgsRemMit){ z.end=t; dead.push(z); if(dead.length>60) dead.shift(); } } } };
  const push=(arr,z,mx)=>{ arr.push(z); if(arr.length>mx) arr.shift(); };
  for(let t=0;t<n;t++){ const b=c[t], conf=!live||t<n-1;
    // swings
    const p=t-SW; if(p-SW>=0){ let ph=true,pl=true; for(let m=1;m<=SW&&(ph||pl);m++){ if(!(c[p].high>c[p-m].high)) ph=false; if(!(c[p].low<c[p-m].low)) pl=false; if(!(c[p].high>=c[p+m].high)) ph=false; if(!(c[p].low<=c[p+m].low)) pl=false; }
      if(ph){ swH=c[p].high; swHB=p; swHU=false; } if(pl){ swL=c[p].low; swLB=p; swLU=false; } }
    upd(bullOB,true,b.close,b.close,t); upd(bearOB,false,b.close,b.close,t);
    if(Z.pgsOB&&!swHU&&b.close>swH&&conf){ swHU=true; const span=Math.min(t-swHB,200); let top=c[t-1]?c[t-1].high:b.high, bot=c[t-1]?c[t-1].low:b.low, idx=1;
      for(let i=1;i<=span&&t-i>=0;i++){ if(c[t-i].low<bot){ bot=c[t-i].low; top=c[t-i].high; idx=i; } } push(bullOB,{x0:t-idx,top,bot,end:null,bull:true,txt:'Bull OB',kind:'ob'},Z.pgsMaxOB); }
    if(Z.pgsOB&&!swLU&&b.close<swL&&conf){ swLU=true; const span=Math.min(t-swLB,200); let top=c[t-1]?c[t-1].high:b.high, bot=c[t-1]?c[t-1].low:b.low, idx=1;
      for(let i=1;i<=span&&t-i>=0;i++){ if(c[t-i].high>top){ top=c[t-i].high; bot=c[t-i].low; idx=i; } } push(bearOB,{x0:t-idx,top,bot,end:null,bull:false,txt:'Bear OB',kind:'ob'},Z.pgsMaxOB); }
    upd(bullF,true,b.low,b.high,t); upd(bearF,false,b.low,b.high,t);
    const mg=(atr[t]||0)*Z.pgsMinAtr;
    if(Z.pgsFVG&&conf&&t>=2){ if(b.low>c[t-2].high&&(b.low-c[t-2].high)>=mg) push(bullF,{x0:t-2,top:b.low,bot:c[t-2].high,end:null,bull:true,txt:'FVG',kind:'fvg'},Z.pgsMaxFVG);
      if(b.high<c[t-2].low&&(c[t-2].low-b.high)>=mg) push(bearF,{x0:t-2,top:c[t-2].low,bot:b.high,end:null,bull:false,txt:'FVG',kind:'fvg'},Z.pgsMaxFVG); }
    // signals
    const buy=conf&&bull[t]&&!(t>0&&bull[t-1])&&(!Z.pgsOne||dir!==1), sell=conf&&bear[t]&&!(t>0&&bear[t-1])&&(!Z.pgsOne||dir!==-1);
    // tp / sl tracking
    if(dir!==0&&t>entryBar){ const isL=dir===1; let slH=false,tpA=false;
      if(isL?b.low<=sl:b.high>=sl){ slH=true; } else { for(let k=0;k<3;k++) if(!hit[k]&&(isL?b.high>=tp[k]:b.low<=tp[k])){ hit[k]=true; tpA=true; tr.hit[k]=t; } }
      if(tpA) tr.dots.push({i:t,above:isL,tp:true}); if(slH){ tr.slHit=t; tr.dots.push({i:t,above:!isL,tp:false}); }
      if(slH||hit[2]){ dir=0; tr.end=t; } }
    if((buy||sell)&&t>=SLB){ let lo=Infinity,hi=-Infinity; for(let i=t-SLB;i<=t-1;i++){ if(c[i].low<lo) lo=c[i].low; if(c[i].high>hi) hi=c[i].high; }
      const d=buy?1:-1, e=b.close, step=(Z.pgsTpAtr>0&&atr[t])?atr[t]*Z.pgsTpAtr:Z.pgsTp;
      dir=d; entryBar=t; sl=buy?lo-Z.pgsSlBuf:hi+Z.pgsSlBuf; tp=[e+d*step,e+d*step*2,e+d*step*3]; hit=[false,false,false];
      tr={i:t,v:d,e,sl,lv:tp.slice(),hit:[null,null,null],slHit:null,end:null,dots:[]}; trades.push(tr); sigMap.set(t,d); }
  }
  return {n,ema,bull,bear,trades,sigMap,obs:bullOB.concat(bearOB),fvgs:bullF.concat(bearF),dead,dir};
}
const pgsCache={sig:{},draw:{}};
function pgsGet(slot,c,Z,live){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close].concat(PGS_KEYS.map(k=>Z[k])).join('|'), m=pgsCache[slot];
  if(!m[Z.sid]||m[Z.sid].k!==key) m[Z.sid]={k:key,r:pgsCompute(c,Z,live)}; return m[Z.sid].r; }
const pgsRgba=(h,a)=>{ const v=parseInt(String(h||'#000000').replace('#',''),16)||0; return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+Math.max(0,Math.min(1,a)).toFixed(3)+')'; };
const pgsP=v=>{ const a=Math.abs(v); return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:a>=1000?2:a>=1?4:6}); };
function pgsDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<40) return; const r=pgsGet('draw',c,Z,true), n=r.n, ext=Math.max(1,Math.round(Z.pgsExt)||10), xe=n-1+ext;
  const slC=Z.pgsSlC||'#f44336', tpC=Z.pgsTpC||'#43d443', enC=Z.pgsEnC||'#9e9e9e', emC=Z.pgsEmC||'#2962ff';
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  // ---- trend-coloured candles (drawn over the chart candles; standard candles only)
  if(Z.pgsBars&&ctype===0){ let lastX=null; const xs=X(n-1), xp=X(n-2); const sp=(xs!=null&&xp!=null)?xs-xp:6, bw=Math.max(1,Math.round(sp*.72)|1);
    for(let i=n-1;i>=Math.max(0,n-2500);i--){ const x=X(i); if(x==null) continue; if(x<-bw) break; if(x>W+bw) continue; const b=c[i], col=r.bull[i]?tpC:r.bear[i]?slC:'#787b86',
        yo=Y(b.open), yc=Y(b.close), yh=Y(b.high), yl=Y(b.low); if(yo==null||yc==null||yh==null||yl==null) continue;
      cx.fillStyle=col; cx.fillRect(Math.round(x)-Math.floor(bw/2)-1,Math.min(yo,yc)-.5,bw+2,Math.max(1,Math.abs(yc-yo))+1); cx.fillRect(Math.round(x)-.5,yh,1.5,yl-yh); } }
  // ---- order blocks + FVGs
  cx.font='9px system-ui'; cx.textAlign='left'; cx.textBaseline='top';
  const box=z=>{ const col=z.kind==='ob'?(z.bull?(Z.pgsObBu||'#2962ff'):(Z.pgsObBe||'#e040fb')):(z.bull?(Z.pgsFvBu||'#00bcd4'):(Z.pgsFvBe||'#ff9800')), x0=X(z.x0), x1=z.end!=null?X(z.end):X(xe), y0=Y(z.top), y1=Y(z.bot); if(x0==null||x1==null||y0==null||y1==null) return;
    cx.fillStyle=pgsRgba(col,.18); cx.fillRect(x0,Math.min(y0,y1),Math.max(1,x1-x0),Math.abs(y1-y0)); cx.strokeStyle=pgsRgba(col,.6); cx.lineWidth=1; cx.strokeRect(x0+.5,Math.min(y0,y1)+.5,Math.max(1,x1-x0),Math.abs(y1-y0)); cx.fillStyle=col; cx.fillText(z.txt,x0+3,Math.min(y0,y1)+2); };
  r.dead.forEach(box); r.obs.forEach(box); r.fvgs.forEach(box);
  // ---- EMA
  if(Z.pgsShowEma){ cx.strokeStyle=emC; cx.lineWidth=2; cx.beginPath(); let st=false; for(let i=Math.max(0,n-3000);i<n;i++){ const x=X(i), y=Y(r.ema[i]); if(x==null||y==null){ st=false; continue; } if(x<-20) continue; if(x>W+20) break; if(!st){ cx.moveTo(x,y); st=true; } else cx.lineTo(x,y); } cx.stroke(); }
  // ---- latest trade: zones, levels, hit dots
  const T=r.trades[r.trades.length-1];
  if(T){ const active=T.end==null, xEnd=active?xe:T.end, x0=X(T.i), x1=X(xEnd);
    if(Z.pgsLvls&&x0!=null&&x1!=null){ const yE=Y(T.e), yS=Y(T.sl), y3=Y(T.lv[2]);
      if(yE!=null&&yS!=null&&y3!=null){ const fb=Math.max(0,Math.round(Z.pgsFade)||0), fs=Math.max(T.i,xEnd-fb), xf=X(fs), a0=(100-Z.pgsZT)/100;
        const zone=(ya,yb,col)=>{ const top=Math.min(ya,yb), h=Math.abs(yb-ya); if(fs>T.i){ cx.fillStyle=pgsRgba(col,a0); cx.fillRect(x0,top,xf-x0,h); } const span=xEnd-fs, SEG=6;
          for(let k=0;k<SEG;k++){ const a=fs+Math.round(span*k/SEG), b2=fs+Math.round(span*(k+1)/SEG); if(b2>a){ const tt=Z.pgsZT+(100-Z.pgsZT)*(k+1)/(SEG+1); cx.fillStyle=pgsRgba(col,(100-tt)/100); const xa=X(a), xb=X(b2); cx.fillRect(xa,top,xb-xa,h); } } };
        zone(yE,yS,slC); zone(yE,y3,tpC);
        const lv=[[T.sl,slC,'Stop Loss'],[T.e,enC,'Entry'],[T.lv[0],tpC,'Take Profit 1'],[T.lv[1],tpC,'Take Profit 2'],[T.lv[2],tpC,'Take Profit 3']]; cx.font='10px system-ui'; cx.textBaseline='middle';
        lv.forEach(([p,col,nm])=>{ const y=Y(p); if(y==null) return; cx.strokeStyle=col; cx.lineWidth=1; cx.beginPath(); cx.moveTo(x0,y); cx.lineTo(x1,y); cx.stroke();
          const lab=nm+': '+pgsP(p), w=cx.measureText(lab).width+8, lx=Math.max(2,Math.min(x1+2,W-w-2)); cx.fillStyle=col; cx.fillRect(lx,y-8,w,16); cx.fillStyle='#fff'; cx.fillText(lab,lx+4,y); }); } }
    if(Z.pgsHits) T.dots.forEach(q=>{ const x=X(q.i), y=Y(q.above?c[q.i].high:c[q.i].low); if(x==null||y==null) return; cx.fillStyle=q.tp?tpC:slC; cx.beginPath(); cx.arc(x,y+(q.above?-8:8),3,0,6.2832); cx.fill(); }); }
  cx.globalAlpha=1; cx.restore();
}
STRATS.pgs={label:'Premium GOLD Signal \u00b7 EMA + RSI BUY / SELL with Entry, SL, TP1-3, Order Blocks and FVG',short:'Premium GOLD Signal',own:true,
  defs:{limit:false,useSl:false,pgsEma:9,pgsRsi:14,pgsLvl:50,pgsOne:false,pgsSlLb:4,pgsSlBuf:0,pgsTp:10,pgsTpAtr:0,pgsLvls:true,pgsHits:true,pgsExt:10,pgsZT:80,pgsFade:15,pgsBars:true,pgsShowEma:true,
    pgsSlC:'#f44336',pgsTpC:'#43d443',pgsEnC:'#9e9e9e',pgsEmC:'#2962ff',pgsOB:true,pgsSw:10,pgsMaxOB:3,pgsObBu:'#2962ff',pgsObBe:'#e040fb',pgsFVG:true,pgsMinAtr:.25,pgsMaxFVG:3,pgsFvBu:'#00bcd4',pgsFvBe:'#ff9800',pgsRemMit:true},
  inputs:(b,d)=>{
    fld(b,d,'pgsEma','num','EMA length',{min:1,max:300,step:1}); fld(b,d,'pgsRsi','num','RSI length',{min:1,max:100,step:1}); fld(b,d,'pgsLvl','num','RSI level',{min:1,max:99,step:1}); fld(b,d,'pgsOne','chk','Hide same-direction signals while a trade is active');
    fld(b,d,'pgsSlLb','num','SL lookback (previous candles)',{min:1,max:50,step:1}); fld(b,d,'pgsSlBuf','num','SL buffer (price)',{min:0,step:.1});
    fld(b,d,'pgsTp','num','TP step (price): TP1 = 1x, TP2 = 2x, TP3 = 3x',{min:.0001,step:.5}); fld(b,d,'pgsTpAtr','num','TP step as x ATR(14) instead (0 = use price step)',{min:0,max:20,step:.1});
    fld(b,d,'pgsLvls','chk','Show Entry / SL / TP zones'); fld(b,d,'pgsHits','chk','Mark TP / SL hits'); fld(b,d,'pgsExt','num','Extend beyond current bar',{min:1,max:100,step:1}); fld(b,d,'pgsZT','num','Zone transparency',{min:0,max:100,step:1}); fld(b,d,'pgsFade','num','Fade length on right (bars)',{min:0,max:100,step:1});
    fld(b,d,'pgsBars','chk','Colour candles by trend'); fld(b,d,'pgsShowEma','chk','Show EMA');
    fld(b,d,'pgsSlC','col','Stop Loss colour'); fld(b,d,'pgsTpC','col','Take Profit colour'); fld(b,d,'pgsEnC','col','Entry colour'); fld(b,d,'pgsEmC','col','EMA colour');
    fld(b,d,'pgsOB','chk','Show Order Blocks'); fld(b,d,'pgsSw','num','OB swing length',{min:2,max:50,step:1}); fld(b,d,'pgsMaxOB','num','Max OBs per side',{min:1,max:20,step:1}); fld(b,d,'pgsObBu','col','Bullish OB colour'); fld(b,d,'pgsObBe','col','Bearish OB colour');
    fld(b,d,'pgsFVG','chk','Show Fair Value Gaps'); fld(b,d,'pgsMinAtr','num','Min FVG size (x ATR)',{min:0,max:5,step:.05}); fld(b,d,'pgsMaxFVG','num','Max FVGs per side',{min:1,max:20,step:1}); fld(b,d,'pgsFvBu','col','Bullish FVG colour'); fld(b,d,'pgsFvBe','col','Bearish FVG colour');
    fld(b,d,'pgsRemMit','chk','Remove mitigated OBs / filled FVGs'); },
  sig:(c,i,n,Z)=>{ if(c.length<40) return 0; return pgsGet('sig',c,Z,false).sigMap.get(i)||0; }};
try{ DESC.pgs='Strategy \u00b7 EMA + RSI BUY / SELL with Entry, Stop Loss, TP1-3 levels, Order Blocks and FVG'; }catch(e){}
{ const _pgD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='pgsview') return pgsDraw(d,X,Y,W,H); return _pgD.apply(this,arguments); };
  const _pgR=recomputeExtras; recomputeExtras=function(){ _pgR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='pgs'&&stVis(Z)) scriptBoxes.push({type:'pgsview',pts:[],o:Z}); }); }; }
}catch(err){ console.error('pgs strategy failed',err); window.__pgsErr=err; }


// =====================================================================================
// [pdo] STRATEGY · "Pattern Setups": Option 1 = Double Top (mirror: Double Bottom), Option 2 = Bearish Order Block + FVG + BOS
// (mirror: Bullish).  Turn either option on, or both.  Every setup gets Entry, Stop (risk box) and Target (reward box); BUY / SELL
// arrows + TP / SL exit dots are added to the chart.  Long / Short switches are the usual strategy ones (Detect Long / Short Trades).
// (self-contained: every name starts with pdo / PDO)   Hooks: STRATS.pdo (+ watch) + draw + recomputeExtras + runStrategy wrapper.
// =====================================================================================
try{
const PDO_KEYS=['pdoDT','pdoOB','pdoDtSw','pdoDtTol','pdoDtMin','pdoDtMax','pdoDtDepth','pdoDtWait','pdoDtRt','pdoDtRtBars','pdoDtRtTol','pdoDtMeas','pdoObSw','pdoObLeg','pdoObFvg','pdoObWait','pdoObRR','pdoSlBuf','pdoOne','long','short'];
function pdoAtr(c){ const n=c.length,o=new Array(n).fill(0); let s=0,p=null; for(let i=0;i<n;i++){ const tr=i?Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)):c[i].high-c[i].low;
    if(p==null){ s+=tr; if(i===13){ p=s/14; o[i]=p; } } else { p=(p*13+tr)/14; o[i]=p; } } return o; }
function pdoPiv(c,sw,hi){ const n=c.length,o=new Uint8Array(n); for(let p=sw;p<n-sw;p++){ const v=hi?c[p].high:c[p].low; let ok=true;
    for(let m=1;m<=sw&&ok;m++){ if(hi){ if(!(v>c[p-m].high)||!(v>=c[p+m].high)) ok=false; } else { if(!(v<c[p-m].low)||!(v<=c[p+m].low)) ok=false; } } o[p]=ok?1:0; } return o; }
function pdoCompute(c,Z,live){
  const n=c.length; if(n<60) return {n,trades:[]};
  const atr=pdoAtr(c), dtOn=!!Z.pdoDT, obOn=!!Z.pdoOB, dSw=Math.max(2,Math.round(Z.pdoDtSw)||6), oSw=Math.max(2,Math.round(Z.pdoObSw)||5);
  const pH1=dtOn?pdoPiv(c,dSw,true):null, pL1=dtOn?pdoPiv(c,dSw,false):null, pH2=obOn?pdoPiv(c,oSw,true):null, pL2=obOn?pdoPiv(c,oSw,false):null;
  let lastPH=null,lastPL=null,lastSH=null,lastSL=null; const trades=[], pend=[];
  for(let t=0;t<n;t++){ const b=c[t], a=atr[t], conf=!live||t<n-1;
    for(const T of trades){ if(T.end==null&&T.i<t){ const sh=T.v<0, slH=sh?b.high>=T.sl:b.low<=T.sl, tpH=sh?b.low<=T.tp:b.high>=T.tp; if(slH){ T.res='SL'; T.end=t; } else if(tpH){ T.res='TP'; T.end=t; } } }
    if(!(a>0)) continue;
    const busy=()=>!!Z.pdoOne&&trades.some(x=>x.end==null), buf=Z.pdoSlBuf*a;
    const open=(v,kind,e,sl,tp,info)=>{ if(!(v<0?(sl>e&&tp<e):(sl<e&&tp>e))) return false; trades.push({i:t,v,e,sl,tp,kind,info,res:null,end:null}); return true; };
    // ---------- Option 1: Double Top / Bottom ----------
    if(dtOn&&t-dSw>=0){ const p=t-dSw;
      const dtNew=(up,p)=>{ const prev=up?lastPH:lastPL, cur={p,v:up?c[p].high:c[p].low}; if(up) lastPH=cur; else lastPL=cur; if(!prev) return; if(up?!Z.short:!Z.long) return;
        const gap=p-prev.p; if(gap<Z.pdoDtMin||gap>Z.pdoDtMax) return; if(Math.abs(cur.v-prev.v)>Z.pdoDtTol*a) return;
        let neck=up?Infinity:-Infinity; for(let k=prev.p;k<=p;k++){ if(up){ if(c[k].low<neck) neck=c[k].low; } else if(c[k].high>neck) neck=c[k].high; }
        const lvl=up?Math.max(cur.v,prev.v):Math.min(cur.v,prev.v), shallow=up?Math.min(cur.v,prev.v):Math.max(cur.v,prev.v);
        for(let k=prev.p+1;k<p;k++){ if(up?c[k].high>lvl:c[k].low<lvl) return; }
        if((up?shallow-neck:neck-shallow)<Z.pdoDtDepth*a) return;
        for(let k=p+1;k<t;k++){ if(up?c[k].close<neck:c[k].close>neck) return; }
        const avg=(cur.v+prev.v)/2; pend.push({kind:'dt',up,p1:prev.p,p2:p,a:prev.v,b:cur.v,neck,top:lvl,h:up?avg-neck:neck-avg,t0:t,stage:0,bb:-1}); };
      if(pH1[p]) dtNew(true,p); if(pL1[p]) dtNew(false,p); }
    // ---------- Option 2: BOS + Order Block + FVG ----------
    if(obOn){ const p=t-oSw; if(p>=0){ if(pL2[p]) lastSL={p,v:c[p].low,used:false}; if(pH2[p]) lastSH={p,v:c[p].high,used:false}; }
      const legMin=Z.pdoObLeg*a;
      if(lastSL&&!lastSL.used&&b.close<lastSL.v){ lastSL.used=true; if(Z.short){ const Lb=lastSL.p; let hI=-1,hv=-Infinity; for(let k=Lb+1;k<t;k++) if(c[k].high>hv){ hv=c[k].high; hI=k; }
          if(hI>0){ let lo=Infinity; for(let k=hI;k<=t;k++) if(c[k].low<lo) lo=c[k].low;
            if(hv-lo>=legMin){ let ob=hI; for(let k=hI;k>=Math.max(Lb+1,hI-5);k--){ if(c[k].close>c[k].open){ ob=k; break; } }
              let fvg=null; for(let k=ob+2;k<=t;k++){ if(c[k].high<c[k-2].low){ fvg={x0:k-2,x1:k,top:c[k-2].low,bot:c[k].high}; break; } }
              if(fvg||!Z.pdoObFvg) pend.push({kind:'ob',up:true,ob:{i:ob,top:c[ob].high,bot:c[ob].low},fvg,bos:{from:Lb,to:t,price:lastSL.v},t0:t,ext:lo}); } } } }
      if(lastSH&&!lastSH.used&&b.close>lastSH.v){ lastSH.used=true; if(Z.long){ const Hb=lastSH.p; let lI=-1,lv=Infinity; for(let k=Hb+1;k<t;k++) if(c[k].low<lv){ lv=c[k].low; lI=k; }
          if(lI>0){ let hi=-Infinity; for(let k=lI;k<=t;k++) if(c[k].high>hi) hi=c[k].high;
            if(hi-lv>=legMin){ let ob=lI; for(let k=lI;k>=Math.max(Hb+1,lI-5);k--){ if(c[k].close<c[k].open){ ob=k; break; } }
              let fvg=null; for(let k=ob+2;k<=t;k++){ if(c[k].low>c[k-2].high){ fvg={x0:k-2,x1:k,top:c[k].low,bot:c[k-2].high}; break; } }
              if(fvg||!Z.pdoObFvg) pend.push({kind:'ob',up:false,ob:{i:ob,top:c[ob].high,bot:c[ob].low},fvg,bos:{from:Hb,to:t,price:lastSH.v},t0:t,ext:hi}); } } } } }
    // ---------- step every pending setup ----------
    for(let k=pend.length-1;k>=0;k--){ const s=pend[k];
      if(s.kind==='dt'){ const up=s.up;
        if(t-s.p2>Z.pdoDtWait||(up?b.close>s.top:b.close<s.top)){ pend.splice(k,1); continue; }
        const brk=up?b.close<s.neck:b.close>s.neck;
        if(s.stage===0){ if(brk){ if(!Z.pdoDtRt){ if(conf&&!busy()){ const e=b.close, tp=up?s.neck-s.h*Z.pdoDtMeas:s.neck+s.h*Z.pdoDtMeas; open(up?-1:1,'dt',e,up?s.top+buf:s.top-buf,tp,s); } pend.splice(k,1); } else { s.stage=1; s.bb=t; } } }
        else { if(t-s.bb>Z.pdoDtRtBars||(up?b.close>s.neck:b.close<s.neck)){ pend.splice(k,1); continue; }
          const touch=up?b.high>=s.neck-Z.pdoDtRtTol*a:b.low<=s.neck+Z.pdoDtRtTol*a;
          if(touch&&conf&&!busy()){ const e=b.close, tp=up?s.neck-s.h*Z.pdoDtMeas:s.neck+s.h*Z.pdoDtMeas, sl=up?Math.max(b.high,s.neck)+buf:Math.min(b.low,s.neck)-buf; open(up?-1:1,'dt',e,sl,tp,s); pend.splice(k,1); } } }
      else if(t>s.t0){ const up=s.up;   // up = bearish setup (short)
        if(up?b.close>s.ob.top:b.close<s.ob.bot){ pend.splice(k,1); continue; } if(t-s.t0>Z.pdoObWait){ pend.splice(k,1); continue; }
        s.ext=up?Math.min(s.ext,b.low):Math.max(s.ext,b.high);
        const ent=up?(b.high>=s.ob.bot&&b.close<b.open):(b.low<=s.ob.top&&b.close>b.open);
        if(ent&&conf&&!busy()){ const e=b.close, sl=up?s.ob.top+buf:s.ob.bot-buf, risk=Math.abs(sl-e), tp=up?Math.min(s.ext,e-Z.pdoObRR*risk):Math.max(s.ext,e+Z.pdoObRR*risk);
          if(open(up?-1:1,'ob',e,sl,tp,s)) trades[trades.length-1].liq=(up?s.ext<=e-Z.pdoObRR*risk:s.ext>=e+Z.pdoObRR*risk); pend.splice(k,1); } } }
  }
  return {n,trades};
}
const pdoCache={sig:{},draw:{}};
function pdoGet(slot,c,Z,live){ const l=c[c.length-1], key=[c.length,c[0].time,l.time,l.high,l.low,l.close].concat(PDO_KEYS.map(k=>Z[k])).join('|'), m=pdoCache[slot];
  if(!m[Z.sid]||m[Z.sid].k!==key) m[Z.sid]={k:key,r:pdoCompute(c,Z,live)}; return m[Z.sid].r; }
const pdoRgba=(h,a)=>{ const v=parseInt(String(h||'#000000').replace('#',''),16)||0; return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+Math.max(0,Math.min(1,a)).toFixed(3)+')'; };
function pdoDraw(d,X,Y,W,H){
  const Z=d.o, c=candles; if(!c||c.length<60) return; const r=pdoGet('draw',c,Z,true), n=r.n, ext=Math.max(2,Math.round(Z.pdoExt)||12), list=r.trades.slice(-Math.max(1,Math.round(Z.pdoShow)||1));
  const riskC=Z.pdoRiskC||'#ef5350', rewC=Z.pdoRewC||'#26a69a', obC=Z.pdoObC||'#9e9e9e', fvC=Z.pdoFvC||'#fdd835', ink=Z.pdoInk||'#2962ff';
  const lm=Z.pdoLbl||'Full', none=lm==='None', full=lm==='Full', shapes=Z.pdoPat!==false, boxW=Math.max(5,Math.round(Z.pdoBoxW)||30);
  cx.save(); cx.beginPath(); cx.rect(0,0,W,H); cx.clip(); cx.setLineDash([]); cx.lineJoin='round';
  const xs=X(n-1), xp=X(n-2), sp=(xs!=null&&xp!=null)?Math.abs(xs-xp):6;
  // small label with a dark pill behind it so text stays readable and never turns into a wall of overlapping words
  const pill=(txt,x,y,col,right)=>{ cx.font='9px system-ui'; cx.textBaseline='middle'; cx.textAlign='left'; const w=cx.measureText(txt).width+6, lx=right?x-w:x; cx.globalAlpha=.82; cx.fillStyle='#0b0f1a'; cx.fillRect(lx,y-6,w,12); cx.globalAlpha=1; cx.fillStyle=col; cx.fillText(txt,lx+3,y); };
  list.forEach((T,k)=>{ const latest=k===list.length-1, endBar=Math.min(T.end!=null?T.end:n-1+ext,T.i+boxW), x0=X(T.i), xEnd=X(endBar), ye=Y(T.e), ys=Y(T.sl), yt=Y(T.tp); if(x0==null||xEnd==null||ye==null||ys==null||yt==null) return;
    const wd=Math.max(2,xEnd-x0), sh=T.v<0, s=T.info, rr=Math.abs(T.tp-T.e)/Math.abs(T.sl-T.e), lab=latest&&!none, a0=latest?1:.45;
    // ---- pattern shapes (latest setup only, so older setups never pile up)
    if(shapes&&latest){
      if(T.kind==='dt'){ const xa=X(s.p1), xb=X(s.p2), yn=Y(s.neck), ya=Y(s.a), yb=Y(s.b);
        if(xa!=null&&xb!=null&&yn!=null&&ya!=null&&yb!=null){ const rad=Math.max(8,Math.min(16,sp*2.2));
          cx.strokeStyle=pdoRgba(ink,.9); cx.lineWidth=1.5; [[xa,ya,s.up?'Top 1':'Bottom 1'],[xb,yb,s.up?'Top 2':'Bottom 2']].forEach(([x,y,tx])=>{ cx.beginPath(); cx.arc(x,y,rad,0,6.2832); cx.stroke(); if(full) pill(tx,x-14,y+(s.up?-rad-9:rad+9),ink); });
          cx.strokeStyle=pdoRgba('#cfd2d6',.9); cx.lineWidth=2; cx.beginPath(); cx.moveTo(xa-4,yn); cx.lineTo(xEnd,yn); cx.stroke(); if(full) pill('SNR Level',xa+4,yn+(s.up?-10:10),'#e57373'); } }
      else { const ob=s.ob, xo=X(ob.i), y0=Y(ob.top), y1=Y(ob.bot);
        if(xo!=null&&y0!=null&&y1!=null){ const bw=Math.max(2,x0-xo); cx.fillStyle=pdoRgba(obC,.30); cx.fillRect(xo,Math.min(y0,y1),bw,Math.abs(y1-y0)); cx.strokeStyle=pdoRgba(obC,.85); cx.lineWidth=1; cx.strokeRect(xo+.5,Math.min(y0,y1)+.5,bw,Math.abs(y1-y0)); if(full) pill((sh?'BEARISH':'BULLISH')+' OB',xo+3,Math.min(y0,y1)+8,'#e0e0e0'); }
        if(s.fvg){ const xf=X(s.fvg.x0), f0=Y(s.fvg.top), f1=Y(s.fvg.bot), xf1=X(Math.min(s.fvg.x0+8,T.i)); if(xf!=null&&f0!=null&&f1!=null&&xf1!=null){ cx.fillStyle=pdoRgba(fvC,.45); cx.fillRect(xf,Math.min(f0,f1),Math.max(2,xf1-xf),Math.abs(f1-f0)); if(full) pill('FVG',xf1+2,(f0+f1)/2,fvC); } }
        const xb0=X(s.bos.from), xb1=X(s.bos.to), yb=Y(s.bos.price); if(xb0!=null&&xb1!=null&&yb!=null){ cx.strokeStyle=pdoRgba('#e0e0e0',.8); cx.lineWidth=1; cx.setLineDash([5,4]); cx.beginPath(); cx.moveTo(xb0,yb); cx.lineTo(xb1,yb); cx.stroke(); cx.setLineDash([]); cx.fillStyle='#e0e0e0'; cx.beginPath(); cx.arc(xb0,yb,2.5,0,6.2832); cx.fill(); if(full) pill('BOS',(xb0+xb1)/2-10,yb-9,'#e0e0e0'); }
        cx.strokeStyle=pdoRgba('#e0e0e0',.7); cx.lineWidth=1; cx.setLineDash([5,4]); cx.beginPath(); cx.moveTo(x0,yt); cx.lineTo(xEnd,yt); cx.stroke(); cx.setLineDash([]); if(full) pill(T.liq?(sh?'SSL':'BSL'):'TP',x0+3,yt+(sh?-9:9),'#e0e0e0'); } }
    // ---- risk / reward boxes (width is capped so a long-open setup can't wash over the chart)
    cx.fillStyle=pdoRgba(riskC,.16*a0); cx.fillRect(x0,Math.min(ye,ys),wd,Math.abs(ys-ye)); cx.strokeStyle=pdoRgba(riskC,.75*a0); cx.lineWidth=1; cx.strokeRect(x0+.5,Math.min(ye,ys)+.5,wd,Math.abs(ys-ye));
    cx.fillStyle=pdoRgba(rewC,.14*a0); cx.fillRect(x0,Math.min(ye,yt),wd,Math.abs(yt-ye)); cx.strokeStyle=pdoRgba(rewC,.75*a0); cx.strokeRect(x0+.5,Math.min(ye,yt)+.5,wd,Math.abs(yt-ye));
    cx.strokeStyle=pdoRgba('#ffffff',.55*a0); cx.beginPath(); cx.moveTo(x0,ye); cx.lineTo(xEnd,ye); cx.stroke();
    // ---- labels: Minimal = one tag per setup, Full = every part, None = nothing
    if(lab){ const tag=(sh?'SELL':'BUY')+' \u00b7 '+(T.kind==='dt'?(s.up?'Double Top':'Double Bottom'):'OB')+' \u00b7 1:'+rr.toFixed(1);
      pill(tag,x0-3,ye,sh?riskC:rewC,true);
      if(full){ pill('Risk',x0+3,ys+(sh?-9:9),riskC); pill('Reward 1:'+rr.toFixed(1),x0+3,yt+(sh?9:-9),rewC); } }
    if(T.end!=null&&T.end<=endBar){ const xx=X(T.end), yy=T.res==='TP'?yt:ys; if(xx!=null){ cx.fillStyle=T.res==='TP'?rewC:riskC; cx.beginPath(); cx.arc(xx,yy,3,0,6.2832); cx.fill(); if(lab&&full) pill(T.res,xx+5,yy,T.res==='TP'?rewC:riskC); } } });
  cx.globalAlpha=1; cx.restore();
}
STRATS.pdo={label:'Pattern Setups \u00b7 Option 1: Double Top pattern, Option 2: Bearish Order Block + FVG + BOS (turn on one or both)',short:'DT + OB Setups',own:true,
  defs:{limit:false,useSl:false,pdoDT:true,pdoOB:true,pdoDtSw:6,pdoDtTol:.5,pdoDtMin:8,pdoDtMax:80,pdoDtDepth:1.5,pdoDtWait:60,pdoDtRt:true,pdoDtRtBars:25,pdoDtRtTol:.15,pdoDtMeas:1,
    pdoObSw:5,pdoObLeg:2,pdoObFvg:true,pdoObWait:60,pdoObRR:1.5,pdoSlBuf:.3,pdoOne:true,pdoShow:3,pdoExt:12,pdoLbl:'Full',pdoPat:true,pdoBoxW:30,pdoRiskC:'#ef5350',pdoRewC:'#26a69a',pdoObC:'#9e9e9e',pdoFvC:'#fdd835',pdoInk:'#2962ff'},
  inputs:(b,d)=>{
    fld(b,d,'pdoDT','chk','Option 1 \u00b7 Double Top pattern (Double Bottom for longs)'); fld(b,d,'pdoOB','chk','Option 2 \u00b7 Bearish Order Block + FVG + BOS (bullish for longs)');
    fld(b,d,'pdoDtSw','num','Opt 1 \u00b7 swing strength (bars each side)',{min:2,max:30,step:1}); fld(b,d,'pdoDtTol','num','Opt 1 \u00b7 tops equal within (x ATR)',{min:.05,max:3,step:.05});
    fld(b,d,'pdoDtMin','num','Opt 1 \u00b7 min bars between the tops',{min:2,max:200,step:1}); fld(b,d,'pdoDtMax','num','Opt 1 \u00b7 max bars between the tops',{min:5,max:400,step:1});
    fld(b,d,'pdoDtDepth','num','Opt 1 \u00b7 min depth to the SNR level (x ATR)',{min:0,max:10,step:.1}); fld(b,d,'pdoDtWait','num','Opt 1 \u00b7 give up after (bars from Top 2)',{min:5,max:300,step:1});
    fld(b,d,'pdoDtRt','chk','Opt 1 \u00b7 enter on the retest of the SNR level (off = enter on the break)'); fld(b,d,'pdoDtRtBars','num','Opt 1 \u00b7 retest window (bars after break)',{min:2,max:100,step:1});
    fld(b,d,'pdoDtRtTol','num','Opt 1 \u00b7 retest tolerance (x ATR)',{min:0,max:2,step:.05}); fld(b,d,'pdoDtMeas','num','Opt 1 \u00b7 target = pattern height x',{min:.2,max:5,step:.1});
    fld(b,d,'pdoObSw','num','Opt 2 \u00b7 structure swing strength',{min:2,max:30,step:1}); fld(b,d,'pdoObLeg','num','Opt 2 \u00b7 min impulse size (x ATR)',{min:0,max:15,step:.1});
    fld(b,d,'pdoObFvg','chk','Opt 2 \u00b7 require an FVG in the impulse'); fld(b,d,'pdoObWait','num','Opt 2 \u00b7 wait for the retest up to (bars)',{min:5,max:300,step:1}); fld(b,d,'pdoObRR','num','Opt 2 \u00b7 minimum reward : risk',{min:.5,max:10,step:.1});
    fld(b,d,'pdoSlBuf','num','Stop buffer beyond the level (x ATR)',{min:0,max:3,step:.05}); fld(b,d,'pdoOne','chk','One trade at a time'); fld(b,d,'pdoLbl','sel','Labels',{opts:['Minimal','Full','None']}); fld(b,d,'pdoPat','chk','Draw pattern shapes (circles, neckline, order block, FVG, BOS)'); fld(b,d,'pdoBoxW','num','Max Risk / Reward box width (bars)',{min:5,max:300,step:1}); fld(b,d,'pdoShow','num','Setups to draw (latest)',{min:1,max:30,step:1}); fld(b,d,'pdoExt','num','Extend open setups (bars)',{min:2,max:100,step:1});
    fld(b,d,'pdoRiskC','col','Risk colour'); fld(b,d,'pdoRewC','col','Reward colour'); fld(b,d,'pdoObC','col','Order block colour'); fld(b,d,'pdoFvC','col','FVG colour'); fld(b,d,'pdoInk','col','Pattern circles colour'); },
  sig:()=>0,
  watch:(c,Z,quiet)=>{ const r=pdoGet('sig',c,Z,false), mk=[], rets=[]; let open=null;
    r.trades.forEach(T=>{ mk.push(T.v>0?{time:c[T.i].time,position:'belowBar',color:Z.buyCol,shape:'arrowUp',text:Z.labels?'BUY':''}:{time:c[T.i].time,position:'aboveBar',color:Z.sellCol,shape:'arrowDown',text:Z.labels?'SELL':''});
      if(T.end!=null){ mk.push({time:c[T.end].time,position:T.v<0?'belowBar':'aboveBar',color:T.res==='TP'?'#2dd4a7':'#ff5d7a',shape:'circle',text:T.res});
        const x=T.res==='TP'?T.tp:T.sl; rets.push((T.v*(x/T.e-1)-2*Z.comm/100)*Z.size/100); } else open=T; });
    Z._pm=mk; const w=rets.filter(x=>x>0).length, tot=rets.reduce((a,x)=>a*(1+x),1)-1;
    Z._stat=`${rets.length} trades \u00b7 win ${rets.length?Math.round(w/rets.length*100):0}% \u00b7 <span class="${tot>=0?'up':'down'}">${tot>=0?'+':''}${(tot*100).toFixed(1)}%</span>${open?' \u00b7 '+(open.v>0?'long':'short')+' open':''}`;
    const lt=r.trades[r.trades.length-1]; if(lt){ const tm=c[lt.i].time; if(!quiet&&c.length&&tm===c[c.length-1].time&&tm>(Z._ls||0)) toast(`${lt.v>0?'BUY':'SELL'} signal \u00b7 ${sym[0]} ${tf[0]}`,lt.v>0?Z.buyCol:Z.sellCol); Z._ls=Math.max(Z._ls||0,tm); lastSig=Math.max(lastSig,tm); } }};
try{ DESC.pdo='Strategy \u00b7 Double Top and Bearish Order Block + FVG + BOS setups with Entry / Stop / Target boxes (switch each on or off)'; }catch(e){}
{ const _pdD=draw; draw=function(d,X,Y,W,H){ if(d&&d.type==='pdoview') return pdoDraw(d,X,Y,W,H); return _pdD.apply(this,arguments); };
  const _pdR=recomputeExtras; recomputeExtras=function(){ _pdR.apply(this,arguments); strats.forEach(Z=>{ if(Z.k==='pdo'&&stVis(Z)) scriptBoxes.push({type:'pdoview',pts:[],o:Z}); }); };
  // the generic engine only draws one same-direction arrow per open position, so this strategy's own BUY / SELL + TP / SL markers are added after it runs
  const _pdS=runStrategy; runStrategy=function(){ _pdS.apply(this,arguments); try{ let add=[]; strats.forEach(Z=>{ if(Z.k==='pdo'&&stVis(Z)&&Z._pm) add=add.concat(Z._pm); }); if(add.length){ stratMk=stratMk.concat(add); applyMarkers(); } }catch(e){ console.error('pdo markers',e); } }; }
}catch(err){ console.error('pdo strategy failed',err); window.__pdoErr=err; }
//# sourceURL=tools-4.js
