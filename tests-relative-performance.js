const fs=require('fs'), vm=require('vm'), assert=require('assert');
vm.runInThisContext(fs.readFileSync(__dirname+'/tools-9.js','utf8'));
const C=globalThis.mpRP.core; let pass=0; const T=async(n,f)=>{ try{ await f(); pass++; console.log('  ok  ',n);}catch(e){ console.log('  FAIL',n,'\n',e.stack); process.exitCode=1; } };
const H=3600, t0=1700000000-1700000000%H;
const kl=(t,c,x=1)=>[t*1000,c,c,c,c,10,(t+H)*1000-1];
const mk=(key,arr,err)=>({key,rows:(()=>{const m=new Map(); C.mergeKlines(m,arr,Date.now()); return m;})(),err:err||null});
(async()=>{
await T('normalize pct/idx exact',()=>{ assert.strictEqual(C.normalize('pct',100,100),0); assert.strictEqual(C.normalize('idx',100,100),100); assert.ok(Math.abs(C.normalize('pct',150,100)-50)<1e-12); assert.ok(Math.abs(C.normalize('idx',150,100)-150)<1e-12); assert.ok(Math.abs(C.normalize('pct',50,200)+75)<1e-12); assert.strictEqual(C.normalize('pct',0,100),null); assert.strictEqual(C.normalize('pct',100,0),null); assert.strictEqual(C.normalize('pct',NaN,1),null); });
await T('all assets start at 0 / 100 at the same base candle',()=>{
  const A=mk('S:A',[0,1,2,3].map(i=>kl(t0+i*H,100+i*10))), B=mk('S:B',[0,1,2,3].map(i=>kl(t0+i*H,2000-i*100)));
  for(const [m,b] of [['pct',0],['idx',100]]){ const r=C.compute([A,B],t0,m); assert.strictEqual(r.baseT,t0); assert.strictEqual(r.res['S:A'].points[0].value,b); assert.strictEqual(r.res['S:B'].points[0].value,b); }
  const r=C.compute([A,B],t0,'pct'); assert.ok(Math.abs(r.res['S:A'].points[3].value-30)<1e-9); assert.ok(Math.abs(r.res['S:B'].points[3].value+15)<1e-9); });
await T('late-listed asset is flagged, NOT drawn, nothing invented',()=>{
  const A=mk('S:A',[0,1,2,3].map(i=>kl(t0+i*H,100))), L=mk('S:NEW',[2,3].map(i=>kl(t0+i*H,5)));
  const r=C.compute([A,L],t0,'pct'); assert.strictEqual(r.res['S:NEW'].ok,false); assert.match(r.res['S:NEW'].reason,/Not enough history/); assert.strictEqual(r.res['S:NEW'].points.length,0); });
await T('base later than listing: late asset becomes valid and starts at 0',()=>{
  const A=mk('S:A',[0,1,2,3].map(i=>kl(t0+i*H,100))), L=mk('S:NEW',[2,3].map(i=>kl(t0+i*H,5+i)));
  const r=C.compute([A,L],t0+2*H,'pct'); assert.strictEqual(r.res['S:NEW'].ok,true); assert.strictEqual(r.res['S:NEW'].points[0].value,0); assert.strictEqual(r.baseT,t0+2*H); });
await T('missing candle is a gap, never forward-filled',()=>{
  const A=mk('S:A',[0,1,2,3].map(i=>kl(t0+i*H,100+i))), B=mk('S:B',[0,2,3].map(i=>kl(t0+i*H,50+i)));
  const r=C.compute([A,B],t0,'pct'); const p=r.res['S:B'].points; assert.strictEqual(p.length,4); assert.ok(!('value' in p[1])); assert.ok('value' in p[2]); assert.strictEqual(r.res['S:B'].vals.has(t0+H),false); });
await T('gap AT the base time -> asset flagged (data gap), not rebased silently',()=>{
  const A=mk('S:A',[0,1,2].map(i=>kl(t0+i*H,100))), B=mk('S:B',[1,2].map(i=>kl(t0+i*H,50)));
  const r=C.compute([A,B],t0,'pct'); assert.strictEqual(r.res['S:B'].ok,false); });
await T('base time resolves to primary asset\'s first candle >= requested',()=>{
  const A=mk('S:A',[1,2,3].map(i=>kl(t0+i*H,100))), B=mk('S:B',[0,1,2,3].map(i=>kl(t0+i*H,10)));
  assert.strictEqual(C.compute([A,B],t0,'pct').baseT,t0+H); assert.strictEqual(C.compute([B,A],t0,'pct').baseT,t0); assert.strictEqual(C.compute([A,B],t0+90*60,'pct').baseT,t0+2*H); });
await T('errored asset excluded; empty input safe',()=>{ const A=mk('S:A',[kl(t0,1)]), E=mk('S:E',[],'Symbol not found'); const r=C.compute([A,E],t0,'pct'); assert.strictEqual(r.res['S:E'].ok,false); assert.strictEqual(C.compute([E],t0,'pct').baseT,null); });
await T('duplicate candles impossible; forming candle overwrites in place',()=>{
  const m=new Map(); C.mergeKlines(m,[kl(t0,10),kl(t0,11),kl(t0+H,12)],Date.now()); assert.strictEqual(m.size,2); assert.strictEqual(m.get(t0).c,11);
  const r=C.mergeKlines(m,[[1,0,0,0,0,0,2],[1,'x','x','x','NaN',0,2],null],Date.now()); assert.strictEqual(r.bad,3); assert.strictEqual(m.size,2); });
await T('historical and live use the same normalization (tick == recomputed history)',()=>{
  const A=mk('S:A',[0,1,2].map(i=>kl(t0+i*H,100+i)));
  const before=C.compute([A],t0,'pct'); const start=before.res['S:A'].start;
  A.rows.set(t0+2*H,{o:1,h:1,l:1,c:137.5,v:1,x:false}); // live tick
  const after=C.compute([A],t0,'pct'); assert.strictEqual(after.res['S:A'].last.value,C.normalize('pct',137.5,start)); assert.strictEqual(after.res['S:A'].last.x,false); });
await T('switching assets leaves no stale data (compute only sees given assets)',()=>{
  const A=mk('S:A',[kl(t0,1),kl(t0+H,2)]), B=mk('S:B',[kl(t0,1),kl(t0+H,3)]); const r=C.compute([A],t0,'pct'); assert.ok(!r.res['S:B']); assert.strictEqual(r.times.length,2); });
await T('fetchKlines paginates >1000 rows and keeps order',async()=>{
  const calls=[]; const d={API:'A',FAPI:'F',json:async u=>{ calls.push(u); const s=Math.ceil(+/startTime=(\d+)/.exec(u)[1]/1000); const n=Math.min(1000,Math.max(0,2500-s)); return Array.from({length:n},(_,i)=>kl(s+i,1)); }};
  const r=await C.fetchKlines(d,'F','BTCUSDT','1m',0,9e12,()=>true); assert.strictEqual(r.rows.length,2500); assert.strictEqual(calls.length,3); assert.ok(calls[0].startsWith('F/fapi/v1/klines')); const s=await C.fetchKlines(d,'S','BTCUSDT','1m',0,9e12,()=>true); assert.ok(calls[3].startsWith('A/api/v3/klines')); });
await T('Binance error object -> code preserved (-1121 invalid symbol)',async()=>{
  const d={API:'A',FAPI:'F',json:async()=>({code:-1121,msg:'Invalid symbol.'})}; try{ await C.fetchKlines(d,'S','XXX','1h',0,1,()=>true); assert.fail('no throw'); }catch(e){ assert.strictEqual(e.code,-1121); } });
await T('stale load (symbol/timeframe switched mid-flight) is aborted',async()=>{
  let alive=true; const d={API:'A',FAPI:'F',json:async()=>{ alive=false; return Array.from({length:1000},(_,i)=>kl(i,1)); }};
  try{ await C.fetchKlines(d,'S','BTCUSDT','1h',0,1,()=>alive); assert.fail('no throw'); }catch(e){ assert.strictEqual(e.message,'stale'); } });
await T('WebSocket: dedupe via Map, reconnect with backoff, backfill on every open, fut path fallback',async()=>{
  const sock=[], timers=[]; class FW{ constructor(u){ this.url=u; sock.push(this); this.closed=false;} close(){ this.closed=true; } }
  let now=1e6; const got=[], bf=[], st=[];
  const feed=C.createFeed({WS:FW,now:()=>now,setT:(f,ms)=>{ const t={f,ms}; timers.push(t); return t; },clearT:t=>{ t.dead=true; },
    url:(m,s,alt)=>(m==='F'?(alt?'f2/':'f1/'):'s/')+s, onKline:(k,x)=>got.push([k,x.c]), backfill:(k,m)=>bf.push([k,m]), onState:()=>st.push(feed.status())});
  feed.start([{key:'S:BTCUSDT',market:'S',symbol:'BTCUSDT'},{key:'F:ETHUSDT',market:'F',symbol:'ETHUSDT'}],'1h');
  assert.strictEqual(sock.length,2); assert.strictEqual(sock[0].url,'s/btcusdt@kline_1h'); assert.strictEqual(sock[1].url,'f1/ethusdt@kline_1h'); assert.strictEqual(feed.status(),'reconnecting');
  sock[0].onopen(); sock[1].onopen(); assert.strictEqual(feed.status(),'live'); assert.strictEqual(bf.length,2);
  sock[0].onmessage({data:JSON.stringify({data:{k:{s:'BTCUSDT',c:'5'}}})}); assert.deepStrictEqual(got[0],['S:BTCUSDT','5']);
  sock[0].onclose(); assert.strictEqual(feed.status(),'reconnecting'); const t1=timers.filter(t=>!t.dead&&t.ms===1000)[0]; assert.ok(t1); t1.f(); assert.strictEqual(sock.length,3);
  sock[2].onclose(); const t2=timers.filter(t=>!t.dead&&t.ms===2000)[0]; assert.ok(t2,'exponential backoff'); t2.f(); sock[3].onopen(); assert.strictEqual(bf.length,3,'backfill after reconnect'); assert.strictEqual(feed.status(),'live');
  now+=50000; const wd=timers.filter(t=>!t.dead&&t.ms===15000).pop(); wd.f(); assert.strictEqual(feed.status(),'reconnecting','watchdog drops silent socket');
  feed.stop(); assert.strictEqual(feed.status(),'off'); });
await T('futures path falls back to alternate URL after 3 failed connects',async()=>{
  const sock=[],timers=[]; class FW{ constructor(u){ this.url=u; sock.push(this);} close(){} }
  const feed=C.createFeed({WS:FW,now:()=>1,setT:(f,ms)=>{ const t={f,ms}; timers.push(t); return t; },clearT:()=>{},url:(m,s,alt)=>(alt?'legacy/':'market/')+s,onKline(){},backfill(){},onState(){}});
  feed.start([{key:'F:BTCUSDT',market:'F',symbol:'BTCUSDT'}],'1h');
  for(let i=0;i<3;i++){ sock[sock.length-1].onclose(); timers.filter(t=>!t.dead).pop().f(); }
  assert.ok(sock[sock.length-1].url.startsWith('legacy/')); feed.stop(); });
await T('all 15 timeframes mapped to valid Binance intervals',()=>{ assert.deepStrictEqual(C.TFS.map(x=>x[1]),['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M']); });
console.log(`\n${pass} tests passed`);
})();
