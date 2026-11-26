import {drawArtilleryExplosion,artilleryExplosionDuration,artilleryExplosionReady} from './artillery-explosion.js';
import { saintPredatorSettings, saintPredatorLevelStats, attackTimeFormula, weaponSizeMultiplier } from './game-config.js';
import { ensureCombatStats, totalWeaponDamage, rollAttackDamage } from './combat-stats.js';
import { stationaryWeaponIntervalScale, startingWeaponProjectileCount } from './tuning-parts.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox, segmentHitsBody } from './combat-hitboxes.js';
import { createEnemySpatialIndex } from './enemy-spatial-index.js';

/** One-hit missiles choose random visible targets, then retain their launch trajectory. */
export function createSaintPredatorAttack({random=Math.random}={}){
 let owner=null,enabled=true,cooldown=0,missiles=[],explosions=[],burst=null,shots=0;
 const s=saintPredatorSettings;
 function reset(){owner=null;cooldown=0;missiles=[];explosions=[];burst=null;shots=0;}
 function fire(player,weapon,viewport){
  const body=getCombatHitbox(player,false),stats=saintPredatorLevelStats(weapon.level),size=s.area*weaponSizeMultiplier(player);
  const view=viewport||{x:body.x-640,y:body.y-360,width:1280,height:720};
  const targets=getAllEnemies().filter(e=>{const b=getEnemyHurtbox(e);return b.x+b.rx>=view.x&&b.x-b.rx<=view.x+view.width&&b.y+b.ry>=view.y&&b.y-b.ry<=view.y+view.height;});
  const count=startingWeaponProjectileCount(player,'saint-predator',stats.count);
  for(let i=0;i<count;i++){
   const target=targets.length?targets[Math.min(targets.length-1,Math.floor(random()*targets.length))]:null,t=target?getEnemyHurtbox(target):null;
   const angle=t?Math.atan2(t.y-body.y,t.x-body.x):random()*Math.PI*2,dx=Math.cos(angle),dy=Math.sin(angle);
   const edge=1/Math.hypot(dx/body.rx,dy/body.ry)+s.radius*size+3;
   missiles.push({x:body.x+dx*edge,y:body.y+dy*edge,angle,age:0,size,speed:stats.speed,count,damageBonuses:stats.damageBonuses});shots++;
  }
 }
 function cast(player,angle=0,viewport=null){if(!player.attackSlots?.some(w=>w?.id==='saint-predator'))return false;if(owner!==player){reset();owner=player;}burst={remaining:12,timer:0,angle,viewport};return true;}
 function launchHoly(player,weapon,viewport){
  const body=getCombatHitbox(player,false),stats=saintPredatorLevelStats(weapon.level),size=s.area*weaponSizeMultiplier(player),angle=burst.angle+(random()-.5)*Math.PI/7.5,dx=Math.cos(angle),dy=Math.sin(angle),edge=1/Math.hypot(dx/body.rx,dy/body.ry)+s.radius*size+3,x=body.x+dx*edge,y=body.y+dy*edge;
  const view=viewport||burst.viewport||{x:body.x-640,y:body.y-360,width:1280,height:720};
  const range=Math.max(0,Math.min(Math.abs(dx)>1e-8?((dx>0?view.x+view.width:view.x)-x)/dx:Infinity,Math.abs(dy)>1e-8?((dy>0?view.y+view.height:view.y)-y)/dy:Infinity));
  missiles.push({exSkill:true,x,y,angle,age:0,size,speed:stats.speed,count:stats.count,damageBonuses:stats.damageBonuses,duration:Math.max(1/60,range/stats.speed),blastRadius:120*weaponSizeMultiplier(player)});shots++;
 }
 function explodeHoly(player,b){
  explosions.push({x:b.x,y:b.y,radius:b.blastRadius,age:0});
  for(const enemy of getAllEnemies()){if(!(enemy.hp>0))continue;const body=getEnemyHurtbox(enemy),dx=body.x-b.x,dy=body.y-b.y,distance=Math.hypot(dx,dy),extent=distance?1/Math.hypot(dx/distance/body.rx,dy/distance/body.ry):Math.max(body.rx,body.ry);if(distance>b.blastRadius+extent)continue;
   const base=totalWeaponDamage(player,'saint-predator',s.damage,b.damageBonuses,{projectileCount:b.count,hitCooldownFrames:s.hitCooldown*60}),hit=rollAttackDamage(player,base,random,{target:enemy,weaponId:'saint-predator',damageMod:2,skillAttack:true});damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'saint-predator',skillAttack:true});
  }
 }
 function advance(delta,player){
  for(let i=explosions.length-1;i>=0;i--){explosions[i].age+=delta;if(explosions[i].age>=artilleryExplosionDuration)explosions.splice(i,1);}
  const enemies=getAllEnemies(),index=createEnemySpatialIndex(enemies,getEnemyHurtbox);
  for(let i=missiles.length-1;i>=0;i--){const b=missiles[i],step=Math.min(delta,(b.duration??s.duration)-b.age),from={x:b.x,y:b.y};
   b.age+=step;b.x+=Math.cos(b.angle)*b.speed*step;b.y+=Math.sin(b.angle)*b.speed*step;
   const radius=s.radius*b.size;
   // Closest swept hit wins; each missile can deal damage to only one enemy.
   const candidates=index.querySegment(from,b,radius).filter(enemy=>{if(!getEnemy(enemy.id))return false;const t=getEnemyHurtbox(enemy);return segmentHitsBody({...t,rx:t.rx+radius,ry:t.ry+radius},from.x,from.y,b.x,b.y);});
   candidates.sort((a,c)=>{const t=getEnemyHurtbox(a),u=getEnemyHurtbox(c);return Math.hypot(t.x-from.x,t.y-from.y)-Math.hypot(u.x-from.x,u.y-from.y);});
   if(candidates.length){if(b.exSkill){explodeHoly(player,b);missiles.splice(i,1);continue;}const target=candidates[0],hit=rollAttackDamage(player,totalWeaponDamage(player,'saint-predator',s.damage,b.damageBonuses,
     {projectileCount:b.count,hitCooldownFrames:s.hitCooldown*60}),random,{target,weaponId:'saint-predator'});
    damageEnemy(target.id,hit.damage,player,hit.type,{canMiss:true});missiles.splice(i,1);
   }else if(b.age>=(b.duration??s.duration)-1e-8){if(b.exSkill)explodeHoly(player,b);missiles.splice(i,1);}
  }
 }
 function update(delta,player,viewport=null){
  const weapon=player.attackSlots?.find(w=>w?.id==='saint-predator');if(!weapon){reset();return;}
  if(owner!==player){reset();owner=player;}if(delta<=0)return;
  let left=delta;
  while(left>1e-8){
   if(burst&&burst.timer<=1e-8){launchHoly(player,weapon,viewport);burst.remaining--;burst.timer=.08;if(!burst.remaining)burst=null;}
   if(enabled&&cooldown<=1e-8){fire(player,weapon,viewport);const stats=saintPredatorLevelStats(weapon.level);
    cooldown=attackTimeFormula(stats.interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const step=Math.min(left,1/60,enabled&&cooldown>1e-8?cooldown:1/60,burst&&burst.timer>1e-8?burst.timer:Infinity);advance(step,player);cooldown=Math.max(0,cooldown-step);if(burst)burst.timer=Math.max(0,burst.timer-step);left-=step;
  }
 }
 function draw(context,camera){context.save();for(const b of missiles){
  context.save();context.translate(b.x-camera.x,b.y-camera.y);context.rotate(b.angle);context.scale(b.size,b.size);
  const length=s.length,flame=8+3*Math.sin(b.age*55);
  context.fillStyle='rgba(255,135,49,.35)';context.beginPath();context.moveTo(-length/2,-4);context.lineTo(-length/2-flame,0);context.lineTo(-length/2,4);context.fill();
  context.fillStyle='#ffd66c';context.beginPath();context.moveTo(-length/2,-2);context.lineTo(-length/2-flame*.7,0);context.lineTo(-length/2,2);context.fill();
  context.fillStyle='#d7e5e9';context.beginPath();context.moveTo(length/2,0);context.lineTo(length/2-6,-4);context.lineTo(-length/2,-4);context.lineTo(-length/2,4);context.lineTo(length/2-6,4);context.closePath();context.fill();
  context.fillStyle='#54636e';context.fillRect(-8,-5,5,10);context.fillStyle='#d5675c';context.fillRect(3,-3,3,6);context.restore();
 }context.restore();for(const effect of explosions)drawArtilleryExplosion(context,camera,effect,effect.age);}
 return {getAuraSources(){return missiles;},ready:artilleryExplosionReady,cast,update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get projectileCount(){return missiles.length;},get barrageRemaining(){return burst?.remaining||0;},get explosionCount(){return explosions.length;}};
}
