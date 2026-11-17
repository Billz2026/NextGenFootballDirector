// Run: node --test tests/customer-behaviour.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const files=[
  'vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js',
  'monthly.js','events.js','workshop.js','stock-ageing.js','showroom-traffic.js','customers.js','aftersales.js',
  'trading.js','staff-performance.js'
];
const context={window:{},Date,Intl};
for(const path of files)runInNewContext(
  readFileSync(new URL('../'+path,import.meta.url),'utf8'),context,{filename:path}
);
const W=context.window,E=W.MotorTradeEngine,C=E.customers;
const clone=x=>JSON.parse(JSON.stringify(x));
const valid=s=>assert.ok(E.normalize(clone(s)),'career must remain valid after action');

function withPreparedStock(name){
  const s=E.createStaffed(name,[]);
  const item=E.marketFor(s).sellers[0];
  assert.equal(E.acquireSeller(s,item.id,item.ask).ok,true);
  const v=s.vehicles[0];
  assert.equal(E.assessStock(s,v.id).ok,true);
  assert.equal(E.startPrep(s,v.id,'internal').ok,true);
  for(let i=0;i<12&&v.status==='acquired';i++){
    s.day++;E.rollAuctionHall(s);
    E.staffDay(s);E.premisesDay(s);E.advanceWorkshop(s);E.advanceCustomers(s);
    if(v.workshop.stage==='quality-check')
      assert.equal(E.finishPrep(s,v.id).ok,true);
  }
  assert.equal(v.status,'prepared');
  assert.equal(E.advertise(s,v.id,v.profile.likelySale+225).ok,true);
  return {s,v};
}
function customerOnSite(name){
  const {s,v}=withPreparedStock(name);
  for(let i=0;i<30;i++){
    let c=C.caseFor(s,v.id);
    if(!c||c.status==='lost')E.openCustomer(s,v.id);
    c=C.caseFor(s,v.id);
    if(c?.status==='enquiry')E.bookCustomer(s,v.id);
    c=C.caseFor(s,v.id);
    if(c?.status==='arrived'&&E.testDrive(s,v.id).ok)break;
    s.day++;E.rollAuctionHall(s);
    E.staffDay(s);E.premisesDay(s);E.advanceWorkshop(s);E.advanceCustomers(s);
  }
  const c=C.caseFor(s,v.id);
  assert.equal(c?.status,'discussing');
  assert.equal(c.objectionStatus,'pending');
  valid(s);
  return {s,v,c};
}

test('buyers retain their persona across save/reload',()=>{
  const {s,v,c}=customerOnSite('Buyer Persona Test');
  const before=C.behaviour(c,v);
  const reloaded=E.normalize(clone(s));
  const after=C.behaviour(reloaded.customerCases[String(v.id)],
    reloaded.vehicles.find(x=>x.id===v.id));
  assert.equal(before.key,after.key);
  assert.equal(before.concern,after.concern);
  assert.ok(['budget','careful','family','decisive','comparison','detail'].includes(before.key));
});

test('unresolved objection blocks five-round price haggling and agreements',()=>{
  const {s,v}=customerOnSite('Buyer Gate Test');
  assert.equal(E.counter(s,v.id,E.buyers(v,s).cashOffer+50).ok,false);
  assert.equal(E.agreeCustomer(s,v.id,'cash',null).ok,false);
  assert.equal(C.caseFor(s,v.id).counters,0);
  valid(s);
});

