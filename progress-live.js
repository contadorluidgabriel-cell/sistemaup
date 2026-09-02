(()=>{
  const loadModule=(src,flag,ready)=>{
    if(window[ready]||document.querySelector(`script[data-module-loader="${flag}"]`))return;
    const script=document.createElement('script');
    script.src=src;
    script.dataset.moduleLoader=flag;
    script.defer=true;
    document.body.appendChild(script);
  };

  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const update=()=>{const workouts=read('sistemaEvolucao.workoutHistory.v1',[]),activities=read('sistemaEvolucao.secondaryMissionHistory.v1',[]);const xp=workouts.reduce((s,w)=>s+Number(w.xpEarned||0),0)+activities.reduce((s,a)=>s+Number(a.xp||0),0),level=Math.floor(xp/100)+1,inLevel=xp%100;document.querySelectorAll('.xp-text').forEach(el=>el.textContent=`EXPERIÊNCIA ${inLevel} / 100 XP`);document.querySelectorAll('.level').forEach(el=>el.textContent=`LV.${String(level).padStart(2,'0')}`);document.querySelectorAll('.progress > div').forEach(el=>{if(el.closest('.status,.screen-panel'))el.style.width=`${inLevel}%`;});const card=document.querySelector('#view-progresso .empty-state');if(card&&(workouts.length||activities.length)){const total=workouts.reduce((s,w)=>s+(w.exercises||[]).reduce((n,e)=>n+(e.sets||[]).length,0),0);card.innerHTML=`<div class="empty-icon">◆</div><strong>${workouts.length} missão(ões) · ${activities.length} atividade(s)</strong><p>${total} séries de musculação registradas · ${activities.reduce((s,a)=>s+Number(a.minutes||0),0)} min de atividades complementares</p><small>${xp} XP acumulados. Cada registro real alimenta a próxima leitura do Sistema.</small>`;}};
  window.addEventListener('sistema:profile-saved',update);window.addEventListener('storage',update);setTimeout(update,500);
  loadModule('series-prescription.js','series-prescription','SistemaSeriesPrescription');
  loadModule('group-split-engine.js','group-split','SistemaGroupSplit');
})();
