(()=>{
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';
  const SESSION_KEY='sistemaEvolucao.currentSessionIndex.v1';
  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const state=new Map();
  let observerQueued=false;
  let suppressSetControl=null;

  function ensureStyles(){
    if(document.querySelector('link[href="series-prescription.css"]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='series-prescription.css';
    document.head.appendChild(link);
  }

  function escapeHtml(value=''){
    return String(value).replace(/[&<>"']/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[char]));
  }

  function keyFor(exerciseEl){
    const sessionIndex=exerciseEl.closest('.pe-session')?.dataset.session||'0';
    const name=exerciseEl.querySelector('.pe-ex-main strong')?.textContent.trim()||'Exercício';
    return `${sessionIndex}|${name}`;
  }

  function planExercise(exerciseEl){
    const plan=read(PLAN_KEY,null);
    const sessionIndex=Number(exerciseEl.closest('.pe-session')?.dataset.session||0);
    const name=exerciseEl.querySelector('.pe-ex-main strong')?.textContent.trim()||'';
    return plan?.sessions?.[sessionIndex]?.exercises?.find(ex=>ex.name===name)||null;
  }

  function visibleSetCount(exerciseEl,exercise){
    const count=Number(exerciseEl.querySelector('.pe-sets b')?.textContent||exercise?.sets||1);
    return Math.max(1,Math.min(8,Number.isFinite(count)?count:1));
  }

  function normalizedSeriesItem(item,fallback={}){
    return {
      load:String(item?.load??fallback.load??''),
      reps:String(item?.reps??fallback.reps??''),
      rir:String(item?.rir??fallback.rir??'')
    };
  }

  function initialEntry(exerciseEl){
    const exercise=planExercise(exerciseEl)||{};
    const count=visibleSetCount(exerciseEl,exercise);
    const fallback={load:'',reps:String(exercise.reps||'8–12'),rir:String(exercise.rir||'2–3')};
    const stored=Array.isArray(exercise.seriesPlan)?exercise.seriesPlan.map(item=>normalizedSeriesItem(item,fallback)):[];
    const series=stored.slice(0,count);
    while(series.length<count)series.push(normalizedSeriesItem(null,fallback));
    return {rest:String(exercise.rest||'90–150 s'),series};
  }

  function entryFor(exerciseEl){
    const key=keyFor(exerciseEl);
    if(!state.has(key))state.set(key,initialEntry(exerciseEl));
    return state.get(key);
  }

  function renderSeriesEditor(exerciseEl){
    if(exerciseEl.dataset.seriesPrescriptionReady==='true'&&exerciseEl.querySelector('.sp-editor'))return;
    exerciseEl.dataset.seriesPrescriptionReady='true';
    exerciseEl.classList.add('sp-enabled');
    const entry=entryFor(exerciseEl);
    const box=document.createElement('section');
    box.className='sp-editor';
    box.innerHTML=`
      <div class="sp-editor-head">
        <div><small>PRESCRIÇÃO POR SÉRIE</small><strong>Planejado antes da missão</strong></div>
        <label class="sp-rest"><span>DESCANSO</span><input data-sp-rest maxlength="24" value="${escapeHtml(entry.rest)}"></label>
      </div>
      <div class="sp-grid-head"><span>SÉRIE</span><span>CARGA</span><span>REPS</span><span>RIR</span><span></span></div>
      <div class="sp-series-list"></div>
      <div class="sp-editor-foot"><button type="button" class="pe-mini sp-add-series">+ SÉRIE</button><small>Na execução você registra o que realmente fez. O planejado fica preservado para comparação.</small></div>`;
    const list=box.querySelector('.sp-series-list');
    entry.series.forEach((series,index)=>{
      const row=document.createElement('div');
      row.className='sp-series-row';
      row.dataset.spIndex=String(index);
      row.innerHTML=`
        <b>${index+1}</b>
        <input data-sp-field="load" maxlength="18" inputmode="decimal" placeholder="kg / PC / elástico" value="${escapeHtml(series.load)}">
        <input data-sp-field="reps" maxlength="16" inputmode="text" placeholder="8–12" value="${escapeHtml(series.reps)}">
        <input data-sp-field="rir" maxlength="10" inputmode="text" placeholder="2–3" value="${escapeHtml(series.rir)}">
        <button type="button" class="sp-remove-series" aria-label="Remover série ${index+1}">×</button>`;
      list.appendChild(row);
    });
    const main=exerciseEl.querySelector('.pe-ex-main');
    if(main)main.insertAdjacentElement('afterend',box);else exerciseEl.prepend(box);

    box.querySelector('[data-sp-rest]')?.addEventListener('input',event=>{
      entry.rest=event.target.value.trim();
    });
    box.querySelectorAll('[data-sp-field]').forEach(input=>input.addEventListener('input',event=>{
      const row=event.target.closest('.sp-series-row');
      const index=Number(row?.dataset.spIndex||0);
      if(!entry.series[index])return;
      entry.series[index][event.target.dataset.spField]=event.target.value.trim();
    }));
  }

  function decorateEditor(){
    document.querySelectorAll('#planEditorBody .pe-exercise').forEach(renderSeriesEditor);
  }

  function summarizeNumbers(series,field,fallback){
    const numbers=[];
    series.forEach(item=>{
      const found=String(item[field]||'').match(/\d+(?:[.,]\d+)?/g)||[];
      found.forEach(value=>numbers.push(Number(value.replace(',','.'))));
    });
    if(!numbers.length)return fallback;
    const min=Math.min(...numbers);
    const max=Math.max(...numbers);
    const fmt=value=>Number.isInteger(value)?String(value):String(value).replace('.',',');
    return min===max?fmt(min):`${fmt(min)}–${fmt(max)}`;
  }

  function saveSeriesPlan(){
    const plan=read(PLAN_KEY,null);
    if(!plan?.sessions)return;
    let changed=false;
    plan.sessions.forEach((session,sessionIndex)=>{
      session.exercises.forEach(exercise=>{
        const entry=state.get(`${sessionIndex}|${exercise.name}`);
        if(!entry?.series?.length)return;
        exercise.seriesPlan=entry.series.map(item=>normalizedSeriesItem(item));
        exercise.sets=exercise.seriesPlan.length;
        if(entry.rest)exercise.rest=entry.rest.slice(0,24);
        exercise.reps=summarizeNumbers(exercise.seriesPlan,'reps',exercise.reps||'8–12');
        exercise.rir=summarizeNumbers(exercise.seriesPlan,'rir',exercise.rir||'2–3');
        changed=true;
      });
    });
    if(!changed)return;
    plan.userEdited=true;
    plan.prescriptionModel='per-series-v1';
    plan.manualEditedAt=new Date().toISOString();
    write(PLAN_KEY,plan);
    window.dispatchEvent(new CustomEvent('sistema:series-plan-saved',{detail:{plan}}));
  }

  function handleEditorControls(event){
    if(event.target.closest('#openPlanEditor')){
      setTimeout(decorateEditor,0);
      setTimeout(decorateEditor,60);
      return;
    }

    const add=event.target.closest('.sp-add-series');
    if(add){
      const exerciseEl=add.closest('.pe-exercise');
      const plus=exerciseEl?.querySelector('[data-act="sets-plus"]');
      if(plus)plus.click();
      setTimeout(decorateEditor,0);
      return;
    }

    const remove=event.target.closest('.sp-remove-series');
    if(remove){
      const exerciseEl=remove.closest('.pe-exercise');
      const entry=exerciseEl?entryFor(exerciseEl):null;
      const index=Number(remove.closest('.sp-series-row')?.dataset.spIndex||0);
      if(!entry||entry.series.length<=1)return;
      entry.series.splice(index,1);
      const minus=exerciseEl.querySelector('[data-act="sets-minus"]');
      if(minus){suppressSetControl=minus;minus.click();}
      setTimeout(decorateEditor,0);
      return;
    }

    const setControl=event.target.closest('[data-act="sets-plus"],[data-act="sets-minus"]');
    if(setControl){
      if(setControl===suppressSetControl){suppressSetControl=null;return;}
      const exerciseEl=setControl.closest('.pe-exercise');
      if(!exerciseEl)return;
      const entry=entryFor(exerciseEl);
      if(setControl.dataset.act==='sets-plus'){
        if(entry.series.length<8){
          const base=entry.series.at(-1)||normalizedSeriesItem(null,{reps:'8–12',rir:'2–3'});
          entry.series.push(normalizedSeriesItem(base));
        }
      }else if(entry.series.length>1)entry.series.pop();
      setTimeout(decorateEditor,0);
      return;
    }

    if(event.target.closest('#savePlanEditor')){
      setTimeout(saveSeriesPlan,70);
    }
  }

  function plannedExerciseForCard(card){
    const plan=read(PLAN_KEY,null);
    const sessions=plan?.sessions||[];
    if(!sessions.length)return null;
    const currentIndex=Math.max(0,Number(localStorage.getItem(SESSION_KEY)||0))%sessions.length;
    const session=sessions[currentIndex];
    return session?.exercises?.find(ex=>ex.id===card.dataset.exerciseId||ex.name===card.dataset.name)||null;
  }

  function targetText(series){
    const parts=[];
    if(series.load)parts.push(series.load);
    if(series.reps)parts.push(`${series.reps} reps`);
    if(series.rir)parts.push(`RIR ${series.rir}`);
    return parts.join(' · ');
  }

  function decorateExecution(){
    document.querySelectorAll('.execution-exercise').forEach(card=>{
      if(card.dataset.seriesPlanReady==='true')return;
      const exercise=plannedExerciseForCard(card);
      if(!Array.isArray(exercise?.seriesPlan)||!exercise.seriesPlan.length)return;
      card.dataset.seriesPlanReady='true';
      const rows=[...card.querySelectorAll('.set-log-row')];
      rows.forEach((row,index)=>{
        const planned=exercise.seriesPlan[index];
        if(!planned)return;
        const load=row.querySelector('.set-load');
        if(load&&planned.load)load.value=planned.load;
        const reps=row.querySelector('.set-reps');
        if(reps&&planned.reps)reps.placeholder=String(planned.reps);
        const meta=document.createElement('small');
        meta.className='sp-set-target';
        meta.textContent=`META · ${targetText(planned)||'série livre'}`;
        row.appendChild(meta);
      });
      const head=card.querySelector('.execution-exercise-head');
      if(head&&!head.querySelector('.sp-execution-note')){
        const note=document.createElement('small');
        note.className='sp-execution-note';
        note.textContent='Planejado e realizado ficam separados para o Sistema comparar depois.';
        head.appendChild(note);
      }
    });
  }

  function refresh(){
    observerQueued=false;
    decorateEditor();
    decorateExecution();
  }

  function scheduleRefresh(){
    if(observerQueued)return;
    observerQueued=true;
    if(document.visibilityState==='hidden')setTimeout(refresh,0);
    else requestAnimationFrame(refresh);
  }

  ensureStyles();
  document.addEventListener('click',handleEditorControls);
  const observer=new MutationObserver(scheduleRefresh);
  observer.observe(document.body,{childList:true,subtree:true});
  window.SistemaSeriesPrescription={decorateEditor,decorateExecution,save:saveSeriesPlan,isReady:true};
  refresh();
})();