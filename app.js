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

function profileCompleteness(){
  const checks=[profile.goal,profile.frequency,profile.duration,profile.experience,profile.equipment.length];
  return checks.filter(Boolean).length;
}

function renderProfile(){
  const name=safeText(profile.name,'Jogador');
  qs('playerNameDisplay').textContent=name;
  qs('profileNameDisplay').textContent=name;
  qs('objectiveSummary').textContent=safeText(profile.goal,'não definido').toLowerCase();
  qs('profileObjectiveDisplay').textContent=profile.goal?`Objetivo: ${profile.goal}`:'Objetivo ainda não definido';
  qs('availabilityPill').textContent=profile.frequency?`Rotina: ${profile.frequency}x/sem`:'Rotina: configurar';

  qs('planGoal').textContent=safeText(profile.goal);
  qs('planFrequency').textContent=frequencyLabel(profile.frequency);
  qs('planDuration').textContent=safeText(profile.duration,'Configurar');
  qs('planExperience').textContent=safeText(profile.experience,'Configurar');
  qs('planEquipment').textContent=equipmentLabel(profile.equipment);
  qs('planComplement').textContent=complementLabel();

  const complete=profileCompleteness();
  const reading=qs('systemReading');
  if(complete===5){
    reading.innerHTML=`<div class="kicker">◆ LEITURA DO SISTEMA</div><p>Contexto sincronizado. As próximas decisões poderão considerar objetivo, ${profile.frequency} dias de musculação, ${profile.duration.toLowerCase()} por sessão e os equipamentos realmente disponíveis.</p>`;
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
    qs('profileComplement').value=profile.complement||'Nenhuma';
    qs('profileComplementFrequency').value=profile.complementFrequency||'';
    qs('profileNotes').value=profile.notes||'';
    document.querySelectorAll('input[name="equipment"]').forEach(input=>{
      input.checked=profile.equipment.includes(input.value);
    });
  }
}

qs('profileForm')?.addEventListener('submit',event=>{
  event.preventDefault();
  const equipment=[...document.querySelectorAll('input[name="equipment"]:checked')].map(input=>input.value);
  profile={
    name:qs('profileName').value.trim()||'Jogador',
    goal:qs('profileGoal').value,
    frequency:qs('profileFrequency').value,
    duration:qs('profileDuration').value,
    experience:qs('profileExperience').value,
    equipment,
    complement:qs('profileComplement').value||'Nenhuma',
    complementFrequency:qs('profileComplementFrequency').value,
    notes:qs('profileNotes').value.trim()
  };
  localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));
  renderProfile();
  toast('Contexto do jogador atualizado.');
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
