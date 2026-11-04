import { bossCatchupSettings } from './game-config.js';
export { bossCatchupSettings } from './game-config.js';
import { isBossEnemy, enemyViewportDistance } from './world-state.js';
import { statMultiplier } from './combat-stats.js';



/** Boost distant chasing bosses above player speed until their sprite re-enters view. */
export function updateBossCatchup(enemy, player, camera, width, height, baseSpeed = 180) {
  if (!isBossEnemy(enemy) && !enemy.campaignGuardian) return;
  const distance = enemyViewportDistance(enemy, camera, width, height);
  if (distance > bossCatchupSettings.distance) enemy.catchingUp = true;
  if (distance === 0) enemy.catchingUp = false;
  const playerSpeed = baseSpeed * (player.movementSpeedMultiplier || 1) * statMultiplier(player, 'spdPercent');
  const enemySpeed = baseSpeed * (enemy.movementSpeedMultiplier || 1) * statMultiplier(enemy, 'spdPercent');
  enemy.catchupSpeed = enemy.catchingUp && enemy.ai && enemy.behavior === 'chase'
    ? Math.max(enemySpeed * bossCatchupSettings.baseMultiplier,
      playerSpeed * bossCatchupSettings.playerMultiplier + bossCatchupSettings.extraSpeed) : 0;
}
