import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const key='the-motor-trade-career-v1';
const browser=await chromium.launch({headless:true});
mkdirSync('review',{recursive:true});
try{
  for(const [name,width,height] of [['desktop',1440,900],['phone',390,844]]){
    const context=await browser.newContext({viewport:{width,height},
      deviceScaleFactor:1,hasTouch:width<600});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    page.on('dialog',dialog=>dialog.accept());
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#menu-new-career').click();
    await page.locator('#dealership-name').fill('Stock Visual QA');
    await page.locator('.setup-submit').click();
    await page.locator('#screen-career').waitFor({state:'visible'});
    await page.locator('.career-nav [data-page="stock"]').evaluate(n=>n.click());
    const panel=page.locator('.stock-page-control');
    await panel.waitFor({state:'visible'});
    assert.match(await panel.innerText(),/YOUR FORECOURT IS EMPTY/);
    assert.equal(await panel.locator('.stock-kpi').count(),3);
    await page.locator('.career-nav [data-page="auctions"]').evaluate(n=>n.click());
    const sellers=await page.evaluate(k=>{
      const s=JSON.parse(localStorage.getItem(k));
      return window.MotorTradeEngine.marketFor(s).sellers.map(x=>({id:x.id,ask:x.ask}));
    },key);
    assert.ok(sellers.length>=2);
    for(const seller of sellers.slice(0,2)){
      // Selecting a new seller is explicit: the Buying Desk never silently
      // changes its selected lead after a successful purchase.
      await page.locator('[data-action="select-seller"][data-id="'+seller.id+'"]').click();
      await page.locator('#seller-offer-'+seller.id).fill(String(seller.ask));
      await page.locator('[data-action="buy-seller"][data-id="'+seller.id+'"]').click();
    }
    const acquired=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
    assert.equal(acquired.staff.length,4);
    assert.equal(acquired.startingCapital,45000);
    assert.equal(acquired.vehicles.length,2);
    await page.locator('.career-nav [data-page="stock"]').evaluate(n=>n.click());
    await panel.waitFor({state:'visible'});
    await page.evaluate(()=>{
      document.scrollingElement?.scrollTo(0,0);
      window.scrollTo(0,0);
    });
    assert.equal((await panel.locator('h1').allInnerTexts()).length,1);
    assert.equal((await panel.locator('h1').innerText()).replace(/\s+/g,' ').trim(),'INVENTORY CONTROL.');
    assert.equal(await panel.locator('.stock-kpi').count(),3);
    assert.equal(await panel.locator('[data-action="select-stock"]').count(),2);
    assert.equal(await panel.locator('.stock-cost-details').evaluate(x=>x.open),false);
    assert.equal(await panel.locator('.stock-disclosure').evaluate(x=>x.open),false);
    assert.equal(await panel.locator('.stock-finance-summary').count(),1);
    assert.equal(await panel.locator('.stock-action-box [data-page="workshop"]').count(),1);
    const metrics=await page.evaluate(()=>{
      document.documentElement.style.scrollBehavior='auto';
      document.body.style.scrollBehavior='auto';
      window.scrollTo({top:0,behavior:'instant'});
      const p=document.querySelector('.stock-page-control');
      const rect=s=>p.querySelector(s).getBoundingClientRect();
      const lst=p.querySelector('.stock-register-list'),dos=p.querySelector('.stock-dossier');
      const action=p.querySelector('.stock-action-box');
      const details=p.querySelector('.stock-cost-details');
      return {
        viewportWidth:innerWidth,
        windowScrollY:Math.round(scrollY),
        documentWidth:document.documentElement.scrollWidth,
        panelWidth:p.scrollWidth,panelClientWidth:p.clientWidth,
        dossierWidth:dos.scrollWidth,dossierClientWidth:dos.clientWidth,
        headings:p.querySelectorAll('h1').length,
        registerTop:Math.round(rect('.stock-register').top),
        dossierTop:Math.round(rect('.stock-dossier').top),
        summaryTop:Math.round(rect('.stock-finance-summary').top),
        actionTop:Math.round(action.getBoundingClientRect().top),
        actionBottom:Math.round(action.getBoundingClientRect().bottom),
        costBreakdownTop:Math.round(details.getBoundingClientRect().top),
        vehicleFileTop:Math.round(rect('.stock-dossier-vehicle').top),
        listWidth:lst.scrollWidth,listClientWidth:lst.clientWidth
      };
    });
    assert.ok(metrics.documentWidth<=width+1,
      name+': page should not overflow '+JSON.stringify(metrics));
    assert.ok(metrics.panelWidth<=metrics.panelClientWidth+1,
      name+': stock panel should not overflow');
    assert.ok(metrics.dossierWidth<=metrics.dossierClientWidth+1,
      name+': vehicle dossier should not overflow');
    assert.ok(metrics.actionTop<metrics.costBreakdownTop,
      'Financial details must follow the actual next action');
    if(name==='desktop'){
      assert.ok(metrics.dossierTop<450,'Selected inventory file must start above fold');
      assert.ok(metrics.summaryTop<800,'Unit financial summary must be visible');
    }else{
      assert.ok(metrics.listWidth>metrics.listClientWidth,
        'The mobile register should swipe horizontally, not stretch the whole page');
      assert.ok(metrics.summaryTop<metrics.vehicleFileTop,
        'Mobile action-first layout precedes the full vehicle report');
      assert.ok(metrics.actionTop<metrics.vehicleFileTop,
        'Next workshop/pricing action appears before the long vehicle file');
      assert.ok(metrics.actionTop<900,
        'On a phone the next action must not begin far below the first screen');
    }
    await page.screenshot({path:'review/vehicle-stock-'+name+'.png',fullPage:true});
    const cash=acquired.cash;
    await panel.locator('[data-action="select-stock"]').nth(1).click();
    const selected=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
    assert.equal(selected.cash,cash,'Selecting stock must not move cash');
    assert.equal(selected.staff.length,4,'Selecting stock must not affect team');
    await panel.locator('.stock-cost-details summary').click();
    assert.equal(await panel.locator('.stock-cost-details').evaluate(x=>x.open),true);
    assert.deepEqual(errors,[],'No browser JavaScript errors');
    console.log('STOCK_VISUAL_PASS '+name+' '+JSON.stringify(metrics));
    await context.close();
  }
}catch(err){
  console.error('STOCK_VISUAL_FAIL',err);
  process.exitCode=1;
}finally{
  await browser.close();
}
