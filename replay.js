// replay.js - checks the tools engine on LIVE candles: shows which alerts would have fired in the last ~25 hours.
// Usage:  node replay.js                      (BTWUSDT 5m, tool pcr)
//         node replay.js BTWUSDT 5m pcr,mfs   (symbol, timeframe, tool codes)
// Nothing is sent anywhere. It only prints.
const E=require('./tools-engine.js');
const sym=(process.argv[2]||'BTWUSDT').toUpperCase(), iv=process.argv[3]||'5m', ids=(process.argv[4]||'pcr').split(',');
const BASES=['https://api.binance.com/api/v3','https://data-api.binance.vision/api/v3','https://fapi.binance.com/fapi/v1'];
(async()=>{
  let k=null;
  for(const b of BASES){ try{ const r=await fetch(`${b}/klines?symbol=${sym}&interval=${iv}&limit=1000`); if(!r.ok) continue; const j=await r.json(); if(Array.isArray(j)&&j.length>200){ k=j; console.log('candles from',b.split('//')[1].split('/')[0]); break; } }catch(e){} }
  if(!k){ console.log('could not download candles for',sym,iv); return; }
  const c=k.map(x=>({time:Math.floor(x[0]/1000),open:+x[1],high:+x[2],low:+x[3],close:+x[4],volume:+x[5]}));
  const seen=new Map(); const from=Math.max(200,c.length-300);
  for(let e=from;e<=c.length;e++){ E.events({symbol:sym,interval:iv,opts:{ids:ids}},c.slice(0,e)).forEach(x=>{ if(!seen.has(x.key)) seen.set(x.key,x); }); }
  const t=key=>+key.split('|').filter(p=>/^\d{9,}$/.test(p)).pop();
  const rows=[...seen.values()].sort((a,b)=>t(a.key)-t(b.key));
  console.log(sym,iv,'tools:',ids.join(','),'->',rows.length,'alerts in the last',Math.round((c.length-from)*(c[1].time-c[0].time)/3600),'hours');
  rows.slice(-12).forEach(x=>console.log(new Date(t(x.key)*1000).toISOString().slice(5,16).replace('T',' '),'|',x.title.replace(/\s+BTWUSDT.*$/,''),'|',x.body));
})();
