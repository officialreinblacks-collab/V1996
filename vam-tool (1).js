/* vam-tool.js — MarketPlusView · Volatility Accumulation Manager (VAM)
   Portfolio + strategy calculator for spot crypto accumulation. Separate module: it does not touch, wrap or redraw the chart engine.
   Load it with a plain <script src="vam-tool.js"></script> (or inside start() next to tools-4.js — it is self-contained and prefixed).
   Open it from your nav with any element that has  data-open-vam  (or call MPV_VAM.open()).  Guide: see Script.html (VAM section).
   Data: all trades are typed in by hand and kept in this browser (localStorage). Market data: public, read-only, no keys.
   Not financial advice. Nothing here recommends a buy, and averaging down is never assumed to be safe. */
;(function(root){
'use strict';
try{
var CFG=Object.assign({
  storageKey:'mpv_vam_v1',
  quote:'USDT',                                   // pair quote asset used for public prices (BTC -> BTCUSDT)
  apiBases:['https://data-api.binance.vision','https://api.binance.com'],   // public market-data endpoints only (no keys)
  pollMs:15000, monitorMs:60000, zIndex:9000,
  fallbackButton:true,                            // small launcher shown only when no [data-open-vam] element exists
  navSelector:null,                               // optional: CSS selector of a nav container; a VAM item is appended to it
  navLabel:'Accumulation Manager',
  chart:null,                                     // optional: ()=>({coin:'BTC',tfSec:3600,candles:[{time,open,high,low,close,volume}]})
  getCandles:null,                                // optional: (coin,interval,limit)=>Promise<{candles,src}|candles[]>
  getPrice:null,                                  // optional: (coin)=>number|null
  openChart:null,                                 // optional: (coin)=>void  (also fires the DOM event "mpv:open-chart")
  onToast:null                                    // optional: (text,level)=>void
},root.MPV_VAM_CONFIG||{});

/* ============================== utils ============================== */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function num(v,d){var x=parseFloat(String(v==null?'':v).replace(/,/g,''));return isFinite(x)?x:(d==null?0:d)}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function sum(a,k){var s=0;for(var i=0;i<a.length;i++)s+=(+a[i][k]||0);return s}
function nowLocal(){var d=new Date(),p=function(n){return(n<10?'0':'')+n};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())}
function normCoin(s){var c=String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');['USDT','USDC','BUSD','FDUSD'].forEach(function(q){if(c.length>q.length+1&&c.slice(-q.length)===q)c=c.slice(0,-q.length)});return c}
function median(a){if(!a.length)return null;var s=a.slice().sort(function(x,y){return x-y}),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2}
function mean(a){return a.length?a.reduce(function(x,y){return x+y},0)/a.length:0}
function fmtP(v){if(v==null||!isFinite(v))return'—';var a=Math.abs(v),mx=a>=1000?2:a>=1?4:a>=0.01?6:8;return v.toLocaleString('en-US',{minimumFractionDigits:Math.min(2,mx),maximumFractionDigits:mx})}
function fmtQ(v){if(v==null||!isFinite(v))return'—';var a=Math.abs(v);return v.toLocaleString('en-US',{maximumFractionDigits:a>=1000?3:a>=1?5:8})}
function pctF(v,sign){if(v==null||!isFinite(v))return'—';return(sign!==false&&v>0?'+':'')+v.toFixed(2)+'%'}

/* ============================== state ============================== */
function defState(){return{v:1,
  settings:{currency:'USD',startingCapital:10000,perEntry:500,maxEntries:10,minReserve:1000,maxExposurePct:70,maxPerBuy:1000,
    drawdownAlertPct:25,stopAddDrawdownPct:0,minGapPct:0,requireConsolidation:false,stopOnBtcBearish:false,
    targets:[5,10,15],feePct:0.1,targetsNetOfFees:true,interval:'1h',quote:CFG.quote,recoveryAlertPct:5},
  lots:[],exits:[],adjust:[],prices:{}}}
var mem=null;
function load(){var d=defState();try{var r=root.localStorage&&root.localStorage.getItem(CFG.storageKey);if(r){var o=JSON.parse(r);
  Object.keys(d.settings).forEach(function(k){if(o.settings&&o.settings[k]!==undefined)d.settings[k]=o.settings[k]});
  ['lots','exits','adjust'].forEach(function(k){if(Array.isArray(o[k]))d[k]=o[k]});if(o.prices&&typeof o.prices==='object')d.prices=o.prices}}catch(e){}
  d.exits.forEach(function(e){if(!Array.isArray(e.alloc))e.alloc=[]});return d}
var S=load();
function save(){try{root.localStorage&&root.localStorage.setItem(CFG.storageKey,JSON.stringify(S))}catch(e){mem=S}}

/* ============================== core maths (pure) ============================== */
/* A buy: amount = money spent on the coin, fee = extra fee paid in the quote currency, qty = coins received.
   Cost basis of a lot = amount + fee. Exits are allocated to lots (alloc:[{lot,qty}]); everything else is derived, so edits stay consistent. */
function derive(st,px){
  var cf=st.settings,sf=(cf.feePct||0)/100,sold={};
  st.exits.forEach(function(e){e.alloc.forEach(function(a){sold[a.lot]=(sold[a.lot]||0)+a.qty})});
  var lotMap={},rows=[];
  st.lots.forEach(function(l){
    var qty=l.qty>0?l.qty:(l.price>0?l.amount/l.price:0),cost=l.amount+(l.fee||0),unit=qty>0?cost/qty:0,eff=qty>0?l.amount/qty:l.price;
    var rem=Math.max(0,qty-(sold[l.id]||0));if(rem<1e-10)rem=0;
    var r={id:l.id,coin:l.coin,price:l.price,amount:l.amount,fee:l.fee||0,date:l.date,note:l.note||'',qty:qty,cost:cost,unit:unit,eff:eff,rem:rem,remCost:rem*unit,remAmt:rem*eff,open:rem>0,sold:qty-rem};
    lotMap[l.id]=r;rows.push(r)});
  var ex=st.exits.map(function(e){var q=0,basis=0;e.alloc.forEach(function(a){var L=lotMap[a.lot];q+=a.qty;if(L)basis+=a.qty*L.unit});
    var gross=e.price*q,net=gross-(e.fee||0);
    return{id:e.id,coin:e.coin,price:e.price,fee:e.fee||0,date:e.date,note:e.note||'',alloc:e.alloc,qty:q,gross:gross,net:net,basis:basis,profit:net-basis,pct:basis>0?(net-basis)/basis*100:0}});
  var cap=cf.startingCapital+sum(st.adjust,'amount'),cash=cap-sum(rows,'cost')+sum(ex,'net'),realized=sum(ex,'profit');
  var pos={},coins=[];
  rows.forEach(function(r){if(!r.open)return;var p=pos[r.coin];if(!p){p=pos[r.coin]={coin:r.coin,qty:0,cost:0,amt:0,entries:0,lots:[],lowEntry:Infinity,highEntry:0};coins.push(r.coin)}
    p.qty+=r.rem;p.cost+=r.remCost;p.amt+=r.remAmt;p.entries++;p.lots.push(r);p.lowEntry=Math.min(p.lowEntry,r.eff);p.highEntry=Math.max(p.highEntry,r.eff)});
  var invested=0,mv=0,unreal=0,missing=[];
  coins.forEach(function(c){var p=pos[c],pr=px&&px[c];p.avg=p.amt/p.qty;p.avgCost=p.cost/p.qty;p.be=p.avgCost/(1-sf);p.price=pr>0?pr:null;
    if(p.price){p.value=p.qty*p.price;p.unreal=p.value-p.cost;p.unrealPct=p.unreal/p.cost*100;p.vsAvg=(p.price/p.avg-1)*100}else{p.value=null;p.unreal=null;p.unrealPct=null;p.vsAvg=null;missing.push(c)}
    invested+=p.cost;if(p.value!=null){mv+=p.value;unreal+=p.unreal}else mv+=p.cost});
  var pv=cash+mv,entries=rows.filter(function(r){return r.open}).length;
  return{lots:rows,lotMap:lotMap,exits:ex,pos:pos,coins:coins,cap:cap,cash:cash,invested:invested,mv:mv,unreal:unreal,realized:realized,pv:pv,totalPL:pv-cap,
    exposure:(invested+cash)>0?invested/(invested+cash)*100:0,entries:entries,missing:missing,sf:sf}}

function targetCalc(cf,qty,cost,amt,pct){ // remaining qty, its cost (incl. buy fees), amount excl. fees
  var sf=(cf.feePct||0)/100,t=pct/100,price=cf.targetsNetOfFees?cost*(1+t)/(qty*(1-sf)):(amt/qty)*(1+t);
  var proceeds=qty*price,gross=proceeds-amt,buyFee=cost-amt,sellFee=proceeds*sf;
  return{pct:pct,price:price,gross:gross,fees:buyFee+sellFee,net:gross-buyFee-sellFee}}

function allocate(lots,qty,method){ // lots: open derived lots of one coin
  var L=lots.filter(function(l){return l.rem>0}),out=[],left=qty;
  if(method==='prop'){var tot=sum(L,'rem');if(tot>0){var f=Math.min(1,qty/tot);L.forEach(function(l){out.push({lot:l.id,qty:l.rem*f})});left=Math.max(0,qty-tot)}return{alloc:out,short:left}}
  L=L.slice().sort(function(a,b){return method==='high'?b.eff-a.eff:method==='low'?a.eff-b.eff:String(a.date).localeCompare(String(b.date))});
  L.forEach(function(l){if(left<=1e-12)return;var q=Math.min(l.rem,left);out.push({lot:l.id,qty:q});left-=q});
  return{alloc:out,short:Math.max(0,left)}}

/* Simulate buys (not yet recorded) for one coin against the risk rules. Never a recommendation: only arithmetic + rule checks. */
function simulate(D,st,coin,buys,price,ctx){
  var cf=st.settings,p=D.pos[coin],bq=p?p.qty:0,bcost=p?p.cost:0,bamt=p?p.amt:0,aAmt=0,aFee=0,aQty=0,n=0,warn=[],valid=[];
  buys.forEach(function(b){if(b.price>0&&b.amount>0){var fee=(b.fee===''||b.fee==null||isNaN(b.fee))?b.amount*(cf.feePct||0)/100:+b.fee;aAmt+=b.amount;aFee+=fee;aQty+=b.amount/b.price;n++;valid.push({price:b.price,amount:b.amount,fee:fee})}});
  var nq=bq+aQty,ncost=bcost+aAmt+aFee,namt=bamt+aAmt,cashA=D.cash-aAmt-aFee,invA=D.invested+aAmt+aFee,expA=(invA+cashA)>0?invA/(invA+cashA)*100:0;
  var sf=D.sf,after={qty:nq,cost:ncost,avg:nq>0?namt/nq:null,avgCost:nq>0?ncost/nq:null,be:nq>0?ncost/nq/(1-sf):null,cash:cashA,invested:invA,exposure:expA,entries:D.entries+n,spent:aAmt+aFee,n:n,valid:valid};
  var before={qty:bq,avg:p?p.avg:null,be:p?p.be:null,cash:D.cash,invested:D.invested,exposure:D.exposure,entries:D.entries};
  after.avgChange=(before.avg&&after.avg)?after.avg-before.avg:null;after.avgChangePct=(before.avg&&after.avg)?(after.avg/before.avg-1)*100:null;
  if(!n)return{before:before,after:after,warn:warn};
  if(cashA<0)warn.push({lvl:'bad',msg:'Not enough available cash for this buy.'});
  else if(cashA<cf.minReserve)warn.push({lvl:'bad',msg:'Cash after the buy would be below your minimum reserve.'});
  if(cf.maxEntries>0&&after.entries>cf.maxEntries)warn.push({lvl:'bad',msg:'This would exceed your maximum number of entries ('+after.entries+' / '+cf.maxEntries+').'});
  if(cf.maxExposurePct>0&&expA>cf.maxExposurePct)warn.push({lvl:'bad',msg:'Exposure would be '+expA.toFixed(1)+'%, above your '+cf.maxExposurePct+'% limit.'});
  if(cf.maxPerBuy>0&&valid.some(function(v){return v.amount>cf.maxPerBuy}))warn.push({lvl:'bad',msg:'A buy is larger than your maximum amount per buy.'});
  var cur=price>0?price:(p&&p.price)||null;
  if(p&&cur){var dd=(1-cur/p.avg)*100;
    if(cf.stopAddDrawdownPct>0&&dd>=cf.stopAddDrawdownPct)warn.push({lvl:'bad',msg:'Stop-adding rule: this position is '+dd.toFixed(1)+'% below its average entry (your limit is '+cf.stopAddDrawdownPct+'%).'});
    else if(cf.drawdownAlertPct>0&&dd>=cf.drawdownAlertPct)warn.push({lvl:'warn',msg:'Drawdown alert level reached: '+dd.toFixed(1)+'% below average entry.'})}
  if(p&&cf.minGapPct>0)valid.forEach(function(v){var near=p.lots.some(function(l){return Math.abs(v.price/l.eff-1)*100<cf.minGapPct});if(near)warn.push({lvl:'warn',msg:'A buy at '+fmtP(v.price)+' is within '+cf.minGapPct+'% of an existing entry.'})});
  if(cf.requireConsolidation){var m=ctx&&ctx.cons;if(m===false)warn.push({lvl:'warn',msg:'Stop-adding condition: no consolidation detected on the monitor.'});else if(m==null)warn.push({lvl:'warn',msg:'Consolidation requirement is on, but there is no monitor data for this coin yet.'})}
  if(cf.stopOnBtcBearish&&ctx&&ctx.btc==='Bearish')warn.push({lvl:'warn',msg:'Stop-adding condition: BTC direction reads bearish.'});
  if(p&&valid.some(function(v){return v.price<p.avg}))warn.push({lvl:'info',msg:'Buying below your average adds to a position that is already underwater. A lower price does not make a buy safer, and losses can keep growing.'});
  return{before:before,after:after,warn:warn}}

function timeline(st){
  var D=derive(st,null),ev=[],ord={a:0,b:1,s:2};
  st.adjust.forEach(function(a,i){ev.push({k:'a',date:a.date,i:i,ref:a})});
  st.lots.forEach(function(l,i){ev.push({k:'b',date:l.date,i:i,ref:l})});
  D.exits.forEach(function(e,i){ev.push({k:'s',date:e.date,i:i,ref:e})});
  ev.sort(function(x,y){return String(x.date).localeCompare(String(y.date))||ord[x.k]-ord[y.k]||x.i-y.i});
  var cash=st.settings.startingCapital,inv=0,real=0,rem={},rows=[];
  function avgOf(c){var q=0,a=0;Object.keys(rem).forEach(function(id){var L=D.lotMap[id];if(L&&L.coin===c&&rem[id]>0){q+=rem[id];a+=rem[id]*L.eff}});return q>0?a/q:null}
  ev.forEach(function(e){var r={date:e.date,kind:e.k,id:e.ref.id};
    if(e.k==='a'){cash+=e.ref.amount;r.type=e.ref.amount>=0?'Deposit':'Withdrawal';r.coin='';r.amount=Math.abs(e.ref.amount);r.note=e.ref.note||''}
    else if(e.k==='b'){var L=D.lotMap[e.ref.id];rem[L.id]=L.qty;cash-=L.cost;inv+=L.cost;r.type='Buy';r.coin=L.coin;r.price=L.price;r.qty=L.qty;r.amount=L.amount;r.fee=L.fee;r.avgAfter=avgOf(L.coin);r.note=L.note}
    else{var X=e.ref;X.alloc.forEach(function(a){var L=D.lotMap[a.lot];if(L){rem[a.lot]=(rem[a.lot]||0)-a.qty;inv-=a.qty*L.unit}});cash+=X.net;real+=X.profit;r.type='Sell';r.coin=X.coin;r.price=X.price;r.qty=X.qty;r.amount=X.gross;r.fee=X.fee;r.realized=X.profit;r.avgAfter=avgOf(X.coin);r.note=X.note}
    r.cash=cash;r.invested=Math.max(0,inv);r.cumReal=real;r.exposure=(r.invested+cash)>0?r.invested/(r.invested+cash)*100:0;rows.push(r)});
  return rows}

/* ============================== market analysis (pure) ============================== */
function ema(a,len){var k=2/(len+1),o=[],p=null;for(var i=0;i<a.length;i++){p=p==null?a[i]:a[i]*k+p*(1-k);o.push(p)}return o}
function atrSeries(c,len){var o=[],tr=[],prev=null;for(var i=0;i<c.length;i++){var t=i?Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)):c[i].high-c[i].low;tr.push(t);
  if(i<len-1)o.push(null);else if(i===len-1){prev=mean(tr.slice(0,len));o.push(prev)}else{prev=(prev*(len-1)+t)/len;o.push(prev)}}return o}
function analyze(c){
  if(!c||c.length<60)return null;
  var n=c.length,px=c[n-1].close,atr=atrSeries(c,14),ap=atr.map(function(v,i){return v==null?null:v/c[i].close*100}),a=ap[n-1];
  var hist=ap.slice(-120).filter(function(v){return v!=null}),med=median(hist),volRatio=med>0?a/med:null;
  var K=4,sh=[],sl=[];
  for(var i=K;i<n-K;i++){var hi=true,lo=true;for(var j=1;j<=K;j++){if(c[i].high<=c[i-j].high||c[i].high<=c[i+j].high)hi=false;if(c[i].low>=c[i-j].low||c[i].low>=c[i+j].low)lo=false}
    if(hi)sh.push({i:i,p:c[i].high});if(lo)sl.push({i:i,p:c[i].low})}
  var look=Math.min(n,48),seg=c.slice(-look),hh=Math.max.apply(null,seg.map(function(x){return x.high})),ll=Math.min.apply(null,seg.map(function(x){return x.low}));
  var vS=mean(c.slice(-24).map(function(x){return x.volume})),vL=mean(c.slice(-120,-24).map(function(x){return x.volume})),vr=vL>0?vS/vL:null;
  var W=20,rw=function(e){var h=-Infinity,l=Infinity;for(var q=e-W+1;q<=e;q++){if(c[q].high>h)h=c[q].high;if(c[q].low<l)l=c[q].low}return{h:h,l:l,w:(h-l)/c[e].close}};
  var ws=[];for(var e=Math.max(W-1,n-200);e<n;e++)ws.push(rw(e).w);
  var cur=rw(n-1),mw=median(ws),ratio=mw>0?cur.w/mw:null,span=cur.h-cur.l,drift=span>0?Math.abs(c[n-1].close-c[n-W].close)/span:0;
  var cons=ratio!=null&&ratio<=0.75&&drift<=0.5;
  var ls=sl[sl.length-1],lh=sh[sh.length-1];
  return{n:n,price:px,atrPct:a,volRatio:volRatio,volState:volRatio==null?'—':volRatio>=1.5?'Elevated':volRatio<=0.6?'Compressed':'Normal',
    lastHigh:lh||null,lastLow:ls||null,swingLow:ls?ls.p:null,swingHigh:lh?lh.p:null,belowSwingLow:!!(ls&&px<ls.p),
    hh:hh,ll:ll,fromHigh:(px/hh-1)*100,recovery:(px/ll-1)*100,volumeRatio:vr,
    cons:cons,consRatio:ratio,rangeHigh:cur.h,rangeLow:cur.l,rangePct:cur.w*100,drift:drift,
    tail:c.slice(-90).map(function(x){return x.close}),tailOff:n-Math.min(90,n),sh:sh,sl:sl}}
function btcState(c){
  if(!c||c.length<60)return null;var cl=c.map(function(x){return x.close}),n=cl.length,fast=n>=210?50:20,slow=n>=210?200:50,ef=ema(cl,fast)[n-1],es=ema(cl,slow)[n-1],px=cl[n-1];
  var st=(px>ef&&ef>es)?'Bullish':(px<ef&&px<es&&ef<es)?'Bearish':'Mixed';var back=Math.min(n-1,42);
  return{state:st,price:px,fast:fast,slow:slow,ef:ef,es:es,chg:(px/cl[n-1-back]-1)*100,bars:back}}

var api={derive:derive,simulate:simulate,targetCalc:targetCalc,allocate:allocate,timeline:timeline,analyze:analyze,btcState:btcState,defState:defState,normCoin:normCoin,fmtP:fmtP};
root.MPV_VAM=root.MPV_VAM||{};root.MPV_VAM.core=api;root.MPV_VAM.version='1.0';
if(typeof module!=='undefined'&&module.exports)module.exports={api:api,setState:function(x){S=x},getState:function(){return S}};
if(typeof document==='undefined')return;

/* ============================== market data (public, read-only) ============================== */
var INTERVALS={'15m':900,'1h':3600,'4h':14400,'1d':86400};
var LIVE={},MON={coins:{},btc:null,time:0,src:{},err:null},cache={},ALERTS=[],seenAlerts=null,priceTime=0,priceErr=null;
function chartInfo(){try{if(CFG.chart)return CFG.chart();if(typeof root.__vamChart==='function'){var bi=root.__vamChart();return bi&&bi.candles&&bi.candles.length?bi:null}var s=(typeof sym!=='undefined')?sym:null,t=(typeof tf!=='undefined')?tf:null,c=(typeof candles!=='undefined')?candles:null;
  if(!s||!c||!c.length)return null;return{coin:normCoin(s[0]),tfSec:t?(t[3]?t[3]*2592000:t[2]):0,candles:c}}catch(e){return null}}
function http(path){var b=CFG.apiBases,i=0;
  function go(){if(i>=b.length)return Promise.reject(new Error('market data unavailable'));var u=b[i++]+path,ctl=typeof AbortController!=='undefined'?new AbortController():null,to=setTimeout(function(){ctl&&ctl.abort()},9000);
    return fetch(u,ctl?{signal:ctl.signal}:{}).then(function(r){clearTimeout(to);if(!r.ok)throw new Error(r.status);return r.json()}).catch(function(){clearTimeout(to);return go()})}
  return go()}
function getCandles(coin,iv,limit){
  limit=limit||300;
  if(CFG.getCandles)return Promise.resolve(CFG.getCandles(coin,iv,limit)).then(function(r){return Array.isArray(r)?{candles:r,src:'site'}:r});
  var ch=chartInfo();if(ch&&ch.coin===coin&&ch.tfSec===INTERVALS[iv]&&ch.candles&&ch.candles.length>=60)return Promise.resolve({candles:ch.candles,src:'chart'});
  var key=coin+'|'+iv,h=cache[key];if(h&&Date.now()-h.t<25000)return Promise.resolve(h.v);
  return http('/api/v3/klines?symbol='+coin+(S.settings.quote||CFG.quote)+'&interval='+iv+'&limit='+limit).then(function(rows){
    var v={candles:rows.map(function(r){return{time:r[0]/1000,open:+r[1],high:+r[2],low:+r[3],close:+r[4],volume:+r[5]}}),src:'public'};cache[key]={t:Date.now(),v:v};return v})}
function heldCoins(){var s={};S.lots.forEach(function(l){s[l.coin]=1});return Object.keys(s)}
function priceOf(coin){var o=S.prices[coin];if(o>0)return o;try{if(CFG.getPrice){var v=CFG.getPrice(coin);if(v>0)return v}}catch(e){}
  var ch=chartInfo();if(ch&&ch.coin===coin&&ch.candles.length){var p=ch.candles[ch.candles.length-1].close;if(p>0)return p}return LIVE[coin]>0?LIVE[coin]:null}
function pxMap(){var m={};heldCoins().forEach(function(c){var p=priceOf(c);if(p)m[c]=p});return m}
function refreshPrices(){
  var coins=heldCoins().filter(function(c){return !(S.prices[c]>0)});if(!coins.length){priceTime=Date.now();return Promise.resolve()}
  var q=S.settings.quote||CFG.quote;
  return http('/api/v3/ticker/price?symbols='+encodeURIComponent(JSON.stringify(coins.map(function(c){return c+q})))).then(function(rows){
    rows.forEach(function(r){var c=r.symbol.slice(0,-q.length);LIVE[c]=+r.price});priceTime=Date.now();priceErr=null})
  .catch(function(){return Promise.all(coins.map(function(c){return http('/api/v3/ticker/price?symbol='+c+q).then(function(r){LIVE[c]=+r.price}).catch(function(){})})).then(function(){priceTime=Date.now();priceErr=coins.some(function(c){return !(LIVE[c]>0)})?'Some coins have no public price — add a manual price in Settings.':null})})}
function runMonitor(){
  var iv=S.settings.interval,coins=heldCoins(),jobs=coins.map(function(c){return getCandles(c,iv,300).then(function(r){MON.coins[c]=analyze(r.candles);MON.src[c]=r.src}).catch(function(){MON.coins[c]=null;MON.src[c]='none'})});
  jobs.push(getCandles('BTC','4h',300).then(function(r){MON.btc=btcState(r.candles)}).catch(function(){MON.btc=null}));
  return Promise.all(jobs).then(function(){MON.time=Date.now();MON.err=null;Object.keys(MON.coins).forEach(function(c){if(coins.indexOf(c)<0)delete MON.coins[c]});buildAlerts()})}

/* ============================== informational alerts (conditions only, never buy signals) ============================== */
function buildAlerts(){
  var D=derive(S,pxMap()),cf=S.settings,out=[];
  D.coins.forEach(function(c){var p=D.pos[c],m=MON.coins[c],pr=p.price;
    if(pr){var dd=(1-pr/p.avg)*100;
      if(cf.drawdownAlertPct>0&&dd>=cf.drawdownAlertPct)out.push({coin:c,lvl:'bad',key:c+'dd',text:c+' is '+dd.toFixed(1)+'% below its average entry (alert level '+cf.drawdownAlertPct+'%).'});
      if(pr<p.lowEntry)out.push({coin:c,lvl:'warn',key:c+'low',text:c+' trades '+((1-pr/p.lowEntry)*100).toFixed(1)+'% below your lowest entry ('+fmtP(p.lowEntry)+').'})}
    if(!m)return;
    if(m.belowSwingLow)out.push({coin:c,lvl:'warn',key:c+'sw',text:c+' is below its last confirmed swing low ('+fmtP(m.swingLow)+').'});
    if(m.recovery>=cf.recoveryAlertPct&&m.fromHigh<-5)out.push({coin:c,lvl:'good',key:c+'rec',text:c+' has recovered '+m.recovery.toFixed(1)+'% from its local low ('+fmtP(m.ll)+').'});
    if(m.cons)out.push({coin:c,lvl:'info',key:c+'cons',text:c+' is moving sideways: range '+fmtP(m.rangeLow)+' – '+fmtP(m.rangeHigh)+' ('+m.rangePct.toFixed(1)+'% wide).'});
    if(m.volState==='Elevated')out.push({coin:c,lvl:'warn',key:c+'vol',text:c+' volatility is elevated ('+m.volRatio.toFixed(1)+'x its recent norm).'});
    if(m.volumeRatio!=null&&m.volumeRatio>=1.8)out.push({coin:c,lvl:'info',key:c+'vv',text:c+' volume is '+m.volumeRatio.toFixed(1)+'x its recent average.'})});
  if(MON.btc&&MON.btc.state==='Bearish'&&D.coins.length)out.push({coin:'BTC',lvl:'warn',key:'btcbear',text:'BTC direction reads bearish (price below its '+MON.btc.fast+' and '+MON.btc.slow+' EMAs).'});
  ALERTS=out;var keys={};out.forEach(function(a){keys[a.key]=1});
  if(seenAlerts){out.forEach(function(a){if(!seenAlerts[a.key])notify(a.text,a.lvl)})}
  seenAlerts=keys}

/* ============================== ui plumbing ============================== */
var CSS='.vam,.vam *{box-sizing:border-box}.vam{--b0:var(--vam-bg,var(--bg,#0b0f17));--b1:var(--vam-panel,var(--bg2,#121826));--b2:var(--vam-panel2,rgba(128,140,170,.14));--ln:var(--vam-line,var(--line,#252d42));--tx:var(--vam-text,var(--txt,#e6e9f2));--mu:var(--vam-muted,var(--mut,#7f8aa3));--vup:var(--vam-up,var(--up,#2dd4a7));--vdn:var(--vam-down,var(--dn,#ff5d7a));--ac:var(--vam-accent,#2962ff);--am:#f5a623;position:fixed;inset:0;z-index:'+CFG.zIndex+';background:var(--b0);color:var(--tx);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:none;flex-direction:column}'
+'.vam.on{display:flex}.vam-hd{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--ln);background:var(--b1)}.vam-hd h2{margin:0;font-size:16px;font-weight:650;flex:1;min-width:0}.vam-hd small{color:var(--mu);display:block;font-weight:400;font-size:11px;margin-top:1px}'
+'.vam-x{background:var(--b2);color:var(--tx);border:1px solid var(--ln);border-radius:8px;width:34px;height:34px;font-size:18px;cursor:pointer}'
+'.vam-tabs{display:flex;gap:4px;padding:8px 10px;overflow-x:auto;border-bottom:1px solid var(--ln);background:var(--b1);scrollbar-width:none}.vam-tabs::-webkit-scrollbar{display:none}'
+'.vam-tab{flex:0 0 auto;background:transparent;color:var(--mu);border:1px solid transparent;border-radius:8px;padding:7px 12px;font:inherit;cursor:pointer;white-space:nowrap}.vam-tab.on{background:var(--b2);color:var(--tx);border-color:var(--ln)}'
+'.vam-body{flex:1;overflow:auto;padding:12px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.vam-wrap{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:12px}'
+'.vam-disc{font-size:11.5px;color:var(--mu);border:1px solid var(--ln);border-radius:8px;padding:7px 10px;background:var(--b1)}'
+'.vam-grid{display:grid;gap:10px;grid-template-columns:repeat(2,1fr)}@media(min-width:760px){.vam-grid{grid-template-columns:repeat(3,1fr)}.vam-g2{grid-template-columns:repeat(2,1fr)}}@media(min-width:1000px){.vam-grid.g6{grid-template-columns:repeat(6,1fr)}}'
+'.vam-card{background:var(--b1);border:1px solid var(--ln);border-radius:10px;padding:12px}.vam-k{color:var(--mu);font-size:11.5px;text-transform:uppercase;letter-spacing:.04em}.vam-v{font-size:20px;font-weight:650;margin-top:3px;word-break:break-word}.vam-s{color:var(--mu);font-size:11.5px;margin-top:2px}'
+'.vam h3{margin:0 0 8px;font-size:13px;color:var(--mu);text-transform:uppercase;letter-spacing:.05em;font-weight:600}.vam .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.vam .sp{flex:1}'
+'.up{color:var(--vup)}.dn{color:var(--vdn)}.mu{color:var(--mu)}.am{color:var(--am)}.vam-tw{overflow-x:auto;-webkit-overflow-scrolling:touch}.vam table{border-collapse:collapse;width:100%;font-size:13px}.vam th{color:var(--mu);font-weight:500;text-align:right;padding:6px 8px;border-bottom:1px solid var(--ln);white-space:nowrap;font-size:11.5px;text-transform:uppercase;letter-spacing:.03em}.vam td{padding:7px 8px;text-align:right;border-bottom:1px solid var(--ln);white-space:nowrap}.vam th:first-child,.vam td:first-child{text-align:left}.vam tr:last-child td{border-bottom:0}'
+'.vam button,.vam .btn{background:var(--b2);color:var(--tx);border:1px solid var(--ln);border-radius:8px;padding:7px 12px;font:inherit;cursor:pointer}.vam button:hover{border-color:var(--ac)}.vam .pri{background:var(--ac);border-color:var(--ac);color:#fff}.vam .sm{padding:3px 8px;font-size:12px}.vam .dng{color:var(--vdn)}.vam button.on{border-color:var(--ac);background:rgba(41,98,255,.2)}'
+'.vam input,.vam select,.vam textarea{background:var(--b0);color:var(--tx);border:1px solid var(--ln);border-radius:8px;padding:8px 10px;font:inherit;width:100%;min-width:0}.vam input[type=checkbox]{width:auto}.vam input:focus,.vam select:focus{outline:0;border-color:var(--ac)}'
+'.vam label.f{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--mu)}.vam .ff{display:grid;gap:10px;grid-template-columns:repeat(2,1fr)}@media(min-width:760px){.vam .ff.c3{grid-template-columns:repeat(3,1fr)}.vam .ff.c4{grid-template-columns:repeat(4,1fr)}}.vam .ff .full{grid-column:1/-1}'
+'.vam .ck{flex-direction:row;align-items:center;gap:8px;color:var(--tx);font-size:13px}.vam .chip{display:inline-flex;gap:6px;align-items:center;border:1px solid var(--ln);background:var(--b2);border-radius:99px;padding:3px 10px;font-size:12px}'
+'.vam .bd{display:inline-block;border-radius:99px;padding:2px 9px;font-size:11.5px;border:1px solid var(--ln)}.vam .bd.good{color:var(--vup);border-color:var(--vup)}.vam .bd.bad{color:var(--vdn);border-color:var(--vdn)}.vam .bd.warn{color:var(--am);border-color:var(--am)}'
+'.vam .al{display:flex;gap:8px;padding:7px 10px;border-radius:8px;border:1px solid var(--ln);background:var(--b2);font-size:13px;margin-bottom:6px;border-left:3px solid var(--mu)}.vam .al.bad{border-left-color:var(--vdn)}.vam .al.warn{border-left-color:var(--am)}.vam .al.good{border-left-color:var(--vup)}.vam .al.info{border-left-color:var(--ac)}'
+'.vam .bar{height:6px;background:var(--b0);border-radius:4px;overflow:hidden}.vam .bar i{display:block;height:100%;background:var(--ac)}.vam svg{display:block;width:100%;height:auto}'
+'.vam-mod{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:'+(CFG.zIndex+1)+';display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow:auto}.vam-mod>div{background:var(--b1,#121826);color:var(--tx,#e6e9f2);border:1px solid var(--ln,#252d42);border-radius:12px;padding:14px;width:100%;max-width:640px;margin:auto}'
+'.vam-mod h3{margin:0 0 10px}.vam-toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:'+(CFG.zIndex+2)+';background:#192033;color:#e6e9f2;border:1px solid #2a3350;border-left:3px solid #2962ff;border-radius:8px;padding:9px 14px;font:13px system-ui;max-width:90vw;box-shadow:0 6px 24px rgba(0,0,0,.4)}'
+'.vam-fab{position:fixed;right:14px;bottom:14px;z-index:'+(CFG.zIndex-1)+';background:#2962ff;color:#fff;border:0;border-radius:99px;padding:9px 14px;font:600 13px system-ui;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.4)}';
function injectCss(){if(document.getElementById('vam-css'))return;var s=document.createElement('style');s.id='vam-css';s.textContent=CSS;document.head.appendChild(s)}
function notify(text,lvl){try{if(CFG.onToast)return CFG.onToast(text,lvl);if(typeof toast==='function'&&!(ROOT&&ROOT.classList.contains('on'))){toast('VAM \u00b7 '+text,lvl==='bad'?'#ff5d7a':lvl==='good'?'#2dd4a7':'#f5a623');return}}catch(e){}
  var t=document.createElement('div');t.className='vam-toast';t.textContent=text;document.body.appendChild(t);setTimeout(function(){t.remove()},4200)}
var ROOT=null,BODY=null,TABSEL=null,cur='dash',MODAL=null;
function modal(title,html,onReady){closeModal();var m=document.createElement('div');m.className='vam vam-mod on';m.style.cssText='position:fixed;display:flex;background:rgba(0,0,0,.6)';
  m.innerHTML='<div><h3>'+esc(title)+'</h3>'+html+'</div>';m.addEventListener('mousedown',function(e){if(e.target===m)closeModal()});document.body.appendChild(m);MODAL=m;if(onReady)onReady(m);return m}
function closeModal(){if(MODAL){MODAL.remove();MODAL=null}}
function cl(v){return v>0?'up':v<0?'dn':''}
function cur$(){return S.settings.currency||'USD'}
function money(v,sign){if(v==null||!isFinite(v))return'—';var c=cur$(),sy={USD:'$',EUR:'\u20ac',GBP:'\u00a3'}[c],s=(sign&&v>0?'+':'')+(v<0?'-':''),a=Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});return sy?s+sy+a:s+a+' '+c}
function pl(v,p){if(v==null)return'<span class="mu">—</span>';return'<span class="'+cl(v)+'">'+money(v,true)+(p!=null?' <small>('+pctF(p)+')</small>':'')+'</span>'}
function kpi(k,v,s,c){return'<div class="vam-card"><div class="vam-k">'+k+'</div><div class="vam-v '+(c||'')+'">'+v+'</div>'+(s?'<div class="vam-s">'+s+'</div>':'')+'</div>'}
function fld(label,name,val,o){o=o||{};var t=o.type||'text',a=(o.attrs||'')+(o.live?' data-live="'+o.live+'"':'');
  if(t==='select')return'<label class="f '+(o.cls||'')+'">'+label+'<select name="'+name+'" '+a+'>'+o.opts.map(function(x){var v=Array.isArray(x)?x[0]:x,l=Array.isArray(x)?x[1]:x;return'<option value="'+esc(v)+'"'+(String(v)===String(val)?' selected':'')+'>'+esc(l)+'</option>'}).join('')+'</select></label>';
  if(t==='checkbox')return'<label class="f ck '+(o.cls||'')+'"><input type="checkbox" name="'+name+'" '+(val?'checked':'')+' '+a+'> '+label+'</label>';
  return'<label class="f '+(o.cls||'')+'">'+label+'<input type="'+t+'" name="'+name+'" value="'+esc(val==null?'':val)+'" '+(t==='number'?'step="any" inputmode="decimal" ':'')+(o.ph?'placeholder="'+esc(o.ph)+'" ':'')+a+'></label>'}
