const screensStyles=document.createElement('link');
screensStyles.rel='stylesheet';
screensStyles.href='screens.css';
document.head.appendChild(screensStyles);

const exercises=[
  {n:'01',tag:'Preparação',name:'Ativação do jogador',detail:'8 min de mobilidade e caminhada leve',action:'MARCAR',xp:12,prep:true},
  {n:'02',tag:'Peito',name:'Flexão inclinada nos apoios',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:16},
  {n:'03',tag:'Peito',name:'Supino no chão com halteres',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:16},
  {n:'04',tag:'Peito',name:'Crucifixo com elástico',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:16},
  {n:'05',tag:'Ombro',name:'Desenvolvimento com elástico',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:12},
  {n:'06',tag:'Tríceps',name:'Extensão de tríceps com elástico',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:12},
  {n:'07',tag:'Tríceps',name:'Extensão de tríceps com halter leve',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:12}
];

const list=document.getElementById('exerciseList');
if(list){
  list.innerHTML=exercises.map((e,i)=>`<div class="exercise"><div class="num">${e.n}</div><div><span class="tag">${e.tag}</span><strong>${e.name}</strong><div class="detail">${e.detail}</div>${e.prep?'':'<div class="hint">Primeira leitura: registre o resultado para liberar uma sugestão na próxima vez.</div>'}</div><div><button class="act" data-index="${i}">${e.action}</button><div class="mini-xp">+${e.xp} XP</div></div></div>`).join('');
}

function toast(msg){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>el.classList.remove('show'),2200);
}

document.querySelectorAll('.act').forEach(btn=>btn.addEventListener('click',()=>{
  const idx=Number(btn.dataset.index);
  btn.classList.toggle('done');
  btn.textContent=btn.classList.contains('done')?'REGISTRADO':exercises[idx].action;
}));

document.getElementById('startBtn')?.addEventListener('click',()=>toast('Missão iniciada. Registre cada etapa para construir seu histórico.'));

const PROFILE_KEY='sistemaEvolucao.playerProfile.v1';
const DAY_DEFINITIONS=[
  {value:'seg',label:'SEG',name:'Segunda'},
  {value:'ter',label:'TER',name:'Terça'},
  {value:'qua',label:'QUA',name:'Quarta'},
  {value:'qui',label:'QUI',name:'Quinta'},
  {value:'sex',label:'SEX',name:'Sexta'},
  {value:'sab',label:'SÁB',name:'Sábado'},
  {value:'dom',label:'DOM',name:'Domingo'}
];
const DAY_ORDER=DAY_DEFINITIONS.map(day=>day.value);

const defaultProfile={
  name:'Luid',
  goal:'',
  frequency:'',
  duration:'',
  experience:'',
  primaryFocus:'Equilibrado',
  secondaryFocus:'Nenhum',
  availableDays:[],
  equipment:[],
  complement:'Nenhuma',
  complementFrequency:'',
  notes:''
};

function loadProfile(){
  try{
    const saved=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');
    return {
      ...defaultProfile,
      ...(saved||{}),
      equipment:Array.isArray(saved?.equipment)?saved.equipment:[],
      availableDays:Array.isArray(saved?.availableDays)?saved.availableDays:[]
    };
  }catch{
    return {...defaultProfile};
  }
}

let profile=loadProfile();
const qs=id=>document.getElementById(id);
const safeText=(value,fallback='Não definido')=>value&&String(value).trim()?String(value).trim():fallback;

