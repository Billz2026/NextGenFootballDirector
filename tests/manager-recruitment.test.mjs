import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const memory=new Map();
const localStorage={
  getItem:key=>memory.get(key)??null,
  setItem:(key,value)=>memory.set(key,value),
  removeItem:key=>memory.delete(key)
};
const window={};
const ctx={window,localStorage,Date,Intl};
for(const path of ['manager-career.js','manager-recruitment.js']){
  vm.runInNewContext(readFileSync(new URL('../'+path,import.meta.url),'utf8'),ctx,{filename:path});
}
const MC=window.MotorTradeManagerCareer,JR=window.MotorTradeRecruitment;
const clone=x=>JSON.parse(JSON.stringify(x));
const employer=MC.firstJobs()[0];
const candidate=()=>JR.initial('Alex Morgan',MC.DEFAULT_CV);
function fillInterview(state,score=3){
  let steps=0;
  while(JR.current(state)?.stage==='interview'){
    const a=JR.current(state),q=a.questionIds[a.answers.length];
    const choice=[0,1,2,3].find(i=>JR.pointsFor(q,a.employerId,i)===score);
    assert.ok(Number.isInteger(choice));
    assert.equal(JR.answer(state,choice).ok,true);
    assert.ok(++steps<=10);
  }
}
test('question bank has exactly 40 distinct motor-trade scenarios',()=>{
  assert.equal(JR.QUESTIONS.length,40);
  assert.equal(new Set(JR.QUESTIONS.map(q=>q.id)).size,40);
  assert.deepEqual({...JR.LEVEL_LENGTH},{INDEPENDENT:5,ESTABLISHED:6,
    REGIONAL:7,PRESTIGE:8,ELITE:10});
});
test('beginner must apply and be shortlisted, with no automatic employer contract',()=>{
  const state=candidate();
  assert.equal(state.attempts.length,0);
  assert.equal(JR.snapshot(state),null);
  const decision=JR.apply(state,employer.id);
  assert.equal(decision.ok,true);
  assert.equal(decision.shortlisted,true);
  assert.equal(JR.current(state).stage,'invited');
  assert.equal(JR.snapshot(state),null);
  assert.equal(JR.current(state).answers.length,0);
  assert.equal(JR.valid(state),true);
});
test('five realistic questions and strong answers lead to a recorded job offer',()=>{
  const state=candidate();
  JR.apply(state,employer.id);
  JR.beginInterview(state);
  assert.equal(JR.current(state).questionIds.length,5);
  fillInterview(state,3);
  assert.equal(JR.current(state).stage,'offered');
  assert.equal(JR.valid(state),true);
  const offer=JR.snapshot(state);
  assert.equal(offer.employerId,employer.id);
  assert.equal(offer.interviewPercent,100);
  assert.equal(offer.questionsAsked,5);
  assert.ok(offer.composite>=offer.threshold);
});
test('poor interview decisions genuinely reject a candidate',()=>{
  const state=candidate();
  JR.apply(state,employer.id);
  JR.beginInterview(state);
  fillInterview(state,0);
  assert.equal(JR.current(state).stage,'rejected');
  assert.equal(JR.current(state).result.reason,'interview');
  assert.equal(JR.snapshot(state),null);
  assert.equal(JR.valid(state),true);
});
test('no instant interview at a prestigious employer with beginner reputation',()=>{
  const state=candidate(),elite=MC.DEALERS.find(d=>d.tier==='ELITE');
  assert.equal(JR.apply(state,elite.id).ok,false);
  assert.equal(state.attempts.length,0);
});
test('shortlisting considers CV before an interview invitation',()=>{
  const weak={...MC.DEFAULT_CV,experienceYears:1};
  const state=JR.initial('Alex Morgan',weak);
  const demanding=MC.firstJobs().find(d=>d.monthlyTarget>=3);
  assert.ok(demanding);
  const result=JR.apply(state,demanding.id);
  assert.equal(result.ok,true);
  assert.equal(result.shortlisted,false);
  assert.equal(JR.current(state).stage,'rejected');
  assert.equal(JR.beginInterview(state).ok,false);
  assert.equal(JR.valid(state),true);
});
test('refresh resumes an active application and its submitted answers',()=>{
  memory.clear();
  const state=candidate();
  JR.apply(state,employer.id);
  JR.beginInterview(state);
  const q=JR.current(state).questionIds[0];
  JR.answer(state,[0,1,2,3].find(i=>JR.pointsFor(q,employer.id,i)===2));
  assert.equal(JR.save(state),true);
  const restored=JR.read();
  assert.equal(JR.valid(restored),true);
  assert.equal(JR.current(restored).answers.length,1);
  assert.equal(JR.current(restored).stage,'interview');
  fillInterview(restored,3);
  assert.ok(['offered','rejected'].includes(JR.current(restored).stage));
  JR.clear();
  assert.equal(JR.read(),null);
});
test('rejected candidates can apply again, but not to the same vacancy',()=>{
  const state=candidate();
  JR.apply(state,employer.id);
  JR.beginInterview(state);fillInterview(state,0);
  assert.equal(JR.apply(state,employer.id).ok,false);
  const another=MC.firstJobs().find(d=>d.id!==employer.id&&d.monthlyTarget===2);
  assert.ok(another);
  assert.equal(JR.apply(state,another.id).ok,true);
  assert.equal(state.attempts.length,2);
  assert.equal(JR.valid(state),true);
});
test('declined offers cannot later create a contract',()=>{
  const state=candidate();JR.apply(state,employer.id);
  JR.beginInterview(state);fillInterview(state,3);
  assert.ok(JR.snapshot(state));
  assert.equal(JR.decline(state).ok,true);
  assert.equal(JR.snapshot(state),null);
  assert.equal(JR.valid(state),true);
});
test('hire certificate validates with a manager profile and survives clone',()=>{
  const state=candidate();JR.apply(state,employer.id);
  JR.beginInterview(state);fillInterview(state,3);
  const offer=JR.snapshot(state);
  const W=window;
  W.MotorTradeMonthly={initialize(){}};
  W.MotorTradePremises={sync(){}};
  const dealer={day:1,name:employer.name,cash:45000,startingCapital:45000,
    ledger:[],sold:[],inboxLedgerCursor:0};
  assert.equal(MC.enrol(dealer,'Alex Morgan',employer.id,MC.DEFAULT_CV).ok,true);
  dealer.managerCareer.recruitment=offer;
  assert.equal(MC.valid(dealer.managerCareer,dealer),true);
  assert.equal(MC.valid(MC.clone(dealer.managerCareer),dealer),true);
  dealer.managerCareer.recruitment.interviewPercent=0;
  assert.equal(MC.valid(dealer.managerCareer,dealer),false);
});
