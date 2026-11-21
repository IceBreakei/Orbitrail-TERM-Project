const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['decagrammaton','super-synergy-recipes','super-synergy-rules'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var recipes=[{id:"test",synergyId:"syn",itemId:"item",result:{id:"super",name:"Test Super"}}];var state=createSuperSynergyRun();var p={level:49,attackSlots:[{id:"syn",isSynergy:true}],equipmentSlots:[{id:"item",level:2,maxLevel:3}]};');
assert.equal(run('advanceSuperSynergyProgress(p,state,recipes).frame'),0);assert.equal(run('state.hammer'),'none');
run('p.attackSlots.push({id:"syn2",isSynergy:true})');assert.equal(run('advanceSuperSynergyProgress(p,state,recipes).frame'),1);
run('p.attackSlots.push({id:"syn3",isSynergy:true})');assert.equal(run('advanceSuperSynergyProgress(p,state,recipes).frame'),2);assert.equal(run('state.hammer'),'held');assert.equal(run('superSynergyChoices(p,state,recipes).length'),0);
run('p.equipmentSlots[0].level=3');assert.equal(run('superSynergyChoices(p,state,recipes).length'),1);assert(run('applySuperSynergyChoice(p,superSynergyChoices(p,state,recipes)[0].id,state,recipes).consumed'));assert.equal(run('p.equipmentSlots[0]'),null);assert.equal(run('p.attackSlots[0].isSuperSynergy'),true);assert.equal(run('state.hammer'),'used');assert.equal(run('superSynergyChoices(p,state,recipes).length'),0);
run('p.attackSlots[0]={id:"syn",isSynergy:true};p.equipmentSlots[0]={id:"item",level:3,maxLevel:3};advanceSuperSynergyProgress(p,state,recipes)');assert.equal(run('state.hammer'),'used');
run('var ground=createSuperSynergyRun();p.level=50;p.attackSlots=[{id:"syn",isSynergy:true}];advanceSuperSynergyProgress(p,ground,recipes)');assert.equal(run('ground.hammer'),'ground');assert.equal(run('superSynergyChoices(p,ground,recipes).length'),0);assert(run('collectGoldenHammer(ground)'));assert.equal(run('collectGoldenHammer(ground)'),false);
run('p.equipmentSlots[0]={id:"super-item",baseItemId:"item",isSuper:true,level:1}');assert.equal(run('superSynergyChoices(p,ground,recipes).length'),1);
run('recipes[0].createWeapon=()=>{throw Error("fail")}');assert.equal(run('applySuperSynergyChoice(p,superSynergyChoices(p,ground,recipes)[0].id,ground,recipes).consumed'),false);assert.equal(run('ground.hammer'),'held');assert.equal(run('p.equipmentSlots[0].id'),'super-item');
assert.equal(run('superSynergyRecipes.length'),1);assert.equal(run('superSynergyProgress(p,createSuperSynergyRun(),[]).frame'),null);
for(let i=0;i<3;i++)assert(fs.existsSync(`Development/generated/golden-hammer/piece-${i}.png`));
console.log('PASS: half/fullshaft,3synergy instant hammer,LV50ground/pickup,MAX/Super item,atomic fusion,one perrun,no placeholder recipes.');

// Admin grants advance visible stages without requiring the normal level/Synnergy thresholds.
run('var adminRun=createSuperSynergyRun();var emptyPlayer={level:1,attackSlots:[],equipmentSlots:[]};');
assert(run('grantGoldenHammerPiece(emptyPlayer,adminRun)'));assert.equal(run('superSynergyProgress(emptyPlayer,adminRun).frame'),0);
assert(run('grantGoldenHammerPiece(emptyPlayer,adminRun)'));assert.equal(run('superSynergyProgress(emptyPlayer,adminRun).frame'),1);
assert(run('grantGoldenHammerPiece(emptyPlayer,adminRun)'));assert.equal(run('adminRun.hammer'),'held');assert.equal(run('superSynergyProgress(emptyPlayer,adminRun).frame'),2);
assert.equal(run('grantGoldenHammerPiece(emptyPlayer,adminRun)'),false);assert.equal(run('superSynergyChoices(emptyPlayer,adminRun).length'),0);
run('adminRun.crafted=true;adminRun.hammer="used"');assert.equal(run('grantGoldenHammerPiece(emptyPlayer,adminRun)'),false);
for(const name of ['movement','movement-optimized']){assert(fs.readFileSync('Development/'+name+'.html','utf8').includes('id="give-golden-hammer-piece"'));assert(fs.readFileSync('Development/'+name+'.js','utf8').includes('superSynergy.givePiece()'));}
console.log('PASS admin hammer pieces: half-shaft, shaft, held hammer; no duplicate grants or recipe bypass; both previews wired.');
