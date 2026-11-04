const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let notes=0;
const c=vm.createContext({showDamageNumber(){},getLootTotals:()=>({secretTechNotes:notes}),spendSecretTechNotes:amount=>{if(notes<amount)return false;notes-=amount;return true;}});
for(const name of ['game-config','combat-stats','player-stats','weapon-progression','firing-rings','aris-weapon','luminous-nova','weapon-max-order','upgrade-label','level-upgrades'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ','').replaceAll('import.meta.url',"'file:///Development/aris-weapon.js'"),c);
const run=s=>vm.runInContext(s,c);
run("var weapon={id:'plana-umbrella',name:\"Plana's Umbrella\",level:1};var player={label:'Plana',attackSlots:[weapon],maxHp:110,hp:1};ensurePlayerStats(player);addPlayerExp(player,player.maxExp)");
assert.equal(run('player.level'),2);assert.equal(run('player.hp'),110);assert.equal(run('player.pendingUpgrades'),1);
assert.equal(run('rollLevelUpgrades(player).length'),3);
for(let level=2;level<=7;level++) {
 run('player.pendingUpgrades=1');assert(run("applyLevelUpgrade(player,'umbrella-level')"));
 assert.equal(run('weapon.level'),level);
 assert(!run("applyLevelUpgrade(player,'umbrella-level')"));
}
assert.equal(run('weapon.level'),7);assert.equal(run('weapon.awakened'),undefined);
assert.equal(run('rollLevelUpgrades(player).length'),2); // Aris and Luminous acquisition remain available.
run('player.pendingUpgrades=1');assert(!run("applyLevelUpgrade(player,'umbrella-awaken')"));
notes=1;assert(!run("rollLevelUpgrades(player).some(choice=>choice.id==='umbrella-awaken')"));
assert(!run("applyLevelUpgrade(player,'umbrella-awaken')"));assert.equal(notes,1);
assert.equal(run('rollLevelUpgrades(player).length'),2); // Aris and Luminous acquisition remain available.
assert.equal(run('rollUmbrellaDamage(player,23,()=>1).damage'),128);
assert(run('rollUmbrellaDamage(player,23,()=>1).critical'));
assert.equal(run('rollUmbrellaDamage(player,23,()=>1).type'),'supercritical');
run('weapon.level=4');assert.equal(run('umbrellaLevelStats(player).intervalMultiplier'),.9);
run('weapon.level=6');assert(Math.abs(run('umbrellaLevelStats(player).areaScale**2')-1.4)<1e-8);
assert.equal(run('umbrellaLevelStats(player).damageMultiplier'),1.6900000000000002);
console.log('PASS: one weapon choice, level7cap, queued spending, no awakening via level-up, guaranteed3x crit and cumulative bonuses.');

run('player.pendingUpgrades=1');assert(run("applyLevelUpgrade(player,'aris-new')"));
assert.equal(run('player.attackSlots.length'),2);assert.equal(run('getArisWeapon(player).level'),1);
for(let level=2;level<=7;level++) {run('player.pendingUpgrades=1');assert(run("applyLevelUpgrade(player,'aris-level')"));assert.equal(run('getArisWeapon(player).level'),level);}
assert(!run("rollLevelUpgrades(player).some(choice=>choice.id==='aris-level')"));
notes=1;run('player.pendingUpgrades=1');assert(!run("applyLevelUpgrade(player,'aris-awaken')"));assert.equal(notes,1);assert(!run('getArisWeapon(player).awakened'));
console.log('PASS: Aris acquisition beside Umbrella, levels2-7 and no unimplemented awakening.');


run('player.pendingUpgrades=1');assert(run("applyLevelUpgrade(player,'luminous-new')"));
assert.equal(run('getLuminousNova(player).level'),1);
for(let level=2;level<=7;level++){run('player.pendingUpgrades=1');assert(run("applyLevelUpgrade(player,'luminous-level')"));assert.equal(run('getLuminousNova(player).level'),level);}
assert(!run("applyLevelUpgrade(player,'luminous-level')"));

// Owning the synergy suppresses both consumed weapons, including stale upgrade requests.
run('player.attackSlots=[{id:"princess-key",isSynergy:true,level:1,consumedWeaponIds:["aris-laser","luminous-nova"]}];player.pendingUpgrades=1');
assert(!run('rollLevelUpgrades(player).some(choice=>choice.id.startsWith("aris-")||choice.id.startsWith("luminous-"))'));
assert(!run('applyLevelUpgrade(player,"aris-new")'));assert(!run('applyLevelUpgrade(player,"luminous-new")'));
run('player.attackSlots=[]');assert(run('rollLevelUpgrades(player).some(choice=>choice.id==="aris-new")'));
console.log('PASS: synergy ingredients excluded while owned and stale acquisitions rejected.');

assert.equal(run('upgradeLevelLabel({level:1})'),'LV 1 -> LV 2');
assert.equal(run('upgradeLevelLabel({level:6})'),'LV 6 -> MAX');
assert.equal(run('upgradeLevelLabel({level:2,maxLevel:3})'),'LV 2 -> MAX');
console.log('PASS: current-to-next upgrade labels and MAX endpoint.');
