'use strict';
/* Auction adviser: staff scout, owner sets a binding max hammer bid,
 * staff bid against the existing fixed rival and settle through real auction.
 * No fictional stock, cash, reserve disclosures or fabricated transactions.
 */
(() => {
  const I=Number.isSafeInteger;
  const cash=n=>I(n)&&n>=0&&n<=100000000;
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gbp=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',
    maximumFractionDigits:0}).format(n);
  const initial=()=>({day:0,mode:'delegate',requests:[],history:[]});
  const clone=x=>JSON.parse(JSON.stringify(x));
  const ref=r=>'auction-advice:'+r.id;
  const current=(s,r)=>r.status==='pending'&&s.day===r.day&&
    s.auctionHall.day===s.day&&s.auctionHall.index===r.index&&
    s.auctionHall.phase==='catalogue'&&
    window.MotorTradeEngine?.auctionLot(s)?.id===r.lotId;
  const pending=s=>(s.auctionAgent?.requests||[]).filter(r=>current(s,r));
  const lookup=(s,id)=>s.auctionAgent?.requests.find(r=>r.id===id)||null;
  const messageFor=(s,m)=>(s.auctionAgent?.requests||[]).find(r=>m?.reference===ref(r))||null;
  function record(s,kind,note,lotId='',amount=0){
    s.auctionAgent.history.push({day:s.day,kind,lotId,amount,
      note:String(note).slice(0,160)});
    if(s.auctionAgent.history.length>150)s.auctionAgent.history.splice(0,s.auctionAgent.history.length-150);
  }
  function close(s,r,status,note,cap=0){
    r.status=status;r.resolvedDay=s.day;r.cap=cap;
    r.outcome=String(note).slice(0,160);
    const m=s.messages.find(x=>x.reference===ref(r));
    if(m)m.decision=status==='attending'?'taken-over':
      status==='delegated'?'approved':'declined';
    record(s,status,note,r.lotId,cap);
  }
  function expire(s){
    for(const r of s.auctionAgent.requests)
      if(r.status==='pending'&&!current(s,r))close(s,r,'expired','Auction lot moved on or expired.');
    const closed=s.auctionAgent.requests.filter(r=>r.status!=='pending');
    if(closed.length>80){
      const remove=new Set(closed.slice(0,closed.length-80));
      s.auctionAgent.requests=s.auctionAgent.requests.filter(r=>!remove.has(r));
    }
  }
  function recommendation(lot){
    const prep=lot.profile?.basePrep||0;
    // Public guide/retail/estimated prep only: vendor reserve and rival limit
    // stay private. Unexpected workshop defects are a genuine additional risk.
    const spread=lot.retail-lot.guide-lot.fee-prep;
    const suggested=Math.floor(Math.min(
      lot.guide+Math.min(1400,Math.max(0,spread*.45)),
      lot.retail-lot.fee-prep-900,
      100000)/100)*100;
    return {prep,spread,suggested,
      attractive:spread>=1150&&suggested>=lot.guide+100};
  }
  function review(s,E){
    const a=s.auctionAgent;
    expire(s);
    if(!E.auctionDay(s.day)||a.mode==='owner')return {ok:true,pending:pending(s).length};
    const supervisor=E.people.supervisor(s);
    if(!supervisor)return {ok:true,pending:0};
    // Skip genuinely unattractive lots through the same auction transition as
    // a human player. Owner is not asked for consent to spend £0.
    for(let step=0;step<12;step++){
      const h=s.auctionHall,lot=E.auctionLot(s);
      if(!lot||h.phase!=='catalogue')break;
      const existing=a.requests.find(r=>r.day===s.day&&r.lotId===lot.id);
      if(existing)break;
      const rec=recommendation(lot);
      if(!rec.attractive||s.vehicles.some(v=>v.origin===lot.id)){
        const passed=E.passAuction(s);
        if(!passed.ok)break;
        record(s,'passed',lot.title+' passed on guide/margin risk.',lot.id);
        E.nextAuctionLot(s);
        continue;
      }
      const r={id:'AR-'+s.day+'-'+h.index,day:s.day,index:h.index,
        lotId:lot.id,title:lot.title,guide:lot.guide,fee:lot.fee,
        retail:lot.retail,prep:rec.prep,suggested:rec.suggested,
        status:'pending',resolvedDay:null,cap:0,outcome:''};
      a.requests.push(r);
      const body='I am attending the auction on your behalf. LOT '+E.lotNumber(h.index)+
        ' looks worth considering, subject to bidding discipline.\n\n'+
        'VEHICLE: '+lot.title+
        '\nGUIDE PRICE: '+gbp(lot.guide)+
        '\nEXPECTED RETAIL: '+gbp(lot.retail)+
        '\nKNOWN PREPARATION ALLOWANCE: '+gbp(rec.prep)+
        '\nBUYER FEE: '+gbp(lot.fee)+
        '\nMY SUGGESTED MAXIMUM HAMMER BID: '+gbp(rec.suggested)+
        '\nESTIMATED MARGIN IF WON AT SUGGESTED CAP: '+
          gbp(lot.retail-rec.suggested-lot.fee-rec.prep)+
        '\n\nThe reserve, rival ceiling and hidden defects are unknown. '+
        'Give me a hard maximum bid and I will compete within that limit, '+
        'pay the hammer and buyer fee using the existing auction rules, then report the outcome. '+
        'Or attend personally. Passing does not spend money.';
      const info={from:'AUCTION SUPERVISOR · '+supervisor.name,
        category:'operations',subject:'AUCTION ADVICE · LOT '+E.lotNumber(h.index)+' · '+lot.title,
        preview:'Guide '+gbp(lot.guide)+' · suggested max '+gbp(rec.suggested)+
          ' · estimated retail '+gbp(lot.retail)+'. Your instruction needed.',
        body,linkPage:'auctionHall',reference:ref(r)};
      if(window.MotorTradeInbox?.emit)window.MotorTradeInbox.emit(s,info);
      else s.messages.push({...info,id:s.messages.reduce((n,m)=>Math.max(n,m.id),0)+1,
        day:s.day,read:false});
      record(s,'recommendation','Supervisor proposed a maximum hammer bid for '+lot.title,lot.id,rec.suggested);
      break;
    }
    return {ok:true,pending:pending(s).length};
  }
  function decide(s,E,id,choice,maximum){
    expire(s);
    const r=lookup(s,id);
    if(!r||!current(s,r))return {ok:false,message:'That auction recommendation is no longer live.'};
    if(choice==='attend'){
      s.auctionAgent.mode='owner';
      close(s,r,'attending','Dealer Principal is attending the remaining auction lots personally.');
      return {ok:true,message:'You are attending the auction yourself. Auction Hall now gives you direct control of bidding and settlement.'};
    }
    if(choice==='pass'){
      const result=E.passAuction(s);
      if(!result.ok)return result;
      close(s,r,'declined','Owner declined auction LOT '+E.lotNumber(r.index)+'. No money spent.');
      E.nextAuctionLot(s);
      review(s,E);
      return {ok:true,message:'Supervisor passed '+r.title+'. £0 spent. '+(pending(s).length?'The next recommendation is in your Inbox.':'The auction can continue without your involvement.')};
    }
    if(choice!=='delegate')return {ok:false,message:'Choose a valid auction instruction.'};
    if(!I(maximum)||maximum<r.guide+100||maximum>100000||maximum%100!==0)
      return {ok:false,message:'Set a maximum hammer bid in £100 increments above the guide, no more than £100,000.'};
    const lot=E.auctionLot(s),fee=lot.fee;
    const requiredPrep=lot.profile.basePrep+(lot.profile.hiddenFault?.cost||0);
    const hold=window.MotorTradeWorkshop?.reserved(s)||0;
    // The true engine rechecks stock capacity and payment at each bid;
    // this initial cap check prevents a visibly unaffordable instruction.
    if(s.cash<maximum+fee+hold+requiredPrep)
      return {ok:false,message:'The maximum plus buyer fee and protected workshop preparation exceeds current cash. Reduce your bid or transfer funds.'};
    const opening=E.startAuction(s);
    if(!opening.ok)return opening;
    let finalMessage='',attempts=0;
    while(s.auctionHall.phase==='bidding'&&attempts++<250){
      const next=s.auctionHall.currentBid+100;
      if(next>maximum){
        const pass=E.passAuction(s);
        if(!pass.ok)return {...pass,changed:true};
        finalMessage=pass.message;break;
      }
      const step=E.bidLiveAuction(s,100);
      if(!step.ok)return {...step,changed:true};
      finalMessage=step.message;
    }
    if(s.auctionHall.phase==='payment'){
      if(s.auctionHall.currentBid>maximum)
        return {ok:false,changed:true,message:'The delegated hammer exceeded authority. Please resolve the auction manually.'};
      const result=E.settleAuction(s);
      if(!result.ok)return {...result,changed:true};
      finalMessage=result.message;
    }
    if(s.auctionHall.phase==='bidding')
      return {ok:false,changed:true,message:'Auction bidding remains open; finish it manually in Auction Hall.'};
    if(s.auctionHall.phase!=='result')
      return {ok:false,changed:true,message:'The auction has an unexpected result; review it in Auction Hall.'};
    const outcome=s.auctionHall.results.at(-1);
    close(s,r,'delegated','Supervisor '+outcome.kind+' LOT '+E.lotNumber(r.index)+
      ' within owner cap '+gbp(maximum)+'.',maximum);
    record(s,outcome.kind,finalMessage,lot.id,outcome.kind==='won'?outcome.total:0);
    E.nextAuctionLot(s);
    review(s,E);
    return {ok:true,message:'Auction instruction completed. '+finalMessage+
      (pending(s).length?' Another recommendation is waiting in Inbox.':'')};
  }
  function controls(s,m){
    const r=messageFor(s,m);
    if(!r)return '';
    if(!current(s,r))
      return '<div class="inbox-resolved">This auction lot is finished or the instruction was already recorded.</div>';
    return '<section class="inbox-approval"><div class="inbox-approval-intro">'+
      '<strong>AUCTION INSTRUCTION · '+esc(r.title)+'</strong>'+
      '<small>Guide '+gbp(r.guide)+' · Suggested maximum '+gbp(r.suggested)+
      ' · Buyer fee '+gbp(r.fee)+'. Authorising a maximum permits settlement up to that hammer bid plus the stated fee.</small></div>'+
      '<label for="auction-agent-cap-'+esc(r.id)+'">YOUR MAXIMUM HAMMER BID (£)</label>'+
      '<input id="auction-agent-cap-'+esc(r.id)+'" type="number" min="'+(r.guide+100)+
      '" max="100000" step="100" value="'+r.suggested+'">'+
      '<div class="inbox-approval-choices">'+
      '<button type="button" class="trade-button" data-action="auction-agent" data-id="'+esc(r.id)+
      '" data-decision="delegate">AUTHORISE SUPERVISOR BID</button>'+
      '<button type="button" class="trade-button trade-button-secondary" data-action="auction-agent" data-id="'+esc(r.id)+
      '" data-decision="attend">I WILL ATTEND</button>'+
      '<button type="button" class="trade-button trade-button-outline" data-action="auction-agent" data-id="'+esc(r.id)+
      '" data-decision="pass">PASS · SPEND £0</button></div></section>';
  }
  function valid(a,s){
    if(!a||!I(a.day)||a.day<0||a.day>s.day||
      !['delegate','owner'].includes(a.mode)||
      !Array.isArray(a.requests)||a.requests.length>120||
      !Array.isArray(a.history)||a.history.length>150)return false;
    const seen=new Set();
    for(const r of a.requests){
      if(!r||!/^AR-[1-9]\d*-\d+$/.test(r.id)||seen.has(r.id)||
        r.id!=='AR-'+r.day+'-'+r.index||!I(r.day)||r.day<1||r.day>s.day||
        !I(r.index)||r.index<0||r.index>10||
        typeof r.lotId!=='string'||r.lotId!=='A-'+r.day+'-'+r.index||
        typeof r.title!=='string'||r.title.length<2||r.title.length>99||
        !cash(r.guide)||!cash(r.fee)||!cash(r.retail)||!cash(r.prep)||
        !cash(r.suggested)||r.suggested>100000||!cash(r.cap)||r.cap>100000||
        !['pending','delegated','attending','declined','expired'].includes(r.status)||
        (r.status==='pending'?(r.resolvedDay!==null||r.cap!==0||r.outcome!==''):
          (!I(r.resolvedDay)||r.resolvedDay<r.day||r.resolvedDay>s.day||
            typeof r.outcome!=='string'||r.outcome.length>160))||
        (r.status==='pending'&&!s.messages.some(m=>m.reference===ref(r))))return false;
      seen.add(r.id);
    }
    return a.history.every(x=>x&&I(x.day)&&x.day>=1&&x.day<=s.day&&
      ['passed','recommendation','delegated','attending','declined','expired',
        'won','lost','unsold','owned'].includes(x.kind)&&
      typeof x.lotId==='string'&&x.lotId.length<45&&cash(x.amount)&&
      typeof x.note==='string'&&x.note.length<=160);
  }
  window.MotorTradeAuctionAgent=Object.freeze({
    initial,clone,valid,review,decide,pending,controls,messageFor,expire
  });
})();