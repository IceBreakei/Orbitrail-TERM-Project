const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const nodes=[],actions=[];let cancelled=0;
function node(tag){const classes=new Set();const e={tag,children:[],listeners:{},style:{},classList:{toggle(key,on){if(on)classes.add(key);else classes.delete(key)},contains:key=>classes.has(key)},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},setAttribute(k,v){this[k]=v},addEventListener(k,v){this.listeners[k]=v},showModal(){this.open=true},close(){this.open=false},focus(){this.focused=true}};nodes.push(e);return e;}
const player={label:'Plana',hp:110,maxHp:110,combatStats:{},attackSlots:[{id:'plana-umbrella',name:'Umbrella',level:5},{id:'aris-laser',name:'Supernova',level:7}],equipmentSlots:[{id:'test-item',name:'Test item',level:1,maxLevel:2}]};
const c=vm.createContext({document:{createElement:node,body:node('body')},Image:class{},canvas:{getBoundingClientRect:()=>({left:100,top:80,width:1280,height:720})},getPlayer:()=>player,onCancel:()=>cancelled++,onAction:id=>actions.push(id),ensurePlayerStats:p=>p,createBitmapText:canvas=>({setText:value=>{canvas.renderedText=value}}),getLootTotals:()=>({credits:1000,secretTechNotes:1}),rollLevelUpgrades:()=>[{weapon:player.attackSlots[0],description:'Increase area by 20%.'}]});
for(const name of ['game-config','synergy-recipes','golden-crafter-rules','weapon-max-order','crafter-rules','character-stats-panel','weapon-glow','synergy-icon','upgrade-label','crafter-menu'])vm.runInContext(fs.readFileSync('Development/'+name+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
vm.runInContext('var menu=createCrafterMenu({canvas,getPlayer,onCancel,onAction});menu.open()',c);
const grids=nodes.filter(n=>n.className==='crafter-slot-grid');assert.equal(grids.length,2);assert.equal(grids[0].children.length,6);assert.equal(grids[1].children.length,6);
assert.equal(grids[0]['aria-label'],'Weapons');assert.equal(grids[1]['aria-label'],'Equipment');
assert.equal(actions.length,0); // Selecting is never a purchase.
const confirm=nodes.find(n=>n.id==='crafter-confirm');confirm.listeners.click();assert.equal(actions.at(-1),'weapon:0:level');
grids[1].children[0].listeners.click();assert.equal(actions.length,1);confirm.listeners.click();assert.equal(actions.at(-1),'item:0:level');
grids[0].children[1].listeners.click();confirm.listeners.click();assert.equal(actions.at(-1),'weapon:1:enhance');
assert(grids[0].children.slice(2).every(n=>n.disabled));
const dialog=nodes.find(n=>n.tag==='dialog');assert.equal(dialog.style.width,'1280px');assert.equal(dialog.style.left,'100px');
dialog.listeners.keydown({key:'ArrowLeft',target:dialog,preventDefault(){}});confirm.listeners.click();assert.equal(actions.at(-1),'weapon:0:level');
dialog.listeners.cancel({preventDefault(){}});assert.equal(cancelled,1);
assert(nodes.some(n=>n.renderedText==='UPGRADE!'));
console.log('PASS: six weapon/six equipment slots, selection before purchase, matching details/action, keyboard navigation, viewport alignment and cancellation.');

assert(nodes.some(n=>n.className==='pause-hologram'));
assert(nodes.some(n=>n.className==='pause-stat-content'));
assert.equal(nodes.filter(n=>n.className==='pause-stat-row').length,6);
assert(nodes.some(n=>n.renderedText==='0%')); // CRT follows Pause formatting without an added plus sign.

vm.runInContext('var goldMenu=createCrafterMenu({canvas,getPlayer,onCancel,onAction,golden:true});goldMenu.open()',c);
const goldConfirm=nodes.find(n=>n.id==='golden-crafter-confirm');assert(goldConfirm.disabled);
assert(nodes.some(n=>n.renderedText==='SYNNERGIZE!'));
assert(nodes.some(n=>n.renderedText==='No compatible MAX-level weapon pair.'));

// Only MAX weapons belonging to a real pair are selectable or receive wind rings.
player.attackSlots[0].level=7;player.attackSlots[1].level=7;
player.attackSlots.push({id:'unrelated',name:'Unrelated',level:7,maxLevel:7});
vm.runInContext('synergyRecipes.push({id:"visual-pair",ingredients:["plana-umbrella","aris-laser"],result:{id:"test-synergy",name:"Test Synergy",maxLevel:1}});goldMenu.refresh()',c);
const goldGrids=nodes.filter(n=>n.className==='crafter-slot-grid').slice(-2);
assert.equal(goldGrids[1].hidden,true);
const goldSlots=goldGrids[0].children;
assert(!goldSlots[0].disabled&&!goldSlots[1].disabled);assert(goldSlots[2].disabled);
assert(goldConfirm.disabled,'Fusion starts with empty boxes');
let pair=nodes.filter(n=>n.className==='golden-fusion-preview').at(-1);
assert.equal(pair.children[0].children[0]['aria-label'],'Select weapon');
goldSlots[0].listeners.click();assert(goldConfirm.disabled,'One ingredient is insufficient');
pair=nodes.filter(n=>n.className==='golden-fusion-preview').at(-1);
assert.equal(pair.children[0].children[0]['aria-label'],'Umbrella');
assert.equal(pair.children[2].children[0]['aria-label'],'Select weapon');
goldGrids[0].children[1].listeners.click();
assert(!goldConfirm.disabled);
assert(goldGrids[0].children[0].classList.contains('golden-wind-active'));
assert(goldGrids[0].children[1].classList.contains('golden-wind-active'));
pair=nodes.filter(n=>n.className==='golden-fusion-preview').at(-1);
assert.equal(pair.children.length,3);assert.equal(pair.children[0].children[1].className,'golden-fusion-box');
assert.equal(pair.children[2].children[0]['aria-label'],'Supernova');
pair.children[0].children[1].listeners.click();assert(goldConfirm.disabled,'Removing an ingredient disables fusion');
goldGrids[0].children[0].listeners.click();
assert(!goldConfirm.disabled);goldConfirm.listeners.click();assert.equal(actions.at(-1),'synergy:visual-pair:0:1');
assert(nodes.some(n=>n.renderedText==='Umbrella'));assert(nodes.some(n=>n.renderedText==='Supernova'));


