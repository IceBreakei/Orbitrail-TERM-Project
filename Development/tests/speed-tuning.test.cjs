const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['game-config','tuning-parts','item-catalog','combat-stats','character-stats-panel'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);run('var p={label:"Plana",combatStats:{spdPercent:10},tuningParts:createTuningRun()};');
for(const [level,spd] of [[1,20],[2,30],[3,40]]){
 run(`p.tuningParts.equipped[0]={id:"speed-tuning",level:${level}}`);assert.equal(run('statMultiplier(p,"spdPercent")'),1+(10+spd)/100);assert.equal(run('totalWeaponDamage(p,"plana-umbrella",2)'),1.6);assert.equal(run('totalWeaponDamage(p,"aris-laser",2)'),2);assert.equal(run('p.combatStats.spdPercent'),10);assert.equal(run('characterStatRows[2][2](p)'),`+${10+spd}%`);
}
run('p.tuningParts.equipped[1]={id:"power-tuning",level:1}');assert(Math.abs(run('totalWeaponDamage(p,"plana-umbrella",2)')-2*1.15*.8)<1e-9);
run('p.tuningParts.equipped=[null,null,null]');assert.equal(run('statMultiplier(p,"spdPercent")'),1.1);assert.equal(run('totalWeaponDamage(p,"plana-umbrella",2)'),2);
assert.equal(run('tuningPartCatalog.find(p=>p.id==="speed-tuning").weight'),3);assert(fs.existsSync('sprites/icons/Event 41 - Slippers.png'));
console.log('PASS: Speed Tuning20/30/40SPD,20percent main-base penalty,additive SPD/product damage stacking,shared stat display and clean removal.');
