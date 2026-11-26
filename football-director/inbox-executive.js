"use strict";
(()=>{
const baseCategory=mailCategory,baseMessages=officeMessages,baseCandidates=dilemmaCandidates,baseResolve=dilemmaResolve,baseTick=dilemmaTick;
const category=m=>{const id=m.id||"",from=m.from||"";if(/medical|injury/i.test(from+" "+id))return "Medical";if(/finance|wage|allocation/i.test(from+" "+id))return "Finance";if(/academy/i.test(from+" "+id))return "Academy";if(/agent|contract-demand/i.test(from+" "+id))return "Agents";if(/manager|^request-/i.test(id)||/assistant manager/i.test(from))return "Manager";return baseCategory(m)};
mailCategory=category;
officeMessages=function(s){const messages=baseMessages(s);for(const m of messages)m.category=category(m);return messages};
const decisions={
 "agent-renew":"Attempts a two-year extension with an 8% wage increase, subject to wage budget.",
 "agent-wait":"No new spending; player morale may decline.",
 "agent-list":"Places the player on the transfer list if still eligible.",
 "youth-promote":"Moves the named prospect into the senior squad if space and wage budget permit.",
 "youth-develop":"Keeps the player in the academy and records a development review.",
 "youth-hold":"No squad change; manager retains existing depth.",
 "scout-shortlist":"Adds the named target to your recruitment shortlist; no transfer commitment.",
 "scout-alternative":"Keeps the search open and requests a fresh positional review.",
 "scout-reject":"Closes this recommendation; manager may be disappointed.",
 "reserve":"Protects 20% of the remaining transfer budget.","full-budget":"Releases the existing financial reserve.",
 "hold-budget":"Leaves current spending limits unchanged.","cover":"Schedules a recruitment review.","academy-cover":"Promotes an eligible prospect if squad capacity permits.","wait-cover":"Preserves funds but may damage manager trust.",
 "captain":"Improves affected players’ morale.","delegate-morale":"Delegates the issue to the manager.","discipline":"Risks worsening squad morale."
};
dilemmaCandidates=function(s){const out=baseCandidates(s),c=dilemmaClub(s);if(!c)return out;const d=s.calendar.date;
 const exp=c.players.filter(p=>p.contractEnd>d&&p.contractEnd<=datePlus(d,365)&&p.morale<80).sort((a,b)=>a.contractEnd.localeCompare(b.contractEnd))[0];
 if(exp)out.push({key:"contract-demand",title:exp.name+" requests contract clarity",from:"Player agent",body:exp.name+" ("+exp.position+", age "+exp.age+") earns "+money(exp.wage)+"/week. His contract expires "+prettyDate(exp.contractEnd)+". The agent wants a decision on his future.",playerId:exp.id,choices:[["Approve a contract extension","agent-renew"],["Defer discussions","agent-wait"],["Explore a sale","agent-list"]]});
 const youth=c.academyPlayers.filter(p=>p.age>=17).sort((a,b)=>b.potential-a.potential)[0];if(youth)out.push({key:"academy-prospect",title:"Pathway review: "+youth.name,from:"Academy director",body:youth.name+" is "+youth.age+" and plays "+youth.position+". Current ability "+youth.ability+"/100; potential "+youth.potential+"/100. Senior squad: "+c.players.length+"/30.",playerId:youth.id,choices:[["Promote to first team","youth-promote"],["Continue academy development","youth-develop"],["Keep existing squad hierarchy","youth-hold"]]});
 if(windowStatus(d)!=="Closed"){const target=clubTargets(s,c).flatMap(x=>x.targets).find(x=>!c.shortlist.includes(x.p.id));if(target)out.push({key:"scout-recommendation",title:"Scout recommendation: "+target.p.name,from:"Head scout",body:target.p.name+" ("+target.p.position+", age "+target.p.age+") is currently at "+(target.club?.name||"no club")+". Estimated value "+money(target.p.value)+"; remaining transfer budget "+money(c.budget)+".",playerId:target.p.id,choices:[["Add to recruitment shortlist","scout-shortlist"],["Request alternative options","scout-alternative"],["Reject recommendation","scout-reject"]]})}
 return out;
};
dilemmaResolve=function(s,e){if(!/^(agent-|youth-|scout-)/.test(e.choice||""))return baseResolve(s,e);if(e.status!=="scheduled")return false;const c=dilemmaClub(s);if(!c||c.id!==e.club||e.appointment&&e.appointment!==s.contract?.startDate){e.status="closed";return false}e.status="resolved";const rel=relationships(s,c),p=c.players.find(p=>p.id===e.playerId),y=c.academyPlayers.find(p=>p.id===e.playerId);let body="The player is no longer available.";
 switch(e.choice){
 case "agent-renew":if(p){body=renewPlayer(s,p.id)?p.name+" agreed a new contract at "+money(p.wage)+"/week, expiring "+prettyDate(p.contractEnd)+".":"Renewal could not proceed under the current contract or wage budget."}break;
 case "agent-wait":if(p){p.morale=clampConfidence(p.morale-6);body=p.name+" remains under contract but his morale has fallen."}break;
 case "agent-list":if(p){body="Sale exploration recorded for "+p.name+". Review the player in the Transfer Centre before listing.";rel.manager=clampConfidence(rel.manager-2);c.shortlist=c.shortlist.filter(id=>id!==p.id)}break;
 case "youth-promote":if(y){body=squadPayroll(c)+y.wage<=c.wageBudget&&promotePlayer(s,y.id)?y.name+" has joined the senior squad.":"Promotion blocked by squad capacity or wages."}break;
 case "youth-develop":if(y){y.morale=clampConfidence(y.morale+3);body=y.name+" remains in the academy with a development review agreed."}break;
 case "youth-hold":rel.manager=clampConfidence(rel.manager+1);body="The existing squad hierarchy remains unchanged.";break;
 case "scout-shortlist":if(marketPlayers(s.world).some(x=>x.p.id===e.playerId&&x.club!==c)){if(!c.shortlist.includes(e.playerId))c.shortlist.push(e.playerId);body="Target added to the recruitment shortlist. No funds have been committed."}break;
 case "scout-alternative":c.nextRecruitment=s.calendar.date;body="The recruitment team will review current positional requirements.";break;
 case "scout-reject":rel.manager=clampConfidence(rel.manager-1);body="The recommendation has been rejected.";break;
 }
 calendarEvent(s,"dilemma-outcome:"+e.id,"Decision outcome — "+e.title,body,e.from);return true;
};
dilemmaTick=function(s){baseTick(s);if(s.calendar.finished)return;const o=dilemmaState(s),c=dilemmaClub(s),d=s.calendar.date;if(!c||o.dilemmas.filter(e=>["pending","scheduled"].includes(e.status)).length>=2)return;const elapsed=Math.floor((Date.parse(d)-Date.parse(CAREER_START))/86400000);if(elapsed%3!==1)return;const candidates=dilemmaCandidates(s).filter(q=>!o.dilemmas.some(e=>e.key===q.key&&(e.status==="pending"||e.status==="scheduled"||d<datePlus(e.date,28))));if(!candidates.length)return;const q=candidates[dilemmaRoll(d+":"+c.id)%candidates.length],id="dilemma:"+q.key+":"+d;o.dilemmas.push({...q,id,club:c.id,appointment:s.contract?.startDate,status:"pending",date:d,deadline:datePlus(d,5)});calendarEvent(s,id,q.title,q.body,q.from)};
const baseInbox=inboxContent;
inboxContent=function(s,messages,state,messageId,filter="all"){
 const esc=escapeHtml,actions=new Map(messages.map(m=>[m.id,mailAction(s,m)])),active=m=>!!actions.get(m.id)&&!actions.get(m.id).optional,arch=m=>state.archived.includes(m.id)&&!active(m),unread=m=>!state.read.includes(m.id),days=m=>{const deadline=actions.get(m.id)?.deadline;return deadline?Math.round((Date.parse(deadline)-Date.parse(s.calendar.date))/86400000):null};
 const categories=[...new Set(messages.filter(m=>!arch(m)).map(m=>m.category))].sort(),filters=[["all","All"],["unread","Unread"],["action","Decisions"],["archived","Archive"],...categories.map(x=>["cat:"+x,x])];
 const visible=messages.filter(m=>filter==="archived"?arch(m):!arch(m)&&(filter==="unread"?unread(m):filter==="action"?active(m):filter.startsWith("cat:")?m.category===filter.slice(4):filter==="media"?m.category==="Media":true)).sort((a,b)=>Number(active(b))-Number(active(a))||(days(a)??999)-(days(b)??999)||b.date.localeCompare(a.date));
 const selected=messages.find(m=>m.id===messageId),a=selected&&actions.get(selected.id),urgent=messages.filter(m=>active(m)&&days(m)!==null&&days(m)<=2).length;
 const list=visible.map(m=>'<button class="ix-message '+(selected?.id===m.id?"selected ":"")+(unread(m)?"unread ":"")+(active(m)?"actionable":"")+'" data-message="'+messages.indexOf(m)+'"><span class="ix-letter">'+esc((m.from||"?").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase())+'</span><span class="ix-message-copy"><small>'+esc(m.category)+' · '+esc(prettyDate(m.date))+'</small><strong>'+esc(m.subject)+'</strong><span>'+esc(m.from)+'</span></span><span class="ix-flag">'+(active(m)?days(m)!==null&&days(m)<=2?"DUE SOON":"DECISION":unread(m)?"NEW":"")+'</span></button>').join("")||'<p class="ix-empty">No correspondence in this view.</p>';
 let detail='<div class="ix-empty"><h3>Director correspondence</h3><p>Select a message to review its contents and available decisions.</p></div>';
 if(selected){const html=baseInbox(s,messages,state,messageId,arch(selected)?"archived":"all"),start=html.indexOf('<section class="ng-mail-reader">'),end=html.lastIndexOf('</section>');detail=start>=0?html.slice(start+'<section class="ng-mail-reader">'.length,end):detail;if(a?.type==="dilemma"){detail=detail.replace(/(<button class="action ng-mail-choice" data-mail-dilemma="(\d+)">)([\s\S]*?)(<\/button>)/g,(m,open,i,label,close)=>open+'<strong>'+label+'</strong><small>'+esc(decisions[a.event.choices[+i]?.[1]]||"This decision may affect club relationships and future correspondence.")+'</small>'+close)}if(a&&!a.optional)detail='<div class="ix-priority">DECISION REQUIRED'+(days(selected)!==null?" · "+days(selected)+" day"+(days(selected)===1?"":"s")+" remaining":"")+'</div>'+detail;const event=dilemmaState(s).dilemmas.find(e=>e.id===selected.id);if(event&&event.status!=="pending")detail+='<p class="ix-outcome">'+esc(event.status==="scheduled"?"Response recorded · Follow-up due "+prettyDate(event.resolveDate):"Decision status: "+event.status)+'</p>'}
 return '<div class="ix-inbox"><div class="ix-header"><div><small>EXECUTIVE COMMUNICATIONS</small><h3>Director inbox</h3><p>Club correspondence, priorities and football decisions.</p></div><div class="ix-counts">'+[["Unread",messages.filter(m=>!arch(m)&&unread(m)).length],["Decisions",messages.filter(active).length],["Due soon",urgent]].map(([k,v])=>'<div><small>'+k+'</small><strong>'+v+'</strong></div>').join("")+'</div></div><nav class="ix-filters">'+filters.map(([k,v])=>'<button class="'+(filter===k?"active":"")+'" data-mail-filter="'+esc(k)+'">'+esc(v)+'</button>').join("")+'</nav><div class="ix-layout"><section class="ix-list"><header>Correspondence <span>'+visible.length+' messages</span></header><div class="ix-list-scroll">'+list+'</div></section><section class="ix-reader ng-mail-reader">'+detail+'</section></div></div>';
};
})();
