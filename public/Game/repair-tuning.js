import {tuningPerk} from './tuning-parts.js';
import {healPlayer} from './player-stats.js';
export const repairTuningSettings={chance:.15,interval:1};
export function updateRepairTuning(player,delta){
  if(player.tuningParts)player.tuningParts.repairCooldown=Math.max(0,(player.tuningParts.repairCooldown||0)-Math.max(0,delta));
}
/** Independent healing, not life-steal: no dependency on hit damage or life-steal effects. */
export function tryRepairTuningHit({player,random=Math.random,weaponId='plana-umbrella'}){
  const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null),run=player.tuningParts;
  if(main!==weaponId||!run||run.repairCooldown>1e-8||player.hp>=player.maxHp)return false;
  const percent=tuningPerk(run,'repairMaxHpPercent'),cap=Math.floor(player.maxHp*percent/100);
  if(cap<1)return false;
  run.repairCooldown=repairTuningSettings.interval;
  if(random()>=repairTuningSettings.chance)return false;
  const amount=1+Math.min(cap-1,Math.floor(random()*cap));healPlayer(player,amount);return amount;
}
