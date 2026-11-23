const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function node(tag){return {tag,children:[],listeners:{},append(...items){this.children.push(...items)},setAttribute(k,v){this[k]=v},addEventListener(k,v){this.listeners[k]=v}};}
const player={equipmentSlots:[]},root=node('div');let changes=0;
const c=vm.createContext({document:{createElement:node},root,getPlayer:()=>player,onChange:()=>changes++});
for(const name of ['item-catalog','weapon-max-order','loadout-admin'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);run('createItemEquipAdmin({root,getPlayer,onChange})');
const buttons=root.children.filter(n=>n.tag==='button');assert.equal(buttons.length,8);assert(!buttons.some(b=>/ MAX$|Super|Awakened/.test(b.textContent)));assert.equal(run("isItemUnlocked('malkuth-hat')"),false);
const hat=buttons.find(b=>b.textContent==="Equip Malkuth's Hat"),racer=buttons.find(b=>b.textContent==='Equip Racer Pass');
hat.listeners.click();assert.equal(player.equipmentSlots[0].level,1);
hat.listeners.click();assert.equal(player.equipmentSlots[0].level,2);assert(root.children.some(n=>n.textContent?.includes('LV 2 equipped')));
hat.listeners.click();assert.equal(player.equipmentSlots[0].level,3);hat.listeners.click();assert.equal(player.equipmentSlots[0].awakened,true);assert.equal(player.equipmentSlots.length,1);
hat.listeners.click();assert(player.equipmentSlots[0].awakened);hat.listeners.click();assert(player.equipmentSlots[0].awakened,'Normal button must not downgrade awakened item');assert.equal(run("isItemUnlocked('malkuth-hat')"),false);
player.equipmentSlots=Array.from({length:6},(_,i)=>({id:`item-${i}`}));const before=changes;hat.listeners.click();assert.equal(player.equipmentSlots.length,6);assert.equal(changes,before);assert(root.children.some(n=>n.textContent==='No empty equipment slot available.'));
player.equipmentSlots[4]={id:'malkuth-hat',level:1,maxLevel:3};hat.listeners.click();assert.equal(player.equipmentSlots[4].level,2);
for(const name of ['movement','movement-optimized']){
 const html=fs.readFileSync(`Development/${name}.html`,'utf8'),equip=html.match(/<aside class="loadout-test-sidebar"[\s\S]*?<\/aside>/)[0],skills=html.match(/<aside class="skill-test-sidebar"[\s\S]*?<\/aside>/)[0];
 for(const id of ['admin-equip-aris','admin-equip-luminous','admin-equip-synergies','admin-equip-items']){assert(equip.includes(`id="${id}"`));assert(!skills.includes(`id="${id}"`));assert.equal(html.split(`id="${id}"`).length,2);}
 assert(skills.includes('id="admin-ultimate-tests"'));assert(fs.readFileSync(`Development/${name}.js`,'utf8').includes('createItemEquipAdmin({root:document.querySelector'));
}
console.log('PASS manual Hat LV1/MAX/awakened equips, unlock bypass without persistence, slot cap/replacement, and separate equip/skill panels in both previews.');

run("var weapons={attackSlots:[],pendingUpgrades:2};var factory=()=>({id:'test-weapon',level:1,maxLevel:7});equipAdminWeapon(weapons,factory)");
for(let level=2;level<=7;level++){assert(run('equipAdminWeapon(weapons,factory)'));assert.equal(run('weapons.attackSlots[0].level'),level);}
assert.equal(run('weapons.attackSlots.length'),1);assert.equal(run('weapons.attackSlots[0].maxedOrder'),1);run('equipAdminWeapon(weapons,factory)');assert.equal(run('weapons.attackSlots[0].level'),7);assert.equal(run('weapons.pendingUpgrades'),2);
run("weapons.attackSlots=Array.from({length:6},(_,i)=>({id:'full'+i,level:1}));");assert.equal(run('equipAdminWeapon(weapons,factory)'),false);
run("weapons.attackSlots[3]={id:'test-weapon',level:3,maxLevel:7,enhancementRank:2};equipAdminWeapon(weapons,factory)");assert.equal(run('weapons.attackSlots[3].level'),4);assert.equal(run('weapons.attackSlots[3].enhancementRank'),2);
run("weapons.attackSlots[3]={id:'test-weapon',level:1,isSynergy:true};equipAdminWeapon(weapons,factory)");assert.equal(run('weapons.attackSlots[3].level'),1);
console.log('PASS repeat weapon equip levels to MAX without duplicates, spending levels, enhancement changes or synergy upgrades; full inventory supports owned upgrades.');

player.equipmentSlots=[];racer.listeners.click();assert.equal(player.equipmentSlots[0].id,'racer-pass');assert.equal(player.equipmentSlots[0].level,1);
racer.listeners.click();assert.equal(player.equipmentSlots[0].level,2);racer.listeners.click();assert.equal(player.equipmentSlots[0].level,3);racer.listeners.click();assert.equal(player.equipmentSlots[0].isSuper,true);
racer.listeners.click();assert.equal(player.equipmentSlots[0].isSuper,true);racer.listeners.click();assert.equal(player.equipmentSlots[0].isSuper,true);assert.equal(player.equipmentSlots.length,1);
console.log('PASS item Equip clicks progress LV1=>2=>MAX=>Super/Awakened, no instant-MAX buttons, no duplicates or Super downgrade, full-slot upgrades and actual-level feedback.');

const helmet=buttons.find(b=>b.textContent==='Equip Safety Helmet');player.equipmentSlots=[];
for(let level=1;level<=5;level++){helmet.listeners.click();assert.equal(player.equipmentSlots[0].level,level);}
helmet.listeners.click();assert.equal(player.equipmentSlots[0].isSuper,true);assert.equal(player.equipmentSlots.length,1);
console.log('PASS Safety Helmet admin equip progresses through five ranks to Super.');

const jacket=buttons.find(b=>b.textContent==='Equip Life Jacket');player.equipmentSlots=[];
for(let level=1;level<=5;level++){jacket.listeners.click();assert.equal(player.equipmentSlots[0].level,level);}
jacket.listeners.click();assert.equal(player.equipmentSlots[0].isSuper,true);assert.equal(player.equipmentSlots.length,1);
console.log('PASS Life Jacket admin five ranks to Super without shortcut buttons.');

run("var cleared={attackSlots:[{id:'plana-umbrella'},{id:'princess-key'}],equipmentSlots:[createRacerPass(true),createLifeJacket(),createSportsDrink()],maxHp:90,hp:85,racerPassHpApplied:20,lifeJacketState:{remaining:15},sportsDrinkState:{crit:10},sportsDrinkAimOffset:.1,characterSkills:[{id:'celestia'}],tuningParts:{equipped:[{id:'power'}]},supportItemId:'heal-potion'};clearAdminLoadout(cleared)");assert.equal(run('cleared.attackSlots.length'),0);assert.equal(run('cleared.equipmentSlots.length'),0);assert.equal(run('cleared.maxHp'),70);assert.equal(run('cleared.hp'),70);assert.equal(run('cleared.lifeJacketState'),undefined);assert.equal(run('cleared.sportsDrinkState'),undefined);assert.equal(run('cleared.sportsDrinkAimOffset'),0);assert.equal(run('cleared.characterSkills.length'),1);assert.equal(run('cleared.supportItemId'),'heal-potion');assert.equal(run('cleared.tuningParts.equipped.length'),1);
for(const name of ['movement','movement-optimized']){assert(fs.readFileSync(`Development/${name}.html`,'utf8').includes('id="admin-clear-loadout"'));assert(fs.readFileSync(`Development/${name}.js`,'utf8').includes('clearAdminLoadout(characters[selected])'));}
console.log('PASS clear-all loadout includes starter/synergy, synchronizes item stats/shield, preserves skills/support/tuning and is wired in both previews');
