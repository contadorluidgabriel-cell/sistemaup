(()=>{
  const PROFILE_KEY='sistemaEvolucao.playerProfile.v1';
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';
  const GENERATED_KEY='sistemaEvolucao.trainingPlan.generated.v3';
  const SESSION_KEY='sistemaEvolucao.currentSessionIndex.v1';
  const SPLIT_KEY='sistemaEvolucao.splitPreference.v1';
  const PREFERRED_SPLIT='pull-push-lower-core';
  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const toast=message=>{const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);};

  const CORE_CATALOG=[
    {id:'core_plank',name:'Prancha',primary:'Core',secondary:[],pattern:'anti-extensão',type:'core',requires:[],sets:2,reps:'20–45 s',rir:'2–3',rest:'45–75 s'},
    {id:'core_dead_bug',name:'Dead bug',primary:'Core',secondary:[],pattern:'estabilidade lombo-pélvica',type:'core',requires:[],sets:2,reps:'8–12 / lado',rir:'2–3',rest:'45–75 s'},
    {id:'core_reverse_crunch',name:'Abdominal reverso',primary:'Core',secondary:[],pattern:'flexão de tronco',type:'core',requires:[],sets:2,reps:'10–15',rir:'2–3',rest:'45–75 s'},
    {id:'core_side_plank',name:'Prancha lateral',primary:'Core',secondary:[],pattern:'anti-flexão lateral',type:'core',requires:[],sets:2,reps:'20–40 s / lado',rir:'2–3',rest:'45–75 s'}
  ];

  function addStyles(){
    if(document.querySelector('link[href="training-preferences.css"]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='training-preferences.css';
    document.head.appendChild(link);
  }

  function preference(){
    const saved=read(SPLIT_KEY,null);
    if(typeof saved==='string')return saved;
    return read(PROFILE_KEY,{})?.splitPreference||'system';
  }

  function preferenceLabel(value=preference()){
    return value===PREFERRED_SPLIT?'Puxar · Empurrar · Inferior + Core':'Sistema decide';
  }

  function setTextIfChanged(node,value){
    if(node&&node.textContent!==value)node.textContent=value;
  }

  function ensureProfileField(){
    if(document.getElementById('profileSplitPreference'))return;
    const experience=document.getElementById('profileExperience')?.closest('.field');
    if(!experience)return;
    experience.insertAdjacentHTML('afterend',`
      <label class="field split-preference-field">
        <span>Como você prefere organizar os treinos?</span>
        <select id="profileSplitPreference">
          <option value="system">Deixar o Sistema decidir</option>
          <option value="${PREFERRED_SPLIT}">Por grupos: Puxar / Empurrar / Inferior + Core</option>
        </select>
        <small class="split-preference-note">Você escolhe a divisão. O Sistema continua calculando exercícios, séries, repetições, volume e progressão dentro dela.</small>
      </label>`);
    const select=document.getElementById('profileSplitPreference');
    select.value=preference();
    select.addEventListener('change',()=>{
      write(SPLIT_KEY,select.value);
      updateSplitSummary();
    });
  }

  function ensurePlanSummary(){
    if(document.getElementById('planSplitPreference'))return;
    const grid=document.querySelector('#view-plano .context-grid');
    if(!grid)return;
    const frequency=document.getElementById('planFrequency')?.closest('.context-cell');
    const html='<div class="context-cell wide"><span>DIVISÃO PREFERIDA</span><strong id="planSplitPreference">Sistema decide</strong></div>';
    if(frequency)frequency.insertAdjacentHTML('afterend',html);else grid.insertAdjacentHTML('beforeend',html);
  }

  function updateSplitSummary(){
    ensurePlanSummary();
    setTextIfChanged(document.getElementById('planSplitPreference'),preferenceLabel());
  }

  function persistPreferenceIntoProfile(){
    const select=document.getElementById('profileSplitPreference');
    const value=select?.value||preference();
    write(SPLIT_KEY,value);
    const profile=read(PROFILE_KEY,null);
    if(profile&&profile.splitPreference!==value){profile.splitPreference=value;write(PROFILE_KEY,profile);}
    updateSplitSummary();
    return value;
  }

  function capacity(profile){
    if(profile.duration==='20–30 min')return {exercises:4,sets:11};
    if(profile.duration==='30–45 min')return {exercises:5,sets:15};
    if(profile.duration==='45–60 min')return {exercises:6,sets:18};
    if(profile.duration==='60+ min')return {exercises:7,sets:21};
    return {exercises:5,sets:15};
  }

  function slots(kind,count){
    if(kind==='pull'){
      const base=count<=3?['Costas','Costas','Bíceps']:count===4?['Costas','Costas','Bíceps','Bíceps']:['Costas','Costas','Costas','Bíceps','Bíceps'];
      while(base.length<count)base.push(base.filter(m=>m==='Costas').length<=base.filter(m=>m==='Bíceps').length?'Costas':'Bíceps');
      return base.slice(0,count);
    }
    if(kind==='push'){
      const base=count<=3?['Peito','Ombros','Tríceps']:count===4?['Peito','Peito','Ombros','Tríceps']:['Peito','Peito','Ombros','Tríceps','Tríceps'];
      const extras=['Ombros','Peito','Tríceps'];
      while(base.length<count)base.push(extras[(base.length-5)%extras.length]);
      return base.slice(0,count);
    }
    const base=count<=3?['Quadríceps','Posteriores','Core']:count===4?['Quadríceps','Posteriores','Glúteos','Core']:['Quadríceps','Posteriores','Glúteos','Panturrilhas','Core'];
    const extras=['Core','Quadríceps','Posteriores'];
    while(base.length<count)base.push(extras[(base.length-5)%extras.length]);
    return base.slice(0,count);
  }

  function preferredCandidate(muscle,used,engine,profile){
    const prefs=engine.prefs?.()||{pinned:[],liked:[],avoided:[]};
    const source=muscle==='Core'?CORE_CATALOG:engine.catalog||[];
    const candidates=source.filter(ex=>ex.primary===muscle&&!used.has(ex.id)&&!prefs.avoided?.includes(ex.id)&&(muscle==='Core'||engine.compatible(ex,profile)));
    return [...candidates].sort((a,b)=>score(b)-score(a))[0]||null;
    function score(ex){return (prefs.pinned?.includes(ex.id)?100:0)+(prefs.liked?.includes(ex.id)?20:0)+(ex.type==='compound'?5:0);}
  }

  function materialize(ex,profile,engine){
    if(ex.primary==='Core')return {...ex};
    return {...ex,sets:2,...engine.repScheme(ex,profile)};
  }

  function targetMap(base){
    return Object.fromEntries((base.targets||[]).map(t=>[t.muscle,Number(t.target||t.min||0)]));
  }

  function buildSession(label,kind,base,profile,engine){
    const cap=capacity(profile);
    const desired=slots(kind,cap.exercises);
    const used=new Set();
    const exercises=[];
    desired.forEach(muscle=>{
      const ex=preferredCandidate(muscle,used,engine,profile);
      if(!ex)return;
      used.add(ex.id);
      exercises.push(materialize(ex,profile,engine));
    });
    if(!exercises.length)return {label,index:0,exercises:[]};

    const targets=targetMap(base);
    const allocated={};
    exercises.forEach(ex=>{allocated[ex.primary]=(allocated[ex.primary]||0)+Number(ex.sets||2);});
    let remaining=Math.max(0,cap.sets-exercises.reduce((sum,ex)=>sum+Number(ex.sets||0),0));
    while(remaining>0){
      const candidates=exercises.filter(ex=>Number(ex.sets||0)<4&&ex.primary!=='Core');
      if(!candidates.length)break;
      candidates.sort((a,b)=>((targets[b.primary]||0)-(allocated[b.primary]||0))-((targets[a.primary]||0)-(allocated[a.primary]||0)));
      const best=candidates[0];
      best.sets=Number(best.sets||0)+1;
      allocated[best.primary]=(allocated[best.primary]||0)+1;
      remaining-=1;
    }
    return {label,index:0,exercises};
  }

  function buildPreferredPlan(base,profile,engine){
    if(!base?.sessions||base.sessions.length!==3)return null;
    const sessions=[
      buildSession('Puxar · Costas + Bíceps','pull',base,profile,engine),
      buildSession('Empurrar · Peito + Ombros + Tríceps','push',base,profile,engine),
      buildSession('Inferior + Core','lower',base,profile,engine)
    ].map((session,index)=>({...session,index:index+1}));
    if(sessions.some(session=>!session.exercises.length))return null;
    const totals=engine.totalsFor(sessions);
    const unmetTargets=(base.targets||[]).filter(t=>(totals[t.muscle]||0)+.01<Number(t.min||0)).map(t=>({muscle:t.muscle,target:t.min,actual:totals[t.muscle]||0,role:t.role,reason:'divisão escolhida, capacidade, equipamento ou volume atual'}));
    return {
      ...base,
      version:3,
      generator:'system-v3-preferred-split',
      generatedAt:new Date().toISOString(),
      splitPreference:PREFERRED_SPLIT,
      architecture:{sessions:3,reason:'Divisão escolhida pelo jogador: Puxar, Empurrar e Inferior + Core. O Sistema prescreve dentro desses grupos sem misturar a sessão com outros domínios.'},
      sessions,
      equivalentVolume:totals,
      unmetTargets,
      userEdited:false
    };
  }

  function applyPreferredSplit({reload=false}={}){
    const pref=preference();
    if(pref!==PREFERRED_SPLIT)return false;
    const engine=window.SistemaPlanV3;
    const profile=read(PROFILE_KEY,{})||{};
    const base=read(PLAN_KEY,null);
    if(!engine||!base?.sessions)return false;
    if(base.sessions.length!==3){
      const note=document.querySelector('.split-preference-note');
      const message='Esta divisão é aplicada quando sua rotina possui 3 sessões de musculação. Com outra frequência, o Motor mantém uma distribuição compatível até termos um editor de divisão personalizada por dia.';
      setTextIfChanged(note,message);
      return false;
    }
    if(base.splitPreference===PREFERRED_SPLIT&&base.generator==='system-v3-preferred-split')return true;
    const preferred=buildPreferredPlan(base,profile,engine);
    if(!preferred)return false;
    write(GENERATED_KEY,preferred);
    write(PLAN_KEY,preferred);
    localStorage.setItem(SESSION_KEY,'0');
    if(reload){toast('Divisão por grupos aplicada. Atualizando o plano...');setTimeout(()=>location.reload(),280);}
    else setTimeout(()=>location.reload(),80);
    return true;
  }

  const overrides=new Map();
  function prescriptionKey(exerciseEl){
    const session=exerciseEl.closest('.pe-session');
    const name=exerciseEl.querySelector('.pe-ex-main strong')?.textContent.trim()||'';
    return `${session?.dataset.session||'0'}|${name}`;
  }

  function parsePrescription(exerciseEl){
    const text=exerciseEl.querySelector('.pe-ex-main span')?.textContent.trim()||'';
    const match=text.match(/^(.*?) reps\s*·\s*RIR\s*(.*?)\s*·\s*(.*)$/i);
    return match?{reps:match[1].trim(),rir:match[2].trim(),rest:match[3].trim()}:{reps:'8–12',rir:'2–3',rest:'90–150 s'};
  }

  function decorateEditor(){
    document.querySelectorAll('#planEditorBody .pe-exercise').forEach(exerciseEl=>{
      if(exerciseEl.dataset.prescriptionEditable==='true')return;
      exerciseEl.dataset.prescriptionEditable='true';
      const key=prescriptionKey(exerciseEl);
      const current=overrides.get(key)||parsePrescription(exerciseEl);
      const fields=document.createElement('div');
      fields.className='pe-prescription-fields';
      fields.innerHTML=`
        <label><span>REPETIÇÕES</span><input data-prescription="reps" maxlength="20" value="${String(current.reps).replace(/"/g,'&quot;')}"></label>
        <label><span>RIR</span><input data-prescription="rir" maxlength="12" value="${String(current.rir).replace(/"/g,'&quot;')}"></label>
        <label><span>DESCANSO</span><input data-prescription="rest" maxlength="24" value="${String(current.rest).replace(/"/g,'&quot;')}"></label>`;
      fields.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>{
        const saved=overrides.get(key)||{...current};
        saved[input.dataset.prescription]=input.value.trim();
        overrides.set(key,saved);
      }));
      exerciseEl.appendChild(fields);
    });
  }

  function applyPrescriptionOverrides(){
    const plan=read(PLAN_KEY,null);
    if(!plan?.sessions||!overrides.size)return;
    plan.sessions.forEach((session,sIndex)=>{
      session.exercises.forEach(ex=>{
        const key=`${sIndex}|${ex.name}`;
        const override=overrides.get(key);
        if(!override)return;
        if(override.reps)ex.reps=override.reps.slice(0,20);
        if(override.rir)ex.rir=override.rir.slice(0,12);
        if(override.rest)ex.rest=override.rest.slice(0,24);
      });
    });
    plan.userEdited=true;
    plan.manualEditedAt=new Date().toISOString();
    write(PLAN_KEY,plan);
  }

  function bindEditorSave(){
    const button=document.getElementById('savePlanEditor');
    if(!button||button.dataset.prescriptionBound==='true')return;
    button.dataset.prescriptionBound='true';
    button.addEventListener('click',()=>setTimeout(applyPrescriptionOverrides,25));
  }

  function bootEnhancements(){
    addStyles();
    ensureProfileField();
    ensurePlanSummary();
    updateSplitSummary();
    const form=document.getElementById('profileForm');
    if(form&&!form.dataset.splitPreferenceBound){
      form.dataset.splitPreferenceBound='true';
      form.addEventListener('submit',()=>{
        persistPreferenceIntoProfile();
        setTimeout(()=>applyPreferredSplit({reload:true}),180);
      });
    }

    let observerQueued=false;
    const observer=new MutationObserver(()=>{
      if(observerQueued)return;
      observerQueued=true;
      requestAnimationFrame(()=>{
        observerQueued=false;
        ensureProfileField();
        ensurePlanSummary();
        updateSplitSummary();
        decorateEditor();
        bindEditorSave();
      });
    });
    observer.observe(document.body,{childList:true,subtree:true});
    decorateEditor();
    bindEditorSave();

    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      ensureProfileField();
      bindEditorSave();
      if(window.SistemaPlanV3&&read(PLAN_KEY,null)?.version===3){clearInterval(timer);applyPreferredSplit();}
      else if(attempts>40)clearInterval(timer);
    },100);
  }

  bootEnhancements();
})();
