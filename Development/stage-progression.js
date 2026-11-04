import { stageProgressionSettings } from './game-config.js';

/** Progress the campaign in order, then choose a different available map per boss wave. */
export function nextStageAfterBoss(currentMap, endless, availableMaps, random = Math.random) {
  const settings = stageProgressionSettings;
  const regular = settings.order.filter(id => availableMaps.includes(id));
  const index = settings.order.indexOf(currentMap);
  if (!endless && index >= 0 && index < settings.order.length - 1) {
    const next = settings.order.slice(index + 1).find(id => availableMaps.includes(id));
    return { mapId: next || currentMap, endless: false, secretRolled: false };
  }
  const secretRolled = random() < settings.secretChance;
  if (secretRolled && availableMaps.includes(settings.secretStageId)) {
    return { mapId: settings.secretStageId, endless: true, secretRolled: true };
  }
  // An unimplemented secret stage falls back to a real map, without creating assets or routes.
  const choices = regular.filter(id => id !== currentMap);
  const pool = choices.length ? choices : regular;
  return { mapId: pool[Math.floor(random() * pool.length)] || currentMap,
    endless: true, secretRolled };
}

/** A wave ends only on an actual boss defeat with no living or queued bosses remaining. */
export function bossWaveIsDefeated(defeatedEnemy, enemies, hasQueuedBosses) {
  const boss = enemy => enemy.boss === true || (enemy.boss !== false && ['shiroko', 'iroha'].includes(enemy.type));
  return boss(defeatedEnemy) && !hasQueuedBosses && !enemies.some(boss);
}
