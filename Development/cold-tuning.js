import {tryWeakTuningHit} from './weak-tuning.js';
import {tryNeutralizationHit} from './neutralization-tuning.js';
import {shareTargetTuningDamage} from './target-tuning.js';
import {tryRepairTuningHit} from './repair-tuning.js';
import {tryLuxeryTuningHit} from './luxery-tuning.js';
import {coldTuningSettings,tuningPerk} from './tuning-parts.js';
import {applyFrozen} from './frozen-status.js';
import {damageEnemy} from './world-state.js';
/** Starting-weapon on-hit effect; its own cold damage cannot trigger another proc. */
export function tryColdTuningHit({player,enemy,rollDamage,random=Math.random,weaponId='plana-umbrella'}){
  const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null);
  if(main!==weaponId||!player.tuningParts||enemy.hp<=0||enemy.frozenRemaining>0)return false;
  const percent=tuningPerk(player.tuningParts,'coldDamagePercent');
  if(!percent||(enemy.secondsSincePlayerHit||0)<coldTuningSettings.safeSeconds||random()>=coldTuningSettings.procChance)return false;
  if(!applyFrozen(enemy,coldTuningSettings.freezeSeconds))return false;
  const hit=rollDamage(enemy,percent/100);
  const hpBefore=enemy.hp;
  const landed=damageEnemy(enemy.id,hit.damage,player,hit.type,{coldTuning:true});
  if(landed&&tuningPerk(player.tuningParts,'weakChance')>0)tryWeakTuningHit({player,enemy});
  if(landed&&tuningPerk(player.tuningParts,'stunChance')>0)tryNeutralizationHit({player,enemy});
  if(landed&&tuningPerk(player.tuningParts,'targetPercent')>0)shareTargetTuningDamage({player,enemy,damage:Math.min(hpBefore,hit.damage),hitType:hit.type});
  if(landed&&tuningPerk(player.tuningParts,'repairMaxHpPercent')>0)tryRepairTuningHit({player});
  if(landed&&tuningPerk(player.tuningParts,'creditChancePercent')>0)tryLuxeryTuningHit({player,enemy,damage:hit.damage});
  return true;
}
