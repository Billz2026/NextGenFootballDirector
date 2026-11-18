import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const filenames=[
  'vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js','vehicle-market.js',
  'premises.js','people.js','calendar.js','monthly.js','empire-progression.js',
  'motor-group.js','dealer-delegation.js','supervisor-operations.js','events.js',
  'workshop.js','stock-ageing.js','showroom-traffic.js','customers.js',
  'aftersales.js','trading.js','inbox-office.js'
];
const window={};
const context={window,Date,Intl};
for(const path of filenames)vm.runInNewContext(
  readFileSync(new URL('../'+path,import.meta.url),'utf8'),context,{filename:path});
const E=window.MotorTradeEngine,O=window.MotorTradeOperations,I=window.MotorTradeInbox;
const clone=x=>JSON.parse(JSON.stringify(x));
const valid=s=>assert.ok(E.normalize(clone(s)),'the full career save must still validate');
function career(name='Delegation QA'){
  const s=E.createStaffed(name,[]);
  assert.equal(s.version,23);
  return s;
}
function day(s){
  const closing=s.day===s.monthPlan.endDay;
  if(closing){window.MotorTradeGroup.closeMonth(s);E.monthly.close(s);}
  E.showroom.closeWaiting(s,'End of game day');
  s.day++;E.rollAuctionHall(s);s.deadlineSession=0;
  if(closing)E.monthly.next(s);
  E.staffDay(s);E.premisesDay(s);E.stockAgeingDay(s);
  E.advanceWorkshop(s);E.advanceCustomers(s);E.advanceAfterSales(s);
  window.MotorTradeGroup.advance(s);
}
function purchase(s){
  const seller=E.marketFor(s).sellers[0];
  assert.ok(E.acquireSeller(s,seller.id,seller.ask).ok);
  return s.vehicles.at(-1);
}
test('v22 save migrates to v23 with original stock, group, cash and staff unchanged',()=>{
  const s=career('Legacy Ops QA'),old=clone(s);
  old.version=22;delete old.operations;
  const result=E.normalize(old);
  assert.ok(result);assert.equal(result.version,23);
  assert.equal(result.cash,s.cash);
  assert.equal(result.staff.length,s.staff.length);
  assert.deepEqual(Array.from(result.ledger,x=>x.delta),Array.from(s.ledger,x=>x.delta));
  assert.equal(result.group.branches.length,0);
  assert.equal(result.operations.enabled,true);
  valid(result);
});
test('real buyer purchases and workshop finishes over elapsed days only',()=>{
  const s=career('Routine Ops QA'),cash=s.cash;
  const first=O.process(s,E);
  assert.equal(first.processed,true);
  assert.ok(first.buy,'genuine seller should accept first approved buyer purchase');
  assert.equal(s.vehicles.length,1);
  assert.equal(s.vehicles[0].source,'seller');
  assert.ok(s.cash<cash);
  const post=s.cash,ledger=s.ledger.length;
  assert.equal(O.process(s,E).processed,false);
  assert.equal(s.cash,post);assert.equal(s.ledger.length,ledger);
  let prepared=false,listed=false;
  for(let i=0;i<16;i++){
    day(s);O.process(s,E);
    if(s.vehicles[0].status==='prepared')prepared=true;
    if(s.vehicles[0].status==='listed'){listed=true;break;}
    valid(s);
  }
  assert.ok(prepared,'quality-control handover should actually happen');
  assert.ok(listed,'advertising only follows genuine paid repairs and QC');
  assert.ok(s.ledger.some(x=>x.note.startsWith('Workshop assessment:')));
  assert.ok(s.ledger.some(x=>x.note.startsWith('Workshop repair booking:')));
  assert.ok(s.vehicles[0].prepSpent>0);
  valid(s);
});
test('buyer purchase above authority creates one live supervisor approval',()=>{
  const s=career('Buyer Approval QA');
  s.operations.maxPurchase=0;s.operations.minMargin=0;
  const cash=s.cash;
  O.process(s,E);
  const [r]=O.pending(s);
  assert.ok(r);
  assert.equal(r.kind,'buy');assert.equal(s.vehicles.length,0);
  assert.equal(s.cash,cash);
  const email=s.messages.find(m=>m.reference==='supervisor-ops:'+r.id);
  assert.ok(email);assert.equal(I.needsAction(email,s),true);
  assert.match(I.quoteControls(email,s,E),/ops-decision/);
  valid(s);
  const approval=O.decide(s,E,r.id,'approved');
  assert.equal(approval.ok,true,approval.message);
  assert.equal(s.vehicles.length,1);
  assert.ok(s.cash<cash);
  assert.equal(r.status,'approved');
  assert.equal(O.decide(s,E,r.id,'approved').ok,false);
  valid(s);
});
test('owner rejection leaves supplier stock outside the business and costs nothing',()=>{
  const s=career('Reject Supplier QA');
  s.operations.maxPurchase=0;s.operations.minMargin=0;
  O.process(s,E);
  const [r]=O.pending(s);assert.ok(r);
  const cash=s.cash;
  assert.equal(O.decide(s,E,r.id,'declined').ok,true);
  assert.equal(s.cash,cash);
  assert.equal(s.vehicles.length,0);
  assert.equal(r.status,'declined');
  assert.equal(O.pending(s).length,0);
  valid(s);
});
test('overspend repair quote waits for supervisor decision and does not charge twice',()=>{
  const s=career('Workshop Approval QA');
  const car=purchase(s),cash=s.cash;
  s.operations.maxStock=1;s.operations.maxRepair=0;
  O.process(s,E);
  const [r]=O.pending(s);
  assert.ok(r);
  assert.equal(r.kind,'repair');
  assert.equal(r.vehicleId,car.id);
  assert.equal(car.workshop.stage,'quoted');
  assert.ok(s.cash<cash,'actual diagnostic assessment was paid');
  const before=s.cash;
  const mail=s.messages.find(m=>m.reference==='supervisor-ops:'+r.id);
  assert.ok(mail);
  assert.equal(I.needsAction(mail,s),true);
  assert.equal(I.needsAction({reference:'repair:'+car.id},s),false,
    'legacy repair approval is suppressed when supervisor already handles quote');
  valid(s);
  const approved=O.decide(s,E,r.id,'approved');
  assert.equal(approved.ok,true,approved.message);
  assert.equal(car.workshop.stage,'in-progress');
  assert.equal(s.cash,before-r.amount);
  assert.equal(O.decide(s,E,r.id,'approved').ok,false);
  valid(s);
});
test('declined repairs leave real unsold inventory and stock holding costs',()=>{
  const s=career('Repair Rejection QA'),car=purchase(s);
  s.operations.maxStock=1;s.operations.maxRepair=0;
  O.process(s,E);
  const [r]=O.pending(s);
  const cash=s.cash;
  assert.equal(O.decide(s,E,r.id,'declined').ok,true);
  assert.equal(s.cash,cash);
  assert.equal(car.status,'acquired');assert.equal(car.workshop.stage,'quoted');
  day(s);O.process(s,E);
  assert.equal(car.workshop.stage,'quoted');
  assert.ok(s.vehicles.some(v=>v.id===car.id));
  valid(s);
});
test('three management risk policies affect spending thresholds and preserve modes',()=>{
  const s=career('Policy Ops QA'),original=clone(s.operations);
  assert.equal(O.setPolicy(s,'protect').ok,true);
  assert.ok(s.operations.maxPurchase<original.maxPurchase);
  assert.ok(s.operations.maxRepair<original.maxRepair);
  assert.equal(O.setPolicy(s,'grow').ok,true);
  assert.ok(s.operations.maxStock>original.maxStock);
  assert.ok(s.operations.minMargin<original.minMargin);
  assert.equal(O.setPolicy(s,'fake').ok,false);
  assert.equal(O.setMode(s,false).ok,true);
  assert.equal(O.process(s,E).processed,false);
  assert.match(O.brief(s),/SUPERVISOR OPERATIONS/);
  valid(s);
});
test('tampered approval or policy state rejects v23 save',()=>{
  const s=career('Corrupt Approval QA');
  s.operations.maxPurchase=0;s.operations.minMargin=0;
  O.process(s,E);
  const r=O.pending(s)[0];assert.ok(r);
  const forged=clone(s);
  forged.operations.requests[0].amount=-10;
  assert.equal(E.normalize(forged),null);
  const missing=clone(s);
  missing.messages=missing.messages.filter(m=>m.reference!=='supervisor-ops:'+r.id);
  assert.equal(E.normalize(missing),null);
  const policy=clone(s);policy.operations.maxRepair=500000;
  assert.equal(E.normalize(policy),null);
  valid(s);
});
