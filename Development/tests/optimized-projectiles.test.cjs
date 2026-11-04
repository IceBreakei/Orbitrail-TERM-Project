const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({});
vm.runInContext(fs.readFileSync('Development/enemy-spatial-index.js','utf8').replaceAll('export ',''),c);
const create=vm.runInContext('createEnemySpatialIndex',c);
let seed=42;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const enemies=Array.from({length:400},(_,id)=>({id,x:random()*2400-1200,y:random()*1600-800,rx:5+random()*100,ry:5+random()*100}));
const grid=create(enemies,e=>e);let candidates=0;
for(let n=0;n<1000;n++) {
 const a={x:random()*2400-1200,y:random()*1600-800},b={x:a.x+random()*60-30,y:a.y+random()*60-30},r=random()*25;
 const result=grid.querySegment(a,b,r);candidates+=result.length;
 assert.equal(new Set(result).size,result.length);
 assert.deepEqual(Array.from(result,e=>e.id),Array.from(result,e=>e.id).sort((a,b)=>a-b));
 for(const e of enemies)if(e.x+e.rx>=Math.min(a.x,b.x)-r&&e.x-e.rx<=Math.max(a.x,b.x)+r&&e.y+e.ry>=Math.min(a.y,b.y)-r&&e.y-e.ry<=Math.max(a.y,b.y)+r)assert(result.includes(e),'missed overlapping bounds');
}
console.log(`PASS: 1000 seeded sweeps, no omitted overlapping bounds; ${candidates}/400000 candidate checks (${(100*candidates/400000).toFixed(1)}%).`);
// Run the existing gameplay assertions against the optimized implementation.
let suite=fs.readFileSync('Development/tests/princess-key.test.cjs','utf8');
suite=suite.replace("'princess-key','synergy-recipes'","'princess-key.optimized','synergy-recipes'");
vm.runInNewContext(suite,{require,console});
