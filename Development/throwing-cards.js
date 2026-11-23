import { throwingCardsSettings, throwingCardsLevelStats, attackTimeFormula, weaponSizeMultiplier } from './game-config.js';
import { ensureCombatStats, totalWeaponDamage, rollAttackDamage } from './combat-stats.js';
import { stationaryWeaponIntervalScale } from './tuning-parts.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox, segmentHitsBody } from './combat-hitboxes.js';
import { createEnemySpatialIndex } from './enemy-spatial-index.js';

/** Invert spiral arc length so projectile speed is constant while its orbit expands. */
export function throwingCardSpiral(age,startRadius=32){
 const pitch=throwingCardsSettings.pitch,distance=throwingCardsSettings.speed*Math.max(0,age);
 const primitive=r=>(r*Math.hypot(r,pitch)+pitch*pitch*Math.asinh(r/pitch))/2;
 const target=primitive(startRadius)+pitch*distance;let radius=Math.sqrt(startRadius*startRadius+2*pitch*distance);
 for(let i=0;i<6;i++)radius-=(primitive(radius)-target)/Math.hypot(radius,pitch);
 return {radius,angle:(radius-startRadius)/pitch};
}
/** Smoothly steer the spiral's own center; retarget without teleporting its orbit. */
export function advanceCardSpiralCenter(card,targets,delta){
 card.seekRemaining=(card.seekRemaining||0)-delta;
 let target=targets.find(enemy=>enemy.id===card.targetId&&enemy.hp>0);
 if(!target||card.seekRemaining<=0){
  let nearest=Infinity;target=null;
  for(const enemy of targets){if(!(enemy.hp>0))continue;const body=getEnemyHurtbox(enemy),distance=Math.hypot(body.x-card.centerX,body.y-card.centerY);if(distance<nearest){nearest=distance;target=enemy;}}
  card.targetId=target?.id;card.seekRemaining=.25;
 }
 let vx=0,vy=0;
 if(target){const body=getEnemyHurtbox(target),dx=body.x-card.centerX,dy=body.y-card.centerY,distance=Math.hypot(dx,dy),speed=throwingCardsSettings.centerSeekSpeed*Math.min(1,distance/80);if(distance>1e-8){vx=dx/distance*speed;vy=dy/distance*speed;}}
 const blend=1-Math.exp(-throwingCardsSettings.centerTurnResponse*delta);
 card.centerVx+=(vx-card.centerVx)*blend;card.centerVy+=(vy-card.centerVy)*blend;
 card.centerX+=card.centerVx*delta;card.centerY+=card.centerVy*delta;
}
export function createThrowingCardsAttack({random=Math.random}={}){
 const s=throwingCardsSettings;let owner=null,enabled=true,cooldown=0,time=0,cards=[],fadingTrails=[],shots=0,image=null,afterimage=null;
 const ready=typeof Image==='undefined'?Promise.resolve():new Promise(resolve=>{image=new Image();image.onload=()=>{
  if(typeof document!=='undefined'){
   afterimage=document.createElement('canvas');afterimage.width=136;afterimage.height=179;const ctx=afterimage.getContext('2d');
   ctx.beginPath();ctx.moveTo(25,0);ctx.lineTo(136,16);ctx.lineTo(113,179);ctx.lineTo(0,162);ctx.closePath();ctx.clip();ctx.drawImage(image,111,26,136,179,0,0,136,179);
  }resolve();
 };image.onerror=()=>{image=null;resolve();};image.src=new URL('../sprites/attacks/Card Set.png',import.meta.url).href;});
 function reset(){owner=null;cooldown=0;time=0;cards=[];fadingTrails=[];shots=0;}
 function fire(player,weapon,angle){
  const stats=throwingCardsLevelStats(weapon.level),body=getCombatHitbox(player,false),orbitScale=weaponSizeMultiplier(player),size=stats.size*orbitScale;
  const startRadius=(Math.max(body.rx,body.ry)+s.hitRadius*size+3)/orbitScale;
  cards.push({x:body.x+Math.cos(angle)*startRadius*orbitScale*s.spiralRadiusScale,y:body.y+Math.sin(angle)*startRadius*orbitScale*s.spiralRadiusScale,centerX:body.x,centerY:body.y,centerVx:0,centerVy:0,orbitAngle:angle,angle,age:0,startRadius,orbitScale,size,duration:stats.duration,hitsLeft:stats.hitLimit,damageBonuses:stats.damageBonuses,hits:new Map(),trail:[],trailElapsed:0});shots++;
 }
 function retire(index){const b=cards[index];if(b.trail.length)fadingTrails.push({size:b.size,trail:b.trail});cards.splice(index,1);}
 function ageTrail(trail,delta){for(const ghost of trail)ghost.age+=delta;while(trail.length&&trail[0].age>=s.trailDuration)trail.shift();}
 function update(delta,player,angle=0){
  const weapon=player.attackSlots?.find(w=>w?.id==='throwing-cards');if(!weapon){reset();return;}
  if(owner!==player){reset();owner=player;}if(!(delta>0))return;
  let left=delta,index=null;const targets=getAllEnemies();
  while(left>1e-8){
   if(enabled&&cooldown<=1e-8){fire(player,weapon,angle);cooldown=attackTimeFormula(throwingCardsLevelStats(weapon.level).interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const dt=Math.min(left,1/120,enabled&&cooldown>1e-8?cooldown:1/120);left-=dt;time+=dt;cooldown=Math.max(0,cooldown-dt);
   for(let i=fadingTrails.length-1;i>=0;i--){ageTrail(fadingTrails[i].trail,dt);if(!fadingTrails[i].trail.length)fadingTrails.splice(i,1);}
   if(!cards.length)continue;
   if(!index)index=createEnemySpatialIndex(targets,getEnemyHurtbox);
   for(let i=cards.length-1;i>=0;i--){
    const b=cards[i],from={x:b.x,y:b.y};b.age+=dt;
    if(b.age>b.duration+1e-8){retire(i);continue;}
    advanceCardSpiralCenter(b,targets,dt);
    const spiral=throwingCardSpiral(b.age/b.orbitScale,b.startRadius),orbitRadius=spiral.radius*b.orbitScale*s.spiralRadiusScale;
    const radialSpeed=s.spiralRadiusScale*s.speed*s.pitch/Math.hypot(spiral.radius,s.pitch);
    // Tighter turns preserve the existing 600px/s spiral travel rather than slowing the card.
    b.orbitAngle+=Math.sqrt(Math.max(0,s.speed*s.speed-radialSpeed*radialSpeed))/Math.max(1,orbitRadius)*dt;
    b.x=b.centerX+Math.cos(b.orbitAngle)*orbitRadius;b.y=b.centerY+Math.sin(b.orbitAngle)*orbitRadius;
    ageTrail(b.trail,dt);b.trailElapsed+=dt;
    if(b.trailElapsed>=s.trailInterval-1e-8){b.trailElapsed%=s.trailInterval;b.trail.push({x:b.x,y:b.y,rotation:b.angle+b.age*s.spinSpeed,age:0});if(b.trail.length>s.trailCount)b.trail.shift();}
    const radius=s.hitRadius*b.size;
    const candidates=index.querySegment(from,b,radius).filter(enemy=>{
     if(!getEnemy(enemy.id)||time-(b.hits.get(enemy.id)??-Infinity)<s.hitCooldown-1e-8)return false;
     const body=getEnemyHurtbox(enemy);return segmentHitsBody({...body,rx:body.rx+radius,ry:body.ry+radius},from.x,from.y,b.x,b.y);
    });
    candidates.sort((a,c)=>{const t=getEnemyHurtbox(a),u=getEnemyHurtbox(c);return Math.hypot(t.x-from.x,t.y-from.y)-Math.hypot(u.x-from.x,u.y-from.y);});
    for(const enemy of candidates){
     if(!getEnemy(enemy.id))continue;
     const hit=rollAttackDamage(player,totalWeaponDamage(player,'throwing-cards',s.damage,b.damageBonuses,{projectileCount:1,hitCooldownFrames:s.hitCooldown*60}),random,{target:enemy,weaponId:'throwing-cards'});
     b.hits.set(enemy.id,time);
     if(damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'throwing-cards'})===false)continue;
     b.hitsLeft--;if(b.hitsLeft<=0)break;
    }
    if(b.hitsLeft<=0||b.age>=b.duration-1e-8)retire(i);
   }
  }
 }
 function drawPose(context,camera,b,pose,alpha=1,ghost=false){
  context.save();context.globalAlpha=alpha;context.translate(pose.x-camera.x,pose.y-camera.y);context.rotate(pose.rotation);context.scale(b.size,b.size);
   if(ghost&&afterimage){context.drawImage(afterimage,-s.width/2,-s.height/2,s.width,s.height);context.restore();return;}
   if(image?.complete&&image.naturalWidth){
    // Clip the front card from the supplied card fan, preserving its real artwork and alpha.
    context.scale(s.width/136,s.height/179);context.translate(-68,-89.5);context.beginPath();context.moveTo(25,0);context.lineTo(136,16);context.lineTo(113,179);context.lineTo(0,162);context.closePath();context.clip();context.drawImage(image,111,26,136,179,0,0,136,179);
   }else {context.fillStyle='#1b2946';context.fillRect(-s.width/2,-s.height/2,s.width,s.height);context.strokeStyle='#e8f4ff';context.lineWidth=2;context.strokeRect(-s.width/2,-s.height/2,s.width,s.height);}
   context.restore();
 }
 function drawTrail(context,camera,b){for(const ghost of b.trail){const opacity=.35*Math.max(0,1-ghost.age/s.trailDuration);drawPose(context,camera,b,ghost,opacity,true);}}
 function draw(context,camera){
  for(const b of fadingTrails)drawTrail(context,camera,b);
  for(const b of cards){drawTrail(context,camera,b);drawPose(context,camera,b,{x:b.x,y:b.y,rotation:b.angle+b.age*s.spinSpeed});}
 }
 return {ready,update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get projectileCount(){return cards.length;}};
}
