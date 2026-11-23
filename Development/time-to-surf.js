import {timeToSurfSettings,timeToSurfLevelStats,attackTimeFormula,weaponSizeMultiplier} from './game-config.js';
import {ensureCombatStats,totalWeaponDamage,rollAttackDamage} from './combat-stats.js';
import {stationaryWeaponIntervalScale} from './tuning-parts.js';
import {getAllEnemies,getEnemy,damageEnemy} from './world-state.js';
import {getCombatHitbox,getEnemyHurtbox,segmentHitsBody} from './combat-hitboxes.js';
import {createEnemySpatialIndex} from './enemy-spatial-index.js';

/** Waves drift vertically in opposite directions with a gentle sideways sway. */
export function timeToSurfPose(wave){return {x:wave.originX+Math.sin(wave.age/timeToSurfSettings.travelPeriod*Math.PI*2)*wave.travelWidth*wave.direction,y:wave.originY+wave.direction*wave.speed*wave.age};}
export function createTimeToSurfAttack({random=Math.random}={}){
 const s=timeToSurfSettings;let owner=null,enabled=true,cooldown=0,time=0,waves=[],shots=0;
 function reset(){owner=null;cooldown=0;time=0;waves=[];shots=0;}
 function fire(player,weapon){const stats=timeToSurfLevelStats(weapon.level),body=getCombatHitbox(player,false),size=stats.size*weaponSizeMultiplier(player);
  for(const direction of [-1,1]){waves.push({originX:body.x,originY:body.y,x:body.x,y:body.y,age:0,direction,speed:stats.speed,travelWidth:stats.travelWidth*size,size,damageBonuses:stats.damageBonuses,hits:new Map()});shots++;}
 }
 function update(delta,player){const weapon=player.attackSlots?.find(w=>w?.id==='time-to-surf');if(!weapon){reset();return;}if(owner!==player){reset();owner=player;}if(!(delta>0))return;let left=delta,index=null;
  while(left>1e-8){if(enabled&&cooldown<=1e-8){fire(player,weapon);cooldown=attackTimeFormula(timeToSurfLevelStats(weapon.level).interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const dt=Math.min(left,1/120,enabled&&cooldown>1e-8?cooldown:1/120);left-=dt;time+=dt;cooldown=Math.max(0,cooldown-dt);
   if(!waves.length)continue;if(!index)index=createEnemySpatialIndex(getAllEnemies(),getEnemyHurtbox);
   for(let i=waves.length-1;i>=0;i--){const w=waves[i],from={x:w.x,y:w.y};w.age+=dt;Object.assign(w,timeToSurfPose(w));const rx=s.width*w.size/2,ry=s.depth*w.size/2;
    for(const enemy of index.querySegment(from,w,Math.max(rx,ry))){if(!getEnemy(enemy.id)||time-(w.hits.get(enemy.id)??-Infinity)<s.hitCooldown-1e-8)continue;const body=getEnemyHurtbox(enemy);if(!segmentHitsBody({...body,rx:body.rx+rx,ry:body.ry+ry},from.x,from.y,w.x,w.y))continue;w.hits.set(enemy.id,time);
     const base=totalWeaponDamage(player,'time-to-surf',s.damage,w.damageBonuses,{projectileCount:2,hitCooldownFrames:s.hitCooldown*60}),hit=rollAttackDamage(player,base,random,{target:enemy,weaponId:'time-to-surf'});damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'time-to-surf'});
    }
    if(w.age>=s.duration-1e-8)waves.splice(i,1);
   }
  }
 }
 function draw(context,camera){for(const w of waves){const width=s.width*w.size,depth=s.depth*w.size,alpha=Math.min(1,w.age/.12,(s.duration-w.age)/.3);context.save();context.translate(w.x-camera.x,w.y-camera.y);context.scale(1,-w.direction);context.globalAlpha=Math.max(0,alpha);
   const gradient=context.createLinearGradient(0,-depth/2,0,depth/2);gradient.addColorStop(0,'rgba(191,251,255,.85)');gradient.addColorStop(.35,'rgba(64,202,244,.7)');gradient.addColorStop(1,'rgba(47,143,234,0)');context.fillStyle=gradient;
   context.beginPath();context.moveTo(-width/2,0);context.bezierCurveTo(-width*.3,-depth*.72,width*.18,-depth*.6,width/2,0);context.bezierCurveTo(width*.24,depth*.7,-width*.3,depth*.7,-width/2,0);context.fill();
   context.strokeStyle='rgba(228,255,255,.9)';context.lineWidth=2*w.size;context.beginPath();context.moveTo(-width*.46,-depth*.03);context.bezierCurveTo(-width*.22,-depth*.65,width*.2,-depth*.55,width*.46,-depth*.03);context.stroke();
   context.fillStyle='rgba(235,255,255,.75)';for(let i=0;i<7;i++){const x=(i/6-.5)*width*.84,y=-depth*(.12+.2*Math.sin(i*.8+w.age*5));context.beginPath();context.arc(x,y,(1.2+.5*Math.sin(i+w.age*4))*w.size,0,Math.PI*2);context.fill();}context.restore();}
 }
 return {ready:Promise.resolve(),update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get projectileCount(){return waves.length;}};
}
