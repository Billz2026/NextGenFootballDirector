import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
mkdirSync('review',{recursive:true});
try {
  for(const [label,width,height] of [['desktop',1440,900],['phone',390,844]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<600});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('dialog',dialog=>dialog.accept());
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#menu-new-career').click();
    await page.locator('#dealership-name').fill('Buying Desk Review');
    await page.locator('.setup-submit').click();
    await page.locator('#screen-career').waitFor({state:'visible'});
    await page.locator('.career-nav [data-page="auctions"]').evaluate(node=>node.click());
    const panel=page.locator('.buying-desk-control');
    await panel.waitFor({state:'visible'});
    const title=await panel.locator('h1').innerText();
    assert.equal(title.replace(/\s+/g,' ').trim(),'DIRECT SOURCING.');
    assert.equal(await panel.locator('.buy-stat').count(),3);
    assert.equal(await panel.locator('[data-action="buy-seller"]').count(),1);
    assert.equal(await panel.locator('.buy-cost-breakdown').evaluate(x=>x.open),false);
    assert.equal(await panel.locator('.buy-budget-note').evaluate(x=>x.open),false);
    assert.equal(await panel.locator('.buy-deal-terms').evaluate(x=>x.open),false);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('the-motor-trade-career-v1')));
    assert.equal(saved.staff.length,4);
    assert.equal(saved.startingCapital,45000);
    const metrics=await page.evaluate(()=>{
      const p=document.querySelector('.buying-desk-control');
      const rect=s=>p.querySelector(s).getBoundingClientRect();
      const shortlist=p.querySelector('.buy-lead-list');
      const panel=p.querySelector('.buy-seller-focus');
      return {
        viewportWidth:innerWidth,
        documentWidth:document.documentElement.scrollWidth,
        panelWidth:p.scrollWidth,
        panelClientWidth:p.clientWidth,
        titleCount:p.querySelectorAll('h1').length,
        statsBottom:Math.round(rect('.buy-desk-stats').bottom),
        leadsTop:Math.round(rect('.buy-leads').top),
        leadsBottom:Math.round(rect('.buy-leads').bottom),
        focusTop:Math.round(rect('.buy-seller-focus').top),
        offerTop:Math.round(rect('[data-action="buy-seller"]').top),
        vehicleTop:Math.round(rect('.buy-vehicle').top),
        valuationTop:Math.round(rect('.buy-valuation').top),
        sellerScrollWidth:shortlist.scrollWidth,
        sellerClientWidth:shortlist.clientWidth,
        detailWidth:panel.scrollWidth,
        detailClientWidth:panel.clientWidth,
        horizontalOverflow:document.documentElement.scrollWidth-innerWidth
      };
    });
    assert.ok(metrics.documentWidth<=width+1,
      label+': page overflow '+JSON.stringify(metrics));
    assert.ok(metrics.panelWidth<=metrics.panelClientWidth+1,
      label+': Buying Desk overflow '+JSON.stringify(metrics));
    assert.ok(metrics.detailWidth<=metrics.detailClientWidth+1,
      label+': vehicle focus overflow '+JSON.stringify(metrics));
    assert.equal(metrics.titleCount,1);
    if(label==='desktop'){
      assert.ok(metrics.focusTop<410,'Desktop deal workspace should start high on screen');
      assert.ok(metrics.offerTop<950,'Desktop offer controls should not be hidden far below the fold');
      assert.ok(Math.abs(metrics.vehicleTop-metrics.valuationTop)<=3,
        'Desktop photo and appraisal should start on the same horizontal line');
    }else{
      assert.ok(metrics.sellerScrollWidth>metrics.sellerClientWidth,
        'Mobile seller shortlist should be swipeable without page overflow');
      assert.ok(metrics.valuationTop<metrics.vehicleTop,
        'Mobile appraisal and offer workflow should precede long vehicle dossier');
      assert.ok(metrics.offerTop<1000,
        'Mobile offer control is still too deep in the page');
    }
    await page.screenshot({path:'review/buying-desk-'+label+'.png',fullPage:true});
    const second=panel.locator('[data-action="select-seller"]').nth(1);
    await second.click();
    const changed=await page.evaluate(()=>JSON.parse(localStorage.getItem('the-motor-trade-career-v1')));
    assert.equal(changed.cash,saved.cash,'Selecting a seller must not debit money');
    assert.equal(changed.staff.length,saved.staff.length,'Staff may not change during sourcing');
    assert.deepEqual(errors,[],'No browser JavaScript errors');
    console.log('BUYING_VISUAL_PASS '+label+' '+JSON.stringify(metrics));
    await context.close();
  }
} catch(err) {
  console.error('BUYING_VISUAL_FAIL',err);
  process.exitCode=1;
} finally {
  await browser.close();
}
