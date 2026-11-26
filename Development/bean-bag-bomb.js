import {applyPoison} from './poison-status.js';
import {damageRules} from './game-config.js';
import { beanBagBombSettings, beanBagBombLevelStats, attackTimeFormula, weaponSizeMultiplier } from './game-config.js';
import { ensureCombatStats, totalWeaponDamage, rollAttackDamage } from './combat-stats.js';
import { stationaryWeaponIntervalScale, startingWeaponProjectileCount } from './tuning-parts.js';
import { getAllEnemies, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox } from './combat-hitboxes.js';
import { drawArtilleryExplosion, artilleryExplosionDuration, artilleryExplosionReady } from './artillery-explosion.js';

/** Arcing throws settle on the ground; the 630-frame fuse counts from launch. */
export function createBeanBagBombAttack({random=Math.random}={}){
 const s=beanBagBombSettings;let owner=null,enabled=true,cooldown=0,bombs=[],explosions=[],shockwaves=[],shots=0;
 let sprite=null;
 const imageReady=typeof Image==='undefined'?Promise.resolve():new Promise(resolve=>{sprite=new Image();sprite.onload=resolve;sprite.onerror=()=>{sprite=null;resolve();};sprite.src=new URL('../sprites/attacks/Bean Bag.png',import.meta.url).href;});
 function reset(){owner=null;cooldown=0;bombs=[];explosions=[];shockwaves=[];shots=0;}
 function launch(player,weapon,viewport){
  const body=getCombatHitbox(player,false),stats=beanBagBombLevelStats(weapon.level),view=viewport||{x:body.x-640,y:body.y-360,width:1280,height:720};
  const reach=Math.min(500,Math.max(view.width,view.height)*.45),targets=getAllEnemies().filter(enemy=>{const t=getEnemyHurtbox(enemy);return Math.hypot(t.x-body.x,t.y-body.y)<=reach;});
  const count=startingWeaponProjectileCount(player,'bean-bag-bomb',stats.count);
  for(let i=0;i<count;i++){
   const target=targets.length?getEnemyHurtbox(targets[Math.min(targets.length-1,Math.floor(random()*targets.length))]):null;
   const angle=target?Math.atan2(target.y-body.y,target.x-body.x):random()*Math.PI*2;
   const distance=target?Math.hypot(target.x-body.x,target.y-body.y):reach*(.2+.65*random());
   const spread=count>1?(i-(count-1)/2)*.2:0,a=angle+spread;
   bombs.push({x:body.x,y:body.y,fromX:body.x,fromY:body.y,toX:body.x+Math.cos(a)*distance,toY:body.y+Math.sin(a)*distance,
    age:0,flight:Math.max(.15,distance/s.speed),radius:stats.radius*weaponSizeMultiplier(player),damageBonuses:stats.damageBonuses,count});shots++;
  }
 }
 function cast(player,angle=0,viewport=null){const weapon=player.attackSlots?.find(w=>w?.id==='bean-bag-bomb');if(!weapon)return false;if(owner!==player){reset();owner=player;}const body=getCombatHitbox(player,false),stats=beanBagBombLevelStats(weapon.level),distance=Math.min(400,Math.max(180,(viewport?.width||1000)*.3));bombs.push({exSkill:true,x:body.x,y:body.y,fromX:body.x,fromY:body.y,toX:body.x+Math.cos(angle)*distance,toY:body.y+Math.sin(angle)*distance,age:0,flight:Math.max(.3,distance/s.speed),radius:stats.radius*weaponSizeMultiplier(player)*3,damageBonuses:stats.damageBonuses,count:1});shots++;return true;}
 function nuclearHit(enemy,bomb,player,multiplier){const base=totalWeaponDamage(player,'bean-bag-bomb',s.damage,bomb.damageBonuses,{projectileCount:1,hitCooldownFrames:s.hitCooldown*60}),hit=rollAttackDamage(player,base,random,{target:enemy,weaponId:'bean-bag-bomb',damageMod:multiplier,skillAttack:true});if(damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'bean-bag-bomb',skillAttack:true})!==false)applyPoison(enemy,player,damageRules.baseScale*base,10);}
 function explode(bomb,player){
  explosions.push({x:bomb.x,y:bomb.y,radius:bomb.radius,age:0});
  if(bomb.exSkill)shockwaves.push({...bomb,age:0,maxRadius:bomb.radius*3,hits:new Set()});
  for(const enemy of getAllEnemies()){
   const t=getEnemyHurtbox(enemy),dx=t.x-bomb.x,dy=t.y-bomb.y,distance=Math.hypot(dx,dy),extent=distance?1/Math.hypot(dx/distance/t.rx,dy/distance/t.ry):0;
   if(distance>bomb.radius+extent)continue;
   if(bomb.exSkill){nuclearHit(enemy,bomb,player,5);continue;}
   const hit=rollAttackDamage(player,totalWeaponDamage(player,'bean-bag-bomb',s.damage,bomb.damageBonuses,{projectileCount:bomb.count,hitCooldownFrames:s.hitCooldown*60}),random,{target:enemy,weaponId:'bean-bag-bomb'});
   damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true});
  }
 }
 function update(delta,player,viewport=null){
  const weapon=player.attackSlots?.find(w=>w?.id==='bean-bag-bomb');if(!weapon){reset();return;}
  if(owner!==player){reset();owner=player;}if(!(delta>0))return;
  let left=delta;while(left>1e-8){
   if(enabled&&cooldown<=1e-8){launch(player,weapon,viewport);cooldown=attackTimeFormula(beanBagBombLevelStats(weapon.level).interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const step=Math.min(left,1/60,enabled&&cooldown>1e-8?cooldown:1/60);left-=step;cooldown=Math.max(0,cooldown-step);
   for(let i=explosions.length-1;i>=0;i--){explosions[i].age+=step;if(explosions[i].age>=artilleryExplosionDuration)explosions.splice(i,1);}
   for(let i=shockwaves.length-1;i>=0;i--){const wave=shockwaves[i];wave.age+=step;const radius=wave.maxRadius*Math.min(1,wave.age/1.2);for(const enemy of getAllEnemies()){if(!(enemy.hp>0)||wave.hits.has(enemy.id))continue;const body=getEnemyHurtbox(enemy),distance=Math.hypot(body.x-wave.x,body.y-wave.y);if(distance>radius+Math.max(body.rx,body.ry))continue;wave.hits.add(enemy.id);nuclearHit(enemy,wave,player,2);}if(wave.age>=1.2-1e-8)shockwaves.splice(i,1);}
   for(let i=bombs.length-1;i>=0;i--){const b=bombs[i];b.age+=step;const p=Math.min(1,b.age/b.flight);b.x=b.fromX+(b.toX-b.fromX)*p;b.y=b.fromY+(b.toY-b.fromY)*p;
    if(b.age>=(b.exSkill?b.flight:s.duration)-1e-8){explode(b,player);bombs.splice(i,1);}
   }
  }
 }
 function draw(context,camera){
  for(const b of bombs){const flight=Math.min(1,b.age/b.flight),arc=Math.sin(Math.PI*flight)*48,x=b.x-camera.x,y=b.y-camera.y,urgency=Math.max(0,(b.age-(s.duration-2))/2);
   context.save();context.fillStyle='rgba(15,30,50,.2)';context.beginPath();context.ellipse(x,y+6,10,4,0,0,Math.PI*2);context.fill();
   context.translate(x,y-arc);if(b.exSkill)context.scale(2,2);context.rotate(flight<1?b.age*6:Math.sin(b.age*12)*urgency*.08);
   if(sprite?.complete&&sprite.naturalWidth)context.drawImage(sprite,72,20,171,202,-12,-17,24,28);
   else {context.fillStyle='#b28a56';context.beginPath();context.ellipse(0,0,11,13,0,0,Math.PI*2);context.fill();}
   context.strokeStyle='#ffc569';context.lineWidth=1.5;context.beginPath();context.moveTo(0,-12);context.quadraticCurveTo(8,-20,3,-24);context.stroke();
   context.fillStyle=`rgba(255,${Math.round(200-100*urgency)},65,${.6+.4*Math.sin(b.age*(12+urgency*14))**2})`;context.beginPath();context.arc(3,-24,2+urgency*2,0,Math.PI*2);context.fill();context.restore();
  }
  for(const effect of explosions)drawArtilleryExplosion(context,camera,effect,effect.age);
  for(const wave of shockwaves){const p=Math.min(1,wave.age/1.2),radius=wave.maxRadius*p;context.save();context.translate(wave.x-camera.x,wave.y-camera.y);context.globalAlpha=p<.8 ? .95 : .95*(1-p)/.2;
   const glow=context.createRadialGradient(0,0,Math.max(0,radius-70),0,0,radius+18);glow.addColorStop(0,'rgba(123,255,153,0)');glow.addColorStop(.55,'rgba(134,255,161,.3)');glow.addColorStop(.8,'rgba(224,255,205,.85)');glow.addColorStop(1,'rgba(125,242,156,0)');context.fillStyle=glow;context.beginPath();context.arc(0,0,radius+18,0,Math.PI*2);context.fill();
   context.strokeStyle='rgba(126,255,167,.48)';context.lineWidth=14;context.beginPath();context.arc(0,0,radius,0,Math.PI*2);context.stroke();
   context.strokeStyle='#f3ffe2';context.lineWidth=4.5;context.beginPath();context.arc(0,0,radius,0,Math.PI*2);context.stroke();
   context.strokeStyle='rgba(190,255,203,.75)';context.lineWidth=2;context.beginPath();context.arc(0,0,Math.max(0,radius-14),0,Math.PI*2);context.stroke();context.restore();}

 }
 return {getAuraSources(){return bombs;},ready:Promise.all([imageReady,artilleryExplosionReady]),cast,update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get bombCount(){return bombs.length;},get explosionCount(){return explosions.length;}};
}
