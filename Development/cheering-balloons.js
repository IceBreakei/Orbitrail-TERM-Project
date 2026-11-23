import {cheeringBalloonsSettings,cheeringBalloonsLevelStats,cheeringBalloonsCharacterStats,attackTimeFormula,weaponSizeMultiplier,weaponKnockbackMultiplier} from './game-config.js';
import {ensureCombatStats,totalWeaponDamage,rollAttackDamage} from './combat-stats.js';
import {stationaryWeaponIntervalScale,startingWeaponProjectileCount} from './tuning-parts.js';
import {getAllEnemies,getEnemy,damageEnemy} from './world-state.js';
import {getCombatHitbox,getEnemyHurtbox,segmentHitsBody} from './combat-hitboxes.js';
import {createEnemySpatialIndex} from './enemy-spatial-index.js';
import {beginKnockback} from './knockback.js';

export function cheeringBalloonPose(ball){const p=Math.min(1,ball.flightAge/ball.flight);return {x:ball.fromX+(ball.toX-ball.fromX)*p,y:ball.fromY+(ball.toY-ball.fromY)*p-Math.sin(p*Math.PI)*ball.arc};}
export function createCheeringBalloonsAttack({random=Math.random}={}){
 const s=cheeringBalloonsSettings;let owner=null,enabled=true,cooldown=0,time=0,balls=[],shots=0,bounces=0;
 function reset(){owner=null;cooldown=0;time=0;balls=[];shots=0;bounces=0;}
 function randomTarget(list){return list.length?list[Math.min(list.length-1,Math.floor(random()*list.length))]:null;}
 function fire(player,weapon,view){const stats=cheeringBalloonsLevelStats(weapon.level),character=cheeringBalloonsCharacterStats(player),body=getCombatHitbox(player,false),count=startingWeaponProjectileCount(player,'cheering-balloons',stats.count),radius=s.radius*character.area*weaponSizeMultiplier(player);
  const targets=getAllEnemies().filter(enemy=>{const t=getEnemyHurtbox(enemy);return enemy.hp>0&&t.x+t.rx>=view.x&&t.x-t.rx<=view.x+view.width&&t.y+t.ry>=view.y&&t.y-t.ry<=view.y+view.height;});
  for(let i=0;i<count;i++){const target=randomTarget(targets),point=target?getEnemyHurtbox(target):{x:body.x+(random()-.5)*Math.min(view.width,300),y:body.y+(random()-.5)*Math.min(view.height,300)};
   balls.push({x:point.x,y:point.y-s.fallHeight,fromX:point.x,fromY:point.y-s.fallHeight,toX:point.x,toY:point.y,flight:s.fallHeight/s.speed,flightAge:0,arc:0,age:0,radius,count,knockback:stats.knockback,knockbackSpeed:character.knockbackSpeed,damageBonuses:stats.damageBonuses,hits:new Map()});shots++;}
 }
 function bounce(ball){const targets=getAllEnemies().filter(enemy=>{const t=getEnemyHurtbox(enemy);return enemy.hp>0&&time-(ball.hits.get(enemy.id)??-Infinity)>=s.hitCooldown-1e-8&&Math.hypot(t.x-ball.x,t.y-ball.y)<=s.range;});const target=randomTarget(targets),point=target?getEnemyHurtbox(target):null,angle=random()*Math.PI*2,distance=80+random()*120;
  ball.fromX=ball.x;ball.fromY=ball.y;ball.toX=point?.x??ball.x+Math.cos(angle)*distance;ball.toY=point?.y??ball.y+Math.sin(angle)*distance;ball.flight=Math.max(.35,Math.hypot(ball.toX-ball.x,ball.toY-ball.y)/s.speed);ball.flightAge=0;ball.arc=Math.min(120,50+Math.hypot(ball.toX-ball.x,ball.toY-ball.y)*.25);bounces++;
 }
 function update(delta,player,viewport){const weapon=player.attackSlots?.find(w=>w?.id==='cheering-balloons');if(!weapon){reset();return;}if(owner!==player){reset();owner=player;}if(!(delta>0))return;const body=getCombatHitbox(player,false),view=viewport||{x:body.x-640,y:body.y-360,width:1280,height:720};let left=delta,index=null;
  while(left>1e-8){if(enabled&&cooldown<=1e-8){fire(player,weapon,view);cooldown=attackTimeFormula(cheeringBalloonsLevelStats(weapon.level).interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const dt=Math.min(left,1/120,enabled&&cooldown>1e-8?cooldown:1/120);left-=dt;time+=dt;cooldown=Math.max(0,cooldown-dt);if(!balls.length)continue;if(!index)index=createEnemySpatialIndex(getAllEnemies(),getEnemyHurtbox);
   for(let i=balls.length-1;i>=0;i--){const b=balls[i],from={x:b.x,y:b.y};b.age+=dt;b.flightAge+=dt;Object.assign(b,cheeringBalloonPose(b));let landed=false;
    const targets=index.querySegment(from,b,b.radius).filter(enemy=>{if(!getEnemy(enemy.id)||time-(b.hits.get(enemy.id)??-Infinity)<s.hitCooldown-1e-8)return false;const t=getEnemyHurtbox(enemy);return segmentHitsBody({...t,rx:t.rx+b.radius,ry:t.ry+b.radius},from.x,from.y,b.x,b.y);}).sort((a,c)=>{const t=getEnemyHurtbox(a),u=getEnemyHurtbox(c);return Math.hypot(t.x-from.x,t.y-from.y)-Math.hypot(u.x-from.x,u.y-from.y);});
    if(targets.length){const target=targets[0];b.hits.set(target.id,time);const base=totalWeaponDamage(player,'cheering-balloons',s.damage,b.damageBonuses,{projectileCount:b.count,hitCooldownFrames:s.hitCooldown*60}),hit=rollAttackDamage(player,base,random,{target,weaponId:'cheering-balloons'}),accepted=damageEnemy(target.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'cheering-balloons'});
     if(accepted!==false&&b.knockback&&getEnemy(target.id)){const t=getEnemyHurtbox(target),center=getCombatHitbox(player,false),angle=Math.atan2(t.y-center.y,t.x-center.x),distance=b.knockbackSpeed*s.knockbackSeconds*weaponKnockbackMultiplier(player),motion=beginKnockback(target,Math.cos(angle)*distance,Math.sin(angle)*distance,s.knockbackSeconds);if(motion){target.skillKnockback=motion;target.knockbackMovementRemaining=Math.max(target.knockbackMovementRemaining||0,s.knockbackSeconds);}}
     landed=true;
    }
    if(b.age>=s.duration-1e-8){balls.splice(i,1);continue;}if(landed||b.flightAge>=b.flight-1e-8)bounce(b);
   }
  }
 }
 function draw(context,camera){for(const b of balls){const r=b.radius;context.save();context.translate(b.x-camera.x,b.y-camera.y);context.globalAlpha=Math.min(1,b.age/.06,(s.duration-b.age)/.15);context.rotate(b.age*2);
   const fill=context.createRadialGradient(-r*.3,-r*.35,r*.05,0,0,r);fill.addColorStop(0,'#b1ecff');fill.addColorStop(.45,'#67bffc');fill.addColorStop(1,'#3287d2');context.fillStyle=fill;context.beginPath();context.arc(0,0,r,0,Math.PI*2);context.fill();
   context.strokeStyle='rgba(24,104,174,.55)';context.lineWidth=Math.max(.8,r*.06);for(const sign of [-1,1]){context.beginPath();context.moveTo(-r*.6,-r*.8);context.bezierCurveTo(sign*r*.7,-r*.3,sign*r*.7,r*.3,r*.6,r*.8);context.stroke();}
   context.fillStyle='rgba(239,253,255,.55)';context.beginPath();context.ellipse(-r*.3,-r*.4,r*.27,r*.12,-.6,0,Math.PI*2);context.fill();context.restore();}
 }
 return {ready:Promise.resolve(),update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get projectileCount(){return balls.length;},get bouncesFired(){return bounces;}};
}
