(()=>{
  let flashTimer=null;
  let completionWasOpen=false;

  function vibrate(pattern){
    try{if('vibrate' in navigator)navigator.vibrate(pattern);}catch{}
  }

  function flash(message,type=''){
    let el=document.getElementById('appEventFlash');
    if(!el){
      el=document.createElement('div');
      el.id='appEventFlash';
      el.className='app-event-flash';
      document.body.appendChild(el);
    }
    el.textContent=message;
    el.className=`app-event-flash ${type}`.trim();
    requestAnimationFrame(()=>el.classList.add('show'));
    clearTimeout(flashTimer);
    flashTimer=setTimeout(()=>el.classList.remove('show'),900);
  }

  function ensureTechnicalDisclosure(){
    [
      ['volumeArchitecture','VOLUME'],
      ['prescriptionArchitecture','PRESCRIÇÃO']
    ].forEach(([id,label])=>{
      const section=document.getElementById(id);
      if(!section||section.dataset.appDisclosure==='true')return;
      section.dataset.appDisclosure='true';
      section.classList.add('app-tech-collapsible','app-tech-collapsed');
      const head=section.querySelector(':scope > .section-head');
      if(!head)return;
      const button=document.createElement('button');
      button.type='button';
      button.className='app-tech-toggle';
      button.setAttribute('aria-expanded','false');
      button.textContent='DETALHES';
      button.setAttribute('aria-label',`Mostrar detalhes técnicos de ${label.toLowerCase()}`);
      button.addEventListener('click',()=>{
        const collapsed=section.classList.toggle('app-tech-collapsed');
        button.setAttribute('aria-expanded',String(!collapsed));
        button.textContent=collapsed?'DETALHES':'RECOLHER';
        vibrate(10);
      });
      head.appendChild(button);
    });
  }

  function ensureConnectionState(){
    const topbar=document.querySelector('.app-topbar');
    if(!topbar)return;
    let state=document.getElementById('appConnectionState');
    if(!state){
      state=document.createElement('div');
      state.id='appConnectionState';
      state.className='app-connection';
      const rank=topbar.querySelector('.app-rank-chip');
      if(rank)rank.insertAdjacentElement('beforebegin',state);else topbar.appendChild(state);
    }
    state.classList.toggle('offline',!navigator.onLine);
    state.textContent=navigator.onLine?'ONLINE':'OFFLINE';
  }

  function currentCardCompleted(card){
    if(!card)return false;
    const rows=[...card.querySelectorAll('.set-log-row')];
    return rows.length>0&&rows.every(row=>row.classList.contains('completed'));
  }

  document.addEventListener('click',event=>{
    const setButton=event.target.closest('.set-done');
    if(setButton){
      const row=setButton.closest('.set-log-row');
      const card=setButton.closest('.execution-exercise');
      const wasCardComplete=currentCardCompleted(card);
      setTimeout(()=>{
        if(row?.classList.contains('completed')){
          if(!wasCardComplete&&currentCardCompleted(card)){
            vibrate([24,35,32]);
            flash('EXERCÍCIO CONCLUÍDO','success');
          }else{
            vibrate(18);
            flash('SÉRIE REGISTRADA');
          }
        }
      },35);
    }
  });

  function watchCompletion(){
    const modal=document.getElementById('completionModal');
    if(!modal)return;
    const isOpen=!modal.hidden;
    if(isOpen&&!completionWasOpen){
      vibrate([35,45,75]);
      flash('MISSÃO CONCLUÍDA','success');
    }
    completionWasOpen=isOpen;
  }

  const observer=new MutationObserver(()=>{
    ensureTechnicalDisclosure();
    ensureConnectionState();
    watchCompletion();
  });
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  window.addEventListener('online',()=>{ensureConnectionState();flash('CONEXÃO RESTAURADA','success');});
  window.addEventListener('offline',()=>{ensureConnectionState();flash('MODO OFFLINE');});

  ensureTechnicalDisclosure();
  ensureConnectionState();
  watchCompletion();
})();