function ensurePlanningUI(){
  const frequencyField=qs('profileFrequency')?.closest('.field');
  const frequencyLabel=frequencyField?.querySelector(':scope > span');
  if(frequencyLabel)frequencyLabel.textContent='Sessões de musculação que cabem na rotina';

  const frequencyGrid=frequencyField?.closest('.field-grid');
  if(frequencyGrid&&!qs('availabilityFieldset')){
    frequencyGrid.insertAdjacentHTML('afterend',`
      <fieldset class="field availability-fieldset" id="availabilityFieldset">
        <legend>Dias em que você pode treinar</legend>
        <p>Marque sua disponibilidade real. O Sistema usa os dias para distribuir sessões e recuperação, em vez de presumir uma agenda.</p>
        <div class="day-grid">
          ${DAY_DEFINITIONS.map(day=>`<label class="check-chip day-chip"><input type="checkbox" name="availableDay" value="${day.value}"><span>${day.label}</span></label>`).join('')}
        </div>
        <div class="focus-preview" id="availabilityNote">Nenhum dia informado. O plano ainda não pode ser distribuído no calendário.</div>
      </fieldset>`);
  }

  const contextGrid=document.querySelector('#view-plano .context-grid');
  if(contextGrid&&!qs('planAvailableDays')){
    const equipmentCell=qs('planEquipment')?.closest('.context-cell');
    const html='<div class="context-cell wide"><span>DIAS DISPONÍVEIS</span><strong id="planAvailableDays">Configurar</strong></div>';
    if(equipmentCell)equipmentCell.insertAdjacentHTML('beforebegin',html);
    else contextGrid.insertAdjacentHTML('beforeend',html);
  }

  if(!qs('weeklyArchitecture')){
    const campaignSection=[...document.querySelectorAll('#view-plano .section')].find(section=>section.querySelector('.kicker')?.textContent.trim()==='CAMPANHA');
    campaignSection?.insertAdjacentHTML('beforebegin',`
      <section class="section" id="weeklyArchitecture">
        <div class="section-head"><div><div class="kicker">MOTOR DE ORGANIZAÇÃO</div><h2>Estrutura semanal</h2></div><small id="planEngineState">AGUARDA DADOS</small></div>
        <div class="panel plan-engine-card">
          <div class="engine-top">
            <div><span class="screen-label">ESTRUTURA SUGERIDA</span><strong id="splitDisplay">Complete o contexto do jogador</strong><p id="splitReason">O Sistema ainda não possui dados suficientes para distribuir a musculação.</p></div>
            <span class="engine-state" id="sessionCountDisplay">—</span>
          </div>
          <div class="engine-alert" id="planEngineAlert" hidden></div>
          <div class="week-preview" id="weekPreview"></div>
          <div class="volume-policy">
            <article class="policy-card"><span>BASE GLOBAL</span><strong>Preservada</strong><p id="basePolicy">Os grandes grupos musculares continuam fazendo parte do planejamento.</p></article>
            <article class="policy-card emphasis"><span>PRIORIDADE</span><strong id="priorityPolicyTitle">Equilibrada</strong><p id="priorityPolicy">Nenhum músculo recebe aumento seletivo antes da análise do perfil.</p></article>
            <article class="policy-card"><span>PROGRESSÃO</span><strong>Por resposta</strong><p id="progressionPolicy">Volume e dificuldade só devem avançar depois de execução e recuperação registradas.</p></article>
          </div>
        </div>
        <div class="system-msg focus-rule"><div class="kicker">◆ PRINCÍPIO DO MOTOR</div><p>Disponibilidade define o que é possível. Experiência e recuperação definem o que é adequado. Prioridade muscular define onde concentrar atenção — não autoriza abandonar o restante do corpo.</p></div>
      </section>`);
  }
}

ensurePlanningUI();

function frequencyLabel(value){
  return value?`${value} sessões / semana`:'Configurar';
}

function equipmentLabel(items){
  if(!items?.length)return 'Configurar';
  if(items.length<=3)return items.join(' · ');
  return `${items.slice(0,3).join(' · ')} +${items.length-3}`;
}

function complementLabel(){
  if(!profile.complement||profile.complement==='Nenhuma')return 'Nenhum';
  if(profile.complement==='Sistema sugerir')return 'Sistema pode sugerir';
  return `${profile.complement}${profile.complementFrequency?` · ${profile.complementFrequency}x/sem`:''}`;
}

function normalizedAvailableDays(source=profile){
  const raw=Array.isArray(source.availableDays)?source.availableDays:[];
  return [...new Set(raw)].filter(day=>DAY_ORDER.includes(day)).sort((a,b)=>DAY_ORDER.indexOf(a)-DAY_ORDER.indexOf(b));
}

function availableDaysLabel(source=profile){
  const days=normalizedAvailableDays(source);
  if(!days.length)return 'Configurar';
  return days.map(value=>DAY_DEFINITIONS.find(day=>day.value===value)?.label||value).join(' · ');
}

