"use strict";
(()=>{
const prev=dilemmaCandidates,resolve=dilemmaResolve,tick=correspondenceTick,cat=mailCategory,msg=officeMessages;
const own=s=>s.world.clubs.find(c=>c.name===s.club),store=s=>officeState(s).storylines??={cases:[]},cap=clampConfidence;
function ctx(s,c){const d=s.calendar.date,r=relationships(s,c),p=c.players,y=c.academyPlayers,g=(s.world.league?.fixtures||[]).filter(f=>f.played&&f.type==="league"&&[f.homeClubId,f.awayClubId].includes(c.id)).sort((a,b)=>a.date.localeCompare(b.date)).slice(-5),points=f=>{const h=f.homeClubId===c.id,a=h?f.homeGoals:f.awayGoals,b=h?f.awayGoals:f.homeGoals;return a>b?3:a===b?1:0},pts=g.reduce((n,f)=>n+points(f),0),rank=leagueTable(s,c.tier).findIndex(x=>x.id===c.id)+1,sort=(a,k)=>a.slice().sort((a,b)=>b[k]-a[k])[0],thin=squadDepth(c).sort((a,b)=>a.count-b.count||a.best-b.best)[0];
return {s,c,d,r,p,y,g,pts,rank,thin,window:windowStatus(d)!=="Closed",pay:squadPayroll(c),staffPay:staffPayroll(c),star:sort(p,"ability"),high:sort(p,"wage"),old:sort(p.filter(p=>p.age>=31),"age"),young:sort(y.filter(p=>p.age>=17),"potential"),injured:sort(p.filter(p=>p.injuryDays>0),"injuryDays"),unhappy:p.filter(p=>p.morale<65).sort((a,b)=>a.morale-b.morale)[0],exp:p.filter(p=>p.contractEnd>d&&p.contractEnd<=datePlus(d,365)).sort((a,b)=>a.contractEnd.localeCompare(b.contractEnd))[0],low:p.filter(p=>p.fitness<85).sort((a,b)=>a.fitness-b.fitness)[0],listing:outgoingListings(c).find(l=>l.status==="Listed"),request:c.recruitmentRequests.find(q=>q.status==="Approved")}}
const O={support:["Back the manager","manager",4],challenge:["Challenge the proposal","manager",-4],review:["Arrange a joint review","monitor",7],results:["Commit to five points from the next four league games","results",5],budget:["Commit to retaining 80% of current funds for 21 days","budget",21],reserve:["Protect 15% of transfer funds","reserve",15],release:["Release protected funds","release",0],hold:["Pause recruitment requests for 14 days","hold",14],search:["Schedule a recruitment review","search",0],meet:["Meet the named player privately","morale",7],delegate:["Ask the manager to address the player's concerns","morale",3],sell:["Make the player available for transfer","sale",0],renew:["Approve contract extension subject to wage budget","renew",0],promote:["Promote the named prospect if affordable","promote",0],develop:["Continue academy development","youth",4],public:["Issue a public statement of support","public",3],quiet:["Keep the matter private","quiet",0],fitness:["Fund supervised conditioning","fitness",10],board:["Accept the board's direction","board",3],oppose:["Oppose the board's direction","board",-4]};
const lib=[];
function add(key,category,title,test,body,opts,subject){lib.push({key,category,title,test,body,opts:opts.split(" ").map(k=>O[k]),subject})}
const B="Board",M="Manager",F="Finance",A="Agents",R="Recruitment",Y="Academy",D="Medical",N="Media";
add("cash",F,"Cash reserves under scrutiny",x=>x.c.cash<x.c.budget*1.4,x=>"Cash "+money(x.c.cash)+"; transfer funds "+money(x.c.budget),"reserve budget oppose");
add("payroll",B,"Chairman questions wage commitments",x=>x.pay>x.c.wageBudget*.8,x=>"Weekly payroll "+money(x.pay)+" against "+money(x.c.wageBudget),"hold budget oppose");
add("confidence",B,"Emergency confidence meeting",x=>x.r.board<45,x=>"Board confidence "+x.r.board+"/100.","results budget oppose");
add("expansion",B,"Board seeks strategic commitment",x=>x.r.board>=70,x=>"Board confidence is "+x.r.board+"/100.","budget results quiet");
add("promotion",B,"Promotion expectations intensify",x=>x.g.length>=4&&x.rank<=3,x=>"Current league position "+x.rank+".","results search quiet");
add("survival",B,"Board requests survival strategy",x=>x.g.length>=4&&x.rank>=17,x=>"Current league position "+x.rank+".","results hold oppose");
add("midtable",B,"Mid-table strategy reviewed",x=>x.g.length>=5&&x.rank>5&&x.rank<17,x=>"Position "+x.rank+"; last five yielded "+x.pts+" points.","results review quiet");
add("director-contract",B,"Director contract security discussed",x=>x.s.contract?.endDate&&x.s.contract.endDate<=datePlus(x.d,180),x=>"Appointment expires "+prettyDate(x.s.contract.endDate)+".","results budget quiet");
add("board-reserve",B,"Protected funds challenged",x=>x.c.recruitmentReserve>0,x=>"Protected funds "+money(x.c.recruitmentReserve),"release budget quiet");
add("board-window",B,"Transfer strategy meeting",x=>x.window&&x.c.budget>0,x=>"Available funds "+money(x.c.budget),"search reserve hold");
add("manager-trust",M,"Manager seeks reconciliation",x=>x.r.manager<45,x=>x.c.manager.name+" has trust "+x.r.manager+"/100.","support review challenge");
add("philosophy",M,"Football philosophy disagreement",x=>x.s.style&&x.s.style!==x.c.manager.style,x=>"Director favours "+x.s.style+"; manager favours "+x.c.manager.style+".","support review challenge");
add("approved-search",M,"Manager seeks recruitment progress",x=>!!x.request,x=>"Approved search remains open for "+x.request.position+".","search hold review");
add("depth",M,"Manager warns of positional shortage",x=>x.thin.count<=2,x=>x.thin.count+" senior options at "+x.thin.position+".","search support hold");
add("patience",M,"Manager requests patience",x=>x.g.length>=3&&x.pts<=x.g.length,x=>x.pts+" points from "+x.g.length+" matches.","support results challenge");
add("momentum",M,"Manager requests backing after strong results",x=>x.g.length>=3&&x.pts>=x.g.length*2,x=>x.pts+" points from "+x.g.length+" matches.","support search budget");
add("leadership",M,"Senior squad leadership concern",x=>x.old&&x.old.morale<75,x=>x.old.name+" is "+x.old.age+" with morale "+x.old.morale+".","meet delegate sell",x=>x.old);
add("key-player",M,"Manager seeks clarity over key player",x=>x.star&&x.star.morale<75,x=>x.star.name+" has ability "+x.star.ability+"/100.","meet delegate sell",x=>x.star);
add("capacity",M,"Senior squad capacity debate",x=>x.p.length>=28,x=>x.p.length+" of 30 squad places filled.","hold review search");
add("injury-cover",M,"Manager requests injury contingency",x=>x.injured&&x.injured.injuryDays>=7,x=>x.injured.name+" out for "+x.injured.injuryDays+" days.","search support hold");
add("liquidity",F,"Finance requests liquidity review",x=>x.c.cash<x.c.wageBudget*10,x=>"Cash "+money(x.c.cash)+"; weekly wage ceiling "+money(x.c.wageBudget),"hold budget board");
add("earner",F,"Highest earner under review",x=>x.high&&x.high.wage>x.pay*.06,x=>x.high.name+" earns "+money(x.high.wage)+" weekly.","sell meet delegate",x=>x.high);
add("staff-cost",F,"Staff payroll pressure",x=>x.staffPay>x.c.staffBudget*.85,x=>"Annual staff payroll "+money(x.staffPay)+" of "+money(x.c.staffBudget),"review budget oppose");
add("allocation",F,"Transfer expenditure allocation",x=>x.window&&x.c.budget>0,x=>"Available transfer allocation "+money(x.c.budget),"reserve budget search");
add("finance-release",F,"Finance recommends reserve review",x=>x.c.recruitmentReserve>0,x=>"Reserved funds "+money(x.c.recruitmentReserve),"release board budget");
add("small-budget",F,"Limited recruitment headroom",x=>x.c.budget<x.c.wageBudget*2,x=>"Available funds "+money(x.c.budget),"hold search budget");
add("deadline",F,"Window closing expenditure review",x=>x.window&&Number(x.d.slice(8))>=24&&["01","08"].includes(x.d.slice(5,7)),x=>"The transfer window is approaching its closing date.","search reserve hold");
add("renewal-cost",F,"Renewal affordability assessment",x=>!!x.exp,x=>x.exp.name+" earns "+money(x.exp.wage)+" weekly.","renew sell delegate",x=>x.exp);
add("agent-expiry",A,"Agent requests contract clarity",x=>!!x.exp,x=>x.exp.name+" contracted until "+prettyDate(x.exp.contractEnd)+".","renew meet sell",x=>x.exp);
add("agent-unrest",A,"Agent raises player's concerns",x=>!!x.unhappy,x=>x.unhappy.name+" has morale "+x.unhappy.morale+"/100.","meet delegate sell",x=>x.unhappy);
add("agent-veteran",A,"Veteran's future questioned",x=>x.old&&x.old.contractEnd<=datePlus(x.d,365),x=>x.old.name+" is "+x.old.age+".","renew meet sell",x=>x.old);
add("agent-star",A,"Representative seeks reassurance",x=>x.star&&x.star.morale<70,x=>x.star.name+" has morale "+x.star.morale+".","meet delegate sell",x=>x.star);
add("agent-listed",A,"Listed player's representative calls",x=>x.listing&&x.p.some(p=>p.id===x.listing.playerId),x=>"An active outgoing listing remains unresolved.","review meet quiet",x=>x.p.find(p=>p.id===x.listing.playerId));
add("agent-young",A,"Young senior player requests development discussion",x=>x.p.some(p=>p.age<=23&&p.morale<75),x=>"A young senior player seeks clarity over development.","meet delegate sell",x=>x.p.find(p=>p.age<=23&&p.morale<75));
add("scout-shortage",R,"Scouting flags positional shortage",x=>x.thin.count<=2,x=>x.thin.position+" has "+x.thin.count+" senior options.","search hold review");
add("scout-deadline",R,"Scouting priorities before deadline",x=>x.window&&x.c.budget>0&&Number(x.d.slice(8))>=20,x=>"Remaining funds "+money(x.c.budget),"search reserve hold");
add("shortlist",R,"Shortlist requires strategic review",x=>x.c.shortlist.length>=2,x=>x.c.shortlist.length+" players currently shortlisted.","search review hold");
add("replacement",R,"Replacement planning for expiring contract",x=>!!x.exp,x=>x.exp.name+" is approaching contract expiry.","renew search sell",x=>x.exp);
add("succession",R,"Succession planning for experienced player",x=>!!x.old,x=>x.old.name+" is "+x.old.age+".","search meet review",x=>x.old);
add("next-window",R,"Preparations for next transfer window",x=>!x.window,x=>"The transfer window is closed; planning can continue.","search budget hold");
add("academy-ready",Y,"Academy recommends senior promotion",x=>x.young&&x.p.length<30,x=>x.young.name+" potential "+x.young.potential+"/100.","promote develop quiet",x=>x.young);
add("academy-capacity",Y,"Academy pathway blocked by capacity",x=>x.young&&x.p.length>=28,x=>x.young.name+" faces a senior squad of "+x.p.length+".","develop promote hold",x=>x.young);
add("academy-morale",Y,"Prospect seeks reassurance",x=>x.y.some(p=>p.morale<75),x=>"A prospect seeks a development discussion.","develop quiet review",x=>x.y.find(p=>p.morale<75));
add("academy-cover",Y,"Academy cover for injured senior player",x=>x.young&&x.injured&&x.injured.injuryDays>=7,x=>x.injured.name+" is injured; "+x.young.name+" is available.","promote develop search",x=>x.young);
add("medical-recovery",D,"Medical staff request recovery resources",x=>x.injured&&x.injured.injuryDays>=3,x=>x.injured.name+" has "+x.injured.injuryDays+" recovery days remaining.","fitness search review",x=>x.injured);
add("fitness",D,"Fitness workload concern",x=>!!x.low,x=>x.low.name+" has fitness "+x.low.fitness+"/100.","fitness delegate review",x=>x.low);
add("injury-cluster",D,"Medical department reports injury cluster",x=>x.p.filter(p=>p.injuryDays>0).length>=2,x=>x.p.filter(p=>p.injuryDays>0).length+" senior players injured.","search support hold");
add("medical-star",D,"Key player unavailable",x=>x.star&&x.star.injuryDays>0,x=>x.star.name+" out for "+x.star.injuryDays+" days.","fitness search review",x=>x.star);
add("fans-poor",N,"Supporters demand explanation",x=>x.g.length>=3&&x.pts<=x.g.length,x=>x.pts+" points from "+x.g.length+" league games.","public results quiet");
add("fans-strong",N,"Supporters ask about sustaining momentum",x=>x.g.length>=3&&x.pts>=x.g.length*2,x=>x.pts+" points from "+x.g.length+" games.","public results quiet");
add("media-spending",N,"Reporter questions recruitment spending",x=>x.window&&x.c.budget>0,x=>"Available transfer funds "+money(x.c.budget),"public quiet budget");
add("media-manager",N,"Speculation over manager-director relationship",x=>x.r.manager<45,x=>"Relationship strain prompts a request for comment.","public review quiet");
add("media-board",N,"Questions about boardroom stability",x=>x.r.board<45,x=>"Board confidence is under pressure.","public quiet results");
add("media-youth",N,"Questions about youth development",x=>!!x.young,x=>"The academy has "+x.y.length+" prospects.","develop promote quiet",x=>x.young);
add("media-sale",N,"Reporter asks about outgoing policy",x=>!!x.listing,x=>"An outgoing transfer listing is active.","quiet public review");
add("media-promotion",N,"Promotion ambitions attract attention",x=>x.g.length>=4&&x.rank<=3,x=>"The club currently sits "+x.rank+".","results public quiet");
add("media-survival",N,"Relegation concerns dominate coverage",x=>x.g.length>=4&&x.rank>=17,x=>"The club currently sits "+x.rank+".","results public quiet");
const sources={Board:"Club board",Manager:"First-team manager",Finance:"Finance department",Agents:"Player representative",Recruitment:"Head scout",Academy:"Academy director",Medical:"Medical department",Media:"Football Chronicle"};
dilemmaCandidates=function(s){const out=prev(s),c=own(s);if(!c)return out;const x=ctx(s,c),cases=store(s).cases,history=dilemmaState(s).dilemmas;for(const t of lib){if(!t.test(x)||cases.some(q=>q.club===c.id&&q.template===t.key&&(q.status==="open"||x.d<datePlus(q.date,70)))||history.some(q=>q.club===c.id&&q.storyCategory===t.category&&x.d<datePlus(q.date,5)))continue;const p=t.subject?.(x);out.push({key:"story-"+t.key,title:t.title,from:t.category===N?["Football Chronicle","Terrace Talk","The Touchline Examiner","Daily Football Express"][dilemmaRoll(t.key+x.d)%4]:sources[t.category],body:t.body(x)+(p?" Relevant player: "+p.name+".":""),storyTemplate:t.key,storyCategory:t.category,playerId:p?.id,choices:t.opts.map((o,i)=>[o[0],"story:"+i])})}return out};
mailCategory=function(m){const match=m.id.match(/(?:dilemma:story-|story-result:|story-follow:)([a-z-]+):/);return (match&&lib.find(t=>t.key===match[1])?.category)||cat(m)};
officeMessages=function(s){const ms=msg(s);for(const m of ms)m.category=mailCategory(m);return ms};
dilemmaResolve=function(s,e){if(!String(e.choice).startsWith("story:"))return resolve(s,e);if(e.status!=="scheduled")return false;const c=own(s),t=lib.find(t=>t.key===e.storyTemplate),o=t?.opts[Number(e.choice.slice(6))];if(!c||c.id!==e.club||!o||e.appointment&&e.appointment!==s.contract?.startDate){e.status="closed";return false}e.status="resolved";const r=relationships(s,c),p=c.players.find(p=>p.id===e.playerId),y=c.academyPlayers.find(p=>p.id===e.playerId),d=s.calendar.date,[label,k,v]=o;let body="",f=null;
switch(k){
case "manager":r.manager=cap(r.manager+v);body="Manager trust now "+r.manager+"/100.";break;
case "board":r.board=cap(r.board+v);body="Board confidence now "+r.board+"/100.";break;
case "monitor":f={kind:k,due:datePlus(d,v)};body="Follow-up review scheduled.";break;
case "results":f={kind:k,target:v,season:s.season,existing:(s.world.league?.fixtures||[]).filter(f=>f.played&&[f.homeClubId,f.awayClubId].includes(c.id)).map(f=>f.id)};body="Board will assess the next four league matches against "+v+" points.";break;
case "budget":f={kind:k,due:datePlus(d,v),target:Math.floor((c.budget+(c.recruitmentReserve||0))*.8)};body="Retain at least "+money(f.target)+" until "+prettyDate(f.due)+".";break;
case "reserve":{const n=Math.floor(c.budget*v/100);c.budget-=n;c.recruitmentReserve=(c.recruitmentReserve||0)+n;body=money(n)+" protected.";break}
case "release":{const n=c.recruitmentReserve||0;c.budget+=n;c.recruitmentReserve=0;body=money(n)+" released.";break}
case "hold":c.recruitmentHoldUntil=datePlus(d,v);r.manager=cap(r.manager-2);body="New recruitment requests paused until "+prettyDate(c.recruitmentHoldUntil)+".";break;
case "search":c.nextRecruitment=d;body="Recruitment review requested; no transfer authorised.";break;
case "morale":if(p){p.morale=cap(p.morale+v);f={kind:"player",due:datePlus(d,7),playerId:p.id};body=p.name+" morale now "+p.morale+"/100."}break;
case "sale":if(p)body=listForSale(s,c,p)?p.name+" available for transfer.":"Already listed or unavailable.";break;
case "renew":if(p)body=renewPlayer(s,p.id)?p.name+" renewed at "+money(p.wage)+"/week.":"Renewal blocked by contract or wage limits.";break;
case "promote":if(y)body=squadPayroll(c)+y.wage<=c.wageBudget&&promotePlayer(s,y.id)?y.name+" promoted.":"Promotion blocked by capacity or wages.";break;
case "youth":if(y){y.morale=cap(y.morale+v);body=y.name+" remains in academy; morale improved."}break;
case "public":{const m=officeState(s).mediaNetwork??={stories:[],supporters:{},relationships:{}};m.supporters[c.id]=cap((m.supporters[c.id]??60)+v);r.manager=cap(r.manager+1);body="Supportive public statement issued.";break}
case "quiet":body="No public commitment or expenditure authorised.";break;
case "fitness":if(p){const n=Math.max(100,Math.round(c.wageBudget*.02));if(c.cash>=n){c.cash-=n;p.fitness=cap(p.fitness+v);body=money(n)+" spent on conditioning; injury duration unchanged."}else body="Insufficient cash."}break;
}
const id=t.key+":"+e.id;store(s).cases.push({id,template:t.key,club:c.id,appointment:s.contract?.startDate,date:d,status:f?"open":"resolved",...f});calendarEvent(s,"story-result:"+id,"Decision outcome — "+t.title,body||"Original circumstances no longer available.",e.from);return true};
function follow(s){const c=own(s),d=s.calendar.date;for(const q of store(s).cases){if(q.status!=="open")continue;if(!c||c.id!==q.club||q.appointment!==s.contract?.startDate||s.calendar.finished){q.status="closed";continue}let body="",ok=null;const r=relationships(s,c);if(q.kind==="results"){if(q.season!==s.season){q.status="closed";continue}const games=(s.world.league?.fixtures||[]).filter(f=>f.played&&f.type==="league"&&[f.homeClubId,f.awayClubId].includes(c.id)&&!q.existing.includes(f.id)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);if(games.length<4)continue;const pts=games.reduce((n,f)=>{const h=f.homeClubId===c.id,a=h?f.homeGoals:f.awayGoals,b=h?f.awayGoals:f.homeGoals;return n+(a>b?3:a===b?1:0)},0);ok=pts>=q.target;body="Four-match review: "+pts+" points; target "+q.target+"."}else{if(d<q.due)continue;if(q.kind==="budget"){const n=c.budget+(c.recruitmentReserve||0);ok=n>=q.target;body="Retained "+money(n)+"; target "+money(q.target)+"."}else if(q.kind==="player"){const p=c.players.find(p=>p.id===q.playerId);body=p?p.name+" now has morale "+p.morale+"/100.":"Player no longer at club."}else body="Board confidence "+r.board+"/100; manager trust "+r.manager+"/100."}if(ok!==null)r.board=cap(r.board+(ok?5:-7));q.status=ok===null?"resolved":ok?"met":"failed";calendarEvent(s,"story-follow:"+q.id,ok===null?"Follow-up review":ok?"Commitment fulfilled":"Commitment missed",body,ok===null?"Club office":"Club board")}}
correspondenceTick=function(s){tick(s);follow(s);officeMessages(s)};
})();