"use strict";
const KEY="nextgen-football-director-v1", PREF="ngfd-compact";
const DIVISIONS=["Premier Division","Championship","League One","League Two","National League"];
const CLUB_SEEDS=[
["Metropolitan FC","Crownport City","Redmere United","Ashwick Rovers"],
["Westford City","Bramley Town","Hartmere Albion","Southvale United"],
["Kingsport United","Dunford Athletic","Elmbridge City","Ravenswick Town"],
["Northbridge Athletic","Eastborough FC","Oakmere Rovers","Westridge Town"],
["Harbourfield FC","Millhaven United","Stoneleigh Athletic","Fenwick Borough"]];
const LEGACY_CLUBS={"Northbridge Athletic":[10,425000,"High pressing",42000],"Eastborough FC":[8,240000,"Direct football",35000],"Kingsport United":[25,1200000,"Possession football",85000],"Westford City":[45,8000000,"Adaptable football",210000],"Metropolitan FC":[80,45000000,"Possession football",600000]};
const MANAGERS=["Adrian Mercer","Callum Henshaw","Martin Ellwood","Daniel Whitaker","Gareth Rowley","Simon Hartwell","Lewis Carver","Patrick Wren","Neil Ashford","Oliver Dacre","Richard Fenner","James Ridley","Thomas Vane","Andrew Hollis","Michael Brierley","David Keaton","Ben Marlow","Stephen Telford","Paul Wetherby","Chris Calder"];
function newWorld(){return {schema:1,season:"2026/27",clubs:CLUB_SEEDS.flatMap((names,t)=>names.map((name,i)=>{
const tier=t+1,ix=t*4+i,legacy=LEGACY_CLUBS[name];
const rep=legacy?legacy[0]:[75,42,23,12,5][t]+i*2;
const budget=legacy?legacy[1]:[32000000,5500000,950000,300000,75000][t]+i*[4000000,700000,100000,35000,10000][t];
const style=legacy?legacy[2]:["Possession football","High pressing","Counter-attacking","Direct football","Adaptable football"][(ix+t)%5];
const salary=legacy?legacy[3]:[420000,150000,65000,38000,26000][t]+i*[25000,10000,4000,2000,1000][t];
return {id:"club-"+tier+"-"+(i+1),name,tier,rep,budget,style,salary,stadium:name.replace(/ (FC|City|United|Athletic|Rovers|Town|Albion|Borough)$/,"")+" Park",capacity:[34000,19000,10500,6200,2800][t]+i*[2500,1200,650,400,200][t],cash:budget*3,wageBudget:[850000,190000,48000,22000,8500][t]+i*[45000,10000,3000,1500,500][t],training:Math.max(1,16-t*2+(i%3)),academy:Math.max(1,15-t*2+(i%3)),manager:{id:"manager-"+ix,name:MANAGERS[ix],style,formation:["4-3-3","4-2-3-1","4-4-2","3-5-2"][i]},boardObjective:["Challenge at the top","Compete for promotion","Consolidate league position","Maintain financial control","Establish a sustainable club"][t],director:null,vacant: name==="Northbridge Athletic"||name==="Eastborough FC"||name==="Harbourfield FC"||name==="Kingsport United"||name==="Westford City"||name==="Metropolitan FC"};
}))}}
const clubs=newWorld().clubs;
function careerWorld(s){if(s?.world?.schema===1&&Array.isArray(s.world.clubs)&&s.world.clubs.length===clubs.length)return s.world;const w=newWorld();if(s?.club){const c=w.clubs.find(c=>c.name===s.club);if(c){c.director=s.name;c.vacant=false}}return w}
function activeClubs(s){return s?careerWorld(s).clubs:clubs}