function formVals(el){var o={};el.querySelectorAll('[name]').forEach(function(i){o[i.name]=i.type==='checkbox'?i.checked:i.value});return o}
function warnHtml(w){return w.map(function(x){return'<div class="al '+(x.lvl==='info'?'info':x.lvl)+'">'+esc(x.msg)+'</div>'}).join('')}
function svgLine(series,o){ // series:[{pts:[[x,y]],color,fill,dash}]  -> minimal responsive chart
  o=o||{};var W=600,H=o.h||150,P={l:6,r:6,t:8,b:14},xs=[],ys=[];series.forEach(function(s){s.pts.forEach(function(p){xs.push(p[0]);ys.push(p[1])})});if(!xs.length)return'<div class="mu">No data yet.</div>';
  var x0=Math.min.apply(null,xs),x1=Math.max.apply(null,xs),y0=o.zero?Math.min(0,Math.min.apply(null,ys)):Math.min.apply(null,ys),y1=Math.max.apply(null,ys);if(x1===x0)x1=x0+1;if(y1===y0)y1=y0+1;var pad=(y1-y0)*.06;y1+=pad;if(!o.zero)y0-=pad;
  var X=function(x){return P.l+(x-x0)/(x1-x0)*(W-P.l-P.r)},Y=function(y){return P.t+(1-(y-y0)/(y1-y0))*(H-P.t-P.b)},out='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="height:'+H+'px">';
  if(o.zero&&y0<0)out+='<line x1="0" x2="'+W+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="#252d42"/>';
  (o.hlines||[]).forEach(function(h){if(h.y>=y0&&h.y<=y1)out+='<line x1="0" x2="'+W+'" y1="'+Y(h.y)+'" y2="'+Y(h.y)+'" stroke="'+h.c+'" stroke-dasharray="4 3" stroke-width="1"/>'});
  series.forEach(function(s){var d=s.pts.map(function(p,i){return(i?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)}).join(' ');
    if(s.fill)out+='<path d="'+d+' L'+X(s.pts[s.pts.length-1][0]).toFixed(1)+' '+Y(Math.max(y0,0)).toFixed(1)+' L'+X(s.pts[0][0]).toFixed(1)+' '+Y(Math.max(y0,0)).toFixed(1)+'Z" fill="'+s.color+'" opacity=".18"/>';
    out+='<path d="'+d+'" fill="none" stroke="'+s.color+'" stroke-width="'+(s.w||1.6)+'" '+(s.dash?'stroke-dasharray="4 3"':'')+' vector-effect="non-scaling-stroke"/>'});
  (o.marks||[]).forEach(function(m){out+='<circle cx="'+X(m.x).toFixed(1)+'" cy="'+Y(m.y).toFixed(1)+'" r="3" fill="'+m.c+'"/>'});return out+'</svg>'}

