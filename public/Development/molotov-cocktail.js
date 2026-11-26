import { molotovSkillSettings, molotovSkillThrowCount } from './game-config.js';
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

/** Greedy pack coverage with spacing against both airborne throws and existing fires. */
export function molotovExLandingPoint(body,view,enemies,reservations,radius,random=Math.random){
 const reach=angle=>{const dx=Math.cos(angle),dy=Math.sin(angle),pad=Math.max(view.width,view.height)*.15;return Math.max(20,Math.min(Math.abs(dx)>1e-8?((dx>0?view.x+view.width+pad:view.x-pad)-body.x)/dx:Infinity,Math.abs(dy)>1e-8?((dy>0?view.y+view.height+pad:view.y-pad)-body.y)/dy:Infinity));};
 const live=enemies.filter(e=>e.hp>0).map(getEnemyHurtbox).filter(t=>t.x+t.rx>=view.x&&t.x-t.rx<=view.x+view.width&&t.y+t.ry>=view.y&&t.y-t.ry<=view.y+view.height).sort((a,b)=>Math.hypot(a.x-body.x,a.y-body.y)-Math.hypot(b.x-body.x,b.y-body.y));
 const near=live.filter(t=>Math.hypot(t.x-body.x,t.y-body.y)<=reach(Math.atan2(t.y-body.y,t.x-body.x))*.8),targets=(near.length?near:live).slice(0,64),candidates=[];
 for(const target of targets){candidates.push({x:target.x,y:target.y});for(let i=0;i<8;i++){const angle=i*Math.PI/4;candidates.push({x:target.x+Math.cos(angle)*radius*.85,y:target.y+Math.sin(angle)*radius*.85});}}
 if(targets.length)candidates.push({x:targets.reduce((sum,t)=>sum+t.x,0)/targets.length,y:targets.reduce((sum,t)=>sum+t.y,0)/targets.length});
 else {const angle=random()*Math.PI*2;for(let i=0;i<32;i++){const a=angle+i*2.3999632297,d=reach(a)*molotovSkillSettings.distanceMultiplier*(.1+.6*((i*.61803398875+random())%1));candidates.push({x:body.x+Math.cos(a)*d,y:body.y+Math.sin(a)*d});}}
 const covered=new Set(targets.filter(target=>reservations.some(r=>Math.hypot(target.x-r.x,target.y-r.y)<=r.radius)));
 let best=null,bestScore=-Infinity;
 for(const point of candidates){const distance=Math.hypot(point.x-body.x,point.y-body.y),angle=Math.atan2(point.y-body.y,point.x-body.x),maxReach=reach(angle)*molotovSkillSettings.distanceMultiplier;if(distance>maxReach)continue;
  let coverage=0,fresh=0;for(const target of targets){if(Math.hypot(target.x-point.x,target.y-point.y)>radius)continue;coverage++;if(!covered.has(target))fresh++;}
  if(targets.length&&!coverage)continue;
  const overlap=reservations.reduce((sum,r)=>sum+Math.max(0,1-Math.hypot(point.x-r.x,point.y-r.y)/(radius+r.radius))**2,0),score=fresh*3+coverage*.2-overlap*20-distance/maxReach*.25;
  if(score>bestScore){bestScore=score;best=point;}
 }
 return best||{x:body.x,y:body.y};
}

