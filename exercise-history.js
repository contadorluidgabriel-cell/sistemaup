const exerciseHistoryStyles=document.createElement('link');
exerciseHistoryStyles.rel='stylesheet';
exerciseHistoryStyles.href='exercise-history.css';
document.head.appendChild(exerciseHistoryStyles);

(()=>{
  const HISTORY_KEY='sistemaEvolucao.workoutHistory.v1';
  const NEXT_KEY='sistemaEvolucao.nextExerciseTargets.v1';
  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const writeJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));

  function history(){
    const data=readJSON(HISTORY_KEY,[]);
    return Array.isArray(data)?data:[];
  }

  function numericLoad(value){
    const match=String(value||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  }

  function exerciseIndex(){
    const map=new Map();
    history().forEach(workout=>{
      (workout.exercises||[]).forEach(exercise=>{
        if(!exercise?.id)return;
        if(!map.has(exercise.id))map.set(exercise.id,{id:exercise.id,name:exercise.name||'Exercício',primary:exercise.primary||'',exposures:[]});
        const entry=map.get(exercise.id);
        if(exercise.name)entry.name=exercise.name;
        if(exercise.primary)entry.primary=exercise.primary;
        entry.exposures.push({...exercise,completedAt:workout.completedAt,sessionLabel:workout.sessionLabel});
      });
    });
    return map;
  }

  function totalReps(exposure){return (exposure?.sets||[]).reduce((sum,set)=>sum+Number(set.reps||0),0);}
  function avgRir(exposure){
    const sets=exposure?.sets||[];
    if(!sets.length)return null;
    return sets.reduce((sum,set)=>sum+Number(set.rir||0),0)/sets.length;
  }
  function maxNumericLoad(exposure){
    const values=(exposure?.sets||[]).map(set=>numericLoad(set.load)).filter(value=>value!==null);
    return values.length?Math.max(...values):null;
  }
  function loadSignature(exposure){return (exposure?.sets||[]).map(set=>String(set.load||'').trim()).join('|');}

  function statusFor(exposures,nextAdvice){
    const latest=exposures[exposures.length-1];
    if(!latest)return {state:'SEM DADOS',text:'Ainda não existe execução registrada.'};
    if(latest.discomfort==='significant')return {state:'ADAPTAR',text:'Última exposição teve desconforto relevante. Progressão fica bloqueada até reavaliação.'};
    if(latest.discomfort==='mild')return {state:'OBSERVAR',text:'Última exposição teve incômodo leve. Mantenha atenção antes de aumentar dificuldade.'};
    if(nextAdvice?.state==='PROGRESSÃO DISPONÍVEL')return {state:'EVOLUINDO',text:'Critério de progressão atingido e confirmado.'};
    if(exposures.length<2)return {state:'SEM DADOS',text:'Uma exposição registrada. O Sistema precisa de comparação antes de concluir tendência.'};

    const previous=exposures[exposures.length-2];
    const currentLoad=maxNumericLoad(latest);
    const previousLoad=maxNumericLoad(previous);
    const currentReps=totalReps(latest);
    const previousReps=totalReps(previous);

    if(currentLoad!==null&&previousLoad!==null&&currentLoad>previousLoad&&currentReps>=previousReps-2){
      return {state:'EVOLUINDO',text:'A resistência aumentou com desempenho global preservado.'};
    }
    if(loadSignature(latest)===loadSignature(previous)&&currentReps>previousReps){
      return {state:'EVOLUINDO',text:`Mesma resistência com +${currentReps-previousReps} repetição(ões) totais.`};
    }
    if(currentReps<previousReps-2)return {state:'OBSERVAR',text:'Desempenho caiu em relação à última exposição. Uma sessão isolada não define regressão.'};
    return {state:'ESTÁVEL',text:'Desempenho recente semelhante. O Sistema mantém a referência e continua observando.'};
  }

  function latestSummary(exposure){
    if(!exposure)return 'Sem execução registrada';
    const reps=(exposure.sets||[]).map(set=>set.reps).join(' / ');
    const loads=[...new Set((exposure.sets||[]).map(set=>String(set.load||'').trim()).filter(Boolean))];
    const load=loads.length===1?loads[0]:loads.length>1?'resistência variável':'resistência não informada';
    return `${load} · ${reps||'—'} reps`;
  }

  function recordsFor(exposures){
    let highestLoad=null;
    let highestLoadText='—';
    let bestSingleSet=0;
    exposures.forEach(exposure=>{
      (exposure.sets||[]).forEach(set=>{
        const load=numericLoad(set.load);
        if(load!==null&&(highestLoad===null||load>highestLoad)){
          highestLoad=load;
          highestLoadText=String(set.load||load);
        }
        bestSingleSet=Math.max(bestSingleSet,Number(set.reps||0));
      });
    });
    return {highestLoadText,bestSingleSet:bestSingleSet||'—',count:exposures.length};
  }

  function ensureProgressSection(){
    if(document.getElementById('exerciseHistorySection'))return;
    const progress=document.getElementById('view-progresso');
    if(!progress)return;
    const historySection=[...progress.querySelectorAll('.section')].find(section=>section.querySelector('.kicker')?.textContent.trim()==='HISTÓRICO');
    const html=`<section class="section" id="exerciseHistorySection">
      <div class="section-head"><div><div class="kicker">EXERCÍCIOS ACOMPANHADOS</div><h2>Fichas de evolução</h2></div><small id="exerciseHistoryCount">0 EXERCÍCIOS</small></div>
      <p class="muted note">Aqui aparecem somente exercícios realmente executados. Cada ficha reúne exposições, recordes e a próxima orientação do Sistema.</p>
      <div class="exercise-history-grid" id="exerciseHistoryGrid"><div class="card exercise-history-empty">Conclua uma missão para iniciar as fichas individuais.</div></div>
    </section>`;
    if(historySection)historySection.insertAdjacentHTML('afterend',html);
    else progress.insertAdjacentHTML('beforeend',html);
  }

  function ensureModal(){
    if(document.getElementById('exerciseHistoryModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="exercise-history-modal" id="exerciseHistoryModal" hidden>
      <div class="exercise-history-sheet panel" role="dialog" aria-modal="true" aria-labelledby="exerciseHistoryTitle">
        <button class="exercise-history-close" id="exerciseHistoryClose" type="button">FECHAR</button>
        <div class="kicker">◆ FICHA DO EXERCÍCIO</div>
        <h2 id="exerciseHistoryTitle">Exercício</h2>
        <p class="muted" id="exerciseHistoryMeta">Histórico individual</p>
        <div id="exerciseHistoryBody"></div>
      </div>
    </div>`);
    const modal=document.getElementById('exerciseHistoryModal');
    const close=()=>{modal.hidden=true;document.body.classList.remove('exercise-history-open');};
    document.getElementById('exerciseHistoryClose')?.addEventListener('click',close);
    modal?.addEventListener('click',event=>{if(event.target===modal)close();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)close();});
  }

  function renderIndex(){
    ensureProgressSection();
    const grid=document.getElementById('exerciseHistoryGrid');
    if(!grid)return;
    const entries=[...exerciseIndex().values()];
    const next=readJSON(NEXT_KEY,{});
    document.getElementById('exerciseHistoryCount').textContent=`${entries.length} EXERCÍCIO${entries.length===1?'':'S'}`;
    if(!entries.length){
      grid.innerHTML='<div class="card exercise-history-empty">Conclua uma missão para iniciar as fichas individuais.</div>';
      return;
    }
    entries.sort((a,b)=>new Date(b.exposures[b.exposures.length-1]?.completedAt||0)-new Date(a.exposures[a.exposures.length-1]?.completedAt||0));
    grid.innerHTML=entries.map(entry=>{
      const latest=entry.exposures[entry.exposures.length-1];
      const status=statusFor(entry.exposures,next[entry.id]);
      return `<button class="card exercise-history-card" type="button" data-open-exercise-history="${esc(entry.id)}" data-fallback-name="${esc(entry.name)}" data-fallback-primary="${esc(entry.primary)}">
        <div class="exercise-history-card-top"><span class="tag">${esc(entry.primary||'EXERCÍCIO')}</span><span class="exercise-history-status status-${esc(status.state.toLowerCase().replace(/\s+/g,'-'))}">${esc(status.state)}</span></div>
        <strong>${esc(entry.name)}</strong>
        <p>${esc(latestSummary(latest))}</p>
        <small>${entry.exposures.length} exposição${entry.exposures.length===1?'':'ões'} · ${esc(status.text)}</small>
      </button>`;
    }).join('');
  }

  function exposureRows(exposures){
    return [...exposures].reverse().slice(0,12).map(exposure=>{
      const sets=(exposure.sets||[]).map((set,index)=>`<span>S${index+1}: ${esc(set.load||'—')} × ${esc(set.reps)} · RIR ${esc(set.rir)}</span>`).join('');
      const discomfort=exposure.discomfort==='significant'?'DESCONFORTO RELEVANTE':exposure.discomfort==='mild'?'INCÔMODO LEVE':'';
      const recommendation=exposure.recommendation;
      return `<article class="exercise-exposure">
        <div class="exercise-exposure-head"><strong>${new Date(exposure.completedAt).toLocaleDateString('pt-BR')}</strong><span>${esc(exposure.sessionLabel||'Missão')}</span></div>
        <div class="exercise-exposure-sets">${sets}</div>
        ${exposure.note?`<p class="exercise-exposure-note">“${esc(exposure.note)}”</p>`:''}
        ${discomfort?`<div class="exercise-exposure-warning">${discomfort}</div>`:''}
        ${recommendation?`<div class="exercise-exposure-recommendation"><span>${esc(recommendation.state)}</span><p>${esc(recommendation.text)}</p></div>`:''}
      </article>`;
    }).join('');
  }

  function openExercise(id,fallback={}){
    ensureModal();
    const entry=exerciseIndex().get(id)||{id,name:fallback.name||'Exercício',primary:fallback.primary||'',exposures:[]};
    const next=readJSON(NEXT_KEY,{});
    const advice=next[id];
    const status=statusFor(entry.exposures,advice);
    const latest=entry.exposures[entry.exposures.length-1];
    const records=recordsFor(entry.exposures);
    const targetReps=latest?.targetReps||fallback.targetReps||'—';
    const targetRir=latest?.targetRir||fallback.targetRir||'—';
    const title=document.getElementById('exerciseHistoryTitle');
    const meta=document.getElementById('exerciseHistoryMeta');
    const body=document.getElementById('exerciseHistoryBody');
    title.textContent=entry.name;
    meta.textContent=`${entry.primary||fallback.primary||'Exercício'} · ${records.count} exposição${records.count===1?'':'ões'}`;
    body.innerHTML=`
      <div class="exercise-history-state"><span>STATUS ATUAL</span><strong>${esc(status.state)}</strong><p>${esc(status.text)}</p></div>
      <div class="exercise-history-records">
        <article><span>MAIOR CARGA REGISTRADA</span><strong>${esc(records.highestLoadText)}</strong></article>
        <article><span>MAIOR REP EM UMA SÉRIE</span><strong>${esc(records.bestSingleSet)}</strong></article>
        <article><span>EXPOSIÇÕES</span><strong>${records.count}</strong></article>
      </div>
      <div class="exercise-current-prescription"><span>PRESCRIÇÃO DE REFERÊNCIA</span><strong>${esc(targetReps)} reps · RIR ${esc(targetRir)}</strong><p>${latest?`Última execução: ${esc(latestSummary(latest))}`:'A primeira execução ainda não foi registrada.'}</p></div>
      ${advice?`<div class="exercise-next-action"><span>PRÓXIMA AÇÃO · ${esc(advice.state)}</span><p>${esc(advice.text)}</p></div>`:'<div class="exercise-next-action neutral"><span>PRÓXIMA AÇÃO</span><p>Execute e registre o exercício para o Sistema gerar uma recomendação individual.</p></div>'}
      <div class="exercise-history-timeline"><div class="screen-label">HISTÓRICO DE EXPOSIÇÕES</div>${entry.exposures.length?exposureRows(entry.exposures):'<div class="exercise-history-no-data">Nenhuma exposição concluída ainda.</div>'}</div>`;
    const modal=document.getElementById('exerciseHistoryModal');
    modal.hidden=false;
    document.body.classList.add('exercise-history-open');
  }

  function injectMissionControls(){
    document.querySelectorAll('.execution-exercise:not([data-history-enhanced])').forEach(card=>{
      card.dataset.historyEnhanced='true';
      const id=card.dataset.exerciseId;
      const name=card.dataset.name||card.querySelector('.execution-exercise-head strong')?.textContent||'Exercício';
      const primary=card.querySelector('.tag')?.textContent||'';
      card.dataset.historyPrimary=primary;
      const discomfort=card.querySelector('.discomfort-row');
      const tools=document.createElement('div');
      tools.className='exercise-memory-tools';
      tools.innerHTML=`<label class="exercise-note-field"><span>OBSERVAÇÃO DO EXERCÍCIO · OPCIONAL</span><input class="exercise-note-input" type="text" maxlength="120" placeholder="Ex.: pegada confortável, banco baixo, amplitude limitada..." disabled></label>
        <button class="exercise-history-btn" type="button" data-open-exercise-history="${esc(id)}" data-fallback-name="${esc(name)}" data-fallback-primary="${esc(primary)}">HISTÓRICO</button>`;
      if(discomfort)discomfort.insertAdjacentElement('afterend',tools);
      else card.appendChild(tools);
    });
  }

  function pendingMetadata(){
    const result={};
    document.querySelectorAll('.execution-exercise').forEach(card=>{
      const id=card.dataset.exerciseId;
      if(!id)return;
      result[id]={
        note:card.querySelector('.exercise-note-input')?.value.trim()||'',
        primary:card.dataset.historyPrimary||card.querySelector('.tag')?.textContent||''
      };
    });
    return result;
  }

  function enrichLastWorkout(metadata){
    const records=history();
    const last=records[records.length-1];
    if(!last||Date.now()-new Date(last.completedAt).getTime()>10000)return;
    const next=readJSON(NEXT_KEY,{});
    let changed=false;
    (last.exercises||[]).forEach(exercise=>{
      const meta=metadata[exercise.id];
      if(meta){
        exercise.note=meta.note||'';
        exercise.primary=exercise.primary||meta.primary||'';
        changed=true;
      }
      if(next[exercise.id]){
        exercise.recommendation={...next[exercise.id]};
        changed=true;
      }
    });
    if(changed){writeJSON(HISTORY_KEY,records);renderIndex();}
  }

  document.addEventListener('click',event=>{
    const open=event.target.closest('[data-open-exercise-history]');
    if(open){
      openExercise(open.dataset.openExerciseHistory,{
        name:open.dataset.fallbackName,
        primary:open.dataset.fallbackPrimary,
        targetReps:open.closest('.execution-exercise')?.dataset.targetReps,
        targetRir:open.closest('.execution-exercise')?.dataset.targetRir
      });
      return;
    }
  });

  document.addEventListener('click',event=>{
    const button=event.target.closest('#startBtn');
    if(!button||button.dataset.state!=='active')return;
    const metadata=pendingMetadata();
    setTimeout(()=>{if(button.dataset.state==='done')enrichLastWorkout(metadata);},120);
  },true);

  const observer=new MutationObserver(()=>injectMissionControls());
  const exerciseList=document.getElementById('exerciseList');
  if(exerciseList)observer.observe(exerciseList,{childList:true,subtree:true});

  ensureProgressSection();
  ensureModal();
  injectMissionControls();
  renderIndex();
  document.getElementById('profileForm')?.addEventListener('submit',()=>setTimeout(injectMissionControls,180));
})();