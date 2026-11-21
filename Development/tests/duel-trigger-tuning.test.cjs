const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['game-config','tuning-parts','item-catalog','combat-stats'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);run('var p={label:"Test",mainWeaponId:"test-multi",level:10,growthRank:3,tuningParts:createTuningRun(),attackSlots:[{id:"test-multi",attackType:"Multishot",ranged:true,attackCount:3,enhancementRank:2}]};');
for(const [level,extra] of [[1,1],[2,2]]){
 run(`p.tuningParts.equipped[0]={id:"duel-trigger-tuning",level:${level}}`);assert.equal(run('startingWeaponProjectileCount(p,"test-multi",3)'),3+extra);assert.equal(run('startingWeaponProjectileCount(p,"other",3)'),3);
 const value=run('totalWeaponDamage(p,"test-multi",1,[],{projectileCount:3,hitCooldownFrames:30})');const expected=run(`weaponDamageFormula(1,[],{projectileCount:${3+extra},hitCooldownFrames:30,enhancementRank:2,growthEligible:true,growthRank:3,playerLevel:10})`);assert.equal(value,expected);
}
run('p.attackSlots[0].attackType="Melee"');assert.equal(run('startingWeaponProjectileCount(p,"test-multi",3)'),3);run('p.attackSlots[0].attackType="Multishot";p.attackSlots[0].ranged=false');assert.equal(run('startingWeaponProjectileCount(p,"test-multi",3)'),3);
run('var state=createTuningRun();state.equipped[0]={id:"duel-trigger-tuning",level:1}');assert(run('strengthenTuningPart(state,{id:"power-tuning",level:3},0)'));assert.equal(run('state.equipped[0].level'),2);assert.equal(run('strengthenTuningPart(state,{id:"cold-tuning",level:1},0)'),false);assert.equal(run('equipTuningPart(state,{id:"duel-trigger-tuning",level:3},1).ok'),false);
assert.equal(run('tuningPartCatalog.find(p=>p.id==="duel-trigger-tuning").weight'),1);assert(fs.existsSync('sprites/icons/Colorful Penlights.png'));
console.log('PASS:+1/+2onlyrangedMultishotstarter,enhancement/Growthsplitcount,LV2max andicon.');
