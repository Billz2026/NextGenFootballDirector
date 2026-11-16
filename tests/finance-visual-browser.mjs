import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const KEY='the-motor-trade-career-v1';
const browser=await chromium.launch({headless:true});
mkdirSync('review',{recursive:true});
try{
  for(const [label,width,height] of [['desktop',1440,900],['phone',390,844]]){
    const context=await browser.newContext({
      viewport:{width,height},deviceScaleFactor:1,hasTouch:width<600
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    const fixture=await page.evaluate(key=>{
      const E=window.MotorTradeEngine;
      const F=window.MotorTradeFinanceView;
      const state=E.createStaffed('Finance Desk Browser QA',[]);
      const seller=E.marketFor(state).sellers[0];
      const bought=E.acquireSeller(state,seller.id,seller.ask);
      if(!bought.ok)throw Error('Purchase failed: '+bought.message);
      const assessed=E.assessStock(state,state.vehicles[0].id);
      if(!assessed.ok)throw Error('Assessment failed: '+assessed.message);
      state.day=2;
      E.staffDay(state);
      E.premisesDay(state);
      const snap=F.snapshot(state,E);
      if(!snap.cashReconciles)throw Error('Cash reconciliation failed');
      if(!E.normalize(JSON.parse(JSON.stringify(state))))
        throw Error('A legitimate ledger and payroll state failed save validation');
      localStorage.setItem(key,JSON.stringify(state));
      return {cash:state.cash,staff:state.staff.length,
        opening:state.startingCapital,stock:state.vehicles.length,
        ledger:state.ledger.length,afterReserve:snap.afterReserve,
        operating:snap.report.operatingContribution};
    },KEY);
    assert.equal(fixture.staff,4);
    assert.equal(fixture.opening,45000);
    assert.equal(fixture.stock,1);
    assert.ok(fixture.ledger>=3);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    await page.locator('#screen-career').waitFor({state:'visible'});
    await page.locator('.career-nav [data-page="finance"]').evaluate(n=>n.click());
    const panel=page.locator('.finance-control');
    await panel.waitFor({state:'visible'});
    assert.equal((await panel.locator('h1').innerText()).replace(/\s+/g,' ').trim(),
      'FINANCIAL CONTROL.');
    assert.equal(await panel.locator('.fin-primary>.fin-tile').count(),4);
    assert.equal(await panel.locator('.fin-flow>div').count(),4);
    assert.equal(await panel.locator('.fin-secondary>.fin-panel').count(),2);
    assert.equal(await panel.locator('.fin-ledger-filters button').count(),4);
    assert.equal(await panel.locator('.fin-disclosure').evaluate(x=>x.open),false);
    assert.match(await panel.locator('.fin-primary').innerText(),/CASH BALANCE/);
    assert.match(await panel.locator('.fin-primary').innerText(),/CASH AFTER REPAIR RESERVES/);
    assert.match(await panel.locator('.fin-primary').innerText(),/MONTH OPERATING CONTRIBUTION/);
    assert.match(await panel.locator('.fin-secondary').innerText(),/Customer deposits held separately/);
    const metrics=await page.evaluate(()=>{
      document.documentElement.style.scrollBehavior='auto';
      window.scrollTo({top:0,behavior:'instant'});
      const p=document.querySelector('.finance-control'),rect=x=>p.querySelector(x).getBoundingClientRect();
      const ledger=p.querySelector('.fin-ledger-section');
      return {
        viewportWidth:innerWidth,windowScrollY:Math.round(scrollY),
        documentWidth:document.documentElement.scrollWidth,
        panelWidth:p.scrollWidth,panelClientWidth:p.clientWidth,
        ledgerWidth:ledger.scrollWidth,ledgerClientWidth:ledger.clientWidth,
        headingCount:p.querySelectorAll('h1').length,
        kpisBottom:Math.round(rect('.fin-primary').bottom),
        flowTop:Math.round(rect('.fin-cashflow').top),
        flowBottom:Math.round(rect('.fin-cashflow').bottom),
        commitmentsTop:Math.round(rect('.fin-secondary').top),
        ledgerTop:Math.round(rect('.fin-ledger-section').top),
        firstTransactionTop:Math.round(rect('.fin-entry').top)
      };
    });
    assert.equal(metrics.headingCount,1);
    assert.ok(metrics.documentWidth<=width+1,
      label+': document horizontal overflow '+JSON.stringify(metrics));
    assert.ok(metrics.panelWidth<=metrics.panelClientWidth+1,
      label+': finance panel horizontal overflow');
    assert.ok(metrics.ledgerWidth<=metrics.ledgerClientWidth+1,
      label+': finance ledger horizontal overflow');
    assert.ok(metrics.flowTop>metrics.kpisBottom-2,'Cash reconciliation follows the four key balances');
    assert.ok(metrics.commitmentsTop>metrics.flowBottom-2,'Obligations and performance follow cash movement');
    if(label==='desktop'){
      assert.ok(metrics.flowTop<300,'Cashflow should be visible near top at 100% zoom');
      assert.ok(metrics.ledgerTop<900,'Transaction history should begin on desktop first screen');
    }else{
      assert.ok(metrics.flowTop<450,'Mobile cashflow follows compact balances without deep scrolling');
    }
    await page.screenshot({path:'review/finance-'+label+'.png',fullPage:true});
    const savedBefore=await page.evaluate(key=>localStorage.getItem(key),KEY);
    await panel.locator('[data-action="filter-ledger"][data-filter="out"]').click();
    assert.ok(await panel.locator('.fin-entry').count()>=1);
    await panel.locator('[data-action="filter-ledger"][data-filter="in"]').click();
    await panel.locator('[data-action="filter-ledger"][data-filter="noncash"]').click();
    await panel.locator('[data-action="filter-ledger"][data-filter="all"]').click();
    await panel.locator('.fin-disclosure summary').click();
    assert.equal(await panel.locator('.fin-disclosure').evaluate(x=>x.open),true);
    assert.match(await panel.locator('.fin-disclosure').innerText(),/not statutory net profit/);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),savedBefore,
      'Filtering and reading financial details must not mutate career financials');
    assert.deepEqual(errors,[],'No uncaught browser JavaScript errors');
    console.log('FINANCE_VISUAL_PASS '+label+' '+JSON.stringify({fixture,...metrics}));
    await context.close();
  }
}catch(error){
  console.error('FINANCE_VISUAL_FAIL',error);
  process.exitCode=1;
}finally{
  await browser.close();
}
