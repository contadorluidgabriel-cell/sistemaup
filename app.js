const exercises=[{n:'01',tag:'Preparação',name:'Ativação do jogador',detail:'8 min de mobilidade e caminhada leve',action:'MARCAR',xp:12,prep:true},{n:'02',tag:'Peito',name:'Flexão inclinada nos apoios',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:16},{n:'03',tag:'Peito',name:'Supino no chão com halteres',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:16},{n:'04',tag:'Peito',name:'Crucifixo com elástico',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:16},{n:'05',tag:'Ombro',name:'Desenvolvimento com elástico',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:12},{n:'06',tag:'Tríceps',name:'Extensão de tríceps com elástico',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:12},{n:'07',tag:'Tríceps',name:'Extensão de tríceps com halter leve',detail:'3 séries · 8–12 repetições · esforço moderado',action:'REGISTRAR',xp:12}];

const list=document.getElementById('exerciseList');
if(list){
  list.innerHTML=exercises.map((e,i)=>`<div class="exercise"><div class="num">${e.n}</div><div><span class="tag">${e.tag}</span><strong>${e.name}</strong><div class="detail">${e.detail}</div>${e.prep?'':'<div class="hint">Primeira leitura: registre o resultado para liberar uma sugestão na próxima vez.</div>'}</div><div><button class="act" data-index="${i}">${e.action}</button><div class="mini-xp">+${e.xp} XP</div></div></div>`).join('');
}

function toast(msg){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),1800);
}

document.querySelectorAll('.act').forEach(btn=>btn.addEventListener('click',()=>{
  const idx=Number(btn.dataset.index);
  btn.classList.toggle('done');
  btn.textContent=btn.classList.contains('done')?'REGISTRADO':exercises[idx].action;
}));

document.querySelectorAll('.support button').forEach(btn=>btn.addEventListener('click',()=>{
  btn.textContent='ATIVADA';
  btn.style.color='var(--success)';
  toast('Missão secundária ativada.');
}));

document.getElementById('startBtn')?.addEventListener('click',()=>toast('Missão iniciada. Registre cada etapa para construir seu histórico.'));
document.getElementById('recalcBtn')?.addEventListener('click',()=>toast('Baseline preservada. Na V2, este comando será substituído por “Adaptar missão”.'));

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

window.addEventListener('hashchange',()=>{
  const target=location.hash.replace('#','').toLowerCase();
  openView(validViews.includes(target)?target:'missao',{updateHash:false,scroll:true});
});

const initialTarget=location.hash.replace('#','').toLowerCase();
openView(validViews.includes(initialTarget)?initialTarget:'missao',{updateHash:false,scroll:false});
