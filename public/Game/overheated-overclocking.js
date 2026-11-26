import { overclockingStats, itemHpDrainNegated, syncLifeJacketShield } from './item-catalog.js';
/** HP loss, never a hit: bypasses shields except the explicitly enabled Luminous/Life Jacket pair. */
export function updateOverclocking(player,delta){
 const stats=overclockingStats(player);
 if(!stats.drainPercent||itemHpDrainNegated(player)){player.overclockDrainElapsed=0;return;}
 if(!(delta>0)||!Number.isFinite(delta))return;
 player.overclockDrainElapsed=(player.overclockDrainElapsed||0)+delta;
 while(player.overclockDrainElapsed>=1-1e-8){
  player.overclockDrainElapsed-=1;
  let loss=player.maxHp*stats.drainPercent/100;
  if(player.attackSlots?.some(w=>w?.id==='luminous-nova')&&player.equipmentSlots?.some(i=>i?.id==='life-jacket')){
   syncLifeJacketShield(player);const state=player.lifeJacketState;
   const absorbed=Math.min(state?.remaining||0,loss);if(state){state.remaining-=absorbed;if(state.remaining<state.capacity)state.healElapsed=0;}loss-=absorbed;
   const shield=Math.min(Math.max(0,player.shield||0),loss);player.shield=(player.shield||0)-shield;loss-=shield;
  }
  if(player.hp>1)player.hp=Math.max(1,player.hp-loss);
 }
}
