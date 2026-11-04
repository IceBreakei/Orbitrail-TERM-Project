const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let callback,cancelled=false;const draws=[],elements=[];
function element(tag){const e={tag,children:[],listeners:{},append(...items){this.children.push(...items)},addEventListener(name,fn){this.listeners[name]=fn},showModal(){},close(){this.listeners.close?.()},remove(){},getContext(){return {clearRect(){},save(){},restore(){},translate(){},scale(){},drawImage(...args){draws.push(args)}}}};elements.push(e);return e;}
const image={naturalWidth:200,naturalHeight:180};
const c=vm.createContext({document:{querySelector:()=>null,createElement:element,body:element('body')},performance:{now:()=>0},requestAnimationFrame:fn=>{callback=fn;return 1},cancelAnimationFrame:()=>{cancelled=true},spriteDisplayPadding:4,normalSpriteSize:89.6,bossBehaviorSettings:{neru:{compressSeconds:.55,leapSeconds:1,recoverySeconds:.5,leapHeight:210}}});
for(const file of ['gif-animation','animation-lineup'])vm.runInContext(fs.readFileSync('Development/'+file+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const sheet={image,layout:{columnEdges:[0,40,80,120,160,200],rowEdges:Array.from({length:5},()=>[0,20,40,60,80,100,120,140,160])},rows:{down:0,downLeft:1,left:2,upLeft:3,up:4,upRight:5,right:6,downRight:7},frameSequence:[0,1,2,3,4]};
c.characters={mob:{...sheet,label:'Mob'},shiroko:{label:'Shiroko',boss:true,image,animationFrames:[{image,duration:100}]},arisu:{label:'Arisu',boss:true,image,animationFrames:[{image,duration:100}],actionAnimations:{charge:[{image,duration:100}]}},iroha:{...sheet,label:'Iroha',boss:true,horizontalFacingOnly:true,attacks:{cannon:{rows:{left:2,right:3}},artillery:{rows:{left:4,right:5}}}}};
vm.runInContext('openAnimationLineup(characters)',c);callback(110);
assert.equal(draws.length,20);
assert(draws.every(args=>args.slice(1).every(Number.isFinite)));
assert(elements.some(e=>e.textContent==='Arisu / charge'));
elements.find(e=>e.tag==='dialog').close();assert(cancelled);
console.log('PASS: Mob fallback, boss GIFs, Arisu charge clip, Iroha actions, all finite draw coordinates and clean close.');

// A narrow final cannon crop must not be fitted larger than the earlier frames.
c.testTemplate={...sheet,spriteSize:300,referenceSize:165};
const stableScale=vm.runInContext('lineupSheetScale(testTemplate)',c);
c.testTemplate.layout={...sheet.layout,frames:{0:{0:{width:40,height:20},1:{width:30,height:20}}}};
assert.equal(vm.runInContext('lineupSheetScale(testTemplate)',c),stableScale);
