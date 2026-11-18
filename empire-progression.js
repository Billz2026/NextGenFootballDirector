'use strict';
/* Empire progression phase 1. Read-only values derived exclusively from real saved
 * sales, settled auction history and archived monthly reports. No new save fields.
 * The 0-100 customer trust mechanic remains authoritative for trading decisions.
 */
(() => {
  const MAX_POINTS=2000,MAX_RANK=100,POINTS_PER_RANK=20;
  const STAGES=Object.freeze([
    {rank:0,title:'PRESTIGE DEALER'},
    {rank:10,title:'ESTABLISHED PRESTIGE DEALER'},
    {rank:20,title:'REGIONAL MARKET LEADER'},
    {rank:30,title:'NATIONAL MOTOR GROUP'},
    {rank:40,title:'LUXURY SPECIALIST'},
    {rank:50,title:'PREMIER LUXURY DEALER'},
    {rank:60,title:'ELITE MOTOR HOUSE'},
    {rank:70,title:'COLLECTOR’S SPECIALIST'},
    {rank:80,title:'LUXURY MOTOR GROUP'},
    {rank:90,title:'ULTRA-LUXURY HOUSE'},
    {rank:100,title:'WORLD-CLASS LUXURY DEALER'}
  ]);
  // Permissions roadmap only. Independent branch trading is not available in phase 1.
  const BRANCH_STAGES=Object.freeze([
    {rank:0,cap:1,scope:'Original UK dealership'},
    {rank:10,cap:2,scope:'Second UK site'},
    {rank:25,cap:4,scope:'Regional UK group'},
    {rank:40,cap:7,scope:'Nationwide UK group'},
    {rank:55,cap:12,scope:'Major UK group'},
    {rank:70,cap:16,scope:'Ireland and selected European markets'},
    {rank:80,cap:22,scope:'Wider international operation'},
    {rank:90,cap:30,scope:'Global luxury group'}
  ]);
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('en-GB',{
    style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
  const safe=n=>Number.isFinite(n)?n:0;
  const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));
  const fmt=n=>Number(n).toLocaleString('en-GB');
  const achieved=(name,current,target)=>({
    name,met:current>=target,detail:fmt(current)+' / '+fmt(target)
  });
  function stats(state){
    const sold=Array.isArray(state.sold)?state.sold:[];
    const reports=Array.isArray(state.monthlyReports)?state.monthlyReports:[];
    const wins=Array.isArray(state.auctionHistory)?
      state.auctionHistory.filter(r=>r.kind==='won').length:0;
    const auctionOwned=[...sold,...(state.vehicles||[])]
      .filter(v=>v.source==='auction').length;
    const luxuryNames=new Set((window.MotorTradeMarket?.CATALOGUE?.luxury||[])
      .map(v=>v.title));
    const luxury=sold.filter(v=>v.marketTier==='luxury'||
      v.marketTier==='ultra-luxury'||luxuryNames.has(v.title));
    const ultra=sold.filter(v=>v.marketTier==='ultra-luxury');
    const last100=sold.slice(-100);
    const last100Luxury=last100.length===100?
      last100.filter(v=>v.marketTier==='luxury'||
        v.marketTier==='ultra-luxury'||luxuryNames.has(v.title)).length:0;
    const successful=reports.filter(r=>r.operatingContribution>0&&r.targetMet===true);
    const clean=successful.filter(r=>r.payrollArrears===0&&r.premisesArrears===0&&
      r.stockAgeingArrears===0&&r.afterSalesOpen===0);
    const closingCash=Math.max(safe(state.cash),...reports.map(r=>safe(r.closingCash)));
    const monthsConsecutive=(()=>{
      let count=0;
      for(let i=reports.length-1;i>=0;i--){
        if(!(reports[i].operatingContribution>0&&reports[i].targetMet===true))break;
        count++;
      }
      return count;
    })();
    const branches=Array.isArray(state.group?.branches)?state.group.branches:
      Array.isArray(state.branches)?state.branches:[];
    const branchCount=1+branches.filter(b=>b&&b.id!=='original'&&b.status!=='closed').length;
    const countries=new Set(['UK']);
    for(const b of branches)if(b&&b.status!=='closed'&&typeof b.country==='string'&&
      b.country.trim())countries.add(b.country.trim().toUpperCase()==='UNITED KINGDOM'?'UK':b.country.trim().toUpperCase());
    return {
      sales:sold.length,profitableSales:sold.filter(v=>v.profit>0).length,
      turnover:sold.reduce((n,v)=>n+safe(v.price),0),
      profitableMonths:successful.length,cleanMonths:clean.length,
      auctionWins:Math.max(wins,auctionOwned),luxurySales:luxury.length,
      ultraSales:ultra.length,last100Luxury,consecutiveMonths:monthsConsecutive,
      bestCash:closingCash,branchCount,countries:countries.size,
      reports,sold
    };
  }
  function earnedPoints(state,s){
    // At most 20 points from profitable handovers in each *calendar* month;
    // selling hundreds of low-value cars in one month cannot farm prestige.
    const monthSales=new Map();
    for(const sale of s.sold){
      if(!(sale.profit>0))continue;
      const bucket=window.MotorTradeCalendar?.monthOf?.(sale.day) ??
        Math.floor((sale.day-1)/30);
      monthSales.set(bucket,(monthSales.get(bucket)||0)+1);
    }
    let salesPts=0;
    for(const n of monthSales.values())salesPts+=Math.min(n,20);
    const milestones=[
      [s.profitableSales>=1,5],[s.sales>=5,5],[s.sales>=25,10],
      [s.sales>=100,20],[s.sales>=250,30],[s.sales>=500,40],
      [s.turnover>=100000,5],[s.turnover>=1000000,15],
      [s.turnover>=5000000,25],[s.turnover>=10000000,40]
    ];
    const bonus=milestones.reduce((n,[met,p])=>n+(met?p:0),0);
    return clamp(salesPts+s.profitableMonths*8+s.cleanMonths*4+bonus,0,MAX_POINTS);
  }
  function requirements(stage,s,state){
    switch(stage){
      case 10:return [achieved('Completed retail handovers',s.sales,100),
        achieved('Profitable target-achieving months',s.profitableMonths,3)];
      case 20:return [achieved('Completed retail handovers',s.sales,200),
        achieved('Recorded auction purchases',s.auctionWins,10),
        achieved('Profitable target-achieving months',s.profitableMonths,6)];
      case 30:return [achieved('Lifetime retail turnover (£)',s.turnover,3000000),
        achieved('Profitable target-achieving months',s.profitableMonths,9)];
      case 40:return [achieved('Luxury vehicle handovers',s.luxurySales,20),
        achieved('Profitable target-achieving months',s.profitableMonths,12)];
      case 50:return [achieved('Luxury handovers',s.luxurySales,50),
        achieved('Highest recorded cash (£)',s.bestCash,500000),
        achieved('Profitable target-achieving months',s.profitableMonths,15),
        achieved('Operating branches (future expansion)',s.branchCount,2)];
      case 60:return [achieved('Ultra-luxury handovers (future stock)',s.ultraSales,10),
        achieved('Operating branches (future expansion)',s.branchCount,3)];
      case 70:return [achieved('Ultra-luxury handovers (future stock)',s.ultraSales,25),
        achieved('Lifetime retail turnover (£)',s.turnover,8000000),
        achieved('Operating branches (future expansion)',s.branchCount,4)];
      case 80:return [achieved('Luxury sales in last 100 handovers',s.last100Luxury,80),
        achieved('Profitable target-achieving months',s.profitableMonths,24),
        achieved('Operating branches (future expansion)',s.branchCount,7)];
      case 90:return [achieved('Lifetime luxury handovers',s.luxurySales,100),
        achieved('Consecutive profitable months',s.consecutiveMonths,6),
        achieved('Operating branches (future expansion)',s.branchCount,12),
        achieved('Countries operated in (future expansion)',s.countries,2)];
      case 100:return [achieved('Consecutive profitable months',s.consecutiveMonths,12),
        achieved('Luxury handovers in last 100 sales',s.last100Luxury,100),
        achieved('Ultra-luxury handovers (future stock)',s.ultraSales,25),
        achieved('Operating branches (future expansion)',s.branchCount,10),
        achieved('Countries operated in (future expansion)',s.countries,3),
        achieved('Available cash (£)',safe(state.cash),1000000),
        achieved('Customer trust',safe(state.reputationScore),90),
        {name:'No overdue payroll or premises bills',
         met:!state.payrollArrears&&!state.premises?.arrears,
         detail:!state.payrollArrears&&!state.premises?.arrears?'CLEAR':'NOT CLEAR'}];
      default:return [];
    }
  }
  function status(state){
    const s=stats(state),points=earnedPoints(state,s);
    const theoreticalRank=Math.floor(points/POINTS_PER_RANK);
    const trustReady=safe(state.reputationScore)>=80;
    let rank=trustReady?theoreticalRank:0;
    let blocked=null;
    if(trustReady)for(const stage of STAGES.slice(1)){
      if(rank<stage.rank)break;
      const checks=requirements(stage.rank,s,state);
      if(checks.some(c=>!c.met)){
        rank=stage.rank-1;
        blocked={stage,checks};
        break;
      }
    }
    const current=trustReady?STAGES.filter(x=>x.rank<=rank).at(-1):
      {rank:0,title:'BUILD CUSTOMER TRUST TO ENTER PRESTIGE'};
    const next=STAGES.find(x=>x.rank>rank)||null;
    const branch=BRANCH_STAGES.filter(x=>x.rank<=rank).at(-1);
    const upcomingBranch=BRANCH_STAGES.find(x=>x.rank>rank)||null;
    const needed=Math.min(MAX_POINTS,(rank+1)*POINTS_PER_RANK);
    const remaining=Math.max(0,needed-points);
    return {points,rank,trustReady,current,next,branch,upcomingBranch,
      blocked,remaining,needed,stats:s,requirements:next?requirements(next.rank,s,state):[]};
  }
  // Rank 0 is the starting Prestige Dealer position. Ranks 1–100 are all
  // individually displayed, with one major promotion after every ten ranks.
  // The list is derived from the same status calculation as gameplay.
  function rankPath(state,p=status(state)){
    return Array.from({length:MAX_RANK+1},(_,rank)=>{
      const stage=STAGES.find(s=>s.rank===rank)||null;
      const achieved=p.trustReady&&rank<p.rank;
      const current=p.trustReady&&rank===p.rank;
      const locked=!achieved&&!current;
      const gateBlocked=!!p.blocked&&p.blocked.stage.rank===rank;
      return {rank,points:rank*POINTS_PER_RANK,stage,
        status:achieved?'achieved':current?'current':'locked',
        locked,gateBlocked};
    });
  }
  function pathway(state,p){
    const ranks=rankPath(state,p);
    const origin=ranks[0];
    const originState=origin.status.toUpperCase();
    const originRow='<div class="empire-origin empire-rank-'+origin.status+'">'+
      '<div><small>CAREER FOUNDATION</small><strong>RANK 00 · PRESTIGE DEALER</strong>'+
      '<p>Enter the prestige career at 80/100 customer trust. One original dealership.</p></div>'+
      '<span class="empire-origin-status">'+originState+'</span></div>';
    const chapters=Array.from({length:10},(_,i)=>{
      const first=i*10+1,last=first+9,stage=STAGES[i+1];
      const unlocked=p.trustReady&&p.rank>=last;
      const active=p.trustReady&&p.rank>=first-1&&p.rank<last;
      const chapterState=unlocked?'achieved':active?'current':'locked';
      const gateChecks=requirements(last,p.stats,state);
      const complete=gateChecks.filter(check=>check.met).length;
      const blocked=!!p.blocked&&p.blocked.stage.rank===last;
      const gateStatus=unlocked?'ACHIEVED':blocked?'PROMOTION BLOCKED':'LOCKED';
      const tiles=ranks.slice(first,last+1).map(r=>{
        const isGate=!!r.stage;
        const title=isGate?stage.title:'Progress toward '+stage.title;
        const statusLabel=r.gateBlocked?'LOCKED · GATE':r.status.toUpperCase();
        return '<div class="empire-path-rank empire-rank-'+r.status+
          (isGate?' empire-rank-promotion':'')+
          (r.gateBlocked?' empire-rank-gated':'')+
          '" aria-label="Rank '+r.rank+', '+fmt(r.points)+' prestige points, '+
          esc(title)+', '+esc(statusLabel)+'">'+
          '<small>RANK '+String(r.rank).padStart(2,'0')+'</small>'+
          '<strong>'+fmt(r.points)+' <span>PTS</span></strong>'+
          '<em>'+esc(statusLabel)+'</em>'+
          '</div>';
      }).join('');
      const gateRows=gateChecks.map(check=>{
        const future=/future (?:stock|expansion)/i.test(check.name);
        return '<div class="empire-gate-check '+(check.met?'empire-done':'empire-locked')+'">'+
          '<span aria-hidden="true">'+(check.met?'◆':'◇')+'</span>'+
          '<span><strong>'+esc(check.name)+'</strong>'+
          (future?'<small>Requires a planned future game system</small>':'')+'</span>'+
          '<em>'+esc(check.detail)+'</em></div>';
      }).join('');
      return '<section class="empire-path-chapter empire-chapter-'+chapterState+
        '" aria-label="Ranks '+first+' to '+last+', '+esc(stage.title)+'">'+
        '<div class="empire-chapter-heading"><div><small>CHAPTER '+String(i+1).padStart(2,'0')+
        ' · RANKS '+String(first).padStart(2,'0')+'–'+last+'</small>'+
        '<h4>'+esc(stage.title)+'</h4></div>'+
        '<span class="empire-chapter-state">'+(unlocked?'ACHIEVED':active?'CURRENT CHAPTER':'LOCKED')+'</span></div>'+
        '<div class="empire-rank-grid" role="group" aria-label="All ranks '+first+' to '+last+'">'+tiles+'</div>'+
        '<div class="empire-gate-summary"><div><strong>RANK '+last+' PROMOTION GATE</strong>'+
        '<small>'+complete+' / '+gateChecks.length+' REQUIREMENTS MET</small></div>'+
        '<span class="empire-gate-state '+(blocked?'empire-gate-blocked':'')+'">'+gateStatus+'</span></div>'+
        '<div class="empire-gate-checks">'+gateRows+'</div></section>';
    }).join('');
    return '<section class="empire-pathway" aria-label="Complete 100-rank career pathway">'+
      '<div class="empire-path-heading"><div><small>COMPLETE MOTOR TRADE CAREER</small>'+
      '<h3>THE FULL 100-RANK PATHWAY</h3>'+
      '<p>Every rank from 1 to 100 is shown below, including its point target. '+
      'Major promotions require both points and business results.</p></div>'+
      '<span>100 RANKS · 2,000 PTS</span></div>'+
      '<div class="empire-legend" aria-label="Rank status key">'+
      '<span class="empire-legend-achieved">◆ ACHIEVED</span>'+
      '<span class="empire-legend-current">◆ CURRENT</span>'+
      '<span class="empire-legend-locked">◇ LOCKED</span></div>'+
      originRow+chapters+'</section>';
  }
  function render(state){
    const p=status(state),progress=clamp(p.points-p.rank*POINTS_PER_RANK,0,POINTS_PER_RANK);
    const head=p.blocked?'PROMOTION HELD — BUSINESS REQUIREMENTS OUTSTANDING':
      !p.trustReady?'CAREER RANKS REQUIRE 80/100 CUSTOMER TRUST':
      p.rank===MAX_RANK?'MAXIMUM CAREER RANK ACHIEVED':
      (p.remaining+' MORE PRESTIGE POINTS TO RANK '+(p.rank+1));
    const checks=p.requirements.map(c=>
      '<div class="empire-check '+(c.met?'empire-done':'empire-missing')+'">'+
      '<span aria-hidden="true">'+(c.met?'◆':'◇')+'</span><strong>'+esc(c.name)+'</strong>'+
      '<small>'+esc(c.detail)+'</small></div>').join('');
    return '<section class="empire-panel" aria-label="One hundred rank empire career">'+
      '<div class="empire-heading"><div><small>CAREER PRESTIGE / MOTOR GROUP DEVELOPMENT</small>'+
      '<h3>'+esc(p.current.title)+'</h3><p>Separate from the live 0–100 customer trust score.</p></div>'+
      '<span>RANK '+p.rank+' / 100</span></div>'+
      '<div class="empire-metrics"><div><small>CAREER PRESTIGE</small><strong>'+
      fmt(p.points)+' <span>/ 2,000</span></strong></div>'+
      '<div><small>BRANCH PERMISSION ROADMAP</small><strong>'+p.branch.cap+
      ' <span>site'+(p.branch.cap===1?'':'s')+' at this rank</span></strong></div></div>'+
      '<div class="empire-progress" role="progressbar" aria-label="Progress to next prestige rank" '+
      'aria-valuemin="0" aria-valuemax="20" aria-valuenow="'+progress+'">'+
      '<div style="width:'+(progress/POINTS_PER_RANK*100).toFixed(1)+'%"></div></div>'+
      '<p class="empire-next">'+esc(head)+'</p>'+
      '<div class="empire-section-title"><strong>NEXT MAJOR PROMOTION</strong>'+
      '<span>'+(p.next?'RANK '+p.next.rank:'CAREER COMPLETE')+'</span></div>'+
      '<div class="empire-checks">'+(checks||'<p>All major promotions completed.</p>')+'</div>'+
      '<div class="empire-branch"><strong>GROUP EXPANSION PATH</strong>'+
      '<p>'+(p.upcomingBranch?'Next branch milestone: Rank '+p.upcomingBranch.rank+
      ', up to '+p.upcomingBranch.cap+' sites — '+esc(p.upcomingBranch.scope)+'.':
      'Maximum branch permission tier reached.')+'</p>'+
      '<small>Branch permission is a roadmap only. Additional sites, franchise agreements and country-specific trading are not yet available in this release.</small></div>'+
      pathway(state,p)+
      '<p class="empire-method">Points are calculated from recorded profitable handovers (maximum 20 per calendar month), archived profitable monthly targets, clean operating months and one-time milestones. Unpaid bills and incomplete promotion conditions can block the highest ranks. Existing saves earn credit automatically, without modifying transactions.</p>'+
      '</section>';
  }
  function branchBrief(state){
    const p=status(state);
    return '<section class="hq-empire-brief" aria-label="Future motor group expansion">'+
      '<div><small>LONG-TERM GROUP STRATEGY</small><h3>BUILD A MOTOR GROUP</h3>'+
      '<p>Prestige rank '+p.rank+'/100 · '+fmt(p.points)+'/2,000 points. '+
      (p.upcomingBranch?'Next branch milestone at Rank '+p.upcomingBranch.rank+
        ' (up to '+p.upcomingBranch.cap+' sites).':'Top branch permission tier reached.')+
      '</p></div><span>EXPANSION ROADMAP</span>'+
      '<p>Multiple independently trading branches, acquisitions and manufacturer franchises are future development stages. No site is opened and no cash is charged by this preview.</p>'+
      '<button type="button" data-page="reputation">VIEW CAREER ROADMAP ↗</button></section>';
  }
  window.MotorTradeEmpire=Object.freeze({
    MAX_POINTS,MAX_RANK,POINTS_PER_RANK,STAGES,BRANCH_STAGES,
    stats,earnedPoints,requirements,status,rankPath,pathway,render,branchBrief
  });
})();