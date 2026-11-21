const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const hits=[];const c=vm.createContext({damageEnemy:(...a)=>hits.push(a)});
for(const name of ['tuning-parts','slowdown-tuning'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var p={label:"Plana",tuningParts:createTuningRun()};var target={id:"slow",hp:100};var args={player:p,enemy:target,rollDamage:(e,m)=>({damage:100*m,type:"normal"})};');
for(const [level,chance,percent,damage] of [[1,.2,15,30],[2,.25,20,40],[3,.3,25,50]]){
 run(`p.tuningParts.equipped[0]={id:"slowdown-tuning",level:${level}}`);assert.equal(run(`trySlowdownTuningHit({...args,random:()=>${chance}})`),false);assert(run(`trySlowdownTuningHit({...args,random:()=>${chance}-.001})`));assert.equal(hits.at(-1)[1],damage);assert.equal(run('target.slowdownRemaining'),5);assert.equal(run('slowdownMultiplier(target)'),1-percent/100);
 const count=hits.length;run('updateSlowdown(target,2);updateSlowdown(target,0)');assert.equal(run('target.slowdownRemaining'),3);assert.equal(hits.length,count);run('updateSlowdown(target,3)');assert.equal(run('slowdownMultiplier(target)'),1);
}
assert(fs.existsSync('sprites/icons/Capybara Bath Salt.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="slowdown-tuning").weight'),4);
console.log('PASS:20/25/30percent proc,15/20/25percent slow5s,30/40/50percent one-time damage,no periodic hits,expiry/pause and icon.');
