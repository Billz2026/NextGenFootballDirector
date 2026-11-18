import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const files=['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js','monthly.js',
  'empire-progression.js','motor-group.js','dealer-delegation.js',
  'supervisor-operations.js','auction-supervisor.js','events.js',
  'workshop.js','stock-ageing.js','showroom-traffic.js','customers.js',
  'aftersales.js','manager-career.js','trading.js'];
const window={},ctx={window,Date,Intl,document:{addEventListener(){}}};
for(const path of files)vm.runInNewContext(
  readFileSync(new URL('../'+path,import.meta.url),'utf8'),ctx,{filename:path});
const E=window.MotorTradeEngine,MC=window.MotorTradeManagerCareer;
const clone=s=>JSON.parse(JSON.stringify(s));
const start=(d,name='Alex Morgan')=>{
  const s=E.createStaffed(d.name,[]);
  const appointment=MC.enrol(s,name,d.id);
  assert.equal(appointment.ok,true,appointment.message);
  s.messages=MC.welcome(s);
  return s;
};

test('fifty unique fictional employers have tiered reputation gates',()=>{
  assert.equal(MC.DEALERS.length,50);
  assert.equal(new Set(MC.DEALERS.map(d=>d.id)).size,50);
  assert.equal(new Set(MC.DEALERS.map(d=>d.name)).size,50);
  for(const [tier,count] of Object.entries({INDEPENDENT:20,ESTABLISHED:12,
    REGIONAL:10,PRESTIGE:6,ELITE:2})){
    assert.equal(MC.DEALERS.filter(d=>d.tier===tier).length,count);
  }
  assert.equal(MC.firstJobs().length,20);
  assert.ok(MC.DEALERS.slice(20).every(d=>!MC.eligible(d,MC.START_REPUTATION)));
});

test('all twenty independent employer appointments survive real engine save/reload',()=>{
  for(const d of MC.firstJobs()){
    const s=start(d);
    assert.equal(s.cash,d.openingCash);
    assert.equal(s.startingCapital,45000,'legacy ledger basis remains unchanged');
    assert.equal(s.ledger.length,1);
    assert.equal(s.ledger[0].delta,d.openingCash-45000);
    assert.equal(s.monthPlan.openingCash,d.openingCash);
    assert.equal(s.messages.length,3);
    const restored=E.normalize(clone(s));
    assert.ok(restored,'failed to restore '+d.name);
    assert.equal(restored.cash,d.openingCash);
    assert.equal(restored.managerCareer.managerName,'Alex Morgan');
    assert.equal(restored.managerCareer.employerId,d.id);
    assert.equal(restored.monthPlan.openingCash,d.openingCash);
    // Employer funding predates management; it is not trading cash flow.
    const report=E.monthly.statement(restored);
    assert.equal(report.cashIn,0);
    assert.equal(report.cashOut,0);
    assert.equal(report.netCashChange,0);
  }
});

test('locked prestigious employers cannot be selected by a new manager',()=>{
  for(const d of MC.DEALERS.slice(20)){
    const s=E.createStaffed(d.name,[]);
    assert.equal(MC.enrol(s,'Alex Morgan',d.id).ok,false,d.name);
    assert.equal(s.managerCareer,undefined);
    assert.equal(s.cash,45000);
  }
});

test('forged employer identity and opening money are rejected',()=>{
  const s=start(MC.firstJobs()[0]);
  const wrongEmployer=clone(s);wrongEmployer.managerCareer.employerId='dealer-02';
  assert.equal(E.normalize(wrongEmployer),null);
  const forgedCash=clone(s);forgedCash.ledger[0].delta+=1000;forgedCash.cash+=1000;
  assert.equal(E.normalize(forgedCash),null);
  const invalidName=clone(s);invalidName.managerCareer.managerName='<script>';
  assert.equal(E.normalize(invalidName),null);
});

