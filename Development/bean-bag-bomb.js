import { beanBagBombSettings, beanBagBombLevelStats, attackTimeFormula, weaponSizeMultiplier } from './game-config.js';
import { ensureCombatStats, totalWeaponDamage, rollAttackDamage } from './combat-stats.js';
import { stationaryWeaponIntervalScale, startingWeaponProjectileCount } from './tuning-parts.js';
import { getAllEnemies, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox } from './combat-hitboxes.js';
import { drawArtilleryExplosion, artilleryExplosionDuration, artilleryExplosionReady } from './artillery-explosion.js';

/** Arcing throws settle on the ground; the 630-frame fuse counts from launch. */
export function createBeanBagBombAttack({random=Math.random}={}){
 const s=beanBagBombSettings;let owner=null,enabled=true,cooldown=0,bombs=[],explosions=[],shots=0;
 let sprite=null;
 const imageReady=typeof Image==='undefined'?Promise.resolve():new Promise(resolve=>{sprite=new Image();sprite.onload=resolve;sprite.onerror=()=>{sprite=null;resolve();};sprite.src=new URL('../sprites/attacks/Bean Bag.png',import.meta.url).href;});
 function reset(){owner=null;cooldown=0;bombs=[];explosions=[];shots=0;}
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
 function explode(bomb,player){
  explosions.push({x:bomb.x,y:bomb.y,radius:bomb.radius,age:0});
  for(const enemy of getAllEnemies()){
   const t=getEnemyHurtbox(enemy),dx=t.x-bomb.x,dy=t.y-bomb.y,distance=Math.hypot(dx,dy),extent=distance?1/Math.hypot(dx/distance/t.rx,dy/distance/t.ry):0;
   if(distance>bomb.radius+extent)continue;
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
   for(let i=bombs.length-1;i>=0;i--){const b=bombs[i];b.age+=step;const p=Math.min(1,b.age/b.flight);b.x=b.fromX+(b.toX-b.fromX)*p;b.y=b.fromY+(b.toY-b.fromY)*p;
    if(b.age>=s.duration-1e-8){explode(b,player);bombs.splice(i,1);}
   }
  }
 }
 function draw(context,camera){
  for(const b of bombs){const flight=Math.min(1,b.age/b.flight),arc=Math.sin(Math.PI*flight)*48,x=b.x-camera.x,y=b.y-camera.y,urgency=Math.max(0,(b.age-(s.duration-2))/2);
   context.save();context.fillStyle='rgba(15,30,50,.2)';context.beginPath();context.ellipse(x,y+6,10,4,0,0,Math.PI*2);context.fill();
   context.translate(x,y-arc);context.rotate(flight<1?b.age*6:Math.sin(b.age*12)*urgency*.08);
   if(sprite?.complete&&sprite.naturalWidth)context.drawImage(sprite,72,20,171,202,-12,-17,24,28);
   else {context.fillStyle='#b28a56';context.beginPath();context.ellipse(0,0,11,13,0,0,Math.PI*2);context.fill();}
   context.strokeStyle='#ffc569';context.lineWidth=1.5;context.beginPath();context.moveTo(0,-12);context.quadraticCurveTo(8,-20,3,-24);context.stroke();
   context.fillStyle=`rgba(255,${Math.round(200-100*urgency)},65,${.6+.4*Math.sin(b.age*(12+urgency*14))**2})`;context.beginPath();context.arc(3,-24,2+urgency*2,0,Math.PI*2);context.fill();context.restore();
  }
  for(const effect of explosions)drawArtilleryExplosion(context,camera,effect,effect.age);
 }
 return {ready:Promise.all([imageReady,artilleryExplosionReady]),update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get bombCount(){return bombs.length;},get explosionCount(){return explosions.length;}};
}
