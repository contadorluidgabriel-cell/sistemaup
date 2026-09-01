(()=>{
  const PROFILE_KEY='sistemaEvolucao.playerProfile.v1';
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';
  const HISTORY_KEY='sistemaEvolucao.workoutHistory.v1';
  const NEXT_KEY='sistemaEvolucao.nextExerciseTargets.v1';
  const SESSION_KEY='sistemaEvolucao.currentSessionIndex.v1';
  const ONBOARDING_KEY='sistemaEvolucao.onboarding.v1';
  const DRAFT_KEY='sistemaEvolucao.activeWorkoutDraft.v1';
  const META_KEY='sistemaEvolucao.cloudMeta.v1';
  const config=window.SISTEMA_SUPABASE||{};
  let client=null;
  let session=null;
  let syncTimer=null;

  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const writeJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

  function addStyles(){
    if(document.querySelector('link[href="cloud-sync.css"]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='cloud-sync.css';
    document.head.appendChild(link);
  }

  function configured(){
    return Boolean(config.enabled&&config.url&&config.publishableKey);
  }

  function stateSyncBlocked(){
    return document.body.classList.contains('training-mode-active')||Boolean(readJSON(DRAFT_KEY,null));
  }

  function toast(message){
    const el=document.getElementById('toast');
    if(!el)return;
    el.textContent=message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>el.classList.remove('show'),2600);
  }

  function ensurePanel(){
    if(!configured()||document.getElementById('cloudAccountPanel'))return;
    const profile=document.getElementById('view-perfil');
    if(!profile)return;
    const anchor=document.getElementById('appProfileTools')||profile.querySelector('.profile-panel');
    const panel=document.createElement('section');
    panel.id='cloudAccountPanel';
    panel.className='cloud-account-panel panel';
    panel.innerHTML=`
      <div class="cloud-account-head"><div><span class="screen-label">CONTA E SINCRONIZAÇÃO</span><strong id="cloudAccountTitle">Conecte seu Sistema</strong><p id="cloudAccountText">Seu treino continua local. A conta adiciona backup de perfil, plano, histórico e progressões.</p></div><span class="cloud-state" id="cloudState">OFFLINE</span></div>
      <form class="cloud-auth-form" id="cloudAuthForm">
        <label><span>E-MAIL</span><input id="cloudEmail" type="email" autocomplete="email" required placeholder="voce@email.com"></label>
        <label><span>SENHA</span><input id="cloudPassword" type="password" autocomplete="current-password" minlength="6" required placeholder="Mínimo de 6 caracteres"></label>
        <div class="cloud-auth-actions"><button type="submit" class="start" id="cloudLogin">ENTRAR</button><button type="button" class="ghost-action" id="cloudCreate">CRIAR CONTA</button></div>
      </form>
      <div class="cloud-session" id="cloudSession" hidden>
        <div><span>CONTA</span><strong id="cloudUserEmail">—</strong><small id="cloudLastSync">Ainda não sincronizado</small></div>
        <div class="cloud-session-actions"><button type="button" class="ghost-action" id="cloudSyncNow">SINCRONIZAR AGORA</button><button type="button" class="cloud-logout" id="cloudLogout">SAIR</button></div>
      </div>
      <p class="cloud-local-note">Missões em andamento ou pausadas permanecem somente neste aparelho até a conclusão, evitando duas execuções concorrentes do mesmo treino.</p>`;
    if(anchor)anchor.insertAdjacentElement('afterend',panel);else profile.prepend(panel);
    bindPanel();
  }

  function setBusy(busy){
    document.querySelectorAll('#cloudAccountPanel button,#cloudAccountPanel input').forEach(el=>el.disabled=busy);
  }

  function setStatus(label,text){
    const state=document.getElementById('cloudState');
    if(state)state.textContent=label;
    if(text){const output=document.getElementById('cloudAccountText');if(output)output.textContent=text;}
  }

  function renderSession(){
    const form=document.getElementById('cloudAuthForm');
    const box=document.getElementById('cloudSession');
    const title=document.getElementById('cloudAccountTitle');
    if(!form||!box)return;
    const user=session?.user||null;
    form.hidden=Boolean(user);
    box.hidden=!user;
    if(user){
      if(title)title.textContent='Sistema conectado';
      const email=document.getElementById('cloudUserEmail');
      if(email)email.textContent=user.email||'Conta autenticada';
      const blocked=stateSyncBlocked();
      setStatus(navigator.onLine?'CONECTADO':'OFFLINE',blocked?'Missão local preservada. A sincronização de estado continua depois da conclusão.':'Dados locais preservados. A nuvem sincroniza quando houver conexão.');
      const meta=readJSON(META_KEY,{});
      const last=document.getElementById('cloudLastSync');
      if(last)last.textContent=meta.lastSync?`Última sincronização: ${new Date(meta.lastSync).toLocaleString('pt-BR')}`:'Ainda não sincronizado';
    }else{
      if(title)title.textContent='Conecte seu Sistema';
      setStatus(navigator.onLine?'PRONTO':'OFFLINE','Seu treino continua local. A conta adiciona backup e sincronização entre aparelhos.');
    }
  }

  async function loadClient(){
    if(client||!configured())return client;
    const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    client=mod.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data}=await client.auth.getSession();
    session=data?.session||null;
    client.auth.onAuthStateChange((_event,next)=>{
      session=next;
      renderSession();
      if(session)scheduleSync(250);
    });
    return client;
  }

  function workoutId(record,index){
    if(record?.id)return String(record.id);
    return `legacy-${record?.completedAt||'unknown'}-${index}`;
  }

  function localCloudState(){
    return {
      plan:readJSON(PLAN_KEY,null),
      nextTargets:readJSON(NEXT_KEY,null),
      sessionIndex:Number(localStorage.getItem(SESSION_KEY)||0),
      onboarding:readJSON(ONBOARDING_KEY,null),
      version:1
    };
  }

  async function pushLocal(){
    if(!client||!session?.user)return;
    const userId=session.user.id;
    const now=new Date().toISOString();
    const profile=readJSON(PROFILE_KEY,null);
    if(profile){
      const {error}=await client.from('muscle_profiles').upsert({user_id:userId,profile,updated_at:now},{onConflict:'user_id'});
      if(error)throw error;
    }

    if(!stateSyncBlocked()){
      const state=localCloudState();
      if(state.plan||state.nextTargets||state.onboarding){
        const {error}=await client.from('muscle_state').upsert({user_id:userId,state,updated_at:now},{onConflict:'user_id'});
        if(error)throw error;
      }
    }

    const history=readJSON(HISTORY_KEY,[]);
    if(Array.isArray(history)&&history.length){
      const rows=history.map((record,index)=>({user_id:userId,workout_id:workoutId(record,index),completed_at:record.completedAt||now,payload:record,updated_at:now}));
      const {error}=await client.from('workout_records').upsert(rows,{onConflict:'user_id,workout_id'});
      if(error)throw error;
    }
  }

  function restoreMissingState(remoteState){
    if(!remoteState||stateSyncBlocked())return false;
    let changed=false;
    if(!readJSON(PLAN_KEY,null)&&remoteState.plan){writeJSON(PLAN_KEY,remoteState.plan);changed=true;}
    if(!readJSON(NEXT_KEY,null)&&remoteState.nextTargets){writeJSON(NEXT_KEY,remoteState.nextTargets);changed=true;}
    if(!readJSON(ONBOARDING_KEY,null)&&remoteState.onboarding){writeJSON(ONBOARDING_KEY,remoteState.onboarding);changed=true;}
    if(localStorage.getItem(SESSION_KEY)===null&&Number.isFinite(Number(remoteState.sessionIndex))){localStorage.setItem(SESSION_KEY,String(Math.max(0,Number(remoteState.sessionIndex))));changed=true;}
    return changed;
  }

  async function pullRemote(){
    if(!client||!session?.user)return false;
    const userId=session.user.id;
    let restored=false;
    const localProfile=readJSON(PROFILE_KEY,null);
    if(!localProfile){
      const {data,error}=await client.from('muscle_profiles').select('profile').eq('user_id',userId).maybeSingle();
      if(error)throw error;
      if(data?.profile){writeJSON(PROFILE_KEY,data.profile);restored=true;}
    }

    if(!stateSyncBlocked()){
      const {data,error}=await client.from('muscle_state').select('state').eq('user_id',userId).maybeSingle();
      if(error)throw error;
      if(data?.state&&restoreMissingState(data.state))restored=true;
    }

    const {data:remote,error}=await client.from('workout_records').select('workout_id,payload,completed_at').eq('user_id',userId).order('completed_at',{ascending:true});
    if(error)throw error;
    const local=readJSON(HISTORY_KEY,[]);
    const merged=new Map();
    (Array.isArray(local)?local:[]).forEach((record,index)=>merged.set(workoutId(record,index),record));
    (remote||[]).forEach(row=>{if(row?.workout_id&&row?.payload)merged.set(String(row.workout_id),row.payload);});
    const combined=[...merged.values()].sort((a,b)=>new Date(a.completedAt||0)-new Date(b.completedAt||0));
    const previousLength=Array.isArray(local)?local.length:0;
    if(combined.length){writeJSON(HISTORY_KEY,combined);if(combined.length!==previousLength)restored=true;}
    return restored;
  }

  async function synchronize({silent=false}={}){
    if(!configured()||!navigator.onLine)return;
    try{
      await loadClient();
      if(!session?.user)return;
      setStatus('SINCRONIZANDO');
      const restored=await pullRemote();
      await pushLocal();
      const meta={lastSync:new Date().toISOString(),userId:session.user.id,stateProtected:stateSyncBlocked()};
      writeJSON(META_KEY,meta);
      renderSession();
      window.dispatchEvent(new CustomEvent('sistema:cloud-synced',{detail:{restored,stateProtected:meta.stateProtected}}));
      if(!silent)toast(meta.stateProtected?'Histórico sincronizado. Missão atual permanece local.':'Sistema sincronizado com a nuvem.');
    }catch(error){
      console.error('[Sistema Cloud]',error);
      setStatus('ERRO','O treino local continua seguro. A sincronização será tentada novamente.');
      if(!silent)toast('Não foi possível sincronizar agora.');
    }
  }

  function scheduleSync(delay=700){
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>synchronize({silent:true}),delay);
  }

  async function login(email,password){
    setBusy(true);
    try{
      await loadClient();
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;
      session=data.session;
      renderSession();
      await synchronize();
    }catch(error){
      toast(error?.message||'Não foi possível entrar.');
    }finally{setBusy(false);}
  }

  async function createAccount(email,password){
    setBusy(true);
    try{
      await loadClient();
      const {data,error}=await client.auth.signUp({email,password});
      if(error)throw error;
      session=data.session||null;
      renderSession();
      if(session){await synchronize();}
      else toast('Conta criada. Confirme seu e-mail para entrar.');
    }catch(error){
      toast(error?.message||'Não foi possível criar a conta.');
    }finally{setBusy(false);}
  }

  function bindPanel(){
    document.getElementById('cloudAuthForm')?.addEventListener('submit',event=>{
      event.preventDefault();
      const email=document.getElementById('cloudEmail')?.value.trim();
      const password=document.getElementById('cloudPassword')?.value||'';
      if(email&&password)login(email,password);
    });
    document.getElementById('cloudCreate')?.addEventListener('click',()=>{
      const email=document.getElementById('cloudEmail')?.value.trim();
      const password=document.getElementById('cloudPassword')?.value||'';
      if(email&&password)createAccount(email,password);else toast('Informe e-mail e senha para criar a conta.');
    });
    document.getElementById('cloudSyncNow')?.addEventListener('click',()=>synchronize());
    document.getElementById('cloudLogout')?.addEventListener('click',async()=>{
      if(!client)return;
      await client.auth.signOut();
      session=null;
      renderSession();
      toast('Conta desconectada. Seus dados locais permanecem neste aparelho.');
    });
  }

  async function boot(){
    if(!configured())return;
    addStyles();
    ensurePanel();
    try{await loadClient();renderSession();if(session)scheduleSync(400);}catch(error){console.error('[Sistema Cloud] Falha ao iniciar',error);setStatus('OFFLINE');}
  }

  document.addEventListener('submit',event=>{if(event.target?.id==='profileForm')scheduleSync(900);});
  document.addEventListener('click',event=>{if(event.target.closest('#closeCompletion'))scheduleSync(500);});
  window.addEventListener('online',()=>scheduleSync(300));
  window.addEventListener('offline',()=>renderSession());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleSync(500);});
  window.SistemaCloud={sync:synchronize,isConfigured:configured,getSession:()=>session};
  boot();
})();
