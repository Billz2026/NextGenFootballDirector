import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const base=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const failures=[];
mkdirSync('review',{recursive:true});
try{
  for(const [label,width,height] of [['desktop',1440,900],['phone',390,844]]){
    const context=await browser.newContext({
      viewport:{width,height},deviceScaleFactor:1,hasTouch:width<600
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('dialog',dialog=>dialog.accept());
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.locator('#menu-new-career').click();
    await page.locator('#dealership-name').fill('Auction Layout QA');
    await page.locator('.setup-submit').click();
    await page.locator('#screen-career').waitFor({state:'visible'});
    // Use the real delegated navigation handler even when mobile nav is offscreen.
    await page.locator('.career-nav [data-page="auctionHall"]').evaluate(node=>node.click());
    await page.locator('[data-panel="auctionHall"]').waitFor({state:'visible'});
    const panel=page.locator('.auction-hall-control');
    const heading=await panel.locator('h1').innerText();
    assert.equal(heading.replace(/\s+/g,' ').trim(),'WEEKLY ROSTRUM.');
    assert.equal(await panel.locator('.auction-hall-head h2').count(),0,
      'Do not repeat the large AUCTION HALL hero');
    assert.equal(await panel.locator('[data-action="start-auction"]').count(),1);
    assert.equal(await panel.locator('.auction-rules').count(),1);
    assert.equal(await panel.locator('.auction-rules').evaluate(node=>node.open),false);
    const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('the-motor-trade-career-v1')));
    assert.equal(state.staff.length,4,'Staffed career remains intact');
    assert.equal(state.startingCapital,45000);
    const layout=await page.evaluate(()=>{
      const panel=document.querySelector('.auction-hall-control');
      const bid=panel.querySelector('.auction-bid-box').getBoundingClientRect();
      const catalogue=panel.querySelector('.auction-catalogue').getBoundingClientRect();
      const controls=panel.querySelector('.auction-controls').getBoundingClientRect();
      const headings=panel.querySelectorAll('h1');
      const actionCount=panel.querySelectorAll('[data-action="preview-auction"]').length;
      return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
        panelWidth:panel.scrollWidth,panelClientWidth:panel.clientWidth,
        bidTop:Math.round(bid.top),catalogueBottom:Math.round(catalogue.bottom),
        controlsTop:Math.round(controls.top),headingCount:headings.length,
        actionCount,lotCount:stateForTest(panel)};
      function stateForTest(p){return p.querySelectorAll('.auction-catalogue-item').length;}
    });
    assert.ok(layout.documentWidth<=width+1,
      label+': unexpected page horizontal overflow '+JSON.stringify(layout));
    assert.ok(layout.panelWidth<=layout.panelClientWidth+1,
      label+': Auction panel horizontal overflow '+JSON.stringify(layout));
    assert.equal(layout.headingCount,1);
    assert.equal(layout.actionCount,layout.lotCount-1,
      'Current lot should not have a dead preview action');
    assert.ok(layout.bidTop>layout.catalogueBottom-2,
      label+': bidding workspace should follow compact catalogue');
    if(label==='desktop')
      assert.ok(layout.bidTop<800,'Bid workspace should begin above the desktop fold');
    await page.screenshot({path:'review/auction-'+label+'.png',fullPage:true});
    console.log('AUCTION_VISUAL_PASS '+label+' '+JSON.stringify(layout));
    assert.deepEqual(errors,[],'Browser should have no uncaught errors');
    await context.close();
  }
}catch(error){
  console.error('AUCTION_VISUAL_FAIL',error);
  process.exitCode=1;
}finally{
  await browser.close();
}