function normalizedFocus(source=profile){
  const primary=source.primaryFocus||'Equilibrado';
  let secondary=source.secondaryFocus||'Nenhum';
  if(primary==='Equilibrado'||secondary===primary)secondary='Nenhum';
  return {primary,secondary};
}

function focusModel(source=profile){
  const {primary,secondary}=normalizedFocus(source);
  const experience=source.experience||'';

  if(primary==='Equilibrado'){
    return {
      cycle:'BASE GLOBAL',
      pill:'Ênfase: equilibrada',
      primaryDisplay:'Desenvolvimento equilibrado',
      primaryReason:'Nenhum grupo recebe especialização adicional. O planejamento preserva desenvolvimento global.',
      secondaryDisplay:'Nenhuma',
      secondaryReason:'Uma prioridade secundária só é usada quando existir uma prioridade principal clara.',
      rule:'Sem prioridade específica, o Sistema distribui o trabalho conforme objetivo, experiência, rotina e resposta registrada.'
    };
  }

  if(experience==='Iniciante'||!experience){
    return {
      cycle:experience==='Iniciante'?'BASE + ÊNFASE':'ÊNFASE PENDENTE',
      pill:`Ênfase: ${primary.toLowerCase()}`,
      primaryDisplay:primary,
      primaryReason:experience==='Iniciante'?`Preferência por ${primary.toLowerCase()} registrada. Como a base ainda está sendo construída, a ênfase deve ser controlada sem abandonar os demais grupos.`:`Preferência por ${primary.toLowerCase()} registrada. A intensidade da ênfase será definida quando a experiência estiver configurada.`,
      secondaryDisplay:secondary,
      secondaryReason:secondary==='Nenhum'?'Nenhuma prioridade secundária ativa.':`${secondary} pode receber atenção complementar sem competir com ${primary.toLowerCase()}.`,
      rule:'Na fase inicial, prioridade muscular significa atenção adicional e melhor distribuição — não especialização agressiva nem volume excessivo.'
    };
  }

  return {
    cycle:'ÊNFASE ATIVA',
    pill:`Ênfase: ${primary.toLowerCase()}`,
    primaryDisplay:primary,
    primaryReason:`${primary} será considerado primeiro na distribuição semanal, na frequência de estímulos e no acompanhamento de progressão.`,
    secondaryDisplay:secondary,
    secondaryReason:secondary==='Nenhum'?'Nenhuma prioridade secundária ativa.':`${secondary} recebe atenção complementar, abaixo da prioridade de ${primary.toLowerCase()}.`,
    rule:'A ênfase altera distribuição, frequência, ordem e monitoramento. O Sistema não aumenta séries indefinidamente e mantém os demais grupos treinados.'
  };
}

function combinations(items,size){
  const result=[];
  function walk(start,picked){
    if(picked.length===size){result.push([...picked]);return;}
    for(let i=start;i<items.length;i++){
      picked.push(items[i]);
      walk(i+1,picked);
      picked.pop();
    }
  }
  walk(0,[]);
  return result;
}

function chooseTrainingDays(availableDays,sessions,experience){
  const days=normalizedAvailableDays({availableDays});
  if(!sessions||!days.length)return [];
  if(days.length<=sessions)return days;
  const targetGap=7/sessions;
  let best=[];
  let bestScore=-Infinity;

  combinations(days,sessions).forEach(combo=>{
    const indexes=combo.map(day=>DAY_ORDER.indexOf(day)).sort((a,b)=>a-b);
    const gaps=indexes.map((value,index)=>index===indexes.length-1?7+indexes[0]-value:indexes[index+1]-value);
    const variance=gaps.reduce((sum,gap)=>sum+Math.pow(gap-targetGap,2),0);
    const consecutive=gaps.filter(gap=>gap===1).length;
    const penalty=consecutive*(experience==='Iniciante'?4:1.5);
    const score=-(variance+penalty);
    if(score>bestScore){bestScore=score;best=combo;}
  });

  return best.sort((a,b)=>DAY_ORDER.indexOf(a)-DAY_ORDER.indexOf(b));
}

