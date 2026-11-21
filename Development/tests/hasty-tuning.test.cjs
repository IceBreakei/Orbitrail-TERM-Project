const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['game-config','tuning-parts','item-catalog','combat-stats','weapon-progression'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);run('var p={label:"Plana",tuningParts:createTuningRun(),attackSlots:[{id:"plana-umbrella",level:1}]};');
for(const [level,reduction] of [[1,.15],[2,.20],[3,.25]]){
 run(`p.tuningParts.equipped[0]={id:"hasty-tuning",level:${level}};p.attackSlots[0].level=1`);assert.equal(run('umbrellaLevelStats(p).intervalMultiplier'),1-reduction);
 run('p.attackSlots[0].level=4');assert.equal(run('umbrellaLevelStats(p).intervalMultiplier'),.9*(1-reduction));
 for(const haste of [0,25,100])assert.equal(run(`attackTimeFormula(1.5*umbrellaLevelStats(p).intervalMultiplier,${haste})`),run(`attackTimeFormula(1.5*.9*${1-reduction},${haste})`));
 assert.equal(run('startingWeaponTuning(p,"aris-laser","attackTimeReductionPercent")'),0);
}
assert.equal(run('tuningPartCatalog.find(p=>p.id==="hasty-tuning").weight'),2);assert(fs.existsSync('sprites/icons/Cheering Flag.png'));
console.log('PASS: Hasty Tuning15/20/25percent time reductions multiply with weapon levels and Haste,starting weapon only.');
