// MarketPlusView push server: scans the market 24/7 with the Market Scanner engine and sends
// Web Push notifications to phones, even when the app is closed.
const http=require('http'), fs=require('fs'), path=require('path'), webpush=require('web-push'), mkEngine=require('./engine.js'), dealer=require('./dealer-engine.js'), lsa=require('./lsa-engine.js'); const ise=require('./ise-engine.js');
const PORT=+process.env.PORT||8787, DIR=process.env.DATA_DIR||__dirname, EVERY=(+process.env.SCAN_SECONDS||30)*1000, MAX_SUBS=200, MAX_WATCH=20;
// ---- Plan enforcement (server side) ----
// The phone sends its Supabase login token; we ask Supabase who it is and what plan it has. Nothing the browser says about its plan is trusted.
const SB_URL=process.env.SB_URL||'https://ssukfrvtknfsccqxqkjh.supabase.co', SB_KEY=process.env.SB_KEY||'sb_publishable_qjmaCvag0XhnMlipWFHCeA_fwt3CqST';
const PUSH_PLANS={trial:1,gold:1,metal:1,platinum:1,pro:1};   // plans allowed to receive Buy/Sell strategy push signals (metal = Platinum, pro = old plan treated as Platinum). The free trial is Platinum access, so it is included. Free and Silver are not.
async function entitlement(token){
  if(!token||typeof token!=='string'||token.length>4096) return {code:401,error:'sign in required'};
  const H={apikey:SB_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'};
  try{
    const u=await fetch(SB_URL+'/auth/v1/user',{headers:H}); if(!u.ok) return {code:401,error:'invalid session'};
    const user=await u.json(); if(!user||!user.id) return {code:401,error:'invalid session'};
    const a=await fetch(SB_URL+'/rest/v1/rpc/is_admin',{method:'POST',headers:H,body:'{}'});
    if(a.ok&&(await a.json())===true) return {ok:true,uid:user.id,plan:'admin',exp:null,email:user.email||''};
    const m=await fetch(SB_URL+'/rest/v1/memberships?select=plan,expires_at&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1',{headers:H});
    if(!m.ok) return {code:503,error:'membership lookup failed'};
    const row=(await m.json())[0]; if(!row) return {code:403,error:'no active plan',needs:'gold'};
    const exp=new Date(row.expires_at).getTime();
    if(!(exp>Date.now())) return {code:403,error:'plan expired',needs:'renew'};          // checked on the server clock
    if(!PUSH_PLANS[row.plan]) return {code:403,error:'plan does not include signals',needs:'gold'};
    return {ok:true,uid:user.id,plan:row.plan,exp,email:user.email||''};
  }catch(e){ return {code:503,error:'auth unavailable'}; } }
const live=s=>!!s.uid&&(s.exp===null||s.exp>Date.now());   // old subscriptions with no verified user stay dormant until the app re-registers them
const F=n=>path.join(DIR,n), load=(n,d)=>{ try{ return JSON.parse(fs.readFileSync(F(n),'utf8')); }catch(e){ return d; } }, save=(n,v)=>{ try{ fs.writeFileSync(F(n),JSON.stringify(v)); }catch(e){ console.error('save failed',n,e.message); } };
let vapid=process.env.VAPID_PUBLIC&&process.env.VAPID_PRIVATE?{publicKey:process.env.VAPID_PUBLIC,privateKey:process.env.VAPID_PRIVATE}:load('vapid.json',null);
if(!vapid){ vapid=webpush.generateVAPIDKeys(); save('vapid.json',vapid); }
webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:admin@example.com',vapid.publicKey,vapid.privateKey);
let subs=load('subs.json',{});   // endpoint -> {sub, watches:[{symbol,interval,opts}], seen:{key:1}, mail, email, mseen:{key:1}}
const engines={}, eng=iv=>engines[iv]||(engines[iv]=mkEngine(iv)), BASES=['https://api.binance.com','https://data-api.binance.vision'];
const jk=w=>(w.tool||'msc')+'|'+w.symbol+'|'+w.interval+'|'+JSON.stringify(w.opts||{});   // one scan job per tool + symbol + timeframe + options
const klCache=new Map(), KTTL={'4h':600e3,'1h':180e3,'15m':50e3};
async function klc(sym,iv,ttl){ const id=sym+'|'+iv, h=klCache.get(id); if(h&&Date.now()-h.t<ttl) return h.k; const k=await klines(sym,iv); if(k) klCache.set(id,{t:Date.now(),k}); return k||(h&&h.k)||null; }
async function dealerEvents(w){ const ids=['4h','1h','15m']; if(ids.indexOf(w.interval)<0) ids.push(w.interval); const K={};
  for(const i of ids){ const k=await klc(w.symbol,i,i===w.interval?Math.min(KTTL[i]||20e3,EVERY/2):KTTL[i]); if(!k) return []; K[i]=k; }
  return dealer.events(w,K); }
// ---- Liquidity Sweep Pro (tool:'lsa'): needs 1 minute candles, about 2 days. Full history once, then only the newest bars are refreshed.
const k1m=new Map();
async function kl1(sym,params,lim){ for(const b of BASES){ try{ const r=await fetch(`${b}/api/v3/klines?symbol=${sym}&interval=1m&limit=${lim||1000}${params||''}`); if(!r.ok) continue; const k=await r.json();
  if(Array.isArray(k)) return k.map(x=>({time:Math.floor(x[0]/1000),open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]})); }catch(e){} } return null; }