function resolveSessionCount(source=profile){
  const requested=Number(source.frequency)||0;
  const availableCount=normalizedAvailableDays(source).length;
  if(!requested)return {requested:0,sessions:0,cap:0,limitedByExperience:false,limitedByAvailability:false};

  let cap=requested;
  if(source.experience==='Iniciante')cap=Math.min(requested,3);
  else if(source.experience==='Intermediário')cap=Math.min(requested,4);
  else if(!source.experience)cap=Math.min(requested,3);

  const sessions=Math.min(cap,availableCount||cap);
  return {
    requested,
    sessions,
    cap,
    limitedByExperience:cap<requested,
    limitedByAvailability:Boolean(availableCount&&availableCount<cap)
  };
}

function splitTemplate(sessions,experience){
  if(sessions<=0)return [];
  if(sessions===1)return ['Corpo inteiro'];
  if(sessions===2)return ['Corpo inteiro A','Corpo inteiro B'];
  if(sessions===3){
    return experience==='Iniciante'||!experience?['Corpo inteiro A','Corpo inteiro B','Corpo inteiro C']:['Superior','Inferior','Corpo inteiro'];
  }
  if(sessions===4)return ['Superior A','Inferior A','Superior B','Inferior B'];
  if(sessions===5)return ['Superior A','Inferior A','Superior B','Inferior B','Sessão de ênfase'];
  return ['Empurrar A','Puxar A','Pernas A','Empurrar B','Puxar B','Pernas B'];
}

function focusDomain(focus){
  if(['Peito','Ombros'].includes(focus))return 'push';
  if(['Costas'].includes(focus))return 'pull';
  if(['Quadríceps','Posteriores','Glúteos','Panturrilhas'].includes(focus))return 'lower';
  if(focus==='Braços')return 'upper';
  return 'balanced';
}

function sessionMatchesFocus(label,focus){
  const domain=focusDomain(focus);
  if(domain==='balanced')return false;
  if(label.includes('Corpo inteiro')||label.includes('ênfase'))return true;
  if(domain==='upper')return label.includes('Superior')||label.includes('Empurrar')||label.includes('Puxar');
  if(domain==='push')return label.includes('Superior')||label.includes('Empurrar');
  if(domain==='pull')return label.includes('Superior')||label.includes('Puxar');
  if(domain==='lower')return label.includes('Inferior')||label.includes('Pernas');
  return false;
}

function decorateSessions(template,source=profile){
  const {primary,secondary}=normalizedFocus(source);
  if(primary==='Equilibrado')return template.map(label=>({label,priority:false,secondary:false}));

  const matchingIndexes=template.map((label,index)=>sessionMatchesFocus(label,primary)?index:-1).filter(index=>index>=0);
  const primaryIndexes=[];
  if(matchingIndexes.length){
    primaryIndexes.push(matchingIndexes[0]);
    if(matchingIndexes.length>1)primaryIndexes.push(matchingIndexes[matchingIndexes.length-1]);
  }

  let secondaryIndex=-1;
  if(secondary!=='Nenhum'){
    secondaryIndex=template.findIndex((label,index)=>!primaryIndexes.includes(index)&&sessionMatchesFocus(label,secondary));
    if(secondaryIndex<0)secondaryIndex=template.findIndex(label=>sessionMatchesFocus(label,secondary));
  }

  return template.map((label,index)=>{
    const priority=primaryIndexes.includes(index)||label==='Sessão de ênfase';
    const secondaryHit=index===secondaryIndex;
    let finalLabel=label;
    if(label==='Sessão de ênfase')finalLabel=`Ênfase · ${primary}`;
    else if(priority)finalLabel=`${label} · ${primary}`;
    else if(secondaryHit)finalLabel=`${label} · ${secondary}`;
    return {label:finalLabel,priority,secondary:secondaryHit};
  });
}