/* ============================== tabs ============================== */
var LIVE_H={},UI={coin:null,showClosed:false,avg:{coin:null,buys:[]},sim:{scope:'ALL',sel:-20,custom:'',buy:0},hist:{coin:'',from:'',to:'',type:''}};
var TABS=[['dash','Dashboard'],['entries','Entries'],['targets','Targets & Exits'],['avg','Average-Down'],['mon','Monitor'],['sim','Simulator'],['risk','Risk & Settings'],['hist','History']];
function DD(){return derive(S,pxMap())}
function ctxFor(coin){var m=MON.coins[coin];return{cons:m?m.cons:null,btc:MON.btc?MON.btc.state:null}}
function pickCoin(D){if(!UI.coin||D.coins.indexOf(UI.coin)<0)UI.coin=D.coins[0]||null;return UI.coin}
function coinSel(D,act,val){if(!D.coins.length)return'';return'<label class="f" style="min-width:130px">Coin<select data-change="'+act+'">'+D.coins.map(function(c){return'<option'+(c===val?' selected':'')+'>'+esc(c)+'</option>'}).join('')+'</select></label>'}
function empty(msg){return'<div class="vam-card mu">'+msg+'</div>'}

function tDash(){var D=DD(),cf=S.settings,free=Math.max(0,D.cash-cf.minReserve),allMissing=D.coins.length&&D.missing.length===D.coins.length;
  var h='<div class="vam-grid g6">'+kpi('Total capital',money(D.cap),'started with '+money(cf.startingCapital))
   +kpi('Invested',money(D.invested),D.exposure.toFixed(1)+'% of capital deployed')
   +kpi('Available cash',money(D.cash),'above reserve: '+money(free),D.cash<cf.minReserve?'dn':'')
   +kpi('Realized profit',money(D.realized,true),D.exits.length+' completed exit(s)',cl(D.realized))
   +kpi('Unrealized P/L',allMissing?'—':money(D.unreal,true),D.invested>0&&!allMissing?pctF(D.unreal/D.invested*100)+' on open cost':'',cl(D.unreal))
   +kpi('Portfolio value',money(D.pv),'total P/L '+money(D.totalPL,true),cl(D.totalPL))+'</div>';
  var bd=function(ok,t){return'<span class="bd '+(ok?'good':'bad')+'">'+t+'</span>'};
  h+='<div class="vam-card"><h3>Rule status</h3><div class="row">'
   +bd(!cf.maxEntries||D.entries<=cf.maxEntries,'Entries '+D.entries+(cf.maxEntries?' / '+cf.maxEntries:''))
   +bd(!cf.maxExposurePct||D.exposure<=cf.maxExposurePct,'Exposure '+D.exposure.toFixed(1)+'%'+(cf.maxExposurePct?' / '+cf.maxExposurePct+'%':''))
   +bd(D.cash>=cf.minReserve,'Reserve '+money(D.cash)+' / min '+money(cf.minReserve))
   +'<span class="bd">Per entry '+money(cf.perEntry)+'</span>'+(cf.maxPerBuy?'<span class="bd">Max per buy '+money(cf.maxPerBuy)+'</span>':'')+'</div></div>';
  if(D.missing.length)h+='<div class="al warn">No live price for '+esc(D.missing.join(', '))+' — valued at cost until a price loads. '+(priceErr?esc(priceErr):'')+'</div>';
  h+='<div class="vam-card"><div class="row"><h3 class="sp" style="margin:0">Open positions</h3><button class="sm" data-act="go" data-tab="entries">Add entry</button></div>';
  if(!D.coins.length)h+='<p class="mu">No open positions. Record your first buy in <b>Entries</b>. Trades are entered by hand — nothing is connected to an exchange account.</p>';
  else{h+='<div class="vam-tw"><table><tr><th>Coin</th><th>Qty</th><th>Avg entry</th><th>Break-even</th><th>Price</th><th>Value</th><th>Unrealized</th><th>vs avg</th></tr>';
    D.coins.forEach(function(c){var p=D.pos[c];h+='<tr><td><b>'+esc(c)+'</b> <span class="mu">\u00d7'+p.entries+'</span></td><td>'+fmtQ(p.qty)+'</td><td>'+fmtP(p.avg)+'</td><td>'+fmtP(p.be)+'</td><td>'+fmtP(p.price)+'</td><td>'+(p.value!=null?money(p.value):'—')+'</td><td>'+pl(p.unreal,p.unrealPct)+'</td><td class="'+cl(p.vsAvg)+'">'+pctF(p.vsAvg)+'</td></tr>'});
    h+='</table></div>'}
  h+='</div>';
  if(D.coins.length){h+='<div class="vam-card"><h3>Allocation by cost</h3>';D.coins.forEach(function(c){var p=D.pos[c],w=D.invested>0?p.cost/D.invested*100:0;h+='<div class="row" style="margin-bottom:6px"><span style="width:58px"><b>'+esc(c)+'</b></span><div class="bar sp"><i style="width:'+w.toFixed(1)+'%"></i></div><span class="mu" style="width:150px;text-align:right">'+w.toFixed(1)+'% \u00b7 '+money(p.cost)+'</span></div>'});h+='</div>'}
  h+='<div class="vam-card"><h3>Market conditions (informational)</h3>'+(ALERTS.length?ALERTS.map(function(a){return'<div class="al '+a.lvl+'">'+esc(a.text)+'</div>'}).join(''):'<div class="mu">'+(MON.time?'No conditions flagged right now.':'Waiting for market data…')+'</div>')+'<div class="vam-s">These are observations about price, volatility and range. They are not buy or sell signals.</div></div>';
  return h}