async function candles1m(sym){ let h=k1m.get(sym);
  if(!h||!h.k.length){ let all=await kl1(sym); if(!all||all.length<100) return null;
    for(let i=0;i<2;i++){ const more=await kl1(sym,'&endTime='+(all[0].time*1000-1)); if(!more||!more.length) break; all=more.concat(all); }
    h={k:all,t:Date.now()}; k1m.set(sym,h); return h.k; }
  if(Date.now()-h.t<EVERY/2) return h.k;
  const nw=await kl1(sym,'',60); if(!nw) return h.k;
  const last=nw.slice(-60), map=new Map(h.k.map(x=>[x.time,x])); last.forEach(x=>map.set(x.time,x));
  h.k=[...map.values()].sort((a,b)=>a.time-b.time).slice(-3000); h.t=Date.now(); return h.k; }
async function lsaEvents(w){ const k=await candles1m(w.symbol); if(!k||k.length<500) return []; return lsa.events(w,k); }
const lsaOpts=o=>{ o=o&&typeof o==='object'?o:{}; const r={}; if(['IFVG','FVG','Order Block','Market after MSS/BOS'].indexOf(o.entry)>=0) r.entry=o.entry; if(['B','A','A+'].indexOf(o.minQ)>=0) r.minQ=o.minQ; if(o.all===true) r.all=true; if(o.any===true) r.any=true; return r; };
// ---- Email (opt-in). Sent to the address of the signed-in account, which Supabase tells us (the browser cannot choose it).
// Set RESEND_API_KEY + MAIL_FROM, or SMTP_URL (needs: npm i nodemailer). Max MAIL_MAX_HOUR emails per user per hour (default 30).
const MAIL_FROM=process.env.MAIL_FROM||'MarketPlusView <signals@example.com>', RESEND=process.env.RESEND_API_KEY||'', MAIL_MAX=+process.env.MAIL_MAX_HOUR||30;
let smtp=null; if(process.env.SMTP_URL){ try{ smtp=require('nodemailer').createTransport(process.env.SMTP_URL); }catch(e){ console.error('SMTP_URL is set but nodemailer is not installed: run npm i nodemailer'); } }
const mailOn=()=>!!(RESEND||smtp); let mailWarned=false; const mailLog={};
const esc=t=>String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const MAIL_FOOT='Sent by MarketPlusView. This is a signal from a rule set, not financial advice, and no win rate or profit is guaranteed. To stop these emails, switch off "Email me every signal" in the app (Settings, Background push).';
async function sendMail(to,subject,text){ const html='<div style="font-family:system-ui,sans-serif;font-size:15px;color:#14213d"><h3 style="margin:0 0 8px">'+esc(subject)+'</h3><p style="margin:0 0 14px">'+esc(text).replace(/ \u00b7 /g,'<br>')+'</p><p style="font-size:12px;color:#5b6784">'+esc(MAIL_FOOT)+'</p></div>', body=text.replace(/ \u00b7 /g,'\n')+'\n\n'+MAIL_FOOT;
  if(RESEND){ const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+RESEND,'Content-Type':'application/json'},body:JSON.stringify({from:MAIL_FROM,to:[to],subject,text:body,html})}); if(!r.ok) throw new Error('resend '+r.status+' '+(await r.text()).slice(0,160)); return; }
  if(smtp){ await smtp.sendMail({from:MAIL_FROM,to,subject,text:body,html}); return; }
  throw new Error('email is not configured'); }
