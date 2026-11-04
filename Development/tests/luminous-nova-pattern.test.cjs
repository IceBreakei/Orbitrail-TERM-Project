const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['game-config','skill-drawing','plana-pattern','skill-accuracy','skill-pattern-recognition'])vm.runInContext(fs.readFileSync('Development/'+name+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
(async()=>{
 const ai={recognize:async()=>[],recognizeSymbol:async()=>[{label:'a hand drawn circle enclosing an arrow above an X cross',score:.99}]};c.ai=ai;
 for(const transform of ['p=>p','p=>({x:p.x*.05+3,y:p.y*.05+8})','p=>({x:p.x*3,y:p.y*.6})']){
  const result=await run(`recognizeLuminousNovaPattern(luminousNovaReferenceStrokes().reverse().map(s=>s.slice().reverse().map(${transform})),ai)`);assert(result.valid);
 }
 assert.equal((await run('recognizeLuminousNovaPattern([luminousNovaReferenceStrokes()[0]],ai)')).valid,false);
 assert.equal((await run('recognizeLuminousNovaPattern([luminousNovaReferenceStrokes()[1]],ai)')).valid,false);
 assert.equal((await run('recognizeLuminousNovaPattern(planaReferenceStrokes(),ai)')).valid,false);
 const route=await run('recognizeLoadoutPattern(luminousNovaReferenceStrokes(),[{id:"plana-umbrella",icon:"u"},{id:"aris-laser",icon:"s"},{id:"luminous-nova",icon:"k"}],ai)');assert.equal(route.weapon.id,'luminous-nova');assert.equal(route.skillId,'luminous-nova-aura');
 assert.equal(run('closestDrawingSkill(luminousNovaReferenceStrokes(),[{id:"plana-umbrella"},{id:"aris-laser"},{id:"luminous-nova"}]).id'),'luminous-nova');
 console.log('PASS: circle/diamond recognition, flexible stroke order/scale/aspect, missing-symbol rejection and three-weapon routing.');
})().catch(e=>{console.error(e);process.exitCode=1});
