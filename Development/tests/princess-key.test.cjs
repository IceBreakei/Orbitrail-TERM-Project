const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const enemies=new Map(),hits=[],knocks=[];
const c=vm.createContext({getAllEnemies:()=>[...enemies.values()],getEnemy:id=>enemies.get(id),damageEnemy:(id,damage,p,type)=>{hits.push({id,damage,type});return damage},applySkillControl:(...args)=>knocks.push(args)});
for(const name of ['game-config','item-catalog','combat-stats','combat-hitboxes','luminous-nova','enemy-spatial-index','princess-key','synergy-recipes','golden-crafter-rules'])vm.runInContext(fs.readFileSync('Development/'+name+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
vm.runInContext('const settings=princessKeySettings',c);
const run=s=>vm.runInContext(s,c);
run('var player={label:"Plana",x:0,y:0,level:1,combatStats:{hastePercent:500},attackSlots:[{id:"princess-key",level:1,maxLevel:1}]};var attack=createPrincessKeyAttack({random:()=>0})');
run('attack.update(1,player,0)');assert.equal(run('attack.shotsFired'),80);assert(run('attack.projectileCount')<=80);
run('attack.reset();for(let i=0;i<100;i++)attack.update(.01,player,0)');assert.equal(run('attack.shotsFired'),80);
assert.equal(run('rollAttackDamage(player,.5,()=>0).damage'),3);assert.equal(run('rollAttackDamage(player,.5,()=>1).damage'),7);
for(let i=0;i<8;i++)enemies.set(String(i),{id:String(i),type:'mob',x:55+i*5,y:0,spriteSize:20});
run('attack.reset();attack.update(.049,player,Math.PI/30)');assert(hits.length>0);assert(hits.length<=16);assert.equal(knocks[0][3],.05);assert(Math.abs(Math.hypot(knocks[0][1],knocks[0][2])-3)<1e-8);
run('attack.setAutoattackEnabled(false);attack.update(1,player,0)');assert.equal(run('attack.projectileCount'),0);
run('player.attackSlots=[{id:"aris-laser",level:7},{id:"luminous-nova",level:7,maxLevel:7}]');assert.equal(run('goldenCrafterChoices(player).length'),1);
assert(run('applyGoldenCrafterChoice(player,goldenCrafterChoices(player)[0].id).success'));assert.equal(run('player.attackSlots[0].id'),'princess-key');assert.equal(run('player.attackSlots[1]'),null);assert(run('player.attackSlots[0].exSkill'));
console.log('PASS: live fusion, 80 bullets/s independent of Haste/frame step, 3-7 damage, four-hit limit, small knockback, lifetime and autoattack disable.');


// One round at a time, rather than four simultaneous projectiles.
enemies.clear();
run('player.attackSlots=[{id:"princess-key",level:1}];var stagger=createPrincessKeyAttack({random:()=>.5});stagger.update(.001,player,0)');
assert.equal(run('stagger.shotsFired'),1);
run('stagger.update(.012,player,0)');assert.equal(run('stagger.shotsFired'),2);
// A visible target beyond the old 300px lifetime remains reachable.
enemies.set('edge',{id:'edge',type:'mob',x:1000,y:0,spriteSize:20});hits.length=0;
run('var ranged=createPrincessKeyAttack({random:()=>.5});ranged.update(1.2,player,0,{x:0,y:-360,width:1280,height:720})');
assert(hits.some(hit=>hit.id==='edge'));
console.log('PASS: staggered single rounds and viewport-edge range beyond the original lifetime.');

// Head can leave first: retain the projectile until its complete trail and bloom clear.
run('var view={x:0,y:0,width:1280,height:720}');
assert(!run('princessBulletOffscreen({x:1300,y:360,angle:0,age:2},view)'));
assert(run('princessBulletOffscreen({x:1450,y:360,angle:0,age:2},view)'));
assert(!run('princessBulletOffscreen({x:-20,y:360,angle:Math.PI,age:2},view)'));
assert(run('princessBulletOffscreen({x:-170,y:360,angle:Math.PI,age:2},view)'));
assert(!run('princessBulletOffscreen({x:640,y:740,angle:Math.PI/2,age:2},view)'));
assert(run('princessBulletOffscreen({x:640,y:890,angle:Math.PI/2,age:2},view)'));
assert(!run('princessBulletOffscreen({x:1450,y:360,angle:0,age:2},{...view,x:500})'));
console.log('PASS: full bloom/tail offscreen cleanup on both axes and moving cameras.');


enemies.clear();run('var exSpray=createPrincessKeyAttack({random:()=>.5});exSpray.update(.1,player,0)');
const before=run('exSpray.projectileCount');assert(before>0);
run('exSpray.setExMode(true,false)');assert.equal(run('exSpray.projectileCount'),before,'Existing rounds survive EX start');
const initialShots=run('exSpray.shotsFired');
run('exSpray.update(1,player,0)');assert.equal(run('exSpray.shotsFired')-initialShots,80,'Windup retains normal80/s firing');
const beforeBeam=run('exSpray.projectileCount');run('exSpray.setExMode(true,true)');assert.equal(run('exSpray.projectileCount'),beforeBeam);
const startBeamShots=run('exSpray.shotsFired');run('exSpray.update(1,player,0)');assert.equal(run('exSpray.shotsFired')-startBeamShots,60,'Blue spray begins only when laser fires');
const during=run('exSpray.projectileCount');run('exSpray.setExMode(false,false)');assert.equal(run('exSpray.projectileCount'),during,'EX rounds survive return to normal');
const exShots=run('exSpray.shotsFired');run('exSpray.update(1,player,0)');assert.equal(run('exSpray.shotsFired')-exShots,80);
assert.equal(run('settings.exSpreadMultiplier'),4.394);
console.log('PASS: continuous spray and in-flight rounds persist through EX start/end, with60/s EX and80/s normal cadence.');

enemies.clear();hits.length=0;
for(let i=0;i<8;i++)enemies.set('pierce'+i,{id:'pierce'+i,type:'mob',x:60+i*.1,y:0,spriteSize:20});
run('var pierce=createPrincessKeyAttack({random:()=>.5});pierce.update(.049,player,0)');
assert.equal(new Set(hits.map(hit=>hit.id)).size,4,'Normal rounds keep four-hit limit');
hits.length=0;run('pierce.reset();pierce.setExMode(true,true);pierce.update(.049,player,0)');
assert.equal(new Set(hits.map(hit=>hit.id)).size,8,'Blue EX rounds pierce all targets');
assert(run('pierce.projectileCount')>0,'Blue rounds are not consumed by four hits');
console.log('PASS: blue EX rounds have unlimited pierce; normal rounds retain four-hit cap.');


// Decagrammaton reuses this EX emitter: only its cone center follows an enemy.
enemies.clear();
enemies.set('tracked',{id:'tracked',type:'mob',x:0,y:250,spriteSize:20});
run('var decPlayer={...player,attackSlots:[{id:"decagrammaton",level:1,enhancementRank:2}]};var decSpray=createPrincessKeyAttack({random:()=>.5});var exDrawn=[];drawLuminousPlasma=(context,camera,bullet)=>exDrawn.push({...bullet});');
run('decSpray.update(.05,decPlayer,0);decSpray.draw({},{});');assert.equal(run('exDrawn.length'),0,'Decagrammaton must not gain Princess/Key normal shots');
run('decSpray.setExMode(true,false);decSpray.update(.05,decPlayer,0)');assert.equal(run('decSpray.shotsFired'),0,'Windup keeps Decagrammaton normal attack, not duplicate EX fire');
run('decSpray.setExMode(true,true);decSpray.update(.001,decPlayer,0);exDrawn=[];decSpray.draw({},{});');
assert.equal(run('exDrawn.length'),1);
const toward=run('(()=>{const target=getEnemyHurtbox(getEnemy("tracked")),body=getCombatHitbox(decPlayer,false);return Math.atan2(target.y-body.y,target.x-body.x)})()');
assert(Math.abs(run('exDrawn[0].angle')-toward)<1e-8,'Cone center points at visible enemy rather than cursor aim');
assert.equal(run('exDrawn[0].color'),'blue');assert.equal(run('exDrawn[0].pierceLimit'),Infinity);
const firstAngle=run('exDrawn[0].angle');
enemies.get('tracked').x=200;enemies.get('tracked').y=200;
run('decSpray.update(.04,decPlayer,0);exDrawn=[];decSpray.draw({},{});');
assert.equal(run('exDrawn[0].angle'),firstAngle,'Live bullets keep straight trajectories when target moves');
assert(run('exDrawn.some(b=>Math.abs(b.angle-exDrawn[0].angle)>.1)'),'New shots update the cone direction as enemy moves');
run('var decCadence=createPrincessKeyAttack({random:()=>.5});decCadence.setExMode(true,true);decCadence.update(1,decPlayer,0,{x:-1000,y:-1000,width:2000,height:2000})');
assert.equal(run('decCadence.shotsFired'),60,'Same EX cadence as Princess/Key');
const beforeEnd=run('decCadence.shotsFired');run('decCadence.setExMode(false,false);decCadence.update(.1,decPlayer,0)');assert.equal(run('decCadence.shotsFired'),beforeEnd,'Dec EX emitter stops adding rounds when spray ends');
// The original weapon still centers the identical cone on player aim even near an enemy.
run('var originalAim=createPrincessKeyAttack({random:()=>.5});originalAim.setExMode(true,true);originalAim.update(.001,player,0);exDrawn=[];originalAim.draw({},{});');assert.equal(run('exDrawn[0].angle'),0);
run('var coneEdge=createPrincessKeyAttack({random:()=>0});coneEdge.setExMode(true,true);coneEdge.update(.001,decPlayer,0);exDrawn=[];coneEdge.draw({},{});');
const newToward=run('(()=>{const target=getEnemyHurtbox(getEnemy("tracked")),body=getCombatHitbox(decPlayer,false);return Math.atan2(target.y-body.y,target.x-body.x)})()');
assert(Math.abs(run('exDrawn[0].angle')-newToward+run('settings.spreadRadians*settings.exSpreadMultiplier/2'))<1e-8,'Tracking rotates the existing cone without narrowing or widening it');
// Offscreen targets do not steer the EX cone.
enemies.clear();enemies.set('outside',{id:'outside',type:'mob',x:0,y:2000,spriteSize:20});
run('var fallback=createPrincessKeyAttack({random:()=>.5});fallback.setExMode(true,true);fallback.update(.001,decPlayer,.3,{x:-400,y:-300,width:800,height:600});exDrawn=[];fallback.draw({},{});');assert.equal(run('exDrawn[0].angle'),.3);
console.log('PASS Dec EX: same60/s straight blue cone and pierce; emitter tracks visible enemy, original weapon keeps manual aim, no normal duplicate rounds.');

// Keep the intended aimed target when other enemies are visible, then use the closer tie.
enemies.clear();enemies.set('near-axis',{id:'near-axis',type:'mob',x:120,y:40,spriteSize:20});enemies.set('off-axis',{id:'off-axis',type:'mob',x:0,y:100,spriteSize:20});
run('var aimedChoice=createPrincessKeyAttack({random:()=>.5});aimedChoice.setExMode(true,true);aimedChoice.update(.001,decPlayer,0);exDrawn=[];aimedChoice.draw({},{});');
const aimExpected=run('(()=>{const t=getEnemyHurtbox(getEnemy("near-axis")),b=getCombatHitbox(decPlayer,false);return Math.atan2(t.y-b.y,t.x-b.x)})()');assert(Math.abs(run('exDrawn[0].angle')-aimExpected)<1e-8);
// Existing weapon enhancements are looked up from Decagrammaton, rather than consumed Princess/Key.
enemies.clear();enemies.set('contact',{id:'contact',type:'mob',x:60,y:0,spriteSize:20});
run('var damageWeaponIds=[];var originalTotalWeaponDamage=totalWeaponDamage;totalWeaponDamage=(...args)=>{damageWeaponIds.push(args[1]);return originalTotalWeaponDamage(...args)};var enhancedEx=createPrincessKeyAttack({random:()=>.5});enhancedEx.setExMode(true,true);enhancedEx.update(.05,decPlayer,0);');
assert(run('damageWeaponIds.length')>0);assert(run('damageWeaponIds.every(id=>id==="decagrammaton")'));
console.log('PASS tracked cone selects an aimed visible target and resolves damage enhancements from Decagrammaton.');
