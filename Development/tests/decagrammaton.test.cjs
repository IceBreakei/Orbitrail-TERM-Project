const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const enemies=new Map(),hits=[],controls=[];
const c=vm.createContext({getAllEnemies:()=>[...enemies.values()],getEnemy:id=>enemies.get(id),isBossEnemy:e=>e.boss===true,
 damageEnemy:(id,damage,p,type)=>{hits.push({id,damage,type});const e=enemies.get(id);if(e){e.hp-=damage;if(e.hp<=0)enemies.delete(id);}return e;},applySkillControl:(...args)=>controls.push(args)});
for(const name of ['game-config','item-catalog','tuning-parts','combat-stats','combat-hitboxes','enemy-spatial-index','luminous-nova','decagrammaton','decagrammaton-ultimate','skill-cast-state','skill-drawing','plana-pattern','skill-accuracy','skill-pattern-recognition','super-synergy-recipes','super-synergy-rules'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var p={label:"Plana",x:0,y:0,level:50,combatStats:{hastePercent:500,critPercent:25},attackSlots:[{id:"princess-key",isSynergy:true,consumedWeaponIds:["aris-laser","luminous-nova"]}],equipmentSlots:[createMalkuthHat()]};p.equipmentSlots[0].level=3;var state=createSuperSynergyRun();state.hammer="held";');
assert.equal(run('superSynergyChoices(p,state).length'),1);
assert(run('applySuperSynergyChoice(p,superSynergyChoices(p,state)[0].id,state).success'));
assert.equal(run('p.equipmentSlots[0]'),null);assert.equal(run('p.attackSlots[0].id'),'decagrammaton');
assert.equal(run('p.attackSlots[0].consumedWeaponIds.includes("aris-laser")'),true);
assert.equal(run('itemDamageBonus(p)'),1.3);assert.equal(run('itemCritPenalty(p)'),0);
assert.equal(run('equippedSkills(p).length'),2);assert.equal(run('p.ultimateSkill.successCooldown'),300);
run('var ex=p.attackSlots[0],ult=p.ultimateSkill;setSkillCooldown(ex,180);var cast=createSkillCastState();cast.begin(p,ult);cast.addInk(100);cast.update(5);var token=cast.token;');
assert(run('cast.resolve(token,{valid:true,weapon:ult,label:"Band",score:1})'));
assert.equal(run('ult.skillCooldownRemaining'),300);assert.equal(run('ex.skillCooldownRemaining'),180);
run('advanceSkillCooldowns([p],1)');assert.equal(run('ult.skillCooldownRemaining'),299);assert.equal(run('ex.skillCooldownRemaining'),179);
run('var attack=createDecagrammatonAttack({random:()=>.5});attack.update(.01,p,0);');assert.equal(run('attack.shotsFired'),1);
run('attack.update(1,p,0)');assert.equal(run('attack.shotsFired'),52);
assert(run('attack.projectileCount')<52);
run('attack.setAutoattackEnabled(false);attack.update(1,p,0)');assert.equal(run('attack.projectileCount'),0);
// Blue homing still connects with an off-axis target; pink remains aimed forward.
enemies.set('target',{id:'target',type:'mob',x:0,y:80,hp:10000,spriteSize:40});
run('attack=createDecagrammatonAttack({random:()=>.5});attack.update(.3,p,0,{x:-200,y:-200,width:400,height:400})');assert(hits.some(h=>h.id==='target'));assert(controls.length>0);
assert.equal(run('decagrammatonSettings.blue.hitLimit'),7);assert.equal(run('decagrammatonSettings.pink.hitLimit'),3);
assert.equal(run('totalWeaponDamage({...p,attackSlots:[{...p.attackSlots[0],enhancementRank:1}]},"decagrammaton",.6,[],{projectileCount:3,hitCooldownFrames:15})'),.6+.2/3);
// Flash/white silhouettes, simultaneous execution only when the wave clears the screen.
enemies.clear();hits.length=0;
for(const e of [{id:'a',type:'mob',x:20,y:20,hp:100},{id:'mini',type:'mob',miniBoss:true,x:30,y:20,hp:100},{id:'boss',type:'arisu',boss:true,x:20,y:20,hp:100},{id:'out',type:'mob',x:1000,y:1000,hp:100}])enemies.set(e.id,{spriteSize:20,...e});
run('var ultimate=createDecagrammatonUltimate();ultimate.cast(p);ultimate.update(1.49,p,{x:-100,y:-100,width:200,height:200})');
assert.equal(hits.length,0);assert.equal(enemies.get('a').ultimateWhite,1);assert.equal(enemies.get('boss').ultimateWhite,undefined);
run('ultimate.update(.02,p,{x:-100,y:-100,width:200,height:200})');assert.equal(hits.length,2);assert(enemies.has('boss'));assert(enemies.has('out'));
run('ultimate.update(.45,p,{x:-100,y:-100,width:200,height:200})');assert.equal(run('ultimate.active'),false);
(async()=>{
 const loadout=await run('recognizeLoadoutPattern(decagrammatonReferenceStrokes(),[{id:"decagrammaton"},{id:"decagrammaton-ultimate"}],{})');assert.equal(loadout.skillId,'decagrammaton-ultimate');
 const retained=await run('recognizeLoadoutPattern(princessKeyReferenceStrokes(),[{id:"decagrammaton"},{id:"decagrammaton-ultimate"}],{})');assert.equal(retained.skillId,'princess-key-ex');
 const result=await run('recognizeWeaponPattern(decagrammatonReferenceStrokes(),{id:"decagrammaton-ultimate"},{})');assert(result.valid);
 const scaled=await run('recognizeWeaponPattern(decagrammatonReferenceStrokes().reverse().map(s=>s.slice().reverse().map(p=>({x:p.x*.3+400,y:p.y*.3+120}))),{id:"decagrammaton-ultimate"},{})');assert(scaled.valid);
 for(const template of ['planaReferenceStrokes()','luminousNovaReferenceStrokes()','princessKeyReferenceStrokes()'])assert.equal((await run(`recognizeWeaponPattern(${template},{id:"decagrammaton-ultimate"},{})`)).valid,false,template);
 assert(fs.existsSync('sprites/attacks/protocolsupernova.png'));
 console.log('PASS Decagrammaton fusion, paired homing fire, enhancement split, passive DB, retained EX, independent ultimate, boss immunity and star recognition.');
})().catch(e=>{console.error(e);process.exitCode=1});

// Separate shots have distinct ages; changing the update size preserves the cycle's fire rate.
enemies.clear();run('attack=createDecagrammatonAttack({random:()=>.5});attack.update(.06,p,0);var drawn=[];drawLuminousPlasma=(ctx,camera,bullet,diameter,duration)=>drawn.push({...bullet,diameter,duration});attack.draw({},{});');
assert.equal(run('drawn.length'),4);assert.equal(run('new Set(drawn.map(b=>b.age)).size'),4);
assert.equal(run('drawn[0].color'),'blue');assert.equal(run('drawn[1].color'),'pink');
assert.equal(run('drawn[0].diameter'),run('luminousNovaSettings.bulletDiameter*2*.8'));
assert.equal(run('drawn[0].combatDiameter'),run('luminousNovaSettings.bulletDiameter*2*.8'));
assert.equal(run('drawn[0].accelerating'),false);assert.equal(run('drawn[1].accelerating'),true);
assert.equal(run('drawn[0].trailSpeed'),run('luminousNovaSettings.projectileSpeed*1.6'));
assert.equal(run('drawn[1].trailSpeed'),run('luminousNovaSettings.projectileSpeed'));
assert(run('drawn[0].diameter/2*(1+luminousNovaSettings.trailLengthRatio)/drawn[0].trailSpeed < drawn[0].duration-drawn[0].fadeOutSeconds'),'Blue tail must fully form before end fade starts');
assert.equal(run('drawn[1].diameter'),run('luminousNovaSettings.bulletDiameter*1.25'));
assert.equal(run('drawn[0].fadeOutSeconds'),.12);assert.equal(run('drawn[1].fadeOutSeconds'),undefined);
run('attack.reset();for(let i=0;i<101;i++)attack.update(.01,p,0)');assert.equal(run('attack.shotsFired'),52);
console.log('PASS individual stagger, alternating colors, frame-independent cadence, blue-only 20% size reduction and soft lifetime fade.');


// While the retained EX sprays, normal Decagrammaton rounds are paused without deleting live rounds.
enemies.clear();run('var decBase=createDecagrammatonAttack({random:()=>.5});decBase.update(.01,p,0);');
const liveBefore=run('decBase.projectileCount'),shotsBefore=run('decBase.shotsFired');assert(liveBefore>0);
run('decBase.setExMode(true,false);decBase.update(.01,p,0)');assert(run('decBase.shotsFired')>shotsBefore,'Normal Dec fire continues during EX windup');
const liveAtSpray=run('decBase.projectileCount'),beforeSpray=run('decBase.shotsFired');
run('decBase.setExMode(true,true)');assert.equal(run('decBase.projectileCount'),liveAtSpray,'EX start preserves live normal shots');
run('decBase.update(.1,p,0)');assert.equal(run('decBase.shotsFired'),beforeSpray,'No normal blue/pink rounds mixed into EX spray');
assert(run('decBase.projectileCount')>0,'Existing normal rounds continue their lifetime during EX');
run('decBase.setExMode(false,false);decBase.update(.1,p,0)');assert(run('decBase.shotsFired')>beforeSpray,'Normal Dec fire resumes after spray');
console.log('PASS Dec normal fire continues through windup, pauses only during retained EX spray and resumes without deleting in-flight rounds.');


// Homing launch positions follow the target direction, not the player's aim-facing muzzle.
const playerBody=run('getCombatHitbox(p,false)');
for(const [dx,dy] of [[-1,0],[-1,-1],[-1,1],[1,-1],[1,1]]){
  enemies.clear();const length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
  enemies.set('muzzle-target',{id:'muzzle-target',type:'mob',x:playerBody.x+ux*300,y:playerBody.y+uy*300,hp:10000,spriteSize:20});
  run('var muzzleAttack=createDecagrammatonAttack({random:()=>.5});drawn=[];muzzleAttack.update(.000001,p,0,{x:-1000,y:-1000,width:2000,height:2000});muzzleAttack.draw({},{});');
  const blue=run('drawn.find(b=>b.color==="blue")');assert(blue);
  const spawnX=blue.x-Math.cos(blue.angle)*blue.speed*blue.age-playerBody.x;
  const spawnY=blue.y-Math.sin(blue.angle)*blue.speed*blue.age-playerBody.y;
  const expected=1/Math.hypot(ux/playerBody.rx,uy/playerBody.ry)+run('luminousNovaSettings.muzzleGap')+blue.diameter/2*run('luminousNovaSettings.bloomRadiusScale');
  assert(Math.abs(spawnX-ux*expected)<1e-5,`blue muzzle X must face target ${dx},${dy}`);
  assert(Math.abs(spawnY-uy*expected)<1e-5,`blue muzzle Y must face target ${dx},${dy}`);
  run('drawn=[];muzzleAttack.update(.02,p,0,{x:-1000,y:-1000,width:2000,height:2000});muzzleAttack.draw({},{});');
  const pink=run('drawn.find(b=>b.color==="pink")');assert(pink);
  assert.equal(pink.angle,0,'Pink shots retain the player aim');
  assert(pink.x>playerBody.x,'Pink muzzle stays on player-aim side even when blue target is behind');
  assert(Math.abs(pink.y-playerBody.y)<1e-8);
}
enemies.clear();run('muzzleAttack=createDecagrammatonAttack({random:()=>.5});drawn=[];muzzleAttack.update(.000001,p,Math.PI);muzzleAttack.draw({},{});');
const fallbackBlue=run('drawn.find(b=>b.color==="blue")');assert(fallbackBlue.x<playerBody.x);assert(Math.abs(fallbackBlue.angle-Math.PI)<1e-8);
console.log('PASS homing blue muzzle faces rear/all-quadrant targets with bloom clearance; pink and no-target fallback retain player aim.');

// Losing a homing target must not destroy live rounds or redirect them to a new target.
enemies.clear();enemies.set('lost-target',{id:'lost-target',type:'mob',x:playerBody.x+300,y:playerBody.y,hp:10000,spriteSize:20});
run('var lostAttack=createDecagrammatonAttack({random:()=>.5});drawn=[];lostAttack.update(.001,p,0);lostAttack.setAutoattackEnabled(false);lostAttack.draw({},{});');
const beforeLoss=run('drawn.find(b=>b.color==="blue")');assert(beforeLoss);
enemies.clear();
run('drawn=[];lostAttack.update(.1,p,0);lostAttack.draw({},{});');
const afterLoss=run('drawn.find(b=>b.color==="blue")');assert(afterLoss,'Target death preserves the projectile');
assert.equal(afterLoss.target,null);assert.equal(afterLoss.angle,beforeLoss.angle);
assert(Math.abs(afterLoss.x-beforeLoss.x-Math.cos(beforeLoss.angle)*beforeLoss.speed*.1)<1e-6);
assert(Math.abs(afterLoss.y-beforeLoss.y-Math.sin(beforeLoss.angle)*beforeLoss.speed*.1)<1e-6);
run('lostAttack.update(.6,p,0)');assert.equal(run('lostAttack.projectileCount'),0,'Released bullet expires at its normal lifetime');
console.log('PASS target death releases homing into straight flight until normal lifetime expiry.');

assert.equal(run('createDecagrammatonWeapon().name'),'Protocol SUPERNOVA');
assert.equal(run('createDecagrammatonWeapon().icon'),'../sprites/attacks/protocolsupernova.png');
assert.equal(run('createDecagrammatonWeapon().id'),'decagrammaton','Stable ID preserves existing recipes and combat paths');
assert.equal(run('equippedSkills({attackSlots:[createDecagrammatonWeapon()]}).find(s=>s.id==="decagrammaton-ultimate").name'),'Activate Protocol SUPERNOVA');
for(const name of ['movement','movement-optimized']){const html=fs.readFileSync(`Development/${name}.html`,'utf8');assert(html.includes('Activate Protocol SUPERNOVA'));assert(html.includes('protocolsupernova.png'));assert(!html.includes('Band of Atsilut'));}
console.log('PASS Protocol SUPERNOVA weapon name, icon, activation name and both preview menus with stable gameplay IDs.');

for(const name of ['movement','movement-optimized']){
 const html=fs.readFileSync(`Development/${name}.html`,'utf8');
 assert(/<h2 class="protocol-supernova-title"[^>]*><img src="..\/sprites\/protocol-supernova-plus.png"/.test(html));
 assert(html.includes('<h3 data-thin-text>Activate Protocol SUPERNOVA - Ultimate</h3>'));
 assert(html.includes('Activate Protocol Supernova! Upon activation, a powerful blast would clear the board of enemies using a Supernova!'));
 assert.equal(html.split('protocol-supernova-plus.png').length,2);
}
console.log('PASS special logo is the top heading only; text activation title and full description remain below pattern.');
