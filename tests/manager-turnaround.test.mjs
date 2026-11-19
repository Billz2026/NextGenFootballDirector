import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const modules=[
  'vehicle-intel.js','vehicle-photos.js','vehicle-market.js',
  'premises.js','people.js','calendar.js','monthly.js',
  'motor-group.js','dealer-delegation.js','supervisor-operations.js',
  'auction-supervisor.js','events.js','showroom-traffic.js','workshop.js',
  'stock-ageing.js','customers.js','aftersales.js',
  'manager-career.js','manager-induction.js','trading.js',
  'manager-turnaround.js','inbox-office.js'
];
const window={},context={window,Date,Intl,document:{addEventListener(){}}};
for(const path of modules)
  vm.runInNewContext(readFileSync(new URL('../'+path,import.meta.url),'utf8'),
    context,{filename:path});
const E=window.MotorTradeEngine,M=window.MotorTradeManagerCareer,
  T=window.MotorTradeTurnaround,I=window.MotorTradeInduction,
  AG=window.MotorTradeStockAgeing;
const copy=value=>JSON.parse(JSON.stringify(value));
function create(dealer){
  const state=E.createStaffed(dealer.name,[]);
  assert.equal(I.assignOpeningTeam(state,dealer.id),true);
  assert.equal(M.enrol(state,'Alex Morgan',dealer.id,M.DEFAULT_CV).ok,true);
  state.managerCareer.induction=I.initial();
  state.messages=M.welcome(state);
  assert.equal(T.initialize(state),true);
  return state;
}
test('each beginner employer inherits three genuine catalogue vehicles with audited book capital',()=>{
  const combinations=new Set();
  for(const dealer of M.firstJobs()){
    const state=create(dealer),cash=dealer.openingCash;
    assert.equal(state.cash,cash);
    assert.equal(state.vehicles.length,3);
    assert.equal(state.stock,3);
    assert.equal(state.nextId,4);
    assert.equal(state.ledger.filter(x=>x.note.startsWith('Opening employer inventory')).length,1);
    const capitalRow=state.ledger.find(x=>x.note.startsWith('Opening employer inventory'));
    assert.equal(capitalRow.delta,0);
    assert.equal(state.managerCareer.turnaround.openingCash,cash);
    assert.equal(state.managerCareer.turnaround.openingBasis,
      state.vehicles.reduce((n,v)=>n+v.cost+v.prepSpent,0));
    assert.equal(state.vehicles.filter(v=>v.status==='listed').length,2);
    assert.equal(state.vehicles.filter(v=>v.status==='acquired').length,1);
    assert.deepEqual(state.vehicles.map(v=>v.openingAgeDays),[48,12,5]);
    for(const v of state.vehicles){
      assert.equal(v.acquiredDay,1);
      assert.ok(E.workshop.valid(v,state.day));
      assert.ok(window.MotorTradeIntel.validProfile(v.profile));
    }
    assert.equal(AG.age(state,state.vehicles[0]),48);
    assert.equal(AG.fee(AG.age(state,state.vehicles[0])),28);
    combinations.add(state.vehicles.map(v=>v.title).join('|'));
    const restored=E.normalize(copy(state));
    assert.ok(restored,dealer.name+' must survive a genuine save/reload');
    assert.equal(restored.cash,cash);
    assert.equal(restored.managerCareer.turnaround.openingBasis,
      state.managerCareer.turnaround.openingBasis);
  }
  assert.ok(combinations.size>=10);
});
test('reprice action uses real advertising, changes the asking price and survives reload',()=>{
  const state=create(M.firstJobs()[0]),vehicle=state.vehicles[0];
  const before=vehicle.asking,cash=state.cash,ledgerSize=state.ledger.length;
  const outcome=T.reprice(state,vehicle.id);
  assert.equal(outcome.ok,true);
  assert.ok(vehicle.asking<before);
  assert.equal(state.cash,cash);
  assert.equal(state.ledger.length,ledgerSize);
  assert.equal(state.managerCareer.turnaround.decisions[0].kind,'reprice');
  assert.ok(E.normalize(copy(state)));
  assert.equal(T.reprice(state,vehicle.id).ok,false,
    'cannot repeatedly obtain the same first price cut');
});
test('hold-price strategy has no phantom income, but retains age exposure',()=>{
  const state=create(M.firstJobs()[1]),v=state.vehicles[0];
  const price=v.asking,cash=state.cash;
  assert.equal(T.hold(state,v.id).ok,true);
  assert.equal(state.cash,cash);
  assert.equal(v.asking,price);
  assert.equal(AG.age(state,v),48);
  assert.equal(T.hold(state,v.id).ok,false);
  assert.ok(E.normalize(copy(state)));
});
test('tampered origin, pre-appointment age, or opening book costs are rejected',()=>{
  const s=create(M.firstJobs()[0]);
  for(const mutate of [
    x=>{x.vehicles[0].openingAgeDays=120;},
    x=>{x.vehicles[0].cost-=500;},
    x=>{x.managerCareer.turnaround.openingBasis+=500;},
    x=>{x.managerCareer.turnaround.cars[0].openingAgeDays=120;},
    x=>{x.ledger.find(l=>l.note.startsWith('Opening employer inventory')).delta=1000;x.cash+=1000;}
  ]){
    const bad=copy(s);mutate(bad);
    assert.equal(E.normalize(bad),null);
  }
});
test('day-seven and fortnight messages use factual business records, never synthetic sales',()=>{
  const state=create(M.firstJobs()[0]);
  state.day=8;
  assert.equal(T.checkpoint(state),true);
  assert.equal(T.checkpoint(state),false);
  const week=state.messages.find(m=>m.reference==='manager-fortnight:'+
    state.managerCareer.employerId+':8');
  assert.ok(week);
  assert.match(week.body,/Real completed retail handovers: 0/);
  assert.equal(state.sold.length,0);
  const balance=state.cash;
  state.day=15;
  assert.equal(T.checkpoint(state),true);
  assert.equal(T.checkpoint(state),false);
  assert.equal(state.cash,balance);
  assert.equal(state.messages.filter(m=>m.reference?.startsWith('manager-fortnight:')).length,2);
});
test('legacy owner saves and earlier managers without fortnight field still load',()=>{
  const owner=E.createStaffed('Original Owner Motors',[]);
  assert.ok(E.normalize(copy(owner)));
  const d=M.firstJobs()[0];
  const old=E.createStaffed(d.name,[]);
  assert.equal(M.enrol(old,'Alex Morgan',d.id,M.DEFAULT_CV).ok,true);
  old.messages=M.welcome(old);
  assert.ok(E.normalize(copy(old)));
  assert.equal(T.progress(old),null);
});

test('new Manager Desk presents actionable real pricing and workshop controls',()=>{
  const state=create(M.firstJobs()[0]);
  const html=T.render(state);
  assert.match(html,/MANAGER’S DESK/);
  assert.match(html,/data-action="turnaround-reprice"/);
  assert.match(html,/data-action="turnaround-hold"/);
  assert.match(html,/data-page="workshop"/);
  assert.match(html,/14 DAYS LEFT/);
  const legacy=E.createStaffed('Old Operator Ltd',[]);
  assert.equal(T.render(legacy),'','legacy owners have no synthetic manager challenge');
});
