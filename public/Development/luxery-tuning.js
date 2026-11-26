import {tuningPerk} from './tuning-parts.js';
import {spawnTestDrop} from './exp-drops.js';
/** Damage adds whole percentage points and sets the inclusive extra-Credits range. */
export function luxeryTuningValues(damage,baseChancePercent){
  const bonus=Math.floor(Math.min(100,Math.max(0,damage))/10);
  return {chance:(baseChancePercent+bonus)/100,maxExtraCredits:bonus};
}
export function tryLuxeryTuningHit({player,enemy,damage,random=Math.random,weaponId='plana-umbrella'}){
  const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null);
  if(main!==weaponId||!player.tuningParts||!(damage>0))return false;
  const base=tuningPerk(player.tuningParts,'creditChancePercent');if(!base)return false;
  const {chance,maxExtraCredits}=luxeryTuningValues(damage,base);if(random()>=chance)return false;
  const value=1+Math.min(maxExtraCredits,Math.floor(random()*(maxExtraCredits+1)));
  return spawnTestDrop('credits',value,enemy.x,enemy.y);
}
