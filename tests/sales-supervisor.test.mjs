import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const files=['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js','monthly.js',
  'empire-progression.js','motor-group.js','dealer-delegation.js',
  'supervisor-operations.js','auction-supervisor.js','events.js',
  'workshop.js','stock-ageing.js','showroom-traffic.js','customers.js',
  'aftersales.js','trading.js','inbox-office.js','vehicle-cards.js',
  'customers-view.js'];
const window={},ctx={window,Date,Intl,
  document:{addEventListener(){}}};
for(const path of files)vm.runInNewContext(
  readFileSync(new URL('../'+path,import.meta.url),'utf8'),ctx,{filename:path});
const E=window.MotorTradeEngine,D=window.MotorTradeDelegation,
  IN=window.MotorTradeInbox,CV=window.MotorTradeCustomersView;
const clone=x=>JSON.parse(JSON.stringify(x));
const valid=s=>assert.ok(E.normalize(clone(s)),'v24 career and supervisor history must reload');
function tick(s){
  const close=s.day===s.monthPlan.endDay;
  if(close){window.MotorTradeGroup.closeMonth(s);E.monthly.close(s);}
  E.showroom.closeWaiting(s,'Day closed');
  s.day++;E.rollAuctionHall(s);s.deadlineSession=0;
  if(close)E.monthly.next(s);
  E.staffDay(s);E.premisesDay(s);E.stockAgeingDay(s);
  E.advanceWorkshop(s);E.advanceCustomers(s);E.advanceAfterSales(s);
  window.MotorTradeGroup.advance(s);
}
function stock(name='Supervisor Sales QA'){
  const s=E.createStaffed(name,[]);
  s.cash+=500000;
  s.ledger.push({day:s.day,delta:500000,note:'Test owner equity'});
  const seller=E.marketFor(s).sellers[0];
  assert.equal(E.acquireSeller(s,seller.id,seller.ask).ok,true);
  const v=s.vehicles[0];
  assert.equal(E.assessStock(s,v.id).ok,true);
  assert.equal(E.startPrep(s,v.id,'internal').ok,true);
  for(let i=0;i<25&&v.status==='acquired';i++){
    if(v.workshop.stage==='quality-check')
      assert.equal(E.finishPrep(s,v.id).ok,true);
    else tick(s);
  }
  assert.equal(v.status,'prepared');
  assert.equal(E.advertise(s,v.id,v.profile.likelySale+125).ok,true);
  assert.ok(E.showroom.waiting(s).length>0,
    'expected real deterministic showroom visitors for this scenario');
  valid(s);
  return {s,v};
}
test('supervisor assigns actual walk-ins and staff handle retail without owner clicking',()=>{
  const {s}=stock('Automated Supervisory Sales');
  const supervisor=E.people.supervisor(s);
  assert.ok(supervisor);
  const oldCash=s.cash;
  const r=D.process(s,E);
  assert.equal(r.processed,true);
  assert.ok(r.assigned>0);
  assert.ok(r.served>0);
  assert.equal(s.showroom.ownerUsed,0);
  assert.equal(s.sold.length,1);
  assert.ok(s.sold[0].salespersonId);
  assert.ok(s.cash>oldCash);
  assert.ok(s.delegation.audit.some(x=>x.action==='assignment'&&
    x.note.includes(supervisor.name)&&x.note.includes('assigned')));
  const same=D.process(s,E);
  assert.equal(same.processed,false);
  assert.equal(s.sold.length,1);
  valid(s);
});
test('one staff adviser cannot serve unlimited showroom visitors in a session',()=>{
  const {s}=stock('Sales Capacity QA');
  const available=E.people.activeTeam(s,'sales');
  assert.equal(available.length,1);
  const initialQueue=E.showroom.waiting(s).length;
  assert.ok(initialQueue>=2,'there should be competing live visitors');
  D.process(s,E);
  assert.ok(s.showroom.staffUsed.length<=1);
  assert.equal(s.showroom.ownerUsed,0);
  assert.ok(s.sold.length<=1);
  valid(s);
});
test('supervisor absence prevents new allocations without inventing replacement workers',()=>{
  const {s}=stock('Supervisor Vacancy QA');
  const supervisor=E.people.supervisor(s);
  assert.ok(E.people.release(s,supervisor.id).ok);
  const cash=s.cash,queue=E.showroom.waiting(s).length;
  const result=D.process(s,E);
  assert.equal(result.assigned,0);
  assert.equal(result.served,0);
  assert.equal(s.showroom.ownerUsed,0);
  assert.equal(E.showroom.waiting(s).length,queue);
  assert.equal(s.cash,cash);
  valid(s);
});
test('manually assigned live customer still gets served in current session',()=>{
  const {s,v}=stock('Assigned Visitor QA');
  const [visitor]=E.showroom.waiting(s);
  const rep=E.showroom.availableStaff(s)[0];
  assert.equal(E.welcomeShowroom(s,visitor.id,rep.id).ok,true);
  const result=D.process(s,E);
  assert.equal(result.served,0,'no second person is served');
  assert.equal(s.showroom.staffUsed.filter(id=>id===rep.id).length,1);
  const c=E.customers.caseFor(s,v.id);
  assert.ok(c?.status==='lost'||s.sold.length===1||D.pending(s).length>0,
    'existing staff appointment should progress to a decision');
  valid(s);
});
test('staff-managed Sales Office shows status only, with no assign/owner-serve controls',()=>{
  const {s}=stock('Sales Office UI QA');
  const ui=CV.render(s,E).html;
  assert.match(ui,/SUPERVISOR-RUN SHOWROOM/);
  assert.match(ui,/CUSTOMER ALLOCATION & STAFF COVERAGE/);
  assert.match(ui,/OWNER EXCEPTIONS/);
  assert.doesNotMatch(ui,/data-action="assign-showroom"/);
  assert.doesNotMatch(ui,/data-action="welcome-showroom"/);
  assert.match(ui,/data-page="inbox"/);
  valid(s);
});
test('retail staff appointments do not generate owner to-do mail',()=>{
  const {s,v}=stock('Staff Appointment QA');
  const c={
    id:'C-'+s.day+'-0-'+v.id+'-5555',vehicleId:v.id,
    createdDay:s.day,createdSession:0,name:'Casey Shaw',channel:'ONLINE',
    status:'enquiry',preferredMode:'cash',appointmentDay:null,agreedDay:null,
    price:null,allowance:null,collectionDay:null,held:0,counters:0,reason:'',
    terms:'in-person',prepCost:0,exchange:null,
    salespersonId:E.people.activeTeam(s,'sales')[0].id,standby:null,
    objectionStatus:'unraised',objectionAction:'none',
    evidenceTried:false,remedyCost:0,priceDiscount:0,trustPenalty:0
  };
  s.customerCases[String(v.id)]=c;
  assert.equal(E.bookCustomer(s,v.id).ok,true);
  IN.sync(s,E);
  assert.equal(s.messages.filter(m=>String(m.reference).startsWith('viewing:')).length,0);
  valid(s);
});
test('sales supervisor pricing exceptions remain owner-only and cannot settle twice',()=>{
  const {s}=stock('Owner Approval QA');
  s.delegation.maxDiscount=0;s.delegation.minGross=5000;
  const r=D.process(s,E);
  assert.ok(r.escalated>0);
  const req=D.pending(s)[0];
  assert.ok(req);
  const message=s.messages.find(m=>m.reference==='sales-approval:'+req.customerId);
  assert.ok(message);assert.equal(IN.needsAction(message,s),true);
  const sale=D.decide(s,E,req.id,'approved');
  assert.equal(sale.ok,true,sale.message);
  assert.equal(s.sold.length,1);
  assert.equal(D.decide(s,E,req.id,'approved').ok,false);
  valid(s);
});
