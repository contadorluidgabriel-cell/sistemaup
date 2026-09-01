(()=>{
  const PROFILE_KEY='sistemaEvolucao.playerProfile.v1';
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';
  const HISTORY_KEY='sistemaEvolucao.workoutHistory.v1';
  const NEXT_KEY='sistemaEvolucao.nextExerciseTargets.v1';
  const SESSION_KEY='sistemaEvolucao.currentSessionIndex.v1';
  const DRAFT_KEY='sistemaEvolucao.activeWorkoutDraft.v1';
  const ONBOARDING_KEY='sistemaEvolucao.onboarding.v1';
  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const writeJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  let installPrompt=null;
  let renderQueued=false;

  document.body.classList.add('app-polished');

  const ICONS={
    missao:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 7v5c0 4.3 2.8 7.3 7 9 4.2-1.7 7-4.7 7-9V7l-7-4Z"/><path d="m9 12 2 2 4-5"/></svg>',
    plano:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    progresso:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></svg>',
    codex:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v18H7.5A3.5 3.5 0 0 0 4 23V5.5Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v18h3.5A3.5 3.5 0 0 1 20 23V5.5Z"/></svg>',
    perfil:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6"/></svg>'
  };

  function iconizeNav(){
    document.querySelectorAll('.nav button[data-target]').forEach(button=>{
      if(button.dataset.appIconized==='true')return;
      const target=button.dataset.target;
      const label=button.textContent.trim();
      button.innerHTML=`${ICONS[target]||''}<span>${esc(label)}</span>`;
      button.dataset.appIconized='true';
    });
  }

  function markSecondaryUI(){
    const mission=document.getElementById('view-missao');
    if(mission){
      mission.querySelector(':scope > .status')?.classList.add('app-home-legacy');
      [...mission.querySelectorAll(':scope > .section')].forEach(section=>{
        const kicker=section.querySelector(':scope > .section-head .kicker')?.textContent.trim()||'';
        if(kicker.startsWith('CAMPANHA ATIVA')||kicker==='SUPORTE AO OBJETIVO')section.classList.add('app-home-secondary');
        if(kicker==='HOJE')section.classList.add('app-primary-mission');
      });
    }
    const progress=document.getElementById('view-progresso');
    if(progress){
      progress.querySelector(':scope > .screen-panel')?.classList.add('app-progress-legacy');
      [...progress.querySelectorAll(':scope > .section')].forEach(section=>{
        const kicker=section.querySelector('.kicker')?.textContent.trim()||'';
        if(kicker==='ATRIBUTOS'||kicker==='ANÁLISE DO SISTEMA')section.classList.add('app-progress-legacy');
      });
    }
  }

  function currentContext(){
    const profile=readJSON(PROFILE_KEY,null);
    const plan=readJSON(PLAN_KEY,null);
    const history=readJSON(HISTORY_KEY,[]);
    const safeHistory=Array.isArray(history)?history:[];
    const index=plan?.sessions?.length?Math.max(0,Number(localStorage.getItem(SESSION_KEY)||0))%plan.sessions.length:0;
    const session=plan?.sessions?.[index]||null;
    return {profile,plan,history:safeHistory,index,session};
  }

  function brandMark(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4.8 6.2v8.2L12 22l7.2-7.6V6.2L12 2Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m8.5 12 2.2 2.2 4.8-5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';}

  function homeSignature(ctx){
    const last=ctx.history[ctx.history.length-1];
    return JSON.stringify({name:ctx.profile?.name,goal:ctx.profile?.goal,index:ctx.index,label:ctx.session?.label,last:last?.completedAt,draft:!!readJSON(DRAFT_KEY,null)});
  }

  function renderHome(){
    const view=document.getElementById('view-missao');
    if(!view)return;
    let shell=document.getElementById('appHomeShell');
    if(!shell){
      shell=document.createElement('section');
      shell.id='appHomeShell';
      shell.className='app-home-shell';
      const primary=view.querySelector('.app-primary-mission');
      if(primary)view.insertBefore(shell,primary);
      else view.prepend(shell);
    }
    const ctx=currentContext();
    const signature=homeSignature(ctx);
    if(shell.dataset.signature===signature)return;
    shell.dataset.signature=signature;
    const name=ctx.profile?.name?.trim()||'Jogador';
    const firstName=name.split(/\s+/)[0];
    const last=ctx.history[ctx.history.length-1];
    const draft=readJSON(DRAFT_KEY,null);
    const missionCount=ctx.history.length;
    const state=!ctx.profile?'CONFIGURAÇÃO NECESSÁRIA':draft?'MISSÃO PAUSADA':!ctx.session?'PLANO EM PREPARAÇÃO':missionCount===0?'PRIMEIRA MISSÃO PRONTA':'PRÓXIMA MISSÃO DISPONÍVEL';
    const detail=!ctx.profile?'O Sistema ainda não conhece seu contexto.':draft?'Seu registro parcial está salvo neste aparelho.':ctx.session?`${ctx.session.label} · ${ctx.profile?.duration||'tempo variável'}`:'Complete o Perfil para liberar sua prescrição.';
    const lastText=last?`${last.sessionLabel||'Missão'} · ${Math.max(1,Math.round(Number(last.durationSeconds||0)/60))} min · ${(last.exercises||[]).reduce((sum,ex)=>sum+(ex.sets||[]).length,0)} séries`:'Nenhuma missão concluída ainda';
    shell.innerHTML=`
      <div class="app-topbar">
        <div class="app-brand"><div class="app-brand-mark">${brandMark()}</div><div class="app-brand-copy"><span>◆ SISTEMA</span><strong>Olá, ${esc(firstName)}</strong></div></div>
        <div class="app-rank-chip"><span>RANK</span><b>E</b></div>
      </div>
      <div class="app-home-state"><div><span>ESTADO ATUAL</span><strong>${esc(state)}</strong><small>${esc(detail)}</small></div><i class="app-state-dot"></i></div>
      <div class="app-home-last"><span>ÚLTIMA MISSÃO</span><strong>${esc(lastText)}</strong></div>`;

    if(ctx.session){
      const mission=document.querySelector('#view-missao .mission');
      const kicker=mission?.querySelector('.mission-title .kicker');
      const badge=mission?.querySelector('.mission-title .xp');
      const structure=mission?.querySelector('.structure');
      const muscles=[...new Set((ctx.session.exercises||[]).map(ex=>ex.primary).filter(Boolean))];
      if(kicker)kicker.textContent=`PRÓXIMA MISSÃO · SESSÃO ${ctx.index+1}/${ctx.plan.sessions.length}`;
      if(badge)badge.textContent=`${ctx.index+1}/${ctx.plan.sessions.length}`;
      if(structure)structure.textContent=`${ctx.profile?.duration||'Tempo variável'} · ${muscles.join(' · ')||'Musculação'}`;
    }
  }

  function progressSignature(ctx){
    const next=readJSON(NEXT_KEY,{});
    return JSON.stringify({count:ctx.history.length,last:ctx.history.at(-1)?.completedAt,next});
  }

  function renderProgress(){
    const view=document.getElementById('view-progresso');
    if(!view)return;
    let dashboard=document.getElementById('appProgressDashboard');
    if(!dashboard){
      dashboard=document.createElement('section');
      dashboard.id='appProgressDashboard';
      dashboard.className='app-progress-dashboard';
      const header=view.querySelector('.screen-head');
      if(header)header.insertAdjacentElement('afterend',dashboard);else view.prepend(dashboard);
    }
    const ctx=currentContext();
    const signature=progressSignature(ctx);
    if(dashboard.dataset.signature===signature)return;
    dashboard.dataset.signature=signature;
    const now=Date.now();
    const week=ctx.history.filter(item=>now-new Date(item.completedAt||0).getTime()<=7*86400000).length;
    const totalSets=ctx.history.reduce((sum,w)=>sum+(w.exercises||[]).reduce((inner,ex)=>inner+(ex.sets||[]).filter(set=>set.completed!==false).length,0),0);
    const exposures=ctx.history.reduce((sum,w)=>sum+(w.exercises||[]).length,0);
    const next=readJSON(NEXT_KEY,{});
    const progressionCount=Object.values(next||{}).filter(item=>item?.state==='PROGRESSÃO DISPONÍVEL').length;
    let state='DADOS INSUFICIENTES';
    let text='Conclua sua primeira missão para o Sistema começar a comparar desempenho real.';
    if(ctx.history.length>=1){state='BASE DE DADOS INICIADA';text='O Sistema já possui execuções reais e continuará observando antes de concluir tendências.';}
    if(ctx.history.length>=3){state='PADRÃO EM FORMAÇÃO';text='Já existe histórico suficiente para comparações mais úteis entre exposições e sessões.';}
    if(progressionCount){state='PROGRESSÃO DISPONÍVEL';text=`${progressionCount} exercício${progressionCount===1?' possui':'s possuem'} condição de progressão registrada.`;}
    const last=ctx.history.at(-1);
    const lastSummary=last?`${last.sessionLabel||'Missão'} · ${new Date(last.completedAt).toLocaleDateString('pt-BR')}`:'Aguardando primeira missão';
    dashboard.innerHTML=`
      <article class="app-progress-reading"><span>◆ LEITURA DO SISTEMA</span><strong>${esc(state)}</strong><p>${esc(text)}</p></article>
      <div class="app-progress-metrics">
        <article class="app-progress-metric"><span>MISSÕES</span><strong>${ctx.history.length}</strong><small>registradas</small></article>
        <article class="app-progress-metric"><span>7 DIAS</span><strong>${week}</strong><small>sessões</small></article>
        <article class="app-progress-metric"><span>SÉRIES</span><strong>${totalSets}</strong><small>concluídas</small></article>
      </div>
      <div class="app-progress-last"><div><span>ÚLTIMO REGISTRO</span><strong>${esc(lastSummary)}</strong></div><small>${exposures} exposições</small></div>`;
  }

  function updateCurrentSet(){
    document.querySelectorAll('.execution-exercise').forEach(card=>{
      const rows=[...card.querySelectorAll('.set-log-row')];
      const current=card.classList.contains('training-current')?(rows.find(row=>!row.classList.contains('completed'))||rows.at(-1)):null;
      rows.forEach(row=>row.classList.toggle('app-current-set',row===current));
      rows.forEach(row=>{
        const reps=row.querySelector('.set-reps');
        const load=row.querySelector('.set-load');
        if(reps){reps.inputMode='numeric';reps.setAttribute('autocomplete','off');}
        if(load){load.inputMode='decimal';load.setAttribute('autocomplete','off');}
      });
    });
  }

  function ensureProfileTools(){
    const view=document.getElementById('view-perfil');
    if(!view||document.getElementById('appProfileTools'))return;
    const panel=view.querySelector('.profile-panel');
    const tools=document.createElement('div');
    tools.id='appProfileTools';
    tools.className='app-profile-tools';
    tools.innerHTML=`
      <button type="button" class="app-profile-tool" id="guidedSetup"><span>CONFIGURAÇÃO GUIADA</span><strong>Refazer onboarding</strong><small>Atualize seu contexto em etapas simples.</small></button>
      <button type="button" class="app-profile-tool" id="installApp" hidden><span>INSTALAR</span><strong>Adicionar à tela inicial</strong><small>Abrir o Sistema como aplicativo.</small></button>`;
    panel?.insertAdjacentElement('afterend',tools);
    document.getElementById('guidedSetup')?.addEventListener('click',()=>openOnboarding(true));
    refreshInstallButton();
  }

  function refreshInstallButton(){
    const button=document.getElementById('installApp');
    if(!button)return;
    const standalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
    button.hidden=!installPrompt||standalone;
    if(button.dataset.bound==='true')return;
    button.dataset.bound='true';
    button.addEventListener('click',async()=>{
      if(!installPrompt)return;
      installPrompt.prompt();
      await installPrompt.userChoice.catch(()=>null);
      installPrompt=null;
      refreshInstallButton();
    });
  }

  const goals=['Hipertrofia','Emagrecimento','Força','Recondicionamento','Manutenção'];
  const durations=['20–30 min','30–45 min','45–60 min','60+ min','Variável'];
  const experiences=['Iniciante','Intermediário','Avançado'];
  const days=[['seg','SEG'],['ter','TER'],['qua','QUA'],['qui','QUI'],['sex','SEX'],['sab','SÁB'],['dom','DOM']];
  const equipment=['Peso corporal','Halteres','Elásticos','Banco','Barra e anilhas','Outros'];
  const focuses=['Equilibrado','Peito','Costas','Ombros','Braços','Quadríceps','Posteriores','Glúteos','Panturrilhas'];
  let onboarding=null;

  function ensureOnboarding(){
    if(document.getElementById('appOnboarding'))return document.getElementById('appOnboarding');
    const root=document.createElement('div');
    root.id='appOnboarding';
    root.className='app-onboarding';
    root.hidden=true;
    root.innerHTML='<div class="app-onboarding-head"><div class="app-onboarding-brand">◆ SISTEMA · DESPERTAR</div><div class="app-onboarding-progress" id="appOnboardingProgress"></div></div><div class="app-onboarding-body" id="appOnboardingBody"></div><div class="app-onboarding-footer" id="appOnboardingFooter"><button type="button" id="appOnboardingBack">VOLTAR</button><button type="button" class="app-next" id="appOnboardingNext">CONTINUAR</button></div>';
    document.body.appendChild(root);
    root.querySelector('#appOnboardingBack').addEventListener('click',()=>{
      if(!onboarding)return;
      if(onboarding.step===0){closeOnboarding();location.hash='#perfil';return;}
      onboarding.step-=1;renderOnboarding();
    });
    root.querySelector('#appOnboardingNext').addEventListener('click',()=>advanceOnboarding());
    return root;
  }

  function openOnboarding(manual=false){
    const root=ensureOnboarding();
    const saved=readJSON(PROFILE_KEY,{})||{};
    onboarding={step:0,manual,data:{
      name:saved.name&&saved.name!=='Luid'?saved.name:'',goal:saved.goal||'',frequency:saved.frequency||'',availableDays:Array.isArray(saved.availableDays)?[...saved.availableDays]:[],duration:saved.duration||'',experience:saved.experience||'',equipment:Array.isArray(saved.equipment)?[...saved.equipment]:[],primaryFocus:saved.primaryFocus||'Equilibrado'
    }};
    root.hidden=false;document.body.style.overflow='hidden';renderOnboarding();
  }

  function closeOnboarding(){
    const root=document.getElementById('appOnboarding');
    if(root)root.hidden=true;
    document.body.style.overflow='';onboarding=null;
  }

  function choiceButtons(items,value,multi=false){
    const selected=multi?new Set(value||[]):new Set([value]);
    return `<div class="app-choice-grid">${items.map(item=>{
      const key=Array.isArray(item)?item[0]:item;
      const label=Array.isArray(item)?item[1]:item;
      return `<button type="button" class="app-choice ${selected.has(key)?'selected':''}" data-choice="${esc(key)}">${esc(label)}</button>`;
    }).join('')}</div>`;
  }

  function stepDefinition(){
    const d=onboarding.data;
    switch(onboarding.step){
      case 0:return {title:'Como o Sistema deve chamar você?',text:'Seu nome aparece na Home e nos registros. Você pode alterar isso depois.',kind:'text',key:'name',html:`<input class="app-onboarding-input" id="appOnboardingInput" maxlength="40" autocomplete="name" placeholder="Seu nome" value="${esc(d.name)}">`};
      case 1:return {title:'Qual é seu objetivo principal?',text:'Isso orienta a prescrição. Não muda por causa de XP, Rank ou gamificação.',kind:'single',key:'goal',html:choiceButtons(goals,d.goal)};
      case 2:return {title:'Quantas sessões realmente cabem na sua semana?',text:'Disponibilidade não é obrigação. O Sistema usa isso como contexto para organizar a menor estrutura adequada.',kind:'single',key:'frequency',html:choiceButtons([['1','1 sessão'],['2','2 sessões'],['3','3 sessões'],['4','4 sessões'],['5','5 sessões'],['6','6 sessões']],d.frequency)};
      case 3:return {title:'Em quais dias você pode treinar?',text:'Marque toda a disponibilidade real. O Sistema escolhe a distribuição dentro dela.',kind:'multi',key:'availableDays',html:choiceButtons(days,d.availableDays,true)};
      case 4:return {title:'Quanto tempo costuma ter por sessão?',text:'O treino precisa caber na sua rotina antes de qualquer regra de divisão.',kind:'single',key:'duration',html:choiceButtons(durations,d.duration)};
      case 5:return {title:'Qual é sua experiência com musculação?',text:'Experiência altera complexidade, tolerância inicial e velocidade de progressão — não define seu potencial.',kind:'single',key:'experience',html:choiceButtons(experiences,d.experience)};
      case 6:return {title:'O que você realmente tem para treinar?',text:'Marque apenas equipamentos que consegue usar. Exercícios incompatíveis não devem ser inventados.',kind:'multi',key:'equipment',html:choiceButtons(equipment,d.equipment,true)};
      default:return {title:'Quer dar prioridade a algum grupo muscular?',text:'A prioridade melhora distribuição e acompanhamento sem abandonar o restante do corpo.',kind:'single',key:'primaryFocus',html:choiceButtons(focuses,d.primaryFocus)};
    }
  }

  function validCurrentStep(){
    if(!onboarding)return false;
    const d=onboarding.data;
    if(onboarding.step===0)return Boolean(d.name.trim());
    if(onboarding.step===1)return Boolean(d.goal);
    if(onboarding.step===2)return Boolean(d.frequency);
    if(onboarding.step===3)return d.availableDays.length>0;
    if(onboarding.step===4)return Boolean(d.duration);
    if(onboarding.step===5)return Boolean(d.experience);
    if(onboarding.step===6)return d.equipment.length>0;
    return Boolean(d.primaryFocus);
  }

  function renderOnboarding(){
    if(!onboarding)return;
    const root=ensureOnboarding();
    const body=root.querySelector('#appOnboardingBody');
    const progress=root.querySelector('#appOnboardingProgress');
    const next=root.querySelector('#appOnboardingNext');
    const back=root.querySelector('#appOnboardingBack');
    const def=stepDefinition();
    progress.innerHTML=Array.from({length:8},(_,i)=>`<i class="${i<=onboarding.step?'done':''}"></i>`).join('');
    body.innerHTML=`<div class="app-onboarding-step"><span class="step-label">ETAPA ${onboarding.step+1} / 8</span><h2>${esc(def.title)}</h2><p>${esc(def.text)}</p>${def.html}</div>`;
    back.textContent=onboarding.step===0?'USAR FORMULÁRIO':'VOLTAR';
    next.textContent=onboarding.step===7?'GERAR MEU PLANO':'CONTINUAR';
    next.disabled=!validCurrentStep();

    if(def.kind==='text'){
      const input=body.querySelector('#appOnboardingInput');
      input?.focus({preventScroll:true});
      input?.addEventListener('input',()=>{onboarding.data[def.key]=input.value;next.disabled=!validCurrentStep();});
    }else{
      body.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>{
        const value=button.dataset.choice;
        if(def.kind==='multi'){
          const set=new Set(onboarding.data[def.key]);
          if(set.has(value))set.delete(value);else set.add(value);
          onboarding.data[def.key]=[...set];
          button.classList.toggle('selected',set.has(value));
        }else{
          onboarding.data[def.key]=value;
          body.querySelectorAll('[data-choice]').forEach(item=>item.classList.toggle('selected',item===button));
        }
        next.disabled=!validCurrentStep();
      }));
    }
  }

  function advanceOnboarding(){
    if(!onboarding||!validCurrentStep())return;
    if(onboarding.step<7){onboarding.step+=1;renderOnboarding();return;}
    const body=document.getElementById('appOnboardingBody');
    const footer=document.getElementById('appOnboardingFooter');
    const progress=document.getElementById('appOnboardingProgress');
    const data=onboarding.data;
    const profile={
      name:data.name.trim(),goal:data.goal,frequency:data.frequency,duration:data.duration,experience:data.experience,primaryFocus:data.primaryFocus||'Equilibrado',secondaryFocus:'Nenhum',availableDays:data.availableDays,equipment:data.equipment,complement:'Nenhuma',complementFrequency:'',notes:''
    };
    writeJSON(PROFILE_KEY,profile);writeJSON(ONBOARDING_KEY,{completedAt:new Date().toISOString(),version:1});
    if(!onboarding.manual)localStorage.setItem(SESSION_KEY,'0');
    if(progress)progress.innerHTML=Array.from({length:8},()=>'<i class="done"></i>').join('');
    if(footer)footer.hidden=true;
    if(body)body.innerHTML='<div class="app-analysis"><div class="app-analysis-ring"></div><div><div class="kicker">◆ ANALISANDO PERFIL</div><h2>Construindo sua primeira estrutura...</h2><p class="muted">Objetivo, rotina, disponibilidade, experiência, equipamentos e prioridade estão sendo combinados.</p></div></div>';
    setTimeout(()=>{location.hash='#missao';location.reload();},900);
  }

  function setupPWA(){
    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;refreshInstallButton();});
    window.addEventListener('appinstalled',()=>{installPrompt=null;refreshInstallButton();});
    if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  function renderAll(){
    renderQueued=false;
    iconizeNav();markSecondaryUI();ensureProfileTools();renderHome();renderProgress();updateCurrentSet();
  }

  function scheduleRender(){
    if(renderQueued)return;renderQueued=true;requestAnimationFrame(renderAll);
  }

  const observer=new MutationObserver(scheduleRender);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
  window.addEventListener('hashchange',scheduleRender);
  document.addEventListener('click',event=>{
    if(event.target.closest('.set-done,#startBtn,#closeCompletion,#confirmCheckin,.nav button'))setTimeout(scheduleRender,60);
  });
  window.addEventListener('storage',scheduleRender);

  setupPWA();renderAll();
  if(!readJSON(PROFILE_KEY,null)&&!readJSON(ONBOARDING_KEY,null))setTimeout(()=>openOnboarding(false),120);
})();
