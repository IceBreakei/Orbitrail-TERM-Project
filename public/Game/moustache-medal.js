import { moustacheMedalSettings, moustacheMedalLevelStats, flatCharacterWeaponBonus, attackTimeFormula, weaponSizeMultiplier, weaponKnockbackMultiplier } from './game-config.js';
import { ensureCombatStats, totalWeaponDamage, rollAttackDamage } from './combat-stats.js';
import { stationaryWeaponIntervalScale } from './tuning-parts.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox, segmentHitsBody } from './combat-hitboxes.js';
import { createEnemySpatialIndex } from './enemy-spatial-index.js';
import { beginKnockback } from './knockback.js';

/** Movement-facing rear/side directions never aim a wall forward, including diagonal movement. */
export function moustacheMedalAngles(direction=[0,1],level=1){const facing=Math.atan2(direction[1],direction[0]),rear=facing+Math.PI;return level>=7?[rear,rear-Math.PI/2,rear+Math.PI/2]:[rear];}
export function createMoustacheMedalAttack({random=Math.random}={}){
 const s=moustacheMedalSettings;let owner=null,enabled=true,cooldown=0,time=0,walls=[],shots=0;
 const ready=Promise.resolve();
 function reset(){owner=null;cooldown=0;time=0;walls=[];shots=0;}
 function fire(player,weapon,direction){
  const stats=moustacheMedalLevelStats(weapon.level,flatCharacterWeaponBonus(player)>1),center=getCombatHitbox(player,false),area=stats.size*weaponSizeMultiplier(player);
  const angles=moustacheMedalAngles(direction,weapon.level);
  for(const angle of angles){walls.push({x:center.x,y:center.y,fromX:center.x,fromY:center.y,angle,age:0,distance:stats.distance,area,count:angles.length,damageBonuses:stats.damageBonuses,hits:new Map()});shots++;}
 }
 function cast(player,viewport=null){
  const weapon=player.attackSlots?.find(w=>w?.id==='moustache-medal');if(!weapon)return false;if(owner!==player){reset();owner=player;}
  const center=getCombatHitbox(player,false),view=viewport||{x:center.x-640,y:center.y-360,width:1280,height:720},stats=moustacheMedalLevelStats(weapon.level,flatCharacterWeaponBonus(player)>1),area=stats.size*weaponSizeMultiplier(player);
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const horizontal=Math.abs(Math.cos(angle))>.5,distance=Math.max(0,horizontal?(Math.cos(angle)>0?view.x+view.width-center.x:center.x-view.x):(Math.sin(angle)>0?view.y+view.height-center.y:center.y-view.y));walls.push({exSkill:true,x:center.x,y:center.y,fromX:center.x,fromY:center.y,angle,age:0,distance,area,width:(horizontal?view.height:view.width)/area,count:stats.count,damageBonuses:stats.damageBonuses,hits:new Map()});shots++;}return true;
 }
 function update(delta,player,direction=[0,1]){
  const weapon=player.attackSlots?.find(w=>w?.id==='moustache-medal');if(!weapon){reset();return;}
  if(owner!==player){reset();owner=player;}if(!(delta>0))return;
  let left=delta,index=null;
  while(left>1e-8){
   if(enabled&&cooldown<=1e-8){fire(player,weapon,direction);const stats=moustacheMedalLevelStats(weapon.level);cooldown=attackTimeFormula(stats.interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const dt=Math.min(left,1/120,enabled&&cooldown>1e-8?cooldown:1/120);left-=dt;time+=dt;cooldown=Math.max(0,cooldown-dt);
   if(!walls.length)continue;if(!index)index=createEnemySpatialIndex(getAllEnemies(),getEnemyHurtbox);
   for(let i=walls.length-1;i>=0;i--){const b=walls[i],from={x:b.x,y:b.y};b.age+=dt;if(b.age>(b.exSkill?8:s.duration)+1e-8){walls.splice(i,1);continue;}
    const travel=Math.min(b.distance,b.age*(b.exSkill?b.distance:s.speed));b.x=b.fromX+Math.cos(b.angle)*travel;b.y=b.fromY+Math.sin(b.angle)*travel;
    const radius=b.exSkill?Math.hypot(b.width*b.area/2,s.height*b.area/2):s.hitRadius*b.area;
    const candidates=index.querySegment(from,b,radius).filter(enemy=>{if(!getEnemy(enemy.id)||time-(b.hits.get(enemy.id)??-Infinity)<s.hitCooldown-1e-8)return false;const body=getEnemyHurtbox(enemy);if(b.exSkill){const horizontal=Math.abs(Math.cos(b.angle))>.5,halfW=(horizontal?s.height:b.width)*b.area/2,halfH=(horizontal?b.width:s.height)*b.area/2;return body.x+body.rx>=Math.min(from.x,b.x)-halfW&&body.x-body.rx<=Math.max(from.x,b.x)+halfW&&body.y+body.ry>=Math.min(from.y,b.y)-halfH&&body.y-body.ry<=Math.max(from.y,b.y)+halfH;}return segmentHitsBody({...body,rx:body.rx+radius,ry:body.ry+radius},from.x,from.y,b.x,b.y);});
    for(const enemy of candidates){
     if(!getEnemy(enemy.id))continue;b.hits.set(enemy.id,time);
     const hit=rollAttackDamage(player,totalWeaponDamage(player,'moustache-medal',s.damage,b.damageBonuses,{projectileCount:b.count,hitCooldownFrames:s.hitCooldown*60}),random,{target:enemy,weaponId:'moustache-medal',skillAttack:Boolean(b.exSkill)});
     if(damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'moustache-medal',skillAttack:Boolean(b.exSkill)})===false)continue;
     const target=getEnemy(enemy.id);if(target){if(b.exSkill)target.flattenedRemaining=Math.max(target.flattenedRemaining||0,8);const distance=s.knockbackSpeed*s.knockbackSeconds*weaponKnockbackMultiplier(player),motion=beginKnockback(target,Math.cos(b.angle)*distance,Math.sin(b.angle)*distance,s.knockbackSeconds);
      if(motion){target.skillKnockback=motion;target.knockbackMovementRemaining=Math.max(target.knockbackMovementRemaining||0,s.knockbackSeconds);}
     }
    }
    if(b.age>=(b.exSkill?8:s.duration)-1e-8)walls.splice(i,1);
   }
  }
 }
 function draw(context,camera){
  for(const b of walls){
   context.save();context.globalAlpha=Math.min(1,b.age/.12,((b.exSkill?8:s.duration)-b.age)/.2);
   context.translate(b.x-camera.x,b.y-camera.y);context.rotate(b.angle+Math.PI/2);context.scale(b.area,b.area);
   const w=b.width||s.width,h=s.height;
   // Broad armored shield seen from above; its long edge blocks the travel direction.
   context.fillStyle='rgba(6,15,29,.25)';context.fillRect(-w/2+2,-h/2+5,w,h);
   const rim=context.createLinearGradient(0,-h/2,0,h/2);rim.addColorStop(0,'#fff0a8');rim.addColorStop(.35,'#e2bf54');rim.addColorStop(1,'#806327');
   context.fillStyle=rim;context.fillRect(-w/2,-h/2,w,h);
   const armor=context.createLinearGradient(0,-h/2,0,h/2);armor.addColorStop(0,'#c6d4e0');armor.addColorStop(.45,'#72869a');armor.addColorStop(1,'#34465b');
   context.fillStyle=armor;context.fillRect(-w/2+4,-h/2+3,w-8,h-6);
   context.strokeStyle='#f2f6f8';context.lineWidth=1;context.strokeRect(-w/2+4,-h/2+3,w-8,h-6);
   context.fillStyle='#243b53';context.fillRect(-w*.28,-h*.2,w*.56,h*.4);
   context.fillStyle='#f6dc79';context.fillRect(-3,-h/2+2,6,h-4);
   context.fillStyle='#d8e4eb';for(const x of [-w*.36,w*.36]){context.fillRect(x-2,-h/2+3,4,h-6);}
   context.restore();
  }
 }
 return {getAuraSources(){return walls;},ready,cast,update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get projectileCount(){return walls.length;}};
}
