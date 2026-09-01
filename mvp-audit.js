(()=>{
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';
  const VOLUME_KEY='sistemaEvolucao.volumeTargets.v1';
  const HISTORY_KEY='sistemaEvolucao.workoutHistory.v1';
  const SESSION_KEY='sistemaEvolucao.currentSessionIndex.v1';

  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};

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
    const progress=Math.min(target,records.length%target||Math.min(records.length,target));
    const headSmall=section.querySelector('.section-head>small');
    const strong=section.querySelector('.card .campaign-top>strong');
    const next=section.querySelector('.next');
    const bar=section.querySelector('.progress>div');
    if(headSmall)headSmall.textContent=`${progress} / ${target}`;
    if(strong)strong.textContent=progress>=target?'Capítulo concluído. O próximo ciclo começa com os dados acumulados.':`Faltam ${target-progress} missão${target-progress===1?'':'ões'} para concluir este capítulo.`;
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
    if(missionXp){missionXp.textContent='REGISTRO REAL';}
    const statusText=document.querySelector('#view-missao .status .xp-text');
    const statusBar=document.querySelector('#view-missao .status .progress>div');
    const progress=Math.min(5,records.length%5||Math.min(records.length,5));
    if(statusText)statusText.textContent=`JORNADA ${progress} / 5 MISSÕES`;
    if(statusBar)statusBar.style.width=`${Math.min(100,(progress/5)*100)}%`;
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
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('#startBtn')||event.target.closest('#closeCompletion'))setTimeout(syncAll,180);
  });
  document.getElementById('profileForm')?.addEventListener('submit',()=>setTimeout(syncAll,240));
  window.addEventListener('storage',syncAll);

  const observer=new MutationObserver(()=>{
    fixRestTargets();
    renderPrescriptionCoverage();
  });
  const exerciseList=document.getElementById('exerciseList');
  if(exerciseList)observer.observe(exerciseList,{childList:true,subtree:true});

  syncAll();
})();