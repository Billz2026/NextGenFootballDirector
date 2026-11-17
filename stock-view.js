'use strict';
/* v0.9.18 — Vehicle Stock: single source of truth for inventory and capital.
 * All figures are derived from existing career records; no new save fields.
 */
(() => {
  const VC=window.MotorTradeCards;
  if(!VC)throw new Error('Load vehicle-cards.js before stock-view.js');
  const esc=VC.esc,money=VC.money,AG=window.MotorTradeStockAgeing;
  const mileage=n=>new Intl.NumberFormat('en-GB').format(n)+' mi';
  const FILTERS=Object.freeze(['all','prep','ready','listed']);
  const labelSource={auction:'AUCTION PURCHASE',seller:'PRIVATE SELLER','part-ex':'PART EXCHANGE'};
  function group(v){
    if(v.status==='listed')return 'listed';
    if(v.status==='prepared')return 'ready';
    return 'prep';
  }
  function phase(v){
    if(v.status==='listed')return {label:'ON SALE',tone:'listed',next:'SALES OFFICE'};
    if(v.status==='prepared')return {label:'READY TO ADVERTISE',tone:'ready',next:'SET RETAIL PRICE'};
    const stage=v.workshop?.stage;
    const words={
      unassessed:'AWAITING ASSESSMENT',
      quoted:'REPAIR APPROVAL DUE',
      'in-progress':v.workshop?.paused?'REPAIRS PAUSED':'REPAIRS IN PROGRESS',
      'quality-check':'FINAL QUALITY CHECK DUE'
    };
    return {label:words[stage]||'WORKSHOP REQUIRED',tone:'prep',next:'WORKSHOP'};
  }
  function figures(v){
    const stage=v.workshop?.stage;
    const booked=['in-progress','quality-check'].includes(stage);
    // Repairs are charged when booked but prepSpent is recorded only on QC.
    // They must never disappear from cash invested while a job is underway.
    const paidRepairs=booked?Number(v.workshop.repairCost||0):Number(v.prepSpent||0);
    const futurePrep=v.status==='acquired'&&['unassessed','quoted'].includes(stage)?
      Number(v.prepBudget||0):0;
    const invested=Number(v.cost||0)+paidRepairs;
    const likely=Number(v.profile?.likelySale??v.retail);
    const likelySale=v.status==='listed'&&Number.isSafeInteger(v.asking)?
      Math.min(v.asking,likely):likely;
    return {acquisition:v.cost,paidRepairs,invested,futurePrep,
      likelySale,contribution:likelySale-invested-futurePrep};
  }
  function summary(state){
    const vehicles=state.vehicles;
    const site=window.MotorTradePremises;
    return {count:vehicles.length,physical:state.capacity,
      limit:site.storageLimit(state),offsite:site.overflowUsed(state),
      spaces:Math.max(0,site.storageLimit(state)-vehicles.length),
      prep:vehicles.filter(v=>group(v)==='prep').length,
      ready:vehicles.filter(v=>group(v)==='ready').length,
      listed:vehicles.filter(v=>group(v)==='listed').length,
      invested:vehicles.reduce((n,v)=>n+figures(v).invested,0),
      reserved:vehicles.reduce((n,v)=>n+figures(v).futurePrep,0)};
  }
  function inventoryRow(v,state,selected){
    const p=phase(v),age=Math.max(0,state.day-v.acquiredDay);
    const f=figures(v),ageClass=age>=45?'stock-age-critical':age>=30?'stock-age-warning':
      age>=15?'stock-age-watch':'';
    return '<article class="stock-unit'+(selected?' stock-unit-selected':'')+'">'+
      '<div class="stock-unit-thumb">'+VC.photo(v,'stock')+'</div>'+
      '<button type="button" class="stock-unit-select" data-action="select-stock" data-id="'+v.id+
        '" aria-pressed="'+selected+'">'+
        '<span class="stock-unit-kicker">STOCK '+v.id+' · '+esc(labelSource[v.source]||v.source.toUpperCase())+'</span>'+
        '<strong>'+esc(v.title)+'</strong>'+
        '<small>'+mileage(v.miles)+' · '+esc(v.fuel)+' · '+esc(v.gearbox)+'</small>'+
        '<span class="stock-unit-bottom"><span class="stock-status stock-status-'+p.tone+'">'+p.label+'</span>'+
        '<b class="'+ageClass+'">'+age+' DAYS</b></span>'+
        '<span class="stock-unit-cost">INVESTED '+money(f.invested)+'</span>'+
      '</button></article>';
  }
  function costRow(label,amount,strong=false){
    return '<div'+(strong?' class="stock-cost-emphasis"':'')+'><span>'+esc(label)+
      '</span><strong>'+money(amount)+'</strong></div>';
  }
  function controls(v,state){
    const p=phase(v),stage=v.workshop?.stage;
    if(v.status==='acquired'){
      const guidance=stage==='in-progress'?
        (v.workshop.paused?'Repairs paused — review staffing or transfer the job.':
          v.workshop.remainingDays+' game day(s) remaining before quality control.'):
        stage==='quality-check'?'Repairs finished; final quality control is due.':
        stage==='quoted'?'Review the workshop quote and authorise repairs.':
        'Start with a workshop assessment before authorising repairs.';
      return '<div class="stock-action-box"><h4>NEXT DECISION · '+esc(p.next)+'</h4>'+
        '<p>'+esc(guidance)+'</p>'+
        '<button type="button" class="trade-button" data-page="workshop" data-id="'+v.id+
        '">OPEN WORKSHOP</button></div>';
    }
    const caseRecord=state.customerCases?.[String(v.id)];
    const locked=v.status==='listed'&&caseRecord&&
      ['agreed','reserved','collectable'].includes(caseRecord.status);
    const price=Number.isSafeInteger(v.asking)?v.asking:v.retail;
    const ageing=AG.ageInfo(state,v);
    const planPrice=ageing.target,canReprice=ageing.days>=15&&
      planPrice<price&&!locked;
    const canTrade=ageing.days>=30&&
      (!caseRecord||caseRecord.status==='lost');
    return '<div class="stock-action-box"><h4>NEXT DECISION · '+p.next+'</h4>'+
      (v.status==='listed'?'<p>Advertising is live. Buyer interest and agreements are managed in the Sales Office.</p>':
        '<p>Quality control has passed. Set your asking price to advertise the car.</p>')+
      (locked?'<p class="stock-lock-note">PRICING LOCKED · An active customer agreement must be resolved in the Sales Office.</p>':'')+
      '<div class="stock-price-action"><label for="stock-price-'+v.id+
      '">RETAIL ASKING PRICE (£)<input class="trade-input" id="stock-price-'+v.id+
      '" type="number" inputmode="numeric" min="500" max="75000" step="50" value="'+price+'"'+
      (locked?' disabled':'')+'></label>'+
      '<button type="button" class="trade-button" data-action="list-stock" data-id="'+v.id+
      '"'+(locked?' disabled':'')+'>'+(v.status==='listed'?'UPDATE PRICE':'ADVERTISE VEHICLE')+
      '</button></div>'+
      (canReprice?'<button type="button" class="trade-button stock-age-reprice" data-action="reprice-aged-stock" data-id="'+v.id+
        '">APPLY AGEING PRICE GUIDE · '+money(planPrice)+'</button>':'')+
      (ageing.days>=30?'<div class="stock-trade-choice"><strong>EXIT TO TRADE · LIQUIDATE CAPITAL</strong>'+
        '<p>Trade bid '+money(window.MotorTradeEngine.wholesaleOffer(v,state.day))+
        ' before holding charges already incurred. No retail sale credit.</p>'+
        '<button type="button" class="trade-button trade-button-secondary" data-action="dispose-aged-stock" data-id="'+v.id+
        '"'+(canTrade?'':' disabled')+'>SELL TO TRADE · RELEASE STOCK SPACE</button>'+
        (canTrade?'':'<small>Resolve the active customer enquiry or agreement first.</small>')+
        '</div>':'')+
      (v.status==='listed'?'<button type="button" class="trade-button trade-button-secondary" data-page="sales" data-id="'+v.id+
      '">OPEN SALES OFFICE</button>':'')+'</div>';
  }
  function dossier(v,state,reportCard){
    const f=figures(v),p=phase(v),age=Math.max(0,state.day-v.acquiredDay);
    const grade=v.profile?.grade??3;
    const source=labelSource[v.source]||v.source.toUpperCase();
    const ageing=AG.ageInfo(state,v);
    const risk=age>=45?'45+ DAYS · DAILY HOLDING CHARGE & WEAKER BUYER DEMAND':
      age>=30?'30+ DAYS · CONSIDER REPRICING OR TRADE EXIT':
      age>=15?'15+ DAYS · DAILY STOCK HOLDING COSTS HAVE STARTED':'';
    return '<section class="stock-dossier" aria-label="Selected vehicle file">'+
      '<div class="stock-dossier-top"><div><span>VEHICLE FILE · STOCK '+v.id+'</span>'+
      '<strong>'+esc(v.title)+'</strong></div><span class="stock-status stock-status-'+p.tone+'">'+p.label+'</span></div>'+
      '<div class="stock-dossier-grid"><div class="stock-dossier-vehicle">'+
      VC.heading(v,'stock',source+' · STOCK '+v.id)+
      '<p class="stock-dossier-note">'+esc(v.note||'')+'</p>'+
      '<div class="stock-facts"><div><small>ACQUIRED</small><strong>GAME DAY '+v.acquiredDay+'</strong></div>'+
      '<div><small>DAYS HELD</small><strong class="'+(age>=30?'stock-age-warning':'')+'">'+age+'</strong></div></div>'+
      reportCard(v,'stock',v.asking??v.retail)+'</div>'+
      '<div class="stock-dossier-finance">'+
      '<div class="stock-finance-heading"><h3>UNIT FINANCIALS</h3></div>'+
      '<div class="stock-finance-summary">'+
        '<div><small>CASH INVESTED</small><strong>'+money(f.invested)+'</strong></div>'+
        '<div><small>LIKELY RETAIL SALE</small><strong>'+money(f.likelySale)+'</strong></div>'+
        '<div class="stock-summary-contribution'+(f.contribution<0?' stock-margin-loss':'')+
          '"><small>PROJECTED GROSS CONTRIBUTION</small><strong>'+money(f.contribution)+'</strong></div>'+
      '</div>'+
      (risk?'<div class="stock-aged-alert">'+risk+'</div>'+
        '<div class="stock-age-figures"><div><small>STOCK HOLDING / DAY</small><strong>'+money(ageing.daily)+'</strong></div>'+
        '<div><small>MARKET PRICE GUIDE</small><strong>'+money(ageing.target)+'</strong></div>'+
        '<div><small>GROSS MARGIN AT GUIDE</small><strong class="'+(ageing.expectedMargin<0?'stock-age-loss':'')+'">'+
        money(ageing.expectedMargin)+'</strong></div></div>'+
        '<p class="stock-age-explainer">Ageing reduces buyer interest at stale asking prices. '+
        'The guide is optional, not a guaranteed sale. Daily charges are separate operating expenses; '+
        'gross contribution excludes them. If the guide implies a loss, you can hold your price or exit to trade.</p>':'')+
      controls(v,state)+
      '<details class="stock-cost-details"><summary>FULL COST BREAKDOWN & ASSUMPTIONS</summary>'+
        '<div class="stock-cost-table">'+
        costRow('Acquisition incl. inspection / assessment',f.acquisition)+
        costRow('Repairs already paid / booked',f.paidRepairs)+
        costRow('CASH INVESTED TO DATE',f.invested,true)+
        costRow('Unspent preparation requirement',f.futurePrep)+
        costRow('Modelled likely achieved sale',f.likelySale)+
        '</div>'+
        '<p class="stock-finance-note">Cash invested includes paid repair bookings even before final QC. Unspent preparation is a protected estimate, not money already paid. Likely sale is a fictional projection'+
        (v.status==='listed'?' capped at your asking price':'')+
        '. Gross contribution excludes wages, premises, tax, aftersales and other overheads.</p></details>'+
      '</div></div></section>';
  }
  function render(state,{filter='all',selectedId=null,reportCard=()=>''}={}){
    const value=FILTERS.includes(filter)?filter:'all';
    const stats=summary(state);
    const metrics=[
      ['TOTAL VEHICLE STOCK',stats.count+' / '+stats.limit,
        stats.physical+' PERMANENT + 2 OFFSITE · '+stats.spaces+' BUYING SPACES FREE'],
      ['CASH INVESTED',money(stats.invested),'IN EXISTING STOCK'],
      ['UNSPENT PREP',money(stats.reserved),'WORKSHOP RESERVE']
    ];
    const ageingCount=state.vehicles.filter(v=>AG.age(state,v)>=15).length;
    const dailyCharges=AG.chargeFor(state);
    const head='<div class="stock-kpi-strip">'+metrics.map(([label,number,note])=>
      '<div class="stock-kpi"><small>'+label+'</small><strong>'+number+
      '</strong><span>'+note+'</span></div>').join('')+'</div>'+
      (ageingCount?'<div class="stock-age-overview"><strong>STOCK AGEING / '+ageingCount+
        ' VEHICLE'+(ageingCount===1?'':'S')+' OVER 15 DAYS</strong><span>'+
        money(dailyCharges)+'/DAY IN HOLDING CHARGES · '+
        money(state.stockAgeingArrears||0)+' UNPAID</span></div>':'');
    if(!state.vehicles.length)return {selectedId:null,html:head+
      '<div class="trade-empty stock-empty"><h2>YOUR FORECOURT IS EMPTY.</h2>'+
      '<p>Purchase a vehicle at the weekly Auction Hall or negotiate directly with a private seller. New purchases automatically enter this stock register.</p>'+
      '<div class="stock-empty-actions"><button type="button" class="trade-button" data-page="auctions">OPEN BUYING DESK</button>'+
      '<button type="button" class="trade-button trade-button-secondary" data-page="auctionHall">OPEN AUCTION HALL</button></div></div>'};
    const filters=[['all','ALL STOCK',stats.count],['prep','IN PREPARATION',stats.prep],
      ['ready','RETAIL READY',stats.ready],['listed','ADVERTISED',stats.listed]];
    const toolbar='<div class="stock-toolbar"><div class="stock-toolbar-heading">'+
      '<strong>STOCK REGISTER</strong><small>'+state.vehicles.length+' ACTIVE UNITS</small></div>'+
      '<div class="stock-filters" role="group" aria-label="Filter stock">'+
      filters.map(([name,label,count])=>'<button type="button" data-action="filter-stock" data-filter="'+name+
        '" aria-pressed="'+(value===name)+'">'+label+' <b>'+count+'</b></button>').join('')+'</div></div>';
    const eligible=state.vehicles.filter(v=>value==='all'||group(v)===value)
      .slice().sort((a,b)=>a.acquiredDay-b.acquiredDay||a.id-b.id);
    const selected=eligible.find(v=>v.id===selectedId)||eligible[0]||null;
    const list=eligible.length?eligible.map(v=>inventoryRow(v,state,selected?.id===v.id)).join(''):
      '<div class="stock-list-empty">No vehicles in this category. Choose another filter to review your active stock.</div>';
    return {selectedId:selected?.id??null,html:head+toolbar+
      '<div class="stock-workspace"><aside class="stock-register" aria-label="Current vehicle inventory">'+
      '<div class="stock-register-title">VEHICLES <span>'+eligible.length+' SHOWN</span></div>'+
      '<div class="stock-register-list">'+list+'</div></aside>'+
      (selected?dossier(selected,state,reportCard):
        '<div class="stock-dossier stock-list-empty">Choose another category to view a vehicle file.</div>')+
      '</div><details class="stock-disclosure"><summary>About these inventory estimates</summary>'+
      '<p>Vehicle history, values and customer demand are simulated. Representative vehicle photography is not evidence for the exact vehicle. No live verification is implied.</p></details>'};
  }
  window.MotorTradeStockView=Object.freeze({render,figures,summary,phase,FILTERS});
})();