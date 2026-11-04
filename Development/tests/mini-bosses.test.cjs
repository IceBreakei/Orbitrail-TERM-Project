const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const n of ['game-config','combat-hitboxes','enemy-variants','mini-bosses'])vm.runInContext(fs.readFileSync('Development/'+n+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run("var template=createMegaMob({label:'Mob'});var mega=enemyVariant('megaMob',template,'elite',()=>0)");
assert.equal(run('mega.hp'),600);assert.equal(run('mega.contactDamage'),6);assert.equal(run('mega.expReward'),150);
assert.equal(run('mega.movementSpeedMultiplier'),120/180);assert.equal(run('mega.elite'),true);
assert.equal(run('template.miniBoss'),true);assert.equal(run('template.boss'),false);
assert.equal(run('template.spriteSize'),89.6*1.98);
run('var count=0;var schedule=createMiniBossSchedule();schedule.update(119,()=>++count)');assert.equal(run('count'),0);
run('schedule.update(120,()=>{count++;return false})');assert.equal(run('count'),1);
run('schedule.update(121,()=>{count++;return true});schedule.update(122,()=>{count++;return true})');assert.equal(run('count'),2);
console.log('PASS: Mega Mob bases, size, mini-boss identity, no elite conversion,120second trigger/retry/one-shot.');

run("var converted=enemyVariant('mob',{label:'Mob'},'elite',()=>0)");
assert.equal(run('converted.hp'),600);assert.equal(run('converted.contactDamage'),6);
assert.equal(run('converted.contactDamageMultiplier'),1);assert.equal(run('converted.expReward'),150);
assert.equal(run('converted.miniBoss'),true);assert.equal(run('converted.label'),'Mega Mob');
assert.equal(run('converted.spriteSize'),run('template.spriteSize'));
console.log('PASS: previous elite Mob is Mega Mob, matching scheduled stats/size without double multipliers.');

run("var sweeperMega=createMegaSweeper({label:'Sweeper',spriteSize:53.76});var sweeperStats=enemyVariant('megaSweeper',sweeperMega,'normal',()=>1)");
assert.equal(run('sweeperStats.hp'),1800);assert.equal(run('sweeperStats.contactDamage'),10);
assert.equal(run('sweeperStats.contactDamageMultiplier'),1);assert.equal(run('sweeperStats.expReward'),600);
assert.equal(run('sweeperStats.movementSpeedMultiplier'),1);
run('var late=[];var twoBosses=createMiniBossSchedule();twoBosses.update(239,type=>{late.push(type);return true})');
assert.equal(run('late.length'),1);
run('twoBosses.update(240,type=>{late.push(type);return true});twoBosses.update(241,type=>{late.push(type);return true})');
assert.equal(run('late.length'),2);assert.equal(run('late[1]'),'megaSweeper');
console.log('PASS: Mega Sweeper1800/10/180pxspeed/600EXP, once at240s and no extra elite multipliers.');
