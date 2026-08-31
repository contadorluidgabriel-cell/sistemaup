const executionStyles=document.createElement('link');
executionStyles.rel='stylesheet';
executionStyles.href='execution-engine.css';
document.head.appendChild(executionStyles);

(()=>{
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';
  const HISTORY_KEY='sistemaEvolucao.workoutHistory.v1';
  const NEXT_KEY='sistemaEvolucao.nextExerciseTargets.v1';
  const SESSION_KEY='sistemaEvolucao.currentSessionIndex.v1';

  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const writeJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const toast=(message)=>{
    const el=document.getElementById('toast');
    if(!el)return;
    el.textContent=message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>el.classList.remove('show'),2300);
  };

  function repRange(text=''){
    const values=String(text).match(/\d+/g)?.map(Number)||[];
    return {min:values[0]||0,max:values[1]||values[0]||0};
  }

  function rirRange(text=''){
    const values=String(text).match(/\d+/g)?.map(Number)||[];
    return {min:values[0]??0,max:values[1]??values[0]??5};
  }

  function history(){
    const data=readJSON(HISTORY_KEY,[]);
    return Array.isArray(data)?data:[];
  }

  function exerciseExposures(exerciseId,limit=3){
    const results=[];
    [...history()].reverse().forEach(workout=>{
      const item=workout.exercises?.find(ex=>ex.id===exerciseId);
      if(item&&results.length<limit)results.push({...item,workoutDate:workout.completedAt,sessionLabel:workout.sessionLabel});
    });
    return results;
  }

  function formatExposure(exposure){
    if(!exposure?.sets?.length)return 'Sem registro anterior';
    const reps=exposure.sets.map(set=>set.reps).join('/');
    const loads=[...new Set(exposure.sets.map(set=>set.load).filter(Boolean))];
    const load=loads.length===1?loads[0]:loads.length>1?'carga variável':'sem carga informada';
    return `${reps} reps · ${load}`;
  }

  function exposureReachedTop(exposure,targetReps,targetRir){
    if(!exposure?.sets?.length)return false;
    const reps=repRange(targetReps);
    const rir=rirRange(targetRir);
    if(!reps.max)return false;
    return exposure.sets.every(set=>Number(set.reps)>=reps.max&&Number(set.rir)>=rir.min);
  }

  function numericLoad(value){
    const normalized=String(value||'').replace(',','.');
    const match=normalized.match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):null;
  }

  function compareExposure(current,previous){
    if(!previous?.sets?.length)return '';
    const currentReps=current.sets.reduce((sum,set)=>sum+Number(set.reps||0),0);
    const previousReps=previous.sets.reduce((sum,set)=>sum+Number(set.reps||0),0);
    const currentLoad=numericLoad(current.sets[0]?.load);
    const previousLoad=numericLoad(previous.sets[0]?.load);

    if(currentLoad!==null&&previousLoad!==null&&currentLoad>previousLoad&&currentReps>=previousReps-2){
      return 'Sobrecarga registrada com desempenho preservado.';
    }
    if(String(current.sets[0]?.load||'')===String(previous.sets[0]?.load||'')&&currentReps>previousReps){
      return `Desempenho superior: +${currentReps-previousReps} repetições totais com a mesma resistência.`;
    }
    if(currentReps<previousReps-2)return 'Desempenho abaixo da última exposição; o Sistema não força progressão.';
    return 'Desempenho semelhante à última exposição.';
  }

  function recommendationFor(current,previous,targetReps,targetRir){
    const reps=repRange(targetReps);
    const rir=rirRange(targetRir);
    const values=current.sets.map(set=>({reps:Number(set.reps),rir:Number(set.rir)}));
    const reachedTop=values.length>0&&values.every(set=>set.reps>=reps.max&&set.rir>=rir.min);
    const previousTop=exposureReachedTop(previous,targetReps,targetRir);
    const belowRange=values.some(set=>set.reps<reps.min);
    const tooHard=values.some(set=>set.rir<rir.min);

    if(current.discomfort==='significant'){
      return {state:'ADAPTAR',text:'Desconforto relevante registrado. Não progredir este exercício; reavaliar execução, variação e necessidade de orientação profissional antes da próxima exposição.'};
    }
    if(current.discomfort==='mild'){
      return {state:'OBSERVAR',text:'Incômodo leve registrado. Mantenha a dificuldade e observe a próxima exposição; não aumentar carga enquanto o desconforto persistir.'};
    }
    if(reachedTop&&previousTop){
      const hasNumeric=current.sets.some(set=>numericLoad(set.load)!==null);
      return {state:'PROGRESSÃO DISPONÍVEL',text:hasNumeric?'Topo da faixa confirmado em exposições consecutivas. Use o menor incremento de carga disponível e retorne à parte baixa da faixa de repetições.':'Topo da faixa confirmado em exposições consecutivas. Aumente a dificuldade pela menor progressão disponível sem perder técnica ou RIR planejado.'};
    }
    if(reachedTop){
      return {state:'CONFIRMAR',text:'Topo da faixa atingido. Mantenha a resistência na próxima exposição e confirme o desempenho antes de progredir.'};
    }
    if(belowRange||tooHard){
      return {state:'RECUPERAR FAIXA',text:'A execução saiu da faixa planejada ou ficou mais difícil que o alvo. Mantenha ou reduza um pequeno incremento de resistência para recuperar repetições e RIR.'};
    }
    return {state:'MANTER',text:'Mantenha a resistência e tente acrescentar repetições gradualmente nas séries que ainda não chegaram ao topo da faixa.'};
  }

  function ensureCompletionModal(){
    if(document.getElementById('completionModal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div class="execution-modal" id="completionModal" hidden>
        <div class="execution-complete panel">
          <div class="kicker">◆ SISTEMA</div>
          <div class="complete-symbol">◇</div>
          <h2>MISSÃO CONCLUÍDA</h2>
          <p id="completionSummary">Dados registrados.</p>
          <div class="completion-readings" id="completionReadings"></div>
          <button class="start" id="closeCompletion">CONTINUAR</button>
        </div>
      </div>`);
    document.getElementById('closeCompletion')?.addEventListener('click',()=>{
      document.getElementById('completionModal').hidden=true;
      document.body.classList.remove('execution-modal-open');
      renderExecution();
      window.scrollTo({top:0,behavior:'smooth'});
    });
  }

  function setInputRow(exercise,setIndex,previousSet){
    const previousLoad=String(previousSet?.load||'');
    return `<div class="set-log-row" data-set="${setIndex}">
      <span class="set-number">${setIndex+1}</span>
      <label><span>CARGA / RESIST.</span><input class="set-load" type="text" maxlength="18" placeholder="8 kg / médio / PC" value="${previousLoad.replace(/"/g,'&quot;')}" disabled></label>
      <label><span>REPS</span><input class="set-reps" type="number" inputmode="numeric" min="0" max="100" placeholder="—" disabled></label>
      <label><span>RIR</span><select class="set-rir" disabled><option value="">—</option><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label>
      <button class="set-done" type="button" aria-label="Concluir série ${setIndex+1}" disabled>○</button>
    </div>`;
  }

  function renderExerciseCard(item,index){
    const previous=exerciseExposures(item.id,1)[0];
    const nextTargets=readJSON(NEXT_KEY,{});
    const priorAdvice=nextTargets[item.id];
    const rows=Array.from({length:item.sets},(_,setIndex)=>setInputRow(item,setIndex,previous?.sets?.[setIndex])).join('');
    return `<article class="execution-exercise" data-exercise-id="${item.id}" data-target-reps="${item.reps}" data-target-rir="${item.rir}" data-name="${item.name.replace(/"/g,'&quot;')}">
      <div class="execution-exercise-head">
        <span class="exercise-order">${String(index+1).padStart(2,'0')}</span>
        <div><span class="tag">${item.primary}</span><strong>${item.name}</strong><p>${item.sets} séries · ${item.reps} reps · RIR ${item.rir} · descanso ${item.rest}</p></div>
      </div>
      <div class="previous-reading"><span>ÚLTIMA EXPOSIÇÃO</span><strong>${formatExposure(previous)}</strong></div>
      ${priorAdvice?`<div class="next-guidance"><span>${priorAdvice.state}</span><p>${priorAdvice.text}</p></div>`:''}
      <div class="set-log-head"><span>SÉRIE</span><span>CARGA / RESIST.</span><span>REPS</span><span>RIR</span><span></span></div>
      <div class="set-log">${rows}</div>
      <div class="discomfort-row"><span>Desconforto durante este exercício?</span><select class="exercise-discomfort" disabled><option value="none">Não</option><option value="mild">Leve / incômodo</option><option value="significant">Relevante</option></select></div>
    </article>`;
  }

  function collectExercise(card){
    const sets=[...card.querySelectorAll('.set-log-row')].map(row=>({
      load:row.querySelector('.set-load').value.trim(),
      reps:Number(row.querySelector('.set-reps').value),
      rir:Number(row.querySelector('.set-rir').value)
    }));
    return {
      id:card.dataset.exerciseId,
      name:card.dataset.name,
      targetReps:card.dataset.targetReps,
      targetRir:card.dataset.targetRir,
      discomfort:card.querySelector('.exercise-discomfort').value,
      sets
    };
  }

  function validateMission(container){
    const rows=[...container.querySelectorAll('.set-log-row')];
    for(const row of rows){
      const reps=row.querySelector('.set-reps').value;
      const rir=row.querySelector('.set-rir').value;
      const done=row.classList.contains('completed');
      if(reps===''||rir===''||!done)return false;
    }
    return rows.length>0;
  }

  function updateProgressHistory(){
    const records=history();
    if(!records.length)return;
    const last=records[records.length-1];
    const historySection=[...document.querySelectorAll('#view-progresso .section')].find(section=>section.querySelector('.kicker')?.textContent.trim()==='HISTÓRICO');
    const card=historySection?.querySelector('.empty-state');
    if(!card)return;
    const totalSets=last.exercises.reduce((sum,exercise)=>sum+exercise.sets.length,0);
    card.classList.add('history-filled');
    card.innerHTML=`<div class="empty-icon">◆</div><strong>${last.sessionLabel}</strong><p>${totalSets} séries registradas · ${last.exercises.length} exercícios · ${new Date(last.completedAt).toLocaleDateString('pt-BR')}</p><small>O próximo treino usará estes dados para comparar desempenho e liberar progressões quando os critérios forem atingidos.</small>`;
  }

  function renderExecution(){
    const plan=readJSON(PLAN_KEY,null);
    const sessions=plan?.sessions||[];
    const list=document.getElementById('exerciseList');
    if(!sessions.length||!list)return;

    const storedIndex=Math.max(0,Number(localStorage.getItem(SESSION_KEY)||0));
    const currentIndex=storedIndex%sessions.length;
    const session=sessions[currentIndex];

    const title=document.querySelector('#view-missao .mission-title h2');
    const structure=document.querySelector('#view-missao .mission .structure');
    if(title)title.textContent=session.label;
    if(structure)structure.textContent=`Sessão ${currentIndex+1}/${sessions.length} · ${session.exercises.length} exercícios · ${session.exercises.reduce((sum,item)=>sum+item.sets,0)} séries diretas`;

    ensureCompletionModal();
    list.innerHTML=`<div class="execution-intro"><span class="screen-label">REGISTRO DA MISSÃO · SESSÃO ${currentIndex+1}/${sessions.length}</span><p>Cada série constrói o histórico do Sistema. Registre a resistência usada, repetições realizadas e RIR real.</p></div>${session.exercises.map(renderExerciseCard).join('')}`;

    const oldButton=document.getElementById('startBtn');
    if(!oldButton)return;
    const button=oldButton.cloneNode(true);
    oldButton.replaceWith(button);
    button.textContent='INICIAR MISSÃO';
    button.disabled=false;
    button.dataset.state='idle';

    list.querySelectorAll('.set-done').forEach(btn=>btn.addEventListener('click',()=>{
      const row=btn.closest('.set-log-row');
      const reps=row.querySelector('.set-reps').value;
      const rir=row.querySelector('.set-rir').value;
      if(reps===''||rir===''){toast('Registre repetições e RIR antes de concluir a série.');return;}
      row.classList.toggle('completed');
      btn.textContent=row.classList.contains('completed')?'✓':'○';
    }));

    button.addEventListener('click',()=>{
      if(button.dataset.state==='idle'){
        button.dataset.state='active';
        button.textContent='FINALIZAR MISSÃO';
        list.querySelectorAll('input,select,button.set-done').forEach(control=>control.disabled=false);
        document.querySelector('#view-missao .mission')?.classList.add('mission-active');
        toast('Parâmetros aceitos. Missão iniciada.');
        return;
      }

      if(button.dataset.state==='active'){
        if(!validateMission(list)){
          toast('Conclua e registre todas as séries antes de finalizar a missão.');
          return;
        }

        const exercises=[...list.querySelectorAll('.execution-exercise')].map(collectExercise);
        const priorHistory=history();
        const recommendations={};
        const readings=[];

        exercises.forEach(exercise=>{
          const previous=exerciseExposures(exercise.id,1)[0];
          const recommendation=recommendationFor(exercise,previous,exercise.targetReps,exercise.targetRir);
          const comparison=compareExposure(exercise,previous);
          recommendations[exercise.id]={...recommendation,generatedAt:new Date().toISOString()};
          readings.push({name:exercise.name,state:recommendation.state,text:comparison||recommendation.text});
        });

        const record={
          id:`workout-${Date.now()}`,
          sessionIndex:currentIndex,
          sessionLabel:session.label,
          completedAt:new Date().toISOString(),
          exercises
        };
        priorHistory.push(record);
        writeJSON(HISTORY_KEY,priorHistory.slice(-100));
        writeJSON(NEXT_KEY,recommendations);
        localStorage.setItem(SESSION_KEY,String((currentIndex+1)%sessions.length));

        button.dataset.state='done';
        button.textContent='MISSÃO CONCLUÍDA';
        button.disabled=true;
        list.querySelectorAll('input,select,button.set-done').forEach(control=>control.disabled=true);

        const progressionCount=Object.values(recommendations).filter(item=>item.state==='PROGRESSÃO DISPONÍVEL').length;
        const nextSession=sessions[(currentIndex+1)%sessions.length];
        document.getElementById('completionSummary').textContent=progressionCount?`${progressionCount} progressão(ões) disponível(is). Próxima missão: ${nextSession.label}.`:`Dados registrados. Próxima missão: ${nextSession.label}.`;
        document.getElementById('completionReadings').innerHTML=readings.slice(0,4).map(item=>`<article><span>${item.state}</span><strong>${item.name}</strong><p>${item.text}</p></article>`).join('');
        const modal=document.getElementById('completionModal');
        modal.hidden=false;
        document.body.classList.add('execution-modal-open');
        updateProgressHistory();
      }
    });

    updateProgressHistory();
  }

  renderExecution();
  document.getElementById('profileForm')?.addEventListener('submit',()=>setTimeout(()=>{localStorage.setItem(SESSION_KEY,'0');renderExecution();},120));
})();