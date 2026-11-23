import {wakamoBayonetSettings,wakamoBayonetLevelStats,attackTimeFormula,weaponSizeMultiplier,weaponKnockbackMultiplier} from './game-config.js';
import {ensureCombatStats,totalWeaponDamage,rollAttackDamage} from './combat-stats.js';
import {stationaryWeaponIntervalScale} from './tuning-parts.js';
import {getAllEnemies,getEnemy,damageEnemy} from './world-state.js';
import {getCombatHitbox,getEnemyHurtbox,segmentHitsBody} from './combat-hitboxes.js';
import {beginKnockback} from './knockback.js';

export function bayonetSwingAngle(aim,age,reverse=false){const p=Math.max(0,Math.min(1,age/wakamoBayonetSettings.swingDuration)),ease=p*p*(3-2*p);return aim+(reverse?1:-1)*wakamoBayonetSettings.arc/2+(reverse?-1:1)*ease*wakamoBayonetSettings.arc;}
export function bayonetHits(body,origin,from,to,reach){const samples=Math.max(1,Math.ceil(Math.abs(to-from)/(Math.PI/90)));for(let i=0;i<=samples;i++){const a=from+(to-from)*i/samples;if(segmentHitsBody({...body,rx:body.rx+2,ry:body.ry+2},origin.x,origin.y,origin.x+Math.cos(a)*reach,origin.y+Math.sin(a)*reach))return true;}return false;}
export function createWakamoBayonetAttack({random=Math.random}={}){
 const s=wakamoBayonetSettings;let owner=null,enabled=true,cooldown=0,time=0,swing=null,combo=null,shots=0,hits=new Map(),sprite=null;
 const ready=typeof Image==='undefined'?Promise.resolve():new Promise(resolve=>{sprite=new Image();sprite.onload=resolve;sprite.onerror=()=>{sprite=null;resolve();};sprite.src=new URL('../sprites/attacks/wakamo-bayonet.png',import.meta.url).href;});
 function reset(){owner=null;cooldown=0;time=0;swing=null;combo=null;shots=0;hits.clear();}
 function closest(player,reach){const origin=getCombatHitbox(player,false);return getAllEnemies().filter(e=>e.hp>0).map(enemy=>{const b=getEnemyHurtbox(enemy),dx=b.x-origin.x,dy=b.y-origin.y,d=Math.hypot(dx,dy),extent=d?1/Math.hypot(dx/d/b.rx,dy/d/b.ry):0;return {enemy,body:b,distance:Math.max(0,d-extent)};}).filter(t=>t.distance<=reach).sort((a,b)=>a.distance-b.distance)[0];}
 function strike(player,stats,target,reverse=false){const body=getCombatHitbox(player,false),aim=Math.atan2(target.body.y-body.y,target.body.x-body.x);swing={aim,age:0,reverse,size:stats.size*weaponSizeMultiplier(player),stats,hits:new Set()};shots++;}
 function update(delta,player){const weapon=player.attackSlots?.find(w=>w?.id==='wakamo-bayonet');if(!weapon){reset();return;}if(owner!==player){reset();owner=player;}if(!(delta>0))return;let left=delta;
  while(left>1e-8){const stats=wakamoBayonetLevelStats(weapon.level),reach=s.range*stats.size*weaponSizeMultiplier(player);
   if(enabled&&!swing&&combo&&time>=combo.at-1e-8){const target=closest(player,reach);if(target)strike(player,combo.stats,target,true);combo=null;}
   if(enabled&&!swing&&!combo&&cooldown<=1e-8){const target=closest(player,reach);if(target){strike(player,stats,target);cooldown=attackTimeFormula(stats.interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);if(stats.count===2)combo={at:time+s.comboDelay,stats};}}
   const dt=Math.min(left,1/120);left-=dt;time+=dt;cooldown=Math.max(0,cooldown-dt);
   for(const [id,last]of hits)if(time-last>2)hits.delete(id);
   if(!swing)continue;const previous=bayonetSwingAngle(swing.aim,swing.age,swing.reverse);swing.age+=dt;const angle=bayonetSwingAngle(swing.aim,swing.age,swing.reverse),origin=getCombatHitbox(player,false);
   for(const enemy of getAllEnemies()){if(swing.hits.has(enemy.id)||time-(hits.get(enemy.id)??-Infinity)<s.hitCooldown-1e-8||!bayonetHits(getEnemyHurtbox(enemy),origin,previous,angle,s.range*swing.size))continue;swing.hits.add(enemy.id);hits.set(enemy.id,time);
    const base=totalWeaponDamage(player,'wakamo-bayonet',s.damage,swing.stats.damageBonuses,{projectileCount:swing.stats.count,hitCooldownFrames:s.hitCooldown*60}),hit=rollAttackDamage(player,base,random,{target:enemy,weaponId:'wakamo-bayonet'});if(damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'wakamo-bayonet'})===false)continue;
    if(swing.stats.knockback&&getEnemy(enemy.id)){const b=getEnemyHurtbox(enemy),a=Math.atan2(b.y-origin.y,b.x-origin.x),distance=s.knockbackSpeed*s.knockbackSeconds*weaponKnockbackMultiplier(player),motion=beginKnockback(enemy,Math.cos(a)*distance,Math.sin(a)*distance,s.knockbackSeconds);if(motion){enemy.skillKnockback=motion;enemy.knockbackMovementRemaining=Math.max(enemy.knockbackMovementRemaining||0,s.knockbackSeconds);}}
   }
   if(swing.age>=s.swingDuration-1e-8)swing=null;
  }
 }
 function draw(context,camera){if(!swing||!owner)return;const body=getCombatHitbox(owner,false),scale=s.range*swing.size/470;
  function blade(age,alpha){context.save();context.translate(body.x-camera.x,body.y-camera.y);context.rotate(bayonetSwingAngle(swing.aim,age,swing.reverse)-Math.PI*.75);context.globalAlpha=alpha;
   if(sprite?.complete&&sprite.naturalWidth)context.drawImage(sprite,8,8,370,392,-329*scale,-43*scale,370*scale,392*scale);context.restore();}
  for(let i=4;i>=1;i--){const age=swing.age-i*.018;if(age>=0)blade(age,.06+(4-i)*.025);}blade(swing.age,Math.min(1,swing.age/.025,(s.swingDuration-swing.age)/.025));
 }
 return {ready,update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);if(!enabled){swing=null;combo=null;}},get shotsFired(){return shots;},get active(){return Boolean(swing);}};
}