function tEntries(){var D=DD(),h='<div class="row"><h3 class="sp" style="margin:0">Buy entries</h3><label class="f ck"><input type="checkbox" data-change="showclosed" '+(UI.showClosed?'checked':'')+'> show fully sold</label><button class="pri" data-act="addentry">+ Add entry</button></div>';
  if(D.coins.length){h+='<div class="vam-card"><h3>Position summary</h3><div class="vam-tw"><table><tr><th>Coin</th><th>Open entries</th><th>Quantity</th><th>Total exposure</th><th>Weighted avg price</th><th>Avg cost incl. fees</th><th>Break-even</th></tr>';
    D.coins.forEach(function(c){var p=D.pos[c];h+='<tr><td><b>'+esc(c)+'</b></td><td>'+p.entries+'</td><td>'+fmtQ(p.qty)+'</td><td>'+money(p.cost)+'</td><td>'+fmtP(p.avg)+'</td><td>'+fmtP(p.avgCost)+'</td><td>'+fmtP(p.be)+'</td></tr>'});h+='</table></div></div>'}
  var L=D.lots.slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date))});if(!UI.showClosed)L=L.filter(function(l){return l.open});
  h+='<div class="vam-card"><h3>Entries</h3>';
  if(!L.length)h+='<p class="mu">Nothing here yet.</p>';
  else{h+='<div class="vam-tw"><table><tr><th>Date</th><th>Coin</th><th>Buy price</th><th>Amount</th><th>Fee</th><th>Qty</th><th>Remaining</th><th>Price now</th><th>P/L</th><th></th></tr>';
    L.forEach(function(l){var pr=priceOf(l.coin),pnl=pr&&l.rem>0?l.rem*pr-l.remCost:null;
      h+='<tr><td>'+esc(String(l.date).replace('T',' '))+'</td><td><b>'+esc(l.coin)+'</b></td><td>'+fmtP(l.price)+'</td><td>'+money(l.amount)+'</td><td>'+money(l.fee)+'</td><td>'+fmtQ(l.qty)+'</td><td>'+(l.open?fmtQ(l.rem):'<span class="mu">sold</span>')+'</td><td>'+fmtP(pr)+'</td><td>'+(pnl==null?'—':pl(pnl,pnl/l.remCost*100))+'</td>'
      +'<td><button class="sm" data-act="sell" data-id="'+l.id+'"'+(l.open?'':' disabled')+'>Sell</button> <button class="sm" data-act="editentry" data-id="'+l.id+'">Edit</button> <button class="sm dng" data-act="delentry" data-id="'+l.id+'">Del</button></td></tr>'});h+='</table></div>'}
  return h+'</div>'}

function openEntry(id){var l=id?S.lots.filter(function(x){return x.id===id})[0]:null,cf=S.settings,v=l||{coin:UI.coin||'',price:'',amount:cf.perEntry,fee:'',date:nowLocal(),qty:'',note:''};
  var html='<form class="ff" data-form="entry"><input type="hidden" name="id" value="'+(l?l.id:'')+'">'
   +fld('Coin (e.g. BTC)','coin',v.coin,{attrs:'required autocapitalize="characters"',live:'entry'})+fld('Buy price','price',v.price,{type:'number',live:'entry',attrs:'required'})
   +fld('Amount invested ('+esc(cur$())+')','amount',v.amount,{type:'number',live:'entry',attrs:'required'})+fld('Fee ('+esc(cur$())+') — blank = '+cf.feePct+'%','fee',l?v.fee:'',{type:'number',live:'entry'})
   +fld('Date & time','date',v.date,{type:'datetime-local'})+fld('Coins received (optional)','qty',l&&l.qty?l.qty:'',{type:'number',live:'entry'})
   +fld('Note','note',v.note,{cls:'full'})+'<div class="full" id="vam-ent-prev"></div><div class="full row"><span class="sp"></span><button type="button" data-act="closemod">Cancel</button><button class="pri" type="submit">'+(l?'Save changes':'Record entry')+'</button></div></form>';
  modal(l?'Edit entry':'Add buy entry',html,function(m){LIVE_H.entry(m)})}
