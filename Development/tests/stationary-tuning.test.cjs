const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({URL,Image:class{decode(){return Promise.resolve()}},getAllEnemies:()=>[],getEnemy:()=>null});
for(const name of ['game-config','tuning-parts','rgb-tuning','item-catalog','combat-stats','weapon-progression','combat-hitboxes','luminous-nova','aris-weapon','enemy-spatial-index','princess-key'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ','').replaceAll('import.meta.url',"'file:///Development/aris-weapon.js'"),c);const run=s=>vm.runInContext(s,c);run('var settings=princessKeySettings;var p={label:"Plana",x:0,y:0,tuningParts:createTuningRun(),attackSlots:[],stationaryForTuning:true};');
for(const [level,damage,interval] of [[1,1.2,.7],[2,1.25,.6],[3,1.3,.5]]){
 run(`p.tuningParts.equipped[0]={id:"stationary-tuning",level:${level}};p.stationaryForTuning=true`);assert.equal(run('totalWeaponDamage(p,"plana-umbrella",1)'),damage);assert.equal(run('totalWeaponDamage(p,"aris-laser",1)'),1);assert.equal(run('stationaryWeaponIntervalScale(p)'),interval);
 run('p.stationaryForTuning=false');assert.equal(run('totalWeaponDamage(p,"plana-umbrella",1)'),1);assert.equal(run('stationaryWeaponIntervalScale(p)'),1);
}
run('p.stationaryForTuning=true;var intervals=[];attackTimeFormula=(base,haste)=>{intervals.push(base);return base/(1+haste/100)};p.attackSlots=[createArisWeapon()];var beam=createArisAttack();beam.update(.01,p,0)');assert.equal(run('intervals.at(-1)'),1.5);
run('p.attackSlots=[createLuminousNovaWeapon()];var nova=createLuminousNovaAttack();nova.update(.01,p,0)');assert.equal(run('intervals.at(-1)'),1.25);
run('p.attackSlots=[{id:"princess-key"}];var fast=createPrincessKeyAttack({random:()=>.5});fast.update(1,p,0)');const fast=run('fast.shotsFired');run('p.stationaryForTuning=false;var normal=createPrincessKeyAttack({random:()=>.5});normal.update(1,p,0)');assert(fast>=run('normal.shotsFired')*1.9);
assert(fs.existsSync('sprites/icons/Mini Event - Toy Box.png'));
console.log('PASS:stationarymain+20/25/30percent,allweaponinterval-.30/.40/.50,actualAris/Nova/synergyfiring andmovementremovesbonuses.');

assert.equal(run('tuningPartCatalog.find(p=>p.id==="stationary-tuning").weight'),2);
