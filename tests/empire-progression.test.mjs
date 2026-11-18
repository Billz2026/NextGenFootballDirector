import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../empire-progression.js',import.meta.url),'utf8');
function engine(){
  const window={
    MotorTradeCalendar:{monthOf:day=>Math.floor((day-1)/30)},
    MotorTradeMarket:{CATALOGUE:{luxury:[{title:'2022 Porsche Macan 2.0 PDK'}]}}
  };
  vm.runInNewContext(source,{window,Intl},{filename:'empire-progression.js'});
  return window.MotorTradeEmpire;
}
function career(){
  return {name:'Test Motors',day:1,cash:50000,reputationScore:100,
    payrollArrears:0,premises:{arrears:0},vehicles:[],sold:[],
    monthlyReports:[],auctionHistory:[]};
}
function sale(i,{luxury=false,profit=1500,price=15000}={}){
  return {day:1+i*30,price,profit,source:i<20?'auction':'seller',
    title:luxury?'2022 Porsche Macan 2.0 PDK':'2018 Volkswagen Polo SE'};
}
function goodMonth(i){
  return {month:i+1,targetMet:true,operatingContribution:15000,closingCash:100000,
    payrollArrears:0,premisesArrears:0,stockAgeingArrears:0,afterSalesOpen:0};
}
test('fresh career has no invented points or extra branches',()=>{
  const x=career();x.reputationScore=5;
  const p=engine().status(x);
  assert.equal(p.points,0);assert.equal(p.rank,0);
  assert.equal(p.branch.cap,1);assert.equal(p.trustReady,false);
});
test('credits legacy records without mutating the saved career',()=>{
  const x=career();x.sold=Array.from({length:100},(_,i)=>sale(i));
  x.monthlyReports=Array.from({length:6},(_,i)=>goodMonth(i));
  const before=JSON.stringify(x),p=engine().status(x);
  assert.ok(p.points>=200);
  assert.ok(p.rank>=10);
  assert.equal(JSON.stringify(x),before);
});
test('sale prestige is capped at twenty per calendar month',()=>{
  const x=career();x.sold=Array.from({length:100},(_,i)=>({...sale(i),day:1}));
  const p=engine().status(x);
  assert.ok(p.points<150);
  assert.equal(p.rank<10,true);
});
test('promotion gates prevent brute force from bypassing luxury stage',()=>{
  const x=career();x.sold=Array.from({length:1000},(_,i)=>sale(Math.floor(i/17)));
  x.monthlyReports=Array.from({length:30},(_,i)=>goodMonth(i));
  x.auctionHistory=Array.from({length:20},(_,i)=>({kind:'won',lotId:'A-'+i}));
  const p=engine().status(x);
  assert.ok(p.points>=800);
  assert.equal(p.rank,39);
  assert.equal(p.blocked.stage.rank,40);
});
test('rank zero is protected when customer trust drops below prestige tier',()=>{
  const x=career();x.reputationScore=70;
  x.sold=Array.from({length:250},(_,i)=>sale(i));
  x.monthlyReports=Array.from({length:12},(_,i)=>goodMonth(i));
  const p=engine().status(x);
  assert.ok(p.points>0);
  assert.equal(p.rank,0);
});
test('renders a real milestone roadmap with no working expansion claim',()=>{
  const x=career();const E=engine();
  assert.match(E.render(x),/RANK 0/);
  assert.match(E.render(x),/Branch permission is a roadmap only/);
  assert.match(E.branchBrief(x),/No site is opened and no cash is charged/);
});

test('shows all 100 rank targets without hiding them behind an accordion',()=>{
  const E=engine(),x=career(),html=E.render(x);
  const ranks=E.rankPath(x);
  assert.equal(ranks.length,101); // rank zero is the career foundation
  assert.equal((html.match(/class="empire-path-rank /g)||[]).length,100);
  assert.equal((html.match(/class="empire-path-chapter /g)||[]).length,10);
  for(let rank=1;rank<=100;rank++){
    assert.match(html,new RegExp('RANK '+String(rank).padStart(2,'0')+'</small>'));
    assert.equal(ranks[rank].points,rank*20);
  }
  assert.match(html,/WORLD-CLASS LUXURY DEALER/);
  assert.match(html,/Rank 100, 2,000 prestige points, WORLD-CLASS LUXURY DEALER, LOCKED/);
  assert.doesNotMatch(html,/VIEW THE ELEVEN MAJOR CAREER STAGES/);
});
test('current, achieved and locked labels follow recorded rank',()=>{
  const E=engine(),x=career();
  x.sold=Array.from({length:68},(_,i)=>({...sale(i),day:1+Math.floor(i/18)*30}));
  x.monthlyReports=Array.from({length:3},(_,i)=>goodMonth(i));
  const before=JSON.stringify(x),p=E.status(x),ranks=E.rankPath(x);
  assert.ok(p.rank>0&&p.rank<10);
  assert.equal(ranks[p.rank].status,'current');
  assert.equal(ranks[p.rank-1].status,'achieved');
  assert.equal(ranks[p.rank+1].status,'locked');
  assert.equal(ranks[100].status,'locked');
  assert.equal(JSON.stringify(x),before);
  assert.match(E.render(x),/RANK 10 PROMOTION GATE/);
  assert.match(E.render(x),/68 \/ 100/);
});
test('milestone gate is clearly locked when prestige points exceed the hurdle',()=>{
  const E=engine(),x=career();
  x.sold=Array.from({length:1000},(_,i)=>sale(Math.floor(i/17)));
  x.monthlyReports=Array.from({length:30},(_,i)=>goodMonth(i));
  x.auctionHistory=Array.from({length:20},(_,i)=>({kind:'won',lotId:'A-'+i}));
  const state=E.status(x),ranks=E.rankPath(x),html=E.render(x);
  assert.equal(state.rank,39);
  assert.equal(ranks[39].status,'current');
  assert.equal(ranks[40].status,'locked');
  assert.equal(ranks[40].gateBlocked,true);
  assert.match(html,/LOCKED · GATE/);
  assert.match(html,/PROMOTION BLOCKED/);
  assert.match(html,/Luxury vehicle handovers/);
});
test('five legacy trust tiers are named separately from the 100 career ranks',()=>{
  const source=readFileSync(new URL('../people-view.js',import.meta.url),'utf8');
  assert.match(source,/CUSTOMER TRUST BANDS · 0–100/);
  assert.match(source,/5 TRUST BRACKETS · NOT CAREER RANKS/);
  assert.doesNotMatch(source,/REPUTATION LEVELS/);
});
test('rank pathway makes planned future systems explicit and retains the original trust gate',()=>{
  const E=engine(),x=career();
  x.reputationScore=5;
  x.sold=Array.from({length:300},(_,i)=>sale(i));
  const ranks=E.rankPath(x);
  assert.equal(ranks[0].status,'locked');
  assert.equal(ranks[1].status,'locked');
  assert.match(E.render(x),/RANK 00 · PRESTIGE DEALER/);
  assert.match(E.render(x),/100-rank career pathway/);
  assert.match(E.render(x),/Requires a planned future game system/);
});
