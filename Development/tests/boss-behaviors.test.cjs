const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const damage=[];
const c=vm.createContext({artilleryExplosionDuration:.9,drawArtilleryExplosion(){},damagePlayer:(player,amount)=>{damage.push(amount);return true;},getCombatHitbox:p=>({x:p.x,y:p.y,rx:8,ry:8})});
for(const n of ['game-config','boss-behaviors'])vm.runInContext(fs.readFileSync('Development/'+n+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replace('bossBehaviorSettings as settings','bossBehaviorSettings').replaceAll('export ',''),c);
vm.runInContext('var measuredNeruCenter=neruBodyCenterOffsetY;neruBodyCenterOffsetY=()=>0;var measuredBodyCenter=arisuBodyCenterOffsetY;arisuBodyCenterOffsetY=()=>0;var settings=bossBehaviorSettings;settings.arisu.warningOffsetY=0',c);
const run=s=>vm.runInContext(s,c);
run('var attackRoll=0;var ai=createBossBehaviors({random:()=>attackRoll});var player={x:500,y:300,contactIFrames:0};var view={x:0,y:0,width:1280,height:720};var arisu={id:"arisu",type:"arisu",x:200,y:300,spriteSize:200,ai:true,contactDamage:15,bossCooldown:0}');
assert.equal(run('ai.updateNpc(arisu,player,.1,view)'),true);
assert.equal(run('arisu.bossAction.clip'),'charge');
run('ai.updateNpc(arisu,player,2.8,view)');assert.equal(run('arisu.x'),200);
run('ai.updateNpc(arisu,player,.1,view)');assert.equal(run('arisu.bossAction.name'),'charge');
run('player.y=600;ai.updateNpc(arisu,player,.1,view)');assert.equal(run('arisu.y'),300);assert(run('arisu.x')>200);
run('player.y=340;var iroha={id:"iroha",type:"iroha",x:200,y:300,ai:true,bossCooldown:0,contactDamage:20};ai.updateNpc(iroha,player,1.75,view)');
assert.equal(run('iroha.attack.name'),'cannon');assert.equal(run('ai.projectileCount'),1);
run('ai.updateNpc(iroha,player,1,view);player.y=600;attackRoll=.99;iroha.bossCooldown=0;ai.updateNpc(iroha,player,.5,view)');
assert.equal(run('iroha.attack.name'),'artillery');assert.equal(run('ai.zoneCount'),5);
run('var neru={id:"neru",type:"neru",x:100,y:100,ai:true,bossCooldown:0,contactDamage:20};ai.updateNpc(neru,player,.1,view)');
assert.equal(run('neru.bossAction.clip'),'shoot');assert(run('ai.projectileCount')>=13);
run('ai.updateNpc(neru,player,2,view);neru.bossCooldown=0;ai.updateNpc(neru,player,.1,view)');
assert.equal(run('neru.bossAction.name'),'compress');assert(run('neru.bossSquash')<1);
run('ai.updateNpc(neru,player,.9,view)');assert.equal(run('neru.bossAction.name'),'leap');
run('player.x+=100;ai.updateNpc(neru,player,1,view)');assert(run('neru.bossVisualOffsetY')<-720);
run('player.x+=100;ai.updateNpc(neru,player,2.9,view)');assert.equal(run('neru.bossAction.aimLocked'),false);
run('ai.updateNpc(neru,player,.22,view);var targetX=neru.bossAction.targetX;player.x+=200;ai.updateNpc(neru,player,.9,view)');assert.equal(run('neru.bossAction.targetX'),run('targetX'));assert(run('neru.bossVisualOffsetY')<-720);
run('ai.updateNpc(neru,player,.1,view);ai.updateNpc(neru,player,1,view)');assert.equal(run('neru.x'),run('targetX'));assert.equal(run('neru.bossVisualOffsetY'),0);assert.equal(run('neru.bossAction.name'),'recover');
assert.equal(run('ai.updateNpc({type:"shiroko",ai:true},player,1,view)'),false);
assert.equal(run('ai.updateNpc({...arisu,ai:false},player,1,view)'),false);
run('ai.updateEffects(0,player,[])');assert.equal(run('ai.projectileCount'),0);assert.equal(run('ai.zoneCount'),0);
console.log('PASS: Arisu 3s charge and locked direction; Iroha alternating cannon/artillery; Neru bullets/compress/leap; Shiroko chase fallback; dead-owner cleanup.');

// Projectile impacts share normal damage I-frames, and dead owners leave no attacks behind.
run('var effects=createBossBehaviors({random:()=>0});var shooter={id:"tank",type:"iroha",x:200,y:300,ai:true,bossCooldown:0,contactDamage:20};player.x=500;player.y=300;player.contactIFrames=0;effects.updateNpc(shooter,player,1.75,view);player.y=330;effects.updateEffects(.7,player,[shooter])');
assert.equal(damage.at(-1),20);assert(run('player.contactIFrames')>0);assert.equal(run('effects.projectileCount'),1);
// Arisu warns without moving, draws converging lane lines, and sweeps for fixed 20 dash damage.
run('var dashAI=createBossBehaviors({random:()=>0});var dashBoss={id:"dash",type:"arisu",x:100,y:300,spriteSize:200,ai:true,bossCooldown:0,contactDamage:15};player.x=500;player.y=300;player.contactIFrames=0;dashAI.updateNpc(dashBoss,player,1,view)');
const lines=[];c.warningContext={save(){},restore(){},translate(){},rotate(){},fillRect(){},strokeRect(){},beginPath(){},moveTo(x,y){lines.push(y)},lineTo(){},stroke(){}};
run('dashAI.draw(warningContext,{x:0,y:0})');assert(lines.some(v=>v>0&&v<97));assert.equal(run('dashBoss.x'),100);
run('dashAI.updateNpc(dashBoss,player,2,view);dashAI.updateNpc(dashBoss,player,1,view)');assert.equal(damage.at(-1),20);assert(run('player.contactIFrames')>0);
run('player.y=600;dashAI.updateNpc(dashBoss,player,.2,view)');assert.equal(run('dashBoss.y'),300);
console.log('PASS: translucent converging warning lane, stationary windup, locked dash and fixed20 damage.');

assert(run('dashBoss.bossAction.speed')>0);run('dashAI.updateNpc(dashBoss,player,1,view)');assert.equal(run('dashBoss.bossAction'),null);
run('var centered=createBossBehaviors({random:()=>0});var centeredBoss={id:"centered",type:"arisu",x:100,y:300,spriteSize:240,spriteHurtbox:{offsetX:12,offsetY:-40},ai:true,bossCooldown:0};var translates=[];warningContext.translate=(x,y)=>translates.push([x,y]);centered.updateNpc(centeredBoss,player,1,view);centered.draw(warningContext,{x:0,y:0})');
assert.equal(run('translates[0][0]'),112);assert.equal(run('translates[0][1]'),300);
console.log('PASS: sprite-centered warning and deceleration after passing launch-time player position.');

run('settings.arisu.warningOffsetY=20;var lockAI=createBossBehaviors({random:()=>0});var lockBoss={id:"lock",type:"arisu",x:100,y:300,spriteSize:240,ai:true,bossCooldown:0};player.x=500;player.y=320;lockAI.updateNpc(lockBoss,player,2,view);var lockedAngle=lockBoss.bossAction.angle;player.y=600;lockAI.updateNpc(lockBoss,player,.9,view)');
assert.equal(run('lockBoss.bossAction.angle'),run('lockedAngle'));assert.equal(run('lockBoss.bossAction.name'),'chargeUp');
run('lockAI.updateNpc(lockBoss,player,.1,view)');assert.equal(run('lockBoss.bossAction.name'),'charge');assert.equal(run('lockBoss.bossAction.angle'),run('lockedAngle'));
console.log('PASS: three-second windup with aim frozen for the final second.');

// Timed braking is smooth and frame-step independent in every travel direction.
for(const [dx,dy] of [[400,300],[-400,300],[400,-300],[-400,-300],[400,0],[0,-300]]) {
 c.testDX=dx;c.testDY=dy;
 run('settings.arisu.warningOffsetY=0;var axisAI=createBossBehaviors({random:()=>0});var axisBoss={id:"axis",type:"arisu",x:600,y:400,spriteSize:240,ai:true,bossCooldown:0};player.x=600+testDX;player.y=400+testDY;axisAI.updateNpc(axisBoss,player,2,view);axisAI.updateNpc(axisBoss,player,1,view);var initialSpeed=axisBoss.bossAction.speed;axisAI.updateNpc(axisBoss,player,axisBoss.bossAction.brakeAt/1375,view);axisAI.updateNpc(axisBoss,player,.75,view)');
 assert(run('axisBoss.bossAction.speed')>0);assert(run('axisBoss.bossAction.speed')<run('initialSpeed')/2);
 run('axisAI.updateNpc(axisBoss,player,.74,view)');assert(run('axisBoss.bossAction.speed')>0);
 run('axisAI.updateNpc(axisBoss,player,.01,view)');assert.equal(run('axisBoss.bossAction'),null);
 assert.equal(run('axisAI.updateNpc(axisBoss,player,.1,view)'),false);assert(run('axisBoss.bossCooldown')>7);
}
console.log('PASS: continuous 1.5-second braking and chase fallback in cardinal and diagonal directions.');

run('var stopAI=createBossBehaviors({random:()=>0});var stopBoss={id:"stop",type:"arisu",x:200,y:300,spriteSize:240,ai:true,bossCooldown:0};player.x=600;player.y=300;stopAI.updateNpc(stopBoss,player,2,view);stopAI.updateNpc(stopBoss,player,1,view);for(let i=0;i<240;i++)stopAI.updateNpc(stopBoss,player,1/120,view)');
assert.equal(run('stopBoss.bossAction'),null);assert(Math.abs(run('stopBoss.x')-820)<1e-6);assert.equal(run('stopAI.updateNpc(stopBoss,player,.1,view)'),false);
console.log('PASS: full-speed launch, 1.5s braking, and no repeated charging.');
assert(run('measuredBodyCenter({spriteSize:446.208})')>60);assert.equal(run('initialSpeed'),1375);

// Reproduce nearly horizontal leftward flight with the actual body-center offset.
run('arisuBodyCenterOffsetY=measuredBodyCenter;var runaway=createBossBehaviors({random:()=>0});var runner={id:"runaway",type:"arisu",x:900,y:300,spriteSize:446.208,ai:true,bossCooldown:0};player.x=600;player.y=300+measuredBodyCenter(runner)-.01;runaway.updateNpc(runner,player,2,view);player.x=350;runaway.updateNpc(runner,player,1,view);var distance=runner.bossAction.targetDistance;var lastOwned=true;for(let i=0;i<240&&runner.bossAction;i++)lastOwned=runaway.updateNpc(runner,player,1/120,view)');
assert(run('distance')<551);assert(run('runner.x')>129);assert.equal(run('runner.bossAction'),null);assert.equal(run('lastOwned'),false);assert.equal(run('runner.gifElapsed'),0);assert(run('runner.bossCooldown')>7);
console.log('PASS: near-horizontal left dash has bounded range and hands back normal chase immediately.');

// A player fleeing left must be passed before braking starts; aim itself stays locked.
run('var fleeAI=createBossBehaviors({random:()=>0});var fleeBoss={id:"flee",type:"arisu",x:1000,y:300,spriteSize:446.208,ai:true,bossCooldown:0};player.x=700;player.y=300+measuredBodyCenter(fleeBoss);fleeAI.updateNpc(fleeBoss,player,2,view);player.x=460;fleeAI.updateNpc(fleeBoss,player,1,view);var fleeAngle=fleeBoss.bossAction.angle;var passed=false;for(let i=0;i<240&&fleeBoss.bossAction;i++){player.x-=240/120;fleeAI.updateNpc(fleeBoss,player,1/120,view);if(fleeBoss.bossAction?.brakingElapsed>0&&!passed){passed=true;if(fleeBoss.x>player.x+1e-6)throw Error("Braking before passing fleeing player");}if(fleeBoss.bossAction&&fleeBoss.bossAction.angle!==fleeAngle)throw Error("Dash re-aimed")}');
assert(run('passed'));assert.equal(run('fleeBoss.bossAction'),null);
console.log('PASS: fleeing left player is crossed before braking, without changing locked dash direction.');
for(const side of [-1,1]) {
 c.side=side;
 run('var cannonAI=createBossBehaviors({random:()=>0});var tank={id:"warning-tank",type:"iroha",x:600,y:300,spriteSize:300,ai:true,bossCooldown:0,contactDamage:20};player.x=600+side*200;player.y=340;cannonAI.updateNpc(tank,player,.5,view);var angles=[];warningContext.rotate=a=>angles.push(a);cannonAI.updateEffects(0,player,[tank]);cannonAI.draw(warningContext,{x:0,y:0})');
 assert.equal(run('cannonAI.projectileCount'),0);assert.equal(run('tank.x'),600);assert.equal(run('tank.y'),300);assert.equal(run('tank.moving'),false);
 assert.equal(run('angles[0]'),side<0?Math.PI:0);
 run('player.x=600-side*200;cannonAI.updateNpc(tank,player,1.24,view)');assert.equal(run('cannonAI.projectileCount'),0);
 run('cannonAI.updateNpc(tank,player,.01,view)');assert.equal(run('cannonAI.projectileCount'),1);
 // Player crossed sides during windup: the shot must retain the warned horizontal direction.
 run('player.x=600+side*400;player.y=330;player.contactIFrames=0;cannonAI.updateEffects(.5,player,[tank])');assert.equal(damage.at(-1),20);
}
console.log('PASS: stationary 1s cannon warning, left/right lock, persistent warning and horizontal shell damage.');

const plasmaCalls=[];c.drawLuminousPlasma=(...args)=>plasmaCalls.push(args);
run('var visualAI=createBossBehaviors({random:()=>0});var visualTank={id:"visual",type:"iroha",x:600,y:300,spriteSize:300,ai:true,bossCooldown:0,contactDamage:25};player.x=900;player.y=340;visualAI.updateNpc(visualTank,player,1.75,view);visualAI.draw(warningContext,{x:0,y:0})');
assert.equal(plasmaCalls.length,1);assert.equal(plasmaCalls[0][2].speed,2400);assert.equal(plasmaCalls[0][2].color,'orange');assert.equal(plasmaCalls[0][3],20);
console.log('PASS: cannon uses shared orange plasma bloom/tapered-tail renderer at2400px/s.');
// Warning reaches back into the tank; projectile bloom width and collision diameter match72px lane.
run('var backAI=createBossBehaviors({random:()=>0});var backTank={id:"back",type:"iroha",x:600,y:300,spriteSize:300,ai:true,bossCooldown:0};player.x=900;var laneRects=[];warningContext.fillRect=(...r)=>laneRects.push(r);backAI.updateNpc(backTank,player,.5,view);backAI.draw(warningContext,{x:0,y:0})');
assert(run('laneRects[0][0]')<0);assert.equal(run('laneRects[0][3]'),72);
assert.equal(plasmaCalls[0][3]*3.6,72);
console.log('PASS: warning extends behind muzzle into tank; visible bloom diameter matches72px lane.');
run('var chooser={x:600,y:300};player.x=900;player.y=340');assert.equal(run('irohaAttackChoice(chooser,player,.1,{},()=>0)'), 'cannon');
run('player.x=600;player.y=100');assert.equal(run('irohaAttackChoice(chooser,player,.1,{},()=>.99)'), 'artillery');
run('player.x=900;player.y=200');assert.equal(run('irohaAttackChoice(chooser,player,.1,{x:0,y:24},()=>.99)'), 'artillery');assert.equal(run('irohaAttackChoice(chooser,player,.1,{x:0,y:-24},()=>.99)'), 'artillery');
run('var delayed=createBossBehaviors({random:()=>0});var delayedTank={id:"delayed",type:"iroha",x:600,y:300,spriteSize:300,ai:true,bossCooldown:0};player.x=900;player.y=340;delayed.updateNpc(delayedTank,player,1,view)');assert.equal(run('delayed.projectileCount'),0);
run('delayed.updateNpc(delayedTank,player,.74,view)');assert.equal(run('delayed.projectileCount'),0);
run('delayed.updateNpc(delayedTank,player,.01,view)');assert.equal(run('delayed.projectileCount'),1);
console.log('PASS: shell waits1.75s; horizontal alignment/entry favors cannon, vertical alignment or moving away selects artillery.');

assert(Math.abs(run('delayedTank.attack.elapsed')-220)<1e-6);
assert.equal(run('Math.floor((delayedTank.attack.elapsed+1e-6)/110)'),2);
console.log('PASS: shell release synchronized to cannon muzzle-flash frame2 at1.75seconds.');

run('player.x=900;player.y=300');assert.equal(run('irohaAttackChances(chooser,player,.1).cannon'),1);assert.equal(run('irohaAttackChoice(chooser,player,.1,{},()=>.999999)'), 'cannon');
run('player.x=600;player.y=100');assert.equal(run('irohaAttackChances(chooser,player,.1).artillery'),1);
run('player.x=900;player.y=320;var chance=irohaAttackChances(chooser,player,.1).cannon');assert(run('chance')>0&&run('chance')<1);
assert.equal(run('irohaAttackChoice(chooser,player,.1,{},()=>0)'), 'cannon');assert.equal(run('irohaAttackChoice(chooser,player,.1,{},()=>.99999999)'), 'artillery');
assert.equal(run('effects.projectileCount'),1);
console.log('PASS: weighted cast-time pool, equalY guarantees cannon, equalX favors artillery and cannon persists after hitting player.');
// A piercing shell damages the player only once even if they overlap it again after I-frames expire.
const beforeRepeat=damage.length;
run('player.contactIFrames=0;player.x=1974;player.y=340;effects.updateEffects(.01,player,[shooter])');
assert.equal(damage.length,beforeRepeat);assert.equal(run('effects.projectileCount'),1);
console.log('PASS: piercing shell cannot repeatedly damage the same player.');
// Intercept unchanged trajectories on either side, including diagonal entry after a delayed release.
for(const scenario of [{x:900,y:340,vx:240,vy:0},{x:300,y:340,vx:-240,vy:0},{x:1200,y:52,vx:-80,vy:96}]) {
 c.scenario=scenario;
 run('var interceptTank={id:"intercept",type:"iroha",x:600,y:300,spriteSize:300,ai:true,bossCooldown:0,contactDamage:25};player.x=scenario.x;player.y=scenario.y;player.contactIFrames=0;var motion={x:scenario.vx*.01,y:scenario.vy*.01};var plan=irohaCannonIntercept(interceptTank,player,.01,motion)');
 assert(run('plan')!==null);
 const countBefore=damage.length;
 run('var interceptAI=createBossBehaviors({random:()=>0});for(let i=0;i<500;i++){player.x+=motion.x;player.y+=motion.y;interceptAI.updateNpc(interceptTank,player,.01,view,motion);interceptAI.updateEffects(.01,player,[interceptTank]);}');
 assert.equal(damage.length,countBefore+1);
 if(scenario.vy)assert(run('plan.fireAt')>1.75);
}
run('player.x=900;player.y=52');assert.equal(run('irohaCannonIntercept(interceptTank,player,.01,{x:0,y:-.96})'),null);
console.log('PASS: unchanged horizontal/diagonal trajectories are hit with timed shell interception; unreachable trajectories rejected.');

// Axis-based pool interpolates by angle in every quadrant.
for(const [dx,dy,wanted] of [[300,0,1],[-300,0,1],[0,300,0],[0,-300,0],[300,300,.5],[-300,300,.5],[300,-300,.5],[-300,-300,.5]]) {
 c.axisX=dx;c.axisY=dy;
 run('player.x=chooser.x+axisX;player.y=chooser.y+axisY');
 assert(Math.abs(run('irohaAttackChances(chooser,player).cannon')-wanted)<1e-10);
}
run('player.x=900;player.y=600');assert.equal(run('irohaAttackChoice(chooser,player,.1,{},()=>.49)'), 'cannon');assert.equal(run('irohaAttackChoice(chooser,player,.1,{},()=>.5)'), 'artillery');
console.log('PASS: horizontal100% cannon, vertical100% artillery, diagonal50/50 across all quadrants.');

const angleChance=degrees=>{c.degrees=degrees;return run('irohaAttackChances({x:0,y:0},{x:Math.cos(degrees*Math.PI/180)*100,y:Math.sin(degrees*Math.PI/180)*100}).cannon')};
assert(Math.abs(angleChance(45)-.5)<1e-10);
assert(Math.abs(angleChance(10)-.9)<1e-10);
assert(angleChance(30)>.5&&angleChance(30)<.9);
assert(Math.abs(angleChance(80)-.1)<1e-10);
assert(angleChance(30)-angleChance(45)>angleChance(0)-angleChance(15));
assert(Math.abs(angleChance(30)+angleChance(60)-1)<1e-10);
let previous=1;for(let degrees=0;degrees<=90;degrees++){const value=angleChance(degrees);assert(value<=previous+1e-10&&value>=0&&value<=1);previous=value;}
console.log('PASS: quadrant sigmoid100% cannon at0deg, high but noncertain at10deg, gentle transition with10deg90percent,45deg50/50 and90deg100% artillery.');

for(const roll of [0,.999999]) {
 c.attackRollTest=roll;
 run('var mobileAI=createBossBehaviors({random:()=>attackRollTest});var mobileTank={id:"mobile",type:"iroha",x:600,y:300,spriteSize:300,ai:true,bossCooldown:0};player.x=900;player.y=320;var chaseSteps=0;var moveTank=n=>{n.x+=5;n.moving=true;chaseSteps++};mobileAI.updateNpc(mobileTank,player,.1,view,{},moveTank);var moveName=mobileTank.bossAction.name;mobileAI.updateNpc(mobileTank,player,.1,view,{},moveTank)');
 assert.equal(run('chaseSteps'),2);assert.equal(run('mobileTank.x'),610);assert.equal(run('mobileTank.moving'),true);
 assert.equal(run('mobileTank.attack.name'),roll===0?'cannon':'artillery');
}
console.log('PASS: Iroha continues chase during both cannon and artillery without replacing attack pose.');
const plus=run('irohaArtilleryPoints({x:0,y:0},{x:300,y:200},{x:5,y:0})');assert.equal(plus.length,5);assert(Math.abs(plus[1].y-200)<1e-8);
const cross=run('irohaArtilleryPoints({x:0,y:0},{x:300,y:200},{x:5,y:5})');assert(cross[1].x>300&&cross[1].y>200);
run('var rain=createBossBehaviors({random:()=>.999999});var rainTank={id:"rain",type:"iroha",x:600,y:100,spriteSize:300,ai:true,bossCooldown:0,contactDamage:25};player.x=600;player.y=340;player.contactIFrames=0;rain.updateNpc(rainTank,player,.4,view)');assert.equal(run('rain.zoneCount'),5);
const rainBefore=damage.length;
run('rain.updateEffects(1.49,player,[rainTank])');assert.equal(damage.length,rainBefore);
run('rain.updateEffects(.01,player,[rainTank])');assert.equal(damage.length,rainBefore);
run('rain.updateEffects(.34,player,[rainTank])');assert.equal(damage.length,rainBefore);
run('rain.updateEffects(.011,player,[rainTank])');assert.equal(damage.length,rainBefore+1);assert.equal(damage.at(-1),25);assert.equal(run('rain.zoneCount'),5);
run('rain.updateEffects(6,player,[rainTank])');assert.equal(run('rain.zoneCount'),0);
console.log('PASS: +/X patterns,1.5s warning, falling-shell delay, impact-only damage and explosion lifetime cleanup.');

for(const motion of [{x:5,y:0},{x:5,y:5}]) {
 c.previewMotion=motion;
 const pts=run('irohaArtilleryPoints({x:0,y:0},{x:640,y:360},previewMotion,{width:1280,height:720})');
 const spanX=Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x))+pts[0].radius*2;
 const spanY=Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y))+pts[0].radius*2;
 assert(Math.abs(spanX-spanY)<1e-8);
 assert(spanX<=720*1.4+1e-8);
 for(const p of pts.slice(1))assert(Math.abs(Math.hypot(p.x-640,p.y-360)-pts[0].radius*1.8)<1e-8);
 assert.equal(pts.length,5);
}
run('var animatedRain=createBossBehaviors({random:()=>.999999});var animationTank={id:"animated-rain",type:"iroha",x:600,y:100,spriteSize:300,ai:true,bossCooldown:0};player.x=600;player.y=340;animatedRain.updateNpc(animationTank,player,.4,view);var radii=[];var circleContext={save(){},restore(){},beginPath(){},arc(x,y,r){radii.push(r)},fill(){},stroke(){}};animatedRain.draw(circleContext,{x:0,y:0})');
const initialInner=run('radii[1]');run('radii=[];animatedRain.updateEffects(.75,player,[animationTank]);animatedRain.draw(circleContext,{x:0,y:0})');assert(run('radii[1]')<initialInner);assert.equal(run('radii[0]'),180);
console.log('PASS: compact equal-circle +/X clusters with slight overlap and animated closing rings.');

