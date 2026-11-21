const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({healPlayer:(p,n)=>{p.hp=Math.min(p.maxHp,p.hp+n)}});
for(const name of ['tuning-parts','repair-tuning'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);run('var p={label:"Plana",hp:10,maxHp:100,tuningParts:createTuningRun()};');
for(const [level,cap] of [[1,5],[2,10],[3,15]]){
 run(`p.hp=10;p.tuningParts.repairCooldown=0;p.tuningParts.equipped[0]={id:"repair-tuning",level:${level}};var rolls=[.149,.999999]`);
 assert.equal(run('tryRepairTuningHit({player:p,random:()=>rolls.shift()})'),cap);assert.equal(run('p.hp'),10+cap);
 assert.equal(run('tryRepairTuningHit({player:p,random:()=>0})'),false);run('updateRepairTuning(p,.99)');assert.equal(run('tryRepairTuningHit({player:p,random:()=>0})'),false);
 run('updateRepairTuning(p,.01)');assert.equal(run('tryRepairTuningHit({player:p,random:()=>0})'),1);
}
run('p.tuningParts.repairCooldown=0');assert.equal(run('tryRepairTuningHit({player:p,random:()=>.15})'),false);assert.equal(run('p.tuningParts.repairCooldown'),1);
run('updateRepairTuning(p,0)');assert.equal(run('p.tuningParts.repairCooldown'),1);
run('updateRepairTuning(p,1);p.hp=99');assert.equal(run('tryRepairTuningHit({player:p,random:()=>0})'),1);assert.equal(run('p.hp'),100);
run('p.hp=50;p.tuningParts.repairCooldown=0');assert.equal(run('tryRepairTuningHit({player:p,weaponId:"aris-laser",random:()=>0})'),false);
assert(fs.existsSync('sprites/icons/Pipe Wrench.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="repair-tuning").weight'),1);
console.log('PASS:15percent chance,5/10/15percent HP caps,1s attempt gate,paused timer,no overheal,starting weapon scope and asset.');