function planningModel(source=profile){
  const resolution=resolveSessionCount(source);
  if(!resolution.requested){
    return {ready:false,state:'AGUARDA DADOS',title:'Complete o contexto do jogador',reason:'Informe quantas sessões cabem na rotina para o Sistema iniciar a organização.',sessions:0,days:[],items:[],alert:''};
  }

  const available=normalizedAvailableDays(source);
  const days=chooseTrainingDays(available,resolution.sessions,source.experience);
  const template=splitTemplate(resolution.sessions,source.experience);
  const items=decorateSessions(template,source);
  const {primary}=normalizedFocus(source);
  const alerts=[];

  if(!available.length)alerts.push('Defina os dias disponíveis para transformar esta estrutura em calendário real.');
  if(resolution.limitedByExperience)alerts.push(`${resolution.requested} sessões cabem na rotina, mas a base inicial foi limitada a ${resolution.sessions} até existir experiência/histórico suficiente para justificar maior frequência.`);
  if(resolution.limitedByAvailability)alerts.push(`A disponibilidade marcada comporta ${resolution.sessions} sessões, abaixo das ${resolution.requested} desejadas.`);

  if(days.length>1){
    const indexes=days.map(day=>DAY_ORDER.indexOf(day));
    const hasConsecutive=indexes.some((value,index)=>index<indexes.length-1&&indexes[index+1]-value===1);
    if(hasConsecutive&&source.experience==='Iniciante')alerts.push('Há sessões em dias consecutivos. O Sistema deverá controlar a sobreposição de grupos e a recuperação.');
  }

  let title='Estrutura semanal de base';
  if(resolution.sessions===2)title='Full body A/B';
  else if(resolution.sessions===3&&(source.experience==='Iniciante'||!source.experience))title='Full body distribuído';
  else if(resolution.sessions===3)title='Híbrido superior/inferior';
  else if(resolution.sessions===4)title='Superior / Inferior ×2';
  else if(resolution.sessions===5)title='Superior / Inferior + ênfase';
  else if(resolution.sessions>=6)title='Empurrar / Puxar / Pernas ×2';

  const focusPhrase=primary==='Equilibrado'?'sem especialização muscular':`com prioridade em ${primary.toLowerCase()}`;
  const reason=`${resolution.sessions} sessões organizadas ${focusPhrase}. A estrutura distribui estímulos antes de escolher exercícios, séries ou cargas.`;
  const state=resolution.limitedByExperience?'BASE INICIAL':primary==='Equilibrado'?'BASE GLOBAL':'ÊNFASE ATIVA';

  return {ready:true,state,title,reason,sessions:resolution.sessions,days,items,alert:alerts.join(' ')};
}

function profileCompleteness(){
  const checks=[profile.goal,profile.frequency,profile.duration,profile.experience,profile.equipment.length,normalizedAvailableDays(profile).length];
  return checks.filter(Boolean).length;
}

function renderPlanningEngine(){
  const model=planningModel(profile);
  const {primary}=normalizedFocus(profile);
  const engineState=qs('planEngineState');
  const splitDisplay=qs('splitDisplay');
  const splitReason=qs('splitReason');
  const countDisplay=qs('sessionCountDisplay');
  const weekPreview=qs('weekPreview');
  const alert=qs('planEngineAlert');

  if(engineState)engineState.textContent=model.state;
  if(splitDisplay)splitDisplay.textContent=model.title;
  if(splitReason)splitReason.textContent=model.reason;
  if(countDisplay)countDisplay.textContent=model.sessions?`${model.sessions} SESSÕES`:'—';

  if(weekPreview){
    if(!model.ready){
      weekPreview.innerHTML='<div class="week-empty">A estrutura aparecerá aqui quando a rotina estiver configurada.</div>';
    }else{
      weekPreview.innerHTML=model.items.map((item,index)=>{
        const dayValue=model.days[index];
        const day=DAY_DEFINITIONS.find(entry=>entry.value===dayValue);
        const dayLabel=day?.label||`S${index+1}`;
        const note=item.priority?'ESTÍMULO PRIORITÁRIO':item.secondary?'ÊNFASE SECUNDÁRIA':'BASE GLOBAL';
        return `<article class="week-session ${item.priority?'priority-session':''}"><span class="week-day">${dayLabel}</span><strong>${item.label}</strong><small>${note}</small></article>`;
      }).join('');
    }
  }

  if(alert){
    alert.hidden=!model.alert;
    alert.textContent=model.alert;
  }

  if(qs('priorityPolicyTitle'))qs('priorityPolicyTitle').textContent=primary==='Equilibrado'?'Equilibrada':primary;
  if(qs('priorityPolicy')){
    if(primary==='Equilibrado')qs('priorityPolicy').textContent='Sem prioridade seletiva: o volume deve ser distribuído de acordo com objetivo, tempo e resposta do usuário.';
    else if(profile.experience==='Iniciante')qs('priorityPolicy').textContent=`${primary} recebe melhor posição e distribuição, mas o Sistema evita especialização agressiva enquanto a base global está sendo construída.`;
    else qs('priorityPolicy').textContent=`${primary} é o primeiro grupo candidato a maior frequência ou volume quando execução, desempenho e recuperação demonstrarem tolerância.`;
  }
  if(qs('progressionPolicy'))qs('progressionPolicy').textContent='Ajustes futuros usarão séries concluídas, repetições, carga, RIR/esforço, desconforto e tendência de desempenho — não calendário fixo.';
}

