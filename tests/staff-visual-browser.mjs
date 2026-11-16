import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const KEY='the-motor-trade-career-v1';
const browser=await chromium.launch({headless:true});
mkdirSync('review',{recursive:true});

async function snapshot(page,key=KEY){
  return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
}
async function measure(page,label,mode,width){
  const p=page.locator('.staff-page-control');
  const v=await page.evaluate(()=>{
    document.documentElement.style.scrollBehavior='auto';
    window.scrollTo({top:0,behavior:'instant'});
    const root=document.querySelector('.staff-page-control');
    const r=x=>root.querySelector(x)?.getBoundingClientRect();
    const roster=root.querySelector('.sd-coverage-grid');
    const applicants=root.querySelector('.sd-register-list');
    const action=root.querySelector('.sd-primary-hire')||root.querySelector('[data-action="train-staff"]');
    return {
      viewportWidth:innerWidth,
      windowScrollY:Math.round(scrollY),
      documentWidth:document.documentElement.scrollWidth,
      panelWidth:root.scrollWidth,panelClientWidth:root.clientWidth,
      headerCount:root.querySelectorAll('h1').length,
      coverageTop:Math.round(r('.sd-coverage').top),
      coverageWidth:roster.scrollWidth,coverageClientWidth:roster.clientWidth,
      hiringTop:Math.round(r('.sd-hiring-overview').top),
      registerTop:Math.round(r('.sd-register').top),
      registerWidth:applicants.scrollWidth,registerClientWidth:applicants.clientWidth,
      dossierTop:Math.round(r('.sd-dossier').top),
      actionTop:Math.round(action?.getBoundingClientRect().top??-1)
    };
  });
  assert.equal(v.headerCount,1);
  assert.ok(v.documentWidth<=width+1,label+' '+mode+' document overflow '+JSON.stringify(v));
  assert.ok(v.panelWidth<=v.panelClientWidth+1,label+' '+mode+' panel overflow');
  assert.ok(v.coverageWidth<=v.coverageClientWidth+1,label+' '+mode+' coverage overflow');
  assert.ok(v.coverageTop>0&&v.coverageTop<560,label+' '+mode+' roster must start high on page');
  if(label==='desktop')assert.ok(v.dossierTop<850,'Desktop personnel file should start promptly');
  if(label==='phone')assert.ok(v.hiringTop<890,'Mobile recruitment must be discoverable');
  assert.ok(v.actionTop>0,'Staff or recruitment action must be accessible');
  await page.screenshot({path:'review/staff-'+mode+'-'+label+'.png',fullPage:true});
  console.log('STAFF_VISUAL_PASS '+mode+' '+label+' '+JSON.stringify(v));
  return v;
}

