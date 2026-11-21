const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const enemies=new Map(),numbers=[];let roll=0;
const c=vm.createContext({showDamageNumber:(...a)=>numbers.push(a),getAllEnemies:()=>[...enemies.values()],getCombatHitbox:e=>({x:e.x||0,y:e.y||0,rx:10,ry:10}),rollLevelUpgrades:()=>[]});
for(const name of ['game-config','item-catalog','tuning-parts','combat-stats','player-stats','knockback','safety-helmet','gacha-file-rules'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);
c.random=()=>roll;const run=s=>vm.runInContext(s,c);
run('var p={x:0,y:0,maxHp:100,hp:60,shield:20,equipmentSlots:[]};var fx=createSafetyHelmetEffects({random,getViewport:()=>({x:-100,y:-100,width:200,height:200})});ensurePlayerStats(p)');
assert(run("itemUpgradeChoices(p).some(c=>c.id==='helmet-new')"));assert(run("applyItemUpgrade(p,'helmet-new')"));assert.equal(run('p.equipmentSlots[0].weight'),4);
for(const [level,chance] of [[1,.15],[2,.2],[3,.25],[4,.3],[5,.35]]){run(`p.equipmentSlots[0].level=${level}`);assert.equal(run('safetyHelmetStats(p).chance'),chance);}
enemies.set('left',{id:'left',x:-50,y:0});enemies.set('right',{id:'right',x:50,y:0});enemies.set('immune',{id:'immune',x:0,y:50,knockbackImmune:true});
roll=.349;assert.equal(run('damagePlayer(p,30)'),false);assert.equal(run('p.hp'),60);assert.equal(run('p.shield'),20);assert.equal(numbers.length,1);assert.equal(numbers[0][1],0);assert.equal(numbers[0][2],true);assert.equal(numbers[0][3],'miss');assert.equal(run('fx.waveCount'),1);
assert.equal(enemies.get('left').skillKnockback.dx,-100);assert.equal(enemies.get('right').skillKnockback.dx,100);assert.equal(enemies.get('right').skillKnockback.duration,10/60);assert.equal(enemies.get('immune').skillKnockback,undefined);
assert.equal(run('damagePlayer(p,30)'),false);assert.equal(run('fx.waveCount'),2,'No item cooldown between hits');assert.equal(enemies.get('right').skillKnockback.dx,90,'Repeated proc honors knockback resistance');
roll=.35;assert.equal(run('damagePlayer(p,30)'),true);assert.equal(run('p.shield'),0);assert.equal(run('p.hp'),50);
run('p.equipmentSlots=[createSafetyHelmet(true)];p.hp=95;p.shield=10');roll=.399;assert.equal(run('damagePlayer(p,50)'),false);assert.equal(run('p.hp'),100);assert.equal(run('p.shield'),10);
const before=run('fx.waveCount');run('damagePlayer(p,0)');assert.equal(run('fx.waveCount'),before);run('fx.update(.6)');assert.equal(run('fx.waveCount'),0);
run('p.equipmentSlots=[createSafetyHelmet()];p.equipmentSlots[0].level=5');assert(!run("itemUpgradeChoices(p).some(c=>c.id==='helmet-level')"));
run('var product=rollFileRewards(p,{forceType:"super",superItems:[createSafetyHelmet(true)],random:()=>0}).products[0]');assert(run('acceptFileProduct(p,product)'));assert.equal(run('p.equipmentSlots.length'),1);assert.equal(run('p.equipmentSlots[0].isSuper'),true);
run("p.equipmentSlots=[];p.disabledItemIds=['safety-helmet']");assert(!run("itemUpgradeChoices(p).some(c=>c.id==='helmet-new')"));
assert(fs.existsSync('sprites/items/Safety Helmet.png'));
console.log('PASS Helmet levels/chances, negation before shield/HP, all-target knockback/resistance/immunity, no cooldown, Super heal/cap, effect expiry, Super File same-slot upgrade and disable.');

c.getLootTotals=()=>({credits:0,secretTechNotes:0});vm.runInContext(fs.readFileSync('Development/crafter-rules.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
run('p.disabledItemIds=[];p.equipmentSlots=[createSafetyHelmet()]');assert.equal(run('crafterChoices(p)[0].id'),'item:0:level');assert(run('applyCrafterChoice(p,"item:0:level").success'));assert.equal(run('p.equipmentSlots[0].level'),2);
console.log('PASS Safety Helmet uses existing Crafter item upgrades.');

assert.equal(run('createSafetyHelmet().iconFit'),true);assert.equal(run('createSafetyHelmet(true).iconCrop.width'),231);