function renderProfile(){
  const name=safeText(profile.name,'Jogador');
  const focus=focusModel(profile);
  const {primary,secondary}=normalizedFocus(profile);
  const availableDays=normalizedAvailableDays(profile);

  qs('playerNameDisplay').textContent=name;
  qs('profileNameDisplay').textContent=name;
  qs('objectiveSummary').textContent=safeText(profile.goal,'não definido').toLowerCase();
  qs('profileObjectiveDisplay').textContent=profile.goal?`Objetivo: ${profile.goal}`:'Objetivo ainda não definido';
  qs('availabilityPill').textContent=profile.frequency?`Rotina: ${profile.frequency} sessões/sem`:'Rotina: configurar';
  qs('focusPill').textContent=focus.pill;

  qs('planGoal').textContent=safeText(profile.goal);
  qs('planFrequency').textContent=frequencyLabel(profile.frequency);
  qs('planDuration').textContent=safeText(profile.duration,'Configurar');
  qs('planExperience').textContent=safeText(profile.experience,'Configurar');
  qs('planPrimaryFocus').textContent=primary==='Equilibrado'?'Desenvolvimento equilibrado':primary;
  qs('planSecondaryFocus').textContent=secondary;
  qs('planAvailableDays').textContent=availableDaysLabel(profile);
  qs('planEquipment').textContent=equipmentLabel(profile.equipment);
  qs('planComplement').textContent=complementLabel();

  qs('focusCycleState').textContent=focus.cycle;
  qs('focusPrimaryDisplay').textContent=focus.primaryDisplay;
  qs('focusPrimaryReason').textContent=focus.primaryReason;
  qs('focusSecondaryDisplay').textContent=focus.secondaryDisplay;
  qs('focusSecondaryReason').textContent=focus.secondaryReason;
  qs('focusSystemRule').innerHTML=`<div class="kicker">◆ REGRA DO SISTEMA</div><p>${focus.rule}</p>`;

  const complete=profileCompleteness();
  const reading=qs('systemReading');
  if(complete===6){
    const focusPhrase=primary==='Equilibrado'?'desenvolvimento muscular equilibrado':`prioridade em ${primary.toLowerCase()}`;
    reading.innerHTML=`<div class="kicker">◆ LEITURA DO SISTEMA</div><p>Contexto sincronizado. O planejamento já pode considerar objetivo, rotina real, ${profile.duration.toLowerCase()} por sessão, ${focusPhrase}, experiência e equipamentos disponíveis.</p>`;
  }else{
    reading.innerHTML=`<div class="kicker">◆ LEITURA DO SISTEMA</div><p>Configuração ${complete}/6 concluída. Complete objetivo, sessões, dias disponíveis, tempo, experiência e equipamentos para reduzir prescrições genéricas.</p>`;
  }

  const compTitle=qs('complementaryTitle');
  const compText=qs('complementaryText');
  if(!profile.complement||profile.complement==='Nenhuma'){
    compTitle.textContent='Nenhum protocolo complementar ativo';
    compText.textContent='O Sistema não adiciona cardio ou HIIT por padrão.';
  }else if(profile.complement==='Sistema sugerir'){
    compTitle.textContent='Sugestão complementar autorizada';
    compText.textContent='O Sistema poderá sugerir aeróbico ou recuperação quando isso apoiar o objetivo sem competir com a musculação.';
  }else{
    compTitle.textContent=`${profile.complement} como complemento`;
    compText.textContent=profile.complementFrequency?`${profile.complementFrequency}x por semana, sempre subordinado ao planejamento de musculação.`:'Frequência ainda não definida; a musculação continua sendo a prioridade.';
  }

  const form=qs('profileForm');
  if(form){
    qs('profileName').value=profile.name||'';
    qs('profileGoal').value=profile.goal||'';
    qs('profileFrequency').value=profile.frequency||'';
    qs('profileDuration').value=profile.duration||'';
    qs('profileExperience').value=profile.experience||'';
    qs('profilePrimaryFocus').value=primary;
    qs('profileSecondaryFocus').value=secondary;
    qs('profileComplement').value=profile.complement||'Nenhuma';
    qs('profileComplementFrequency').value=profile.complementFrequency||'';
    qs('profileNotes').value=profile.notes||'';
    document.querySelectorAll('input[name="equipment"]').forEach(input=>{input.checked=profile.equipment.includes(input.value);});
    document.querySelectorAll('input[name="availableDay"]').forEach(input=>{input.checked=availableDays.includes(input.value);});
    updateFocusPreview();
    updateAvailabilityPreview();
  }

  renderPlanningEngine();
}

