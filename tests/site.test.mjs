// Current-production site and engine acceptance tests.
// The pre-v0.9.49 monolith is retained as archive/historical-site-regression.mjs.
// These tests deliberately avoid mock-sale shortcuts, hand-authored financial
// balances, assumed calendar month lengths and pinned asset cache versions.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const html=read('index.html'),css=read('styles.css');
const files=Array.from(html.matchAll(/<script\b[^>]*src="([^"]+)"/g),m=>m[1]);
const localScripts=files.filter(x=>!/^https?:\/\//.test(x));
const paths=localScripts.map(x=>x.split('?')[0].replace(/^\.\//,''));
const stylesheetFiles=Array.from(
  html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g),
  m=>m[1].split('?')[0].replace(/^\.\//,''));
const context={window:{},Date,Intl,document:{addEventListener(){}}};
const engineScripts=[
  'vehicle-intel.js','vehicle-photos.js','vehicle-accuracy.js',
  'vehicle-market.js','premises.js','people.js','calendar.js',
  'monthly.js','career-progression.js','events.js','showroom-traffic.js',
  'workshop.js','stock-ageing.js','customers.js','aftersales.js',
  'empire-progression.js','motor-group.js','dealer-delegation.js','supervisor-operations.js','trading.js','vehicle-cards.js','vehicle-view.js','staff-performance.js',
  'people-view.js','monthly-view.js','events-view.js','workshop-view.js',
  'customers-view.js','aftersales-view.js','premises-view.js',
  'auction-hall-view.js','dashboard-view.js','inbox-office.js',
  'buying-desk-view.js','stock-view.js','cashflow-forecast.js','finance-view.js'
];
for(const path of engineScripts)runInNewContext(read(path),context,{filename:path});
const W=context.window,E=W.MotorTradeEngine,M=E.monthly,P=E.people;
const copy=s=>JSON.parse(JSON.stringify(s));
const valid=s=>assert.ok(E.normalize(copy(s)),'Real save/reload validator must accept career');
function tick(s){
  E.showroom.closeWaiting(s,'End of trading day.');
  const closing=s.day===s.monthPlan.endDay;
  if(closing){
    const report=M.close(s);
    assert.ok(report,'The genuine calendar month should close');
  }
  s.day++;
  E.rollAuctionHall(s);
  s.deadlineSession=0;
  if(closing)M.next(s);
  E.staffDay(s);
  E.premisesDay(s);
  E.stockAgeingDay(s);
  E.advanceWorkshop(s);
  E.advanceCustomers(s);
  E.advanceAfterSales(s);
}
function prepared(name='Integration Workshop Motors'){
  const s=E.createStaffed(name,[]);
  const seller=E.marketFor(s).sellers[0];
  assert.ok(seller,'A real seller must be available for the test');
  assert.ok(E.acquireSeller(s,seller.id,seller.ask).ok);
  const car=s.vehicles[0];
  assert.ok(E.assessStock(s,car.id).ok);
  assert.ok(E.startPrep(s,car.id,'internal').ok);
  for(let i=0;i<17&&car.status==='acquired';i++){
    tick(s);
    if(car.workshop.stage==='quality-check')
      assert.ok(E.finishPrep(s,car.id).ok,'QC must be completed or charged as rework');
  }
  assert.equal(car.status,'prepared','No instant preparation shortcut may be used');
  valid(s);
  return {s,car};
}

test('published scripts and styles all point to existing versioned local files',()=>{
  assert.ok(localScripts.length>30);
  assert.ok(stylesheetFiles.length>10);
  for(const raw of localScripts){
    assert.match(raw,/^\.\//,'Local JavaScript must use a relative path');
    assert.match(raw,/\?v=\d+$/,'Local JavaScript must have a cache version');
    assert.ok(existsSync(new URL(raw.split('?')[0],root)),
      'Missing JS file: '+raw);
  }
  for(const path of stylesheetFiles)
    assert.ok(existsSync(new URL(path,root)),'Missing stylesheet '+path);
  assert.equal(new Set(paths).size,paths.length,'The site cannot load one engine module twice');
});

test('HTML loader preserves the real engine dependency graph and UI boot order',()=>{
  for(const [before,after] of [
    ['people.js','workshop.js'],['calendar.js','events.js'],
    ['monthly.js','trading.js'],['stock-ageing.js','trading.js'],
    ['showroom-traffic.js','customers.js'],
    ['customers.js','aftersales.js'],['aftersales.js','trading.js'],
    ['staff-performance.js','people-view.js'],
    ['cashflow-forecast.js','finance-view.js'],
    ['trading.js','simulator.js'],['finance-view.js','simulator.js'],
    ['aftersales-view.js','simulator.js']
  ]){
    assert.ok(paths.includes(before)&&paths.includes(after));
    assert.ok(paths.indexOf(before)<paths.indexOf(after),
      before+' must load before '+after);
  }
  for(const path of engineScripts)
    assert.ok(paths.includes(path),'Browser missing tested engine module '+path);
});

test('brand, navigation, sections and accessible career controls remain present',()=>{
  assert.match(html,/<title>The Motor Trade \| UK Car Dealer Simulator<\/title>/);
  assert.ok(existsSync(new URL('assets/nextgen-header-wordmark-2026.webp',root)));
  for(const id of [
    'screen-menu','screen-setup','screen-career','career-form','menu-continue',
    'continue-day','career-export','career-restore','stock-list','workshop-board',
    'sales-list','aftersales-board','finance-overview','monthly-report-view',
    'dashboard-priorities','inbox-list','inbox-detail','market-sellers',
    'people-board','premises-view','career-tools'
  ])assert.match(html,new RegExp('id="'+id+'"'),'Missing primary UI anchor '+id);
  for(const page of [
    'dashboard','inbox','auctionHall','auctions','stock','workshop',
    'sales','finance','reports','events','staff','reputation','business'
  ]){
    assert.match(html,new RegExp('data-panel="'+page+'"'));
    assert.match(html,new RegExp('data-page="'+page+'"'));
  }
  assert.match(css,/@media/,'Responsive CSS should be present');
  assert.match(css,/prefers-reduced-motion/,'Reduced motion should be supported');
});

test('current runtime modules and view APIs boot without stubbing financial outcomes',()=>{
  for(const key of [
    'MotorTradeEngine','MotorTradeWorkshop','MotorTradePeople',
    'MotorTradeCustomers','MotorTradeStockAgeing','MotorTradeAfterSales',
    'MotorTradeCashForecast','MotorTradeFinanceView',
    'MotorTradeMonthlyView','MotorTradeAfterSalesView','MotorTradeStockView'
  ])assert.ok(W[key],key+' must be available');
  assert.ok(E.VERSION>=20);
  assert.equal(typeof E.completeSale,'function');
  assert.equal(typeof E.advanceAfterSales,'function');
  assert.equal(typeof E.stockAgeingDay,'function');
});

test('staffed career starts with four paid employees, actual capital and a valid save',()=>{
  const s=E.createStaffed('Acceptance Test Motors',[]);
  assert.equal(s.startingCapital,45000);
  assert.equal(s.cash,45000);
  assert.deepEqual(Array.from(s.staff,x=>x.role).sort(),
    ['buyer','sales','supervisor','technician']);
  assert.ok(s.staff.every(x=>x.monthlySalary>0));
  assert.equal(s.stock,0);
  assert.equal(s.sales,0);
  assert.equal(s.vehicles.length,0);
  assert.equal(s.afterSalesCases.length,0);
  assert.equal(s.stockAgeingArrears,0);
  assert.equal(s.monthPlan.endDay,22);
  assert.equal(s.monthPlan.startDay,1);
  valid(s);
});

test('a real seven-day no-sales payroll and premises run reconciles to the forecast',()=>{
  const s=E.createStaffed('Cashflow Acceptance',[]);
  const starting=copy(s),plan=W.MotorTradeCashForecast.forecast(s,E);
  assert.equal(plan.valid,true);
  assert.equal(plan.horizon,7);
  assert.equal(plan.pendingClaims,0);
  assert.equal(plan.reserve,0);
  assert.equal(plan.projected,45000-7*plan.daily);
  assert.deepEqual(copy(s),starting,'Forecast cannot mutate game state');
  for(let i=0;i<7;i++)tick(s);
  assert.equal(s.cash,plan.projected);
  assert.equal(s.payrollArrears,0);
  assert.equal(s.premises.arrears,0);
  assert.equal(s.cash,45000+s.ledger.reduce((n,x)=>n+x.delta,0));
  valid(s);
});

test('real acquisition and in-house workshop require completed QC before listing',()=>{
  const s=E.createStaffed('Workshop Gate Acceptance',[]);
  const seller=E.marketFor(s).sellers[0];
  assert.ok(E.acquireSeller(s,seller.id,seller.ask).ok);
  const car=s.vehicles[0];
  assert.equal(E.advertise(s,car.id,car.retail).ok,false);
  assert.ok(E.assessStock(s,car.id).ok);
  assert.ok(E.startPrep(s,car.id,'internal').ok);
  assert.equal(E.advertise(s,car.id,car.retail).ok,false);
  for(let day=0;day<18&&car.status==='acquired';day++){
    tick(s);
    if(car.workshop.stage==='quality-check')assert.ok(E.finishPrep(s,car.id).ok);
  }
  assert.equal(car.status,'prepared');
  assert.equal(car.workshop.stage,'ready');
  assert.ok(car.workshop.qcLog.at(-1).passed);
  assert.ok(E.advertise(s,car.id,car.retail).ok);
  assert.equal(car.status,'listed');
  assert.equal(s.vehicles.length,1);
  valid(s);
});

test('workshop reserves are protected without inventing preparation payments',()=>{
  const s=E.createStaffed('Reserve Acceptance',[]);
  const seller=E.marketFor(s).sellers[0];
  assert.ok(E.acquireSeller(s,seller.id,seller.ask).ok);
  const reserve=E.workshop.reserved(s);
  assert.ok(reserve>=0);
  const cash=s.cash,ledger=s.ledger.length;
  const forecast=W.MotorTradeCashForecast.forecast(s,E);
  assert.equal(forecast.reserve,reserve);
  assert.equal(forecast.available,cash-reserve);
  assert.equal(s.cash,cash);
  assert.equal(s.ledger.length,ledger);
  valid(s);
});

test('month close occurs on real calendar day 22 and archives immutable records',()=>{
  const s=E.createStaffed('Calendar Acceptance',[]);
  assert.equal(W.MotorTradeCalendar.label(22),'30 November 2026');
  assert.equal(W.MotorTradeCalendar.label(23),'1 December 2026');
  const meeting=E.events.holdMeeting(s,'buying');
  assert.equal(meeting.ok,true);
  while(s.day<22)tick(s);
  const monthOneTarget=s.monthPlan.unitTarget;
  const bankBefore=s.cash;
  assert.equal(s.monthlyReports.length,0,'Month not closed before final-day session');
  tick(s);
  assert.equal(s.day,23);
  assert.equal(s.monthlyReports.length,1);
  assert.equal(s.monthPlan.month,2);
  const archived=s.monthlyReports[0];
  assert.equal(archived.endDay,22);
  assert.equal(archived.closingCash,bankBefore);
  assert.equal(archived.targetUnits,monthOneTarget);
  const original=JSON.stringify(archived);
  assert.equal(s.cash,45000+s.ledger.reduce((n,x)=>n+x.delta,0));
  valid(s);
  const loaded=E.normalize(copy(s));
  assert.equal(JSON.stringify(loaded.monthlyReports[0]),original);
});

test('invalid accounting, aged-stock and aftersales balances are rejected on import',()=>{
  const s=E.createStaffed('Tamper Acceptance',[]);
  const tamperedCash=copy(s);tamperedCash.cash++;
  assert.equal(E.normalize(tamperedCash),null);
  const tamperedAgeing=copy(s);tamperedAgeing.stockAgeingArrears=-1;
  assert.equal(E.normalize(tamperedAgeing),null);
  const tamperedCare=copy(s);tamperedCare.afterSalesCutoverDay=s.day+1;
  assert.equal(E.normalize(tamperedCare),null);
  const duplicateId=copy(s);
  duplicateId.vehicles=[{id:1},{id:1}];
  assert.equal(E.normalize(duplicateId),null);
});

test('previous v19 career migrates with no backdated aftersales cases',()=>{
  const s=E.createStaffed('Legacy Care Acceptance',[]);
  const prior=copy(s);prior.version=19;
  delete prior.afterSalesCases;delete prior.afterSalesCutoverDay;
  const migrated=E.normalize(prior);
  assert.ok(migrated);
  assert.equal(migrated.afterSalesCutoverDay,s.day);
  assert.equal(migrated.afterSalesCases.length,0);
  assert.equal(E.advanceAfterSales(migrated).opened.length,0);
  valid(migrated);
});

test('primary stock, financial and management views are read-only on a real career',()=>{
  const {s}=prepared('Read-only View Acceptance');
  const before=JSON.stringify(s);
  const financial=W.MotorTradeFinanceView.summary(s,E);
  assert.match(financial.html,/CASH/);
  assert.match(financial.html,/NO SALES ASSUMED/);
  const report=W.MotorTradeMonthlyView.renderReport(s,M);
  assert.ok(report.includes('MONTH'));
  const inventory=W.MotorTradeStockView.render(s,E);
  assert.match(inventory.html,/STOCK/);
  assert.equal(W.MotorTradeAfterSalesView.render(s,E),'');
  assert.equal(JSON.stringify(s),before,'Viewing screens cannot silently spend money');
  valid(s);
});

test('genuine market listings remain deterministic when re-opening the same day',()=>{
  const s=E.createStaffed('Market Acceptance',[]);
  const a=E.marketFor(s),b=E.marketFor(s);
  assert.deepEqual(Array.from(a.sellers,x=>x.id),Array.from(b.sellers,x=>x.id));
  assert.ok(a.sellers.length>0);
  const id=a.sellers[0].id;
  const paid=E.acquireSeller(s,id,a.sellers[0].ask);
  assert.ok(paid.ok);
  assert.equal(s.vehicles.length,1);
  assert.equal(E.acquireSeller(s,id,a.sellers[0].ask).code,'owned',
    'An already acquired listing must be explicitly blocked from duplicate buying');
  assert.equal(s.vehicles.length,1,'Attempting to buy the same stock twice cannot create a second car');
  valid(s);
});
