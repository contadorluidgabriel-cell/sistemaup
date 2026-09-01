(()=>{
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';
  const VOLUME_KEY='sistemaEvolucao.volumeTargets.v1';
  const HISTORY_KEY='sistemaEvolucao.workoutHistory.v1';
  const SESSION_KEY='sistemaEvolucao.currentSessionIndex.v1';
  const CHECKIN_KEY='sistemaEvolucao.pendingCheckIn.v1';
  const DRAFT_KEY='sistemaEvolucao.activeWorkoutDraft.v1';
  const MANUAL_ADAPT_KEY='sistemaEvolucao.manualMissionAdaptation.v1';

  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const writeJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

  function toast(message){
    const el=document.getElementById('toast');
    if(!el)return;
    el.textContent=message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>el.classList.remove('show'),2400);
  }

  function addSingleDayOption(){
    const select=document.getElementById('profileFrequency');
    if(!select||select.querySelector('option[value="1"]'))return;
    const option=document.createElement('option');
    option.value='1';
    option.textContent='1 dia';
    const firstReal=[...select.options].find(item=>item.value==='2');
    if(firstReal)select.insertBefore(option,firstReal);
    else select.appendChild(option);
  }

  function fixRestTargets(){
    document.querySelectorAll('.execution-exercise').forEach(card=>{
      const text=card.querySelector('.execution-exercise-head p')?.textContent||'';
      const match=text.match(/descanso\s+(\d{2,3})(?:\s*[–-]\s*\d{2,3})?\s*s/i);
      if(match)card.dataset.targetRest=match[1];
    });
  }

  function renderPrescriptionCoverage(){
    const plan=readJSON(PLAN_KEY,null);
    const volume=readJSON(VOLUME_KEY,null);
    const panel=document.querySelector('#prescriptionArchitecture .prescription-panel');
    if(!panel)return;

    let alert=document.getElementById('prescriptionCoverageAlert');
    if(!alert){
      alert=document.createElement('div');
      alert.id='prescriptionCoverageAlert';
      alert.className='engine-alert';
      const sessions=document.getElementById('generatedSessions');
      if(sessions)panel.insertBefore(alert,sessions);
      else panel.appendChild(alert);
    }

    if(!plan?.equivalentVolume||!Array.isArray(volume?.targets)){
      alert.hidden=true;
      return;
    }

    const unmet=volume.targets.filter(target=>Number(plan.equivalentVolume[target.muscle]||0)+0.01<Number(target.min||0));
    if(!unmet.length){
      alert.hidden=true;
      return;
    }

    const details=unmet.map(target=>`${target.muscle}: ${Number(plan.equivalentVolume[target.muscle]||0).toFixed(1).replace('.0','')} / ${target.min}`).join(' · ');
    alert.hidden=false;
    alert.textContent=`PLANO PARCIAL — A configuração atual não permite alcançar todas as faixas iniciais sem forçar exercícios ou volume incompatíveis. ${details}. O Sistema mantém a lacuna visível em vez de fingir que a meta foi atingida.`;
  }

  function realStats(records){
    const workouts=Array.isArray(records)?records:[];
    let sets=0;
    const exercises=new Set();
    let exposures=0;
    workouts.forEach(workout=>{
      (workout.exercises||[]).forEach(exercise=>{
        exposures+=1;
        exercises.add(exercise.id||exercise.name);
        sets+=(exercise.sets||[]).length;
      });
    });
    return {missions:workouts.length,sets,exercises:exercises.size,exposures};
  }

  function syncHomeCampaign(plan,records,currentIndex){
    const section=[...document.querySelectorAll('#view-missao .section')].find(item=>item.querySelector('.kicker')?.textContent.trim().startsWith('CAMPANHA ATIVA'));
    if(!section)return;
    const sessions=plan?.sessions||[];
    const target=5;
    const progress=Math.min(target,records.length);
    const headSmall=section.querySelector('.section-head>small');
    const strong=section.querySelector('.card .campaign-top>strong');
    const next=section.querySelector('.next');
    const bar=section.querySelector('.progress>div');
    if(headSmall)headSmall.textContent=`${progress} / ${target}`;
    if(strong)strong.textContent=progress>=target?'Capítulo concluído. Os dados continuam acumulando sem apagar a conquista.':`Faltam ${target-progress} missão${target-progress===1?'':'ões'} para concluir este capítulo.`;
    if(next&&sessions.length){
      const nextSession=sessions[(currentIndex+1)%sessions.length];
      next.innerHTML=`PRÓXIMA MISSÃO:<br>${nextSession?.label||'A definir'}`;
    }
    if(bar)bar.style.width=`${Math.min(100,(progress/target)*100)}%`;

    const stats=realStats(records);
    const attributes=section.querySelector('.attributes');
    if(attributes){
      attributes.innerHTML=`<div class="attr"><b>${stats.missions}</b><span>Missões</span></div><div class="attr"><b>${stats.sets}</b><span>Séries</span></div><div class="attr"><b>${stats.exercises}</b><span>Exercícios</span></div><div class="attr"><b>${stats.exposures}</b><span>Exposições</span></div>`;
    }
  }

  function syncPlanCycle(plan,currentIndex){
    const section=[...document.querySelectorAll('#view-plano .section')].find(item=>item.querySelector('.kicker')?.textContent.trim()==='CAMPANHA');
    if(!section)return;
    const sessions=plan?.sessions||[];
    const title=section.querySelector('.section-head h2');
    const small=section.querySelector('.section-head>small');
    const list=section.querySelector('.protocol-list');
    if(title)title.textContent='Ciclo atual';
    if(small)small.textContent=sessions.length?`${currentIndex+1} / ${sessions.length}`:'AGUARDA PLANO';
    if(!list)return;
    if(!sessions.length){
      list.innerHTML='<div class="week-empty">Configure o Perfil para gerar o ciclo atual.</div>';
      return;
    }
    list.innerHTML=sessions.map((session,index)=>{
      const state=index===currentIndex?'ATIVA':index<currentIndex?'CONCLUÍDA':'AGUARDA';
      const cls=index===currentIndex?'current':'';
      const muted=index===currentIndex?'':'muted-state';
      return `<article class="card protocol-item ${cls}"><div class="protocol-index">${String(index+1).padStart(2,'0')}</div><div><span class="tag">${index===currentIndex?'MISSÃO ATUAL':'SESSÃO DO CICLO'}</span><strong>${session.label}</strong><p>${session.exercises?.length||0} exercícios prescritos.</p></div><span class="protocol-state ${muted}">${state}</span></article>`;
    }).join('');
  }

  function syncProgressReality(records){
    const stats=realStats(records);
    const top=document.querySelector('#view-progresso .screen-panel');
    const topText=top?.querySelector('.xp-text');
    const topBar=top?.querySelector('.progress>div');
    if(topText)topText.textContent=`${stats.missions} MISSÕES CONCLUÍDAS`;
    if(topBar)topBar.style.width=`${Math.min(100,(stats.missions/5)*100)}%`;

    const attrSection=[...document.querySelectorAll('#view-progresso .section')].find(item=>item.querySelector('.kicker')?.textContent.trim()==='ATRIBUTOS');
    if(attrSection){
      const kicker=attrSection.querySelector('.kicker');
      const small=attrSection.querySelector('.section-head>small');
      const attrs=attrSection.querySelector('.attributes');
      if(kicker)kicker.textContent='REGISTROS';
      if(small)small.textContent='DADOS REAIS';
      if(attrs)attrs.innerHTML=`<div class="attr"><b>${stats.missions}</b><span>Missões</span></div><div class="attr"><b>${stats.sets}</b><span>Séries</span></div><div class="attr"><b>${stats.exercises}</b><span>Exercícios</span></div><div class="attr"><b>${stats.exposures}</b><span>Exposições</span></div>`;
    }

    const analysis=[...document.querySelectorAll('#view-progresso .section')].find(item=>item.querySelector('.kicker')?.textContent.trim()==='ANÁLISE DO SISTEMA');
    const analysisSmall=analysis?.querySelector('.section-head>small');
    if(analysisSmall)analysisSmall.textContent=`${Math.min(3,stats.missions)} / 3 LEITURAS`;
  }

  function neutralizePlaceholderXp(records){
    const missionXp=document.querySelector('#view-missao .mission-title .xp');
    if(missionXp)missionXp.textContent='REGISTRO REAL';
    const statusText=document.querySelector('#view-missao .status .xp-text');
    const statusBar=document.querySelector('#view-missao .status .progress>div');
    const progress=Math.min(5,records.length);
    if(statusText)statusText.textContent=`JORNADA ${progress} / 5 MISSÕES`;
    if(statusBar)statusBar.style.width=`${Math.min(100,(progress/5)*100)}%`;
  }

  function currentSessionIndex(){
    const plan=readJSON(PLAN_KEY,null);
    const sessions=plan?.sessions||[];
    return sessions.length?Math.max(0,Number(localStorage.getItem(SESSION_KEY)||0))%sessions.length:0;
  }

  function captureDraft(){
    const button=document.getElementById('startBtn');
    if(!button||button.dataset.state!=='active')return;
    const cards=[...document.querySelectorAll('#exerciseList .execution-exercise')];
    if(!cards.length)return;
    const draft={
      version:1,
      sessionIndex:currentSessionIndex(),
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
  }

  function restoreDraft(){
    const button=document.getElementById('startBtn');
    if(button?.dataset.state&&button.dataset.state!=='idle')return;
    const draft=readJSON(DRAFT_KEY,null);
    if(!draft?.exercises?.length)return;
    const age=Date.now()-new Date(draft.savedAt||0).getTime();
    if(!Number.isFinite(age)||age>12*60*60*1000||draft.sessionIndex!==currentSessionIndex()){
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    const cards=[...document.querySelectorAll('#exerciseList .execution-exercise')];
    if(!cards.length)return;

    let restored=0;
    cards.forEach(card=>{
      const saved=draft.exercises.find(item=>item.id===card.dataset.exerciseId);
      if(!saved)return;
      restored+=1;
      const rows=[...card.querySelectorAll('.set-log-row')];
      rows.forEach((row,index)=>{
        const set=saved.sets?.[index];
        if(!set)return;
        const load=row.querySelector('.set-load');
        const reps=row.querySelector('.set-reps');
        const rir=row.querySelector('.set-rir');
        const done=row.querySelector('.set-done');
        if(load)load.value=set.load||'';
        if(reps)reps.value=set.reps??'';
        if(rir)rir.value=set.rir??'';
        row.classList.toggle('completed',Boolean(set.completed));
        if(done)done.textContent=set.completed?'✓':'○';
      });
      const discomfort=card.querySelector('.exercise-discomfort');
      if(discomfort)discomfort.value=saved.discomfort||'none';
      const note=card.querySelector('.exercise-note-input');
      if(note)note.value=saved.note||'';
    });

    if(restored){
      const intro=document.querySelector('#exerciseList .execution-intro');
      if(intro)intro.innerHTML='<span class="screen-label">TREINO INTERROMPIDO DETECTADO</span><p>Seu registro parcial foi restaurado. Toque em RETOMAR MISSÃO, confirme como você está agora e continue de onde parou.</p>';
      if(button?.dataset.state==='idle')button.textContent='RETOMAR MISSÃO';
    }
  }

  function updateStructureAfterOmission(){
    const cards=[...document.querySelectorAll('#exerciseList .execution-exercise')];
    const sets=cards.reduce((sum,card)=>sum+card.querySelectorAll('.set-log-row').length,0);
    const structure=document.querySelector('#view-missao .mission .structure');
    if(structure)structure.textContent=`MISSÃO ADAPTADA · ${cards.length} exercícios · ${sets} séries diretas`;
  }

  function ensureTemporaryAdaptModal(){
    if(document.getElementById('temporaryAdaptModal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div class="modal-backdrop" id="temporaryAdaptModal" hidden>
        <div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="temporaryAdaptTitle">
          <div class="kicker">◆ ADAPTAÇÃO TEMPORÁRIA</div>
          <h2 id="temporaryAdaptTitle">Qual exercício ficou inviável?</h2>
          <p class="muted">A alteração vale apenas para a missão atual. O Sistema não inventa uma substituição incompatível sem saber qual equipamento ou movimento realmente está disponível.</p>
          <div class="reason-grid" id="temporaryAdaptChoices"></div>
          <button class="modal-close" id="closeTemporaryAdapt">CANCELAR</button>
        </div>
      </div>`);
    const modal=document.getElementById('temporaryAdaptModal');
    const close=()=>{modal.hidden=true;document.body.classList.remove('modal-open');};
    document.getElementById('closeTemporaryAdapt')?.addEventListener('click',close);
    modal?.addEventListener('click',event=>{if(event.target===modal)close();});
    document.getElementById('temporaryAdaptChoices')?.addEventListener('click',event=>{
      const option=event.target.closest('[data-omit-exercise]');
      if(!option)return;
      const cards=[...document.querySelectorAll('#exerciseList .execution-exercise')];
      if(cards.length<=1){toast('A missão precisa manter ao menos um exercício.');return;}
      const id=option.dataset.omitExercise;
      const card=cards.find(item=>item.dataset.exerciseId===id);
      if(!card)return;
      const name=card.dataset.name||card.querySelector('.execution-exercise-head strong')?.textContent||'Exercício';
      const reason=modal.dataset.reason||'Exercício inviável hoje';
      const adaptation=readJSON(MANUAL_ADAPT_KEY,{version:1,items:[]});
      adaptation.items=Array.isArray(adaptation.items)?adaptation.items:[];
      adaptation.items.push({id,name,reason,recordedAt:new Date().toISOString()});
      adaptation.updatedAt=new Date().toISOString();
      writeJSON(MANUAL_ADAPT_KEY,adaptation);
      card.remove();
      updateStructureAfterOmission();
      close();
      toast(`${name} removido somente desta missão.`);
      captureDraft();
    });
  }

  function openTemporaryAdapt(reason){
    ensureTemporaryAdaptModal();
    const modal=document.getElementById('temporaryAdaptModal');
    const choices=document.getElementById('temporaryAdaptChoices');
    const cards=[...document.querySelectorAll('#exerciseList .execution-exercise')];
    if(!modal||!choices)return;
    if(!cards.length){toast('Gere uma missão antes de adaptar exercícios.');return;}
    modal.dataset.reason=reason;
    choices.innerHTML=cards.map((card,index)=>`<button type="button" data-omit-exercise="${card.dataset.exerciseId}"><strong>${card.dataset.name||'Exercício'}</strong><br><small>${index===0?'PRIMEIRO NA PRESCRIÇÃO · confirme antes de remover':'Remover somente da missão atual'}</small></button>`).join('');
    modal.hidden=false;
    document.body.classList.add('modal-open');
  }

  function prefillCheckin(field,value){
    const start=document.getElementById('startBtn');
    if(!start)return;
    start.click();
    setTimeout(()=>{
      const input=document.getElementById(field);
      if(!input)return;
      input.value=value;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    },40);
  }

  function attachManualAdaptation(){
    const adaptation=readJSON(MANUAL_ADAPT_KEY,null);
    if(!adaptation?.items?.length)return;
    const records=readJSON(HISTORY_KEY,[]);
    if(!Array.isArray(records)||!records.length)return;
    const last=records[records.length-1];
    const completedAt=new Date(last.completedAt||0).getTime();
    if(!completedAt||Date.now()-completedAt>10000)return;
    last.manualAdaptation=adaptation;
    writeJSON(HISTORY_KEY,records);
    localStorage.removeItem(MANUAL_ADAPT_KEY);
  }

  function syncAll(){
    addSingleDayOption();
    fixRestTargets();
    renderPrescriptionCoverage();
    const plan=readJSON(PLAN_KEY,null);
    const records=readJSON(HISTORY_KEY,[]);
    const sessions=plan?.sessions||[];
    const currentIndex=sessions.length?Math.max(0,Number(localStorage.getItem(SESSION_KEY)||0))%sessions.length:0;
    syncHomeCampaign(plan,records,currentIndex);
    syncPlanCycle(plan,currentIndex);
    syncProgressReality(records);
    neutralizePlaceholderXp(records);
    restoreDraft();
  }

  let draftTimer=null;
  const scheduleDraft=()=>{
    clearTimeout(draftTimer);
    draftTimer=setTimeout(captureDraft,180);
  };

  document.addEventListener('input',event=>{
    if(event.target.closest('#exerciseList'))scheduleDraft();
  });
  document.addEventListener('change',event=>{
    if(event.target.closest('#exerciseList'))scheduleDraft();
  });

  document.addEventListener('click',event=>{
    const reasonButton=event.target.closest('[data-reason]');
    if(reasonButton){
      const reason=reasonButton.dataset.reason||'';
      if(reason==='Menos tempo disponível')setTimeout(()=>prefillCheckin('checkinTime','30'),0);
      else if(reason==='Energia abaixo do normal')setTimeout(()=>prefillCheckin('checkinEnergy','low'),0);
      else if(reason==='Desconforto ou limitação')setTimeout(()=>prefillCheckin('checkinCondition','mild'),0);
      else if(reason==='Equipamento indisponível'||reason==='Exercício inviável hoje')setTimeout(()=>openTemporaryAdapt(reason),0);
      else if(reason==='Outro contexto')setTimeout(()=>prefillCheckin('checkinEnergy','normal'),0);
    }

    if(event.target.closest('.set-done'))setTimeout(scheduleDraft,20);

    const start=event.target.closest('#startBtn');
    if(start){
      setTimeout(()=>{
        if(start.dataset.state==='active')captureDraft();
        if(start.dataset.state==='done'){
          attachManualAdaptation();
          localStorage.removeItem(DRAFT_KEY);
          setTimeout(syncAll,120);
        }
      },120);
    }
    if(event.target.closest('#closeCompletion'))setTimeout(syncAll,180);
  });

  document.getElementById('profileForm')?.addEventListener('submit',()=>{
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(MANUAL_ADAPT_KEY);
    setTimeout(syncAll,240);
  });
  window.addEventListener('storage',syncAll);

  const observer=new MutationObserver(()=>{
    fixRestTargets();
    renderPrescriptionCoverage();
    restoreDraft();
  });
  const exerciseList=document.getElementById('exerciseList');
  if(exerciseList)observer.observe(exerciseList,{childList:true,subtree:true});

  ensureTemporaryAdaptModal();
  syncAll();
})();