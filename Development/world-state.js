import { midoriDodges } from './midori.js';
import { enemyPopulationSettings, harmlessEnemySettings } from './game-config.js';
export { enemyPopulationSettings } from './game-config.js';
import { isAdminSeed } from './run-seed.js';
// Persistent-in-session enemy state is separate from disposable background tiles.
// Future enemy spawning should register world coordinates here, never screen X/Y.
import { dropEnemyExp, dropEnemyLoot, dropYuukaCredits } from './exp-drops.js';
import { beginEnemyDeath } from './enemy-death.js';
import { showDamageNumber } from './damage-numbers.js';
import { normalSpriteSize } from './scene-metrics.js';



/** Boss identity is explicit, never inferred from an elite's enlarged sprite. */
export function isBossEnemy(enemy) {
  if(enemy.boss === false) return false;
  return enemy.boss === true || enemy.type === 'iroha' || enemy.type === 'shiroko';
}

/** Render special enemies above normal actors, while bosses always own the final layer. */
export function enemyRenderLayer(enemy) {
  if (isBossEnemy(enemy)) return 'boss';
  return enemy.special === true || enemy.type === 'yuuka' ? 'special' : 'normal';
}

/** Measure distance from sprite edges to the gameplay viewport rectangle. */
export function enemyViewportDistance(enemy, camera, width, height) {
  const radius = (enemy.spriteSize || normalSpriteSize) / 2;
  const dx = Math.max(camera.x - (enemy.x + radius), enemy.x - radius - camera.x - width, 0);
  const dy = Math.max(camera.y - (enemy.y + radius), enemy.y - radius - camera.y - height, 0);
  return Math.hypot(dx, dy);
}

const enemies = new Map();
const spawnListeners = new Set();
const defeatListeners = new Set();
const damageListeners = new Set();
let killCount = 0;

export const enemyTestConfig = { oneHp: isAdminSeed };
const savedEnemyHealth = new WeakMap();

/** Toggle 1-HP enemies for this session, including elites, bosses and future spawns. */
export function setOneHpEnemies(enabled) {
  enemyTestConfig.oneHp = Boolean(enabled);
  for (const enemy of enemies.values()) applyEnemyHealthTest(enemy);
}

/** Preserve normal health so disabling the test restores surviving enemies. */
function applyEnemyHealthTest(enemy) {
  if (enemyTestConfig.oneHp) {
    if (!savedEnemyHealth.has(enemy)) savedEnemyHealth.set(enemy, { hp: enemy.hp, maxHp: enemy.maxHp });
    enemy.hp = enemy.maxHp = 1;
  } else if (savedEnemyHealth.has(enemy)) {
    Object.assign(enemy, savedEnemyHealth.get(enemy));
    savedEnemyHealth.delete(enemy);
  }
}

/** Observe real spawns/defeats; cleanup removals never emit these events. */
export function onEnemySpawn(listener) {
  spawnListeners.add(listener);
  return () => spawnListeners.delete(listener);
}
export function onEnemyDefeat(listener) {
  defeatListeners.add(listener);
  return () => defeatListeners.delete(listener);
}

/** Count confirmed defeats for this session; admin removal does not count. */
export function getKillCount() {
  return killCount;
}

/** Return all session records, including enemies outside the camera view. */
export function getAllEnemies() {
  return [...enemies.values()];
}

/** Observe accepted HP damage, excluding misses, overkill and forced harmless-enemy removal. */
export function onEnemyDamage(listener) {
  damageListeners.add(listener);return ()=>damageListeners.delete(listener);
}

/** Explicitly clear the test population without affecting player state. */
export function clearEnemies() {
  enemies.clear();
}

/** Add or update an enemy's state without tying its lifetime to camera visibility. */
export function rememberEnemy(id, state) {
  const existed = enemies.has(id);
  const enemy = { ...enemies.get(id), ...state, id };
  const saved = savedEnemyHealth.get(enemies.get(id));
  if (saved) savedEnemyHealth.set(enemy, saved);
  applyEnemyHealthTest(enemy);
  enemies.set(id, enemy);
  if (!existed) for (const listener of spawnListeners) listener(enemy);
  return enemy;
}

/** Read a remembered enemy even after its background tile has left the screen. */
export function getEnemy(id) {
  return enemies.get(id);
}

