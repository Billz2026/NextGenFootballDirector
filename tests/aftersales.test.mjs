// Run: node --test tests/aftersales.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const context={window:{},Date,Intl};
const scripts=[
  'vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js','monthly.js',
  'events.js','workshop.js','stock-ageing.js','showroom-traffic.js','customers.js',
  'aftersales.js','trading.js','cashflow-forecast.js','finance-view.js',
  'aftersales-view.js','inbox-office.js'
];
for(const path of scripts)runInNewContext(
  readFileSync(new URL('../'+path,import.meta.url),'utf8'),context,{filename:path});
const E=context.window.MotorTradeEngine,A=E.aftersales,M=E.monthly,
  V=context.window.MotorTradeAfterSalesView;
const clone=x=>JSON.parse(JSON.stringify(x));
const valid=s=>assert.ok(E.normalize(clone(s)),'career must validate after save/reload');
function next(s){
  if(s.day===s.monthPlan.endDay){
    assert.ok(M.close(s),'month must close');
    s.day++;E.rollAuctionHall(s);s.deadlineSession=0;M.next(s);
  }else{
    s.day++;E.rollAuctionHall(s);s.deadlineSession=0;
  }
  E.staffDay(s);E.premisesDay(s);E.stockAgeingDay(s);
  E.advanceWorkshop(s);E.advanceCustomers(s);
  return E.advanceAfterSales(s);
}
function until(s,day){
  let result;
  while(s.day<day)result=next(s);
  return result;
}
function caseCareer(){
  const s=E.createStaffed('Customer Care Case 1',[]);
  // Synthetic completed deal isolates claims from market discovery. The
  // test of the real sale pipeline below separately covers genuine handover.
  s.sold.push({id:1,title:'2017 Test Customer Vehicle',day:1,mode:'cash',
    price:9000,profit:1300,profile:null,origin:'S-1-1',
    afterSalesQcCover:0,afterSalesTechReliability:8});
  s.sales=1;s.nextId=2;
  for(let i=1;i<=2000;i++){
    s.name='Post Sale Scenario '+i;
    if(A.schedule(s,s.sold[0]).willClaim)break;
  }
  assert.equal(A.schedule(s,s.sold[0]).willClaim,true);
  return s;
}
test('new career has no invented customer complaints, money changes or clutter',()=>{
  const s=E.createStaffed('Care Baseline',[]),before=JSON.stringify(s);
  assert.equal(s.version,20);
  assert.deepEqual(clone(A.stats(s)),{open:0,resolved:0,potentialCost:0,paid:0});
  assert.equal(V.render(s,E),'');
  assert.deepEqual(clone(E.advanceAfterSales(s)),{opened:[],diagnosed:[],escalated:[]});
  assert.equal(JSON.stringify(s),before);
  valid(s);
});
test('supervisor quality oversight and first failed QC materially change risk',()=>{
  const sale={profile:{grade:4},workshopRecord:{
    method:'internal',qcLog:[{passed:false}]},
    afterSalesQcCover:0,afterSalesTechReliability:7};
  const exposed=A.risk(sale);
  const supervised=A.risk({...sale,afterSalesQcCover:8,
    afterSalesTechReliability:17});
  assert.ok(exposed>supervised,'QC supervision and reliability must reduce expected risk');
  const clean=A.risk({...sale,afterSalesQcCover:8,afterSalesTechReliability:17,
    workshopRecord:{method:'internal',qcLog:[{passed:true}]}});
  assert.ok(clean<supervised,'a first-time QC failure raises future complaint probability');
  assert.ok(exposed<=46&&clean>=3);
});
test('post-handover case opens on its due day once, with an owner Inbox action',()=>{
  const s=caseCareer(),sale=s.sold[0],due=A.schedule(s,sale).dueDay;
  const originalCash=s.cash;
  until(s,due-1);assert.equal(s.afterSalesCases.length,0);
  const opened=next(s);assert.equal(opened.opened.length,1);
  const c=s.afterSalesCases[0];
  assert.equal(c.status,'open');
  assert.equal(c.openedDay,due);
  assert.equal(A.stats(s).potentialCost,c.quote);
  assert.equal(s.ledger.some(x=>x.note.startsWith('Aftersales customer rectification:')),false);
  assert.ok(s.cash<originalCash,'regular overheads continue but case creation charges no repair');
  const notifications=s.messages.filter(m=>m.reference==='aftersales:1');
  assert.equal(notifications.length,1);
  assert.equal(notifications[0].linkPage,'sales');
  assert.equal(context.window.MotorTradeInbox.needsAction(notifications[0],s),true);
  assert.equal(E.advanceAfterSales(s).opened.length,0);
  assert.equal(s.messages.filter(m=>m.reference==='aftersales:1').length,1);
  assert.match(V.render(s,E),/AUTHORISE CUSTOMER REPAIR/);
  valid(s);
});
test('diagnosis costs exactly once, completes after two days and may lower quote',()=>{
  const s=caseCareer(),due=A.schedule(s,s.sold[0]).dueDay;
  until(s,due);const c=s.afterSalesCases[0],originalQuote=c.quote;
  const cash=s.cash,diagnosis=E.inspectAfterSales(s,c.id);
  assert.equal(diagnosis.ok,true,diagnosis.message);
  assert.equal(s.cash,cash-60);
  assert.equal(c.status,'inspection');
  assert.equal(E.inspectAfterSales(s,c.id).ok,false,'cannot buy the same diagnosis twice');
  assert.equal(E.rectifyAfterSales(s,c.id).ok,false,'repair must wait for inspection result');
  next(s);assert.equal(c.status,'inspection');
  const second=next(s);assert.equal(c.status,'open');
  assert.equal(second.diagnosed.length,1);
  assert.ok(c.quote<=originalQuote);
  assert.equal(c.inspectionPaid,60);
  assert.equal(s.ledger.filter(x=>x.note.startsWith('Aftersales independent diagnosis:')).length,1);
  valid(s);
});
test('repair settlement is paid once, protects prep reserves and does not rewrite gross margin',()=>{
  const s=caseCareer(),due=A.schedule(s,s.sold[0]).dueDay;
  until(s,due);const c=s.afterSalesCases[0];
  const tradeMargin=E.totalMargin(s),cash=s.cash,rep=s.reputationScore;
  const result=E.rectifyAfterSales(s,c.id);
  assert.equal(result.ok,true,result.message);
  assert.equal(s.cash,cash-c.quote);
  assert.equal(c.status,'resolved');
  assert.equal(c.paid,c.quote);
  assert.equal(E.totalMargin(s),tradeMargin,'original sale gross margin remains recorded');
  assert.equal(E.rectifyAfterSales(s,c.id).ok,false);
  assert.equal(s.reputationScore,Math.min(100,rep+1));
  assert.equal(A.pendingCost(s),0);
  assert.equal(A.stats(s).paid,c.quote);
  assert.equal(context.window.MotorTradeInbox.needsAction(
    s.messages.find(m=>m.reference==='aftersales:1'),s),false);
  const month=M.statement(s);
  assert.equal(month.afterSalesExpense,c.quote);
  assert.equal(month.ledgerBreakdown.aftersales,-c.quote);
  assert.equal(month.operatingContribution,month.grossAfterStaff-
    month.premisesExpense-month.stockAgeingExpense-c.quote);
  assert.match(V.render(s,E),/RECENTLY RESOLVED CASES/);
  valid(s);
});
test('unresolved cases can harm reputation only at 7, 14 and 21 days',()=>{
  const s=caseCareer(),due=A.schedule(s,s.sold[0]).dueDay;
  until(s,due);const c=s.afterSalesCases[0];
  s.reputationScore=50;s.reputation=E.people.tier(50);
  const prior=s.reputationScore;
  until(s,due+6);assert.equal(c.penalties,0);
  next(s);assert.equal(c.penalties,1);
  assert.equal(s.reputationScore,prior-2);
  const score=s.reputationScore;
  assert.equal(E.advanceAfterSales(s).escalated.length,0);
  assert.equal(s.reputationScore,score,'no repeat reputation penalty on same day');
  until(s,due+21);
  assert.equal(c.penalties,3);
  assert.equal(s.reputationScore,prior-6);
  until(s,due+29);
  assert.equal(c.penalties,3,'penalty capped to prevent runaway trust losses');
  valid(s);
});
test('insufficient unreserved cash blocks both repairs and diagnosis',()=>{
  const s=caseCareer(),due=A.schedule(s,s.sold[0]).dueDay;
  until(s,due);const c=s.afterSalesCases[0];
  const required=c.quote,old=s.cash;
  s.cash=10;s.ledger.push({day:s.day,delta:10-old,note:'Test deliberate cash depletion'});
  assert.equal(E.rectifyAfterSales(s,c.id).code,'cash');
  assert.equal(E.inspectAfterSales(s,c.id).code,'cash');
  assert.equal(s.cash,10);
  assert.equal(c.status,'open');
  valid(s);
});
test('cashflow ringfences pending case estimates once and releases provision when paid',()=>{
  const s=caseCareer(),due=A.schedule(s,s.sold[0]).dueDay;
  until(s,due);const c=s.afterSalesCases[0];
  const before=context.window.MotorTradeCashForecast.forecast(s,E);
  assert.equal(before.pendingClaims,c.quote);
  const cash=s.cash,headroom=before.available;
  assert.equal(E.rectifyAfterSales(s,c.id).ok,true);
  const after=context.window.MotorTradeCashForecast.forecast(s,E);
  assert.equal(after.pendingClaims,0);
  assert.equal(after.available,headroom,
    'actual payment offsets exactly the previous conservative planning reserve');
  assert.equal(s.cash,cash-c.quote);
  valid(s);
});
test('existing v19 career migrates without backdated post-sale complaints',()=>{
  const s=caseCareer(),current=s.day;
  const old=clone(s);old.version=19;delete old.afterSalesCases;delete old.afterSalesCutoverDay;
  const upgraded=E.normalize(old);
  assert.ok(upgraded);
  assert.equal(upgraded.afterSalesCutoverDay,current);
  assert.equal(upgraded.afterSalesCases.length,0);
  assert.equal(E.advanceAfterSales(upgraded).opened.length,0);
  const due=A.schedule(upgraded,upgraded.sold[0]).dueDay;
  until(upgraded,due);
  assert.equal(upgraded.afterSalesCases.length,1,
    'future case events remain possible, but no case is backdated');
  valid(upgraded);
});
test('genuine retail handover snapshots immutable QC indicators for later claim scoring',()=>{
  const s=E.createStaffed('Genuine Customer Care',[]);
  const seller=E.marketFor(s).sellers[0];
  assert.equal(E.acquireSeller(s,seller.id,seller.ask).ok,true);
  const car=s.vehicles[0];
  assert.equal(E.assessStock(s,car.id).ok,true);
  assert.equal(E.startPrep(s,car.id,'internal').ok,true);
  for(let i=0;i<16&&car.status==='acquired';i++){
    next(s);
    if(car.workshop.stage==='quality-check')
      assert.equal(E.finishPrep(s,car.id).ok,true);
  }
  assert.equal(car.status,'prepared');
  assert.equal(E.advertise(s,car.id,car.profile.likelySale+225).ok,true);
  let ready=false;
  for(let i=0;i<35;i++){
    let c=E.customers.caseFor(s,car.id);
    if(!c||c.status==='lost')E.openCustomer(s,car.id);
    c=E.customers.caseFor(s,car.id);
    if(c?.status==='enquiry')E.bookCustomer(s,car.id);
    c=E.customers.caseFor(s,car.id);
    if(c?.status==='arrived'&&E.testDrive(s,car.id).ok){
      ready=true;break;
    }
    next(s);
  }
  assert.equal(ready,true,'a real customer must complete a test drive');
  assert.equal(E.respondCustomer(s,car.id,'discount').ok,true);
  assert.equal(E.agreeCustomer(s,car.id,'cash',null).ok,true);
  assert.equal(E.completeSale(s,car.id,'cash',null).ok,true);
  const sale=s.sold[0];
  assert.ok(sale.workshopRecord);
  assert.equal(sale.afterSalesQcCover,E.people.supervisorProfile(s).qcRiskReduction);
  assert.ok(Number.isSafeInteger(sale.afterSalesTechReliability));
  assert.ok(A.schedule(s,sale).dueDay>sale.day);
  valid(s);
});
