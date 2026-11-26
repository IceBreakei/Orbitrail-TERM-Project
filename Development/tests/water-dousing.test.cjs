const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const enemies=new Map(),hits=[];
const c=vm.createContext({getAllEnemies:()=>[...enemies.values()],getEnemy:id=>enemies.get(id),damageEnemy:(id,damage)=>{hits.push({id,damage});return true},ensureCombatStats:p=>p.combatStats,stationaryWeaponIntervalScale:()=>1,totalWeaponDamage:(p,id,base,bonuses)=>base*bonuses.reduce((a,b)=>a*(1+b/100),1),rollAttackDamage:(p,damage)=>({damage,type:'normal'})});
for(const name of ['game-config','item-catalog','combat-hitboxes','knockback','slowdown-tuning','water-dousing'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
c.getCombatHitbox=p=>({x:p.x,y:p.y,rx:10,ry:10});c.getEnemyHurtbox=e=>({...e,rx:5,ry:5,shape:'ellipse'});const run=s=>vm.runInContext(s,c);
assert(fs.existsSync('sprites/attacks/Event 46 - Swimming Tube.png'));assert.equal(run('createWaterDousingWeapon().attackType'),'Melee');assert.equal(run('createWaterDousingWeapon().weight'),3);
for(const [level,radius,interval,damage,kb,root] of [[1,144,2,1.1,300,0],[2,144,2,1.32,300,0],[3,187.2,2,1.32,300,0],[4,187.2,2,1.32,480,0],[5,187.2,1.6,1.32,480,0],[6,187.2,1.6,1.716,480,0],[7,243.36,1.6,1.716,480,.25]]){const s=run(`waterDousingLevelStats(${level})`);assert(Math.abs(s.radius-radius)<1e-8);assert.equal(s.interval,interval);assert(Math.abs(1.1*s.damageBonuses.reduce((a,b)=>a*(1+b/100),1)-damage)<1e-8);assert.equal(s.knockbackSpeed,kb);assert.equal(s.rootSeconds,root);}
run("var p={x:0,y:0,attackSlots:[createWaterDousingWeapon()],equipmentSlots:[],combatStats:{hastePercent:0}},a=createWaterDousingAttack({random:()=>.5})");
enemies.set('front',{id:'front',x:80,y:0,hp:100});enemies.set('back',{id:'back',x:-80,y:0,hp:100});enemies.set('side',{id:'side',x:0,y:80,hp:100});enemies.set('immune',{id:'immune',x:100,y:0,hp:100,knockbackImmune:true});
run('a.update(.01,p,0)');assert.deepEqual(hits.map(h=>h.id),['front','immune']);assert(enemies.get('front').skillKnockback);assert(!enemies.get('immune').skillKnockback);assert.equal(enemies.get('front').stunRemaining,undefined);
hits.length=0;run('p.attackSlots[0].level=7;a.reset();a.update(.01,p,Math.PI)');assert.deepEqual(hits.map(h=>h.id),['back']);c.enemy=enemies.get('back');run('updateSlowdown(enemy,10/60);');assert.equal(run('slowdownMultiplier(enemy)'),0);assert.equal(run('enemy.stunRemaining'),undefined);assert.equal(run('enemy.frozenRemaining'),undefined);run('updateSlowdown(enemy,.25)');assert.equal(run('slowdownMultiplier(enemy)'),1);
run('a.reset();a.update(3.21,p,0)');assert.equal(run('a.shotsFired'),3);run('a.setAutoattackEnabled(false);a.update(10,p,0)');assert.equal(run('a.shotsFired'),3);
run("configureItemUnlocks(null,'test');unlockStageClearRewards({equipmentSlots:[],attackSlots:[]})");assert(!run("isContentUnlocked('water-dousing')"));run('unlockStageClearRewards({equipmentSlots:[createSportsDrink()],attackSlots:[]})');assert(run("isContentUnlocked('water-dousing')"));assert(run("isContentUnlocked('achievement:soaking')"));
console.log('PASS Water Dousing levels, aimed cone/front-back collision, all-target damage, immunity-aware knockback, movement-only MAX hold, cadence, disable and Sports Drink clear unlock');
// Real reward and Crafter paths: locked first, then level normally and enhance at MAX.
const rewards=vm.createContext({showDamageNumber(){},getLootTotals:()=>({credits:10000,secretTechNotes:0}),spendCredits:()=>true,spendSecretTechNotes:()=>false});
for(const name of ['game-config','item-catalog','combat-stats','player-stats','weapon-progression','firing-rings','aris-weapon','luminous-nova','weapon-max-order','upgrade-label','level-upgrades','crafter-rules'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ','').replaceAll('import.meta.url',"'file:///Development/aris-weapon.js'"),rewards);
const rr=s=>vm.runInContext(s,rewards);rr("configureItemUnlocks(null,'new');var p={label:'Plana',attackSlots:[],equipmentSlots:[createSportsDrink()],pendingUpgrades:10};ensurePlayerStats(p)");assert(!rr("rollLevelUpgrades(p,{all:true}).some(c=>c.id==='water-new')"));rr('unlockStageClearRewards(p)');assert(rr("applyLevelUpgrade(p,'water-new')"));for(let level=2;level<=7;level++){assert(rr("applyLevelUpgrade(p,'water-level')"));assert.equal(rr('p.attackSlots[0].level'),level);}assert(!rr("rollLevelUpgrades(p,{all:true}).some(c=>c.id==='water-level')"));assert(rr("crafterChoices(p).some(c=>c.id==='weapon:0:enhance')"));
console.log('PASS Water Dousing unlock gating, acquisition, LV1 through MAX upgrade choices and Crafter enhancement');
// Sequential water emission: older droplets lead, and later droplets remain near the origin.
run('var stream={x:10,y:20,angle:0,radius:144,age:.2},drops=waterStreamDroplets(stream)');
assert.equal(run('drops.length'),30);assert(run('drops[0].distance>drops[drops.length-1].distance*3'));assert(run('drops[0].angle<0&&drops[drops.length-1].angle>0'));assert(run('Math.abs(drops[0].y-20)>Math.abs(drops[drops.length-1].y-20)'));
assert(run('waterStreamDroplets({...stream,age:.05}).length<30'));assert.equal(run('waterStreamDroplets({...stream,age:.54}).length'),0);
const strokes=[],fills=[];c.ctx={save(){},restore(){},translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes.push(1)},ellipse(){},fill(){fills.push(1)},bezierCurveTo(){}};
run('p.attackSlots=[createWaterDousingWeapon()];a.reset();a.setAutoattackEnabled(true);a.update(.2,p,0);a.draw(ctx,{x:0,y:0})');assert(strokes.length>0&&fills.length>0,'Draws a narrow stream and individual water droplets without a filled sector');
console.log('PASS progressive water release, outward age ordering, curved swing, finite droplet lifetime and stream rendering');

// Player movement carries the active sweep without restarting its droplet ages or curve.
const placements=[];c.ctx.translate=(x,y)=>placements.push([x,y]);
run('p.x=0;p.y=0;a.draw(ctx,{x:0,y:0})');const before=placements.slice();placements.length=0;
run('p.x=180;p.y=-65;a.draw(ctx,{x:0,y:0})');assert.equal(placements.length,before.length);assert(before.length>0);
for(let i=0;i<before.length;i++){assert(Math.abs(placements[i][0]-before[i][0]-180)<1e-8);assert(Math.abs(placements[i][1]-before[i][1]+65)<1e-8);}
console.log('PASS active curved water sweep follows player displacement without resetting emission');

assert.equal(run('createWaterDousingWeapon().name'),'Splash!');
