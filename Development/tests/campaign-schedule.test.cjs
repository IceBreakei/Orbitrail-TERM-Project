const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const n of ['game-config','campaign-config','campaign-schedule'])vm.runInContext(fs.readFileSync('Development/'+n+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var clock=createCampaignSchedule();var arrivals=[];var spawn=r=>{arrivals.push(r);return true}');
run('clock.update(30,spawn)');assert.equal(run('clock.seconds'),30);
assert.equal(run('clock.pickSpawn(()=>0).row.hp'),8);
run('clock.update(400,spawn)');assert.equal(run('clock.seconds'),360);assert.equal(run('clock.frozen'),true);
assert.equal(run('arrivals.filter(r=>r.kind==="boss").length'),1);
run('clock.update(20,spawn)');assert.equal(run('clock.seconds'),360);assert(run('clock.pickSpawn(()=>.5)'));
run("clock.recordDefeat({campaignRowId:'s1-shiroko'})");assert.equal(run('clock.cleared'),true);
run("clock.setStage('second')");assert.equal(run('clock.seconds'),390);assert.equal(run('clock.pickSpawn(()=>0).row.hp'),180);
run('clock.update(330,spawn)');assert.equal(run('clock.seconds'),720);assert.equal(run('clock.frozen'),false);
run("clock.recordDefeat({campaignRowId:'s2-arisu'});clock.update(60,spawn)");assert.equal(run('clock.seconds'),780);assert.equal(run('clock.frozen'),true);assert.equal(run('clock.cleared'),false);
run("clock.recordDefeat({campaignRowId:'s2-mega-ops'})");assert.equal(run('clock.cleared'),true);
// Gate defeat first must still wait/freeze for the remaining Arisu boss.
run("clock.setStage('first');clock.setStage('second');clock.update(400,spawn);clock.recordDefeat({campaignRowId:'s2-mega-ops'});clock.update(10,spawn)");assert.equal(run('clock.seconds'),780);assert.equal(run('clock.cleared'),false);
run("clock.setStage('third');clock.update(400,spawn)");assert.equal(run('clock.seconds'),1050);assert.equal(run('clock.frozen'),true);
run("clock.setStage('fourth');clock.update(120,spawn)");assert.equal(run('clock.seconds'),1200);assert.equal(run('clock.frozen'),false);
run('clock.update(300,spawn)');assert.equal(run('clock.seconds'),1500);assert(run('clock.pickSpawn(()=>.6)'));
run("var pedroRow=campaignEnemyRows.find(r=>r.id==='s4-mega-pedro');var pedro=campaignEnemyOverrides({row:pedroRow,scheduled:false,mega:false},{spriteSize:89.6,miniBoss:true})");assert.equal(run('pedro.hp'),1000);assert.equal(run('pedro.contactDamage'),12);
run("var shiroko=campaignEnemyOverrides({row:campaignEnemyRows.find(r=>r.id==='s1-shiroko'),scheduled:true},{spriteSize:268.8})");assert.equal(run('shiroko.maxHp'),8000);assert.equal(run('shiroko.expReward'),2000);
assert.equal(run('shiroko.campaignRowId'),'s1-shiroko');
assert.equal(run('campaignEnemyRows.length'),32);
console.log('PASS: fullchart stats, clock anchors/freezes, Stage2two-encounter gate in either defeat order,Stage4unfrozen/25minpool and no doubled Mega stats.');
// 0.5% Mega rule applies only during actual chart boss encounters.
run("clock.setStage('first');clock.update(360,spawn);var seq=[0,0,.0049];var megaPick=clock.pickSpawn(()=>seq.shift())");
assert.equal(run('megaPick.mega'),true);
run('seq=[0,0,.005];var normalPick=clock.pickSpawn(()=>seq.shift())');assert.equal(run('normalPick.mega'),false);
// Explicit regular chart overrides retain stats without legacy HP/ATK multiplication.
run("var entry={row:campaignEnemyRows.find(r=>r.id==='s2-mob1'),scheduled:false,mega:false};var exact=campaignEnemyOverrides(entry,{spriteSize:89.6})");
assert.equal(run('exact.hp'),100);assert.equal(run('exact.contactDamage'),5);assert.equal(run('exact.contactDamageMultiplier'),1);assert.equal(run('exact.expReward'),8);
console.log('PASS: exact0.5% Mega boundary during boss and direct chart overrides without legacy multipliers.');

run("var resume=createCampaignSchedule();resume.setStage('second');resume.update(400,spawn);resume.recordDefeat({campaignRowId:'s2-arisu'});resume.recordDefeat({campaignRowId:'s2-mega-ops'})");
assert.equal(run('resume.readyToAdvance'),false);
run('resume.update(59,spawn)');assert.equal(run('resume.seconds'),839);assert.equal(run('resume.readyToAdvance'),false);
run('resume.update(1,spawn)');assert.equal(run('resume.seconds'),840);assert.equal(run('resume.readyToAdvance'),true);
console.log('PASS: Stage2 resumes13:00through14:00 after both bosses, instead of skipping the13:30event.');

// Endless pool boundaries and exact stats must not receive Mega multipliers twice.
assert.equal(run('pickEndlessEnemy(1379)'),null);
assert.equal(run('pickEndlessEnemy(1380,()=>0).row.hp'),5000);
assert.equal(run('pickEndlessEnemy(1799,()=>.99999).type'),'opsSweeper');
assert.equal(run('pickEndlessEnemy(1800,()=>.99999).type'),'midori');
run('var endlessActor=campaignEnemyOverrides(pickEndlessEnemy(1380,()=>0),{spriteSize:100});var endlessMidori=campaignEnemyOverrides(pickEndlessEnemy(1800,()=>.99999),{spriteSize:100})');
assert.equal(run('endlessActor.maxHp'),5000);
assert.equal(run('endlessActor.contactDamage'),15);
assert.equal(run('endlessActor.expReward'),25);
assert.equal(run('endlessActor.elite'),true);
assert.equal(run('endlessActor.spriteSize'),run('100*eliteSizeMultiplier'));
assert.equal(run('endlessMidori.maxHp'),9000);
assert.equal(run('endlessMidori.contactDamage'),5);
assert.equal(run('endlessMidori.elite'),false);
assert.equal(run('endlessMidori.movementSpeedMultiplier'),2);

// Pedrozilla's dedicated Mega scale applies to endless and random Mega profiles.
assert.equal(run('campaignEnemyOverrides(pickEndlessEnemy(1380,()=>0),{spriteSize:60,megaSizeMultiplier:1.2}).spriteSize'),72);
assert.equal(run('campaignEnemyOverrides({row:{hp:10,atk:1,spd:1,exp:1,kind:"regular"},mega:true},{spriteSize:60,megaSizeMultiplier:1.2}).spriteSize'),72);
