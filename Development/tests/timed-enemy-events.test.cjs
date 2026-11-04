const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const n of ['game-config','timed-enemy-events'])vm.runInContext(fs.readFileSync('Development/'+n+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var spawned=[];var capacity=7;var scheduler=createTimedEnemyEvents(e=>clusterSpawnPoints({x:0,y:0},e.count,50),(e,p)=>{if(spawned.length>=capacity)return false;spawned.push({event:e,point:p});return true})');
run('scheduler.update(4.99)');assert.equal(run('spawned.length'),0);
run('scheduler.update(5)');assert.equal(run('spawned.length'),7);
run('capacity=15;scheduler.update(5.1);scheduler.update(6)');assert.equal(run('spawned.length'),15);
assert.equal(run('new Set(spawned.map(s=>`${s.point.x}:${s.point.y}`)).size'),15);
assert.equal(run('spawned[0].event.enemy'),'mob');assert.equal(run('spawned[0].event.lifetimeSeconds'),null);
run('var placements=0;var retry=createTimedEnemyEvents(()=>++placements<2?null:clusterSpawnPoints({x:0,y:0},15,50),()=>true);retry.update(5);retry.update(6)');assert.equal(run('placements'),2);
console.log('PASS:5second15Mob cluster, unique points, default/no-timeout config, capacity retry without duplicates and invalid-anchor retry.');

run('var hordes=[];var both=createTimedEnemyEvents(e=>clusterSpawnPoints({x:-200,y:100},e.count,30),(e,p)=>{hordes.push({event:e,point:p});return true});both.update(64.99)');
assert.equal(run("hordes.filter(x=>x.event.pattern==='horde').length"),0);
run('both.update(65);both.update(66)');
assert.equal(run("hordes.filter(x=>x.event.pattern==='horde').length"),30);
assert.equal(run("hordes.find(x=>x.event.pattern==='horde').event.enemy"),'whiteSweeper');
assert.equal(run("hordes.find(x=>x.event.pattern==='horde').event.lifetimeSeconds"),null);
assert.equal(run("hordeMotion({x:10,y:20,chargeAngle:0}).direction"),'right');
assert.equal(run("hordeMotion({x:10,y:20,chargeAngle:0}).target.y"),20);
assert.equal(run("hordeMotion({x:100,y:-300,chargeAngle:0}).target.y"),-300);
console.log('PASS:65second30Sweeper horde fires once, default/no-timeout config and fixed straight heading.');
run('var wall=timedEnemyEvents.find(e=>e.pattern==="wall");var points=wallSpawnPoints({left:-50,right:1330,top:50,bottom:670},140)');
assert.equal(run('points.length'),140);assert.equal(run('points.filter(p=>p.x===-50).length'),70);assert.equal(run('points.filter(p=>p.x===1330).length'),70);
assert.equal(run('timedEventStatOverrides(wall).hp'),120);assert.equal(run('timedEventStatOverrides(wall).expReward'),4);assert.equal(run('timedEventStatOverrides(wall).contactDamage'),undefined);
run('var wallCount=0;var timedWall=createTimedEnemyEvents(e=>wallSpawnPoints({left:0,right:100,top:0,bottom:100},e.count),()=>{wallCount++;return true},[wall]);timedWall.update(89.99)');assert.equal(run('wallCount'),0);
run('timedWall.update(90);timedWall.update(91)');assert.equal(run('wallCount'),140);
run('var lateCount=0;var late=createTimedEnemyEvents(()=>[],()=>{lateCount++;return true},[wall]);late.update(98)');assert.equal(run('lateCount'),0);
console.log('PASS:90second140HeavySweeper two-wall formation,120HP/4EXP/defaultATK and98second expiry cutoff.');

run('var ring=timedEnemyEvents.find(e=>e.pattern==="ring");var ringPoints=ringSpawnPoints({x:100,y:200},50,240)');
assert.equal(run('ringPoints.length'),50);
assert(run('ringPoints.every(p=>Math.abs(Math.hypot(p.x-100,p.y-200)-240)<1e-8)'));
assert.equal(run('new Set(ringPoints.map(p=>`${p.x}:${p.y}`)).size'),50);
run('var ringCount=0;var ringEvent=createTimedEnemyEvents(e=>ringSpawnPoints({x:0,y:0},e.count,e.radius),()=>{ringCount++;return true},[ring]);ringEvent.update(154.99)');assert.equal(run('ringCount'),0);
run('ringEvent.update(155);ringEvent.update(156)');assert.equal(run('ringCount'),50);
assert.equal(run('ring.timeSeconds+ring.lifetimeSeconds'),163);
assert.equal(Object.keys(run('timedEventStatOverrides(ring)')).length,0);
console.log('PASS:155second50Sweeper ring, full circular geometry, default stats and163second expiry.');
run('var stampede=timedEnemyEvents.find(e=>e.pattern==="stampede");var stampedePoints=stampedeSpawnPoints({x:-100,y:200},{x:500,y:200},10,40)');
assert.equal(run('stampedePoints.length'),10);assert(run('stampedePoints.every(p=>p.x===-100&&p.chargeAngle===0)'));
assert.equal(run('timedEventStatOverrides(stampede,{contactDamage:2,movementSpeedMultiplier:84/180}).hp'),500);
assert.equal(run('timedEventStatOverrides(stampede,{contactDamage:2,movementSpeedMultiplier:84/180}).contactDamage'),4);
assert.equal(run('timedEventStatOverrides(stampede,{contactDamage:2,movementSpeedMultiplier:84/180}).movementSpeedMultiplier'),168/180);
run('var stampedeCount=0,warnings=0;var rush=createTimedEnemyEvents(e=>stampedeSpawnPoints({x:0,y:0},{x:100,y:0},e.count,30),()=>{stampedeCount++;return true},[stampede],()=>warnings++);rush.update(164.3)');
assert.equal(run('warnings'),1);assert.equal(run('stampedeCount'),0);
run('rush.update(164.9);rush.update(165);rush.update(166)');assert.equal(run('warnings'),1);assert.equal(run('stampedeCount'),10);
assert.equal(run('stampede.timeSeconds+stampede.lifetimeSeconds'),185);
console.log('PASS:165second10Mob stampede, single direction warning, perpendicular line,500HP/doubleATKSPD/8EXP and185s expiry.');

// Entire event sprites must start outside the visible screen, even after camera motion.
run('var viewport={x:100,y:200,width:1280,height:720};var border=ringSpawnPoints({x:740,y:560},100,1).map(p=>offscreenEventPoint(p,viewport,120))');
assert.equal(run('border.every(p=>p.x+60<viewport.x||p.x-60>viewport.x+viewport.width||p.y+60<viewport.y||p.y-60>viewport.y+viewport.height)'),true);
assert.equal(run('border.some(p=>p.x<viewport.x)&&border.some(p=>p.x>viewport.x+viewport.width)&&border.some(p=>p.y<viewport.y)&&border.some(p=>p.y>viewport.y+viewport.height)'),true);
assert.equal(run('offscreenEventPoint({x:740,y:560},viewport,120).x'),1464);

// Circular groups include a center and occupy the disk instead of square-grid corners.
run('var disk=clusterSpawnPoints({x:50,y:60},20,30);var radius=30*Math.sqrt(19)/2');
assert.equal(run('disk.length'),20);
assert.equal(run('disk.every(p=>Math.hypot(p.x-50,p.y-60)<=radius+1e-9)'),true);
assert.equal(run('disk.filter(p=>Math.hypot(p.x-50,p.y-60)<radius/2).length')>=4,true);