const beforeFalling=plasmaCalls.length;
run('animatedRain.updateEffects(.85,player,[animationTank]);animatedRain.draw(circleContext,{x:0,y:0})');
assert(plasmaCalls.length>beforeFalling);
for(const call of plasmaCalls.slice(beforeFalling)){assert.equal(call[2].color,'orange');assert.equal(call[3],11);assert(call[2].angle>0&&call[2].angle<Math.PI);}
console.log('PASS: angled artillery shells reuse orange tank plasma at55percent size.');

run('var staggerAI=createBossBehaviors({random:()=>.999999});var staggerTank={id:"stagger",type:"iroha",x:600,y:100,spriteSize:300,ai:true,bossCooldown:0};player.x=600;player.y=340;staggerAI.updateNpc(staggerTank,player,.4,view);var staggerRadii=[];var staggerContext={save(){},restore(){},beginPath(){},arc(x,y,r){staggerRadii.push(r)},fill(){},stroke(){}};staggerAI.draw(staggerContext,{x:0,y:0})');
assert.equal(run('staggerRadii.length'),2); // first ring starts before the others
run('staggerAI.updateEffects(.24,player,[staggerTank]);staggerRadii=[];staggerAI.draw(staggerContext,{x:0,y:0})');assert.equal(run('staggerRadii.length'),2);
run('staggerAI.updateEffects(.011,player,[staggerTank]);staggerRadii=[];staggerAI.draw(staggerContext,{x:0,y:0})');assert.equal(run('staggerRadii.length'),4);
// At the first impact time only the first shell can have landed.
const landings=[];c.drawArtilleryExplosion=(ctx,cam,z,age)=>landings.push(z);
run('staggerAI.updateEffects(1.349,player,[staggerTank]);staggerRadii=[];staggerAI.draw(staggerContext,{x:0,y:0})');assert.equal(landings.length,0);assert.equal(run('staggerRadii.length'),10);
run('staggerAI.updateEffects(.251,player,[staggerTank]);staggerRadii=[];staggerAI.draw(staggerContext,{x:0,y:0})');assert.equal(landings.length,1);assert.equal(run('staggerRadii.length'),8);
landings.length=0;run('staggerAI.updateEffects(.25,player,[staggerTank]);staggerAI.draw(staggerContext,{x:0,y:0})');assert.equal(landings.length,2);
console.log('PASS: warnings follow impact stagger and each ring persists through descent until its own impact.');

