'use strict';
/* Motor Trade Group — phase 2: an actual, separately funded UK satellite site.
 * The original career remains Branch 1, with its original staff, customers and
 * transactions untouched. Satellites are manager-operated, not copies of the
 * full owner-driven auction/customer journey. All prices and market assumptions
 * are fictional and the UK-only phase does not simulate manufacturer franchises.
 */
(() => {
  const CITIES=Object.freeze([
    {key:'manchester',name:'Manchester',setup:47000,rent:76,demand:26,note:'Strong regional family and performance market'},
    {key:'birmingham',name:'Birmingham',setup:45000,rent:73,demand:27,note:'High turnover potential with tight competition'},
    {key:'leeds',name:'Leeds',setup:42000,rent:68,demand:24,note:'Lower premises costs, steady commuter demand'},
    {key:'bristol',name:'Bristol',setup:52000,rent:87,demand:27,note:'Premium demand, more expensive premises'},
    {key:'glasgow',name:'Glasgow',setup:44000,rent:72,demand:25,note:'Mixed market and independent trade supply'},
    {key:'cardiff',name:'Cardiff',setup:40000,rent:64,demand:22,note:'Lower rent and moderate market volume'}
  ]);
  const MANAGERS=Object.freeze([
    {id:'m1',name:'Alex Morgan',ability:13,care:15,salary:2300,note:'Balanced operations and customer care'},
    {id:'m2',name:'Priya Shah',ability:17,care:13,salary:2900,note:'Strong negotiation, higher monthly wage'},
    {id:'m3',name:'Daniel Brooks',ability:11,care:18,salary:2150,note:'Customer-focused, cautious trading'}
  ]);
  const CAPITAL=85000,MAX_BRANCHES=1,MAX_VEHICLES=6;
  const limits={cash:100000000,ledger:40000,sales:20000,enquiries:20000,accruals:40000,monthly:120};
  const integer=Number.isSafeInteger;
  const nonneg=n=>integer(n)&&n>=0&&n<=limits.cash;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const fmt=n=>'£'+n.toLocaleString('en-GB');
  const safe=x=>String(x).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const seed=x=>{let h=2166136261;for(const c of String(x))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h>>>0;};
  const initial=()=>({schema:1,nextBranchId:1,branches:[]});
  const cityOf=key=>CITIES.find(c=>c.key===key)||null;
  const managerOf=id=>MANAGERS.find(m=>m.id===id)||null;
  const find=(state,id)=>state.group?.branches?.find(b=>b.id===id)||null;
  const payroll=b=>b.staff.reduce((n,person)=>n+Math.ceil(person.salary/30),0);
  const reserve=b=>b.inventory.filter(v=>v.status==='queued').reduce((n,v)=>n+v.prep,0);
  const running=b=>payroll(b)+b.rent;
  const liabilities=b=>b.payrollArrears+b.rentArrears;
  const supported=state=>state.group?.branches?.length>0;
  function protectedOriginal(state){
    const reserved=window.MotorTradeWorkshop?.reserved(state)??0;
    const overhead=window.MotorTradePremises?.costs(state).total??0;
    const wages=(state.staff||[]).reduce((n,s)=>n+Math.ceil(s.monthlySalary/30),0);
    return reserved+(state.payrollArrears||0)+(state.premises?.arrears||0)+
      (state.stockAgeingArrears||0)+30*(wages+overhead)+20000;
  }
  function quote(state,cityKey,managerId='m1'){
    const city=cityOf(cityKey),manager=managerOf(managerId);
    if(!city||!manager)return {ok:false,message:'Choose an eligible UK city and branch manager.'};
    const rank=window.MotorTradeEmpire?.status(state)?.rank??0;
    const protectedCash=protectedOriginal(state);
    const needed=city.setup+CAPITAL+protectedCash;
    const capacity=state.group?.branches?.length??0;
    return {ok:rank>=10&&capacity<MAX_BRANCHES&&state.cash>=needed,
      city,manager,rank,capital:CAPITAL,setup:city.setup,protectedCash,
      needed,shortfall:Math.max(0,needed-state.cash),
      why:rank<10?'Reach Prestige Rank 10 and complete its sales/profit hurdles.':
        capacity>=MAX_BRANCHES?'One satellite branch is supported in this release.':
        state.cash<needed?'Insufficient cash after protecting the existing business.':'Eligible to open.'};
  }
  function entry(b,day,kind,delta,note){
    if(delta!==0){b.cash+=delta;b.ledger.push({day,kind,delta,note});}
  }
  function open(state,cityKey,managerId){
    const q=quote(state,cityKey,managerId);
    if(!q.city)return {ok:false,message:q.message};
    if(!q.ok)return {ok:false,message:q.why+(q.shortfall?' Short by '+fmt(q.shortfall)+'.':'')};
    const id='BR-'+state.group.nextBranchId++;
    const staff=[
      {role:'manager',name:q.manager.name,salary:q.manager.salary},
      {role:'sales',name:'Branch Sales Executive',salary:1850},
      {role:'buyer',name:'Branch Vehicle Buyer',salary:1850},
      {role:'technician',name:'Branch Preparation Technician',salary:1925}
    ];
    // Split the real cash outflow into a sunk fit-out cost and a reversible
    // internal capital transfer. The satellite only receives the latter.
    state.cash-=q.setup+q.capital;
    state.ledger.push({day:state.day,delta:-q.setup,note:'Group expansion fit-out '+id});
    state.ledger.push({day:state.day,delta:-q.capital,note:'Group capital transfer '+id});
    state.group.branches.push({
      id,name:state.name+' — '+q.city.name,city:q.city.key,country:'UK',
      openedDay:state.day,lastProcessedDay:state.day,
      openingCapital:q.capital,setupCost:q.setup,cash:q.capital,
      rent:q.city.rent,manager:{...q.manager},staff,trust:75,
      inventory:[],sales:[],enquiries:[],accruals:[],monthlyReports:[],
      payrollArrears:0,rentArrears:0,nextStockId:1,
      ledger:[{day:state.day,kind:'capital',delta:q.capital,
        note:'Opening funding transferred from Head Office'}]
    });
    return {ok:true,message:q.city.name+' branch opened. '+fmt(q.setup)+
      ' fit-out paid and '+fmt(q.capital)+' transferred from the original dealership. '+
      'The new four-person team accrues wages and rent from the next game day.'};
  }
  function offers(state,b){
    if(!b)return [];
    const base=window.MotorTradeMarket?.CATALOGUE||{};
    const rank=window.MotorTradeEmpire?.status(state)?.rank??0;
    const tiers=rank>=40?['modern','premium','luxury']:['starter','modern','premium'];
    return Array.from({length:4},(_,slot)=>{
      const salt=b.id+'|'+b.city+'|'+state.day+'|'+slot;
      const tier=tiers[seed(salt+'|tier')%tiers.length];
      const list=base[tier]||[];
      if(!list.length)return null;
      const template=list[seed(salt+'|car')%list.length];
      const offset=(seed(salt+'|price')%21-10)*25;
      const fee=Math.ceil((template.guide*.015+150)/25)*25;
      const cost=Math.max(850,template.guide+offset)+fee;
      return {id:b.id+'-'+state.day+'-'+slot,slot,title:template.title,
        miles:template.miles+(seed(salt+'|miles')%81-40)*100,
        marketTier:tier,grade:template.grade,history:template.history,
        cost,fee,prep:template.prep,retail:Math.max(cost+250,template.retail+offset),
        source:'independent trade supplier'};
    }).filter(Boolean);
  }
  function purchase(state,branchId,offerId){
    const b=find(state,branchId);
    if(!b)return {ok:false,message:'Branch not found.'};
    const o=offers(state,b).find(x=>x.id===offerId);
    if(!o)return {ok:false,message:'This trade offer is unavailable or expired.'};
    if(b.inventory.some(v=>v.offerId===offerId))return {ok:false,message:'This car is already owned by the branch.'};
    if(b.inventory.length>=MAX_VEHICLES)return {ok:false,message:'The six-vehicle satellite forecourt is full.'};
    const protectedCash=reserve(b)+liabilities(b)+14*running(b);
    const required=o.cost+o.prep+protectedCash;
    if(b.cash<required)return {ok:false,message:'Purchase plus committed preparation and 14 days of branch operating cash requires '+
      fmt(required)+'. Available branch cash '+fmt(b.cash)+'. Transfer funds or choose cheaper stock.'};
    entry(b,state.day,'stock',-o.cost,'Independent supplier purchase: '+o.title);
    const v={id:b.nextStockId++,offerId:o.id,title:o.title,marketTier:o.marketTier,
      grade:o.grade,miles:o.miles,history:o.history,cost:o.cost,prep:o.prep,
      expectedRetail:o.retail,asking:o.retail,status:'queued',acquiredDay:state.day,
      repairStartedDay:null,readyDay:null,listedDay:null};
    b.inventory.push(v);
    return {ok:true,message:o.title+' bought for '+fmt(o.cost)+
      ' by '+b.name+'. '+fmt(o.prep)+' preparation allowance is reserved; the branch team will prepare and list it over later game days.'};
  }
  function price(state,branchId,id,amount){
    const b=find(state,branchId),v=b?.inventory.find(x=>x.id===id);
    if(!v)return {ok:false,message:'Vehicle not found in this branch.'};
    if(v.status!=='listed')return {ok:false,message:'Wait until the branch workshop finishes preparation and the vehicle is advertised.'};
    if(!integer(amount)||amount<Math.round(v.expectedRetail*.8/25)*25||
       amount>Math.round(v.expectedRetail*1.15/25)*25||amount%25!==0)
      return {ok:false,message:'Enter an asking price in £25 increments, within 80%–115% of this vehicle’s estimated retail guide.'};
    v.asking=amount;
    return {ok:true,message:v.title+' now advertised at '+fmt(amount)+' in '+b.name+'. Price changes affect buyer conversion on future game days.'};
  }
  function transfer(state,branchId,amount,direction){
    const b=find(state,branchId);
    if(!b)return {ok:false,message:'Unknown branch.'};
    if(!integer(amount)||amount<1000||amount>250000||amount%1000!==0)
      return {ok:false,message:'Transfers must be between £1,000 and £250,000 in £1,000 increments.'};
    if(direction==='to'){
      if(state.cash-amount<protectedOriginal(state))
        return {ok:false,message:'This transfer would breach the original dealership’s 30-day wage, rent and stock-preparation protection.'};
      state.cash-=amount;
      state.ledger.push({day:state.day,delta:-amount,note:'Group capital transfer to '+b.id});
      entry(b,state.day,'transfer-in',amount,'Head Office capital transfer');
    }else if(direction==='from'){
      if(b.cash-amount<reserve(b)+liabilities(b)+30*running(b))
        return {ok:false,message:'The branch must retain preparation funds, all arrears and 30 days of its own operating costs.'};
      entry(b,state.day,'transfer-out',-amount,'Capital returned to Head Office');
      state.cash+=amount;
      state.ledger.push({day:state.day,delta:amount,note:'Group capital return from '+b.id});
    }else return {ok:false,message:'Unknown transfer direction.'};
    return {ok:true,message:fmt(amount)+' moved '+(direction==='to'?'from Head Office to ':'from ')+
      (direction==='to'?b.name:b.name+' to Head Office')+'. Both cash ledgers have been updated.'};
  }
  function settle(b,day,field,kind){
    const due=b[field];
    const paid=Math.min(b.cash,due);
    if(paid>0){entry(b,day,kind,-paid,
      (kind==='payroll'?'Settled staff wage obligations':'Settled premises rent and utilities'));
      b[field]-=paid;}
    return paid;
  }
  function operating(b,start=1,end=Infinity){
    const sales=b.sales.filter(s=>s.day>=start&&s.day<=end);
    const accruals=b.accruals.filter(x=>x.day>=start&&x.day<=end);
    const gross=sales.reduce((n,v)=>n+v.profit,0);
    const wages=accruals.reduce((n,x)=>n+x.payroll,0);
    const rent=accruals.reduce((n,x)=>n+x.rent,0);
    return {units:sales.length,turnover:sales.reduce((n,x)=>n+x.price,0),
      gross,wages,rent,contribution:gross-wages-rent};
  }
  function dayFor(b,day){
    const wages=payroll(b);
    b.accruals.push({day,payroll:wages,rent:b.rent});
    b.payrollArrears+=wages;
    b.rentArrears+=b.rent;
    settle(b,day,'payrollArrears','payroll');
    settle(b,day,'rentArrears','rent');
    for(const v of b.inventory){
      if(v.status==='queued'&&b.cash>=v.prep){
        entry(b,day,'preparation',-v.prep,'Workshop preparation: '+v.title);
        v.status='repairing';v.repairStartedDay=day;
        v.readyDay=day+(v.grade>=4?3:2);
      }
      if(v.status==='repairing'&&day>=v.readyDay){
        v.status='listed';v.listedDay=day;
      }
    }
    const city=cityOf(b.city);
    for(const v of [...b.inventory]){
      if(v.status!=='listed'||v.listedDay>=day)continue;
      const key=b.id+'|'+v.id+'|'+day;
      const excess=(v.asking-v.expectedRetail)/Math.max(1,v.expectedRetail);
      const chance=clamp(city.demand+b.manager.ability-12-Math.round(excess*105)-
        Math.max(0,70-b.trust)/5,4,53);
      if(seed(key+'|arrival')%100>=chance)continue;
      const discount=50*(seed(key+'|discount')%9);
      const offered=Math.max(0,v.asking-discount);
      const threshold=Math.round(v.expectedRetail*.92)+
        Math.max(0,15-b.manager.ability)*30;
      const accepted=offered>=threshold&&(seed(key+'|decision')%100<
        clamp(70+b.manager.care-12,40,93));
      const lead={id:'L-'+b.id+'-'+day+'-'+v.id,day,vehicleId:v.id,title:v.title,
        offered,accepted};
      b.enquiries.push(lead);
      if(!accepted)continue;
      entry(b,day,'sale',offered,'Retail handover: '+v.title+' / '+lead.id);
      const profit=offered-v.cost-v.prep;
      b.sales.push({id:v.id,day,title:v.title,price:offered,cost:v.cost,
        prep:v.prep,profit,source:'branch',marketTier:v.marketTier,
        customerId:lead.id,manager:b.manager.name});
      b.inventory=b.inventory.filter(x=>x.id!==v.id);
      b.trust=clamp(b.trust+(profit>0?1:-3),0,100);
      settle(b,day,'payrollArrears','payroll');
      settle(b,day,'rentArrears','rent');
    }
    if(day%7===0&&(b.payrollArrears>0||b.rentArrears>0))
      b.trust=clamp(b.trust-1,0,100);
    b.lastProcessedDay=day;
  }
  function advance(state){
    const events=[];
    for(const b of state.group?.branches||[]){
      if(b.lastProcessedDay>state.day)return {ok:false,message:'Branch trading date is ahead of the group calendar.'};
      while(b.lastProcessedDay<state.day){
        const oldSales=b.sales.length;
        dayFor(b,b.lastProcessedDay+1);
        if(b.sales.length>oldSales)events.push(b.city+': '+(b.sales.length-oldSales)+' vehicle handover(s).');
      }
    }
    return {ok:true,events};
  }
  function closeMonth(state){
    const CAL=window.MotorTradeCalendar;
    if(!CAL||state.day!==CAL.dayEnd(state.day))return;
    const first=CAL.dayStart(state.day);
    for(const b of state.group?.branches||[]){
      if(b.openedDay>=state.day||b.lastProcessedDay!==state.day)continue;
      const o=operating(b,first,state.day),days=Math.max(1,state.day-Math.max(first,b.openedDay+1)+1);
      const target=Math.max(1,Math.ceil(days/30*4));
      b.monthlyReports.push({month:CAL.monthOf(state.day),endDay:state.day,
        targetUnits:target,targetMet:o.units>=target&&o.contribution>0,
        soldUnits:o.units,turnover:o.turnover,grossMargin:o.gross,
        payroll:o.wages,rent:o.rent,operatingContribution:o.contribution});
      if(b.monthlyReports.length>limits.monthly)b.monthlyReports.shift();
    }
  }
  function valid(group,state){
    if(!group||group.schema!==1||!integer(group.nextBranchId)||
      group.nextBranchId<1||group.nextBranchId>1000||
      !Array.isArray(group.branches)||group.branches.length>MAX_BRANCHES)return false;
    const seen=new Set();
    for(const b of group.branches){
      if(!b||!/^BR-[1-9][0-9]*$/.test(b.id)||seen.has(b.id)||
        Number(b.id.slice(3))>=group.nextBranchId||!cityOf(b.city)||
        b.country!=='UK'||typeof b.name!=='string'||b.name.length>100||
        !integer(b.openedDay)||b.openedDay<1||b.openedDay>state.day||
        !integer(b.lastProcessedDay)||b.lastProcessedDay<b.openedDay||
        b.lastProcessedDay>state.day||!nonneg(b.cash)||!nonneg(b.openingCapital)||
        b.openingCapital!==CAPITAL||b.setupCost!==cityOf(b.city).setup||
        b.rent!==cityOf(b.city).rent||!managerOf(b.manager?.id)||
        b.manager.name!==managerOf(b.manager.id).name||
        !Array.isArray(b.staff)||b.staff.length!==4||
        !b.staff.every(p=>['manager','sales','buyer','technician'].includes(p.role)&&
          typeof p.name==='string'&&nonneg(p.salary))||
        !integer(b.trust)||b.trust<0||b.trust>100||
        !nonneg(b.payrollArrears)||!nonneg(b.rentArrears)||
        !integer(b.nextStockId)||b.nextStockId<1||
        !Array.isArray(b.inventory)||b.inventory.length>MAX_VEHICLES||
        !Array.isArray(b.sales)||b.sales.length>limits.sales||
        !Array.isArray(b.enquiries)||b.enquiries.length>limits.enquiries||
        !Array.isArray(b.accruals)||b.accruals.length>limits.accruals||
        !Array.isArray(b.monthlyReports)||b.monthlyReports.length>limits.monthly||
        !Array.isArray(b.ledger)||b.ledger.length>limits.ledger)return false;
      seen.add(b.id);
      if(!state.ledger.some(x=>x.delta===-b.setupCost&&
        x.note==='Group expansion fit-out '+b.id&&x.day===b.openedDay)||
        !state.ledger.some(x=>x.delta===-b.openingCapital&&
          x.note==='Group capital transfer '+b.id&&x.day===b.openedDay))return false;
      if(!b.ledger.length||b.ledger[0].kind!=='capital'||
        b.ledger[0].delta!==b.openingCapital||b.ledger[0].day!==b.openedDay||
        !b.ledger.every(x=>integer(x.day)&&x.day>=b.openedDay&&x.day<=b.lastProcessedDay&&
          integer(x.delta)&&Math.abs(x.delta)<=limits.cash&&
          ['capital','stock','preparation','sale','payroll','rent','transfer-in','transfer-out'].includes(x.kind)&&
          typeof x.note==='string'&&x.note.length<=200)||
        b.ledger.reduce((n,x)=>n+x.delta,0)!==b.cash)return false;
      const ids=[...b.inventory,...b.sales].map(v=>v.id);
      if(new Set(ids).size!==ids.length||ids.some(id=>!integer(id)||id<1||id>=b.nextStockId))return false;
      if(!b.inventory.every(v=>
        typeof v.title==='string'&&v.title.length<100&&
        typeof v.offerId==='string'&&v.offerId.startsWith(b.id+'-')&&
        nonneg(v.cost)&&nonneg(v.prep)&&nonneg(v.expectedRetail)&&
        nonneg(v.asking)&&integer(v.grade)&&v.grade>=1&&v.grade<=5&&
        ['queued','repairing','listed'].includes(v.status)&&
        integer(v.acquiredDay)&&v.acquiredDay>=b.openedDay&&v.acquiredDay<=b.lastProcessedDay&&
        (v.status==='queued'?v.repairStartedDay===null&&v.readyDay===null:
          integer(v.repairStartedDay)&&integer(v.readyDay)&&v.readyDay>v.repairStartedDay)&&
        (v.status==='listed'?integer(v.listedDay)&&v.listedDay<=b.lastProcessedDay:
          v.listedDay===null)))return false;
      if(!b.sales.every(v=>typeof v.title==='string'&&nonneg(v.price)&&nonneg(v.cost)&&
        nonneg(v.prep)&&integer(v.day)&&v.day>=b.openedDay&&v.day<=b.lastProcessedDay&&
        v.profit===v.price-v.cost-v.prep&&typeof v.customerId==='string'))return false;
      if(!b.enquiries.every(x=>integer(x.day)&&x.day>=b.openedDay&&
        x.day<=b.lastProcessedDay&&integer(x.vehicleId)&&
        typeof x.id==='string'&&typeof x.accepted==='boolean'&&nonneg(x.offered)))return false;
      if(!b.accruals.every(x=>integer(x.day)&&x.day>b.openedDay&&
        x.day<=b.lastProcessedDay&&nonneg(x.payroll)&&nonneg(x.rent)))return false;
      const paid=b.ledger.filter(x=>x.kind==='payroll').reduce((n,x)=>n-x.delta,0);
      const rented=b.ledger.filter(x=>x.kind==='rent').reduce((n,x)=>n-x.delta,0);
      if(b.accruals.reduce((n,x)=>n+x.payroll,0)-paid!==b.payrollArrears||
         b.accruals.reduce((n,x)=>n+x.rent,0)-rented!==b.rentArrears)return false;
      if(!b.monthlyReports.every(r=>integer(r.month)&&r.month>=1&&integer(r.endDay)&&
        r.endDay<=b.lastProcessedDay&&r.endDay>=b.openedDay&&
        nonneg(r.targetUnits)&&nonneg(r.soldUnits)&&nonneg(r.turnover)&&
        integer(r.operatingContribution)&&typeof r.targetMet==='boolean'))return false;
    }
    return true;
  }
  function clone(group){return JSON.parse(JSON.stringify(group));}
  function summary(state){
    const branches=state.group?.branches||[];
    const satelliteCash=branches.reduce((n,b)=>n+b.cash,0);
    const groupStock=state.vehicles.length+branches.reduce((n,b)=>n+b.inventory.length,0);
    const groupSales=state.sold.length+branches.reduce((n,b)=>n+b.sales.length,0);
    const satelliteLiabilities=branches.reduce((n,b)=>n+liabilities(b),0);
    return {branches:1+branches.length,groupCash:state.cash+satelliteCash,
      originalCash:state.cash,satelliteCash,groupStock,groupSales,satelliteLiabilities,
      satelliteOperating:branches.reduce((n,b)=>n+operating(b).contribution,0)};
  }
  window.MotorTradeGroup=Object.freeze({CITIES,MANAGERS,CAPITAL,MAX_BRANCHES,MAX_VEHICLES,
    initial,clone,valid,quote,open,offers,purchase,price,transfer,
    advance,closeMonth,find,operating,summary,payroll,running,reserve,liabilities,
    protectedOriginal});
})();