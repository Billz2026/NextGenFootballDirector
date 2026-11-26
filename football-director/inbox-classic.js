"use strict";
(()=>{
const render=inboxContent,wire=wireInbox;
inboxContent=function(s,ms,st,id,filter){
let html=render(s,ms,st,id,filter);
html=html.replace('<div class="ix-inbox">','<div class="ix-inbox classic-inbox">');
html=html.replace(/<div class="ix-header">[\s\S]*?(?=<nav class="ix-filters">)/, "");
html=html.replace(/<div class="ix-story-status">[\s\S]*?(?=<div class="ix-layout">)/,"");
html=html.replace(/<div class="ix-date-group">[^<]*<\/div>/g,"");
html=html.replace(/<button class="ix-message ([^"]*)" data-message="(\d+)">[\s\S]*?<\/button>/g,(all,cls,i)=>{
const m=ms[+i];if(!m)return all;const title=all.match(/<strong>([\s\S]*?)<\/strong>/)?.[1]||escapeHtml(m.subject),a=mailAction(s,m),pending=a&&!a.optional,unread=!st.read.includes(m.id),status=pending?(a.deadline&&a.deadline<=datePlus(s.calendar.date,2)?"Due soon":"Decision"):unread?"New":"Read";
return '<button type="button" class="ix-message '+cls+'" data-message="'+i+'" title="'+escapeHtml(m.subject)+'"><span class="ci-date">'+escapeHtml(prettyDate(m.date))+'</span><span class="ci-dept">'+escapeHtml(m.category)+'</span><strong class="ci-subject">'+title+'</strong><span class="ci-status">'+status+'</span></button>'
});
html=html.replace('<div class="ix-list-scroll">','<div class="ci-columns"><span>Date</span><span>Department</span><span>Subject</span><span>Status</span></div><div class="ix-list-scroll">');
html=html.replace(/<div class="ed-document">[\s\S]*?<\/small><\/div><\/div>/,"");
html=html.replace(/<div class="mn-masthead"[\s\S]*?<\/small><\/div><\/div>/,"");
html=html.replace(/<div class="ix-priority">([\s\S]*?)<\/div>/,'<div class="ci-priority">$1</div>');
html=html.replace(/<\/section><\/div><\/div>$/,'</section></div><footer class="ci-nav"><button type="button" data-ci="prev">‹ Previous message</button><button type="button" data-ci="archive">Archive</button><span class="ci-summary"></span><button type="button" data-ci="next">Next message ›</button><button type="button" data-ci="unread">Next unread ›</button></footer></div>');
return html
};
wireInbox=function(s,ms,st,id,filter){
wire(s,ms,st,id,filter);
const rows=[...panel.querySelectorAll(".classic-inbox .ix-message")],reader=panel.querySelector(".classic-inbox .ix-reader"),nav=panel.querySelector(".ci-nav");if(!nav)return;
const current=rows.find(r=>ms[Number(r.dataset.message)]?.id===id);
if(current)current.scrollIntoView({block:"nearest"});
const oldNext=reader?.querySelector(".ed-next");if(oldNext)oldNext.remove();
const archive=reader?.querySelector("[data-mail-archive]");if(archive)archive.style.display="none";
const available=()=>rows.filter(r=>!r.hidden);
const getNext=(dir)=>{const a=available(),i=a.indexOf(current);return dir<0?(i>0?a[i-1]:null):a[i+1]};
const unread=()=>available().find(r=>!st.read.includes(ms[Number(r.dataset.message)]?.id));
const buttons={prev:()=>getNext(-1)?.click(),next:()=>getNext(1)?.click(),archive:()=>archive?.click(),unread:()=>{const n=unread();if(n)n.click();else career("inbox",null,"unread")}};
for(const b of nav.querySelectorAll("[data-ci]")){const k=b.dataset.ci;b.onclick=buttons[k];if(k==="archive")b.disabled=!archive;if(k==="prev")b.disabled=!getNext(-1);if(k==="next")b.disabled=!getNext(1)}
const summary=nav.querySelector(".ci-summary");if(summary)summary.textContent=rows.length+" in view · "+ms.filter(m=>!st.read.includes(m.id)&&!st.archived.includes(m.id)).length+" unread";
if(reader)reader.scrollTop=0;
};
})();