const enlarged=run('irohaArtilleryPoints({x:0,y:0},{x:640,y:360},{x:1,y:0},{width:1280,height:720})');
assert.equal(enlarged[0].radius,180);assert.equal(enlarged[1].x-enlarged[0].x,324);
assert.equal(Math.max(...enlarged.map(p=>p.x))-Math.min(...enlarged.map(p=>p.x))+360,1008);
console.log('PASS: artillery radius and arm spacing double; full + footprint1008px at1280x720.');

run('var steady=createSteadyMovementTracker();for(let i=0;i<49;i++)steady.update(.1,player,{x:24,y:0})');assert(run('steady.seconds')<5);
run('steady.update(.1,player,{x:24,y:0})');assert(Math.abs(run('steady.seconds')-5)<1e-8);
run('steady.update(.1,player,{x:0,y:0})');assert.equal(run('steady.seconds'),0);
run('steady.update(5,player,{x:1200,y:0});steady.update(.1,player,{x:0,y:24})');assert.equal(run('steady.seconds'),.1);
for(const duration of [4.9,5]) {
 c.steadyDuration=duration;
 run('var leadRolls=[.99,0];var predictive=createBossBehaviors({random:()=>leadRolls.shift()??1});var predictionTank={id:"predictive",type:"iroha",x:600,y:100,spriteSize:300,ai:true,bossCooldown:0};player.x=600;player.y=340;predictive.updateEffects(steadyDuration,player,[predictionTank],{x:240*steadyDuration,y:0});predictive.updateNpc(predictionTank,player,.4,view,{x:96,y:0});var predictedCenters=[];var predictionContext={save(){},restore(){},beginPath(){},arc(x,y){predictedCenters.push({x,y})},fill(){},stroke(){}};predictive.draw(predictionContext,{x:0,y:0})');
 assert.equal(run('predictedCenters[0].x'),duration===5?840:600);
}
console.log('PASS: artillery only leads after5s uninterrupted direction; stopping/turning resets and ineligible casts stay centered.');

