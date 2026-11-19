'use strict';
/* The Motor Trade — fictional 50-employer manager career, phase 1.
   Manager reputation and board performance are separate from customer trust.
   Companies beyond the first employer are catalogue entries until the job market
   and persistent AI-dealership economies ship in later phases. */
(() => {
  const START_REPUTATION = 5;
  const CAREER_START_UTC=Date.UTC(2026,10,9);
  const DAY_MS=86400000;
  const BACKGROUNDS=Object.freeze({
    'sales-assistant':'Sales Assistant',
    'junior-sales':'Junior Sales Executive',
    'buying-assistant':'Vehicle Buying Assistant',
    'service-admin':'Service Administrator',
    'vehicle-prep':'Vehicle Preparation Assistant'
  });
  const QUALIFICATIONS=Object.freeze({
    'gcse':'GCSEs / equivalent',
    'sales-level2':'Level 2 Sales / Customer Service',
    'vehicle-level2':'Level 2 Motor Vehicle',
    'business-level3':'Level 3 Business Administration'
  });
  const DEFAULT_CV=Object.freeze({
    dateOfBirth:'2001-06-15',hometown:'Birmingham',
    previousRole:'sales-assistant',experienceYears:2,qualification:'gcse'
  });
  const DEALERS = Object.freeze([
  {
    "id": "dealer-01",
    "name": "Kingsway Budget Cars",
    "city": "Birmingham",
    "focus": "Value hatchbacks",
    "openingCash": 34000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-02",
    "name": "Riverside Motor Centre",
    "city": "Nottingham",
    "focus": "Family saloons",
    "openingCash": 38000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-03",
    "name": "Northgate Car Sales",
    "city": "Leeds",
    "focus": "Affordable used cars",
    "openingCash": 42000,
    "monthlyTarget": 3,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-04",
    "name": "Eastfield Autos",
    "city": "Sheffield",
    "focus": "Entry-level commuters",
    "openingCash": 32000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-05",
    "name": "Beacon Road Motors",
    "city": "Bristol",
    "focus": "Practical family cars",
    "openingCash": 46000,
    "monthlyTarget": 3,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-06",
    "name": "Crown Lane Cars",
    "city": "Leicester",
    "focus": "Small hatchbacks",
    "openingCash": 36000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-07",
    "name": "Westbridge Trade Cars",
    "city": "Coventry",
    "focus": "High-mileage stock",
    "openingCash": 40000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-08",
    "name": "Moorland Vehicle Centre",
    "city": "Derby",
    "focus": "Budget estate cars",
    "openingCash": 44000,
    "monthlyTarget": 3,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-09",
    "name": "Parkside Independent Motors",
    "city": "Manchester",
    "focus": "City runabouts",
    "openingCash": 35000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-10",
    "name": "Bridge Street Autos",
    "city": "Cardiff",
    "focus": "First-time drivers",
    "openingCash": 37000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-11",
    "name": "South Quay Motor Sales",
    "city": "Plymouth",
    "focus": "Affordable SUVs",
    "openingCash": 41000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-12",
    "name": "Redhill Used Vehicles",
    "city": "Newcastle",
    "focus": "Value diesel cars",
    "openingCash": 39000,
    "monthlyTarget": 3,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-13",
    "name": "Oakfield Car Exchange",
    "city": "Stoke-on-Trent",
    "focus": "Part-exchange specialists",
    "openingCash": 33000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-14",
    "name": "Station Road Motor Co",
    "city": "Wolverhampton",
    "focus": "Local trade-ins",
    "openingCash": 45000,
    "monthlyTarget": 3,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-15",
    "name": "Harbour Lane Cars",
    "city": "Portsmouth",
    "focus": "Compact family cars",
    "openingCash": 37000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-16",
    "name": "Mersey Vale Motors",
    "city": "Liverpool",
    "focus": "Value-market used cars",
    "openingCash": 43000,
    "monthlyTarget": 3,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-17",
    "name": "West London Trade Cars",
    "city": "London",
    "focus": "Urban hatchbacks and part-exchanges",
    "openingCash": 46000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-18",
    "name": "Granite Road Motors",
    "city": "Aberdeen",
    "focus": "Rural used vehicles",
    "openingCash": 47000,
    "monthlyTarget": 3,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-19",
    "name": "Greenbank Car Warehouse",
    "city": "Norwich",
    "focus": "Used small cars",
    "openingCash": 42000,
    "monthlyTarget": 3,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-20",
    "name": "Hillcrest Vehicle Sales",
    "city": "Swansea",
    "focus": "Reliable commuters",
    "openingCash": 39000,
    "monthlyTarget": 2,
    "tier": "INDEPENDENT",
    "tierLabel": "Entry-level independents",
    "requiredReputation": 0,
    "stars": 1
  },
  {
    "id": "dealer-21",
    "name": "Stonebrook Motor Company",
    "city": "Birmingham",
    "focus": "Established used-car retail",
    "openingCash": 64000,
    "monthlyTarget": 4,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-22",
    "name": "Willow Park Automotive",
    "city": "Oxford",
    "focus": "Premium family cars",
    "openingCash": 72000,
    "monthlyTarget": 4,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-23",
    "name": "Horizon Cars & Vans",
    "city": "Leeds",
    "focus": "Mixed car and van trade",
    "openingCash": 69000,
    "monthlyTarget": 4,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-24",
    "name": "Hampton Road Auto Group",
    "city": "Bristol",
    "focus": "Multi-brand pre-owned",
    "openingCash": 76000,
    "monthlyTarget": 4,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-25",
    "name": "Central Counties Motors",
    "city": "Derby",
    "focus": "Family cars and SUVs",
    "openingCash": 67000,
    "monthlyTarget": 4,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-26",
    "name": "Fairview Vehicle Group",
    "city": "Nottingham",
    "focus": "Mainstream retail",
    "openingCash": 71000,
    "monthlyTarget": 4,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-27",
    "name": "Northern Gate Automotive",
    "city": "Manchester",
    "focus": "Higher-volume used cars",
    "openingCash": 81000,
    "monthlyTarget": 5,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-28",
    "name": "Broadstone Motor Retail",
    "city": "Cardiff",
    "focus": "Cross-brand trade-ins",
    "openingCash": 74000,
    "monthlyTarget": 4,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-29",
    "name": "Cedarvale Cars",
    "city": "Leicester",
    "focus": "Approved used-style stock",
    "openingCash": 65000,
    "monthlyTarget": 4,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-30",
    "name": "Westhaven Auto Retail",
    "city": "Exeter",
    "focus": "Family and leisure cars",
    "openingCash": 70000,
    "monthlyTarget": 4,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-31",
    "name": "Silverbrook Motors",
    "city": "Reading",
    "focus": "Higher-value used cars",
    "openingCash": 83000,
    "monthlyTarget": 5,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-32",
    "name": "Lancaster Road Automotive",
    "city": "Preston",
    "focus": "Mixed independent stock",
    "openingCash": 73000,
    "monthlyTarget": 4,
    "tier": "ESTABLISHED",
    "tierLabel": "Established local dealers",
    "requiredReputation": 25,
    "stars": 2
  },
  {
    "id": "dealer-33",
    "name": "Calder Automotive Group",
    "city": "Leeds",
    "focus": "Regional dealer network",
    "openingCash": 115000,
    "monthlyTarget": 5,
    "tier": "REGIONAL",
    "tierLabel": "Regional dealer groups",
    "requiredReputation": 50,
    "stars": 3
  },
  {
    "id": "dealer-34",
    "name": "Northline Motor Holdings",
    "city": "Newcastle",
    "focus": "Volume dealership operations",
    "openingCash": 123000,
    "monthlyTarget": 5,
    "tier": "REGIONAL",
    "tierLabel": "Regional dealer groups",
    "requiredReputation": 50,
    "stars": 3
  },
  {
    "id": "dealer-35",
    "name": "Cotswold Auto Group",
    "city": "Cheltenham",
    "focus": "Executive used cars",
    "openingCash": 129000,
    "monthlyTarget": 5,
    "tier": "REGIONAL",
    "tierLabel": "Regional dealer groups",
    "requiredReputation": 50,
    "stars": 3
  },
  {
    "id": "dealer-36",
    "name": "Bridgepoint Vehicle Group",
    "city": "Birmingham",
    "focus": "Multi-site retail",
    "openingCash": 118000,
    "monthlyTarget": 5,
    "tier": "REGIONAL",
    "tierLabel": "Regional dealer groups",
    "requiredReputation": 50,
    "stars": 3
  },
  {
    "id": "dealer-37",
    "name": "Mersey National Motors",
    "city": "Liverpool",
    "focus": "Regional volume sales",
    "openingCash": 133000,
    "monthlyTarget": 6,
    "tier": "REGIONAL",
    "tierLabel": "Regional dealer groups",
    "requiredReputation": 50,
    "stars": 3
  },
  {
    "id": "dealer-38",
    "name": "Westfield Automotive Group",
    "city": "Bristol",
    "focus": "SUVs and premium used",
    "openingCash": 125000,
    "monthlyTarget": 5,
    "tier": "REGIONAL",
    "tierLabel": "Regional dealer groups",
    "requiredReputation": 50,
    "stars": 3
  },
  {
    "id": "dealer-39",
    "name": "Whitestone Motor Holdings",
    "city": "Sheffield",
    "focus": "Established mixed franchises",
    "openingCash": 136000,
    "monthlyTarget": 6,
    "tier": "REGIONAL",
    "tierLabel": "Regional dealer groups",
    "requiredReputation": 50,
    "stars": 3
  },
  {
    "id": "dealer-40",
    "name": "South Coast Retail Group",
    "city": "Southampton",
    "focus": "Regional retail chain",
    "openingCash": 143000,
    "monthlyTarget": 6,
    "tier": "REGIONAL",
    "tierLabel": "Regional dealer groups",
    "requiredReputation": 50,
    "stars": 3
  },
  {
    "id": "dealer-41",
    "name": "Peninsula Automotive",
    "city": "Cardiff",
    "focus": "Regional premium cars",
    "openingCash": 131000,
    "monthlyTarget": 5,
    "tier": "REGIONAL",
    "tierLabel": "Regional dealer groups",
    "requiredReputation": 50,
    "stars": 3
  },
  {
    "id": "dealer-42",
    "name": "Thames Valley Auto Group",
    "city": "Reading",
    "focus": "Executive and prestige",
    "openingCash": 149000,
    "monthlyTarget": 6,
    "tier": "REGIONAL",
    "tierLabel": "Regional dealer groups",
    "requiredReputation": 50,
    "stars": 3
  },
  {
    "id": "dealer-43",
    "name": "British Meridian Motors",
    "city": "London",
    "focus": "National premium network",
    "openingCash": 230000,
    "monthlyTarget": 7,
    "tier": "PRESTIGE",
    "tierLabel": "Prestige motor groups",
    "requiredReputation": 75,
    "stars": 4
  },
  {
    "id": "dealer-44",
    "name": "Crownline Automotive Group",
    "city": "Manchester",
    "focus": "Premium vehicle retail",
    "openingCash": 250000,
    "monthlyTarget": 7,
    "tier": "PRESTIGE",
    "tierLabel": "Prestige motor groups",
    "requiredReputation": 75,
    "stars": 4
  },
  {
    "id": "dealer-45",
    "name": "Cavendish Motor Holdings",
    "city": "Birmingham",
    "focus": "Executive and luxury",
    "openingCash": 270000,
    "monthlyTarget": 7,
    "tier": "PRESTIGE",
    "tierLabel": "Prestige motor groups",
    "requiredReputation": 75,
    "stars": 4
  },
  {
    "id": "dealer-46",
    "name": "Northstar Prestige Retail",
    "city": "Leeds",
    "focus": "Performance and prestige",
    "openingCash": 260000,
    "monthlyTarget": 7,
    "tier": "PRESTIGE",
    "tierLabel": "Prestige motor groups",
    "requiredReputation": 75,
    "stars": 4
  },
  {
    "id": "dealer-47",
    "name": "Westminster Motor Group",
    "city": "London",
    "focus": "High-value multi-site trade",
    "openingCash": 290000,
    "monthlyTarget": 8,
    "tier": "PRESTIGE",
    "tierLabel": "Prestige motor groups",
    "requiredReputation": 75,
    "stars": 4
  },
  {
    "id": "dealer-48",
    "name": "Sovereign Automotive UK",
    "city": "Bristol",
    "focus": "Luxury motor retail",
    "openingCash": 310000,
    "monthlyTarget": 8,
    "tier": "PRESTIGE",
    "tierLabel": "Prestige motor groups",
    "requiredReputation": 75,
    "stars": 4
  },
  {
    "id": "dealer-49",
    "name": "Sterling Bespoke Motors",
    "city": "London",
    "focus": "Elite collector cars",
    "openingCash": 470000,
    "monthlyTarget": 9,
    "tier": "ELITE",
    "tierLabel": "Elite luxury dealerships",
    "requiredReputation": 90,
    "stars": 5
  },
  {
    "id": "dealer-50",
    "name": "Aurelia Grand Automotive",
    "city": "Edinburgh",
    "focus": "Ultra-premium and specialist",
    "openingCash": 510000,
    "monthlyTarget": 9,
    "tier": "ELITE",
    "tierLabel": "Elite luxury dealerships",
    "requiredReputation": 90,
    "stars": 5
  }
].map(d=>Object.freeze(d)));
  const BY_ID = new Map(DEALERS.map(d=>[d.id,d]));
  if(DEALERS.length!==50||BY_ID.size!==50)throw new Error('Manager employer catalogue must contain 50 distinct dealers.');
  const whole=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  const validName=n=>typeof n==='string'&&n.trim().length>=2&&n.trim().length<=36&&n===n.trim()&&!/[<>]/.test(n);
  const dealer=id=>BY_ID.get(id)||null;
  const eligible=(entry,rep=START_REPUTATION)=>!!entry&&whole(rep,0,100)&&rep>=entry.requiredReputation;
  const firstJobs=()=>DEALERS.filter(d=>eligible(d,START_REPUTATION));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  // Age derives from DOB and the in-game date, never a disconnected age field.
  function ageAt(dateOfBirth,day=1){
    if(typeof dateOfBirth!=='string'||!/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.test(dateOfBirth)||
      !whole(day,1,36500))return null;
    const [year,month,date]=dateOfBirth.split('-').map(Number);
    const born=new Date(Date.UTC(year,month-1,date));
    if(born.toISOString().slice(0,10)!==dateOfBirth)return null;
    const now=new Date(CAREER_START_UTC+(day-1)*DAY_MS);
    let age=now.getUTCFullYear()-year;
    if(now.getUTCMonth()+1<month||
       (now.getUTCMonth()+1===month&&now.getUTCDate()<date))age--;
    return age;
  }
  const safeText=v=>typeof v==='string'&&v===v.trim()&&v.length>=2&&
    v.length<=40&&!/[<>]/.test(v)&&!v.includes(String.fromCharCode(10))&&
    !v.includes(String.fromCharCode(13));
  const cvValid=cv=>{
    if(!cv||typeof cv!=='object'||Array.isArray(cv))return false;
    const age=ageAt(cv.dateOfBirth,1);
    return age!==null&&age>=21&&age<=65&&safeText(cv.hometown)&&
      Object.hasOwn(BACKGROUNDS,cv.previousRole)&&
      whole(cv.experienceYears,1,3)&&Object.hasOwn(QUALIFICATIONS,cv.qualification);
  };
  const cvCopy=cv=>({
    dateOfBirth:cv.dateOfBirth,hometown:cv.hometown,
    previousRole:cv.previousRole,experienceYears:cv.experienceYears,
    qualification:cv.qualification
  });
  function initial(name,employerId,cv=DEFAULT_CV){
    const d=dealer(employerId);
    if(!validName(name)||!d||!eligible(d)||!cvValid(cv))return null;
    return {managerName:name,reputation:START_REPUTATION,employerId:d.id,
      cv:cvCopy(cv),startedDay:1,boardConfidence:65,lastReviewMonth:0,reviews:[],
      history:[{day:1,employerId:d.id,type:'appointed'}]};
  }
  function enrol(state,managerName,employerId,cv=DEFAULT_CV){
    const profile=initial(managerName,employerId,cv);
    if(!profile||state.day!==1||state.sold.length||state.ledger.length)
      return {ok:false,message:'Choose an available entry-level dealership to start a new career.'};
    const d=dealer(employerId);
    if(state.cash!==45000||state.startingCapital!==45000)return {ok:false,message:'Unexpected opening company cash.'};
    state.name=d.name;
    state.managerCareer=profile;
    // Preserve existing £45k ledger basis; record the employer's actual opening
    // cash difference explicitly rather than altering historic balance rules.
    const difference=d.openingCash-45000;
    state.cash+=difference;
    state.ledger.push({day:1,delta:difference,
      note:'Opening employer working capital allocation: '+d.name});
    state.inboxLedgerCursor=state.ledger.length;
    window.MotorTradeMonthly.initialize(state);
    window.MotorTradePremises.sync(state);
    return {ok:true,employer:d};
  }
  function welcome(state){
    const m=state.managerCareer,d=dealer(m?.employerId);
    if(!d)return [];
    return [
      {id:1,day:1,from:'BOARD OF DIRECTORS',category:'operations',
        subject:'Your appointment · '+d.name,
        preview:'You are appointed dealership manager. Monthly board expectation: '+d.monthlyTarget+' retail handovers.',
        body:'WELCOME, '+m.managerName+'\n\nYour initial appointment as acting dealership manager of '+d.name+
          ' in '+d.city+' is confirmed. The company owns its premises, vehicles, cash and staff. Your personal reputation is separate from the dealership customer trust score.\n\n'+
          'Your first 90 game days form a probationary appointment. You have no previous manager posts on your CV, and the board expects evidence of competence rather than instant promotion.\n\n'+
          'Initial company working cash: £'+d.openingCash.toLocaleString('en-GB')+
          '. Board expectation: '+d.monthlyTarget+' completed retail handovers in a trading month and positive operating contribution. The board will review your actual monthly results.\n\n'+
          'You successfully completed the recruitment interview and accepted a management appointment. Your original CV and recruitment outcome are retained on your Manager Profile. Transfers, resignations and dismissals are planned but are not yet playable.',
        linkPage:'dashboard',read:false},
      {id:2,day:1,from:'OPERATIONS SUPERVISOR',category:'staff',
        subject:'Your opening team is ready',
        preview:'Sales, vehicle buying, workshop and supervision are staffed from Day 1.',
        body:'Your sales executive, buyer, technician and supervisor are on the company payroll. Routine retail customer handling, workshop repair scheduling, final QC and vehicle advertising run through the existing genuine simulation. You set policies and approve exceptions in the Inbox. The vehicle buyer scouts private-seller opportunities, while major acquisitions still need your authorisation.',
        linkPage:'staff',read:false},
      {id:3,day:1,from:'ACCOUNTS OFFICE',category:'accounts',
        subject:'Company opening budget · '+d.name,
        preview:'Your employer has £'+d.openingCash.toLocaleString('en-GB')+' working capital.',
        body:'The money belongs to '+d.name+', not your personal manager profile. All acquisitions, real preparation expenses, commissions, payroll and premises costs are recorded in this dealership ledger. The board reviews completed sales and operating contribution; job-market movement and personal pay will be implemented separately.',
        linkPage:'finance',read:false}
    ];
  }
  function review(state,report){
    const m=state.managerCareer;
    if(!m||!report||report.month<=m.lastReviewMonth)return null;
    const d=dealer(m.employerId);
    if(!d)return null;
    const achieved=report.soldUnits>=d.monthlyTarget&&report.operatingContribution>0;
    const delta=achieved?3:report.operatingContribution<0?-2:0;
    const confidenceDelta=achieved?7:report.operatingContribution<0?-8:-3;
    m.reputation=clamp(m.reputation+delta,0,100);
    m.boardConfidence=clamp(m.boardConfidence+confidenceDelta,0,100);
    m.lastReviewMonth=report.month;
    const result={month:report.month,units:report.soldUnits,
      target:d.monthlyTarget,contribution:report.operatingContribution,
      reputationChange:delta,confidence:m.boardConfidence,achieved};
    m.reviews.push(result);
    if(m.reviews.length>100)m.reviews.shift();
    const subject='BOARD REVIEW · Month '+report.month+' · '+(achieved?'TARGET MET':'PERFORMANCE BELOW PLAN');
    const body='Your appointment at '+d.name+' has been reviewed against real trading outcomes.\n\n'+
      'Retail handovers: '+report.soldUnits+' / '+d.monthlyTarget+' expected.\n'+
      'Operating contribution: £'+report.operatingContribution.toLocaleString('en-GB')+'.\n'+
      'Board confidence: '+m.boardConfidence+'/100.\nManager reputation: '+
      m.reputation+'/100 ('+(delta>0?'+':'')+delta+').\n\n'+
      'Board review is active. Employment movement, sackings and rival approaches will be added in a subsequent phase.';
    window.MotorTradeInbox?.emit(state,{from:'BOARD OF DIRECTORS',category:'reports',
      subject,preview:'Company sold '+report.soldUnits+'/'+d.monthlyTarget+
      ' vehicles. Board confidence '+m.boardConfidence+'/100.',body,
      linkPage:'reports',reference:'board-review:'+report.month});
    return result;
  }
  function recruitmentValid(r,d){
    return !!r&&r.employerId===d.id&&
      whole(r.interviewPercent,0,100)&&whole(r.composite,0,100)&&
      whole(r.threshold,40,100)&&whole(r.questionsAsked,5,15)&&
      (r.rounds===undefined||
        (whole(r.rounds,1,2)&&
          (r.rounds===1?
            (r.secondRoundPercent===null&&r.questionsAsked===
              ({INDEPENDENT:5,ESTABLISHED:6,REGIONAL:7,PRESTIGE:8,ELITE:10}[d.tier])):
            (whole(r.secondRoundPercent,50,100)&&r.questionsAsked===
              ({REGIONAL:10,PRESTIGE:12,ELITE:15}[d.tier])))))&&
      whole(r.applications,1,20)&&whole(r.rejected,0,r.applications-1)&&
      r.interviewPercent>=45&&r.composite>=r.threshold;
  }
  function valid(m,state){
    if(m==null)return true; // Historical owner-operated careers remain valid.
    const d=dealer(m.employerId);
    if(!d||!validName(m.managerName)||!whole(m.reputation,0,100)||
      !whole(m.boardConfidence,0,100)||m.startedDay!==1||
      (m.cv!==undefined&&!cvValid(m.cv))||
      (m.recruitment!==undefined&&!recruitmentValid(m.recruitment,d))||
      (m.induction!==undefined&&
        !window.MotorTradeInduction?.valid(m.induction,state))||
      !whole(m.lastReviewMonth,0,1200)||m.lastReviewMonth>Math.max(0,Math.ceil(state.day/28))||
      !Array.isArray(m.reviews)||m.reviews.length>100||
      !Array.isArray(m.history)||m.history.length!==1||
      m.history[0]?.day!==1||m.history[0].type!=='appointed'||
      m.history[0].employerId!==m.employerId||
      state.name!==d.name||!eligible(d,START_REPUTATION)||
      state.startingCapital!==45000)return false;
    if(!state.ledger.some(row=>row.day===1&&
      row.note==='Opening employer working capital allocation: '+d.name&&
      row.delta===d.openingCash-45000))return false;
    if(!m.reviews.every((r,i)=>r&&whole(r.month,1,1200)&&
      (i===0||r.month>m.reviews[i-1].month)&&
      whole(r.units,0,10000)&&r.target===d.monthlyTarget&&
      Number.isSafeInteger(r.contribution)&&Math.abs(r.contribution)<=100000000&&
      whole(r.reputationChange,-2,3)&&whole(r.confidence,0,100)&&
      typeof r.achieved==='boolean'))return false;
    return m.lastReviewMonth===(m.reviews.at(-1)?.month||0);
  }
  const clone=m=>m?{
    managerName:m.managerName,reputation:m.reputation,employerId:m.employerId,
    startedDay:m.startedDay,boardConfidence:m.boardConfidence,
    ...(m.cv?{cv:cvCopy(m.cv)}:{}),
    ...(m.recruitment?{recruitment:{...m.recruitment}}:{}),
    ...(m.induction?{induction:window.MotorTradeInduction.clone(m.induction)}:{}),
    lastReviewMonth:m.lastReviewMonth,reviews:m.reviews.map(r=>({...r})),
    history:m.history.map(h=>({...h}))
  }:null;
  window.MotorTradeManagerCareer=Object.freeze({
    START_REPUTATION,CAREER_START_UTC,BACKGROUNDS,QUALIFICATIONS,
    DEFAULT_CV,DEALERS,dealer,eligible,firstJobs,ageAt,cvValid,
    initial,enrol,welcome,review,valid,clone
  });
})();