'use strict';
/* The Motor Trade v0.9.25 — Sales Office final polish. */
(() => {
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cash=x=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',
    maximumFractionDigits:0}).format(x);
  const VC=window.MotorTradeCards;
  if(!VC)throw new Error('Load vehicle-cards.js before customers-view.js');
  const statuses={
    enquiry:'NEW ENQUIRY',booked:'APPOINTMENT BOOKED',
    arrived:'CUSTOMER ON SITE',discussing:'NEGOTIATION IN PROGRESS',
    agreed:'TERMS AGREED',reserved:'DEPOSIT HELD / COLLECTION BOOKED',
    collectable:'READY FOR COLLECTION',lost:'CUSTOMER LOST'
  };
  function actions(state,vehicle,E){
    const C=E.customers,c=C.caseFor(state,vehicle.id),id=vehicle.id;
    if(!c){
      const waiting=E.showroom.waiting(state).filter(q=>q.vehicleId===id);
      return waiting.length?
        '<div class="sales-case-highlight"><strong>'+waiting.length+' CUSTOMER'+
        (waiting.length===1?'':'S')+' WAITING FOR THIS CAR</strong>'+
        '<p>Handle a visitor personally or assign a free salesperson from the showroom queue above. Each visitor has their own patience and negotiating budget.</p></div>':
        '<div class="sales-case-quiet"><strong>NO ACTIVE RETAIL ENQUIRIES</strong>'+
        '<p>No showroom customer is currently waiting for this vehicle. Buyer interest changes with price, reputation and the next game day.</p></div>';
    }
    const rep=E.people.salesRep(state,c);
    const buyer=C.behaviour(c,vehicle);
    // Customer name and case status are already in the selected-case header.
    // Keep channel and responsible adviser in the compact metadata line.
    const who='<div class="sales-customer-meta"><span>'+esc(c.channel)+' · '+esc(buyer?.label||'BUYER')+'</span>'+
      '<span>SALES ADVISER: '+esc(rep?.name||'Owner-managed')+
      (rep?' · '+Math.round(E.people.salesProfile(rep).commissionRate*100)+'% GROSS MARGIN COMMISSION':'')+
      '</span></div>';
    const cancel='<button type="button" class="trade-button trade-button-outline" data-action="cancel-customer" data-id="'+id+
      '">DEALERSHIP CANCELS / REFUND</button>';
    const buyerWithdraw='<button type="button" class="trade-button trade-button-secondary" data-action="customer-withdrawal" data-id="'+id+
      '">CUSTOMER CHANGES MIND</button>';
    let body='';
    switch(c.status){
      case 'enquiry':
        body='<p>'+esc(c.name)+' has enquired about this car. They have not inspected or test driven it yet.'+
          ' Book a viewing for the next game day (within 24 hours). This does not hold the vehicle.</p>'+ 
          '<button type="button" class="trade-button" data-action="book-customer" data-id="'+id+
          '">BOOK VIEWING →</button> '+cancel;
        break;
      case 'booked':
        body='<div class="sales-case-highlight"><strong>NEXT-DAY VIEWING · 24-HOUR LIMIT · NO DEPOSIT</strong>'+ 
          '<p>'+esc(c.name)+' is due on <strong>GAME DAY '+c.appointmentDay+
          '</strong>. This appointment is within 24 hours and the customer will attend. The car stays on sale until a paid deposit or completed handover.</p>'+ 
          (E.showroom.waiting(state).some(q=>q.vehicleId===id)?
          '<p>A real competing visitor is waiting in the showroom queue above. Serving them does not automatically displace the unpaid booking.</p>':
          '<p>No second buyer is waiting right now. The original customer can still attend their appointment.</p>')+
          '</div>'+cancel;
        break;
      case 'arrived':
        body='<p>Customer is in the showroom, asking about the advertised price. Offer a test drive before discussing the final figure. The drive can still reveal objections.'+
          (c.standby?' Another customer has an earlier unsecured booking; it is preserved unless this buyer purchases or pays a deposit.':'')+'</p>'+ 
          '<button type="button" class="trade-button" data-action="test-drive" data-id="'+id+
          '">OFFER TEST DRIVE →</button> '+cancel;
        break;
      case 'discussing':{
        const b=E.buyers(vehicle,state);
        if(!b){body='<p>Customer is not currently available to negotiate. Try a different time.</p>';break;}
        if(c.objectionStatus==='pending'){
          const choice=key=>'<button type="button" class="trade-button'+
            (key==='inspection'?'':' trade-button-secondary')+
            '" data-action="customer-objection" data-choice="'+key+
            '" data-id="'+id+'">';
          body='<section class="so-buyer-objection" aria-label="Buyer objection">'+
            '<div class="so-buyer-intro"><span>BUYER CONCERN · '+esc(buyer.concern)+'</span>'+
            '<strong>'+esc(buyer.label)+'</strong></div>'+
            '<p class="so-buyer-motive">'+esc(buyer.motive)+'</p>'+
            '<blockquote class="so-buyer-quote">“'+esc(buyer.quote)+'”</blockquote>'+
            '<p class="so-buyer-instruction">Choose how to respond. You cannot finalise the sale until the customer is satisfied, and an unrealistic approach can lose the deal.</p>'+
            '<div class="so-buyer-choices">'+
              choice('evidence')+'SHOW EXISTING RECORDS · NO CHARGE</button>'+
              (c.evidenceTried?'<p class="so-buyer-tried">Records already discussed; the customer still needs reassurance.</p>':'')+
              choice('inspection')+'PROMISE '+esc(buyer.service.toUpperCase())+' · '+cash(buyer.remedyCost)+'</button>'+
              choice('discount')+'OFFER '+cash(buyer.discount)+' SALE PRICE REDUCTION</button>'+
              choice('hold')+'HOLD FIRM · RISK LOSING BUYER</button>'+
              choice('walk')+'WALK AWAY · NO SALE</button>'+
            '</div>'+
            '<p class="so-buyer-cost-note">Inspection costs are incurred only on completed handover and reduce gross margin. A price reduction permanently lowers the achievable selling price. No sale is guaranteed.</p>'+
            '</section>'+cancel;
          if(c.evidenceTried)body=body.replace('data-choice="evidence"','data-choice="evidence" disabled');
          break;
        }
        const maxCounter=Math.min(vehicle.asking,100000);
        const nextCounter=Math.min(maxCounter,
          Math.max(b.cashOffer+25,Math.min(vehicle.asking,b.cashOffer+100)));
        const cashUI='<section class="sales-offer-mode"><h4>CASH PURCHASE · ROUND '+
          Math.min(5,c.counters+1)+' OF 5</h4>'+
          '<small>CUSTOMER CURRENT OFFER</small><strong>'+cash(b.cashOffer)+'</strong>'+
          '<p>Make up to five counteroffers. The customer can agree, propose a smaller increase or hold firm. Their precise budget is not disclosed.</p>'+
          (c.counters<5&&b.cashOffer<maxCounter?
            '<label for="customer-counter-'+id+'">YOUR COUNTER PRICE (£)</label>'+
            '<input id="customer-counter-'+id+'" class="trade-input" type="number" inputmode="numeric" min="'+
            (b.cashOffer+25)+'" max="'+maxCounter+'" step="25" value="'+nextCounter+'">'+
            '<button class="trade-button trade-button-secondary" type="button" data-action="counter-sale" data-id="'+id+
            '">SEND COUNTEROFFER · ROUND '+(c.counters+1)+'/5</button>':
            '<p class="so-final-offer">The final negotiation round has been reached. Accept the current offer or cancel this deal.</p>')+
          '<button class="trade-button" type="button" data-action="agree-cash" data-id="'+id+
          '">ACCEPT CUSTOMER OFFER</button></section>';
        const part=b.exchange?'<section class="sales-offer-mode"><h4>PART-EXCHANGE PROPOSAL</h4>'+
          '<small>CUSTOMER OFFER FOR YOUR CAR</small><strong>'+cash(b.pxOffer)+'</strong>'+
          VC.mini(b.exchange,'part-ex')+
          '<p>Trade-in: '+esc(b.exchange.title)+' · '+cash(b.exchange.retail)+
          ' indicative retail · '+cash(b.exchange.prep)+' original prep estimate.</p>'+
          '<label for="px-allowance-'+id+'">AGREED PART-EX ALLOWANCE (£)</label>'+
          '<input id="px-allowance-'+id+'" class="trade-input" type="number" inputmode="numeric" min="'+
          b.exchange.floor+'" max="'+b.exchange.ask+'" value="'+b.exchange.ask+'" step="25">'+
          '<p>Allowance range '+cash(b.exchange.floor)+'–'+cash(b.exchange.ask)+
          '. Incoming car requires its own preparation and takes one forecourt space.</p>'+
          '<button type="button" class="trade-button" data-action="agree-part-ex" data-id="'+id+
          '">AGREE PART-EX TERMS</button></section>':
          '<p class="so-no-part-ex">NO PART-EXCHANGE OFFERED · Cash purchase only for this customer.</p>';
        const outcome=c.objectionAction==='inspection'?
          '<div class="so-buyer-resolution">CUSTOMER CONCERN ADDRESSED · Dealer-funded '+esc(buyer.service)+' commitment: <strong>'+cash(c.remedyCost)+'</strong> charged at handover, reducing profit.</div>':
          c.objectionAction==='discount'?
          '<div class="so-buyer-resolution">CUSTOMER CONCERN ADDRESSED · Agreed achievable sale price reduced by <strong>'+cash(c.priceDiscount)+'</strong>.</div>':
          c.objectionAction==='evidence'?
          '<div class="so-buyer-resolution">CUSTOMER CONCERN ADDRESSED · Explained existing documented vehicle facts. No extra cost.</div>':
          c.objectionAction==='hold'?
          '<div class="so-buyer-resolution">CUSTOMER CONCERN ADDRESSED · Buyer accepted your firm position.</div>':'';
        body=outcome+'<p>The test drive went well. Discuss a realistic cash price or trade-in allowance; there is no completed sale until handover.'+
          (c.standby?' The earlier unsecured appointment stays open until a deposit or completed sale.':'')+'</p>'+ 
          '<div class="sales-offer-modes">'+cashUI+part+'</div>'+cancel;
        break;
      }
      case 'agreed':
        body='<div class="sales-case-highlight"><h4>AGREEMENT REACHED</h4>'+
          '<p>Agreed '+esc(c.preferredMode==='part-ex'?'part-exchange':'cash')+
          ' sale at <strong>'+cash(c.price)+'</strong>'+
          (c.exchange?' with a '+cash(c.allowance)+' allowance for '+esc(c.exchange.title):'')+
          '. No cash has been recognised as a retail sale yet.</p>'+
          (c.remedyCost?'<p>DEALER-FUNDED HANDOVER INSPECTION: '+cash(c.remedyCost)+' will be deducted from realised gross profit on completion.</p>':'')+
          '<div class="trade-action-row"><button type="button" class="trade-button" data-action="handover-customer" data-mode="'+
          c.preferredMode+'" data-id="'+id+'">COMPLETE HANDOVER</button>'+
          '<button type="button" class="trade-button trade-button-secondary" data-action="deposit-customer" data-id="'+id+
          '">TAKE £250 DEPOSIT / LATER COLLECTION</button></div>'+
          '<p class="sales-deposit-terms">The reservation funds are held separately. Customer withdrawal may cause fair cost-based retention, while dealership fault requires a refund.</p></div>'+cancel;
        break;
      case 'reserved':
        body='<div class="sales-case-highlight"><h4>£250 CUSTOMER DEPOSIT RECEIVED</h4>'+
          '<div class="sales-payment-breakdown">'+
          '<span>Agreed price</span><strong>'+cash(c.price)+'</strong>'+
          '<span>Part-exchange allowance</span><strong>'+cash(c.allowance||0)+'</strong>'+
          '<span>Already paid</span><strong>'+cash(c.held)+'</strong>'+
          '<span>BALANCE DUE AT COLLECTION</span><strong>'+cash(C.balanceDue(c))+'</strong></div>'+
          '<p><strong>COLLECTION: GAME DAY '+c.collectionDay+'</strong> · Customer-specific preparation charged: '+cash(c.prepCost||0)+'.</p>'+
          '<p>The £250 deposit is held separately, not recognised as a vehicle sale. Buyer withdrawal can incur fair retention for recorded costs; dealership fault requires a refund.</p></div>'+buyerWithdraw+' '+cancel;
        break;
      case 'collectable':
        body='<div class="sales-case-highlight"><h4>CUSTOMER READY TO COLLECT</h4>'+
          '<div class="sales-payment-breakdown">'+
          '<span>Agreed sale price</span><strong>'+cash(c.price)+'</strong>'+
          '<span>Part-exchange allowance</span><strong>'+cash(c.allowance||0)+'</strong>'+
          '<span>Deposit already paid</span><strong>'+cash(c.held)+'</strong>'+
          '<span>BALANCE TO COLLECT TODAY</span><strong>'+cash(C.balanceDue(c))+'</strong></div>'+
          '<p><strong>COLLECTION DUE: DAY '+c.collectionDay+'</strong> · Complete handover within five game days. Collect only the outstanding balance; the held deposit is applied once.</p>'+
          '<button type="button" class="trade-button" data-action="handover-customer" data-mode="'+
          c.preferredMode+'" data-id="'+id+'">COLLECT '+cash(C.balanceDue(c))+' / HANDOVER</button></div>'+
          buyerWithdraw+' '+cancel;
        break;
      case 'lost':
        body='<div class="trade-inline-feedback trade-feedback-warning"><strong>CUSTOMER DID NOT PROCEED</strong>'+
          '<p>'+esc(c.reason||'No deal agreed.')+'</p>'+
          '<p>The next game day'+(E.events.isDealDay(state.day)?' or Deal Day session':'')+
          ' may produce another enquiry, but not automatically.</p></div>';
        break;
    }
    return who+'<div class="sales-case-content">'+body+'</div>';
  }
  function showroomDesk(state,E){
    const Q=E.showroom,waiting=Q.waiting(state),free=Q.availableStaff(state);
    const slots=Q.ownerSlots(state),capacity=slots.regularLeft;
    const summary='<div class="so-visitor-head"><div><small>LIVE SHOWROOM FOOTFALL</small>'+
      '<h3>VISITORS & STAFF ASSIGNMENTS</h3></div>'+
      '<span>'+waiting.length+' WAITING · '+capacity+' OWNER SLOT'+(capacity===1?'':'S')+
      ' · '+free.length+' SALES REP'+(free.length===1?'':'S')+' FREE'+
      (slots.finalAvailable?' · FINAL OWNER SLOT AVAILABLE':'')+'</span></div>';
    if(!waiting.length)return '<section class="so-visitor-desk" aria-label="Customer showroom queue">'+summary+
      '<p class="so-visitor-empty">No visitors currently waiting. Interest changes with advertised stock, pricing and game days. Existing appointments and customer negotiations remain in the retail register.</p></section>';
    const rows=waiting.slice().sort((a,b)=>a.maxTurns-b.maxTurns||a.vehicleId-b.vehicleId)
      .map(q=>{
        const car=state.vehicles.find(v=>v.id===q.vehicleId);
        const active=E.customers.caseFor(state,q.vehicleId);
        const ready=Q.canServe(state,q.id);
        const urgency=q.maxTurns-state.showroom.turn;
        const urgencyLabel=urgency<=1?'LEAVING SOON':urgency===2?'WAITING':'PATIENT';
        const reps=free.filter(rep=>Q.canServe(state,q.id,rep.id).ok);
        const buttons=ready.ok?
          '<div class="so-visitor-actions">'+
            '<button class="trade-button" type="button" data-action="welcome-showroom" data-lead="'+esc(q.id)+'">'+
              (slots.finalAvailable?'HANDLE FINAL VISITOR':'HANDLE MYSELF')+'</button>'+
            reps.map(rep=>'<button class="trade-button trade-button-secondary" type="button" data-action="assign-showroom" data-lead="'+esc(q.id)+
              '" data-staff="'+rep.id+'">ASSIGN '+esc(rep.name)+'</button>').join('')+
          '</div>':reps.length?
          '<div class="so-visitor-actions">'+reps.map(rep=>'<button class="trade-button trade-button-secondary" type="button" data-action="assign-showroom" data-lead="'+esc(q.id)+
            '" data-staff="'+rep.id+'">ASSIGN '+esc(rep.name)+'</button>').join('')+'</div>':
          '<p class="so-visitor-busy">'+esc(ready.message)+'</p>';
        const booked=active?.status==='booked'?
          '<p class="so-visitor-warning">Another buyer has an unsecured viewing booked for tomorrow. Serving this visitor may win the car first.</p>':
          active?.status==='reserved'||active?.status==='collectable'?
          '<p class="so-visitor-warning">A paid customer arrangement protects this car.</p>':'';
        return '<article class="so-visitor-entry">'+
          '<div class="so-visitor-entry-head"><strong>'+esc(q.name)+'</strong>'+
          '<span class="'+(urgency<=1?'so-visitor-urgent':'')+'">'+urgencyLabel+'</span></div>'+
          '<p>'+esc(car?.title||'VEHICLE NOT AVAILABLE')+' · STOCK '+q.vehicleId+
          ' · '+esc(q.purpose)+'</p>'+
          '<small>'+(q.maxTurns===1?'Impatient buyer':
            q.maxTurns===2?'Normal waiting tolerance':'Patient buyer')+
          ' · '+esc(q.preferredMode==='part-ex'?'Possible part-exchange':'Cash buyer')+
          '</small>'+booked+buttons+'</article>';
      }).join('');
    return '<section class="so-visitor-desk" aria-label="Customer showroom queue">'+
      summary+'<p class="so-visitor-guidance">The owner can serve two regular visitors each session. If no salesperson is free, you can serve one final patient visitor yourself. Other customers can leave as their patience runs out. Salespeople can handle one visitor each per session. A booking without a deposit does not reserve a car.</p>'+
      '<div class="so-visitor-grid">'+rows+'</div></section>';
  }
  const FILTERS=Object.freeze(['all','action','appointments','deposits']);
  const STEP=['LEAD / ENQUIRY','VIEWING','TEST DRIVE','AGREEMENT','COLLECTION'];
  function lead(state,v,E){
    const c=E.customers.caseFor(state,v.id),
      queued=E.showroom.waiting(state).filter(q=>q.vehicleId===v.id),
      available=queued.length>0;
    const title=c?statuses[c.status]||'CUSTOMER CASE':
      available?(queued.length+' SHOWROOM VISITOR'+(queued.length===1?'':'S')+' WAITING'):'AWAITING BUYER INTEREST';
    const step=!c?(available?0:-1):{
      enquiry:0,booked:1,arrived:1,discussing:2,agreed:3,
      reserved:4,collectable:4,lost:-1
    }[c.status]??-1;
    const actionable=available||!!c&&
      ['enquiry','arrived','discussing','agreed','collectable'].includes(c.status);
    return {c,available,queued:queued.length,title,step,actionable,
      tone:c?.status==='lost'?'lost':
        ['reserved','collectable'].includes(c?.status)?'deposit':
        actionable?'action':c?.status==='booked'?'appointment':'quiet'};
  }
  function snapshot(state,E){
    const C=E.customers,listed=state.vehicles.filter(v=>v.status==='listed');
    const rows=listed.map(v=>({vehicle:v,caseData:lead(state,v,E)}));
    const live=rows.filter(r=>r.caseData.c&&r.caseData.c.status!=='lost').length;
    const appointments=rows.filter(r=>r.caseData.c?.status==='booked').length;
    const deposits=rows.filter(r=>r.caseData.c?.held>0).length;
    return {rows,live,appointments,deposits,
      attention:rows.filter(r=>r.caseData.actionable).length,
      held:C.heldDeposits(state)};
  }
  function unit(state,entry,selected){
    const v=entry.vehicle,k=entry.caseData;
    const days=Math.max(0,state.day-v.listedDay);
    const c=k.c;
    const due=c?.status==='booked'&&c.appointmentDay!==null?' · VIEWING DAY '+c.appointmentDay:
      ['reserved','collectable'].includes(c?.status)&&c.collectionDay!==null?
        ' · COLLECTION DAY '+c.collectionDay:'';
    return '<article class="so-unit'+(selected?' so-unit-active':'')+'">'+
      '<div class="so-thumb">'+VC.photo(v,'stock')+'</div>'+
      '<button type="button" class="so-pick" data-action="select-sales" data-id="'+v.id+
      '" aria-pressed="'+String(selected)+'"><small>STOCK '+v.id+
      ' · '+days+' DAYS ADVERTISED</small><strong>'+esc(v.title)+'</strong>'+
      '<span>ASKING '+cash(v.asking)+due+'</span>'+
      '<em class="so-status so-status-'+k.tone+'">'+esc(k.title)+'</em></button></article>';
  }
  function progress(info){
    return '<div class="so-flow" aria-label="Sales progression">'+STEP.map((name,i)=>
      '<span class="'+(i<info.step?'so-flow-done':i===info.step?'so-flow-current':'')+'"'+
      (i===info.step?' aria-current="step"':'')+'>'+name+'</span>').join('')+'</div>';
  }
  function details(state,E,entry){
    const v=entry.vehicle,leadInfo=entry.caseData,c=leadInfo.c;
    const invested=v.cost+v.prepSpent;
    const indicative=v.profile?.likelySale??v.retail;
    const days=Math.max(0,state.day-v.listedDay);
    return '<article class="so-file" aria-label="Selected sales case">'+
      '<header class="so-file-head"><div><small>RETAIL FILE · STOCK '+v.id+
      (c?' · '+esc(c.channel):' · ADVERTISED VEHICLE')+'</small>'+
      '<h3>'+esc(v.title)+'</h3></div>'+
      '<div class="so-file-head-position"><span class="so-status so-status-'+leadInfo.tone+'">'+
      esc(leadInfo.title)+'</span>'+
      '<strong class="so-quick-price">'+(c?.price!==null&&c?.price!==undefined?'AGREED ':'ASKING ')+
      cash(c?.price??v.asking)+'</strong></div></header>'+
      progress(leadInfo)+
      '<div class="so-file-grid"><section class="so-car">'+
      '<div class="so-vehicle-intro"><div class="so-car-photo">'+VC.photo(v,'stock')+'</div>'+
      '<div class="so-specs"><span>'+new Intl.NumberFormat('en-GB').format(v.miles)+
      ' MILES</span><span>'+esc(v.fuel)+' · '+esc(v.gearbox)+'</span>'+
      '<small>'+esc(v.color||'COLOUR NOT RECORDED')+' · '+days+
      ' DAYS ADVERTISED</small></div></div>'+
      '<h4>VEHICLE FINANCIALS</h4><div class="so-figures">'+
      '<div><span>ADVERTISED PRICE</span><strong>'+cash(v.asking)+'</strong></div>'+
      '<div><span>ACQUISITION + PREPARATION</span><strong>'+cash(invested)+'</strong></div>'+
      '<div><span>LIKELY ACHIEVED SALE</span><strong>'+cash(indicative)+'</strong></div>'+
      (c?.price!==null&&c?.price!==undefined?
        '<div class="so-figures-strong"><span>AGREED SALE PRICE</span><strong>'+cash(c.price)+'</strong></div>':'')+
      '</div><p class="so-caveat">Valuations are fictional. A sale is recorded only after handover.</p>'+
      '</section><section class="so-customer"><div class="so-customer-heading">'+
      '<div><small>SALES CASE MANAGEMENT</small><h4>NEXT CUSTOMER ACTION</h4></div>'+
      (c?'<span>'+esc(c.name)+'</span>':'')+'</div>'+
      actions(state,v,E)+'</section></div></article>';
  }
  function history(state){
    if(!state.sold.length)return '';
    return '<details class="so-history"><summary>RECENT COMPLETED HANDOVERS · '+
      state.sold.length+' SALES <span>VIEW HISTORY</span></summary>'+
      '<div class="so-history-list">'+state.sold.slice(-5).reverse().map(v=>
        '<div class="so-history-row"><div><strong>'+esc(v.title)+'</strong>'+
        '<small>DAY '+v.day+' · '+esc(v.color||'COLOUR NOT RECORDED')+
        (v.buyerPersona?' · '+esc(v.buyerPersona):'')+
        (v.objectionAction&&v.objectionAction!=='legacy'?
          ' · CONCERN: '+esc(v.objectionAction.toUpperCase()):'')+
        (v.customerRemedyCost?' · INSPECTION COST '+cash(v.customerRemedyCost):'')+
        '</small></div>'+
        '<span>SALE '+cash(v.price)+'</span><span>GROSS '+cash(v.profit)+'</span></div>'
      ).join('')+'</div></details>';
  }
  function render(state,E,{selectedId=null,filter='all'}={}){
    const s=snapshot(state,E),f=FILTERS.includes(filter)?filter:'all';
    const stats=E.customers.stats(state,state.monthPlan.startDay,state.day);
    const waiting=E.showroom.waiting(state).length;
    const top='<div class="so-kpis">'+[
      ['ADVERTISED VEHICLES',s.rows.length],
      ['CUSTOMERS ON SITE',waiting+s.rows.filter(r=>['arrived','discussing'].includes(r.caseData.c?.status)).length],
       ['ACTION REQUIRED',s.attention],['HELD DEPOSITS',cash(s.held)]
    ].map(([name,value])=>
      '<div><small>'+name+'</small><strong>'+value+'</strong></div>').join('')+'</div>'+
      '<details class="so-activity"><summary>MONTHLY RETAIL ACTIVITY</summary>'+
      '<p>THIS MONTH · '+stats.enquiries+' RECORDED ENQUIRIES · '+
      stats.appointments+' VIEWINGS BOOKED · '+stats.testDrives+' TEST DRIVES · '+
      stats.completedSales+' COMPLETED HANDOVERS · '+stats.showroomMissed+
      ' MISSED SHOWROOM VISITORS</p></details>';
    if(!s.rows.length)return {selectedId:null,html:top+showroomDesk(state,E)+
      '<div class="trade-empty so-empty"><h2>NO CARS ADVERTISED.</h2>'+
      '<p>Prepare a vehicle, pass workshop quality control, then set the retail price in Vehicle Stock.</p>'+
      '<button type="button" class="trade-button" data-page="stock">OPEN VEHICLE STOCK</button></div>'+
      history(state)};
    const filterDefs=[['all','ALL VEHICLES',s.rows.length],
      ['action','ACTION REQUIRED',s.attention],
      ['appointments','APPOINTMENTS',s.appointments],
      ['deposits','DEPOSIT HELD',s.deposits]];
    const toolbar='<div class="so-toolbar"><strong>RETAIL CASE REGISTER</strong>'+
      '<div class="so-filters" role="group" aria-label="Filter retail sales cases">'+
      filterDefs.map(([key,label,n])=>
        '<button type="button" data-action="filter-sales" data-filter="'+key+
        '" aria-pressed="'+String(key===f)+'">'+label+' <b>'+n+'</b></button>').join('')+'</div></div>';
    const filtered=s.rows.filter(r=>f==='all'||(f==='action'?r.caseData.actionable:
      f==='appointments'?r.caseData.c?.status==='booked':
      r.caseData.c?.held>0)).slice().sort((a,b)=>{
        const p=x=>x.caseData.actionable?0:x.caseData.c?.held>0?1:
          x.caseData.c?.status==='booked'?2:3;
        return p(a)-p(b)||a.vehicle.listedDay-b.vehicle.listedDay||
          a.vehicle.id-b.vehicle.id;
      });
    const selected=filtered.find(r=>r.vehicle.id===selectedId)||filtered[0]||null;
    const list=filtered.length?filtered.map(r=>unit(state,r,r.vehicle.id===selected?.vehicle.id)).join(''):
      '<p class="so-empty-filter">No vehicles match this filter. Select All Vehicles to review the full register.</p>';
    const deadline=E.events.isDealDay(state.day)?
      '<div class="so-deal-day">DEAL DAY · '+esc(E.events.outlook(state).label)+
      ' · '+esc(E.events.dealSession(state).time)+
      ' — Walk-in enquiries can change between sessions.</div>':'';
    return {selectedId:selected?.vehicle.id??null,html:top+showroomDesk(state,E)+deadline+toolbar+
      '<div class="so-layout"><aside class="so-register" aria-label="Advertised vehicle and customer cases">'+
      '<header>VEHICLES <span>'+filtered.length+' SHOWN</span></header>'+
      '<div class="so-register-list">'+list+'</div></aside>'+
      (selected?details(state,E,selected):
        '<div class="so-file so-empty-filter">No selected customer case.</div>')+'</div>'+
      history(state)};
  }
  window.MotorTradeCustomersView=Object.freeze({render,FILTERS,lead,snapshot});
})();
