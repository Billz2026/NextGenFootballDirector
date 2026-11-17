'use strict';
/* The Motor Trade v0.8
 * Vehicle preparation requires diagnosis, paid repair work, elapsed game
 * days and a final quality check. Estimates are fictional, not real garage
 * quotations or assurances of roadworthiness.
 */
(() => {
  const P=window.MotorTradePeople;
  const stages=['unassessed','quoted','in-progress','quality-check','ready'];
  const methods=['internal','external'];
  const integer=Number.isSafeInteger;
  const ok=(message,extra={})=>({ok:true,changed:true,message,...extra});
  const fail=(code,message)=>({ok:false,code,message});
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function hash(t){
    let n=2166136261;
    for(const c of String(t))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
    return n>>>0;
  }
  function initial(vehicle){
    const ready=vehicle.status==='prepared'||vehicle.status==='listed';
    return {stage:ready?'ready':'unassessed',
      assessmentFee:0,method:null,repairCost:ready?vehicle.prepSpent:0,
      remainingDays:0,plannedDays:0,partsDelay:0,startedDay:null,
      completedDay:ready?vehicle.acquiredDay:null,
      technicianId:null,assistantId:null,priority:'normal',workLog:[],qcLog:[],
      reworks:0,paused:false};
  }
  const reservedCost=v=>v.status==='acquired' &&
    !['in-progress','quality-check'].includes(v.workshop?.stage)?v.prepBudget:0;
  function reserved(state,exceptId=null){
    return state.vehicles.reduce((n,v)=>n+(v.id===exceptId?0:reservedCost(v)),0);
  }
  function find(state,id){
    return state.vehicles.find(v=>v.id===id);
  }
  function charge(state,amount,note){
    state.cash-=amount;
    state.ledger.push({day:state.day,delta:-amount,note});
  }
  function assess(state,id){
    const vehicle=find(state,id);
    if(!vehicle)return fail('missing','Vehicle is not in stock.');
    const job=vehicle.workshop;
    if(vehicle.status!=='acquired'||job.stage!=='unassessed')
      return fail('already','Assessment is only available for newly acquired, unassessed stock.');
    const technician=P.active(state,'technician');
    const fee=technician?30:55;
    if(state.cash<reserved(state)+fee)
      return fail('cash','Insufficient unreserved cash for the £'+fee+' assessment. Preparation reserves are protected.');
    charge(state,fee,'Workshop assessment: '+vehicle.title);
    vehicle.cost+=fee; // The diagnostic fee stays in the car's real acquisition basis.
    job.assessmentFee=fee;
    job.stage='quoted';
    const extra=vehicle.profile?.hiddenFault;
    const detail=extra?' Additional repair identified: '+extra.item+' (£'+extra.cost+').':
      ' No further defect identified beyond known work.';
    return ok('Workshop assessment £'+fee+' completed for '+vehicle.title+'.'+detail+
      ' Choose a repair method; neither option is instantaneous.');
  }
  function quote(state,vehicle,method,technicianId=null){
    if(!methods.includes(method))return null;
    const free=method==='internal'?P.availableTechnicians(state):[];
    const tech=method==='internal'?
      (technicianId===null?free[0]:free.find(t=>t.id===technicianId)):null;
    const busyBays=state.vehicles.filter(v=>v.workshop?.method==='internal'&&
      ['in-progress','quality-check'].includes(v.workshop.stage)).length;
    if(method==='internal'&&(!tech||busyBays>=(window.MotorTradePremises?.bays(state)??4)))return null;
    const base=vehicle.prepBudget;
    const saving=method==='internal'?P.labourSaving(state,vehicle,tech):0;
    const supplement=method==='external'?Math.round((base*.12+75)/5)*5:0;
    const cost=base-saving+supplement;
    const grade=vehicle.profile?.grade??3;
    const partsDelay=hash(vehicle.origin+'|parts')%3; // Stable 0–2 day delay.
    const effort=clamp(1+Math.ceil(base/340)+(grade>=4?1:0),2,6);
    const efficiency=method==='internal'&&tech.skills.efficiency>=16?1:0;
    const possibleSupervisorDays=method==='internal'?
      P.supervisorProfile(state).turnaroundDays:0;
    const baselineDuration=clamp(effort-efficiency+
      (method==='external'?0:1)+partsDelay,2,9);
    const duration=clamp(effort-efficiency+
      (method==='external'?0:1)+partsDelay-possibleSupervisorDays,2,9);
    const supervisorDays=baselineDuration-duration;
    return {method,cost,duration,partsDelay,saving,supplement,
      supervisorDays,technicianId:method==='internal'?tech.id:null,
      provider:method==='external'?'Independent external garage':tech.name};
  }
  function start(state,id,method,technicianId=null){
    const vehicle=find(state,id);
    if(!vehicle)return fail('missing','Vehicle not found.');
    if(vehicle.status!=='acquired'||vehicle.workshop.stage!=='quoted')
      return fail('stage','Obtain a workshop assessment before booking repairs.');
    const q=quote(state,vehicle,method,technicianId);
    if(!q){
      if(method==='internal'){
        const busyBays=state.vehicles.filter(v=>v.workshop?.method==='internal'&&
          ['in-progress','quality-check'].includes(v.workshop.stage)).length;
        const bays=window.MotorTradePremises?.bays(state)??4;
        if(busyBays>=bays)return fail('bays',
          'All '+bays+' physical workshop bays are occupied. Extra technicians assist repairs already in progress, but cannot create extra bays. Finish quality control or expand your workshop.');
        if(P.activeTeam(state,'technician').length)return fail('busy',
          'All technicians are assigned to repairs or quality checks. Hire additional technicians, finish a job, or use an external garage.');
      }
      return fail('staff','An available prep technician is required for internal repairs. Use an external garage instead.');
    }
    if(method==='external'&&state.vehicles.filter(v=>v.id!==id&&
       v.workshop?.stage==='in-progress'&&v.workshop.method==='external').length>=2)
      return fail('busy','External garage capacity is full. Try again when a job is completed.');
    if(q.cost>state.cash-reserved(state,id))
      return fail('cash','Insufficient cash for '+q.provider+
        ' (£'+q.cost+'). Money needed for other unprepared stock is protected.');
    charge(state,q.cost,'Workshop repair booking: '+vehicle.title+
      ' ('+q.provider+')');
    Object.assign(vehicle.workshop,{stage:'in-progress',method,
      repairCost:q.cost,remainingDays:q.duration,plannedDays:q.duration,
      partsDelay:q.partsDelay,startedDay:state.day,completedDay:null,
      technicianId:q.technicianId,assistantId:null,
      priority:vehicle.workshop.priority==='urgent'?'urgent':'normal',
      workLog:vehicle.workshop.workLog??[],qcLog:vehicle.workshop.qcLog??[],
      reworks:0,paused:false});
    return ok(vehicle.title+' booked with '+q.provider+' for £'+q.cost+
      '. Estimated turnaround '+q.duration+' game days'+
      (q.partsDelay?', including '+q.partsDelay+' parts-wait day(s)':'')+
      (q.supervisorDays?' Supervisor scheduling saved one planned repair day.':'')+
      '. Assign a qualified assistant in Job Dispatch to accelerate repair shifts. This car cannot be advertised until repairs and quality control finish.');
  }
  // Dispatch decisions are made by the player; urgent is a scheduling flag,
  // not an unexplained reduction to repair duration.
  function priority(state,id,value){
    const v=find(state,id);
    if(!v||v.status!=='acquired'||!['unassessed','quoted','in-progress'].includes(v.workshop?.stage))
      return fail('stage','Only pending or active vehicle preparation can be prioritised.');
    if(!['normal','urgent'].includes(value))return fail('priority','Invalid job priority.');
    if((v.workshop.priority??'normal')===value)return fail('unchanged','Job already has this priority.');
    v.workshop.priority=value;
    return ok(v.title+' marked '+value.toUpperCase()+'. Job priority changes the dispatch queue; assign labour to improve turnaround.');
  }
  function reassign(state,id,technicianId){
    const v=find(state,id);
    if(!v||v.workshop?.stage!=='in-progress'||v.workshop.method!=='internal')
      return fail('stage','Only active in-house repairs can be reassigned.');
    const j=v.workshop;
    if(!integer(technicianId)||technicianId<1)return fail('staff','Choose a valid technician.');
    if(technicianId===j.technicianId)return fail('unchanged','Technician is already the job lead.');
    const tech=P.availableTechnicians(state).find(x=>x.id===technicianId);
    if(!tech)return fail('busy','Selected technician is unavailable or already allocated to another job.');
    j.technicianId=tech.id;
    j.paused=false;
    return ok(v.title+' reassigned to '+tech.name+'. Remaining paid repair time is unchanged.');
  }
  function assignAssistant(state,id,technicianId){
    const v=find(state,id);
    if(!v||v.workshop?.stage!=='in-progress'||v.workshop.method!=='internal')
      return fail('stage','Only active in-house repairs can have an assistant.');
    const j=v.workshop;
    if(technicianId===null||technicianId===0){
      if(j.assistantId==null)return fail('unchanged','No assistant is allocated to this job.');
      j.assistantId=null;
      return ok('Assistant released from '+v.title+'. Future shifts proceed at standard pace.');
    }
    if(!integer(technicianId)||technicianId<1||technicianId===j.technicianId)
      return fail('staff','Choose another qualified technician, not the job lead.');
    const tech=P.availableTechnicians(state).find(x=>x.id===technicianId);
    if(!tech)return fail('busy','This assistant is unavailable or already assigned elsewhere.');
    if(tech.skills.efficiency<12)return fail('skills','Assistants require at least 12 efficiency.');
    const previous=j.assistantId;
    j.assistantId=tech.id;
    return ok(tech.name+' assigned to assist '+v.title+
      (previous?' (previous assistant released).':'')+
      '. A worked shift can remove one additional repair day.');
  }
  function advance(state){
    const events=[];
    for(const v of state.vehicles){
      const job=v.workshop;
      if(!job||job.stage!=='in-progress'||state.day<=job.startedDay)continue;
      if(job.method==='internal'&&!P.isActive(state,
        state.staff.find(s=>s.id===job.technicianId&&s.role==='technician'))){
        job.paused=true;
        events.push(v.title+' repair paused: assigned technician is unavailable. Reassign in Workshop Dispatch.');
        continue;
      }
      job.paused=false;
      let progress=1,helper=null;
      if(job.method==='internal'&&job.remainingDays>1&&job.assistantId!=null){
        const candidate=state.staff.find(s=>s.id===job.assistantId&&s.role==='technician');
        if(candidate&&P.isActive(state,candidate)&&candidate.skills.efficiency>=12){
          helper=candidate;
          progress=2;
          helper.workDone++;
          helper.morale=clamp(helper.morale+1,0,100);
          events.push(helper.name+' assisted with '+v.title+
            ', completing an extra day of preparation work.');
        }
      }
      if(job.method==='internal'){
        (job.workLog??=[]).push({day:state.day,leadId:job.technicianId,
          assistantId:helper?.id??null,progress:Math.min(progress,job.remainingDays)});
      }
      job.remainingDays=Math.max(0,job.remainingDays-progress);
      if(job.remainingDays===0){
        job.stage='quality-check';
        job.assistantId=null; // Free the assistant immediately after repair.
        events.push(v.title+' repairs finished. Complete the final quality check in Workshop.');
      }
    }
    return events;
  }
  function transfer(state,id){
    const v=find(state,id);
    if(!v)return fail('missing','Vehicle not found.');
    const j=v.workshop;
    if(j?.stage!=='in-progress'||j.method!=='internal')
      return fail('stage','Only an active in-house repair can be transferred externally.');
    // The same two-slot limit applies to transfers as to new bookings.
    // Check before debiting the £125 fee or changing the assignment.
    const outside=state.vehicles.filter(x=>x.id!==id&&
      x.workshop?.stage==='in-progress'&&x.workshop.method==='external').length;
    if(outside>=2)
      return fail('busy','Both external garage slots are occupied. Wait for a job to finish before transferring.');
    const chargeAmount=125;
    if(chargeAmount>state.cash-reserved(state))
      return fail('cash','Insufficient cash to transfer repair work to a garage (£125).');
    charge(state,chargeAmount,'Workshop transfer to outside garage: '+v.title);
    j.repairCost+=chargeAmount;
    j.method='external';
    j.technicianId=null;
    j.assistantId=null;
    j.remainingDays=Math.max(2,j.remainingDays);
    j.plannedDays+=1;
    j.paused=false;
    return ok(v.title+' transferred to an external garage. £125 charged; remaining turnaround '+
      j.remainingDays+' game days.');
  }
  function quality(state,id){
    const v=find(state,id);
    if(!v)return fail('missing','Vehicle not found.');
    const j=v.workshop;
    if(v.status!=='acquired'||j?.stage!=='quality-check')
      return fail('stage','The repair work must finish before a final quality check.');
    const tech=state.staff.find(x=>x.id===j.technicianId);
    const reliability=tech?.skills.reliability??11;
    const supervisorQC=P.supervisorProfile(state).qcRiskReduction;
    const risk=Math.max(2,(v.profile?.grade>=4?25:14)-
      (j.method==='internal'?Math.max(0,reliability-12):0)-supervisorQC);
    const reworkNeeded=j.reworks===0 && hash('quality|'+v.origin)%100<risk;
    if(reworkNeeded){
      const cost=95+(hash(v.origin+'|rectification')%4)*25;
      if(state.cash<cost+reserved(state))
        return fail('cash','Quality control found additional work costing £'+cost+
          '. Deposit more available cash before authorising rectification.');
      charge(state,cost,'Workshop quality rectification: '+v.title);
      j.repairCost+=cost;
      (j.qcLog??=[]).push({day:state.day,passed:false,technicianId:j.technicianId});
      j.stage='in-progress';
      j.reworks=1;
      j.remainingDays=1;
      j.plannedDays+=1;
      j.startedDay=state.day;
      return ok('Quality check found further work on '+v.title+
        '. £'+cost+' rectification charged and one extra repair day required.');
    }
    (j.qcLog??=[]).push({day:state.day,passed:true,technicianId:j.technicianId});
    j.stage='ready';
    j.completedDay=state.day;
    j.remainingDays=0;
    j.paused=false;
    j.assistantId=null;
    v.prepSpent=j.repairCost;
    v.status='prepared';
    if(j.method==='internal')P.worked(state,j.technicianId);
    return ok(v.title+' passed final quality control. £'+j.repairCost+
      ' in repair costs recorded. It is now ready to advertise.');
  }
  function valid(vehicle,day,legacy=false){
    const j=vehicle.workshop;
    if(!j||typeof j!=='object'||Array.isArray(j))return false;
    const num=(v,upper=100000)=>integer(v)&&v>=0&&v<=upper;
    if(!stages.includes(j.stage)||!num(j.assessmentFee,200)||
       !num(j.repairCost)||!num(j.remainingDays,12)||!num(j.plannedDays,20)||
       !num(j.partsDelay,3)||!num(j.reworks,1)||
       typeof j.paused!=='boolean'||
       (j.startedDay!==null&&(!num(j.startedDay,36500)||j.startedDay>day))||
       (j.completedDay!==null&&(!num(j.completedDay,36500)||j.completedDay>day))||
       (j.technicianId!==null&&(!num(j.technicianId,100000)||j.technicianId===0))||
       (j.method!==null&&!methods.includes(j.method)))return false;
    // Optional fields preserve unmodified careers saved before dispatch existed.
    if(j.priority!==undefined&&!['normal','urgent'].includes(j.priority))return false;
    if(j.assistantId!==undefined&&j.assistantId!==null&&
      (!num(j.assistantId,100000)||j.assistantId===0||
        j.assistantId===j.technicianId||j.method!=='internal'||j.stage!=='in-progress'))return false;
    if(j.workLog!==undefined&&(!Array.isArray(j.workLog)||j.workLog.length>32||
      !j.workLog.every(x=>x&&num(x.day,36500)&&x.day>=1&&x.day<=day&&
        num(x.leadId,100000)&&x.leadId>=1&&
        (x.assistantId===null||(num(x.assistantId,100000)&&x.assistantId>=1&&x.assistantId!==x.leadId))&&
        [1,2].includes(x.progress))))return false;
    if(j.qcLog!==undefined&&(!Array.isArray(j.qcLog)||j.qcLog.length>4||
      !j.qcLog.every(x=>x&&num(x.day,36500)&&x.day>=1&&x.day<=day&&
        typeof x.passed==='boolean'&&
        (x.technicianId===null||(num(x.technicianId,100000)&&x.technicianId>=1)))))return false;
    if(vehicle.status==='acquired'&&j.stage==='ready')return false;
    if(vehicle.status!=='acquired'&&j.stage!=='ready')return false;
    if(j.stage==='unassessed'&&(j.assessmentFee!==0||j.repairCost!==0||j.method!==null))return false;
    if(j.stage==='quoted'&&(j.assessmentFee===0||j.repairCost!==0||j.method!==null))return false;
    if(['in-progress','quality-check'].includes(j.stage)&&
       (j.assessmentFee===0||!methods.includes(j.method)||j.repairCost<=0||
        j.startedDay===null||j.plannedDays<1))return false;
    if(j.stage==='quality-check'&&j.remainingDays!==0)return false;
    if(j.stage==='ready'&&(vehicle.prepSpent!==j.repairCost||
       j.completedDay===null))return false;
    if(j.stage!=='ready'&&vehicle.prepSpent!==0)return false;
    return true;
  }
  window.MotorTradeWorkshop=Object.freeze({
    initial,reservedCost,reserved,assess,quote,start,priority,reassign,assignAssistant,
    advance,transfer,quality,valid
  });
})();