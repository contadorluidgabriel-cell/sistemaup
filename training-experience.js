const trainingExperienceStyles=document.createElement('link');
trainingExperienceStyles.rel='stylesheet';
trainingExperienceStyles.href='training-experience.css';
document.head.appendChild(trainingExperienceStyles);

(()=>{
  const CHECKIN_KEY='sistemaEvolucao.pendingCheckIn.v1';
  const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const writeJSON=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

  let elapsedTimer=null;
  let elapsedSeconds=0;
  let restTimer=null;
  let restRemaining=0;

  function toast(message){
    const el=document.getElementById('toast');
    if(!el)return;
    el.textContent=message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>el.classList.remove('show'),2400);
  }

  function ensureCheckinModal(){
    if(document.getElementById('preMissionModal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div class="pre-mission-modal" id="preMissionModal" hidden>
        <div class="pre-mission-sheet panel" role="dialog" aria-modal="true" aria-labelledby="preMissionTitle">
          <div class="kicker">◆ LEITURA PRÉ-MISSÃO</div>
          <h2 id="preMissionTitle">Como você está hoje?</h2>
          <p class="muted">Quatro respostas rápidas ajudam o Sistema a organizar a execução sem ignorar sua condição real.</p>

          <div class="checkin-grid">
            <label><span>TEMPO DISPONÍVEL HOJE</span><select id="checkinTime"><option value="full">Tempo normal do plano</option><option value="30">Até 30 min</option><option value="20">Até 20 min</option></select></label>
            <label><span>ENERGIA</span><select id="checkinEnergy"><option value="good">Boa</option><option value="normal" selected>Normal</option><option value="low">Abaixo do normal</option></select></label>
            <label><span>DOR / LIMITAÇÃO HOJE</span><select id="checkinCondition"><option value="none">Nenhuma relevante</option><option value="mild">Leve / monitorar</option><option value="relevant">Relevante</option></select></label>
            <label><span>EQUIPAMENTOS DO TREINO</span><select id="checkinEquipment"><option value="ok">Todos disponíveis</option><option value="missing">Algo está indisponível</option></select></label>
          </div>

          <div class="checkin-reading" id="checkinReading">Parâmetros normais. O plano pode ser executado como prescrito.</div>
          <p class="checkin-safety">Dor no peito, tontura, desmaio ou falta de ar incomum não são sinais para “treinar por cima”. Interrompa e procure avaliação apropriada.</p>
          <div class="checkin-actions"><button type="button" class="ghost-action" id="cancelCheckin">CANCELAR</button><button type="button" class="start" id="confirmCheckin">INICIAR MISSÃO</button></div>
        </div>
      </div>`);

    const modal=document.getElementById('preMissionModal');
    const close=()=>{modal.hidden=true;document.body.classList.remove('pre-mission-open');};
    document.getElementById('cancelCheckin')?.addEventListener('click',close);
    modal.addEventListener('click',event=>{if(event.target===modal)close();});
    ['checkinTime','checkinEnergy','checkinCondition','checkinEquipment'].forEach(id=>document.getElementById(id)?.addEventListener('change',updateCheckinReading));
    document.getElementById('confirmCheckin')?.addEventListener('click',confirmCheckin);
  }

  function updateCheckinReading(){
    const time=document.getElementById('checkinTime')?.value||'full';
    const energy=document.getElementById('checkinEnergy')?.value||'normal';
    const condition=document.getElementById('checkinCondition')?.value||'none';
    const equipment=document.getElementById('checkinEquipment')?.value||'ok';
    const reading=document.getElementById('checkinReading');
    const confirm=document.getElementById('confirmCheckin');
    if(!reading||!confirm)return;

    confirm.disabled=false;
    if(condition==='relevant'){
      reading.textContent='Limitação relevante registrada. O Sistema bloqueia o início automático: adapte a missão ou obtenha orientação profissional antes de prosseguir.';
      confirm.disabled=true;
      return;
    }
    if(equipment==='missing'){
      reading.textContent='Há equipamento indisponível. Cancele o check-in e use ADAPTAR MISSÃO para não executar uma prescrição incompatível.';
      confirm.disabled=true;
      return;
    }
    if(time!=='full'&&energy==='low'){
      reading.textContent='Tempo reduzido + energia baixa: o Sistema preservará os exercícios prioritários e removerá acessórios finais da missão de hoje.';
      return;
    }
    if(time!=='full'){
      reading.textContent='Tempo reduzido: a missão será compactada preservando os exercícios que aparecem primeiro na prescrição.';
      return;
    }
    if(energy==='low'){
      reading.textContent='Energia abaixo do normal: execute com margem, sem perseguir progressão a qualquer custo. O resultado será registrado para comparação.';
      return;
    }
    if(condition==='mild'){
      reading.textContent='Incômodo leve registrado. Monitore durante a execução e registre qualquer desconforto no exercício correspondente.';
      return;
    }
    reading.textContent='Parâmetros normais. O plano pode ser executado como prescrito.';
  }

  function compactMission(timeValue){
    if(timeValue==='full')return [];
    const cards=[...document.querySelectorAll('#exerciseList .execution-exercise')];
    const limit=timeValue==='20'?4:5;
    if(cards.length<=limit)return [];
    const removed=cards.slice(limit).map(card=>({id:card.dataset.exerciseId,name:card.dataset.name||''}));
    cards.slice(limit).forEach(card=>card.remove());
    const structure=document.querySelector('#view-missao .mission .structure');
    const remaining=[...document.querySelectorAll('#exerciseList .execution-exercise')];
    const sets=remaining.reduce((sum,card)=>sum+card.querySelectorAll('.set-log-row').length,0);
    if(structure)structure.textContent=`MISSÃO ADAPTADA · ${remaining.length} exercícios · ${sets} séries diretas`;
    return removed;
  }

  function confirmCheckin(){
    const button=document.getElementById('startBtn');
    const modal=document.getElementById('preMissionModal');
    if(!button||!modal)return;
    const time=document.getElementById('checkinTime')?.value||'full';
    const energy=document.getElementById('checkinEnergy')?.value||'normal';
    const condition=document.getElementById('checkinCondition')?.value||'none';
    const equipment=document.getElementById('checkinEquipment')?.value||'ok';
    if(condition==='relevant'||equipment==='missing')return;

    const omittedExercises=compactMission(time);
    const checkIn={
      time,
      energy,
      condition,
      equipment,
      adapted:Boolean(omittedExercises.length),
      omittedExercises,
      recordedAt:new Date().toISOString()
    };
    writeJSON(CHECKIN_KEY,checkIn);
    button.dataset.checkinApproved='true';
    modal.hidden=true;
    document.body.classList.remove('pre-mission-open');
    button.click();
    setTimeout(()=>{
      delete button.dataset.checkinApproved;
      if(button.dataset.state==='active')enterTrainingMode(checkIn);
    },0);
  }

  function openCheckin(){
    ensureCheckinModal();
    updateCheckinReading();
    const modal=document.getElementById('preMissionModal');
    modal.hidden=false;
    document.body.classList.add('pre-mission-open');
  }

  function ensureTrainingHud(){
    const mission=document.querySelector('#view-missao .mission');
    if(!mission||document.getElementById('trainingHud'))return;
    mission.insertAdjacentHTML('afterbegin',`
      <div class="training-hud" id="trainingHud" hidden>
        <div class="training-hud-main"><span class="screen-label">MISSÃO ATIVA</span><strong id="trainingCurrentExercise">Preparando...</strong><small id="trainingProgress">0 / 0 exercícios</small></div>
        <div class="training-clock"><span>TEMPO</span><strong id="trainingElapsed">00:00</strong></div>
        <div class="training-rest" id="trainingRest"><span>DESCANSO</span><strong id="trainingRestTime">—</strong><button type="button" id="skipRest">PULAR</button></div>
        <button class="training-minimize" type="button" id="minimizeTraining">MINIMIZAR</button>
      </div>`);
    document.getElementById('skipRest')?.addEventListener('click',()=>stopRestTimer());
    document.getElementById('minimizeTraining')?.addEventListener('click',()=>document.body.classList.toggle('training-mode-minimized'));
  }

  function formatClock(seconds){
    const min=Math.floor(seconds/60).toString().padStart(2,'0');
    const sec=(seconds%60).toString().padStart(2,'0');
    return `${min}:${sec}`;
  }

  function startElapsed(){
    clearInterval(elapsedTimer);
    elapsedSeconds=0;
    const output=document.getElementById('trainingElapsed');
    if(output)output.textContent='00:00';
    elapsedTimer=setInterval(()=>{elapsedSeconds+=1;if(output)output.textContent=formatClock(elapsedSeconds);},1000);
  }

  function stopElapsed(){clearInterval(elapsedTimer);elapsedTimer=null;}

  function prescribedRest(card){
    const data=card?.dataset.targetRest||'';
    const source=data||card?.querySelector('.execution-exercise-head p')?.textContent||'';
    const match=String(source).match(/(?:descanso\s*)?(\d{2,3})/i);
    return match?Number(match[1]):90;
  }

  function startRestTimer(card){
    stopRestTimer(false);
    restRemaining=prescribedRest(card);
    const wrapper=document.getElementById('trainingRest');
    const output=document.getElementById('trainingRestTime');
    if(wrapper)wrapper.classList.add('rest-active');
    if(output)output.textContent=formatClock(restRemaining);
    restTimer=setInterval(()=>{
      restRemaining-=1;
      if(output)output.textContent=formatClock(Math.max(0,restRemaining));
      if(restRemaining<=0){
        stopRestTimer();
        toast('Descanso concluído. Próxima série disponível.');
      }
    },1000);
  }

  function stopRestTimer(reset=true){
    clearInterval(restTimer);restTimer=null;restRemaining=0;
    const wrapper=document.getElementById('trainingRest');
    const output=document.getElementById('trainingRestTime');
    if(wrapper)wrapper.classList.remove('rest-active');
    if(output&&reset)output.textContent='—';
  }

  function cardComplete(card){
    const rows=[...card.querySelectorAll('.set-log-row')];
    return rows.length>0&&rows.every(row=>row.classList.contains('completed'));
  }

  function updateTrainingFocus({scroll=false}={}){
    const cards=[...document.querySelectorAll('#exerciseList .execution-exercise')];
    const completed=cards.filter(cardComplete);
    cards.forEach(card=>card.classList.toggle('training-complete',cardComplete(card)));
    const current=cards.find(card=>!cardComplete(card))||null;
    cards.forEach(card=>card.classList.toggle('training-current',card===current));
    const name=document.getElementById('trainingCurrentExercise');
    const progress=document.getElementById('trainingProgress');
    if(name)name.textContent=current?(current.dataset.name||current.querySelector('.execution-exercise-head strong')?.textContent||'Exercício'):'Todas as séries concluídas';
    if(progress)progress.textContent=`${completed.length} / ${cards.length} exercícios concluídos`;
    if(scroll&&current)current.scrollIntoView({behavior:'smooth',block:'center'});
  }

  function enterTrainingMode(checkIn){
    ensureTrainingHud();
    const hud=document.getElementById('trainingHud');
    if(hud)hud.hidden=false;
    document.body.classList.add('training-mode-active');
    document.body.classList.remove('training-mode-minimized');
    const intro=document.querySelector('#exerciseList .execution-intro');
    if(intro){
      const energy=checkIn.energy==='low'?'energia baixa':checkIn.energy==='good'?'energia boa':'energia normal';
      const adaptation=checkIn.adapted?' · missão compactada':'';
      intro.innerHTML=`<span class="screen-label">PARÂMETROS ACEITOS</span><p>${energy}${adaptation}. Registre cada série e mantenha o esforço dentro do alvo planejado.</p>`;
    }
    startElapsed();
    updateTrainingFocus({scroll:true});
  }

  function exitTrainingMode(){
    stopElapsed();
    stopRestTimer();
    document.body.classList.remove('training-mode-active','training-mode-minimized');
    const hud=document.getElementById('trainingHud');
    if(hud)hud.hidden=true;
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('#startBtn');
    if(!button)return;
    if(button.dataset.state==='idle'&&button.dataset.checkinApproved!=='true'){
      event.preventDefault();
      event.stopImmediatePropagation();
      openCheckin();
      return;
    }
    if(button.dataset.state==='active'){
      setTimeout(()=>{
        if(button.dataset.state==='done'){
          exitTrainingMode();
          setTimeout(()=>localStorage.removeItem(CHECKIN_KEY),500);
        }
      },30);
    }
  },true);

  document.addEventListener('click',event=>{
    const setButton=event.target.closest('.set-done');
    if(!setButton||!document.body.classList.contains('training-mode-active'))return;
    const row=setButton.closest('.set-log-row');
    const card=setButton.closest('.execution-exercise');
    setTimeout(()=>{
      if(row?.classList.contains('completed'))startRestTimer(card);
      else stopRestTimer();
      const wasComplete=card?.classList.contains('training-complete');
      updateTrainingFocus({scroll:Boolean(cardComplete(card)&&!wasComplete)});
    },0);
  });

  const observer=new MutationObserver(()=>{
    ensureTrainingHud();
    if(document.body.classList.contains('training-mode-active'))updateTrainingFocus();
  });
  const mission=document.querySelector('#view-missao .mission');
  if(mission)observer.observe(mission,{childList:true,subtree:true});

  ensureCheckinModal();
  ensureTrainingHud();
})();