// returns true when the event is finished with (sent, or skipped on purpose), false when it should be tried again
async function mailEvent(s,e){ if(!mailOn()){ if(!mailWarned){ mailWarned=true; console.error('email requested but not configured: set RESEND_API_KEY + MAIL_FROM (or SMTP_URL)'); } return true; }
  const now=Date.now(), L=(mailLog[s.uid]=(mailLog[s.uid]||[]).filter(t=>now-t<3600e3)); if(L.length>=MAIL_MAX) return true;
  try{ await sendMail(s.email,e.title,e.body); L.push(now); console.log('emailed',e.title); return true; }catch(err){ console.error('mail failed',err.message); return false; } }
// ---- Telegram (owner chat): set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID ----
const TG_TOKEN=process.env.TELEGRAM_BOT_TOKEN||'', TG_CHAT=process.env.TELEGRAM_CHAT_ID||'', tgSeen=new Set(), tgStart=Date.now();
async function tgSend(text){ try{ const r=await fetch('https://api.telegram.org/bot'+TG_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:TG_CHAT,text:String(text).slice(0,3900)})}); if(!r.ok) console.error('telegram failed',r.status,(await r.text()).slice(0,120)); else console.log('telegram sent'); }catch(e){ console.error('telegram error',e.message); } }
if(TG_TOKEN&&TG_CHAT) console.log('telegram on');
const num=v=>v==null||isNaN(v)?'-':v<1?v.toFixed(5):v<100?v.toFixed(3):v.toFixed(2);
async function klines(sym,iv){ for(const b of BASES){ try{ const r=await fetch(`${b}/api/v3/klines?symbol=${sym}&interval=${iv}&limit=500`); if(!r.ok) continue; const k=await r.json();
  if(Array.isArray(k)&&k.length>60) return k.map(x=>({time:Math.floor(x[0]/1000),open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]})); }catch(e){} } return null; }
function events(sym,iv,c,r){ const last=c.length-1, ev=[], tag=sym+' '+iv, t=c[last].time;
  const a=r.pos&&r.pos.i0===last?r.pos:(r.pend&&r.pend.i0===last?r.pend:null);
  if(a) ev.push({key:`${sym}|${iv}|open|${t}`,title:(a.side>0?'🟢 BUY ':'🔴 SELL ')+(r.pos?'':'LIMIT ')+tag,body:`Entry ${num(a.e)} · SL ${num(a.sl0)} · TP1 ${num(a.t[0])} · TP2 ${num(a.t[1])} · TP3 ${num(a.t[2])} · score ${a.score}`});
  const x=r.trades[r.trades.length-1]; if(x&&x.i1===last) ev.push({key:`${sym}|${iv}|close|${x.i0}|${t}`,title:(x.tag==='TP3'?'✅ TP3 hit ':x.tag==='BE'?'➖ Breakeven ':'🛑 SL hit ')+tag,body:`${x.side>0?'BUY':'SELL'} closed ${x.R>=0?'+':''}${x.R.toFixed(2)}R`});
  return ev; }
