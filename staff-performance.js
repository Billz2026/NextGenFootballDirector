'use strict';
/* Employee performance: measured transactions only, no invented results.
 * All metrics are derived from existing workshop, customer and sales history.
 * Older careers remain valid; missing attribution is not guessed.
 */
(() => {
  const isId=x=>Number.isSafeInteger(x)&&x>0;
  const round1=x=>Math.round(x*10)/10;
  const completedWork=state=>{
    const jobs=(state.vehicles||[]).map(v=>({job:v.workshop,vehicleId:v.id}))
      .concat((state.sold||[]).map(v=>({job:v.workshopRecord,vehicleId:v.id})));
    return jobs.filter(x=>x.job&&typeof x.job==='object');
  };
  function technician(state,employee){
    const id=employee.id,all=completedWork(state);
    const completed=all.filter(({job})=>job.method==='internal'&&
      job.stage==='ready'&&job.technicianId===id);
    const turnaround=completed.filter(({job})=>
      Number.isSafeInteger(job.startedDay)&&Number.isSafeInteger(job.completedDay)&&
      job.completedDay>=job.startedDay);
    const avgDays=turnaround.length?round1(turnaround.reduce((sum,{job})=>
      sum+job.completedDay-job.startedDay,0)/turnaround.length):null;
    const late=turnaround.filter(({job})=>Number.isSafeInteger(job.plannedDays)&&
      job.completedDay-job.startedDay>job.plannedDays+2).length;
    // First QC attempt is what diagnoses preparation rework. A later pass
    // should not erase the first-time failure.
    const checked=all.filter(({job})=>job.method==='internal'&&(
      (Array.isArray(job.qcLog)&&job.qcLog.length&&job.qcLog[0].technicianId===id)||
      ((!Array.isArray(job.qcLog)||!job.qcLog.length)&&
        job.stage==='ready'&&job.technicianId===id&&Number.isSafeInteger(job.reworks))
    ));
    const qcPassed=checked.filter(({job})=>Array.isArray(job.qcLog)&&job.qcLog.length?
      job.qcLog[0].passed===true:job.reworks===0).length;
    const firstPassRate=checked.length?Math.round(qcPassed/checked.length*100):null;
    const shifts=all.flatMap(({job})=>Array.isArray(job.workLog)?job.workLog:[]);
    const leadShifts=shifts.filter(x=>x.leadId===id).length;
    const assistantShifts=shifts.filter(x=>x.assistantId===id).length;
    const qcReworks=checked.length-qcPassed;
    const reasons=[];
    if(checked.length>=3&&firstPassRate<75)
      reasons.push('First-check QC below 75% ('+qcReworks+' reworks)');
    if(turnaround.length>=4&&late>=Math.ceil(turnaround.length/2))
      reasons.push(late+' jobs exceeded plan by more than 2 days');
    return {role:'technician',completed:completed.length,turnaroundCount:turnaround.length,
      avgDays,late,checked:checked.length,qcPassed,qcReworks,firstPassRate,
      leadShifts,assistantShifts,reasons,
      state:reasons.length?'review':completed.length>=3?'tracked':
        completed.length||checked.length||shifts.length?'limited':'none'};
  }
  function sales(state,employee){
    const id=employee.id;
    // Only explicitly attributed enquiries count. Older customer histories
    // may have no salespersonId; never ascribe those leads to a person.
    const leads=new Set((state.customerHistory||[])
      .filter(h=>h.type==='enquiry'&&h.salespersonId===id&&
        typeof h.leadId==='string').map(h=>h.leadId));
    // A pre-update active enquiry can still be attributed from its saved case.
    for(const c of Object.values(state.customerCases||{})){
      if(c.salespersonId===id&&typeof c.id==='string')leads.add(c.id);
      if(c.standby?.salespersonId===id&&typeof c.standby.id==='string')
        leads.add(c.standby.id);
    }
    const deals=(state.sold||[]).filter(v=>v.salespersonId===id);
    const converted=new Set(deals.filter(v=>
      typeof v.customerLeadId==='string'&&leads.has(v.customerLeadId))
      .map(v=>v.customerLeadId)).size;
    const rate=leads.size?Math.round(converted/leads.size*100):null;
    const gross=deals.reduce((sum,v)=>sum+(Number(v.profit)||0),0);
    const commission=deals.reduce((sum,v)=>sum+(Number(v.salesCommission)||0),0);
    const contribution=gross-commission;
    const reasons=[];
    if(leads.size>=6&&rate<20)
      reasons.push('Fewer than 20% of tracked enquiries converted');
    if(deals.length>=3&&contribution<=0)
      reasons.push('Non-positive margin after commission across '+deals.length+' sales');
    return {role:'sales',enquiries:leads.size,converted,conversionRate:rate,
      deals:deals.length,gross,commission,contribution,reasons,
      state:reasons.length?'review':leads.size>=6||deals.length>=3?'tracked':
        leads.size||deals.length?'limited':'none'};
  }
  function employee(state,person){
    if(person.role==='technician')return technician(state,person);
    if(person.role==='sales')return sales(state,person);
    return {role:person.role,state:'not-measured',reasons:[]};
  }
  function team(state){
    const rows=(state.staff||[]).map(person=>({person,
      performance:employee(state,person)}));
    return {rows,review:rows.filter(x=>x.performance.state==='review'),
      measured:rows.filter(x=>['sales','technician'].includes(x.person.role)),
      withHistory:rows.filter(x=>['limited','tracked','review'].includes(x.performance.state))};
  }
  window.MotorTradeStaffPerformance=Object.freeze({
    employee,team,technician,sales
  });
})();
