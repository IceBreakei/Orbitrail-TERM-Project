const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const hits=[];const c=vm.createContext({getEnemyHurtbox:e=>({x:e.x,y:e.y,rx:10,ry:10}),damageEnemy:(...args)=>hits.push(args)});
for(const name of ['tuning-parts','frozen-status','cold-tuning'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var p={label:"Plana",tuningParts:createTuningRun()};p.tuningParts.equipped[0]={id:"cold-tuning",level:1};var target={id:"cold-target",hp:100,x:0,y:0,secondsSincePlayerHit:3.99};var args={player:p,enemy:target,random:()=>0,rollDamage:(enemy,m)=>({damage:100*m,type:"normal"})}');
assert.equal(run('tryColdTuningHit(args)'),false);assert.equal(hits.length,0);
run('target.secondsSincePlayerHit=4');assert.equal(run('tryColdTuningHit({...args,random:()=>.4})'),false);
for(const [level,damage] of [[1,50],[2,60],[3,70]]){
 run(`p.tuningParts.equipped[0].level=${level};target.frozenRemaining=0`);assert(run('tryColdTuningHit({...args,random:()=>.399})'));assert.equal(run('target.frozenRemaining'),3);assert.equal(hits.at(-1)[1],damage);
 const count=hits.length;assert.equal(run('tryColdTuningHit(args)'),false);assert.equal(hits.length,count);
}
run('target.frozenRemaining=0;target.secondsSincePlayerHit=0');assert.equal(run('tryColdTuningHit(args)'),false);
run('target.secondsSincePlayerHit=4');assert.equal(run('tryColdTuningHit({...args,weaponId:"aris-laser"})'),false);
run('target.hp=0');assert.equal(run('tryColdTuningHit(args)'),false);
assert(fs.existsSync('sprites/icons/Wooden Doll - Nagusa.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="cold-tuning").weight'),3);
console.log('PASS:40percent boundary,4s safety,3s Frozen,50/60/70percent weapon damage once,no frozen retrigger,starting weapon only and icon/catalog.');
