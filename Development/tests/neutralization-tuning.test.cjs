const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['tuning-parts','neutralization-tuning'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);run('var p={label:"Plana",tuningParts:createTuningRun()};var enemy={hp:100};');
for(const [level,stun,erase] of [[1,.1,.2],[2,.2,.3],[3,.3,.4]]){
 run(`p.tuningParts.equipped[0]={id:"neutralization-tuning",level:${level}};enemy.stunRemaining=0`);
 assert.equal(run(`tryNeutralizationHit({player:p,enemy,random:()=>${stun}})`),false);assert(run(`tryNeutralizationHit({player:p,enemy,random:()=>${stun}-.001})`));assert.equal(run('enemy.stunRemaining'),1);
 run('var shot={};var bullets=[{ownerType:"shooter"},{ownerType:"shooter"}]');assert.equal(run(`eraseTuningProjectiles({player:p,attack:shot,projectiles:bullets,intersects:()=>true,random:()=>${erase}})`),false);
 assert.equal(run('eraseTuningProjectiles({player:p,attack:shot,projectiles:bullets,intersects:()=>true,random:()=>0})'),false);
 run('updateNeutralizationTuning(1)');assert(run('eraseTuningProjectiles({player:p,attack:shot,projectiles:bullets,intersects:()=>true,random:()=>0})'));assert.equal(run('bullets.length'),1);
 assert.equal(run('eraseTuningProjectiles({player:p,attack:shot,projectiles:bullets,intersects:()=>true,random:()=>0})'),false);
}
for(const type of ['neru','iroha'])assert.equal(run(`canEraseEnemyProjectile({ownerType:"${type}"})`),false);
for(const kind of ['ground-pound','smash','ram','self-destruct','explosion'])assert.equal(run(`canEraseEnemyProjectile({kind:"${kind}"})`),false);
assert.equal(run('canEraseEnemyProjectile({erasable:false})'),false);
assert(fs.existsSync("sprites/icons/Warakuhime's Fan.png"));assert.equal(run('tuningPartCatalog.find(p=>p.id==="neutralization-tuning").weight'),2);
console.log('PASS:10/20/30percent1s stun,20/30/40percent erasure,1s attack cooldown after success/failure and all listed immunities.');
