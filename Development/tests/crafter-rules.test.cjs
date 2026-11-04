const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');let credits=10000,notes=1;
const c=vm.createContext({getLootTotals:()=>({credits,secretTechNotes:notes}),spendCredits:n=>{if(credits<n)return false;credits-=n;return true},spendSecretTechNotes:n=>{if(notes<n)return false;notes-=n;return true}});
for(const n of ['game-config','weapon-max-order','crafter-rules'])vm.runInContext(fs.readFileSync('Development/'+n+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
assert.equal(run('crafterSettings.dropChance'),1/1301);assert.equal(run('crafterSettings.maxGround'),20);
assert.equal(run('crafterEnhancementCost(1)'),50);assert.equal(run('crafterEnhancementCost(5)'),250);
assert.equal(run('crafterEnhancementChance(1)'),1);assert(Math.abs(run('crafterEnhancementChance(2)')-.9)<1e-9);assert.equal(run('crafterEnhancementChance(50)'),.1);
assert.equal(run('crafterEnhancementChance(50,20)'),.30000000000000004);
run('var umbrella={id:"plana-umbrella",name:"Umbrella",level:6};var laser={id:"aris-laser",level:7};var player={label:"Plana",pendingUpgrades:3,attackSlots:[umbrella,laser]}');
assert(run('applyCrafterChoice(player,"weapon:0:level").success'));assert.equal(run('umbrella.level'),7);assert.equal(run('player.pendingUpgrades'),3);assert.equal(credits,10000);
assert(run('applyCrafterChoice(player,"weapon:0:awaken").success'));assert.equal(notes,0);assert(run('umbrella.awakened'));
assert(!run('crafterChoices(player).some(c=>c.id==="weapon:1:awaken")'));
assert(run('applyCrafterChoice(player,"weapon:0:enhance",()=>0).success'));assert.equal(credits,9950);assert.equal(run('umbrella.enhancementRank'),1);
const failure=run('applyCrafterChoice(player,"weapon:0:enhance",()=>.95)');assert.equal(failure.success,false);assert.equal(failure.consumed,true);assert.equal(credits,9850);assert.equal(run('umbrella.enhancementRank'),1);
credits=0;assert.equal(run('applyCrafterChoice(player,"weapon:0:enhance").consumed'),false);
run('player.equipmentSlots=[{id:"test",level:1,maxLevel:2}];applyCrafterChoice(player,"item:0:level")');assert.equal(run('player.equipmentSlots[0].level'),2);assert.equal(run('crafterChoices(player).some(c=>c.kind==="item")'),false);
assert.equal(run('weaponDamageFormula(1.2,[30,30],{enhancementRank:1})'),run('weaponDamageFormula(1.2,[30,30],{})+.2'));
assert.equal(run('weaponDamageFormula(3,[50],{enhancementRank:2,projectileCount:2})'),4.7);
assert.equal(run('goldenCrafterChance(20)'),.02);
console.log('PASS: Crafter costs/chances, one-use success/failure, no-charge rejection, capped item upgrades, umbrella-only awakening and additive projectile-split enhancements.');

// New weapons declare their own MAX level, so Crafter support needs no hardcoded branch.
vm.runInContext(fs.readFileSync('Development/luminous-nova.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
run('player.attackSlots.push(createLuminousNovaWeapon())');
assert(run('applyCrafterChoice(player,"weapon:2:level").success'));assert.equal(run('player.attackSlots[2].level'),2);
credits=100;run('player.attackSlots[2].level=7');assert(run('applyCrafterChoice(player,"weapon:2:enhance",()=>0).success'));
assert(!run('crafterChoices(player).some(choice=>choice.id==="weapon:2:awaken")'));

run('var synergyPlayer={attackSlots:[{id:"princess-key",name:"The Princess and the Key",level:1,maxLevel:1,isSynergy:true}]};var synergyOptions=crafterChoices(synergyPlayer)');
assert.equal(run('synergyOptions.length'),1);assert(run('synergyOptions[0].id.endsWith(":enhance")'));
assert(run('applyCrafterChoice(synergyPlayer,synergyOptions[0].id,()=>0).success'));
assert.equal(run('synergyPlayer.attackSlots[0].level'),1);assert.equal(run('synergyPlayer.attackSlots[0].enhancementRank'),1);
console.log('PASS: synergy stays LV1 and only gains Crafter enhancement ranks.');
