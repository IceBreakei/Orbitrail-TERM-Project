const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const enemies=new Map(),hits=[],knocks=[];
const c=vm.createContext({getAllEnemies:()=>[...enemies.values()],getEnemy:id=>enemies.get(id),damageEnemy:(id,damage,player,type)=>{hits.push({id,damage,type});return damage},applySkillControl:(...args)=>knocks.push(args)});
for(const name of ['game-config','combat-stats','combat-hitboxes','luminous-nova'])vm.runInContext(fs.readFileSync('Development/'+name+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var player={label:"Plana",x:0,y:0,level:1,attackSlots:[createLuminousNovaWeapon()],combatStats:{}};var attack=createLuminousNovaAttack({random:()=>0})');
assert.equal(run('rollLuminousNovaDamage(player,()=>0).damage'),12);assert.equal(run('rollLuminousNovaDamage(player,()=>1).damage'),16);
for(const [level,rate,damage] of [[1,1,1],[2,1,1.2],[3,2,1.2],[4,2,1.56],[5,3,1.56],[6,3,1.56],[7,4,1.56]]) {
 run(`player.attackSlots[0].level=${level}`);const stats=run('luminousNovaLevelStats(player)');assert.equal(stats.fireRate,rate);assert.equal(stats.interval,2.5/rate);assert(Math.abs(stats.damageMultiplier-damage)<1e-9);assert.equal(stats.knockback,level>=6);
}
assert.equal(run('luminousNovaSettings.projectileSpeed'),1200);assert.equal(run('luminousNovaSettings.duration'),.75);assert.equal(run('luminousNovaSettings.bulletDiameter'),run('normalSpriteSize*sweeperSettings.sizeRatio*.14'));
for(let i=0;i<20;i++)enemies.set(String(i),{id:String(i),type:'mob',x:100+i*35,y:-.4,spriteSize:10});
run('player.attackSlots[0].level=1;attack.update(.75,player)');assert.equal(new Set(hits.map(hit=>hit.id)).size,20);assert.equal(run('attack.projectileCount'),0);assert.equal(knocks.length,0);
// Exactly 1/2/3/4 evenly staggered shots per2.5seconds, independent of frame step.
for(const [level,shots] of [[1,1],[3,2],[5,3],[7,4]]) {
 run(`attack.reset();player.attackSlots[0].level=${level};attack.update(2.5,player)`);assert.equal(run('attack.shotsFired'),shots);
 run(`attack.reset();for(let i=0;i<250;i++)attack.update(.01,player)`);assert.equal(run('attack.shotsFired'),shots);
}
knocks.length=0;run('attack.reset();player.attackSlots[0].level=6;attack.update(.3,player)');assert(knocks.length>0);assert.equal(knocks[0][3],.25);assert.equal(knocks[0][4],.25);assert(Math.abs(Math.hypot(knocks[0][1],knocks[0][2])-105)<1e-8);
enemies.clear();enemies.set('giant',{id:'giant',type:'mob',x:200,y:6,spriteSize:2000,combatHitbox:{rx:1,ry:1,y:0}});hits.length=0;
run('attack.reset();player.attackSlots[0].level=1;attack.update(.01,player)');assert.equal(hits.length,1);run('attack.update(.15,player)');assert.equal(hits.length,1);run('attack.update(.02,player)');assert.equal(hits.length,2);
run('attack.setAutoattackEnabled(false);attack.update(3,player)');assert.equal(run('attack.projectileCount'),0);assert.equal(hits.length,2);
run('attack.setAutoattackEnabled(true);attack.update(3,player)');assert(hits.length>2);
enemies.clear();run('attack.reset();attack.update(3,player,Math.PI/2)');assert.equal(run('attack.shotsFired'),2);assert(run('attack.projectileCount')>0);
assert(fs.existsSync('sprites/attacks/Weapon_Icon_Kei.png'));
console.log('PASS: Luminous damage/levels, exact1-4x staggered cadence, frame independence,20-target piercing, hit cooldown, knockback, lifetime and autoattack toggle.');

run('player.attackSlots[0].level=7;player.attackSlots[0].enhancementRank=4');assert.equal(run('rollLuminousNovaDamage(player,()=>.5).damage'),24);
// Existing enemies must not override the shared arrow/crosshair aim.
enemies.set('right',{id:'right',type:'mob',x:200,y:0,spriteSize:10});enemies.set('down',{id:'down',type:'mob',x:0,y:200,spriteSize:10});hits.length=0;
run('var aimedAttack=createLuminousNovaAttack({random:()=>0});aimedAttack.update(.3,player,Math.PI/2)');assert(hits.some(hit=>hit.id==='down'));assert(!hits.some(hit=>hit.id==='right'));

assert.equal(run('createLuminousNovaWeapon().iconRotation'),-45);
// With no targets the renderer still receives a visible projectile along the current aim.
enemies.clear();run('attack.reset();attack.update(.1,player,Math.PI/2)');
const rotations=[];let renderedArcs=0;
c.previewContext={save(){},restore(){},translate(){},rotate:a=>rotations.push(a),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),beginPath(){},arc(){renderedArcs++},fill(){},moveTo(){},lineTo(){},bezierCurveTo(){}};
run('attack.draw(previewContext,{x:0,y:0})');assert.equal(rotations.length,1);assert.equal(rotations[0],Math.PI/2);assert(renderedArcs>=2);

// The head clears the actual collider by 3px and fades/accelerates before leaving a wake.
const translations=[];
c.previewContext.translate=(x,y)=>translations.push([x,y]);
run('attack.reset();attack.update(.04,player,0);attack.draw(previewContext,{x:0,y:0})');
const expectedMuzzle=run('getCombatHitbox(player,false).x+getCombatHitbox(player,false).rx+3+luminousNovaSettings.bulletDiameter/2*luminousNovaSettings.bloomRadiusScale');
assert(Math.abs(translations[0][0]-expectedMuzzle-12)<1e-8);
assert.equal(translations.length,1,'No trailing afterimages during acceleration');
translations.length=0;
run('attack.update(.08,player,0);attack.draw(previewContext,{x:0,y:0})');
assert.equal(translations.length,1,'Only the continuous tail is rendered, without dotted afterimages');
assert(translations.slice(1).every(([x])=>x>=-48-1e-8),'Wake stays within post-acceleration travel');

// Bloom contacts count as hits even when the small central light misses.
enemies.set('bloom-edge',{id:'bloom-edge',type:'mob',x:100,y:10,spriteSize:1});
assert(run('luminousNovaHits(getEnemy("bloom-edge"),{x:90,y:0},{x:110,y:0})'));
assert(!run('luminousNovaHits(getEnemy("bloom-edge"),{x:90,y:0},{x:110,y:0},luminousNovaSettings.bulletDiameter/2)'));
assert.equal(run('luminousNovaSkillSettings.projectileDiameter'),run('normalSpriteSize*sweeperSettings.sizeRatio*2.5*.2*.85'));

let filterWrites=0;
Object.defineProperty(c.previewContext,'filter',{set(value){if(value!=='none')filterWrites++},configurable:true});
run('drawLuminousPlasma(previewContext,{x:0,y:0},{x:200,y:200,age:.6,angle:0})');
assert.equal(filterWrites,0,'Plasma rendering must not run per-frame blur filters');



const blueStops=[];
c.previewContext.createRadialGradient=c.previewContext.createLinearGradient=()=>({addColorStop(position,color){blueStops.push(color)}});
run('drawLuminousPlasma(previewContext,{x:0,y:0},{x:200,y:200,age:.2,angle:0,color:"blue"})');
assert(blueStops.includes('#f5ffff'));assert(blueStops.includes('rgba(125,229,255,.75)'));
console.log('PASS: blue plasma palette recolors both bloom and tail while retaining transparency.');
