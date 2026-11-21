const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
for(const name of ['movement.js','movement-optimized.js']) {
 const code=fs.readFileSync('Development/'+name,'utf8').replaceAll('\r\n','\n');
 const transform=code.match(/if\(character\.bossSquash\) \{[\s\S]*?\n  \}/)[0];
 let sy=1,ty=0;
 const c=vm.createContext({character:{bossSquash:.55},drawY:-130,crop:{footY:200,y:0},scale:1,context:{translate(x,y){ty+=sy*y},scale(x,y){sy*=y}}});
 vm.runInContext(transform,c);
 const feet=70;assert(Math.abs(sy*feet+ty-feet)<1e-8);assert(sy*(-130)+ty>-130);
}
console.log('PASS: both renderers keep feet fixed while sprite top squashes downward.');