run('var comboRolls=[0,.9,.9];var combo=createBossBehaviors({random:()=>comboRolls.shift()??0});var comboTank={id:"combo",type:"iroha",x:600,y:300,spriteSize:300,ai:true,bossCooldown:0};player.x=900;player.y=300;combo.updateNpc(comboTank,player,.1,view)');
assert.equal(run('comboTank.bossAction.name'),'artillery');assert.equal(run('comboTank.bossAction.nextAction'),'cannon');
run('combo.updateNpc(comboTank,player,1.1,view)');assert.equal(run('comboTank.bossAction.name'),'cannon');
run('combo.updateNpc(comboTank,player,2.5,view)');assert.equal(run('comboTank.bossAction.name'),'artillery');
run('combo.updateNpc(comboTank,player,1.2,view)');assert.equal(run('comboTank.bossAction'),null);assert.equal(run('comboTank.bossCooldown'),6);
console.log('PASS: chance-based artillery before/after cannon chains immediately, then resets cooldown without infinite chaining.');
run('var stompAI=createBossBehaviors();var stomper={id:"stomper",type:"neru",x:300,y:300,spriteSize:300,ai:true,bossCooldown:0,bossMoveIndex:1,contactDamage:20};player.x=500;player.y=400;player.contactIFrames=0;stompAI.updateNpc(stomper,player,1,view);stompAI.updateNpc(stomper,player,1,view);player.x=650;stompAI.updateNpc(stomper,player,3.12,view);var shadowPositions=[];var shadowContext={save(){},restore(){},beginPath(){},ellipse(x,y){shadowPositions.push({x,y})},fill(){},stroke(){}};stompAI.draw(shadowContext,{x:0,y:0});var lockedStompX=stomper.bossAction.targetX');
assert.equal(run('shadowPositions[0].x'),650);
const stompDamage=damage.length;
run('player.x=800;stompAI.updateNpc(stomper,player,.99,view);shadowPositions=[];stompAI.draw(shadowContext,{x:0,y:0})');assert.equal(run('shadowPositions[0].x'),650);assert.equal(damage.length,stompDamage);
run('player.x=650;player.y=400;player.contactIFrames=0;stompAI.updateNpc(stomper,player,.01,view)');assert.equal(damage.length,stompDamage);
run('stompAI.updateNpc(stomper,player,1,view)');assert.equal(damage.length,stompDamage+1);assert.equal(damage.at(-1),20);assert.equal(run('stomper.bossVisualOffsetY'),0);
run('shadowPositions=[];stompAI.draw(shadowContext,{x:0,y:0})');assert.equal(run('shadowPositions.length'),0);
console.log('PASS: Neru shadow tracks3seconds, locks1second, hides sprite above screen and damages only on slam.');
run('var shadowAI=createBossBehaviors();var shadowBoss={id:"smooth-shadow",type:"neru",x:200,y:300,spriteSize:300,ai:true,bossCooldown:0,bossMoveIndex:1};player.x=800;player.y=300;shadowAI.updateNpc(shadowBoss,player,1,view);var smoothShadows=[],redOutlines=0;var softShadowContext={save(){},restore(){},beginPath(){},ellipse(x,y,r){smoothShadows.push({x,y,r})},fill(){},stroke(){redOutlines++}};shadowAI.draw(softShadowContext,{x:0,y:0})');
assert.equal(run('smoothShadows.length'),0);
run('shadowAI.updateNpc(shadowBoss,player,.9,view);shadowAI.draw(softShadowContext,{x:0,y:0})');assert.equal(run('smoothShadows.length'),0);
run('shadowAI.updateNpc(shadowBoss,player,.16,view);smoothShadows=[];shadowAI.draw(softShadowContext,{x:0,y:0})');assert.equal(run('smoothShadows[0].x'),200);assert(run('smoothShadows[0].r')<105);assert.equal(run('redOutlines'),0);assert(run('smoothShadows[0].y')>400);
assert.equal(run('stomper.bossSquash'),.55);assert(Math.hypot(...Object.values(run('stompAI.screenShake')))>0);
run('stompAI.updateNpc(stomper,player,.5,view)');assert(run('stomper.bossSquash')>.55&&run('stomper.bossSquash')<1);
assert.equal(run('stompAI.updateNpc(stomper,player,.5,view)'),false);assert.equal(run('stomper.bossSquash'),1);
run('stompAI.updateEffects(.3,player,[stomper])');assert.equal(run('stompAI.screenShake.x'),0);assert.equal(run('stompAI.screenShake.y'),0);
const beforeNeruPlasma=plasmaCalls.length;
run('var neruPlasma=createBossBehaviors();var neruShooter={id:"neru-plasma",type:"neru",x:300,y:300,ai:true,bossCooldown:0};neruPlasma.updateNpc(neruShooter,player,.1,view);neruPlasma.draw(warningContext,{x:0,y:0})');assert(plasmaCalls.length>beforeNeruPlasma);assert.equal(plasmaCalls.at(-1)[2].color,'orange');assert.equal(plasmaCalls.at(-1)[2].speed,288);assert.equal(plasmaCalls.at(-1)[3],4.32);assert.equal(run('settings.neru.bulletRadius'),7.2);
console.log('PASS: takeoff-origin shadow moves smoothly,40% larger/no red outline, impact shake/squash recovery and enlarged orange plasma bullets.');
run('var opacityBefore=[];softShadowContext.fill=function(){opacityBefore.push(this.fillStyle)};shadowAI.updateNpc(shadowBoss,player,.1,view);shadowAI.draw(softShadowContext,{x:0,y:0});shadowAI.updateNpc(shadowBoss,player,3.8,view);shadowAI.draw(softShadowContext,{x:0,y:0})');assert.equal(run('opacityBefore[0]'),run('opacityBefore[1]'));assert.equal(run('settings.neru.compressSeconds'),1);assert.equal(run('settings.neru.leapRiseSeconds'),1);assert.equal(run('settings.neru.leapFallSeconds'),1);assert.equal(run('settings.neru.recoverySeconds'),1);
console.log('PASS: constant shadow opacity and1s squash/rise/fall/recovery phases.');
run('var fadeAI=createBossBehaviors();var fadeBoss={id:"fade",type:"neru",x:200,y:300,spriteSize:300,ai:true,bossCooldown:0,bossMoveIndex:1};player.x=200;player.y=300;fadeAI.updateNpc(fadeBoss,player,1,view);fadeAI.updateNpc(fadeBoss,player,1,view);smoothShadows=[];fadeAI.draw(softShadowContext,{x:0,y:0})');assert.equal(run('smoothShadows.length'),0);
run('fadeAI.updateNpc(fadeBoss,player,.06,view);fadeAI.draw(softShadowContext,{x:0,y:0});var halfFade=softShadowContext.fillStyle;fadeAI.updateNpc(fadeBoss,player,.06,view);fadeAI.draw(softShadowContext,{x:0,y:0})');
assert(Math.abs(Number(run('halfFade').match(/,([\d.]+)\)/)[1])-.175)<1e-8);assert.equal(run('softShadowContext.fillStyle'),'rgba(15,12,28,0.35)');
console.log('PASS: shadow hidden until offscreen,120ms fade-in and feet-aligned ground position.');
run('var growAI=createBossBehaviors();var growBoss={id:"grow",type:"neru",x:200,y:300,spriteSize:300,ai:true,bossCooldown:0,bossMoveIndex:1};player.x=800;player.y=300;growAI.updateNpc(growBoss,player,1,view);growAI.updateNpc(growBoss,player,1.03,view);smoothShadows=[];growAI.draw(softShadowContext,{x:0,y:0});var firstGrow=smoothShadows[0];growAI.updateNpc(growBoss,player,.06,view);smoothShadows=[];growAI.draw(softShadowContext,{x:0,y:0});var nextGrow=smoothShadows[0]');
assert.equal(run('firstGrow.x'),200);assert.equal(run('nextGrow.x'),200);assert.equal(run('firstGrow.y'),run('nextGrow.y'));assert(run('nextGrow.r')>run('firstGrow.r'));
run('growAI.updateNpc(growBoss,player,.13,view);smoothShadows=[];growAI.draw(softShadowContext,{x:0,y:0})');assert(run('smoothShadows[0].x')>200);
console.log('PASS: shadow grows in place at takeoff feet before starting chase.');

