import { lifeJacketStats, syncLifeJacketShield } from './item-catalog.js';
/** Timers use gameplay seconds. Full-shield healing requires three continuous full seconds. */
export function updateLifeJacket(player,delta){
 syncLifeJacketShield(player);const stats=lifeJacketStats(player),state=player.lifeJacketState;
 if(!stats||!state||!(delta>0))return;
 let left=delta;
 while(left>1e-8){
  const full=state.remaining>=state.capacity-1e-8;
  if(!full||!stats.super)state.healElapsed=0;
  const step=Math.min(left,15-state.refreshElapsed,stats.super&&full?3-state.healElapsed:Infinity);
  left-=step;state.refreshElapsed+=step;if(stats.super&&full)state.healElapsed+=step;
  if(state.refreshElapsed>=15-1e-8){state.remaining=state.capacity;state.refreshElapsed=0;}
  if(stats.super&&full&&state.healElapsed>=3-1e-8){player.hp=Math.min(player.maxHp,player.hp+10);state.healElapsed=0;}
 }
}
