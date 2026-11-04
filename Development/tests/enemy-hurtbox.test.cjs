const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({});
for(const name of ['game-config','combat-hitboxes'])vm.runInContext(fs.readFileSync('Development/'+name+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var enemy={id:"test",type:"midori",x:100,y:100,spriteSize:160};var contact=getCombatHitbox(enemy,true);enemy.spriteHurtbox={offsetX:-4,offsetY:-12,width:100,height:140};var hurt=getEnemyHurtbox(enemy)');
assert.equal(run('hurt.x'),96);assert.equal(run('hurt.y'),88);assert.equal(run('hurt.rx'),50);assert.equal(run('hurt.ry'),70);
assert(run('segmentHitsBody(hurt,45,20,50,20)'));assert(!run('segmentHitsBody(contact,45,20,50,20)'));
assert.deepEqual(run('getCombatHitbox(enemy,true)'),run('contact'));
console.log('PASS: rendered sprite bounds receive attacks while original small contact ellipse is unchanged.');

// Transparent parts of an animation crop must not receive damage.
run('enemy.spriteHurtbox={offsetX:0,offsetY:0,width:100,height:100,mask:[{x:.75,y:.5,width:.2,height:.2}]};hurt=getEnemyHurtbox(enemy)');
assert(!run('segmentHitsBody(hurt,60,100,70,100)'));
assert(run('segmentHitsBody(hurt,120,100,130,100)'));
run('enemy.spriteHurtbox.mirrored=true;hurt=getEnemyHurtbox(enemy)');
assert(run('segmentHitsBody(hurt,70,100,80,100)'));
assert(!run('segmentHitsBody(hurt,120,100,130,100)'));
console.log('PASS: alpha silhouette rejects transparent regions and mirrors with the sprite.');