run('var streamAI=createBossBehaviors();var streamBoss={id:"stream",type:"neru",x:100,y:100,ai:true,bossCooldown:0,bossMoveIndex:2};player.x=500;player.y=100;streamAI.updateNpc(streamBoss,player,.01,view)');
assert.equal(run('streamBoss.bossAction.pattern'),'stream');assert.equal(run('streamAI.projectileCount'),1);
let streamStart=plasmaCalls.length;run('streamAI.draw(warningContext,{x:0,y:0})');assert.equal(plasmaCalls[streamStart][2].angle,0);
run('player.x=100;player.y=500;streamAI.updateNpc(streamBoss,player,.08,view)');assert.equal(run('streamAI.projectileCount'),2);
streamStart=plasmaCalls.length;run('streamAI.draw(warningContext,{x:0,y:0})');assert.equal(plasmaCalls.at(-1)[2].angle,Math.PI/2);assert.equal(plasmaCalls.at(-1)[2].color,'orange');
run('streamAI.updateNpc(streamBoss,player,2,view)');assert.equal(run('streamBoss.bossAction'),null);
console.log('PASS: alternate shooting variation streams individual orange shots every80ms, retargets new shots, and ends after2s.');

run('var laneAI=createBossBehaviors();var laneBoss={id:"lanes",type:"neru",x:100,y:100,ai:true,bossCooldown:0,bossMoveIndex:2,contactDamage:20};player.x=500;player.y=100;player.contactIFrames=0;laneAI.updateNpc(laneBoss,player,.09,view)');
let lanesStart=plasmaCalls.length;run('laneAI.draw(warningContext,{x:0,y:0})');
const lanes=plasmaCalls.slice(lanesStart);assert.equal(lanes.length,2);assert.equal(lanes[0][2].y,91);assert.equal(lanes[1][2].y,109);
for(const call of lanes){assert.equal(call[2].speed,345.6);assert.equal(call[3],4.32);assert.equal(call[2].color,'orange');assert(call[2].piercing);}
run('player.x=110;player.y=91;laneAI.updateEffects(.04,player,[laneBoss])');assert.equal(run('laneAI.projectileCount'),2);
const damageAfterPierce=damage.length;run('player.contactIFrames=0;laneAI.updateEffects(.001,player,[laneBoss])');assert.equal(damage.length,damageAfterPierce);
console.log('PASS: orange stream alternates two offset lanes at20percent higher speed; enlarged piercing bullets persist without repeat hits.');