export function createMolotovAttack({random=Math.random}={}){
 let owner=null,cooldown=0,time=0,enabled=true,throws=[],fires=[],shots=0,burst=null;
 function reset(){owner=null;cooldown=0;time=0;throws=[];fires=[];shots=0;burst=null;}
 function launch(player,stats,viewport){
  const body=getCombatHitbox(player,false),view=viewport||{x:body.x-640,y:body.y-360,width:1280,height:720};
  const enemies=getAllEnemies();
  for(let i=0;i<stats.count;i++){
   const reservations=[...fires.map(f=>({x:f.x,y:f.y,radius:f.radius})),...throws.map(t=>({x:t.toX,y:t.toY,radius:t.radius}))];
   const landing=stats.exSkill?molotovExLandingPoint(body,view,enemies,reservations,stats.radius*weaponSizeMultiplier(player),random):molotovLandingPoint(body,view,enemies,random);
   const x=landing.x,y=landing.y;
   throws.push({x:body.x,y:body.y,fromX:body.x,fromY:body.y,toX:x,toY:y,age:0,
    flight:Math.max(.12,Math.hypot(x-body.x,y-body.y)/molotovSettings.speed),
    radius:stats.radius*weaponSizeMultiplier(player),duration:stats.duration,damageBonuses:stats.damageBonuses,count:stats.splitCount??stats.count,damageMultiplier:stats.damageMultiplier??1,exSkill:Boolean(stats.exSkill),visualScale:stats.exSkill?molotovSkillSettings.sizeMultiplier:1});shots++;
  }
 }
 function cast(player,viewport=null,damageMultiplier=1){
  const weapon=player.attackSlots?.find(w=>w?.id==='molotov-cocktail');if(!weapon)return false;
  if(owner!==player){reset();owner=player;}const stats=molotovLevelStats(weapon.level);
  burst={remaining:molotovSkillThrowCount(weapon.level),timer:0,viewport,stats:{...stats,count:1,splitCount:stats.count,radius:stats.radius*molotovSkillSettings.sizeMultiplier,duration:stats.duration*molotovSkillSettings.durationMultiplier,distanceMultiplier:molotovSkillSettings.distanceMultiplier,damageMultiplier:molotovSkillSettings.damageMultiplier*Math.max(0,damageMultiplier),exSkill:true}};return true;
 }
 function update(delta,player,viewport=null){
  const weapon=player.attackSlots?.find(w=>w?.id==='molotov-cocktail');if(!weapon){reset();return;}
  if(owner!==player){reset();owner=player;}if(delta<=0)return;
  let left=delta;
  while(left>1e-8){
   if(burst&&burst.timer<=1e-8){launch(player,burst.stats,burst.viewport||viewport);burst.remaining--;burst.timer=molotovSkillSettings.throwInterval;if(!burst.remaining)burst=null;}
   if(enabled&&cooldown<=1e-8){launch(player,molotovLevelStats(weapon.level),viewport);cooldown=attackTimeFormula(molotovSettings.interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const step=Math.min(left,1/60,enabled&&cooldown>1e-8?cooldown:1/60,burst&&burst.timer>1e-8?burst.timer:Infinity);left-=step;time+=step;cooldown=Math.max(0,cooldown-step);if(burst)burst.timer=Math.max(0,burst.timer-step);
   for(let i=throws.length-1;i>=0;i--){const b=throws[i];b.age+=step;const progress=Math.min(1,b.age/b.flight);b.x=b.fromX+(b.toX-b.fromX)*progress;b.y=b.fromY+(b.toY-b.fromY)*progress;
    if(progress>=1){fires.push({...b,x:b.toX,y:b.toY,age:0,hits:new Map()});throws.splice(i,1);}}
   const enemies=getAllEnemies(),living=new Set(enemies.map(e=>e.id));
   for(let i=fires.length-1;i>=0;i--){const zone=fires[i];zone.age+=step;
    if(zone.age>=zone.duration){fires.splice(i,1);continue;}
    for(const id of zone.hits.keys())if(!living.has(id))zone.hits.delete(id);
    for(const enemy of enemies){if(time-(zone.hits.get(enemy.id)??-Infinity)<molotovSettings.hitCooldown-1e-8)continue;
     const t=getEnemyHurtbox(enemy),dx=t.x-zone.x,dy=t.y-zone.y,distance=Math.hypot(dx,dy),extent=distance?1/Math.hypot(dx/distance/t.rx,dy/distance/t.ry):0;
     if(distance>zone.radius+extent)continue;zone.hits.set(enemy.id,time);
     const hit=rollAttackDamage(player,totalWeaponDamage(player,'molotov-cocktail',molotovSettings.damage,zone.damageBonuses,{projectileCount:zone.count,hitCooldownFrames:45}),random,{target:enemy,weaponId:'molotov-cocktail',damageMod:zone.damageMultiplier,skillAttack:zone.exSkill});
     damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'molotov-cocktail'});
    }
   }
  }
 }
 function drawGround(context,camera){for(const zone of fires)drawMolotovNapalm(context,camera,zone);}
 function drawThrows(context,camera){context.save();for(const b of throws){const arc=Math.sin(Math.PI*b.age/b.flight)*45;
  context.save();context.translate(b.x-camera.x,b.y-camera.y-arc);context.rotate(b.age*7);if(b.visualScale!==1)context.scale(b.visualScale,b.visualScale);context.fillStyle='#746533';context.fillRect(-4,-7,8,14);context.fillStyle='#d3cca5';context.fillRect(-2,-11,4,5);context.fillStyle='#ffb64d';context.fillRect(-2,-14,4,4);context.restore();}context.restore();}
 return {getAuraSources(){return throws.concat(fires);},ready:molotovAnimationReady,cast,reset,update,drawGround,drawThrows,setAutoattackEnabled(value){enabled=Boolean(value);},get burstRemaining(){return burst?.remaining||0;},get shotsFired(){return shots;},get fireCount(){return fires.length;},get projectileCount(){return throws.length;}};
}
