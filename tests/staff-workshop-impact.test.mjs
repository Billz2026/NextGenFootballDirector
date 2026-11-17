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
test('active supervisor changes a real final QC outcome, not just a displayed number',()=>{
  function hash(t){
    let n=2166136261;
    for(const c of String(t))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
    return n>>>0;
  }
  const i=Array.from({length:2000},(_,i)=>i)
    .find(i=>hash('quality|qc-fixture-'+i)%100===10);
  assert.notEqual(i,undefined);
  const s=E.createStaffed('Supervisor QC Test',[]);
  s.vehicles=[{id:1,title:'QC Vehicle',status:'acquired',
    origin:'qc-fixture-'+i,prepBudget:200,prepSpent:0,cost:1000,
    profile:{grade:2},workshop:{
      stage:'quality-check',assessmentFee:30,method:'external',
      repairCost:200,remainingDays:0,plannedDays:3,partsDelay:0,
      startedDay:1,completedDay:null,technicianId:null,reworks:0,paused:false
    }}];
  const noManager=copy(s);
  noManager.staff.find(e=>e.role==='supervisor').trainingUntil=3;
  assert.equal(W.quality(s,1).ok,true);
  assert.equal(s.vehicles[0].status,'prepared');
  assert.equal(W.quality(noManager,1).ok,true);
  assert.equal(noManager.vehicles[0].workshop.stage,'in-progress');
  assert.ok(noManager.cash<s.cash,'unsupervised rework must actually cost cash');
});
test('dispatch assigns a chosen lead and only manually assigned assistants accelerate work',()=>{
  const s=funded('Assistant Shift Test',42);
  hireTechs(s,2);next(s);cars(s,1);
  const v=s.vehicles[0];E.assessStock(s,v.id);
  const crew=P.availableTechnicians(s);
  assert.equal(crew.length,3);
  assert.equal(W.quote(s,v,'internal',crew[1].id).technicianId,crew[1].id);
  assert.equal(E.startPrep(s,v.id,'internal',crew[1].id).ok,true);
  assert.equal(v.workshop.technicianId,crew[1].id);
  assert.ok(v.workshop.remainingDays>=2);
  const before=v.workshop.remainingDays;
  next(s);
  assert.equal(v.workshop.remainingDays,before-1,'no automatic assistant allocation');
  const assistant=P.availableTechnicians(s).find(t=>t.skills.efficiency>=12);
  assert.ok(assistant);
  assert.equal(W.assignAssistant(s,v.id,assistant.id).ok,true);
  assert.equal(P.availableTechnicians(s).some(t=>t.id===assistant.id),false,
    'assistant is reserved and unavailable for competing work');
  const prev=s.staff.reduce((n,e)=>n+e.workDone,0);
  const remaining=v.workshop.remainingDays;
  next(s);
  assert.equal(v.workshop.remainingDays,Math.max(0,remaining-2));
  assert.equal(s.staff.reduce((n,e)=>n+e.workDone,0),prev+1);
  assert.equal(v.workshop.workLog.at(-1).assistantId,assistant.id);
  assert.equal(v.workshop.workLog.at(-1).leadId,crew[1].id);
  save(s);
});
test('urgent priority is persistent scheduling metadata, not a repair speed cheat',()=>{
  const s=funded('Urgent Job',42);cars(s,1);
  const v=s.vehicles[0];E.assessStock(s,v.id);
  const duration=W.quote(s,v,'internal').duration;
  assert.equal(W.priority(s,v.id,'urgent').ok,true);
  assert.equal(W.priority(s,v.id,'urgent').ok,false);
  assert.equal(E.startPrep(s,v.id,'internal').ok,true);
  assert.equal(v.workshop.priority,'urgent');
  assert.equal(v.workshop.plannedDays,duration);
  save(s);
});
test('paused repair can be reassigned to a free technician without double-booking',()=>{
  const s=funded('Shift Coverage',42);
  hireTechs(s,2);next(s);cars(s,2);
  for(const v of s.vehicles)assert.equal(E.assessStock(s,v.id).ok,true);
  const [a,b]=s.vehicles;
  const crew=P.availableTechnicians(s);
  assert.equal(E.startPrep(s,a.id,'internal',crew[0].id).ok,true);
  assert.equal(E.startPrep(s,b.id,'internal',crew[1].id).ok,true);
  assert.equal(W.reassign(s,a.id,crew[1].id).code,'busy');
  const helper=P.availableTechnicians(s)[0];
  assert.equal(W.assignAssistant(s,a.id,helper.id).ok,true);
  assert.equal(W.assignAssistant(s,b.id,helper.id).code,'busy');
  assert.equal(W.assignAssistant(s,a.id,crew[0].id).code,'staff');
  assert.equal(W.assignAssistant(s,a.id,0).ok,true);
  crew[0].trainingUntil=s.day+3;
  next(s);
  assert.equal(a.workshop.paused,true);
  assert.equal(W.reassign(s,a.id,helper.id).ok,true);
  assert.equal(a.workshop.paused,false);
  assert.equal(a.workshop.technicianId,helper.id);
  next(s);
  assert.ok(a.workshop.workLog.some(x=>x.leadId===helper.id));
  save(s);
});
test('legacy workshop jobs without dispatch fields still pass integrity checks',()=>{
  const s=funded('Legacy Repairs',42);
  cars(s,1);const v=s.vehicles[0];
  E.assessStock(s,v.id);E.startPrep(s,v.id,'internal');
  delete v.workshop.priority;
  delete v.workshop.assistantId;
  delete v.workshop.workLog;
  delete v.workshop.qcLog;
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
