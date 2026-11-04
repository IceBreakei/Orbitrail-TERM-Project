const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({});
for(const name of ['game-config','combat-hitboxes'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
for(const type of ['plana','arona']){
 c.type=type;const b=vm.runInContext('getCombatHitbox({type,x:200,y:300},false)',c);
 assert.equal(b.rx,b.ry);if(type==='plana')assert(Math.abs(b.rx-17.41824)<1e-8);assert.equal(b.x,200);assert.equal(b.y,type==='plana'?306:300);
}
for(const type of ['plana','arona','mob','midori','yuuka','iroha','shiroko']){
 c.type=type;const b=vm.runInContext('getCombatHitbox({type,x:0,y:0},true)',c);
 c.b=b;
 assert(vm.runInContext('Math.abs(b.rx-combatHitboxes[type].rx*normalSpriteSize*.9*.9)<1e-8',c));
 assert(vm.runInContext('Math.abs(b.ry-combatHitboxes[type].ry*normalSpriteSize*.9*.9)<1e-8',c));
}
console.log('PASS: centered circular player hitboxes and additional10% shrink for every enemy profile.');

for (const size of [89.6,89.6*1.98]) {
 c.size=size;
 const mob=vm.runInContext("getCombatHitbox({type:'mob',x:0,y:0,spriteSize:size},true)",c);
 assert.equal(mob.rx,mob.ry);
}
console.log('PASS: normal and elite Mob hitboxes are circular.');

const normalMob=vm.runInContext("getCombatHitbox({type:'mob',x:0,y:0,spriteSize:177.408},true)",c);
const eliteMob=vm.runInContext("getCombatHitbox({type:'mob',elite:true,x:0,y:0,spriteSize:177.408},true)",c);
assert(Math.abs(normalMob.y-177.408*.04-6)<1e-8);
assert.equal(eliteMob.y,normalMob.y);
assert.equal(eliteMob.rx,normalMob.rx);assert.equal(eliteMob.rx,eliteMob.ry);
console.log('PASS: normal and elite Mob centers lowered6px with radii unchanged.');

const shiroko=vm.runInContext("getCombatHitbox({type:'shiroko',x:100,y:200,spriteSize:268.8},true)",c);
assert.equal(shiroko.rx,shiroko.ry);assert.equal(shiroko.x,100);assert(Math.abs(shiroko.y-213.44)<1e-8);
console.log('PASS: Shiroko circular hitbox centers lower on the visible body.');
