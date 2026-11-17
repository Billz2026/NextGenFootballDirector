'use strict';
/* v0.9.35 — My Dealership compact owner HQ and facility investment desk.
 * Every amount is derived from the saved game state and existing economic
 * rules. Rendering never applies an upgrade or changes a saved career.
 */
(() => {
  const cash=n=>new Intl.NumberFormat('en-GB',{
    style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
  const nfmt=n=>new Intl.NumberFormat('en-GB').format(n);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const label=(a,b,note='')=>
    '<div class="hq-metric"><small>'+a+'</small><strong>'+b+
    '</strong><span>'+note+'</span></div>';
  const line=(a,b,extra='')=>
    '<div class="hq-cost-line'+extra+'"><span>'+a+'</span><strong>'+b+'</strong></div>';
  function figures(state,site){
    const p=site.costs(state);
    const monthly=window.MotorTradeMonthly?.statement(state);
    const reserve=window.MotorTradeWorkshop?.reserved(state)??0;
    const dailyWages=(state.staff||[]).reduce((n,person)=>
      n+Math.ceil(person.monthlySalary/30),0);
    const forecourt=site.capacity(state);
    const allowedStock=site.storageLimit(state);
    const overflow=site.overflowUsed(state);
    const workshop=site.bays(state);
    const stock=state.vehicles.length;
    const activeRepairs=state.vehicles.filter(v=>
      v.workshop?.method==='internal'&&
      ['in-progress','quality-check'].includes(v.workshop.stage)).length;
    const P=window.MotorTradePeople;
    const technicians=(state.staff||[]).filter(e=>e.role==='technician');
    const techWorking=technicians.filter(e=>P?.isActive(state,e)).length;
    const techniciansFree=P?.availableTechnicians(state)?.length??0;
    return {p,monthly,reserve,dailyWages,forecourt,allowedStock,overflow,workshop,stock,
      freeSpaces:Math.max(0,allowedStock-stock),
      activeRepairs,techWorking,techniciansFree,
      cashAfterRepairReserves:state.cash-reserve,
      runningDaily:p.total+dailyWages,
      arrears:(state.premises?.arrears??0)+(state.payrollArrears??0)};
  }
  function card(state,site,kind){
    const q=site.quote(state,kind);
    const forecourt=kind==='forecourt';
    const current=forecourt?site.capacity(state):site.bays(state);
    const title=forecourt?'FORECOURT EXPANSION':'WORKSHOP EXPANSION';
    const short=forecourt?
      'Increase the number of vehicles you can hold at once.':
      'Increase physical repair bays; technicians are still required.';
    const unit=forecourt?'VEHICLE SPACES':'REPAIR BAYS';
    if(forecourt){
      const next=q.maximum?null:q.next,remaining=next?
        Math.max(0,q.requiredReputation-state.reputationScore):0;
      const nextText=next?
        'Next permanent expansion: '+next+' spaces at '+q.requiredReputation+
        ' reputation ('+remaining+' points remaining).':
        'Maximum permanent forecourt unlocked. Previously earned space never shrinks.';
      return '<article class="hq-upgrade"><header class="hq-upgrade-head"><div>'+
        '<small>REPUTATION / PERMANENT CAPACITY</small><h3>AUTOMATIC FORECOURT GROWTH</h3>'+
        '</div><span class="hq-status hq-ready">AUTO UNLOCK</span></header>'+
        '<div class="hq-upgrade-capacity"><strong>'+current+' PHYSICAL SPACES</strong>'+
        '<span>+ '+site.OVERFLOW_SPACES+' TEMPORARY OFFSITE STOCK POSITIONS</span></div>'+
        '<p>Permanent capacity unlocks at 20 reputation (6 vehicles), 40 (8 vehicles) and 60 (10 vehicles). '+
        'No manual purchase or one-off capital payment is required, even if cash is temporarily low. '+
        'The larger premises incur higher ordinary running costs.</p>'+
        '<div class="hq-upgrade-costs">'+
        line('TOTAL BUYING LIMIT',site.storageLimit(state)+' VEHICLES')+
        line('OFFSITE COST / CAR / GAME DAY',cash(site.OVERFLOW_DAILY_FEE))+
        line('OFFSITE STORAGE IN USE',site.overflowUsed(state)+' / '+site.OVERFLOW_SPACES)+
        '</div><div class="hq-upgrade-max-note">'+nextText+'</div></article>';
    }
    if(q.maximum)return '<article class="hq-upgrade hq-upgrade-max">'+
      '<header class="hq-upgrade-head"><div><small>FACILITY / '+
      (forecourt?'STOCK CAPACITY':'VEHICLE PREPARATION')+'</small><h3>'+title+
      '</h3></div><span class="hq-status hq-ready">MAXIMUM</span></header>'+
      '<div class="hq-upgrade-capacity"><strong>'+current+' '+unit+
      '</strong><span>FULLY EXPANDED</span></div><p>'+short+
      ' Current running costs continue each game day.</p>'+
      '<div class="hq-upgrade-max-note">No further expansion is currently available.</div></article>';
    const unlocked=q.eligible&&!q.shortfall;
    const reason=!q.eligible?'REQUIRES '+q.requiredReputation+' REPUTATION':
      q.shortfall?'SHORT BY '+cash(q.shortfall):'READY TO EXPAND';
    const status=!q.eligible?'hq-unavailable':q.shortfall?'hq-waiting':'hq-ready';
    const what=forecourt?'forecourt spaces':'repair bays';
    const value=q.current+' → '+q.next+' '+what;
    const message=!q.eligible?'Reach '+q.requiredReputation+
      ' reputation before authorising this upgrade.':
      q.shortfall?'Cash shortfall '+cash(q.shortfall)+
        '; protected repairs, wages and rent must be covered.':
      'Both reputation and cash requirements are met.';
    return '<article class="hq-upgrade"><header class="hq-upgrade-head"><div>'+
      '<small>FACILITY / '+(forecourt?'STOCK CAPACITY':'VEHICLE PREPARATION')+
      '</small><h3>'+title+'</h3></div><span class="hq-status '+status+'">'+
      escape(unlocked?'ELIGIBLE':!q.eligible?'REPUTATION LOCKED':'CASH REQUIRED')+
      '</span></header>'+
      '<div class="hq-upgrade-capacity"><strong>'+value+'</strong><span>'+short+'</span></div>'+
      '<div class="hq-upgrade-costs hq-upgrade-headline-costs">'+
      line('ONE-OFF INVESTMENT',cash(q.cost))+
      line('EXTRA COST PER GAME DAY',cash(q.dailyIncrease))+'</div>'+
      '<div class="hq-upgrade-projection">'+
      line('CURRENT PREMISES / DAY',cash(q.currentDaily))+
      line('AFTER UPGRADE / DAY',cash(q.newDaily))+
      line('CASH AFTER INVESTMENT',cash(state.cash-q.cost))+
      '</div>'+
      '<div class="'+(unlocked?'hq-upgrade-success':'hq-upgrade-warning')+'">'+message+'</div>'+
      '<button type="button" class="trade-button hq-invest-button" '+
      'data-action="upgrade-premises" data-kind="'+kind+'"'+
      (unlocked?'':' disabled')+'>'+
      (unlocked?'APPROVE '+cash(q.cost)+' INVESTMENT':reason)+'</button>'+
      '<details class="hq-upgrade-details"><summary>VIEW INVESTMENT REQUIREMENTS</summary>'+
      '<div class="hq-upgrade-costs">'+
      line('MINIMUM CASH TO APPROVE',cash(q.requiredCash))+
      line('PROTECTED CASH BUFFER',cash(q.protectedCash))+
      line('REPUTATION REQUIRED',q.requiredReputation+' / 100')+
      line('CURRENT REPUTATION',state.reputationScore+' / 100')+
      '</div><p>Cash protection includes outstanding workshop preparation, payroll '+
      'obligations, three days of team wages and seven days of new premises costs. '+
      'Only the investment is debited immediately; future running costs are charged on later game days.</p>'+
      '</details></article>';
  }
  function render(state,site){
    const r=figures(state,site),p=r.p,monthly=r.monthly;
    const forecourt=site.quote(state,'forecourt'),workshop=site.quote(state,'workshop');
    const possible=[workshop].filter(q=>!q.maximum&&q.eligible&&!q.shortfall).length;
    const nextState=r.arrears?'PAYMENT PRESSURE':
      state.cash<r.runningDaily?'CASH RUNWAY ALERT':
      r.freeSpaces===0?'FORECOURT FULL':
      possible?'EXPANSION POSSIBLE':'OPERATIONS ACTIVE';
    const metrics='<div class="hq-metrics">'+
      label('VEHICLE STOCK LIMIT',r.stock+' / '+r.allowedStock,
        r.forecourt+' permanent + '+site.OVERFLOW_SPACES+' temporary offsite · '+
        r.freeSpaces+' free for buying')+
      label('WORKSHOP CAPACITY',r.workshop+' PHYSICAL BAYS',
        r.techWorking+' active '+(r.techWorking===1?'technician':'technicians')+
        ' · '+r.techniciansFree+' free · '+r.activeRepairs+' jobs running')+
      label('DEALERSHIP CASH',cash(state.cash),
        cash(r.cashAfterRepairReserves)+' after workshop reserves')+
      label('DAILY RUNNING COST',cash(r.runningDaily),
        cash(p.total)+' premises (offsite '+cash(p.offsite)+') + '+cash(r.dailyWages)+' wages')+
      '</div>';
    const head='<div class="hq-brief"><div><small>LIVE SITE STATUS</small>'+
      '<strong>FACILITY POSITION</strong>'+
      '<p>Workshop bays require available technicians; unused space does not complete repairs.</p></div>'+
      '<span class="hq-brief-status'+(r.arrears||state.cash<r.runningDaily?' hq-brief-alert':'')+'">'+
      nextState+'</span></div>';
    const cost='<section class="hq-cost-panel"><div class="hq-section-heading">'+
      '<div><small>FIXED COSTS / CASH DISCIPLINE</small><h3>OPERATING COMMITMENTS</h3></div>'+
      '<button type="button" class="hq-text-link" data-page="finance">FULL FINANCES</button></div>'+
      '<div class="hq-commit-grid">'+
      line('PREMISES / DAY',cash(p.total))+
      line('OF WHICH TEMPORARY OFFSITE STORAGE',cash(p.offsite))+
      line('STAFF WAGES / DAY',cash(r.dailyWages))+
      line('TOTAL COST / DAY',cash(r.runningDaily))+
      line('WORKSHOP FUNDS RESERVED',cash(r.reserve))+
      line('MONTHLY PREMISES GUIDE',cash(p.monthlyGuide))+
      line('OUTSTANDING OBLIGATIONS',cash(r.arrears),r.arrears?' hq-due':'')+
      '</div><details class="hq-cost-history"><summary>ACCRUED COSTS & CASH EXPLANATION</summary>'+
      '<div class="hq-commit-grid">'+line('MONTH-TO-DATE PREMISES COST',
        cash(monthly?.premisesExpense??0))+
      line('CASH AFTER REPAIR RESERVES',cash(r.cashAfterRepairReserves))+
      '</div><p>Daily premises and staff costs continue even without sales. '+
      'Repair reserves are part of existing cash, not an additional charge. '+
      'These are operating costs, not statutory accounts.</p></details></section>';
    const upgradeHead='<div class="hq-section-heading hq-upgrade-section-head">'+
      '<div><small>AUTOMATIC FORECOURT / WORKSHOP INVESTMENT</small>'+
      '<h3>DEALERSHIP GROWTH</h3></div>'+
      '<span>'+possible+' '+(possible===1?'OPTION':'OPTIONS')+' CURRENTLY AFFORDABLE</span></div>';
    const more='<details class="hq-guidance"><summary>HOW PREMISES EXPANSION WORKS</summary>'+
      '<p>Permanent forecourt space is awarded automatically when reputation reaches 20, 40 and 60, '+
      'raising the physical capacity from 4 to 6, 8 and then 10. These unlocks never shrink after '+
      'reputation falls. Each dealership can temporarily hold two additional vehicles offsite at '+
      cash(site.OVERFLOW_DAILY_FEE)+' per vehicle per game day, charged as genuine premises expense. '+
      'Workshop bays still require a separately funded upgrade and actual working technicians. '+
      'Workshop expansion protects repair funds, staff wages and overdue obligations. '+
      'These are fictional operating assumptions.</p>'+
      '</details>';
    const shortcuts='<nav class="hq-shortcuts" aria-label="Dealership departments">'+
      '<span>CONTINUE OPERATIONS</span>'+[
      ['stock','VEHICLE STOCK'],['workshop','WORKSHOP'],
      ['staff','YOUR STAFF'],['reports','MANAGEMENT REPORTS']].map(([page,title])=>
      '<button type="button" data-page="'+page+'">'+title+'</button>').join('')+'</nav>';
    return '<div class="hq-control">'+head+metrics+cost+upgradeHead+
      '<div class="hq-upgrades">'+card(state,site,'forecourt')+
        card(state,site,'workshop')+'</div>'+shortcuts+more+'</div>';
  }
  window.MotorTradePremisesView=Object.freeze({figures,render,card});
})();
