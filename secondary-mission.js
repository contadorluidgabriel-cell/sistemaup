(()=>{
  if(!document.querySelector('script[data-series-prescription]')){
    const seriesScript=document.createElement('script');
    seriesScript.src='series-prescription.js';
    seriesScript.dataset.seriesPrescription='true';
    document.body.appendChild(seriesScript);
  }

  const PROFILE_KEY='sistemaEvolucao.playerProfile.v1';
  const HISTORY_KEY='sistemaEvolucao.secondaryMissionHistory.v1';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const title=document.getElementById('complementaryTitle');
  const text=document.getElementById('complementaryText');
  const status=document.getElementById('secondaryMissionStatus');
  const button=document.getElementById('secondaryMissionBtn');
  if(!title||!text||!status||!button)return;
  const today=()=>new Date().toISOString().slice(0,10);
  const profile=()=>read(PROFILE_KEY,{});
  const history=()=>read(HISTORY_KEY,[]);
  const render=()=>{
    const p=profile(); const activity=p.complement||'Nenhuma';
    if(activity==='Nenhuma'){
      button.hidden=true; title.textContent='Nenhum protocolo complementar ativo'; text.textContent='O Sistema não adiciona cardio ou HIIT por padrão.'; status.textContent='Configure uma atividade no Perfil para desbloquear a missão secundária.'; return;
    }
    const label=activity==='Sistema sugerir'?'Recuperação ativa':activity;
    const todayRecords=history().filter(item=>item.date===today());
    button.hidden=false; button.textContent='REGISTRAR ATIVIDADE'; button.disabled=false;
    title.textContent=`${label} · missão secundária`;
    text.textContent=activity==='Mobilidade'?'8–12 min para preparar a próxima sessão.':'10–20 min em intensidade confortável, sem competir com a musculação.';
    status.textContent=todayRecords.length?`${todayRecords.length} atividade(s) registrada(s) hoje · ${todayRecords.reduce((sum,item)=>sum+Number(item.minutes||0),0)} min`:'Opcional e subordinada à missão principal.';
  };
  button.addEventListener('click',()=>{
    const p=profile(); if(!p.complement||p.complement==='Nenhuma')return;
    let modal=document.getElementById('secondaryActivityModal');
    if(!modal){
      document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="secondaryActivityModal" hidden><div class="modal panel" role="dialog" aria-modal="true" aria-labelledby="secondaryActivityTitle"><div class="kicker">◆ REGISTRO LIVRE</div><h2 id="secondaryActivityTitle">Registrar atividade</h2><p class="muted">Guarde o que você realmente fez. O Sistema usa esses dados para ler sua evolução.</p><label class="field"><span>ATIVIDADE</span><select id="secondaryActivityType"><option>Corrida</option><option>Caminhada</option><option>Bike</option><option>Mobilidade</option><option>HIIT</option><option>Outra</option></select></label><div class="field-grid"><label class="field"><span>DURAÇÃO (MIN)</span><input id="secondaryActivityMinutes" type="number" min="1" max="600" placeholder="24"></label><label class="field"><span>DISTÂNCIA (KM)</span><input id="secondaryActivityDistance" type="number" min="0" step="0.01" placeholder="3,2"></label></div><label class="field"><span>ESFORÇO PERCEBIDO</span><select id="secondaryActivityEffort"><option>Leve</option><option selected>Moderado</option><option>Pesado</option></select></label><label class="field"><span>OBSERVAÇÃO</span><textarea id="secondaryActivityNote" rows="2" maxlength="220" placeholder="Como foi? Algum desconforto?"></textarea></label><div class="checkin-actions"><button type="button" class="ghost-action" id="closeSecondaryActivity">CANCELAR</button><button type="button" class="start" id="saveSecondaryActivity">SALVAR REGISTRO</button></div></div></div>`);
      modal=document.getElementById('secondaryActivityModal');
      document.getElementById('closeSecondaryActivity')?.addEventListener('click',()=>{modal.hidden=true;});
      document.getElementById('saveSecondaryActivity')?.addEventListener('click',()=>{
        const minutes=Number(document.getElementById('secondaryActivityMinutes')?.value||0);
        if(!minutes){document.getElementById('secondaryActivityMinutes')?.focus();return;}
        const activity=document.getElementById('secondaryActivityType').value;
        const distance=Number(document.getElementById('secondaryActivityDistance').value||0);
        const records=history();
        const previous=records.filter(item=>item.activity===activity).slice(-1)[0];
        const record={id:`secondary-${Date.now()}`,date:today(),activity,minutes,distance,effort:document.getElementById('secondaryActivityEffort').value,note:document.getElementById('secondaryActivityNote').value.trim(),xp:12,completedAt:new Date().toISOString()};
        records.push(record); write(HISTORY_KEY,records.slice(-100)); modal.hidden=true; render();
        const comparison=previous?(distance&&previous.distance&&distance>previous.distance?`Você superou sua última distância em ${(distance-previous.distance).toFixed(2).replace('.',',')} km.`:minutes>Number(previous.minutes||0)?`Você ficou ${minutes-Number(previous.minutes||0)} min a mais em movimento.`:'Você manteve a exposição e fortaleceu a consistência.'):'Este é o primeiro registro. O Sistema começou a construir sua linha de evolução.';
        status.textContent=`REGISTRO ACEITO · ${comparison}`;
        document.body.classList.add('secondary-recorded'); setTimeout(()=>document.body.classList.remove('secondary-recorded'),1200);
        if(navigator.vibrate)navigator.vibrate([60,35,90]);
        const toast=document.getElementById('toast'); if(toast){toast.textContent=`◆ ${activity.toUpperCase()} REGISTRADA · +${record.xp} XP`;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2800);}
      });
    }
    modal.hidden=false; document.getElementById('secondaryActivityType').value=p.complement==='Sistema sugerir'?'Corrida':p.complement;
  });
  window.addEventListener('sistema:profile-saved',render); window.addEventListener('storage',render); render();
})();