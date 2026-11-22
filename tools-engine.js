'use strict';
// tools-engine.js - runs your chosen tools on the server (no screen needed) and turns their BUY / SELL / TP / SL events into notifications.
// It loads the tool files (tools-2.js and tools-strats.js - keep them in the same folder) inside a sandbox with stand-ins for the app,
// then calls each tool's own code, so the rules are the same as on the chart. Default settings of each tool are used. Closed candles only.
const fs=require('fs'), path=require('path');
const FILES=(process.env.TOOLS_FILES?process.env.TOOLS_FILES.split(','):['tools-2.js','tools-strats.js']).map(f=>path.isAbsolute(f)?f:path.join(__dirname,f));
// tools that report events through extras(): which event types are entries (b = buy side, s = sell side) and exits (x)
const CFG={
  trf:{b:['long'],s:['short'],x:{tp:'take profit',sl:'stop loss'}}, orbnb:{b:['long'],s:['short'],x:{exit:'exit'}}, ocb:{b:['long'],s:['short']},
  lsr:{b:['buy'],s:['sell'],x:{tp1:'TP1',tp2:'TP2',tp3:'TP3',sl:'stop loss'}}, bce:{b:['buy'],s:['sell']}, xlb:{b:['buy'],s:['sell'],x:{tp:'take profit'}},
  mrs:{b:['long'],s:['short'],x:{tp:'take profit',sl:'stop loss'}}, cwr:{b:['long'],s:['short']}, fgz:{b:['buy'],s:['sell']}, lgs:{b:['buy'],s:['sell']},
  ebs:{b:['buy'],s:['sell']}, mss:{b:['buy'],s:['sell'],x:{tp:'take profit'}}, msi:{b:['buy'],s:['sell'],x:{tp:'take profit'}},
  mfg:{b:['buy'],s:['sell']}, mfs:{b:['buy'],s:['sell']}, mfr:{b:['buy'],s:['sell']}, amd:{b:['buy'],s:['sell']} };
// "own" strategies (STRATS.x): the tool's compute function is exposed by a small text hook at load time, and read through get(result) -> [{i, dir}]
const STRAT={
  mru:{fn:'mruRun', name:'Fast Future Sniper Pro Plus', get:r=>(r.ev||[]).map(e=>({i:e.i,dir:e.s}))},
  beg:{fn:'begRun', name:'Bullish Engulfing', get:r=>(r.ev||[]).map(e=>({i:e.i,dir:e.s}))},
  ccp:{fn:'ccpRun', name:'Candlestick Pro Plus Counter Premium', get:r=>(r.ev||[]).map(e=>({i:e.i,dir:e.s}))},
  pcr:{fn:'pcrSignals', name:'Adjustable Pro Plus Ranging Channel', get:r=>((r&&r.out)||[]).map(e=>({i:e.i,dir:e.side}))},
  ccz:{fn:'cczCompute', name:'Consecutive Candles Zones', get:r=>((r&&r.tri)||[]).map(e=>({i:e.i,dir:e.sell?-1:1}))} };
const IDS=Object.keys(CFG).concat(Object.keys(STRAT));
// default when the app's tool box is empty: the nine picks. Typing 'all' in the box runs every tool above.
const PICKS=['mfs','cwr','xlb','bce','pcr','ccz','ccp','mru','beg'];
let REG=null, STR=null, loadErr=null, tfStore=null;
function load(){
  if(REG||loadErr) return REG;
  const reg={}, strats={}; let okFiles=0;
  const noop=function(){ return noop; };
  const dummy=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>'':dummy(),apply:()=>dummy(),construct:()=>dummy(),set:()=>true});
  const store={IND:reg,STRATS:strats,DESC:{},candles:[],inds:[],sym:['BTCUSDT'],tf:['15m','15m',900],quietNext:true,window:{},document:dummy(),localStorage:dummy(),
    setInterval:()=>0,setTimeout:()=>0,setImmediate:()=>0,requestAnimationFrame:()=>0,console:{log(){},error(){},warn(){}},
    recomputeExtras:function(){},draw:function(){},show:()=>true,toast:()=>{},beep:()=>{},cx:new Proxy({},{get:()=>function(){return {width:0};},set:()=>true})};
  tfStore=store;
  FILES.forEach(file=>{
    try{
      let code=fs.readFileSync(file,'utf8');
      Object.keys(STRAT).forEach(id=>{ const m='STRATS.'+id+'={'; const k=code.indexOf(m); if(k>=0&&code.indexOf('function '+STRAT[id].fn+'(')>=0) code=code.slice(0,k)+'STRATS.__'+id+'='+STRAT[id].fn+'; '+code.slice(k); });
      { const k=code.indexOf('STRATS.pcr={'); if(k>=0&&code.indexOf('function pcrBreaks(')>=0&&code.indexOf('function pcrFit(')>=0) code=code.slice(0,k)+'STRATS.__pcrBrk=pcrBreaks; STRATS.__pcrFit=pcrFit; '+code.slice(k); }   // channel breakouts + middle line for pcr alerts
      const g=new Proxy(store,{
        has:(t,k)=>(typeof k==='string'&&!(k in globalThis))||k in t,
        get:(t,k)=>{ if(k===Symbol.unscopables) return undefined; if(k in t) return t[k]; if(k in globalThis) return globalThis[k]; return noop; },
        set:(t,k,v)=>{ t[k]=v; return true; } });
      new Function('__g','with(__g){\n'+code+'\n}')(g); okFiles++;
    }catch(e){ console.error('tools-engine: cannot load',file,e.message); }
  });
  if(okFiles){ REG=reg; STR=strats; } else loadErr=new Error('no tools file loaded');
  return REG; }
