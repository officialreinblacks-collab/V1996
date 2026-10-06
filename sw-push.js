// Add this line at the very top of your existing sw.js:   importScripts('sw-push.js');
self.addEventListener('push',e=>{ let d={}; try{ d=e.data?e.data.json():{}; }catch(x){ d={body:e.data?e.data.text():''}; }
  e.waitUntil(self.registration.showNotification(d.title||'MarketPlusView signal',{body:d.body||'',tag:d.tag,renotify:true,vibrate:[200,100,200],data:{url:d.url||'./'}})); });
self.addEventListener('notificationclick',e=>{ e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{ for(const c of l){ if('focus' in c) return c.focus(); } return clients.openWindow((e.notification.data&&e.notification.data.url)||'./'); })); });
