const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['game-config','tuning-parts','item-catalog','combat-stats','weak-tuning'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var p={label:"Plana",tuningParts:createTuningRun()};var target={hp:100,contactDamage:100,bonusDamageTakenPercent:[10]};attackDamageFormula=(weapon,atk,mod)=>mod;');
for(const [level,chance,atk,def] of [[1,.2,20,5],[2,.25,25,7],[3,.3,30,10]]){
 run(`p.tuningParts.equipped[0]={id:"weak-tuning",level:${level}};target.weakRemaining=0`);assert.equal(run(`tryWeakTuningHit({player:p,enemy:target,random:()=>${chance}})`),false);assert(run(`tryWeakTuningHit({player:p,enemy:target,random:()=>${chance}-.001})`));assert.equal(run('target.weakRemaining'),3);assert.equal(run('weakenedAttackMultiplier(target)'),1-atk/100);assert.equal(run('target.contactDamage'),100);
 assert(Math.abs(run('rollAttackDamage(p,1,()=>.5,{target}).damage')-(1+(10+def)/100))<1e-9);
 run('updateWeakTuning(target,0)');assert.equal(run('target.weakRemaining'),3);run('updateWeakTuning(target,3)');assert.equal(run('weakenedAttackMultiplier(target)'),1);assert.equal(run('rollAttackDamage(p,1,()=>.5,{target}).damage'),1.1);
}
assert(fs.existsSync('sprites/icons/Souvenir Doll.png'));assert(fs.existsSync('sprites/icons/Expo Souvenirs.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="weapon-tuning").icon'),'../sprites/icons/Expo Souvenirs.png');assert.equal(run('tuningPartCatalog.find(p=>p.id==="weak-tuning").weight'),4);
console.log('PASS:Weak20/25/30percent proc/ATK,5/7/10percent additive vulnerability,3s expiry,no base mutation and both icons.');
