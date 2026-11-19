import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const modules=['vehicle-intel.js','vehicle-photos.js','vehicle-market.js',
  'premises.js','people.js','calendar.js','monthly.js','motor-group.js',
  'dealer-delegation.js','supervisor-operations.js','auction-supervisor.js',
  'events.js','showroom-traffic.js','workshop.js','stock-ageing.js',
  'customers.js','aftersales.js','manager-career.js',
  'manager-induction.js','trading.js','inbox-office.js'];
const window={},ctx={window,Date,Intl,document:{addEventListener(){}}};
for(const name of modules)vm.runInNewContext(
  readFileSync(new URL('../'+name,import.meta.url),'utf8'),ctx,{filename:name});
const E=window.MotorTradeEngine,MC=window.MotorTradeManagerCareer,
  IND=window.MotorTradeInduction;
const clone=value=>JSON.parse(JSON.stringify(value));
function create(d){
  const s=E.createStaffed(d.name,[]);
  assert.equal(IND.assignOpeningTeam(s,d.id),true);
  assert.equal(MC.enrol(s,'Alex Morgan',d.id,MC.DEFAULT_CV).ok,true);
  s.managerCareer.induction=IND.initial();
  s.messages=MC.welcome(s);
  return s;
}
test('the 20 starter dealerships employ different valid actual rosters',()=>{
  const seen=new Set();
  for(const d of MC.firstJobs()){
    const s=create(d);
    assert.equal(s.staff.length,4);
    assert.deepEqual(s.staff.map(e=>e.role),['sales','buyer','technician','supervisor']);
    assert.equal(s.nextStaffId,5);
    seen.add(s.staff.map(e=>e.name).join('|'));
    assert.equal(s.cash,d.openingCash);
    assert.ok(E.normalize(clone(s)),d.name+' start must reload');
  }
  assert.ok(seen.size>=5,'all employers should not have an identical team');
});
test('no sales policy, cash or jobs change when only reading induction stages',()=>{
  const s=create(MC.firstJobs()[0]);
  const cash=s.cash,ledger=clone(s.ledger),origDiscount=s.delegation.maxDiscount;
  assert.equal(IND.pending(s),true);
  for(const i of [1,2,3]){
    assert.equal(IND.advance(s).ok,true);
    assert.equal(s.managerCareer.induction.step,i);
    assert.equal(s.day,1);
    assert.ok(E.normalize(clone(s)));
  }
  assert.equal(s.cash,cash);
  assert.deepEqual(clone(s.ledger),ledger);
  assert.equal(s.delegation.maxDiscount,origDiscount);
  assert.equal(IND.advance(s).ok,false);
});
test('manager must complete all required stages before authorising decisions',()=>{
  const s=create(MC.firstJobs()[0]);
  assert.equal(IND.complete(s,'growth','protect','liquidity').ok,false);
  assert.equal(IND.advance(s).ok,true);
  assert.equal(IND.advance(s).ok,true);
  assert.equal(IND.advance(s).ok,true);
  assert.equal(IND.complete(s,'anything','protect','liquidity').ok,false);
  assert.equal(IND.complete(s,'growth','anything','liquidity').ok,false);
  assert.equal(IND.complete(s,'growth','protect','anything').ok,false);
  assert.equal(s.delegation.maxDiscount,350);
  assert.equal(s.operations.maxPurchase,10000);
});
test('accepted manager induction applies genuine sales and workshop policies once',()=>{
  const d=MC.firstJobs()[0],s=create(d);
  const originalCash=s.cash,originalLedger=clone(s.ledger);
  for(let i=0;i<3;i++)IND.advance(s);
  const done=IND.complete(s,'growth','protect','liquidity');
  assert.equal(done.ok,true);
  assert.equal(s.delegation.maxDiscount,750);
  assert.equal(s.delegation.minGross,350);
  assert.equal(s.operations.maxPurchase,6000);
  assert.equal(s.operations.maxRepair,650);
  assert.equal(s.operations.maxStock,2);
  assert.equal(s.cash,originalCash);
  assert.deepEqual(clone(s.ledger),originalLedger);
  assert.equal(IND.pending(s),false);
  assert.equal(s.managerCareer.induction.completedDay,1);
  const emails=s.messages.filter(x=>x.reference==='manager-induction:'+d.id);
  assert.equal(emails.length,1);
  const validated=E.normalize(clone(s));
  assert.ok(validated,'completed induction must survive browser save/reload');
  assert.equal(validated.managerCareer.induction.firstPriority,'liquidity');
  assert.equal(IND.complete(s,'growth','protect','liquidity').ok,false);
  assert.equal(s.messages.filter(x=>x.reference==='manager-induction:'+d.id).length,1);
});
test('old manager careers lacking induction remain playable after migration',()=>{
  const d=MC.firstJobs()[0],s=E.createStaffed(d.name,[]);
  assert.equal(MC.enrol(s,'Alex Morgan',d.id,MC.DEFAULT_CV).ok,true);
  s.messages=MC.welcome(s);
  assert.ok(E.normalize(clone(s)));
  assert.equal(IND.pending(s),false);
  assert.ok(E.normalize(clone(E.createStaffed('Old Owner Motors',[]))));
});
test('tampered unfinished induction cannot be advanced to day 2',()=>{
  const s=create(MC.firstJobs()[0]);
  s.day=2;
  assert.equal(E.normalize(clone(s)),null);
});
