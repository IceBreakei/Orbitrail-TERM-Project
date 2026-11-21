const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const drops=[];const c=vm.createContext({spawnTestDrop:(...args)=>{drops.push(args);return args;}});
for(const name of ['tuning-parts','luxery-tuning'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);run('var player={label:"Plana",tuningParts:createTuningRun()};var enemy={x:12,y:34};');
for(const [level,base] of [[1,3],[2,4],[3,5]]){
 run(`player.tuningParts.equipped[0]={id:"luxery-tuning",level:${level}}`);
 for(const damage of [1,9,10,35,100,1000]){
  const bonus=Math.floor(Math.min(100,damage)/10),chance=(base+bonus)/100;
  assert.equal(run(`tryLuxeryTuningHit({player,enemy,damage:${damage},random:()=>${chance}})`),false);
  run(`var rolls=[${chance}-.0001,0];tryLuxeryTuningHit({player,enemy,damage:${damage},random:()=>rolls.shift()})`);assert.equal(drops.at(-1)[1],1);
  run(`rolls=[0,.999999];tryLuxeryTuningHit({player,enemy,damage:${damage},random:()=>rolls.shift()})`);assert.equal(drops.at(-1)[1],1+bonus);
 }
}
assert.equal(run('tryLuxeryTuningHit({player,enemy,damage:100,weaponId:"aris-laser",random:()=>0})'),false);
assert.equal(run('tryLuxeryTuningHit({player,enemy,damage:0,random:()=>0})'),false);
assert.equal(drops.at(-1)[0],'credits');assert.deepEqual(drops.at(-1).slice(2),[12,34]);assert(fs.existsSync('sprites/icons/Mansion Invitation.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="luxery-tuning").weight'),3);
console.log('PASS:3/4/5percent,whole10damage scaling,capped+10points,1..11Credits,inclusive bounds,starting weapon restriction and icon.');
