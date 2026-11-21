const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('Development/level-up-menu.js','utf8');
const handler=source.split("window.addEventListener('keydown', event => {")[1].split('}, true);')[0];
let blocked=0,selected=0;
const c=vm.createContext({player:{},overlay:{contains:t=>t?.inMenu},choices:[{}],select(){selected++},selected:0});
for(const event of [{key:'ArrowUp',target:{}},{key:'ArrowUp',ctrlKey:true,target:{inMenu:true}},{key:'ArrowDown',target:{inMenu:true,closest:()=>true}}]) {
 c.event={...event,preventDefault(){blocked++},stopImmediatePropagation(){blocked++}};
 vm.runInContext('(function(){'+handler+'})()',c);
}
assert.equal(blocked,0);assert.equal(selected,0);
c.event={key:'ArrowDown',target:{inMenu:true},preventDefault(){blocked++},stopImmediatePropagation(){blocked++}};
vm.runInContext('(function(){'+handler+'})()',c);assert.equal(selected,1);
for(const name of ['movement.js','movement-optimized.js']) {
 const text=fs.readFileSync('Development/'+name,'utf8');
 const block=text.slice(text.indexOf('  const frozenKey=isGameplayPaused()'),text.indexOf('  context.clearRect',text.indexOf('  const frozenKey=isGameplayPaused()')));
 let paused=true,frames=0;const ctx=vm.createContext({isGameplayPaused:()=>paused,canvas:{width:1280,height:720},frozenCanvasFrame:null,requestAnimationFrame(){frames++},animate(){}});
 const render=()=>vm.runInContext('(function(){'+block+'return true;})()',ctx);
 assert.equal(render(),true);assert.equal(render(),undefined);assert.equal(frames,1);paused=false;assert.equal(render(),true);
}
console.log('PASS: upgrade keys scoped to menu, shortcuts/admin input untouched, paused render reused and normal redraw resumes.');