test('promised independent check is charged once only on completed handover',()=>{
  const {s,v,c}=customerOnSite('Promise Cost Test');
  const cashBefore=s.cash;
  assert.equal(E.respondCustomer(s,v.id,'inspection').ok,true);
  assert.ok(c.remedyCost>0);
  assert.equal(s.cash,cashBefore,'promise must not debit before sale');
  valid(s);
  assert.equal(E.agreeCustomer(s,v.id,'cash',null).ok,true);
  const agreed=c.price,commitment=c.remedyCost;
  assert.equal(E.completeSale(s,v.id,'cash',null).ok,true);
  assert.equal(s.sold.length,1);
  assert.equal(s.sold[0].customerRemedyCost,commitment);
  assert.equal(s.sold[0].customerLeadId,c.id,
    'completed handover must retain exact lead attribution');
  const performance=W.MotorTradeStaffPerformance.employee(s,
    s.staff.find(e=>e.role==='sales'));
  assert.equal(performance.deals,1);
  assert.equal(performance.converted,1,
    'only the real handover can count as converted');
  assert.equal(performance.contribution,s.sold[0].profit-s.sold[0].salesCommission);
  assert.equal(s.sold[0].profit,agreed-s.sold[0].acquisition-
    s.sold[0].prep-commitment);
  const rem=s.ledger.filter(x=>x.note.startsWith('Customer remedy at handover:'));
  assert.equal(rem.length,1);
  assert.equal(rem[0].delta,-commitment);
  assert.equal(E.completeSale(s,v.id,'cash',null).ok,false,
    'repeat handover must not double charge');
  valid(s);
});

test('price concession reduces buyer offer, with no instant cash movement',()=>{
  const {s,v,c}=customerOnSite('Discount Effect Test');
  const first=E.buyers(v,s),cashBefore=s.cash;
  assert.equal(E.respondCustomer(s,v.id,'discount').ok,true);
  const second=E.buyers(v,s);
  assert.equal(second.cashOffer,first.cashOffer-c.priceDiscount);
  assert.equal(second.cashLimit,first.cashLimit-c.priceDiscount);
  assert.equal(s.cash,cashBefore);
  assert.equal(c.remedyCost,0);
  assert.equal(E.agreeCustomer(s,v.id,'cash',null).ok,true);
  assert.equal(E.completeSale(s,v.id,'cash',null).ok,true);
  assert.equal(s.sold[0].price,second.cashOffer);
  valid(s);
});

test('unsupported battery reassurance damages trust once rather than rerolling',()=>{
  const {s,v,c}=customerOnSite('Battery Trust Test');
  v.fuel='Electric';
  assert.equal(C.behaviour(c,v).issue,'battery');
  const first=E.buyers(v,s);
  const result=E.respondCustomer(s,v.id,'evidence');
  assert.equal(result.ok,false);
  assert.equal(result.changed,true);
  assert.equal(c.trustPenalty,125);
  assert.equal(E.buyers(v,s).cashOffer,first.cashOffer-125);
  assert.equal(E.respondCustomer(s,v.id,'evidence').ok,false);
  assert.equal(c.trustPenalty,125);
  valid(s);
});

test('voluntary walkaway records a lost lead without a sale or expense',()=>{
  const {s,v,c}=customerOnSite('No Deal Test');
  const previousCash=s.cash;
  assert.equal(E.respondCustomer(s,v.id,'walk').changed,true);
  assert.equal(c.status,'lost');
  assert.equal(s.sold.length,0);
  assert.equal(s.cash,previousCash);
  valid(s);
});

test('v15 active and standby buyer cases migrate without invented commitments',()=>{
  const {s,v,c}=customerOnSite('Old Buyer Test');
  c.objectionStatus='resolved';c.objectionAction='legacy';
  c.standby={...clone(c),id:'C-'+s.day+'-0-'+v.id+'-9999',
    status:'booked',appointmentDay:s.day+1,standby:null};
  for(const customer of [c,c.standby]){
    delete customer.objectionStatus;
    delete customer.objectionAction;
    delete customer.evidenceTried;
    delete customer.remedyCost;
    delete customer.priceDiscount;
    delete customer.trustPenalty;
  }
  const old=clone(s);old.version=15;
  const restored=E.normalize(old);
  assert.ok(restored,'old career must still load');
  const current=restored.customerCases[String(v.id)];
  assert.equal(current.objectionAction,'legacy');
  assert.equal(current.objectionStatus,'resolved');
  assert.equal(current.remedyCost,0);
  assert.equal(current.standby.objectionStatus,'unraised');
  assert.ok(E.normalize(clone(restored)),'migrated career must be re-saveable');
});