LIVE_H.entry=function(m){m=m||MODAL;var box=m&&m.querySelector('#vam-ent-prev');if(!box)return;var f=formVals(m.querySelector('form')),coin=normCoin(f.coin),price=num(f.price),amt=num(f.amount);
  if(!(price>0&&amt>0&&coin)){box.innerHTML='';return}
  var fee=f.fee===''?amt*S.settings.feePct/100:num(f.fee),q=num(f.qty)>0?num(f.qty):amt/price,h='<div class="vam-s">Cost basis '+money(amt+fee)+' \u00b7 quantity '+fmtQ(q)+'</div>';
  if(!f.id){var D=DD(),sm=simulate(D,S,coin,[{price:price,amount:amt,fee:fee}],priceOf(coin),ctxFor(coin));h+='<div class="vam-s">After this entry: avg '+fmtP(sm.after.avg)+' \u00b7 cash '+money(sm.after.cash)+' \u00b7 exposure '+sm.after.exposure.toFixed(1)+'%</div>'+warnHtml(sm.warn.filter(function(w){return w.lvl!=='info'}))}
  box.innerHTML=h};
function submitEntry(f){var D=DD(),cf=S.settings,coin=normCoin(f.coin),price=num(f.price),amt=num(f.amount);
  if(!coin||!(price>0)||!(amt>0))return alert('Enter a coin, a buy price and an amount above zero.');
  var fee=f.fee===''?amt*cf.feePct/100:Math.max(0,num(f.fee)),qty=num(f.qty)>0?num(f.qty):amt/price,date=f.date||nowLocal();
  if(f.id){var L=D.lotMap[f.id];if(L&&qty<L.sold-1e-10)return alert('This entry already has '+fmtQ(L.sold)+' sold. The quantity cannot be lower than that — delete or edit the exit first.');
    var o=S.lots.filter(function(x){return x.id===f.id})[0];Object.assign(o,{coin:coin,price:price,amount:amt,fee:fee,date:date,qty:qty,note:f.note||''})}
  else{var sm=simulate(D,S,coin,[{price:price,amount:amt,fee:fee}],priceOf(coin),ctxFor(coin)),bad=sm.warn.filter(function(w){return w.lvl==='bad'});
    if(bad.length&&!confirm('This entry breaks your rules:\n\n\u2022 '+bad.map(function(w){return w.msg}).join('\n\u2022 ')+'\n\nRecord it anyway (as a trade you already made)?'))return;
    S.lots.push({id:uid(),coin:coin,price:price,amount:amt,fee:fee,date:date,qty:qty,note:f.note||''})}
  UI.coin=coin;save();closeModal();render();refreshPrices().then(function(){runMonitor().then(softRender)})}

function openExit(o){var D=DD(),coin=o.coin||(o.lotId&&D.lotMap[o.lotId]?D.lotMap[o.lotId].coin:UI.coin),p=D.pos[coin];if(!p)return alert('No open position in '+(coin||'that coin')+'.');
  var price=o.price||p.price||'',scopes=[['ALL','Whole position ('+fmtQ(p.qty)+')']].concat(p.lots.map(function(l){return[l.id,'Entry '+String(l.date).slice(0,10)+' @ '+fmtP(l.eff)+' ('+fmtQ(l.rem)+')']}));
  var html='<form class="ff" data-form="exit"><input type="hidden" name="coin" value="'+esc(coin)+'">'
   +fld('Sell from','scope',o.lotId||'ALL',{type:'select',opts:scopes,live:'exit',cls:'full'})+fld('If whole position, take from','method','fifo',{type:'select',live:'exit',opts:[['fifo','Oldest entry first'],['high','Highest-priced entry first'],['low','Lowest-priced entry first'],['prop','Proportionally from every entry']]})
   +fld('Sell price','price',price,{type:'number',live:'exit'})+fld('Quantity','qty','',{type:'number',live:'exit',ph:'coins'})+fld('…or % of selected','pct',o.pct||'',{type:'number',live:'exit',ph:'e.g. 50'})
   +fld('Fee ('+esc(cur$())+') — blank = '+S.settings.feePct+'%','fee','',{type:'number',live:'exit'})+fld('Date & time','date',nowLocal(),{type:'datetime-local'})+fld('Note','note','',{cls:'full'})
   +'<div class="full" id="vam-ex-prev"></div><div class="full row"><span class="sp"></span><button type="button" data-act="closemod">Cancel</button><button class="pri" type="submit">Record exit</button></div></form>';
  modal('Record exit \u00b7 '+coin,html,function(m){LIVE_H.exit(m)})}
function exitPlan(f){var D=DD(),p=D.pos[f.coin];if(!p)return null;var lots=f.scope==='ALL'?p.lots:p.lots.filter(function(l){return l.id===f.scope}),avail=sum(lots,'rem'),q=num(f.pct)>0?avail*Math.min(100,num(f.pct))/100:num(f.qty);
  if(!(q>0))return{avail:avail,q:0};if(q>avail*(1+1e-9))return{avail:avail,q:q,err:'More than the '+fmtQ(avail)+' available.'};q=Math.min(q,avail);
  var a=f.scope==='ALL'?allocate(lots,q,f.method):allocate(lots,q,'fifo'),price=num(f.price),gross=price*q,fee=f.fee===''?gross*S.settings.feePct/100:num(f.fee),basis=0;a.alloc.forEach(function(x){basis+=x.qty*D.lotMap[x.lot].unit});
  return{avail:avail,q:q,alloc:a.alloc,price:price,gross:gross,fee:fee,basis:basis,profit:gross-fee-basis,rest:p.qty-q}}
LIVE_H.exit=function(m){m=m||MODAL;var box=m&&m.querySelector('#vam-ex-prev');if(!box)return;var pl_=exitPlan(formVals(m.querySelector('form')));
  if(!pl_||!pl_.q){box.innerHTML='<div class="vam-s">Enter a quantity or a percentage.</div>';return}if(pl_.err){box.innerHTML='<div class="al bad">'+esc(pl_.err)+'</div>';return}
  box.innerHTML='<div class="vam-card"><div class="vam-s">Selling '+fmtQ(pl_.q)+' for '+money(pl_.gross)+' \u00b7 fee '+money(pl_.fee)+' \u00b7 cost basis '+money(pl_.basis)+'</div><div class="vam-v '+cl(pl_.profit)+'" style="font-size:17px">Realized '+money(pl_.profit,true)+' ('+pctF(pl_.basis>0?pl_.profit/pl_.basis*100:0)+')</div><div class="vam-s">Left in position: '+fmtQ(pl_.rest)+'</div></div>'};
function submitExit(f){var pl_=exitPlan(f);if(!pl_||!pl_.q||pl_.err||!(pl_.price>0))return alert(pl_&&pl_.err?pl_.err:'Enter a sell price and a quantity.');
  S.exits.push({id:uid(),coin:f.coin,price:pl_.price,fee:pl_.fee,date:f.date||nowLocal(),note:f.note||'',alloc:pl_.alloc});save();closeModal();render()}

function tTargets(){var D=DD(),cf=S.settings,c=pickCoin(D),h='<div class="row">'+coinSel(D,'coin',c)+'<div class="sp"></div></div>';
  h+='<div class="vam-card"><h3>Profit targets</h3><div class="row">'+cf.targets.map(function(t){return'<span class="chip">'+t+'%<button class="sm" style="padding:0 5px;border:0" data-act="deltarget" data-v="'+t+'">\u00d7</button></span>'}).join('')+'<input id="vam-nt" type="number" step="any" placeholder="custom %" style="width:110px"><button class="sm" data-act="addtarget">Add</button></div>'
   +'<div class="vam-s">Targets are '+(cf.targetsNetOfFees?'<b>net</b> profit after buy and sell fees':'<b>price</b> moves above average entry before fees')+' ('+cf.feePct+'% sell fee assumed). Change this in Risk & Settings.</div></div>';
  if(c){var p=D.pos[c];h+='<div class="vam-card"><div class="row"><h3 class="sp" style="margin:0">Combined '+esc(c)+' position</h3><span class="mu">'+fmtQ(p.qty)+' coins \u00b7 avg '+fmtP(p.avg)+' \u00b7 price '+fmtP(p.price)+'</span></div>'+tgtTable(cf,p.qty,p.cost,p.amt,p.price,{coin:c})+'</div>';
    h+='<div class="vam-card"><h3>Each entry</h3>';p.lots.slice().sort(function(a,b){return a.eff-b.eff}).forEach(function(l){h+='<div style="margin-bottom:12px"><div class="row"><b>'+esc(String(l.date).slice(0,10))+' @ '+fmtP(l.eff)+'</b><span class="mu">'+fmtQ(l.rem)+' left \u00b7 cost '+money(l.remCost)+'</span><span class="sp"></span><span class="'+cl(p.price-l.eff)+'">'+pctF(p.price?(p.price/l.eff-1)*100:null)+' now</span></div>'+tgtTable(cf,l.rem,l.remCost,l.remAmt,p.price,{coin:c,lot:l.id})+'</div>'});h+='</div>'}
  else h+=empty('Add an entry first to see target prices.');
  var X=D.exits.slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date))});
  h+='<div class="vam-card"><div class="row"><h3 class="sp" style="margin:0">Completed exits</h3><span>Realized (all time): '+pl(D.realized)+'</span></div>';
  if(!X.length)h+='<p class="mu">No exits recorded yet. Realized profit is tracked separately from open positions.</p>';
  else{h+='<div class="vam-tw"><table><tr><th>Date</th><th>Coin</th><th>Qty</th><th>Sell price</th><th>Proceeds</th><th>Fee</th><th>Cost basis</th><th>Realized</th><th></th></tr>';X.forEach(function(e){h+='<tr><td>'+esc(String(e.date).replace('T',' '))+'</td><td><b>'+esc(e.coin)+'</b></td><td>'+fmtQ(e.qty)+'</td><td>'+fmtP(e.price)+'</td><td>'+money(e.gross)+'</td><td>'+money(e.fee)+'</td><td>'+money(e.basis)+'</td><td>'+pl(e.profit,e.pct)+'</td><td><button class="sm dng" data-act="delexit" data-id="'+e.id+'">Del</button></td></tr>'});h+='</table></div>'}
  return h+'</div>'}
function tgtTable(cf,qty,cost,amt,price,ref){var h='<div class="vam-tw"><table><tr><th>Target</th><th>Target price</th><th>From now</th><th>Gross profit</th><th>Est. fees</th><th>Net profit</th><th></th></tr>';
  cf.targets.forEach(function(t){var r=targetCalc(cf,qty,cost,amt,t);h+='<tr><td>+'+t+'%</td><td>'+fmtP(r.price)+'</td><td class="'+cl(r.price-price)+'">'+(price?pctF((r.price/price-1)*100):'—')+'</td><td>'+money(r.gross)+'</td><td>'+money(r.fees)+'</td><td class="up">'+money(r.net,true)+'</td><td><button class="sm" data-act="sell" data-coin="'+esc(ref.coin)+'"'+(ref.lot?' data-id="'+ref.lot+'"':'')+' data-price="'+r.price+'" data-pct="100">Sell</button> <button class="sm" data-act="sell" data-coin="'+esc(ref.coin)+'"'+(ref.lot?' data-id="'+ref.lot+'"':'')+' data-price="'+r.price+'" data-pct="50">50%</button></td></tr>'});
  return h+'</table></div>'}

function ensureAvg(D){var c=pickCoin(D);if(UI.avg.coin!==c){UI.avg.coin=c;UI.avg.buys=[{price:priceOf(c)||'',amount:S.settings.perEntry,fee:''}]}return c}
function tAvg(){var D=DD(),c=ensureAvg(D);if(!c)return empty('Averaging-down manager needs at least one open entry. Add one in <b>Entries</b>.');
  var h='<div class="row">'+coinSel(D,'avgcoin',c)+'<span class="sp"></span><span class="mu">Price now: <b>'+fmtP(priceOf(c))+'</b></span></div>';
  h+='<div class="al info">This is a calculator. It never suggests buying because price has fallen — a lower price does not make an additional buy safer.</div>';
  h+='<div class="vam-card"><h3>Previous entries</h3><div class="vam-tw"><table><tr><th>Date</th><th>Buy price</th><th>Amount</th><th>Remaining</th><th>Price now vs entry</th></tr>';
  D.pos[c].lots.slice().sort(function(a,b){return String(a.date).localeCompare(String(b.date))}).forEach(function(l){var pr=priceOf(c);h+='<tr><td>'+esc(String(l.date).slice(0,10))+'</td><td>'+fmtP(l.eff)+'</td><td>'+money(l.amount)+'</td><td>'+fmtQ(l.rem)+'</td><td class="'+cl(pr&&pr-l.eff)+'">'+(pr?pctF((pr/l.eff-1)*100):'—')+'</td></tr>'});h+='</table></div></div>';
  h+='<div class="vam-card"><div class="row"><h3 class="sp" style="margin:0">Proposed purchase(s) — simulation only</h3><button class="sm" data-act="avgadd">+ Add row</button></div><div id="vam-avg-rows">'+avgRows()+'</div></div><div id="vam-avg-out">'+avgOut()+'</div>';return h}
