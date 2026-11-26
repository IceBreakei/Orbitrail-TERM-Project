import {playerSettings,wakamoBayonetSettings,wakamoBayonetLevelStats,weaponSizeMultiplier} from './game-config.js';
import {totalWeaponDamage,rollAttackDamage,statMultiplier} from './combat-stats.js';
import {getAllEnemies,getEnemy,damageEnemy} from './world-state.js';
import {getCombatHitbox,getEnemyHurtbox} from './combat-hitboxes.js';
import {createEnemySpatialIndex} from './enemy-spatial-index.js';
import {bayonetHits} from './wakamo-bayonet.js';
import {beginKnockback} from './knockback.js';

export function chargeBladeAngle(aim,age){return aim+Math.sin(age*Math.PI/.12-Math.PI/2)*wakamoBayonetSettings.arc/2;}
export function createBayonetCharge({random=Math.random}={}){
 let owner=null,state=null,ghosts=[],sprite=null;
 const ready=typeof Image==='undefined'?Promise.resolve():new Promise(resolve=>{sprite=new Image();sprite.onload=resolve;sprite.onerror=()=>{sprite=null;resolve();};sprite.src=new URL('../sprites/attacks/wakamo-bayonet.png',import.meta.url).href;});
 function reset(){if(owner)delete owner.bayonetChargeActive;owner=null;state=null;ghosts=[];}
 function cast(player,angle=0){const weapon=player.attackSlots?.find(w=>w?.id==='wakamo-bayonet');if(!weapon)return false;reset();owner=player;state={angle,windup:.25,remaining:5,hits:new Set(),ghostTime:0,speedScale:1,braking:false,brakeHeld:0,brakeStartScale:1,bladeAge:0};player.bayonetChargeActive=true;return true;}
 function setMovementInput(player,direction){
  if(!state||owner!==player)return;
  const [x,y]=direction||[0,0],length=Math.hypot(x,y);
  const braking=length>0&&(x*Math.cos(state.angle)+y*Math.sin(state.angle))/length<=-.5;
  if(braking&&!state.braking){state.brakeHeld=0;state.brakeStartScale=state.speedScale;}
  if(!braking)state.brakeHeld=0;
  state.braking=braking;
 }
 function update(delta,player,move){
  if(owner&&owner!==player){reset();return false;}
  for(const ghost of ghosts)ghost.age+=delta;ghosts=ghosts.filter(g=>g.age<.35);
  if(!state)return false;
  const weapon=player.attackSlots?.find(w=>w?.id==='wakamo-bayonet');if(!weapon){reset();return false;}
  let left=Math.max(0,delta),index=null;
  while(state&&left>1e-8){const windup=state.windup>1e-8,dt=Math.min(left,1/120,windup?state.windup:state.remaining);left-=dt;
   const before=getCombatHitbox(player,false);
   const previousScale=state.speedScale;
   if(!windup){
    if(state.braking){state.brakeHeld=Math.min(2,state.brakeHeld+dt);state.speedScale=state.brakeStartScale*(1-state.brakeHeld/2);}
    else state.speedScale=Math.min(1,state.speedScale+dt);
   }
   const speed=windup?80:(previousScale+state.speedScale)/2*3*playerSettings.movementBase*(player.movementSpeedMultiplier||1)*statMultiplier(player,'spdPercent');
   const blocked=move(state.angle+(windup?Math.PI:0),speed,dt,state.angle);
   if(windup){state.windup=Math.max(0,state.windup-dt);continue;}
   const after=getCombatHitbox(player,false),stats=wakamoBayonetLevelStats(weapon.level),reach=wakamoBayonetSettings.range*stats.size*weaponSizeMultiplier(player);
   const previousAngle=chargeBladeAngle(state.angle,state.bladeAge);state.bladeAge+=dt;const nextAngle=chargeBladeAngle(state.angle,state.bladeAge);
   state.remaining-=dt;state.ghostTime+=dt;
   if(state.ghostTime>=.035){state.ghostTime%=.035;if(player.lastPose)ghosts.push({x:player.x,y:player.y,pose:player.lastPose,image:player.image,age:0});}
   for(const enemy of (index??=createEnemySpatialIndex(getAllEnemies(),getEnemyHurtbox)).querySegment(before,after,reach+20)){
    if(!(enemy.hp>0)||state.hits.has(enemy.id))continue;
    const body=getEnemyHurtbox(enemy);
    if(!bayonetHits(body,before,previousAngle,nextAngle,reach)&&!bayonetHits(body,after,previousAngle,nextAngle,reach))continue;
    const base=totalWeaponDamage(player,'wakamo-bayonet',wakamoBayonetSettings.damage,stats.damageBonuses,{projectileCount:stats.count,hitCooldownFrames:wakamoBayonetSettings.hitCooldown*60});
    const hit=rollAttackDamage(player,base,random,{target:enemy,weaponId:'wakamo-bayonet',damageMod:10,skillAttack:true});
    state.hits.add(enemy.id);
    if(damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'wakamo-bayonet',skillAttack:true})===false)continue;
    if(getEnemy(enemy.id)){
     enemy.stunRemaining=Math.max(enemy.stunRemaining||0,5);
     const side=(body.x-after.x)*-Math.sin(state.angle)+(body.y-after.y)*Math.cos(state.angle)>=0?1:-1;
     enemy.skillKnockback=beginKnockback(enemy,-Math.sin(state.angle)*side*90,Math.cos(state.angle)*side*90,.25);
    }
   }
   if(blocked||state.remaining<=1e-8||state.brakeHeld>=2-1e-8){delete player.bayonetChargeActive;state=null;}
  }
  return true;
 }
 function draw(context,camera,drawGhost){
  if(!owner)return;for(const ghost of ghosts)drawGhost(owner,ghost,.38*(1-ghost.age/.35));
  if(!state||state.windup>1e-8||!sprite?.complete||!sprite.naturalWidth)return;
  const weapon=owner.attackSlots?.find(w=>w?.id==='wakamo-bayonet');if(!weapon)return;
  const body=getCombatHitbox(owner,false),scale=wakamoBayonetSettings.range*wakamoBayonetLevelStats(weapon.level).size*weaponSizeMultiplier(owner)/470;
  for(let i=4;i>=0;i--){const age=state.bladeAge-i*.012;if(age<0)continue;
   context.save();context.translate(body.x-camera.x,body.y-camera.y);context.rotate(chargeBladeAngle(state.angle,age));context.translate(20,0);context.rotate(-Math.PI*.75);context.globalAlpha=i?(.07+(4-i)*.025):1;
   context.filter=i?'blur(0.8px)':'blur(0.35px)';
   context.drawImage(sprite,8,8,370,392,-329*scale,-43*scale,370*scale,392*scale);context.restore();
  }
 }
 return {ready,cast,update,draw,reset,setMovementInput,get active(){return Boolean(state);}};
}
