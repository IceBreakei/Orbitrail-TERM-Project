const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({});
vm.runInContext(fs.readFileSync('Development/tuning-parts.js','utf8').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var p={label:"Plana",tuningParts:createTuningRun()};');
for(const [level,reverse] of [[1,true],[2,false],[3,true]]){
 run(`p.tuningParts.equipped[0]={id:"reverse-tuning",level:${level}}`);
 assert.equal(run('reverseTuningUpsideDown(p)'),reverse);
 for(const angle of [0,.5,Math.PI,-Math.PI/2])assert.equal(run(`startingWeaponAim(p,"plana-umbrella",${angle})`),angle);
 assert.equal(run('startingWeaponAim(p,"aris-laser",.5)'),.5);
}
run('p.tuningParts.equipped[0]=null');assert.equal(run('startingWeaponAim(p,"plana-umbrella",.5)'),.5);
assert(fs.existsSync('sprites/icons/Event 27 - Peroro Plush.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="reverse-tuning").weight'),3);
for(const name of ['umbrella-attack','plana-umbrella-skill'])assert(fs.readFileSync(`Development/${name}.js`,'utf8').includes('startingWeaponAim'));
console.log('PASS: LV1/3upside-down wielder,LV2normal,all weapon aim unchanged andnew icon exists.');

for(const name of ['movement.js','movement-optimized.js']){
 const source=fs.readFileSync(`Development/${name}`,'utf8');const block=source.match(/  if \(\(character===characters\[selected\]\|\|character.isPlayerVisual\)[\s\S]*?\n  \}/)[0];
 let sy=1,ty=0;const character={tuningParts:{}};const visual=vm.createContext({character,characters:{plana:character},selected:'plana',reverseTuningUpsideDown:()=>true,drawY:-80,height:100,context:{translate(x,y){ty+=sy*y},scale(x,y){sy*=y}}});
 vm.runInContext(block,visual);assert.equal(sy,-1);assert.equal(sy*(-30)+ty,-30);assert.equal(sy*(-80)+ty,20);assert.equal(sy*20+ty,-80);
}
console.log('PASS: both renderers flip only the wearer around sprite center with unchanged bounds.');
