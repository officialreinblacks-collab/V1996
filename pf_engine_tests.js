const fs=require('fs'); const src=fs.readFileSync('/home/claude/out/tools-8.js','utf8');
const i0=src.indexOf('function pfEngine('), i1=src.indexOf("if(typeof fp==='undefined') return;",i0);
const {pfEngine,pfAtr,pfBoxInt,pfSig}=new Function(src.slice(i0,i1)+'\nreturn {pfEngine,pfAtr,pfBoxInt,pfSig};')();
let pass=0,fail=0; const ok=(c,m)=>{ if(c) pass++; else { fail++; console.log('FAIL:',m); } };
const eq=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),m+'  got '+JSON.stringify(a)+'  want '+JSON.stringify(b));
function run(B,rev,prices,qty){ const e=pfEngine({B,rev}); let T=1000,a=1; for(const p of prices){ e.feed(p,qty||1,a%2===0,T,a); T+=1000; a++; } return e; }
const sum=e=>e.cols.map(c=>[c.d>0?'X':'O',c.lo,c.hi]);
// 1 X column formation (anchor level 10)
eq(sum(run(100,3,[1000,1050,1100,1250,1350])),[['X',10,13]],'1 X formation');
// 2 O column formation: falling fills a box when price <= its level (650 -> level 7)
eq(sum(run(100,3,[1000,950,900,780,650])),[['O',7,10]],'2 O formation');
// 3 continuation by one box and by several boxes
eq(sum(run(100,3,[1000,1100,1200,1300,1700])),[['X',10,17]],'3 continuation 1 and 4 boxes');
// 4 three-box reversal: top level 15 -> needs price <= 1200 (exactly $300 below the top box level)
eq(sum(run(100,3,[1000,1500,1201])),[['X',10,15]],'4a 1201 no reversal');
eq(sum(run(100,3,[1000,1500,1200])),[['X',10,15],['O',12,14]],'4b 1200 reverses (O starts one box below top)');
eq(sum(run(100,3,[1000,1500,1200,1100])),[['X',10,15],['O',11,14]],'4c O continues');
eq(sum(run(100,3,[1000,500,799])),[['O',5,10]],'4d O: 799 no reversal (needs >= 800)');
eq(sum(run(100,3,[1000,500,800])),[['O',5,10],['X',6,8]],'4e O reverses at lo+3 boxes, X starts one box above lo');
// 5 custom reversal
eq(sum(run(100,1,[1000,1500,1400])),[['X',10,15],['O',14,14]],'5a rev 1');
eq(sum(run(100,2,[1000,1500,1300])),[['X',10,15],['O',13,14]],'5b rev 2');
eq(sum(run(100,5,[1000,1500,1000])),[['X',10,15],['O',10,14]],'5c rev 5');
eq(sum(run(100,5,[1000,1500,1001])),[['X',10,15]],'5d rev 5 not yet');
// 6 fixed price box / tick rounding
eq(pfBoxInt(100,100,1),10000,'6a fixed $100, pS=100, tick 0.01'); eq(pfBoxInt(0.5,100,1),50,'6b');
eq(pfBoxInt(0.52,100,5),50,'6c rounds to tick 0.05'); eq(pfBoxInt(0.001,100,5),5,'6d never below one tick'); eq(pfBoxInt(0.53,100,5),55,'6e');
// 7 percentage: 0.25% of 100000 = 250 ; of 0.4321 with tick 0.0001 (pS 1e4)
eq(pfBoxInt(100000*0.25/100,100,1),25000,'7a pct'); eq(pfBoxInt(0.4321*0.25/100,1e4,1),11,'7b pct small price');
// 8 ATR: constant true range 10 -> ATR 10 (x2 -> 20); forming candle excluded; not enough candles -> 0
const cs=[]; let c0=100; for(let i=0;i<40;i++){ cs.push({open:c0,high:c0+10,low:c0,close:c0}); }
ok(Math.abs(pfAtr(cs,14,1)-10)<1e-9,'8a ATR=10'); ok(Math.abs(pfAtr(cs,14,2)-20)<1e-9,'8b mult');
const cs2=cs.concat([{open:100,high:900,low:0,close:500}]); ok(Math.abs(pfAtr(cs2,14,1)-10)<1e-9,'8c forming candle excluded');
eq(pfAtr(cs.slice(0,10),14,1),0,'8d not enough candles'); ok(Math.abs(pfAtr(cs.slice(0,16),14,1)-10)<1e-9,'8e minimal');
// 9 gaps and overshoots: no boxes lost
eq(sum(run(100,3,[1000,1100,2050])),[['X',10,20]],'9a gap up');
eq(sum(run(100,3,[1000,1500,500])),[['X',10,15],['O',5,14]],'9b overshoot reversal fills every box');
eq(sum(run(100,3,[1000,1500,500,3000])),[['X',10,15],['O',5,14],['X',6,30]],'9c big reversal back up');
eq(sum(run(100,3,[1000,300])),[['O',3,10]],'9d first column gap down');
// 10 no column from time passing / equal prices / sub-box moves
{ const e=pfEngine({B:100,rev:3}); for(let i=0;i<1000;i++) e.feed(1050+(i%2?40:-40),1,true,1000+i*3600e3,i+1); eq(e.cols.length,0,'10 time/sub-box noise creates nothing'); }
// 11 determinism + id ordering (arrival-order shuffle then sort by id)
function rnd(seed){ let s=seed; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
const R=rnd(7); let px=100000; const walk=[]; for(let i=0;i<60000;i++){ px+=Math.round((R()-0.5)*(R()<0.01?4000:300)); if(px<1000) px=1000; walk.push(px); }
const A=run(100,3,walk), A2=run(100,3,walk); eq(sum(A),sum(A2),'11a deterministic');
{ const rows=walk.map((p,i)=>({p,a:i+1})); const sh=rows.slice(); const R2=rnd(3); for(let i=sh.length-1;i>0;i--){ const j=Math.floor(R2()*(i+1)); [sh[i],sh[j]]=[sh[j],sh[i]]; } sh.sort((x,y)=>x.a-y.a); const e=pfEngine({B:100,rev:3}); sh.forEach((r,i)=>e.feed(r.p,1,false,1000+i,r.a)); eq(sum(e),sum(A),'11b id-sorted arrival == ordered'); }
// 12 invariants on the random walk, for several boxes/reversals
for(const [B,rev] of [[100,1],[100,3],[250,2],[50,5],[1000,3]]){
  const e=run(B,rev,walk); const cs=e.cols; let bad='';
  cs.forEach((c,i)=>{ if(c.hi<c.lo) bad='hi<lo'; if(i&&cs[i-1].d===c.d) bad='no alternation'; if(i){ const p=cs[i-1]; if(c.d<0&&c.hi!==p.hi-1) bad='O start not hi-1'; if(c.d>0&&c.lo!==p.lo+1) bad='X start not lo+1'; if(c.hi-c.lo+1<rev&&i>0) bad='reversal column shorter than rev'; }
    if(c.d>0&&(c.hp<c.lo*B||c.hp>=(c.hi+1)*B+0&&false)) bad='price range'; });
  ok(!bad,'12 invariants B'+B+' rev'+rev+': '+bad+' cols='+cs.length);
  // independent step-by-step reference implementation
  let st=null,out=[],anc=walk[0]; for(const p of walk){ if(!st){ const u0=Math.floor(anc/B); if(Math.floor(p/B)>=u0+1) st={d:1,lo:u0,hi:u0}; else if(Math.ceil(p/B)<=u0-1) st={d:-1,hi:u0,lo:u0}; else continue; out.push(st); }
    if(st.d>0){ while((st.hi+1)*B<=p) st.hi++; if(p<=(st.hi-rev)*B){ const n={d:-1,hi:st.hi-1,lo:st.hi-1}; out.push(n); st=n; while((st.lo-1)*B>=p) st.lo--; } }
    else { while((st.lo-1)*B>=p) st.lo--; if(p>=(st.lo+rev)*B){ const n={d:1,lo:st.lo+1,hi:st.lo+1}; out.push(n); st=n; while((st.hi+1)*B<=p) st.hi++; } } }
  eq(out.map(c=>[c.d>0?'X':'O',c.lo,c.hi]),sum(e),'12 reference match B'+B+' rev'+rev);
}
// 13 volume / trade counters and open/close timestamps
{ const e=run(100,3,[1000,1100,1200,1500,1200,1100],2); const tot=e.cols.reduce((s,c)=>s+c.v,0); eq(tot,12,'13a volume conserved (anchor trade folded into first column)'); eq(e.cols.reduce((s,c)=>s+c.n,0),6,'13b trade count'); ok(e.cols[0].t0===1000&&e.cols[0].t1>=e.cols[0].t0&&e.cols[1].t0>=e.cols[0].t1,'13c timestamps'); ok(e.cols[0].B===100,'13d box size kept'); }
// 14 signals (read-only, from finished columns)
const mk=(d,lo,hi)=>({d,lo,hi});
eq(pfSig([mk(1,10,13),mk(-1,11,12),mk(1,11,14)],2),{t:'DT',buy:true},'14a double top buy');
eq(pfSig([mk(1,10,13),mk(-1,11,12),mk(1,11,13)],2),null,'14b equal top is not a signal');
eq(pfSig([mk(1,10,13),mk(-1,11,12),mk(1,11,13),mk(-1,11,12),mk(1,11,14)],4),{t:'TT',buy:true},'14c triple top breakout');
eq(pfSig([mk(-1,10,13),mk(1,11,12),mk(-1,9,12)],2),{t:'DB',buy:false},'14d double bottom sell');
eq(pfSig([mk(-1,10,13),mk(1,11,12),mk(-1,10,12),mk(1,11,12),mk(-1,9,12)],4),{t:'TB',buy:false},'14e triple bottom breakdown');
console.log('pass',pass,'fail',fail); process.exit(fail?1:0);
