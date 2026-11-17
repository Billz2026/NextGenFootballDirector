'use strict';
/*
 * Financial planning is a read-only no-sales stress test.
 * It never spends cash, predicts buyers or changes the career save.
 * Existing repair reserves are counted once as earmarked cash; future
 * payroll and premises charges are additional commitments.
 */
(() => {
  const HORIZONS=Object.freeze([7,14,30]);
  const MAX_PLAN=1000000;
  const whole=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_PLAN;
  const money=n=>new Intl.NumberFormat('en-GB',{
    style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const defaults=()=>({horizon:7,purchase:0,prep:0,extraRepair:0});
  function validate(input={}){
    const h=Number(input.horizon??7);
    const values=['purchase','prep','extraRepair'].map(k=>Number(input[k]??0));
    if(!HORIZONS.includes(h)||!values.every(whole))
      return null;
    return {horizon:h,purchase:values[0],prep:values[1],extraRepair:values[2]};
  }
  function forecast(state,E,input=defaults()){
    const scenario=validate(input);
    if(!scenario)return {valid:false,message:'Enter whole-pound amounts from £0 to £1,000,000.'};
    const {horizon,purchase,prep,extraRepair}=scenario;
    const wages=(state.staff||[]).reduce((n,e)=>n+E.people.dailyCost(e),0);
    const site=E.premises.costs(state);
    const reserve=E.workshop.reserved(state);
    const arrears=state.payrollArrears+(state.premises?.arrears||0);
    const pendingInvoice=state.auctionHall?.phase==='payment'?
      (()=>{const lot=E.auctionLot(state);
        return lot?state.auctionHall.currentBid+lot.fee:0;})():0;
    const hasPurchase=purchase>0;
    const used=state.vehicles.length;
    const capacity=E.premises.storageLimit(state);
    const permanent=E.premises.capacity(state);
    const overCapacity=hasPurchase&&used+1>capacity;
    const prepWithoutPurchase=!hasPurchase&&prep>0;
    const addedOffsite=hasPurchase&&used>=permanent?
      E.premises.OVERFLOW_DAILY_FEE:0;
    const daily=wages+site.total+addedOffsite;
    const committedToday=reserve+arrears+pendingInvoice;
    const planned=purchase+prep+extraRepair;
    const available=state.cash-committedToday;
    const afterPlans=available-planned;
    const at=days=>afterPlans-daily*days;
    const projected=at(horizon);
    const runway=daily>0?Math.max(0,Math.floor(Math.max(0,afterPlans)/daily)):null;
    const minimumBuffer=daily*3;
    const severity=overCapacity||prepWithoutPurchase?'blocked':
      projected<0?'shortfall':
      projected<minimumBuffer?'caution':'covered';
    return {valid:true,scenario,openingCash:state.cash,
      wages,premises:site.total,additionalOffsite:addedOffsite,daily,
      reserve,arrears,pendingInvoice,committedToday,available,planned,
      afterPlans,horizon,projected,runway,minimumBuffer,severity,
      shortfall:Math.max(0,-projected),
      offsiteLimited:overCapacity,prepWithoutPurchase,
      checkpoints:HORIZONS.map(day=>({day,headroom:at(day)})),
      heldDeposits:E.customers.heldDeposits(state)};
  }
  function status(f){
    if(f.offsiteLimited)return {
      title:'STOCK CAPACITY REACHED',
      description:'The additional vehicle would exceed the current stock limit. Selling or freeing space is required before purchasing.'
    };
    if(f.prepWithoutPurchase)return {
      title:'ENTER A PURCHASE PRICE',
      description:'New vehicle preparation is linked to the proposed purchase. Use Extra repairs for costs on vehicles already owned.'
    };
    if(f.severity==='shortfall')return {
      title:'FUNDING SHORTFALL · '+money(f.shortfall),
      description:'Under this no-sales scenario, cash is insufficient for all committed costs and '+f.horizon+' days of bills. The negative figure is a planning gap, not an overdraft.'
    };
    if(f.severity==='caution')return {
      title:'THIN CASH BUFFER',
      description:'The plan is funded, but leaves less than three game days of wages and premises costs after day '+f.horizon+'.'
    };
    return {title:'FORECAST COVERED',
      description:'The proposed spending and '+f.horizon+' days of baseline bills leave at least a three-day operating buffer.'};
  }
  function pair(label,value,cls=''){
    return '<div class="fc-pair '+cls+'"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>';
  }
  function renderResults(state,E,input=defaults()){
    const f=forecast(state,E,input);
    if(!f.valid)return '<p class="fc-warning" role="status">'+esc(f.message)+'</p>';
    const s=status(f);
    const signed=n=>(n<0?'−':'')+money(Math.abs(n));
    const cards='<div class="fc-summary-grid">'+
      pair('SPENDABLE BEFORE NEW PLANS',signed(f.available))+
      pair('CASH AFTER PROPOSED SPEND',signed(f.afterPlans))+
      pair(f.horizon+'-DAY FREE CASH OUTLOOK',signed(f.projected),
        f.projected<0?'fc-negative':'')+
      pair('NO-SALES RUNWAY',f.runway===null?'NO DAILY COST':
        f.runway+' GAME DAY'+(f.runway===1?'':'S'))+
      '</div>';
    const details='<div class="fc-cost-table">'+
      '<div><span>Current workshop reserves</span><strong>'+money(f.reserve)+'</strong></div>'+
      '<div><span>Existing unpaid wages & premises</span><strong>'+money(f.arrears)+'</strong></div>'+
      '<div><span>Unpaid auction invoice</span><strong>'+money(f.pendingInvoice)+'</strong></div>'+
      '<div><span>New proposed spending</span><strong>'+money(f.planned)+'</strong></div>'+
      '<div><span>Wages / game day</span><strong>'+money(f.wages)+'</strong></div>'+
      '<div><span>Premises / game day'+(f.additionalOffsite?' (incl. new offsite space)':'')+
      '</span><strong>'+money(f.premises+f.additionalOffsite)+'</strong></div>'+
      '<div class="fc-total"><span>'+f.horizon+' days of fixed costs</span><strong>'+
      money(f.daily*f.horizon)+'</strong></div></div>';
    const checkpoints='<div class="fc-checkpoints" aria-label="Cash headroom by projection horizon">'+
      f.checkpoints.map(p=>'<div class="'+(p.headroom<0?'fc-negative':'')+'"><small>DAY '+
        p.day+'</small><strong>'+signed(p.headroom)+'</strong></div>').join('')+'</div>';
    const warning='<div class="fc-alert fc-alert-'+f.severity+'" role="status"><strong>'+
      esc(s.title)+'</strong><p>'+esc(s.description)+'</p></div>';
    const note='<p class="fc-notes">Assumes <strong>NO future sales or new income</strong>, stable employee and premises costs, and one proposed vehicle purchased immediately. '+
      'New preparation and additional repairs are allowances for spending, not double-counted existing workshop reserves. '+
      'Reserved funds are still in today\'s bank balance; they are removed only to show what cannot safely be spent. '+
      'Customer deposits ('+money(f.heldDeposits)+') are excluded. No transactions are created.</p>';
    return cards+warning+checkpoints+'<details class="fc-breakdown"><summary>VIEW FORECAST COST BREAKDOWN</summary>'+
      details+'</details>'+note;
  }
  function render(state,E,input=defaults()){
    const s=validate(input)||defaults();
    return '<section id="fin-cash-forecast" class="fc-forecast fin-panel" aria-label="Cash flow forecast">'+
      '<div class="fc-heading"><div><small>FINANCIAL PLANNING / READ-ONLY</small>'+
      '<h3>CAN THE DEALERSHIP AFFORD THE NEXT MOVE?</h3></div>'+
      '<span>NO SALES ASSUMED</span></div>'+
      '<div class="fc-controls"><div class="fc-horizons" role="group" aria-label="Forecast period">'+
      HORIZONS.map(day=>'<button type="button" data-action="finance-horizon" data-days="'+day+
        '" aria-pressed="'+(s.horizon===day)+'">'+day+' DAYS</button>').join('')+'</div>'+
      '<div class="fc-scenario-fields">'+[
        ['purchase','VEHICLE PURCHASE £',s.purchase],
        ['prep','PREP FOR NEW VEHICLE £',s.prep],
        ['extraRepair','EXTRA REPAIRS £',s.extraRepair]
      ].map(([key,label,value])=>
        '<label><span>'+label+'</span><input type="number" min="0" max="1000000" step="1" '+
        'inputmode="numeric" data-forecast-field="'+key+'" value="'+value+'"></label>').join('')+
      '</div><button type="button" class="fc-reset" data-action="finance-reset-plan">RESET PLAN</button></div>'+
      '<div id="fin-forecast-results" aria-live="polite">'+renderResults(state,E,s)+'</div>'+
      '</section>';
  }
  window.MotorTradeCashForecast=Object.freeze({
    HORIZONS,MAX_PLAN,defaults,validate,forecast,render,renderResults
  });
})();