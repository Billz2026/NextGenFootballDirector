import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const origin=process.env.SITE_ORIGIN||'http://127.0.0.1:4173';
const KEY='the-motor-trade-career-v1';
const browser=await chromium.launch({headless:true});
mkdirSync('review',{recursive:true});
try{
  for(const [label,width,height] of [['desktop',1440,900],['phone',390,844]]){
    const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,
      hasTouch:width<600});
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
    const fixture=await page.evaluate(key=>{
      const E=window.MotorTradeEngine,Q=E.showroom;
      const s=E.createStaffed('Patient Customer Test Motors',[]);
      const seller=E.marketFor(s).sellers[0];
      function ok(x,stage){if(!x.ok)throw Error(stage+' '+JSON.stringify(x))}
      ok(E.acquireSeller(s,seller.id,seller.ask),'purchase');
      const v=s.vehicles[0];
      ok(E.assessStock(s,v.id),'assessment');
      ok(E.startPrep(s,v.id,'internal'),'prep');
      for(let i=0;i<16&&v.status==='acquired';i++){
        if(v.workshop.stage==='quality-check')ok(E.finishPrep(s,v.id),'QC');
        else{
          s.day++;E.rollAuctionHall(s);E.staffDay(s);E.premisesDay(s);
          E.stockAgeingDay(s);E.advanceWorkshop(s);E.advanceCustomers(s);
        }
      }
      if(v.status!=='prepared')throw Error('No real prepared stock');
      ok(E.advertise(s,v.id,v.profile.likelySale+225),'advertise');
      const b=s.showroom,rep=Q.availableStaff(s)[0];
      if(!rep)throw Error('No real opening sales employee');
      b.leads=['Sales Rep Buyer','Owner First Buyer','Owner Second Buyer',
        'Patient Last Buyer'].map((name,i)=>({
        id:'Q-'+s.day+'-'+b.session+'-'+v.id+'-'+i,
        customerId:'C-'+s.day+'-'+b.session+'-'+v.id+'-'+(760000+i),
        vehicleId:v.id,createdDay:s.day,session:b.session,name,
        purpose:'ASKING ABOUT PRICE',preferredMode:'cash',
        maxTurns:[1,1,2,3][i],status:'waiting',handledBy:null,reason:''
      }));
      const [repLead,a,buyer2,last]=b.leads;
      ok(E.welcomeShowroom(s,repLead.id,rep.id),'sales employee service');
      ok(E.cancelCustomer(s,v.id,'dealer'),'leave first');
      ok(E.welcomeShowroom(s,a.id,null),'first owner service');
      ok(E.cancelCustomer(s,v.id,'dealer'),'leave second');
      ok(E.welcomeShowroom(s,buyer2.id,null),'second owner service');
      ok(E.cancelCustomer(s,v.id,'dealer'),'leave third');
      if(s.showroom.ownerUsed!==2||Q.availableStaff(s).length!==0||
        Q.waiting(s).length!==1||Q.waiting(s)[0].id!==last.id)
        throw Error('Could not reproduce the screenshot queue');
      if(!E.normalize(JSON.parse(JSON.stringify(s))))
        throw Error('Real engine rejected blocked customer fixture');
      localStorage.setItem(key,JSON.stringify(s));
      return {day:s.day,stockId:v.id,leadId:last.id,visitorId:last.customerId};
    },KEY);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    await page.locator('.career-nav [data-page="sales"]').evaluate(n=>n.click());
    const panel=page.locator('.sales-control');
    const button=panel.locator('[data-action="welcome-showroom"]');
    assert.equal(await button.count(),1);
    assert.equal((await button.innerText()).trim(),'HANDLE FINAL VISITOR');
    assert.match(await panel.locator('.so-visitor-head').innerText(),
      /FINAL OWNER SLOT AVAILABLE/);
    const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    const cash=before.cash;
    await button.click();
    const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    assert.equal(after.showroom.ownerUsed,3);
    assert.equal(after.showroom.turn,3);
    assert.equal(after.customerCases[String(fixture.stockId)].id,fixture.visitorId);
    assert.equal(after.customerCases[String(fixture.stockId)].status,'arrived');
    assert.equal(after.cash,cash,'Final consultation must not invent cash movements');
    assert.equal(after.showroom.leads.find(x=>x.id===fixture.leadId).status,'served');
    assert.match(await panel.locator('#sales-list').innerText(),/CUSTOMER ON SITE|NEXT CUSTOMER ACTION/);
    const size=await page.evaluate(()=>({windowWidth:innerWidth,
      documentWidth:document.documentElement.scrollWidth,
      panelWidth:document.querySelector('.sales-control').scrollWidth,
      panelClientWidth:document.querySelector('.sales-control').clientWidth}));
    assert.ok(size.documentWidth<=width+1,'Document overflow '+JSON.stringify(size));
    assert.ok(size.panelWidth<=size.panelClientWidth+1,'Sales panel overflow');
    await page.screenshot({path:'review/showroom-final-'+label+'.png',fullPage:true});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#menu-continue').click();
    const reloaded=await page.evaluate(key=>{
      const saved=JSON.parse(localStorage.getItem(key));
      return {valid:!!window.MotorTradeEngine.normalize(saved),ownerUsed:saved.showroom.ownerUsed,
        status:saved.customerCases[String(saved.sold[0]?.id??saved.vehicles[0].id)]?.status};
    },KEY);
    assert.equal(reloaded.valid,true);
    assert.equal(reloaded.ownerUsed,3);
    assert.equal(reloaded.status,'arrived');
    assert.deepEqual(errors,[]);
    console.log('SHOWROOM_LAST_VISITOR_PASS '+label+' '+JSON.stringify({fixture,size}));
    await ctx.close();
  }
}catch(e){
  console.error('SHOWROOM_LAST_VISITOR_FAIL',e);
  process.exitCode=1;
}finally{await browser.close();}
