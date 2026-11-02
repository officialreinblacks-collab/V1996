/* tools-9.js — MarketPlusView tool code. index.html loads this file and runs each part inside start() (same scope as the other tools files).
   Keep the file name. Chart types in this file:
     part 13 — Relative Performance — Asset Comparison (ctype 21)
     part 14 — Seasonality — Historical Market Patterns (ctype 22)
   Both are independent modules: own overlay on #mw, no effect on any other chart type. */
/*@@part 13*/
(function(){
'use strict';
var G=(typeof window!=='undefined')?window:globalThis;

/* ====================================================================================================
   CORE  (pure logic — no DOM; unit-tested in Node)
   ==================================================================================================== */
var TFS=[['1m','1m',60],['3m','3m',180],['5m','5m',300],['15m','15m',900],['30m','30m',1800],['1h','1h',3600],['2h','2h',7200],['4h','4h',14400],
  ['6h','6h',21600],['8h','8h',28800],['12h','12h',43200],['1D','1d',86400],['3D','3d',259200],['1W','1w',604800],['1M','1M',2592000]];
var TFMAP={}; TFS.forEach(function(x){ TFMAP[x[0]]={label:x[0],iv:x[1],sec:x[2]}; });
var MAXC=40000;           // max candles per asset per load
var MAXA=8;               // max assets on the chart

/* Normalization — the ONLY place performance values are computed (history, live ticks and tooltips all call this).
   pct : (price / start - 1) * 100   → start = 0
   idx : (price / start) * 100       → start = 100 */
function normalize(mode,price,start){
  if(!(price>0)||!(start>0)||!isFinite(price)||!isFinite(start)) return null;
  return mode==='idx' ? price/start*100 : (price/start-1)*100;
}
function baseValue(mode){ return mode==='idx'?100:0; }

function fmtT(t){ return new Date(t*1000).toISOString().replace('T',' ').slice(0,16)+' UTC'; }

/* rows: Map(openTimeSec -> {o,h,l,c,v,x}).  A Map keyed by open time makes duplicate candles impossible. */
function mergeKlines(rows,arr,nowMs){
  var bad=0,n=0;
  for(var i=0;i<arr.length;i++){
    var k=arr[i]; if(!k||k.length<7){ bad++; continue; }
    var t=Math.floor(+k[0]/1000), o=+k[1], h=+k[2], l=+k[3], c=+k[4], v=+k[5];
    if(!isFinite(t)||!(c>0)||!isFinite(c)){ bad++; continue; }
    rows.set(t,{o:o,h:h,l:l,c:c,v:v,x:(+k[6])<=nowMs}); n++;
  }
  return {n:n,bad:bad};
}

function firstKey(rows){ var m=Infinity; rows.forEach(function(_,t){ if(t<m) m=t; }); return m; }
function lastKey(rows){ var m=-Infinity; rows.forEach(function(_,t){ if(t>m) m=t; }); return m; }

/* Pick the comparison start candle: the first candle of the PRIMARY asset at/after the requested time
   (falls back to the first candle of any asset if the primary has none). */
function resolveBaseTime(assets,req){
  var cand=Infinity, i, a;
  var usable=assets.filter(function(x){ return x.rows&&x.rows.size&&!x.err; });
  if(!usable.length) return null;
  var pri=usable.filter(function(x){ return x===assets[0]; })[0];
  var pools=pri?[pri].concat(usable.filter(function(x){ return x!==pri; })):usable;
  for(i=0;i<pools.length;i++){
    a=pools[i]; cand=Infinity;
    a.rows.forEach(function(_,t){ if(t>=req&&t<cand) cand=t; });
    if(cand<Infinity) return cand;
  }
  return null;
}

/* Build every asset line from the same base candle. Nothing is fabricated: a missing candle becomes a gap
   (whitespace point), never a forward-filled price; an asset with no candle at the base time is flagged and not drawn. */
function compute(assets,reqBase,mode){
  var baseT=resolveBaseTime(assets,reqBase), out={baseT:baseT,times:[],res:{}};
  if(baseT==null) return out;
  var set={}, i;
  assets.forEach(function(a){ if(!a.rows||a.err) return; a.rows.forEach(function(_,t){ if(t>=baseT) set[t]=1; }); });
  out.times=Object.keys(set).map(Number).sort(function(x,y){ return x-y; });
  assets.forEach(function(a){
    var r={ok:false,reason:'',points:[],vals:new Map(),last:null,firstT:null};
    out.res[a.key]=r;
    if(a.err){ r.reason=a.err; return; }
    if(!a.rows||!a.rows.size){ r.reason='No candles returned for this range'; return; }
    r.firstT=firstKey(a.rows);
    var b=a.rows.get(baseT);
    if(!b||!(b.c>0)){
      r.reason = r.firstT>baseT ? 'Not enough history: first candle is '+fmtT(r.firstT)+' (after the base time)' : 'No candle at the base time (gap in Binance data)';
      return;
    }
    r.ok=true; r.start=b.c;
    for(i=0;i<out.times.length;i++){
      var t=out.times[i], row=a.rows.get(t);
      if(row){ var v=normalize(mode,row.c,b.c); if(v==null){ r.points.push({time:t}); continue; } r.points.push({time:t,value:v}); r.vals.set(t,v); r.last={time:t,value:v,price:row.c,x:row.x}; }
      else r.points.push({time:t});          // gap — NOT filled
    }
  });
  return out;
}

/* fetch one asset's klines, paginated. d = {json(url), API, FAPI}. alive() lets a caller cancel stale loads. */
async function fetchKlines(d,mk,s,iv,fromMs,toMs,alive){
  var base=mk==='F'?d.FAPI+'/fapi/v1':d.API+'/api/v3', out=[], start=fromMs, pages=0, trunc=false;
  for(;;){
    if(!alive()) throw new Error('stale');
    var j=await d.json(base+'/klines?symbol='+encodeURIComponent(s)+'&interval='+iv+'&startTime='+start+'&endTime='+toMs+'&limit=1000');
    if(!alive()) throw new Error('stale');
    if(!Array.isArray(j)){ var e=new Error(j&&j.msg?String(j.msg):'Bad response from Binance'); e.code=j&&j.code; throw e; }
    for(var i=0;i<j.length;i++) out.push(j[i]);
    if(j.length<1000) break;
    start=j[j.length-1][0]+1;
    if(++pages>=Math.ceil(MAXC/1000)+5){ trunc=true; break; }
  }
  return {rows:out,trunc:trunc};
}

/* WebSocket feed with reconnect + backfill.
   d = {WS, url(market,streams,alt), setT, clearT, now, onKline(key,k), backfill(keys,market), onState()} */
function createFeed(d){
  var groups=[], dead=false;
  function emit(){ try{ d.onState&&d.onState(); }catch(e){} }
  function connect(g){
    if(g.dead) return;
    var url=d.url(g.market,g.streams,g.alt), ws;
    try{ ws=new d.WS(url); }catch(e){ return later(g); }
    g.ws=ws; g.lastMsg=d.now(); g.opened=false;
    ws.onopen=function(){ if(g.dead||g.ws!==ws) return; g.open=true; g.opened=true; g.tries=0; g.fails=0; g.lastMsg=d.now(); emit(); try{ d.backfill(g.keys,g.market); }catch(e){} };
    ws.onmessage=function(ev){
      if(g.dead||g.ws!==ws) return; g.lastMsg=d.now();
      var m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
      var k=m&&m.data&&m.data.k; if(!k||!k.s) return;
      d.onKline(g.market+':'+k.s,k);
    };
    var lost=function(){ if(g.dead||g.ws!==ws) return; g.ws=null; if(g.open){ g.open=false; } if(!g.opened){ g.fails=(g.fails||0)+1; if(g.fails>=3&&g.market==='F'){ g.alt=!g.alt; g.fails=0; } } emit(); later(g); };
    ws.onclose=lost; ws.onerror=function(){ try{ ws.close(); }catch(e){} lost(); };
  }
  function later(g){ if(g.dead) return; var wait=Math.min(30000,1000*Math.pow(2,Math.min(g.tries++,5))); g.timer=d.setT(function(){ connect(g); },wait); }
  function watchdog(){
    if(dead) return;
    groups.forEach(function(g){ if(g.dead||!g.open) return; if(d.now()-g.lastMsg>45000){ var w=g.ws; g.ws=null; g.open=false; try{ w&&w.close(); }catch(e){} emit(); later(g); } });
    d.wd=d.setT(watchdog,15000);
  }
  return {
    start:function(list,iv){
      this.stop(); dead=false;
      ['S','F'].forEach(function(mk){
        var ks=list.filter(function(a){ return a.market===mk; }); if(!ks.length) return;
        var g={market:mk,keys:ks.map(function(a){ return a.key; }),streams:ks.map(function(a){ return a.symbol.toLowerCase()+'@kline_'+iv; }).join('/'),ws:null,open:false,opened:false,tries:0,fails:0,alt:false,dead:false,lastMsg:d.now()};
        groups.push(g); connect(g);
      });
      if(groups.length) d.wd=d.setT(watchdog,15000);
      emit();
    },
    stop:function(){ dead=true; groups.forEach(function(g){ g.dead=true; if(g.timer) d.clearT(g.timer); var w=g.ws; g.ws=null; if(w){ w.onclose=null; w.onerror=null; w.onmessage=null; try{ w.close(); }catch(e){} } }); groups=[]; if(d.wd){ d.clearT(d.wd); d.wd=null; } emit(); },
    reconnectNow:function(){ groups.forEach(function(g){ if(g.dead||g.open) return; if(g.timer) d.clearT(g.timer); g.tries=0; connect(g); }); },
    status:function(){ if(!groups.length) return 'off'; return groups.every(function(g){ return g.open; })?'live':'reconnecting'; }
  };
}

var core={TFS:TFS,TFMAP:TFMAP,MAXC:MAXC,MAXA:MAXA,normalize:normalize,baseValue:baseValue,mergeKlines:mergeKlines,resolveBaseTime:resolveBaseTime,
  compute:compute,fetchKlines:fetchKlines,createFeed:createFeed,fmtT:fmtT,firstKey:firstKey,lastKey:lastKey};
G.mpRP={core:core};

/* ====================================================================================================
   UI  (only inside the app: needs the DOM, LightweightCharts and the start() scope)
   ==================================================================================================== */
if(typeof document==='undefined'||typeof LightweightCharts==='undefined'||typeof $==='undefined'||typeof API==='undefined') return;

var KEY='mpvRPv1', PAL=['#7c8cff','#f5b942','#2dd4a7','#ff5d7a','#4dd0e1','#e879f9','#a3e635','#fb923c'];
var RANGES=[['1D',86400],['1W',604800],['1M',2592000],['3M',7776000],['6M',15724800],['1Y',31536000],['YTD',-1],['MAX',-2]];
var S={mode:'pct',tf:'1h',range:'1M',cFrom:'',cTo:'',baseT:null,assets:[]};
var gen=0, reqN=0, uid=0, busy=false, ui=null, shown=false, symLists={S:null,F:null}, symBusy=false, addMk='S';

function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
async function jget(url){
  var last;
  for(var a=0;a<3;a++){
    try{
      var r=await fetch(url);
      if(r.status===429||r.status===418){ var e=new Error('Binance rate limit reached — wait a moment, then retry'); e.rate=true; throw e; }
      return await r.json();
    }catch(e){ last=e; if(e.rate) throw e; await sleep(400*(a+1)); }
  }
  throw last||new Error('Network error');
}
var DEPS={json:jget,API:API,FAPI:FAPI};

/* ---------- state ---------- */
function mkKey(mk,s){ return mk+':'+s; }
function pickColor(){ var used={}; S.assets.forEach(function(a){ used[a.color]=1; }); for(var i=0;i<PAL.length;i++) if(!used[PAL[i]]) return PAL[i]; return PAL[S.assets.length%PAL.length]; }
function newAsset(mk,s){ return {key:mkKey(mk,s),market:mk,symbol:s,color:pickColor(),rows:new Map(),err:null,loading:false,trunc:false,req:0,drawn:-1}; }
function saveS(){ try{ localStorage.setItem(KEY,JSON.stringify({mode:S.mode,tf:S.tf,range:S.range,cFrom:S.cFrom,cTo:S.cTo,baseT:S.baseT,assets:S.assets.map(function(a){ return {m:a.market,s:a.symbol,c:a.color}; })})); }catch(e){} }
function loadS(){
  var j=null; try{ j=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){}
  if(j&&Array.isArray(j.assets)&&j.assets.length){
    S.mode=j.mode==='idx'?'idx':'pct'; S.tf=TFMAP[j.tf]?j.tf:'1h'; S.range=j.range||'1M'; S.cFrom=j.cFrom||''; S.cTo=j.cTo||''; S.baseT=typeof j.baseT==='number'?j.baseT:null;
    S.assets=[]; j.assets.slice(0,MAXA).forEach(function(x){ if((x.m==='S'||x.m==='F')&&/^[A-Z0-9]{3,24}$/.test(x.s)&&!S.assets.some(function(a){ return a.key===mkKey(x.m,x.s); })){ var a=newAsset(x.m,x.s); if(x.c) a.color=x.c; S.assets.push(a); } });
  }
  if(!S.assets.length) defaults(true);
}
function defaults(keepTf){
  var s0=''; try{ s0=String(sym[0]||'').toUpperCase(); }catch(e){}
  if(!/^[A-Z0-9]{3,24}$/.test(s0)) s0='BTCUSDT';
  var pm=false; try{ pm=!!isPerp(s0); }catch(e){}
  S.mode='pct'; S.range='1M'; S.baseT=null; S.cFrom=''; S.cTo=''; S.assets=[];
  if(!keepTf) S.tf='1h'; else { try{ var iv=tf&&tf[1], hit=TFS.filter(function(x){ return x[1]===iv; })[0]; if(hit) S.tf=hit[0]; else S.tf='1h'; }catch(e){ S.tf='1h'; } }
  S.assets.push(newAsset(pm?'F':'S',s0));
  var alt=s0==='BTCUSDT'?'ETHUSDT':'BTCUSDT'; S.assets.push(newAsset('S',alt));
}

/* ---------- range / base ---------- */
function nowSec(){ return Math.floor(Date.now()/1000); }
function rangeBounds(){
  var T=TFMAP[S.tf], now=Date.now(), to=now, from, clipped=false;
  if(S.range==='custom'){
    var f=Date.parse((S.cFrom||'')+'T00:00:00Z'), t=Date.parse((S.cTo||'')+'T23:59:59Z');
    from=isFinite(f)?f:now-2592000000; to=isFinite(t)?Math.min(t,now):now;
    if(to<=from) from=to-86400000;
  } else {
    var r=RANGES.filter(function(x){ return x[0]===S.range; })[0]||RANGES[2];
    if(r[1]===-1) from=Date.UTC(new Date().getUTCFullYear(),0,1); else if(r[1]===-2) from=0; else from=now-r[1]*1000;
  }
  if(S.baseT!=null&&S.baseT*1000<from) from=S.baseT*1000;
  var span=MAXC*T.sec*1000; if(to-from>span){ from=to-span; clipped=true; }
  return {from:Math.max(0,from),to:to,clipped:clipped,live:(S.range!=='custom')||(to>=now-T.sec*2000)};
}
function reqBase(){ return S.baseT!=null?S.baseT:Math.ceil(rangeBounds().from/1000); }

/* ---------- loading ---------- */
function friendly(e,a){
  if(e&&e.code===-1121) return 'Symbol not found on Binance '+(a.market==='F'?'USDⓈ-M Futures':'Spot');
  if(e&&e.rate) return e.message;
  if(e&&e.message&&e.message!=='Failed to fetch'&&e.name!=='TypeError') return String(e.message).slice(0,120);
  return 'Network problem — could not load '+a.symbol+' ('+(a.market==='F'?'Futures':'Spot')+')';
}
async function loadOne(a,ver,b){
  var tok=++reqN; a.req=tok; a.loading=true; a.err=null; a.rows=new Map(); a.trunc=false; a.drawn=-1;
  var alive=function(){ return gen===ver&&a.req===tok&&S.assets.indexOf(a)>=0; };
  try{
    var r=await fetchKlines(DEPS,a.market,a.symbol,TFMAP[S.tf].iv,b.from,b.to,alive);
    if(!alive()) return;
    mergeKlines(a.rows,r.rows,Date.now()); a.trunc=r.trunc;
    if(!a.rows.size) a.err='No candles returned for this range (symbol may not exist on '+(a.market==='F'?'Futures':'Spot')+')';
  }catch(e){ if(!alive()) return; a.err=friendly(e,a); a.rows=new Map(); }
  finally{ if(a.req===tok) a.loading=false; }
}
async function reloadAll(fit){
  var ver=++gen, b=rangeBounds(); stopFeed(); busy=true; S.assets.forEach(function(a){ a.loading=true; a.rows=new Map(); a.err=null; });
  clearSeries(); paint();
  await Promise.all(S.assets.map(function(a){ return loadOne(a,ver,b); }));
  if(ver!==gen) return;
  busy=false; redraw(fit!==false); startFeed(b);
}
async function addAsset(mk,s){
  s=String(s||'').toUpperCase().trim();
  if(!/^[A-Z0-9]{3,24}$/.test(s)) return toast('That symbol is not valid','#ff5d7a');
  if(S.assets.some(function(a){ return a.key===mkKey(mk,s); })) return toast(s+' ('+(mk==='F'?'Futures':'Spot')+') is already on the chart','#f5b942');
  if(S.assets.length>=MAXA) return toast('Maximum '+MAXA+' assets','#f5b942');
  var a=newAsset(mk,s); S.assets.push(a); saveS(); closeAdd();
  var ver=gen, b=rangeBounds(); a.loading=true; paint();
  await loadOne(a,ver,b); if(ver!==gen) return;
  redraw(false); startFeed(b); saveS();
}
function removeAsset(key){
  var i=S.assets.findIndex(function(a){ return a.key===key; }); if(i<0) return;
  var a=S.assets[i]; S.assets.splice(i,1); a.req=-1;
  var sr=ui.series.get(key); if(sr){ try{ ui.chart.removeSeries(sr); }catch(e){} ui.series.delete(key); }
  saveS(); if(!S.assets.length){ paint(); stopFeed(); return; }
  redraw(false); startFeed(rangeBounds());
}
function makePrimary(key){
  var i=S.assets.findIndex(function(a){ return a.key===key; }); if(i<=0) return;
  var a=S.assets.splice(i,1)[0]; S.assets.unshift(a); saveS(); redraw(false);
}

/* ---------- live feed ---------- */
var feed=null;
function feedDeps(){
  return {
    WS:WebSocket, now:function(){ return Date.now(); },
    setT:function(f,ms){ return setTimeout(f,ms); }, clearT:function(t){ clearTimeout(t); },
    url:function(mk,streams,alt){ return mk==='F' ? (alt?FWSS+'/stream?streams=':FWSS+'/market/stream?streams=')+streams : WSS+'/stream?streams='+streams; },
    onKline:onKline, backfill:backfill, onState:liveBadge
  };
}
function startFeed(b){
  stopFeed(); if(!shown||!b||!b.live) { liveBadge(); return; }
  var list=S.assets.filter(function(a){ return !a.err&&!a.loading; }); if(!list.length){ liveBadge(); return; }
  feed=createFeed(feedDeps()); feed.start(list,TFMAP[S.tf].iv);
}
function stopFeed(){ if(feed){ try{ feed.stop(); }catch(e){} feed=null; } liveBadge(); }
function onKline(key,k){
  var a=S.assets.filter(function(x){ return x.key===key; })[0]; if(!a||a.loading||a.err||k.i!==TFMAP[S.tf].iv) return;
  var t=Math.floor(+k.t/1000), c=+k.c; if(!(c>0)) return;
  a.rows.set(t,{o:+k.o,h:+k.h,l:+k.l,c:c,v:+k.v,x:!!k.x});
  scheduleLive(a,t);
}
async function backfill(keys,mk){
  var ver=gen;
  for(var i=0;i<keys.length;i++){
    var a=S.assets.filter(function(x){ return x.key===keys[i]; })[0]; if(!a||a.loading||a.err) continue;
    var from=a.rows.size?lastKey(a.rows)*1000:rangeBounds().from;
    try{
      var tok=a.req, r=await fetchKlines(DEPS,a.market,a.symbol,TFMAP[S.tf].iv,from,Date.now()+60000,function(){ return gen===ver&&a.req===tok&&S.assets.indexOf(a)>=0; });
      mergeKlines(a.rows,r.rows,Date.now());
    }catch(e){ /* stale or still offline — the next reconnect backfills again */ }
  }
  if(gen===ver) scheduleLive(null,0,true);
}
var liveQ=null, liveFull=false;
function scheduleLive(a,t,full){
  if(full) liveFull=true; else if(a){ if(!liveQ) liveQ={}; liveQ[a.key]=t; }
  if(ui.raf) return; ui.raf=requestAnimationFrame(function(){ ui.raf=0; var q=liveQ, f=liveFull; liveQ=null; liveFull=false; applyLive(q,f); });
}
function applyLive(q,full){
  if(!shown||busy) return;
  if(!full&&ui.cache){
    var C=ui.cache, ok=true;
    for(var key in q){
      var a=S.assets.filter(function(x){ return x.key===key; })[0], r=C.res[key], sr=ui.series.get(key); if(!a||!r||!r.ok||!sr) continue;
      var t=q[key], row=a.rows.get(t); if(!row||t<C.baseT) continue;
      var v=normalize(S.mode,row.c,r.start); if(v==null) continue;
      if(t<a.drawn){ ok=false; break; }
      try{ sr.update({time:t,value:v}); a.drawn=t; r.vals.set(t,v); r.last={time:t,value:v,price:row.c,x:row.x}; if(C.times[C.times.length-1]<t){ C.times.push(t); } if(ui.baseS&&t>ui.baseLast){ ui.baseS.update({time:t,value:baseValue(S.mode)}); ui.baseLast=t; } }catch(e){ ok=false; break; }
    }
    if(ok){ updateLegend(null); return; }
  }
  redraw(false);
}

/* ---------- chart ---------- */
function isLight(){ return document.documentElement.getAttribute('data-theme')==='light'; }
function fmtVal(v){ if(v==null||!isFinite(v)) return '—'; return S.mode==='idx'?v.toFixed(2):(v>0?'+':'')+v.toFixed(2)+'%'; }
function clearSeries(){ if(!ui||!ui.chart) return; ui.series.forEach(function(s){ try{ ui.chart.removeSeries(s); }catch(e){} }); ui.series.clear(); if(ui.baseS){ try{ ui.chart.removeSeries(ui.baseS); }catch(e){} ui.baseS=null; } ui.cache=null; }
function themeChart(){
  var L=isLight(); ui.chart.applyOptions({layout:{background:{type:'solid',color:L?'#f6f7fb':'#0b0e14'},textColor:L?'#5b6479':'#7f8aa3'},grid:{vertLines:{color:L?'rgba(20,30,60,.05)':'rgba(255,255,255,.03)'},horzLines:{color:L?'rgba(20,30,60,.08)':'rgba(255,255,255,.045)'}}});
}
function redraw(fit){
  if(!ui||!ui.chart) return;
  var C=compute(S.assets,reqBase(),S.mode); ui.cache=C;
  var T=TFMAP[S.tf];
  ui.chart.applyOptions({timeScale:{timeVisible:T.sec<86400,secondsVisible:false},localization:{priceFormatter:fmtVal,timeFormatter:function(t){ return typeof t==='number'?fmtT(t):''; }}});
  S.assets.forEach(function(a,i){
    var r=C.res[a.key], sr=ui.series.get(a.key);
    if(!sr){ sr=ui.chart.addLineSeries({color:a.color,lineWidth:i===0?3:2,lastValueVisible:true,priceLineVisible:false,crosshairMarkerRadius:4,title:''}); ui.series.set(a.key,sr); }
    sr.applyOptions({color:a.color,lineWidth:i===0?3:2,priceFormat:{type:'custom',formatter:fmtVal,minMove:0.01}});
    sr.setData(r&&r.ok?r.points:[]);
    a.drawn=r&&r.ok&&r.last?r.last.time:-1;
  });
  if(!ui.baseS){ ui.baseS=ui.chart.addLineSeries({color:isLight()?'rgba(40,50,80,.55)':'rgba(210,216,232,.5)',lineWidth:1,lineStyle:2,lastValueVisible:false,priceLineVisible:false,crosshairMarkerVisible:false}); }
  ui.baseS.applyOptions({priceFormat:{type:'custom',formatter:fmtVal,minMove:0.01}});
  if(ui.baseLine){ try{ ui.baseS.removePriceLine(ui.baseLine); }catch(e){} ui.baseLine=null; }
  ui.baseS.setData(C.times.map(function(t){ return {time:t,value:baseValue(S.mode)}; })); ui.baseLast=C.times.length?C.times[C.times.length-1]:0;
  ui.baseLine=ui.baseS.createPriceLine({price:baseValue(S.mode),color:isLight()?'rgba(40,50,80,.6)':'rgba(210,216,232,.6)',lineWidth:1,lineStyle:2,axisLabelVisible:true,title:S.mode==='idx'?'100 base':'0% base'});
  if(fit){ try{ ui.chart.timeScale().fitContent(); }catch(e){} }
  paint(); updateLegend(null);
}

/* ---------- UI chrome ---------- */
function h(tag,cls,txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function css(){
  if(document.getElementById('rpv-css')) return;
  var s=document.createElement('style'); s.id='rpv-css';
  s.textContent=
'#rpv{position:absolute;inset:0;z-index:7;display:none;flex-direction:column;background:var(--bg,#0b0e14);color:var(--txt,#e9edf5);font:12px/1.35 Inter,system-ui,sans-serif}'
+'#rpv .rp-row{display:flex;align-items:center;gap:6px;padding:5px 8px;overflow-x:auto;white-space:nowrap;scrollbar-width:none;-webkit-overflow-scrolling:touch}#rpv .rp-row::-webkit-scrollbar{display:none}'
+'#rpv .rp-title{font-weight:700;font-size:12.5px;margin-right:2px}'
+'#rpv button,#rpv select,#rpv input{font:600 11.5px system-ui;color:var(--txt,#e9edf5);background:var(--glass,rgba(22,27,38,.72));border:1px solid var(--line,rgba(255,255,255,.1));border-radius:8px;padding:4px 8px;min-height:28px}'
+'#rpv input{font-weight:500;color-scheme:dark}html[data-theme=light] #rpv input{color-scheme:light}'
+'#rpv button.on{background:var(--acc,#7c8cff);color:#fff;border-color:transparent}'
+'#rpv .rp-seg{display:inline-flex;gap:3px;flex:none}#rpv .rp-seg button{padding:4px 7px}'
+'#rpv .rp-chip{display:inline-flex;align-items:center;gap:5px;flex:none;border:1px solid;border-radius:999px;padding:2px 4px 2px 8px;background:var(--glass,rgba(22,27,38,.72))}'
+'#rpv .rp-chip.pri{box-shadow:0 0 0 1px currentColor inset}'
+'#rpv .rp-chip i{width:9px;height:9px;border-radius:50%;display:inline-block}'
+'#rpv .rp-chip button{border:0;background:none;padding:0 3px;min-height:0;font-weight:700}'
+'#rpv .rp-bd{font-size:9px;font-weight:700;padding:1px 5px;border-radius:6px;background:rgba(255,255,255,.1);letter-spacing:.3px}'
+'#rpv .rp-v{font-weight:700;font-variant-numeric:tabular-nums;min-width:52px;text-align:right}.rp-up{color:#2dd4a7}.rp-dn{color:#ff5d7a}.rp-na{color:#f5b942}'
+'#rpv .rp-sub{font-size:11px;color:var(--mut,#7f8aa3)}#rpv .rp-sub label{display:inline-flex;align-items:center;gap:4px;flex:none}'
+'#rpv .rp-chart{position:relative;flex:1;min-height:0}#rpv .rp-chart>div:first-child{position:absolute;inset:0}'
+'#rpv .rp-time{position:absolute;left:8px;top:4px;z-index:3;pointer-events:none;font-size:11px;font-weight:600;color:var(--mut,#7f8aa3);text-shadow:0 1px 6px rgba(0,0,0,.6)}'
+'#rpv .rp-warn{padding:0 8px;display:flex;flex-direction:column;gap:3px;max-height:96px;overflow-y:auto}'
+'#rpv .rp-w{display:flex;gap:8px;align-items:center;border:1px solid #f5b94266;background:#f5b94214;border-radius:8px;padding:3px 8px;color:#f5b942;font-size:11px}#rpv .rp-w span{flex:1}#rpv .rp-w button{flex:none;padding:2px 7px;min-height:24px}'
+'#rpv .rp-foot{display:flex;gap:8px;align-items:center;padding:4px 8px calc(4px + env(safe-area-inset-bottom,0px));font-size:10px;color:var(--mut,#7f8aa3)}#rpv .rp-foot span:last-child{flex:1}'
+'#rpv .rp-live{display:inline-flex;align-items:center;gap:4px;font-weight:700;flex:none}#rpv .rp-live i{width:7px;height:7px;border-radius:50%;background:#7f8aa3;display:inline-block}'
+'#rpv .rp-add{position:absolute;inset:0;z-index:5;display:none;flex-direction:column;background:var(--bg,#0b0e14);padding:8px}#rpv .rp-add.on{display:flex}'
+'#rpv .rp-add input.q{width:100%;box-sizing:border-box;margin:6px 0;padding:8px 10px;font-size:14px}'
+'#rpv .rp-list{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:3px}#rpv .rp-list button{text-align:left;padding:9px 10px;font-size:13px}'
+'#rpv .rp-busy{position:absolute;inset:0;z-index:2;display:none;align-items:center;justify-content:center;pointer-events:none;color:var(--mut,#7f8aa3);font-weight:600}'
+'@media (max-width:520px){#rpv .rp-title{display:none}}';
  document.head.appendChild(s);
}
function ensureUI(){
  if(ui) return ui;
  css();
  var root=h('div'); root.id='rpv';
  var top=h('div'), r1=h('div','rp-row'), r2=h('div','rp-row'), r3=h('div','rp-row rp-sub');
  r1.appendChild(h('span','rp-title','Relative Performance'));
  var seg=h('div','rp-seg'); [['pct','%'],['idx','Index']].forEach(function(m){ var b=h('button',null,m[1]); b.dataset.m=m[0]; b.onclick=function(){ if(S.mode===m[0]) return; S.mode=m[0]; saveS(); redraw(false); }; seg.appendChild(b); }); r1.appendChild(seg);
  var sel=h('select'); TFS.forEach(function(x){ var o=h('option',null,x[0]); o.value=x[0]; sel.appendChild(o); });
  sel.onchange=function(){ S.tf=sel.value; saveS(); reloadAll(true); }; r1.appendChild(sel);
  var rs=h('div','rp-seg'); RANGES.forEach(function(x){ var b=h('button',null,x[0]); b.dataset.r=x[0]; b.onclick=function(){ S.range=x[0]; S.baseT=null; saveS(); reloadAll(true); }; rs.appendChild(b); }); r1.appendChild(rs);
  var lg=h('div','rp-row'); lg.style.padding='2px 8px'; r2=lg;
  var bl=h('label'); bl.appendChild(document.createTextNode('Base (UTC)')); var bi=h('input'); bi.type='datetime-local'; bl.appendChild(bi);
  bi.onchange=function(){ var ms=Date.parse(bi.value+':00Z'); if(!isFinite(ms)) return; S.baseT=Math.floor(ms/1000); saveS(); if(S.baseT<firstLoaded()) reloadAll(false); else redraw(false); };
  r3.appendChild(bl);
  var bv=h('button',null,'Base = view start'); bv.onclick=function(){ var vr=null; try{ vr=ui.chart.timeScale().getVisibleRange(); }catch(e){} if(!vr||typeof vr.from!=='number') return toast('Nothing to rebase on yet','#f5b942'); S.baseT=Math.ceil(vr.from); saveS(); redraw(false); }; r3.appendChild(bv);
  var fl=h('label'); fl.appendChild(document.createTextNode('From')); var fi=h('input'); fi.type='date'; fl.appendChild(fi); r3.appendChild(fl);
  var tl=h('label'); tl.appendChild(document.createTextNode('To')); var ti=h('input'); ti.type='date'; tl.appendChild(ti); r3.appendChild(tl);
  var ap=h('button',null,'Apply range'); ap.onclick=function(){ if(!fi.value||!ti.value||fi.value>ti.value) return toast('Pick a valid From / To date','#ff5d7a'); S.range='custom'; S.cFrom=fi.value; S.cTo=ti.value; S.baseT=null; saveS(); reloadAll(true); }; r3.appendChild(ap);
  var ft=h('button',null,'Fit'); ft.onclick=function(){ try{ ui.chart.timeScale().fitContent(); }catch(e){} }; r3.appendChild(ft);
  var rt=h('button',null,'Reset'); rt.onclick=function(){ defaults(false); saveS(); reloadAll(true); }; r3.appendChild(rt);
  top.appendChild(r1); top.appendChild(r2); top.appendChild(r3); root.appendChild(top);
  var cw=h('div','rp-chart'), cd=h('div'), tm=h('div','rp-time'), bz=h('div','rp-busy','Loading Binance history…'); cw.appendChild(cd); cw.appendChild(tm); cw.appendChild(bz); root.appendChild(cw);
  var warn=h('div','rp-warn'); root.appendChild(warn);
  var foot=h('div','rp-foot'), lv=h('span','rp-live'); lv.appendChild(h('i')); lv.appendChild(h('b','', 'OFF')); foot.appendChild(lv);
  foot.appendChild(h('span',null,'Binance Kline data · times UTC · base candle close = 0% / 100 · gaps are never filled · past relative performance is not a trading signal'));
  root.appendChild(foot);
  var add=h('div','rp-add'); root.appendChild(add);
  $('mw').appendChild(root);
  ui={root:root,chartEl:cd,time:tm,busy:bz,warn:warn,legend:r2,live:lv,add:add,sel:sel,seg:seg,rs:rs,bi:bi,fi:fi,ti:ti,series:new Map(),baseS:null,baseLine:null,cache:null,chart:null,raf:0,baseLast:0};
  ui.chart=LightweightCharts.createChart(cd,Object.assign(opts(),{kineticScroll:{touch:false,mouse:false}}));
  themeChart();
  ui.chart.applyOptions({rightPriceScale:{borderVisible:false,scaleMargins:{top:.1,bottom:.1}},crosshair:{mode:0}});
  ui.chart.subscribeCrosshairMove(function(p){ updateLegend(p&&p.time&&typeof p.time==='number'?p.time:null); });
  return ui;
}
function firstLoaded(){ var m=Infinity; S.assets.forEach(function(a){ if(a.rows&&a.rows.size){ var f=firstKey(a.rows); if(f<m) m=f; } }); return m; }

function paint(){
  if(!ui) return;
  Array.prototype.forEach.call(ui.seg.children,function(b){ b.classList.toggle('on',b.dataset.m===S.mode); });
  Array.prototype.forEach.call(ui.rs.children,function(b){ b.classList.toggle('on',b.dataset.r===S.range); });
  ui.sel.value=S.tf;
  var rb=rangeBounds(), bt=ui.cache&&ui.cache.baseT!=null?ui.cache.baseT:Math.ceil(rb.from/1000);
  ui.bi.value=new Date(bt*1000).toISOString().slice(0,16);
  if(S.range==='custom'){ ui.fi.value=S.cFrom; ui.ti.value=S.cTo; } else { ui.fi.value=new Date(rb.from).toISOString().slice(0,10); ui.ti.value=new Date(rb.to).toISOString().slice(0,10); }
  ui.busy.style.display=busy?'flex':'none';
  paintLegend(); paintWarn(); liveBadge();
}
function paintLegend(){
  var L=ui.legend; L.innerHTML='';
  S.assets.forEach(function(a,i){
    var c=h('div','rp-chip'+(i===0?' pri':'')); c.style.borderColor=a.color; c.style.color=a.color;
    var dot=h('i'); dot.style.background=a.color; c.appendChild(dot);
    var nm=h('button',null,a.symbol); nm.style.color='var(--txt,#e9edf5)'; nm.title=i===0?'Primary asset':'Tap to make primary'; nm.onclick=function(){ makePrimary(a.key); }; c.appendChild(nm);
    c.appendChild(h('span','rp-bd',a.market==='F'?'FUT':'SPOT'));
    var v=h('span','rp-v','…'); v.dataset.k=a.key; c.appendChild(v);
    var x=h('button',null,'×'); x.title='Remove'; x.style.color='var(--mut,#7f8aa3)'; x.onclick=function(){ removeAsset(a.key); }; c.appendChild(x);
    L.appendChild(c);
  });
  if(S.assets.length<MAXA){ var ad=h('button',null,'+ Add asset'); ad.onclick=openAdd; L.appendChild(ad); }
  updateLegend(null);
}
function updateLegend(t){
  if(!ui||!ui.cache) return;
  var C=ui.cache, shownT=null, inc=false;
  S.assets.forEach(function(a){
    var el=ui.legend.querySelector('[data-k="'+a.key+'"]'); if(!el) return;
    var r=C.res[a.key]; el.className='rp-v'; el.removeAttribute('title');
    if(a.loading){ el.textContent='…'; return; }
    if(!r||!r.ok){ el.textContent='no data'; el.classList.add('rp-na'); el.title=a.err||(r&&r.reason)||''; return; }
    var v=t!=null?r.vals.get(t):(r.last?r.last.value:null);
    el.textContent=v==null?'gap':fmtVal(v);
    if(v!=null&&S.mode==='pct') el.classList.add(v>=0?'rp-up':'rp-dn'); else if(v==null) el.classList.add('rp-na');
    var row=a.rows.get(t!=null?t:(r.last?r.last.time:-1)); if(row){ el.title=a.symbol+' price '+row.c; if(!row.x) inc=true; }
  });
  var lastT=C.times.length?C.times[C.times.length-1]:null; shownT=t!=null?t:lastT;
  ui.time.textContent=C.baseT==null?'':((t!=null?'':'Latest · ')+(shownT!=null?fmtT(shownT):'')+(inc?' · candle still forming':'')+'   |   Base '+fmtT(C.baseT));
}
function commonStart(){
  var m=-Infinity, any=false; S.assets.forEach(function(a){ if(a.rows&&a.rows.size&&!a.err){ any=true; var f=firstKey(a.rows); if(f>m) m=f; } }); return any?m:null;
}
function paintWarn(){
  var W=ui.warn; W.innerHTML=''; var C=ui.cache, rb=rangeBounds();
  function row(msg,btn,fn){ var d=h('div','rp-w'); d.appendChild(h('span',null,msg)); if(btn){ var b=h('button',null,btn); b.onclick=fn; d.appendChild(b); } W.appendChild(d); }
  S.assets.forEach(function(a){
    if(a.loading) return;
    var r=C&&C.res[a.key];
    var lab=a.symbol+' ('+(a.market==='F'?'Futures':'Spot')+')';
    if(a.err) row(lab+': '+a.err,'Retry',function(){ var ver=gen,b=rangeBounds(); a.loading=true; paint(); loadOne(a,ver,b).then(function(){ if(ver!==gen) return; redraw(false); startFeed(rangeBounds()); }); });
    else if(r&&!r.ok){ var cs=commonStart(); row(lab+': '+r.reason+'. Not drawn — nothing is estimated.',cs!=null&&C.baseT!=null&&cs>C.baseT?'Start at '+fmtT(cs).slice(0,16):null,function(){ S.baseT=cs; saveS(); redraw(false); }); }
    else if(a.trunc) row(lab+': history truncated to the newest '+MAXC.toLocaleString()+' candles — choose a coarser timeframe.');
  });
  if(rb.clipped) row('Range clipped to '+MAXC.toLocaleString()+' candles for '+S.tf+' — pick a coarser timeframe to see more history.');
  if(S.assets.length===1&&!S.assets[0].loading) row('Add a second asset to compare performance.');
}
function liveBadge(){
  if(!ui) return;
  var st=feed?feed.status():'off', b=ui.live.querySelector('b'), i=ui.live.querySelector('i');
  var rb=null; try{ rb=rangeBounds(); }catch(e){}
  if(st==='live'){ b.textContent='LIVE'; i.style.background='#2dd4a7'; }
  else if(st==='reconnecting'){ b.textContent='RECONNECTING…'; i.style.background='#f5b942'; }
  else { b.textContent=(rb&&!rb.live)?'HISTORICAL':'OFFLINE'; i.style.background='#7f8aa3'; }
}

/* ---------- add-asset sheet ---------- */
async function ensureSyms(){
  if(symBusy) return; symBusy=true;
  try{
    if(!symLists.S){ var a=await jget(API+'/api/v3/ticker/price'); if(Array.isArray(a)) symLists.S=a.map(function(x){ return x.symbol; }).filter(function(s){ return /^[A-Z0-9]{3,24}$/.test(s); }).sort(); }
    if(!symLists.F){ var b=await jget(FAPI+'/fapi/v1/ticker/price'); if(Array.isArray(b)) symLists.F=b.map(function(x){ return x.symbol; }).filter(function(s){ return /^[A-Z0-9]{3,24}$/.test(s); }).sort(); }
  }catch(e){}
  symBusy=false; if(ui.add.classList.contains('on')) paintAdd();
}
function openAdd(){ addMk=S.assets.length&&S.assets[0].market==='F'?'F':'S'; ui.add.classList.add('on'); paintAdd(true); ensureSyms(); }
function closeAdd(){ if(ui) ui.add.classList.remove('on'); }
function paintAdd(focus){
  var keep=(ui.add.querySelector('input.q')||{}).value||''; ui.add.innerHTML='';
  var hd=h('div','rp-row'); hd.style.padding='0'; hd.appendChild(h('b',null,'Add comparison asset'));
  var sg=h('div','rp-seg'); [['S','Binance Spot'],['F','USDⓈ-M Futures']].forEach(function(m){ var b=h('button',m[0]===addMk?'on':null,m[1]); b.onclick=function(){ addMk=m[0]; paintAdd(true); }; sg.appendChild(b); }); hd.appendChild(sg);
  var cl=h('button',null,'Close'); cl.style.marginLeft='auto'; cl.onclick=closeAdd; hd.appendChild(cl); ui.add.appendChild(hd);
  var q=h('input','q'); q.type='search'; q.placeholder='Search symbol, e.g. SOL'; q.autocapitalize='characters'; q.value=keep; ui.add.appendChild(q);
  var ls=h('div','rp-list'); ui.add.appendChild(ls);
  var draw=function(){
    ls.innerHTML=''; var s=q.value.toUpperCase().replace(/[^A-Z0-9]/g,''), L=symLists[addMk];
    if(!L){ ls.appendChild(h('div','rp-sub',symBusy?'Loading Binance symbols…':'Could not load the symbol list. You can still type an exact symbol below.')); }
    var hits=L?L.filter(function(x){ return !s||x.indexOf(s)>=0; }).sort(function(a,b){ var A=a.indexOf(s)===0?0:1,B=b.indexOf(s)===0?0:1; return A-B||(/USDT$/.test(b)?1:0)-(/USDT$/.test(a)?1:0)||a.length-b.length; }).slice(0,60):[];
    hits.forEach(function(x){ var b=h('button',null,x+'  ·  '+(addMk==='F'?'Futures':'Spot')); b.onclick=function(){ addAsset(addMk,x); }; ls.appendChild(b); });
    if(s.length>=3&&(!L||hits.indexOf(s)<0)){ var m=h('button',null,'Try "'+s+'" on '+(addMk==='F'?'Futures':'Spot')+(L?' (not in list)':'')); m.onclick=function(){ addAsset(addMk,s); }; ls.appendChild(m); }
  };
  q.oninput=draw; draw(); if(focus){ try{ q.focus({preventScroll:true}); }catch(e){} }
}

/* ---------- show / hide ---------- */
function show(){
  ensureUI(); if(!shown){ shown=true; ui.root.style.display='flex'; }
  themeChart(); paint(); reloadAll(true);
}
function hide(){ if(!shown) return; shown=false; gen++; busy=false; stopFeed(); closeAdd(); if(ui) ui.root.style.display='none'; }
G.mpRP.type=function(t,prev){ try{ if(t===21) show(); else if(prev===21||shown) hide(); }catch(e){ console.error('relative performance',e); } };
G.mpRP.show=show; G.mpRP.hide=hide;
document.addEventListener('visibilitychange',function(){ if(shown&&!document.hidden&&feed){ feed.reconnectNow(); } });
G.addEventListener('online',function(){ if(shown&&feed) feed.reconnectNow(); });
loadS();
try{ if(typeof ctype!=='undefined'&&ctype===21) show(); }catch(e){}
})();
/*@@part 14*/
(function(){
'use strict';
var G=(typeof window!=='undefined')?window:globalThis;

/* ====================================================================================================
   CORE  (pure logic — no DOM; unit-tested in Node with hand-computed data)
   Conventions
   - Every return is open→close of its own period: (close / open − 1) × 100. Percent units.
   - Hour / weekday observations are built from Binance 1h klines (UTC open times). Month observations from 1M klines (UTC months).
   - A period is a valid observation only if it is completed (close time ≤ now) and every candle it needs exists.
   - Missing data is excluded, never replaced by 0 or interpolated.
   ==================================================================================================== */
var HOUR=3600, MINN={hour:5,weekday:5,month:2,cell:5};
var WD=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var MAXC=40000;   // max hourly candles loaded per symbol (~4.5 years)

/* ---------- time zones (Intl handles daylight-saving transitions) ---------- */
var dtfCache={};
function okTz(tz){ try{ new Intl.DateTimeFormat('en-US',{timeZone:tz}); return true; }catch(e){ return false; } }
function dtf(tz){ return dtfCache[tz]||(dtfCache[tz]=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})); }
function parts(t,tz){            // t = unix seconds → local calendar fields in tz; wd: 0=Mon … 6=Sun
  var d,y,mo,dd,h,mi;
  if(tz==='UTC'){ d=new Date(t*1000); y=d.getUTCFullYear(); mo=d.getUTCMonth()+1; dd=d.getUTCDate(); h=d.getUTCHours(); mi=d.getUTCMinutes(); }
  else { var o={}; dtf(tz).formatToParts(new Date(t*1000)).forEach(function(x){ o[x.type]=x.value; }); y=+o.year; mo=+o.month; dd=+o.day; h=(+o.hour)%24; mi=+o.minute; }
  return {y:y,mo:mo,d:dd,h:h,mi:mi,wd:(new Date(Date.UTC(y,mo-1,dd)).getUTCDay()+6)%7,key:y*10000+mo*100+dd};
}

/* ---------- statistics ---------- */
function stats(a){                // a: [{r,v}]  r = return %, v = volume
  var n=a.length; if(!n) return null;
  var sum=0,pos=0,neg=0,vs=0,mn=Infinity,mx=-Infinity,i,rs=new Array(n);
  for(i=0;i<n;i++){ var r=a[i].r; rs[i]=r; sum+=r; if(r>0) pos++; else if(r<0) neg++; vs+=a[i].v||0; if(r<mn) mn=r; if(r>mx) mx=r; }
  var mean=sum/n; rs.sort(function(x,y){ return x-y; });
  var median=n%2?rs[(n-1)/2]:(rs[n/2-1]+rs[n/2])/2, sd=null;
  if(n>1){ var ss=0; for(i=0;i<n;i++){ var dv=a[i].r-mean; ss+=dv*dv; } sd=Math.sqrt(ss/(n-1)); }   // sample standard deviation, not annualized
  return {n:n,mean:mean,median:median,win:pos/n*100,loss:neg/n*100,flat:(n-pos-neg)/n*100,avgVol:vs/n,sd:sd,min:mn,max:mx};
}

/* ---------- data hygiene ---------- */
function mergeKlines(rows,arr,nowMs){
  var seen=new Set(), bad=0, dups=0, n=0;
  for(var i=0;i<arr.length;i++){
    var k=arr[i]; if(!k||k.length<7){ bad++; continue; }
    var t=Math.floor(+k[0]/1000), o=+k[1], h=+k[2], l=+k[3], c=+k[4], v=+k[5], tol=1e-9;
    if(!isFinite(t)||!(o>0)||!(h>0)||!(l>0)||!(c>0)||!(v>=0)||!isFinite(o+h+l+c+v)||h<Math.max(o,c)*(1-tol)||l>Math.min(o,c)*(1+tol)||h<l){ bad++; continue; }
    if(seen.has(t)) dups++; seen.add(t);
    rows.set(t,{o:o,h:h,l:l,c:c,v:v,x:(+k[6])<=nowMs}); n++;
  }
  return {n:n,bad:bad,dups:dups};
}
function sortedKeys(rows){ var a=[]; rows.forEach(function(_,t){ a.push(t); }); a.sort(function(x,y){ return x-y; }); return a; }
function countGaps(rows,from,to){   // hourly candles absent between the first and last present candle inside [from,to)
  var ks=sortedKeys(rows).filter(function(t){ return t>=from&&t<to; }); if(ks.length<2) return 0;
  return Math.round((ks[ks.length-1]-ks[0])/HOUR)+1-ks.length;
}

/* ---------- observations ---------- */
/* W-hour window starting at each hourly candle: open of first candle → close of last, needs W contiguous COMPLETED candles. */
function hourObs(rows,W,tz,from,to){
  var out=[], skipped=0;
  rows.forEach(function(r,t){
    if(t<from||t>=to) return;
    if(!r.x){ return; }
    var last=r, vs=r.v, ok=true, k;
    for(k=1;k<W;k++){ var q=rows.get(t+k*HOUR); if(!q||!q.x||t+k*HOUR>=to){ ok=false; break; } last=q; vs+=q.v; }
    if(!ok){ skipped++; return; }
    var p=parts(t,tz); out.push({t:t,r:(last.c/r.o-1)*100,v:vs,wd:p.wd,h:p.h,mi:p.mi});
  });
  out.skipped=skipped; return out;
}
/* Whole local calendar days (in tz) built from hourly candles. A day counts only if it is contiguous, fully elapsed, every
   candle is completed, and both its first and last hour sit on the day's boundaries (23- and 25-hour DST days are fine). */
function dayObs(rows,tz,from,to,nowSec){
  var ks=sortedKeys(rows).filter(function(t){ return t>=from&&t<to; }), groups=[], g=null, i;
  for(i=0;i<ks.length;i++){ var p=parts(ks[i],tz); if(!g||g.key!==p.key){ g={key:p.key,p:p,ts:[]}; groups.push(g); } g.ts.push(ks[i]); }
  var out=[], dropped=0;
  groups.forEach(function(G2){
    var ts=G2.ts, n=ts.length, ok=true, vs=0, j;
    for(j=0;j<n;j++){ var r=rows.get(ts[j]); if(!r.x){ ok=false; break; } vs+=r.v; if(j&&ts[j]-ts[j-1]!==HOUR){ ok=false; break; } }
    if(ok&&parts(ts[0]-HOUR,tz).key===G2.key) ok=false;                       // day started before the first candle we have
    if(ok&&(parts(ts[n-1]+HOUR,tz).key===G2.key||ts[n-1]+HOUR>nowSec||ts[n-1]+HOUR>to)) ok=false;   // day not finished yet
    if(!ok){ dropped++; return; }
    var o=rows.get(ts[0]).o, c=rows.get(ts[n-1]).c;
    out.push({key:G2.key,y:G2.p.y,mo:G2.p.mo,d:G2.p.d,wd:G2.p.wd,r:(c/o-1)*100,v:vs,n:n});
  });
  out.dropped=dropped; return out;
}
/* mrows: 1M klines (UTC months). The listing month (first kline ever) may be partial → excluded; the running month is not completed. */
function monthObs(mrows,from,to){
  var ks=sortedKeys(mrows), done=[], prog=[], first=ks.length?ks[0]:null, listing=null;
  ks.forEach(function(t){
    var r=mrows.get(t), p=parts(t,'UTC');
    if(t<from||t>=to) return;
    if(!r.x){ prog.push({y:p.y,mo:p.mo,r:(r.c/r.o-1)*100}); return; }
    if(t===first){ listing={y:p.y,mo:p.mo}; return; }
    done.push({y:p.y,mo:p.mo,r:(r.c/r.o-1)*100,v:r.v});
  });
  done.listing=listing; done.prog=prog; return done;
}

function aggregate(hobs,days,mobs){
  var i,j, H=[],W=[],M=[],C=[],years={};
  for(i=0;i<24;i++) H.push([]);
  for(i=0;i<7;i++){ W.push([]); C.push([]); for(j=0;j<24;j++) C[i].push([]); }
  for(i=0;i<12;i++) M.push([]);
  var rowMi=new Array(24).fill(0);
  hobs.forEach(function(o){ C[o.wd][o.h].push(o); H[o.h].push(o); rowMi[o.h]=o.mi; });
  days.forEach(function(d){ W[d.wd].push(d); });
  mobs.forEach(function(m){ M[m.mo-1].push(m); (years[m.y]||(years[m.y]=new Array(12).fill(null)))[m.mo-1]=m; });
  return {
    heat:C.map(function(r){ return r.map(stats); }), byHour:H.map(stats), byWd:W.map(stats), byMonth:M.map(stats), years:years,
    overall:stats(hobs), overallDay:stats(days), rowMi:rowMi
  };
}
function pick(arr,minN,best){     // arr of stats|null → index of best/worst mean with enough observations, or -1
  var bi=-1; arr.forEach(function(s,i){ if(!s||s.n<minN) return; if(bi<0||(best?s.mean>arr[bi].mean:s.mean<arr[bi].mean)) bi=i; }); return bi;
}
function summary(A){
  var s={};
  s.bestHour=pick(A.byHour,MINN.hour,true); s.worstHour=pick(A.byHour,MINN.hour,false);
  s.bestWd=pick(A.byWd,MINN.weekday,true); s.worstWd=pick(A.byWd,MINN.weekday,false);
  s.bestMonth=pick(A.byMonth,MINN.month,true); s.worstMonth=pick(A.byMonth,MINN.month,false);
  return s;
}

/* ---------- lookback ---------- */
var LOOK=[['30D',30],['90D',90],['180D',180],['1Y',365],['2Y',730],['3Y',1095],['ALL',0],['Custom',-1]];
function bounds(look,cFrom,cTo,nowSec){
  var to=Math.floor(nowSec/HOUR)*HOUR+HOUR, from, clipped=false;   // `to` is exclusive; the hour in progress is never completed
  if(look==='Custom'){
    var f=Date.parse((cFrom||'')+'T00:00:00Z')/1000, t=Date.parse((cTo||'')+'T00:00:00Z')/1000+86400;
    if(!isFinite(f)||!isFinite(t)||t<=f) return null;
    from=f; to=Math.min(t,to);
  } else {
    var e=LOOK.filter(function(x){ return x[0]===look; })[0]||LOOK[3];
    from=e[1]?Math.floor((nowSec-e[1]*86400)/HOUR)*HOUR:0;
  }
  if(to-from>MAXC*HOUR){ from=to-MAXC*HOUR; clipped=true; }
  return {from:from,to:to,clipped:clipped};
}

/* ---------- Binance paging ---------- */
async function fetchKlines(d,mk,s,iv,fromMs,toMs,alive,progress){
  var base=mk==='F'?d.FAPI+'/fapi/v1':d.API+'/api/v3', out=[], start=fromMs, pages=0;
  for(;;){
    if(!alive()) throw new Error('stale');
    var j=await d.json(base+'/klines?symbol='+encodeURIComponent(s)+'&interval='+iv+'&startTime='+start+'&endTime='+toMs+'&limit=1000');
    if(!alive()) throw new Error('stale');
    if(!Array.isArray(j)){ var e=new Error(j&&j.msg?String(j.msg):'Bad response from Binance'); e.code=j&&j.code; throw e; }
    for(var i=0;i<j.length;i++) out.push(j[i]);
    if(progress) progress(out.length);
    if(j.length<1000) break;
    start=j[j.length-1][0]+1;
    if(++pages>MAXC/1000+5) break;
  }
  return out;
}

G.mpSE={core:{parts:parts,stats:stats,mergeKlines:mergeKlines,countGaps:countGaps,hourObs:hourObs,dayObs:dayObs,monthObs:monthObs,aggregate:aggregate,summary:summary,pick:pick,bounds:bounds,fetchKlines:fetchKlines,okTz:okTz,MINN:MINN,WD:WD,MN:MN,HOUR:HOUR,MAXC:MAXC}};

/* ====================================================================================================
   UI  (only inside the app)
   ==================================================================================================== */
if(typeof document==='undefined'||typeof $==='undefined'||typeof API==='undefined') return;

var KEY='mpvSEv1', SVG='http://www.w3.org/2000/svg';
var TZS=[['UTC','UTC'],['local','Device time'],['Africa/Nairobi','Nairobi (EAT)'],['Europe/London','London'],['Europe/Berlin','Frankfurt / Berlin'],['America/New_York','New York'],['Asia/Dubai','Dubai'],['Asia/Kolkata','Mumbai (IST)'],['Asia/Singapore','Singapore'],['Asia/Tokyo','Tokyo'],['Australia/Sydney','Sydney']];
var METRICS=[['mean','Average return'],['median','Median return'],['win','Win rate'],['avgVol','Average volume'],['sd','Volatility']];
var VIEWS=[['heat','Heatmap'],['hour','Hourly'],['week','Weekly'],['month','Monthly'],['years','Years']];
var S={market:'S',symbol:'BTCUSDT',look:'1Y',tz:'UTC',metric:'mean',view:'heat',win:1,cFrom:'',cTo:''};
var gen=0, shown=false, busy=false, ui=null, err=null, cache={}, mcache={}, A=null, DATA=null, sel=null, symLists={S:null,F:null}, symBusy=false, addMk='S', timer=null, progressTxt='', updatedAt=0;

function sleep(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
async function jget(url){
  var last;
  for(var a=0;a<3;a++){
    try{
      var r=await fetch(url);
      if(r.status===429||r.status===418){
        var ra=+((r.headers&&r.headers.get&&r.headers.get('Retry-After'))||0);
        if(a<2&&ra>0&&ra<=10){ await sleep(ra*1000); continue; }
        var e=new Error('Binance rate limit reached — wait a minute, then retry'); e.rate=true; throw e;
      }
      return await r.json();
    }catch(e){ last=e; if(e.rate) throw e; await sleep(400*(a+1)); }
  }
  throw last||new Error('Network error');
}
var DEPS={json:jget,API:API,FAPI:FAPI};
function realTz(){ if(S.tz==='local'){ try{ var z=Intl.DateTimeFormat().resolvedOptions().timeZone; return okTz(z)?z:'UTC'; }catch(e){ return 'UTC'; } } return okTz(S.tz)?S.tz:'UTC'; }
function mkey(){ return S.market+':'+S.symbol; }
function saveS(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
function loadS(){
  var had=false;
  try{ var raw=localStorage.getItem(KEY); had=!!raw; var j=JSON.parse(raw||'null'); if(j){ ['market','symbol','look','tz','metric','view','cFrom','cTo'].forEach(function(k){ if(typeof j[k]==='string') S[k]=j[k]; }); if(j.win===1||j.win===2||j.win===4) S.win=j.win; } }catch(e){}
  if(!/^[A-Z0-9]{3,24}$/.test(S.symbol)) S.symbol='BTCUSDT'; if(S.market!=='F') S.market='S';
  if(!LOOK.some(function(x){ return x[0]===S.look; })) S.look='1Y';
  if(!had){ try{ var s0=String(sym[0]||'').toUpperCase(); if(/^[A-Z0-9]{3,24}$/.test(s0)){ S.symbol=s0; S.market=isPerp(s0)?'F':'S'; } }catch(e){} }
}

/* ---------- loading (cached; only the missing range / newest candles are requested) ---------- */
function friendly(e){
  if(e&&e.code===-1121) return 'Symbol not found on Binance '+(S.market==='F'?'USDⓈ-M Futures':'Spot')+'.';
  if(e&&e.rate) return e.message;
  if(e&&e.message&&e.message!=='Failed to fetch'&&e.name!=='TypeError') return String(e.message).slice(0,140);
  return 'Network problem — could not load Binance data.';
}
async function ensureData(ver,b){
  var key=mkey(), alive=function(){ return gen===ver; }, nowMs=Date.now();
  var c=cache[key]||(cache[key]={rows:new Map(),reqFrom:Infinity,bad:0,dups:0});
  var prog=function(n){ progressTxt='Loading hourly candles… '+n.toLocaleString(); if(ui) paintBusy(); };
  if(b.from<c.reqFrom){
    var hiMs=c.reqFrom===Infinity?nowMs:c.reqFrom*1000-1;
    var arr=await fetchKlines(DEPS,S.market,S.symbol,'1h',b.from*1000,hiMs,alive,prog);
    var m=mergeKlines(c.rows,arr,nowMs); c.bad+=m.bad; c.dups+=m.dups; c.reqFrom=b.from;
  }
  var lk=c.rows.size?sortedKeys(c.rows).pop():b.from;      // refresh the newest candles (the forming one becomes completed)
  var tail=await fetchKlines(DEPS,S.market,S.symbol,'1h',lk*1000,nowMs+60000,alive,null);
  var m2=mergeKlines(c.rows,tail,nowMs); c.bad+=m2.bad;   // overlap with the cached tail is intended, so duplicates are not counted here
  if(!c.rows.size) throw Object.assign(new Error('Binance returned no candles for this symbol / market.'),{code:-1121});
  var mc=mcache[key]||(mcache[key]={rows:new Map()});
  var marr=await fetchKlines(DEPS,S.market,S.symbol,'1M',0,nowMs+60000,alive,null);
  mergeKlines(mc.rows,marr,nowMs);
  return c;
}
async function reload(){
  var ver=++gen; err=null; busy=true; progressTxt='Loading…'; paintBusy();
  var b=bounds(S.look,S.cFrom,S.cTo,Math.floor(Date.now()/1000));
  if(!b){ busy=false; err='Pick a valid From / To date.'; DATA=null; A=null; render(); return; }
  try{ await ensureData(ver,b); }
  catch(e){ if(ver!==gen) return; busy=false; err=friendly(e); DATA=null; A=null; render(); return; }
  if(ver!==gen) return;
  busy=false; updatedAt=Date.now(); compute(); render();
}
function compute(){
  var b=bounds(S.look,S.cFrom,S.cTo,Math.floor(Date.now()/1000)); if(!b){ A=null; return; }
  var key=mkey(), c=cache[key], mc=mcache[key], tz=realTz(), now=Math.floor(Date.now()/1000);
  var hobs=hourObs(c.rows,S.win,tz,b.from,b.to), days=dayObs(c.rows,tz,b.from,b.to,now), mobs=monthObs(mc.rows,b.from,b.to);
  var firstT=sortedKeys(c.rows)[0];
  DATA={b:b,tz:tz,hobs:hobs,days:days,mobs:mobs,gaps:countGaps(c.rows,b.from,b.to),bad:c.bad,dups:c.dups,firstT:firstT,
    truncated:b.clipped&&firstT<=b.from+HOUR*2};
  A=aggregate(hobs,days,mobs); A.sum=summary(A);
}
function tick(){
  if(!shown||busy||!A) return; var ver=gen, key=mkey(), c=cache[key]; if(!c) return;
  var before=0; c.rows.forEach(function(r){ if(r.x) before++; });
  var nowMs=Date.now(), lk=sortedKeys(c.rows).pop();
  fetchKlines(DEPS,S.market,S.symbol,'1h',lk*1000,nowMs+60000,function(){ return gen===ver; },null).then(function(tail){
    if(ver!==gen) return; mergeKlines(c.rows,tail,nowMs);
    var after=0; c.rows.forEach(function(r){ if(r.x) after++; });
    updatedAt=Date.now(); if(after!==before){ compute(); render(); } else paintNotes();
  }).catch(function(){});
}

/* ---------- formatting ---------- */
function pad(n){ return (n<10?'0':'')+n; }
function fmtR(v,d){ if(v==null||!isFinite(v)) return '—'; var a=Math.abs(v); d=d==null?(a<0.1?3:2):d; return (v>0?'+':'')+v.toFixed(d)+'%'; }
function fmtV(v){ if(v==null||!isFinite(v)) return '—'; var a=Math.abs(v); return a>=1e9?(v/1e9).toFixed(2)+'B':a>=1e6?(v/1e6).toFixed(2)+'M':a>=1e3?(v/1e3).toFixed(1)+'K':v.toFixed(a<10?2:0); }
function mval(s,m){ if(!s) return null; return s[m]==null?null:s[m]; }
function fmtM(v,m){ if(v==null) return '—'; return m==='win'?v.toFixed(0)+'%':m==='avgVol'?fmtV(v):m==='sd'?v.toFixed(2)+'%':fmtR(v); }
function hourLabel(hh){ var mi=A?A.rowMi[hh]:0; return pad(hh)+(mi?':'+pad(mi):':00'); }
function windowLabel(hh){ var mi=A?A.rowMi[hh]:0, e=(hh+S.win)%24; return pad(hh)+':'+pad(mi)+'–'+pad(e)+':'+pad(mi); }
function h(tag,cls,txt){ var e=document.createElement(tag); if(cls) e.className=cls; if(txt!=null) e.textContent=txt; return e; }
function sv(tag,at){ var e=document.createElementNS(SVG,tag); for(var k in at) e.setAttribute(k,at[k]); return e; }

/* ---------- colours ---------- */
function scaleOf(vals,m){
  var a=vals.filter(function(v){ return v!=null; }); if(!a.length) return {max:1};
  if(m==='mean'||m==='median') a=a.map(Math.abs); else if(m==='win') a=a.map(function(v){ return Math.abs(v-50); });
  a.sort(function(x,y){ return x-y; }); var p=a[Math.min(a.length-1,Math.floor(a.length*0.95))]||a[a.length-1]||1; return {max:p||1};
}
function colorOf(v,m,sc){
  if(v==null) return null; var d;
  if(m==='mean'||m==='median'||m==='win'){ d=m==='win'?v-50:v; var a=Math.min(1,Math.abs(d)/sc.max); if(a<0.06) return 'rgba(127,138,163,.22)'; return d>0?'rgba(45,212,167,'+(0.2+0.7*a).toFixed(2)+')':'rgba(255,93,122,'+(0.2+0.7*a).toFixed(2)+')'; }
  return 'rgba(124,140,255,'+(0.14+0.76*Math.min(1,v/sc.max)).toFixed(2)+')';
}

/* ---------- UI ---------- */
function css(){
  if(document.getElementById('sev-css')) return;
  var s=document.createElement('style'); s.id='sev-css';
  s.textContent=
'#sev{position:absolute;inset:0;z-index:7;display:none;flex-direction:column;background:var(--bg,#0b0e14);color:var(--txt,#e9edf5);font:12px/1.35 Inter,system-ui,sans-serif}'
+'#sev .se-row{display:flex;align-items:center;gap:6px;padding:4px 8px;overflow-x:auto;white-space:nowrap;scrollbar-width:none;-webkit-overflow-scrolling:touch;flex:none}#sev .se-row::-webkit-scrollbar{display:none}'
+'#sev button,#sev select,#sev input{font:600 11.5px system-ui;color:var(--txt,#e9edf5);background:var(--glass,rgba(22,27,38,.72));border:1px solid var(--line,rgba(255,255,255,.1));border-radius:8px;padding:4px 8px;min-height:28px;flex:none}'
+'#sev input{font-weight:500;color-scheme:dark}html[data-theme=light] #sev input{color-scheme:light}'
+'#sev button.on{background:var(--acc,#7c8cff);color:#fff;border-color:transparent}#sev .se-seg{display:inline-flex;gap:3px;flex:none}'
+'#sev .se-sub{font-size:11px;color:var(--mut,#7f8aa3)}#sev .se-sub label{display:inline-flex;align-items:center;gap:4px;flex:none}'
+'#sev .se-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:2px 8px 4px;flex:none}'
+'#sev .se-st{border:1px solid var(--line,rgba(255,255,255,.08));border-radius:8px;padding:3px 6px;background:var(--glass,rgba(22,27,38,.5));min-width:0}'
+'#sev .se-st small{display:block;color:var(--mut,#7f8aa3);font-size:9.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#sev .se-st b{font-size:12px;font-variant-numeric:tabular-nums}#sev .se-st i{font-style:normal;font-size:10px;color:var(--mut,#7f8aa3);margin-left:3px}'
+'#sev .se-up{color:#2dd4a7}#sev .se-dn{color:#ff5d7a}'
+'#sev .se-body{flex:1;min-height:0;overflow:auto;padding:4px 8px;position:relative;-webkit-overflow-scrolling:touch}'
+'#sev .se-msg{padding:28px 12px;text-align:center;color:var(--mut,#7f8aa3);font-weight:600}#sev .se-msg button{margin-top:10px}'
+'#sev .se-grid{display:grid;grid-template-columns:46px repeat(7,minmax(34px,1fr));gap:2px;min-width:330px}'
+'#sev .se-hd{font-size:10px;color:var(--mut,#7f8aa3);text-align:center;padding:2px 0;font-weight:700}#sev .se-rl{font-size:10px;color:var(--mut,#7f8aa3);display:flex;align-items:center;justify-content:flex-end;padding-right:4px;font-variant-numeric:tabular-nums}'
+'#sev .se-c{height:19px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:600;font-variant-numeric:tabular-nums;cursor:pointer;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.45);box-sizing:border-box}'
+'#sev .se-c.na{background:repeating-linear-gradient(45deg,rgba(127,138,163,.16) 0 3px,transparent 3px 6px);color:var(--mut,#7f8aa3);text-shadow:none}'
+'#sev .se-c.lo{outline:1px dashed rgba(255,255,255,.35);outline-offset:-2px;opacity:.6}#sev .se-c.sel{outline:2px solid #fff;outline-offset:-2px;opacity:1}'
+'#sev .se-leg{display:flex;gap:10px;flex-wrap:wrap;font-size:10px;color:var(--mut,#7f8aa3);padding:6px 2px}#sev .se-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;vertical-align:-1px;margin-right:3px}'
+'#sev .se-det{flex:none;padding:5px 10px;border-top:1px solid var(--line,rgba(255,255,255,.08));font-size:11.5px;min-height:32px;background:var(--glass,rgba(22,27,38,.6))}'
+'#sev .se-notes{flex:none;padding:3px 10px calc(4px + env(safe-area-inset-bottom,0px));font-size:10px;color:var(--mut,#7f8aa3)}'
+'#sev table{border-collapse:separate;border-spacing:2px;font-size:10px;font-variant-numeric:tabular-nums}#sev th{color:var(--mut,#7f8aa3);font-weight:700;padding:2px 3px}#sev td{text-align:center;padding:4px 3px;min-width:38px;border-radius:3px;color:#fff}'
+'#sev .se-add{position:absolute;inset:0;z-index:5;display:none;flex-direction:column;background:var(--bg,#0b0e14);padding:8px}#sev .se-add.on{display:flex}'
+'#sev .se-add input.q{width:100%;box-sizing:border-box;margin:6px 0;padding:8px 10px;font-size:14px}#sev .se-list{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:3px}#sev .se-list button{text-align:left;padding:9px 10px;font-size:13px}'
+'#sev .se-busy{position:sticky;left:0;right:0;top:0;z-index:2;display:none;padding:6px;text-align:center;background:rgba(124,140,255,.25);color:var(--txt,#e9edf5);font-weight:600;font-size:11px;border-radius:6px}';
  document.head.appendChild(s);
}
function ensureUI(){
  if(ui) return ui;
  css();
  var root=h('div'); root.id='sev';
  var r1=h('div','se-row'), r2=h('div','se-row'), r3=h('div','se-row se-sub');
  var sb=h('button','', S.symbol); sb.onclick=openAdd; r1.appendChild(sb);
  var mk=h('div','se-seg'); [['S','Spot'],['F','Futures']].forEach(function(m){ var b=h('button',null,m[1]); b.dataset.m=m[0]; b.onclick=function(){ if(S.market===m[0]) return; S.market=m[0]; sel=null; A=null; DATA=null; saveS(); paintCtl(); reload(); }; mk.appendChild(b); }); r1.appendChild(mk);
  var tzS=h('select'); TZS.forEach(function(z){ var o=h('option',null,z[1]); o.value=z[0]; tzS.appendChild(o); }); tzS.onchange=function(){ S.tz=tzS.value; saveS(); if(DATA&&!busy){ compute(); render(); } }; r1.appendChild(tzS);
  var lk=h('select'); LOOK.forEach(function(l){ var o=h('option',null,l[0]==='ALL'?'All history':l[0]==='Custom'?'Custom range':'Last '+l[0]); o.value=l[0]; lk.appendChild(o); }); lk.onchange=function(){ S.look=lk.value; saveS(); paintCtl(); if(S.look!=='Custom') reload(); }; r1.appendChild(lk);
  var vs=h('div','se-seg'); VIEWS.forEach(function(v){ var b=h('button',null,v[1]); b.dataset.v=v[0]; b.onclick=function(){ S.view=v[0]; sel=null; saveS(); paintCtl(); render(); }; vs.appendChild(b); }); r2.appendChild(vs);
  var ms=h('select'); METRICS.forEach(function(m){ var o=h('option',null,m[1]); o.value=m[0]; ms.appendChild(o); }); ms.onchange=function(){ S.metric=ms.value; saveS(); render(); }; r2.appendChild(ms);
  var ws=h('select'); [[1,'1h window'],[2,'2h window'],[4,'4h window']].forEach(function(w){ var o=h('option',null,w[1]); o.value=w[0]; ws.appendChild(o); }); ws.onchange=function(){ S.win=+ws.value; saveS(); if(DATA&&!busy){ compute(); render(); } }; r2.appendChild(ws);
  var fl=h('label'); fl.appendChild(document.createTextNode('From (UTC)')); var fi=h('input'); fi.type='date'; fl.appendChild(fi); r3.appendChild(fl);
  var tl=h('label'); tl.appendChild(document.createTextNode('To')); var ti=h('input'); ti.type='date'; tl.appendChild(ti); r3.appendChild(tl);
  var ap=h('button',null,'Apply range'); ap.onclick=function(){ if(!fi.value||!ti.value||fi.value>ti.value) return toast('Pick a valid From / To date','#ff5d7a'); S.look='Custom'; S.cFrom=fi.value; S.cTo=ti.value; saveS(); paintCtl(); reload(); }; r3.appendChild(ap);
  var rf=h('button',null,'Reload'); rf.onclick=function(){ reload(); }; r3.appendChild(rf);
  var st=h('div','se-stats'), body=h('div','se-body'), busyEl=h('div','se-busy'), det=h('div','se-det'), notes=h('div','se-notes'), add=h('div','se-add');
  [r1,r2,r3,st,body,det,notes,add].forEach(function(x){ root.appendChild(x); });
  $('mw').appendChild(root);
  ui={root:root,sb:sb,mk:mk,tz:tzS,lk:lk,vs:vs,ms:ms,ws:ws,fi:fi,ti:ti,r3:r3,st:st,body:body,busy:busyEl,det:det,notes:notes,add:add};
  return ui;
}
function paintCtl(){
  if(!ui) return;
  ui.sb.textContent=S.symbol+' ▾';
  Array.prototype.forEach.call(ui.mk.children,function(b){ b.classList.toggle('on',b.dataset.m===S.market); });
  Array.prototype.forEach.call(ui.vs.children,function(b){ b.classList.toggle('on',b.dataset.v===S.view); });
  ui.tz.value=S.tz; ui.lk.value=S.look; ui.ms.value=S.metric; ui.ws.value=String(S.win);
  ui.ws.style.display=(S.view==='heat'||S.view==='hour')?'':'none'; ui.ms.style.display=S.view==='years'?'none':'';
  ui.r3.style.display=S.look==='Custom'?'':'none';
  if(S.look==='Custom'){ if(!S.cFrom){ S.cFrom=new Date(Date.now()-90*864e5).toISOString().slice(0,10); S.cTo=new Date().toISOString().slice(0,10); } ui.fi.value=S.cFrom; ui.ti.value=S.cTo; }
}
function paintBusy(){ if(!ui) return; ui.busy.style.display=busy?'block':'none'; ui.busy.textContent=progressTxt; }

function paintStats(){
  var st=ui.st; st.innerHTML=''; if(!A||!DATA){ st.style.display='none'; return; } st.style.display='grid';
  var sm=A.sum;
  function cell(label,val,sub,cls){ var c=h('div','se-st'); c.appendChild(h('small',null,label)); c.appendChild(h('b',cls||'',val)); if(sub) c.appendChild(h('i',null,sub)); st.appendChild(c); }
  function rk(idx,arr,lab,nameF){ if(idx<0) cell(lab,'n/a','too few obs'); else cell(lab,nameF(idx),fmtR(arr[idx].mean)+' · n'+arr[idx].n,arr[idx].mean>=0?'se-up':'se-dn'); }
  rk(sm.bestHour,A.byHour,'Best hour',windowLabel); rk(sm.worstHour,A.byHour,'Weakest hour',windowLabel);
  var wdn=function(i){ return WD[i]; }, mnn=function(i){ return MN[i]; };
  rk(sm.bestWd,A.byWd,'Strongest weekday',wdn); rk(sm.worstWd,A.byWd,'Weakest weekday',wdn);
  rk(sm.bestMonth,A.byMonth,'Strongest month',mnn); rk(sm.worstMonth,A.byMonth,'Weakest month',mnn);
  var o=A.overall;
  cell('Overall avg return',o?fmtR(o.mean):'n/a',S.win+'h windows',o&&o.mean>=0?'se-up':'se-dn');
  cell('Overall win rate',o?o.win.toFixed(1)+'%':'n/a','');
  cell('Valid observations',o?o.n.toLocaleString():'0',(A.overallDay?A.overallDay.n:0)+' days · '+DATA.mobs.length+' mo');
}
function paintNotes(){
  if(!ui) return; var t='';
  if(DATA){
    var q=[];
    q.push('Times: '+(S.tz==='local'?'device time ('+DATA.tz+')':S.tz==='UTC'?'UTC':DATA.tz)+' · '+(S.market==='F'?'USDⓈ-M Futures':'Spot')+' data');
    if(DATA.gaps) q.push(DATA.gaps+' missing hourly candle'+(DATA.gaps>1?'s':'')+' (windows touching them excluded)');
    if(DATA.bad) q.push(DATA.bad+' invalid candle'+(DATA.bad>1?'s':'')+' rejected');
    if(DATA.dups) q.push(DATA.dups+' duplicate candle'+(DATA.dups>1?'s':'')+' ignored');
    if(DATA.truncated) q.push('limited to the newest ~4.5 years of hourly data');
    if(DATA.mobs.listing) q.push('listing month '+MN[DATA.mobs.listing.mo-1]+' '+DATA.mobs.listing.y+' excluded (may be partial)');
    q.push('running hour/day/month excluded until completed');
    if(updatedAt) q.push('updated '+new Date(updatedAt).toISOString().slice(11,16)+' UTC');
    t=q.join(' · ')+'. ';
  }
  ui.notes.textContent=t+'Volatility = sample std-dev of the returns, not annualized. Historical tendencies are not predictions.';
}
function setDet(txt){ ui.det.textContent=txt||'Tap a cell or bar to see its exact statistics.'; }
function detText(label,s){
  if(!s) return label+' — no valid observations (not shown as zero).';
  return label+' · n='+s.n+(s.n<MINN.cell?' (small sample)':'')+' · avg '+fmtR(s.mean)+' · median '+fmtR(s.median)+' · up '+s.win.toFixed(0)+'% / down '+s.loss.toFixed(0)+'%'+(s.flat>0?' / flat '+s.flat.toFixed(0)+'%':'')+' · avg vol '+fmtV(s.avgVol)+' · σ '+(s.sd==null?'—':s.sd.toFixed(3)+'%')+' · range '+fmtR(s.min)+' … '+fmtR(s.max);
}

function render(){
  if(!ui) return; paintCtl();
  var body=ui.body; body.innerHTML=''; body.appendChild(ui.busy); paintBusy();
  paintStats(); paintNotes();
  if(busy&&!A){ body.appendChild(h('div','se-msg','Loading Binance history…')); setDet(''); return; }
  if(err){ var m=h('div','se-msg',err); var rb=h('button',null,'Retry'); rb.onclick=reload; m.appendChild(h('br')); m.appendChild(rb); body.appendChild(m); setDet(''); return; }
  if(!A||!DATA){ body.appendChild(h('div','se-msg','No data yet.')); return; }
  if(!A.overall&&!A.overallDay&&!DATA.mobs.length){ body.appendChild(h('div','se-msg','Not enough completed history for this symbol and range. Choose a longer lookback or another symbol — nothing is estimated.')); setDet(''); return; }
  var tzl=S.tz==='UTC'?'UTC':DATA.tz;
  if(S.view==='heat') drawHeat(body);
  else if(S.view==='hour') drawBars(body,A.byHour.map(function(s,i){ return {label:pad(i),full:windowLabel(i),s:s,min:MINN.hour}; }),'Hour of day ('+tzl+') · '+S.win+'h window');
  else if(S.view==='week') drawBars(body,A.byWd.map(function(s,i){ return {label:WD[i],full:WD[i]+' (daily candle, '+tzl+')',s:s,min:MINN.weekday}; }),'Day of week · '+(A.overallDay?A.overallDay.n:0)+' completed days');
  else if(S.view==='month') drawBars(body,A.byMonth.map(function(s,i){ return {label:MN[i],full:MN[i]+' (UTC calendar month)',s:s,min:MINN.month}; }),'Calendar month (UTC) · '+DATA.mobs.length+' completed months');
  else drawYears(body);
}

function drawHeat(body){
  var m=S.metric, vals=[]; A.heat.forEach(function(col){ col.forEach(function(s){ if(s&&s.n>=MINN.cell) vals.push(mval(s,m)); }); });
  if(!vals.length) A.heat.forEach(function(col){ col.forEach(function(s){ if(s) vals.push(mval(s,m)); }); });
  var sc=scaleOf(vals,m), g=h('div','se-grid');
  g.appendChild(h('div','se-hd',''));
  WD.forEach(function(d){ g.appendChild(h('div','se-hd',d)); });
  for(var hh=0;hh<24;hh++){
    g.appendChild(h('div','se-rl',hourLabel(hh)));
    for(var d=0;d<7;d++){
      (function(d,hh){
        var s=A.heat[d][hh], v=mval(s,m), c=h('div','se-c');
        if(v==null){ c.className+=' na'; c.textContent='—'; }
        else { c.style.background=colorOf(v,m,sc); c.textContent=m==='win'?v.toFixed(0):m==='avgVol'?fmtV(v):m==='sd'?v.toFixed(2):(v>0?'+':'')+v.toFixed(Math.abs(v)<0.1?3:2); if(s.n<MINN.cell) c.className+=' lo'; }
        if(sel&&sel.d===d&&sel.h===hh) c.className+=' sel';
        c.onclick=function(){ sel={d:d,h:hh}; var old=g.querySelector('.sel'); if(old) old.classList.remove('sel'); c.classList.add('sel'); setDet(detText(WD[d]+' '+windowLabel(hh),s)); };
        g.appendChild(c);
      })(d,hh);
    }
  }
  body.appendChild(g);
  var lg=h('div','se-leg'), mm=METRICS.filter(function(x){ return x[0]===m; })[0][1];
  var items=(m==='mean'||m==='median'||m==='win')?[['rgba(45,212,167,.85)','above '+(m==='win'?'50%':'0')],['rgba(127,138,163,.3)','near '+(m==='win'?'50%':'zero')],['rgba(255,93,122,.85)','below '+(m==='win'?'50%':'0')]]:[['rgba(124,140,255,.85)','higher'],['rgba(124,140,255,.2)','lower']];
  items.forEach(function(x){ var s=h('span'); var i=h('i'); i.style.background=x[0]; s.appendChild(i); s.appendChild(document.createTextNode(x[1])); lg.appendChild(s); });
  var na=h('span'); var ni=h('i'); ni.style.background='repeating-linear-gradient(45deg,rgba(127,138,163,.4) 0 2px,transparent 2px 4px)'; na.appendChild(ni); na.appendChild(document.createTextNode('no data (not zero)')); lg.appendChild(na);
  var lo=h('span'); var li=h('i'); li.style.outline='1px dashed #aaa'; lo.appendChild(li); lo.appendChild(document.createTextNode('fewer than '+MINN.cell+' observations')); lg.appendChild(lo);
  lg.appendChild(h('span',null,mm+' · colour scale fitted to the 95th percentile'));
  body.appendChild(lg);
  setDet(sel&&sel.d!=null?detText(WD[sel.d]+' '+windowLabel(sel.h),A.heat[sel.d][sel.h]):'');
}

function drawBars(body,items,title){
  var m=S.metric, vals=items.map(function(it){ return mval(it.s,m); });
  var n=items.length, W=Math.max(320,n*(n>12?22:40)), Hh=230, top=22, bot=34, ph=Hh-top-bot, svg=sv('svg',{viewBox:'0 0 '+W+' '+Hh,width:'100%',style:'display:block;min-width:'+Math.min(W,340)+'px'});
  var nums=vals.filter(function(v){ return v!=null; }), signed=(m==='mean'||m==='median'||m==='win');
  var lo=nums.length?Math.min.apply(null,nums):0, hi=nums.length?Math.max.apply(null,nums):1;
  var base=m==='win'?50:0; if(signed){ lo=Math.min(lo,base); hi=Math.max(hi,base); } else { lo=0; }
  if(hi===lo){ hi=lo+1; }
  var y=function(v){ return top+ph*(1-(v-lo)/(hi-lo)); }, bw=(W-20)/n;
  svg.appendChild(sv('line',{x1:10,x2:W-10,y1:y(signed?base:lo),y2:y(signed?base:lo),stroke:'rgba(210,216,232,.45)','stroke-dasharray':'3 3'}));
  var t=sv('text',{x:10,y:12,fill:'#7f8aa3','font-size':10}); t.textContent=title; svg.appendChild(t);
  items.forEach(function(it,i){
    var v=vals[i], x=10+i*bw, w=bw*0.7, cx=x+bw/2, g=sv('g',{style:'cursor:pointer'});
    if(v==null){ var q=sv('text',{x:cx,y:y(signed?base:lo)-4,'text-anchor':'middle',fill:'#7f8aa3','font-size':9}); q.textContent='n/a'; g.appendChild(q); }
    else {
      var yb=y(signed?base:lo), yv=y(v), up=signed?(v>=base):true, col=signed?(up?'#2dd4a7':'#ff5d7a'):'#7c8cff';
      g.appendChild(sv('rect',{x:cx-w/2,y:Math.min(yb,yv),width:w,height:Math.max(1,Math.abs(yb-yv)),rx:2,fill:col,opacity:it.s.n<it.min?0.4:1}));
      if(n<=12||i%3===0){ var tx=sv('text',{x:cx,y:(up?yv-3:yv+10),'text-anchor':'middle',fill:'#c8cfdf','font-size':9}); tx.textContent=fmtM(v,m).replace('%',''); g.appendChild(tx); }
    }
    var lb=sv('text',{x:cx,y:Hh-bot+13,'text-anchor':'middle',fill:'#7f8aa3','font-size':n>12?8:10}); lb.textContent=it.label; g.appendChild(lb);
    var nl=sv('text',{x:cx,y:Hh-bot+24,'text-anchor':'middle',fill:'#55607a','font-size':7.5}); nl.textContent=it.s?'n'+it.s.n:''; g.appendChild(nl);
    g.appendChild(sv('rect',{x:x,y:0,width:bw,height:Hh,fill:'transparent'}));
    g.onclick=function(){ sel={i:i}; setDet(detText(it.full,it.s)); };
    svg.appendChild(g);
  });
  body.appendChild(svg);
  var lg=h('div','se-leg'); lg.appendChild(h('span',null,'Metric: '+METRICS.filter(function(x){ return x[0]===m; })[0][1]+' · faded bars have fewer than '+items[0].min+' observations · "n/a" = no data, not zero'));
  body.appendChild(lg);
  setDet(sel&&sel.i!=null&&items[sel.i]?detText(items[sel.i].full,items[sel.i].s):'');
}

function drawYears(body){
  var prog=DATA.mobs.prog||[], inprog={}, ys=Object.keys(A.years).map(Number);
  prog.forEach(function(p){ inprog[p.y+'-'+p.mo]=p; if(ys.indexOf(p.y)<0) ys.push(p.y); });
  ys.sort(function(a,b){ return b-a; });
  if(!ys.length){ body.appendChild(h('div','se-msg','No completed months in this range. Use a longer lookback (1Y or more).')); setDet(''); return; }
  var all=[]; ys.forEach(function(y){ (A.years[y]||[]).forEach(function(m){ if(m) all.push(m.r); }); });
  var sc=scaleOf(all,'mean'), wrap=h('div'), tb=h('table'), thr=h('tr'); wrap.style.overflowX='auto';
  thr.appendChild(h('th',null,'')); MN.forEach(function(m){ thr.appendChild(h('th',null,m)); }); tb.appendChild(thr);
  ys.forEach(function(y){
    var tr=h('tr'); tr.appendChild(h('th',null,String(y)));
    for(var mo=1;mo<=12;mo++){
      var m=(A.years[y]||[])[mo-1], pg=inprog[y+'-'+mo], td=h('td');
      if(m){ td.textContent=(m.r>0?'+':'')+m.r.toFixed(1); td.style.background=colorOf(m.r,'mean',sc); td.onclick=(function(m,y,mo){ return function(){ setDet(MN[mo-1]+' '+y+' (UTC month) · return '+fmtR(m.r)+' · volume '+fmtV(m.v)); }; })(m,y,mo); }
      else if(pg){ td.textContent=(pg.r>0?'+':'')+pg.r.toFixed(1)+'*'; td.style.background='rgba(127,138,163,.12)'; td.style.fontStyle='italic'; td.style.color='#7f8aa3'; td.onclick=(function(pg,y,mo){ return function(){ setDet(MN[mo-1]+' '+y+' is still in progress ('+fmtR(pg.r)+' so far) — excluded from every statistic.'); }; })(pg,y,mo); }
      else { td.textContent='—'; td.style.background='repeating-linear-gradient(45deg,rgba(127,138,163,.14) 0 3px,transparent 3px 6px)'; td.style.color='#7f8aa3'; }
      tr.appendChild(td);
    }
    tb.appendChild(tr);
  });
  [['Average',function(s){ return s&&s.mean; },1],['Median',function(s){ return s&&s.median; },1],['Win %',function(s){ return s&&s.win; },0]].forEach(function(r){
    var tr=h('tr'); tr.appendChild(h('th',null,r[0]));
    A.byMonth.forEach(function(s){ var td=h('td'); var v=s?r[1](s):null; td.textContent=v==null?'—':r[2]?(v>0?'+':'')+v.toFixed(1):v.toFixed(0); td.style.background=v==null?'transparent':r[2]?colorOf(v,'mean',sc):colorOf(v,'win',{max:30}); td.style.fontWeight='700'; tr.appendChild(td); });
    tb.appendChild(tr);
  });
  var nr=h('tr'); nr.appendChild(h('th',null,'n')); A.byMonth.forEach(function(s){ var td=h('td',null,s?String(s.n):'0'); td.style.color='#7f8aa3'; nr.appendChild(td); }); tb.appendChild(nr);
  wrap.appendChild(tb); body.appendChild(wrap);
  var lg=h('div','se-leg'); lg.appendChild(h('span',null,'Monthly return % (UTC calendar months). * = month in progress, excluded. — = no data.')); body.appendChild(lg);
  setDet('');
}

/* ---------- symbol sheet ---------- */
async function ensureSyms(){
  if(symBusy) return; symBusy=true;
  try{
    if(!symLists.S){ var a=await jget(API+'/api/v3/ticker/price'); if(Array.isArray(a)) symLists.S=a.map(function(x){ return x.symbol; }).filter(function(s){ return /^[A-Z0-9]{3,24}$/.test(s); }).sort(); }
    if(!symLists.F){ var b=await jget(FAPI+'/fapi/v1/ticker/price'); if(Array.isArray(b)) symLists.F=b.map(function(x){ return x.symbol; }).filter(function(s){ return /^[A-Z0-9]{3,24}$/.test(s); }).sort(); }
  }catch(e){}
  symBusy=false; if(ui.add.classList.contains('on')) paintAdd();
}
function openAdd(){ addMk=S.market; ui.add.classList.add('on'); paintAdd(true); ensureSyms(); }
function closeAdd(){ if(ui) ui.add.classList.remove('on'); }
function choose(mk,s){ s=String(s||'').toUpperCase().trim(); if(!/^[A-Z0-9]{3,24}$/.test(s)) return toast('That symbol is not valid','#ff5d7a'); S.market=mk; S.symbol=s; sel=null; A=null; DATA=null; saveS(); closeAdd(); paintCtl(); reload(); }
function paintAdd(focus){
  var qi=ui.add.querySelector('input.q'), keep=qi?qi.value:''; ui.add.innerHTML='';
  var hd=h('div','se-row'); hd.style.padding='0'; hd.appendChild(h('b',null,'Choose symbol'));
  var sg=h('div','se-seg'); [['S','Binance Spot'],['F','USDⓈ-M Futures']].forEach(function(m){ var b=h('button',m[0]===addMk?'on':null,m[1]); b.onclick=function(){ addMk=m[0]; paintAdd(true); }; sg.appendChild(b); }); hd.appendChild(sg);
  var cl=h('button',null,'Close'); cl.onclick=closeAdd; hd.appendChild(cl); ui.add.appendChild(hd);
  var q=h('input','q'); q.type='search'; q.placeholder='Search symbol, e.g. SOL'; q.value=keep; ui.add.appendChild(q);
  var ls=h('div','se-list'); ui.add.appendChild(ls);
  var draw=function(){
    ls.innerHTML=''; var s=q.value.toUpperCase().replace(/[^A-Z0-9]/g,''), L=symLists[addMk];
    if(!L) ls.appendChild(h('div','se-sub',symBusy?'Loading Binance symbols…':'Could not load the symbol list. You can still type an exact symbol.'));
    var hits=L?L.filter(function(x){ return !s||x.indexOf(s)>=0; }).sort(function(a,b){ var A1=a.indexOf(s)===0?0:1,B1=b.indexOf(s)===0?0:1; return A1-B1||(/USDT$/.test(b)?1:0)-(/USDT$/.test(a)?1:0)||a.length-b.length; }).slice(0,60):[];
    hits.forEach(function(x){ var b=h('button',null,x+'  ·  '+(addMk==='F'?'Futures':'Spot')); b.onclick=function(){ choose(addMk,x); }; ls.appendChild(b); });
    if(s.length>=3&&(!L||hits.indexOf(s)<0)){ var mb=h('button',null,'Try "'+s+'" on '+(addMk==='F'?'Futures':'Spot')); mb.onclick=function(){ choose(addMk,s); }; ls.appendChild(mb); }
  };
  q.oninput=draw; draw(); if(focus){ try{ q.focus({preventScroll:true}); }catch(e){} }
}

/* ---------- show / hide ---------- */
function show(){
  ensureUI(); shown=true; ui.root.style.display='flex'; paintCtl(); render();
  if(timer) clearInterval(timer); timer=setInterval(tick,60000);
  reload();
}
function hide(){ if(!shown) return; shown=false; gen++; busy=false; if(timer){ clearInterval(timer); timer=null; } closeAdd(); if(ui) ui.root.style.display='none'; }
G.mpSE.type=function(t,prev){ try{ if(t===22) show(); else if(prev===22||shown) hide(); }catch(e){ console.error('seasonality',e); } };
G.mpSE.show=show; G.mpSE.hide=hide;
loadS();
try{ if(typeof ctype!=='undefined'&&ctype===22) show(); }catch(e){}
})();
