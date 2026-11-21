const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let developer=false;const c=vm.createContext({isContentUnlocked:()=>developer});vm.runInContext(fs.readFileSync('Development/level-up-actions.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var p={}');assert.equal(run("levelActionUses(p,'reroll')"),0);assert.equal(run("spendLevelAction(p,'hold')"),false);
run('p.abilityUpgradeRanks={reroll:2,eliminate:1,hold:1}');assert.equal(run("levelActionUses(p,'reroll')"),2);assert.equal(run("spendLevelAction(p,'reroll')"),true);assert.equal(run("levelActionUses(p,'reroll')"),1);
developer=true;assert.equal(run("levelActionUses(p,'reroll')"),9);assert.equal(run("levelActionUses(p,'eliminate')"),10);assert.equal(run("levelActionUses(p,'hold')"),5);
run("p.heldUpgradeId='b';var pool=[{id:'a'},{id:'b'},{id:'c'}]");assert.equal(run('levelActionChoices(p,pool,()=>.5)[0].id'),'b');assert.equal(run('pool[0].id'),'a');
run("p.levelActionSpent.hold=5");assert.equal(run("spendLevelAction(p,'hold')"),false);developer=false;assert.equal(run("levelActionUses({},'reroll')"),0);
console.log('PASS purchased ranks, developer caps, spent uses, simulation locks and held choice ordering.');

run("p={};pool=[{id:'light',weapon:{weight:1}},{id:'heavy',weapon:{weight:4}}]");assert.equal(run('levelActionChoices(p,pool,()=>.3)[0].id'),'heavy');assert.equal(run('levelActionChoices(p,pool,()=>.1)[0].id'),'light');
console.log('PASS weighted level-up order honors defined reward weights.');
