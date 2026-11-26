import { chisePlushieSettings, chiseDelayConfigured } from './game-config.js';
import { applyResolvedPlayerDamage } from './player-stats.js';
/** Shared debt pool; removing/upgrading the item never forgives damage already deferred. */
export function updateChiseDamage(player,delta){
 if(!(delta>0)||!Number.isFinite(delta)||!chiseDelayConfigured()||!(player.chisePendingDamage>0))return;
 player.chiseTickElapsed=(player.chiseTickElapsed||0)+delta;
 while(player.chiseTickElapsed>=chisePlushieSettings.tickSeconds-1e-8&&player.chisePendingDamage>0){
  player.chiseTickElapsed-=chisePlushieSettings.tickSeconds;
  const rule=chisePlushieSettings.damagePerTick;
  const requested=typeof rule==='function'?rule(player.chisePendingDamage,player):Number(rule);
  if(!Number.isFinite(requested)||requested<=0)break;
  const damage=Math.min(player.chisePendingDamage,requested);
  player.chisePendingDamage=Math.max(0,player.chisePendingDamage-damage);
  applyResolvedPlayerDamage(player,damage);
 }
 if(!(player.chisePendingDamage>0))player.chiseTickElapsed=0;
}
