import { safetyHelmetStats } from './item-catalog.js';
import { setPlayerDamageGuard } from './player-stats.js';
import { getAllEnemies } from './world-state.js';
import { getCombatHitbox } from './combat-hitboxes.js';
import { beginKnockback } from './knockback.js';

/** Rolls on every eligible incoming hit; there is deliberately no item cooldown. */
export function createSafetyHelmetEffects({random=Math.random,getViewport=()=>null}={}){
 let waves=[];
 function guard(player){const stats=safetyHelmetStats(player);if(!stats.chance||random()>=stats.chance)return false;
  if(stats.super)player.hp=Math.min(player.maxHp,player.hp+Math.floor(player.maxHp*.1));
  const body=getCombatHitbox(player,false),duration=10/60,distance=10*60*duration;
  for(const enemy of getAllEnemies()){
   const target=getCombatHitbox(enemy,true),dx=target.x-body.x,dy=target.y-body.y,length=Math.hypot(dx,dy);
   const effect=beginKnockback(enemy,(length?dx/length:1)*distance,(length?dy/length:0)*distance,duration);
   if(effect){enemy.skillKnockback=effect;enemy.contactReaction=null;}
  }
  const view=getViewport()||{x:body.x-640,y:body.y-360,width:1280,height:720};
  const radius=Math.max(...[[view.x,view.y],[view.x+view.width,view.y],[view.x,view.y+view.height],[view.x+view.width,view.y+view.height]].map(([x,y])=>Math.hypot(x-body.x,y-body.y)));
  waves.push({x:body.x,y:body.y,age:0,radius});if(waves.length>32)waves.shift();return true;
 }
 setPlayerDamageGuard(guard);
 return {reset(){waves=[];},update(delta){for(const wave of waves)wave.age+=Math.max(0,delta);waves=waves.filter(w=>w.age<.5);},
  draw(context,camera){context.save();for(const wave of waves){const t=wave.age/.5,radius=wave.radius*(1-(1-t)**2);
   context.strokeStyle=`rgba(255,226,149,${.6*(1-t)})`;context.lineWidth=2+3*(1-t);context.beginPath();context.arc(wave.x-camera.x,wave.y-camera.y,Math.max(1,radius),0,Math.PI*2);context.stroke();
  }context.restore();},get waveCount(){return waves.length;}};
}
