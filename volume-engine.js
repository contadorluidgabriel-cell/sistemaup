const volumeStyles=document.createElement('link');
volumeStyles.rel='stylesheet';
volumeStyles.href='volume-engine.css';
document.head.appendChild(volumeStyles);

(()=>{
  const PROFILE_STORAGE='sistemaEvolucao.playerProfile.v1';
  const VOLUME_STORAGE='sistemaEvolucao.volumeTargets.v1';

  const MUSCLES=['Peito','Costas','Ombros','Bíceps','Tríceps','Quadríceps','Posteriores','Glúteos','Panturrilhas'];
  const FOCUS_MAP={
    Peito:['Peito'],
    Costas:['Costas'],
    Ombros:['Ombros'],
    Braços:['Bíceps','Tríceps'],
    Quadríceps:['Quadríceps'],
    Posteriores:['Posteriores'],
    Glúteos:['Glúteos'],
    Panturrilhas:['Panturrilhas'],
    Equilibrado:[]
  };

  const STARTING_BANDS={
    Hipertrofia:{Iniciante:[6,8],Intermediário:[8,10],Avançado:[10,12]},
    Emagrecimento:{Iniciante:[6,8],Intermediário:[8,10],Avançado:[8,12]},
    Força:{Iniciante:[4,6],Intermediário:[6,8],Avançado:[6,10]},
    Recondicionamento:{Iniciante:[4,6],Intermediário:[5,8],Avançado:[6,8]},
    Manutenção:{Iniciante:[4,6],Intermediário:[4,8],Avançado:[6,8]}
  };

  function readProfile(){
    try{
      const data=JSON.parse(localStorage.getItem(PROFILE_STORAGE)||'null')||{};
      return {
        goal:data.goal||'',
        experience:data.experience||'',
        frequency:data.frequency||'',
        primaryFocus:data.primaryFocus||'Equilibrado',
        secondaryFocus:data.secondaryFocus||'Nenhum',
        availableDays:Array.isArray(data.availableDays)?data.availableDays:[]
      };
    }catch{
      return {goal:'',experience:'',frequency:'',primaryFocus:'Equilibrado',secondaryFocus:'Nenhum',availableDays:[]};
    }
  }

  function normalizedFocus(profile){
    const primary=profile.primaryFocus||'Equilibrado';
    let secondary=profile.secondaryFocus||'Nenhum';
    if(primary==='Equilibrado'||secondary===primary)secondary='Nenhum';
    return {primary,secondary};
  }

  function sessionCount(profile){
    const requested=Number(profile.frequency)||0;
    if(!requested)return 0;
    let cap=requested;
    if(profile.experience==='Iniciante'||!profile.experience)cap=Math.min(cap,3);
    else if(profile.experience==='Intermediário')cap=Math.min(cap,4);
    if(profile.availableDays.length)cap=Math.min(cap,profile.availableDays.length);
    return cap;
  }

  function baseBand(profile){
    const goal=profile.goal||'Hipertrofia';
    const experience=profile.experience||'Iniciante';
    return [...(STARTING_BANDS[goal]?.[experience]||STARTING_BANDS.Hipertrofia.Iniciante)];
  }

  function exposureTarget(profile,role){
    const sessions=sessionCount(profile);
    if(sessions<=1)return '1 exposição';
    if(role==='primary'&&sessions===5)return '2–3 exposições';
    return '2 exposições';
  }

  function rangeForMuscle(profile,muscle){
    const [baseMin,baseMax]=baseBand(profile);
    const {primary,secondary}=normalizedFocus(profile);
    const primaryMuscles=FOCUS_MAP[primary]||[];
    const secondaryMuscles=FOCUS_MAP[secondary]||[];
    let min=baseMin;
    let max=baseMax;
    let role='base';

    if(primaryMuscles.includes(muscle)){
      role='primary';
      if(profile.experience==='Iniciante')max+=2;
      else {min+=2;max+=2;}
    }else if(secondaryMuscles.includes(muscle)){
      role='secondary';
      max+=1;
    }

    return {muscle,min,max,role,exposure:exposureTarget(profile,role)};
  }

  function goalRule(profile){
    if(profile.goal==='Hipertrofia')return 'Para hipertrofia, o volume semanal tem relação dose–resposta, mas com retornos decrescentes. O Sistema começa conservador e usa o histórico antes de ampliar a faixa.';
    if(profile.goal==='Força')return 'Para força, volume é apenas uma parte da prescrição. Carga, especificidade do movimento, ordem do exercício e frequência de prática também precisam orientar o treino.';
    if(profile.goal==='Emagrecimento')return 'No emagrecimento, a musculação preserva desempenho e massa muscular; o Sistema não compensa déficit energético empilhando séries. Aeróbico permanece complementar.';
    if(profile.goal==='Recondicionamento')return 'No recondicionamento, o primeiro objetivo é construir tolerância e consistência. Volume sobe somente quando execução e recuperação justificarem.';
    if(profile.goal==='Manutenção')return 'Na manutenção, o motor busca o menor volume que sustente desempenho e rotina, sem adicionar trabalho que não tenha função clara.';
    return 'Defina o objetivo principal para o Sistema escolher uma faixa inicial coerente.';
  }

  function volumeModel(profile){
    const ready=Boolean(profile.goal&&profile.experience&&profile.frequency);
    const targets=MUSCLES.map(muscle=>rangeForMuscle(profile,muscle));
    const roleOrder={primary:0,secondary:1,base:2};
    targets.sort((a,b)=>roleOrder[a.role]-roleOrder[b.role]||MUSCLES.indexOf(a.muscle)-MUSCLES.indexOf(b.muscle));
    return {
      ready,
      goal:profile.goal||'Não definido',
      experience:profile.experience||'Não definida',
      sessions:sessionCount(profile),
      rule:goalRule(profile),
      targets
    };
  }

  function roleLabel(role){
    if(role==='primary')return 'PRIORIDADE';
    if(role==='secondary')return 'SECUNDÁRIA';
    return 'BASE';
  }

  function ensureUI(){
    if(document.getElementById('volumeArchitecture'))return;
    const weekly=document.getElementById('weeklyArchitecture');
    if(!weekly)return;

    weekly.insertAdjacentHTML('afterend',`
      <section class="section" id="volumeArchitecture">
        <div class="section-head"><div><div class="kicker">MOTOR DE VOLUME</div><h2>Volume semanal</h2></div><small id="volumeEngineState">AGUARDA DADOS</small></div>
        <div class="panel volume-engine-panel">
          <div class="volume-summary">
            <div><span class="screen-label">FAIXA INICIAL DO SISTEMA</span><strong id="volumeSummaryTitle">Configure objetivo e experiência</strong><p id="volumeSummaryText">As faixas aparecem antes dos exercícios para evitar prescrição genérica.</p></div>
            <span class="engine-state" id="volumeSessionCount">—</span>
          </div>

          <div class="volume-method">
            <div><span>DIRETA</span><strong>1,0</strong><small>crédito por série</small></div>
            <div><span>INDIRETA</span><strong>0,5</strong><small>aproximação interna</small></div>
            <div><span>NÃO ESPECÍFICA</span><strong>0</strong><small>não entra na conta</small></div>
          </div>
          <p class="volume-method-note">O contador é uma ferramenta de organização: séries diretas contam integralmente e trabalho indireto relevante pode contar de forma fracionada. Não significa que toda série tenha exatamente o mesmo efeito biológico.</p>

          <div class="volume-list" id="volumeTargetList"></div>

          <div class="volume-adaptation">
            <article><span>MANTER</span><strong>Se está funcionando</strong><p>Desempenho progride e a recuperação está adequada: não aumentar volume por calendário.</p></article>
            <article><span>AMPLIAR</span><strong>Gradualmente</strong><p>Adicionar pouco volume somente após boa tolerância, execução consistente e espaço real na rotina.</p></article>
            <article><span>REDUZIR</span><strong>Quando necessário</strong><p>Queda repetida de desempenho, sessões incompletas, recuperação ruim ou desconforto pedem reavaliação.</p></article>
          </div>
        </div>
        <div class="system-msg focus-rule"><div class="kicker">◆ REGRA TÉCNICA</div><p id="volumeGoalRule">O volume é ponto de partida, não um número mágico.</p></div>
      </section>`);
  }

  function render(){
    ensureUI();
    const list=document.getElementById('volumeTargetList');
    if(!list)return;

    const profile=readProfile();
    const model=volumeModel(profile);
    const state=document.getElementById('volumeEngineState');
    const title=document.getElementById('volumeSummaryTitle');
    const text=document.getElementById('volumeSummaryText');
    const count=document.getElementById('volumeSessionCount');
    const rule=document.getElementById('volumeGoalRule');

    if(state)state.textContent=model.ready?'FAIXA INICIAL':'AGUARDA DADOS';
    if(count)count.textContent=model.sessions?`${model.sessions} SESSÕES`:'—';
    if(rule)rule.textContent=model.rule;

    if(!model.ready){
      if(title)title.textContent='Configure objetivo, experiência e rotina';
      if(text)text.textContent='O Sistema só libera faixas de volume quando existe contexto mínimo para não inventar uma prescrição.';
      list.innerHTML='<div class="week-empty">Volume ainda bloqueado. Complete o Perfil.</div>';
      localStorage.removeItem(VOLUME_STORAGE);
      return;
    }

    if(title)title.textContent=`${model.goal} · ${model.experience}`;
    if(text)text.textContent='Valores abaixo são séries-equivalentes semanais de partida. O histórico poderá manter, ampliar ou reduzir cada faixa.';

    list.innerHTML=model.targets.map(target=>`
      <article class="volume-row ${target.role==='primary'?'volume-primary':target.role==='secondary'?'volume-secondary':''}">
        <div><span class="volume-role">${roleLabel(target.role)}</span><strong>${target.muscle}</strong></div>
        <div class="volume-range"><b>${target.min}–${target.max}</b><span>séries-equivalentes / semana</span></div>
        <small>${target.exposure}</small>
      </article>`).join('');

    localStorage.setItem(VOLUME_STORAGE,JSON.stringify({
      version:1,
      generatedAt:new Date().toISOString(),
      goal:model.goal,
      experience:model.experience,
      sessions:model.sessions,
      accounting:{direct:1,indirect:0.5,nonSpecific:0},
      targets:model.targets
    }));
  }

  render();
  document.getElementById('profileForm')?.addEventListener('submit',()=>setTimeout(render,0));
})();

const prescriptionEngineScript=document.createElement('script');
prescriptionEngineScript.src='prescription-engine.js';
document.body.appendChild(prescriptionEngineScript);