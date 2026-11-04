const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=name=>fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ','');
const c=vm.createContext({isBossEnemy:()=>false});
vm.runInContext(source('game-config')+source('playtest-spawner'),c);
const run=s=>vm.runInContext(s,c);
run('var router=createRunningSpawnRouter(), log=[];');
// 8 arrivals per second for ten seconds while running right.
for(let frame=1;frame<=600;frame++) {
 run('router.advance(1/60)');
 if(frame%7===0 || frame%8===0) { // variable stream, more than 8/s to stress the cap
  const sides=run("router.rank(['right','top','bottom','left'],{x:4,y:0})");
  assert(sides.every(s=>['right','top','bottom'].includes(s)));
  c.side=sides[0];run('router.record(side)');
  if(sides[0]==='right')run(`log.push(${frame/60})`);
 }
}
const log=run('log');assert(log.length>20 && log.length<=30);
for(const t of log)assert(log.filter(v=>v>t-1+1e-7&&v<=t).length<=3);
run('router.advance(2)');
assert.deepEqual(Array.from(run("router.rank(['left','right','bottom','top'],{x:0,y:-4})")).sort(),['left','right','top']);
assert.deepEqual(Array.from(run("router.rank(['left','right'],{x:0,y:-4})")).sort(),['left','right']);
assert.deepEqual(Array.from(run("router.rank(['left','right'],{x:0,y:0})")),['left','right']);
run("var strip=createRunningSpawnRouter();strip.advance(.34)");
assert.deepEqual(Array.from(run("strip.rank(['left','right'],{x:4,y:0})")),['right','left']);
run("strip.record('right')");
assert.deepEqual(Array.from(run("strip.rank(['left','right'],{x:4,y:0})")),['left']);
assert.deepEqual(Array.from(run("strip.rank(['right'],{x:4,y:0})")),[]);
console.log('PASS: moving-direction arrivals cap at3/s, perpendicular overflow, vertical routing, stationary balance and bounded-map fallback.');

// Elites consume three visible slots, while offscreen actors consume none.
run("var crowd=[{x:100,y:100},{x:200,y:100,elite:true},{x:5000,y:5000,elite:true}];");
assert.equal(run('visibleEnemyCount(crowd,{x:0,y:0},1280,720)'),2);
assert.equal(run('visibleEnemySlots(crowd,{x:0,y:0},1280,720)'),4);
run('var elites=Array.from({length:17},()=>({x:100,y:100,elite:true}));');
assert.equal(run('visibleEnemySlots(elites,{x:0,y:0},1280,720)'),51);
assert.equal(run('adaptiveSpawnRate(elites,{x:100,y:100},51)'),2);
console.log('PASS: elite visible-slot weighting, offscreen exclusion and crowded slowdown.');
