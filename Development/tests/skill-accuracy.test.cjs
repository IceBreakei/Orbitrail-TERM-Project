const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
for (const name of ['game-config', 'skill-drawing', 'plana-pattern', 'skill-accuracy', 'skill-pattern-recognition']) {
 const code = fs.readFileSync(path.join(__dirname, '..', name + '.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
 vm.runInContext(code, context);
}
const run = code => vm.runInContext(code, context);
run('var reference = planaReferenceStrokes();');
assert(run('drawingAccuracy(reference)') > .99);
assert(Math.abs(run('drawingAccuracy(reference.map(stroke=>stroke.map(p=>({x:p.x*2+400,y:p.y*2-70}))))') - run('drawingAccuracy(reference)')) < 1e-9);
assert(run('drawingAccuracy([...reference].reverse().map(stroke=>[...stroke].reverse()))') > .98);
assert.equal(run('skillDamageMultiplier(0)'), 1.2);
assert.equal(run('skillDamageMultiplier(.65)'), 1.5);
assert.equal(run('skillDamageMultiplier(1)'), 2);
assert.equal(run('skillDamageMultiplier(NaN)'), 1.5);
assert(run('drawingAccuracy(reference.map((stroke,i)=>stroke.map((p,j)=>({x:p.x+Math.sin(j*2+i)*6,y:p.y+Math.cos(j+i)*6}))))') < run('drawingAccuracy(reference)'));
(async () => {
 run(`drawingModelImage=()=> 'test-image'; var clipCalls=0, quickCalls=0;
 var both={recognizeSymbol:async()=>{clipCalls++;return [{label:'a hand drawn circle enclosing an arrow above an X cross',score:.7}]},recognize:async()=>{quickCalls++;return [{label:'circle',score:.5}]}};`);
 let result = await run("recognizeWeaponPattern(reference,{id:'plana-umbrella'},both)");
 assert(result.valid); assert.equal(result.damageMultiplier,2);
 assert.equal(run('clipCalls'),1); assert.equal(run('quickCalls'),3);
 // Break the arrow's shaft/head join enough to fail strict segmentation, leaving recognizable ink.
 run('var rough=reference.map(stroke=>stroke.map(p=>({...p})));rough[1][1].y+=29;');
 assert(!run('segmentPlanaPattern(rough).valid'));
 result=await run("recognizeWeaponPattern(rough,{id:'plana-umbrella'},both)");
 assert(result.valid); assert.equal(result.components.length,1);
 assert(result.damageMultiplier>=1.2 && result.damageMultiplier<=2);
 result=await run("recognizeWeaponPattern([reference[0]],{id:'plana-umbrella'},both)");
 assert(!result.valid, 'CLIP alone must not accept an empty circle');
 result=await run("recognizeWeaponPattern(reference,{id:'plana-umbrella'},{recognizeSymbol:async()=>{throw Error('offline')},recognize:async()=>[]})");
 assert(result.valid); assert.equal(result.clipError,'offline');
 result=await run("recognizeWeaponPattern(rough,{id:'plana-umbrella'},{recognizeSymbol:async()=>[{label:'random scribbles and unrelated shapes',score:.8}],recognize:async()=>[]})");
 assert(!result.valid);
 assert((await run("recognizeWeaponPattern(reference,{id:'plana-umbrella'},both,()=>false)")).cancelled);
 // Circle, then arrow, then X: tiny, huge, wide and tall versions must behave alike.
 const baseAccuracy=run('drawingAccuracy(reference)');
 for (const [sx,sy] of [[.02,.02],[8,8],[.15,2],[3,.12]]) {
  context.sx=sx;context.sy=sy;
  run('var sized=[reference[0],reference[1],reference[2],reference[3],reference[4]].map(stroke=>stroke.map(p=>({x:p.x*sx+300,y:p.y*sy+50})))');
  assert(run('segmentPlanaPattern(sized).valid'));
  assert(Math.abs(run('drawingAccuracy(sized)')-baseAccuracy)<.001);
  const scaled=await run("recognizeWeaponPattern(sized,{id:'plana-umbrella'},{recognize:async()=>[]})");
  assert(scaled.valid);assert.equal(scaled.damageMultiplier,2);
 }
 run("var equipped=[{id:'future-weapon',icon:'a'},{id:'plana-umbrella',icon:'b'}]");
 const matched=await run("recognizeLoadoutPattern(reference,equipped,{recognize:async()=>[]})");
 assert(matched.valid);assert.equal(matched.weapon.id,'plana-umbrella');
 assert.equal(run('equipped[0].skillCooldownRemaining'),undefined);
 console.log('PASS: circle-arrow-X order and equivalent casting/damage for tiny, huge and squashed patterns.');
 console.log('PASS: CLIP and QuickDraw cooperation, rough-symbol rescue, empty/incorrect rejection, offline fallback, cancellation, reference invariance, accuracy damage anchors and limits.');
})().catch(error=>{console.error(error);process.exitCode=1});
// Supernova uses its own shape reference, independent of Umbrella recognition.
(async()=>{
 const recognizer={recognize:async()=>[]};
 context.superRecognizer=recognizer;
 assert(run('drawingAccuracy(supernovaReferenceStrokes(),supernovaReferenceStrokes())')>.99);
 const result=await run('recognizeSupernovaPattern(supernovaReferenceStrokes(),superRecognizer,()=>true)');
 assert.equal(result.valid,true);assert.equal(result.skillId,'supernova-beam');
 const scaled=await run('recognizeSupernovaPattern(supernovaReferenceStrokes().reverse().map(s=>s.slice().reverse().map(p=>({x:p.x*.15+100,y:p.y*.15+300}))),superRecognizer,()=>true)');
 assert.equal(scaled.valid,true);
 const wrong=await run('recognizeSupernovaPattern(planaReferenceStrokes(),superRecognizer,()=>true)');
 assert.equal(wrong.valid,false);
 console.log('PASS: Supernova reference, small/reversed strokes, and rejection of Umbrella symbol.');
})().catch(e=>{console.error(e);process.exitCode=1});

(async()=>{
 for(const count of [3]) {
  context.spikes=count;
  const result=await run('recognizeSupernovaPattern(supernovaReferenceStrokes(spikes),superRecognizer,()=>true)');
  assert.equal(result.valid,true,`crown${count}`);assert(result.accuracy>.99);
 }
 const missing=await run('recognizeSupernovaPattern([supernovaReferenceStrokes()[0]],superRecognizer,()=>true)');
 assert.equal(missing.valid,false);
 console.log('PASS: open-bottom3spike crown accepted and missing diamond rejected.');
})().catch(e=>{console.error(e);process.exitCode=1});

(async()=>{
 const ai={recognize:async()=>[],recognizeSymbol:async()=>[{label:'a hand drawn circle enclosing an arrow above an X cross',score:.99}]};
 context.routingRecognizer=ai;
 for(const order of [0,1]) {
  context.order=order;
  const result=await run("recognizeLoadoutPattern(supernovaReferenceStrokes(),order?[{id:'aris-laser',icon:'s'},{id:'plana-umbrella',icon:'u'}]:[{id:'plana-umbrella',icon:'u'},{id:'aris-laser',icon:'s'}],routingRecognizer)");
  assert.equal(result.weapon.id,'aris-laser');assert.equal(result.skillId,'supernova-beam');
 }
 const umbrella=await run("recognizeLoadoutPattern(planaReferenceStrokes(),[{id:'aris-laser',icon:'s'},{id:'plana-umbrella',icon:'u'}],routingRecognizer)");
 assert.equal(umbrella.weapon.id,'plana-umbrella');
 console.log('PASS: Supernova selects closest skill in either slot order despite misleading Umbrella AI prediction.');
})().catch(e=>{console.error(e);process.exitCode=1});
assert.equal(run("closestDrawingSkill([], [{id:'plana-umbrella',icon:'u'}])"),null);
assert.equal(run("closestDrawingSkill(supernovaReferenceStrokes(),[{id:'plana-umbrella',icon:'u'},{id:'aris-laser',icon:'s'}]).id"),'aris-laser');
console.log('PASS: local cancellation matcher returns no empty target and chooses Supernova over first-slot Umbrella.');
