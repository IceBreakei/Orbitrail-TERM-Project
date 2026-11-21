const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({});for(const file of ['game-config','tuning-parts','item-catalog','combat-stats'])vm.runInContext(fs.readFileSync(`Development/${file}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var p={label:"Plana",tuningParts:createTuningRun(),combatStats:{critPercent:5},combatBuffs:{test:{critPercent:10}}};');
for(const [level,bonus] of [[1,10],[2,20],[3,30]]){
 run(`p.tuningParts.equipped[0]={id:"critical-tuning",level:${level}}`);
 const threshold=(5+10+5+bonus)/100;
 assert(run(`rollAttackDamage(p,1,()=>${threshold}-.001,{weaponId:"plana-umbrella",targetCritBonus:5}).critical`));
 assert.equal(run(`rollAttackDamage(p,1,()=>${threshold},{weaponId:"plana-umbrella",targetCritBonus:5}).critical`),false);
 assert.equal(run('rollAttackDamage(p,1,()=>.2,{weaponId:"aris-laser",targetCritBonus:5}).critical'),false);
 assert.equal(run('p.combatStats.critPercent'),5);
}
run('p.combatStats.critPercent=95');assert(run('rollAttackDamage(p,1,()=>.99999,{weaponId:"plana-umbrella"}).critical'));
assert.equal(run('tuningPartCatalog.find(p=>p.id==="critical-tuning").weight'),2);assert(fs.existsSync('sprites/icons/Unidentified Data Chip.png'));
console.log('PASS: Critical Tuning10/20/30points add to base/buff/target crit,clamp100%,starting weapon only,weight2 and asset.');
