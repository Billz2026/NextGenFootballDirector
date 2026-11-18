'use strict';
/* Group Headquarters — real branch accounts; no imaginary franchise licensing. */
(() => {
  const G=window.MotorTradeGroup;
  if(!G)throw new Error('Motor Trade Group engine must load before Group HQ view');
  const E=window.MotorTradeEmpire;
  const money=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',
    maximumFractionDigits:0}).format(n);
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=n=>Number(n).toLocaleString('en-GB');
  const tile=(label,value,note)=>'<div class="mg-kpi"><small>'+esc(label)+'</small>'+
    '<strong>'+esc(value)+'</strong><span>'+esc(note)+'</span></div>';
  function opening(state,managerId){
    const stage=E.status(state),canReach=stage.rank>=10;
    const manager=G.MANAGERS.find(m=>m.id===managerId)||G.MANAGERS[0];
    const option=G.MANAGERS.map(m=>
      '<option value="'+esc(m.id)+'"'+(m.id===manager.id?' selected':'')+'>'+
      esc(m.name)+' — '+money(m.salary)+'/month · '+esc(m.note)+'</option>').join('');
    return '<section class="mg-section"><div class="mg-section-heading">'+
      '<div><small>FIRST EXPANSION / UNITED KINGDOM</small><h3>OPEN YOUR SECOND DEALERSHIP</h3>'+
      '<p>Choose an independent used-car branch. Manufacturer franchises are not available in this release.</p></div>'+
      '<span class="mg-status '+(canReach?'mg-status-green':'')+'">'+
      (canReach?'RANK 10 ELIGIBLE':'REQUIRES RANK 10')+'</span></div>'+
      '<div class="mg-manager-picker"><label for="group-manager">APPOINT A BRANCH MANAGER</label>'+
      '<select id="group-manager">'+option+'</select>'+
      '<p>A four-person team starts at the new site: manager, salesperson, buyer and technician. All earn wages from their first working day.</p></div>'+
      '<div class="mg-location-grid">'+G.CITIES.map(city=>{
        const q=G.quote(state,city.key,manager.id);
        return '<article class="mg-location"><div class="mg-city-header"><strong>'+
          esc(city.name)+'</strong><span>UNITED KINGDOM</span></div>'+
          '<p>'+esc(city.note)+'</p>'+
          '<div class="mg-quote"><div><span>FIT-OUT & SETUP</span><b>'+money(q.setup)+'</b></div>'+
          '<div><span>BRANCH CAPITAL TRANSFER</span><b>'+money(q.capital)+'</b></div>'+
          '<div><span>ORIGINAL SITE CASH BUFFER</span><b>'+money(q.protectedCash)+'</b></div>'+
          '<div class="mg-quote-total"><span>REQUIRED OWNER CASH</span><b>'+
          money(q.needed)+'</b></div></div>'+
          '<button type="button" class="mg-action" data-action="group-open" data-city="'+
          esc(city.key)+'" '+(q.ok?'':'disabled')+'>'+
          (q.ok?'OPEN '+esc(city.name.toUpperCase())+' BRANCH':
          (q.shortfall?'CASH SHORT '+money(q.shortfall):esc(q.why)))+'</button>'+
          '</article>';
      }).join('')+'</div></section>';
  }
  function branchSummary(state,b){
    const o=G.operating(b),unpaid=G.liabilities(b);
    return '<section class="mg-section"><div class="mg-section-heading">'+
      '<div><small>BRANCH OPERATIONS / '+esc(b.city.toUpperCase())+'</small>'+
      '<h3>'+esc(b.name)+'</h3><p>Manager-operated dealership. Your approvals control stock purchases and advertised prices.</p></div>'+
      '<span class="mg-status mg-status-green">TRADING · DAY '+b.lastProcessedDay+'</span></div>'+
      '<div class="mg-kpis">'+tile('BRANCH CASH',money(b.cash),'Separate cash ledger')+
      tile('STOCK',b.inventory.length+' / '+G.MAX_VEHICLES,'Owned vehicles')+
      tile('RETAIL HANDOVERS',number(b.sales.length),'Completed sales only')+
      tile('OPERATING CONTRIBUTION',money(o.contribution),'Since opening, before tax / finance')+
      '</div>'+
      '<div class="mg-operation-strap">'+
      '<div><small>BRANCH MANAGER</small><strong>'+esc(b.manager.name)+'</strong>'+
      '<span>'+esc(b.manager.note)+'</span></div>'+
      '<div><small>STAFF / DAILY WAGES</small><strong>'+b.staff.length+' · '+money(G.payroll(b))+'</strong>'+
      '<span>Manager, sales, buying and technician</span></div>'+
      '<div><small>RENT & UTILITIES / DAY</small><strong>'+money(b.rent)+'</strong>'+
      '<span>Automatically accrued with each game day</span></div>'+
      '<div><small>OVERDUE LIABILITIES</small><strong class="'+(unpaid?'mg-warning':'')+'">'+money(unpaid)+'</strong>'+
      '<span>Wages '+money(b.payrollArrears)+' · premises '+money(b.rentArrears)+'</span></div></div>'+
      '</section>';
  }
  function transfer(b){
    return '<section class="mg-section"><div class="mg-section-heading"><div>'+
      '<small>INTERNAL BANKING / RECONCILED ACCOUNTS</small><h3>TRANSFER CAPITAL</h3>'+
      '<p>Transfers move existing cash between Branch 1 and this branch. They are never booked as sales or profit.</p>'+
      '</div></div><div class="mg-transfer"><label for="mg-transfer-amount">AMOUNT (£1,000 INCREMENTS)</label>'+
      '<input type="number" id="mg-transfer-amount" min="1000" max="250000" step="1000" value="10000" inputmode="numeric">'+
      '<button type="button" data-action="group-transfer" data-direction="to" data-branch="'+esc(b.id)+'">HEAD OFFICE → BRANCH</button>'+
      '<button type="button" data-action="group-transfer" data-direction="from" data-branch="'+esc(b.id)+'">BRANCH → HEAD OFFICE</button></div>'+
      '<p class="mg-footnote">Both sites must retain their stock preparation budgets, wage and premises commitments. Branch cash is included in the consolidated group balance, not added to the original dealership’s spendable account.</p></section>';
  }
  function desk(state,b){
    const offers=G.offers(state,b);
    const rows=offers.map(o=>{
      const committed=G.reserve(b)+G.liabilities(b)+14*G.running(b);
      const affordable=b.inventory.length<G.MAX_VEHICLES&&
        b.cash>=o.cost+o.prep+committed;
      return '<article class="mg-offer"><div><small>'+esc(o.marketTier.toUpperCase())+
        ' · GRADE '+o.grade+' · '+number(o.miles)+' MILES</small>'+
        '<strong>'+esc(o.title)+'</strong>'+
        '<span>Guide retail '+money(o.retail)+' · prep '+money(o.prep)+' · '+
        esc(o.history)+' service record</span></div>'+
        '<div><strong>'+money(o.cost)+'</strong>'+
        '<button type="button" class="mg-action" data-action="group-purchase" data-branch="'+
        esc(b.id)+'" data-offer="'+esc(o.id)+'"'+(affordable?'':' disabled')+'>'+
        (b.inventory.length>=G.MAX_VEHICLES?'FORECOURT FULL':
          affordable?'APPROVE PURCHASE':'FUNDS PROTECTED')+'</button></div></article>';
    }).join('');
    return '<section class="mg-section"><div class="mg-section-heading"><div>'+
      '<small>OWNER APPROVALS / LOCAL WHOLESALE SUPPLY</small><h3>TODAY’S BRANCH SOURCING</h3>'+
      '<p>Offers refresh with the game day. Purchasing consumes branch cash and reserves repair and operating funds.</p></div>'+
      '<span>DAY '+state.day+' · '+offers.length+' OFFERS</span></div>'+
      '<div class="mg-offer-list">'+rows+'</div></section>';
  }
  function vehicles(b){
    const stock=b.inventory.length?b.inventory.map(v=>{
      const stage=v.status==='queued'?'AWAITING WORKSHOP FUNDING':
        v.status==='repairing'?'PREPARING · READY DAY '+v.readyDay:'ADVERTISED';
      const listing=v.status==='listed'?
        '<div class="mg-price-edit"><label for="group-price-'+v.id+'">ASKING PRICE (£)</label>'+
        '<input type="number" id="group-price-'+v.id+'" min="1000" step="25" value="'+v.asking+'">'+
        '<button type="button" data-action="group-reprice" data-branch="'+esc(b.id)+'" data-id="'+v.id+'">UPDATE PRICE</button></div>':
        '<span class="mg-readonly">Manager will list after preparation; '+money(v.prep)+' repair budget.</span>';
      return '<article class="mg-vehicle"><div><small>#'+v.id+' · '+esc(v.marketTier.toUpperCase())+
        ' · '+esc(stage)+'</small><strong>'+esc(v.title)+'</strong>'+
        '<span>Acquired Day '+v.acquiredDay+' · paid '+money(v.cost)+
        ' · estimated retail '+money(v.expectedRetail)+'</span></div>'+listing+'</article>';
    }).join(''):'<p class="mg-empty">No vehicles owned here. Approve a sourcing opportunity to start building stock.</p>';
    return '<section class="mg-section"><div class="mg-section-heading"><div>'+
      '<small>INDEPENDENT STOCK / AUTO-MANAGED PREPARATION</small><h3>BRANCH VEHICLE INVENTORY</h3>'+
      '<p>The branch pays for preparation, lists vehicles on completion and seeks real fictional customer offers on later days.</p>'+
      '</div><span>'+b.inventory.length+' / '+G.MAX_VEHICLES+' VEHICLES</span></div>'+
      '<div class="mg-vehicle-list">'+stock+'</div></section>';
  }
  function records(b){
    const recent=b.ledger.slice(-10).reverse().map(r=>
      '<div class="mg-ledger-row"><span>DAY '+r.day+'</span><span>'+
      esc(r.note)+'</span><strong class="'+(r.delta>=0?'mg-positive':'mg-negative')+'">'+
      (r.delta>0?'+':'')+money(r.delta)+'</strong></div>').join('');
    const sales=b.sales.slice(-5).reverse().map(r=>
      '<div class="mg-ledger-row"><span>DAY '+r.day+'</span><span>'+
      esc(r.title)+' · '+esc(r.customerId)+'</span><strong>'+
      money(r.profit)+'</strong></div>').join('');
    const reports=b.monthlyReports.slice(-3).reverse().map(r=>
      '<div class="mg-ledger-row"><span>MONTH '+r.month+'</span><span>'+
      r.soldUnits+' retail sales · gross '+money(r.grossMargin)+
      '</span><strong>'+money(r.operatingContribution)+'</strong></div>').join('');
    return '<section class="mg-section"><div class="mg-section-heading"><div>'+
      '<small>BRANCH HISTORY / REAL TRANSACTIONS</small><h3>ACCOUNTS & COMPLETED SALES</h3>'+
      '<p>Branch receipts, payments, monthly results and customer handovers are separate from the original dealership.</p></div></div>'+
      '<div class="mg-record-panels"><div><h4>RECENT CASH LEDGER</h4>'+
      (recent||'<p class="mg-empty">No transactions.</p>')+'</div>'+
      '<div><h4>RECENT RETAIL HANDOVERS</h4>'+
      (sales||'<p class="mg-empty">No completed handovers yet.</p>')+
      '<h4>ARCHIVED MONTH-END RESULTS</h4>'+
      (reports||'<p class="mg-empty">No month closed since opening.</p>')+
      '</div></div></section>';
  }
  function render(state,selectedId='original',managerId='m1'){
    const p=E.status(state),totals=G.summary(state);
    const branches=state.group?.branches||[];
    const selected=branches.find(b=>b.id===selectedId)||
      (branches.length?branches[0]:null);
    const tabs='<div class="mg-branches"><button type="button" data-action="group-view-original"'+
      ' class="mg-branch-tab">BRANCH 1 · ORIGINAL DEALERSHIP</button>'+
      branches.map(b=>'<button type="button" data-action="group-select" data-branch="'+esc(b.id)+
        '" class="mg-branch-tab '+(selected?.id===b.id?'mg-selected':'')+'">'+
        esc(b.city.toUpperCase())+' · '+esc(b.id)+'</button>').join('')+'</div>';
    const body=branches.length?branchSummary(state,selected)+
      transfer(selected)+desk(state,selected)+vehicles(selected)+records(selected):
      opening(state,managerId);
    return {selectedId:selected?.id||'original',
      html:'<div class="mg-root"><header class="mg-header"><div>'+
      '<small>THE MOTOR TRADE / OWNER’S GROUP OFFICE</small><h2>'+esc(state.name)+
      ' GROUP</h2><p>Manage dealership expansion, capital and separately accounted UK trading sites.</p></div>'+
      '<span class="mg-status">PRESTIGE RANK '+p.rank+'/100</span></header>'+
      '<div class="mg-kpis">'+tile('GROUP CASH',money(totals.groupCash),'Head Office + all branches')+
      tile('TRADING SITES',totals.branches+' / 2','Second site available from Rank 10')+
      tile('OWNED VEHICLES',number(totals.groupStock),'All branch inventories')+
      tile('COMPLETED SALES',number(totals.groupSales),'All recorded handovers')+
      '</div>'+tabs+body+
      '<p class="mg-footnote">Branch 1 continues using the full original dealership simulator. The second site currently uses an autonomous manager-run trading model with separate accounts, stock and payroll. Additional franchises and international sites remain in development.</p></div>'};
  }
  window.MotorTradeGroupView=Object.freeze({render});
})();