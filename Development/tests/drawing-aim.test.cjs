const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const items=new Map();
function el(id){if(!items.has(id))items.set(id,{width:1280,height:720,hidden:true,checked:false,style:{setProperty(){}},classList:{toggle(){}},listeners:{},
 addEventListener(type,fn){this.listeners[type]=fn},setAttribute(){},getContext(){return {clearRect(){}}},
 getBoundingClientRect(){return {left:0,top:0,width:1280,height:720}},setPointerCapture(){this.captured=true},hasPointerCapture(){return !!this.captured},releasePointerCapture(){this.captured=false}});return items.get(id)}
let overrides=[];
const aiming={state:{cursorAim:true,pointer:{}},setDirectionalOverride(value){this.state.directionalOverride=value;overrides.push(value)},trackPointer(e){this.state.pointer={x:e.clientX,y:e.clientY}},setPointerInside(){}};
const c=vm.createContext({URL,Image:class{},document:{querySelector:el},window:{addEventListener(){}},setTimeout:()=>0,clearTimeout(){},
 closestDrawingSkill:()=>null, pointerToCanvas:(x,y)=>({x,y}),drawSkillStrokes(){},aiming,canvas:el('arena'),recognizer:{warmup:()=>Promise.resolve()},
 owner:{attackSlots:[{id:'plana-umbrella',icon:'x'}]}});
for(const file of ['game-config','skill-cast-state','skill-casting']){
 const source=fs.readFileSync(`Development/${file}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','').replaceAll('import.meta.url',"'file:///Development/skill-casting.js'");vm.runInContext(source,c);
}
vm.runInContext('var caster=createSkillCasting({canvas,aiming,recognizer,getPlayer:()=>owner,getCharacters:()=>[owner],isPaused:()=>false});',c);
const event=(button,x=200,y=150)=>({button,clientX:x,clientY:y,pointerId:1,preventDefault(){},stopPropagation(){}});
el('arena').listeners.pointerdown(event(2));
assert.equal(aiming.state.directionalOverride,false);
el('#skill-drawing-canvas').listeners.pointermove(event(0,300,250));
assert.deepEqual(aiming.state.pointer,{x:300,y:250});
el('#skill-drawing-canvas').listeners.pointerdown(event(0));assert.equal(aiming.state.directionalOverride,true);
el('#skill-drawing-canvas').listeners.pointerup(event(0,220,160));assert.equal(aiming.state.directionalOverride,false);
assert.equal(aiming.state.cursorAim,true);
vm.runInContext("caster.cancel('right')",c);assert.equal(aiming.state.directionalOverride,false);
console.log('PASS: idle drawing screen tracks cursor, held stroke uses facing, release/cancel restores unchanged cursor-aim preference.');
