const fs=require('fs'); const src=fs.readFileSync('/home/claude/out/tools-8.js','utf8'); const code=src.slice(src.indexOf('/* ============ Step Line chart type'));
let pass=0,fail=0; const ok=(c,m)=>{ if(c) pass++; else { fail++; console.log('FAIL:',m); } }; const eq=(a,b,m)=>ok(JSON.stringify(a)===JSON.stringify(b),m+'  got '+JSON.stringify(a)+'  want '+JSON.stringify(b));
const opts={c:{},l:{}}; global.localStorage={getItem:()=>null,setItem:()=>{}}; global.fmt=v=>(+v).toFixed(2); global.render=()=>{};
global.candle={applyOptions:o=>Object.assign(opts.c,o)}; global.lineS={applyOptions:o=>Object.assign(opts.l,o)}; global.window={}; eval(code+'\nglobal.STP=window.mpSTP; global.stepSegs=window.mpSTP.stepSegs;');
const X=[0,10,20,30], Y=[5,5,9,2]; const flat=m=>stepSegs(X,Y,m).map(s=>[s.x0,s.y0,s.x1,s.y1]);
eq(flat('after'),[[0,5,10,5],[10,5,20,5],[20,5,20,9],[20,9,30,9],[30,9,30,2]],'after');
eq(flat('before'),[[0,5,10,5],[10,5,10,9],[10,9,20,9],[20,9,20,2],[20,2,30,2]],'before');
eq(flat('center'),[[0,5,5,5],[5,5,10,5],[10,5,15,5],[15,5,15,9],[15,9,20,9],[20,9,25,9],[25,9,25,2],[25,2,30,2]],'center');
// equal consecutive prices -> no vertical segment, pure horizontal run
ok(!stepSegs([0,10,20],[7,7,7],'after').some(s=>s.x0===s.x1),'equal prices: no vertical');
// invariants on random data, all modes: only horizontal/vertical, continuous, covers x range, vertical only where price changes
let seed=3; const R=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
const xs=[],ys=[]; for(let i=0;i<500;i++){ xs.push(i*8); ys.push(Math.round(R()*20)); }
for(const m of ['after','before','center']){ const sg=stepSegs(xs,ys,m); let bad='';
  sg.forEach((q,i)=>{ if(q.x0!==q.x1&&q.y0!==q.y1) bad='diagonal'; if(q.x1<q.x0) bad='backwards'; if(i){ const p=sg[i-1]; if(p.x1!==q.x0||p.y1!==q.y0) bad='discontinuous at '+i; } });
  ok(!bad&&sg[0].x0===xs[0]&&sg[sg.length-1].x1===xs[xs.length-1],m+' invariants '+bad);
  const vert=sg.filter(q=>q.x0===q.x1).length, changes=ys.slice(1).filter((v,i)=>v!==ys[i]).length; ok(vert===changes,m+' vertical count == price changes '+vert+'/'+changes);
  // every period's own level is reached at its x (before: y at x_i is the next level when changing; after: y at x_i equals previous level then jumps) -> endpoint check
  ok(sg[sg.length-1].y1===ys[ys.length-1],m+' ends at last value'); }
// draw: price sources + colours + modes via recording canvas
function mk(){ const o={strokes:[],fills:[]},path=[]; let cur=[]; Object.assign(o,{save(){},restore(){},rect(){},clip(){},beginPath(){ cur=[]; },moveTo(x,y){ cur.push(['M',x,y]); },lineTo(x,y){ cur.push(['L',x,y]); },stroke(){ o.strokes.push({style:o.strokeStyle,w:o.lineWidth,path:cur}); },fillRect(x,y,w,h){ o.fills.push([x,y,w,h]); }}); return o; }
const cs=[{time:1,open:100,high:110,low:95,close:105,volume:10},{time:2,open:105,high:108,low:90,close:92,volume:20},{time:3,open:92,high:99,low:91,close:99,volume:30},{time:4,open:99,high:99,low:99,close:99,volume:5}];
const W=400,H=300; const ts={getVisibleLogicalRange:()=>({from:0,to:3}),logicalToCoordinate:l=>l*100}; const s={priceToCoordinate:p=>(120-p)*2};
STP.cfg().dir=false;
for(const src of ['open','high','low','close']){ STP.cfg().src=src; STP.cfg().mode='after'; const cx=mk(); STP.draw(cx,ts,s,W,H,cs); const pts=cx.strokes.flatMap(q=>q.path); const ys=new Set(pts.map(p=>Math.round(p[2]-0.5)===p[2]-0.5?p[2]-0.5:p[2]));
  const want=cs.map(c=>s.priceToCoordinate(c[src])); ok(want.every(w=>pts.some(p=>Math.abs((p[2]-w))<=0.5+1e-9)),'source '+src+' levels drawn at real '+src+' prices'); }
STP.cfg().src='close'; STP.cfg().dir=true; STP.cfg().mode='after'; let cx=mk(); STP.draw(cx,ts,s,W,H,cs); ok(cx.strokes.map(q=>q.style).sort().join()==='#2dd4a7,#ff5d7a'||cx.strokes.length>=2,'direction colours present: '+cx.strokes.map(q=>q.style));
ok(cx.strokes.some(q=>q.style==='#ff5d7a')&&cx.strokes.some(q=>q.style==='#2dd4a7'),'bullish and bearish segments coloured');
// close sequence 105,92,99,99: 105->92 down(bear), 92->99 up(bull), 99->99 equal: counts as not-down (bull colour) horizontal only
STP.cfg().dir=false; cx=mk(); STP.draw(cx,ts,s,W,H,cs); ok(cx.strokes.length===1&&cx.strokes[0].style==='#4dabf7','single colour mode');
// live update: change last candle close -> last vertical moves to new level
cs[3]={...cs[3],close:120}; STP.cfg().mode='after'; cx=mk(); STP.draw(cx,{...ts,getVisibleLogicalRange:()=>({from:0,to:4})},s,W,H,cs); ok(cx.strokes[0].path.some(p=>Math.abs(p[2]-(s.priceToCoordinate(120)))<=0.5+1e-9),'live: new close level drawn');
STP.style(); ok(opts.c.upColor==='rgba(0,0,0,0)'&&opts.l.lineVisible===false&&opts.l.lastValueVisible===true,'native candle hidden, price label only'); STP.leave(); ok(opts.l.visible===false&&opts.l.lineVisible===true&&opts.l.color==='#4dabf7','leave restores');
const row=STP.row({open:1,high:3,low:0.5,close:2,volume:1500},{close:1.5,open:1,high:1,low:1}); ok(/Step Close<\/span> 2.00/.test(row)&&/Vol 1.50K/.test(row),'row');
console.log('pass',pass,'fail',fail); process.exit(fail?1:0);
