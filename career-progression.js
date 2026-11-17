'use strict';
/* The Motor Trade — read-only career progression and earned milestones.
 * Goals are computed from existing transactions, reports and reputation.
 * This module does not change money, unlock rules or saved career schemas.
 */
(() => {
  const LEVELS=Object.freeze([
    {min:0,name:'NEW TRADER',reward:'Build your first customer trust score.'},
    {min:20,name:'LOCAL DEALER',reward:'Six permanent forecourt spaces unlock automatically. Two paid temporary offsite places remain available.'},
    {min:40,name:'TRUSTED DEALER',reward:'Eight permanent forecourt spaces unlock automatically; additional sales staff become eligible. Workshop growth remains separately funded.'},
    {min:60,name:'REGIONAL SPECIALIST',reward:'Ten permanent forecourt spaces unlock automatically. Luxury stock still requires 65 reputation and £110,000 opening cash.'},
    {min:80,name:'PRESTIGE DEALER',reward:'Highest staff hiring limits and further workshop eligibility; delivery-mileage new-car allocations require 85 reputation and £180,000 opening cash.'}
  ]);
  const safe=x=>String(x).replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const gbp=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',
    maximumFractionDigits:0}).format(n);
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const number=n=>Number.isFinite(n)?n:0;
  function standing(state){
    const score=clamp(number(state.reputationScore),0,100);
    const idx=LEVELS.reduce((at,l,i)=>score>=l.min?i:at,0);
    return {score,current:LEVELS[idx],next:LEVELS[idx+1]||null,
      previous:LEVELS[idx-1]||null,index:idx};
  }
  function goals(state){
    const s=standing(state),sold=state.sold||[];
    const report=window.MotorTradeMonthly.statement(state);
    const profit=sold.find(x=>x.profit>0);
    const count=sold.length;
    let careerGoal;
    if(!profit)careerGoal={key:'first-profit',label:'FIRST PROFITABLE HANDOVER',
      progress:0,target:1,description:'Sell a vehicle with positive recorded gross trading margin.',
      page:'sales',action:'OPEN SALES OFFICE'};
    else {
      const fixed=[5,10,25,50,100].find(x=>count<x);
      const target=fixed||Math.ceil((count+1)/50)*50;
      const prior=target===5?1:target===10?5:target===25?10:target===50?25:target===100?50:target-50;
      careerGoal={key:'career-sales',label:target+' LIFETIME RETAIL SALES',
        progress:count,target,display:count+' / '+target,
        percentage:(count-prior)/(target-prior)*100,
        description:'Only completed handovers count. Currently '+count+' sold.',
        page:'sales',action:'OPEN SALES OFFICE'};
    }
    const soldUnits=number(report.soldUnits),targetUnits=Math.max(1,number(report.targetUnits));
    const contribution=number(report.operatingContribution);
    const monthGoal={
      key:'monthly',label:'MONTH '+state.monthPlan.month+' BUSINESS TARGET',
      progress:Math.min(soldUnits,targetUnits),target:targetUnits,
      display:soldUnits+' / '+targetUnits+' sales',
      description:soldUnits>=targetUnits?
        (contribution>0?'Volume reached and contribution currently positive. Maintain both through month-end.':
          'Volume reached, but operating contribution is '+gbp(contribution)+'. It must be positive at month-end.'):
        (targetUnits-soldUnits)+' more handover'+(targetUnits-soldUnits===1?'':'s')+
          ' needed; positive operating contribution also required.',
      page:'reports',action:'VIEW MONTHLY REPORT'
    };
    const reputationGoal=s.next?{
      key:'reputation',label:'BECOME '+s.next.name,
      progress:s.score-s.current.min,target:s.next.min-s.current.min,
      display:s.score+' / '+s.next.min+' reputation',
      description:(s.next.min-s.score)+' more reputation point'+(s.next.min-s.score===1?'':'s')+
        '. '+s.next.reward,
      page:'reputation',action:'VIEW REPUTATION'
    }:{
      key:'reputation',label:'MAINTAIN PRESTIGE STANDING',
      progress:1,target:1,display:'100-point scale',
      description:'Highest career tier reached. Reputation can still fall if standards slip.',
      page:'reputation',action:'VIEW REPUTATION'
    };
    return [careerGoal,monthGoal,reputationGoal];
  }
  function milestones(state){
    const sold=state.sold||[],reports=state.monthlyReports||[];
    const profit=sold.find(v=>v.profit>0);
    const auction=(state.auctionHistory||[]).find(x=>x.kind==='won');
    // Auction result history is bounded; ownership still proves a past purchase.
    const auctionOwned=!!auction||[...(state.vehicles||[]),...sold].some(x=>x.source==='auction');
    let total=0,turnoverSale=null;
    for(const sale of sold){total+=sale.price;if(!turnoverSale&&total>=100000)turnoverSale=sale;}
    const success=reports.find(r=>r.targetMet===true);
    const expensive=sold.find(v=>v.price>=25000);
    return [
      {name:'FIRST PROFITABLE SALE',earned:!!profit,day:profit?.day,detail:'Positive gross margin at retail handover'},
      {name:'FIRST AUCTION PURCHASE',earned:auctionOwned,day:auction?.day,detail:'Hammer won and invoice settled'},
      {name:'FIVE RETAIL SALES',earned:sold.length>=5,day:sold[4]?.day,detail:'Five completed vehicle handovers'},
      {name:'FIRST SUCCESSFUL MONTH',earned:!!success,day:success?.endDay,detail:'Volume target and positive operating contribution'},
      {name:'£25K VEHICLE SALE',earned:!!expensive,day:expensive?.day,detail:'Completed retail sale at £25,000 or more'},
      {name:'£100K SALES TURNOVER',earned:!!turnoverSale,day:turnoverSale?.day,detail:'Cumulative completed retail turnover'}
    ];
  }
  function goalCard(g){
    const pct=clamp(g.percentage??(g.target?g.progress/g.target*100:0),0,100);
    const display=g.display||g.progress+' / '+g.target;
    return '<button type="button" class="cp-goal" data-page="'+safe(g.page)+'">'+
      '<span class="cp-goal-top"><strong>'+safe(g.label)+'</strong><span>'+safe(display)+'</span></span>'+
      '<span class="cp-goal-track" aria-hidden="true"><span style="width:'+pct.toFixed(1)+'%"></span></span>'+
      '<small>'+safe(g.description)+'</small><em>'+safe(g.action)+' ↗</em></button>';
  }
  function dashboard(state){
    const s=standing(state);
    return '<section class="cp-dashboard" aria-label="Live career objectives">'+
      '<div class="cp-dashboard-head"><div><small>CAREER PROGRESSION</small>'+
      '<h2>YOUR NEXT THREE GOALS</h2></div>'+
      '<button type="button" data-page="reputation" class="cp-current-tier">'+
      safe(s.current.name)+' · '+s.score+'/100 ↗</button></div>'+
      '<div class="cp-goals">'+goals(state).map(goalCard).join('')+'</div></section>';
  }
  function reputation(state){
    const earned=milestones(state),done=earned.filter(x=>x.earned).length;
    const items=earned.map(m=>
      '<div class="cp-achievement '+(m.earned?'cp-earned':'cp-locked')+'">'+
      '<span class="cp-achievement-symbol" aria-hidden="true">'+(m.earned?'◆':'◇')+'</span>'+
      '<span><strong>'+safe(m.name)+'</strong><small>'+safe(m.detail)+'</small></span>'+
      '<em>'+(m.earned?(Number.isSafeInteger(m.day)?'DAY '+m.day:'EARNED'):'LOCKED')+
      '</em></div>').join('');
    return '<section class="cp-reputation" aria-label="Career targets and achievements">'+
      '<div class="cp-section-head"><div><small>BUSINESS OBJECTIVES</small>'+
      '<h3>YOUR NEXT THREE GOALS</h3></div><span>REAL RESULTS ONLY</span></div>'+
      '<div class="cp-goals">'+goals(state).map(goalCard).join('')+'</div>'+
      '<div class="cp-section-head cp-achievements-title"><div><small>CAREER RECORD</small>'+
      '<h3>EARNED MILESTONES</h3></div><span>'+done+' / '+earned.length+' EARNED</span></div>'+
      '<div class="cp-achievements">'+items+'</div>'+
      '<p class="cp-rules">Achievements use completed sales, settled auctions and archived reports. They award no cash or free cars. Permanent forecourt places unlock separately and automatically at 20, 40 and 60 reputation.</p>'+
      '</section>';
  }
  function promotion(before,after){
    const old=LEVELS.reduce((at,l,i)=>before>=l.min?i:at,0);
    const now=LEVELS.reduce((at,l,i)=>after>=l.min?i:at,0);
    return now>old?LEVELS[now]:null;
  }
  function promotionHtml(tier){
    return '<section class="cp-promotion-dialog" role="dialog" aria-modal="true" '+
      'aria-labelledby="cp-promotion-title" aria-describedby="cp-promotion-detail">'+
      '<span class="cp-promotion-eyebrow">CAREER MILESTONE · NEXTGEN SESSIONS</span>'+
      '<span class="cp-promotion-icon" aria-hidden="true">◆</span>'+
      '<h2 id="cp-promotion-title">PROMOTED TO<br><em>'+safe(tier.name)+'</em></h2>'+
      '<p id="cp-promotion-detail">'+safe(tier.reward)+'</p>'+
      '<p class="cp-promotion-note">Permanent forecourt space unlocks automatically at 20, 40 and 60 reputation and incurs ongoing premises overheads. This is not a cash award. Workshop expansion still requires investment.</p>'+
      '<div class="cp-promotion-actions">'+
      '<button type="button" data-action="view-promotion" class="cp-promotion-primary">VIEW CAREER PROGRESS ↗</button>'+
      '<button type="button" data-action="dismiss-promotion" class="cp-promotion-secondary">CONTINUE TRADING</button>'+
      '</div></section>';
  }
  function saleFeedback(state,beforeRep,beforeSales){
    const sale=(state.sold||[]).at(-1);
    if(!sale||state.sold.length<=beforeSales)return '';
    const delta=state.reputationScore-beforeRep,s=standing(state);
    const repText='Reputation '+(delta>0?'+':'')+delta+' ('+state.reputationScore+'/100).';
    const next=s.next?' '+(s.next.min-s.score)+' points to '+s.next.name+'.':
      ' Prestige tier held.';
    const first=beforeSales===0?' First retail handover completed.':'';
    const profitable=sale.profit>0&&!(state.sold||[]).slice(0,-1).some(v=>v.profit>0)?
      ' First profitable sale milestone earned.':'';
    return repText+next+first+profitable;
  }
  window.MotorTradeCareerProgression=Object.freeze({
    LEVELS,standing,goals,milestones,dashboard,reputation,promotion,promotionHtml,saleFeedback
  });
})();