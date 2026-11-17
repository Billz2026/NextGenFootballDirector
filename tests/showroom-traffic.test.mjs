// Run: node --test tests/showroom-traffic.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const files=['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js','monthly.js',
  'events.js','workshop.js','stock-ageing.js','showroom-traffic.js','customers.js','aftersales.js','trading.js'];
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
  const names=Array.from(Q.waiting(s),q=>q.id);
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
  assert.equal(migrated.version,E.VERSION);
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

test('final patient showroom visitor can be served when owner slots and sales rep are exhausted',()=>{
  const {s,v}=twoVisitors('Last Showroom Visitor');
  const rep=Q.availableStaff(s)[0];
  assert.ok(rep,'test requires the real opening salesperson');
  // Build the exact in-session state seen by the player: one salesperson
  // has served a visitor, two owner consultations are complete, and one
  // patient buyer is still waiting for the same listed stock.
  const base=Q.waiting(s)[0];
  s.showroom.leads=Array.from({length:4},(_,i)=>({
    ...base,
    id:'Q-'+s.day+'-'+s.showroom.session+'-'+v.id+'-'+i,
    customerId:'C-'+s.day+'-'+s.showroom.session+'-'+v.id+'-'+(81000+i),
    name:['Sales Rep Buyer','Owner First Buyer','Owner Second Buyer','Final Patient Buyer'][i],
    status:'waiting',handledBy:null,reason:'',
    maxTurns:[1,1,2,3][i]
  }));
  check(s);
  const [handled,first,second,last]=s.showroom.leads;
  assert.equal(E.welcomeShowroom(s,handled.id,rep.id).ok,true);
  assert.equal(E.cancelCustomer(s,v.id,'dealer').ok,true);
  assert.equal(E.welcomeShowroom(s,first.id,null).ok,true);
  assert.equal(E.cancelCustomer(s,v.id,'dealer').ok,true);
  assert.equal(E.welcomeShowroom(s,second.id,null).ok,true);
  assert.equal(E.cancelCustomer(s,v.id,'dealer').ok,true);
  assert.equal(s.showroom.ownerUsed,2);
  assert.equal(Q.availableStaff(s).length,0);
  assert.deepEqual(Array.from(Q.waiting(s),q=>q.id),[last.id]);
  assert.equal(Q.ownerSlots(s).finalAvailable,true);
  assert.equal(Q.canServe(s,last.id,null).ok,true,
    'patient final shopper must not be blocked by the normal owner limit');
  const beforeCash=s.cash;
  const welcomed=E.welcomeShowroom(s,last.id,null);
  assert.equal(welcomed.ok,true,welcomed.message);
  assert.match(welcomed.message,/final owner consultation/);
  assert.equal(s.showroom.ownerUsed,3);
  assert.equal(s.showroom.turn,3);
  assert.equal(C.caseFor(s,v.id).id,last.customerId);
  assert.equal(s.cash,beforeCash,'serving the extra visitor is not an invented transaction');
  assert.equal(Q.waiting(s).length,0);
  assert.equal(Q.canServe(s,last.id,null).ok,false,'same visitor cannot be served twice');
  check(s);
  const recovered=E.normalize(copy(s));
  assert.equal(recovered.showroom.ownerUsed,3,'the third consultation must survive a real career save');
  assert.equal(recovered.customerCases[String(v.id)].id,last.customerId);
});
test('final owner consultation is reserved when no salesperson is free and cannot be used indefinitely',()=>{
  const {s}=twoVisitors('No Free Owner Shortcut');
  const q=Q.waiting(s)[0];
  // Two genuine completed owner consultations in this session are enough
  // for the owner-capacity guard; a free salesperson must be used first.
  const existing=s.showroom.leads.filter(x=>x.id!==q.id).slice(0,2);
  while(existing.length<2)existing.push({...q,
    id:'Q-'+s.day+'-'+s.showroom.session+'-'+q.vehicleId+'-'+(5+existing.length),
    customerId:'C-'+s.day+'-'+s.showroom.session+'-'+q.vehicleId+'-'+(92000+existing.length)});
  s.showroom.leads=[...existing.map(x=>({...x,status:'served',handledBy:null,
    reason:'',maxTurns:3})),{...q,maxTurns:3}];
  s.showroom.ownerUsed=2;s.showroom.turn=2;
  assert.equal(Q.availableStaff(s).length,1);
  assert.equal(Q.ownerSlots(s).finalAvailable,false);
  assert.equal(Q.canServe(s,q.id,null).code,'owner-busy');
  assert.equal(Q.canServe(s,q.id,Q.availableStaff(s)[0].id).ok,true);
  check(s);
  s.showroom.ownerUsed=3;s.showroom.turn=3;
  s.showroom.leads[s.showroom.leads.length-1].status='lost';
  assert.equal(Q.ownerSlots(s).finalAvailable,false);
  assert.equal(Q.canServe(s,q.id,null).ok,false);
});
