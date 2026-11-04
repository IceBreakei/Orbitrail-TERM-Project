const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({rollLevelUpgrades:()=>[]});
vm.runInContext(fs.readFileSync('Development/weapon-max-order.js','utf8').replaceAll('export ',''),c);
vm.runInContext(fs.readFileSync('Development/gacha-file-rules.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
for(const [type,min,max] of [['normal',72,130],['triple',126,252],['super',158,332]]) {
 c.type=type;assert.equal(run('fileCredits(type,(()=>{let i=0;return()=>i++===0?1:0})())'),min);
 assert.equal(run('fileCredits(type,(()=>{let i=0;return()=>i++===0?0:1})())'),max);
}
run('var player={attackSlots:[{id:"a",level:1,maxLevel:7}],equipmentSlots:[]};var opts=p=>[{id:"a-level",weapon:p.attackSlots[0],category:"Weapon",name:"Upgrade A"}];var reward=rollFileRewards(player,{forceType:"triple",random:()=>.5,getOptions:opts})');
assert.equal(run('reward.products.length'),3);assert.equal(run('player.attackSlots[0].level'),1);
assert(run('acceptFileProduct(player,reward.products[0])'));assert.equal(run('player.attackSlots[0].level'),2);
assert.equal(run('rollFileRewards(player,{forceType:"super",random:()=>.5,getOptions:opts}).type'),'normal');
assert.equal(run('rollFileRewards(player,{forceType:"super",random:()=>.5,superItems:[{id:"super-test",name:"Super",icon:"test.png"}]}).type'),'super');
// Only one new weapon when that category has one slot, even across triple rolls.
run('var crowded={attackSlots:Array.from({length:5},(_,i)=>({id:"owned"+i,level:1})),equipmentSlots:[]};var offers=p=>[{id:"new",name:"New",category:"NEW Weapon",weapon:{id:"new"+p.attackSlots.length,level:1}}];var triple=rollFileRewards(crowded,{forceType:"triple",random:()=>.05,getOptions:offers})');
assert.equal(run('triple.products.length'),1);assert.equal(run('crowded.attackSlots.length'),5);
assert(run('triple.credits>=200'));
run('var none=rollFileRewards(player,{forceType:"normal",random:()=>.5,getOptions:()=>[]})');assert.equal(run('none.products.length'),0);assert.equal(run('none.credits'),run('fileCredits("normal",()=>.5)+100'));
console.log('PASS: exact Credit ranges, shadow inventory, triple slot restrictions, accepted vs dropped, super fallback and empty-pool Credits.');
