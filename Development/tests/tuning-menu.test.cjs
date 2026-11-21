const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=[];function node(tag){const n={tag,children:[],listeners:{},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},setAttribute(k,v){this[k]=v},addEventListener(k,v){this.listeners[k]=v},focus(){},querySelector(){return this.children.find(n=>n.tag==='button')||this.children.map(n=>n.querySelector()).find(Boolean)}};nodes.push(n);return n;}
const parent=node('div'),canvas={parentElement:parent,focus(){}};const player={label:'Plana',attackSlots:[]};let statUpdates=0,credits=0;
const c=vm.createContext({document:{querySelector:()=>null,createElement:node,createElementNS:(_,tag)=>node(tag)},Image:class{},createBitmapText:el=>({setText:t=>el.text=t}),createCharacterStatsPanel:()=>({update(){statUpdates++}}),safeDropLanding:(x,y)=>({x,y}),gainCredits:n=>credits+=n,canvas,getPlayer:()=>player});
for(const name of ['game-config','combat-hitboxes','tuning-parts','pickup-reentry','tuning-system'])vm.runInContext(fs.readFileSync('Development/'+name+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);run('var system=createTuningSystem({canvas,getPlayer});system.open({id:"power-tuning",level:2})');
const root=nodes.find(n=>n.className==='tuning-menu');const find=(condition,n=root)=>condition(n)?n:n.children.map(child=>find(condition,child)).find(Boolean);
const action=text=>find(n=>n.tag==='button'&&n['aria-label']===text);
assert(statUpdates>0);assert(find(n=>n.className==='tuning-character pause-character-stats'));assert.equal(find(n=>n.className==='tuning-slots').children.length,3);assert(find(n=>n['class']==='tuning-links').children.length===3);
action('Equip').onclick();assert.equal(run('system.run.equipped[0].level'),2);
action('Remove').onclick();assert.equal(run('system.run.equipped[0]'),null);
find(n=>n.className==='tuning-found').children.find(n=>n.tag==='button').onclick();action('Sell').onclick();assert.equal(credits,100);assert(run('system.run.excluded.has("power-tuning")'));
action('Finish').onclick();assert.equal(run('system.active'),false);
run('system.run.excluded.clear();system.run.equipped[0]={id:"power-tuning",level:1};system.open({id:"power-tuning",level:3})');find(n=>n.className==='tuning-slots').children[0].onclick();action('Strengthen').onclick();assert.equal(run('system.run.equipped[0].level'),2);
console.log('PASS: attachment diagram, shared stats, three slots, equip/remove/sell and strengthen actions retain mechanics.');

const glows=[],markers=[];c.drawCrafterGlow=(...args)=>glows.push(args);c.drawCrafterMarker=(...args)=>markers.push(args);canvas.width=1280;canvas.height=720;
run('system.spawn(300,200,{id:"power-tuning",level:1});system.spawn(3000,200,{id:"power-tuning",level:1});system.draw({}, {x:0,y:0})');
assert.equal(glows.length,0);assert.equal(markers.length,1);assert.equal(markers[0][1],3000);assert.equal(markers[0][3],1280);
console.log('PASS: no Tuning Part lighting; only offscreen drops display a directional marker.');

const endpoints=run('tuningLinkEndpoints({left:400,right:460,bottom:160},[{left:200,right:260,top:300},{left:400,right:460,top:300},{left:600,right:660,top:300}],{left:100,top:50})');
assert.equal(endpoints[0].x1,330);assert.equal(endpoints[0].y1,110);assert.equal(endpoints[0].x2,130);assert.equal(endpoints[0].y2,250);assert.equal(endpoints[2].x2,530);
assert.equal(run('tuningPartSettings.groundSize'),64);
const css=fs.readFileSync('Development/movement.css','utf8');assert.match(css,/\.tuning-menu canvas \{background:transparent!important/);assert.match(css,/\.tuning-menu \.tuning-slot,\.tuning-menu \.tuning-weapon \{box-sizing:border-box;border-radius:0/);
console.log('PASS: connectors join actual box edges, transparent bitmap surfaces and64px ground icons.');

assert.match(css,/\.tuning-slots \{position:absolute;left:12%;right:12%;/);
assert.match(css,/\.tuning-hud \{position:relative;grid-column:2;grid-row:2;/);
const tuningSource=fs.readFileSync('Development/tuning-system.js','utf8');assert(tuningSource.includes('main.iconRotation??45'));assert(tuningSource.includes("document.querySelector('.hud-player-info')"));
console.log('PASS: centered slot row, angled weapon preview and tuning HUD anchored below HP numbers.');


assert(tuningSource.includes("ctx.shadowColor='#fff';ctx.shadowBlur=7"));assert.match(css,/tuning-hud img \{filter:drop-shadow/);
console.log('PASS: white sprite glow on ground and menu/HUD icons, without restoring ground lighting.');

action('Finish').onclick();run('system.run.equipped=[null,null,null];system.open({id:"power-tuning",level:2})');
const targetSlots=find(n=>n.className==='tuning-slots');targetSlots.children[2].onclick();
assert.equal(find(n=>n.className==='tuning-slots').children[2]['aria-pressed'],'true');action('Equip').onclick();assert.equal(run('system.run.equipped[2].level'),2);assert.equal(run('system.run.equipped[0]'),null);
action('Finish').onclick();run('system.open({id:"power-tuning",level:3})');find(n=>n.className==='tuning-slots').children[2].onclick();action('Swap').onclick();assert.equal(run('system.run.equipped[2].level'),3);
console.log('PASS: choosing third box directs Equip/Swap there and keeps selection visibly highlighted.');

action('Finish').onclick();run('system.run.equipped=[null,null,null];system.open({id:"power-tuning",level:1})');
let prevented=false;find(n=>n.className==='tuning-slots').children[1].listeners.pointerdown({button:0,preventDefault(){prevented=true},stopPropagation(){}});
assert(prevented);assert.equal(find(n=>n.className==='tuning-slots').children[1]['aria-pressed'],'true');
const detail=find(n=>n.className==='tuning-detail');assert(find(n=>n.text==='Power Tuning LV 1',detail));assert.equal(action('Equip').disabled,false);
action('Equip').onclick();assert.equal(run('system.run.equipped[1].id'),'power-tuning');assert.equal(run('system.run.equipped[0]'),null);
console.log('PASS: pressing empty box2 keeps Found description and enabled Equip, and equips into box2.');

const coldBounds=run('tuningGroundSpriteBounds({naturalWidth:304,naturalHeight:240},100,200)');assert.equal(coldBounds.width,64);assert(Math.abs(coldBounds.width/coldBounds.height-304/240)<1e-9);assert.equal(coldBounds.x+coldBounds.width/2,100);
console.log('PASS: Cold Tuning ground icon preserves its original304:240 proportions.');

assert.match(css,/\.tuning-hud \{[^}]*flex-direction:column/);
console.log('PASS: equipped Tuning Part HUD icons stack vertically below HP numbers.');

assert.equal(run('tuningPartLevelLabel({id:"power-tuning",level:3})'),'MAX');assert.equal(run('tuningPartLevelLabel({id:"power-tuning",level:2})'),'LV 2');assert.equal(run('tuningPartLevelLabel({id:"duel-trigger-tuning",level:2})'),'MAX');
console.log('PASS: capped stamps showMAX,includingDuelTriggerLV2;lowerlevelsretainLVnumber.');

// Finish returns Found to the ground, but repeated contact cannot reopen it.
c.player=player;
action('Finish').onclick();run('system.clear();player.x=0;player.y=0;system.run.equipped=[null,null,null];system.open({id:"power-tuning",level:1})');
action('Finish').onclick();run('system.update(player,player,20)');assert.equal(run('system.active'),false);
// Player center is outside the part's old radius, while the full circular body still overlaps.
run('player.x=40;system.update(player,player,20);player.x=0;system.update(player,player,0)');assert.equal(run('system.active'),false);
run('player.x=150;system.update(player,{x:0,y:0},1.5);system.update(player,player,1.49);player.x=0;system.update(player,{x:150,y:0},.01)');assert.equal(run('system.active'),false);
run('player.x=150;system.update(player,{x:0,y:0},0);system.update(player,player,1.5);player.x=0;system.update(player,{x:150,y:0},0)');assert.equal(run('system.active'),true);
// Equipping consumes Found; finishing that menu leaves no return drop or stale guard.
action('Equip').onclick();action('Finish').onclick();run('system.update(player,player,0)');assert.equal(run('system.active'),false);
run('system.spawn(0,0,{id:"critical-tuning",level:1});system.update(player,player,0)');assert.equal(run('system.active'),true);
console.log('PASS: Finish requires full-body clearance plus1.5s off-item; premature recontact resets it; consumed Found does not block another pickup.');
