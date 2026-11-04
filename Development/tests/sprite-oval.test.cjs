const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({});vm.runInContext(fs.readFileSync('Development/sprite-hurtbox.js','utf8').replaceAll('export ',''),c);
const runs=[];
for(let y=0;y<32;y++){let start=-1;for(let x=0;x<=32;x++){const inside=x<32&&((x+.5-16)/12)**2+((y+.5-16)/14)**2<=1;if(inside&&start<0)start=x;if(!inside&&start>=0){runs.push({x:(start+x)/64,y:(y+.5)/32,width:(x-start)/32,height:1/32});start=-1;}}}
c.runs=runs;const fit=vm.runInContext('fitSpriteOval(runs)',c);assert(fit.coverage>=.9);assert(fit.emptyFraction<=.05);assert(fit.meetsTargets);
assert.equal(vm.runInContext('fitSpriteOval([])',c),null);
console.log('PASS: ellipse fit meets90%coverage/5%empty on oval sprites and reports diagnostics.');
