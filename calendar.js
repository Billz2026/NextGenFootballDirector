'use strict';
/* The Motor Trade — UK calendar-month engine. All dates are UTC calendar dates.
 * Day 1 = Monday 9 November 2026; first month closes 30 November.
 * No additional fields are added to saved careers.
 */
(() => {
  const START=Date.UTC(2026,10,9),DAY=86400000;
  const safe=d=>Number.isSafeInteger(d)&&d>=1&&d<=36500;
  const date=day=>new Date(START+(day-1)*DAY);
  const daysSince=timestamp=>Math.round((timestamp-START)/DAY)+1;
  const monthOf=day=>{
    if(!safe(day))return null;
    const x=date(day);
    return (x.getUTCFullYear()-2026)*12+x.getUTCMonth()-10+1;
  };
  const dayStart=day=>{
    if(!safe(day))return null;
    const x=date(day);
    return Math.max(1,daysSince(Date.UTC(x.getUTCFullYear(),x.getUTCMonth(),1)));
  };
  const dayEnd=day=>{
    if(!safe(day))return null;
    const x=date(day);
    return daysSince(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0));
  };
  const isMonthEnd=day=>safe(day)&&day===dayEnd(day);
  const isMonthStart=day=>safe(day)&&(day===1||day===dayStart(day));
  const label=day=>date(day).toLocaleDateString('en-GB',{
    day:'numeric',month:'long',year:'numeric',timeZone:'UTC'
  });
  const monthLabel=day=>date(day).toLocaleDateString('en-GB',{
    month:'long',year:'numeric',timeZone:'UTC'
  });
  window.MotorTradeCalendar=Object.freeze({
    START,DAY,date,monthOf,dayStart,dayEnd,isMonthStart,isMonthEnd,label,monthLabel
  });
})();