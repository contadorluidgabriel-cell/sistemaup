const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async()=>{
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];
  const consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto('http://127.0.0.1:4173/#missao',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-first-access-guard="true"]'));
  assert.equal((await page.locator('#playerNameDisplay').textContent()).trim(),'Jogador','first access exposes prototype player name');
  assert.equal(await page.locator('#exerciseList .execution-exercise').count(),0,'generic training appeared before profile configuration');

  await page.waitForSelector('#appOnboarding:not([hidden])');
  assert.equal(await page.locator('.nav button svg').count(),5,'bottom navigation was not converted to app navigation');

  await page.fill('#appOnboardingInput','Teste MVP');
  await page.click('#appOnboardingNext');
  await page.locator('[data-choice="Hipertrofia"]').click();
  await page.click('#appOnboardingNext');
  await page.locator('[data-choice="3"]').click();
  await page.click('#appOnboardingNext');
  await page.locator('[data-choice="seg"]').click();
  await page.locator('[data-choice="qua"]').click();
  await page.locator('[data-choice="sex"]').click();
  await page.click('#appOnboardingNext');
  await page.locator('[data-choice="30–45 min"]').click();
  await page.click('#appOnboardingNext');
  await page.locator('[data-choice="Iniciante"]').click();
  await page.click('#appOnboardingNext');
  await page.locator('[data-choice="Halteres"]').click();
  await page.locator('[data-choice="Elásticos"]').click();
  await page.locator('[data-choice="Banco"]').click();
  await page.click('#appOnboardingNext');
  await page.locator('[data-choice="Peito"]').click();
  await page.click('#appOnboardingNext');

  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.playerProfile.v1')||'null')?.name==='Teste MVP');
  await page.waitForTimeout(1200);
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(()=>['PLANO GERADO','PLANO PARCIAL'].includes(document.getElementById('prescriptionState')?.textContent||''));
  await page.waitForSelector('#appHomeShell');

  const plan = await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')||'null'));
  assert.ok(plan?.sessions?.length>=1,'training plan was not created');
  assert.ok(Array.isArray(plan.unmetTargets),'plan does not expose unmet targets');
  assert.equal((await page.locator('.app-brand-copy strong').textContent()).includes('Teste'),true,'app home did not use player identity');

  await page.evaluate(()=>location.hash='#missao');
  await page.waitForSelector('#exerciseList .execution-exercise');
  const exerciseCount=await page.locator('#exerciseList .execution-exercise').count();
  assert.ok(exerciseCount>=1,'mission has no generated exercise');

  const restTarget=await page.locator('#exerciseList .execution-exercise').first().getAttribute('data-target-rest');
  assert.ok(Number(restTarget)>=60,'rest target was parsed from reps instead of prescribed rest');

  await page.click('#startBtn');
  await page.waitForSelector('#preMissionModal:not([hidden])');
  await page.click('#confirmCheckin');
  await page.waitForFunction(()=>document.body.classList.contains('training-mode-active'));
  assert.equal(await page.locator('.execution-exercise:visible').count(),1,'focused workout should expose one exercise at a time');

  let row=page.locator('.training-current .set-log-row:not(.completed)').first();
  await row.locator('.set-load').fill('10');
  await row.locator('.set-reps').fill('10');
  await row.locator('.set-rir').selectOption('2');
  await row.locator('.set-done').click();
  await page.waitForTimeout(350);

  const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.activeWorkoutDraft.v1')||'null'));
  assert.ok(draft?.exercises?.length,'active workout draft was not persisted');

  await page.click('#pauseTraining');
  await page.waitForFunction(()=>document.getElementById('pauseTraining')?.textContent==='CONFIRMAR PAUSA');
  await page.click('#pauseTraining');
  await page.waitForTimeout(450);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#exerciseList .execution-exercise');
  await page.waitForFunction(()=>document.getElementById('startBtn')?.textContent.includes('RETOMAR'));
  assert.equal(await page.locator('.set-log-row').first().evaluate(el=>el.classList.contains('completed')),true,'completed set was not restored after pause');

  await page.click('#startBtn');
  await page.waitForSelector('#preMissionModal:not([hidden])');
  await page.click('#confirmCheckin');
  await page.waitForFunction(()=>document.body.classList.contains('training-mode-active'));

  const totalRows=await page.locator('.set-log-row').count();
  for(let i=0;i<totalRows+5;i++){
    const pending=page.locator('.training-current .set-log-row:not(.completed)').first();
    if(await pending.count()){
      await pending.locator('.set-load').fill('10');
      await pending.locator('.set-reps').fill('10');
      await pending.locator('.set-rir').selectOption('2');
      await pending.locator('.set-done').click();
      await page.waitForTimeout(80);
      continue;
    }
    const remaining=await page.locator('.set-log-row:not(.completed)').count();
    if(remaining===0)break;
    await page.waitForTimeout(100);
  }
  assert.equal(await page.locator('.set-log-row:not(.completed)').count(),0,'focused workout did not advance through every prescribed set');

  await page.click('#startBtn');
  await page.waitForSelector('#completionModal:not([hidden])');
  const history=await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.workoutHistory.v1')||'[]'));
  assert.equal(history.length,1,'completed mission was not saved exactly once');
  assert.ok(history[0].exercises?.length>=1,'completed mission has no exercises');

  await page.click('#closeCompletion');
  const draftAfter=await page.evaluate(()=>localStorage.getItem('sistemaEvolucao.activeWorkoutDraft.v1'));
  assert.equal(draftAfter,null,'workout draft was not cleared after completion');

  await page.evaluate(()=>location.hash='#progresso');
  await page.waitForSelector('#appProgressDashboard');
  assert.equal((await page.locator('.app-progress-metric').first().textContent()).includes('1'),true,'progress dashboard did not reflect completed mission');

  const swReady=await page.evaluate(async()=>{
    if(!('serviceWorker' in navigator))return true;
    return Promise.race([
      navigator.serviceWorker.ready.then(()=>true).catch(()=>false),
      new Promise(resolve=>setTimeout(()=>resolve(false),5000))
    ]);
  });
  assert.equal(swReady,true,'PWA service worker did not become ready within 5 seconds');

  if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  if(consoleErrors.length)throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);

  console.log(`MVP app smoke passed: onboarding, focused workout, pause/resume, progress and PWA shell. ${exerciseCount} exercises, ${totalRows} sets.`);
  await browser.close();
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