try{
  for(const [label,width,height] of [
    ['desktop',1440,900],['fold',820,1180],['phone',390,844]
  ]){
    const context=await browser.newContext({
      viewport:{width,height},deviceScaleFactor:1,hasTouch:width<900
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#menu-new-career').click();
    await page.locator('#dealership-name').fill('Staff Test Dealership');
    await page.locator('.setup-submit').click();
    await page.locator('#screen-career').waitFor({state:'visible'});
    await page.locator('.career-nav [data-page="staff"]').evaluate(n=>n.click());
    const panel=page.locator('.staff-page-control');
    await panel.waitFor({state:'visible'});
    assert.equal((await panel.locator('h1').innerText()).replace(/\s+/g,' ').trim(),
      'TEAM & HIRING.');
    assert.equal(await panel.locator('.sd-coverage-grid .sd-cover-role').count(),4);
    assert.equal(await panel.locator('.sd-kpis>div').count(),4);
    const opening=await snapshot(page);
    assert.equal(opening.startingCapital,45000);
    assert.equal(opening.staff.length,4);
    assert.equal(opening.payrollArrears,0);
    assert.equal(opening.cash,45000);
    assert.deepEqual(opening.staff.map(e=>e.name),
      ['Lewis Carter','Sophie Reed','Chloe Baker','Tom Fletcher']);
    assert.deepEqual(opening.staff.map(e=>e.monthlySalary),[1550,1750,1820,2200]);
    const coverage=await panel.locator('.sd-coverage-grid').innerText();
    for(const name of opening.staff.map(e=>e.name))assert.ok(coverage.includes(name),name);
    assert.match(coverage,/3 VACANCIES AVAILABLE/);
    assert.match(await panel.locator('.sd-hiring-overview').innerText(),/7 CAN HIRE NOW/);
    assert.match(await panel.locator('.sd-hiring-overview').innerText(),/GAME DAY 8/);
    await measure(page,label,'team',width);
    await panel.locator('.sd-hiring-overview [data-mode="candidates"]').click();
    assert.equal(await panel.locator('.sd-register .sd-person').count(),16);
    assert.equal(await panel.locator('.sd-dossier .sd-primary-hire').count(),1);
    assert.equal(await panel.locator('.sd-hire-breakdown').evaluate(x=>x.open),false);
    assert.match(await panel.locator('.sd-hire-brief').innerText(),/CHARGED ON HIRE/);
    assert.match(await panel.locator('.sd-hire-brief').innerText(),/MINIMUM CASH BALANCE/);
    const eligible=await page.evaluate(()=>{
      const E=window.MotorTradeEngine,P=E.people,V=window.MotorTradePeopleView;
      const state=JSON.parse(localStorage.getItem('the-motor-trade-career-v1'));
      return P.applicants(state.day).filter(c=>V.recruitStatus(state,P,c).canHire)
        .sort((a,b)=>a.monthlySalary-b.monthlySalary);
    });
    assert.equal(eligible.length,7);
    assert.equal(await panel.locator('.sd-register .sd-person').first().getAttribute('data-person'),
      'c:'+eligible[0].id,'First candidate must be hireable, not already on payroll');
    assert.equal((await panel.locator('.sd-primary-hire').isDisabled()),false);
    await measure(page,label,'candidates',width);
    const previous=JSON.stringify(await snapshot(page));
    await panel.locator('.sd-roles [data-role="buyer"]').click();
    const otherBuyer=await page.evaluate(()=>{
      const P=window.MotorTradePeople;
      return P.applicants(1).find(c=>c.role==='buyer'&&c.name!=='Sophie Reed').id;
    });
    await panel.locator('[data-person="c:'+otherBuyer+'"]').click();
    assert.equal(await panel.locator('.sd-primary-hire').isDisabled(),true);
    assert.match(await panel.locator('.sd-dossier').innerText(),/ROLE CAPACITY FULL/);
    assert.match(await panel.locator('.sd-hire-reason').innerText(),/Only one vehicle buyer/);
    assert.equal(JSON.stringify(await snapshot(page)),previous,
      'Changing candidates and filters cannot change saved cash or payroll');
    await page.screenshot({path:'review/staff-blocked-'+label+'.png',fullPage:true});
    await panel.locator('.sd-roles [data-role="all"]').click();
    await panel.locator('[data-person="c:'+eligible[0].id+'"]').click();
    assert.equal(await panel.locator('.sd-primary-hire').isDisabled(),false);
    await panel.locator('.sd-hire-breakdown summary').click();
    assert.equal(await panel.locator('.sd-hire-breakdown').evaluate(n=>n.open),true);
    assert.match(await panel.locator('.sd-hire-breakdown').innerText(),/3-DAY WAGE COVER/);
    await panel.locator('.sd-hire-breakdown summary').click();
    await panel.locator('.sd-primary-hire').click();
    const hired=await snapshot(page);
    assert.equal(hired.staff.length,5);
    assert.equal(hired.staff[4].name,eligible[0].name);
    assert.equal(hired.staff[4].role,'technician');
    assert.equal(hired.staff[4].startDay,2);
    assert.equal(hired.staff[4].hiredDay,1);
    assert.equal(hired.cash,opening.cash-150);
    assert.equal(hired.ledger.filter(x=>x.note.startsWith('Recruitment')).length,1);
    assert.equal(await panel.locator('.sd-coverage-grid .sd-cover-role').count(),4);
    assert.match(await panel.locator('.sd-dossier').innerText(),/STARTS DAY 2/);
    assert.equal(await panel.locator('.sd-register .sd-person').count(),5);
    await page.screenshot({path:'review/staff-hired-'+label+'.png',fullPage:true});
    // Refresh and validate that a real previously saved employee remains hired.
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    await page.locator('.career-nav [data-page="staff"]').evaluate(n=>n.click());
    const restored=await snapshot(page);
    assert.equal(restored.staff.length,5);
    assert.equal(restored.staff[4].name,eligible[0].name);
    assert.equal(restored.cash,hired.cash);
    // Paid training still acts on the actual selected employee, not on a dummy.
    await panel.locator('[data-person="e:1"]').click();
    await panel.locator('[data-action="train-staff"][data-id="1"]').click();
    const trained=await snapshot(page);
    assert.equal(trained.cash,hired.cash-275);
    assert.equal(trained.staff[0].trainingUntil,3);
    assert.equal(trained.staff[0].monthlySalary,1550);
    assert.equal(trained.staff.length,5);
    assert.deepEqual(errors,[],'No uncaught browser errors');
    console.log('STAFF_HIRE_PASS '+label+' '+JSON.stringify({
      initialCash:opening.cash,postHireCash:hired.cash,postTrainingCash:trained.cash,
      newEmployee:hired.staff[4].name,startsDay:hired.staff[4].startDay,
      totalStaff:hired.staff.length
    }));
    await context.close();
  }
}catch(error){
  console.error('STAFF_VISUAL_FAIL',error);
  process.exitCode=1;
}finally{
  await browser.close();
}
