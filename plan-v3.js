const planV3Styles=document.createElement('link');
planV3Styles.rel='stylesheet';
planV3Styles.href='plan-v3.css';
document.head.appendChild(planV3Styles);

(()=>{
  const PROFILE_KEY='sistemaEvolucao.playerProfile.v1';
  const VOLUME_KEY='sistemaEvolucao.volumeTargets.v1';
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';
  const GENERATED_KEY='sistemaEvolucao.trainingPlan.generated.v3';
  const PREF_KEY='sistemaEvolucao.exercisePreferences.v1';
  const HISTORY_KEY='sistemaEvolucao.workoutHistory.v1';

  const MUSCLES=['Peito','Costas','Ombros','Bíceps','Tríceps','Quadríceps','Posteriores','Glúteos','Panturrilhas'];
  const UPPER=new Set(['Peito','Costas','Ombros','Bíceps','Tríceps']);
  const LOWER=new Set(['Quadríceps','Posteriores','Glúteos','Panturrilhas']);
  const PUSH=new Set(['Peito','Ombros','Tríceps']);
  const PULL=new Set(['Costas','Bíceps']);
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

  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const toast=message=>{const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2500);};

  function profileFingerprint(profile){
    return JSON.stringify({goal:profile.goal||'',experience:profile.experience||'',frequency:profile.frequency||'',duration:profile.duration||'',primaryFocus:profile.primaryFocus||'Equilibrado',secondaryFocus:profile.secondaryFocus||'Nenhum',availableDays:[...(profile.availableDays||[])].sort(),equipment:[...(profile.equipment||[])].sort()});
  }

  function effectiveSessions(profile){
    const requested=Math.max(1,Math.min(6,Number(profile.frequency)||1));
    const available=Array.isArray(profile.availableDays)&&profile.availableDays.length?profile.availableDays.length:requested;
    return Math.max(1,Math.min(requested,available));
  }

  function capacity(profile){
    if(profile.duration==='20–30 min')return {exercises:4,sets:11};
    if(profile.duration==='30–45 min')return {exercises:5,sets:15};
    if(profile.duration==='45–60 min')return {exercises:6,sets:18};
    if(profile.duration==='60+ min')return {exercises:7,sets:21};
    return {exercises:5,sets:15};
  }

  function focusMuscles(profile){return FOCUS_MAP[profile.primaryFocus||'Equilibrado']||[];}
  function secondaryFocusMuscles(profile){return FOCUS_MAP[profile.secondaryFocus||'Nenhum']||[];}
  function focusDomain(profile){
    const f=focusMuscles(profile);
    if(f.some(m=>LOWER.has(m)))return 'lower';
    if(f.length)return 'upper';
    return 'balanced';
  }

  function architecture(profile){
    const n=effectiveSessions(profile);
    const domain=focusDomain(profile);
    if(n===1)return {labels:['Corpo inteiro'],reason:'Uma sessão disponível: o Sistema concentra o essencial sem abandonar grupos principais.'};
    if(n===2)return {labels:['Corpo inteiro A','Corpo inteiro B'],reason:'Duas sessões favorecem exposição de corpo inteiro com variação controlada e recuperação entre estímulos.'};
    if(n===3){
      if(domain==='upper')return {labels:['Superior · Ênfase','Inferior','Corpo inteiro'],reason:'A prioridade está no tronco/membros superiores; a semana recebe uma exposição dedicada sem retirar o treino de membros inferiores.'};
      if(domain==='lower')return {labels:['Inferior · Ênfase','Superior','Corpo inteiro'],reason:'A prioridade está nos membros inferiores; a semana recebe uma exposição dedicada sem retirar o treino de superiores.'};
      return {labels:['Corpo inteiro A','Corpo inteiro B','Corpo inteiro C'],reason:'Com três sessões e prioridade equilibrada, corpo inteiro distribui melhor frequência e reduz dependência de um único dia por músculo.'};
    }
    if(n===4)return {labels:domain==='upper'?['Superior A · Ênfase','Inferior A','Superior B','Inferior B']:domain==='lower'?['Inferior A · Ênfase','Superior A','Inferior B','Superior B']:['Superior A','Inferior A','Superior B','Inferior B'],reason:'Quatro sessões permitem separar superior/inferior e distribuir o volume com duas exposições semanais para os principais grupos.'};
    if(n===5)return {labels:domain==='upper'?['Superior A','Inferior A','Corpo inteiro · Ênfase','Superior B','Inferior B']:domain==='lower'?['Inferior A','Superior A','Corpo inteiro · Ênfase','Inferior B','Superior B']:['Superior A','Inferior A','Corpo inteiro','Superior B','Inferior B'],reason:'Cinco sessões usam uma sessão híbrida para distribuir volume sem transformar frequência em excesso de séries por dia.'};
    return {labels:['Empurrar A','Puxar A','Pernas A','Empurrar B','Puxar B','Pernas B'],reason:'Seis sessões permitem alta frequência com sessões menores; o volume semanal continua limitado pelos alvos, não pela quantidade de dias.'};
  }

  function muscleWeight(label,muscle,profile){
    let w=0;
    if(label.startsWith('Corpo inteiro'))w=1;
    else if(label.startsWith('Superior'))w=UPPER.has(muscle)?1:0;
    else if(label.startsWith('Inferior'))w=LOWER.has(muscle)?1:0;
    else if(label.startsWith('Empurrar'))w=PUSH.has(muscle)?1:0;
    else if(label.startsWith('Puxar'))w=PULL.has(muscle)?1:0;
    else if(label.startsWith('Pernas'))w=LOWER.has(muscle)?1:0;
    if(label.includes('Ênfase')&&focusMuscles(profile).includes(muscle))w+=.8;
    if(focusMuscles(profile).includes(muscle))w+=.22;
    if(secondaryFocusMuscles(profile).includes(muscle))w+=.1;
    return w;
  }

  function weeklyTargets(volume,profile){
    const experience=profile.experience||'';
    const ratio=experience==='Iniciante'?{primary:.35,secondary:.18,base:0}:experience==='Intermediário'?{primary:.55,secondary:.32,base:.12}:{primary:.65,secondary:.4,base:.18};
    return (volume?.targets||[]).map(item=>{
      const min=Number(item.min)||0,max=Math.max(min,Number(item.max)||min);
      const role=item.role||'base';
      const target=Math.min(max,Math.round((min+(max-min)*(ratio[role]??.15))*2)/2);
      return {...item,min,max,target};
    });
  }

  function equipmentSet(profile){return new Set(Array.isArray(profile.equipment)?profile.equipment:[]);}
  function compatible(ex,profile){const equipment=equipmentSet(profile);return ex.requires.every(req=>equipment.has(req));}
  function prefs(){return {...{pinned:[],liked:[],avoided:[]},...(read(PREF_KEY,{})||{})};}
  function historyCounts(){
    const counts={};
    (read(HISTORY_KEY,[])||[]).forEach(workout=>(workout.exercises||[]).forEach(ex=>{counts[ex.id]=(counts[ex.id]||0)+1;}));
    return counts;
  }
  function continuityIds(){
    const current=read(PLAN_KEY,null);
    return new Set((current?.sessions||[]).flatMap(s=>(s.exercises||[]).map(ex=>ex.id)));
  }

  function repScheme(ex,profile){
    const beginner=profile.experience==='Iniciante'||!profile.experience;
    const compound=ex.type==='compound';
    if(profile.goal==='Força')return {reps:compound?'3–6':'6–10',rir:beginner?'3':'2–3',rest:compound?'180–240 s':'90–150 s'};
    if(profile.goal==='Recondicionamento')return {reps:'8–15',rir:'3–4',rest:compound?'120–180 s':'90–120 s'};
    if(profile.goal==='Hipertrofia')return {reps:compound?'6–12':'10–20',rir:beginner?'2–3':'1–3',rest:compound?'120–180 s':'60–120 s'};
    if(profile.goal==='Emagrecimento')return {reps:compound?'6–12':'10–15',rir:'2–3',rest:compound?'120–180 s':'60–120 s'};
    return {reps:compound?'6–12':'10–15',rir:'2–3',rest:compound?'120–180 s':'60–120 s'};
  }

  function chooseExercise(muscle,profile,session,usage){
    const p=prefs(),history=historyCounts(),continuity=continuityIds();
    const candidates=CATALOG.filter(ex=>ex.primary===muscle&&compatible(ex,profile)&&!p.avoided.includes(ex.id));
    if(!candidates.length)return null;
    const patterns=new Set(session.exercises.map(item=>item.pattern));
    return [...candidates].sort((a,b)=>score(b)-score(a))[0];
    function score(ex){
      let s=0;
      if(p.pinned.includes(ex.id))s+=100;
      if(p.liked.includes(ex.id))s+=25;
      if(continuity.has(ex.id))s+=14;
      s+=Math.min(18,(history[ex.id]||0)*3);
      if(ex.type==='compound'&&session.exercises.length<3)s+=5;
      if(!patterns.has(ex.pattern))s+=4;
      const used=usage[ex.id]||0;
      if(used===1)s+=3;
      if(used>=2)s-=12*(used-1);
      return s;
    }
  }

  function totalsFor(sessions){
    const totals=Object.fromEntries(MUSCLES.map(m=>[m,0]));
    sessions.forEach(session=>session.exercises.forEach(ex=>{
      totals[ex.primary]=(totals[ex.primary]||0)+Number(ex.sets||0);
      (ex.secondary||[]).forEach(m=>{if(m in totals)totals[m]+=Number(ex.sets||0)*.5;});
    }));
    return totals;
  }

  function sessionSets(session){return session.exercises.reduce((sum,ex)=>sum+Number(ex.sets||0),0);}
  function materialize(ex,sets,profile){return {...ex,sets,...repScheme(ex,profile)};}

  function generatePlan(){
    const profile=read(PROFILE_KEY,{})||{};
    const volume=read(VOLUME_KEY,null);
    if(!profile.goal||!profile.frequency||!volume?.targets?.length)return null;
    const arch=architecture(profile);
    const targets=weeklyTargets(volume,profile);
    const sessions=arch.labels.map((label,index)=>({index:index+1,label,exercises:[]}));
    const cap=capacity(profile);
    const usage={};
    let safety=0;

    while(safety++<160){
      const totals=totalsFor(sessions);
      let best=null;
      sessions.forEach(session=>{
        if(session.exercises.length>=cap.exercises||sessionSets(session)>=cap.sets)return;
        targets.forEach(target=>{
          const weight=muscleWeight(session.label,target.muscle,profile);
          const deficit=target.target-(totals[target.muscle]||0);
          if(weight<=0||deficit<.75)return;
          const duplicate=session.exercises.filter(ex=>ex.primary===target.muscle).length;
          const roleBonus=target.role==='primary'?4:target.role==='secondary'?2:0;
          const score=deficit*weight+roleBonus-(duplicate*3);
          if(!best||score>best.score)best={session,target,score};
        });
      });
      if(!best)break;
      const ex=chooseExercise(best.target.muscle,profile,best.session,usage);
      if(!ex){best.target.target=Math.min(best.target.target,totals[best.target.muscle]||0);continue;}
      const deficit=Math.max(1,best.target.target-(totals[best.target.muscle]||0));
      const remaining=cap.sets-sessionSets(best.session);
      const sets=Math.max(1,Math.min(3,remaining,Math.ceil(deficit)));
      if(sets<1)break;
      best.session.exercises.push(materialize(ex,sets,profile));
      usage[ex.id]=(usage[ex.id]||0)+1;
    }

    sessions.forEach(session=>{
      session.exercises.sort((a,b)=>{
        const pf=focusMuscles(profile),sf=secondaryFocusMuscles(profile);
        const s=ex=>(pf.includes(ex.primary)?-30:sf.includes(ex.primary)?-15:0)+(ex.type==='compound'?-7:0);
        return s(a)-s(b);
      });
    });

    const totals=totalsFor(sessions);
    const unmetTargets=targets.filter(t=>(totals[t.muscle]||0)+.01<t.min).map(t=>({muscle:t.muscle,target:t.min,actual:totals[t.muscle]||0,role:t.role,reason:'capacidade, equipamento ou distribuição atual'}));
    return {version:3,generator:'system-v3',generatedAt:new Date().toISOString(),profileFingerprint:profileFingerprint(profile),goal:profile.goal,experience:profile.experience,architecture:{sessions:sessions.length,reason:arch.reason},sessions,equivalentVolume:totals,targets,unmetTargets,userEdited:false};
  }

  function warnings(plan){
    const totals=totalsFor(plan.sessions||[]),items=[];
    (plan.targets||[]).forEach(t=>{
      const actual=totals[t.muscle]||0;
      if(actual+0.01<t.min)items.push(`${t.muscle}: ${actual.toFixed(1)} abaixo da faixa ${t.min}–${t.max}.`);
      if(actual>t.max+1)items.push(`${t.muscle}: ${actual.toFixed(1)} acima da faixa ${t.min}–${t.max}.`);
    });
    const cap=capacity(read(PROFILE_KEY,{})||{});
    (plan.sessions||[]).forEach(s=>{if(s.exercises.length>cap.exercises||sessionSets(s)>cap.sets)items.push(`${s.label}: volume/quantidade acima da capacidade estimada para o tempo informado.`);});
    return items;
  }

  function normalizePlan(plan){
    plan.equivalentVolume=totalsFor(plan.sessions||[]);
    plan.unmetTargets=(plan.targets||[]).filter(t=>(plan.equivalentVolume[t.muscle]||0)+.01<t.min).map(t=>({muscle:t.muscle,target:t.min,actual:plan.equivalentVolume[t.muscle]||0,role:t.role,reason:'edição manual'}));
    return plan;
  }

  function renderOverview(plan){
    if(!plan)return;
    const state=document.getElementById('prescriptionState');
    const title=document.getElementById('prescriptionTitle');
    const text=document.getElementById('prescriptionText');
    const container=document.getElementById('generatedSessions');
    if(state)state.textContent=plan.userEdited?'PLANO PERSONALIZADO':'MOTOR V3';
    if(title)title.textContent=`${plan.sessions.length} sessões · ${plan.goal}`;
    if(text)text.textContent=plan.userEdited?'Plano ajustado por você. O Sistema continua exibindo alertas de volume e capacidade sem bloquear suas escolhas.':plan.architecture?.reason||'Plano distribuído conforme contexto do jogador.';
    if(container)container.innerHTML=plan.sessions.map((session,index)=>`<details class="generated-session" ${index===0?'open':''}><summary><span class="session-index">${String(index+1).padStart(2,'0')}</span><div><strong>${session.label}</strong><small>${session.exercises.length} exercícios · ${sessionSets(session)} séries diretas</small></div><span>ABRIR</span></summary><div class="session-exercises">${session.exercises.map((ex,i)=>`<article class="prescribed-exercise"><span class="exercise-order">${String(i+1).padStart(2,'0')}</span><div><small>${ex.primary} · ${ex.type==='compound'?'MULTIARTICULAR':'ISOLADO'}</small><strong>${ex.name}</strong><p>${ex.sets} séries · ${ex.reps} reps · RIR ${ex.rir} · descanso ${ex.rest}</p></div></article>`).join('')}</div></details>`).join('');
    ensureEditorSection(plan);
  }

  function ensureEditorSection(plan){
    let section=document.getElementById('planEditorArchitecture');
    if(!section){
      const anchor=document.getElementById('prescriptionArchitecture');
      if(!anchor)return;
      anchor.insertAdjacentHTML('afterend',`<section class="section" id="planEditorArchitecture"><div class="panel"><div class="plan-v3-head"><div><div class="kicker">CONTROLE DO JOGADOR</div><h2>Seu plano, suas escolhas</h2><p class="muted">O Sistema recomenda. Você pode trocar, remover, adicionar, reordenar ou ajustar séries. Alertas orientam sem bloquear.</p></div><span class="plan-v3-badge" id="planV3Badge">MOTOR V3</span></div><div class="plan-v3-actions"><button id="openPlanEditor">EDITAR PLANO</button><button id="regeneratePlanV3">RECALCULAR PELO SISTEMA</button><button id="restoreGeneratedPlan">RESTAURAR SUGESTÃO</button></div><div class="plan-v3-note" id="planV3Note"></div></div></section>`);
      document.getElementById('openPlanEditor')?.addEventListener('click',()=>openEditor(read(PLAN_KEY,null)));
      document.getElementById('regeneratePlanV3')?.addEventListener('click',()=>{const next=generatePlan();if(!next)return;write(GENERATED_KEY,next);write(PLAN_KEY,next);toast('Plano recalculado pelo Motor V3.');setTimeout(()=>location.reload(),350);});
      document.getElementById('restoreGeneratedPlan')?.addEventListener('click',()=>{const base=read(GENERATED_KEY,null);if(!base){toast('Ainda não existe uma sugestão V3 salva.');return;}write(PLAN_KEY,{...clone(base),userEdited:false});toast('Sugestão do Sistema restaurada.');setTimeout(()=>location.reload(),350);});
    }
    const badge=document.getElementById('planV3Badge');
    const note=document.getElementById('planV3Note');
    if(badge)badge.textContent=plan.userEdited?'PERSONALIZADO':'MOTOR V3';
    const issues=warnings(plan);
    if(note)note.innerHTML=issues.length?`<strong>Leitura do Sistema</strong>${issues.slice(0,3).join('<br>')}`:`<strong>Leitura do Sistema</strong>Distribuição dentro das faixas atuais. Exercícios podem ser mantidos por várias semanas para permitir comparação real.`;
  }

  function catalogOptions(profile,currentId=''){
    return CATALOG.filter(ex=>compatible(ex,profile)&&!prefs().avoided.includes(ex.id)).map(ex=>`<option value="${ex.id}" ${ex.id===currentId?'selected':''}>${ex.primary} · ${ex.name}</option>`).join('');
  }

  function ensureEditorModal(){
    if(document.getElementById('planEditorModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="pe-overlay" id="planEditorModal" hidden><div class="panel pe-sheet" role="dialog" aria-modal="true"><div class="pe-top"><div><div class="kicker">◆ EDIÇÃO DO PLANO</div><h2>Editar plano base</h2><p class="muted">Mudanças aqui são permanentes até você restaurar ou recalcular.</p></div><button class="pe-close" id="closePlanEditor" aria-label="Fechar">×</button></div><div id="planEditorWarnings"></div><div id="planEditorBody"></div><div class="pe-footer"><small>O Sistema avisa quando uma edição altera demais o volume planejado.</small><div class="pe-footer-actions"><button class="pe-mini" id="cancelPlanEditor">CANCELAR</button><button class="pe-mini pe-primary" id="savePlanEditor">SALVAR ALTERAÇÕES</button></div></div></div></div>`);
    document.getElementById('closePlanEditor')?.addEventListener('click',closeEditor);
    document.getElementById('cancelPlanEditor')?.addEventListener('click',closeEditor);
    document.getElementById('planEditorModal')?.addEventListener('click',event=>{if(event.target.id==='planEditorModal')closeEditor();});
  }

  let draft=null;
  function openEditor(plan){if(!plan)return;ensureEditorModal();draft=clone(plan);renderEditor();document.getElementById('planEditorModal').hidden=false;document.body.classList.add('modal-open');}
  function closeEditor(){const modal=document.getElementById('planEditorModal');if(modal)modal.hidden=true;document.body.classList.remove('modal-open');draft=null;}

  function renderEditor(){
    if(!draft)return;
    const body=document.getElementById('planEditorBody');
    const profile=read(PROFILE_KEY,{})||{};
    body.innerHTML=draft.sessions.map((session,sIndex)=>`<section class="pe-session" data-session="${sIndex}"><div class="pe-session-head"><div><small>SESSÃO ${sIndex+1}</small><strong>${session.label}</strong></div><span>${sessionSets(session)} séries</span></div>${session.exercises.map((ex,eIndex)=>`<div class="pe-exercise" data-exercise="${eIndex}"><div class="pe-ex-main"><small>${ex.primary} · ${ex.pattern||'padrão livre'}</small><strong>${ex.name}</strong><span>${ex.reps} reps · RIR ${ex.rir} · ${ex.rest}</span></div><div class="pe-controls"><button class="pe-icon" data-act="up">↑</button><button class="pe-icon" data-act="down">↓</button><span class="pe-sets"><button class="pe-icon" data-act="sets-minus">−</button><b>${ex.sets}</b><button class="pe-icon" data-act="sets-plus">+</button></span><button class="pe-mini" data-act="replace">TROCAR</button><button class="pe-mini" data-act="pin">${prefs().pinned.includes(ex.id)?'FIXADO':'MANTER'}</button><button class="pe-mini pe-danger" data-act="remove">REMOVER</button><button class="pe-mini pe-danger" data-act="avoid">EVITAR</button></div><div class="pe-replace" hidden><select>${catalogOptions(profile,ex.id)}</select><button class="pe-mini" data-act="apply-replace">APLICAR TROCA</button></div></div>`).join('')}<div class="pe-add"><select class="pe-add-select"><option value="">Adicionar exercício...</option>${catalogOptions(profile)}</select><button class="pe-mini" data-act="add">ADICIONAR</button></div><div class="pe-custom-form"><input class="pe-custom-name" placeholder="Exercício personalizado"><select class="pe-custom-muscle">${MUSCLES.map(m=>`<option>${m}</option>`).join('')}</select><input class="pe-custom-sets" type="number" min="1" max="6" value="3"><button class="pe-mini" data-act="custom">CRIAR</button></div></section>`).join('');
    body.querySelectorAll('[data-act]').forEach(button=>button.addEventListener('click',handleEditorAction));
    renderWarnings();
  }

  function renderWarnings(){
    const box=document.getElementById('planEditorWarnings');if(!box||!draft)return;
    const items=warnings(draft);
    box.innerHTML=items.length?items.map(item=>`<div class="pe-warning">${item}</div>`).join(''):`<div class="pe-warning ok">Nenhum alerta relevante com a distribuição atual.</div>`;
  }

  function setPreference(kind,id,on=true){
    const p=prefs();
    ['pinned','liked','avoided'].forEach(key=>{p[key]=Array.isArray(p[key])?p[key]:[];});
    p[kind]=on?[...new Set([...p[kind],id])]:p[kind].filter(value=>value!==id);
    if(kind==='avoided'&&on){p.pinned=p.pinned.filter(value=>value!==id);p.liked=p.liked.filter(value=>value!==id);}
    write(PREF_KEY,p);
  }

  function handleEditorAction(event){
    event.preventDefault();
    const button=event.currentTarget;
    const sessionEl=button.closest('.pe-session');
    const exEl=button.closest('.pe-exercise');
    const sIndex=Number(sessionEl?.dataset.session);
    const eIndex=exEl?Number(exEl.dataset.exercise):-1;
    const session=draft.sessions[sIndex];
    const ex=eIndex>=0?session.exercises[eIndex]:null;
    const act=button.dataset.act;
    if(act==='up'&&eIndex>0)[session.exercises[eIndex-1],session.exercises[eIndex]]=[session.exercises[eIndex],session.exercises[eIndex-1]];
    if(act==='down'&&eIndex<session.exercises.length-1)[session.exercises[eIndex+1],session.exercises[eIndex]]=[session.exercises[eIndex],session.exercises[eIndex+1]];
    if(act==='sets-minus'&&ex)ex.sets=Math.max(1,Number(ex.sets)-1);
    if(act==='sets-plus'&&ex)ex.sets=Math.min(6,Number(ex.sets)+1);
    if(act==='replace'&&exEl){const row=exEl.querySelector('.pe-replace');row.hidden=!row.hidden;return;}
    if(act==='apply-replace'&&ex){const id=exEl.querySelector('.pe-replace select').value;const next=CATALOG.find(item=>item.id===id);if(next)session.exercises[eIndex]=materialize(next,ex.sets,read(PROFILE_KEY,{})||{});}
    if(act==='pin'&&ex){const active=prefs().pinned.includes(ex.id);setPreference('pinned',ex.id,!active);}
    if(act==='remove'&&ex)session.exercises.splice(eIndex,1);
    if(act==='avoid'&&ex){setPreference('avoided',ex.id,true);session.exercises.splice(eIndex,1);}
    if(act==='add'){
      const id=sessionEl.querySelector('.pe-add-select').value;const next=CATALOG.find(item=>item.id===id);if(next)session.exercises.push(materialize(next,2,read(PROFILE_KEY,{})||{}));
    }
    if(act==='custom'){
      const name=sessionEl.querySelector('.pe-custom-name').value.trim();
      const primary=sessionEl.querySelector('.pe-custom-muscle').value;
      const sets=Math.max(1,Math.min(6,Number(sessionEl.querySelector('.pe-custom-sets').value)||3));
      if(!name){toast('Informe o nome do exercício personalizado.');return;}
      session.exercises.push({id:`custom-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,name,primary,secondary:[],pattern:'personalizado',type:'custom',requires:[],sets,reps:'8–15',rir:'2–3',rest:'90–150 s',custom:true});
    }
    draft=normalizePlan(draft);
    renderEditor();
  }

  function saveDraft(){
    if(!draft)return;
    if(draft.sessions.some(session=>!session.exercises.length)){toast('Toda sessão precisa ter ao menos um exercício.');return;}
    draft=normalizePlan(draft);
    draft.userEdited=true;
    draft.manualEditedAt=new Date().toISOString();
    write(PLAN_KEY,draft);
    closeEditor();
    toast('Plano personalizado salvo. Atualizando a missão...');
    setTimeout(()=>location.reload(),450);
  }

  function boot(){
    const profile=read(PROFILE_KEY,{})||{};
    const current=read(PLAN_KEY,null);
    const fingerprint=profileFingerprint(profile);
    let active=current;
    const needsV3=!current||current.version!==3||current.profileFingerprint!==fingerprint;
    if(needsV3){
      const generated=generatePlan();
      if(generated){write(GENERATED_KEY,generated);write(PLAN_KEY,generated);active=generated;}
    }else if(!read(GENERATED_KEY,null)&&current&&!current.userEdited){write(GENERATED_KEY,current);}
    if(active?.version===3)renderOverview(active);
    ensureEditorModal();
    document.getElementById('savePlanEditor')?.addEventListener('click',saveDraft);
  }

  window.SistemaPlanV3={catalog:CATALOG,generatePlan,totalsFor,warnings,prefs,compatible,repScheme};
  boot();
  document.getElementById('profileForm')?.addEventListener('submit',()=>setTimeout(()=>{
    const generated=generatePlan();
    if(!generated)return;
    write(GENERATED_KEY,generated);write(PLAN_KEY,generated);renderOverview(generated);
  },90));
})();