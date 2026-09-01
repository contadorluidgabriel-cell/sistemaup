const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.setDefaultTimeout(12000);
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));

  await page.goto('http://127.0.0.1:4173/#plano',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    localStorage.clear();
    localStorage.setItem('sistemaEvolucao.playerProfile.v1',JSON.stringify({
      name:'Teste V3',goal:'Hipertrofia',frequency:'4',duration:'60+ min',experience:'Intermediário',
      primaryFocus:'Peito',secondaryFocus:'Costas',availableDays:['seg','ter','qui','sab'],
      equipment:['Peso corporal','Halteres','Elásticos','Banco'],complement:'Nenhuma',complementFrequency:'',notes:''
    }));
    localStorage.setItem('sistemaEvolucao.onboarding.v1',JSON.stringify({completedAt:new Date().toISOString(),version:1}));
  });
  await page.reload({waitUntil:'domcontentloaded'});

  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')||'null')?.version===3);
  await page.waitForSelector('#openPlanEditor');
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')));
  assert.equal(original.generator,'system-v3','V3 generator not active');
  assert.equal(original.sessions.length,4,'V3 did not respect four available sessions');
  assert.ok(original.architecture?.reason,'V3 did not explain its architecture');
  assert.ok(original.sessions.some(session=>session.label.includes('Ênfase')),'priority was not reflected in weekly architecture');

  await page.click('#openPlanEditor');
  await page.waitForSelector('#planEditorModal:not([hidden])');
  const beforeSets=original.sessions[0].exercises[0].sets;
  const plus=page.locator('#planEditorBody .pe-session').first().locator('.pe-exercise').first().locator('[data-act="sets-plus"]');
  await plus.click();
  await Promise.all([
    page.waitForNavigation({waitUntil:'domcontentloaded'}),
    page.click('#savePlanEditor')
  ]);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')||'null')?.userEdited===true);
  const edited=await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')));
  assert.equal(edited.sessions[0].exercises[0].sets,Math.min(6,beforeSets+1),'manual set edit was not preserved');
  assert.equal(edited.userEdited,true,'manual edit was not marked as user-owned');

  await page.evaluate(()=>location.hash='#missao');
  await page.waitForSelector('#exerciseList .execution-exercise');
  const baseBeforeAdapt=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1'))));
  const missionCountBefore=await page.locator('#exerciseList .execution-exercise').count();
  assert.ok(missionCountBefore>=4,'seeded V3 mission is too small to validate time adaptation');

  await page.click('#adaptBtn');
  await page.waitForSelector('#adaptModal:not([hidden])');
  await page.locator('#adaptModal [data-reason="Menos tempo disponível"]').click();
  await page.waitForSelector('#missionAdaptV2Modal:not([hidden])');
  await page.locator('[data-ma-time="20"]').click();
  await page.waitForSelector('.mission-adapt-banner');
  const missionCountAfter=await page.locator('#exerciseList .execution-exercise').count();
  assert.ok(missionCountAfter<=3,'20-minute adaptation did not compact the live mission');

  const baseAfterAdapt=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1'))));
  assert.equal(baseAfterAdapt,baseBeforeAdapt,'temporary mission adaptation changed the base plan');
  const adaptation=await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.missionAdaptation.v2')||'null'));
  assert.equal(adaptation?.reason,'Menos tempo disponível','temporary adaptation was not recorded');

  if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  console.log(`Plan V3 smoke passed: ${original.sessions.length} sessions, editable base plan, temporary mission ${missionCountBefore} -> ${missionCountAfter} exercises.`);
  await browser.close();
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