const panel=document.querySelector("#panel"),menu=document.querySelector("#menu");
const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(n);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ATTRIBUTE_LABELS={negotiation:"Negotiation",playerAbility:"Judging player ability",playerPotential:"Judging player potential",finance:"Financial management",footballKnowledge:"Football knowledge",staffAbility:"Judging staff ability",leadership:"Leadership",networking:"Networking",decisionMaking:"Decision-making",manManagement:"Man management",adaptability:"Adaptability",pressure:"Pressure handling"};
const ATTRIBUTE_PROFILES={"Scout":[8,12,13,6,11,7,6,10,8,7,9,7],"Recruitment analyst":[7,11,12,9,11,7,6,6,12,6,9,7],"Academy coordinator":[6,10,13,7,9,9,10,7,8,11,7,6],"Former player":[7,10,8,5,13,8,9,11,8,10,8,10],"No professional experience":[6,6,6,7,7,6,7,5,7,6,8,6]};
function startingAttributes(background){const values=Object.hasOwn(ATTRIBUTE_PROFILES,background)?ATTRIBUTE_PROFILES[background]:ATTRIBUTE_PROFILES["No professional experience"];return Object.fromEntries(Object.keys(ATTRIBUTE_LABELS).map((k,i)=>[k,values[i]]))}
function directorAttributes(s){const base=startingAttributes(s.background);return Object.fromEntries(Object.keys(base).map(k=>[k,Number.isInteger(s.attributes?.[k])?Math.max(1,Math.min(20,s.attributes[k])):base[k]]))}
function attributePanel(attributes){return '<div class="director-attributes">'+Object.entries(ATTRIBUTE_LABELS).map(([k,label])=>'<div class="attribute-row"><span>'+label+'</span><div class="attribute-track" role="meter" aria-label="'+label+'" aria-valuemin="1" aria-valuemax="20" aria-valuenow="'+attributes[k]+'"><i style="width:'+attributes[k]*5+'%"></i></div><strong>'+attributes[k]+'<small>/20</small></strong></div>').join("")+'</div>'}
const CAREER_START="2026-07-01",CAREER_END="2066-06-30",MAX_SEASONS=40;
const iso=d=>d.toISOString().slice(0,10);
function datePlus(date,days){const d=new Date(date+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+days);return iso(d)}
function contractEnd(date,years){const d=new Date(date+"T00:00:00Z"),m=d.getUTCMonth();d.setUTCFullYear(d.getUTCFullYear()+years);if(d.getUTCMonth()!==m)d.setUTCDate(0);return iso(d)}
function syncCalendar(s){
if(!s.calendar||typeof s.calendar!=="object")s.calendar={date:CAREER_START,events:[]};
const k=s.calendar;
if(typeof k.date!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(k.date)||!Number.isFinite(Date.parse(k.date))||k.date<CAREER_START)k.date=CAREER_START;
if(k.date>=CAREER_END)k.date=CAREER_END;
if(!Array.isArray(k.events))k.events=[];
k.finished=k.date===CAREER_END;
const y=Number(k.date.slice(0,4))-(Number(k.date.slice(5,7))<7?1:0);
k.number=y-2026+1;s.season=y+"/"+String(y+1).slice(-2);s.age=k.finished?70:30+y-2026;
if(s.world)s.world.season=s.season;
if(s.club&&s.contract&&!s.contract.endDate){s.contract.startDate=CAREER_START;s.contract.endDate=contractEnd(CAREER_START,s.contract.years||2)}
return k;
}
function windowStatus(date){const m=Number(date.slice(5,7));return m===1?"January window open":m===7||m===8?"Summer window open":"Closed"}
function calendarEvent(s,id,subject,body,from="Career services"){const k=s.calendar;if(!k.events.some(e=>e.id===id))k.events.push({id,subject,body,from,date:k.date})}
function endAppointment(s,status){employmentRecord(s);const c=activeClubs(s).find(x=>x.name===s.club);if(c){c.director=null;c.vacant=true;delete s.applications[c.name];delete s.employment[c.name]}const entry=s.history.slice().reverse().find(x=>x.club===s.club&&x.status==="Current appointment");if(entry){entry.status=status;entry.endDate=s.calendar.date}s.club=null;delete s.contract;delete s.relationships}
const clampConfidence=n=>Math.max(0,Math.min(100,n));
function relationships(s,c){
if(!c)return null;
if(!s.relationships||s.relationships.clubId!==c.id)s.relationships={clubId:c.id,board:60,manager:55+(s.style===c.manager.style?10:0),decisions:0,nextReview:datePlus(s.calendar.date,28),pending:null,renewal:false};
return s.relationships;
}
function security(r){return r.board<25?"Critical":r.board<40?"Under pressure":r.board<65?"Stable":"Secure"}
function relationshipReview(s){
const c=activeClubs(s).find(x=>x.name===s.club);if(!c)return;
const r=relationships(s,c),d=s.calendar.date;
if(d>=r.nextReview){
if(r.pending){r.board=clampConfidence(r.board-8);r.manager=clampConfidence(r.manager-6);calendarEvent(s,"missed:"+r.nextReview,"Review missed","The board and manager are concerned that you did not respond to the previous review.",c.name)}
r.pending={id:d,kind:r.decisions%3};r.nextReview=datePlus(d,28);
calendarEvent(s,"review:"+d,"Strategic review required","A decision is awaiting your response in Club Operations.",c.name);
}
if(r.board<25){const name=c.name;s.rep=Math.max(0,s.rep-2);endAppointment(s,"Dismissed");calendarEvent(s,"dismissed:"+d,"Director dismissed","The board of "+name+" has terminated your appointment following a loss of confidence.",name);return}
if(s.contract?.endDate&&d>=datePlus(s.contract.endDate,-90)&&!r.renewal&&r.board>=65){r.renewal=true;calendarEvent(s,"renewal:"+d,"Contract renewal available","The board is willing to extend your contract. Review the proposal in Club Operations.",c.name)}
}
const REVIEW_CASES=[
{title:"Recruitment budget disagreement",body:"The manager wants more flexibility to recruit. The board expects you to protect the existing budget.",choices:[["Agree a joint shortlist within the budget.",4,5],["Promise the manager additional spending without board approval.",-12,5],["Dismiss the manager's concerns without discussion.",-2,-12]]},
{title:"Long-term squad strategy",body:"The board wants a sustainable squad while the manager wants greater experience.",choices:[["Agree a balanced recruitment plan with clear cost limits.",5,4],["Commit exclusively to expensive experienced players.",-10,5],["Demand an academy-only policy regardless of squad needs.",-4,-9]]},
{title:"Recruitment authority",body:"The manager asks for clarity about responsibility for player recruitment.",choices:[["Agree responsibilities and preserve the manager's matchday autonomy.",4,5],["Override the manager's tactical decisions.",-8,-15],["Give the manager unrestricted recruitment spending.",-12,4]]}];
function resolveReview(s,index){
const c=activeClubs(s).find(x=>x.name===s.club);if(!c||s.calendar.finished)return false;
const r=relationships(s,c),p=r.pending,choice=p&&REVIEW_CASES[p.kind].choices[index];if(!choice)return false;
r.board=clampConfidence(r.board+choice[1]);r.manager=clampConfidence(r.manager+choice[2]);r.decisions++;r.pending=null;
calendarEvent(s,"decision:"+p.id,"Strategic review completed",choice[0]+" Board confidence: "+r.board+"/100. Manager relationship: "+r.manager+"/100.",c.name);
if(r.board<25){s.rep=Math.max(0,s.rep-2);endAppointment(s,"Dismissed");calendarEvent(s,"dismissed:"+p.id,"Director dismissed","The board has terminated your appointment following a loss of confidence.",c.name)}
return true;
}
function renewAppointment(s){const c=activeClubs(s).find(x=>x.name===s.club);if(!c||s.calendar.finished)return false;const r=relationships(s,c);if(!r.renewal||r.board<65||!s.contract)return false;s.contract.endDate=contractEnd(s.contract.endDate,2);s.contract.years+=2;r.renewal=false;calendarEvent(s,"renewed:"+s.calendar.date,"Contract extended","Your existing contract has been extended by two years at the current salary.",c.name);return true}
function relationshipControls(s,c){const r=relationships(s,c),p=r.pending,review=p?REVIEW_CASES[p.kind]:null;return '<div class="setup-review"><div><small>Board confidence</small><strong>'+r.board+'/100</strong></div><div><small>Manager relationship</small><strong>'+r.manager+'/100</strong></div><div><small>Job security</small><strong>'+security(r)+'</strong></div></div><p>Recruitment authority: '+escapeHtml(s.authority||"Collaborative")+'</p>'+(review?'<h4>'+review.title+'</h4><p>'+review.body+'</p>'+review.choices.map((v,i)=>'<button class="action relationship-choice" data-review="'+i+'">'+v[0]+'</button>').join(""):'<p>Next strategic review: '+prettyDate(r.nextReview)+'</p>')+(r.renewal&&r.board>=65?'<button class="action main" id="renew-contract">Extend contract by two years</button>':'')+'<button class="action" id="resign-role">Resign from club</button>'}
const STAFF_ROLES=["Manager","Assistant manager","Head scout","Academy director"];
const STAFF_PERSONALITIES=["Analytical","Demanding","Diplomatic","Pragmatic","Ambitious"];
const STAFF_STYLES=["Possession football","High pressing","Counter-attacking","Direct football","Adaptable football"];
function staffPerson(id,name,role,tier,n,date,existing={}){
const base=17-tier*2;
return {...existing,id,name,role,age:36+n%22,personality:STAFF_PERSONALITIES[n%5],style:existing.style||STAFF_STYLES[n%5],formation:existing.formation||["4-3-3","4-2-3-1","4-4-2","3-5-2"][n%4],attributes:{coaching:Math.min(20,base+n%4),tactics:Math.min(20,base+(n+1)%4),judgement:Math.min(20,base+(n+2)%4),development:Math.min(20,base+(n+3)%4),leadership:Math.min(20,base+n%3)},salary:Math.round([1800000,380000,120000,52000,28000][tier-1]*(role==="Manager"?1:role==="Assistant manager"?.48:.35)),endDate:contractEnd(date,2)};
}
function ensureStaff(w){
if(w.staffSchema===1)return w;
w.freeStaff=[];
w.clubs.forEach((c,i)=>{
c.manager=staffPerson(c.manager.id,c.manager.name,"Manager",c.tier,i,CAREER_START,c.manager);
c.staff=STAFF_ROLES.slice(1).map((role,j)=>staffPerson(c.id+"-staff-"+j,["Alex","Robin","Jamie"][j]+" "+["Bennett","Fletcher","Morgan","Reed","Hughes","Walsh","Clarke","Dawson","Shaw","Reynolds","Mills","Carter","Brooks","Parker","Wright","Hill","Grant","West","Stone","Ford"][i],role,c.tier,i*3+j,CAREER_START));
c.staffBudget=Math.round(c.wageBudget*52*.22);c.staffHistory=[];c.delegation={scouting:false,academy:false,staff:false};
});
const names=["Elliot Banks","Mark Sutton","Dean Foster","Ryan Beckett","Alan Rivers","Scott Harding","Peter Lane","Neil Cooper","Adam Marsh","Graham Cole","Liam Webb","Sean Curtis","Tom Reeves","Luke Hall","Jack Nolan","Ian Cross","Owen Blake","Sam Wood","Paul Knight","Rob Field"];
names.forEach((name,i)=>{const role=STAFF_ROLES[i%4],tier=1+Math.floor(i/4);const p=staffPerson("free-"+i,name,role,tier,i+20,CAREER_START);p.endDate=null;w.freeStaff.push(p)});
w.staffSchema=1;return w;
}
function staffPayroll(c){return c.manager.salary+c.staff.reduce((n,p)=>n+p.salary,0)}
function staffFit(s,p){return (p.style===s.style?20:0)+(p.formation===s.formation?10:0)+Math.round(Object.values(p.attributes).reduce((a,b)=>a+b,0)/5*3.5)}
function staffCost(p,date){return Math.max(0,Math.round(p.salary*Math.max(0,(Date.parse(p.endDate)-Date.parse(date))/86400000)/365))}
function replaceStaff(s,role,id){
if(!s.club||s.calendar.finished||!STAFF_ROLES.includes(role))return {ok:false,reason:"No active appointment."};
const w=ensureStaff(s.world),c=w.clubs.find(x=>x.name===s.club),p=w.freeStaff.find(x=>x.id===id&&x.role===role);if(!c||!p)return {ok:false,reason:"Candidate unavailable."};
const old=role==="Manager"?c.manager:c.staff.find(x=>x.role===role);const cost=old?staffCost(old,s.calendar.date):0;
if(staffPayroll(c)-(old?.salary||0)+p.salary>c.staffBudget)return {ok:false,reason:"Annual staff budget exceeded."};
if(cost>c.cash)return {ok:false,reason:"Insufficient club cash for compensation."};
const r=relationships(s,c);if(r.board<40)return {ok:false,reason:"The board will not approve changes while confidence is below 40."};
c.cash-=cost;w.freeStaff=w.freeStaff.filter(x=>x.id!==id);
if(old){w.freeStaff.push({...old,endDate:null});c.staffHistory.push({name:old.name,role,date:s.calendar.date,compensation:cost,status:"Released"})}
const hired={...p,endDate:contractEnd(s.calendar.date,2)};
if(role==="Manager"){c.manager=hired;r.manager=55+(s.style===p.style?10:0)}else c.staff=[...c.staff.filter(x=>x.role!==role),hired];
c.staffHistory.push({name:p.name,role,date:s.calendar.date,status:"Appointed"});calendarEvent(s,"staff:"+id+":"+s.calendar.date,"Staff appointment",p.name+" appointed as "+role+". Compensation: "+money(cost)+".",c.name);return {ok:true};
}
function staffTick(s){const w=ensureStaff(s.world);for(const c of w.clubs){for(const p of [c.manager,...c.staff])if(p.endDate<=s.calendar.date){p.endDate=contractEnd(s.calendar.date,1);if(c.name===s.club)calendarEvent(s,"staff-extension:"+p.id+":"+s.calendar.date,"Staff contract extended",p.name+" has received a one-year continuity extension at the same salary.",c.name)}}}
function staffScreen(role="Manager",notice=""){
const s=load();if(!s||!s.club||s.calendar.finished)return career();const w=ensureStaff(s.world),c=w.clubs.find(x=>x.name===s.club);
const esc=escapeHtml,old=role==="Manager"?c.manager:c.staff.find(x=>x.role===role);
const info=p=>'<strong>'+esc(p.name)+'</strong><small>Age '+p.age+' · '+esc(p.personality)+' · '+esc(p.style)+' · '+esc(p.formation)+'</small><small>'+money(p.salary)+'/year · '+(p.endDate?"Expires "+prettyDate(p.endDate):"Free agent")+'</small><div class="staff-attributes">'+Object.entries(p.attributes).map(([k,v])=>'<span>'+esc(k)+' <b>'+v+'/20</b></span>').join("")+'</div>';
show("Manager & Staff",'<p>'+esc(c.name)+' · Annual staff payroll '+money(staffPayroll(c))+' / '+money(c.staffBudget)+'</p><div class="world-tabs">'+STAFF_ROLES.map((r,i)=>'<button class="action '+(r===role?"main":"")+'" data-role="'+i+'">'+r+'</button>').join("")+'</div>'+(notice?'<p class="setup-note">'+esc(notice)+'</p>':'')+'<section class="office-card"><h3>Current '+esc(role.toLowerCase())+'</h3>'+info(old)+'<p>Release compensation: '+money(staffCost(old,s.calendar.date))+'</p></section><section class="office-card"><h3>Available candidates</h3>'+w.freeStaff.filter(p=>p.role===role).sort((a,b)=>staffFit(s,b)-staffFit(s,a)).map(p=>'<article class="staff-candidate">'+info(p)+'<small>Profile fit score: '+staffFit(s,p)+'/100</small><button class="action" data-hire="'+esc(p.id)+'">Replace current staff member</button></article>').join("")+'</section><section class="office-card"><h3>Delegation preferences</h3>'+[["scouting","Head scout prepares recruitment shortlists"],["academy","Academy director recommends promotions"],["staff","Assistant manager recommends staff targets"]].map(([k,l])=>'<label class="staff-delegate"><input type="checkbox" data-delegate="'+k+'" '+(c.delegation[k]?"checked":"")+'>'+l+'</label>').join("")+'<p class="setup-note">Delegation preferences are saved; autonomous recommendations arrive with the relevant gameplay engines.</p></section>');
panel.querySelector("#back").textContent="Back to office";panel.querySelector("#back").onclick=()=>career("club");
panel.querySelectorAll("[data-role]").forEach(b=>b.onclick=()=>staffScreen(STAFF_ROLES[+b.dataset.role]));
panel.querySelectorAll("[data-hire]").forEach(b=>b.onclick=()=>{if(!confirm("Replace "+old.name+"? Compensation is "+money(staffCost(old,s.calendar.date))+"."))return;const result=replaceStaff(s,role,b.dataset.hire);if(!result.ok)return staffScreen(role,result.reason);if(save(s))staffScreen(role,"Appointment confirmed.")});
panel.querySelectorAll("[data-delegate]").forEach(b=>b.onchange=()=>{c.delegation[b.dataset.delegate]=b.checked;if(!save(s))staffScreen(role)});
}
const POSITIONS=["GK","RB","CB","LB","DM","CM","AM","RW","LW","ST"];
const SQUAD_POS=["GK","GK","GK","RB","RB","CB","CB","CB","CB","LB","LB","DM","DM","CM","CM","CM","AM","AM","RW","RW","LW","LW","ST","ST","ST"];
const FIRST_NAMES=["Aaron","Adam","Alex","Ben","Callum","Charlie","Daniel","Dylan","Ethan","Finley","George","Harry","Isaac","Jack","Jacob","Jamie","Joe","Josh","Kai","Liam","Leo","Lewis","Lucas","Mason","Nathan","Noah","Oliver","Oscar","Ryan","Sam","Theo","Thomas","Tyler","Zak"];
const LAST_NAMES=["Abbott","Barker","Brooks","Campbell","Clarke","Cole","Cooper","Davies","Dawson","Edwards","Evans","Fisher","Foster","Grant","Gray","Green","Hall","Harris","Hayes","Hill","Hughes","Jackson","Jones","Kelly","King","Lane","Lewis","Marshall","Mason","Mills","Mitchell","Moore","Morgan","Morris","Nolan","Parker","Reed","Roberts","Ross","Scott","Shaw","Smith","Taylor","Turner","Walker","Ward","White","Wilson","Wood"];
function playerRoll(n,salt){return ((Math.imul(n+1,2654435761)^Math.imul(salt+17,1597334677))>>>0)%1000}
function makePlayer(c,n,academy,date){
const seed=n+1, age=academy?16+playerRoll(seed,2)%3:19+playerRoll(seed,2)%16;
const ability=Math.max(20,Math.min(90,84-c.tier*12+playerRoll(seed,3)%19-9-(academy?20:0)));
const potential=Math.min(96,ability+(academy?15+playerRoll(seed,4)%17:Math.max(2,32-age)+playerRoll(seed,4)%8));
const position=academy?POSITIONS[playerRoll(seed,5)%10]:SQUAD_POS[n%25];
const salary=academy?Math.round(c.wageBudget*.002):Math.max(100,Math.round(c.wageBudget/29*(.6+playerRoll(seed,6)%90/100)/10)*10);
const attrs={pace:Math.min(20,Math.max(1,Math.round(ability/5)+playerRoll(seed,7)%5-2)),technical:Math.min(20,Math.max(1,Math.round(ability/5)+playerRoll(seed,8)%5-2)),passing:Math.min(20,Math.max(1,Math.round(ability/5)+playerRoll(seed,9)%5-2)),defending:Math.min(20,Math.max(1,Math.round(ability/5)+(["CB","RB","LB","DM"].includes(position)?3:-3))),finishing:Math.min(20,Math.max(1,Math.round(ability/5)+(position==="ST"?3:-3))),goalkeeping:position==="GK"?Math.round(ability/5):1,mentality:Math.min(20,Math.max(1,Math.round(ability/5)+playerRoll(seed,10)%5-2))};
return {id:"player-"+n,name:FIRST_NAMES[playerRoll(seed,11)%FIRST_NAMES.length]+" "+LAST_NAMES[playerRoll(seed,12)%LAST_NAMES.length],age,position,nationality:["English","English","English","Scottish","Welsh","Irish","French","Dutch"][playerRoll(seed,13)%8],personality:["Professional","Ambitious","Balanced","Determined","Reserved"][playerRoll(seed,14)%5],ability,potential,attributes:attrs,wage:salary,value:Math.round(Math.max(1000,c.budget/12*(ability/50)**2*(age<25?1.3:age>30?.55:1))/100)*100,contractEnd:contractEnd(date,academy?2:1+playerRoll(seed,15)%4),morale:65+playerRoll(seed,16)%21,fitness:90+playerRoll(seed,17)%11,injuryDays:0,academy};
}
function ensurePlayers(w,date=CAREER_START){
if(w.playerSchema===1)return w;
w.nextPlayerId=0;w.freePlayers=[];
for(const c of w.clubs){c.players=Array.from({length:25},()=>makePlayer(c,w.nextPlayerId++,false,date));c.academyPlayers=Array.from({length:5},()=>makePlayer(c,w.nextPlayerId++,true,date));c.recruitmentRequests=[];c.playerHistory=[];c.nextRecruitment=datePlus(date,28)}
w.playerSchema=1;return w;
}
function squadPayroll(c){return [...c.players,...c.academyPlayers].reduce((n,p)=>n+p.wage,0)}
function squadDepth(c){return POSITIONS.map(position=>{const list=c.players.filter(p=>p.position===position);return {position,count:list.length,best:list.length?Math.max(...list.map(p=>p.ability)):0}})}
function generateRequest(s,c){
const depth=squadDepth(c).sort((a,b)=>a.count-b.count||a.best-b.best);
const need=depth[0];const id="request-"+c.id+"-"+s.calendar.date;
if(c.recruitmentRequests.some(r=>r.status==="Pending"))return;
c.recruitmentRequests.push({id,position:need.position,reason:need.count<2?"Insufficient positional depth":"Improve the weakest positional group",maxFee:Math.round(c.budget*.3),status:"Pending",date:s.calendar.date,manager:c.manager.name});
calendarEvent(s,id,"Manager recruitment request",c.manager.name+" requests a "+need.position+". Review the request in Squad Management.",c.name);
}
function playerTick(s,newSeason){
const w=ensurePlayers(s.world,s.calendar.date),date=s.calendar.date;
for(const c of w.clubs){
for(const key of ["players","academyPlayers"]){
const keep=[];for(const p of c[key]){
if(newSeason){p.age++;const old=p.ability;const delta=p.age<=23?Math.min(3,Math.max(0,p.potential-p.ability)):p.age>=32?-(p.age>=35?3:1):0;p.ability=Math.max(10,Math.min(p.potential,p.ability+delta));const shift=Math.round(p.ability/5)-Math.round(old/5);if(shift)for(const key of Object.keys(p.attributes)){if(key==="goalkeeping"&&p.position!=="GK")continue;p.attributes[key]=Math.max(1,Math.min(20,p.attributes[key]+shift))}p.value=Math.max(1000,Math.round(p.value*(p.ability/Math.max(1,old))**2*(p.age>=32?.85:1)/100)*100)}
if(p.injuryDays>0)p.injuryDays--;
if(p.contractEnd<=date||p.age>=38){
const retired=p.age>=38;c.playerHistory.push({id:p.id,name:p.name,date,status:retired?"Retired":"Contract expired"});
if(!retired)w.freePlayers.push({...p,contractEnd:null,academy:false});
if(c.name===s.club)calendarEvent(s,"player-exit:"+p.id+":"+date,retired?"Player retired":"Player contract expired",p.name+" has left the club.",c.name);
}else keep.push(p)
}c[key]=keep;
}
if(newSeason){while(c.academyPlayers.length<5)c.academyPlayers.push(makePlayer(c,w.nextPlayerId++,true,date))}
if(c.name===s.club&&date>=c.nextRecruitment){generateRequest(s,c);c.nextRecruitment=datePlus(date,28)}
}
if(newSeason){for(const p of w.freePlayers)p.age++;w.freePlayers=w.freePlayers.filter(p=>p.age<38)}
}
function promotePlayer(s,id){const c=s.world.clubs.find(c=>c.name===s.club);if(!c||s.calendar.finished)return false;const p=c.academyPlayers.find(p=>p.id===id);if(!p||c.players.length>=30)return false;c.academyPlayers=c.academyPlayers.filter(x=>x.id!==id);p.academy=false;c.players.push(p);c.playerHistory.push({id,name:p.name,date:s.calendar.date,status:"Promoted"});return true}
function renewPlayer(s,id){const c=s.world.clubs.find(c=>c.name===s.club);if(!c||s.calendar.finished)return false;const p=[...c.players,...c.academyPlayers].find(p=>p.id===id);if(!p||p.contractEnd>datePlus(s.calendar.date,365))return false;const wage=Math.ceil(p.wage*1.08);if(squadPayroll(c)-p.wage+wage>c.wageBudget)return false;p.wage=wage;p.contractEnd=contractEnd(p.contractEnd,2);return true}
function respondRequest(s,id,approve){const c=s.world.clubs.find(c=>c.name===s.club);if(!c||s.calendar.finished)return false;const r=c.recruitmentRequests.find(r=>r.id===id&&r.status==="Pending");if(!r)return false;r.status=approve?"Approved":"Declined";const rel=relationships(s,c);rel.manager=clampConfidence(rel.manager+(approve?3:-3));return true}
function squadScreen(tab="first",notice="",position="All"){
const s=load();if(!s||!s.club||s.calendar.finished)return career();const c=s.world.clubs.find(c=>c.name===s.club),esc=escapeHtml;
const tabs=[["first","First team"],["academy","Academy"],["depth","Squad depth"],["requests","Recruitment requests"]];
let body="";
if(tab==="depth")body='<div class="world-table-wrap"><table class="world-table"><thead><tr><th>Position</th><th>Players</th><th>Best ability</th><th>Depth</th></tr></thead><tbody>'+squadDepth(c).map(d=>'<tr><td>'+d.position+'</td><td>'+d.count+'</td><td>'+d.best+'/100</td><td>'+(d.count<2?"Needs attention":"Covered")+'</td></tr>').join("")+'</tbody></table></div>';
else if(tab==="requests")body=c.recruitmentRequests.slice().reverse().map(r=>'<article class="office-card"><h3>'+esc(r.position)+' · '+esc(r.status)+'</h3><p>'+esc(r.manager)+': '+esc(r.reason)+'</p><p>Suggested fee limit: '+money(r.maxFee)+'</p>'+(r.status==="Pending"?'<button class="action main" data-approve="'+r.id+'">Approve search</button><button class="action" data-decline="'+r.id+'">Decline</button>':'')+'</article>').join("")||'<p>No requests yet. The manager reviews positional needs every 28 days.</p>';
else {const list=(tab==="academy"?c.academyPlayers:c.players).filter(p=>position==="All"||p.position===position);body='<label>Position<select id="squad-filter">'+["All",...POSITIONS].map(x=>'<option '+(x===position?"selected":"")+'>'+x+'</option>').join("")+'</select></label><div class="world-table-wrap"><table class="world-table"><thead><tr><th>Player</th><th>Age</th><th>Pos</th><th>Ability</th><th>Potential</th><th>Value</th><th>Weekly wage</th><th>Contract</th><th>Morale</th><th>Fitness</th></tr></thead><tbody>'+list.map(p=>'<tr><td><button class="world-link" data-player="'+p.id+'">'+esc(p.name)+'</button></td><td>'+p.age+'</td><td>'+p.position+'</td><td>'+p.ability+'</td><td>'+p.potential+'</td><td>'+money(p.value)+'</td><td>'+money(p.wage)+'</td><td>'+esc(p.contractEnd)+'</td><td>'+p.morale+'</td><td>'+p.fitness+'</td></tr>').join("")+'</tbody></table></div>'}
show("Squad Management",'<p>'+esc(c.name)+' · '+c.players.length+' first-team players · '+c.academyPlayers.length+' academy prospects</p><p>Weekly player wages: '+money(squadPayroll(c))+' / '+money(c.wageBudget)+'</p><div class="world-tabs">'+tabs.map(([k,l])=>'<button class="action '+(k===tab?"main":"")+'" data-squad="'+k+'">'+l+'</button>').join("")+'</div>'+(notice?'<p class="setup-note">'+esc(notice)+'</p>':'')+body+'<p class="setup-note">Ability and potential are prototype ratings. Fitness, morale and injuries are not match-driven yet; approved requests are planning records, not transfers.</p>');
panel.querySelector("#back").textContent="Back to office";panel.querySelector("#back").onclick=()=>career("club");
panel.querySelectorAll("[data-squad]").forEach(b=>b.onclick=()=>squadScreen(b.dataset.squad));
const filter=panel.querySelector("#squad-filter");if(filter)filter.onchange=()=>squadScreen(tab,"",filter.value);
panel.querySelectorAll("[data-player]").forEach(b=>b.onclick=()=>playerScreen(b.dataset.player,tab));
panel.querySelectorAll("[data-approve],[data-decline]").forEach(b=>b.onclick=()=>{if(respondRequest(s,b.dataset.approve||b.dataset.decline,!!b.dataset.approve)&&save(s))squadScreen("requests")});
}
function playerScreen(id,tab){
const s=load();if(!s||!s.club)return career();const c=s.world.clubs.find(c=>c.name===s.club),p=[...c.players,...c.academyPlayers].find(p=>p.id===id);if(!p)return squadScreen(tab);
const fields=[["Age",p.age],["Position",p.position],["Nationality",p.nationality],["Personality",p.personality],["Ability",p.ability+"/100"],["Potential",p.potential+"/100"],["Valuation",money(p.value)],["Weekly wage",money(p.wage)],["Contract expiry",prettyDate(p.contractEnd)],["Morale",p.morale+"/100"],["Fitness",p.fitness+"/100"],["Injury days",p.injuryDays]];
show(escapeHtml(p.name),'<div class="setup-review">'+fields.map(([k,v])=>'<div><small>'+k+'</small><strong>'+escapeHtml(v)+'</strong></div>').join("")+'</div><section class="office-card"><h3>Player attributes</h3><div class="staff-attributes">'+Object.entries(p.attributes).map(([k,v])=>'<span>'+k+' <b>'+v+'/20</b></span>').join("")+'</div></section>'+(p.academy?'<button class="action main" id="promote-player">Promote to first team</button>':'')+(p.contractEnd<=datePlus(s.calendar.date,365)?'<button class="action" id="renew-player">Extend two years · 8% wage rise</button>':''));
panel.querySelector("#back").textContent="Back to squad";panel.querySelector("#back").onclick=()=>squadScreen(tab);
const promote=panel.querySelector("#promote-player");if(promote)promote.onclick=()=>{if(confirm("Promote "+p.name+"?")&&promotePlayer(s,id)&&save(s))squadScreen("first","Player promoted.");else if(c.players.length>=30)squadScreen(tab,"First team is full.")};
const renew=panel.querySelector("#renew-player");if(renew)renew.onclick=()=>{if(confirm("Extend this contract at an 8% wage increase?")){if(renewPlayer(s,id)&&save(s))playerScreen(id,tab);else squadScreen(tab,"Renewal exceeds wage budget or is unavailable.")}};
}
function ensureTransfers(w){if(!Array.isArray(w.transfers))w.transfers=[];if(!Array.isArray(w.freePlayers))w.freePlayers=[];for(const c of w.clubs)if(!Array.isArray(c.shortlist))c.shortlist=[];return w}
function marketPlayers(w){return [...w.clubs.flatMap(c=>c.players.map(p=>({p,club:c}))),...w.freePlayers.map(p=>({p,club:null}))]}
function transferTerms(s,buyer,entry){const p=entry.p,seller=entry.club,own=buyer.name===s.club;const skill=own?directorAttributes(s).negotiation:10;
const important=seller&&seller.players.filter(x=>x.position===p.position).length<=2;
return {fee:seller?Math.ceil(p.value*(1.12+(important?.25:0)-skill*.008)/100)*100:0,wage:Math.max(100,Math.ceil(p.wage*(1.15-skill*.006)/10)*10)};
}
function executeTransfer(s,buyerId,playerId,fee,wage,years){
const w=ensureTransfers(s.world),buyer=w.clubs.find(c=>c.id===buyerId),entry=marketPlayers(w).find(x=>x.p.id===playerId);
if(!buyer||!entry||entry.club===buyer||s.calendar.finished)return {ok:false,reason:"Player unavailable."};
const {p,club:seller}=entry,terms=transferTerms(s,buyer,entry);
if(seller&&windowStatus(s.calendar.date)==="Closed")return {ok:false,reason:"The transfer window is closed."};
if(!Number.isInteger(fee)||!Number.isInteger(wage)||!Number.isInteger(years)||fee<0||wage<100||years<1||years>5)return {ok:false,reason:"Invalid terms."};
if(!seller&&fee!==0)return {ok:false,reason:"Free agents have no transfer fee."};
if(buyer.players.length>=30||fee>buyer.budget||fee>buyer.cash||squadPayroll(buyer)+wage>buyer.wageBudget)return {ok:false,reason:"Squad capacity or financial limits exceeded."};
if(seller&&seller.players.length<=16)return {ok:false,reason:"Selling club refuses to weaken its squad further."};
if(fee<terms.fee)return {ok:false,reason:"Selling club counters at "+money(terms.fee)+".",counter:terms.fee};
if(wage<terms.wage)return {ok:false,reason:"Agent requests "+money(terms.wage)+" per week.",wageCounter:terms.wage};
if(seller&&seller.tier+2<buyer.tier&&p.age<30&&wage<p.wage*1.4)return {ok:false,reason:"Player is reluctant to drop divisions; improved wages required."};
if(seller){seller.players=seller.players.filter(x=>x.id!==p.id);seller.cash+=fee;seller.budget+=Math.round(fee*.75)}else w.freePlayers=w.freePlayers.filter(x=>x.id!==p.id);
buyer.cash-=fee;buyer.budget-=fee;buyer.players.push({...p,academy:false,wage,contractEnd:contractEnd(s.calendar.date,years)});
buyer.shortlist=buyer.shortlist.filter(id=>id!==p.id);
w.transfers.push({id:"transfer-"+w.transfers.length,date:s.calendar.date,player:p.name,playerId:p.id,from:seller?seller.name:"Free agent",to:buyer.name,fee,wage,years});
if(buyer.name===s.club){const req=buyer.recruitmentRequests.find(r=>r.position===p.position&&r.status==="Approved");if(req)req.status="Fulfilled";calendarEvent(s,"transfer-"+w.transfers.length,"Signing completed",p.name+" joins "+buyer.name+" for "+money(fee)+".",buyer.name)}
if(seller?.name===s.club)calendarEvent(s,"transfer-"+w.transfers.length,"Player sold",p.name+" joins "+buyer.name+" for "+money(fee)+".",seller.name);
return {ok:true};
}
function aiRecruitment(s){
const w=ensureTransfers(s.world),date=s.calendar.date;
for(const c of w.clubs){
if(c.name===s.club)continue;
for(const p of c.players)if(p.contractEnd<=datePlus(date,28)&&p.age<36){p.contractEnd=contractEnd(p.contractEnd,2)}
while(c.players.length<22){
const need=squadDepth(c).sort((a,b)=>a.count-b.count||a.best-b.best)[0].position;
const available=w.freePlayers.filter(p=>p.position===need&&p.age<36&&p.wage<=c.wageBudget-squadPayroll(c)).sort((a,b)=>b.ability-a.ability);
if(available.length){const p=available[0];w.freePlayers=w.freePlayers.filter(x=>x.id!==p.id);c.players.push({...p,academy:false,contractEnd:contractEnd(date,2)});continue}
const youth=c.academyPlayers.find(p=>p.position===need&&p.age>=17)||c.academyPlayers.find(p=>p.age>=17);
if(youth){c.academyPlayers=c.academyPlayers.filter(p=>p.id!==youth.id);c.players.push({...youth,academy:false});continue}
const p=makePlayer(c,w.nextPlayerId++,false,date);p.position=need;p.wage=Math.max(100,Math.min(p.wage,c.wageBudget-squadPayroll(c)));if(squadPayroll(c)+p.wage>c.wageBudget)break;c.players.push(p);
}
}
}
function transferScreen(tab="search",notice="",pos="All",query=""){
const s=load();if(!s||!s.club||s.calendar.finished)return career();const w=ensureTransfers(s.world),c=w.clubs.find(c=>c.name===s.club),esc=escapeHtml;
const tabs=[["search","Player search"],["shortlist","Shortlist"],["sales","Player sales"],["history","Transfer history"]];
let body="";
if(tab==="history")body='<div class="world-table-wrap"><table class="world-table"><thead><tr><th>Date</th><th>Player</th><th>From</th><th>To</th><th>Fee</th></tr></thead><tbody>'+w.transfers.filter(t=>t.from===c.name||t.to===c.name).slice().reverse().map(t=>'<tr><td>'+t.date+'</td><td>'+esc(t.player)+'</td><td>'+esc(t.from)+'</td><td>'+esc(t.to)+'</td><td>'+money(t.fee)+'</td></tr>').join("")+'</tbody></table></div>';
else if(tab==="sales")body=c.players.map(p=>'<div class="club"><div><strong>'+esc(p.name)+'</strong><small>'+p.position+' · '+money(p.value)+'</small></div><button class="action" data-sell="'+p.id+'">Seek buyer</button></div>').join("");
else{const list=marketPlayers(w).filter(e=>e.club!==c&&(tab!=="shortlist"||c.shortlist.includes(e.p.id))&&(pos==="All"||e.p.position===pos)&&(!query||e.p.name.toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>a.p.value-b.p.value);
body='<form id="market-filter"><label>Player name<input name="query" value="'+esc(query)+'"></label><label>Position<select name="pos">'+["All",...POSITIONS].map(x=>'<option '+(x===pos?"selected":"")+'>'+x+'</option>').join("")+'</select></label><button class="action wide">Filter players</button></form><p>'+list.length+' results · showing first 100 by valuation</p><div class="world-table-wrap"><table class="world-table"><thead><tr><th>Player</th><th>Club</th><th>Age</th><th>Pos</th><th>Ability</th><th>Potential</th><th>Value</th><th>Action</th></tr></thead><tbody>'+list.slice(0,100).map(e=>'<tr><td><button class="world-link" data-target="'+e.p.id+'">'+esc(e.p.name)+'</button></td><td>'+esc(e.club?.name||"Free agent")+'</td><td>'+e.p.age+'</td><td>'+e.p.position+'</td><td>'+e.p.ability+'</td><td>'+e.p.potential+'</td><td>'+money(e.p.value)+'</td><td><button class="action" data-short="'+e.p.id+'">'+(c.shortlist.includes(e.p.id)?"Remove":"Shortlist")+'</button></td></tr>').join("")+'</tbody></table></div>'}
show("Transfers & Recruitment",'<p>'+esc(c.name)+' · '+windowStatus(s.calendar.date)+' · Transfer funds '+money(c.budget)+' · Weekly wages '+money(squadPayroll(c))+' / '+money(c.wageBudget)+'</p><div class="world-tabs">'+tabs.map(([k,l])=>'<button class="action '+(tab===k?"main":"")+'" data-market="'+k+'">'+l+'</button>').join("")+'</div>'+(notice?'<p class="setup-note">'+esc(notice)+'</p>':'')+body);
panel.classList.add("office-panel");panel.querySelector("#back").textContent="Back to office";panel.querySelector("#back").onclick=career;
panel.querySelectorAll("[data-market]").forEach(b=>b.onclick=()=>transferScreen(b.dataset.market));
const form=panel.querySelector("#market-filter");if(form)form.onsubmit=e=>{e.preventDefault();const f=new FormData(form);transferScreen(tab,"",String(f.get("pos")),String(f.get("query")))};
panel.querySelectorAll("[data-short]").forEach(b=>b.onclick=()=>{const id=b.dataset.short;c.shortlist=c.shortlist.includes(id)?c.shortlist.filter(x=>x!==id):[...c.shortlist,id];if(save(s))transferScreen(tab,"",pos,query)});
panel.querySelectorAll("[data-target]").forEach(b=>b.onclick=()=>transferTarget(b.dataset.target,tab));
panel.querySelectorAll("[data-sell]").forEach(b=>b.onclick=()=>saleScreen(b.dataset.sell));
}
function transferTarget(id,tab="search",notice="",proposed=null){
const s=load();if(!s||!s.club)return career();const c=s.world.clubs.find(c=>c.name===s.club),entry=marketPlayers(s.world).find(x=>x.p.id===id);if(!entry||entry.club===c)return transferScreen(tab,"Player unavailable.");const p=entry.p,t=transferTerms(s,c,entry),esc=escapeHtml;
show(esc(p.name),'<p>'+esc(entry.club?.name||"Free agent")+' · '+p.position+' · Age '+p.age+' · Ability '+p.ability+'/100 · Potential '+p.potential+'/100</p><p>Valuation '+money(p.value)+' · Current wages '+money(p.wage)+'/week</p>'+(notice?'<p class="setup-note">'+esc(notice)+'</p>':'')+'<form id="transfer-bid"><label>Transfer fee (£)<input type="number" name="fee" min="0" step="1" required value="'+(proposed?.fee??(entry.club?p.value:0))+'" '+(!entry.club?"readonly":"")+'></label><label>Weekly salary (£)<input type="number" name="wage" min="100" step="1" required value="'+(proposed?.wage??p.wage)+'"></label><label>Contract length<select name="years">'+[1,2,3,4,5].map(y=>'<option '+(y===(proposed?.years||3)?"selected":"")+'>'+y+'</option>').join("")+'</select></label><button class="action main wide">Submit offer</button></form><p class="setup-note">A successful offer completes the deal immediately. Both club and agent must accept the terms.</p>');
panel.querySelector("#back").textContent="Back to market";panel.querySelector("#back").onclick=()=>transferScreen(tab);
panel.querySelector("#transfer-bid").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),fee=Number(f.get("fee")),wage=Number(f.get("wage")),years=Number(f.get("years"));if(!confirm("Submit binding transfer offer?"))return;const result=executeTransfer(s,c.id,id,fee,wage,years);if(result.ok){if(save(s))transferScreen("history","Signing completed.")}else transferTarget(id,tab,result.reason,{fee:result.counter??fee,wage:result.wageCounter??wage,years})};
}
function saleScreen(id){
const s=load();if(!s||!s.club)return career();const c=s.world.clubs.find(c=>c.name===s.club),p=c.players.find(p=>p.id===id);if(!p)return transferScreen("sales");const entry={p,club:c};
const buyers=s.world.clubs.filter(b=>b!==c&&b.players.length<30&&Math.abs(b.tier-c.tier)<=1).map(b=>({b,t:transferTerms(s,b,entry)})).filter(({b,t})=>t.fee<=b.budget&&t.fee<=b.cash&&squadPayroll(b)+t.wage<=b.wageBudget).sort((a,b)=>b.t.fee-a.t.fee);
show("Offers for "+escapeHtml(p.name),'<p>Indicative buyer offers based on available budget and wages. Sales require an open transfer window.</p>'+buyers.map(({b,t})=>'<div class="club"><div><strong>'+escapeHtml(b.name)+'</strong><small>'+money(t.fee)+' · '+money(t.wage)+'/week</small></div><button class="action" data-buyer="'+b.id+'">Accept sale</button></div>').join("")+(buyers.length?"":"<p>No affordable buyers found.</p>"));
panel.querySelector("#back").textContent="Back to sales";panel.querySelector("#back").onclick=()=>transferScreen("sales");
panel.querySelectorAll("[data-buyer]").forEach(b=>b.onclick=()=>{const offer=buyers.find(x=>x.b.id===b.dataset.buyer);if(!confirm("Accept sale for "+money(offer.t.fee)+"?"))return;const result=executeTransfer(s,offer.b.id,id,offer.t.fee,offer.t.wage,3);if(result.ok){if(save(s))transferScreen("history","Sale completed.")}else transferScreen("sales",result.reason)});
}
function ensureLeague(s){
const w=s.world;if(!Array.isArray(w.seasonHistory))w.seasonHistory=[];
if(w.league?.season===s.season){ensurePreseason(s,w.league);return w.league;}
const y=Number(s.season.slice(0,4)),fixtures=[];
for(let tier=1;tier<=5;tier++){const ids=w.clubs.filter(c=>c.tier===tier).map(c=>c.id);if(ids.length!==4)continue;let rotation=ids.slice();for(let r=0;r<3;r++){for(let i=0;i<2;i++){const home=rotation[i],away=rotation[3-i];for(let leg=0;leg<2;leg++){const round=r+leg*3;fixtures.push({id:s.season+"-"+tier+"-"+round+"-"+i,round:round+1,homeClubId:leg?away:home,awayClubId:leg?home:away,date:datePlus(y+"-08-01",round*49),tier,type:"league",played:false})}}rotation=[rotation[0],rotation[3],rotation[1],rotation[2]]}}
w.league={season:s.season,fixtures};ensurePreseason(s,w.league);return w.league;
}
function ensurePreseason(s,l){if(l.preseasonVersion===1)return;const y=Number(s.season.slice(0,4));for(let tier=1;tier<=5;tier++){const ids=s.world.clubs.filter(c=>c.tier===tier).map(c=>c.id);if(ids.length!==4)continue;for(let r=0;r<3;r++){const date=datePlus(y+"-07-11",r*7);if(date>=s.calendar.date)for(let i=0;i<2;i++)l.fixtures.push({id:s.season+"-friendly-"+tier+"-"+r+"-"+i,round:r+1,homeClubId:ids[i],awayClubId:ids[3-i],date,tier,type:"friendly",played:false});ids.splice(1,0,ids.pop())}}l.preseasonVersion=1}
function leagueTable(s,tier){const l=ensureLeague(s),rows=s.world.clubs.filter(c=>c.tier===tier).map(c=>({id:c.id,name:c.name,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}));for(const f of l.fixtures.filter(f=>f.tier===tier&&f.played&&f.type!=="friendly")){const h=rows.find(x=>x.id===f.homeClubId),a=rows.find(x=>x.id===f.awayClubId);if(!h||!a)continue;h.p++;a.p++;h.gf+=f.homeGoals;h.ga+=f.awayGoals;a.gf+=f.awayGoals;a.ga+=f.homeGoals;if(f.homeGoals===f.awayGoals){h.d++;a.d++;h.pts++;a.pts++}else{const win=f.homeGoals>f.awayGoals?h:a,lose=win===h?a:h;win.w++;lose.l++;win.pts+=3}}return rows.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name))}
function matchTactics(c){return {formation:c.manager.formation,mentality:c.manager.style==="Counter-attacking"?"Defensive":c.manager.style==="High pressing"?"Attacking":"Balanced",pressing:c.manager.style==="High pressing"?"High":"Standard",passing:c.manager.style==="Direct football"?"Direct":"Mixed"}}
function matchContext(s,f){
const clubs=s.world.clubs.filter(c=>[f.homeClubId,f.awayClubId].includes(c.id));
const group=p=>p==="GK"?"GK":["RB","CB","LB"].includes(p)?"DEF":["DM","CM","AM"].includes(p)?"MID":"ATT";
const position={GK:"GK",RB:"DR",CB:"DC",LB:"DL",DM:"DMC",CM:"MC",AM:"AMC",RW:"AMR",LW:"AML",ST:"ST"};
const players=clubs.flatMap(c=>[...c.players,...c.academyPlayers].filter(p=>!p.injuryDays).map(p=>({...p,clubId:c.id,positionGroup:group(p.position),primaryPosition:position[p.position],currentAbility:Math.round(p.ability*2),isPlaceholder:false})));
const db={clubs:clubs.map(c=>({id:c.id,name:c.name,reputation:5500+c.rep*35})),players};
const lineups={};for(const c of clubs){const squad=players.filter(p=>p.clubId===c.id).sort((a,b)=>b.currentAbility*b.fitness-a.currentAbility*a.fitness),formation=c.manager.formation,counts=formation.split("-").map(Number),quota={GK:1,DEF:counts[0]||4,MID:counts.slice(1,-1).reduce((a,b)=>a+b,0)||3,ATT:counts.at(-1)||3};const picked=[];for(const [g,n] of Object.entries(quota))picked.push(...squad.filter(p=>p.positionGroup===g).slice(0,n));for(const p of squad)if(picked.length<11&&!picked.includes(p))picked.push(p);lineups[c.id]=picked.slice(0,11).map(p=>p.id)}
const home=clubs.find(c=>c.id===f.homeClubId),away=clubs.find(c=>c.id===f.awayClubId);
const career={clubId:home.id,seed:f.id,status:"active",roundIndex:0,fixtures:[[f]],lineupIds:lineups[home.id],tactics:matchTactics(home),playerStatus:Object.fromEntries(players.map(p=>[p.id,{condition:p.fitness,sharpness:90,morale:"Good"}]))};
return {db,career,lineups,home,away};
}
function startSpectator(s,f){const ctx=matchContext(s,f);if(ctx.lineups[f.homeClubId].length<11||ctx.lineups[f.awayClubId].length<11||[f.homeClubId,f.awayClubId].some(id=>!ctx.lineups[id].some(pid=>ctx.db.players.find(p=>p.id===pid)?.positionGroup==="GK")))return null;
const state=NGMatchEngine.createInteractiveMatch(ctx.career,ctx.db);state.awayLineupIds=ctx.lineups[f.awayClubId];state.directorOpponentTactics=matchTactics(ctx.away);for(const p of ctx.db.players){state.conditions[p.id]=p.fitness;state.ratings[p.id]??=6.5;state.minutesPlayed[p.id]??=0}return {fixtureId:f.id,state,ctx,walkout:null,aiSubs:{home:[],away:[]}}}
function emergencyCover(m,side){
const st=m.state,ids=st[side+"LineupIds"],db=m.ctx.db,clubId=st[side+"ClubId"],used=m.aiSubs[side],windows=m.aiWindows[side],injured=new Set(st.injuredIds||[]);
const keeper=ids.find(id=>db.players.find(p=>p.id===id)?.positionGroup==="GK");
if(keeper)return;
const bench=m.aiBench[side].map(id=>db.players.find(p=>p.id===id)).find(p=>p?.positionGroup==="GK"&&!ids.includes(p.id)&&!used.includes(p.id)&&!injured.has(p.id)&&!(st.sentOffIds||[]).includes(p.id));
const out=ids.map(id=>db.players.find(p=>p.id===id)).filter(Boolean).sort((a,b)=>Number(injured.has(b.id))-Number(injured.has(a.id))||a.currentAbility-b.currentAbility)[0];
if(!out)return;
if(bench&&used.length<5&&(st.minute===45||windows.includes(st.minute)||windows.length<3)&&st.minute<90){st[side+"LineupIds"]=ids.map(id=>id===out.id?bench.id:id);used.push(out.id);if(st.minute!==45&&!windows.includes(st.minute))windows.push(st.minute);st.events.push({minute:st.minute,type:"substitution",clubId,playerId:bench.id,outId:out.id,reason:"goalkeeper emergency",text:bench.name+" replaces "+out.name+" to cover in goal."});return}
const standIn=ids.map(id=>db.players.find(p=>p.id===id)).filter(p=>p&&!injured.has(p.id)).sort((a,b)=>(b.attributes?.goalkeeping||0)-(a.attributes?.goalkeeping||0)||b.currentAbility-a.currentAbility)[0];
if(standIn){standIn.positionGroup="GK";standIn.primaryPosition="GK";standIn.currentAbility=Math.max(20,Math.round(standIn.currentAbility*.4));st.events.push({minute:st.minute,type:"instruction",clubId,playerId:standIn.id,text:standIn.name+" takes over in goal as an emergency goalkeeper."})}
}
function spectatorStep(m){
const {ctx}=m;const result=NGMatchEngine.advanceInteractiveMatch(m.state,ctx.career,ctx.db);m.state=result.state;const st=m.state;
m.aiWindows||={home:[],away:[]};
m.aiBench||=Object.fromEntries(["home","away"].map(side=>[side,ctx.db.players.filter(p=>p.clubId===st[side+"ClubId"]&&!ctx.lineups[st[side+"ClubId"]].includes(p.id)).sort((a,b)=>Number(b.positionGroup==="GK")-Number(a.positionGroup==="GK")||b.currentAbility-a.currentAbility).slice(0,9).map(p=>p.id)]));
for(const side of ["home","away"]){
const ids=st[side+"LineupIds"],clubId=st[side+"ClubId"];
const injured=new Set(st.injuredIds||[]),sent=new Set(st.sentOffIds||[]),windows=m.aiWindows[side],used=m.aiSubs[side];
const trailing=side==="home"?st.homeGoals<st.awayGoals:st.awayGoals<st.homeGoals;
const leading=side==="home"?st.homeGoals>st.awayGoals:st.awayGoals>st.homeGoals;
const key=side==="home"?"tactics":"directorOpponentTactics";
if(st.minute>=55&&st.minute%5===0){const original=matchTactics(side==="home"?ctx.home:ctx.away);st[key]={...st[key],mentality:trailing?"Attacking":leading&&st.minute>=75?"Defensive":original.mentality,pressing:trailing?"High":leading&&st.minute>=75?"Low":original.pressing}}
const available=()=>m.aiBench[side].map(id=>ctx.db.players.find(p=>p.id===id)).filter(p=>p&&!st[side+"LineupIds"].includes(p.id)&&!used.includes(p.id)&&!injured.has(p.id)&&!sent.has(p.id));
const urgent=ids.some(id=>injured.has(id));
if(st.minute<90&&(st.minute===45||windows.includes(st.minute)||windows.length<3)&&used.length<5){
const candidates=ids.map(id=>ctx.db.players.find(p=>p.id===id)).filter(p=>p&&!sent.has(p.id)&&(injured.has(p.id)||p.positionGroup!=="GK")).sort((a,b)=>Number(injured.has(b.id))-Number(injured.has(a.id))||(st.conditions[a.id]??100)-(st.conditions[b.id]??100));
let changed=0;
for(const out of candidates){
if(used.length>=5||changed>=2)break;
const injuredOut=injured.has(out.id),fatigue=st.conditions[out.id]??100,threshold=st.minute>=80?91:st.minute>=65?88:84;
if(!injuredOut&&(urgent||st.minute<60||st.minute%5!==0||fatigue>threshold||used.length>=4||windows.length>=2&&st.minute<82))continue;
const incoming=available().filter(p=>p.positionGroup===out.positionGroup||(injuredOut&&out.positionGroup!=="GK"&&p.positionGroup!=="GK")).sort((a,b)=>3*(Number(b.positionGroup===out.positionGroup)-Number(a.positionGroup===out.positionGroup))+Number(b.position===out.position)-Number(a.position===out.position)+(b.currentAbility*(st.conditions[b.id]??100)-a.currentAbility*(st.conditions[a.id]??100))/10000)[0];
if(!incoming)continue;
st[side+"LineupIds"]=st[side+"LineupIds"].map(id=>id===out.id?incoming.id:id);used.push(out.id);changed++;
if(st.minute!==45&&!windows.includes(st.minute))windows.push(st.minute);
st.events.push({minute:st.minute,type:"substitution",clubId,playerId:incoming.id,outId:out.id,reason:injuredOut?"injury":"fatigue",text:incoming.name+" replaces "+out.name+(injuredOut?" after an injury.":".")});
}
}
const serious=st[side+"LineupIds"].filter(id=>st.injurySeverity?.[id]==="serious");for(const id of serious){st[side+"LineupIds"]=st[side+"LineupIds"].filter(x=>x!==id);st.events.push({minute:st.minute,type:"injury-withdrawal",clubId,playerId:id,text:(ctx.db.players.find(p=>p.id===id)?.name||"Player")+" cannot continue."})}if(st.minute<90)emergencyCover(m,side);
}
return st.minute>=90;
}
function finishSpectator(s,f,m){
if(f.played)return;
if(!m){const ctx=matchContext(s,f),ok=id=>ctx.lineups[id].length===11&&ctx.lineups[id].some(pid=>ctx.db.players.find(p=>p.id===pid)?.positionGroup==="GK");f.homeGoals=ok(f.homeClubId)&&!ok(f.awayClubId)?3:0;f.awayGoals=ok(f.awayClubId)&&!ok(f.homeClubId)?3:0;f.events=[];f.forfeit=true}
else{const st=m.state;f.homeGoals=st.homeGoals;f.awayGoals=st.awayGoals;f.events=st.events.filter(e=>["goal","red","yellow","injury","substitution"].includes(e.type)).map(e=>({minute:e.minute,type:e.type,text:e.text,playerId:e.playerId,clubId:e.clubId}));f.stats=st.stats;
for(const c of [m.ctx.home,m.ctx.away]){const real=s.world.clubs.find(x=>x.id===c.id);for(const p of [...real.players,...real.academyPlayers]){if(st.minutesPlayed[p.id]>0){p.appearances=(p.appearances||0)+1;p.goals=(p.goals||0)+st.events.filter(e=>e.type==="goal"&&e.playerId===p.id).length;p.fitness=Math.max(20,Math.round(st.conditions[p.id]||p.fitness));if((st.injuredIds||[]).includes(p.id))p.injuryDays=Math.max(p.injuryDays,st.injurySeverity?.[p.id]==="serious"?28:3)}}}}
f.played=true;const own=s.world.clubs.find(c=>c.name===s.club);if(own&&[f.homeClubId,f.awayClubId].includes(own.id)){const home=own.id===f.homeClubId,gf=home?f.homeGoals:f.awayGoals,ga=home?f.awayGoals:f.homeGoals,r=relationships(s,own);if(f.type!=="friendly")r.board=clampConfidence(r.board+(gf>ga?3:gf<ga?-3:0));calendarEvent(s,"result:"+f.id,"Full time",s.world.clubs.find(c=>c.id===f.homeClubId).name+" "+f.homeGoals+" – "+f.awayGoals+" "+s.world.clubs.find(c=>c.id===f.awayClubId).name,own.name)}
}
function pendingMatch(s){const c=s.world.clubs.find(c=>c.name===s.club);return c&&ensureLeague(s).fixtures.filter(f=>!f.played&&f.date<=s.calendar.date&&[f.homeClubId,f.awayClubId].includes(c.id)).sort((a,b)=>a.date.localeCompare(b.date))[0]}
function matchdayTick(s){
const l=ensureLeague(s),own=s.world.clubs.find(c=>c.name===s.club);
for(const f of l.fixtures.filter(f=>!f.played&&f.date<=s.calendar.date)){if(own&&[f.homeClubId,f.awayClubId].includes(own.id))continue;const m=startSpectator(s,f);if(m)while(!spectatorStep(m)){}finishSpectator(s,f,m)}
return !!pendingMatch(s);
}
function spectatorScreen(s,f){
let m=s.liveMatch?.fixtureId===f.id?s.liveMatch:startSpectator(s,f);
if(!m){finishSpectator(s,f,null);save(s);return career()}
s.liveMatch=m;if(!save(s))return career();let speed=1,timer=null,active=true;
const h=m.ctx.home,a=m.ctx.away,esc=escapeHtml;
function finish(){active=false;clearTimeout(timer);finishSpectator(s,f,m);delete s.liveMatch;if(save(s))render(true)}
function render(done=false){const st=m.state;show("Match Centre — Directors' Box",'<p>'+esc(h.name)+' · '+esc(h.manager.name)+' | '+esc(a.name)+' · '+esc(a.manager.name)+'</p><div class="match-score"><strong>'+esc(h.name)+'</strong><span>'+st.homeGoals+' – '+st.awayGoals+'</span><strong>'+esc(a.name)+'</strong></div><p class="match-clock">'+(done?"FULL TIME":st.minute+"′")+'</p><div class="office-metrics">'+[["Shots",st.stats.home.shots,st.stats.away.shots],["On target",st.stats.home.onTarget,st.stats.away.onTarget],["xG",Number(st.stats.home.xG||0).toFixed(2),Number(st.stats.away.xG||0).toFixed(2)],["Corners",st.stats.home.corners,st.stats.away.corners]].map(([k,x,y])=>'<div><small>'+k+'</small><strong>'+x+' – '+y+'</strong></div>').join("")+'</div><div class="office-card match-commentary"><h3>Live commentary</h3>'+st.events.slice(-15).reverse().map(e=>'<p><b>'+e.minute+'′</b> '+esc(e.text||(e.lines||[]).join(" "))+'</p>').join("")+'</div>'+(done?'<button class="action main" id="match-return">Return to office</button>':'<div class="world-tabs"><button class="action '+(speed===1?"main":"")+'" data-speed="1">Watch · 1×</button><button class="action '+(speed===4?"main":"")+'" data-speed="4">Speed up · 4×</button><button class="action '+(speed===12?"main":"")+'" data-speed="12">Speed up · 12×</button><button class="action" id="walkout">Walk out</button></div>'));
panel.classList.add("office-panel");panel.querySelector("#back").hidden=true;
if(done){panel.querySelector("#match-return").onclick=()=>career();return}
panel.querySelectorAll("[data-speed]").forEach(b=>b.onclick=()=>{speed=Number(b.dataset.speed);clearTimeout(timer);render();schedule()});
panel.querySelector("#walkout").onclick=()=>{if(!confirm("Leave the directors’ box? The match will continue and the media may report your departure."))return;active=false;clearTimeout(timer);const own=s.world.clubs.find(c=>c.name===s.club),home=own.id===f.homeClubId,gf=home?st.homeGoals:st.awayGoals,ga=home?st.awayGoals:st.homeGoals;
m.walkout={minute:st.minute,score:[gf,ga]};const headline=gf<ga?"Director walks out as "+own.name+" struggle under "+own.manager.name:gf===ga?"Questions raised as director leaves during tense match":"Director makes surprise early exit despite "+own.name+" leading";calendarEvent(s,"walkout:"+f.id,headline,"The director left in minute "+st.minute+" with the club "+gf+"–"+ga+". The reason has not been confirmed.","Football press");const r=relationships(s,own);r.manager=clampConfidence(r.manager-(gf<ga?6:3));r.board=clampConfidence(r.board-2);while(!spectatorStep(m)){}finishSpectator(s,f,m);delete s.liveMatch;if(save(s))career()};
}
function schedule(){if(!active)return;timer=setTimeout(()=>{if(spectatorStep(m)){finish();return}if(!save(s)){active=false;return}render();schedule()},Math.max(35,900/speed))}
render();schedule();
}
function leagueScreen(tier=1){const s=load();if(!s)return home();const l=ensureLeague(s),rows=leagueTable(s,tier);show("League & Fixtures",'<div class="world-tabs">'+DIVISIONS.map((d,i)=>'<button class="action '+(tier===i+1?"main":"")+'" data-league="'+(i+1)+'">'+d+'</button>').join("")+'</div><div class="world-table-wrap"><table class="world-table"><thead><tr><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>Pts</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+escapeHtml(r.name)+'</td><td>'+r.p+'</td><td>'+r.w+'</td><td>'+r.d+'</td><td>'+r.l+'</td><td>'+r.gf+'</td><td>'+r.ga+'</td><td>'+r.pts+'</td></tr>').join("")+'</tbody></table></div><h3>Fixtures & results</h3>'+l.fixtures.filter(f=>f.tier===tier).sort((a,b)=>a.date.localeCompare(b.date)).map(f=>'<div class="club"><div><strong>'+escapeHtml(s.world.clubs.find(c=>c.id===f.homeClubId).name)+' v '+escapeHtml(s.world.clubs.find(c=>c.id===f.awayClubId).name)+'</strong><small>'+f.date+'</small></div><span>'+(f.played?f.homeGoals+" – "+f.awayGoals:"Scheduled")+'</span></div>').join(""));panel.querySelector("#back").textContent="Back to office";panel.querySelector("#back").onclick=career;panel.querySelectorAll("[data-league]").forEach(b=>b.onclick=()=>leagueScreen(Number(b.dataset.league)))}
function advanceCalendar(s,days=7){
const k=syncCalendar(s);if(k.finished||pendingMatch(s))return false;employmentRecord(s);
days=Math.max(1,Math.min(7,Math.trunc(days)||7));const target=datePlus(k.date,days)>CAREER_END?CAREER_END:datePlus(k.date,days);
for(let i=0;i<days&&k.date<target;i++){
const oldSeason=s.season,oldWindow=windowStatus(k.date);
k.date=datePlus(k.date,1);syncCalendar(s);
if(s.season!==oldSeason){if(s.world.league)s.world.seasonHistory.push({...s.world.league,fixtures:s.world.league.fixtures.map(({events,stats,...f})=>f)});ensureLeague(s);calendarEvent(s,"season:"+s.season,"New season begins","Season "+s.season+" has begun. Career season "+k.number+" of 40.");for(const [name,status] of Object.entries(s.applications)){if(status==="Rejected"||status==="Declined"){delete s.applications[name];delete s.employment[name]}}}
const currentWindow=windowStatus(k.date);if(currentWindow!==oldWindow)calendarEvent(s,"window:"+k.date,"Transfer window update",currentWindow==="Closed"?"The transfer window has closed.":currentWindow+".","Football administration");
if(!k.finished){for(const c of s.world.clubs)for(const p of [...c.players,...c.academyPlayers])p.fitness=Math.min(100,p.fitness+2);staffTick(s);if(i===0||s.season!==oldSeason)aiRecruitment(s);playerTick(s,s.season!==oldSeason);if(s.season!==oldSeason)aiRecruitment(s)}
if(s.club&&!k.finished)relationshipReview(s);
if(s.club&&s.contract?.endDate&&k.date>=s.contract.endDate&&!k.finished){const name=s.club;endAppointment(s,"Contract expired");calendarEvent(s,"expiry:"+k.date,"Contract expired","Your contract with "+name+" has expired. You may apply for another position.",name)}
if(!k.finished&&matchdayTick(s))break;
if(k.finished){if(s.club)endAppointment(s,"Retired");calendarEvent(s,"retirement","Career complete","You have completed 40 seasons and retired aged 70. Your career history remains available.");break}
}
return true;
}
function prettyDate(date){return new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T00:00:00Z"))}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(!s||s.version!==1||typeof s.name!=="string"||!Number.isFinite(s.rep))return null;const career={...s,attributes:directorAttributes(s),world:careerWorld(s),applications:s.applications||{}};syncCalendar(career);ensureStaff(career.world);ensurePlayers(career.world,career.calendar.date);ensureTransfers(career.world);ensureLeague(career);if(career.club)relationships(career,activeClubs(career).find(c=>c.name===career.club));return career}catch{return null}}
function save(s){try{syncCalendar(s);ensureStaff(s.world);ensurePlayers(s.world,s.calendar.date);ensureTransfers(s.world);ensureLeague(s);localStorage.setItem(KEY,JSON.stringify(s));return true}catch{alert("Unable to save this career. Browser storage may be disabled.");return false}}
function home(){panel.classList.remove("office-panel","fd-office");panel.hidden=true;menu.hidden=false;const s=load();document.querySelector("#resume").disabled=!s;document.querySelector("#save-status").textContent=s?s.name+" · "+(s.club||"Unemployed"):"No saved career"}
function show(title,content){panel.classList.remove("office-panel","fd-office");menu.hidden=true;panel.hidden=false;panel.innerHTML="<h2>"+title+"</h2>"+content+'<button class="action" id="back">Back to menu</button>';panel.querySelector("#back").onclick=home;window.scrollTo(0,0)}
function options(values){return values.map(v=>"<option>"+v+"</option>").join("")}
function field(name,label,values){return "<label>"+label+'<select name="'+name+'">'+options(values)+"</select></label>"}
function create(){
const draft={firstName:"",lastName:"",nationality:"English",background:"Scout",style:"Possession football",recruitment:"Balanced",finance:"Financial sustainability",authority:"Collaborative",ambition:"Long-term development",personality:"Balanced",formation:"Flexible / manager decides",negotiation:"Measured",risk:"Balanced",managerRelationship:"Collaborative",academy:"Balanced pathway",scouting:"Domestic and international",managerAppointments:"Philosophy alignment",media:"Reserved",squadPlanning:"Balanced age profile"};
let step=0;
const stages=["Personal profile","Background","Football vision","Club strategy","Review"];
const backgrounds=["Scout","Recruitment analyst","Academy coordinator","Former player","No professional experience"];
const descriptions=["Experience assessing players and identifying recruitment targets.","Experience interpreting performance data and squad needs.","Experience supporting player development and academy pathways.","Experience of professional football from a player's perspective.","An entry-level director with no established professional network."];
const selectField=(name,label,values)=>'<label>'+label+'<select name="'+name+'">'+values.map(v=>'<option'+(draft[name]===v?' selected':'')+'>'+escapeHtml(v)+'</option>').join("")+'</select></label>';
const inputField=(name,label,max,auto)=>'<label>'+label+'<input name="'+name+'" required maxlength="'+max+'" autocomplete="'+auto+'" value="'+escapeHtml(draft[name])+'"></label>';
const facts='<div class="setup-facts"><div><small>STARTING AGE</small><strong>30</strong></div><div><small>EMPLOYMENT</small><strong>Unemployed</strong></div><div><small>REPUTATION</small><strong>10 / 100</strong></div></div>';
function render(){
let content="";
if(step===0)content='<h3>Personal profile</h3><p>Establish your identity before entering the football world.</p><div class="setup-fields">'+inputField("firstName","First name",29,"given-name")+inputField("lastName","Last name",30,"family-name")+inputField("nationality","Nationality",40,"country-name")+selectField("personality","Director personality",["Balanced","Ambitious","Analytical","Diplomatic","Assertive","Patient","Pragmatic","Demanding"])+'</div>'+facts;
if(step===1)content='<h3>Football background</h3><p>Choose your previous experience. All backgrounds begin with the same low reputation; your background determines your starting attributes.</p><div class="background-options">'+backgrounds.map((v,i)=>'<label class="background-option"><input type="radio" name="background" value="'+escapeHtml(v)+'" '+(draft.background===v?'checked':'')+'><span><strong>'+escapeHtml(v)+'</strong><small>'+descriptions[i]+'</small></span></label>').join("")+'</div><div id="attribute-preview"><h4>Starting attributes</h4>'+attributePanel(startingAttributes(draft.background))+'</div>';
if(step===2)content='<h3>Football philosophy</h3><p>Define your approach to running a club. Your manager remains responsible for matchday tactics and team selection.</p><div class="setup-fields">'+selectField("style","Preferred playing philosophy",["Possession football","High pressing","Counter-attacking","Direct football","Adaptable football"])+selectField("formation","Preferred formation",["Flexible / manager decides","4-3-3","4-2-3-1","4-4-2","4-1-4-1","4-3-1-2","3-4-3","3-5-2","5-3-2","4-2-2-2"])+selectField("recruitment","Recruitment strategy",["Balanced","Youth development","Data-driven","Established professionals","Academy first"])+selectField("squadPlanning","Squad composition",["Balanced age profile","Young and high-potential","Experienced core","Homegrown core"])+selectField("managerAppointments","Manager appointment priority",["Philosophy alignment","Proven results","Developing coaches","Adaptability"])+selectField("academy","Academy pathway",["Balanced pathway","Prioritise academy graduates","Merit-based only"])+'</div><p class="setup-note">Formation is a recruitment and manager-appointment preference, not an instruction to select matchday tactics.</p>';
if(step===3)content='<h3>Club strategy & leadership</h3><p>Define how you negotiate, manage resources and work with the manager and board.</p><div class="setup-fields">'+selectField("negotiation","Negotiation style",["Measured","Firm","Relationship-driven","Opportunistic"])+selectField("risk","Risk appetite",["Balanced","Conservative","Calculated risk","High risk"])+selectField("managerRelationship","Manager relationship",["Collaborative","Hands-off","Regular oversight","Demanding accountability"])+selectField("scouting","Scouting focus",["Domestic and international","Domestic first","International markets","Undervalued leagues"])+selectField("media","Media approach",["Reserved","Transparent","Protective of staff","Assertive"])+selectField("finance","Financial strategy",["Financial sustainability","Buy low, sell high","Controlled investment","Aggressive investment"])+selectField("authority","Recruitment authority",["Collaborative","Director-led","Manager-led"])+selectField("ambition","Time horizon",["Long-term development","Balanced progression","Immediate success"])+'</div>';
if(step===4)content='<h3>Review your director</h3><p>Confirm your identity and football philosophy before starting your career.</p><div class="setup-review">'+[["Director",draft.firstName+" "+draft.lastName],["Nationality",draft.nationality],["Background",draft.background],["Personality",draft.personality],["Preferred formation",draft.formation],["Squad composition",draft.squadPlanning],["Manager appointments",draft.managerAppointments],["Academy pathway",draft.academy],["Negotiation style",draft.negotiation],["Risk appetite",draft.risk],["Manager relationship",draft.managerRelationship],["Scouting focus",draft.scouting],["Media approach",draft.media],["Playing philosophy",draft.style],["Recruitment",draft.recruitment],["Financial strategy",draft.finance],["Recruitment authority",draft.authority],["Time horizon",draft.ambition]].map(([k,v])=>'<div><small>'+k+'</small><strong>'+escapeHtml(v)+'</strong></div>').join("")+'</div><h4>Starting attributes</h4>'+attributePanel(startingAttributes(draft.background))+facts+(load()?'<p class="setup-warning">Starting this career will replace your existing local save. Export a backup from Career Saves first if you want to keep it.</p>':'');
show("New Career",'<div class="setup-progress" aria-label="Career creation progress">'+stages.map((v,i)=>'<div class="'+(i===step?'current':i<step?'complete':'')+'" '+(i===step?'aria-current="step"':'')+'><span>0'+(i+1)+'</span><strong>'+v+'</strong></div>').join("")+'</div><form id="setup" class="career-setup">'+content+'<div class="setup-nav"><button type="button" class="action" id="setup-prev">'+(step?"Previous":"Cancel")+'</button><button type="submit" class="action main">'+(step===4?"Start career":"Continue")+'</button></div></form>');
const form=panel.querySelector("#setup");
panel.querySelector("#back").hidden=true;
if(step===1)form.querySelectorAll('input[name="background"]').forEach(r=>r.onchange=()=>{draft.background=r.value;panel.querySelector("#attribute-preview").innerHTML="<h4>Starting attributes</h4>"+attributePanel(startingAttributes(r.value))});
function collect(){for(const [k,v] of new FormData(form))draft[k]=String(v).trim()}
panel.querySelector("#setup-prev").onclick=()=>{collect();if(step===0)home();else{step--;render()}};
form.onsubmit=e=>{e.preventDefault();collect();if(step===0&&(!draft.firstName||!draft.lastName||!draft.nationality)){alert("Please complete all personal profile fields.");return}if(step<4){step++;render();return}if(load()&&!confirm("Replace your existing local career?"))return;const careerData={...draft,attributes:startingAttributes(draft.background),name:draft.firstName+" "+draft.lastName,version:1,age:30,rep:10,club:null,season:"2026/27",applications:{},world:newWorld()};if(save(careerData))career()};
}
render();
}
function world(initialTier=1,fromOffice=false){
const s=load(),w=careerWorld(s);let tier=initialTier;
function render(){
const rows=w.clubs.filter(c=>c.tier===tier);
show("Football World",'<p>'+w.season+' · Fictional English pyramid · '+w.clubs.length+' clubs · Database prototype</p><div class="world-tabs">'+DIVISIONS.map((d,i)=>'<button class="action '+(tier===i+1?'main':'')+'" data-tier="'+(i+1)+'" aria-pressed="'+(tier===i+1)+'">'+d+'</button>').join("")+'</div><div class="world-table-wrap"><table class="world-table"><thead><tr><th>Club</th><th>Reputation</th><th>Transfer budget</th><th>Manager</th><th>Director role</th></tr></thead><tbody>'+rows.map(c=>'<tr><td><button class="world-link" data-club="'+c.id+'">'+escapeHtml(c.name)+'</button></td><td>'+c.rep+'/100</td><td>'+money(c.budget)+'</td><td>'+escapeHtml(c.manager.name)+'</td><td>'+escapeHtml(c.director||(c.vacant?"Vacant":"Occupied"))+'</td></tr>').join("")+'</tbody></table></div><p class="setup-note">Club profiles are persistent within a career. Matches, squads, league standings and changing finances are not simulated yet.</p>');
panel.querySelectorAll("[data-tier]").forEach(b=>b.onclick=()=>{tier=+b.dataset.tier;render()});panel.querySelectorAll("[data-club]").forEach(b=>b.onclick=()=>clubProfile(w.clubs.find(c=>c.id===b.dataset.club),render));if(fromOffice){panel.querySelector("#back").textContent="Back to office";panel.querySelector("#back").onclick=career}
}render()}
function clubProfile(c,back){if(!c)return back();const fields=[["Division",DIVISIONS[c.tier-1]],["Reputation",c.rep+"/100"],["Stadium",c.stadium],["Capacity",c.capacity.toLocaleString("en-GB")],["Club cash",money(c.cash)],["Transfer budget",money(c.budget)],["Weekly wage budget",money(c.wageBudget)],["Training facilities",c.training+"/20"],["Academy facilities",c.academy+"/20"],["Manager",c.manager.name],["Manager formation",c.manager.formation],["Football philosophy",c.style],["Board objective",c.boardObjective],["Director role",c.director||(c.vacant?"Vacant":"Occupied")]];
show(escapeHtml(c.name),'<div class="setup-review">'+fields.map(([k,v])=>'<div><small>'+k+'</small><strong>'+escapeHtml(v)+'</strong></div>').join("")+'</div><p class="setup-note">Indicative fictional starting data; not a live financial simulation.</p>');panel.querySelector("#back").textContent="Back to division";panel.querySelector("#back").onclick=back}
function officeState(s){
if(!s.office||typeof s.office!=="object")s.office={read:[]};
if(!Array.isArray(s.office.read))s.office.read=[];
return s.office;
}
function officeMessages(s){
const c=activeClubs(s).find(c=>c.name===s.club);
const msgs=[{id:"welcome",from:"Career services",subject:"Welcome to Football Director",body:"Your career is underway. Review your profile and explore the football world. Your role is to shape recruitment, finances and club strategy, while the manager controls team selection."}];
for(const [name,status] of Object.entries(s.applications||{})){
if(status==="Offer"||status==="Rejected"||status==="Declined"||status==="Accepted")msgs.push({id:"application:"+name+":"+status,from:name,subject:({Offer:"Employment offer received",Rejected:"Application unsuccessful",Declined:"Offer declined",Accepted:"Appointment confirmed"})[status],body:status==="Accepted"?"Your appointment is recorded. Review your contract and club objectives in the office.":status==="Offer"?"The board has offered you the director position. Review the terms in the Job Centre.":status==="Rejected"?"The board has preferred another candidate. Consider other suitable vacancies.":"You have declined the proposed contract."});
}
if(c){msgs.push({id:"board:"+c.id,from:"Club board",subject:"Board objectives",body:"Your initial objective: "+c.boardObjective+". The current transfer budget is "+money(c.budget)+". Strategic reviews assess your decisions; match performance will be added with the match engine."});msgs.push({id:"manager:"+c.id,from:c.manager.name,subject:"Introduction from the manager",body:"My preferred formation is "+c.manager.formation+" and my philosophy is "+c.manager.style+". We will coordinate squad planning while I remain responsible for matchday decisions."})}
return [...msgs.reverse(),...(s.calendar?.events||[]).slice().reverse()].sort((a,b)=>(b.date||CAREER_START).localeCompare(a.date||CAREER_START));
}
function officeMetrics(s,c){
return c?[["Transfer budget",money(c.budget)],["Weekly wage budget",money(c.wageBudget)],["Club cash",money(c.cash)],["Annual salary",money(s.contract?.salary||0)]]:[["Reputation",s.rep+"/100"],["Eligible vacancies",String(activeClubs(s).filter(x=>x.vacant&&s.rep>=x.rep&&!s.applications?.[x.name]).length)],["Open offers",String(activeClubs(s).filter(x=>x.vacant&&s.applications?.[x.name]==="Offer").length)],["Employment",s.calendar?.finished?"Retired":"Unemployed"]];
}
function officeNavigate(key,s){switch(key){case "league":return leagueScreen(s.world.clubs.find(c=>c.name===s.club)?.tier||1);case "transfers":return transferScreen();case "squad":return squadScreen();case "staff":return staffScreen();case "jobs":return jobs();case "world":return world(1,true);case "history":return careerHistory();case "saves":return saves();case "recruitment":return recruitmentScreen();default:return career(key)}}
function advanceOffice(s,days){const status=panel.querySelector("#fd-progress");try{const f=pendingMatch(s);if(f)return spectatorScreen(s,f);if(typeof NGMatchEngine==="undefined")throw Error("Match engine unavailable. Refresh the game.");const before=s.calendar.date;if(!advanceCalendar(s,days))throw Error("Calendar did not advance.");if(!save(s))throw Error("Career could not be saved.");const next=pendingMatch(s);if(next)return spectatorScreen(s,next);career("overview");const msg=panel.querySelector("#fd-progress");if(msg){msg.hidden=false;msg.textContent="Advanced from "+prettyDate(before)+" to "+prettyDate(s.calendar.date)+"."}}catch(err){console.error(err);if(status){status.hidden=false;status.textContent="Unable to advance: "+err.message}else alert(err.message)}}
function officeIcon(k){const paths={overview:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',inbox:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',profile:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',club:'<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>',staff:'<circle cx="9" cy="7" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v2"/>',squad:'<path d="m8 4-5 3 3 5 3-2v10h10V10l2 2 2-5-5-3c-2 4-6 4-8 0z"/>',recruitment:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',transfers:'<path d="M3 7h17l-4-4M21 17H4l4 4M20 7l-4 4M4 17l4-4"/>',league:'<path d="M7 3h10v7a5 5 0 0 1-10 0zM7 6H3v3a4 4 0 0 0 4 4M17 6h4v3a4 4 0 0 1-4 4M12 15v5M7 21h10"/>',finance:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M15 15h3"/>',jobs:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 13h18"/>',world:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18"/>',history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',saves:'<path d="M4 3h13l3 3v15H4zM8 3v6h8V3M8 21v-7h8v7"/>'};return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[k]||paths.overview)+'</svg>'}
function officeShell(s,tab,title,content){const c=s.world.clubs.find(c=>c.name===s.club),unread=officeMessages(s).filter(m=>!officeState(s).read.includes(m.id)).length;
const groups=[["OFFICE",[["overview","Dashboard","▦"],["inbox","Inbox","✉"],["calendar","Calendar","▣"],["profile","Director profile","◉"]]],["FOOTBALL OPERATIONS",c?[["club","Club operations","▤"],["staff","Manager & staff","♙"],["squad","Squad","♟"],["recruitment","Recruitment","⌕"],["transfers","Transfer centre","⇄"],["league","Fixtures & tables","▥"],["finance","Finances","£"]]:[["league","Fixtures & tables","▥"]]],["CAREER",[...(!c?[["jobs","Job centre","▣"]]:[]),["world","Football world","◎"],["history","Career history","◷"],["saves","Career saves","▣"]]]];
return '<div class="fd-shell"><aside class="fd-sidebar"><div class="fd-brand"><strong>FOOTBALL <em>DIRECTOR</em></strong><small>BY NEXTGEN SESSIONS</small></div><div class="fd-club"><strong>'+escapeHtml(c?.name||"Unemployed")+'</strong><small>'+escapeHtml(c?DIVISIONS[c.tier-1]:"Director career")+'</small></div>'+groups.map(([g,items])=>'<div class="fd-nav-group"><small>'+g+'</small>'+items.map(([k,l,i])=>'<button type="button" class="fd-nav '+(k===tab?"selected":"")+'" data-fd-nav="'+k+'" '+(k===tab?'aria-current="page"':"")+'><span class="fd-nav-icon">'+officeIcon(k)+'</span><span>'+l+'</span>'+(k==="inbox"&&unread?'<b>'+unread+'</b>':'')+'</button>').join("")+'</div>').join("")+'<div class="fd-sidebar-footer"><button type="button" class="fd-nav" id="fd-save">Save career</button><button type="button" class="fd-nav fd-exit" id="fd-menu">← Main menu</button></div></aside><section class="fd-workspace"><header class="fd-top"><div><small>SEASON '+escapeHtml(s.season)+' · '+escapeHtml(windowStatus(s.calendar.date))+'</small><h2>'+escapeHtml(title)+'</h2></div><div class="fd-clock"><strong>'+escapeHtml(prettyDate(s.calendar.date))+'</strong><small>'+escapeHtml(s.name)+'</small></div><div class="fd-time"><button type="button" class="action" id="fd-day" '+(s.calendar.finished?"disabled":"")+'>1 day</button><button type="button" class="action main" id="fd-continue" '+(s.calendar.finished?"disabled":"")+'>'+(pendingMatch(s)?"Watch match":"Continue · 7 days")+'</button></div></header><p id="fd-progress" role="status" hidden></p><div class="fd-content">'+content+'</div></section></div>'}
function wireOfficeShell(s){panel.classList.add("office-panel","fd-office");panel.querySelector("#back").hidden=true;panel.querySelector("#fd-menu").onclick=home;panel.querySelector("#fd-save").onclick=()=>{if(save(s)){const b=panel.querySelector("#fd-save");b.textContent="Career saved ✓"}};panel.querySelectorAll("[data-fd-nav]").forEach(b=>b.onclick=()=>officeNavigate(b.dataset.fdNav,s));panel.querySelector("#fd-day").onclick=()=>advanceOffice(s,1);panel.querySelector("#fd-continue").onclick=()=>advanceOffice(s,7)}
function clubTargets(s,c){const needs=squadDepth(c).sort((a,b)=>a.count-b.count||a.best-b.best).slice(0,3);const candidates=marketPlayers(s.world).filter(e=>e.club!==c&&(!e.club||e.club.tier>=c.tier-1)&&e.p.age<=30&&e.p.value<=c.budget*.8&&e.p.wage<=Math.max(0,c.wageBudget-squadPayroll(c)));return needs.map(n=>({need:n,targets:candidates.filter(e=>e.p.position===n.position).sort((a,b)=>b.p.ability-a.p.ability||b.p.potential-a.p.potential).slice(0,3)}))}
function recruitmentScreen(){const s=load();if(!s||!s.club)return career();const c=s.world.clubs.find(c=>c.name===s.club),esc=escapeHtml;const content='<p>Head scout recommendations · '+money(c.budget)+' available</p>'+clubTargets(s,c).map(({need,targets})=>'<section class="office-card"><h3>'+need.position+' · '+need.count+' senior players</h3><p>Best current ability '+need.best+'/100. Indicative budget and wage filters applied.</p>'+targets.map(({p,club})=>'<div class="fd-task"><div><strong>'+esc(p.name)+'</strong><small>'+esc(club?.name||"Free agent")+' · Age '+p.age+' · '+p.ability+' CA / '+p.potential+' PA · '+money(p.value)+'</small></div><button class="action" data-scout-target="'+p.id+'">View target</button><button class="action" data-scout-short="'+p.id+'">'+(c.shortlist.includes(p.id)?"Remove":"Shortlist")+'</button></div>').join("")+(targets.length?"":"<p>No affordable targets. Review wages or sales.</p>")+'</section>').join("")+'<button class="action" id="fd-all-targets">Open player search</button>';show("Recruitment",officeShell(s,"recruitment","Recruitment",content));wireOfficeShell(s);panel.querySelector("#fd-all-targets").onclick=()=>transferScreen();panel.querySelectorAll("[data-scout-target]").forEach(b=>b.onclick=()=>transferTarget(b.dataset.scoutTarget));panel.querySelectorAll("[data-scout-short]").forEach(b=>b.onclick=()=>{const id=b.dataset.scoutShort;c.shortlist=c.shortlist.includes(id)?c.shortlist.filter(x=>x!==id):[...c.shortlist,id];if(save(s))recruitmentScreen()})}
function officeAgenda(s,c){if(!c)return [["Find a club","Review open vacancies and apply for suitable roles.","jobs","Open job centre"]];const items=[],r=relationships(s,c),f=ensureLeague(s).fixtures.filter(f=>!f.played&&[f.homeClubId,f.awayClubId].includes(c.id)).sort((a,b)=>a.date.localeCompare(b.date))[0];if(f){const opp=s.world.clubs.find(x=>x.id===(f.homeClubId===c.id?f.awayClubId:f.homeClubId));items.push([f.type==="friendly"?"Preseason fixture":"Next league fixture",prettyDate(f.date)+" · "+opp.name+" · "+(f.homeClubId===c.id?"Home":"Away"),"league","Fixtures"])}if(r.pending)items.push(["Board decision required","Respond to the outstanding strategic review.","club","Review"]);const pending=c.recruitmentRequests.filter(r=>r.status==="Pending");if(pending.length)items.push(["Manager recruitment requests",pending.map(r=>r.position).join(", ")+" · awaiting response","squad","Review squad"]);if(windowStatus(s.calendar.date)!=="Closed")items.push(["Transfer window open","Review scout recommendations and build your shortlist.","recruitment","View targets"]);const exp=c.players.filter(p=>p.contractEnd<=datePlus(s.calendar.date,365));if(exp.length)items.push(["Contract planning",exp.length+" first-team contracts expire within 12 months.","squad","Review squad"]);return items}
function dashboardContent(s,c,messages,state){
const esc=escapeHtml,button=(label,key)=>'<button type="button" class="fd-link" data-office="'+key+'">'+label+' <span>›</span></button>',card=(title,body,action="")=>'<section class="fd-card"><header><h3>'+title+'</h3>'+action+'</header>'+body+'</section>';
const metrics=officeMetrics(s,c).map(([k,v],i)=>{const keys=c?["transfers","finance","finance","club"]:["profile","jobs","jobs","profile"];const hints=c?["Available to recruit","Weekly spending limit","Current cash balance","Director contract"]:["Director standing","Unsubmitted roles","Awaiting a decision","Current career status"];return '<button type="button" class="fd-kpi '+(i===0?"fd-kpi-feature":"")+'" data-office="'+keys[i]+'"><span class="fd-kpi-head"><small>'+esc(k)+'</small><span class="fd-kpi-icon">'+officeIcon(keys[i])+'</span></span><strong>'+esc(v)+'</strong><small class="fd-kpi-hint">'+hints[i]+'</small></button>'}).join("");
const agenda=officeAgenda(s,c);const tasks=agenda.length?agenda.map(([t,d,k,l],i)=>'<div class="fd-agenda-row"><span class="fd-task-index">'+String(i+1).padStart(2,"0")+'</span><div><strong>'+esc(t)+'</strong><small>'+esc(d)+'</small></div>'+button(l,k)+'</div>').join(""):'<p class="fd-empty">No outstanding priorities.</p>';
const inbox=messages.slice(0,4).map((m,i)=>'<button type="button" class="fd-mail '+(state.read.includes(m.id)?"":"unread")+'" data-message="'+i+'"><span class="fd-mail-dot"></span><span><strong>'+esc(m.subject)+'</strong><small>'+esc(m.from)+'</small></span><span>›</span></button>').join("");
const upcoming=c?ensureLeague(s).fixtures.filter(f=>!f.played&&[f.homeClubId,f.awayClubId].includes(c.id)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3):[];
const fixtures=upcoming.map(f=>{const home=f.homeClubId===c.id,opp=s.world.clubs.find(x=>x.id===(home?f.awayClubId:f.homeClubId));return '<div class="fd-fixture"><div class="fd-date"><strong>'+f.date.slice(8,10)+'</strong><small>'+new Date(f.date+"T00:00:00Z").toLocaleDateString("en-GB",{month:"short",timeZone:"UTC"}).toUpperCase()+'</small></div><div><strong>'+esc(opp.name)+'</strong><small>'+esc(f.type==="friendly"?"Friendly":"League")+' · '+(home?"Home":"Away")+'</small></div><span class="fd-fixture-type">'+(home?"H":"A")+'</span></div>'}).join("");
const bar=(label,value)=>'<div class="fd-confidence"><div><span>'+label+'</span><strong>'+value+'%</strong></div><div class="fd-track"><i style="width:'+value+'%"></i></div></div>';
let side;if(c){const r=relationships(s,c);side=card("Club status",'<div class="fd-manager"><span class="fd-monogram">'+esc(c.manager.name.split(" ").map(x=>x[0]).slice(0,2).join(""))+'</span><div><strong>'+esc(c.manager.name)+'</strong><small>Manager · '+esc(c.manager.formation)+'</small></div></div>'+bar("Board confidence",r.board)+bar("Manager relationship",r.manager)+'<div class="fd-security"><span>Job security</span><strong>'+esc(security(r))+'</strong></div>',button("Club operations","club"))+card("Upcoming fixtures",fixtures||'<p class="fd-empty">No upcoming fixtures this season.</p>',button("All fixtures","league"))}else{const vacancies=s.world.clubs.filter(x=>x.vacant&&s.rep>=x.rep&&!s.applications[x.name]);side=card("Eligible vacancies",vacancies.slice(0,4).map(x=>'<button type="button" class="fd-vacancy" data-office="jobs"><span class="fd-club-icon">'+officeIcon("club")+'</span><span><strong>'+esc(x.name)+'</strong><small>'+esc(DIVISIONS[x.tier-1])+'</small></span><span class="fd-vacancy-pay"><strong>'+money(x.salary)+'</strong><small>per year</small></span><span aria-hidden="true">›</span></button>').join("")||'<p class="fd-empty">No eligible unsubmitted vacancies.</p>',button("Job centre","jobs"))+card("Career profile",'<div class="fd-security"><span>Reputation</span><strong>'+s.rep+'/100</strong></div><div class="fd-security"><span>Experience</span><strong>'+esc(s.background||"Unknown")+'</strong></div>',button("Profile","profile"))}
return '<div class="fd-dashboard"><section class="fd-dashboard-intro"><div><small>'+esc(c?DIVISIONS[c.tier-1]:"CAREER MODE")+'</small><h3>'+esc(c?.name||"Your next appointment")+'</h3><p>'+esc(c?c.boardObjective:"Find a club and establish your reputation.")+'</p></div><div class="fd-hero-end"><span class="fd-season-tag">SEASON '+s.calendar.number+' / 40</span>'+(!c&&!s.calendar.finished?'<button type="button" class="fd-hero-cta" data-office="jobs">Explore vacancies <span>›</span></button>':"")+'</div></section><div class="fd-kpis">'+metrics+'</div><div class="fd-dashboard-grid"><div>'+card("Action centre",tasks)+' '+card("Latest messages",inbox,button("Inbox","inbox"))+'</div><div>'+side+'</div></div></div>';
}
function career(tab="overview",messageId=null){
const s=load();if(!s)return home();employmentRecord(s);
const clock=syncCalendar(s),state=officeState(s),c=activeClubs(s).find(c=>c.name===s.club),messages=officeMessages(s),unread=messages.filter(m=>!state.read.includes(m.id)).length;
const esc=escapeHtml;
const card=(title,body)=>'<section class="office-card"><h3>'+title+'</h3>'+body+'</section>';
const line=(label,value)=>'<div class="office-line"><span>'+label+'</span><strong>'+esc(value)+'</strong></div>';
const btn=(label,key)=>'<button class="action office-action" data-office="'+key+'">'+label+'</button>';
const pending=(label)=>'<div class="office-pending">'+label+'<small>Awaiting simulation development</small></div>';
const nav=[["overview","Overview"],["inbox","Inbox"+(unread?" ("+unread+")":"")],["profile","Director profile"],...(clock.finished?[]:[[c?"club":"jobs",c?"Club operations":"Job Centre"]]),["world","Football World"],["history","Career History"],["calendar","Calendar"],["league","League & fixtures"],...(c?[["staff","Manager & staff"],["squad","Squad"],["transfers","Transfers"]]:[])];
let content="";
if(tab==="inbox"){
const selected=messages.find(m=>m.id===messageId);
content='<div class="office-inbox">'+card("Messages",messages.map((m,i)=>'<button class="office-message '+(state.read.includes(m.id)?"":"unread")+'" data-message="'+i+'"><strong>'+esc(m.subject)+'</strong><small>'+esc(m.from)+(state.read.includes(m.id)?"":" · Unread")+'</small></button>').join(""))+card("Message",selected?'<h4>'+esc(selected.subject)+'</h4><small>'+esc(selected.from)+'</small><p>'+esc(selected.body)+'</p>':"<p>Select a message to read it.</p>")+'</div>';
}else if(tab==="profile"){
const fields=[["Background",s.background||"Unknown"],["Nationality",s.nationality||"Unknown"],["Personality",s.personality||"Balanced"],["Formation",s.formation||"Flexible / manager decides"],["Football philosophy",s.style||"Adaptable football"],["Recruitment",s.recruitment||"Balanced"],["Negotiation",s.negotiation||"Measured"],["Manager relationship",s.managerRelationship||"Collaborative"],["Financial strategy",s.finance||"Financial sustainability"],["Risk appetite",s.risk||"Balanced"]];
content=card("Director profile",'<div class="setup-review">'+fields.map(([k,v])=>'<div><small>'+k+'</small><strong>'+esc(v)+'</strong></div>').join("")+'</div>')+card("Director attributes",attributePanel(directorAttributes(s)));
}else if(tab==="calendar"){content=card("Career calendar",line("Current date",prettyDate(clock.date))+line("Season",s.season)+line("Career season",clock.number+" / 40")+line("Director age",s.age)+line("Transfer window",windowStatus(clock.date))+line("Contract expiry",s.contract?.endDate?prettyDate(s.contract.endDate):"Not employed")+line("Career end",prettyDate(CAREER_END))+(clock.finished?"<p>Career completed. Records remain available.</p>":"<p>Continue advances up to seven days. Transfer windows use simplified July–August and January dates.</p>"));}else if(tab==="club"&&c){
content='<div class="office-grid">'+card("Board & contract",line("Objective",c.boardObjective)+line("Annual salary",money(s.contract?.salary||0))+line("Contract length",(s.contract?.years||2)+" years")+line("Board confidence",relationships(s,c).board+"/100")+line("Job security",security(relationships(s,c))))+card("Manager",line("Manager",c.manager.name)+line("Formation",c.manager.formation)+line("Philosophy",c.manager.style)+line("Manager relationship",relationships(s,c).manager+"/100")+btn("Manage staff","staff"))+card("Facilities",line("Stadium",c.stadium)+line("Capacity",c.capacity.toLocaleString("en-GB"))+line("Training",c.training+"/20")+line("Academy",c.academy+"/20")+btn("Full club profile","club-profile"))+card("Strategic decisions",relationshipControls(s,c))+card("Football operations",line("First-team players",c.players.length)+line("Academy prospects",c.academyPlayers.length)+btn("Squad management","squad")+btn("Transfers & recruitment","transfers")+btn("League & fixtures","league"))+'</div>';
}else{
content='<div class="office-metrics">'+officeMetrics(s,c).map(([k,v])=>'<div><small>'+k+'</small><strong>'+esc(v)+'</strong></div>').join("")+'</div><div class="office-grid">'+card("Inbox",messages.slice(0,3).map((m,i)=>'<button class="office-message '+(state.read.includes(m.id)?"":"unread")+'" data-message="'+i+'"><strong>'+esc(m.subject)+'</strong><small>'+esc(m.from)+'</small></button>').join("")+btn("Open inbox","inbox"))+(c?card("Board & manager",line("Board objective",c.boardObjective)+line("Manager",c.manager.name)+line("Formation",c.manager.formation)+line("Club philosophy",c.style)+line("Board confidence",relationships(s,c).board+"/100")+line("Manager relationship",relationships(s,c).manager+"/100")+line("Job security",security(relationships(s,c)))+btn(relationships(s,c).pending?"Review required":"Club operations","club")):card(clock.finished?"Career complete":"Career opportunities",clock.finished?'<p>40 seasons completed. Review your career records.</p>'+btn("Career history","history"):'<p>Find your first appointment. Review vacancies, attend interviews and negotiate your contract.</p>'+btn("Open Job Centre","jobs")+btn("Career history","history")))+(c?card("Squad & recruitment",line("First-team players",c.players.length)+line("Pending recruitment requests",c.recruitmentRequests.filter(r=>r.status==="Pending").length)+btn("Squad management","squad")+btn("Transfers & recruitment","transfers")):card("Your football vision",line("Personality",s.personality||"Balanced")+line("Preferred formation",s.formation||"Flexible / manager decides")+line("Recruitment",s.recruitment||"Balanced")+btn("View director profile","profile")))+card("Calendar & football world",line("Date",prettyDate(clock.date))+line("Career season",clock.number+" / 40")+line("Transfer window",windowStatus(clock.date))+btn("League & fixtures","league")+btn("View calendar","calendar")+btn("Explore Football World","world"))+'</div>';
}
if(tab==="overview")content=dashboardContent(s,c,messages,state);
if(tab==="finance"&&c)content=card("Financial position",line("Club cash",money(c.cash))+line("Transfer budget",money(c.budget))+line("Player wages per week",money(squadPayroll(c)))+line("Player wage budget",money(c.wageBudget))+line("Annual staff payroll",money(staffPayroll(c)))+line("Annual staff budget",money(c.staffBudget)))+'<p>Full operating income and recurring payroll accounting are not implemented yet.</p>';
show("Director's Office",officeShell(s,tab,({overview:"Dashboard",inbox:"Inbox",profile:"Director profile",club:"Club operations",calendar:"Calendar",finance:"Finances"})[tab]||"Director's Office",content));wireOfficeShell(s);
panel.querySelectorAll("[data-office]").forEach(b=>b.onclick=()=>{const key=b.dataset.office;if(key==="club-profile"&&c)return clubProfile(c,()=>career("club"));officeNavigate(key,s)});
panel.querySelectorAll("[data-message]").forEach(b=>b.onclick=()=>{const m=messages[Number(b.dataset.message)];if(!m)return;if(!state.read.includes(m.id)){state.read.push(m.id);if(!save(s))return}career("inbox",m.id)});
panel.querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>{if(resolveReview(s,Number(b.dataset.review))&&save(s))career(s.club?"club":"overview")});
const renew=panel.querySelector("#renew-contract");if(renew)renew.onclick=()=>{if(renewAppointment(s)&&save(s))career("club")};
const resign=panel.querySelector("#resign-role");if(resign)resign.onclick=()=>{if(confirm("Resign from your current club? Your contract will end immediately.")){const name=s.club;endAppointment(s,"Resigned");calendarEvent(s,"resignation:"+s.calendar.date,"Resignation confirmed","You have resigned from "+name+".",name);if(save(s))career()}};
}
function employmentFit(s,c){
const a=directorAttributes(s),skills=(a.negotiation+a.finance+a.leadership+a.decisionMaking+a.footballKnowledge+a.networking)/6;
const style=s.style===c.style?12:s.style==="Adaptable football"?8:3;
const formation=s.formation===c.manager.formation?6:!s.formation||s.formation==="Flexible / manager decides"?4:0;
const finance=c.tier>=4?(s.finance==="Financial sustainability"?8:s.finance==="Aggressive investment"?0:5):5;
return Math.round(Math.min(100,skills*4+style+formation+finance+Math.min(15,Math.max(0,s.rep-c.rep+8))));
}
function interviewQuestions(c){return [
["The manager requests a signing outside the agreed budget. How do you respond?",[["Negotiate a lower fee and assess alternatives with the manager.",10],["Ask the board to consider a documented exceptional investment.",c.tier<=2?9:6],["Approve the deal immediately.",0]]],
["The board objective is: "+c.boardObjective+". What is your recruitment priority?",[["Recruit proven players for immediate impact.",c.tier<=2?10:5],["Build an affordable squad with development and resale potential.",c.tier>=3?10:7],["Balance experienced leaders with targeted young talent.",9]]],
["The manager favours "+c.manager.formation+" and "+c.style.toLowerCase()+". How will you work together?",[["Agree a shared squad plan while respecting matchday autonomy.",10],["Set recruitment targets independently and review monthly.",6],["Insist on selecting the starting eleven.",0]]],
["A rival club approaches one of your leading players. What is your policy?",[["Assess contract length, valuation and replacement options.",10],["Reject all approaches regardless of the fee.",4],["Sell if the offer exceeds our valuation and the squad can absorb the loss.",9]]]
]}
function interviewResult(s,c,points){
const fit=employmentFit(s,c),score=Math.round(fit*.45+points/40*100*.55);
const rival=Math.min(84,52+(5-c.tier)*5+((c.rep*7)%9));
return {fit,score,rival,passed:score>=rival};
}
function employmentRecord(s){if(!s.employment||typeof s.employment!=="object")s.employment={};if(!Array.isArray(s.history))s.history=s.club?[{club:s.club,season:s.season,salary:s.contract?.salary||0,years:s.contract?.years||2,status:"Current appointment"}]:[];if(!s.applications)s.applications={};return s}
function jobs(){
const s=load();if(!s||s.club||s.calendar.finished)return career();employmentRecord(s);
const vacancies=activeClubs(s).filter(c=>c.vacant).sort((a,b)=>a.rep-b.rep);
show("Job Centre",'<p>Apply for open sporting director positions. The board compares your experience, philosophy and interview performance against other candidates.</p><div class="setup-facts"><div><small>OPEN VACANCIES</small><strong>'+vacancies.length+'</strong></div><div><small>ELIGIBLE ROLES</small><strong>'+vacancies.filter(c=>s.rep>=c.rep).length+'</strong></div><div><small>YOUR REPUTATION</small><strong>'+s.rep+'/100</strong></div></div><div class="employment-list">'+vacancies.map(c=>{const status=s.applications[c.name],eligible=s.rep>=c.rep;return '<article class="employment-card"><div><strong>'+escapeHtml(c.name)+'</strong><small>'+DIVISIONS[c.tier-1]+' · '+money(c.salary)+'/year</small><small>'+escapeHtml(c.boardObjective)+'</small></div><div class="employment-fit"><small>PROFILE FIT</small><strong>'+employmentFit(s,c)+'%</strong><small>Required rep: '+c.rep+'</small></div><button class="action '+(status==="Offer"?"main":"")+'" data-job="'+activeClubs(s).indexOf(c)+'" '+(!eligible||status&&status!=="Offer"?"disabled":"")+'>'+escapeHtml(status==="Offer"?"View offer":status||(!eligible?"Reputation too low":"Apply"))+'</button></article>'}).join("")+'</div><p class="setup-note">Vacancies and competition thresholds are fixed in this prototype until the calendar and AI hiring systems are added.</p>');panel.querySelector("#back").textContent="Back to office";panel.querySelector("#back").onclick=career;
panel.querySelectorAll("[data-job]").forEach(b=>b.onclick=()=>{const i=+b.dataset.job;return s.applications[activeClubs(s)[i].name]==="Offer"?offer(i):interview(i)});
}
function interview(i){
const s=load(),c=activeClubs(s)[i];if(!s||s.club||s.calendar.finished||!c||!c.vacant||s.rep<c.rep||s.applications[c.name])return jobs();employmentRecord(s);
const qs=interviewQuestions(c);
show("Interview — "+escapeHtml(c.name),'<p>'+DIVISIONS[c.tier-1]+' · Board objective: '+escapeHtml(c.boardObjective)+'</p><form id="interview" class="employment-interview">'+qs.map(([q,answers],j)=>'<fieldset><legend>'+(j+1)+'. '+escapeHtml(q)+'</legend>'+answers.map(([answer],k)=>'<label><input type="radio" name="q'+j+'" value="'+k+'" required><span>'+escapeHtml(answer)+'</span></label>').join("")+'</fieldset>').join("")+'<button class="action main" type="submit">Submit interview</button></form>');panel.querySelector("#back").textContent="Back to vacancies";panel.querySelector("#back").onclick=jobs;
panel.querySelector("#interview").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);let points=0;for(let j=0;j<qs.length;j++){const raw=f.get("q"+j);if(raw===null||!qs[j][1][Number(raw)])return;points+=qs[j][1][Number(raw)][1]}const result=interviewResult(s,c,points);s.employment[c.name]={...result,salary:c.salary,years:2,counters:0};s.applications[c.name]=result.passed?"Offer":"Rejected";if(!save(s))return;if(result.passed)return offer(i);show("Application unsuccessful",'<p>'+escapeHtml(c.name)+' has preferred another candidate.</p><div class="setup-facts"><div><small>PROFILE FIT</small><strong>'+result.fit+'%</strong></div><div><small>ASSESSMENT</small><strong>'+result.score+'/100</strong></div><div><small>COMPETING CANDIDATE</small><strong>'+result.rival+'/100</strong></div></div><p>Review your club compatibility and interview decisions before your next application.</p>');panel.querySelector("#back").textContent="Back to vacancies";panel.querySelector("#back").onclick=jobs};
}
function contractCounter(s,c,record,salary,years){
if(!Number.isInteger(salary)||!Number.isInteger(years)||salary<c.salary*.75||salary>c.salary*1.5||years<1||years>3)return {valid:false};
const cap=c.salary*(1.03+directorAttributes(s).negotiation*.008+Math.max(0,(record.score||60)-(record.rival||60))*.004);
const accepted=salary<=cap&&(years<=2||salary<=c.salary*1.04);
return {valid:true,accepted};
}
function offer(i){
const s=load(),c=activeClubs(s)[i];if(!s||s.club||s.calendar.finished||!c||!c.vacant||s.applications[c.name]!=="Offer")return jobs();employmentRecord(s);
const r=s.employment[c.name]||(s.employment[c.name]={salary:c.salary,years:2,counters:0,score:60,rival:60,fit:employmentFit(s,c)});
show("Employment Offer",'<p>'+escapeHtml(c.name)+' · '+DIVISIONS[c.tier-1]+'</p><div class="setup-facts"><div><small>ANNUAL SALARY</small><strong>'+money(r.salary)+'</strong></div><div><small>CONTRACT</small><strong>'+r.years+' years</strong></div><div><small>TRANSFER BUDGET</small><strong>'+money(c.budget)+'</strong></div></div><p>Board objective: '+escapeHtml(c.boardObjective)+'.</p>'+(r.message?'<p class="setup-note">'+escapeHtml(r.message)+'</p>':'')+(r.counters<2?'<form id="counter" class="counter-form"><label>Proposed annual salary (£)<input name="salary" type="number" required min="'+Math.ceil(c.salary*.75)+'" max="'+Math.floor(c.salary*1.5)+'" step="1" value="'+r.salary+'"></label><label>Contract length<select name="years">'+[1,2,3].map(y=>'<option '+(r.years===y?'selected':'')+'>'+y+'</option>').join("")+'</select></label><button class="action wide" type="submit">Submit counteroffer ('+(2-r.counters)+' remaining)</button></form>':'<p>Negotiations concluded. Accept the final terms or decline.</p>')+'<button class="action main" id="accept">Accept appointment</button><button class="action" id="decline">Decline offer</button>');panel.querySelector("#back").textContent="Back to vacancies";panel.querySelector("#back").onclick=jobs;
const form=panel.querySelector("#counter");if(form)form.onsubmit=e=>{e.preventDefault();const f=new FormData(form),salary=Number(f.get("salary")),years=Number(f.get("years")),out=contractCounter(s,c,r,salary,years);if(!out.valid)return;r.counters++;if(out.accepted){r.salary=salary;r.years=years;r.message="The board accepts your revised terms."}else{r.message="The board rejects your counteroffer. The existing offer remains available."}if(save(s))offer(i)};
panel.querySelector("#accept").onclick=()=>{s.club=c.name;c.director=s.name;c.vacant=false;s.contract={salary:r.salary,years:r.years,season:s.season,startDate:s.calendar.date,endDate:contractEnd(s.calendar.date,r.years)};relationships(s,c);s.applications[c.name]="Accepted";s.history.push({club:c.name,season:s.season,startDate:s.calendar.date,salary:r.salary,years:r.years,status:"Current appointment"});s.rep=Math.min(100,s.rep+1);if(save(s))career()};
panel.querySelector("#decline").onclick=()=>{s.applications[c.name]="Declined";if(save(s))jobs()};
}
function careerHistory(){const s=load();if(!s)return home();employmentRecord(s);show("Career History",s.history.length?'<div class="employment-list">'+s.history.map(r=>'<article class="employment-card"><div><strong>'+escapeHtml(r.club)+'</strong><small>'+escapeHtml(r.season)+' · '+escapeHtml(r.status)+'</small></div><div><strong>'+money(r.salary)+'/year</strong><small>'+r.years+' years</small></div></article>').join("")+'</div>':'<p>No appointments recorded yet.</p>');panel.querySelector("#back").textContent="Back to office";panel.querySelector("#back").onclick=career}
function saves(){const s=load();show("Career Saves",s?'<p>'+escapeHtml(s.name)+' · '+escapeHtml(s.club||"Unemployed")+'</p><button class="action" id="export">Export backup</button><button class="action" id="delete">Delete career</button>':'<p>No local career saved.</p>');if(s){document.querySelector("#export").onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(s,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=u;a.download="football-director-career.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};document.querySelector("#delete").onclick=()=>{if(confirm("Permanently delete this local career?")){localStorage.removeItem(KEY);saves()}}}}
function settings(){show("Preferences",'<label><span>Compact menu</span><input id="compact" type="checkbox"></label>');const c=document.querySelector("#compact");c.checked=document.body.classList.contains("compact");c.onchange=()=>{document.body.classList.toggle("compact",c.checked);try{localStorage.setItem(PREF,c.checked?"1":"0")}catch{}}}
function about(){show("About the Game","<p>You are the Director of Football, not the manager. Recruit players, appoint coaches, shape the club and build a career.</p><p>Current prototype: menu, director setup, local saves, club database and scored employment interviews with contract negotiation. Transfers, matches, board AI and career progression are planned, not implemented.</p>")}
const actions={new:create,continue:()=>{const s=load();const i=s&&!s.club&&!s.calendar.finished?activeClubs(s).findIndex(c=>c.vacant&&s.applications[c.name]==="Offer"):-1;i>=0?offer(i):career()},world:()=>world(),saves,settings,about};menu.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>actions[b.dataset.action]());try{document.body.classList.toggle("compact",localStorage.getItem(PREF)==="1")}catch{}home();