test('board review uses completed sales and actual operating contribution once',()=>{
  const s=start(MC.firstJobs()[0]);
  const before=s.managerCareer.reputation;
  const report={month:1,soldUnits:3,operatingContribution:1100};
  const first=MC.review(s,report);
  assert.equal(first.achieved,true);
  assert.equal(s.managerCareer.reputation,before+3);
  assert.equal(s.managerCareer.boardConfidence,72);
  assert.equal(s.managerCareer.reviews.length,1);
  assert.equal(MC.review(s,report),null,'repeat review must not award reputation');
  assert.equal(s.managerCareer.reviews.length,1);
  assert.ok(MC.valid(s.managerCareer,s));
});

test('existing owner-mode staffed careers remain loadable and unmodified',()=>{
  const old=E.createStaffed('Legacy Test Motors',[]);
  const restored=E.normalize(clone(old));
  assert.ok(restored);
  assert.equal(restored.name,'Legacy Test Motors');
  assert.equal(restored.managerCareer,undefined);
  assert.equal(restored.cash,45000);
});

test('manager age follows DOB and the fictional game calendar',()=>{
  assert.equal(MC.ageAt('2001-11-10',1),24);
  assert.equal(MC.ageAt('2001-11-10',2),25);
  assert.equal(MC.ageAt('2001-02-29',1),null,'invalid calendar date');
  assert.equal(MC.ageAt('2005-11-10',1),20);
  assert.equal(MC.ageAt('1960-11-10',1),65);
  assert.ok(MC.cvValid({...MC.DEFAULT_CV,dateOfBirth:'2005-11-09'}));
  assert.equal(MC.cvValid({...MC.DEFAULT_CV,dateOfBirth:'2005-11-10'}),false);
  assert.equal(MC.cvValid({...MC.DEFAULT_CV,dateOfBirth:'1950-01-01'}),false);
});

test('player-selected conservative CV survives real engine save and reload',()=>{
  const d=MC.firstJobs()[0];
  const details={dateOfBirth:'2000-11-10',hometown:'Coventry',
    previousRole:'buying-assistant',experienceYears:1,qualification:'vehicle-level2'};
  const s=E.createStaffed(d.name,[]);
  assert.equal(MC.enrol(s,'Jordan Hayes',d.id,details).ok,true);
  s.messages=MC.welcome(s);
  const r=E.normalize(clone(s));
  assert.ok(r);
  assert.equal(r.managerCareer.managerName,'Jordan Hayes');
  assert.deepEqual({...r.managerCareer.cv},details);
  assert.equal(MC.ageAt(r.managerCareer.cv.dateOfBirth,r.day),25);
  assert.equal(r.managerCareer.history.length,1);
  assert.equal(r.managerCareer.history[0].type,'appointed');
  assert.equal(r.managerCareer.reputation,5);
});

test('invalid or exaggerated first CV cannot bypass entry-level employment',()=>{
  const d=MC.firstJobs()[0];
  for(const invalid of [
    {...MC.DEFAULT_CV,experienceYears:12},
    {...MC.DEFAULT_CV,previousRole:'general-manager'},
    {...MC.DEFAULT_CV,dateOfBirth:'2008-03-01'},
    {...MC.DEFAULT_CV,dateOfBirth:'2001-02-29'},
    {...MC.DEFAULT_CV,hometown:'<script>'},
    {...MC.DEFAULT_CV,qualification:'mba'}
  ]){
    const state=E.createStaffed(d.name,[]);
    assert.equal(MC.enrol(state,'Jordan Hayes',d.id,invalid).ok,false);
    assert.equal(state.managerCareer,undefined);
    assert.equal(state.cash,45000);
  }
});

test('existing manager careers from before the CV update survive without fabricated identity',()=>{
  const old=start(MC.firstJobs()[0]);
  delete old.managerCareer.cv;
  const r=E.normalize(clone(old));
  assert.ok(r);
  assert.equal(r.managerCareer.cv,undefined);
  assert.equal(r.managerCareer.reputation,5);
});

test('beginner in London can search for at least one real selectable in-game employer',()=>{
  const london=MC.firstJobs().filter(d=>d.city==='London');
  assert.ok(london.length>=1);
  assert.ok(london.some(d=>d.name==='West London Trade Cars'));
  const s=start(london[0]);
  assert.ok(E.normalize(clone(s)));
});
