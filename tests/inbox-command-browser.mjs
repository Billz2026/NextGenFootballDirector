import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const KEY='the-motor-trade-career-v1';
const browser=await chromium.launch({headless:true});
mkdirSync('review',{recursive:true});
try{
  for(const [device,width,height] of [
    ['desktop-100-percent',1400,750],
    ['desktop-wide',1692,900],
    ['phone',390,844]
  ]){
    const ctx=await browser.newContext({viewport:{width,height},
      deviceScaleFactor:1,hasTouch:width<600});
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    const fixture=await page.evaluate(key=>{
      const E=window.MotorTradeEngine,D=window.MotorTradeDelegation,
        IN=window.MotorTradeInbox;
      const s=E.createStaffed('Owner Approval QA',[]);
      s.cash+=500000;s.ledger.push({day:s.day,delta:500000,
        note:'Verified test owner equity'});
      function must(result,stage){
        if(!result?.ok)throw Error(stage+' '+JSON.stringify(result));
      }
      const closeDay=()=>{
        const final=s.day===s.monthPlan.endDay;
        if(final){window.MotorTradeGroup.closeMonth(s);E.monthly.close(s);}
        E.showroom.closeWaiting(s,'Closing without service');
        s.day++;E.rollAuctionHall(s);s.deadlineSession=0;
        if(final)E.monthly.next(s);
        E.staffDay(s);E.premisesDay(s);E.stockAgeingDay(s);
        E.advanceWorkshop(s);E.advanceCustomers(s);
        E.advanceAfterSales(s);window.MotorTradeGroup.advance(s);
      };
      const seller=E.marketFor(s).sellers[0];
      must(E.acquireSeller(s,seller.id,seller.ask),'purchase');
      const v=s.vehicles[0];
      must(E.assessStock(s,v.id),'assessment');
      must(E.startPrep(s,v.id,'internal'),'repair');
      for(let i=0;i<25&&v.status==='acquired';i++){
        if(v.workshop.stage==='quality-check')
          must(E.finishPrep(s,v.id),'quality control');
        else closeDay();
      }
      if(v.status!=='prepared')throw Error('No workshop prepared car');
      must(E.advertise(s,v.id,v.profile.likelySale+125),'advertise');
      s.delegation.maxDiscount=0;s.delegation.minGross=5000;
      for(let i=0;i<25&&!D.pending(s).length;i++){
        D.process(s,E);
        if(!D.pending(s).length)closeDay();
      }
      const [request]=D.pending(s);
      if(!request)throw Error('No live supervisor approval');
      IN.sync(s,E);
      if(!E.normalize(JSON.parse(JSON.stringify(s))))
        throw Error('Owner approval fixture failed v24 save validation');
      localStorage.setItem(key,JSON.stringify(s));
      return {day:s.day,stockId:v.id,requestId:request.id,cash:s.cash,
        sold:s.sold.length,ledger:s.ledger.length,
        mail:s.messages.length,company:s.name};
    },KEY);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    await page.locator('.career-nav [data-page="inbox"]').evaluate(x=>x.click());
    const panel=page.locator('.inbox-command');
    await panel.waitFor({state:'visible'});
    assert.match((await panel.locator('h1').innerText()).replace(/\s+/g,' '),
      /Management Inbox/i);
    assert.equal((await panel.locator('#inbox-action-count').innerText()).trim(),'1');
    assert.equal((await panel.locator('#inbox-current-day').innerText()).trim(),
      'DAY '+String(fixture.day).padStart(2,'0'));
    assert.equal(await panel.locator('.ic-metric').count(),3);
    assert.ok(await panel.locator('#inbox-priority-list .ic-priority-item').count()>=1);
    const compact=await panel.evaluate(node=>{
      const box=x=>{const r=x.getBoundingClientRect();return {top:r.top,bottom:r.bottom,
        width:r.width,height:r.height};};
      return {hero:box(node.querySelector('.ic-hero')),
        overview:box(node.querySelector('.ic-overview')),
        metrics:box(node.querySelector('.ic-metric')),
        priority:box(node.querySelector('.ic-priority')),
        mail:box(node.querySelector('.inbox-layout')),
        reader:box(node.querySelector('#inbox-detail')),
        titleFont:getComputedStyle(node.querySelector('h1')).fontFamily,
        titleSize:parseFloat(getComputedStyle(node.querySelector('h1')).fontSize)};
    });
    assert.ok(compact.hero.height<=83,
      'The command header must stay compact: '+JSON.stringify(compact));
    assert.ok(compact.metrics.height<=90,
      'Summary figures must not become oversized cards: '+JSON.stringify(compact));
    assert.ok(compact.titleFont.includes('DM Sans'),
      'Inbox titles should use refined legible text, not condensed game display type');
    assert.ok(compact.titleSize<=29,'Oversized typographic title');
    if(width>=1200){
      assert.ok(compact.mail.top<395,
        'Correspondence must start within the upper part of the desktop: '+JSON.stringify(compact));
      assert.ok(compact.mail.height>=300,
        'The message register and reader must have usable space: '+JSON.stringify(compact));
      assert.ok(compact.mail.bottom<=height+3,
        'The correspondence panel must fit the desktop viewport at 100%: '+JSON.stringify(compact));
      assert.ok(compact.priority.height<=85,'The decision desk should be a compact band');
    }
    assert.match(await panel.locator('#inbox-command-summary').innerText(),
      /1 LIVE DECISION AWAITING AUTHORITY/);
    const widths=await panel.evaluate(node=>({
      documentWidth:document.documentElement.scrollWidth,
      viewportWidth:innerWidth,contentWidth:node.scrollWidth,
      contentClientWidth:node.clientWidth,
      priorityWidth:node.querySelector('.ic-priority').scrollWidth,
      priorityClientWidth:node.querySelector('.ic-priority').clientWidth,
      readerWidth:node.querySelector('#inbox-detail').scrollWidth,
      readerClientWidth:node.querySelector('#inbox-detail').clientWidth
    }));
    assert.ok(widths.documentWidth<=width+1,'Document overflow '+JSON.stringify(widths));
    assert.ok(widths.contentWidth<=widths.contentClientWidth+1,
      'Command centre horizontal overflow '+JSON.stringify(widths));
    assert.ok(widths.readerWidth<=widths.readerClientWidth+1,
      'Message reader overflow '+JSON.stringify(widths));
    const search=panel.locator('#inbox-search');
    await search.fill('no-such-motor-company-xx');
    assert.equal(await panel.locator('#inbox-list .inbox-row').count(),0);
    assert.match(await panel.locator('.inbox-empty').innerText(),
      /NO MATCHING CORRESPONDENCE/);
    await search.fill('supervisor');
    assert.ok(await panel.locator('#inbox-list .inbox-row').count()>=1);
    await search.fill('');
    await panel.locator('#inbox-priority-list .ic-priority-item').first().click();
    assert.equal(await panel.locator('.inbox-filters [data-filter="action"]').getAttribute('aria-pressed'),'true');
    assert.equal(await panel.locator('#inbox-detail .inbox-email').count(),1);
    assert.ok(await panel.locator('#inbox-detail .inbox-approval').count()>0);
    assert.match(await panel.locator('#inbox-detail').innerText(),
      /APPROVE OFFER|AUTHORISATION REQUIRED/);
    const afterRead=await page.evaluate(key=>{
      const s=JSON.parse(localStorage.getItem(key));
      return {cash:s.cash,sold:s.sold.length,ledger:s.ledger.length,
        valid:!!window.MotorTradeEngine.normalize(s),
        read:s.messages.filter(m=>m.read).length};
    },KEY);
    assert.equal(afterRead.cash,fixture.cash,
      'Opening an approval email must not charge the dealership');
    assert.equal(afterRead.sold,fixture.sold,'Reading mail must not make a sale');
    assert.equal(afterRead.ledger,fixture.ledger,'Reading mail must not change ledger');
    assert.equal(afterRead.valid,true);
    assert.ok(afterRead.read>=1);
    await page.screenshot({path:'review/inbox-command-'+device+'.png',fullPage:true});
    await panel.locator('[data-action="inbox-view-unread"]').click();
    assert.equal(await panel.locator('.inbox-filters [data-filter="unread"]').getAttribute('aria-pressed'),'true');
    await panel.locator('[data-action="inbox-view-decisions"]').first().click();
    assert.equal(await panel.locator('.inbox-filters [data-filter="action"]').getAttribute('aria-pressed'),'true');
    assert.deepEqual(errors,[],'No client JavaScript errors');
    console.log('INBOX_COMMAND_PASS '+device+' '+JSON.stringify({fixture,widths,afterRead}));
    await ctx.close();
  }
}catch(error){
  console.error('INBOX_COMMAND_FAIL',error);
  process.exitCode=1;
}finally{
  await browser.close();
}
