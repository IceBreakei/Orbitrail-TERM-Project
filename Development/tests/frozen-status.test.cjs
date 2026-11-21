const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({getEnemyHurtbox:e=>({x:e.x,y:e.y,rx:10,ry:20}),Image:class{naturalWidth=100;naturalHeight=100;set src(v){this.onload?.()}},beginKnockback(){throw Error('freeze moved knockback')},advanceKnockback(){throw Error('freeze moved knockback')}});
for(const name of ['frozen-status','enemy-control'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var enemies=[{id:"visible",x:100,y:100,hp:10},{id:"edge",x:-5,y:100,hp:10},{id:"outside",x:2000,y:100,hp:10},{id:"dead",x:100,y:100,hp:0}]');
assert.equal(run('freezeVisibleEnemies(enemies,{x:0,y:0},1280,720)'),2);
assert.equal(run('enemies[2].frozenRemaining'),undefined);run('enemies[0].skillKnockback={};enemies[0].attack={elapsed:10}');
assert(run('updateEnemyControl(enemies[0],1,()=>{throw Error("moved")})'));assert.equal(run('enemies[0].frozenRemaining'),2);assert.equal(run('enemies[0].attack.elapsed'),10);
run('updateEnemyControl(enemies[0],0,()=>{})');assert.equal(run('enemies[0].frozenRemaining'),2);
run('updateEnemyControl(enemies[0],2,()=>{});delete enemies[0].skillKnockback');assert.equal(run('updateEnemyControl(enemies[0],.1,()=>{})'),false);
assert(run('applyFrozen(enemies[0],3)'));const draws=[];c.context={save(){},restore(){},drawImage(...a){draws.push(a)}};
run('drawFrozenStatus(context,{x:0,y:0},enemies[0])');assert.equal(draws.length,1);assert.equal(c.context.globalAlpha,.55);
// Frozen contact exits before accessing damage, movement or collision dependencies.
let contact=fs.readFileSync('Development/npc-contact.js','utf8');const start=contact.indexOf('export function updateNpcContact('),end=contact.indexOf('\n',contact.indexOf('if(npc.frozenRemaining>0)return false;',start));
assert.equal(vm.runInNewContext(contact.slice(start,end).replace('export ','')+'\n} updateNpcContact({frozenRemaining:3})'),false);
console.log('PASS: visible-only3s freeze, paused timer, held knockback/attacks, thaw, translucent overlay and no contact damage.');

const w=vm.createContext({isAdminSeed:false,showDamageNumber(){},harmlessEnemySettings:{},midoriDodges:()=>false});
vm.runInContext(fs.readFileSync('Development/world-state.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),w);
vm.runInContext('enemies.set("frozen",{id:"frozen",type:"mob",hp:10,maxHp:10,frozenRemaining:3});damageEnemy("frozen",2,{})',w);
assert.equal(vm.runInContext('enemies.get("frozen").hp',w),8);
console.log('PASS: frozen enemies still receive normal weapon damage.');

run('var visual={x:50,y:50,elapsed:20,bossAction:{clip:"shoot",elapsed:.5},attack:{elapsed:100}};animateFrozenEnemy(visual,{x:0,y:50},.1)');
assert.equal(run('visual.x'),50);assert.equal(run('visual.y'),50);assert.equal(run('visual.facing'),'left');assert.equal(run('visual.direction'),'left');assert.equal(run('visual.elapsed'),120);assert.equal(run('visual.frozenPoseElapsed'),600);assert.equal(run('visual.bossAction.elapsed'),.5);assert.equal(run('visual.moving'),true);
run('animateFrozenEnemy(visual,{x:100,y:50},.1)');assert.equal(run('visual.facing'),'right');
console.log('PASS: frozen sprites animate and turn toward player without moving or advancing boss gameplay actions.');

run('enemies[0].spriteSize=80;drawFrozenStatus(context,{x:0,y:0},enemies[0])');assert.equal(draws.at(-1)[4],132);assert(draws.at(-1)[3]>=132);
console.log('PASS: frozen overlay covers full sprite size with65percent extra coverage.');

c.getEnemyHurtbox=e=>({x:e.x+50,y:e.y-80,rx:10,ry:15});
run('drawFrozenStatus(context,{x:10,y:20},{x:100,y:200,spriteSize:80,hp:10,frozenRemaining:3})');
const centered=draws.at(-1);assert.equal(centered[1]+centered[3]/2,90);assert.equal(centered[2]+centered[4]/2,180);assert.equal(centered[4],132);
console.log('PASS: overlay centers on sprite origin regardless of enemy-specific hurtbox offsets, with10percent larger coverage.');
