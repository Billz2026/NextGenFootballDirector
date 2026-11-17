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
      const s=E.createStaffed('Workshop Visual Review',[]);
      const sellers=E.marketFor(s).sellers.slice(0,2);
      if(sellers.length<2)throw Error('Two real market leads required');
      for(const seller of sellers){
        const result=E.acquireSeller(s,seller.id,seller.ask);
        if(!result.ok)throw Error('Actual acquisition failed: '+result.message);
      }
      if(!E.normalize(JSON.parse(JSON.stringify(s))))
        throw Error('Two-car career did not pass canonical save validation');
      localStorage.setItem(key,JSON.stringify(s));
      return {day:s.day,staff:s.staff.length,cash:s.cash,
        stock:s.vehicles.length,startingCapital:s.startingCapital};
    },KEY);
    assert.equal(fixture.stock,2);
    assert.equal(fixture.staff,4);
    assert.equal(fixture.startingCapital,45000);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    await page.locator('#screen-career').waitFor({state:'visible'});
    await page.locator('.career-nav [data-page="workshop"]').evaluate(x=>x.click());
    const panel=page.locator('.workshop-page-control');
    await panel.waitFor({state:'visible'});
    assert.equal((await panel.locator('h1').innerText()).replace(/\s+/g,' ').trim(),
      'PREPARATION CONTROL.');
    assert.equal(await panel.locator('.ws-kpis>div').count(),3);
    assert.equal(await panel.locator('.ws-capacity>span').count(),5);
    assert.equal(await panel.locator('.ws-unit').count(),2);
    assert.equal(await panel.locator('.ws-steps span').count(),5);
    assert.equal(await panel.locator('[data-action="assess-workshop"]').count(),1);
    assert.equal(await panel.locator('.ws-finance-details').evaluate(x=>x.open),false);
    assert.equal(await panel.locator('.ws-quick-cost').count(),1);
    const metrics=await page.evaluate(()=>{
      document.documentElement.style.scrollBehavior='auto';
      window.scrollTo({top:0,behavior:'instant'});
      const p=document.querySelector('.workshop-page-control');
      const list=p.querySelector('.ws-register-list');
      const file=p.querySelector('.ws-file');
      const r=x=>p.querySelector(x)?.getBoundingClientRect();
      return {viewport:innerWidth,scrollY:Math.round(scrollY),
        documentWidth:document.documentElement.scrollWidth,
        panelWidth:p.scrollWidth,panelClientWidth:p.clientWidth,
        fileWidth:file.scrollWidth,fileClientWidth:file.clientWidth,
        headingCount:p.querySelectorAll('h1').length,
        fileTop:Math.round(r('.ws-file').top),
        actionTop:Math.round(r('.ws-action').top),
        primaryButtonTop:Math.round(r('[data-action="assess-workshop"]').top),
        repairDetailsTop:Math.round(r('.ws-detail-car').top),
        costTop:Math.round(r('.ws-finance-details').top),
        listWidth:list.scrollWidth,listClientWidth:list.clientWidth
      };
    });
    assert.equal(metrics.headingCount,1);
    assert.ok(metrics.documentWidth<=width+1,
      label+': document horizontal overflow '+JSON.stringify(metrics));
    assert.ok(metrics.panelWidth<=metrics.panelClientWidth+1,
      label+': workshop panel horizontal overflow');
    assert.ok(metrics.fileWidth<=metrics.fileClientWidth+1,
      label+': selected work order horizontal overflow');
    assert.ok(metrics.actionTop<metrics.costTop,
      'Repair decision should precede optional accounting breakdown');
    if(label==='desktop'){
      assert.ok(metrics.fileTop<440,'Desktop selected work order should start high');
      assert.ok(metrics.primaryButtonTop<800,'Desktop assessment button should be easily visible');
      assert.ok(Math.abs(metrics.actionTop-metrics.repairDetailsTop)<20,
        'On desktop repair requirements and actions should align in two columns');
    }else{
      assert.ok(metrics.listWidth>metrics.listClientWidth,
        'Phone job register must scroll sideways without widening page');
      assert.ok(metrics.actionTop<metrics.repairDetailsTop,
        'Phone repair action should precede the long vehicle report');
      assert.ok(metrics.primaryButtonTop<860,
        'Phone assessment button must be accessible near the first screen');
    }
    await page.screenshot({path:'review/workshop-'+label+'.png',fullPage:true});
    const initial=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    await panel.locator('.ws-finance-details summary').click();
    assert.equal(await panel.locator('.ws-finance-details').evaluate(x=>x.open),true);
    assert.match(await panel.locator('.ws-finance-details').innerText(),
      /DIAGNOSED REPAIR REQUIREMENT/);
    await panel.locator('.ws-finance-details summary').click();
    await panel.locator('[data-action="assess-workshop"]').click();
    const assessed=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    assert.ok(assessed.cash<initial.cash,'Authorising assessment must charge real cash');
    assert.equal(assessed.staff.length,4);
    assert.equal(assessed.vehicles[0].workshop.stage,'quoted');
    assert.equal(await panel.locator('[data-action="start-workshop"]').count(),2);
    assert.equal(await panel.locator('[data-method="external"]').count(),1);
    assert.equal(await panel.locator('[data-method="internal"]').count(),1);
    assert.equal(await panel.locator('[data-action="choose-workshop-tech"]').count(),1,
      'opening technician should be selectable as lead');
    await page.screenshot({path:'review/workshop-quotes-'+label+'.png',fullPage:true});
    // Switch selected work order without financial mutation, preserving
    // all real state and previous assessment charges.
    const before=await page.evaluate(key=>localStorage.getItem(key),KEY);
    await panel.locator('[data-action="select-workshop"]').nth(1).click();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),before);
    await panel.locator('[data-action="filter-workshop"][data-filter="action"]').click();
    await panel.locator('[data-action="filter-workshop"][data-filter="all"]').click();
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),before);
    await panel.locator('[data-action="select-workshop"]').first().click();
    await panel.locator('[data-action="priority-workshop"][data-priority="urgent"]').click();
    const prioritised=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    assert.equal(prioritised.vehicles[0].workshop.priority,'urgent');
    await panel.locator('[data-action="start-workshop"][data-method="internal"]').click();
    const booked=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    assert.equal(booked.vehicles[0].workshop.method,'internal');
    assert.equal(booked.vehicles[0].workshop.priority,'urgent');
    assert.equal(booked.vehicles[0].workshop.technicianId,booked.staff.find(x=>x.role==='technician').id);
    assert.equal(await panel.locator('.ws-dispatch-assignments').count(),1);
    assert.equal(await panel.locator('[data-action="priority-workshop"]').count(),2);
    assert.ok(await page.evaluate(key=>!!window.MotorTradeEngine.normalize(JSON.parse(localStorage.getItem(key))),KEY));
    assert.deepEqual(errors,[],'No browser JavaScript errors');
    console.log('WORKSHOP_VISUAL_PASS '+label+' '+JSON.stringify({fixture,...metrics}));
    await context.close();
  }
}catch(error){
  console.error('WORKSHOP_VISUAL_FAIL',error);
  process.exitCode=1;
}finally{
  await browser.close();
}
