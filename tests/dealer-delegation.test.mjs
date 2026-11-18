import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const files=['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js','monthly.js',
  'empire-progression.js','motor-group.js','dealer-delegation.js','supervisor-operations.js','events.js',
  'workshop.js','stock-ageing.js','showroom-traffic.js','customers.js',
  'aftersales.js','trading.js','inbox-office.js'];
const window={};
const ctx={window,Date,Intl};
for(const file of files)vm.runInNewContext(
  readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx,{filename:file});
const E=window.MotorTradeEngine,D=window.MotorTradeDelegation,IN=window.MotorTradeInbox;
const copy=s=>JSON.parse(JSON.stringify(s));
const valid=s=>assert.ok(E.normalize(copy(s)),'v23 career save must reload');
function tick(s){
  const closing=s.day===s.monthPlan.endDay;
  if(closing){window.MotorTradeGroup.closeMonth(s);E.monthly.close(s);}
  E.showroom.closeWaiting(s,'Trading day closed');
  s.day++;E.rollAuctionHall(s);s.deadlineSession=0;
  if(closing)E.monthly.next(s);
  E.staffDay(s);E.premisesDay(s);E.stockAgeingDay(s);
  E.advanceWorkshop(s);E.advanceCustomers(s);E.advanceAfterSales(s);
  window.MotorTradeGroup.advance(s);
}
function listed(name){
  const s=E.createStaffed(name,[]);
  s.cash+=500000;s.ledger.push({day:s.day,delta:500000,note:'QA owner equity'});
  const seller=E.marketFor(s).sellers[0];
  assert.ok(E.acquireSeller(s,seller.id,seller.ask).ok);
  const v=s.vehicles[0];
  assert.ok(E.assessStock(s,v.id).ok);
  assert.ok(E.startPrep(s,v.id,'internal').ok);
  for(let i=0;i<25&&v.status==='acquired';i++){
    if(v.workshop.stage==='quality-check')assert.ok(E.finishPrep(s,v.id).ok);
    else tick(s);
  }
  assert.equal(v.status,'prepared');
  assert.ok(E.advertise(s,v.id,v.profile.likelySale+125).ok);
  valid(s);return {s,v};
}
function approvalScenario(){
  const {s,v}=listed('Owner Approval QA');
  s.delegation.maxDiscount=0;s.delegation.minGross=5000;
  for(let i=0;i<25&&!D.pending(s).length;i++){
    D.process(s,E);
    if(!D.pending(s).length)tick(s);
  }
  const [req]=D.pending(s);
  assert.ok(req,'live buyer must generate a supervisor approval');
  return {s,v,req};
}

test('v21 migrates to v23 with the original cash, staff and inventory',()=>{
  const original=E.createStaffed('Legacy Owner QA',[]);
  assert.equal(original.version,23);
  const old=copy(original);old.version=21;delete old.delegation;
  const x=E.normalize(old);
  assert.ok(x);assert.equal(x.version,23);
  assert.equal(x.cash,original.cash);
  assert.equal(x.staff.length,original.staff.length);
  assert.equal(x.sold.length,0);
  assert.equal(x.delegation.enabled,true);
  assert.equal(x.delegation.approvals.length,0);
  valid(x);
});

test('staff complete real customer handovers once using existing engine',()=>{
  const {s}=listed('Staff Sales QA');
  const oldCash=s.cash;
  const r=D.process(s,E);
  assert.ok(r.served>0);
  assert.equal(s.sold.length,1);
  assert.ok(s.sold[0].customerLeadId);
  assert.ok(s.sold[0].salespersonId);
  assert.ok(s.cash>oldCash);
  const cash=s.cash,ledger=s.ledger.length;
  assert.equal(D.process(s,E).processed,false);
  assert.equal(s.sold.length,1);assert.equal(s.cash,cash);
  assert.equal(s.ledger.length,ledger);
  valid(s);
});

test('supervisor asks for an actual live offer with no immediate sale or cash change',()=>{
  const {s,req}=approvalScenario();
  const m=s.messages.find(x=>x.reference==='sales-approval:'+req.customerId);
  assert.ok(m);assert.match(m.from,/STAFF SUPERVISOR/);
  assert.equal(IN.needsAction(m,s),true);
  assert.match(IN.quoteControls(m,s,E),/delegate-decision/);
  assert.equal(s.sold.length,0);
  assert.equal(req.status,'pending');
  valid(s);
});

test('approving a live deal uses real customer handover once',()=>{
  const {s,req}=approvalScenario(),oldCash=s.cash;
  const r=D.decide(s,E,req.id,'approved');
  assert.equal(r.ok,true,r.message);
  assert.equal(s.sold.length,1);
  assert.ok(s.sold[0].salespersonId);
  assert.ok(s.cash>oldCash);
  assert.equal(req.status,'approved');
  assert.equal(D.pending(s).length,0);
  assert.equal(D.decide(s,E,req.id,'approved').ok,false);
  assert.equal(s.messages.find(m=>m.reference==='sales-approval:'+req.customerId).decision,'approved');
  valid(s);
});

test('rejecting a supervisor request leaves the original car unsold',()=>{
  const {s,v,req}=approvalScenario(),cash=s.cash;
  assert.equal(D.decide(s,E,req.id,'declined').ok,true);
  assert.equal(s.cash,cash);assert.equal(s.sold.length,0);
  assert.ok(s.vehicles.some(x=>x.id===v.id));
  assert.equal(req.status,'declined');valid(s);
});

test('taking over a staff-owned customer is a real management intervention',()=>{
  const {s,v,req}=approvalScenario(),cash=s.cash;
  assert.equal(D.takeOver(s,E,v.id).ok,true);
  assert.equal(s.cash,cash);assert.equal(s.sold.length,0);
  assert.equal(s.customerCases[String(v.id)].salespersonId,null);
  assert.equal(req.status,'taken-over');valid(s);
});

test('three authority policies create meaningful saved risk differences',()=>{
  const s=E.createStaffed('Trading Policy QA',[]);
  const original=copy(s.delegation);
  assert.equal(D.setPolicy(s,'cautious').ok,true);
  const cautious=copy(s.delegation);
  assert.ok(cautious.minGross>original.minGross);
  assert.ok(cautious.maxDiscount<original.maxDiscount);
  assert.equal(D.setPolicy(s,'growth').ok,true);
  assert.ok(s.delegation.minGross<cautious.minGross);
  assert.ok(s.delegation.maxPartExchange>cautious.maxPartExchange);
  assert.equal(D.setPolicy(s,'unknown').ok,false);
  assert.equal(D.setMode(s,false).ok,true);
  assert.equal(D.process(s,E).processed,false);
  assert.match(D.brief(s),/PRIORITISE SALES/);
  valid(s);
});

test('tampered approval, fake authority, and missing supervisor mail reject saves',()=>{
  const {s}=approvalScenario();
  const forged=copy(s);forged.delegation.approvals[0].offered=-100;
  assert.equal(E.normalize(forged),null);
  const missingMail=copy(s);missingMail.messages=missingMail.messages.filter(m=>
    !String(m.reference).startsWith('sales-approval:'));
  assert.equal(E.normalize(missingMail),null);
  const broken=copy(s);broken.delegation.maxPartExchange=400000;
  assert.equal(E.normalize(broken),null);
  valid(s);
});
