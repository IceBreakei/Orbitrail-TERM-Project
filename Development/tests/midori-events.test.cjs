const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
const source = name => fs.readFileSync(path.join(__dirname, '..', name+'.js'), 'utf8')
 .replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ','');
for (const name of ['game-config','combat-stats','combat-hitboxes','midori','enemy-variants','endless-buildup','endless-events']) vm.runInContext(source(name),context);
const run = code => vm.runInContext(code,context);
assert(Math.abs(run('midoriSpeed({movementSpeedMultiplier:240/180,combatStats:{spdPercent:0}})')-194.94)<1e-8);
assert(Math.abs(run('midoriSpeed({movementSpeedMultiplier:240/180,combatStats:{spdPercent:50}})')-292.41)<1e-8);
assert(run("midoriDodges({type:'midori',x:100,y:0},{x:0,y:0},()=>.049)"));
assert(!run("midoriDodges({type:'midori',x:100,y:0},{x:0,y:0},()=>.05)"));
assert(!run("midoriDodges({type:'midori',x:161,y:0},{x:0,y:0},()=>0)"));
assert(!run("midoriDodges({type:'mob',x:1,y:0},{x:0,y:0},()=>0)"));
assert.equal(run("enemyVariant('midori',{label:'Midori'},'normal',()=>1,0).hp"),600);
assert.equal(run("enemyVariant('midori',{label:'Midori'},'normal',()=>1,900).hp"),3500);
assert.equal(run("enemyVariant('midori',{label:'Midori'},'normal',()=>1).contactDamageMultiplier"),2);
assert(run("enemyVariant('midori',{label:'Midori'},'normal',()=>1).elite"));
run('var bosses=0, midoris=0;var events=createEndlessEvents(()=>bosses++,()=>.1,()=>midoris++);var state={endless:true,bossAlive:false,spawning:true};');
run("events.trigger('eliteSurge');events.update(180,state)");
assert.equal(run('events.phase'),'midori');assert.equal(run('midoris'),1);assert.equal(run('bosses'),0);
assert.equal(run('events.spawnType'),'midori');assert(!run('events.allowsBossWave'));
run('events.update(179,state)');assert.equal(run('events.phase'),'midori');
run('events.update(20,{...state,spawning:false})');assert.equal(run('events.phase'),'midori');
run('events.update(1,state)');assert.equal(run('events.phase'),'normal');assert.equal(run('events.spawnType'),null);
run("events.trigger('midori');events.update(10,{...state,endless:false})");assert.equal(run('events.phase'),'midori');
run('events.stop()');assert(!run('events.active'));assert.equal(run('events.phase'),'normal');
run("var bossEvents=createEndlessEvents(()=>bosses++,()=>.9);bossEvents.trigger('eliteSurge');bossEvents.update(180,state)");
assert.equal(run('bosses'),1);assert.equal(run('bossEvents.phase'),'ready');assert(run('bossEvents.allowsBossWave'));
run("events.trigger('midori');events.update(1,{...state,bossAlive:true})");assert.notEqual(run('events.phase'),'midori');
console.log('PASS: Midori speed/SPD tracking, 5% close-range dodge, elite HP/damage, boss-or-Midori outcome, event duration/pause, manual triggers and stop.');

// Central damage contract: a missed weapon attack cannot damage, flash, drop loot or count a kill.
let popups=[], loot=0, deaths=0;
Object.assign(context,{isAdminSeed:false,dropEnemyExp(){loot++},dropEnemyLoot(){loot++},dropYuukaCredits(){},
 beginEnemyDeath(){deaths++},showDamageNumber(...args){popups.push(args)}});
vm.runInContext(source('world-state'),context);
run("rememberEnemy('midori-test',{type:'midori',x:20,y:0,hp:600,maxHp:600});midoriDodges=()=>true;");
assert.equal(run("damageEnemy('midori-test',50,{x:0,y:0},'normal',{canMiss:true})"),false);
assert.equal(run("getEnemy('midori-test').hp"),600);
assert.equal(run("getEnemy('midori-test').damageFlashElapsed"),undefined);
assert.equal(popups[0][3],'miss');assert.equal(loot,0);assert.equal(deaths,0);assert.equal(run('getKillCount()'),0);
run("damageEnemy('midori-test',50,{x:0,y:0})"); // Admin/scripted damage bypasses dodge.
assert.equal(run("getEnemy('midori-test').hp"),550);
console.log('PASS: miss popup with no damage/flash/rewards; admin damage bypasses evasion.');

