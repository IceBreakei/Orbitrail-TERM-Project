const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const enemies=new Map(),hits=[],knocks=[];
const c=vm.createContext({getAllEnemies:()=>[...enemies.values()],getEnemy:id=>enemies.get(id),damageEnemy:(id,damage,p,type)=>{hits.push({id,damage,type});return damage},applySkillControl:(...args)=>knocks.push(args)});
for(const name of ['game-config','combat-stats','combat-hitboxes','luminous-nova','princess-key','synergy-recipes','golden-crafter-rules'])vm.runInContext(fs.readFileSync('Development/'+name+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
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
