const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['game-config','synergy-recipes','golden-crafter-rules'])vm.runInContext(fs.readFileSync('Development/'+name+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var recipe={id:"example",ingredients:["a","b"],result:{id:"fusion",name:"Fusion",maxLevel:1}};var player={pendingUpgrades:2,attackSlots:[{id:"a",maxLevel:3,level:2},{id:"b",maxLevel:2,level:2}]}');
assert.equal(run('goldenCrafterChoices(player,[recipe]).length'),0);
run('player.attackSlots[0].level=3');assert.equal(run('goldenCrafterChoices(player,[recipe]).length'),1);
assert.equal(run('applyGoldenCrafterChoice(player,"bad",[recipe]).consumed'),false);
run('player.attackSlots[0].enchantments=[{stat:"ATK",value:10}];player.attackSlots[1].enchantments=[{stat:"ATK",value:10}]');
assert(run('applyGoldenCrafterChoice(player,"synergy:example:0:1",[recipe]).success'));
assert.equal(run('player.attackSlots[0].id'),'fusion');assert.equal(run('player.attackSlots[1]'),null);assert.equal(run('player.attackSlots[0].enchantments.length'),2);assert.equal(run('player.pendingUpgrades'),2);
assert.equal(run('goldenCrafterChoices(player,[recipe]).length'),0);
run('player.attackSlots=[{id:"b",maxLevel:2,level:2},{id:"a",maxLevel:3,level:3}];var bad={...recipe,createWeapon:()=>({id:"wrong"})}');
assert.equal(run('applyGoldenCrafterChoice(player,"synergy:example:0:1",[bad]).consumed'),false);assert.equal(run('player.attackSlots[0].id'),'b');
assert.equal(run('synergyRecipes.length'),1); // Test recipes never enter the live registry.
console.log('PASS: real MAX-pair eligibility, atomic fusion, free slot, duplicate enchantment inheritance, invalid-output rejection and no invented live recipes.');


run('player.attackSlots=[{id:"aris-laser",level:7,maxedOrder:2},{id:"luminous-nova",maxLevel:7,level:7,maxedOrder:1}];applyGoldenCrafterChoice(player,goldenCrafterChoices(player)[0].id)');
assert.equal(run('player.attackSlots[0].synergyTopWeaponId'),'luminous-nova');
run('player.attackSlots=[{id:"aris-laser",level:7,maxedOrder:1},{id:"luminous-nova",maxLevel:7,level:7,maxedOrder:2}];applyGoldenCrafterChoice(player,goldenCrafterChoices(player)[0].id)');
assert.equal(run('player.attackSlots[0].synergyTopWeaponId'),'aris-laser');
console.log('PASS: first MAX weapon determines the top crossed icon layer regardless of inventory order.');
