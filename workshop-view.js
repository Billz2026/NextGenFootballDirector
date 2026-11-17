'use strict';
/* v0.9.20 — Compact Workshop job desk. All actions use existing engine rules. */
(() => {
  const VC=window.MotorTradeCards, P=window.MotorTradePeople;
  if(!VC||!P)throw Error('Load cards and people before workshop view');
  const esc=VC.esc, cash=VC.money;
  const FILTERS=Object.freeze(['all','action','repair','ready','listed']);
  const stages=['unassessed','quoted','in-progress','quality-check','ready'];
  const labels={unassessed:'ASSESSMENT DUE',quoted:'REPAIR APPROVAL DUE',
    'in-progress':'REPAIRS IN PROGRESS','quality-check':'QUALITY CHECK DUE',ready:'RETAIL READY'};
  const needs=v=>v.status==='acquired'&&
    ['unassessed','quoted','quality-check'].includes(v.workshop?.stage);
  const age=(s,v)=>Math.max(0,s.day-v.acquiredDay);
  function paid(v){return ['in-progress','quality-check'].includes(v.workshop?.stage)?
    Number(v.workshop.repairCost||0):Number(v.prepSpent||0);}
  function summary(s,W){
    const cars=s.vehicles;
    return {count:cars.length,action:cars.filter(needs).length,
      repair:cars.filter(v=>v.workshop?.stage==='in-progress').length,
      qc:cars.filter(v=>v.workshop?.stage==='quality-check').length,
      urgent:cars.filter(v=>v.status==='acquired'&&v.workshop?.priority==='urgent').length,
      ready:cars.filter(v=>v.status==='prepared'&&v.workshop?.stage==='ready').length,
      listed:cars.filter(v=>v.status==='listed'&&v.workshop?.stage==='ready').length,
      reserve:W.reserved(s),
      tech:P.activeTeam(s,'technician').length,
      free:P.availableTechnicians(s).length,
      bays:window.MotorTradePremises?.bays(s)??4,
      assistants:P.availableTechnicians(s).filter(t=>t.skills.efficiency>=12).length,
      supervisor:P.supervisorProfile(s),
      inHouse:cars.filter(v=>['in-progress','quality-check'].includes(v.workshop?.stage)&&v.workshop.method==='internal').length,
      external:cars.filter(v=>v.workshop?.stage==='in-progress'&&v.workshop.method==='external').length};
  }
  function status(v){
    const stage=v.workshop?.stage||'unassessed';
    if(stage==='ready'&&v.status==='listed')return {label:'ON SALE',tone:'listed'};
    if(stage==='ready'&&v.status==='prepared')return {label:'READY TO ADVERTISE',tone:'ready'};
    return {label:stage==='in-progress'&&v.workshop.paused?'REPAIRS PAUSED':labels[stage]||'CHECK STATUS',
      tone:stage==='ready'?'ready':stage==='in-progress'?'running':needs(v)?'due':'pending'};
  }
  function unit(s,v,selected){
    const k=status(v);
    return '<article class="ws-unit'+(selected?' ws-selected':'')+'">'+
      '<div class="ws-thumb">'+VC.photo(v,'workshop')+'</div>'+
      '<button type="button" class="ws-pick" data-action="select-workshop" data-id="'+v.id+
      '" aria-pressed="'+selected+'"><small>STOCK '+v.id+' · '+esc(v.source.toUpperCase())+
      '</small><strong>'+esc(v.title)+'</strong>'+
      '<span>'+new Intl.NumberFormat('en-GB').format(v.miles)+' MI · '+age(s,v)+' DAYS HELD</span>'+
      '<em class="ws-status ws-status-'+k.tone+(v.workshop?.stage==='in-progress'&&v.workshop?.paused?' ws-status-paused':'')+'">'+k.label+'</em>'+
      (v.workshop?.priority==='urgent'&&v.status==='acquired'?'<b class="ws-urgent-tag">URGENT</b>':'')+
      '</button></article>';
  }
  function steps(v){
    const current=Math.max(0,stages.indexOf(v.workshop?.stage));
    return '<div class="ws-steps">'+['ASSESS','APPROVE','REPAIR','QC','READY'].map((x,i)=>
      '<span class="'+(i<current?'done':i===current?'current':'')+'">'+x+'</span>').join('')+'</div>';
  }
  function items(v){
    const p=v.profile||{};
    const seen=v.workshop.stage!=='unassessed'||!!p.inspected;
    const rows=(p.knownRepairs||[]).map(x=>'<div class="ws-repair"><span>'+
      esc(x.item)+'</span><strong>'+cash(x.cost)+'</strong></div>').join('');
    const extra=seen&&p.hiddenFault?
      '<div class="ws-repair ws-fault"><span>'+esc(p.hiddenFault.item)+
      ' · diagnosed defect</span><strong>'+cash(p.hiddenFault.cost)+'</strong></div>':'';
    return '<section><h4>REPAIR REQUIREMENTS</h4>'+rows+extra+
      (!rows?'<p>No itemised information available.</p>':'')+
      (!seen?'<p class="ws-caveat">Further defects may be identified at assessment.</p>':'')+'</section>';
  }
  function costs(v){
    const job=v.workshop;
    const diagnosed=job.stage!=='unassessed'||!!v.profile?.inspected;
    const spent=paid(v),hasBooking=['in-progress','quality-check','ready'].includes(job.stage);
    const difference=hasBooking?spent-v.prepBudget:0;
    // The legacy save records the total booked repair charge, not an itemised
    // adjustment history. Only label a difference as labour saving while the
    // job remains in-house and has no paid QC rectification.
    const confirmedSaving=hasBooking&&job.method==='internal'&&job.reworks===0&&difference<0;
    const variance=hasBooking&&difference!==0?
      '<div class="ws-cost-variance"><span>'+
      (confirmedSaving?'IN-HOUSE LABOUR SAVING':'REPAIR COST ADJUSTMENT')+
      '</span><strong>'+(difference<0?'−':'+')+cash(Math.abs(difference))+'</strong></div>':'';
    const explanation=variance?
      '<p class="ws-cost-explain">'+(confirmedSaving?
        'The in-house booking costs less than the diagnosed repair budget due to technician labour savings.':
        'Booked repair totals can differ from the diagnosed budget because of provider pricing, transfer fees or paid QC rectification.')+
      '</p>':'';
    return '<div class="ws-costs">'+
      '<div><span>ACQUISITION / ASSESSMENT PAID</span><strong>'+cash(v.cost)+'</strong></div>'+
      '<div><span>DIAGNOSED REPAIR REQUIREMENT</span><strong>'+
      (diagnosed?cash(v.prepBudget):'NOT YET ASSESSED')+'</strong></div>'+
      variance+
      '<div><span>REPAIRS PAID / BOOKED</span><strong>'+cash(spent)+'</strong></div>'+
      '<div class="ws-cost-total"><span>CAPITAL INVESTED</span><strong>'+cash(v.cost+spent)+'</strong></div>'+
      '</div>'+explanation;
  }
  function quote(s,W,v,mode,leadId=null){
    const q=W.quote(s,v,mode,mode==='internal'?leadId:null);
    const occupied=mode==='external'&&s.vehicles.filter(x=>x.id!==v.id&&
      x.workshop?.stage==='in-progress'&&x.workshop.method==='external').length>=2;
    const cannot=!q||occupied||q.cost>s.cash-W.reserved(s,v.id);
    const reason=!q?'No free technician or bay':occupied?'Both external slots occupied':
      q.cost>s.cash-W.reserved(s,v.id)?'Insufficient unreserved cash':'';
    return '<div class="ws-quote"><div class="ws-quote-head"><strong>'+
      (mode==='internal'?'IN-HOUSE TECHNICIAN':'EXTERNAL GARAGE')+'</strong><b>'+
      (q?cash(q.cost):'UNAVAILABLE')+'</b></div>'+
      (q?'<span>'+q.duration+' DAYS · '+q.partsDelay+' PARTS-WAIT DAYS</span><small>'+
        esc(q.provider)+'</small>'+
        (q.saving>0?'<small class="ws-savings">IN-HOUSE LABOUR SAVING '+cash(q.saving)+'</small>':'')+
        (q.supervisorDays?'<small>SUPERVISOR COORDINATION: ONE PLANNED REPAIR DAY SAVED</small>':'')+
        (q.supplement>0?'<small>EXTERNAL GARAGE UPLIFT '+cash(q.supplement)+'</small>':''):'')+
      (cannot?'<p class="ws-issue">'+esc(reason)+'</p>':'')+
      '<button type="button" class="trade-button" data-action="start-workshop" data-id="'+v.id+
      '" data-method="'+mode+'" data-tech="'+(q?.technicianId??0)+'"'+(cannot?' disabled':'')+'>BOOK '+
      (mode==='internal'?'IN-HOUSE':'EXTERNAL')+' REPAIR</button></div>';
  }
  function priorityControls(v){
    const urgent=v.workshop?.priority==='urgent';
    return '<div class="ws-priority-control"><div><strong>JOB PRIORITY</strong>'+
      '<small>Queue order only — staff allocation determines speed</small></div>'+
      '<div class="ws-priority-buttons">'+['normal','urgent'].map(value=>
        '<button type="button" data-action="priority-workshop" data-id="'+v.id+
        '" data-priority="'+value+'" aria-pressed="'+(value===(urgent?'urgent':'normal'))+'">'+
        value.toUpperCase()+'</button>').join('')+'</div></div>';
  }
  function leadChooser(s,v,leadChoice){
    const available=P.availableTechnicians(s);
    const chosen=available.find(x=>x.id===leadChoice)||available[0]||null;
    return '<div class="ws-dispatch-panel"><div class="ws-dispatch-head">'+
      '<strong>DISPATCH / ASSIGN LEAD TECHNICIAN</strong><small>'+
      available.length+' AVAILABLE</small></div>'+
      (available.length?'<div class="ws-dispatch-choices">'+available.map(t=>
        '<button type="button" data-action="choose-workshop-tech" data-id="'+v.id+
        '" data-tech="'+t.id+'" aria-pressed="'+(t.id===chosen.id)+'">'+
        '<strong>'+esc(t.name)+'</strong><small>EFFICIENCY '+t.skills.efficiency+
        ' / RELIABILITY '+t.skills.reliability+'</small></button>').join('')+'</div>':
        '<p class="ws-dispatch-note">No unassigned technician available. Hire, release or reassign staff, or use an external garage.</p>')+
      '<p class="ws-dispatch-note">Internal repair estimates use your selected technician’s skills and labour saving.</p></div>';
  }
  function activeDispatch(s,v){
    const j=v.workshop;
    const lead=s.staff.find(x=>x.id===j.technicianId);
    const helper=s.staff.find(x=>x.id===j.assistantId);
    const free=P.availableTechnicians(s);
    const otherLeads=free.filter(x=>x.id!==j.technicianId);
    const eligible=free.filter(x=>x.skills.efficiency>=12&&x.id!==j.technicianId);
    const activeHelper=helper&&P.isActive(s,helper);
    return '<div class="ws-dispatch-panel">'+
      '<div class="ws-dispatch-head"><strong>ACTIVE JOB DISPATCH</strong><small>'+
      (j.paused||!P.isActive(s,lead)?'LEAD UNAVAILABLE':'MANUAL CONTROL')+'</small></div>'+
      '<div class="ws-dispatch-assignments"><div><small>LEAD TECHNICIAN</small><strong>'+
      esc(lead?.name||'Unassigned')+'</strong><span>'+
      (P.isActive(s,lead)?'ON DUTY':'UNAVAILABLE / REASSIGN')+'</span></div>'+
      '<div><small>ASSISTANT</small><strong>'+esc(helper?.name||'Not assigned')+'</strong><span>'+
      (helper?(activeHelper?'ON DUTY':'UNAVAILABLE'):'OPTIONAL · EFFICIENCY 12+')+'</span></div></div>'+
      '<details class="ws-dispatch-options"'+(j.paused?' open':'')+'><summary>REASSIGN LEAD</summary>'+
      '<div class="ws-dispatch-choices">'+(otherLeads.length?otherLeads.map(t=>
        '<button type="button" data-action="reassign-workshop" data-id="'+v.id+
        '" data-tech="'+t.id+'"><strong>'+esc(t.name)+'</strong>'+
        '<small>EFFICIENCY '+t.skills.efficiency+'</small></button>').join(''):
        '<span class="ws-dispatch-note">No other technician available.</span>')+'</div></details>'+
      '<details class="ws-dispatch-options"><summary>ASSIGN / CHANGE ASSISTANT</summary>'+
      '<div class="ws-dispatch-choices">'+
      (helper?'<button type="button" data-action="assist-workshop" data-id="'+v.id+
        '" data-tech="0"><strong>RELEASE ASSISTANT</strong><small>Free this technician</small></button>':'')+
      (eligible.length?eligible.map(t=>
        '<button type="button" data-action="assist-workshop" data-id="'+v.id+
        '" data-tech="'+t.id+'"><strong>'+esc(t.name)+'</strong>'+
        '<small>EFFICIENCY '+t.skills.efficiency+'</small></button>').join(''):
        '<span class="ws-dispatch-note">No qualified free assistant. Efficiency 12+ required.</span>')+
      '</div></details><p class="ws-dispatch-note">An active assistant adds up to one extra repair day of progress per shift. An unavailable assistant provides no speed bonus.</p></div>';
  }
  function actions(s,W,v,leadChoice=null){
    const j=v.workshop,phase=j.stage;
    if(phase==='unassessed'){
      const fee=P.active(s,'technician')?30:55;
      const can=s.cash>=W.reserved(s)+fee;
      return '<div class="ws-action"><h4>NEXT / ASSESS VEHICLE</h4>'+
        '<p>Confirm the repair requirement. The assessment costs '+cash(fee)+
        ' and is added to the acquisition cost.</p>'+
        (!can?'<p class="ws-issue">Insufficient unreserved cash for assessment.</p>':'')+
        '<button type="button" class="trade-button" data-action="assess-workshop" data-id="'+v.id+
        '"'+(!can?' disabled':'')+'>AUTHORISE ASSESSMENT · '+cash(fee)+'</button></div>';
    }
    if(phase==='quoted'){
      const active=P.availableTechnicians(s);
      const chosen=active.find(x=>x.id===leadChoice)||active[0]||null;
      return '<div class="ws-action"><h4>NEXT / APPROVE REPAIRS</h4>'+priorityControls(v)+
        '<p>Assign the lead technician before booking. Internal and external costs are charged immediately.</p>'+
        leadChooser(s,v,chosen?.id??null)+
        '<div class="ws-quotes">'+quote(s,W,v,'internal',chosen?.id??null)+
          quote(s,W,v,'external')+'</div></div>';
    }
    if(phase==='in-progress'){
      const provider=j.method==='internal'?
        (s.staff.find(x=>x.id===j.technicianId)?.name||'Technician unavailable'):
        'Independent external garage';
      return '<div class="ws-action"><h4>'+ (j.paused?'REPAIRS PAUSED':'REPAIRS BOOKED') +'</h4>'+
        '<div class="ws-progress"><div><small>PROVIDER</small><strong>'+esc(provider)+'</strong></div>'+
        '<div><small>REMAINING</small><strong>'+j.remainingDays+' GAME DAYS</strong></div>'+
        '<div><small>CHARGED</small><strong>'+cash(j.repairCost)+'</strong></div></div>'+
        '<p>'+(j.paused?'Lead technician unavailable. Reassign the job, return the technician to duty or transfer externally.':
          'Advance game days for repairs to finish. Quality control is mandatory afterward.')+'</p>'+
        priorityControls(v)+activeDispatch(s,v)+
        (j.method==='internal'?(()=>{
          const outside=s.vehicles.filter(x=>x.id!==v.id&&
            x.workshop?.stage==='in-progress'&&x.workshop.method==='external').length;
          const full=outside>=2,affordable=s.cash>=W.reserved(s)+125;
          return (full?'<p class="ws-issue">EXTERNAL GARAGES FULL (2/2). WAIT FOR A SLOT.</p>':'')+
            (!full&&!affordable?'<p class="ws-issue">INSUFFICIENT UNRESERVED CASH FOR £125 TRANSFER.</p>':'')+
            '<button type="button" class="trade-button trade-button-secondary" '+
            'data-action="outsource-workshop" data-id="'+v.id+'"'+
            (full||!affordable?' disabled':'')+'>TRANSFER TO EXTERNAL GARAGE · £125</button>';
        })():'')+'</div>';
    }
    if(phase==='quality-check')return '<div class="ws-action"><h4>NEXT / FINAL QUALITY CHECK</h4>'+
      '<p>Repairs are complete. QC must pass before advertising; failure may require another paid repair day.</p>'+
      '<button type="button" class="trade-button" data-action="finish-workshop" data-id="'+v.id+
      '">PERFORM FINAL QUALITY CHECK</button></div>';
    if(v.status==='listed')return '<div class="ws-action ws-ready"><h4>QC PASSED / ON SALE</h4>'+
      '<p>Quality control passed on day '+(j.completedDay??'—')+'. This vehicle is already advertised. Handle customer interest in the Sales Office.</p>'+
      '<button type="button" class="trade-button" data-page="sales" data-id="'+v.id+
      '">OPEN SALES OFFICE</button></div>';
    return '<div class="ws-action ws-ready"><h4>QC PASSED / READY TO ADVERTISE</h4>'+
      '<p>Completed on day '+(j.completedDay??'—')+'. Repairs charged '+cash(v.prepSpent)+
      '. Set an asking price in Vehicle Stock.</p>'+
      '<button type="button" class="trade-button" data-page="stock" data-id="'+v.id+
      '">VIEW VEHICLE STOCK</button></div>';
  }
  function disposal(v){
    if(v.status!=='acquired'||!['unassessed','quoted'].includes(v.workshop.stage))return '';
    const bid=window.MotorTradeEngine.wholesaleOffer(v);
    return '<details class="ws-disposal"><summary>TRADE DISPOSAL / CUT LOSSES</summary>'+
      '<p>Fictional trade offer '+cash(bid)+'. Selling now frees a space but can realise a loss.</p>'+
      '<button class="trade-button trade-button-outline" type="button" data-action="dispose-workshop" data-id="'+
      v.id+'">SELL TO TRADE · '+cash(bid)+'</button></details>';
  }
  function dossier(s,W,v,leadChoice=null){
    const k=status(v);
    return '<article class="ws-file"><div class="ws-file-head"><div><small>WORK ORDER · STOCK '+v.id+
      '</small><h3>'+esc(v.title)+'</h3></div><span class="ws-status ws-status-'+k.tone+(v.workshop?.stage==='in-progress'&&v.workshop?.paused?' ws-status-paused':'')+'">'+k.label+
      '</span></div>'+steps(v)+
      '<div class="ws-detail"><div class="ws-detail-car">'+
      '<div class="ws-vehicle"><div class="ws-photo">'+VC.photo(v,'workshop')+'</div>'+
      '<div><small>GRADE '+esc(v.profile?.grade??'—')+' · '+esc(v.fuel)+' · '+esc(v.gearbox)+
      '</small><strong>'+new Intl.NumberFormat('en-GB').format(v.miles)+' MI</strong>'+
      '<span>'+age(s,v)+' DAYS HELD · '+esc(v.color||'UNKNOWN COLOUR')+'</span></div></div>'+
      items(v)+'<p class="ws-caveat">Simulated assessment and QC are not a real MOT or roadworthiness certificate.</p>'+
      '</div><div class="ws-detail-control">'+actions(s,W,v,leadChoice)+
      '<div class="ws-quick-cost"><span>CAPITAL INVESTED TO DATE</span>'+
        '<strong>'+cash(v.cost+paid(v))+'</strong></div>'+
      '<details class="ws-finance-details"><summary>COST CONTROL · FULL BREAKDOWN</summary>'+
        costs(v)+'</details>'+disposal(v)+'</div></div></article>';
  }
  function render(s,W,{filter='all',selectedId=null,leadChoice=null}={}){
    const q=summary(s,W),f=FILTERS.includes(filter)?filter:'all';
    // Stage counts remain in the filter tabs; show the three core operating
    // totals here without replicating the register's counts.
    const kpi='<div class="ws-kpis">'+[
      ['ACTION DUE',q.action],['REPAIRS ACTIVE',q.repair],
      ['READY TO LIST',q.ready]
    ].map(([name,num])=>'<div class="'+(name==='ACTION DUE'&&num>0?'ws-kpi-attention':name==='READY TO LIST'&&num>0?'ws-kpi-positive':'ws-kpi-neutral')+'"><small>'+name+'</small><strong>'+num+'</strong></div>').join('')+
      '</div><div class="ws-capacity" aria-label="Workshop operating capacity">'+
      '<span>TECHNICIANS <strong>'+q.free+' FREE / '+q.tech+' ACTIVE</strong></span>'+
      '<span>IN-HOUSE BAYS <strong>'+q.inHouse+' / '+q.bays+'</strong></span>'+ 
      '<span>AVAILABLE ASSISTANTS <strong>'+q.assistants+'</strong></span>'+
      '<span>EXTERNAL REPAIRS <strong>'+q.external+' / 2</strong></span>'+
      '<span>FUNDS RESERVED <strong>'+cash(q.reserve)+'</strong></span></div>'+ 
      '<p class="ws-caveat">'+(q.supervisor.manager?
        'SUPERVISOR '+esc(q.supervisor.manager.name.toUpperCase())+
        ' · INTERNAL BOOKING '+(q.supervisor.turnaroundDays?'−1 DAY':'NO SCHEDULING BONUS')+
        ' · QC REWORK RISK −'+q.supervisor.qcRiskReduction+' POINTS':
        'NO ACTIVE SUPERVISOR · NO SCHEDULING OR QC OVERSIGHT BENEFIT')+
      '. Assign available technicians as leads or assistants in the dispatch controls. '+q.urgent+' urgent job(s) in the queue.</p>';
    if(!s.vehicles.length)return {selectedId:null,html:kpi+
      '<div class="trade-empty ws-empty"><h2>NO VEHICLES TO PREPARE.</h2>'+
      '<p>Buy a vehicle at the Buying Desk or Auction Hall to create a workshop job.</p>'+
      '<button type="button" class="trade-button" data-page="auctions">OPEN BUYING DESK</button></div>'};
    const filters=[['all','ALL JOBS',q.count],['action','ACTION DUE',q.action],
      ['repair','IN REPAIR',q.repair],['ready','READY TO ADVERTISE',q.ready],
      ['listed','ON SALE',q.listed]];
    const toolbar='<div class="ws-toolbar"><strong>JOB REGISTER</strong>'+
      '<div class="ws-filters" role="group" aria-label="Filter workshop jobs">'+filters.map(([key,label,n])=>
      '<button type="button" data-action="filter-workshop" data-filter="'+key+
      '" aria-pressed="'+(f===key)+'">'+label+' <b>'+n+'</b></button>').join('')+'</div></div>';
    const cars=s.vehicles.filter(v=>f==='all'||(f==='action'?needs(v):
      f==='repair'?v.workshop?.stage==='in-progress':
      f==='ready'?v.status==='prepared'&&v.workshop?.stage==='ready':
      v.status==='listed'&&v.workshop?.stage==='ready'))
      .slice().sort((a,b)=>{
        const urgent=x=>x.status==='acquired'&&x.workshop?.priority==='urgent'?0:1;
        const pa=needs(a)?0:a.workshop.stage==='in-progress'?1:2;
        const pb=needs(b)?0:b.workshop.stage==='in-progress'?1:2;
        return urgent(a)-urgent(b)||pa-pb||a.acquiredDay-b.acquiredDay||a.id-b.id;
      });
    const chosen=cars.find(v=>v.id===selectedId)||cars[0]||null;
    const list=cars.length?cars.map(v=>unit(s,v,v.id===chosen?.id)).join(''):
      '<p class="ws-no-results">No jobs in this category. Select another filter.</p>';
    return {selectedId:chosen?.id??null,html:kpi+toolbar+
      '<div class="ws-layout"><aside class="ws-register"><header>JOBS <span>'+cars.length+
      ' SHOWN</span></header><div class="ws-register-list">'+list+'</div></aside>'+
      (chosen?dossier(s,W,chosen,leadChoice):'<div class="ws-file ws-no-results">No job selected.</div>')+
      '</div>'};
  }
  window.MotorTradeWorkshopView=Object.freeze({render,summary,paid,FILTERS});
})();