import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const modules=[
 'vehicle-intel.js','vehicle-photos.js','vehicle-market.js',
 'premises.js','people.js','calendar.js','monthly.js','motor-group.js',
 'dealer-delegation.js','supervisor-operations.js','auction-supervisor.js',
 'events.js','showroom-traffic.js','workshop.js','stock-ageing.js',
 'customers.js','aftersales.js','manager-career.js','manager-induction.js',
 'manager-turnaround.js','manager-weekend.js','trading.js','inbox-office.js'
];
const window={},ctx={window,Date,Intl,document:{addEventListener(){}}};
for(const name of modules)vm.runInNewContext(
 readFileSync(new URL('../'+name,import.meta.url),'utf8'),ctx,{filename:name});
const E=window.MotorTradeEngine,MC=window.MotorTradeManagerCareer,
 IND=window.MotorTradeInduction,TURN=window.MotorTradeTurnaround,
 WEEK=window.MotorTradeWeekend,DELEG=window.MotorTradeDelegation;
const clone=v=>JSON.parse(JSON.stringify(v));
function employer(dealer=MC.firstJobs()[0]){
 const state=E.createStaffed(dealer.name,[]);
 assert.ok(IND.assignOpeningTeam(state,dealer.id));
 assert.ok(MC.enrol(state,'Alex Morgan',dealer.id,MC.DEFAULT_CV).ok);
 state.managerCareer.induction=IND.initial();
 state.messages=MC.welcome(state);
 assert.ok(TURN.initialize(state));
 for(let i=0;i<3;i++)assert.ok(IND.advance(state).ok);
 assert.ok(IND.complete(state,'balanced','balanced','liquidity').ok);
 assert.ok(E.normalize(clone(state)));
 return state;
}
function saturday(dealer){
 const state=employer(dealer);
 state.day=6;
 assert.equal(WEEK.ensure(state),true);
 E.rollAuctionHall(state);
 E.advanceCustomers(state);
 assert.ok(E.normalize(clone(state)));
 return state;
}
function clearApprovals(state){
 for(const request of DELEG.pending(state)){
  const result=DELEG.decide(state,E,request.id,'declined');
  assert.equal(result.ok,true,result.message);
 }
}
test('Saturday is three real sale checkpoints and is never a second month-end Deal Day',()=>{
 const state=saturday();
 assert.equal(WEEK.blocksContinue(state),true);
 assert.equal(WEEK.session(state).status,'briefing');
 assert.equal(window.MotorTradeEvents.isDealDay(state.day),false);
 assert.equal(WEEK.slot(state),0);
 assert.equal(WEEK.ensure(state),false);
 assert.ok(WEEK.render(state).includes('weekend-start'));
 assert.ok(E.normalize(clone(state)));
});
test('20 employers complete full Saturday with valid saves at every checkpoint',()=>{
 const focus=['cautious','balanced','growth'];
 const results=[];
 for(const [i,d] of MC.firstJobs().entries()){
  const state=saturday(d);
  const previous=state.delegation.maxDiscount;
  const start=WEEK.begin(state,E,focus[i%3]);
  assert.equal(start.ok,true,d.name);
  assert.equal(WEEK.session(state).status,'live');
  assert.equal(state.delegation.maxDiscount,DELEG.POLICIES.find(x=>x.key===focus[i%3]).maxDiscount);
  assert.ok(E.normalize(clone(state)),d.name+' opening save');
  for(let stage=0;stage<3;stage++){
   clearApprovals(state);
   const result=WEEK.advance(state,E);
   assert.equal(result.ok,true,d.name+' stage '+stage);
   assert.ok(E.normalize(clone(state)),d.name+' stage '+stage+' save');
  }
  assert.equal(WEEK.session(state).status,'review');
  assert.equal(state.delegation.maxDiscount,previous);
  assert.ok(WEEK.acknowledge(state).ok);
  assert.equal(WEEK.blocksContinue(state),false);
  assert.ok(E.normalize(clone(state)),d.name+' completion save');
  results.push(WEEK.session(state).result);
 }
 assert.ok(results.some(x=>x.sales>0),'real sales must be possible');
 assert.ok(results.some(x=>x.sales===0),'a dry trading Saturday must be possible');
 assert.ok(results.some(x=>x.missed>0),'real customer walkaways must be possible');
});
test('live offers prevent progressing until management resolves them',()=>{
 const state=saturday();
 assert.ok(WEEK.begin(state,E,'cautious').ok);
 for(let i=0;i<2;i++){
  clearApprovals(state);
  assert.ok(WEEK.advance(state,E).ok);
 }
 const pending=DELEG.pending(state);
 if(pending.length){
  const blocked=WEEK.advance(state,E);
  assert.equal(blocked.ok,false);
  assert.equal(blocked.pending,true);
  assert.equal(state.managerCareer.weekendTrading.current.phase,2);
  clearApprovals(state);
 }
 assert.ok(WEEK.advance(state,E).ok);
 assert.equal(WEEK.session(state).status,'review');
 assert.ok(E.normalize(clone(state)));
});
test('session is resumable from saved state and never replays completed checkpoints',()=>{
 const s=saturday();
 assert.ok(WEEK.begin(s,E,'growth').ok);
 const restored=E.normalize(clone(s));
 assert.ok(restored);
 assert.equal(restored.managerCareer.weekendTrading.current.phase,0);
 assert.equal(restored.managerCareer.weekendTrading.current.status,'live');
 clearApprovals(restored);
 assert.equal(WEEK.advance(restored,E).ok,true);
 assert.equal(WEEK.session(restored).phase,1);
 const middle=E.normalize(clone(restored));
 assert.ok(middle);
 assert.equal(WEEK.session(middle).phase,1);
 clearApprovals(middle);assert.ok(WEEK.advance(middle,E).ok);
 clearApprovals(middle);assert.ok(WEEK.advance(middle,E).ok);
 assert.equal(WEEK.session(middle).status,'review');
 assert.ok(WEEK.acknowledge(middle).ok);
 const cash=middle.cash,units=middle.sold.length;
 assert.equal(WEEK.acknowledge(middle).ok,false);
 assert.equal(WEEK.advance(middle,E).ok,false);
 assert.equal(middle.cash,cash);
 assert.equal(middle.sold.length,units);
 assert.ok(E.normalize(clone(middle)));
});
test('next Saturday archives the previous real results without duplicating them',()=>{
 const state=saturday();
 assert.ok(WEEK.begin(state,E,'balanced').ok);
 for(let i=0;i<3;i++){
  clearApprovals(state);assert.ok(WEEK.advance(state,E).ok);
 }
 assert.ok(WEEK.acknowledge(state).ok);
 state.day=7;E.rollAuctionHall(state);E.advanceCustomers(state);
 assert.equal(WEEK.blocksContinue(state),false);
 assert.ok(E.normalize(clone(state)));
 state.day=13;
 assert.equal(WEEK.ensure(state),true);
 E.rollAuctionHall(state);E.advanceCustomers(state);
 assert.equal(state.managerCareer.weekendTrading.history.length,1);
 assert.equal(WEEK.session(state).status,'briefing');
 assert.equal(WEEK.session(state).day,13);
 assert.equal(WEEK.ensure(state),false);
 assert.equal(state.managerCareer.weekendTrading.history.length,1);
 assert.ok(E.normalize(clone(state)));
});
test('legacy owner and old manager careers still load unchanged',()=>{
 const owner=E.createStaffed('Legacy Dealer Ltd',[]);
 assert.ok(E.normalize(clone(owner)));
 const d=MC.firstJobs()[0],old=E.createStaffed(d.name,[]);
 assert.ok(MC.enrol(old,'Alex Morgan',d.id,MC.DEFAULT_CV).ok);
 old.messages=MC.welcome(old);
 assert.ok(E.normalize(clone(old)));
 assert.equal(WEEK.render(old),'');
});
test('unsupported session states and fake results never pass save validation',()=>{
 const s=saturday();WEEK.begin(s,E,'balanced');
 const tampered=clone(s);
 tampered.managerCareer.weekendTrading.current.phase=7;
 assert.equal(E.normalize(tampered),null);
 const wrong=clone(s);
 wrong.managerCareer.weekendTrading.current.focus='free-profit';
 assert.equal(E.normalize(wrong),null);
 const fake=clone(s);
 fake.managerCareer.weekendTrading.current.status='review';
 fake.managerCareer.weekendTrading.current.phase=2;
 fake.managerCareer.weekendTrading.current.result={
  sales:'100',gross:1000000,served:5,missed:0,enquiries:5,cashDelta:0
 };
 assert.equal(E.normalize(fake),null);
});
