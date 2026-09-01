(()=>{
  const PROFILE_KEY='sistemaEvolucao.playerProfile.v1';
  const PLAN_KEY='sistemaEvolucao.trainingPlan.v1';
  const HISTORY_KEY='sistemaEvolucao.workoutHistory.v1';
  const NEXT_KEY='sistemaEvolucao.nextExerciseTargets.v1';
  const ADAPT_KEY='sistemaEvolucao.missionAdaptation.v2';
  const SESSION_KEY='sistemaEvolucao.currentSessionIndex.v1';
  const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const toast=message=>{const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);};

  function ensureModal(){
    if(document.getElementById('missionAdaptV2Modal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="pe-overlay" id="missionAdaptV2Modal" hidden><div class="panel pe-sheet" role="dialog" aria-modal="true"><div class="pe-top"><div><div class="kicker">◆ ADAPTAR MISSÃO V2</div><h2 id="maTitle">Recalcular missão</h2><p class="muted" id="maIntro">O ajuste vale para a missão de hoje. Seu plano base permanece intacto.</p></div><button class="pe-close" id="maClose">×</button></div><div id="maBody"></div></div></div>`);
    document.getElementById('maClose')?.addEventListener('click',closeModal);
    document.getElementById('missionAdaptV2Modal')?.addEventListener('click',event=>{if(event.target.id==='missionAdaptV2Modal')closeModal();});
  }
  function closeModal(){const modal=document.getElementById('missionAdaptV2Modal');if(modal)modal.hidden=true;document.body.classList.remove('modal-open');}
  function openModal(reason){
    ensureModal();
    const old=document.getElementById('adaptModal');if(old)old.hidden=true;
    document.getElementById('maTitle').textContent=reason;
    document.getElementById('maBody').innerHTML=formFor(reason);
    document.getElementById('missionAdaptV2Modal').hidden=false;
    document.body.classList.add('modal-open');
    bindForm(reason);
  }

  function currentCards(){return [...document.querySelectorAll('#exerciseList .execution-exercise')];}
  function profile(){return read(PROFILE_KEY,{})||{};}
  function currentSession(){
    const plan=read(PLAN_KEY,null);if(!plan?.sessions?.length)return null;
    const index=Math.max(0,Number(localStorage.getItem(SESSION_KEY)||0))%plan.sessions.length;
    return plan.sessions[index];
  }
  function itemForCard(card){return currentSession()?.exercises?.find(ex=>ex.id===card.dataset.exerciseId)||window.SistemaPlanV3?.catalog?.find(ex=>ex.id===card.dataset.exerciseId)||null;}
  function activeEquipment(){return new Set(Array.isArray(profile().equipment)?profile().equipment:[]);}
  function cardOptions(){return currentCards().map((card,index)=>`<option value="${card.dataset.exerciseId}">${index+1}. ${card.dataset.name||'Exercício'}</option>`).join('');}
  function usedRequirements(){return [...new Set(currentCards().flatMap(card=>itemForCard(card)?.requires||[]))];}

  function formFor(reason){
    if(reason==='Menos tempo disponível')return `<p>Quanto tempo você tem para terminar a missão?</p><div class="ma-options"><button data-ma-time="20">ATÉ 20 MIN<small>Preserva o núcleo e corta acessórios primeiro.</small></button><button data-ma-time="30">ATÉ 30 MIN<small>Compactação moderada.</small></button><button data-ma-time="40">ATÉ 40 MIN<small>Ajuste leve.</small></button></div>`;
    if(reason==='Equipamento indisponível'){
      const reqs=usedRequirements();
      return reqs.length?`<div class="ma-form"><label>Qual equipamento ficou indisponível?<select id="maEquipment">${reqs.map(req=>`<option>${req}</option>`).join('')}</select></label><p class="muted">O Sistema tenta manter músculo e padrão de movimento. Quando não houver substituto compatível, o exercício é retirado da missão de hoje.</p><div class="ma-actions"><button class="pe-mini pe-primary" id="maApplyEquipment">RECALCULAR</button></div></div>`:`<p>Nenhum equipamento específico foi detectado nesta missão. Os exercícios atuais parecem usar peso corporal ou dados antigos do plano.</p>`;
    }
    if(reason==='Energia abaixo do normal')return `<p>O Sistema pode reduzir o volume da sessão sem transformar baixa energia em obrigação de treinar pesado.</p><div class="ma-options"><button data-ma-energy="light">AJUSTE LEVE<small>Remove cerca de 1 série dos acessórios.</small></button><button data-ma-energy="moderate">AJUSTE MODERADO<small>Reduz aproximadamente 20% das séries, preservando prioridades.</small></button></div>`;
    if(reason==='Desconforto ou limitação')return `<div class="ma-form"><label>Onde apareceu o desconforto?<select id="maDiscomfortExercise">${cardOptions()}</select></label><label>Como você classifica?<select id="maDiscomfortLevel"><option value="mild">Leve / monitorar</option><option value="significant">Relevante / não continuar neste exercício</option></select></label><p class="muted">Desconforto relevante não gera uma troca automática “ao redor da dor”. O exercício é interrompido e o Sistema recomenda avaliação apropriada se persistir ou houver preocupação.</p><div class="ma-actions"><button class="pe-mini pe-primary" id="maApplyDiscomfort">APLICAR</button></div></div>`;
    if(reason==='Exercício inviável hoje')return `<div class="ma-form"><label>Qual exercício não dá para executar?<select id="maInfeasible">${cardOptions()}</select></label><label>Substituto compatível<select id="maSubstitute"></select></label><div class="ma-actions"><button class="pe-mini pe-primary" id="maApplySubstitute">TROCAR SÓ HOJE</button></div></div>`;
    return `<div class="ma-form"><label>O que mudou?<textarea id="maOtherText" rows="3" placeholder="Ex.: preciso sair mais cedo, ambiente cheio, interrupções..."></textarea></label><label>Ação conservadora<select id="maOtherAction"><option value="record">Apenas registrar contexto</option><option value="trim">Remover o último acessório</option><option value="sets">Reduzir uma série dos acessórios</option></select></label><div class="ma-actions"><button class="pe-mini pe-primary" id="maApplyOther">APLICAR</button></div></div>`;
  }

  function bindForm(reason){
    document.querySelectorAll('[data-ma-time]').forEach(btn=>btn.addEventListener('click',()=>applyTime(btn.dataset.maTime)));
    document.querySelectorAll('[data-ma-energy]').forEach(btn=>btn.addEventListener('click',()=>applyEnergy(btn.dataset.maEnergy)));
    document.getElementById('maApplyEquipment')?.addEventListener('click',()=>applyEquipment(document.getElementById('maEquipment').value));
    document.getElementById('maApplyDiscomfort')?.addEventListener('click',()=>applyDiscomfort(document.getElementById('maDiscomfortExercise').value,document.getElementById('maDiscomfortLevel').value));
    const infeasible=document.getElementById('maInfeasible');
    if(infeasible){infeasible.addEventListener('change',refreshSubstitutes);refreshSubstitutes();}
    document.getElementById('maApplySubstitute')?.addEventListener('click',()=>applySubstitute(infeasible.value,document.getElementById('maSubstitute').value));
    document.getElementById('maApplyOther')?.addEventListener('click',()=>applyOther(document.getElementById('maOtherText').value.trim(),document.getElementById('maOtherAction').value));
  }

  function importance(card,index){
    const item=itemForCard(card)||{};
    const focus=window.SistemaPlanV3?((profile().primaryFocus==='Braços'?['Bíceps','Tríceps']:[profile().primaryFocus]).filter(Boolean)):[];
    return (focus.includes(item.primary)?20:0)+(item.type==='compound'?8:0)+(currentCards().length-index)*.3;
  }
  function removeCardsTo(limit){
    const cards=currentCards();if(cards.length<=limit)return [];
    const remove=[...cards].map((card,index)=>({card,index,score:importance(card,index)})).sort((a,b)=>a.score-b.score).slice(0,cards.length-limit);
    const names=remove.map(x=>x.card.dataset.name||'Exercício');remove.forEach(x=>x.card.remove());renumber();return names;
  }
  function renumber(){
    const cards=currentCards();
    cards.forEach((card,index)=>{const order=card.querySelector('.exercise-order');if(order)order.textContent=String(index+1).padStart(2,'0');});
    const structure=document.querySelector('#view-missao .mission .structure');
    const sets=cards.reduce((sum,card)=>sum+card.querySelectorAll('.set-log-row').length,0);
    if(structure)structure.textContent=`MISSÃO ADAPTADA · ${cards.length} exercícios · ${sets} séries diretas`;
  }
  function setBanner(title,text){
    const list=document.getElementById('exerciseList');if(!list)return;
    list.querySelector('.mission-adapt-banner')?.remove();
    list.insertAdjacentHTML('afterbegin',`<div class="mission-adapt-banner"><strong>◆ ${title}</strong><span>${text}</span></div>`);
  }
  function record(reason,changes,extra={}){const data={version:2,reason,changes,...extra,recordedAt:new Date().toISOString()};write(ADAPT_KEY,data);return data;}
  function finish(title,text){setBanner(title,text);renumber();closeModal();toast('Missão recalculada. O plano base não foi alterado.');}

  function applyTime(minutes){
    const limit=minutes==='20'?3:minutes==='30'?4:5;
    const removed=removeCardsTo(limit);
    record('Menos tempo disponível',{minutes:Number(minutes),removed});
    finish('TEMPO REDUZIDO',removed.length?`${removed.length} exercício(s) de menor prioridade foram retirados da missão de hoje.`:'A missão já cabe aproximadamente no tempo informado.');
  }

  function removableSetRows(){
    return currentCards().flatMap((card,index)=>[...card.querySelectorAll('.set-log-row')].slice(2).map(row=>({row,card,score:importance(card,index)}))).sort((a,b)=>a.score-b.score);
  }
  function applyEnergy(level){
    const cards=currentCards();const total=cards.reduce((sum,c)=>sum+c.querySelectorAll('.set-log-row').length,0);
    const desired=level==='moderate'?Math.max(1,Math.ceil(total*.2)):Math.max(1,Math.ceil(total*.1));
    const candidates=removableSetRows().slice(0,desired);candidates.forEach(x=>x.row.remove());
    record('Energia abaixo do normal',{level,removedSets:candidates.length,suppressProgression:true});
    finish('ENERGIA BAIXA',`${candidates.length} série(s) foram retiradas. Hoje a prioridade é executar com margem e registrar a resposta, não perseguir progressão.`);
  }

  function substituteCandidates(excludeId,missing=[]){
    const card=currentCards().find(c=>c.dataset.exerciseId===excludeId);const item=itemForCard(card);if(!item)return [];
    const available=activeEquipment();missing.forEach(x=>available.delete(x));
    const catalog=window.SistemaPlanV3?.catalog||[];const p=window.SistemaPlanV3?.prefs?.()||{avoided:[]};
    return catalog.filter(ex=>ex.id!==excludeId&&ex.primary===item.primary&&!p.avoided?.includes(ex.id)&&ex.requires.every(req=>available.has(req))).sort((a,b)=>(b.pattern===item.pattern?1:0)-(a.pattern===item.pattern?1:0));
  }
  function refreshSubstitutes(){
    const id=document.getElementById('maInfeasible')?.value;const select=document.getElementById('maSubstitute');if(!select)return;
    const options=substituteCandidates(id);select.innerHTML=options.length?options.map(ex=>`<option value="${ex.id}">${ex.pattern===itemForCard(currentCards().find(c=>c.dataset.exerciseId===id))?.pattern?'Mesmo padrão · ':''}${ex.name}</option>`).join(''):'<option value="">Nenhum substituto automático compatível</option>';
  }

  function previousExposure(id){
    const records=read(HISTORY_KEY,[])||[];
    for(let i=records.length-1;i>=0;i--){const found=records[i].exercises?.find(ex=>ex.id===id);if(found)return found;}return null;
  }
  function renderCard(ex,index,setsOverride){
    const scheme=window.SistemaPlanV3?.repScheme?.(ex,profile())||{reps:'8–15',rir:'2–3',rest:'90–150 s'};
    const sets=setsOverride||ex.sets||2;const previous=previousExposure(ex.id);
    const rows=Array.from({length:sets},(_,i)=>`<div class="set-log-row" data-set="${i}"><span class="set-number">${i+1}</span><label><span>CARGA / RESIST.</span><input class="set-load" type="text" maxlength="18" placeholder="8 kg / médio / PC" value="${String(previous?.sets?.[i]?.load||'').replace(/"/g,'&quot;')}"></label><label><span>REPS</span><input class="set-reps" type="number" inputmode="numeric" min="0" max="100" placeholder="—"></label><label><span>RIR</span><select class="set-rir"><option value="">—</option><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label><button class="set-done" type="button">○</button></div>`).join('');
    return `<article class="execution-exercise" data-exercise-id="${ex.id}" data-target-reps="${scheme.reps}" data-target-rir="${scheme.rir}" data-name="${ex.name.replace(/"/g,'&quot;')}"><div class="execution-exercise-head"><span class="exercise-order">${String(index+1).padStart(2,'0')}</span><div><span class="tag">${ex.primary}</span><strong>${ex.name}</strong><p>${sets} séries · ${scheme.reps} reps · RIR ${scheme.rir} · descanso ${scheme.rest}</p></div></div><div class="previous-reading"><span>ÚLTIMA EXPOSIÇÃO</span><strong>${previous?.sets?.length?`${previous.sets.map(s=>s.reps).join('/')} reps`:'Sem registro anterior'}</strong></div><div class="set-log-head"><span>SÉRIE</span><span>CARGA / RESIST.</span><span>REPS</span><span>RIR</span><span></span></div><div class="set-log">${rows}</div><div class="discomfort-row"><span>Desconforto durante este exercício?</span><select class="exercise-discomfort"><option value="none">Não</option><option value="mild">Leve / incômodo</option><option value="significant">Relevante</option></select></div></article>`;
  }
  function bindCard(card){
    card.querySelectorAll('.set-done').forEach(btn=>btn.addEventListener('click',()=>{const row=btn.closest('.set-log-row');const reps=row.querySelector('.set-reps').value;const rir=row.querySelector('.set-rir').value;if(reps===''||rir===''){toast('Registre repetições e RIR antes de concluir a série.');return;}row.classList.toggle('completed');btn.textContent=row.classList.contains('completed')?'✓':'○';}));
  }
  function replaceCard(card,ex){
    const index=currentCards().indexOf(card);const oldRows=card.querySelectorAll('.set-log-row').length;
    const wrapper=document.createElement('div');wrapper.innerHTML=renderCard(ex,index,Math.max(2,Math.min(4,oldRows)));const next=wrapper.firstElementChild;card.replaceWith(next);bindCard(next);return next;
  }

  function applyEquipment(missing){
    const affected=currentCards().filter(card=>(itemForCard(card)?.requires||[]).includes(missing));const changes=[];
    affected.forEach(card=>{const oldName=card.dataset.name;const candidate=substituteCandidates(card.dataset.exerciseId,[missing])[0];if(candidate){replaceCard(card,candidate);changes.push({from:oldName,to:candidate.name});}else{card.remove();changes.push({from:oldName,to:null});}});
    record('Equipamento indisponível',{missing,changes});
    finish('RESTRIÇÃO DE EQUIPAMENTO',changes.length?`${changes.filter(c=>c.to).length} substituição(ões) e ${changes.filter(c=>!c.to).length} remoção(ões) aplicadas só hoje.`:'Nenhum exercício atual depende desse equipamento.');
  }

  function applyDiscomfort(id,level){
    const card=currentCards().find(c=>c.dataset.exerciseId===id);if(!card)return;
    const select=card.querySelector('.exercise-discomfort');if(select)select.value=level;
    if(level==='significant'){
      const completed=card.querySelector('.set-log-row.completed');
      if(!completed)card.remove();
      record('Desconforto ou limitação',{exerciseId:id,exercise:card.dataset.name,level,removed:!completed,suppressProgression:true});
      finish('LIMITAÇÃO REGISTRADA',completed?'O exercício já possuía registro. Não faça novas séries nele; desconforto relevante bloqueia progressão automática desta exposição.':'O exercício foi retirado da missão de hoje e não foi substituído automaticamente.');
    }else{
      record('Desconforto ou limitação',{exerciseId:id,exercise:card.dataset.name,level,suppressProgression:true});
      finish('MONITORAMENTO ATIVO','Incômodo leve registrado. Mantenha margem de esforço e interrompa se piorar ou se houver preocupação.');
    }
  }

  function applySubstitute(id,newId){
    const card=currentCards().find(c=>c.dataset.exerciseId===id);const ex=(window.SistemaPlanV3?.catalog||[]).find(item=>item.id===newId);
    if(!card||!ex){toast('Não existe substituto automático compatível.');return;}
    const from=card.dataset.name;replaceCard(card,ex);record('Exercício inviável hoje',{from,to:ex.name});finish('EXERCÍCIO SUBSTITUÍDO',`${from} → ${ex.name}. A troca vale apenas para esta missão.`);
  }

  function applyOther(text,action){
    let changes={text,action};
    if(action==='trim'){const cards=currentCards();const removed=removeCardsTo(Math.max(1,cards.length-1));changes.removed=removed;}
    if(action==='sets'){const candidates=removableSetRows();if(candidates[0])candidates[0].row.remove();changes.removedSets=candidates[0]?1:0;}
    record('Outro contexto',changes);finish('CONTEXTO REGISTRADO',action==='record'?'Nenhuma variável física foi alterada automaticamente.':action==='trim'?'O último exercício de menor prioridade foi retirado.':'Uma série acessória foi retirada.');
  }

  document.addEventListener('click',event=>{
    const reasonButton=event.target.closest('[data-reason]');
    if(!reasonButton)return;
    event.preventDefault();event.stopImmediatePropagation();
    openModal(reasonButton.dataset.reason);
  },true);

  document.addEventListener('click',event=>{
    const start=event.target.closest('#startBtn');if(!start)return;
    if(start.dataset.state!=='active')return;
    setTimeout(()=>{
      const adaptation=read(ADAPT_KEY,null);if(!adaptation)return;
      const history=read(HISTORY_KEY,[])||[];const last=history[history.length-1];
      if(last&&Date.now()-new Date(last.completedAt||0).getTime()<12000){last.adaptation=adaptation;write(HISTORY_KEY,history);}
      if(adaptation.changes?.suppressProgression||adaptation.suppressProgression){
        const recommendations=read(NEXT_KEY,{})||{};
        (last?.exercises||[]).forEach(ex=>{recommendations[ex.id]={state:'OBSERVAR',text:'Esta exposição foi adaptada por energia ou desconforto. O Sistema preserva o registro, mas não usa esta sessão isoladamente para liberar progressão.',generatedAt:new Date().toISOString()};});
        write(NEXT_KEY,recommendations);
      }
      localStorage.removeItem(ADAPT_KEY);
    },120);
  });

  ensureModal();
})();