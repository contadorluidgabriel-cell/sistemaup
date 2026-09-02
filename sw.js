const CACHE='sistema-evolucao-shell-v9';
const CORE=[
  './','./index.html','./styles.css','./screens.css','./app.js',
  './volume-engine.js','./volume-engine.css','./prescription-engine.js','./prescription-engine.css',
  './plan-v3.js','./plan-v3.css','./execution-engine.js','./execution-engine.css',
  './mission-adapter-v2.js','./exercise-history.js','./exercise-history.css',
  './training-experience.js','./training-experience.css','./mvp-audit.js','./mvp-ux-guard.js',
  './app-experience.js','./app-experience.css','./app-polish-extra.js','./app-polish-extra.css',
  './supabase-config.js','./cloud-sync.js','./cloud-sync.css',
  './manifest.webmanifest','./app-icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(CORE.map(url=>cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request);
        const cache=await caches.open(CACHE);
        cache.put('./index.html',response.clone()).catch(()=>{});
        return response;
      }catch{
        return (await caches.match('./index.html'))||(await caches.match('./'));
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(request);
    if(cached){
      fetch(request).then(async response=>{
        if(response?.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone());}
      }).catch(()=>{});
      return cached;
    }
    const response=await fetch(request);
    if(response?.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone());}
    return response;
  })());
});