const fx=v=>{ v=+v; return isFinite(v)?String(+v.toPrecision(7)):'-'; };
const SECS={m:60,h:3600,d:86400};
function setTf(iv){ const m=/^(\d+)([mhd])$/.exec(iv||''); const s=m?(+m[1])*SECS[m[2]]:900; tfStore.tf=[iv,iv,s]; }
// Ranging Channel extras: breakouts (the yellow "Breakout" tag) and price crossing the yellow dotted middle line
function pcrExtra(w,c,Z,r,lo,hi,out){
  const nm='Ranging Channel', tag=w.symbol+' '+w.interval, brk=STR&&STR.__pcrBrk, fit=STR&&STR.__pcrFit;
  try{ if(brk){ (brk(c,Z,r&&r.r)||[]).forEach(e=>{ if(!e||e.time<lo||e.time>hi) return; out.push({key:w.symbol+'|'+w.interval+'|mtl:pcr|brk|'+e.time+'|'+e.side,
      title:'\uD83D\uDFE1 Breakout '+(e.side>0?'\u25B2 UP':'\u25BC DOWN')+' \u00b7 '+nm+' '+tag, body:(e.side>0?'Closed above the top line ':'Closed below the bottom line ')+fx(e.lv)+' \u00b7 price '+fx(e.cl)}); }); } }catch(x){}
  try{ const F=(r&&r.r)||(fit&&fit(c,Z)); if(F&&F.mid){ const n=c.length;
      for(let i=Math.max(F.i0||1,n-3);i<=n-2;i++){ const a=c[i-1], b=c[i]; if(!a||!b||b.time<lo||b.time>hi) continue; const m0=F.mid(i-1), m1=F.mid(i); if(!isFinite(m0)||!isFinite(m1)) continue;
        const up=a.close<=m0&&b.close>m1, dn=a.close>=m0&&b.close<m1; if(!up&&!dn) continue;
        out.push({key:w.symbol+'|'+w.interval+'|mtl:pcr|mid|'+b.time+'|'+(up?1:-1),title:'\u2194\uFE0F Crossed '+(up?'ABOVE':'BELOW')+' the yellow middle line \u00b7 '+nm+' '+tag,body:'Closed '+fx(b.close)+' \u00b7 middle line '+fx(m1)}); } } }catch(x){}
}
// w = {symbol, interval, tool:'mtl', opts:{ids:[...]}}   c = candles oldest first (seconds), last one still forming
function events(w,c){
  const reg=load(); if(!reg||!c||c.length<130) return [];
  setTf(w.interval);
  const raw=(w.opts&&w.opts.ids)||[], ids=raw.filter(x=>IDS.indexOf(x)>=0), use=raw.indexOf('all')>=0?IDS:ids.length?ids:PICKS, n=c.length, lo=c[n-3].time, hi=c[n-2].time, out=[];
  const push=(id,name,type,time,dir,body,extra)=>{ out.push({key:w.symbol+'|'+w.interval+'|mtl:'+id+'|'+type+'|'+time,title:(dir>0?'\uD83D\uDFE2 BUY \u00b7 ':'\uD83D\uDD34 SELL \u00b7 ')+name+' '+w.symbol+' '+w.interval,body:body+(extra||'')}); };
  for(const id of use){
    if(STRAT[id]){ const S=STR&&STR['__'+id], def=STR&&STR[id]; if(!S||!def) continue;
      try{ const Z=Object.assign({},def.defs||{},{sid:id}); const r=S(c,Z); if(id==='pcr') pcrExtra(w,c,Z,r,lo,hi,out); STRAT[id].get(r||{}).forEach(e=>{ const bar=c[e.i]; if(!bar||bar.time<lo||bar.time>hi||!e.dir) return; push(id,STRAT[id].name,e.dir>0?'buy':'sell',bar.time,e.dir>0?1:-1,'Price '+fx(bar.close)); }); }catch(e){}
      continue; }
    const I=reg[id], cf=CFG[id]; if(!I||!cf||typeof I.extras!=='function') continue;
    let r; try{ r=I.extras(c,Object.assign({},I.p||{})); }catch(e){ continue; }
    const name=String(I.title||I.label||id).split(/\s[\u00b7-]\s/)[0].slice(0,42);
    ((r&&r.events)||[]).forEach(e=>{ if(!e||e.time<lo||e.time>hi) return;
      const t=e.type, buy=cf.b.indexOf(t)>=0, sell=cf.s.indexOf(t)>=0, ex=cf.x&&cf.x[t]; if(!buy&&!sell&&!ex) return;
      const tps=e.tps||e.t, extra=(e.sl!=null?' \u00b7 SL '+fx(e.sl):'')+(Array.isArray(tps)&&tps.length?' \u00b7 TP '+tps.slice(0,3).map(fx).join(' / '):''), body=(e.price!=null?'Price '+fx(e.price):'Signal on the last closed candle')+extra;
      if(buy||sell) push(id,name,t,e.time,buy?1:-1,body);
      else out.push({key:w.symbol+'|'+w.interval+'|mtl:'+id+'|'+t+'|'+e.time,title:(t==='sl'?'\uD83D\uDED1 ':'\u2705 ')+name+' '+ex+' '+w.symbol+' '+w.interval,body:body}); }); }
  return out; }
module.exports={events:events,IDS:IDS,PICKS:PICKS,load:load};
