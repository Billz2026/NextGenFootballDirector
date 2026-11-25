import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../football-director/app.js',import.meta.url),'utf8');
const marker='const actions={new:legacySelect';
assert.ok(source.includes(marker),'Expected browser entry point');
const context=vm.createContext({document:{querySelector:()=>({})},console});
vm.runInContext(source.slice(0,source.indexOf(marker)),context);
const run=code=>vm.runInContext(code,context);
test('100 unique clubs, manager identities, sensible financial and reputation ranges',()=>{
 const w=run('newWorld()');
 assert.equal(w.clubs.length,100);
 for(const key of ['id','name'])assert.equal(new Set(w.clubs.map(c=>c[key])).size,100);
 assert.equal(new Set(w.clubs.map(c=>c.manager.id)).size,100);
 for(const c of w.clubs){assert.ok(c.rep>=0&&c.rep<=100);assert.ok(c.cash>=c.budget&&c.wageBudget>0&&c.salary>0);assert.ok(c.manager.name&&c.manager.formation);}
});
test('40 consecutive seasons: 76000 fixtures, balanced schedules, tables, movement and stable identities',()=>{
 const summary=run(`(()=>{
 const s={world:newWorld(),calendar:{date:CAREER_START,events:[]},season:"2026/27",rep:5,history:[]};
 const original=new Map(s.world.clubs.map(c=>[c.id,{name:c.name,manager:c.manager.id}]));
 let total=0,moved=0;
 const require=(condition,message)=>{if(!condition)throw Error(message)};
 for(let year=2026;year<2066;year++){
  s.calendar.date=year+"-07-01";syncCalendar(s);
  const l=ensureLeague(s),league=l.fixtures.filter(f=>f.type==="league"),friendlies=l.fixtures.filter(f=>f.type==="friendly");
  require(league.length===1900,"league count");require(friendlies.length===150,"friendly count");
  require(new Set(l.fixtures.map(f=>f.id)).size===2050,"duplicate ids");
  const dates=new Set();
  for(const f of l.fixtures){
   require(f.homeClubId!==f.awayClubId,"self fixture");
   for(const id of [f.homeClubId,f.awayClubId]){const k=f.date+":"+id;require(!dates.has(k),"schedule collision");dates.add(k)}
   f.played=true;f.homeGoals=(f.round+Number(f.homeClubId.split("-").at(-1)))%4;f.awayGoals=(f.round+Number(f.awayClubId.split("-").at(-1)))%3;
  }
  for(let t=1;t<=5;t++){
   const ids=s.world.clubs.filter(c=>c.tier===t).map(c=>c.id),fixtures=league.filter(f=>f.tier===t),rows=leagueTable(s,t);
   require(ids.length===20&&fixtures.length===380,"division count");
   require(new Set(fixtures.map(f=>f.homeClubId+":"+f.awayClubId)).size===380,"duplicate ordered pair");
   for(const id of ids){require(fixtures.filter(f=>f.homeClubId===id).length===19,"home balance");require(fixtures.filter(f=>f.awayClubId===id).length===19,"away balance")}
   require(rows.every(r=>r.p===38&&r.w+r.d+r.l===38&&r.pts===r.w*3+r.d),"table arithmetic");
   require(rows.reduce((n,r)=>n+r.gf-r.ga,0)===0,"goal conservation");
  }
  total+=league.length;
  s.calendar.date=(year+1)+"-06-30";syncCalendar(s);closeLeagueSeason(s);closeLeagueSeason(s);
  const history=s.world.seasonHistory.at(-1);
  require(history.complete&&history.moves.length===(year===2065?0:24),"movement count");
  moved+=history.moves.length;
  for(let t=1;t<=5;t++)require(s.world.clubs.filter(c=>c.tier===t).length===20,"division size changed");
  for(const c of s.world.clubs){require(original.get(c.id).name===c.name&&original.get(c.id).manager===c.manager.id,"identity changed");require(c.rep>=0&&c.rep<=100,"invalid reputation")}
 }
 return {total,moved,seasons:s.world.seasonHistory.length,finished:s.calendar.finished};
 })()`);
 assert.equal(summary.total,76000);assert.equal(summary.moved,936);assert.equal(summary.seasons,40);assert.equal(summary.finished,true);
});
test('incomplete season cannot trigger movements',()=>{
 const n=run(`(()=>{const s={world:newWorld(),calendar:{date:CAREER_START,events:[]},season:"2026/27"};ensureLeague(s);closeLeagueSeason(s);return s.world.seasonHistory[0].moves.length})()`);
 assert.equal(n,0);
});
