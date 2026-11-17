// Run: node --test tests/cashflow-forecast.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const context={window:{},Date,Intl};
for(const path of ['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js','vehicle-market.js','premises.js','people.js','calendar.js','monthly.js','events.js','workshop.js','stock-ageing.js','showroom-traffic.js','customers.js','aftersales.js','trading.js','cashflow-forecast.js','finance-view.js'])
  runInNewContext(readFileSync(new URL('../'+path,import.meta.url),'utf8'),context,{filename:path});
const E=context.window.MotorTradeEngine,F=context.window.MotorTradeCashForecast,FV=context.window.MotorTradeFinanceView;
const copy=s=>JSON.parse(JSON.stringify(s));
const career=()=>E.createStaffed('Forecast Test Motors',[]);
const plan=(horizon=7,purchase=0,prep=0,extraRepair=0)=>({horizon,purchase,prep,extraRepair});

test('seven-day baseline matches actual no-sales wage and premises expenditure',()=>{
  const s=career(),before=JSON.stringify(s),f=F.forecast(s,E);
  const daily=s.staff.reduce((n,x)=>n+E.people.dailyCost(x),0)+E.premises.costs(s).total;
  assert.equal(f.daily,daily);
  assert.equal(f.projected,45000-7*daily);
  assert.deepEqual(Array.from(f.checkpoints,x=>x.headroom),[7,14,30].map(d=>45000-d*daily));
  const real=copy(s);
  for(let i=0;i<7;i++){
    real.day++;E.rollAuctionHall(real);E.staffDay(real);E.premisesDay(real);
    E.advanceWorkshop(real);E.advanceCustomers(real);
  }
  assert.equal(real.cash,f.projected);
  assert.equal(JSON.stringify(s),before);
  assert.ok(E.normalize(copy(s)));
});
test('what-if purchases and repair allowances are read-only and costed once',()=>{
  const s=career(),f=F.forecast(s,E,plan(14,7000,850,350));
  assert.equal(f.planned,8200);
  assert.equal(f.afterPlans,45000-8200);
  assert.equal(f.projected,45000-8200-14*f.daily);
  assert.equal(s.cash,45000);
  const seller=E.marketFor(s).sellers[0];
  assert.ok(E.acquireSeller(s,seller.id,seller.ask).ok);
  const base=F.forecast(s,E);
  assert.equal(base.reserve,s.vehicles[0].prepBudget);
  const repair=F.forecast(s,E,plan(7,0,0,275));
  assert.equal(repair.projected,base.projected-275);
  assert.ok(E.normalize(copy(s)));
});
test('arrears, auction invoice and offsite holding costs affect the runway',()=>{
  const s=career();s.payrollArrears=200;s.premises.arrears=75;
  s.auctionHall.phase='payment';s.auctionHall.currentBid=4400;
  const f=F.forecast(s,{...E,auctionLot:()=>({fee:225})});
  assert.equal(f.pendingInvoice,4625);
  assert.equal(f.available,45000-4625-275);
  const t=career(),permanent=E.premises.capacity(t),cap=E.premises.storageLimit(t);
  t.vehicles=Array.from({length:permanent},(_,i)=>({id:i+1,status:'prepared'}));
  const offsite=F.forecast(t,E,plan(7,2500,500));
  assert.equal(offsite.additionalOffsite,E.premises.OVERFLOW_DAILY_FEE);
  t.vehicles=Array.from({length:cap},(_,i)=>({id:i+1,status:'prepared'}));
  assert.equal(F.forecast(t,E,plan(7,2500,500)).severity,'blocked');
});
test('shortfalls and input errors are explicit and never change bank balance',()=>{
  const s=career();
  const f=F.forecast(s,E,plan(30,44000,1500,300));
  assert.equal(f.severity,'shortfall');
  assert.equal(f.shortfall,-f.projected);
  assert.equal(f.runway,0);
  assert.match(F.renderResults(s,E,plan(30,44000,1500,300)),/FUNDING SHORTFALL/);
  for(const bad of [plan(12),plan(7,-1),plan(7,1.5),plan(7,1000001)])
    assert.equal(F.forecast(s,E,bad).valid,false);
  assert.equal(F.forecast(s,E,plan(7,0,100)).severity,'blocked');
  assert.match(F.renderResults(s,E,plan(7,0,100)),/ENTER A PURCHASE PRICE/);
  assert.equal(s.cash,45000);
  assert.ok(E.normalize(copy(s)));
});
test('existing finance page retains accounting cards and adds forecast controls',()=>{
  const s=career(),html=FV.summary(s,E,{scenario:F.defaults()}).html;
  assert.match(html,/CASH FLOW · WHERE YOUR CASH WENT/);
  assert.match(html,/CAN THE DEALERSHIP AFFORD THE NEXT MOVE/);
  assert.match(html,/NO SALES ASSUMED/);
  assert.match(html,/data-forecast-field="purchase"/);
  assert.match(html,/data-forecast-field="prep"/);
  assert.match(html,/data-forecast-field="extraRepair"/);
  assert.match(html,/data-action="finance-horizon"/);
  assert.match(html,/data-action="finance-reset-plan"/);
  assert.match(html,/Customer deposits held separately/);
  assert.ok(E.normalize(copy(s)));
});
