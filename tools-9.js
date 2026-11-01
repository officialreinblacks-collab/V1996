/* tools-9.js — MarketPlusView tool code. index.html loads this file and runs it inside start() (same scope as the other tools files).
   Keep the file name. Chart type in this file: Relative Performance — Asset Comparison (ctype 21).
   Independent module: own LightweightCharts instance inside an overlay on #mw. It does not touch the candle series, indicators or any other chart type. */
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