function avgRows(){return UI.avg.buys.map(function(b,i){return'<div class="ff c4" style="margin-top:8px;align-items:end">'+fld('Price','p'+i,b.price,{type:'number',live:'avg',attrs:'data-i="'+i+'" data-k="price"'})+fld('Amount ('+esc(cur$())+')','a'+i,b.amount,{type:'number',live:'avg',attrs:'data-i="'+i+'" data-k="amount"'})+fld('Fee (blank = '+S.settings.feePct+'%)','f'+i,b.fee,{type:'number',live:'avg',attrs:'data-i="'+i+'" data-k="fee"'})
  +'<div class="row"><button class="sm" data-act="avgq" data-i="'+i+'" data-f="1">Now</button><button class="sm" data-act="avgq" data-i="'+i+'" data-f=".95">-5%</button><button class="sm" data-act="avgq" data-i="'+i+'" data-f=".9">-10%</button><button class="sm" data-act="avgq" data-i="'+i+'" data-f=".8">-20%</button>'+(UI.avg.buys.length>1?'<button class="sm dng" data-act="avgdel" data-i="'+i+'">\u00d7</button>':'')+'</div></div>'}).join('')}
function syncAvg(){if(!BODY)return;BODY.querySelectorAll('[data-live="avg"]').forEach(function(el){var i=+el.getAttribute('data-i'),k=el.getAttribute('data-k');if(UI.avg.buys[i])UI.avg.buys[i][k]=el.value})}
function avgBuys(){return UI.avg.buys.map(function(b){return{price:num(b.price),amount:num(b.amount),fee:b.fee===''||b.fee==null?'':num(b.fee)}})}
function avgOut(){var D=DD(),c=UI.avg.coin;if(!c||!D.pos[c])return'';var cf=S.settings,sm=simulate(D,S,c,avgBuys(),priceOf(c),ctxFor(c)),B=sm.before,A=sm.after;
  var row=function(k,b,a,f,cls){return'<tr><td>'+k+'</td><td>'+f(b)+'</td><td>'+f(a)+'</td><td class="'+(cls||'')+'">'+(b!=null&&a!=null&&isFinite(b)&&isFinite(a)?(a-b>0?'+':'')+f(a-b):'—')+'</td></tr>'};
  var h='<div class="vam-card"><h3>Result if these were bought</h3>';
  if(!A.n)return h+'<p class="mu">Enter a price and an amount above zero.</p></div>';
  h+='<div class="vam-grid"><div class="vam-card"><div class="vam-k">New average entry</div><div class="vam-v">'+fmtP(A.avg)+'</div><div class="vam-s '+cl(-A.avgChange)+'">'+(A.avgChange>0?'+':'')+fmtP(A.avgChange)+' ('+pctF(A.avgChangePct)+')</div></div>'
   +'<div class="vam-card"><div class="vam-k">Cash remaining</div><div class="vam-v '+(A.cash<cf.minReserve?'dn':'')+'">'+money(A.cash)+'</div><div class="vam-s">reserve '+money(cf.minReserve)+'</div></div>'
   +'<div class="vam-card"><div class="vam-k">Exposure</div><div class="vam-v">'+A.exposure.toFixed(1)+'%</div><div class="vam-s">entries '+A.entries+(cf.maxEntries?' / '+cf.maxEntries:'')+'</div></div></div>';
  h+='<div class="vam-tw" style="margin-top:10px"><table><tr><th></th><th>Before</th><th>After</th><th>Change</th></tr>'+row('Quantity',B.qty,A.qty,fmtQ)+row('Average entry',B.avg,A.avg,fmtP)+row('Break-even (incl. fees)',B.be,A.be,fmtP)+row('Cash',B.cash,A.cash,money)+row('Invested',B.invested,A.invested,money)+'</table></div>';
  h+='<div style="margin-top:10px">'+(sm.warn.length?warnHtml(sm.warn):'<div class="al good">No risk rule is exceeded by this simulation.</div>')+'</div>'+ladder(D.pos[c],priceOf(c),sm.after);
  return h+'<div class="row" style="margin-top:10px"><span class="sp"></span><button class="pri" data-act="avgrec">Record as entries (after I have bought)</button></div></div>'}
function ladder(p,price,A){var pts=[];p.lots.forEach(function(l){pts.push({x:l.eff,c:'#8a93a6',t:'E'})});pts.push({x:p.avg,c:'#2962ff',t:'Avg'});if(A&&A.avg&&A.n)pts.push({x:A.avg,c:'#2dd4a7',t:'New'});if(price)pts.push({x:price,c:'#ffffff',t:'Now'});
  A&&A.valid&&A.valid.forEach(function(v){pts.push({x:v.price,c:'#f5a623',t:'Buy'})});var lo=Math.min.apply(null,pts.map(function(q){return q.x})),hi=Math.max.apply(null,pts.map(function(q){return q.x}));if(hi===lo)hi=lo*1.01;var sp=hi-lo;lo-=sp*.08;hi+=sp*.08;
  var X=function(v){return 20+(v-lo)/(hi-lo)*560},o='<svg viewBox="0 0 600 80" style="margin-top:8px"><line x1="20" x2="580" y1="40" y2="40" stroke="#252d42" stroke-width="2"/>';
  pts.forEach(function(q,i){var up=i%2===0;o+='<circle cx="'+X(q.x).toFixed(1)+'" cy="40" r="5" fill="'+q.c+'"/><text x="'+X(q.x).toFixed(1)+'" y="'+(up?28:60)+'" fill="#8a93a6" font-size="10" text-anchor="middle">'+q.t+' '+fmtP(q.x)+'</text>'});return o+'</svg><div class="vam-s">Grey = existing entries · blue = average · green = average after · amber = proposed · white = price now</div>'}

function tMon(){var D=DD(),h='<div class="row"><label class="f" style="width:130px">Timeframe<select data-change="interval">'+Object.keys(INTERVALS).map(function(k){return'<option'+(k===S.settings.interval?' selected':'')+'>'+k+'</option>'}).join('')+'</select></label><button data-act="refresh">Refresh now</button><span class="sp"></span><span class="mu">'+(MON.time?'Updated '+new Date(MON.time).toLocaleTimeString():'Loading…')+'</span></div>';
  h+='<div class="al info">Observations only: they describe price, volatility, volume and range from public market data. They are not buy signals and do not make an entry safer.</div>';
  var b=MON.btc;h+='<div class="vam-card"><h3>BTC market direction (4h)</h3>'+(b?'<div class="row"><span class="bd '+(b.state==='Bullish'?'good':b.state==='Bearish'?'bad':'warn')+'">'+b.state+'</span><span>BTC '+fmtP(b.price)+'</span><span class="'+cl(b.chg)+'">'+pctF(b.chg)+' over ~7d</span><span class="mu">price vs EMA'+b.fast+' '+fmtP(b.ef)+' · EMA'+b.slow+' '+fmtP(b.es)+'</span></div>':'<span class="mu">No BTC data yet.</span>')+'</div>';
  if(!D.coins.length)return h+empty('Add an entry to start monitoring that coin.');
  D.coins.forEach(function(c){var p=D.pos[c],m=MON.coins[c],pr=p.price,src=MON.src[c];
    h+='<div class="vam-card"><div class="row"><h3 class="sp" style="margin:0">'+esc(c)+' <span class="mu" style="text-transform:none">'+(src==='chart'?'\u00b7 from Marketplusview chart':src==='public'?'\u00b7 public data':src==='none'?'\u00b7 no data':'')+'</span></h3><button class="sm" data-act="chart" data-coin="'+esc(c)+'">Open chart</button></div>';
    h+='<div class="vam-tw"><table><tr><th>Entry</th><th>Price</th><th>Now vs entry</th></tr>'+p.lots.slice().sort(function(a,b){return b.eff-a.eff}).map(function(l){var d=pr?(pr/l.eff-1)*100:null;return'<tr><td>'+esc(String(l.date).slice(0,10))+'</td><td>'+fmtP(l.eff)+'</td><td class="'+cl(d)+'">'+pctF(d)+'</td></tr>'}).join('')+'<tr><td><b>Average</b></td><td>'+fmtP(p.avg)+'</td><td class="'+cl(p.vsAvg)+'">'+pctF(p.vsAvg)+'</td></tr></table></div>';
    if(!m)h+='<div class="mu" style="margin-top:8px">Market analysis unavailable (needs 60+ candles of public data).</div>';
    else{h+='<div class="vam-grid" style="margin-top:10px">'
      +kpi('Swing high',fmtP(m.swingHigh),pr&&m.swingHigh?pctF((pr/m.swingHigh-1)*100)+' from it':'')+kpi('Swing low',fmtP(m.swingLow),m.belowSwingLow?'<span class="dn">price is below it</span>':(pr&&m.swingLow?pctF((pr/m.swingLow-1)*100)+' above':''))
      +kpi('Recovery from local low',pctF(m.recovery),'low '+fmtP(m.ll)+' \u00b7 high '+fmtP(m.hh),m.recovery>0?'up':'')
      +kpi('Volatility (ATR)',m.atrPct.toFixed(2)+'%',m.volState+(m.volRatio?' \u00b7 '+m.volRatio.toFixed(1)+'x norm':''),m.volState==='Elevated'?'am':'')
      +kpi('Volume',m.volumeRatio?m.volumeRatio.toFixed(2)+'x':'—','last 24 bars vs prior',m.volumeRatio>=1.8?'am':'')
      +kpi('Range / consolidation',m.cons?'Consolidating':'Not in a range',fmtP(m.rangeLow)+' – '+fmtP(m.rangeHigh)+' ('+m.rangePct.toFixed(1)+'%)',m.cons?'up':'')+'</div>';
      var hl=[{y:p.avg,c:'#2962ff'},{y:p.lowEntry,c:'#ff5d7a'}];if(m.swingLow)hl.push({y:m.swingLow,c:'#f5a623'});
      h+='<div style="margin-top:10px">'+svgLine([{pts:m.tail.map(function(v,i){return[i,v]}),color:'#e6e9f2',w:1.4}],{h:110,hlines:hl})+'<div class="vam-s">Last '+m.tail.length+' closes · blue = your average · red = lowest entry · amber = swing low</div></div>'}
    h+='</div>'});
  return h+'<div class="vam-card"><h3>Conditions flagged</h3>'+(ALERTS.length?ALERTS.map(function(a){return'<div class="al '+a.lvl+'">'+esc(a.text)+'</div>'}).join(''):'<span class="mu">None right now.</span>')+'</div>'}

/* ---------- simulator ---------- */
var SCEN=[-5,-10,-20,-30,-50];
function scen(D,scope,s,buyAmt){var cf=S.settings,sf=D.sf,cash=D.cash,rows=[],mv=0,cost=0;
  D.coins.forEach(function(c){var p=D.pos[c],pr=p.price;if(!pr){mv+=p.cost;cost+=p.cost;return}
    var apply=scope==='ALL'||scope===c,np=apply?pr*(1+s):pr,q=p.qty,cst=p.cost,amt=p.amt;
    if(scope===c&&buyAmt>0){var fee=buyAmt*cf.feePct/100;q+=buyAmt/np;cst+=buyAmt+fee;amt+=buyAmt;cash-=buyAmt+fee}
    var avgC=cst/q;rows.push({coin:c,price:np,cur:pr,qty:q,cost:cst,avg:amt/q,be:avgC/(1-sf),need:(avgC/(1-sf)/np-1)*100,value:q*np,unreal:q*np-cst,apply:apply});mv+=q*np;cost+=cst});
  return{rows:rows,cash:cash,mv:mv,cost:cost,pv:cash+mv,unreal:mv-cost,exposure:(cost+cash)>0?cost/(cost+cash)*100:0}}
function tSim(){var D=DD(),cf=S.settings;if(!D.coins.length)return empty('Add an entry to simulate price changes on it.');
  if(UI.sim.scope!=='ALL'&&D.coins.indexOf(UI.sim.scope)<0)UI.sim.scope='ALL';
  var chips=SCEN.map(function(s){return'<button class="sm'+(UI.sim.sel===s?' on':'')+'" data-act="simsel" data-v="'+s+'">'+s+'%</button>'}).join('');
  var h='<div class="vam-card"><h3>Recovery simulator</h3><div class="ff c4">'+fld('Apply the move to','scope',UI.sim.scope,{type:'select',live:'sim',opts:[['ALL','All holdings']].concat(D.coins.map(function(c){return[c,c+' only']}))})
   +fld('Custom change %','custom',UI.sim.custom,{type:'number',live:'sim',ph:'e.g. -35'})+fld('Extra buy at that price ('+esc(cur$())+')','buy',UI.sim.buy||'',{type:'number',live:'sim',ph:UI.sim.scope==='ALL'?'pick one coin':'optional'})+'</div><div class="row" style="margin-top:10px">'+chips+'</div>'
   +'<div class="vam-s">Changes are applied to today\u2019s price. An extra buy (single-coin scope only) is simulated at the scenario price. Nothing is recorded.</div></div><div id="vam-sim-out">'+simOut()+'</div>';return h}
