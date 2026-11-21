const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const enemies=new Map(),hits=[],draws=[];const c=vm.createContext({getAllEnemies:()=>[...enemies.values()],getCombatHitbox:p=>({x:p.x,y:p.y}),getEnemyHurtbox:e=>({...e,rx:5,ry:5}),damageEnemy:(...a)=>hits.push(a),totalWeaponDamage:(p,id,base,bonuses)=>base*bonuses.reduce((a,b)=>a*(1+b/100),1),rollAttackDamage:(p,damage)=>({damage,type:'normal'}),ensureCombatStats:p=>p.combatStats,stationaryWeaponIntervalScale:()=>1,molotovAnimationReady:Promise.resolve(),drawMolotovNapalm:(ctx,camera,zone)=>draws.push({...zone})});
for(const file of ['game-config','molotov-cocktail'])vm.runInContext(fs.readFileSync(`Development/${file}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var p={x:0,y:0,attackSlots:[createMolotovWeapon()],combatStats:{hastePercent:0}},a=createMolotovAttack({random:()=>.5})');
enemies.set('target',{id:'target',x:180,y:0,hp:100});enemies.set('near',{id:'near',x:185,y:0,hp:100});enemies.set('far',{id:'far',x:1000,y:0,hp:100});
run('a.update(.1,p,{x:-100,y:-100,width:400,height:200})');assert.equal(run('a.projectileCount'),1);assert.equal(run('a.fireCount'),0);assert.equal(hits.length,0);
run('a.update(.43,p)');assert.equal(run('a.fireCount'),1);assert.equal(hits.length,2);assert.equal(hits[0][1],.8);
run('a.update(.7,p)');assert.equal(hits.length,2);run('a.update(.06,p)');assert.equal(hits.length,4);
run('p.x=1000;a.drawGround({},{})');assert.equal(draws[0].x,180,'Ground fire stays at nearest mid-range enemy impact');
run('a.setAutoattackEnabled(false);a.update(3,p)');assert.equal(run('a.fireCount'),0);
assert.equal(run('molotovLevelStats(3).count'),2);assert.equal(run('molotovLevelStats(6).count'),3);assert.equal(run('molotovLevelStats(7).count'),4);assert.equal(run('molotovLevelStats(4).duration'),4);
run('p.attackSlots[0].level=7;a.reset();a.setAutoattackEnabled(true);a.update(.6,p)');assert.equal(run('a.shotsFired'),4);
assert.equal(run('createMolotovWeapon().weight'),3);assert.equal(run('createMolotovWeapon().attackType'),'Multishot');assert.equal(run('createMolotovWeapon().defaultUnlocked'),true);
for(const file of ['movement','movement-optimized']){const s=fs.readFileSync(`Development/${file}.js`,'utf8');assert(s.indexOf('molotovAttack?.drawGround')>s.indexOf('  drawPlayarea();'));assert(s.indexOf('molotovAttack?.drawGround')<s.indexOf('  expPickups?.draw'));assert(s.includes('molotovAttack.ready'));}
console.log('PASS Molotov flight/impact, fixed ground fire, area targets, tick cadence, expiration, multishot levels, default unlock, weight and low-Z integration.');


assert.equal(run('createMolotovWeapon().icon'),'../sprites/attacks/Event 41 - Dakimakura.png');assert(fs.existsSync('sprites/attacks/Event 41 - Dakimakura.png'));

// Free throws may land beyond a screen edge, without losing their full fire lifetime.
enemies.clear();run('p.x=0;p.attackSlots[0].level=1;var edgeAttack=createMolotovAttack({random:()=>.99});edgeAttack.update(.001,p,{x:-100,y:-100,width:200,height:200});edgeAttack.setAutoattackEnabled(false)');
assert.equal(run('edgeAttack.projectileCount'),1);
run('edgeAttack.update(1,p,{x:-100,y:-100,width:200,height:200});edgeAttack.drawGround({},{})');
assert(draws.at(-1).x>100||draws.at(-1).y>100,'Landing may be temporarily offscreen');
assert.equal(draws.at(-1).duration,3,'Flight time does not consume ground fire duration');
run('edgeAttack.update(3,p)');assert.equal(run('edgeAttack.fireCount'),0);
console.log('PASS viewport-wide/offscreen throws persist to impact with independent ground lifetime.');

const bins={close:0,middle:0,far:0};
for(let i=0;i<10000;i++){c.u=(i+.5)/10000;const distance=run('molotovThrowDistance(()=>u)');assert(distance>=.05&&distance<=1);bins[distance<.3?'close':distance>.8?'far':'middle']++;}
assert(bins.middle>bins.close&&bins.close>bins.far,JSON.stringify(bins));
console.log('PASS weighted throw range: middle most common, close moderate, furthest rare: '+JSON.stringify(bins));

const body={x:0,y:0},view={x:-100,y:-100,width:400,height:200};
c.body=body;c.view=view;c.targets=[{id:'too-close',x:15,y:0},{id:'mid-far',x:240,y:0},{id:'mid-near',x:180,y:0},{id:'out',x:1000,y:0}];
assert.equal(run('molotovLandingPoint(body,view,targets,()=>.99).x'),180,'Nearest eligible midrange enemy takes priority over random range');
c.targets=c.targets.filter(e=>e.id!=='mid-near');assert.equal(run('molotovLandingPoint(body,view,targets,()=>.01).x'),240);
c.targets=[];const empty=run('molotovLandingPoint(body,view,targets,()=>.5)');c.targets=[{id:'too-close',x:15,y:0}];const noMid=run('molotovLandingPoint(body,view,targets,()=>.5)');assert.equal(noMid.x,empty.x);assert.equal(noMid.y,empty.y);
console.log('PASS nearest mid-range enemy targeting; no eligible enemy falls back to weighted random landing.');

assert.equal(run('molotovLevelStats(4).radius'),108);
assert.equal(run('molotovLevelStats(7).radius'),129.6);
assert.equal(run('molotovLevelStats(7).radius/molotovLevelStats(4).radius'),1.2);
console.log('PASS larger reference footprint: level4 diameter216px; MAX diameter259.2px.');

const fallbackBands={close:0,middle:0,far:0};
for(let i=0;i<10000;i++){c.u=(i+.5)/10000;const fraction=run('molotovThrowDistance(()=>u)');fallbackBands[fraction<.3?'close':fraction<.7?'middle':'far']++;}
assert.deepEqual(fallbackBands,{close:3000,middle:6000,far:1000});
// Exercise the real no-enemy four-bottle volley, not just the distance helper.
enemies.clear();run('p.x=0;p.y=0;p.attackSlots[0].level=7;var seed=123;var varying=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};var randomVolley=createMolotovAttack({random:varying});randomVolley.update(.001,p,{x:-100,y:-100,width:200,height:200});randomVolley.setAutoattackEnabled(false);randomVolley.update(1,p);');
draws.length=0;run('randomVolley.drawGround({},{})');assert.equal(draws.length,4);
assert.equal(new Set(draws.map(z=>`${z.x.toFixed(3)},${z.y.toFixed(3)}`)).size,4,'Each bottle rolls its own random landing');
const distances=draws.map(z=>Math.hypot(z.x,z.y));assert(Math.min(...distances)<65,'No-enemy volley includes a closer landing rather than all maximum range');assert(Math.max(...distances)-Math.min(...distances)>20,'No-enemy volley varies distance');
console.log('PASS explicit 30/60/10 fallback bands and independently randomized no-enemy multishot landings.');
