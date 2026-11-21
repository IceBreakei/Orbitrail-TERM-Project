import { weaponSizeMultiplier, weaponKnockbackMultiplier } from './game-config.js';
import { molotovSettings, molotovLevelStats, attackTimeFormula } from './game-config.js';
import { ensureCombatStats, totalWeaponDamage, rollAttackDamage } from './combat-stats.js';
import { stationaryWeaponIntervalScale } from './tuning-parts.js';
import { getAllEnemies, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox } from './combat-hitboxes.js';
import { molotovAnimationReady, drawMolotovNapalm } from './molotov-animation.js';

/** Explicit fallback odds: 30% close, 60% middle, 10% far; randomized within each band. */
export function molotovThrowDistance(random=Math.random){
 const u=Math.max(0,Math.min(1,random()));
 if(u<.3)return .05+.25*(u/.3);
 if(u<.9)return .3+.4*((u-.3)/.6);
 return .7+.3*((u-.9)/.1);
}

/** Prefer the nearest enemy in the middle 30-80% of directional screen reach. */
export function molotovLandingPoint(body,view,enemies,random=Math.random){
 const pad=Math.max(view.width,view.height)*.15;
 function reach(angle){const dx=Math.cos(angle),dy=Math.sin(angle);
  const edgeX=Math.abs(dx)>1e-8?((dx>0?view.x+view.width+pad:view.x-pad)-body.x)/dx:Infinity;
  const edgeY=Math.abs(dy)>1e-8?((dy>0?view.y+view.height+pad:view.y-pad)-body.y)/dy:Infinity;
  return Math.max(20,Math.min(edgeX,edgeY));
 }
 let nearest=null,nearestDistance=Infinity;
 for(const enemy of enemies){
  const target=getEnemyHurtbox(enemy),dx=target.x-body.x,dy=target.y-body.y,distance=Math.hypot(dx,dy);
  const fraction=distance/reach(Math.atan2(dy,dx));
  if(fraction>=.3&&fraction<=.8&&distance<nearestDistance){nearest=target;nearestDistance=distance;}
 }
 if(nearest)return {x:nearest.x,y:nearest.y};
 const angle=random()*Math.PI*2,distance=reach(angle)*molotovThrowDistance(random);
 return {x:body.x+Math.cos(angle)*distance,y:body.y+Math.sin(angle)*distance};
}

export function createMolotovAttack({random=Math.random}={}){
 let owner=null,cooldown=0,time=0,enabled=true,throws=[],fires=[],shots=0;
 function reset(){owner=null;cooldown=0;time=0;throws=[];fires=[];shots=0;}
 function launch(player,stats,viewport){
  const body=getCombatHitbox(player,false),view=viewport||{x:body.x-640,y:body.y-360,width:1280,height:720};
  const enemies=getAllEnemies();
  for(let i=0;i<stats.count;i++){
   const {x,y}=molotovLandingPoint(body,view,enemies,random);
   throws.push({x:body.x,y:body.y,fromX:body.x,fromY:body.y,toX:x,toY:y,age:0,
    flight:Math.max(.12,Math.hypot(x-body.x,y-body.y)/molotovSettings.speed),
    radius:stats.radius*weaponSizeMultiplier(player),duration:stats.duration,damageBonuses:stats.damageBonuses,count:stats.count});shots++;
  }
 }
 function update(delta,player,viewport=null){
  const weapon=player.attackSlots?.find(w=>w?.id==='molotov-cocktail');if(!weapon){reset();return;}
  if(owner!==player){reset();owner=player;}if(delta<=0)return;
  let left=delta;
  while(left>1e-8){
   if(enabled&&cooldown<=1e-8){launch(player,molotovLevelStats(weapon.level),viewport);cooldown=attackTimeFormula(molotovSettings.interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const step=Math.min(left,1/60,enabled&&cooldown>1e-8?cooldown:1/60);left-=step;time+=step;cooldown=Math.max(0,cooldown-step);
   for(let i=throws.length-1;i>=0;i--){const b=throws[i];b.age+=step;const progress=Math.min(1,b.age/b.flight);b.x=b.fromX+(b.toX-b.fromX)*progress;b.y=b.fromY+(b.toY-b.fromY)*progress;
    if(progress>=1){fires.push({...b,x:b.toX,y:b.toY,age:0,hits:new Map()});throws.splice(i,1);}}
   const enemies=getAllEnemies(),living=new Set(enemies.map(e=>e.id));
   for(let i=fires.length-1;i>=0;i--){const zone=fires[i];zone.age+=step;
    if(zone.age>=zone.duration){fires.splice(i,1);continue;}
    for(const id of zone.hits.keys())if(!living.has(id))zone.hits.delete(id);
    for(const enemy of enemies){if(time-(zone.hits.get(enemy.id)??-Infinity)<molotovSettings.hitCooldown-1e-8)continue;
     const t=getEnemyHurtbox(enemy),dx=t.x-zone.x,dy=t.y-zone.y,distance=Math.hypot(dx,dy),extent=distance?1/Math.hypot(dx/distance/t.rx,dy/distance/t.ry):0;
     if(distance>zone.radius+extent)continue;zone.hits.set(enemy.id,time);
     const hit=rollAttackDamage(player,totalWeaponDamage(player,'molotov-cocktail',molotovSettings.damage,zone.damageBonuses,{projectileCount:zone.count,hitCooldownFrames:45}),random,{target:enemy,weaponId:'molotov-cocktail'});
     damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true});
    }
   }
  }
 }
 function drawGround(context,camera){for(const zone of fires)drawMolotovNapalm(context,camera,zone);}
 function drawThrows(context,camera){context.save();for(const b of throws){const arc=Math.sin(Math.PI*b.age/b.flight)*45;
  context.save();context.translate(b.x-camera.x,b.y-camera.y-arc);context.rotate(b.age*7);context.fillStyle='#746533';context.fillRect(-4,-7,8,14);context.fillStyle='#d3cca5';context.fillRect(-2,-11,4,5);context.fillStyle='#ffb64d';context.fillRect(-2,-14,4,4);context.restore();}context.restore();}
 return {ready:molotovAnimationReady,reset,update,drawGround,drawThrows,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get fireCount(){return fires.length;},get projectileCount(){return throws.length;}};
}
