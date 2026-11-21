const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
const c=vm.createContext({storage});vm.runInContext(fs.readFileSync('Development/item-catalog.js','utf8').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run("configureItemUnlocks(storage,'regular');unlockItem('malkuth-hat');configureItemUnlocks(storage,'regular')");
assert.equal(run("isItemUnlocked('malkuth-hat')"),true);
run("configureItemUnlocks(storage,'other')");assert.equal(run("isItemUnlocked('malkuth-hat')"),false);
run("configureItemUnlocks(storage,'dev',{developer:true})");assert.equal(run("isContentUnlocked('future-weapon')"),true);assert.equal(saved.has('orbitrail.items.dev'),false);
run('setUnlockSimulation(true)');assert.equal(run("isItemUnlocked('malkuth-hat')"),false);assert.equal(run("isContentUnlocked('starter',true)"),true);
run("unlockItem('malkuth-hat')");assert.equal(run("isItemUnlocked('malkuth-hat')"),true);assert.equal(saved.has('orbitrail.items.dev'),false);
run('setUnlockSimulation(false);setUnlockSimulation(true)');assert.equal(run("isItemUnlocked('malkuth-hat')"),false);
run("configureItemUnlocks(storage,'regular');setUnlockSimulation(true)");assert.equal(run('isUnlockSimulation()'),false);assert.equal(run("isItemUnlocked('malkuth-hat')"),true);
console.log('PASS account isolation, persistent unlocks, developer bypass, fresh simulation and no writes to real progress.');

run("configureItemUnlocks(storage,'saint-test')");assert.equal(run("isContentUnlocked('saint-predator')"),false);
run("unlockStageBossRewards(2,'shiroko');unlockStageBossRewards(1,'mob')");assert.equal(run("isContentUnlocked('saint-predator')"),false);
run("unlockStageBossRewards(1,'shiroko');configureItemUnlocks(storage,'saint-test')");assert.equal(run("isContentUnlocked('saint-predator')"),true);
run("configureItemUnlocks(storage,'saint-developer',{developer:true});setUnlockSimulation(true)");assert.equal(run("isContentUnlocked('saint-predator')"),false);
run("unlockStageBossRewards(1,'shiroko')");assert.equal(run("isContentUnlocked('saint-predator')"),true);assert.equal(saved.has('orbitrail.items.saint-developer'),false);
run('setUnlockSimulation(false)');assert.equal(run("isContentUnlocked('saint-predator')"),true);
console.log('PASS Saint Predator Stage1 boss objective, cross-run persistence, wrong-stage rejection and isolated developer simulation.');

run("configureItemUnlocks(storage,'supernova-test')");assert.equal(run("isContentUnlocked('aris-laser')"),false);
run("unlockStageBossRewards(1,'arisu');unlockStageBossRewards(2,'shiroko')");assert.equal(run("isContentUnlocked('aris-laser')"),false);
run("unlockStageBossRewards(2,'arisu');configureItemUnlocks(storage,'supernova-test')");assert.equal(run("isContentUnlocked('aris-laser')"),true);
run("configureItemUnlocks(storage,'supernova-dev',{developer:true})");assert.equal(run("isContentUnlocked('aris-laser')"),true);run('setUnlockSimulation(true)');assert.equal(run("isContentUnlocked('aris-laser')"),false);run("unlockStageBossRewards(2,'arisu')");assert.equal(run("isContentUnlocked('aris-laser')"),true);assert.equal(saved.has('orbitrail.items.supernova-dev'),false);
console.log('PASS Supernova Stage2 boss unlock, account persistence, wrong-stage rejection and developer simulation.');
