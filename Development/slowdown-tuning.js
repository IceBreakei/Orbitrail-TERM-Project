import {tuningPerk,slowdownTuningSettings} from './tuning-parts.js';
import {damageEnemy} from './world-state.js';
/** Temporary movement reduction, independent of permanent speed and knockback. */
export function applySlowdown(enemy,percent,seconds=5){
  if(enemy.hp<=0||!(percent>0)||!(seconds>0))return false;
  enemy.slowdownRemaining=Math.max(enemy.slowdownRemaining||0,seconds);
  enemy.slowdownPercent=percent;return true;
}
export function updateSlowdown(enemy,delta){
  enemy.slowdownRemaining=Math.max(0,(enemy.slowdownRemaining||0)-Math.max(0,delta));
  if(enemy.slowdownRemaining<1e-6){enemy.slowdownRemaining=0;enemy.slowdownPercent=0;}
}
export function slowdownMultiplier(enemy){return enemy.slowdownRemaining>0?1-Math.min(100,Math.max(0,enemy.slowdownPercent||0))/100:1;}

/** Single bonus hit; does not recursively trigger itself or repeatedly tick. */
export function trySlowdownTuningHit({player,enemy,rollDamage,random=Math.random}){
  const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null);
  if(main!=='plana-umbrella'||!player.tuningParts||enemy.hp<=0)return false;
  const chance=tuningPerk(player.tuningParts,'slowChance');if(!chance||random()>=chance)return false;
  if(!applySlowdown(enemy,tuningPerk(player.tuningParts,'slowPercent'),slowdownTuningSettings.seconds))return false;
  const hit=rollDamage(enemy,tuningPerk(player.tuningParts,'slowDamagePercent')/100);
  damageEnemy(enemy.id,hit.damage,player,hit.type,{slowdownTuning:true});return true;
}