function simSel(){var c=num(UI.sim.custom,NaN);return isFinite(c)&&UI.sim.custom!==''?c:UI.sim.sel}
function simOut(){var D=DD(),cf=S.settings,sel=simSel(),buy=UI.sim.scope==='ALL'?0:Math.max(0,num(UI.sim.buy)),now=scen(D,UI.sim.scope,0,0);
  var list=SCEN.slice();if(list.indexOf(sel)<0)list.push(sel);list.sort(function(a,b){return a-b});
  var h='<div class="vam-card"><h3>Scenarios (vs today)</h3><div class="vam-tw"><table><tr><th>Price change</th><th>Portfolio value</th><th>Unrealized P/L</th><th>Of open cost</th><th>Cash left</th><th>Exposure</th></tr>';
  var s0=scen(D,UI.sim.scope,0,0);h+='<tr><td>Today</td><td>'+money(s0.pv)+'</td><td>'+pl(s0.unreal)+'</td><td class="'+cl(s0.unreal)+'">'+pctF(s0.cost>0?s0.unreal/s0.cost*100:0)+'</td><td>'+money(s0.cash)+'</td><td>'+s0.exposure.toFixed(1)+'%</td></tr>';
  list.forEach(function(s){var r=scen(D,UI.sim.scope,s/100,buy);h+='<tr'+(s===sel?' style="background:var(--b2)"':'')+'><td><b>'+s+'%</b></td><td>'+money(r.pv)+'</td><td>'+pl(r.unreal)+'</td><td class="'+cl(r.unreal)+'">'+pctF(r.cost>0?r.unreal/r.cost*100:0)+'</td><td class="'+(r.cash<cf.minReserve?'dn':'')+'">'+money(r.cash)+'</td><td>'+r.exposure.toFixed(1)+'%</td></tr>'});
  h+='</table></div></div>';
  var r=scen(D,UI.sim.scope,sel/100,buy);if(r.cash<cf.minReserve)h+='<div class="al bad">At '+sel+'%'+(buy?' with the extra buy':'')+' cash would be '+money(r.cash)+', below your reserve of '+money(cf.minReserve)+'.</div>';
  h+='<div class="vam-card"><h3>Selected scenario: '+sel+'% — per coin</h3><div class="vam-tw"><table><tr><th>Coin</th><th>Price</th><th>Qty</th><th>Average entry</th><th>Break-even price</th><th>Rise needed</th><th>Unrealized</th></tr>';
  r.rows.forEach(function(x){h+='<tr><td><b>'+esc(x.coin)+'</b></td><td>'+fmtP(x.price)+'</td><td>'+fmtQ(x.qty)+'</td><td>'+fmtP(x.avg)+'</td><td>'+fmtP(x.be)+'</td><td class="'+(x.need>0?'am':'up')+'">'+pctF(x.need)+'</td><td>'+pl(x.unreal,x.cost>0?x.unreal/x.cost*100:null)+'</td></tr>'});
  h+='</table></div><div class="vam-s">Rise needed = how far the price must climb from the scenario price to cover cost and estimated sell fees. A 50% fall needs a 100% rise to recover.</div></div>';
  var cols=[];[10,25,50,100].forEach(function(q){cols.push({t:'+'+q+'% from there',f:function(x){return x.price*(1+q/100)}})});cols.push({t:'Break-even',f:function(x){return x.be}});cf.targets.forEach(function(t){cols.push({t:'Avg +'+t+'%',f:function(x){return x.avg*(1+t/100)}})});
  h+='<div class="vam-card"><h3>Outcome at different recovery levels</h3><div class="vam-tw"><table><tr><th></th>'+cols.map(function(c){return'<th>'+c.t+'</th>'}).join('')+'</tr><tr><td>Net P/L</td>';
  var vals=cols.map(function(c){var pr=0,cs=0;r.rows.forEach(function(x){pr+=x.qty*c.f(x)*(1-D.sf);cs+=x.cost});return{pl:pr-cs,pv:r.cash+pr,cs:cs}});
  h+=vals.map(function(v){return'<td>'+pl(v.pl,v.cs>0?v.pl/v.cs*100:null)+'</td>'}).join('')+'</tr><tr><td>Portfolio value</td>'+vals.map(function(v){return'<td>'+money(v.pv)+'</td>'}).join('')+'</tr></table></div><div class="vam-s">Net of estimated sell fees ('+cf.feePct+'%). Coins outside the chosen scope stay at today\u2019s price. Recovery is a what-if, not a forecast — prices may not recover.</div></div>';
  return h}
LIVE_H.sim=function(){var el=BODY.querySelector('[name=scope]');if(!el)return;UI.sim.scope=el.value;UI.sim.custom=BODY.querySelector('[name=custom]').value;UI.sim.buy=BODY.querySelector('[name=buy]').value;var o=BODY.querySelector('#vam-sim-out');if(o)o.innerHTML=simOut()};
LIVE_H.avg=function(){syncAvg();var o=BODY.querySelector('#vam-avg-out');if(o)o.innerHTML=avgOut()};

/* ---------- risk controls & settings ---------- */
function tRisk(){var cf=S.settings,w=[];
  if(cf.maxPerBuy>0&&cf.perEntry>cf.maxPerBuy)w.push('Amount per entry is above the maximum per buy.');if(cf.minReserve>=cf.startingCapital&&cf.startingCapital>0)w.push('Minimum reserve is not below your starting capital, so no buy can pass the reserve rule.');
  var h=w.length?w.map(function(x){return'<div class="al warn">'+x+'</div>'}).join(''):'';
  var set=function(l,n,o){return fld(l,n,cf[n],Object.assign({type:'number',attrs:'data-set="'+n+'"'},o||{}))};
  h+='<div class="vam-card"><h3>Capital</h3><div class="ff c4">'+fld('Currency','currency',cf.currency,{attrs:'data-set="currency" maxlength="8"'})+set('Starting capital','startingCapital')+set('Amount per entry','perEntry')+set('Estimated fee % per trade','feePct')+'</div>'
    +'<div class="row" style="margin-top:10px"><button data-act="adjust">Deposit / withdraw capital</button><span class="mu">Adjustments: '+money(sum(S.adjust,'amount'),true)+'</span></div></div>';
  h+='<div class="vam-card"><h3>Risk controls</h3><div class="ff c4">'+set('Maximum entries (0 = off)','maxEntries')+set('Minimum cash reserve','minReserve')+set('Max portfolio exposure % (0 = off)','maxExposurePct')+set('Max amount per buy (0 = off)','maxPerBuy')+set('Drawdown alert % below avg entry (0 = off)','drawdownAlertPct')+set('Stop adding when down % (0 = off)','stopAddDrawdownPct')+set('Min gap % between entries (0 = off)','minGapPct')+set('Recovery alert % from local low','recoveryAlertPct')+'</div>'
    +'<div class="row" style="margin-top:10px">'+fld('Stop-adding warning unless a consolidation range is detected','requireConsolidation',cf.requireConsolidation,{type:'checkbox',attrs:'data-set="requireConsolidation"'})+fld('Stop-adding warning while BTC direction reads bearish','stopOnBtcBearish',cf.stopOnBtcBearish,{type:'checkbox',attrs:'data-set="stopOnBtcBearish"'})+'</div>'
    +'<div class="vam-s">Rules warn you before an entry is recorded; they never place or block trades. You stay in control.</div></div>';
  h+='<div class="vam-card"><h3>Targets & market data</h3><div class="ff c4">'+fld('Targets are','targetsNetOfFees',cf.targetsNetOfFees?'1':'0',{type:'select',opts:[['1','Net profit after fees'],['0','Price move before fees']],attrs:'data-set="targetsNetOfFees"'})+fld('Quote asset for prices','quote',cf.quote,{attrs:'data-set="quote" maxlength="8"'})+'</div></div>';
  var pk=Object.keys(S.prices);h+='<div class="vam-card"><h3>Manual price override</h3><div class="vam-s" style="margin-bottom:8px">Use for a coin with no public price. A manual price wins over live data until removed.</div><div class="row">'+pk.map(function(k){return'<span class="chip">'+esc(k)+' '+fmtP(S.prices[k])+'<button class="sm" style="padding:0 5px;border:0" data-act="delprice" data-v="'+esc(k)+'">\u00d7</button></span>'}).join('')+'</div><div class="row" style="margin-top:8px"><input id="vam-mc" placeholder="Coin" style="width:100px"><input id="vam-mp" type="number" step="any" placeholder="Price" style="width:130px"><button class="sm" data-act="addprice">Set</button></div></div>';
  h+='<div class="vam-card"><h3>Your data</h3><div class="row"><button data-act="export">Export backup (JSON)</button><button data-act="import">Import backup</button><button class="dng" data-act="reset">Erase everything</button></div><div class="vam-s">Everything is stored only in this browser. No exchange API keys are used or requested; if you ever add API access, use read-only keys with withdrawals disabled.</div></div>';return h}
function setSetting(el){var n=el.getAttribute('data-set'),cf=S.settings,v;
  if(el.type==='checkbox')v=el.checked;else if(n==='currency'||n==='quote')v=String(el.value||'').toUpperCase().trim()||cf[n];else if(n==='targetsNetOfFees')v=el.value==='1';else{v=num(el.value,cf[n]);if(v<0)v=0;}
  cf[n]=v;save();if(n==='quote'){cache={};LIVE={}}if(n==="startingCapital"||n==="currency"||n==="perEntry"||n==="maxPerBuy"||n==="minReserve")render();if(n==='quote')refreshPrices().then(runMonitor).then(softRender)}

/* ---------- history ---------- */
function histRows(){var H=UI.hist,rows=timeline(S);return rows.filter(function(r){if(H.coin&&r.coin!==H.coin)return false;if(H.type&&r.type!==H.type)return false;var d=String(r.date).slice(0,10);if(H.from&&d<H.from)return false;if(H.to&&d>H.to)return false;return true})}
function tHist(){var all=timeline(S),coins={};S.lots.forEach(function(l){coins[l.coin]=1});var H=UI.hist;
  var h='<div class="vam-card"><div class="ff c4">'+fld('Coin','coin',H.coin,{type:'select',attrs:'data-hf="coin"',opts:[['','All coins']].concat(Object.keys(coins).sort())})+fld('Type','type',H.type,{type:'select',attrs:'data-hf="type"',opts:[['','All'],'Buy','Sell','Deposit','Withdrawal']})+fld('From','from',H.from,{type:'date',attrs:'data-hf="from"'})+fld('To','to',H.to,{type:'date',attrs:'data-hf="to"'})+'</div></div>';
  var R=histRows(),buys=R.filter(function(r){return r.type==='Buy'}),sells=R.filter(function(r){return r.type==='Sell'});
  h+='<div class="vam-grid g6">'+kpi('Bought',money(sum(buys,'amount')),buys.length+' buy(s)')+kpi('Sold',money(sum(sells,'amount')),sells.length+' sell(s)')+kpi('Fees paid',money(sum(R,'fee')))+kpi('Realized profit',money(sum(sells,'realized'),true),'in this filter',cl(sum(sells,'realized')))+'</div>';
  if(all.length>1){var t0=0,pts=function(f){return all.map(function(r,i){return[i,f(r)]})};
    h+='<div class="vam-grid vam-g2"><div class="vam-card"><h3>Capital allocation over time</h3>'+svgLine([{pts:pts(function(r){return r.cash+r.invested}),color:'#2962ff',fill:true,w:1.2},{pts:pts(function(r){return r.invested}),color:'#2dd4a7',fill:true}],{h:140})+'<div class="vam-s"><span class="up">\u25a0</span> invested at cost \u00b7 <span style="color:#2962ff">\u25a0</span> total (invested + cash)</div></div>'
     +'<div class="vam-card"><h3>Cumulative realized profit</h3>'+svgLine([{pts:pts(function(r){return r.cumReal}),color:'#f5a623'}],{h:140,zero:true})+'</div></div>'}
  h+='<div class="vam-card"><div class="row"><h3 class="sp" style="margin:0">Transactions</h3><button class="sm" data-act="csv">Export CSV</button></div>';
  if(!R.length)h+='<p class="mu">No transactions match.</p>';
  else{h+='<div class="vam-tw"><table><tr><th>Date</th><th>Type</th><th>Coin</th><th>Price</th><th>Qty</th><th>Amount</th><th>Fee</th><th>Realized</th><th>Avg entry after</th><th>Cash after</th><th>Invested after</th></tr>';
    R.slice().reverse().forEach(function(r){h+='<tr><td>'+esc(String(r.date).replace('T',' '))+'</td><td class="'+(r.type==='Buy'||r.type==='Deposit'?'':r.type==='Sell'?'':'')+'"><b>'+r.type+'</b></td><td>'+esc(r.coin||'')+'</td><td>'+(r.price!=null?fmtP(r.price):'')+'</td><td>'+(r.qty!=null?fmtQ(r.qty):'')+'</td><td>'+money(r.amount)+'</td><td>'+(r.fee!=null?money(r.fee):'')+'</td><td>'+(r.realized!=null?pl(r.realized):'')+'</td><td>'+(r.avgAfter?fmtP(r.avgAfter):'')+'</td><td>'+money(r.cash)+'</td><td>'+money(r.invested)+'</td></tr>'});h+='</table></div>'}
  return h+'</div>'}

