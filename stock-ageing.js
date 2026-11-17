'use strict';
/* Stock ageing: real, bounded daily holding costs and demand pressure.
 * Costs apply to every unsold car, including vehicles still in preparation.
 * No automatic price changes, sales, wholesale exits or invented cash.
 */
(() => {
  const TIERS=Object.freeze([
    {from:0,until:14,label:'FRESH',daily:0,discount:0},
    {from:15,until:29,label:'15+ DAYS',daily:6,discount:.015},
    {from:30,until:44,label:'30+ DAYS',daily:14,discount:.04},
    {from:45,until:Infinity,label:'45+ DAYS',daily:28,discount:.07}
  ]);
  const age=(state,v,day=state.day)=>Math.max(0,day-v.acquiredDay);
  const tier=days=>TIERS.findLast(t=>days>=t.from)||TIERS[0];
  const fee=days=>tier(days).daily;
  const chargeFor=(state,day=state.day)=>(state.vehicles||[])
    .reduce((n,v)=>n+fee(age(state,v,day)),0);
  const forecast=(state,days,extraCar=false)=>{
    let cost=0;
    for(let i=1;i<=days;i++){
      cost+=chargeFor(state,state.day+i);
      if(extraCar)cost+=fee(i); // The proposed vehicle was acquired today.
    }
    return cost;
  };
  const round50=x=>Math.round(x/50)*50;
  function marketTarget(state,v){
    const fair=Number(v.profile?.likelySale??v.retail);
    const t=tier(age(state,v));
    const min=Math.max(500,Math.floor(v.retail*.5));
    return Math.max(min,Math.min(75000,round50(fair*(1-t.discount))));
  }
  // The existing enquiry formula uses the same base fair price.
  // Ageing increases the effective overpricing gap only; repricing back
  // below the market target removes the extra penalty.
  function overpricing(state,v){
    const fair=Number(v.profile?.likelySale??v.retail);
    const ageTarget=marketTarget(state,v);
    return Math.max(0,(v.asking-(age(state,v)<15?fair:ageTarget))/Math.max(1,fair));
  }
  function ageInfo(state,v){
    const days=age(state,v),t=tier(days);
    const recommendation=marketTarget(state,v);
    const invested=Number(v.cost||0)+Number(v.prepSpent||0)+
      (v.status==='acquired'&&['in-progress','quality-check'].includes(v.workshop?.stage)?
        Number(v.workshop.repairCost||0):0);
    const unspent=v.status==='acquired'&&!['in-progress','quality-check'].includes(v.workshop?.stage)?
      Number(v.prepBudget||0):0;
    return {days,tier:t.label,daily:t.daily,discountPct:Math.round(t.discount*1000)/10,
      target:recommendation,invested,unspent,
      expectedMargin:recommendation-invested-unspent,
      gap:v.status==='listed'?Math.max(0,v.asking-recommendation):null,
      next:days<15?15:days<30?30:days<45?45:null};
  }
  function advance(state){
    if(!Number.isSafeInteger(state.lastStockAgeingDay)||state.lastStockAgeingDay>=state.day)
      return {due:0,paid:0,arrears:state.stockAgeingArrears||0,alerts:[]};
    const due=chargeFor(state);
    if(due>0){
      const units=state.vehicles.filter(v=>fee(age(state,v))>0);
      state.ledger.push({day:state.day,delta:0,note:'Stock ageing expense accrued: £'+due+
        ' ('+units.length+' held vehicles)'});
      state.stockAgeingArrears+=due;
    }
    const reserved=window.MotorTradeWorkshop?.reserved(state)??0;
    const paid=Math.min(state.stockAgeingArrears,Math.max(0,state.cash-reserved));
    if(paid){
      state.cash-=paid;
      state.stockAgeingArrears-=paid;
      state.ledger.push({day:state.day,delta:-paid,note:'Stock ageing holding payment'});
    }
    state.lastStockAgeingDay=state.day;
    const alerts=state.vehicles.filter(v=>[15,30,45].includes(age(state,v)))
      .map(v=>v.title+' reached '+age(state,v)+' days held. Daily stock holding: £'+fee(age(state,v))+
        '. Review your asking price or trade exit.');
    if(state.stockAgeingArrears>0&&due)
      alerts.push('Stock ageing charges unpaid: £'+state.stockAgeingArrears+
        '. Selling stock may be necessary to clear liabilities.');
    return {due,paid,arrears:state.stockAgeingArrears,alerts};
  }
  function validate(saved){
    return Number.isSafeInteger(saved.stockAgeingArrears)&&
      saved.stockAgeingArrears>=0&&saved.stockAgeingArrears<=10000000&&
      Number.isSafeInteger(saved.lastStockAgeingDay)&&
      saved.lastStockAgeingDay>=1&&saved.lastStockAgeingDay<=saved.day;
  }
  window.MotorTradeStockAgeing=Object.freeze({
    TIERS,age,tier,fee,chargeFor,forecast,marketTarget,overpricing,
    ageInfo,advance,validate
  });
})();