import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const files=['vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js','vehicle-market.js',
  'premises.js','people.js','calendar.js','monthly.js','empire-progression.js',
  'motor-group.js','dealer-delegation.js','supervisor-operations.js','auction-supervisor.js',
  'events.js','workshop.js','stock-ageing.js','showroom-traffic.js','customers.js',
  'aftersales.js','trading.js','inbox-office.js'];
const window={};const context={window,Date,Intl};
for(const file of files)vm.runInNewContext(
  readFileSync(new URL('../'+file,import.meta.url),'utf8'),context,{filename:file});
const E=window.MotorTradeEngine,A=window.MotorTradeAuctionAgent,I=window.MotorTradeInbox;
const copy=x=>JSON.parse(JSON.stringify(x));
const valid=s=>assert.ok(E.normalize(copy(s)),'complete v24 auction career must reload');
const career=(name='Auction QA')=>E.createStaffed(name,[]);
function first(){
  const s=career();const r=A.review(s,E),req=A.pending(s)[0];
  assert.ok(r.ok);assert.ok(req,'supervisor should recommend the first viable real auction lot');
  return {s,req};
}
test('live supervisor advice contains no seller secret reserve or rival limit',()=>{
  const {s,req}=first(),lot=E.auctionLot(s);
  const m=s.messages.find(x=>x.reference==='auction-advice:'+req.id);
  assert.ok(m);assert.equal(I.needsAction(m,s),true);
  const controls=I.quoteControls(m,s,E);
  assert.match(controls,/auction-agent-cap/);
  assert.match(controls,/AUTHORISE SUPERVISOR BID/);
  assert.match(controls,/I WILL ATTEND/);
  assert.match(m.body,/MY SUGGESTED MAXIMUM HAMMER BID/);
  assert.doesNotMatch(m.body,/rival maximum|vendor reserve is [0-9]/i);
  assert.equal(req.fee,lot.fee);assert.equal(req.guide,lot.guide);
  assert.equal(s.vehicles.length,0);
  valid(s);
});
test('supervisor genuinely bids, pays hammer and fee exactly once within hard cap',()=>{
  const {s,req}=first(),before=s.cash;
  const result=A.decide(s,E,req.id,'delegate',req.suggested);
  assert.equal(result.ok,true,result.message);
  assert.equal(req.status,'delegated');
  const won=s.auctionHistory.filter(x=>x.lotId===req.lotId&&x.kind==='won');
  assert.equal(won.length,1,'fixed first lot should be won under the recommended cap');
  assert.ok(won[0].hammer<=req.suggested);
  assert.equal(s.cash,before-won[0].total);
  assert.ok(s.ledger.some(x=>x.delta===-won[0].total&&
    x.note.startsWith('Auction purchase:')));
  assert.equal(s.vehicles.filter(v=>v.origin===req.lotId).length,1);
  assert.equal(A.decide(s,E,req.id,'delegate',req.suggested).ok,false);
  valid(s);
});
test('too-tight bidder mandate loses to actual rival, not an invented victory',()=>{
  const {s,req}=first(),before=s.cash;
  const result=A.decide(s,E,req.id,'delegate',req.guide+100);
  assert.ok(result.ok,result.message);
  assert.equal(s.cash,before);
  assert.equal(s.vehicles.length,0);
  assert.equal(s.auctionHistory.find(x=>x.lotId===req.lotId).kind,'lost');
  valid(s);
});
test('owner can decline a recommendation and never pay an auction charge',()=>{
  const {s,req}=first(),cash=s.cash;
  const result=A.decide(s,E,req.id,'pass',null);
  assert.equal(result.ok,true);
  assert.equal(s.cash,cash);
  assert.equal(req.status,'declined');
  assert.equal(s.auctionHistory.find(x=>x.lotId===req.lotId).kind,'passed');
  assert.equal(A.decide(s,E,req.id,'pass',null).ok,false);
  valid(s);
});
test('attend personally hands control of existing auction hall to owner',()=>{
  const {s,req}=first();
  assert.equal(A.decide(s,E,req.id,'attend',null).ok,true);
  assert.equal(s.auctionAgent.mode,'owner');
  assert.equal(A.pending(s).length,0);
  assert.equal(E.startAuction(s).ok,true);
  assert.equal(s.auctionHall.phase,'bidding');
  assert.equal(A.review(s,E).pending,0);
  valid(s);
});
test('invalid max bids are rejected before changing game cash or auction phase',()=>{
  const {s,req}=first(),cash=s.cash;
  for(const invalid of [-1,0,req.guide,req.guide+125,100100,NaN]){
    assert.equal(A.decide(s,E,req.id,'delegate',invalid).ok,false);
    assert.equal(s.auctionHall.phase,'catalogue');
    assert.equal(s.cash,cash);
  }
  assert.equal(req.status,'pending');valid(s);
});
test('forged auction cap or missing live email rejects imported career save',()=>{
  const {s,req}=first(),bad=copy(s);
  bad.auctionAgent.requests[0].suggested=-1;
  assert.equal(E.normalize(bad),null);
  const lostMail=copy(s);
  lostMail.messages=lostMail.messages.filter(m=>m.reference!=='auction-advice:'+req.id);
  assert.equal(E.normalize(lostMail),null);
  valid(s);
});
