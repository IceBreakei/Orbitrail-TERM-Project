const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({});
for(const name of ['game-config','enemy-death'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
vm.runInContext("beginEnemyDeath({id:'event',x:100,y:100},{x:0,y:0},{knockback:false});beginEnemyDeath({id:'normal',x:100,y:100},{x:0,y:0});updateEnemyDeaths(deathSettings.fadeStart+.01);",c);
const remnants=vm.runInContext('getEnemyDeaths()',c);
const event=remnants.find(e=>e.id==='event'),normal=remnants.find(e=>e.id==='normal');
assert.equal(event.x,100);assert.equal(event.y,100);assert(event.death.opacity<1);assert(normal.x>100&&normal.y>100);
vm.runInContext('updateEnemyDeaths(deathSettings.duration)',c);assert.equal(vm.runInContext('getEnemyDeaths().length',c),0);
console.log('PASS: event deaths fade in place; normal deaths retain knockback; remnants expire.');
