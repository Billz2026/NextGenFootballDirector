'use strict';
/*
 * Fictional post-handover customer care. Outcomes are deterministic, bounded,
 * and based on the completed sale's condition, workshop QC and supervision.
 * The module does not purport to model UK consumer law or legal remedies.
 */
(() => {
  const ISSUES=Object.freeze([
    {key:'warning',name:'Intermittent warning light',base:275},
    {key:'coolant',name:'Cooling system fault',base:420},
    {key:'suspension',name:'Suspension noise following handover',base:355},
    {key:'starting',name:'Intermittent starting fault',base:495}
  ]);
  const MAX=20000;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function hash(value){
    let n=2166136261;
    for(const char of String(value))n=Math.imul(n^char.charCodeAt(0),16777619)>>>0;
    return n>>>0;
  }
  const initial=day=>({afterSalesCases:[],afterSalesCutoverDay:day});
  const outstanding=state=>state.afterSalesCases.filter(c=>c.status!=='resolved');
  const pendingCost=state=>outstanding(state).reduce((n,c)=>n+c.quote,0);
  function risk(sale){
    const grade=sale.profile?.grade??3,job=sale.workshopRecord;
    const firstFail=Array.isArray(job?.qcLog)&&job.qcLog[0]?.passed===false;
    const protection=clamp(sale.afterSalesQcCover??4,0,8);
    const reliability=clamp(sale.afterSalesTechReliability??12,0,20);
    return clamp(8+(grade>=4?14:grade===3?6:0)+(firstFail?12:0)+
      (job?.method==='external'?2:0)+(reliability<=9?4:reliability>=16?-4:0)-
      protection,3,46);
  }
  function schedule(state,sale){
    const identity=state.name+'|'+sale.id+'|'+sale.day;
    const age=5+hash('aftersales-day|'+identity)%9;
    const chance=hash('aftersales-risk|'+identity)%100;
    return {dueDay:sale.day+age,willClaim:chance<risk(sale),riskPct:risk(sale)};
  }
  function issue(state,sale){
    const key=state.name+'|'+sale.id+'|'+sale.day;
    const i=ISSUES[hash('aftersales-issue|'+key)%ISSUES.length];
    const grade=sale.profile?.grade??3;
    const amount=Math.min(1500,i.base+(grade>=4?190:0)+
      (hash('aftersales-cost|'+key)%5)*55);
    return {kind:i.key,issue:i.name,quote:amount};
  }
  function noteReputation(state,delta,reason){
    const old=state.reputationScore;
    state.reputationScore=clamp(old+delta,0,100);
    const applied=state.reputationScore-old;
    if(applied){
      state.reputationHistory.push({day:state.day,delta:applied,
        reason:reason.slice(0,150)});
      if(state.reputationHistory.length>90)state.reputationHistory.shift();
      state.reputation=window.MotorTradePeople?.tier(state.reputationScore)??state.reputation;
    }
    return applied;
  }
  function notify(state,c,sale){
    const inbox=window.MotorTradeInbox;
    inbox?.emit(state,{from:'CUSTOMER CARE',category:'sales',
      subject:'AFTERSALES · '+sale.title,
      preview:'Post-handover complaint. Assessment and repair options require a management decision.',
      body:'AFTERSALES CASE · STOCK '+c.id+'\n\n'+c.issue+
        '\nInitial estimated repair: £'+c.quote+
        '.\nCase opened on game day '+state.day+
        '.\n\nReview the case in SALES OFFICE → AFTERSALES. '+
        'Ignoring an unresolved issue may harm reputation. '+
        'This is a fictional scenario, not a statement of statutory customer rights.',
      linkPage:'sales',reference:'aftersales:'+c.id});
  }
  function advance(state){
    const opened=[],diagnosed=[],escalated=[];
    if(!Array.isArray(state.afterSalesCases))return {opened,diagnosed,escalated};
    const existing=new Set(state.afterSalesCases.map(c=>c.id));
    for(const sale of state.sold){
      if(existing.has(sale.id)||state.afterSalesCases.length>=MAX)continue;
      const q=schedule(state,sale);
      if(q.dueDay!==state.day||q.dueDay<=state.afterSalesCutoverDay||!q.willClaim)
        continue;
      const fault=issue(state,sale);
      const record={id:sale.id,openedDay:state.day,status:'open',
        ...fault,inspectionUsed:false,inspectionUntil:null,inspectionPaid:0,
        reduced:false,paid:0,resolvedDay:null,penalties:0};
      state.afterSalesCases.push(record);existing.add(sale.id);
      notify(state,record,sale);
      opened.push(sale.title+' · '+record.issue+' (estimated £'+record.quote+')');
    }
    for(const c of state.afterSalesCases){
      if(c.status==='resolved')continue;
      if(c.status==='inspection'&&c.inspectionUntil<=state.day){
        const sale=state.sold.find(v=>v.id===c.id);
        const improvement=hash('aftersales-diagnosis|'+(sale?.origin??c.id))%100<65;
        if(improvement){
          c.quote=Math.max(100,Math.floor(c.quote*.8/5)*5);
          c.reduced=true;
        }
        c.inspectionUntil=null;c.status='open';
        diagnosed.push('Stock '+c.id+' diagnosis confirmed: repair estimate £'+c.quote+
          (improvement?' after narrowed fault scope':' unchanged'));
      }
      const due=Math.min(3,Math.floor((state.day-c.openedDay)/7));
      if(due>c.penalties){
        const extra=due-c.penalties;
        c.penalties=due;
        const delta=noteReputation(state,-2*extra,
          'Unresolved aftersales complaint for stock '+c.id);
        escalated.push('Stock '+c.id+' unresolved: '+delta+
          ' reputation this review');
      }
    }
    return {opened,diagnosed,escalated};
  }
  function inspect(state,id){
    const c=state.afterSalesCases.find(c=>c.id===id);
    if(!c||c.status!=='open'||c.inspectionUsed)
      return {ok:false,code:'stage',message:'An uninspected, open customer complaint is required.'};
    const fee=60,reserve=window.MotorTradeWorkshop?.reserved(state)??0;
    if(state.cash-reserve<fee)return {ok:false,code:'cash',
      message:'Independent diagnosis costs £60. Existing workshop preparation reserves are protected.'};
    state.cash-=fee;state.ledger.push({day:state.day,delta:-fee,
      note:'Aftersales independent diagnosis: stock '+id});
    c.inspectionUsed=true;c.inspectionPaid=fee;
    c.inspectionUntil=state.day+2;c.status='inspection';
    return {ok:true,changed:true,message:'Independent diagnosis booked for stock '+id+
      '. £60 paid, report due in two game days. The estimate may fall, but inspection does not cancel the customer issue or stop the response clock.'};
  }
  function rectify(state,id){
    const c=state.afterSalesCases.find(c=>c.id===id);
    if(!c||c.status!=='open')return {ok:false,code:'stage',
      message:'The complaint must be open with an agreed repair estimate.'};
    const reserve=window.MotorTradeWorkshop?.reserved(state)??0;
    if(state.cash-reserve<c.quote)return {ok:false,code:'cash',
      message:'Insufficient unreserved cash for the £'+c.quote+
      ' customer rectification. Preserve existing workshop commitments.'};
    state.cash-=c.quote;state.ledger.push({day:state.day,delta:-c.quote,
      note:'Aftersales customer rectification: stock '+id});
    c.paid=c.quote;c.status='resolved';c.resolvedDay=state.day;
    const rep=c.penalties===0?
      noteReputation(state,1,'Prompt aftersales rectification for stock '+id):0;
    return {ok:true,changed:true,message:'Aftersales repair for stock '+id+
      ' completed. £'+c.paid+' paid and recorded as operating expense.'+
      (rep?' Customer care improved reputation by '+rep+'.':'')};
  }
  function valid(saved){
    if(!Number.isSafeInteger(saved.afterSalesCutoverDay)||
      saved.afterSalesCutoverDay<1||saved.afterSalesCutoverDay>saved.day||
      !Array.isArray(saved.afterSalesCases)||saved.afterSalesCases.length>MAX)return false;
    const soldById=new Map((saved.sold||[]).map(x=>[x.id,x]));
    const ids=new Set();
    const positive=(n,max=100000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
    for(const c of saved.afterSalesCases){
      if(!c||!positive(c.id)||c.id===0||ids.has(c.id)||!soldById.has(c.id)||
        !positive(c.openedDay,36500)||c.openedDay<=saved.afterSalesCutoverDay||
        c.openedDay>saved.day||c.openedDay<=soldById.get(c.id).day||
        !['open','inspection','resolved'].includes(c.status)||
        !ISSUES.some(i=>i.key===c.kind&&i.name===c.issue)||
        !positive(c.quote,1500)||c.quote<100||
        typeof c.inspectionUsed!=='boolean'||!positive(c.inspectionPaid,60)||
        c.inspectionPaid!==(c.inspectionUsed?60:0)||
        typeof c.reduced!=='boolean'||!positive(c.paid,1500)||
        !positive(c.penalties,3))return false;
      if(c.status==='inspection'&&(!c.inspectionUsed||
        !positive(c.inspectionUntil,36500)||c.inspectionUntil<=c.openedDay||
        c.inspectionUntil<saved.day))return false;
      if(c.status!=='inspection'&&c.inspectionUntil!==null)return false;
      if(c.status==='resolved'&&(!positive(c.resolvedDay,36500)||
        c.resolvedDay<c.openedDay||c.resolvedDay>saved.day||
        c.paid!==c.quote))return false;
      if(c.status!=='resolved'&&(c.resolvedDay!==null||c.paid!==0))return false;
      ids.add(c.id);
    }
    return true;
  }
  const clone=saved=>({
    afterSalesCutoverDay:saved.afterSalesCutoverDay,
    afterSalesCases:saved.afterSalesCases.map(c=>({...c}))
  });
  const stats=state=>{
    const all=state.afterSalesCases??[];
    return {open:all.filter(c=>c.status!=='resolved').length,
      resolved:all.filter(c=>c.status==='resolved').length,
      potentialCost:pendingCost(state),
      paid:all.reduce((n,c)=>n+c.paid+c.inspectionPaid,0)};
  };
  window.MotorTradeAfterSales=Object.freeze({
    ISSUES,initial,risk,schedule,issue,advance,inspect,rectify,valid,clone,
    outstanding,pendingCost,stats
  });
})();
