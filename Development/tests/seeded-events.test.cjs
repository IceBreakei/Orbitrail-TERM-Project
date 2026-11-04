const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const n of ['game-config','campaign-config','event-config','seeded-events','campaign-schedule'])vm.runInContext(fs.readFileSync('Development/'+n+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
assert.equal(run('campaignEventChart.length'),27);
// Timeline start uses internal time; all repeating rings share one real-time lifetime.
run("var emitted=[],ended=[],warned=[];var ring=campaignEventChart.find(e=>e.id==='heavy-rings-0830');var events=createCampaignEvents({getPoints:e=>Array.from({length:e.count},(_,i)=>({x:i,y:0})),spawn:(e,p)=>{emitted.push({e,p});return true},onEnd:key=>ended.push(key),chart:[ring]})");
run("events.update(509,1,{stage:'second'});events.update(510,1,{stage:'second'})");assert.equal(run('emitted.length'),27);
for(let i=1;i<=13;i++)run("events.update(510,1.66,{stage:'second'})");
assert.equal(run('emitted.length'),378);assert.equal(run('new Set(emitted.map(x=>x.e.groupId)).size'),1);
run("events.update(510,.42,{stage:'second'})");assert.equal(run('ended.length'),1);assert.equal(run('ended[0]'), 'heavy-rings-0830');
// Repeated window remains active while internal time is frozen, even across real seconds.
run("var repeated=0;var horde=campaignEventChart.find(e=>e.id==='pedro-hordes-0500');var stream=createCampaignEvents({getPoints:e=>Array.from({length:e.count},(_,i)=>({x:i,y:0})),spawn:()=>{repeated++;return true},chart:[horde]});stream.update(300,0,{stage:'first'});stream.update(300,15,{stage:'first'})");
assert.equal(run('repeated'),400);
run("stream.update(311,1,{stage:'first'});stream.update(311,10,{stage:'first'})");assert.equal(run('repeated'),400);
// Finite groups expire during an internal boss freeze.
run("var wallEnds=0;var wall=campaignEventChart.find(e=>e.id==='mob2-wall-0130');var ttl=createCampaignEvents({getPoints:e=>Array.from({length:e.count},()=>({x:0,y:0})),spawn:()=>true,onEnd:()=>wallEnds++,chart:[wall]});ttl.update(90,0,{stage:'first'});ttl.update(90,8.3,{stage:'first'})");assert.equal(run('wallEnds'),1);
// Absolute SPD/defaults map through chart stats, without double conversion.
run("var fast=campaignEventChart.find(e=>e.id==='ops-stampede-1225');var fastProfile=eventEnemyProfile(fast,'opsSweeper',745,'second');var actor=campaignEnemyOverrides({row:fastProfile},{spriteSize:53.76})");
assert.equal(run('actor.hp'),2000);assert.equal(run('actor.contactDamage'),7);assert.equal(run('actor.movementSpeedMultiplier'),4);assert.equal(run('actor.expReward'),10);
assert.equal(run("eventEnemyProfile(campaignEventChart[1],'pedrozilla',65,'first').spd"),1);
// Generated identities are deterministic and cover the full normal/Mega roster.
assert.equal(run('JSON.stringify(generatedEvent(42,3,1100))'),run('JSON.stringify(generatedEvent(42,3,1100))'));
assert.notEqual(run('JSON.stringify(generatedEvent(43,3,1100))'),run('JSON.stringify(generatedEvent(42,3,1100))'));
assert.equal(run('Array.from({length:100},(_,i)=>generatedEvent(42,i,1100)).every(e=>["mob","mob2","mob3"].includes(e.enemy))'),true);
run("var generated=[];var gen=createCampaignEvents({seed:42,chart:[],getPoints:e=>Array.from({length:e.count},()=>({x:0,y:0})),spawn:(e)=>{generated.push(e);return true}});gen.update(1019,100,{stage:'third'})");assert.equal(run('generated.length'),0);
run("gen.update(1020,25,{stage:'third'});gen.update(1020,1,{stage:'third'})");assert(run('generated.length')>0);
console.log('PASS:27chart rows, shared22s ring cleanup/378total, repeat windows during freeze, real lifetimes, absoluteSPD/defaults, deterministic all-variant generation after17min.');
// No duplicate spawning while a blocked wave retries; shared group cleanup is invoked once.
run("var capacity=2,partial=0,expired=0;var finite={id:'limited',stage:'first',timeSeconds:5,enemy:'mob',pattern:'cluster',count:5,lifetimeSeconds:3,stats:'default'};var limited=createCampaignEvents({chart:[finite],getPoints:e=>Array.from({length:e.count},(_,i)=>({x:i,y:0})),spawn:()=>{if(partial>=capacity)return false;partial++;return true},onEnd:()=>expired++});limited.update(5,0,{stage:'first'});limited.update(5,.1,{stage:'first'})");
assert.equal(run('partial'),2);
run("capacity=5;limited.update(5,.1,{stage:'first'});limited.update(5,3,{stage:'first'});limited.update(5,1,{stage:'first'})");assert.equal(run('partial'),5);assert.equal(run('expired'),1);
// Seeded event identities are stable across frame steps, even while the internal clock is frozen.
const simulate=step=>{
 c.step=step;
 return run(`(()=>{let result=[];let simulation=createCampaignEvents({seed:123,chart:[],getPoints:e=>Array.from({length:e.count},()=>({x:0,y:0})),spawn:e=>{if(!result.some(x=>x.id===e.id))result.push({id:e.id,enemy:e.enemy,pattern:e.pattern,count:e.count});return true}});for(let t=0;t<130;t+=step)simulation.update(1050,step,{stage:'third'});return JSON.stringify(result)})()`);
};
assert.equal(simulate(.1),simulate(.05));
console.log('PASS: blocked-wave retry without duplication, one group expiration and frame-independent seeded event identities.');

assert.equal(run("campaignEventChart.find(e=>e.pattern==='cluster').count"),20);
assert.equal(run("Array.from({length:200},(_,i)=>generatedEvent(42,i,1700)).filter(e=>e.pattern==='cluster').every(e=>e.count===20)"),true);

assert.equal(run('new Set(Array.from({length:400},(_,i)=>generatedEvent(42,i,1900).pattern)).size'),10);
assert.equal(run('Array.from({length:100},(_,i)=>generatedEvent(42,i,1799)).some(e=>e.enemy==="midori")'),false);
assert.equal(run('Array.from({length:100},(_,i)=>generatedEvent(42,i,1800)).some(e=>e.enemy==="midori")'),true);
