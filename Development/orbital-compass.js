import { orbitalCompassSettings, orbitalCompassLevelStats, attackTimeFormula, weaponSizeMultiplier } from './game-config.js';
import { ensureCombatStats, totalWeaponDamage, rollAttackDamage } from './combat-stats.js';
import { stationaryWeaponIntervalScale, startingWeaponProjectileCount } from './tuning-parts.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox, segmentHitsBody } from './combat-hitboxes.js';
import { createEnemySpatialIndex } from './enemy-spatial-index.js';
import { drawArtilleryExplosion, artilleryExplosionDuration, artilleryExplosionReady } from './artillery-explosion.js';

/** Nearby-target launch, timed return, or one explosion when its accepted hit budget ends. */
export function createOrbitalCompassAttack({random=Math.random}={}){
 const s=orbitalCompassSettings;let owner=null,enabled=true,cooldown=0,time=0,needles=[],explosions=[],shots=0,bursts=0;
 function reset(){owner=null;cooldown=0;time=0;needles=[];explosions=[];shots=0;bursts=0;}
 function fire(player,weapon,aim){
  const stats=orbitalCompassLevelStats(weapon.level),body=getCombatHitbox(player,false),area=stats.size*weaponSizeMultiplier(player),count=startingWeaponProjectileCount(player,'orbital-compass',stats.count);
  const targets=getAllEnemies().map(enemy=>({enemy,body:getEnemyHurtbox(enemy)})).filter(t=>t.enemy.hp>0&&Math.hypot(t.body.x-body.x,t.body.y-body.y)<=s.acquireRange).sort((a,b)=>Math.hypot(a.body.x-body.x,a.body.y-body.y)-Math.hypot(b.body.x-body.x,b.body.y-body.y));
  for(let i=0;i<count;i++){
   const target=targets[i%targets.length]?.body;let angle=target?Math.atan2(target.y-body.y,target.x-body.x):aim+i*Math.PI*2/count;
   if(target&&targets.length<count)angle+=(i-(count-1)/2)*.12;
   needles.push({x:body.x,y:body.y,angle,rotation:angle,age:0,returnLocked:false,area,count,hitsLeft:stats.hitLimit,damageBonuses:stats.damageBonuses,hits:new Map()});shots++;
  }
 }
 function roll(player,b,target,explosion=false){
  const base=totalWeaponDamage(player,'orbital-compass',s.damage,b.damageBonuses,{projectileCount:b.count,hitCooldownFrames:(explosion?s.explosionHitCooldown:s.hitCooldown)*60});
  return rollAttackDamage(player,base*(explosion?s.explosionDamage/s.damage:1),random,{target,weaponId:'orbital-compass'});
 }
 function explode(player,b){
  const effect={x:b.x,y:b.y,radius:s.hitRadius*b.area*s.explosionArea,age:0};explosions.push(effect);bursts++;
  // The blast is a single accepted hit per target, not periodic damage from the visual animation.
  for(const enemy of getAllEnemies()){
   const body=getEnemyHurtbox(enemy),dx=body.x-effect.x,dy=body.y-effect.y,distance=Math.hypot(dx,dy),extent=distance?1/Math.hypot(dx/distance/body.rx,dy/distance/body.ry):0;
   if(distance>effect.radius+extent)continue;const hit=roll(player,b,enemy,true);damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'orbital-compass'});
  }
 }
 function update(delta,player,aim=0){
  const weapon=player.attackSlots?.find(w=>w?.id==='orbital-compass');if(!weapon){reset();return;}
  if(owner!==player){reset();owner=player;}if(!(delta>0))return;
  let left=delta,index=null;
  while(left>1e-8){
   if(enabled&&cooldown<=1e-8){fire(player,weapon,aim);cooldown=attackTimeFormula(s.interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const dt=Math.min(left,1/120,enabled&&cooldown>1e-8?cooldown:1/120);left-=dt;time+=dt;cooldown=Math.max(0,cooldown-dt);
   for(let i=explosions.length-1;i>=0;i--){explosions[i].age+=dt;if(explosions[i].age>=artilleryExplosionDuration)explosions.splice(i,1);}
   if(!needles.length)continue;if(!index)index=createEnemySpatialIndex(getAllEnemies(),getEnemyHurtbox);
   for(let i=needles.length-1;i>=0;i--){const b=needles[i],from={x:b.x,y:b.y};b.age+=dt;if(b.age>s.duration+1e-8){needles.splice(i,1);continue;}
    let speed;
    if(b.age<s.returnAfter){
     // Ease to a complete turnaround before accelerating back.
     speed=s.speed*Math.cos(Math.min(1,b.age/s.returnAfter)*Math.PI/2);
    }else{
     speed=s.speed*s.returnSpeedMultiplier*Math.min(1,(b.age-s.returnAfter)/s.returnAccelerationSeconds);
     if(!b.returnLocked){
      // Reverse the launch heading, independent of the player position.
      b.angle+=Math.PI;b.returnLocked=true;
     }
    }
    b.x+=Math.cos(b.angle)*speed*dt;b.y+=Math.sin(b.angle)*speed*dt;b.rotation+=s.spinSpeed*dt;
    const radius=s.hitRadius*b.area;
    const candidates=index.querySegment(from,b,radius).filter(enemy=>{if(!getEnemy(enemy.id)||time-(b.hits.get(enemy.id)??-Infinity)<s.hitCooldown-1e-8)return false;const body=getEnemyHurtbox(enemy);return segmentHitsBody({...body,rx:body.rx+radius,ry:body.ry+radius},from.x,from.y,b.x,b.y);});
    candidates.sort((a,c)=>{const t=getEnemyHurtbox(a),u=getEnemyHurtbox(c);return Math.hypot(t.x-from.x,t.y-from.y)-Math.hypot(u.x-from.x,u.y-from.y);});
    let exploded=false;
    for(const enemy of candidates){if(!getEnemy(enemy.id))continue;b.hits.set(enemy.id,time);const hit=roll(player,b,enemy);
     if(damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'orbital-compass'})===false)continue;
     b.hitsLeft--;if(b.hitsLeft<=0){explode(player,b);exploded=true;break;}
    }
    if(exploded||b.age>=s.duration-1e-8)needles.splice(i,1);
   }
  }
 }
 function draw(context,camera){
  function drawNeedle(rotation,alpha){
   context.save();context.rotate(rotation);context.globalAlpha=alpha;
   context.beginPath();context.moveTo(-s.length/2,0);context.lineTo(0,-s.width/2);context.lineTo(s.length/2,0);context.lineTo(0,s.width/2);context.closePath();context.fillStyle='#d9edfa';context.fill();context.strokeStyle='#47667a';context.lineWidth=1.2;context.stroke();
   context.beginPath();context.moveTo(0,-s.width/2);context.lineTo(s.length/2,0);context.lineTo(0,s.width/2);context.closePath();context.fillStyle='#ed6f85';context.fill();context.restore();
  }
  for(const b of needles){context.save();context.translate(b.x-camera.x,b.y-camera.y);context.scale(b.area,b.area);
   // Rotational afterimages fill a circular sweep without adding collision bodies.
   for(let i=s.afterimageCount;i>=1;i--){const lag=i*s.afterimageDuration/s.afterimageCount;if(lag>b.age)continue;drawNeedle(b.rotation-s.spinSpeed*lag,.24*(1-i/(s.afterimageCount+1)));}
   drawNeedle(b.rotation,1);
   context.beginPath();context.arc(0,0,3,0,Math.PI*2);context.fillStyle='#e8d497';context.fill();context.restore();
  }
  for(const effect of explosions)drawArtilleryExplosion(context,camera,effect,effect.age);
 }
 return {ready:artilleryExplosionReady,update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get projectileCount(){return needles.length;},get explosionCount(){return explosions.length;},get burstsFired(){return bursts;}};
}
