const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const c=vm.createContext({});
vm.runInContext(fs.readFileSync('Development/firing-rings.js','utf8').replaceAll('export ',''),c);
for(const time of [.09,.15,.3,.4]){c.time=time;const rings=vm.runInContext('firingRingPoses(time,24)',c);assert(rings[0].radius<rings[1].radius);assert(rings[1].radius<rings[2].radius);}
assert(vm.runInContext('firingRingPoses(1,24).every(r=>!r.visible)',c));console.log('PASS: three muzzle rings grow progressively outward and expire.');