/* ============================== render / events ============================== */
var RENDER={dash:tDash,entries:tEntries,targets:tTargets,avg:tAvg,mon:tMon,sim:tSim,risk:tRisk,hist:tHist};
function render(){if(!BODY)return;var st=BODY.scrollTop;TABSEL.innerHTML=TABS.map(function(t){return'<button class="vam-tab'+(t[0]===cur?' on':'')+'" data-act="go" data-tab="'+t[0]+'">'+t[1]+'</button>'}).join('');
  try{BODY.innerHTML='<div class="vam-wrap"><div class="vam-disc">Portfolio and strategy calculator for spot crypto. Trades are recorded manually. Not financial advice: nothing here predicts prices, guarantees returns, or says averaging down is safe.</div>'+RENDER[cur]()+'</div>'}catch(e){console.error('vam render',e);BODY.innerHTML='<div class="vam-wrap"><div class="al bad">Something went wrong drawing this tab: '+esc(e.message)+'</div></div>'}BODY.scrollTop=st}
function softRender(){if(!ROOT||!ROOT.classList.contains('on'))return;if(MODAL)return;var a=document.activeElement;if(a&&BODY.contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))return;render()}
function download(name,text,type){var b=new Blob([text],{type:type||'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){a.remove();URL.revokeObjectURL(a.href)},500)}
function csvCell(v){v=v==null?'':String(v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
var ACT={
  go:function(el){cur=el.getAttribute('data-tab');render();if(cur==='mon')runMonitor().then(softRender)},closemod:closeModal,
  addentry:function(){openEntry()},editentry:function(el){openEntry(el.getAttribute('data-id'))},
  delentry:function(el){var id=el.getAttribute('data-id'),L=DD().lotMap[id];if(!L)return;if(!confirm('Delete this '+L.coin+' entry'+(L.sold>0?' and the part of any exits that sold from it':'')+'?'))return;
    S.lots=S.lots.filter(function(x){return x.id!==id});S.exits.forEach(function(e){e.alloc=e.alloc.filter(function(a){return a.lot!==id})});S.exits=S.exits.filter(function(e){return e.alloc.length});save();render()},
  sell:function(el){openExit({coin:el.getAttribute('data-coin'),lotId:el.getAttribute('data-id'),price:num(el.getAttribute('data-price'))||null,pct:el.getAttribute('data-pct')||''})},
  delexit:function(el){if(!confirm('Delete this exit? The coins return to your open entries and the realized profit is removed.'))return;var id=el.getAttribute('data-id');S.exits=S.exits.filter(function(e){return e.id!==id});save();render()},
  addtarget:function(){var v=num(BODY.querySelector('#vam-nt').value);if(!(v>0))return;if(S.settings.targets.indexOf(v)<0)S.settings.targets.push(v);S.settings.targets.sort(function(a,b){return a-b});save();render()},
  deltarget:function(el){var v=+el.getAttribute('data-v');S.settings.targets=S.settings.targets.filter(function(t){return t!==v});save();render()},
  avgadd:function(){syncAvg();UI.avg.buys.push({price:priceOf(UI.avg.coin)||'',amount:S.settings.perEntry,fee:''});render()},
  avgdel:function(el){syncAvg();UI.avg.buys.splice(+el.getAttribute('data-i'),1);render()},
  avgq:function(el){syncAvg();var i=+el.getAttribute('data-i'),p=priceOf(UI.avg.coin);if(p)UI.avg.buys[i].price=+(p*parseFloat(el.getAttribute('data-f'))).toPrecision(8);render()},
  avgrec:function(){syncAvg();var D=DD(),c=UI.avg.coin,sm=simulate(D,S,c,avgBuys(),priceOf(c),ctxFor(c));if(!sm.after.n)return;var bad=sm.warn.filter(function(w){return w.lvl==='bad'});
    if(!confirm((bad.length?'Rule warnings:\n\n\u2022 '+bad.map(function(w){return w.msg}).join('\n\u2022 ')+'\n\n':'')+'Record '+sm.after.n+' buy(s) of '+c+' that you have ALREADY made on your exchange?'))return;
    sm.after.valid.forEach(function(v,i){S.lots.push({id:uid(),coin:c,price:v.price,amount:v.amount,fee:v.fee,date:nowLocal(),qty:v.amount/v.price,note:'via Average-Down'})});UI.avg.coin=null;save();cur='entries';render()},
  simsel:function(el){UI.sim.sel=+el.getAttribute('data-v');UI.sim.custom='';render()},
  refresh:function(){cache={};MON.time=0;render();Promise.all([refreshPrices(),runMonitor()]).then(softRender)},
  chart:function(el){var c=el.getAttribute('data-coin');try{if(CFG.openChart)CFG.openChart(c);else if(typeof root.__vamOpenChart==='function'){root.__vamOpenChart(c);close()}document.dispatchEvent(new CustomEvent('mpv:open-chart',{detail:{symbol:c+(S.settings.quote||'USDT'),coin:c}}))}catch(e){}},
  adjust:function(){modal('Deposit / withdraw capital','<form class="ff" data-form="adjust">'+fld('Amount ('+esc(cur$())+') — negative to withdraw','amount','',{type:'number',attrs:'required'})+fld('Date & time','date',nowLocal(),{type:'datetime-local'})+fld('Note','note','',{cls:'full'})+'<div class="full row"><span class="sp"></span><button type="button" data-act="closemod">Cancel</button><button class="pri" type="submit">Save</button></div></form>')},
  addprice:function(){var c=normCoin(BODY.querySelector('#vam-mc').value),p=num(BODY.querySelector('#vam-mp').value);if(c&&p>0){S.prices[c]=p;save();render()}},
  delprice:function(el){delete S.prices[el.getAttribute('data-v')];save();render()},
  export:function(){download('vam-backup-'+nowLocal().slice(0,10)+'.json',JSON.stringify(S,null,1),'application/json')},
  import:function(){var i=document.createElement('input');i.type='file';i.accept='.json,application/json';i.onchange=function(){var f=i.files[0];if(!f)return;var r=new FileReader();r.onload=function(){try{var o=JSON.parse(r.result);if(!o||!Array.isArray(o.lots)||!o.settings)throw 0;if(!confirm('Replace everything in this tool with the backup?'))return;S=Object.assign(defState(),o);S.settings=Object.assign(defState().settings,o.settings);save();render()}catch(e){alert('That file is not a VAM backup.')}};r.readAsText(f)};i.click()},
  reset:function(){if(confirm('Erase all entries, exits and settings in this tool? This cannot be undone.')&&confirm('Really erase everything?')){S=defState();save();UI.coin=null;UI.avg.coin=null;render()}},
  csv:function(){var R=histRows(),cols=['date','type','coin','price','qty','amount','fee','realized','avgAfter','cash','invested','note'];download('vam-transactions.csv',cols.join(',')+'\n'+R.map(function(r){return cols.map(function(c){return csvCell(r[c])}).join(',')}).join('\n'),'text/csv')}};
var SEL={coin:function(v){UI.coin=v;render()},avgcoin:function(v){UI.coin=v;UI.avg.coin=null;render()},showclosed:function(v,el){UI.showClosed=el.checked;render()},interval:function(v){S.settings.interval=v;save();MON.time=0;render();runMonitor().then(softRender)}};
function onClick(e){var t=e.target.closest('[data-act]');if(!t)return;var f=ACT[t.getAttribute('data-act')];if(f){e.preventDefault();f(t,e)}}
function onInput(e){var t=e.target,l=t.getAttribute&&t.getAttribute('data-live');if(l&&LIVE_H[l])LIVE_H[l](MODAL&&MODAL.contains(t)?MODAL:null)}
function onChange(e){var t=e.target,c=t.getAttribute&&t.getAttribute('data-change');if(c&&SEL[c])return SEL[c](t.value,t);if(t.hasAttribute&&t.hasAttribute('data-set'))return setSetting(t);var hf=t.getAttribute&&t.getAttribute('data-hf');if(hf){UI.hist[hf]=t.value;render()}}
function onSubmit(e){var fm=e.target.getAttribute&&e.target.getAttribute('data-form');if(!fm)return;e.preventDefault();var f=formVals(e.target);
  if(fm==='entry')submitEntry(f);else if(fm==='exit')submitExit(f);else if(fm==='adjust'){var a=num(f.amount);if(!a)return;S.adjust.push({id:uid(),amount:a,date:f.date||nowLocal(),note:f.note||''});save();closeModal();render()}}

/* ============================== open / close / boot ============================== */
var timers=[];
function build(){if(ROOT)return;injectCss();ROOT=document.createElement('div');ROOT.className='vam';ROOT.setAttribute('role','dialog');ROOT.setAttribute('aria-label','Volatility Accumulation Manager');
  ROOT.innerHTML='<div class="vam-hd"><h2>Volatility Accumulation Manager<small>Marketplusview \u00b7 portfolio &amp; strategy calculator \u00b7 not financial advice</small></h2><button class="vam-x" data-act="close" aria-label="Close">\u00d7</button></div><div class="vam-tabs"></div><div class="vam-body"></div>';
  document.body.appendChild(ROOT);TABSEL=ROOT.querySelector('.vam-tabs');BODY=ROOT.querySelector('.vam-body');ACT.close=close;
  [ROOT,document].forEach(function(n,i){if(i===0){n.addEventListener('click',onClick);n.addEventListener('input',onInput);n.addEventListener('change',onChange);n.addEventListener('submit',onSubmit)}});
  document.addEventListener('click',function(e){if(MODAL&&MODAL.contains(e.target))onClick(e)});document.addEventListener('input',function(e){if(MODAL&&MODAL.contains(e.target))onInput(e)});document.addEventListener('submit',function(e){if(MODAL&&MODAL.contains(e.target))onSubmit(e)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ROOT.classList.contains('on')){if(MODAL)closeModal();else close()}})}
function open(tab){build();if(tab&&RENDER[tab])cur=tab;ROOT.classList.add('on');render();try{if(location.hash!=='#vam')history.replaceState(null,'',location.pathname+location.search+'#vam')}catch(e){}
  refreshPrices().then(function(){return runMonitor()}).then(softRender).catch(function(){});
  clearTimers();timers.push(setInterval(function(){refreshPrices().then(softRender)},CFG.pollMs),setInterval(function(){runMonitor().then(softRender)},CFG.monitorMs))}
function clearTimers(){timers.forEach(clearInterval);timers=[]}
function close(){if(!ROOT)return;closeModal();ROOT.classList.remove('on');clearTimers();try{if(location.hash==='#vam')history.replaceState(null,'',location.pathname+location.search)}catch(e){}}
function toggle(){ROOT&&ROOT.classList.contains('on')?close():open()}
function boot(){
  document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-open-vam]');if(t){e.preventDefault();open(t.getAttribute('data-open-vam')||undefined)}});
  root.addEventListener('hashchange',function(){if(location.hash==='#vam')open();else if(ROOT&&ROOT.classList.contains('on'))close()});
  var nav=CFG.navSelector&&document.querySelector(CFG.navSelector);if(nav&&!nav.querySelector('[data-open-vam]')){var ref=nav.firstElementChild,b=document.createElement(ref?ref.tagName:'button');if(ref)b.className=ref.className;b.setAttribute('data-open-vam','');b.textContent=CFG.navLabel;if(b.tagName==='A')b.href='#vam';nav.appendChild(b)}
  setTimeout(function(){if(CFG.fallbackButton&&!document.querySelector('[data-open-vam]')){var f=document.createElement('button');f.className='vam-fab';f.setAttribute('data-open-vam','');f.textContent='Accumulation Manager';injectCss();document.body.appendChild(f)}},1200);
  if(location.hash==='#vam')open()}
Object.assign(root.MPV_VAM,{open:open,close:close,toggle:toggle,refresh:function(){return Promise.all([refreshPrices(),runMonitor()]).then(softRender)},getState:function(){return JSON.parse(JSON.stringify(S))},config:CFG});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
}catch(err){console.error('vam tool failed',err);root.__vamErr=err}
})(typeof window!=='undefined'?window:globalThis);
