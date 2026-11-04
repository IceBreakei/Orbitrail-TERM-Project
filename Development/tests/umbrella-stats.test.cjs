const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let hits=0;const c=vm.createContext({URL,Image:class{decode(){return Promise.resolve()}},document:{createElement:()=>({getContext:()=>({})})},
 getAllEnemies:()=>[{id:'target',type:'mob',x:100,y:0,spriteSize:89.6}],damageEnemy(){hits++}});
for(const name of ['game-config','combat-stats','combat-hitboxes','weapon-progression','umbrella-attack'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run("var player={x:0,y:0,attackSlots:[{id:'plana-umbrella',level:1}],combatStats:{atkPercent:0,critPercent:0}};var attack=createUmbrellaAttack();");
assert.equal(run('rollUmbrellaDamage(player,undefined,()=>0).damage'),10);
assert.equal(run('rollUmbrellaDamage(player,undefined,()=>1).damage'),14);
assert.equal(run('rollUmbrellaDamage(player,undefined,()=>.5).damage'),12);
assert.equal(run('umbrellaSettings.interval'),1.5);assert.equal(run('umbrellaSettings.hitCooldown'),.5);
for(let i=0;i<140;i++)run('attack.update(.01,player,0)');assert.equal(hits,1);
for(let i=0;i<30;i++)run('attack.update(.01,player,0)');assert.equal(hits,2);
run('attack.reset();player.combatStats.hastePercent=1000');hits=0;
for(let i=0;i<200;i++)run('attack.update(.01,player,0)');assert(hits<=4);
console.log('PASS: umbrella10-14range,120%nominal12damage,1.5sinterval and0.5shit cooldown under Haste.');


assert.equal(run("umbrellaHits({x:0,y:0},{type:'mob',x:15,y:0,spriteSize:10},0,0)"),true);
assert.equal(run("umbrellaHits({x:0,y:0},{type:'mob',x:-30,y:0,spriteSize:10},0,0)"),false);
assert.equal(run("umbrellaHits({x:0,y:0},{type:'mob',x:300,y:0,spriteSize:10},0,0)"),false);
console.log('PASS: umbrella invisible handle extension hits close targets while retaining direction/outer range.');

hits=0;run('attack.setAutoattackEnabled(false);attack.update(3,player,0)');assert.equal(hits,0);
run('attack.setAutoattackEnabled(true);attack.update(.1,player,0)');assert.equal(hits,1);
console.log('PASS: admin autoattack toggle suppresses Umbrella and re-enables normally.');

// Display and hit reach share the current base scale; area upgrades remain proportional.
assert.equal(run('umbrellaSettings.sizeScale'),.935);
assert.equal(run('umbrellaHits({x:0,y:0},{type:"mob",x:170,y:0,spriteSize:1},0,0)'),false);
assert.equal(run('umbrellaHits({x:0,y:0},{type:"mob",x:170,y:0,spriteSize:1},0,0,Math.sqrt(1.4))'),true);
assert(Math.abs(run('umbrellaSettings.sizeScale*Math.sqrt(1.4)')-.935*Math.sqrt(1.4))<1e-9);

