import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const files=['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js','vehicle-market.js',
  'premises.js','people.js','calendar.js','monthly.js','empire-progression.js',
  'motor-group.js','dealer-delegation.js','supervisor-operations.js','auction-supervisor.js',
  'events.js','workshop.js','stock-ageing.js','showroom-traffic.js','customers.js',
  'aftersales.js','trading.js','inbox-office.js'];
const window={};const ctx={window,Date,Intl};
for(const file of files)vm.runInNewContext(
  readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx,{filename:file});
const E=window.MotorTradeEngine,O=window.MotorTradeOperations,I=window.MotorTradeInbox;
const copy=x=>JSON.parse(JSON.stringify(x));
const valid=s=>assert.ok(E.normalize(copy(s)),'full v24 career must validate');
function career(name='Operations QA'){const s=E.createStaffed(name,[]);
  assert.equal(s.version,24);return s;}
function day(s){
  const closing=s.day===s.monthPlan.endDay;
  if(closing){window.MotorTradeGroup.closeMonth(s);E.monthly.close(s);}
  E.showroom.closeWaiting(s,'Day ended');
  s.day++;E.rollAuctionHall(s);s.deadlineSession=0;
  if(closing)E.monthly.next(s);
  E.staffDay(s);E.premisesDay(s);E.stockAgeingDay(s);
  E.advanceWorkshop(s);E.advanceCustomers(s);E.advanceAfterSales(s);
  window.MotorTradeGroup.advance(s);
}
function buyByOwner(s){
  const seller=E.marketFor(s).sellers[0];
  const r=E.acquireSeller(s,seller.id,seller.ask);
  assert.ok(r.ok,r.message);
  return s.vehicles.at(-1);
}
test('v23 careers migrate to v24 with original cash, staff and stock',()=>{
  const s=career('Legacy QA'),old=copy(s);
  old.version=23;delete old.auctionAgent;
  const migrated=E.normalize(old);
  assert.ok(migrated);assert.equal(migrated.version,24);
  assert.equal(migrated.cash,s.cash);
  assert.equal(migrated.staff.length,s.staff.length);
  assert.equal(migrated.operations.enabled,true);
  assert.equal(migrated.auctionAgent.mode,'delegate');
  valid(migrated);
});
test('buyer scouts and emails leads but never negotiates or purchases',()=>{
  const s=career('Buyer Scout QA'),cash=s.cash,ledger=s.ledger.length;
  const r=O.process(s,E);
  assert.equal(r.processed,true);
  assert.equal(s.cash,cash);
  assert.equal(s.vehicles.length,0);
  assert.equal(s.ledger.length,ledger);
  assert.ok(s.messages.some(m=>m.reference==='private-buyer-tip:1'));
  assert.equal(O.process(s,E).processed,false,'no repeated daily mail');
  valid(s);
});
test('workshop autonomously assesses, assigns, repairs, checks QC and lists after elapsed time',()=>{
  const s=career('Full Workshop QA');
  const v=buyByOwner(s),initialCash=s.cash;
  O.process(s,E);
  assert.equal(v.workshop.stage,'in-progress');
  assert.ok(v.workshop.technicianId||v.workshop.method==='external');
  assert.ok(s.cash<initialCash,'assessment and repair are paid');
  let listed=false;
  for(let i=0;i<18;i++){
    day(s);O.process(s,E);
    if(v.status==='listed'){listed=true;break;}
    valid(s);
  }
  assert.ok(listed,'real QC and advertising must eventually finish');
  assert.ok(v.workshop.qcLog.some(x=>x.passed));
  assert.ok(s.operations.history.some(x=>x.kind==='assessment'));
  assert.ok(s.operations.history.some(x=>x.kind==='repair'));
  assert.ok(s.operations.history.some(x=>x.kind==='quality'));
  assert.ok(s.operations.history.some(x=>x.kind==='listing'));
  valid(s);
});
test('workshop can reassign a disabled technician without owner clicking dispatch',()=>{
  const s=career('Technician Handover QA');
  s.cash+=100000;s.ledger.push({day:s.day,delta:100000,note:'QA capital'});
  // Give workshop a second technician using actual hiring rules.
  const candidate=window.MotorTradePeople.applicants(s.day)
    .find(x=>x.role==='technician'&&!s.staff.some(t=>t.name===x.name));
  assert.ok(candidate);
  const hired=E.hireStaff(s,candidate.id);
  assert.ok(hired.ok,hired.message);
  day(s);
  const v=buyByOwner(s);
  O.process(s,E);
  assert.equal(v.workshop.method,'internal');
  const lead=s.staff.find(x=>x.id===v.workshop.technicianId);
  assert.ok(lead);
  lead.trainingUntil=s.day+3;
  day(s);O.process(s,E);
  assert.notEqual(v.workshop.technicianId,lead.id,
    'supervisor assigns another available employee or uses an external garage');
  assert.ok(v.workshop.method==='external'||s.staff.some(t=>t.id===v.workshop.technicianId));
  valid(s);
});
test('supervisor can commission external diagnosis and repair without an in-house technician',()=>{
  const s=career('External Workshop QA');
  const tech=s.staff.find(x=>x.role==='technician');
  assert.ok(tech);
  assert.ok(E.people.release(s,tech.id).ok);
  const v=buyByOwner(s),before=s.cash;
  O.process(s,E);
  assert.equal(v.workshop.assessmentFee,55);
  assert.equal(v.workshop.method,'external');
  assert.equal(v.workshop.stage,'in-progress');
  assert.ok(s.cash<before);
  valid(s);
});
test('over-budget workshop quotation asks owner, then books real repair once',()=>{
  const s=career('Workshop Approval QA'),v=buyByOwner(s);
  s.operations.maxRepair=0;s.operations.maxStock=1;
  O.process(s,E);
  const [r]=O.pending(s);
  assert.ok(r);assert.equal(r.kind,'repair');
  assert.equal(v.workshop.stage,'quoted');
  const mail=s.messages.find(m=>m.reference==='supervisor-ops:'+r.id);
  assert.ok(mail);assert.equal(I.needsAction(mail,s),true);
  const cash=s.cash;
  const result=O.decide(s,E,r.id,'approved');
  assert.ok(result.ok,result.message);
  assert.equal(v.workshop.stage,'in-progress');
  assert.equal(s.cash,cash-r.amount);
  assert.equal(O.decide(s,E,r.id,'approved').ok,false);
  valid(s);
});
test('declining a major repair leaves cash and the vehicle unchanged',()=>{
  const s=career('Reject Repair QA'),v=buyByOwner(s);
  s.operations.maxRepair=0;O.process(s,E);
  const [req]=O.pending(s);
  const cash=s.cash;
  assert.equal(O.decide(s,E,req.id,'declined').ok,true);
  assert.equal(s.cash,cash);
  day(s);O.process(s,E);
  assert.equal(v.workshop.stage,'quoted');
  valid(s);
});
test('operating policies and manual override remain independent of retail automation',()=>{
  const s=career('Policy QA');
  assert.ok(O.setPolicy(s,'protect').ok);
  assert.ok(O.setPolicy(s,'grow').ok);
  assert.equal(O.setMode(s,false).ok,true);
  assert.equal(O.process(s,E).processed,false);
  assert.equal(s.delegation.enabled,true,'retail sales still delegated');
  assert.match(O.brief(s),/SUPERVISOR OPERATIONS/);
  valid(s);
});
test('forged approval records or repair budgets reject a save',()=>{
  const s=career('Tamper QA'),v=buyByOwner(s);
  s.operations.maxRepair=0;O.process(s,E);
  const req=O.pending(s)[0];assert.ok(req);
  const broken=copy(s);broken.operations.requests[0].amount=-1;
  assert.equal(E.normalize(broken),null);
  const missing=copy(s);
  missing.messages=missing.messages.filter(m=>m.reference!=='supervisor-ops:'+req.id);
  assert.equal(E.normalize(missing),null);
  const policy=copy(s);policy.operations.maxRepair=999999;
  assert.equal(E.normalize(policy),null);
  valid(s);
});
