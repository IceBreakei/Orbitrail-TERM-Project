const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'..',name+'.js'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ','').replaceAll('import.meta.url',"'file:///Development/module.js'");
const enemies=new Map(),hits=[];
const context=vm.createContext({Math:Object.assign(Object.create(Math),{random:()=>.5}),URL,getAllEnemies:()=>[...enemies.values()],getEnemy:id=>enemies.get(id),
 damageEnemy(id,damage){const e=enemies.get(id);e.hp-=damage;hits.push({id,damage});if(e.hp<=0)enemies.delete(id)},
 Image:class{constructor(){this.naturalWidth=2172}decode(){return Promise.resolve()}}});
for(const name of ['game-config','skill-drawing','plana-pattern','skill-accuracy','skill-pattern-recognition','combat-stats','weapon-progression','combat-hitboxes','knockback','enemy-control','plana-umbrella-skill'])vm.runInContext(source(name),context);
const run=code=>vm.runInContext(code,context);
run("var circle=Array.from({length:81},(_,i)=>({x:150+100*Math.cos(i/80*Math.PI*2),y:150+100*Math.sin(i/80*Math.PI*2)}));var sketch=[circle,[{x:120,y:160},{x:180,y:220}],[{x:180,y:160},{x:120,y:220}],[{x:150,y:90},{x:150,y:145}],[{x:125,y:115},{x:150,y:90},{x:175,y:115}]]");
assert(run('segmentPlanaPattern(sketch).valid'));
assert(run('segmentPlanaPattern([...sketch].reverse()).valid'));
assert(run('segmentPlanaPattern([circle.slice(0,41),circle.slice(40),...sketch.slice(1)]).valid'));
assert(!run('segmentPlanaPattern([circle]).valid'));
assert(!run('segmentPlanaPattern(sketch.slice(1)).valid'));
assert(!run('segmentPlanaPattern([circle,...sketch.slice(3)]).valid'));
assert(!run('segmentPlanaPattern(sketch.slice(0,3)).valid'));
assert(run('segmentPlanaPattern(sketch.map(stroke=>stroke.map(p=>({x:p.x*1.7+200,y:p.y*1.7+100})))).valid'));
assert(run('segmentPlanaPattern([circle,...sketch.slice(1,3),[{x:150,y:65},{x:150,y:140}],[{x:125,y:90},{x:150,y:65},{x:175,y:90}]]).valid'));
assert(run('segmentPlanaPattern([circle,...sketch.slice(1,3),[{x:125,y:115},{x:180,y:115}],[{x:160,y:95},{x:180,y:115},{x:160,y:135}]]).valid'));

// Swap upper/lower symbol positions: layout must be rejected.
assert(!run('segmentPlanaPattern(sketch.map((stroke,i)=>i?stroke.map(p=>({x:p.x,y:300-p.y})):stroke)).valid'));
enemies.set('mob',{id:'mob',type:'mob',x:300,y:0,spriteSize:89.6,hp:1000});
enemies.set('boss',{id:'boss',type:'shiroko',boss:true,x:340,y:0,spriteSize:268.8,hp:9000});
enemies.set('outside',{id:'outside',type:'mob',x:300,y:400,hp:1000});
enemies.set('behind',{id:'behind',type:'mob',x:-300,y:0,hp:1000});
run('var owner={x:0,y:0,combatStats:{atkPercent:0,critPercent:0}};var skill=createPlanaUmbrellaSkill();skill.cast(owner,0);skill.update(.1)');
assert.equal(hits.length,0);run('skill.update(.4)');
assert(hits.some(h=>h.id==='mob'&&h.damage===18));assert(hits.some(h=>h.id==='boss'&&h.damage===18));
assert(!hits.some(h=>h.id==='outside'||h.id==='behind'));
assert.equal(enemies.get('mob').stunRemaining,3);assert.equal(enemies.get('boss').stunRemaining,3);
run('skill.update(.1)');assert.equal(hits.filter(h=>h.id==='mob').length,1);
context.enemy=enemies.get('mob');context.move=(e,dx,dy)=>{e.x+=dx;e.y+=dy};
assert(run('updateEnemyControl(enemy,.11,move)'));assert(enemies.get('mob').y>0);
run('updateEnemyControl(enemy,.11,move)');assert(Math.abs(enemies.get('mob').y-72)<1e-8);
assert(run('updateEnemyControl(enemy,2.78,move)'));assert(!run('updateEnemyControl(enemy,.01,move)'));
for(const [x,y,w,h] of run('umbrellaOpeningFrames'))assert(x>=0&&y>=0&&x+w<=2172&&y+h<=724);
console.log('PASS:composite pattern,stroke order/split circle,missing/reversed parts,opening delay,swept1.5x damage,onehit perenemy,boss stun,sideways knockback,3second recovery,crop bounds.');

