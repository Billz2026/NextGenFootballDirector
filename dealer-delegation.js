'use strict';
/* Dealer Principal / Sales Delegation v1.
 * An employee uses the SAME real showroom, objection, negotiation, agreement
 * and handover engine as the proprietor. No synthetic sales, cash or customers.
 * Financial exceptions wait for a genuine owner decision in the existing Inbox.
 */
(() => {
  const cap=(n,a,b)=>Math.max(a,Math.min(b,n));
  const num=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000;
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gbp=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
  const STATUSES=['pending','approved','declined','taken-over','expired'];
  const ACTIONS=['approved','declined','taken-over','counter','sale','lost','booked','viewed','exception','stalled'];
  const initial=()=>({enabled:true,maxDiscount:350,minGross:650,maxPartExchange:5000,
    lastRunDay:0,lastRunSession:0,approvals:[],audit:[]});
  const clone=d=>JSON.parse(JSON.stringify(d));
  const isOwner=c=>c?.salespersonId===null||c?.salespersonId===undefined;
  const messageId=c=>'sales-approval:'+c.id;
  const requestId=c=>'SA-'+c.id;
  const requestFor=(state,id)=>state.delegation?.approvals.find(x=>x.id===id)||null;
  const requestForMessage=(state,m)=>state.delegation?.approvals.find(x=>
    m?.reference==='sales-approval:'+x.customerId)||null;
  const current=(state,r)=>{
    const c=state.customerCases?.[String(r.vehicleId)];
    return r.status==='pending'&&r.day===state.day&&c?.id===r.customerId&&
      ['discussing','agreed'].includes(c.status)&&
      state.vehicles.some(v=>v.id===r.vehicleId&&v.status==='listed');
  };
  const pending=state=>(state.delegation?.approvals||[]).filter(r=>current(state,r));
  const log=(state,action,vehicleId,description,amount=0)=>{
    const d=state.delegation;
    d.audit.push({day:state.day,action,vehicleId,amount,
      note:String(description).slice(0,180)});
    if(d.audit.length>220)d.audit.splice(0,d.audit.length-220);
  };
  function authority(state,v,c,buyers){
    const d=state.delegation;
    const basis=v.cost+v.prepSpent+(c.remedyCost||0);
    const floor=Math.max(v.asking-d.maxDiscount,
      Math.ceil((basis+d.minGross)/25)*25);
    const isPX=c.preferredMode==='part-ex';
    const allowance=isPX?buyers.exchange?.floor??null:null;
    const offered=isPX?buyers.pxOffer:buyers.cashOffer;
    return {floor,basis,offered,isPX,allowance,
      exceedsPX:isPX&&(allowance===null||allowance>d.maxPartExchange)};
  }
  function close(state,req,status,why,amount=0){
    req.status=status;req.resolvedDay=state.day;
    req.outcome=String(why).slice(0,150);
    const m=state.messages.find(x=>x.reference===messageId({id:req.customerId}));
    if(m)m.decision=status==='taken-over'?'taken-over':
      status==='approved'?'approved':'declined';
    log(state,status==='approved'?'approved':status==='taken-over'?'taken-over':'declined',
      req.vehicleId,why,amount);
  }
  function expire(state){
    for(const r of state.delegation.approvals){
      if(r.status==='pending'&&!current(state,r)){
        close(state,r,'expired','Customer case expired or was handled outside the supervisor queue.');
      }
    }
    // Never discard live decisions; older resolved decisions are already
    // condensed into the audit trail and the existing Inbox.
    const resolved=state.delegation.approvals.filter(r=>r.status!=='pending');
    if(resolved.length>70){
      const removal=new Set(resolved.slice(0,resolved.length-70));
      state.delegation.approvals=state.delegation.approvals.filter(r=>!removal.has(r));
    }
  }
  function request(state,v,c,a){
    const existing=state.delegation.approvals.find(r=>r.customerId===c.id);
    if(existing)return existing;
    const supervisor=window.MotorTradePeople?.supervisor(state);
    if(!supervisor){
      // A dealership without active supervision cannot silently authorise
      // an out-of-policy deal. No non-existent supervisor emails are created.
      log(state,'stalled',v.id,'No active supervisor to authorise an exceptional offer.',a.offered);
      return null;
    }
    const r={id:requestId(c),vehicleId:v.id,customerId:c.id,day:state.day,
      salespersonId:c.salespersonId,offered:a.offered,floor:a.floor,
      allowance:a.allowance===null?0:a.allowance,isPX:a.isPX,
      status:'pending',resolvedDay:null,outcome:''};
    state.delegation.approvals.push(r);
    log(state,'exception',v.id,supervisor.name+' escalated an out-of-policy customer offer.',a.offered);
    const body='Salesperson '+(state.staff.find(x=>x.id===c.salespersonId)?.name||'on duty')+
      ' has handled the customer viewing, test drive and negotiation for '+v.title+'.\n\n'+
      'CUSTOMER: '+c.name+'\n'+
      'CURRENT BUYER OFFER: '+gbp(a.offered)+'\n'+
      'AUTHORISED PRICE FLOOR: '+gbp(a.floor)+'\n'+
      'VEHICLE ACQUISITION + PREP + COMMITTED CUSTOMER REMEDY: '+gbp(a.basis)+
      '\n'+(a.isPX?'PART-EXCHANGE TRADE ALLOWANCE: '+gbp(r.allowance)+'\n':'')+
      '\nThis is a live customer. Accepting below policy sacrifices margin; countering can lose the buyer; declining leaves the car in stock. No sale or cash transfer has occurred yet.';
    const mail={
      from:'STAFF SUPERVISOR · '+supervisor.name,category:'sales',
      subject:'DECISION REQUIRED · '+v.title+' customer offer',
      preview:'Offer '+gbp(a.offered)+' versus floor '+gbp(a.floor)+
        (a.exceedsPX?' · part-ex allowance above delegated limit':'')+'.',
      body,linkPage:'sales',reference:messageId(c)
    };
    if(window.MotorTradeInbox?.emit)window.MotorTradeInbox.emit(state,mail);
    else state.messages.push({...mail,id:state.messages.reduce((n,m)=>Math.max(n,m.id),0)+1,
      day:state.day,read:false});
    return r;
  }
  function finish(state,E,v,c,casePolicy){
    if(c.status==='agreed'||c.status==='collectable'){
      const outcome=E.completeSale(state,v.id,c.preferredMode,
        c.preferredMode==='part-ex'?c.allowance:null);
      if(outcome.ok)log(state,'sale',v.id,'Salesperson completed verified handover.',c.price);
      else log(state,'stalled',v.id,'Agreed deal not completed: '+outcome.message);
      return outcome;
    }
    const acceptance=E.agreeCustomer(state,v.id,c.preferredMode,
      casePolicy.isPX?casePolicy.allowance:null);
    if(!acceptance.ok){
      log(state,'stalled',v.id,'Failed customer agreement: '+acceptance.message);
      return acceptance;
    }
    const result=E.completeSale(state,v.id,c.preferredMode,
      casePolicy.isPX?casePolicy.allowance:null);
    if(result.ok)log(state,'sale',v.id,'Salesperson completed verified handover.',casePolicy.offered);
    else log(state,'stalled',v.id,'Agreement reached; collection failed: '+result.message);
    return result;
  }
  function step(state,E,c){
    const v=state.vehicles.find(x=>x.id===c.vehicleId&&x.status==='listed');
    if(!v||isOwner(c))return {done:false};
    const staff=window.MotorTradePeople?.activeTeam(state,'sales').find(s=>s.id===c.salespersonId);
    if(!staff)return {done:false};
    if(pending(state).some(r=>r.customerId===c.id))return {done:false};
    if(c.status==='enquiry'){
      const r=E.bookCustomer(state,v.id);
      if(r.ok)log(state,'booked',v.id,staff.name+' booked a customer viewing.');
      return {done:r.ok};
    }
    if(c.status==='booked'||c.status==='reserved')return {done:false};
    if(c.status==='arrived'){
      const r=E.testDrive(state,v.id);
      log(state,r.ok?'viewed':'lost',v.id,staff.name+' handled test drive: '+r.message.slice(0,100));
      if(!r.ok)return {done:true,lost:true};
    }
    if(c.status==='discussing'){
      if(c.objectionStatus==='pending'){
        let r=E.respondCustomer(state,v.id,'evidence');
        if(!r.ok&&c.status==='discussing'&&c.objectionStatus==='pending'){
          // Evidence can genuinely fail. The customer may walk away on
          // firm terms; no fabricated inspection or phantom warranty.
          r=E.respondCustomer(state,v.id,'hold');
        }
        if(c.status==='lost')return {done:true,lost:true};
        if(c.objectionStatus!=='resolved')return {done:false};
      }
      let buyers=E.buyers(v,state);
      if(!buyers)return {done:false};
      let a=authority(state,v,c,buyers);
      // A staff negotiator can attempt ONE reasonable counter within
      // delegated policy. The existing buyer engine decides acceptance.
      if(!a.isPX&&a.offered<a.floor&&buyers.cashLimit>=a.floor&&
        c.counters===0&&a.floor<v.asking){
        E.counter(state,v.id,a.floor);
        buyers=E.buyers(v,state);a=authority(state,v,c,buyers);
      }
      if(a.offered<a.floor||a.exceedsPX){
        return {done:true,escalated:!!request(state,v,c,a)};
      }
      const r=finish(state,E,v,c,a);
      return {done:r.ok,completed:r.ok};
    }
    if(['agreed','collectable'].includes(c.status)){
      const b=E.buyers(v,state);
      if(!b)return {done:false};
      const a=authority(state,v,c,b);
      const r=finish(state,E,v,c,a);
      return {done:r.ok,completed:r.ok};
    }
    return {done:false};
  }
  function process(state,E){
    const d=state.delegation;
    expire(state);
    const session=state.deadlineSession||0;
    if(!d.enabled||d.lastRunDay===state.day&&d.lastRunSession===session)
      return {ok:true,processed:false,served:0,completed:0,lost:0,escalated:0};
    d.lastRunDay=state.day;d.lastRunSession=session;
    const stats={ok:true,processed:true,served:0,completed:0,lost:0,escalated:0};
    // Existing booked appointments get a fair chance to progress first.
    for(const c of [...Object.values(state.customerCases||{})]){
      const r=step(state,E,c);
      if(r.completed)stats.completed++;
      if(r.lost)stats.lost++;
      if(r.escalated)stats.escalated++;
    }
    const candidates=[...E.showroom.waiting(state)];
    for(const q of candidates){
      const rep=E.showroom.availableStaff(state)[0];
      if(!rep)break;
      const served=E.welcomeShowroom(state,q.id,rep.id);
      if(!served.ok)continue;
      stats.served++;
      const c=state.customerCases[String(q.vehicleId)];
      const r=step(state,E,c);
      if(r.completed)stats.completed++;
      if(r.lost)stats.lost++;
      if(r.escalated)stats.escalated++;
    }
    return stats;
  }
  function decide(state,E,id,action){
    expire(state);
    const req=requestFor(state,id);
    if(!req||!current(state,req))return {ok:false,message:'That supervisor request is no longer active.'};
    const c=state.customerCases[String(req.vehicleId)];
    const v=state.vehicles.find(x=>x.id===req.vehicleId);
    if(!c||!v)return {ok:false,message:'The original customer or stock is no longer available.'};
    if(action==='taken-over'){
      c.salespersonId=null;
      close(state,req,'taken-over','Dealer Principal took over '+v.title+' customer negotiation.');
      return {ok:true,message:'You have taken over the customer case. Continue negotiations in Sales Office before moving to the next game day.'};
    }
    if(action==='declined'){
      const result=E.cancelCustomer(state,v.id,'dealer');
      if(!result.ok)return result;
      close(state,req,'declined','Owner declined the live buyer offer.',req.offered);
      return {ok:true,message:'You declined the offer. The customer has left and '+v.title+' remains in stock. Holding costs continue.'};
    }
    if(action==='counter'){
      if(req.isPX)return {ok:false,message:'Part-exchange deals require approval, refusal or personal takeover; the standard cash counter engine cannot revalue a part-exchange.'};
      const b=E.buyers(v,state);
      if(!b||c.counters>=5)return {ok:false,message:'There are no negotiation rounds remaining. Approve, decline or take over.'};
      const floor=Math.max(req.floor,b.cashOffer+25);
      const proposal=Math.min(v.asking-25,Math.ceil(floor/25)*25);
      if(proposal<=b.cashOffer)return {ok:false,message:'The customer has no room for a higher counteroffer.'};
      const r=E.counter(state,v.id,proposal);
      const latest=E.buyers(v,state);
      req.offered=latest?.cashOffer??req.offered;
      log(state,'counter',v.id,'Owner requested '+gbp(proposal)+'; buyer now offering '+gbp(req.offered)+'.',req.offered);
      if(latest&&req.offered>=req.floor){
        const a=authority(state,v,c,latest);
        const sale=finish(state,E,v,c,a);
        if(sale.ok){
          close(state,req,'approved','Owner counteroffer accepted and customer handover completed.',req.offered);
          return {ok:true,message:'Counteroffer succeeded. '+sale.message};
        }
      }
      return {ok:true,message:'Counter discussed. '+r.message+
        ' Offer now '+gbp(req.offered)+'. The request remains open until you approve, decline or take over.'};
    }
    if(action==='approved'){
      const buyers=E.buyers(v,state);
      if(!buyers)return {ok:false,message:'Buyer no longer available.'};
      const a=authority(state,v,c,buyers);
      if(a.offered!==req.offered)return {ok:false,message:'The offer has changed. Review the current figures before approval.'};
      const result=finish(state,E,v,c,a);
      if(!result.ok)return result;
      close(state,req,'approved','Owner authorised exception and verified sale completed.',a.offered);
      return {ok:true,message:'Owner approval recorded. '+result.message};
    }
    return {ok:false,message:'Unknown management decision.'};
  }
  function takeOver(state,E,vehicleId){
    const c=state.customerCases[String(vehicleId)];
    if(!c||isOwner(c)||!['enquiry','booked','arrived','discussing','agreed','collectable'].includes(c.status))
      return {ok:false,message:'No active staff-owned customer case to take over.'};
    const approval=state.delegation.approvals.find(r=>r.customerId===c.id&&r.status==='pending');
    if(approval)return decide(state,E,approval.id,'taken-over');
    c.salespersonId=null;
    log(state,'taken-over',vehicleId,'Dealer Principal intervened in a staff-led customer case.');
    return {ok:true,message:'You now control this customer case. Continue in Sales Office; salesperson commission will not be awarded on a personally completed deal.'};
  }
  function setMode(state,enabled){
    if(typeof enabled!=='boolean')return {ok:false,message:'Invalid management mode.'};
    state.delegation.enabled=enabled;
    log(state,'stalled',0,enabled?'Owner enabled staff-led sales.':'Owner switched to hands-on retail management.');
    return {ok:true,message:enabled?'Your active sales team will handle routine retail customers when you advance the trading session.':'Hands-on retail mode selected. You must handle customers or assign them manually. Existing supervisor decisions still require action.'};
  }
  function controls(state,message){
    const r=requestForMessage(state,message);
    if(!r)return '';
    if(!current(state,r))return '<div class="inbox-resolved">This customer decision is no longer pending. Review the recorded decision in Sales Office.</div>';
    const car=state.vehicles.find(v=>v.id===r.vehicleId);
    const customer=state.customerCases[String(r.vehicleId)];
    return '<section class="inbox-approval"><div class="inbox-approval-intro">'+
      '<strong>DEALER PRINCIPAL AUTHORISATION · '+esc(car.title)+'</strong>'+
      '<small>Customer '+esc(customer.name)+' · Current offer '+gbp(r.offered)+
      ' · Staff floor '+gbp(r.floor)+
      (r.isPX?' · Part-ex allowance '+gbp(r.allowance):'')+
      '. No money changes hands until an actual handover.</small></div>'+
      '<div class="inbox-approval-choices">'+
      [['approved','APPROVE OFFER'],['counter','COUNTER BUYER'],['declined','REJECT OFFER'],['taken-over','TAKE OVER PERSONALLY']].map(([a,label])=>
        '<button type="button" class="trade-button'+(a==='approved'?'':' trade-button-outline')+
        '" data-action="delegate-decision" data-id="'+esc(r.id)+'" data-decision="'+a+'"'+
        (r.isPX&&a==='counter'?' disabled':'')+'>'+label+'</button>').join('')+
      '</div></section>';
  }
  function brief(state){
    const d=state.delegation,open=pending(state).length;
    const today=d.audit.filter(x=>x.day===state.day);
    const sales=today.filter(x=>x.action==='sale').length;
    const missed=today.filter(x=>x.action==='lost').length;
    return '<section class="dp-brief" aria-label="Dealer Principal daily delegation summary">'+
      '<div class="dp-head"><div><small>DEALER PRINCIPAL / RETAIL OPERATIONS</small>'+
      '<h3>YOUR SALES TEAM IS '+(d.enabled?'ON DUTY':'AWAITING YOUR INSTRUCTIONS')+'</h3>'+
      '<p>Staff use the existing real customer journey. You intervene on out-of-policy decisions.</p>'+
      '</div><span class="dp-mode">'+(d.enabled?'STAFF-LED':'HANDS-ON')+'</span></div>'+
      '<div class="dp-stats"><div><small>DECISIONS PENDING</small><strong>'+open+'</strong></div>'+
      '<div><small>STAFF HANDOVERS TODAY</small><strong>'+sales+'</strong></div>'+
      '<div><small>CUSTOMERS LOST TODAY</small><strong>'+missed+'</strong></div></div>'+
      '<div class="dp-actions"><button type="button" data-page="inbox">VIEW SUPERVISOR DECISIONS ↗</button>'+
      '<button type="button" data-action="delegate-mode" data-enabled="'+(!d.enabled)+'">'+
      (d.enabled?'SWITCH TO HANDS-ON':'RESTORE STAFF-LED SALES')+'</button></div>'+
      '<small class="dp-rules">Staff authority: maximum '+gbp(d.maxDiscount)+
      ' discount from asking, minimum '+gbp(d.minGross)+' gross margin, and part-exchange '+
      'allowance up to '+gbp(d.maxPartExchange)+
      '. Expensive or weak-margin deals require supervisor approval. No sale is guaranteed.</small></section>';
  }
  function valid(d,state){
    if(!d||typeof d.enabled!=='boolean'||!num(d.maxDiscount)||
      d.maxDiscount>3000||!num(d.minGross)||d.minGross>5000||
      !num(d.maxPartExchange)||d.maxPartExchange>25000||
      !num(d.lastRunDay)||d.lastRunDay>state.day||
      !num(d.lastRunSession)||d.lastRunSession>4||
      !Array.isArray(d.approvals)||d.approvals.length>120||
      !Array.isArray(d.audit)||d.audit.length>220)return false;
    const seen=new Set();
    for(const r of d.approvals){
      if(!r||!/^SA-C-\d+-\d+-\d+-\d+$/.test(r.id)||seen.has(r.id)||
        r.id!=='SA-'+r.customerId||!num(r.vehicleId)||r.vehicleId<=0||
        !num(r.day)||r.day<1||r.day>state.day||
        !num(r.salespersonId)||r.salespersonId<=0||
        !num(r.offered)||!num(r.floor)||!num(r.allowance)||
        typeof r.isPX!=='boolean'||!STATUSES.includes(r.status)||
        (r.status==='pending'?(r.resolvedDay!==null||r.outcome!==''):
          (!num(r.resolvedDay)||r.resolvedDay<r.day||r.resolvedDay>state.day||
            typeof r.outcome!=='string'||r.outcome.length>150))||
        !state.messages.some(m=>m.reference==='sales-approval:'+r.customerId))return false;
      seen.add(r.id);
    }
    return d.audit.every(r=>r&&num(r.day)&&r.day>=1&&r.day<=state.day&&
      ACTIONS.includes(r.action)&&num(r.vehicleId)&&
      Number.isSafeInteger(r.amount)&&r.amount>=0&&r.amount<=1000000&&
      typeof r.note==='string'&&r.note.length<=180);
  }
  window.MotorTradeDelegation=Object.freeze({
    initial,clone,valid,process,decide,takeOver,setMode,controls,brief,pending,
    requestForMessage,authority,expire
  });
})();