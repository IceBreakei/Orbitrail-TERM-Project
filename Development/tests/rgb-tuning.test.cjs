const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const c=vm.createContext({});
for(const name of ['game-config','tuning-parts','item-catalog','combat-stats','weapon-progression','rgb-tuning'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);run('var p={label:"Plana",attackSlots:[{id:"plana-umbrella",level:1}],tuningParts:createTuningRun()};var base=totalWeaponDamage(p,"plana-umbrella",1.2);');
for(const level of [1,2,3]){run(`p.tuningParts.equipped[0]={id:"rgb-tuning",level:${level}}`);assert(run('rgbTuningActive(p)'));assert.equal(run('rgbTuningActive(p,"aris-laser")'),true);assert.equal(run('totalWeaponDamage(p,"plana-umbrella",1.2)'),run('base'));assert.equal(run('umbrellaLevelStats(p).intervalMultiplier'),1);}
const stops=[],fills=[];let composites=[];const context={save(){},restore(){},createLinearGradient(){return {addColorStop:(...a)=>stops.push(a)}},fillRect:(...a)=>fills.push(a),set globalCompositeOperation(v){composites.push(v)}};c.context=context;run('tintRainbowTrail(context,200,200)');assert.equal(stops.length,7);assert.equal(stops[0][0],0);assert.equal(stops[6][0],1);assert.deepEqual(composites,['source-atop']);assert.equal(fills.length,1);
assert(fs.existsSync('sprites/icons/Peroro Mochi.png'));assert.equal(run('tuningPartCatalog.find(p=>p.id==="rgb-tuning").weight'),2);
console.log('PASS: RGB cosmetic at all3levels,7-color trail-only tint,all-weapon cosmetic scope,no damage/interval changes and asset.');

vm.runInContext(fs.readFileSync('Development/luminous-nova.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\}.*;\r?\n/gm,'').replaceAll('export ',''),c);
const rendered=[];const gradient=()=>({addColorStop:(offset,color)=>rendered.push(color)});
c.renderContext=new Proxy({canvas:{width:1280,height:720},createLinearGradient:gradient,createRadialGradient:gradient},{get:(target,key)=>key in target?target[key]:()=>{}});
run('drawLuminousPlasma(renderContext,{x:0,y:0},{x:200,y:200,age:.2,angle:0,speed:1200,rainbow:true,rainbowPhase:.3})');
assert(rendered.some(color=>{const parts=color.match(/^rgba?\((\d+),(\d+),(\d+)/);return parts&&+parts[2]>+parts[1]&&+parts[2]>+parts[3]}));
assert(!rendered.includes('rgba(244,48,186,.35)'));
assert.equal(run('rainbowPlasmaColor("rgba(244,48,186,.35)",120)').endsWith(',.35)'),true);
console.log('PASS: actual plasma renderer recolors head/bloom as well as trail, preserving alpha.');
