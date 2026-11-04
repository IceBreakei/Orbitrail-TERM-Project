const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['game-config','skill-drawing','plana-pattern','skill-accuracy','skill-pattern-recognition'])vm.runInContext(fs.readFileSync('Development/'+name+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
(async()=>{
 for(const transform of ['p=>p','p=>({x:p.x*.04+4,y:p.y*.04+10})','p=>({x:p.x*2,y:p.y*.7})']) {
  const result=await run(`recognizePrincessKeyPattern(princessKeyReferenceStrokes().reverse().map(s=>s.slice().reverse().map(${transform})))`);assert(result.valid);
 }
 assert.equal(run('princessKeyReferenceStrokes().length'),3);
 assert(!(await run('recognizePrincessKeyPattern(luminousNovaReferenceStrokes())')).valid);
 assert(!(await run('recognizePrincessKeyPattern([princessKeyReferenceStrokes()[0]])')).valid);
 const match=await run('recognizeLoadoutPattern(princessKeyReferenceStrokes(),[{id:"plana-umbrella",icon:"u"},{id:"princess-key",icon:"s"}])');
 assert.equal(match.skillId,'princess-key-ex');assert.equal(match.weapon.id,'princess-key');
 c.misleadingAI={recognize:async()=>[],recognizeSymbol:async()=>[{label:'a hand drawn circle enclosing an arrow above an X cross',score:.99}]};
 run('var roughFrames=[[[0,0],[100,2],[98,120],[2,118],[0,0]],[[60,60],[180,62],[179,180],[61,178],[60,60]],[[30,110],[85,111],[84,210],[31,209],[30,110]]].map(s=>s.map(([x,y])=>({x,y})))');
 const rough=await run('recognizeLoadoutPattern(roughFrames,[{id:"plana-umbrella",icon:"u"},{id:"princess-key",icon:"s"}],misleadingAI)');
 assert.equal(rough.skillId,'princess-key-ex');
 assert(!(await run('recognizeWeaponPattern(roughFrames,{id:"plana-umbrella"},misleadingAI)')).valid);
 const unavailable=await run('recognizeLoadoutPattern(roughFrames,[{id:"plana-umbrella",icon:"u"},{id:"princess-key",icon:"s",skillCooldownRemaining:30}],misleadingAI)');
 assert(!unavailable.valid,'Synergy on cooldown must not redirect frames into Umbrella');
 assert.equal(run('closestDrawingSkill(roughFrames,[{id:"plana-umbrella"},{id:"princess-key"}]).id'),'princess-key');
 console.log('PASS: linked-frame EX pattern tolerates scale/order/aspect changes, rejects circle-diamond and routes to synergy.');
})().catch(error=>{console.error(error);process.exitCode=1});
