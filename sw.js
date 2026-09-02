const CACHE='sistema-evolucao-shell-v14';
const CORE=[
  './','./index.html','./styles.css','./screens.css','./app.js',
  './volume-engine.js','./volume-engine.css','./prescription-engine.js','./prescription-engine.css',
  './plan-v3.js','./plan-v3.css','./execution-engine.js','./execution-engine.css',
  './mission-adapter-v2.js','./exercise-history.js','./exercise-history.css',
  './training-experience.js','./training-experience.css','./mvp-audit.js','./mvp-ux-guard.js',
  './app-experience.js','./app-experience.css','./app-polish-extra.js','./app-polish-extra.css',
  './training-preferences.js','./training-preferences.css','./series-prescription.js','./series-prescription.css','./secondary-mission.js','./progress-live.js',
  './supabase-config.js','./cloud-sync.js','./cloud-sync.css',
  './manifest.webmanifest','./app-icon.svg'
];
const CORE_URLS=new Set(CORE.map(path=>new URL(path,self.location.href).href));

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('sistema-evolucao-shell-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function fetchBounded(request){
  const controller=new AbortController();
  let timer;
  try{
    return await Promise.race([
      fetch(request,{signal:controller.signal}),
      new Promise((_,reject)=>{
        timer=setTimeout(()=>{controller.abort();reject(new Error('Network timeout'));},4000);
      })
    ]);
  }finally{clearTimeout(timer);}
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode!=='navigate'&&!CORE_URLS.has(url.href))return;

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(request.mode==='navigate'?'./index.html':request);
    if(cached)return cached;
    try{
      const response=await fetchBounded(request);
      if(!response.ok)throw new Error('Network response unavailable');
      return response;
    }catch{
      return new Response('Não foi possível carregar o Sistema. Verifique sua conexão e tente novamente.',{
        status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}
      });
    }
  })());
});