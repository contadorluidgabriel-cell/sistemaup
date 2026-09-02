(()=>{
  const PROFILE_KEY='sistemaEvolucao.playerProfile.v1';
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';
  const GENERATED_KEY='sistemaEvolucao.trainingPlan.generated.v3';
  const SESSION_KEY='sistemaEvolucao.currentSessionIndex.v1';
  const SPLIT_KEY='sistemaEvolucao.splitPreference.v1';
  const BACKUP_KEY='sistemaEvolucao.trainingPlan.beforeGroupSplit.v1';
  const PREFERRED_SPLIT='pull-push-lower-core';
  const GENERATOR='system-v3-group-split-flex';
  const ARCH_VERSION='group-frequency-v3-identical';

  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const toast=message=>{const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);};

  const CORE_CATALOG=[
    {id:'core_plank',name:'Prancha',primary:'Core',secondary:[],pattern:'anti-extensão',type:'core',requires:[],sets:2,reps:'20–45 s',rir:'2–3',rest:'45–75 s'},
    {id:'core_dead_bug',name:'Dead bug',primary:'Core',secondary:[],pattern:'estabilidade lombo-pélvica',type:'core',requires:[],sets:2,reps:'8–12 / lado',rir:'2–3',rest:'45–75 s'},
    {id:'core_reverse_crunch',name:'Abdominal reverso',primary:'Core',secondary:[],pattern:'flexão de tronco',type:'core',requires:[],sets:2,reps:'10–15',rir:'2–3',rest:'45–75 s'},
    {id:'core_side_plank',name:'Prancha lateral',primary:'Core',secondary:[],pattern:'anti-flexão lateral',type:'core',requires:[],sets:2,reps:'20–40 s / lado',rir:'2–3',rest:'45–75 s'}
  ];

  const DOMAINS={
    pull:new Set(['Costas','Bíceps']),
    push:new Set(['Peito','Ombros','Tríceps']),
    lower:new Set(['Quadríceps','Posteriores','Glúteos','Panturrilhas','Core'])
  };

  function preference(){
    const saved=read(SPLIT_KEY,null);
    if(typeof saved==='string')return saved;
    return read(PROFILE_KEY,{})?.splitPreference||'system';
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

  function domainForFocus(focus=''){
    if(['Costas','Bíceps'].includes(focus))return 'pull';
    if(['Peito','Ombros','Tríceps'].includes(focus))return 'push';
    if(['Quadríceps','Posteriores','Glúteos','Panturrilhas','Core'].includes(focus))return 'lower';
    if(focus==='Braços')return 'pull';
    return null;
  }

  function rankedExtraDomains(profile){
    const scores={push:30,pull:20,lower:10};
    const primary=domainForFocus(profile.primaryFocus);
    const secondary=domainForFocus(profile.secondaryFocus);
    if(primary)scores[primary]+=100;
    if(secondary)scores[secondary]+=35;
    if(profile.primaryFocus==='Braços')scores.push+=95;
    return Object.keys(scores).sort((a,b)=>scores[b]-scores[a]);
  }

  function patternFor(count,profile){
    if(count<3)return null;
    if(count===3)return ['pull','push','lower'];
    if(count===6)return ['pull','push','lower','pull','push','lower'];
    const extras=rankedExtraDomains(profile);
    if(count===4)return ['pull','push','lower',extras[0]];
    if(count===5)return ['pull','push','lower',extras[0],extras[1]];
    return ['pull','push','lower','pull','push','lower'].slice(0,count);
  }

  function sessionDomain(session){
    const muscles=(session?.exercises||[]).map(ex=>ex.primary).filter(Boolean);
    if(!muscles.length)return null;
    for(const [kind,allowed] of Object.entries(DOMAINS)){
      if(muscles.every(muscle=>allowed.has(muscle)))return kind;
    }
    return null;
  }

  function isGroupedPlan(plan){
    if(!plan?.sessions?.length)return false;
    if(plan.sessions.some(session=>!sessionDomain(session)))return false;
    const labels=plan.sessions.map(session=>String(session.label||'').toLowerCase()).join(' ');
    return !labels.includes('corpo inteiro')&&!labels.includes('superior');
  }

  function targetMap(base){
    return Object.fromEntries((base.targets||[]).map(t=>[t.muscle,Number(t.target||t.min||0)]));
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

  function buildSession(kind,label,base,profile,engine){
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

  function labelsFor(pattern){
    const totals=pattern.reduce((acc,kind)=>(acc[kind]=(acc[kind]||0)+1,acc),{});
    const seen={};
    const base={pull:'A · Costas + Bíceps',push:'B · Peito + Ombros + Tríceps',lower:'C · Inferior + Core'};
    return pattern.map(kind=>{
      seen[kind]=(seen[kind]||0)+1;
      if(totals[kind]===1)return base[kind];
      return `${base[kind]} · ${seen[kind]}`;
    });
  }

  function buildPlan(base,profile,engine){
    const count=base?.sessions?.length||Number(profile.frequency||0);
    const pattern=patternFor(count,profile);
    if(!pattern)return null;
    const labels=labelsFor(pattern);
    const templates={};
    const sessions=pattern.map((kind,index)=>{
      if(!templates[kind])templates[kind]=buildSession(kind,labels[index],base,profile,engine);
      const session=clone(templates[kind]);
      session.label=labels[index];
      session.repeatOf=templates[kind].label;
      session.repeatMode='identical';
      return session;
    }).map((session,index)=>({...session,index:index+1}));
    if(sessions.some(session=>!session.exercises.length))return null;
    const totals=engine.totalsFor(sessions);
    const unmetTargets=(base.targets||[]).filter(t=>(totals[t.muscle]||0)+.01<Number(t.min||0)).map(t=>({muscle:t.muscle,target:t.min,actual:totals[t.muscle]||0,role:t.role,reason:'divisão escolhida, frequência, capacidade, equipamento ou volume atual'}));
    return {
      ...base,
      version:3,
      generator:GENERATOR,
      generatedAt:new Date().toISOString(),
      splitPreference:PREFERRED_SPLIT,
      splitArchitectureVersion:ARCH_VERSION,
      repeatedSessionsMode:'identical',
      architecture:{sessions:count,reason:`Divisão por grupos escolhida pelo jogador em ${count} sessões. Quando um grupo se repete na semana, a sessão é uma cópia idêntica: mesmos exercícios, ordem, séries, repetições, RIR e descanso.`},
      sessions,
      equivalentVolume:totals,
      unmetTargets,
      userEdited:false,
      migratedFromLegacyStructure:!isGroupedPlan(base)
    };
  }

  function updateNote(count){
    const note=document.querySelector('.split-preference-note');
    if(!note)return;
    if(count<3){
      note.textContent='Com menos de 3 sessões não é possível separar A, B e C sem misturar grupos. O Sistema mantém uma divisão compatível.';
      return;
    }
    note.textContent=`Divisão por grupos ativa em ${count} sessões. Quando A ou B se repetirem na semana, serão exatamente o mesmo treino.`;
  }

  function apply({reload=true}={}){
    if(preference()!==PREFERRED_SPLIT)return false;
    const engine=window.SistemaPlanV3;
    const profile=read(PROFILE_KEY,{})||{};
    const base=read(PLAN_KEY,null);
    if(!engine||!base?.sessions)return false;
    const count=base.sessions.length;
    updateNote(count);
    if(count<3)return false;
    if(base.generator===GENERATOR&&base.splitArchitectureVersion===ARCH_VERSION&&base.sessions.length===count&&isGroupedPlan(base))return true;
    if(base.userEdited&&base.splitPreference===PREFERRED_SPLIT&&base.splitArchitectureVersion===ARCH_VERSION&&isGroupedPlan(base))return true;
    const next=buildPlan(base,profile,engine);
    if(!next)return false;
    if(!isGroupedPlan(base)||base.userEdited||base.splitArchitectureVersion!==ARCH_VERSION)write(BACKUP_KEY,{savedAt:new Date().toISOString(),plan:base});
    write(GENERATED_KEY,next);
    write(PLAN_KEY,next);
    localStorage.setItem(SESSION_KEY,'0');
    window.dispatchEvent(new CustomEvent('sistema:group-split-applied',{detail:{sessions:count,migrated:true,repeatMode:'identical'}}));
    if(reload){toast(`Divisão A/B/C aplicada. Repetições idênticas.`);setTimeout(()=>location.reload(),220);}
    return true;
  }

  function boot(){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      const plan=read(PLAN_KEY,null);
      if(window.SistemaPlanV3&&plan?.version===3){
        clearInterval(timer);
        setTimeout(()=>apply({reload:true}),120);
      }else if(attempts>50)clearInterval(timer);
    },100);

    document.getElementById('profileForm')?.addEventListener('submit',()=>{
      setTimeout(()=>apply({reload:true}),520);
    });
  }

  window.SistemaGroupSplit={apply,patternFor,isGroupedPlan,isReady:true};
  boot();
})();