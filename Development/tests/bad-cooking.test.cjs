const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const enemies=new Map(),hits=[],knocks=[];
const c=vm.createContext({getAllEnemies:()=>[...enemies.values()],getEnemy:id=>enemies.get(id),getCombatHitbox:p=>({x:p.x,y:p.y,rx:10,ry:10}),getEnemyHurtbox:e=>({...e,rx:5,ry:5}),damageEnemy:(...args)=>hits.push(args),applySkillControl:(...args)=>knocks.push(args),totalWeaponDamage:(p,id,base,bonuses)=>base*bonuses.reduce((a,b)=>a*(1+b/100),1),rollAttackDamage:(p,damage)=>({damage,type:'normal'})});
for(const name of ['game-config','bad-cooking'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);const run=s=>vm.runInContext(s,c);
run('var p={x:0,y:0,attackSlots:[createBadCookingWeapon()],combatStats:{hastePercent:10000}},attack=createBadCookingAttack()');
enemies.set('near',{id:'near',x:100,y:0,hp:100});enemies.set('far',{id:'far',x:350,y:0,hp:100});
run('attack.update(.01,p)');assert.equal(hits.length,1);assert.equal(hits[0][0],'near');assert.equal(hits[0][1],.9);assert.equal(knocks.length,0,'Level 1 never knocks enemies back');assert(Math.abs(run('badCookingLevelStats(1).radius')-140)<1e-8);
run('attack.update(.7,p)');assert.equal(hits.length,1);run('attack.update(.06,p)');assert.equal(hits.length,2);
assert(Math.abs(run('badCookingLevelStats(4).radius')-140*1.15*1.25)<1e-8);assert.equal(run('badCookingLevelStats(5).hitCooldown'),.625);
run('p.attackSlots[0].level=6;attack.reset();attack.update(.01,p)');assert(Math.abs(hits.at(-1)[1]-.9*1.3*1.6)<1e-10);
run('p.attackSlots[0].level=7;attack.reset();attack.update(.01,p)');assert.equal(knocks.length,1);
run('attack.setAutoattackEnabled(false);attack.update(1,p)');assert.equal(run('attack.active'),false);
const before=hits.length;run('attack.setAutoattackEnabled(true);p.x=1000;attack.update(.1,p)');assert.equal(hits.length,before,'Area follows player');
run('p.x=0;attack.reset();attack.update(20,p)');assert(hits.length-before<40,'One area does not overlap duplicate renewal ticks');
run('p.attackSlots=[];attack.update(.1,p)');assert.equal(run('attack.active'),false);
assert(fs.existsSync('sprites/attacks/Bad Cooking.png'));
console.log('PASS default weapon, miasma radius/movement, unlimited targets, fixed hit timing despite Haste, multiplicative levels, knockback, toggle, renewal and unequip.');



assert.equal(run('createBadCookingWeapon().attackType'),'Melee');assert.equal(run('createBadCookingWeapon().ranged'),false);

assert.equal(run('createBadCookingWeapon().weight'),4);
