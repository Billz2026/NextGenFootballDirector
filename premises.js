'use strict';
/*
 * The Motor Trade v0.9.8 — fictional premises and fixed-cost decisions.
 * Figures are game balancing assumptions, not UK commercial lease quotes.
 * Permanent forecourt expansion is an automatic reputation award.
 * Workshop capital expenditure remains a cash investment, while the two
 * temporary offsite spaces incur daily operating charges. Daily overheads
 * accrue even if cash is unavailable; unpaid obligations
 * survive saves and cannot be discharged from reserved vehicle repair money.
 */
(() => {
  const FORECOURT=Object.freeze([4,6,8,10]);
  const WORKSHOP=Object.freeze([4,6,8]);
  const FOR_REP=Object.freeze([20,40,60]);
  const OVERFLOW_SPACES=2;
  const OVERFLOW_DAILY_FEE=22;
  const WORK_REP=Object.freeze([40,80]);
  const WORK_COST=Object.freeze([2600,4800]);
  const integer=Number.isSafeInteger;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const initial=()=>({forecourtLevel:0,workshopLevel:0,arrears:0});
  const capacity=s=>FORECOURT[s.premises?.forecourtLevel??0]??4;
  const storageLimit=s=>capacity(s)+OVERFLOW_SPACES;
  const overflowUsed=s=>Math.max(0,(s.vehicles?.length||0)-capacity(s));
  const bays=s=>WORKSHOP[s.premises?.workshopLevel??0]??4;
  const autoLevel=score=>score>=60?3:score>=40?2:score>=20?1:0;
  // Reputation expands the permanent site. It cannot shrink after a setback;
  // no unrecorded capital purchase is charged to the career.
  function sync(state){
    if(!state?.premises)return null;
    const previous=state.premises.forecourtLevel;
    const next=Math.max(previous,autoLevel(state.reputationScore||0));
    if(next!==previous)state.premises.forecourtLevel=next;
    state.capacity=capacity(state);
    return next>previous?{previous:FORECOURT[previous],current:FORECOURT[next],
      nextLevel:next,dailyIncrease:costs(state).total-costs({
        ...state,premises:{...state.premises,forecourtLevel:previous}
      }).total}:null;
  }
  function costs(s){
    const f=s.premises?.forecourtLevel??0;
    const w=s.premises?.workshopLevel??0;
    const rent=[18,26,35,47][f]??18;
    const utilities=([7,9,11,14][f]??7)+([0,4,10][w]??0);
    const workshopLease=[0,10,22][w]??0;
    const offsite=overflowUsed(s)*OVERFLOW_DAILY_FEE;
    return {rent:rent+workshopLease,utilities,offsite,
      total:rent+workshopLease+utilities+offsite,
      monthlyGuide:(rent+workshopLease+utilities+offsite)*30};
  }
  function quote(state,kind){
    if(!['forecourt','workshop'].includes(kind))return null;
    const f=kind==='forecourt',level=f?state.premises.forecourtLevel:state.premises.workshopLevel;
    const sizes=f?FORECOURT:WORKSHOP,rep=f?FOR_REP:WORK_REP;
    if(level>=sizes.length-1)return {kind,maximum:true,automatic:f};
    const requiredReputation=rep[level],cost=f?0:WORK_COST[level];
    const after={
      ...state,premises:{...state.premises,[f?'forecourtLevel':'workshopLevel']:level+1}
    };
    const beforeDaily=costs(state).total,afterDaily=costs(after).total;
    const repairReserve=window.MotorTradeWorkshop?.reserved(state)??0;
    const wages=(state.staff||[]).reduce((n,e)=>
      n+Math.ceil(e.monthlySalary/30),0);
    // Repairs and outstanding wages stay protected. One week of rent plus
    // three days of staff wages protects a newly expanded dealership.
    const protectedCash=repairReserve+state.payrollArrears+state.premises.arrears+
      7*afterDaily+3*wages;
    const requiredCash=f?0:cost+protectedCash;
    return {kind,automatic:f,maximum:false,current:sizes[level],next:sizes[level+1],
      level:level+1,cost,requiredReputation,eligible:!f&&state.reputationScore>=requiredReputation,
      currentDaily:beforeDaily,newDaily:afterDaily,dailyIncrease:afterDaily-beforeDaily,
      protectedCash:f?0:protectedCash,requiredCash,
      shortfall:f?0:Math.max(0,requiredCash-state.cash)};
  }
  function upgrade(state,kind){
    const q=quote(state,kind);
    if(!q)return {ok:false,code:'kind',message:'Unknown premises upgrade.'};
    if(q.maximum)return {ok:false,code:'max',message:'This facility is already at maximum capacity.'};
    if(kind==='forecourt')return {ok:false,code:'automatic',
      message:'Permanent forecourt space now unlocks automatically with reputation: 6 at 20, 8 at 40, and 10 at 60. No purchase is required.'};
    if(!q.eligible)return {ok:false,code:'reputation',message:'Reach '+q.requiredReputation+
      ' reputation before upgrading '+kind+' facilities.'};
    if(q.shortfall)return {ok:false,code:'cash',message:'Premises expansion needs £'+
      q.requiredCash.toLocaleString('en-GB')+' cash, including the £'+
      q.cost.toLocaleString('en-GB')+' investment and protected wage, rent and repair buffers. '+
      'You are £'+q.shortfall.toLocaleString('en-GB')+' short.'};
    state.cash-=q.cost;
    state.ledger.push({day:state.day,delta:-q.cost,
      note:'Premises investment: '+kind+' level '+q.level});
    state.premises[kind==='forecourt'?'forecourtLevel':'workshopLevel']=q.level;
    sync(state);
    return {ok:true,message:(kind==='forecourt'?'Forecourt':'Workshop')+
      ' expanded to '+q.next+(kind==='forecourt'?' vehicle spaces.':' repair bays.')+
      ' £'+q.cost.toLocaleString('en-GB')+' invested; recurring overhead increases £'+
      q.dailyIncrease+' per game day.'};
  }
  function advance(state){
    const due=costs(state);
    state.ledger.push({day:state.day,delta:0,
      note:'Premises expense accrued: £'+due.total+' (rent £'+due.rent+
        ', utilities £'+due.utilities+', offsite stock holding £'+due.offsite+')'});
    state.premises.arrears+=due.total;
    const repairReserve=window.MotorTradeWorkshop?.reserved(state)??0;
    const available=Math.max(0,state.cash-repairReserve);
    const paid=Math.min(available,state.premises.arrears);
    if(paid){
      state.cash-=paid;
      state.premises.arrears-=paid;
      state.ledger.push({day:state.day,delta:-paid,note:'Premises overhead payment'});
    }
    // A missed rent bill is not free money. An extended unpaid balance hurts
    // reputation, but one difficult trading day will not ruin a new business.
    let reputationDelta=0;
    if(state.premises.arrears>due.total*7&&state.day%7===0){
      const before=state.reputationScore;
      state.reputationScore=clamp(before-1,0,100);
      reputationDelta=state.reputationScore-before;
      if(reputationDelta){
        state.reputationHistory.push({day:state.day,delta:reputationDelta,
          reason:'Extended unpaid premises expenses damaged supplier confidence'});
        if(state.reputationHistory.length>90)state.reputationHistory.shift();
      }
    }
    return {due:due.total,paid,arrears:state.premises.arrears,reputationDelta,
      offsite:due.offsite};
  }
  function valid(record){
    return !!record&&typeof record==='object'&&!Array.isArray(record)&&
      integer(record.forecourtLevel)&&record.forecourtLevel>=0&&record.forecourtLevel<FORECOURT.length&&
      integer(record.workshopLevel)&&record.workshopLevel>=0&&record.workshopLevel<WORKSHOP.length&&
      integer(record.arrears)&&record.arrears>=0&&record.arrears<=10000000;
  }
  const clone=record=>({...record});
  window.MotorTradePremises=Object.freeze({
    FORECOURT,WORKSHOP,FOR_REP,OVERFLOW_SPACES,OVERFLOW_DAILY_FEE,initial,capacity,
    storageLimit,overflowUsed,autoLevel,sync,bays,costs,quote,upgrade,advance,valid,clone
  });
})();
