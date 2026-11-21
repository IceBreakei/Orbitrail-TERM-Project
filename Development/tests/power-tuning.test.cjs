const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({});
for(const file of ['game-config','tuning-parts','item-catalog','combat-stats','weapon-progression']){
 const text=fs.readFileSync(`Development/${file}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ','');vm.runInContext(text,c);
}
const run=s=>vm.runInContext(s,c);
run('var p={label:"Plana",level:50,growthRank:0,attackSlots:[{id:"plana-umbrella",level:1,enhancementRank:5}],tuningParts:createTuningRun()};var plain=totalWeaponDamage(p,"plana-umbrella",1.2);var other=totalWeaponDamage(p,"other",3);');
for(const [level,damage,crit] of [[1,15,5],[2,20,10],[3,25,15]]){
 run(`p.tuningParts.equipped[0]={id:"power-tuning",level:${level}}`);
 assert(Math.abs(run('totalWeaponDamage(p,"plana-umbrella",1.2)-plain')-1.2*damage/100)<1e-9);
 assert.equal(run('totalWeaponDamage(p,"other",3)'),run('other'));
 assert.equal(run('startingWeaponTuning(p,"plana-umbrella","critDamagePercent")'),crit);
 assert.equal(run('startingWeaponTuning(p,"other","critDamagePercent")'),0);
 assert.equal(run('tuningSellValue(p.tuningParts.equipped[0],{})'),50*level);
}
run('var critOptions;rollAttackDamage=(p,d,r,o)=>{critOptions=o;return {damage:1,critical:true}};rollUmbrellaDamage(p)');assert.equal(run('critOptions.weaponId'),'plana-umbrella');
run('var weighted=createTuningRun();var pool=[{id:"heavy",weight:4},{id:"light",weight:1}]');
assert.equal(run('rollTuningPart(weighted,{type:"yuuka"},()=>.79,pool).id'),'heavy');assert.equal(run('rollTuningPart(weighted,{type:"yuuka"},()=>.81,pool).id'),'light');
assert(fs.existsSync('sprites/icons/Event 06 - Buff 1.png'));
console.log('PASS: all three levels apply only to starting base damage, leave enhancement damage/other weapons unchanged, provide crit bonuses and weighted rolls; icon exists.');

run('p.growthRank=3;p.tuningParts.equipped[0]=null;var grown=totalWeaponDamage(p,"plana-umbrella",1.2);var noGrowth=totalWeaponDamage(p,"plana-umbrella",1.2,[],{growthEligible:false})');
assert(run('grown')>run('noGrowth'));assert.equal(run('noGrowth'),run('plain'));
console.log('PASS: splash can inherit enhancement damage while explicitly excluding Growth.');
