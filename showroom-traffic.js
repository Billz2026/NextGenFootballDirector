'use strict';
/* Showroom Traffic 2.0: finite daily visitors, staff capacity and patience. */
(() => {
 const D=window.MotorTradeEvents,P=window.MotorTradePeople;
 if(!D||!P)throw Error('Load events.js and people.js before showroom-traffic.js');
 const isInt=Number.isSafeInteger,limit=(n,a,b)=>Math.max(a,Math.min(b,n));
 const FIRST=['Alex','Sam','Jamie','Taylor','Jordan','Morgan','Charlie','Harper','Riley','Casey','Drew','Avery','Robin','Ellis','Frankie'];
 const LAST=['Patel','Jones','Ahmed','Williams','Singh','Brown','Khan','Evans','Wilson','Taylor','Clarke','Morgan','Shah','Davies','Ali'];
 function hash(text){let h=2166136261;for(const ch of String(text))h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
  h=Math.imul(h^(h>>>15),2246822507)>>>0;return(h^(h>>>13))>>>0;}
 const slot=s=>D.isDealDay(s.day)?s.deadlineSession:0;
 const initial=day=>({day,session:0,turn:0,ownerUsed:0,staffUsed:[],leads:[]});
 const waiting=s=>(s.showroom?.leads||[]).filter(q=>q.status==='waiting');
 function record(s,q,type,detail){
   s.customerHistory.push({day:s.day,vehicleId:q.vehicleId,leadId:q.customerId,type,detail:detail.slice(0,120)});
   if(s.customerHistory.length>2000)s.customerHistory.shift();
 }
 function closeWaiting(s,reason){
   const names=[];
   for(const q of waiting(s)){q.status='lost';q.reason=reason;record(s,q,'showroom-left',reason);names.push(q.name);}
   return names;
 }
 function generate(s){
   const b=s.showroom,cars=s.vehicles.filter(v=>v.status==='listed'&&
     !['agreed','reserved','collectable'].includes(s.customerCases?.[String(v.id)]?.status)).sort((a,c)=>a.id-c.id);
   const maxPerCar=cars.length<=2?3:2;
   for(const v of cars){
     if(b.leads.length>=7)break;
     if(D.isDealDay(s.day)&&!D.retailActive(s,v))continue;
     const fair=v.profile?.likelySale||v.retail,grade=v.profile?.grade||3;
     const over=Math.max(0,(v.asking-fair)/Math.max(1,fair));
     const probability=limit(67-Math.round(over*110)-(grade>=4?11:0)+
       Math.floor(s.reputationScore/7)+P.salesImpact(s,v.id).enquiryLift+
       (D.isDealDay(s.day)?10:0),18,94);
     for(let i=0;i<maxPerCar&&b.leads.length<7;i++){
       const seed=[s.name,s.day,b.session,v.id,i].join('|');
       const chance=i===0?probability:Math.round(probability*(i===1?.62:.35));
       if(hash('visit|'+seed)%100>=chance)continue;
       const personality=hash('patience|'+seed)%5;
       const idPart=hash('identity|'+seed)%1000000;
       b.leads.push({id:'Q-'+s.day+'-'+b.session+'-'+v.id+'-'+i,
         customerId:'C-'+s.day+'-'+b.session+'-'+v.id+'-'+idPart,
         vehicleId:v.id,createdDay:s.day,session:b.session,
         name:FIRST[hash('first|'+seed)%FIRST.length]+' '+
           LAST[hash('last|'+seed)%LAST.length],
         purpose:['READY TO PURCHASE','WANTS A TEST DRIVE','COMPARING OTHER DEALERS','ASKING ABOUT PRICE'][hash('purpose|'+seed)%4],
         maxTurns:personality===0?1:personality<=2?2:3,
         status:'waiting',handledBy:null,reason:'',
         preferredMode:hash('exchange|'+seed)%100<35?'part-ex':'cash'});
     }
   }
 }
 function initialise(s){if(!s.showroom)s.showroom=initial(s.day);s.showroom.session=slot(s);generate(s);}
 function roll(s){
   if(!s.showroom)s.showroom=initial(s.day);
   const b=s.showroom,phase=slot(s);
   if(b.day===s.day&&b.session===phase)return [];
   const gone=closeWaiting(s,'Left the dealership without being served.');
   // Deal Day has separate timed showroom sessions; each session gets
   // its own finite capacity and patient queue.
   Object.assign(b,{day:s.day,session:phase,
     turn:0,ownerUsed:0,staffUsed:[],leads:[]});
   generate(s);
   return gone.length?[gone.length+' unserved showroom visitor'+(gone.length===1?'':'s')+' left.']:[];
 }
 const customer=(s,id)=>waiting(s).find(q=>q.id===id)||null;
 function availableStaff(s){
   return P.activeTeam(s,'sales').filter(rep=>!(s.showroom?.staffUsed||[]).includes(rep.id)&&
     !Object.values(s.customerCases||{}).some(c=>c.salespersonId===rep.id&&
      ['arrived','discussing','agreed','collectable'].includes(c.status)));
 }
 function canServe(s,id,staffId=null){
   const q=customer(s,id);
   if(!q)return {ok:false,code:'expired',message:'This visitor is no longer waiting.'};
   const v=s.vehicles.find(x=>x.id===q.vehicleId);
   if(!v||v.status!=='listed')return {ok:false,code:'stock',message:'The vehicle is not available.'};
   const existing=s.customerCases[String(v.id)];
   if(existing&&!['lost','booked'].includes(existing.status))
     return {ok:false,code:'busy',message:'Another customer is already viewing or negotiating for this car. This visitor must wait.'};
   if(existing?.status==='booked'&&(existing.held||existing.standby))
     return {ok:false,code:'reserved',message:'The booked viewing already has an active rival.'};
   if(staffId===null){
     if(s.showroom.ownerUsed>=2)return {ok:false,code:'owner-busy',
       message:'You have personally served two visitors today. Use a free salesperson or move to the next day.'};
   }else if(!isInt(staffId)||!availableStaff(s).some(rep=>rep.id===staffId))
     return {ok:false,code:'staff-busy',message:'That salesperson has already handled a visitor or is unavailable.'};
   return {ok:true,q,v,existing};
 }
 function serve(s,id,staffId=null){
   const check=canServe(s,id,staffId);
   if(!check.ok)return check;
   const q=check.q;q.status='served';q.handledBy=staffId;
   record(s,q,'showroom-served',staffId===null?'Owner served the visitor':'Salesperson '+staffId+' served visitor');
   if(staffId===null){
     s.showroom.ownerUsed++;s.showroom.turn++;
     for(const other of waiting(s)){
       if(s.showroom.turn>=other.maxTurns){
         other.status='lost';other.reason='Left after waiting too long.';
         record(s,other,'showroom-left',other.reason);
       }
     }
   }else s.showroom.staffUsed.push(staffId);
   return {ok:true,q,employeeId:staffId};
 }
 function sold(s,id){
   for(const q of waiting(s).filter(q=>q.vehicleId===id)){
     q.status='lost';q.reason='Vehicle secured or sold to another customer.';
     record(s,q,'showroom-left',q.reason);
   }
 }
 function stats(s,a,b){
   const entries=s.customerHistory.filter(h=>h.day>=a&&h.day<=b);
   const served=entries.filter(h=>h.type==='showroom-served').length;
   const missed=entries.filter(h=>h.type==='showroom-left').length;
   return {visitors:served+missed,served,missed,waiting:waiting(s).length,
     capacityLeft:Math.max(0,2-(s.showroom?.ownerUsed||0)),freeSales:availableStaff(s).length};
 }
 function valid(s,saved){
   if(saved.version<17){s.showroom=initial(s.day);initialise(s);return true;}
   const b=saved.showroom;
   if(!b||!isInt(b.day)||b.day!==s.day||!isInt(b.session)||b.session!==slot(s)||
     !isInt(b.turn)||b.turn<0||b.turn>2||
     !isInt(b.ownerUsed)||b.ownerUsed!==b.turn||
     !Array.isArray(b.staffUsed)||b.staffUsed.length>3||
     new Set(b.staffUsed).size!==b.staffUsed.length||
     b.staffUsed.some(id=>!isInt(id)||id<=0||id>100000)||
     !Array.isArray(b.leads)||b.leads.length>7)return false;
   const ids=new Set();
   for(const q of b.leads){
     if(!q||typeof q.id!=='string'||!/^Q-\d+-\d+-\d+-\d+$/.test(q.id)||
       ids.has(q.id)||typeof q.customerId!=='string'||!/^C-\d+-\d+-\d+-\d+$/.test(q.customerId)||
       !isInt(q.vehicleId)||q.vehicleId<=0||q.vehicleId>100000||
       q.createdDay!==b.day||q.session!==b.session||
       !q.id.startsWith('Q-'+b.day+'-'+b.session+'-'+q.vehicleId+'-')||
       typeof q.name!=='string'||q.name.length<2||q.name.length>70||
       !['READY TO PURCHASE','WANTS A TEST DRIVE','COMPARING OTHER DEALERS','ASKING ABOUT PRICE'].includes(q.purpose)||
       ![1,2,3].includes(q.maxTurns)||!['waiting','served','lost'].includes(q.status)||
       (q.status==='waiting'&&!s.vehicles.some(v=>v.id===q.vehicleId&&v.status==='listed'))||
       (q.status==='waiting'&&b.turn>=q.maxTurns)||
       (q.handledBy!==null&&(!isInt(q.handledBy)||q.handledBy<=0||q.handledBy>100000))||
       (q.status!=='served'&&q.handledBy!==null)||
       typeof q.reason!=='string'||q.reason.length>120||
       !['cash','part-ex'].includes(q.preferredMode))return false;
     ids.add(q.id);
   }
   const served=b.leads.filter(q=>q.status==='served');
   if(served.filter(q=>q.handledBy===null).length!==b.ownerUsed||
     [...new Set(served.map(q=>q.handledBy).filter(x=>x!==null))].length!==b.staffUsed.length||
     b.staffUsed.some(id=>!served.some(q=>q.handledBy===id)))return false;
   s.showroom={day:b.day,session:b.session,turn:b.turn,ownerUsed:b.ownerUsed,
     staffUsed:[...b.staffUsed],leads:b.leads.map(q=>({...q}))};
   return true;
 }
 window.MotorTradeShowroom=Object.freeze({
   initial,initialise,roll,waiting,customer,availableStaff,canServe,serve,sold,stats,valid,closeWaiting
 });
})();
