import { studentHandbookSettings, studentHandbookLevelStats, attackTimeFormula, weaponSizeMultiplier, weaponKnockbackMultiplier } from './game-config.js';
import { ensureCombatStats, totalWeaponDamage, rollAttackDamage } from './combat-stats.js';
import { stationaryWeaponIntervalScale, startingWeaponProjectileCount } from './tuning-parts.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox, segmentHitsBody } from './combat-hitboxes.js';
import { createEnemySpatialIndex } from './enemy-spatial-index.js';
import { beginKnockback } from './knockback.js';

/** Books grow out from the player and shrink back into the player within their lifetime. */
export function studentHandbookPose(age,duration,retiringAt=null,retiringScale=1){
 const smooth=t=>{const p=Math.max(0,Math.min(1,t));return p*p*(3-2*p);};
 const scale=retiringAt===null?Math.min(smooth(age/studentHandbookSettings.emergeSeconds),smooth((duration-age)/studentHandbookSettings.returnSeconds)):
  retiringScale*(1-smooth((age-retiringAt)/studentHandbookSettings.returnSeconds));
 return {scale,alpha:scale};
}
/** Books materialize equally spaced around the player; each owns its hit budget/cooldown. */
export function createStudentHandbookAttack({random=Math.random}={}){
 const s=studentHandbookSettings;let owner=null,enabled=true,cooldown=0,time=0,books=[],fadingTrails=[],shots=0,image=null;
 const ready=typeof Image==='undefined'?Promise.resolve():new Promise(resolve=>{image=new Image();image.onload=resolve;image.onerror=()=>{image=null;resolve();};image.src=new URL('../sprites/attacks/Arius Student Handbook.png',import.meta.url).href;});
 function reset(){owner=null;cooldown=0;time=0;books=[];fadingTrails=[];shots=0;}
 function fire(player,weapon,angle){
  const stats=studentHandbookLevelStats(weapon.level),body=getCombatHitbox(player,false),area=weaponSizeMultiplier(player),radius=s.orbitRadius*area;
  const count=startingWeaponProjectileCount(player,'student-handbook',stats.count);
  for(let i=0;i<count;i++){const phase=angle+i*Math.PI*2/count;books.push({x:body.x,y:body.y,phase,angle:phase,age:0,retiringAt:null,retiringScale:1,trail:[],trailElapsed:0,area,radius,count,duration:stats.duration,damageBonuses:stats.damageBonuses,hitsLeft:s.hitLimit,hits:new Map()});shots++;}
 }
 function ageTrail(trail,delta){for(const ghost of trail)ghost.age+=delta;while(trail.length&&trail[0].age>=s.trailDuration)trail.shift();}
 function finish(index){const b=books[index];if(b.trail.length)fadingTrails.push({area:b.area,trail:b.trail});books.splice(index,1);}
 function update(delta,player,angle=0){
  const weapon=player.attackSlots?.find(w=>w?.id==='student-handbook');if(!weapon){reset();return;}
  if(owner!==player){reset();owner=player;}if(!(delta>0))return;
  let left=delta,index=null;
  while(left>1e-8){
   if(enabled&&cooldown<=1e-8){fire(player,weapon,angle);cooldown=Math.max(s.minimumInterval,attackTimeFormula(s.interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent));}
   const dt=Math.min(left,1/120,enabled&&cooldown>1e-8?cooldown:1/120);left-=dt;time+=dt;cooldown=Math.max(0,cooldown-dt);
   for(let i=fadingTrails.length-1;i>=0;i--){ageTrail(fadingTrails[i].trail,dt);if(!fadingTrails[i].trail.length)fadingTrails.splice(i,1);}
   if(!books.length)continue;if(!index)index=createEnemySpatialIndex(getAllEnemies(),getEnemyHurtbox);
   const center=getCombatHitbox(player,false);
   for(let i=books.length-1;i>=0;i--){
    const b=books[i],from={x:b.x,y:b.y};b.age+=dt;
    const pose=studentHandbookPose(b.age,b.duration,b.retiringAt,b.retiringScale);
    if((b.retiringAt===null&&b.age>=b.duration-1e-8)||(b.retiringAt!==null&&b.age-b.retiringAt>=s.returnSeconds-1e-8)){finish(i);continue;}
    if(b.retiringAt===null)b.angle=b.phase+s.speed/b.radius*b.age;
    b.x=center.x+Math.cos(b.angle)*b.radius*pose.scale;b.y=center.y+Math.sin(b.angle)*b.radius*pose.scale;
    ageTrail(b.trail,dt);b.trailElapsed+=dt;
    if(b.trailElapsed>=s.trailInterval-1e-8){b.trailElapsed%=s.trailInterval;b.trail.push({x:b.x,y:b.y,angle:Math.sin(b.angle)*.12,scale:pose.scale,age:0});if(b.trail.length>s.trailCount)b.trail.shift();}
    if(b.retiringAt!==null||pose.scale<=0)continue;
    const radius=s.hitRadius*b.area*pose.scale;
    const candidates=index.querySegment(from,b,radius).filter(enemy=>{if(!getEnemy(enemy.id)||time-(b.hits.get(enemy.id)??-Infinity)<s.hitCooldown-1e-8)return false;const body=getEnemyHurtbox(enemy);return segmentHitsBody({...body,rx:body.rx+radius,ry:body.ry+radius},from.x,from.y,b.x,b.y);});
    for(const enemy of candidates){
     if(!getEnemy(enemy.id))continue;b.hits.set(enemy.id,time);
     const hit=rollAttackDamage(player,totalWeaponDamage(player,'student-handbook',s.damage,b.damageBonuses,{projectileCount:b.count,hitCooldownFrames:s.hitCooldown*60}),random,{target:enemy,weaponId:'student-handbook'});
     if(damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'student-handbook'})===false)continue;
     b.hitsLeft--;const target=getEnemy(enemy.id);
     if(target){const body=getEnemyHurtbox(target),direction=Math.atan2(body.y-center.y,body.x-center.x),distance=s.knockbackSpeed*s.knockbackSeconds*weaponKnockbackMultiplier(player);
      const motion=beginKnockback(target,Math.cos(direction)*distance,Math.sin(direction)*distance,s.knockbackSeconds);
      if(motion){target.skillKnockback=motion;target.knockbackMovementRemaining=Math.max(target.knockbackMovementRemaining||0,s.knockbackSeconds);}
     }
     if(b.hitsLeft<=0)break;
    }
    if(b.hitsLeft<=0){b.retiringAt=b.age;b.retiringScale=pose.scale;}
   }
  }
 }
 function drawPose(context,camera,b,pose,alpha,shrink=1){
  const scale=b.area*pose.scale*shrink;if(scale<=0)return;
  context.save();context.globalAlpha=alpha;context.translate(pose.x-camera.x,pose.y-camera.y);context.rotate(pose.angle);context.scale(scale,scale);context.drawImage(image,48,12,200,228,-s.width/2,-s.height/2,s.width,s.height);context.restore();
 }
 function drawTrail(context,camera,b){for(const ghost of b.trail){const fade=Math.max(0,1-ghost.age/s.trailDuration);drawPose(context,camera,b,ghost,.25*fade*fade,fade);}}
 function draw(context,camera){
  if(!image?.complete||!image.naturalWidth)return;
  for(const b of fadingTrails)drawTrail(context,camera,b);
  for(const b of books){drawTrail(context,camera,b);const pose=studentHandbookPose(b.age,b.duration,b.retiringAt,b.retiringScale);drawPose(context,camera,b,{x:b.x,y:b.y,angle:Math.sin(b.angle)*.12,scale:pose.scale},pose.alpha);}
 }
 return {ready,update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get projectileCount(){return books.filter(b=>b.retiringAt===null).length;}};
}
