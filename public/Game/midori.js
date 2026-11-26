import { midoriSettings, playerSettings } from './game-config.js';
import { getCombatHitbox } from './combat-hitboxes.js';
import { statMultiplier } from './combat-stats.js';

/** Match the configured fraction of the controlled player's current movement speed, including SPD upgrades. */
export function midoriSpeed(player, baseSpeed = playerSettings.movementBase) {
  return baseSpeed * (player.movementSpeedMultiplier || 1) *
    statMultiplier(player, 'spdPercent') * midoriSettings.speedRatio;
}

/** Roll once per close-range player attack, never for admin damage or distant attacks. */
export function midoriDodges(enemy, source, random = Math.random) {
  return enemy.type === 'midori' && source &&
    Math.hypot(enemy.x - source.x, enemy.y - source.y) <= midoriSettings.closeRange &&
    random() < midoriSettings.missChance;
}

/** Aim the foot hitbox at the player's body center rather than aligning sprite anchors. */
export function midoriChaseTarget(enemy, player) {
  const feet = getCombatHitbox(enemy, true);
  const target = getCombatHitbox(player, false);
  return { x: target.x - (feet.x - enemy.x), y: target.y - (feet.y - enemy.y) };
}
