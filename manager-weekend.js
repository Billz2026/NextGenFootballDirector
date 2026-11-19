'use strict';
/* Weekend Trading — deliberate Saturday retail checkpoints, not a parallel economy.
   Normal showroom, customer, delegated sales and cash engines own every outcome. */
(() => {
 const CAL=window.MotorTradeCalendar,DELEG=window.MotorTradeDelegation;
 const Q=window.MotorTradeShowroom,MC=window.MotorTradeManagerCareer;
 if(!CAL||!DELEG||!Q||!MC)throw Error('Calendar, staff and showroom must load before Weekend Trading.');
 const PHASES=Object.freeze([
   {time:'09:00',name:'OPENING VIEWINGS',detail:'Morning appointments and early walk-ins'},
   {time:'12:00',name:'MIDDAY FOOTFALL',detail:'Fresh enquiries and negotiations'},
   {time:'15:00',name:'AFTERNOON CLOSE',detail:'Final opportunities before the weekend review'}
 ]);
 const OPTIONS=Object.freeze([
   {key:'cautious',title:'PROTECT DEAL MARGIN',detail:'£150 staff discount authority; £1,200 minimum gross. Customers may walk.'},
   {key:'balanced',title:'BALANCED SALES',detail:'£350 discount authority; £650 minimum gross. Moderate negotiating room.'},
   {key:'growth',title:'PUSH STOCK TURNOVER',detail:'£750 discount authority; £350 minimum gross. More deals possible, less protected margin.'}
 ]);
 const money=v=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(v);
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const whole=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
 const copy=o=>JSON.parse(JSON.stringify(o));
 const saturday=state=>!!state?.managerCareer&&
   CAL.date(state.day).getUTCDay()===6&&
   !window.MotorTradeEvents.isDealDay(state.day);
 const canSession=state=>saturday(state)&&
   (!state.managerCareer?.induction||state.managerCareer.induction.completed);
 const session=s=>s?.managerCareer?.weekendTrading?.current||null;
 const slot=s=>{
   const c=session(s);
   return c?.day===s.day&&canSession(s)?c.phase:0;
 };
 const initial=()=>({version:1,current:null,history:[]});
 const clone=t=>t?copy(t):null;
 const policy=s=>DELEG.POLICIES.find(p=>
   s.delegation.maxDiscount===p.maxDiscount&&s.delegation.minGross===p.minGross&&
   s.delegation.maxPartExchange===p.maxPartExchange)?.key||null;
 function ensure(state){
   // No empty, mandatory three-checkpoint session. Stock must actually be
   // ready for retail or already under an open customer arrangement.
   if(!canSession(state)||!state.vehicles.some(v=>v.status==='listed'))return false;
   const m=state.managerCareer;
   if(!m.weekendTrading)m.weekendTrading=initial();
   const t=m.weekendTrading;
   if(t.current?.day===state.day)return false;
   if(t.current&&t.current.status!=='complete')return false;
   if(t.current){
     t.history.push({day:t.current.day,focus:t.current.focus,
       completedSales:t.current.result?.sales||0,
       gross:t.current.result?.gross||0,missed:t.current.result?.missed||0});
     if(t.history.length>18)t.history.shift();
   }
   t.current={day:state.day,phase:0,status:'briefing',focus:null,
     originalPolicy:null,manualPolicy:null,originalDelegationEnabled:null,
     openingCash:state.cash,openingSold:state.sold.length,
     openingHistory:state.customerHistory.length,
     result:null};
   return true;
 }
 function valid(t,state){
   if(t==null)return true;
   if(t.version!==1||!Array.isArray(t.history)||t.history.length>18)return false;
   const d=MC.dealer(state.managerCareer?.employerId);
   if(!d)return false;
   let prev=0;
   for(const h of t.history){
     if(!h||!whole(h.day,1,state.day)||h.day<=prev||
       CAL.date(h.day).getUTCDay()!==6||
       !OPTIONS.some(o=>o.key===h.focus)||
       !whole(h.completedSales,0,100)||!Number.isSafeInteger(h.gross)||
       Math.abs(h.gross)>1e7||!whole(h.missed,0,100))return false;
     prev=h.day;
   }
   const c=t.current;
   if(c==null)return true;
   if(!whole(c.day,1,state.day)||c.day<=prev||
     CAL.date(c.day).getUTCDay()!==6||
     !whole(c.phase,0,2)||
     !['briefing','live','review','complete'].includes(c.status)||
     !whole(c.openingCash,0,1e8)||!whole(c.openingSold,0,20000)||
     !whole(c.openingHistory,0,2000))return false;
   if(c.day!==state.day&&c.status!=='complete')return false;
   if(c.status==='briefing'){
     return c.phase===0&&c.focus===null&&c.originalPolicy===null&&
       c.manualPolicy===null&&c.originalDelegationEnabled===null&&c.result===null;
   }
   if(!OPTIONS.some(x=>x.key===c.focus)||
     typeof c.originalDelegationEnabled!=='boolean'||
     (c.originalPolicy!==null&&!OPTIONS.some(x=>x.key===c.originalPolicy))||
     (c.manualPolicy!==null&&typeof c.manualPolicy!=='object'))return false;
   if(c.status==='live')return c.result===null;
   if(!['review','complete'].includes(c.status)||c.phase!==2)return false;
   const r=c.result;
   return r&&whole(r.sales,0,100)&&Number.isSafeInteger(r.gross)&&
     Math.abs(r.gross)<1e7&&whole(r.served,0,100)&&
     whole(r.missed,0,100)&&whole(r.enquiries,0,200)&&
     Number.isSafeInteger(r.cashDelta)&&Math.abs(r.cashDelta)<=1e8;
 }
 function live(state,E){
   const pending=DELEG.pending(state);
   if(pending.length)return {ok:false,pending:true,
     message:'The sales supervisor requires your decision on a live offer before continuing.'};
   const r=DELEG.process(state,E);
   return {ok:true,changed:true,report:r,
     message:r.completed+' real handover(s); '+r.served+
       ' visitor(s) allocated; '+r.escalated+' exception(s) escalated.'};
 }
 function begin(state,E,focus){
   const c=session(state);
   if(!c||c.day!==state.day||c.status!=='briefing'||!OPTIONS.some(x=>x.key===focus))
     return {ok:false,message:'Choose a valid Saturday strategy before opening.'};
   c.originalPolicy=policy(state);
   c.manualPolicy=c.originalPolicy===null?{
     maxDiscount:state.delegation.maxDiscount,minGross:state.delegation.minGross,
     maxPartExchange:state.delegation.maxPartExchange}:null;
   c.originalDelegationEnabled=state.delegation.enabled;
   c.focus=focus;
   DELEG.setPolicy(state,focus);
   state.delegation.enabled=true; // staff must operate the actual session
   c.status='live';
   const r=live(state,E);
   return {ok:true,changed:true,message:'Weekend trading opened under '+OPTIONS.find(o=>o.key===focus).title+
     '. '+r.message,report:r.report};
 }
 function advance(state,E){
   const c=session(state);
   if(!c||c.day!==state.day||c.status!=='live')
     return {ok:false,message:'There is no live Saturday session to advance.'};
   if(DELEG.pending(state).length)return {ok:false,pending:true,
     message:'Resolve the live sales-authority request before advancing this session.'};
   // When every retail vehicle has left the forecourt, avoid two
   // meaningless extra checkpoints. Close directly on the next action.
   if(c.phase<2&&!state.vehicles.some(v=>v.status==='listed'))c.phase=2;
   if(c.phase<2){
     c.phase++;
     const departed=Q.roll(state);
     const r=live(state,E);
     return {ok:true,changed:true,message:PHASES[c.phase].time+' · '+
       PHASES[c.phase].name+'. '+departed.join(' ')+r.message,report:r.report};
   }
   Q.closeWaiting(state,'Saturday retail session closed before the visitor could be served.');
   const sales=state.sold.slice(c.openingSold).filter(x=>x.day===state.day);
   const records=state.customerHistory.slice(c.openingHistory).filter(x=>x.day===state.day);
   const count=kind=>records.filter(x=>x.type===kind).length;
   c.result={sales:sales.length,gross:sales.reduce((sum,s)=>sum+s.profit,0),
     served:count('showroom-served'),missed:count('showroom-left'),
     enquiries:count('enquiry'),cashDelta:state.cash-c.openingCash};
   // Restore exact original authority, including custom non-standard settings.
   if(c.originalPolicy!==null)DELEG.setPolicy(state,c.originalPolicy);
   else if(c.manualPolicy)Object.assign(state.delegation,c.manualPolicy);
   state.delegation.enabled=c.originalDelegationEnabled;
   c.status='review';
   return {ok:true,changed:true,message:'Saturday session closed. Real outcomes recorded; review the results.'};
 }
 function acknowledge(state){
   const c=session(state);
   if(!c||c.day!==state.day||c.status!=='review')return {
     ok:false,message:'Review the completed session before returning to the calendar.'};
   c.status='complete';
   return {ok:true,changed:true,message:'Saturday review acknowledged. Trading calendar can advance.'};
 }
 function blocksContinue(state){
   const c=session(state);
   return !!c&&c.day===state.day&&c.status!=='complete';
 }
 function metrics(state){
   const c=session(state);
   if(!c)return null;
   const sales=state.sold.slice(c.openingSold).filter(x=>x.day===state.day);
   const records=state.customerHistory.slice(c.openingHistory).filter(x=>x.day===state.day);
   const count=kind=>records.filter(x=>x.type===kind).length;
   return {sales:sales.length,gross:sales.reduce((n,v)=>n+v.profit,0),
     served:count('showroom-served'),missed:count('showroom-left'),
     waiting:Q.waiting(state).length,
     cashDelta:state.cash-c.openingCash,
     pending:DELEG.pending(state).length,
     appointments:Object.values(state.customerCases||{}).filter(x=>
       x.status==='booked'||x.status==='arrived'||x.status==='collectable').length};
 }
 function render(state){
   const c=session(state);
   if(!c||c.day!==state.day)return '';
   const m=metrics(state),title=c.status==='briefing'?'SATURDAY SALES BRIEFING':
     c.status==='live'?'LIVE TRADING SESSION':
     c.status==='review'?'TRADING RESULTS':'SATURDAY REVIEW COMPLETE';
   const stat='<div class="weekend-numbers">'+[
     ['COMPLETED HANDOVERS',String(m.sales)],['REAL GROSS',money(m.gross)],
     ['VISITORS SERVED',String(m.served)],['WALKAWAYS',String(m.missed)]
   ].map(([k,v])=>'<div><small>'+k+'</small><strong>'+v+'</strong></div>').join('')+'</div>';
   const head='<section class="weekend-desk" aria-label="Interactive Saturday trading">'+
     '<div class="weekend-kicker"><span>THE MOTOR TRADE · WEEKEND TRADING</span>'+
     '<span>GAME DAY '+state.day+' · SATURDAY</span></div>'+
     '<h2>'+title+'</h2><p class="weekend-lead">Run your employed team through a focused retail trading day. '+
     'Actual visitors, authority decisions and completed sales determine the outcome.</p>'+stat;
   if(c.status==='briefing'){
     const ready=state.vehicles.filter(v=>v.status==='listed').length;
     const reserve=state.vehicles.filter(v=>v.status==='acquired').length;
     return head+'<p class="weekend-brief"><strong>'+ready+' advertised vehicles</strong> · '+
       reserve+' awaiting preparation · '+m.appointments+
       ' booked or pending customer arrangements · '+money(state.cash)+' company cash. '+
       'Choose a sales authority approach for today. No deal is guaranteed.</p>'+
       '<div class="weekend-strategies">'+OPTIONS.map(o=>
         '<button type="button" data-action="weekend-start" data-focus="'+o.key+'">'+
         '<strong>'+o.title+'</strong><span>'+o.detail+'</span></button>').join('')+
       '</div></section>';
   }
   if(c.status==='live'){
     const events=state.customerHistory.slice(c.openingHistory)
       .filter(h=>h.day===state.day).slice(-5).reverse();
     const log=events.length?'<ul class="weekend-timeline">'+events.map(e=>
       '<li><strong>'+escape(e.type.replace(/-/g,' ').toUpperCase())+
       '</strong><span>'+escape(e.detail)+'</span></li>').join('')+'</ul>':
       '<p class="weekend-empty">No confirmed customer activity yet. Quiet sessions can happen.</p>';
     const pending=m.pending?'<p class="weekend-warning">'+m.pending+
       ' sales-authority decision(s) require your response before advancing.</p>':'';
     return head+'<div class="weekend-phase"><b>'+PHASES[c.phase].time+
       ' · '+PHASES[c.phase].name+'</b><span>CHECKPOINT '+(c.phase+1)+
       ' OF 3 · '+escape(c.focus.toUpperCase())+' POLICY</span></div>'+log+pending+
       '<div class="weekend-actions">'+
       (m.pending?'<button type="button" data-page="inbox">REVIEW LIVE OFFER</button>':
         '<button type="button" data-action="weekend-next">'+
         (c.phase===2?'CLOSE TRADING & VIEW RESULTS':'ADVANCE TO NEXT CHECKPOINT')+'</button>')+
       '<button type="button" class="weekend-secondary" data-page="sales">OPEN LIVE SALES OFFICE</button>'+
       '</div></section>';
   }
   const r=c.result;
   return head+'<div class="weekend-result"><strong>'+
     (r.sales?'RETAIL HANDOVERS RECORDED':'NO RETAIL HANDOVERS THIS SESSION')+
     '</strong><p>Gross '+money(r.gross)+' · Cash movement '+money(r.cashDelta)+
     ' · '+r.served+' visitors served and '+r.missed+' missed. '+
     'Every figure comes from your actual dealership records.</p></div>'+
     (c.status==='review'?'<button type="button" class="weekend-complete" data-action="weekend-acknowledge">'+
       'ACKNOWLEDGE RESULTS & RETURN TO CAREER</button>':
       '<p class="weekend-finished">Review completed. Your next trading day can begin.</p>')+
     '</section>';
 }
 window.MotorTradeWeekend=Object.freeze({PHASES,OPTIONS,initial,clone,valid,
   saturday,slot,ensure,begin,advance,acknowledge,blocksContinue,render,metrics,session});
})();