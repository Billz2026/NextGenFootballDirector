// Run: node --test tests/staff-workshop-impact.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const scripts=['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js','monthly.js',
  'events.js','workshop.js','showroom-traffic.js','customers.js','trading.js'];
const context={window:{},Date,Intl};
for(const path of scripts)runInNewContext(
  readFileSync(new URL('../'+path,import.meta.url),'utf8'),context,{filename:path});
const E=context.window.MotorTradeEngine,P=E.people,W=E.workshop,S=E.premises,Q=E.showroom;
const copy=x=>JSON.parse(JSON.stringify(x));
function save(s){assert.ok(E.normalize(copy(s)),'career must survive JSON roundtrip');}
function next(s){
  Q.closeWaiting(s,'Day closed');
  s.day++;E.rollAuctionHall(s);s.deadlineSession=0;
  E.staffDay(s);E.premisesDay(s);E.advanceWorkshop(s);E.advanceCustomers(s);
}
function funded(name,rep=42){
  const s=E.createStaffed(name,[]);s.reputationScore=rep;
  s.reputation=P.tier(rep);S.sync(s);
  s.cash+=200000;s.ledger.push({day:s.day,delta:200000,note:'Test equity injection'});
  return s;
}
function hireTechs(s,count){
  const pool=P.applicants(s.day).filter(p=>p.role==='technician'&&
    !s.staff.some(e=>e.name===p.name));
  for(const c of pool.slice(0,count)){
    const r=E.hireStaff(s,c.id);
    assert.equal(r.ok,true,r.message);
  }
}
function cars(s,count){
  for(let n=0;n<25&&s.vehicles.length<count;n++){
    for(const v of E.marketFor(s).sellers){
      if(s.vehicles.length>=count)break;
      const r=E.acquireSeller(s,v.id,v.ask);assert.equal(r.ok,true,r.message);
    }
    if(s.vehicles.length<count)next(s);
  }
  assert.equal(s.vehicles.length,count);
}
test('42 reputation unlocks six technician hires without a paid workshop expansion',()=>{
  const s=funded('Boss Motors');
  assert.equal(S.bays(s),4);
  assert.equal(P.technicianLimit(s),6);
  assert.equal(P.staffLimit(s),10);
  const cash=s.cash;
  hireTechs(s,2);
  assert.equal(s.staff.filter(x=>x.role==='technician').length,3);
  assert.equal(s.cash,cash-2*P.HIRING_FEE);
  assert.equal(S.bays(s),4);
  save(s);
  next(s);
  assert.equal(P.activeTeam(s,'technician').length,3);
  save(s);
});
test('reputation and recruitment limits, not physical bays, control headcount',()=>{
  const s=funded('Six Mechanics',42);
  hireTechs(s,5);
  assert.equal(s.staff.filter(x=>x.role==='technician').length,6);
  assert.equal(P.staffLimit(s),10);
  assert.equal(S.bays(s),4);
  const more=P.applicants(s.day).find(c=>c.role==='technician'&&!s.staff.some(e=>e.name===c.name));
  assert.equal(E.hireStaff(s,more.id).code,'role');
  s.reputationScore=80;S.sync(s);
  assert.equal(P.technicianLimit(s),8);
  save(s);
});
test('supervisor visibly saves a planned repair day, retains normal salaries',()=>{
  const s=funded('Manager Impact',42);
  cars(s,1);
  const v=s.vehicles[0];
  assert.equal(E.assessStock(s,v.id).ok,true);
  const withManager=W.quote(s,v,'internal');
  const manager=s.staff.find(e=>e.role==='supervisor');
  const qc=P.supervisorProfile(s).qcRiskReduction;
  assert.equal(P.supervisorProfile(s).turnaroundDays,1);
  assert.ok(qc>0);
  manager.trainingUntil=s.day+2;
  const withoutManager=W.quote(s,v,'internal');
  assert.equal(P.supervisorProfile(s).qcRiskReduction,0);
  manager.trainingUntil=null;
  assert.equal(withoutManager.duration,withManager.duration+1);
  assert.equal(withManager.cost,withoutManager.cost);
  const before=s.cash,dayCost=s.staff.reduce((n,e)=>n+P.dailyCost(e),0);
  next(s);
  assert.equal(s.cash,before-dayCost-S.costs(s).total);
  save(s);
});
test('available technicians accelerate a busy repair by at most one day each shift',()=>{
  const s=funded('Assistant Shift Test',42);
  hireTechs(s,2);next(s);cars(s,1);
  const v=s.vehicles[0];E.assessStock(s,v.id);
  assert.equal(E.startPrep(s,v.id,'internal').ok,true);
  const before=v.workshop.remainingDays;
  assert.ok(before>=2);
  const helpers=P.availableTechnicians(s);
  assert.equal(helpers.length,2);
  const prev=s.staff.reduce((n,e)=>n+e.workDone,0);
  next(s);
  assert.equal(v.workshop.remainingDays,before-2);
  assert.equal(s.staff.reduce((n,e)=>n+e.workDone,0),prev+1,
    'only one assistant may support one occupied bay in a shift');
  save(s);
});
test('four physical repair bays still limit parallel jobs even with six mechanics',()=>{
  const s=funded('Four Bays Remain Four',42);
  hireTechs(s,5);next(s);cars(s,5);
  for(const v of s.vehicles)assert.equal(E.assessStock(s,v.id).ok,true);
  for(const v of s.vehicles.slice(0,4))
    assert.equal(E.startPrep(s,v.id,'internal').ok,true);
  const fifth=E.startPrep(s,s.vehicles[4].id,'internal');
  assert.equal(fifth.ok,false);
  assert.equal(fifth.code,'bays');
  assert.equal(S.bays(s),4);
  assert.equal(E.upgradePremises(s,'workshop').ok,true);
  assert.equal(S.bays(s),6);
  assert.equal(E.startPrep(s,s.vehicles[4].id,'internal').ok,true);
  save(s);
});
test('existing reputation 42 careers reload with new hiring options and unchanged staff',()=>{
  const s=funded('Old Boss Career',42);
  const old=copy(s);old.version=18;
  const loaded=E.normalize(old);
  assert.ok(loaded);
  assert.equal(loaded.staff.length,s.staff.length);
  assert.equal(loaded.cash,s.cash);
  assert.equal(P.technicianLimit(loaded),6);
  assert.equal(S.bays(loaded),4);
  save(loaded);
});
test('distinct specialist roles show genuine trade impacts',()=>{
  const s=funded('Role Portfolio',42);
  assert.ok(P.buyerEstimate(s,7000));
  assert.ok(P.salesImpact(s,s.staff.find(x=>x.role==='sales').id).salesperson);
  assert.ok(P.supervisorProfile(s).manager);
  const sales=P.applicants(s.day).find(x=>x.role==='sales'&&x.skills.sales>=15);
  assert.ok(P.salesProfile(sales).commissionRate>0);
  save(s);
});
