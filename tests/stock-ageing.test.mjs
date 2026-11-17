// Run: node --test tests/stock-ageing.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const ctx={window:{},Date,Intl,document:{addEventListener(){}}};
for(const path of ['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js','monthly.js',
  'events.js','workshop.js','stock-ageing.js','showroom-traffic.js',
  'customers.js','aftersales.js','trading.js','cashflow-forecast.js','finance-view.js',
  'vehicle-cards.js','stock-view.js','monthly-view.js']){
  runInNewContext(readFileSync(new URL('../'+path,import.meta.url),'utf8'),
    ctx,{filename:path});
}
const E=ctx.window.MotorTradeEngine, A=E.stockAgeing, F=ctx.window.MotorTradeCashForecast,
  SV=ctx.window.MotorTradeStockView, M=E.monthly;
const clone=x=>JSON.parse(JSON.stringify(x));
const valid=s=>assert.ok(E.normalize(clone(s)),'real career must remain valid');
const career=name=>E.createStaffed(name||'Ageing Test Motors',[]);
function buy(s){
  const sellers=E.marketFor(s).sellers.slice().sort((a,b)=>a.ask-b.ask);
  for(const seller of sellers){
    const result=E.acquireSeller(s,seller.id,seller.ask);
    if(result.ok)return s.vehicles.at(-1);
  }
  throw Error('No affordable seller in the genuine market');
}
function next(s){
  const closing=s.day===s.monthPlan.endDay;
  if(closing)assert.ok(M.close(s),'monthly report should close');
  s.day++;
  E.rollAuctionHall(s);
  s.deadlineSession=0;
  if(closing)M.next(s);
  E.staffDay(s);
  E.premisesDay(s);
  const result=E.stockAgeingDay(s);
  E.advanceWorkshop(s);
  E.advanceCustomers(s);
  return result;
}
function until(s,target){
  let out;
  while(s.day<target)out=next(s);
  return out;
}
test('age tiers start exactly on day 15, 30 and 45',()=>{
  assert.deepEqual([0,14,15,29,30,44,45,100].map(A.fee),[0,0,6,6,14,14,28,28]);
  assert.equal(A.tier(15).label,'15+ DAYS');
  assert.equal(A.tier(30).label,'30+ DAYS');
  assert.equal(A.tier(45).label,'45+ DAYS');
});
test('holding charges are real ledger expenses, with no duplicate daily debit',()=>{
  const s=career('Stock Ageing Daily');const v=buy(s);
  assert.equal(v.acquiredDay,1);
  until(s,15);
  assert.equal(s.ledger.some(x=>x.note.startsWith('Stock ageing expense accrued:')),false);
  const before=s.cash,settled=next(s);
  assert.equal(s.day,16);
  assert.equal(settled.due,6);
  assert.equal(settled.paid,6);
  assert.equal(s.cash,before-E.people.dailyCost(s.staff[0])-
    s.staff.slice(1).reduce((n,e)=>n+E.people.dailyCost(e),0)-
    E.premises.costs(s).total-6);
  const count=s.ledger.length,after=s.cash;
  assert.equal(E.stockAgeingDay(s).due,0);
  assert.equal(s.cash,after);
  assert.equal(s.ledger.length,count);
  assert.equal(M.statement(s).stockAgeingExpense,6);
  assert.equal(M.statement(s).stockAgeingPaid,6);
  valid(s);
});
test('tier changes accrue higher costs and appear in monthly operating contribution',()=>{
  const s=career('Tier Accounting');buy(s);
  const first=until(s,16);
  assert.equal(first.due,6);
  const second=until(s,31);
  assert.equal(second.due,14);
  assert.ok(M.statement(s).stockAgeingExpense>0);
  const third=until(s,46);
  assert.equal(third.due,28);
  assert.equal(s.stockAgeingArrears,0);
  const accrued=s.ledger.filter(x=>x.note.startsWith('Stock ageing expense accrued:'))
    .reduce((n,x)=>n+Number(x.note.match(/£(\d+)/)?.[1]||0),0);
  assert.equal(accrued,15*6+15*14+28);
  const current=M.statement(s);
  assert.equal(current.operatingContribution,
    current.grossAfterStaff-current.premisesExpense-current.stockAgeingExpense);
  assert.ok(s.monthlyReports[0].stockAgeingExpense>0);
  valid(s);
});
test('unpaid holding charges remain liabilities and cannot raid protected repairs',()=>{
  const s=career('Reserved Cash');const v=buy(s);
  const reserved=E.workshop.reserved(s);
  const move=s.cash-reserved;
  s.cash-=move;s.ledger.push({day:s.day,delta:-move,note:'Test cash allocation'});
  until(s,15);
  const r=next(s);
  assert.equal(r.due,6);
  assert.equal(r.paid,0);
  assert.equal(r.arrears,6);
  assert.ok(s.cash>=0);
  assert.equal(s.stockAgeingArrears,6);
  assert.equal(A.chargeFor(s),6);
  assert.ok(E.normalize(clone(s)));
  assert.ok(v.status==='acquired');
});
test('aged listings lose relative appeal unless repriced, with no forced loss',()=>{
  const s=career('Price Pressure'),v=buy(s);
  const fair=v.profile.likelySale;
  v.status='listed';v.asking=fair; // read-only demand model test
  const fresh=A.overpricing(s,v);
  s.day=v.acquiredDay+15;
  const first=A.overpricing(s,v);
  s.day=v.acquiredDay+30;
  const second=A.overpricing(s,v);
  s.day=v.acquiredDay+45;
  const third=A.overpricing(s,v);
  assert.ok(first>fresh);
  assert.ok(second>first);
  assert.ok(third>second);
  const target=A.marketTarget(s,v);
  assert.ok(target<fair);
  assert.ok(A.overpricing(s,{...v,asking:target})<=.001);
  assert.equal(v.asking,fair,'ageing must never silently change the asking price');
});
test('aged ready stock can exit wholesale with correct paid-repair basis',()=>{
  const s=career('Capital Exit'),v=buy(s);
  assert.equal(E.assessStock(s,v.id).ok,true);
  assert.equal(E.startPrep(s,v.id,'external').ok,true);
  for(let i=0;i<20&&v.status==='acquired';i++){
    next(s);
    if(v.workshop.stage==='quality-check')
      assert.equal(E.finishPrep(s,v.id).ok,true);
  }
  assert.equal(v.status,'prepared');
  assert.equal(E.disposeStock(s,v.id).ok,false,
    'new ready stock cannot use special ageing liquidation');
  until(s,31);
  const bid=E.wholesaleOffer(v,s.day);
  const investment=v.cost+v.prepSpent,originalCash=s.cash;
  const result=E.disposeStock(s,v.id);
  assert.equal(result.ok,true);
  assert.equal(s.cash,originalCash+bid);
  assert.equal(s.vehicles.length,0);
  assert.equal(s.wholesale.at(-1).basis,investment);
  assert.equal(s.wholesale.at(-1).profit,bid-investment);
  assert.equal(s.sales,0,'trade exits are not retail sales');
  valid(s);
});
test('a stale advertised car can be repriced or liquidated without a forced price cut',()=>{
  const s=career('Retail Pricing Pressure'),v=buy(s);
  assert.equal(E.assessStock(s,v.id).ok,true);
  assert.equal(E.startPrep(s,v.id,'external').ok,true);
  for(let i=0;i<20&&v.status==='acquired';i++){
    next(s);
    if(v.workshop.stage==='quality-check')assert.equal(E.finishPrep(s,v.id).ok,true);
  }
  assert.equal(v.status,'prepared');
  assert.equal(E.advertise(s,v.id,v.retail).ok,true);
  const originalPrice=v.asking;
  until(s,31);
  assert.equal(v.asking,originalPrice,'ageing cannot silently discount a listed car');
  const guide=A.marketTarget(s,v);
  assert.ok(guide<originalPrice,'real stock at 30 days should have a competitive guide');
  const html=SV.render(s,{reportCard:()=>''}).html;
  assert.match(html,/data-action="reprice-aged-stock"/);
  assert.match(html,/data-action="dispose-aged-stock"/);
  assert.equal(E.advertise(s,v.id,guide).ok,true);
  assert.equal(v.asking,guide);
  const before=s.cash;
  assert.equal(E.disposeStock(s,v.id).ok,true);
  assert.ok(s.cash>before);
  assert.equal(s.sold.length,0);
  valid(s);
});
test('trade exit protects a live customer agreement',()=>{
  const s=career('Customer Protection'),v=buy(s);
  assert.equal(E.assessStock(s,v.id).ok,true);
  assert.equal(E.startPrep(s,v.id,'external').ok,true);
  for(let i=0;i<20&&v.status==='acquired';i++){
    next(s);
    if(v.workshop.stage==='quality-check')
      assert.equal(E.finishPrep(s,v.id).ok,true);
  }
  assert.equal(E.advertise(s,v.id,v.retail).ok,true);
  until(s,31);
  s.customerCases[String(v.id)]={status:'agreed'};
  assert.equal(E.disposeStock(s,v.id).code,'customer');
  delete s.customerCases[String(v.id)];
  assert.ok(E.normalize(clone(s)));
});
test('existing version-18 careers migrate without retroactive bills',()=>{
  const s=career('Legacy Ageing');
  const legacy=clone(s);
  legacy.version=18;
  delete legacy.stockAgeingArrears;
  delete legacy.lastStockAgeingDay;
  const migrated=E.normalize(legacy);
  assert.ok(migrated);
  assert.equal(migrated.stockAgeingArrears,0);
  assert.equal(migrated.lastStockAgeingDay,migrated.day);
  assert.equal(E.stockAgeingDay(migrated).due,0);
  assert.ok(E.normalize(clone(migrated)));
});
test('finance runway anticipates future tier boundaries and stock desk shows choices',()=>{
  const s=career('Planning Ageing'),v=buy(s);
  until(s,14);
  const f=F.forecast(s,E);
  assert.equal(f.projectedAgeing,6*6);
  assert.equal(f.projected,f.afterPlans-7*f.daily-6*6);
  const target=A.marketTarget(s,v);
  assert.ok(target>0);
  const html=SV.render(s,{reportCard:()=>''}).html;
  assert.ok(html.includes('15+ DAYS')===false,'day 14 should not show ageing tier');
  until(s,31);
  const aged=SV.render(s,{reportCard:()=>''}).html;
  assert.match(aged,/STOCK HOLDING \/ DAY/);
  assert.match(aged,/MARKET PRICE GUIDE/);
  assert.match(aged,/30\+ DAYS/);
  valid(s);
});
