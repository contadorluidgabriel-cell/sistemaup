const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.setDefaultTimeout(12000);
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));

  await page.goto('http://127.0.0.1:4173/#perfil',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#profileForm');

  const onboarding=page.locator('#appOnboarding:not([hidden])');
  if(await onboarding.count()){
    await page.click('#appOnboardingBack');
    await page.waitForSelector('#appOnboarding[hidden]');
    await page.waitForTimeout(150);
  }

  const navState=await page.evaluate(()=>{
    const view=document.getElementById('view-perfil');
    const input=document.getElementById('profileName');
    const chain=[];
    let node=input;
    while(node&&chain.length<8){
      const style=getComputedStyle(node);
      chain.push({tag:node.tagName,id:node.id||'',className:typeof node.className==='string'?node.className:'',hidden:node.hidden,display:style.display,visibility:style.visibility});
      node=node.parentElement;
    }
    return {hash:location.hash,hasOpenView:typeof window.openView,viewHidden:view?.hidden,viewClass:view?.className,inputDisplay:getComputedStyle(input).display,inputVisibility:getComputedStyle(input).visibility,chain};
  });
  console.log('PROFILE_NAV_STATE '+JSON.stringify(navState));
  assert.equal(navState.viewHidden,false,'profile view stayed hidden after leaving guided setup');

  await page.fill('#profileName','Perfil QA');
  await page.selectOption('#profileGoal',{label:'Hipertrofia'});
  await page.selectOption('#profileFrequency','3');
  await page.selectOption('#profileDuration',{label:'30–45 min'});
  await page.selectOption('#profileExperience',{label:'Iniciante'});
  await page.selectOption('#profilePrimaryFocus',{label:'Peito'});
  await page.locator('input[name="availableDay"][value="seg"]').check();
  await page.locator('input[name="availableDay"][value="qua"]').check();
  await page.locator('input[name="availableDay"][value="sex"]').check();
  await page.locator('input[name="equipment"][value="Halteres"]').check();
  await page.locator('input[name="equipment"][value="Banco"]').check();

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
  console.log('Profile smoke passed: form save, Plan V3 generation and reload persistence.');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
