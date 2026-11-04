const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({});
for(const name of ['game-config','combat-hitboxes','sweeper-sprites','enemy-variants'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
for(const type of ['whiteSweeper','heavySweeper']){
 c.type=type;run("var template=createSweeper(type,'sprite.png');var standard=enemyVariant(type,template,'normal',()=>1);var elite=enemyVariant(type,template,'elite');");
 assert(Math.abs(run('standard.spriteSize')-89.6*.6)<1e-8);
 assert.equal(run('standard.hp'),type==='heavySweeper'?80:40);assert.equal(run('standard.elite'),false);assert.equal(run('elite.hp'),1800);
 assert.equal(run('elite.contactDamageMultiplier'),1);assert.equal(run('template.frameSequence.length'),5);
 assert.equal(run('Object.keys(template.rows).length'),8);
 for(const edges of run('template.layout.rowEdges'))assert(edges[0]>=0&&edges.at(-1)<=1586);
}
assert.equal(run('chooseStandardEnemy(()=>.1)'),'mob');
assert.equal(run('chooseStandardEnemy(()=>.9,30)'),'whiteSweeper');assert.equal(run('chooseStandardEnemy(()=>.95,180)'),'heavySweeper');
console.log('PASS: both Sweepers60% of Mob, standard/elite stats, 5frames/8directions, crop bounds and spawn weights.');

run("var sweeper=createSweeper('Sweeper','sprite.png');");
assert(run('sweeper.combatHitbox===combatHitboxes.mob'));
const circle=run("getCombatHitbox({...sweeper,type:'whiteSweeper',x:100,y:200},true)");
assert.equal(circle.rx,circle.ry);
assert(Math.abs(circle.y-(200+53.76*.04+6))<1e-8);
console.log('PASS: Sweepers share Mob circular hitbox and sprite-center offsets.');
assert.equal(run("enemyVariant('mob',{},'normal',()=>1).hp"),8);
assert.equal(run("enemyVariant('mob',{},'normal',()=>1).contactDamage"),2);
assert.equal(run("enemyVariant('mob',{},'normal',()=>1).expReward"),6);
assert.equal(run("enemyVariant('mob',{},'elite',()=>1).hp"),600);
assert.equal(run('chooseStandardEnemy(()=>0,179.99)'),'mob');
assert.notEqual(run('chooseStandardEnemy(()=>0,180)'),'mob');
console.log('PASS: Mob8HP/2ATK/6EXP, Mega600HP and exclusive3minute automatic spawn cutoff.');

for(const type of ['whiteSweeper','heavySweeper']) {
 c.type=type;
 assert.equal(run("enemyVariant(type,createSweeper(type,'sprite.png'),'normal',()=>1).contactDamage"),4);
 assert.equal(run("enemyVariant(type,createSweeper(type,'sprite.png'),'normal',()=>1).expReward"),type==='heavySweeper'?8:7);
 assert.equal(run("enemyVariant(type,createSweeper(type,'sprite.png'),'normal',()=>1).movementSpeedMultiplier"),96/180);
}
assert.equal(run('chooseStandardEnemy(()=>.99,29.99)'),'mob');
assert.equal(run('chooseStandardEnemy(()=>.99,30)'),'whiteSweeper');
assert.equal(run('chooseStandardEnemy(()=>0,299.99)'),'whiteSweeper');
assert.equal(run('chooseStandardEnemy(()=>0,300)'),null);
console.log('PASS: distinct Sweeper bases/rewards, shared96pxspeed and exclusive300s end.');

assert.equal(run('chooseStandardEnemy(()=>.99,179.99)'),'whiteSweeper');
assert.equal(run('chooseStandardEnemy(()=>.99,180)'),'heavySweeper');
assert.equal(run('chooseStandardEnemy(()=>.99,299.99)'),'heavySweeper');
console.log('PASS: Heavy Sweeper starts exactly180s and stops at300s.');
assert.equal(run("enemyVariant('shiroko',{boss:true},'normal',()=>1).hp"),8000);
assert.equal(run("enemyVariant('shiroko',{boss:true},'normal',()=>1).contactDamage"),15);
assert.equal(run("enemyVariant('shiroko',{boss:true},'normal',()=>1).expReward"),2000);
assert.equal(run("enemyVariant('shiroko',{boss:true},'normal',()=>1).movementSpeedMultiplier"),192/180);
console.log('PASS: Shiroko8000HP/15ATK/192pxspeed/2000EXP.');
