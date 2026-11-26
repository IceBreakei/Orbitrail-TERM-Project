import {tuningPerk} from './tuning-parts.js';
export function weakenedAttackMultiplier(enemy){return enemy?.weakRemaining>0?1-(enemy.weakAttackPercent||0)/100:1;}
export function updateWeakTuning(enemy,delta){
  enemy.weakRemaining=Math.max(0,(enemy.weakRemaining||0)-Math.max(0,delta));
  if(enemy.weakRemaining<1e-6){enemy.weakRemaining=0;enemy.weakAttackPercent=0;enemy.weakDefensePercent=0;}
}
export function tryWeakTuningHit({player,enemy,random=Math.random}){
  const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null);
  if(main!=='plana-umbrella'||!player.tuningParts||enemy.hp<=0)return false;
  const chance=tuningPerk(player.tuningParts,'weakChance');if(!chance||random()>=chance)return false;
  enemy.weakRemaining=3;enemy.weakAttackPercent=tuningPerk(player.tuningParts,'weakAttackPercent');enemy.weakDefensePercent=tuningPerk(player.tuningParts,'weakDefensePercent');return true;
}
