// Run: node --test tests/showroom-traffic.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const files=['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js','monthly.js',
  'events.js','workshop.js','showroom-traffic.js','customers.js','trading.js'];
const context={window:{},Date,Intl};
for(const path of files)runInNewContext(
  readFileSync(new URL('../'+path,import.meta.url),'utf8'),context,{filename:path}
);
const E=context.window.MotorTradeEngine,Q=E.showroom,C=E.customers;
const copy=x=>JSON.parse(JSON.stringify(x));
const check=s=>assert.ok(E.normalize(copy(s)),'serialized career must reload');
function day(s){
  Q.closeWaiting(s,'Day closed without a viewing.');
  s.day++;E.rollAuctionHall(s);s.deadlineSession=0;
  E.staffDay(s);E.premisesDay(s);E.advanceWorkshop(s);E.advanceCustomers(s);
}
function listed(name='Showroom Check 0'){
  const s=E.createStaffed(name,[]);
  const lead=E.marketFor(s).sellers[0];
  assert.equal(E.acquireSeller(s,lead.id,lead.ask).ok,true);
  const v=s.vehicles[0];
  assert.equal(E.assessStock(s,v.id).ok,true);
  assert.equal(E.startPrep(s,v.id,'internal').ok,true);
  for(let i=0;i<12&&v.status==='acquired';i++){
    if(v.workshop.stage==='quality-check')assert.equal(E.finishPrep(s,v.id).ok,true);
    else day(s);
  }
  assert.equal(v.status,'prepared');
  assert.equal(E.advertise(s,v.id,v.profile.likelySale+250).ok,true);
  check(s);
  return {s,v};
}
function twoVisitors(name='Showroom Check 0'){
  const data=listed(name);
  for(let i=0;i<20&&Q.waiting(data.s).length<2;i++)day(data.s);
  assert.ok(Q.waiting(data.s).length>=2,'expected deterministic competing visitors');
  return data;
}
test('new showroom is deterministic, finite and replay-safe',()=>{
  const {s}=twoVisitors();
  assert.ok(Q.waiting(s).length<=7);
  const names=Q.waiting(s).map(q=>q.id);
  const restored=E.normalize(copy(s));
  assert.deepEqual(Array.from(Q.waiting(restored),q=>q.id),names);
  const before=Q.waiting(s).length;
  Q.refresh(s);
  assert.equal(Q.waiting(s).length,before,'opening Sales Office cannot reroll visits');
  check(s);
});
test('real customer can be assigned to sales employee without consuming proprietor capacity',()=>{
  const {s,v}=twoVisitors();
  const first=Q.waiting(s)[0];
  const sales=Q.availableStaff(s)[0];
  assert.ok(sales);
  const cash=s.cash;
  assert.equal(E.welcomeShowroom(s,first.id,sales.id).ok,true);
  assert.equal(C.caseFor(s,v.id).id,first.customerId);
  assert.equal(C.caseFor(s,v.id).salespersonId,sales.id);
  assert.equal(s.showroom.ownerUsed,0);
  assert.equal(s.cash,cash);
  assert.equal(Q.availableStaff(s).some(r=>r.id===sales.id),false);
  check(s);
});
test('one salesperson cannot handle another buyer this session, but the owner can',()=>{
  const {s,v}=twoVisitors();
  const [first,second]=Q.waiting(s),rep=Q.availableStaff(s)[0];
  assert.equal(E.welcomeShowroom(s,first.id,rep.id).ok,true);
  assert.equal(E.cancelCustomer(s,v.id,'dealer').ok,true);
  assert.equal(E.welcomeShowroom(s,second.id,rep.id).ok,false);
  assert.equal(E.welcomeShowroom(s,second.id,null).ok,true);
  assert.equal(C.caseFor(s,v.id).name,second.name);
  assert.equal(s.showroom.ownerUsed,1);
  check(s);
});
test('an urgent visitor can leave while the owner serves another prospect',()=>{
  const {s}=listed('Showroom Flow 1');
  let found=false;
  for(let i=0;i<15&&!found;i++){
    const queue=Q.waiting(s),urgent=queue.find(q=>q.maxTurns===1);
    const other=queue.find(q=>q.id!==urgent?.id&&q.maxTurns>=2);
    if(urgent&&other){
      assert.equal(E.welcomeShowroom(s,other.id,null).ok,true);
      assert.equal(s.showroom.leads.find(q=>q.id===urgent.id)?.status,'lost');
      assert.ok(s.customerHistory.some(h=>h.leadId===urgent.customerId&&
        h.type==='showroom-left'));
      found=true;
      check(s);
    }else day(s);
  }
  assert.ok(found);
});
test('unsecured appointment is preserved when competing buyer walks away',()=>{
  const {s,v}=twoVisitors();
  const booked={id:'C-'+s.day+'-0-'+v.id+'-4444',vehicleId:v.id,
    createdDay:s.day,createdSession:0,name:'Prior Buyer',channel:'ONLINE',
    status:'enquiry',preferredMode:'cash',appointmentDay:null,agreedDay:null,
    price:null,allowance:null,collectionDay:null,held:0,counters:0,reason:'',
    terms:'in-person',prepCost:0,exchange:null,salespersonId:1,
    objectionStatus:'unraised',objectionAction:'none',
    evidenceTried:false,remedyCost:0,priceDiscount:0,trustPenalty:0};
  s.customerCases[String(v.id)]=booked;
  assert.equal(E.bookCustomer(s,v.id).ok,true);
  const rival=Q.waiting(s)[0];
  assert.equal(E.welcomeShowroom(s,rival.id,null).ok,true);
  assert.equal(C.caseFor(s,v.id).standby?.id,booked.id);
  assert.equal(E.cancelCustomer(s,v.id,'dealer').ok,true);
  assert.equal(C.caseFor(s,v.id).id,booked.id);
  assert.equal(C.caseFor(s,v.id).status,'booked');
  day(s);
  assert.equal(C.caseFor(s,v.id).status,'arrived');
  check(s);
});
test('£250 deposit removes all unsecured rival visitors without double selling',()=>{
  const {s,v}=twoVisitors('Deposit Queue Check');
  const [first,second]=Q.waiting(s);
  assert.equal(E.welcomeShowroom(s,first.id,Q.availableStaff(s)[0].id).ok,true);
  assert.equal(E.testDrive(s,v.id).ok,true);
  assert.equal(E.respondCustomer(s,v.id,'inspection').ok,true);
  assert.equal(E.agreeCustomer(s,v.id,'cash',null).ok,true);
  assert.equal(E.depositCustomer(s,v.id).ok,true);
  assert.ok(!Q.customer(s,second.id));
  assert.equal(s.showroom.leads.find(q=>q.id===second.id).status,'lost');
  check(s);
  const due=C.caseFor(s,v.id).collectionDay;
  while(s.day<due)day(s);
  assert.equal(C.caseFor(s,v.id).status,'collectable');
  assert.equal(E.completeSale(s,v.id,'cash',null).ok,true);
  assert.equal(s.sold.length,1);
  assert.equal(s.sold[0].depositApplied,250);
  assert.ok(s.sold[0].salesCommission>0);
  assert.equal(s.ledger.filter(x=>x.note.startsWith('Customer remedy at handover:')).length,1);
  check(s);
});
test('old v16 saves migrate with no fake customer services or expenses',()=>{
  const {s}=listed('Legacy Showroom');
  const old=copy(s);old.version=16;delete old.showroom;
  const migrated=E.normalize(old);
  assert.ok(migrated);
  assert.equal(migrated.version,17);
  assert.ok(migrated.showroom);
  assert.equal(migrated.showroom.ownerUsed,0);
  assert.deepEqual(Array.from(migrated.showroom.staffUsed),[]);
  check(migrated);
});
test('damaged queue, forged free capacity and stale waiting stock are rejected',()=>{
  const {s}=twoVisitors();
  const fake=copy(s);fake.showroom.ownerUsed=3;fake.showroom.turn=3;
  assert.equal(E.normalize(fake),null);
  const stale=copy(s);stale.showroom.leads.find(q=>q.status==='waiting').vehicleId=99999;
  assert.equal(E.normalize(stale),null);
});
