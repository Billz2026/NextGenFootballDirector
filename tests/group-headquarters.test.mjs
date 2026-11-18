import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const scripts=['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js','monthly.js',
  'empire-progression.js','motor-group.js','events.js','workshop.js',
  'stock-ageing.js','showroom-traffic.js','customers.js','aftersales.js',
  'trading.js','group-headquarters-view.js'];
const env={window:{},Date,Intl};
for(const name of scripts)runInNewContext(
  readFileSync(new URL('../'+name,import.meta.url),'utf8'),
  env,{filename:name});
const {window:W}=env,E=W.MotorTradeEngine,G=W.MotorTradeGroup;
const copy=s=>JSON.parse(JSON.stringify(s));
const valid=s=>assert.ok(E.normalize(copy(s)),'career must pass full v21 save validator');
function career(name='Boss Motors'){
  const s=E.createStaffed(name,[]);
  assert.equal(s.version,21);
  s.cash+=700000;
  s.ledger.push({day:s.day,delta:700000,note:'Additional owner equity fixture'});
  s.reputationScore=100;
  s.reputation=E.people.tier(100);
  E.premises.sync(s);
  return s;
}
function qualify(){
  // Production rank rules are independently tested in empire-progression.
  // Here we simulate a player whose authenticated records have met Rank 10
  // so the site and financial engine can be exercised without fabricating
  // 100 fake retail sales in the live trading test fixture.
  const original=W.MotorTradeEmpire;
  W.MotorTradeEmpire={...original,status:s=>({...original.status(s),rank:10})};
  return ()=>{W.MotorTradeEmpire=original;};
}
function day(s){
  if(s.day===s.monthPlan.endDay){
    G.closeMonth(s);E.monthly.close(s);
  }
  const closing=s.day===s.monthPlan.endDay;
  s.day++;E.rollAuctionHall(s);s.deadlineSession=0;
  if(closing)E.monthly.next(s);
  E.staffDay(s);E.premisesDay(s);E.stockAgeingDay(s);
  E.advanceWorkshop(s);E.advanceCustomers(s);E.advanceAfterSales(s);
  return G.advance(s);
}
test('legacy v20 saved business migrates to v21 without changing money or stock',()=>{
  const s=career();
  const old=copy(s);
  old.version=20;delete old.group;
  const imported=E.normalize(old);
  assert.ok(imported);
  assert.equal(imported.version,21);
  assert.equal(imported.cash,s.cash);
  assert.deepEqual(Array.from(imported.ledger,e=>e.delta),Array.from(s.ledger,e=>e.delta));
  assert.deepEqual(Array.from(imported.staff,e=>e.name),Array.from(s.staff,e=>e.name));
  assert.equal(imported.group.branches.length,0);
  valid(imported);
});
test('first site remains closed until Rank 10 and real protected cash',()=>{
  const s=career();
  assert.equal(G.quote(s,'manchester').ok,false);
  const unlock=qualify();
  try{
    assert.equal(G.quote(s,'manchester').ok,true);
    const insufficient=copy(s);insufficient.cash=120000;
    assert.equal(G.quote(insufficient,'manchester').ok,false);
    assert.equal(G.open(insufficient,'manchester','m1').ok,false);
    assert.equal(insufficient.group.branches.length,0);
    assert.equal(G.open(s,'not-a-city','m1').ok,false);
  }finally{unlock();}
});
test('second branch opens with actual setup expense and a zero-sum capital transfer',()=>{
  const unlock=qualify();
  try{
    const s=career(),initial=s.cash;
    const q=G.quote(s,'leeds','m2');
    const result=G.open(s,'leeds','m2');
    assert.equal(result.ok,true,result.message);
    const b=s.group.branches[0];
    assert.equal(b.cash,G.CAPITAL);
    assert.equal(s.cash,initial-q.setup-q.capital);
    assert.equal(s.cash+b.cash,initial-q.setup,'internal transfer creates no group cash');
    assert.equal(b.staff.length,4);
    assert.equal(b.manager.name,'Priya Shah');
    assert.equal(G.open(s,'bristol','m1').ok,false,'only one satellite supported initially');
    valid(s);
    const restored=E.normalize(copy(s));
    assert.equal(restored.group.branches[0].cash,G.CAPITAL);
    assert.equal(restored.group.branches[0].staff.length,4);
  }finally{unlock();}
});
test('branch supplier purchases, preparation, customer-led sales and expenses are independently accounted',()=>{
  const unlock=qualify();
  try{
    const s=career();
    assert.equal(G.open(s,'manchester','m1').ok,true);
    const b=s.group.branches[0],offers=G.offers(s,b);
    assert.equal(offers.length,4);
    assert.equal(G.purchase(s,b.id,offers[0].id).ok,true);
    assert.equal(G.purchase(s,b.id,offers[0].id).ok,false,'no duplicate supplier purchase');
    const headOfficeCash=s.cash;
    for(let i=0;i<60;i++){
      const result=day(s);assert.equal(result.ok,true);
      assert.ok(G.valid(s.group,s),'group ledger must reconcile at day '+s.day);
    }
    assert.equal(s.cash<headOfficeCash,true,'existing original wages and rent still occur');
    assert.ok(b.accruals.length>0);
    assert.ok(b.sales.length>0,'manager should serve real deterministic customers over 60 days');
    assert.ok(b.enquiries.length>=b.sales.length);
    assert.ok(b.ledger.some(l=>l.kind==='stock'&&l.delta<0));
    assert.ok(b.ledger.some(l=>l.kind==='preparation'&&l.delta<0));
    assert.ok(b.ledger.some(l=>l.kind==='sale'&&l.delta>0));
    assert.ok(b.ledger.some(l=>l.kind==='payroll'&&l.delta<0));
    assert.ok(b.ledger.some(l=>l.kind==='rent'&&l.delta<0));
    assert.equal(b.cash,b.ledger.reduce((n,l)=>n+l.delta,0));
    const o=G.operating(b);
    assert.equal(o.contribution,o.gross-o.wages-o.rent);
    assert.ok(b.monthlyReports.length>=1);
    valid(s);
    const cash=b.cash,sales=b.sales.length,ledger=b.ledger.length;
    G.advance(s);
    assert.equal(b.cash,cash);assert.equal(b.sales.length,sales);
    assert.equal(b.ledger.length,ledger,'same day cannot charge payroll again');
  }finally{unlock();}
});
test('branch capital transfers preserve consolidated group cash and protect liabilities',()=>{
  const unlock=qualify();
  try{
    const s=career();
    assert.equal(G.open(s,'cardiff','m3').ok,true);
    const b=s.group.branches[0],before=G.summary(s).groupCash;
    assert.equal(G.transfer(s,b.id,10000,'to').ok,true);
    assert.equal(G.summary(s).groupCash,before);
    assert.equal(G.transfer(s,b.id,10000,'from').ok,true);
    assert.equal(G.summary(s).groupCash,before);
    assert.equal(G.transfer(s,b.id,1,'to').ok,false);
    valid(s);
  }finally{unlock();}
});
test('forged cash, missing HQ transfer and corrupted stock reject v21 saves',()=>{
  const unlock=qualify();
  try{
    const s=career();assert.equal(G.open(s,'leeds','m1').ok,true);
    const broken=copy(s);broken.group.branches[0].cash+=1000;
    assert.equal(E.normalize(broken),null,'phantom branch cash rejected');
    const erased=copy(s);erased.ledger=erased.ledger.filter(l=>
      l.note!=='Group capital transfer BR-1');
    assert.equal(E.normalize(erased),null,'lost HQ capital source rejected');
    const badBranch=copy(s);badBranch.group.branches[0].staff[0].salary=-2;
    assert.equal(E.normalize(badBranch),null,'invalid branch payroll rejected');
    valid(s);
  }finally{unlock();}
});
test('HQ view shows genuine available branches and receipts rather than fictional extras',()=>{
  const unlock=qualify();
  try{
    const s=career(),view=W.MotorTradeGroupView;
    let html=view.render(s,'original','m1').html;
    assert.match(html,/OPEN YOUR SECOND DEALERSHIP/);
    assert.doesNotMatch(html,/class="mg-ledger-row"/);
    G.open(s,'manchester','m1');
    html=view.render(s,'BR-1','m1').html;
    assert.match(html,/BRANCH VEHICLE INVENTORY/);
    assert.match(html,/INDEPENDENT STOCK/);
    assert.match(html,/Opening funding transferred from Head Office/);
    assert.match(html,/Manchester/);
  }finally{unlock();}
});
