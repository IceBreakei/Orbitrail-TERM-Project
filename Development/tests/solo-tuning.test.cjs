const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['game-config','tuning-parts','item-catalog','combat-stats'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var p={label:"Plana",level:50,growthRank:3,tuningParts:createTuningRun(),attackSlots:[{id:"plana-umbrella",enhancementRank:5}]};var plain=totalWeaponDamage(p,"plana-umbrella",2)');
for(const [level,percent] of [[1,5],[2,10],[3,15]]){
 run(`p.tuningParts.equipped[0]={id:"solo-tuning",level:${level}}`);assert.equal(run('emptyWeaponSlotCount(p)'),5);assert(Math.abs(run('totalWeaponDamage(p,"plana-umbrella",2)-plain')-2*5*percent/100)<1e-9);
 assert.equal(run('totalWeaponDamage(p,"other",2)'),2);assert.equal(run('totalWeaponDamage(p,"plana-umbrella",2,[],{soloTuningEligible:false})'),run('plain'));
}
run('p.attackSlots.push({id:"second"})');assert.equal(run('emptyWeaponSlotCount(p)'),4);assert(Math.abs(run('totalWeaponDamage(p,"plana-umbrella",2)-plain')-2*.6)<1e-9);
run('p.attackSlots=[{id:"plana-umbrella"},{id:"2"},{id:"3"},{id:"4"},{id:"5"},{id:"6"}]');assert.equal(run('emptyWeaponSlotCount(p)'),0);assert.equal(run('totalWeaponDamage(p,"plana-umbrella",2)'),run('weaponDamageFormula(2,[],{growthEligible:true,growthRank:3,playerLevel:50})'));
assert(fs.existsSync('sprites/icons/Rokuwakaku Model.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="solo-tuning").weight'),9);
console.log('PASS:5/10/15percent perempty slot,dynamic occupied slots,flat enhancement/Growth exclusion,startingweapon scope,future sword optout,weight9 andasset.');