// Chase convergence aligns the small feet ellipse to the actual player contact center.
run("var chasing={type:'midori',x:500,y:500,spriteSize:241.92};var targetPlayer={type:'plana',x:300,y:300,spriteSize:89.6};var destination=midoriChaseTarget(chasing,targetPlayer);");
assert(run('destination.y < targetPlayer.y'));
run('chasing.x=destination.x;chasing.y=destination.y;var feet=getCombatHitbox(chasing,true),body=getCombatHitbox(targetPlayer,false);');
assert(Math.abs(run('feet.x-body.x'))<1e-8);
assert(Math.abs(run('feet.y-body.y'))<1e-8);
console.log('PASS: Midori chase aligns foot hitbox with player center.');

// Event cleanup is scoped to its instance and never emits rewards/kill notifications.
run("clearEnemies();rememberEnemy('event-a',{type:'mob',eventKey:'a',x:0,y:0,hp:100});rememberEnemy('event-b',{type:'midori',eventKey:'b',x:0,y:0,hp:100});rememberEnemy('ordinary',{type:'mob',x:0,y:0,hp:100});rememberEnemy('boss',{type:'shiroko',eventKey:'a',x:0,y:0,hp:100});var notifications=0;onEnemyDefeat(()=>notifications++);");
const previousLoot=loot,previousDeaths=deaths;
assert.equal(run("endEventEnemies('a',{x:100,y:100})"),1);
assert.equal(run("getEnemy('event-a')"),undefined);
assert(run("getEnemy('event-b') && getEnemy('ordinary') && getEnemy('boss')"));
assert.equal(loot,previousLoot);assert.equal(deaths,previousDeaths+1);
assert.equal(run('notifications'),0);assert.equal(run('getKillCount()'),0);
run("var ended=[];var timed=createEndlessEvents(()=>{},()=>.1,()=>{},key=>ended.push(key));timed.trigger('midori');var midoriKey=timed.spawnEventKey;timed.update(180,state)");
assert(run('ended.includes(midoriKey)'));
run("timed.trigger('eliteSurge');var eliteKey=timed.spawnEventKey;timed.end()");assert(run('ended.includes(eliteKey)'));
console.log('PASS: specific-event animated cleanup without loot/kills/notifications, natural expiry and manual End Event callback.');
run("var koBoss=rememberEnemy('ko-boss',{type:'shiroko',hp:100,maxHp:100});var koMini=rememberEnemy('ko-mini',{type:'mob',miniBoss:true,hp:100,maxHp:100})");
assert.equal(run("damageEnemy('ko-boss',1000,null,'normal',{instantKO:true})"),false);
assert.equal(run("damageEnemy('ko-mini',1000,null,'normal',{instantKO:true})"),false);
assert.equal(run("getEnemy('ko-boss').hp"),100);
assert.equal(run("getEnemy('ko-mini').hp"),100);
console.log('PASS: boss and mini-boss instant-KO immunity without HP loss.');
// Harmless hit-count defeat uses the ordinary combat death/reward/kill pipeline.
run("harmlessEnemySettings.yuukaHitsToDefeat=3;var harmless=rememberEnemy('hit-yuuka',{type:'yuuka',hp:9999999999,maxHp:9999999999})");
run("damageEnemy('hit-yuuka',1);damageEnemy('hit-yuuka',100)");
assert.equal(run("getEnemy('hit-yuuka').receivedHits"),2);
assert(run("getEnemy('hit-yuuka').hp>0"));
const oldKills=run('getKillCount()');run("damageEnemy('hit-yuuka',1)");
assert.equal(run("getEnemy('hit-yuuka')"),undefined);assert.equal(run('getKillCount()'),oldKills+1);
run("harmlessEnemySettings.yuukaHitsToDefeat=null");
console.log('PASS: configurable harmless hit threshold counts different damage equally and emits a normal defeat.');

// Banked EX damage observes accepted HP loss, not overkill or evasion popups.
run('var damageEvents=[];var unsubscribeDamage=onEnemyDamage(event=>damageEvents.push(event));rememberEnemy("damage-bank",{type:"mob",hp:8,maxHp:8});damageEnemy("damage-bank",23)');
assert.equal(run('damageEvents[0].damage'),8);assert.equal(run('damageEvents[0].requestedDamage'),23);
run('rememberEnemy("bank-miss",{type:"midori",hp:50,maxHp:50});damageEnemy("bank-miss",20,{x:0,y:0},"normal",{canMiss:true})');assert.equal(run('damageEvents.length'),1);
run('unsubscribeDamage()');
