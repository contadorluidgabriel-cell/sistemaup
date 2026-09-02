const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.setDefaultTimeout(18000);
  const pageErrors=[];
  const consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});

  await page.addInitScript(()=>{
    if(!sessionStorage.getItem('seriesQaInitialized')){
      localStorage.clear();
      localStorage.setItem('sistemaEvolucao.onboarding.v1',JSON.stringify({testOnly:true,version:1}));
      sessionStorage.setItem('seriesQaInitialized','1');
    }
  });
  await page.goto('http://127.0.0.1:4173/#perfil',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#profileSplitPreference');

  await page.fill('#profileName','Series QA');
  await page.selectOption('#profileGoal',{label:'Hipertrofia'});
  await page.selectOption('#profileFrequency','3');
  await page.selectOption('#profileDuration',{label:'30–45 min'});
  await page.selectOption('#profileExperience',{label:'Intermediário'});
  await page.selectOption('#profileSplitPreference','pull-push-lower-core');

  await page.evaluate(()=>{
    const setChecks=(name,values)=>{
      document.querySelectorAll(`input[name="${name}"]`).forEach(input=>{
        const checked=values.includes(input.value);
        if(input.checked!==checked){
          input.checked=checked;
          input.dispatchEvent(new Event('input',{bubbles:true}));
          input.dispatchEvent(new Event('change',{bubbles:true}));
        }
      });
    };
    setChecks('availableDay',['seg','qua','sex']);
    setChecks('equipment',['Halteres','Elásticos','Banco']);
  });

  const selectedContext=await page.evaluate(()=>({
    days:[...document.querySelectorAll('input[name="availableDay"]:checked')].map(el=>el.value),
    equipment:[...document.querySelectorAll('input[name="equipment"]:checked')].map(el=>el.value)
  }));
  assert.deepEqual(selectedContext.days.sort(),['qua','seg','sex'],'test setup did not establish three available days');
  assert.deepEqual(selectedContext.equipment.sort(),['Banco','Elásticos','Halteres'].sort(),'test setup did not establish equipment');

  await page.click('#profileForm button[type="submit"]');

  await page.waitForFunction(()=>{
    try{return JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')||'null')?.generator==='system-v3-preferred-split';}
    catch{return false;}
  });

  await page.goto('http://127.0.0.1:4173/#plano',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#openPlanEditor');
  await page.evaluate(()=>document.getElementById('openPlanEditor')?.click());
  await page.waitForSelector('#planEditorModal:not([hidden]) .sp-editor');

  const exercise=page.locator('#planEditorBody .pe-session').first().locator('.pe-exercise').first();
  const rows=exercise.locator('.sp-series-row');
  const before=await rows.count();
  assert.ok(before>=1,'series editor did not create planned rows');

  await exercise.locator('[data-sp-rest]').fill('90 s');
  await rows.nth(0).locator('[data-sp-field="load"]').fill('12 kg');
  await rows.nth(0).locator('[data-sp-field="reps"]').fill('10');
  await rows.nth(0).locator('[data-sp-field="rir"]').fill('2');
  await exercise.locator('.sp-add-series').click();
  await page.waitForFunction(expected=>document.querySelector('#planEditorBody .pe-session .pe-exercise')?.querySelectorAll('.sp-series-row').length===expected,before+1);

  const updatedRows=exercise.locator('.sp-series-row');
  await updatedRows.nth(before).locator('[data-sp-field="load"]').fill('10 kg');
  await updatedRows.nth(before).locator('[data-sp-field="reps"]').fill('12');
  await updatedRows.nth(before).locator('[data-sp-field="rir"]').fill('2');

  await Promise.all([
    page.waitForNavigation({waitUntil:'domcontentloaded'}),
    page.click('#savePlanEditor')
  ]);

  const plan=await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')));
  const saved=plan.sessions[0].exercises[0];
  assert.equal(plan.prescriptionModel,'per-series-v1','plan did not switch to per-series prescription model');
  assert.equal(saved.seriesPlan.length,before+1,'series count did not persist');
  assert.equal(saved.sets,before+1,'exercise set count did not follow series plan');
  assert.equal(saved.rest,'90 s','exercise rest did not persist');
  assert.equal(saved.seriesPlan[0].load,'12 kg','first planned load did not persist');
  assert.equal(saved.seriesPlan[0].reps,'10','first planned reps did not persist');
  assert.equal(saved.seriesPlan.at(-1).load,'10 kg','added series load did not persist');
  assert.equal(saved.seriesPlan.at(-1).reps,'12','added series reps did not persist');

  await page.goto('http://127.0.0.1:4173/#missao',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.execution-exercise .sp-set-target');
  const firstCard=page.locator('.execution-exercise').first();
  assert.match(await firstCard.locator('.sp-set-target').first().textContent(),/12 kg.*10 reps/,'planned target was not shown during execution');
  assert.equal(await firstCard.locator('.set-load').first().inputValue(),'12 kg','planned load was not offered in execution');

  if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  if(consoleErrors.length)throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
  console.log('Series prescription smoke passed: per-set load/reps/RIR/rest, add series, persistence and execution targets.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});