const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const enemies=new Map(),hits=[];
const c=vm.createContext({getAllEnemies:()=>[...enemies.values()],getEnemy:id=>enemies.get(id),damageEnemy:(id,damage)=>{hits.push({id,damage});return true},ensureCombatStats:p=>p.combatStats,stationaryWeaponIntervalScale:()=>1,startingWeaponProjectileCount:(p,id,count)=>count,totalWeaponDamage:(p,id,base,bonuses)=>base*bonuses.reduce((a,b)=>a*(1+b/100),1),rollAttackDamage:(p,damage)=>({damage,type:'normal'})});
for(const name of ['game-config','combat-hitboxes','enemy-spatial-index','saint-predator'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
c.getCombatHitbox=p=>({x:p.x,y:p.y,rx:10,ry:10});c.getEnemyHurtbox=e=>({...e,rx:5,ry:5,shape:'ellipse'});
const run=s=>vm.runInContext(s,c);
run('var p={x:0,y:0,attackSlots:[createSaintPredatorWeapon()],combatStats:{hastePercent:0}},attack=createSaintPredatorAttack({random:()=>0})');
assert.equal(run('createSaintPredatorWeapon().weight'),2);assert.equal(run('createSaintPredatorWeapon().attackType'),'Multishot');assert(fs.existsSync('sprites/attacks/Misaki_UE.png'));
for(const [level,count,interval,speed,damage] of [[1,1,.5,240,1],[2,1,.5,240,1.2],[3,2,.5,240,1.2],[4,2,.335,240,1.2],[5,2,.335,300,1.44],[6,2,.1675,300,1.44],[7,4,.1675,300,1.44]]){
 const stats=run(`saintPredatorLevelStats(${level})`);assert.equal(stats.count,count);assert(Math.abs(stats.interval-interval)<1e-10);assert.equal(stats.speed,speed);assert(Math.abs(stats.damageBonuses.reduce((v,b)=>v*(1+b/100),1)-damage)<1e-10);
}
enemies.set('near',{id:'near',x:100,y:0});enemies.set('far',{id:'far',x:130,y:0});
run('attack.update(.45,p)');assert.equal(hits.length,1);assert.equal(hits[0].id,'near');assert.equal(hits[0].damage,1);assert.equal(run('attack.projectileCount'),0);
enemies.clear();run('attack.reset();attack.update(.01,p);attack.setAutoattackEnabled(false);attack.update(.2,p)');assert.equal(run('attack.projectileCount'),1);run('attack.update(1.4,p)');assert.equal(run('attack.projectileCount'),0);
run('attack.reset();attack.setAutoattackEnabled(true);attack.update(1,p)');assert.equal(run('attack.shotsFired'),2);
run('attack.reset();for(let i=0;i<100;i++)attack.update(.01,p)');assert.equal(run('attack.shotsFired'),2);
run('p.attackSlots[0].level=7;attack.reset();attack.update(.001,p)');assert.equal(run('attack.shotsFired'),4);
// Real render transform and spawn positions scale with Racer Pass.
const positions=[],scales=[];c.ctx={save(){},restore(){},translate(x,y){positions.push([x,y])},rotate(){},scale(x,y){scales.push([x,y])},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},fillRect(){}};
run('p.attackSlots[0].level=1;p.equipmentSlots=[{id:"racer-pass",level:1}];attack.reset();attack.update(.1,p);attack.draw(ctx,{x:0,y:0})');assert(Math.abs(scales[0][0]-.99)<1e-10);assert(Math.abs(positions[0][0]-(10+Math.hypot(22,10)/2*.99+3+24))<1e-9);
run('p.attackSlots=[];attack.update(.1,p)');assert.equal(run('attack.projectileCount'),0);
console.log('PASS Saint Predator levels, damage/cadence/speed/count, one-hit collision, lifetime, frame-step parity, Racer Pass geometry and removal.');

assert.equal(run('createSaintPredatorWeapon().iconRotation'),45);assert.equal(run('createSaintPredatorWeapon().iconCrop.width'),520);

assert.equal(run('createSaintPredatorWeapon().iconFlipX'),true);
