const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({});vm.runInContext(fs.readFileSync('Development/weapon-glow.js','utf8').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
for(const id of ['bad-cooking','molotov-cocktail','saint-predator']){
 c.id=id;assert.equal(run('enhancedWeaponGlow({id,level:6,maxLevel:7})'),'');assert.equal(run('enhancedWeaponGlow({id,level:7,maxLevel:7})'),'#ffd45a');assert.equal(run('enhancedWeaponGlow({id,level:7,maxLevel:7,enhancementRank:0})'),'#ffd45a');
}
assert.equal(run('enhancedWeaponGlow({id:"aris-laser",level:7})'),'#65cfff');assert.equal(run('enhancedWeaponGlow({id:"luminous-nova",level:7})'),'#ff71d5');assert.equal(run('enhancedWeaponGlow({id:"plana-umbrella",level:7,awakened:true})'),'');
assert.equal(run('enhancedWeaponGlow({id:"racer-pass",level:3,maxLevel:3})'),'');assert.equal(run('enhancedWeaponGlow({id:"racer-pass",level:1,isSuper:true})'),'#ffd45a');
run('var icon={style:{}};applyEnhancedWeaponGlow(icon,{id:"bad-cooking",level:7})');assert(run('icon.style.filter.includes("#ffd45a")'));run('applyEnhancedWeaponGlow(icon,{id:"bad-cooking",level:1})');assert.equal(run('icon.style.filter'),'');
console.log('PASS golden MAX glow for all basic weapons, existing blue/pink colors, Plana awakened CSS, Super items and lower-level cleanup.');
