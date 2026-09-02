const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.setDefaultTimeout(15000);
  const pageErrors=[];
  const consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.addInitScript(()=>{
    localStorage.clear();
    localStorage.setItem('sistemaEvolucao.onboarding.v1',JSON.stringify({testOnly:true,version:1}));
  });
  await page.goto('http://127.0.0.1:4173/#perfil',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#profileSplitPreference');

  await page.fill('#profileName','Split QA');
  await page.selectOption('#profileGoal',{label:'Hipertrofia'});
  await page.selectOption('#profileFrequency','3');
  await page.selectOption('#profileDuration',{label:'30–45 min'});
  await page.selectOption('#profileExperience',{label:'Intermediário'});
  await page.selectOption('#profilePrimaryFocus',{label:'Desenvolvimento equilibrado'});
  await page.selectOption('#profileSplitPreference','pull-push-lower-core');
  await page.locator('input[name="availableDay"][value="seg"]').check({force:true});
  await page.locator('input[name="availableDay"][value="qua"]').check({force:true});
  await page.locator('input[name="availableDay"][value="sex"]').check({force:true});
  await page.locator('input[name="equipment"][value="Halteres"]').check({force:true});
  await page.locator('input[name="equipment"][value="Elásticos"]').check({force:true});
  await page.locator('input[name="equipment"][value="Banco"]').check({force:true});
  await page.click('#profileForm button[type="submit"]');

  await page.waitForFunction(()=>{
    try{return JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')||'null')?.generator==='system-v3-preferred-split';}
    catch{return false;}
  },{timeout:15000});

  const preferred=await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')));
  assert.equal(preferred.sessions.length,3,'preferred split did not create three sessions');
  assert.match(preferred.sessions[0].label,/^Puxar/,'first session is not pull');
  assert.match(preferred.sessions[1].label,/^Empurrar/,'second session is not push');
  assert.match(preferred.sessions[2].label,/^Inferior \+ Core$/,'third session is not lower + core');
  assert.ok(preferred.sessions[0].exercises.every(ex=>['Costas','Bíceps'].includes(ex.primary)),'pull session mixed unrelated muscles');
  assert.ok(preferred.sessions[1].exercises.every(ex=>['Peito','Ombros','Tríceps'].includes(ex.primary)),'push session mixed unrelated muscles');
  assert.ok(preferred.sessions[2].exercises.every(ex=>['Quadríceps','Posteriores','Glúteos','Panturrilhas','Core'].includes(ex.primary)),'lower/core session mixed unrelated muscles');
  assert.ok(preferred.sessions[2].exercises.some(ex=>ex.primary==='Core'),'core was not included');

  await page.evaluate(()=>location.hash='#plano');
  await page.waitForSelector('#openPlanEditor');
  await page.click('#openPlanEditor');
  await page.waitForSelector('#planEditorModal:not([hidden])');
  const firstSession=page.locator('#planEditorBody .pe-session').first();
  const firstExercise=firstSession.locator('.pe-exercise').first();
  await firstExercise.locator('input[data-prescription="reps"]').fill('10–12');
  const beforeSets=Number((await firstExercise.locator('.pe-sets b').textContent()).trim());
  await firstExercise.locator('[data-act="sets-plus"]').click();
  await page.waitForTimeout(120);
  assert.equal(await firstSession.locator('.pe-exercise').first().locator('input[data-prescription="reps"]').inputValue(),'10–12','rep edit was lost after changing sets');

  const beforeCount=await firstSession.locator('.pe-exercise').count();
  await firstSession.locator('.pe-exercise').last().locator('[data-act="remove"]').click();
  await page.waitForTimeout(100);
  assert.equal(await firstSession.locator('.pe-exercise').count(),beforeCount-1,'exercise was not removed');
  const addSelect=firstSession.locator('.pe-add-select');
  await addSelect.selectOption({index:1});
  await firstSession.locator('[data-act="add"]').click();
  await page.waitForTimeout(100);
  assert.equal(await firstSession.locator('.pe-exercise').count(),beforeCount,'exercise was not added back');

  await Promise.all([
    page.waitForNavigation({waitUntil:'domcontentloaded'}),
    page.click('#savePlanEditor')
  ]);
  const edited=await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')));
  assert.equal(edited.userEdited,true,'edited plan was not marked as user-owned');
  assert.equal(edited.sessions[0].exercises[0].reps,'10–12','edited repetition range was not persisted');
  assert.equal(Number(edited.sessions[0].exercises[0].sets),Math.min(6,beforeSets+1),'edited series count was not persisted');

  if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  if(consoleErrors.length)throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
  console.log('Split preference smoke passed: grouped sessions, core, add/remove exercise, sets and editable repetitions.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