// ---- ICT Structure Engine (tool:'ise'): runs on the watch's own timeframe candles (about 500)
async function iseEvents(w){ const k=await klines(w.symbol,w.interval); if(!k||k.length<130) return []; return ise.events(w,k); }
const iseOpts=o=>{ o=o&&typeof o==='object'?o:{}; const r={}; if(['Conservative','Balanced','Aggressive','Scalping'].indexOf(o.preset)>=0) r.preset=o.preset; if(['Off','Killzones','Silver Bullet'].indexOf(o.timeFilter)>=0) r.timeFilter=o.timeFilter; if(o.all===true) r.all=true; return r; };
let busy=false;
async function scan(){ if(busy) return; busy=true; try{
  const jobs={}; Object.values(subs).filter(live).forEach(s=>s.watches.forEach(w=>{ const k=jk(w); jobs[k]=jobs[k]||w; }));
  const res={}, kl={};
  for(const k of Object.keys(jobs)){ const w=jobs[k], id=w.symbol+'|'+w.interval;
    if(w.tool==='ise'){ try{ res[k]=await iseEvents(w); }catch(e){ console.error('ise scan',k,e.message); } continue; }
    if(w.tool==='lsa'){ try{ res[k]=await lsaEvents(w); }catch(e){ console.error('lsa scan',k,e.message); } continue; }
    if(w.tool==='dlr'){ try{ res[k]=await dealerEvents(w); }catch(e){ console.error('dealer scan',k,e.message); } continue; } if(!kl[id]) kl[id]=await klines(w.symbol,w.interval); if(!kl[id]) continue;
    const c=kl[id].slice(0,-1); try{ res[k]=events(w.symbol,w.interval,c,eng(w.interval)(c,w.opts||{})); }catch(e){ console.error('scan',k,e.message); } }
  for(const [ep,s] of Object.entries(subs).filter(e=>live(e[1]))) for(const w of s.watches){ const evs=res[jk(w)]||[];
    for(const e of evs){
      if(TG_TOKEN&&TG_CHAT&&!tgSeen.has(e.key)){ tgSeen.add(e.key); if(Date.now()-tgStart>45000) await tgSend(e.title+'\n'+e.body); }
      if(s.mail&&s.email){ s.mseen=s.mseen||{}; if(!s.mseen[e.key]){ if(await mailEvent(s,e)) s.mseen[e.key]=1; } }
      if(s.seen[e.key]) continue; s.seen[e.key]=1;
      try{ await webpush.sendNotification(s.sub,JSON.stringify({title:e.title,body:e.body,tag:e.key})); console.log('sent',e.title); }
      catch(err){ if(err.statusCode===404||err.statusCode===410){ delete subs[ep]; break; } console.error('push failed',err.statusCode||err.message); } } }
  Object.values(subs).forEach(s=>{ const k=Object.keys(s.seen); if(k.length>300) k.slice(0,k.length-200).forEach(x=>delete s.seen[x]); if(s.mseen){ const m=Object.keys(s.mseen); if(m.length>300) m.slice(0,m.length-200).forEach(x=>delete s.mseen[x]); } });
  save('subs.json',subs); }catch(e){ console.error('scan error',e.message); } busy=false; }
