import {maidForceSettings,maidForceLevelStats,attackTimeFormula,weaponSizeMultiplier} from './game-config.js';
import {ensureCombatStats,totalWeaponDamage,rollAttackDamage} from './combat-stats.js';
import {stationaryWeaponIntervalScale,startingWeaponProjectileCount} from './tuning-parts.js';
import {getAllEnemies,getEnemy,damageEnemy} from './world-state.js';
import {getCombatHitbox,getEnemyHurtbox,segmentHitsBody} from './combat-hitboxes.js';
import {createEnemySpatialIndex} from './enemy-spatial-index.js';

/** One-hit aimed scents; each accepted hit can launch a new scent at a nearby target. */
export function createMaidForceAttack({random=Math.random}={}){
 const s=maidForceSettings;let owner=null,enabled=true,cooldown=0,time=0,scents=[],shots=0,spreads=0;
 function reset(){owner=null;cooldown=0;time=0;scents=[];shots=0;spreads=0;}
 function fire(player,weapon,aim){const body=getCombatHitbox(player,false),stats=maidForceLevelStats(weapon.level),size=s.area*weaponSizeMultiplier(player),count=startingWeaponProjectileCount(player,'maid-force',stats.count);
  for(let i=0;i<count;i++){const angle=aim+(i-(count-1)/2)*.12,dx=Math.cos(angle),dy=Math.sin(angle),edge=1/Math.hypot(dx/body.rx,dy/body.ry)+3;
   scents.push({x:body.x+dx*edge,y:body.y+dy*edge,angle,age:0,isSpread:false,size,count,range:stats.range,chance:stats.chance,spreadMultiplier:stats.spreadMultiplier,baseMultiplier:1,damageBonuses:stats.damageBonuses,hits:new Map()});shots++;}
 }
 function chain(b,target,body){if(random()>=b.chance)return null;
  const candidates=getAllEnemies().filter(enemy=>enemy.id!==target.id&&enemy.hp>0&&time-(b.hits.get(enemy.id)??-Infinity)>=s.hitCooldown-1e-8).map(enemy=>{const point=getEnemyHurtbox(enemy);return {enemy,point,distance:Math.hypot(point.x-body.x,point.y-body.y)};}).filter(t=>t.distance<=b.range).sort((a,c)=>a.distance-c.distance);
  const next=candidates[0];if(!next)return null;spreads++;
  return {...b,x:body.x,y:body.y,angle:Math.atan2(next.point.y-body.y,next.point.x-body.x),age:0,isSpread:true,baseMultiplier:b.baseMultiplier*b.spreadMultiplier};
 }
 function update(delta,player,aim=0){const weapon=player.attackSlots?.find(w=>w?.id==='maid-force');if(!weapon){reset();return;}if(owner!==player){reset();owner=player;}if(!(delta>0))return;let left=delta,index=null;
  while(left>1e-8){if(enabled&&cooldown<=1e-8){fire(player,weapon,aim);cooldown=attackTimeFormula(maidForceLevelStats(weapon.level).interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const dt=Math.min(left,1/120,enabled&&cooldown>1e-8?cooldown:1/120);left-=dt;time+=dt;cooldown=Math.max(0,cooldown-dt);
   if(!scents.length)continue;if(!index)index=createEnemySpatialIndex(getAllEnemies(),getEnemyHurtbox);const pending=[];
   for(let i=scents.length-1;i>=0;i--){const b=scents[i],from={x:b.x,y:b.y};b.age+=dt;b.x+=Math.cos(b.angle)*s.speed*dt;b.y+=Math.sin(b.angle)*s.speed*dt;const radius=s.radius*b.size;
    const targets=index.querySegment(from,b,radius).filter(enemy=>{if(!getEnemy(enemy.id)||time-(b.hits.get(enemy.id)??-Infinity)<s.hitCooldown-1e-8)return false;const body=getEnemyHurtbox(enemy);return segmentHitsBody({...body,rx:body.rx+radius,ry:body.ry+radius},from.x,from.y,b.x,b.y);}).sort((a,c)=>{const t=getEnemyHurtbox(a),u=getEnemyHurtbox(c);return Math.hypot(t.x-from.x,t.y-from.y)-Math.hypot(u.x-from.x,u.y-from.y);});
    if(targets.length){const target=targets[0],body=getEnemyHurtbox(target);b.hits.set(target.id,time);
     const base=totalWeaponDamage(player,'maid-force',s.damage*b.baseMultiplier,b.damageBonuses,{projectileCount:b.count,hitCooldownFrames:s.hitCooldown*60}),hit=rollAttackDamage(player,base,random,{target,weaponId:'maid-force'});
     if(damageEnemy(target.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'maid-force'})!==false){const next=chain(b,target,body);if(next)pending.push(next);}scents.splice(i,1);
    }else if(b.age>=s.duration-1e-8)scents.splice(i,1);
   }
   // Descendants move on the next step, avoiding synchronous chain recursion.
   scents.push(...pending);
  }
 }
 function draw(context,camera){for(const b of scents){const radius=s.radius*b.size,alpha=Math.min(1,b.age/.04,(s.duration-b.age)/.15);context.save();context.translate(b.x-camera.x,b.y-camera.y);context.rotate(b.angle);context.globalAlpha=Math.max(0,alpha);
   const colors=b.isSpread?['rgba(239,252,255,.95)','rgba(169,231,255,.8)','rgba(112,199,255,.4)','rgba(112,199,255,0)']:['rgba(241,255,248,.95)','rgba(164,255,215,.8)','rgba(129,232,219,.4)','rgba(129,232,219,0)'];
   const glow=context.createRadialGradient(0,0,0,0,0,radius);glow.addColorStop(0,colors[0]);glow.addColorStop(.35,colors[1]);glow.addColorStop(.7,colors[2]);glow.addColorStop(1,colors[3]);context.fillStyle=glow;context.beginPath();context.arc(0,0,radius,0,Math.PI*2);context.fill();
   context.strokeStyle=b.isSpread?'rgba(193,235,255,.5)':'rgba(214,255,235,.5)';context.lineWidth=radius*.22;context.beginPath();context.moveTo(-radius*.2,0);context.quadraticCurveTo(-radius*1.1,-radius*.45,-radius*1.8,0);context.stroke();context.restore();}
 }
 return {ready:Promise.resolve(),update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get projectileCount(){return scents.length;},get spreadsFired(){return spreads;}};
}