(async()=>{
  run("drawingModelImage=()=> 'data:image/png;base64,test';var calls=[];var fake={recognize:async image=>{calls.push(image);return [{label:'line',score:.2}]}}");
  const result=await run("recognizeWeaponPattern(sketch,{id:'plana-umbrella'},fake)");
  assert(result.valid);assert.equal(result.skillId,'plana-umbrella-launch');assert.equal(result.components.length,3);assert.equal(run('calls.length'),3);
  const invalid=await run("recognizeWeaponPattern([circle],{id:'plana-umbrella'},fake)");assert(!invalid.valid);assert.equal(run('calls.length'),3);
  const cancelled=await run("recognizeWeaponPattern(sketch,{id:'plana-umbrella'},fake,()=>false)");assert(cancelled.cancelled);assert.equal(run('calls.length'),3);
  console.log('PASS:three isolated AI calls,composite mapping,invalid pattern rejection,cancelled recognition stops component jobs.');
})().catch(error=>{console.error(error);process.exitCode=1});

// Verify per-projectile accuracy damage reaches actual enemy hits and cannot exceed bounds.
for (const [multiplier, expected] of [[1.2,14],[2,24],[100,24],[0,14]]) {
  enemies.clear(); hits.length=0;
  enemies.set('accuracy-target',{id:'accuracy-target',type:'mob',x:300,y:0,spriteSize:89.6,hp:1000});
  context.multiplier=multiplier;
  run('skill.reset();skill.cast(owner,0,multiplier);skill.update(.5)');
  assert.equal(hits[0].damage,expected);
}
console.log('PASS: actual projectile minimum/maximum damage and multiplier clamping.');

// Opening fades in before launch; fast travel renders densely sampled, lingering blur.
enemies.clear();
const poses=[];
const drawing={save(){},restore(){},translate(){},rotate(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
 createLinearGradient(){return {addColorStop(){}}},
 drawImage(...args){poses.push({opacity:this.globalAlpha,filter:this.filter,length:args.at(-1)})}};
context.drawing=drawing;
run('skill.reset();skill.cast(owner,0);skill.update(.1);skill.draw(drawing,{x:0,y:0})');
assert(poses[0].opacity>0 && poses[0].opacity<1);
assert(poses[0].length<=115.2);
poses.length=0;
run('skill.update(.24);skill.draw(drawing,{x:0,y:0})');
assert.equal(poses.length,1);assert.equal(poses[0].opacity,1); // Fully open prelaunch hold.
poses.length=0;
run('skill.update(.1);skill.draw(drawing,{x:0,y:0})');
assert(poses.filter(p=>p.filter==='blur(5px)').length>10);
assert.equal(poses.at(-1).length,115.2);
poses.length=0;
run('skill.update(.2);skill.draw(drawing,{x:0,y:0})');
assert(poses.length>0); // Trail remains visible at the end of flight.
poses.length=0;
run('skill.update(.21);skill.update(.21);skill.draw(drawing,{x:0,y:0})');
assert.equal(poses.length,0);
console.log('PASS: fade-in opening, prelaunch hold, reduced visual size, dense blurred trail and eventual cleanup.');

// Dodging an EX projectile also suppresses its stun and knockback.
enemies.clear();
enemies.set('dodging-midori',{id:'dodging-midori',type:'midori',x:300,y:0,hp:1000,spriteSize:89.6});
const originalDamage=context.damageEnemy;
context.damageEnemy=()=>false;
run('skill.reset();skill.cast(owner,0);skill.update(.5)');
assert.equal(enemies.get('dodging-midori').stunRemaining,undefined);
context.damageEnemy=originalDamage;
console.log('PASS: dodged projectile applies no stun.');

// Aim locks when fade-in finishes, before the open-pose hold begins.
enemies.clear();hits.length=0;
enemies.set('aim-up',{id:'aim-up',type:'mob',x:0,y:-300,hp:1000,spriteSize:89.6});
enemies.set('old-facing',{id:'old-facing',type:'mob',x:300,y:0,hp:1000,spriteSize:89.6});
run('var arrowAngle=0,aimReads=0;skill.reset();skill.cast(owner,0,1.5,()=>{aimReads++;return arrowAngle});skill.update(.2);arrowAngle=-Math.PI/2;skill.update(.08);arrowAngle=0;skill.update(.06)');
assert.equal(run('aimReads'),2);
assert.equal(hits.length,0); // Still holding, with the arrow now pointing elsewhere.
run('skill.update(.16)');
assert.equal(run('aimReads'),2);
assert(hits.some(hit=>hit.id==='aim-up'));
assert(!hits.some(hit=>hit.id==='old-facing'));
run('arrowAngle=0;skill.update(.05)');
assert(!hits.some(hit=>hit.id==='old-facing'));
console.log('PASS: EX aim locks at fade-in completion and ignores arrow changes during hold and flight.');
