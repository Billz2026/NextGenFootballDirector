import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const KEY='the-motor-trade-career-v1';
const browser=await chromium.launch({headless:true});
mkdirSync('review',{recursive:true});
try{
  for(const [label,width,height] of [['desktop',1440,900],['phone',390,844]]){
    const ctx=await browser.newContext({
      viewport:{width,height},deviceScaleFactor:1,hasTouch:width<600
    });
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',dialog=>dialog.accept());
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    const fixture=await page.evaluate(key=>{
      const E=window.MotorTradeEngine,A=E.aftersales;
      const s=E.createStaffed('Aftersales Browser Fixture',[]);
      s.sold.push({id:1,title:'2017 Customer Vehicle',day:1,mode:'cash',
        price:9000,profit:1200,origin:'S-1-1',profile:null,
        afterSalesQcCover:0,afterSalesTechReliability:8});
      s.sales=1;s.nextId=2;
      for(let i=1;i<=2000;i++){
        s.name='Aftercare Visual '+i;
        if(A.schedule(s,s.sold[0]).willClaim)break;
      }
      if(!A.schedule(s,s.sold[0]).willClaim)throw Error('No deterministic case');
      const due=A.schedule(s,s.sold[0]).dueDay;
      while(s.day<due){
        s.day++;E.rollAuctionHall(s);
        E.staffDay(s);E.premisesDay(s);E.stockAgeingDay(s);
        E.advanceWorkshop(s);E.advanceCustomers(s);E.advanceAfterSales(s);
      }
      if(s.afterSalesCases.length!==1)throw Error('Complaint did not open');
      if(!E.normalize(JSON.parse(JSON.stringify(s))))
        throw Error('Real save validator rejected newly opened complaint');
      localStorage.setItem(key,JSON.stringify(s));
      return {due,cash:s.cash,quote:s.afterSalesCases[0].quote,
        claim:s.afterSalesCases[0].id,day:s.day};
    },KEY);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    await page.locator('.career-nav [data-page="sales"]').evaluate(x=>x.click());
    const panel=page.locator('.sales-control'),desk=page.locator('.ac-desk');
    await desk.waitFor({state:'visible'});
    assert.equal(await panel.locator('h1').innerText().then(x=>x.replace(/\s+/g,' ').trim()),
      'RETAIL PIPELINE.');
    assert.equal(await desk.locator('.ac-case').count(),1);
    assert.match(await desk.innerText(),/CUSTOMER CARE/);
    assert.match(await desk.innerText(),/OWNER ACTION REQUIRED/);
    assert.match(await desk.innerText(),/ESTIMATED REPAIR EXPOSURE/);
    const dimensions=await page.evaluate(()=>{
      const panel=document.querySelector('.sales-control');
      const desk=document.querySelector('.ac-desk');
      return {windowWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,
        panelWidth:panel.scrollWidth,panelClientWidth:panel.clientWidth,
        deskWidth:desk.scrollWidth,deskClientWidth:desk.clientWidth};
    });
    assert.ok(dimensions.documentWidth<=width+1,
      'Aftersales document overflow '+JSON.stringify(dimensions));
    assert.ok(dimensions.panelWidth<=dimensions.panelClientWidth+1,
      'Aftersales sales panel overflow');
    assert.ok(dimensions.deskWidth<=dimensions.deskClientWidth+1,
      'Aftersales case overflow');
    await page.screenshot({path:'review/aftersales-'+label+'.png',fullPage:true});
    const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    assert.equal(before.cash,fixture.cash);
    await desk.locator('[data-action="aftersales-inspect"]').click();
    const inspected=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    assert.equal(inspected.cash,before.cash-60,'diagnosis must charge exactly £60');
    assert.equal(inspected.afterSalesCases[0].status,'inspection');
    assert.equal(await desk.locator('[data-action="aftersales-inspect"]').count(),0);
    assert.match(await desk.innerText(),/DIAGNOSIS BOOKED/);
    for(let i=0;i<2;i++)await page.locator('#continue-day').click();
    const diagnosed=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    assert.equal(diagnosed.afterSalesCases[0].status,'open');
    assert.equal(diagnosed.afterSalesCases[0].inspectionPaid,60);
    await desk.locator('[data-action="aftersales-rectify"]').click();
    const repaired=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
    const c=repaired.afterSalesCases[0];
    assert.equal(c.status,'resolved');
    assert.equal(c.paid,c.quote);
    assert.equal(repaired.cash,diagnosed.cash-c.quote);
    assert.equal(repaired.ledger.filter(x=>
      x.note.startsWith('Aftersales customer rectification:')).length,1);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    const savedValid=await page.evaluate(k=>{
      const state=JSON.parse(localStorage.getItem(k));
      return !!window.MotorTradeEngine.normalize(state);
    },KEY);
    assert.equal(savedValid,true,'career with repaired case must round-trip');
    assert.deepEqual(errors,[],'No browser JavaScript errors');
    console.log('AFTERSALES_VISUAL_PASS '+label+' '+JSON.stringify({fixture,dimensions,
      inspection:60,repair:c.quote}));
    await ctx.close();
  }
}catch(err){
  console.error('AFTERSALES_VISUAL_FAIL',err);
  process.exitCode=1;
}finally{
  await browser.close();
}
