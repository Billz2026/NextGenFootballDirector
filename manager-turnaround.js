'use strict';
/* First 14 days: employer-owned opening stock, not a fictional new cash purchase. */
(() => {
 const MC=window.MotorTradeManagerCareer, MK=window.MotorTradeMarket;
 const INTEL=window.MotorTradeIntel,PH=window.MotorTradePhotos;
 const W=window.MotorTradeWorkshop, AG=window.MotorTradeStockAgeing;
 const Q=window.MotorTradeShowroom;
 if(!MC||!MK||!INTEL||!PH||!W||!AG||!Q)throw Error('Load vehicles and manager modules first');
 const money=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
 const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const whole=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
 const ages=[48,12,5],round50=n=>Math.round(n/50)*50;
 const note=id=>'Opening employer inventory · non-cash book capital: '+id;
 const clone=t=>t?{...t,cars:t.cars.map(v=>({...v})),decisions:t.decisions.map(v=>({...v}))}:null;
 function initialize(state){
   const m=state.managerCareer,d=MC.dealer(m?.employerId);
   if(!d||state.day!==1||state.vehicles.length||state.sold.length||
     state.wholesale.length||m.turnaround||state.cash!==d.openingCash)return false;
   const pool=MK.CATALOGUE.starter,n=Number(d.id.split('-')[1]);
   const cars=[];
   for(let slot=0;slot<3;slot++){
     const original=pool[(n*2+[0,3,8][slot])%pool.length];
     const origin='OPEN-'+d.id+'-'+(slot+1),id=state.nextId++;
     const p=INTEL.profile({...original,id:origin,kind:'seller'});
     const ready=slot!==2,cost=Math.max(400,round50(original.guide*(slot===0?.91:.95)));
     const prepSpent=ready?p.basePrep:0;
     const photo=PH.describe({...original,origin});
     const v={
       id,title:original.title,miles:original.miles,fuel:original.fuel,
       gearbox:original.gearbox,history:original.history,note:original.note,
       retail:p.retail,source:'seller',origin,cost,profile:p,
       prepBudget:p.basePrep+(p.hiddenFault?.cost||0),prepSpent,
       status:ready?'listed':'acquired',
       asking:ready?round50(slot===0?
         Math.min(p.retail*1.19,p.likelySale*1.17):p.likelySale+200):null,
       cashOffer:null,acquiredDay:1,openingAgeDays:ages[slot],
       listedDay:ready?1:null,color:photo.color,
       generation:PH.identity(original).generation
     };
     v.workshop=W.initial(v);
     state.vehicles.push(v);
     cars.push({id,origin,cost,prepSpent,openingAgeDays:ages[slot]});
   }
   const basis=cars.reduce((n,v)=>n+v.cost+v.prepSpent,0);
   state.stock=state.vehicles.length;
   state.ledger.push({day:1,delta:0,note:note(d.id)});
   state.inboxLedgerCursor=state.ledger.length;
   m.turnaround={version:1,employerId:d.id,deadlineDay:15,openingCash:d.openingCash,
     openingBasis:basis,cars,decisions:[]};
   Q.refresh(state);
   return true;
 }
 function valid(t,state){
   if(t==null)return true;
   const m=state.managerCareer,d=MC.dealer(m?.employerId);
   if(!d||t.version!==1||t.employerId!==d.id||t.deadlineDay!==15||
     t.openingCash!==d.openingCash||!Array.isArray(t.cars)||t.cars.length!==3||
     !Array.isArray(t.decisions)||t.decisions.length>150)return false;
   const seen=new Set();let basis=0;
   for(let i=0;i<3;i++){
     const c=t.cars[i];
     if(!c||!whole(c.id,1,100000)||seen.has(c.id)||
       c.origin!=='OPEN-'+d.id+'-'+(i+1)||c.openingAgeDays!==ages[i]||
       !whole(c.cost,400,100000)||!whole(c.prepSpent,0,10000))return false;
     seen.add(c.id);basis+=c.cost+c.prepSpent;
     const current=state.vehicles.find(x=>x.id===c.id);
     const sold=state.sold.find(x=>x.id===c.id);
     const wholesale=state.wholesale.find(x=>x.id===c.id);
     if(!current&&!sold&&!wholesale)return false;
     if(current&&(current.origin!==c.origin||current.cost!==c.cost||
       current.openingAgeDays!==c.openingAgeDays||
       current.source!=='seller'||current.prepSpent<c.prepSpent))return false;
     if(sold&&(sold.origin!==c.origin||sold.acquisition!==c.cost||
       sold.prep<c.prepSpent))return false;
     if(wholesale&&wholesale.basis<c.cost)return false;
   }
   if(t.openingBasis!==basis||!state.ledger.some(l=>
     l.day===1&&l.delta===0&&l.note===note(d.id)))return false;
   let last=1;
   for(const x of t.decisions){
     if(!x||!seen.has(x.vehicleId)||!whole(x.day,last,state.day)||
       !['reprice','hold'].includes(x.kind)||
       !whole(x.before,500,75000)||!whole(x.after,500,75000)||
       (x.kind==='hold'&&x.before!==x.after)||
       (x.kind==='reprice'&&x.before===x.after))return false;
     last=x.day;
   }
   return true;
 }
 function progress(state){
   const t=state.managerCareer?.turnaround;
   if(!t)return null;
   const ids=new Set(t.cars.map(c=>c.id));
   const retail=state.sold.filter(v=>ids.has(v.id));
   const wholesale=state.wholesale.filter(v=>ids.has(v.id));
   const remaining=state.vehicles.filter(v=>ids.has(v.id));
   return {retail,wholesale,remaining,daysLeft:Math.max(0,15-state.day),
     active:state.day<15,goalMet:retail.some(v=>v.profit>0),
     realisedGross:retail.reduce((n,v)=>n+v.profit,0)};
 }
 function reprice(state,id){
   const t=state.managerCareer?.turnaround,v=state.vehicles.find(v=>v.id===id);
   if(!t||!t.cars.some(c=>c.id===id)||v?.status!=='listed')
     return {ok:false,message:'Choose an advertised opening-stock vehicle.'};
   const price=AG.marketTarget(state,v);
   if(price>=v.asking)return {ok:false,message:'Already at or below the ageing-adjusted target.'};
   const before=v.asking,r=window.MotorTradeEngine.advertise(state,id,price);
   if(!r.ok)return r;
   t.decisions.push({day:state.day,vehicleId:id,kind:'reprice',before,after:price});
   return {ok:true,changed:true,message:v.title+' repriced from '+money(before)+
     ' to '+money(price)+'. Actual buyer demand will determine the result.'};
 }
 function hold(state,id){
   const t=state.managerCareer?.turnaround,v=state.vehicles.find(v=>v.id===id);
   if(!t||!t.cars.some(c=>c.id===id)||v?.status!=='listed')
     return {ok:false,message:'Choose an advertised opening-stock vehicle.'};
   if(t.decisions.some(x=>x.day===state.day&&x.vehicleId===id&&x.kind==='hold'))
     return {ok:false,message:'Already chose to hold this price today.'};
   t.decisions.push({day:state.day,vehicleId:id,kind:'hold',before:v.asking,after:v.asking});
   return {ok:true,changed:true,message:'Asking price retained. Holding costs and unsold-stock risk continue.'};
 }
 function render(state){
   const t=state.managerCareer?.turnaround,p=progress(state);
   if(!t||!p)return '';
   const report=window.MotorTradeMonthly.statement(state);
   const cards=t.cars.map(c=>state.vehicles.find(v=>v.id===c.id)).filter(Boolean);
   const candidate=cards.filter(v=>v.status==='listed')
     .sort((a,b)=>AG.age(state,b)-AG.age(state,a))[0];
   const waiting=cards.find(v=>v.status==='acquired');
   let action='';
   if(candidate){
     const age=AG.ageInfo(state,candidate);
     const reserved=['agreed','reserved','collectable'].includes(
       state.customerCases?.[String(candidate.id)]?.status);
     action='<div class="turnaround-decision"><div class="turnaround-decision-top"><strong>'+
       safe(candidate.title)+'</strong><span>'+age.days+' DAYS HELD</span></div>'+
       '<p>Asking '+money(candidate.asking)+' · Market-adjusted target '+money(age.target)+
       ' · Holding cost '+money(age.daily)+'/day. Decide whether to defend margin or pursue turnover.</p>'+
       '<div class="turnaround-actions">'+
       (!reserved&&age.target<candidate.asking?
         '<button type="button" data-action="turnaround-reprice" data-id="'+candidate.id+
         '">REPRICE TO '+money(age.target)+'</button>':'')+
       '<button type="button" class="turnaround-secondary" data-action="turnaround-hold" data-id="'+candidate.id+
       '">HOLD ASKING PRICE</button>'+
       '<button type="button" class="turnaround-secondary" data-page="sales">SALES OFFICE</button></div></div>';
   }
   if(waiting)action+='<div class="turnaround-next"><strong>WORKSHOP · '+safe(waiting.title)+
     '</strong><p>Must complete a real repair process and final QC before advertising.</p>'+
     '<button type="button" data-page="workshop">OPEN WORKSHOP</button></div>';
   const conclusion=p.active?'':('<p class="turnaround-review">'+
     (p.goalMet?'You delivered a profitable inherited-stock handover.':
       'The first fortnight ended without a profitable inherited-stock handover.')+
     ' Review actual trading results; no automatic reputation points are awarded.</p>');
   return '<section class="turnaround" aria-label="First 14-day dealership management challenge">'+
     '<div class="turnaround-topline"><span>MANAGER’S DESK · FIRST 14 DAYS</span>'+
     '<span>DAY '+state.day+' · '+p.daysLeft+' DAYS LEFT</span></div>'+
     '<div class="turnaround-head"><div><h2>'+(
       p.active?'Turn around your new dealership':'Your first fortnight · results')+
     '</h2><p>Board challenge: make a profitable handover from the inherited stock while protecting cash.</p></div>'+
     '<div class="turnaround-progress"><b>'+p.retail.filter(v=>v.profit>0).length+
     ' / 1</b><small>Profitable opening-stock handover</small></div></div>'+
     '<div class="turnaround-metrics">'+
       '<div><small>OPENING CARS HELD</small><strong>'+p.remaining.length+' / 3</strong></div>'+
       '<div><small>COMPANY CASH</small><strong>'+money(state.cash)+'</strong></div>'+
       '<div><small>REALISED OPENING-STOCK GROSS</small><strong>'+money(p.realisedGross)+'</strong></div>'+
       '<div><small>MONTHLY OPERATING CONTRIBUTION</small><strong>'+money(report.operatingContribution)+'</strong></div>'+
     '</div>'+action+conclusion+'</section>';
 }
 window.MotorTradeTurnaround=Object.freeze({initialize,valid,clone,progress,reprice,hold,render});
})();