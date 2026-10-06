'use strict';
// This worker is registered from /training/ with scope './'. It never controls
// the site's homepage or other apps. No workout data is sent over the network.
const PREFIX='gyubin-training:'+new URL(self.registration.scope).pathname+':';
const CACHE=PREFIX+'1.0.0';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(ASSETS.map(p=>new URL(p,self.registration.scope).href));await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 if(event.request.mode==='navigate'){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(event.request);if(response.ok){await cache.put(new URL('./index.html',self.registration.scope).href,response.clone());return response;}return await cache.match(new URL('./index.html',self.registration.scope).href)||response;}catch(error){return await cache.match(new URL('./index.html',self.registration.scope).href)||Response.error();}})());
 }else if(ASSETS.some(p=>new URL(p,self.registration.scope).pathname===url.pathname)){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(event.request);if(cached)return cached;const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;})());
 }
});
