'use strict';
/* The Motor Trade — candidate applications and structured dealership interviews.
   No employer contract or company assets exist until the player ACCEPTS an offer.
   Pure deterministic interview decisions: no random outcome rerolls on refresh.
   Candidates and applications are kept in a separate pre-employment browser save. */
(() => {
  const MC=window.MotorTradeManagerCareer;
  if(!MC)throw Error('Load manager-career.js first');
  const STORAGE_KEY='the-motor-trade-job-search-v1';
  const QUESTIONS=Object.freeze([
  {
    "id": "Q01",
    "text": "You have £35,000 available and retail demand has slowed. What's your priority?",
    "choices": [
      "Buy stock to keep the forecourt full",
      "Raise every asking price to recover margin",
      "Review ageing stock but avoid changing the plan",
      "Protect cash, review stock age and reprice only where evidence supports it"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q02",
    "text": "A top salesperson repeatedly exceeds discount authority. What do you do?",
    "choices": [
      "Ignore it because they sell cars",
      "Dismiss them without checking the transactions",
      "Speak to them but leave the limits unchanged",
      "Audit the deals, discuss the behaviour and enforce a clear authority limit"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q03",
    "text": "A customer reports a serious defect shortly after collection. What's your response?",
    "choices": [
      "Tell them used vehicles have no rights",
      "Ignore the claim until they make a formal complaint",
      "Offer a goodwill payment without investigating",
      "Investigate promptly, preserve evidence and provide the appropriate lawful remedy"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q04",
    "text": "Your technician finds an unbudgeted safety defect. What next?",
    "choices": [
      "Sell the car and deal with it later",
      "Tell the technician not to record it",
      "Approve any repair regardless of cost",
      "Stop release, assess the safety risk and authorise a costed repair or alternative disposal"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q05",
    "text": "A car has been advertised for 45 days with no serious enquiries. What's your move?",
    "choices": [
      "Wait indefinitely for the original price",
      "Spend more on adverts without measuring results",
      "Cut price immediately to below cost",
      "Review condition, market comparables, holding costs and a realistic exit price"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q06",
    "text": "An auction lot has no confirmed service history and a tight margin. What do you do?",
    "choices": [
      "Bid above guide to beat competitors",
      "Assume the history is fine",
      "Buy it but skip inspection",
      "Price the uncertainty, set a strict ceiling and walk away if it is exceeded"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q07",
    "text": "A salesperson promises a customer a delivery date the workshop cannot meet. What do you do?",
    "choices": [
      "Hide the delay until collection day",
      "Blame the workshop without checking",
      "Ask the customer to be patient without details",
      "Check the repair plan, update the customer honestly and agree a realistic handover"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q08",
    "text": "Payroll is due, but an attractive auction car would consume most cash. Which matters most?",
    "choices": [
      "Buy the car and delay wages",
      "Use customer deposits as free working capital",
      "Bid and hope it sells immediately",
      "Reserve committed payroll and other obligations before any speculative bid"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q09",
    "text": "A manager notices an unusual run of cancelled customer deposits. What next?",
    "choices": [
      "Keep the deposits as profit",
      "Ignore the cancellations if total sales are fine",
      "Tell sales to pressure every customer",
      "Review causes and refund obligations, then fix any misleading sales practices"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q10",
    "text": "Monthly sales volumes are up but operating contribution is negative. Your response?",
    "choices": [
      "Celebrate volume and expand immediately",
      "Slash every employee's wage",
      "Set higher arbitrary gross targets",
      "Analyse gross margin, preparation, payroll, commission and premises costs before setting actions"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q11",
    "text": "A vehicle has passed cosmetic prep but failed its final QC road test. Do you list it?",
    "choices": [
      "Advertise immediately",
      "Ask sales to conceal the issue",
      "Allow a test drive with a warning",
      "Hold the car until the fault is corrected and QC genuinely passes"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q12",
    "text": "A buyer recommends stock with unusually low auction estimates. What do you check?",
    "choices": [
      "Bid the full cash balance",
      "Assume every cheap car is a bargain",
      "Look only at the retail guide price",
      "Verify condition, history, fees, reconditioning cost and realistic demand"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q13",
    "text": "Customer demand is high but your one salesperson cannot serve everyone. What next?",
    "choices": [
      "Promise appointments regardless of capacity",
      "Leave customers waiting indefinitely",
      "Let the buyer abandon all buying work",
      "Review appointment capacity, service quality and whether an additional hire pays for itself"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q14",
    "text": "A staff member raises a credible complaint about a supervisor. How do you respond?",
    "choices": [
      "Ignore it because supervisors are senior",
      "Dismiss the complainant",
      "Discuss the complaint publicly with the whole team",
      "Protect confidentiality, investigate impartially and take proportionate action"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q15",
    "text": "Your dealership is missing its sales target with one week left. What do you do?",
    "choices": [
      "Sell at any loss to hit the number",
      "Record verbal agreements as completed deliveries",
      "Tell sales to mislead buyers about condition",
      "Prioritise genuinely ready stock, realistic pricing and confirmed customer follow-ups"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q16",
    "text": "A customer wants a part-exchange allowance well above trade value. What's sensible?",
    "choices": [
      "Agree it to secure any sale",
      "Pretend the allowance has no effect on margin",
      "Refuse every part-exchange",
      "Model the total deal, incoming preparation risk and cash difference before agreeing"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q17",
    "text": "Two repair quotes differ substantially. Your next step?",
    "choices": [
      "Choose the cheapest without checking scope",
      "Choose the most expensive to be safe",
      "Delay every vehicle indefinitely",
      "Compare scope, safety, timing, evidence and total cost before authorising"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q18",
    "text": "An employee's performance drops following unexpected absence. What do you do?",
    "choices": [
      "Immediately dismiss them",
      "Ignore it for months",
      "Cut pay without consultation",
      "Check wellbeing, identify support and set fair achievable expectations"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q19",
    "text": "The workshop is overloaded and ready-to-sell stock is low. Best action?",
    "choices": [
      "Keep buying to fill every storage space",
      "Skip workshop checks on incoming cars",
      "Advertise cars that are not roadworthy",
      "Control intake, prioritise bottlenecks and balance work allocation with expected sales"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q20",
    "text": "A buyer presents a car with uncertain mileage history. What would you do?",
    "choices": [
      "Advertise the lowest possible mileage",
      "Trust the seller's word without recording it",
      "Buy immediately if the price is low",
      "Verify records where possible and price and describe uncertainty transparently"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q21",
    "text": "A stock vehicle has a surprisingly high insurance category. Why does that matter?",
    "choices": [
      "It never matters in retail",
      "Hide it from buyers",
      "Raise the asking price just because it is high",
      "Consider buyer affordability and demand before deciding whether to stock it"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q22",
    "text": "A salesperson reports that an advertised specification is inaccurate. What next?",
    "choices": [
      "Leave the advert until sale",
      "Tell customers the advert is close enough",
      "Delete the customer's evidence",
      "Correct the advert, review affected enquiries and verify the rest of the stock data"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q23",
    "text": "Your owner wants an aggressive sales plan with little working capital. What do you present?",
    "choices": [
      "Promise any target without qualification",
      "Spend everything on inventory",
      "Argue that targets don't matter",
      "Present cash scenarios, stock-turn assumptions, risk limits and measurable milestones"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q24",
    "text": "An auction vendor offers you a private payment for buying their lot. Your response?",
    "choices": [
      "Accept it quietly",
      "Negotiate a larger payment",
      "Tell the vendor to send it after purchase",
      "Reject the conflict, document it and report it through proper channels"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q25",
    "text": "A customer asks to take a vehicle before a known safety recall is checked. What do you do?",
    "choices": [
      "Hand it over to hit month-end sales",
      "Ask them not to mention the recall",
      "Have them sign a waiver and ignore it",
      "Check recall requirements and ensure the car is safe and compliant before release"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q26",
    "text": "Your opening team is small and a salesperson wants to hire a friend. What matters most?",
    "choices": [
      "Hire instantly to keep morale high",
      "Reject all referrals automatically",
      "Choose whoever is cheapest",
      "Use a fair recruitment process, role requirements and an affordability check"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q27",
    "text": "Three customers are enquiring about the same car. What is the fairest approach?",
    "choices": [
      "Take non-refundable deposits from all three",
      "Promise the vehicle to everyone",
      "Let staff sell it to their favourite buyer",
      "Follow a documented reservation policy and communicate availability accurately"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q28",
    "text": "A supplier consistently delivers parts late. What do you change?",
    "choices": [
      "Keep relying on them without review",
      "Stop repairing cars entirely",
      "Promise customers faster delivery anyway",
      "Measure service levels, establish alternative suppliers and set realistic workshop dates"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q29",
    "text": "A car looks profitable on paper, but prep costs keep rising. What now?",
    "choices": [
      "Keep spending because the original budget is sunk",
      "Write off costs from the ledger",
      "Ignore the job until month-end",
      "Reforecast total investment and choose a rational finish, outsource or disposal route"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q30",
    "text": "A colleague suggests hiding a failed MOT advisory to close a deal. Your response?",
    "choices": [
      "Do it to meet the target",
      "Remove the paperwork",
      "Tell only the salesperson",
      "Correct the records, disclose material facts and stop inappropriate pressure"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q31",
    "text": "A junior salesperson makes a costly but honest mistake. How do you handle it?",
    "choices": [
      "Dismiss them without discussion",
      "Publicly shame them",
      "Ignore it and repeat the risk",
      "Investigate impact, coach the employee and strengthen the process"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q32",
    "text": "A promotion would raise volume but sharply increase premises costs. What do you test?",
    "choices": [
      "Expand immediately for prestige",
      "Assume all new spaces will be full",
      "Ignore the higher overheads",
      "Forecast realistic stock throughput, costs and downside cash reserves"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q33",
    "text": "A buyer argues that retail valuation websites guarantee resale price. What do you say?",
    "choices": [
      "Accept the guarantee",
      "Use the highest advertised price as proof",
      "Pay based only on the web headline",
      "Treat estimates as guidance and cross-check local demand, condition and transaction costs"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q34",
    "text": "A customer disputes a deposit cancellation charge. What next?",
    "choices": [
      "Keep the entire deposit automatically",
      "Tell them to go to court",
      "Never look at the original agreement",
      "Review the terms, actual costs and applicable consumer protections before resolving"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q35",
    "text": "A week of weak sales follows heavy rain and fewer walk-ins. What do you do?",
    "choices": [
      "Assume your staff have failed",
      "Invent completed transactions for the report",
      "Double the advertising budget without evidence",
      "Check enquiries, appointments, conversion and channel mix before acting"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q36",
    "text": "A part arrives but the technician says it's the wrong specification. What now?",
    "choices": [
      "Fit it anyway",
      "Tell QC to approve it",
      "Charge the customer for the mistake without checking",
      "Validate the vehicle specification and replace the incorrect part before work continues"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q37",
    "text": "Your finance report shows cash is healthy but too much money sits in ageing stock. What next?",
    "choices": [
      "Acquire more prestige stock",
      "Ignore holding costs until a sale happens",
      "Drop every price by the same percentage",
      "Prioritise turnover, pricing reviews and a defined disposal policy"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q38",
    "text": "A staff member repeatedly handles customers well but has fewer sales due to fewer leads. How do you assess them?",
    "choices": [
      "Judge only total sales",
      "Replace them with the busiest salesperson",
      "Ignore performance measurement entirely",
      "Review lead allocation, conversion quality, customer outcomes and comparable opportunity"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q39",
    "text": "An owner asks you to boost profits by omitting real workshop costs. Your response?",
    "choices": [
      "Move costs to a hidden account",
      "Record them next year",
      "Only report costs on sold vehicles",
      "Keep the ledger accurate and explain the real operating result"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  },
  {
    "id": "Q40",
    "text": "A newly promoted dealership manager has a thin CV. How should they approach the first 90 days?",
    "choices": [
      "Claim experience they do not have",
      "Rebuild every department immediately",
      "Avoid asking experienced staff for help",
      "Learn the operation, set clear controls, seek feedback and deliver measurable basics"
    ],
    "points": [
      0,
      1,
      2,
      3
    ]
  }
].map(q=>Object.freeze({...q,
    choices:Object.freeze(q.choices),points:Object.freeze(q.points)})));

  const EXTRA=window.MotorTradeInterviewBank;
  if(!Array.isArray(EXTRA)||EXTRA.length!==110)
    throw Error('Load all 110 tiered interview questions before recruitment.');
  const BANK=Object.freeze([...QUESTIONS,...EXTRA]);
  if(BANK.length!==150||new Set(BANK.map(q=>q.id)).size!==150)
    throw Error('Expected 150 unique interview questions.');
  const QMAP=new Map(BANK.map(q=>[q.id,q]));
  const LEVEL_LENGTH=Object.freeze({INDEPENDENT:5,ESTABLISHED:6,REGIONAL:7,PRESTIGE:8,ELITE:10});
  const SECOND_LENGTH=Object.freeze({INDEPENDENT:0,ESTABLISHED:0,REGIONAL:3,PRESTIGE:4,ELITE:5});
  const STAGES=Object.freeze(['invited','interview','second-invited','second-interview',
    'offered','rejected','declined']);
  const copy=value=>JSON.parse(JSON.stringify(value));
  const validName=name=>typeof name==='string'&&name.length>=2&&name.length<=36&&
    name===name.trim()&&!/[<>]/.test(name);
  const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  function hash(value){
    let n=2166136261;
    for(const ch of String(value))n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;
    return n>>>0;
  }
  const shuffle=(items,seed)=>{
    const ids=items.slice();
    let state=seed||1;
    for(let i=ids.length-1;i>0;i--){
      state=(Math.imul(state,1664525)+1013904223)>>>0;
      const j=state%(i+1);
      [ids[i],ids[j]]=[ids[j],ids[i]];
    }
    return ids;
  };
  // Legacy (version 1) interviews must retain their original 40-ID
  // ordering, scoring and saved answer positions after a software update.
  function legacyQuestionSet(employerId,ordinal){
    const d=MC.dealer(employerId);
    if(!d||!integer(ordinal,1,50))return [];
    return shuffle(QUESTIONS.map(q=>q.id),hash(d.id+':'+ordinal))
      .slice(0,LEVEL_LENGTH[d.tier]);
  }
  function requiresSecond(d){
    if(!d)return false;
    if(d.tier==='ELITE')return true;
    if(d.tier==='PRESTIGE')return hash(d.id+':second-round')%2===0;
    if(d.tier==='REGIONAL')return hash(d.id+':second-round')%3===0;
    return false;
  }
  function questionPlan(employerId,ordinal){
    const d=MC.dealer(employerId);
    if(!d||!integer(ordinal,1,50))return null;
    const pools={INDEPENDENT:[[1,5]],ESTABLISHED:[[1,2],[2,4]],
      REGIONAL:[[2,2],[3,5]],PRESTIGE:[[3,2],[4,6]],
      ELITE:[[4,3],[5,7]]};
    const used=new Set();
    function pick(level,count,salt){
      const available=EXTRA.filter(q=>q.level===level&&!used.has(q.id));
      const ordered=shuffle(available.map(q=>q.id),
        hash(d.id+':'+ordinal+':'+level+':'+salt));
      const selected=[],categories=new Set();
      for(const id of ordered){
        const category=QMAP.get(id).category;
        if(!categories.has(category)){selected.push(id);categories.add(category);}
        if(selected.length===count)break;
      }
      for(const id of ordered){
        if(selected.length>=count)break;
        if(!selected.includes(id))selected.push(id);
      }
      if(selected.length!==count)throw Error('Interview question pool exhausted.');
      selected.forEach(id=>used.add(id));
      return selected;
    }
    const firstIds=pools[d.tier].flatMap(([level,count])=>pick(level,count,'first'));
    const secondIds=!requiresSecond(d)?[]:
      d.tier==='REGIONAL'?pick(3,SECOND_LENGTH.REGIONAL,'second'):
      d.tier==='PRESTIGE'?pick(4,SECOND_LENGTH.PRESTIGE,'second'):
      [...pick(5,3,'second-elite'),...pick(4,2,'second-elite')];
    return {firstIds,secondIds,
      rounds:secondIds.length?2:1,tier:d.tier};
  }
  function displayQuestion(id,employerId){
    const q=QMAP.get(id);
    if(!q)return null;
    const start=hash(id+':'+employerId)%4;
    const order=[0,1,2,3].map(i=>(i+start)%4);
    if(hash(employerId+':'+id)%2)order.reverse();
    return {id:q.id,text:q.text,options:order.map(i=>q.choices[i]),
      topic:q.category||'management',level:q.level||1};
  }
  function pointsFor(id,employerId,choice){
    const q=QMAP.get(id);
    if(!q||!integer(choice,0,3))return null;
    const start=hash(id+':'+employerId)%4;
    const order=[0,1,2,3].map(i=>(i+start)%4);
    if(hash(employerId+':'+id)%2)order.reverse();
    return q.points[order[choice]];
  }
  function screenScore(candidate,d){
    const cv=candidate.cv;
    const qualification=cv.qualification==='gcse'?0:
      cv.qualification==='business-level3'?5:3;
    const roleBoost=['junior-sales','buying-assistant'].includes(cv.previousRole)?5:2;
    return Math.max(0,Math.min(100,40+cv.experienceYears*7+
      qualification+roleBoost-(d.monthlyTarget-2)*5));
  }
  function initial(name,cv){
    if(!validName(name)||!MC.cvValid(cv))return null;
    return {version:2,candidate:{name,cv:copy(cv)},attempts:[],
      activeId:null};
  }
  const current=state=>state?.attempts?.find(a=>a.id===state.activeId)||null;
  function apply(state,employerId){
    if(!valid(state))return {ok:false,message:'The candidate application is not valid.'};
    const d=MC.dealer(employerId);
    if(!MC.eligible(d,MC.START_REPUTATION))
      return {ok:false,message:'Your current reputation does not qualify for this vacancy.'};
    if(state.attempts.some(a=>a.employerId===d.id))
      return {ok:false,message:'You have already applied to this employer for the current vacancy.'};
    const active=current(state);
    if(active&&['invited','interview','second-invited','second-interview','offered'].includes(active.stage))
      return {ok:false,message:'Complete the current application process first.'};
    const ordinal=state.attempts.length+1,cvScore=screenScore(state.candidate,d);
    const shortlisted=cvScore>=48;
    const plan=state.version===1?
      {firstIds:legacyQuestionSet(d.id,ordinal),secondIds:[]}:
      questionPlan(d.id,ordinal);
    const attempt={id:'A'+ordinal,employerId:d.id,ordinal,screenScore:cvScore,
      stage:shortlisted?'invited':'rejected',
      questionIds:plan.firstIds,answers:[],
      ...(state.version===2?{secondQuestionIds:plan.secondIds,secondAnswers:[],firstResult:null}:{}),
      result:shortlisted?null:{outcome:'rejected',reason:'cv',interviewPercent:null,
        composite:null,threshold:null}};
    state.attempts.push(attempt);
    state.activeId=attempt.id;
    return {ok:true,shortlisted,attempt,
      message:shortlisted?
        'Your CV was shortlisted. Attend the first-stage management interview.':
        'Application unsuccessful at CV screening. Try an employer with a lower sales target.'};
  }
  function beginInterview(state){
    const a=current(state);
    if(!a||!['invited','second-invited'].includes(a.stage))
      return {ok:false,message:'No interview invitation is available.'};
    if(a.stage==='second-invited'&&state.version!==2)
      return {ok:false,message:'Second-round interview requires a current application.'};
    a.stage=a.stage==='invited'?'interview':'second-interview';
    return {ok:true,attempt:a};
  }
  function percent(answers,ids,employerId){
    const scored=ids.map((id,i)=>pointsFor(id,employerId,answers[i]));
    if(scored.some(x=>!integer(x,0,3))||!ids.length)return null;
    return Math.round(100*scored.reduce((n,v)=>n+v,0)/(3*ids.length));
  }
  function scoreInfo(candidate,d,screen,interviewPercent,version=2){
    // Older pending v1 applications retain their exact historical score.
    // New high-tier plans use a screened baseline; they are still locked to
    // entry-level applicants until the proper career mobility system ships.
    const reputationFit=version===1?
      Math.max(0,Math.min(100,60+(MC.START_REPUTATION-d.requiredReputation)*2)):
      Math.max(55,Math.min(100,60+(MC.START_REPUTATION-d.requiredReputation)*2));
    const previousPerformance=55;
    const composite=Math.round(.4*interviewPercent+.25*reputationFit+
      .2*previousPerformance+.15*screen);
    const threshold=version===1?49+Math.max(0,d.monthlyTarget-2)*5:
      Math.min(70,49+Math.max(0,d.monthlyTarget-2)*5);
    return {interviewPercent,composite,threshold};
  }
  function firstScore(state,a){
    const d=MC.dealer(a.employerId);
    const p=percent(a.answers,a.questionIds,d.id);
    return p===null?null:scoreInfo(state.candidate,d,a.screenScore,p,state.version);
  }
  function finalScore(state,a){
    const d=MC.dealer(a.employerId),first=firstScore(state,a);
    if(!first)return null;
    if(state.version===1||!a.secondQuestionIds.length)
      return {...first,secondRoundPercent:null,rounds:1};
    const second=percent(a.secondAnswers,a.secondQuestionIds,d.id);
    if(second===null)return null;
    const combined=Math.round(.6*first.interviewPercent+.4*second);
    return {...scoreInfo(state.candidate,d,a.screenScore,combined,state.version),
      secondRoundPercent:second,rounds:2};
  }
  function firstPass(result){
    return !!result&&result.composite>=result.threshold&&result.interviewPercent>=45;
  }
  function resultFor(state,a){
    const result=finalScore(state,a);
    if(!result)return null;
    const passed=firstPass(result)&&(result.rounds===1||result.secondRoundPercent>=50);
    return {outcome:passed?'offered':'rejected',reason:'interview',
      interviewPercent:result.interviewPercent,composite:result.composite,
      threshold:result.threshold,
      ...(state.version===2?{rounds:result.rounds,
        secondRoundPercent:result.secondRoundPercent}:{} )};
  }
  function answer(state,choice){
    const a=current(state);
    if(!a||!['interview','second-interview'].includes(a.stage))
      return {ok:false,message:'No active interview.'};
    if(!integer(choice,0,3))return {ok:false,message:'Choose one of four interview answers.'};
    const second=a.stage==='second-interview',responses=second?a.secondAnswers:a.answers;
    const ids=second?a.secondQuestionIds:a.questionIds;
    if(responses.length>=ids.length)return {ok:false,message:'Interview round already completed.'};
    responses.push(choice);
    if(responses.length<ids.length)return {ok:true,done:false,index:responses.length};
    if(!second){
      const gate=firstScore(state,a);
      if(!gate)return {ok:false,message:'Unable to score the interview.'};
      if(state.version===2)a.firstResult=gate;
      if(!firstPass(gate)){
        a.result={outcome:'rejected',reason:'interview',
          interviewPercent:gate.interviewPercent,composite:gate.composite,
          threshold:gate.threshold,
          ...(state.version===2?{rounds:1,secondRoundPercent:null}:{})};
        a.stage='rejected';
        return {ok:true,done:true,result:a.result};
      }
      if(state.version===2&&a.secondQuestionIds.length){
        a.stage='second-invited';
        return {ok:true,done:false,secondRound:true};
      }
    }
    a.result=resultFor(state,a);
    a.stage=a.result.outcome==='offered'?'offered':'rejected';
    return {ok:true,done:true,result:a.result};
  }
  function decline(state){
    const a=current(state);
    if(!a||a.stage!=='offered')return {ok:false,message:'No offer to decline.'};
    a.stage='declined';
    return {ok:true};
  }
  function snapshot(state){
    const a=current(state);
    if(!a||a.stage!=='offered'||!valid(state))return null;
    return {employerId:a.employerId,interviewPercent:a.result.interviewPercent,
      composite:a.result.composite,threshold:a.result.threshold,
      questionsAsked:a.questionIds.length+(a.secondQuestionIds?.length||0),
      ...(state.version===2?{rounds:a.result.rounds,
        secondRoundPercent:a.result.secondRoundPercent}:{}),
      applications:state.attempts.length,
      rejected:state.attempts.filter(x=>x.stage==='rejected').length};
  }
  function validCommon(state){
    if(!state||![1,2].includes(state.version)||!state.candidate||
      !validName(state.candidate.name)||!MC.cvValid(state.candidate.cv)||
      !Array.isArray(state.attempts)||state.attempts.length>20)return false;
    if(state.activeId!==null&&typeof state.activeId!=='string')return false;
    const seen=new Set();
    for(let i=0;i<state.attempts.length;i++){
      const a=state.attempts[i],d=MC.dealer(a?.employerId);
      if(!d||!MC.eligible(d,MC.START_REPUTATION)||seen.has(a.employerId)||
        a.ordinal!==i+1||a.id!=='A'+(i+1)||
        a.screenScore!==screenScore(state.candidate,d)||
        !STAGES.includes(a.stage)||!Array.isArray(a.questionIds)||
        !Array.isArray(a.answers)||a.answers.length>a.questionIds.length||
        !a.answers.every(c=>integer(c,0,3)))return false;
      seen.add(a.employerId);
    }
    if(state.attempts.length===0)return state.activeId===null;
    return state.activeId===null||
      state.activeId===state.attempts[state.attempts.length-1].id;
  }
  function validLegacy(state){
    if(!validCommon(state))return false;
    for(const a of state.attempts){
      if(a.questionIds.join(',')!==legacyQuestionSet(a.employerId,a.ordinal).join(',')||
        !['invited','interview','offered','rejected','declined'].includes(a.stage))return false;
      const shortlist=a.screenScore>=48,done=a.answers.length===a.questionIds.length;
      if(!shortlist&&(a.stage!=='rejected'||a.answers.length||
        a.result?.reason!=='cv'))return false;
      if(shortlist&&a.stage==='invited'&&(a.answers.length||a.result!==null))return false;
      if(a.stage==='interview'&&(!shortlist||done||a.result!==null))return false;
      if(['offered','declined'].includes(a.stage)&&(!shortlist||!done))return false;
      if(a.stage==='rejected'&&shortlist&&!done)return false;
      if(shortlist&&done){
        const r=resultFor(state,a);
        if(!r||JSON.stringify(r)!==JSON.stringify(a.result))return false;
        if(['offered','declined'].includes(a.stage)&&r.outcome!=='offered')return false;
        if(a.stage==='rejected'&&r.outcome!=='rejected')return false;
      }
    }
    return true;
  }
  function validV2(state){
    if(!validCommon(state))return false;
    for(const a of state.attempts){
      const plan=questionPlan(a.employerId,a.ordinal);
      if(a.questionIds.join(',')!==plan.firstIds.join(',')||
        !Array.isArray(a.secondQuestionIds)||
        a.secondQuestionIds.join(',')!==plan.secondIds.join(',')||
        !Array.isArray(a.secondAnswers)||
        a.secondAnswers.length>a.secondQuestionIds.length||
        !a.secondAnswers.every(x=>integer(x,0,3)))return false;
      const shortlist=a.screenScore>=48,firstDone=a.answers.length===a.questionIds.length,
        secondDone=a.secondAnswers.length===a.secondQuestionIds.length;
      if(!shortlist){
        if(a.stage!=='rejected'||a.answers.length||a.secondAnswers.length||
          a.result?.reason!=='cv'||a.firstResult!==null)return false;
        continue;
      }
      if(a.stage==='invited'){
        if(a.answers.length||a.secondAnswers.length||a.firstResult!==null||a.result!==null)return false;
        continue;
      }
      if(a.stage==='interview'){
        if(firstDone||a.firstResult!==null||a.secondAnswers.length||a.result!==null)return false;
        continue;
      }
      if(!firstDone)return false;
      const gate=firstScore(state,a),passes=firstPass(gate);
      if(!gate||JSON.stringify(a.firstResult)!==JSON.stringify(gate))return false;
      if(a.stage==='second-invited'||a.stage==='second-interview'){
        if(!passes||!a.secondQuestionIds.length||a.result!==null)return false;
        if(a.stage==='second-invited'&&a.secondAnswers.length)return false;
        if(a.stage==='second-interview'&&secondDone)return false;
        continue;
      }
      if(!['offered','rejected','declined'].includes(a.stage))return false;
      if(!passes){
        if(a.stage!=='rejected'||a.secondAnswers.length||
          JSON.stringify(a.result)!==JSON.stringify({
            outcome:'rejected',reason:'interview',
            interviewPercent:gate.interviewPercent,composite:gate.composite,
            threshold:gate.threshold,rounds:1,secondRoundPercent:null
          }))return false;
        continue;
      }
      if(!secondDone)return false;
      const result=resultFor(state,a);
      if(!result||JSON.stringify(a.result)!==JSON.stringify(result))return false;
      if(['offered','declined'].includes(a.stage)&&result.outcome!=='offered')return false;
      if(a.stage==='rejected'&&result.outcome!=='rejected')return false;
    }
    return true;
  }
  function valid(state){
    return state?.version===1?validLegacy(state):validV2(state);
  }
  function read(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return null;
      const candidate=JSON.parse(raw);
      return valid(candidate)?candidate:null;
    }catch(_){return null;}
  }
  function save(state){
    if(!valid(state))return false;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}
    catch(_){return false;}
  }
  function clear(){
    try{localStorage.removeItem(STORAGE_KEY);return true;}catch(_){return false;}
  }
  window.MotorTradeRecruitment=Object.freeze({
    QUESTIONS:BANK,LEVEL_LENGTH,SECOND_LENGTH,questionPlan,requiresSecond,
    initial,valid,current,apply,beginInterview,answer,decline,snapshot,
    displayQuestion,pointsFor,read,save,clear,screenScore
  });
})();