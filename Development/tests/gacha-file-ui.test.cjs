const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const nodes=[],listeners={};let rect={left:90,top:280,width:1280,height:720},tick,awarded=0;
function element(tag){const e={tag,children:[],handlers:{},style:{setProperty(k,v){this[k]=v}},classList:{toggle(){},add(){}},append(...children){this.children.push(...children)},replaceChildren(){this.children=[]},setAttribute(k,v){this[k]=v},addEventListener(k,v){this.handlers[k]=v},getBoundingClientRect:()=>({...rect,bottom:rect.top+rect.height}),showModal(){},close(){},focus(){}};nodes.push(e);return e;}
const canvas={getBoundingClientRect:()=>rect,width:1280,height:720,focus(){}};
const c=vm.createContext({document:{createElement:element,body:element('body')},window:{addEventListener:(name,fn)=>listeners[name]=fn},Image:class{decode(){return Promise.resolve()}},ResizeObserver:class{constructor(fn){listeners.resizeObserver=fn}observe(){}},fileSettings:{icon:'file.png',maxGround:20},safeDropLanding:(x,y)=>({x,y}),getCombatHitbox:p=>({...p,rx:10,ry:10}),segmentHitsBody:()=>true,createCharacterStatsPanel:()=>({update(){}}),createBitmapText:canvas=>({setText(value){canvas.renderedText=value}}),rollFileRewards:()=>({type:'normal',products:[],credits:123}),gainCredits:n=>awarded+=n,performance:{now:()=>0},requestAnimationFrame:fn=>{tick=fn;return 1},cancelAnimationFrame(){}});
vm.runInContext(fs.readFileSync('Development/gacha-files.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
c.canvas=canvas;vm.runInContext('var files=createGachaFiles({canvas,getPlayer:()=>({x:10,y:10})});files.spawn(10,10);files.update({x:10,y:10})',c);
const dialog=nodes.find(n=>n.tag==='dialog');assert.equal(dialog.style.top,'280px');
rect={...rect,top:80};listeners.scroll();assert.equal(dialog.style.top,'80px');
rect={...rect,left:20,width:900};listeners.resizeObserver();assert.equal(dialog.style.width,'900px');
const counter=nodes.find(n=>n.className==='gacha-file-counter');assert.equal(counter.children[1].tag,'canvas');
nodes.find(n=>n.className==='gacha-file-package').handlers.click();tick(2200);
assert.equal(counter.children[1].renderedText,'123');assert.equal(awarded,123);
console.log('PASS: File overlay follows scroll/resize; Credit count-up uses bitmap canvas and awards once.');
