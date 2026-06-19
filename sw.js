/* SMART Learning service worker — instant repeat loads + offline support */
var CACHE='smart-app-v2';
var CDN_CACHE='smart-cdn-v2';
self.addEventListener('install',function(e){self.skipWaiting();});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE&&k!==CDN_CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);
  var h=url.hostname;
  /* never intercept live data (Firestore long-polling, auth) */
  if(h.indexOf('firestore')>=0||h==='www.googleapis.com'||h==='securetoken.googleapis.com'||h.indexOf('firebaseio')>=0)return;
  if(url.origin===location.origin){
    /* app shell: network-first so updates land immediately; cache fallback when offline */
    e.respondWith(fetch(e.request).then(function(r){
      if(r&&r.status===200){var copy=r.clone();caches.open(CACHE).then(function(c){c.put(e.request,copy);});}
      return r;
    }).catch(function(){return caches.match(e.request);}));
  }else{
    /* CDN assets (Firebase SDK, fonts): cache-first — they are versioned and immutable */
    e.respondWith(caches.match(e.request).then(function(hit){
      if(hit)return hit;
      return fetch(e.request).then(function(r){
        if(r&&r.status===200&&(r.type==='basic'||r.type==='cors')){var copy=r.clone();caches.open(CDN_CACHE).then(function(c){c.put(e.request,copy);});}
        return r;
      });
    }));
  }
});
