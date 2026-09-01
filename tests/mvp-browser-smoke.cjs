const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async()=>{
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];
  const consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.goto('http://127.0.0.1:4173/#perfil',{waitUntil:'networkidle'});
  await page.waitForSelector('#profileForm');

  await page.fill('#profileName','Teste MVP');
  await page.selectOption('#profileGoal','Hipertrofia');
  await page.selectOption('#profileFrequency','3');
  await page.selectOption('#profileDuration','30–45 min');
  await page.selectOption('#profileExperience','Iniciante');
  await page.selectOption('#profilePrimaryFocus','Peito');
  await page.check('input[name="availableDay"][value="seg"]');
  await page.check('input[name="availableDay"][value="qua"]');
  await page.check('input[name="availableDay"][value="sex"]');
  await page.check('input[name="equipment"][value="Halteres"]');
  await page.check('input[name="equipment"][value="Elásticos"]');
  await page.check('input[name="equipment"][value="Banco"]');
  await page.click('#profileForm button[type="submit"]');

  await page.waitForFunction(()=>document.getElementById('prescriptionState')?.textContent==='PLANO GERADO');
  const plan = await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')||'null'));
  assert.ok(plan?.sessions?.length>=1,'training plan was not created');

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

  const firstRow=page.locator('.set-log-row').first();
  await firstRow.locator('.set-load').fill('10 kg');
  await firstRow.locator('.set-reps').fill('10');
  await firstRow.locator('.set-rir').selectOption('2');
  await firstRow.locator('.set-done').click();
  await page.waitForFunction(()=>document.querySelector('.set-log-row')?.classList.contains('completed'));
  await page.waitForTimeout(350);

  const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.activeWorkoutDraft.v1')||'null'));
  assert.ok(draft?.exercises?.length,'active workout draft was not persisted');

  await page.reload({waitUntil:'networkidle'});
  await page.waitForSelector('#exerciseList .execution-exercise');
  await page.waitForFunction(()=>document.getElementById('startBtn')?.textContent.includes('RETOMAR'));
  assert.equal(await page.locator('.set-log-row').first().evaluate(el=>el.classList.contains('completed')),true,'completed set was not restored after reload');

  await page.click('#startBtn');
  await page.waitForSelector('#preMissionModal:not([hidden])');
  await page.click('#confirmCheckin');
  await page.waitForFunction(()=>document.body.classList.contains('training-mode-active'));

  const rows=page.locator('.set-log-row');
  const rowCount=await rows.count();
  for(let i=0;i<rowCount;i++){
    const row=rows.nth(i);
    const completed=await row.evaluate(el=>el.classList.contains('completed'));
    if(completed)continue;
    await row.locator('.set-load').fill('10 kg');
    await row.locator('.set-reps').fill('10');
    await row.locator('.set-rir').selectOption('2');
    await row.locator('.set-done').click();
  }

  await page.click('#startBtn');
  await page.waitForSelector('#completionModal:not([hidden])');
  const history=await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.workoutHistory.v1')||'[]'));
  assert.equal(history.length,1,'completed mission was not saved exactly once');
  assert.ok(history[0].exercises?.length>=1,'completed mission has no exercises');

  await page.click('#closeCompletion');
  const draftAfter=await page.evaluate(()=>localStorage.getItem('sistemaEvolucao.activeWorkoutDraft.v1'));
  assert.equal(draftAfter,null,'workout draft was not cleared after completion');

  if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  if(consoleErrors.length)throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);

  console.log(`MVP browser smoke passed: ${exerciseCount} exercises, ${rowCount} sets.`);
  await browser.close();
})().catch(async error=>{
  console.error(error);
  process.exit(1);
});