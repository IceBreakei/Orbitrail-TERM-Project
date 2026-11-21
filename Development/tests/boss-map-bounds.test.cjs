const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
for(const file of ['movement.js','movement-optimized.js']) {
 const s=fs.readFileSync('Development/'+file,'utf8').replaceAll('\r\n','\n');
 const a=s.indexOf('  const isEnemy = character !== characters[selected];',s.indexOf('function updateCharacter('));
 const b=s.indexOf('\n}\n',a);
 const tail=s.slice(a,b);
 for(const selectedBoss of [false,true]) for(const map of ['first','second','third','fourth']) {
  const c=vm.createContext({character:{boss:true,x:100,y:-120},characters:{plana:{}},selected:'plana',isBossEnemy:c=>c.boss,currentMap:map});
  if(selectedBoss)c.characters.plana=c.character;
  // All map/collision dependencies are intentionally absent: bosses must exit before accessing them.
  vm.runInContext('(function(){'+tail+'})()',c);
  assert.equal(c.character.y,-120);
 }
}
console.log('PASS: bosses bypass map props, island bounds and strip edges in both game loops on all four maps.');

for(const file of ['movement.js','movement-optimized.js']) {
 const source=fs.readFileSync('Development/'+file,'utf8');
 const start=source.indexOf('function canKnockbackStand('),end=source.indexOf('  const body =',start);
 assert.equal(vm.runInNewContext(source.slice(start,end)+'} canKnockbackStand({boss:true},-9999,9999)',{isBossEnemy:e=>e.boss}),true);
}
const state=fs.readFileSync('Development/world-state.js','utf8');const identity=state.match(/export function isBossEnemy\(enemy\) \{[\s\S]*?\n\}/)[0].replace('export ','');
for(const type of ['shiroko','arisu','iroha','neru']) {
 assert(vm.runInNewContext(identity+';isBossEnemy({type})',{type}));
 assert.equal(vm.runInNewContext(identity+';isBossEnemy({type,boss:false})',{type}),false);
}
console.log('PASS: selected boss avatars and knockback ignore map limits; all four boss types identified, explicit miniboss overrides preserved.');