function updateFocusPreview(){
  const note=qs('profileFocusNote');
  if(!note)return;
  const experience=qs('profileExperience')?.value||'';
  const primary=qs('profilePrimaryFocus')?.value||'Equilibrado';
  const secondary=qs('profileSecondaryFocus')?.value||'Nenhum';

  if(primary==='Equilibrado'){
    note.textContent=secondary!=='Nenhum'?'Escolha uma prioridade principal antes de definir uma secundária.':'Sem prioridade específica: o Sistema preserva desenvolvimento global.';
    return;
  }
  if(secondary===primary){
    note.textContent='A prioridade secundária precisa ser diferente da principal.';
    return;
  }
  if(experience==='Iniciante'){
    note.textContent=`${primary} foi marcada como preferência. Na fase inicial, a base global continua sendo prioridade e a ênfase será controlada.`;
    return;
  }
  if(!experience){
    note.textContent=`Prioridade em ${primary.toLowerCase()} registrada. Configure a experiência para o Sistema definir como tratar essa ênfase.`;
    return;
  }
  note.textContent=`Ênfase em ${primary.toLowerCase()}${secondary!=='Nenhum'?`, com ${secondary.toLowerCase()} como prioridade secundária`:''}. O volume exato será decidido pelo motor de treino e pela resposta registrada.`;
}

function updateAvailabilityPreview(){
  const note=qs('availabilityNote');
  if(!note)return;
  const requested=Number(qs('profileFrequency')?.value)||0;
  const selected=[...document.querySelectorAll('input[name="availableDay"]:checked')].map(input=>input.value);
  if(!selected.length){note.textContent='Nenhum dia informado. O plano ainda não pode ser distribuído no calendário.';return;}
  const labels=selected.sort((a,b)=>DAY_ORDER.indexOf(a)-DAY_ORDER.indexOf(b)).map(value=>DAY_DEFINITIONS.find(day=>day.value===value)?.label).join(' · ');
  if(requested&&selected.length<requested){note.textContent=`Disponibilidade: ${labels}. Você marcou ${requested} sessões, mas informou apenas ${selected.length} dias possíveis.`;return;}
  note.textContent=`Disponibilidade real: ${labels}. O Sistema escolherá a distribuição mais coerente dentro desses dias.`;
}

['profileExperience','profilePrimaryFocus','profileSecondaryFocus'].forEach(id=>qs(id)?.addEventListener('change',updateFocusPreview));
qs('profileFrequency')?.addEventListener('change',updateAvailabilityPreview);
document.querySelectorAll('input[name="availableDay"]').forEach(input=>input.addEventListener('change',updateAvailabilityPreview));

