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
const defaultProfile={
  name:'Luid',
  goal:'',
  frequency:'',
  duration:'',
  experience:'',
  primaryFocus:'Equilibrado',
  secondaryFocus:'Nenhum',
  equipment:[],
  complement:'Nenhuma',
  complementFrequency:'',
  notes:''
};

function loadProfile(){
  try{
    const saved=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');
    return {...defaultProfile,...(saved||{}),equipment:Array.isArray(saved?.equipment)?saved.equipment:[]};
  }catch{
    return {...defaultProfile};
  }
}

let profile=loadProfile();

const qs=id=>document.getElementById(id);
const safeText=(value,fallback='Não definido')=>value&&String(value).trim()?String(value).trim():fallback;

function frequencyLabel(value){
  return value?`${value}x / semana`:'Configurar';
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

function profileCompleteness(){
  const checks=[profile.goal,profile.frequency,profile.duration,profile.experience,profile.equipment.length];
  return checks.filter(Boolean).length;
}

function renderProfile(){
  const name=safeText(profile.name,'Jogador');
  const focus=focusModel(profile);
  const {primary,secondary}=normalizedFocus(profile);

  qs('playerNameDisplay').textContent=name;
  qs('profileNameDisplay').textContent=name;
  qs('objectiveSummary').textContent=safeText(profile.goal,'não definido').toLowerCase();
  qs('profileObjectiveDisplay').textContent=profile.goal?`Objetivo: ${profile.goal}`:'Objetivo ainda não definido';
  qs('availabilityPill').textContent=profile.frequency?`Rotina: ${profile.frequency}x/sem`:'Rotina: configurar';
  qs('focusPill').textContent=focus.pill;

  qs('planGoal').textContent=safeText(profile.goal);
  qs('planFrequency').textContent=frequencyLabel(profile.frequency);
  qs('planDuration').textContent=safeText(profile.duration,'Configurar');
  qs('planExperience').textContent=safeText(profile.experience,'Configurar');
  qs('planPrimaryFocus').textContent=primary==='Equilibrado'?'Desenvolvimento equilibrado':primary;
  qs('planSecondaryFocus').textContent=secondary;
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
  if(complete===5){
    const focusPhrase=primary==='Equilibrado'?'desenvolvimento muscular equilibrado':`prioridade em ${primary.toLowerCase()}`;
    reading.innerHTML=`<div class="kicker">◆ LEITURA DO SISTEMA</div><p>Contexto sincronizado. As próximas decisões poderão considerar objetivo, ${profile.frequency} dias de musculação, ${profile.duration.toLowerCase()} por sessão, ${focusPhrase} e os equipamentos realmente disponíveis.</p>`;
  }else{
    reading.innerHTML=`<div class="kicker">◆ LEITURA DO SISTEMA</div><p>Configuração ${complete}/5 concluída. Complete objetivo, rotina, tempo, experiência e equipamentos para reduzir prescrições genéricas.</p>`;
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
    document.querySelectorAll('input[name="equipment"]').forEach(input=>{
      input.checked=profile.equipment.includes(input.value);
    });
    updateFocusPreview();
  }
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

['profileExperience','profilePrimaryFocus','profileSecondaryFocus'].forEach(id=>qs(id)?.addEventListener('change',updateFocusPreview));

qs('profileForm')?.addEventListener('submit',event=>{
  event.preventDefault();
  const equipment=[...document.querySelectorAll('input[name="equipment"]:checked')].map(input=>input.value);
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