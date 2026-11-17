// Run: node --test tests/calendar-customer-stock.test.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';

const scripts=[
  'vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js',
  'monthly.js','events.js','workshop.js','customers.js','trading.js'
];
function engine(){
  const sandbox={window:{},Intl,Date};
  for(const file of scripts)runInNewContext(
    readFileSync(new URL('../'+file,import.meta.url),'utf8'),
    sandbox,{filename:file});
  return sandbox.window;
}
const W=engine();
const E=W.MotorTradeEngine,D=E.events,M=E.monthly,C=E.customers,
  CAL=W.MotorTradeCalendar,MARKET=W.MotorTradeMarket,I=W.MotorTradeIntel;

test('calendar follows actual month ends including February',()=>{
  for(const [day,date] of [
    [1,'9 November 2026'],[22,'30 November 2026'],
    [23,'1 December 2026'],[53,'31 December 2026'],
    [54,'1 January 2027'],[84,'31 January 2027'],
    [112,'28 February 2027']
  ])assert.equal(CAL.label(day),date);
  for(const day of [22,53,84,112]){
    assert.equal(D.isDealDay(day),true);
    assert.equal(E.auctionDay(day),true);
    assert.equal(E.market(day,5,0,'Month End Motors',5,45000).auctions.length,5);
  }
  assert.equal(E.auctionDay(1),true);
  assert.equal(E.auctionDay(8),true);
});

test('new careers calculate November 30 as first month-end and normalise',()=>{
  const state=E.createStaffed('Calendar Test Motors',[]);
  assert.equal(state.version,17);
  assert.equal(state.monthPlan.endDay,22);
  assert.equal(state.staff.length,4);
  assert.ok(E.normalize(JSON.parse(JSON.stringify(state))));
});

test('old v14 careers migrate without replacing cash or employees',()=>{
  const state=E.createStaffed('Legacy Test Motors',[]);
  state.version=14;
  state.monthPlan.endDay=30;
  state.monthPlan.unitTarget=4;
  const restored=E.normalize(JSON.parse(JSON.stringify(state)));
  assert.ok(restored);
  assert.equal(restored.version,17);
  assert.equal(restored.cash,45000);
  assert.equal(restored.staff.length,4);
  assert.equal(restored.monthPlan.endDay,22);
});

test('booked customers are scheduled next day and do attend the viewing',()=>{
  const state=E.createStaffed('Test Drive Motors',[]);
  const vehicle={id:1,title:'2019 Test Car',status:'listed',asking:8000,
    profile:{likelySale:7700,grade:2}};
  state.vehicles=[vehicle];
  state.customerCases={'1':{
    id:'C-1-0-1-12',name:'Jordan Brown',vehicleId:1,status:'enquiry',
    createdDay:1,createdSession:0,counters:0
  }};
  assert.equal(C.book(state,1).ok,true);
  assert.equal(state.customerCases['1'].appointmentDay,2);
  state.day=2;
  C.advanceDay(state);
  assert.equal(state.customerCases['1'].status,'arrived');
});

test('retail negotiation allows five real player counters, not a sixth',()=>{
  const state=E.createStaffed('Negotiation Test Motors',[]);
  const vehicle={id:1,title:'2019 Test Car',status:'listed',asking:11000,
    cashOffer:9400,profile:{likelySale:10300,grade:2}};
  state.vehicles=[vehicle];
  state.customerCases={'1':{id:'C-1-0-1-12',name:'Jordan Brown',
    vehicleId:1,status:'discussing',counters:0,objectionStatus:'resolved',objectionAction:'legacy'}};
  for(let i=1;i<=5;i++){
    const previous=vehicle.cashOffer;
    const result=C.negotiate(state,vehicle,previous,10300,previous+100);
    assert.equal(result.changed,true);
    assert.equal(state.customerCases['1'].counters,i);
    assert.ok(vehicle.cashOffer<=10300);
  }
  assert.equal(C.negotiate(state,vehicle,vehicle.cashOffer,10300,
    vehicle.cashOffer+100).ok,false);
});

test('most starter auction and seller listings remain under 100k miles',()=>{
  let total=0,low=0;
  for(let day=1;day<=80;day++){
    const market=E.market(day,5,0,'Starter Test Motors',5,45000);
    for(const vehicle of [...market.auctions,...market.sellers]){
      total++;if(vehicle.miles<100000)low++;
    }
  }
  assert.ok(total>100);
  assert.ok(low/total>.7,'too many high-mileage cars in opening dealer pool');
});

test('delivery-mileage 2026 cars are genuinely locked until cash and reputation thresholds',()=>{
  assert.equal(MARKET.tierFor(179999,85).key,'luxury');
  assert.equal(MARKET.tierFor(180000,84).key,'luxury');
  assert.equal(MARKET.tierFor(180000,85).key,'new');
  let count=0;
  for(let day=22;day<120;day++){
    const market=E.market(day,90,0,'New Car Motors',90,200000);
    for(const vehicle of [...market.auctions,...market.sellers]){
      if(vehicle.marketTier!=='new')continue;
      count++;
      assert.ok(vehicle.miles<=200);
      assert.equal(vehicle.profile.owners,0);
      assert.equal(vehicle.profile.mot.result,'NOT DUE');
      assert.equal(I.validProfile(vehicle.profile),true);
    }
  }
  assert.ok(count>0);
});

test('66-day staffed career crosses month-ends and stays valid to reload',()=>{
  const state=E.createStaffed('Month Test Motors',[]);
  const ends=[];
  for(let n=1;n<=66;n++){
    if(D.meetingDue(state))assert.equal(D.holdMeeting(state,'sales').ok,true);
    if(D.isDealDay(state.day)){
      while(state.deadlineSession<D.PHASES.length-1){
        D.advanceSession(state);
        C.nextSession(state);
      }
    }
    assert.ok(E.normalize(JSON.parse(JSON.stringify(state))),
      'save failed on game day '+state.day);
    if(n===66)break;
    const closed=state.day===state.monthPlan.endDay?M.close(state):null;
    if(closed)ends.push(state.day);
    state.day++;
    E.rollAuctionHall(state);
    state.deadlineSession=0;
    if(closed)M.next(state);
    E.staffDay(state);
    E.premisesDay(state);
    E.advanceWorkshop(state);
    E.advanceCustomers(state);
    state.negotiations={};state.auctionBids={};state.reports={};
  }
  assert.equal(ends.join(','),'22,53');
});
