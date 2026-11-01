const fs=require('fs'); const src=fs.readFileSync('/home/claude/out/tools-8.js','utf8');
const code=src.slice(src.indexOf('/* ============ HLC Area chart type'));
let pass=0,fail=0; const ok=(c,m)=>{ if(c) pass++; else { fail++; console.log('FAIL:',m); } };
// stub app globals (test data is a deterministic test fixture, not market data)
global.localStorage={getItem:()=>null,setItem:()=>{}}; global.fmt=v=>(+v).toFixed(2); global.render=()=>{};
const opts={candle:{},line:{}}; global.candle={applyOptions:o=>Object.assign(opts.candle,o)}; global.lineS={applyOptions:o=>Object.assign(opts.line,o)};
global.window={}; eval(code+'\nglobal.HLC=window.mpHLC;'); const HLC=global.HLC;
let seed=5; const R=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
const cs=[]; let px=65000; for(let i=0;i<120;i++){ const o=px, c=o+(R()-0.5)*600, hi=Math.max(o,c)+R()*250, lo=Math.min(o,c)-R()*250; cs.push({time:1.7e9+i*3600,open:o,high:hi,low:lo,close:c,volume:100+R()*900}); px=c; }
const W=900,H=480, from=40,to=110; const pmin=Math.min(...cs.slice(40).map(c=>c.low))-100, pmax=Math.max(...cs.slice(40).map(c=>c.high))+100;
const ts={getVisibleLogicalRange:()=>({from,to}),logicalToCoordinate:l=>(l-from)*W/(to-from)}; const s={priceToCoordinate:p=>(pmax-p)/(pmax-pmin)*H};
function mk(){ const ops=[]; let path=[],cur=0; const o={ops,paths:[],fills:[],strokes:[]};
 Object.assign(o,{save(){},restore(){},rect(){},clip(){},beginPath(){ path=[]; },moveTo(x,y){ path.push(['M',x,y]); },lineTo(x,y){ path.push(['L',x,y]); },closePath(){ path.push(['Z']); },
  fill(){ o.fills.push({style:o.fillStyle,path}); },stroke(){ o.strokes.push({style:o.strokeStyle,w:o.lineWidth,path}); },fillRect(x,y,w,h){ o.fills.push({style:o.fillStyle,rect:[x,y,w,h]}); }}); return o; }
// 1 default: band fill polygon = highs forward then lows backward; close line strokes closes
let cx=mk(); HLC.draw(cx,ts,s,W,H,cs);
const a=Math.max(0,from-1), b=Math.min(cs.length-1,to+1), n=b-a+1;
const band=cx.fills.find(f=>f.path&&f.path.length>5); ok(!!band,'band polygon drawn');
const pts=band.path.filter(p=>p[0]!=='Z'); ok(pts.length===2*n,'band has 2n vertices: '+pts.length);
let maxErr=0; for(let i=0;i<n;i++){ const c=cs[a+i], x=(a+i-from)*W/(to-from); const top=pts[i], bot=pts[2*n-1-i]; maxErr=Math.max(maxErr,Math.abs(top[1]-x),Math.abs(top[2]-s.priceToCoordinate(c.high)),Math.abs(bot[1]-x),Math.abs(bot[2]-s.priceToCoordinate(c.low))); }
ok(maxErr<1e-9,'band boundaries == real high / low (err '+maxErr+')');
ok(pts.every((p,i)=>i<n?true:true),'ok');
const lineSt=cx.strokes.find(st=>st.style==='#ffb300'); ok(!!lineSt,'close line stroke in its own colour'); const lp=lineSt.path;
let e2=0; for(let i=0;i<n;i++) e2=Math.max(e2,Math.abs(lp[i][2]-s.priceToCoordinate(cs[a+i].close))); ok(e2<1e-9&&lp.length===n,'close line == real closes (err '+e2+')');
ok(cx.strokes.filter(st=>st.style!=='#ffb300').length===2,'high and low edge lines drawn separately');
ok(band.style.startsWith('rgba(77,171,247,0.22'),'band colour/opacity '+band.style);
// 2 visibility toggles are independent
HLC.cfg().range=false; cx=mk(); HLC.draw(cx,ts,s,W,H,cs); ok(!cx.fills.some(f=>f.path&&f.path.length>5)&&cx.strokes.some(st=>st.style==='#ffb300')&&cx.strokes.length===1,'range off: line remains alone');
HLC.cfg().range=true; HLC.cfg().line=false; cx=mk(); HLC.draw(cx,ts,s,W,H,cs); ok(cx.fills.some(f=>f.path&&f.path.length>5)&&!cx.strokes.some(st=>st.style==='#ffb300'),'line off: band remains alone');
HLC.cfg().line=true; HLC.cfg().vol=true; cx=mk(); HLC.draw(cx,ts,s,W,H,cs); ok(cx.fills.filter(f=>f.rect).length===n,'volume bars: '+cx.fills.filter(f=>f.rect).length);
HLC.cfg().vol=false;
// 3 live update: last candle gets a new high/low/close -> redraw reflects it
cs[cs.length-1]={...cs[cs.length-1],high:cs[cs.length-1].high+500,close:cs[cs.length-1].high+400}; cx=mk(); const t2=Object.assign({},ts,{getVisibleLogicalRange:()=>({from:60,to:cs.length+2})});
HLC.draw(cx,t2,s,W,H,cs); const bd=cx.fills.find(f=>f.path&&f.path.length>5); const topLast=bd.path.filter(p=>p[0]!=='Z')[cs.length-1-59]; ok(Math.abs(topLast[2]-s.priceToCoordinate(cs[cs.length-1].high))<1e-9,'live: new extreme high shown');
// 4 gaps in coordinates (scale not ready) break runs, no crash
const s2={priceToCoordinate:p=>p>65500&&p<65600?null:s.priceToCoordinate(p)}; cx=mk(); HLC.draw(cx,ts,s2,W,H,cs); ok(true,'null coordinates tolerated');
// 5 style(): native candle hidden, close line native styling, prec; leave restores
HLC.style(); ok(opts.candle.upColor==='rgba(0,0,0,0)'&&opts.candle.wickVisible===false&&opts.candle.lastValueVisible===false,'candle hidden'); ok(opts.line.visible===true&&opts.line.color==='#ffb300'&&opts.line.lineWidth===2&&opts.line.lastValueVisible===true,'native close line styled');
HLC.cfg().prec=2; HLC.style(); ok(opts.candle.priceFormat.precision===2&&opts.line.priceFormat.precision===2,'precision'); HLC.leave(); ok(opts.line.visible===false&&opts.line.color==='#4dabf7','leave restores line');
// 6 tooltip row has exact H L C Vol
const row=HLC.row({high:101.5,low:99.25,close:100,open:100,volume:1234.5},{close:99}); ok(/H<\/span> 101.50/.test(row)&&/L<\/span> 99.25/.test(row)&&/C<\/span> 100.00/.test(row)&&/Vol 1.23K/.test(row)&&/Range 2.25/.test(row),'row: '+row.replace(/<[^>]+>/g,''));
console.log('pass',pass,'fail',fail); process.exit(fail?1:0);
