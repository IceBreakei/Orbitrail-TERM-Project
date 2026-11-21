const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['game-config','tuning-parts','item-catalog','combat-stats','weapon-progression'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);run('var p={label:"Plana",tuningParts:createTuningRun(),attackSlots:[{id:"plana-umbrella",level:1}]};');
for(const [level,scale] of [[1,1.15],[2,1.2],[3,1.25]]){
 run(`p.tuningParts.equipped[0]={id:"size-up-tuning",level:${level}};p.attackSlots[0].level=1`);assert.equal(run('startingWeaponSizeScale(p,"plana-umbrella")'),scale);assert.equal(run('umbrellaLevelStats(p).areaScale'),scale);assert.equal(run('startingWeaponSizeScale(p,"aris-laser")'),1);
 run('p.attackSlots[0].level=6');assert(Math.abs(run('umbrellaLevelStats(p).areaScale')-Math.sqrt(1.4)*scale)<1e-9);assert.equal(run('totalWeaponDamage(p,"plana-umbrella",1)'),1);
}
run('p.tuningParts.equipped[0]=null');assert.equal(run('startingWeaponSizeScale(p,"plana-umbrella")'),1);
assert(fs.existsSync('sprites/icons/Cherino Matryoshka.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="size-up-tuning").weight'),4);
console.log('PASS: size1.15/1.2/1.25,multiplicative weapon-level stacking,orbit multiplier,starting weapon isolation and asset.');
