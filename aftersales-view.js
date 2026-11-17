'use strict';
/* Compact post-handover case desk; only explicit owner actions spend cash. */
(() => {
  const money=n=>new Intl.NumberFormat('en-GB',{
    style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function caseCard(state,c){
    const sold=state.sold.find(v=>v.id===c.id);
    const days=state.day-c.openedDay,waiting=c.status==='inspection';
    const done=c.status==='resolved';
    const status=done?'CLOSED · REPAIR COMPLETE':
      waiting?'DIAGNOSIS BOOKED':'OWNER ACTION REQUIRED';
    const risk=done?'RESOLVED':
      days>=7?'OVERDUE · CUSTOMER TRUST AT RISK':'RESPONSE DUE';
    return '<article class="ac-case'+(done?' ac-case-resolved':'')+'">'+
      '<div class="ac-case-top"><div><small>STOCK '+c.id+' · CLAIM DAY '+c.openedDay+
      '</small><h4>'+esc(sold?.title||'Sold vehicle')+'</h4></div>'+
      '<span class="ac-status">'+status+'</span></div>'+
      '<div class="ac-case-issue"><strong>'+esc(c.issue)+'</strong>'+
      '<span>'+risk+' · '+days+' DAYS SINCE FIRST REPORT</span></div>'+
      '<div class="ac-case-numbers"><div><small>CURRENT REPAIR ESTIMATE</small>'+
        '<strong>'+money(c.quote)+'</strong></div>'+
      '<div><small>INSPECTION ALREADY PAID</small><strong>'+money(c.inspectionPaid)+'</strong></div>'+
      '<div><small>TRUST REVIEWS</small><strong>'+c.penalties+' / 3</strong></div></div>'+
      (done?'<p class="ac-case-result">RECTIFIED · '+money(c.paid)+
        ' repair paid on day '+c.resolvedDay+'. This cost is booked outside the vehicle\'s original gross margin.</p>':
        waiting?'<p class="ac-case-wait">Independent diagnosis due on DAY '+
          c.inspectionUntil+'. The original customer issue remains open during diagnosis.</p>':
        '<div class="ac-case-actions">'+
          '<button type="button" class="trade-button" data-action="aftersales-rectify" data-id="'+c.id+
          '">AUTHORISE CUSTOMER REPAIR · '+money(c.quote)+'</button>'+
          (c.inspectionUsed?'': '<button type="button" class="trade-button trade-button-secondary" '+
            'data-action="aftersales-inspect" data-id="'+c.id+'">INDEPENDENT DIAGNOSIS · £60</button>')+
        '</div>')+
      '</article>';
  }
  function render(state,E){
    const cases=state.afterSalesCases||[];
    const stats=E.aftersales.stats(state);
    const open=cases.filter(c=>c.status!=='resolved')
      .sort((a,b)=>a.openedDay-b.openedDay||a.id-b.id);
    const finished=cases.filter(c=>c.status==='resolved')
      .sort((a,b)=>b.resolvedDay-a.resolvedDay||b.id-a.id).slice(0,4);
    const summary='<div class="ac-overview"><div><h3>AFTERSALES · CUSTOMER CARE</h3>'+
      '<p>Claims arise only after completed handovers. Workshop QC and supervision influence the risk; a passed QC never guarantees zero issues.</p></div>'+
      '<div class="ac-kpis"><div><small>OPEN CASES</small><strong>'+stats.open+'</strong></div>'+
      '<div><small>ESTIMATED REPAIR EXPOSURE</small><strong>'+money(stats.potentialCost)+'</strong></div>'+
      '<div><small>TOTAL CASE COSTS PAID</small><strong>'+money(stats.paid)+'</strong></div></div></div>';
    const casesHtml=open.length?
      '<div class="ac-register-head">CASES NEEDING MANAGEMENT ACTION · '+open.length+'</div>'+
      '<div class="ac-cases">'+open.map(c=>caseCard(state,c)).join('')+'</div>':
      '<p class="ac-none">No unresolved customer issues. Continue retail handovers and monitor this desk as trading days progress.</p>';
    const archive=finished.length?
      '<details class="ac-archive"><summary>RECENTLY RESOLVED CASES · '+finished.length+
        '</summary><div class="ac-cases">'+finished.map(c=>caseCard(state,c)).join('')+'</div></details>':'';
    return '<section class="ac-desk" aria-label="Post-sale customer care">'+
      summary+casesHtml+archive+
      '<p class="ac-policy">FICTIONAL GAME MECHANIC · The amount shown is a repair estimate, not an automatic cash charge. '+
      'A £60 diagnosis takes two game days and may narrow the estimate, but does not close a genuine complaint. '+
      'Unresolved cases can reduce reputation after 7, 14 and 21 days. '+
      'This simplified simulation does not describe or replace UK consumer protection rights.</p></section>';
  }
  window.MotorTradeAfterSalesView=Object.freeze({render});
})();