/** Apply damage and trigger a brief sprite pulse; remove defeated test enemies. */
export function damageEnemy(id, amount, source, hitType = 'normal', options = {}) {
  const enemy = enemies.get(id);
  if (!enemy || !Number.isFinite(amount) || amount <= 0) return;
  if (options.instantKO && (isBossEnemy(enemy) || enemy.miniBoss || enemy.instantKOImmune)) return false;
  if (options.canMiss && midoriDodges(enemy, source)) {
    showDamageNumber(enemy, 0, false, 'miss');
    return false;
  }
  const harmless = ['yuuka','sensei'].includes(enemy.type);
  if (harmless) {
    dropYuukaCredits(enemy); // Each accepted hit, including the final hit.
    enemy.receivedHits = (enemy.receivedHits || 0) + 1;
  }
  const requiredHits = harmless ? (enemy.hitsToDefeat ?? harmlessEnemySettings[`${enemy.type}HitsToDefeat`]) : null;
  const actualDamage=Math.min(enemy.hp,amount);
  enemy.hp = Math.max(0, enemy.hp - amount);
  for(const listener of damageListeners)listener({enemy,source,damage:actualDamage,requestedDamage:amount,hitType});
  // Count accepted hits, not damage points; misses and rejected hits never reach this branch.
  if (Number.isFinite(requiredHits) && requiredHits >= 1 && enemy.receivedHits >= requiredHits) enemy.hp = 0;
  showDamageNumber(enemy, amount, false, hitType, options.damageGroup); // Include overkill and crit styling.
  enemy.damageFlashElapsed = 0;
  if (enemy.hp === 0) {
    const bossesAliveBefore = [...enemies.values()].filter(isBossEnemy).length;
    killCount++;
    dropEnemyExp(enemy);
    dropEnemyLoot(enemy);
    beginEnemyDeath(enemy, source);
    enemies.delete(id);
    for (const listener of defeatListeners) listener({ enemy, bossesAliveBefore });
  }
  return enemy;
}

/** End only this event's enemies with visual deaths, without loot, kills or boss charge. */
export function endEventEnemies(eventKey, source) {
  if (!eventKey) return 0;
  let removed = 0;
  for (const [id, enemy] of enemies) {
    if (enemy.eventKey !== eventKey || isBossEnemy(enemy)) continue;
    beginEnemyDeath(enemy, source, { knockback: false });
    enemies.delete(id);
    removed++;
  }
  return removed;
}

/** Return enemies near the viewport for future rendering; retain all other records. */
export function getVisibleEnemies(cameraX, viewportWidth, margin = 160) {
  return [...enemies.values()].filter(enemy =>
    enemy.x >= cameraX - margin &&
    enemy.x <= cameraX + viewportWidth + margin
  );
}

/** Remove an enemy deliberately, for example after a confirmed defeat. */
export function removeEnemy(id) {
  enemies.delete(id);
}

/** Free population slots without kills, loot or death effects when enemies leave play. */
export function despawnDistantEnemies(camera, width, height, isPlayable) {
  let removed = 0;
  for (const [id, enemy] of enemies) {
    if (isBossEnemy(enemy) || enemy.campaignRowId || ['yuuka','sensei'].includes(enemy.type)) continue;
    // Wide timed formations need to enter view before normal offscreen-distance cleanup.
    if (enemy.spawnArrivalPending) {
      if (enemyViewportDistance(enemy,camera,width,height)>0 && enemy.spawnArrivalGrace>0) continue;
      enemy.spawnArrivalPending=false;
    }
    if ((!['yuuka','sensei'].includes(enemy.type) && enemyViewportDistance(enemy, camera, width, height) > enemyPopulationSettings.despawnDistance) ||
        !isPlayable(enemy, enemy.x, enemy.y)) {
      enemies.delete(id);
      removed++;
    }
  }
  return removed;
}

/** At 90% capacity, remove farthest non-bosses until population reaches 70%. */
export function trimEnemyPopulation(player) {
  const settings = enemyPopulationSettings;
  if (enemies.size < Math.ceil(settings.limit * settings.trimAt)) return 0;
  const target = Math.floor(settings.limit * settings.trimTo);
  const candidates = [...enemies.values()].filter(enemy => !isBossEnemy(enemy) && !enemy.campaignRowId && !['yuuka','sensei'].includes(enemy.type))
    .sort((a, b) => Math.hypot(b.x - player.x, b.y - player.y) - Math.hypot(a.x - player.x, a.y - player.y));
  let removed = 0;
  for (const enemy of candidates) {
    if (enemies.size <= target) break;
    enemies.delete(enemy.id);
    removed++;
  }
  return removed;
}


/** Rescale health proportionally, keeping admin1HP baselines synchronized for later restore. */
export function rescaleEnemyHealth(enemy, maxHp) {
  const health = savedEnemyHealth.get(enemy) ?? enemy;
  const ratio = health.maxHp > 0 ? health.hp/health.maxHp : 1;
  const updated = {maxHp, hp:Math.max(1, Math.round(maxHp*ratio))};
  if (savedEnemyHealth.has(enemy)) savedEnemyHealth.set(enemy, updated);
  else Object.assign(enemy, updated);
}
