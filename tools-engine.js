'use strict';
// tools-engine.js - runs the indicators of tools-2.js on the server (no screen needed) and turns their BUY / SELL / TP / SL events into notifications.
// It loads tools-2.js (keep it in the same folder, or set TOOLS_FILE) inside a sandbox with stand-ins for the app, then calls each indicator's own extras(candles, params).
// Same rules as the chart because it is the same code. Default settings of each indicator are used. Closed candles only.
const fs=require('fs'), path=require('path');
const TOOLS_FILE=process.env.TOOLS_FILE||path.join(__dirname,'tools-2.js');
let IND=null, loadErr=null;
function load(){
  if(IND||loadErr) return IND;
  try{
    const code=fs.readFileSync(TOOLS_FILE,'utf8'), reg={};
    const noop=function(){ return noop; };
    const store={IND:reg,DESC:{},candles:[],inds:[],sym:['BTCUSDT'],tf:['15m','15m'],quietNext:true,window:{},console:{log(){},error(){},warn(){}},
      recomputeExtras:function(){},draw:function(){},show:()=>true,toast:()=>{},beep:()=>{},cx:new Proxy({},{get:()=>function(){return {width:0};},set:()=>true})};
    const g=new Proxy(store,{
      has:(t,k)=>(typeof k==='string'&&!(k in globalThis))||k in t,
      get:(t,k)=>{ if(k===Symbol.unscopables) return undefined; if(k in t) return t[k]; if(k in globalThis) return globalThis[k]; return noop; },
      set:(t,k,v)=>{ t[k]=v; return true; } });
    new Function('__g','with(__g){\n'+code+'\n}')(g);
    IND=reg;
  }catch(e){ loadErr=e; console.error('tools-engine: cannot load',TOOLS_FILE,e.message); }
  return IND; }
// which event types of each indicator are entries (b = buy side, s = sell side) and exits (x)
const CFG={
  trf:{b:['long'],s:['short'],x:{tp:'take profit',sl:'stop loss'}}, orbnb:{b:['long'],s:['short'],x:{exit:'exit'}}, ocb:{b:['long'],s:['short']},
  lsr:{b:['buy'],s:['sell'],x:{tp1:'TP1',tp2:'TP2',tp3:'TP3',sl:'stop loss'}}, bce:{b:['buy'],s:['sell']}, xlb:{b:['buy'],s:['sell'],x:{tp:'take profit'}},
  mrs:{b:['long'],s:['short'],x:{tp:'take profit',sl:'stop loss'}}, cwr:{b:['long'],s:['short']}, fgz:{b:['buy'],s:['sell']}, lgs:{b:['buy'],s:['sell']},
  ebs:{b:['buy'],s:['sell']}, mss:{b:['buy'],s:['sell'],x:{tp:'take profit'}}, msi:{b:['buy'],s:['sell'],x:{tp:'take profit'}},
  mfg:{b:['buy'],s:['sell']}, mfs:{b:['buy'],s:['sell']}, mfr:{b:['buy'],s:['sell']}, amd:{b:['buy'],s:['sell']} };
const IDS=Object.keys(CFG);
const fx=v=>{ v=+v; return isFinite(v)?String(+v.toPrecision(7)):'-'; };
// w = {symbol, interval, tool:'mtl', opts:{ids:[...]}}   c = candles oldest first (seconds), last one still forming
function events(w,c){
  const reg=load(); if(!reg||!c||c.length<130) return [];
  const ids=((w.opts&&w.opts.ids)||[]).filter(x=>CFG[x]); const use=ids.length?ids:IDS, n=c.length, lo=c[n-3].time, hi=c[n-2].time, out=[];
  for(const id of use){ const I=reg[id]; if(!I||typeof I.extras!=='function') continue;
    let r; try{ r=I.extras(c,Object.assign({},I.p||{})); }catch(e){ continue; }
    const cf=CFG[id], name=String(I.title||I.label||id).split(/\s[\u00b7-]\s/)[0].slice(0,42);
    ((r&&r.events)||[]).forEach(e=>{ if(!e||e.time<lo||e.time>hi) return;
      const t=e.type, buy=cf.b.indexOf(t)>=0, sell=cf.s.indexOf(t)>=0, ex=cf.x&&cf.x[t]; if(!buy&&!sell&&!ex) return;
      const tps=e.tps||e.t, extra=(e.sl!=null?' \u00b7 SL '+fx(e.sl):'')+(Array.isArray(tps)&&tps.length?' \u00b7 TP '+tps.slice(0,3).map(fx).join(' / '):'');
      const title=buy?'\uD83D\uDFE2 BUY \u00b7 '+name+' '+w.symbol+' '+w.interval:sell?'\uD83D\uDD34 SELL \u00b7 '+name+' '+w.symbol+' '+w.interval:(t==='sl'?'\uD83D\uDED1 ':'\u2705 ')+name+' '+ex+' '+w.symbol+' '+w.interval;
      out.push({key:w.symbol+'|'+w.interval+'|mtl:'+id+'|'+t+'|'+e.time,title:title,body:(e.price!=null?'Price '+fx(e.price):'Signal on the last closed candle')+extra}); }); }
  return out; }
module.exports={events:events,IDS:IDS,load:load};
