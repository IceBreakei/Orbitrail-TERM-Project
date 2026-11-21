const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const store=new Map();
const c=vm.createContext({storage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}});
for(const name of ['item-catalog','character-survival-unlocks'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run("configureItemUnlocks(storage,'chise-test');var tracker=createCharacterSurvivalUnlocks();var arona={label:'Arona'},plana={label:'Plana'}");
assert(!run("itemUpgradeChoices({equipmentSlots:[]}).some(c=>c.id==='chise-new')"));
run('tracker.update(600,plana);tracker.update(599,arona);tracker.update(100,arona,{paused:true})');assert.equal(run("isContentUnlocked('chise-plushie')"),false);
run('tracker.update(1,arona)');assert.equal(run("isContentUnlocked('chise-plushie')"),true);run("configureItemUnlocks(storage,'chise-test')");assert.equal(run("isContentUnlocked('chise-plushie')"),true);
run('var p={equipmentSlots:[]};applyItemUpgrade(p,"chise-new")');assert.equal(run('p.equipmentSlots[0].weight'),3);
for(const [level,fraction] of [[1,.3],[2,.2],[3,.1]]){run(`p.equipmentSlots[0].level=${level}`);assert.equal(run('chiseImmediateFraction(p)'),fraction);}
assert(!run("itemUpgradeChoices(p).some(c=>c.id==='chise-level')"));
run("configureItemUnlocks(storage,'fresh');tracker=createCharacterSurvivalUnlocks();tracker.update(599,arona);tracker.update(1,arona,{alive:false});tracker.update(100,arona)");assert.equal(run("isContentUnlocked('chise-plushie')"),false);
run("configureItemUnlocks(storage,'developer',{developer:true});setUnlockSimulation(true);tracker=createCharacterSurvivalUnlocks();tracker.update(600,arona)");assert.equal(run("isContentUnlocked('chise-plushie')"),true);assert.equal(store.has('orbitrail.items.developer'),false);
assert(fs.existsSync('sprites/items/Chise-nyan Doll.png'));
console.log('PASS Chise definition/levels, locked reward eligibility, Arona-only active time, pause/death, account persistence and developer simulation isolation.');
