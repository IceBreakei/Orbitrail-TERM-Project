const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({showDamageNumber(){},recordWeaponMax(){},rollLevelUpgrades:()=>[]});
for(const name of ['game-config','item-catalog','tuning-parts','combat-stats','player-stats','gacha-file-rules'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var p={maxHp:70,hp:70,equipmentSlots:[],attackSlots:[]};ensurePlayerStats(p)');
assert(run("itemUpgradeChoices(p).some(c=>c.id==='racer-new')"));assert(run("applyItemUpgrade(p,'racer-new')"));
assert.equal(run('createRacerPass().weight'),1);
for(const [level,size,pickup] of [[1,10,30],[2,15,40],[3,20,50]]){
 run(`p.equipmentSlots[0].level=${level}`);assert.equal(run('racerPassBonuses(p).size'),size);assert.equal(run('racerPassBonuses(p).pickup'),pickup);assert.equal(run('weaponSizeMultiplier(p)'),1+size/100);assert.equal(run('weaponKnockbackMultiplier(p)'),1+size/100);
}
assert(!run("itemUpgradeChoices(p).some(c=>c.id==='racer-level')"));
run('p.weaponSizeBonusPercent=15');assert.equal(run('weaponSizeMultiplier(p)'),1.35);
run('p.weaponSizeBonusPercent=0;var rewards=rollFileRewards(p,{forceType:"super",random:()=>0});');assert.equal(run('rewards.products[0].weapon.id'),'racer-pass');assert(run('acceptFileProduct(p,rewards.products[0])'));
run('ensurePlayerStats(p);ensurePlayerStats(p)');assert.equal(run('p.maxHp'),90);assert.equal(run('p.hp'),90);assert.equal(run('p.equipmentSlots.length'),1);assert.equal(run('racerPassBonuses(p).pickup'),100);assert.equal(run('weaponSizeMultiplier(p)'),1.3);
run('p.equipmentSlots=[];ensurePlayerStats(p)');assert.equal(run('p.maxHp'),70);assert.equal(run('p.hp'),70);
run("p.disabledItemIds=['racer-pass']");assert(!run("itemUpgradeChoices(p).some(c=>c.id==='racer-new')"));
assert(fs.existsSync('sprites/items/Racer Pass.png'));
console.log('PASS default Racer Pass, three ranks, additive size family, knockback/pickup, Super File replacement, +20HP once/removal, slot preservation and disable.');

vm.runInContext(fs.readFileSync('Development/weapon-progression.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
run("p.disabledItemIds=[];p.equipmentSlots=[createRacerPass()];p.attackSlots=[{id:'plana-umbrella',level:1}]");assert.equal(run('umbrellaLevelStats(p).areaScale'),1.1);
assert.equal(run('badCookingLevelStats(1).radius*weaponSizeMultiplier(p)'),154);
assert(Math.abs(run('molotovLevelStats(1).radius*weaponSizeMultiplier(p)')-99)<1e-10);
assert.equal(run('pickupRangeFormula(racerPassBonuses(p).pickup,40)'),52);
console.log('PASS umbrella, cooking and Molotov share item size; pickup radius receives additive percentage.');

vm.runInContext(fs.readFileSync('Development/weapon-glow.js','utf8').replaceAll('export ',''),c);
assert.equal(run('enhancedWeaponGlow(createRacerPass(true))'),'#ffd45a');assert.equal(run('enhancedWeaponGlow(createMalkuthHat(true))'),'#ffd45a');assert.equal(run('enhancedWeaponGlow(createRacerPass())'),'');
run('var icon={style:{}};applyEnhancedWeaponGlow(icon,createRacerPass(true))');assert(run('icon.style.filter.includes("#ffd45a")'));run('applyEnhancedWeaponGlow(icon,createRacerPass())');assert.equal(run('icon.style.filter'),'');
console.log('PASS golden Super item glow and clean removal on normal icons.');

assert.equal(run('createRacerPass().iconFit'),true);assert.equal(run('createRacerPass().iconCrop.width'),214);assert.equal(run('createRacerPass(true).iconCrop.height'),220);assert.equal(run('createMalkuthHat().iconFit'),true);
console.log('PASS item icon fit metadata removes transparent padding for normal and Super forms.');
