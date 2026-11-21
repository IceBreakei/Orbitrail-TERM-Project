const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let damage=[],draws=[],effectsHit=[];const enemies=[{id:'near',x:20,y:0},{id:'far',x:200,y:0}];
const c=vm.createContext({getAllEnemies:()=>enemies,getEnemyHurtbox:e=>({...e,rx:5,ry:5}),damageEnemy:(...a)=>{damage.push(a);return enemies.find(e=>e.id===a[0]);},drawArtilleryExplosion:(...a)=>draws.push(a),artilleryExplosionDuration:.9});
for(const name of ['tuning-parts','tuning-explosions'])vm.runInContext(fs.readFileSync(`Development/${name}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),c);
const run=s=>vm.runInContext(s,c);c.recordHit=e=>effectsHit.push(e.id);
run('var p={label:"Plana",tuningParts:createTuningRun()};p.tuningParts.equipped[0]={id:"explosive-tuning",level:1};var shot={};var rollOptions;var args={player:p,projectile:shot,enemy:{x:0,y:0},rollDamage:(target,multiplier,options)=>{rollOptions=options;return {damage:Math.round(100*multiplier),type:"critical"}},onHit:recordHit,random:()=>.09}');
assert(run('tryTuningExplosion(args)'));assert.equal(damage.length,1);assert.equal(damage[0][0],'near');assert.equal(damage[0][1],30);assert.equal(damage[0][3],'critical');assert.equal(run('rollOptions.growthEligible'),false);assert.deepEqual(effectsHit,['near']);
assert.equal(run('tryTuningExplosion(args)'),false);assert.equal(damage.length,1);
for(const [level,chance] of [[1,.1],[2,.2],[3,.3]]){run(`p.tuningParts.equipped[0].level=${level}`);assert.equal(run(`tryTuningExplosion({...args,projectile:{},random:()=>${chance}})`),false);assert(run(`tryTuningExplosion({...args,projectile:{},random:()=>${chance}-.001})`));}
run('drawTuningExplosions({},{});updateTuningExplosions(1)');const drawn=draws.length;run('drawTuningExplosions({},{})');assert.equal(draws.length,drawn);assert.equal(draws[0][2].radius,48);
assert(fs.existsSync('sprites/icons/Event 06 - Buff 12.png'));
console.log('PASS:10/20/30percent,one proc per projectile,30percent nearby splash,critical/on-hit inheritance,Growth exclusion and finite small artillery animation.');

assert.equal(run('tryTuningExplosion({...args,projectile:{},weaponId:"aris-laser"})'),false);

const luxuryHits=[];c.tryLuxeryTuningHit=args=>luxuryHits.push(args);run('p.tuningParts.equipped[1]={id:"luxery-tuning",level:1};tryTuningExplosion({...args,projectile:{},random:()=>0})');assert.equal(luxuryHits.length,1);assert.equal(luxuryHits[0].damage,30);assert.equal(luxuryHits[0].enemy.id,'near');
console.log('PASS: Explosive Tuning splash invokes Luxery Tuning with its own hit damage.');
