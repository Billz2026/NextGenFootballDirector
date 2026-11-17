import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const KEY='the-motor-trade-career-v1';
const browser=await chromium.launch({headless:true});
mkdirSync('review',{recursive:true});
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

    const fixture=await page.evaluate(key=>{
      const E=window.MotorTradeEngine, M=E.monthly, D=E.events;
      const s=E.createStaffed('Monthly Reporting QA',[]);
      const meeting=D.holdMeeting(s,'buying');
      if(!meeting.ok)throw Error('Management priority was not recorded');
      const seller=E.marketFor(s).sellers[0];
      const purchase=E.acquireSeller(s,seller.id,seller.ask);
      if(!purchase.ok)throw Error('Acquisition failed: '+purchase.message);
      for(let day=2;day<=s.monthPlan.endDay;day++){
        E.showroom.closeWaiting(s,'Closing for the day.');
        s.day=day;
        E.rollAuctionHall(s);
        E.staffDay(s);
        E.premisesDay(s);
        E.stockAgeingDay(s);
        E.advanceWorkshop(s);
        E.advanceCustomers(s);
        E.advanceAfterSales(s);
      }
      const closed=M.close(s);
      if(!closed)throw Error('Month 1 did not close');
      s.day=23;
      E.rollAuctionHall(s);
      M.next(s);
      E.advanceCustomers(s);
      if(!E.normalize(JSON.parse(JSON.stringify(s))))
        throw Error('Actual monthly history failed canonical career validation');
      const frozen=JSON.stringify(s.monthlyReports[0]);
      localStorage.setItem(key,JSON.stringify(s));
      return {day:s.day,staff:s.staff.length,startingCapital:s.startingCapital,
        archived:s.monthlyReports.length,month:s.monthPlan.month,
        cash:s.cash,stock:s.vehicles.length,archive:frozen,
        operating:closed.operatingContribution};
    },KEY);
    assert.equal(fixture.day,23);
    assert.equal(fixture.staff,4);
    assert.equal(fixture.startingCapital,45000);
    assert.equal(fixture.archived,1);
    assert.equal(fixture.month,2);
    assert.equal(fixture.stock,1);

    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    await page.locator('#screen-career').waitFor({state:'visible'});
    await page.locator('.career-nav [data-page="reports"]').evaluate(n=>n.click());
    const panel=page.locator('.reports-page-control');
    await panel.waitFor({state:'visible'});
    assert.equal((await panel.locator('h1').innerText()).replace(/\s+/g,' ').trim(),
      'MANAGEMENT REPORTS.');
    assert.equal(await panel.locator('.mr-head h2').innerText(),'MONTH 2 SCORECARD');
    assert.equal(await panel.locator('.mr-kpis .report-metric').count(),4);
    assert.equal(await panel.locator('.mr-mini>div').count(),4);
    assert.equal(await panel.locator('.mr-focus .mr-panel').count(),2);
    assert.equal(await panel.locator('.mr-records').evaluate(n=>n.open),false);
    assert.equal(await panel.locator('.report-picker button').count(),2);
    assert.equal(await panel.locator('.report-picker button[aria-current="true"]').count(),1);
    const measure=async stage=>{
      const m=await page.evaluate(()=>{
        document.documentElement.style.scrollBehavior='auto';
        window.scrollTo({top:0,behavior:'instant'});
        const p=document.querySelector('.reports-page-control'),rect=x=>p.querySelector(x).getBoundingClientRect();
        const a=p.querySelector('.report-picker');
        return {
          viewport:innerWidth,windowScrollY:Math.round(scrollY),
          documentWidth:document.documentElement.scrollWidth,
          panelWidth:p.scrollWidth,panelClientWidth:p.clientWidth,
          headingCount:p.querySelectorAll('h1').length,
          pickerTop:Math.round(rect('.report-picker').top),
          scorecardTop:Math.round(rect('.mr-head').top),
          kpisBottom:Math.round(rect('.mr-kpis').bottom),
          exceptionsTop:Math.round(rect('.mr-focus>.mr-panel:nth-child(2)').top),
          exceptionsBottom:Math.round(rect('.mr-focus>.mr-panel:nth-child(2)').bottom),
          archiveTop:Math.round(rect('.mr-records').top),
          pickerWidth:a.scrollWidth,pickerClientWidth:a.clientWidth
        };
      });
      console.log('REPORT_MEASURE '+stage+' '+label+' '+JSON.stringify(m));
      assert.equal(m.headingCount,1);
      assert.ok(m.documentWidth<=width+1,stage+' '+label+': page overflow '+JSON.stringify(m));
      assert.ok(m.panelWidth<=m.panelClientWidth+1,stage+' '+label+': report panel overflow');
      assert.ok(m.scorecardTop-m.pickerTop<70,
        stage+' '+label+': the scorecard must follow the period selector closely');
      const topLimit=label==='desktop'?310:label==='fold'?460:520;
      assert.ok(m.scorecardTop<topLimit,
        stage+' '+label+': monthly scorecard starts too low for this device');
      assert.ok(m.exceptionsTop>m.kpisBottom-2);
      if(label==='desktop')assert.ok(m.archiveTop<900,'Detailed archive is too deep on desktop');
      if(label==='phone')assert.ok(m.exceptionsTop<height-100,
        'Management warnings must begin within the first phone screen, even with a required meeting banner');
      console.log('REPORT_VISUAL_PASS '+stage+' '+label+' '+JSON.stringify(m));
      await page.screenshot({path:'review/reports-'+stage+'-'+label+'.png',fullPage:true});
    };
    await measure('current');
    const originalSave=await page.evaluate(key=>localStorage.getItem(key),KEY);
    await panel.locator('.report-picker [data-month="1"]').click();
    assert.equal(await panel.locator('.mr-head h2').innerText(),'MONTH 1 SCORECARD');
    assert.match(await panel.locator('.mr-head').innerText(),/MONTH CLOSED · TARGET MISSED/);
    assert.match(await panel.locator('.mr-kpis').innerText(),/CLOSING CASH/);
    assert.equal(await panel.locator('.report-picker button[aria-current="true"]').count(),1);
    const archive=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).monthlyReports[0],KEY);
    assert.equal(JSON.stringify(archive),fixture.archive);
    await measure('archived');

    await panel.locator('.mr-records-summary').click();
    assert.equal(await panel.locator('.mr-records').evaluate(n=>n.open),true);
    assert.equal(await panel.locator('.mr-records .mr-detail').count(),8);
    await panel.locator('.mr-detail summary').first().click();
    assert.equal(await panel.locator('.mr-detail').first().evaluate(n=>n.open),true);
    assert.match(await panel.locator('.mr-detail').first().innerText(),/Mandatory dealership unit target/);
    await page.screenshot({path:'review/reports-details-'+label+'.png',fullPage:true});
    await panel.locator('.report-picker [data-month="current"]').click();
    assert.equal(await panel.locator('.mr-head h2').innerText(),'MONTH 2 SCORECARD');
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),originalSave,
      'Selecting and reading reports must not mutate career history or money');
    assert.deepEqual(errors,[],'Browser JavaScript should remain error-free');
    console.log('REPORT_ARCHIVE_PASS '+label+' '+JSON.stringify({
      month:fixture.month,staff:fixture.staff,archive:fixture.archived,cash:fixture.cash
    }));
    await context.close();
  }
}catch(error){
  console.error('REPORT_VISUAL_FAIL',error);
  process.exitCode=1;
}finally{
  await browser.close();
}
