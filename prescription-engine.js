const prescriptionStyles=document.createElement('link');
prescriptionStyles.rel='stylesheet';
prescriptionStyles.href='prescription-engine.css';
document.head.appendChild(prescriptionStyles);

(()=>{
  const PROFILE_KEY='sistemaEvolucao.playerProfile.v1';
  const VOLUME_KEY='sistemaEvolucao.volumeTargets.v1';
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';

  const UPPER=['Peito','Costas','Ombros','Bíceps','Tríceps'];
  const LOWER=['Quadríceps','Posteriores','Glúteos','Panturrilhas'];
  const PUSH=['Peito','Ombros','Tríceps'];
  const PULL=['Costas','Bíceps'];
  const FOCUS_MAP={Peito:['Peito'],Costas:['Costas'],Ombros:['Ombros'],Braços:['Bíceps','Tríceps'],Quadríceps:['Quadríceps'],Posteriores:['Posteriores'],Glúteos:['Glúteos'],Panturrilhas:['Panturrilhas'],Equilibrado:[]};

  const CATALOG=[
    {id:'pushup',name:'Flexão de braços',primary:'Peito',secondary:['Tríceps','Ombros'],pattern:'empurrar horizontal',type:'compound',requires:[]},
    {id:'incline_pushup',name:'Flexão inclinada',primary:'Peito',secondary:['Tríceps','Ombros'],pattern:'empurrar horizontal',type:'compound',requires:[]},
    {id:'db_floor_press',name:'Supino no chão com halteres',primary:'Peito',secondary:['Tríceps','Ombros'],pattern:'empurrar horizontal',type:'compound',requires:['Halteres']},
    {id:'db_bench_press',name:'Supino com halteres no banco',primary:'Peito',secondary:['Tríceps','Ombros'],pattern:'empurrar horizontal',type:'compound',requires:['Halteres','Banco']},
    {id:'band_chest_press',name:'Supino em pé com elástico',primary:'Peito',secondary:['Tríceps','Ombros'],pattern:'empurrar horizontal',type:'compound',requires:['Elásticos']},
    {id:'db_fly',name:'Crucifixo com halteres',primary:'Peito',secondary:[],pattern:'adução horizontal',type:'isolation',requires:['Halteres','Banco']},
    {id:'band_fly',name:'Crucifixo com elástico',primary:'Peito',secondary:[],pattern:'adução horizontal',type:'isolation',requires:['Elásticos']},

    {id:'db_row',name:'Remada unilateral com halter',primary:'Costas',secondary:['Bíceps'],pattern:'puxar horizontal',type:'compound',requires:['Halteres']},
    {id:'band_row',name:'Remada com elástico',primary:'Costas',secondary:['Bíceps'],pattern:'puxar horizontal',type:'compound',requires:['Elásticos']},
    {id:'barbell_row',name:'Remada curvada com barra',primary:'Costas',secondary:['Bíceps','Posteriores'],pattern:'puxar horizontal',type:'compound',requires:['Barra e anilhas']},
    {id:'db_pullover',name:'Pullover com halter',primary:'Costas',secondary:['Peito'],pattern:'extensão de ombro',type:'isolation',requires:['Halteres','Banco']},
    {id:'band_pulldown',name:'Puxada alta com elástico',primary:'Costas',secondary:['Bíceps'],pattern:'puxar vertical',type:'compound',requires:['Elásticos']},

    {id:'db_ohp',name:'Desenvolvimento com halteres',primary:'Ombros',secondary:['Tríceps'],pattern:'empurrar vertical',type:'compound',requires:['Halteres']},
    {id:'band_ohp',name:'Desenvolvimento com elástico',primary:'Ombros',secondary:['Tríceps'],pattern:'empurrar vertical',type:'compound',requires:['Elásticos']},
    {id:'db_lateral',name:'Elevação lateral com halteres',primary:'Ombros',secondary:[],pattern:'abdução de ombro',type:'isolation',requires:['Halteres']},
    {id:'band_lateral',name:'Elevação lateral com elástico',primary:'Ombros',secondary:[],pattern:'abdução de ombro',type:'isolation',requires:['Elásticos']},

    {id:'goblet_squat',name:'Agachamento goblet',primary:'Quadríceps',secondary:['Glúteos'],pattern:'dominante de joelho',type:'compound',requires:['Halteres']},
    {id:'split_squat',name:'Agachamento dividido',primary:'Quadríceps',secondary:['Glúteos'],pattern:'dominante de joelho',type:'compound',requires:[]},
    {id:'reverse_lunge',name:'Afundo reverso',primary:'Quadríceps',secondary:['Glúteos'],pattern:'dominante de joelho',type:'compound',requires:[]},
    {id:'db_rdl',name:'Levantamento romeno com halteres',primary:'Posteriores',secondary:['Glúteos','Costas'],pattern:'dominante de quadril',type:'compound',requires:['Halteres']},
    {id:'barbell_rdl',name:'Levantamento romeno com barra',primary:'Posteriores',secondary:['Glúteos','Costas'],pattern:'dominante de quadril',type:'compound',requires:['Barra e anilhas']},
    {id:'band_leg_curl',name:'Flexão de joelho com elástico',primary:'Posteriores',secondary:[],pattern:'flexão de joelho',type:'isolation',requires:['Elásticos']},
    {id:'glute_bridge',name:'Ponte de glúteos',primary:'Glúteos',secondary:['Posteriores'],pattern:'extensão de quadril',type:'compound',requires:[]},
    {id:'db_hip_thrust',name:'Elevação pélvica com halter',primary:'Glúteos',secondary:['Posteriores'],pattern:'extensão de quadril',type:'compound',requires:['Halteres','Banco']},
    {id:'calf_raise',name:'Elevação de panturrilhas em pé',primary:'Panturrilhas',secondary:[],pattern:'flexão plantar',type:'isolation',requires:[]},
    {id:'db_calf_raise',name:'Elevação de panturrilhas com halteres',primary:'Panturrilhas',secondary:[],pattern:'flexão plantar',type:'isolation',requires:['Halteres']},

    {id:'db_curl',name:'Rosca com halteres',primary:'Bíceps',secondary:[],pattern:'flexão de cotovelo',type:'isolation',requires:['Halteres']},
    {id:'band_curl',name:'Rosca com elástico',primary:'Bíceps',secondary:[],pattern:'flexão de cotovelo',type:'isolation',requires:['Elásticos']},
    {id:'db_triceps',name:'Extensão de tríceps com halter',primary:'Tríceps',secondary:[],pattern:'extensão de cotovelo',type:'isolation',requires:['Halteres']},
    {id:'band_triceps',name:'Extensão de tríceps com elástico',primary:'Tríceps',secondary:[],pattern:'extensão de cotovelo',type:'isolation',requires:['Elásticos']}
  ];

  function readJSON(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
  function readProfile(){return readJSON(PROFILE_KEY)||{};}
  function readVolume(){return readJSON(VOLUME_KEY)||null;}
  function focus(profile){const primary=profile.primaryFocus||'Equilibrado';let secondary=profile.secondaryFocus||'Nenhum';if(primary==='Equilibrado'||secondary===primary)secondary='Nenhum';return {primary,secondary};}
  function availableEquipment(profile){return new Set(Array.isArray(profile.equipment)?profile.equipment:[]);}
  function compatible(exercise,equipment){return exercise.requires.every(item=>equipment.has(item));}

  function effectiveSessions(profile){
    const requested=Number(profile.frequency)||0;
    if(!requested)return 0;
    let sessions=requested;
    if(profile.experience==='Iniciante'||!profile.experience)sessions=Math.min(sessions,3);
    else if(profile.experience==='Intermediário')sessions=Math.min(sessions,4);
    if(Array.isArray(profile.availableDays)&&profile.availableDays.length)sessions=Math.min(sessions,profile.availableDays.length);
    return Math.max(1,sessions);
  }

  function splitFor(profile){
    const n=effectiveSessions(profile);
    if(n===1)return ['Corpo inteiro'];
    if(n===2)return ['Corpo inteiro A','Corpo inteiro B'];
    if(n===3)return profile.experience==='Iniciante'||!profile.experience?['Corpo inteiro A','Corpo inteiro B','Corpo inteiro C']:['Superior','Inferior','Corpo inteiro'];
    if(n===4)return ['Superior A','Inferior A','Superior B','Inferior B'];
    if(n===5)return ['Superior A','Inferior A','Superior B','Inferior B','Ênfase'];
    return ['Empurrar A','Puxar A','Pernas A','Empurrar B','Puxar B','Pernas B'];
  }

  function allowedMuscles(label,profile){
    if(label.startsWith('Corpo inteiro'))return [...UPPER,...LOWER];
    if(label.startsWith('Superior'))return UPPER;
    if(label.startsWith('Inferior'))return LOWER;
    if(label.startsWith('Empurrar'))return PUSH;
    if(label.startsWith('Puxar'))return PULL;
    if(label.startsWith('Pernas'))return LOWER;
    if(label==='Ênfase'){
      const {primary}=focus(profile);
      return FOCUS_MAP[primary]?.length?FOCUS_MAP[primary]:[...UPPER,...LOWER];
    }
    return [...UPPER,...LOWER];
  }

  function sessionCapacity(profile){
    const duration=profile.duration||'';
    if(duration==='20–30 min')return {exercises:4,sets:12};
    if(duration==='30–45 min')return {exercises:5,sets:16};
    if(duration==='45–60 min')return {exercises:6,sets:20};
    if(duration==='60+ min')return {exercises:7,sets:24};
    return {exercises:5,sets:16};
  }

  function targetMap(volume){
    const map={};
    (volume?.targets||[]).forEach(item=>{map[item.muscle]={...item,target:item.min};});
    return map;
  }

  function exerciseScore(exercise,profile,muscle,usedIds){
    let score=0;
    const {primary,secondary}=focus(profile);
    if(exercise.primary===muscle)score+=10;
    if(exercise.type==='compound')score+=4;
    if(!usedIds.has(exercise.id))score+=3;
    if((FOCUS_MAP[primary]||[]).includes(muscle))score+=4;
    if((FOCUS_MAP[secondary]||[]).includes(muscle))score+=2;
    if(profile.goal==='Força'&&exercise.type==='compound')score+=4;
    if(profile.goal==='Força'&&exercise.requires.includes('Barra e anilhas'))score+=2;
    if(profile.goal==='Força'&&exercise.requires.includes('Halteres'))score+=1;
    return score;
  }

  function chooseExercise(muscle,profile,usedIds,preferIsolation=false){
    const equipment=availableEquipment(profile);
    const candidates=CATALOG.filter(ex=>ex.primary===muscle&&compatible(ex,equipment));
    if(!candidates.length)return null;
    const filtered=preferIsolation?candidates.filter(ex=>ex.type==='isolation'):candidates;
    const pool=filtered.length?filtered:candidates;
    return [...pool].sort((a,b)=>exerciseScore(b,profile,muscle,usedIds)-exerciseScore(a,profile,muscle,usedIds))[0];
  }

  function repScheme(exercise,profile){
    const beginner=profile.experience==='Iniciante'||!profile.experience;
    const compound=exercise.type==='compound';
    if(profile.goal==='Força')return {reps:compound?'3–6':'6–10',rir:beginner?'3':'2–3',rest:compound?'180–240 s':'90–150 s'};
    if(profile.goal==='Recondicionamento')return {reps:'8–15',rir:'3–4',rest:compound?'120–180 s':'90–120 s'};
    if(profile.goal==='Hipertrofia')return {reps:compound?'6–12':'10–20',rir:beginner?'2–3':'1–3',rest:compound?'120–180 s':'60–120 s'};
    if(profile.goal==='Emagrecimento')return {reps:compound?'6–12':'10–15',rir:'2–3',rest:compound?'120–180 s':'60–120 s'};
    return {reps:compound?'6–12':'10–15',rir:'2–3',rest:compound?'120–180 s':'60–120 s'};
  }

  function initialMuscles(label,profile){
    const {primary,secondary}=focus(profile);
    let list=[];
    if(label.startsWith('Corpo inteiro'))list=['Peito','Costas','Quadríceps','Posteriores'];
    else if(label.startsWith('Superior'))list=['Peito','Costas','Ombros','Bíceps','Tríceps'];
    else if(label.startsWith('Inferior'))list=['Quadríceps','Posteriores','Glúteos','Panturrilhas'];
    else if(label.startsWith('Empurrar'))list=['Peito','Ombros','Tríceps'];
    else if(label.startsWith('Puxar'))list=['Costas','Bíceps'];
    else if(label.startsWith('Pernas'))list=['Quadríceps','Posteriores','Glúteos','Panturrilhas'];
    else if(label==='Ênfase')list=FOCUS_MAP[primary]?.length?[...FOCUS_MAP[primary]]:['Peito','Costas'];
    if((FOCUS_MAP[primary]||[]).some(m=>allowedMuscles(label,profile).includes(m)))list=[...(FOCUS_MAP[primary]||[]),...list];
    if((FOCUS_MAP[secondary]||[]).some(m=>allowedMuscles(label,profile).includes(m)))list=[...list,...(FOCUS_MAP[secondary]||[])];
    return [...new Set(list)].filter(m=>allowedMuscles(label,profile).includes(m));
  }

  function seriesEquivalent(sessions){
    const totals={Peito:0,Costas:0,Ombros:0,Bíceps:0,Tríceps:0,Quadríceps:0,Posteriores:0,Glúteos:0,Panturrilhas:0};
    sessions.forEach(session=>session.exercises.forEach(item=>{
      totals[item.exercise.primary]=(totals[item.exercise.primary]||0)+item.sets;
      item.exercise.secondary.forEach(m=>{if(m in totals)totals[m]+=item.sets*0.5;});
    }));
    return totals;
  }

  function sessionSetCount(session){return session.exercises.reduce((sum,item)=>sum+item.sets,0);}

  function addExercise(session,muscle,profile,usedIds,sets=2,preferIsolation=false){
    const capacity=sessionCapacity(profile);
    if(session.exercises.length>=capacity.exercises||sessionSetCount(session)>=capacity.sets)return false;
    const ex=chooseExercise(muscle,profile,usedIds,preferIsolation);
    if(!ex)return false;
    const availableSets=Math.max(0,capacity.sets-sessionSetCount(session));
    const finalSets=Math.min(sets,availableSets,4);
    if(finalSets<1)return false;
    session.exercises.push({exercise:ex,sets:finalSets,...repScheme(ex,profile)});
    usedIds.add(ex.id);
    return true;
  }

  function bestSessionForMuscle(sessions,muscle,profile){
    const eligible=sessions.filter(session=>allowedMuscles(session.label,profile).includes(muscle));
    return eligible.sort((a,b)=>sessionSetCount(a)-sessionSetCount(b)||a.exercises.length-b.exercises.length)[0]||null;
  }

  function orderExercises(session,profile){
    const {primary,secondary}=focus(profile);
    const pMuscles=FOCUS_MAP[primary]||[];
    const sMuscles=FOCUS_MAP[secondary]||[];
    session.exercises.sort((a,b)=>{
      const score=item=>{
        let value=0;
        if(pMuscles.includes(item.exercise.primary))value-=30;
        else if(sMuscles.includes(item.exercise.primary))value-=10;
        if(item.exercise.type==='compound')value-=8;
        return value;
      };
      return score(a)-score(b);
    });
  }

  function buildPlan(profile,volume){
    const labels=splitFor(profile);
    const sessions=labels.map((label,index)=>({index:index+1,label,exercises:[]}));
    const usedIds=new Set();

    sessions.forEach(session=>{
      initialMuscles(session.label,profile).forEach(muscle=>{
        const capacity=sessionCapacity(profile);
        if(session.exercises.length>=capacity.exercises)return;
        addExercise(session,muscle,profile,usedIds,2,false);
      });
    });

    const targets=targetMap(volume);
    const roleOrder={primary:0,secondary:1,base:2};
    const muscles=Object.values(targets).sort((a,b)=>roleOrder[a.role]-roleOrder[b.role]||b.target-a.target);

    for(let pass=0;pass<30;pass++){
      const totals=seriesEquivalent(sessions);
      const under=muscles.find(item=>(totals[item.muscle]||0)+0.01<item.target);
      if(!under)break;
      const session=bestSessionForMuscle(sessions,under.muscle,profile);
      if(!session)break;
      const existing=session.exercises.find(item=>item.exercise.primary===under.muscle&&item.sets<4);
      if(existing&&sessionSetCount(session)<sessionCapacity(profile).sets){existing.sets+=1;continue;}
      const deficit=Math.ceil(under.target-(totals[under.muscle]||0));
      const added=addExercise(session,under.muscle,profile,usedIds,Math.min(2,Math.max(1,deficit)),true);
      if(!added){
        under.target=totals[under.muscle]||0;
      }
    }

    sessions.forEach(session=>orderExercises(session,profile));
    const totals=seriesEquivalent(sessions);
    return {sessions,totals,targets};
  }

  function progressionRule(profile){
    if(profile.goal==='Força')return 'Quando todas as séries alcançarem o topo da faixa com o RIR planejado em exposições consecutivas, priorize o menor aumento de carga disponível. Se a carga não puder subir, progrida repetições ou uma variação mais difícil.';
    return 'Use progressão dupla: primeiro aumente repetições dentro da faixa mantendo técnica e RIR. Quando todas as séries atingirem o topo da faixa em exposições consecutivas, use o menor aumento de carga disponível e retorne à parte baixa da faixa.';
  }

  function ensureUI(){
    if(document.getElementById('prescriptionArchitecture'))return;
    const volumeSection=document.getElementById('volumeArchitecture');
    if(!volumeSection)return;
    volumeSection.insertAdjacentHTML('afterend',`
      <section class="section" id="prescriptionArchitecture">
        <div class="section-head"><div><div class="kicker">MOTOR DE PRESCRIÇÃO</div><h2>Treinos gerados</h2></div><small id="prescriptionState">AGUARDA DADOS</small></div>
        <div class="panel prescription-panel">
          <div class="prescription-head"><div><span class="screen-label">LÓGICA DA SESSÃO</span><strong id="prescriptionTitle">Configure o Perfil</strong><p id="prescriptionText">O Sistema seleciona poucos exercícios compatíveis com seus equipamentos e distribui o volume semanal entre as sessões.</p></div></div>
          <div class="prescription-rules">
            <article><span>ORDEM</span><strong>Prioridade primeiro</strong><p>Exercícios importantes para o objetivo ficam cedo na sessão; movimentos compostos recebem preferência quando adequado.</p></article>
            <article><span>ESFORÇO</span><strong>RIR planejado</strong><p>Falha muscular não é obrigatória. O alvo muda conforme objetivo e experiência.</p></article>
            <article><span>VARIAÇÃO</span><strong>Controlada</strong><p>O Sistema evita trocar exercícios aleatoriamente; variações entram por equipamento, limitação ou necessidade real.</p></article>
          </div>
          <div class="generated-sessions" id="generatedSessions"></div>
        </div>
        <div class="system-msg focus-rule"><div class="kicker">◆ PROGRESSÃO</div><p id="progressionRuleText">A progressão será liberada após existir execução registrada.</p></div>
      </section>`);
  }

  function renderPlanSession(session,index){
    return `<details class="generated-session" ${index===0?'open':''}>
      <summary><span class="session-index">${String(index+1).padStart(2,'0')}</span><div><strong>${session.label}</strong><small>${session.exercises.length} exercícios · ${sessionSetCount(session)} séries diretas</small></div><span>ABRIR</span></summary>
      <div class="session-exercises">
        ${session.exercises.map((item,i)=>`<article class="prescribed-exercise"><span class="exercise-order">${String(i+1).padStart(2,'0')}</span><div><small>${item.exercise.primary} · ${item.exercise.type==='compound'?'MULTIARTICULAR':'ISOLADO'}</small><strong>${item.exercise.name}</strong><p>${item.sets} séries · ${item.reps} reps · RIR ${item.rir} · descanso ${item.rest}</p></div></article>`).join('')}
      </div>
    </details>`;
  }

  function renderHomeMission(plan,profile){
    const session=plan.sessions[0];
    const list=document.getElementById('exerciseList');
    if(!session||!list)return;
    const title=document.querySelector('#view-missao .mission-title h2');
    const structure=document.querySelector('#view-missao .mission .structure');
    if(title)title.textContent=session.label;
    if(structure)structure.textContent=`Estrutura: ${session.exercises.length} exercícios · ${sessionSetCount(session)} séries diretas`;
    list.innerHTML=session.exercises.map((item,i)=>`<div class="exercise"><div class="num">${String(i+1).padStart(2,'0')}</div><div><span class="tag">${item.exercise.primary}</span><strong>${item.exercise.name}</strong><div class="detail">${item.sets} séries · ${item.reps} reps · RIR ${item.rir} · ${item.rest} descanso</div><div class="hint">Registre carga, repetições e esforço real para o Sistema comparar esta execução na próxima exposição.</div></div><div><button class="act generated-act" aria-label="Registrar resultado — ${item.exercise.name}">REGISTRAR</button></div></div>`).join('');
    document.querySelectorAll('.generated-act').forEach(btn=>btn.addEventListener('click',()=>{btn.classList.toggle('done');btn.textContent=btn.classList.contains('done')?'REGISTRADO':'REGISTRAR';}));
  }

  function render(){
    ensureUI();
    const container=document.getElementById('generatedSessions');
    if(!container)return;
    const profile=readProfile();
    const volume=readVolume();
    const ready=Boolean(profile.goal&&profile.experience&&profile.frequency&&Array.isArray(profile.equipment)&&volume?.targets?.length);
    const state=document.getElementById('prescriptionState');
    const title=document.getElementById('prescriptionTitle');
    const text=document.getElementById('prescriptionText');
    const progression=document.getElementById('progressionRuleText');

    if(!ready){
      if(state)state.textContent='AGUARDA DADOS';
      if(title)title.textContent='Prescrição bloqueada';
      if(text)text.textContent='Complete objetivo, experiência, rotina e equipamentos para o Sistema transformar o volume em sessões reais.';
      container.innerHTML='<div class="week-empty">Nenhum treino foi gerado ainda.</div>';
      localStorage.removeItem(PLAN_KEY);
      return;
    }

    const plan=buildPlan(profile,volume);
    if(state)state.textContent='PLANO GERADO';
    if(title)title.textContent=`${plan.sessions.length} sessões · ${profile.goal}`;
    if(text)text.textContent='O plano começa pela faixa inferior de volume e usa trabalho direto + indireto para evitar séries redundantes.';
    if(progression)progression.textContent=progressionRule(profile);
    container.innerHTML=plan.sessions.map(renderPlanSession).join('');
    renderHomeMission(plan,profile);

    localStorage.setItem(PLAN_KEY,JSON.stringify({version:1,generatedAt:new Date().toISOString(),goal:profile.goal,experience:profile.experience,sessions:plan.sessions.map(s=>({label:s.label,exercises:s.exercises.map(item=>({id:item.exercise.id,name:item.exercise.name,primary:item.exercise.primary,secondary:item.exercise.secondary,sets:item.sets,reps:item.reps,rir:item.rir,rest:item.rest}))})),equivalentVolume:plan.totals,targets:plan.targets}));
  }

  render();
  document.getElementById('profileForm')?.addEventListener('submit',()=>setTimeout(render,40));
})();