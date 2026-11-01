// Persistent-in-session enemy state is separate from disposable background tiles.
// Future enemy spawning should register world coordinates here, never screen X/Y.
import { dropEnemyExp, dropEnemyLoot } from './exp-drops.js';
import { beginEnemyDeath } from './enemy-death.js';

const enemies = new Map();

/** Return all session records, including enemies outside the camera view. */
export function getAllEnemies() {
  return [...enemies.values()];
}

/** Explicitly clear the test population without affecting player state. */
export function clearEnemies() {
  enemies.clear();
}

/** Add or update an enemy's state without tying its lifetime to camera visibility. */
export function rememberEnemy(id, state) {
  const enemy = { ...enemies.get(id), ...state, id };
  enemies.set(id, enemy);
  return enemy;
}

/** Read a remembered enemy even after its background tile has left the screen. */
export function getEnemy(id) {
  return enemies.get(id);
}

/** Apply damage and trigger a brief sprite pulse; remove defeated test enemies. */
export function damageEnemy(id, amount, source) {
  const enemy = enemies.get(id);
  if (!enemy || !Number.isFinite(amount) || amount <= 0) return;
  enemy.hp = Math.max(0, enemy.hp - amount);
  enemy.damageFlashElapsed = 0;
  if (enemy.hp === 0) {
    dropEnemyExp(enemy);
    dropEnemyLoot(enemy);
    beginEnemyDeath(enemy, source);
    enemies.delete(id);
  }
  return enemy;
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
