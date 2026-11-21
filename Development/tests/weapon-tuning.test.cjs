const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['game-config','tuning-parts','item-catalog','combat-stats'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var p={label:"Plana",tuningParts:createTuningRun(),attackSlots:[{id:"plana-umbrella"}]};');
for(const [level,penalty,bonus] of [[1,30,4],[2,40,6],[3,50,8]]){
 run(`p.tuningParts.equipped[0]={id:"weapon-tuning",level:${level}}`);assert(Math.abs(run('totalWeaponDamage(p,"plana-umbrella",2)')-2*(1-penalty/100))<1e-9);
 for(const id of ['aris-laser','luminous-nova','princess-key'])assert(Math.abs(run(`totalWeaponDamage(p,"${id}",2)`)-2*(1+bonus/100))<1e-9);
}
run('p.tuningParts.equipped[1]={id:"speed-tuning",level:1}');assert(Math.abs(run('totalWeaponDamage(p,"plana-umbrella",2)')-2*.5*.8)<1e-9);
run('p.tuningParts.equipped=[null,null,null]');assert.equal(run('totalWeaponDamage(p,"plana-umbrella",2)'),2);assert.equal(run('totalWeaponDamage(p,"aris-laser",2)'),2);
run('p.mainWeaponId="aris-laser";p.tuningParts.equipped[0]={id:"weapon-tuning",level:1}');assert.equal(run('weaponTuningDamageBonus(p,"aris-laser")'),-30);assert.equal(run('weaponTuningDamageBonus(p,"plana-umbrella")'),4);
assert(fs.existsSync('sprites/icons/Expo Souvenirs.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="weapon-tuning").weight'),1);
console.log('PASS:main-30/40/50percent,otherweapons+4/6/8percent,independent stacking,clean removal andcustom main weapon.');
