'use strict';
/* Motor Trade Manager Induction — recorded day-one management handover.
   Introductions use the actual salaried employees. Spending and discount
   decisions call existing operational engines; no synthetic cash is created. */
(() => {
  const SALES=window.MotorTradeDelegation;
  const OPS=window.MotorTradeOperations;
  const P=window.MotorTradePeople;
  const MC=window.MotorTradeManagerCareer;
  if(!SALES||!OPS||!P||!MC)throw Error('Load staff and delegation before induction.');
  const PRIORITIES=Object.freeze({
    liquidity:{title:'Protect working capital',
      detail:'Review daily cash headroom and avoid overcommitting to slow stock.'},
    turnover:{title:'Improve stock turnover',
      detail:'Prioritise a realistic buy-prepare-advertise-sell pipeline.'},
    trust:{title:'Customer experience & quality',
      detail:'Track handovers, correct descriptions and QC before volume.'}
  });
  const STEPS=Object.freeze(['board','team','brief','policies','complete']);
  const SALES_POLICY_KEYS=SALES.POLICIES.map(x=>x.key);
  const OPS_POLICY_KEYS=OPS.POLICIES.map(x=>x.key);
  const initial=()=>({version:1,step:0,completed:false,
    salesPolicy:null,operationsPolicy:null,firstPriority:null,completedDay:null});
  const pending=state=>!!state?.managerCareer?.induction&&
    !state.managerCareer.induction.completed;
  const clone=i=>i?{...i}:null;
  const integer=Number.isSafeInteger;
  function valid(i,state){
    if(i===undefined||i===null)return true; // pre-induction career compatibility
    if(i.version!==1||!integer(i.step)||i.step<0||i.step>4||
      typeof i.completed!=='boolean'||i.completed!==(i.step===4))
      return false;
    if(!i.completed)return i.salesPolicy===null&&
      i.operationsPolicy===null&&i.firstPriority===null&&i.completedDay===null&&
      state.day===1; // induction cannot be bypassed by advancing the calendar
    return SALES_POLICY_KEYS.includes(i.salesPolicy)&&
      OPS_POLICY_KEYS.includes(i.operationsPolicy)&&
      Object.hasOwn(PRIORITIES,i.firstPriority)&&
      i.completedDay===1&&state.day>=1;
  }
  function advance(state){
    const i=state?.managerCareer?.induction;
    if(!i||i.completed||i.step<0||i.step>=3||state.day!==1)
      return {ok:false,message:'Induction step unavailable.'};
    i.step++;
    return {ok:true,step:i.step};
  }
  // New managers meet a stable, employer-specific roster drawn from the
  // actual first-day applicant pool. Older owner careers keep their team.
  function assignOpeningTeam(state,employerId){
    if(state?.day!==1||state.vehicles.length||state.sold.length||
      !MC.dealer(employerId))return false;
    const seq=Number(employerId.split('-')[1]),roster=P.openingTeam();
    const candidates=P.applicants(1);
    const offsets={sales:seq-1,buyer:Math.floor((seq-1)/8),
      technician:Math.floor((seq-1)/4),supervisor:Math.floor((seq-1)/16)};
    const chosen=roster.map(base=>{
      const pool=candidates.filter(p=>p.role===base.role);
      const pick=pool[offsets[base.role]%pool.length];
      if(!pick)throw Error('Missing starter candidate: '+base.role);
      return {...base,name:pick.name,candidateId:pick.id,
        skills:{...pick.skills},monthlySalary:pick.monthlySalary,
        experience:pick.experience};
    });
    state.staff=chosen;
    state.nextStaffId=5;
    window.MotorTradeMonthly.initialize(state);
    window.MotorTradePremises.sync(state);
    return true;
  }
  const team=state=>(state?.staff||[]).filter(e=>
    ['sales','buyer','technician','supervisor'].includes(e.role)
  ).map(e=>({id:e.id,name:e.name,role:e.role,
    experience:e.experience,monthlySalary:e.monthlySalary,
    skills:{...e.skills}}));
  const fmt=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',
    maximumFractionDigits:0}).format(n);
  function complete(state,salesKey,opsKey,focus){
    const i=state?.managerCareer?.induction;
    if(!i||i.step!==3||i.completed||state.day!==1||
      !SALES_POLICY_KEYS.includes(salesKey)||
      !OPS_POLICY_KEYS.includes(opsKey)||
      !Object.hasOwn(PRIORITIES,focus))
      return {ok:false,message:'Complete each induction stage and choose valid management authorities.'};
    const sales=SALES.setPolicy(state,salesKey);
    const operations=OPS.setPolicy(state,opsKey);
    if(!sales.ok||!operations.ok)return {ok:false,
      message:'Policy could not be applied. Induction has not been completed.'};
    i.salesPolicy=salesKey;
    i.operationsPolicy=opsKey;
    i.firstPriority=focus;
    i.completed=true;
    i.step=4;
    i.completedDay=state.day;
    const salesOption=SALES.POLICIES.find(p=>p.key===salesKey);
    const opOption=OPS.POLICIES.find(p=>p.key===opsKey);
    const employer=MC.dealer(state.managerCareer.employerId);
    const people=team(state);
    window.MotorTradeInbox?.emit(state,{
      from:'BOARD SECRETARY · MANAGEMENT INDUCTION',category:'operations',
      subject:'Day-one induction completed · Delegated authorities in force',
      preview:'Sales and operating limits confirmed. First management priority: '+
        PRIORITIES[focus].title+'.',
      body:'WELCOME TO '+employer.name.toUpperCase()+'\n\n'+
        'Your introductory meetings have finished. Existing employees remain in their roles and on their normal payroll.\n\n'+
        'YOUR FIRST TEAM\n'+people.map(e=>e.name+' — '+e.role).join('\n')+
        '\n\nAUTHORISED SALES POLICY\n'+salesOption.name+
        '\nMaximum staff discount: '+fmt(salesOption.maxDiscount)+
        '\nMinimum gross margin: '+fmt(salesOption.minGross)+
        '\nPart-exchange authority: '+fmt(salesOption.maxPartExchange)+
        '\n\nBUYING & WORKSHOP POLICY\n'+opOption.name+
        '\nMaximum purchase: '+fmt(opOption.maxPurchase)+
        '\nMaximum delegated repair: '+fmt(opOption.maxRepair)+
        '\nMaximum stock units: '+opOption.maxStock+
        '\n\nFIRST-WEEK FOCUS\n'+PRIORITIES[focus].title+
        '\n'+PRIORITIES[focus].detail+
        '\n\nThese limits are active in the existing sales and workshop engines.'+
        ' Your first 90 game days form a probationary appointment, with actual'+
        ' monthly results reviewed by the board.',
      linkPage:'manager',reference:'manager-induction:'+employer.id
    });
    return {ok:true,message:'Management induction completed. Trading authorities now apply to staff decisions.',
      salesPolicy:salesKey,operationsPolicy:opsKey,firstPriority:focus};
  }
  window.MotorTradeInduction=Object.freeze({STEPS,PRIORITIES,
    initial,clone,pending,valid,advance,complete,team,assignOpeningTeam,
    SALES_POLICIES:SALES.POLICIES,OPERATIONS_POLICIES:OPS.POLICIES
  });
})();