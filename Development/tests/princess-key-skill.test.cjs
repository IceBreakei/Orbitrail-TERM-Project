const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');let listener;const enemies=new Map(),hits=[];
const c=vm.createContext({URL,Image:class{constructor(){this.naturalWidth=958;this.naturalHeight=246}decode(){return Promise.resolve()}},onEnemyDamage:fn=>{listener=fn;return()=>{}},getAllEnemies:()=>[...enemies.values()],getEnemy:id=>enemies.get(id),damageEnemy:(id,damage,source,type)=>{hits.push({id,damage,type});listener?.({source,damage});return damage},applySkillControl(){}});
for(const name of ['game-config','combat-stats','combat-hitboxes','firing-rings','aris-weapon','luminous-nova','luminous-nova-skill','princess-key-skill'])vm.runInContext(fs.readFileSync('Development/'+name+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ','').replaceAll('import.meta.url',"'file:///Development/aris-weapon.js'"),c);
vm.runInContext('const skill=luminousNovaSkillSettings,settings=princessKeySkillSettings;var player={label:"Plana",x:0,y:0,level:1,attackSlots:[{id:"princess-key",level:1}],combatStats:{}};var ex=createPrincessKeySkill({random:()=>.5});ex.cast(player,0,1.5)',c);
const run=s=>vm.runInContext(s,c);
assert.equal(run('player.combatBuffs["princess-key-ex"].damageBonusMultiplier'),1.51);assert.equal(run('player.combatBuffs["princess-key-ex"].critPercent'),22.3);
listener({source:run('player'),damage:1000});
enemies.set('front',{id:'front',type:'mob',x:200,y:0,spriteSize:10});enemies.set('side',{id:'side',type:'mob',x:200,y:150,spriteSize:10});
run('ex.update(4.2,player,0)');assert.equal(hits.filter(h=>h.id==='front').length,5);assert.equal(hits.filter(h=>h.id==='side').length,0);assert.equal(run('ex.residueCount'),1);
assert(hits[1].damage>hits[0].damage,'Damage bank amplifies later beam ticks');
const totalBeforeExplosion=run('ex.damageDealt');
run('ex.update(1.4,player,0)');assert(hits.some(h=>h.id==='side'&&h.type==='normal'));
assert.equal(hits.filter(h=>h.id==='side').length,1,'Residue explodes once');
assert.equal(hits.find(h=>h.id==='side').damage,totalBeforeExplosion+run(`luminousNovaFinisherDamage(${totalBeforeExplosion},player)`),'Residue adds the capped10%charge on top of full damage');
run('ex.update(21,player,0)');assert(!run('player.combatBuffs["princess-key-ex"]'));
run('ex.cast(player,0);ex.reset()');assert(!run('player.combatBuffs["princess-key-ex"]'));assert.equal(run('ex.residueCount'),0);
console.log('PASS: amplifier stats, five0.6second beam ticks, increasing bank amplification, four-second stationary residue AoE, expiration and reset.');


assert(run('princessResiduePose(3.95).radius<princessResiduePose(3.5).radius*.3'));
assert(run('princessResiduePose(3).opacity<princessResiduePose(.1).opacity'));
assert.equal(run('princessResiduePose(4).exploded'),true);
assert.equal(run('princessResiduePose(4.4).opacity'),0);
console.log('PASS: residue gradually fades, collapses inward before4seconds and releases a fading detonation ring.');

run('ex.cast(player,0);ex.update(supernovaBeamPhase(0).openingDuration+3.25,player,0)');
assert.equal(run('ex.beamShooting'),false);assert.equal(run('ex.sprayActive'),true);
run('ex.update(.26,player,0)');assert.equal(run('ex.sprayActive'),false);
console.log('PASS: blue spray persists half a second beyond the3second laser.');


assert.equal(run('princessBeamTickDamage(10,0)'),10);
assert.equal(run('princessBeamTickDamage(10,10)'),20);
assert.equal(run('princessBeamTickDamage(10,30)'),40);
enemies.clear();hits.length=0;
for(let i=0;i<3;i++)enemies.set('multi'+i,{id:'multi'+i,type:'mob',x:200,y:i*3,spriteSize:10});
run('var savedRoll=rollAttackDamage;rollAttackDamage=()=>({damage:10,type:"normal"});ex.cast(player,0,1);ex.update(supernovaBeamPhase(0).openingDuration+.001,player,0)');
assert.deepEqual(hits.map(hit=>hit.damage),[10,10,10]);
run('ex.update(.6,player,0)');assert.deepEqual(hits.slice(3).map(hit=>hit.damage),[40,40,40]);
run('rollAttackDamage=savedRoll');
console.log('PASS:10?20?40growth; simultaneous targets share10damage then40nexttick; residue uses the full accumulated total.');
