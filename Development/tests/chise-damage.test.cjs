const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const numbers=[];
const c=vm.createContext({showDamageNumber:(...args)=>numbers.push(args)});
for(const name of ['game-config','item-catalog','tuning-parts','combat-stats','player-stats','chise-plushie'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
assert.equal(run('chisePlushieSettings.tickSeconds'),1.5);assert.equal(run('chisePlushieSettings.damagePerTick'),1);
// Verify the configured production drain rate and damage accounting.
run('chisePlushieSettings.damagePerTick=1;var p={maxHp:200,hp:200,equipmentSlots:[createChisePlushie()]};damagePlayer(p,100)');
assert.equal(run('p.hp'),170);assert.equal(run('p.chisePendingDamage'),70);run('updateChiseDamage(p,1.49)');assert.equal(run('p.hp'),170);run('updateChiseDamage(p,.01)');assert.equal(run('p.hp'),169);assert.equal(run('p.chisePendingDamage'),69);
run('damagePlayer(p,20)');assert.equal(run('p.chisePendingDamage'),83);assert.equal(run('p.hp'),163);run('updateChiseDamage(p,0)');assert.equal(run('p.hp'),163);
run('p.equipmentSlots=[];updateChiseDamage(p,124.5)');assert.equal(run('p.chisePendingDamage'),0);assert.equal(run('p.hp'),80,'Total120 damage is conserved even after removing the item');
run('p={maxHp:100,hp:100,equipmentSlots:[{...createChisePlushie(),level:3}]};var accepted=damagePlayer(p,1)');assert.equal(run('accepted'),true);assert.equal(run('p.hp'),100);assert.equal(run('p.chisePendingDamage'),1);run('updateChiseDamage(p,1.5)');assert.equal(run('p.hp'),99);
run('p={maxHp:100,hp:100,equipmentSlots:[{...createChisePlushie(),level:3},createLifeJacket()]};damagePlayer(p,100)');assert.equal(run('p.hp'),100);assert.equal(run('p.lifeJacketState.remaining'),6);assert.equal(run('p.chisePendingDamage'),81);
let guardCalls=0;c.guard=()=>{guardCalls++;return true};run('setPlayerDamageGuard(guard);chisePlushieSettings.damagePerTick=10');numbers.length=0;run('updateChiseDamage(p,1.5)');assert.equal(run('p.hp'),96);assert.equal(run('p.lifeJacketState.remaining'),0);assert.equal(guardCalls,0,'Debt bypasses attack-only hit negation');assert.equal(run('p.chisePendingDamage'),71);assert.equal(numbers[0][3],'shield');assert.equal(numbers[1][1],4,'No second DR application');
run('p={maxHp:100,hp:100,equipmentSlots:[createChisePlushie()]};damagePlayer(p,100)');assert.equal(run('p.chisePendingDamage'),undefined);assert.equal(run('p.hp'),100);assert.equal(guardCalls,1);
run('setPlayerDamageGuard(null);chisePlushieSettings.damagePerTick=null;damagePlayer(p,10)');assert.equal(run('p.hp'),90,'Unconfigured drain does not grant a permanent damage discount');
console.log('PASS 1.5s debt timing with test rule, damage conservation, stacked hits, removal, zero-initial hit, shield-first debt, no double DR/negation and pending-rule safety.');
