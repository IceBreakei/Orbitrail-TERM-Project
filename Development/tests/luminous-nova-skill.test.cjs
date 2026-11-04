const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');let damageListener;const enemies=new Map(),hits=[];
const c=vm.createContext({Image:class{constructor(){this.naturalWidth=958;this.naturalHeight=246}decode(){return Promise.resolve()}},onEnemyDamage:fn=>{damageListener=fn;return ()=>{damageListener=null}},getAllEnemies:()=>[...enemies.values()],getEnemy:id=>enemies.get(id),damageEnemy:(id,damage,source,type)=>{hits.push({id,damage,type});return true},applySkillControl(){}});
for(const name of ['game-config','combat-stats','combat-hitboxes','luminous-nova','firing-rings','luminous-nova-skill'])vm.runInContext(fs.readFileSync('Development/'+name+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
vm.runInContext('var skill=luminousNovaSkillSettings',c);
const run=s=>vm.runInContext(s,c);
run('var player={label:"Plana",x:0,y:0,level:1,attackSlots:[createLuminousNovaWeapon()],combatStats:{}};var ex=createLuminousNovaSkill({random:()=>.5});ex.cast(player,0)');
assert.equal(run('rollAttackDamage(player,1,()=>.5).damage'),15);assert(run('rollAttackDamage(player,1,()=>.2).critical'));
assert.equal(run('player.combatBuffs["luminous-nova-ex"].critPercent'),22.3);
damageListener({source:{},damage:99999});assert.equal(run('ex.damageDealt'),0);
c.owner=run('player');damageListener({source:c.owner,damage:2000});assert.equal(run('ex.damageDealt'),2000);
run('ex.update(24.99,player)');assert.equal(run('ex.phase'),'aura');
run('ex.update(.01,player)');assert.equal(run('ex.phase'),'opening');assert.equal(run('ex.finisherDamage'),200);
assert.equal(run('player.combatBuffs["luminous-nova-ex"]'),undefined);assert(!run('rollAttackDamage(player,1,()=>.2).critical'));
damageListener({source:c.owner,damage:99999});assert.equal(run('ex.damageDealt'),2000);
run('ex.update(skill.openingSeconds,player)');assert.equal(run('ex.phase'),'charge');
enemies.set('target',{id:'target',type:'mob',x:300,y:-.4,hp:10000,spriteSize:10});
run('ex.update(skill.chargeSeconds,player)');assert.equal(run('ex.phase'),'firing');
run('ex.update(.4,player)');assert.equal(hits.length,1);assert.equal(hits[0].damage,28);run('ex.update(.1,player)');assert.equal(hits.length,1);
run('ex.update(2.5,player)');assert.equal(run('ex.active'),false);
assert.equal(run('luminousNovaFinisherDamage(100000,player)'),500);
run('player.combatStats.atkPercent=100');assert.equal(run('luminousNovaFinisherDamage(100000,player)'),1000);
run('player.combatBuffs.other={damageBonusMultiplier:1.2,critPercent:5};ex.cast(player,0);ex.reset()');assert.equal(run('player.combatBuffs.other.critPercent'),5);
run('ex.cast(player,0);ex.update(1,{...player})');assert.equal(run('ex.active'),false);assert.equal(run('player.combatBuffs["luminous-nova-ex"]'),undefined);
run('ex.cast(player,0);ex.cast(player,0)');assert.equal(run('Object.keys(player.combatBuffs).length'),2);
run('ex.dispose()');assert.equal(damageListener,null);
console.log('PASS: 25s damage/crit buff, source-specific HP bank, exact finisher/cap, opening/charge, one hit per target, cleanup and no stacking.');

// Exercise aura, emergence, charging and large-plasma drawing with finite geometry.
let saves=0,restores=0,arcs=0;
const check=(...values)=>{for(const value of values)if(typeof value==='number')assert(Number.isFinite(value))};
const gradient=(...values)=>{check(...values);return {addColorStop(){}}};
c.renderContext={save(){saves++},restore(){restores++},translate:check,rotate:check,beginPath(){},stroke(){},arc(...values){check(...values);arcs++},fill(){},moveTo:check,lineTo:check,bezierCurveTo:check,drawImage:check,createRadialGradient:gradient,createLinearGradient:gradient};
run('var renderEx=createLuminousNovaSkill({random:()=>.5});renderEx.cast(player,0);renderEx.update(.2,player);renderEx.draw(renderContext,{x:0,y:0});renderEx.update(24.8,player);renderEx.update(.16,player);renderEx.draw(renderContext,{x:0,y:0});renderEx.update(.176,player);renderEx.draw(renderContext,{x:0,y:0});renderEx.update(.9,player);renderEx.draw(renderContext,{x:0,y:0});renderEx.dispose()');
assert.equal(saves,restores);assert(arcs>=4);


// Stored damage is a noncritical radial burst; the aimed bullet independently pierces every target.
enemies.clear();hits.length=0;
for(const [id,x,y,hp] of [['near',100,0,100],['behind',-150,0,100],['down-near',0,200,100],['down-far',0,600,100],['highest',600,0,999999]])enemies.set(id,{id,type:'mob',x,y,hp,spriteSize:20});
run('var aimedAngle=0;var split=createLuminousNovaSkill({random:()=>.5});player.combatStats.atkPercent=0;player.combatStats.critPercent=100;split.cast(player,0,()=>aimedAngle)');
damageListener({source:c.owner,damage:2000});run('split.update(25,player)');
assert.deepEqual(new Set(hits.map(hit=>hit.id)),new Set(['near','behind','down-near']));
assert(hits.every(hit=>hit.damage===200&&hit.type==='normal'));
hits.length=0;run('split.update(skill.openingSeconds,player);aimedAngle=Math.PI/2;split.update(skill.chargeSeconds,player);aimedAngle=0;split.update(.6,player)');
assert.deepEqual(new Set(hits.map(hit=>hit.id)),new Set(['down-near','down-far']));
assert(hits.every(hit=>hit.type==='critical'));assert.equal(hits.length,2);
run('split.update(.5,player)');assert.equal(hits.length,2);
run('split.dispose()');
console.log('PASS: player-centered noncritical stored-charge AoE; aim locks at launch; unlimited piercing without homing or repeat hits.');
