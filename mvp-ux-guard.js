(()=>{
  const PROFILE_KEY='sistemaEvolucao.playerProfile.v1';
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';
  const SESSION_KEY='sistemaEvolucao.currentSessionIndex.v1';
  const CHECKIN_KEY='sistemaEvolucao.pendingCheckIn.v1';
  const DRAFT_KEY='sistemaEvolucao.activeWorkoutDraft.v1';

  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const writeJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

  function realPlan(){
    const plan=readJSON(PLAN_KEY,null);
    return plan&&Array.isArray(plan.sessions)&&plan.sessions.length?plan:null;
  }

  function bindFirstAccessCta(start){
    if(!start||start.dataset.firstAccessBound==='true')return;
    start.dataset.firstAccessBound='true';
    start.addEventListener('click',event=>{
      if(realPlan()||start.dataset.state!=='blocked')return;
      event.preventDefault();
      event.stopImmediatePropagation();
      location.hash='#perfil';
    },true);
  }

  function neutralizeFirstAccess(){
    const savedProfile=readJSON(PROFILE_KEY,null);
    const plan=realPlan();
    const adapt=document.getElementById('adaptBtn');

    if(!savedProfile){
      const player=document.getElementById('playerNameDisplay');
      const profileName=document.getElementById('profileNameDisplay');
      const input=document.getElementById('profileName');
      if(player&&player.textContent!=='Jogador')player.textContent='Jogador';
      if(profileName&&profileName.textContent!=='Jogador')profileName.textContent='Jogador';
      if(input&&input.value==='Luid')input.value='';
    }

    if(plan){
      if(adapt)adapt.disabled=false;
      return;
    }

    const list=document.getElementById('exerciseList');
    const title=document.querySelector('#view-missao .mission-title h2');
    const structure=document.querySelector('#view-missao .mission .structure');
    const start=document.getElementById('startBtn');
    const missionXp=document.querySelector('#view-missao .mission-title .xp');
    const empty='<div class="week-empty" data-first-access-guard="true">Configure objetivo, rotina, dias disponíveis, experiência e equipamentos no Perfil. Nenhum treino genérico será mostrado antes disso.</div>';

    if(title&&title.textContent!=='Primeira missão bloqueada')title.textContent='Primeira missão bloqueada';
    if(structure&&structure.textContent!=='O Sistema precisa conhecer seu contexto antes de prescrever musculação.')structure.textContent='O Sistema precisa conhecer seu contexto antes de prescrever musculação.';
    if(missionXp&&missionXp.textContent!=='AGUARDA PERFIL')missionXp.textContent='AGUARDA PERFIL';
    if(list&&!list.querySelector('[data-first-access-guard="true"]'))list.innerHTML=empty;
    if(start){
      start.disabled=false;
      if(start.textContent!=='CONFIGURAR PERFIL')start.textContent='CONFIGURAR PERFIL';
      start.dataset.state='blocked';
      bindFirstAccessCta(start);
    }
    if(adapt)adapt.disabled=true;
  }

  function snapshotWorkout(){
    const plan=realPlan();
    const button=document.getElementById('startBtn');
    if(!plan||button?.dataset.state!=='active')return false;
    const cards=[...document.querySelectorAll('#exerciseList .execution-exercise')];
    if(!cards.length)return false;
    const currentIndex=Math.max(0,Number(localStorage.getItem(SESSION_KEY)||0))%plan.sessions.length;
    const draft={
      version:1,
      sessionIndex:currentIndex,
      savedAt:new Date().toISOString(),
      checkIn:readJSON(CHECKIN_KEY,null),
      exercises:cards.map(card=>({
        id:card.dataset.exerciseId,
        discomfort:card.querySelector('.exercise-discomfort')?.value||'none',
        note:card.querySelector('.exercise-note-input')?.value||'',
        sets:[...card.querySelectorAll('.set-log-row')].map(row=>({
          load:row.querySelector('.set-load')?.value||'',
          reps:row.querySelector('.set-reps')?.value||'',
          rir:row.querySelector('.set-rir')?.value||'',
          completed:row.classList.contains('completed')
        }))
      }))
    };
    writeJSON(DRAFT_KEY,draft);
    return true;
  }

  function ensurePauseButton(){
    const hud=document.getElementById('trainingHud');
    if(!hud||document.getElementById('pauseTraining'))return;
    const minimize=document.getElementById('minimizeTraining');
    const button=document.createElement('button');
    button.type='button';
    button.id='pauseTraining';
    button.className='training-minimize training-pause';
    button.textContent='PAUSAR E SAIR';
    if(minimize)hud.insertBefore(button,minimize);
    else hud.appendChild(button);

    let armed=false;
    let timer=null;
    button.addEventListener('click',()=>{
      if(!document.body.classList.contains('training-mode-active'))return;
      if(!armed){
        armed=true;
        button.textContent='CONFIRMAR PAUSA';
        clearTimeout(timer);
        timer=setTimeout(()=>{armed=false;button.textContent='PAUSAR E SAIR';},2600);
        return;
      }
      if(snapshotWorkout()){
        button.textContent='SALVANDO...';
        setTimeout(()=>location.reload(),80);
      }
    });
  }

  function planSignature(plan){
    if(!plan?.sessions?.length)return '';
    return JSON.stringify(plan.sessions.map(session=>({
      label:session.label,
      exercises:(session.exercises||[]).map(ex=>({id:ex.id,sets:ex.sets,reps:ex.reps,rir:ex.rir,rest:ex.rest}))
    })));
  }

  function protectSessionFromCosmeticProfileEdits(){
    const form=document.getElementById('profileForm');
    if(!form||form.dataset.sessionGuard==='true')return;
    form.dataset.sessionGuard='true';

    form.addEventListener('submit',()=>{
      const beforePlan=realPlan();
      if(!beforePlan)return;
      const beforeSignature=planSignature(beforePlan);
      const beforeIndex=Math.max(0,Number(localStorage.getItem(SESSION_KEY)||0))%beforePlan.sessions.length;

      setTimeout(()=>{
        const afterPlan=realPlan();
        if(!afterPlan||!afterPlan.sessions.length)return;
        const afterSignature=planSignature(afterPlan);
        if(beforeSignature!==afterSignature)return;
        const restoredIndex=Math.min(beforeIndex,afterPlan.sessions.length-1);
        localStorage.setItem(SESSION_KEY,String(restoredIndex));
        if(restoredIndex>0)setTimeout(()=>location.reload(),60);
      },360);
    },true);
  }

  function apply(){
    neutralizeFirstAccess();
    ensurePauseButton();
    protectSessionFromCosmeticProfileEdits();
  }

  const observer=new MutationObserver(()=>{
    ensurePauseButton();
    if(!realPlan())neutralizeFirstAccess();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  document.getElementById('profileForm')?.addEventListener('submit',()=>setTimeout(apply,500));
  apply();
})();