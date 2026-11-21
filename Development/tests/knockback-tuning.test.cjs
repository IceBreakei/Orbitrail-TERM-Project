const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const controls=[];
const c=vm.createContext({applySkillControl:(...args)=>controls.push(args)});
for(const name of ['game-config','tuning-parts','knockback-tuning'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);run('var p={label:"Plana",x:0,y:0,tuningParts:createTuningRun()};var enemy={x:10,y:0,hp:100};');
for(const [level,frames,speed,boost] of [[1,5,5,1.3],[2,8,8,1.5],[3,12,12,2]]){
 run(`p.tuningParts.equipped[0]={id:"knockback-tuning",level:${level}}`);assert.equal(run('knockbackTuningMultiplier(p)'),boost);assert(run('applyTuningKnockback(p,enemy)'));
 assert.equal(controls.at(-1)[1],speed*frames);assert.equal(controls.at(-1)[2],0);assert.equal(controls.at(-1)[3],0);assert.equal(controls.at(-1)[4],frames/60);
}
run('p.mainWeaponId="other"');assert.equal(run('applyTuningKnockback(p,enemy)'),false);assert(fs.existsSync('sprites/icons/Event 32 - Lost Item 17.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="knockback-tuning").weight'),3);
const source=fs.readFileSync('Development/plana-umbrella-skill.js','utf8');assert(source.includes('s.knockbackDistance*weaponKnockbackMultiplier(projectile.owner)*(projectile.owner.tuningParts?knockbackTuningMultiplier(projectile.owner):1)'));
console.log('PASS: knockback frames5/8/12,speed5/8/12,existing strength1.3/1.5/2,starting weapon scope and EX multiplier.');

run('p.mainWeaponId="plana-umbrella";p.equipmentSlots=[{id:"racer-pass",level:3}];applyTuningKnockback(p,enemy)');assert.equal(controls.at(-1)[1],12*12*1.2);
console.log('PASS Racer Pass scales existing Tuning knockback strength.');