const send=(res,code,obj)=>{ res.writeHead(code,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}); res.end(JSON.stringify(obj)); };
const dlrOpts=o=>{ o=o&&typeof o==='object'?o:{}; const r={}; if(isFinite(o.rr)&&o.rr>=1&&o.rr<=10) r.rr=+o.rr; if(isFinite(o.risk)&&o.risk>0&&o.risk<=5) r.risk=+o.risk; if(o.sweep===true) r.sweep=true; return r; };
const clean=w=>(Array.isArray(w)?w:[]).slice(0,MAX_WATCH).filter(x=>x&&/^[A-Z0-9]{5,20}$/.test(x.symbol)&&/^\d+[mhdwM]$/.test(x.interval)).map(x=>x.tool==='ise'?{symbol:x.symbol,interval:['1m','3m','5m','15m','30m','1h','2h','4h'].indexOf(x.interval)<0?'15m':x.interval,tool:'ise',opts:iseOpts(x.opts)}:x.tool==='lsa'?{symbol:x.symbol,interval:'1m',tool:'lsa',opts:lsaOpts(x.opts)}:x.tool==='dlr'?{symbol:x.symbol,interval:['1m','5m','15m','1h'].indexOf(x.interval)<0?'5m':x.interval,tool:'dlr',opts:dlrOpts(x.opts)}:{symbol:x.symbol,interval:x.interval,opts:x.opts&&typeof x.opts==='object'?x.opts:{}});
let cal={t:0,j:null};   // Forex Factory weekly calendar, cached so phones don't hit the feed's rate limit
async function calendar(){ if(cal.j&&Date.now()-cal.t<15*60e3) return cal.j;
  try{ const r=await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json',{headers:{'User-Agent':'Mozilla/5.0'}}); if(r.ok){ const j=await r.json(); if(Array.isArray(j)&&j.length){ cal={t:Date.now(),j}; return j; } } }catch(e){ console.error('calendar fetch failed',e.message); }
  return cal.j; }
http.createServer((req,res)=>{ if(req.method==='OPTIONS') return send(res,204,{});
  if(req.method==='GET'&&req.url.split('?')[0]==='/calendar') return calendar().then(j=>j?send(res,200,j):send(res,502,{error:'feed unavailable'}));
  if(req.url==='/vapid') return send(res,200,{publicKey:vapid.publicKey});
  if(req.url==='/health') return send(res,200,{ok:true,subscribers:Object.keys(subs).length});
  if(req.method!=='POST') return send(res,404,{error:'not found'});
  let raw=''; req.on('data',d=>{ raw+=d; if(raw.length>1e5) req.destroy(); });
  req.on('end',async()=>{ let b; try{ b=JSON.parse(raw||'{}'); }catch(e){ return send(res,400,{error:'bad json'}); }
    const ep=b.subscription&&b.subscription.endpoint||b.endpoint;
    if(req.url==='/subscribe'){ if(!ep||!b.subscription||!b.subscription.keys) return send(res,400,{error:'no subscription'});
      const ent=await entitlement(b.token); if(!ent.ok) return send(res,ent.code,{error:ent.error,needs:ent.needs});
      if(!subs[ep]&&Object.keys(subs).length>=MAX_SUBS) return send(res,429,{error:'full'});
      const wantMail=b.mail===true&&!!ent.email; subs[ep]={sub:b.subscription,watches:clean(b.watches),seen:(subs[ep]&&subs[ep].seen)||{},mseen:(subs[ep]&&subs[ep].mseen)||{},uid:ent.uid,exp:ent.exp,mail:wantMail,email:wantMail?ent.email:undefined}; save('subs.json',subs); scan(); return send(res,200,{ok:true,watching:subs[ep].watches.length,mail:wantMail,mailReady:mailOn()}); }
    if(req.url==='/testmail'){ const ent=await entitlement(b.token); if(!ent.ok) return send(res,ent.code,{error:ent.error}); if(!ent.email) return send(res,400,{error:'your account has no email address'});
      if(!mailOn()) return send(res,503,{error:'email is not set up on the server yet'}); const L=(mailLog['t'+ent.uid]=(mailLog['t'+ent.uid]||[]).filter(t=>Date.now()-t<60e3)); if(L.length) return send(res,429,{error:'wait a minute before another test'});
      try{ await sendMail(ent.email,'\u2705 MarketPlusView email works','Signals will be sent to this address.'); L.push(Date.now()); return send(res,200,{ok:true,to:ent.email.replace(/^(.).*(@.*)$/,'$1***$2')}); }catch(e){ console.error('testmail failed',e.message); return send(res,500,{error:'could not send'}); } }
    if(req.url==='/unsubscribe'){ delete subs[ep]; save('subs.json',subs); return send(res,200,{ok:true}); }
    if(req.url==='/test'){ const s=subs[ep]; if(!s) return send(res,404,{error:'not subscribed'});
      try{ await webpush.sendNotification(s.sub,JSON.stringify({title:'✅ Push works',body:'MarketPlusView server can reach this phone.',tag:'test'+Date.now()})); return send(res,200,{ok:true}); }catch(e){ return send(res,500,{error:String(e.statusCode||e.message)}); } }
    send(res,404,{error:'not found'}); }); }).listen(PORT,()=>{ console.log('push server on',PORT,'| scanning every',EVERY/1000,'s'); setInterval(scan,EVERY); scan(); });
