const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.setDefaultTimeout(12000);
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));

  await page.addInitScript(()=>{
    localStorage.setItem('sistemaEvolucao.onboarding.v1',JSON.stringify({testOnly:true,version:1}));
  });

  await page.goto('http://127.0.0.1:4173/#missao',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#startBtn[data-state="blocked"]');
  await page.click('#startBtn[data-state="blocked"]');
  await page.waitForFunction(()=>location.hash==='#perfil'&&document.getElementById('view-perfil')?.hidden===false);
  assert.equal(await page.locator('.nav button[data-target="perfil"]').getAttribute('aria-current'),'page','profile nav was not activated');

  await page.waitForSelector('#profileForm');
  await page.fill('#profileName','Perfil QA');
  await page.selectOption('#profileGoal',{label:'Hipertrofia'});
  await page.selectOption('#profileFrequency','3');
  await page.selectOption('#profileDuration',{label:'30–45 min'});
  await page.selectOption('#profileExperience',{label:'Iniciante'});
  await page.selectOption('#profilePrimaryFocus',{label:'Peito'});
  await page.locator('input[name="availableDay"][value="seg"]').check({force:true});
  await page.locator('input[name="availableDay"][value="qua"]').check({force:true});
  await page.locator('input[name="availableDay"][value="sex"]').check({force:true});
  await page.locator('input[name="equipment"][value="Halteres"]').check({force:true});
  await page.locator('input[name="equipment"][value="Banco"]').check({force:true});

  await page.click('#profileForm button[type="submit"]');
  await page.waitForFunction(()=>{
    try{
      const p=JSON.parse(localStorage.getItem('sistemaEvolucao.playerProfile.v1')||'null');
      return p?.name==='Perfil QA'&&p?.goal==='Hipertrofia'&&p?.availableDays?.length===3&&p?.equipment?.includes('Halteres');
    }catch{return false;}
  });

  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.trainingPlan.v1')||'null')?.version===3,{timeout:12000});
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sistemaEvolucao.playerProfile.v1')));
  assert.equal(saved.frequency,'3');
  assert.equal(saved.duration,'30–45 min');
  assert.equal(saved.experience,'Iniciante');
  assert.equal(saved.primaryFocus,'Peito');

  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('#profileForm');
  assert.equal(await page.inputValue('#profileName'),'Perfil QA','name did not survive reload');
  assert.equal(await page.inputValue('#profileGoal'),'Hipertrofia','goal did not survive reload');
  assert.equal(await page.inputValue('#profileFrequency'),'3','frequency did not survive reload');
  assert.equal(await page.locator('input[name="availableDay"][value="seg"]').isChecked(),true,'available days did not survive reload');
  assert.equal(await page.locator('input[name="equipment"][value="Halteres"]').isChecked(),true,'equipment did not survive reload');

  if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  console.log('Profile smoke passed: blocked CTA routing, manual save, Plan V3 generation and reload persistence.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
