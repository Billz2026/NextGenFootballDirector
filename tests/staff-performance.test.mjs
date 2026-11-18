// Run: node --test tests/staff-performance.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const context={window:{},Date,Intl};
for(const path of [
  'vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js','monthly.js',
  'events.js','workshop.js','stock-ageing.js','showroom-traffic.js','customers.js','aftersales.js',
  'empire-progression.js','motor-group.js','dealer-delegation.js','trading.js','staff-performance.js','people-view.js'
]){
  runInNewContext(readFileSync(new URL('../'+path,import.meta.url),'utf8'),
    context,{filename:path});
}
const E=context.window.MotorTradeEngine,PF=context.window.MotorTradeStaffPerformance;
const P=E.people,W=E.workshop,C=E.customers;
const copy=x=>JSON.parse(JSON.stringify(x));
const valid=s=>assert.ok(E.normalize(copy(s)),'career must round-trip');
function career(){
  const s=E.createStaffed('Performance Test Motors',[]);
  s.cash+=120000;s.ledger.push({day:s.day,delta:120000,note:'Test equity'});
  return s;
}
function day(s){
  s.day++;E.rollAuctionHall(s);s.deadlineSession=0;
  E.staffDay(s);E.premisesDay(s);E.advanceWorkshop(s);E.advanceCustomers(s);
}
function staff(s,role){return s.staff.find(e=>e.role===role);}
function salesFixture(s,leadId,rep,{sold=true,profit=500,commission=25}={}){
  s.customerHistory.push({
    day:s.day,vehicleId:123,leadId,type:'enquiry',detail:'ONLINE',
    salespersonId:rep.id
  });
  if(sold)s.sold.push({salespersonId:rep.id,
    customerLeadId:leadId,profit,salesCommission:commission});
}

test('new career displays a real zero-data baseline and no false underperformers',()=>{
  const s=career(),rep=staff(s,'sales'),tech=staff(s,'technician');
  const a=PF.employee(s,rep),b=PF.employee(s,tech);
  assert.equal(a.enquiries,0);
  assert.equal(a.conversionRate,null);
  assert.equal(a.deals,0);
  assert.equal(b.completed,0);
  assert.equal(b.avgDays,null);
  assert.equal(b.firstPassRate,null);
  assert.equal(PF.team(s).review.length,0);
  const html=context.window.MotorTradePeopleView.staffDesk(s,P,{}).html;
  assert.match(html,/EMPLOYEE PERFORMANCE RECORD/);
  assert.match(html,/AWAITING RESULTS/);
  assert.match(html,/NO RESULT HISTORY/);
  valid(s);
});

test('new workshop jobs record actual QC clearance and only completed jobs count',()=>{
  const s=career(),rep=staff(s,'technician');
  const seller=E.marketFor(s).sellers[0];
  assert.equal(E.acquireSeller(s,seller.id,seller.ask).ok,true);
  const v=s.vehicles[0];
  assert.equal(E.assessStock(s,v.id).ok,true);
  assert.equal(E.startPrep(s,v.id,'internal',rep.id).ok,true);
  assert.equal(PF.employee(s,rep).completed,0);
  for(let i=0;i<15&&v.workshop.stage!=='ready';i++){
    if(v.workshop.stage==='quality-check'){
      assert.equal(E.finishPrep(s,v.id).ok,true);
    }else day(s);
  }
  assert.equal(v.workshop.stage,'ready');
  const result=PF.employee(s,rep);
  assert.equal(result.completed,1);
  assert.equal(result.turnaroundCount,1);
  assert.equal(result.avgDays,v.workshop.completedDay-v.workshop.startedDay);
  assert.equal(result.checked,1);
  assert.equal(result.qcPassed,v.workshop.reworks===0?1:0);
  assert.ok(result.leadShifts>0);
  valid(s);
});

test('sales attribution requires lead identity, counts unique enquiries, and nets commission',()=>{
  const s=career(),rep=staff(s,'sales');
  salesFixture(s,'C-1-0-9-1111',rep,{profit:1200,commission:60});
  salesFixture(s,'C-1-0-9-2222',rep,{sold:false});
  s.customerHistory.push({...s.customerHistory[0]});
  const p=PF.employee(s,rep);
  assert.equal(p.enquiries,2,'duplicate history must not inflate lead count');
  assert.equal(p.converted,1);
  assert.equal(p.conversionRate,50);
  assert.equal(p.maturedEnquiries,1,'completed handover is already mature');
  assert.equal(p.maturedRate,100);
  assert.equal(p.gross,1200);
  assert.equal(p.commission,60);
  assert.equal(p.contribution,1140);
  assert.equal(p.deals,1);
  // Full real career normalization validates the attributed history.
  // Synthetic sold records in this test intentionally omit unrelated car fields.
  s.sold=[];
  valid(s);
});

test('historical sales count as margin but never invent an attributable lead',()=>{
  const s=career(),rep=staff(s,'sales');
  s.sold.push({salespersonId:rep.id,profit:300,salesCommission:12});
  s.customerHistory.push({day:s.day,vehicleId:3,leadId:'C-1-0-3-1111',
    type:'enquiry',detail:'ONLINE'}); // old record, no salesperson ID
  const p=PF.employee(s,rep);
  assert.equal(p.enquiries,0);
  assert.equal(p.converted,0);
  assert.equal(p.conversionRate,null);
  assert.equal(p.deals,1);
  assert.equal(p.contribution,288);
});

test('review thresholds require useful volume and cannot be triggered by one weak result',()=>{
  const s=career(),rep=staff(s,'sales');
  for(let i=1;i<=5;i++)salesFixture(s,'C-1-0-5-'+i,rep,{sold:false});
  assert.equal(PF.employee(s,rep).state,'limited');
  salesFixture(s,'C-1-0-5-6',rep,{sold:false});
  assert.equal(PF.employee(s,rep).state,'limited',
    'six brand new unanswered enquiries must not trigger a review');
  s.day+=3;
  const r=PF.employee(s,rep);
  assert.equal(r.maturedEnquiries,6);
  assert.equal(r.state,'review');
  assert.match(r.reasons.join(' '),/Fewer than 20%/);
  assert.equal(PF.team(s).review.length,1);
  const html=context.window.MotorTradePeopleView.staffDesk(s,P,{}).html;
  assert.match(html,/REVIEW RESULTS/);
  assert.match(html,/PERFORMANCE REVIEW SIGNAL/);
});

test('first-check QC failure remains a failure after eventual pass',()=>{
  const s=career(),t=staff(s,'technician');
  for(let i=1;i<=5;i++){
    const firstPass=i===5;
    const j={method:'internal',stage:'ready',technicianId:t.id,
      startedDay:1,completedDay:4,plannedDays:3,
      workLog:[{day:2,leadId:t.id,assistantId:null,progress:1}],
      qcLog:[{day:3,passed:firstPass,technicianId:t.id},
        ...(firstPass?[]:[{day:4,passed:true,technicianId:t.id}])]};
    s.sold.push({workshopRecord:j});
  }
  const p=PF.employee(s,t);
  assert.equal(p.completed,5);
  assert.equal(p.checked,5);
  assert.equal(p.qcPassed,1);
  assert.equal(p.qcReworks,4);
  assert.equal(p.firstPassRate,20);
  assert.equal(p.state,'review');
});
