import {tryWeakTuningHit} from './weak-tuning.js';
import {trySlowdownTuningHit} from './slowdown-tuning.js';
import {tryNeutralizationHit} from './neutralization-tuning.js';
import {shareTargetTuningDamage} from './target-tuning.js';
import {tryRepairTuningHit} from './repair-tuning.js';
import {applyTuningKnockback} from './knockback-tuning.js';
import {tryLuxeryTuningHit} from './luxery-tuning.js';
import {tryColdTuningHit} from './cold-tuning.js';
import {tuningPerk,explosiveTuningSettings} from './tuning-parts.js';
import {getAllEnemies,damageEnemy} from './world-state.js';
import {getEnemyHurtbox} from './combat-hitboxes.js';
import {drawArtilleryExplosion,artilleryExplosionDuration} from './artillery-explosion.js';
const triggered=new WeakSet(),effects=[];
/** One successful proc per attack/projectile; splash never re-enters this function. */
export function tryTuningExplosion({player,projectile,enemy,rollDamage,onHit=null,random=Math.random,weaponId="plana-umbrella"}){
  const main=player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null);
  if(weaponId!==main||!player.tuningParts||triggered.has(projectile))return false;
  const chance=tuningPerk(player.tuningParts,'explosionChance');if(!(chance>0)||random()>=chance)return false;
  triggered.add(projectile);
  const center=getEnemyHurtbox(enemy),zone={x:center.x,y:center.y,radius:explosiveTuningSettings.radius,age:0};effects.push(zone);
  for(const target of getAllEnemies()){
    const body=getEnemyHurtbox(target);
    if(Math.hypot(body.x-zone.x,body.y-zone.y)>zone.radius+Math.max(body.rx,body.ry))continue;
    const hit=rollDamage(target,explosiveTuningSettings.damageMultiplier,{growthEligible:false});
    const hpBefore=target.hp;
    const landed=damageEnemy(target.id,hit.damage,player,hit.type,{tuningExplosion:true,weaponId:'plana-umbrella'});
    // Accepted splash goes through normal damage/on-hit listeners (including future Greed).
    if(landed){if(tuningPerk(player.tuningParts,'weakChance')>0)tryWeakTuningHit({player,enemy:target});if(tuningPerk(player.tuningParts,'slowChance')>0)trySlowdownTuningHit({player,enemy:target,rollDamage:(target,multiplier)=>rollDamage(target,multiplier,{growthEligible:false})});if(tuningPerk(player.tuningParts,'stunChance')>0)tryNeutralizationHit({player,enemy:target});if(tuningPerk(player.tuningParts,'targetPercent')>0)shareTargetTuningDamage({player,enemy:target,damage:Math.min(hpBefore,hit.damage),hitType:hit.type});if(tuningPerk(player.tuningParts,'repairMaxHpPercent')>0)tryRepairTuningHit({player});if(tuningPerk(player.tuningParts,'creditChancePercent')>0)tryLuxeryTuningHit({player,enemy:target,damage:hit.damage});if(onHit)onHit(landed);else if(tuningPerk(player.tuningParts,'knockbackFrames')>0)applyTuningKnockback(player,landed);if(tuningPerk(player.tuningParts,'coldDamagePercent')>0)tryColdTuningHit({player,enemy:landed,rollDamage:(target,multiplier)=>rollDamage(target,multiplier,{growthEligible:false})});}
  }
  return true;
}
export function updateTuningExplosions(delta){for(let i=effects.length-1;i>=0;i--){effects[i].age+=delta;if(effects[i].age>=artilleryExplosionDuration)effects.splice(i,1);}}
export function drawTuningExplosions(context,camera){for(const effect of effects)drawArtilleryExplosion(context,camera,effect,effect.age);}
export function clearTuningExplosions(){effects.length=0;}
