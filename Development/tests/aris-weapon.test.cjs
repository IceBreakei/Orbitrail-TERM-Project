const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const enemies=new Map(),hits=[],knocks=[];
const c=vm.createContext({URL,Image:class{decode(){return Promise.resolve()}},
 getAllEnemies:()=>[...enemies.values()],getEnemy:id=>enemies.get(id),
 damageEnemy(id,damage,source,type){hits.push({id,damage,type});return enemies.get(id)},
 applySkillControl(...args){knocks.push(args)}});
for(const name of ['game-config','combat-stats','combat-hitboxes','firing-rings','aris-weapon'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ','').replaceAll('import.meta.url',"'file:///Development/aris-weapon.js'"),c);
const run=s=>vm.runInContext(s,c);
run('var weapon=createArisWeapon();var player={x:0,y:0,attackSlots:[weapon],combatStats:{atkPercent:0,critPercent:0}};var attack=createArisAttack();');
assert.equal(run('rollArisDamage(player,()=>0).damage'),27);
assert.equal(run('rollArisDamage(player,()=>1).damage'),33);
for(const [level,interval,size,damage,beams] of [[1,3,1,1,1],[2,3,1.3,1,1],[3,2.5,1.3,1,1],[4,2.5,1.3,1.5,1],[5,2,1.3,1.5,1],[6,2,1.8,1.5,1],[7,2,1.8,1.5,2]]){
 run(`weapon.level=${level}`);const stats=run('arisLevelStats(player)');
 assert.equal(stats.interval,interval);assert.equal(stats.size,size);assert.equal(stats.damage,damage);assert.equal(stats.beams,beams);
}
run('weapon.level=1');
for(let i=0;i<20;i++)enemies.set('front'+i,{id:'front'+i,type:'mob',x:100+i*60,y:0,spriteSize:89.6,hp:1000});
enemies.set('rear',{id:'rear',type:'mob',x:-400,y:0,spriteSize:89.6,hp:1000});
enemies.set('off-axis',{id:'off-axis',type:'mob',x:300,y:200,spriteSize:89.6,hp:1000});
run('attack.update(.05,player,0)');assert.equal(hits.length,20);
assert(knocks.every(k=>Math.abs(k[1]-150)<1e-8&&Math.abs(k[3]-10/60)<1e-8));
run('attack.update(.2,player,0)');assert.equal(hits.length,20);
run('attack.update(.75,player,0)');assert.equal(hits.length,20);
run('attack.update(1,player,0);attack.update(1.05,player,0)');assert.equal(hits.length,40);
hits.length=0;run('attack.reset();weapon.level=7;attack.update(.05,player,0)');assert(hits.some(h=>h.id==='rear'));assert(!hits.some(h=>h.id==='off-axis'));
// Missing EX patterns must not keep right-click available while real skills cool down.
vm.runInContext(fs.readFileSync('Development/skill-cast-state.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
assert.equal(run('equippedSkills(player).length'),1);
console.log('PASS: Aris damage range/levels, piercing20targets, per-enemy hit cooldown, attack interval, knockback, rear beam and undefined-EX exclusion.');
// High Haste may overlap volleys, but still cannot bypass the enemy's1second hit limit.
enemies.clear();hits.length=0;knocks.length=0;
enemies.set('haste-target',{id:'haste-target',type:'mob',x:400,y:0,hp:10000,spriteSize:89.6});
run('attack.reset();weapon.level=1;player.combatStats.hastePercent=1000');
for(let i=0;i<30;i++)run('attack.update(.1,player,0)');
assert(hits.length<=3);assert(hits.length>=2);
console.log('PASS: overlapping Haste volleys respect shared per-enemy hit cooldown.');

// Continuous EX follows current targeting, ticks at0.5s and expires at3s.
enemies.clear();hits.length=0;
enemies.set('east',{id:'east',type:'mob',x:400,y:0,hp:10000,spriteSize:89.6});
enemies.set('south',{id:'south',type:'mob',x:0,y:400,hp:10000,spriteSize:89.6});
run('attack.reset();player.combatStats.hastePercent=0;var exAngle=0;attack.cast(player,0,1.5,()=>exAngle);attack.update(.01,player,0)');
assert.equal(hits.length,0);
run('attack.update(1.34,player,0)');assert(hits.some(h=>h.id==='east'));
run('exAngle=Math.PI/2;attack.update(.51,player,0)');
assert(hits.some(h=>h.id==='south'));
run('attack.update(3,player,0)');
console.log('PASS: Supernova EX starts on fresh owner, follows aim and expires after3seconds.');
// Isolate EX ticks from the next autoattack and verify closest-side ejection.
enemies.clear();hits.length=0;knocks.length=0;
enemies.set('tick',{id:'tick',type:'mob',x:400,y:0,hp:10000,spriteSize:89.6});
run('attack.reset();attack.update(.01,player,0)'); // Put the automatic beam on cooldown.
run('attack.update(.4,player,0)');hits.length=0;knocks.length=0;
run('attack.cast(player,0,1.5);attack.update(.01,player,0)');assert.equal(hits.length,0);
run('attack.update(1.34,player,0)');assert.equal(hits.length,1);
run('attack.update(.99,player,0)');assert.equal(hits.length,1);
run('attack.update(.01,player,0)');assert.equal(hits.length,2);
assert(knocks[0][2]>0);assert(knocks[0][1]>0);
const upper=run("supernovaKnockback({type:'mob',x:400,y:-20,spriteSize:89.6},{x:0,y:0},0,64)");
assert(upper.y<0);assert(upper.x>0);
const lower=run("supernovaKnockback({type:'mob',x:400,y:20,spriteSize:89.6},{x:0,y:0},0,64)");
assert(lower.y>0);
console.log('PASS: EX1s per-enemy ticks and closest-edge sideways/forward knockback.');

assert.equal(run('supernovaBeamPhase(.2).damaging'),false);
assert.equal(run('supernovaBeamPhase(1.35).damaging'),true);
assert.equal(run('supernovaBeamPhase(4.35).damaging'),false);
assert.equal(run('supernovaBeamPhase(3.5).finished'),false);
assert.equal(run('supernovaBeamPhase(5.32).finished'),true);
assert.equal(run('arisBeamVisualSettings.durationMultiplier'),1.2);
assert.equal(run('arisWeaponSettings.beamSeconds'),.3);
assert.equal(run('supernovaSkillSettings.duration'),3);
console.log('PASS: weapon opening precedes EX damage;20%visual tail never extends the active damage window.');

assert.equal(run('supernovaWeaponPose(0).opacity'),0);
assert.equal(run('supernovaWeaponPose(.336).opacity'),1);
assert.equal(run('supernovaWeaponPose(2).opacity'),1);
assert.equal(run('supernovaWeaponPose(3.9).opacity'),1);
assert(run('supernovaWeaponPose(5.07).opacity')>0 && run('supernovaWeaponPose(5.07).opacity')<1);
assert.equal(run('supernovaWeaponPose(5.32).opacity'),0);
assert(Math.abs(run('supernovaWeaponPose(5.07).offset'))<Math.abs(run('supernovaWeaponPose(2).offset')));
assert.equal(run('supernovaWeaponPose(2).length'),105.6);
console.log('PASS:20%larger weapon emerges on slower fade, persists through EX, and retracts/fades to center.');

// EX pauses only this weapon's autoattack, including its remaining interval.
enemies.clear();hits.length=0;
enemies.set('behind',{id:'behind',type:'mob',x:-400,y:0,hp:10000,spriteSize:89.6});
run('attack.reset();weapon.level=7;attack.update(.01,player,0)');assert(hits.length>0);hits.length=0;
run('attack.cast(player,0);for(var i=0;i<400;i++)attack.update(.01,player,0)');
assert.equal(hits.length,0);
run('for(var i=0;i<60;i++)attack.update(.01,player,0)');assert.equal(hits.length,0);
run('for(var i=0;i<320;i++)attack.update(.01,player,0)');assert(hits.length>0);
assert.equal(run('createArisWeapon().iconRotation'),-45);
console.log('PASS: EX cancels ongoing auto beam, freezes auto timer through presentation and resumes remaining interval; icon45degrees.');

run("var plana={label:'Plana',x:100,y:200,spriteSize:89.6};var anchor=arisBeamAnchor(plana)");
assert.equal(run('anchor.y'),206);
for (const angle of [0,Math.PI/4,Math.PI/2,Math.PI]) {
 c.testAngle=angle;
 assert(Math.abs(run('arisBeamOffset(anchor,testAngle)-anchor.rx')-10)<1e-8);
}
console.log('PASS: beam starts10px beyond actual Plana collider for cardinal/diagonal aim.');

assert.equal(run("arisBeamHits({type:'mob',x:110,y:199.6,spriteSize:10},anchor,0,32)"),true);
assert.equal(run("arisBeamHits({type:'mob',x:50,y:199.6,spriteSize:10},anchor,0,32)"),false);
assert.equal(run("arisBeamHits({type:'mob',x:110,y:300,spriteSize:10},anchor,0,32)"),false);
console.log('PASS: invisible beam extension fills player-to-muzzle gap without changing visual10px clearance.');

enemies.clear();hits.length=0;
enemies.set('manual-ex',{id:'manual-ex',type:'mob',x:400,y:0,hp:10000,spriteSize:89.6});
run('attack.reset();attack.setAutoattackEnabled(false);attack.update(1,player,0)');assert.equal(hits.length,0);
run('attack.cast(player,0);attack.update(1.35,player,0)');assert.equal(hits.length,1);
run('attack.reset();attack.setAutoattackEnabled(true);attack.update(.01,player,0)');assert.equal(hits.length,2);
console.log('PASS: disabled automatic Supernova still permits EX casting and can re-enable auto fire.');

// EX muzzle spacing is independent of automatic beam spacing and level area upgrades.
assert.equal(run('arisBeamOffset({rx:10,ry:10},0,true)'),50);
assert.equal(run('arisBeamOffset({rx:10,ry:10},0,false)'),20);
assert.equal(run('supernovaSkillSettings.beamWidth'),40.96);
assert(!fs.readFileSync('Development/aris-weapon.js','utf8').includes('arisLevelStats(special.player).size'));

