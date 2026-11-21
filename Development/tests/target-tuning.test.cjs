const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const enemies=new Map(['a','b','c'].map(id=>[id,{id,hp:1000}])),hits=[];
const c=vm.createContext({getEnemy:id=>enemies.get(id),damageEnemy:(id,damage,source,type,options)=>{hits.push({id,damage,type,options});return enemies.get(id)}});
for(const name of ['tuning-parts','target-tuning'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);c.enemies=enemies;
run('var p={label:"Plana",tuningParts:createTuningRun()};p.tuningParts.equipped[0]={id:"target-tuning",level:1};var shot={};onTargetTuningHit({player:p,projectile:shot,enemy:enemies.get("a"),damage:100})');assert.equal(hits.length,0);
run('onTargetTuningHit({player:p,projectile:shot,enemy:enemies.get("b"),damage:100})');assert.equal(run('p.tuningParts.targetMarkedIds.has("b")'),false);assert.equal(hits.length,0);
run('onTargetTuningHit({player:p,projectile:{},enemy:enemies.get("b"),damage:100,hitType:"critical"})');assert.equal(hits.length,1);assert.equal(hits[0].id,'a');assert.equal(hits[0].damage,20);assert.equal(hits[0].type,'critical');assert(hits[0].options.targetTransfer);
for(const [level,percent] of [[1,20],[2,25],[3,30]]){run(`p.tuningParts.equipped[0].level=${level};shareTargetTuningDamage({player:p,enemy:enemies.get("a"),damage:100})`);assert.equal(hits.at(-1).id,'b');assert.equal(hits.at(-1).damage,percent);}
const count=hits.length;run('shareTargetTuningDamage({player:p,enemy:enemies.get("c"),damage:100})');assert.equal(hits.length,count);
enemies.delete('b');run('shareTargetTuningDamage({player:p,enemy:enemies.get("a"),damage:100})');assert.equal(run('p.tuningParts.targetMarkedIds.has("b")'),false);
assert.equal(run('tuningPartCatalog.find(p=>p.id==="target-tuning").weight'),9);assert(fs.existsSync('sprites/icons/Marker Buoy.png'));
console.log('PASS: first target per projectile,marked-only20/25/30percent sharing,no recursive hooks,dead mark cleanup,weight9 and icon.');
