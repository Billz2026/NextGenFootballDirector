import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const KEY='the-motor-trade-career-v1';
const browser=await chromium.launch({headless:true});
mkdirSync('review',{recursive:true});
try{
  for(const [label,width,height] of [['desktop',1440,900],['phone',390,844]]){
    const context=await browser.newContext({viewport:{width,height},
      deviceScaleFactor:1,hasTouch:width<600});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    // Generate a valid, fully costed retail-ready vehicle using the real engine.
    // No hand-written fake financial, employment, stock or customer save fields.
    const fixture=await page.evaluate(key=>{
      const E=window.MotorTradeEngine;
      const state=E.createStaffed('Retail Layout Review',[]);
      const seller=E.marketFor(state).sellers[0];
      const must=(out,step)=>{if(!out?.ok)throw Error(step+': '+JSON.stringify(out))};
      must(E.acquireSeller(state,seller.id,seller.ask),'buy');
      const v=state.vehicles[0];
      must(E.assessStock(state,v.id),'workshop assessment');
      must(E.startPrep(state,v.id,'external'),'workshop booking');
      const progress=()=>{
        E.showroom.closeWaiting(state,'Unserved visitors left at closing');
        if(state.day===state.monthPlan.endDay){
          if(!E.monthly.close(state))throw Error('Unable to close real trading month');
          state.day++;
          E.rollAuctionHall(state);
          E.monthly.next(state);
        }else{
          state.day++;
          E.rollAuctionHall(state);
        }
        E.staffDay(state);
        E.premisesDay(state);
        E.stockAgeingDay(state);
        E.advanceWorkshop(state);
        E.advanceCustomers(state);
        E.advanceAfterSales(state);
      };
      while(state.day<35&&v.status!=='prepared'){
        progress();
        if(v.workshop.stage==='quality-check')
          must(E.finishPrep(state,v.id),'workshop final QC');
      }
      if(v.status!=='prepared')throw Error('Vehicle preparation did not finish');
      must(E.advertise(state,v.id,v.retail),'list for retail');
      while(state.day<35&&!E.customers.demand(state,v))progress();
      const available=E.customers.demand(state,v);
      if(available)must(E.openCustomer(state,v.id),'open retail enquiry');
      if(!E.normalize(JSON.parse(JSON.stringify(state))))
        throw Error('Engine rejected genuinely acquired and prepared career');
      localStorage.setItem(key,JSON.stringify(state));
      return {day:state.day,vehicleCount:state.vehicles.length,
        status:v.status,hasEnquiry:available,cash:state.cash,
        staffCount:state.staff.length};
    },KEY);
    assert.equal(fixture.staffCount,4);
    assert.equal(fixture.vehicleCount,1);
    assert.equal(fixture.status,'listed');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    await page.locator('#screen-career').waitFor({state:'visible'});
    await page.locator('.career-nav [data-page="sales"]').evaluate(x=>x.click());
    const panel=page.locator('.sales-control');
    await panel.waitFor({state:'visible'});
    assert.equal((await panel.locator('h1').innerText()).replace(/\s+/g,' ').trim(),'RETAIL PIPELINE.');
    assert.equal(await panel.locator('.so-kpis>div').count(),4,
      'Retail KPIs include advertised stock, on-site visitors, actions and held deposits');
    assert.equal(await panel.locator('.so-activity').evaluate(x=>x.open),false);
    assert.equal(await panel.locator('.so-register .so-unit').count(),1);
    assert.equal(await panel.locator('.so-quick-price').count(),1);
    assert.equal(await panel.locator('.so-file .so-status').count(),1);
    assert.equal(await panel.locator('.so-file .so-flow span').count(),5);
    assert.equal(await panel.locator('.so-history').count(),0);
    const metrics=await page.evaluate(()=>{
      document.documentElement.style.scrollBehavior='auto';
      window.scrollTo({top:0,behavior:'instant'});
      const panel=document.querySelector('.sales-control');
      const rect=s=>panel.querySelector(s).getBoundingClientRect();
      const row=panel.querySelector('.so-register-list'),file=panel.querySelector('.so-file');
      const action=panel.querySelector('.so-customer .trade-button');
      return {viewportWidth:innerWidth,scrollY:Math.round(scrollY),
        documentWidth:document.documentElement.scrollWidth,
        panelWidth:panel.scrollWidth,panelClientWidth:panel.clientWidth,
        fileWidth:file.scrollWidth,fileClientWidth:file.clientWidth,
        headingCount:panel.querySelectorAll('h1').length,
        fileTop:Math.round(rect('.so-file').top),
        queueBottom:Math.round(rect('.so-visitor-desk').bottom),
        customerTop:Math.round(rect('.so-customer').top),
        carTop:Math.round(rect('.so-car').top),
        actionTop:Math.round(action?.getBoundingClientRect().top??-1),
        registerScrollWidth:row.scrollWidth,registerClientWidth:row.clientWidth,
        customerStatus:panel.querySelector('.so-file-head-position')?.innerText};
    });
    assert.equal(metrics.headingCount,1);
    assert.ok(metrics.documentWidth<=width+1,'Full page overflow: '+JSON.stringify(metrics));
    assert.ok(metrics.panelWidth<=metrics.panelClientWidth+1,'Sales panel overflow');
    assert.ok(metrics.fileWidth<=metrics.fileClientWidth+1,'Selected case overflow');
    assert.ok(metrics.actionTop>=0,'Main customer action must remain present');
    // Live showroom footfall is now a real, variable-height queue before
    // the selected case. Judge proximity to that section, not an obsolete
    // absolute top-of-page pixel number that assumes the queue is missing.
    assert.ok(metrics.fileTop>=metrics.queueBottom-2,
      'Retail file should follow the live showroom queue '+JSON.stringify(metrics));
    assert.ok(metrics.fileTop-metrics.queueBottom<360,
      'Selected case must follow the visitor desk without wasted space '+JSON.stringify(metrics));
    if(label==='desktop'){
      assert.ok(metrics.actionTop-metrics.fileTop<600,
        'Main customer action should appear inside the selected case '+JSON.stringify(metrics));
      assert.ok(Math.abs(metrics.customerTop-metrics.carTop)<=3,
        'Vehicle and customer case should share a horizontal row on desktop');
    }else{
      assert.ok(metrics.customerTop<metrics.carTop,
        'Phone must show customer actions before full vehicle details');
      assert.ok(metrics.actionTop-metrics.customerTop<580,
        'Phone customer action should be accessible after the queue '+JSON.stringify(metrics));
    }
    await page.screenshot({path:'review/sales-office-'+label+'.png',fullPage:true});
    // Filters and case selection only change presentation, not customer cash.
    const before=await page.evaluate(key=>localStorage.getItem(key),KEY);
    await panel.locator('[data-action="filter-sales"][data-filter="action"]').click();
    await panel.locator('[data-action="filter-sales"][data-filter="all"]').click();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),before);
    await panel.locator('.so-activity summary').click();
    assert.equal(await panel.locator('.so-activity').evaluate(x=>x.open),true);
    assert.deepEqual(errors,[],'No uncaught browser errors');
    console.log('SALES_VISUAL_PASS '+label+' '+JSON.stringify({fixture,...metrics}));
    await context.close();
  }
}catch(err){
  console.error('SALES_VISUAL_FAIL',err);
  process.exitCode=1;
}finally{
  await browser.close();
}
