const fs=require('fs'), vm=require('vm'), assert=require('assert');
vm.runInThisContext(fs.readFileSync(__dirname+'/tools-10.js','utf8'));
const C=globalThis.mpSE.core; let pass=0;
const T=async(n,f)=>{ try{ await f(); pass++; console.log('  ok  ',n);}catch(e){ console.log('  FAIL',n,'\n',e.stack); process.exitCode=1; } };
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} !== ${b}`);
const H=3600, U=s=>Date.parse(s)/1000;
const K=(t,o,c,v=10,closeOff=H*1000-1)=>[t*1000,o,Math.max(o,c),Math.min(o,c),c,v,t*1000+closeOff];
const NOW=Date.parse('2026-11-01T12:00:00Z');
const rowsOf=arr=>{ const m=new Map(); C.mergeKlines(m,arr,NOW); return m; };
(async()=>{
await T('stats on a known sample: mean, median, sample sd, win/loss/flat',()=>{
  const s=C.stats([1,2,3,4].map(r=>({r,v:10}))); near(s.mean,2.5); near(s.median,2.5); near(s.sd,Math.sqrt(5/3)); assert.strictEqual(s.win,100); assert.strictEqual(s.n,4);
  const z=C.stats([-1,0,2].map(r=>({r,v:3}))); near(z.win,100/3); near(z.loss,100/3); near(z.flat,100/3); near(z.median,0); near(z.mean,1/3);
  const odd=C.stats([5,1,3].map(r=>({r,v:0}))); assert.strictEqual(odd.median,3); assert.strictEqual(C.stats([{r:2,v:1}]).sd,null); assert.strictEqual(C.stats([]),null); near(C.stats([{r:1,v:4},{r:2,v:8}]).avgVol,6); });
await T('weekday classification (0=Mon): 2026-10-26 Mon … 2026-11-01 Sun',()=>{
  ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01'].forEach((d,i)=>assert.strictEqual(C.parts(U(d+'T12:00:00Z'),'UTC').wd,i));
  assert.strictEqual(C.parts(U('2024-02-29T00:00:00Z'),'UTC').wd,3); });
await T('timezone conversion incl. DST (fixed known offsets)',()=>{
  const p=(iso,tz)=>{ const q=C.parts(U(iso),tz); return `${q.y}-${q.mo}-${q.d} ${q.h}:${q.mi} wd${q.wd}`; };
  assert.strictEqual(p('2026-11-01T03:00:00Z','Africa/Nairobi'),'2026-11-1 6:0 wd6');
  assert.strictEqual(p('2026-11-01T03:00:00Z','Asia/Kolkata'),'2026-11-1 8:30 wd6');
  assert.strictEqual(p('2026-11-01T23:30:00Z','Asia/Tokyo'),'2026-11-2 8:30 wd0');            // crosses midnight → next weekday
  assert.strictEqual(p('2026-11-01T05:30:00Z','America/New_York'),'2026-11-1 1:30 wd6');        // 01:30 EDT
  assert.strictEqual(p('2026-11-01T06:30:00Z','America/New_York'),'2026-11-1 1:30 wd6');        // 01:30 EST (repeated hour)
  assert.strictEqual(p('2026-03-08T06:59:00Z','America/New_York'),'2026-3-8 1:59 wd6');
  assert.strictEqual(p('2026-03-08T07:00:00Z','America/New_York'),'2026-3-8 3:0 wd6');          // 02:00 never exists
  assert.strictEqual(p('2026-07-01T12:00:00Z','Europe/London'),'2026-7-1 13:0 wd2'); assert.strictEqual(p('2026-01-01T12:00:00Z','Europe/London'),'2026-1-1 12:0 wd3'); });
await T('hour observations: exact open→close returns, same boundaries, ignores forming candle',()=>{
  const t0=U('2026-10-26T00:00:00Z'); // Monday
  const rows=rowsOf([K(t0,100,110),K(t0+H,110,99),K(t0+2*H,99,99),K(t0+3*H,100,101,10,H*1000-1+9e9)]); // last one still forming (close time in future)
  const o=C.hourObs(rows,1,'UTC',t0,t0+10*H); assert.strictEqual(o.length,3); near(o[0].r,10); near(o[1].r,-10); near(o[2].r,0);
  assert.ok(o.every(x=>x.wd===0)); assert.deepStrictEqual(o.map(x=>x.h),[0,1,2]); });
await T('multi-hour window needs every candle; missing candle drops only the windows touching it',()=>{
  const t0=U('2026-10-26T00:00:00Z'), arr=[]; for(let i=0;i<6;i++) if(i!==3) arr.push(K(t0+i*H,100+i,101+i));
  const rows=rowsOf(arr); const o2=C.hourObs(rows,2,'UTC',t0,t0+10*H);
  assert.deepStrictEqual(o2.map(x=>x.h),[0,1,4]);                       // windows starting 2,3 need candle 3 → excluded; 5 has no partner
  near(o2[0].r,((102/100)-1)*100); near(o2[2].r,(106/104-1)*100);
  assert.strictEqual(C.countGaps(rows,t0,t0+10*H),1); const o4=C.hourObs(rows,4,'UTC',t0,t0+10*H); assert.strictEqual(o4.length,0); });
await T('invalid OHLC / duplicates are rejected or counted, never averaged in',()=>{
  const t0=U('2026-10-26T00:00:00Z'), m=new Map();
  const r=C.mergeKlines(m,[K(t0,100,101),K(t0,100,102),[t0*1000+H*1000,100,90,95,98,1,0],[t0*1000+2*H*1000,0,1,1,1,1,0],[t0*1000+3*H*1000,'x',1,1,1,1,0],K(t0+4*H,5,6,-1)],NOW);
  assert.strictEqual(r.dups,1); assert.strictEqual(r.bad,4); assert.strictEqual(m.size,1); assert.strictEqual(m.get(t0).c,102); });
await T('heatmap cell = exact stats of matching (weekday,hour); empty cell is null, not 0',()=>{
  const mon=U('2026-10-26T09:00:00Z'), arr=[]; for(let w=0;w<3;w++){ arr.push(K(mon-w*7*86400,100,[101,103,99][w])); } arr.push(K(U('2026-10-27T09:00:00Z'),100,100));
  const rows=rowsOf(arr), o=C.hourObs(rows,1,'UTC',U('2026-10-01T00:00:00Z'),U('2026-12-01T00:00:00Z')), A=C.aggregate(o,[],[]);
  const c=A.heat[0][9]; assert.strictEqual(c.n,3); near(c.mean,(1+3-1)/3); near(c.median,1); near(c.win,200/3); near(c.sd,2);
  assert.strictEqual(A.heat[1][9].n,1); assert.strictEqual(A.heat[1][9].flat,100); assert.strictEqual(A.heat[3][4],null); assert.strictEqual(A.byHour[10],null); });
await T('hourly bucket respects the display timezone (Nairobi +3) and half-hour zones (Kolkata)',()=>{
  const t=U('2026-10-26T06:00:00Z'), rows=rowsOf([K(t,100,101)]);
  let o=C.hourObs(rows,1,'Africa/Nairobi',t-H,t+H); assert.strictEqual(o[0].h,9); assert.strictEqual(o[0].mi,0);
  o=C.hourObs(rows,1,'Asia/Kolkata',t-H,t+H); assert.strictEqual(o[0].h,11); assert.strictEqual(o[0].mi,30); });
await T('days: only whole, contiguous, completed local days count (UTC)',()=>{
  const d0=U('2026-10-26T00:00:00Z'), arr=[]; // Mon..Wed full, Thu missing 05:00, Fri starts at 06:00 (partial start)
  for(let i=0;i<72;i++) arr.push(K(d0+i*H,100,100+(i%24===23?5:0)*0+ (i%24===0?0:0)));
  for(let i=0;i<24;i++) if(i!==5) arr.push(K(d0+72*H+i*H,100,101));
  for(let i=6;i<24;i++) arr.push(K(d0+96*H+i*H,100,101));
  const rows=rowsOf(arr), now=U('2026-11-01T00:00:00Z'), d=C.dayObs(rows,'UTC',d0,d0+200*H,now);
  assert.deepStrictEqual(d.map(x=>x.wd),[0,1,2]); assert.strictEqual(d.dropped,2); assert.ok(d.every(x=>x.n===24)); });
await T('days: daily return = first open → last close of that local day',()=>{
  const d0=U('2026-10-26T00:00:00Z'), arr=[]; for(let i=0;i<24;i++) arr.push(K(d0+i*H,100+i,101+i));
  const d=C.dayObs(rowsOf(arr),'UTC',d0,d0+30*H,U('2026-11-01T00:00:00Z')); assert.strictEqual(d.length,1); near(d[0].r,(124/100-1)*100); near(d[0].v,240); });
await T('DST: 23-hour (2026-03-08) and 25-hour (2026-11-01) New York days are complete days',()=>{
  const tz='America/New_York', mk=(startIso,endIso)=>{ const a=[]; for(let t=U(startIso);t<U(endIso);t+=H) a.push(K(t,100,101)); return a; };
  const spring=rowsOf(mk('2026-03-08T05:00:00Z','2026-03-09T04:00:00Z'));   // 00:00 EST → 00:00 EDT next day = 23 h
  let d=C.dayObs(spring,tz,U('2026-03-08T00:00:00Z'),U('2026-03-10T00:00:00Z'),U('2026-06-01T00:00:00Z')); assert.strictEqual(d.length,1); assert.strictEqual(d[0].n,23); assert.strictEqual(d[0].wd,6);
  const fall=(()=>{ const m=new Map(); C.mergeKlines(m,mk('2026-11-01T04:00:00Z','2026-11-02T05:00:00Z'),Date.parse('2026-12-01T00:00:00Z')); return m; })();    // 00:00 EDT → 00:00 EST next day = 25 h
  d=C.dayObs(fall,tz,U('2026-11-01T00:00:00Z'),U('2026-11-03T00:00:00Z'),U('2026-11-03T00:00:00Z')); assert.strictEqual(d.length,1); assert.strictEqual(d[0].n,25);
  const hours=C.hourObs(spring,1,tz,U('2026-03-08T00:00:00Z'),U('2026-03-10T00:00:00Z')).map(x=>x.h); assert.ok(!hours.includes(2)&&hours.includes(1)&&hours.includes(3)); });
await T('months: running month and listing month excluded; returns open→close',()=>{
  const mk=(iso,o,c,x)=>[U(iso)*1000,o,Math.max(o,c),Math.min(o,c),c,50,x?Date.parse(iso)+30*864e5:Date.now()+864e5*5];
  const m=new Map(); C.mergeKlines(m,[mk('2025-12-01T00:00:00Z',10,12,1),mk('2026-01-01T00:00:00Z',100,110,1),mk('2026-02-01T00:00:00Z',110,99,1),mk('2026-10-01T00:00:00Z',200,210,0)],Date.now());
  const o=C.monthObs(m,U('2025-01-01T00:00:00Z'),U('2027-01-01T00:00:00Z')); assert.strictEqual(o.length,2); near(o[0].r,10); near(o[1].r,-10); assert.deepStrictEqual(o.listing,{y:2025,mo:12}); assert.strictEqual(o.prog.length,1); near(o.prog[0].r,5);
  const A=C.aggregate([],[],o); assert.strictEqual(A.byMonth[0].n,1); assert.strictEqual(A.byMonth[2],null); assert.strictEqual(A.years[2026][1].r,o[1].r); });
await T('best / weakest need minimum observations; ties and tiny samples not ranked',()=>{
  const st=(n,mean)=>({n,mean}); const arr=[st(2,9),st(10,1),st(10,-2),null,st(10,0.5)];
  assert.strictEqual(C.pick(arr,5,true),1); assert.strictEqual(C.pick(arr,5,false),2); assert.strictEqual(C.pick([null,st(1,1)],5,true),-1); });
await T('lookback bounds: 30D/1Y/ALL/custom, exclusive end, clip at MAXC, invalid custom',()=>{
  const now=U('2026-11-01T12:34:56Z'); let b=C.bounds('30D','','',now); assert.strictEqual(b.to,U('2026-11-01T13:00:00Z')); assert.strictEqual(b.from,Math.floor((now-30*86400)/H)*H);
  b=C.bounds('ALL','','',now); assert.strictEqual(b.clipped,true); assert.strictEqual(b.to-b.from,C.MAXC*H);
  b=C.bounds('Custom','2026-01-01','2026-01-31',now); assert.strictEqual(b.from,U('2026-01-01T00:00:00Z')); assert.strictEqual(b.to,U('2026-02-01T00:00:00Z')); assert.strictEqual(C.bounds('Custom','2026-02-01','2026-01-01',now),null); assert.strictEqual(C.bounds('Custom','','',now),null); });
await T('different listing dates: a short-history symbol yields fewer observations, never padded',()=>{
  const t0=U('2026-10-30T00:00:00Z'), arr=[]; for(let i=0;i<48;i++) arr.push(K(t0+i*H,100,101));
  const o=C.hourObs(rowsOf(arr),1,'UTC',U('2025-11-01T00:00:00Z'),U('2026-11-01T00:00:00Z')); assert.strictEqual(o.length,48); const A=C.aggregate(o,[],[]); assert.strictEqual(A.heat[0][5],null); assert.ok(A.byHour[3].n<=2); });
await T('fetchKlines paginates and Spot/Futures use different endpoints; error object keeps code',async()=>{
  const calls=[]; const d={API:'A',FAPI:'F',json:async u=>{ calls.push(u); const s=Math.ceil(+/startTime=(\d+)/.exec(u)[1]/1000); const n=Math.min(1000,Math.max(0,2300-s)); return Array.from({length:n},(_,i)=>K(s+i,1,1)); }};
  const r=await C.fetchKlines(d,'F','BTCUSDT','1h',0,9e12,()=>true); assert.strictEqual(r.length,2300); assert.ok(calls[0].startsWith('F/fapi/v1/klines')); await C.fetchKlines(d,'S','BTCUSDT','1M',0,9e12,()=>true); assert.ok(calls[calls.length-1].startsWith('A/api/v3/klines')&&calls[calls.length-1].includes('interval=1M'));
  try{ await C.fetchKlines({API:'A',FAPI:'F',json:async()=>({code:-1121,msg:'Invalid symbol.'})},'S','X','1h',0,1,()=>true); assert.fail(); }catch(e){ assert.strictEqual(e.code,-1121); }
  try{ await C.fetchKlines(d,'S','X','1h',0,1,()=>false); assert.fail(); }catch(e){ assert.strictEqual(e.message,'stale'); } });
console.log(`\n${pass} tests passed`);
})();