run('neruBodyCenterOffsetY=measuredNeruCenter;var centeredStream=createBossBehaviors();var centeredNeru={id:"centered-stream",type:"neru",x:100,y:100,spriteSize:300,ai:true,bossCooldown:0,bossMoveIndex:2};var neruOriginY=100+neruBodyCenterOffsetY(centeredNeru);player.x=500;player.y=neruOriginY;centeredStream.updateNpc(centeredNeru,player,.09,view)');
const centerStart=plasmaCalls.length;run('centeredStream.draw(warningContext,{x:0,y:0})');const centeredShots=plasmaCalls.slice(centerStart);
assert(run('neruOriginY')>100);assert.equal((centeredShots[0][2].y+centeredShots[1][2].y)/2,run('neruOriginY'));assert.equal(centeredShots[0][2].angle,0);
console.log('PASS: alternating stream originates at the lower sprite body center and aims from that center.');

run('var frozenAI=createBossBehaviors();var frozenShooter={id:"frozen-shooter",type:"neru",x:100,y:100,ai:true,bossCooldown:0};player.x=100;player.y=100;player.contactIFrames=0;frozenAI.updateNpc(frozenShooter,player,.01,view);frozenShooter.frozenRemaining=3');
const beforeFrozenDamage=damage.length;run('frozenAI.updateEffects(.2,player,[frozenShooter])');assert.equal(damage.length,beforeFrozenDamage);
console.log('PASS: frozen boss projectiles cannot damage the player.');
