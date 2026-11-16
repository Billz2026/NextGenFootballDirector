// Run with: node --test tests/career-progression.test.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';

const window={MotorTradeMonthly:{statement:s=>s.statementFixture}};
runInNewContext(readFileSync(new URL('../career-progression.js',import.meta.url),'utf8'),
  {window,Intl,Number,Math,Array,Object,String});
const P=window.MotorTradeCareerProgression;
function start(){return {day:1,reputationScore:5,sold:[],vehicles:[],
  monthlyReports:[],auctionHistory:[],monthPlan:{month:1},
  statementFixture:{soldUnits:0,targetUnits:4,operatingContribution:-250}};}

test('fresh career has three goals and no invented achievements',()=>{
  const state=start(),original=JSON.stringify(state);
  const goals=P.goals(state);
  assert.equal(goals.length,3);
  assert.equal(goals[0].label,'FIRST PROFITABLE HANDOVER');
  assert.equal(goals[1].display,'0 / 4 sales');
  assert.equal(goals[2].label,'BECOME LOCAL DEALER');
  assert.equal(P.milestones(state).filter(x=>x.earned).length,0);
  assert.equal(JSON.stringify(state),original);
});

test('meeting sales volume does not conceal negative operating contribution',()=>{
  const state=start();
  state.statementFixture={soldUnits:4,targetUnits:4,operatingContribution:-999};
  assert.match(P.goals(state)[1].description,/must be positive/);
});

test('sales and reports earn achievements, old auction purchases survive log pruning',()=>{
  const state=start();
  state.day=31;state.reputationScore=40;
  state.sold=[
    {day:8,price:21000,profit:1400,source:'seller'},
    {day:11,price:28000,profit:1500,source:'auction'},
    {day:13,price:22000,profit:-100,source:'seller'},
    {day:15,price:12000,profit:600,source:'seller'},
    {day:20,price:19000,profit:750,source:'seller'}];
  state.monthlyReports=[{targetMet:true,endDay:30}];
  assert.equal(P.milestones(state).filter(x=>x.earned).length,6);
  assert.equal(P.goals(state)[0].label,'10 LIFETIME RETAIL SALES');
  assert.match(P.saleFeedback(state,38,4),/Reputation \+2/);
  assert.match(P.reputation(state),/£100K SALES TURNOVER/);
});

test('promotion occurs only after an upward tier threshold crossing',()=>{
  for(const [before,after,name] of [[19,20,'LOCAL DEALER'],
    [39,40,'TRUSTED DEALER'],[59,60,'REGIONAL SPECIALIST'],
    [79,80,'PRESTIGE DEALER']])
    assert.equal(P.promotion(before,after).name,name);
  assert.equal(P.promotion(40,40),null);
  assert.equal(P.promotion(20,19),null);
});

test('promotion messaging does not pretend upgrades or money were awarded',()=>{
  const html=P.promotionHtml(P.promotion(19,20));
  assert.match(html,/£1,800/);
  assert.match(html,/not a cash award/);
  assert.match(html,/purchase rules/);
});
