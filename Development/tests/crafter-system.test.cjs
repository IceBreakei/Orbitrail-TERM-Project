const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let credits=1000,notes=1,allowLanding=true,menuHandlers;
const nodes=[];
function element(tag){const node={tag,children:[],listeners:{},hidden:false,append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},setAttribute(){},addEventListener(name,fn){this.listeners[name]=fn},showModal(){this.open=true},close(){this.open=false},focus(){},querySelector(){return this.children.find(x=>x.tag==='button'&&!x.disabled)||null}};nodes.push(node);return node;}
const canvas={parentElement:element('div'),focus(){}};
const c=vm.createContext({createCrafterMenu:options=>{menuHandlers=options;return {open(){},close(){},refresh(){}}},document:{createElement:element,body:element('body')},Image:class{constructor(){this.naturalWidth=2048}decode(){return Promise.resolve()}},setTimeout:()=>1,clearTimeout(){},safeDropLanding:(x,y)=>allowLanding?{x,y}:null,getLootTotals:()=>({credits,secretTechNotes:notes}),spendCredits:n=>{if(credits<n)return false;credits-=n;return true},spendSecretTechNotes:n=>{if(notes<n)return false;notes-=n;return true},canvas});
for(const n of ['game-config','combat-hitboxes','synergy-recipes','golden-crafter-rules','weapon-max-order','crafter-rules','crafter-system'])vm.runInContext(fs.readFileSync('Development/'+n+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);
run('var player={label:"Plana",x:0,y:0,attackSlots:[{id:"plana-umbrella",name:"Umbrella",level:1}]};var system=createCrafterSystem({getPlayer:()=>player,canvas});system.spawn(0,0);system.update(player,player)');assert(run('system.active'));assert.equal(run('system.count'),1);
menuHandlers.onCancel();assert.equal(run('system.active'),false);assert.equal(run('system.count'),1);
run('system.update(player,player)');assert.equal(run('system.active'),false);
run('player.x=100;system.update(player,player);player.x=0;system.update(player,player)');assert(run('system.active'));
menuHandlers.onAction('weapon:0:level');assert.equal(run('player.attackSlots[0].level'),2);assert.equal(run('system.count'),0);assert.equal(run('system.active'),false);
for(let i=0;i<20;i++)assert(run('system.spawn(100,100)'));
assert.equal(run('system.spawn(100,100)'),false);assert.equal(run('system.roll({x:0,y:0},()=>{throw Error("cap must short circuit")})'),false);
run('system.clear()');assert.equal(run('system.count'),0);
assert.equal(run('system.roll({x:100,y:100},()=>1)'),false);assert(run('system.roll({x:100,y:100},()=>0)'));
allowLanding=false;assert.equal(run('system.spawn(100,100)'),false);
console.log('PASS: walk-over menu, cancellation/reentry, free upgrade consumption, 20-ground cap, map clear, drop roll and safe placement.');

// The icon is above its ground anchor: touching its top must trigger, even >32px from anchor.
assert.equal(run('crafterTouchesPlayer({x:0,y:0},{label:"Plana",x:0,y:-65})'),true);
assert.equal(run('crafterTouchesPlayer({x:0,y:0},{label:"Arona",x:0,y:-65})'),true);
assert.equal(run('crafterTouchesPlayer({x:0,y:0},{label:"Plana",x:120,y:-65})'),false);
// Swept contact catches traversals through the icon with both endpoints outside.
assert.equal(run('crafterTouchesPlayer({x:0,y:0},{label:"Plana",x:120,y:-30},{x:-120,y:-30})'),true);
// Expanded AABB corners alone must not count when the player's circle misses the corner.
assert.equal(run('crafterTouchesPlayer({x:0,y:0},{label:"Plana",x:38,y:-77})'),false);

// Golden drops are independent, capped at one, and require a real MAX-pair recipe automatically.
allowLanding=true;
run('var gold=createCrafterSystem({getPlayer:()=>player,canvas,golden:true,getMinuteTimer:()=>20})');
assert.equal(run('gold.roll({x:0,y:0},()=>0)'),false);
assert(run('gold.spawn(0,0)'));assert.equal(run('gold.spawn(0,0)'),false);
run('player.x=0;player.y=0;gold.update(player,player)');assert(run('gold.active'));
menuHandlers.onAction('invalid');assert.equal(run('gold.count'),1);
menuHandlers.onCancel();assert.equal(run('gold.count'),1);run('gold.clear()');
run('player.attackSlots=[{id:"plana-umbrella",level:7},{id:"aris-laser",level:7}];synergyRecipes.push({id:"test",ingredients:["plana-umbrella","aris-laser"],result:{id:"test-synergy",name:"Test",level:1,maxLevel:1}})');
assert.equal(run('gold.roll({x:0,y:0},()=>.03)'),false);
assert(run('gold.roll({x:0,y:0},()=>.01)'));
run('gold.update(player,player)');menuHandlers.onAction('synergy:test:0:1');assert.equal(run('gold.count'),0);assert.equal(run('player.attackSlots[0].id'),'test-synergy');assert.equal(run('player.attackSlots[1]'),null);
