import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const KEY='the-motor-trade-career-v1';
const browser=await chromium.launch({headless:true});
mkdirSync('review',{recursive:true});

async function inspect(page,label,mode,width,height){
  const panel=page.locator('.events-page-control');
  await panel.waitFor({state:'visible'});
  assert.equal((await panel.locator('h1').innerText()).replace(/\s+/g,' ').trim(),
    'OPERATIONS DIARY.');
  assert.equal(await panel.locator('.eo-kpis>div').count(),4);
  const metrics=await page.evaluate(()=>{
    document.documentElement.style.scrollBehavior='auto';
    window.scrollTo({top:0,behavior:'instant'});
    const p=document.querySelector('.events-page-control');
    const r=s=>p.querySelector(s)?.getBoundingClientRect();
    const timeline=p.querySelector('.eo-timeline');
    const target=modeForTest(p);
    return {
      viewport:innerWidth,scrollY:Math.round(scrollY),
      documentWidth:document.documentElement.scrollWidth,
      panelWidth:p.scrollWidth,panelClientWidth:p.clientWidth,
      headingCount:p.querySelectorAll('h1').length,
      deskTop:Math.round(r('.eo-heading').top),
      metricsBottom:Math.round(r('.eo-kpis').bottom),
      mainActionTop:Math.round(target?.getBoundingClientRect().top??-1),
      timelineWidth:timeline?.scrollWidth??0,
      timelineClientWidth:timeline?.clientWidth??0
    };
    function modeForTest(panel){
      return panel.querySelector('.eo-focus-choice:not(:disabled)')||
        panel.querySelector('.eo-activity .trade-button')||
        panel.querySelector('.eo-schedule .trade-button');
    }
  });
  assert.equal(metrics.headingCount,1);
  assert.ok(metrics.documentWidth<=width+1,
    label+' '+mode+' document overflow '+JSON.stringify(metrics));
  assert.ok(metrics.panelWidth<=metrics.panelClientWidth+1,
    label+' '+mode+' panel overflow '+JSON.stringify(metrics));
  assert.ok(metrics.deskTop<370,label+' '+mode+' current event begins too low');
  assert.ok(metrics.mainActionTop>0,label+' '+mode+' action must remain visible');
  if(mode==='meeting'){
    assert.equal(await panel.locator('[data-action="hold-meeting"]').count(),3);
    assert.match(await panel.innerText(),/DECISION REQUIRED/);
    assert.ok(metrics.mainActionTop<(label==='phone'?890:700),
      'Required management decision must appear without deep scrolling');
  }else if(mode==='normal'){
    assert.equal(await panel.locator('.eo-schedule').count(),2);
    assert.match(await panel.innerText(),/GAME DAY 22/);
    assert.match(await panel.innerText(),/GAME DAY 23/);
    assert.ok(metrics.mainActionTop<(label==='phone'?860:680));
  }else if(mode==='dealday'){
    assert.equal(await panel.locator('.eo-phase').count(),5);
    assert.equal(await panel.locator('.eo-activities .trade-button').count(),2);
    assert.match(await panel.innerText(),/DEAL DAY RULES & SESSION EXPIRY/);
    if(label==='phone'){
      assert.ok(metrics.timelineWidth>metrics.timelineClientWidth,
        'Phone timeline must scroll within its row without page overflow');
    }
    assert.ok(metrics.mainActionTop<(label==='phone'?1100:860));
  }
  await page.screenshot({path:'review/diary-'+mode+'-'+label+'.png',fullPage:true});
  console.log('EVENT_VISUAL_PASS '+mode+' '+label+' '+JSON.stringify(metrics));
  return metrics;
}

