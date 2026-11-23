import { waterDousingSettings, waterDousingLevelStats, weaponSizeMultiplier, weaponKnockbackMultiplier, attackTimeFormula } from './game-config.js';
import { ensureCombatStats, totalWeaponDamage, rollAttackDamage } from './combat-stats.js';
import { stationaryWeaponIntervalScale } from './tuning-parts.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox, segmentHitsBody } from './combat-hitboxes.js';
import { beginKnockback } from './knockback.js';

/** Sprite ellipses overlap a closed sector; sample its curved boundary without inflating hurtboxes. */
export function waterConeHits(body,x,y,angle,radius,halfAngle=waterDousingSettings.halfAngle){
 const dx=body.x-x,dy=body.y-y,relative=Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle));
 if(Math.hypot(dx,dy)<=radius&&Math.abs(relative)<=halfAngle)return true;
 let previous={x,y};
 for(let i=0;i<=24;i++){
  const a=angle-halfAngle+2*halfAngle*i/24,next={x:x+Math.cos(a)*radius,y:y+Math.sin(a)*radius};
  if(segmentHitsBody(body,previous.x,previous.y,next.x,next.y))return true;previous=next;
 }
 return segmentHitsBody(body,previous.x,previous.y,x,y);
}
// Visual emission only: damage, hit cooldown and knockback retain their existing rules.
export const waterStreamSettings={sweepSeconds:.18,dropletCount:30};
/** Sequential release makes a curved stream: older water is farther from the swing. */
export function waterStreamDroplets(splash){
 const drops=[],sweep=waterStreamSettings.sweepSeconds,travel=waterDousingSettings.duration;
 for(let i=0;i<waterStreamSettings.dropletCount;i++){
  const release=i/(waterStreamSettings.dropletCount-1),age=splash.age-release*sweep;
  if(age<0||age>=travel)continue;
  const angle=splash.angle-waterDousingSettings.halfAngle+release*waterDousingSettings.halfAngle*2;
  const progress=age/travel,origin=Math.min(14,splash.radius*.09),distance=origin+(splash.radius-origin)*progress;
  drops.push({x:splash.x+Math.cos(angle)*distance,y:splash.y+Math.sin(angle)*distance,angle,age,release,distance,
   alpha:Math.min(1,age/.025)*Math.min(1,(1-progress)/.3),size:(2.6+Math.sin(i*2.4)*.6)*Math.sqrt(splash.radius/144)});
 }
 return drops;
}
/** Each attack splashes once; independent splashes use the configured per-target hit cooldown. */
export function createWaterDousingAttack({random=Math.random}={}){
 const s=waterDousingSettings;let owner=null,enabled=true,cooldown=0,time=0,splashes=[],hits=new Map(),shots=0;
 function reset(){owner=null;cooldown=0;time=0;splashes=[];hits.clear();shots=0;}
 function fire(player,weapon,angle){
  const stats=waterDousingLevelStats(weapon.level),body=getCombatHitbox(player,false),radius=stats.radius*weaponSizeMultiplier(player);
  splashes.push({x:body.x,y:body.y,angle,radius,age:0});shots++;
  const enemies=getAllEnemies(),live=new Set(enemies.map(e=>e.id));for(const id of hits.keys())if(!live.has(id))hits.delete(id);
  for(const enemy of enemies){
   if(time-(hits.get(enemy.id)??-Infinity)<s.hitCooldown-1e-8||!waterConeHits(getEnemyHurtbox(enemy),body.x,body.y,angle,radius))continue;
   hits.set(enemy.id,time);
   const hit=rollAttackDamage(player,totalWeaponDamage(player,'water-dousing',s.damage,stats.damageBonuses,{projectileCount:1,hitCooldownFrames:s.hitCooldown*60}),random,{target:enemy,weaponId:'water-dousing'});
   if(damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true})===false)continue;
   const target=getEnemy(enemy.id);if(!target)continue;
   const b=getEnemyHurtbox(target),a=Math.atan2(b.y-body.y,b.x-body.x),distance=stats.knockbackSpeed*s.knockbackSeconds*weaponKnockbackMultiplier(player);
   const motion=beginKnockback(target,Math.cos(a)*distance,Math.sin(a)*distance,s.knockbackSeconds);
   if(motion){target.skillKnockback=motion;target.waterRootDelay=s.knockbackSeconds;}
   if(stats.rootSeconds){target.waterRootDelay=motion?s.knockbackSeconds:0;target.waterRootRemaining=stats.rootSeconds;}
  }
 }
 function update(delta,player,angle=0){
  const weapon=player.attackSlots?.find(w=>w?.id==='water-dousing');if(!weapon){reset();return;}
  if(owner!==player){reset();owner=player;}if(!(delta>0))return;
  let left=delta;while(left>1e-8){
   if(enabled&&cooldown<=1e-8){fire(player,weapon,angle);cooldown=attackTimeFormula(waterDousingLevelStats(weapon.level).interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const step=Math.min(left,1/60,enabled&&cooldown>1e-8?cooldown:1/60);time+=step;cooldown=Math.max(0,cooldown-step);left-=step;
   for(let i=splashes.length-1;i>=0;i--){splashes[i].age+=step;if(splashes[i].age>=s.duration+waterStreamSettings.sweepSeconds)splashes.splice(i,1);}
  }
 }
 function draw(context,camera){
  if(!owner)return;
  const origin=getCombatHitbox(owner,false);
  for(const splash of splashes){
   // Keep the whole ongoing sweep attached while each droplet ages outward.
   const drops=waterStreamDroplets({...splash,x:origin.x,y:origin.y});if(!drops.length)continue;
   context.save();
   // A narrow translucent strand joins the water, rather than filling the entire cone.
   for(let i=1;i<drops.length;i++){
    const a=drops[i-1],b=drops[i],alpha=Math.min(a.alpha,b.alpha);
    context.strokeStyle=`rgba(79,196,246,${alpha*.28})`;context.lineWidth=(a.size+b.size)*1.7;context.lineCap='round';
    context.beginPath();context.moveTo(a.x-camera.x,a.y-camera.y);context.lineTo(b.x-camera.x,b.y-camera.y);context.stroke();
    context.strokeStyle=`rgba(190,246,255,${alpha*.55})`;context.lineWidth=(a.size+b.size)*.5;context.stroke();
   }
   // Small tapered droplets follow their own outward trajectory after release.
   for(const drop of drops){
    context.save();context.translate(drop.x-camera.x,drop.y-camera.y);context.rotate(drop.angle);context.globalAlpha=drop.alpha;
    const r=drop.size;context.fillStyle='rgba(72,192,244,.28)';context.beginPath();context.ellipse(0,0,r*2.7,r*1.6,0,0,Math.PI*2);context.fill();
    context.fillStyle='rgba(127,224,255,.9)';context.beginPath();context.moveTo(-r*3,0);context.bezierCurveTo(-r,-r*.8,r*.9,-r*1.2,r*1.4,0);context.bezierCurveTo(r*.9,r*1.2,-r,r*.8,-r*3,0);context.fill();
    context.fillStyle='rgba(224,253,255,.85)';context.beginPath();context.ellipse(r*.35,-r*.22,r*.7,r*.28,0,0,Math.PI*2);context.fill();context.restore();
   }
   context.restore();
  }
 }
 return {ready:Promise.resolve(),update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;}};
}