qs('profileForm')?.addEventListener('submit',event=>{
  event.preventDefault();
  const equipment=[...document.querySelectorAll('input[name="equipment"]:checked')].map(input=>input.value);
  const availableDays=[...document.querySelectorAll('input[name="availableDay"]:checked')].map(input=>input.value);
  const primaryFocus=qs('profilePrimaryFocus').value||'Equilibrado';
  let secondaryFocus=qs('profileSecondaryFocus').value||'Nenhum';
  let adjustedFocus=false;

  if(primaryFocus==='Equilibrado'&&secondaryFocus!=='Nenhum'){
    secondaryFocus='Nenhum';
    adjustedFocus=true;
  }
  if(primaryFocus!=='Equilibrado'&&secondaryFocus===primaryFocus){
    secondaryFocus='Nenhum';
    adjustedFocus=true;
  }

  profile={
    name:qs('profileName').value.trim()||'Jogador',
    goal:qs('profileGoal').value,
    frequency:qs('profileFrequency').value,
    duration:qs('profileDuration').value,
    experience:qs('profileExperience').value,
    primaryFocus,
    secondaryFocus,
    availableDays,
    equipment,
    complement:qs('profileComplement').value||'Nenhuma',
    complementFrequency:qs('profileComplementFrequency').value,
    notes:qs('profileNotes').value.trim()
  };
  localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
  renderProfile();
  toast(adjustedFocus?'Contexto salvo. Prioridade secundária inválida foi removida.':'Contexto do jogador atualizado.');
});

const validViews=['missao','plano','progresso','codex','perfil'];
const navButtons=[...document.querySelectorAll('.nav button[data-target]')];
const views=[...document.querySelectorAll('.view[data-view]')];

function openView(target,{updateHash=true,scroll=true}={}){
  if(!validViews.includes(target))target='missao';
  views.forEach(view=>{
    const isActive=view.dataset.view===target;
    view.hidden=!isActive;
    view.classList.toggle('active-view',isActive);
  });
  navButtons.forEach(button=>{
    const isActive=button.dataset.target===target;
    button.classList.toggle('active',isActive);
    button.setAttribute('aria-current',isActive?'page':'false');
  });
  if(updateHash){
    const nextHash=`#${target}`;
    if(location.hash!==nextHash)history.pushState({view:target},'',nextHash);
  }
  document.title=`${target.charAt(0).toUpperCase()+target.slice(1)} · Sistema de Evolução`;
  if(scroll)window.scrollTo({top:0,behavior:'smooth'});
}

navButtons.forEach(button=>button.addEventListener('click',()=>openView(button.dataset.target)));
document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>openView(button.dataset.go)));

window.addEventListener('hashchange',()=>{
  const target=location.hash.replace('#','').toLowerCase();
  openView(validViews.includes(target)?target:'missao',{updateHash:false,scroll:true});
});

window.addEventListener('popstate',()=>{
  const target=location.hash.replace('#','').toLowerCase();
  openView(validViews.includes(target)?target:'missao',{updateHash:false,scroll:true});
});

const adaptModal=qs('adaptModal');
function openAdaptModal(){adaptModal.hidden=false;document.body.classList.add('modal-open');}
function closeAdaptModal(){adaptModal.hidden=true;document.body.classList.remove('modal-open');}
qs('adaptBtn')?.addEventListener('click',openAdaptModal);
qs('closeAdaptModal')?.addEventListener('click',closeAdaptModal);
adaptModal?.addEventListener('click',event=>{if(event.target===adaptModal)closeAdaptModal();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!adaptModal.hidden)closeAdaptModal();});
document.querySelectorAll('[data-reason]').forEach(button=>button.addEventListener('click',()=>{
  const reason=button.dataset.reason;
  localStorage.setItem('sistemaEvolucao.lastAdaptReason',reason);
  closeAdaptModal();
  toast(`Contexto registrado: ${reason}.`);
}));

renderProfile();
const initialTarget=location.hash.replace('#','').toLowerCase();
openView(validViews.includes(initialTarget)?initialTarget:'missao',{updateHash:false,scroll:false});

const volumeEngineScript=document.createElement('script');
volumeEngineScript.src='volume-engine.js';
document.body.appendChild(volumeEngineScript);