async function loadCareer(page){
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#menu-continue').click();
  await page.locator('#screen-career').waitFor({state:'visible'});
  await page.locator('.career-nav [data-page="events"]').evaluate(n=>n.click());
  await page.locator('.events-page-control').waitFor({state:'visible'});
}
async function setNormalDay(page,target){
  const result=await page.evaluate(({key,target})=>{
    const E=window.MotorTradeEngine;
    const s=JSON.parse(localStorage.getItem(key));
    for(let next=s.day+1;next<=target;next++){
      E.showroom.closeWaiting(s,'Day closed without being served.');
      s.day=next;
      E.rollAuctionHall(s);
      E.staffDay(s);
      E.premisesDay(s);
      E.stockAgeingDay(s);
      E.advanceWorkshop(s);
      E.advanceCustomers(s);
      E.advanceAfterSales(s);
    }
    const legal=E.normalize(JSON.parse(JSON.stringify(s)));
    if(!legal)throw Error('Legitimately incurred payroll career invalid at day '+target);
    localStorage.setItem(key,JSON.stringify(s));
    return {day:s.day,cash:s.cash,staff:s.staff.length,
      ledger:s.ledger.length,meetingHeldMonth:s.meetingHeldMonth};
  },{key:KEY,target});
  assert.equal(result.day,target);
  assert.equal(result.staff,4);
  assert.equal(result.meetingHeldMonth,1);
  return result;
}

try{
  for(const [label,width,height] of [['desktop',1440,900],['phone',390,844]]){
    const context=await browser.newContext({
      viewport:{width,height},deviceScaleFactor:1,hasTouch:width<600
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#menu-new-career').click();
    await page.locator('#dealership-name').fill('Events Visual QA');
    await page.locator('.setup-submit').click();
    await page.locator('#screen-career').waitFor({state:'visible'});
    await page.locator('.career-nav [data-page="events"]').evaluate(n=>n.click());
    const initial=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    assert.equal(initial.day,1);
    assert.equal(initial.startingCapital,45000);
    assert.equal(initial.staff.length,4);
    await inspect(page,label,'meeting',width,height);
    await page.locator('[data-action="hold-meeting"][data-focus="buying"]').click();
    const meeting=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    assert.equal(meeting.meetingFocus,'buying');
    assert.equal(meeting.meetings.length,1);
    assert.equal(meeting.cash,initial.cash);
    assert.equal(await page.locator('.eo-focus-choice:not(:disabled)').count(),0);
    assert.match(await page.locator('.events-page-control').innerText(),/MEETING COMPLETED/);
    const ready=await setNormalDay(page,17);
    assert.ok(ready.cash<initial.cash);
    await loadCareer(page);
    await inspect(page,label,'normal',width,height);
    assert.equal(await page.locator('.eo-calendar .eo-schedule').count(),2);
    const monthEnd=await setNormalDay(page,22);
    assert.ok(monthEnd.cash<ready.cash);
    await loadCareer(page);
    await inspect(page,label,'dealday',width,height);
    assert.match(await page.locator('.eo-heading-status').innerText(),/09:00/);
    const cashAtDeal=monthEnd.cash;
    for(let session=1;session<=4;session++){
      await page.locator('#continue-day').click();
      const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
      assert.equal(state.day,22,'Deal Day sessions must not advance the calendar day');
      assert.equal(state.deadlineSession,session);
      assert.equal(state.cash,cashAtDeal,'A session change cannot create or charge cash');
    }
    assert.match(await page.locator('.eo-heading-status').innerText(),/17:00/);
    assert.match(await page.locator('.eo-next-action').innerText(),/CLOSE MONTH/);
    await page.screenshot({path:'review/diary-last-session-'+label+'.png',fullPage:true});
    await page.locator('#continue-day').click();
    const closed=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    assert.equal(closed.day,23);
    assert.equal(closed.staff.length,4);
    assert.equal(closed.monthlyReports.length,1);
    assert.match(await page.locator('.events-page-control').innerText(),/BOARD MEETING/);
    assert.match(await page.locator('.events-page-control').innerText(),/DECISION REQUIRED/);
    assert.deepEqual(errors,[],'Browser JavaScript must not throw');
    console.log('EVENT_TRANSITION_PASS '+label+' '+JSON.stringify({
      openingCash:initial.cash,day17Cash:ready.cash,monthEndCash:cashAtDeal,
      nextMonthCash:closed.cash,staff:closed.staff.length,
      archive:closed.monthlyReports.length}));
    await context.close();
  }
}catch(error){
  console.error('EVENT_VISUAL_FAIL',error);
  process.exitCode=1;
}finally{
  await browser.close();
}
