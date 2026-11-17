import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const KEY='the-motor-trade-career-v1';
const browser=await chromium.launch({headless:true});
mkdirSync('review',{recursive:true});

async function openGame(page,site='Facilities Visual QA'){
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#menu-new-career').click();
  await page.locator('#dealership-name').fill(site);
  await page.locator('.setup-submit').click();
  await page.locator('#screen-career').waitFor({state:'visible'});
}
async function go(page,key='business'){
  await page.locator('.career-nav [data-page="'+key+'"]').evaluate(n=>n.click());
}
async function stored(page){
  return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
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
    await openGame(page);
    await go(page);
    const panel=page.locator('.premises-page-control');
    await panel.waitFor({state:'visible'});
    assert.equal((await panel.locator('h1').innerText()).replace(/\s+/g,' ').trim(),
      'PREMISES & FACILITIES.');
    assert.equal(await panel.locator('.hq-identity-facts>div').count(),6);
    assert.equal(await panel.locator('.hq-metrics .hq-metric').count(),4);
    assert.equal(await panel.locator('.hq-upgrade').count(),2);
    assert.equal(await panel.locator('[data-action="upgrade-premises"]:disabled').count(),1,
      'Forecourt grows automatically; only workshop investment has an owner-approval button');
    assert.match(await panel.locator('.hq-metrics').innerText(),/4 PHYSICAL BAYS/);
    assert.match(await panel.locator('.hq-metrics').innerText(),/1 active technician/);
    assert.match(await panel.locator('.hq-commit-grid').first().innerText(),/TOTAL COST \/ DAY/);
    assert.equal(await panel.locator('.hq-cost-history').evaluate(n=>n.open),false);
    const opening=await stored(page);
    assert.equal(opening.startingCapital,45000);
    assert.equal(opening.cash,45000);
    assert.equal(opening.staff.length,4);
    assert.equal(opening.premises.forecourtLevel,0);
    const metrics=await page.evaluate(()=>{
      document.documentElement.style.scrollBehavior='auto';
      window.scrollTo({top:0,behavior:'instant'});
      const p=document.querySelector('.premises-page-control');
      const rect=x=>p.querySelector(x).getBoundingClientRect();
      return {
        viewport:innerWidth,scrollY:Math.round(scrollY),
        docWidth:document.documentElement.scrollWidth,
        panelWidth:p.scrollWidth,panelClientWidth:p.clientWidth,
        headings:p.querySelectorAll('h1').length,
        identityTop:Math.round(rect('.hq-identity').top),
        metricsTop:Math.round(rect('.hq-metrics').top),
        facilitiesTop:Math.round(rect('.hq-upgrades').top),
        firstUpgradeBottom:Math.round(rect('.hq-upgrade').bottom),
        actionTop:Math.round(rect('.hq-invest-button').top)
      };
    });
    assert.equal(metrics.headings,1);
    assert.ok(metrics.docWidth<=width+1,label+' document overflow '+JSON.stringify(metrics));
    assert.ok(metrics.panelWidth<=metrics.panelClientWidth+1,label+' panel overflow');
    assert.ok(metrics.identityTop<400,label+' company identity must begin high on page');
    assert.ok(metrics.facilitiesTop>metrics.metricsTop,label+' facility cards follow capacity status');
    if(label==='desktop')assert.ok(metrics.facilitiesTop<725,
      'Upgrades should start within first desktop screen');
    await page.screenshot({path:'review/premises-start-'+label+'.png',fullPage:true});
    // Native disclosures reveal full protected cash requirements without
    // changing the bank balance or the saved career.
    await panel.locator('.hq-upgrade-details summary').first().click();
    assert.equal(await panel.locator('.hq-upgrade-details').first().evaluate(n=>n.open),true);
    assert.match(await panel.locator('.hq-upgrade-details').first().innerText(),/PROTECTED CASH BUFFER/);
    await panel.locator('.hq-cost-history summary').click();
    assert.equal(await panel.locator('.hq-cost-history').evaluate(n=>n.open),true);
    assert.match(await panel.locator('.hq-cost-history').innerText(),/MONTH-TO-DATE PREMISES COST/);
    assert.deepEqual(await stored(page),opening);
    // A tier-unlock test fixture: not a claim that 20 reputation is granted
    // at the start. No actual expansion can bypass the engine rules.
    const approvedFixture=await page.evaluate(key=>{
      const E=window.MotorTradeEngine;
      const s=JSON.parse(localStorage.getItem(key));
      s.reputationScore=20;
      s.reputation=E.people.tier(20);
      s.monthPlan.startingReputation=20;
      E.premises.sync(s); // Reputation rewards forecourt space without charging £1,800.
      if(!E.normalize(JSON.parse(JSON.stringify(s))))
        throw Error('Unlocked reputation test fixture failed save validation');
      localStorage.setItem(key,JSON.stringify(s));
      return s;
    },KEY);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    await go(page);
    assert.equal(await panel.locator('[data-action="upgrade-premises"][data-kind="forecourt"]').count(),0,
      'Permanent forecourt expansion is automatic and must not be charged manually');
    assert.equal(await panel.locator('[data-action="upgrade-premises"][data-kind="workshop"]').isDisabled(),true);
    assert.match(await panel.locator('.hq-upgrade').first().innerText(),/AUTO UNLOCK/);
    assert.match(await panel.locator('.hq-upgrade').first().innerText(),/6 PHYSICAL SPACES/);
    assert.match(await panel.locator('.hq-upgrade').first().innerText(),/OFFSITE COST/);
    const expanded=await stored(page);
    assert.equal(expanded.cash,approvedFixture.cash,
      'Reputation-based automatic capacity growth cannot debit cash');
    assert.equal(expanded.capacity,6);
    assert.equal(expanded.premises.forecourtLevel,1);
    assert.equal(expanded.premises.workshopLevel,0);
    assert.equal(expanded.ledger.filter(x=>x.note.startsWith('Premises investment: forecourt')).length,0);
    assert.match(await panel.locator('.hq-metrics').innerText(),/0 \/ 8/);
    assert.equal(await panel.locator('.hq-invest-button').count(),1,
      'Only the workshop has a paid investment control');
    await page.screenshot({path:'review/premises-expanded-'+label+'.png',fullPage:true});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    await go(page);
    const reloaded=await stored(page);
    assert.equal(reloaded.cash,expanded.cash);
    assert.equal(reloaded.capacity,6);
    assert.equal(reloaded.staff.length,4);
    assert.deepEqual(errors,[],'No uncaught browser JavaScript errors');
    console.log('PREMISES_VISUAL_PASS '+label+' '+JSON.stringify({
      ...metrics,openingCash:opening.cash,afterUpgradeCash:expanded.cash,
      capacity:reloaded.capacity,staff:reloaded.staff.length
    }));
    await context.close();
  }

  // Operational continuity gate: all days of the actual first partial month
  // (November 9–30 = game days 1–22) and all five Deal Day sessions.
  const ctx=await browser.newContext({
    viewport:{width:1440,height:900},deviceScaleFactor:1
  });
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await openGame(page,'Full 30-Day Playtest');
  await go(page,'events');
  await page.locator('[data-action="hold-meeting"][data-focus="buying"]').click();
  let state=await stored(page);
  assert.equal(state.meetingHeldMonth,1);
  const purchases=await page.evaluate(key=>{
    const E=window.MotorTradeEngine;
    const s=JSON.parse(localStorage.getItem(key));
    const sellers=E.marketFor(s).sellers.slice(0,2);
    if(sellers.length!==2)throw Error('Opening market did not supply two leads');
    for(const x of sellers){
      const result=E.acquireSeller(s,x.id,x.ask);
      if(!result.ok)throw Error('Legitimate seller acquisition failed: '+result.message);
    }
    const assessed=E.assessStock(s,s.vehicles[0].id);
    if(!assessed.ok)throw Error('First car assessment: '+assessed.message);
    const booked=E.startPrep(s,s.vehicles[0].id,'external');
    if(!booked.ok)throw Error('External garage booking: '+booked.message);
    if(!E.normalize(JSON.parse(JSON.stringify(s))))
      throw Error('Purchase and preparation career invalid');
    localStorage.setItem(key,JSON.stringify(s));
    return {cash:s.cash,stock:s.vehicles.length,ledger:s.ledger.length,
      cars:s.vehicles.map(x=>x.title),reserved:E.workshop.reserved(s)};
  },KEY);
  assert.equal(purchases.stock,2);
  assert.ok(purchases.cash<45000);
  assert.ok(purchases.reserved>=0);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#menu-continue').click();
  const actualMonthEnd=state.monthPlan.endDay;
  assert.equal(actualMonthEnd,22,'Calendar-mapped November 30 is game day 22');
  for(let day=2;day<=actualMonthEnd;day++){
    await page.locator('#continue-day').click();
    state=await stored(page);
    assert.equal(state.day,day,'Game should advance exactly one day');
    assert.equal(state.staff.length,4,'Employees remain on the real payroll');
    assert.equal(state.payrollArrears,0,'No wage arrears during stress case');
    assert.equal(state.premises.arrears,0,'No rent arrears during stress case');
    assert.equal(state.vehicles.length,2,'Unsold vehicles remain recorded');
    const valid=await page.evaluate(key=>{
      const E=window.MotorTradeEngine,s=JSON.parse(localStorage.getItem(key));
      const r=E.normalize(s),m=E.monthly.statement(s);
      return {valid:!!r,opening:m.openingCash,income:m.cashIn,
        outgo:m.cashOut,bank:s.cash,operating:m.operatingContribution};
    },KEY);
    assert.ok(valid.valid,'Saved career must validate at Day '+day);
    assert.equal(valid.opening+valid.income-valid.outgo,valid.bank,
      'Ledger reconciles at Day '+day);
    if(day===14||day===actualMonthEnd){
      console.log('PREMISES_MONTH_CHECK '+JSON.stringify({
        day,bank:valid.bank,operating:valid.operating,
        stock:state.vehicles.length,staff:state.staff.length
      }));
    }
  }
  const lastDayCash=state.cash,ledgerBefore=state.ledger.length;
  for(let phase=1;phase<=4;phase++){
    await page.locator('#continue-day').click();
    state=await stored(page);
    assert.equal(state.day,actualMonthEnd,'Deal Day session does not advance days');
    assert.equal(state.deadlineSession,phase);
    assert.equal(state.cash,lastDayCash,'Deal Day session does not charge wages');
    assert.equal(state.ledger.length,ledgerBefore);
  }
  await page.locator('#continue-day').click();
  state=await stored(page);
  assert.equal(state.day,23);
  assert.equal(state.monthlyReports.length,1);
  assert.equal(state.monthPlan.month,2);
  assert.equal(state.staff.length,4);
  assert.equal(state.vehicles.length,2);
  assert.equal(state.monthlyReports[0].closingCash,lastDayCash);
  assert.equal(state.monthlyReports[0].soldUnits,0);
  assert.equal(state.monthlyReports[0].targetUnits,state.monthPlan.unitTarget,
    'Archived first-month target should be consistent with the career plan');
  const frozen=JSON.stringify(state.monthlyReports[0]);
  await go(page,'business');
  await page.screenshot({path:'review/premises-month23-desktop.png',fullPage:true});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#menu-continue').click();
  const restored=await stored(page);
  assert.equal(JSON.stringify(restored.monthlyReports[0]),frozen);
  assert.equal(restored.cash,state.cash);
  assert.equal(restored.vehicles.length,2);
  assert.deepEqual(errors,[]);
  console.log('PREMISES_FULL_MONTH_PASS '+JSON.stringify({
    purchaseCash:purchases.cash,monthEndCash:lastDayCash,
    nextMonthCash:state.cash,
    month1Operating:state.monthlyReports[0].operatingContribution,
    openingTeam:restored.staff.map(x=>x.name),
    cars:restored.vehicles.map(x=>x.title),
    month1Sales:restored.monthlyReports[0].soldUnits,
    month1Target:restored.monthlyReports[0].targetUnits,
    cashReconciles:true,careerReloads:true
  }));
  await ctx.close();
}catch(error){
  console.error('PREMISES_VISUAL_FAIL',error);
  process.exitCode=1;
}finally{
  await browser.close();
}
