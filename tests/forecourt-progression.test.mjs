// Run: node --test tests/forecourt-progression.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const scripts=['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js','monthly.js',
  'events.js','workshop.js','stock-ageing.js','showroom-traffic.js','customers.js','aftersales.js','empire-progression.js','motor-group.js','dealer-delegation.js','trading.js'];
const sandbox={window:{},Date,Intl};
for(const path of scripts)runInNewContext(
  readFileSync(new URL('../'+path,import.meta.url),'utf8'),sandbox,{filename:path});
const E=sandbox.window.MotorTradeEngine,S=E.premises,Q=E.showroom;
const clone=x=>JSON.parse(JSON.stringify(x));
function valid(state){assert.ok(E.normalize(clone(state)),'career save must reload');}
function day(state){
  Q.closeWaiting(state,'Trading day closed.');
  state.day++;E.rollAuctionHall(state);state.deadlineSession=0;
  E.staffDay(state);E.premisesDay(state);E.advanceWorkshop(state);E.advanceCustomers(state);
}
function funded(name,rep=42){
  const state=E.createStaffed(name,[]);
  state.cash+=650000;
  state.ledger.push({day:state.day,delta:650000,note:'Owner equity for unit test'});
  state.reputationScore=rep;state.reputation=E.people.tier(rep);S.sync(state);
  valid(state);return state;
}
function acquire(state,count){
  for(let d=0;d<30&&state.vehicles.length<count;d++){
    for(const source of E.marketFor(state).sellers){
      if(state.vehicles.length>=count)break;
      const result=E.acquireSeller(state,source.id,source.ask);
      assert.equal(result.ok,true,result.message);
    }
    if(state.vehicles.length<count)day(state);
  }
  assert.equal(state.vehicles.length,count,'not all sourced stock was purchased');
}

test('reputation unlocks permanent 4, 6, 8, 10 capacity automatically',()=>{
  for(const [rep,expected] of [[0,4],[19,4],[20,6],[39,6],[40,8],[42,8],[59,8],[60,10],[90,10]]){
    const state=E.createStaffed('Progression Test',[]);
    state.reputationScore=rep;S.sync(state);
    assert.equal(state.capacity,expected,'reputation '+rep);
    assert.equal(S.storageLimit(state),expected+2);
    valid(state);
  }
});

test('existing v17 Boss Motors with 42 reputation and 4 cars unlocks 8 plus 2 without losing cash',()=>{
  const original=funded('Boss Motors Legacy',5);
  acquire(original,4);
  original.reputationScore=42;original.reputation=E.people.tier(42);
  original.version=17;original.premises.forecourtLevel=0;
  original.capacity=4;
  const before=clone(original);
  const restored=E.normalize(before);
  assert.ok(restored);
  assert.equal(restored.version,18);
  assert.equal(restored.capacity,8);
  assert.equal(S.storageLimit(restored),10);
  assert.equal(restored.vehicles.length,4);
  assert.equal(restored.cash,before.cash);
  assert.deepEqual(Array.from(restored.ledger,x=>x.delta),before.ledger.map(x=>x.delta));
  assert.equal(restored.staff.length,before.staff.length);
  assert.equal(restored.sold.length,before.sold.length);
  valid(restored);
});

test('ten total vehicles allowed at 42 reputation, an eleventh rejected',()=>{
  const state=funded('Boundary Buying Test');
  acquire(state,10);
  assert.equal(state.capacity,8);
  assert.equal(S.overflowUsed(state),2);
  assert.equal(S.costs(state).offsite,44);
  assert.equal(S.storageLimit(state),10);
  day(state);
  let blocked=null;
  for(let i=0;i<7&&!blocked;i++){
    const source=E.marketFor(state).sellers[0];
    if(source)blocked=E.acquireSeller(state,source.id,source.ask);
    else day(state);
  }
  assert.equal(blocked?.ok,false);
  assert.equal(blocked?.code,'capacity');
  assert.equal(state.vehicles.length,10);
  valid(state);
});

test('temporary holding generates a real premises bill, then reduces as inventory is sold',()=>{
  const state=funded('Paid Storage Test');
  acquire(state,10);
  const oldCash=state.cash,oldRent=S.costs(state),count=state.vehicles.length;
  Q.closeWaiting(state,'Day closed.');
  state.day++;E.rollAuctionHall(state);state.deadlineSession=0;
  const charged=E.premisesDay(state);
  assert.equal(charged.offsite,44);
  assert.equal(charged.due,oldRent.total);
  assert.equal(state.cash,oldCash-oldRent.total);
  E.staffDay(state);E.advanceWorkshop(state);E.advanceCustomers(state);
  assert.ok(state.ledger.some(x=>x.day===state.day&&
    x.note.includes('offsite stock holding £44')));
  const disposal=E.disposeStock(state,state.vehicles.find(v=>v.workshop.stage==='unassessed').id);
  assert.equal(disposal.ok,true);
  assert.equal(state.vehicles.length,count-1);
  assert.equal(S.costs(state).offsite,22);
  valid(state);
});

test('earned space never shrinks, and workshop investment remains separate',()=>{
  const state=funded('No Shrinkage Test',60);
  const before=state.cash;
  assert.equal(state.capacity,10);
  state.reputationScore=5;S.sync(state);
  assert.equal(state.capacity,10);
  assert.equal(state.cash,before);
  state.reputationScore=42;S.sync(state);
  const manual=E.upgradePremises(state,'forecourt');
  assert.equal(manual.ok,false);
  assert.equal(manual.code,'max');
  const workshop=E.upgradePremises(state,'workshop');
  assert.equal(workshop.ok,true);
  assert.equal(S.bays(state),6);
  assert.equal(state.capacity,10);
  valid(state);
});

test('new v18 save with forged reputation threshold but no earned premises is rejected',()=>{
  const state=E.createStaffed('Tamper Test',[]);
  state.reputationScore=42;state.reputation=E.people.tier(42);
  assert.equal(E.normalize(clone(state)),null);
});
