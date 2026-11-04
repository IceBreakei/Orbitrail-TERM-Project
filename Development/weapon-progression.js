import { umbrellaUpgradeSettings, umbrellaSettings } from './game-config.js';
import { rollAttackDamage, totalWeaponDamage } from './combat-stats.js';

/** Locate Plana's equipped umbrella without selecting or switching active weapons. */
export function getUmbrella(player) {
  return player.attackSlots?.find(weapon => weapon?.id === 'plana-umbrella');
}

/** Cumulative weapon-level bonuses; awakening is a separate state after level seven. */
export function umbrellaLevelStats(player) {
  const level = Math.max(1, Math.min(umbrellaUpgradeSettings.maxLevel, getUmbrella(player)?.level || 1));
  const damageTiers = Number(level >= 2) + Number(level >= 5);
  const areaTiers = Number(level >= 3) + Number(level >= 6);
  return {
    level, damageMultiplier: (1 + umbrellaUpgradeSettings.damageIncrease) ** damageTiers,
    areaScale: Math.sqrt(1 + areaTiers * umbrellaUpgradeSettings.areaIncrease),
    intervalMultiplier: level >= 4 ? umbrellaUpgradeSettings.intervalMultiplier : 1,
    guaranteedCritical: level >= 7,
    awakened: Boolean(getUmbrella(player)?.awakened)
  };
}

/** Nominal weapon damage only; all variation is applied after character ATK. */
export function umbrellaBaseDamage() {
  return umbrellaSettings.damage * umbrellaSettings.damageMultiplier;
}

/** Apply weapon upgrades first, then player ATK and the appropriate critical multiplier. */
export function rollUmbrellaDamage(player, base = umbrellaBaseDamage(), random = Math.random, damageMod = 1, target) {
  const stats = umbrellaLevelStats(player);
  const hit=rollAttackDamage(player, totalWeaponDamage(player, 'plana-umbrella', base / 10,
    [ (stats.damageMultiplier - 1) * 100 ], { projectileCount: 1, hitCooldownFrames: umbrellaSettings.hitCooldown * 60 }), random, {
    damageMod, target, forceCritical: stats.guaranteedCritical,
    criticalMultiplier: stats.guaranteedCritical ? umbrellaUpgradeSettings.finalCriticalMultiplier : undefined
  });
  if(stats.guaranteedCritical && hit.critical)hit.type='supercritical';
  return hit;
}
