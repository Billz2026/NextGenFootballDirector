'use strict';
/* Supervisor Operations — genuine delegated supplier purchases, workshop
 * bookings, inspections, quality control and retail listings.
 * All money/vehicles move ONLY through the existing game engine.
 */
(() => {
  const P=window.MotorTradePeople;
  const integer=Number.isSafeInteger;
  const cash=n=>integer(n)&&n>=0&&n<=100000000;
  const gbp=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
  const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const POLICIES=Object.freeze([
    {key:'protect',name:'PROTECT CASH',maxPurchase:6000,maxRepair:650,minMargin:1500,maxStock:2,
      note:'Fewer acquisitions, strict margin targets and more owner exceptions.'},
    {key:'balanced',name:'BALANCED OPERATIONS',maxPurchase:10000,maxRepair:1200,minMargin:1050,maxStock:3,
      note:'Moderate stock investment, controlled workshop spending and steady throughput.'},
    {key:'grow',name:'GROW INVENTORY',maxPurchase:20000,maxRepair:2100,minMargin:700,maxStock:5,
      note:'Faster buying and greater stock exposure; thinner expected margins and cash-flow risk.'}
  ]);
  const initial=()=>({enabled:true,maxPurchase:10000,maxRepair:1200,
    minMargin:1050,maxStock:3,lastDay:0,nextId:1,requests:[],history:[]});
  const clone=x=>JSON.parse(JSON.stringify(x));
  const reqRef=r=>'supervisor-ops:'+r.id;
  const requestFor=(state,id)=>(state.operations?.requests||[]).find(r=>r.id===id)||null;
  const requestForMessage=(state,m)=>(state.operations?.requests||[])
    .find(r=>m?.reference===reqRef(r))||null;
  const leader=state=>P.supervisor(state);
  const worker=state=>P.active(state,'buyer');
  const active=(state,r)=>{
    if(r.status!=='pending')return false;
    if(r.kind==='buy')return r.day===state.day&&
      !!window.MotorTradeEngine?.marketFor(state).sellers.find(x=>x.id===r.sellerId)&&
      !state.vehicles.some(v=>v.origin===r.sellerId);
    const v=state.vehicles.find(x=>x.id===r.vehicleId);
    return !!v&&v.status==='acquired'&&v.workshop?.stage==='quoted';
  };
  const pending=state=>(state.operations?.requests||[]).filter(r=>active(state,r));
  const protect=state=>{
    const wages=(state.staff||[]).reduce((n,s)=>n+Math.ceil(s.monthlySalary/30),0);
    const rent=window.MotorTradePremises?.costs(state)?.total||0;
    const reserved=window.MotorTradeWorkshop?.reserved(state)||0;
    return reserved+(state.payrollArrears||0)+(state.premises?.arrears||0)+
      (state.stockAgeingArrears||0)+14*(wages+rent);
  };
  function track(state,kind,vehicleId,amount,note){
    const h=state.operations.history;
    h.push({day:state.day,kind,vehicleId,amount:Math.max(0,amount),
      note:String(note).slice(0,170)});
    if(h.length>250)h.splice(0,h.length-250);
  }
  function close(state,r,status,message){
    r.status=status;r.resolvedDay=state.day;
    r.outcome=String(message).slice(0,170);
    const email=state.messages.find(m=>m.reference===reqRef(r));
    if(email&&['approved','declined'].includes(status))email.decision=status;
    track(state,status,r.vehicleId||0,r.amount,message);
  }
  function expire(state){
    for(const r of state.operations.requests){
      if(r.status==='pending'&&!active(state,r))
        close(state,r,'expired','Trade opportunity expired or vehicle status changed.');
    }
    const closed=state.operations.requests.filter(r=>r.status!=='pending');
    if(closed.length>80){
      const rem=new Set(closed.slice(0,closed.length-80));
      state.operations.requests=state.operations.requests.filter(r=>!rem.has(r));
    }
  }
  function propose(state,kind,payload){
    const existing=state.operations.requests.find(r=>r.status==='pending'&&r.kind===kind&&
      (kind==='buy'?r.sellerId===payload.sellerId:r.vehicleId===payload.vehicleId));
    if(existing)return existing;
    const supervisor=leader(state);
    if(!supervisor)return null;
    const r={id:'OP-'+state.operations.nextId++,kind,day:state.day,
      vehicleId:payload.vehicleId||0,sellerId:payload.sellerId||'',
      amount:payload.amount,method:payload.method||'',
      title:payload.title,margin:payload.margin||0,
      status:'pending',resolvedDay:null,outcome:''};
    state.operations.requests.push(r);
    const label=kind==='buy'?'BUYING APPROVAL':'WORKSHOP BUDGET APPROVAL';
    const reasons=kind==='buy'?
      'Supplier asking price '+gbp(r.amount)+
      ' · estimated gross margin before additional costs '+gbp(r.margin)+
      ' · staff purchase ceiling '+gbp(state.operations.maxPurchase)+
      ' · maximum stock '+state.operations.maxStock+'.':
      'Quoted '+r.method+' repair '+gbp(r.amount)+
      ' · delegated repair limit '+gbp(state.operations.maxRepair)+
      ' · existing workshop assessment already paid.';
    const info={
      from:'STAFF SUPERVISOR · '+supervisor.name,category:kind==='buy'?'operations':'operations',
      subject:'AUTHORISATION · '+label+' · '+r.title,
      preview:reasons,
      body:'The '+(kind==='buy'?'vehicle buyer':'workshop team')+
        ' has referred this exception for your authority.\n\nVEHICLE: '+r.title+
        '\n'+reasons+
        '\n\nApproving reruns the genuine purchase/repair validation at the time of your decision. '+
        'Insufficient money, an expired seller or an unavailable workshop prevents the transaction. '+
        'Declining spends nothing; delaying can lose an opportunity or extend stock holding costs.',
      linkPage:kind==='buy'?'auctions':'workshop',reference:reqRef(r)
    };
    if(window.MotorTradeInbox?.emit)window.MotorTradeInbox.emit(state,info);
    else state.messages.push({...info,id:state.messages.reduce((n,m)=>Math.max(n,m.id),0)+1,
      day:state.day,read:false});
    track(state,'proposal',r.vehicleId,r.amount,label+' from '+supervisor.name);
    return r;
  }
  function bestQuote(state,E,v){
    const internal=E.prepQuote(state,v.id,'internal');
    const external=E.prepQuote(state,v.id,'external');
    return [internal,external].filter(Boolean).sort((a,b)=>a.cost-b.cost||a.duration-b.duration)[0]||null;
  }
  function autoWorkshop(state,E){
    const notes=[],d=state.operations;
    if(!leader(state))return notes;
    for(const v of [...state.vehicles].sort((a,b)=>a.acquiredDay-b.acquiredDay||a.id-b.id)){
      if(v.status==='prepared'){
        const target=Math.round(Math.max(500,Math.min(75000,
          (v.profile?.likelySale||v.retail)*1.025))/25)*25;
        const result=E.advertise(state,v.id,target);
        if(result.ok){track(state,'listing',v.id,target,
          'Supervisor approved retail listing after passed quality control.');
          notes.push(v.title+' listed at '+gbp(target));}
        continue;
      }
      if(v.status!=='acquired')continue;
      if(v.workshop?.stage==='quality-check'){
        const result=E.finishPrep(state,v.id);
        if(result.ok){
          track(state,'quality',v.id,v.workshop.repairCost,
            'Technician performed genuine final quality control: '+result.message);
          notes.push(result.message);
        }
        continue;
      }
      if(v.workshop?.stage==='unassessed'){
        if(!P.active(state,'technician'))continue;
        if(state.cash<protect(state)+65)continue;
        const result=E.assessStock(state,v.id);
        if(result.ok){track(state,'assessment',v.id,v.workshop.assessmentFee,
          'Paid actual workshop assessment.');notes.push(result.message);}
      }
      if(v.workshop?.stage!=='quoted')continue;
      if(d.requests.some(r=>r.kind==='repair'&&r.vehicleId===v.id&&
        ['pending','declined'].includes(r.status)))continue;
      const quote=bestQuote(state,E,v);
      if(!quote)continue;
      if(quote.cost+170<=d.maxRepair&&
         state.cash>=protect(state)-v.prepBudget+quote.cost+170){
        const r=E.startPrep(state,v.id,quote.method,quote.technicianId);
        if(r.ok){track(state,'repair',v.id,quote.cost,'Supervisor authorised '+quote.method+
          ' repairs within delegated budget.');notes.push(r.message);}
      }else if(quote.cost+170>d.maxRepair){
        propose(state,'repair',{vehicleId:v.id,amount:quote.cost,method:quote.method,
          title:v.title});
      }
    }
    return notes;
  }
  function evaluate(state,E,c){
    const prep=c.profile?.basePrep+(c.profile?.hiddenFault?.cost||0);
    const cost=c.ask,margin=c.profile?.retail-cost-prep;
    if(!Number.isSafeInteger(cost)||!Number.isFinite(margin)||cost<=0)return null;
    const score=margin-Math.max(0,cost-12000)*.16;
    return {car:c,cost,prep,margin:Math.round(margin),score};
  }
  function autoBuy(state,E){
    const d=state.operations;
    if(!leader(state)||!worker(state))return null;
    if(state.vehicles.length>=Math.min(d.maxStock,window.MotorTradePremises?.storageLimit(state)||d.maxStock))
      return null;
    if(state.day%2===0)return null; // At most one sourcing cycle every second game day.
    const leads=E.marketFor(state).sellers
      .filter(c=>!state.vehicles.some(v=>v.origin===c.id)&&
        !state.negotiations?.[c.id]&&
        c.marketTier!=='new')
      .map(c=>evaluate(state,E,c)).filter(Boolean)
      .filter(o=>o.cost+o.prep+protect(state)<state.cash&&o.margin>300)
      .sort((a,b)=>b.score-a.score);
    const within=leads.filter(x=>x.cost<=d.maxPurchase&&
      x.margin>=d.minMargin);
    const selected=within[0]||leads[0];
    if(!selected)return null;
    if(!within.length){
      if(selected.margin>=d.minMargin||selected.cost<=d.maxPurchase)
        propose(state,'buy',{sellerId:selected.car.id,title:selected.car.title,
          amount:selected.cost,margin:selected.margin});
      return null;
    }
    const c=selected.car;
    const discount=Math.min(150,P.buyerDiscount(state));
    const offer=Math.max(100,c.ask-discount);
    const result=E.acquireSeller(state,c.id,offer);
    if(result.ok){
      track(state,'purchase',state.vehicles.at(-1).id,offer,
        'Buyer acquired '+c.title+' through genuine seller negotiation.');
      return result.message;
    }
    // The seller may counter or leave. That is an actual game outcome, not
    // a fictional acquisition; any counter remains in the Buying Desk.
    track(state,'attempt',0,offer,'Buyer attempted '+c.title+': '+result.message);
    return result.message;
  }
  function process(state,E){
    const d=state.operations;
    expire(state);
    if(!d.enabled||d.lastDay===state.day)
      return {processed:false,work:[],buy:null,pending:pending(state).length};
    d.lastDay=state.day;
    const work=autoWorkshop(state,E);
    const buy=autoBuy(state,E);
    return {processed:true,work,buy,pending:pending(state).length};
  }
  function decide(state,E,id,choice){
    expire(state);
    const r=requestFor(state,id);
    if(!r||!active(state,r))return {ok:false,message:'This approval request is no longer available.'};
    if(!['approved','declined'].includes(choice))
      return {ok:false,message:'Choose approve or decline.'};
    if(choice==='declined'){
      close(state,r,'declined','Dealer Principal declined '+r.title+
        '. No supplier or workshop payment was authorised.');
      return {ok:true,message:r.title+' declined. No cash charged. The vehicle may remain unsold or the supplier opportunity may disappear.'};
    }
    if(r.kind==='buy'){
      const seller=E.marketFor(state).sellers.find(c=>c.id===r.sellerId);
      if(!seller||seller.ask!==r.amount)
        return {ok:false,message:'The supplier price has changed. This approval is no longer valid.'};
      if(state.cash<protect(state)+seller.ask+
        seller.profile.basePrep+(seller.profile.hiddenFault?.cost||0))
        return {ok:false,message:'Insufficient cash after protecting wages, premises and workshop commitments.'};
      // Approval is permission, not a fictional purchase. Seller can still
      // counter, and the actual engine must confirm acquisition.
      const result=E.acquireSeller(state,seller.id,seller.ask);
      if(!result.ok)return result;
      close(state,r,'approved','Dealer Principal authorised genuine seller purchase '+seller.title+'.');
      track(state,'purchase',state.vehicles.at(-1).id,seller.ask,result.message);
      return {ok:true,message:'Purchase authorised. '+result.message};
    }
    const v=state.vehicles.find(x=>x.id===r.vehicleId);
    if(!v)return {ok:false,message:'Vehicle no longer belongs to this dealership.'};
    const quote=E.prepQuote(state,v.id,r.method);
    if(!quote)return {ok:false,message:'The quoted workshop provider is no longer available. Reassess availability in Workshop.'};
    if(quote.cost!==r.amount)return {ok:false,message:'Workshop price changed from '+gbp(r.amount)+' to '+gbp(quote.cost)+'. Review the new quote before authorising.'};
    const result=E.startPrep(state,v.id,r.method,quote.technicianId);
    if(!result.ok)return result;
    close(state,r,'approved','Dealer Principal authorised paid repair booking.');
    track(state,'repair',v.id,quote.cost,result.message);
    return {ok:true,message:'Repair approved. '+result.message};
  }
  function setMode(state,enabled){
    if(typeof enabled!=='boolean')return {ok:false,message:'Invalid delegation setting.'};
    state.operations.enabled=enabled;
    track(state,'policy',0,0,enabled?
      'Supervisor-led sourcing and preparation enabled.':'Owner elected hands-on sourcing and workshop operation.');
    return {ok:true,message:enabled?
      'The buyer and workshop will resume routine delegated tasks from the next game day.':
      'Buying and workshop delegation paused. Existing approval requests and booked jobs remain valid.'};
  }
  function setPolicy(state,key){
    const p=POLICIES.find(x=>x.key===key);
    if(!p)return {ok:false,message:'Invalid operating policy.'};
    Object.assign(state.operations,{maxPurchase:p.maxPurchase,maxRepair:p.maxRepair,
      minMargin:p.minMargin,maxStock:p.maxStock});
    track(state,'policy',0,0,p.name+' authorised by Dealer Principal.');
    return {ok:true,message:p.name+' selected. '+p.note+
      ' Existing pending approval amounts do not change.'};
  }
  function brief(state){
    const d=state.operations;const requests=pending(state);
    const today=d.history.filter(x=>x.day===state.day);
    const purchase=today.filter(x=>x.kind==='purchase').length;
    const repairs=today.filter(x=>x.kind==='repair'||x.kind==='quality').length;
    const selected=POLICIES.find(p=>p.maxPurchase===d.maxPurchase&&
      p.maxRepair===d.maxRepair);
    return '<details class="op-brief" aria-label="Supervisor operations dashboard">'+
      '<summary class="op-brief-head"><div><small>DEALER PRINCIPAL · PURCHASING AND WORKSHOP</small>'+
      '<h3>SUPERVISOR OPERATIONS · '+(d.enabled?'ACTIVE':'HANDS-ON')+'</h3>'+
      '<p>Manager-run buying and preparation · Click to review authority and operating results.</p></div>'+
      '<span>'+requests.length+' DECISIONS</span></summary><div class="op-expanded">'+
      '<div class="op-brief-metrics"><div><small>BUYER PURCHASES TODAY</small><strong>'+purchase+'</strong></div>'+
      '<div><small>REPAIR / QC JOBS TODAY</small><strong>'+repairs+'</strong></div>'+
      '<div><small>UNRESOLVED APPROVALS</small><strong>'+requests.length+'</strong></div></div>'+
      '<div class="op-brief-actions"><button type="button" data-page="inbox">OPEN APPROVALS</button>'+
      '<button type="button" data-action="ops-mode" data-enabled="'+(!d.enabled)+'">'+
      (d.enabled?'PAUSE AUTOMATION':'RESUME SUPERVISOR')+'</button></div>'+
      '<details class="op-brief-settings"><summary>ADJUST SUPERVISOR SPENDING POLICY · '+
      escape(selected?.name||'CUSTOM')+'</summary>'+
      '<div class="op-options">'+POLICIES.map(p=>{
        const chosen=p.key===selected?.key;
        return '<button type="button" data-action="ops-policy" data-policy="'+p.key+'" class="'+
          (chosen?'op-selected':'')+'"><strong>'+p.name+(chosen?' · ACTIVE':'')+'</strong>'+
          '<small>Buy up to '+gbp(p.maxPurchase)+' · repairs up to '+gbp(p.maxRepair)+
          ' incl. £170 QC contingency · expected margin '+gbp(p.minMargin)+
          ' · max '+p.maxStock+' cars</small><span>'+p.note+'</span></button>';
      }).join('')+'</div></details></div></details>';
  }
  function controls(state,message){
    const r=requestForMessage(state,message);
    if(!r)return '';
    if(!active(state,r))return '<div class="inbox-resolved">This supervisor request is no longer active or has already been decided.</div>';
    const title=r.kind==='buy'?'VEHICLE PURCHASE':'REPAIR APPROVAL';
    return '<section class="inbox-approval"><div class="inbox-approval-intro">'+
      '<strong>SUPERVISOR ESCALATION · '+title+'</strong>'+
      '<small>'+escape(r.title)+' · '+gbp(r.amount)+
      (r.kind==='buy'?' · estimated gross '+gbp(r.margin):' · '+escape(r.method)+' workshop')+
      '. Approval uses real cash and live stock availability; declining leaves the risk unresolved.</small>'+
      '</div><div class="inbox-approval-choices">'+
      '<button type="button" class="trade-button" data-action="ops-decision" data-id="'+r.id+
      '" data-decision="approved">APPROVE COST</button>'+
      '<button type="button" class="trade-button trade-button-outline" data-action="ops-decision" data-id="'+r.id+
      '" data-decision="declined">DECLINE REQUEST</button>'+
      '<button type="button" class="trade-button trade-button-secondary" data-page="'+
      (r.kind==='buy'?'auctions':'workshop')+'">REVIEW '+(r.kind==='buy'?'BUYING DESK':'WORKSHOP')+
      '</button></div></section>';
  }
  function managesRepair(state,car){
    return !!state.operations?.enabled&&!!leader(state)&&
      car.status==='acquired'&&car.workshop?.stage==='quoted';
  }
  function valid(d,state){
    if(!d||typeof d.enabled!=='boolean'||!cash(d.maxPurchase)||d.maxPurchase>100000||
      !cash(d.maxRepair)||d.maxRepair>20000||
      !cash(d.minMargin)||d.minMargin>10000||
      !integer(d.maxStock)||d.maxStock<1||d.maxStock>10||
      !integer(d.lastDay)||d.lastDay<0||d.lastDay>state.day||
      !integer(d.nextId)||d.nextId<1||d.nextId>1000000||
      !Array.isArray(d.requests)||d.requests.length>120||
      !Array.isArray(d.history)||d.history.length>250)return false;
    const seen=new Set();
    for(const r of d.requests){
      if(!r||!/^OP-[1-9]\d*$/.test(r.id)||seen.has(r.id)||
        Number(r.id.slice(3))>=d.nextId||
        !['buy','repair'].includes(r.kind)||!integer(r.day)||r.day<1||r.day>state.day||
        !integer(r.vehicleId)||r.vehicleId<0||
        typeof r.sellerId!=='string'||r.sellerId.length>70||
        !cash(r.amount)||!integer(r.margin)||r.margin<0||r.margin>100000||
        !['','internal','external'].includes(r.method)||
        typeof r.title!=='string'||r.title.length<2||r.title.length>100||
        !['pending','approved','declined','expired'].includes(r.status)||
        (r.status==='pending'?(r.resolvedDay!==null||r.outcome!==''):
          (!integer(r.resolvedDay)||r.resolvedDay<r.day||r.resolvedDay>state.day||
          typeof r.outcome!=='string'||r.outcome.length>170))||
        (r.kind==='buy'?(r.vehicleId!==0||!r.sellerId||r.method!==''):
          (r.vehicleId<=0||r.sellerId!==''||r.method===''))||
        (r.status==='pending'&&!state.messages.some(m=>m.reference===reqRef(r))))
        return false;
      seen.add(r.id);
    }
    return d.history.every(x=>x&&integer(x.day)&&x.day>=1&&x.day<=state.day&&
      ['proposal','purchase','attempt','assessment','repair','quality','listing',
        'policy','approved','declined','expired'].includes(x.kind)&&
      integer(x.vehicleId)&&x.vehicleId>=0&&cash(x.amount)&&
      typeof x.note==='string'&&x.note.length<=170);
  }
  window.MotorTradeOperations=Object.freeze({
    initial,clone,valid,POLICIES,process,decide,setMode,setPolicy,brief,controls,
    requestForMessage,pending,managesRepair,protect,expire
  });
})();